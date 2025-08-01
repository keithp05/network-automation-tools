# Aruba API Setup Guide

This guide will walk you through enabling and configuring API access on your Aruba controller for use with the WiFi Password Automation Tool.

## Prerequisites

- Aruba controller running ArubaOS 8.7 or higher
- Administrative access to the Aruba controller
- Network connectivity to the controller

## Step 1: Enable REST API on Aruba Controller

### Method 1: Using Web UI

1. **Login to Aruba Web UI**
   - Navigate to `https://<controller-ip>:4343`
   - Login with admin credentials

2. **Enable REST API**
   - Go to **Configuration** → **System** → **Admin**
   - Click on **Web Server** tab
   - Check **Enable REST API**
   - Click **Apply**

3. **Configure API Settings**
   - Set **REST API Session Idle Timeout** (default: 900 seconds)
   - Set **REST API Session Hard Timeout** (default: 86400 seconds)

### Method 2: Using CLI

1. **SSH to Aruba Controller**
   ```bash
   ssh admin@<controller-ip>
   ```

2. **Enable REST API**
   ```
   (host) [mynode] (config) #web-server profile
   (host) [mynode] (Web Server Configuration) #enable-restapi
   (host) [mynode] (Web Server Configuration) #restapi-session-idle-timeout 900
   (host) [mynode] (Web Server Configuration) #restapi-session-hard-timeout 86400
   (host) [mynode] (Web Server Configuration) #exit
   (host) [mynode] (config) #write memory
   ```

## Step 2: Create API User Account (Recommended)

For security, create a dedicated user for API access:

### Using Web UI:

1. Go to **Configuration** → **Security** → **Authentication** → **Management Authentication**
2. Click **Local Users** → **Add**
3. Configure:
   - **Username**: `api_automation`
   - **Password**: [strong password]
   - **Re-Type Password**: [confirm password]
   - **Role**: `root` (or custom role with required permissions)
4. Click **Add**

### Using CLI:

```
(host) [mynode] (config) #mgmt-user api_automation root
(host) [mynode] (config) #write memory
```

## Step 3: Create Custom Role (Optional but Recommended)

For better security, create a role with only necessary permissions:

### Using CLI:

```
(host) [mynode] (config) #user-role wifi-admin
(host) [mynode] (config-role) #permit cli command "show wlan *"
(host) [mynode] (config-role) #permit cli command "wlan ssid-profile *"
(host) [mynode] (config-role) #permit cli command "wlan virtual-ap *"
(host) [mynode] (config-role) #permit cli command "ap-group *"
(host) [mynode] (config-role) #permit cli command "write memory"
(host) [mynode] (config-role) #permit cli command "apply profile *"
(host) [mynode] (config-role) #exit
(host) [mynode] (config) #mgmt-user api_automation wifi-admin
(host) [mynode] (config) #write memory
```

## Step 4: Test API Connection

### Using curl:

```bash
# Test login
curl -k -X POST https://<controller-ip>:4343/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "api_automation",
    "password": "your_password"
  }'
```

Expected response:
```json
{
  "_global_result": {
    "status": "0",
    "status_str": "You are now logged in",
    "UIDARUBA": "session-id-here"
  }
}
```

### Using Python:

```python
import requests
import urllib3

urllib3.disable_warnings()

# Test connection
url = "https://<controller-ip>:4343/api/login"
data = {
    "username": "api_automation",
    "password": "your_password"
}

response = requests.post(url, json=data, verify=False)
print(response.json())
```

## Step 5: Firewall Rules

Ensure the management interface allows HTTPS (port 4343):

### Check existing rules:
```
(host) [mynode] #show firewall
```

### Add rule if needed:
```
(host) [mynode] (config) #firewall
(host) [mynode] (config-fw) #allow https service any
(host) [mynode] (config-fw) #exit
(host) [mynode] (config) #write memory
```

## Step 6: SSL Certificate (Optional)

For production environments, configure a proper SSL certificate:

1. **Generate CSR**
   ```
   (host) [mynode] (config) #crypto pki csr web-server CN <controller-fqdn>
   ```

2. **Install Certificate**
   ```
   (host) [mynode] (config) #crypto pki ServerCert web-server
   [Paste certificate content]
   quit
   ```

## Common API Endpoints

- **Login**: `POST /api/login`
- **Logout**: `GET /api/logout`
- **Show Command**: `POST /api/command` (with `{"cmd": "show ..."}`）
- **Configuration**: `POST /api/command` (with `{"cmd": "...", "config_path": "/md"}`）
- **Write Memory**: `GET /api/write_memory`

## Troubleshooting

### API Not Responding

1. **Check if REST API is enabled:**
   ```
   (host) [mynode] #show web-server profile
   ```

2. **Check management ACL:**
   ```
   (host) [mynode] #show mgmt-server
   ```

3. **Check logs:**
   ```
   (host) [mynode] #show log system 50
   ```

### Authentication Failed

1. **Verify credentials**
2. **Check user role permissions**
3. **Ensure account is not locked:**
   ```
   (host) [mynode] #show mgmt-user
   ```

### Connection Refused

1. **Verify firewall rules**
2. **Check if web server is running:**
   ```
   (host) [mynode] #show web-server status
   ```

3. **Verify port 4343 is open:**
   ```bash
   telnet <controller-ip> 4343
   ```

## Security Best Practices

1. **Use dedicated API user** - Don't use admin account
2. **Strong passwords** - Use complex passwords for API accounts
3. **Limit permissions** - Create custom roles with minimum required permissions
4. **Use HTTPS only** - Never disable SSL/TLS
5. **IP restrictions** - Limit API access to specific management stations:
   ```
   (host) [mynode] (config) #mgmt-server ip <automation-server-ip> mask 255.255.255.255
   ```

6. **Regular password rotation** - Change API passwords periodically
7. **Monitor API usage** - Review logs regularly:
   ```
   (host) [mynode] #show log security 50 | include REST
   ```

## Next Steps

Once API access is configured:

1. Update the tool's `config.yaml` with your controller details:
   ```yaml
   aruba:
     controller_ip: your-controller-ip
     username: api_automation
     password: your_api_password
   ```

2. Test the connection:
   ```bash
   python main.py --test-connection
   ```

3. List available SSIDs:
   ```bash
   python main.py --list-networks
   ```