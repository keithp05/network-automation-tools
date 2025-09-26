#!/usr/bin/env python3
"""
PSN Migration with Authentication Testing
Adds PSN01/PSN06, tests authentication, only removes PSN05 if tests pass
"""
from getpass import getpass
from netmiko import ConnectHandler
import tkinter as tk
from tkinter import filedialog
import logging
import os
from datetime import datetime
import time
import json

def setup_logging():
    """Setup logging configuration"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(script_dir, "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(logs_dir, f"psn_migration_auth_test_{timestamp}.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler()
        ]
    )
    return log_filename

def create_results_dir():
    """Create results directory for test reports"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    results_base_dir = os.path.join(script_dir, "migration_results")
    if not os.path.exists(results_base_dir):
        os.makedirs(results_base_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_dir = os.path.join(results_base_dir, f"migration_auth_test_{timestamp}")
    if not os.path.exists(results_dir):
        os.makedirs(results_dir)
    
    return results_dir

def get_psn_commands(server_name, server_ip, tacacs_key, radius_key):
    """Get PSN server configuration commands"""
    return [
        # TACACS server
        f"tacacs server {server_name}",
        f" address ipv4 {server_ip}",
        f" key {tacacs_key}",
        " timeout 10",
        "exit",
        
        # RADIUS server
        f"radius server {server_name}-R",
        f" address ipv4 {server_ip} auth-port 1645 acct-port 1646",
        f" key {radius_key}",
        "exit",
        
        # Add to TACACS+ group
        "aaa group server tacacs+ ISE-TACACS",
        f" server name {server_name}",
        "exit",
        
        # Add to RADIUS group
        "aaa group server radius ISE-RADIUS",
        f" server name {server_name}-R",
        "exit"
    ]

def get_psn05_removal_commands():
    """Commands to remove PSN05 from any device"""
    return [
        # Remove from groups first
        "aaa group server tacacs+ ISE-TACACS",
        " no server name PVA-M-ISE-PSN05",
        "exit",
        
        "aaa group server radius ISE-RADIUS", 
        " no server name PVA-M-ISE-PSN05-R",
        "exit",
        
        # Then remove server definitions
        "no tacacs server PVA-M-ISE-PSN05",
        "no radius server PVA-M-ISE-PSN05-R"
    ]

def get_server_ips(net_connect):
    """
    Get server IP addresses from device configuration
    Parses tacacs server blocks:
    tacacs server [name]
     address ipv4 [ip]
     key [key]
     timeout [timeout]
    Returns: dict with server names and their IPs
    """
    server_ips = {}
    try:
        # Get TACACS server configurations
        tacacs_output = net_connect.send_command("show run | section tacacs server")
        current_server = None
        
        for line in tacacs_output.split('\n'):
            line = line.strip()
            if line.startswith('tacacs server '):
                # Extract server name: tacacs server SERVER-NAME
                parts = line.split()
                if len(parts) >= 3:
                    current_server = parts[2]
            elif current_server and line.startswith('address ipv4 '):
                # Extract IP address: address ipv4 IP-ADDRESS
                parts = line.split()
                if len(parts) >= 3:
                    ip = parts[2]
                    server_ips[current_server] = ip
            elif line and not line.startswith(' ') and current_server:
                # End of current server block if we hit a non-indented line
                current_server = None
                    
        logging.info(f"Found server IPs: {server_ips}")
        return server_ips
    except Exception as e:
        logging.error(f"Error getting server IPs: {e}")
        return {}

def test_tacacs_authentication(net_connect, device_ip, test_username, test_password):
    """
    Test TACACS+ authentication by checking AAA test command
    Returns: (success, details)
    """
    print("    Testing TACACS+ authentication...")
    try:
        # Get server IP addresses from configuration
        server_ips = get_server_ips(net_connect)
        
        # Test each configured server (skip PSN05 since we're migrating away from it)
        test_results = {}
        for server_name, server_ip in server_ips.items():
            if 'PSN05' not in server_name:  # Test any PSN server except PSN05
                print(f"      Testing {server_name} ({server_ip})...")
                test_cmd = f"test aaa group ISE-TACACS server {server_ip} {test_username} {test_password} legacy"
                output = net_connect.send_command(test_cmd, delay_factor=2)
                
                # Check if authentication was successful
                success = "successfully authenticated" in output.lower() or "User was successfully authenticated" in output
                test_results[server_name] = {'ip': server_ip, 'success': success, 'output': output}
        
        # Check if any non-PSN05 servers are working
        working_servers = [name for name, result in test_results.items() if result['success']]
        
        if working_servers:
            success_msg = f"TACACS+ test passed ({', '.join(working_servers)} responding)"
            print(f"      ✓ {success_msg}")
            logging.info(f"{device_ip}: {success_msg}")
            return True, success_msg
        else:
            fail_msg = "TACACS+ test failed - no PSN01/PSN06 response"
            print(f"      ✗ {fail_msg}")
            logging.warning(f"{device_ip}: {fail_msg}")
            for server_name, result in test_results.items():
                logging.debug(f"Test output for {server_name}: {result['output']}")
            return False, fail_msg
            
    except Exception as e:
        error_msg = f"TACACS+ test error: {str(e)}"
        print(f"      ✗ {error_msg}")
        logging.error(f"{device_ip}: {error_msg}")
        return False, error_msg

def test_radius_authentication(net_connect, device_ip):
    """
    Test RADIUS authentication 
    Returns: (success, details)
    """
    print("    Testing RADIUS authentication...")
    try:
        # First check if RADIUS servers are configured and reachable
        radius_check = net_connect.send_command("show aaa servers | include PVA-M-ISE-PSN")
        
        psn01_r_present = "PVA-M-ISE-PSN01-R" in radius_check
        psn06_r_present = "PVA-M-ISE-PSN06-R" in radius_check
        
        if psn01_r_present or psn06_r_present:
            servers = []
            if psn01_r_present:
                servers.append("PSN01-R")
            if psn06_r_present:
                servers.append("PSN06-R")
            success_msg = f"RADIUS servers configured ({', '.join(servers)})"
            print(f"      ✓ {success_msg}")
            logging.info(f"{device_ip}: {success_msg}")
            return True, success_msg
        else:
            fail_msg = "RADIUS test failed - PSN01-R/PSN06-R not found"
            print(f"      ✗ {fail_msg}")
            logging.warning(f"{device_ip}: {fail_msg}")
            return False, fail_msg
            
    except Exception as e:
        error_msg = f"RADIUS test error: {str(e)}"
        print(f"      ✗ {error_msg}")
        logging.error(f"{device_ip}: {error_msg}")
        return False, error_msg

def apply_config_commands(net_connect, commands):
    """Apply configuration commands"""
    try:
        # Enter config mode
        print("    Entering configuration mode...")
        net_connect.config_mode()
        time.sleep(1)
        
        # Apply commands one by one
        for cmd in commands:
            if cmd.strip():
                print(f"      Applying: {cmd}")
                output = net_connect.send_command_timing(cmd, delay_factor=1)
                
                # Check for errors
                if any(err in output for err in ["Invalid", "Error", "Unrecognized", "Incomplete"]):
                    logging.error(f"Command error for '{cmd}': {output}")
                    print(f"        ERROR: {output}")
                    raise Exception(f"Configuration command failed: {cmd}")
                else:
                    logging.info(f"Command successful: {cmd}")
                    
                time.sleep(0.5)
        
        # Exit config mode
        print("    Exiting configuration mode...")
        net_connect.exit_config_mode()
        time.sleep(1)
        
        return True
        
    except Exception as e:
        logging.error(f"Config mode failed: {e}")
        try:
            net_connect.send_command_timing("end", delay_factor=2)
        except:
            pass
        return False

def check_psn05_present(net_connect):
    """Check if PSN05 is configured on the device"""
    output = net_connect.send_command("show run | include PVA-M-ISE-PSN05")
    return bool(output.strip())

def main():
    print("=== PSN Migration Tool with Authentication Testing ===")
    print("Adds new PSN server, tests auth, removes PSN05 only if tests pass\n")
    
    log_filename = setup_logging()
    results_dir = create_results_dir()
    
    # Get credentials
    print("=== Enter Credentials ===")
    username = input("Enter SSH username: ").strip()
    password = getpass("Enter SSH password: ")
    
    # Get PSN server details
    print("\n=== Enter PSN Server Details ===")
    server_name = input("Enter PSN server name (e.g., PVA-M-ISE-PSN06): ").strip()
    server_ip = input("Enter PSN server IP address: ").strip()
    
    # Get server keys
    print(f"\n=== Enter Keys for {server_name} ===")
    tacacs_key = getpass(f"TACACS+ key for {server_name}: ")
    
    print(f"RADIUS key for {server_name}-R:")
    print("(Press Enter to use the same key as TACACS+)")
    radius_key = getpass("RADIUS key: ")
    
    if not radius_key:
        print("Using TACACS+ key for RADIUS")
        radius_key = tacacs_key
    
    # Get test credentials for authentication testing
    print(f"\n=== Enter Test Credentials for Authentication Testing ===")
    print("These credentials will be used to test if the PSN servers are working:")
    test_username = input("Test username: ").strip()
    test_password = getpass("Test password: ")
    
    # Get audit results file
    print("\nSelect audit results JSON file (from audit script):")
    root = tk.Tk()
    root.withdraw()
    audit_file = filedialog.askopenfilename(
        title="Select audit results JSON file",
        filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
    )
    root.destroy()
    
    if not audit_file:
        print("No audit file selected. Exiting.")
        return
    
    # Load audit results
    with open(audit_file, 'r') as f:
        audit_data = json.load(f)
    
    # Get devices that need migration (have missing configs or auth failures)
    devices_to_migrate = []
    for device_ip, result in audit_data.items():
        if result.get('connection_status') == 'success':
            # Check if device needs PSN06 or has auth issues
            auth_tests = result.get('auth_tests', {})
            psn06_auth = auth_tests.get('PSN06', {}).get('auth_test', 'fail')
            if psn06_auth != 'pass' or not result.get('psn06_present', False):
                devices_to_migrate.append(device_ip)
    
    devices = devices_to_migrate
    print(f"\nFound {len(devices)} devices that need migration from audit results")
    
    # Get PSN commands
    psn_commands = get_psn_commands(
        server_name, server_ip,
        tacacs_key, radius_key
    )
    
    # Results tracking
    results = {
        'psn_added': [],
        'auth_test_passed': [],
        'auth_test_failed': [],
        'psn05_removed': [],
        'psn05_kept': [],
        'failed': [],
        'details': {}
    }
    
    print(f"\n=== Processing {len(devices)} Devices ===\n")
    
    for device_ip in devices:
        print(f"Processing {device_ip}...")
        device_result = {
            'psn_added': False,
            'auth_test': None,
            'psn05_removed': False,
            'error': None
        }
        
        device = {
            'device_type': 'cisco_ios',
            'ip': device_ip,
            'username': username,
            'password': password,
            'global_delay_factor': 2,
            'timeout': 30
        }
        
        try:
            # Connect
            net_connect = ConnectHandler(**device)
            print(f"  Connected to {device_ip}")
            
            # Check prompt
            prompt = net_connect.find_prompt()
            if '#' not in prompt:
                print(f"  ERROR: Not in enable mode. Prompt: {prompt}")
                device_result['error'] = "Not in enable mode"
                results['failed'].append(device_ip)
                net_connect.disconnect()
                continue
            
            # Step 1: Add PSN01 + PSN06
            print("  Step 1: Adding PSN01 and PSN06 configurations...")
            if apply_config_commands(net_connect, psn_commands):
                print("  ✓ PSN01 and PSN06 configured")
                device_result['psn_added'] = True
                results['psn_added'].append(device_ip)
                
                # Step 2: Save config before testing
                print("  Step 2: Saving configuration...")
                net_connect.send_command("write memory")
                time.sleep(2)
                
                # Step 3: Test authentication
                print("  Step 3: Testing authentication...")
                tacacs_ok, tacacs_details = test_tacacs_authentication(net_connect, device_ip, test_username, test_password)
                radius_ok, radius_details = test_radius_authentication(net_connect, device_ip)
                
                auth_passed = tacacs_ok and radius_ok
                device_result['auth_test'] = {
                    'passed': auth_passed,
                    'tacacs': {'result': tacacs_ok, 'details': tacacs_details},
                    'radius': {'result': radius_ok, 'details': radius_details}
                }
                
                if auth_passed:
                    print("  ✓ Authentication tests PASSED")
                    results['auth_test_passed'].append(device_ip)
                    
                    # Step 4: Check and remove PSN05 only if tests passed
                    if check_psn05_present(net_connect):
                        print("  Step 4: Removing PSN05 (auth tests passed)...")
                        removal_commands = get_psn05_removal_commands()
                        if apply_config_commands(net_connect, removal_commands):
                            print("  ✓ PSN05 removed successfully")
                            device_result['psn05_removed'] = True
                            results['psn05_removed'].append(device_ip)
                            
                            # Save after removal
                            net_connect.send_command("write memory")
                        else:
                            print("  ✗ Failed to remove PSN05")
                    else:
                        print("  ℹ PSN05 not present on device")
                else:
                    print("  ✗ Authentication tests FAILED - PSN05 will NOT be removed")
                    results['auth_test_failed'].append(device_ip)
                    results['psn05_kept'].append(device_ip)
                    device_result['psn05_removed'] = False
                    
            else:
                print("  ✗ Failed to add PSN01/PSN06 configurations")
                device_result['error'] = "Failed to add PSN configurations"
                results['failed'].append(device_ip)
            
            net_connect.disconnect()
            
        except Exception as e:
            error_msg = str(e)
            print(f"  ✗ ERROR: {error_msg}")
            logging.error(f"Failed to process {device_ip}: {error_msg}")
            device_result['error'] = error_msg
            results['failed'].append(device_ip)
        
        results['details'][device_ip] = device_result
        print()  # Blank line between devices
    
    # Save detailed results
    results_file = os.path.join(results_dir, "migration_results.json")
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Create summary report
    summary_file = os.path.join(results_dir, "migration_summary.txt")
    with open(summary_file, 'w') as f:
        f.write("PSN Migration with Authentication Testing - Summary\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Migration completed: {datetime.now()}\n")
        f.write(f"Total devices processed: {len(devices)}\n\n")
        
        f.write("Results:\n")
        f.write(f"  PSN01/PSN06 added: {len(results['psn_added'])} devices\n")
        f.write(f"  Auth tests passed: {len(results['auth_test_passed'])} devices\n")
        f.write(f"  Auth tests failed: {len(results['auth_test_failed'])} devices\n")
        f.write(f"  PSN05 removed: {len(results['psn05_removed'])} devices\n")
        f.write(f"  PSN05 kept (auth failed): {len(results['psn05_kept'])} devices\n")
        f.write(f"  Failed to process: {len(results['failed'])} devices\n\n")
        
        if results['auth_test_failed']:
            f.write("Devices with failed auth tests (PSN05 kept):\n")
            for ip in results['auth_test_failed']:
                details = results['details'][ip]['auth_test']
                f.write(f"  {ip}:\n")
                f.write(f"    TACACS: {details['tacacs']['details']}\n")
                f.write(f"    RADIUS: {details['radius']['details']}\n")
    
    # Print summary
    print("=" * 70)
    print("=== MIGRATION SUMMARY ===")
    print(f"Total devices: {len(devices)}")
    print(f"\nResults:")
    print(f"  PSN01/PSN06 added: {len(results['psn_added'])}")
    print(f"  Auth tests passed: {len(results['auth_test_passed'])}")
    print(f"  Auth tests failed: {len(results['auth_test_failed'])}")
    print(f"  PSN05 removed: {len(results['psn05_removed'])}")
    print(f"  PSN05 kept: {len(results['psn05_kept'])}")
    print(f"  Failed: {len(results['failed'])}")
    
    if results['auth_test_failed']:
        print(f"\n⚠️  PSN05 was kept on {len(results['auth_test_failed'])} devices due to auth test failures")
        print("   Check the summary report for details")
    
    print(f"\n=== OUTPUT FILES ===")
    print(f"Results: {results_file}")
    print(f"Summary: {summary_file}")
    print(f"Log: {log_filename}")

if __name__ == "__main__":
    main()