import requests
import json
import urllib3
from typing import Dict, Optional, Any
import logging

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

    def __enter__(self):
        self.login()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logout()