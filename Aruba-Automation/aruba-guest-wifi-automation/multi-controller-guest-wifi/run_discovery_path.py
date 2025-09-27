#!/usr/bin/env python3
"""
Discovery script that accepts config file path as argument
"""

import paramiko
import yaml
import sys
import argparse
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
    parser = argparse.ArgumentParser(description='Discover Aruba API commands')
    parser.add_argument('config_file', nargs='?', 
                       help='Path to cfins_controllers.yaml file')
    
    args = parser.parse_args()
    
    # If no config file specified, try to find it
    config_file = args.config_file
    
    if not config_file:
        print("❌ No config file specified!")
        print("\nUsage:")
        print("  python3 run_discovery_path.py <path_to_cfins_controllers.yaml>")
        print("\nExample:")
        print("  python3 run_discovery_path.py C:/path/to/cfins_controllers.yaml")
        print("  python3 run_discovery_path.py ./cfins_controllers.yaml")
        return
    
    config_path = Path(config_file)
    
    if not config_path.exists():
        print(f"❌ Config file not found: {config_file}")
        print(f"❌ Absolute path checked: {config_path.absolute()}")
        return
    
    print(f"✅ Using config file: {config_path.absolute()}")
    
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
    
    # Commands to test for Aruba 8.6.0.7
    commands_to_test = [
        # Basic info
        "show version",
        
        # Management and API commands
        "show mgmt-server",
        "show web-server", 
        "show running-config | include mgmt",
        "show running-config | include web",
        "show running-config | include https",
        "show running-config | include api",
        
        # Network interfaces
        "show ip interface mgmt",
        "show interface mgmt",
        
        # System info
        "show system",
        "show ports"
    ]
    
    print("="*60)
    print("ARUBA 8.6.0.7 API COMMAND DISCOVERY")
    print("="*60)
    
    api_enabled_indicators = []
    
    for command in commands_to_test:
        print(f"\n🔍 {command}")
        print("-" * 50)
        
        output, error = execute_command(ssh, command)
        
        if output:
            # Check for API indicators
            output_lower = output.lower()
            api_keywords = ['mgmt-server', 'web-server', 'rest-api', 'api', 'https', '4343', 'enable', 'disable']
            
            found_keywords = [kw for kw in api_keywords if kw in output_lower]
            if found_keywords:
                api_enabled_indicators.append({
                    'command': command,
                    'keywords': found_keywords,
                    'output': output
                })
                print(f"   🎯 API KEYWORDS FOUND: {', '.join(found_keywords)}")
            
            # Show output (limited)
            lines = output.split('\n')[:3]
            for line in lines:
                print(f"   {line}")
            
            total_lines = len(output.split('\n'))
            if total_lines > 3:
                print(f"   ... ({total_lines - 3} more lines)")
        
        if error:
            print(f"   ❌ ERROR: {error}")
        
        if not output and not error:
            print("   (No output)")
    
    ssh.close()
    
    # Summary
    print("\n" + "="*60)
    print("DISCOVERY SUMMARY")
    print("="*60)
    
    if api_enabled_indicators:
        print("✅ Found API-related information:")
        for item in api_enabled_indicators:
            print(f"\n📋 Command: {item['command']}")
            print(f"   Keywords: {', '.join(item['keywords'])}")
            
            # Show relevant lines
            lines = item['output'].split('\n')
            for line in lines[:5]:
                if any(kw in line.lower() for kw in item['keywords']):
                    print(f"   🔍 {line}")
    else:
        print("❌ No clear API indicators found")
        print("   This might mean:")
        print("   - REST API is not enabled")
        print("   - Different command syntax for this version")
        print("   - Need to check web interface settings")
    
    print(f"\n✅ Discovery complete on {test_controller['name']}")

if __name__ == "__main__":
    print("\n🔧 Aruba API Command Discovery")
    print("Specify the path to your cfins_controllers.yaml file\n")
    main()