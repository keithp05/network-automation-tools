from getpass import getpass
from netmiko import ConnectHandler
import tkinter as tk
from tkinter import filedialog
import logging
import os
import json
import csv
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import queue

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
    log_filename = os.path.join(logs_dir, f"cisco_push_log_{timestamp}.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler()
        ]
    )
    return log_filename

# === Section 2: Create Results Directory ===
def create_results_dir():
    """Create results directory if it doesn't exist"""
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create results folder within script directory
    results_base_dir = os.path.join(script_dir, "push_results")
    if not os.path.exists(results_base_dir):
        os.makedirs(results_base_dir)
    
    # Create timestamped results folder within results directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_dir = os.path.join(results_base_dir, f"push_results_{timestamp}")
    if not os.path.exists(results_dir):
        os.makedirs(results_dir)
    
    return results_dir

# === Section 3: Create Backup Directory ===
def create_backup_dir():
    """Create backup directory if it doesn't exist"""
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create backups folder within script directory
    backups_base_dir = os.path.join(script_dir, "backups")
    if not os.path.exists(backups_base_dir):
        os.makedirs(backups_base_dir)
    
    # Create timestamped backup folder within backups directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(backups_base_dir, f"config_backups_{timestamp}")
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    return backup_dir

# === Section 4: Backup Configuration ===
def backup_config(net_connect, device_ip, backup_dir):
    """Backup device configuration before making changes"""
    try:
        running_config = net_connect.send_command("show running-config")
        backup_filename = os.path.join(backup_dir, f"{device_ip}_backup.cfg")
        
        with open(backup_filename, 'w') as backup_file:
            backup_file.write(running_config)
        
        logging.info(f"Configuration backup created: {backup_filename}")
        return True
    except Exception as e:
        logging.error(f"Failed to backup config for {device_ip}: {e}")
        return False

# === Section 5: Apply Configuration Function ===
def apply_config_to_device(device_ip, username, password, commands, backup_dir, tacacs_key):
    """Apply configuration to a single device (thread-safe)"""
    device_result = {
        'device_ip': device_ip,
        'status': 'failed',
        'start_time': datetime.now().isoformat(),
        'end_time': None,
        'backup_created': False,
        'configs_applied': 0,
        'error': None,
        'commands_executed': []
    }
    
    device = {
        'device_type': 'cisco_ios',
        'ip': device_ip,
        'username': username,
        'password': password,
    }
    
    try:
        # Connect to device
        net_connect = ConnectHandler(**device, timeout=30)
        logging.info(f"Successfully connected to {device_ip}")
        
        # Backup configuration
        device_result['backup_created'] = backup_config(net_connect, device_ip, backup_dir)
        
        # Apply configurations
        net_connect.enable()
        net_connect.config_mode()
        
        # Replace TACACS key placeholder with actual key
        processed_commands = []
        for cmd in commands:
            if '<TACACS_KEY_PLACEHOLDER>' in cmd:
                processed_cmd = cmd.replace('<TACACS_KEY_PLACEHOLDER>', tacacs_key)
                processed_commands.append(processed_cmd)
            else:
                processed_commands.append(cmd)
        
        # Execute commands
        for cmd in processed_commands:
            logging.info(f"Applying command on {device_ip}: {cmd}")
            result = net_connect.send_command(cmd.strip())
            device_result['commands_executed'].append({
                'command': cmd.strip(),
                'output': result
            })
            
            # Check for common error patterns
            if any(error in result.lower() for error in ['invalid', 'error', 'failed']):
                logging.warning(f"Possible error in command output on {device_ip}: {result}")
        
        net_connect.exit_config_mode()
        
        # Save configuration
        save_result = net_connect.send_command("write memory")
        logging.info(f"Configuration saved on {device_ip}: {save_result}")
        
        device_result['configs_applied'] = len(processed_commands)
        device_result['status'] = 'success'
        
        net_connect.disconnect()
        logging.info(f"Successfully applied configuration to {device_ip}")
        
    except Exception as e:
        error_msg = f"Failed to apply configuration to {device_ip}: {e}"
        logging.error(error_msg)
        device_result['error'] = str(e)
    
    device_result['end_time'] = datetime.now().isoformat()
    return device_result

# === Section 6: Save Push Results ===
def save_push_results(push_results, results_dir):
    """Save push results in multiple formats"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save as JSON (detailed format)
    json_file = os.path.join(results_dir, f"push_results_{timestamp}.json")
    with open(json_file, 'w') as f:
        json.dump(push_results, f, indent=2)
    
    # Save as CSV (summary format)
    csv_file = os.path.join(results_dir, f"push_summary_{timestamp}.csv")
    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Device IP', 'Status', 'Backup Created', 'Configs Applied', 'Start Time', 'End Time', 'Error'])
        
        for result in push_results:
            writer.writerow([
                result['device_ip'],
                result['status'],
                result['backup_created'],
                result['configs_applied'],
                result['start_time'],
                result['end_time'],
                result.get('error', '')
            ])
    
    logging.info(f"Push results saved to: {json_file}")
    logging.info(f"Push summary saved to: {csv_file}")
    
    return json_file, csv_file

# === Section 7: Main Push Function ===
def main():
    # Setup logging
    log_filename = setup_logging()
    logging.info("=== PSN06 Config Push Tool Started (Multi-threaded) ===")
    
    # Create results and backup directories
    results_dir = create_results_dir()
    backup_dir = create_backup_dir()
    logging.info(f"Results directory created: {results_dir}")
    logging.info(f"Backup directory created: {backup_dir}")
    
    # Prompt for SSH Credentials
    print("=== PSN06 Config Push Tool (Multi-threaded) ===")
    username = input("Enter your SSH username: ")
    password = getpass("Enter your SSH password: ")
    
    # Prompt for TACACS key
    print("\nTACACS+ Configuration:")
    tacacs_key = getpass("Enter the TACACS+ key: ")
    
    # File Explorer to Select Remediation File
    print("\nPlease select the remediation JSON file from the audit tool.")
    root = tk.Tk()
    root.withdraw()
    remediation_file_path = filedialog.askopenfilename(
        title="Select Remediation JSON File", 
        filetypes=[("JSON Files", "*.json")]
    )
    
    if not remediation_file_path:
        logging.error("No remediation file selected. Exiting.")
        return
    
    # Load Remediation Data
    try:
        with open(remediation_file_path, 'r') as file:
            remediation_data = json.load(file)
        logging.info(f"Loaded remediation data for {len(remediation_data)} devices")
    except Exception as e:
        logging.error(f"Failed to read remediation file: {e}")
        return
    
    if not remediation_data:
        print("No devices need configuration updates.")
        return
    
    # Get thread count
    print(f"\nFound {len(remediation_data)} devices that need configuration updates.")
    max_threads = min(len(remediation_data), 10)  # Cap at 10 threads
    
    while True:
        try:
            thread_count = input(f"Enter number of concurrent threads (1-{max_threads}) [default: 5]: ").strip()
            if not thread_count:
                thread_count = 5
            else:
                thread_count = int(thread_count)
            
            if 1 <= thread_count <= max_threads:
                break
            else:
                print(f"Please enter a number between 1 and {max_threads}")
        except ValueError:
            print("Please enter a valid number")
    
    # Confirmation
    print(f"\n=== CONFIGURATION PUSH SUMMARY ===")
    print(f"Devices to configure: {len(remediation_data)}")
    print(f"Concurrent threads: {thread_count}")
    print(f"Backup directory: {backup_dir}")
    
    confirm = input("\nDo you want to proceed with the configuration push? (yes/no): ").strip().lower()
    if confirm not in ['yes', 'y']:
        print("Configuration push cancelled.")
        return
    
    # Execute multi-threaded configuration push
    print(f"\n=== Starting Multi-threaded Configuration Push ===")
    push_results = []
    
    # Create thread pool and execute
    with ThreadPoolExecutor(max_workers=thread_count) as executor:
        # Submit all tasks
        future_to_device = {
            executor.submit(
                apply_config_to_device,
                device_ip,
                username,
                password,
                data['remediation_commands'],
                backup_dir,
                tacacs_key
            ): device_ip
            for device_ip, data in remediation_data.items()
        }
        
        # Process completed tasks
        completed = 0
        for future in as_completed(future_to_device):
            device_ip = future_to_device[future]
            try:
                result = future.result()
                push_results.append(result)
                completed += 1
                
                status_msg = f"[{completed}/{len(remediation_data)}] {device_ip}: {result['status'].upper()}"
                if result['status'] == 'failed':
                    status_msg += f" - {result.get('error', 'Unknown error')}"
                
                print(status_msg)
                
            except Exception as e:
                logging.error(f"Thread execution failed for {device_ip}: {e}")
                push_results.append({
                    'device_ip': device_ip,
                    'status': 'failed',
                    'error': str(e),
                    'start_time': datetime.now().isoformat(),
                    'end_time': datetime.now().isoformat(),
                    'backup_created': False,
                    'configs_applied': 0,
                    'commands_executed': []
                })
    
    # Save push results
    json_file, csv_file = save_push_results(push_results, results_dir)
    
    # Calculate statistics
    successful_pushes = sum(1 for result in push_results if result['status'] == 'success')
    failed_pushes = len(push_results) - successful_pushes
    total_configs_applied = sum(result['configs_applied'] for result in push_results)
    
    # Final Summary
    print(f"\n=== PUSH SUMMARY ===")
    print(f"Total devices processed: {len(push_results)}")
    print(f"Successful pushes: {successful_pushes}")
    print(f"Failed pushes: {failed_pushes}")
    print(f"Total configurations applied: {total_configs_applied}")
    print(f"\n=== OUTPUT FILES ===")
    print(f"Detailed push results: {json_file}")
    print(f"Push summary: {csv_file}")
    print(f"Configuration backups: {backup_dir}")
    print(f"Log file: {log_filename}")
    
    logging.info("=== PSN06 Config Push Tool Completed ===")
    logging.info(f"Summary - Total: {len(push_results)}, Success: {successful_pushes}, Failed: {failed_pushes}, Configs Applied: {total_configs_applied}")
    
    # Show failed devices if any
    if failed_pushes > 0:
        print(f"\n=== FAILED DEVICES ===")
        for result in push_results:
            if result['status'] == 'failed':
                print(f"- {result['device_ip']}: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    main()
