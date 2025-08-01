const snmp = require('net-snmp');

class SNMPNetworkDiscovery {
    constructor() {
        this.community = 'public';
        this.timeout = 5000;
        this.retries = 3;
        
        // Standard SNMP OIDs for network discovery
        this.oids = {
            sysDescr: '1.3.6.1.2.1.1.1.0',
            sysUpTime: '1.3.6.1.2.1.1.3.0',
            sysContact: '1.3.6.1.2.1.1.4.0',
            sysName: '1.3.6.1.2.1.1.5.0',
            sysLocation: '1.3.6.1.2.1.1.6.0',
            sysServices: '1.3.6.1.2.1.1.7.0',
            
            // Interface table
            ifTable: '1.3.6.1.2.1.2.2.1',
            ifIndex: '1.3.6.1.2.1.2.2.1.1',
            ifDescr: '1.3.6.1.2.1.2.2.1.2',
            ifType: '1.3.6.1.2.1.2.2.1.3',
            ifMtu: '1.3.6.1.2.1.2.2.1.4',
            ifSpeed: '1.3.6.1.2.1.2.2.1.5',
            ifPhysAddress: '1.3.6.1.2.1.2.2.1.6',
            ifAdminStatus: '1.3.6.1.2.1.2.2.1.7',
            ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
            ifInOctets: '1.3.6.1.2.1.2.2.1.10',
            ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
            ifInErrors: '1.3.6.1.2.1.2.2.1.14',
            ifOutErrors: '1.3.6.1.2.1.2.2.1.20',
            
            // IP address table
            ipAdEntAddr: '1.3.6.1.2.1.4.20.1.1',
            ipAdEntIfIndex: '1.3.6.1.2.1.4.20.1.2',
            ipAdEntNetMask: '1.3.6.1.2.1.4.20.1.3',
            
            // ARP table
            ipNetToMediaIfIndex: '1.3.6.1.2.1.4.22.1.1',
            ipNetToMediaPhysAddress: '1.3.6.1.2.1.4.22.1.2',
            ipNetToMediaNetAddress: '1.3.6.1.2.1.4.22.1.3',
            ipNetToMediaType: '1.3.6.1.2.1.4.22.1.4',
            
            // Bridge/Switch MIBs
            dot1dBaseNumPorts: '1.3.6.1.2.1.17.1.2.0',
            dot1dBasePortTable: '1.3.6.1.2.1.17.1.4.1',
            dot1dTpFdbTable: '1.3.6.1.2.1.17.4.3.1',
            dot1dTpFdbAddress: '1.3.6.1.2.1.17.4.3.1.1',
            dot1dTpFdbPort: '1.3.6.1.2.1.17.4.3.1.2',
            dot1dTpFdbStatus: '1.3.6.1.2.1.17.4.3.1.3',
            
            // VLAN MIBs
            vtpVlanState: '1.3.6.1.4.1.9.9.46.1.3.1.1.2',
            vtpVlanName: '1.3.6.1.4.1.9.9.46.1.3.1.1.4',
            
            // CDP MIBs (Cisco)
            cdpInterfaceEnable: '1.3.6.1.4.1.9.9.23.1.1.1.1.2',
            cdpCacheDeviceId: '1.3.6.1.4.1.9.9.23.1.2.1.1.6',
            cdpCacheDevicePort: '1.3.6.1.4.1.9.9.23.1.2.1.1.7',
            cdpCachePlatform: '1.3.6.1.4.1.9.9.23.1.2.1.1.8',
            cdpCacheCapabilities: '1.3.6.1.4.1.9.9.23.1.2.1.1.9',
            cdpCacheAddress: '1.3.6.1.4.1.9.9.23.1.2.1.1.4',
            
            // LLDP MIBs
            lldpRemChassisIdSubtype: '1.0.8802.1.1.2.1.4.1.1.4',
            lldpRemChassisId: '1.0.8802.1.1.2.1.4.1.1.5',
            lldpRemPortIdSubtype: '1.0.8802.1.1.2.1.4.1.1.6',
            lldpRemPortId: '1.0.8802.1.1.2.1.4.1.1.7',
            lldpRemSysName: '1.0.8802.1.1.2.1.4.1.1.9',
            lldpRemSysDesc: '1.0.8802.1.1.2.1.4.1.1.10'
        };
    }

    // Discover device via SNMP
    async discoverDevice(ip, community = null) {
        const comm = community || this.community;
        console.log(`🔍 SNMP discovering device: ${ip}`);
        
        try {
            const session = snmp.createSession(ip, comm, {
                timeout: this.timeout,
                retries: this.retries,
                version: snmp.Version2c
            });

            const device = {
                ip: ip,
                community: comm,
                accessible: false,
                system: {},
                interfaces: [],
                ipAddresses: [],
                arpTable: [],
                macAddressTable: [],
                cdpNeighbors: [],
                lldpNeighbors: [],
                vlans: [],
                capabilities: [],
                lastDiscovered: new Date().toISOString()
            };

            // Get system information
            await this.getSystemInfo(session, device);
            
            if (device.accessible) {
                // Get interface information
                await this.getInterfaceInfo(session, device);
                
                // Get IP address table
                await this.getIpAddressTable(session, device);
                
                // Get ARP table
                await this.getArpTable(session, device);
                
                // Get MAC address table (for switches)
                await this.getMacAddressTable(session, device);
                
                // Get CDP neighbors (Cisco)
                await this.getCdpNeighbors(session, device);
                
                // Get LLDP neighbors
                await this.getLldpNeighbors(session, device);
                
                // Get VLAN information
                await this.getVlanInfo(session, device);
                
                // Determine device capabilities
                this.determineCapabilities(device);
            }

            session.close();
            return device;

        } catch (error) {
            console.error(`❌ SNMP discovery failed for ${ip}:`, error.message);
            return {
                ip: ip,
                accessible: false,
                error: error.message,
                lastDiscovered: new Date().toISOString()
            };
        }
    }

    // Get system information
    async getSystemInfo(session, device) {
        try {
            const systemOids = [
                this.oids.sysDescr,
                this.oids.sysUpTime,
                this.oids.sysContact,
                this.oids.sysName,
                this.oids.sysLocation,
                this.oids.sysServices
            ];

            const result = await this.snmpGet(session, systemOids);
            
            if (result && result.length > 0) {
                device.accessible = true;
                device.system = {
                    description: this.parseSnmpValue(result[0]),
                    uptime: this.parseUptime(result[1]),
                    contact: this.parseSnmpValue(result[2]),
                    name: this.parseSnmpValue(result[3]),
                    location: this.parseSnmpValue(result[4]),
                    services: this.parseServices(result[5])
                };

                // Extract vendor from description
                device.vendor = this.extractVendor(device.system.description);
                
                console.log(`✅ SNMP accessible: ${device.system.name} (${device.vendor})`);
            }

        } catch (error) {
            console.error('Error getting system info:', error.message);
        }
    }

    // Get interface information
    async getInterfaceInfo(session, device) {
        try {
            const interfaces = await this.snmpWalk(session, this.oids.ifDescr);
            
            for (const intf of interfaces) {
                const index = this.extractIndex(intf.oid);
                
                // Get additional interface details
                const details = await this.snmpGet(session, [
                    `${this.oids.ifType}.${index}`,
                    `${this.oids.ifMtu}.${index}`,
                    `${this.oids.ifSpeed}.${index}`,
                    `${this.oids.ifPhysAddress}.${index}`,
                    `${this.oids.ifAdminStatus}.${index}`,
                    `${this.oids.ifOperStatus}.${index}`,
                    `${this.oids.ifInOctets}.${index}`,
                    `${this.oids.ifOutOctets}.${index}`,
                    `${this.oids.ifInErrors}.${index}`,
                    `${this.oids.ifOutErrors}.${index}`
                ]);

                device.interfaces.push({
                    index: index,
                    description: this.parseSnmpValue(intf),
                    type: this.parseIfType(details[0]),
                    mtu: this.parseSnmpValue(details[1]),
                    speed: this.parseSnmpValue(details[2]),
                    macAddress: this.parseMacAddress(details[3]),
                    adminStatus: this.parseStatus(details[4]),
                    operStatus: this.parseStatus(details[5]),
                    inOctets: this.parseSnmpValue(details[6]),
                    outOctets: this.parseSnmpValue(details[7]),
                    inErrors: this.parseSnmpValue(details[8]),
                    outErrors: this.parseSnmpValue(details[9])
                });
            }

        } catch (error) {
            console.error('Error getting interface info:', error.message);
        }
    }

    // Get IP address table
    async getIpAddressTable(session, device) {
        try {
            const ipAddresses = await this.snmpWalk(session, this.oids.ipAdEntAddr);
            
            for (const ip of ipAddresses) {
                const ipAddr = this.parseSnmpValue(ip);
                const index = this.extractIpIndex(ip.oid);
                
                const details = await this.snmpGet(session, [
                    `${this.oids.ipAdEntIfIndex}.${ipAddr}`,
                    `${this.oids.ipAdEntNetMask}.${ipAddr}`
                ]);

                device.ipAddresses.push({
                    address: ipAddr,
                    interfaceIndex: this.parseSnmpValue(details[0]),
                    netmask: this.parseSnmpValue(details[1])
                });
            }

        } catch (error) {
            console.error('Error getting IP address table:', error.message);
        }
    }

    // Get ARP table
    async getArpTable(session, device) {
        try {
            const arpEntries = await this.snmpWalk(session, this.oids.ipNetToMediaNetAddress);
            
            for (const entry of arpEntries) {
                const index = this.extractIndex(entry.oid);
                
                const details = await this.snmpGet(session, [
                    `${this.oids.ipNetToMediaIfIndex}.${index}`,
                    `${this.oids.ipNetToMediaPhysAddress}.${index}`,
                    `${this.oids.ipNetToMediaType}.${index}`
                ]);

                device.arpTable.push({
                    interfaceIndex: this.parseSnmpValue(details[0]),
                    ipAddress: this.parseSnmpValue(entry),
                    macAddress: this.parseMacAddress(details[1]),
                    type: this.parseArpType(details[2])
                });
            }

        } catch (error) {
            console.error('Error getting ARP table:', error.message);
        }
    }

    // Get MAC address table (for switches)
    async getMacAddressTable(session, device) {
        try {
            const macEntries = await this.snmpWalk(session, this.oids.dot1dTpFdbAddress);
            
            for (const entry of macEntries) {
                const macAddr = this.parseMacAddress(entry);
                
                const details = await this.snmpGet(session, [
                    `${this.oids.dot1dTpFdbPort}.${this.getMacOidSuffix(entry.oid)}`,
                    `${this.oids.dot1dTpFdbStatus}.${this.getMacOidSuffix(entry.oid)}`
                ]);

                device.macAddressTable.push({
                    macAddress: macAddr,
                    port: this.parseSnmpValue(details[0]),
                    status: this.parseFdbStatus(details[1])
                });
            }

        } catch (error) {
            console.error('Error getting MAC address table:', error.message);
        }
    }

    // Get CDP neighbors (Cisco)
    async getCdpNeighbors(session, device) {
        try {
            const neighbors = await this.snmpWalk(session, this.oids.cdpCacheDeviceId);
            
            for (const neighbor of neighbors) {
                const index = this.getCdpIndex(neighbor.oid);
                
                const details = await this.snmpGet(session, [
                    `${this.oids.cdpCacheDevicePort}.${index}`,
                    `${this.oids.cdpCachePlatform}.${index}`,
                    `${this.oids.cdpCacheCapabilities}.${index}`,
                    `${this.oids.cdpCacheAddress}.${index}`
                ]);

                device.cdpNeighbors.push({
                    deviceId: this.parseSnmpValue(neighbor),
                    port: this.parseSnmpValue(details[0]),
                    platform: this.parseSnmpValue(details[1]),
                    capabilities: this.parseCdpCapabilities(details[2]),
                    address: this.parseSnmpValue(details[3]),
                    protocol: 'CDP'
                });
            }

        } catch (error) {
            // CDP might not be available
            console.log('CDP not available on this device');
        }
    }

    // Get LLDP neighbors
    async getLldpNeighbors(session, device) {
        try {
            const neighbors = await this.snmpWalk(session, this.oids.lldpRemSysName);
            
            for (const neighbor of neighbors) {
                const index = this.getLldpIndex(neighbor.oid);
                
                const details = await this.snmpGet(session, [
                    `${this.oids.lldpRemChassisId}.${index}`,
                    `${this.oids.lldpRemPortId}.${index}`,
                    `${this.oids.lldpRemSysDesc}.${index}`
                ]);

                device.lldpNeighbors.push({
                    sysName: this.parseSnmpValue(neighbor),
                    chassisId: this.parseSnmpValue(details[0]),
                    portId: this.parseSnmpValue(details[1]),
                    sysDesc: this.parseSnmpValue(details[2]),
                    protocol: 'LLDP'
                });
            }

        } catch (error) {
            // LLDP might not be available
            console.log('LLDP not available on this device');
        }
    }

    // Get VLAN information
    async getVlanInfo(session, device) {
        try {
            const vlans = await this.snmpWalk(session, this.oids.vtpVlanName);
            
            for (const vlan of vlans) {
                const vlanId = this.extractVlanId(vlan.oid);
                
                const stateResult = await this.snmpGet(session, [
                    `${this.oids.vtpVlanState}.${vlanId}`
                ]);

                device.vlans.push({
                    id: vlanId,
                    name: this.parseSnmpValue(vlan),
                    state: this.parseVlanState(stateResult[0])
                });
            }

        } catch (error) {
            console.error('Error getting VLAN info:', error.message);
        }
    }

    // Determine device capabilities
    determineCapabilities(device) {
        const capabilities = [];
        
        // Check if it's a router
        if (device.ipAddresses.length > 1 || device.arpTable.length > 0) {
            capabilities.push('router');
        }
        
        // Check if it's a switch
        if (device.macAddressTable.length > 0 || device.vlans.length > 0) {
            capabilities.push('switch');
        }
        
        // Check if it supports CDP/LLDP
        if (device.cdpNeighbors.length > 0) {
            capabilities.push('cdp');
        }
        
        if (device.lldpNeighbors.length > 0) {
            capabilities.push('lldp');
        }
        
        // Check services
        if (device.system.services) {
            const services = parseInt(device.system.services);
            if (services & 64) capabilities.push('applications');
            if (services & 32) capabilities.push('presentation');
            if (services & 16) capabilities.push('session');
            if (services & 8) capabilities.push('transport');
            if (services & 4) capabilities.push('network');
            if (services & 2) capabilities.push('datalink');
            if (services & 1) capabilities.push('physical');
        }
        
        device.capabilities = capabilities;
    }

    // Helper functions for SNMP operations
    async snmpGet(session, oids) {
        return new Promise((resolve, reject) => {
            session.get(oids, (error, varbinds) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(varbinds);
                }
            });
        });
    }

    async snmpWalk(session, oid) {
        return new Promise((resolve, reject) => {
            const results = [];
            
            session.walk(oid, {
                feedCb: function(varbinds) {
                    for (const vb of varbinds) {
                        if (snmp.isVarbindError(vb)) {
                            console.error(snmp.varbindError(vb));
                        } else {
                            results.push(vb);
                        }
                    }
                },
                doneCb: function(error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            });
        });
    }

    // Parsing functions
    parseSnmpValue(varbind) {
        if (!varbind || snmp.isVarbindError(varbind)) return null;
        
        if (Buffer.isBuffer(varbind.value)) {
            return varbind.value.toString();
        }
        
        return varbind.value;
    }

    parseUptime(varbind) {
        const ticks = this.parseSnmpValue(varbind);
        if (!ticks) return null;
        
        const seconds = Math.floor(ticks / 100);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        return {
            ticks: ticks,
            seconds: seconds,
            formatted: `${days}d ${hours}h ${minutes}m`
        };
    }

    parseMacAddress(varbind) {
        if (!varbind || !varbind.value) return null;
        
        if (Buffer.isBuffer(varbind.value)) {
            return Array.from(varbind.value)
                .map(b => b.toString(16).padStart(2, '0'))
                .join(':');
        }
        
        return null;
    }

    parseStatus(varbind) {
        const value = this.parseSnmpValue(varbind);
        const statuses = { 1: 'up', 2: 'down', 3: 'testing' };
        return statuses[value] || 'unknown';
    }

    parseIfType(varbind) {
        const value = this.parseSnmpValue(varbind);
        const types = {
            6: 'ethernetCsmacd',
            24: 'softwareLoopback',
            131: 'tunnel',
            161: 'ieee8023adLag'
        };
        return types[value] || `type-${value}`;
    }

    parseServices(varbind) {
        return this.parseSnmpValue(varbind);
    }

    parseArpType(varbind) {
        const value = this.parseSnmpValue(varbind);
        const types = { 1: 'other', 2: 'invalid', 3: 'dynamic', 4: 'static' };
        return types[value] || 'unknown';
    }

    parseFdbStatus(varbind) {
        const value = this.parseSnmpValue(varbind);
        const statuses = { 1: 'other', 2: 'invalid', 3: 'learned', 4: 'self', 5: 'mgmt' };
        return statuses[value] || 'unknown';
    }

    parseCdpCapabilities(varbind) {
        const value = this.parseSnmpValue(varbind);
        if (!value) return [];
        
        const capabilities = [];
        if (value & 0x01) capabilities.push('repeater');
        if (value & 0x02) capabilities.push('bridge');
        if (value & 0x04) capabilities.push('sourceRouteBridge');
        if (value & 0x08) capabilities.push('switch');
        if (value & 0x10) capabilities.push('host');
        if (value & 0x20) capabilities.push('igmpEnabled');
        if (value & 0x40) capabilities.push('router');
        
        return capabilities;
    }

    parseVlanState(varbind) {
        const value = this.parseSnmpValue(varbind);
        const states = { 1: 'operational', 2: 'suspended', 3: 'mtuTooBigForDevice', 4: 'mtuTooBigForTrunk' };
        return states[value] || 'unknown';
    }

    extractVendor(description) {
        if (!description) return 'unknown';
        
        const desc = description.toLowerCase();
        if (desc.includes('cisco')) return 'cisco';
        if (desc.includes('juniper')) return 'juniper';
        if (desc.includes('arista')) return 'arista';
        if (desc.includes('fortinet')) return 'fortinet';
        if (desc.includes('palo alto')) return 'paloalto';
        if (desc.includes('checkpoint')) return 'checkpoint';
        if (desc.includes('ubiquiti') || desc.includes('unifi') || desc.includes('edgeos') || desc.includes('edgemax')) return 'ubiquiti';
        if (desc.includes('hp ') || desc.includes('hewlett')) return 'hp';
        if (desc.includes('dell')) return 'dell';
        if (desc.includes('extreme')) return 'extreme';
        
        return 'unknown';
    }

    extractIndex(oid) {
        const parts = oid.split('.');
        return parts[parts.length - 1];
    }

    extractIpIndex(oid) {
        const parts = oid.split('.');
        return parts.slice(-4).join('.');
    }

    extractVlanId(oid) {
        const parts = oid.split('.');
        return parts[parts.length - 1];
    }

    getMacOidSuffix(oid) {
        const parts = oid.split('.');
        return parts.slice(-6).join('.');
    }

    getCdpIndex(oid) {
        const parts = oid.split('.');
        return parts.slice(-2).join('.');
    }

    getLldpIndex(oid) {
        const parts = oid.split('.');
        return parts.slice(-4).join('.');
    }

    // Bulk discovery of subnet
    async discoverSubnet(subnet, community = null) {
        console.log(`🌐 SNMP discovering subnet: ${subnet}.0/24`);
        
        const devices = [];
        const promises = [];
        
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            promises.push(this.discoverDevice(ip, community));
        }
        
        const results = await Promise.allSettled(promises);
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.accessible) {
                devices.push(result.value);
            }
        }
        
        console.log(`✅ SNMP discovery complete: ${devices.length} devices found`);
        return devices;
    }

    // Generate comprehensive network report
    generateNetworkReport(devices) {
        const report = {
            summary: {
                totalDevices: devices.length,
                vendors: {},
                deviceTypes: {},
                totalInterfaces: 0,
                totalVlans: 0
            },
            devices: devices,
            topology: this.buildTopologyFromSnmp(devices)
        };

        // Calculate summary statistics
        devices.forEach(device => {
            // Count vendors
            report.summary.vendors[device.vendor] = (report.summary.vendors[device.vendor] || 0) + 1;
            
            // Count device types based on capabilities
            const type = this.getDeviceTypeFromCapabilities(device.capabilities);
            report.summary.deviceTypes[type] = (report.summary.deviceTypes[type] || 0) + 1;
            
            // Count interfaces and VLANs
            report.summary.totalInterfaces += device.interfaces.length;
            report.summary.totalVlans += device.vlans.length;
        });

        return report;
    }

    getDeviceTypeFromCapabilities(capabilities) {
        if (capabilities.includes('router')) return 'router';
        if (capabilities.includes('switch')) return 'switch';
        return 'host';
    }

    buildTopologyFromSnmp(devices) {
        const topology = {
            nodes: [],
            links: []
        };

        // Create nodes
        devices.forEach(device => {
            topology.nodes.push({
                id: device.ip,
                label: device.system.name || device.ip,
                vendor: device.vendor,
                type: this.getDeviceTypeFromCapabilities(device.capabilities),
                capabilities: device.capabilities
            });
        });

        // Create links from neighbor information
        devices.forEach(device => {
            const allNeighbors = [...device.cdpNeighbors, ...device.lldpNeighbors];
            
            allNeighbors.forEach(neighbor => {
                // Find neighbor device by name or address
                const neighborDevice = devices.find(d => 
                    d.system.name === neighbor.deviceId || 
                    d.system.name === neighbor.sysName ||
                    d.ip === neighbor.address
                );

                if (neighborDevice) {
                    topology.links.push({
                        source: device.ip,
                        target: neighborDevice.ip,
                        protocol: neighbor.protocol,
                        sourcePort: neighbor.port || neighbor.portId,
                        targetPort: neighbor.remotePort
                    });
                }
            });
        });

        return topology;
    }
}

module.exports = SNMPNetworkDiscovery;