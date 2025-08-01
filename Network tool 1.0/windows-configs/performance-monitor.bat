@echo off
echo Network Management Platform - Performance Monitor
echo =================================================
echo.

REM Check if the service is running
sc query NetworkManagementPlatform >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Service Status:
    sc query NetworkManagementPlatform | findstr "STATE"
) else (
    echo ❌ Service not installed or not running
)

echo.
echo System Performance:
echo ===================

REM CPU Usage
echo CPU Usage:
wmic cpu get loadpercentage /value | findstr "LoadPercentage"

REM Memory Usage
echo.
echo Memory Usage:
for /f "skip=1" %%i in ('wmic OS get TotalVisibleMemorySize^,FreePhysicalMemory /format:csv') do (
    for /f "tokens=2,3 delims=," %%a in ("%%i") do (
        set /a "UsedMemory=%%b-%%a"
        set /a "MemoryPercent=!UsedMemory!*100/%%b"
        echo Total Memory: %%b KB
        echo Free Memory: %%a KB
        echo Used Memory: !UsedMemory! KB
        echo Memory Usage: !MemoryPercent!%%
    )
)

echo.
echo Network Connections:
echo ===================
netstat -an | findstr :3000
netstat -an | findstr :5678

echo.
echo Process Information:
echo ===================
tasklist | findstr /i node

echo.
echo Application Logs (Last 10 lines):
echo =================================
if exist "logs\network-platform.log" (
    powershell "Get-Content 'logs\network-platform.log' | Select-Object -Last 10"
) else (
    echo No log file found
)

echo.
echo Port Health Check:
echo =================
echo Checking port 3000 (Network Management Platform)...
powershell "Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Port 3000 is responding
) else (
    echo ❌ Port 3000 is not responding
)

echo Checking port 5678 (N8N)...
powershell "Test-NetConnection -ComputerName localhost -Port 5678 -InformationLevel Quiet" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Port 5678 is responding (N8N)
) else (
    echo ⚠️  Port 5678 is not responding (N8N may not be running)
)

echo.
echo Disk Usage:
echo ===========
dir /-c | findstr "bytes"

echo.
echo Event Log Errors (Last 5):
echo ==========================
powershell "Get-EventLog -LogName Application -Source 'NetworkManagementPlatform' -EntryType Error -Newest 5 | Select-Object TimeGenerated, Message" 2>nul
if %errorLevel% neq 0 (
    echo No application errors found in Event Log
)

echo.
echo Performance Summary:
echo ===================
echo System Uptime:
systeminfo | findstr /i "system boot time"

echo.
echo Network Interface Status:
echo ========================
ipconfig | findstr /i "ethernet\|wireless\|IPv4"

echo.
echo =================================================
echo Performance monitoring complete!
echo =================================================
echo.
echo For continuous monitoring, you can:
echo 1. Schedule this script to run periodically
echo 2. Use Windows Performance Monitor (perfmon)
echo 3. Check Windows Services (services.msc)
echo 4. Monitor logs in real-time: tail -f logs/network-platform.log
echo.
pause