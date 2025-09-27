#!/usr/bin/env python3
"""
Test the GUI file picker functionality
"""

import os
import yaml

# Test if tkinter is available
try:
    import tkinter as tk
    from tkinter import filedialog
    print("✅ tkinter is available")
    GUI_AVAILABLE = True
except ImportError as e:
    print(f"❌ tkinter not available: {e}")
    GUI_AVAILABLE = False

def test_file_picker():
    """Test the file picker"""
    if not GUI_AVAILABLE:
        print("Cannot test file picker - tkinter not available")
        return
    
    print("🔍 Testing GUI file picker...")
    
    # Create a hidden root window
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    root.attributes('-topmost', True)  # Bring to front
    
    print("📁 Opening file picker dialog...")
    file_path = filedialog.askopenfilename(
        title="Test: Select CFINS Controllers YAML File",
        filetypes=[
            ("YAML files", "*.yaml *.yml"),
            ("All files", "*.*")
        ],
        initialdir=os.getcwd()
    )
    
    root.destroy()  # Clean up
    
    if file_path:
        print(f"✅ File selected: {file_path}")
        
        # Try to load the file
        try:
            with open(file_path, 'r') as f:
                config = yaml.safe_load(f)
            
            controllers = config.get('controllers', [])
            print(f"📊 Found {len(controllers)} controllers in config")
            
            if controllers:
                first_controller = controllers[0]
                print(f"🔍 First controller: {first_controller.get('name', 'Unknown')}")
                print(f"   IP: {first_controller.get('ip', 'Unknown')}")
                print(f"   Username: {first_controller.get('username', 'Unknown')}")
                
                # Check credentials
                if first_controller.get('username') == 'YOUR_USERNAME':
                    print("⚠️  WARNING: Credentials not updated (still shows YOUR_USERNAME)")
                else:
                    print("✅ Credentials appear to be configured")
            
        except Exception as e:
            print(f"❌ Error loading config file: {e}")
    else:
        print("❌ No file selected")

if __name__ == "__main__":
    print("🧪 GUI File Picker Test\n")
    
    print(f"Current directory: {os.getcwd()}")
    print(f"Python version: {os.sys.version}")
    
    # List YAML files in current directory
    yaml_files = [f for f in os.listdir('.') if f.endswith(('.yaml', '.yml'))]
    print(f"YAML files in current directory: {yaml_files}")
    
    test_file_picker()