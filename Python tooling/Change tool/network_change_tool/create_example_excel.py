#!/usr/bin/env python3
"""
Create example Excel file for device import
"""

import pandas as pd
from pathlib import Path

# Create sample device data
devices_data = [
    {"hostname": "core-switch-01", "ip_address": "192.168.1.10", "device_type": "cisco_ios", "port": 22, "location": "datacenter", "role": "core"},
    {"hostname": "core-switch-02", "ip_address": "192.168.1.11", "device_type": "cisco_ios", "port": 22, "location": "datacenter", "role": "core"},
    {"hostname": "core-switch-03", "ip_address": "192.168.1.12", "device_type": "cisco_ios", "port": 22, "location": "datacenter", "role": "core"},
    {"hostname": "nexus-switch-01", "ip_address": "192.168.1.15", "device_type": "cisco_nxos", "port": 22, "location": "datacenter", "role": "aggregation"},
    {"hostname": "nexus-switch-02", "ip_address": "192.168.1.16", "device_type": "cisco_nxos", "port": 22, "location": "datacenter", "role": "aggregation"},
    {"hostname": "access-switch-01", "ip_address": "192.168.2.10", "device_type": "cisco_ios", "port": 22, "location": "floor1", "role": "access"},
    {"hostname": "access-switch-02", "ip_address": "192.168.2.11", "device_type": "cisco_ios", "port": 22, "location": "floor2", "role": "access"},
    {"hostname": "access-switch-03", "ip_address": "192.168.2.12", "device_type": "cisco_ios", "port": 22, "location": "floor3", "role": "access"},
    {"hostname": "asa-firewall-01", "ip_address": "192.168.1.20", "device_type": "cisco_asa", "port": 22, "location": "datacenter", "role": "security"},
    {"hostname": "asa-firewall-02", "ip_address": "192.168.1.21", "device_type": "cisco_asa", "port": 22, "location": "datacenter", "role": "security"},
    {"hostname": "palo-firewall-01", "ip_address": "192.168.1.25", "device_type": "paloalto_panos", "port": 443, "location": "datacenter", "role": "security"},
    {"hostname": "palo-firewall-02", "ip_address": "192.168.1.26", "device_type": "paloalto_panos", "port": 443, "location": "datacenter", "role": "security"},
    {"hostname": "router-01", "ip_address": "192.168.1.30", "device_type": "cisco_ios", "port": 22, "location": "datacenter", "role": "gateway"},
    {"hostname": "router-02", "ip_address": "192.168.1.31", "device_type": "cisco_ios", "port": 22, "location": "datacenter", "role": "gateway"}
]

# Create DataFrame
df = pd.DataFrame(devices_data)

# Create Excel file with multiple sheets
output_path = Path("./examples/device_list.xlsx")
output_path.parent.mkdir(parents=True, exist_ok=True)

with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
    # Main device list
    df.to_excel(writer, sheet_name='Devices', index=False)
    
    # Core switches only
    core_switches = df[df['role'] == 'core']
    core_switches.to_excel(writer, sheet_name='Core_Switches', index=False)
    
    # Firewalls only
    firewalls = df[df['role'] == 'security']
    firewalls.to_excel(writer, sheet_name='Firewalls', index=False)
    
    # Access switches only
    access_switches = df[df['role'] == 'access']
    access_switches.to_excel(writer, sheet_name='Access_Switches', index=False)

print(f"Created Excel file: {output_path}")
print(f"Sheets: Devices, Core_Switches, Firewalls, Access_Switches")
print(f"Total devices: {len(df)}")

# Also create a simple version with just required columns
simple_df = df[['hostname', 'ip_address', 'device_type', 'port']]
simple_path = Path("./examples/device_list_simple.xlsx")

with pd.ExcelWriter(simple_path, engine='openpyxl') as writer:
    simple_df.to_excel(writer, sheet_name='Devices', index=False)

print(f"Created simple Excel file: {simple_path}")