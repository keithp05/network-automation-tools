from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import json
import logging
from enum import Enum
import concurrent.futures
from jinja2 import Template, Environment, FileSystemLoader

from ..devices.base_device import BaseDevice, CommandResult, BackupInfo
from .device_manager import DeviceManager
from ..core.exceptions import (
    ChangeExecutionError,
    RollbackError,
    ValidationError,
    BackupError
)


class ChangeStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    PARTIALLY_COMPLETED = "partially_completed"


class ChangeType(Enum):
    CONFIGURATION = "configuration"
    SOFTWARE_UPGRADE = "software_upgrade"
    MAINTENANCE = "maintenance"
    EMERGENCY = "emergency"
    ROLLBACK = "rollback"


@dataclass
class PreCheck:
    name: str
    command: str
    expected_result: Optional[str] = None
    validator: Optional[Callable] = None
    critical: bool = True


@dataclass
class PostCheck:
    name: str
    command: str
    expected_result: Optional[str] = None
    validator: Optional[Callable] = None
    critical: bool = True


@dataclass
class ChangeStep:
    step_number: int
    description: str
    commands: List[str]
    device_types: List[str] = field(default_factory=list)
    pre_checks: List[PreCheck] = field(default_factory=list)
    post_checks: List[PostCheck] = field(default_factory=list)
    rollback_commands: List[str] = field(default_factory=list)
    wait_time: int = 0  # Seconds to wait after execution


@dataclass
class DeviceChangeResult:
    device_id: str
    status: ChangeStatus
    pre_check_results: Dict[str, bool] = field(default_factory=dict)
    command_results: List[CommandResult] = field(default_factory=list)
    post_check_results: Dict[str, bool] = field(default_factory=dict)
    backup_info: Optional[BackupInfo] = None
    error_message: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    rollback_performed: bool = False


@dataclass
class ChangeRequest:
    change_id: str
    change_type: ChangeType
    description: str
    requester: str
    approval_status: bool = False
    approved_by: Optional[str] = None
    device_ids: List[str] = field(default_factory=list)
    steps: List[ChangeStep] = field(default_factory=list)
    scheduled_time: Optional[datetime] = None
    change_window_minutes: int = 60
    rollback_on_failure: bool = True
    dry_run: bool = False
    parallel_execution: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'change_id': self.change_id,
            'change_type': self.change_type.value,
            'description': self.description,
            'requester': self.requester,
            'approval_status': self.approval_status,
            'approved_by': self.approved_by,
            'device_ids': self.device_ids,
            'steps': [
                {
                    'step_number': step.step_number,
                    'description': step.description,
                    'commands': step.commands,
                    'device_types': step.device_types,
                    'rollback_commands': step.rollback_commands,
                    'wait_time': step.wait_time
                }
                for step in self.steps
            ],
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'change_window_minutes': self.change_window_minutes,
            'rollback_on_failure': self.rollback_on_failure,
            'dry_run': self.dry_run,
            'parallel_execution': self.parallel_execution,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class ChangeResult:
    change_id: str
    status: ChangeStatus
    device_results: Dict[str, DeviceChangeResult] = field(default_factory=dict)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_devices: int = 0
    successful_devices: int = 0
    failed_devices: int = 0
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of change results"""
        duration = None
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
        
        return {
            'change_id': self.change_id,
            'status': self.status.value,
            'total_devices': self.total_devices,
            'successful_devices': self.successful_devices,
            'failed_devices': self.failed_devices,
            'duration_seconds': duration,
            'device_statuses': {
                device_id: result.status.value 
                for device_id, result in self.device_results.items()
            }
        }


class ChangeManager:
    """Manages network change execution with rollback capabilities"""
    
    def __init__(self, device_manager: DeviceManager, 
                 template_path: Optional[Path] = None,
                 change_log_path: Optional[Path] = None):
        self.device_manager = device_manager
        self.template_path = template_path or Path("./configs/templates")
        self.change_log_path = change_log_path or Path("./logs/changes")
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Create directories
        self.template_path.mkdir(parents=True, exist_ok=True)
        self.change_log_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize template environment
        if self.template_path.exists():
            self.template_env = Environment(loader=FileSystemLoader(str(self.template_path)))
        else:
            self.template_env = Environment()
    
    def create_change_from_template(self, template_name: str, 
                                  variables: Dict[str, Any]) -> ChangeRequest:
        """Create a change request from a template"""
        try:
            template = self.template_env.get_template(f"{template_name}.j2")
            config = template.render(**variables)
            
            # Parse the rendered template to create change request
            # This is a simplified example - real implementation would parse the template structure
            change_request = ChangeRequest(
                change_id=f"CHG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                change_type=ChangeType.CONFIGURATION,
                description=f"Change from template: {template_name}",
                requester=variables.get('requester', 'system'),
                device_ids=variables.get('device_ids', [])
            )
            
            # Add steps based on template
            commands = [cmd.strip() for cmd in config.split('\n') if cmd.strip()]
            step = ChangeStep(
                step_number=1,
                description="Apply template configuration",
                commands=commands
            )
            change_request.steps.append(step)
            
            return change_request
            
        except Exception as e:
            raise ValidationError(f"Failed to create change from template: {str(e)}")
    
    def validate_change_request(self, change_request: ChangeRequest) -> Tuple[bool, List[str]]:
        """Validate a change request before execution"""
        errors = []
        
        # Check if devices exist
        for device_id in change_request.device_ids:
            if not self.device_manager.get_device_config(device_id):
                errors.append(f"Device {device_id} not found in configuration")
        
        # Validate steps
        if not change_request.steps:
            errors.append("No change steps defined")
        
        for step in change_request.steps:
            if not step.commands:
                errors.append(f"Step {step.step_number} has no commands")
        
        # Check approval if required
        if self.device_manager.config and self.device_manager.config.change.approval_required:
            if not change_request.approval_status:
                errors.append("Change requires approval")
        
        # Validate change window
        if change_request.scheduled_time:
            if change_request.scheduled_time < datetime.now():
                errors.append("Scheduled time is in the past")
        
        return len(errors) == 0, errors
    
    def execute_change(self, change_request: ChangeRequest) -> ChangeResult:
        """Execute a change request"""
        # Validate change request
        valid, errors = self.validate_change_request(change_request)
        if not valid:
            raise ValidationError(f"Change validation failed: {', '.join(errors)}")
        
        # Initialize result
        result = ChangeResult(
            change_id=change_request.change_id,
            status=ChangeStatus.IN_PROGRESS,
            start_time=datetime.now(),
            total_devices=len(change_request.device_ids)
        )
        
        try:
            # Log change start
            self._log_change_event(change_request, "STARTED")
            
            # Execute on devices
            if change_request.parallel_execution:
                self._execute_parallel(change_request, result)
            else:
                self._execute_sequential(change_request, result)
            
            # Update final status
            if result.failed_devices == 0:
                result.status = ChangeStatus.COMPLETED
            elif result.successful_devices == 0:
                result.status = ChangeStatus.FAILED
            else:
                result.status = ChangeStatus.PARTIALLY_COMPLETED
            
            result.end_time = datetime.now()
            
            # Log change completion
            self._log_change_event(change_request, "COMPLETED", result)
            
            # Save change result
            self._save_change_result(result)
            
        except Exception as e:
            result.status = ChangeStatus.FAILED
            result.end_time = datetime.now()
            self._log_change_event(change_request, "FAILED", result, str(e))
            raise
        
        return result
    
    def _execute_parallel(self, change_request: ChangeRequest, result: ChangeResult):
        """Execute change on devices in parallel"""
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=self.device_manager.max_parallel_connections
        ) as executor:
            # Submit tasks
            future_to_device = {
                executor.submit(
                    self._execute_on_device, 
                    device_id, 
                    change_request
                ): device_id 
                for device_id in change_request.device_ids
            }
            
            # Collect results
            for future in concurrent.futures.as_completed(future_to_device):
                device_id = future_to_device[future]
                try:
                    device_result = future.result()
                    result.device_results[device_id] = device_result
                    
                    if device_result.status == ChangeStatus.COMPLETED:
                        result.successful_devices += 1
                    else:
                        result.failed_devices += 1
                        
                except Exception as e:
                    self.logger.error(f"Failed to execute change on {device_id}: {str(e)}")
                    result.device_results[device_id] = DeviceChangeResult(
                        device_id=device_id,
                        status=ChangeStatus.FAILED,
                        error_message=str(e)
                    )
                    result.failed_devices += 1
    
    def _execute_sequential(self, change_request: ChangeRequest, result: ChangeResult):
        """Execute change on devices sequentially"""
        for device_id in change_request.device_ids:
            try:
                device_result = self._execute_on_device(device_id, change_request)
                result.device_results[device_id] = device_result
                
                if device_result.status == ChangeStatus.COMPLETED:
                    result.successful_devices += 1
                else:
                    result.failed_devices += 1
                    
                    # Stop on first failure if rollback is enabled
                    if change_request.rollback_on_failure:
                        self.logger.warning(f"Stopping execution due to failure on {device_id}")
                        break
                        
            except Exception as e:
                self.logger.error(f"Failed to execute change on {device_id}: {str(e)}")
                result.device_results[device_id] = DeviceChangeResult(
                    device_id=device_id,
                    status=ChangeStatus.FAILED,
                    error_message=str(e)
                )
                result.failed_devices += 1
                
                if change_request.rollback_on_failure:
                    break
    
    def _execute_on_device(self, device_id: str, 
                          change_request: ChangeRequest) -> DeviceChangeResult:
        """Execute change on a single device"""
        device_result = DeviceChangeResult(
            device_id=device_id,
            status=ChangeStatus.IN_PROGRESS,
            start_time=datetime.now()
        )
        
        try:
            # Connect to device
            device = self.device_manager.connect_device(device_id)
            device_config = self.device_manager.get_device_config(device_id)
            
            # Take backup if enabled
            if (self.device_manager.config and 
                self.device_manager.config.backup.backup_before_change):
                try:
                    backup_path = self.device_manager.config.backup.backup_path
                    device_result.backup_info = device.backup_config(
                        backup_path=backup_path,
                        compress=self.device_manager.config.backup.compress
                    )
                except Exception as e:
                    self.logger.error(f"Backup failed for {device_id}: {str(e)}")
                    if change_request.rollback_on_failure:
                        raise BackupError(f"Backup failed: {str(e)}")
            
            # Execute steps
            for step in change_request.steps:
                # Check if step applies to this device type
                if step.device_types and device_config.device_type not in step.device_types:
                    continue
                
                # Run pre-checks
                if step.pre_checks and not change_request.dry_run:
                    pre_check_passed = self._run_pre_checks(device, step, device_result)
                    if not pre_check_passed:
                        raise ValidationError("Pre-checks failed")
                
                # Execute commands
                if change_request.dry_run:
                    # In dry run, just validate commands
                    for command in step.commands:
                        valid, errors = device.validate_config(command)
                        if not valid:
                            raise ValidationError(f"Command validation failed: {errors}")
                else:
                    # Execute actual commands
                    for command in step.commands:
                        result = device.execute_command(command)
                        device_result.command_results.append(result)
                        
                        if not result.success:
                            raise ChangeExecutionError(f"Command failed: {command}")
                
                # Wait if specified
                if step.wait_time > 0:
                    import time
                    time.sleep(step.wait_time)
                
                # Run post-checks
                if step.post_checks and not change_request.dry_run:
                    post_check_passed = self._run_post_checks(device, step, device_result)
                    if not post_check_passed:
                        raise ValidationError("Post-checks failed")
            
            # Save configuration if not dry run
            if not change_request.dry_run:
                device.save_config()
            
            device_result.status = ChangeStatus.COMPLETED
            device_result.end_time = datetime.now()
            
        except Exception as e:
            device_result.status = ChangeStatus.FAILED
            device_result.error_message = str(e)
            device_result.end_time = datetime.now()
            
            # Attempt rollback if enabled
            if change_request.rollback_on_failure and not change_request.dry_run:
                try:
                    self._rollback_device(device_id, change_request, device_result)
                except Exception as rollback_error:
                    self.logger.error(f"Rollback failed for {device_id}: {str(rollback_error)}")
            
            raise
        
        return device_result
    
    def _run_pre_checks(self, device: BaseDevice, step: ChangeStep, 
                       device_result: DeviceChangeResult) -> bool:
        """Run pre-checks for a step"""
        all_passed = True
        
        for check in step.pre_checks:
            try:
                result = device.execute_command(check.command)
                
                # Validate result
                if check.validator:
                    passed = check.validator(result.output)
                elif check.expected_result:
                    passed = check.expected_result in result.output
                else:
                    passed = result.success
                
                device_result.pre_check_results[check.name] = passed
                
                if not passed and check.critical:
                    all_passed = False
                    self.logger.error(f"Pre-check failed: {check.name}")
                    
            except Exception as e:
                device_result.pre_check_results[check.name] = False
                if check.critical:
                    all_passed = False
                self.logger.error(f"Pre-check error: {check.name} - {str(e)}")
        
        return all_passed
    
    def _run_post_checks(self, device: BaseDevice, step: ChangeStep,
                        device_result: DeviceChangeResult) -> bool:
        """Run post-checks for a step"""
        all_passed = True
        
        for check in step.post_checks:
            try:
                result = device.execute_command(check.command)
                
                # Validate result
                if check.validator:
                    passed = check.validator(result.output)
                elif check.expected_result:
                    passed = check.expected_result in result.output
                else:
                    passed = result.success
                
                device_result.post_check_results[check.name] = passed
                
                if not passed and check.critical:
                    all_passed = False
                    self.logger.error(f"Post-check failed: {check.name}")
                    
            except Exception as e:
                device_result.post_check_results[check.name] = False
                if check.critical:
                    all_passed = False
                self.logger.error(f"Post-check error: {check.name} - {str(e)}")
        
        return all_passed
    
    def _rollback_device(self, device_id: str, change_request: ChangeRequest,
                        device_result: DeviceChangeResult):
        """Rollback changes on a device"""
        try:
            device = self.device_manager.get_device(device_id)
            if not device:
                device = self.device_manager.connect_device(device_id)
            
            # If we have a backup, restore it
            if device_result.backup_info:
                self.logger.info(f"Restoring configuration from backup for {device_id}")
                device.restore_config(device_result.backup_info)
                device_result.rollback_performed = True
                device_result.status = ChangeStatus.ROLLED_BACK
            else:
                # Execute rollback commands
                for step in reversed(change_request.steps):
                    if step.rollback_commands:
                        for command in step.rollback_commands:
                            device.execute_command(command)
                
                device.save_config()
                device_result.rollback_performed = True
                device_result.status = ChangeStatus.ROLLED_BACK
            
            self.logger.info(f"Rollback completed for {device_id}")
            
        except Exception as e:
            self.logger.error(f"Rollback failed for {device_id}: {str(e)}")
            raise RollbackError(f"Rollback failed: {str(e)}")
    
    def rollback_change(self, change_id: str) -> ChangeResult:
        """Manually rollback a completed change"""
        # Load change result
        change_result_path = self.change_log_path / f"{change_id}_result.json"
        if not change_result_path.exists():
            raise ValueError(f"Change result not found: {change_id}")
        
        with open(change_result_path, 'r') as f:
            original_result_data = json.load(f)
        
        # Create rollback change request
        rollback_request = ChangeRequest(
            change_id=f"ROLLBACK-{change_id}",
            change_type=ChangeType.ROLLBACK,
            description=f"Rollback of change {change_id}",
            requester="system",
            device_ids=list(original_result_data['device_results'].keys()),
            rollback_on_failure=False
        )
        
        # Execute rollback
        result = ChangeResult(
            change_id=rollback_request.change_id,
            status=ChangeStatus.IN_PROGRESS,
            start_time=datetime.now()
        )
        
        try:
            for device_id, device_data in original_result_data['device_results'].items():
                if device_data.get('backup_info'):
                    # Restore from backup
                    device = self.device_manager.connect_device(device_id)
                    backup_info = BackupInfo(**device_data['backup_info'])
                    device.restore_config(backup_info)
                    
                    result.device_results[device_id] = DeviceChangeResult(
                        device_id=device_id,
                        status=ChangeStatus.ROLLED_BACK,
                        rollback_performed=True
                    )
                    result.successful_devices += 1
            
            result.status = ChangeStatus.COMPLETED
            result.end_time = datetime.now()
            
        except Exception as e:
            result.status = ChangeStatus.FAILED
            result.end_time = datetime.now()
            raise
        
        return result
    
    def _log_change_event(self, change_request: ChangeRequest, event: str,
                         result: Optional[ChangeResult] = None, 
                         error: Optional[str] = None):
        """Log change events"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'event': event,
            'change_id': change_request.change_id,
            'change_type': change_request.change_type.value,
            'requester': change_request.requester,
            'device_count': len(change_request.device_ids)
        }
        
        if result:
            log_entry['result'] = result.get_summary()
        
        if error:
            log_entry['error'] = error
        
        # Log to file
        log_file = self.change_log_path / f"{change_request.change_id}_events.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        
        # Log to logger
        self.logger.info(f"Change event: {event} for {change_request.change_id}")
    
    def _save_change_result(self, result: ChangeResult):
        """Save change result to file"""
        result_file = self.change_log_path / f"{result.change_id}_result.json"
        
        result_data = {
            'change_id': result.change_id,
            'status': result.status.value,
            'start_time': result.start_time.isoformat() if result.start_time else None,
            'end_time': result.end_time.isoformat() if result.end_time else None,
            'total_devices': result.total_devices,
            'successful_devices': result.successful_devices,
            'failed_devices': result.failed_devices,
            'device_results': {}
        }
        
        for device_id, device_result in result.device_results.items():
            result_data['device_results'][device_id] = {
                'status': device_result.status.value,
                'pre_check_results': device_result.pre_check_results,
                'post_check_results': device_result.post_check_results,
                'error_message': device_result.error_message,
                'rollback_performed': device_result.rollback_performed,
                'backup_info': device_result.backup_info.__dict__ if device_result.backup_info else None
            }
        
        with open(result_file, 'w') as f:
            json.dump(result_data, f, indent=2)
    
    def get_change_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get change history"""
        history = []
        
        # Read all result files
        result_files = sorted(
            self.change_log_path.glob("*_result.json"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )[:limit]
        
        for result_file in result_files:
            with open(result_file, 'r') as f:
                history.append(json.load(f))
        
        return history