# PSN Migration Script Troubleshooting Session

## Current Status (September 25, 2025)

### Problem Summary
The PSN migration script (`PSN_Migration_With_Auth_Test.py`) is successfully adding PSN servers but **not removing PSN05** because the authentication test is failing within the script, even though manual authentication tests work perfectly.

### What's Working
✅ **Manual auth test works**: `test aaa group ISE-TACACS server 172.18.31.101 Kperez1_NW F6Zqrv&BMEDdX legacy`  
✅ **PSN server addition works**: Script successfully adds new PSN servers using correct format  
✅ **Format detection works**: Script correctly detects modern TACACS format  
✅ **PSN05 removal commands work manually**: Manual removal of PSN05 successful  

### What's Not Working
❌ **Script auth test fails**: Same credentials that work manually fail in script  
❌ **PSN05 not removed**: Because auth test fails, script won't proceed to removal  

## Device Configuration Analysis

### Current Device Config (from steps.txt)
- **Device**: CHIPPLANSW01
- **Format**: Modern TACACS (confirmed working)
- **Current Servers**: PSN05 (172.18.31.102) and PSN06 (172.18.31.101) 
- **Working Auth Test**: `test aaa group ISE-TACACS server 172.18.31.101 Kperez1_NW F6Zqrv&BMEDdX legacy`

### Manual Removal Steps That Work
```
conf t
no tacacs server PVA-M-ISE-PSN05
aaa group server tacacs+ ISE-TACACS
no server name PVA-M-ISE-PSN05
end
wr
```

## Script Evolution History

### Key Files
1. **Cisco_PSN_Audit_With_Auth_Test.py** - Fixed to use IP addresses in auth test (working)
2. **PSN_Migration_With_Auth_Test.py** - Migration script with auth testing (problematic)

### Recent Fixes Applied
1. **Auth test command format**: Changed from server names to IP addresses
2. **TACACS format detection**: Improved to check existing config first
3. **Credential prompting**: Script asks for test username/password each run
4. **Audit integration**: Script now uses audit results JSON instead of device list
5. **Debug output**: Added detailed logging of auth test commands and responses

## Current Script Workflow

### Expected Flow
1. **Prompt for PSN server details** (name, IP, keys)
2. **Prompt for test credentials** (username, password)
3. **Load audit results** (JSON file from audit script)
4. **For each device**:
   - Add PSN server configurations
   - Test authentication 
   - If auth passes → Remove PSN05
   - If auth fails → Keep PSN05 (safety measure)

### Where It's Failing
- **Auth test step**: Script auth test fails but manual test passes with same credentials

## Debug Information Needed

### Latest Script Version (f01967f)
Added debug output showing:
- Exact command being sent
- Device response received  
- Pass/fail determination

### Next Steps for Troubleshooting
1. **Run script with debug output** - Check what exact command/response it gets
2. **Compare script vs manual** - Look for differences in command execution
3. **Check for special character issues** - Password may need escaping in script
4. **Verify timing** - Script may need longer delays for auth test

## Potential Issues to Investigate

### Credential/Command Issues
- **Special characters in password**: `F6Zqrv&BMEDdX` contains `&` which might need escaping
- **Command timing**: Script may be too fast vs manual typing
- **Context differences**: Script vs manual CLI context

### Authentication Logic Issues  
- **Success detection**: Script looks for "successfully authenticated" but device might return different text
- **Group detection**: Script gets servers from config but might miss something
- **Server selection**: Script tests all non-PSN05 servers, might test wrong one

## Files to Check
- **CFINS-PSN/PSN_Migration_With_Auth_Test.py** - Main migration script
- **CFINS-PSN/Cisco_PSN_Audit_With_Auth_Test.py** - Working audit script  
- **CFINS-PSN/steps.txt** - Manual steps that work
- **CFINS-PSN/errords.txt** - Previous error logs

## Success Criteria
✅ **Script auth test passes** using same credentials as manual test  
✅ **PSN05 removed automatically** when auth test passes  
✅ **Script completes full migration** from PSN05 to PSN06  

## Next Session Tasks
1. Run debug version of script and analyze output
2. Compare script command vs manual command character-by-character
3. Fix any differences found in command execution
4. Test complete migration workflow
5. Document final working solution

---
*Session saved: September 25, 2025*  
*Latest commit: f01967f - Debug output added to auth test*