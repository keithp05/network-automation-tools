#!/usr/bin/env python3
"""
Multi-Controller Aruba Guest WiFi Password Management - Version 3
Fresh start - ready for you to point me to working reference code
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
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False

def select_config_file():
    """Open file picker to select YAML config"""
    if not GUI_AVAILABLE:
        print("❌ GUI not available")
        return None
        
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    print("📁 Opening file picker...")
    file_path = filedialog.askopenfilename(
        title="Select CFINS Controllers YAML Configuration",
        filetypes=[("YAML files", "*.yaml *.yml"), ("All files", "*.*")],
        initialdir=os.getcwd()
    )
    
    root.destroy()
    
    if file_path:
        print(f"✅ Selected: {file_path}")
        return file_path
    else:
        print("❌ No file selected")
        return None

def load_config(config_file=None):
    """Load YAML configuration"""
    if not config_file:
        config_file = select_config_file()
        if not config_file:
            return None
    
    try:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        print(f"✅ Loaded config: {config_file}")
        return config
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return None

class ArubaController:
    """SSH client for Aruba controllers"""
    
    def __init__(self, ip, username, password, name):
        self.ip = ip
        self.username = username  
        self.password = password
        self.name = name
        self.ssh = None
    
    def connect(self):
        """Connect via SSH"""
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                hostname=self.ip,
                username=self.username,
                password=self.password,
                timeout=15
            )
            return True
        except Exception as e:
            print(f"❌ SSH failed to {self.name} ({self.ip}): {e}")
            return False
    
    def execute_command(self, command):
        """Execute command via shell using v4 working approach"""
        try:
            # Use invoke_shell since exec_command is blocked
            shell = self.ssh.invoke_shell()
            time.sleep(3)  # Wait for shell to be ready
            
            # Clear any initial output
            if shell.recv_ready():
                shell.recv(65535)
            
            # Send command
            shell.send(command + "\n")
            
            # Wait for command to complete (v4 timing)
            time.sleep(4)  # Wait 4 seconds for command to complete
            
            # Collect output (v4 approach)
            output = ""
            attempts = 0
            while attempts < 20:  # Try for 10 seconds total
                if shell.recv_ready():
                    chunk = shell.recv(65535).decode('utf-8', errors='ignore')
                    output += chunk
                else:
                    time.sleep(0.5)
                    attempts += 1
                    # If no data for a while, try sending enter to get prompt
                    if attempts % 8 == 0:
                        shell.send("\n")
                        time.sleep(1)
            
            shell.close()
            return output, None
            
        except Exception as e:
            return None, str(e)
    
    def get_passwords(self):
        """Get current wpa-passphrase using: show run no-encrypt | in wpa-passphrase"""
        output, error = self.execute_command("show run no-encrypt | in wpa-passphrase")
        return output, error
    
    def get_cf_guest_config(self):
        """Get CF_GUEST config using: show run | in CF_GUEST"""
        output, error = self.execute_command("show run | in CF_GUEST")
        return output, error
    
    def update_password(self, new_password):
        """Update CF_GUEST password using shell session with detailed logging"""
        try:
            print(f"🔧 {self.name}: Starting password update to '{new_password}'")
            
            # Use one shell session for all commands
            shell = self.ssh.invoke_shell()
            time.sleep(3)  # Wait for shell to be ready
            
            # Clear initial output
            if shell.recv_ready():
                shell.recv(65535)
            
            commands = [
                "configure terminal",
                "wlan ssid-profile CF_GUEST", 
                f"wpa-passphrase {new_password}",
                "exit",
                "commit apply",
                "write memory"  # Save configuration
            ]
            
            # Send all commands through same shell with status updates
            for i, cmd in enumerate(commands, 1):
                print(f"   📝 {self.name}: Step {i}/{len(commands)}: {cmd}")
                shell.send(cmd + "\n")
                time.sleep(3)  # Wait between commands
                
                # Collect and check output
                output = ""
                attempts = 0
                while attempts < 10:  # Wait up to 5 seconds for response
                    if shell.recv_ready():
                        chunk = shell.recv(65535).decode('utf-8', errors='ignore')
                        output += chunk
                    time.sleep(0.5)
                    attempts += 1
                
                # Check for errors in output
                if output and ("error" in output.lower() or "invalid" in output.lower() or "failed" in output.lower()):
                    print(f"   ❌ {self.name}: Command failed: {cmd}")
                    print(f"      Output: {output.strip()}")
                    shell.close()
                    return False, f"Command '{cmd}' failed: {output}"
                else:
                    print(f"   ✅ {self.name}: Step {i} completed")
            
            shell.close()
            print(f"🎉 {self.name}: Password update completed successfully!")
            return True, "Password updated successfully"
            
        except Exception as e:
            print(f"❌ {self.name}: Error during update: {str(e)}")
            return False, f"Shell error: {str(e)}"
    
    def disconnect(self):
        """Close SSH connection"""
        if self.ssh:
            self.ssh.close()

def audit_controller(controller_info):
    """Audit a single controller"""
    ctrl = ArubaController(
        controller_info['ip'],
        controller_info['username'], 
        controller_info['password'],
        controller_info['name']
    )
    
    result = {
        'name': controller_info['name'],
        'ip': controller_info['ip'],
        'connected': False,
        'cf_guest_exists': False,
        'current_password': None,
        'error': None
    }
    
    try:
        if not ctrl.connect():
            result['error'] = "SSH connection failed"
            return result
        
        result['connected'] = True
        
        # Check CF_GUEST config first
        cf_guest_output, cf_error = ctrl.get_cf_guest_config()
        
        if cf_guest_output and "CF_GUEST" in cf_guest_output:
            result['cf_guest_exists'] = True
            
            # Get password
            pwd_output, pwd_error = ctrl.get_passwords()
            
            if pwd_output and "wpa-passphrase" in pwd_output:
                # Extract password using v4 working approach
                for line in pwd_output.split('\n'):
                    if 'wpa-passphrase' in line and not line.strip().startswith('show'):
                        password = line.strip().split()
                        if len(password) >= 2:
                            result['current_password'] = ' '.join(password[1:])
                            break
        else:
            result['error'] = "CF_GUEST not configured"
            
    except Exception as e:
        result['error'] = str(e)
    finally:
        ctrl.disconnect()
    
    return result

def update_controller(controller_info, new_password):
    """Update password on a single controller"""
    ctrl = ArubaController(
        controller_info['ip'],
        controller_info['username'], 
        controller_info['password'],
        controller_info['name']
    )
    
    result = {
        'name': controller_info['name'],
        'ip': controller_info['ip'],
        'success': False,
        'error': None
    }
    
    try:
        if not ctrl.connect():
            result['error'] = "SSH connection failed"
            return result
        
        success, message = ctrl.update_password(new_password)
        result['success'] = success
        if not success:
            result['error'] = message
            
    except Exception as e:
        result['error'] = str(e)
    finally:
        ctrl.disconnect()
    
    return result

def main():
    """Main function with correct Aruba commands"""
    print("\n" + "="*60)
    print("🔧 Multi-Controller Guest WiFi Manager v3")
    print("="*60)
    print("\n📋 Using correct Aruba commands:")
    print("   📖 show run no-encrypt | in wpa-passphrase")
    print("   📖 show run | in CF_GUEST") 
    print("   🔧 configure terminal → wlan ssid-profile CF_GUEST → wpa-passphrase [new_password]")
    
    # Load config
    config = load_config()
    if not config:
        return
    
    controllers = config.get('controllers', [])
    if not controllers:
        print("❌ No controllers in configuration")
        return
    
    print(f"\n🔍 Auditing CF_GUEST on {len(controllers)} controllers...\n")
    
    # Audit all controllers
    audit_results = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(audit_controller, ctrl): ctrl for ctrl in controllers}
        
        for future in as_completed(futures):
            result = futures[future]
            audit_result = future.result()
            audit_results.append(audit_result)
            
            # Show progress
            name = audit_result['name']
            if audit_result['connected'] and audit_result['cf_guest_exists']:
                password = audit_result['current_password'] or "No password"
                print(f"✅ {name}: {password}")
            else:
                error = audit_result['error'] or "Unknown error"
                print(f"❌ {name}: {error}")
    
    # Display summary
    print("\n" + "="*60)
    print("AUDIT RESULTS")
    print("="*60)
    
    working_controllers = [r for r in audit_results if r['connected'] and r['cf_guest_exists']]
    passwords = set(r['current_password'] for r in working_controllers if r['current_password'])
    
    print(f"Total controllers: {len(controllers)}")
    print(f"Working with CF_GUEST: {len(working_controllers)}")
    print(f"Unique passwords: {len(passwords)}")
    if passwords:
        print(f"Current passwords: {list(passwords)}")
    
    if not working_controllers:
        print("❌ No working controllers found")
        return
    
    # Ask what to do
    print(f"\n📋 Options:")
    print("1. Audit only (exit)")
    print("2. Update passwords")
    
    choice = input("\nChoice (1-2): ").strip()
    if choice != '2':
        return
    
    # Get new password
    print("\n🔑 Password Entry:")
    new_password = input("Enter new password (will be visible): ")
    confirm = input("Confirm password: ")
    
    if new_password != confirm:
        print("❌ Passwords don't match")
        return
    
    # Show what will be applied
    print(f"\n📋 Password to be applied: '{new_password}'")
    print(f"🎯 Target controllers: {len(working_controllers)}")
    
    # Final confirmation
    print(f"\n⚠️  Update CF_GUEST password on {len(working_controllers)} controllers?")
    if input("Type 'YES' to confirm: ") != 'YES':
        return
    
    # Update passwords
    print(f"\n🔄 Updating passwords...\n")
    
    update_results = []
    controllers_to_update = [ctrl for ctrl in controllers 
                           if any(r['ip'] == ctrl['ip'] and r['connected'] and r['cf_guest_exists'] 
                                 for r in audit_results)]
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(update_controller, ctrl, new_password): ctrl 
                  for ctrl in controllers_to_update}
        
        for future in as_completed(futures):
            result = future.result()
            update_results.append(result)
            
            # Final status for each controller (detailed progress shown in update_password method)
            name = result['name']
            if result['success']:
                print(f"\n🎯 {name}: ✅ COMPLETE")
            else:
                error = result['error'] or "Unknown error"
                print(f"\n🎯 {name}: ❌ FAILED - {error}")
    
    # Final summary
    successful = len([r for r in update_results if r['success']])
    print(f"\n✅ Successfully updated: {successful}/{len(update_results)} controllers")
    
    if successful > 0:
        # Save password record
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = f"wifi_password_update_{timestamp}.txt"
        with open(log_file, 'w') as f:
            f.write(f"WiFi Password Update - {timestamp}\n")
            f.write(f"New Password: {new_password}\n")
            f.write(f"Updated: {successful}/{len(update_results)} controllers\n")
        print(f"📄 Password saved: {log_file}")

if __name__ == "__main__":
    main()