from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import json
import re
import logging
from enum import Enum
import difflib

from ..devices.base_device import BaseDevice
from ..core.device_manager import DeviceManager
from ..core.exceptions import AuditError, ValidationError


class AuditSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class AuditRule:
    rule_id: str
    name: str
    description: str
    command: str
    expected_pattern: Optional[str] = None
    not_expected_pattern: Optional[str] = None
    validator_function: Optional[callable] = None
    severity: AuditSeverity = AuditSeverity.WARNING
    device_types: List[str] = field(default_factory=list)
    category: str = "general"
    remediation: str = ""


@dataclass
class AuditResult:
    rule_id: str
    device_id: str
    status: AuditStatus
    message: str
    actual_value: str = ""
    expected_value: str = ""
    severity: AuditSeverity = AuditSeverity.INFO
    timestamp: datetime = field(default_factory=datetime.now)
    remediation: str = ""


@dataclass
class ComplianceReport:
    audit_id: str
    device_id: str
    device_type: str
    audit_timestamp: datetime
    results: List[AuditResult] = field(default_factory=list)
    pass_count: int = 0
    fail_count: int = 0
    warning_count: int = 0
    error_count: int = 0
    compliance_score: float = 0.0
    
    def calculate_score(self):
        """Calculate compliance score based on results"""
        if not self.results:
            self.compliance_score = 0.0
            return
        
        total_weight = 0
        weighted_score = 0
        
        for result in self.results:
            # Assign weights based on severity
            weight = {
                AuditSeverity.INFO: 1,
                AuditSeverity.WARNING: 2,
                AuditSeverity.ERROR: 3,
                AuditSeverity.CRITICAL: 4
            }.get(result.severity, 1)
            
            total_weight += weight
            
            if result.status == AuditStatus.PASS:
                weighted_score += weight
        
        self.compliance_score = (weighted_score / total_weight) * 100 if total_weight > 0 else 0
    
    def get_summary(self) -> Dict[str, Any]:
        """Get audit summary"""
        return {
            'audit_id': self.audit_id,
            'device_id': self.device_id,
            'device_type': self.device_type,
            'timestamp': self.audit_timestamp.isoformat(),
            'compliance_score': self.compliance_score,
            'total_checks': len(self.results),
            'pass_count': self.pass_count,
            'fail_count': self.fail_count,
            'warning_count': self.warning_count,
            'error_count': self.error_count,
            'critical_issues': [
                r.message for r in self.results 
                if r.severity == AuditSeverity.CRITICAL and r.status == AuditStatus.FAIL
            ]
        }


class AuditManager:
    """Manages network device audits and compliance checks"""
    
    def __init__(self, device_manager: DeviceManager, 
                 rules_path: Optional[Path] = None,
                 reports_path: Optional[Path] = None):
        self.device_manager = device_manager
        self.rules_path = rules_path or Path("./configs/audit_rules")
        self.reports_path = reports_path or Path("./reports/audit")
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Create directories
        self.rules_path.mkdir(parents=True, exist_ok=True)
        self.reports_path.mkdir(parents=True, exist_ok=True)
        
        # Load audit rules
        self.rules: Dict[str, AuditRule] = {}
        self._load_default_rules()
        self._load_custom_rules()
    
    def _load_default_rules(self):
        """Load default audit rules"""
        # Cisco IOS rules
        cisco_ios_rules = [
            AuditRule(
                rule_id="cisco_ios_enable_secret",
                name="Enable Secret Configured",
                description="Verify enable secret is configured",
                command="show running-config | include enable secret",
                expected_pattern="enable secret",
                severity=AuditSeverity.ERROR,
                device_types=["cisco_ios"],
                category="security",
                remediation="Configure enable secret: enable secret <password>"
            ),
            AuditRule(
                rule_id="cisco_ios_aaa_authentication",
                name="AAA Authentication",
                description="Verify AAA authentication is enabled",
                command="show running-config | include aaa authentication",
                expected_pattern="aaa authentication",
                severity=AuditSeverity.WARNING,
                device_types=["cisco_ios"],
                category="security",
                remediation="Configure AAA authentication"
            ),
            AuditRule(
                rule_id="cisco_ios_ssh_version",
                name="SSH Version Check",
                description="Verify SSH version 2 is configured",
                command="show ip ssh",
                expected_pattern="SSH Enabled.*version 2",
                severity=AuditSeverity.WARNING,
                device_types=["cisco_ios"],
                category="security",
                remediation="Configure SSH version 2: ip ssh version 2"
            ),
            AuditRule(
                rule_id="cisco_ios_spanning_tree",
                name="Spanning Tree Protocol",
                description="Verify STP is enabled",
                command="show spanning-tree summary",
                expected_pattern="Switch is in",
                severity=AuditSeverity.WARNING,
                device_types=["cisco_ios"],
                category="network",
                remediation="Enable spanning tree protocol"
            ),
            AuditRule(
                rule_id="cisco_ios_snmp_community",
                name="SNMP Community Check",
                description="Check for default SNMP communities",
                command="show running-config | include snmp-server community",
                not_expected_pattern="snmp-server community (public|private)",
                severity=AuditSeverity.ERROR,
                device_types=["cisco_ios"],
                category="security",
                remediation="Remove default SNMP communities and use secure strings"
            )
        ]
        
        # Cisco ASA rules
        cisco_asa_rules = [
            AuditRule(
                rule_id="cisco_asa_firewall_mode",
                name="Firewall Mode Check",
                description="Verify firewall mode is configured",
                command="show firewall",
                expected_pattern="Firewall mode:",
                severity=AuditSeverity.INFO,
                device_types=["cisco_asa"],
                category="security"
            ),
            AuditRule(
                rule_id="cisco_asa_access_lists",
                name="Access Lists Configured",
                description="Verify access lists are configured",
                command="show access-list",
                expected_pattern="access-list",
                severity=AuditSeverity.WARNING,
                device_types=["cisco_asa"],
                category="security",
                remediation="Configure appropriate access lists"
            ),
            AuditRule(
                rule_id="cisco_asa_nat_rules",
                name="NAT Rules Check",
                description="Verify NAT rules are configured",
                command="show nat",
                expected_pattern="translate_hits",
                severity=AuditSeverity.INFO,
                device_types=["cisco_asa"],
                category="network"
            )
        ]
        
        # Palo Alto rules
        palo_alto_rules = [
            AuditRule(
                rule_id="palo_security_policies",
                name="Security Policies Check",
                description="Verify security policies are configured",
                command="<show><running><security><rules></rules></security></running></show>",
                expected_pattern="<rules>",
                severity=AuditSeverity.ERROR,
                device_types=["paloalto_panos"],
                category="security",
                remediation="Configure security policies"
            ),
            AuditRule(
                rule_id="palo_threat_prevention",
                name="Threat Prevention Profile",
                description="Verify threat prevention profiles are configured",
                command="<show><running><profiles><virus></virus></profiles></running></show>",
                expected_pattern="<virus>",
                severity=AuditSeverity.WARNING,
                device_types=["paloalto_panos"],
                category="security",
                remediation="Configure threat prevention profiles"
            ),
            AuditRule(
                rule_id="palo_management_profile",
                name="Management Profile Check",
                description="Verify management profile is secured",
                command="<show><running><deviceconfig><system><permitted-ip></permitted-ip></system></deviceconfig></running></show>",
                expected_pattern="<permitted-ip>",
                severity=AuditSeverity.WARNING,
                device_types=["paloalto_panos"],
                category="security",
                remediation="Configure management access restrictions"
            )
        ]
        
        # Add all rules to the rules dictionary
        for rule in cisco_ios_rules + cisco_asa_rules + palo_alto_rules:
            self.rules[rule.rule_id] = rule
    
    def _load_custom_rules(self):
        """Load custom audit rules from files"""
        rules_files = self.rules_path.glob("*.json")
        
        for rules_file in rules_files:
            try:
                with open(rules_file, 'r') as f:
                    rules_data = json.load(f)
                
                for rule_data in rules_data.get('rules', []):
                    rule = AuditRule(
                        rule_id=rule_data['rule_id'],
                        name=rule_data['name'],
                        description=rule_data['description'],
                        command=rule_data['command'],
                        expected_pattern=rule_data.get('expected_pattern'),
                        not_expected_pattern=rule_data.get('not_expected_pattern'),
                        severity=AuditSeverity(rule_data.get('severity', 'warning')),
                        device_types=rule_data.get('device_types', []),
                        category=rule_data.get('category', 'general'),
                        remediation=rule_data.get('remediation', '')
                    )
                    self.rules[rule.rule_id] = rule
                    
            except Exception as e:
                self.logger.error(f"Failed to load rules from {rules_file}: {str(e)}")
    
    def audit_device(self, device_id: str, 
                    rule_categories: Optional[List[str]] = None) -> ComplianceReport:
        """Audit a single device"""
        device_config = self.device_manager.get_device_config(device_id)
        if not device_config:
            raise AuditError(f"Device {device_id} not found")
        
        # Connect to device
        device = self.device_manager.connect_device(device_id)
        
        # Create audit report
        audit_id = f"AUDIT-{device_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        report = ComplianceReport(
            audit_id=audit_id,
            device_id=device_id,
            device_type=device_config.device_type,
            audit_timestamp=datetime.now()
        )
        
        # Filter rules for this device type and categories
        applicable_rules = []
        for rule in self.rules.values():
            if rule.device_types and device_config.device_type not in rule.device_types:
                continue
            if rule_categories and rule.category not in rule_categories:
                continue
            applicable_rules.append(rule)
        
        # Execute audit rules
        for rule in applicable_rules:
            try:
                result = self._execute_audit_rule(device, rule)
                report.results.append(result)
                
                # Update counters
                if result.status == AuditStatus.PASS:
                    report.pass_count += 1
                elif result.status == AuditStatus.FAIL:
                    report.fail_count += 1
                elif result.status == AuditStatus.WARNING:
                    report.warning_count += 1
                else:
                    report.error_count += 1
                    
            except Exception as e:
                self.logger.error(f"Error executing rule {rule.rule_id}: {str(e)}")
                error_result = AuditResult(
                    rule_id=rule.rule_id,
                    device_id=device_id,
                    status=AuditStatus.ERROR,
                    message=f"Rule execution failed: {str(e)}",
                    severity=AuditSeverity.ERROR
                )
                report.results.append(error_result)
                report.error_count += 1
        
        # Calculate compliance score
        report.calculate_score()
        
        # Save report
        self._save_report(report)
        
        return report
    
    def _execute_audit_rule(self, device: BaseDevice, rule: AuditRule) -> AuditResult:
        """Execute a single audit rule"""
        # Execute command
        command_result = device.execute_command(rule.command)
        
        if not command_result.success:
            return AuditResult(
                rule_id=rule.rule_id,
                device_id=device.hostname,
                status=AuditStatus.ERROR,
                message=f"Command execution failed: {command_result.error_message}",
                severity=AuditSeverity.ERROR
            )
        
        output = command_result.output
        
        # Apply validation
        if rule.validator_function:
            try:
                passed = rule.validator_function(output)
                status = AuditStatus.PASS if passed else AuditStatus.FAIL
                message = f"Custom validation: {'PASS' if passed else 'FAIL'}"
            except Exception as e:
                return AuditResult(
                    rule_id=rule.rule_id,
                    device_id=device.hostname,
                    status=AuditStatus.ERROR,
                    message=f"Validation function failed: {str(e)}",
                    severity=AuditSeverity.ERROR
                )
        
        elif rule.expected_pattern:
            if re.search(rule.expected_pattern, output, re.IGNORECASE | re.MULTILINE):
                status = AuditStatus.PASS
                message = f"Expected pattern found: {rule.expected_pattern}"
            else:
                status = AuditStatus.FAIL
                message = f"Expected pattern not found: {rule.expected_pattern}"
        
        elif rule.not_expected_pattern:
            if re.search(rule.not_expected_pattern, output, re.IGNORECASE | re.MULTILINE):
                status = AuditStatus.FAIL
                message = f"Unwanted pattern found: {rule.not_expected_pattern}"
            else:
                status = AuditStatus.PASS
                message = f"Unwanted pattern not found: {rule.not_expected_pattern}"
        
        else:
            # Default: command success means pass
            status = AuditStatus.PASS
            message = "Command executed successfully"
        
        return AuditResult(
            rule_id=rule.rule_id,
            device_id=device.hostname,
            status=status,
            message=message,
            actual_value=output[:500],  # Truncate for readability
            expected_value=rule.expected_pattern or "",
            severity=rule.severity,
            remediation=rule.remediation
        )
    
    def audit_multiple_devices(self, device_ids: List[str], 
                              rule_categories: Optional[List[str]] = None,
                              parallel: bool = True) -> Dict[str, ComplianceReport]:
        """Audit multiple devices"""
        reports = {}
        
        def audit_operation(device_id: str) -> ComplianceReport:
            return self.audit_device(device_id, rule_categories)
        
        if parallel:
            results = self.device_manager.execute_on_devices(
                device_ids=device_ids,
                operation=lambda device: audit_operation(device.hostname),
                parallel=True
            )
            
            for device_id, result in results.items():
                if isinstance(result, ComplianceReport):
                    reports[device_id] = result
                else:
                    self.logger.error(f"Audit failed for {device_id}: {result}")
        else:
            for device_id in device_ids:
                try:
                    report = audit_operation(device_id)
                    reports[device_id] = report
                except Exception as e:
                    self.logger.error(f"Audit failed for {device_id}: {str(e)}")
        
        return reports
    
    def compare_configurations(self, device_id: str, 
                             baseline_config: str) -> Dict[str, Any]:
        """Compare device configuration against baseline"""
        device = self.device_manager.connect_device(device_id)
        current_config = device.get_running_config()
        
        # Generate diff
        diff = list(difflib.unified_diff(
            baseline_config.splitlines(keepends=True),
            current_config.splitlines(keepends=True),
            fromfile='baseline',
            tofile='current',
            lineterm=''
        ))
        
        # Count changes
        additions = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
        deletions = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))
        
        return {
            'device_id': device_id,
            'timestamp': datetime.now().isoformat(),
            'additions': additions,
            'deletions': deletions,
            'total_changes': additions + deletions,
            'diff': ''.join(diff),
            'drift_detected': additions > 0 or deletions > 0
        }
    
    def check_configuration_compliance(self, device_id: str, 
                                     compliance_template: str) -> Dict[str, Any]:
        """Check device configuration against compliance template"""
        device = self.device_manager.connect_device(device_id)
        current_config = device.get_running_config()
        
        # Parse template for required configurations
        required_configs = self._parse_compliance_template(compliance_template)
        
        compliance_results = {
            'device_id': device_id,
            'timestamp': datetime.now().isoformat(),
            'compliant': True,
            'missing_configs': [],
            'violations': []
        }
        
        # Check each required configuration
        for config_item in required_configs:
            if config_item['type'] == 'required':
                if not re.search(config_item['pattern'], current_config, re.IGNORECASE):
                    compliance_results['compliant'] = False
                    compliance_results['missing_configs'].append(config_item)
            
            elif config_item['type'] == 'forbidden':
                if re.search(config_item['pattern'], current_config, re.IGNORECASE):
                    compliance_results['compliant'] = False
                    compliance_results['violations'].append(config_item)
        
        return compliance_results
    
    def _parse_compliance_template(self, template: str) -> List[Dict[str, Any]]:
        """Parse compliance template"""
        # This is a simplified implementation
        # Real implementation would parse a more complex template format
        items = []
        
        for line in template.split('\n'):
            line = line.strip()
            if line.startswith('REQUIRED:'):
                items.append({
                    'type': 'required',
                    'pattern': line.replace('REQUIRED:', '').strip(),
                    'description': f"Required configuration: {line}"
                })
            elif line.startswith('FORBIDDEN:'):
                items.append({
                    'type': 'forbidden',
                    'pattern': line.replace('FORBIDDEN:', '').strip(),
                    'description': f"Forbidden configuration: {line}"
                })
        
        return items
    
    def generate_compliance_report(self, reports: Dict[str, ComplianceReport], 
                                 format: str = "json") -> str:
        """Generate consolidated compliance report"""
        if format.lower() == "json":
            return self._generate_json_report(reports)
        elif format.lower() == "html":
            return self._generate_html_report(reports)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_json_report(self, reports: Dict[str, ComplianceReport]) -> str:
        """Generate JSON compliance report"""
        consolidated_report = {
            'generated_at': datetime.now().isoformat(),
            'total_devices': len(reports),
            'summary': {
                'overall_compliance': sum(r.compliance_score for r in reports.values()) / len(reports) if reports else 0,
                'devices_with_critical_issues': sum(1 for r in reports.values() if any(res.severity == AuditSeverity.CRITICAL and res.status == AuditStatus.FAIL for res in r.results)),
                'total_checks': sum(len(r.results) for r in reports.values())
            },
            'device_reports': {
                device_id: report.get_summary() 
                for device_id, report in reports.items()
            }
        }
        
        return json.dumps(consolidated_report, indent=2)
    
    def _generate_html_report(self, reports: Dict[str, ComplianceReport]) -> str:
        """Generate HTML compliance report"""
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Network Compliance Report</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .summary { background-color: #f0f0f0; padding: 20px; margin: 20px 0; }
                .device-report { border: 1px solid #ccc; margin: 20px 0; padding: 15px; }
                .pass { color: green; }
                .fail { color: red; }
                .warning { color: orange; }
                .error { color: red; font-weight: bold; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Network Compliance Report</h1>
            <div class="summary">
                <h2>Summary</h2>
                <p>Generated: {timestamp}</p>
                <p>Total Devices: {total_devices}</p>
                <p>Overall Compliance: {overall_compliance:.1f}%</p>
            </div>
        """.format(
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            total_devices=len(reports),
            overall_compliance=sum(r.compliance_score for r in reports.values()) / len(reports) if reports else 0
        )
        
        for device_id, report in reports.items():
            html_content += f"""
            <div class="device-report">
                <h3>{device_id} ({report.device_type})</h3>
                <p>Compliance Score: {report.compliance_score:.1f}%</p>
                <p>Pass: {report.pass_count}, Fail: {report.fail_count}, Warning: {report.warning_count}</p>
                
                <table>
                    <tr>
                        <th>Rule</th>
                        <th>Status</th>
                        <th>Message</th>
                        <th>Severity</th>
                    </tr>
            """
            
            for result in report.results:
                status_class = result.status.value
                html_content += f"""
                    <tr>
                        <td>{result.rule_id}</td>
                        <td class="{status_class}">{result.status.value.upper()}</td>
                        <td>{result.message}</td>
                        <td class="{result.severity.value}">{result.severity.value.upper()}</td>
                    </tr>
                """
            
            html_content += """
                </table>
            </div>
            """
        
        html_content += """
        </body>
        </html>
        """
        
        return html_content
    
    def _save_report(self, report: ComplianceReport):
        """Save compliance report to file"""
        timestamp = report.audit_timestamp.strftime('%Y%m%d_%H%M%S')
        filename = f"{report.device_id}_{timestamp}_audit.json"
        filepath = self.reports_path / filename
        
        report_data = {
            'audit_id': report.audit_id,
            'device_id': report.device_id,
            'device_type': report.device_type,
            'timestamp': report.audit_timestamp.isoformat(),
            'compliance_score': report.compliance_score,
            'summary': report.get_summary(),
            'results': [
                {
                    'rule_id': r.rule_id,
                    'status': r.status.value,
                    'message': r.message,
                    'severity': r.severity.value,
                    'actual_value': r.actual_value,
                    'expected_value': r.expected_value,
                    'remediation': r.remediation
                }
                for r in report.results
            ]
        }
        
        with open(filepath, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        self.logger.info(f"Audit report saved: {filepath}")
    
    def get_audit_history(self, device_id: Optional[str] = None, 
                         limit: int = 50) -> List[Dict[str, Any]]:
        """Get audit history"""
        history = []
        
        pattern = f"{device_id}_*_audit.json" if device_id else "*_audit.json"
        audit_files = sorted(
            self.reports_path.glob(pattern),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )[:limit]
        
        for audit_file in audit_files:
            try:
                with open(audit_file, 'r') as f:
                    report_data = json.load(f)
                    history.append(report_data['summary'])
            except Exception as e:
                self.logger.error(f"Failed to load audit file {audit_file}: {str(e)}")
        
        return history
    
    def add_custom_rule(self, rule: AuditRule):
        """Add a custom audit rule"""
        self.rules[rule.rule_id] = rule
        self.logger.info(f"Added custom rule: {rule.rule_id}")
    
    def remove_rule(self, rule_id: str):
        """Remove an audit rule"""
        if rule_id in self.rules:
            del self.rules[rule_id]
            self.logger.info(f"Removed rule: {rule_id}")
    
    def list_rules(self, device_type: Optional[str] = None, 
                  category: Optional[str] = None) -> List[AuditRule]:
        """List audit rules"""
        rules = list(self.rules.values())
        
        if device_type:
            rules = [r for r in rules if not r.device_types or device_type in r.device_types]
        
        if category:
            rules = [r for r in rules if r.category == category]
        
        return rules