#!/usr/bin/env python3
"""
Windows-specific launcher for Network Change Tool
Handles Windows-specific paths and environment setup
"""

import sys
import os
import subprocess
import tkinter as tk
from tkinter import messagebox, filedialog
from pathlib import Path
import json

class NetworkChangeToolLauncher:
    """GUI launcher for Network Change Tool"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Network Change Tool - Launcher")
        self.root.geometry("600x400")
        self.root.resizable(False, False)
        
        # Try to set icon
        try:
            if hasattr(sys, '_MEIPASS'):
                icon_path = Path(sys._MEIPASS) / "assets" / "icon.ico"
            else:
                icon_path = Path("assets") / "icon.ico"
            
            if icon_path.exists():
                self.root.iconbitmap(str(icon_path))
        except:
            pass
        
        self.setup_ui()
        self.check_first_run()
    
    def setup_ui(self):
        """Setup the user interface"""
        # Title
        title_label = tk.Label(
            self.root, 
            text="Network Change Management Tool", 
            font=("Arial", 16, "bold")
        )
        title_label.pack(pady=20)
        
        # Description
        desc_label = tk.Label(
            self.root,
            text="A comprehensive tool for managing network device changes,\nbackups, and compliance audits.",
            font=("Arial", 10),
            justify=tk.CENTER
        )
        desc_label.pack(pady=10)
        
        # Buttons frame
        button_frame = tk.Frame(self.root)
        button_frame.pack(pady=20)
        
        # Setup button
        setup_btn = tk.Button(
            button_frame,
            text="Setup Credentials & Devices",
            command=self.run_setup,
            width=25,
            height=2,
            bg="#4CAF50",
            fg="white",
            font=("Arial", 10, "bold")
        )
        setup_btn.pack(pady=5)
        
        # GUI button
        gui_btn = tk.Button(
            button_frame,
            text="Launch GUI Interface",
            command=self.launch_gui,
            width=25,
            height=2,
            bg="#2196F3",
            fg="white",
            font=("Arial", 10, "bold")
        )
        gui_btn.pack(pady=5)
        
        # CLI button
        cli_btn = tk.Button(
            button_frame,
            text="Launch CLI Interface",
            command=self.launch_cli,
            width=25,
            height=2,
            bg="#FF9800",
            fg="white",
            font=("Arial", 10, "bold")
        )
        cli_btn.pack(pady=5)
        
        # Import button
        import_btn = tk.Button(
            button_frame,
            text="Import Device List",
            command=self.import_devices,
            width=25,
            height=2,
            bg="#9C27B0",
            fg="white",
            font=("Arial", 10, "bold")
        )
        import_btn.pack(pady=5)
        
        # Help button
        help_btn = tk.Button(
            button_frame,
            text="Help & Documentation",
            command=self.show_help,
            width=25,
            height=2,
            bg="#607D8B",
            fg="white",
            font=("Arial", 10, "bold")
        )
        help_btn.pack(pady=5)
        
        # Status frame
        status_frame = tk.Frame(self.root)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=10)
        
        self.status_label = tk.Label(
            status_frame,
            text="Ready",
            relief=tk.SUNKEN,
            anchor=tk.W
        )
        self.status_label.pack(side=tk.BOTTOM, fill=tk.X)
    
    def check_first_run(self):
        """Check if this is the first run"""
        config_file = Path("configs") / "app_config.yaml"
        
        if not config_file.exists():
            response = messagebox.askyesno(
                "First Run Setup",
                "This appears to be your first time running the Network Change Tool.\n\n"
                "Would you like to run the setup wizard to configure your devices and credentials?"
            )
            
            if response:
                self.run_setup()
    
    def update_status(self, message):
        """Update status message"""
        self.status_label.config(text=message)
        self.root.update()
    
    def run_setup(self):
        """Run the setup wizard"""
        self.update_status("Running setup wizard...")
        
        try:
            if hasattr(sys, '_MEIPASS'):
                # Running as executable
                exe_path = Path(sys.executable)
                setup_script = exe_path.parent / "setup_credentials.py"
                
                if setup_script.exists():
                    subprocess.run([sys.executable, str(setup_script)], check=True)
                else:
                    # Run embedded script
                    subprocess.run([sys.executable, "setup_credentials.py"], check=True)
            else:
                # Running as script
                subprocess.run([sys.executable, "setup_credentials.py"], check=True)
            
            self.update_status("Setup completed successfully")
            messagebox.showinfo("Setup Complete", "Device and credential setup completed successfully!")
            
        except subprocess.CalledProcessError as e:
            self.update_status("Setup failed")
            messagebox.showerror("Setup Error", f"Setup failed with error: {e}")
        except Exception as e:
            self.update_status("Setup error")
            messagebox.showerror("Error", f"An error occurred: {e}")
    
    def launch_gui(self):
        """Launch the GUI interface"""
        self.update_status("Launching GUI interface...")
        
        try:
            if hasattr(sys, '_MEIPASS'):
                # Running as executable
                subprocess.Popen([sys.executable, "main.py"])
            else:
                # Running as script
                subprocess.Popen([sys.executable, "main.py"])
            
            self.update_status("GUI launched")
            # Don't close launcher immediately - let user choose
            
        except Exception as e:
            self.update_status("Failed to launch GUI")
            messagebox.showerror("Launch Error", f"Failed to launch GUI: {e}")
    
    def launch_cli(self):
        """Launch the CLI interface"""
        self.update_status("Launching CLI interface...")
        
        try:
            if hasattr(sys, '_MEIPASS'):
                # Running as executable
                subprocess.Popen([sys.executable, "main.py", "--cli"])
            else:
                # Running as script
                subprocess.Popen([sys.executable, "main.py", "--cli"])
            
            self.update_status("CLI launched")
            
        except Exception as e:
            self.update_status("Failed to launch CLI")
            messagebox.showerror("Launch Error", f"Failed to launch CLI: {e}")
    
    def import_devices(self):
        """Import device list from file"""
        self.update_status("Importing device list...")
        
        # Ask for file type
        file_types = [
            ("Excel files", "*.xlsx *.xls"),
            ("CSV files", "*.csv"),
            ("Text files", "*.txt"),
            ("All files", "*.*")
        ]
        
        file_path = filedialog.askopenfilename(
            title="Select Device List File",
            filetypes=file_types
        )
        
        if file_path:
            try:
                # Create a temporary Python script to handle the import
                import_script = f"""
import sys
sys.path.insert(0, 'src')
from setup_credentials import import_devices_from_excel_file, import_devices_from_text_file
from pathlib import Path

file_path = Path(r'{file_path}')
print(f"Importing from: {{file_path}}")

if file_path.suffix.lower() in ['.xlsx', '.xls']:
    # Excel import
    devices = import_devices_from_excel_file()
elif file_path.suffix.lower() == '.csv':
    # CSV import
    devices = import_devices_from_text_file()
else:
    # Text import
    devices = import_devices_from_text_file()

print(f"Imported {{len(devices)}} devices")
"""
                
                # Save and run the import script
                with open("temp_import.py", "w") as f:
                    f.write(import_script)
                
                subprocess.run([sys.executable, "temp_import.py"], check=True)
                
                # Clean up
                Path("temp_import.py").unlink()
                
                self.update_status("Device list imported successfully")
                messagebox.showinfo("Import Complete", "Device list imported successfully!")
                
            except Exception as e:
                self.update_status("Import failed")
                messagebox.showerror("Import Error", f"Failed to import device list: {e}")
    
    def show_help(self):
        """Show help and documentation"""
        help_window = tk.Toplevel(self.root)
        help_window.title("Help & Documentation")
        help_window.geometry("800x600")
        
        # Create text widget with scrollbar
        text_frame = tk.Frame(help_window)
        text_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        text_widget = tk.Text(text_frame, wrap=tk.WORD)
        scrollbar = tk.Scrollbar(text_frame, orient=tk.VERTICAL, command=text_widget.yview)
        text_widget.configure(yscrollcommand=scrollbar.set)
        
        text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Load help content
        help_content = """
Network Change Management Tool - Help
====================================

OVERVIEW
The Network Change Management Tool is a comprehensive solution for managing network device changes, backups, and compliance audits.

SUPPORTED DEVICES
- Cisco IOS switches and routers
- Cisco NX-OS switches
- Cisco ASA firewalls
- Palo Alto PAN-OS firewalls

GETTING STARTED
1. Click "Setup Credentials & Devices" to configure your devices
2. Choose how to import your device list:
   - Auto-discover on network
   - Import from Excel file
   - Import from text file
   - Enter manually
3. Set up credentials for your devices
4. Launch the GUI or CLI interface

DEVICE IMPORT FORMATS

Excel Format:
- Column 1: hostname
- Column 2: ip_address
- Column 3: device_type (optional)
- Column 4: port (optional)

Text Format (CSV):
hostname,ip_address,device_type,port
switch-01,192.168.1.10,cisco_ios,22
firewall-01,192.168.1.20,paloalto_panos,443

CREDENTIAL STORAGE
- Encrypted files (recommended)
- System keyring
- Environment variables
- Runtime prompts

FEATURES
- Device connection management
- Configuration backup and restore
- Change execution with rollback
- Compliance auditing
- Template-based changes
- Parallel operations

TROUBLESHOOTING
- Check logs in the logs/ directory
- Verify device connectivity
- Ensure correct credentials
- Check firewall/network access

FILES AND DIRECTORIES
- configs/: Configuration files
- logs/: Application logs
- backups/: Device backups
- reports/: Audit reports

For detailed documentation, see the README.md and SETUP_GUIDE.md files.
"""
        
        text_widget.insert(tk.END, help_content)
        text_widget.config(state=tk.DISABLED)
    
    def run(self):
        """Run the launcher"""
        self.root.mainloop()

def main():
    """Main launcher function"""
    # Check if GUI is available
    try:
        launcher = NetworkChangeToolLauncher()
        launcher.run()
    except Exception as e:
        # Fallback to command line if GUI fails
        print("GUI launcher failed, falling back to command line")
        print(f"Error: {e}")
        
        print("\nNetwork Change Tool")
        print("==================")
        print("1. Setup credentials: python setup_credentials.py")
        print("2. Launch GUI: python main.py")
        print("3. Launch CLI: python main.py --cli")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            subprocess.run([sys.executable, "setup_credentials.py"])
        elif choice == "2":
            subprocess.run([sys.executable, "main.py"])
        elif choice == "3":
            subprocess.run([sys.executable, "main.py", "--cli"])

if __name__ == "__main__":
    main()