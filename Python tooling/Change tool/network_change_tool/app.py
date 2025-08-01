#!/usr/bin/env python3
"""
Network Change Management Tool - Application Entry Point
Simplified entry point for PyInstaller executable
"""

import sys
import os
import logging
from pathlib import Path

# Ensure we can import from src directory
if hasattr(sys, '_MEIPASS'):
    # Running as PyInstaller executable
    base_path = Path(sys._MEIPASS)
    sys.path.insert(0, str(base_path / 'src'))
else:
    # Running as script
    base_path = Path(__file__).parent
    sys.path.insert(0, str(base_path / 'src'))

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def setup_environment():
    """Setup environment for the application"""
    # Create necessary directories
    directories = [
        'configs',
        'configs/credentials',
        'configs/templates',
        'configs/audit_rules',
        'logs',
        'backups',
        'reports',
        'reports/audit'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    # Set environment variables if not set
    if not os.getenv('PYTHONPATH'):
        os.environ['PYTHONPATH'] = str(base_path / 'src')

def main():
    """Main application entry point"""
    setup_environment()
    
    # Import main after environment setup
    try:
        from main import main as app_main
        app_main()
    except ImportError as e:
        print(f"Failed to import main application: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Application error: {e}")
        logging.exception("Application error")
        sys.exit(1)

if __name__ == "__main__":
    main()