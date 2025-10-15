/**
 * TRADERS HELMET ACADEMY - AUTHENTICATION FLOW CONFIGURATION
 * Location: /assets/js/auth-config.js
 * 
 * Complete authentication flow configuration for multi-tier login system
 * Integrates with Supabase Auth and manages user sessions
 */

class AuthenticationConfig {
    constructor() {
        this.config = {
            // Supabase configuration
            supabase: {
                url: THConfig.supabase.url,
                anonKey: THConfig.supabase.anonKey,
                options: {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true,
                        flowType: 'pkce'
                    },
                    global: {
                        headers: {
                            'X-Client-Info': 'traders-helmet-academy'
                        }
                    }
                }
            },

            // Authentication flow settings
            auth: {
                loginRedirectUrl: '/pages/dashboard/',
                logoutRedirectUrl: '/login.html',
                resetPasswordUrl: '/pages/auth/reset-password.html',
                verifyEmailUrl: '/pages/auth/verify-email.html',
                sessionTimeout: 86400000, // 24 hours in milliseconds
                rememberMeTimeout: 2592000000, // 30 days in milliseconds
                maxLoginAttempts: 5,
                lockoutDuration: 900000, // 15 minutes in milliseconds
                requireEmailVerification: true,
                enableTwoFactor: true,
                passwordMinLength: 8,
                passwordComplexity: {
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: true
                }
            },

            // Tier-based access configuration
            tiers: {
                free: {
                    level: 0,
                    name: 'Free',
                    features: ['basic-access'],
                    redirectUrl: '/pages/dashboard/index.html',
                    color: '#6b7280'
                },
                gold: {
                    level: 1,
                    name: 'Gold',
                    features: ['basic-signals', 'email-support', 'mobile-access', 'basic-charts'],
                    redirectUrl: '/pages/dashboard/gold.html',
                    color: '#f59e0b'
                },
                platinum: {
                    level: 2,
                    name: 'Platinum',
                    features: ['advanced-signals', 'crypto-signals', 'priority-support', 'advanced-charts', 'technical-analysis'],
                    redirectUrl: '/pages/dashboard/platinum.html',
                    color: '#8b5cf6'
                },
                diamond: {
                    level: 3,
                    name: 'Diamond',
                    features: ['premium-signals', 'all-markets', 'vip-support', 'personal-coach', 'all-features'],
                    redirectUrl: '/pages/dashboard/diamond.html',
                    color: '#06b6d4'
                },
                admin: {
                    level: 999,
                    name: 'Admin',
                    features: ['admin-panel', 'user-management', 'all-features'],
                    redirectUrl: '/pages/admin/dashboard.html',
                    color: '#dc2626'
                }
            },

            // OAuth providers configuration  
            oauth: {
                enabled: true,
                providers: {
                    google: {
                        enabled: true,
                        scopes: 'openid email profile',
                        options: {
                            redirectTo: window.location.origin + '/auth/callback'
                        }
                    },
                    github: {
                        enabled: false, // Disabled for trading platform
                        scopes: 'user:email'
                    },
                    apple: {
                        enabled: true,
                        scopes: 'name email'
                    }
                }
            },

            // Security settings
            security: {
                csrfProtection: true,
                rateLimit: {
                    login: {
                        maxAttempts: 5,
                        windowMs: 900000, // 15 minutes
                        blockDuration: 900000 // 15 minutes
                    },
                    register: {
                        maxAttempts: 3,
                        windowMs: 3600000, // 1 hour
                        blockDuration: 3600000 // 1 hour
                    },
                    passwordReset: {
                        maxAttempts: 3,
                        windowMs: 3600000, // 1 hour
                        blockDuration: 3600000 // 1 hour
                    }
                },
                sessionSecurity: {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict'
                }
            },

            // Email templates
            emailTemplates: {
                welcome: {
                    subject: 'Welcome to Traders Helmet Academy!',
                    template: 'welcome_email'
                },
                emailVerification: {
                    subject: 'Verify your email address',
                    template: 'email_verification'
                },
                passwordReset: {
                    subject: 'Reset your password',
                    template: 'password_reset'
                },
                passwordChanged: {
                    subject: 'Password changed successfully',
                    template: 'password_changed'
                },
                loginNotification: {
                    subject: 'New login to your account',
                    template: 'login_notification'
                }
            },

            // Error messages
            errors: {
                invalidCredentials: 'Invalid email or password. Please try again.',
                accountLocked: 'Account temporarily locked due to multiple failed login attempts.',
                emailNotVerified: 'Please verify your email address before logging in.',
                weakPassword: 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.',
                emailInUse: 'An account with this email already exists.',
                passwordMismatch: 'Passwords do not match.',
                invalidEmail: 'Please enter a valid email address.',
                sessionExpired: 'Your session has expired. Please login again.',
                insufficientPermissions: 'You do not have permission to access this resource.',
                twoFactorRequired: 'Two-factor authentication is required for your account.',
                invalidTwoFactorCode: 'Invalid two-factor authentication code.',
                networkError: 'Network error. Please check your connection and try again.',
                serverError: 'Server error. Please try again later.',
                rateLimitExceeded: 'Too many attempts. Please try again later.'
            }
        };

        this.loginAttempts = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.setupPeriodicSessionCheck();
        console.log('✅ Authentication Configuration initialized');
    }

    /**
     * SESSION MANAGEMENT
     */
    async checkExistingSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Session check error:', error);
                return;
            }

            if (session) {
                await this.handleSessionFound(session);
            } else {
                await this.handleNoSession();
            }
        } catch (error) {
            console.error('Error checking existing session:', error);
        }
    }

    async handleSessionFound(session) {
        try {
            // Update global state
            THGlobal.state.user = session.user;
            THGlobal.state.session = session;
            
            // Load user profile and subscription info
            await this.loadUserData(session.user.id);
            
            // Update UI
            this.updateAuthenticationUI(true);
            
            // Log user activity
            await this.logUserActivity('session_resumed', {
                user_id: session.user.id,
                session_id: session.access_token.substring(0, 10) + '...'
            });

            console.log('✅ Session restored for user:', session.user.email);
        } catch (error) {
            console.error('Error handling session:', error);
            await this.logout(); // Clear potentially corrupted session
        }
    }

    async handleNoSession() {
        // Clear any existing state
        THGlobal.state.user = null;
        THGlobal.state.session = null;
        THGlobal.state.userProfile = null;
        
        // Update UI
        this.updateAuthenticationUI(false);
        
        // Redirect to login if on protected page
        if (this.isProtectedPage()) {
            this.redirectToLogin();
        }
    }

    async loadUserData(userId) {
        try {
            // Load user profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select(`
                    *,
                    user_subscriptions!inner (
                        tier,
                        status,
                        current_period_end,
                        subscription_plans (name, features)
                    )
                `)
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError;
            }

            // Store in global state
            THGlobal.state.userProfile = profile;
            
            // Determine user tier
            const subscription = profile?.user_subscriptions?.[0];
            const userTier = subscription?.status === 'active' ? subscription.tier : 'free';
            THGlobal.state.userTier = userTier;
            
            return profile;
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    }

    /**
     * AUTHENTICATION METHODS
     */
    async login(email, password, rememberMe = false) {
        try {
            // Check rate limiting
            if (this.isRateLimited('login', email)) {
                throw new Error(this.config.errors.rateLimitExceeded);
            }

            // Validate input
            this.validateLoginInput(email, password);

            // Attempt login
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password
            });

            if (error) {
                await this.handleLoginError(email, error);
                throw error;
            }

            // Clear login attempts on success
            this.clearLoginAttempts(email);

            // Handle successful login
            await this.handleSuccessfulLogin(data, rememberMe);

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async handleSuccessfulLogin(authData, rememberMe) {
        const { user, session } = authData;

        // Update global state
        THGlobal.state.user = user;
        THGlobal.state.session = session;

        // Load user profile data
        await this.loadUserData(user.id);

        // Set session persistence
        if (rememberMe) {
            localStorage.setItem('th_remember_session', 'true');
        }

        // Log successful login
        await this.logUserActivity('login_success', {
            user_id: user.id,
            ip_address: await this.getUserIP(),
            user_agent: navigator.userAgent
        });

        // Send login notification email (if enabled)
        await this.sendLoginNotification(user);

        // Update UI
        this.updateAuthenticationUI(true);

        // Redirect to appropriate dashboard
        await this.redirectToDashboard();

        // Show welcome notification
        THNotifications.show(
            `Welcome back, ${THGlobal.state.userProfile?.first_name || user.email}!`,
            'success',
            { duration: 5000 }
        );
    }

    async handleLoginError(email, error) {
        // Track login attempts
        this.trackLoginAttempt(email);

        // Log failed login attempt
        await this.logUserActivity('login_failed', {
            email: email,
            error: error.message,
            ip_address: await this.getUserIP(),
            user_agent: navigator.userAgent
        });

        // Handle specific error types
        switch (error.message) {
            case 'Invalid login credentials':
                throw new Error(this.config.errors.invalidCredentials);
            case 'Email not confirmed':
                throw new Error(this.config.errors.emailNotVerified);
            default:
                throw error;
        }
    }

    async register(userData) {
        try {
            // Check rate limiting
            if (this.isRateLimited('register', userData.email)) {
                throw new Error(this.config.errors.rateLimitExceeded);
            }

            // Validate registration data
            this.validateRegistrationData(userData);

            // Create account
            const { data, error } = await supabase.auth.signUp({
                email: userData.email.trim().toLowerCase(),
                password: userData.password,
                options: {
                    data: {
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        display_name: userData.displayName || userData.firstName,
                        referral_code: userData.referralCode || null
                    }
                }
            });

            if (error) {
                throw error;
            }

            // Handle successful registration
            await this.handleSuccessfulRegistration(data);

            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async handleSuccessfulRegistration(authData) {
        const { user } = authData;

        // Log registration
        await this.logUserActivity('user_registered', {
            user_id: user.id,
            email: user.email,
            ip_address: await this.getUserIP()
        });

        // Show success message
        THNotifications.show(
            'Account created successfully! Please check your email to verify your account.',
            'success',
            { duration: 8000, persistent: true }
        );

        // Redirect to verification page or login
        if (this.config.auth.requireEmailVerification) {
            window.location.href = this.config.auth.verifyEmailUrl;
        } else {
            // Auto-login if email verification not required
            await this.handleSuccessfulLogin(authData, false);
        }
    }

    async logout() {
        try {
            // Get current user for logging
            const currentUser = THGlobal.state.user;

            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
            }

            // Log logout activity
            if (currentUser) {
                await this.logUserActivity('logout', {
                    user_id: currentUser.id
                });
            }

            // Clear local state
            THGlobal.state.user = null;
            THGlobal.state.session = null;
            THGlobal.state.userProfile = null;
            THGlobal.state.userTier = null;

            // Clear local storage
            localStorage.removeItem('th_remember_session');
            localStorage.removeItem('th_user_preferences');

            // Update UI
            this.updateAuthenticationUI(false);

            // Show logout message
            THNotifications.show('You have been logged out successfully.', 'info');

            // Redirect to login page
            window.location.href = this.config.auth.logoutRedirectUrl;

        } catch (error) {
            console.error('Error during logout:', error);
            // Force redirect even if logout fails
            window.location.href = this.config.auth.logoutRedirectUrl;
        }
    }

    async resetPassword(email) {
        try {
            // Check rate limiting  
            if (this.isRateLimited('passwordReset', email)) {
                throw new Error(this.config.errors.rateLimitExceeded);
            }

            // Validate email
            if (!this.validateEmail(email)) {
                throw new Error(this.config.errors.invalidEmail);
            }

            // Send reset email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + this.config.auth.resetPasswordUrl
            });

            if (error) {
                throw error;
            }

            // Log password reset request
            await this.logUserActivity('password_reset_requested', {
                email: email,
                ip_address: await this.getUserIP()
            });

            THNotifications.show(
                'Password reset email sent. Please check your inbox.',
                'success',
                { duration: 8000 }
            );

            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    /**
     * VALIDATION METHODS
     */
    validateLoginInput(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }

        if (!this.validateEmail(email)) {
            throw new Error(this.config.errors.invalidEmail);
        }
    }

    validateRegistrationData(userData) {
        const { email, password, confirmPassword, firstName, lastName } = userData;

        // Required fields
        if (!email || !password || !confirmPassword || !firstName || !lastName) {
            throw new Error('All required fields must be filled.');
        }

        // Email validation
        if (!this.validateEmail(email)) {
            throw new Error(this.config.errors.invalidEmail);
        }

        // Password validation
        if (!this.validatePassword(password)) {
            throw new Error(this.config.errors.weakPassword);
        }

        // Password confirmation
        if (password !== confirmPassword) {
            throw new Error(this.config.errors.passwordMismatch);
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        if (password.length < this.config.auth.passwordMinLength) {
            return false;
        }

        const complexity = this.config.auth.passwordComplexity;
        
        if (complexity.requireUppercase && !/[A-Z]/.test(password)) return false;
        if (complexity.requireLowercase && !/[a-z]/.test(password)) return false;
        if (complexity.requireNumbers && !/\d/.test(password)) return false;
        if (complexity.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

        return true;
    }

    /**
     * RATE LIMITING
     */
    isRateLimited(action, identifier) {
        const key = `${action}_${identifier}`;
        const attempts = this.loginAttempts.get(key);
        const limit = this.config.security.rateLimit[action];

        if (!attempts || !limit) return false;

        const now = Date.now();
        const windowStart = now - limit.windowMs;

        // Clean old attempts
        const recentAttempts = attempts.filter(time => time > windowStart);
        this.loginAttempts.set(key, recentAttempts);

        return recentAttempts.length >= limit.maxAttempts;
    }

    trackLoginAttempt(identifier) {
        const key = `login_${identifier}`;
        const attempts = this.loginAttempts.get(key) || [];
        attempts.push(Date.now());
        this.loginAttempts.set(key, attempts);
    }

    clearLoginAttempts(identifier) {
        const key = `login_${identifier}`;
        this.loginAttempts.delete(key);
    }

    /**
     * UTILITY METHODS
     */
    async redirectToDashboard() {
        const userTier = THGlobal.state.userTier || 'free';
        const tierConfig = this.config.tiers[userTier];
        
        if (tierConfig) {
            window.location.href = tierConfig.redirectUrl;
        } else {
            window.location.href = this.config.auth.loginRedirectUrl;
        }
    }

    redirectToLogin() {
        const currentUrl = window.location.pathname;
        const loginUrl = `/login.html?redirect=${encodeURIComponent(currentUrl)}`;
        window.location.href = loginUrl;
    }

    isProtectedPage() {
        const protectedPaths = ['/pages/dashboard/', '/pages/admin/', '/pages/profile/'];
        const currentPath = window.location.pathname;
        return protectedPaths.some(path => currentPath.startsWith(path));
    }

    updateAuthenticationUI(isAuthenticated) {
        // Update navigation elements
        const loginButtons = document.querySelectorAll('.login-button');
        const logoutButtons = document.querySelectorAll('.logout-button');
        const userMenus = document.querySelectorAll('.user-menu');

        if (isAuthenticated) {
            loginButtons.forEach(btn => btn.style.display = 'none');
            logoutButtons.forEach(btn => btn.style.display = 'block');
            userMenus.forEach(menu => menu.style.display = 'block');
        } else {
            loginButtons.forEach(btn => btn.style.display = 'block');
            logoutButtons.forEach(btn => btn.style.display = 'none');
            userMenus.forEach(menu => menu.style.display = 'none');
        }
    }

    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    async logUserActivity(action, metadata = {}) {
        try {
            if (!THGlobal.state.user) return;

            await supabase
                .from('user_activity_log')
                .insert({
                    user_id: THGlobal.state.user.id,
                    action,
                    metadata,
                    ip_address: metadata.ip_address,
                    user_agent: metadata.user_agent || navigator.userAgent,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error logging user activity:', error);
        }
    }

    async sendLoginNotification(user) {
        try {
            // This would integrate with your email service
            console.log('Login notification would be sent to:', user.email);
        } catch (error) {
            console.error('Error sending login notification:', error);
        }
    }

    setupPeriodicSessionCheck() {
        // Check session validity every 5 minutes
        setInterval(async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session && THGlobal.state.user) {
                    // Session expired
                    THNotifications.show(
                        this.config.errors.sessionExpired,
                        'warning',
                        { persistent: true }
                    );
                    await this.logout();
                }
            } catch (error) {
                console.error('Session check error:', error);
            }
        }, 300000); // 5 minutes
    }

    setupEventListeners() {
        // Handle auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            
            switch (event) {
                case 'SIGNED_IN':
                    await this.handleSessionFound(session);
                    break;
                case 'SIGNED_OUT':
                    await this.handleNoSession();
                    break;
                case 'TOKEN_REFRESHED':
                    THGlobal.state.session = session;
                    break;
            }
        });

        // Handle logout buttons
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.logout-button') || e.target.closest('.logout-button')) {
                e.preventDefault();
                await this.logout();
            }
        });
    }

    /**
     * PUBLIC API
     */
    getConfig() {
        return this.config;
    }

    getCurrentUser() {
        return THGlobal.state.user;
    }

    getCurrentSession() {
        return THGlobal.state.session;
    }

    getUserTier() {
        return THGlobal.state.userTier;
    }

    isAuthenticated() {
        return !!THGlobal.state.user;
    }

    hasPermission(requiredTier) {
        const userTier = this.getUserTier();
        const userLevel = this.config.tiers[userTier]?.level || 0;
        const requiredLevel = this.config.tiers[requiredTier]?.level || 0;
        
        return userLevel >= requiredLevel;
    }
}

// Initialize Authentication Configuration
const AuthConfig = new AuthenticationConfig();

// Global access
window.AuthConfig = AuthConfig;