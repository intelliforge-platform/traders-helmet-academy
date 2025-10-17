/**
 * firebase-auth.js
 * Traders Helmet Academy – Self-Hosted Firebase Auth (CSP-Safe)
 * ---------------------------------------------------------------
 * Depends on: window.THA_CONFIG.firebase (from /assets/js/config.js)
 * Loads Firebase from /assets/vendor/firebase/ (local copies only)
 */

import { initializeApp } from '../vendor/firebase/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from '../vendor/firebase/firebase-auth.js';

/* ---------------------------------------------------------------
   🚀 Initialize Firebase
---------------------------------------------------------------- */
export function initFirebase() {
  try {
    if (!window.THA_CONFIG?.firebase) {
      console.error('❌ Firebase config missing in window.THA_CONFIG');
      return null;
    }

    const app = initializeApp(window.THA_CONFIG.firebase);
    const auth = getAuth(app);
    console.log('🔥 Firebase initialized successfully (self-hosted)');
    return auth;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    return null;
  }
}

/* ---------------------------------------------------------------
   👤 Firebase Authentication Services
---------------------------------------------------------------- */
export const FirebaseAuthService = {
  async register(auth, email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(userCredential.user, { displayName });
    await sendEmailVerification(userCredential.user);
    return userCredential;
  },

  async login(auth, email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async signInWithGoogle(auth) {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  }
};
