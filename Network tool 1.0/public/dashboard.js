// Dashboard JavaScript

class Dashboard {
    constructor() {
        this.socket = io();
        this.currentSection = 'dashboard';
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.loadDashboardData();
        this.startClock();
    }

    initializeElements() {
        // Navigation
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.content-section');
        
        console.log('Found nav links:', this.navLinks.length);
        console.log('Found sections:', this.sections.length);
        
        // Dashboard elements
        this.totalDevices = document.getElementById('totalDevices');
        this.totalPolicies = document.getElementById('totalPolicies');
        this.activeAlerts = document.getElementById('activeAlerts');
        this.recentChanges = document.getElementById('recentChanges');
        
        // Discovery elements
        this.startScanBtn = document.getElementById('startScan');
        this.stopScanBtn = document.getElementById('stopScan');
        this.subnetInput = document.getElementById('subnet');
        this.statusMessage = document.getElementById('statusMessage');
        this.progressBar = document.getElementById('progressBar');
        
        // Config generator elements
        this.generateConfigBtn = document.getElementById('generateConfig');
        this.vendorSelect = document.getElementById('vendor');
        this.deviceTypeSelect = document.getElementById('deviceType');
        this.hostnameInput = document.getElementById('hostname');
        this.interfacesTextarea = document.getElementById('interfaces');
        this.vlansInput = document.getElementById('vlans');
        this.configResult = document.getElementById('configResult');
        this.configOutput = document.getElementById('configOutput');
        
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChat');
        
        // Advanced discovery elements
        this.startAdvancedDiscoveryBtn = document.getElementById('startAdvancedDiscovery');
        this.stopAdvancedDiscoveryBtn = document.getElementById('stopAdvancedDiscovery');
        this.seedIPsTextarea = document.getElementById('seedIPs');
        this.discoveryProgressSection = document.getElementById('discoveryProgressSection');
        this.discoveryResults = document.getElementById('discoveryResults');
        
        // Modals
        this.addDeviceModal = document.getElementById('addDeviceModal');
        this.addCredentialsModal = document.getElementById('addCredentialsModal');
    }

    setupEventListeners() {
        // Navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.switchSection(section);
            });
        });

        // Discovery
        if (this.startScanBtn) {
            this.startScanBtn.addEventListener('click', () => this.startNetworkScan());
            this.stopScanBtn.addEventListener('click', () => this.stopNetworkScan());
        }

        // Config generator
        if (this.generateConfigBtn) {
            this.generateConfigBtn.addEventListener('click', () => this.generateConfiguration());
        }

        // Chat
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
            this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        }

        // Advanced discovery
        if (this.startAdvancedDiscoveryBtn) {
            this.startAdvancedDiscoveryBtn.addEventListener('click', () => this.startAdvancedDiscovery());
            this.stopAdvancedDiscoveryBtn.addEventListener('click', () => this.stopAdvancedDiscovery());
        }

        // Results tabs
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });

        // Modal close
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('dashboard-update', (data) => {
            this.updateDashboardSummary(data);
        });

        this.socket.on('new-alert', (alert) => {
            this.addAlert(alert);
        });

        this.socket.on('device-updated', (data) => {
            this.refreshDeviceList();
        });

        // Network discovery listeners
        this.socket.on('scan-progress', (data) => {
            this.updateScanProgress(data);
        });

        this.socket.on('interfaces-found', (interfaces) => {
            this.displayInterfaces(interfaces);
        });

        this.socket.on('hosts-found', (hosts) => {
            this.displayHosts(hosts);
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

        // Chat response
        this.socket.on('chat-response', (response) => {
            this.displayChatResponse(response);
        });

        // Advanced discovery listeners
        this.socket.on('advanced-discovery-started', (data) => {
            this.onAdvancedDiscoveryStarted(data);
        });

        this.socket.on('advanced-discovery-progress', (progress) => {
            this.updateAdvancedDiscoveryProgress(progress);
        });

        this.socket.on('advanced-discovery-complete', (results) => {
            this.onAdvancedDiscoveryComplete(results);
        });

        this.socket.on('advanced-discovery-error', (error) => {
            this.onAdvancedDiscoveryError(error);
        });

        this.socket.on('credential-test-complete', (results) => {
            this.onCredentialTestComplete(results);
        });
    }

    switchSection(sectionId) {
        console.log('Switching to section:', sectionId);
        console.log('Available sections:', Array.from(this.sections).map(s => s.id));
        
        // Update navigation
        this.navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update sections
        let sectionFound = false;
        this.sections.forEach(section => {
            if (section.id === sectionId) {
                console.log('Activating section:', section.id);
                section.classList.add('active');
                section.style.display = 'block'; // Force display
                sectionFound = true;
            } else {
                section.classList.remove('active');
                section.style.display = 'none'; // Force hide
            }
        });
        
        if (!sectionFound) {
            console.error('Section not found:', sectionId);
        }

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        const titles = {
            'dashboard': 'Dashboard',
            'discovery': 'Network Discovery',
            'api-integration': 'API Integration',
            'devices': 'Network Devices',
            'policies': 'Firewall Policies',
            'interfaces': 'Interface Statistics',
            'python-scripts': 'Python Script Engine',
            'universal-search': 'Universal Search',
            'n8n-workflows': 'N8N Workflow Automation',
            'config-ai': 'AI Configuration Generator',
            'chat': 'AI Network Assistant',
            'alerts': 'Security Alerts',
            'documentation': 'Documentation'
        };
        pageTitle.textContent = titles[sectionId] || 'Dashboard';

        this.currentSection = sectionId;

        // Load section-specific data
        if (sectionId === 'devices') {
            this.loadDevices();
        } else if (sectionId === 'alerts') {
            this.loadAlerts();
        } else if (sectionId === 'credentials') {
            this.loadCredentials();
        } else if (sectionId === 'advanced-discovery') {
            this.loadAdvancedDiscoverySection();
        } else if (sectionId === 'python-scripts') {
            this.loadPythonScripts();
        } else if (sectionId === 'universal-search') {
            this.loadUniversalSearch();
        } else if (sectionId === 'n8n-workflows') {
            this.loadN8nWorkflows();
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/dashboard/summary');
            const data = await response.json();
            this.updateDashboardSummary(data);

            // Load recent alerts
            this.loadRecentAlerts();
            
            // Load recent changes
            this.loadRecentChanges();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateDashboardSummary(data) {
        if (this.totalDevices) this.totalDevices.textContent = data.totalDevices || 0;
        if (this.totalPolicies) this.totalPolicies.textContent = data.totalPolicies || 0;
        if (this.activeAlerts) this.activeAlerts.textContent = data.activeAlerts || 0;
        if (this.recentChanges) this.recentChanges.textContent = data.recentChanges || 0;
    }

    async loadRecentAlerts() {
        try {
            const response = await fetch('/api/alerts?severity=&acknowledged=false');
            const alerts = await response.json();
            
            const alertsList = document.getElementById('recentAlertsList');
            if (!alertsList) return;

            if (alerts.length === 0) {
                alertsList.innerHTML = '<p class="no-data">No recent alerts</p>';
                return;
            }

            let html = '';
            alerts.slice(0, 5).forEach(alert => {
                html += `
                    <div class="alert-item ${alert.severity}">
                        <div class="alert-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="alert-content">
                            <strong>${alert.deviceName || 'System'}</strong>
                            <p>${alert.message}</p>
                            <small>${new Date(alert.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                `;
            });

            alertsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    }

    async loadRecentChanges() {
        try {
            const response = await fetch('/api/changes?limit=5');
            const changes = await response.json();
            
            const changesList = document.getElementById('recentChangesList');
            if (!changesList) return;

            if (changes.length === 0) {
                changesList.innerHTML = '<p class="no-data">No recent changes</p>';
                return;
            }

            let html = '';
            changes.forEach(change => {
                html += `
                    <div class="change-item">
                        <div class="change-icon">
                            <i class="fas fa-history"></i>
                        </div>
                        <div class="change-content">
                            <p>${change.changes.length} changes on device ${change.deviceId}</p>
                            <small>${new Date(change.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                `;
            });

            changesList.innerHTML = html;
        } catch (error) {
            console.error('Error loading changes:', error);
        }
    }

    // Network Discovery
    startNetworkScan() {
        if (this.startScanBtn) {
            this.startScanBtn.disabled = true;
            this.stopScanBtn.disabled = false;
        }

        const subnet = this.subnetInput.value || '192.168.200';
        
        // Clear previous results
        this.clearDiscoveryResults();
        
        // Start scan
        this.socket.emit('start-scan', { subnet: subnet });
        
        this.updateScanProgress({
            status: 'starting',
            message: 'Initializing network scan...'
        });
    }

    stopNetworkScan() {
        if (this.startScanBtn) {
            this.startScanBtn.disabled = false;
            this.stopScanBtn.disabled = true;
        }

        this.updateScanProgress({
            status: 'stopped',
            message: 'Scan stopped by user'
        });
    }

    updateScanProgress(data) {
        if (this.statusMessage) {
            this.statusMessage.textContent = data.message;
        }

        const progressMap = {
            'starting': 10,
            'interfaces': 25,
            'scanning': 50,
            'ports': 75,
            'complete': 100,
            'stopped': 0
        };

        const progress = progressMap[data.status] || 0;
        if (this.progressBar) {
            this.progressBar.style.width = progress + '%';
        }
    }

    clearDiscoveryResults() {
        const containers = ['interfaces', 'activeHosts', 'openPorts'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<p class="placeholder">Scanning...</p>';
            }
        });
    }

    displayInterfaces(interfaces) {
        const container = document.getElementById('interfaces');
        if (!container) return;

        if (interfaces.length === 0) {
            container.innerHTML = '<p class="placeholder">No interfaces found</p>';
            return;
        }

        let html = '';
        interfaces.forEach(iface => {
            html += `
                <div class="interface-item">
                    <strong>${iface.name}</strong>
                    <div>IP: ${iface.address}</div>
                    <div>Netmask: ${iface.netmask}</div>
                    <div>MAC: ${iface.mac}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    displayHosts(hosts) {
        const container = document.getElementById('activeHosts');
        if (!container) return;

        if (hosts.length === 0) {
            container.innerHTML = '<p class="placeholder">No active hosts found</p>';
            return;
        }

        let html = '';
        hosts.forEach(host => {
            html += `
                <div class="host-item">
                    <strong>${host.host}</strong>
                    <div>Response time: ${host.time}ms</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    displayPorts(data) {
        const container = document.getElementById('openPorts');
        if (!container) return;

        if (container.innerHTML.includes('placeholder')) {
            container.innerHTML = '';
        }

        let html = `
            <div class="port-item">
                <strong>${data.host}</strong>
                <div>Open ports: ${data.ports.map(p => p.port).join(', ')}</div>
            </div>
        `;

        container.innerHTML += html;
    }

    completeScan(results) {
        if (this.startScanBtn) {
            this.startScanBtn.disabled = false;
            this.stopScanBtn.disabled = true;
        }

        this.updateScanProgress({
            status: 'complete',
            message: 'Scan completed successfully!'
        });
    }

    handleScanError(error) {
        if (this.startScanBtn) {
            this.startScanBtn.disabled = false;
            this.stopScanBtn.disabled = true;
        }

        this.updateScanProgress({
            status: 'error',
            message: `Error: ${error.message}`
        });
    }

    // AI Config Generator
    async generateConfiguration() {
        const vendor = this.vendorSelect.value;
        const deviceType = this.deviceTypeSelect.value;
        const hostname = this.hostnameInput.value || 'Device01';
        const interfacesText = document.getElementById('configInterfaces').value;
        const vlansText = this.vlansInput.value;

        if (!vendor || !deviceType) {
            alert('Please select both vendor and device type');
            return;
        }

        // Parse interfaces
        const interfaces = [];
        if (interfacesText) {
            const lines = interfacesText.split('\n');
            lines.forEach(line => {
                const parts = line.trim().split(' ');
                if (parts.length >= 2) {
                    interfaces.push({
                        ip: parts[0],
                        netmask: parts[1] || '255.255.255.0'
                    });
                }
            });
        }

        // Parse VLANs
        const vlans = vlansText ? vlansText.split(',').map(v => ({
            id: v.trim(),
            name: `VLAN${v.trim()}`
        })) : [];

        try {
            const response = await fetch('/api/config/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor,
                    deviceType,
                    requirements: {
                        hostname,
                        interfaces,
                        vlans
                    }
                })
            });

            const result = await response.json();
            
            if (result.config) {
                this.configOutput.textContent = result.config;
                this.configResult.style.display = 'block';
            }
        } catch (error) {
            console.error('Error generating config:', error);
            alert('Error generating configuration');
        }
    }

    // Chat
    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Display user message
        this.displayUserMessage(message);
        
        // Clear input
        this.chatInput.value = '';

        // Send to server
        this.socket.emit('chat-message', {
            message: message,
            sessionId: 'default'
        });
    }

    displayUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    displayChatResponse(response) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        let content = response.text;
        if (response.text.includes('```')) {
            content = response.text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${content}
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Utility functions
    startClock() {
        const updateTime = () => {
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                timeElement.textContent = new Date().toLocaleString();
            }
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    closeModal() {
        if (this.addDeviceModal) {
            this.addDeviceModal.style.display = 'none';
        }
        if (this.addCredentialsModal) {
            this.addCredentialsModal.style.display = 'none';
        }
    }

    // Advanced Discovery Methods
    async loadCredentials() {
        try {
            const response = await fetch('/api/credentials');
            const credentials = await response.json();
            this.displayCredentials(credentials);
            this.loadCredentialSelection(credentials);
        } catch (error) {
            console.error('Error loading credentials:', error);
        }
    }

    displayCredentials(credentials) {
        const container = document.getElementById('credentialsList');
        if (!container) return;

        if (credentials.length === 0) {
            container.innerHTML = '<p class="no-data">No credentials configured</p>';
            return;
        }

        let html = '';
        credentials.forEach(cred => {
            html += `
                <div class="credential-card" data-id="${cred.id}">
                    <div class="credential-header">
                        <h4>${cred.name}</h4>
                        <div class="credential-actions">
                            <button onclick="editCredentials('${cred.id}')" class="btn-secondary btn-sm">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="deleteCredentials('${cred.id}')" class="btn-secondary btn-sm">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                    <div class="credential-details">
                        <p>${cred.description || 'No description'}</p>
                        <div class="credential-types">
                            ${cred.ssh ? '<span class="badge">SSH</span>' : ''}
                            ${cred.telnet ? '<span class="badge">Telnet</span>' : ''}
                            ${cred.snmp ? '<span class="badge">SNMP</span>' : ''}
                        </div>
                        <div class="credential-meta">
                            <small>Created: ${new Date(cred.created).toLocaleDateString()}</small>
                            ${cred.lastUsed ? `<small>Last used: ${new Date(cred.lastUsed).toLocaleDateString()}</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    loadCredentialSelection(credentials) {
        const container = document.getElementById('credentialSelection');
        if (!container) return;

        if (credentials.length === 0) {
            container.innerHTML = '<p class="no-data">No credentials available. Please add credentials first.</p>';
            return;
        }

        let html = '';
        credentials.forEach(cred => {
            html += `
                <label class="credential-checkbox">
                    <input type="checkbox" name="credentialSet" value="${cred.id}" checked>
                    <span class="checkmark"></span>
                    <div class="credential-info">
                        <strong>${cred.name}</strong>
                        <div class="credential-types">
                            ${cred.ssh ? '<span class="badge">SSH</span>' : ''}
                            ${cred.telnet ? '<span class="badge">Telnet</span>' : ''}
                            ${cred.snmp ? '<span class="badge">SNMP</span>' : ''}
                        </div>
                    </div>
                </label>
            `;
        });

        container.innerHTML = html;
    }

    loadAdvancedDiscoverySection() {
        this.loadCredentials();
    }

    startAdvancedDiscovery() {
        const seedIPs = this.seedIPsTextarea.value.split('\n')
            .map(ip => ip.trim())
            .filter(ip => ip && this.isValidIP(ip));

        if (seedIPs.length === 0) {
            alert('Please enter at least one valid seed IP address');
            return;
        }

        const selectedCredentials = Array.from(document.querySelectorAll('input[name="credentialSet"]:checked'))
            .map(cb => cb.value);

        if (selectedCredentials.length === 0) {
            alert('Please select at least one credential set');
            return;
        }

        const options = {
            enableCDP: document.getElementById('enableCDP').checked,
            enableLLDP: document.getElementById('enableLLDP').checked,
            enableMacTable: document.getElementById('enableMacTable').checked,
            enableSNMP: document.getElementById('enableSNMP').checked,
            maxIterations: parseInt(document.getElementById('maxIterations').value) || 3,
            includeUnreachable: document.getElementById('includeUnreachable').checked
        };

        // Update UI
        this.startAdvancedDiscoveryBtn.disabled = true;
        this.stopAdvancedDiscoveryBtn.disabled = false;
        this.discoveryProgressSection.style.display = 'block';
        this.discoveryResults.style.display = 'none';

        // Start discovery
        this.socket.emit('start-advanced-discovery', {
            seedIPs: seedIPs,
            credentialSetIds: selectedCredentials,
            options: options
        });
    }

    stopAdvancedDiscovery() {
        this.startAdvancedDiscoveryBtn.disabled = false;
        this.stopAdvancedDiscoveryBtn.disabled = true;
        
        this.socket.emit('stop-advanced-discovery');
    }

    onAdvancedDiscoveryStarted(data) {
        console.log('Advanced discovery started:', data);
        document.getElementById('discoveryPhase').textContent = 'Starting...';
        document.getElementById('discoveryCurrentDevice').textContent = `Preparing to scan ${data.seedIPs.length} seed devices with ${data.credentialSets} credential sets`;
    }

    updateAdvancedDiscoveryProgress(progress) {
        console.log('Discovery progress:', progress);
        
        // Update phase
        document.getElementById('discoveryPhase').textContent = this.formatDiscoveryPhase(progress.phase);
        
        // Update progress stats
        document.getElementById('discoveryCompleted').textContent = progress.completed;
        document.getElementById('discoveryTotal').textContent = progress.total;
        
        // Update progress bar
        const progressPercent = progress.total > 0 ? (progress.completed / progress.total * 100) : 0;
        document.getElementById('discoveryProgressBar').style.width = progressPercent + '%';
        
        // Update current device
        if (progress.currentDevice) {
            document.getElementById('discoveryCurrentDevice').textContent = `Discovering: ${progress.currentDevice}`;
        }
        
        // Add log entry
        this.addDiscoveryLogEntry(progress.phase, progress.currentDevice || '', 'info');
    }

    onAdvancedDiscoveryComplete(results) {
        console.log('Discovery complete:', results);
        
        // Update UI
        this.startAdvancedDiscoveryBtn.disabled = false;
        this.stopAdvancedDiscoveryBtn.disabled = true;
        
        // Update final progress
        document.getElementById('discoveryPhase').textContent = 'Completed';
        document.getElementById('discoveryProgressBar').style.width = '100%';
        document.getElementById('discoveryCurrentDevice').textContent = 'Discovery completed successfully';
        
        // Show results
        this.discoveryResults.style.display = 'block';
        this.displayDiscoveryResults(results);
        
        this.addDiscoveryLogEntry('completed', `Found ${results.devices.length} devices`, 'success');
    }

    onAdvancedDiscoveryError(error) {
        console.error('Discovery error:', error);
        
        // Update UI
        this.startAdvancedDiscoveryBtn.disabled = false;
        this.stopAdvancedDiscoveryBtn.disabled = true;
        
        document.getElementById('discoveryPhase').textContent = 'Error';
        document.getElementById('discoveryCurrentDevice').textContent = `Error: ${error.message}`;
        
        this.addDiscoveryLogEntry('error', error.message, 'error');
    }

    displayDiscoveryResults(results) {
        // Update summary
        document.getElementById('totalDiscoveredDevices').textContent = results.devices.length;
        document.getElementById('totalNeighborConnections').textContent = results.neighborRelationships.length;
        document.getElementById('totalMacMappings').textContent = results.macAddressMappings.length;
        document.getElementById('totalInterfaceConnections').textContent = results.interfaceConnections.length;

        // Display devices table
        this.displayDiscoveredDevicesTable(results.devices);
        
        // Display connections table
        this.displayInterfaceConnectionsTable(results.interfaceConnections);
        
        // Display MAC mappings table
        this.displayMacMappingsTable(results.macAddressMappings);
        
        // Display topology preview
        this.displayTopologyPreview(results.topology);
    }

    displayDiscoveredDevicesTable(devices) {
        const container = document.getElementById('discoveredDevicesTable');
        if (!container) return;

        if (devices.length === 0) {
            container.innerHTML = '<p class="no-data">No devices discovered</p>';
            return;
        }

        let html = `
            <table class="discovery-table">
                <thead>
                    <tr>
                        <th>IP Address</th>
                        <th>Hostname</th>
                        <th>Vendor</th>
                        <th>Model</th>
                        <th>Discovery Method</th>
                        <th>Interfaces</th>
                        <th>Last Discovered</th>
                    </tr>
                </thead>
                <tbody>
        `;

        devices.forEach(device => {
            html += `
                <tr>
                    <td>${device.ip}</td>
                    <td>${device.hostname || 'Unknown'}</td>
                    <td>${device.vendor || 'Unknown'}</td>
                    <td>${device.model || 'Unknown'}</td>
                    <td><span class="method-badge ${device.discoveryMethod}">${device.discoveryMethod}</span></td>
                    <td>${device.interfaces ? device.interfaces.size || 0 : 0}</td>
                    <td>${new Date(device.lastDiscovered).toLocaleString()}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    displayInterfaceConnectionsTable(connections) {
        const container = document.getElementById('interfaceConnectionsTable');
        if (!container) return;

        if (connections.length === 0) {
            container.innerHTML = '<p class="no-data">No interface connections found</p>';
            return;
        }

        let html = `
            <table class="discovery-table">
                <thead>
                    <tr>
                        <th>Local Device</th>
                        <th>Local Interface</th>
                        <th>Remote Device</th>
                        <th>Remote Interface</th>
                        <th>Connection Type</th>
                        <th>Confidence</th>
                        <th>Protocol</th>
                    </tr>
                </thead>
                <tbody>
        `;

        connections.forEach(([key, connection]) => {
            html += `
                <tr>
                    <td>${connection.device1.hostname || connection.device1.ip}</td>
                    <td>${connection.device1.interface}</td>
                    <td>${connection.device2.hostname || connection.device2.ip}</td>
                    <td>${connection.device2.interface}</td>
                    <td><span class="type-badge ${connection.type}">${connection.type}</span></td>
                    <td><span class="confidence-badge ${connection.confidence}">${connection.confidence}</span></td>
                    <td>${connection.protocol || 'N/A'}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    displayMacMappingsTable(macMappings) {
        const container = document.getElementById('macMappingsTable');
        if (!container) return;

        if (macMappings.length === 0) {
            container.innerHTML = '<p class="no-data">No MAC address mappings found</p>';
            return;
        }

        let html = `
            <table class="discovery-table">
                <thead>
                    <tr>
                        <th>MAC Address</th>
                        <th>Device</th>
                        <th>Port</th>
                        <th>VLAN</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        macMappings.forEach(([mac, locations]) => {
            locations.forEach(location => {
                html += `
                    <tr>
                        <td>${mac}</td>
                        <td>${location.deviceName}</td>
                        <td>${location.port}</td>
                        <td>${location.vlan || 'N/A'}</td>
                        <td><span class="status-badge ${location.status}">${location.status}</span></td>
                    </tr>
                `;
            });
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    displayTopologyPreview(topology) {
        const container = document.getElementById('topologyPreview');
        if (!container) return;

        if (!topology || topology.nodes.length === 0) {
            container.innerHTML = '<p class="no-data">No topology data available</p>';
            return;
        }

        // Simple topology summary for now
        const summary = topology.summary;
        container.innerHTML = `
            <div class="topology-summary">
                <h4>Network Topology Summary</h4>
                <div class="topology-stats">
                    <div class="stat-item">
                        <span class="stat-number">${summary.totalDevices}</span>
                        <span class="stat-label">Devices</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${summary.totalConnections}</span>
                        <span class="stat-label">Connections</span>
                    </div>
                </div>
                <div class="device-types">
                    <h5>Device Types:</h5>
                    ${Object.entries(summary.deviceTypes).map(([type, count]) => 
                        `<span class="device-type-badge">${type}: ${count}</span>`
                    ).join('')}
                </div>
                <div class="vendors">
                    <h5>Vendors:</h5>
                    ${Object.entries(summary.vendors).map(([vendor, count]) => 
                        `<span class="vendor-badge">${vendor}: ${count}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    formatDiscoveryPhase(phase) {
        const phaseNames = {
            'idle': 'Idle',
            'initializing': 'Initializing',
            'discovering_devices': 'Discovering Devices',
            'discovering_neighbors': 'Discovering Neighbors',
            'analyzing_mac_tables': 'Analyzing MAC Tables',
            'mapping_connections': 'Mapping Connections',
            'finalizing': 'Finalizing',
            'completed': 'Completed',
            'error': 'Error'
        };
        return phaseNames[phase] || phase;
    }

    addDiscoveryLogEntry(phase, message, type = 'info') {
        const logsContainer = document.getElementById('discoveryLogs');
        if (!logsContainer) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-phase">[${this.formatDiscoveryPhase(phase)}]</span>
            <span class="log-message">${message}</span>
        `;

        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    onCredentialTestComplete(results) {
        console.log('Credential test results:', results);
        // Implementation for displaying test results
    }

    isValidIP(ip) {
        const parts = ip.split('.');
        return parts.length === 4 && parts.every(part => {
            const num = parseInt(part);
            return num >= 0 && num <= 255;
        });
    }

    switchTab(targetTabId) {
        // Remove active class from all tabs and tab contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        document.querySelector(`[data-tab="${targetTabId}"]`).classList.add('active');
        document.getElementById(targetTabId).classList.add('active');
    }

    async loadPythonScripts() {
        try {
            const response = await fetch('/api/scripts');
            const scripts = await response.json();
            this.displayPythonScripts(scripts);
        } catch (error) {
            console.error('Error loading Python scripts:', error);
        }
    }

    displayPythonScripts(scripts) {
        const container = document.getElementById('script-list');
        if (!container) return;

        if (scripts.length === 0) {
            container.innerHTML = '<div class="empty-state">No scripts available. Create your first script!</div>';
            return;
        }

        const scriptsHTML = scripts.map(script => `
            <div class="script-item" data-script="${script.name}">
                <div class="script-header">
                    <h4>${script.metadata?.name || script.name}</h4>
                    <div class="script-actions">
                        <button onclick="loadScript('${script.name}')" class="btn-secondary">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="executeScript('${script.name}')" class="btn-primary">
                            <i class="fas fa-play"></i> Run
                        </button>
                    </div>
                </div>
                <p class="script-description">${script.metadata?.description || 'No description'}</p>
                <div class="script-meta">
                    <span class="script-author">Author: ${script.metadata?.author || 'Unknown'}</span>
                    <span class="script-version">Version: ${script.metadata?.version || '1.0'}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = scriptsHTML;
    }

    async loadUniversalSearch() {
        // Initialize search interface if needed
        console.log('Universal Search section loaded');
    }

    async loadN8nWorkflows() {
        try {
            console.log('Loading N8N Workflows section...');
            
            // Load workflow statistics
            const stats = await fetch('/api/n8n/stats');
            if (stats.ok) {
                const statsData = await stats.json();
                this.updateN8nStats(statsData.stats);
            }
            
            // Load workflows
            const workflows = await fetch('/api/n8n/workflows');
            if (workflows.ok) {
                const workflowsData = await workflows.json();
                this.displayN8nWorkflows(workflowsData.workflows);
            }
            
            // Test connection
            const connection = await fetch('/api/n8n/status');
            if (connection.ok) {
                const connectionData = await connection.json();
                this.updateN8nConnectionStatus(connectionData);
            }
        } catch (error) {
            console.error('Error loading N8N workflows:', error);
        }
    }

    updateN8nStats(stats) {
        if (stats) {
            document.getElementById('total-workflows').textContent = stats.totalWorkflows || 0;
            document.getElementById('active-workflows').textContent = stats.activeWorkflows || 0;
            document.getElementById('recent-executions').textContent = stats.totalExecutions || 0;
            
            const successRate = stats.totalExecutions > 0 ? 
                Math.round((stats.successfulExecutions / stats.totalExecutions) * 100) : 0;
            document.getElementById('success-rate').textContent = successRate + '%';
        }
    }

    updateN8nConnectionStatus(status) {
        const statusElement = document.getElementById('n8n-connection-status');
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('span:last-child');
        const detailsElement = document.getElementById('n8n-connection-details');
        
        if (status.success) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'N8N Connection Status: Connected';
            detailsElement.textContent = `Connected to N8N (${status.activeWorkflows} active workflows)`;
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'N8N Connection Status: Disconnected';
            detailsElement.textContent = status.error || 'Unable to connect to N8N instance';
        }
    }

    displayN8nWorkflows(workflows) {
        const container = document.getElementById('workflows-list');
        if (!container) return;
        
        if (!workflows || workflows.length === 0) {
            container.innerHTML = '<div class="empty-state">No workflows found. Create your first workflow or deploy a template.</div>';
            return;
        }
        
        const workflowsHTML = workflows.map(workflow => `
            <div class="workflow-item" data-workflow="${workflow.id}">
                <div class="workflow-header">
                    <h4>${workflow.name}</h4>
                    <div class="workflow-status">
                        <span class="status-badge ${workflow.active ? 'active' : 'inactive'}">
                            ${workflow.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div class="workflow-info">
                    <p>Nodes: ${workflow.nodes ? workflow.nodes.length : 0}</p>
                    <p>Updated: ${workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div class="workflow-actions">
                    <button onclick="executeN8nWorkflow('${workflow.id}')" class="btn-primary btn-sm">
                        <i class="fas fa-play"></i> Execute
                    </button>
                    <button onclick="toggleWorkflowStatus('${workflow.id}', ${workflow.active})" class="btn-secondary btn-sm">
                        <i class="fas fa-${workflow.active ? 'pause' : 'play'}"></i> 
                        ${workflow.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onclick="editWorkflow('${workflow.id}')" class="btn-secondary btn-sm">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteWorkflow('${workflow.id}')" class="btn-danger btn-sm">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = workflowsHTML;
    }
}

// Global functions
function switchSection(section) {
    window.dashboard.switchSection(section);
}

function addDevice() {
    const modal = document.getElementById('addDeviceModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal() {
    window.dashboard.closeModal();
}

function saveDevice() {
    // Implementation for saving device
    console.log('Save device');
    closeModal();
}

function copyConfig() {
    const configOutput = document.getElementById('configOutput');
    if (configOutput) {
        navigator.clipboard.writeText(configOutput.textContent);
        alert('Configuration copied to clipboard!');
    }
}

function downloadConfig() {
    const configOutput = document.getElementById('configOutput');
    if (configOutput) {
        const blob = new Blob([configOutput.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
}

function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-content">
                    <p>Chat history cleared. How can I help you?</p>
                </div>
            </div>
        `;
    }
}

// Credential management functions
function addCredentials() {
    const modal = document.getElementById('addCredentialsModal');
    if (modal) {
        modal.style.display = 'block';
        setupCredentialModal();
    }
}

function closeCredentialsModal() {
    const modal = document.getElementById('addCredentialsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function setupCredentialModal() {
    // Toggle credential sections
    const enableSSH = document.getElementById('enableSSHCreds');
    const enableTelnet = document.getElementById('enableTelnetCreds');
    const enableSNMP = document.getElementById('enableSNMPCreds');
    const snmpVersion = document.getElementById('snmpVersion');

    if (enableSSH) {
        enableSSH.addEventListener('change', () => {
            document.getElementById('sshFields').style.display = enableSSH.checked ? 'block' : 'none';
        });
    }

    if (enableTelnet) {
        enableTelnet.addEventListener('change', () => {
            document.getElementById('telnetFields').style.display = enableTelnet.checked ? 'block' : 'none';
        });
    }

    if (enableSNMP) {
        enableSNMP.addEventListener('change', () => {
            document.getElementById('snmpFields').style.display = enableSNMP.checked ? 'block' : 'none';
        });
    }

    if (snmpVersion) {
        snmpVersion.addEventListener('change', () => {
            const isV3 = snmpVersion.value === '3';
            document.getElementById('snmpV2cFields').style.display = isV3 ? 'none' : 'block';
            document.getElementById('snmpV3Fields').style.display = isV3 ? 'block' : 'none';
        });
    }
}

async function saveCredentials() {
    const formData = {
        name: document.getElementById('credentialName').value,
        description: document.getElementById('credentialDescription').value,
        ssh: null,
        telnet: null,
        snmp: null
    };

    if (document.getElementById('enableSSHCreds').checked) {
        formData.ssh = {
            username: document.getElementById('sshUsername').value,
            password: document.getElementById('sshPassword').value,
            port: parseInt(document.getElementById('sshPort').value) || 22,
            enablePassword: document.getElementById('sshEnablePassword').value || null
        };
    }

    if (document.getElementById('enableTelnetCreds').checked) {
        formData.telnet = {
            username: document.getElementById('telnetUsername').value,
            password: document.getElementById('telnetPassword').value,
            port: parseInt(document.getElementById('telnetPort').value) || 23,
            enablePassword: document.getElementById('telnetEnablePassword').value || null
        };
    }

    if (document.getElementById('enableSNMPCreds').checked) {
        const version = document.getElementById('snmpVersion').value;
        formData.snmp = {
            version: version,
            port: parseInt(document.getElementById('snmpPort').value) || 161
        };

        if (version === '2c') {
            formData.snmp.community = document.getElementById('snmpCommunity').value;
        } else {
            formData.snmp.username = document.getElementById('snmpV3Username').value;
            formData.snmp.authProtocol = document.getElementById('snmpAuthProtocol').value;
            formData.snmp.authPassword = document.getElementById('snmpAuthPassword').value;
            formData.snmp.privProtocol = document.getElementById('snmpPrivProtocol').value;
            formData.snmp.privPassword = document.getElementById('snmpPrivPassword').value;
        }
    }

    try {
        const response = await fetch('/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Credentials saved successfully!');
            closeCredentialsModal();
            window.dashboard.loadCredentials(); // Refresh the credentials list
        } else {
            alert('Error saving credentials: ' + result.error);
        }
    } catch (error) {
        alert('Error saving credentials: ' + error.message);
    }
}

async function testCredentials() {
    const targetIP = prompt('Enter target IP address to test credentials:');
    if (!targetIP) return;

    // Implementation for testing credentials
    console.log('Testing credentials against:', targetIP);
}

async function editCredentials(id) {
    console.log('Edit credentials:', id);
    // Implementation for editing credentials
}

async function deleteCredentials(id) {
    if (!confirm('Are you sure you want to delete these credentials?')) return;

    try {
        const response = await fetch(`/api/credentials/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Credentials deleted successfully!');
            window.dashboard.loadCredentials(); // Refresh the credentials list
        } else {
            const result = await response.json();
            alert('Error deleting credentials: ' + result.error);
        }
    } catch (error) {
        alert('Error deleting credentials: ' + error.message);
    }
}

// Topology functions
function viewFullTopology() {
    window.open('/topology', '_blank');
}

function exportTopology() {
    window.open('/api/topology/export/json', '_blank');
}

// Policy management functions
function refreshPolicies() {
    console.log('Refreshing firewall policies...');
    // Implementation for refreshing policies
}

function exportPolicies() {
    console.log('Exporting firewall policies...');
    // Implementation for exporting policies
}

// Interface management functions  
function refreshInterfaces() {
    console.log('Refreshing interface statistics...');
    // Implementation for refreshing interface stats
}

function exportInterfaceStats() {
    console.log('Exporting interface statistics...');
    // Implementation for exporting interface stats
}

function configureMonitoring() {
    console.log('Configuring interface monitoring...');
    // Implementation for configuring monitoring
}

// API Integration Functions
let apiConfigurations = {};
let apiConnections = {};

function initializeApiIntegration() {
    // Setup tab switching for API integration
    const apiTabButtons = document.querySelectorAll('.api-tabs .tab-btn');
    apiTabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetTab = button.getAttribute('data-tab');
            switchApiTab(targetTab);
        });
    });

    // Load saved API configurations
    loadApiConfigurations();
}

function switchApiTab(targetTabId) {
    // Remove active class from all buttons and content
    document.querySelectorAll('.api-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.api-tabs .tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to selected button and content
    const targetButton = document.querySelector(`[data-tab="${targetTabId}"]`);
    const targetContent = document.getElementById(targetTabId);
    
    if (targetButton && targetContent) {
        targetButton.classList.add('active');
        targetContent.classList.add('active');
    }
}

async function testApiConnection(vendor) {
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    button.disabled = true;

    try {
        const config = getApiFormData(vendor);
        
        const response = await fetch(`/api/vendor-api/${vendor}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();
        
        updateConnectionStatus(vendor, result.success, result.message);
        
        if (result.success) {
            showOperations(vendor);
            showNotification('Connection successful!', 'success');
        } else {
            showNotification(`Connection failed: ${result.message}`, 'error');
        }

    } catch (error) {
        console.error('API test error:', error);
        updateConnectionStatus(vendor, false, error.message);
        showNotification(`Connection error: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function saveApiConfig(vendor) {
    try {
        const config = getApiFormData(vendor);
        
        const response = await fetch(`/api/vendor-api/${vendor}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();
        
        if (result.success) {
            apiConfigurations[vendor] = config;
            updateHostDisplay(vendor, config.host);
            showNotification('Configuration saved successfully!', 'success');
        } else {
            showNotification(`Save failed: ${result.message}`, 'error');
        }

    } catch (error) {
        console.error('Save config error:', error);
        showNotification(`Save error: ${error.message}`, 'error');
    }
}

async function executeApiOperation(vendor, operation) {
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
    button.disabled = true;

    try {
        const response = await fetch(`/api/vendor-api/${vendor}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ operation })
        });

        const result = await response.json();
        
        if (result.success) {
            displayApiResults(vendor, operation, result.data);
            showNotification(`${operation} executed successfully!`, 'success');
        } else {
            showNotification(`Operation failed: ${result.message}`, 'error');
        }

    } catch (error) {
        console.error('API operation error:', error);
        showNotification(`Operation error: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function getApiFormData(vendor) {
    return {
        host: document.getElementById(`${vendor}-host`).value,
        port: parseInt(document.getElementById(`${vendor}-port`).value),
        username: document.getElementById(`${vendor}-username`).value,
        password: document.getElementById(`${vendor}-password`).value,
        protocol: document.getElementById(`${vendor}-protocol`)?.value || 'https'
    };
}

function updateConnectionStatus(vendor, isConnected, message) {
    const statusElement = document.getElementById(`${vendor}-status`);
    const statusDot = statusElement.querySelector('.status-dot');
    const statusText = statusElement.querySelector('span:last-child');
    const statusCard = document.getElementById(`${vendor}-status-card`);
    const statusIndicator = statusCard.querySelector('.status-indicator');

    if (isConnected) {
        statusElement.classList.add('connected');
        statusDot.classList.remove('offline');
        statusDot.classList.add('online');
        statusText.textContent = 'Connected';
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
        statusIndicator.textContent = 'Online';
    } else {
        statusElement.classList.remove('connected');
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = message || 'Not Connected';
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusIndicator.textContent = 'Offline';
    }

    // Update last test time
    const lastTestElement = document.getElementById(`${vendor}-last-test`);
    if (lastTestElement) {
        lastTestElement.textContent = new Date().toLocaleString();
    }
}

function showOperations(vendor) {
    const operationsElement = document.getElementById(`${vendor}-operations`);
    if (operationsElement) {
        operationsElement.style.display = 'block';
    }
}

function updateHostDisplay(vendor, host) {
    const hostDisplayElement = document.getElementById(`${vendor}-host-display`);
    if (hostDisplayElement) {
        hostDisplayElement.textContent = host || 'Not configured';
    }
}

function displayApiResults(vendor, operation, data) {
    const resultsContainer = document.getElementById('api-results');
    const resultsContent = document.getElementById('api-results-content');
    
    if (resultsContainer && resultsContent) {
        resultsContainer.style.display = 'block';
        
        const timestamp = new Date().toLocaleString();
        const resultText = `[${timestamp}] ${vendor.toUpperCase()} - ${operation}\n\n${JSON.stringify(data, null, 2)}`;
        
        resultsContent.textContent = resultText;
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function clearApiResults() {
    const resultsContainer = document.getElementById('api-results');
    const resultsContent = document.getElementById('api-results-content');
    
    if (resultsContainer && resultsContent) {
        resultsContent.textContent = '';
        resultsContainer.style.display = 'none';
    }
}

async function testAllConnections() {
    const vendors = ['arista', 'firepower', 'paloalto', 'fortigate'];
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing All...';
    button.disabled = true;

    try {
        for (const vendor of vendors) {
            const config = apiConfigurations[vendor];
            if (config && config.host) {
                try {
                    const response = await fetch(`/api/vendor-api/${vendor}/test`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(config)
                    });

                    const result = await response.json();
                    updateConnectionStatus(vendor, result.success, result.message);
                    
                    if (result.success) {
                        showOperations(vendor);
                    }
                } catch (error) {
                    updateConnectionStatus(vendor, false, error.message);
                }
            } else {
                updateConnectionStatus(vendor, false, 'Not configured');
            }
        }
        
        showNotification('Connection tests completed!', 'info');
    } catch (error) {
        showNotification(`Test error: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function exportApiConfig() {
    const config = {
        timestamp: new Date().toISOString(),
        configurations: {}
    };

    Object.keys(apiConfigurations).forEach(vendor => {
        const vendorConfig = { ...apiConfigurations[vendor] };
        // Remove sensitive data
        delete vendorConfig.password;
        config.configurations[vendor] = vendorConfig;
    });

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('API configuration exported!', 'success');
}

function loadApiConfigurations() {
    // Load configurations from localStorage or server
    const saved = localStorage.getItem('apiConfigurations');
    if (saved) {
        try {
            apiConfigurations = JSON.parse(saved);
            
            // Populate forms with saved data (excluding passwords)
            Object.keys(apiConfigurations).forEach(vendor => {
                const config = apiConfigurations[vendor];
                const hostInput = document.getElementById(`${vendor}-host`);
                const portInput = document.getElementById(`${vendor}-port`);
                const usernameInput = document.getElementById(`${vendor}-username`);
                const protocolSelect = document.getElementById(`${vendor}-protocol`);
                
                if (hostInput && config.host) hostInput.value = config.host;
                if (portInput && config.port) portInput.value = config.port;
                if (usernameInput && config.username) usernameInput.value = config.username;
                if (protocolSelect && config.protocol) protocolSelect.value = config.protocol;
                
                updateHostDisplay(vendor, config.host);
            });
        } catch (error) {
            console.error('Error loading API configurations:', error);
        }
    }
}

function saveApiConfigurationsToStorage() {
    // Save configurations to localStorage (excluding passwords)
    const configToSave = {};
    Object.keys(apiConfigurations).forEach(vendor => {
        const config = { ...apiConfigurations[vendor] };
        delete config.password; // Don't save passwords to localStorage
        configToSave[vendor] = config;
    });
    
    localStorage.setItem('apiConfigurations', JSON.stringify(configToSave));
}

// Python Scripts Functions
async function loadScript(scriptName) {
    try {
        const response = await fetch(`/api/scripts/${scriptName}`);
        const data = await response.json();
        
        const editor = document.getElementById('scriptEditor');
        if (editor) {
            editor.value = data.content;
            document.getElementById('scriptName').value = scriptName;
        }
    } catch (error) {
        console.error('Error loading script:', error);
        alert('Error loading script: ' + error.message);
    }
}

async function saveScript() {
    const scriptName = document.getElementById('scriptName').value.trim();
    const content = document.getElementById('scriptEditor').value;
    
    if (!scriptName) {
        alert('Please enter a script name');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: scriptName,
                content: content,
                metadata: { author: 'User', version: '1.0' }
            })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Script saved successfully!');
            window.dashboard.loadPythonScripts(); // Refresh the scripts list
        } else {
            alert('Error saving script: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving script:', error);
        alert('Error saving script: ' + error.message);
    }
}

async function executeScript(scriptName) {
    const outputArea = document.getElementById('script-output');
    if (outputArea) {
        outputArea.innerHTML = '<div class="output-line">🚀 Starting script execution...</div>';
    }
    
    try {
        const response = await fetch(`/api/scripts/${scriptName}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parameters: {}, options: {} })
        });
        
        const result = await response.json();
        if (result.success) {
            if (outputArea) {
                outputArea.innerHTML += `<div class="output-line success">✅ Script execution completed successfully!</div>`;
                if (result.result) {
                    outputArea.innerHTML += `<div class="output-line">📊 Results saved to database</div>`;
                }
            }
        } else {
            if (outputArea) {
                outputArea.innerHTML += `<div class="output-line error">❌ Script execution failed: ${result.error}</div>`;
            }
        }
    } catch (error) {
        console.error('Error executing script:', error);
        if (outputArea) {
            outputArea.innerHTML += `<div class="output-line error">❌ Error executing script: ${error.message}</div>`;
        }
    }
}

function clearOutput() {
    const outputArea = document.getElementById('script-output');
    if (outputArea) {
        outputArea.innerHTML = '<div class="output-placeholder">Script output will appear here...</div>';
    }
}

function downloadOutput() {
    const outputArea = document.getElementById('script-output');
    if (outputArea) {
        const content = outputArea.textContent || outputArea.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script-output.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
}

function newScript() {
    document.getElementById('scriptName').value = '';
    document.getElementById('scriptEditor').value = '';
    clearOutput();
}

// Additional functions to match HTML button calls
function createNewScript() {
    // Create a new tab for script editing
    const tabBar = document.querySelector('.tab-bar');
    const editorTabs = document.querySelector('.script-editor-area');
    
    // Remove welcome tab active state
    document.querySelector('.welcome-tab').classList.remove('active');
    document.getElementById('welcome-tab').classList.remove('active');
    
    // Create new editor tab
    const newTabId = 'editor-tab-' + Date.now();
    const newTab = document.createElement('div');
    newTab.className = 'tab active';
    newTab.setAttribute('data-tab', newTabId);
    newTab.innerHTML = `
        <span>New Script</span>
        <i class="fas fa-times tab-close" onclick="closeTab('${newTabId}')"></i>
    `;
    
    tabBar.appendChild(newTab);
    
    // Create new editor content
    const editorContent = document.createElement('div');
    editorContent.id = newTabId;
    editorContent.className = 'editor-tab active';
    editorContent.innerHTML = `
        <div class="script-editor-container">
            <div class="editor-header">
                <input type="text" id="scriptName" placeholder="Script Name" class="script-name-input">
                <select id="scriptCategory" class="script-category-select">
                    <option value="general">General</option>
                    <option value="health">Health Check</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="analysis">Analysis</option>
                    <option value="automation">Automation</option>
                </select>
            </div>
            <textarea id="scriptEditor" class="code-editor" placeholder="# Python script goes here...
# Available functions:
# - get_network_devices()
# - get_device_config(ip)
# - get_interface_stats(ip)
# - ping_device(ip)
# - log_message(message, level)
# - save_result(key, data)

print('Hello, Network World!')"></textarea>
        </div>
    `;
    
    editorTabs.appendChild(editorContent);
}

function importScript() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.py';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                createNewScript();
                document.getElementById('scriptName').value = file.name.replace('.py', '');
                document.getElementById('scriptEditor').value = e.target.result;
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function refreshScriptLibrary() {
    if (window.dashboard) {
        window.dashboard.loadPythonScripts();
    }
}

function filterScripts() {
    const searchTerm = document.getElementById('script-search').value.toLowerCase();
    const scriptItems = document.querySelectorAll('.script-item');
    
    scriptItems.forEach(item => {
        const title = item.querySelector('h4').textContent.toLowerCase();
        const description = item.querySelector('.script-description').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function saveCurrentScript() {
    const scriptName = document.getElementById('scriptName');
    const scriptEditor = document.getElementById('scriptEditor');
    
    if (!scriptName || !scriptEditor) {
        alert('No script is currently being edited');
        return;
    }
    
    if (!scriptName.value.trim()) {
        alert('Please enter a script name');
        scriptName.focus();
        return;
    }
    
    saveScript();
}

function runCurrentScript() {
    const scriptName = document.getElementById('scriptName');
    
    if (!scriptName || !scriptName.value.trim()) {
        alert('Please save the script first');
        return;
    }
    
    executeScript(scriptName.value.trim());
}

async function loadExampleScript(scriptName) {
    try {
        const response = await fetch(`/api/scripts/${scriptName}`);
        const data = await response.json();
        
        createNewScript();
        document.getElementById('scriptName').value = scriptName.replace('.py', '');
        document.getElementById('scriptEditor').value = data.content;
        
        // Update tab title
        const activeTab = document.querySelector('.tab.active span');
        if (activeTab) {
            activeTab.textContent = scriptName.replace('.py', '');
        }
    } catch (error) {
        console.error('Error loading example script:', error);
        alert('Error loading example script: ' + error.message);
    }
}

function closeTab(tabId) {
    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);
    
    if (tab) tab.remove();
    if (content) content.remove();
    
    // If no tabs left, show welcome tab
    const remainingTabs = document.querySelectorAll('.tab:not(.welcome-tab)');
    if (remainingTabs.length === 0) {
        document.querySelector('.welcome-tab').classList.add('active');
        document.getElementById('welcome-tab').classList.add('active');
    }
}

// N8N Workflow Functions
async function testN8nConnection() {
    try {
        const response = await fetch('/api/n8n/status');
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ N8N Connected!\nActive workflows: ${result.activeWorkflows}\nVersion: ${result.version}`);
        } else {
            alert(`❌ N8N Connection Failed!\nError: ${result.error}`);
        }
        
        if (window.dashboard) {
            window.dashboard.updateN8nConnectionStatus(result);
        }
    } catch (error) {
        alert(`❌ Connection Error: ${error.message}`);
    }
}

async function refreshWorkflows() {
    if (window.dashboard) {
        await window.dashboard.loadN8nWorkflows();
    }
}

async function executeN8nWorkflow(workflowId) {
    try {
        const response = await fetch(`/api/n8n/workflows/${workflowId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Workflow executed successfully!\nExecution ID: ${result.executionId}`);
            refreshWorkflows();
        } else {
            alert(`❌ Workflow execution failed!\nError: ${result.error}`);
        }
    } catch (error) {
        alert(`❌ Execution Error: ${error.message}`);
    }
}

async function toggleWorkflowStatus(workflowId, currentStatus) {
    try {
        const action = currentStatus ? 'deactivate' : 'activate';
        const response = await fetch(`/api/n8n/workflows/${workflowId}/${action}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Workflow ${action}d successfully!`);
            refreshWorkflows();
        } else {
            alert(`❌ Failed to ${action} workflow!\nError: ${result.error}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

async function deleteWorkflow(workflowId) {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
        const response = await fetch(`/api/n8n/workflows/${workflowId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Workflow deleted successfully!');
            refreshWorkflows();
        } else {
            alert(`❌ Failed to delete workflow!\nError: ${result.error}`);
        }
    } catch (error) {
        alert(`❌ Delete Error: ${error.message}`);
    }
}

function editWorkflow(workflowId) {
    // Open N8N editor in new tab
    window.open(`http://localhost:5678/workflow/${workflowId}`, '_blank');
}

function openWorkflowEditor() {
    // Open N8N editor in new tab
    window.open('http://localhost:5678/workflow/new', '_blank');
}

async function deployTemplate(templateName) {
    try {
        const response = await fetch(`/api/n8n/templates/${templateName}/deploy`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Template deployed successfully!\nWorkflow: ${result.workflow.name}`);
            refreshWorkflows();
        } else {
            alert(`❌ Template deployment failed!\nError: ${result.error}`);
        }
    } catch (error) {
        alert(`❌ Deployment Error: ${error.message}`);
    }
}

async function previewTemplate(templateName) {
    try {
        const response = await fetch('/api/n8n/templates');
        const result = await response.json();
        
        if (result.success && result.templates[templateName]) {
            const template = result.templates[templateName];
            const preview = `
Template: ${template.name}
Description: ${template.description}
Nodes: ${template.nodes.length}

Nodes:
${template.nodes.map(node => `- ${node.name} (${node.type})`).join('\n')}
            `;
            alert(preview);
        } else {
            alert('Template not found');
        }
    } catch (error) {
        alert(`❌ Preview Error: ${error.message}`);
    }
}

async function toggleEventTrigger(eventType, enabled) {
    try {
        console.log(`${enabled ? 'Enabling' : 'Disabling'} event trigger: ${eventType}`);
        
        // Store trigger settings in localStorage for now
        const triggers = JSON.parse(localStorage.getItem('n8n-triggers') || '{}');
        triggers[eventType] = enabled;
        localStorage.setItem('n8n-triggers', JSON.stringify(triggers));
        
        const status = enabled ? 'enabled' : 'disabled';
        console.log(`Event trigger ${eventType} ${status}`);
        
        // In a real implementation, this would configure the actual event listeners
        // For now, we'll just store the preference
        
    } catch (error) {
        console.error('Error toggling event trigger:', error);
    }
}

function filterWorkflows() {
    const searchTerm = document.getElementById('workflow-search').value.toLowerCase();
    const statusFilter = document.getElementById('workflow-status-filter').value;
    const workflowItems = document.querySelectorAll('.workflow-item');
    
    workflowItems.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        const statusBadge = item.querySelector('.status-badge');
        const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';
        
        const matchesSearch = name.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter);
        
        if (matchesSearch && matchesStatus) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterExecutions() {
    const statusFilter = document.getElementById('execution-status-filter').value;
    const dateFilter = document.getElementById('execution-date-filter').value;
    
    console.log('Filtering executions:', { statusFilter, dateFilter });
    // Implementation would filter the executions list
}

// N8N Configuration Functions
async function openN8nConfig() {
    const modal = document.getElementById('n8nConfigModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Load current configuration
        try {
            const response = await fetch('/api/n8n/config');
            const result = await response.json();
            
            if (result.success) {
                const config = result.config;
                document.getElementById('n8n-base-url').value = config.baseUrl || 'http://localhost:5678';
                document.getElementById('n8n-auth-type').value = config.authType || 'none';
                toggleAuthFields();
            }
        } catch (error) {
            console.error('Error loading N8N config:', error);
        }
    }
}

function closeN8nConfigModal() {
    const modal = document.getElementById('n8nConfigModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleAuthFields() {
    const authType = document.getElementById('n8n-auth-type').value;
    const apiKeyFields = document.getElementById('api-key-fields');
    const basicAuthFields = document.getElementById('basic-auth-fields');
    
    // Hide all auth fields
    apiKeyFields.style.display = 'none';
    basicAuthFields.style.display = 'none';
    
    // Show relevant fields
    if (authType === 'apikey') {
        apiKeyFields.style.display = 'block';
    } else if (authType === 'basic') {
        basicAuthFields.style.display = 'block';
    }
}

function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

async function testN8nConfigConnection() {
    const baseUrl = document.getElementById('n8n-base-url').value;
    const authType = document.getElementById('n8n-auth-type').value;
    const apiKey = document.getElementById('n8n-api-key').value;
    const username = document.getElementById('n8n-username').value;
    const password = document.getElementById('n8n-password').value;
    
    try {
        const response = await fetch('/api/n8n/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                baseUrl,
                authType,
                apiKey,
                username,
                password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Test the connection
            const testResponse = await fetch('/api/n8n/status');
            const testResult = await testResponse.json();
            
            if (testResult.success) {
                alert(`✅ N8N Connection Successful!\nActive workflows: ${testResult.activeWorkflows}\nVersion: ${testResult.version}`);
            } else {
                alert(`❌ N8N Connection Failed!\nError: ${testResult.error}`);
            }
        } else {
            alert(`❌ Configuration Error: ${result.error}`);
        }
    } catch (error) {
        alert(`❌ Connection Error: ${error.message}`);
    }
}

// Handle N8N configuration form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('n8nConfigForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const baseUrl = document.getElementById('n8n-base-url').value;
            const authType = document.getElementById('n8n-auth-type').value;
            const apiKey = document.getElementById('n8n-api-key').value;
            const username = document.getElementById('n8n-username').value;
            const password = document.getElementById('n8n-password').value;
            
            try {
                const response = await fetch('/api/n8n/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        baseUrl,
                        authType,
                        apiKey,
                        username,
                        password
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ N8N Configuration saved successfully!');
                    closeN8nConfigModal();
                    
                    // Refresh the N8N section
                    if (window.dashboard) {
                        window.dashboard.loadN8nWorkflows();
                    }
                } else {
                    alert(`❌ Configuration Error: ${result.error}`);
                }
            } catch (error) {
                alert(`❌ Save Error: ${error.message}`);
            }
        });
    }
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Copied to clipboard!');
    }).catch(() => {
        alert('❌ Failed to copy to clipboard');
    });
}

// Test function for manual section switching
function testSectionSwitch(sectionId) {
    console.log('Test switching to:', sectionId);
    if (window.dashboard) {
        window.dashboard.switchSection(sectionId);
    } else {
        console.error('Dashboard not initialized');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    window.dashboard = new Dashboard();
    initializeApiIntegration();
    
    // Test after a short delay
    setTimeout(() => {
        console.log('Testing navigation after 1 second...');
        console.log('Dashboard object:', window.dashboard);
    }, 1000);
});