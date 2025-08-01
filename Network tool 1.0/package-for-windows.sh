#!/bin/bash

# Package Network Management Platform for Windows Deployment
# This script creates a clean deployment package

echo "📦 Packaging Network Management Platform for Windows..."

# Get current directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PACKAGE_NAME="network-management-platform-$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="/tmp/$PACKAGE_NAME"

# Create temporary directory
mkdir -p "$TEMP_DIR"

echo "📁 Copying files to temporary directory..."

# Copy all necessary files, excluding development files
rsync -av --exclude='node_modules' \
         --exclude='.git' \
         --exclude='data' \
         --exclude='logs' \
         --exclude='*.log' \
         --exclude='.DS_Store' \
         --exclude='package-for-windows.sh' \
         --exclude='*.tar.gz' \
         --exclude='*.zip' \
         "$PROJECT_DIR/" "$TEMP_DIR/"

# Create Windows-specific files
echo "🖥️  Creating Windows-specific files..."

# Create Windows batch files
cat > "$TEMP_DIR/start-server.bat" << 'EOF'
@echo off
echo Starting Network Management Platform...
echo.
echo Web Interface: http://localhost:3000
echo N8N Interface: http://localhost:5678
echo.
node src/enhanced-web-server.js
pause
EOF

cat > "$TEMP_DIR/install-dependencies.bat" << 'EOF'
@echo off
echo Installing Node.js dependencies...
echo This may take a few minutes...
echo.
npm install
echo.
echo Dependencies installed successfully!
echo You can now run start-server.bat
pause
EOF

cat > "$TEMP_DIR/setup-windows.bat" << 'EOF'
@echo off
echo Setting up Network Management Platform on Windows...
echo.

echo Creating required directories...
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "config" mkdir config

echo Installing Node.js dependencies...
npm install

echo.
echo Setup complete! You can now run start-server.bat
pause
EOF

# Create README for Windows
cat > "$TEMP_DIR/README-WINDOWS.md" << 'EOF'
# Network Management Platform - Windows Setup

## Quick Start

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Choose LTS version

2. **Run Setup**
   - Double-click: `setup-windows.bat`
   - Wait for installation to complete

3. **Start Application**
   - Double-click: `start-server.bat`
   - Open browser: http://localhost:3000

## Features Available

- ✅ Network Discovery and Scanning
- ✅ Device Management
- ✅ AI Configuration Generator
- ✅ Python Script Engine
- ✅ N8N Workflow Automation
- ✅ Universal Search
- ✅ Firewall Policy Tracking
- ✅ Interface Statistics
- ✅ API Integration

## N8N Setup (Optional)

1. Install N8N globally:
   ```
   npm install n8n -g
   ```

2. Start N8N:
   ```
   n8n start
   ```

3. Configure in dashboard:
   - Go to N8N Workflows → Configure
   - Enter API key from N8N Settings

## Troubleshooting

- **Port 3000 in use**: Close other applications or change port
- **Firewall blocking**: Allow Node.js through Windows Firewall
- **Dependencies failed**: Run as Administrator
- **N8N not connecting**: Verify N8N is running on port 5678

## Support

Check the Windows-Migration-Guide.md for detailed instructions.
EOF

# Create environment variables template
cat > "$TEMP_DIR/config/environment-template.bat" << 'EOF'
@echo off
REM Environment Variables for Network Management Platform
REM Copy this file to environment.bat and customize

set NODE_ENV=production
set PORT=3000
set N8N_BASE_URL=http://localhost:5678
set N8N_WEBHOOK_URL=http://localhost:3000

REM Uncomment and set if using N8N API key
REM set N8N_API_KEY=your_api_key_here
EOF

# Create package.json with Windows scripts if it doesn't exist
if [ ! -f "$TEMP_DIR/package.json" ]; then
cat > "$TEMP_DIR/package.json" << 'EOF'
{
  "name": "network-management-platform",
  "version": "1.0.0",
  "description": "Enhanced Network Management Platform with N8N Integration",
  "main": "src/enhanced-web-server.js",
  "scripts": {
    "start": "node src/enhanced-web-server.js",
    "start:windows": "set NODE_ENV=production && node src/enhanced-web-server.js",
    "dev": "nodemon src/enhanced-web-server.js",
    "test": "echo \"No tests specified\" && exit 0"
  },
  "keywords": ["network", "management", "n8n", "automation"],
  "author": "Network Admin",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "axios": "^1.6.0"
  }
}
EOF
fi

# Create Windows service installer (optional)
cat > "$TEMP_DIR/install-windows-service.js" << 'EOF'
const { Service } = require('node-windows');
const path = require('path');

// First install node-windows: npm install -g node-windows

const svc = new Service({
    name: 'Network Management Platform',
    description: 'Network Management Platform with N8N Integration',
    script: path.join(__dirname, 'src', 'enhanced-web-server.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
});

svc.on('install', () => {
    console.log('Service installed successfully');
    svc.start();
});

svc.on('alreadyinstalled', () => {
    console.log('Service already installed');
});

svc.install();
EOF

# Create directories that need to exist
mkdir -p "$TEMP_DIR/data"
mkdir -p "$TEMP_DIR/logs"
mkdir -p "$TEMP_DIR/config"

# Create .gitkeep files for empty directories
touch "$TEMP_DIR/data/.gitkeep"
touch "$TEMP_DIR/logs/.gitkeep"
touch "$TEMP_DIR/config/.gitkeep"

echo "🗜️  Creating deployment package..."

# Create the deployment package
cd "$(dirname "$TEMP_DIR")"
tar -czf "$PROJECT_DIR/$PACKAGE_NAME.tar.gz" "$PACKAGE_NAME"

# Also create a zip file for Windows users
if command -v zip &> /dev/null; then
    zip -r "$PROJECT_DIR/$PACKAGE_NAME.zip" "$PACKAGE_NAME"
    echo "📦 Created: $PACKAGE_NAME.zip"
fi

echo "📦 Created: $PACKAGE_NAME.tar.gz"

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo "✅ Packaging complete!"
echo ""
echo "📁 Package created: $PROJECT_DIR/$PACKAGE_NAME.tar.gz"
echo "📁 Package created: $PROJECT_DIR/$PACKAGE_NAME.zip"
echo ""
echo "🔄 Next steps:"
echo "1. Copy the .zip file to your Windows PC"
echo "2. Extract the files"
echo "3. Run setup-windows.bat"
echo "4. Run start-server.bat"
echo ""
echo "📖 See Windows-Migration-Guide.md for detailed instructions"
EOF