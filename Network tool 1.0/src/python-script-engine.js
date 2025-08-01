const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

class PythonScriptEngine {
    constructor() {
        this.scriptsDir = path.join(__dirname, '../scripts');
        this.dataDir = path.join(__dirname, '../data');
        this.logsDir = path.join(__dirname, '../logs/scripts');
        this.tempDir = path.join(__dirname, '../temp');
        
        this.runningScripts = new Map();
        this.scriptLibrary = new Map();
        this.scriptResults = new Map();
        
        this.initializeDirectories();
        this.loadScriptLibrary();
    }

    async initializeDirectories() {
        const dirs = [this.scriptsDir, this.dataDir, this.logsDir, this.tempDir];
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`Error creating directory ${dir}:`, error);
            }
        }
    }

    async loadScriptLibrary() {
        try {
            const files = await fs.readdir(this.scriptsDir);
            for (const file of files) {
                if (file.endsWith('.py')) {
                    const scriptPath = path.join(this.scriptsDir, file);
                    const content = await fs.readFile(scriptPath, 'utf8');
                    const metadata = this.extractScriptMetadata(content);
                    
                    this.scriptLibrary.set(file, {
                        name: file,
                        path: scriptPath,
                        content: content,
                        metadata: metadata,
                        lastModified: (await fs.stat(scriptPath)).mtime
                    });
                }
            }
            console.log(`📚 Loaded ${this.scriptLibrary.size} Python scripts`);
        } catch (error) {
            console.error('Error loading script library:', error);
        }
    }

    extractScriptMetadata(content) {
        const metadata = {
            name: '',
            description: '',
            author: '',
            version: '1.0',
            requires: [],
            tags: [],
            parameters: []
        };

        // Extract metadata from script comments
        const metadataRegex = /#\s*@(\w+):\s*(.+)/g;
        let match;
        
        while ((match = metadataRegex.exec(content)) !== null) {
            const key = match[1].toLowerCase();
            const value = match[2].trim();
            
            if (key === 'requires' || key === 'tags') {
                metadata[key] = value.split(',').map(s => s.trim());
            } else if (key === 'parameters') {
                // Parse JSON parameters
                try {
                    metadata[key] = JSON.parse(value);
                } catch (e) {
                    metadata[key] = [];
                }
            } else if (metadata.hasOwnProperty(key)) {
                metadata[key] = value;
            }
        }

        return metadata;
    }

    async executeScript(scriptName, parameters = {}, options = {}) {
        const scriptId = crypto.randomBytes(16).toString('hex');
        const script = this.scriptLibrary.get(scriptName);
        
        if (!script) {
            throw new Error(`Script '${scriptName}' not found in library`);
        }

        const execution = {
            id: scriptId,
            scriptName: scriptName,
            status: 'running',
            startTime: new Date(),
            parameters: parameters,
            output: [],
            errors: [],
            result: null
        };

        this.runningScripts.set(scriptId, execution);

        try {
            // Create temporary script file with injected parameters
            const tempScriptPath = path.join(this.tempDir, `${scriptId}.py`);
            const scriptContent = this.prepareScript(script.content, parameters);
            await fs.writeFile(tempScriptPath, scriptContent);

            // Execute Python script
            const result = await this.runPythonScript(tempScriptPath, execution, options);
            
            execution.status = 'completed';
            execution.endTime = new Date();
            execution.result = result;
            
            // Store results
            this.scriptResults.set(scriptId, execution);
            
            // Cleanup
            await fs.unlink(tempScriptPath).catch(() => {});
            this.runningScripts.delete(scriptId);
            
            return execution;

        } catch (error) {
            execution.status = 'failed';
            execution.endTime = new Date();
            execution.errors.push(error.message);
            
            this.scriptResults.set(scriptId, execution);
            this.runningScripts.delete(scriptId);
            
            throw error;
        }
    }

    prepareScript(scriptContent, parameters) {
        // Inject parameters as Python variables
        let preparedScript = '#!/usr/bin/env python3\n';
        preparedScript += '# Auto-generated script with parameters\n\n';
        
        // Add parameter definitions
        preparedScript += '# Script Parameters\n';
        for (const [key, value] of Object.entries(parameters)) {
            if (typeof value === 'string') {
                preparedScript += `${key} = "${value}"\n`;
            } else if (typeof value === 'object') {
                preparedScript += `${key} = ${JSON.stringify(value)}\n`;
            } else {
                preparedScript += `${key} = ${value}\n`;
            }
        }
        
        // Add network data access functions
        preparedScript += '\n# Network Data Access Functions\n';
        preparedScript += this.getDataAccessFunctions();
        
        preparedScript += '\n# Original Script Content\n';
        preparedScript += scriptContent;
        
        return preparedScript;
    }

    getDataAccessFunctions() {
        return `
import json
import os
import sys

# Add project modules to path
sys.path.insert(0, '${path.join(__dirname, '../')}')

def get_network_devices():
    """Get all discovered network devices"""
    try:
        with open('${path.join(this.dataDir, 'devices.json')}', 'r') as f:
            return json.load(f)
    except:
        return []

def get_device_config(device_ip):
    """Get configuration for a specific device"""
    try:
        config_file = os.path.join('${this.dataDir}', 'configs', f'{device_ip}.conf')
        with open(config_file, 'r') as f:
            return f.read()
    except:
        return None

def get_network_topology():
    """Get network topology data"""
    try:
        with open('${path.join(this.dataDir, 'topology.json')}', 'r') as f:
            return json.load(f)
    except:
        return {"nodes": [], "links": []}

def get_interface_stats(device_ip):
    """Get interface statistics for a device"""
    try:
        stats_file = os.path.join('${this.dataDir}', 'stats', f'{device_ip}_interfaces.json')
        with open(stats_file, 'r') as f:
            return json.load(f)
    except:
        return []

def save_result(key, value):
    """Save a result that can be accessed by other scripts"""
    results_file = os.path.join('${this.dataDir}', 'script_results.json')
    try:
        with open(results_file, 'r') as f:
            results = json.load(f)
    except:
        results = {}
    
    results[key] = value
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)

def log_message(message, level='INFO'):
    """Log a message to the script execution log"""
    print(f"[{level}] {message}")

# Network utilities
def ping_device(ip):
    """Ping a device and return True if reachable"""
    import subprocess
    try:
        subprocess.check_output(['ping', '-c', '1', '-W', '2', ip])
        return True
    except:
        return False

def execute_ssh_command(host, username, password, command):
    """Execute SSH command on a device"""
    # This would use paramiko or similar
    # Placeholder for now
    return f"SSH command '{command}' would be executed on {host}"
`;
    }

    runPythonScript(scriptPath, execution, options) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python3', [scriptPath], {
                cwd: this.tempDir,
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                execution.output.push({
                    type: 'stdout',
                    data: output,
                    timestamp: new Date()
                });
                
                // Emit real-time output if callback provided
                if (options.onOutput) {
                    options.onOutput(output);
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                const error = data.toString();
                stderr += error;
                execution.errors.push({
                    type: 'stderr',
                    data: error,
                    timestamp: new Date()
                });
                
                if (options.onError) {
                    options.onError(error);
                }
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        exitCode: code,
                        stdout: stdout,
                        stderr: stderr
                    });
                } else {
                    reject(new Error(`Script exited with code ${code}: ${stderr}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(error);
            });

            // Handle timeout
            if (options.timeout) {
                setTimeout(() => {
                    pythonProcess.kill();
                    reject(new Error('Script execution timeout'));
                }, options.timeout);
            }
        });
    }

    async saveScript(name, content, metadata = {}) {
        const scriptPath = path.join(this.scriptsDir, name);
        
        // Add metadata to script header
        let scriptWithMetadata = '#!/usr/bin/env python3\n';
        scriptWithMetadata += '# -*- coding: utf-8 -*-\n\n';
        
        // Add metadata comments
        scriptWithMetadata += '# Script Metadata\n';
        scriptWithMetadata += `# @name: ${metadata.name || name}\n`;
        scriptWithMetadata += `# @description: ${metadata.description || 'No description'}\n`;
        scriptWithMetadata += `# @author: ${metadata.author || 'Unknown'}\n`;
        scriptWithMetadata += `# @version: ${metadata.version || '1.0'}\n`;
        scriptWithMetadata += `# @tags: ${(metadata.tags || []).join(', ')}\n`;
        scriptWithMetadata += `# @requires: ${(metadata.requires || []).join(', ')}\n`;
        scriptWithMetadata += `# @parameters: ${JSON.stringify(metadata.parameters || [])}\n\n`;
        
        scriptWithMetadata += content;
        
        await fs.writeFile(scriptPath, scriptWithMetadata);
        await this.loadScriptLibrary(); // Reload library
        
        return {
            success: true,
            name: name,
            path: scriptPath
        };
    }

    async deleteScript(name) {
        const script = this.scriptLibrary.get(name);
        if (!script) {
            throw new Error(`Script '${name}' not found`);
        }
        
        await fs.unlink(script.path);
        this.scriptLibrary.delete(name);
        
        return { success: true };
    }

    async getScriptList() {
        const scripts = [];
        for (const [name, script] of this.scriptLibrary) {
            scripts.push({
                name: name,
                metadata: script.metadata,
                lastModified: script.lastModified
            });
        }
        return scripts;
    }

    async getScriptContent(name) {
        const script = this.scriptLibrary.get(name);
        if (!script) {
            throw new Error(`Script '${name}' not found`);
        }
        return script.content;
    }

    getRunningScripts() {
        const running = [];
        for (const [id, execution] of this.runningScripts) {
            running.push({
                id: id,
                scriptName: execution.scriptName,
                status: execution.status,
                startTime: execution.startTime,
                duration: new Date() - execution.startTime
            });
        }
        return running;
    }

    async getScriptResults(scriptId) {
        return this.scriptResults.get(scriptId);
    }

    async stopScript(scriptId) {
        const execution = this.runningScripts.get(scriptId);
        if (!execution) {
            throw new Error(`Script execution '${scriptId}' not found`);
        }
        
        // Implementation would kill the process
        execution.status = 'stopped';
        execution.endTime = new Date();
        
        this.scriptResults.set(scriptId, execution);
        this.runningScripts.delete(scriptId);
        
        return { success: true };
    }

    // Create default example scripts
    async createDefaultScripts() {
        const defaultScripts = [
            {
                name: 'device_health_check.py',
                content: `
# @name: Device Health Check
# @description: Check the health status of all network devices
# @author: System
# @version: 1.0
# @tags: health, monitoring, devices
# @requires: ping, ssh
# @parameters: []

import time

def check_device_health():
    devices = get_network_devices()
    log_message(f"Checking health of {len(devices)} devices...")
    
    results = []
    for device in devices:
        ip = device.get('ip', '')
        hostname = device.get('hostname', 'Unknown')
        
        # Ping test
        is_reachable = ping_device(ip)
        
        result = {
            'ip': ip,
            'hostname': hostname,
            'reachable': is_reachable,
            'timestamp': time.time()
        }
        
        if is_reachable:
            log_message(f"✓ {hostname} ({ip}) is reachable")
        else:
            log_message(f"✗ {hostname} ({ip}) is NOT reachable", 'WARNING')
        
        results.append(result)
    
    save_result('device_health_check', results)
    return results

# Execute health check
results = check_device_health()
print(f"\\nHealth check completed. {sum(1 for r in results if r['reachable'])} of {len(results)} devices are reachable.")
`,
                metadata: {
                    name: 'Device Health Check',
                    description: 'Check the health status of all network devices',
                    author: 'System',
                    version: '1.0',
                    tags: ['health', 'monitoring', 'devices'],
                    requires: ['ping', 'ssh'],
                    parameters: []
                }
            },
            {
                name: 'interface_utilization_report.py',
                content: `
# @name: Interface Utilization Report
# @description: Generate interface utilization report for specified device
# @author: System
# @version: 1.0
# @tags: interfaces, utilization, reporting
# @requires: snmp
# @parameters: [{"name": "device_ip", "type": "string", "required": true, "description": "Device IP address"}]

def generate_utilization_report(device_ip):
    log_message(f"Generating interface utilization report for {device_ip}")
    
    # Get interface statistics
    interfaces = get_interface_stats(device_ip)
    
    if not interfaces:
        log_message(f"No interface data found for {device_ip}", 'WARNING')
        return None
    
    report = {
        'device': device_ip,
        'timestamp': time.time(),
        'interfaces': []
    }
    
    for intf in interfaces:
        name = intf.get('name', 'Unknown')
        in_bytes = intf.get('inOctets', 0)
        out_bytes = intf.get('outOctets', 0)
        speed = intf.get('speed', 0)
        
        # Calculate utilization
        if speed > 0:
            in_utilization = (in_bytes * 8 / speed) * 100
            out_utilization = (out_bytes * 8 / speed) * 100
        else:
            in_utilization = 0
            out_utilization = 0
        
        report['interfaces'].append({
            'name': name,
            'in_utilization': round(in_utilization, 2),
            'out_utilization': round(out_utilization, 2),
            'status': intf.get('operStatus', 'unknown')
        })
        
        log_message(f"Interface {name}: In={in_utilization:.1f}%, Out={out_utilization:.1f}%")
    
    save_result(f'utilization_report_{device_ip}', report)
    return report

# Execute report generation
report = generate_utilization_report(device_ip)
if report:
    print(f"\\nReport generated for {len(report['interfaces'])} interfaces")
`,
                metadata: {
                    name: 'Interface Utilization Report',
                    description: 'Generate interface utilization report for specified device',
                    author: 'System',
                    version: '1.0',
                    tags: ['interfaces', 'utilization', 'reporting'],
                    requires: ['snmp'],
                    parameters: [
                        {
                            name: 'device_ip',
                            type: 'string',
                            required: true,
                            description: 'Device IP address'
                        }
                    ]
                }
            },
            {
                name: 'network_topology_analyzer.py',
                content: `
# @name: Network Topology Analyzer
# @description: Analyze network topology and find critical paths
# @author: System
# @version: 1.0
# @tags: topology, analysis, paths
# @requires: networkx
# @parameters: []

import json

def analyze_topology():
    topology = get_network_topology()
    log_message("Analyzing network topology...")
    
    nodes = topology.get('nodes', [])
    links = topology.get('links', [])
    
    log_message(f"Topology contains {len(nodes)} nodes and {len(links)} links")
    
    # Find nodes with most connections (potential bottlenecks)
    node_connections = {}
    for link in links:
        source = link.get('source')
        target = link.get('target')
        
        node_connections[source] = node_connections.get(source, 0) + 1
        node_connections[target] = node_connections.get(target, 0) + 1
    
    # Sort by connection count
    critical_nodes = sorted(node_connections.items(), key=lambda x: x[1], reverse=True)[:5]
    
    analysis = {
        'total_nodes': len(nodes),
        'total_links': len(links),
        'critical_nodes': [
            {'node': node, 'connections': count} 
            for node, count in critical_nodes
        ],
        'average_connections': sum(node_connections.values()) / len(node_connections) if node_connections else 0
    }
    
    log_message("Critical nodes (most connections):")
    for node, count in critical_nodes:
        log_message(f"  - {node}: {count} connections")
    
    save_result('topology_analysis', analysis)
    return analysis

# Execute analysis
analysis = analyze_topology()
print(f"\\nTopology analysis completed. Average connections per node: {analysis['average_connections']:.1f}")
`,
                metadata: {
                    name: 'Network Topology Analyzer',
                    description: 'Analyze network topology and find critical paths',
                    author: 'System',
                    version: '1.0',
                    tags: ['topology', 'analysis', 'paths'],
                    requires: ['networkx'],
                    parameters: []
                }
            }
        ];

        for (const script of defaultScripts) {
            await this.saveScript(script.name, script.content, script.metadata);
        }
        
        console.log(`📝 Created ${defaultScripts.length} default Python scripts`);
    }
}

module.exports = PythonScriptEngine;