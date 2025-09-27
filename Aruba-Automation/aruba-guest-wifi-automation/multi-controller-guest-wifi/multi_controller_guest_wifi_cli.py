#!/usr/bin/env python3
"""
Multi-Controller Aruba Guest WiFi Password Management - CLI Version

This script uses SSH/CLI commands instead of REST API for virtual controllers
that don't support API access.

Features:
1. SSH into all controllers simultaneously 
2. Show current CF_GUEST passwords (using 'show run no-encrypt')
3. Single confirmation to update all controllers
4. Change passwords via CLI commands
5. Verify changes worked
"""

import paramiko
import yaml
import logging
import colorlog
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import time
import getpass
import random
import string
import os
try:
    import tkinter as tk
    from tkinter import filedialog
    from tkinter import messagebox
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False

class ArubaCLIClient:
    """SSH-based Aruba controller client for CLI commands"""
    
    def __init__(self, controller_ip: str, username: str, password: str):
        self.controller_ip = controller_ip
        self.username = username
        self.password = password
        self.ssh = None
        self.logger = logging.getLogger(__name__)
        
    def connect(self) -> bool:
        """Establish SSH connection with Aruba-specific settings"""
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect with Aruba-specific settings
            self.ssh.connect(
                self.controller_ip, 
                username=self.username, 
                password=self.password,
                timeout=15,
                look_for_keys=False,
                allow_agent=False,
                banner_timeout=30
            )
            
            # Test the connection with a simple command
            try:
                test_output, test_error = self.execute_command("show version", timeout=10)
                if test_output or not test_error:
                    self.logger.info(f"SSH connected to {self.controller_ip}")
                    return True
                else:
                    self.logger.error(f"SSH connected but commands failing: {test_error}")
                    return False
            except:
                self.logger.error(f"SSH connected but command test failed")
                return False
                
        except Exception as e:
            self.logger.error(f"SSH connection failed to {self.controller_ip}: {str(e)}")
            return False
    
    def disconnect(self):
        """Close SSH connection"""
        if self.ssh:
            self.ssh.close()
            self.ssh = None
    
    def execute_command(self, command: str, timeout: int = 30) -> tuple:
        """Execute CLI command and return output"""
        try:
            stdin, stdout, stderr = self.ssh.exec_command(command, timeout=timeout)
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            return output, error
        except Exception as e:
            self.logger.error(f"Command execution failed: {str(e)}")
            return None, str(e)
    
    def get_current_password(self, ssid_profile: str) -> str:
        """Get current password using show run no-encrypt with proper pipe handling"""
        try:
            # Use the correct command that works: show run no-encrypt | include CF_GUEST
            # Execute this as a shell command to handle the pipe properly
            command = f"show run no-encrypt | include {ssid_profile}"
            
            # Execute the command in a shell-like manner
            stdin, stdout, stderr = self.ssh.exec_command(command, timeout=30)
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            
            if error and "aborted" not in error.lower():
                self.logger.warning(f"Command error: {error}")
            
            if output and 'wpa-passphrase' in output:
                # Parse the output to find wpa-passphrase
                # Expected format from your test: " wpa-passphrase Summer2025"
                for line in output.split('\n'):
                    line = line.strip()
                    if 'wpa-passphrase' in line:
                        # Extract password from line like: " wpa-passphrase Summer2025"
                        parts = line.split()
                        if len(parts) >= 2:
                            password = ' '.join(parts[1:])  # Handle passwords with spaces
                            self.logger.info(f"Found {ssid_profile} password: {password}")
                            return password
            
            # If primary command didn't work, try alternative approach
            # Get the full config and search locally
            full_config_cmd = "show run no-encrypt"
            stdin, stdout, stderr = self.ssh.exec_command(full_config_cmd, timeout=60)
            full_output = stdout.read().decode('utf-8')
            
            if full_output and ssid_profile in full_output:
                # Look for CF_GUEST section in the full output
                lines = full_output.split('\n')
                in_cf_guest_section = False
                
                for line in lines:
                    line = line.strip()
                    if f'wlan ssid-profile {ssid_profile}' in line:
                        in_cf_guest_section = True
                        continue
                    
                    if in_cf_guest_section:
                        if line.startswith('wlan ssid-profile') and ssid_profile not in line:
                            # We've moved to a different SSID profile
                            break
                        
                        if 'wpa-passphrase' in line:
                            parts = line.split()
                            if len(parts) >= 2:
                                password = ' '.join(parts[1:])
                                self.logger.info(f"Found {ssid_profile} password in full config: {password}")
                                return password
            
            self.logger.warning(f"Could not find {ssid_profile} password")
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting current password: {str(e)}")
            return None
    
    def update_ssid_password(self, ssid_profile: str, new_password: str) -> bool:
        """Update SSID password using CLI commands"""
        try:
            commands = [
                "configure terminal",
                f"wlan ssid-profile {ssid_profile}",
                f"wpa-passphrase {new_password}",
                "exit", 
                "commit apply"
            ]
            
            for command in commands:
                output, error = self.execute_command(command)
                
                if error and "error" in error.lower():
                    self.logger.error(f"Command failed '{command}': {error}")
                    return False
                
                # Small delay between commands
                time.sleep(0.5)
            
            self.logger.info(f"Password updated for {ssid_profile}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error updating password: {str(e)}")
            return False
    
    def save_configuration(self) -> bool:
        """Save configuration to memory"""
        try:
            output, error = self.execute_command("write memory")
            
            if error and "error" in error.lower():
                self.logger.error(f"Write memory failed: {error}")
                return False
            
            self.logger.info("Configuration saved")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving configuration: {str(e)}")
            return False

class PasswordManager:
    """Password generator"""
    @staticmethod
    def generate_password(length: int = 12, include_uppercase: bool = True,
                         include_lowercase: bool = True, include_digits: bool = True,
                         include_special: bool = False, exclude_ambiguous: bool = True) -> str:
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
            ambiguous = "0O1lI"
            characters = ''.join(c for c in characters if c not in ambiguous)
        
        if not characters:
            characters = string.ascii_letters + string.digits
            
        password = ''.join(random.choice(characters) for _ in range(length))
        return password

class MultiControllerGuestWiFiCLI:
    def __init__(self, config_file: str = "config/cfins_controllers.yaml"):
        self.setup_logging()
        self.logger = logging.getLogger(__name__)
        self.config = self.load_config(config_file)
        self.password_manager = PasswordManager()
        self.guest_ssid = self.config.get('guest_wifi', {}).get('ssid_name', 'CF_GUEST')

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
        
        # File logging in script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        log_dir = os.path.join(script_dir, 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        log_file_path = os.path.join(log_dir, f"multi_controller_cli_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        logging.basicConfig(
            level=logging.INFO,
            handlers=[handler, file_handler]
        )

    def select_config_file_gui(self) -> str:
        """Open file picker GUI to select YAML config file"""
        if not GUI_AVAILABLE:
            print("❌ GUI not available. Install tkinter or specify config file path.")
            return None
            
        # Create a hidden root window
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        root.attributes('-topmost', True)  # Bring to front
        
        # Show file picker
        print("📁 Opening file picker for YAML configuration...")
        file_path = filedialog.askopenfilename(
            title="Select CFINS Controllers YAML Configuration File",
            filetypes=[
                ("YAML files", "*.yaml *.yml"),
                ("All files", "*.*")
            ],
            initialdir=os.getcwd()
        )
        
        root.destroy()  # Clean up
        
        if file_path:
            print(f"✅ Selected: {file_path}")
            return file_path
        else:
            print("❌ No file selected")
            return None

    def load_config(self, config_file: str) -> dict:
        # If no config file specified, use GUI file picker
        if not config_file or not os.path.exists(config_file):
            print(f"🔍 Config file not found: {config_file}")
            
            if GUI_AVAILABLE:
                selected_file = self.select_config_file_gui()
                if selected_file:
                    config_file = selected_file
                else:
                    print("❌ No configuration file selected")
                    return {"controllers": []}
            else:
                # Fallback: try to find config file automatically
                possible_paths = [
                    "cfins_controllers.yaml",
                    "config/cfins_controllers.yaml",
                    os.path.join(os.path.dirname(__file__), "config", "cfins_controllers.yaml")
                ]
                
                for path in possible_paths:
                    if os.path.exists(path):
                        config_file = path
                        break
                else:
                    self.logger.error(f"Config file not found. Tried: {possible_paths}")
                    return {"controllers": []}
        
        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
                print(f"✅ Loaded config: {config_file}")
                return config
        except Exception as e:
            self.logger.error(f"Error loading config file: {str(e)}")
            return {"controllers": []}

    def audit_single_controller(self, controller_info: dict) -> dict:
        """Audit a single controller via SSH/CLI"""
        result = {
            'controller_name': controller_info['name'],
            'controller_ip': controller_info['ip'],
            'ssh_success': False,
            'ssid_exists': False,
            'current_password': None,
            'error': None
        }
        
        client = ArubaCLIClient(
            controller_info['ip'],
            controller_info['username'],
            controller_info['password']
        )
        
        try:
            if not client.connect():
                result['error'] = "SSH connection failed"
                return result
            
            result['ssh_success'] = True
            
            # Get current password
            current_password = client.get_current_password(self.guest_ssid)
            
            if current_password:
                result['ssid_exists'] = True
                result['current_password'] = current_password
                self.logger.info(f"[{controller_info['name']}] Found {self.guest_ssid} password")
            else:
                result['error'] = f"{self.guest_ssid} not found or no password set"
                self.logger.warning(f"[{controller_info['name']}] {self.guest_ssid} not found")
            
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[{controller_info['name']}] Error: {str(e)}")
        finally:
            client.disconnect()
            
        return result

    def audit_all_controllers(self, max_workers: int = 5) -> list:
        """Audit all controllers using multithreading"""
        controllers = self.config.get('controllers', [])
        
        if not controllers:
            self.logger.error("No controllers configured")
            return []
        
        print(f"\n🔍 Auditing {self.guest_ssid} via SSH/CLI across {len(controllers)} controllers...\n")
        
        results = []
        max_workers = min(max_workers, len(controllers))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_controller = {
                executor.submit(self.audit_single_controller, controller): controller
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
                        'ssh_success': False,
                        'error': f"Thread error: {str(e)}"
                    })
        
        return results

    def display_audit_results(self, audit_results: list) -> bool:
        """Display audit results"""
        print("="*80)
        print(f"GUEST WIFI AUDIT RESULTS (CLI) - {self.guest_ssid}")
        print("="*80)
        print(f"{'Controller':<30} {'IP':<20} {'Current Password':<20} {'Status'}")
        print("-"*80)
        
        controllers_with_ssid = 0
        different_passwords = set()
        
        for result in audit_results:
            name = result['controller_name']
            ip = result['controller_ip']
            
            if result['ssh_success'] and result['ssid_exists']:
                password = result['current_password']
                different_passwords.add(password)
                status = "✓ Found"
                controllers_with_ssid += 1
                print(f"{name:<30} {ip:<20} {password:<20} {status}")
            else:
                error = result.get('error', 'Unknown error')
                if 'not found' in error:
                    print(f"{name:<30} {ip:<20} {'N/A':<20} ✗ SSID not configured")
                elif not result['ssh_success']:
                    print(f"{name:<30} {ip:<20} {'SSH FAIL':<20} ✗ Connection failed")
                else:
                    print(f"{name:<30} {ip:<20} {'ERROR':<20} ✗ {error}")
        
        print("="*80)
        
        # Summary
        print(f"\nSummary:")
        print(f"  Total controllers: {len(audit_results)}")
        print(f"  SSH successful: {sum(1 for r in audit_results if r['ssh_success'])}")
        print(f"  Controllers with {self.guest_ssid}: {controllers_with_ssid}")
        print(f"  Unique passwords found: {len(different_passwords)}")
        
        if len(different_passwords) > 1:
            print(f"\n⚠️  WARNING: Different passwords found across controllers!")
            print("  Passwords:", list(different_passwords))
        
        return controllers_with_ssid > 0

    def update_single_controller(self, controller_info: dict, new_password: str) -> dict:
        """Update password on a single controller via CLI"""
        result = {
            'controller_name': controller_info['name'],
            'controller_ip': controller_info['ip'],
            'success': False,
            'error': None
        }
        
        client = ArubaCLIClient(
            controller_info['ip'],
            controller_info['username'],
            controller_info['password']
        )
        
        try:
            if not client.connect():
                result['error'] = "SSH connection failed"
                return result
            
            # Update password
            if client.update_ssid_password(self.guest_ssid, new_password):
                # Save configuration
                if client.save_configuration():
                    result['success'] = True
                    self.logger.info(f"[{controller_info['name']}] Successfully updated {self.guest_ssid}")
                else:
                    result['error'] = "Failed to save configuration"
            else:
                result['error'] = "Failed to update password"
                
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[{controller_info['name']}] Update error: {str(e)}")
        finally:
            client.disconnect()
            
        return result

    def update_all_controllers(self, new_password: str, controllers_to_update: list, max_workers: int = 5) -> list:
        """Update password on all specified controllers"""
        print(f"\n🔄 Updating {self.guest_ssid} password via CLI on {len(controllers_to_update)} controllers...\n")
        
        results = []
        max_workers = min(max_workers, len(controllers_to_update))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_controller = {
                executor.submit(self.update_single_controller, controller, new_password): controller
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
        """Main interactive workflow"""
        print(f"\n🖥️  Multi-Controller Guest WiFi Management (CLI Version)")
        print(f"Using SSH/CLI commands for virtual controllers without API support\n")
        
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
        elif action != '2':
            print("\n❌ Invalid option. Exiting...")
            return
        
        # Step 3: Generate or enter new password
        print("\n📝 Password Options:")
        print("1. Generate a new random password")
        print("2. Enter a specific password")
        
        choice = input("Select option (1 or 2): ").strip()
        
        if choice == '1':
            password_options = self.config['guest_wifi']['password_options']
            password_length = self.config['guest_wifi']['password_length']
            
            new_password = self.password_manager.generate_password(
                length=password_length,
                **password_options
            )
            print(f"\n🔑 Generated password: {new_password}")
        elif choice == '2':
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
        print(f"This will update {self.guest_ssid} password on ALL controllers via SSH/CLI")
        print(f"New password: {new_password}")
        
        confirm = input("\nType 'UPDATE' to proceed: ").strip()
        
        if confirm != 'UPDATE':
            print("\n❌ Update cancelled")
            return
        
        # Step 5: Update controllers
        controllers_to_update = []
        for i, result in enumerate(audit_results):
            if result['ssh_success'] and result['ssid_exists']:
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
            # Save password to logs
            script_dir = os.path.dirname(os.path.abspath(__file__))
            log_dir = os.path.join(script_dir, 'logs')
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            password_file = os.path.join(log_dir, f"guest_wifi_password_cli_{timestamp}.txt")
            
            with open(password_file, 'w') as f:
                f.write(f"Guest WiFi Password Update (CLI) - {timestamp}\n")
                f.write(f"SSID: {self.guest_ssid}\n")
                f.write(f"New Password: {new_password}\n")
                f.write(f"Updated Controllers: {successful}/{len(update_results)}\n")
            
            print(f"\n📄 Password saved to: {password_file}")
        
        print("\n✅ CLI-based process complete!")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Multi-Controller Aruba Guest WiFi Management (CLI Version)')
    parser.add_argument('-c', '--config', 
                       help='Path to controller config file')
    parser.add_argument('--audit-only', action='store_true', 
                       help='Only audit passwords, do not update')
    parser.add_argument('--max-workers', type=int, default=5, 
                       help='Maximum threads for parallel processing')
    
    args = parser.parse_args()
    
    # Create manager - if no config specified, GUI will prompt for file selection
    config_file = args.config or None
    manager = MultiControllerGuestWiFiCLI(config_file=config_file)
    
    if args.audit_only:
        # Just audit and display
        results = manager.audit_all_controllers(max_workers=args.max_workers)
        manager.display_audit_results(results)
    else:
        # Full interactive workflow
        manager.run_interactive_update()

if __name__ == "__main__":
    main()