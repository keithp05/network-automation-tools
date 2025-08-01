const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class UniversalSearch extends EventEmitter {
    constructor() {
        super();
        this.dataDir = path.join(__dirname, '../data');
        this.indexFile = path.join(this.dataDir, 'search-index.json');
        
        this.searchIndex = new Map();
        this.dataTypes = {
            device: { priority: 10, fields: ['hostname', 'ip', 'vendor', 'model', 'version'] },
            interface: { priority: 8, fields: ['name', 'description', 'ip', 'status'] },
            config: { priority: 7, fields: ['content', 'device', 'timestamp'] },
            policy: { priority: 9, fields: ['name', 'description', 'source', 'destination', 'action'] },
            credential: { priority: 5, fields: ['name', 'description', 'type'] },
            script: { priority: 6, fields: ['name', 'description', 'tags', 'author'] },
            topology: { priority: 7, fields: ['nodes', 'links', 'type'] },
            alert: { priority: 10, fields: ['message', 'severity', 'device', 'timestamp'] },
            log: { priority: 4, fields: ['message', 'level', 'source', 'timestamp'] }
        };
        
        this.loadIndex();
    }

    async loadIndex() {
        try {
            const indexData = await fs.readFile(this.indexFile, 'utf8');
            const parsed = JSON.parse(indexData);
            this.searchIndex = new Map(parsed);
            console.log(`🔍 Loaded search index with ${this.searchIndex.size} entries`);
        } catch (error) {
            console.log('📂 No existing search index found, starting fresh');
            await this.rebuildIndex();
        }
    }

    async saveIndex() {
        try {
            const indexData = JSON.stringify([...this.searchIndex]);
            await fs.writeFile(this.indexFile, indexData);
        } catch (error) {
            console.error('Error saving search index:', error);
        }
    }

    async rebuildIndex() {
        console.log('🔨 Rebuilding search index...');
        this.searchIndex.clear();
        
        // Index devices
        await this.indexDevices();
        
        // Index configurations
        await this.indexConfigurations();
        
        // Index policies
        await this.indexPolicies();
        
        // Index topology
        await this.indexTopology();
        
        // Index scripts
        await this.indexScripts();
        
        // Index logs
        await this.indexLogs();
        
        await this.saveIndex();
        console.log(`✅ Search index rebuilt with ${this.searchIndex.size} entries`);
    }

    async indexDevices() {
        try {
            const devicesFile = path.join(this.dataDir, 'devices.json');
            const data = await fs.readFile(devicesFile, 'utf8');
            const devices = JSON.parse(data);
            
            for (const device of devices) {
                const indexEntry = {
                    id: `device_${device.ip}`,
                    type: 'device',
                    title: device.hostname || device.ip,
                    data: device,
                    searchableText: this.createSearchableText(device, this.dataTypes.device.fields),
                    timestamp: device.lastDiscovered || new Date().toISOString()
                };
                
                this.searchIndex.set(indexEntry.id, indexEntry);
                
                // Index interfaces for this device
                if (device.interfaces) {
                    for (const intf of device.interfaces) {
                        const intfEntry = {
                            id: `interface_${device.ip}_${intf.name}`,
                            type: 'interface',
                            title: `${intf.name} on ${device.hostname || device.ip}`,
                            data: { ...intf, device: device.ip },
                            searchableText: this.createSearchableText(intf, this.dataTypes.interface.fields),
                            timestamp: device.lastDiscovered || new Date().toISOString()
                        };
                        
                        this.searchIndex.set(intfEntry.id, intfEntry);
                    }
                }
            }
        } catch (error) {
            console.error('Error indexing devices:', error);
        }
    }

    async indexConfigurations() {
        try {
            const configDir = path.join(this.dataDir, 'configs');
            const files = await fs.readdir(configDir).catch(() => []);
            
            for (const file of files) {
                if (file.endsWith('.conf')) {
                    const configPath = path.join(configDir, file);
                    const content = await fs.readFile(configPath, 'utf8');
                    const deviceIp = file.replace('.conf', '');
                    
                    const indexEntry = {
                        id: `config_${deviceIp}`,
                        type: 'config',
                        title: `Configuration for ${deviceIp}`,
                        data: {
                            device: deviceIp,
                            content: content.substring(0, 1000), // Store preview
                            fullPath: configPath
                        },
                        searchableText: content.toLowerCase(),
                        timestamp: (await fs.stat(configPath)).mtime.toISOString()
                    };
                    
                    this.searchIndex.set(indexEntry.id, indexEntry);
                }
            }
        } catch (error) {
            console.error('Error indexing configurations:', error);
        }
    }

    async indexPolicies() {
        try {
            const policiesFile = path.join(this.dataDir, 'policies.json');
            const data = await fs.readFile(policiesFile, 'utf8');
            const devices = JSON.parse(data);
            
            for (const [deviceId, deviceData] of Object.entries(devices)) {
                if (deviceData.policies) {
                    for (const policy of deviceData.policies) {
                        const indexEntry = {
                            id: `policy_${deviceId}_${policy.id || policy.name}`,
                            type: 'policy',
                            title: policy.name || `Policy ${policy.id}`,
                            data: { ...policy, device: deviceId },
                            searchableText: this.createSearchableText(policy, this.dataTypes.policy.fields),
                            timestamp: policy.timestamp || new Date().toISOString()
                        };
                        
                        this.searchIndex.set(indexEntry.id, indexEntry);
                    }
                }
            }
        } catch (error) {
            console.error('Error indexing policies:', error);
        }
    }

    async indexTopology() {
        try {
            const topologyFile = path.join(this.dataDir, 'topology.json');
            const data = await fs.readFile(topologyFile, 'utf8');
            const topology = JSON.parse(data);
            
            // Index topology as a whole
            const indexEntry = {
                id: 'topology_main',
                type: 'topology',
                title: 'Network Topology',
                data: {
                    nodeCount: topology.nodes?.length || 0,
                    linkCount: topology.links?.length || 0
                },
                searchableText: JSON.stringify(topology).toLowerCase(),
                timestamp: new Date().toISOString()
            };
            
            this.searchIndex.set(indexEntry.id, indexEntry);
            
            // Index individual nodes
            if (topology.nodes) {
                for (const node of topology.nodes) {
                    const nodeEntry = {
                        id: `topology_node_${node.id}`,
                        type: 'topology',
                        title: `Node: ${node.label || node.id}`,
                        data: node,
                        searchableText: this.createSearchableText(node, ['id', 'label', 'type', 'vendor']),
                        timestamp: new Date().toISOString()
                    };
                    
                    this.searchIndex.set(nodeEntry.id, nodeEntry);
                }
            }
        } catch (error) {
            console.error('Error indexing topology:', error);
        }
    }

    async indexScripts() {
        try {
            const scriptsDir = path.join(__dirname, '../scripts');
            const files = await fs.readdir(scriptsDir).catch(() => []);
            
            for (const file of files) {
                if (file.endsWith('.py')) {
                    const scriptPath = path.join(scriptsDir, file);
                    const content = await fs.readFile(scriptPath, 'utf8');
                    
                    // Extract metadata
                    const metadata = this.extractScriptMetadata(content);
                    
                    const indexEntry = {
                        id: `script_${file}`,
                        type: 'script',
                        title: metadata.name || file,
                        data: {
                            filename: file,
                            ...metadata,
                            preview: content.substring(0, 500)
                        },
                        searchableText: this.createSearchableText(
                            { ...metadata, content }, 
                            ['name', 'description', 'tags', 'content']
                        ),
                        timestamp: (await fs.stat(scriptPath)).mtime.toISOString()
                    };
                    
                    this.searchIndex.set(indexEntry.id, indexEntry);
                }
            }
        } catch (error) {
            console.error('Error indexing scripts:', error);
        }
    }

    async indexLogs() {
        try {
            const logsDir = path.join(__dirname, '../logs');
            const files = await fs.readdir(logsDir).catch(() => []);
            
            for (const file of files) {
                if (file.endsWith('.log')) {
                    const logPath = path.join(logsDir, file);
                    const content = await fs.readFile(logPath, 'utf8');
                    const lines = content.split('\n').slice(-100); // Last 100 lines
                    
                    const indexEntry = {
                        id: `log_${file}`,
                        type: 'log',
                        title: `Log: ${file}`,
                        data: {
                            filename: file,
                            lineCount: content.split('\n').length,
                            preview: lines.slice(-10).join('\n')
                        },
                        searchableText: lines.join(' ').toLowerCase(),
                        timestamp: (await fs.stat(logPath)).mtime.toISOString()
                    };
                    
                    this.searchIndex.set(indexEntry.id, indexEntry);
                }
            }
        } catch (error) {
            console.error('Error indexing logs:', error);
        }
    }

    createSearchableText(obj, fields) {
        const texts = [];
        
        for (const field of fields) {
            const value = obj[field];
            if (value) {
                if (Array.isArray(value)) {
                    texts.push(value.join(' '));
                } else if (typeof value === 'object') {
                    texts.push(JSON.stringify(value));
                } else {
                    texts.push(String(value));
                }
            }
        }
        
        return texts.join(' ').toLowerCase();
    }

    extractScriptMetadata(content) {
        const metadata = {
            name: '',
            description: '',
            tags: []
        };

        const metadataRegex = /#\s*@(\w+):\s*(.+)/g;
        let match;
        
        while ((match = metadataRegex.exec(content)) !== null) {
            const key = match[1].toLowerCase();
            const value = match[2].trim();
            
            if (key === 'tags') {
                metadata[key] = value.split(',').map(s => s.trim());
            } else if (metadata.hasOwnProperty(key)) {
                metadata[key] = value;
            }
        }

        return metadata;
    }

    async search(query, options = {}) {
        const {
            types = null,
            limit = 50,
            sortBy = 'relevance'
        } = options;

        const results = [];
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(' ').filter(t => t.length > 0);

        // Search through index
        for (const [id, entry] of this.searchIndex) {
            // Type filter
            if (types && !types.includes(entry.type)) {
                continue;
            }

            // Calculate relevance score
            let score = 0;
            const searchText = entry.searchableText;
            
            // Exact match bonus
            if (searchText.includes(queryLower)) {
                score += 10;
            }
            
            // Term matching
            for (const term of queryTerms) {
                if (searchText.includes(term)) {
                    score += 5;
                }
                
                // Title match bonus
                if (entry.title.toLowerCase().includes(term)) {
                    score += 15;
                }
            }
            
            // Type priority bonus
            const typePriority = this.dataTypes[entry.type]?.priority || 5;
            score += typePriority;
            
            // Recency bonus
            const age = Date.now() - new Date(entry.timestamp).getTime();
            const ageDays = age / (1000 * 60 * 60 * 24);
            score += Math.max(0, 10 - ageDays);
            
            if (score > 0) {
                results.push({
                    ...entry,
                    score: score
                });
            }
        }

        // Sort results
        if (sortBy === 'relevance') {
            results.sort((a, b) => b.score - a.score);
        } else if (sortBy === 'date') {
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else if (sortBy === 'type') {
            results.sort((a, b) => {
                const typeCompare = a.type.localeCompare(b.type);
                return typeCompare !== 0 ? typeCompare : b.score - a.score;
            });
        }

        // Apply limit
        const limitedResults = results.slice(0, limit);

        return {
            query: query,
            totalResults: results.length,
            results: limitedResults,
            facets: this.calculateFacets(results)
        };
    }

    calculateFacets(results) {
        const facets = {
            types: {},
            dates: {
                today: 0,
                week: 0,
                month: 0,
                older: 0
            }
        };

        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        for (const result of results) {
            // Type facets
            facets.types[result.type] = (facets.types[result.type] || 0) + 1;
            
            // Date facets
            const age = now - new Date(result.timestamp).getTime();
            if (age < day) {
                facets.dates.today++;
            } else if (age < 7 * day) {
                facets.dates.week++;
            } else if (age < 30 * day) {
                facets.dates.month++;
            } else {
                facets.dates.older++;
            }
        }

        return facets;
    }

    async quickSearch(query) {
        // Optimized search for autocomplete
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const [id, entry] of this.searchIndex) {
            if (entry.title.toLowerCase().includes(queryLower)) {
                results.push({
                    id: entry.id,
                    title: entry.title,
                    type: entry.type
                });
                
                if (results.length >= 10) {
                    break;
                }
            }
        }
        
        return results;
    }

    async indexNewItem(type, id, data) {
        const typeConfig = this.dataTypes[type];
        if (!typeConfig) {
            throw new Error(`Unknown data type: ${type}`);
        }

        const indexEntry = {
            id: `${type}_${id}`,
            type: type,
            title: data.title || data.name || id,
            data: data,
            searchableText: this.createSearchableText(data, typeConfig.fields),
            timestamp: data.timestamp || new Date().toISOString()
        };

        this.searchIndex.set(indexEntry.id, indexEntry);
        await this.saveIndex();
        
        this.emit('indexed', indexEntry);
        
        return indexEntry;
    }

    async removeFromIndex(id) {
        if (this.searchIndex.has(id)) {
            this.searchIndex.delete(id);
            await this.saveIndex();
            this.emit('removed', id);
            return true;
        }
        return false;
    }

    async exportSearchData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            totalEntries: this.searchIndex.size,
            types: {},
            entries: []
        };

        for (const [id, entry] of this.searchIndex) {
            exportData.types[entry.type] = (exportData.types[entry.type] || 0) + 1;
            exportData.entries.push({
                id: entry.id,
                type: entry.type,
                title: entry.title,
                timestamp: entry.timestamp
            });
        }

        return exportData;
    }
}

module.exports = UniversalSearch;