# Enhanced Cisco PSN Audit - Checks for both PSN05 and PSN06
from getpass import getpass
from netmiko import ConnectHandler
import tkinter as tk
from tkinter import filedialog
import re
import logging
import os
import json
import csv
from datetime import datetime

# === Section 1: Setup Logging ===
def setup_logging():
    """Setup logging configuration"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(script_dir, "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(logs_dir, f"cisco_audit_enhanced_{timestamp}.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler()
        ]
    )
    return log_filename

# === Section 2: Create Audit Directory ===
def create_audit_dir():
    """Create audit directory if it doesn't exist"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    audit_base_dir = os.path.join(script_dir, "audits")
    if not os.path.exists(audit_base_dir):
        os.makedirs(audit_base_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    audit_dir = os.path.join(audit_base_dir, f"audit_enhanced_{timestamp}")
    if not os.path.exists(audit_dir):
        os.makedirs(audit_dir)
    
    return audit_dir

# === Section 3: Device Type Detection ===
def detect_device_type(device_ip, username, password):
    """Detect if device is Cisco IOS or Nexus"""
    # Try IOS first
    device = {
        'device_type': 'cisco_ios',
        'ip': device_ip,
        'username': username,
        'password': password,
    }

    try:
        net_connect = ConnectHandler(**device)
        version_output = net_connect.send_command("show version")
        net_connect.disconnect()

        # Check for Nexus indicators
        if 'NX-OS' in version_output or 'Nexus' in version_output:
            logging.info(f"Device {device_ip} identified as Cisco Nexus (NX-OS)")
            return 'cisco_nxos'
        else:
            logging.info(f"Device {device_ip} identified as Cisco IOS")
            return 'cisco_ios'

    except Exception as e:
        logging.warning(f"Device type detection failed for {device_ip}, defaulting to cisco_ios: {e}")
        return 'cisco_ios'

# === Section 4: Enhanced Connection Function ===
def connect_to_device(device_info, timeout=30):
    """Connect to device with enhanced error handling"""
    try:
        net_connect = ConnectHandler(**device_info, timeout=timeout)
        logging.info(f"Successfully connected to {device_info['ip']}")
        return net_connect
    except Exception as e:
        logging.error(f"Connection failed to {device_info['ip']}: {e}")
        raise

# === Section 5: Save Audit Results ===
def save_audit_results(audit_results, audit_dir):
    """Save audit results in multiple formats"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save as JSON (detailed format)
    json_file = os.path.join(audit_dir, f"audit_results_{timestamp}.json")
    with open(json_file, 'w') as f:
        json.dump(audit_results, f, indent=2)
    
    # Save as CSV (summary format) - Enhanced with PSN05 status and device type
    csv_file = os.path.join(audit_dir, f"audit_summary_{timestamp}.csv")
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Device IP', 'Device Type', 'Connection Status', 'PSN05 Present', 'PSN06 Present',
                        'TACACS+ Server Group', 'RADIUS Server Group', 'Migration Status'])
        
        for device_ip, result in audit_results.items():
            if result['connection_status'] == 'success':
                psn05_present = result.get('psn05_present', False)
                psn06_present = 'TACACS+ Server Group PSN06' in result['found_configs']
                device_type = result.get('device_type', 'cisco_ios')

                if psn05_present and not psn06_present:
                    migration_status = 'NEEDS_MIGRATION'
                elif psn05_present and psn06_present:
                    migration_status = 'PSN05_REMOVAL_NEEDED'
                elif not psn05_present and psn06_present:
                    migration_status = 'MIGRATED'
                else:
                    migration_status = 'NEEDS_PSN06'

                writer.writerow([
                    device_ip,
                    device_type,
                    result['connection_status'],
                    'YES' if psn05_present else 'NO',
                    'YES' if psn06_present else 'NO',
                    'FOUND' if 'TACACS+ Server Group PSN06' in result['found_configs'] else 'MISSING',
                    'FOUND' if 'RADIUS Server Group PSN06-R' in result['found_configs'] else 'MISSING',
                    migration_status
                ])
            else:
                device_type = result.get('device_type', 'UNKNOWN')
                writer.writerow([device_ip, device_type, result['connection_status'], 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'])
    
    # Save remediation file
    remediation_file = os.path.join(audit_dir, f"remediation_data_{timestamp}.json")
    remediation_data = {}
    
    for device_ip, result in audit_results.items():
        if result['connection_status'] == 'success' and result['missing_configs']:
            remediation_data[device_ip] = {
                'missing_configs': result['missing_configs'],
                'remediation_commands': result['remediation_commands'],
                'psn05_present': result.get('psn05_present', False),
                'device_type': result.get('device_type', 'cisco_ios')
            }
    
    with open(remediation_file, 'w') as f:
        json.dump(remediation_data, f, indent=2)
    
    logging.info(f"Audit results saved to: {json_file}")
    logging.info(f"Audit summary saved to: {csv_file}")
    logging.info(f"Remediation data saved to: {remediation_file}")
    
    return json_file, csv_file, remediation_file

# === Section 6: Main Audit Function ===
def main():
    # Setup logging
    log_filename = setup_logging()
    logging.info("=== Enhanced PSN Audit Tool Started ===")
    
    # Create audit directory
    audit_dir = create_audit_dir()
    logging.info(f"Audit directory created: {audit_dir}")
    
    # Prompt for SSH Credentials
    print("=== Enhanced PSN Audit Tool (Checks PSN05 and PSN06) ===")
    username = input("Enter your SSH username: ")
    password = getpass("Enter your SSH password: ")
    
    # File Explorer to Select Device List
    print("\nPlease select the device list text file (one IP or hostname per line).")
    root = tk.Tk()
    root.withdraw()
    device_file_path = filedialog.askopenfilename(
        title="Select Device List File", 
        filetypes=[("Text Files", "*.txt")]
    )
    
    if not device_file_path:
        logging.error("No device file selected. Exiting.")
        return
    
    # Load Device IPs
    try:
        with open(device_file_path, 'r') as file:
            device_list = [line.strip() for line in file if line.strip()]
        logging.info(f"Loaded {len(device_list)} devices from {device_file_path}")
    except Exception as e:
        logging.error(f"Failed to read device file: {e}")
        return
    
    # Define PSN06 Config Checks and Remediation (will be customized per device type)
    config_checks_ios = [
        {
            "name": "TACACS+ Server Group PSN06",
            "match": r"aaa group server tacacs\+\s+ISE-TACACS[\s\S]*?server name PVA-M-ISE-PSN06",
            "remediation": [
                "aaa group server tacacs+ ISE-TACACS",
                " server name PVA-M-ISE-PSN06",
                "exit"
            ]
        },
        {
            "name": "RADIUS Server Group PSN06-R",
            "match": r"aaa group server radius\s+ISE-RADIUS[\s\S]*?server name PVA-M-ISE-PSN06-R",
            "remediation": [
                "aaa group server radius ISE-RADIUS",
                " server name PVA-M-ISE-PSN06-R",
                "exit"
            ]
        },
        {
            "name": "TACACS Server Definition PSN06",
            "match": r"tacacs server PVA-M-ISE-PSN06\s+address ipv4 172\.18\.31\.101",
            "remediation": [
                "tacacs server PVA-M-ISE-PSN06",
                " address ipv4 172.18.31.101",
                " key <TACACS_KEY_PLACEHOLDER>",
                "exit"
            ]
        }
    ]

    config_checks_nxos = [
        {
            "name": "TACACS+ Feature Enabled",
            "match": r"feature tacacs\+",
            "remediation": [
                "feature tacacs+"
            ]
        },
        {
            "name": "TACACS+ Server Group PSN06",
            "match": r"aaa group server tacacs\+\s+ISE[\s\S]*?server 172\.18\.31\.101",
            "remediation": [
                "aaa group server tacacs+ ISE",
                " server 172.18.31.101",
                " exit"
            ]
        },
        {
            "name": "TACACS Server Host PSN06",
            "match": r"tacacs-server host 172\.18\.31\.101",
            "remediation": [
                "tacacs-server host 172.18.31.101 key <TACACS_KEY_PLACEHOLDER>"
            ]
        }
    ]
    
    # Audit results storage
    audit_results = {}
    
    # Statistics tracking
    total_devices = len(device_list)
    successful_connections = 0
    failed_connections = 0
    devices_needing_config = 0
    devices_with_psn05 = 0
    devices_fully_migrated = 0
    ios_devices = 0
    nxos_devices = 0
    
    # Connect to Devices and Audit
    for device_ip in device_list:
        print(f"\n=== Auditing Device: {device_ip} ===")
        logging.info(f"Starting audit for device: {device_ip}")

        try:
            # Detect device type first
            print(f"  Detecting device type...")
            device_type = detect_device_type(device_ip, username, password)

            # Display device type clearly
            if device_type == 'cisco_nxos':
                print(f"  ✓ Device Type: Cisco Nexus (NX-OS)")
                nxos_devices += 1
            else:
                print(f"  ✓ Device Type: Cisco IOS/IOS-XE")
                ios_devices += 1

            device = {
                'device_type': device_type,
                'ip': device_ip,
                'username': username,
                'password': password,
                'secret': '',  # Auto-enable
            }

            net_connect = connect_to_device(device)
            successful_connections += 1

            # Get running configuration
            running_config = net_connect.send_command("show running-config")

            # Check for PSN05 presence
            psn05_check = net_connect.send_command("show run | include PVA-M-ISE-PSN05")
            has_psn05 = bool(psn05_check.strip())
            if has_psn05:
                devices_with_psn05 += 1
                print(f"  ⚠ PSN05 detected on this device!")

            # Initialize device audit results
            device_audit = {
                'connection_status': 'success',
                'audit_timestamp': datetime.now().isoformat(),
                'device_type': device_type,
                'found_configs': [],
                'missing_configs': [],
                'remediation_commands': [],
                'psn05_present': has_psn05
            }

            # Select appropriate config checks based on device type
            if device_type == 'cisco_nxos':
                config_checks = config_checks_nxos
                print(f"  Using NX-OS configuration checks")
            else:
                config_checks = config_checks_ios
                print(f"  Using IOS configuration checks")

            # Check all PSN06 configurations
            for check in config_checks:
                print(f"Checking: {check['name']}... ", end="")
                if re.search(check['match'], running_config, re.MULTILINE | re.DOTALL | re.IGNORECASE):
                    print("FOUND")
                    logging.info(f"Configuration found on {device_ip}: {check['name']}")
                    device_audit['found_configs'].append(check['name'])
                else:
                    print("MISSING")
                    logging.warning(f"Configuration missing on {device_ip}: {check['name']}")
                    device_audit['missing_configs'].append(check['name'])
                    device_audit['remediation_commands'].extend(check['remediation'])
            
            # Store audit results
            audit_results[device_ip] = device_audit
            
            # Determine migration status
            if has_psn05:
                if device_audit['missing_configs']:
                    print(f"Device {device_ip} needs migration: Has PSN05, missing PSN06 configs")
                else:
                    print(f"Device {device_ip} needs PSN05 removal: Has both PSN05 and PSN06")
            else:
                if device_audit['missing_configs']:
                    print(f"Device {device_ip} needs PSN06 configuration")
                    devices_needing_config += 1
                else:
                    print(f"Device {device_ip} is fully migrated: PSN06 only")
                    devices_fully_migrated += 1
            
            net_connect.disconnect()
            logging.info(f"Disconnected from {device_ip}")
            
        except Exception as e:
            failed_connections += 1
            error_msg = f"Failed to process {device_ip}: {e}"
            print(error_msg)
            logging.error(error_msg)

            # Store failed connection in audit results
            audit_results[device_ip] = {
                'connection_status': 'failed',
                'audit_timestamp': datetime.now().isoformat(),
                'device_type': 'UNKNOWN',
                'error': str(e),
                'found_configs': [],
                'missing_configs': [],
                'remediation_commands': [],
                'psn05_present': False
            }
    
    # Save audit results
    json_file, csv_file, remediation_file = save_audit_results(audit_results, audit_dir)
    
    # Final Summary
    print(f"\n=== ENHANCED AUDIT SUMMARY ===")
    print(f"Total devices audited: {total_devices}")
    print(f"Successful connections: {successful_connections}")
    print(f"Failed connections: {failed_connections}")
    print(f"\nDevice Types:")
    print(f"Cisco IOS/IOS-XE devices: {ios_devices}")
    print(f"Cisco Nexus (NX-OS) devices: {nxos_devices}")
    print(f"\nPSN Status:")
    print(f"Devices with PSN05 present: {devices_with_psn05}")
    print(f"Devices needing PSN06 config: {devices_needing_config}")
    print(f"Devices fully migrated (PSN06 only): {devices_fully_migrated}")
    
    print(f"\n=== OUTPUT FILES ===")
    print(f"Detailed audit results: {json_file}")
    print(f"Audit summary: {csv_file}")
    print(f"Remediation data: {remediation_file}")
    print(f"Log file: {log_filename}")
    
    logging.info("=== Enhanced PSN Audit Tool Completed ===")
    
    # Prompt for next steps
    if devices_needing_config > 0 or devices_with_psn05 > 0:
        print(f"\n=== NEXT STEPS ===")
        if devices_with_psn05 > 0:
            print(f"⚠ Found {devices_with_psn05} devices with PSN05 that need migration")
        if devices_needing_config > 0:
            print(f"Found {devices_needing_config} devices that need PSN06 configuration")
        print(f"\nUse the PSN_Audit_Based_Migration.py script with:")
        print(f"1. Remediation file: {remediation_file}")
        print(f"2. Complete device list for PSN05 removal")

if __name__ == "__main__":
    main()