// Network Discovery Tool - Frontend JavaScript

class NetworkDiscoveryUI {
    constructor() {
        this.socket = io();
        this.isScanning = false;
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    initializeElements() {
        // Buttons
        this.startBtn = document.getElementById('startScan');
        this.stopBtn = document.getElementById('stopScan');
        
        // Input
        this.subnetInput = document.getElementById('subnet');
        
        // Status elements
        this.statusMessage = document.getElementById('statusMessage');
        this.progressBar = document.getElementById('progressBar');
        
        // Result containers
        this.interfacesContainer = document.getElementById('interfaces');
        this.activeHostsContainer = document.getElementById('activeHosts');
        this.openPortsContainer = document.getElementById('openPorts');
        this.logsContainer = document.getElementById('logs');
        
        // Summary elements
        this.totalInterfaces = document.getElementById('totalInterfaces');
        this.totalHosts = document.getElementById('totalHosts');
        this.totalPorts = document.getElementById('totalPorts');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startScan());
        this.stopBtn.addEventListener('click', () => this.stopScan());
        
        // Allow Enter key to start scan
        this.subnetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isScanning) {
                this.startScan();
            }
        });
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            this.addLog('Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            this.addLog('Disconnected from server', 'warning');
        });

        this.socket.on('scan-progress', (data) => {
            this.updateProgress(data);
        });

        this.socket.on('interfaces-found', (interfaces) => {
            this.displayInterfaces(interfaces);
        });

        this.socket.on('hosts-found', (hosts) => {
            this.displayActiveHosts(hosts);
        });

        this.socket.on('ports-found', (data) => {
            this.displayPorts(data);
        });

        this.socket.on('scan-complete', (results) => {
            this.completeScan(results);
        });

        this.socket.on('scan-error', (error) => {
            this.handleScanError(error);
        });
    }

    startScan() {
        if (this.isScanning) return;

        this.isScanning = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;

        // Clear previous results
        this.clearResults();
        
        // Reset progress
        this.progressBar.style.width = '0%';
        
        const subnet = this.subnetInput.value.trim() || '192.168.200';
        
        this.addLog(`Starting network scan on ${subnet}.0/24...`, 'info');
        this.updateStatus('Starting scan...', true);

        // Emit scan request
        this.socket.emit('start-scan', { subnet: subnet });
    }

    stopScan() {
        if (!this.isScanning) return;

        this.isScanning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;

        this.updateStatus('Scan stopped', false);
        this.addLog('Scan stopped by user', 'warning');
        
        // TODO: Implement actual scan stopping on server side
    }

    updateProgress(data) {
        this.updateStatus(data.message, true);
        this.addLog(data.message, 'info');

        // Update progress bar based on status
        const progressMap = {
            'starting': 10,
            'interfaces': 20,
            'routing': 30,
            'scanning': 70,
            'ports': 90,
            'complete': 100
        };

        const progress = progressMap[data.status] || 0;
        this.progressBar.style.width = progress + '%';
    }

    updateStatus(message, isScanning = false) {
        this.statusMessage.textContent = message;
        
        if (isScanning) {
            this.statusMessage.classList.add('scanning');
        } else {
            this.statusMessage.classList.remove('scanning');
        }
    }

    clearResults() {
        this.interfacesContainer.innerHTML = '<p class="placeholder">Scanning for interfaces...</p>';
        this.activeHostsContainer.innerHTML = '<p class="placeholder">Scanning for active hosts...</p>';
        this.openPortsContainer.innerHTML = '<p class="placeholder">Scanning for open ports...</p>';
        
        this.totalInterfaces.textContent = '0';
        this.totalHosts.textContent = '0';
        this.totalPorts.textContent = '0';
    }

    displayInterfaces(interfaces) {
        if (!interfaces || interfaces.length === 0) {
            this.interfacesContainer.innerHTML = '<p class="placeholder">No interfaces found</p>';
            return;
        }

        let html = '';
        interfaces.forEach(iface => {
            html += `
                <div class="interface-item">
                    <div class="interface-name">${iface.name}</div>
                    <div class="interface-details">
                        <strong>IP:</strong> ${iface.address}<br>
                        <strong>Netmask:</strong> ${iface.netmask}<br>
                        <strong>MAC:</strong> ${iface.mac}
                    </div>
                </div>
            `;
        });

        this.interfacesContainer.innerHTML = html;
        this.totalInterfaces.textContent = interfaces.length;
        this.addLog(`Found ${interfaces.length} network interface(s)`, 'success');
    }

    displayActiveHosts(hosts) {
        if (!hosts || hosts.length === 0) {
            this.activeHostsContainer.innerHTML = '<p class="placeholder">No active hosts found</p>';
            return;
        }

        let html = '';
        hosts.forEach(host => {
            html += `
                <div class="host-item">
                    <div class="host-ip">${host.host}</div>
                    <div class="host-details">
                        <strong>Response Time:</strong> ${host.time || 'N/A'}ms<br>
                        <strong>Status:</strong> Active
                    </div>
                </div>
            `;
        });

        this.activeHostsContainer.innerHTML = html;
        this.totalHosts.textContent = hosts.length;
        this.addLog(`Found ${hosts.length} active host(s)`, 'success');
    }

    displayPorts(data) {
        if (!data.ports || data.ports.length === 0) {
            return; // Don't update if no ports found for this host
        }

        // Get existing content or create new
        let existingHtml = this.openPortsContainer.innerHTML;
        if (existingHtml.includes('placeholder')) {
            existingHtml = '';
        }

        let html = existingHtml + `
            <div class="port-item">
                <div class="port-host">${data.host}</div>
                <div class="port-list">
                    ${data.ports.map(port => `<span class="port-number">${port.port}</span>`).join('')}
                </div>
            </div>
        `;

        this.openPortsContainer.innerHTML = html;
        
        // Update total count
        const currentTotal = parseInt(this.totalPorts.textContent) || 0;
        this.totalPorts.textContent = currentTotal + data.ports.length;
        
        this.addLog(`Found ${data.ports.length} open port(s) on ${data.host}`, 'success');
    }

    completeScan(results) {
        this.isScanning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;

        this.updateStatus('Scan completed successfully', false);
        this.progressBar.style.width = '100%';

        // Update final totals
        this.totalInterfaces.textContent = results.summary.totalInterfaces;
        this.totalHosts.textContent = results.summary.totalActiveHosts;
        this.totalPorts.textContent = results.summary.totalOpenPorts;

        this.addLog('Network scan completed successfully!', 'success');
        this.addLog(`Summary: ${results.summary.totalInterfaces} interfaces, ${results.summary.totalActiveHosts} active hosts, ${results.summary.totalOpenPorts} open ports`, 'info');
    }

    handleScanError(error) {
        this.isScanning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;

        this.updateStatus('Scan failed', false);
        this.addLog(`Scan error: ${error.message}`, 'error');
        
        console.error('Scan error:', error);
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('p');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.logsContainer.appendChild(logEntry);
        
        // Auto-scroll to bottom
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        
        // Limit log entries to prevent memory issues
        const logEntries = this.logsContainer.children;
        if (logEntries.length > 100) {
            this.logsContainer.removeChild(logEntries[0]);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NetworkDiscoveryUI();
});