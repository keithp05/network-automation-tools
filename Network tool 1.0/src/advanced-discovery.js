const NetworkTopologyDiscovery = require('./network-discovery');
const SNMPNetworkDiscovery = require('./snmp-discovery');
const CredentialManager = require('./credential-manager');

class AdvancedNetworkDiscovery {
    constructor() {
        this.credentialManager = new CredentialManager();
        this.topologyDiscovery = new NetworkTopologyDiscovery();
        this.snmpDiscovery = new SNMPNetworkDiscovery();
        
        this.discoveredDevices = new Map();
        this.neighborRelationships = new Map();
        this.macAddressMappings = new Map();
        this.interfaceConnections = new Map();
        this.discoveryProgress = {
            total: 0,
            completed: 0,
            phase: 'idle',
            devices: []
        };
    }

    // Start comprehensive network discovery
    async startGradualDiscovery(seedIPs, credentialSetIds, options = {}) {
        console.log('🌐 Starting gradual network discovery...');
        
        this.discoveryProgress = {
            total: seedIPs.length,
            completed: 0,
            phase: 'initializing',
            devices: [],
            errors: []
        };

        const credentials = this.getCredentialsForDiscovery(credentialSetIds);
        const discoveredIPs = new Set(seedIPs);
        const pendingIPs = new Set(seedIPs);

        try {
            // Phase 1: Initial device discovery
            this.discoveryProgress.phase = 'discovering_devices';
            
            for (const ip of seedIPs) {
                await this.discoverSingleDevice(ip, credentials, options);
                this.discoveryProgress.completed++;
                
                // Emit progress update
                if (options.progressCallback) {
                    options.progressCallback({
                        ...this.discoveryProgress,
                        currentDevice: ip
                    });
                }
            }

            // Phase 2: Neighbor discovery and expansion
            this.discoveryProgress.phase = 'discovering_neighbors';
            
            let iterationCount = 0;
            const maxIterations = options.maxIterations || 5;
            
            while (pendingIPs.size > 0 && iterationCount < maxIterations) {
                const currentIPs = Array.from(pendingIPs);
                pendingIPs.clear();
                
                console.log(`🔍 Discovery iteration ${iterationCount + 1}: ${currentIPs.length} devices`);
                
                for (const ip of currentIPs) {
                    const device = this.discoveredDevices.get(ip);
                    if (!device) continue;

                    // Discover neighbors for this device
                    const neighbors = await this.discoverNeighbors(device, credentials, options);
                    
                    // Add new neighbors to discovery queue
                    for (const neighbor of neighbors) {
                        if (neighbor.ip && !discoveredIPs.has(neighbor.ip)) {
                            discoveredIPs.add(neighbor.ip);
                            pendingIPs.add(neighbor.ip);
                        }
                    }
                }
                
                // Discover new devices found via neighbors
                for (const newIP of pendingIPs) {
                    await this.discoverSingleDevice(newIP, credentials, options);
                    this.discoveryProgress.completed++;
                    this.discoveryProgress.total++;
                    
                    if (options.progressCallback) {
                        options.progressCallback({
                            ...this.discoveryProgress,
                            currentDevice: newIP
                        });
                    }
                }
                
                iterationCount++;
            }

            // Phase 3: MAC address table analysis
            this.discoveryProgress.phase = 'analyzing_mac_tables';
            await this.analyzeMacAddressTables();

            // Phase 4: Interface connection mapping
            this.discoveryProgress.phase = 'mapping_connections';
            await this.mapInterfaceConnections();

            // Phase 5: Finalize topology
            this.discoveryProgress.phase = 'finalizing';
            const topology = this.buildComprehensiveTopology();

            this.discoveryProgress.phase = 'completed';
            console.log(`✅ Discovery completed: ${this.discoveredDevices.size} devices discovered`);

            return {
                devices: Array.from(this.discoveredDevices.values()),
                neighborRelationships: Array.from(this.neighborRelationships.entries()),
                macAddressMappings: Array.from(this.macAddressMappings.entries()),
                interfaceConnections: Array.from(this.interfaceConnections.entries()),
                topology: topology,
                progress: this.discoveryProgress
            };

        } catch (error) {
            console.error('❌ Discovery error:', error);
            this.discoveryProgress.phase = 'error';
            this.discoveryProgress.errors.push(error.message);
            throw error;
        }
    }

    // Discover a single device using multiple methods
    async discoverSingleDevice(ip, credentials, options = {}) {
        console.log(`🔍 Discovering device: ${ip}`);
        
        const device = {
            ip: ip,
            hostname: '',
            vendor: '',
            model: '',
            version: '',
            interfaces: new Map(),
            neighbors: [],
            macTable: [],
            routingTable: [],
            arpTable: [],
            vlans: [],
            capabilities: [],
            methods: {
                ping: false,
                ssh: false,
                telnet: false,
                snmp: false
            },
            lastDiscovered: new Date().toISOString(),
            discoveryMethod: 'unknown'
        };

        try {
            // Method 1: Ping test
            device.methods.ping = await this.testPing(ip);

            if (!device.methods.ping && !options.includeUnreachable) {
                console.log(`❌ Device ${ip} not reachable via ping`);
                return device;
            }

            // Method 2: SNMP discovery
            if (credentials.snmp && credentials.snmp.length > 0) {
                const snmpResult = await this.trySnmpDiscovery(ip, credentials.snmp);
                if (snmpResult.accessible) {
                    Object.assign(device, snmpResult);
                    device.methods.snmp = true;
                    device.discoveryMethod = 'snmp';
                }
            }

            // Method 3: SSH discovery (if SNMP failed or for additional data)
            if (credentials.ssh && credentials.ssh.length > 0) {
                const sshResult = await this.trySSHDiscovery(ip, credentials.ssh, device);
                if (sshResult.accessible) {
                    // Merge SSH data with existing device data
                    this.mergeDeviceData(device, sshResult);
                    device.methods.ssh = true;
                    if (device.discoveryMethod === 'unknown') {
                        device.discoveryMethod = 'ssh';
                    }
                }
            }

            // Method 4: Telnet discovery (fallback)
            if (credentials.telnet && credentials.telnet.length > 0 && !device.methods.ssh) {
                const telnetResult = await this.tryTelnetDiscovery(ip, credentials.telnet, device);
                if (telnetResult.accessible) {
                    this.mergeDeviceData(device, telnetResult);
                    device.methods.telnet = true;
                    if (device.discoveryMethod === 'unknown') {
                        device.discoveryMethod = 'telnet';
                    }
                }
            }

            this.discoveredDevices.set(ip, device);
            this.discoveryProgress.devices.push({
                ip: ip,
                hostname: device.hostname,
                vendor: device.vendor,
                method: device.discoveryMethod,
                timestamp: device.lastDiscovered
            });

            console.log(`✅ Device discovered: ${device.hostname || ip} (${device.vendor || 'unknown'}) via ${device.discoveryMethod}`);
            return device;

        } catch (error) {
            console.error(`❌ Error discovering ${ip}:`, error.message);
            device.error = error.message;
            this.discoveryProgress.errors.push(`${ip}: ${error.message}`);
            return device;
        }
    }

    // Test ping connectivity
    async testPing(ip) {
        try {
            const ping = require('ping');
            const result = await ping.promise.probe(ip, { timeout: 2 });
            return result.alive;
        } catch (error) {
            return false;
        }
    }

    // Try SNMP discovery with multiple community strings
    async trySnmpDiscovery(ip, snmpCredentials) {
        for (const cred of snmpCredentials) {
            try {
                const device = await this.snmpDiscovery.discoverDevice(ip, cred.community);
                if (device.accessible) {
                    return device;
                }
            } catch (error) {
                console.log(`SNMP discovery failed for ${ip} with community ${cred.community}: ${error.message}`);
            }
        }
        return { accessible: false };
    }

    // Try SSH discovery with multiple credentials
    async trySSHDiscovery(ip, sshCredentials, existingDevice) {
        for (const cred of sshCredentials) {
            try {
                const deviceInfo = { ip: ip };
                const result = await this.topologyDiscovery.discoverDevice(deviceInfo, { ssh: cred });
                
                if (result.status === 'connected') {
                    return { accessible: true, ...result };
                }
            } catch (error) {
                console.log(`SSH discovery failed for ${ip} with user ${cred.username}: ${error.message}`);
            }
        }
        return { accessible: false };
    }

    // Try Telnet discovery with multiple credentials
    async tryTelnetDiscovery(ip, telnetCredentials, existingDevice) {
        for (const cred of telnetCredentials) {
            try {
                const deviceInfo = { ip: ip };
                const result = await this.topologyDiscovery.discoverDevice(deviceInfo, { telnet: cred });
                
                if (result.status === 'connected') {
                    return { accessible: true, ...result };
                }
            } catch (error) {
                console.log(`Telnet discovery failed for ${ip} with user ${cred.username}: ${error.message}`);
            }
        }
        return { accessible: false };
    }

    // Discover neighbors for a specific device
    async discoverNeighbors(device, credentials, options = {}) {
        const neighbors = [];
        
        try {
            // Get neighbors from device data (CDP/LLDP)
            if (device.neighbors && device.neighbors.length > 0) {
                neighbors.push(...device.neighbors);
            }

            // Get neighbors from SNMP if available
            if (device.methods.snmp && credentials.snmp) {
                const snmpNeighbors = await this.discoverSNMPNeighbors(device.ip, credentials.snmp);
                neighbors.push(...snmpNeighbors);
            }

            // Get neighbors from ARP table
            if (device.arpTable && device.arpTable.length > 0) {
                const arpNeighbors = this.extractNeighborsFromARP(device.arpTable);
                neighbors.push(...arpNeighbors);
            }

            // Store neighbor relationships
            if (neighbors.length > 0) {
                this.neighborRelationships.set(device.ip, neighbors);
            }

            return neighbors;

        } catch (error) {
            console.error(`Error discovering neighbors for ${device.ip}:`, error.message);
            return neighbors;
        }
    }

    // Discover SNMP neighbors (CDP/LLDP)
    async discoverSNMPNeighbors(ip, snmpCredentials) {
        const neighbors = [];
        
        for (const cred of snmpCredentials) {
            try {
                const device = await this.snmpDiscovery.discoverDevice(ip, cred.community);
                if (device.accessible) {
                    neighbors.push(...device.cdpNeighbors);
                    neighbors.push(...device.lldpNeighbors);
                    break; // Use first working credential
                }
            } catch (error) {
                // Try next credential
            }
        }
        
        return neighbors;
    }

    // Extract neighbor IPs from ARP table
    extractNeighborsFromARP(arpTable) {
        const neighbors = [];
        
        arpTable.forEach(entry => {
            if (entry.ipAddress && entry.type === 'dynamic') {
                neighbors.push({
                    ip: entry.ipAddress,
                    macAddress: entry.macAddress,
                    interface: entry.interfaceIndex,
                    protocol: 'ARP',
                    type: 'learned'
                });
            }
        });
        
        return neighbors;
    }

    // Analyze MAC address tables for device connections
    async analyzeMacAddressTables() {
        console.log('🔍 Analyzing MAC address tables...');
        
        // Collect all MAC address entries
        const macDatabase = new Map();
        
        for (const [deviceIP, device] of this.discoveredDevices) {
            if (device.macTable && device.macTable.length > 0) {
                device.macTable.forEach(entry => {
                    if (!macDatabase.has(entry.macAddress)) {
                        macDatabase.set(entry.macAddress, []);
                    }
                    
                    macDatabase.get(entry.macAddress).push({
                        deviceIP: deviceIP,
                        deviceName: device.hostname || deviceIP,
                        port: entry.port,
                        vlan: entry.vlan,
                        status: entry.status
                    });
                });
            }
        }

        // Identify inter-switch connections
        for (const [mac, locations] of macDatabase) {
            if (locations.length > 1) {
                // MAC appears on multiple switches - potential inter-switch link
                this.analyzeInterSwitchConnection(mac, locations);
            }
            
            this.macAddressMappings.set(mac, locations);
        }

        console.log(`✅ Analyzed ${macDatabase.size} MAC addresses across ${this.discoveredDevices.size} devices`);
    }

    // Analyze potential inter-switch connections
    analyzeInterSwitchConnection(mac, locations) {
        // Sort by number of MACs seen on each port (trunk ports see more MACs)
        const sortedLocations = locations.sort((a, b) => {
            const aDevice = this.discoveredDevices.get(a.deviceIP);
            const bDevice = this.discoveredDevices.get(b.deviceIP);
            
            const aPortMacs = aDevice.macTable.filter(m => m.port === a.port).length;
            const bPortMacs = bDevice.macTable.filter(m => m.port === b.port).length;
            
            return bPortMacs - aPortMacs;
        });

        // If two devices see the same MAC and one has many more MACs on that port,
        // it's likely an inter-switch connection
        if (sortedLocations.length === 2) {
            const [primary, secondary] = sortedLocations;
            
            const connectionKey = `${primary.deviceIP}:${primary.port}-${secondary.deviceIP}:${secondary.port}`;
            
            if (!this.interfaceConnections.has(connectionKey)) {
                this.interfaceConnections.set(connectionKey, {
                    device1: {
                        ip: primary.deviceIP,
                        hostname: primary.deviceName,
                        interface: primary.port
                    },
                    device2: {
                        ip: secondary.deviceIP,
                        hostname: secondary.deviceName,
                        interface: secondary.port
                    },
                    type: 'learned_from_mac',
                    confidence: 'medium',
                    vlan: primary.vlan,
                    evidenceMac: mac
                });
            }
        }
    }

    // Map interface connections from multiple sources
    async mapInterfaceConnections() {
        console.log('🔗 Mapping interface connections...');
        
        // Add connections from neighbor discovery (CDP/LLDP)
        for (const [deviceIP, neighbors] of this.neighborRelationships) {
            const device = this.discoveredDevices.get(deviceIP);
            
            neighbors.forEach(neighbor => {
                if (neighbor.ip && neighbor.localInterface && neighbor.remoteInterface) {
                    const connectionKey = `${deviceIP}:${neighbor.localInterface}-${neighbor.ip}:${neighbor.remoteInterface}`;
                    
                    this.interfaceConnections.set(connectionKey, {
                        device1: {
                            ip: deviceIP,
                            hostname: device.hostname || deviceIP,
                            interface: neighbor.localInterface
                        },
                        device2: {
                            ip: neighbor.ip,
                            hostname: neighbor.deviceId || neighbor.sysName || neighbor.ip,
                            interface: neighbor.remoteInterface
                        },
                        type: neighbor.protocol.toLowerCase(),
                        confidence: 'high',
                        protocol: neighbor.protocol
                    });
                }
            });
        }

        console.log(`✅ Mapped ${this.interfaceConnections.size} interface connections`);
    }

    // Build comprehensive topology
    buildComprehensiveTopology() {
        const nodes = [];
        const links = [];

        // Create nodes from discovered devices
        for (const [ip, device] of this.discoveredDevices) {
            nodes.push({
                id: ip,
                label: device.hostname || ip,
                ip: ip,
                vendor: device.vendor,
                model: device.model,
                type: this.determineDeviceType(device),
                capabilities: device.capabilities,
                methods: device.methods,
                discoveryMethod: device.discoveryMethod,
                interfaces: Array.from(device.interfaces.values()),
                vlans: device.vlans
            });
        }

        // Create links from interface connections
        for (const [connectionKey, connection] of this.interfaceConnections) {
            links.push({
                id: connectionKey,
                source: connection.device1.ip,
                target: connection.device2.ip,
                sourceInterface: connection.device1.interface,
                targetInterface: connection.device2.interface,
                type: connection.type,
                confidence: connection.confidence,
                protocol: connection.protocol,
                vlan: connection.vlan
            });
        }

        return {
            nodes: nodes,
            links: links,
            summary: {
                totalDevices: nodes.length,
                totalConnections: links.length,
                deviceTypes: this.getDeviceTypeSummary(nodes),
                vendors: this.getVendorSummary(nodes),
                discoveryMethods: this.getDiscoveryMethodSummary(nodes)
            }
        };
    }

    // Helper methods
    getCredentialsForDiscovery(credentialSetIds) {
        const credentials = { ssh: [], telnet: [], snmp: [] };
        
        for (const id of credentialSetIds) {
            const credSet = this.credentialManager.getCredentialSet(id, true);
            if (credSet) {
                if (credSet.ssh) credentials.ssh.push(credSet.ssh);
                if (credSet.telnet) credentials.telnet.push(credSet.telnet);
                if (credSet.snmp) credentials.snmp.push(credSet.snmp);
            }
        }
        
        return credentials;
    }

    mergeDeviceData(target, source) {
        if (source.hostname && !target.hostname) target.hostname = source.hostname;
        if (source.vendor && !target.vendor) target.vendor = source.vendor;
        if (source.model && !target.model) target.model = source.model;
        if (source.version && !target.version) target.version = source.version;
        
        if (source.interfaces) {
            Object.assign(target.interfaces, source.interfaces);
        }
        
        if (source.neighbors) target.neighbors.push(...source.neighbors);
        if (source.macTable) target.macTable.push(...source.macTable);
        if (source.routingTable) target.routingTable.push(...source.routingTable);
        if (source.vlans) target.vlans.push(...source.vlans);
    }

    determineDeviceType(device) {
        if (device.capabilities.includes('router') || device.routingTable.length > 5) return 'router';
        if (device.capabilities.includes('switch') || device.macTable.length > 0) return 'switch';
        if (device.vendor === 'fortinet' || device.vendor === 'paloalto' || device.vendor === 'checkpoint') return 'firewall';
        if (device.vendor === 'ubiquiti') {
            // Ubiquiti device type detection based on model or hostname
            if (device.model && (device.model.includes('USG') || device.model.includes('UDM'))) return 'firewall';
            if (device.model && device.model.includes('US-')) return 'switch';
            if (device.model && device.model.includes('ER-')) return 'router';
            return 'switch'; // Default for UniFi devices
        }
        return 'host';
    }

    getDeviceTypeSummary(nodes) {
        const summary = {};
        nodes.forEach(node => {
            summary[node.type] = (summary[node.type] || 0) + 1;
        });
        return summary;
    }

    getVendorSummary(nodes) {
        const summary = {};
        nodes.forEach(node => {
            const vendor = node.vendor || 'unknown';
            summary[vendor] = (summary[vendor] || 0) + 1;
        });
        return summary;
    }

    getDiscoveryMethodSummary(nodes) {
        const summary = {};
        nodes.forEach(node => {
            summary[node.discoveryMethod] = (summary[node.discoveryMethod] || 0) + 1;
        });
        return summary;
    }

    // Get discovery progress
    getDiscoveryProgress() {
        return this.discoveryProgress;
    }

    // Get discovered devices
    getDiscoveredDevices() {
        return Array.from(this.discoveredDevices.values());
    }

    // Get neighbor relationships
    getNeighborRelationships() {
        return Array.from(this.neighborRelationships.entries());
    }

    // Get MAC address mappings
    getMacAddressMappings() {
        return Array.from(this.macAddressMappings.entries());
    }

    // Get interface connections
    getInterfaceConnections() {
        return Array.from(this.interfaceConnections.entries());
    }
}

module.exports = AdvancedNetworkDiscovery;