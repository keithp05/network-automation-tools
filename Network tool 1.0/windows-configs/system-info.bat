@echo off
echo Network Management Platform - System Information
echo ================================================
echo.

REM Check Node.js installation
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Node.js: 
    node --version
) else (
    echo ❌ Node.js not installed
    echo Please install Node.js from https://nodejs.org/
)

REM Check npm installation
npm --version >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ npm: 
    npm --version
) else (
    echo ❌ npm not available
)

echo.
echo Checking system requirements...

REM Check Python installation
python --version >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Python: 
    python --version
) else (
    echo ⚠️  Python not installed (optional for script engine)
)

REM Check available ports
echo.
echo Checking port availability...
netstat -an | findstr :3000 >nul 2>&1
if %errorLevel% equ 0 (
    echo ❌ Port 3000 is already in use
    echo Please stop the application using this port or change the port
) else (
    echo ✅ Port 3000 is available
)

netstat -an | findstr :5678 >nul 2>&1
if %errorLevel% equ 0 (
    echo ❌ Port 5678 is already in use (N8N)
) else (
    echo ✅ Port 5678 is available (N8N)
)

echo.
echo System Information:
echo ===================
echo Computer Name: %COMPUTERNAME%
echo User: %USERNAME%
echo Operating System: %OS%
echo Processor: %PROCESSOR_IDENTIFIER%
echo Number of Processors: %NUMBER_OF_PROCESSORS%

echo.
echo Network Configuration:
echo ======================
ipconfig | findstr /i "IPv4"

echo.
echo Memory Information:
echo ===================
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /format:list | findstr "="

echo.
echo Disk Space:
echo ===========
wmic logicaldisk get size,freespace,caption | findstr /v "^$"

echo.
echo Current Directory:
echo ==================
cd

echo.
echo Environment Variables:
echo ======================
echo NODE_ENV: %NODE_ENV%
echo PORT: %PORT%
echo N8N_BASE_URL: %N8N_BASE_URL%
echo PATH: %PATH%

echo.
echo Dependencies Status:
echo ===================
if exist "node_modules" (
    echo ✅ Node modules installed
) else (
    echo ❌ Node modules not installed - run npm install
)

if exist "package.json" (
    echo ✅ Package.json found
) else (
    echo ❌ Package.json not found
)

echo.
echo Service Status:
echo ==============
sc query NetworkManagementPlatform >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Windows Service installed
    sc query NetworkManagementPlatform | findstr "STATE"
) else (
    echo ⚠️  Windows Service not installed
)

echo.
echo Firewall Status:
echo ===============
netsh advfirewall firewall show rule name="Network Management Platform" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Firewall rule configured
) else (
    echo ⚠️  Firewall rule not configured
)

echo.
echo ================================================
echo System check complete!
echo ================================================
pause