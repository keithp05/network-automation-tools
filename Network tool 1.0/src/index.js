#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');
const dns = require('dns');
const ping = require('ping');

class NetworkDiscoveryTool {
    constructor() {
        this.networkInterfaces = os.networkInterfaces();
        this.results = {
            interfaces: [],
            activeHosts: [],
            openPorts: []
        };
    }

    async getNetworkInterfaces() {
        console.log('🔍 Discovering network interfaces...\n');
        
        for (const [name, interfaces] of Object.entries(this.networkInterfaces)) {
            interfaces.forEach(iface => {
                if (!iface.internal && iface.family === 'IPv4') {
                    this.results.interfaces.push({
                        name: name,
                        address: iface.address,
                        netmask: iface.netmask,
                        mac: iface.mac
                    });
                    console.log(`Interface: ${name}`);
                    console.log(`  IP Address: ${iface.address}`);
                    console.log(`  Netmask: ${iface.netmask}`);
                    console.log(`  MAC Address: ${iface.mac}\n`);
                }
            });
        }
    }

    async scanNetwork(subnet = '192.168.1') {
        console.log(`🔍 Scanning network ${subnet}.0/24...\n`);
        
        const promises = [];
        for (let i = 1; i <= 254; i++) {
            const host = `${subnet}.${i}`;
            promises.push(this.pingHost(host));
        }

        const results = await Promise.all(promises);
        const activeHosts = results.filter(result => result.alive);
        
        for (const host of activeHosts) {
            this.results.activeHosts.push(host);
            console.log(`✅ Active host found: ${host.host} (${host.time}ms)`);
            
            // Try to get hostname
            try {
                const hostname = await this.getHostname(host.host);
                if (hostname) {
                    console.log(`   Hostname: ${hostname}`);
                }
            } catch (error) {
                // Hostname lookup failed, continue
            }
        }
        
        console.log(`\n📊 Found ${activeHosts.length} active hosts\n`);
    }

    async pingHost(host) {
        try {
            const result = await ping.promise.probe(host, {
                timeout: 1,
                extra: ['-c', '1']
            });
            return result;
        } catch (error) {
            return { host: host, alive: false };
        }
    }

    async getHostname(ip) {
        return new Promise((resolve, reject) => {
            dns.reverse(ip, (err, hostnames) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hostnames[0]);
                }
            });
        });
    }

    async scanPorts(host, ports = [22, 23, 53, 80, 135, 139, 443, 445, 993, 995]) {
        console.log(`🔍 Scanning ports on ${host}...\n`);
        
        const promises = ports.map(port => this.scanPort(host, port));
        const results = await Promise.all(promises);
        const openPorts = results.filter(result => result.open);
        
        for (const port of openPorts) {
            this.results.openPorts.push(port);
            console.log(`✅ Open port: ${port.host}:${port.port}`);
        }
        
        console.log(`\n📊 Found ${openPorts.length} open ports on ${host}\n`);
    }

    async scanPort(host, port) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();
            const timeout = 1000;

            socket.setTimeout(timeout);
            
            socket.on('connect', () => {
                socket.destroy();
                resolve({ host: host, port: port, open: true });
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ host: host, port: port, open: false });
            });

            socket.on('error', () => {
                socket.destroy();
                resolve({ host: host, port: port, open: false });
            });

            socket.connect(port, host);
        });
    }

    async getRouteInfo() {
        console.log('🔍 Getting routing information...\n');
        
        return new Promise((resolve) => {
            exec('netstat -rn', (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Could not get routing information');
                    resolve();
                    return;
                }
                
                console.log('Routing Table:');
                console.log(stdout);
                resolve();
            });
        });
    }

    async getARPTable() {
        console.log('🔍 Getting ARP table...\n');
        
        return new Promise((resolve) => {
            exec('arp -a', (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Could not get ARP table');
                    resolve();
                    return;
                }
                
                console.log('ARP Table:');
                console.log(stdout);
                resolve();
            });
        });
    }

    generateReport() {
        console.log('\n📋 NETWORK DISCOVERY REPORT');
        console.log('=' * 50);
        
        console.log('\n🖧 Network Interfaces:');
        this.results.interfaces.forEach(iface => {
            console.log(`  ${iface.name}: ${iface.address}/${iface.netmask}`);
        });
        
        console.log('\n🟢 Active Hosts:');
        this.results.activeHosts.forEach(host => {
            console.log(`  ${host.host}`);
        });
        
        console.log('\n🔓 Open Ports:');
        this.results.openPorts.forEach(port => {
            console.log(`  ${port.host}:${port.port}`);
        });
        
        console.log('\n✅ Scan completed successfully!');
    }
}

async function main() {
    console.log('🌐 Network Discovery Tool v1.0');
    console.log('================================\n');

    const tool = new NetworkDiscoveryTool();
    
    try {
        await tool.getNetworkInterfaces();
        await tool.getRouteInfo();
        await tool.getARPTable();
        
        // Scan common subnet (adjust as needed)
        await tool.scanNetwork('192.168.1');
        
        // Scan ports on first active host found
        if (tool.results.activeHosts.length > 0) {
            const firstHost = tool.results.activeHosts[0].host;
            await tool.scanPorts(firstHost);
        }
        
        tool.generateReport();
        
    } catch (error) {
        console.error('❌ Error during network discovery:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = NetworkDiscoveryTool;