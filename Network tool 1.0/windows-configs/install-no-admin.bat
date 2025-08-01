@echo off
echo Network Management Platform - Standard User Installation
echo ========================================================
echo.

REM Check Node.js installation
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Node.js is required but not installed
    echo Please install Node.js from https://nodejs.org/
    echo Choose "Add to PATH" during installation
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Create necessary directories
echo Creating directories...
mkdir logs 2>nul
mkdir data 2>nul
mkdir config 2>nul
mkdir backups 2>nul

REM Install dependencies
echo Installing dependencies...
npm install
if %errorLevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Set up environment variables for current session
echo Setting up environment variables...
set NODE_ENV=production
set PORT=3000
set N8N_BASE_URL=http://localhost:5678
set LOG_LEVEL=info

REM Create startup script
echo Creating startup script...
echo @echo off > start-platform.bat
echo echo Starting Network Management Platform... >> start-platform.bat
echo set NODE_ENV=production >> start-platform.bat
echo set PORT=3000 >> start-platform.bat
echo set N8N_BASE_URL=http://localhost:5678 >> start-platform.bat
echo set LOG_LEVEL=info >> start-platform.bat
echo node server.js >> start-platform.bat
echo pause >> start-platform.bat

REM Create desktop shortcut (optional)
echo Creating desktop shortcut...
echo Set oWS = WScript.CreateObject("WScript.Shell") > create_shortcut.vbs
echo sLinkFile = "%USERPROFILE%\Desktop\Network Management Platform.lnk" >> create_shortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> create_shortcut.vbs
echo oLink.TargetPath = "%CD%\start-platform.bat" >> create_shortcut.vbs
echo oLink.WorkingDirectory = "%CD%" >> create_shortcut.vbs
echo oLink.Description = "Network Management Platform" >> create_shortcut.vbs
echo oLink.Save >> create_shortcut.vbs
cscript create_shortcut.vbs >nul
del create_shortcut.vbs

echo.
echo ✅ Installation complete!
echo.
echo To start the application:
echo 1. Run start-platform.bat
echo 2. Or double-click the desktop shortcut
echo 3. Open browser to http://localhost:3000
echo.
echo Note: Windows may prompt about network access - click "Allow"
echo.
pause