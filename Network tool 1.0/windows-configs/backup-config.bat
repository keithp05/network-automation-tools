@echo off
echo Network Management Platform - Configuration Backup
echo ==================================================
echo.

REM Create backup directory with timestamp
set BACKUP_DIR=backups\config-backup-%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%" 2>nul

echo Creating configuration backup...
echo Backup directory: %BACKUP_DIR%
echo.

REM Backup configuration files
if exist "config" (
    echo ✅ Backing up config directory...
    xcopy /E /I /H /Y "config" "%BACKUP_DIR%\config\"
) else (
    echo ⚠️  Config directory not found
)

REM Backup data files
if exist "data" (
    echo ✅ Backing up data directory...
    xcopy /E /I /H /Y "data" "%BACKUP_DIR%\data\"
) else (
    echo ⚠️  Data directory not found
)

REM Backup logs (latest only)
if exist "logs" (
    echo ✅ Backing up recent logs...
    xcopy /I /H /Y "logs\*.log" "%BACKUP_DIR%\logs\"
) else (
    echo ⚠️  Logs directory not found
)

REM Backup package.json and other config files
if exist "package.json" (
    echo ✅ Backing up package.json...
    copy "package.json" "%BACKUP_DIR%\"
)

if exist "package-lock.json" (
    echo ✅ Backing up package-lock.json...
    copy "package-lock.json" "%BACKUP_DIR%\"
)

REM Backup environment files
if exist "environment-config.bat" (
    echo ✅ Backing up environment configuration...
    copy "environment-config.bat" "%BACKUP_DIR%\"
)

REM Backup custom scripts
if exist "scripts" (
    echo ✅ Backing up custom scripts...
    xcopy /E /I /H /Y "scripts" "%BACKUP_DIR%\scripts\"
)

REM Create backup info file
echo Creating backup information file...
echo Network Management Platform Configuration Backup > "%BACKUP_DIR%\backup-info.txt"
echo Generated: %DATE% %TIME% >> "%BACKUP_DIR%\backup-info.txt"
echo Computer: %COMPUTERNAME% >> "%BACKUP_DIR%\backup-info.txt"
echo User: %USERNAME% >> "%BACKUP_DIR%\backup-info.txt"
echo. >> "%BACKUP_DIR%\backup-info.txt"
echo Contents: >> "%BACKUP_DIR%\backup-info.txt"
dir "%BACKUP_DIR%" /B >> "%BACKUP_DIR%\backup-info.txt"

echo.
echo ✅ Backup completed successfully!
echo.
echo Backup location: %BACKUP_DIR%
echo.
echo To restore:
echo 1. Stop the Network Management Platform service
echo 2. Copy files from backup directory to application directory
echo 3. Restart the service
echo.

REM Cleanup old backups (keep last 10)
echo Cleaning up old backups...
for /f "skip=10 delims=" %%i in ('dir /b /o-d "backups\config-backup-*" 2^>nul') do (
    echo Removing old backup: %%i
    rmdir /s /q "backups\%%i" 2>nul
)

echo.
echo Backup process complete!
pause