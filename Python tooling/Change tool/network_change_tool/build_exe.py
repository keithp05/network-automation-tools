#!/usr/bin/env python3
"""
Build script for creating Windows executable
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
import json

def check_requirements():
    """Check if required packages are installed"""
    try:
        import PyInstaller
        print("✓ PyInstaller is installed")
    except ImportError:
        print("✗ PyInstaller not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("✓ PyInstaller installed")

def create_pyinstaller_spec():
    """Create PyInstaller spec file"""
    spec_content = """
# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None

# Define paths
src_path = Path.cwd() / 'src'
configs_path = Path.cwd() / 'configs'
examples_path = Path.cwd() / 'examples'

# Main application data
a = Analysis(
    ['app.py'],
    pathex=[str(Path.cwd())],
    binaries=[],
    datas=[
        (str(src_path), 'src'),
        (str(configs_path), 'configs'),
        (str(examples_path), 'examples'),
        ('requirements.txt', '.'),
        ('README.md', '.'),
        ('SETUP_GUIDE.md', '.'),
        ('setup_credentials.py', '.'),
    ],
    hiddenimports=[
        'PyQt6',
        'PyQt6.QtWidgets',
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'netmiko',
        'paramiko',
        'pan-os-python',
        'panos',
        'pandas',
        'openpyxl',
        'xlrd',
        'keyring',
        'cryptography',
        'jinja2',
        'yaml',
        'pydantic',
        'requests',
        'nmap',
        'pysnmp',
        'loguru',
        'rich',
        'tqdm',
        'schedule',
        'colorama',
        'bcrypt',
        'pycryptodome',
        'jsonschema',
        'python-dotenv',
        'pyqtgraph',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# GUI application
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='NetworkChangeTool',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Set to False for GUI-only mode
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.ico' if Path('assets/icon.ico').exists() else None,
)

# Create directory structure in dist
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='NetworkChangeTool',
)
"""
    
    with open('network_change_tool.spec', 'w') as f:
        f.write(spec_content)
    
    print("✓ PyInstaller spec file created")

def create_setup_script():
    """Create setup script for the executable"""
    setup_content = """#!/usr/bin/env python3
\"\"\"
Setup script for Network Change Tool executable
\"\"\"

import os
import sys
from pathlib import Path
import shutil

def setup_directories():
    \"\"\"Create necessary directories\"\"\"
    directories = [
        'configs',
        'configs/credentials',
        'configs/templates',
        'configs/audit_rules',
        'logs',
        'backups',
        'reports',
        'reports/audit',
        'examples'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {directory}")

def copy_example_files():
    \"\"\"Copy example files to working directory\"\"\"
    example_files = [
        'examples/device_list_simple.txt',
        'examples/device_list_extended.txt',
        'examples/device_list.csv',
        'configs/app_config.yaml',
        'configs/audit_rules/security_rules.json',
        'configs/templates/cisco_ios_vlan.j2',
        'configs/templates/cisco_asa_acl.j2',
        'configs/templates/palo_security_policy.j2'
    ]
    
    for file_path in example_files:
        src_path = Path(file_path)
        if src_path.exists():
            dst_path = Path(file_path)
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dst_path)
            print(f"Copied: {file_path}")

def main():
    print("Network Change Tool - Setup")
    print("=" * 40)
    
    # Setup directories
    setup_directories()
    
    # Copy example files
    copy_example_files()
    
    print("\\nSetup complete!")
    print("\\nNext steps:")
    print("1. Run: NetworkChangeTool.exe setup_credentials.py")
    print("2. Or run: NetworkChangeTool.exe main.py --gui")
    print("3. Or run: NetworkChangeTool.exe main.py --cli")

if __name__ == "__main__":
    main()
"""
    
    with open('setup_tool.py', 'w') as f:
        f.write(setup_content)
    
    print("✓ Setup script created")

def create_batch_files():
    """Create batch files for easy execution"""
    
    # Main launcher batch file
    launcher_content = """@echo off
title Network Change Tool

echo Network Change Tool
echo ==================

echo.
echo Choose an option:
echo 1. Setup credentials and devices
echo 2. Launch GUI interface
echo 3. Launch CLI interface
echo 4. Run setup (first time only)
echo 5. Exit

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    NetworkChangeTool.exe setup_credentials.py
) else if "%choice%"=="2" (
    NetworkChangeTool.exe main.py
) else if "%choice%"=="3" (
    NetworkChangeTool.exe main.py --cli
) else if "%choice%"=="4" (
    NetworkChangeTool.exe setup_tool.py
) else if "%choice%"=="5" (
    exit
) else (
    echo Invalid choice. Please try again.
    pause
    goto :start
)

:start
pause
"""
    
    with open('launch.bat', 'w') as f:
        f.write(launcher_content)
    
    # Setup batch file
    setup_content = """@echo off
title Network Change Tool - Setup

echo Network Change Tool - First Time Setup
echo ========================================

echo Creating directories and copying files...
NetworkChangeTool.exe setup_tool.py

echo.
echo Starting credential setup...
NetworkChangeTool.exe setup_credentials.py

pause
"""
    
    with open('setup.bat', 'w') as f:
        f.write(setup_content)
    
    # GUI launcher
    gui_content = """@echo off
title Network Change Tool - GUI
NetworkChangeTool.exe main.py
"""
    
    with open('gui.bat', 'w') as f:
        f.write(gui_content)
    
    # CLI launcher
    cli_content = """@echo off
title Network Change Tool - CLI
NetworkChangeTool.exe main.py --cli
"""
    
    with open('cli.bat', 'w') as f:
        f.write(cli_content)
    
    print("✓ Batch files created")

def create_version_file():
    """Create version file for Windows executable"""
    version_content = """# UTF-8
#
# For more details about fixed file info 'ffi' see:
# http://msdn.microsoft.com/en-us/library/ms646997.aspx
VSVersionInfo(
  ffi=FixedFileInfo(
    # filevers and prodvers should be always a tuple with four items: (1, 2, 3, 4)
    # Set not needed items to zero 0.
    filevers=(1, 0, 0, 0),
    prodvers=(1, 0, 0, 0),
    # Contains a bitmask that specifies the valid bits 'flags'r
    mask=0x3f,
    # Contains a bitmask that specifies the Boolean attributes of the file.
    flags=0x0,
    # The operating system for which this file was designed.
    # 0x4 - NT and there is no need to change it.
    OS=0x4,
    # The general type of file.
    # 0x1 - the file is an application.
    fileType=0x1,
    # The function of the file.
    # 0x0 - the function is not defined for this fileType
    subtype=0x0,
    # Creation date and time stamp.
    date=(0, 0)
  ),
  kids=[
    StringFileInfo(
      [
        StringTable(
          u'040904B0',
          [StringStruct(u'CompanyName', u'Network Change Tool'),
           StringStruct(u'FileDescription', u'Network Change Management Tool'),
           StringStruct(u'FileVersion', u'1.0.0.0'),
           StringStruct(u'InternalName', u'NetworkChangeTool'),
           StringStruct(u'LegalCopyright', u'Copyright (C) 2024'),
           StringStruct(u'OriginalFilename', u'NetworkChangeTool.exe'),
           StringStruct(u'ProductName', u'Network Change Management Tool'),
           StringStruct(u'ProductVersion', u'1.0.0.0')])
      ]
    ),
    VarFileInfo([VarStruct(u'Translation', [1033, 1200])])
  ]
)
"""
    
    with open('version.txt', 'w') as f:
        f.write(version_content)
    
    print("✓ Version file created")

def create_icon():
    """Create a basic icon file"""
    # Create assets directory
    assets_dir = Path('assets')
    assets_dir.mkdir(exist_ok=True)
    
    # Note: For a real icon, you'd want to create a proper .ico file
    # For now, we'll create a placeholder
    icon_info = """
    To add a custom icon:
    1. Create a 256x256 PNG image
    2. Convert to ICO format using online tools or:
       - ImageMagick: convert icon.png icon.ico
       - Online converter: https://convertio.co/png-ico/
    3. Save as assets/icon.ico
    4. Rebuild the executable
    """
    
    with open(assets_dir / 'icon_instructions.txt', 'w') as f:
        f.write(icon_info)
    
    print("✓ Icon placeholder created")

def build_executable():
    """Build the executable using PyInstaller"""
    print("\n" + "=" * 50)
    print("Building executable...")
    print("=" * 50)
    
    try:
        # Clean previous builds
        if Path('dist').exists():
            shutil.rmtree('dist')
        if Path('build').exists():
            shutil.rmtree('build')
        
        # Build using spec file
        subprocess.run([
            sys.executable, '-m', 'PyInstaller',
            '--clean',
            '--noconfirm',
            'network_change_tool.spec'
        ], check=True)
        
        print("✓ Executable built successfully")
        
        # Copy additional files to dist
        dist_dir = Path('dist/NetworkChangeTool')
        
        # Copy batch files
        for bat_file in ['launch.bat', 'setup.bat', 'gui.bat', 'cli.bat']:
            if Path(bat_file).exists():
                shutil.copy2(bat_file, dist_dir)
        
        # Copy setup script
        if Path('setup_tool.py').exists():
            shutil.copy2('setup_tool.py', dist_dir)
        
        print("✓ Additional files copied to distribution")
        
        # Create README for distribution
        dist_readme = """
Network Change Management Tool
==============================

This is a standalone executable for the Network Change Management Tool.

Quick Start:
1. Run setup.bat (first time only)
2. Run launch.bat to start the application

Files:
- NetworkChangeTool.exe: Main executable
- launch.bat: Interactive launcher
- setup.bat: First-time setup
- gui.bat: Launch GUI directly
- cli.bat: Launch CLI directly
- setup_tool.py: Setup script

For help and documentation, see the configs/ directory after setup.
"""
        
        with open(dist_dir / 'README.txt', 'w') as f:
            f.write(dist_readme)
        
        print("✓ Distribution README created")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Build failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def create_installer_script():
    """Create NSIS installer script"""
    nsis_content = """
; Network Change Tool Installer
; Created with NSIS (Nullsoft Scriptable Install System)

!define APPNAME "Network Change Tool"
!define COMPANYNAME "Network Change Tool"
!define DESCRIPTION "Network Change Management Tool"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0
!define HELPURL "https://github.com/your-repo/network-change-tool"
!define UPDATEURL "https://github.com/your-repo/network-change-tool"
!define ABOUTURL "https://github.com/your-repo/network-change-tool"
!define INSTALLSIZE 50000

RequestExecutionLevel admin

InstallDir "$PROGRAMFILES\\${COMPANYNAME}\\${APPNAME}"

Name "${APPNAME}"
OutFile "NetworkChangeToolInstaller.exe"

!include LogicLib.nsh
!include MUI2.nsh

!define MUI_ABORTWARNING
!define MUI_ICON "assets\\icon.ico"
!define MUI_UNICON "assets\\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath $INSTDIR
    
    ; Copy files
    File /r "dist\\NetworkChangeTool\\*"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\\uninstall.exe"
    
    ; Create start menu entries
    CreateDirectory "$SMPROGRAMS\\${COMPANYNAME}"
    CreateShortcut "$SMPROGRAMS\\${COMPANYNAME}\\${APPNAME}.lnk" "$INSTDIR\\launch.bat"
    CreateShortcut "$SMPROGRAMS\\${COMPANYNAME}\\${APPNAME} GUI.lnk" "$INSTDIR\\gui.bat"
    CreateShortcut "$SMPROGRAMS\\${COMPANYNAME}\\${APPNAME} CLI.lnk" "$INSTDIR\\cli.bat"
    CreateShortcut "$SMPROGRAMS\\${COMPANYNAME}\\Setup.lnk" "$INSTDIR\\setup.bat"
    CreateShortcut "$SMPROGRAMS\\${COMPANYNAME}\\Uninstall.lnk" "$INSTDIR\\uninstall.exe"
    
    ; Create desktop shortcut
    CreateShortcut "$DESKTOP\\${APPNAME}.lnk" "$INSTDIR\\launch.bat"
    
    ; Registry entries
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "DisplayName" "${COMPANYNAME} - ${APPNAME} - ${DESCRIPTION}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "UninstallString" "$INSTDIR\\uninstall.exe"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "DisplayIcon" "$INSTDIR\\logo.ico"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "Publisher" "${COMPANYNAME}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "HelpLink" "${HELPURL}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "URLUpdateInfo" "${UPDATEURL}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "URLInfoAbout" "${ABOUTURL}"
    WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "VersionMinor" ${VERSIONMINOR}
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "NoRepair" 1
    WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}" "EstimatedSize" ${INSTALLSIZE}
SectionEnd

Section "Uninstall"
    ; Remove files
    RMDir /r "$INSTDIR"
    
    ; Remove start menu entries
    RMDir /r "$SMPROGRAMS\\${COMPANYNAME}"
    
    ; Remove desktop shortcut
    Delete "$DESKTOP\\${APPNAME}.lnk"
    
    ; Remove registry entries
    DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${COMPANYNAME} ${APPNAME}"
SectionEnd
"""
    
    with open('installer.nsi', 'w') as f:
        f.write(nsis_content)
    
    print("✓ NSIS installer script created")

def create_build_instructions():
    """Create build instructions"""
    instructions = """
# Building Network Change Tool Executable

## Prerequisites

1. **Python 3.8+** with all dependencies installed:
   ```bash
   pip install -r requirements.txt
   ```

2. **PyInstaller** (installed automatically by build script):
   ```bash
   pip install pyinstaller
   ```

3. **Optional: UPX** for smaller executable size:
   - Download from: https://upx.github.io/
   - Add to PATH

## Build Process

### Quick Build
```bash
python build_exe.py
```

### Manual Build Steps

1. **Check requirements and create spec file:**
   ```bash
   python -c "from build_exe import *; check_requirements(); create_pyinstaller_spec()"
   ```

2. **Build executable:**
   ```bash
   pyinstaller --clean --noconfirm network_change_tool.spec
   ```

3. **Copy additional files:**
   ```bash
   python -c "from build_exe import *; create_batch_files(); create_setup_script()"
   ```

## Output

The build process creates:
- `dist/NetworkChangeTool/`: Directory with executable and all files
- `NetworkChangeTool.exe`: Main executable
- `launch.bat`: Interactive launcher
- `setup.bat`: First-time setup
- `gui.bat`, `cli.bat`: Direct launchers

## Testing

1. **Test the executable:**
   ```bash
   cd dist/NetworkChangeTool
   NetworkChangeTool.exe --help
   ```

2. **Test setup process:**
   ```bash
   setup.bat
   ```

3. **Test GUI:**
   ```bash
   gui.bat
   ```

## Distribution

### Simple Distribution
Copy the entire `dist/NetworkChangeTool/` directory to the target system.

### Create Installer (Optional)
1. **Install NSIS:** https://nsis.sourceforge.io/
2. **Build installer:**
   ```bash
   makensis installer.nsi
   ```

## Troubleshooting

### Common Issues

1. **Missing modules:**
   - Add missing imports to `hiddenimports` in the spec file
   - Rebuild

2. **Large executable size:**
   - Install UPX: https://upx.github.io/
   - Enable UPX in spec file (upx=True)

3. **Antivirus false positives:**
   - Common with PyInstaller executables
   - Add exception for the executable
   - Consider code signing for distribution

4. **Qt/GUI issues:**
   - Ensure PyQt6 is properly installed
   - Check for missing Qt plugins

5. **Network/SSH issues:**
   - Ensure paramiko and netmiko are properly bundled
   - Check for missing crypto libraries

### Debug Mode
Build with console enabled for debugging:
```python
# In network_change_tool.spec, set:
console=True
```

## Size Optimization

1. **Enable UPX compression:**
   ```python
   upx=True
   ```

2. **Exclude unnecessary modules:**
   ```python
   excludes=['tkinter', 'matplotlib', 'numpy']
   ```

3. **Use one-file mode:**
   ```python
   # In EXE() call:
   onefile=True
   ```

## Performance Tips

1. **Faster startup:**
   - Use onedir mode instead of onefile
   - Minimize hidden imports

2. **Smaller distribution:**
   - Remove unnecessary data files
   - Use UPX compression

3. **Better compatibility:**
   - Test on clean Windows systems
   - Include all necessary runtime libraries
"""
    
    with open('BUILD_INSTRUCTIONS.md', 'w') as f:
        f.write(instructions)
    
    print("✓ Build instructions created")

def main():
    """Main build function"""
    print("Network Change Tool - Executable Builder")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path('main.py').exists():
        print("✗ main.py not found. Please run this script from the project root directory.")
        return
    
    # Create all necessary files
    check_requirements()
    create_pyinstaller_spec()
    create_setup_script()
    create_batch_files()
    create_version_file()
    create_icon()
    create_installer_script()
    create_build_instructions()
    
    print("\n" + "=" * 50)
    print("Build preparation complete!")
    print("=" * 50)
    
    # Ask if user wants to build now
    response = input("\nBuild executable now? (y/n): ")
    if response.lower() == 'y':
        success = build_executable()
        
        if success:
            print("\n" + "=" * 50)
            print("Build completed successfully!")
            print("=" * 50)
            print("\nExecutable location: dist/NetworkChangeTool/")
            print("Run: dist/NetworkChangeTool/launch.bat")
            print("\nFor distribution, copy the entire dist/NetworkChangeTool/ directory")
            
            # Show file sizes
            exe_path = Path('dist/NetworkChangeTool/NetworkChangeTool.exe')
            if exe_path.exists():
                size_mb = exe_path.stat().st_size / (1024 * 1024)
                print(f"Executable size: {size_mb:.1f} MB")
        else:
            print("\n✗ Build failed. Check the error messages above.")
    else:
        print("\nTo build later, run: python build_exe.py")
        print("Or manually run: pyinstaller --clean --noconfirm network_change_tool.spec")

if __name__ == "__main__":
    main()