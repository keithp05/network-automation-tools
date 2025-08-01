# N8N Setup Guide

## 1. Install N8N (if not already installed)
```bash
npm install n8n -g
```

## 2. Configure N8N with API Access
Create a `.env` file in your N8N directory with:

```env
# Basic Configuration
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http

# Security Settings
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_password_here

# API Key Settings (N8N v1.0+)
N8N_API_KEY_AUTH_ACTIVE=true
N8N_USER_MANAGEMENT_DISABLED=false

# Database (optional - uses SQLite by default)
DB_TYPE=sqlite
DB_SQLITE_DATABASE=/path/to/your/database.db
```

## 3. Start N8N
```bash
n8n start
```

## 4. Access N8N Web Interface
1. Open http://localhost:5678
2. Create an admin account if first time
3. Go to Settings → API Keys
4. Generate a new API key

## 5. Configure Network Tool Integration
Update the configuration in our network tool with your API key and N8N settings.