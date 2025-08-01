@echo off
REM Network Management Platform Environment Configuration
REM This file sets up environment variables for Windows

echo Setting up environment variables for Network Management Platform...

REM Basic Configuration
set NODE_ENV=production
set PORT=3000

REM Network Configuration
set NETWORK_INTERFACE=0.0.0.0
set ENABLE_HTTPS=false

REM N8N Configuration
set N8N_BASE_URL=http://localhost:5678
set N8N_WEBHOOK_URL=http://localhost:3000

REM Security Configuration
set ENABLE_CORS=true
set CORS_ORIGIN=*

REM Logging Configuration
set LOG_LEVEL=info
set LOG_FILE=logs/network-platform.log

REM Database Configuration (if using external database)
REM set DB_HOST=localhost
REM set DB_PORT=5432
REM set DB_NAME=network_platform
REM set DB_USER=network_user
REM set DB_PASSWORD=your_password

REM Python Configuration
set PYTHON_PATH=python

REM Performance Configuration
set NODE_OPTIONS=--max_old_space_size=4096

REM API Configuration
set API_RATE_LIMIT=100
set API_TIMEOUT=30000

REM Cache Configuration
set CACHE_ENABLED=true
set CACHE_TTL=3600

REM Backup Configuration
set BACKUP_ENABLED=true
set BACKUP_PATH=backups
set BACKUP_RETENTION_DAYS=30

REM Monitoring Configuration
set MONITORING_ENABLED=true
set HEALTH_CHECK_INTERVAL=60000

echo Environment variables configured!
echo.
echo Current Configuration:
echo - Port: %PORT%
echo - N8N URL: %N8N_BASE_URL%
echo - Log Level: %LOG_LEVEL%
echo - Node Options: %NODE_OPTIONS%
echo.

REM Uncomment the next line to make these variables permanent
REM setx NODE_ENV production
REM setx PORT 3000
REM setx N8N_BASE_URL http://localhost:5678