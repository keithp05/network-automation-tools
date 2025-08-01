const https = require('https');
const http = require('http');

class FortiGateAPI {
    constructor() {
        this.name = 'FortiGate FortiOS API';
        this.defaultPort = 443;
        this.authToken = null;
        this.csrfToken = null;
    }

    // FortiOS REST API client
    async connect(host, credentials) {
        this.host = host;
        this.port = credentials.port || this.defaultPort;
        this.username = credentials.username;
        this.password = credentials.password;
        this.protocol = credentials.protocol || 'https';
        
        this.baseUrl = `${this.protocol}://${this.host}:${this.port}/api/v2`;
        
        try {
            // Authenticate and get access token
            await this.authenticate();
            
            // Get system status to verify connection
            const systemInfo = await this.getSystemStatus();
            
            return {
                success: true,
                message: 'Connected to FortiGate successfully',
                version: systemInfo.version || 'Unknown',
                model: systemInfo.model || 'Unknown',
                hostname: systemInfo.hostname || 'Unknown'
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to connect: ${error.message}`
            };
        }
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                username: this.username,
                secretkey: this.password
            });
            
            const options = {
                hostname: this.host,
                port: this.port,
                path: '/logincheck',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length
                },
                rejectUnauthorized: false
            };

            const client = this.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const cookies = res.headers['set-cookie'];
                    if (cookies) {
                        // Extract session cookies
                        cookies.forEach(cookie => {
                            if (cookie.includes('ccsrftoken=')) {
                                this.csrfToken = cookie.split('ccsrftoken=')[1].split(';')[0];
                            }
                            if (cookie.includes('APSCOOKIE_')) {
                                this.authToken = cookie.split('=')[1].split(';')[0];
                            }
                        });
                        
                        if (this.csrfToken) {
                            resolve();
                        } else {
                            reject(new Error('Authentication failed: No CSRF token received'));
                        }
                    } else {
                        reject(new Error('Authentication failed: No cookies received'));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    async apiRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const postData = data ? JSON.stringify(data) : null;
            
            const options = {
                hostname: this.host,
                port: this.port,
                path: endpoint,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFTOKEN': this.csrfToken,
                    'Cookie': `ccsrftoken=${this.csrfToken}`
                },
                rejectUnauthorized: false
            };

            if (postData) {
                options.headers['Content-Length'] = postData.length;
            }

            const client = this.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = responseData ? JSON.parse(responseData) : {};
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`API request failed: ${res.statusCode} - ${response.error || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    // System information methods
    async getSystemStatus() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/monitor/system/status`);
            
            return {
                hostname: response.results?.hostname || 'Unknown',
                version: response.results?.version || 'Unknown',
                model: response.results?.model || 'Unknown',
                serial: response.results?.serial || 'Unknown',
                uptime: response.results?.uptime || 'Unknown',
                cpu_usage: response.results?.cpu || 0,
                memory_usage: response.results?.memory || 0
            };
        } catch (error) {
            throw new Error(`Failed to get system status: ${error.message}`);
        }
    }

    async getInterfaces() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/system/interface`);
            
            return response.results?.map(intf => ({
                name: intf.name || 'Unknown',
                type: intf.type || 'Unknown',
                ip: intf.ip || null,
                description: intf.description || '',
                status: intf.status || 'Unknown',
                speed: intf.speed || null,
                duplex: intf.duplex || null,
                vdom: intf.vdom || 'root',
                zone: intf.interface || null
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get interfaces: ${error.message}`);
        }
    }

    async getRoutingTable() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/monitor/router/ipv4`);
            
            return response.results?.map(route => ({
                destination: route.ip_mask || 'Unknown',
                gateway: route.gateway || null,
                interface: route.interface || null,
                distance: route.distance || 0,
                metric: route.metric || 0,
                type: route.type || 'Unknown'
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get routing table: ${error.message}`);
        }
    }

    async getFirewallPolicies() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/firewall/policy`);
            
            return response.results?.map(policy => ({
                id: policy.policyid || 0,
                name: policy.name || `Policy_${policy.policyid}`,
                srcintf: policy.srcintf || [],
                dstintf: policy.dstintf || [],
                srcaddr: policy.srcaddr || [],
                dstaddr: policy.dstaddr || [],
                service: policy.service || [],
                action: policy.action || 'Unknown',
                status: policy.status || 'Unknown',
                comments: policy.comments || ''
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get firewall policies: ${error.message}`);
        }
    }

    async getVIPs() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/firewall/vip`);
            
            return response.results?.map(vip => ({
                name: vip.name || 'Unknown',
                extip: vip.extip || 'Unknown',
                extintf: vip.extintf || 'Unknown',
                mappedip: vip.mappedip || [],
                extport: vip.extport || 'Unknown',
                mappedport: vip.mappedport || 'Unknown',
                protocol: vip.protocol || 'Unknown',
                comment: vip.comment || ''
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get VIPs: ${error.message}`);
        }
    }

    async getAddressObjects() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/firewall/address`);
            
            return response.results?.map(addr => ({
                name: addr.name || 'Unknown',
                type: addr.type || 'Unknown',
                subnet: addr.subnet || null,
                range: addr['start-ip'] && addr['end-ip'] ? `${addr['start-ip']}-${addr['end-ip']}` : null,
                fqdn: addr.fqdn || null,
                comment: addr.comment || ''
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get address objects: ${error.message}`);
        }
    }

    async getServiceObjects() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/firewall/service/custom`);
            
            return response.results?.map(service => ({
                name: service.name || 'Unknown',
                protocol: service.protocol || 'Unknown',
                tcp_portrange: service['tcp-portrange'] || null,
                udp_portrange: service['udp-portrange'] || null,
                icmptype: service.icmptype || null,
                comment: service.comment || ''
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get service objects: ${error.message}`);
        }
    }

    async getVDOMs() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/system/vdom`);
            
            return response.results?.map(vdom => ({
                name: vdom.name || 'Unknown',
                status: vdom.status || 'Unknown'
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get VDOMs: ${error.message}`);
        }
    }

    async getZones() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/cmdb/system/zone`);
            
            return response.results?.map(zone => ({
                name: zone.name || 'Unknown',
                interfaces: zone.interface || [],
                description: zone.description || ''
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get zones: ${error.message}`);
        }
    }

    // Configuration methods
    async createAddressObject(name, type, value, comment = '') {
        let data = {
            name: name,
            type: type,
            comment: comment
        };

        switch (type) {
            case 'ipmask':
                data.subnet = value;
                break;
            case 'iprange':
                const [start, end] = value.split('-');
                data['start-ip'] = start;
                data['end-ip'] = end;
                break;
            case 'fqdn':
                data.fqdn = value;
                break;
        }

        try {
            const response = await this.apiRequest('POST', `${this.baseUrl}/cmdb/firewall/address`, data);
            return {
                success: true,
                message: 'Address object created successfully',
                name: name
            };
        } catch (error) {
            throw new Error(`Failed to create address object: ${error.message}`);
        }
    }

    async createFirewallPolicy(policyData) {
        try {
            const response = await this.apiRequest('POST', `${this.baseUrl}/cmdb/firewall/policy`, policyData);
            return {
                success: true,
                message: 'Firewall policy created successfully',
                id: response.mkey || null
            };
        } catch (error) {
            throw new Error(`Failed to create firewall policy: ${error.message}`);
        }
    }

    async createVIP(vipData) {
        try {
            const response = await this.apiRequest('POST', `${this.baseUrl}/cmdb/firewall/vip`, vipData);
            return {
                success: true,
                message: 'VIP created successfully',
                name: vipData.name
            };
        } catch (error) {
            throw new Error(`Failed to create VIP: ${error.message}`);
        }
    }

    // Monitoring methods
    async getSystemPerformance() {
        try {
            const [cpu, memory, sessions] = await Promise.all([
                this.apiRequest('GET', `${this.baseUrl}/monitor/system/resource/usage`),
                this.apiRequest('GET', `${this.baseUrl}/monitor/system/resource/usage`),
                this.apiRequest('GET', `${this.baseUrl}/monitor/firewall/session`)
            ]);

            return {
                cpu_usage: cpu.results?.cpu || 0,
                memory_usage: memory.results?.memory || 0,
                session_count: sessions.results?.length || 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to get system performance: ${error.message}`);
        }
    }

    async getActiveSessions() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/monitor/firewall/session`);
            
            return response.results?.map(session => ({
                id: session.sessionid || 0,
                source: session.source || 'Unknown',
                destination: session.destination || 'Unknown',
                protocol: session.proto || 'Unknown',
                policy: session.policyid || 0,
                bytes: session.bytes || 0,
                duration: session.duration || 0
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get active sessions: ${error.message}`);
        }
    }

    async getThreatLog(count = 100) {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/monitor/log/virus?count=${count}`);
            
            return response.results?.map(log => ({
                date: log.date || 'Unknown',
                time: log.time || 'Unknown',
                source: log.srcip || 'Unknown',
                destination: log.dstip || 'Unknown',
                threat: log.virus || 'Unknown',
                action: log.action || 'Unknown',
                severity: log.level || 'Unknown'
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get threat log: ${error.message}`);
        }
    }

    async backup() {
        try {
            // Get configuration backup
            const response = await this.apiRequest('GET', `${this.baseUrl}/monitor/system/config/backup`);
            
            return {
                success: true,
                config: response,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to backup configuration: ${error.message}`);
        }
    }

    async restoreConfig(configData) {
        try {
            const response = await this.apiRequest('POST', `${this.baseUrl}/monitor/system/config/restore`, {
                source: 'upload',
                config: configData
            });
            
            return {
                success: true,
                message: 'Configuration restored successfully'
            };
        } catch (error) {
            throw new Error(`Failed to restore configuration: ${error.message}`);
        }
    }

    // HA (High Availability) methods
    async getHAStatus() {
        try {
            const response = await this.apiRequest('GET', `${this.baseUrl}/monitor/system/ha-peer`);
            
            return {
                ha_mode: response.results?.mode || 'standalone',
                primary: response.results?.primary || null,
                secondary: response.results?.secondary || null,
                sync_status: response.results?.sync || 'unknown'
            };
        } catch (error) {
            throw new Error(`Failed to get HA status: ${error.message}`);
        }
    }

    disconnect() {
        // Logout from FortiGate
        if (this.csrfToken) {
            this.apiRequest('POST', '/logout')
                .catch(error => console.log('Logout error:', error.message));
        }
        this.authToken = null;
        this.csrfToken = null;
        console.log('Disconnected from FortiGate API');
    }
}

module.exports = FortiGateAPI;