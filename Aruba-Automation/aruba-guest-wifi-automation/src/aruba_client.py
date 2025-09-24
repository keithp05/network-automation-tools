import requests
import json
import urllib3
from typing import Dict, Optional, Any, List
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class ArubaClient:
    def __init__(self, controller_ip: str, username: str, password: str, api_version: str = "v1"):
        self.controller_ip = controller_ip
        self.username = username
        self.password = password
        self.api_version = api_version
        self.base_url = f"https://{controller_ip}:4343"
        self.session = requests.Session()
        self.session.verify = False
        self.session_id = None
        self.logger = logging.getLogger(__name__)

    def login(self) -> bool:
        login_url = f"{self.base_url}/api/login"
        login_data = {
            "username": self.username,
            "password": self.password
        }
        
        try:
            response = self.session.post(login_url, json=login_data)
            response.raise_for_status()
            
            result = response.json()
            if result.get("_global_result", {}).get("status") == "0":
                self.session_id = result.get("_global_result", {}).get("UIDARUBA")
                self.session.headers.update({
                    "Cookie": f"SESSION={self.session_id}",
                    "Content-Type": "application/json"
                })
                self.logger.info("Successfully authenticated to Aruba controller")
                return True
            else:
                self.logger.error(f"Login failed: {result.get('_global_result', {}).get('status_str')}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Login request failed: {str(e)}")
            return False

    def logout(self) -> bool:
        if not self.session_id:
            return True
            
        logout_url = f"{self.base_url}/api/logout"
        
        try:
            response = self.session.get(logout_url)
            response.raise_for_status()
            self.session_id = None
            self.logger.info("Successfully logged out from Aruba controller")
            return True
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Logout request failed: {str(e)}")
            return False

    def write_memory(self) -> bool:
        write_mem_url = f"{self.base_url}/api/write_memory"
        
        try:
            response = self.session.get(write_mem_url)
            response.raise_for_status()
            result = response.json()
            
            if result.get("_global_result", {}).get("status") == "0":
                self.logger.info("Configuration saved successfully")
                return True
            else:
                self.logger.error(f"Failed to save configuration: {result.get('_global_result', {}).get('status_str')}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Write memory request failed: {str(e)}")
            return False

    def execute_command(self, command: str, config_path: str = "") -> Optional[Dict[str, Any]]:
        if not self.session_id:
            self.logger.error("Not authenticated. Please login first.")
            return None
            
        command_url = f"{self.base_url}/api/command"
        
        data = {
            "cmd": command
        }
        
        if config_path:
            data["config_path"] = config_path
            
        try:
            response = self.session.post(command_url, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Command execution failed: {str(e)}")
            return None

    def get_all_ssid_profiles(self) -> Optional[Dict[str, Any]]:
        command = "show wlan ssid-profile"
        return self.execute_command(command)

    def get_ssid_profile(self, ssid_name: str) -> Optional[Dict[str, Any]]:
        command = f"show wlan ssid-profile {ssid_name}"
        return self.execute_command(command)

    def get_virtual_ap_profiles(self) -> Optional[Dict[str, Any]]:
        command = "show wlan virtual-ap"
        return self.execute_command(command)

    def get_ap_groups(self) -> Optional[Dict[str, Any]]:
        command = "show ap-group"
        return self.execute_command(command)

    def update_ssid_password(self, ssid_profile: str, new_password: str, config_path: str = "/md") -> bool:
        config_commands = [
            f"wlan ssid-profile {ssid_profile}",
            f"wpa-passphrase {new_password}",
            "exit"
        ]
        
        for command in config_commands:
            result = self.execute_command(command, config_path=config_path)
            
            if not result or result.get("_global_result", {}).get("status") != "0":
                self.logger.error(f"Failed to execute command: {command}")
                return False
                
        return True

    def test_connection(self) -> bool:
        try:
            if self.login():
                self.logger.info("API connection test successful")
                self.logout()
                return True
            else:
                self.logger.error("API connection test failed")
                return False
        except Exception as e:
            self.logger.error(f"Connection test error: {str(e)}")
            return False

    def apply_configuration(self) -> bool:
        apply_command = "apply profile all"
        result = self.execute_command(apply_command, config_path="/md")
        
        if result and result.get("_global_result", {}).get("status") == "0":
            self.logger.info("Configuration applied successfully")
            return True
        else:
            self.logger.error("Failed to apply configuration")
            return False

    def apply_configuration_multi_level(self, levels: list = None) -> bool:
        """Apply configuration at multiple hierarchy levels for better AP coverage"""
        if levels is None:
            # Try common hierarchy levels
            levels = ["/md", "/mm", "/md/campus", "/md/campus/building"]
        
        success_count = 0
        failed_levels = []
        
        for level in levels:
            try:
                self.logger.info(f"Applying configuration at level: {level}")
                result = self.execute_command("apply profile all", config_path=level)
                
                if result and result.get("_global_result", {}).get("status") == "0":
                    self.logger.info(f"Configuration applied successfully at {level}")
                    success_count += 1
                else:
                    # Check if level exists
                    status = result.get("_global_result", {}).get("status_str", "Unknown error")
                    if "Invalid config path" in status or "not found" in status:
                        self.logger.debug(f"Level {level} does not exist, skipping")
                    else:
                        self.logger.warning(f"Failed to apply configuration at {level}: {status}")
                        failed_levels.append(level)
            except Exception as e:
                self.logger.error(f"Error applying configuration at {level}: {str(e)}")
                failed_levels.append(level)
        
        if failed_levels:
            self.logger.warning(f"Failed to apply at levels: {failed_levels}")
        
        return success_count > 0

    def get_all_ap_groups(self) -> list:
        """Get all AP groups in the system"""
        ap_groups = []
        result = self.get_ap_groups()
        
        if result and result.get("_data"):
            data = result.get("_data", [])
            # Parse AP group names from output
            for line in data:
                if isinstance(line, str) and line.strip() and "Name" not in line and "---" not in line:
                    parts = line.split()
                    if parts:
                        ap_groups.append(parts[0])
        
        return ap_groups

    def update_ssid_password_for_ap_group(self, ssid_profile: str, new_password: str, 
                                         ap_group: str, config_path: str = "/md") -> bool:
        """Update SSID password for a specific AP group"""
        config_commands = [
            f"ap-group {ap_group}",
            f"wlan ssid-profile {ssid_profile}",
            f"wpa-passphrase {new_password}",
            "exit",
            "exit"
        ]
        
        for command in config_commands:
            result = self.execute_command(command, config_path=config_path)
            
            if not result or result.get("_global_result", {}).get("status") != "0":
                error_msg = result.get("_global_result", {}).get("status_str", "Unknown error") if result else "No response"
                self.logger.error(f"Failed to execute command '{command}': {error_msg}")
                return False
                
        self.logger.info(f"Successfully updated password for {ssid_profile} in AP group {ap_group}")
        return True

    def update_ssid_password_all_groups(self, ssid_profile: str, new_password: str) -> dict:
        """Update SSID password across all AP groups"""
        results = {
            'total_groups': 0,
            'successful_groups': [],
            'failed_groups': [],
            'skipped_groups': []
        }
        
        # Get all AP groups
        ap_groups = self.get_all_ap_groups()
        results['total_groups'] = len(ap_groups)
        
        if not ap_groups:
            self.logger.warning("No AP groups found")
            return results
        
        self.logger.info(f"Found {len(ap_groups)} AP groups to update")
        
        for ap_group in ap_groups:
            self.logger.info(f"Updating password for AP group: {ap_group}")
            
            # Check if SSID profile exists in this AP group
            group_config = self.execute_command(f"show ap-group {ap_group}")
            
            if group_config and ssid_profile in str(group_config.get("_data", [])):
                if self.update_ssid_password_for_ap_group(ssid_profile, new_password, ap_group):
                    results['successful_groups'].append(ap_group)
                else:
                    results['failed_groups'].append(ap_group)
            else:
                self.logger.debug(f"SSID profile {ssid_profile} not found in AP group {ap_group}, skipping")
                results['skipped_groups'].append(ap_group)
        
        return results

    def get_current_password(self, ssid_profile: str, config_path: str = "/md") -> Optional[str]:
        """Get current password for an SSID profile using show run no-encrypt"""
        try:
            # Get unencrypted configuration for the SSID profile
            command = f"show run no-encrypt wlan ssid-profile {ssid_profile}"
            result = self.execute_command(command, config_path=config_path)
            
            if not result or not result.get("_data"):
                self.logger.error(f"Failed to get configuration for {ssid_profile}")
                return None
            
            # Parse the output to find wpa-passphrase
            data = result.get("_data", [])
            for line in data:
                if isinstance(line, str) and "wpa-passphrase" in line:
                    # Extract password from line like "wpa-passphrase MyPassword123"
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        # Join all parts after 'wpa-passphrase' in case password has spaces
                        password = ' '.join(parts[1:])
                        self.logger.debug(f"Found current password for {ssid_profile}")
                        return password
            
            self.logger.warning(f"No wpa-passphrase found for {ssid_profile}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting current password: {str(e)}")
            return None

    def verify_password_change(self, ssid_profile: str, expected_password: str, config_path: str = "/md") -> dict:
        """Verify password was changed correctly by checking configuration"""
        verification_result = {
            'ssid': ssid_profile,
            'expected_password': expected_password,
            'current_password': None,
            'password_match': False,
            'verification_status': 'failed'
        }
        
        try:
            # Get current password from configuration
            current_password = self.get_current_password(ssid_profile, config_path)
            verification_result['current_password'] = current_password
            
            if current_password is None:
                verification_result['verification_status'] = 'no_password_found'
            elif current_password == expected_password:
                verification_result['password_match'] = True
                verification_result['verification_status'] = 'success'
                self.logger.info(f"Password verification successful for {ssid_profile}")
            else:
                self.logger.warning(f"Password mismatch for {ssid_profile}. Expected: {expected_password}, Found: {current_password}")
                verification_result['verification_status'] = 'mismatch'
                
            return verification_result
            
        except Exception as e:
            self.logger.error(f"Error verifying password change: {str(e)}")
            verification_result['verification_status'] = 'error'
            return verification_result

    def verify_password_update(self, ssid_profile: str) -> dict:
        """Verify password was updated across all APs"""
        verification_results = {
            'total_aps': 0,
            'online_aps': 0,
            'offline_aps': [],
            'config_pending_aps': []
        }
        
        # Get all APs
        ap_result = self.execute_command("show ap database")
        
        if not ap_result or not ap_result.get("_data"):
            self.logger.error("Failed to get AP database")
            return verification_results
        
        # Parse AP database
        data = ap_result.get("_data", [])
        for line in data:
            if isinstance(line, str) and line.strip() and not any(x in line for x in ["Name", "---", "Total"]):
                parts = line.split()
                if len(parts) >= 4:  # Typical format: name, ip, group, model, status
                    ap_name = parts[0]
                    ap_status = parts[-1] if len(parts) > 4 else "Unknown"
                    
                    verification_results['total_aps'] += 1
                    
                    if "Up" in ap_status or "Active" in ap_status:
                        verification_results['online_aps'] += 1
                    else:
                        verification_results['offline_aps'].append(ap_name)
        
        # Check for pending configurations
        pending_result = self.execute_command("show ap config pending")
        
        if pending_result and pending_result.get("_data"):
            data = pending_result.get("_data", [])
            for line in data:
                if isinstance(line, str) and line.strip() and not any(x in line for x in ["AP Name", "---"]):
                    parts = line.split()
                    if parts:
                        verification_results['config_pending_aps'].append(parts[0])
        
        return verification_results

    def force_config_sync(self) -> bool:
        """Force configuration synchronization to all APs"""
        try:
            # Synchronize AP database
            sync_result = self.execute_command("apdatabase synchronize")
            
            if sync_result and sync_result.get("_global_result", {}).get("status") == "0":
                self.logger.info("AP database synchronization initiated")
                return True
            else:
                self.logger.error("Failed to synchronize AP database")
                return False
        except Exception as e:
            self.logger.error(f"Error during configuration sync: {str(e)}")
            return False

    def reboot_ap_group(self, ap_group: str) -> bool:
        """Reboot all APs in a specific group"""
        try:
            reboot_command = f"ap-reboot ap-group {ap_group}"
            result = self.execute_command(reboot_command)
            
            if result and result.get("_global_result", {}).get("status") == "0":
                self.logger.info(f"Reboot initiated for AP group: {ap_group}")
                return True
            else:
                self.logger.error(f"Failed to reboot AP group: {ap_group}")
                return False
        except Exception as e:
            self.logger.error(f"Error rebooting AP group {ap_group}: {str(e)}")
            return False

    def _audit_single_ssid(self, ssid: str) -> dict:
        """Thread-safe method to audit a single SSID password"""
        result = {
            'ssid': ssid,
            'success': False,
            'password': None,
            'password_length': 0,
            'error': None
        }
        
        try:
            current_password = self.get_current_password(ssid)
            
            if current_password:
                result.update({
                    'success': True,
                    'password': current_password,
                    'password_length': len(current_password)
                })
                self.logger.debug(f"[Thread] Audit: {ssid} has password (length: {len(current_password)})")
            else:
                result['error'] = "No password found or unable to retrieve"
                self.logger.warning(f"[Thread] Audit: {ssid} has no password or unable to retrieve")
                
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[Thread] Error auditing {ssid}: {str(e)}")
        
        return result

    def audit_ssid_passwords(self, ssid_list: list = None, max_workers: int = 5) -> dict:
        """Audit passwords for specified SSIDs or all SSIDs using multithreading"""
        audit_results = {
            'total_ssids': 0,
            'ssids_with_passwords': [],
            'ssids_without_passwords': [],
            'audit_errors': [],
            'timestamp': datetime.now().isoformat(),
            'processing_time_seconds': 0
        }
        
        start_time = datetime.now()
        
        try:
            # If no SSID list provided, get all SSID profiles
            if not ssid_list:
                ssid_profiles_result = self.get_all_ssid_profiles()
                if ssid_profiles_result and ssid_profiles_result.get("_data"):
                    ssid_list = []
                    data = ssid_profiles_result.get("_data", [])
                    for line in data:
                        if isinstance(line, str) and "Profile Name" not in line and line.strip():
                            parts = line.split()
                            if parts:
                                ssid_list.append(parts[0])
                
                if not ssid_list:
                    self.logger.warning("No SSID profiles found for audit")
                    return audit_results
            
            audit_results['total_ssids'] = len(ssid_list)
            
            # Limit max_workers to reasonable number and available SSIDs
            max_workers = min(max_workers, len(ssid_list), 10)
            
            self.logger.info(f"Starting threaded audit of {len(ssid_list)} SSIDs with {max_workers} workers")
            
            # Use ThreadPoolExecutor for concurrent password auditing
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all audit tasks
                future_to_ssid = {executor.submit(self._audit_single_ssid, ssid): ssid 
                                 for ssid in ssid_list}
                
                # Process completed tasks as they finish
                for future in as_completed(future_to_ssid):
                    ssid = future_to_ssid[future]
                    try:
                        result = future.result()
                        
                        if result['success']:
                            audit_results['ssids_with_passwords'].append({
                                'ssid': result['ssid'],
                                'password': result['password'],
                                'password_length': result['password_length']
                            })
                        else:
                            audit_results['ssids_without_passwords'].append(result['ssid'])
                            if result['error']:
                                audit_results['audit_errors'].append(f"{result['ssid']}: {result['error']}")
                                
                    except Exception as e:
                        error_msg = f"Thread execution error for {ssid}: {str(e)}"
                        audit_results['audit_errors'].append(error_msg)
                        self.logger.error(error_msg)
            
            # Calculate processing time
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            audit_results['processing_time_seconds'] = round(processing_time, 2)
            
            self.logger.info(f"Completed threaded audit in {processing_time:.2f} seconds")
            return audit_results
            
        except Exception as e:
            self.logger.error(f"Error during threaded password audit: {str(e)}")
            audit_results['audit_errors'].append(f"General audit error: {str(e)}")
            return audit_results

    def _audit_single_ap_group(self, group: str) -> dict:
        """Thread-safe method to audit a single AP group"""
        result = {
            'group': group,
            'success': False,
            'ssids_found': [],
            'ssid_passwords': {},
            'error': None
        }
        
        try:
            # Get AP group configuration
            group_config = self.execute_command(f"show ap-group {group}")
            
            if group_config and group_config.get("_data"):
                group_ssids = []
                data = group_config.get("_data", [])
                
                # Parse SSID profiles from AP group config
                for line in data:
                    if isinstance(line, str) and "ssid-profile" in line:
                        parts = line.strip().split()
                        for i, part in enumerate(parts):
                            if part == "ssid-profile" and i + 1 < len(parts):
                                ssid_name = parts[i + 1]
                                if ssid_name not in group_ssids:
                                    group_ssids.append(ssid_name)
                
                result['ssids_found'] = group_ssids
                
                # Get passwords for each SSID in this group
                for ssid in group_ssids:
                    try:
                        current_password = self.get_current_password(ssid)
                        if current_password:
                            result['ssid_passwords'][ssid] = current_password
                    except Exception as e:
                        self.logger.warning(f"[Thread] Error getting password for {ssid} in group {group}: {str(e)}")
                
                result['success'] = True
                self.logger.debug(f"[Thread] AP Group {group}: Found {len(group_ssids)} SSIDs")
                
        except Exception as e:
            result['error'] = str(e)
            self.logger.error(f"[Thread] Error auditing AP group {group}: {str(e)}")
        
        return result

    def audit_ap_group_passwords(self, ap_group: str = None, max_workers: int = 3) -> dict:
        """Audit passwords for SSIDs in specific AP group or all groups using multithreading"""
        audit_results = {
            'ap_groups_audited': [],
            'total_ssids_found': 0,
            'ssid_password_map': {},
            'audit_errors': [],
            'timestamp': datetime.now().isoformat(),
            'processing_time_seconds': 0
        }
        
        start_time = datetime.now()
        
        try:
            # Get AP groups to audit
            groups_to_audit = []
            if ap_group:
                groups_to_audit = [ap_group]
            else:
                groups_to_audit = self.get_all_ap_groups()
            
            if not groups_to_audit:
                self.logger.warning("No AP groups found for audit")
                return audit_results
            
            # Limit max_workers to reasonable number
            max_workers = min(max_workers, len(groups_to_audit), 5)
            
            self.logger.info(f"Starting threaded AP group audit of {len(groups_to_audit)} groups with {max_workers} workers")
            
            # Use ThreadPoolExecutor for concurrent AP group auditing
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all AP group audit tasks
                future_to_group = {executor.submit(self._audit_single_ap_group, group): group 
                                  for group in groups_to_audit}
                
                # Process completed tasks as they finish
                for future in as_completed(future_to_group):
                    group = future_to_group[future]
                    try:
                        result = future.result()
                        
                        if result['success']:
                            # Add to audited groups
                            audit_results['ap_groups_audited'].append({
                                'group': result['group'],
                                'ssids_found': result['ssids_found']
                            })
                            
                            # Process SSID password mappings
                            for ssid, password in result['ssid_passwords'].items():
                                if ssid not in audit_results['ssid_password_map']:
                                    audit_results['ssid_password_map'][ssid] = {
                                        'password': password,
                                        'ap_groups': []
                                    }
                                audit_results['ssid_password_map'][ssid]['ap_groups'].append(result['group'])
                                audit_results['total_ssids_found'] += 1
                        else:
                            if result['error']:
                                audit_results['audit_errors'].append(f"{result['group']}: {result['error']}")
                                
                    except Exception as e:
                        error_msg = f"Thread execution error for AP group {group}: {str(e)}"
                        audit_results['audit_errors'].append(error_msg)
                        self.logger.error(error_msg)
            
            # Calculate processing time
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            audit_results['processing_time_seconds'] = round(processing_time, 2)
            
            self.logger.info(f"Completed threaded AP group audit in {processing_time:.2f} seconds")
            return audit_results
            
        except Exception as e:
            self.logger.error(f"Error during threaded AP group audit: {str(e)}")
            audit_results['audit_errors'].append(f"General AP group audit error: {str(e)}")
            return audit_results

    def generate_password_report(self, ssid_list: list = None, include_ap_groups: bool = True, max_workers: int = 5) -> dict:
        """Generate comprehensive password audit report"""
        from datetime import datetime
        
        report = {
            'report_metadata': {
                'generated_at': datetime.now().isoformat(),
                'controller_ip': self.controller_ip,
                'report_type': 'password_audit'
            },
            'ssid_audit': {},
            'ap_group_audit': {},
            'summary': {
                'total_ssids_audited': 0,
                'ssids_with_passwords': 0,
                'ssids_without_passwords': 0,
                'total_ap_groups': 0,
                'audit_errors': 0
            }
        }
        
        try:
            # Audit SSID passwords with threading
            ssid_audit = self.audit_ssid_passwords(ssid_list, max_workers=max_workers)
            report['ssid_audit'] = ssid_audit
            
            # Update summary
            report['summary']['total_ssids_audited'] = ssid_audit['total_ssids']
            report['summary']['ssids_with_passwords'] = len(ssid_audit['ssids_with_passwords'])
            report['summary']['ssids_without_passwords'] = len(ssid_audit['ssids_without_passwords'])
            report['summary']['audit_errors'] += len(ssid_audit['audit_errors'])
            
            # Audit AP group passwords if requested with threading
            if include_ap_groups:
                # Use fewer workers for AP groups as they're more complex
                ap_group_workers = min(max_workers // 2, 3) if max_workers > 1 else 1
                ap_group_audit = self.audit_ap_group_passwords(max_workers=ap_group_workers)
                report['ap_group_audit'] = ap_group_audit
                report['summary']['total_ap_groups'] = len(ap_group_audit['ap_groups_audited'])
                report['summary']['audit_errors'] += len(ap_group_audit['audit_errors'])
            
            return report
            
        except Exception as e:
            self.logger.error(f"Error generating password report: {str(e)}")
            report['summary']['audit_errors'] += 1
            return report

    def __enter__(self):
        self.login()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logout()