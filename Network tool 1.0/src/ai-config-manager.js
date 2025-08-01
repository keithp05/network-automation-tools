const fs = require('fs').promises;
const path = require('path');

class AIConfigManager {
    constructor() {
        this.documentationPath = path.join(__dirname, '../converted_texts');
        this.templatesPath = path.join(__dirname, '../templates');
        this.vendorDocs = {};
        this.loadDocumentation();
    }

    async loadDocumentation() {
        try {
            const files = await fs.readdir(this.documentationPath);
            console.log('📚 Loading vendor documentation...');
            
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const vendor = this.extractVendorFromFilename(file);
                    const content = await fs.readFile(path.join(this.documentationPath, file), 'utf8');
                    this.vendorDocs[vendor] = {
                        filename: file,
                        content: content,
                        size: content.length
                    };
                    console.log(`✅ Loaded ${vendor} documentation (${Math.round(content.length/1024)}KB)`);
                }
            }
        } catch (error) {
            console.error('❌ Error loading documentation:', error);
        }
    }

    extractVendorFromFilename(filename) {
        const vendors = {
            'cisco': ['cisco', 'cf-xe', 'fundamentals'],
            'fortinet': ['fortinet', 'fortigate', 'fortios'],
            'paloalto': ['pan-os', 'panorama'],
            'checkpoint': ['cp_', 'gaia', 'quantum'],
            'juniper': ['junos', 'cli'],
            'arista': ['cloudeos', 'veos'],
            'ubiquiti': ['ubiquiti', 'unifi', 'edgeos', 'edgemax', 'dream machine']
        };

        const lower = filename.toLowerCase();
        for (const [vendor, keywords] of Object.entries(vendors)) {
            if (keywords.some(keyword => lower.includes(keyword))) {
                return vendor;
            }
        }
        return 'unknown';
    }

    async generateConfig(vendor, deviceType, requirements) {
        console.log(`🤖 Generating ${vendor} ${deviceType} configuration...`);
        
        const template = await this.getTemplate(vendor, deviceType);
        const documentation = this.vendorDocs[vendor]?.content || '';
        
        // Use AI-like logic to generate configuration
        const config = await this.aiConfigGeneration(template, documentation, requirements);
        
        return {
            vendor: vendor,
            deviceType: deviceType,
            config: config,
            timestamp: new Date().toISOString(),
            requirements: requirements
        };
    }

    async aiConfigGeneration(template, documentation, requirements) {
        // This simulates AI config generation using the loaded documentation
        let config = template;
        
        // Apply requirements to template
        if (requirements.hostname) {
            config = config.replace(/{{HOSTNAME}}/g, requirements.hostname);
        }
        
        if (requirements.interfaces) {
            let interfaceConfig = '';
            requirements.interfaces.forEach(iface => {
                interfaceConfig += this.generateInterfaceConfig(iface, requirements.vendor);
            });
            config = config.replace(/{{INTERFACES}}/g, interfaceConfig);
        }

        if (requirements.vlans) {
            let vlanConfig = '';
            requirements.vlans.forEach(vlan => {
                vlanConfig += this.generateVlanConfig(vlan, requirements.vendor);
            });
            config = config.replace(/{{VLANS}}/g, vlanConfig);
        }

        if (requirements.routing) {
            const routingConfig = this.generateRoutingConfig(requirements.routing, requirements.vendor);
            config = config.replace(/{{ROUTING}}/g, routingConfig);
        }

        if (requirements.security) {
            const securityConfig = this.generateSecurityConfig(requirements.security, requirements.vendor);
            config = config.replace(/{{SECURITY}}/g, securityConfig);
        }

        return config;
    }

    async getTemplate(vendor, deviceType) {
        const templateFile = path.join(this.templatesPath, vendor, `${deviceType}.txt`);
        
        try {
            return await fs.readFile(templateFile, 'utf8');
        } catch (error) {
            // Return basic template if specific one doesn't exist
            return this.getBasicTemplate(vendor, deviceType);
        }
    }

    getBasicTemplate(vendor, deviceType) {
        const templates = {
            cisco: {
                router: `hostname {{HOSTNAME}}
!
{{INTERFACES}}
!
{{VLANS}}
!
{{ROUTING}}
!
{{SECURITY}}
!
end`,
                switch: `hostname {{HOSTNAME}}
!
vtp mode transparent
!
{{VLANS}}
!
{{INTERFACES}}
!
{{SECURITY}}
!
end`
            },
            fortinet: {
                firewall: `config system global
    set hostname "{{HOSTNAME}}"
end
{{INTERFACES}}
{{VLANS}}
{{ROUTING}}
{{SECURITY}}`
            },
            paloalto: {
                firewall: `set deviceconfig system hostname {{HOSTNAME}}
{{INTERFACES}}
{{VLANS}}
{{ROUTING}}
{{SECURITY}}`
            },
            checkpoint: {
                firewall: `set hostname {{HOSTNAME}}
{{INTERFACES}}
{{ROUTING}}
{{SECURITY}}`
            },
            juniper: {
                router: `set system host-name {{HOSTNAME}}
{{INTERFACES}}
{{VLANS}}
{{ROUTING}}
{{SECURITY}}`
            },
            arista: {
                switch: `hostname {{HOSTNAME}}
!
{{VLANS}}
!
{{INTERFACES}}
!
{{ROUTING}}
!
{{SECURITY}}
!`
            },
            ubiquiti: {
                router: `# UniFi Router Configuration for {{HOSTNAME}}
configure

set system host-name {{HOSTNAME}}
{{INTERFACES}}
{{VLANS}}
{{ROUTING}}
{{SECURITY}}

commit
save
exit`,
                switch: `# UniFi Switch Configuration for {{HOSTNAME}}
# Note: UniFi switches are typically managed via UniFi Controller
# This configuration shows CLI equivalent commands

configure

set system host-name {{HOSTNAME}}
{{VLANS}}
{{INTERFACES}}
{{SECURITY}}

commit
save
exit`,
                firewall: `# UniFi Security Gateway Configuration for {{HOSTNAME}}
configure

set system host-name {{HOSTNAME}}
{{INTERFACES}}
{{ROUTING}}
{{SECURITY}}

commit
save
exit`
            }
        };

        return templates[vendor]?.[deviceType] || `hostname {{HOSTNAME}}
{{INTERFACES}}
{{VLANS}}
{{ROUTING}}
{{SECURITY}}`;
    }

    generateInterfaceConfig(iface, vendor) {
        const configs = {
            cisco: `interface ${iface.name}
 description ${iface.description || 'Interface'}
 ip address ${iface.ip} ${iface.netmask}
 no shutdown
!`,
            fortinet: `config system interface
    edit "${iface.name}"
        set description "${iface.description || 'Interface'}"
        set ip ${iface.ip} ${iface.netmask}
        set allowaccess ping ssh
    next
end`,
            paloalto: `set network interface ethernet ${iface.name} layer3 ip ${iface.ip}/${this.netmaskToCidr(iface.netmask)}`,
            juniper: `set interfaces ${iface.name} description "${iface.description || 'Interface'}"
set interfaces ${iface.name} unit 0 family inet address ${iface.ip}/${this.netmaskToCidr(iface.netmask)}`,
            arista: `interface ${iface.name}
   description ${iface.description || 'Interface'}
   ip address ${iface.ip}/${this.netmaskToCidr(iface.netmask)}
   no shutdown
!`,
            ubiquiti: `set interfaces ethernet ${iface.name} description "${iface.description || 'Interface'}"
set interfaces ethernet ${iface.name} address ${iface.ip}/${this.netmaskToCidr(iface.netmask)}
set interfaces ethernet ${iface.name} duplex auto
set interfaces ethernet ${iface.name} speed auto`
        };

        return configs[vendor] || configs.cisco;
    }

    generateVlanConfig(vlan, vendor) {
        const configs = {
            cisco: `vlan ${vlan.id}
 name ${vlan.name}
!`,
            fortinet: `config system switch-interface
    edit "${vlan.name}"
        set vlanid ${vlan.id}
        set description "${vlan.description || vlan.name}"
    next
end`,
            juniper: `set vlans ${vlan.name} vlan-id ${vlan.id}
set vlans ${vlan.name} description "${vlan.description || vlan.name}"`,
            arista: `vlan ${vlan.id}
   name ${vlan.name}
!`
        };

        return configs[vendor] || configs.cisco;
    }

    generateRoutingConfig(routing, vendor) {
        let config = '';
        
        if (routing.static) {
            routing.static.forEach(route => {
                const configs = {
                    cisco: `ip route ${route.network} ${route.netmask} ${route.gateway}\n`,
                    fortinet: `config router static
    edit 0
        set dst ${route.network} ${route.netmask}
        set gateway ${route.gateway}
    next
end`,
                    juniper: `set routing-options static route ${route.network}/${this.netmaskToCidr(route.netmask)} next-hop ${route.gateway}`,
                    arista: `ip route ${route.network}/${this.netmaskToCidr(route.netmask)} ${route.gateway}`
                };
                
                config += configs[vendor] || configs.cisco;
            });
        }

        if (routing.ospf) {
            const ospfConfigs = {
                cisco: `router ospf ${routing.ospf.processId || 1}
 router-id ${routing.ospf.routerId}
 network ${routing.ospf.network} ${routing.ospf.wildcard} area ${routing.ospf.area || 0}
!`,
                juniper: `set protocols ospf area ${routing.ospf.area || 0} interface ${routing.ospf.interface}`
            };
            
            config += ospfConfigs[vendor] || ospfConfigs.cisco;
        }

        return config;
    }

    generateSecurityConfig(security, vendor) {
        let config = '';

        if (security.acl) {
            security.acl.forEach(acl => {
                const configs = {
                    cisco: `access-list ${acl.name} ${acl.action} ${acl.source} ${acl.destination}\n`,
                    fortinet: `config firewall policy
    edit 0
        set name "${acl.name}"
        set srcintf "${acl.srcintf || 'any'}"
        set dstintf "${acl.dstintf || 'any'}"
        set srcaddr "${acl.source || 'all'}"
        set dstaddr "${acl.destination || 'all'}"
        set action ${acl.action}
        set schedule "always"
        set service "ALL"
    next
end`
                };
                
                config += configs[vendor] || configs.cisco;
            });
        }

        if (security.users) {
            security.users.forEach(user => {
                const configs = {
                    cisco: `username ${user.name} privilege ${user.privilege || 15} password ${user.password}\n`,
                    fortinet: `config system admin
    edit "${user.name}"
        set password ${user.password}
        set accprofile "${user.profile || 'super_admin'}"
    next
end`
                };
                
                config += configs[vendor] || configs.cisco;
            });
        }

        return config;
    }

    netmaskToCidr(netmask) {
        const cidrMap = {
            '255.255.255.255': 32,
            '255.255.255.254': 31,
            '255.255.255.252': 30,
            '255.255.255.248': 29,
            '255.255.255.240': 28,
            '255.255.255.224': 27,
            '255.255.255.192': 26,
            '255.255.255.128': 25,
            '255.255.255.0': 24,
            '255.255.254.0': 23,
            '255.255.252.0': 22,
            '255.255.248.0': 21,
            '255.255.240.0': 20,
            '255.255.224.0': 19,
            '255.255.192.0': 18,
            '255.255.128.0': 17,
            '255.255.0.0': 16,
            '255.254.0.0': 15,
            '255.252.0.0': 14,
            '255.248.0.0': 13,
            '255.240.0.0': 12,
            '255.224.0.0': 11,
            '255.192.0.0': 10,
            '255.128.0.0': 9,
            '255.0.0.0': 8
        };
        
        return cidrMap[netmask] || 24;
    }

    async searchDocumentation(query, vendor = null) {
        const results = [];
        const searchVendors = vendor ? [vendor] : Object.keys(this.vendorDocs);
        
        for (const v of searchVendors) {
            if (this.vendorDocs[v]) {
                const content = this.vendorDocs[v].content.toLowerCase();
                const queryLower = query.toLowerCase();
                
                if (content.includes(queryLower)) {
                    // Find context around the match
                    const index = content.indexOf(queryLower);
                    const start = Math.max(0, index - 200);
                    const end = Math.min(content.length, index + 200);
                    const context = this.vendorDocs[v].content.substring(start, end);
                    
                    results.push({
                        vendor: v,
                        filename: this.vendorDocs[v].filename,
                        context: context,
                        relevance: this.calculateRelevance(query, context)
                    });
                }
            }
        }
        
        return results.sort((a, b) => b.relevance - a.relevance);
    }

    calculateRelevance(query, context) {
        const queryWords = query.toLowerCase().split(' ');
        const contextLower = context.toLowerCase();
        let score = 0;
        
        queryWords.forEach(word => {
            const matches = (contextLower.match(new RegExp(word, 'g')) || []).length;
            score += matches;
        });
        
        return score;
    }

    getAvailableVendors() {
        return Object.keys(this.vendorDocs).filter(vendor => vendor !== 'unknown');
    }

    getDocumentationSummary() {
        const summary = {};
        Object.keys(this.vendorDocs).forEach(vendor => {
            summary[vendor] = {
                filename: this.vendorDocs[vendor].filename,
                size: Math.round(this.vendorDocs[vendor].size / 1024) + 'KB',
                pages: Math.round(this.vendorDocs[vendor].content.split('\n--- Page').length)
            };
        });
        return summary;
    }
}

module.exports = AIConfigManager;