import logging
import logging.handlers
from pathlib import Path
from datetime import datetime
from typing import Optional
import sys
import json

from ..core.config import LoggingConfig


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            'timestamp': datetime.fromtimestamp(record.created).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, 'device_id'):
            log_entry['device_id'] = record.device_id
        
        if hasattr(record, 'change_id'):
            log_entry['change_id'] = record.change_id
        
        if hasattr(record, 'audit_id'):
            log_entry['audit_id'] = record.audit_id
        
        return json.dumps(log_entry)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[41m', # Red background
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        
        # Format the message
        formatted = super().format(record)
        
        # Add color
        return f"{color}{formatted}{reset}"


class NetworkChangeToolLogger:
    """Centralized logging configuration for the network change tool"""
    
    def __init__(self, config: Optional[LoggingConfig] = None):
        self.config = config or LoggingConfig()
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging configuration"""
        # Create log directory
        self.config.log_path.mkdir(parents=True, exist_ok=True)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, self.config.level))
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # File logging
        if self.config.file_logging:
            self._setup_file_logging()
        
        # Console logging
        if self.config.console_logging:
            self._setup_console_logging()
        
        # Syslog logging
        if self.config.syslog_enabled and self.config.syslog_server:
            self._setup_syslog_logging()
    
    def _setup_file_logging(self):
        """Setup file logging handlers"""
        # Main log file
        main_log_file = self.config.log_path / "network_change_tool.log"
        main_handler = logging.handlers.RotatingFileHandler(
            main_log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        main_handler.setLevel(getattr(logging, self.config.level))
        
        # Use JSON formatter for file logs
        json_formatter = JsonFormatter()
        main_handler.setFormatter(json_formatter)
        
        logging.getLogger().addHandler(main_handler)
        
        # Separate log files for different components
        self._setup_component_logging('device_manager', 'device_operations.log')
        self._setup_component_logging('change_manager', 'change_operations.log')
        self._setup_component_logging('audit_manager', 'audit_operations.log')
        
        # Error log file
        error_log_file = self.config.log_path / "errors.log"
        error_handler = logging.handlers.RotatingFileHandler(
            error_log_file,
            maxBytes=5*1024*1024,  # 5MB
            backupCount=3
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(json_formatter)
        
        logging.getLogger().addHandler(error_handler)
    
    def _setup_component_logging(self, component_name: str, log_file: str):
        """Setup logging for specific components"""
        log_file_path = self.config.log_path / log_file
        handler = logging.handlers.RotatingFileHandler(
            log_file_path,
            maxBytes=5*1024*1024,  # 5MB
            backupCount=3
        )
        handler.setLevel(getattr(logging, self.config.level))
        
        # Use JSON formatter
        json_formatter = JsonFormatter()
        handler.setFormatter(json_formatter)
        
        # Add handler to specific logger
        logger = logging.getLogger(component_name)
        logger.addHandler(handler)
        logger.propagate = True  # Also send to root logger
    
    def _setup_console_logging(self):
        """Setup console logging"""
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, self.config.level))
        
        # Use colored formatter for console
        if sys.stdout.isatty():  # Only use colors if output is a terminal
            formatter = ColoredFormatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        
        console_handler.setFormatter(formatter)
        logging.getLogger().addHandler(console_handler)
    
    def _setup_syslog_logging(self):
        """Setup syslog logging"""
        try:
            syslog_handler = logging.handlers.SysLogHandler(
                address=(self.config.syslog_server, 514)
            )
            syslog_handler.setLevel(getattr(logging, self.config.level))
            
            # Use simple formatter for syslog
            formatter = logging.Formatter(
                'network_change_tool: %(name)s - %(levelname)s - %(message)s'
            )
            syslog_handler.setFormatter(formatter)
            
            logging.getLogger().addHandler(syslog_handler)
            
        except Exception as e:
            # If syslog setup fails, log to console
            logging.error(f"Failed to setup syslog logging: {str(e)}")
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get a logger with the specified name"""
        return logging.getLogger(name)
    
    def log_device_operation(self, device_id: str, operation: str, 
                           result: str, level: str = "INFO"):
        """Log device operation"""
        logger = logging.getLogger('device_manager')
        log_method = getattr(logger, level.lower())
        
        log_method(
            f"Device operation: {operation} on {device_id} - {result}",
            extra={'device_id': device_id, 'operation': operation}
        )
    
    def log_change_operation(self, change_id: str, operation: str, 
                           result: str, level: str = "INFO"):
        """Log change operation"""
        logger = logging.getLogger('change_manager')
        log_method = getattr(logger, level.lower())
        
        log_method(
            f"Change operation: {operation} for {change_id} - {result}",
            extra={'change_id': change_id, 'operation': operation}
        )
    
    def log_audit_operation(self, audit_id: str, operation: str, 
                          result: str, level: str = "INFO"):
        """Log audit operation"""
        logger = logging.getLogger('audit_manager')
        log_method = getattr(logger, level.lower())
        
        log_method(
            f"Audit operation: {operation} for {audit_id} - {result}",
            extra={'audit_id': audit_id, 'operation': operation}
        )
    
    def cleanup_old_logs(self):
        """Clean up old log files based on retention policy"""
        import glob
        import os
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=self.config.log_retention_days)
        
        # Find all log files
        log_pattern = str(self.config.log_path / "*.log*")
        log_files = glob.glob(log_pattern)
        
        for log_file in log_files:
            try:
                file_mtime = datetime.fromtimestamp(os.path.getmtime(log_file))
                if file_mtime < cutoff_date:
                    os.remove(log_file)
                    logging.info(f"Removed old log file: {log_file}")
            except Exception as e:
                logging.error(f"Failed to remove old log file {log_file}: {str(e)}")


def setup_logging(config: Optional[LoggingConfig] = None) -> NetworkChangeToolLogger:
    """Setup logging for the network change tool"""
    return NetworkChangeToolLogger(config)


# Context manager for logging device operations
class DeviceOperationLogger:
    """Context manager for logging device operations"""
    
    def __init__(self, logger: NetworkChangeToolLogger, device_id: str, operation: str):
        self.logger = logger
        self.device_id = device_id
        self.operation = operation
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.log_device_operation(
            self.device_id, self.operation, "STARTED", "INFO"
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        
        if exc_type is None:
            self.logger.log_device_operation(
                self.device_id, self.operation, 
                f"COMPLETED in {duration:.2f}s", "INFO"
            )
        else:
            self.logger.log_device_operation(
                self.device_id, self.operation,
                f"FAILED after {duration:.2f}s: {str(exc_val)}", "ERROR"
            )


# Context manager for logging change operations
class ChangeOperationLogger:
    """Context manager for logging change operations"""
    
    def __init__(self, logger: NetworkChangeToolLogger, change_id: str, operation: str):
        self.logger = logger
        self.change_id = change_id
        self.operation = operation
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.log_change_operation(
            self.change_id, self.operation, "STARTED", "INFO"
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        
        if exc_type is None:
            self.logger.log_change_operation(
                self.change_id, self.operation,
                f"COMPLETED in {duration:.2f}s", "INFO"
            )
        else:
            self.logger.log_change_operation(
                self.change_id, self.operation,
                f"FAILED after {duration:.2f}s: {str(exc_val)}", "ERROR"
            )


# Decorator for logging function calls
def log_function_call(logger_name: str = None):
    """Decorator to log function calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = logging.getLogger(logger_name or func.__module__)
            
            # Log function entry
            logger.debug(f"Entering {func.__name__} with args={args}, kwargs={kwargs}")
            
            start_time = datetime.now()
            try:
                result = func(*args, **kwargs)
                duration = (datetime.now() - start_time).total_seconds()
                
                logger.debug(f"Exiting {func.__name__} after {duration:.2f}s")
                return result
                
            except Exception as e:
                duration = (datetime.now() - start_time).total_seconds()
                logger.error(
                    f"Function {func.__name__} failed after {duration:.2f}s: {str(e)}"
                )
                raise
        
        return wrapper
    return decorator