#!/usr/bin/env python3
"""
Multi-Controller Aruba Guest WiFi Password Management

This script:
1. Audits guest WiFi passwords across ALL controllers
2. Shows current passwords (unencrypted using 'show run no-encrypt')
3. Asks ONCE if you want to update all controllers
4. Updates all controllers simultaneously if confirmed
"""

import logging
import colorlog
import yaml
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import getpass
import requests
import json
import urllib3
from typing import Dict, Optional, Any

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class ArubaClient:
    """Simplified Aruba API client for guest WiFi management"""
    def __init__(self, controller_ip: str, username: str, password: str, api_version: str = "v1"):
        self.controller_ip = controller_ip
        self.username = username
        self.password = password
        self.api_version = api_version
        self.base_url = f"https://{controller_ip}:4343"
        self.session = requests.Session()
        self.session.verify = False
        self.session_id = None
        self.logger = logging.getLogger(__name__)

    def login(self) -> bool:
        login_url = f"{self.base_url}/api/login"
        login_data = {
            "username": self.username,
            "password": self.password
        }
        
        try:
            response = self.session.post(login_url, json=login_data)
            response.raise_for_status()
            
            result = response.json()
            if result.get("_global_result", {}).get("status") == "0":
                self.session_id = result.get("_global_result", {}).get("UIDARUBA")
                self.session.headers.update({
                    "Cookie": f"SESSION={self.session_id}",
                    "Content-Type": "application/json"
                })
                self.logger.info("Successfully authenticated to Aruba controller")
                return True
            else:
                self.logger.error(f"Login failed: {result.get('_global_result', {}).get('status_str')}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Login request failed: {str(e)}")
            return False

    def logout(self) -> bool:
        if not self.session_id:
            return True
            
        logout_url = f"{self.base_url}/api/logout"
        
        try:
            response = self.session.get(logout_url)
            response.raise_for_status()
            self.session_id = None
            return True
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Logout request failed: {str(e)}")
            return False

    def execute_command(self, command: str, config_path: str = "") -> Optional[Dict[str, Any]]:
        if not self.session_id:
            self.logger.error("Not authenticated. Please login first.")
            return None
            
        command_url = f"{self.base_url}/api/command"
        
        data = {
            "cmd": command
        }
        
        if config_path:
            data["config_path"] = config_path
            
        try:
            response = self.session.post(command_url, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Command execution failed: {str(e)}")
            return None

    def get_current_password(self, ssid_profile: str, config_path: str = "/md") -> Optional[str]:
        """Get current password for an SSID profile using show run no-encrypt"""
        try:
            command = f"show run no-encrypt wlan ssid-profile {ssid_profile}"
            result = self.execute_command(command, config_path=config_path)
            
            if not result or not result.get("_data"):
                self.logger.error(f"Failed to get configuration for {ssid_profile}")
                return None
            
            data = result.get("_data", [])
            for line in data:
                if isinstance(line, str) and "wpa-passphrase" in line:
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        password = ' '.join(parts[1:])
                        self.logger.debug(f"Found current password for {ssid_profile}")
                        return password
            
            self.logger.warning(f"No wpa-passphrase found for {ssid_profile}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting current password: {str(e)}")
            return None

    def update_ssid_password(self, ssid_profile: str, new_password: str, config_path: str = "/md") -> bool:
        config_commands = [
            f"wlan ssid-profile {ssid_profile}",
            f"wpa-passphrase {new_password}",
            "exit"
        ]
        
        for command in config_commands:
            result = self.execute_command(command, config_path=config_path)
            
            if not result or result.get("_global_result", {}).get("status") != "0":
                self.logger.error(f"Failed to execute command: {command}")
                return False
                
        return True

    def apply_configuration(self) -> bool:
        apply_command = "apply profile all"
        result = self.execute_command(apply_command, config_path="/md")
        
        if result and result.get("_global_result", {}).get("status") == "0":
            self.logger.info("Configuration applied successfully")
            return True
        else:
            self.logger.error("Failed to apply configuration")
            return False

    def write_memory(self) -> bool:
        write_mem_url = f"{self.base_url}/api/write_memory"
        
        try:
            response = self.session.get(write_mem_url)
            response.raise_for_status()
            result = response.json()
            
            if result.get("_global_result", {}).get("status") == "0":
                self.logger.info("Configuration saved successfully")
                return True
            else:
                self.logger.error(f"Failed to save configuration: {result.get('_global_result', {}).get('status_str')}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Write memory request failed: {str(e)}")
            return False

    def __enter__(self):
        self.login()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logout()


class PasswordManager:
    """Simple password generator"""
    @staticmethod
    def generate_password(length: int = 12, include_uppercase: bool = True,
                         include_lowercase: bool = True, include_digits: bool = True,
                         include_special: bool = False, exclude_ambiguous: bool = True) -> str:
        import random
        import string
        
        characters = ""
        
        if include_lowercase:
            characters += string.ascii_lowercase
        if include_uppercase:
            characters += string.ascii_uppercase
        if include_digits:
            characters += string.digits
        if include_special:
            characters += "!@#$%^&*"
            
        if exclude_ambiguous:
            # Remove ambiguous characters
            ambiguous = "0O1lI"
            characters = ''.join(c for c in characters if c not in ambiguous)
        
        if not characters:
            characters = string.ascii_letters + string.digits
            
        password = ''.join(random.choice(characters) for _ in range(length))
        return password


class MultiControllerGuestWiFi:
    def __init__(self, config_file: str = "config/multi_controllers.yaml"):
        self.config = self.load_config(config_file)
        self.setup_logging()
        self.password_manager = PasswordManager()
        self.logger = logging.getLogger(__name__)
        self.guest_ssid = self.config.get('guest_wifi', {}).get('ssid_name', 'Guest-WiFi')

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
        
        # File logging
        file_handler = logging.FileHandler(
            f"logs/multi_controller_guest_wifi_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
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
            # Create default multi-controller config
            default_config = {
                'controllers': [
                    {
                        'name': 'Controller 1',
                        'ip': '192.168.1.100',
                        'username': 'admin',
                        'password': 'password'
                    },
                    {
                        'name': 'Controller 2',
                        'ip': '192.168.2.100',
                        'username': 'admin',
                        'password': 'password'
                    }
                ],
                'guest_wifi': {
                    'ssid_name': 'Guest-WiFi',
                    'password_length': 12,
                    'password_options': {
                        'include_uppercase': True,
                        'include_lowercase': True,
                        'include_digits': True,
                        'include_special': False,
                        'exclude_ambiguous': True
                    }
                }
            }
            
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(config_path, 'w') as f:
                yaml.dump(default_config, f, default_flow_style=False)
                
            self.logger.warning(f"Created default config at {config_path}. Please update with your controllers.")
            return default_config
        
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def _audit_single_controller(self, controller_info: Dict) -> Dict:
        """Thread-safe method to audit a single controller"""
        result = {
            'controller_name': controller_info['name'],
            'controller_ip': controller_info['ip'],
            'success': False,
            'current_password': None,
            'error': None,
            'ssid_exists': False
        }
        
        try:
            with ArubaClient(
                controller_ip=controller_info['ip'],
                username=controller_info['username'],
                password=controller_info['password']
            ) as client:
                
                if not client.session_id:
                    result['error'] = "Failed to authenticate"
                    return result
                
                # Get current guest WiFi password
                current_password = client.get_current_password(self.guest_ssid)
                
                if current_password:
                    result['success'] = True
                    result['current_password'] = current_password
                    result['ssid_exists'] = True
                    self.logger.info(f"[{controller_info['name']}] Found {self.guest_ssid} password")
                else:
                    result['ssid_exists'] = False
                    result['error'] = f"{self.guest_ssid} not found or no password set"
                    self.logger.warning(f"[{controller_info['name']}] {self.guest_ssid} not found")
                    
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[{controller_info['name']}] Error: {str(e)}")
            
        return result

    def audit_all_controllers(self, max_workers: int = 5) -> List[Dict]:
        """Audit guest WiFi passwords across all controllers using multithreading"""
        controllers = self.config.get('controllers', [])
        
        if not controllers:
            self.logger.error("No controllers configured")
            return []
        
        print(f"\n🔍 Auditing {self.guest_ssid} across {len(controllers)} controllers...\n")
        
        results = []
        max_workers = min(max_workers, len(controllers))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_controller = {
                executor.submit(self._audit_single_controller, controller): controller
                for controller in controllers
            }
            
            for future in as_completed(future_to_controller):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    controller = future_to_controller[future]
                    self.logger.error(f"Thread error for {controller['name']}: {str(e)}")
                    results.append({
                        'controller_name': controller['name'],
                        'controller_ip': controller['ip'],
                        'success': False,
                        'error': f"Thread error: {str(e)}"
                    })
        
        return results

    def display_audit_results(self, audit_results: List[Dict]) -> bool:
        """Display audit results and return if any controllers have the SSID"""
        print("="*80)
        print(f"GUEST WIFI AUDIT RESULTS - {self.guest_ssid}")
        print("="*80)
        print(f"{'Controller':<30} {'IP':<20} {'Current Password':<20} {'Status'}")
        print("-"*80)
        
        controllers_with_ssid = 0
        different_passwords = set()
        
        for result in audit_results:
            name = result['controller_name']
            ip = result['controller_ip']
            
            if result['success']:
                password = result['current_password']
                different_passwords.add(password)
                status = "✓ Found"
                controllers_with_ssid += 1
                print(f"{name:<30} {ip:<20} {password:<20} {status}")
            else:
                error = result.get('error', 'Unknown error')
                if 'not found' in error:
                    print(f"{name:<30} {ip:<20} {'N/A':<20} ✗ SSID not configured")
                else:
                    print(f"{name:<30} {ip:<20} {'ERROR':<20} ✗ {error}")
        
        print("="*80)
        
        # Summary
        print(f"\nSummary:")
        print(f"  Total controllers: {len(audit_results)}")
        print(f"  Controllers with {self.guest_ssid}: {controllers_with_ssid}")
        print(f"  Unique passwords found: {len(different_passwords)}")
        
        if len(different_passwords) > 1:
            print(f"\n⚠️  WARNING: Different passwords found across controllers!")
            print("  Passwords:", list(different_passwords))
        
        return controllers_with_ssid > 0

    def _update_single_controller(self, controller_info: Dict, new_password: str) -> Dict:
        """Thread-safe method to update a single controller"""
        result = {
            'controller_name': controller_info['name'],
            'controller_ip': controller_info['ip'],
            'success': False,
            'error': None
        }
        
        try:
            with ArubaClient(
                controller_ip=controller_info['ip'],
                username=controller_info['username'],
                password=controller_info['password']
            ) as client:
                
                if not client.session_id:
                    result['error'] = "Failed to authenticate"
                    return result
                
                # Update password
                if client.update_ssid_password(self.guest_ssid, new_password):
                    # Apply configuration
                    if client.apply_configuration():
                        # Save to memory
                        if client.write_memory():
                            result['success'] = True
                            self.logger.info(f"[{controller_info['name']}] Successfully updated {self.guest_ssid}")
                        else:
                            result['error'] = "Failed to save configuration"
                    else:
                        result['error'] = "Failed to apply configuration"
                else:
                    result['error'] = "Failed to update password"
                    
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[{controller_info['name']}] Update error: {str(e)}")
            
        return result

    def update_all_controllers(self, new_password: str, controllers_to_update: List[Dict], 
                             max_workers: int = 5) -> List[Dict]:
        """Update guest WiFi password on all specified controllers"""
        print(f"\n🔄 Updating {self.guest_ssid} password on {len(controllers_to_update)} controllers...\n")
        
        results = []
        max_workers = min(max_workers, len(controllers_to_update))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_controller = {
                executor.submit(self._update_single_controller, controller, new_password): controller
                for controller in controllers_to_update
            }
            
            for future in as_completed(future_to_controller):
                try:
                    result = future.result()
                    results.append(result)
                    
                    # Real-time status update
                    controller_name = result['controller_name']
                    if result['success']:
                        print(f"✓ {controller_name}: Password updated successfully")
                    else:
                        print(f"✗ {controller_name}: {result['error']}")
                        
                except Exception as e:
                    controller = future_to_controller[future]
                    self.logger.error(f"Thread error for {controller['name']}: {str(e)}")
                    print(f"✗ {controller['name']}: Thread error")
        
        return results

    def run_interactive_update(self):
        """Main interactive workflow for auditing and updating guest WiFi passwords"""
        # Step 1: Audit all controllers
        audit_results = self.audit_all_controllers()
        
        if not audit_results:
            print("\n❌ No controllers to audit")
            return
        
        # Display results
        has_guest_wifi = self.display_audit_results(audit_results)
        
        if not has_guest_wifi:
            print(f"\n❌ No controllers have {self.guest_ssid} configured")
            return
        
        # Step 2: Ask what user wants to do
        print(f"\n📋 What would you like to do?")
        print("1. Audit only (exit after showing passwords)")
        print("2. Update passwords on all controllers")
        
        action = input("\nSelect action (1 or 2): ").strip()
        
        if action == '1':
            print("\n✅ Audit complete. Exiting...")
            return
        elif action == '2':
            # Continue with update process
            pass
        else:
            print("\n❌ Invalid option. Exiting...")
            return
        
        # Step 3: Generate or enter new password
        print("\n📝 Password Options:")
        print("1. Generate a new random password")
        print("2. Enter a specific password")
        
        choice = input("Select option (1 or 2): ").strip()
        
        if choice == '1':
            # Generate new password
            password_options = self.config['guest_wifi']['password_options']
            password_length = self.config['guest_wifi']['password_length']
            
            new_password = self.password_manager.generate_password(
                length=password_length,
                **password_options
            )
            print(f"\n🔑 Generated password: {new_password}")
        elif choice == '2':
            # Manual entry
            new_password = getpass.getpass("\nEnter new password: ")
            confirm_password = getpass.getpass("Confirm new password: ")
            
            if new_password != confirm_password:
                print("\n❌ Passwords don't match. Update cancelled")
                return
        else:
            print("\n❌ Invalid option. Update cancelled")
            return
        
        # Step 4: Final confirmation
        print(f"\n⚠️  FINAL CONFIRMATION")
        print(f"This will update {self.guest_ssid} password on ALL controllers")
        print(f"New password: {new_password}")
        
        confirm = input("\nType 'UPDATE' to proceed: ").strip()
        
        if confirm != 'UPDATE':
            print("\n❌ Update cancelled")
            return
        
        # Step 5: Update all controllers that have the SSID
        controllers_to_update = []
        for i, result in enumerate(audit_results):
            if result['success'] and result['ssid_exists']:
                controllers_to_update.append(self.config['controllers'][i])
        
        update_results = self.update_all_controllers(new_password, controllers_to_update)
        
        # Step 6: Summary
        print("\n" + "="*60)
        print("UPDATE SUMMARY")
        print("="*60)
        
        successful = sum(1 for r in update_results if r['success'])
        failed = len(update_results) - successful
        
        print(f"Total controllers: {len(update_results)}")
        print(f"✓ Successful: {successful}")
        print(f"✗ Failed: {failed}")
        
        if successful > 0:
            # Save the new password
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            password_file = Path("logs") / f"guest_wifi_password_{timestamp}.txt"
            
            with open(password_file, 'w') as f:
                f.write(f"Guest WiFi Password Update - {timestamp}\n")
                f.write(f"SSID: {self.guest_ssid}\n")
                f.write(f"New Password: {new_password}\n")
                f.write(f"Updated Controllers: {successful}/{len(update_results)}\n")
            
            print(f"\n📄 Password saved to: {password_file}")
        
        print("\n✅ Process complete!")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Multi-Controller Aruba Guest WiFi Management')
    parser.add_argument('-c', '--config', default='config/multi_controllers.yaml', 
                       help='Path to multi-controller config file')
    parser.add_argument('--audit-only', action='store_true', 
                       help='Only audit passwords, do not update')
    parser.add_argument('--max-workers', type=int, default=5, 
                       help='Maximum threads for parallel processing')
    
    args = parser.parse_args()
    
    manager = MultiControllerGuestWiFi(config_file=args.config)
    
    if args.audit_only:
        # Just audit and display
        results = manager.audit_all_controllers(max_workers=args.max_workers)
        manager.display_audit_results(results)
    else:
        # Full interactive workflow
        manager.run_interactive_update()


if __name__ == "__main__":
    main()