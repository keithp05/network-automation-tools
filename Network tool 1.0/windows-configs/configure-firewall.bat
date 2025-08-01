@echo off
echo Configuring Windows Firewall for Network Management Platform...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo 🔥 Adding Windows Firewall rules...

REM Add rule for Network Management Platform (port 3000)
netsh advfirewall firewall add rule name="Network Management Platform" dir=in action=allow protocol=TCP localport=3000
if %errorLevel% equ 0 (
    echo ✅ Network Management Platform rule added (port 3000)
) else (
    echo ❌ Failed to add Network Management Platform rule
)

REM Add rule for N8N (port 5678)
netsh advfirewall firewall add rule name="N8N Workflow Automation" dir=in action=allow protocol=TCP localport=5678
if %errorLevel% equ 0 (
    echo ✅ N8N Workflow Automation rule added (port 5678)
) else (
    echo ❌ Failed to add N8N rule
)

REM Add rule for Node.js executable
netsh advfirewall firewall add rule name="Node.js for Network Management" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe"
if %errorLevel% equ 0 (
    echo ✅ Node.js executable rule added
) else (
    echo ❌ Failed to add Node.js rule
)

REM Add rule for alternative Node.js location
netsh advfirewall firewall add rule name="Node.js Alt Location" dir=in action=allow program="%ProgramFiles(x86)%\nodejs\node.exe"

echo.
echo 🔥 Firewall configuration complete!
echo.
echo Added rules for:
echo - Network Management Platform (TCP port 3000)
echo - N8N Workflow Automation (TCP port 5678)
echo - Node.js executable access
echo.
echo You can now access the application from other computers on your network.
echo.
pause