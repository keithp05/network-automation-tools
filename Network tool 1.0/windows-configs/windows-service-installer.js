/**
 * Windows Service Installer for Network Management Platform
 * This creates a Windows service that starts automatically
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'NetworkManagementPlatform',
    description: 'Network Management Platform with AI and N8N Integration',
    script: path.join(__dirname, '..', 'src', 'enhanced-web-server.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: [
        {
            name: "NODE_ENV",
            value: "production"
        },
        {
            name: "PORT",
            value: "3000"
        }
    ],
    workingDirectory: path.join(__dirname, '..'),
    allowServiceLogon: true
});

// Listen for the "install" event, which indicates the process is available as a service
svc.on('install', function(){
    console.log('✅ Network Management Platform service installed successfully!');
    console.log('🚀 Starting service...');
    svc.start();
});

svc.on('start', function(){
    console.log('✅ Network Management Platform service started!');
    console.log('🌐 Access at: http://localhost:3000');
});

svc.on('stop', function(){
    console.log('⏹️  Network Management Platform service stopped');
});

svc.on('error', function(err){
    console.error('❌ Service error:', err);
});

svc.on('invalidinstallation', function(){
    console.error('❌ Invalid installation');
});

svc.on('alreadyinstalled', function(){
    console.log('⚠️  Service already installed');
});

svc.on('uninstall', function(){
    console.log('🗑️  Service uninstalled');
});

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch(command) {
    case 'install':
        console.log('📦 Installing Network Management Platform as Windows Service...');
        svc.install();
        break;
    
    case 'uninstall':
        console.log('🗑️  Uninstalling Network Management Platform service...');
        svc.uninstall();
        break;
    
    case 'start':
        console.log('🚀 Starting Network Management Platform service...');
        svc.start();
        break;
    
    case 'stop':
        console.log('⏹️  Stopping Network Management Platform service...');
        svc.stop();
        break;
    
    case 'restart':
        console.log('🔄 Restarting Network Management Platform service...');
        svc.restart();
        break;
    
    default:
        console.log('Network Management Platform Service Manager');
        console.log('');
        console.log('Usage:');
        console.log('  node windows-service-installer.js install     - Install as Windows service');
        console.log('  node windows-service-installer.js uninstall   - Remove Windows service');
        console.log('  node windows-service-installer.js start       - Start the service');
        console.log('  node windows-service-installer.js stop        - Stop the service');
        console.log('  node windows-service-installer.js restart     - Restart the service');
        console.log('');
        console.log('After installation, the service will start automatically on Windows boot.');
        break;
}

module.exports = svc;