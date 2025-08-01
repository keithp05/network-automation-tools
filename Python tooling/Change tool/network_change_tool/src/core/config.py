from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from pathlib import Path
import yaml
import json
from pydantic import BaseModel, Field, validator
from datetime import datetime


class DeviceCredentials(BaseModel):
    username: str
    password: str
    enable_password: Optional[str] = None
    api_key: Optional[str] = None
    
    class Config:
        str_strip_whitespace = True


class DeviceConfig(BaseModel):
    hostname: str
    ip_address: str
    device_type: str = Field(..., regex="^(cisco_ios|cisco_nxos|cisco_asa|paloalto_panos)$")
    port: int = 22
    timeout: int = 30
    credentials: Optional[DeviceCredentials] = None
    tags: List[str] = Field(default_factory=list)
    
    @validator('device_type')
    def validate_device_type(cls, v):
        valid_types = ['cisco_ios', 'cisco_nxos', 'cisco_asa', 'paloalto_panos']
        if v not in valid_types:
            raise ValueError(f"Device type must be one of {valid_types}")
        return v


class BackupConfig(BaseModel):
    enabled: bool = True
    retention_days: int = 30
    backup_before_change: bool = True
    compress: bool = True
    encryption_enabled: bool = False
    backup_path: Path = Path("./backups")


class ChangeConfig(BaseModel):
    pre_checks_enabled: bool = True
    post_checks_enabled: bool = True
    rollback_on_failure: bool = True
    max_parallel_devices: int = 5
    change_window_start: Optional[datetime] = None
    change_window_end: Optional[datetime] = None
    approval_required: bool = False
    dry_run: bool = False


class AuditConfig(BaseModel):
    compliance_checks: bool = True
    configuration_drift: bool = True
    security_audit: bool = True
    report_format: str = Field(default="html", regex="^(html|pdf|excel|json)$")
    schedule: Optional[str] = None


class LoggingConfig(BaseModel):
    level: str = Field(default="INFO", regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    file_logging: bool = True
    console_logging: bool = True
    syslog_enabled: bool = False
    syslog_server: Optional[str] = None
    log_retention_days: int = 90
    log_path: Path = Path("./logs")


class AppConfig(BaseModel):
    app_name: str = "Network Change Management Tool"
    version: str = "1.0.0"
    devices: List[DeviceConfig] = Field(default_factory=list)
    backup: BackupConfig = Field(default_factory=BackupConfig)
    change: ChangeConfig = Field(default_factory=ChangeConfig)
    audit: AuditConfig = Field(default_factory=AuditConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    database_url: Optional[str] = None
    encryption_key: Optional[str] = None
    
    @classmethod
    def from_file(cls, config_path: Path) -> 'AppConfig':
        """Load configuration from YAML or JSON file"""
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            if config_path.suffix in ['.yaml', '.yml']:
                data = yaml.safe_load(f)
            elif config_path.suffix == '.json':
                data = json.load(f)
            else:
                raise ValueError(f"Unsupported config file format: {config_path.suffix}")
        
        return cls(**data)
    
    def save_to_file(self, config_path: Path):
        """Save configuration to YAML or JSON file"""
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(config_path, 'w') as f:
            if config_path.suffix in ['.yaml', '.yml']:
                yaml.dump(self.dict(), f, default_flow_style=False)
            elif config_path.suffix == '.json':
                json.dump(self.dict(), f, indent=2)
            else:
                raise ValueError(f"Unsupported config file format: {config_path.suffix}")


@dataclass
class RuntimeConfig:
    """Runtime configuration that can be modified during execution"""
    debug_mode: bool = False
    simulation_mode: bool = False
    force_mode: bool = False
    current_user: Optional[str] = None
    session_id: Optional[str] = None
    active_devices: List[str] = None
    
    def __post_init__(self):
        if self.active_devices is None:
            self.active_devices = []