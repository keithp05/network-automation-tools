# Enhanced Aruba WiFi Automation - Usage Guide

## New Features

The enhanced version includes several improvements to ensure password updates reach all APs:

1. **Multi-Level Configuration** - Applies changes at multiple hierarchy levels
2. **AP Group Updates** - Updates all AP groups individually
3. **Verification** - Checks that all APs received the update
4. **Force Sync** - Forces configuration synchronization
5. **Retry Logic** - Handles failed updates
6. **Password Verification** - Uses `show run no-encrypt` to verify passwords before and after changes

## Quick Start with Enhanced Features

### 1. Update All AP Groups

To ensure the password change reaches all APs across all groups:

```bash
python main.py --update --all-groups --verify
```

This will:
- Update the password in each AP group individually
- Apply configuration at multiple hierarchy levels
- Verify all APs received the update
- Show detailed results for each group

### 2. List AP Groups First

Check which AP groups exist:

```bash
python main.py --list-ap-groups
```

### 3. Force Synchronization

If some APs aren't getting updates, force sync:

```bash
python main.py --update --force-sync
```

### 4. Interactive Mode with All Groups

```bash
python main.py --interactive --all-groups --verify
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--all-groups` | Update password across all AP groups |
| `--verify` | Verify updates were applied to all APs |
| `--verify-passwords` | Enable password verification using show run no-encrypt |
| `--no-verify-passwords` | Disable password verification |
| `--force-sync` | Force configuration synchronization |
| `--list-ap-groups` | List all AP groups in the system |
| `--show-current-password SSID1 SSID2` | Show current passwords for specified SSIDs |
| `--audit` | Audit all passwords without making changes |
| `--audit-ssids SSID1 SSID2` | Audit specific SSIDs only |
| `--audit-ap-groups` | Include AP group analysis in audit |
| `--compare-passwords FILE` | Compare current passwords against file |
| `--save-audit-report` | Force saving audit report to file |
| `--no-save-audit-report` | Skip saving audit report |
| `--max-workers N` | Set maximum threads for auditing (default: 5) |
| `--no-threading` | Disable multithreading for debugging |

## Configuration Options

Use `config/config_enhanced.yaml` for the new features:

```yaml
automation:
  update_mode: all_groups  # Updates all AP groups
  multi_level_apply: true  # Applies at /md, /mm, etc.
  force_sync: true         # Forces AP sync
  verify_updates: true     # Verifies all APs updated
  verify_password_change: true  # Verifies passwords using show run no-encrypt
```

## Example Workflow

1. **Test Connection**
   ```bash
   python main.py --test-connection
   ```

2. **Check Current Passwords**
   ```bash
   python main.py --show-current-password Guest-WiFi Corporate-WiFi
   ```

3. **List AP Groups**
   ```bash
   python main.py --list-ap-groups
   ```

4. **Generate New Passwords**
   ```bash
   python main.py --generate --ssids Guest-WiFi
   ```

5. **Update with Full Coverage and Verification**
   ```bash
   python main.py --update --all-groups --verify --verify-passwords --force-sync
   ```

6. **Update Without Password Verification** (faster)
   ```bash
   python main.py --update --all-groups --no-verify-passwords
   ```

## Audit and Verification Commands

7. **Audit All Passwords** (no changes made)
   ```bash
   python main.py --audit
   ```

8. **Audit Specific SSIDs**
   ```bash
   python main.py --audit-ssids Guest-WiFi Corporate-WiFi
   ```

9. **Audit with AP Group Analysis**
   ```bash
   python main.py --audit --audit-ap-groups
   ```

10. **Compare Current vs Expected Passwords**
    ```bash
    python main.py --compare-passwords config/passwords.csv
    ```

## Performance and Threading Options

11. **Fast Audit with More Threads**
    ```bash
    python main.py --audit --max-workers 10
    ```

12. **Single-threaded for Debugging**
    ```bash
    python main.py --audit --no-threading
    ```

## Troubleshooting Failed Updates

If some APs still don't get updates:

1. **Check Specific AP Status**
   - SSH to controller
   - Run: `show ap database | include <ap-name>`

2. **Check Pending Configurations**
   - Run: `show ap config pending`

3. **Manual AP Reboot**
   - Run: `ap-reboot ap-name <ap-name>`

4. **Check Logs**
   - Review logs in `logs/` directory
   - Enable DEBUG logging in config

## Best Practices

1. **Always Verify**: Use `--verify` to ensure updates reached all APs
2. **Test First**: Test on one SSID before updating all
3. **Monitor Logs**: Check logs during updates
4. **Schedule Wisely**: Run during maintenance windows if rebooting APs

## Example Output

### Password Update Output
```
Guest-WiFi - Current password: OldPassword123

Updating password for SSID: Guest-WiFi
Using all-groups update mode for Guest-WiFi

Guest-WiFi Update Results:
  Total AP Groups: 5
  Successful: 5
  Failed: 0
  Skipped: 0
✓ Guest-WiFi: NewSecurePass123

Applying configuration at multiple hierarchy levels
Multi-level configuration applied successfully
Forcing configuration synchronization
Configuration saved to memory

============================================================
Password Change Verification
============================================================
✓ Guest-WiFi: Password verified successfully
  - Expected: NewSecurePass123
  - Current: NewSecurePass123
============================================================

AP Update Verification:
  Total APs: 25
  Online APs: 24
  Offline APs: 1
  Config Pending: 0
```

### Password Audit Output
```
🔍 Starting password audit...

================================================================================
PASSWORD AUDIT REPORT
================================================================================
Generated: 2024-01-15T14:30:25.123456
Controller: 192.168.1.100

SUMMARY:
  Total SSIDs Audited: 3
  SSIDs with Passwords: 2
  SSIDs without Passwords: 1
  Total AP Groups: 5
  Audit Errors: 0
  SSID Audit Time: 2.34s
  AP Group Audit Time: 1.67s

SSIDs WITH PASSWORDS:
------------------------------------------------------------
  Guest-WiFi              | SecurePass123       | Length: 13
  Corporate-WiFi          | Corp2024Pass        | Length: 12

SSIDs WITHOUT PASSWORDS:
----------------------------------------
  Test-SSID

SSID-TO-AP-GROUP MAPPING:
------------------------------------------------------------
  Guest-WiFi              | Groups: Building-A, Building-B
  Corporate-WiFi          | Groups: Building-A, Building-C
================================================================================

📄 Audit report saved to: reports/password_audit_20240115_143025.json
```

## Audit Use Cases

### 1. Compliance and Documentation
- Generate regular password reports for security audits
- Document current WiFi configurations
- Verify password complexity requirements

### 2. Troubleshooting
- Check if passwords are correctly configured before making changes
- Verify that password updates were applied correctly
- Identify SSIDs missing passwords

### 3. Change Management
- Compare current state against expected configuration
- Validate changes after maintenance windows
- Create baseline documentation before major changes

### 4. Security Assessment
- Identify weak or default passwords
- Check password lengths and complexity
- Audit which SSIDs are deployed in which AP groups

## Multithreading Performance

The audit system now uses **multithreading** for faster operations:

### Benefits:
- **3-5x faster** audit times for multiple SSIDs
- **Concurrent processing** of SSID passwords and AP groups
- **Scalable performance** - more threads for larger environments
- **Thread-safe operations** with proper error handling

### Threading Configuration:
- **Default**: 5 worker threads for SSID audits
- **AP Groups**: Automatically uses fewer threads (max 3) 
- **Customizable**: Use `--max-workers N` to adjust
- **Debugging**: Use `--no-threading` for sequential processing

### Recommended Settings:
- **Small environments** (1-10 SSIDs): `--max-workers 3`
- **Medium environments** (10-25 SSIDs): `--max-workers 5` (default)
- **Large environments** (25+ SSIDs): `--max-workers 8-10`

## Monitoring Updates

The script creates detailed logs in the `logs/` directory. Look for:
- Which AP groups were updated
- Which hierarchy levels were used
- Any APs that are offline or have pending configs
- Synchronization status