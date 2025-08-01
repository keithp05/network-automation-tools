const https = require('https');
const http = require('http');

class PaloAltoAPI {
    constructor() {
        this.name = 'Palo Alto Networks PAN-OS API';
        this.defaultPort = 443;
        this.apiKey = null;
    }

    // PAN-OS XML API client
    async connect(host, credentials) {
        this.host = host;
        this.port = credentials.port || this.defaultPort;
        this.username = credentials.username;
        this.password = credentials.password;
        this.protocol = credentials.protocol || 'https';
        
        this.baseUrl = `${this.protocol}://${this.host}:${this.port}/api/`;
        
        try {
            // Authenticate and get API key
            await this.authenticate();
            
            // Get system info to verify connection
            const systemInfo = await this.getSystemInfo();
            
            return {
                success: true,
                message: 'Connected to PAN-OS successfully',
                version: systemInfo.version || 'Unknown',
                model: systemInfo.model || 'Unknown'
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
            const params = new URLSearchParams({
                type: 'keygen',
                user: this.username,
                password: this.password
            });

            const options = {
                hostname: this.host,
                port: this.port,
                path: `/api/?${params.toString()}`,
                method: 'GET',
                rejectUnauthorized: false
            };

            const client = this.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = this.parseXMLResponse(data);
                        if (response.status === 'success' && response.result?.key) {
                            this.apiKey = response.result.key;
                            resolve();
                        } else {
                            reject(new Error(`Authentication failed: ${response.message || 'Invalid credentials'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Authentication failed: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    async apiRequest(type, action, xpath = null, element = null, cmd = null) {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams({
                type: type,
                key: this.apiKey
            });

            if (action) params.append('action', action);
            if (xpath) params.append('xpath', xpath);
            if (element) params.append('element', element);
            if (cmd) params.append('cmd', cmd);

            const options = {
                hostname: this.host,
                port: this.port,
                path: `/api/?${params.toString()}`,
                method: 'GET',
                rejectUnauthorized: false
            };

            const client = this.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = this.parseXMLResponse(data);
                        if (response.status === 'success') {
                            resolve(response.result);
                        } else {
                            reject(new Error(`API request failed: ${response.message || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Invalid XML response: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    // System information methods
    async getSystemInfo() {
        try {
            const result = await this.apiRequest('op', null, null, null, '<show><system><info></info></system></show>');
            
            return {
                hostname: result.system?.hostname || 'Unknown',
                ip: result.system?.['ip-address'] || 'Unknown',
                model: result.system?.model || 'Unknown',
                version: result.system?.['sw-version'] || 'Unknown',
                serial: result.system?.serial || 'Unknown',
                uptime: result.system?.uptime || 'Unknown',
                family: result.system?.family || 'Unknown'
            };
        } catch (error) {
            throw new Error(`Failed to get system info: ${error.message}`);
        }
    }

    async getInterfaces() {
        try {
            const result = await this.apiRequest('op', null, null, null, '<show><interface>all</interface></show>');
            
            const interfaces = [];
            if (result.ifnet?.entry) {
                const entries = Array.isArray(result.ifnet.entry) ? result.ifnet.entry : [result.ifnet.entry];
                
                entries.forEach(intf => {
                    interfaces.push({
                        name: intf.name || 'Unknown',
                        zone: intf.zone || 'Unknown',
                        ip: intf.ip || null,
                        tag: intf.tag || null,
                        state: intf.state || 'Unknown',
                        mac: intf.mac || null,
                        speed: intf.speed || null,
                        duplex: intf.duplex || null
                    });
                });
            }

            return interfaces;
        } catch (error) {
            throw new Error(`Failed to get interfaces: ${error.message}`);
        }
    }

    async getRoutingTable() {
        try {
            const result = await this.apiRequest('op', null, null, null, '<show><routing><route></route></routing></show>');
            
            const routes = [];
            if (result.entry) {
                const entries = Array.isArray(result.entry) ? result.entry : [result.entry];
                
                entries.forEach(route => {
                    routes.push({
                        destination: route.destination || 'Unknown',
                        nexthop: route.nexthop || null,
                        interface: route.interface || null,
                        metric: route.metric || 0,
                        flags: route.flags || null,
                        age: route.age || null
                    });
                });
            }

            return routes;
        } catch (error) {
            throw new Error(`Failed to get routing table: ${error.message}`);
        }
    }

    async getSecurityPolicies() {
        try {
            const result = await this.apiRequest('config', 'get', '/config/devices/entry[@name=\'localhost.localdomain\']/vsys/entry[@name=\'vsys1\']/rulebase/security');
            
            const policies = [];
            if (result.security?.rules?.entry) {
                const entries = Array.isArray(result.security.rules.entry) ? result.security.rules.entry : [result.security.rules.entry];
                
                entries.forEach(policy => {
                    policies.push({
                        name: policy['@name'] || 'Unknown',
                        from: policy.from?.member || [],
                        to: policy.to?.member || [],
                        source: policy.source?.member || [],
                        destination: policy.destination?.member || [],
                        application: policy.application?.member || [],
                        service: policy.service?.member || [],
                        action: policy.action || 'Unknown',
                        disabled: policy.disabled === 'yes'
                    });
                });
            }

            return policies;
        } catch (error) {
            throw new Error(`Failed to get security policies: ${error.message}`);
        }
    }

    async getNATRules() {
        try {
            const result = await this.apiRequest('config', 'get', '/config/devices/entry[@name=\'localhost.localdomain\']/vsys/entry[@name=\'vsys1\']/rulebase/nat');
            
            const natRules = [];
            if (result.nat?.rules?.entry) {
                const entries = Array.isArray(result.nat.rules.entry) ? result.nat.rules.entry : [result.nat.rules.entry];
                
                entries.forEach(rule => {
                    natRules.push({
                        name: rule['@name'] || 'Unknown',
                        from: rule.from?.member || [],
                        to: rule.to?.member || [],
                        source: rule.source?.member || [],
                        destination: rule.destination?.member || [],
                        service: rule.service || 'any',
                        sourceTranslation: rule['source-translation'] || null,
                        destinationTranslation: rule['destination-translation'] || null,
                        disabled: rule.disabled === 'yes'
                    });
                });
            }

            return natRules;
        } catch (error) {
            throw new Error(`Failed to get NAT rules: ${error.message}`);
        }
    }

    async getZones() {
        try {
            const result = await this.apiRequest('config', 'get', '/config/devices/entry[@name=\'localhost.localdomain\']/vsys/entry[@name=\'vsys1\']/zone');
            
            const zones = [];
            if (result.entry) {
                const entries = Array.isArray(result.entry) ? result.entry : [result.entry];
                
                entries.forEach(zone => {
                    zones.push({
                        name: zone['@name'] || 'Unknown',
                        interfaces: zone.network?.layer3?.member || [],
                        protection: zone['enable-user-identification'] === 'yes'
                    });
                });
            }

            return zones;
        } catch (error) {
            throw new Error(`Failed to get zones: ${error.message}`);
        }
    }

    async getAddressObjects() {
        try {
            const result = await this.apiRequest('config', 'get', '/config/devices/entry[@name=\'localhost.localdomain\']/vsys/entry[@name=\'vsys1\']/address');
            
            const addresses = [];
            if (result.entry) {
                const entries = Array.isArray(result.entry) ? result.entry : [result.entry];
                
                entries.forEach(addr => {
                    addresses.push({
                        name: addr['@name'] || 'Unknown',
                        type: Object.keys(addr).find(key => ['ip-netmask', 'ip-range', 'fqdn'].includes(key)) || 'unknown',
                        value: addr['ip-netmask'] || addr['ip-range'] || addr.fqdn || 'Unknown',
                        description: addr.description || ''
                    });
                });
            }

            return addresses;
        } catch (error) {
            throw new Error(`Failed to get address objects: ${error.message}`);
        }
    }

    async getServiceObjects() {
        try {
            const result = await this.apiRequest('config', 'get', '/config/devices/entry[@name=\'localhost.localdomain\']/vsys/entry[@name=\'vsys1\']/service');
            
            const services = [];
            if (result.entry) {
                const entries = Array.isArray(result.entry) ? result.entry : [result.entry];
                
                entries.forEach(service => {
                    services.push({
                        name: service['@name'] || 'Unknown',
                        protocol: service.protocol ? Object.keys(service.protocol)[0] : 'unknown',
                        port: service.protocol?.tcp?.port || service.protocol?.udp?.port || 'Unknown',
                        description: service.description || ''
                    });
                });
            }

            return services;
        } catch (error) {
            throw new Error(`Failed to get service objects: ${error.message}`);
        }
    }

    // Configuration methods
    async createAddressObject(name, type, value, description = '') {
        const element = `<entry name="${name}"><${type}>${value}</${type}><description>${description}</description></entry>`;
        
        try {
            await this.apiRequest('config', 'set', 
                `/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/address/entry[@name='${name}']`,
                element
            );
            
            return {
                success: true,
                message: 'Address object created successfully'
            };
        } catch (error) {
            throw new Error(`Failed to create address object: ${error.message}`);
        }
    }

    async createSecurityPolicy(policyData) {
        const element = this.buildSecurityPolicyXML(policyData);
        
        try {
            await this.apiRequest('config', 'set',
                `/config/devices/entry[@name='localhost.localdomain']/vsys/entry[@name='vsys1']/rulebase/security/rules/entry[@name='${policyData.name}']`,
                element
            );
            
            return {
                success: true,
                message: 'Security policy created successfully'
            };
        } catch (error) {
            throw new Error(`Failed to create security policy: ${error.message}`);
        }
    }

    async commit() {
        try {
            const result = await this.apiRequest('commit', null, null, null, '<commit></commit>');
            
            return {
                success: true,
                message: 'Configuration committed successfully',
                jobId: result.job || null
            };
        } catch (error) {
            throw new Error(`Failed to commit configuration: ${error.message}`);
        }
    }

    async getCommitStatus(jobId) {
        try {
            const result = await this.apiRequest('op', null, null, null, `<show><jobs><id>${jobId}</id></jobs></show>`);
            
            return {
                id: jobId,
                status: result.job?.status || 'unknown',
                progress: result.job?.progress || 0,
                result: result.job?.result || 'unknown'
            };
        } catch (error) {
            throw new Error(`Failed to get commit status: ${error.message}`);
        }
    }

    async backup() {
        try {
            // Export configuration
            const result = await this.apiRequest('export', null, null, null, '<export><configuration><from>running-config.xml</from></configuration></export>');
            
            return {
                success: true,
                config: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to backup configuration: ${error.message}`);
        }
    }

    // Helper methods
    buildSecurityPolicyXML(policyData) {
        let xml = `<entry name="${policyData.name}">`;
        
        if (policyData.from) {
            xml += '<from>';
            policyData.from.forEach(zone => xml += `<member>${zone}</member>`);
            xml += '</from>';
        }
        
        if (policyData.to) {
            xml += '<to>';
            policyData.to.forEach(zone => xml += `<member>${zone}</member>`);
            xml += '</to>';
        }
        
        if (policyData.source) {
            xml += '<source>';
            policyData.source.forEach(src => xml += `<member>${src}</member>`);
            xml += '</source>';
        }
        
        if (policyData.destination) {
            xml += '<destination>';
            policyData.destination.forEach(dst => xml += `<member>${dst}</member>`);
            xml += '</destination>';
        }
        
        if (policyData.application) {
            xml += '<application>';
            policyData.application.forEach(app => xml += `<member>${app}</member>`);
            xml += '</application>';
        }
        
        if (policyData.service) {
            xml += '<service>';
            policyData.service.forEach(svc => xml += `<member>${svc}</member>`);
            xml += '</service>';
        }
        
        xml += `<action>${policyData.action || 'allow'}</action>`;
        xml += '</entry>';
        
        return xml;
    }

    parseXMLResponse(xmlData) {
        // Simple XML parsing for PAN-OS responses
        // In production, consider using a proper XML parser like xml2js
        const statusMatch = xmlData.match(/<response\s+status=['"]([^'"]+)['"]/);
        const status = statusMatch ? statusMatch[1] : 'unknown';
        
        if (status === 'success') {
            // Extract result content
            const resultMatch = xmlData.match(/<result>(.*?)<\/result>/s);
            if (resultMatch) {
                const resultContent = resultMatch[1];
                
                // Parse key for authentication
                const keyMatch = resultContent.match(/<key>([^<]+)<\/key>/);
                if (keyMatch) {
                    return { status: 'success', result: { key: keyMatch[1] } };
                }
                
                // For other responses, return parsed content
                return { status: 'success', result: this.parseResultContent(resultContent) };
            }
            
            return { status: 'success', result: {} };
        } else {
            const msgMatch = xmlData.match(/<msg>(.*?)<\/msg>/s);
            const message = msgMatch ? msgMatch[1] : 'Unknown error';
            return { status: 'error', message: message };
        }
    }

    parseResultContent(content) {
        // Simple content parsing - in production use proper XML parser
        const result = {};
        
        // Parse system info
        const systemMatch = content.match(/<system>(.*?)<\/system>/s);
        if (systemMatch) {
            const systemContent = systemMatch[1];
            result.system = {};
            
            const fields = ['hostname', 'ip-address', 'model', 'sw-version', 'serial', 'uptime', 'family'];
            fields.forEach(field => {
                const regex = new RegExp(`<${field}>([^<]+)</${field}>`);
                const match = systemContent.match(regex);
                if (match) result.system[field] = match[1];
            });
        }
        
        return result;
    }

    disconnect() {
        // No persistent connection to close for REST API
        this.apiKey = null;
        console.log('Disconnected from PAN-OS API');
    }
}

module.exports = PaloAltoAPI;