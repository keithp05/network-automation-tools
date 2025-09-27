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
        
        print(f"🔧 Sending command to {ip}: {command}")
        
        # Send command
        shell.send(command + "\n")
        
        # Wait much longer and collect ALL output
        time.sleep(8)  # Wait 8 seconds for command to complete
        
        output = ""
        attempts = 0
        while attempts < 30:  # Try for 15 seconds total
            if shell.recv_ready():
                chunk = shell.recv(65535).decode('utf-8', errors='ignore')
                output += chunk
                print(f"📥 Received chunk from {ip}: {repr(chunk[:50])}...")
            else:
                time.sleep(0.5)
                attempts += 1
                # If no data for a while, try sending enter to get prompt
                if attempts % 10 == 0:
                    shell.send("\n")
                    time.sleep(1)
        
        shell.close()
        ssh.close()
        
        print(f"📋 Full output from {ip}:")
        print(f"{'='*60}")
        print(output)
        print(f"{'='*60}")
        
        return output
        
    except Exception as e:
        print(f"❌ Error with {ip}: {e}")
        return None

def test_single_controller(controller):
    """Test both commands on a single controller"""
    print(f"\n🔍 Testing {controller['name']} ({controller['ip']})...")
    
    # Test CF_GUEST command
    print(f"\n1️⃣ Testing: show run | in CF_GUEST")
    cf_output = execute_simple_command(
        controller['ip'], 
        controller['username'], 
        controller['password'],
        "show run | in CF_GUEST"
    )
    
    # Test password command  
    print(f"\n2️⃣ Testing: show run no-encrypt | in wpa-passphrase")
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
    
    # Test just the first controller to see what's happening
    first_controller = controllers[0]
    result = test_single_controller(first_controller)
    
    print(f"\n📊 Analysis for {result['name']}:")
    
    if result['cf_guest_output']:
        if 'CF_GUEST' in result['cf_guest_output']:
            print("✅ CF_GUEST found in output")
        else:
            print("❌ CF_GUEST NOT found in output")
    
    if result['password_output']:
        if 'wpa-passphrase' in result['password_output']:
            print("✅ wpa-passphrase found in output")
            # Try to extract password
            for line in result['password_output'].split('\n'):
                if 'wpa-passphrase' in line and not line.strip().startswith('show'):
                    print(f"🔑 Password line: {line.strip()}")
        else:
            print("❌ wpa-passphrase NOT found in output")

if __name__ == "__main__":
    main()