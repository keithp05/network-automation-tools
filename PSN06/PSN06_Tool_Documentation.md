# PSN06 Configuration Management Tool Suite

## Overview

A comprehensive two-part toolset for auditing and configuring Cisco devices with PSN06 ISE (Identity Services Engine) configurations. This suite ensures proper TACACS+ and RADIUS authentication server configurations across your network infrastructure.

## Tool Components

### Part 1: Configuration Audit Tool (`cisco_config_audit_psn06.py`)
- **Purpose**: Read-only configuration audit with detailed reporting
- **Function**: Identifies devices missing PSN06 configurations
- **Output**: JSON, CSV, and remediation files for systematic review

### Part 2: Configuration Push Tool (`cisco_config_push.py`)
- **Purpose**: Multi-threaded configuration deployment with safety features
- **Function**: Applies missing configurations identified by the audit
- **Features**: Automatic backups, concurrent deployment, detailed logging

## PSN06 Configurations Managed

The tools check and configure three critical authentication components:

1. **TACACS+ Server Group**
   ```
   aaa group server tacacs+ ISE-TACACS
    server name PVA-M-ISE-PSN06
   ```

2. **RADIUS Server Group**
   ```
   aaa group server radius ISE-RADIUS
    server name PVA-M-ISE-PSN06-R
   ```

3. **TACACS Server Definition**
   ```
   tacacs server PVA-M-ISE-PSN06
    address ipv4 172.18.31.101
    key [YOUR_TACACS_KEY]
   ```

## Quick Start Guide

### Prerequisites
1. Python 3.x installed
2. Network access to target devices
3. SSH credentials with appropriate privileges

### Installation
```bash
# Clone or download the PSN06 tools
cd PSN06/

# Install required Python packages
pip install -r requirements.txt
```

### Basic Workflow

#### Step 1: Prepare Device List
```bash
# Copy template and add your device IPs
cp devices_template.txt devices.txt

# Edit devices.txt - add one IP per line
nano devices.txt
```

#### Step 2: Run Configuration Audit
```bash
python cisco_config_audit_psn06.py
```
- Enter SSH credentials when prompted
- Select your devices.txt file
- Review generated reports in `audits/` directory

#### Step 3: Review Audit Results
The audit creates three files:
- `audit_results_[timestamp].json` - Detailed findings
- `audit_summary_[timestamp].csv` - Summary spreadsheet
- `remediation_data_[timestamp].json` - Input for push tool

#### Step 4: Apply Configurations (if needed)
```bash
python cisco_config_push.py
```
- Enter SSH credentials and TACACS+ key
- Select the remediation JSON file from Step 2
- Choose thread count (1-10 concurrent connections)
- Confirm to proceed with deployment

## Directory Structure

```
PSN06/
├── cisco_config_audit_psn06.py    # Audit tool
├── cisco_config_push.py           # Push tool
├── requirements.txt               # Python dependencies
├── devices_template.txt           # Device list template
├── README.md                      # Basic readme
├── PSN06_Tool_Documentation.md    # This file
│
├── audits/                        # Created by audit tool
│   └── audit_[timestamp]/
│       ├── audit_results_[timestamp].json
│       ├── audit_summary_[timestamp].csv
│       └── remediation_data_[timestamp].json
│
├── push_results/                  # Created by push tool
│   └── push_results_[timestamp]/
│       ├── push_results_[timestamp].json
│       └── push_summary_[timestamp].csv
│
├── backups/                       # Created by push tool
│   └── config_backups_[timestamp]/
│       └── [device_ip]_backup.cfg
│
└── logs/                          # Created by both tools
    ├── cisco_audit_log_[timestamp].log
    └── cisco_push_log_[timestamp].log
```

## Advanced Features

### Multi-Threading Configuration
The push tool supports concurrent connections for faster deployment:
- Default: 5 threads
- Maximum: 10 threads or number of devices (whichever is lower)
- Adjust based on network capacity and device responsiveness

### Backup Management
- Automatic backup before any configuration changes
- Stored in timestamped directories
- Full running-config saved for each device
- Easy rollback capability if needed

### Error Handling
- Comprehensive logging of all operations
- Graceful handling of connection failures
- Detailed error messages for troubleshooting
- Continue processing even if individual devices fail

## Security Considerations

1. **Credentials**: Never stored, only kept in memory during execution
2. **Backups**: Created before any changes for rollback capability
3. **Logs**: May contain device IPs but no passwords
4. **TACACS+ Key**: Entered securely via getpass, not logged

## Troubleshooting

### Common Issues

**Connection Failures**
- Verify SSH access to devices
- Check firewall rules
- Ensure correct credentials
- Verify device SSH configuration

**Configuration Push Failures**
- Check enable mode access
- Verify configuration privileges
- Review device logs for syntax errors
- Check TACACS+ key format

**File/Permission Errors**
- Ensure write permissions in script directory
- Check disk space for logs and backups
- Verify Python has necessary file access

### Debug Steps

1. Check log files in `logs/` directory
2. Review device-specific errors in push results
3. Verify remediation commands in JSON file
4. Test manual SSH connection to problem devices

## Best Practices

1. **Always run audit before push** - Ensures you know what will be configured
2. **Review audit results** - Verify expected vs actual findings
3. **Start with small batches** - Test on few devices before full deployment
4. **Monitor thread count** - Don't overload network or devices
5. **Keep backups** - Archive backup directories for compliance
6. **Document TACACS+ key** - Store securely for future use

## Integration with Other Tools

The PSN06 suite can be integrated with:
- Existing authentication test scripts (e.g., `Cisco_PSN_Audit_With_Auth_Test.py`)
- Network automation platforms
- Change management systems
- Monitoring and alerting tools

## Support and Maintenance

Created and maintained by: Keith Perez  
Contact: keith.p05@gmail.com

For issues or enhancements:
1. Check logs for detailed error information
2. Verify network connectivity and credentials
3. Ensure devices support required configuration commands
4. Contact support with specific error messages and logs

## Version History

- **v1.0** - Initial release with basic audit and push functionality
- **v1.1** - Added multi-threading support for configuration deployment
- **v1.2** - Enhanced error handling and reporting capabilities

## Future Enhancements

Potential improvements under consideration:
- Integration with authentication testing
- Support for additional vendor platforms
- REST API for programmatic access
- Web-based dashboard for results visualization
- Automated scheduling capabilities