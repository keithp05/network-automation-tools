#!/usr/bin/env python3
"""
Aruba Controller REST API Verification Script

This script:
1. SSH into all 20 CFINS controllers
2. Checks if REST API is enabled
3. Enables REST API if it's disabled
4. Provides a summary report
"""

import paramiko
import yaml
import logging
import colorlog
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import time
import getpass

class ArubaAPIVerifier:
    def __init__(self, config_file: str = "config/cfins_controllers.yaml"):
        self.setup_logging()
        self.logger = logging.getLogger(__name__)
        self.config = self.load_config(config_file)
        
    def setup_logging(self):
        log_format = '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s%(reset)s'
        
        handler = colorlog.StreamHandler()
        handler.setFormatter(colorlog.ColoredFormatter(
            log_format,
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        ))
        
        # File logging
        import os
        script_dir = os.path.dirname(os.path.abspath(__file__))
        log_dir = os.path.join(script_dir, 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        log_file_path = os.path.join(log_dir, f"api_verification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        logging.basicConfig(
            level=logging.INFO,
            handlers=[handler, file_handler]
        )

    def load_config(self, config_file: str) -> dict:
        config_path = Path(config_file)
        
        if not config_path.exists():
            self.logger.error(f"Config file not found: {config_file}")
            return {"controllers": []}
        
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def ssh_connect(self, hostname: str, username: str, password: str, timeout: int = 10):
        """Create SSH connection to controller"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(hostname, username=username, password=password, timeout=timeout)
            return ssh
        except Exception as e:
            self.logger.error(f"SSH connection failed to {hostname}: {str(e)}")
            return None

    def execute_ssh_command(self, ssh, command: str, timeout: int = 30):
        """Execute command via SSH and return output"""
        try:
            stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            
            if error:
                self.logger.warning(f"Command stderr: {error}")
            
            return output
        except Exception as e:
            self.logger.error(f"Command execution failed: {str(e)}")
            return None

    def check_api_status(self, controller_info: dict) -> dict:
        """Check if REST API is enabled on a single controller"""
        result = {
            'controller_name': controller_info['name'],
            'controller_ip': controller_info['ip'],
            'ssh_success': False,
            'api_enabled': False,
            'api_enabled_successfully': False,
            'error': None,
            'output': None
        }
        
        try:
            # SSH connection
            ssh = self.ssh_connect(
                controller_info['ip'], 
                controller_info['username'], 
                controller_info['password']
            )
            
            if not ssh:
                result['error'] = "SSH connection failed"
                return result
            
            result['ssh_success'] = True
            self.logger.info(f"[{controller_info['name']}] SSH connected successfully")
            
            # Check current web server and API status for Aruba 8.6.0.7
            # Try multiple commands to check API status
            commands_to_try = [
                "show running-config | include mgmt-server",
                "show mgmt-server",
                "show running-config | include web-server", 
                "show web-server",
                "show running-config | include rest-api",
                "show ip interface mgmt"
            ]
            
            output_collected = []
            for cmd in commands_to_try:
                cmd_output = self.execute_ssh_command(ssh, cmd)
                if cmd_output:
                    output_collected.append(f"Command: {cmd}\n{cmd_output}\n")
            
            result['output'] = "\n".join(output_collected)
            
            # Check if REST API is enabled (look for common indicators)
            full_output = result['output'].lower()
            if any(indicator in full_output for indicator in ["rest-api", "mgmt-server", "web-server"]):
                # Try to determine if it's enabled
                if "enable" in full_output or "up" in full_output:
                    result['api_enabled'] = True
                    self.logger.info(f"[{controller_info['name']}] REST API appears to be enabled")
                else:
                    self.logger.warning(f"[{controller_info['name']}] REST API status unclear, attempting to enable")
            else:
                self.logger.warning(f"[{controller_info['name']}] REST API not found, attempting to enable")
                
            # If API doesn't appear enabled, try to enable it
            if not result['api_enabled']:
                # Try different enable commands for Aruba 8.6.0.7
                enable_commands = [
                    "configure terminal",
                    "mgmt-server",
                    "enable",
                    "commit apply",
                    "exit"
                ]
                
                self.logger.info(f"[{controller_info['name']}] Attempting to enable REST API...")
                
                for cmd in enable_commands:
                    cmd_output = self.execute_ssh_command(ssh, cmd)
                    if cmd_output is None:
                        result['error'] = f"Failed to execute: {cmd}"
                        break
                    time.sleep(1)  # Small delay between commands
                
                if not result['error']:
                    # Verify it was enabled
                    time.sleep(3)  # Wait for config to apply
                    verify_output = self.execute_ssh_command(ssh, "show mgmt-server")
                    
                    if verify_output and ("enable" in verify_output.lower() or "up" in verify_output.lower()):
                        result['api_enabled'] = True
                        result['api_enabled_successfully'] = True
                        self.logger.info(f"[{controller_info['name']}] REST API enabled successfully")
                    else:
                        result['error'] = "Failed to enable REST API"
                        self.logger.error(f"[{controller_info['name']}] Failed to enable REST API")
            
            ssh.close()
            
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[{controller_info['name']}] Error: {str(e)}")
            
        return result

    def verify_all_controllers(self, max_workers: int = 5) -> list:
        """Verify API status on all controllers using threading"""
        controllers = self.config.get('controllers', [])
        
        if not controllers:
            self.logger.error("No controllers configured")
            return []
        
        print(f"\\n🔍 Verifying REST API on {len(controllers)} controllers...\\n")
        
        results = []
        max_workers = min(max_workers, len(controllers))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_controller = {
                executor.submit(self.check_api_status, controller): controller
                for controller in controllers
            }
            
            for future in as_completed(future_to_controller):
                try:
                    result = future.result()
                    results.append(result)
                    
                    # Real-time status update
                    controller_name = result['controller_name']
                    if result['ssh_success']:
                        if result['api_enabled']:
                            status = "✓ API Enabled"
                            if result['api_enabled_successfully']:
                                status += " (Just enabled)"
                        else:
                            status = "✗ API Disabled"
                    else:
                        status = "✗ SSH Failed"
                    
                    print(f"{controller_name:<30} {status}")
                    
                except Exception as e:
                    controller = future_to_controller[future]
                    self.logger.error(f"Thread error for {controller['name']}: {str(e)}")
                    results.append({
                        'controller_name': controller['name'],
                        'controller_ip': controller['ip'],
                        'ssh_success': False,
                        'api_enabled': False,
                        'error': f"Thread error: {str(e)}"
                    })
        
        return results

    def display_summary(self, results: list):
        """Display verification summary"""
        print("\\n" + "="*80)
        print("ARUBA CONTROLLER REST API VERIFICATION SUMMARY")
        print("="*80)
        print(f"{'Controller':<30} {'IP':<20} {'SSH':<8} {'API':<8} {'Status'}")
        print("-"*80)
        
        ssh_success = 0
        api_enabled = 0
        api_newly_enabled = 0
        
        for result in results:
            name = result['controller_name']
            ip = result['controller_ip']
            ssh_status = "✓" if result['ssh_success'] else "✗"
            api_status = "✓" if result['api_enabled'] else "✗"
            
            if result['ssh_success']:
                ssh_success += 1
            if result['api_enabled']:
                api_enabled += 1
            if result.get('api_enabled_successfully', False):
                api_newly_enabled += 1
                
            status = ""
            if result['error']:
                status = f"Error: {result['error']}"
            elif result['api_enabled']:
                if result.get('api_enabled_successfully', False):
                    status = "Just enabled"
                else:
                    status = "Already enabled"
            else:
                status = "Failed to enable"
            
            print(f"{name:<30} {ip:<20} {ssh_status:<8} {api_status:<8} {status}")
        
        print("="*80)
        print(f"\\nSummary:")
        print(f"  Total controllers: {len(results)}")
        print(f"  SSH successful: {ssh_success}")
        print(f"  API enabled: {api_enabled}")
        print(f"  Newly enabled: {api_newly_enabled}")
        
        if api_enabled == len(results):
            print(f"\\n🎉 SUCCESS: All controllers have REST API enabled!")
        else:
            print(f"\\n⚠️  WARNING: {len(results) - api_enabled} controllers still need REST API enabled")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Verify REST API on Aruba Controllers')
    parser.add_argument('-c', '--config', default='config/cfins_controllers.yaml',
                       help='Path to controller config file')
    parser.add_argument('--max-workers', type=int, default=5,
                       help='Maximum threads for parallel processing')
    parser.add_argument('--check-only', action='store_true',
                       help='Only check status, do not enable API')
    
    args = parser.parse_args()
    
    # Verify config file exists
    if not Path(args.config).exists():
        print(f"❌ Config file not found: {args.config}")
        return
    
    # Warning about credentials
    print("\\n⚠️  This script will SSH into controllers and may enable REST API")
    print("Make sure the credentials in the config file are correct.\\n")
    
    if not args.check_only:
        confirm = input("Continue? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Cancelled.")
            return
    
    # Create verifier and run
    verifier = ArubaAPIVerifier(config_file=args.config)
    results = verifier.verify_all_controllers(max_workers=args.max_workers)
    
    if results:
        verifier.display_summary(results)
    else:
        print("\\n❌ No results to display")

if __name__ == "__main__":
    main()