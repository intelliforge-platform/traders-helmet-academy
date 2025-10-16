/**
 * TRADERS HELMET ACADEMY - FIREBASE AUTHENTICATION SERVICE
 * Location: /assets/js/firebase-auth.js
 * Replaces Supabase authentication with Firebase
 */

import { initializeApp } from '/assets/vendor/firebase/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from '/assets/vendor/firebase/firebase-auth.js';

// Firebase Authentication Service Class
class FirebaseAuthService {
  constructor(config) {
    this.app = initializeApp(config);
    this.auth = getAuth(this.app);
    this.currentUser = null;
    this.authCallbacks = [];
    
    // Set persistence based on config
    const persistenceType = config.persistence === 'session' 
      ? browserSessionPersistence 
      : browserLocalPersistence;
    
    setPersistence(this.auth, persistenceType);
    
    // Listen for auth state changes
    this.initAuthStateListener();
    
    console.log('🔥 Firebase Authentication initialized');
  }
  
  // Initialize auth state listener
  initAuthStateListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      
      if (user) {
        console.log('👤 User signed in:', user.email);
        this.handleUserSignIn(user);
      } else {
        console.log('👋 User signed out');
        this.handleUserSignOut();
      }
      
      // Notify all callbacks
      this.authCallbacks.forEach(callback => callback(user));
    });
  }
  
  // Handle user sign in
  async handleUserSignIn(user) {
    try {
      // Get user token
      const token = await user.getIdToken();
      
      // Store user data
      const userData = {
        id: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime,
        // Add custom claims if needed
        tier: 'gold', // Default tier, get from your database
        role: 'user'   // Default role, get from your database
      };
      
      // Store in localStorage for persistence
      localStorage.setItem('tha_firebase_token', token);
      localStorage.setItem('tha_firebase_user', JSON.stringify(userData));
      
      // Sync with your database (if using Supabase for data storage)
      await this.syncUserWithDatabase(userData);
      
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
  
  // Register new user
  async register(email, password, userData = {}) {
    try {
      console.log('📝 Registering user:', email);
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ User created:', user.uid);
      
      // Update user profile if additional data provided
      if (userData.firstName || userData.lastName) {
        const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        if (displayName) {
          await updateProfile(user, { displayName });
          console.log('👤 Profile updated:', displayName);
        }
      }
      
      // Send email verification
      await sendEmailVerification(user);
      console.log('📧 Verification email sent');
      
      // Log activity
      this.logActivity('user_registered', 'auth', user.uid);
      
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
        case 'auth/operation-not-allowed':
          message = 'Email/password registration is not enabled';
          break;
        default:
          message = error.message;
      }
      
      return {
        success: false,
        error: error.code,
        message: message
      };
    }
  }
  
  // Sign in user
  async signIn(email, password) {
    try {
      console.log('🔑 Signing in user:', email);
      
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ User signed in:', user.uid);
      
      // Check if email is verified
      if (!user.emailVerified) {
        console.warn('⚠️ Email not verified');
        return {
          success: false,
          error: 'email-not-verified',
          message: 'Please verify your email before signing in. Check your inbox for the verification link.',
          user: {
            id: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          }
        };
      }
      
      // Log activity
      this.logActivity('user_login', 'auth', user.uid);
      
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
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        default:
          message = error.message;
      }
      
      return {
        success: false,
        error: error.code,
        message: message
      };
    }
  }
  
  // Sign out user
  async signOut() {
    try {
      console.log('👋 Signing out user');
      
      // Log activity before signing out
      if (this.currentUser) {
        this.logActivity('user_logout', 'auth', this.currentUser.uid);
      }
      
      await signOut(this.auth);
      console.log('✅ User signed out');
      
      return {
        success: true,
        message: 'Signed out successfully'
      };
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return {
        success: false,
        error: error.code,
        message: error.message
      };
    }
  }
  
  // Reset password
  async resetPassword(email) {
    try {
      console.log('🔄 Sending password reset to:', email);
      
      await sendPasswordResetEmail(this.auth, email);
      console.log('✅ Password reset email sent');
      
      this.logActivity('password_reset_requested', 'auth', null, { email });
      
      return {
        success: true,
        message: 'Password reset email sent. Check your inbox.'
      };
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      let message = 'Failed to send password reset email';
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address';
          break;
        default:
          message = error.message;
      }
      
      return {
        success: false,
        error: error.code,
        message: message
      };
    }
  }
  
  // Resend email verification
  async resendVerification() {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }
      
      console.log('📧 Resending verification email');
      
      await sendEmailVerification(this.currentUser);
      console.log('✅ Verification email sent');
      
      return {
        success: true,
        message: 'Verification email sent. Check your inbox.'
      };
      
    } catch (error) {
      console.error('❌ Resend verification error:', error);
      return {
        success: false,
        error: error.code,
        message: error.message
      };
    }
  }
  
  // Update user password
  async updateUserPassword(newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }
      
      console.log('🔑 Updating password');
      
      await updatePassword(this.currentUser, newPassword);
      console.log('✅ Password updated');
      
      this.logActivity('password_updated', 'auth', this.currentUser.uid);
      
      return {
        success: true,
        message: 'Password updated successfully'
      };
      
    } catch (error) {
      console.error('❌ Update password error:', error);
      
      let message = 'Failed to update password';
      switch (error.code) {
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters';
          break;
        case 'auth/requires-recent-login':
          message = 'Please sign in again to update your password';
          break;
        default:
          message = error.message;
      }
      
      return {
        success: false,
        error: error.code,
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
      if (!this.currentUser) {
        return null;
      }
      
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
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authCallbacks.indexOf(callback);
      if (index > -1) {
        this.authCallbacks.splice(index, 1);
      }
    };
  }
  
  // Sync user with your database (optional - if you still use Supabase for data)
  async syncUserWithDatabase(userData) {
    try {
      // If you're still using Supabase for data storage, sync the user
      const { createClient } = supabase;
      const supabaseClient = createClient(
        THA_CONFIG.database.supabase.url,
        THA_CONFIG.database.supabase.anonKey
      );
      
      // Insert or update user in your database
      const { error } = await supabaseClient
        .from('user_profiles')
        .upsert({
          id: userData.id,
          email: userData.email,
          first_name: userData.displayName?.split(' ')[0] || '',
          last_name: userData.displayName?.split(' ').slice(1).join(' ') || '',
          email_verified: userData.emailVerified,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Warning: Could not sync user with database:', error);
      } else {
        console.log('✅ User synced with database');
      }
      
    } catch (error) {
      console.warn('Warning: Database sync failed:', error);
    }
  }
  
  // Log user activity
  async logActivity(action, resourceType = null, resourceId = null, metadata = {}) {
    try {
      // You can implement activity logging here
      console.log('📊 Activity:', { action, resourceType, resourceId, metadata });
      
      // If using Supabase for data storage, log to database
      if (window.supabase) {
        const { createClient } = supabase;
        const supabaseClient = createClient(
          THA_CONFIG.database.supabase.url,
          THA_CONFIG.database.supabase.anonKey
        );
        
        await supabaseClient
          .from('user_activity_log')
          .insert({
            user_id: resourceId,
            action: action,
            resource_type: resourceType,
            metadata: metadata,
            created_at: new Date().toISOString()
          });
      }
      
    } catch (error) {
      console.warn('Could not log activity:', error);
    }
  }
}

// Initialize Firebase Auth Service
let firebaseAuthService = null;

// Initialize function
function initializeFirebaseAuth() {
  if (!window.THA_CONFIG?.firebase) {
    console.error('❌ Firebase configuration not found in THA_CONFIG');
    return null;
  }
  
  if (!firebaseAuthService) {
    firebaseAuthService = new FirebaseAuthService(window.THA_CONFIG.firebase);
  }
  
  return firebaseAuthService;
}

// Export for global use
if (typeof window !== 'undefined') {
  window.FirebaseAuthService = FirebaseAuthService;
  window.initializeFirebaseAuth = initializeFirebaseAuth;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.firebaseAuth = initializeFirebaseAuth();
    });
  } else {
    window.firebaseAuth = initializeFirebaseAuth();
  }
}

// Compatibility layer to match Supabase API
window.supabaseToFirebaseAdapter = {
  auth: {
    // Registration - matches Supabase signUp API
    signUp: async ({ email, password, options = {} }) => {
      const auth = window.firebaseAuth || initializeFirebaseAuth();
      const result = await auth.register(email, password, {
        firstName: options.data?.first_name,
        lastName: options.data?.last_name
      });
      
      return {
        data: result.success ? { user: result.user } : null,
        error: result.success ? null : { message: result.message, code: result.error }
      };
    },
    
    // Sign in - matches Supabase signInWithPassword API
    signInWithPassword: async ({ email, password }) => {
      const auth = window.firebaseAuth || initializeFirebaseAuth();
      const result = await auth.signIn(email, password);
      
      return {
        data: result.success ? { user: result.user } : null,
        error: result.success ? null : { message: result.message, code: result.error }
      };
    },
    
    // Sign out - matches Supabase signOut API
    signOut: async () => {
      const auth = window.firebaseAuth || initializeFirebaseAuth();
      const result = await auth.signOut();
      
      return {
        error: result.success ? null : { message: result.message, code: result.error }
      };
    },
    
    // Reset password - matches Supabase resetPasswordForEmail API
    resetPasswordForEmail: async (email) => {
      const auth = window.firebaseAuth || initializeFirebaseAuth();
      const result = await auth.resetPassword(email);
      
      return {
        error: result.success ? null : { message: result.message, code: result.error }
      };
    },
    
    // Resend verification - matches Supabase resend API
    resend: async ({ type, email }) => {
      if (type === 'signup') {
        const auth = window.firebaseAuth || initializeFirebaseAuth();
        const result = await auth.resendVerification();
        
        return {
          error: result.success ? null : { message: result.message, code: result.error }
        };
      }
    },
    
    // Get session - matches Supabase getSession API
    getSession: async () => {
      const auth = window.firebaseAuth || initializeFirebaseAuth();
      const user = auth.getCurrentUser();
      const token = await auth.getToken();
      
      return {
        data: {
          session: user ? {
            access_token: token,
            user: user
          } : null
        },
        error: null
      };
    },
    
    // Auth state change - matches Supabase onAuthStateChange API
    onAuthStateChange: (callback) => {
      const auth = window.firebaseAuth || initializeFirebaseAuth();
      return auth.onAuthStateChange((user) => {
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user);
      });
    }
  }
};

export { FirebaseAuthService, initializeFirebaseAuth };
