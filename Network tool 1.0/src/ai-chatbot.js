const AIConfigManager = require('./ai-config-manager');

class NetworkAIChatbot {
    constructor() {
        this.configManager = new AIConfigManager();
        this.conversationHistory = [];
        this.context = {
            currentTopic: null,
            deviceContext: null,
            troubleshootingSession: null
        };
    }

    async processMessage(message, sessionId = 'default') {
        try {
            console.log(`🤖 Processing message: ${message.substring(0, 50)}...`);
            
            // Add to conversation history
            this.conversationHistory.push({
                timestamp: new Date().toISOString(),
                sessionId: sessionId,
                type: 'user',
                message: message
            });

            // Analyze intent
            const intent = this.analyzeIntent(message);
            console.log(`🎯 Detected intent: ${intent.type}`);

            // Process based on intent
            let response;
            switch (intent.type) {
                case 'config_generation':
                    response = await this.handleConfigGeneration(intent.params, message);
                    break;
                case 'troubleshooting':
                    response = await this.handleTroubleshooting(intent.params, message);
                    break;
                case 'documentation_search':
                    response = await this.handleDocumentationSearch(intent.params, message);
                    break;
                case 'policy_question':
                    response = await this.handlePolicyQuestion(intent.params, message);
                    break;
                case 'interface_question':
                    response = await this.handleInterfaceQuestion(intent.params, message);
                    break;
                case 'general_help':
                    response = this.handleGeneralHelp(message);
                    break;
                default:
                    response = this.handleUnknownIntent(message);
            }

            // Add response to history
            this.conversationHistory.push({
                timestamp: new Date().toISOString(),
                sessionId: sessionId,
                type: 'assistant',
                message: response.text,
                data: response.data || null
            });

            return response;

        } catch (error) {
            console.error('❌ Chatbot error:', error);
            return {
                text: "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.",
                error: true
            };
        }
    }

    analyzeIntent(message) {
        const lower = message.toLowerCase();
        
        // Config generation keywords
        if (this.containsKeywords(lower, ['config', 'configure', 'setup', 'generate', 'create'])) {
            return {
                type: 'config_generation',
                params: this.extractConfigParams(message)
            };
        }

        // Troubleshooting keywords
        if (this.containsKeywords(lower, ['problem', 'issue', 'not working', 'down', 'error', 'troubleshoot', 'fix'])) {
            return {
                type: 'troubleshooting',
                params: this.extractTroubleshootingParams(message)
            };
        }

        // Documentation search
        if (this.containsKeywords(lower, ['how to', 'documentation', 'manual', 'guide', 'help with'])) {
            return {
                type: 'documentation_search',
                params: { query: message }
            };
        }

        // Policy questions
        if (this.containsKeywords(lower, ['policy', 'firewall', 'acl', 'access', 'block', 'allow'])) {
            return {
                type: 'policy_question',
                params: this.extractPolicyParams(message)
            };
        }

        // Interface questions
        if (this.containsKeywords(lower, ['interface', 'port', 'link', 'status', 'statistics', 'stats'])) {
            return {
                type: 'interface_question',
                params: this.extractInterfaceParams(message)
            };
        }

        // General help
        if (this.containsKeywords(lower, ['help', 'what can you do', 'capabilities'])) {
            return { type: 'general_help', params: {} };
        }

        return { type: 'unknown', params: {} };
    }

    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    extractConfigParams(message) {
        const params = {};
        const lower = message.toLowerCase();

        // Extract vendor
        const vendors = ['cisco', 'fortinet', 'paloalto', 'checkpoint', 'juniper', 'arista'];
        params.vendor = vendors.find(vendor => lower.includes(vendor)) || null;

        // Extract device type
        const deviceTypes = ['router', 'switch', 'firewall', 'gateway'];
        params.deviceType = deviceTypes.find(type => lower.includes(type)) || null;

        // Extract hostname
        const hostnameMatch = message.match(/hostname[:\s]+(\w+)/i);
        params.hostname = hostnameMatch ? hostnameMatch[1] : null;

        // Extract IP addresses
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        params.ipAddresses = message.match(ipRegex) || [];

        // Extract VLANs
        const vlanMatch = message.match(/vlan[:\s]+(\d+)/gi);
        params.vlans = vlanMatch ? vlanMatch.map(v => v.replace(/vlan[:\s]+/i, '')) : [];

        return params;
    }

    extractTroubleshootingParams(message) {
        const params = {};
        const lower = message.toLowerCase();

        // Extract problem type
        if (lower.includes('connection') || lower.includes('connectivity')) params.problemType = 'connectivity';
        else if (lower.includes('slow') || lower.includes('performance')) params.problemType = 'performance';
        else if (lower.includes('config') || lower.includes('configuration')) params.problemType = 'configuration';
        else if (lower.includes('interface') || lower.includes('port')) params.problemType = 'interface';
        else params.problemType = 'general';

        // Extract device info
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        params.deviceIp = message.match(ipRegex)?.[0] || null;

        return params;
    }

    extractPolicyParams(message) {
        const params = {};
        const lower = message.toLowerCase();

        // Extract action
        if (lower.includes('block') || lower.includes('deny')) params.action = 'deny';
        else if (lower.includes('allow') || lower.includes('permit')) params.action = 'permit';

        // Extract IP addresses
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        params.ipAddresses = message.match(ipRegex) || [];

        // Extract ports
        const portMatch = message.match(/port[:\s]+(\d+)/gi);
        params.ports = portMatch ? portMatch.map(p => p.replace(/port[:\s]+/i, '')) : [];

        return params;
    }

    extractInterfaceParams(message) {
        const params = {};
        
        // Extract interface names
        const interfaceMatch = message.match(/(ethernet|gigabitethernet|fastethernet|ge-|fe-|eth)[\d\/\-\.]+/gi);
        params.interfaces = interfaceMatch || [];

        return params;
    }

    async handleConfigGeneration(params, originalMessage) {
        try {
            // If we don't have enough params, ask for clarification
            if (!params.vendor || !params.deviceType) {
                return {
                    text: `I'd be happy to help generate a configuration! To provide the best assistance, I need a few more details:

${!params.vendor ? '• Which vendor? (Cisco, Fortinet, Palo Alto, CheckPoint, Juniper, Arista)' : ''}
${!params.deviceType ? '• What type of device? (Router, Switch, Firewall)' : ''}

For example: "Generate a Cisco router configuration with hostname RTR01"`,
                    needsMoreInfo: true
                };
            }

            // Build requirements object
            const requirements = {
                vendor: params.vendor,
                hostname: params.hostname || 'Device01'
            };

            // Add interfaces if IP addresses were mentioned
            if (params.ipAddresses.length > 0) {
                requirements.interfaces = params.ipAddresses.map((ip, index) => ({
                    name: this.getDefaultInterfaceName(params.vendor, index),
                    ip: ip,
                    netmask: '255.255.255.0',
                    description: `Interface ${index + 1}`
                }));
            }

            // Add VLANs if mentioned
            if (params.vlans.length > 0) {
                requirements.vlans = params.vlans.map(vlanId => ({
                    id: vlanId,
                    name: `VLAN${vlanId}`,
                    description: `VLAN ${vlanId}`
                }));
            }

            // Generate configuration
            const config = await this.configManager.generateConfig(params.vendor, params.deviceType, requirements);

            return {
                text: `I've generated a ${params.vendor} ${params.deviceType} configuration based on your requirements. Here's the configuration:

\`\`\`
${config.config}
\`\`\`

This configuration includes:
${requirements.interfaces ? `• ${requirements.interfaces.length} interface(s)` : ''}
${requirements.vlans ? `• ${requirements.vlans.length} VLAN(s)` : ''}
• Basic security settings
• Standard routing configuration

Would you like me to modify any part of this configuration or add additional features?`,
                data: {
                    type: 'configuration',
                    vendor: params.vendor,
                    deviceType: params.deviceType,
                    config: config.config,
                    requirements: requirements
                }
            };

        } catch (error) {
            return {
                text: "I encountered an error generating the configuration. Please check your requirements and try again.",
                error: true
            };
        }
    }

    async handleTroubleshooting(params, originalMessage) {
        const troubleshootingGuides = {
            connectivity: `For connectivity issues, let's go through these steps:

1. **Physical Layer Check**
   • Verify all cables are properly connected
   • Check interface status: \`show ip interface brief\`
   • Look for link lights on ports

2. **Network Layer Check**
   • Ping the gateway: \`ping [gateway-ip]\`
   • Check routing table: \`show ip route\`
   • Verify IP configuration

3. **Application Layer Check**
   • Test specific services (HTTP, SSH, etc.)
   • Check firewall rules
   • Verify DNS resolution

Would you like me to help you with any specific step?`,

            performance: `For performance issues, let's check:

1. **Interface Statistics**
   • Check for errors: \`show interface [interface]\`
   • Look for drops, collisions, or CRC errors
   • Monitor bandwidth utilization

2. **CPU and Memory**
   • Check CPU usage: \`show processes cpu\`
   • Check memory: \`show memory\`

3. **Network Path**
   • Traceroute to destination
   • Check for packet loss
   • Verify QoS settings

What specific performance issue are you experiencing?`,

            configuration: `For configuration issues:

1. **Syntax Check**
   • Review configuration syntax
   • Check for typos in commands
   • Verify proper indentation (for some vendors)

2. **Logical Check**
   • Ensure IP addresses don't conflict
   • Verify VLAN assignments
   • Check routing consistency

3. **Apply and Test**
   • Save configuration
   • Test connectivity
   • Monitor logs for errors

What specific configuration are you having trouble with?`,

            interface: `For interface issues:

1. **Physical Status**
   • \`show interface [interface]\`
   • Check cable connections
   • Verify port speeds/duplex

2. **Configuration**
   • \`show running-config interface [interface]\`
   • Check IP assignments
   • Verify VLAN settings

3. **Statistics**
   • Look for input/output errors
   • Check packet counters
   • Monitor link flapping

Which interface are you having issues with?`
        };

        const guide = troubleshootingGuides[params.problemType] || troubleshootingGuides.connectivity;
        
        return {
            text: guide,
            data: {
                type: 'troubleshooting',
                problemType: params.problemType,
                deviceIp: params.deviceIp
            }
        };
    }

    async handleDocumentationSearch(params, originalMessage) {
        try {
            const results = await this.configManager.searchDocumentation(params.query);
            
            if (results.length === 0) {
                return {
                    text: `I couldn't find specific documentation for "${params.query}". Try rephrasing your question or being more specific about the vendor and feature you're looking for.

Available documentation:
${Object.keys(this.configManager.vendorDocs).map(vendor => `• ${vendor.charAt(0).toUpperCase() + vendor.slice(1)}`).join('\n')}`,
                    data: { type: 'no_results', query: params.query }
                };
            }

            const topResults = results.slice(0, 3);
            let response = `Found relevant information in the documentation:\n\n`;

            topResults.forEach((result, index) => {
                response += `**${result.vendor.toUpperCase()} Documentation:**\n`;
                response += `${result.context.trim()}\n\n`;
            });

            response += `\nWould you like me to search for more specific information or help you with configuration based on this documentation?`;

            return {
                text: response,
                data: {
                    type: 'documentation_results',
                    query: params.query,
                    results: topResults
                }
            };

        } catch (error) {
            return {
                text: "I had trouble searching the documentation. Please try rephrasing your question.",
                error: true
            };
        }
    }

    async handlePolicyQuestion(params, originalMessage) {
        let response = `I can help you with firewall policies and access control lists!\n\n`;

        if (params.action && params.ipAddresses.length > 0) {
            response += `Here's a sample policy to ${params.action} traffic from ${params.ipAddresses.join(', ')}:\n\n`;
            
            // Generate sample policies for different vendors
            const policies = {
                cisco: `access-list 100 ${params.action} ip ${params.ipAddresses[0]} 0.0.0.255 any`,
                fortinet: `config firewall policy
    edit 0
        set srcaddr "${params.ipAddresses[0]}/24"
        set dstaddr "all"
        set action ${params.action}
    next
end`,
                paloalto: `set rulebase security rules rule1 from any to any source ${params.ipAddresses[0]} action ${params.action}`
            };

            Object.entries(policies).forEach(([vendor, config]) => {
                response += `**${vendor.toUpperCase()}:**\n\`\`\`\n${config}\n\`\`\`\n\n`;
            });
        } else {
            response += `To help you create firewall policies, I need:
• Source and destination IP addresses or networks
• Action (allow/deny)
• Specific ports or services (optional)
• Vendor platform

Example: "Create a policy to block 192.168.1.0/24 from accessing 10.0.0.0/8"`;
        }

        return {
            text: response,
            data: {
                type: 'policy_help',
                params: params
            }
        };
    }

    async handleInterfaceQuestion(params, originalMessage) {
        let response = `I can help you with interface configuration and monitoring!\n\n`;

        if (params.interfaces.length > 0) {
            response += `For interface ${params.interfaces[0]}, here are common commands:\n\n`;
            
            const commands = {
                cisco: [
                    `show interface ${params.interfaces[0]}`,
                    `show interface ${params.interfaces[0]} status`,
                    `show interface ${params.interfaces[0]} counters`
                ],
                juniper: [
                    `show interfaces ${params.interfaces[0]}`,
                    `show interfaces ${params.interfaces[0]} extensive`,
                    `show interfaces ${params.interfaces[0]} statistics`
                ]
            };

            Object.entries(commands).forEach(([vendor, cmds]) => {
                response += `**${vendor.toUpperCase()}:**\n`;
                cmds.forEach(cmd => response += `• \`${cmd}\`\n`);
                response += '\n';
            });
        } else {
            response += `Common interface tasks I can help with:
• Interface status and statistics
• Configuration troubleshooting
• Performance monitoring
• VLAN assignments
• Speed/duplex settings

What specific interface issue are you facing?`;
        }

        return {
            text: response,
            data: {
                type: 'interface_help',
                interfaces: params.interfaces
            }
        };
    }

    handleGeneralHelp(message) {
        return {
            text: `Hello! I'm your Network AI Assistant. I can help you with:

🔧 **Configuration Generation**
• Generate configs for Cisco, Fortinet, Palo Alto, CheckPoint, Juniper, Arista
• Router, switch, and firewall configurations
• VLAN, routing, and security setups

🔍 **Troubleshooting**
• Connectivity issues
• Performance problems
• Configuration errors
• Interface problems

📚 **Documentation Search**
• Search through vendor documentation
• Find specific commands and procedures
• Get configuration examples

🛡️ **Security Policies**
• Firewall rule creation
• Access control lists
• Security best practices

📊 **Interface Management**
• Interface status and statistics
• Configuration assistance
• Performance monitoring

Just ask me something like:
• "Generate a Cisco router config"
• "Help troubleshoot connectivity issues"
• "How to configure OSPF on Juniper"
• "Create firewall policy to block 192.168.1.0/24"

What would you like help with?`,
            data: { type: 'help' }
        };
    }

    handleUnknownIntent(message) {
        return {
            text: `I'm not sure I understand exactly what you're looking for. I can help with:

• Network device configuration
• Troubleshooting connectivity issues  
• Searching vendor documentation
• Creating firewall policies
• Interface management

Could you please rephrase your question or be more specific about what you need help with?`,
            data: { type: 'clarification_needed' }
        };
    }

    getDefaultInterfaceName(vendor, index) {
        const names = {
            cisco: `GigabitEthernet0/${index + 1}`,
            fortinet: `port${index + 1}`,
            paloalto: `ethernet1/${index + 1}`,
            juniper: `ge-0/0/${index}`,
            arista: `Ethernet${index + 1}`
        };
        
        return names[vendor] || `eth${index}`;
    }

    getConversationHistory(sessionId = 'default', limit = 10) {
        return this.conversationHistory
            .filter(msg => msg.sessionId === sessionId)
            .slice(-limit);
    }

    clearConversation(sessionId = 'default') {
        this.conversationHistory = this.conversationHistory.filter(msg => msg.sessionId !== sessionId);
    }
}

module.exports = NetworkAIChatbot;