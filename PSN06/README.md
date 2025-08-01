# Cisco PSN06 Configuration Audit Tools

A comprehensive two-part toolset for auditing and configuring Cisco devices with PSN06 configurations.

## Features

- **Part 1 (Audit)**: `cisco_config_audit_psn06.py` - Read-only configuration audit with detailed reporting
- **Part 2 (Push)**: `cisco_config_push.py` - Multi-threaded configuration deployment with backup functionality
- Comprehensive logging and error handling
- Multi-format reporting (JSON, CSV)
- Automatic backup creation before any changes

## Quick Start

1. **Install dependencies**: `pip install -r requirements.txt`
2. **Create device list**: Copy `devices_template.txt` to `devices.txt` and add your device IPs
3. **Run audit**: `python cisco_config_audit_psn06.py`
4. **Review results** in the generated CSV and JSON files
5. **Run push** (optional): `python cisco_config_push.py`

## Workflow

1. **Audit Phase**: Run Part 1 to discover which devices need PSN06 configurations
2. **Review Results**: Check the generated reports to understand what needs to be configured
3. **Push Phase**: Run Part 2 to apply configurations to devices that need them

## File Structure

After running the tools, you'll see these folders created:
## Security

- All sensitive data (logs, backups, device IPs, credentials) are excluded from version control
- Configuration backups are created automatically before any changes
- Use the provided template for device lists - never commit real production IPs

## PSN06 Configurations Checked

1. **TACACS+ Server Group**: `aaa group server tacacs+ ISE-TACACS` with PSN06 server
2. **RADIUS Server Group**: `aaa group server radius ISE-RADIUS` with PSN06-R server  
3. **TACACS Server Definition**: `tacacs server PVA-M-ISE-PSN06` with IP 172.18.31.101

Created by Keith Perez  
Contact: keith.p05@gmail.com
