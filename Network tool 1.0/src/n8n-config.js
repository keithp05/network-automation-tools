/**
 * N8N Configuration Manager
 * Handles N8N connection settings and API key management
 */

const fs = require('fs');
const path = require('path');

class N8nConfig {
    constructor() {
        this.configPath = path.join(__dirname, '../config/n8n-config.json');
        this.defaultConfig = {
            baseUrl: 'http://localhost:5678',
            apiKey: null,
            username: null,
            password: null,
            webhookUrl: 'http://localhost:3000',
            authType: 'none', // 'none', 'basic', 'apikey'
            timeout: 30000,
            retryAttempts: 3
        };
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            // Create config directory if it doesn't exist
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Load existing config or create default
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                return { ...this.defaultConfig, ...JSON.parse(configData) };
            } else {
                // Create default config file
                this.saveConfig(this.defaultConfig);
                return this.defaultConfig;
            }
        } catch (error) {
            console.error('Error loading N8N config:', error);
            return this.defaultConfig;
        }
    }

    saveConfig(config = this.config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            this.config = config;
            console.log('✅ N8N configuration saved');
            return true;
        } catch (error) {
            console.error('Error saving N8N config:', error);
            return false;
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        return this.saveConfig();
    }

    setApiKey(apiKey) {
        return this.updateConfig({ 
            apiKey: apiKey, 
            authType: 'apikey' 
        });
    }

    setBasicAuth(username, password) {
        return this.updateConfig({ 
            username: username, 
            password: password, 
            authType: 'basic' 
        });
    }

    setBaseUrl(baseUrl) {
        return this.updateConfig({ baseUrl });
    }

    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.config.authType === 'apikey' && this.config.apiKey) {
            headers['X-N8N-API-KEY'] = this.config.apiKey;
        } else if (this.config.authType === 'basic' && this.config.username && this.config.password) {
            const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        return headers;
    }

    validateConfig() {
        const errors = [];

        if (!this.config.baseUrl) {
            errors.push('Base URL is required');
        }

        if (this.config.authType === 'apikey' && !this.config.apiKey) {
            errors.push('API Key is required when using API key authentication');
        }

        if (this.config.authType === 'basic' && (!this.config.username || !this.config.password)) {
            errors.push('Username and password are required when using basic authentication');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Environment variable support
    loadFromEnv() {
        const envConfig = {};

        if (process.env.N8N_BASE_URL) {
            envConfig.baseUrl = process.env.N8N_BASE_URL;
        }

        if (process.env.N8N_API_KEY) {
            envConfig.apiKey = process.env.N8N_API_KEY;
            envConfig.authType = 'apikey';
        }

        if (process.env.N8N_USERNAME && process.env.N8N_PASSWORD) {
            envConfig.username = process.env.N8N_USERNAME;
            envConfig.password = process.env.N8N_PASSWORD;
            envConfig.authType = 'basic';
        }

        if (process.env.N8N_WEBHOOK_URL) {
            envConfig.webhookUrl = process.env.N8N_WEBHOOK_URL;
        }

        if (Object.keys(envConfig).length > 0) {
            console.log('📝 Loading N8N config from environment variables');
            return this.updateConfig(envConfig);
        }

        return false;
    }

    // Generate setup instructions
    getSetupInstructions() {
        return {
            steps: [
                {
                    step: 1,
                    title: "Install N8N",
                    command: "npm install n8n -g",
                    description: "Install N8N globally on your system"
                },
                {
                    step: 2,
                    title: "Start N8N",
                    command: "n8n start",
                    description: "Start N8N server (default: http://localhost:5678)"
                },
                {
                    step: 3,
                    title: "Access N8N Web Interface",
                    url: this.config.baseUrl,
                    description: "Open N8N in your browser and create an admin account"
                },
                {
                    step: 4,
                    title: "Generate API Key",
                    description: "Go to Settings → API Keys → Generate new API key"
                },
                {
                    step: 5,
                    title: "Configure Network Tool",
                    description: "Use the API key to configure the integration"
                }
            ],
            currentConfig: {
                baseUrl: this.config.baseUrl,
                authType: this.config.authType,
                hasApiKey: !!this.config.apiKey,
                hasBasicAuth: !!(this.config.username && this.config.password)
            }
        };
    }
}

module.exports = N8nConfig;