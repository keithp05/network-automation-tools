@echo off
echo Network Management Platform - Auto-Start Setup (No Admin Required)
echo =================================================================
echo.

REM Create a startup task using Task Scheduler without admin rights
echo Setting up auto-start for current user...
echo.

REM Create a VBS script to run the application minimized
echo Creating startup script...
echo Set WshShell = CreateObject("WScript.Shell") > startup_helper.vbs
echo WshShell.Run """%CD%\start-platform.bat""", 0, false >> startup_helper.vbs

REM Add to Windows startup folder (user-level, no admin needed)
echo Adding to Windows startup folder...
copy startup_helper.vbs "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\NetworkPlatform.vbs" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Auto-start configured successfully
    echo The application will start automatically when you log in
) else (
    echo ❌ Failed to configure auto-start
)

echo.
echo Alternative auto-start options:
echo ==============================
echo 1. Manual startup folder:
echo    - Open Run dialog (Win+R)
echo    - Type: shell:startup
echo    - Copy NetworkPlatform.vbs to that folder
echo.
echo 2. Create scheduled task:
echo    - Open Task Scheduler (taskschd.msc)
echo    - Create Basic Task
echo    - Set trigger to "At log on"
echo    - Set action to start: %CD%\start-platform.bat
echo.
echo 3. Disable auto-start:
echo    - Delete: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\NetworkPlatform.vbs
echo.

REM Cleanup
del startup_helper.vbs >nul 2>&1

echo To test: Log out and log back in, or restart your computer
echo.
pause