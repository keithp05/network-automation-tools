const https = require('https');
const http = require('http');

class FirepowerAPI {
    constructor() {
        this.name = 'Cisco Firepower Management Center API';
        this.defaultPort = 443;
        this.apiVersion = 'v1';
        this.authToken = null;
        this.refreshToken = null;
        this.domains = null;
    }

    // Firepower Management Center REST API client
    async connect(host, credentials) {
        this.host = host;
        this.port = credentials.port || this.defaultPort;
        this.username = credentials.username;
        this.password = credentials.password;
        this.protocol = credentials.protocol || 'https';
        
        this.baseUrl = `${this.protocol}://${this.host}:${this.port}/api/fmc_config/${this.apiVersion}`;
        
        try {
            // Authenticate and get access token
            await this.authenticate();
            await this.getDomains();
            
            return {
                success: true,
                message: 'Connected to Firepower Management Center successfully',
                domains: this.domains?.length || 0
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
            const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
            
            const options = {
                hostname: this.host,
                port: this.port,
                path: '/api/fmc_platform/v1/auth/generatetoken',
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                rejectUnauthorized: false
            };

            const client = this.protocol === 'https' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 204) {
                        this.authToken = res.headers['x-auth-access-token'];
                        this.refreshToken = res.headers['x-auth-refresh-token'];
                        resolve();
                    } else {
                        reject(new Error(`Authentication failed: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
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
                    'X-auth-access-token': this.authToken,
                    'Content-Type': 'application/json'
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
                            reject(new Error(`API request failed: ${res.statusCode} - ${response.error?.messages?.[0]?.description || 'Unknown error'}`));
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

    async getDomains() {
        try {
            const response = await this.apiRequest('GET', '/api/fmc_platform/v1/info/domain');
            this.domains = response.items || [];
            this.domainUUID = this.domains[0]?.uuid;
            return this.domains;
        } catch (error) {
            throw new Error(`Failed to get domains: ${error.message}`);
        }
    }

    // Device management methods
    async getDevices() {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/devices/devicerecords`;
            const response = await this.apiRequest('GET', endpoint);
            
            return response.items?.map(device => ({
                id: device.id,
                name: device.name,
                hostName: device.hostName,
                model: device.model,
                sw_version: device.sw_version,
                type: device.type,
                healthStatus: device.healthStatus,
                regStatus: device.regStatus
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get devices: ${error.message}`);
        }
    }

    async getAccessPolicies() {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/policy/accesspolicies`;
            const response = await this.apiRequest('GET', endpoint);
            
            return response.items?.map(policy => ({
                id: policy.id,
                name: policy.name,
                type: policy.type,
                defaultAction: policy.defaultAction?.action
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get access policies: ${error.message}`);
        }
    }

    async getAccessRules(policyId) {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/policy/accesspolicies/${policyId}/accessrules`;
            const response = await this.apiRequest('GET', endpoint);
            
            return response.items?.map(rule => ({
                id: rule.id,
                name: rule.name,
                action: rule.action,
                enabled: rule.enabled,
                sourceNetworks: rule.sourceNetworks,
                destinationNetworks: rule.destinationNetworks,
                sourcePorts: rule.sourcePorts,
                destinationPorts: rule.destinationPorts
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get access rules: ${error.message}`);
        }
    }

    async getNATRules() {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/policy/ftdnatpolicies`;
            const response = await this.apiRequest('GET', endpoint);
            
            return response.items?.map(policy => ({
                id: policy.id,
                name: policy.name,
                type: policy.type
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get NAT policies: ${error.message}`);
        }
    }

    async getNetworkObjects() {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/object/networks`;
            const response = await this.apiRequest('GET', endpoint);
            
            return response.items?.map(obj => ({
                id: obj.id,
                name: obj.name,
                type: obj.type,
                value: obj.value,
                description: obj.description
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get network objects: ${error.message}`);
        }
    }

    async getPortObjects() {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/object/ports`;
            const response = await this.apiRequest('GET', endpoint);
            
            return response.items?.map(obj => ({
                id: obj.id,
                name: obj.name,
                type: obj.type,
                port: obj.port,
                protocol: obj.protocol
            })) || [];
        } catch (error) {
            throw new Error(`Failed to get port objects: ${error.message}`);
        }
    }

    // Configuration methods
    async createNetworkObject(name, type, value, description = '') {
        const data = {
            name: name,
            type: type,
            value: value,
            description: description
        };

        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/object/networks`;
            const response = await this.apiRequest('POST', endpoint, data);
            return {
                success: true,
                message: 'Network object created successfully',
                id: response.id
            };
        } catch (error) {
            throw new Error(`Failed to create network object: ${error.message}`);
        }
    }

    async createAccessRule(policyId, ruleData) {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/policy/accesspolicies/${policyId}/accessrules`;
            const response = await this.apiRequest('POST', endpoint, ruleData);
            return {
                success: true,
                message: 'Access rule created successfully',
                id: response.id
            };
        } catch (error) {
            throw new Error(`Failed to create access rule: ${error.message}`);
        }
    }

    async deployChanges(deviceId) {
        const data = {
            type: "DeploymentRequest",
            version: Date.now().toString(),
            forceDeploy: false,
            ignoreWarning: true,
            deviceList: [deviceId]
        };

        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/deployment/deploymentrequests`;
            const response = await this.apiRequest('POST', endpoint, data);
            return {
                success: true,
                message: 'Deployment initiated successfully',
                taskId: response.id
            };
        } catch (error) {
            throw new Error(`Failed to deploy changes: ${error.message}`);
        }
    }

    async getDeploymentStatus(taskId) {
        try {
            const endpoint = `${this.baseUrl}/domain/${this.domainUUID}/deployment/deploymentrequests/${taskId}`;
            const response = await this.apiRequest('GET', endpoint);
            return {
                id: response.id,
                state: response.state,
                deviceList: response.deviceList
            };
        } catch (error) {
            throw new Error(`Failed to get deployment status: ${error.message}`);
        }
    }

    async backup() {
        try {
            // Get all important configuration data
            const [devices, policies, networkObjects, portObjects] = await Promise.all([
                this.getDevices(),
                this.getAccessPolicies(),
                this.getNetworkObjects(),
                this.getPortObjects()
            ]);

            return {
                success: true,
                backup: {
                    devices,
                    policies,
                    networkObjects,
                    portObjects
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to backup configuration: ${error.message}`);
        }
    }

    disconnect() {
        // Logout from FMC API
        if (this.authToken) {
            this.apiRequest('POST', '/api/fmc_platform/v1/auth/revokeaccess')
                .catch(error => console.log('Logout error:', error.message));
        }
        this.authToken = null;
        this.refreshToken = null;
        console.log('Disconnected from Firepower Management Center');
    }
}

module.exports = FirepowerAPI;