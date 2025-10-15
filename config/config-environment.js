
/**
 * TRADERS HELMET ACADEMY - ENVIRONMENT CONFIGURATION MANAGER
 * Location: /config/config-environment.js
 * 
 * Environment-specific configuration management for development,
 * staging, and production environments
 */

class EnvironmentConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || this.detectEnvironment();
        this.config = {};
        this.secrets = new Map();
        this.loaded = false;
        
        this.init();
    }

    init() {
        this.loadEnvironmentConfig();
        this.validateConfiguration();
        this.setupEnvironmentSpecificSettings();
        console.log(`✅ Environment configuration loaded: ${this.environment}`);
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
            return 'development';
        } else if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        } else {
            return 'production';
        }
    }

    loadEnvironmentConfig() {
        // Base configuration
        this.config = {
            // Environment info
            environment: this.environment,
            version: '1.0.0',
            buildDate: new Date().toISOString(),
            
            // API Configuration
            api: {
                baseUrl: this.getApiBaseUrl(),
                timeout: 30000,
                retryAttempts: 3,
                retryDelay: 1000
            },

            // Supabase Configuration
            supabase: {
                url: this.getSupabaseUrl(),
                anonKey: this.getSupabaseAnonKey(),
                serviceKey: this.getSupabaseServiceKey(), // Server-side only
                options: {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true,
                        flowType: 'pkce'
                    },
                    global: {
                        headers: {
                            'X-Client-Info': 'traders-helmet-academy',
                            'X-Environment': this.environment
                        }
                    }
                }
            },

            // Payment Configuration (Stripe)
            payments: {
                stripe: {
                    publishableKey: this.getStripePublishableKey(),
                    webhookSecret: this.getStripeWebhookSecret(), // Server-side only
                    apiVersion: '2023-10-16'
                }
            },

            // Security Configuration
            security: {
                jwtSecret: this.getJwtSecret(), // Server-side only
                encryptionKey: this.getEncryptionKey(), // Server-side only
                csrfProtection: this.environment === 'production',
                httpsOnly: this.environment === 'production',
                secureHeaders: this.environment === 'production'
            },

            // Feature Flags
            features: this.getFeatureFlags(),

            // Logging Configuration
            logging: {
                level: this.getLogLevel(),
                enableConsole: this.environment !== 'production',
                enableRemote: this.environment === 'production',
                remoteEndpoint: this.getLoggingEndpoint()
            },

            // Analytics Configuration
            analytics: {
                googleAnalytics: {
                    trackingId: this.getGoogleAnalyticsId(),
                    enabled: this.environment === 'production'
                },
                mixpanel: {
                    token: this.getMixpanelToken(),
                    enabled: this.environment === 'production'
                }
            },

            // Email Configuration
            email: {
                provider: 'supabase', // or 'sendgrid', 'ses', etc.
                fromAddress: this.getFromEmailAddress(),
                fromName: 'Traders Helmet Academy',
                templates: {
                    welcome: 'welcome_email',
                    verification: 'email_verification',
                    passwordReset: 'password_reset'
                }
            },

            // CDN Configuration
            cdn: {
                baseUrl: this.getCdnBaseUrl(),
                enabled: this.environment === 'production'
            },

            // Rate Limiting
            rateLimiting: {
                enabled: true,
                requests: this.getRateLimitRequests(),
                windowMs: this.getRateLimitWindow(),
                skipSuccessfulRequests: false
            },

            // Cache Configuration
            cache: {
                redis: {
                    url: this.getRedisUrl(),
                    enabled: this.environment !== 'development'
                },
                ttl: {
                    default: 300, // 5 minutes
                    userProfile: 3600, // 1 hour
                    tradingSignals: 60, // 1 minute
                    marketData: 30 // 30 seconds
                }
            },

            // WebSocket Configuration
            websocket: {
                url: this.getWebSocketUrl(),
                reconnectAttempts: 5,
                reconnectDelay: 1000,
                heartbeatInterval: 30000
            }
        };

        // Environment-specific overrides
        this.applyEnvironmentOverrides();
        this.loaded = true;
    }

    applyEnvironmentOverrides() {
        switch (this.environment) {
            case 'development':
                this.applyDevelopmentConfig();
                break;
            case 'staging':
                this.applyStagingConfig();
                break;
            case 'production':
                this.applyProductionConfig();
                break;
        }
    }

    applyDevelopmentConfig() {
        // Development-specific settings
        this.config.api.timeout = 60000; // Longer timeout for debugging
        this.config.logging.level = 'debug';
        this.config.security.csrfProtection = false;
        this.config.rateLimiting.enabled = false;
        
        // Development feature flags
        this.config.features.debugMode = true;
        this.config.features.testPayments = true;
        this.config.features.mockData = true;
    }

    applyStagingConfig() {
        // Staging-specific settings
        this.config.logging.level = 'info';
        this.config.security.csrfProtection = true;
        this.config.rateLimiting.enabled = true;
        
        // Staging feature flags
        this.config.features.debugMode = false;
        this.config.features.testPayments = true;
        this.config.features.mockData = false;
    }

    applyProductionConfig() {
        // Production-specific settings
        this.config.api.timeout = 15000; // Stricter timeout
        this.config.logging.level = 'warn';
        this.config.security.csrfProtection = true;
        this.config.security.httpsOnly = true;
        this.config.rateLimiting.enabled = true;
        
        // Production feature flags
        this.config.features.debugMode = false;
        this.config.features.testPayments = false;
        this.config.features.mockData = false;
        this.config.features.analytics = true;
    }

    /**
     * ENVIRONMENT VARIABLE GETTERS
     */
    getApiBaseUrl() {
        switch (this.environment) {
            case 'development':
                return process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
            case 'staging':
                return process.env.VITE_API_BASE_URL || 'https://staging-api.tradershelmet.com';
            case 'production':
                return process.env.VITE_API_BASE_URL || 'https://api.tradershelmet.com';
            default:
                return 'http://localhost:3000/api';
        }
    }

    getSupabaseUrl() {
        return process.env.VITE_SUPABASE_URL || 
               process.env.SUPABASE_URL || 
               'https://your-project.supabase.co';
    }

    getSupabaseAnonKey() {
        return process.env.VITE_SUPABASE_ANON_KEY || 
               process.env.SUPABASE_ANON_KEY || 
               'your-anon-key';
    }

    getSupabaseServiceKey() {
        // Server-side only - never expose in client
        return process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
    }

    getStripePublishableKey() {
        switch (this.environment) {
            case 'production':
                return process.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_...';
            default:
                return process.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';
        }
    }

    getStripeWebhookSecret() {
        // Server-side only
        return process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
    }

    getJwtSecret() {
        // Server-side only
        return process.env.JWT_SECRET || 'your-jwt-secret-key';
    }

    getEncryptionKey() {
        // Server-side only
        return process.env.ENCRYPTION_KEY || 'your-encryption-key';
    }

    getGoogleAnalyticsId() {
        return process.env.VITE_GOOGLE_ANALYTICS_ID || 'GA_MEASUREMENT_ID';
    }

    getMixpanelToken() {
        return process.env.VITE_MIXPANEL_TOKEN || 'your-mixpanel-token';
    }

    getFromEmailAddress() {
        return process.env.FROM_EMAIL || 'noreply@tradershelmet.com';
    }

    getCdnBaseUrl() {
        return process.env.VITE_CDN_BASE_URL || 'https://cdn.tradershelmet.com';
    }

    getRedisUrl() {
        return process.env.REDIS_URL || 'redis://localhost:6379';
    }

    getWebSocketUrl() {
        switch (this.environment) {
            case 'development':
                return process.env.VITE_WS_URL || 'ws://localhost:3001';
            case 'staging':
                return process.env.VITE_WS_URL || 'wss://staging-ws.tradershelmet.com';
            case 'production':
                return process.env.VITE_WS_URL || 'wss://ws.tradershelmet.com';
            default:
                return 'ws://localhost:3001';
        }
    }

    getLoggingEndpoint() {
        return process.env.LOGGING_ENDPOINT || 'https://api.tradershelmet.com/logs';
    }

    getLogLevel() {
        switch (this.environment) {
            case 'development':
                return process.env.LOG_LEVEL || 'debug';
            case 'staging':
                return process.env.LOG_LEVEL || 'info';
            case 'production':
                return process.env.LOG_LEVEL || 'warn';
            default:
                return 'info';
        }
    }

    getRateLimitRequests() {
        switch (this.environment) {
            case 'development':
                return 1000; // More lenient for development
            case 'staging':
                return 500;
            case 'production':
                return 100;
            default:
                return 100;
        }
    }

    getRateLimitWindow() {
        return 15 * 60 * 1000; // 15 minutes
    }

    /**
     * FEATURE FLAGS
     */
    getFeatureFlags() {
        const baseFlags = {
            // Core features
            userRegistration: true,
            emailVerification: true,
            twoFactorAuth: true,
            passwordReset: true,
            
            // Trading features
            tradingSignals: true,
            marketData: true,
            chartAnalysis: true,
            portfolioTracking: false, // Coming soon
            
            // Communication features
            liveChat: true,
            notifications: true,
            emailAlerts: true,
            smsAlerts: false, // Premium feature
            
            // Payment features
            subscriptions: true,
            discountCodes: true,
            affiliateProgram: false, // Coming soon
            
            // Social features
            userProfiles: true,
            socialTrading: false, // Coming soon
            leaderboards: false, // Coming soon
            
            // Admin features
            adminPanel: true,
            userManagement: true,
            analyticsReporting: true,
            
            // Performance features
            caching: this.environment === 'production',
            compression: this.environment === 'production',
            lazyLoading: true,
            
            // Experimental features
            darkMode: true,
            mobileApp: false, // Coming soon
            desktopApp: false // Coming soon
        };

        // Environment-specific feature overrides
        if (this.environment === 'development') {
            baseFlags.debugTools = true;
            baseFlags.testingUtils = true;
        }

        return baseFlags;
    }

    /**
     * CONFIGURATION VALIDATION
     */
    validateConfiguration() {
        const requiredConfigs = [
            'supabase.url',
            'supabase.anonKey',
            'payments.stripe.publishableKey'
        ];

        const missingConfigs = [];

        for (const configPath of requiredConfigs) {
            if (!this.getNestedValue(this.config, configPath)) {
                missingConfigs.push(configPath);
            }
        }

        if (missingConfigs.length > 0) {
            console.error('❌ Missing required configuration:', missingConfigs);
            
            if (this.environment === 'production') {
                throw new Error(`Missing required configuration: ${missingConfigs.join(', ')}`);
            }
        }

        // Validate Supabase URL format
        const supabaseUrl = this.config.supabase.url;
        if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[\w-]+\.supabase\.co$/)) {
            console.warn('⚠️ Invalid Supabase URL format');
        }

        // Validate Stripe key format
        const stripeKey = this.config.payments.stripe.publishableKey;
        if (stripeKey && !stripeKey.startsWith('pk_')) {
            console.warn('⚠️ Invalid Stripe publishable key format');
        }
    }

    setupEnvironmentSpecificSettings() {
        // Set global error handling based on environment
        if (this.environment === 'production') {
            window.addEventListener('error', this.handleGlobalError.bind(this));
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        }

        // Set console logging based on environment
        if (this.environment === 'production') {
            // Disable console.log in production
            console.log = () => {};
            console.debug = () => {};
        }

        // Set performance monitoring
        if (this.config.features.analytics && this.environment === 'production') {
            this.setupPerformanceMonitoring();
        }
    }

    handleGlobalError(event) {
        // Log errors to remote service in production
        this.logError('global_error', {
            message: event.error?.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
        });
    }

    handleUnhandledRejection(event) {
        // Log unhandled promise rejections
        this.logError('unhandled_rejection', {
            reason: event.reason,
            promise: event.promise
        });
    }

    setupPerformanceMonitoring() {
        // Setup performance observers for production monitoring
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    // Send performance metrics to analytics
                    this.trackPerformance(entry);
                }
            });
            
            observer.observe({ entryTypes: ['navigation', 'measure', 'resource'] });
        }
    }

    /**
     * UTILITY METHODS
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) current[key] = {};
            return current[key];
        }, obj);
        target[last] = value;
    }

    logError(type, data) {
        if (this.config.logging.enableRemote) {
            // Send to remote logging service
            fetch(this.config.logging.remoteEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    data,
                    environment: this.environment,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            }).catch(console.error);
        }
    }

    trackPerformance(entry) {
        // Send performance data to analytics
        if (window.gtag) {
            window.gtag('event', 'performance', {
                event_category: 'Performance',
                event_label: entry.name,
                value: Math.round(entry.duration)
            });
        }
    }

    /**
     * PUBLIC API
     */
    get(path, defaultValue = null) {
        return this.getNestedValue(this.config, path) || defaultValue;
    }

    set(path, value) {
        this.setNestedValue(this.config, path, value);
    }

    isFeatureEnabled(feature) {
        return this.config.features?.[feature] === true;
    }

    getEnvironment() {
        return this.environment;
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    isStaging() {
        return this.environment === 'staging';
    }

    isProduction() {
        return this.environment === 'production';
    }

    getConfig() {
        return { ...this.config }; // Return copy to prevent mutations
    }

    // Secure method to get server-side only configs
    getServerConfig() {
        if (typeof window !== 'undefined') {
            throw new Error('Server configuration should not be accessed from client-side');
        }
        
        return {
            supabase: {
                serviceKey: this.getSupabaseServiceKey()
            },
            security: {
                jwtSecret: this.getJwtSecret(),
                encryptionKey: this.getEncryptionKey()
            },
            payments: {
                stripe: {
                    webhookSecret: this.getStripeWebhookSecret()
                }
            }
        };
    }

    reload() {
        this.loadEnvironmentConfig();
        this.validateConfiguration();
        console.log('✅ Configuration reloaded');
    }
}

// Initialize Environment Configuration
const EnvConfig = new EnvironmentConfig();

// Global access
window.EnvConfig = EnvConfig;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvConfig;
}

// Make available as THConfig for compatibility
window.THConfig = EnvConfig.getConfig();