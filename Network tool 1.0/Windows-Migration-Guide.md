# Moving Network Management Platform from Mac to Windows PC

## 📦 Method 1: Direct File Transfer (Recommended)

### Step 1: Prepare Files on Mac
```bash
# Navigate to your project directory
cd "/Users/keithperez/Documents/Claud/Network tool 1.0"

# Create a deployment package
tar -czf network-tool-deployment.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=data \
  --exclude=logs \
  --exclude=*.log \
  --exclude=.DS_Store \
  .

# Or use zip if you prefer
zip -r network-tool-deployment.zip . \
  -x node_modules/\* \
  -x .git/\* \
  -x data/\* \
  -x logs/\* \
  -x "*.log" \
  -x .DS_Store
```

### Step 2: Transfer to Windows PC
**Options:**
- **USB Drive**: Copy the .tar.gz or .zip file to USB drive
- **Cloud Storage**: Upload to Google Drive, OneDrive, Dropbox
- **Email**: Send to yourself (if file is small enough)
- **Network Share**: Copy to shared network location
- **GitHub**: Push to a private repository

### Step 3: Setup on Windows PC

#### A. Install Prerequisites
```cmd
# Install Node.js (Download from nodejs.org)
# Verify installation
node --version
npm --version

# Install Git (optional, from git-scm.com)
git --version
```

#### B. Extract and Setup
```cmd
# Create project directory
mkdir C:\NetworkTool
cd C:\NetworkTool

# Extract files (if using tar.gz, use 7-Zip or WSL)
# For zip files:
# Right-click → Extract All

# Install dependencies
npm install

# Create required directories
mkdir data
mkdir logs
mkdir config
```

#### C. Start the Application
```cmd
# Start the server
node src/enhanced-web-server.js

# Or use npm if package.json has scripts
npm start
```

## 📦 Method 2: Git Repository (Professional)

### Step 1: Create Git Repository on Mac
```bash
cd "/Users/keithperez/Documents/Claud/Network tool 1.0"

# Initialize git if not already done
git init

# Create .gitignore file
cat > .gitignore << 'EOF'
node_modules/
data/
logs/
config/
*.log
.DS_Store
.env
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

# Add and commit files
git add .
git commit -m "Initial commit: Network Management Platform"

# Push to GitHub (create repo first on github.com)
git remote add origin https://github.com/yourusername/network-management-platform.git
git push -u origin main
```

### Step 2: Clone on Windows PC
```cmd
# Clone repository
git clone https://github.com/yourusername/network-management-platform.git
cd network-management-platform

# Install dependencies
npm install

# Create required directories
mkdir data logs config
```

## 🔧 Windows-Specific Configuration

### 1. Create Windows Batch Files

**start-server.bat**
```batch
@echo off
echo Starting Network Management Platform...
node src/enhanced-web-server.js
pause
```

**install-dependencies.bat**
```batch
@echo off
echo Installing Node.js dependencies...
npm install
echo.
echo Dependencies installed successfully!
pause
```

### 2. Windows Service (Optional)

**install-service.bat** (Run as Administrator)
```batch
@echo off
npm install -g node-windows
node install-service.js
```

**install-service.js**
```javascript
const { Service } = require('node-windows');

const svc = new Service({
    name: 'Network Management Platform',
    description: 'Network Management Platform with N8N Integration',
    script: 'C:\\NetworkTool\\src\\enhanced-web-server.js',
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
});

svc.on('install', () => {
    svc.start();
    console.log('Service installed and started');
});

svc.install();
```

### 3. Windows Firewall Configuration
```cmd
# Allow Node.js through Windows Firewall (Run as Administrator)
netsh advfirewall firewall add rule name="Network Management Platform" dir=in action=allow protocol=TCP localport=3000

# Allow N8N port if using N8N
netsh advfirewall firewall add rule name="N8N Workflow" dir=in action=allow protocol=TCP localport=5678
```

## 🛠️ Windows-Specific Modifications

### 1. Update File Paths
Some paths might need adjustment for Windows:

**src/enhanced-web-server.js**
```javascript
const path = require('path');

// Instead of hardcoded paths, use:
const configPath = path.join(__dirname, '..', 'config');
const dataPath = path.join(__dirname, '..', 'data');
const logsPath = path.join(__dirname, '..', 'logs');
```

### 2. Environment Variables
Create **config/windows-env.bat**:
```batch
@echo off
set NODE_ENV=production
set PORT=3000
set N8N_BASE_URL=http://localhost:5678
set N8N_WEBHOOK_URL=http://localhost:3000
```

### 3. Windows Package.json Scripts
Add to **package.json**:
```json
{
  "scripts": {
    "start": "node src/enhanced-web-server.js",
    "start:windows": "set NODE_ENV=production && node src/enhanced-web-server.js",
    "install:service": "node install-service.js",
    "dev": "nodemon src/enhanced-web-server.js"
  }
}
```

## 🔍 Testing on Windows

### 1. Basic Functionality Test
```cmd
# Test server startup
npm start

# Should see:
# 🌐 Enhanced Network Management Platform running on http://localhost:3000
```

### 2. Access Application
- Open browser: http://localhost:3000
- Test all sections work
- Verify Python scripts execute
- Test N8N integration

### 3. Port Conflicts
If port 3000 is in use:
```cmd
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID_NUMBER> /F
```

## 🚀 Production Deployment Options

### Option 1: Run as Windows Service
- Install node-windows
- Create service script
- Run as system service

### Option 2: Use PM2 Process Manager
```cmd
npm install -g pm2
pm2 start src/enhanced-web-server.js --name "network-tool"
pm2 startup
pm2 save
```

### Option 3: Docker Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "src/enhanced-web-server.js"]
```

## 📋 Pre-Migration Checklist

- [ ] Node.js installed on Windows PC
- [ ] All files transferred
- [ ] Dependencies installed (`npm install`)
- [ ] Required directories created
- [ ] Firewall configured
- [ ] Application tested
- [ ] N8N installed (if using workflows)
- [ ] Environment variables configured

## 🆘 Troubleshooting

### Common Issues:
1. **Node.js not found**: Install from nodejs.org
2. **npm install fails**: Run as Administrator
3. **Port 3000 in use**: Change port in code or kill process
4. **Firewall blocks access**: Add firewall rules
5. **Python scripts fail**: Install Python on Windows
6. **N8N connection fails**: Install N8N globally

### Windows-Specific Commands:
```cmd
# Check Node.js version
node --version

# Check running processes
tasklist | findstr node

# Check open ports
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

## 📞 Support

If you encounter issues during migration:
1. Check Windows Event Logs
2. Review application logs
3. Test with Windows Defender disabled temporarily
4. Verify all dependencies are installed
5. Check network connectivity

Your network management platform should work identically on Windows! 🎉