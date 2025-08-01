@echo off
echo Installing Network Management Platform as Windows Service...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo 📦 Installing node-windows dependency...
npm install -g node-windows

echo 📦 Installing Network Management Platform service...
node windows-configs/windows-service-installer.js install

echo.
echo ✅ Installation complete!
echo.
echo The Network Management Platform is now installed as a Windows service.
echo It will start automatically when Windows boots.
echo.
echo Service Name: NetworkManagementPlatform
echo Web Interface: http://localhost:3000
echo.
echo To manage the service:
echo - Start: net start NetworkManagementPlatform
echo - Stop: net stop NetworkManagementPlatform
echo - Or use Windows Services manager (services.msc)
echo.
pause