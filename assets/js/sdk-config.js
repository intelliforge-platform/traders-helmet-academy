// Save this file as: /assets/js/sdk-config.js
// Universal SDK Configuration for Traders Helmet Academy

(function() {
    'use strict';

    console.log('🔄 Loading Traders Helmet SDK Configuration...');

    // Your NEW Firebase Configuration
    const CONFIG = {
        firebase: {
          apiKey: "AIzaSyCHdhs1wQxyslO7ecotTiqKyc9fH-cJI1k",
          authDomain: "traders-helmet-academy.firebaseapp.com",
          projectId: "traders-helmet-academy",
          storageBucket: "traders-helmet-academy.firebasestorage.app",
          messagingSenderId: "789631387729",
          appId: "1:789631387729:web:d1f176bcc091ec40c75070",
          measurementId: "G-QBB3Z50V5H"
        },
        supabase: {
            url: "https://xhaohziyrlwminomymbm.supabase.co",
            anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYW9oeml5cmx3bWlub215bWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjQ0MjksImV4cCI6MjA2ODI0MDQyOX0.kZhRd5kR0DniH2dG-El6bKyWjdTe3orkmUBR-iPyEwA"
        }
    };

    // Debug tracking
    window.SDK_DEBUG = {
        firebase: false,
        supabase: false,
        errors: []
    };

    // Initialize Firebase
    function initFirebase() {
        return new Promise((resolve) => {
            console.log('🔄 Initializing Firebase...');
            
            // Load Firebase scripts
            const scripts = [
                'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js'
            ];

            let loadedCount = 0;
            
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === scripts.length) {
                        try {
                            firebase.initializeApp(CONFIG.firebase);
                            
                            // Create Firebase auth wrapper
                            window.firebaseAuth = {
                                createUser: async (email, password, displayName) => {
                                    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                                    if (displayName) {
                                        await userCredential.user.updateProfile({ displayName });
                                    }
                                    await firebase.auth().currentUser.sendEmailVerification();
                                    return userCredential;
                                },
                                getCurrentUser: () => firebase.auth().currentUser,
                                signOut: () => firebase.auth().signOut()
                            };
                            
                            window.SDK_DEBUG.firebase = true;
                            console.log('✅ Firebase initialized successfully');
                            resolve();
                        } catch (error) {
                            console.error('❌ Firebase initialization failed:', error);
                            window.SDK_DEBUG.errors.push('Firebase init failed: ' + error.message);
                            resolve();
                        }
                    }
                };
                script.onerror = () => {
                    console.error('❌ Failed to load Firebase script:', src);
                    window.SDK_DEBUG.errors.push('Firebase script load failed');
                    resolve();
                };
                document.head.appendChild(script);
            });
        });
    }

    // Initialize Supabase
    function initSupabase() {
        return new Promise((resolve) => {
            console.log('🔄 Initializing Supabase...');
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            script.onload = () => {
                try {
                    window.supabase = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
                    window.SDK_DEBUG.supabase = true;
                    console.log('✅ Supabase initialized successfully');
                    resolve();
                } catch (error) {
                    console.error('❌ Supabase initialization failed:', error);
                    window.SDK_DEBUG.errors.push('Supabase init failed: ' + error.message);
                    resolve();
                }
            };
            script.onerror = () => {
                console.error('❌ Failed to load Supabase script');
                window.SDK_DEBUG.errors.push('Supabase script load failed');
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    // Initialize everything
    async function initialize() {
        try {
            await Promise.all([initFirebase(), initSupabase()]);
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('sdksReady', {
                detail: {
                    firebase: window.SDK_DEBUG.firebase,
                    supabase: window.SDK_DEBUG.supabase,
                    errors: window.SDK_DEBUG.errors
                }
            }));
            
            console.log('✅ SDK Configuration Complete', window.SDK_DEBUG);
        } catch (error) {
            console.error('❌ SDK initialization failed:', error);
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose config globally
    window.TRADERS_HELMET_CONFIG = CONFIG;

    console.log('✅ SDK Configuration Loaded');

})();
