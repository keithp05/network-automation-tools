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
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create logs folder within script directory
    logs_dir = os.path.join(script_dir, "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(logs_dir, f"cisco_audit_log_{timestamp}.log")
    
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
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create audit folder within script directory
    audit_base_dir = os.path.join(script_dir, "audits")
    if not os.path.exists(audit_base_dir):
        os.makedirs(audit_base_dir)
    
    # Create timestamped audit folder within audits directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    audit_dir = os.path.join(audit_base_dir, f"audit_{timestamp}")
    if not os.path.exists(audit_dir):
        os.makedirs(audit_dir)
    
    return audit_dir

# === Section 3: Enhanced Connection Function ===
def connect_to_device(device_info, timeout=30):
    """Connect to device with enhanced error handling"""
    try:
        net_connect = ConnectHandler(**device_info, timeout=timeout)
        logging.info(f"Successfully connected to {device_info['ip']}")
        return net_connect
    except Exception as e:
        logging.error(f"Connection failed to {device_info['ip']}: {e}")
        raise

# === Section 4: Save Audit Results ===
def save_audit_results(audit_results, audit_dir):
    """Save audit results in multiple formats"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save as JSON (detailed format)
    json_file = os.path.join(audit_dir, f"audit_results_{timestamp}.json")
    with open(json_file, 'w') as f:
        json.dump(audit_results, f, indent=2)
    
    # Save as CSV (summary format)
    csv_file = os.path.join(audit_dir, f"audit_summary_{timestamp}.csv")
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Device IP', 'Connection Status', 'TACACS+ Server Group', 'RADIUS Server Group', 'TACACS Server Definition', 'Missing Configs Count'])
        
        for device_ip, result in audit_results.items():
            if result['connection_status'] == 'success':
                missing_count = len(result['missing_configs'])
                writer.writerow([
                    device_ip,
                    result['connection_status'],
                    'FOUND' if 'TACACS+ Server Group PSN06' in result['found_configs'] else 'MISSING',
                    'FOUND' if 'RADIUS Server Group PSN06-R' in result['found_configs'] else 'MISSING',
                    'FOUND' if 'TACACS Server Definition PSN06' in result['found_configs'] else 'MISSING',
                    missing_count
                ])
            else:
                writer.writerow([device_ip, result['connection_status'], 'N/A', 'N/A', 'N/A', 'N/A'])
    
    # Save remediation file (for Part 2 tool)
    remediation_file = os.path.join(audit_dir, f"remediation_data_{timestamp}.json")
    remediation_data = {}
    
    for device_ip, result in audit_results.items():
        if result['connection_status'] == 'success' and result['missing_configs']:
            remediation_data[device_ip] = {
                'missing_configs': result['missing_configs'],
                'remediation_commands': result['remediation_commands']
            }
    
    with open(remediation_file, 'w') as f:
        json.dump(remediation_data, f, indent=2)
    
    logging.info(f"Audit results saved to: {json_file}")
    logging.info(f"Audit summary saved to: {csv_file}")
    logging.info(f"Remediation data saved to: {remediation_file}")
    
    return json_file, csv_file, remediation_file

# === Section 5: Main Audit Function ===
def main():
    # Setup logging
    log_filename = setup_logging()
    logging.info("=== PSN06 Config Audit Tool Started (Audit Only) ===")
    
    # Create audit directory
    audit_dir = create_audit_dir()
    logging.info(f"Audit directory created: {audit_dir}")
    
    # Prompt for SSH Credentials
    print("=== PSN06 Config Audit Tool (Audit Only) ===")
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
    
    # Define PSN06 Config Checks and Remediation
    config_checks = [
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
                " key <TACACS_KEY_PLACEHOLDER>",  # Placeholder for Part 2 tool
                "exit"
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
    
    # Connect to Devices and Audit
    for device_ip in device_list:
        print(f"\n=== Auditing Device: {device_ip} ===")
        logging.info(f"Starting audit for device: {device_ip}")
        
        device = {
            'device_type': 'cisco_ios',
            'ip': device_ip,
            'username': username,
            'password': password,
        }
        
        try:
            net_connect = connect_to_device(device)
            successful_connections += 1
            
            # Get running configuration
            running_config = net_connect.send_command("show running-config")
            
            # Initialize device audit results
            device_audit = {
                'connection_status': 'success',
                'audit_timestamp': datetime.now().isoformat(),
                'found_configs': [],
                'missing_configs': [],
                'remediation_commands': []
            }
            
            # Check all configurations
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
            
            if device_audit['missing_configs']:
                devices_needing_config += 1
                print(f"Device {device_ip} is missing {len(device_audit['missing_configs'])} configuration(s).")
            else:
                print(f"Device {device_ip} has all required configurations.")
            
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
                'error': str(e),
                'found_configs': [],
                'missing_configs': [],
                'remediation_commands': []
            }
    
    # Save audit results
    json_file, csv_file, remediation_file = save_audit_results(audit_results, audit_dir)
    
    # Final Summary
    print(f"\n=== AUDIT SUMMARY ===")
    print(f"Total devices audited: {total_devices}")
    print(f"Successful connections: {successful_connections}")
    print(f"Failed connections: {failed_connections}")
    print(f"Devices needing configuration: {devices_needing_config}")
    print(f"\n=== OUTPUT FILES ===")
    print(f"Detailed audit results: {json_file}")
    print(f"Audit summary: {csv_file}")
    print(f"Remediation data: {remediation_file}")
    print(f"Log file: {log_filename}")
    
    logging.info("=== PSN06 Config Audit Tool Completed ===")
    logging.info(f"Summary - Total: {total_devices}, Success: {successful_connections}, Failed: {failed_connections}, Need Config: {devices_needing_config}")
    
    # Prompt for next steps
    if devices_needing_config > 0:
        print(f"\n=== NEXT STEPS ===")
        print(f"Found {devices_needing_config} devices that need configuration updates.")
        print(f"Use the remediation file with Part 2 tool to apply configurations:")
        print(f"File: {remediation_file}")

if __name__ == "__main__":
    main()
