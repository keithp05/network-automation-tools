#!/usr/bin/env python3
"""
Simple GUI file picker for YAML config
"""

import tkinter as tk
from tkinter import filedialog
import yaml
import os

def select_yaml_file():
    """Open file picker and return selected YAML file path"""
    
    # Create and configure root window
    root = tk.Tk()
    root.title("Select CFINS Controllers Config")
    root.geometry("300x150")
    root.attributes('-topmost', True)
    
    selected_file = None
    
    def browse_file():
        nonlocal selected_file
        file_path = filedialog.askopenfilename(
            title="Select CFINS Controllers YAML Configuration",
            filetypes=[
                ("YAML files", "*.yaml *.yml"),
                ("All files", "*.*")
            ],
            initialdir=os.getcwd()
        )
        
        if file_path:
            selected_file = file_path
            file_label.config(text=f"Selected: {os.path.basename(file_path)}")
            select_button.config(text="Use This File", bg="green", fg="white")
        
    def use_file():
        if selected_file:
            root.quit()
        
    def cancel():
        nonlocal selected_file
        selected_file = None
        root.quit()
    
    # Create GUI elements
    title_label = tk.Label(root, text="Select YAML Configuration File", font=("Arial", 12, "bold"))
    title_label.pack(pady=10)
    
    browse_button = tk.Button(root, text="Browse for YAML File", command=browse_file, bg="blue", fg="white")
    browse_button.pack(pady=5)
    
    file_label = tk.Label(root, text="No file selected", wraplength=280)
    file_label.pack(pady=5)
    
    button_frame = tk.Frame(root)
    button_frame.pack(pady=10)
    
    select_button = tk.Button(button_frame, text="Select File First", command=use_file, state="disabled")
    select_button.pack(side=tk.LEFT, padx=5)
    
    cancel_button = tk.Button(button_frame, text="Cancel", command=cancel)
    cancel_button.pack(side=tk.LEFT, padx=5)
    
    # Update select button state
    def check_selection():
        if selected_file:
            select_button.config(state="normal")
        root.after(100, check_selection)
    
    check_selection()
    
    # Start GUI
    root.mainloop()
    root.destroy()
    
    return selected_file

def main():
    print("🔧 CFINS Controller Configuration File Selector")
    print("=" * 50)
    
    # Try to select file
    config_file = select_yaml_file()
    
    if not config_file:
        print("❌ No configuration file selected. Exiting.")
        return
    
    print(f"✅ Selected file: {config_file}")
    
    # Try to load and validate the config
    try:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        
        controllers = config.get('controllers', [])
        guest_wifi = config.get('guest_wifi', {})
        
        print(f"📊 Configuration loaded successfully:")
        print(f"   Controllers: {len(controllers)}")
        print(f"   Guest SSID: {guest_wifi.get('ssid_name', 'Not configured')}")
        
        if controllers:
            first_controller = controllers[0]
            print(f"   First controller: {first_controller.get('name', 'Unknown')}")
            print(f"   Username: {first_controller.get('username', 'Unknown')}")
            
            # Check if credentials are configured
            if first_controller.get('username') in ['YOUR_USERNAME', None, '']:
                print("⚠️  WARNING: Credentials may not be configured properly")
            else:
                print("✅ Credentials appear to be configured")
        
        print(f"\n🎯 Ready to run: python3 multi_controller_guest_wifi_cli.py -c \"{config_file}\"")
        
    except Exception as e:
        print(f"❌ Error loading configuration file: {e}")

if __name__ == "__main__":
    main()