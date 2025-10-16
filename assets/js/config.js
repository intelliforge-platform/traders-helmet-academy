/**
 * TRADERS HELMET ACADEMY - CONFIGURATION FILE
 * Updated with Firebase Authentication
 */

window.THA_CONFIG = {
  // Environment Settings
  environment: 'development', // 'development', 'staging', 'production'
  debug: true,
  
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // 🔥 FIREBASE CONFIGURATION (Replace with your config from Firebase Console)
  firebase: {
   apiKey: "AIzaSyCHdhs1wQxyslO7ecotTiqKyc9fH-cJI1k",
  authDomain: "traders-helmet-academy.firebaseapp.com",
  projectId: "traders-helmet-academy",
  storageBucket: "traders-helmet-academy.firebasestorage.app",
  messagingSenderId: "789631387729",
  appId: "1:789631387729:web:d1f176bcc091ec40c75070",
  measurementId: "G-QBB3Z50V5H"
},
  
  // 🗄️ DATABASE CONFIGURATION (Keep your existing database for data storage)
  database: {
    // You can still use Supabase database or switch to Firestore later
    // For now, keep Supabase for data, just use Firebase for auth
    supabase: {
      url: 'https://xhaohziyrlwminomymbm.supabase.co',
      anonKey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYW9oeml5cmx3bWlub215bWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDk3NjgsImV4cCI6MjA3MjQyNTc2OH0.JFKtL1jYMT-sWEZcsEV3ZPHWfTE74uYBRNg13v22vKM
    }
  },
  
  // API Configuration
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Authentication Settings (Updated for Firebase)
  auth: {
    provider: 'firebase', // Changed from 'supabase'
    tokenKey: 'tha_firebase_token',
    userKey: 'tha_firebase_user',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    passwordMinLength: 8,
    requireEmailVerification: true,
    enableTwoFactor: false, // Firebase has built-in 2FA
    
    // Session management
    autoLogoutWarning: 5 * 60 * 1000,
    extendSessionThreshold: 30 * 60 * 1000,
    
    // Firebase specific settings
    firebase: {
      persistence: 'local', // 'local', 'session', 'none'
      languageCode: 'en',
      useDeviceLanguage: true
    }
  },
  
  // Subscription Tiers Configuration (Keep existing)
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
      ],
      signalsAccess: {
        daily: 10,
        weekly: 50,
        priority: 'low'
      },
      chatAccess: true,
      maxConcurrentSessions: 1
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
      ],
      signalsAccess: {
        daily: 25,
        weekly: 150,
        priority: 'medium'
      },
      chatAccess: true,
      maxConcurrentSessions: 2
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
      ],
      signalsAccess: {
        daily: 'unlimited',
        weekly: 'unlimited',
        priority: 'high'
      },
      chatAccess: true,
      maxConcurrentSessions: 5
    }
  },
  
  // Keep all your existing configurations...
  admin: {
    roles: ['super_admin', 'admin', 'moderator', 'support'],
    permissions: {
      super_admin: ['*'],
      admin: [
        'user_management',
        'subscription_management',
        'discount_management',
        'analytics_view',
        'chat_moderation'
      ],
      moderator: [
        'chat_moderation',
        'user_support',
        'content_management'
      ],
      support: [
        'user_support',
        'chat_access'
      ]
    },
    dashboard: {
      refreshInterval: 30000,
      maxUsersPerPage: 50,
      maxTransactionsPerPage: 100,
      analyticsRetention: 90
    }
  },
  
  // Real-time Chat Configuration
  chat: {
    enabled: true,
    maxMessageLength: 1000,
    messageHistory: 100,
    typingIndicatorTimeout: 3000,
    reconnectAttempts: 5,
    reconnectDelay: 2000,
    fileUpload: {
      enabled: true,
      maxFileSize: 5 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    },
    moderation: {
      profanityFilter: true,
      spamDetection: true,
      maxMessagesPerMinute: 10
    }
  },
  
  // Trading Signals Configuration
  signals: {
    refreshInterval: 60000,
    historyRetention: 30,
    types: {
      forex: { enabled: true, priority: 1 },
      crypto: { enabled: true, priority: 2 },
      stocks: { enabled: true, priority: 3 },
      commodities: { enabled: false, priority: 4 },
      indices: { enabled: true, priority: 5 }
    },
    riskLevels: ['low', 'medium', 'high'],
    defaults: {
      riskLevel: 'medium',
      stopLoss: 2,
      takeProfit: 4,
      maxConcurrentSignals: 5
    }
  },
  
  // Payment & Billing Configuration
  payment: {
    providers: {
      stripe: {
        enabled: true,
        publicKey: '',
        webhookSecret: ''
      },
      paypal: {
        enabled: false,
        clientId: ''
      }
    },
    billingCycles: ['monthly', 'quarterly', 'annually'],
    discounts: {
      maxPercentage: 50,
      maxAmount: 100,
      validityPeriod: 30
    },
    trial: {
      enabled: true,
      duration: 7,
      requiresPaymentMethod: true
    }
  },
  
  // Notification Settings
  notifications: {
    email: {
      enabled: true,
      provider: 'firebase', // Can use Firebase Cloud Messaging
      templates: {
        welcome: 'welcome',
        passwordReset: 'password-reset',
        subscriptionExpiry: 'subscription-expiry',
        newSignal: 'new-signal'
      }
    },
    push: {
      enabled: true,
      vapidKey: ''
    },
    inApp: {
      enabled: true,
      maxNotifications: 20,
      autoMarkReadAfter: 7
    }
  },
  
  // Keep all other existing configurations...
  security: {
    rateLimiting: {
      enabled: true,
      login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
        blockDuration: 60 * 60 * 1000
      },
      api: {
        maxRequests: 100,
        windowMs: 60 * 1000
      }
    },
    cors: {
      origin: ['http://localhost:3000', 'https://tradershelmet.com'],
      credentials: true
    },
    csp: {
      enabled: true,
      reportOnly: false
    }
  },
  
  ui: {
    theme: {
      default: 'light',
      allowUserChange: true,
      available: ['light', 'dark', 'auto']
    },
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out'
    },
    responsive: {
      breakpoints: {
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400
      }
    }
  },
  
  analytics: {
    enabled: true,
    providers: {
      googleAnalytics: {
        enabled: false,
        trackingId: ''
      },
      firebase: {
        enabled: true, // Firebase Analytics built-in
        logEvents: true
      }
    },
    events: [
      'user_registration',
      'subscription_upgrade',
      'signal_view',
      'chat_message',
      'payment_completed'
    ]
  },
  
  development: {
    enableReduxDevTools: true,
    enableConsoleLogging: true,
    mockData: {
      enabled: true,
      delayMs: 500
    },
    features: {
      newDashboard: false,
      advancedCharts: true,
      socialTrading: false
    }
  },
  
  localization: {
    defaultLanguage: 'en',
    availableLanguages: ['en', 'es', 'fr', 'de'],
    fallbackLanguage: 'en',
    currency: {
      default: 'USD',
      available: ['USD', 'EUR', 'GBP', 'JPY'],
      displayFormat: 'symbol'
    },
    dateTime: {
      format: 'MM/DD/YYYY',
      timeFormat: '12h',
      timezone: 'auto'
    }
  }
};

// Environment-specific overrides
const ENV_CONFIGS = {
  development: {
    debug: true,
    api: {
      baseUrl: 'http://localhost:3000/api'
    },
    auth: {
      sessionTimeout: 2 * 60 * 60 * 1000
    }
  },
  
  staging: {
    debug: true,
    api: {
      baseUrl: 'https://staging-api.tradershelmet.com'
    }
  },
  
  production: {
    debug: false,
    api: {
      baseUrl: 'https://api.tradershelmet.com'
    },
    security: {
      rateLimiting: {
        enabled: true
      }
    }
  }
};

// Merge environment-specific config
const currentEnvConfig = ENV_CONFIGS[THA_CONFIG.environment] || {};
const mergedConfig = { ...THA_CONFIG, ...currentEnvConfig };

// Validation function
function validateConfig() {
  const required = [
    'firebase.apiKey',
    'firebase.authDomain',
    'firebase.projectId'
  ];
  
  const missing = required.filter(path => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], mergedConfig);
    return !value || value.includes('YOUR_') || value.includes('REPLACE_');
  });
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing required Firebase configuration:', missing);
    console.warn('Please update config.js with your Firebase credentials from the Firebase Console');
    console.warn('Get your config at: https://console.firebase.google.com/project/YOUR_PROJECT/settings/general');
  }
  
  return missing.length === 0;
}

// Initialize configuration
function initializeConfig() {
  if (typeof window !== 'undefined') {
    window.THA_CONFIG = mergedConfig;
    
    if (window.tradersHelmet) {
      window.tradersHelmet.config = {
        ...window.tradersHelmet.config,
        ...mergedConfig
      };
    }
  }
  
  validateConfig();
  
  if (mergedConfig.debug) {
    console.log('🔥 Traders Helmet Academy Configuration Loaded with Firebase:', mergedConfig);
  }
}

// Auto-initialize when script loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConfig);
  } else {
    initializeConfig();
  }
} else {
  initializeConfig();
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mergedConfig;
} else if (typeof window !== 'undefined') {
  window.THA_CONFIG = mergedConfig;
}

// Updated helper functions for Firebase
const ConfigHelper = {
  get: (path, defaultValue = null) => {
    return path.split('.').reduce((obj, key) => obj?.[key], mergedConfig) || defaultValue;
  },
  
  getTierConfig: (tier) => {
    return mergedConfig.tiers[tier] || null;
  },
  
  hasFeature: (feature) => {
    return ConfigHelper.get(`development.features.${feature}`, false);
  },
  
  getApiUrl: (endpoint = '') => {
    return `${mergedConfig.api.baseUrl}${endpoint}`;
  },
  
  getFirebaseConfig: () => {
    return mergedConfig.firebase;
  },
  
  isProduction: () => {
    return mergedConfig.environment === 'production';
  },
  
  isDevelopment: () => {
    return mergedConfig.environment === 'development';
  }
};

// Make helper available globally
if (typeof window !== 'undefined') {
  window.ConfigHelper = ConfigHelper;
}

