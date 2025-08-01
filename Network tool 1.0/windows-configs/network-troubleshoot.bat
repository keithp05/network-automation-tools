@echo off
echo Network Management Platform - Network Troubleshooting
echo =====================================================
echo.

echo Checking network connectivity without admin rights...
echo.

REM Check if ports are available
echo Checking port availability:
netstat -an | findstr :3000 >nul 2>&1
if %errorLevel% equ 0 (
    echo ❌ Port 3000 is in use - try a different port
    echo You can change the port by editing start-platform.bat
    echo Change "set PORT=3000" to "set PORT=3001" or another port
) else (
    echo ✅ Port 3000 is available
)

echo.
echo Testing network access:
echo Checking if Windows Firewall is blocking...
echo.

REM Test local connection
echo Testing local connection to port 3000...
powershell -Command "Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Local connection successful
) else (
    echo ⚠️  Local connection failed (normal if app isn't running)
)

echo.
echo Current network configuration:
ipconfig | findstr /i "IPv4"

echo.
echo Network troubleshooting tips:
echo =============================
echo 1. If Windows prompts about network access, click "Allow"
echo 2. If blocked, go to Windows Defender Firewall settings
echo 3. Click "Allow an app through firewall"
echo 4. Click "Change settings" (doesn't need admin)
echo 5. Find "Node.js" and check both Private and Public
echo.
echo 6. Alternative: Use different port (edit start-platform.bat)
echo    Change PORT=3000 to PORT=8080 or another port
echo.
echo 7. For external access, share your IPv4 address with the port
echo    Example: http://192.168.1.100:3000
echo.
pause