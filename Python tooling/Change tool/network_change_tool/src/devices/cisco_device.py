import time
import re
import hashlib
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from pathlib import Path
import gzip
import json

from netmiko import ConnectHandler, NetmikoTimeoutException, NetmikoAuthenticationException
from paramiko import SSHException

from .base_device import BaseDevice, DeviceStatus, CommandResult, BackupInfo
from ..core.exceptions import (
    DeviceConnectionError,
    AuthenticationError,
    BackupError,
    ChangeExecutionError,
    ValidationError,
    TimeoutError
)


class CiscoDevice(BaseDevice):
    """Base class for Cisco devices (IOS, NX-OS, ASA)"""
    
    def __init__(self, hostname: str, ip_address: str, credentials: Dict[str, str],
                 device_type: str = "cisco_ios", port: int = 22, timeout: int = 30):
        super().__init__(hostname, ip_address, credentials, port, timeout)
        self.device_type = device_type
        self._platform_info = {}
        
    def connect(self) -> bool:
        """Establish SSH connection to Cisco device"""
        try:
            self.status = DeviceStatus.CONNECTING
            self.logger.info(f"Connecting to {self.hostname} ({self.ip_address})")
            
            device_config = {
                'device_type': self.device_type,
                'host': self.ip_address,
                'username': self.credentials.get('username'),
                'password': self.credentials.get('password'),
                'port': self.port,
                'timeout': self.timeout,
                'global_delay_factor': 2,
            }
            
            if self.credentials.get('enable_password'):
                device_config['secret'] = self.credentials['enable_password']
            
            self.connection = ConnectHandler(**device_config)
            self.status = DeviceStatus.CONNECTED
            
            # Enter enable mode if needed
            if not self.connection.check_enable_mode():
                self.connection.enable()
            
            self.status = DeviceStatus.AUTHENTICATED
            self.logger.info(f"Successfully connected to {self.hostname}")
            
            # Get platform info
            self._get_platform_info()
            
            return True
            
        except NetmikoAuthenticationException as e:
            self.status = DeviceStatus.ERROR
            self.logger.error(f"Authentication failed for {self.hostname}: {str(e)}")
            raise AuthenticationError(f"Authentication failed: {str(e)}")
            
        except NetmikoTimeoutException as e:
            self.status = DeviceStatus.ERROR
            self.logger.error(f"Connection timeout for {self.hostname}: {str(e)}")
            raise TimeoutError(f"Connection timeout: {str(e)}")
            
        except Exception as e:
            self.status = DeviceStatus.ERROR
            self.logger.error(f"Connection failed for {self.hostname}: {str(e)}")
            raise DeviceConnectionError(f"Connection failed: {str(e)}")
    
    def disconnect(self) -> bool:
        """Disconnect from the device"""
        try:
            if self.connection:
                self.connection.disconnect()
                self.connection = None
            self.status = DeviceStatus.DISCONNECTED
            self.logger.info(f"Disconnected from {self.hostname}")
            return True
        except Exception as e:
            self.logger.error(f"Error disconnecting from {self.hostname}: {str(e)}")
            return False
    
    def execute_command(self, command: str, timeout: Optional[int] = None) -> CommandResult:
        """Execute a single command on the device"""
        if not self.is_connected():
            raise DeviceConnectionError("Device is not connected")
        
        start_time = time.time()
        try:
            self.status = DeviceStatus.BUSY
            output = self.connection.send_command(
                command, 
                read_timeout=timeout or self.timeout
            )
            execution_time = time.time() - start_time
            
            result = CommandResult(
                command=command,
                output=output,
                success=True,
                execution_time=execution_time
            )
            
            self._command_history.append(result)
            self.status = DeviceStatus.AUTHENTICATED
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            result = CommandResult(
                command=command,
                output="",
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
            self._command_history.append(result)
            self.status = DeviceStatus.AUTHENTICATED
            raise ChangeExecutionError(f"Command execution failed: {str(e)}")
    
    def execute_commands(self, commands: List[str], stop_on_error: bool = True) -> List[CommandResult]:
        """Execute multiple commands on the device"""
        results = []
        
        for command in commands:
            try:
                result = self.execute_command(command)
                results.append(result)
            except Exception as e:
                if stop_on_error:
                    raise
                else:
                    result = CommandResult(
                        command=command,
                        output="",
                        success=False,
                        error_message=str(e)
                    )
                    results.append(result)
        
        return results
    
    def get_running_config(self) -> str:
        """Retrieve the running configuration"""
        result = self.execute_command("show running-config")
        return result.output
    
    def get_startup_config(self) -> str:
        """Retrieve the startup configuration"""
        result = self.execute_command("show startup-config")
        return result.output
    
    def save_config(self) -> bool:
        """Save running configuration to startup"""
        try:
            if self.device_type == "cisco_asa":
                result = self.execute_command("write memory")
            else:
                result = self.execute_command("copy running-config startup-config")
                # Handle confirmation prompt
                if "Destination filename" in result.output:
                    self.connection.send_command("\n", expect_string=r"#")
            
            return "OK" in result.output or "bytes copied" in result.output
        except Exception as e:
            self.logger.error(f"Failed to save config: {str(e)}")
            return False
    
    def backup_config(self, backup_path: Path, compress: bool = True, 
                     encrypt: bool = False) -> BackupInfo:
        """Create a backup of the device configuration"""
        try:
            # Create backup directory
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Get configurations
            running_config = self.get_running_config()
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.hostname}_{timestamp}_running.txt"
            
            if compress:
                filename += ".gz"
            
            full_path = backup_path / filename
            
            # Write backup
            if compress:
                with gzip.open(full_path, 'wt') as f:
                    f.write(running_config)
            else:
                with open(full_path, 'w') as f:
                    f.write(running_config)
            
            # Calculate checksum
            if compress:
                with gzip.open(full_path, 'rt') as f:
                    content = f.read()
            else:
                with open(full_path, 'r') as f:
                    content = f.read()
            
            checksum = hashlib.sha256(content.encode()).hexdigest()
            
            # Create backup info
            backup_info = BackupInfo(
                device_hostname=self.hostname,
                backup_path=full_path,
                timestamp=datetime.now(),
                size_bytes=full_path.stat().st_size,
                checksum=checksum,
                compressed=compress,
                encrypted=encrypt,
                backup_type="full"
            )
            
            self._last_backup = backup_info
            self.logger.info(f"Backup created: {full_path}")
            
            # Also save startup config
            startup_config = self.get_startup_config()
            startup_filename = f"{self.hostname}_{timestamp}_startup.txt"
            if compress:
                startup_filename += ".gz"
            
            startup_path = backup_path / startup_filename
            
            if compress:
                with gzip.open(startup_path, 'wt') as f:
                    f.write(startup_config)
            else:
                with open(startup_path, 'w') as f:
                    f.write(startup_config)
            
            return backup_info
            
        except Exception as e:
            raise BackupError(f"Backup failed: {str(e)}")
    
    def restore_config(self, backup_info: BackupInfo) -> bool:
        """Restore configuration from backup"""
        try:
            # Read backup file
            if backup_info.compressed:
                with gzip.open(backup_info.backup_path, 'rt') as f:
                    config = f.read()
            else:
                with open(backup_info.backup_path, 'r') as f:
                    config = f.read()
            
            # Validate checksum
            checksum = hashlib.sha256(config.encode()).hexdigest()
            if checksum != backup_info.checksum:
                raise ValidationError("Backup checksum validation failed")
            
            # Apply configuration
            self.apply_configuration(config, save=True)
            
            self.logger.info(f"Configuration restored from {backup_info.backup_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Restore failed: {str(e)}")
            raise
    
    def validate_config(self, config: str) -> Tuple[bool, List[str]]:
        """Validate configuration syntax"""
        errors = []
        warnings = []
        
        # Basic syntax checks
        lines = config.strip().split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip empty lines and comments
            if not line or line.startswith('!'):
                continue
            
            # Check for common syntax errors
            if line.count('"') % 2 != 0:
                errors.append(f"Line {i}: Unmatched quotes")
            
            if line.startswith('no ') and len(line.split()) < 2:
                errors.append(f"Line {i}: Invalid 'no' command")
            
            # Platform-specific checks
            if self.device_type == "cisco_ios":
                if line.startswith('interface') and not re.match(r'^interface\s+\S+', line):
                    errors.append(f"Line {i}: Invalid interface command")
            
        return len(errors) == 0, errors
    
    def apply_configuration(self, config: str, save: bool = True) -> CommandResult:
        """Apply configuration to the device"""
        try:
            # Validate configuration first
            valid, errors = self.validate_config(config)
            if not valid:
                raise ValidationError(f"Configuration validation failed: {', '.join(errors)}")
            
            # Enter config mode
            self.connection.config_mode()
            
            # Split config into lines and apply
            config_lines = [line.strip() for line in config.strip().split('\n') 
                           if line.strip() and not line.strip().startswith('!')]
            
            output = self.connection.send_config_set(config_lines)
            
            # Exit config mode
            self.connection.exit_config_mode()
            
            # Save if requested
            if save:
                self.save_config()
            
            return CommandResult(
                command="apply_configuration",
                output=output,
                success=True
            )
            
        except Exception as e:
            # Try to exit config mode if we're still in it
            try:
                self.connection.exit_config_mode()
            except:
                pass
            
            raise ChangeExecutionError(f"Configuration apply failed: {str(e)}")
    
    def check_connectivity(self) -> bool:
        """Check if device is reachable"""
        try:
            result = self.execute_command("show clock")
            return result.success
        except:
            return False
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get device information"""
        if not self._platform_info:
            self._get_platform_info()
        
        return self._platform_info
    
    def _get_platform_info(self):
        """Get platform-specific information"""
        try:
            # Get version info
            version_output = self.execute_command("show version").output
            
            # Parse based on device type
            if self.device_type == "cisco_ios":
                self._platform_info = self._parse_ios_version(version_output)
            elif self.device_type == "cisco_nxos":
                self._platform_info = self._parse_nxos_version(version_output)
            elif self.device_type == "cisco_asa":
                self._platform_info = self._parse_asa_version(version_output)
            
            # Get inventory info
            try:
                inventory = self.execute_command("show inventory").output
                self._platform_info['inventory'] = self._parse_inventory(inventory)
            except:
                pass
            
        except Exception as e:
            self.logger.error(f"Failed to get platform info: {str(e)}")
    
    def _parse_ios_version(self, output: str) -> Dict[str, Any]:
        """Parse IOS version output"""
        info = {
            'platform': 'IOS',
            'device_type': self.device_type
        }
        
        # Extract version
        version_match = re.search(r'Version\s+(\S+)', output)
        if version_match:
            info['version'] = version_match.group(1)
        
        # Extract model
        model_match = re.search(r'cisco\s+(\S+)\s+\(', output)
        if model_match:
            info['model'] = model_match.group(1)
        
        # Extract uptime
        uptime_match = re.search(r'uptime is\s+(.+)', output)
        if uptime_match:
            info['uptime'] = uptime_match.group(1)
        
        # Extract serial
        serial_match = re.search(r'Processor board ID\s+(\S+)', output)
        if serial_match:
            info['serial_number'] = serial_match.group(1)
        
        return info
    
    def _parse_nxos_version(self, output: str) -> Dict[str, Any]:
        """Parse NX-OS version output"""
        info = {
            'platform': 'NX-OS',
            'device_type': self.device_type
        }
        
        # Extract version
        version_match = re.search(r'NXOS:\s+version\s+(\S+)', output)
        if version_match:
            info['version'] = version_match.group(1)
        
        # Extract model
        model_match = re.search(r'Hardware\s+cisco\s+(\S+)', output)
        if model_match:
            info['model'] = model_match.group(1)
        
        return info
    
    def _parse_asa_version(self, output: str) -> Dict[str, Any]:
        """Parse ASA version output"""
        info = {
            'platform': 'ASA',
            'device_type': self.device_type
        }
        
        # Extract version
        version_match = re.search(r'Cisco Adaptive Security Appliance Software Version\s+(\S+)', output)
        if version_match:
            info['version'] = version_match.group(1)
        
        # Extract model
        model_match = re.search(r'Hardware:\s+(\S+)', output)
        if model_match:
            info['model'] = model_match.group(1)
        
        return info
    
    def _parse_inventory(self, output: str) -> List[Dict[str, str]]:
        """Parse inventory output"""
        inventory = []
        current_item = {}
        
        for line in output.split('\n'):
            if line.startswith('NAME:'):
                if current_item:
                    inventory.append(current_item)
                    current_item = {}
                
                name_match = re.search(r'NAME:\s+"([^"]+)"', line)
                if name_match:
                    current_item['name'] = name_match.group(1)
                
                descr_match = re.search(r'DESCR:\s+"([^"]+)"', line)
                if descr_match:
                    current_item['description'] = descr_match.group(1)
            
            elif line.startswith('PID:'):
                pid_match = re.search(r'PID:\s+(\S+)', line)
                if pid_match:
                    current_item['pid'] = pid_match.group(1)
                
                sn_match = re.search(r'SN:\s+(\S+)', line)
                if sn_match:
                    current_item['serial_number'] = sn_match.group(1)
        
        if current_item:
            inventory.append(current_item)
        
        return inventory
    
    def get_interface_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all interfaces"""
        interfaces = {}
        
        try:
            # Get interface status
            if self.device_type == "cisco_nxos":
                output = self.execute_command("show interface status").output
                interfaces.update(self._parse_nxos_interface_status(output))
            else:
                output = self.execute_command("show ip interface brief").output
                interfaces.update(self._parse_ios_interface_status(output))
            
            # Get detailed interface info
            output = self.execute_command("show interfaces").output
            self._parse_interface_details(output, interfaces)
            
        except Exception as e:
            self.logger.error(f"Failed to get interface status: {str(e)}")
        
        return interfaces
    
    def _parse_ios_interface_status(self, output: str) -> Dict[str, Dict[str, Any]]:
        """Parse IOS interface status"""
        interfaces = {}
        
        for line in output.split('\n')[1:]:  # Skip header
            parts = line.split()
            if len(parts) >= 6:
                interface_name = parts[0]
                interfaces[interface_name] = {
                    'ip_address': parts[1],
                    'status': parts[4],
                    'protocol': parts[5]
                }
        
        return interfaces
    
    def _parse_nxos_interface_status(self, output: str) -> Dict[str, Dict[str, Any]]:
        """Parse NX-OS interface status"""
        interfaces = {}
        
        for line in output.split('\n'):
            if line and not line.startswith('-') and not line.startswith('Port'):
                parts = line.split()
                if parts:
                    interface_name = parts[0]
                    interfaces[interface_name] = {
                        'status': parts[2] if len(parts) > 2 else 'unknown',
                        'vlan': parts[3] if len(parts) > 3 else None,
                        'duplex': parts[4] if len(parts) > 4 else None,
                        'speed': parts[5] if len(parts) > 5 else None
                    }
        
        return interfaces
    
    def _parse_interface_details(self, output: str, interfaces: Dict[str, Dict[str, Any]]):
        """Parse detailed interface information"""
        current_interface = None
        
        for line in output.split('\n'):
            # Check for interface name
            interface_match = re.match(r'^(\S+) is (.+), line protocol is (.+)', line)
            if interface_match:
                current_interface = interface_match.group(1)
                if current_interface not in interfaces:
                    interfaces[current_interface] = {}
                
                interfaces[current_interface]['admin_status'] = interface_match.group(2)
                interfaces[current_interface]['line_protocol'] = interface_match.group(3)
            
            # Extract additional details
            if current_interface:
                # MTU
                mtu_match = re.search(r'MTU (\d+) bytes', line)
                if mtu_match:
                    interfaces[current_interface]['mtu'] = int(mtu_match.group(1))
                
                # Bandwidth
                bw_match = re.search(r'BW (\d+) Kbit', line)
                if bw_match:
                    interfaces[current_interface]['bandwidth'] = int(bw_match.group(1))
                
                # Description
                desc_match = re.search(r'Description: (.+)', line)
                if desc_match:
                    interfaces[current_interface]['description'] = desc_match.group(1)
    
    def get_routing_table(self) -> List[Dict[str, Any]]:
        """Get the routing table"""
        routes = []
        
        try:
            output = self.execute_command("show ip route").output
            
            # Parse routing table
            for line in output.split('\n'):
                # Skip headers and empty lines
                if not line or line.startswith('Codes:') or line.startswith('Gateway'):
                    continue
                
                # Parse route entries
                route_match = re.match(r'^(\S)\s+(\S+)\s+(\[[\d/]+\])?\s+via\s+(\S+)', line)
                if route_match:
                    route = {
                        'type': route_match.group(1),
                        'network': route_match.group(2),
                        'metric': route_match.group(3),
                        'next_hop': route_match.group(4)
                    }
                    routes.append(route)
                
                # Direct connected routes
                direct_match = re.match(r'^(\S)\s+(\S+)\s+is directly connected, (\S+)', line)
                if direct_match:
                    route = {
                        'type': direct_match.group(1),
                        'network': direct_match.group(2),
                        'interface': direct_match.group(3),
                        'next_hop': 'directly connected'
                    }
                    routes.append(route)
        
        except Exception as e:
            self.logger.error(f"Failed to get routing table: {str(e)}")
        
        return routes


class CiscoIOSDevice(CiscoDevice):
    """Cisco IOS specific implementation"""
    
    def __init__(self, hostname: str, ip_address: str, credentials: Dict[str, str],
                 port: int = 22, timeout: int = 30):
        super().__init__(hostname, ip_address, credentials, "cisco_ios", port, timeout)


class CiscoNXOSDevice(CiscoDevice):
    """Cisco NX-OS specific implementation"""
    
    def __init__(self, hostname: str, ip_address: str, credentials: Dict[str, str],
                 port: int = 22, timeout: int = 30):
        super().__init__(hostname, ip_address, credentials, "cisco_nxos", port, timeout)
    
    def get_vlan_info(self) -> List[Dict[str, Any]]:
        """Get VLAN information (NX-OS specific)"""
        vlans = []
        
        try:
            output = self.execute_command("show vlan brief").output
            
            for line in output.split('\n'):
                if line and re.match(r'^\d+', line):
                    parts = line.split()
                    if len(parts) >= 3:
                        vlan = {
                            'id': int(parts[0]),
                            'name': parts[1],
                            'status': parts[2],
                            'ports': parts[3:] if len(parts) > 3 else []
                        }
                        vlans.append(vlan)
        
        except Exception as e:
            self.logger.error(f"Failed to get VLAN info: {str(e)}")
        
        return vlans


class CiscoASADevice(CiscoDevice):
    """Cisco ASA specific implementation"""
    
    def __init__(self, hostname: str, ip_address: str, credentials: Dict[str, str],
                 port: int = 22, timeout: int = 30):
        super().__init__(hostname, ip_address, credentials, "cisco_asa", port, timeout)
    
    def get_firewall_rules(self) -> List[Dict[str, Any]]:
        """Get firewall rules (ASA specific)"""
        rules = []
        
        try:
            # Get access-lists
            output = self.execute_command("show access-list").output
            
            current_acl = None
            for line in output.split('\n'):
                # Check for ACL name
                acl_match = re.match(r'^access-list (\S+)', line)
                if acl_match:
                    current_acl = acl_match.group(1)
                
                # Parse ACL entries
                if current_acl and 'line' in line:
                    rule = {
                        'acl_name': current_acl,
                        'rule': line.strip()
                    }
                    rules.append(rule)
        
        except Exception as e:
            self.logger.error(f"Failed to get firewall rules: {str(e)}")
        
        return rules
    
    def get_nat_rules(self) -> List[Dict[str, Any]]:
        """Get NAT rules (ASA specific)"""
        nat_rules = []
        
        try:
            output = self.execute_command("show nat").output
            
            # Parse NAT rules
            for section in output.split('\n\n'):
                if 'translate_hits' in section:
                    nat_rules.append({
                        'rule': section.strip()
                    })
        
        except Exception as e:
            self.logger.error(f"Failed to get NAT rules: {str(e)}")
        
        return nat_rules