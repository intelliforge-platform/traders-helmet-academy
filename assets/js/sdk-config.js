/**
 * Refactored SDK Configuration for Traders Helmet Academy
 * Using Firebase for Authentication only
 * File: /assets/js/sdk-config.js
 */

console.log('🚀 Loading THA SDK Configuration V2...');

// NEW Configuration with your credentials
window.THA_CONFIG = {
    supabase: {
        url: 'https://xhaohziyrlwminomymbm.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYW9oeml5cmx3bWlub215bWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjQ0MjksImV4cCI6MjA2ODI0MDQyOX0.kZhRd5kR0DniH2dG-El6bKyWjdTe3orkmUBR-iPyEwA'
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
        anonymousAccess: ['/', '/about', '/contact', '/pages/auth/register.html', '/pages/auth/login.html', '/pages/auth/forgot-password.html'],
        registeredUserAccess: ['/pages/dashboard', '/pages/subscription', '/pages/profile', '/pages/settings'],
        subscribedUserAccess: ['/pages/academy', '/pages/signals', '/pages/premium', '/pages/live-trading'],
        adminAccess: ['/pages/admin', '/pages/admin/users', '/pages/admin/settings']
    }
};

// Log config for debugging
console.log('📋 THA_CONFIG loaded:', {
    hasConfig: true,
    hasUserFlow: true,
    userFlowKeys: Object.keys(window.THA_CONFIG.userFlow),
    anonymousRoutes: window.THA_CONFIG.userFlow.anonymousAccess.length,
    firebaseConfigured: !!window.THA_CONFIG.firebase.apiKey
});

// Global SDK status
window.THA_SDK_STATUS = {
    firebase: false,
    supabase: false,
    loading: true,
    user: null,
    userRole: 'anonymous',
    error: null,
    initialized: false
};

// Enhanced SDK Loading Manager
class THA_SDKManager {
    constructor() {
        this.loadAttempts = 0;
        this.maxAttempts = 3;
        this.listeners = [];
        this.authListeners = [];
        this.initialized = false;
        this.init();
    }

    // Add listener for when SDKs are ready
    onReady(callback) {
        if (typeof callback !== 'function') return;
        
        if (!window.THA_SDK_STATUS.loading) {
            try { callback(window.THA_SDK_STATUS); } catch (e) {}
        } else {
            this.listeners.push(callback);
        }
    }

    // Add listener for auth state changes
    onAuthStateChanged(callback) {
        if (typeof callback === 'function') {
            this.authListeners.push(callback);
        }
    }

    // Notify all listeners
    notifyListeners() {
        const status = window.THA_SDK_STATUS;
        this.listeners.forEach(callback => {
            try { callback(status); } catch (error) {
                console.error('SDK ready callback error:', error);
            }
        });
        this.listeners = [];
    }

    // Notify auth listeners
    notifyAuthListeners(user) {
        this.authListeners.forEach(callback => {
            try { callback(user); } catch (error) {
                console.error('Auth callback error:', error);
            }
        });
    }

    // Initialize SDKs
    async init() {
        console.log('🔧 THA SDK Manager V2 initializing...');
        
        try {
            // Load Firebase first (primary auth)
            await this.loadFirebase();
            
            // Then load Supabase (optional data layer)
            await this.loadSupabase();
            
            // Initialize auth state monitoring
            this.initAuthStateMonitoring();
            
        } catch (error) {
            console.error('SDK initialization error:', error);
            window.THA_SDK_STATUS.error = error.message;
        } finally {
            window.THA_SDK_STATUS.loading = false;
            window.THA_SDK_STATUS.initialized = true;
            this.notifyListeners();
            console.log('✅ THA SDK Manager V2 ready:', {
                firebase: window.THA_SDK_STATUS.firebase,
                supabase: window.THA_SDK_STATUS.supabase,
                userRole: window.THA_SDK_STATUS.userRole
            });
        }
    }

    // Load Firebase with proper error handling
    async loadFirebase() {
        console.log('🔄 Loading Firebase...');

        // Check if Firebase Auth Service already loaded
        if (window.FirebaseAuthService) {
            window.THA_SDK_STATUS.firebase = true;
            console.log('✅ Firebase already loaded via FirebaseAuthService');
            return true;
        }

        // Try to load from our Firebase Auth module
        try {
            // Import the Firebase auth module dynamically
            const module = await import('./firebase-auth.js');
            
            // Initialize Firebase
            if (module.initializeFirebaseAuth) {
                window.firebaseAuth = module.initializeFirebaseAuth(window.THA_CONFIG.firebase);
                window.THA_SDK_STATUS.firebase = true;
                console.log('✅ Firebase loaded from module');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Could not load Firebase module:', error.message);
        }

        console.warn('⚠️ Firebase not available - authentication will be limited');
        window.THA_SDK_STATUS.firebase = false;
        return false;
    }

    // Load Supabase with error handling
    async loadSupabase() {
        console.log('🔄 Loading Supabase...');

        // Check if Supabase already loaded
        if (window.supabaseClient) {
            window.THA_SDK_STATUS.supabase = true;
            console.log('✅ Supabase client already exists');
            return true;
        }

        // Check if Supabase SDK is available
        if (typeof window.supabase !== 'undefined') {
            try {
                window.supabaseClient = window.supabase.createClient(
                    window.THA_CONFIG.supabase.url,
                    window.THA_CONFIG.supabase.key
                );
                window.THA_SDK_STATUS.supabase = true;
                console.log('✅ Supabase ready');
                return true;
            } catch (error) {
                console.warn('⚠️ Supabase init failed:', error.message);
            }
        }

        // Create fallback client
        this.createFallbackSupabaseClient();
        return window.THA_SDK_STATUS.supabase;
    }

    // Create fallback Supabase client
    createFallbackSupabaseClient() {
        window.supabaseClient = {
            auth: {
                getUser: async () => {
                    const user = window.THA_SDK_STATUS.user;
                    return { data: { user }, error: null };
                },
                signUp: async () => ({ data: null, error: { message: 'Supabase not available' } }),
                signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not available' } }),
                signOut: async () => {
                    if (window.firebaseAuth) {
                        await window.firebaseAuth.signOut();
                    }
                    return { error: null };
                }
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({ data: null, error: null }),
                        limit: () => ({
                            order: () => ({
                                range: async () => ({ data: [], error: null })
                            })
                        })
                    }),
                    order: () => ({
                        limit: () => ({
                            range: async () => ({ data: [], error: null })
                        })
                    })
                }),
                insert: async () => ({ data: null, error: null }),
                update: () => ({
                    eq: () => ({
                        select: async () => ({ data: null, error: null })
                    })
                })
            })
        };

        window.THA_SDK_STATUS.supabase = true;
        console.log('✅ Fallback Supabase client ready');
    }

    // Initialize auth state monitoring
    initAuthStateMonitoring() {
        // Use FirebaseAuthService if available
        if (window.firebaseAuth && typeof window.firebaseAuth.onAuthStateChange === 'function') {
            window.firebaseAuth.onAuthStateChange((user) => {
                this.handleAuthStateChange(user);
            });
            console.log('📡 Using FirebaseAuthService for auth monitoring');
        } 
        // Fallback to session storage
        else {
            this.checkStoredSession();
            console.log('📡 Using session storage for auth monitoring');
        }
    }

    // Handle auth state changes
    async handleAuthStateChange(user) {
        if (user) {
            // Convert Firebase user to our format
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0],
                emailVerified: user.emailVerified,
                photoURL: user.photoURL,
                is_admin: user.email === window.THA_CONFIG.admin.email,
                role: user.email === window.THA_CONFIG.admin.email ? 'admin' : 'registered',
                subscription_status: 'inactive' // Default, update from your DB
            };

            window.THA_SDK_STATUS.user = userData;
            window.THA_SDK_STATUS.userRole = this.getUserRole(userData);
            
            // Store in localStorage for persistence
            try {
                localStorage.setItem('tha_user', JSON.stringify(userData));
            } catch (e) {}
            
            console.log('✅ User authenticated:', userData.email, 'Role:', window.THA_SDK_STATUS.userRole);
        } else {
            window.THA_SDK_STATUS.user = null;
            window.THA_SDK_STATUS.userRole = 'anonymous';
            try {
                localStorage.removeItem('tha_user');
            } catch (e) {}
            
            console.log('👋 User logged out');
        }
        
        this.notifyAuthListeners(window.THA_SDK_STATUS.user);
    }

    // Check for stored session
    checkStoredSession() {
        try {
            const storedUser = localStorage.getItem('tha_user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                window.THA_SDK_STATUS.user = userData;
                window.THA_SDK_STATUS.userRole = this.getUserRole(userData);
                console.log('✅ Restored user session:', userData.email);
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            try { localStorage.removeItem('tha_user'); } catch (e) {}
        }
    }

    // Determine user role
    getUserRole(userData) {
        if (!userData) return 'anonymous';
        if (userData.is_admin || userData.role === 'admin') return 'admin';
        if (userData.subscription_status === 'active') return 'subscribed';
        if (userData.emailVerified) return 'registered';
        return 'anonymous';
    }
}

// Enhanced utility functions with SAFE access checks
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

    // Get current user (SAFE)
    getCurrentUser: () => {
        return window.THA_SDK_STATUS?.user || null;
    },

    // Get user role (SAFE)
    getUserRole: () => {
        return window.THA_SDK_STATUS?.userRole || 'anonymous';
    },

    // Check if user has access to route (FIXED - with path matching)
    hasAccess: (route) => {
        // SAFE: Check if SDK status exists
        if (!window.THA_SDK_STATUS) {
            console.warn('SDK status not available');
            return false;
        }
        
        const role = window.THA_SDK_STATUS.userRole || 'anonymous';
        
        // SAFE: Ensure userFlow config exists with defaults
        if (!window.THA_CONFIG) {
            console.warn('THA_CONFIG not available');
            return role === 'admin';
        }
        
        if (!window.THA_CONFIG.userFlow) {
            console.warn('userFlow config missing, using defaults');
            window.THA_CONFIG.userFlow = {
                anonymousAccess: ['/', '/about', '/contact', '/pages/auth/register.html', '/pages/auth/login.html', '/pages/auth/forgot-password.html'],
                registeredUserAccess: ['/pages/dashboard', '/pages/subscription', '/pages/profile', '/pages/settings'],
                subscribedUserAccess: ['/pages/academy', '/pages/signals', '/pages/premium', '/pages/live-trading'],
                adminAccess: ['/pages/admin']
            };
        }
        
        const config = window.THA_CONFIG.userFlow;
        
        // Admins have access to everything
        if (role === 'admin') return true;
        
        // Check if route matches any allowed paths for the role
        const checkPathMatch = (allowedPaths) => {
            if (!allowedPaths || !Array.isArray(allowedPaths)) return false;
            return allowedPaths.some(path => route.startsWith(path));
        };
        
        // Check access based on role
        switch (role) {
            case 'subscribed':
                // Subscribed users can access everything except admin
                return !checkPathMatch(config.adminAccess);
            case 'registered':
                // Registered users can access anonymous + registered routes
                return checkPathMatch(config.anonymousAccess) || 
                       checkPathMatch(config.registeredUserAccess);
            case 'anonymous':
                // Anonymous users can only access anonymous routes
                return checkPathMatch(config.anonymousAccess);
            default:
                return false;
        }
    },

    // Redirect based on user role (FIXED - with null checks)
    redirectBasedOnRole: (currentPath = window.location.pathname) => {
        // SAFE: Check if SDK status exists
        if (!window.THA_SDK_STATUS) {
            console.warn('SDK status not available, cannot redirect');
            return;
        }
        
        // Don't redirect if SDK is still loading
        if (window.THA_SDK_STATUS.loading) {
            console.log('⏳ SDK still loading, delaying redirect check');
            setTimeout(() => window.THA_Utils.redirectBasedOnRole(currentPath), 500);
            return;
        }
        
        const role = window.THA_SDK_STATUS.userRole || 'anonymous';
        
        try {
            if (!window.THA_Utils.hasAccess(currentPath)) {
                console.log(`🔄 Redirecting user (role: ${role}) from ${currentPath}`);
                
                switch (role) {
                    case 'anonymous':
                        if (!currentPath.includes('/auth/')) {
                            window.location.href = '/pages/auth/register.html';
                        }
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
        } catch (error) {
            console.error('Redirect error:', error);
        }
    },

    // Simple authentication check (for admin)
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

    // Listen for auth state changes (SAFE)
    onAuthStateChanged: (callback) => {
        if (window.THA_SDKManager && typeof callback === 'function') {
            window.THA_SDKManager.onAuthStateChanged(callback);
        }
    },

    // Navigate to dashboard based on user role
    navigateToUserDashboard: () => {
        const role = window.THA_Utils.getUserRole();
        
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

// Page protection system
window.THA_PageProtection = {
    init: () => {
        // Check access on page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                window.THA_Utils.redirectBasedOnRole();
            }, 1000); // Increased delay to ensure SDK is ready
        });
        
        // Monitor auth state changes
        window.THA_Utils.onAuthStateChanged(() => {
            window.THA_Utils.redirectBasedOnRole();
        });
    },
    
    // Show auth gate for protected content
    showAuthGate: (message = 'Please login to access this content') => {
        // Don't show if already on auth pages
        if (window.location.pathname.includes('/auth/')) return;
        
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

// Add CSS for loading states
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
        margin-right: 0.5rem;
    }
    
    .tha-auth-message button:last-child {
        margin-right: 0;
    }
`;
document.head.appendChild(style);

// Initialize page protection after a delay
setTimeout(() => {
    window.THA_PageProtection.init();
}, 100);

console.log('✅ Universal SDK Configuration V2 Loaded');
