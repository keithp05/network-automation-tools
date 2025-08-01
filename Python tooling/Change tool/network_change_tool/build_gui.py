#!/usr/bin/env python3
"""
GUI Builder for Network Change Tool using auto-py-to-exe
Alternative to command-line PyInstaller
"""

import sys
import subprocess
import os
from pathlib import Path

def install_auto_py_to_exe():
    """Install auto-py-to-exe if not already installed"""
    try:
        import auto_py_to_exe
        print("✓ auto-py-to-exe is already installed")
        return True
    except ImportError:
        print("Installing auto-py-to-exe...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "auto-py-to-exe"])
            print("✓ auto-py-to-exe installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("✗ Failed to install auto-py-to-exe")
            return False

def create_build_config():
    """Create a build configuration file for auto-py-to-exe"""
    config = {
        "version": "auto-py-to-exe-configuration_v1",
        "pyinstallerOptions": [
            {
                "optionDest": "noconfirm",
                "value": True
            },
            {
                "optionDest": "filenames",
                "value": ["app.py"]
            },
            {
                "optionDest": "onefile",
                "value": False
            },
            {
                "optionDest": "console",
                "value": True
            },
            {
                "optionDest": "name",
                "value": "NetworkChangeTool"
            },
            {
                "optionDest": "add_data",
                "value": [
                    "src;src",
                    "configs;configs",
                    "examples;examples",
                    "requirements.txt;.",
                    "README.md;.",
                    "SETUP_GUIDE.md;.",
                    "setup_credentials.py;."
                ]
            },
            {
                "optionDest": "hidden_import",
                "value": [
                    "PyQt6",
                    "PyQt6.QtWidgets",
                    "PyQt6.QtCore",
                    "PyQt6.QtGui",
                    "netmiko",
                    "paramiko",
                    "pan-os-python",
                    "panos",
                    "pandas",
                    "openpyxl",
                    "xlrd",
                    "keyring",
                    "cryptography",
                    "jinja2",
                    "yaml",
                    "pydantic",
                    "requests",
                    "python-nmap",
                    "pysnmp",
                    "loguru",
                    "rich",
                    "tqdm",
                    "schedule",
                    "colorama",
                    "bcrypt",
                    "pycryptodome",
                    "jsonschema",
                    "python-dotenv",
                    "pyqtgraph"
                ]
            }
        ]
    }
    
    # Add icon if it exists
    icon_path = Path("assets/icon.ico")
    if icon_path.exists():
        config["pyinstallerOptions"].append({
            "optionDest": "icon_file",
            "value": str(icon_path)
        })
    
    # Save configuration
    import json
    with open("build_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("✓ Build configuration created: build_config.json")
    return True

def launch_gui_builder():
    """Launch the auto-py-to-exe GUI"""
    print("Launching auto-py-to-exe GUI...")
    print("This will open a web browser with the build interface.")
    print("\nIn the GUI:")
    print("1. Script Location: Select 'app.py'")
    print("2. Onefile: Choose 'One Directory'")
    print("3. Console Window: Choose 'Console Based'")
    print("4. Additional Files: Add the directories mentioned in build_config.json")
    print("5. Advanced > Hidden Imports: Add the modules listed in build_config.json")
    print("6. Click 'Convert .py to .exe'")
    
    try:
        subprocess.run([sys.executable, "-m", "auto_py_to_exe"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to launch auto-py-to-exe: {e}")
        return False
    except KeyboardInterrupt:
        print("\n✓ GUI builder closed by user")
        return True
    
    return True

def main():
    """Main GUI builder function"""
    print("Network Change Tool - GUI Builder")
    print("=" * 40)
    print("This tool provides a graphical interface for building the executable.")
    print()
    
    # Check if we're in the right directory
    if not Path("app.py").exists():
        print("✗ app.py not found. Please run this script from the project root directory.")
        print("Make sure you have run 'python build_exe.py' first to create app.py.")
        return
    
    # Install auto-py-to-exe
    if not install_auto_py_to_exe():
        print("✗ Cannot proceed without auto-py-to-exe")
        return
    
    # Create build configuration
    if not create_build_config():
        print("✗ Failed to create build configuration")
        return
    
    print("\nOptions:")
    print("1. Launch GUI builder")
    print("2. Use command-line builder (build_exe.py)")
    print("3. Manual instructions")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ")
    
    if choice == "1":
        launch_gui_builder()
    elif choice == "2":
        print("\nRunning command-line builder...")
        try:
            subprocess.run([sys.executable, "build_exe.py"], check=True)
        except subprocess.CalledProcessError:
            print("✗ Command-line builder failed")
    elif choice == "3":
        show_manual_instructions()
    elif choice == "4":
        print("Goodbye!")
    else:
        print("Invalid choice")

def show_manual_instructions():
    """Show manual build instructions"""
    print("\n" + "=" * 50)
    print("Manual Build Instructions")
    print("=" * 50)
    print("""
Option 1: Using auto-py-to-exe (GUI)
1. Install: pip install auto-py-to-exe
2. Run: python -m auto-py-to-exe
3. Configure:
   - Script Location: app.py
   - One Directory (not One File)
   - Console Based
   - Additional Files: src, configs, examples
   - Hidden Imports: PyQt6, netmiko, paramiko, etc.
4. Click "Convert .py to .exe"

Option 2: Using PyInstaller (Command Line)
1. Install: pip install pyinstaller
2. Run: python build_exe.py
3. Or manually: pyinstaller --onedir --console app.py

Option 3: Manual PyInstaller
1. Create spec file: pyi-makespec app.py
2. Edit spec file to add data files and hidden imports
3. Build: pyinstaller app.spec

The executable will be in the dist/ directory.
""")

if __name__ == "__main__":
    main()