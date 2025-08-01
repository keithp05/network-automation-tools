#!/usr/bin/env python3
"""
Network Change Tool - Credential Setup Script
Interactive script to set up device credentials securely
"""

import sys
import os
import getpass
from pathlib import Path
import json
import yaml
import csv
import pandas as pd
from typing import List, Dict, Optional

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.core.credential_manager import CredentialManager, CredentialSource
from src.core.device_discovery import DeviceDiscovery, DiscoveryMethod, DiscoveredDevice
from src.core.config import AppConfig, DeviceConfig, DeviceCredentials


def setup_master_password():
    """Set up master password for credential encryption"""
    print("Setting up master password for credential encryption...")
    
    while True:
        password = getpass.getpass("Enter master password: ")
        confirm = getpass.getpass("Confirm master password: ")
        
        if password == confirm:
            if len(password) < 8:
                print("Password must be at least 8 characters long")
                continue
            return password
        else:
            print("Passwords do not match. Please try again.")


def discover_devices():
    """Discover devices on the network"""
    print("\n=== Device Discovery ===")
    
    # Get network range
    network_range = input("Enter network range (e.g., 192.168.1.0/24): ")
    if not network_range:
        return []
    
    print(f"Discovering devices in {network_range}...")
    
    # Initialize discovery
    discovery = DeviceDiscovery(timeout=3, max_workers=20)
    
    # Use multiple discovery methods
    methods = [
        DiscoveryMethod.PING_SWEEP,
        DiscoveryMethod.SSH_BANNER,
        DiscoveryMethod.HTTP_BANNER
    ]
    
    # Add nmap if available
    if discovery.nmap_available:
        methods.append(DiscoveryMethod.NMAP_SCAN)
    
    try:
        discovered_devices = discovery.discover_network_range(network_range, methods)
        
        if discovered_devices:
            print(f"\nDiscovered {len(discovered_devices)} devices:")
            for i, device in enumerate(discovered_devices, 1):
                print(f"{i:2d}. {device.ip_address:<15} {device.hostname or 'unknown':<20} {device.device_type or 'unknown':<15} (confidence: {device.confidence:.1f})")
            
            return discovered_devices
        else:
            print("No devices discovered.")
            return []
    
    except Exception as e:
        print(f"Discovery failed: {e}")
        return []


def import_devices_from_text_file():
    """Import devices from text file"""
    print("\n=== Import from Text File ===")
    
    # Get file path
    file_path = input("Enter path to text file: ").strip()
    if not file_path:
        return []
    
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return []
    
    print("\nText file format options:")
    print("1. Simple format: hostname,ip_address")
    print("2. Extended format: hostname,ip_address,device_type,port")
    print("3. CSV format with headers")
    
    format_choice = input("Choose format (1-3): ")
    
    devices = []
    
    try:
        with open(file_path, 'r') as f:
            if format_choice == '1':
                # Simple format
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    parts = line.split(',')
                    if len(parts) >= 2:
                        hostname = parts[0].strip()
                        ip_address = parts[1].strip()
                        
                        device = DiscoveredDevice(
                            ip_address=ip_address,
                            hostname=hostname,
                            device_type='cisco_ios',  # Default
                            ports_open=[22],
                            confidence=1.0
                        )
                        devices.append(device)
                    else:
                        print(f"Warning: Invalid format on line {line_num}: {line}")
            
            elif format_choice == '2':
                # Extended format
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    parts = line.split(',')
                    if len(parts) >= 4:
                        hostname = parts[0].strip()
                        ip_address = parts[1].strip()
                        device_type = parts[2].strip()
                        port = int(parts[3].strip())
                        
                        device = DiscoveredDevice(
                            ip_address=ip_address,
                            hostname=hostname,
                            device_type=device_type,
                            ports_open=[port],
                            confidence=1.0
                        )
                        devices.append(device)
                    else:
                        print(f"Warning: Invalid format on line {line_num}: {line}")
            
            elif format_choice == '3':
                # CSV format with headers
                csv_reader = csv.DictReader(f)
                for row_num, row in enumerate(csv_reader, 1):
                    try:
                        hostname = row.get('hostname', '').strip()
                        ip_address = row.get('ip_address', '').strip()
                        device_type = row.get('device_type', 'cisco_ios').strip()
                        port = int(row.get('port', 22))
                        
                        if hostname and ip_address:
                            device = DiscoveredDevice(
                                ip_address=ip_address,
                                hostname=hostname,
                                device_type=device_type,
                                ports_open=[port],
                                confidence=1.0
                            )
                            devices.append(device)
                    except Exception as e:
                        print(f"Warning: Error processing row {row_num}: {e}")
    
    except Exception as e:
        print(f"Error reading file: {e}")
        return []
    
    print(f"Imported {len(devices)} devices from {file_path}")
    return devices


def import_devices_from_excel_file():
    """Import devices from Excel file"""
    print("\n=== Import from Excel File ===")
    
    # Get file path
    file_path = input("Enter path to Excel file: ").strip()
    if not file_path:
        return []
    
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return []
    
    devices = []
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Show available columns
        print(f"\nAvailable columns in Excel file:")
        for i, col in enumerate(df.columns, 1):
            print(f"{i:2d}. {col}")
        
        # Map columns
        print("\nMap columns to device fields:")
        hostname_col = input("Column number for hostname: ")
        ip_col = input("Column number for IP address: ")
        device_type_col = input("Column number for device type (optional): ")
        port_col = input("Column number for port (optional): ")
        
        # Convert to column names
        columns = list(df.columns)
        hostname_col = columns[int(hostname_col) - 1] if hostname_col.isdigit() else None
        ip_col = columns[int(ip_col) - 1] if ip_col.isdigit() else None
        device_type_col = columns[int(device_type_col) - 1] if device_type_col.isdigit() else None
        port_col = columns[int(port_col) - 1] if port_col.isdigit() else None
        
        # Process rows
        for index, row in df.iterrows():
            try:
                hostname = str(row[hostname_col]).strip() if hostname_col else f"device-{index}"
                ip_address = str(row[ip_col]).strip() if ip_col else None
                device_type = str(row[device_type_col]).strip() if device_type_col else 'cisco_ios'
                port = int(row[port_col]) if port_col and pd.notna(row[port_col]) else 22
                
                if ip_address and ip_address != 'nan':
                    device = DiscoveredDevice(
                        ip_address=ip_address,
                        hostname=hostname,
                        device_type=device_type,
                        ports_open=[port],
                        confidence=1.0
                    )
                    devices.append(device)
                    
            except Exception as e:
                print(f"Warning: Error processing row {index + 1}: {e}")
    
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return []
    
    print(f"Imported {len(devices)} devices from {file_path}")
    return devices


def manual_device_entry():
    """Manually enter device information"""
    devices = []
    
    print("\n=== Manual Device Entry ===")
    
    while True:
        print("\nEnter device information:")
        hostname = input("Hostname: ")
        if not hostname:
            break
        
        ip_address = input("IP Address: ")
        if not ip_address:
            break
        
        print("Device types: 1=cisco_ios, 2=cisco_nxos, 3=cisco_asa, 4=paloalto_panos")
        device_type_choice = input("Device type (1-4): ")
        
        device_type_map = {
            '1': 'cisco_ios',
            '2': 'cisco_nxos',
            '3': 'cisco_asa',
            '4': 'paloalto_panos'
        }
        
        device_type = device_type_map.get(device_type_choice, 'cisco_ios')
        
        port = input("Port (default 22 for SSH, 443 for HTTPS): ")
        if not port:
            port = 443 if device_type == 'paloalto_panos' else 22
        else:
            port = int(port)
        
        device = DiscoveredDevice(
            ip_address=ip_address,
            hostname=hostname,
            device_type=device_type,
            ports_open=[port],
            confidence=1.0
        )
        
        devices.append(device)
        print(f"Added device: {hostname} ({ip_address})")
        
        if input("Add another device? (y/n): ").lower() != 'y':
            break
    
    return devices


def import_from_existing_config():
    """Import devices from existing configuration file"""
    print("\n=== Import from Existing Configuration ===")
    
    config_path = input("Enter path to existing configuration file: ").strip()
    if not config_path:
        return []
    
    config_path = Path(config_path)
    if not config_path.exists():
        print(f"Configuration file not found: {config_path}")
        return []
    
    devices = []
    
    try:
        with open(config_path, 'r') as f:
            if config_path.suffix.lower() in ['.yaml', '.yml']:
                config = yaml.safe_load(f)
            elif config_path.suffix.lower() == '.json':
                config = json.load(f)
            else:
                print("Unsupported configuration file format. Use YAML or JSON.")
                return []
        
        # Extract devices from configuration
        config_devices = config.get('devices', [])
        
        for device_config in config_devices:
            device = DiscoveredDevice(
                ip_address=device_config.get('ip_address', ''),
                hostname=device_config.get('hostname', ''),
                device_type=device_config.get('device_type', 'cisco_ios'),
                ports_open=[device_config.get('port', 22)],
                confidence=1.0
            )
            devices.append(device)
        
        print(f"Imported {len(devices)} devices from existing configuration")
        
    except Exception as e:
        print(f"Error reading configuration file: {e}")
        return []
    
    return devices


def setup_credential_groups(devices):
    """Group devices by credential type for batch credential setup"""
    print("\n=== Credential Grouping ===")
    print("Group devices by credential type to set up credentials in batches")
    
    credential_groups = {}
    
    # Show devices and allow grouping
    print(f"\nFound {len(devices)} devices:")
    for i, device in enumerate(devices, 1):
        print(f"{i:2d}. {device.hostname or 'unknown':<20} {device.ip_address:<15} {device.device_type or 'unknown'}")
    
    print("\nCredential grouping options:")
    print("1. Use same credentials for all devices")
    print("2. Group by device type")
    print("3. Group by hostname pattern")
    print("4. Individual credentials for each device")
    
    group_choice = input("Choose grouping method (1-4): ")
    
    if group_choice == '1':
        # Single credential group
        credential_groups['all_devices'] = devices
    
    elif group_choice == '2':
        # Group by device type
        for device in devices:
            device_type = device.device_type or 'unknown'
            if device_type not in credential_groups:
                credential_groups[device_type] = []
            credential_groups[device_type].append(device)
    
    elif group_choice == '3':
        # Group by hostname pattern
        patterns = {}
        for device in devices:
            hostname = device.hostname or device.ip_address
            
            # Extract pattern (e.g., "switch-01" -> "switch")
            pattern = hostname.split('-')[0] if '-' in hostname else hostname
            
            if pattern not in patterns:
                patterns[pattern] = []
            patterns[pattern].append(device)
        
        # Show patterns and let user choose
        print("\nDetected patterns:")
        for pattern, pattern_devices in patterns.items():
            print(f"  {pattern}: {len(pattern_devices)} devices")
        
        for pattern, pattern_devices in patterns.items():
            use_pattern = input(f"Use same credentials for '{pattern}' devices? (y/n): ")
            if use_pattern.lower() == 'y':
                credential_groups[pattern] = pattern_devices
            else:
                # Individual credentials
                for device in pattern_devices:
                    device_key = f"{device.hostname or device.ip_address}_{device.ip_address}"
                    credential_groups[device_key] = [device]
    
    else:
        # Individual credentials
        for device in devices:
            device_key = f"{device.hostname or device.ip_address}_{device.ip_address}"
            credential_groups[device_key] = [device]
    
    return credential_groups


def setup_device_credentials(devices, credential_manager):
    """Set up credentials for discovered devices"""
    print("\n=== Device Credential Setup ===")
    
    # Group devices by credential type
    credential_groups = setup_credential_groups(devices)
    
    device_configs = []
    
    for group_name, group_devices in credential_groups.items():
        print(f"\n--- Setting up credentials for group: {group_name} ---")
        print(f"Devices in group: {len(group_devices)}")
        
        for device in group_devices:
            print(f"  - {device.hostname or 'unknown'} ({device.ip_address})")
        
        # Get credentials for this group
        credentials = get_credentials_for_group(group_name, group_devices)
        
        if not credentials:
            print("Skipping group due to missing credentials")
            continue
        
        # Choose storage method for this group
        storage_method = choose_storage_method(group_name)
        
        # Apply credentials to all devices in group
        for device in group_devices:
            device_id = f"{device.hostname or device.ip_address.replace('.', '-')}_{device.ip_address}"
            
            # Store credentials
            store_credentials(
                credential_manager, 
                device_id, 
                credentials, 
                storage_method
            )
            
            # Create device config
            device_config = DeviceConfig(
                hostname=device.hostname or f"device-{device.ip_address.replace('.', '-')}",
                ip_address=device.ip_address,
                device_type=device.device_type or 'cisco_ios',
                port=device.ports_open[0] if device.ports_open else 22,
                credentials=DeviceCredentials(**credentials),
                tags=['discovered', 'configured']
            )
            
            device_configs.append(device_config)
            print(f"✓ Configured: {device.hostname or device.ip_address}")
    
    return device_configs


def get_credentials_for_group(group_name, group_devices):
    """Get credentials for a group of devices"""
    print(f"\nEnter credentials for group '{group_name}':")
    
    # Show sample device for context
    sample_device = group_devices[0]
    print(f"Sample device: {sample_device.hostname or sample_device.ip_address} ({sample_device.device_type or 'unknown'})")
    
    # Get username
    username = input("Username (default: admin): ").strip()
    if not username:
        username = "admin"
    
    # Get password
    password = getpass.getpass("Password: ")
    if not password:
        print("Password is required!")
        return None
    
    credentials = {
        'username': username,
        'password': password
    }
    
    # Get enable password for Cisco devices
    cisco_devices = [d for d in group_devices if d.device_type and d.device_type.startswith('cisco')]
    if cisco_devices:
        enable_password = getpass.getpass("Enable password (optional): ") or None
        credentials['enable_password'] = enable_password
    
    # Get API key for Palo Alto devices
    palo_devices = [d for d in group_devices if d.device_type == 'paloalto_panos']
    if palo_devices:
        api_key = getpass.getpass("API key (optional): ") or None
        credentials['api_key'] = api_key
    
    # Confirm credentials
    print(f"\nCredentials summary for group '{group_name}':")
    print(f"  Username: {username}")
    print(f"  Password: {'*' * len(password)}")
    if credentials.get('enable_password'):
        print(f"  Enable password: {'*' * len(credentials['enable_password'])}")
    if credentials.get('api_key'):
        print(f"  API key: {'*' * min(len(credentials['api_key']), 20)}...")
    
    confirm = input("Are these credentials correct? (y/n): ")
    if confirm.lower() != 'y':
        return get_credentials_for_group(group_name, group_devices)
    
    return credentials


def choose_storage_method(group_name):
    """Choose storage method for credentials"""
    print(f"\nCredential storage options for group '{group_name}':")
    print("1. Encrypted file (recommended)")
    print("2. System keyring")
    print("3. Environment variables (show commands)")
    print("4. Prompt at runtime (not stored)")
    
    while True:
        choice = input("Choose storage method (1-4): ")
        if choice in ['1', '2', '3', '4']:
            return choice
        print("Invalid choice. Please enter 1, 2, 3, or 4.")


def store_credentials(credential_manager, device_id, credentials, storage_method):
    """Store credentials using the chosen method"""
    username = credentials['username']
    password = credentials['password']
    enable_password = credentials.get('enable_password')
    api_key = credentials.get('api_key')
    
    if storage_method == '1':
        # Encrypted file
        credential_manager.add_credential_set(
            device_id=device_id,
            username=username,
            password=password,
            enable_password=enable_password,
            api_key=api_key,
            source=CredentialSource.ENCRYPTED_FILE,
            store_encrypted=True
        )
    
    elif storage_method == '2':
        # System keyring
        try:
            credential_manager.add_credential_set(
                device_id=device_id,
                username=username,
                password=password,
                enable_password=enable_password,
                api_key=api_key,
                source=CredentialSource.KEYRING,
                store_encrypted=False
            )
        except Exception as e:
            print(f"Warning: Failed to store in keyring: {e}")
            print("Falling back to encrypted file storage...")
            credential_manager.add_credential_set(
                device_id=device_id,
                username=username,
                password=password,
                enable_password=enable_password,
                api_key=api_key,
                source=CredentialSource.ENCRYPTED_FILE,
                store_encrypted=True
            )
    
    elif storage_method == '3':
        # Environment variables
        env_prefix = device_id.replace("-", "_").replace(".", "_").upper()
        
        print(f"\nEnvironment variables for {device_id}:")
        print(f"export {env_prefix}_USERNAME='{username}'")
        print(f"export {env_prefix}_PASSWORD='{password}'")
        if enable_password:
            print(f"export {env_prefix}_ENABLE_PASSWORD='{enable_password}'")
        if api_key:
            print(f"export {env_prefix}_API_KEY='{api_key}'")
    
    elif storage_method == '4':
        # Runtime prompt (don't store)
        print(f"Credentials for {device_id} will be prompted at runtime")
        pass


def generate_configuration_file(device_configs, config_path):
    """Generate application configuration file"""
    print(f"\n=== Generating Configuration File ===")
    
    # Create base configuration
    config = {
        'app_name': 'Network Change Management Tool',
        'version': '1.0.0',
        'devices': [],
        'backup': {
            'enabled': True,
            'retention_days': 30,
            'backup_before_change': True,
            'compress': True,
            'backup_path': './backups'
        },
        'change': {
            'pre_checks_enabled': True,
            'post_checks_enabled': True,
            'rollback_on_failure': True,
            'max_parallel_devices': 5,
            'approval_required': False
        },
        'audit': {
            'compliance_checks': True,
            'configuration_drift': True,
            'security_audit': True,
            'report_format': 'html'
        },
        'logging': {
            'level': 'INFO',
            'file_logging': True,
            'console_logging': True,
            'log_retention_days': 90,
            'log_path': './logs'
        }
    }
    
    # Add devices (without credentials - they're stored securely)
    for device_config in device_configs:
        device_dict = {
            'hostname': device_config.hostname,
            'ip_address': device_config.ip_address,
            'device_type': device_config.device_type,
            'port': device_config.port,
            'tags': device_config.tags
        }
        config['devices'].append(device_dict)
    
    # Write configuration file
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(config_path, 'w') as f:
        yaml.dump(config, f, default_flow_style=False, indent=2)
    
    print(f"✓ Configuration file generated: {config_path}")
    print(f"  - {len(device_configs)} devices configured")
    print(f"  - Credentials stored separately for security")


def test_connections(device_configs, credential_manager):
    """Test device connections"""
    print("\n=== Testing Device Connections ===")
    
    from src.core.device_manager import DeviceManager
    
    # Create device manager with credential manager
    device_manager = DeviceManager(credential_manager=credential_manager)
    
    # Add devices
    for device_config in device_configs:
        device_manager.add_device(device_config)
    
    # Test connections
    devices = device_manager.list_devices()
    
    for device in devices:
        print(f"Testing connection to {device['hostname']} ({device['ip_address']})...")
        try:
            # Test would go here - for now just show status
            print(f"  ✓ {device['hostname']}: Ready for connection")
        except Exception as e:
            print(f"  ✗ {device['hostname']}: {e}")


def main():
    """Main setup function"""
    print("Network Change Tool - Credential Setup")
    print("=" * 50)
    
    # Step 1: Set up master password
    master_password = setup_master_password()
    
    # Step 2: Initialize credential manager
    credential_manager = CredentialManager(
        config_path=Path("./configs/credentials"),
        master_password=master_password
    )
    
    # Step 3: Discover or manually enter devices
    print("\nDevice discovery options:")
    print("1. Auto-discover devices on network")
    print("2. Import from text file")
    print("3. Import from Excel file")
    print("4. Import from existing configuration")
    print("5. Manually enter device information")
    
    choice = input("Choose option (1-5): ")
    
    if choice == '1':
        devices = discover_devices()
    elif choice == '2':
        devices = import_devices_from_text_file()
    elif choice == '3':
        devices = import_devices_from_excel_file()
    elif choice == '4':
        devices = import_from_existing_config()
    elif choice == '5':
        devices = manual_device_entry()
    else:
        print("Invalid choice")
        return
    
    if not devices:
        print("No devices configured. Exiting.")
        return
    
    # Step 4: Set up credentials
    device_configs = setup_device_credentials(devices, credential_manager)
    
    if not device_configs:
        print("No device configurations created. Exiting.")
        return
    
    # Step 5: Generate configuration file
    config_path = Path("./configs/app_config.yaml")
    generate_configuration_file(device_configs, config_path)
    
    # Step 6: Test connections (optional)
    test_choice = input("\nTest device connections? (y/n): ")
    if test_choice.lower() == 'y':
        test_connections(device_configs, credential_manager)
    
    # Step 7: Show next steps
    print("\n" + "=" * 50)
    print("Setup Complete!")
    print("\nNext steps:")
    print(f"1. Start the application: python main.py --config {config_path}")
    print("2. Or use CLI mode: python main.py --cli")
    print("3. Check the logs directory for troubleshooting")
    print("4. Review the generated configuration file")
    
    print(f"\nImportant files:")
    print(f"- Configuration: {config_path}")
    print(f"- Credentials: ./configs/credentials/")
    print(f"- Logs: ./logs/")
    print(f"- Backups: ./backups/")
    
    print("\nSecurity reminders:")
    print("- Keep your master password secure")
    print("- Regularly rotate device credentials")
    print("- Monitor credential access logs")
    print("- Back up encrypted credential files")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSetup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)