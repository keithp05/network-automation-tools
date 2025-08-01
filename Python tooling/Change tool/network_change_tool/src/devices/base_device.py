from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from pathlib import Path
import logging
from dataclasses import dataclass
from enum import Enum

from ..core.exceptions import (
    DeviceConnectionError, 
    AuthenticationError, 
    BackupError,
    ChangeExecutionError,
    ValidationError
)


class DeviceStatus(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    AUTHENTICATED = "authenticated"
    ERROR = "error"
    BUSY = "busy"


@dataclass
class CommandResult:
    command: str
    output: str
    success: bool
    error_message: Optional[str] = None
    execution_time: Optional[float] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class BackupInfo:
    device_hostname: str
    backup_path: Path
    timestamp: datetime
    size_bytes: int
    checksum: str
    compressed: bool = False
    encrypted: bool = False
    backup_type: str = "full"


class BaseDevice(ABC):
    """Abstract base class for all network devices"""
    
    def __init__(self, hostname: str, ip_address: str, credentials: Dict[str, str], 
                 port: int = 22, timeout: int = 30):
        self.hostname = hostname
        self.ip_address = ip_address
        self.credentials = credentials
        self.port = port
        self.timeout = timeout
        self.status = DeviceStatus.DISCONNECTED
        self.connection = None
        self.logger = logging.getLogger(f"{self.__class__.__name__}.{hostname}")
        self._last_backup: Optional[BackupInfo] = None
        self._command_history: List[CommandResult] = []
        
    @abstractmethod
    def connect(self) -> bool:
        """Establish connection to the device"""
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """Disconnect from the device"""
        pass
    
    @abstractmethod
    def execute_command(self, command: str, timeout: Optional[int] = None) -> CommandResult:
        """Execute a single command on the device"""
        pass
    
    @abstractmethod
    def execute_commands(self, commands: List[str], stop_on_error: bool = True) -> List[CommandResult]:
        """Execute multiple commands on the device"""
        pass
    
    @abstractmethod
    def get_running_config(self) -> str:
        """Retrieve the running configuration"""
        pass
    
    @abstractmethod
    def get_startup_config(self) -> str:
        """Retrieve the startup configuration"""
        pass
    
    @abstractmethod
    def save_config(self) -> bool:
        """Save running configuration to startup"""
        pass
    
    @abstractmethod
    def backup_config(self, backup_path: Path, compress: bool = True, 
                     encrypt: bool = False) -> BackupInfo:
        """Create a backup of the device configuration"""
        pass
    
    @abstractmethod
    def restore_config(self, backup_info: BackupInfo) -> bool:
        """Restore configuration from backup"""
        pass
    
    @abstractmethod
    def validate_config(self, config: str) -> Tuple[bool, List[str]]:
        """Validate configuration syntax"""
        pass
    
    @abstractmethod
    def apply_configuration(self, config: str, save: bool = True) -> CommandResult:
        """Apply configuration to the device"""
        pass
    
    @abstractmethod
    def check_connectivity(self) -> bool:
        """Check if device is reachable"""
        pass
    
    @abstractmethod
    def get_device_info(self) -> Dict[str, Any]:
        """Get device information (model, version, etc.)"""
        pass
    
    @abstractmethod
    def get_interface_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all interfaces"""
        pass
    
    @abstractmethod
    def get_routing_table(self) -> List[Dict[str, Any]]:
        """Get the routing table"""
        pass
    
    def get_command_history(self, limit: Optional[int] = None) -> List[CommandResult]:
        """Get command execution history"""
        if limit:
            return self._command_history[-limit:]
        return self._command_history
    
    def clear_command_history(self):
        """Clear command execution history"""
        self._command_history.clear()
    
    def get_last_backup(self) -> Optional[BackupInfo]:
        """Get information about the last backup"""
        return self._last_backup
    
    def is_connected(self) -> bool:
        """Check if device is connected"""
        return self.status in [DeviceStatus.CONNECTED, DeviceStatus.AUTHENTICATED, DeviceStatus.BUSY]
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()
        
    def __str__(self):
        return f"{self.__class__.__name__}({self.hostname}, {self.ip_address})"
    
    def __repr__(self):
        return (f"{self.__class__.__name__}(hostname='{self.hostname}', "
                f"ip_address='{self.ip_address}', port={self.port}, "
                f"status={self.status.value})")