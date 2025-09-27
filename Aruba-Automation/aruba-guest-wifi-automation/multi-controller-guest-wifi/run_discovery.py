#!/usr/bin/env python3
"""
Non-interactive version of the API discovery script
"""

import paramiko
import yaml
from pathlib import Path

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
    
    # Load config
    config_path = Path("config/cfins_controllers.yaml")
    if not config_path.exists():
        print("❌ Config file not found: config/cfins_controllers.yaml")
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
    
    # SSH connection
    ssh = ssh_connect(
        test_controller['ip'],
        test_controller['username'], 
        test_controller['password']
    )
    
    if not ssh:
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
        
        # Interface info
        "show ip interface mgmt",
    ]
    
    print("="*60)
    print("COMMAND TEST RESULTS")
    print("="*60)
    
    for command in commands_to_test:
        print(f"\n🔍 Testing: {command}")
        print("-" * 40)
        
        output, error = execute_command(ssh, command)
        
        if output:
            # Limit output to first 5 lines for readability
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
    print("\n✅ Command testing complete")

if __name__ == "__main__":
    print("\n🔧 Aruba API Command Discovery")
    print("Testing commands on first CFINS controller...\n")
    main()