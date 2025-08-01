import sys
import json
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTabWidget, QTableWidget, QTableWidgetItem, QTextEdit, QTreeWidget,
    QTreeWidgetItem, QPushButton, QLabel, QLineEdit, QComboBox,
    QCheckBox, QProgressBar, QMessageBox, QDialog, QDialogButtonBox,
    QFormLayout, QSpinBox, QGroupBox, QSplitter, QFileDialog,
    QListWidget, QListWidgetItem, QPlainTextEdit, QScrollArea
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt6.QtGui import QFont, QColor, QPixmap, QAction, QIcon
import logging

from ..core.config import AppConfig, DeviceConfig, DeviceCredentials
from ..core.device_manager import DeviceManager
from ..core.change_manager import ChangeManager, ChangeRequest, ChangeStep, ChangeType
from ..audit.audit_manager import AuditManager
from ..devices.base_device import DeviceStatus


class DeviceConnectionThread(QThread):
    """Thread for device connection operations"""
    progress_updated = pyqtSignal(int)
    device_connected = pyqtSignal(str, bool, str)
    finished = pyqtSignal()
    
    def __init__(self, device_manager: DeviceManager, device_ids: List[str]):
        super().__init__()
        self.device_manager = device_manager
        self.device_ids = device_ids
        self.should_stop = False
    
    def run(self):
        for i, device_id in enumerate(self.device_ids):
            if self.should_stop:
                break
            
            try:
                device = self.device_manager.connect_device(device_id)
                self.device_connected.emit(device_id, True, "Connected successfully")
            except Exception as e:
                self.device_connected.emit(device_id, False, str(e))
            
            self.progress_updated.emit(int((i + 1) / len(self.device_ids) * 100))
        
        self.finished.emit()
    
    def stop(self):
        self.should_stop = True


class AuditThread(QThread):
    """Thread for audit operations"""
    progress_updated = pyqtSignal(int)
    audit_completed = pyqtSignal(str, dict)
    finished = pyqtSignal()
    
    def __init__(self, audit_manager: AuditManager, device_ids: List[str]):
        super().__init__()
        self.audit_manager = audit_manager
        self.device_ids = device_ids
        self.should_stop = False
    
    def run(self):
        for i, device_id in enumerate(self.device_ids):
            if self.should_stop:
                break
            
            try:
                report = self.audit_manager.audit_device(device_id)
                self.audit_completed.emit(device_id, report.get_summary())
            except Exception as e:
                self.audit_completed.emit(device_id, {"error": str(e)})
            
            self.progress_updated.emit(int((i + 1) / len(self.device_ids) * 100))
        
        self.finished.emit()
    
    def stop(self):
        self.should_stop = True


class ChangeExecutionThread(QThread):
    """Thread for change execution"""
    progress_updated = pyqtSignal(int)
    change_completed = pyqtSignal(dict)
    finished = pyqtSignal()
    
    def __init__(self, change_manager: ChangeManager, change_request: ChangeRequest):
        super().__init__()
        self.change_manager = change_manager
        self.change_request = change_request
        self.should_stop = False
    
    def run(self):
        try:
            result = self.change_manager.execute_change(self.change_request)
            self.change_completed.emit(result.get_summary())
        except Exception as e:
            self.change_completed.emit({"error": str(e)})
        
        self.finished.emit()
    
    def stop(self):
        self.should_stop = True


class AddDeviceDialog(QDialog):
    """Dialog for adding new devices"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Device")
        self.setModal(True)
        self.resize(400, 300)
        
        layout = QVBoxLayout()
        
        # Form layout
        form_layout = QFormLayout()
        
        self.hostname_edit = QLineEdit()
        form_layout.addRow("Hostname:", self.hostname_edit)
        
        self.ip_edit = QLineEdit()
        form_layout.addRow("IP Address:", self.ip_edit)
        
        self.device_type_combo = QComboBox()
        self.device_type_combo.addItems([
            "cisco_ios", "cisco_nxos", "cisco_asa", "paloalto_panos"
        ])
        form_layout.addRow("Device Type:", self.device_type_combo)
        
        self.port_spin = QSpinBox()
        self.port_spin.setRange(1, 65535)
        self.port_spin.setValue(22)
        form_layout.addRow("Port:", self.port_spin)
        
        self.username_edit = QLineEdit()
        form_layout.addRow("Username:", self.username_edit)
        
        self.password_edit = QLineEdit()
        self.password_edit.setEchoMode(QLineEdit.EchoMode.Password)
        form_layout.addRow("Password:", self.password_edit)
        
        self.enable_password_edit = QLineEdit()
        self.enable_password_edit.setEchoMode(QLineEdit.EchoMode.Password)
        form_layout.addRow("Enable Password:", self.enable_password_edit)
        
        self.api_key_edit = QLineEdit()
        form_layout.addRow("API Key:", self.api_key_edit)
        
        self.tags_edit = QLineEdit()
        form_layout.addRow("Tags (comma-separated):", self.tags_edit)
        
        layout.addLayout(form_layout)
        
        # Buttons
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
        
        self.setLayout(layout)
    
    def get_device_config(self) -> DeviceConfig:
        """Get device configuration from form"""
        credentials = DeviceCredentials(
            username=self.username_edit.text(),
            password=self.password_edit.text(),
            enable_password=self.enable_password_edit.text() or None,
            api_key=self.api_key_edit.text() or None
        )
        
        tags = [tag.strip() for tag in self.tags_edit.text().split(",") if tag.strip()]
        
        return DeviceConfig(
            hostname=self.hostname_edit.text(),
            ip_address=self.ip_edit.text(),
            device_type=self.device_type_combo.currentText(),
            port=self.port_spin.value(),
            credentials=credentials,
            tags=tags
        )


class ChangeRequestDialog(QDialog):
    """Dialog for creating change requests"""
    
    def __init__(self, device_manager: DeviceManager, parent=None):
        super().__init__(parent)
        self.device_manager = device_manager
        self.setWindowTitle("Create Change Request")
        self.setModal(True)
        self.resize(600, 500)
        
        layout = QVBoxLayout()
        
        # Basic info
        info_layout = QFormLayout()
        
        self.description_edit = QLineEdit()
        info_layout.addRow("Description:", self.description_edit)
        
        self.requester_edit = QLineEdit()
        info_layout.addRow("Requester:", self.requester_edit)
        
        self.change_type_combo = QComboBox()
        self.change_type_combo.addItems([t.value for t in ChangeType])
        info_layout.addRow("Change Type:", self.change_type_combo)
        
        self.dry_run_check = QCheckBox("Dry Run")
        info_layout.addRow("", self.dry_run_check)
        
        self.parallel_check = QCheckBox("Parallel Execution")
        info_layout.addRow("", self.parallel_check)
        
        layout.addLayout(info_layout)
        
        # Device selection
        device_group = QGroupBox("Target Devices")
        device_layout = QVBoxLayout()
        
        self.device_list = QListWidget()
        self.device_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        
        # Populate device list
        for device_info in self.device_manager.list_devices():
            item = QListWidgetItem(f"{device_info['hostname']} ({device_info['ip_address']})")
            item.setData(Qt.ItemDataRole.UserRole, device_info['id'])
            self.device_list.addItem(item)
        
        device_layout.addWidget(self.device_list)
        device_group.setLayout(device_layout)
        layout.addWidget(device_group)
        
        # Commands
        commands_group = QGroupBox("Commands")
        commands_layout = QVBoxLayout()
        
        self.commands_edit = QPlainTextEdit()
        self.commands_edit.setPlainText("# Enter commands here (one per line)")
        commands_layout.addWidget(self.commands_edit)
        
        commands_group.setLayout(commands_layout)
        layout.addWidget(commands_group)
        
        # Buttons
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
        
        self.setLayout(layout)
    
    def get_change_request(self) -> ChangeRequest:
        """Get change request from form"""
        # Get selected devices
        selected_devices = []
        for item in self.device_list.selectedItems():
            selected_devices.append(item.data(Qt.ItemDataRole.UserRole))
        
        # Parse commands
        commands = []
        for line in self.commands_edit.toPlainText().split('\n'):
            line = line.strip()
            if line and not line.startswith('#'):
                commands.append(line)
        
        # Create change request
        change_request = ChangeRequest(
            change_id=f"CHG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            change_type=ChangeType(self.change_type_combo.currentText()),
            description=self.description_edit.text(),
            requester=self.requester_edit.text(),
            device_ids=selected_devices,
            dry_run=self.dry_run_check.isChecked(),
            parallel_execution=self.parallel_check.isChecked()
        )
        
        # Add step
        if commands:
            step = ChangeStep(
                step_number=1,
                description="Execute commands",
                commands=commands
            )
            change_request.steps.append(step)
        
        return change_request


class NetworkChangeToolGUI(QMainWindow):
    """Main GUI application for network change management"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Network Change Management Tool")
        self.setGeometry(100, 100, 1200, 800)
        
        # Initialize core components
        self.config = None
        self.device_manager = None
        self.change_manager = None
        self.audit_manager = None
        
        # Initialize logger
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Setup UI
        self.setup_ui()
        self.setup_menu()
        
        # Load default configuration
        self.load_default_config()
        
        # Setup refresh timer
        self.refresh_timer = QTimer()
        self.refresh_timer.timeout.connect(self.refresh_device_status)
        self.refresh_timer.start(30000)  # Refresh every 30 seconds
    
    def setup_ui(self):
        """Setup the main UI"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        
        # Create tab widget
        self.tabs = QTabWidget()
        
        # Add tabs
        self.setup_devices_tab()
        self.setup_changes_tab()
        self.setup_audit_tab()
        self.setup_logs_tab()
        
        layout.addWidget(self.tabs)
        
        # Status bar
        self.status_bar = self.statusBar()
        self.status_bar.showMessage("Ready")
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.status_bar.addPermanentWidget(self.progress_bar)
    
    def setup_menu(self):
        """Setup menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        load_config_action = QAction("Load Configuration", self)
        load_config_action.triggered.connect(self.load_config)
        file_menu.addAction(load_config_action)
        
        save_config_action = QAction("Save Configuration", self)
        save_config_action.triggered.connect(self.save_config)
        file_menu.addAction(save_config_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Tools menu
        tools_menu = menubar.addMenu("Tools")
        
        connect_all_action = QAction("Connect All Devices", self)
        connect_all_action.triggered.connect(self.connect_all_devices)
        tools_menu.addAction(connect_all_action)
        
        disconnect_all_action = QAction("Disconnect All Devices", self)
        disconnect_all_action.triggered.connect(self.disconnect_all_devices)
        tools_menu.addAction(disconnect_all_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def setup_devices_tab(self):
        """Setup devices management tab"""
        devices_widget = QWidget()
        layout = QVBoxLayout(devices_widget)
        
        # Toolbar
        toolbar_layout = QHBoxLayout()
        
        add_device_btn = QPushButton("Add Device")
        add_device_btn.clicked.connect(self.add_device)
        toolbar_layout.addWidget(add_device_btn)
        
        remove_device_btn = QPushButton("Remove Device")
        remove_device_btn.clicked.connect(self.remove_device)
        toolbar_layout.addWidget(remove_device_btn)
        
        connect_btn = QPushButton("Connect")
        connect_btn.clicked.connect(self.connect_selected_devices)
        toolbar_layout.addWidget(connect_btn)
        
        disconnect_btn = QPushButton("Disconnect")
        disconnect_btn.clicked.connect(self.disconnect_selected_devices)
        toolbar_layout.addWidget(disconnect_btn)
        
        toolbar_layout.addStretch()
        
        backup_btn = QPushButton("Backup Configs")
        backup_btn.clicked.connect(self.backup_selected_devices)
        toolbar_layout.addWidget(backup_btn)
        
        layout.addLayout(toolbar_layout)
        
        # Device table
        self.device_table = QTableWidget()
        self.device_table.setColumnCount(6)
        self.device_table.setHorizontalHeaderLabels([
            "Hostname", "IP Address", "Type", "Status", "Tags", "Last Backup"
        ])
        self.device_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.device_table)
        
        self.tabs.addTab(devices_widget, "Devices")
    
    def setup_changes_tab(self):
        """Setup change management tab"""
        changes_widget = QWidget()
        layout = QVBoxLayout(changes_widget)
        
        # Toolbar
        toolbar_layout = QHBoxLayout()
        
        new_change_btn = QPushButton("New Change Request")
        new_change_btn.clicked.connect(self.create_change_request)
        toolbar_layout.addWidget(new_change_btn)
        
        execute_change_btn = QPushButton("Execute Change")
        execute_change_btn.clicked.connect(self.execute_change)
        toolbar_layout.addWidget(execute_change_btn)
        
        rollback_btn = QPushButton("Rollback")
        rollback_btn.clicked.connect(self.rollback_change)
        toolbar_layout.addWidget(rollback_btn)
        
        toolbar_layout.addStretch()
        
        layout.addLayout(toolbar_layout)
        
        # Changes table
        self.changes_table = QTableWidget()
        self.changes_table.setColumnCount(7)
        self.changes_table.setHorizontalHeaderLabels([
            "Change ID", "Type", "Description", "Requester", "Status", "Devices", "Created"
        ])
        self.changes_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.changes_table)
        
        self.tabs.addTab(changes_widget, "Changes")
    
    def setup_audit_tab(self):
        """Setup audit tab"""
        audit_widget = QWidget()
        layout = QVBoxLayout(audit_widget)
        
        # Toolbar
        toolbar_layout = QHBoxLayout()
        
        run_audit_btn = QPushButton("Run Audit")
        run_audit_btn.clicked.connect(self.run_audit)
        toolbar_layout.addWidget(run_audit_btn)
        
        generate_report_btn = QPushButton("Generate Report")
        generate_report_btn.clicked.connect(self.generate_audit_report)
        toolbar_layout.addWidget(generate_report_btn)
        
        toolbar_layout.addStretch()
        
        layout.addLayout(toolbar_layout)
        
        # Audit results
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Results table
        self.audit_table = QTableWidget()
        self.audit_table.setColumnCount(5)
        self.audit_table.setHorizontalHeaderLabels([
            "Device", "Compliance Score", "Pass", "Fail", "Last Audit"
        ])
        self.audit_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        splitter.addWidget(self.audit_table)
        
        # Audit details
        self.audit_details = QTextEdit()
        self.audit_details.setReadOnly(True)
        splitter.addWidget(self.audit_details)
        
        layout.addWidget(splitter)
        
        self.tabs.addTab(audit_widget, "Audit")
    
    def setup_logs_tab(self):
        """Setup logs tab"""
        logs_widget = QWidget()
        layout = QVBoxLayout(logs_widget)
        
        # Toolbar
        toolbar_layout = QHBoxLayout()
        
        clear_logs_btn = QPushButton("Clear Logs")
        clear_logs_btn.clicked.connect(self.clear_logs)
        toolbar_layout.addWidget(clear_logs_btn)
        
        export_logs_btn = QPushButton("Export Logs")
        export_logs_btn.clicked.connect(self.export_logs)
        toolbar_layout.addWidget(export_logs_btn)
        
        toolbar_layout.addStretch()
        
        layout.addLayout(toolbar_layout)
        
        # Logs display
        self.logs_text = QTextEdit()
        self.logs_text.setReadOnly(True)
        self.logs_text.setFont(QFont("Courier", 10))
        layout.addWidget(self.logs_text)
        
        self.tabs.addTab(logs_widget, "Logs")
    
    def load_default_config(self):
        """Load default configuration"""
        try:
            # Create default config
            self.config = AppConfig()
            
            # Initialize managers
            self.device_manager = DeviceManager(self.config)
            self.change_manager = ChangeManager(self.device_manager)
            self.audit_manager = AuditManager(self.device_manager)
            
            self.status_bar.showMessage("Default configuration loaded")
            
        except Exception as e:
            self.logger.error(f"Failed to load default configuration: {str(e)}")
            QMessageBox.critical(self, "Error", f"Failed to load configuration: {str(e)}")
    
    def load_config(self):
        """Load configuration from file"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Load Configuration", "", "YAML files (*.yaml *.yml);;JSON files (*.json)"
        )
        
        if file_path:
            try:
                self.config = AppConfig.from_file(Path(file_path))
                
                # Reinitialize managers
                self.device_manager = DeviceManager(self.config)
                self.change_manager = ChangeManager(self.device_manager)
                self.audit_manager = AuditManager(self.device_manager)
                
                self.refresh_device_table()
                self.status_bar.showMessage(f"Configuration loaded from {file_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to load configuration: {str(e)}")
                QMessageBox.critical(self, "Error", f"Failed to load configuration: {str(e)}")
    
    def save_config(self):
        """Save configuration to file"""
        if not self.config:
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Save Configuration", "", "YAML files (*.yaml);;JSON files (*.json)"
        )
        
        if file_path:
            try:
                self.config.save_to_file(Path(file_path))
                self.status_bar.showMessage(f"Configuration saved to {file_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to save configuration: {str(e)}")
                QMessageBox.critical(self, "Error", f"Failed to save configuration: {str(e)}")
    
    def add_device(self):
        """Add a new device"""
        dialog = AddDeviceDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            try:
                device_config = dialog.get_device_config()
                device_id = self.device_manager.add_device(device_config)
                
                # Add to app config
                self.config.devices.append(device_config)
                
                self.refresh_device_table()
                self.status_bar.showMessage(f"Device added: {device_config.hostname}")
                
            except Exception as e:
                self.logger.error(f"Failed to add device: {str(e)}")
                QMessageBox.critical(self, "Error", f"Failed to add device: {str(e)}")
    
    def remove_device(self):
        """Remove selected device"""
        current_row = self.device_table.currentRow()
        if current_row >= 0:
            hostname = self.device_table.item(current_row, 0).text()
            
            reply = QMessageBox.question(
                self, "Remove Device", 
                f"Are you sure you want to remove device '{hostname}'?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                try:
                    # Find device ID
                    device_id = None
                    for device_info in self.device_manager.list_devices():
                        if device_info['hostname'] == hostname:
                            device_id = device_info['id']
                            break
                    
                    if device_id:
                        self.device_manager.remove_device(device_id)
                        
                        # Remove from app config
                        self.config.devices = [
                            d for d in self.config.devices 
                            if d.hostname != hostname
                        ]
                        
                        self.refresh_device_table()
                        self.status_bar.showMessage(f"Device removed: {hostname}")
                
                except Exception as e:
                    self.logger.error(f"Failed to remove device: {str(e)}")
                    QMessageBox.critical(self, "Error", f"Failed to remove device: {str(e)}")
    
    def connect_selected_devices(self):
        """Connect to selected devices"""
        selected_rows = set(item.row() for item in self.device_table.selectedItems())
        
        if not selected_rows:
            QMessageBox.information(self, "Info", "Please select devices to connect")
            return
        
        device_ids = []
        for row in selected_rows:
            hostname = self.device_table.item(row, 0).text()
            for device_info in self.device_manager.list_devices():
                if device_info['hostname'] == hostname:
                    device_ids.append(device_info['id'])
                    break
        
        if device_ids:
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(0)
            
            self.connection_thread = DeviceConnectionThread(self.device_manager, device_ids)
            self.connection_thread.progress_updated.connect(self.progress_bar.setValue)
            self.connection_thread.device_connected.connect(self.on_device_connected)
            self.connection_thread.finished.connect(self.on_connection_finished)
            self.connection_thread.start()
    
    def disconnect_selected_devices(self):
        """Disconnect from selected devices"""
        selected_rows = set(item.row() for item in self.device_table.selectedItems())
        
        for row in selected_rows:
            hostname = self.device_table.item(row, 0).text()
            for device_info in self.device_manager.list_devices():
                if device_info['hostname'] == hostname:
                    self.device_manager.disconnect_device(device_info['id'])
                    break
        
        self.refresh_device_table()
        self.status_bar.showMessage("Devices disconnected")
    
    def connect_all_devices(self):
        """Connect to all devices"""
        device_ids = [info['id'] for info in self.device_manager.list_devices()]
        
        if device_ids:
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(0)
            
            self.connection_thread = DeviceConnectionThread(self.device_manager, device_ids)
            self.connection_thread.progress_updated.connect(self.progress_bar.setValue)
            self.connection_thread.device_connected.connect(self.on_device_connected)
            self.connection_thread.finished.connect(self.on_connection_finished)
            self.connection_thread.start()
    
    def disconnect_all_devices(self):
        """Disconnect from all devices"""
        self.device_manager.disconnect_all()
        self.refresh_device_table()
        self.status_bar.showMessage("All devices disconnected")
    
    def backup_selected_devices(self):
        """Backup selected devices"""
        selected_rows = set(item.row() for item in self.device_table.selectedItems())
        
        if not selected_rows:
            QMessageBox.information(self, "Info", "Please select devices to backup")
            return
        
        device_ids = []
        for row in selected_rows:
            hostname = self.device_table.item(row, 0).text()
            for device_info in self.device_manager.list_devices():
                if device_info['hostname'] == hostname:
                    device_ids.append(device_info['id'])
                    break
        
        if device_ids:
            try:
                backup_path = self.config.backup.backup_path
                results = self.device_manager.backup_devices(
                    device_ids, backup_path, compress=True
                )
                
                success_count = sum(1 for r in results.values() if hasattr(r, 'device_hostname'))
                self.status_bar.showMessage(f"Backup completed: {success_count}/{len(device_ids)} devices")
                
            except Exception as e:
                self.logger.error(f"Backup failed: {str(e)}")
                QMessageBox.critical(self, "Error", f"Backup failed: {str(e)}")
    
    def create_change_request(self):
        """Create a new change request"""
        if not self.device_manager:
            QMessageBox.warning(self, "Warning", "Please load configuration first")
            return
        
        dialog = ChangeRequestDialog(self.device_manager, self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            try:
                change_request = dialog.get_change_request()
                # Store change request for later execution
                self.current_change_request = change_request
                
                self.refresh_changes_table()
                self.status_bar.showMessage(f"Change request created: {change_request.change_id}")
                
            except Exception as e:
                self.logger.error(f"Failed to create change request: {str(e)}")
                QMessageBox.critical(self, "Error", f"Failed to create change request: {str(e)}")
    
    def execute_change(self):
        """Execute the current change request"""
        if not hasattr(self, 'current_change_request'):
            QMessageBox.warning(self, "Warning", "No change request to execute")
            return
        
        reply = QMessageBox.question(
            self, "Execute Change", 
            f"Are you sure you want to execute change '{self.current_change_request.change_id}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(0)
            
            self.execution_thread = ChangeExecutionThread(
                self.change_manager, self.current_change_request
            )
            self.execution_thread.change_completed.connect(self.on_change_completed)
            self.execution_thread.finished.connect(self.on_execution_finished)
            self.execution_thread.start()
    
    def rollback_change(self):
        """Rollback a change"""
        # Implementation would depend on change tracking
        QMessageBox.information(self, "Info", "Rollback functionality not implemented yet")
    
    def run_audit(self):
        """Run audit on selected devices"""
        device_ids = [info['id'] for info in self.device_manager.list_devices()]
        
        if not device_ids:
            QMessageBox.information(self, "Info", "No devices available for audit")
            return
        
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        self.audit_thread = AuditThread(self.audit_manager, device_ids)
        self.audit_thread.progress_updated.connect(self.progress_bar.setValue)
        self.audit_thread.audit_completed.connect(self.on_audit_completed)
        self.audit_thread.finished.connect(self.on_audit_finished)
        self.audit_thread.start()
    
    def generate_audit_report(self):
        """Generate audit report"""
        # Implementation for report generation
        QMessageBox.information(self, "Info", "Report generation not implemented yet")
    
    def clear_logs(self):
        """Clear log display"""
        self.logs_text.clear()
    
    def export_logs(self):
        """Export logs to file"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Export Logs", "", "Text files (*.txt);;All files (*)"
        )
        
        if file_path:
            try:
                with open(file_path, 'w') as f:
                    f.write(self.logs_text.toPlainText())
                
                self.status_bar.showMessage(f"Logs exported to {file_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to export logs: {str(e)}")
                QMessageBox.critical(self, "Error", f"Failed to export logs: {str(e)}")
    
    def refresh_device_table(self):
        """Refresh device table"""
        if not self.device_manager:
            return
        
        devices = self.device_manager.list_devices()
        self.device_table.setRowCount(len(devices))
        
        for i, device in enumerate(devices):
            self.device_table.setItem(i, 0, QTableWidgetItem(device['hostname']))
            self.device_table.setItem(i, 1, QTableWidgetItem(device['ip_address']))
            self.device_table.setItem(i, 2, QTableWidgetItem(device['device_type']))
            self.device_table.setItem(i, 3, QTableWidgetItem(device['status']))
            self.device_table.setItem(i, 4, QTableWidgetItem(', '.join(device['tags'])))
            self.device_table.setItem(i, 5, QTableWidgetItem("N/A"))  # Last backup
    
    def refresh_changes_table(self):
        """Refresh changes table"""
        # Implementation depends on change tracking
        pass
    
    def refresh_device_status(self):
        """Refresh device status periodically"""
        if self.device_manager:
            self.refresh_device_table()
    
    def on_device_connected(self, device_id: str, success: bool, message: str):
        """Handle device connection result"""
        if success:
            self.logs_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] Connected to {device_id}")
        else:
            self.logs_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] Failed to connect to {device_id}: {message}")
        
        self.refresh_device_table()
    
    def on_connection_finished(self):
        """Handle connection thread completion"""
        self.progress_bar.setVisible(False)
        self.status_bar.showMessage("Connection operation completed")
    
    def on_change_completed(self, result: dict):
        """Handle change execution completion"""
        if 'error' in result:
            self.logs_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] Change execution failed: {result['error']}")
        else:
            self.logs_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] Change execution completed: {result['status']}")
    
    def on_execution_finished(self):
        """Handle execution thread completion"""
        self.progress_bar.setVisible(False)
        self.status_bar.showMessage("Change execution completed")
    
    def on_audit_completed(self, device_id: str, result: dict):
        """Handle audit completion"""
        if 'error' in result:
            self.logs_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] Audit failed for {device_id}: {result['error']}")
        else:
            self.logs_text.append(f"[{datetime.now().strftime('%H:%M:%S')}] Audit completed for {device_id}: {result['compliance_score']:.1f}%")
    
    def on_audit_finished(self):
        """Handle audit thread completion"""
        self.progress_bar.setVisible(False)
        self.status_bar.showMessage("Audit completed")
    
    def show_about(self):
        """Show about dialog"""
        QMessageBox.about(
            self, "About", 
            "Network Change Management Tool\n\n"
            "A comprehensive tool for managing network device changes,\n"
            "backups, and compliance audits.\n\n"
            "Supports Cisco IOS/NX-OS/ASA and Palo Alto devices."
        )
    
    def closeEvent(self, event):
        """Handle application close"""
        if self.device_manager:
            self.device_manager.disconnect_all()
        event.accept()


def main():
    """Main application entry point"""
    app = QApplication(sys.argv)
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and show main window
    window = NetworkChangeToolGUI()
    window.show()
    
    sys.exit(app.exec())


if __name__ == '__main__':
    main()