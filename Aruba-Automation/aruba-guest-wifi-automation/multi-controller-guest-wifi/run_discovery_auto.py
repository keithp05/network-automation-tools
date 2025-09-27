#!/usr/bin/env python3
"""
Auto-finding version of the API discovery script
"""

import paramiko
import yaml
import os
from pathlib import Path

def find_config_file():
    """Find the cfins_controllers.yaml file in various locations"""
    possible_paths = [
        "config/cfins_controllers.yaml",
        "cfins_controllers.yaml", 
        "../config/cfins_controllers.yaml",
        "../../config/cfins_controllers.yaml"
    ]
    
    # Also search in current directory and subdirectories
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file == 'cfins_controllers.yaml':
                possible_paths.append(os.path.join(root, file))
    
    for path in possible_paths:
        config_path = Path(path)
        if config_path.exists():
            print(f"✅ Found config file: {config_path.absolute()}")
            return config_path
    
    print("❌ Config file 'cfins_controllers.yaml' not found!")
    print("Searched in:")
    for path in possible_paths[:4]:  # Show first 4 standard paths
        print(f"  - {path}")
    return None

def ssh_connect(hostname, username, password):
    """Create SSH connection"""
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname, username=username, password=password, timeout=10)
        return ssh
    except Exception as e:
        print(f"SSH connection failed: {e}")
        return None

def execute_command(ssh, command):
    """Execute command and return output"""
    try:
        stdin, stdout, stderr = ssh.exec_command(command, timeout=30)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        return output, error
    except Exception as e:
        return None, str(e)

def main():
    """Test various commands to find API-related ones"""
    
    # Find config file
    config_path = find_config_file()
    if not config_path:
        return
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    controllers = config.get('controllers', [])
    if not controllers:
        print("❌ No controllers in config")
        return
    
    # Use first controller for testing
    test_controller = controllers[0]
    print(f"🔍 Testing commands on: {test_controller['name']} ({test_controller['ip']})")
    print(f"📝 Username: {test_controller['username']}")
    
    # SSH connection
    ssh = ssh_connect(
        test_controller['ip'],
        test_controller['username'], 
        test_controller['password']
    )
    
    if not ssh:
        print("\n❌ SSH connection failed. Check:")
        print("  - Network connectivity to controller")
        print("  - SSH is enabled on controller") 
        print("  - Credentials are correct")
        print("  - Controller is reachable from your network")
        return
    
    print("✅ SSH connected successfully\n")
    
    # Commands to test
    commands_to_test = [
        # Basic info
        "show version",
        
        # Web/API related commands  
        "show mgmt-server",
        "show web-server", 
        "show running-config | include mgmt-server",
        "show running-config | include web-server",
        "show running-config | include rest-api",
        "show running-config | include api",
        "show running-config | include https",
        
        # Interface info
        "show ip interface mgmt",
        "show ip interface brief",
    ]
    
    print("="*60)
    print("COMMAND TEST RESULTS")
    print("="*60)
    
    api_commands_found = []
    
    for command in commands_to_test:
        print(f"\n🔍 Testing: {command}")
        print("-" * 40)
        
        output, error = execute_command(ssh, command)
        
        if output:
            # Look for API-related keywords
            output_lower = output.lower()
            if any(keyword in output_lower for keyword in ['api', 'mgmt', 'web-server', 'https', '4343']):
                api_commands_found.append(command)
                print("   🎯 API-RELATED OUTPUT FOUND!")
            
            # Show first few lines
            lines = output.split('\n')[:5]
            for line in lines:
                print(f"   {line}")
            total_lines = len(output.split('\n'))
            if total_lines > 5:
                print(f"   ... ({total_lines - 5} more lines)")
        
        if error:
            print(f"   ERROR: {error}")
        
        if not output and not error:
            print("   No output")
    
    ssh.close()
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if api_commands_found:
        print("✅ Commands that returned API-related info:")
        for cmd in api_commands_found:
            print(f"  - {cmd}")
    else:
        print("❌ No API-related commands found")
    
    print("\n✅ Command testing complete")

if __name__ == "__main__":
    print("\n🔧 Aruba API Command Discovery (Auto-Config)")
    print("Searching for config file and testing commands...\n")
    main()