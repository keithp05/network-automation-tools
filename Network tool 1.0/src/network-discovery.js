const { NodeSSH } = require('node-ssh');
const { Client } = require('telnet-client');

class NetworkTopologyDiscovery {
    constructor() {
        this.devices = new Map();
        this.topology = {
            nodes: [],
            links: [],
            subnets: [],
            vlans: new Map()
        };
        this.macAddressTables = new Map();
        this.routingTables = new Map();
        this.neighborTables = new Map();
        this.snmpCommunity = 'public';
    }

    // Main discovery function
    async discoverNetworkTopology(seedDevices, credentials) {
        console.log('🌐 Starting network topology discovery...');
        
        try {
            // Phase 1: Initial device discovery
            for (const device of seedDevices) {
                await this.discoverDevice(device, credentials);
            }

            // Phase 2: Neighbor discovery via CDP/LLDP
            await this.discoverNeighbors();

            // Phase 3: MAC address table analysis
            await this.analyzeMacTables();

            // Phase 4: Routing table analysis
            await this.analyzeRoutingTables();

            // Phase 5: Build topology map
            this.buildTopologyMap();

            console.log(`✅ Discovery complete: ${this.devices.size} devices, ${this.topology.links.length} links`);
            
            return this.getTopologyData();

        } catch (error) {
            console.error('❌ Discovery error:', error);
            throw error;
        }
    }

    // Discover individual device
    async discoverDevice(deviceInfo, credentials) {
        console.log(`🔍 Discovering device: ${deviceInfo.ip}`);
        
        const device = {
            id: this.generateDeviceId(deviceInfo.ip),
            ip: deviceInfo.ip,
            hostname: '',
            vendor: '',
            model: '',
            version: '',
            interfaces: new Map(),
            neighbors: [],
            macTable: [],
            routingTable: [],
            vlans: [],
            lastDiscovered: new Date().toISOString(),
            status: 'unknown'
        };

        try {
            // Try SSH first, then Telnet
            let connection = null;
            let connectionType = '';

            if (credentials.ssh) {
                connection = await this.connectSSH(deviceInfo.ip, credentials.ssh);
                connectionType = 'ssh';
            } else if (credentials.telnet) {
                connection = await this.connectTelnet(deviceInfo.ip, credentials.telnet);
                connectionType = 'telnet';
            }

            if (connection) {
                device.status = 'connected';
                
                // Detect vendor/platform
                const platformInfo = await this.detectPlatform(connection, connectionType);
                device.vendor = platformInfo.vendor;
                device.model = platformInfo.model;
                device.version = platformInfo.version;
                device.hostname = platformInfo.hostname;

                // Collect device information
                await this.collectDeviceInfo(device, connection, connectionType);
                
                // Disconnect
                if (connectionType === 'ssh') {
                    connection.dispose();
                } else {
                    await connection.end();
                }

                console.log(`✅ Device discovered: ${device.hostname} (${device.vendor})`);
            } else {
                device.status = 'unreachable';
                console.log(`❌ Could not connect to ${deviceInfo.ip}`);
            }

        } catch (error) {
            console.error(`❌ Error discovering ${deviceInfo.ip}:`, error.message);
            device.status = 'error';
            device.error = error.message;
        }

        this.devices.set(device.id, device);
        return device;
    }

    // SSH Connection
    async connectSSH(ip, sshCredentials) {
        const ssh = new NodeSSH();
        
        try {
            await ssh.connect({
                host: ip,
                username: sshCredentials.username,
                password: sshCredentials.password,
                port: sshCredentials.port || 22,
                readyTimeout: 10000,
                algorithms: {
                    kex: ['diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1'],
                    cipher: ['aes128-cbc', '3des-cbc'],
                    hmac: ['hmac-sha1', 'hmac-md5']
                }
            });
            
            return ssh;
        } catch (error) {
            console.log(`SSH connection failed to ${ip}: ${error.message}`);
            return null;
        }
    }

    // Telnet Connection
    async connectTelnet(ip, telnetCredentials) {
        const telnet = new Client();
        
        try {
            await telnet.connect({
                host: ip,
                port: telnetCredentials.port || 23,
                timeout: 10000,
                username: telnetCredentials.username,
                password: telnetCredentials.password,
                loginPrompt: /login[: ]*$/i,
                passwordPrompt: /password[: ]*$/i,
                prompt: /[>#$] *$/
            });
            
            return telnet;
        } catch (error) {
            console.log(`Telnet connection failed to ${ip}: ${error.message}`);
            return null;
        }
    }

    // Detect device platform
    async detectPlatform(connection, connectionType) {
        const platformInfo = {
            vendor: 'unknown',
            model: 'unknown',
            version: 'unknown',
            hostname: 'unknown'
        };

        try {
            let output = '';
            
            if (connectionType === 'ssh') {
                output = await connection.execCommand('show version');
                output = output.stdout;
            } else {
                output = await connection.exec('show version');
            }

            // Parse vendor-specific output
            if (output.includes('Cisco') || output.includes('IOS')) {
                platformInfo.vendor = 'cisco';
                const modelMatch = output.match(/cisco\s+(\S+)/i);
                if (modelMatch) platformInfo.model = modelMatch[1];
                
                const versionMatch = output.match(/Version\s+([^\s,]+)/i);
                if (versionMatch) platformInfo.version = versionMatch[1];
                
                const hostnameMatch = output.match(/(\S+)\s+uptime/i);
                if (hostnameMatch) platformInfo.hostname = hostnameMatch[1];
                
            } else if (output.includes('FortiGate') || output.includes('Fortinet')) {
                platformInfo.vendor = 'fortinet';
                const modelMatch = output.match(/FortiGate-(\S+)/i);
                if (modelMatch) platformInfo.model = 'FortiGate-' + modelMatch[1];
                
            } else if (output.includes('JUNOS') || output.includes('Juniper')) {
                platformInfo.vendor = 'juniper';
                const modelMatch = output.match(/Model:\s+(\S+)/i);
                if (modelMatch) platformInfo.model = modelMatch[1];
                
            } else if (output.includes('Arista')) {
                platformInfo.vendor = 'arista';
                const modelMatch = output.match(/Hardware version:\s+(\S+)/i);
                if (modelMatch) platformInfo.model = modelMatch[1];
            }

        } catch (error) {
            console.error('Error detecting platform:', error.message);
        }

        return platformInfo;
    }

    // Collect comprehensive device information
    async collectDeviceInfo(device, connection, connectionType) {
        try {
            // Collect interfaces
            await this.collectInterfaces(device, connection, connectionType);
            
            // Collect MAC address table
            await this.collectMacTable(device, connection, connectionType);
            
            // Collect routing table
            await this.collectRoutingTable(device, connection, connectionType);
            
            // Collect CDP/LLDP neighbors
            await this.collectNeighbors(device, connection, connectionType);
            
            // Collect VLAN information
            await this.collectVlans(device, connection, connectionType);
            
        } catch (error) {
            console.error(`Error collecting device info for ${device.ip}:`, error.message);
        }
    }

    // Collect interface information
    async collectInterfaces(device, connection, connectionType) {
        try {
            let output = '';
            
            if (device.vendor === 'cisco') {
                if (connectionType === 'ssh') {
                    output = await connection.execCommand('show ip interface brief');
                    output = output.stdout;
                } else {
                    output = await connection.exec('show ip interface brief');
                }
                
                const lines = output.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(\S+)\s+(\S+)\s+\S+\s+\S+\s+(up|down)\s+(up|down)/);
                    if (match) {
                        const [, name, ip, protocol, status] = match;
                        device.interfaces.set(name, {
                            name: name,
                            ip: ip !== 'unassigned' ? ip : null,
                            status: status,
                            protocol: protocol,
                            type: this.getInterfaceType(name)
                        });
                    }
                }
            }
            
            // Add similar parsing for other vendors
            
        } catch (error) {
            console.error('Error collecting interfaces:', error.message);
        }
    }

    // Collect MAC address table
    async collectMacTable(device, connection, connectionType) {
        try {
            let output = '';
            
            if (device.vendor === 'cisco') {
                if (connectionType === 'ssh') {
                    output = await connection.execCommand('show mac address-table');
                    output = output.stdout;
                } else {
                    output = await connection.exec('show mac address-table');
                }
                
                const lines = output.split('\n');
                for (const line of lines) {
                    // Parse: VLAN MAC Address Type Ports
                    const match = line.match(/^\s*(\d+)\s+([0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4})\s+(\w+)\s+(.+)$/i);
                    if (match) {
                        const [, vlan, mac, type, ports] = match;
                        device.macTable.push({
                            vlan: parseInt(vlan),
                            macAddress: mac.toLowerCase(),
                            type: type.toLowerCase(),
                            ports: ports.trim().split(/\s+/),
                            learned: type.toLowerCase() === 'dynamic'
                        });
                    }
                }
            }
            
            this.macAddressTables.set(device.id, device.macTable);
            
        } catch (error) {
            console.error('Error collecting MAC table:', error.message);
        }
    }

    // Collect routing table
    async collectRoutingTable(device, connection, connectionType) {
        try {
            let output = '';
            
            if (device.vendor === 'cisco') {
                if (connectionType === 'ssh') {
                    output = await connection.execCommand('show ip route');
                    output = output.stdout;
                } else {
                    output = await connection.exec('show ip route');
                }
                
                const lines = output.split('\n');
                for (const line of lines) {
                    // Parse various route types
                    const routeMatch = line.match(/^([CSOBRILEDNX\*])\s*(\S+)\s+\[(\d+)\/(\d+)\]\s+via\s+(\S+),?\s*(\S+)?/);
                    if (routeMatch) {
                        const [, type, network, ad, metric, nextHop, intf] = routeMatch;
                        device.routingTable.push({
                            type: this.getRouteType(type),
                            network: network,
                            administrativeDistance: parseInt(ad),
                            metric: parseInt(metric),
                            nextHop: nextHop,
                            interface: intf || '',
                            protocol: this.getProtocolFromType(type)
                        });
                    }
                }
            }
            
            this.routingTables.set(device.id, device.routingTable);
            
        } catch (error) {
            console.error('Error collecting routing table:', error.message);
        }
    }

    // Collect CDP/LLDP neighbors
    async collectNeighbors(device, connection, connectionType) {
        try {
            let output = '';
            
            // Try CDP first
            if (device.vendor === 'cisco') {
                if (connectionType === 'ssh') {
                    output = await connection.execCommand('show cdp neighbors detail');
                    output = output.stdout;
                } else {
                    output = await connection.exec('show cdp neighbors detail');
                }
                
                this.parseCdpNeighbors(device, output);
            }
            
            // Try LLDP as fallback
            try {
                if (connectionType === 'ssh') {
                    output = await connection.execCommand('show lldp neighbors detail');
                    output = output.stdout;
                } else {
                    output = await connection.exec('show lldp neighbors detail');
                }
                
                this.parseLldpNeighbors(device, output);
            } catch (lldpError) {
                // LLDP might not be available
            }
            
            this.neighborTables.set(device.id, device.neighbors);
            
        } catch (error) {
            console.error('Error collecting neighbors:', error.message);
        }
    }

    // Parse CDP neighbors
    parseCdpNeighbors(device, output) {
        const neighbors = [];
        const blocks = output.split('-------------------------');
        
        for (const block of blocks) {
            const neighbor = {};
            
            const deviceIdMatch = block.match(/Device ID:\s*(.+)/);
            if (deviceIdMatch) neighbor.deviceId = deviceIdMatch[1].trim();
            
            const ipMatch = block.match(/IP address:\s*(\S+)/);
            if (ipMatch) neighbor.ip = ipMatch[1];
            
            const platformMatch = block.match(/Platform:\s*(.+?),/);
            if (platformMatch) neighbor.platform = platformMatch[1].trim();
            
            const localInterfaceMatch = block.match(/Interface:\s*(\S+),/);
            if (localInterfaceMatch) neighbor.localInterface = localInterfaceMatch[1];
            
            const remoteInterfaceMatch = block.match(/Port ID \(outgoing port\):\s*(.+)/);
            if (remoteInterfaceMatch) neighbor.remoteInterface = remoteInterfaceMatch[1].trim();
            
            if (neighbor.deviceId) {
                neighbor.protocol = 'CDP';
                neighbor.discoveredBy = device.id;
                neighbors.push(neighbor);
            }
        }
        
        device.neighbors = neighbors;
    }

    // Parse LLDP neighbors
    parseLldpNeighbors(device, output) {
        // Similar parsing logic for LLDP
        const neighbors = [];
        const lines = output.split('\n');
        
        let currentNeighbor = null;
        for (const line of lines) {
            if (line.includes('Local Intf:')) {
                if (currentNeighbor) neighbors.push(currentNeighbor);
                currentNeighbor = { protocol: 'LLDP', discoveredBy: device.id };
                
                const intfMatch = line.match(/Local Intf:\s*(\S+)/);
                if (intfMatch) currentNeighbor.localInterface = intfMatch[1];
            }
            
            if (currentNeighbor) {
                const chassisMatch = line.match(/Chassis id:\s*(.+)/);
                if (chassisMatch) currentNeighbor.chassisId = chassisMatch[1].trim();
                
                const portMatch = line.match(/Port id:\s*(.+)/);
                if (portMatch) currentNeighbor.remoteInterface = portMatch[1].trim();
                
                const sysNameMatch = line.match(/System Name:\s*(.+)/);
                if (sysNameMatch) currentNeighbor.deviceId = sysNameMatch[1].trim();
            }
        }
        
        if (currentNeighbor) neighbors.push(currentNeighbor);
        device.neighbors.push(...neighbors);
    }

    // Collect VLAN information
    async collectVlans(device, connection, connectionType) {
        try {
            let output = '';
            
            if (device.vendor === 'cisco') {
                if (connectionType === 'ssh') {
                    output = await connection.execCommand('show vlan brief');
                    output = output.stdout;
                } else {
                    output = await connection.exec('show vlan brief');
                }
                
                const lines = output.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(\d+)\s+(\S+)\s+(\w+)\s+(.+)$/);
                    if (match) {
                        const [, id, name, status, ports] = match;
                        device.vlans.push({
                            id: parseInt(id),
                            name: name,
                            status: status,
                            ports: ports.trim().split(/[\s,]+/).filter(p => p.length > 0)
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error('Error collecting VLANs:', error.message);
        }
    }

    // Discover additional neighbors
    async discoverNeighbors() {
        console.log('🔗 Discovering neighbor relationships...');
        
        const discoveredIPs = new Set();
        
        // Collect all neighbor IPs
        for (const device of this.devices.values()) {
            for (const neighbor of device.neighbors) {
                if (neighbor.ip && !discoveredIPs.has(neighbor.ip)) {
                    discoveredIPs.add(neighbor.ip);
                    
                    // Check if we already have this device
                    const existingDevice = Array.from(this.devices.values())
                        .find(d => d.ip === neighbor.ip);
                    
                    if (!existingDevice) {
                        console.log(`📡 Found new neighbor: ${neighbor.ip}`);
                        // Add to discovery queue
                    }
                }
            }
        }
    }

    // Analyze MAC address tables for device relationships
    async analyzeMacTables() {
        console.log('🔍 Analyzing MAC address tables...');
        
        // Create MAC to device/port mapping
        const macToLocation = new Map();
        
        for (const [deviceId, macTable] of this.macAddressTables) {
            const device = this.devices.get(deviceId);
            
            for (const entry of macTable) {
                if (entry.learned) {
                    macToLocation.set(entry.macAddress, {
                        deviceId: deviceId,
                        deviceIP: device.ip,
                        ports: entry.ports,
                        vlan: entry.vlan
                    });
                }
            }
        }

        // Find MAC addresses that appear on multiple devices
        this.identifyInterSwitchLinks(macToLocation);
    }

    // Identify inter-switch links from MAC table analysis
    identifyInterSwitchLinks(macToLocation) {
        const portDeviceCounts = new Map();
        
        // Count how many unique MAC addresses each port sees
        for (const [mac, location] of macToLocation) {
            const key = `${location.deviceId}:${location.ports[0]}`;
            if (!portDeviceCounts.has(key)) {
                portDeviceCounts.set(key, new Set());
            }
            portDeviceCounts.get(key).add(mac);
        }

        // Ports with many MACs are likely trunk/uplink ports
        for (const [portKey, macs] of portDeviceCounts) {
            if (macs.size > 10) { // Threshold for trunk port
                const [deviceId, port] = portKey.split(':');
                const device = this.devices.get(deviceId);
                
                console.log(`🔗 Identified potential trunk port: ${device.hostname}:${port} (${macs.size} MACs)`);
                
                // Mark as trunk/uplink
                if (device.interfaces.has(port)) {
                    device.interfaces.get(port).trunkPort = true;
                    device.interfaces.get(port).macCount = macs.size;
                }
            }
        }
    }

    // Analyze routing tables for network paths
    async analyzeRoutingTables() {
        console.log('🛣️ Analyzing routing tables...');
        
        // Build subnet map
        const subnetMap = new Map();
        
        for (const [deviceId, routingTable] of this.routingTables) {
            const device = this.devices.get(deviceId);
            
            for (const route of routingTable) {
                if (route.type === 'connected') {
                    // This is a directly connected subnet
                    if (!subnetMap.has(route.network)) {
                        subnetMap.set(route.network, {
                            network: route.network,
                            connectedDevices: [],
                            type: 'connected'
                        });
                    }
                    
                    subnetMap.get(route.network).connectedDevices.push({
                        deviceId: deviceId,
                        interface: route.interface,
                        ip: device.ip
                    });
                }
            }
        }

        this.topology.subnets = Array.from(subnetMap.values());
    }

    // Build comprehensive topology map
    buildTopologyMap() {
        console.log('🗺️ Building topology map...');
        
        // Create nodes
        this.topology.nodes = Array.from(this.devices.values()).map(device => ({
            id: device.id,
            label: device.hostname || device.ip,
            ip: device.ip,
            vendor: device.vendor,
            model: device.model,
            type: this.getDeviceType(device),
            status: device.status,
            interfaces: Array.from(device.interfaces.values()),
            vlans: device.vlans
        }));

        // Create links from neighbor relationships
        const links = [];
        const processedLinks = new Set();
        
        for (const device of this.devices.values()) {
            for (const neighbor of device.neighbors) {
                // Find the neighbor device
                const neighborDevice = Array.from(this.devices.values())
                    .find(d => d.ip === neighbor.ip || d.hostname === neighbor.deviceId);
                
                if (neighborDevice) {
                    const linkKey = [device.id, neighborDevice.id].sort().join('-');
                    
                    if (!processedLinks.has(linkKey)) {
                        links.push({
                            id: linkKey,
                            source: device.id,
                            target: neighborDevice.id,
                            sourceInterface: neighbor.localInterface,
                            targetInterface: neighbor.remoteInterface,
                            protocol: neighbor.protocol,
                            type: 'neighbor'
                        });
                        
                        processedLinks.add(linkKey);
                    }
                }
            }
        }
        
        this.topology.links = links;
    }

    // Helper functions
    generateDeviceId(ip) {
        return 'device_' + ip.replace(/\./g, '_');
    }

    getInterfaceType(name) {
        if (name.startsWith('Gi') || name.startsWith('GigabitEthernet')) return 'gigabit';
        if (name.startsWith('Fa') || name.startsWith('FastEthernet')) return 'fastethernet';
        if (name.startsWith('Se') || name.startsWith('Serial')) return 'serial';
        if (name.startsWith('Lo') || name.startsWith('Loopback')) return 'loopback';
        if (name.startsWith('Vl') || name.startsWith('Vlan')) return 'vlan';
        return 'unknown';
    }

    getRouteType(type) {
        const types = {
            'C': 'connected',
            'S': 'static',
            'O': 'ospf',
            'B': 'bgp',
            'R': 'rip',
            'I': 'igrp',
            'E': 'eigrp',
            'D': 'eigrp',
            'L': 'local',
            '*': 'default'
        };
        return types[type] || 'unknown';
    }

    getProtocolFromType(type) {
        const protocols = {
            'C': 'connected',
            'S': 'static',
            'O': 'OSPF',
            'B': 'BGP',
            'R': 'RIP',
            'I': 'IGRP',
            'E': 'EIGRP',
            'D': 'EIGRP'
        };
        return protocols[type] || 'unknown';
    }

    getDeviceType(device) {
        // Determine device type based on features
        if (device.neighbors.length > 2 && device.vlans.length > 1) return 'switch';
        if (device.routingTable.some(r => r.type !== 'connected' && r.type !== 'local')) return 'router';
        if (device.vendor === 'fortinet' || device.vendor === 'paloalto' || device.vendor === 'checkpoint') return 'firewall';
        return 'unknown';
    }

    // Get topology data for visualization
    getTopologyData() {
        return {
            devices: Array.from(this.devices.values()),
            topology: this.topology,
            summary: {
                totalDevices: this.devices.size,
                totalLinks: this.topology.links.length,
                totalSubnets: this.topology.subnets.length,
                deviceTypes: this.getDeviceTypeSummary()
            }
        };
    }

    getDeviceTypeSummary() {
        const types = {};
        for (const device of this.devices.values()) {
            const type = this.getDeviceType(device);
            types[type] = (types[type] || 0) + 1;
        }
        return types;
    }

    // Export topology for external tools
    exportTopology(format = 'json') {
        const topology = this.getTopologyData();
        
        if (format === 'graphml') {
            return this.convertToGraphML(topology);
        } else if (format === 'cytoscape') {
            return this.convertToCytoscape(topology);
        }
        
        return JSON.stringify(topology, null, 2);
    }

    // Convert to Cytoscape format for visualization
    convertToCytoscape(topology) {
        const elements = [];
        
        // Add nodes
        topology.topology.nodes.forEach(node => {
            elements.push({
                data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    vendor: node.vendor,
                    ip: node.ip
                },
                position: { x: Math.random() * 800, y: Math.random() * 600 }
            });
        });
        
        // Add edges
        topology.topology.links.forEach(link => {
            elements.push({
                data: {
                    id: link.id,
                    source: link.source,
                    target: link.target,
                    sourceInterface: link.sourceInterface,
                    targetInterface: link.targetInterface,
                    protocol: link.protocol
                }
            });
        });
        
        return { elements };
    }
}

module.exports = NetworkTopologyDiscovery;