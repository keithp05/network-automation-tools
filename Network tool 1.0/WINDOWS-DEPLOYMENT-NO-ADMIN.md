# Windows Deployment Guide (No Admin Rights Required)

## Quick Start

1. **Extract the zip file** to your desired location (e.g., `C:\Users\YourName\NetworkPlatform\`)
2. **Run `install-no-admin.bat`** - This will install dependencies and set up the application
3. **Run `start-platform.bat`** or use the desktop shortcut to start the application
4. **Open browser** to `http://localhost:3000`

## Installation Steps

### 1. Prerequisites
- **Node.js** must be installed (download from https://nodejs.org/)
- Choose "Add to PATH" during Node.js installation
- No admin rights required

### 2. Setup Process
```batch
# 1. Extract zip file
# 2. Open Command Prompt in the extracted folder
# 3. Run installation
install-no-admin.bat
```

### 3. Starting the Application
```batch
# Method 1: Use the batch file
start-platform.bat

# Method 2: Use desktop shortcut (created during installation)
# Double-click "Network Management Platform" on desktop

# Method 3: Manual start
npm start
```

## Network Access

### Local Access Only
- Application runs on `http://localhost:3000`
- No firewall configuration needed

### Network Access (Other Computers)
When Windows prompts about network access:
1. Click **"Allow"** when prompted
2. If blocked, go to Windows Defender Firewall
3. Click "Allow an app through firewall"
4. Find "Node.js" and check both Private and Public networks

### Alternative Port Setup
If port 3000 is in use:
1. Edit `start-platform.bat`
2. Change `set PORT=3000` to `set PORT=8080` (or another port)
3. Access via `http://localhost:8080`

## Auto-Start Setup

### Option 1: Automatic Setup
```batch
auto-start-setup.bat
```

### Option 2: Manual Setup
1. Press `Win + R`, type `shell:startup`
2. Copy `NetworkPlatform.vbs` to the startup folder
3. Application will start automatically on login

## Troubleshooting

### Port Issues
```batch
# Check port availability
network-troubleshoot.bat
```

### Common Issues
1. **Node.js not found**: Reinstall Node.js with "Add to PATH" checked
2. **Port in use**: Change PORT in `start-platform.bat`
3. **Network blocked**: Allow Node.js through Windows Firewall
4. **Dependencies failed**: Run `npm install` manually

### Log Files
- Application logs: `logs/network-platform.log`
- Error logs: Check Command Prompt window

## File Structure
```
NetworkPlatform/
├── start-platform.bat          # Main startup script
├── install-no-admin.bat        # Installation script
├── auto-start-setup.bat        # Auto-start configuration
├── network-troubleshoot.bat    # Network diagnostics
├── windows-configs/             # Windows-specific files
├── server.js                   # Main application
├── package.json                # Dependencies
├── public/                     # Web interface
└── logs/                       # Application logs
```

## Features Available
- ✅ Network Management Dashboard
- ✅ Python Script Engine
- ✅ N8N Workflow Automation
- ✅ Universal Search
- ✅ Configuration Management
- ✅ Real-time Monitoring

## Performance Tips
- Application uses ~100MB RAM
- Minimal CPU usage when idle
- Logs rotate automatically
- No admin privileges required for normal operation

## Support
- Check logs in `logs/` folder
- Run `network-troubleshoot.bat` for diagnostics
- Ensure Node.js is properly installed with PATH access