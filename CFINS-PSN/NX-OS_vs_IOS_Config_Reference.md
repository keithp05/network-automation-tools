# NX-OS vs IOS TACACS+ Configuration Reference

## Configuration Syntax Differences

### IOS Configuration (Catalyst 3850)

**Server Group Configuration:**
```
aaa group server tacacs+ ISE-TACACS
 server name PVA-M-ISE-PSN05
 server name PVA-M-ISE-PSN06
```

**Server Definitions:**
```
tacacs server PVA-M-ISE-PSN06
 address ipv4 172.18.31.101
 key <TACACS_KEY>
```

**RADIUS Configuration:**
```
aaa group server radius ISE-RADIUS
 server name PVA-M-ISE-PSN05-R
 server name PVA-M-ISE-PSN06-R
 deadtime 1
```

**PSN05 Removal Commands (IOS):**
```
aaa group server tacacs+ ISE-TACACS
 no server name PVA-M-ISE-PSN05
 exit
aaa group server radius ISE-RADIUS
 no server name PVA-M-ISE-PSN05-R
 exit
no tacacs server PVA-M-ISE-PSN05
no radius server PVA-M-ISE-PSN05-R
```

---

### NX-OS Configuration (Nexus 9000)

**Feature Enablement (Required First):**
```
feature tacacs+
```

**Server Host Configuration:**
```
tacacs-server host 172.18.31.102 key 7 "FB!YSCVHKN3D"
tacacs-server host 172.18.31.101 key 7 "FB!YSCVHKN3D"
```

**Server Group Configuration:**
```
aaa group server tacacs+ ISE
 server 172.18.31.102
 server 172.18.31.101
 deadtime 1
 use-vrf management
 source-interface mgmt0
```

**PSN05 Removal Commands (NX-OS):**
```
aaa group server tacacs+ ISE
 no server 172.18.31.102
 exit
no tacacs-server host 172.18.31.102
```

---

## Key Differences Summary

| Feature | IOS | NX-OS |
|---------|-----|-------|
| **Feature Enable** | Not required | `feature tacacs+` required |
| **Server Definition** | Named servers with `tacacs server <NAME>` | Direct IP with `tacacs-server host <IP>` |
| **Server Group Reference** | `server name <NAME>` | `server <IP>` |
| **Key Configuration** | Inside server definition block | Inline with host command |
| **VRF Support** | Varies | `use-vrf management` in group |
| **Source Interface** | Varies | `source-interface mgmt0` in group |

---

## PSN IP Addresses

- **PSN05**: 172.18.31.102
- **PSN06**: 172.18.31.101

---

## Script Detection Logic

Both scripts now:
1. Run `show version` on each device
2. Check for "NX-OS" or "Nexus" in output
3. Select appropriate configuration syntax
4. Apply platform-specific commands
5. Log device type in results

---

## Files Updated

- `Cisco_PSN_Audit_Enhanced.py` - Detects and audits both platforms
- `PSN_Audit_Migration_Fixed_v3.py` - Migrates both platforms correctly
