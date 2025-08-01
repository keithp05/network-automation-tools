#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Script Metadata
# @name: Interface Utilization Report
# @description: Generate interface utilization report for specified device
# @author: System
# @version: 1.0
# @tags: interfaces, utilization, reporting
# @requires: snmp
# @parameters: [{"name":"device_ip","type":"string","required":true,"description":"Device IP address"}]


# @name: Interface Utilization Report
# @description: Generate interface utilization report for specified device
# @author: System
# @version: 1.0
# @tags: interfaces, utilization, reporting
# @requires: snmp
# @parameters: [{"name": "device_ip", "type": "string", "required": true, "description": "Device IP address"}]

def generate_utilization_report(device_ip):
    log_message(f"Generating interface utilization report for {device_ip}")
    
    # Get interface statistics
    interfaces = get_interface_stats(device_ip)
    
    if not interfaces:
        log_message(f"No interface data found for {device_ip}", 'WARNING')
        return None
    
    report = {
        'device': device_ip,
        'timestamp': time.time(),
        'interfaces': []
    }
    
    for intf in interfaces:
        name = intf.get('name', 'Unknown')
        in_bytes = intf.get('inOctets', 0)
        out_bytes = intf.get('outOctets', 0)
        speed = intf.get('speed', 0)
        
        # Calculate utilization
        if speed > 0:
            in_utilization = (in_bytes * 8 / speed) * 100
            out_utilization = (out_bytes * 8 / speed) * 100
        else:
            in_utilization = 0
            out_utilization = 0
        
        report['interfaces'].append({
            'name': name,
            'in_utilization': round(in_utilization, 2),
            'out_utilization': round(out_utilization, 2),
            'status': intf.get('operStatus', 'unknown')
        })
        
        log_message(f"Interface {name}: In={in_utilization:.1f}%, Out={out_utilization:.1f}%")
    
    save_result(f'utilization_report_{device_ip}', report)
    return report

# Execute report generation
report = generate_utilization_report(device_ip)
if report:
    print(f"\nReport generated for {len(report['interfaces'])} interfaces")
