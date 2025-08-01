# Network Change Tool - Setup Guide

This guide walks you through setting up the Network Change Management Tool with device discovery and secure credential management.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Interactive Setup
```bash
python setup_credentials.py
```

### 3. Launch Application
```bash
python main.py --config configs/app_config.yaml
```

## Device Import Options

The setup script supports multiple ways to import your device list:

### Option 1: Network Discovery
Automatically discover devices on your network using:
- Ping sweep
- Nmap scanning (if available)
- SSH banner grabbing
- HTTP banner grabbing
- SNMP walking

**Example:**
```
Enter network range (e.g., 192.168.1.0/24): 192.168.1.0/24
```

### Option 2: Text File Import

#### Simple Format
```
# device_list_simple.txt
# Format: hostname,ip_address
core-switch-01,192.168.1.10
core-switch-02,192.168.1.11
firewall-01,192.168.1.20
```

#### Extended Format
```
# device_list_extended.txt
# Format: hostname,ip_address,device_type,port
core-switch-01,192.168.1.10,cisco_ios,22
palo-firewall-01,192.168.1.25,paloalto_panos,443
```

#### CSV Format with Headers
```csv
hostname,ip_address,device_type,port
core-switch-01,192.168.1.10,cisco_ios,22
core-switch-02,192.168.1.11,cisco_ios,22
palo-firewall-01,192.168.1.25,paloalto_panos,443
```

### Option 3: Excel File Import

Create an Excel file with columns:
- **hostname** (required)
- **ip_address** (required)
- **device_type** (optional, defaults to cisco_ios)
- **port** (optional, defaults to 22)
- Additional columns for metadata

**Example Excel structure:**
| hostname | ip_address | device_type | port | location | role |
|----------|------------|-------------|------|----------|------|
| core-switch-01 | 192.168.1.10 | cisco_ios | 22 | datacenter | core |
| palo-firewall-01 | 192.168.1.25 | paloalto_panos | 443 | datacenter | security |

### Option 4: Existing Configuration Import

Import from existing YAML or JSON configuration files:

```yaml
devices:
  - hostname: "switch-01"
    ip_address: "192.168.1.10"
    device_type: "cisco_ios"
    port: 22
```

### Option 5: Manual Entry

Enter device information interactively one by one.

## Supported Device Types

- **cisco_ios**: Cisco IOS switches and routers
- **cisco_nxos**: Cisco Nexus switches
- **cisco_asa**: Cisco ASA firewalls
- **paloalto_panos**: Palo Alto firewalls

## Credential Management

### Credential Grouping Options

1. **Same credentials for all devices**: Use one set of credentials for all devices
2. **Group by device type**: Separate credentials for cisco_ios, cisco_asa, paloalto_panos, etc.
3. **Group by hostname pattern**: Separate credentials for "switch-*", "firewall-*", etc.
4. **Individual credentials**: Unique credentials for each device

### Credential Storage Options

#### 1. Encrypted File Storage (Recommended)
- Credentials encrypted with master password
- Stored in `./configs/credentials/`
- Most secure option for production use

#### 2. System Keyring
- Uses OS-integrated credential storage
- Windows Credential Manager, macOS Keychain, Linux Secret Service
- Seamless integration with OS security

#### 3. Environment Variables
- Runtime credential loading
- Secure for containerized environments
- Device-specific or global variables

**Examples:**
```bash
# Device-specific
export SWITCH_01_192_168_1_10_USERNAME="admin"
export SWITCH_01_192_168_1_10_PASSWORD="password"

# Global
export DEVICE_USERNAME="admin"
export DEVICE_PASSWORD="password"
```

#### 4. Runtime Prompts
- Credentials requested when needed
- No storage, maximum security
- Suitable for interactive use

## Example Setup Session

```bash
$ python setup_credentials.py

Network Change Tool - Credential Setup
======================================

Setting up master password for credential encryption...
Enter master password: ********
Confirm master password: ********

Device discovery options:
1. Auto-discover devices on network
2. Import from text file
3. Import from Excel file
4. Import from existing configuration
5. Manually enter device information

Choose option (1-5): 3

=== Import from Excel File ===
Enter path to Excel file: ./examples/device_list.xlsx

Available columns in Excel file:
 1. hostname
 2. ip_address
 3. device_type
 4. port
 5. location
 6. role

Map columns to device fields:
Column number for hostname: 1
Column number for IP address: 2
Column number for device type (optional): 3
Column number for port (optional): 4

Imported 14 devices from ./examples/device_list.xlsx

=== Credential Grouping ===
Group devices by credential type to set up credentials in batches

Found 14 devices:
 1. core-switch-01     192.168.1.10   cisco_ios
 2. core-switch-02     192.168.1.11   cisco_ios
 3. palo-firewall-01   192.168.1.25   paloalto_panos
 4. palo-firewall-02   192.168.1.26   paloalto_panos

Credential grouping options:
1. Use same credentials for all devices
2. Group by device type
3. Group by hostname pattern
4. Individual credentials for each device

Choose grouping method (1-4): 2

--- Setting up credentials for group: cisco_ios ---
Devices in group: 10
  - core-switch-01 (192.168.1.10)
  - core-switch-02 (192.168.1.11)
  - access-switch-01 (192.168.2.10)
  ...

Enter credentials for group 'cisco_ios':
Sample device: core-switch-01 (cisco_ios)
Username (default: admin): admin
Password: ********
Enable password (optional): ********

Credentials summary for group 'cisco_ios':
  Username: admin
  Password: ********
  Enable password: ********

Are these credentials correct? (y/n): y

Credential storage options for group 'cisco_ios':
1. Encrypted file (recommended)
2. System keyring
3. Environment variables (show commands)
4. Prompt at runtime (not stored)

Choose storage method (1-4): 1

✓ Configured: core-switch-01
✓ Configured: core-switch-02
...

--- Setting up credentials for group: paloalto_panos ---
...

Configuration file generated: ./configs/app_config.yaml
  - 14 devices configured
  - Credentials stored separately for security

Test device connections? (y/n): y

Testing connection to core-switch-01 (192.168.1.10)...
  ✓ core-switch-01: Ready for connection

Setup Complete!

Next steps:
1. Start the application: python main.py --config ./configs/app_config.yaml
2. Or use CLI mode: python main.py --cli
3. Check the logs directory for troubleshooting
4. Review the generated configuration file

Important files:
- Configuration: ./configs/app_config.yaml
- Credentials: ./configs/credentials/
- Logs: ./logs/
- Backups: ./backups/
```

## Security Best Practices

### 1. Master Password
- Use a strong master password (12+ characters)
- Store master password securely
- Consider using `NETWORK_TOOL_MASTER_PASSWORD` environment variable

### 2. Credential Rotation
- Regularly rotate device passwords
- Update API keys before expiration
- Use the credential manager's rotation features

### 3. Network Security
- Use SSH key authentication when possible
- Implement network ACLs for management access
- Use VPN for remote access

### 4. File Permissions
- Protect credential files with appropriate permissions
- Use encrypted storage for sensitive data
- Regular backup of encrypted credential files

## Troubleshooting

### Common Issues

1. **Excel Import Fails**
   ```bash
   pip install openpyxl
   ```

2. **Network Discovery Issues**
   ```bash
   # Install nmap for enhanced discovery
   # macOS: brew install nmap
   # Ubuntu: sudo apt-get install nmap
   pip install python-nmap
   ```

3. **Keyring Issues**
   ```bash
   pip install keyring
   # May require additional OS-specific packages
   ```

4. **Permission Errors**
   ```bash
   # Ensure write permissions for:
   chmod 755 ./configs/
   chmod 755 ./logs/
   chmod 755 ./backups/
   ```

### Debug Mode
```bash
python main.py --log-level DEBUG
```

## Example Files

Create example files for testing:

```bash
# Create Excel example
python create_example_excel.py

# Use example text files
cp examples/device_list_simple.txt my_devices.txt
cp examples/device_list.csv my_devices.csv
```

## Environment Variables

Set these for automated deployments:

```bash
# Master password
export NETWORK_TOOL_MASTER_PASSWORD="your_master_password"

# Global device credentials
export DEVICE_USERNAME="admin"
export DEVICE_PASSWORD="secure_password"
export DEVICE_ENABLE_PASSWORD="enable_password"

# Palo Alto API key
export DEVICE_API_KEY="your_palo_alto_api_key"
```

## Integration with CI/CD

For automated environments:

```bash
# Headless setup with environment variables
export NETWORK_TOOL_MASTER_PASSWORD="secure_password"
export DEVICE_USERNAME="admin"
export DEVICE_PASSWORD="device_password"

# Use existing configuration
python main.py --config production_config.yaml --cli
```

## Support

For issues or questions:
1. Check the logs directory
2. Run with `--log-level DEBUG`
3. Review the troubleshooting section
4. Check device connectivity manually