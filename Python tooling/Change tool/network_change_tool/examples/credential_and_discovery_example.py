#!/usr/bin/env python3
"""
Example demonstrating credential management and device discovery
"""

import sys
import os
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from src.core.credential_manager import CredentialManager, CredentialSource
from src.core.device_discovery import DeviceDiscovery, DiscoveryMethod
from src.core.device_manager import DeviceManager
from src.core.config import AppConfig, DeviceConfig, DeviceCredentials


def credential_management_example():
    """Example of credential management"""
    print("=== Credential Management Example ===")
    
    # Initialize credential manager with master password
    credential_manager = CredentialManager(
        config_path=Path("./configs/credentials"),
        master_password="my_master_password"
    )
    
    # Method 1: Add credentials directly
    print("\n1. Adding credentials directly:")
    credential_manager.add_credential_set(
        device_id="switch-01_192.168.1.10",
        username="admin",
        password="cisco123",
        enable_password="enable123",
        source=CredentialSource.PROMPT,
        store_encrypted=True
    )
    
    # Method 2: Set up environment variables
    print("\n2. Setting up environment variables:")
    os.environ["DEVICE_USERNAME"] = "admin"
    os.environ["DEVICE_PASSWORD"] = "default_password"
    os.environ["SWITCH_01_192_168_1_10_PASSWORD"] = "specific_password"
    
    # Method 3: Store in system keyring
    print("\n3. Storing credentials in keyring:")
    try:
        credential_manager.add_credential_set(
            device_id="fw-01_192.168.1.20",
            username="admin",
            password="palo123",
            api_key="LUFRPT14MW5xOEo1R09KVlBZNnpnemh0VHRBOWl6TGM9bXcwM3JHUGVhRlNiY0dCR0srNERUQT09",
            source=CredentialSource.KEYRING,
            store_encrypted=False  # Store in keyring instead
        )
    except Exception as e:
        print(f"Keyring storage failed: {e}")
    
    # Test credential retrieval
    print("\n4. Testing credential retrieval:")
    device_config = {
        'hostname': 'switch-01',
        'ip_address': '192.168.1.10',
        'device_type': 'cisco_ios',
        'port': 22,
        'credentials': {}
    }
    
    try:
        credentials = credential_manager.get_credentials("switch-01_192.168.1.10", device_config)
        print(f"Retrieved credentials for switch-01: {credentials.username} (source: {credentials.source.value})")
    except Exception as e:
        print(f"Failed to retrieve credentials: {e}")
    
    # List stored credentials
    print("\n5. Listing stored credentials:")
    stored_devices = credential_manager.list_stored_credentials()
    for device_id in stored_devices:
        print(f"  - {device_id}")


def device_discovery_example():
    """Example of device discovery"""
    print("\n=== Device Discovery Example ===")
    
    # Initialize device discovery
    discovery = DeviceDiscovery(timeout=3, max_workers=20)
    
    # Method 1: Discover network range
    print("\n1. Discovering network range 192.168.1.0/24:")
    network_range = "192.168.1.0/24"
    
    # Use multiple discovery methods
    methods = [
        DiscoveryMethod.PING_SWEEP,
        DiscoveryMethod.NMAP_SCAN,
        DiscoveryMethod.SSH_BANNER,
        DiscoveryMethod.HTTP_BANNER
    ]
    
    try:
        discovered_devices = discovery.discover_network_range(network_range, methods)
        
        print(f"Discovered {len(discovered_devices)} devices:")
        for device in discovered_devices:
            print(f"  - {device.ip_address} ({device.hostname or 'unknown'})")
            print(f"    Type: {device.device_type or 'unknown'}")
            print(f"    Confidence: {device.confidence:.1f}")
            print(f"    Open ports: {device.ports_open}")
            print(f"    Discovery method: {device.discovery_method.value}")
            print()
    
    except Exception as e:
        print(f"Discovery failed: {e}")
    
    # Method 2: Discover using CDP/LLDP (requires existing device connection)
    print("\n2. Discovering neighbors using CDP/LLDP:")
    # This would require an existing device connection
    # cdp_neighbors = discovery.discover_cdp_neighbors(device_manager, "switch-01_192.168.1.10")
    print("  (Requires existing device connection)")
    
    # Method 3: Save and load discovery results
    print("\n3. Saving discovery results:")
    if 'discovered_devices' in locals() and discovered_devices:
        discovery.save_discovery_results(discovered_devices, Path("./discovery_results.json"))
        print("  Discovery results saved to discovery_results.json")
        
        # Load results
        loaded_devices = discovery.load_discovery_results(Path("./discovery_results.json"))
        print(f"  Loaded {len(loaded_devices)} devices from file")
    
    # Method 4: Auto-configure devices
    print("\n4. Auto-configuring devices:")
    if 'discovered_devices' in locals() and discovered_devices:
        default_credentials = {
            'username': 'admin',
            'password': 'admin',
            'enable_password': 'admin'
        }
        
        device_configs = discovery.auto_configure_devices(discovered_devices, default_credentials)
        print(f"  Auto-configured {len(device_configs)} devices:")
        
        for config in device_configs:
            print(f"    - {config.hostname} ({config.ip_address}) - {config.device_type}")


def integrated_example():
    """Example showing integration of credential management and device discovery"""
    print("\n=== Integrated Example ===")
    
    # Step 1: Initialize managers
    credential_manager = CredentialManager(master_password="my_master_password")
    device_manager = DeviceManager(credential_manager=credential_manager)
    
    # Step 2: Discover devices
    discovery = DeviceDiscovery()
    
    # For demo purposes, create some mock discovered devices
    from src.core.device_discovery import DiscoveredDevice
    
    mock_devices = [
        DiscoveredDevice(
            ip_address="192.168.1.10",
            hostname="switch-01",
            device_type="cisco_ios",
            ports_open=[22, 80],
            confidence=0.9
        ),
        DiscoveredDevice(
            ip_address="192.168.1.20",
            hostname="fw-01",
            device_type="paloalto_panos",
            ports_open=[443],
            confidence=0.8
        )
    ]
    
    # Step 3: Auto-configure devices
    device_configs = discovery.auto_configure_devices(mock_devices)
    
    # Step 4: Add devices to device manager
    print("Adding discovered devices to device manager:")
    for config in device_configs:
        device_id = device_manager.add_device(config)
        print(f"  Added device: {device_id}")
        
        # Add credentials for the device
        credential_manager.add_credential_set(
            device_id=device_id,
            username="admin",
            password="admin123",
            enable_password="enable123" if config.device_type.startswith("cisco") else None,
            api_key="your_api_key" if config.device_type == "paloalto_panos" else None,
            store_encrypted=True
        )
    
    # Step 5: List configured devices
    print("\nConfigured devices:")
    devices = device_manager.list_devices()
    for device in devices:
        print(f"  - {device['hostname']} ({device['ip_address']}) - {device['device_type']}")
    
    # Step 6: Test connection (this would actually try to connect)
    print("\nTesting device connections:")
    for device in devices:
        try:
            # In a real scenario, this would establish actual connections
            print(f"  - {device['hostname']}: Connection test would go here")
        except Exception as e:
            print(f"  - {device['hostname']}: Connection failed - {e}")


def security_best_practices():
    """Example of security best practices"""
    print("\n=== Security Best Practices ===")
    
    print("1. Environment Variables:")
    print("   export DEVICE_USERNAME=admin")
    print("   export DEVICE_PASSWORD=secure_password")
    print("   export NETWORK_TOOL_MASTER_PASSWORD=master_password")
    
    print("\n2. Configuration File (without credentials):")
    print("   devices:")
    print("     - hostname: switch-01")
    print("       ip_address: 192.168.1.10")
    print("       device_type: cisco_ios")
    print("       credentials:")
    print("         username: ${DEVICE_USERNAME}")
    print("         password: ${DEVICE_PASSWORD}")
    
    print("\n3. Encrypted Storage:")
    print("   - Credentials stored in encrypted files")
    print("   - Master password for encryption")
    print("   - System keyring integration")
    
    print("\n4. Credential Rotation:")
    print("   - Regular password changes")
    print("   - API key rotation")
    print("   - Audit credential access")


if __name__ == "__main__":
    print("Network Change Tool - Credential Management and Device Discovery Examples")
    print("=" * 80)
    
    # Run examples
    try:
        credential_management_example()
        device_discovery_example()
        integrated_example()
        security_best_practices()
        
    except KeyboardInterrupt:
        print("\nExample interrupted by user")
    except Exception as e:
        print(f"Example failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("Examples completed!")