#!/usr/bin/env node

/**
 * n8n Workflow Automation Integration
 * Provides integration with n8n workflow automation platform
 */

const axios = require('axios');
const { EventEmitter } = require('events');
const N8nConfig = require('./n8n-config');

class N8nIntegration extends EventEmitter {
    constructor(config = {}) {
        super();
        
        // Initialize configuration manager
        this.configManager = new N8nConfig();
        
        // Load config from environment if available
        this.configManager.loadFromEnv();
        
        // Get current configuration
        this.config = this.configManager.getConfig();
        
        // Override with any passed config
        if (Object.keys(config).length > 0) {
            this.configManager.updateConfig(config);
            this.config = this.configManager.getConfig();
        }
        
        // Create axios client with authentication
        this.updateClient();
        
        this.workflows = new Map();
        this.executions = new Map();
        
        console.log('🔄 N8n Integration initialized');
        console.log(`📡 Base URL: ${this.config.baseUrl}`);
        console.log(`🔐 Auth Type: ${this.config.authType}`);
    }

    updateClient() {
        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: this.configManager.getAuthHeaders()
        });
    }

    /**
     * Update N8N configuration
     */
    updateConfig(newConfig) {
        this.configManager.updateConfig(newConfig);
        this.config = this.configManager.getConfig();
        this.updateClient();
        
        console.log('✅ N8N configuration updated');
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Get setup instructions
     */
    getSetupInstructions() {
        return this.configManager.getSetupInstructions();
    }

    /**
     * Test connection to n8n instance
     */
    async testConnection() {
        try {
            const response = await this.client.get('/rest/active-workflows');
            return {
                success: true,
                status: 'connected',
                activeWorkflows: response.data.length || 0,
                version: response.headers['x-n8n-version'] || 'unknown'
            };
        } catch (error) {
            return {
                success: false,
                status: 'disconnected',
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    /**
     * Get all workflows
     */
    async getWorkflows() {
        try {
            const response = await this.client.get('/rest/workflows');
            const workflows = response.data;
            
            // Cache workflows
            workflows.forEach(workflow => {
                this.workflows.set(workflow.id, workflow);
            });
            
            return {
                success: true,
                workflows: workflows,
                count: workflows.length
            };
        } catch (error) {
            console.error('Error fetching workflows:', error.message);
            return {
                success: false,
                error: error.message,
                workflows: []
            };
        }
    }

    /**
     * Get workflow by ID
     */
    async getWorkflow(workflowId) {
        try {
            const response = await this.client.get(`/rest/workflows/${workflowId}`);
            const workflow = response.data;
            
            this.workflows.set(workflowId, workflow);
            
            return {
                success: true,
                workflow: workflow
            };
        } catch (error) {
            console.error(`Error fetching workflow ${workflowId}:`, error.message);
            return {
                success: false,
                error: error.message,
                workflow: null
            };
        }
    }

    /**
     * Create new workflow
     */
    async createWorkflow(workflowData) {
        try {
            const response = await this.client.post('/rest/workflows', workflowData);
            const workflow = response.data;
            
            this.workflows.set(workflow.id, workflow);
            
            console.log(`✅ Created workflow: ${workflow.name} (ID: ${workflow.id})`);
            
            return {
                success: true,
                workflow: workflow,
                message: 'Workflow created successfully'
            };
        } catch (error) {
            console.error('Error creating workflow:', error.message);
            return {
                success: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    /**
     * Update existing workflow
     */
    async updateWorkflow(workflowId, workflowData) {
        try {
            const response = await this.client.put(`/rest/workflows/${workflowId}`, workflowData);
            const workflow = response.data;
            
            this.workflows.set(workflowId, workflow);
            
            console.log(`✅ Updated workflow: ${workflow.name} (ID: ${workflowId})`);
            
            return {
                success: true,
                workflow: workflow,
                message: 'Workflow updated successfully'
            };
        } catch (error) {
            console.error(`Error updating workflow ${workflowId}:`, error.message);
            return {
                success: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    /**
     * Delete workflow
     */
    async deleteWorkflow(workflowId) {
        try {
            await this.client.delete(`/rest/workflows/${workflowId}`);
            this.workflows.delete(workflowId);
            
            console.log(`🗑️ Deleted workflow ID: ${workflowId}`);
            
            return {
                success: true,
                message: 'Workflow deleted successfully'
            };
        } catch (error) {
            console.error(`Error deleting workflow ${workflowId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute workflow manually
     */
    async executeWorkflow(workflowId, inputData = {}) {
        try {
            const response = await this.client.post(`/rest/workflows/${workflowId}/execute`, {
                data: inputData
            });
            
            const execution = response.data;
            this.executions.set(execution.id, execution);
            
            console.log(`🚀 Executed workflow ${workflowId}, execution ID: ${execution.id}`);
            
            return {
                success: true,
                execution: execution,
                executionId: execution.id,
                message: 'Workflow executed successfully'
            };
        } catch (error) {
            console.error(`Error executing workflow ${workflowId}:`, error.message);
            return {
                success: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }

    /**
     * Get workflow execution status
     */
    async getExecution(executionId) {
        try {
            const response = await this.client.get(`/rest/executions/${executionId}`);
            const execution = response.data;
            
            this.executions.set(executionId, execution);
            
            return {
                success: true,
                execution: execution,
                status: execution.status,
                startedAt: execution.startedAt,
                stoppedAt: execution.stoppedAt
            };
        } catch (error) {
            console.error(`Error fetching execution ${executionId}:`, error.message);
            return {
                success: false,
                error: error.message,
                execution: null
            };
        }
    }

    /**
     * Get execution history
     */
    async getExecutions(limit = 20, filter = {}) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                ...filter
            });
            
            const response = await this.client.get(`/rest/executions?${params}`);
            const executions = response.data;
            
            return {
                success: true,
                executions: executions,
                count: executions.length
            };
        } catch (error) {
            console.error('Error fetching executions:', error.message);
            return {
                success: false,
                error: error.message,
                executions: []
            };
        }
    }

    /**
     * Activate workflow
     */
    async activateWorkflow(workflowId) {
        try {
            await this.client.post(`/rest/workflows/${workflowId}/activate`);
            
            console.log(`✅ Activated workflow ID: ${workflowId}`);
            
            return {
                success: true,
                message: 'Workflow activated successfully'
            };
        } catch (error) {
            console.error(`Error activating workflow ${workflowId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deactivate workflow
     */
    async deactivateWorkflow(workflowId) {
        try {
            await this.client.post(`/rest/workflows/${workflowId}/deactivate`);
            
            console.log(`⏸️ Deactivated workflow ID: ${workflowId}`);
            
            return {
                success: true,
                message: 'Workflow deactivated successfully'
            };
        } catch (error) {
            console.error(`Error deactivating workflow ${workflowId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create network-specific workflow templates
     */
    getNetworkWorkflowTemplates() {
        return {
            'device-health-monitor': {
                name: 'Device Health Monitor',
                description: 'Monitor network device health and send alerts',
                nodes: [
                    {
                        name: 'Webhook',
                        type: 'n8n-nodes-base.webhook',
                        position: [250, 300],
                        parameters: {
                            path: 'device-health',
                            httpMethod: 'POST'
                        }
                    },
                    {
                        name: 'Health Check',
                        type: 'n8n-nodes-base.httpRequest',
                        position: [450, 300],
                        parameters: {
                            url: `${this.config.webhookUrl}/api/scripts/device_health_check.py/execute`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    },
                    {
                        name: 'Send Alert',
                        type: 'n8n-nodes-base.emailSend',
                        position: [650, 300],
                        parameters: {
                            subject: 'Network Device Health Alert',
                            text: 'Device health check completed. Check results in dashboard.'
                        }
                    }
                ]
            },
            'interface-monitoring': {
                name: 'Interface Utilization Monitor',
                description: 'Monitor interface utilization and trigger alerts',
                nodes: [
                    {
                        name: 'Schedule',
                        type: 'n8n-nodes-base.cron',
                        position: [250, 300],
                        parameters: {
                            cronExpression: '0 */5 * * * *' // Every 5 minutes
                        }
                    },
                    {
                        name: 'Get Utilization',
                        type: 'n8n-nodes-base.httpRequest',
                        position: [450, 300],
                        parameters: {
                            url: `${this.config.webhookUrl}/api/scripts/interface_utilization_report.py/execute`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    },
                    {
                        name: 'Check Threshold',
                        type: 'n8n-nodes-base.if',
                        position: [650, 300],
                        parameters: {
                            conditions: {
                                number: [
                                    {
                                        value1: '={{$json.max_utilization}}',
                                        operation: 'larger',
                                        value2: 80
                                    }
                                ]
                            }
                        }
                    },
                    {
                        name: 'Send Alert',
                        type: 'n8n-nodes-base.emailSend',
                        position: [850, 300],
                        parameters: {
                            subject: 'High Interface Utilization Alert',
                            text: 'Interface utilization exceeded 80%. Check dashboard for details.'
                        }
                    }
                ]
            },
            'topology-change-detector': {
                name: 'Topology Change Detector',
                description: 'Detect network topology changes and log them',
                nodes: [
                    {
                        name: 'Schedule',
                        type: 'n8n-nodes-base.cron',
                        position: [250, 300],
                        parameters: {
                            cronExpression: '0 0 */6 * * *' // Every 6 hours
                        }
                    },
                    {
                        name: 'Analyze Topology',
                        type: 'n8n-nodes-base.httpRequest',
                        position: [450, 300],
                        parameters: {
                            url: `${this.config.webhookUrl}/api/scripts/network_topology_analyzer.py/execute`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    },
                    {
                        name: 'Store Results',
                        type: 'n8n-nodes-base.httpRequest',
                        position: [650, 300],
                        parameters: {
                            url: `${this.config.webhookUrl}/api/search/index`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                type: 'topology',
                                id: 'topology-{{$now}}',
                                data: '={{$json}}'
                            }
                        }
                    }
                ]
            },
            'automated-backup': {
                name: 'Automated Configuration Backup',
                description: 'Automatically backup device configurations',
                nodes: [
                    {
                        name: 'Daily Schedule',
                        type: 'n8n-nodes-base.cron',
                        position: [250, 300],
                        parameters: {
                            cronExpression: '0 0 2 * * *' // Daily at 2 AM
                        }
                    },
                    {
                        name: 'Get Devices',
                        type: 'n8n-nodes-base.httpRequest',
                        position: [450, 300],
                        parameters: {
                            url: `${this.config.webhookUrl}/api/devices`,
                            method: 'GET'
                        }
                    },
                    {
                        name: 'Backup Each Device',
                        type: 'n8n-nodes-base.itemLists',
                        position: [650, 300],
                        parameters: {
                            operation: 'aggregateItems',
                            fieldToAggregate: 'ip'
                        }
                    },
                    {
                        name: 'Store Backup',
                        type: 'n8n-nodes-base.httpRequest',
                        position: [850, 300],
                        parameters: {
                            url: `${this.config.webhookUrl}/api/devices/{{$json.ip}}/backup`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    }
                ]
            }
        };
    }

    /**
     * Deploy network workflow template
     */
    async deployNetworkWorkflow(templateName) {
        const templates = this.getNetworkWorkflowTemplates();
        const template = templates[templateName];
        
        if (!template) {
            return {
                success: false,
                error: `Template '${templateName}' not found`,
                availableTemplates: Object.keys(templates)
            };
        }

        try {
            const workflowData = {
                name: template.name,
                nodes: template.nodes,
                connections: this.generateConnections(template.nodes),
                active: false,
                settings: {
                    executionOrder: 'v1'
                }
            };

            const result = await this.createWorkflow(workflowData);
            
            if (result.success) {
                console.log(`📋 Deployed network workflow template: ${template.name}`);
                return {
                    ...result,
                    template: templateName,
                    description: template.description
                };
            }
            
            return result;
        } catch (error) {
            console.error(`Error deploying template ${templateName}:`, error.message);
            return {
                success: false,
                error: error.message,
                template: templateName
            };
        }
    }

    /**
     * Generate node connections for workflow
     */
    generateConnections(nodes) {
        const connections = {};
        
        for (let i = 0; i < nodes.length - 1; i++) {
            const currentNode = nodes[i];
            const nextNode = nodes[i + 1];
            
            connections[currentNode.name] = {
                main: [
                    [
                        {
                            node: nextNode.name,
                            type: 'main',
                            index: 0
                        }
                    ]
                ]
            };
        }
        
        return connections;
    }

    /**
     * Trigger workflow from network event
     */
    async triggerWorkflowFromEvent(eventType, eventData) {
        try {
            const workflowMappings = {
                'device_down': 'device-health-monitor',
                'high_utilization': 'interface-monitoring',
                'topology_change': 'topology-change-detector',
                'config_change': 'automated-backup'
            };

            const templateName = workflowMappings[eventType];
            if (!templateName) {
                console.log(`No workflow mapping found for event: ${eventType}`);
                return { success: false, error: 'No workflow mapping found' };
            }

            // Find active workflow by name
            const workflows = await this.getWorkflows();
            if (!workflows.success) {
                return workflows;
            }

            const workflow = workflows.workflows.find(w => w.name.includes(templateName));
            if (!workflow) {
                console.log(`No active workflow found for template: ${templateName}`);
                return { success: false, error: 'No active workflow found' };
            }

            return await this.executeWorkflow(workflow.id, eventData);
        } catch (error) {
            console.error('Error triggering workflow from event:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get workflow statistics
     */
    async getWorkflowStats() {
        try {
            const [workflowsResult, executionsResult] = await Promise.all([
                this.getWorkflows(),
                this.getExecutions(100)
            ]);

            if (!workflowsResult.success || !executionsResult.success) {
                return {
                    success: false,
                    error: 'Failed to fetch workflow statistics'
                };
            }

            const workflows = workflowsResult.workflows;
            const executions = executionsResult.executions;

            const stats = {
                totalWorkflows: workflows.length,
                activeWorkflows: workflows.filter(w => w.active).length,
                inactiveWorkflows: workflows.filter(w => !w.active).length,
                totalExecutions: executions.length,
                successfulExecutions: executions.filter(e => e.status === 'success').length,
                failedExecutions: executions.filter(e => e.status === 'error').length,
                runningExecutions: executions.filter(e => e.status === 'running').length,
                recentExecutions: executions.slice(0, 10)
            };

            return {
                success: true,
                stats: stats
            };
        } catch (error) {
            console.error('Error getting workflow stats:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = N8nIntegration;