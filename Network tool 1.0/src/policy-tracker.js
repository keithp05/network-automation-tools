const fs = require('fs').promises;
const path = require('path');

class FirewallPolicyTracker {
    constructor() {
        this.policies = new Map();
        this.devices = new Map();
        this.changes = [];
        this.alerts = [];
        this.dataPath = path.join(__dirname, '../data');
        this.ensureDataDirectory();
    }

    async ensureDataDirectory() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
        } catch (error) {
            console.error('Error creating data directory:', error);
        }
    }

    // Add or update a firewall device
    async addDevice(deviceInfo) {
        const device = {
            id: deviceInfo.id || this.generateDeviceId(),
            name: deviceInfo.name,
            ip: deviceInfo.ip,
            vendor: deviceInfo.vendor,
            model: deviceInfo.model,
            lastSeen: new Date().toISOString(),
            policies: [],
            interfaces: {},
            status: 'active',
            ...deviceInfo
        };

        this.devices.set(device.id, device);
        
        console.log(`📱 Added device: ${device.name} (${device.ip})`);
        
        // Save to file
        await this.saveDeviceData();
        
        return device.id;
    }

    // Track firewall policies for a device
    async trackPolicies(deviceId, policies) {
        if (!this.devices.has(deviceId)) {
            throw new Error(`Device ${deviceId} not found`);
        }

        const device = this.devices.get(deviceId);
        const previousPolicies = [...device.policies];
        
        // Update device policies
        device.policies = policies.map(policy => ({
            id: policy.id || this.generatePolicyId(),
            name: policy.name,
            source: policy.source,
            destination: policy.destination,
            service: policy.service,
            action: policy.action,
            enabled: policy.enabled !== false,
            hitCount: policy.hitCount || 0,
            lastHit: policy.lastHit || null,
            created: policy.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            ...policy
        }));

        device.lastUpdated = new Date().toISOString();

        // Detect changes
        const changes = this.detectPolicyChanges(deviceId, previousPolicies, device.policies);
        if (changes.length > 0) {
            this.recordChanges(deviceId, changes);
        }

        // Check for policy issues
        this.analyzeSecurityPolicies(deviceId, device.policies);

        await this.saveDeviceData();
        
        return {
            deviceId: deviceId,
            policiesTracked: device.policies.length,
            changesDetected: changes.length
        };
    }

    // Track interface statistics
    async trackInterfaceStats(deviceId, interfaceStats) {
        if (!this.devices.has(deviceId)) {
            throw new Error(`Device ${deviceId} not found`);
        }

        const device = this.devices.get(deviceId);
        const timestamp = new Date().toISOString();

        // Update interface statistics
        Object.keys(interfaceStats).forEach(interfaceName => {
            const stats = interfaceStats[interfaceName];
            
            if (!device.interfaces[interfaceName]) {
                device.interfaces[interfaceName] = {
                    name: interfaceName,
                    history: [],
                    alerts: []
                };
            }

            const iface = device.interfaces[interfaceName];
            
            // Store current stats
            iface.current = {
                ...stats,
                timestamp: timestamp
            };

            // Add to history (keep last 100 entries)
            iface.history.push({
                timestamp: timestamp,
                ...stats
            });

            if (iface.history.length > 100) {
                iface.history = iface.history.slice(-100);
            }

            // Check for interface issues
            this.checkInterfaceHealth(deviceId, interfaceName, stats);
        });

        device.lastStatsUpdate = timestamp;
        await this.saveDeviceData();

        return {
            deviceId: deviceId,
            interfacesTracked: Object.keys(interfaceStats).length
        };
    }

    // Detect policy changes
    detectPolicyChanges(deviceId, oldPolicies, newPolicies) {
        const changes = [];
        const oldPolicyMap = new Map(oldPolicies.map(p => [p.id, p]));
        const newPolicyMap = new Map(newPolicies.map(p => [p.id, p]));

        // Check for added policies
        newPolicies.forEach(newPolicy => {
            if (!oldPolicyMap.has(newPolicy.id)) {
                changes.push({
                    type: 'added',
                    policyId: newPolicy.id,
                    policyName: newPolicy.name,
                    details: newPolicy
                });
            }
        });

        // Check for removed policies
        oldPolicies.forEach(oldPolicy => {
            if (!newPolicyMap.has(oldPolicy.id)) {
                changes.push({
                    type: 'removed',
                    policyId: oldPolicy.id,
                    policyName: oldPolicy.name,
                    details: oldPolicy
                });
            }
        });

        // Check for modified policies
        newPolicies.forEach(newPolicy => {
            const oldPolicy = oldPolicyMap.get(newPolicy.id);
            if (oldPolicy) {
                const modifications = this.comparePolicies(oldPolicy, newPolicy);
                if (modifications.length > 0) {
                    changes.push({
                        type: 'modified',
                        policyId: newPolicy.id,
                        policyName: newPolicy.name,
                        modifications: modifications
                    });
                }
            }
        });

        return changes;
    }

    // Compare two policies for differences
    comparePolicies(oldPolicy, newPolicy) {
        const modifications = [];
        const fields = ['name', 'source', 'destination', 'service', 'action', 'enabled'];

        fields.forEach(field => {
            if (JSON.stringify(oldPolicy[field]) !== JSON.stringify(newPolicy[field])) {
                modifications.push({
                    field: field,
                    oldValue: oldPolicy[field],
                    newValue: newPolicy[field]
                });
            }
        });

        return modifications;
    }

    // Record policy changes
    recordChanges(deviceId, changes) {
        const changeRecord = {
            timestamp: new Date().toISOString(),
            deviceId: deviceId,
            changes: changes
        };

        this.changes.push(changeRecord);

        // Keep only last 1000 changes
        if (this.changes.length > 1000) {
            this.changes = this.changes.slice(-1000);
        }

        console.log(`📋 Recorded ${changes.length} policy changes for device ${deviceId}`);
    }

    // Analyze security policies for issues
    analyzeSecurityPolicies(deviceId, policies) {
        const device = this.devices.get(deviceId);
        const deviceName = device.name;
        
        // Check for overly permissive rules
        policies.forEach(policy => {
            // Check for "any to any" rules
            if (this.isAnyToAny(policy.source, policy.destination) && policy.action === 'permit') {
                this.addAlert({
                    type: 'security_risk',
                    severity: 'high',
                    deviceId: deviceId,
                    deviceName: deviceName,
                    policyId: policy.id,
                    policyName: policy.name,
                    message: 'Overly permissive rule: ANY to ANY allow detected',
                    recommendation: 'Consider restricting source or destination addresses'
                });
            }

            // Check for unused policies (no hits in 30 days)
            if (policy.hitCount === 0 && this.isOlderThan(policy.created, 30)) {
                this.addAlert({
                    type: 'optimization',
                    severity: 'medium',
                    deviceId: deviceId,
                    deviceName: deviceName,
                    policyId: policy.id,
                    policyName: policy.name,
                    message: 'Unused policy detected (no hits in 30+ days)',
                    recommendation: 'Review if this policy is still needed'
                });
            }

            // Check for disabled policies
            if (!policy.enabled) {
                this.addAlert({
                    type: 'configuration',
                    severity: 'low',
                    deviceId: deviceId,
                    deviceName: deviceName,
                    policyId: policy.id,
                    policyName: policy.name,
                    message: 'Disabled policy detected',
                    recommendation: 'Remove if no longer needed'
                });
            }
        });

        // Check for missing default deny rule
        const hasDefaultDeny = policies.some(p => 
            this.isAnyToAny(p.source, p.destination) && p.action === 'deny'
        );

        if (!hasDefaultDeny) {
            this.addAlert({
                type: 'security_risk',
                severity: 'high',
                deviceId: deviceId,
                deviceName: deviceName,
                message: 'Missing default deny rule',
                recommendation: 'Add a default deny rule at the end of the policy list'
            });
        }
    }

    // Check interface health
    checkInterfaceHealth(deviceId, interfaceName, stats) {
        const device = this.devices.get(deviceId);
        const deviceName = device.name;
        
        // Check for high error rates
        if (stats.inputErrors && stats.inputPackets) {
            const errorRate = (stats.inputErrors / stats.inputPackets) * 100;
            if (errorRate > 1) { // More than 1% errors
                this.addAlert({
                    type: 'interface_health',
                    severity: 'medium',
                    deviceId: deviceId,
                    deviceName: deviceName,
                    interface: interfaceName,
                    message: `High input error rate: ${errorRate.toFixed(2)}%`,
                    recommendation: 'Check cables and interface configuration'
                });
            }
        }

        // Check for high utilization
        if (stats.utilization && stats.utilization > 80) {
            this.addAlert({
                type: 'performance',
                severity: 'medium',
                deviceId: deviceId,
                deviceName: deviceName,
                interface: interfaceName,
                message: `High interface utilization: ${stats.utilization}%`,
                recommendation: 'Monitor bandwidth usage or consider upgrade'
            });
        }

        // Check for interface down
        if (stats.status === 'down' && stats.adminStatus === 'up') {
            this.addAlert({
                type: 'connectivity',
                severity: 'high',
                deviceId: deviceId,
                deviceName: deviceName,
                interface: interfaceName,
                message: 'Interface is administratively up but physically down',
                recommendation: 'Check physical connectivity and cable'
            });
        }
    }

    // Add alert
    addAlert(alert) {
        alert.id = this.generateAlertId();
        alert.timestamp = new Date().toISOString();
        alert.acknowledged = false;
        
        this.alerts.push(alert);

        // Keep only last 500 alerts
        if (this.alerts.length > 500) {
            this.alerts = this.alerts.slice(-500);
        }

        console.log(`🚨 Alert: ${alert.message} (${alert.deviceName})`);
    }

    // Helper functions
    isAnyToAny(source, destination) {
        const anyValues = ['any', 'all', '0.0.0.0/0', '::/0'];
        return anyValues.includes(source) && anyValues.includes(destination);
    }

    isOlderThan(dateString, days) {
        const date = new Date(dateString);
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        return date < daysAgo;
    }

    generateDeviceId() {
        return 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generatePolicyId() {
        return 'pol_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateAlertId() {
        return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Data persistence
    async saveDeviceData() {
        try {
            const data = {
                devices: Array.from(this.devices.entries()),
                changes: this.changes,
                alerts: this.alerts,
                lastUpdate: new Date().toISOString()
            };

            await fs.writeFile(
                path.join(this.dataPath, 'policy-tracker.json'),
                JSON.stringify(data, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error saving device data:', error);
        }
    }

    async loadDeviceData() {
        try {
            const data = await fs.readFile(
                path.join(this.dataPath, 'policy-tracker.json'),
                'utf8'
            );

            const parsed = JSON.parse(data);
            this.devices = new Map(parsed.devices || []);
            this.changes = parsed.changes || [];
            this.alerts = parsed.alerts || [];

            console.log(`📂 Loaded data for ${this.devices.size} devices`);
        } catch (error) {
            console.log('📂 No existing data found, starting fresh');
        }
    }

    // API methods for web interface
    getDevices() {
        return Array.from(this.devices.values());
    }

    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }

    getAlerts(severity = null, acknowledged = null) {
        let filteredAlerts = [...this.alerts];

        if (severity) {
            filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
        }

        if (acknowledged !== null) {
            filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === acknowledged);
        }

        return filteredAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    getChanges(deviceId = null, limit = 50) {
        let filteredChanges = [...this.changes];

        if (deviceId) {
            filteredChanges = filteredChanges.filter(change => change.deviceId === deviceId);
        }

        return filteredChanges
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            this.saveDeviceData();
            return true;
        }
        return false;
    }

    getDashboardSummary() {
        const devices = Array.from(this.devices.values());
        const activeAlerts = this.alerts.filter(a => !a.acknowledged);
        
        return {
            totalDevices: devices.length,
            activeDevices: devices.filter(d => d.status === 'active').length,
            totalPolicies: devices.reduce((sum, d) => sum + d.policies.length, 0),
            activeAlerts: activeAlerts.length,
            criticalAlerts: activeAlerts.filter(a => a.severity === 'high').length,
            recentChanges: this.changes.filter(c => 
                new Date(c.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length
        };
    }
}

module.exports = FirewallPolicyTracker;