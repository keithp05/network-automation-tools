# Enhanced Cisco PSN Audit with Authentication Testing
# Tests both configuration presence AND authentication functionality
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
    log_filename = os.path.join(logs_dir, f"cisco_audit_auth_test_{timestamp}.log")
    
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
    audit_dir = os.path.join(audit_base_dir, f"audit_auth_test_{timestamp}")
    if not os.path.exists(audit_dir):
        os.makedirs(audit_dir)
    
    return audit_dir

# === Section 3: Enhanced Connection Function ===
def connect_to_device(device_info, timeout=30):
    """Enhanced connection function with multiple authentication methods"""
    try:
        net_connect = ConnectHandler(**device_info, timeout=timeout)
        
        # Check if we're in enable mode
        if not net_connect.check_enable_mode():
            net_connect.enable()
        
        return net_connect
    except Exception as e:
        logging.error(f"Failed to connect to {device_info['ip']}: {str(e)}")
        raise

# === Section 4: Test Server Authentication ===
def get_tacacs_group_name(net_connect):
    """Get the TACACS+ group name from configuration"""
    try:
        output = net_connect.send_command("show run | section aaa group server tacacs+")
        # Look for line like "aaa group server tacacs+ ISE-TACACS"
        for line in output.split('\n'):
            if 'aaa group server tacacs+' in line:
                parts = line.strip().split()
                if len(parts) >= 5:  # aaa group server tacacs+ GROUP-NAME
                    return parts[4]  # Return the group name
        return None
    except:
        return None

def test_server_authentication(net_connect, server_name, server_ip, test_username, test_password, group_name, full_server_name):
    """Test authentication for a specific server"""
    print(f"  Testing {server_name} ({server_ip})...", end="")
    
    try:
        # First check if server is reachable
        ping_test = net_connect.send_command(f"ping {server_ip} repeat 2 timeout 1")
        if "Success rate is 0" in ping_test:
            print(" ✗ NOT REACHABLE")
            return {
                'server': server_name,
                'ip': server_ip,
                'reachable': False,
                'auth_test': 'not_tested',
                'details': 'Server not reachable'
            }
        
        # Test TACACS authentication for this specific server
        # Command format: test aaa group ISE-TACACS server 172.18.31.101 username password legacy
        test_cmd = f"test aaa group {group_name} server {server_ip} {test_username} {test_password} legacy"
        auth_output = net_connect.send_command(test_cmd, delay_factor=3)
        
        # Parse authentication results
        if "successfully authenticated" in auth_output.lower() or "User was successfully authenticated" in auth_output:
            print(" ✓ PASS")
            return {
                'server': server_name,
                'ip': server_ip,
                'reachable': True,
                'auth_test': 'pass',
                'details': 'Authentication successful'
            }
        else:
            print(" ✗ FAIL")
            return {
                'server': server_name,
                'ip': server_ip,
                'reachable': True,
                'auth_test': 'fail',
                'details': 'Authentication failed'
            }
            
    except Exception as e:
        print(f" ✗ ERROR: {str(e)}")
        return {
            'server': server_name,
            'ip': server_ip,
            'reachable': 'unknown',
            'auth_test': 'error',
            'details': str(e)
        }


# === Section 5: Save Audit Results ===
def save_audit_results(audit_results, audit_dir):
    """Save audit results in multiple formats"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save detailed JSON results
    json_file = os.path.join(audit_dir, f"audit_results_{timestamp}.json")
    with open(json_file, 'w') as f:
        json.dump(audit_results, f, indent=2)
    
    # Save summary CSV
    csv_file = os.path.join(audit_dir, f"audit_summary_{timestamp}.csv")
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Device IP', 'Connection Status', 'PSN05 Present', 'PSN06 Present', 
            'PSN06 Auth Test', 'PSN05 Auth Test', 'Auth Working', 'Action Needed'
        ])
        
        for device_ip, result in audit_results.items():
            if result['connection_status'] == 'success':
                psn06_auth = result.get('auth_tests', {}).get('PSN06', {}).get('auth_test', 'N/A')
                psn05_auth = result.get('auth_tests', {}).get('PSN05', {}).get('auth_test', 'N/A')
                auth_working = 'Yes' if psn06_auth == 'pass' or psn05_auth == 'pass' else 'No'
                action_needed = 'None' if psn06_auth == 'pass' else 'Fix PSN06' if result['psn06_present'] else 'Add PSN06'
                
                writer.writerow([
                    device_ip, 
                    result['connection_status'], 
                    result['psn05_present'],
                    result['psn06_present'],
                    psn06_auth,
                    psn05_auth,
                    auth_working,
                    action_needed
                ])
            else:
                writer.writerow([device_ip, result['connection_status'], 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Connection Failed'])
    
    logging.info(f"Audit results saved to: {json_file}")
    logging.info(f"Audit summary saved to: {csv_file}")
    
    return json_file, csv_file

# === Section 6: Main Audit Function ===
def main():
    # Setup logging
    log_filename = setup_logging()
    logging.info("=== Enhanced PSN Audit Tool with Authentication Testing Started ===")
    
    # Create audit directory
    audit_dir = create_audit_dir()
    logging.info(f"Audit directory created: {audit_dir}")
    
    # Prompt for SSH Credentials
    print("=== Enhanced PSN Audit Tool with Authentication Testing ===")
    username = input("Enter your SSH username: ")
    password = getpass("Enter your SSH password: ")
    enable_password = getpass("Enter enable password (or press Enter if same as SSH): ")
    if not enable_password:
        enable_password = password
        print("Using SSH password for enable mode")
    
    # Get test credentials
    print("\n=== Test User Credentials ===")
    print("These will be used to test authentication on each PSN server")
    print(f"Current login user: {username}")
    
    use_different = input("Use different test account? (y/N - press Enter to use login credentials): ").strip().lower()
    
    if use_different == 'y':
        print("\nEnter separate test credentials:")
        test_username = input("Test username: ").strip()
        test_password = getpass("Test password: ")
    else:
        print("Using login credentials for testing")
        test_username = username
        test_password = password
    
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
            device_list = [line.strip() for line in file if line.strip() and not line.startswith('#')]
        logging.info(f"Loaded {len(device_list)} devices from {device_file_path}")
    except Exception as e:
        logging.error(f"Failed to read device file: {e}")
        return
    
    # Define PSN server information
    psn_servers = {
        'PSN06': {'ip': '172.18.31.101', 'name': 'PVA-M-ISE-PSN06'},
        'PSN05': {'ip': '172.18.31.102', 'name': 'PVA-M-ISE-PSN05'}
    }
    
    # Define PSN06 Config Checks
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
            "match": r"tacacs server PVA-M-ISE-PSN06\s+address ipv4",
            "remediation": [
                "tacacs server PVA-M-ISE-PSN06",
                " address ipv4 172.18.31.101",
                " key <TACACS_KEY_PLACEHOLDER>",
                "exit"
            ]
        },
        {
            "name": "RADIUS Server Definition PSN06-R",
            "match": r"radius server PVA-M-ISE-PSN06-R\s+address ipv4",
            "remediation": [
                "radius server PVA-M-ISE-PSN06-R",
                " address ipv4 172.18.31.101 auth-port 1645 acct-port 1646",
                " key <RADIUS_KEY_PLACEHOLDER>",
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
    devices_with_psn05 = 0
    devices_with_psn06 = 0
    devices_with_working_auth = 0
    
    # Connect to Devices and Audit
    for device_ip in device_list:
        print(f"\n{'='*60}")
        print(f"Auditing Device: {device_ip}")
        logging.info(f"Starting audit for device: {device_ip}")
        
        device = {
            'device_type': 'cisco_ios',
            'ip': device_ip,
            'username': username,
            'password': password,
            'secret': enable_password,
        }
        
        try:
            net_connect = connect_to_device(device)
            successful_connections += 1
            
            # Get running configuration
            print("Gathering configuration...")
            running_config = net_connect.send_command("show running-config")
            
            # Check for PSN05 presence
            psn05_check = net_connect.send_command("show run | include PVA-M-ISE-PSN05")
            has_psn05 = bool(psn05_check.strip())
            if has_psn05:
                devices_with_psn05 += 1
                print("  ⚠ PSN05 detected on this device!")
            
            # Initialize device audit results
            device_audit = {
                'connection_status': 'success',
                'audit_timestamp': datetime.now().isoformat(),
                'found_configs': [],
                'missing_configs': [],
                'remediation_commands': [],
                'psn05_present': has_psn05,
                'psn06_present': False,
                'auth_tests': {}
            }
            
            # Check all PSN06 configurations
            print("\nChecking PSN06 configurations:")
            psn06_found_count = 0
            for check in config_checks:
                print(f"  {check['name']}... ", end="")
                if re.search(check['match'], running_config, re.MULTILINE | re.DOTALL | re.IGNORECASE):
                    print("FOUND")
                    logging.info(f"Configuration found on {device_ip}: {check['name']}")
                    device_audit['found_configs'].append(check['name'])
                    psn06_found_count += 1
                else:
                    print("MISSING")
                    logging.warning(f"Configuration missing on {device_ip}: {check['name']}")
                    device_audit['missing_configs'].append(check['name'])
                    device_audit['remediation_commands'].extend(check['remediation'])
            
            # Set PSN06 present if at least TACACS config is found
            if any("PSN06" in config and "TACACS" in config for config in device_audit['found_configs']):
                device_audit['psn06_present'] = True
                devices_with_psn06 += 1
            
            # Get TACACS+ group name
            tacacs_group = get_tacacs_group_name(net_connect)
            if not tacacs_group:
                print("  ⚠ WARNING: Could not find TACACS+ group name, defaulting to ISE-TACACS")
                tacacs_group = "ISE-TACACS"
            else:
                print(f"  Found TACACS+ group: {tacacs_group}")
            
            # Test authentication for configured servers
            print("\nTesting server authentication:")
            
            # Test PSN06 if configured
            if device_audit['psn06_present']:
                device_audit['auth_tests']['PSN06'] = test_server_authentication(
                    net_connect, 'PSN06', psn_servers['PSN06']['ip'], 
                    test_username, test_password, tacacs_group, psn_servers['PSN06']['name']
                )
            
            # Test PSN05 if configured
            if has_psn05:
                device_audit['auth_tests']['PSN05'] = test_server_authentication(
                    net_connect, 'PSN05', psn_servers['PSN05']['ip'], 
                    test_username, test_password, tacacs_group, psn_servers['PSN05']['name']
                )
            
            # Check if any authentication is working
            auth_working = any(
                test.get('auth_test') == 'pass' 
                for test in device_audit['auth_tests'].values()
            )
            if auth_working:
                devices_with_working_auth += 1
                print("  ✓ At least one PSN server authentication is working")
            else:
                print("  ✗ WARNING: No working authentication found!")
            
            # Store audit results
            audit_results[device_ip] = device_audit
            
            # Update statistics
            if device_audit['missing_configs']:
                devices_needing_config += 1
            
            # Disconnect
            net_connect.disconnect()
            
        except Exception as e:
            failed_connections += 1
            logging.error(f"Failed to audit {device_ip}: {str(e)}")
            audit_results[device_ip] = {
                'connection_status': 'failed',
                'error': str(e),
                'audit_timestamp': datetime.now().isoformat()
            }
    
    # Save audit results
    json_file, csv_file = save_audit_results(audit_results, audit_dir)
    
    # Print summary
    print(f"\n{'='*60}")
    print("=== AUDIT SUMMARY ===")
    print(f"Total devices audited: {total_devices}")
    print(f"Successful connections: {successful_connections}")
    print(f"Failed connections: {failed_connections}")
    print(f"Devices with PSN05: {devices_with_psn05}")
    print(f"Devices with PSN06 configured: {devices_with_psn06}")
    print(f"Devices with working authentication: {devices_with_working_auth}")
    print(f"Devices needing PSN06 config: {devices_needing_config}")
    print(f"\nAudit results saved to: {json_file}")
    print(f"Summary CSV saved to: {csv_file}")
    print(f"Log file: {log_filename}")
    print(f"{'='*60}")
    
    # Show critical devices
    critical_devices = []
    for device_ip, result in audit_results.items():
        if result.get('connection_status') == 'success':
            auth_tests = result.get('auth_tests', {})
            if not any(test.get('auth_test') == 'pass' for test in auth_tests.values()):
                critical_devices.append(device_ip)
    
    if critical_devices:
        print("\n⚠️  CRITICAL: The following devices have NO working authentication:")
        for device in critical_devices:
            print(f"  - {device}")
        print("\nThese devices need immediate attention!")

if __name__ == "__main__":
    main()