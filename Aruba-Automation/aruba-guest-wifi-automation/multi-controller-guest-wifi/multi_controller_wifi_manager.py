#!/usr/bin/env python3
"""
Multi-Controller Aruba Guest WiFi Manager - Version 2
Simplified SSH approach for Aruba virtual controllers
"""

import paramiko
import yaml
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import getpass
import time
import os
import random
import string

# Simple logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class SimpleArubaSSH:
    """Simplified SSH client for Aruba controllers"""
    
    def __init__(self, ip, username, password):
        self.ip = ip
        self.username = username
        self.password = password
        self.client = None
        self.shell = None
    
    def connect(self):
        """Simple SSH connection"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Basic connection
            self.client.connect(
                hostname=self.ip,
                username=self.username,
                password=self.password,
                timeout=20,
                look_for_keys=False,
                allow_agent=False
            )
            
            # Get an interactive shell for better command handling
            self.shell = self.client.invoke_shell()
            time.sleep(2)  # Wait for shell to be ready
            
            # Clear any initial output
            if self.shell.recv_ready():
                self.shell.recv(65535)
                
            return True
            
        except Exception as e:
            logger.error(f"Connection to {self.ip} failed: {e}")
            return False
    
    def execute(self, command):
        """Execute command and get output"""
        try:
            if not self.shell:
                return None, "No shell connection"
                
            # Send command
            self.shell.send(command + '\n')
            time.sleep(2)  # Give command time to execute
            
            # Get output
            output = ""
            while self.shell.recv_ready():
                chunk = self.shell.recv(65535).decode('utf-8', errors='ignore')
                output += chunk
                time.sleep(0.1)
            
            return output, None
            
        except Exception as e:
            return None, str(e)
    
    def close(self):
        """Close SSH connection"""
        if self.shell:
            self.shell.close()
        if self.client:
            self.client.close()

def get_password_for_controller(controller_info, ssid_name):
    """Get password for a single controller"""
    result = {
        'name': controller_info['name'],
        'ip': controller_info['ip'],
        'success': False,
        'password': None,
        'error': None
    }
    
    ssh = SimpleArubaSSH(
        controller_info['ip'],
        controller_info['username'],
        controller_info['password']
    )
    
    try:
        if not ssh.connect():
            result['error'] = "SSH connection failed"
            return result
            
        # Execute the command to get CF_GUEST info
        cmd = f"show run no-encrypt | include {ssid_name}|wpa-passphrase"
        output, error = ssh.execute(cmd)
        
        if error:
            result['error'] = f"Command error: {error}"
            return result
            
        if output and ssid_name in output:
            # Parse for password
            for line in output.split('\n'):
                if 'wpa-passphrase' in line:
                    parts = line.strip().split()
                    # Find the wpa-passphrase part and get what comes after
                    for i, part in enumerate(parts):
                        if part == 'wpa-passphrase' and i + 1 < len(parts):
                            result['password'] = parts[i + 1]
                            result['success'] = True
                            logger.info(f"Found password for {controller_info['name']}")
                            break
            
            if not result['success']:
                result['error'] = f"{ssid_name} found but no password"
        else:
            result['error'] = f"{ssid_name} not found"
            
    except Exception as e:
        result['error'] = str(e)
    finally:
        ssh.close()
        
    return result

def update_password_on_controller(controller_info, ssid_name, new_password):
    """Update password on a single controller"""
    result = {
        'name': controller_info['name'],
        'ip': controller_info['ip'],
        'success': False,
        'error': None
    }
    
    ssh = SimpleArubaSSH(
        controller_info['ip'],
        controller_info['username'],
        controller_info['password']
    )
    
    try:
        if not ssh.connect():
            result['error'] = "SSH connection failed"
            return result
        
        # Commands to update password
        commands = [
            "configure terminal",
            f"wlan ssid-profile {ssid_name}",
            f"wpa-passphrase {new_password}",
            "exit",
            "commit apply",
            "write memory"
        ]
        
        for cmd in commands:
            output, error = ssh.execute(cmd)
            if error:
                result['error'] = f"Command '{cmd}' failed: {error}"
                return result
            time.sleep(1)
        
        result['success'] = True
        logger.info(f"Password updated on {controller_info['name']}")
        
    except Exception as e:
        result['error'] = str(e)
    finally:
        ssh.close()
        
    return result

def select_config_file_gui():
    """Open file picker GUI to select YAML config file - EXACT SAME AS WORKING VERSION"""
    try:
        import tkinter as tk
        from tkinter import filedialog
        
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
    except ImportError:
        print("❌ GUI not available. Install tkinter or specify config file path.")
        return None

def load_config(config_file=None):
    """Load configuration - EXACT SAME LOGIC AS WORKING VERSION"""
    # If no config file specified, use GUI file picker
    if not config_file or not os.path.exists(config_file):
        if config_file:
            print(f"🔍 Config file not found: {config_file}")
        
        selected_file = select_config_file_gui()
        if selected_file:
            config_file = selected_file
        else:
            print("❌ No configuration file selected")
            return None
    
    try:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        print(f"✅ Loaded config: {config_file}")
        return config
    except Exception as e:
        print(f"Error loading config: {e}")
        return None

def generate_password(length=12):
    """Generate a random password"""
    chars = string.ascii_letters + string.digits
    # Remove ambiguous characters
    chars = chars.replace('0', '').replace('O', '').replace('l', '').replace('I', '')
    return ''.join(random.choice(chars) for _ in range(length))

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Multi-Controller WiFi Password Manager v2')
    parser.add_argument('-c', '--config', help='Path to YAML config file')
    parser.add_argument('--audit-only', action='store_true', help='Only show passwords, no changes')
    parser.add_argument('--workers', type=int, default=5, help='Parallel workers (default: 5)')
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    if not config:
        return
        
    controllers = config.get('controllers', [])
    ssid_name = config.get('guest_wifi', {}).get('ssid_name', 'CF_GUEST')
    
    if not controllers:
        print("No controllers in configuration")
        return
    
    print(f"\n🔍 Checking {ssid_name} passwords on {len(controllers)} controllers...\n")
    
    # Audit phase - get current passwords
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(get_password_for_controller, ctrl, ssid_name): ctrl 
                  for ctrl in controllers}
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            
            # Show progress
            status = "✓" if result['success'] else "✗"
            password = result['password'] if result['success'] else result['error']
            print(f"{status} {result['name']}: {password}")
    
    # Summary
    print("\n" + "="*60)
    successful = [r for r in results if r['success']]
    print(f"Total: {len(results)}, Success: {len(successful)}, Failed: {len(results) - len(successful)}")
    
    # Get unique passwords
    passwords = set(r['password'] for r in successful)
    print(f"Unique passwords found: {len(passwords)}")
    if passwords:
        print(f"Passwords: {list(passwords)}")
    
    if args.audit_only or not successful:
        return
    
    # Update phase
    print(f"\n📝 Update Options:")
    print("1. Audit complete (exit)")
    print("2. Update all passwords")
    
    choice = input("\nChoice (1-2): ")
    if choice != '2':
        return
    
    # Get new password
    print("\n🔑 New Password:")
    print("1. Generate random")
    print("2. Enter manually")
    
    pwd_choice = input("Choice (1-2): ")
    
    if pwd_choice == '1':
        new_password = generate_password()
        print(f"Generated: {new_password}")
    else:
        new_password = getpass.getpass("New password: ")
        confirm = getpass.getpass("Confirm: ")
        if new_password != confirm:
            print("Passwords don't match!")
            return
    
    # Final confirmation
    print(f"\n⚠️  Update {ssid_name} to '{new_password}' on {len(successful)} controllers?")
    if input("Type 'YES' to confirm: ") != 'YES':
        return
    
    # Update passwords
    print(f"\n🔄 Updating passwords...\n")
    
    update_results = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        # Only update controllers where we found the SSID
        controllers_to_update = [ctrl for ctrl in controllers 
                               if any(r['ip'] == ctrl['ip'] and r['success'] for r in results)]
        
        futures = {executor.submit(update_password_on_controller, ctrl, ssid_name, new_password): ctrl 
                  for ctrl in controllers_to_update}
        
        for future in as_completed(futures):
            result = future.result()
            update_results.append(result)
            
            # Show progress
            status = "✓" if result['success'] else "✗"
            msg = "Updated" if result['success'] else result['error']
            print(f"{status} {result['name']}: {msg}")
    
    # Final summary
    print("\n" + "="*60)
    updated = len([r for r in update_results if r['success']])
    print(f"✅ Successfully updated: {updated}/{len(update_results)}")
    
    # Save password record
    if updated > 0:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        script_dir = os.path.dirname(os.path.abspath(__file__))
        log_dir = os.path.join(script_dir, 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(log_dir, f'wifi_password_{timestamp}.txt')
        with open(log_file, 'w') as f:
            f.write(f"WiFi Password Update - {timestamp}\n")
            f.write(f"SSID: {ssid_name}\n")
            f.write(f"New Password: {new_password}\n")
            f.write(f"Updated: {updated}/{len(update_results)} controllers\n")
        
        print(f"📄 Password saved: {log_file}")

if __name__ == "__main__":
    main()