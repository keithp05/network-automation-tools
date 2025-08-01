#!/usr/bin/env python3
"""
Network Change Management Tool
Main application entry point
"""

import sys
import argparse
from pathlib import Path
from typing import Optional

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.core.config import AppConfig
from src.core.device_manager import DeviceManager
from src.core.change_manager import ChangeManager
from src.audit.audit_manager import AuditManager
from src.utils.logging_config import setup_logging
from src.gui.main_window import main as gui_main


def main():
    """Main application entry point"""
    parser = argparse.ArgumentParser(
        description="Network Change Management Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Launch GUI
  %(prog)s --config config.yaml      # Launch GUI with custom config
  %(prog)s --cli                     # Launch CLI interface
        """
    )
    
    parser.add_argument(
        "--config", "-c",
        type=Path,
        help="Path to configuration file (YAML or JSON)"
    )
    
    parser.add_argument(
        "--cli",
        action="store_true",
        help="Launch CLI interface instead of GUI"
    )
    
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO",
        help="Set logging level"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="Network Change Management Tool v1.0.0"
    )
    
    args = parser.parse_args()
    
    # Load configuration
    try:
        if args.config:
            config = AppConfig.from_file(args.config)
        else:
            # Try to load default config
            default_config_path = Path(__file__).parent / "configs" / "app_config.yaml"
            if default_config_path.exists():
                config = AppConfig.from_file(default_config_path)
            else:
                config = AppConfig()
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)
    
    # Override log level if specified
    if args.log_level:
        config.logging.level = args.log_level
    
    # Setup logging
    logger_instance = setup_logging(config.logging)
    logger = logger_instance.get_logger(__name__)
    
    logger.info("Starting Network Change Management Tool")
    logger.info(f"Configuration loaded: {len(config.devices)} devices configured")
    
    try:
        if args.cli:
            # Launch CLI interface
            launch_cli(config, logger_instance)
        else:
            # Launch GUI interface
            launch_gui(config, logger_instance)
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Application error: {e}")
        sys.exit(1)


def launch_gui(config: AppConfig, logger_instance):
    """Launch GUI interface"""
    logger = logger_instance.get_logger(__name__)
    logger.info("Launching GUI interface")
    
    # Set config path for GUI to use
    import os
    os.environ['NETWORK_TOOL_CONFIG'] = str(config)
    
    # Launch GUI
    gui_main()


def launch_cli(config: AppConfig, logger_instance):
    """Launch CLI interface"""
    logger = logger_instance.get_logger(__name__)
    logger.info("Launching CLI interface")
    
    # Initialize core components
    device_manager = DeviceManager(config)
    change_manager = ChangeManager(device_manager)
    audit_manager = AuditManager(device_manager)
    
    # Simple CLI interface
    print("Network Change Management Tool - CLI Interface")
    print("=" * 50)
    
    while True:
        print("\nAvailable commands:")
        print("1. List devices")
        print("2. Connect to device")
        print("3. Disconnect from device")
        print("4. Backup device")
        print("5. Run audit")
        print("6. Show device info")
        print("7. Exit")
        
        choice = input("\nEnter your choice (1-7): ").strip()
        
        try:
            if choice == "1":
                list_devices(device_manager)
            elif choice == "2":
                connect_device(device_manager)
            elif choice == "3":
                disconnect_device(device_manager)
            elif choice == "4":
                backup_device(device_manager)
            elif choice == "5":
                run_audit(audit_manager)
            elif choice == "6":
                show_device_info(device_manager)
            elif choice == "7":
                break
            else:
                print("Invalid choice. Please try again.")
        except Exception as e:
            logger.error(f"CLI command error: {e}")
            print(f"Error: {e}")
    
    # Cleanup
    device_manager.disconnect_all()
    print("Goodbye!")


def list_devices(device_manager: DeviceManager):
    """List all devices"""
    devices = device_manager.list_devices()
    
    if not devices:
        print("No devices configured.")
        return
    
    print("\nConfigured devices:")
    print("-" * 80)
    print(f"{'Hostname':<20} {'IP Address':<15} {'Type':<15} {'Status':<10} {'Tags'}")
    print("-" * 80)
    
    for device in devices:
        tags = ", ".join(device['tags']) if device['tags'] else "None"
        print(f"{device['hostname']:<20} {device['ip_address']:<15} {device['device_type']:<15} {device['status']:<10} {tags}")


def connect_device(device_manager: DeviceManager):
    """Connect to a device"""
    hostname = input("Enter device hostname: ").strip()
    
    # Find device
    device_id = None
    for device in device_manager.list_devices():
        if device['hostname'] == hostname:
            device_id = device['id']
            break
    
    if not device_id:
        print(f"Device '{hostname}' not found.")
        return
    
    try:
        print(f"Connecting to {hostname}...")
        device = device_manager.connect_device(device_id)
        print(f"Successfully connected to {hostname}")
        
        # Show device info
        info = device.get_device_info()
        print(f"Device info: {info}")
        
    except Exception as e:
        print(f"Failed to connect to {hostname}: {e}")


def disconnect_device(device_manager: DeviceManager):
    """Disconnect from a device"""
    hostname = input("Enter device hostname: ").strip()
    
    # Find device
    device_id = None
    for device in device_manager.list_devices():
        if device['hostname'] == hostname:
            device_id = device['id']
            break
    
    if not device_id:
        print(f"Device '{hostname}' not found.")
        return
    
    try:
        device_manager.disconnect_device(device_id)
        print(f"Disconnected from {hostname}")
    except Exception as e:
        print(f"Failed to disconnect from {hostname}: {e}")


def backup_device(device_manager: DeviceManager):
    """Backup a device"""
    hostname = input("Enter device hostname: ").strip()
    
    # Find device
    device_id = None
    for device in device_manager.list_devices():
        if device['hostname'] == hostname:
            device_id = device['id']
            break
    
    if not device_id:
        print(f"Device '{hostname}' not found.")
        return
    
    try:
        print(f"Creating backup for {hostname}...")
        backup_path = Path("./backups")
        results = device_manager.backup_devices([device_id], backup_path)
        
        if device_id in results:
            backup_info = results[device_id]
            if hasattr(backup_info, 'device_hostname'):
                print(f"Backup created successfully: {backup_info.backup_path}")
            else:
                print(f"Backup failed: {backup_info}")
        
    except Exception as e:
        print(f"Failed to backup {hostname}: {e}")


def run_audit(audit_manager: AuditManager):
    """Run audit on a device"""
    hostname = input("Enter device hostname: ").strip()
    
    # Find device
    device_id = None
    for device in audit_manager.device_manager.list_devices():
        if device['hostname'] == hostname:
            device_id = device['id']
            break
    
    if not device_id:
        print(f"Device '{hostname}' not found.")
        return
    
    try:
        print(f"Running audit on {hostname}...")
        report = audit_manager.audit_device(device_id)
        
        print(f"\nAudit Results for {hostname}:")
        print("-" * 40)
        print(f"Compliance Score: {report.compliance_score:.1f}%")
        print(f"Pass: {report.pass_count}")
        print(f"Fail: {report.fail_count}")
        print(f"Warning: {report.warning_count}")
        print(f"Error: {report.error_count}")
        
        if report.fail_count > 0:
            print("\nFailed checks:")
            for result in report.results:
                if result.status.value == "fail":
                    print(f"  - {result.rule_id}: {result.message}")
        
    except Exception as e:
        print(f"Failed to audit {hostname}: {e}")


def show_device_info(device_manager: DeviceManager):
    """Show device information"""
    hostname = input("Enter device hostname: ").strip()
    
    # Find device
    device_id = None
    for device in device_manager.list_devices():
        if device['hostname'] == hostname:
            device_id = device['id']
            break
    
    if not device_id:
        print(f"Device '{hostname}' not found.")
        return
    
    try:
        device = device_manager.get_device(device_id)
        if not device:
            device = device_manager.connect_device(device_id)
        
        info = device.get_device_info()
        
        print(f"\nDevice Information for {hostname}:")
        print("-" * 40)
        for key, value in info.items():
            print(f"{key.replace('_', ' ').title()}: {value}")
        
    except Exception as e:
        print(f"Failed to get device info for {hostname}: {e}")


if __name__ == "__main__":
    main()