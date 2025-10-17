/**
 * firebase-auth.js
 * Traders Helmet Academy – Self-Hosted + CDN Fallback Firebase Auth
 * ---------------------------------------------------------------
 * Depends on: window.THA_CONFIG.firebase (from /assets/js/config.js)
 * Supports: Vercel deployment with CSP or local development
 */

let FirebaseModules = null;

/* ---------------------------------------------------------------
   🔧 Dynamic Import Helper
---------------------------------------------------------------- */
async function tryImportFirebase(src) {
  try {
    const module = await import(src);
    console.log(`✅ Loaded Firebase module from: ${src}`);
    return module;
  } catch (error) {
    console.warn(`⚠️  Failed to load ${src}:`, error);
    return null;
  }
}

/* ---------------------------------------------------------------
   🧠 Smart Firebase Loader (Local ➜ CDN Fallback)
---------------------------------------------------------------- */
async function loadFirebaseModules() {
  if (FirebaseModules) return FirebaseModules;

  const localApp = '/assets/vendor/firebase/firebase-app.js';
  const localAuth = '/assets/vendor/firebase/firebase-auth.js';

  const cdnBase = 'https://www.gstatic.com/firebasejs/10.7.1';
  const cdnApp = `${cdnBase}/firebase-app.js`;
  const cdnAuth = `${cdnBase}/firebase-auth.js`;

  // 1️⃣ Try local SDK first
  const appModule =
    (await tryImportFirebase(localApp)) ||
    (await tryImportFirebase(cdnApp));
  const authModule =
    (await tryImportFirebase(localAuth)) ||
    (await tryImportFirebase(cdnAuth));

  if (!appModule || !authModule) {
    console.error('❌ Firebase SDK could not be loaded.');
    return null;
  }

  FirebaseModules = { ...appModule, ...authModule };
  return FirebaseModules;
}

/* ---------------------------------------------------------------
   🚀 Initialize Firebase
---------------------------------------------------------------- */
export async function initFirebase() {
  const fb = await loadFirebaseModules();
  if (!fb || !window.THA_CONFIG?.firebase) {
    console.error('❌ Missing Firebase configuration.');
    return null;
  }

  try {
    const app = fb.initializeApp(window.THA_CONFIG.firebase);
    const auth = fb.getAuth(app);
    console.log('🔥 Firebase initialized successfully.');
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
    const { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } =
      await loadFirebaseModules();

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(userCredential.user, { displayName });
    await sendEmailVerification(userCredential.user);
    return userCredential;
  },

  async login(auth, email, password) {
    const { signInWithEmailAndPassword } = await loadFirebaseModules();
    return signInWithEmailAndPassword(auth, email, password);
  },

  async signInWithGoogle(auth) {
    const { GoogleAuthProvider, signInWithPopup } = await loadFirebaseModules();
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  },
};
