/**
 * THA Auth v3.0 — Single Source of Truth
 * Traders Helmet Academy
 *
 * Drop this ONE file into /assets/js/tha-auth.js
 * Load on every page as: <script type="module" src="/assets/js/tha-auth.js"></script>
 *
 * Exposes globals:
 *   window.firebaseAuth  — all auth operations
 *   window.supabase      — direct Supabase client
 *   window.THA_CONFIG    — shared config
 *
 * Dispatches events when ready:
 *   'tha-auth-ready'
 *   'sdksReady'
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    applyActionCode,
    reload,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Configuration ────────────────────────────────────────────────────────────

const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCHdhs1wQxyslO7ecotTiqKyc9fH-cJI1k",
    authDomain:        "traders-helmet-academy.firebaseapp.com",
    projectId:         "traders-helmet-academy",
    storageBucket:     "traders-helmet-academy.firebasestorage.app",
    messagingSenderId: "789631387729",
    appId:             "1:789631387729:web:d1f176bcc091ec40c75070",
    measurementId:     "G-QBB3Z50V5H"
};

const SUPABASE_URL = 'https://xhaohziyrlwminomymbm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYW9oeml5cmx3bWlub215bWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjQ0MjksImV4cCI6MjA2ODI0MDQyOX0.kZhRd5kR0DniH2dG-El6bKyWjdTe3orkmUBR-iPyEwA';

// ─── Initialize SDKs ──────────────────────────────────────────────────────────

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = createClient(SUPABASE_URL, SUPABASE_KEY);

// Expose for direct use by any page script
window.supabase   = db;
window.THA_CONFIG = {
    firebase: FIREBASE_CONFIG,
    supabase: { url: SUPABASE_URL, key: SUPABASE_KEY }
};

console.log('🔥 THA Auth v3.0 — Firebase + Supabase initialized');

// ─── Supabase Helpers ─────────────────────────────────────────────────────────

async function createUserProfile(uid, data) {
    const { error } = await db.from('user_profiles').insert({
        id:                  uid,
        first_name:          data.firstName  || '',
        last_name:           data.lastName   || '',
        email:               data.email,
        phone:               data.phone      || null,
        referral_code:       data.referralCode || null,
        subscription_tier:   'none',
        subscription_status: 'inactive',
        email_verified:      false,
        created_at:          new Date().toISOString()
    });
    if (error) console.error('❌ Supabase profile insert error:', error.message);
    return !error;
}

async function getUserProfile(uid) {
    const { data, error } = await db
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .single();
    if (error) {
        console.warn('⚠️ getUserProfile not found for uid:', uid, '—', error.message);
        return null;
    }
    return data;
}

async function markEmailVerified(uid) {
    const { error } = await db
        .from('user_profiles')
        .update({ email_verified: true })
        .eq('id', uid);
    if (error) console.error('❌ markEmailVerified error:', error.message);
    return !error;
}

// ─── Tier → Dashboard URL ─────────────────────────────────────────────────────

function getTierDashboardUrl(tier, role) {
    if (role === 'admin') return '/pages/admin/dashboard.html';
    const urls = {
        gold:     '/pages/dashboard/gold.html',
        platinum: '/pages/dashboard/platinum.html',
        diamond:  '/pages/dashboard/diamond.html'
    };
    // If tier is set but no specific URL exists, fall back to general dashboard
    return urls[tier] || '/pages/dashboard/index.html';
}

// ─── Human-Readable Firebase Error Messages ───────────────────────────────────

function firebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'An account with this email already exists. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please check or create a new account.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Incorrect password. Please try again or reset your password.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please wait a few minutes and try again.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/expired-action-code':
            return 'This verification link has expired. Please request a new one.';
        case 'auth/invalid-action-code':
            return 'This verification link is invalid or has already been used.';
        default:
            return error.message || 'An unexpected error occurred. Please try again.';
    }
}

// ─── Public API (window.firebaseAuth) ────────────────────────────────────────

window.firebaseAuth = {

    /**
     * Register a new user.
     * Creates Firebase auth user + Supabase user_profiles row + sends verification email.
     * @returns {success: bool, user: {id, email}, message: string}
     */
    register: async (email, password, profile = {}) => {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const user = cred.user;

            // Set display name in Firebase
            const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
            if (displayName) await updateProfile(user, { displayName });

            // Send verification email
            await sendEmailVerification(user);

            // Write profile row to Supabase
            await createUserProfile(user.uid, { ...profile, email });

            console.log('✅ Registration complete:', email);
            return { success: true, user: { id: user.uid, email: user.email } };

        } catch (error) {
            console.error('❌ Registration error:', error.code, error.message);
            return { success: false, message: firebaseErrorMessage(error) };
        }
    },

    /**
     * Sign in with email and password.
     * Returns raw Firebase UserCredential — caller handles redirect.
     */
    login: async (email, password) => {
        return await signInWithEmailAndPassword(auth, email, password);
    },

    /**
     * Sign out from Firebase (and optionally Supabase).
     */
    signOut: async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.warn('signOut error:', e.message);
        }
        window.location.href = '/';
    },

    /**
     * Send a password reset email.
     */
    resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email);
    },

    /**
     * Resend verification email to the currently signed-in user.
     */
    resendVerification: async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('No user is currently signed in.');
        await sendEmailVerification(user);
    },

    /**
     * Apply a Firebase email verification action code (from the link in the email).
     * Also marks email_verified = true in Supabase.
     */
    applyVerification: async (actionCode) => {
        await applyActionCode(auth, actionCode);
        const user = auth.currentUser;
        if (user) {
            await reload(user);
            await markEmailVerified(user.uid);
        }
    },

    /**
     * Reload the current user's auth state (refreshes emailVerified, etc.).
     */
    reloadUser: async () => {
        const user = auth.currentUser;
        if (user) await reload(user);
        return auth.currentUser;
    },

    /**
     * Get the currently signed-in Firebase user (or null).
     */
    getCurrentUser: () => auth.currentUser,

    /**
     * Fetch the user's full profile from Supabase.
     * @returns {Object|null} user_profiles row
     */
    getUserProfile: (uid) => getUserProfile(uid),

    /**
     * Get user's subscription tier from Supabase.
     * @returns {string} e.g. 'gold', 'platinum', 'diamond', 'none'
     */
    getUserTier: async (uid) => {
        const profile = await getUserProfile(uid);
        return profile?.subscription_tier || 'none';
    },

    /**
     * Check if user has an active subscription.
     * @returns {boolean}
     */
    isSubscribed: async (uid) => {
        const profile = await getUserProfile(uid);
        return profile?.subscription_status === 'active' &&
               profile?.subscription_tier !== 'none';
    },

    /**
     * Get the correct dashboard URL for a user's tier.
     */
    getTierDashboardUrl,

    /**
     * Listen for Firebase auth state changes.
     * @param {Function} callback - called with (user | null)
     */
    onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),

    /**
     * Google OAuth sign-in via popup.
     */
    signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        return await signInWithPopup(auth, provider);
    },

    /**
     * Convert a Firebase error to a human-readable message.
     */
    errorMessage: firebaseErrorMessage
};

// ─── Sync Auth State → Global Status Object ──────────────────────────────────
// sdk-config.js used THA_SDK_STATUS — we keep that shape for dashboard compatibility

window.THA_SDK_STATUS = {
    firebase:    true,
    supabase:    true,
    loading:     false,
    initialized: true,
    user:        null,
    userRole:    'anonymous'
};

onAuthStateChanged(auth, (user) => {
    window.THA_SDK_STATUS.user    = user;
    window.THA_SDK_STATUS.loading = false;
    console.log('🔄 Auth state:', user ? `signed in as ${user.email}` : 'signed out');
});

// ─── Fire Ready Events ────────────────────────────────────────────────────────
// Both events cover all existing listener patterns across the codebase

window.dispatchEvent(new CustomEvent('tha-auth-ready'));
window.dispatchEvent(new CustomEvent('sdksReady'));

console.log('✅ THA Auth v3.0 ready — window.firebaseAuth and window.supabase available');