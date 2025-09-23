import logging
import colorlog
import schedule
import time
import yaml
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import sys
import json

from .aruba_client import ArubaClient
from .password_manager import PasswordManager


class WiFiAutomation:
    def __init__(self, config_file: str = "config/config.yaml"):
        self.config = self.load_config(config_file)
        self.setup_logging()
        self.password_manager = PasswordManager()
        self.logger = logging.getLogger(__name__)

    def setup_logging(self):
        log_format = '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s%(reset)s'
        
        handler = colorlog.StreamHandler()
        handler.setFormatter(colorlog.ColoredFormatter(
            log_format,
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        ))
        
        # Ensure logs directory exists
        Path("logs").mkdir(exist_ok=True)
        
        # Also setup file logging
        file_handler = logging.FileHandler(
            f"logs/wifi_automation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        logging.basicConfig(
            level=logging.INFO,
            handlers=[handler, file_handler]
        )

    def load_config(self, config_file: str) -> Dict:
        config_path = Path(config_file)
        
        if not config_path.exists():
            # Create default config
            default_config = {
                'aruba': {
                    'controller_ip': '192.168.1.1',
                    'username': 'admin',
                    'password': 'password',
                    'api_version': 'v1'
                },
                'wifi': {
                    'ssids': ['Guest-WiFi', 'Corporate-WiFi'],
                    'password_length': 12,
                    'password_options': {
                        'include_uppercase': True,
                        'include_lowercase': True,
                        'include_digits': True,
                        'include_special': False,
                        'exclude_ambiguous': True
                    }
                },
                'automation': {
                    'password_file': 'config/passwords.csv',
                    'password_file_format': 'csv',
                    'save_passwords': True,
                    'backup_passwords': True,
                    'backup_directory': 'backups'
                },
                'schedule': {
                    'enabled': False,
                    'frequency': 'daily',
                    'time': '02:00',
                    'day_of_week': 'monday',
                    'day_of_month': 1
                }
            }
            
            # Create config directory if it doesn't exist
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(config_path, 'w') as f:
                yaml.dump(default_config, f, default_flow_style=False)
                
            self.logger.warning(f"Created default config file at {config_path}. Please update it with your settings.")
            return default_config
        
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def list_available_networks(self) -> List[Dict[str, str]]:
        aruba_config = self.config['aruba']
        networks = []
        
        try:
            with ArubaClient(
                controller_ip=aruba_config['controller_ip'],
                username=aruba_config['username'],
                password=aruba_config['password'],
                api_version=aruba_config.get('api_version', 'v1')
            ) as client:
                
                if not client.session_id:
                    self.logger.error("Failed to authenticate to Aruba controller")
                    return networks
                
                # Get all SSID profiles
                result = client.get_all_ssid_profiles()
                
                if result and result.get("_data"):
                    # Parse the output to extract SSID names
                    data = result.get("_data", [])
                    
                    for line in data:
                        if isinstance(line, str) and "Profile Name" not in line and line.strip():
                            # Extract SSID profile name
                            parts = line.split()
                            if parts:
                                ssid_name = parts[0]
                                networks.append({
                                    'ssid': ssid_name,
                                    'type': 'ssid-profile'
                                })
                
                # Also get virtual AP profiles for complete network list
                vap_result = client.get_virtual_ap_profiles()
                if vap_result and vap_result.get("_data"):
                    data = vap_result.get("_data", [])
                    
                    for line in data:
                        if isinstance(line, str) and "Profile Name" not in line and line.strip():
                            parts = line.split()
                            if parts:
                                vap_name = parts[0]
                                # Check if not already in list
                                if not any(n['ssid'] == vap_name for n in networks):
                                    networks.append({
                                        'ssid': vap_name,
                                        'type': 'virtual-ap'
                                    })
                
                return networks
                
        except Exception as e:
            self.logger.error(f"Error listing networks: {str(e)}")
            return networks

    def select_networks_interactive(self, available_networks: List[Dict[str, str]]) -> List[str]:
        print("\n" + "="*50)
        print("Available WiFi Networks:")
        print("="*50)
        
        for idx, network in enumerate(available_networks, 1):
            print(f"{idx}. {network['ssid']} ({network['type']})")
        
        print("\nSelect networks to update (comma-separated numbers, or 'all' for all networks):")
        selection = input("Your selection: ").strip()
        
        selected_ssids = []
        
        if selection.lower() == 'all':
            selected_ssids = [n['ssid'] for n in available_networks]
        else:
            try:
                indices = [int(x.strip()) - 1 for x in selection.split(',')]
                for idx in indices:
                    if 0 <= idx < len(available_networks):
                        selected_ssids.append(available_networks[idx]['ssid'])
                    else:
                        print(f"Warning: Invalid selection {idx + 1}")
            except ValueError:
                print("Error: Invalid input. Please enter numbers separated by commas.")
                return []
        
        return selected_ssids

    def update_passwords(self, password_entries: List[Dict[str, str]] = None, 
                        selected_ssids: List[str] = None,
                        interactive: bool = False) -> bool:
        aruba_config = self.config['aruba']
        
        try:
            with ArubaClient(
                controller_ip=aruba_config['controller_ip'],
                username=aruba_config['username'],
                password=aruba_config['password'],
                api_version=aruba_config.get('api_version', 'v1')
            ) as client:
                
                if not client.session_id:
                    self.logger.error("Failed to authenticate to Aruba controller")
                    return False
                
                # If interactive mode, list and select networks
                if interactive:
                    available_networks = self.list_available_networks()
                    
                    if not available_networks:
                        self.logger.error("No networks found on controller")
                        return False
                    
                    selected_ssids = self.select_networks_interactive(available_networks)
                    
                    if not selected_ssids:
                        self.logger.info("No networks selected")
                        return False
                
                # If no password entries provided, generate new ones
                if not password_entries:
                    ssids = selected_ssids if selected_ssids else self.config['wifi']['ssids']
                    password_length = self.config['wifi']['password_length']
                    password_options = self.config['wifi']['password_options']
                    
                    password_entries = self.password_manager.generate_password_list(
                        ssids=ssids,
                        password_length=password_length,
                        password_options=password_options
                    )
                
                # Backup current passwords if enabled
                if self.config['automation']['backup_passwords']:
                    self.backup_passwords(password_entries)
                
                # Update each SSID
                success_count = 0
                update_mode = self.config['automation'].get('update_mode', 'standard')
                verify_passwords = self.config['automation'].get('verify_password_change', True)
                
                for entry in password_entries:
                    ssid = entry['ssid']
                    new_password = entry['password']
                    
                    self.logger.info(f"Updating password for SSID: {ssid}")
                    
                    # Get current password before change if verification is enabled
                    if verify_passwords:
                        current_password = client.get_current_password(ssid)
                        if current_password:
                            print(f"\n{ssid} - Current password: {current_password}")
                        else:
                            print(f"\n{ssid} - Unable to retrieve current password")
                    
                    if update_mode == 'all_groups':
                        # Update across all AP groups
                        self.logger.info(f"Using all-groups update mode for {ssid}")
                        group_results = client.update_ssid_password_all_groups(ssid, new_password)
                        
                        print(f"\n{ssid} Update Results:")
                        print(f"  Total AP Groups: {group_results['total_groups']}")
                        print(f"  Successful: {len(group_results['successful_groups'])}")
                        print(f"  Failed: {len(group_results['failed_groups'])}")
                        print(f"  Skipped: {len(group_results['skipped_groups'])}")
                        
                        if group_results['successful_groups']:
                            success_count += 1
                            print(f"✓ {ssid}: {new_password}")
                            
                            # Store success status for later verification
                            entry['update_successful'] = True
                        else:
                            print(f"✗ {ssid}: No groups updated successfully")
                            entry['update_successful'] = False
                            
                        if group_results['failed_groups']:
                            self.logger.error(f"Failed groups: {', '.join(group_results['failed_groups'])}")
                    else:
                        # Standard update
                        if client.update_ssid_password(ssid, new_password):
                            success_count += 1
                            self.logger.info(f"Successfully updated password for {ssid}")
                            print(f"✓ {ssid}: {new_password}")
                            entry['update_successful'] = True
                        else:
                            self.logger.error(f"Failed to update password for {ssid}")
                            print(f"✗ {ssid}: Failed to update")
                            entry['update_successful'] = False
                
                # Apply configuration if any updates were successful
                if success_count > 0:
                    # Use multi-level configuration application
                    use_multi_level = self.config['automation'].get('multi_level_apply', True)
                    
                    if use_multi_level:
                        self.logger.info("Applying configuration at multiple hierarchy levels")
                        if client.apply_configuration_multi_level():
                            self.logger.info("Multi-level configuration applied successfully")
                        else:
                            self.logger.error("Failed to apply configuration at all levels")
                    else:
                        if client.apply_configuration():
                            self.logger.info("Configuration applied successfully")
                        else:
                            self.logger.error("Failed to apply configuration")
                            return False
                    
                    # Force synchronization if enabled
                    if self.config['automation'].get('force_sync', True):
                        self.logger.info("Forcing configuration synchronization")
                        client.force_config_sync()
                    
                    # Save configuration
                    if client.write_memory():
                        self.logger.info("Configuration saved to memory")
                    else:
                        self.logger.warning("Failed to save configuration to memory")
                    
                    # Verify password changes if enabled
                    if verify_passwords:
                        print("\n" + "="*60)
                        print("Password Change Verification")
                        print("="*60)
                        
                        for entry in password_entries:
                            if entry.get('update_successful', False):
                                ssid = entry['ssid']
                                expected_password = entry['password']
                                
                                # Verify the password change
                                verification = client.verify_password_change(ssid, expected_password)
                                
                                if verification['verification_status'] == 'success':
                                    print(f"✓ {ssid}: Password verified successfully")
                                    print(f"  - Expected: {expected_password}")
                                    print(f"  - Current: {verification['current_password']}")
                                elif verification['verification_status'] == 'mismatch':
                                    print(f"✗ {ssid}: Password mismatch!")
                                    print(f"  - Expected: {expected_password}")
                                    print(f"  - Current: {verification['current_password']}")
                                elif verification['verification_status'] == 'no_password_found':
                                    print(f"? {ssid}: Unable to verify - no password found in config")
                                else:
                                    print(f"! {ssid}: Verification error")
                        
                        print("="*60 + "\n")
                    
                    # Verify updates if enabled
                    if self.config['automation'].get('verify_updates', True):
                        self.logger.info("Verifying password updates across APs")
                        verification = client.verify_password_update(ssid)
                        
                        print("\nAP Update Verification:")
                        print(f"  Total APs: {verification['total_aps']}")
                        print(f"  Online APs: {verification['online_aps']}")
                        print(f"  Offline APs: {len(verification['offline_aps'])}")
                        print(f"  Config Pending: {len(verification['config_pending_aps'])}")
                        
                        if verification['offline_aps']:
                            self.logger.warning(f"Offline APs: {', '.join(verification['offline_aps'][:5])}...")
                        
                        if verification['config_pending_aps']:
                            self.logger.warning(f"APs with pending config: {', '.join(verification['config_pending_aps'][:5])}...")
                            
                            # Optionally reboot AP groups with pending configs
                            if self.config['automation'].get('reboot_pending_groups', False):
                                self.logger.info("Rebooting AP groups with pending configurations")
                                # This would need additional logic to map APs to groups
                
                # Save passwords to file if enabled
                if self.config['automation']['save_passwords'] and success_count > 0:
                    self.save_passwords(password_entries)
                
                return success_count == len(password_entries)
                
        except Exception as e:
            self.logger.error(f"Error updating passwords: {str(e)}")
            return False

    def audit_passwords(self, selected_ssids: List[str] = None, 
                       include_ap_groups: bool = True,
                       save_report: bool = True) -> dict:
        """Audit current passwords without making changes"""
        aruba_config = self.config['aruba']
        
        try:
            with ArubaClient(
                controller_ip=aruba_config['controller_ip'],
                username=aruba_config['username'],
                password=aruba_config['password'],
                api_version=aruba_config.get('api_version', 'v1')
            ) as client:
                
                if not client.session_id:
                    self.logger.error("Failed to authenticate to Aruba controller")
                    return {}
                
                # Use provided SSIDs or get from config or audit all
                ssid_list = None
                if selected_ssids:
                    ssid_list = selected_ssids
                elif self.config.get('wifi', {}).get('ssids'):
                    ssid_list = self.config['wifi']['ssids']
                # If ssid_list is None, audit_ssid_passwords will audit all SSIDs
                
                # Generate comprehensive audit report
                report = client.generate_password_report(
                    ssid_list=ssid_list,
                    include_ap_groups=include_ap_groups
                )
                
                # Display audit results
                self.display_audit_results(report)
                
                # Save report if requested
                if save_report:
                    self.save_audit_report(report)
                
                return report
                
        except Exception as e:
            self.logger.error(f"Error during password audit: {str(e)}")
            return {}

    def display_audit_results(self, report: dict) -> None:
        """Display audit results in a formatted way"""
        print("\n" + "="*80)
        print("PASSWORD AUDIT REPORT")
        print("="*80)
        
        # Metadata
        metadata = report.get('report_metadata', {})
        print(f"Generated: {metadata.get('generated_at', 'Unknown')}")
        print(f"Controller: {metadata.get('controller_ip', 'Unknown')}")
        
        # Summary
        summary = report.get('summary', {})
        print(f"\nSUMMARY:")
        print(f"  Total SSIDs Audited: {summary.get('total_ssids_audited', 0)}")
        print(f"  SSIDs with Passwords: {summary.get('ssids_with_passwords', 0)}")
        print(f"  SSIDs without Passwords: {summary.get('ssids_without_passwords', 0)}")
        print(f"  Total AP Groups: {summary.get('total_ap_groups', 0)}")
        print(f"  Audit Errors: {summary.get('audit_errors', 0)}")
        
        # SSID Details
        ssid_audit = report.get('ssid_audit', {})
        if ssid_audit.get('ssids_with_passwords'):
            print(f"\nSSIDs WITH PASSWORDS:")
            print("-" * 60)
            for ssid_info in ssid_audit['ssids_with_passwords']:
                ssid = ssid_info['ssid']
                password = ssid_info['password']
                length = ssid_info['password_length']
                print(f"  {ssid:<25} | {password:<20} | Length: {length}")
        
        if ssid_audit.get('ssids_without_passwords'):
            print(f"\nSSIDs WITHOUT PASSWORDS:")
            print("-" * 40)
            for ssid in ssid_audit['ssids_without_passwords']:
                print(f"  {ssid}")
        
        # AP Group Details
        ap_group_audit = report.get('ap_group_audit', {})
        if ap_group_audit.get('ssid_password_map'):
            print(f"\nSSID-TO-AP-GROUP MAPPING:")
            print("-" * 60)
            for ssid, info in ap_group_audit['ssid_password_map'].items():
                groups = ', '.join(info['ap_groups'])
                print(f"  {ssid:<25} | Groups: {groups}")
        
        # Errors
        all_errors = []
        if ssid_audit.get('audit_errors'):
            all_errors.extend(ssid_audit['audit_errors'])
        if ap_group_audit.get('audit_errors'):
            all_errors.extend(ap_group_audit['audit_errors'])
            
        if all_errors:
            print(f"\nAUDIT ERRORS:")
            print("-" * 40)
            for error in all_errors:
                print(f"  {error}")
        
        print("="*80 + "\n")

    def save_audit_report(self, report: dict) -> None:
        """Save audit report to file"""
        from pathlib import Path
        import json
        
        # Create reports directory
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = reports_dir / f"password_audit_{timestamp}.json"
        
        try:
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            self.logger.info(f"Audit report saved to {report_file}")
            print(f"📄 Audit report saved to: {report_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to save audit report: {str(e)}")

    def compare_passwords(self, expected_passwords: List[Dict[str, str]]) -> dict:
        """Compare current passwords against expected passwords"""
        aruba_config = self.config['aruba']
        comparison_results = {
            'matches': [],
            'mismatches': [],
            'missing_ssids': [],
            'audit_errors': [],
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            with ArubaClient(
                controller_ip=aruba_config['controller_ip'],
                username=aruba_config['username'],
                password=aruba_config['password'],
                api_version=aruba_config.get('api_version', 'v1')
            ) as client:
                
                if not client.session_id:
                    self.logger.error("Failed to authenticate to Aruba controller")
                    return comparison_results
                
                for entry in expected_passwords:
                    ssid = entry['ssid']
                    expected_password = entry['password']
                    
                    try:
                        current_password = client.get_current_password(ssid)
                        
                        if current_password is None:
                            comparison_results['missing_ssids'].append(ssid)
                        elif current_password == expected_password:
                            comparison_results['matches'].append({
                                'ssid': ssid,
                                'password': current_password
                            })
                        else:
                            comparison_results['mismatches'].append({
                                'ssid': ssid,
                                'expected': expected_password,
                                'current': current_password
                            })
                            
                    except Exception as e:
                        error_msg = f"Error comparing {ssid}: {str(e)}"
                        comparison_results['audit_errors'].append(error_msg)
                        self.logger.error(error_msg)
                
                return comparison_results
                
        except Exception as e:
            self.logger.error(f"Error during password comparison: {str(e)}")
            comparison_results['audit_errors'].append(f"General comparison error: {str(e)}")
            return comparison_results

    def test_connection(self) -> bool:
        aruba_config = self.config['aruba']
        
        print(f"\nTesting connection to Aruba controller at {aruba_config['controller_ip']}...")
        
        client = ArubaClient(
            controller_ip=aruba_config['controller_ip'],
            username=aruba_config['username'],
            password=aruba_config['password'],
            api_version=aruba_config.get('api_version', 'v1')
        )
        
        if client.test_connection():
            print("✓ Connection successful!")
            return True
        else:
            print("✗ Connection failed!")
            print("\nPlease check:")
            print("1. Controller IP is correct")
            print("2. API is enabled (see ARUBA_API_SETUP.md)")
            print("3. Username and password are correct")
            print("4. Network connectivity to controller")
            return False

    def save_passwords(self, password_entries: List[Dict[str, str]]) -> None:
        password_file = self.config['automation']['password_file']
        file_format = self.config['automation']['password_file_format']
        
        # Create directory if it doesn't exist
        Path(password_file).parent.mkdir(parents=True, exist_ok=True)
        
        if file_format == 'csv':
            self.password_manager.save_to_csv(password_file, password_entries)
        elif file_format == 'json':
            self.password_manager.save_to_json(password_file, password_entries)
        else:
            self.logger.error(f"Unknown file format: {file_format}")
            
        self.logger.info(f"Passwords saved to {password_file}")

    def backup_passwords(self, password_entries: List[Dict[str, str]]) -> None:
        backup_dir = Path(self.config['automation']['backup_directory'])
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = backup_dir / f"passwords_backup_{timestamp}.json"
        
        self.password_manager.save_to_json(str(backup_file), password_entries)
        self.logger.info(f"Passwords backed up to {backup_file}")

    def load_passwords_from_file(self) -> List[Dict[str, str]]:
        password_file = self.config['automation']['password_file']
        file_format = self.config['automation']['password_file_format']
        
        if not Path(password_file).exists():
            self.logger.warning(f"Password file {password_file} not found")
            return []
        
        if file_format == 'csv':
            return self.password_manager.load_from_csv(password_file)
        elif file_format == 'json':
            return self.password_manager.load_from_json(password_file)
        else:
            self.logger.error(f"Unknown file format: {file_format}")
            return []

    def run_scheduled_update(self) -> None:
        self.logger.info("Running scheduled password update")
        self.update_passwords()

    def setup_schedule(self) -> None:
        schedule_config = self.config['schedule']
        
        if not schedule_config['enabled']:
            self.logger.info("Scheduling is disabled")
            return
        
        frequency = schedule_config['frequency']
        
        if frequency == 'daily':
            schedule.every().day.at(schedule_config['time']).do(self.run_scheduled_update)
            self.logger.info(f"Scheduled daily password update at {schedule_config['time']}")
            
        elif frequency == 'weekly':
            day = schedule_config['day_of_week'].lower()
            time = schedule_config['time']
            getattr(schedule.every(), day).at(time).do(self.run_scheduled_update)
            self.logger.info(f"Scheduled weekly password update on {day} at {time}")
            
        elif frequency == 'monthly':
            # Schedule library doesn't support monthly directly, so we check daily
            day_of_month = schedule_config['day_of_month']
            time = schedule_config['time']
            
            def monthly_check():
                if datetime.now().day == day_of_month:
                    self.run_scheduled_update()
                    
            schedule.every().day.at(time).do(monthly_check)
            self.logger.info(f"Scheduled monthly password update on day {day_of_month} at {time}")

    def run_scheduler(self) -> None:
        self.logger.info("Starting scheduler...")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            self.logger.info("Scheduler stopped by user")
        except Exception as e:
            self.logger.error(f"Scheduler error: {str(e)}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Aruba WiFi Password Automation Tool')
    parser.add_argument('-c', '--config', default='config/config.yaml', help='Path to config file')
    parser.add_argument('-u', '--update', action='store_true', help='Update passwords immediately')
    parser.add_argument('-i', '--interactive', action='store_true', help='Interactive mode - select networks to update')
    parser.add_argument('-l', '--load', help='Load passwords from file and update')
    parser.add_argument('-s', '--schedule', action='store_true', help='Run in scheduled mode')
    parser.add_argument('-g', '--generate', action='store_true', help='Generate new passwords and save to file')
    parser.add_argument('--list-networks', action='store_true', help='List all available WiFi networks')
    parser.add_argument('--test-connection', action='store_true', help='Test connection to Aruba controller')
    parser.add_argument('--ssids', nargs='+', help='Specific SSIDs to update (space-separated)')
    parser.add_argument('--all-groups', action='store_true', help='Update password across all AP groups')
    parser.add_argument('--verify', action='store_true', help='Verify password updates after applying')
    parser.add_argument('--verify-passwords', action='store_true', help='Verify password changes using show run no-encrypt')
    parser.add_argument('--no-verify-passwords', action='store_true', help='Skip password verification')
    parser.add_argument('--force-sync', action='store_true', help='Force configuration synchronization')
    parser.add_argument('--list-ap-groups', action='store_true', help='List all AP groups')
    parser.add_argument('--show-current-password', nargs='+', help='Show current password for specific SSIDs')
    parser.add_argument('--audit', action='store_true', help='Audit all passwords without making changes')
    parser.add_argument('--audit-ssids', nargs='+', help='Audit specific SSIDs only')
    parser.add_argument('--audit-ap-groups', action='store_true', help='Include AP group analysis in audit')
    parser.add_argument('--compare-passwords', help='Compare current passwords against file')
    parser.add_argument('--save-audit-report', action='store_true', help='Save audit report to file')
    parser.add_argument('--no-save-audit-report', action='store_true', help='Skip saving audit report')
    
    args = parser.parse_args()
    
    automation = WiFiAutomation(config_file=args.config)
    
    # Override config with command line options
    if args.all_groups:
        automation.config['automation']['update_mode'] = 'all_groups'
    if args.verify:
        automation.config['automation']['verify_updates'] = True
    if args.verify_passwords:
        automation.config['automation']['verify_password_change'] = True
    if args.no_verify_passwords:
        automation.config['automation']['verify_password_change'] = False
    if args.force_sync:
        automation.config['automation']['force_sync'] = True
    
    if args.show_current_password:
        # Show current passwords for specified SSIDs
        aruba_config = automation.config['aruba']
        from aruba_client import ArubaClient
        with ArubaClient(
            controller_ip=aruba_config['controller_ip'],
            username=aruba_config['username'],
            password=aruba_config['password'],
            api_version=aruba_config.get('api_version', 'v1')
        ) as client:
            if client.session_id:
                print("\nCurrent Passwords:")
                print("="*50)
                for ssid in args.show_current_password:
                    current_password = client.get_current_password(ssid)
                    if current_password:
                        print(f"{ssid}: {current_password}")
                    else:
                        print(f"{ssid}: Unable to retrieve password")
            else:
                print("Failed to connect to controller")
    
    elif args.audit or args.audit_ssids:
        # Password audit mode
        selected_ssids = args.audit_ssids if args.audit_ssids else None
        include_ap_groups = args.audit_ap_groups if args.audit_ap_groups else True
        save_report = not args.no_save_audit_report if args.no_save_audit_report else True
        
        if args.save_audit_report:
            save_report = True
        
        print("🔍 Starting password audit...")
        automation.audit_passwords(
            selected_ssids=selected_ssids,
            include_ap_groups=include_ap_groups,
            save_report=save_report
        )
    
    elif args.compare_passwords:
        # Compare passwords against file
        file_path = args.compare_passwords
        try:
            if file_path.endswith('.csv'):
                expected_passwords = automation.password_manager.load_from_csv(file_path)
            else:
                expected_passwords = automation.password_manager.load_from_json(file_path)
            
            if expected_passwords:
                print("🔍 Comparing current passwords against expected values...")
                results = automation.compare_passwords(expected_passwords)
                
                print("\n" + "="*60)
                print("PASSWORD COMPARISON RESULTS")
                print("="*60)
                print(f"Matches: {len(results['matches'])}")
                print(f"Mismatches: {len(results['mismatches'])}")
                print(f"Missing SSIDs: {len(results['missing_ssids'])}")
                print(f"Errors: {len(results['audit_errors'])}")
                
                if results['matches']:
                    print(f"\n✅ MATCHES:")
                    for match in results['matches']:
                        print(f"  {match['ssid']}: {match['password']}")
                
                if results['mismatches']:
                    print(f"\n❌ MISMATCHES:")
                    for mismatch in results['mismatches']:
                        print(f"  {mismatch['ssid']}:")
                        print(f"    Expected: {mismatch['expected']}")
                        print(f"    Current:  {mismatch['current']}")
                
                if results['missing_ssids']:
                    print(f"\n❓ MISSING SSIDs:")
                    for ssid in results['missing_ssids']:
                        print(f"  {ssid}")
                
                if results['audit_errors']:
                    print(f"\n⚠️  ERRORS:")
                    for error in results['audit_errors']:
                        print(f"  {error}")
                        
                print("="*60)
            else:
                print("No passwords found in comparison file")
        except Exception as e:
            print(f"Error reading comparison file: {str(e)}")
    
    elif args.list_ap_groups:
        # List all AP groups
        aruba_config = automation.config['aruba']
        from aruba_client import ArubaClient
        with ArubaClient(
            controller_ip=aruba_config['controller_ip'],
            username=aruba_config['username'],
            password=aruba_config['password'],
            api_version=aruba_config.get('api_version', 'v1')
        ) as client:
            if client.session_id:
                ap_groups = client.get_all_ap_groups()
                if ap_groups:
                    print("\nAP Groups found:")
                    print("="*50)
                    for group in ap_groups:
                        print(f"- {group}")
                else:
                    print("No AP groups found")
            else:
                print("Failed to connect to controller")
    
    elif args.test_connection:
        # Test connection to controller
        automation.test_connection()
        
    elif args.list_networks:
        # List all available networks
        networks = automation.list_available_networks()
        
        if networks:
            print("\nAvailable WiFi Networks:")
            print("="*50)
            for network in networks:
                print(f"- {network['ssid']} ({network['type']})")
        else:
            print("No networks found or connection failed")
    
    elif args.generate:
        # Generate new passwords and save to file
        ssids = args.ssids if args.ssids else automation.config['wifi']['ssids']
        password_length = automation.config['wifi']['password_length']
        password_options = automation.config['wifi']['password_options']
        
        passwords = automation.password_manager.generate_password_list(
            ssids=ssids,
            password_length=password_length,
            password_options=password_options
        )
        
        automation.save_passwords(passwords)
        print(f"\nGenerated passwords for {len(passwords)} SSIDs:")
        for entry in passwords:
            print(f"- {entry['ssid']}: {entry['password']}")
        
    elif args.load:
        # Load passwords from file and update
        passwords = automation.password_manager.load_from_csv(args.load) if args.load.endswith('.csv') else automation.password_manager.load_from_json(args.load)
        
        if passwords:
            if automation.update_passwords(passwords):
                print("\nPasswords updated successfully")
            else:
                print("\nFailed to update some passwords")
        else:
            print("No passwords found in file")
            
    elif args.update:
        # Generate new passwords and update immediately
        selected_ssids = args.ssids if args.ssids else None
        
        if automation.update_passwords(selected_ssids=selected_ssids):
            print("\nPasswords updated successfully")
        else:
            print("\nFailed to update passwords")
    
    elif args.interactive:
        # Interactive mode - let user select networks
        if automation.update_passwords(interactive=True):
            print("\nPasswords updated successfully")
        else:
            print("\nFailed to update passwords")
            
    elif args.schedule:
        # Run in scheduled mode
        automation.setup_schedule()
        automation.run_scheduler()
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()