# PSN Migration Project - Complete Reference

A comprehensive toolkit for migrating Cisco devices from PSN05 to new PSN servers (PSN01, PSN06, etc.) with full testing and validation capabilities.

## 🎯 Project Overview

This project provides tools to safely migrate Cisco network devices from old PSN servers to new ones while maintaining authentication connectivity and providing comprehensive testing capabilities.

### Key Features
- ✅ **Safe Migration** - Never removes all servers at once
- ✅ **Individual Server Testing** - Tests each server with real credentials
- ✅ **Dynamic Server Support** - Add any number/type of PSN servers
- ✅ **Dry-Run Mode** - 100% safe simulation for testing
- ✅ **Cleanup Logs** - Resume PSN05 removal later
- ✅ **Comprehensive Logging** - Full audit trail
- ✅ **Multi-Platform Support** - Automatic detection of IOS vs NX-OS devices
- ✅ **Platform-Specific Configuration** - Proper syntax for both IOS and Nexus switches

## 📁 File Structure

### 🚀 Main Migration Scripts
| File | Purpose | Status |
|------|---------|--------|
| **PSN_Audit_Migration_Fixed_v3.py** | **RECOMMENDED** - Audit-based migration with NX-OS/IOS support | ✅ Latest |
| **Cisco_PSN_Audit_Enhanced.py** | Enhanced audit tool with multi-platform support | ✅ Latest |
| PSN_Migration_Corrected_Flow.py | Safe migration with individual testing | ✅ Current |
| PSN_Migration_Dynamic_Servers.py | Dynamic server entry (unlimited servers) | ✅ Current |
| PSN_Migration_Advanced_Workflow.py | Earlier version with reordering | ⚠️ Superseded |

### 🧪 Testing & Validation
| File | Purpose | Usage |
|------|---------|-------|
| **PSN_Migration_DryRun.py** | **START HERE** - Safe simulation mode | 🔥 Run First |
| PSN_Testing_Strategy.txt | Complete testing methodology | 📖 Read |
| PSN_PreFlight_Checklist.txt | Step-by-step validation checklist | ✅ Follow |

### 📚 Documentation
| File | Content |
|------|---------|
| **NX-OS_vs_IOS_Config_Reference.md** | Platform-specific configuration syntax differences | ✅ New |
| PSN_Corrected_Configuration_Sequence.txt | Exact commands executed by recommended script |
| PSN_Dynamic_Full_Configuration_Examples.txt | Configuration examples for various scenarios |
| PSN_Migration_Complete_Command_Sequence.txt | Complete command sequences |
| PSN_Migration_Decision_Flow.txt | Decision logic flow diagrams |
| PSN_Advanced_Commands_Executed.txt | Commands for advanced workflow |
| PSN_Migration_Auth_Test_Workflow.txt | Authentication testing workflow |

### 📋 Legacy Files
| File | Status | Notes |
|------|--------|-------|
| cisco_config_audit_psn06.py | Legacy | Original audit tool |
| cisco_config_push.py | Legacy | Original push tool |
| Various other PSN*.py files | Historical | Development iterations |

## 🚀 Quick Start Guide

### Step 1: Audit Your Devices (RECOMMENDED)
```bash
python Cisco_PSN_Audit_Enhanced.py
```
- Automatically detects IOS vs NX-OS devices
- Checks for existing PSN05 and PSN06 configurations
- Creates detailed audit reports (JSON and CSV)
- Generates remediation commands for each device
- Works with mixed IOS/NX-OS environments

### Step 2: Review Audit Results
- Check CSV summary for device types and migration status
- Review JSON file for detailed configuration data
- Use remediation file for the migration script

### Step 3: Production Migration
```bash
python PSN_Audit_Migration_Fixed_v3.py
```
- Load the remediation file from audit
- Automatically applies platform-specific commands
- Handles both IOS and NX-OS devices
- Safe PSN05 removal with user confirmation
- Comprehensive logging and error handling

### Alternative: Dry Run Testing
```bash
python PSN_Migration_DryRun.py
```
- 100% safe - no device connections
- Shows all commands that would execute
- Tests logic and prompts
- Creates detailed preview

## 🔧 How It Works

### Migration Flow
1. **Add New Servers** - Append to existing AAA groups (no removal)
2. **Test Each Server** - Individual ping + auth tests with real credentials  
3. **Show Results** - Clear pass/fail status for each server
4. **User Decision** - Remove PSN05 only if new servers work
5. **Cleanup Logs** - Resume PSN05 removal later if kept

### Server Testing Process
```bash
# For each new PSN server:
ping 172.18.31.101 repeat 2 timeout 1
test aaa group ISE-TACACS [username] [password] legacy

# Results shown as:
PSN06: ✓ PASS - PSN06 authentication successful
PSN01: ✗ FAIL - PSN01 authentication failed (server unreachable)
PSN05: ✓ PASS - PSN05 authentication successful
```

## 📊 Configuration Examples

### IOS Configuration (Catalyst Switches)

**Before Migration:**
```
aaa group server tacacs+ ISE-TACACS
 server name PVA-M-ISE-PSN05     ! Existing
```

**After Adding New Servers:**
```
aaa group server tacacs+ ISE-TACACS
 server name PVA-M-ISE-PSN05     ! Original (maintained)
 server name PVA-M-ISE-PSN06     ! New server added
```

**Final State (if PSN05 removed):**
```
aaa group server tacacs+ ISE-TACACS
 server name PVA-M-ISE-PSN06     ! Working
```

### NX-OS Configuration (Nexus Switches)

**Before Migration:**
```
feature tacacs+
tacacs-server host 172.18.31.102 key <KEY>
aaa group server tacacs+ ISE
 server 172.18.31.102     ! PSN05 Existing
```

**After Adding New Servers:**
```
feature tacacs+
tacacs-server host 172.18.31.102 key <KEY>
tacacs-server host 172.18.31.101 key <KEY>
aaa group server tacacs+ ISE
 server 172.18.31.102     ! PSN05 Original
 server 172.18.31.101     ! PSN06 New
```

**Final State (if PSN05 removed):**
```
feature tacacs+
tacacs-server host 172.18.31.101 key <KEY>
aaa group server tacacs+ ISE
 server 172.18.31.101     ! PSN06 Working
```

## 🛠️ Prerequisites

### Software Requirements
- Python 3.x
- netmiko library: `pip install netmiko`
- tkinter (usually included with Python)

### Network Requirements  
- SSH access to target Cisco devices
- Connectivity to PSN servers
- ISE/TACACS+ servers operational
- Test user credentials in ISE

### Device Requirements
- Cisco IOS devices (Catalyst switches, routers)
- Cisco NX-OS devices (Nexus switches)
- Enable/privilege access
- Existing AAA configuration (optional)

## 🎛️ Dynamic Server Configuration

The script supports unlimited PSN servers with flexible naming:

### Standard Example
```
Server 1: PSN06 (172.18.31.101)
Server 2: PSN01 (172.18.31.100)
```

### Regional Example  
```
Server 1: PSNEAST (10.1.1.100)
Server 2: PSNWEST (10.2.1.100) 
Server 3: PSNCENTRAL (10.3.1.100)
```

### Multiple Servers Example
```
Server 1: PSN06 (172.18.31.101)
Server 2: PSN01 (172.18.31.100)
Server 3: PSN03 (172.18.31.103)
Server 4: PSN04 (172.18.31.104)
```

## 🧪 Testing Strategy

### Phase 1: Dry Run (Required)
- Run `PSN_Migration_DryRun.py`
- Review all generated commands
- Validate logic paths
- Train team on process

### Phase 2: Lab Testing (Recommended)
- Single lab device
- Same IOS version as production
- Full workflow validation
- Rollback testing

### Phase 3: Pilot Production
- 1-2 non-critical devices
- Maintenance window
- Support team ready
- Rollback plan active

### Phase 4: Full Production
- Small batches
- Monitor each batch
- Escalation procedures ready

## 📋 Pre-Flight Checklist

### Environment Validation
- [ ] PSN servers reachable and responding
- [ ] Test user credentials validated in ISE
- [ ] Device SSH access confirmed
- [ ] Console/OOB access available
- [ ] Configuration backups completed

### Script Validation  
- [ ] Dry run completed successfully
- [ ] Commands reviewed and approved
- [ ] Device list formatted correctly
- [ ] Libraries installed and working

### Operational Readiness
- [ ] Maintenance window approved
- [ ] Support team briefed and available
- [ ] Rollback procedures tested
- [ ] Emergency contacts ready

## 🚨 Safety Features

### No Service Disruption
- New servers added to END of AAA groups
- Existing authentication continues working
- No removal of all servers simultaneously
- PSN05 kept until new servers proven working

### Individual Testing
- Each server tested with ping
- Each server tested with real auth credentials
- Clear pass/fail results shown
- Informed removal decisions

### Rollback Capability
- Original configuration backed up
- Rollback commands documented
- Cleanup logs for deferred removal
- Emergency procedures defined

## 📈 Results and Logging

### Detailed Logging
- Every command logged with timestamp
- Individual server test results
- Decision points and outcomes
- Error messages and troubleshooting info

### Result Categories
- **PSN Added** - New servers successfully configured
- **Auth Passed** - Servers responding to authentication
- **Auth Failed** - Servers not responding (PSN05 kept)
- **PSN05 Removed** - Old server safely removed
- **PSN05 Kept** - Old server maintained (cleanup log created)

### Output Files
- **migration_results.json** - Detailed results per device
- **migration_summary.txt** - Human-readable summary  
- **Log files** - Complete execution logs
- **Cleanup logs** - JSON files for deferred PSN05 removal

## 🔄 Cleanup Process

If PSN05 is kept during migration, cleanup logs are created for later removal:

```json
{
  "device_ip": "172.18.4.30",
  "username": "admin", 
  "created": "2025-09-09T14:30:00",
  "psn_servers_added": ["PSN06", "PSN01"],
  "reason_kept": "User chose to keep PSN05",
  "cleanup_required": true,
  "commands": [PSN05 removal commands]
}
```

Run cleanup mode to finish PSN05 removal:
```bash
python PSN_Migration_Corrected_Flow.py
# Select 'c' for cleanup task
# Load the cleanup JSON file
```

## ⚠️ Important Notes

### What the Script Does NOT Do
- Does not remove and re-add existing servers
- Does not reorder server priority by removal
- Does not make changes without user approval
- Does not proceed if authentication tests fail

### What Makes This Safe
- Appends new servers to existing groups
- Tests each server individually
- Shows clear test results before decisions
- Maintains existing authentication during process
- Creates comprehensive logs for audit

### Best Practices
1. Always run dry-run first
2. Test in lab environment when possible
3. Start with pilot devices
4. Monitor authentication during changes
5. Have rollback plan ready
6. Keep ISE team informed

## 🆘 Emergency Procedures

### If Authentication Fails
1. Check console access available
2. Verify ISE servers operational
3. Use rollback commands to restore
4. Contact ISE administrator

### Rollback Commands
```bash
configure terminal
aaa group server tacacs+ ISE-TACACS
 no server name PVA-M-ISE-PSN06
 no server name PVA-M-ISE-PSN01
exit
no tacacs server PVA-M-ISE-PSN06  
no tacacs server PVA-M-ISE-PSN01
no radius server PVA-M-ISE-PSN06-R
no radius server PVA-M-ISE-PSN01-R
end
write memory
```

## 🤝 Support

### Escalation Path
1. Network team lead
2. ISE administrator  
3. Change management
4. Service desk (if user impact)

### Troubleshooting
- Review script logs for errors
- Check device logs for AAA messages
- Verify ISE logs for authentication attempts
- Test connectivity to PSN servers
- Validate user credentials in ISE

---

## 📝 Development History

This project evolved through multiple iterations to achieve maximum safety and functionality:

1. **Initial Version** - Basic PSN06 configuration
2. **Enhanced Version** - Added authentication testing
3. **Dynamic Version** - Unlimited server support  
4. **Corrected Version** - Safe approach without server removal
5. **Testing Framework** - Comprehensive validation tools

The current recommended approach prioritizes safety and service continuity while providing comprehensive testing and validation capabilities.

---

**Created by:** Keith Perez  
**Contact:** keith.p05@gmail.com  
**Repository:** [CFINS-PSN](https://github.com/keithp05/CFINS-PSN)  
**Last Updated:** September 2025