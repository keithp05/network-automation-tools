# Multi-Controller Aruba Guest WiFi Management

A Python tool to manage guest WiFi passwords across multiple Aruba controllers simultaneously.

## 🚀 Features

- **Bulk Audit**: Check guest WiFi passwords across ALL controllers at once
- **Unencrypted View**: Shows actual passwords using `show run no-encrypt`
- **Single Decision**: Update all controllers with one confirmation
- **Multithreaded**: Fast parallel processing of controllers
- **Safe Operation**: Audit-only mode available
- **Password Generation**: Built-in secure password generator
- **Logging**: Detailed logs and password history

## 📋 Prerequisites

- Python 3.7+
- Access to Aruba controllers with API enabled
- Admin credentials for each controller

## 🛠️ Installation

1. Clone or download this folder
2. Install requirements:
```bash
pip install -r requirements.txt
```

3. Copy and configure the yaml file:
```bash
cp config/multi_controllers.yaml.example config/multi_controllers.yaml
```

4. Edit `config/multi_controllers.yaml` with your controller details

## 📝 Configuration

Edit `config/multi_controllers.yaml`:

```yaml
controllers:
  - name: "Building A"
    ip: "192.168.1.100"
    username: "admin"
    password: "your_password"
    
  - name: "Building B"  
    ip: "192.168.2.100"
    username: "admin"
    password: "your_password"

guest_wifi:
  ssid_name: "Guest-WiFi"  # Your exact guest SSID name
  password_length: 12
```

## 🎯 Usage

### Interactive Mode (Recommended)
```bash
python multi_controller_guest_wifi.py
```

This will:
1. Audit all controllers
2. Show current passwords
3. Ask if you want to update
4. Update all controllers if confirmed

### Audit Only Mode
```bash
python multi_controller_guest_wifi.py --audit-only
```

Just shows current passwords and exits.

### With More Threads (Faster)
```bash
python multi_controller_guest_wifi.py --max-workers 10
```

## 📊 Example Output

```
🔍 Auditing Guest-WiFi across 4 controllers...

================================================================================
GUEST WIFI AUDIT RESULTS - Guest-WiFi
================================================================================
Controller                     IP                   Current Password     Status
--------------------------------------------------------------------------------
Building A Controller          192.168.1.100        Summer2024!         ✓ Found
Building B Controller          192.168.2.100        Summer2024!         ✓ Found
Data Center Controller         10.10.10.50          OldPass123          ✓ Found
Branch Office                  172.16.1.10          Summer2024!         ✓ Found
================================================================================

Summary:
  Total controllers: 4
  Controllers with Guest-WiFi: 4
  Unique passwords found: 2

⚠️  WARNING: Different passwords found across controllers!

📋 What would you like to do?
1. Audit only (exit after showing passwords)
2. Update passwords on all controllers

Select action (1 or 2): 
```

## 🔒 Security

- Passwords are shown in plaintext during audit (as requested)
- New passwords are saved to `logs/` directory
- Controller credentials should be kept secure
- Use strong passwords for guest WiFi

## 📁 File Structure

```
multi-controller-guest-wifi/
├── multi_controller_guest_wifi.py  # Main script
├── requirements.txt               # Python dependencies
├── README.md                      # This file
├── config/
│   └── multi_controllers.yaml.example  # Example configuration
└── logs/                          # Auto-created for logs and passwords
```

## ⚡ Tips

- Test with `--audit-only` first
- Use during maintenance windows
- Keep the password record from `logs/`
- Update the YAML file when controllers change

## 🆘 Troubleshooting

**"Failed to authenticate"**
- Check controller IP and credentials
- Ensure API is enabled on controller

**"SSID not configured"**
- Verify exact SSID name in config
- Check if guest WiFi exists on that controller

**"Connection timeout"**
- Check network connectivity
- Verify controller is reachable

## 📄 License

Internal use only. Modify as needed for your environment.