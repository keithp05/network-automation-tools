# PSN Audit-Based Migration Script - Fixed v3 (with proper enable password handling)
from getpass import getpass
from netmiko import ConnectHandler
import tkinter as tk
from tkinter import filedialog
import json
import logging
import os
from datetime import datetime
import time

# === Setup Logging ===
def setup_logging():
    """Setup logging configuration"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(script_dir, "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = os.path.join(logs_dir, f"psn_audit_migration_fixed_v3_{timestamp}.log")
    
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
    """Create results directory"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    results_base_dir = os.path.join(script_dir, "migration_results")
    if not os.path.exists(results_base_dir):
        os.makedirs(results_base_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_dir = os.path.join(results_base_dir, f"migration_fixed_v3_{timestamp}")
    if not os.path.exists(results_dir):
        os.makedirs(results_dir)
    
    return results_dir

def manual_config_mode(net_connect, commands):
    """Manually handle configuration mode with timing"""
    try:
        # Enter config mode manually
        print("    Entering configuration mode manually...")
        output = net_connect.send_command_timing("configure terminal", delay_factor=2)
        time.sleep(1)
        
        # Check if we're in config mode
        prompt = net_connect.find_prompt()
        if "(config)" not in prompt:
            print(f"    WARNING: Expected config prompt but got: {prompt}")
        
        # Apply commands one by one
        for cmd in commands:
            if cmd.strip():  # Skip empty commands
                print(f"      Applying: {cmd}")
                output = net_connect.send_command_timing(cmd, delay_factor=1)
                if output and "Invalid" not in output and "Error" not in output:
                    logging.info(f"Command successful: {cmd}")
                else:
                    logging.warning(f"Command output: {output}")
                time.sleep(0.5)
        
        # Exit config mode
        print("    Exiting configuration mode...")
        net_connect.send_command_timing("end", delay_factor=2)
        time.sleep(1)
        
        return True
        
    except Exception as e:
        logging.error(f"Manual config mode failed: {e}")
        # Try to exit config mode if we're stuck
        try:
            net_connect.send_command_timing("end", delay_factor=2)
        except:
            pass
        return False

def get_psn05_removal_commands_ios():
    """Commands to remove PSN05 from IOS devices"""
    return [
        # Remove from server groups
        "aaa group server tacacs+ ISE-TACACS",
        "no server name PVA-M-ISE-PSN05",
        "exit",

        "aaa group server radius ISE-RADIUS",
        "no server name PVA-M-ISE-PSN05-R",
        "exit",

        # Remove server definitions
        "no tacacs server PVA-M-ISE-PSN05",
        "no radius server PVA-M-ISE-PSN05-R"
    ]

def get_psn05_removal_commands_nxos():
    """Commands to remove PSN05 from NX-OS devices"""
    return [
        # Remove from server groups
        "aaa group server tacacs+ ISE",
        "no server 172.18.31.102",
        "exit",

        # Remove tacacs-server host definitions
        "no tacacs-server host 172.18.31.102"
    ]

def check_psn05_present(net_connect, device_type='cisco_ios'):
    """Check if PSN05 is configured on the device"""
    if device_type == 'cisco_nxos':
        # For NX-OS, check for PSN05 IP address (172.18.31.102)
        output = net_connect.send_command("show run | include 172.18.31.102")
    else:
        # For IOS, check for PSN05 server name
        output = net_connect.send_command("show run | include PVA-M-ISE-PSN05")
    return bool(output.strip())

def detect_device_type(device_ip, username, password, enable_password):
    """Detect if device is Cisco IOS or Nexus"""
    # Try IOS first
    device = {
        'device_type': 'cisco_ios',
        'ip': device_ip,
        'username': username,
        'password': password,
        'secret': enable_password,
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

def ensure_enable_mode(net_connect, enable_password=None):
    """Ensure we're in enable mode with better error handling"""
    prompt = net_connect.find_prompt()
    logging.info(f"Initial prompt: {prompt}")

    if '>' in prompt:
        print("    Entering enable mode...")
        try:
            # Try automatic enable first
            net_connect.enable()
            logging.info("Enable mode successful (automatic)")
        except Exception as e:
            logging.warning(f"Automatic enable failed: {e}, trying manual with password")
            if enable_password:
                # Try manual enable with password
                try:
                    net_connect.send_command_timing("enable")
                    time.sleep(1)
                    # Send password when prompted
                    net_connect.send_command_timing(enable_password, strip_prompt=False, strip_command=False)
                    time.sleep(2)
                except Exception as manual_e:
                    logging.error(f"Manual enable also failed: {manual_e}")
                    raise Exception(f"Could not enter enable mode: {manual_e}")

    # Verify we're in enable mode
    final_prompt = net_connect.find_prompt()
    if '#' not in final_prompt:
        raise Exception(f"Could not enter enable mode. Final prompt: {final_prompt}")

    logging.info(f"Successfully in enable mode: {final_prompt}")
    return True

# === Main Function ===
def main():
    print("=== PSN Audit-Based Migration Tool (Fixed v3) ===")
    print("This version includes proper enable password handling.\n")
    
    log_filename = setup_logging()
    results_dir = create_results_dir()
    
    logging.info("=== PSN Audit-Based Migration Tool (Fixed v3) Started ===")
    logging.info(f"Results directory created: {results_dir}")
    
    # Get credentials
    print("=== Enter Credentials ===")
    username = input("Enter SSH username: ").strip()
    password = getpass("Enter SSH password: ")
    enable_password = getpass("Enter enable password (press Enter if same as SSH password): ")
    if not enable_password:
        enable_password = password
    
    # Get TACACS key
    print("\nEnter TACACS+ key for PSN06 server:")
    tacacs_key = getpass("TACACS+ key: ")
    
    # File selection
    print("\nSelect the remediation JSON file from the PSN audit:")
    root = tk.Tk()
    root.withdraw()
    remediation_file = filedialog.askopenfilename(
        title="Select remediation JSON file",
        filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
    )
    
    if not remediation_file:
        print("No remediation file selected. Exiting.")
        return
    
    # Load remediation data
    with open(remediation_file, 'r') as f:
        remediation_data = json.load(f)
    logging.info(f"Loaded remediation data for {len(remediation_data)} devices")
    
    print(f"\nNow select the COMPLETE device list file:")
    device_file = filedialog.askopenfilename(
        title="Select device list file",
        filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
    )
    root.destroy()
    
    if not device_file:
        print("No device file selected. Exiting.")
        return
    
    # Load all devices
    with open(device_file, 'r') as f:
        all_devices = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    logging.info(f"Loaded {len(all_devices)} total devices")
    
    # Replace TACACS key placeholder in remediation commands
    for device_ip, config_data in remediation_data.items():
        for i, cmd in enumerate(config_data['remediation_commands']):
            if '<TACACS_KEY_PLACEHOLDER>' in cmd:
                config_data['remediation_commands'][i] = f" key {tacacs_key}"
    
    # Results tracking
    results = {
        'psn06_added': [],
        'psn05_removed': [],
        'fully_migrated': [],
        'already_migrated': [],
        'failed': [],
        'details': {}
    }
    
    # Process all devices
    total_devices = len(all_devices)
    current_device = 0
    
    print(f"\n=== Processing {total_devices} Devices ===\n")
    
    for device_ip in all_devices:
        current_device += 1
        print(f"[{current_device}/{total_devices}] Processing {device_ip}...")
        logging.info(f"Starting migration for device: {device_ip}")

        try:
            # Detect device type first
            print(f"  Detecting device type...")
            device_type = detect_device_type(device_ip, username, password, enable_password)
            print(f"  Device type: {device_type}")

            device = {
                'device_type': device_type,
                'ip': device_ip,
                'username': username,
                'password': password,
                'secret': enable_password,  # IMPORTANT: Add enable password here
                'global_delay_factor': 2,
                'timeout': 30,
                'session_log': os.path.join(results_dir, f"session_{device_ip.replace('.', '_')}.log")
            }

            # Connect to device
            net_connect = ConnectHandler(**device)
            logging.info(f"Connected to {device_ip} (device_type: {device_type})")
            
            # Ensure we're in enable mode
            ensure_enable_mode(net_connect, enable_password)

            # Check if PSN05 is present
            has_psn05 = check_psn05_present(net_connect, device_type)
            needs_psn06 = device_ip in remediation_data

            actions_taken = []

            # Add PSN06 if needed (from remediation file)
            if needs_psn06:
                print(f"  Adding PSN06 configurations...")
                config_commands = remediation_data[device_ip]['remediation_commands']
                success = manual_config_mode(net_connect, config_commands)

                if success:
                    actions_taken.append("Added PSN06")
                    results['psn06_added'].append(device_ip)
                    logging.info(f"Added PSN06 configurations to {device_ip}")
                else:
                    raise Exception("Failed to add PSN06 configurations")

            # Remove PSN05 if present
            if has_psn05:
                print(f"  Removing PSN05 configurations...")
                # Select appropriate removal commands based on device type
                if device_type == 'cisco_nxos':
                    removal_commands = get_psn05_removal_commands_nxos()
                    print(f"    Using NX-OS PSN05 removal commands")
                else:
                    removal_commands = get_psn05_removal_commands_ios()
                    print(f"    Using IOS PSN05 removal commands")

                success = manual_config_mode(net_connect, removal_commands)

                if success:
                    actions_taken.append("Removed PSN05")
                    results['psn05_removed'].append(device_ip)
                    logging.info(f"Removed PSN05 configurations from {device_ip}")
                else:
                    logging.warning(f"Failed to remove PSN05 from {device_ip}")
            
            # Save configuration if any changes were made
            if actions_taken:
                print("  Saving configuration...")
                save_output = net_connect.send_command_timing("write memory", delay_factor=3)
                logging.info(f"Configuration saved: {save_output}")
                
                results['fully_migrated'].append(device_ip)
                results['details'][device_ip] = {
                    'status': 'migrated',
                    'actions': actions_taken,
                    'device_type': device_type
                }
                print(f"  ✓ SUCCESS: {', '.join(actions_taken)}")
            else:
                # No changes needed
                print("  ✓ Already migrated (PSN06 present, PSN05 absent)")
                results['already_migrated'].append(device_ip)
                results['details'][device_ip] = {
                    'status': 'already_migrated',
                    'actions': [],
                    'device_type': device_type
                }
            
            net_connect.disconnect()
            logging.info(f"Disconnected from {device_ip}")
            
        except Exception as e:
            error_msg = f"Failed to process {device_ip}: {str(e)}"
            print(f"  ✗ ERROR: {str(e)}")
            logging.error(error_msg)
            results['failed'].append(device_ip)
            results['details'][device_ip] = {
                'status': 'failed',
                'error': str(e),
                'device_type': 'UNKNOWN'
            }
    
    # Save detailed results
    results_file = os.path.join(results_dir, "migration_results.json")
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Create summary report
    summary_file = os.path.join(results_dir, "migration_summary.txt")
    with open(summary_file, 'w') as f:
        f.write("PSN Audit-Based Migration Summary (Fixed v3)\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Migration completed: {datetime.now()}\n")
        f.write(f"Total devices processed: {total_devices}\n\n")
        
        f.write("Actions Summary:\n")
        f.write(f"  Devices where PSN06 was added: {len(results['psn06_added'])}\n")
        f.write(f"  Devices where PSN05 was removed: {len(results['psn05_removed'])}\n")
        f.write(f"  Devices fully migrated: {len(results['fully_migrated'])}\n")
        f.write(f"  Devices already migrated: {len(results['already_migrated'])}\n")
        f.write(f"  Failed devices: {len(results['failed'])}\n\n")
        
        if results['fully_migrated']:
            f.write("Fully Migrated Devices:\n")
            for ip in results['fully_migrated']:
                actions = results['details'][ip]['actions']
                f.write(f"  {ip}: {', '.join(actions)}\n")
    
    # Print summary
    print("\n" + "=" * 70)
    print("=== MIGRATION SUMMARY (FIXED v3) ===")
    print(f"Total devices processed: {total_devices}")
    print(f"\nActions taken:")
    print(f"  PSN06 added to: {len(results['psn06_added'])} devices")
    print(f"  PSN05 removed from: {len(results['psn05_removed'])} devices")
    print(f"  Fully migrated: {len(results['fully_migrated'])} devices")
    print(f"  Already migrated: {len(results['already_migrated'])} devices")
    print(f"  Failed: {len(results['failed'])} devices")
    
    print(f"\n=== OUTPUT FILES ===")
    print(f"Detailed results: {results_file}")
    print(f"Summary report: {summary_file}")
    print(f"Log file: {log_filename}")
    
    logging.info("=== PSN Audit-Based Migration Tool (Fixed v3) Completed ===")

if __name__ == "__main__":
    main()