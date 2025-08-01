class NetworkChangeToolException(Exception):
    """Base exception for all network change tool exceptions"""
    pass


class DeviceConnectionError(NetworkChangeToolException):
    """Raised when unable to connect to a device"""
    pass


class AuthenticationError(NetworkChangeToolException):
    """Raised when authentication fails"""
    pass


class ConfigurationError(NetworkChangeToolException):
    """Raised when there's an issue with configuration"""
    pass


class BackupError(NetworkChangeToolException):
    """Raised when backup operations fail"""
    pass


class ChangeExecutionError(NetworkChangeToolException):
    """Raised when change execution fails"""
    pass


class RollbackError(NetworkChangeToolException):
    """Raised when rollback operations fail"""
    pass


class ValidationError(NetworkChangeToolException):
    """Raised when validation fails"""
    pass


class AuditError(NetworkChangeToolException):
    """Raised when audit operations fail"""
    pass


class TimeoutError(NetworkChangeToolException):
    """Raised when operations timeout"""
    pass


class PermissionError(NetworkChangeToolException):
    """Raised when user lacks required permissions"""
    pass