/**
 * THA Auth v3.1 — Traders Helmet Academy
 * Phase 2: Admin activation, payment submissions, user management
 * Deploy to: /assets/js/tha-auth.js
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendEmailVerification, sendPasswordResetEmail, onAuthStateChanged,
    signOut, applyActionCode, reload, updateProfile,
    GoogleAuthProvider, signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── Config ───────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCHdhs1wQxyslO7ecotTiqKyc9fH-cJI1k",
    authDomain:        "traders-helmet-academy.firebaseapp.com",
    projectId:         "traders-helmet-academy",
    storageBucket:     "traders-helmet-academy.firebasestorage.app",
    messagingSenderId: "789631387729",
    appId:             "1:789631387729:web:d1f176bcc091ec40c75070"
};
const SUPABASE_URL = 'https://evtghlwiiqvclnudiyor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dGdobHdpaXF2Y2xudWRpeW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjYzNjgsImV4cCI6MjA4ODIwMjM2OH0.q93SKjmo_8R8AVyAZXtcNxUFH1ntjCkL7g4no6yfGpg';
const ADMIN_EMAIL  = 'admin@tradershelmetacademy.com';

// ─── Init ─────────────────────────────────────────────────────────────────────
const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabase   = db;
window.THA_CONFIG = { ADMIN_EMAIL };

// ─── Error Messages ───────────────────────────────────────────────────────────
function fErr(e) {
    const map = {
        'auth/email-already-in-use':  'An account with this email already exists.',
        'auth/invalid-email':         'Please enter a valid email address.',
        'auth/weak-password':         'Password must be at least 6 characters.',
        'auth/user-not-found':        'No account found with this email.',
        'auth/wrong-password':        'Incorrect password. Please try again.',
        'auth/invalid-credential':    'Incorrect email or password.',
        'auth/user-disabled':         'This account has been disabled. Contact support.',
        'auth/too-many-requests':     'Too many attempts. Wait a few minutes and try again.',
        'auth/network-request-failed':'Network error. Check your connection.',
        'auth/popup-closed-by-user':  'Sign-in window closed. Please try again.',
        'auth/expired-action-code':   'This link has expired. Request a new one.',
        'auth/invalid-action-code':   'This link is invalid or has already been used.'
    };
    return map[e.code] || e.message || 'An unexpected error occurred.';
}

// ─── Supabase Helpers ─────────────────────────────────────────────────────────
async function getUserProfile(uid) {
    const { data } = await db.from('user_profiles').select('*').eq('id', uid).single();
    return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────
window.firebaseAuth = {

    // AUTH
    register: async (email, password, profile = {}) => {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const user = cred.user;
            const displayName = `${profile.firstName||''} ${profile.lastName||''}`.trim();
            if (displayName) await updateProfile(user, { displayName });
            await sendEmailVerification(user);
            const { error } = await db.from('user_profiles').insert({
                id: user.uid, email,
                first_name:          profile.firstName   || '',
                last_name:           profile.lastName    || '',
                phone:               profile.phone       || null,
                referral_code:       profile.referralCode|| null,
                subscription_tier:   'none',
                subscription_status: 'inactive',
                admin_activated:     false,
                email_verified:      false,
                created_at:          new Date().toISOString()
            });
            if (error) console.error('Supabase insert error:', error.message);
            return { success: true, user: { id: user.uid, email: user.email } };
        } catch (e) { return { success: false, message: fErr(e) }; }
    },

    login: async (email, password) => signInWithEmailAndPassword(auth, email, password),

    signOut: async () => { try { await signOut(auth); } catch(e){} window.location.href = '/'; },

    resetPassword: async (email) => sendPasswordResetEmail(auth, email),

    resendVerification: async () => {
        if (!auth.currentUser) throw new Error('No user signed in.');
        await sendEmailVerification(auth.currentUser);
    },

    applyVerification: async (code) => {
        await applyActionCode(auth, code);
        if (auth.currentUser) {
            await reload(auth.currentUser);
            await db.from('user_profiles').update({ email_verified: true }).eq('id', auth.currentUser.uid);
        }
    },

    reloadUser: async () => { if (auth.currentUser) await reload(auth.currentUser); return auth.currentUser; },
    getCurrentUser: () => auth.currentUser,
    onAuthStateChange: (cb) => onAuthStateChanged(auth, cb),
    signInWithGoogle: async () => signInWithPopup(auth, new GoogleAuthProvider()),
    errorMessage: fErr,

    // PROFILE
    getUserProfile,
    getUserTier: async (uid) => { const p = await getUserProfile(uid); return p?.subscription_tier || 'none'; },
    isSubscribed: async (uid) => { const p = await getUserProfile(uid); return p?.subscription_status === 'active'; },
    isAdminEmail: (email) => email === ADMIN_EMAIL,

    getTierDashboardUrl: (tier) => ({
        gold:     '/pages/dashboard/gold.html',
        platinum: '/pages/dashboard/platinum.html',
        diamond:  '/pages/dashboard/diamond.html'
    }[tier] || '/pages/dashboard/index.html'),

    // ADMIN ACTIVATION
    isAdminActivated: async (uid, email) => {
        if (email === ADMIN_EMAIL) return true;
        const p = await getUserProfile(uid);
        return p?.admin_activated === true;
    },

    activateUser: async (uid, tier, adminEmail) => {
        const { error } = await db.from('user_profiles').update({
            admin_activated:     true,
            subscription_tier:   tier,
            subscription_status: 'active',
            activated_by:        adminEmail,
            activated_at:        new Date().toISOString(),
            deactivated_at:      null
        }).eq('id', uid);
        if (error) throw new Error(error.message);
        return true;
    },

    deactivateUser: async (uid, adminEmail) => {
        const { error } = await db.from('user_profiles').update({
            admin_activated:     false,
            subscription_status: 'inactive',
            deactivated_at:      new Date().toISOString(),
            activated_by:        adminEmail
        }).eq('id', uid);
        if (error) throw new Error(error.message);
        return true;
    },

    changeUserTier: async (uid, newTier, adminEmail) => {
        const { error } = await db.from('user_profiles').update({
            subscription_tier: newTier,
            activated_by:      adminEmail,
            activated_at:      new Date().toISOString()
        }).eq('id', uid);
        if (error) throw new Error(error.message);
        return true;
    },

    updateUserNotes: async (uid, notes) => {
        await db.from('user_profiles').update({ notes }).eq('id', uid);
    },

    // PAYMENT SUBMISSIONS
    submitPayment: async (uid, { tier, amount, method, proofReference, proofNotes }) => {
        const { data, error } = await db.from('payment_submissions').insert({
            user_id: uid, tier, amount,
            payment_method:  method,
            proof_reference: proofReference || null,
            proof_notes:     proofNotes     || null,
            status:          'pending',
            submitted_at:    new Date().toISOString()
        }).select().single();
        if (error) throw new Error(error.message);
        return data;
    },

    getUserPayments: async (uid) => {
        const { data } = await db.from('payment_submissions').select('*')
            .eq('user_id', uid).order('submitted_at', { ascending: false });
        return data || [];
    },

    // ADMIN: ALL DATA
    getAllUsers: async () => {
        const { data, error } = await db.from('user_profiles')
            .select('*').order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getAllPayments: async () => {
        const { data, error } = await db.from('payment_submissions')
            .select('*, user_profiles(first_name, last_name, email)')
            .order('submitted_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getPendingPayments: async () => {
        const { data, error } = await db.from('payment_submissions')
            .select('*, user_profiles(first_name, last_name, email)')
            .eq('status', 'pending').order('submitted_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    confirmPayment: async (submissionId, uid, tier, adminEmail) => {
        await db.from('payment_submissions').update({
            status: 'confirmed', reviewed_by: adminEmail, reviewed_at: new Date().toISOString()
        }).eq('id', submissionId);
        await window.firebaseAuth.activateUser(uid, tier, adminEmail);
        return true;
    },

    rejectPayment: async (submissionId, adminEmail, reason) => {
        await db.from('payment_submissions').update({
            status: 'rejected', reviewed_by: adminEmail,
            reviewed_at: new Date().toISOString(), rejection_reason: reason || null
        }).eq('id', submissionId);
        return true;
    }
};

// ─── Status Object (backward compat) ─────────────────────────────────────────
window.THA_SDK_STATUS = { firebase: true, supabase: true, loading: false, initialized: true };
onAuthStateChanged(auth, (user) => { window.THA_SDK_STATUS.user = user; });

// ─── Ready Events ─────────────────────────────────────────────────────────────
window.dispatchEvent(new CustomEvent('tha-auth-ready'));
window.dispatchEvent(new CustomEvent('sdksReady'));
console.log('✅ THA Auth v3.1 ready');
