const https = require('https');
const http = require('http');

class AristaAPI {
    constructor() {
        this.name = 'Arista eAPI';
        this.defaultPort = 443;
        this.defaultUsername = 'admin';
    }

    // Arista eAPI (JSON-RPC) client
    async connect(host, credentials) {
        this.host = host;
        this.port = credentials.port || this.defaultPort;
        this.username = credentials.username;
        this.password = credentials.password;
        this.protocol = credentials.protocol || 'https';
        
        const baseUrl = `${this.protocol}://${this.host}:${this.port}`;
        this.apiUrl = `${baseUrl}/command-api`;
        
        try {
            // Test connection with a simple command
            const result = await this.executeCommands(['show version']);
            return {
                success: true,
                message: 'Connected to Arista eAPI successfully',
                version: result[0]?.version || 'Unknown'
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to connect: ${error.message}`
            };
        }
    }

    async executeCommands(commands, format = 'json') {
        const payload = {
            jsonrpc: '2.0',
            method: 'runCmds',
            params: {
                version: 1,
                cmds: commands,
                format: format
            },
            id: Date.now()
        };

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
            
            const options = {
                hostname: this.host,
                port: this.port,
                path: '/command-api',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length,
                    'Authorization': `Basic ${auth}`
                },
                rejectUnauthorized: false // For self-signed certificates
            };

            const client = this.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.error) {
                            reject(new Error(response.error.message));
                        } else {
                            resolve(response.result);
                        }
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    // Device information methods
    async getDeviceInfo() {
        try {
            const results = await this.executeCommands([
                'show version',
                'show hostname',
                'show inventory'
            ]);

            return {
                hostname: results[1]?.hostname || 'Unknown',
                version: results[0]?.version || 'Unknown',
                model: results[0]?.modelName || 'Unknown',
                serialNumber: results[0]?.serialNumber || 'Unknown',
                systemMac: results[0]?.systemMacAddress || 'Unknown',
                uptime: results[0]?.bootupTimestamp || 'Unknown'
            };
        } catch (error) {
            throw new Error(`Failed to get device info: ${error.message}`);
        }
    }

    async getInterfaces() {
        try {
            const results = await this.executeCommands([
                'show interfaces',
                'show interfaces status'
            ]);

            const interfaces = [];
            if (results[0]?.interfaces) {
                for (const [name, data] of Object.entries(results[0].interfaces)) {
                    interfaces.push({
                        name: name,
                        description: data.description || '',
                        status: data.interfaceStatus || 'unknown',
                        protocol: data.lineProtocolStatus || 'unknown',
                        ipAddress: data.interfaceAddress?.[0]?.primaryIp?.address || null,
                        macAddress: data.physicalAddress || null,
                        mtu: data.mtu || null,
                        bandwidth: data.bandwidth || null
                    });
                }
            }

            return interfaces;
        } catch (error) {
            throw new Error(`Failed to get interfaces: ${error.message}`);
        }
    }

    async getVlans() {
        try {
            const results = await this.executeCommands(['show vlan']);
            const vlans = [];

            if (results[0]?.vlans) {
                for (const [id, data] of Object.entries(results[0].vlans)) {
                    vlans.push({
                        id: id,
                        name: data.name || `VLAN${id}`,
                        status: data.status || 'unknown',
                        interfaces: data.interfaces || []
                    });
                }
            }

            return vlans;
        } catch (error) {
            throw new Error(`Failed to get VLANs: ${error.message}`);
        }
    }

    async getRoutingTable() {
        try {
            const results = await this.executeCommands(['show ip route']);
            const routes = [];

            if (results[0]?.vrfs?.default?.routes) {
                for (const [network, data] of Object.entries(results[0].vrfs.default.routes)) {
                    routes.push({
                        network: network,
                        nextHop: data.vias?.[0]?.nexthopAddr || 'local',
                        interface: data.vias?.[0]?.interface || null,
                        protocol: data.routeType || 'unknown',
                        metric: data.metric || 0
                    });
                }
            }

            return routes;
        } catch (error) {
            throw new Error(`Failed to get routing table: ${error.message}`);
        }
    }

    async getLldpNeighbors() {
        try {
            const results = await this.executeCommands(['show lldp neighbors detail']);
            const neighbors = [];

            if (results[0]?.lldpNeighbors) {
                for (const neighbor of results[0].lldpNeighbors) {
                    neighbors.push({
                        localInterface: neighbor.port || 'unknown',
                        remoteDevice: neighbor.neighborDevice || 'unknown',
                        remoteInterface: neighbor.neighborPort || 'unknown',
                        remoteDescription: neighbor.systemDescription || '',
                        protocol: 'LLDP'
                    });
                }
            }

            return neighbors;
        } catch (error) {
            throw new Error(`Failed to get LLDP neighbors: ${error.message}`);
        }
    }

    async getMacTable() {
        try {
            const results = await this.executeCommands(['show mac address-table']);
            const macTable = [];

            if (results[0]?.unicastTable?.tableEntries) {
                for (const entry of results[0].unicastTable.tableEntries) {
                    macTable.push({
                        macAddress: entry.macAddress || 'unknown',
                        vlan: entry.vlanId || 0,
                        interface: entry.interface || 'unknown',
                        type: entry.entryType || 'unknown'
                    });
                }
            }

            return macTable;
        } catch (error) {
            throw new Error(`Failed to get MAC table: ${error.message}`);
        }
    }

    // Configuration methods
    async configureInterface(interfaceName, config) {
        const commands = [
            'enable',
            'configure terminal',
            `interface ${interfaceName}`
        ];

        if (config.description) {
            commands.push(`description ${config.description}`);
        }
        if (config.ipAddress && config.netmask) {
            commands.push(`ip address ${config.ipAddress} ${config.netmask}`);
        }
        if (config.vlan) {
            commands.push(`switchport access vlan ${config.vlan}`);
        }
        if (config.shutdown === false) {
            commands.push('no shutdown');
        } else if (config.shutdown === true) {
            commands.push('shutdown');
        }

        commands.push('exit', 'write memory');

        try {
            await this.executeCommands(commands);
            return { success: true, message: 'Interface configured successfully' };
        } catch (error) {
            throw new Error(`Failed to configure interface: ${error.message}`);
        }
    }

    async createVlan(vlanId, name) {
        const commands = [
            'enable',
            'configure terminal',
            `vlan ${vlanId}`,
            `name ${name}`,
            'exit',
            'write memory'
        ];

        try {
            await this.executeCommands(commands);
            return { success: true, message: 'VLAN created successfully' };
        } catch (error) {
            throw new Error(`Failed to create VLAN: ${error.message}`);
        }
    }

    async backup() {
        try {
            const results = await this.executeCommands(['show running-config']);
            return {
                success: true,
                config: results[0]?.output || results[0],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to backup configuration: ${error.message}`);
        }
    }

    disconnect() {
        // No persistent connection to close for REST API
        console.log('Disconnected from Arista eAPI');
    }
}

module.exports = AristaAPI;