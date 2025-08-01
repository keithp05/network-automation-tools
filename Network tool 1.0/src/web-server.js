#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const NetworkDiscoveryTool = require('./index.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);

    // Handle network scan request
    socket.on('start-scan', async (data) => {
        console.log('🔍 Starting network scan...');
        
        try {
            const tool = new NetworkDiscoveryTool();
            
            // Send progress updates
            socket.emit('scan-progress', { 
                status: 'starting', 
                message: 'Initializing network discovery...' 
            });

            // Get network interfaces
            socket.emit('scan-progress', { 
                status: 'interfaces', 
                message: 'Discovering network interfaces...' 
            });
            await tool.getNetworkInterfaces();
            socket.emit('interfaces-found', tool.results.interfaces);

            // Get routing info (skip for web UI to avoid too much output)
            socket.emit('scan-progress', { 
                status: 'routing', 
                message: 'Getting network routing information...' 
            });

            // Determine subnet to scan
            let subnet = data.subnet || '192.168.200'; // Default to detected subnet
            if (tool.results.interfaces.length > 0) {
                const ip = tool.results.interfaces[0].address;
                const parts = ip.split('.');
                subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
            }

            // Scan network
            socket.emit('scan-progress', { 
                status: 'scanning', 
                message: `Scanning network ${subnet}.0/24...` 
            });

            // Custom scan method for web UI with progress updates
            const promises = [];
            for (let i = 1; i <= 254; i++) {
                const host = `${subnet}.${i}`;
                promises.push(tool.pingHost(host));
            }

            const results = await Promise.all(promises);
            const activeHosts = results.filter(result => result.alive);
            
            tool.results.activeHosts = activeHosts;
            socket.emit('hosts-found', activeHosts);

            // Scan ports on first few active hosts
            if (activeHosts.length > 0) {
                socket.emit('scan-progress', { 
                    status: 'ports', 
                    message: 'Scanning ports on active hosts...' 
                });

                const hostsToScan = activeHosts.slice(0, 3); // Limit to first 3 hosts
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

            // Send final results
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

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('📱 Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 Network Discovery Tool Web UI running on http://localhost:${PORT}`);
    console.log('📱 Open your browser and navigate to the above URL');
});

module.exports = { app, server, io };