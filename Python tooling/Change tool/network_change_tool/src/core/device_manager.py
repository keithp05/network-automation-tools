from typing import Dict, List, Optional, Type, Union
import concurrent.futures
from threading import Lock
import logging
from pathlib import Path

from ..devices.base_device import BaseDevice
from ..devices.cisco_device import CiscoIOSDevice, CiscoNXOSDevice, CiscoASADevice
from ..devices.paloalto_device import PaloAltoDevice
from ..core.config import DeviceConfig, AppConfig
from ..core.exceptions import ConfigurationError, DeviceConnectionError
from ..core.credential_manager import CredentialManager, setup_credential_manager


class DeviceManager:
    """Manages device connections and operations"""
    
    # Device type mapping
    DEVICE_TYPES: Dict[str, Type[BaseDevice]] = {
        'cisco_ios': CiscoIOSDevice,
        'cisco_nxos': CiscoNXOSDevice,
        'cisco_asa': CiscoASADevice,
        'paloalto_panos': PaloAltoDevice
    }
    
    def __init__(self, config: Optional[AppConfig] = None, 
                 credential_manager: Optional[CredentialManager] = None):
        self.config = config
        self.devices: Dict[str, BaseDevice] = {}
        self.device_configs: Dict[str, DeviceConfig] = {}
        self._lock = Lock()
        self.logger = logging.getLogger(self.__class__.__name__)
        self.max_parallel_connections = config.change.max_parallel_devices if config else 5
        
        # Initialize credential manager
        self.credential_manager = credential_manager or setup_credential_manager()
        
        # Load devices from config if provided
        if config:
            self.load_devices_from_config(config)
    
    def load_devices_from_config(self, config: AppConfig):
        """Load device configurations from app config"""
        for device_config in config.devices:
            self.add_device(device_config)
    
    def add_device(self, device_config: DeviceConfig) -> str:
        """Add a device configuration"""
        device_id = f"{device_config.hostname}_{device_config.ip_address}"
        
        with self._lock:
            self.device_configs[device_id] = device_config
            
        self.logger.info(f"Added device configuration: {device_id}")
        return device_id
    
    def remove_device(self, device_id: str):
        """Remove a device"""
        with self._lock:
            # Disconnect if connected
            if device_id in self.devices:
                self.disconnect_device(device_id)
            
            # Remove configuration
            if device_id in self.device_configs:
                del self.device_configs[device_id]
                
        self.logger.info(f"Removed device: {device_id}")
    
    def get_device(self, device_id: str) -> Optional[BaseDevice]:
        """Get a connected device instance"""
        return self.devices.get(device_id)
    
    def get_device_config(self, device_id: str) -> Optional[DeviceConfig]:
        """Get device configuration"""
        return self.device_configs.get(device_id)
    
    def list_devices(self) -> List[Dict[str, any]]:
        """List all devices with their status"""
        device_list = []
        
        for device_id, config in self.device_configs.items():
            device = self.devices.get(device_id)
            
            device_info = {
                'id': device_id,
                'hostname': config.hostname,
                'ip_address': config.ip_address,
                'device_type': config.device_type,
                'tags': config.tags,
                'connected': device is not None,
                'status': device.status.value if device else 'disconnected'
            }
            
            device_list.append(device_info)
        
        return device_list
    
    def connect_device(self, device_id: str) -> BaseDevice:
        """Connect to a specific device"""
        config = self.device_configs.get(device_id)
        if not config:
            raise ConfigurationError(f"Device {device_id} not found in configuration")
        
        # Check if already connected
        if device_id in self.devices:
            device = self.devices[device_id]
            if device.is_connected():
                return device
            else:
                # Remove disconnected device
                del self.devices[device_id]
        
        # Get device class
        device_class = self.DEVICE_TYPES.get(config.device_type)
        if not device_class:
            raise ConfigurationError(f"Unknown device type: {config.device_type}")
        
        # Get credentials from credential manager
        try:
            device_config_dict = {
                'hostname': config.hostname,
                'ip_address': config.ip_address,
                'device_type': config.device_type,
                'port': config.port,
                'credentials': config.credentials.__dict__ if config.credentials else {}
            }
            
            credential_set = self.credential_manager.get_credentials(device_id, device_config_dict)
            
            credentials = {
                'username': credential_set.username,
                'password': credential_set.password
            }
            
            if credential_set.enable_password:
                credentials['enable_password'] = credential_set.enable_password
            
            if credential_set.api_key:
                credentials['api_key'] = credential_set.api_key
                
        except Exception as e:
            self.logger.error(f"Failed to get credentials for {device_id}: {e}")
            raise ConfigurationError(f"Failed to get credentials: {e}")
        
        device = device_class(
            hostname=config.hostname,
            ip_address=config.ip_address,
            credentials=credentials,
            port=config.port,
            timeout=config.timeout
        )
        
        try:
            # Connect to device
            device.connect()
            
            with self._lock:
                self.devices[device_id] = device
            
            self.logger.info(f"Connected to device: {device_id}")
            return device
            
        except Exception as e:
            self.logger.error(f"Failed to connect to {device_id}: {str(e)}")
            raise
    
    def disconnect_device(self, device_id: str) -> bool:
        """Disconnect from a specific device"""
        device = self.devices.get(device_id)
        if not device:
            return False
        
        try:
            device.disconnect()
            
            with self._lock:
                del self.devices[device_id]
            
            self.logger.info(f"Disconnected from device: {device_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error disconnecting from {device_id}: {str(e)}")
            return False
    
    def connect_multiple_devices(self, device_ids: List[str], 
                               parallel: bool = True) -> Dict[str, Union[BaseDevice, Exception]]:
        """Connect to multiple devices"""
        results = {}
        
        if parallel:
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_parallel_connections) as executor:
                # Submit connection tasks
                future_to_device = {
                    executor.submit(self.connect_device, device_id): device_id 
                    for device_id in device_ids
                }
                
                # Collect results
                for future in concurrent.futures.as_completed(future_to_device):
                    device_id = future_to_device[future]
                    try:
                        device = future.result()
                        results[device_id] = device
                    except Exception as e:
                        results[device_id] = e
                        self.logger.error(f"Failed to connect to {device_id}: {str(e)}")
        else:
            # Sequential connection
            for device_id in device_ids:
                try:
                    device = self.connect_device(device_id)
                    results[device_id] = device
                except Exception as e:
                    results[device_id] = e
                    self.logger.error(f"Failed to connect to {device_id}: {str(e)}")
        
        return results
    
    def disconnect_all(self):
        """Disconnect from all devices"""
        device_ids = list(self.devices.keys())
        
        for device_id in device_ids:
            self.disconnect_device(device_id)
    
    def execute_on_devices(self, device_ids: List[str], operation: callable, 
                         parallel: bool = True, **kwargs) -> Dict[str, any]:
        """Execute an operation on multiple devices"""
        results = {}
        
        # Ensure devices are connected
        connection_results = self.connect_multiple_devices(device_ids, parallel=parallel)
        
        # Filter out failed connections
        connected_devices = {
            device_id: device 
            for device_id, device in connection_results.items() 
            if isinstance(device, BaseDevice)
        }
        
        if parallel:
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_parallel_connections) as executor:
                # Submit operations
                future_to_device = {
                    executor.submit(operation, device, **kwargs): device_id 
                    for device_id, device in connected_devices.items()
                }
                
                # Collect results
                for future in concurrent.futures.as_completed(future_to_device):
                    device_id = future_to_device[future]
                    try:
                        result = future.result()
                        results[device_id] = result
                    except Exception as e:
                        results[device_id] = e
                        self.logger.error(f"Operation failed on {device_id}: {str(e)}")
        else:
            # Sequential execution
            for device_id, device in connected_devices.items():
                try:
                    result = operation(device, **kwargs)
                    results[device_id] = result
                except Exception as e:
                    results[device_id] = e
                    self.logger.error(f"Operation failed on {device_id}: {str(e)}")
        
        return results
    
    def backup_devices(self, device_ids: List[str], backup_path: Path, 
                      compress: bool = True, encrypt: bool = False, 
                      parallel: bool = True) -> Dict[str, any]:
        """Backup multiple devices"""
        def backup_operation(device: BaseDevice, **kwargs):
            return device.backup_config(**kwargs)
        
        return self.execute_on_devices(
            device_ids=device_ids,
            operation=backup_operation,
            parallel=parallel,
            backup_path=backup_path,
            compress=compress,
            encrypt=encrypt
        )
    
    def get_devices_by_tag(self, tag: str) -> List[str]:
        """Get device IDs by tag"""
        device_ids = []
        
        for device_id, config in self.device_configs.items():
            if tag in config.tags:
                device_ids.append(device_id)
        
        return device_ids
    
    def get_devices_by_type(self, device_type: str) -> List[str]:
        """Get device IDs by type"""
        device_ids = []
        
        for device_id, config in self.device_configs.items():
            if config.device_type == device_type:
                device_ids.append(device_id)
        
        return device_ids
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - disconnect all devices"""
        self.disconnect_all()