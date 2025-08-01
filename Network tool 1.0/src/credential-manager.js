const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CredentialManager {
    constructor() {
        this.credentials = new Map();
        this.dataPath = path.join(__dirname, '../data');
        this.credentialsFile = path.join(this.dataPath, 'credentials.json');
        this.encryptionKey = this.getOrCreateEncryptionKey();
        this.loadCredentials();
    }

    async ensureDataDirectory() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
        } catch (error) {
            console.error('Error creating data directory:', error);
        }
    }

    getOrCreateEncryptionKey() {
        // In production, this should be stored securely (environment variable, key management service, etc.)
        const keyPath = path.join(this.dataPath, '.key');
        try {
            const key = require('fs').readFileSync(keyPath);
            return key;
        } catch (error) {
            // Generate new key if it doesn't exist
            const key = crypto.randomBytes(32);
            try {
                require('fs').writeFileSync(keyPath, key);
                return key;
            } catch (writeError) {
                console.warn('Could not save encryption key, using session key');
                return key;
            }
        }
    }

    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    async addCredentialSet(name, credentials) {
        const credentialSet = {
            id: this.generateId(),
            name: name,
            description: credentials.description || '',
            ssh: credentials.ssh ? {
                username: credentials.ssh.username,
                password: this.encrypt(credentials.ssh.password),
                port: credentials.ssh.port || 22,
                enablePassword: credentials.ssh.enablePassword ? this.encrypt(credentials.ssh.enablePassword) : null
            } : null,
            telnet: credentials.telnet ? {
                username: credentials.telnet.username,
                password: this.encrypt(credentials.telnet.password),
                port: credentials.telnet.port || 23,
                enablePassword: credentials.telnet.enablePassword ? this.encrypt(credentials.telnet.enablePassword) : null
            } : null,
            snmp: credentials.snmp ? {
                community: this.encrypt(credentials.snmp.community || 'public'),
                version: credentials.snmp.version || '2c',
                port: credentials.snmp.port || 161,
                username: credentials.snmp.username || null,
                authPassword: credentials.snmp.authPassword ? this.encrypt(credentials.snmp.authPassword) : null,
                privPassword: credentials.snmp.privPassword ? this.encrypt(credentials.snmp.privPassword) : null,
                authProtocol: credentials.snmp.authProtocol || 'SHA',
                privProtocol: credentials.snmp.privProtocol || 'AES'
            } : null,
            created: new Date().toISOString(),
            lastUsed: null
        };

        this.credentials.set(credentialSet.id, credentialSet);
        await this.saveCredentials();
        
        console.log(`✅ Added credential set: ${name}`);
        return credentialSet.id;
    }

    async updateCredentialSet(id, updates) {
        const credentialSet = this.credentials.get(id);
        if (!credentialSet) {
            throw new Error(`Credential set ${id} not found`);
        }

        // Update SSH credentials
        if (updates.ssh) {
            credentialSet.ssh = {
                username: updates.ssh.username,
                password: this.encrypt(updates.ssh.password),
                port: updates.ssh.port || 22,
                enablePassword: updates.ssh.enablePassword ? this.encrypt(updates.ssh.enablePassword) : null
            };
        }

        // Update Telnet credentials
        if (updates.telnet) {
            credentialSet.telnet = {
                username: updates.telnet.username,
                password: this.encrypt(updates.telnet.password),
                port: updates.telnet.port || 23,
                enablePassword: updates.telnet.enablePassword ? this.encrypt(updates.telnet.enablePassword) : null
            };
        }

        // Update SNMP credentials
        if (updates.snmp) {
            credentialSet.snmp = {
                community: this.encrypt(updates.snmp.community || 'public'),
                version: updates.snmp.version || '2c',
                port: updates.snmp.port || 161,
                username: updates.snmp.username || null,
                authPassword: updates.snmp.authPassword ? this.encrypt(updates.snmp.authPassword) : null,
                privPassword: updates.snmp.privPassword ? this.encrypt(updates.snmp.privPassword) : null,
                authProtocol: updates.snmp.authProtocol || 'SHA',
                privProtocol: updates.snmp.privProtocol || 'AES'
            };
        }

        // Update metadata
        if (updates.name) credentialSet.name = updates.name;
        if (updates.description) credentialSet.description = updates.description;
        credentialSet.modified = new Date().toISOString();

        await this.saveCredentials();
        console.log(`✅ Updated credential set: ${credentialSet.name}`);
        return true;
    }

    async deleteCredentialSet(id) {
        const credentialSet = this.credentials.get(id);
        if (!credentialSet) {
            throw new Error(`Credential set ${id} not found`);
        }

        this.credentials.delete(id);
        await this.saveCredentials();
        
        console.log(`🗑️ Deleted credential set: ${credentialSet.name}`);
        return true;
    }

    getCredentialSet(id, decrypt = false) {
        const credentialSet = this.credentials.get(id);
        if (!credentialSet) {
            return null;
        }

        if (!decrypt) {
            // Return sanitized version without passwords
            return {
                id: credentialSet.id,
                name: credentialSet.name,
                description: credentialSet.description,
                ssh: credentialSet.ssh ? {
                    username: credentialSet.ssh.username,
                    port: credentialSet.ssh.port,
                    hasPassword: !!credentialSet.ssh.password,
                    hasEnablePassword: !!credentialSet.ssh.enablePassword
                } : null,
                telnet: credentialSet.telnet ? {
                    username: credentialSet.telnet.username,
                    port: credentialSet.telnet.port,
                    hasPassword: !!credentialSet.telnet.password,
                    hasEnablePassword: !!credentialSet.telnet.enablePassword
                } : null,
                snmp: credentialSet.snmp ? {
                    version: credentialSet.snmp.version,
                    port: credentialSet.snmp.port,
                    username: credentialSet.snmp.username,
                    authProtocol: credentialSet.snmp.authProtocol,
                    privProtocol: credentialSet.snmp.privProtocol,
                    hasCommunity: !!credentialSet.snmp.community,
                    hasAuthPassword: !!credentialSet.snmp.authPassword,
                    hasPrivPassword: !!credentialSet.snmp.privPassword
                } : null,
                created: credentialSet.created,
                lastUsed: credentialSet.lastUsed
            };
        }

        // Return with decrypted passwords for actual use
        const decrypted = JSON.parse(JSON.stringify(credentialSet));
        
        if (decrypted.ssh && decrypted.ssh.password) {
            decrypted.ssh.password = this.decrypt(decrypted.ssh.password);
            if (decrypted.ssh.enablePassword) {
                decrypted.ssh.enablePassword = this.decrypt(decrypted.ssh.enablePassword);
            }
        }

        if (decrypted.telnet && decrypted.telnet.password) {
            decrypted.telnet.password = this.decrypt(decrypted.telnet.password);
            if (decrypted.telnet.enablePassword) {
                decrypted.telnet.enablePassword = this.decrypt(decrypted.telnet.enablePassword);
            }
        }

        if (decrypted.snmp && decrypted.snmp.community) {
            decrypted.snmp.community = this.decrypt(decrypted.snmp.community);
            if (decrypted.snmp.authPassword) {
                decrypted.snmp.authPassword = this.decrypt(decrypted.snmp.authPassword);
            }
            if (decrypted.snmp.privPassword) {
                decrypted.snmp.privPassword = this.decrypt(decrypted.snmp.privPassword);
            }
        }

        // Update last used timestamp
        credentialSet.lastUsed = new Date().toISOString();
        this.saveCredentials();

        return decrypted;
    }

    getAllCredentialSets() {
        return Array.from(this.credentials.values()).map(cred => this.getCredentialSet(cred.id, false));
    }

    async testCredentials(id, targetIP) {
        const credentials = this.getCredentialSet(id, true);
        if (!credentials) {
            throw new Error('Credential set not found');
        }

        const results = {
            ssh: false,
            telnet: false,
            snmp: false,
            errors: {}
        };

        // Test SSH
        if (credentials.ssh) {
            try {
                const { NodeSSH } = require('node-ssh');
                const ssh = new NodeSSH();
                
                await ssh.connect({
                    host: targetIP,
                    username: credentials.ssh.username,
                    password: credentials.ssh.password,
                    port: credentials.ssh.port,
                    readyTimeout: 5000
                });
                
                results.ssh = true;
                ssh.dispose();
            } catch (error) {
                results.errors.ssh = error.message;
            }
        }

        // Test Telnet
        if (credentials.telnet) {
            try {
                const { Client } = require('telnet-client');
                const telnet = new Client();
                
                await telnet.connect({
                    host: targetIP,
                    port: credentials.telnet.port,
                    username: credentials.telnet.username,
                    password: credentials.telnet.password,
                    timeout: 5000
                });
                
                results.telnet = true;
                await telnet.end();
            } catch (error) {
                results.errors.telnet = error.message;
            }
        }

        // Test SNMP
        if (credentials.snmp) {
            try {
                const snmp = require('net-snmp');
                const session = snmp.createSession(targetIP, credentials.snmp.community, {
                    version: credentials.snmp.version === '3' ? snmp.Version3 : snmp.Version2c,
                    timeout: 5000
                });

                await new Promise((resolve, reject) => {
                    session.get(['1.3.6.1.2.1.1.1.0'], (error, varbinds) => {
                        session.close();
                        if (error) {
                            reject(error);
                        } else {
                            resolve(varbinds);
                        }
                    });
                });
                
                results.snmp = true;
            } catch (error) {
                results.errors.snmp = error.message;
            }
        }

        return results;
    }

    generateId() {
        return 'cred_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async loadCredentials() {
        await this.ensureDataDirectory();
        
        try {
            const data = await fs.readFile(this.credentialsFile, 'utf8');
            const parsed = JSON.parse(data);
            
            parsed.forEach(cred => {
                this.credentials.set(cred.id, cred);
            });
            
            console.log(`📁 Loaded ${this.credentials.size} credential set(s)`);
        } catch (error) {
            console.log('📁 No existing credentials found, starting fresh');
        }
    }

    async saveCredentials() {
        await this.ensureDataDirectory();
        
        try {
            const data = Array.from(this.credentials.values());
            await fs.writeFile(this.credentialsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    }

    // Utility methods for quick credential access
    getSSHCredentials(id) {
        const creds = this.getCredentialSet(id, true);
        return creds ? creds.ssh : null;
    }

    getTelnetCredentials(id) {
        const creds = this.getCredentialSet(id, true);
        return creds ? creds.telnet : null;
    }

    getSNMPCredentials(id) {
        const creds = this.getCredentialSet(id, true);
        return creds ? creds.snmp : null;
    }

    // Get credentials by type for discovery operations
    getCredentialsForDiscovery() {
        const allCreds = Array.from(this.credentials.values());
        
        return {
            ssh: allCreds.filter(c => c.ssh).map(c => this.getCredentialSet(c.id, true).ssh),
            telnet: allCreds.filter(c => c.telnet).map(c => this.getCredentialSet(c.id, true).telnet),
            snmp: allCreds.filter(c => c.snmp).map(c => this.getCredentialSet(c.id, true).snmp)
        };
    }
}

module.exports = CredentialManager;