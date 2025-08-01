import os
import json
import keyring
from pathlib import Path
from typing import Dict, Optional, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import getpass
import logging
from dataclasses import dataclass
from enum import Enum

from .exceptions import AuthenticationError, ConfigurationError


class CredentialSource(Enum):
    CONFIG_FILE = "config_file"
    ENVIRONMENT = "environment"
    KEYRING = "keyring"
    ENCRYPTED_FILE = "encrypted_file"
    PROMPT = "prompt"
    VAULT = "vault"  # For future HashiCorp Vault integration


@dataclass
class DeviceCredentialSet:
    """Complete credential set for a device"""
    device_id: str
    username: str
    password: str
    enable_password: Optional[str] = None
    api_key: Optional[str] = None
    source: CredentialSource = CredentialSource.CONFIG_FILE


class CredentialManager:
    """Secure credential management for network devices"""
    
    def __init__(self, config_path: Optional[Path] = None, 
                 master_password: Optional[str] = None):
        self.config_path = config_path or Path("./configs/credentials")
        self.master_password = master_password
        self.logger = logging.getLogger(self.__class__.__name__)
        self._encryption_key = None
        self._credentials_cache: Dict[str, DeviceCredentialSet] = {}
        
        # Create credentials directory
        self.config_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize encryption
        self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize encryption for credential storage"""
        if self.master_password:
            # Derive encryption key from master password
            password_bytes = self.master_password.encode()
            salt = b'network_tool_salt'  # In production, use random salt
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
            self._encryption_key = Fernet(key)
    
    def add_credential_set(self, device_id: str, username: str, password: str,
                          enable_password: Optional[str] = None,
                          api_key: Optional[str] = None,
                          source: CredentialSource = CredentialSource.CONFIG_FILE,
                          store_encrypted: bool = True):
        """Add credentials for a device"""
        credential_set = DeviceCredentialSet(
            device_id=device_id,
            username=username,
            password=password,
            enable_password=enable_password,
            api_key=api_key,
            source=source
        )
        
        # Cache credentials
        self._credentials_cache[device_id] = credential_set
        
        # Store encrypted if requested
        if store_encrypted and self._encryption_key:
            self._store_encrypted_credentials(device_id, credential_set)
        
        self.logger.info(f"Added credentials for {device_id} from {source.value}")
    
    def get_credentials(self, device_id: str, device_config: Dict[str, Any]) -> DeviceCredentialSet:
        """Get credentials for a device using multiple sources"""
        # Check cache first
        if device_id in self._credentials_cache:
            return self._credentials_cache[device_id]
        
        # Try different credential sources in order of priority
        credential_sources = [
            self._get_from_environment,
            self._get_from_keyring,
            self._get_from_encrypted_file,
            self._get_from_config,
            self._get_from_prompt
        ]
        
        for source_func in credential_sources:
            try:
                credentials = source_func(device_id, device_config)
                if credentials:
                    # Cache the credentials
                    self._credentials_cache[device_id] = credentials
                    return credentials
            except Exception as e:
                self.logger.debug(f"Failed to get credentials from {source_func.__name__}: {e}")
                continue
        
        raise AuthenticationError(f"No credentials found for device {device_id}")
    
    def _get_from_environment(self, device_id: str, device_config: Dict[str, Any]) -> Optional[DeviceCredentialSet]:
        """Get credentials from environment variables"""
        # Try device-specific environment variables first
        device_prefix = device_id.replace("-", "_").replace(".", "_").upper()
        
        username = os.getenv(f"{device_prefix}_USERNAME") or os.getenv("DEVICE_USERNAME")
        password = os.getenv(f"{device_prefix}_PASSWORD") or os.getenv("DEVICE_PASSWORD")
        enable_password = os.getenv(f"{device_prefix}_ENABLE_PASSWORD") or os.getenv("DEVICE_ENABLE_PASSWORD")
        api_key = os.getenv(f"{device_prefix}_API_KEY") or os.getenv("DEVICE_API_KEY")
        
        if username and password:
            self.logger.info(f"Using environment variables for {device_id}")
            return DeviceCredentialSet(
                device_id=device_id,
                username=username,
                password=password,
                enable_password=enable_password,
                api_key=api_key,
                source=CredentialSource.ENVIRONMENT
            )
        
        return None
    
    def _get_from_keyring(self, device_id: str, device_config: Dict[str, Any]) -> Optional[DeviceCredentialSet]:
        """Get credentials from system keyring"""
        try:
            service_name = "network_change_tool"
            
            # Try to get credentials from keyring
            credential_json = keyring.get_password(service_name, device_id)
            if credential_json:
                credentials_data = json.loads(credential_json)
                
                return DeviceCredentialSet(
                    device_id=device_id,
                    username=credentials_data.get("username"),
                    password=credentials_data.get("password"),
                    enable_password=credentials_data.get("enable_password"),
                    api_key=credentials_data.get("api_key"),
                    source=CredentialSource.KEYRING
                )
        except Exception as e:
            self.logger.debug(f"Failed to get credentials from keyring: {e}")
        
        return None
    
    def _get_from_encrypted_file(self, device_id: str, device_config: Dict[str, Any]) -> Optional[DeviceCredentialSet]:
        """Get credentials from encrypted file"""
        if not self._encryption_key:
            return None
        
        credential_file = self.config_path / f"{device_id}.enc"
        if not credential_file.exists():
            return None
        
        try:
            with open(credential_file, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self._encryption_key.decrypt(encrypted_data)
            credentials_data = json.loads(decrypted_data.decode())
            
            return DeviceCredentialSet(
                device_id=device_id,
                username=credentials_data.get("username"),
                password=credentials_data.get("password"),
                enable_password=credentials_data.get("enable_password"),
                api_key=credentials_data.get("api_key"),
                source=CredentialSource.ENCRYPTED_FILE
            )
        except Exception as e:
            self.logger.error(f"Failed to decrypt credentials for {device_id}: {e}")
        
        return None
    
    def _get_from_config(self, device_id: str, device_config: Dict[str, Any]) -> Optional[DeviceCredentialSet]:
        """Get credentials from device configuration"""
        credentials = device_config.get("credentials")
        if not credentials:
            return None
        
        # Resolve environment variables in config
        username = self._resolve_env_var(credentials.get("username"))
        password = self._resolve_env_var(credentials.get("password"))
        enable_password = self._resolve_env_var(credentials.get("enable_password"))
        api_key = self._resolve_env_var(credentials.get("api_key"))
        
        if username and password:
            return DeviceCredentialSet(
                device_id=device_id,
                username=username,
                password=password,
                enable_password=enable_password,
                api_key=api_key,
                source=CredentialSource.CONFIG_FILE
            )
        
        return None
    
    def _get_from_prompt(self, device_id: str, device_config: Dict[str, Any]) -> Optional[DeviceCredentialSet]:
        """Get credentials from user prompt"""
        print(f"\nCredentials required for device: {device_id}")
        print(f"Device type: {device_config.get('device_type', 'unknown')}")
        print(f"IP address: {device_config.get('ip_address', 'unknown')}")
        
        username = input("Username: ")
        if not username:
            return None
        
        password = getpass.getpass("Password: ")
        if not password:
            return None
        
        enable_password = None
        if device_config.get("device_type", "").startswith("cisco"):
            enable_password = getpass.getpass("Enable password (optional): ") or None
        
        api_key = None
        if device_config.get("device_type") == "paloalto_panos":
            api_key = getpass.getpass("API key (optional): ") or None
        
        # Ask if user wants to store credentials
        store_choice = input("Store credentials? (keyring/encrypted/no) [no]: ").lower()
        
        credential_set = DeviceCredentialSet(
            device_id=device_id,
            username=username,
            password=password,
            enable_password=enable_password,
            api_key=api_key,
            source=CredentialSource.PROMPT
        )
        
        if store_choice == "keyring":
            self._store_keyring_credentials(device_id, credential_set)
        elif store_choice == "encrypted":
            self._store_encrypted_credentials(device_id, credential_set)
        
        return credential_set
    
    def _resolve_env_var(self, value: str) -> Optional[str]:
        """Resolve environment variable references in configuration"""
        if not value:
            return None
        
        if value.startswith("${") and value.endswith("}"):
            env_var = value[2:-1]
            return os.getenv(env_var)
        
        return value
    
    def _store_keyring_credentials(self, device_id: str, credentials: DeviceCredentialSet):
        """Store credentials in system keyring"""
        try:
            service_name = "network_change_tool"
            
            credential_data = {
                "username": credentials.username,
                "password": credentials.password,
                "enable_password": credentials.enable_password,
                "api_key": credentials.api_key
            }
            
            keyring.set_password(service_name, device_id, json.dumps(credential_data))
            self.logger.info(f"Stored credentials for {device_id} in keyring")
        except Exception as e:
            self.logger.error(f"Failed to store credentials in keyring: {e}")
    
    def _store_encrypted_credentials(self, device_id: str, credentials: DeviceCredentialSet):
        """Store credentials in encrypted file"""
        if not self._encryption_key:
            self.logger.warning("No encryption key available, cannot store encrypted credentials")
            return
        
        try:
            credential_data = {
                "username": credentials.username,
                "password": credentials.password,
                "enable_password": credentials.enable_password,
                "api_key": credentials.api_key
            }
            
            credential_json = json.dumps(credential_data)
            encrypted_data = self._encryption_key.encrypt(credential_json.encode())
            
            credential_file = self.config_path / f"{device_id}.enc"
            with open(credential_file, 'wb') as f:
                f.write(encrypted_data)
            
            self.logger.info(f"Stored encrypted credentials for {device_id}")
        except Exception as e:
            self.logger.error(f"Failed to store encrypted credentials: {e}")
    
    def remove_credentials(self, device_id: str):
        """Remove credentials for a device"""
        # Remove from cache
        if device_id in self._credentials_cache:
            del self._credentials_cache[device_id]
        
        # Remove from keyring
        try:
            keyring.delete_password("network_change_tool", device_id)
        except Exception:
            pass
        
        # Remove encrypted file
        credential_file = self.config_path / f"{device_id}.enc"
        if credential_file.exists():
            credential_file.unlink()
        
        self.logger.info(f"Removed credentials for {device_id}")
    
    def list_stored_credentials(self) -> List[str]:
        """List devices with stored credentials"""
        devices = []
        
        # Check keyring
        try:
            # This is system-dependent and may not be available on all platforms
            pass
        except Exception:
            pass
        
        # Check encrypted files
        for credential_file in self.config_path.glob("*.enc"):
            device_id = credential_file.stem
            devices.append(device_id)
        
        return devices
    
    def test_credentials(self, device_id: str, device_config: Dict[str, Any]) -> bool:
        """Test if credentials work for a device"""
        try:
            credentials = self.get_credentials(device_id, device_config)
            
            # Import here to avoid circular imports
            from .device_manager import DeviceManager
            from .config import DeviceConfig, DeviceCredentials
            
            # Create a temporary device config for testing
            test_config = DeviceConfig(
                hostname=device_config.get("hostname"),
                ip_address=device_config.get("ip_address"),
                device_type=device_config.get("device_type"),
                port=device_config.get("port", 22),
                credentials=DeviceCredentials(
                    username=credentials.username,
                    password=credentials.password,
                    enable_password=credentials.enable_password,
                    api_key=credentials.api_key
                )
            )
            
            # Test connection
            device_manager = DeviceManager()
            device_manager.add_device(test_config)
            
            try:
                device_manager.connect_device(device_id)
                device_manager.disconnect_device(device_id)
                return True
            except Exception as e:
                self.logger.error(f"Credential test failed for {device_id}: {e}")
                return False
        
        except Exception as e:
            self.logger.error(f"Failed to test credentials for {device_id}: {e}")
            return False
    
    def rotate_credentials(self, device_id: str, new_password: str, 
                          new_enable_password: Optional[str] = None):
        """Rotate credentials for a device"""
        if device_id not in self._credentials_cache:
            raise ConfigurationError(f"No credentials found for {device_id}")
        
        old_credentials = self._credentials_cache[device_id]
        
        # Update credentials
        new_credentials = DeviceCredentialSet(
            device_id=device_id,
            username=old_credentials.username,
            password=new_password,
            enable_password=new_enable_password or old_credentials.enable_password,
            api_key=old_credentials.api_key,
            source=old_credentials.source
        )
        
        # Store new credentials
        self._credentials_cache[device_id] = new_credentials
        
        # Update storage based on original source
        if old_credentials.source == CredentialSource.KEYRING:
            self._store_keyring_credentials(device_id, new_credentials)
        elif old_credentials.source == CredentialSource.ENCRYPTED_FILE:
            self._store_encrypted_credentials(device_id, new_credentials)
        
        self.logger.info(f"Rotated credentials for {device_id}")
    
    def clear_cache(self):
        """Clear credential cache"""
        self._credentials_cache.clear()
        self.logger.info("Cleared credential cache")


# Utility functions for credential management
def setup_credential_manager(config_path: Optional[Path] = None, 
                           master_password: Optional[str] = None) -> CredentialManager:
    """Setup credential manager with optional master password"""
    if not master_password:
        master_password = os.getenv("NETWORK_TOOL_MASTER_PASSWORD")
    
    return CredentialManager(config_path, master_password)


def migrate_credentials_from_config(config_file: Path, 
                                  credential_manager: CredentialManager,
                                  encrypt: bool = True):
    """Migrate credentials from configuration file to secure storage"""
    import yaml
    
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    
    devices = config.get('devices', [])
    
    for device in devices:
        if 'credentials' in device:
            device_id = f"{device['hostname']}_{device['ip_address']}"
            
            credential_manager.add_credential_set(
                device_id=device_id,
                username=device['credentials'].get('username'),
                password=device['credentials'].get('password'),
                enable_password=device['credentials'].get('enable_password'),
                api_key=device['credentials'].get('api_key'),
                source=CredentialSource.CONFIG_FILE,
                store_encrypted=encrypt
            )
            
            # Remove credentials from config
            del device['credentials']
    
    # Write back the config without credentials
    with open(config_file, 'w') as f:
        yaml.dump(config, f, default_flow_style=False)
    
    print(f"Migrated credentials for {len(devices)} devices")