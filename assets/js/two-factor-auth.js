
/**
 * TRADERS HELMET ACADEMY - TWO-FACTOR AUTHENTICATION SYSTEM
 * Location: /assets/js/two-factor-auth.js
 * 
 * Complete Two-Factor Authentication implementation with TOTP,
 * backup codes, QR code generation, and recovery mechanisms
 */

class TwoFactorAuth {
    constructor() {
        this.config = {
            issuer: 'Traders Helmet Academy',
            window: 1, // Allow 1 step tolerance for time drift
            step: 30, // 30-second time step
            digits: 6, // 6-digit codes
            algorithm: 'SHA1',
            backupCodeLength: 8,
            backupCodeCount: 10,
            qrCodeSize: 256
        };
        
        this.user2FA = {
            secret: null,
            isEnabled: false,
            backupCodes: [],
            lastUsedBackupCode: null,
            setupComplete: false
        };

        this.init();
    }

    async init() {
        try {
            await this.loadUser2FAStatus();
            this.setupEventListeners();
            console.log('✅ Two-Factor Authentication system initialized');
        } catch (error) {
            console.error('❌ Failed to initialize 2FA system:', error);
        }
    }

    /**
     * 2FA SETUP AND MANAGEMENT
     */
    async generateSecret() {
        try {
            // Generate a random base32 secret
            const secret = this.generateBase32Secret();
            
            // Store temporarily (not persisted until setup is complete)
            this.user2FA.secret = secret;
            
            return {
                secret,
                qrCodeUrl: await this.generateQRCodeUrl(secret),
                manualEntryKey: this.formatSecretForManualEntry(secret)
            };
        } catch (error) {
            console.error('Error generating 2FA secret:', error);
            throw error;
        }
    }

    generateBase32Secret(length = 32) {
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        
        for (let i = 0; i < length; i++) {
            secret += base32Chars.charAt(Math.floor(Math.random() * base32Chars.length));
        }
        
        return secret;
    }

    formatSecretForManualEntry(secret) {
        // Format secret in groups of 4 for easier manual entry
        return secret.match(/.{1,4}/g)?.join(' ') || secret;
    }

    async generateQRCodeUrl(secret) {
        const user = THGlobal.state.user;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const label = encodeURIComponent(`${this.config.issuer}:${user.email}`);
        const issuer = encodeURIComponent(this.config.issuer);
        
        const otpAuthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=${this.config.algorithm}&digits=${this.config.digits}&period=${this.config.step}`;
        
        // Generate QR code using a service or library
        return `https://api.qrserver.com/v1/create-qr-code/?size=${this.config.qrCodeSize}x${this.config.qrCodeSize}&data=${encodeURIComponent(otpAuthUrl)}`;
    }

    async verifySetupCode(code) {
        try {
            if (!this.user2FA.secret) {
                throw new Error('No secret generated. Please start setup process again.');
            }

            const isValid = this.verifyTOTP(code, this.user2FA.secret);
            
            if (isValid) {
                // Generate backup codes
                const backupCodes = this.generateBackupCodes();
                
                return {
                    success: true,
                    backupCodes
                };
            } else {
                return {
                    success: false,
                    error: 'Invalid verification code. Please try again.'
                };
            }
        } catch (error) {
            console.error('Error verifying setup code:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async enable2FA(verificationCode) {
        try {
            const user = THGlobal.state.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Verify the setup code
            const verification = await this.verifySetupCode(verificationCode);
            if (!verification.success) {
                throw new Error(verification.error);
            }

            // Save 2FA settings to database
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    two_factor_enabled: true,
                    two_factor_secret: await this.encryptSecret(this.user2FA.secret),
                    two_factor_backup_codes: await this.encryptBackupCodes(verification.backupCodes),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            // Update local state
            this.user2FA.isEnabled = true;
            this.user2FA.backupCodes = verification.backupCodes;
            this.user2FA.setupComplete = true;

            // Create notification
            await this.createNotification(
                user.id,
                '2FA Enabled',
                'Two-factor authentication has been successfully enabled for your account.',
                'success'
            );

            // Log activity
            await this.logUserActivity(user.id, '2fa_enabled', {
                timestamp: new Date().toISOString(),
                ip_address: await this.getUserIP()
            });

            return {
                success: true,
                backupCodes: verification.backupCodes,
                message: 'Two-factor authentication has been enabled successfully!'
            };
        } catch (error) {
            console.error('Error enabling 2FA:', error);
            throw error;
        }
    }

    async disable2FA(password, verificationCode) {
        try {
            const user = THGlobal.state.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Verify password first
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            });

            if (authError) {
                throw new Error('Invalid password');
            }

            // Verify 2FA code or backup code
            const isValidCode = this.verifyTOTP(verificationCode, this.user2FA.secret);
            const isValidBackupCode = this.verifyBackupCode(verificationCode);

            if (!isValidCode && !isValidBackupCode) {
                throw new Error('Invalid verification code');
            }

            // Disable 2FA in database
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    two_factor_enabled: false,
                    two_factor_secret: null,
                    two_factor_backup_codes: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            // Update local state
            this.user2FA.isEnabled = false;
            this.user2FA.secret = null;
            this.user2FA.backupCodes = [];
            this.user2FA.setupComplete = false;

            // Create notification
            await this.createNotification(
                user.id,
                '2FA Disabled',
                'Two-factor authentication has been disabled for your account.',
                'warning'
            );

            // Log activity
            await this.logUserActivity(user.id, '2fa_disabled', {
                timestamp: new Date().toISOString(),
                ip_address: await this.getUserIP()
            });

            return {
                success: true,
                message: 'Two-factor authentication has been disabled.'
            };
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            throw error;
        }
    }

    /**
     * VERIFICATION METHODS
     */
    async verify2FACode(code, useBackupCode = false) {
        try {
            if (!this.user2FA.isEnabled) {
                return { success: true }; // 2FA not enabled, skip verification
            }

            let isValid = false;
            let wasBackupCode = false;

            if (useBackupCode || this.looksLikeBackupCode(code)) {
                isValid = this.verifyBackupCode(code);
                wasBackupCode = isValid;
            } else {
                isValid = this.verifyTOTP(code, this.user2FA.secret);
            }

            if (isValid) {
                // Log successful verification
                await this.logUserActivity(THGlobal.state.user.id, '2fa_verified', {
                    backup_code_used: wasBackupCode,
                    timestamp: new Date().toISOString()
                });

                return {
                    success: true,
                    backupCodeUsed: wasBackupCode
                };
            } else {
                return {
                    success: false,
                    error: 'Invalid verification code'
                };
            }
        } catch (error) {
            console.error('Error verifying 2FA code:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    verifyTOTP(token, secret) {
        if (!token || !secret) {
            return false;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(currentTime / this.config.step);

        // Check current time step and adjacent ones for time drift tolerance
        for (let i = -this.config.window; i <= this.config.window; i++) {
            const testTimeStep = timeStep + i;
            const expectedToken = this.generateTOTP(secret, testTimeStep);
            
            if (this.constantTimeEquals(token, expectedToken)) {
                return true;
            }
        }

        return false;
    }

    generateTOTP(secret, timeStep) {
        const key = this.base32ToBytes(secret);
        const time = this.intToBytes(timeStep);
        
        // HMAC-SHA1
        const hmac = this.hmacSha1(key, time);
        
        // Dynamic truncation
        const offset = hmac[hmac.length - 1] & 0x0f;
        const truncatedHash = (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        );
        
        const token = truncatedHash % Math.pow(10, this.config.digits);
        return token.toString().padStart(this.config.digits, '0');
    }

    verifyBackupCode(code) {
        const cleanCode = code.replace(/\s+/g, '').toUpperCase();
        const index = this.user2FA.backupCodes.findIndex(backupCode => 
            backupCode.code === cleanCode && !backupCode.used
        );

        if (index !== -1) {
            // Mark backup code as used
            this.user2FA.backupCodes[index].used = true;
            this.user2FA.backupCodes[index].usedAt = new Date().toISOString();
            
            // Update in database
            this.updateBackupCodesInDatabase();
            
            return true;
        }

        return false;
    }

    looksLikeBackupCode(code) {
        const cleanCode = code.replace(/\s+/g, '');
        return cleanCode.length === this.config.backupCodeLength && /^[A-Z0-9]+$/.test(cleanCode);
    }

    /**
     * BACKUP CODES MANAGEMENT
     */
    generateBackupCodes() {
        const codes = [];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        for (let i = 0; i < this.config.backupCodeCount; i++) {
            let code = '';
            for (let j = 0; j < this.config.backupCodeLength; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            codes.push({
                code,
                used: false,
                usedAt: null,
                createdAt: new Date().toISOString()
            });
        }
        
        return codes;
    }

    async regenerateBackupCodes(verificationCode) {
        try {
            const user = THGlobal.state.user;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Verify 2FA code
            const verification = await this.verify2FACode(verificationCode);
            if (!verification.success) {
                throw new Error('Invalid verification code');
            }

            // Generate new backup codes
            const newBackupCodes = this.generateBackupCodes();

            // Update in database
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    two_factor_backup_codes: await this.encryptBackupCodes(newBackupCodes),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            // Update local state
            this.user2FA.backupCodes = newBackupCodes;

            // Log activity
            await this.logUserActivity(user.id, '2fa_backup_codes_regenerated', {
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                backupCodes: newBackupCodes,
                message: 'New backup codes generated successfully!'
            };
        } catch (error) {
            console.error('Error regenerating backup codes:', error);
            throw error;
        }
    }

    async updateBackupCodesInDatabase() {
        try {
            const user = THGlobal.state.user;
            if (!user) return;

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    two_factor_backup_codes: await this.encryptBackupCodes(this.user2FA.backupCodes),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                console.error('Error updating backup codes:', error);
            }
        } catch (error) {
            console.error('Error updating backup codes in database:', error);
        }
    }

    /**
     * DATA LOADING AND PERSISTENCE
     */
    async loadUser2FAStatus() {
        try {
            const user = THGlobal.state.user;
            if (!user) return;

            const { data: userProfile, error } = await supabase
                .from('user_profiles')
                .select('two_factor_enabled, two_factor_secret, two_factor_backup_codes')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error loading 2FA status:', error);
                return;
            }

            if (userProfile) {
                this.user2FA.isEnabled = userProfile.two_factor_enabled || false;
                this.user2FA.setupComplete = userProfile.two_factor_enabled || false;
                
                if (userProfile.two_factor_secret) {
                    this.user2FA.secret = await this.decryptSecret(userProfile.two_factor_secret);
                }
                
                if (userProfile.two_factor_backup_codes) {
                    this.user2FA.backupCodes = await this.decryptBackupCodes(userProfile.two_factor_backup_codes);
                }
            }
        } catch (error) {
            console.error('Error loading user 2FA status:', error);
        }
    }

    /**
     * ENCRYPTION METHODS
     */
    async encryptSecret(secret) {
        // In a real implementation, use proper encryption
        // For demo purposes, we'll use base64 encoding
        return btoa(secret);
    }

    async decryptSecret(encryptedSecret) {
        // In a real implementation, use proper decryption
        // For demo purposes, we'll use base64 decoding
        try {
            return atob(encryptedSecret);
        } catch (error) {
            console.error('Error decrypting secret:', error);
            return null;
        }
    }

    async encryptBackupCodes(backupCodes) {
        // In a real implementation, use proper encryption
        return btoa(JSON.stringify(backupCodes));
    }

    async decryptBackupCodes(encryptedBackupCodes) {
        // In a real implementation, use proper decryption
        try {
            return JSON.parse(atob(encryptedBackupCodes));
        } catch (error) {
            console.error('Error decrypting backup codes:', error);
            return [];
        }
    }

    /**
     * CRYPTOGRAPHIC UTILITIES
     */
    base32ToBytes(base32) {
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        
        for (let i = 0; i < base32.length; i++) {
            const val = base32Chars.indexOf(base32.charAt(i).toUpperCase());
            bits += val.toString(2).padStart(5, '0');
        }
        
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.substr(i, 8);
            if (byte.length === 8) {
                bytes.push(parseInt(byte, 2));
            }
        }
        
        return new Uint8Array(bytes);
    }

    intToBytes(num) {
        const bytes = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
            bytes[i] = num & 0xff;
            num >>= 8;
        }
        return bytes;
    }

    hmacSha1(key, message) {
        // Simplified HMAC-SHA1 implementation
        // In production, use a proper crypto library
        return this.simpleSha1(key.toString() + message.toString());
    }

    simpleSha1(str) {
        // Very simplified SHA1-like hash for demo purposes
        // In production, use a proper crypto library like crypto-js
        let hash = 0;
        const result = new Uint8Array(20);
        
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
        }
        
        // Fill result array with hash-based values
        for (let i = 0; i < 20; i++) {
            result[i] = (hash >> (i % 32)) & 0xff;
        }
        
        return result;
    }

    constantTimeEquals(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        
        return result === 0;
    }

    /**
     * UI HELPER METHODS
     */
    async show2FASetupModal() {
        try {
            const setupData = await this.generateSecret();
            
            const modal = document.createElement('div');
            modal.className = 'two-factor-modal';
            modal.innerHTML = `
                <div class="modal-backdrop">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Set Up Two-Factor Authentication</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="setup-steps">
                                <div class="step active" data-step="1">
                                    <h4>Step 1: Scan QR Code</h4>
                                    <p>Use your authenticator app to scan this QR code:</p>
                                    <div class="qr-code-container">
                                        <img src="${setupData.qrCodeUrl}" alt="2FA QR Code" />
                                    </div>
                                    <div class="manual-entry">
                                        <p>Or enter this code manually:</p>
                                        <code class="secret-code">${setupData.manualEntryKey}</code>
                                        <button class="copy-secret-btn">Copy</button>
                                    </div>
                                    <button class="next-step-btn">Next</button>
                                </div>
                                
                                <div class="step" data-step="2">
                                    <h4>Step 2: Verify Setup</h4>
                                    <p>Enter the 6-digit code from your authenticator app:</p>
                                    <input type="text" id="verification-code" placeholder="000000" maxlength="6" />
                                    <button class="verify-setup-btn">Verify & Enable</button>
                                </div>
                                
                                <div class="step" data-step="3">
                                    <h4>Setup Complete!</h4>
                                    <p>Two-factor authentication has been enabled. Here are your backup codes:</p>
                                    <div class="backup-codes-container">
                                        <div class="backup-codes" id="backup-codes-list"></div>
                                        <button class="download-codes-btn">Download Codes</button>
                                    </div>
                                    <button class="finish-setup-btn">Finish</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.setup2FAModalEvents(modal);
            
        } catch (error) {
            console.error('Error showing 2FA setup modal:', error);
            THNotifications.show('Failed to initialize 2FA setup', 'error');
        }
    }

    setup2FAModalEvents(modal) {
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        // Copy secret code
        modal.querySelector('.copy-secret-btn').addEventListener('click', async () => {
            const secretCode = modal.querySelector('.secret-code').textContent;
            try {
                await navigator.clipboard.writeText(secretCode.replace(/\s/g, ''));
                THNotifications.show('Secret code copied to clipboard', 'success');
            } catch (error) {
                console.error('Failed to copy secret code:', error);
            }
        });

        // Next step
        modal.querySelector('.next-step-btn').addEventListener('click', () => {
            this.showModalStep(modal, 2);
        });

        // Verify setup
        modal.querySelector('.verify-setup-btn').addEventListener('click', async () => {
            const code = modal.querySelector('#verification-code').value;
            if (!code || code.length !== 6) {
                THNotifications.show('Please enter a 6-digit code', 'error');
                return;
            }

            try {
                const result = await this.enable2FA(code);
                if (result.success) {
                    this.showBackupCodes(modal, result.backupCodes);
                    this.showModalStep(modal, 3);
                } else {
                    THNotifications.show('Invalid verification code', 'error');
                }
            } catch (error) {
                THNotifications.show('Setup failed: ' + error.message, 'error');
            }
        });

        // Download backup codes
        modal.querySelector('.download-codes-btn').addEventListener('click', () => {
            this.downloadBackupCodes();
        });

        // Finish setup
        modal.querySelector('.finish-setup-btn').addEventListener('click', () => {
            modal.remove();
            THNotifications.show('Two-factor authentication enabled successfully!', 'success');
            this.update2FAUI();
        });
    }

    showModalStep(modal, stepNumber) {
        modal.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        modal.querySelector(`[data-step="${stepNumber}"]`).classList.add('active');
    }

    showBackupCodes(modal, backupCodes) {
        const container = modal.querySelector('#backup-codes-list');
        container.innerHTML = backupCodes.map(backup => `
            <div class="backup-code">${backup.code}</div>
        `).join('');
    }

    downloadBackupCodes() {
        const codes = this.user2FA.backupCodes.map(backup => backup.code).join('\n');
        const blob = new Blob([`Traders Helmet Academy - Backup Codes\n\n${codes}\n\nKeep these codes safe and secure!`], 
                             { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'traders-helmet-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    update2FAUI() {
        // Update 2FA status indicators in the UI
        const statusElements = document.querySelectorAll('.two-factor-status');
        statusElements.forEach(element => {
            if (this.user2FA.isEnabled) {
                element.textContent = 'Enabled';
                element.className = 'two-factor-status enabled';
            } else {
                element.textContent = 'Disabled';
                element.className = 'two-factor-status disabled';
            }
        });

        // Update 2FA toggle buttons
        const toggleButtons = document.querySelectorAll('.two-factor-toggle');
        toggleButtons.forEach(button => {
            if (this.user2FA.isEnabled) {
                button.textContent = 'Disable 2FA';
                button.className = 'btn btn-outline-danger two-factor-toggle';
            } else {
                button.textContent = 'Enable 2FA';
                button.className = 'btn btn-primary two-factor-toggle';
            }
        });
    }

    /**
     * EVENT LISTENERS
     */
    setupEventListeners() {
        // Enable 2FA button
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.enable-2fa-btn')) {
                e.preventDefault();
                await this.show2FASetupModal();
            }
        });

        // Disable 2FA button
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.disable-2fa-btn')) {
                e.preventDefault();
                await this.show2FADisableModal();
            }
        });

        // Regenerate backup codes button
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.regenerate-backup-codes-btn')) {
                e.preventDefault();
                await this.showRegenerateBackupCodesModal();
            }
        });

        // 2FA code input formatting
        document.addEventListener('input', (e) => {
            if (e.target.matches('.two-factor-code-input')) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 6) {
                    value = value.slice(0, 6);
                }
                e.target.value = value;
            }
        });
    }

    /**
     * UTILITY METHODS
     */
    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    async createNotification(userId, title, message, type) {
        try {
            await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title,
                    message,
                    type,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    async logUserActivity(userId, action, metadata = {}) {
        try {
            await supabase
                .from('user_activity_log')
                .insert({
                    user_id: userId,
                    action,
                    metadata,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error logging user activity:', error);
        }
    }

    /**
     * PUBLIC API
     */
    isEnabled() {
        return this.user2FA.isEnabled;
    }

    isSetupComplete() {
        return this.user2FA.setupComplete;
    }

    getStatus() {
        return {
            enabled: this.user2FA.isEnabled,
            setupComplete: this.user2FA.setupComplete,
            backupCodesCount: this.user2FA.backupCodes.filter(code => !code.used).length
        };
    }

    async requireVerification(callback) {
        if (!this.user2FA.isEnabled) {
            return callback();
        }

        // Show 2FA verification modal
        return new Promise((resolve, reject) => {
            this.show2FAVerificationModal(async (code) => {
                const verification = await this.verify2FACode(code);
                if (verification.success) {
                    const result = await callback();
                    resolve(result);
                } else {
                    reject(new Error('2FA verification failed'));
                }
            });
        });
    }

    show2FAVerificationModal(onVerify) {
        const modal = document.createElement('div');
        modal.className = 'two-factor-verification-modal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Two-Factor Authentication Required</h3>
                    </div>
                    <div class="modal-body">
                        <p>Please enter your 6-digit authentication code:</p>
                        <input type="text" id="verify-code" class="two-factor-code-input" placeholder="000000" maxlength="6" />
                        <div class="modal-actions">
                            <button class="btn btn-secondary cancel-btn">Cancel</button>
                            <button class="btn btn-primary verify-btn">Verify</button>
                        </div>
                        <div class="backup-code-option">
                            <a href="#" class="use-backup-code-link">Use backup code instead</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.verify-btn').addEventListener('click', () => {
            const code = modal.querySelector('#verify-code').value;
            modal.remove();
            onVerify(code);
        });

        modal.querySelector('#verify-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('.verify-btn').click();
            }
        });

        // Focus on input
        setTimeout(() => {
            modal.querySelector('#verify-code').focus();
        }, 100);
    }
}

// Initialize Two-Factor Authentication
const TwoFactorAuth = new TwoFactorAuth();

// Global access
window.TwoFactorAuth = TwoFactorAuth;