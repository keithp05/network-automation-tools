# Aruba WiFi Password Automation Tool

A Python-based automation tool for managing WiFi passwords on Aruba controllers running ArubaOS 8.7 and above. This tool supports all types of WiFi networks (guest, corporate, IoT, etc.) and provides automated password updates, network selection, scheduling capabilities, and comprehensive password management features.

## Features

- **Automated Password Updates**: Update passwords for any WiFi network via Aruba API
- **Network Selection**: Interactive mode to select which networks to update
- **Network Discovery**: Automatically discover all available WiFi networks
- **Password Generation**: Secure password generation with customizable complexity rules
- **Scheduling**: Daily, weekly, or monthly automated password rotations
- **Password Management**: CSV and JSON file support for password storage
- **Backup System**: Automatic password backups before updates
- **Comprehensive Logging**: Colored console output and file logging
- **Configuration Management**: YAML-based configuration for easy customization
- **Connection Testing**: Built-in API connection testing

## Requirements

- Python 3.7 or higher
- Aruba controller running ArubaOS 8.7+
- API access enabled on Aruba controller
- Network connectivity to Aruba controller

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aruba-guest-wifi-automation
```

2. Install required packages:
```bash
pip install -r requirements.txt
```

3. Copy and configure the example configuration:
```bash
cp config/config.yaml.example config/config.yaml
# Edit config/config.yaml with your settings
```

4. Set up Aruba API access:
   - See `ARUBA_API_SETUP.md` for detailed instructions
   - Enable REST API on your Aruba controller
   - Create API user account
   - Test connection with `python main.py --test-connection`

## Configuration

Edit `config/config.yaml` to match your environment:

```yaml
aruba:
  controller_ip: 192.168.1.1  # Your Aruba controller IP
  username: admin             # API username
  password: your_password     # API password
  api_version: v1            # API version

wifi:
  ssids:                     # List of WiFi networks to manage
    - Guest-WiFi
    - Corporate-WiFi
    - Conference-WiFi
    - IoT-Network
  password_length: 12
  password_options:
    include_uppercase: true
    include_lowercase: true
    include_digits: true
    include_special: false
    exclude_ambiguous: true
```

## Usage

### Basic Commands

1. **Test API connection:**
```bash
python main.py --test-connection
```

2. **List all available WiFi networks:**
```bash
python main.py --list-networks
```

3. **Interactive mode - select networks to update:**
```bash
python main.py --interactive
```

4. **Update passwords immediately with auto-generated passwords:**
```bash
python main.py --update
```

5. **Update specific networks:**
```bash
python main.py --update --ssids Guest-WiFi Corporate-WiFi
```

6. **Generate passwords and save to file without updating:**
```bash
python main.py --generate
```

7. **Load passwords from a file and update:**
```bash
python main.py --load examples/passwords_example.csv
```

8. **Run in scheduled mode:**
```bash
python main.py --schedule
```

### Command Line Options

- `-c, --config`: Path to configuration file (default: config/config.yaml)
- `-u, --update`: Update passwords immediately
- `-i, --interactive`: Interactive mode - select networks to update
- `-l, --load`: Load passwords from file and update
- `-s, --schedule`: Run in scheduled mode
- `-g, --generate`: Generate new passwords and save to file
- `--list-networks`: List all available WiFi networks
- `--test-connection`: Test connection to Aruba controller
- `--ssids`: Specific SSIDs to update (space-separated)

### Password File Formats

**CSV Format:**
```csv
ssid,password,date
Guest-WiFi,Welcome2024!,2025-07-17T10:00:00
Corporate-WiFi,CorpSec2024!,2025-07-17T10:00:00
Conference-WiFi,ConfRoom456,2025-07-17T10:00:00
IoT-Network,IoTDevice789,2025-07-17T10:00:00
```

**JSON Format:**
```json
{
  "passwords": [
    {
      "ssid": "Guest-WiFi",
      "password": "Welcome2024!",
      "date": "2025-07-17T10:00:00"
    },
    {
      "ssid": "Corporate-WiFi",
      "password": "CorpSec2024!",
      "date": "2025-07-17T10:00:00"
    }
  ]
}
```

## Scheduling

Configure automated password updates in `config.yaml`:

**Daily at 2 AM:**
```yaml
schedule:
  enabled: true
  frequency: daily
  time: "02:00"
```

**Weekly on Mondays at 3 AM:**
```yaml
schedule:
  enabled: true
  frequency: weekly
  time: "03:00"
  day_of_week: monday
```

**Monthly on the 1st at 4 AM:**
```yaml
schedule:
  enabled: true
  frequency: monthly
  time: "04:00"
  day_of_month: 1
```

## Security Considerations

1. **API Credentials**: Store API credentials securely. Consider using environment variables or a secrets manager.
2. **Password Files**: Ensure password files are properly secured with appropriate file permissions.
3. **HTTPS**: The tool uses HTTPS for API communication (certificate verification can be configured).
4. **Logging**: Be aware that logs may contain sensitive information.

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API credentials in config.yaml
   - Ensure API access is enabled on Aruba controller
   - Check network connectivity to controller

2. **Command Execution Failed**
   - Verify SSID names match exactly
   - Check user permissions on Aruba controller
   - Review Aruba controller logs

3. **SSL Certificate Warnings**
   - The tool disables SSL warnings by default
   - For production, consider implementing proper certificate validation

### Debug Mode

Enable debug logging by modifying the logging level in the code:
```python
logging.basicConfig(level=logging.DEBUG)
```

## API Reference

### ArubaClient Class

Main class for interacting with Aruba API:

```python
from aruba_client import ArubaClient

with ArubaClient(controller_ip, username, password) as client:
    client.update_guest_password(ssid_profile, new_password)
    client.apply_configuration()
    client.write_memory()
```

### PasswordManager Class

Password generation and management:

```python
from password_manager import PasswordManager

pm = PasswordManager()
password = pm.generate_secure_password(length=12)
passwords = pm.generate_password_list(ssids=['Guest-WiFi'])
```

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please create an issue in the repository.