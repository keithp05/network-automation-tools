import ipaddress
import socket
import threading
import concurrent.futures
from typing import List, Dict, Optional, Tuple, Any, Set
from dataclasses import dataclass
from enum import Enum
import subprocess
import re
import json
import nmap
import paramiko
import requests
from pathlib import Path
import logging

from .config import DeviceConfig, DeviceCredentials
from .exceptions import DeviceConnectionError


class DiscoveryMethod(Enum):
    PING_SWEEP = "ping_sweep"
    NMAP_SCAN = "nmap_scan"
    SNMP_WALK = "snmp_walk"
    SSH_BANNER = "ssh_banner"
    HTTP_BANNER = "http_banner"
    CDP_NEIGHBORS = "cdp_neighbors"
    LLDP_NEIGHBORS = "lldp_neighbors"
    MANUAL_LIST = "manual_list"


@dataclass
class DiscoveredDevice:
    """Represents a discovered network device"""
    ip_address: str
    hostname: Optional[str] = None
    device_type: Optional[str] = None
    vendor: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    ports_open: List[int] = None
    snmp_community: Optional[str] = None
    ssh_banner: Optional[str] = None
    http_banner: Optional[str] = None
    mac_address: Optional[str] = None
    discovery_method: DiscoveryMethod = DiscoveryMethod.PING_SWEEP
    confidence: float = 0.0
    additional_info: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.ports_open is None:
            self.ports_open = []
        if self.additional_info is None:
            self.additional_info = {}


class DeviceDiscovery:
    """Network device discovery and identification"""
    
    # Device type identification patterns
    DEVICE_PATTERNS = {
        'cisco_ios': [
            r'cisco.*ios',
            r'cisco.*catalyst',
            r'cisco.*nexus',
            r'cisco.*switch',
            r'cisco.*router'
        ],
        'cisco_nxos': [
            r'cisco.*nexus',
            r'cisco.*nx-os',
            r'nxos'
        ],
        'cisco_asa': [
            r'cisco.*asa',
            r'cisco.*adaptive security appliance',
            r'cisco.*firewall'
        ],
        'paloalto_panos': [
            r'palo alto',
            r'pan-os',
            r'panos'
        ],
        'juniper': [
            r'juniper',
            r'junos'
        ],
        'arista': [
            r'arista',
            r'eos'
        ],
        'fortinet': [
            r'fortinet',
            r'fortigate'
        ]
    }
    
    # Common network device ports
    COMMON_PORTS = {
        22: 'SSH',
        23: 'Telnet',
        80: 'HTTP',
        443: 'HTTPS',
        161: 'SNMP',
        162: 'SNMP Trap',
        514: 'Syslog',
        830: 'NETCONF'
    }
    
    def __init__(self, timeout: int = 5, max_workers: int = 50):
        self.timeout = timeout
        self.max_workers = max_workers
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Initialize nmap scanner
        try:
            self.nm = nmap.PortScanner()
            self.nmap_available = True
        except Exception as e:
            self.logger.warning(f"Nmap not available: {e}")
            self.nmap_available = False
    
    def discover_network_range(self, network_range: str, 
                              methods: List[DiscoveryMethod] = None) -> List[DiscoveredDevice]:
        """Discover devices in a network range"""
        if methods is None:
            methods = [DiscoveryMethod.PING_SWEEP, DiscoveryMethod.NMAP_SCAN]
        
        discovered_devices = []
        
        try:
            network = ipaddress.IPv4Network(network_range, strict=False)
            ip_addresses = [str(ip) for ip in network.hosts()]
            
            # Apply discovery methods
            for method in methods:
                if method == DiscoveryMethod.PING_SWEEP:
                    devices = self._ping_sweep(ip_addresses)
                elif method == DiscoveryMethod.NMAP_SCAN:
                    devices = self._nmap_scan(network_range)
                elif method == DiscoveryMethod.SSH_BANNER:
                    devices = self._ssh_banner_grab(ip_addresses)
                elif method == DiscoveryMethod.HTTP_BANNER:
                    devices = self._http_banner_grab(ip_addresses)
                elif method == DiscoveryMethod.SNMP_WALK:
                    devices = self._snmp_discovery(ip_addresses)
                else:
                    continue
                
                discovered_devices.extend(devices)
        
        except Exception as e:
            self.logger.error(f"Network discovery failed: {e}")
        
        # Merge duplicate devices
        return self._merge_discovered_devices(discovered_devices)
    
    def _ping_sweep(self, ip_addresses: List[str]) -> List[DiscoveredDevice]:
        """Perform ping sweep to find live hosts"""
        discovered_devices = []
        
        def ping_host(ip: str) -> Optional[DiscoveredDevice]:
            try:
                # Use subprocess for ping
                if subprocess.run(['ping', '-c', '1', '-W', '1', ip], 
                                stdout=subprocess.DEVNULL, 
                                stderr=subprocess.DEVNULL).returncode == 0:
                    return DiscoveredDevice(
                        ip_address=ip,
                        discovery_method=DiscoveryMethod.PING_SWEEP,
                        confidence=0.3
                    )
            except Exception:
                pass
            return None
        
        # Use thread pool for concurrent pings
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(ping_host, ip) for ip in ip_addresses]
            
            for future in concurrent.futures.as_completed(futures):
                device = future.result()
                if device:
                    discovered_devices.append(device)
        
        self.logger.info(f"Ping sweep found {len(discovered_devices)} live hosts")
        return discovered_devices
    
    def _nmap_scan(self, network_range: str) -> List[DiscoveredDevice]:
        """Use nmap for comprehensive network scanning"""
        if not self.nmap_available:
            return []
        
        discovered_devices = []
        
        try:
            # Perform nmap scan
            self.nm.scan(hosts=network_range, ports='22,23,80,443,161,830', arguments='-sS -O')
            
            for host in self.nm.all_hosts():
                if self.nm[host].state() == 'up':
                    device = DiscoveredDevice(
                        ip_address=host,
                        discovery_method=DiscoveryMethod.NMAP_SCAN,
                        confidence=0.7
                    )
                    
                    # Get hostname
                    if 'hostnames' in self.nm[host]:
                        hostnames = self.nm[host]['hostnames']
                        if hostnames:
                            device.hostname = hostnames[0]['name']
                    
                    # Get open ports
                    for proto in self.nm[host].all_protocols():
                        ports = self.nm[host][proto].keys()
                        for port in ports:
                            if self.nm[host][proto][port]['state'] == 'open':
                                device.ports_open.append(port)
                    
                    # OS detection
                    if 'osmatch' in self.nm[host]:
                        for osmatch in self.nm[host]['osmatch']:
                            os_info = osmatch['name'].lower()
                            device.os_version = osmatch['name']
                            
                            # Identify device type from OS
                            device.device_type = self._identify_device_type(os_info)
                            if device.device_type:
                                device.confidence = 0.8
                            break
                    
                    discovered_devices.append(device)
        
        except Exception as e:
            self.logger.error(f"Nmap scan failed: {e}")
        
        self.logger.info(f"Nmap scan found {len(discovered_devices)} devices")
        return discovered_devices
    
    def _ssh_banner_grab(self, ip_addresses: List[str]) -> List[DiscoveredDevice]:
        """Grab SSH banners to identify devices"""
        discovered_devices = []
        
        def get_ssh_banner(ip: str) -> Optional[DiscoveredDevice]:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                
                if sock.connect_ex((ip, 22)) == 0:
                    banner = sock.recv(1024).decode('utf-8', errors='ignore')
                    sock.close()
                    
                    if banner:
                        device = DiscoveredDevice(
                            ip_address=ip,
                            ssh_banner=banner.strip(),
                            discovery_method=DiscoveryMethod.SSH_BANNER,
                            ports_open=[22],
                            confidence=0.6
                        )
                        
                        # Identify device type from banner
                        device.device_type = self._identify_device_type(banner.lower())
                        if device.device_type:
                            device.confidence = 0.8
                        
                        return device
            except Exception:
                pass
            return None
        
        # Use thread pool for concurrent banner grabbing
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(get_ssh_banner, ip) for ip in ip_addresses]
            
            for future in concurrent.futures.as_completed(futures):
                device = future.result()
                if device:
                    discovered_devices.append(device)
        
        self.logger.info(f"SSH banner grab found {len(discovered_devices)} devices")
        return discovered_devices
    
    def _http_banner_grab(self, ip_addresses: List[str]) -> List[DiscoveredDevice]:
        """Grab HTTP banners to identify devices"""
        discovered_devices = []
        
        def get_http_banner(ip: str) -> Optional[DiscoveredDevice]:
            for port in [80, 443]:
                try:
                    protocol = 'https' if port == 443 else 'http'
                    url = f"{protocol}://{ip}:{port}"
                    
                    response = requests.get(url, timeout=self.timeout, verify=False)
                    
                    if response.status_code == 200:
                        device = DiscoveredDevice(
                            ip_address=ip,
                            http_banner=response.headers.get('Server', ''),
                            discovery_method=DiscoveryMethod.HTTP_BANNER,
                            ports_open=[port],
                            confidence=0.5
                        )
                        
                        # Check for device-specific headers or content
                        content = response.text.lower()
                        server_header = response.headers.get('Server', '').lower()
                        
                        # Identify device type
                        device.device_type = self._identify_device_type(
                            content + ' ' + server_header
                        )
                        if device.device_type:
                            device.confidence = 0.7
                        
                        return device
                
                except Exception:
                    continue
            
            return None
        
        # Use thread pool for concurrent HTTP requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(get_http_banner, ip) for ip in ip_addresses]
            
            for future in concurrent.futures.as_completed(futures):
                device = future.result()
                if device:
                    discovered_devices.append(device)
        
        self.logger.info(f"HTTP banner grab found {len(discovered_devices)} devices")
        return discovered_devices
    
    def _snmp_discovery(self, ip_addresses: List[str], 
                       communities: List[str] = None) -> List[DiscoveredDevice]:
        """Discover devices using SNMP"""
        if communities is None:
            communities = ['public', 'private', 'community']
        
        discovered_devices = []
        
        try:
            from pysnmp.hlapi import *
            
            def snmp_walk(ip: str) -> Optional[DiscoveredDevice]:
                for community in communities:
                    try:
                        # Get system description (1.3.6.1.2.1.1.1.0)
                        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
                            SnmpEngine(),
                            CommunityData(community),
                            UdpTransportTarget((ip, 161), timeout=self.timeout),
                            ContextData(),
                            ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')),
                            lexicographicMode=False,
                            maxRows=1
                        ):
                            if errorIndication:
                                break
                            if errorStatus:
                                break
                            
                            for varBind in varBinds:
                                sys_descr = str(varBind[1])
                                
                                device = DiscoveredDevice(
                                    ip_address=ip,
                                    snmp_community=community,
                                    discovery_method=DiscoveryMethod.SNMP_WALK,
                                    ports_open=[161],
                                    confidence=0.7,
                                    additional_info={'system_description': sys_descr}
                                )
                                
                                # Identify device type from system description
                                device.device_type = self._identify_device_type(sys_descr.lower())
                                if device.device_type:
                                    device.confidence = 0.9
                                
                                return device
                    
                    except Exception:
                        continue
                
                return None
            
            # Use thread pool for concurrent SNMP walks
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = [executor.submit(snmp_walk, ip) for ip in ip_addresses]
                
                for future in concurrent.futures.as_completed(futures):
                    device = future.result()
                    if device:
                        discovered_devices.append(device)
        
        except ImportError:
            self.logger.warning("pysnmp not available for SNMP discovery")
        except Exception as e:
            self.logger.error(f"SNMP discovery failed: {e}")
        
        self.logger.info(f"SNMP discovery found {len(discovered_devices)} devices")
        return discovered_devices
    
    def _identify_device_type(self, text: str) -> Optional[str]:
        """Identify device type from text using patterns"""
        text_lower = text.lower()
        
        for device_type, patterns in self.DEVICE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return device_type
        
        return None
    
    def _merge_discovered_devices(self, devices: List[DiscoveredDevice]) -> List[DiscoveredDevice]:
        """Merge duplicate devices from different discovery methods"""
        merged_devices = {}
        
        for device in devices:
            ip = device.ip_address
            
            if ip not in merged_devices:
                merged_devices[ip] = device
            else:
                # Merge device information
                existing = merged_devices[ip]
                
                # Keep the device with higher confidence
                if device.confidence > existing.confidence:
                    merged_devices[ip] = device
                    # Merge ports
                    existing.ports_open.extend(device.ports_open)
                    device.ports_open = list(set(existing.ports_open + device.ports_open))
                    merged_devices[ip] = device
                else:
                    # Merge information into existing device
                    existing.ports_open.extend(device.ports_open)
                    existing.ports_open = list(set(existing.ports_open))
                    
                    # Merge other information
                    if not existing.hostname and device.hostname:
                        existing.hostname = device.hostname
                    if not existing.ssh_banner and device.ssh_banner:
                        existing.ssh_banner = device.ssh_banner
                    if not existing.http_banner and device.http_banner:
                        existing.http_banner = device.http_banner
                    if not existing.snmp_community and device.snmp_community:
                        existing.snmp_community = device.snmp_community
        
        return list(merged_devices.values())
    
    def discover_cdp_neighbors(self, device_manager, device_id: str) -> List[DiscoveredDevice]:
        """Discover neighbors using CDP"""
        discovered_devices = []
        
        try:
            device = device_manager.get_device(device_id)
            if not device:
                return discovered_devices
            
            # Get CDP neighbors
            result = device.execute_command("show cdp neighbors detail")
            
            if result.success:
                # Parse CDP output
                neighbors = self._parse_cdp_output(result.output)
                
                for neighbor in neighbors:
                    discovered_device = DiscoveredDevice(
                        ip_address=neighbor.get('ip_address', ''),
                        hostname=neighbor.get('hostname', ''),
                        device_type=self._identify_device_type(neighbor.get('platform', '')),
                        model=neighbor.get('platform', ''),
                        discovery_method=DiscoveryMethod.CDP_NEIGHBORS,
                        confidence=0.9,
                        additional_info=neighbor
                    )
                    
                    discovered_devices.append(discovered_device)
        
        except Exception as e:
            self.logger.error(f"CDP neighbor discovery failed: {e}")
        
        return discovered_devices
    
    def discover_lldp_neighbors(self, device_manager, device_id: str) -> List[DiscoveredDevice]:
        """Discover neighbors using LLDP"""
        discovered_devices = []
        
        try:
            device = device_manager.get_device(device_id)
            if not device:
                return discovered_devices
            
            # Get LLDP neighbors
            result = device.execute_command("show lldp neighbors detail")
            
            if result.success:
                # Parse LLDP output
                neighbors = self._parse_lldp_output(result.output)
                
                for neighbor in neighbors:
                    discovered_device = DiscoveredDevice(
                        ip_address=neighbor.get('ip_address', ''),
                        hostname=neighbor.get('hostname', ''),
                        device_type=self._identify_device_type(neighbor.get('system_description', '')),
                        discovery_method=DiscoveryMethod.LLDP_NEIGHBORS,
                        confidence=0.9,
                        additional_info=neighbor
                    )
                    
                    discovered_devices.append(discovered_device)
        
        except Exception as e:
            self.logger.error(f"LLDP neighbor discovery failed: {e}")
        
        return discovered_devices
    
    def _parse_cdp_output(self, output: str) -> List[Dict[str, Any]]:
        """Parse CDP neighbors output"""
        neighbors = []
        current_neighbor = {}
        
        for line in output.split('\n'):
            line = line.strip()
            
            if line.startswith('Device ID:'):
                if current_neighbor:
                    neighbors.append(current_neighbor)
                current_neighbor = {'hostname': line.split(':', 1)[1].strip()}
            
            elif line.startswith('IP address:'):
                current_neighbor['ip_address'] = line.split(':', 1)[1].strip()
            
            elif line.startswith('Platform:'):
                current_neighbor['platform'] = line.split(':', 1)[1].strip()
            
            elif line.startswith('Interface:'):
                current_neighbor['local_interface'] = line.split(':', 1)[1].strip()
        
        if current_neighbor:
            neighbors.append(current_neighbor)
        
        return neighbors
    
    def _parse_lldp_output(self, output: str) -> List[Dict[str, Any]]:
        """Parse LLDP neighbors output"""
        neighbors = []
        current_neighbor = {}
        
        for line in output.split('\n'):
            line = line.strip()
            
            if line.startswith('System Name:'):
                if current_neighbor:
                    neighbors.append(current_neighbor)
                current_neighbor = {'hostname': line.split(':', 1)[1].strip()}
            
            elif line.startswith('System Description:'):
                current_neighbor['system_description'] = line.split(':', 1)[1].strip()
            
            elif line.startswith('Management Address:'):
                current_neighbor['ip_address'] = line.split(':', 1)[1].strip()
            
            elif line.startswith('Local Interface:'):
                current_neighbor['local_interface'] = line.split(':', 1)[1].strip()
        
        if current_neighbor:
            neighbors.append(current_neighbor)
        
        return neighbors
    
    def auto_configure_devices(self, discovered_devices: List[DiscoveredDevice],
                              default_credentials: Dict[str, str] = None) -> List[DeviceConfig]:
        """Auto-configure device configurations from discovered devices"""
        device_configs = []
        
        if default_credentials is None:
            default_credentials = {
                'username': 'admin',
                'password': 'admin'
            }
        
        for device in discovered_devices:
            if device.device_type and device.ip_address:
                # Create device configuration
                credentials = DeviceCredentials(
                    username=default_credentials.get('username'),
                    password=default_credentials.get('password'),
                    enable_password=default_credentials.get('enable_password'),
                    api_key=default_credentials.get('api_key')
                )
                
                # Determine port based on device type
                port = 22  # Default SSH port
                if device.device_type == 'paloalto_panos':
                    port = 443
                elif 443 in device.ports_open:
                    port = 443
                elif 80 in device.ports_open:
                    port = 80
                
                device_config = DeviceConfig(
                    hostname=device.hostname or f"device-{device.ip_address.replace('.', '-')}",
                    ip_address=device.ip_address,
                    device_type=device.device_type,
                    port=port,
                    credentials=credentials,
                    tags=['discovered', 'auto-configured']
                )
                
                device_configs.append(device_config)
        
        return device_configs
    
    def save_discovery_results(self, devices: List[DiscoveredDevice], 
                             output_file: Path):
        """Save discovery results to file"""
        results = {
            'discovery_timestamp': str(datetime.now()),
            'total_devices': len(devices),
            'devices': [
                {
                    'ip_address': device.ip_address,
                    'hostname': device.hostname,
                    'device_type': device.device_type,
                    'vendor': device.vendor,
                    'model': device.model,
                    'os_version': device.os_version,
                    'ports_open': device.ports_open,
                    'discovery_method': device.discovery_method.value,
                    'confidence': device.confidence,
                    'ssh_banner': device.ssh_banner,
                    'http_banner': device.http_banner,
                    'snmp_community': device.snmp_community,
                    'additional_info': device.additional_info
                }
                for device in devices
            ]
        }
        
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        self.logger.info(f"Saved discovery results to {output_file}")
    
    def load_discovery_results(self, input_file: Path) -> List[DiscoveredDevice]:
        """Load discovery results from file"""
        devices = []
        
        try:
            with open(input_file, 'r') as f:
                results = json.load(f)
            
            for device_data in results.get('devices', []):
                device = DiscoveredDevice(
                    ip_address=device_data['ip_address'],
                    hostname=device_data.get('hostname'),
                    device_type=device_data.get('device_type'),
                    vendor=device_data.get('vendor'),
                    model=device_data.get('model'),
                    os_version=device_data.get('os_version'),
                    ports_open=device_data.get('ports_open', []),
                    discovery_method=DiscoveryMethod(device_data.get('discovery_method', 'ping_sweep')),
                    confidence=device_data.get('confidence', 0.0),
                    ssh_banner=device_data.get('ssh_banner'),
                    http_banner=device_data.get('http_banner'),
                    snmp_community=device_data.get('snmp_community'),
                    additional_info=device_data.get('additional_info', {})
                )
                devices.append(device)
        
        except Exception as e:
            self.logger.error(f"Failed to load discovery results: {e}")
        
        return devices