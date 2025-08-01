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

from aruba_client import ArubaClient
from password_manager import PasswordManager


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
                for entry in password_entries:
                    ssid = entry['ssid']
                    new_password = entry['password']
                    
                    self.logger.info(f"Updating password for SSID: {ssid}")
                    
                    if client.update_ssid_password(ssid, new_password):
                        success_count += 1
                        self.logger.info(f"Successfully updated password for {ssid}")
                        print(f"✓ {ssid}: {new_password}")
                    else:
                        self.logger.error(f"Failed to update password for {ssid}")
                        print(f"✗ {ssid}: Failed to update")
                
                # Apply configuration if any updates were successful
                if success_count > 0:
                    if client.apply_configuration():
                        self.logger.info("Configuration applied successfully")
                        
                        # Save configuration
                        if client.write_memory():
                            self.logger.info("Configuration saved to memory")
                        else:
                            self.logger.warning("Failed to save configuration to memory")
                    else:
                        self.logger.error("Failed to apply configuration")
                        return False
                
                # Save passwords to file if enabled
                if self.config['automation']['save_passwords'] and success_count > 0:
                    self.save_passwords(password_entries)
                
                return success_count == len(password_entries)
                
        except Exception as e:
            self.logger.error(f"Error updating passwords: {str(e)}")
            return False

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
    
    args = parser.parse_args()
    
    automation = WiFiAutomation(config_file=args.config)
    
    if args.test_connection:
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