/**
 * TRADERS HELMET ACADEMY - AUTHENTICATION SERVICE
 * Comprehensive authentication system with session management, 2FA, and security features
 */

class AuthenticationService {
  constructor() {
    this.currentUser = null;
    this.tokenRefreshTimer = null;
    this.sessionCheckInterval = null;
    this.loginAttempts = new Map();
    this.deviceFingerprint = null;
    
    // Auth configuration
    this.config = {
      tokenKey: THA_CONFIG?.auth?.tokenKey || 'tha_auth_token',
      refreshTokenKey: THA_CONFIG?.auth?.refreshTokenKey || 'tha_refresh_token',
      sessionTimeout: THA_CONFIG?.auth?.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours
      maxLoginAttempts: THA_CONFIG?.auth?.maxLoginAttempts || 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      requireEmailVerification: THA_CONFIG?.auth?.requireEmailVerification || true,
      enableTwoFactor: THA_CONFIG?.auth?.enableTwoFactor || true,
      passwordMinLength: THA_CONFIG?.auth?.passwordMinLength || 8,
      sessionExtendThreshold: THA_CONFIG?.auth?.extendSessionThreshold || 30 * 60 * 1000 // 30 minutes
    };

    this.init();
  }

  /**
   * Initialize authentication service
   */
  async init() {
    try {
      // Generate device fingerprint
      this.deviceFingerprint = await this.generateDeviceFingerprint();
      
      // Check for existing session
      await this.checkExistingSession();
      
      // Setup session monitoring
      this.setupSessionMonitoring();
      
      // Setup automatic token refresh
      this.setupTokenRefresh();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('🔐 Authentication Service initialized');
    } catch (error) {
      console.error('❌ Authentication Service initialization failed:', error);
    }
  }

  /**
   * Generate device fingerprint for security
   */
  async generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 4);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      webgl: this.getWebGLFingerprint()
    };
    
    // Generate hash
    const fingerprintString = JSON.stringify(fingerprint);
    const hash = await this.hashString(fingerprintString);
    
    return hash.substring(0, 16); // First 16 characters
  }

  /**
   * Get WebGL fingerprint
   */
  getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'no-webgl';
      
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      return `${vendor}-${renderer}`;
    } catch (error) {
      return 'webgl-error';
    }
  }

  /**
   * Hash string using SubtleCrypto
   */
  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check for existing valid session
   */
  async checkExistingSession() {
    const token = this.getStoredToken();
    const refreshToken = this.getStoredRefreshToken();
    
    if (!token) return;

    try {
      // Validate token with server
      const response = await this.validateToken(token);
      
      if (response.valid) {
        this.currentUser = response.user;
        this.setAuthenticatedState(response.user, token, refreshToken);
      } else {
        // Try to refresh token
        if (refreshToken) {
          await this.refreshAccessToken();
        } else {
          this.clearStoredTokens();
        }
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      this.clearStoredTokens();
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials) {
    const { email, password, rememberMe = false, twoFactorCode = null } = credentials;
    
    try {
      // Check rate limiting
      if (this.isRateLimited(email)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Prepare login data
      const loginData = {
        email: email.toLowerCase().trim(),
        password,
        deviceFingerprint: this.deviceFingerprint,
        rememberMe,
        twoFactorCode
      };

      // Attempt login
      const response = await apiService.auth.login(loginData);
      
      if (response.data.success) {
        // Clear login attempts
        this.clearLoginAttempts(email);
        
        // Handle successful login
        await this.handleSuccessfulLogin(response.data);
        
        return {
          success: true,
          user: response.data.user,
          requiresTwoFactor: false
        };
      } else if (response.data.requiresTwoFactor) {
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Two-factor authentication code required'
        };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
      
    } catch (error) {
      // Track failed attempt
      this.trackFailedLogin(email);
      
      // Handle specific errors
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 423) {
        throw new Error('Account is temporarily locked. Please try again later.');
      } else if (error.response?.status === 403) {
        throw new Error('Account is suspended. Please contact support.');
      }
      
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const registrationData = {
        ...userData,
        email: userData.email.toLowerCase().trim(),
        deviceFingerprint: this.deviceFingerprint
      };

      // Validate password strength
      const passwordValidation = THA_Utils.validation.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error('Password does not meet security requirements');
      }

      const response = await apiService.auth.register(registrationData);
      
      if (response.data.success) {
        // Handle successful registration
        if (this.config.requireEmailVerification) {
          return {
            success: true,
            message: 'Registration successful! Please check your email to verify your account.',
            requiresVerification: true
          };
        } else {
          await this.handleSuccessfulLogin(response.data);
          return {
            success: true,
            user: response.data.user,
            requiresVerification: false
          };
        }
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
      
    } catch (error) {
      if (error.response?.status === 409) {
        throw new Error('An account with this email already exists');
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(reason = 'user_initiated') {
    try {
      // Notify server
      const token = this.getStoredToken();
      if (token) {
        await apiService.auth.logout({ reason });
      }
    } catch (error) {
      console.error('Logout notification failed:', error);
    } finally {
      // Clean up locally
      this.clearAuthenticatedState();
      
      // Log activity
      this.logSecurityEvent('logout', { reason });
      
      // Redirect to login page
      if (reason !== 'session_expired') {
        window.location.href = '/login.html';
      }
    }
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(loginResponse) {
    const { user, token, refreshToken, expiresAt } = loginResponse;
    
    // Set user state
    this.currentUser = user;
    
    // Store tokens
    this.storeTokens(token, refreshToken, expiresAt);
    
    // Set authenticated state
    this.setAuthenticatedState(user, token, refreshToken);
    
    // Log security event
    this.logSecurityEvent('login_success', {
      userId: user.id,
      tier: user.tier
    });
    
    // Update UI state
    if (window.stateManager) {
      window.stateManager.dispatch({
        type: 'AUTH_LOGIN',
        payload: { user, token, refreshToken, expiresAt }
      });
    }
    
    // Setup session monitoring
    this.setupSessionMonitoring();
    
    // Notify other components
    this.emit('login', user);
    
    console.log('✅ User logged in successfully:', user.email);
  }

  /**
   * Set authenticated state
   */
  setAuthenticatedState(user, token, refreshToken) {
    this.currentUser = user;
    
    // Update axios defaults if available
    if (window.apiService) {
      window.apiService.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Update Supabase session if available
    if (window.supabaseManager) {
      window.supabaseManager.currentUser = user;
    }
  }

  /**
   * Clear authenticated state
   */
  clearAuthenticatedState() {
    this.currentUser = null;
    this.clearStoredTokens();
    this.clearSessionTimers();
    
    // Update axios defaults
    if (window.apiService) {
      delete window.apiService.defaults.headers.common['Authorization'];
    }
    
    // Clear Supabase session
    if (window.supabaseManager) {
      window.supabaseManager.currentUser = null;
    }
    
    // Update state
    if (window.stateManager) {
      window.stateManager.dispatch({ type: 'AUTH_LOGOUT' });
    }
    
    // Notify other components
    this.emit('logout');
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiService.auth.forgotPassword(email.toLowerCase().trim());
      
      return {
        success: true,
        message: 'Password reset instructions have been sent to your email'
      };
    } catch (error) {
      if (error.response?.status === 404) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If this email is registered, you will receive reset instructions'
        };
      }
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      // Validate password strength
      const passwordValidation = THA_Utils.validation.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error('Password does not meet security requirements');
      }

      const response = await apiService.auth.resetPassword(token, newPassword);
      
      if (response.data.success) {
        this.logSecurityEvent('password_reset', {});
        return { success: true, message: 'Password reset successfully' };
      } else {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired reset token');
      }
      throw error;
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword, newPassword) {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      // Validate new password
      const passwordValidation = THA_Utils.validation.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error('New password does not meet security requirements');
      }

      const response = await apiService.users.changePassword({
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        this.logSecurityEvent('password_change', {
          userId: this.currentUser.id
        });
        
        tradersHelmet.showNotification('Password changed successfully', 'success');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Current password is incorrect');
      }
      throw error;
    }
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor() {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/auth/2fa/setup');
      
      return {
        success: true,
        qrCode: response.data.qrCode,
        secret: response.data.secret,
        backupCodes: response.data.backupCodes
      };
    } catch (error) {
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  /**
   * Verify two-factor authentication setup
   */
  async verifyTwoFactorSetup(code) {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/auth/2fa/verify-setup', { code });
      
      if (response.data.success) {
        this.currentUser.twoFactorEnabled = true;
        this.logSecurityEvent('2fa_enabled', {
          userId: this.currentUser.id
        });
        
        return { success: true };
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      throw new Error('Two-factor verification failed');
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password) {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/auth/2fa/disable', { password });
      
      if (response.data.success) {
        this.currentUser.twoFactorEnabled = false;
        this.logSecurityEvent('2fa_disabled', {
          userId: this.currentUser.id
        });
        
        return { success: true };
      } else {
        throw new Error('Password verification failed');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token) {
    try {
      const response = await apiService.auth.verifyEmail(token);
      
      if (response.data.success) {
        if (this.currentUser) {
          this.currentUser.emailVerified = true;
        }
        
        return {
          success: true,
          message: 'Email verified successfully'
        };
      } else {
        throw new Error(response.data.message || 'Email verification failed');
      }
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired verification token');
      }
      throw error;
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification() {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/auth/resend-verification');
      
      return {
        success: true,
        message: 'Verification email sent'
      };
    } catch (error) {
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Token management
   */
  async refreshAccessToken() {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiService.auth.refresh();
      
      if (response.data.success) {
        const { token, refreshToken: newRefreshToken, expiresAt } = response.data;
        
        // Update stored tokens
        this.storeTokens(token, newRefreshToken, expiresAt);
        
        // Update authorization header
        if (window.apiService) {
          window.apiService.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('🔄 Access token refreshed');
        return token;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout('token_refresh_failed');
      throw error;
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const token = this.getStoredToken();
    if (!token) return;

    try {
      // Decode token to get expiry time
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      // Refresh token 5 minutes before expiry
      const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
      
      if (refreshTime > 0) {
        this.tokenRefreshTimer = setTimeout(async () => {
          try {
            await this.refreshAccessToken();
            this.setupTokenRefresh(); // Setup next refresh
          } catch (error) {
            console.error('Automatic token refresh failed:', error);
          }
        }, refreshTime);
      }
    } catch (error) {
      console.error('Failed to setup token refresh:', error);
    }
  }

  /**
   * Session monitoring
   */
  setupSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      if (this.isAuthenticated()) {
        try {
          const token = this.getStoredToken();
          const isValid = await this.validateToken(token);
          
          if (!isValid.valid) {
            await this.logout('session_expired');
          }
        } catch (error) {
          console.error('Session check failed:', error);
          await this.logout('session_check_failed');
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle browser tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isAuthenticated()) {
        this.extendSession();
      }
    });

    // Handle storage events (multiple tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === this.config.tokenKey) {
        if (!e.newValue && this.isAuthenticated()) {
          // Token was removed in another tab
          this.clearAuthenticatedState();
        }
      }
    });

    // Handle before unload
    window.addEventListener('beforeunload', () => {
      if (this.isAuthenticated()) {
        // Save last activity time
        localStorage.setItem('tha_last_activity', Date.now().toString());
      }
    });
  }

  /**
   * Extend user session
   */
  async extendSession() {
    if (!this.isAuthenticated()) return;

    const lastActivity = localStorage.getItem('tha_last_activity');
    const now = Date.now();
    
    if (lastActivity) {
      const timeSinceLastActivity = now - parseInt(lastActivity);
      
      if (timeSinceLastActivity > this.config.sessionExtendThreshold) {
        try {
          await apiService.post('/auth/extend-session');
          localStorage.setItem('tha_last_activity', now.toString());
        } catch (error) {
          console.error('Failed to extend session:', error);
        }
      }
    }
  }

  /**
   * Rate limiting for login attempts
   */
  isRateLimited(email) {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;
    
    const { count, lastAttempt } = attempts;
    const timeSinceLastAttempt = Date.now() - lastAttempt;
    
    if (timeSinceLastAttempt > this.config.lockoutDuration) {
      // Reset attempts after lockout period
      this.loginAttempts.delete(email);
      return false;
    }
    
    return count >= this.config.maxLoginAttempts;
  }

  /**
   * Track failed login attempt
   */
  trackFailedLogin(email) {
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempts);
  }

  /**
   * Clear login attempts
   */
  clearLoginAttempts(email) {
    this.loginAttempts.delete(email);
  }

  /**
   * Security event logging
   */
  logSecurityEvent(event, data = {}) {
    const logData = {
      event,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      ipAddress: 'client-side', // Would be set by server
      deviceFingerprint: this.deviceFingerprint,
      ...data
    };
    
    // Send to server for logging
    if (window.apiService) {
      apiService.post('/auth/log-security-event', logData).catch(error => {
        console.error('Failed to log security event:', error);
      });
    }
    
    console.log('🔒 Security event:', event, logData);
  }

  /**
   * Token storage methods
   */
  storeTokens(token, refreshToken, expiresAt) {
    localStorage.setItem(this.config.tokenKey, token);
    if (refreshToken) {
      localStorage.setItem(this.config.refreshTokenKey, refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem('tha_token_expires', expiresAt.toString());
    }
  }

  getStoredToken() {
    return localStorage.getItem(this.config.tokenKey);
  }

  getStoredRefreshToken() {
    return localStorage.getItem(this.config.refreshTokenKey);
  }

  clearStoredTokens() {
    localStorage.removeItem(this.config.tokenKey);
    localStorage.removeItem(this.config.refreshTokenKey);
    localStorage.removeItem('tha_token_expires');
    localStorage.removeItem('tha_last_activity');
  }

  /**
   * Validate token with server
   */
  async validateToken(token) {
    try {
      const response = await fetch('/api/auth/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      return await response.json();
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Clear session timers
   */
  clearSessionTimers() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Public utility methods
   */
  isAuthenticated() {
    return !!this.currentUser && !!this.getStoredToken();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserTier() {
    return this.currentUser?.tier || 'guest';
  }

  hasRole(role) {
    return this.currentUser?.role === role;
  }

  hasTierAccess(requiredTier) {
    const tierLevels = { gold: 1, platinum: 2, diamond: 3, admin: 999 };
    const userLevel = tierLevels[this.getUserTier()] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Event system
   */
  eventListeners = new Map();

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in auth event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    this.clearSessionTimers();
    this.clearStoredTokens();
    this.eventListeners.clear();
  }
}

// Create global authentication service instance
const authService = new AuthenticationService();

// Make available globally
if (typeof window !== 'undefined') {
  window.authService = authService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthenticationService;
}