# Aruba Guest WiFi Password Update Troubleshooting Guide

## Common Issues When Script Doesn't Work on All APs

### 1. AP Group Configuration Issues

**Problem**: The password change is applied to the SSID profile but not propagated to all AP groups.

**Diagnosis**:
```bash
# Check which AP groups exist
show ap-group

# Check which SSID profiles are assigned to each AP group
show ap-group <group-name>

# Check if the SSID profile is properly assigned
show wlan virtual-ap <vap-name>
```

**Solution**: 
- The script currently applies changes at the `/md` level (Managed Device)
- For multi-controller or campus environments, you may need to apply at different levels:
  - `/mm` - Mobility Master level
  - `/md/campus` - Campus level
  - `/md/campus/building` - Building level

### 2. Configuration Not Propagating to All APs

**Problem**: Configuration is applied but some APs don't receive the update.

**Diagnosis**:
```bash
# Check AP status
show ap database

# Check AP association status
show ap association

# Check for pending configuration on specific APs
show ap config pending

# Check configuration sync status
show configuration effective
```

**Common Causes**:
- APs are offline or unreachable
- APs are in different configuration hierarchies
- Configuration sync is delayed
- APs need to be rebooted to apply changes

### 3. Profile Application Issues

**Problem**: The `apply profile all` command doesn't affect all APs.

**Current Script Behavior**:
```python
def apply_configuration(self) -> bool:
    apply_command = "apply profile all"
    result = self.execute_command(apply_command, config_path="/md")
```

**Improvements Needed**:
1. Apply configuration at multiple hierarchy levels
2. Target specific AP groups
3. Verify configuration was received by all APs

### 4. Authentication and Permission Issues

**Problem**: API user doesn't have permissions for all AP groups or hierarchy levels.

**Diagnosis**:
```bash
# Check user role and permissions
show rights <username>

# Check user's management level access
show mgmt-user
```

**Solution**: Ensure API user has:
- Read/write permissions for all AP groups
- Access to all configuration hierarchy levels
- Permission to execute `write memory` at all levels

## Enhanced Script Implementation

### 1. Multi-Level Configuration Application

Add this method to `aruba_client.py`:

```python
def apply_configuration_multi_level(self, levels: list = None) -> bool:
    """Apply configuration at multiple hierarchy levels"""
    if levels is None:
        levels = ["/md", "/mm", "/md/campus"]
    
    success_count = 0
    for level in levels:
        try:
            result = self.execute_command("apply profile all", config_path=level)
            if result and result.get("_global_result", {}).get("status") == "0":
                self.logger.info(f"Configuration applied successfully at {level}")
                success_count += 1
            else:
                self.logger.warning(f"Failed to apply configuration at {level}")
        except Exception as e:
            self.logger.error(f"Error applying configuration at {level}: {str(e)}")
    
    return success_count > 0
```

### 2. AP Group Specific Updates

Add this method to update specific AP groups:

```python
def update_ssid_password_for_ap_group(self, ssid_profile: str, new_password: str, 
                                     ap_group: str, config_path: str = "/md") -> bool:
    """Update SSID password for a specific AP group"""
    config_commands = [
        f"ap-group {ap_group}",
        f"wlan ssid-profile {ssid_profile}",
        f"wpa-passphrase {new_password}",
        "exit",
        "exit"
    ]
    
    for command in config_commands:
        result = self.execute_command(command, config_path=config_path)
        if not result or result.get("_global_result", {}).get("status") != "0":
            self.logger.error(f"Failed to execute command: {command}")
            return False
    
    return True
```

### 3. Verification Methods

Add verification to ensure changes were applied:

```python
def verify_password_update(self, ssid_profile: str, expected_password_hash: str = None) -> dict:
    """Verify password was updated across all APs"""
    verification_results = {
        'total_aps': 0,
        'verified_aps': 0,
        'failed_aps': [],
        'offline_aps': []
    }
    
    # Get all APs
    ap_result = self.execute_command("show ap database")
    if not ap_result:
        return verification_results
    
    # Parse AP list and check each one
    # This is a simplified example - actual parsing would depend on response format
    
    return verification_results
```

## Diagnostic Commands

Run these commands via SSH to diagnose issues:

```bash
# 1. Check current configuration hierarchy
show configuration effective

# 2. Check which APs didn't receive updates
show ap config pending

# 3. Check SSID profile assignment across AP groups
show wlan ssid-profile | include <ssid-name>

# 4. Check for configuration sync issues
show configuration unsynchronized

# 5. Check AP connectivity
show ap database | include Down

# 6. Force configuration push to specific AP
ap-reboot ap-name <ap-name>

# 7. Check logs for errors
show log system 50 | include error
show log system 50 | include <ssid-name>
```

## Quick Fixes

### 1. Force Configuration Sync
```bash
# At controller CLI
apdatabase synchronize

# Force specific AP group update
ap-group <group-name>
  force-update
  exit
```

### 2. Manual AP Reboot for Stuck APs
```bash
# Reboot specific AP
ap-reboot ap-name <ap-name>

# Reboot all APs in a group
ap-reboot ap-group <group-name>
```

### 3. Clear Pending Configuration
```bash
# Clear pending config for specific AP
clear ap-config ap-name <ap-name>
```

## Script Usage Tips

1. **Use Interactive Mode** to select specific networks:
   ```bash
   python main.py --interactive
   ```

2. **Test on Single AP Group First**:
   ```bash
   python main.py --update --ssids Guest-Test
   ```

3. **Enable Debug Logging** by modifying `config/config.yaml`:
   ```yaml
   logging:
     level: DEBUG
   ```

4. **Run Verification After Update**:
   ```bash
   # Add --verify flag (would need to implement)
   python main.py --verify
   ```

## Common Error Messages and Solutions

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Failed to apply configuration" | Insufficient permissions or wrong hierarchy | Check user permissions and config path |
| "Command execution failed" | API timeout or network issue | Increase timeout, check connectivity |
| "SSID profile not found" | Profile doesn't exist at current level | Check profile exists with `show wlan ssid-profile` |
| "Configuration unsynchronized" | Pending changes not applied | Run `write memory` and `apdatabase synchronize` |

## Best Practices

1. **Always Test First**: Test on a single AP or lab environment
2. **Schedule During Maintenance**: Some APs may need reboot
3. **Monitor Logs**: Check system logs during and after update
4. **Verify Updates**: Always verify password changes were applied
5. **Document AP Groups**: Keep a list of AP groups and their hierarchy
6. **Backup Configuration**: Always backup before making changes

## Next Steps

If the script continues to fail on certain APs:

1. **Collect Diagnostic Info**:
   ```bash
   show ap database
   show ap-group
   show configuration effective
   show log system 100
   ```

2. **Check Specific AP**:
   ```bash
   show ap details ap-name <ap-name>
   show ap config ap-name <ap-name>
   ```

3. **Contact Aruba Support** with:
   - Controller model and version
   - API version being used
   - Diagnostic command outputs
   - Script logs from failed attempts