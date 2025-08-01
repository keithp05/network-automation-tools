# Network Change Management Tool

A comprehensive Python-based network change management tool with GUI support for Cisco (IOS, NX-OS, ASA) and Palo Alto Networks devices.

## Features

### Core Functionality
- **Device Management**: Connect to and manage multiple network devices
- **Change Management**: Execute configuration changes with rollback capabilities
- **Backup & Restore**: Automated configuration backups before changes
- **Audit & Compliance**: Comprehensive compliance checking and reporting
- **Template-based Changes**: Support for Jinja2 templates for consistent changes

### Supported Devices
- **Cisco IOS**: Switches and routers running IOS
- **Cisco NX-OS**: Nexus switches running NX-OS
- **Cisco ASA**: Adaptive Security Appliances
- **Palo Alto PAN-OS**: Firewalls and Panorama

### User Interface
- **GUI**: Modern PyQt6-based graphical interface
- **CLI**: Command-line interface for automation
- **Web Interface**: (Future enhancement)

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Required Packages
- paramiko (SSH connections)
- netmiko (Network device interactions)
- pan-os-python (Palo Alto API)
- PyQt6 (GUI framework)
- jinja2 (Template engine)
- pydantic (Data validation)
- PyYAML (Configuration files)

## Configuration

### Application Configuration
Create a configuration file in YAML or JSON format:

```yaml
# config.yaml
app_name: "Network Change Management Tool"
version: "1.0.0"

devices:
  - hostname: "switch-01"
    ip_address: "192.168.1.10"
    device_type: "cisco_ios"
    port: 22
    credentials:
      username: "admin"
      password: "cisco123"
      enable_password: "enable123"
    tags: ["core", "switch"]

backup:
  enabled: true
  retention_days: 30
  backup_before_change: true
  compress: true
  backup_path: "./backups"

change:
  rollback_on_failure: true
  max_parallel_devices: 5
  approval_required: false

logging:
  level: "INFO"
  file_logging: true
  console_logging: true
  log_path: "./logs"
```

### Device Credentials
For security, consider using environment variables or encrypted credential storage:

```yaml
credentials:
  username: "${DEVICE_USERNAME}"
  password: "${DEVICE_PASSWORD}"
  api_key: "${PALO_API_KEY}"
```

## Usage

### GUI Interface
Launch the graphical interface:
```bash
python main.py
```

With custom configuration:
```bash
python main.py --config config.yaml
```

### CLI Interface
Launch the command-line interface:
```bash
python main.py --cli
```

### Basic Operations

#### Device Management
1. **Add Device**: Configure device connection details
2. **Connect**: Establish SSH/API connections
3. **Backup**: Create configuration backups
4. **Disconnect**: Close connections

#### Change Management
1. **Create Change Request**: Define changes to be made
2. **Execute Change**: Apply changes with pre/post checks
3. **Rollback**: Revert changes if needed
4. **Monitor**: Track change execution progress

#### Audit & Compliance
1. **Run Audit**: Execute compliance checks
2. **Generate Reports**: Create compliance reports
3. **View History**: Review audit history
4. **Custom Rules**: Define custom audit rules

## Templates

### Change Templates
Create Jinja2 templates for common changes:

```jinja2
# cisco_ios_vlan.j2
vlan {{ vlan_id }}
 name {{ vlan_name }}
 description {{ vlan_description }}
{% for interface in interfaces %}
interface {{ interface }}
 switchport access vlan {{ vlan_id }}
{% endfor %}
```

### Using Templates
```python
from src.core.change_manager import ChangeManager

variables = {
    'vlan_id': 100,
    'vlan_name': 'DATA_VLAN',
    'vlan_description': 'Data Network VLAN',
    'interfaces': ['GigabitEthernet0/1', 'GigabitEthernet0/2']
}

change_request = change_manager.create_change_from_template(
    'cisco_ios_vlan', variables
)
```

## Audit Rules

### Built-in Rules
The tool includes comprehensive audit rules for:
- Security configurations
- Network protocols
- Device hardening
- Compliance standards

### Custom Rules
Create custom audit rules in JSON format:

```json
{
  "rules": [
    {
      "rule_id": "custom_001",
      "name": "SSH Version Check",
      "description": "Ensure SSH version 2 is configured",
      "command": "show ip ssh",
      "expected_pattern": "SSH Enabled.*version 2",
      "severity": "error",
      "device_types": ["cisco_ios"],
      "category": "security"
    }
  ]
}
```

## Advanced Features

### Parallel Execution
Execute changes on multiple devices simultaneously:

```python
change_request.parallel_execution = True
change_request.max_parallel_devices = 10
```

### Pre/Post Checks
Define validation checks before and after changes:

```python
pre_check = PreCheck(
    name="Interface Status",
    command="show interfaces status",
    expected_result="connected"
)

post_check = PostCheck(
    name="VLAN Verification",
    command="show vlan brief",
    expected_result="active"
)
```

### Dry Run Mode
Test changes without applying them:

```python
change_request.dry_run = True
result = change_manager.execute_change(change_request)
```

## Security Considerations

### Credential Security
- Use environment variables for passwords
- Consider external credential management systems
- Implement encryption for stored credentials

### Network Security
- Use SSH key authentication when possible
- Implement network ACLs for management access
- Use VPN for remote access

### Audit Trail
- All operations are logged
- Change history is maintained
- Audit reports provide compliance evidence

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Verify network connectivity
   - Check credentials
   - Ensure correct device type

2. **Authentication Errors**
   - Verify username/password
   - Check enable password for Cisco devices
   - Validate API keys for Palo Alto devices

3. **Permission Issues**
   - Ensure user has appropriate privileges
   - Check file system permissions for backups/logs

### Logging
Enable debug logging for troubleshooting:
```bash
python main.py --log-level DEBUG
```

### Log Files
- `network_change_tool.log`: Main application log
- `device_operations.log`: Device-specific operations
- `change_operations.log`: Change execution logs
- `audit_operations.log`: Audit execution logs
- `errors.log`: Error messages only

## Contributing

### Development Setup
1. Clone the repository
2. Create virtual environment
3. Install development dependencies
4. Run tests

### Code Structure
```
src/
├── core/           # Core functionality
├── devices/        # Device-specific implementations
├── gui/            # GUI components
├── audit/          # Audit and compliance
└── utils/          # Utility functions

configs/            # Configuration files
tests/              # Test files
docs/               # Documentation
```

### Testing
```bash
pytest tests/
```

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the troubleshooting guide

## Roadmap

### Future Enhancements
- Web-based interface
- REST API
- Database integration
- Advanced reporting
- Multi-vendor support expansion
- Integration with network automation tools

### Version History
- v1.0.0: Initial release with GUI and CLI interfaces
- v0.9.0: Beta release with core functionality
- v0.8.0: Alpha release with device management