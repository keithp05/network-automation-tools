#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const NetworkDiscoveryTool = require('./index.js');
const AIConfigManager = require('./ai-config-manager.js');
const NetworkAIChatbot = require('./ai-chatbot.js');
const FirewallPolicyTracker = require('./policy-tracker.js');
const NetworkTopologyDiscovery = require('./network-discovery.js');
const SNMPNetworkDiscovery = require('./snmp-discovery.js');
const AdvancedNetworkDiscovery = require('./advanced-discovery.js');
const CredentialManager = require('./credential-manager.js');
const PythonScriptEngine = require('./python-script-engine.js');
const UniversalSearch = require('./universal-search.js');
const N8nIntegration = require('./n8n-integration.js');

// API Client imports
const AristaAPI = require('./api-clients/arista-api.js');
const FirepowerAPI = require('./api-clients/firepower-api.js');
const PaloAltoAPI = require('./api-clients/paloalto-api.js');
const FortiGateAPI = require('./api-clients/fortigate-api.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize components
const configManager = new AIConfigManager();
const chatbot = new NetworkAIChatbot();
const policyTracker = new FirewallPolicyTracker();
const topologyDiscovery = new NetworkTopologyDiscovery();
const snmpDiscovery = new SNMPNetworkDiscovery();
const advancedDiscovery = new AdvancedNetworkDiscovery();
const credentialManager = new CredentialManager();
const pythonEngine = new PythonScriptEngine();
const universalSearch = new UniversalSearch();
const n8nIntegration = new N8nIntegration();

// Initialize API clients
const apiClients = {
    arista: new AristaAPI(),
    firepower: new FirepowerAPI(),
    paloalto: new PaloAltoAPI(),
    fortigate: new FortiGateAPI()
};

// Load existing data
policyTracker.loadDeviceData();

// Initialize default scripts and rebuild search index
pythonEngine.createDefaultScripts().catch(console.error);
universalSearch.rebuildIndex().catch(console.error);

// Middleware
app.use(express.json());

// Routes - Define root route BEFORE static middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/topology', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/topology.html'));
});

app.get('/api/devices', (req, res) => {
    res.json(policyTracker.getDevices());
});

app.get('/api/devices/:id', (req, res) => {
    const device = policyTracker.getDevice(req.params.id);
    if (device) {
        res.json(device);
    } else {
        res.status(404).json({ error: 'Device not found' });
    }
});

app.post('/api/devices', async (req, res) => {
    try {
        const deviceId = await policyTracker.addDevice(req.body);
        res.json({ deviceId: deviceId, message: 'Device added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/devices/:id/policies', async (req, res) => {
    try {
        const result = await policyTracker.trackPolicies(req.params.id, req.body.policies);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/devices/:id/interfaces', async (req, res) => {
    try {
        const result = await policyTracker.trackInterfaceStats(req.params.id, req.body.interfaces);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/alerts', (req, res) => {
    const { severity, acknowledged } = req.query;
    const alerts = policyTracker.getAlerts(severity, acknowledged === 'true');
    res.json(alerts);
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
    const success = policyTracker.acknowledgeAlert(req.params.id);
    if (success) {
        res.json({ message: 'Alert acknowledged' });
    } else {
        res.status(404).json({ error: 'Alert not found' });
    }
});

app.get('/api/changes', (req, res) => {
    const { deviceId, limit } = req.query;
    const changes = policyTracker.getChanges(deviceId, parseInt(limit) || 50);
    res.json(changes);
});

app.get('/api/dashboard/summary', (req, res) => {
    const summary = policyTracker.getDashboardSummary();
    res.json(summary);
});

app.post('/api/config/generate', async (req, res) => {
    try {
        const { vendor, deviceType, requirements } = req.body;
        const config = await configManager.generateConfig(vendor, deviceType, requirements);
        res.json(config);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/config/vendors', (req, res) => {
    const vendors = configManager.getAvailableVendors();
    const summary = configManager.getDocumentationSummary();
    res.json({ vendors, documentation: summary });
});

app.post('/api/config/search', async (req, res) => {
    try {
        const { query, vendor } = req.body;
        const results = await configManager.searchDocumentation(query, vendor);
        res.json(results);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const response = await chatbot.processMessage(message, sessionId);
        res.json(response);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/chat/history/:sessionId', (req, res) => {
    const history = chatbot.getConversationHistory(req.params.sessionId);
    res.json(history);
});

app.delete('/api/chat/history/:sessionId', (req, res) => {
    chatbot.clearConversation(req.params.sessionId);
    res.json({ message: 'Conversation cleared' });
});

// Credential management routes
app.get('/api/credentials', (req, res) => {
    const credentials = credentialManager.getAllCredentialSets();
    res.json(credentials);
});

app.post('/api/credentials', async (req, res) => {
    try {
        const { name, description, ssh, telnet, snmp } = req.body;
        const id = await credentialManager.addCredentialSet(name, {
            description,
            ssh,
            telnet,
            snmp
        });
        res.json({ id, message: 'Credentials added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/credentials/:id', (req, res) => {
    const credentials = credentialManager.getCredentialSet(req.params.id, false);
    if (credentials) {
        res.json(credentials);
    } else {
        res.status(404).json({ error: 'Credential set not found' });
    }
});

app.put('/api/credentials/:id', async (req, res) => {
    try {
        const success = await credentialManager.updateCredentialSet(req.params.id, req.body);
        if (success) {
            res.json({ message: 'Credentials updated successfully' });
        } else {
            res.status(404).json({ error: 'Credential set not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/credentials/:id', async (req, res) => {
    try {
        const success = await credentialManager.deleteCredentialSet(req.params.id);
        if (success) {
            res.json({ message: 'Credentials deleted successfully' });
        } else {
            res.status(404).json({ error: 'Credential set not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/credentials/:id/test', async (req, res) => {
    try {
        const { targetIP } = req.body;
        const results = await credentialManager.testCredentials(req.params.id, targetIP);
        res.json(results);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Advanced discovery routes
app.post('/api/discovery/advanced', async (req, res) => {
    try {
        const { seedIPs, credentialSetIds, options } = req.body;
        
        // Start discovery in background and return immediately
        res.json({ message: 'Advanced discovery started', status: 'started' });
        
        // Run discovery with progress callbacks
        const progressCallback = (progress) => {
            io.emit('advanced-discovery-progress', progress);
        };
        
        const results = await advancedDiscovery.startGradualDiscovery(
            seedIPs, 
            credentialSetIds, 
            { ...options, progressCallback }
        );
        
        io.emit('advanced-discovery-complete', results);
        
    } catch (error) {
        io.emit('advanced-discovery-error', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/discovery/progress', (req, res) => {
    const progress = advancedDiscovery.getDiscoveryProgress();
    res.json(progress);
});

app.get('/api/discovery/devices', (req, res) => {
    const devices = advancedDiscovery.getDiscoveredDevices();
    res.json(devices);
});

app.get('/api/discovery/neighbors', (req, res) => {
    const neighbors = advancedDiscovery.getNeighborRelationships();
    res.json(neighbors);
});

app.get('/api/discovery/mac-mappings', (req, res) => {
    const macMappings = advancedDiscovery.getMacAddressMappings();
    res.json(macMappings);
});

app.get('/api/discovery/connections', (req, res) => {
    const connections = advancedDiscovery.getInterfaceConnections();
    res.json(connections);
});

// Topology discovery routes
app.post('/api/topology/discover', async (req, res) => {
    try {
        const { seedDevices, credentials, options } = req.body;
        const topology = await topologyDiscovery.discoverNetworkTopology(seedDevices, credentials);
        res.json(topology);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/topology/snmp-discover', async (req, res) => {
    try {
        const { subnet, community } = req.body;
        const devices = await snmpDiscovery.discoverSubnet(subnet, community);
        const report = snmpDiscovery.generateNetworkReport(devices);
        res.json(report);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/topology/snmp-device', async (req, res) => {
    try {
        const { ip, community } = req.body;
        const device = await snmpDiscovery.discoverDevice(ip, community);
        res.json(device);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/topology/export/:format', (req, res) => {
    try {
        const format = req.params.format;
        const topology = topologyDiscovery.exportTopology(format);
        
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=topology.json');
        } else if (format === 'graphml') {
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', 'attachment; filename=topology.graphml');
        }
        
        res.send(topology);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Vendor API Integration Routes
app.post('/api/vendor-api/:vendor/test', async (req, res) => {
    try {
        const vendor = req.params.vendor;
        const config = req.body;
        
        if (!apiClients[vendor]) {
            return res.status(400).json({ 
                success: false, 
                message: `Unsupported vendor: ${vendor}` 
            });
        }

        const client = apiClients[vendor];
        const result = await client.connect(config.host, config);
        
        if (result.success) {
            // Store connection for future operations
            // (In production, implement proper session management)
            console.log(`✅ ${vendor} API connection successful: ${config.host}`);
        }
        
        res.json(result);
    } catch (error) {
        console.error(`❌ ${req.params.vendor} API test error:`, error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/vendor-api/:vendor/config', async (req, res) => {
    try {
        const vendor = req.params.vendor;
        const config = req.body;
        
        if (!apiClients[vendor]) {
            return res.status(400).json({ 
                success: false, 
                message: `Unsupported vendor: ${vendor}` 
            });
        }

        // In production, save configuration securely
        console.log(`💾 Saving ${vendor} API configuration for host: ${config.host}`);
        
        res.json({
            success: true,
            message: 'Configuration saved successfully'
        });
    } catch (error) {
        console.error(`❌ ${req.params.vendor} config save error:`, error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/vendor-api/:vendor/execute', async (req, res) => {
    try {
        const vendor = req.params.vendor;
        const { operation } = req.body;
        
        if (!apiClients[vendor]) {
            return res.status(400).json({ 
                success: false, 
                message: `Unsupported vendor: ${vendor}` 
            });
        }

        const client = apiClients[vendor];
        
        // Check if client has the requested operation
        if (typeof client[operation] !== 'function') {
            return res.json({
                success: false,
                message: `Operation '${operation}' not supported for ${vendor}`
            });
        }

        console.log(`🔧 Executing ${vendor} operation: ${operation}`);
        const result = await client[operation]();
        
        res.json({
            success: true,
            data: result,
            message: `Operation '${operation}' completed successfully`
        });
    } catch (error) {
        console.error(`❌ ${req.params.vendor} operation error:`, error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/vendor-api/:vendor/operations', (req, res) => {
    try {
        const vendor = req.params.vendor;
        
        if (!apiClients[vendor]) {
            return res.status(400).json({ 
                success: false, 
                message: `Unsupported vendor: ${vendor}` 
            });
        }

        const client = apiClients[vendor];
        const operations = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
            .filter(method => method !== 'constructor' && typeof client[method] === 'function');
        
        res.json({
            success: true,
            vendor: vendor,
            operations: operations
        });
    } catch (error) {
        console.error(`❌ ${req.params.vendor} operations list error:`, error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/vendor-api/status', (req, res) => {
    try {
        const status = {};
        
        Object.keys(apiClients).forEach(vendor => {
            status[vendor] = {
                name: apiClients[vendor].name,
                available: true,
                lastConnection: null
            };
        });
        
        res.json({
            success: true,
            status: status
        });
    } catch (error) {
        console.error('❌ API status error:', error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
});

// Python Script Engine Routes
app.get('/api/scripts', async (req, res) => {
    try {
        const scripts = await pythonEngine.getScriptList();
        res.json(scripts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/scripts/:name', async (req, res) => {
    try {
        const content = await pythonEngine.getScriptContent(req.params.name);
        res.json({ content });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

app.post('/api/scripts', async (req, res) => {
    try {
        const { name, content, metadata } = req.body;
        const result = await pythonEngine.saveScript(name, content, metadata);
        
        // Index the new script
        await universalSearch.indexNewItem('script', name, {
            name: metadata.name || name,
            description: metadata.description || '',
            tags: metadata.tags || [],
            author: metadata.author || 'Unknown',
            content: content
        });
        
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/scripts/:name', async (req, res) => {
    try {
        const result = await pythonEngine.deleteScript(req.params.name);
        
        // Remove from search index
        await universalSearch.removeFromIndex(`script_${req.params.name}`);
        
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/scripts/:name/execute', async (req, res) => {
    try {
        const { parameters, options } = req.body;
        const scriptName = req.params.name;
        
        console.log(`🚀 Executing script: ${scriptName}`);
        
        // Setup real-time output streaming
        const setupRealtimeOutput = (execution) => {
            const clientId = req.headers['x-client-id'];
            if (clientId) {
                const socket = io.sockets.connected[clientId];
                if (socket) {
                    options.onOutput = (output) => {
                        socket.emit('script-output', {
                            executionId: execution.id,
                            output: output,
                            type: 'stdout'
                        });
                    };
                    options.onError = (error) => {
                        socket.emit('script-output', {
                            executionId: execution.id,
                            output: error,
                            type: 'stderr'
                        });
                    };
                }
            }
        };
        
        const execution = await pythonEngine.executeScript(scriptName, parameters, {
            ...options,
            timeout: 300000 // 5 minutes
        });
        
        res.json({
            success: true,
            executionId: execution.id,
            status: execution.status,
            result: execution.result
        });
    } catch (error) {
        console.error(`❌ Script execution error:`, error.message);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/scripts/running', (req, res) => {
    try {
        const running = pythonEngine.getRunningScripts();
        res.json(running);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/scripts/results/:executionId', async (req, res) => {
    try {
        const result = await pythonEngine.getScriptResults(req.params.executionId);
        if (!result) {
            return res.status(404).json({ error: 'Execution not found' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scripts/stop/:executionId', async (req, res) => {
    try {
        const result = await pythonEngine.stopScript(req.params.executionId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Universal Search Routes
app.get('/api/search', async (req, res) => {
    try {
        const { 
            q: query, 
            types, 
            limit = 50, 
            sortBy = 'relevance' 
        } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }
        
        const searchTypes = types ? types.split(',') : null;
        const results = await universalSearch.search(query, {
            types: searchTypes,
            limit: parseInt(limit),
            sortBy: sortBy
        });
        
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/search/quick', async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }
        
        const results = await universalSearch.quickSearch(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/search/rebuild', async (req, res) => {
    try {
        await universalSearch.rebuildIndex();
        res.json({ 
            success: true, 
            message: 'Search index rebuilt successfully' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/search/export', async (req, res) => {
    try {
        const exportData = await universalSearch.exportSearchData();
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=search-data.json');
        res.json(exportData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/search/index', async (req, res) => {
    try {
        const { type, id, data } = req.body;
        const result = await universalSearch.indexNewItem(type, id, data);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// N8N Workflow Integration Routes
app.get('/api/n8n/status', async (req, res) => {
    try {
        const status = await n8nIntegration.testConnection();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/n8n/config', (req, res) => {
    try {
        const config = n8nIntegration.getConfig();
        // Don't expose sensitive data
        const safeConfig = {
            baseUrl: config.baseUrl,
            authType: config.authType,
            hasApiKey: !!config.apiKey,
            hasBasicAuth: !!(config.username && config.password),
            webhookUrl: config.webhookUrl
        };
        res.json({ success: true, config: safeConfig });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/n8n/config', (req, res) => {
    try {
        const { baseUrl, apiKey, username, password, authType } = req.body;
        
        const updates = {};
        if (baseUrl) updates.baseUrl = baseUrl;
        if (authType) updates.authType = authType;
        
        if (authType === 'apikey' && apiKey) {
            updates.apiKey = apiKey;
            updates.authType = 'apikey';
        } else if (authType === 'basic' && username && password) {
            updates.username = username;
            updates.password = password;
            updates.authType = 'basic';
        }
        
        n8nIntegration.updateConfig(updates);
        
        res.json({ 
            success: true, 
            message: 'N8N configuration updated successfully',
            config: {
                baseUrl: updates.baseUrl || n8nIntegration.getConfig().baseUrl,
                authType: updates.authType || n8nIntegration.getConfig().authType
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/n8n/setup', (req, res) => {
    try {
        const instructions = n8nIntegration.getSetupInstructions();
        res.json({ success: true, instructions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/n8n/workflows', async (req, res) => {
    try {
        const result = await n8nIntegration.getWorkflows();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/n8n/workflows/:id', async (req, res) => {
    try {
        const result = await n8nIntegration.getWorkflow(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/n8n/workflows', async (req, res) => {
    try {
        const result = await n8nIntegration.createWorkflow(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/n8n/workflows/:id', async (req, res) => {
    try {
        const result = await n8nIntegration.updateWorkflow(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/n8n/workflows/:id', async (req, res) => {
    try {
        const result = await n8nIntegration.deleteWorkflow(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/n8n/workflows/:id/execute', async (req, res) => {
    try {
        const result = await n8nIntegration.executeWorkflow(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/n8n/workflows/:id/activate', async (req, res) => {
    try {
        const result = await n8nIntegration.activateWorkflow(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/n8n/workflows/:id/deactivate', async (req, res) => {
    try {
        const result = await n8nIntegration.deactivateWorkflow(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/n8n/executions', async (req, res) => {
    try {
        const { limit = 20, ...filter } = req.query;
        const result = await n8nIntegration.getExecutions(parseInt(limit), filter);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/n8n/executions/:id', async (req, res) => {
    try {
        const result = await n8nIntegration.getExecution(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/n8n/templates', (req, res) => {
    try {
        const templates = n8nIntegration.getNetworkWorkflowTemplates();
        res.json({
            success: true,
            templates: templates
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/n8n/templates/:name/deploy', async (req, res) => {
    try {
        const result = await n8nIntegration.deployNetworkWorkflow(req.params.name);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/n8n/stats', async (req, res) => {
    try {
        const result = await n8nIntegration.getWorkflowStats();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/n8n/trigger', async (req, res) => {
    try {
        const { eventType, eventData } = req.body;
        const result = await n8nIntegration.triggerWorkflowFromEvent(eventType, eventData);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Webhook endpoints for N8N callbacks
app.post('/webhooks/n8n/:path', (req, res) => {
    try {
        const path = req.params.path;
        const data = req.body;
        
        console.log(`📥 N8N webhook received: ${path}`, data);
        
        // Emit event for real-time updates
        io.emit('n8n-webhook', { path, data });
        
        res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);

    // Network discovery
    socket.on('start-scan', async (data) => {
        console.log('🔍 Starting network scan...');
        
        try {
            const tool = new NetworkDiscoveryTool();
            
            socket.emit('scan-progress', { 
                status: 'starting', 
                message: 'Initializing network discovery...' 
            });

            await tool.getNetworkInterfaces();
            socket.emit('interfaces-found', tool.results.interfaces);

            socket.emit('scan-progress', { 
                status: 'scanning', 
                message: `Scanning network ${data.subnet || '192.168.200'}.0/24...` 
            });

            let subnet = data.subnet || '192.168.200';
            if (tool.results.interfaces.length > 0) {
                const ip = tool.results.interfaces[0].address;
                const parts = ip.split('.');
                subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
            }

            const promises = [];
            for (let i = 1; i <= 254; i++) {
                const host = `${subnet}.${i}`;
                promises.push(tool.pingHost(host));
            }

            const results = await Promise.all(promises);
            const activeHosts = results.filter(result => result.alive);
            
            tool.results.activeHosts = activeHosts;
            socket.emit('hosts-found', activeHosts);

            if (activeHosts.length > 0) {
                socket.emit('scan-progress', { 
                    status: 'ports', 
                    message: 'Scanning ports on active hosts...' 
                });

                const hostsToScan = activeHosts.slice(0, 3);
                for (const hostResult of hostsToScan) {
                    const host = hostResult.host;
                    const ports = [22, 23, 53, 80, 135, 139, 443, 445, 993, 995];
                    
                    const portPromises = ports.map(port => tool.scanPort(host, port));
                    const portResults = await Promise.all(portPromises);
                    const openPorts = portResults.filter(result => result.open);
                    
                    tool.results.openPorts.push(...openPorts);
                    socket.emit('ports-found', { host: host, ports: openPorts });
                }
            }

            socket.emit('scan-complete', {
                interfaces: tool.results.interfaces,
                activeHosts: tool.results.activeHosts,
                openPorts: tool.results.openPorts,
                summary: {
                    totalInterfaces: tool.results.interfaces.length,
                    totalActiveHosts: tool.results.activeHosts.length,
                    totalOpenPorts: tool.results.openPorts.length
                }
            });

        } catch (error) {
            console.error('❌ Scan error:', error);
            socket.emit('scan-error', { 
                message: error.message,
                error: error.toString()
            });
        }
    });

    // Real-time chat
    socket.on('chat-message', async (data) => {
        try {
            const response = await chatbot.processMessage(data.message, data.sessionId || socket.id);
            socket.emit('chat-response', response);
        } catch (error) {
            socket.emit('chat-response', {
                text: "I encountered an error processing your message. Please try again.",
                error: true
            });
        }
    });

    // Policy updates
    socket.on('policy-update', async (data) => {
        try {
            const result = await policyTracker.trackPolicies(data.deviceId, data.policies);
            socket.emit('policy-update-result', result);
            
            // Broadcast to all clients about the update
            socket.broadcast.emit('device-updated', {
                deviceId: data.deviceId,
                type: 'policies',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            socket.emit('policy-update-error', { error: error.message });
        }
    });

    // Interface stats updates
    socket.on('interface-stats', async (data) => {
        try {
            const result = await policyTracker.trackInterfaceStats(data.deviceId, data.interfaces);
            socket.emit('interface-stats-result', result);
            
            socket.broadcast.emit('device-updated', {
                deviceId: data.deviceId,
                type: 'interfaces',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            socket.emit('interface-stats-error', { error: error.message });
        }
    });

    // Advanced discovery
    socket.on('start-advanced-discovery', async (data) => {
        console.log('🔍 Starting advanced network discovery...');
        
        try {
            const { seedIPs, credentialSetIds, options } = data;
            
            socket.emit('advanced-discovery-started', { 
                message: 'Advanced discovery initialized',
                seedIPs: seedIPs,
                credentialSets: credentialSetIds.length
            });

            // Progress callback for real-time updates
            const progressCallback = (progress) => {
                socket.emit('advanced-discovery-progress', progress);
                // Also broadcast to all clients for dashboard updates
                socket.broadcast.emit('discovery-update', {
                    phase: progress.phase,
                    completed: progress.completed,
                    total: progress.total
                });
            };
            
            const results = await advancedDiscovery.startGradualDiscovery(
                seedIPs, 
                credentialSetIds, 
                { ...options, progressCallback }
            );
            
            socket.emit('advanced-discovery-complete', results);
            socket.broadcast.emit('discovery-complete', {
                totalDevices: results.devices.length,
                totalConnections: results.interfaceConnections.length
            });
            
        } catch (error) {
            console.error('❌ Advanced discovery error:', error);
            socket.emit('advanced-discovery-error', { 
                message: error.message,
                error: error.toString()
            });
        }
    });

    socket.on('stop-advanced-discovery', () => {
        // Implementation would need to add stop capability to AdvancedNetworkDiscovery
        socket.emit('advanced-discovery-stopped', { 
            message: 'Discovery stopped by user' 
        });
    });

    // Credential management
    socket.on('test-credentials', async (data) => {
        try {
            const { credentialId, targetIP } = data;
            socket.emit('credential-test-started', { 
                message: `Testing credentials against ${targetIP}...`
            });

            const results = await credentialManager.testCredentials(credentialId, targetIP);
            socket.emit('credential-test-complete', results);
        } catch (error) {
            socket.emit('credential-test-error', { 
                message: error.message 
            });
        }
    });

    // Real-time alerts
    socket.on('subscribe-alerts', () => {
        socket.join('alerts');
        console.log(`Client ${socket.id} subscribed to alerts`);
    });

    socket.on('disconnect', () => {
        console.log('📱 Client disconnected:', socket.id);
    });
});

// Periodic tasks
setInterval(() => {
    // Broadcast dashboard summary updates every 30 seconds
    const summary = policyTracker.getDashboardSummary();
    io.emit('dashboard-update', summary);
}, 30000);

// Broadcast new alerts
const originalAddAlert = policyTracker.addAlert.bind(policyTracker);
policyTracker.addAlert = function(alert) {
    originalAddAlert(alert);
    io.to('alerts').emit('new-alert', alert);
};

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 Enhanced Network Management Platform running on http://localhost:${PORT}`);
    console.log('📱 Features available:');
    console.log('  • AI-powered configuration generation');
    console.log('  • ChatGPT-style network assistant');
    console.log('  • Real-time firewall policy tracking');
    console.log('  • Interface statistics monitoring');
    console.log('  • Network discovery and scanning');
    console.log('  • Security alerts and recommendations');
});

module.exports = { app, server, io };