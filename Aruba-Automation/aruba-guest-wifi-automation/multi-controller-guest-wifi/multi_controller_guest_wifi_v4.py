#!/usr/bin/env python3
"""
Multi-Controller Aruba Guest WiFi Manager - Version 4
Simple approach that focuses on getting the complete command output
"""

import paramiko
import yaml
import time
import os
import getpass
from concurrent.futures import ThreadPoolExecutor, as_completed

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

def execute_simple_command(ip, username, password, command):
    """Execute a single command and return full output"""
    try:
        # Connect
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=ip, username=username, password=password, timeout=15)
        
        # Use shell for better compatibility
        shell = ssh.invoke_shell()
        time.sleep(3)  # Wait for shell to be ready
        
        # Clear initial output
        if shell.recv_ready():
            shell.recv(65535)
        
        # Send command
        shell.send(command + "\n")
        
        # Wait for command to complete
        time.sleep(4)  # Wait 4 seconds for command to complete
        
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
        ssh.close()
        
        return output
        
    except Exception as e:
        print(f"❌ Error with {ip}: {e}")
        return None

def test_single_controller(controller):
    """Test both commands on a single controller"""
    # Test CF_GUEST command
    cf_output = execute_simple_command(
        controller['ip'], 
        controller['username'], 
        controller['password'],
        "show run | in CF_GUEST"
    )
    
    # Test password command  
    pwd_output = execute_simple_command(
        controller['ip'], 
        controller['username'], 
        controller['password'],
        "show run no-encrypt | in wpa-passphrase"
    )
    
    return {
        'name': controller['name'],
        'ip': controller['ip'],
        'cf_guest_output': cf_output,
        'password_output': pwd_output
    }

def main():
    """Test script to see what's really happening"""
    print("\n" + "="*60)
    print("🔧 Multi-Controller Guest WiFi Debug Tool v4")
    print("="*60)
    print("\n🎯 This will show EXACTLY what each command returns")
    
    # Load config
    config_file = select_config_file()
    if not config_file:
        return
    
    try:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return
    
    controllers = config.get('controllers', [])
    if not controllers:
        print("❌ No controllers in configuration")
        return
    
    print(f"\n🔍 Testing all {len(controllers)} controllers in parallel...")
    
    # Run all controllers in parallel
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(test_single_controller, ctrl): ctrl for ctrl in controllers}
        
        for future in as_completed(futures):
            try:
                result = future.result()
                results.append(result)
                
                # Quick analysis
                cf_found = 'CF_GUEST' in (result['cf_guest_output'] or '')
                pwd_found = 'wpa-passphrase' in (result['password_output'] or '')
                
                if cf_found and pwd_found:
                    # Extract password
                    for line in result['password_output'].split('\n'):
                        if 'wpa-passphrase' in line and not line.strip().startswith('show'):
                            password = line.strip().split()
                            if len(password) >= 2:
                                actual_password = ' '.join(password[1:])
                                print(f"✅ {result['name']}: {actual_password}")
                                break
                    else:
                        print(f"⚠️ {result['name']}: CF_GUEST found but password parsing failed")
                elif cf_found:
                    print(f"⚠️ {result['name']}: CF_GUEST found but no wpa-passphrase")
                else:
                    print(f"❌ {result['name']}: CF_GUEST not found")
                    
            except Exception as e:
                controller = futures[future]
                print(f"❌ {controller['name']}: Thread error - {e}")
    
    # Summary
    print(f"\n📊 Summary:")
    working = [r for r in results if 'CF_GUEST' in (r['cf_guest_output'] or '') and 'wpa-passphrase' in (r['password_output'] or '')]
    print(f"  Total controllers tested: {len(results)}")
    print(f"  Controllers with CF_GUEST + password: {len(working)}")
    
    if working:
        passwords = set()
        for result in working:
            for line in result['password_output'].split('\n'):
                if 'wpa-passphrase' in line and not line.strip().startswith('show'):
                    password = line.strip().split()
                    if len(password) >= 2:
                        passwords.add(' '.join(password[1:]))
        
        print(f"  Unique passwords found: {len(passwords)}")
        print(f"  Passwords: {list(passwords)}")

if __name__ == "__main__":
    main()