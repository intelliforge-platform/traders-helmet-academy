// Universal SDK Configuration for Traders Helmet Academy
// Save this file as: /assets/js/sdk-config.js
// Include this file in ALL your HTML pages

(function() {
    'use strict';

    // Configuration with your NEW credentials
    const CONFIG = {
        firebase: {
            apiKey: "AIzaSyCDyE5mNCy6DWAfCfih17dk2g7XI-1_-O8",
            authDomain: "thacadmey.firebaseapp.com",
            projectId: "thacadmey",
            storageBucket: "thacadmey.firebasestorage.app",
            messagingSenderId: "444072890604",
            appId: "1:444072890604:web:YOUR_APP_ID"
        },
        supabase: {
            url: "https://xhaohziyrlwminomymbm.supabase.co",
            anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYW9oeml5cmx3bWlub215bWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjQ0MjksImV4cCI6MjA2ODI0MDQyOX0.kZhRd5kR0DniH2dG-El6bKyWjdTe3orkmUBR-iPyEwA"
        }
    };

    // Debug information
    window.SDK_DEBUG = {
        firebase: false,
        supabase: false,
        errors: []
    };

    // Utility function to show debug info
    function showDebugInfo() {
        const debugElement = document.getElementById('debugInfo');
        if (debugElement) {
            const debugHtml = `
                <div style="background: rgba(0,0,0,0.8); color: #fff; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-family: monospace; font-size: 0.9rem;">
                    <h4>🔧 Debug Information:</h4>
                    ${window.SDK_DEBUG.firebase ? '✅' : '❌'} Firebase SDK: ${window.SDK_DEBUG.firebase ? 'Available' : 'Not Available'}<br>
                    ${window.SDK_DEBUG.supabase ? '✅' : '❌'} Supabase SDK: ${window.SDK_DEBUG.supabase ? 'Available' : 'Not Available'}<br>
                    ${window.SDK_DEBUG.errors.length > 0 ? `❌ Errors: ${window.SDK_DEBUG.errors.join(', ')}` : '✅ No Errors'}
                </div>
            `;
            debugElement.innerHTML = debugHtml;
        }
    }

    // Initialize Firebase
    function initializeFirebase() {
        return new Promise((resolve) => {
            // Try multiple CDN sources
            const firebaseScripts = [
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
            ];

            let loadedCount = 0;
            let failed = false;

            firebaseScripts.forEach((src) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === firebaseScripts.length && !failed) {
                        initFirebaseApp();
                    }
                };
                script.onerror = () => {
                    if (!failed) {
                        failed = true;
                        console.error('Firebase CDN failed, using fallback');
                        window.SDK_DEBUG.errors.push('Firebase CDN failed');
                        initFirebaseFallback();
                        resolve();
                    }
                };
                document.head.appendChild(script);
            });

            function initFirebaseApp() {
                try {
                    if (typeof firebase !== 'undefined') {
                        firebase.initializeApp(CONFIG.firebase);
                        
                        // Create auth wrapper
                        window.firebaseAuth = {
                            createUser: async (email, password, displayName) => {
                                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                                if (displayName) {
                                    await userCredential.user.updateProfile({ displayName });
                                }
                                return userCredential;
                            },
                            signIn: async (email, password) => {
                                return await firebase.auth().signInWithEmailAndPassword(email, password);
                            },
                            signOut: async () => {
                                return await firebase.auth().signOut();
                            },
                            getCurrentUser: () => {
                                return firebase.auth().currentUser;
                            },
                            onAuthStateChanged: (callback) => {
                                return firebase.auth().onAuthStateChanged(callback);
                            },
                            signInWithGoogle: async () => {
                                const provider = new firebase.auth.GoogleAuthProvider();
                                return await firebase.auth().signInWithPopup(provider);
                            }
                        };
                        
                        window.SDK_DEBUG.firebase = true;
                        console.log('✅ Firebase initialized successfully');
                        showDebugInfo();
                        resolve();
                    }
                } catch (error) {
                    console.error('Firebase initialization error:', error);
                    window.SDK_DEBUG.errors.push('Firebase init failed');
                    initFirebaseFallback();
                    resolve();
                }
            }

            function initFirebaseFallback() {
                // Manual fallback for Firebase
                window.firebaseAuth = {
                    createUser: async (email, password, displayName) => {
                        throw new Error('Firebase not available. Please contact support.');
                    },
                    signIn: async (email, password) => {
                        // Fallback to manual authentication via Supabase
                        if (window.supabase) {
                            const { data, error } = await window.supabase.auth.signInWithPassword({
                                email,
                                password
                            });
                            if (error) throw error;
                            return { user: data.user };
                        }
                        throw new Error('Authentication not available. Please contact support.');
                    },
                    signOut: async () => {
                        if (window.supabase) {
                            return await window.supabase.auth.signOut();
                        }
                    },
                    getCurrentUser: () => null,
                    onAuthStateChanged: () => {},
                    signInWithGoogle: async () => {
                        throw new Error('Google sign-in not available. Please use email/password.');
                    }
                };
                console.log('🔄 Firebase fallback initialized');
                showDebugInfo();
            }

            // Timeout fallback
            setTimeout(() => {
                if (!window.SDK_DEBUG.firebase) {
                    initFirebaseFallback();
                    resolve();
                }
            }, 10000);
        });
    }

    // Initialize Supabase
    function initializeSupabase() {
        return new Promise((resolve) => {
            // Try to load Supabase
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            
            script.onload = () => {
                try {
                    if (typeof supabase !== 'undefined') {
                        window.supabase = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
                        window.SDK_DEBUG.supabase = true;
                        console.log('✅ Supabase initialized successfully');
                        
                        // Test connection
                        testSupabaseConnection();
                        showDebugInfo();
                        resolve();
                    }
                } catch (error) {
                    console.error('Supabase initialization error:', error);
                    window.SDK_DEBUG.errors.push('Supabase init failed');
                    initSupabaseFallback();
                    resolve();
                }
            };
            
            script.onerror = () => {
                console.error('Supabase CDN failed');
                window.SDK_DEBUG.errors.push('Supabase CDN failed');
                initSupabaseFallback();
                resolve();
            };
            
            document.head.appendChild(script);

            async function testSupabaseConnection() {
                try {
                    const { data, error } = await window.supabase
                        .from('user_profiles')
                        .select('count(*)')
                        .limit(1);
                        
                    if (error) {
                        console.log('🔧 Database verification failed:', error.message);
                        window.SDK_DEBUG.errors.push('DB connection failed');
                    } else {
                        console.log('✅ Database connection verified');
                    }
                    showDebugInfo();
                } catch (error) {
                    console.log('🔧 Database verification failed:', error.message);
                    window.SDK_DEBUG.errors.push('DB verification failed');
                    showDebugInfo();
                }
            }

            function initSupabaseFallback() {
                // Manual fallback
                window.supabase = {
                    from: () => ({
                        select: () => Promise.resolve({ data: [], error: null }),
                        insert: () => Promise.resolve({ data: null, error: new Error('Database not available') }),
                        update: () => Promise.resolve({ data: null, error: new Error('Database not available') }),
                        delete: () => Promise.resolve({ data: null, error: new Error('Database not available') })
                    }),
                    auth: {
                        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Auth not available') }),
                        signOut: () => Promise.resolve({ error: null }),
                        getUser: () => Promise.resolve({ data: { user: null }, error: null })
                    }
                };
                console.log('🔄 Supabase fallback initialized');
                showDebugInfo();
            }

            // Timeout fallback
            setTimeout(() => {
                if (!window.SDK_DEBUG.supabase) {
                    initSupabaseFallback();
                    resolve();
                }
            }, 10000);
        });
    }

    // Initialize everything when DOM is ready
    function initialize() {
        console.log('🔄 Initializing SDK Configuration...');
        
        Promise.all([
            initializeFirebase(),
            initializeSupabase()
        ]).then(() => {
            console.log('✅ SDK initialization complete');
            
            // Trigger custom event for pages to know SDKs are ready
            window.dispatchEvent(new CustomEvent('sdksReady', {
                detail: {
                    firebase: window.SDK_DEBUG.firebase,
                    supabase: window.SDK_DEBUG.supabase,
                    errors: window.SDK_DEBUG.errors
                }
            }));
            
            showDebugInfo();
        });
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose configuration for other scripts
    window.TRADERS_HELMET_CONFIG = CONFIG;

})();