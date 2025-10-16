/**
 * Updated Universal SDK Configuration for Traders Helmet Academy
 * Using NEW Firebase and Supabase credentials
 * File: /assets/js/sdk-config.js
 */

console.log('🚀 Loading THA SDK Configuration V2...');

// NEW Configuration with your credentials
window.THA_CONFIG = {
    supabase: {
        url: 'https://xhaohziyrlwminomymbm.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYW9oeml5cmx3bWlub215bWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDk3NjgsImV4cCI6MjA3MjQyNTc2OH0.JFKtL1jYMT-sWEZcsEV3ZPHWfTE74uYBRNg13v22vKM'
    },
    firebase: {
        apiKey: "AIzaSyCHdhs1wQxyslO7ecotTiqKyc9fH-cJI1k",
 	authDomain: "traders-helmet-academy.firebaseapp.com",
  	projectId: "traders-helmet-academy",
  	storageBucket: "traders-helmet-academy.firebasestorage.app",
  	messagingSenderId: "789631387729",
  	appId: "1:789631387729:web:d1f176bcc091ec40c75070",
  	measurementId: "G-QBB3Z50V5H"
    },
    admin: {
        email: 'admin@tradershelmetacademy.com',
        password: 'TradersHelmet2024!'
    },
    version: '2.0',
    
    // User flow configuration
    userFlow: {
        anonymousAccess: ['/', '/about', '/contact'],
        registeredUserAccess: ['/dashboard', '/subscription', '/profile'],
        subscribedUserAccess: ['/academy', '/signals', '/premium'],
        adminAccess: ['/admin']
    }
};

// Global SDK status
window.THA_SDK_STATUS = {
    firebase: false,
    supabase: false,
    loading: true,
    user: null,
    userRole: 'anonymous'
};

// Enhanced SDK Loading Manager
class THA_SDKManager {
    constructor() {
        this.loadAttempts = 0;
        this.maxAttempts = 3;
        this.listeners = [];
        this.authListeners = [];
        this.init();
    }

    // Add listener for when SDKs are ready
    onReady(callback) {
        if (!window.THA_SDK_STATUS.loading) {
            callback(window.THA_SDK_STATUS);
        } else {
            this.listeners.push(callback);
        }
    }

    // Add listener for auth state changes
    onAuthStateChanged(callback) {
        this.authListeners.push(callback);
    }

    // Notify all listeners
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(window.THA_SDK_STATUS);
            } catch (error) {
                console.error('SDK ready callback error:', error);
            }
        });
        this.listeners = [];
    }

    // Notify auth listeners
    notifyAuthListeners(user) {
        this.authListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        });
    }

    // Initialize SDKs
    async init() {
        console.log('🔧 THA SDK Manager V2 initializing...');
        
        try {
            await Promise.all([
                this.loadSupabase(),
                this.loadFirebase()
            ]);
            
            // Initialize auth state monitoring
            this.initAuthStateMonitoring();
            
        } catch (error) {
            console.error('SDK initialization error:', error);
        } finally {
            window.THA_SDK_STATUS.loading = false;
            this.notifyListeners();
            console.log('✅ THA SDK Manager V2 ready:', window.THA_SDK_STATUS);
        }
    }

    // Load Firebase with enhanced error handling
    async loadFirebase() {
        console.log('🔄 Loading Firebase...');

        // Method 1: Check if already loaded
        if (typeof firebase !== 'undefined') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.THA_CONFIG.firebase);
                }
                window.THA_SDK_STATUS.firebase = true;
                console.log('✅ Firebase ready (pre-loaded)');
                return;
            } catch (error) {
                console.log('⚠️ Firebase pre-loaded but init failed:', error);
            }
        }

        // Method 2: Dynamic loading with multiple CDNs
        const cdnUrls = [
            'https://www.gstatic.com/firebasejs/9.22.0',
            'https://www.gstatic.com/firebasejs/10.7.1',
            'https://cdn.jsdelivr.net/npm/firebase@9.22.0/compat'
        ];

        for (const baseUrl of cdnUrls) {
            try {
                console.log(`🔄 Trying Firebase CDN: ${baseUrl}`);
                
                await Promise.all([
                    this.loadScript(`${baseUrl}/firebase-app-compat.js`),
                    this.loadScript(`${baseUrl}/firebase-auth-compat.js`)
                ]);

                if (typeof firebase !== 'undefined') {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.THA_CONFIG.firebase);
                    }
                    window.THA_SDK_STATUS.firebase = true;
                    console.log('✅ Firebase ready (dynamic)');
                    return;
                }
            } catch (error) {
                console.log(`❌ Firebase CDN failed: ${baseUrl}`, error);
                continue;
            }
        }

        console.log('❌ All Firebase CDN attempts failed');
        window.THA_SDK_STATUS.firebase = false;
    }

    // Load Supabase with enhanced error handling
    async loadSupabase() {
        console.log('🔄 Loading Supabase...');

        // Method 1: Check if already loaded
        if (typeof window.supabase !== 'undefined') {
            try {
                window.supabaseClient = window.supabase.createClient(
                    window.THA_CONFIG.supabase.url,
                    window.THA_CONFIG.supabase.key
                );
                
                // Test connection
                await window.supabaseClient.auth.getUser();
                window.THA_SDK_STATUS.supabase = true;
                console.log('✅ Supabase ready (pre-loaded)');
                return;
            } catch (error) {
                console.log('⚠️ Supabase pre-loaded but connection failed:', error);
            }
        }

        // Method 2: Dynamic loading with multiple CDNs
        const cdnUrls = [
            'https://unpkg.com/@supabase/supabase-js@2',
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/dist/umd/supabase.js',
            'https://cdn.skypack.dev/@supabase/supabase-js@2'
        ];

        for (const url of cdnUrls) {
            try {
                console.log(`🔄 Trying Supabase CDN: ${url}`);
                await this.loadScript(url);
                
                if (typeof window.supabase !== 'undefined') {
                    window.supabaseClient = window.supabase.createClient(
                        window.THA_CONFIG.supabase.url,
                        window.THA_CONFIG.supabase.key
                    );
                    
                    // Test connection
                    await window.supabaseClient.auth.getUser();
                    window.THA_SDK_STATUS.supabase = true;
                    console.log('✅ Supabase ready (dynamic)');
                    return;
                }
            } catch (error) {
                console.log(`❌ Supabase CDN failed: ${url}`, error);
                continue;
            }
        }

        // Method 3: Create manual client
        console.log('🔄 Creating manual Supabase client...');
        this.createManualSupabaseClient();
    }

    // Manual Supabase client (enhanced for user management)
    createManualSupabaseClient() {
        window.supabaseClient = {
            auth: {
                getUser: async () => {
                    const user = localStorage.getItem('tha_user');
                    return { data: { user: user ? JSON.parse(user) : null }, error: null };
                },
                signUp: async (credentials) => this.manualSupabaseRequest('auth/v1/signup', 'POST', credentials),
                signInWithPassword: async (credentials) => this.manualSupabaseRequest('auth/v1/token?grant_type=password', 'POST', credentials),
                signOut: async () => {
                    localStorage.removeItem('tha_user');
                    window.THA_SDK_STATUS.user = null;
                    window.THA_SDK_STATUS.userRole = 'anonymous';
                    return { error: null };
                }
            },
            from: (table) => ({
                select: (columns = '*') => ({
                    eq: (column, value) => ({
                        single: async () => this.manualSupabaseRequest(`rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`, 'GET'),
                        limit: (count) => ({
                            order: (orderColumn, options = {}) => ({
                                range: async (from, to) => this.manualSupabaseRequest(`rest/v1/${table}?select=${columns}&${column}=eq.${encodeURIComponent(value)}&limit=${count}&offset=${from}&order=${orderColumn}.${options.ascending ? 'asc' : 'desc'}`, 'GET')
                            })
                        })
                    }),
                    order: (orderColumn, options = {}) => ({
                        limit: (count) => ({
                            range: async (from, to) => this.manualSupabaseRequest(`rest/v1/${table}?select=${columns}&limit=${count}&offset=${from}&order=${orderColumn}.${options.ascending ? 'asc' : 'desc'}`, 'GET')
                        })
                    })
                }),
                insert: async (data) => this.manualSupabaseRequest(`rest/v1/${table}`, 'POST', data),
                update: (data) => ({
                    eq: (column, value) => ({
                        select: async () => this.manualSupabaseRequest(`rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, 'PATCH', data)
                    })
                })
            })
        };

        window.THA_SDK_STATUS.supabase = true;
        console.log('✅ Manual Supabase client ready');
    }

    // Manual Supabase requests (enhanced)
    async manualSupabaseRequest(endpoint, method, data = null) {
        try {
            const url = `${window.THA_CONFIG.supabase.url}/${endpoint}`;
            const options = {
                method,
                headers: {
                    'apikey': window.THA_CONFIG.supabase.key,
                    'Authorization': `Bearer ${window.THA_CONFIG.supabase.key}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Format response to match Supabase SDK
            if (Array.isArray(result)) {
                return { data: result, error: null };
            } else {
                return { data: result, error: null };
            }
        } catch (error) {
            console.error('Manual Supabase request failed:', error);
            return { data: null, error: error };
        }
    }

    // Initialize auth state monitoring
    initAuthStateMonitoring() {
        if (window.THA_SDK_STATUS.firebase && typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged(async (user) => {
                await this.handleAuthStateChange(user);
            });
        }
        
        // Also check for stored user sessions
        this.checkStoredSession();
    }

    // Handle auth state changes
    async handleAuthStateChange(user) {
        if (user) {
            // Get user profile from Supabase
            const profile = await this.getUserProfile(user.email);
            
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                ...profile
            };

            window.THA_SDK_STATUS.user = userData;
            window.THA_SDK_STATUS.userRole = this.getUserRole(userData);
            
            // Store in localStorage for session persistence
            localStorage.setItem('tha_user', JSON.stringify(userData));
            
            console.log('✅ User authenticated:', userData.email, 'Role:', window.THA_SDK_STATUS.userRole);
        } else {
            window.THA_SDK_STATUS.user = null;
            window.THA_SDK_STATUS.userRole = 'anonymous';
            localStorage.removeItem('tha_user');
            
            console.log('❌ User logged out');
        }
        
        this.notifyAuthListeners(window.THA_SDK_STATUS.user);
    }

    // Check for stored session
    checkStoredSession() {
        const storedUser = localStorage.getItem('tha_user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                window.THA_SDK_STATUS.user = userData;
                window.THA_SDK_STATUS.userRole = this.getUserRole(userData);
                console.log('✅ Restored user session:', userData.email);
            } catch (error) {
                console.error('Failed to restore session:', error);
                localStorage.removeItem('tha_user');
            }
        }
    }

    // Get user profile from Supabase
    async getUserProfile(email) {
        if (!window.supabaseClient) return {};
        
        try {
            const { data, error } = await window.supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('email', email)
                .single();
            
            return data || {};
        } catch (error) {
            console.error('Failed to get user profile:', error);
            return {};
        }
    }

    // Determine user role
    getUserRole(userData) {
        if (!userData) return 'anonymous';
        if (userData.is_admin || userData.role === 'admin') return 'admin';
        if (userData.subscription_status === 'active') return 'subscribed';
        return 'registered';
    }

    // Load script dynamically
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            
            const timeout = setTimeout(() => {
                reject(new Error('Script load timeout'));
            }, 10000);
            
            script.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Script load failed'));
            };

            document.head.appendChild(script);
        });
    }
}

// Enhanced utility functions
window.THA_Utils = {
    // Wait for SDKs to be ready
    waitForSDKs: () => {
        return new Promise((resolve) => {
            if (!window.THA_SDK_STATUS.loading) {
                resolve(window.THA_SDK_STATUS);
            } else {
                window.THA_SDKManager.onReady(resolve);
            }
        });
    },

    // Get Supabase client
    getSupabase: () => {
        return window.supabaseClient;
    },

    // Get Firebase auth
    getFirebaseAuth: () => {
        return typeof firebase !== 'undefined' ? firebase.auth() : null;
    },

    // Get current user
    getCurrentUser: () => {
        return window.THA_SDK_STATUS.user;
    },

    // Get user role
    getUserRole: () => {
        return window.THA_SDK_STATUS.userRole;
    },

    // Check if user has access to route
    hasAccess: (route) => {
        const role = window.THA_SDK_STATUS.userRole;
        const config = window.THA_CONFIG.userFlow;
        
        switch (role) {
            case 'admin':
                return true; // Admins have access to everything
            case 'subscribed':
                return !config.adminAccess.includes(route);
            case 'registered':
                return config.anonymousAccess.includes(route) || 
                       config.registeredUserAccess.includes(route);
            case 'anonymous':
                return config.anonymousAccess.includes(route);
            default:
                return false;
        }
    },

    // Redirect based on user role
    redirectBasedOnRole: (currentPath = window.location.pathname) => {
        const role = window.THA_SDK_STATUS.userRole;
        
        if (!window.THA_Utils.hasAccess(currentPath)) {
            switch (role) {
                case 'anonymous':
                    window.location.href = '/pages/auth/register.html';
                    break;
                case 'registered':
                    window.location.href = '/pages/dashboard/index.html';
                    break;
                case 'subscribed':
                    window.location.href = '/pages/dashboard/index.html';
                    break;
                case 'admin':
                    window.location.href = '/pages/admin/dashboard.html';
                    break;
            }
        }
    },

    // Check if user is admin
    isAdmin: (email) => {
        const user = window.THA_SDK_STATUS.user;
        return user && (user.is_admin || user.role === 'admin');
    },

    // Simple authentication check
    simpleAuth: async (email, password) => {
        const { admin } = window.THA_CONFIG;
        
        if (email === admin.email && password === admin.password) {
            return {
                success: true,
                isAdmin: true,
                user: { email, role: 'admin' }
            };
        }
        
        return { success: false, error: 'Invalid credentials' };
    },

    // Listen for auth state changes
    onAuthStateChanged: (callback) => {
        window.THA_SDKManager.onAuthStateChanged(callback);
    },

    // Navigate to dashboard based on user role
    navigateToUserDashboard: () => {
        const role = window.THA_SDK_STATUS.userRole;
        
        switch (role) {
            case 'admin':
                window.location.href = '/pages/admin/dashboard.html';
                break;
            case 'subscribed':
            case 'registered':
                window.location.href = '/pages/dashboard/index.html';
                break;
            default:
                window.location.href = '/pages/auth/register.html';
        }
    }
};

// Initialize SDK Manager
window.THA_SDKManager = new THA_SDKManager();

// Add enhanced CSS for loading states
const style = document.createElement('style');
style.textContent = `
    .tha-loading {
        opacity: 0.6;
        pointer-events: none;
        position: relative;
    }
    
    .tha-loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #ccc;
        border-top-color: #007bff;
        border-radius: 50%;
        animation: tha-spin 1s linear infinite;
        z-index: 1000;
    }
    
    @keyframes tha-spin {
        to { transform: rotate(360deg); }
    }
    
    .tha-auth-gate {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-family: Arial, sans-serif;
    }
    
    .tha-auth-gate.hidden {
        display: none;
    }
    
    .tha-auth-message {
        text-align: center;
        background: #333;
        padding: 2rem;
        border-radius: 10px;
        max-width: 400px;
    }
    
    .tha-auth-message h2 {
        margin-bottom: 1rem;
        color: #4CAF50;
    }
    
    .tha-auth-message button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 1rem;
    }
`;
document.head.appendChild(style);

// Page protection system
window.THA_PageProtection = {
    init: () => {
        // Check access on page load
        window.addEventListener('load', () => {
            window.THA_Utils.redirectBasedOnRole();
        });
        
        // Monitor auth state changes
        window.THA_Utils.onAuthStateChanged(() => {
            window.THA_Utils.redirectBasedOnRole();
        });
    },
    
    // Show auth gate for protected content
    showAuthGate: (message = 'Please login to access this content') => {
        const gate = document.createElement('div');
        gate.className = 'tha-auth-gate';
        gate.innerHTML = `
            <div class="tha-auth-message">
                <h2>Authentication Required</h2>
                <p>${message}</p>
                <button onclick="window.location.href='/pages/auth/register.html'">
                    Create Account
                </button>
                <button onclick="window.location.href='/pages/auth/login.html'" style="margin-left: 1rem;">
                    Login
                </button>
            </div>
        `;
        document.body.appendChild(gate);
    }
};

// Initialize page protection
window.THA_PageProtection.init();

console.log('✅ Universal SDK Configuration V2 Loaded');

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { THA_CONFIG: window.THA_CONFIG, THA_Utils: window.THA_Utils };
}
