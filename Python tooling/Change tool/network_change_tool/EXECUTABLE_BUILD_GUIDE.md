# Network Change Tool - Executable Build Guide

This guide explains how to create a Windows executable (.exe) file for the Network Change Management Tool.

## Quick Start

### Method 1: Automated Build Script (Recommended)
```bash
# Install dependencies
pip install -r requirements.txt

# Run the build script
python build_exe.py
```

### Method 2: GUI Builder
```bash
# Install dependencies
pip install -r requirements.txt

# Launch GUI builder
python build_gui.py
```

### Method 3: Manual PyInstaller
```bash
# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller --onedir --console app.py --name NetworkChangeTool
```

## Prerequisites

### Required Software
- **Python 3.8+** with all dependencies installed
- **PyInstaller** (installed automatically by build scripts)
- **Windows 10/11** (for testing the executable)

### Python Dependencies
```bash
pip install -r requirements.txt
```

Key packages for executable building:
- `pyinstaller>=5.13.0`: Creates the executable
- `auto-py-to-exe>=2.40.0`: GUI interface for PyInstaller

## Build Methods

### Method 1: Automated Build Script

The `build_exe.py` script provides a complete automated build process:

```bash
python build_exe.py
```

**What it does:**
1. Checks and installs PyInstaller
2. Creates PyInstaller specification file
3. Builds the executable
4. Creates batch files for easy launching
5. Copies all necessary files to distribution directory

**Output:**
- `dist/NetworkChangeTool/NetworkChangeTool.exe`: Main executable
- `dist/NetworkChangeTool/launch.bat`: Interactive launcher
- `dist/NetworkChangeTool/setup.bat`: First-time setup
- `dist/NetworkChangeTool/gui.bat`: Direct GUI launcher
- `dist/NetworkChangeTool/cli.bat`: Direct CLI launcher

### Method 2: GUI Builder

The `build_gui.py` script provides a graphical interface:

```bash
python build_gui.py
```

**Features:**
- Web-based GUI for configuration
- Visual selection of options
- Real-time preview of build settings
- Step-by-step guidance

**Usage:**
1. Run the script
2. Configure options in the web interface
3. Click "Convert .py to .exe"
4. Wait for build completion

### Method 3: Manual PyInstaller

For advanced users who want full control:

```bash
# Create spec file
pyi-makespec app.py --name NetworkChangeTool

# Edit the spec file (add data files, hidden imports)
# Build executable
pyinstaller NetworkChangeTool.spec
```

## Build Configuration

### PyInstaller Specification

The build process uses a detailed specification file that includes:

```python
# Main application
a = Analysis(
    ['app.py'],
    datas=[
        ('src', 'src'),
        ('configs', 'configs'),
        ('examples', 'examples'),
        # ... other data files
    ],
    hiddenimports=[
        'PyQt6', 'netmiko', 'paramiko',
        'pan-os-python', 'pandas', 'openpyxl',
        # ... other hidden imports
    ]
)
```

### Hidden Imports

The following modules are automatically included:
- **GUI**: PyQt6, pyqtgraph
- **Networking**: netmiko, paramiko, pan-os-python, requests
- **Data**: pandas, openpyxl, xlrd, PyYAML
- **Security**: keyring, cryptography, bcrypt
- **Utilities**: jinja2, pydantic, loguru, rich

### Data Files

The following directories and files are included:
- `src/`: Source code
- `configs/`: Configuration files and templates
- `examples/`: Example device lists
- `requirements.txt`: Dependencies list
- `README.md`, `SETUP_GUIDE.md`: Documentation

## Output Structure

After building, the `dist/NetworkChangeTool/` directory contains:

```
dist/NetworkChangeTool/
├── NetworkChangeTool.exe          # Main executable
├── launch.bat                     # Interactive launcher
├── setup.bat                      # First-time setup
├── gui.bat                        # Direct GUI launcher
├── cli.bat                        # Direct CLI launcher
├── setup_tool.py                  # Setup script
├── README.txt                     # Distribution README
├── src/                           # Source code
├── configs/                       # Configuration files
├── examples/                      # Example files
└── [PyInstaller runtime files]    # Required DLLs and libraries
```

## Launcher Scripts

### Interactive Launcher (`launch.bat`)
```batch
@echo off
title Network Change Tool

echo Choose an option:
echo 1. Setup credentials and devices
echo 2. Launch GUI interface
echo 3. Launch CLI interface
echo 4. Run setup (first time only)
echo 5. Exit

set /p choice="Enter your choice (1-5): "
```

### Direct Launchers
- `gui.bat`: Launches GUI directly
- `cli.bat`: Launches CLI directly
- `setup.bat`: Runs first-time setup

## Distribution

### Simple Distribution
1. Copy the entire `dist/NetworkChangeTool/` directory
2. Users can run `launch.bat` to start

### Installer Creation (Optional)
1. Install NSIS: https://nsis.sourceforge.io/
2. Use the generated `installer.nsi` script:
   ```bash
   makensis installer.nsi
   ```
3. Creates `NetworkChangeToolInstaller.exe`

## Testing the Executable

### Basic Testing
```bash
cd dist/NetworkChangeTool
NetworkChangeTool.exe --help
```

### GUI Testing
```bash
cd dist/NetworkChangeTool
gui.bat
```

### CLI Testing
```bash
cd dist/NetworkChangeTool
cli.bat
```

### Setup Testing
```bash
cd dist/NetworkChangeTool
setup.bat
```

## Troubleshooting

### Common Issues

#### 1. Missing Modules
**Error:** `ModuleNotFoundError: No module named 'xyz'`

**Solution:** Add to hidden imports in spec file:
```python
hiddenimports=[
    'existing_modules',
    'xyz',  # Add missing module
]
```

#### 2. Large Executable Size
**Current size:** ~50-100 MB

**Optimization options:**
- Enable UPX compression: `upx=True`
- Exclude unnecessary modules: `excludes=['module_name']`
- Use one-file mode: `onefile=True` (slower startup)

#### 3. Slow Startup
**Causes:** 
- One-file mode
- Large number of modules
- Antivirus scanning

**Solutions:**
- Use one-directory mode
- Exclude unnecessary modules
- Add antivirus exception

#### 4. Antivirus False Positives
**Issue:** Antivirus software flags the executable

**Solutions:**
- Add exception for the executable
- Use code signing certificate
- Submit to antivirus vendors for whitelisting

#### 5. Qt/GUI Issues
**Error:** GUI doesn't start or crashes

**Solutions:**
- Ensure PyQt6 is properly installed
- Check for missing Qt plugins
- Test with `console=True` for debug output

#### 6. Network Library Issues
**Error:** SSH/API connections fail

**Solutions:**
- Ensure paramiko, netmiko are included
- Check for missing crypto libraries
- Test network connectivity

### Debug Mode

Build with debug mode enabled:
```python
# In spec file
exe = EXE(
    # ... other options
    console=True,    # Shows console output
    debug=True,      # Debug mode
)
```

### Logging

Check logs for issues:
- Application logs: `logs/` directory
- PyInstaller logs: Build output
- Windows Event Viewer: System events

## Advanced Configuration

### Custom Icon
1. Create a 256x256 PNG icon
2. Convert to ICO format
3. Save as `assets/icon.ico`
4. Rebuild executable

### Version Information
The build includes Windows version information:
- File version: 1.0.0.0
- Product name: Network Change Management Tool
- Company name: Network Change Tool
- Copyright: Copyright (C) 2024

### Code Signing (Optional)
For enterprise distribution:
1. Obtain code signing certificate
2. Sign the executable:
   ```bash
   signtool sign /f certificate.pfx /p password NetworkChangeTool.exe
   ```

## Performance Optimization

### Startup Time
- **One-directory mode**: Faster startup than one-file
- **Minimize imports**: Only include necessary modules
- **UPX compression**: Reduces file size but may increase startup time

### Memory Usage
- **Lazy loading**: Import modules only when needed
- **Resource cleanup**: Properly close connections and files
- **Memory profiling**: Use tools like `memory_profiler`

### File Size
- **Current size**: ~50-100 MB
- **Optimization**: Enable UPX, exclude unnecessary modules
- **Comparison**: Similar to other PyInstaller applications

## Security Considerations

### Executable Security
- **Code signing**: Prevents tampering warnings
- **Antivirus scanning**: May flag as suspicious
- **User permissions**: May require administrator rights

### Data Security
- **Credential storage**: Encrypted by default
- **Network traffic**: Uses secure protocols (SSH, HTTPS)
- **File permissions**: Restricts access to sensitive files

## Deployment

### Enterprise Deployment
1. Test on target systems
2. Create MSI installer using WiX or similar
3. Deploy via Group Policy or SCCM
4. Provide user documentation

### Standalone Distribution
1. Copy `dist/NetworkChangeTool/` to target system
2. Run `setup.bat` for first-time setup
3. Use `launch.bat` for normal operation

## Support

### Build Issues
- Check Python version compatibility
- Verify all dependencies are installed
- Review PyInstaller documentation
- Test on clean Windows systems

### Runtime Issues
- Check application logs
- Verify network connectivity
- Ensure proper permissions
- Test with different user accounts

### Getting Help
- Review troubleshooting section
- Check GitHub issues
- Consult PyInstaller documentation
- Test with debug mode enabled

## Maintenance

### Updates
1. Update source code
2. Increment version number
3. Rebuild executable
4. Test thoroughly
5. Distribute new version

### Monitoring
- Collect user feedback
- Monitor error reports
- Track performance metrics
- Plan improvements

This guide provides comprehensive instructions for building and distributing the Network Change Management Tool as a Windows executable.