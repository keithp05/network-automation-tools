#!/usr/bin/env python3
"""
Check if credentials are configured in the CFINS config file
"""

import yaml
from pathlib import Path

def check_config():
    config_path = Path('config/cfins_controllers.yaml')
    
    if not config_path.exists():
        print("❌ Config file not found: config/cfins_controllers.yaml")
        return False
    
    print("✅ Config file found")
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    controllers = config.get('controllers', [])
    print(f"📊 Found {len(controllers)} controllers configured")
    
    # Check if credentials are configured
    if controllers:
        first_controller = controllers[0]
        username = first_controller.get('username', '')
        password = first_controller.get('password', '')
        
        print(f"\n🔍 First controller: {first_controller['name']}")
        print(f"   IP: {first_controller['ip']}")
        print(f"   Username: {username}")
        
        if username == "YOUR_USERNAME" or password == "YOUR_PASSWORD":
            print("\n❌ CREDENTIALS NOT CONFIGURED!")
            print("\nTo configure credentials:")
            print("1. Edit config/cfins_controllers.yaml")
            print("2. Replace 'YOUR_USERNAME' with actual SSH username")
            print("3. Replace 'YOUR_PASSWORD' with actual SSH password")
            print("\nExample:")
            print("   username: \"admin\"")
            print("   password: \"your_actual_password\"")
            return False
        else:
            print(f"   Password: {'*' * len(password)}")
            print("\n✅ Credentials appear to be configured")
            return True
    
    return False

if __name__ == "__main__":
    print("🔧 CFINS Credentials Checker\n")
    configured = check_config()
    
    if configured:
        print("\n🎉 Ready to run API discovery script!")
        print("Run: python3 find_api_commands.py")
    else:
        print("\n⚠️  Configure credentials first before running API scripts")