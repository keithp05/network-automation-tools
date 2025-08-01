import time
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from pathlib import Path
import json
import gzip
import hashlib

from panos import firewall, panorama, policies, objects, network
from panos.errors import PanDeviceError, PanDeviceXapiError
import requests
from requests.exceptions import RequestException

from .base_device import BaseDevice, DeviceStatus, CommandResult, BackupInfo
from ..core.exceptions import (
    DeviceConnectionError,
    AuthenticationError,
    BackupError,
    ChangeExecutionError,
    ValidationError,
    TimeoutError
)


class PaloAltoDevice(BaseDevice):
    """Palo Alto Networks device implementation"""
    
    def __init__(self, hostname: str, ip_address: str, credentials: Dict[str, str],
                 port: int = 443, timeout: int = 30, panorama_managed: bool = False):
        super().__init__(hostname, ip_address, credentials, port, timeout)
        self.panorama_managed = panorama_managed
        self.api_key = credentials.get('api_key')
        self.device = None
        self._config_versions = []
        self._candidate_config = None
        
    def connect(self) -> bool:
        """Establish API connection to Palo Alto device"""
        try:
            self.status = DeviceStatus.CONNECTING
            self.logger.info(f"Connecting to {self.hostname} ({self.ip_address})")
            
            # Create device object
            if self.panorama_managed:
                self.device = panorama.Panorama(
                    hostname=self.ip_address,
                    api_username=self.credentials.get('username'),
                    api_password=self.credentials.get('password'),
                    api_key=self.api_key,
                    port=self.port,
                    timeout=self.timeout
                )
            else:
                self.device = firewall.Firewall(
                    hostname=self.ip_address,
                    api_username=self.credentials.get('username'),
                    api_password=self.credentials.get('password'),
                    api_key=self.api_key,
                    port=self.port,
                    timeout=self.timeout
                )
            
            # Generate API key if not provided
            if not self.api_key:
                self.device.generate_xapi_key()
                self.api_key = self.device.xapi.api_key
            
            # Test connection
            self.device.refresh_system_info()
            
            self.status = DeviceStatus.AUTHENTICATED
            self.logger.info(f"Successfully connected to {self.hostname}")
            
            return True
            
        except PanDeviceXapiError as e:
            self.status = DeviceStatus.ERROR
            if "Invalid credentials" in str(e):
                self.logger.error(f"Authentication failed for {self.hostname}: {str(e)}")
                raise AuthenticationError(f"Authentication failed: {str(e)}")
            else:
                self.logger.error(f"API error for {self.hostname}: {str(e)}")
                raise DeviceConnectionError(f"API error: {str(e)}")
                
        except RequestException as e:
            self.status = DeviceStatus.ERROR
            self.logger.error(f"Connection failed for {self.hostname}: {str(e)}")
            if "timeout" in str(e).lower():
                raise TimeoutError(f"Connection timeout: {str(e)}")
            else:
                raise DeviceConnectionError(f"Connection failed: {str(e)}")
                
        except Exception as e:
            self.status = DeviceStatus.ERROR
            self.logger.error(f"Unexpected error connecting to {self.hostname}: {str(e)}")
            raise DeviceConnectionError(f"Connection failed: {str(e)}")
    
    def disconnect(self) -> bool:
        """Disconnect from the device"""
        try:
            self.device = None
            self.status = DeviceStatus.DISCONNECTED
            self.logger.info(f"Disconnected from {self.hostname}")
            return True
        except Exception as e:
            self.logger.error(f"Error disconnecting from {self.hostname}: {str(e)}")
            return False
    
    def execute_command(self, command: str, timeout: Optional[int] = None) -> CommandResult:
        """Execute operational command via API"""
        if not self.is_connected():
            raise DeviceConnectionError("Device is not connected")
        
        start_time = time.time()
        try:
            self.status = DeviceStatus.BUSY
            
            # Execute operational command
            response = self.device.xapi.op(cmd=command, timeout=timeout or self.timeout)
            
            # Convert XML response to string
            if isinstance(response, ET.Element):
                output = ET.tostring(response, encoding='unicode')
            else:
                output = str(response)
            
            execution_time = time.time() - start_time
            
            result = CommandResult(
                command=command,
                output=output,
                success=True,
                execution_time=execution_time
            )
            
            self._command_history.append(result)
            self.status = DeviceStatus.AUTHENTICATED
            return result
            
        except PanDeviceXapiError as e:
            execution_time = time.time() - start_time
            result = CommandResult(
                command=command,
                output=str(e),
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
            self._command_history.append(result)
            self.status = DeviceStatus.AUTHENTICATED
            raise ChangeExecutionError(f"Command execution failed: {str(e)}")
            
        except Exception as e:
            execution_time = time.time() - start_time
            result = CommandResult(
                command=command,
                output="",
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
            self._command_history.append(result)
            self.status = DeviceStatus.AUTHENTICATED
            raise ChangeExecutionError(f"Command execution failed: {str(e)}")
    
    def execute_commands(self, commands: List[str], stop_on_error: bool = True) -> List[CommandResult]:
        """Execute multiple commands"""
        results = []
        
        for command in commands:
            try:
                result = self.execute_command(command)
                results.append(result)
            except Exception as e:
                if stop_on_error:
                    raise
                else:
                    result = CommandResult(
                        command=command,
                        output="",
                        success=False,
                        error_message=str(e)
                    )
                    results.append(result)
        
        return results
    
    def get_running_config(self) -> str:
        """Get the running configuration"""
        try:
            # Get full configuration
            config = self.device.xapi.show("/config")
            
            # Convert to string
            if isinstance(config, ET.Element):
                return ET.tostring(config, encoding='unicode')
            else:
                return str(config)
                
        except Exception as e:
            raise ChangeExecutionError(f"Failed to get running config: {str(e)}")
    
    def get_startup_config(self) -> str:
        """Get saved configuration (same as running for PAN-OS)"""
        return self.get_running_config()
    
    def save_config(self) -> bool:
        """Commit configuration changes"""
        try:
            # Check for pending changes
            pending = self.get_pending_changes()
            if not pending:
                self.logger.info("No pending changes to commit")
                return True
            
            # Create a config version before commit
            self._save_config_version()
            
            # Commit changes
            job_id = self.device.commit(sync=True)
            
            self.logger.info(f"Configuration committed successfully (job ID: {job_id})")
            return True
            
        except PanDeviceXapiError as e:
            self.logger.error(f"Commit failed: {str(e)}")
            raise ChangeExecutionError(f"Commit failed: {str(e)}")
            
        except Exception as e:
            self.logger.error(f"Unexpected error during commit: {str(e)}")
            return False
    
    def backup_config(self, backup_path: Path, compress: bool = True, 
                     encrypt: bool = False) -> BackupInfo:
        """Create configuration backup"""
        try:
            # Create backup directory
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Save current config version
            self._save_config_version()
            
            # Get configuration
            config = self.get_running_config()
            
            # Also get device state for complete backup
            device_state = self._get_device_state()
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            config_filename = f"{self.hostname}_{timestamp}_config.xml"
            state_filename = f"{self.hostname}_{timestamp}_state.json"
            
            if compress:
                config_filename += ".gz"
                state_filename += ".gz"
            
            config_path = backup_path / config_filename
            state_path = backup_path / state_filename
            
            # Write configuration backup
            if compress:
                with gzip.open(config_path, 'wt') as f:
                    f.write(config)
                with gzip.open(state_path, 'wt') as f:
                    json.dump(device_state, f, indent=2)
            else:
                with open(config_path, 'w') as f:
                    f.write(config)
                with open(state_path, 'w') as f:
                    json.dump(device_state, f, indent=2)
            
            # Calculate checksum
            checksum = hashlib.sha256(config.encode()).hexdigest()
            
            # Create backup info
            backup_info = BackupInfo(
                device_hostname=self.hostname,
                backup_path=config_path,
                timestamp=datetime.now(),
                size_bytes=config_path.stat().st_size,
                checksum=checksum,
                compressed=compress,
                encrypted=encrypt,
                backup_type="full"
            )
            
            self._last_backup = backup_info
            self.logger.info(f"Backup created: {config_path}")
            
            return backup_info
            
        except Exception as e:
            raise BackupError(f"Backup failed: {str(e)}")
    
    def restore_config(self, backup_info: BackupInfo) -> bool:
        """Restore configuration from backup"""
        try:
            # Read backup file
            if backup_info.compressed:
                with gzip.open(backup_info.backup_path, 'rt') as f:
                    config = f.read()
            else:
                with open(backup_info.backup_path, 'r') as f:
                    config = f.read()
            
            # Validate checksum
            checksum = hashlib.sha256(config.encode()).hexdigest()
            if checksum != backup_info.checksum:
                raise ValidationError("Backup checksum validation failed")
            
            # Save current config as version before restore
            self._save_config_version()
            
            # Load configuration
            self.device.xapi.edit("/config", config)
            
            # Commit the restored configuration
            self.save_config()
            
            self.logger.info(f"Configuration restored from {backup_info.backup_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Restore failed: {str(e)}")
            # Try to revert to previous version
            if self._config_versions:
                try:
                    self._revert_to_version(self._config_versions[-1]['version'])
                except:
                    pass
            raise
    
    def validate_config(self, config: str) -> Tuple[bool, List[str]]:
        """Validate configuration XML"""
        errors = []
        
        try:
            # Parse XML
            ET.fromstring(config)
            
            # Validate against schema if available
            # This would require the PAN-OS XSD schema
            
            # Basic structure validation
            root = ET.fromstring(config)
            if root.tag not in ['config', 'devices']:
                errors.append("Invalid root element")
            
            # Check for required elements
            # This is simplified - real validation would be more complex
            
            return len(errors) == 0, errors
            
        except ET.ParseError as e:
            errors.append(f"XML parse error: {str(e)}")
            return False, errors
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
            return False, errors
    
    def apply_configuration(self, config: str, save: bool = True) -> CommandResult:
        """Apply configuration changes"""
        try:
            # Validate configuration
            valid, errors = self.validate_config(config)
            if not valid:
                raise ValidationError(f"Configuration validation failed: {', '.join(errors)}")
            
            # Load configuration to candidate
            self.device.xapi.edit("/config", config)
            
            # Commit if requested
            if save:
                self.save_config()
            
            return CommandResult(
                command="apply_configuration",
                output="Configuration applied successfully",
                success=True
            )
            
        except Exception as e:
            raise ChangeExecutionError(f"Configuration apply failed: {str(e)}")
    
    def check_connectivity(self) -> bool:
        """Check device connectivity"""
        try:
            self.device.refresh_system_info()
            return True
        except:
            return False
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get device information"""
        try:
            info = {
                'hostname': self.device.hostname,
                'model': self.device.model,
                'serial': self.device.serial,
                'version': self.device.version,
                'uptime': self.device.uptime,
                'platform': 'PAN-OS',
                'device_type': 'panorama' if self.panorama_managed else 'firewall'
            }
            
            # Get additional system info
            system_info = self.execute_command("<show><system><info></info></system></show>")
            # Parse XML response for additional details
            
            return info
            
        except Exception as e:
            self.logger.error(f"Failed to get device info: {str(e)}")
            return {}
    
    def get_interface_status(self) -> Dict[str, Dict[str, Any]]:
        """Get interface status"""
        interfaces = {}
        
        try:
            # Get interface info
            response = self.execute_command("<show><interface>all</interface></show>")
            
            # Parse XML response
            root = ET.fromstring(response.output)
            
            for interface in root.findall(".//entry"):
                name = interface.get('name')
                if name:
                    interfaces[name] = {
                        'status': interface.findtext('state', 'unknown'),
                        'ip_address': interface.findtext('ip', ''),
                        'mac_address': interface.findtext('mac', ''),
                        'speed': interface.findtext('speed', ''),
                        'duplex': interface.findtext('duplex', '')
                    }
            
        except Exception as e:
            self.logger.error(f"Failed to get interface status: {str(e)}")
        
        return interfaces
    
    def get_routing_table(self) -> List[Dict[str, Any]]:
        """Get routing table"""
        routes = []
        
        try:
            # Get routing table
            response = self.execute_command("<show><routing><route></route></routing></show>")
            
            # Parse XML response
            root = ET.fromstring(response.output)
            
            for entry in root.findall(".//entry"):
                route = {
                    'destination': entry.findtext('destination', ''),
                    'nexthop': entry.findtext('nexthop', ''),
                    'interface': entry.findtext('interface', ''),
                    'metric': entry.findtext('metric', ''),
                    'flags': entry.findtext('flags', '')
                }
                routes.append(route)
            
        except Exception as e:
            self.logger.error(f"Failed to get routing table: {str(e)}")
        
        return routes
    
    def get_security_policies(self) -> List[Dict[str, Any]]:
        """Get security policies"""
        policies = []
        
        try:
            # Get security policies
            if isinstance(self.device, firewall.Firewall):
                # Get policies from firewall
                rulebase = policies.Rulebase()
                self.device.add(rulebase)
                
                security_rules = policies.SecurityRule.refreshall(rulebase)
                
                for rule in security_rules:
                    policy = {
                        'name': rule.name,
                        'source_zones': rule.fromzone,
                        'destination_zones': rule.tozone,
                        'source_addresses': rule.source,
                        'destination_addresses': rule.destination,
                        'applications': rule.application,
                        'services': rule.service,
                        'action': rule.action,
                        'disabled': rule.disabled
                    }
                    policies.append(policy)
            
        except Exception as e:
            self.logger.error(f"Failed to get security policies: {str(e)}")
        
        return policies
    
    def get_nat_policies(self) -> List[Dict[str, Any]]:
        """Get NAT policies"""
        nat_rules = []
        
        try:
            # Get NAT policies
            if isinstance(self.device, firewall.Firewall):
                rulebase = policies.Rulebase()
                self.device.add(rulebase)
                
                nat_policies = policies.NatRule.refreshall(rulebase)
                
                for rule in nat_policies:
                    nat_rule = {
                        'name': rule.name,
                        'source_zones': rule.fromzone,
                        'destination_zone': rule.tozone,
                        'source_addresses': rule.source,
                        'destination_address': rule.destination,
                        'service': rule.service,
                        'source_translation': rule.source_translation,
                        'destination_translation': rule.destination_translation,
                        'disabled': rule.disabled
                    }
                    nat_rules.append(nat_rule)
            
        except Exception as e:
            self.logger.error(f"Failed to get NAT policies: {str(e)}")
        
        return nat_rules
    
    def get_address_objects(self) -> List[Dict[str, Any]]:
        """Get address objects"""
        addresses = []
        
        try:
            # Get address objects
            addr_objects = objects.AddressObject.refreshall(self.device)
            
            for addr in addr_objects:
                address = {
                    'name': addr.name,
                    'value': addr.value,
                    'type': addr.type,
                    'description': addr.description,
                    'tags': addr.tag
                }
                addresses.append(address)
            
        except Exception as e:
            self.logger.error(f"Failed to get address objects: {str(e)}")
        
        return addresses
    
    def get_pending_changes(self) -> str:
        """Get pending configuration changes"""
        try:
            # Check for candidate config changes
            response = self.device.xapi.op("show config diff")
            
            if isinstance(response, ET.Element):
                return ET.tostring(response, encoding='unicode')
            else:
                return str(response)
                
        except Exception as e:
            self.logger.error(f"Failed to get pending changes: {str(e)}")
            return ""
    
    def _save_config_version(self):
        """Save current configuration as a version"""
        try:
            version_info = {
                'version': len(self._config_versions) + 1,
                'timestamp': datetime.now(),
                'config': self.get_running_config()
            }
            
            self._config_versions.append(version_info)
            
            # Keep only last 10 versions
            if len(self._config_versions) > 10:
                self._config_versions.pop(0)
                
        except Exception as e:
            self.logger.error(f"Failed to save config version: {str(e)}")
    
    def _revert_to_version(self, version_number: int) -> bool:
        """Revert to a specific configuration version"""
        try:
            version = next((v for v in self._config_versions if v['version'] == version_number), None)
            if not version:
                raise ValueError(f"Version {version_number} not found")
            
            # Load the configuration
            self.device.xapi.edit("/config", version['config'])
            
            # Commit
            self.save_config()
            
            self.logger.info(f"Reverted to configuration version {version_number}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to revert configuration: {str(e)}")
            return False
    
    def _get_device_state(self) -> Dict[str, Any]:
        """Get complete device state for backup"""
        state = {
            'device_info': self.get_device_info(),
            'interfaces': self.get_interface_status(),
            'routes': self.get_routing_table(),
            'security_policies': self.get_security_policies(),
            'nat_policies': self.get_nat_policies(),
            'address_objects': self.get_address_objects(),
            'backup_timestamp': datetime.now().isoformat()
        }
        
        return state
    
    def create_snapshot(self, name: str, description: str = "") -> bool:
        """Create a named configuration snapshot on the device"""
        try:
            cmd = f"<save><config><to>{name}</to></save></config>"
            
            if description:
                # Add description if supported by PAN-OS version
                pass
            
            result = self.execute_command(cmd)
            
            self.logger.info(f"Created snapshot: {name}")
            return result.success
            
        except Exception as e:
            self.logger.error(f"Failed to create snapshot: {str(e)}")
            return False
    
    def list_snapshots(self) -> List[Dict[str, Any]]:
        """List available configuration snapshots"""
        snapshots = []
        
        try:
            response = self.execute_command("<show><config><saved></saved></config></show>")
            
            # Parse response for snapshot list
            root = ET.fromstring(response.output)
            
            for snapshot in root.findall(".//entry"):
                snap_info = {
                    'name': snapshot.get('name'),
                    'date': snapshot.findtext('date', ''),
                    'size': snapshot.findtext('size', '')
                }
                snapshots.append(snap_info)
            
        except Exception as e:
            self.logger.error(f"Failed to list snapshots: {str(e)}")
        
        return snapshots
    
    def load_snapshot(self, name: str) -> bool:
        """Load a named configuration snapshot"""
        try:
            cmd = f"<load><config><from>{name}</from></config></load>"
            result = self.execute_command(cmd)
            
            if result.success:
                self.logger.info(f"Loaded snapshot: {name}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to load snapshot: {str(e)}")
            return False