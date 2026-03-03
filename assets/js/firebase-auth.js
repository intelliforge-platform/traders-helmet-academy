/**
 * TRADERS HELMET ACADEMY - FIREBASE AUTHENTICATION SERVICE
 * Location: /assets/js/firebase-auth.js
 * FIXED: Initialization order and component registration
 */

// Import Firebase modules with proper error handling
let firebaseApp, firebaseAuth;

try {
  // Dynamic imports with error handling
  const appModule = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
  const authModule = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
  
  firebaseApp = appModule;
  firebaseAuth = authModule;
  
  console.log('✅ Firebase modules loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Firebase modules:', error);
  // Create fallbacks
  firebaseApp = { initializeApp: () => console.warn('Firebase not loaded') };
  firebaseAuth = {
    getAuth: () => null,
    createUserWithEmailAndPassword: async () => { throw new Error('Firebase not loaded'); },
    signInWithEmailAndPassword: async () => { throw new Error('Firebase not loaded'); },
    signOut: async () => { throw new Error('Firebase not loaded'); },
    sendEmailVerification: async () => { throw new Error('Firebase not loaded'); },
    sendPasswordResetEmail: async () => { throw new Error('Firebase not loaded'); },
    updatePassword: async () => { throw new Error('Firebase not loaded'); },
    updateProfile: async () => { throw new Error('Firebase not loaded'); },
    onAuthStateChanged: () => () => {},
    setPersistence: async () => {},
    browserLocalPersistence: 'local',
    browserSessionPersistence: 'session'
  };
}

// Firebase Configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDyE5mNCy6DWAfCfih17dk2g7XI-1_-O8",
  authDomain: "thacadmey.firebaseapp.com",
  projectId: "thacadmey",
  storageBucket: "thacadmey.appspot.com",
  messagingSenderId: "444072890604",
  appId: "1:444072890604:web:your-app-id" // UPDATE THIS!
};

// Firebase Authentication Service Class
class FirebaseAuthService {
  constructor(config) {
    this.config = config || FIREBASE_CONFIG;
    this.app = null;
    this.auth = null;
    this.currentUser = null;
    this.authCallbacks = [];
    this.initialized = false;
    
    // Initialize
    this.initialize();
  }
  
  // Initialize Firebase
  initialize() {
    try {
      // Check if Firebase modules are available
      if (!firebaseApp || !firebaseAuth) {
        throw new Error('Firebase modules not loaded');
      }
      
      // Initialize app FIRST
      this.app = firebaseApp.initializeApp(this.config);
      console.log('✅ Firebase app initialized');
      
      // THEN get auth
      this.auth = firebaseAuth.getAuth(this.app);
      console.log('✅ Firebase auth initialized');
      
      // Set persistence
      firebaseAuth.setPersistence(this.auth, firebaseAuth.browserLocalPersistence)
        .catch(error => console.warn('Persistence setup failed:', error));
      
      // Listen for auth state changes
      this.initAuthStateListener();
      
      this.initialized = true;
      console.log('🔥 Firebase Authentication initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      this.initialized = false;
    }
  }
  
  // Initialize auth state listener
  initAuthStateListener() {
    if (!this.auth) return;
    
    firebaseAuth.onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      
      if (user) {
        console.log('👤 User signed in:', user.email);
        this.handleUserSignIn(user);
      } else {
        console.log('👋 User signed out');
        this.handleUserSignOut();
      }
      
      // Notify all callbacks
      this.authCallbacks.forEach(callback => {
        try { callback(user); } catch (e) { console.warn('Callback error:', e); }
      });
    });
  }
  
  // Handle user sign in
  async handleUserSignIn(user) {
    try {
      const token = await user.getIdToken();
      
      const userData = {
        id: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime
      };
      
      localStorage.setItem('tha_firebase_token', token);
      localStorage.setItem('tha_firebase_user', JSON.stringify(userData));
      
    } catch (error) {
      console.error('Error handling user sign in:', error);
    }
  }
  
  // Handle user sign out
  handleUserSignOut() {
    localStorage.removeItem('tha_firebase_token');
    localStorage.removeItem('tha_firebase_user');
    this.currentUser = null;
  }
  
  // Check if initialized
  checkInitialized() {
    if (!this.initialized || !this.auth) {
      throw new Error('Firebase not initialized');
    }
    return true;
  }
  
  // Register new user
  async register(email, password, userData = {}) {
    try {
      this.checkInitialized();
      console.log('📝 Registering user:', email);
      
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
        this.auth, email, password
      );
      const user = userCredential.user;
      
      console.log('✅ User created:', user.uid);
      
      // Update profile if needed
      if (userData.firstName || userData.lastName) {
        const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        if (displayName) {
          await firebaseAuth.updateProfile(user, { displayName });
        }
      }
      
      // Send verification email
      await firebaseAuth.sendEmailVerification(user);
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName
        },
        message: 'Registration successful! Please check your email to verify your account.'
      };
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let message = 'Registration failed';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            message = 'This email address is already registered';
            break;
          case 'auth/invalid-email':
            message = 'Please enter a valid email address';
            break;
          case 'auth/weak-password':
            message = 'Password should be at least 6 characters';
            break;
          default:
            message = error.message;
        }
      } else {
        message = error.message || 'Registration failed';
      }
      
      return {
        success: false,
        error: error.code || 'unknown',
        message: message
      };
    }
  }
  
  // Sign in user
  async signIn(email, password) {
    try {
      this.checkInitialized();
      console.log('🔑 Signing in user:', email);
      
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(
        this.auth, email, password
      );
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        return {
          success: false,
          error: 'email-not-verified',
          message: 'Please verify your email before signing in.',
          user: {
            id: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          }
        };
      }
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        message: 'Login successful'
      };
      
    } catch (error) {
      console.error('❌ Sign in error:', error);
      
      let message = 'Login failed';
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            message = 'No account found with this email address';
            break;
          case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
          case 'auth/invalid-email':
            message = 'Please enter a valid email address';
            break;
          default:
            message = error.message;
        }
      } else {
        message = error.message || 'Login failed';
      }
      
      return {
        success: false,
        error: error.code || 'unknown',
        message: message
      };
    }
  }
  
  // Sign out user
  async signOut() {
    try {
      this.checkInitialized();
      await firebaseAuth.signOut(this.auth);
      
      return {
        success: true,
        message: 'Signed out successfully'
      };
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return {
        success: false,
        error: error.code || 'unknown',
        message: error.message || 'Sign out failed'
      };
    }
  }
  
  // Reset password
  async resetPassword(email) {
    try {
      this.checkInitialized();
      await firebaseAuth.sendPasswordResetEmail(this.auth, email);
      
      return {
        success: true,
        message: 'Password reset email sent. Check your inbox.'
      };
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      let message = 'Failed to send password reset email';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address';
      }
      
      return {
        success: false,
        error: error.code || 'unknown',
        message: message
      };
    }
  }
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
  
  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser && this.currentUser.emailVerified;
  }
  
  // Get user token
  async getToken() {
    try {
      if (!this.currentUser) return null;
      return await this.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
  
  // Listen for auth state changes
  onAuthStateChange(callback) {
    this.authCallbacks.push(callback);
    
    // Call immediately with current state
    if (typeof callback === 'function') {
      try { callback(this.currentUser); } catch (e) {}
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.authCallbacks.indexOf(callback);
      if (index > -1) this.authCallbacks.splice(index, 1);
    };
  }
}

// Initialize Firebase Auth Service
let firebaseAuthInstance = null;

// Initialize function
function initializeFirebaseAuth(config) {
  const firebaseConfig = config || 
    (window.THA_CONFIG?.firebase) || 
    FIREBASE_CONFIG;
  
  if (!firebaseAuthInstance) {
    firebaseAuthInstance = new FirebaseAuthService(firebaseConfig);
  }
  
  return firebaseAuthInstance;
}

// Legacy support for register-page.js
function initFirebase() {
  try {
    const auth = initializeFirebaseAuth();
    return auth;
  } catch (error) {
    console.error('initFirebase failed:', error);
    return null;
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.FirebaseAuthService = FirebaseAuthService;
  window.initializeFirebaseAuth = initializeFirebaseAuth;
  window.initFirebase = initFirebase;
  
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.firebaseAuth = initFirebase();
    });
  } else {
    setTimeout(() => {
      window.firebaseAuth = initFirebase();
    }, 100);
  }
}

// Export for module use
export { FirebaseAuthService, initializeFirebaseAuth, initFirebase };
