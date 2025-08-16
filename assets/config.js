/**
 * TRADERS HELMET ACADEMY - CONFIGURATION FILE
 * Location: /assets/js/config.js
 * 
 * IMPORTANT: Replace the Firebase section with your actual credentials!
 */

// Main configuration object
const THA_CONFIG = {
  // Environment Settings
  environment: 'development', // 'development', 'staging', 'production'
  debug: true,
  
  // 🔥 FIREBASE CONFIGURATION 
  // ⚠️ REPLACE THESE WITH YOUR ACTUAL FIREBASE CREDENTIALS ⚠️
  firebase: {
    apiKey: "AIzaSyCHdhs1wQxyslO7ecotTiqKyc9fH-cJI1k", // Replace with your actual API key
    authDomain: "traders-helmet-academy.firebaseapp.com", // Replace with your domain
    projectId: "traders-helmet-academy", // Replace with your project ID
    storageBucket: "traders-helmet-academy.firebasestorage.app", // Replace with your storage bucket
    messagingSenderId: "789631387729", // Replace with your sender ID
    appId: "1:789631387729:web:d1f176bcc091ec40c75070" // Replace with your app ID
  },
  
  // Authentication Settings
  auth: {
    provider: 'firebase',
    tokenKey: 'tha_firebase_token',
    userKey: 'tha_firebase_user',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    passwordMinLength: 6,
    requireEmailVerification: true
  },
  
  // Subscription Tiers (from your existing config)
  tiers: {
    gold: {
      name: 'Gold',
      level: 1,
      price: 300,
      duration: '2 months',
      features: [
        'Free Education',
        'Cryptocurrency Education', 
        'Binary Options (HFX)',
        'Forex Master Class on Pivot Strategy',
        'Forex Master Class on Rhombus Strategy',
        '2 Months Mentorship',
        'Free Signals'
      ]
    },
    
    platinum: {
      name: 'Platinum', 
      level: 2,
      price: 600,
      duration: '3 months',
      features: [
        'Free Education',
        'Cryptocurrency Education',
        'Binary Options (HFX)', 
        'Forex Master Class on Pivot Strategy',
        'Forex Master Class on Rhombus Strategy',
        'Free Trading Software Tools',
        '3 Months Mentorship',
        'Free Signals'
      ]
    },
    
    diamond: {
      name: 'Diamond',
      level: 3, 
      price: 1300,
      duration: '6 months',
      features: [
        'Free Education',
        'Cryptocurrency Education',
        'Binary Options (HFX)',
        'Forex Master Class on Pivot Strategy', 
        'Forex Master Class on Rhombus Strategy',
        'Forex Master Class on Institutional Order Flow',
        'Free Trading Software Tools',
        '6 Months Mentorship',
        'Free Signals'
      ]
    }
  },
  
  // API Configuration
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retryAttempts: 3
  },
  
  // UI Settings
  ui: {
    theme: {
      default: 'dark',
      allowUserChange: true
    },
    animations: {
      enabled: true,
      duration: 300
    }
  }
};

// Validation function
function validateConfig() {
  console.log('🔧 Validating THA_CONFIG...');
  
  if (!THA_CONFIG.firebase) {
    console.error('❌ Firebase configuration missing!');
    return false;
  }
  
  // Check for placeholder values
  const firebaseConfig = THA_CONFIG.firebase;
  const hasPlaceholders = Object.values(firebaseConfig).some(value => 
    typeof value === 'string' && value.includes('REPLACE-WITH')
  );
  
  if (hasPlaceholders) {
    console.warn('⚠️ Firebase config contains placeholder values!');
    console.warn('📋 Please update with your actual Firebase credentials');
    console.warn('🔗 Get them at: https://console.firebase.google.com');
    return false;
  }
  
  console.log('✅ Configuration validated successfully');
  return true;
}

// Make THA_CONFIG globally available
if (typeof window !== 'undefined') {
  window.THA_CONFIG = THA_CONFIG;
  console.log('🔧 THA_CONFIG loaded successfully');
  
  // Auto-validate on load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(validateConfig, 100);
  });
} else if (typeof global !== 'undefined') {
  global.THA_CONFIG = THA_CONFIG;
}

// Export for modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = THA_CONFIG;
}

// Helper functions
const ConfigHelper = {
  get: (path, defaultValue = null) => {
    return path.split('.').reduce((obj, key) => obj?.[key], THA_CONFIG) || defaultValue;
  },
  
  getTierConfig: (tier) => {
    return THA_CONFIG.tiers[tier] || null;
  },
  
  getFirebaseConfig: () => {
    return THA_CONFIG.firebase;
  },
  
  isProduction: () => {
    return THA_CONFIG.environment === 'production';
  },
  
  isDevelopment: () => {
    return THA_CONFIG.environment === 'development';
  }
};

// Make helper available globally
if (typeof window !== 'undefined') {
  window.ConfigHelper = ConfigHelper;
}

console.log('🔧 Traders Helmet Academy Configuration Loaded!');