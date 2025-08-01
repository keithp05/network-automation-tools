# N8N Integration Setup Guide

Your network management platform now includes full N8N workflow automation integration! Here's how to set it up and use it.

## 🚀 Quick Setup

### 1. Install N8N
```bash
npm install n8n -g
```

### 2. Start N8N
```bash
n8n start
```

### 3. Configure Authentication

#### Option A: Using API Key (Recommended)
1. Open N8N at http://localhost:5678
2. Create an account if first time
3. Go to **Settings → API Keys**
4. Click **"Create API Key"**
5. Copy the generated API key
6. In your Network Tool dashboard:
   - Click **"N8N Workflows"** in the sidebar
   - Click **"Configure"** 
   - Select **"API Key"** as authentication type
   - Paste your API key
   - Click **"Save Configuration"**

#### Option B: Using Basic Auth
1. Set up N8N with basic authentication
2. In your Network Tool dashboard:
   - Click **"N8N Workflows"** 
   - Click **"Configure"**
   - Select **"Basic Auth"** as authentication type
   - Enter your username and password
   - Click **"Save Configuration"**

### 4. Test Connection
Click **"Test Connection"** to verify everything is working.

## 🔧 Using the Integration

### Deploy Pre-built Templates
1. Go to **N8N Workflows → Templates** tab
2. Choose from available templates:
   - **Device Health Monitor**: Monitor device health and send alerts
   - **Interface Utilization Monitor**: Track interface usage with alerts
   - **Topology Change Detector**: Detect network topology changes
   - **Automated Configuration Backup**: Schedule automatic backups

3. Click **"Deploy"** on any template
4. The workflow will be created in N8N and ready to use

### Create Custom Workflows
1. Click **"New Workflow"** to open N8N editor
2. Create your custom automation workflow
3. Use webhooks to integrate with network events
4. Activate the workflow when ready

### Monitor Workflow Executions
1. Go to **N8N Workflows → Executions** tab
2. View execution history, success rates, and errors
3. Filter by status and date

### Configure Event Triggers
1. Go to **N8N Workflows → Event Triggers** tab
2. Toggle automatic triggers for:
   - Device down events
   - High interface utilization
   - Topology changes
   - Configuration changes

## 📊 Available Network Data

Your N8N workflows can access all network data through webhooks:

- **Device Information**: `/api/devices`
- **Interface Statistics**: `/api/interfaces`
- **Script Execution**: `/api/scripts/{name}/execute`
- **Search Data**: `/api/search`
- **Topology Data**: `/api/topology`

## 🔗 Webhook Integration

N8N workflows can send data back to your network tool:

**Webhook URL**: `http://localhost:3000/webhooks/n8n/{path}`

Example workflow node:
```json
{
  "node": "HTTP Request",
  "method": "POST",
  "url": "http://localhost:3000/webhooks/n8n/alert",
  "body": {
    "type": "network_alert",
    "message": "High utilization detected",
    "device": "192.168.1.1"
  }
}
```

## 🛠️ Environment Variables

You can also configure N8N integration using environment variables:

```bash
export N8N_BASE_URL=http://localhost:5678
export N8N_API_KEY=your_api_key_here
export N8N_WEBHOOK_URL=http://localhost:3000
```

## 🔄 Workflow Examples

### Example 1: Device Health Alert
```
Schedule (Every 30 minutes) 
  → HTTP Request (Health Check Script)
  → IF (Health Score < 80)
  → Email Send (Alert)
```

### Example 2: Interface Monitoring
```
Schedule (Every 5 minutes)
  → HTTP Request (Interface Utilization)
  → IF (Utilization > 90%)
  → Slack/Teams Notification
```

### Example 3: Automated Backup
```
Schedule (Daily at 2 AM)
  → HTTP Request (Get Devices)
  → Loop (Each Device)
  → HTTP Request (Backup Config)
  → Store Results
```

## 🎯 Use Cases

- **Automated Health Checks**: Regular device health monitoring
- **Capacity Planning**: Interface utilization tracking and alerts
- **Change Management**: Detect and log network changes
- **Incident Response**: Automated responses to network issues
- **Compliance**: Scheduled configuration backups
- **Integration**: Connect with ITSM, monitoring, and notification systems

## 📞 Support

If you encounter issues:
1. Check N8N is running on port 5678
2. Verify API key is correctly configured
3. Test connection in the configuration modal
4. Check browser console for error messages

Your network management platform now has powerful workflow automation capabilities! 🚀