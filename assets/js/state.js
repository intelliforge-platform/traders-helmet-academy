/**
 * TRADERS HELMET ACADEMY - GLOBAL STATE MANAGEMENT
 * Centralized state management with reactive updates and persistence
 */

class StateManager {
  constructor() {
    this.state = this.getInitialState();
    this.subscribers = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.persistenceKey = 'tha_app_state';
    
    // Debounced persistence function
    this.debouncedPersist = THA_Utils.performance.debounce(
      () => this.persistState(), 
      1000
    );
    
    this.init();
  }

  /**
   * Initialize state manager
   */
  init() {
    // Load persisted state
    this.loadPersistedState();
    
    // Setup auto-persistence
    this.subscribe('*', () => {
      this.debouncedPersist();
    });
    
    console.log('🗃️ State Manager initialized');
  }

  /**
   * Get initial state structure
   */
  getInitialState() {
    return {
      // Authentication state
      auth: {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        lastLogin: null,
        sessionExpiry: null
      },
      
      // User profile and preferences
      profile: {
        tier: 'gold',
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            inApp: true,
            signals: true
          },
          dashboard: {
            layout: 'default',
            widgets: []
          }
        },
        subscription: null
      },
      
      // Trading signals state
      signals: {
        active: [],
        closed: [],
        favorites: [],
        filters: {
          type: 'all',
          risk: 'all',
          symbol: '',
          dateRange: 'all'
        },
        pagination: {
          page: 1,
          limit: 20,
          total: 0
        },
        loading: false,
        lastUpdated: null
      },
      
      // Market data state
      market: {
        prices: {},
        news: [],
        calendar: [],
        watchlist: [],
        loading: false,
        lastUpdated: null
      },
      
      // Chat system state
      chat: {
        currentRoom: null,
        rooms: [],
        messages: {},
        onlineUsers: [],
        typingUsers: [],
        unreadCounts: {},
        isConnected: false
      },
      
      // UI state
      ui: {
        sidebarOpen: true,
        currentPage: 'dashboard',
        breadcrumbs: [],
        modals: {},
        notifications: [],
        loading: {
          global: false,
          components: {}
        },
        errors: {},
        theme: 'light'
      },
      
      // Application settings
      app: {
        version: '1.0.0',
        environment: 'production',
        features: {},
        maintenance: false,
        announcements: []
      },
      
      // Cache state
      cache: {
        timestamp: Date.now(),
        data: {}
      }
    };
  }

  /**
   * Get current state or specific path
   */
  getState(path = null) {
    if (!path) {
      return { ...this.state };
    }
    
    return this.getNestedValue(this.state, path);
  }

  /**
   * Set state with path and value
   */
  setState(path, value, meta = {}) {
    const oldState = { ...this.state };
    const newState = { ...this.state };
    
    // Set nested value
    this.setNestedValue(newState, path, value);
    
    // Create action object
    const action = {
      type: 'SET_STATE',
      path,
      value,
      oldValue: this.getNestedValue(oldState, path),
      timestamp: Date.now(),
      meta
    };
    
    // Apply middleware
    const processedAction = this.applyMiddleware(action, oldState, newState);
    
    if (processedAction) {
      this.state = newState;
      this.addToHistory(processedAction);
      this.notifySubscribers(path, newState, oldState, processedAction);
    }
    
    return this.state;
  }

  /**
   * Dispatch action
   */
  dispatch(action) {
    const oldState = { ...this.state };
    let newState = { ...this.state };
    
    // Process action
    newState = this.processAction(newState, action);
    
    // Apply middleware
    const processedAction = this.applyMiddleware(action, oldState, newState);
    
    if (processedAction) {
      this.state = newState;
      this.addToHistory(processedAction);
      this.notifySubscribers('*', newState, oldState, processedAction);
    }
    
    return this.state;
  }

  /**
   * Process different action types
   */
  processAction(state, action) {
    switch (action.type) {
      case 'AUTH_LOGIN':
        return {
          ...state,
          auth: {
            ...state.auth,
            isAuthenticated: true,
            user: action.payload.user,
            token: action.payload.token,
            refreshToken: action.payload.refreshToken,
            lastLogin: Date.now(),
            sessionExpiry: action.payload.expiresAt
          }
        };
        
      case 'AUTH_LOGOUT':
        return {
          ...state,
          auth: this.getInitialState().auth,
          profile: this.getInitialState().profile,
          chat: this.getInitialState().chat
        };
        
      case 'UPDATE_PROFILE':
        return {
          ...state,
          profile: {
            ...state.profile,
            ...action.payload
          }
        };
        
      case 'SET_SIGNALS':
        return {
          ...state,
          signals: {
            ...state.signals,
            [action.payload.type]: action.payload.signals,
            loading: false,
            lastUpdated: Date.now()
          }
        };
        
      case 'ADD_SIGNAL':
        return {
          ...state,
          signals: {
            ...state.signals,
            active: [action.payload, ...state.signals.active]
          }
        };
        
      case 'UPDATE_SIGNAL':
        return {
          ...state,
          signals: {
            ...state.signals,
            active: state.signals.active.map(signal =>
              signal.id === action.payload.id ? { ...signal, ...action.payload } : signal
            )
          }
        };
        
      case 'SET_MARKET_PRICES':
        return {
          ...state,
          market: {
            ...state.market,
            prices: {
              ...state.market.prices,
              ...action.payload
            },
            lastUpdated: Date.now()
          }
        };
        
      case 'ADD_CHAT_MESSAGE':
        const roomId = action.payload.room_id;
        return {
          ...state,
          chat: {
            ...state.chat,
            messages: {
              ...state.chat.messages,
              [roomId]: [
                ...(state.chat.messages[roomId] || []),
                action.payload
              ]
            }
          }
        };
        
      case 'SET_UI_LOADING':
        return {
          ...state,
          ui: {
            ...state.ui,
            loading: {
              ...state.ui.loading,
              [action.payload.component || 'global']: action.payload.loading
            }
          }
        };
        
      case 'ADD_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: [
              action.payload,
              ...state.ui.notifications
            ].slice(0, 20) // Keep only last 20 notifications
          }
        };
        
      case 'REMOVE_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: state.ui.notifications.filter(
              notification => notification.id !== action.payload.id
            )
          }
        };
        
      case 'SET_ERROR':
        return {
          ...state,
          ui: {
            ...state.ui,
            errors: {
              ...state.ui.errors,
              [action.payload.component]: action.payload.error
            }
          }
        };
        
      case 'CLEAR_ERROR':
        const { [action.payload.component]: removed, ...remainingErrors } = state.ui.errors;
        return {
          ...state,
          ui: {
            ...state.ui,
            errors: remainingErrors
          }
        };
        
      default:
        return state;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    
    this.subscribers.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(path, callback);
    };
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(path, callback) {
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).delete(callback);
      
      if (this.subscribers.get(path).size === 0) {
        this.subscribers.delete(path);
      }
    }
  }

  /**
   * Notify subscribers of state changes
   */
  notifySubscribers(changedPath, newState, oldState, action) {
    // Notify exact path subscribers
    if (this.subscribers.has(changedPath)) {
      this.subscribers.get(changedPath).forEach(callback => {
        try {
          callback(newState, oldState, action);
        } catch (error) {
          console.error(`Error in subscriber for ${changedPath}:`, error);
        }
      });
    }
    
    // Notify wildcard subscribers
    if (changedPath !== '*' && this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        try {
          callback(newState, oldState, action);
        } catch (error) {
          console.error('Error in wildcard subscriber:', error);
        }
      });
    }
    
    // Notify parent path subscribers
    const pathParts = changedPath.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.subscribers.has(parentPath)) {
        this.subscribers.get(parentPath).forEach(callback => {
          try {
            callback(newState, oldState, action);
          } catch (error) {
            console.error(`Error in parent subscriber for ${parentPath}:`, error);
          }
        });
      }
    }
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Apply middleware to actions
   */
  applyMiddleware(action, oldState, newState) {
    let processedAction = action;
    
    for (const middleware of this.middleware) {
      try {
        const result = middleware(processedAction, oldState, newState);
        if (result === false) {
          // Middleware blocked the action
          return null;
        } else if (result && typeof result === 'object') {
          // Middleware modified the action
          processedAction = result;
        }
      } catch (error) {
        console.error('Middleware error:', error);
      }
    }
    
    return processedAction;
  }

  /**
   * Add action to history
   */
  addToHistory(action) {
    this.history.push({
      ...action,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get action history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Persist state to localStorage
   */
  persistState() {
    try {
      const stateToPersist = {
        auth: {
          ...this.state.auth,
          // Don't persist sensitive data
          token: null,
          refreshToken: null
        },
        profile: this.state.profile,
        ui: {
          theme: this.state.ui.theme,
          sidebarOpen: this.state.ui.sidebarOpen
        },
        signals: {
          favorites: this.state.signals.favorites,
          filters: this.state.signals.filters
        },
        market: {
          watchlist: this.state.market.watchlist
        },
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.persistenceKey, JSON.stringify(stateToPersist));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * Load persisted state from localStorage
   */
  loadPersistedState() {
    try {
      const persistedData = localStorage.getItem(this.persistenceKey);
      if (!persistedData) return;
      
      const parsedData = JSON.parse(persistedData);
      
      // Check if persisted data is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsedData.timestamp > maxAge) {
        localStorage.removeItem(this.persistenceKey);
        return;
      }
      
      // Merge persisted state with current state
      this.state = this.deepMerge(this.state, parsedData);
      
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      localStorage.removeItem(this.persistenceKey);
    }
  }

  /**
   * Helper functions
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Action creators for common operations
   */
  actions = {
    // Authentication actions
    login: (user, token, refreshToken, expiresAt) => ({
      type: 'AUTH_LOGIN',
      payload: { user, token, refreshToken, expiresAt }
    }),
    
    logout: () => ({
      type: 'AUTH_LOGOUT'
    }),
    
    updateProfile: (updates) => ({
      type: 'UPDATE_PROFILE',
      payload: updates
    }),
    
    // Signal actions
    setSignals: (type, signals) => ({
      type: 'SET_SIGNALS',
      payload: { type, signals }
    }),
    
    addSignal: (signal) => ({
      type: 'ADD_SIGNAL',
      payload: signal
    }),
    
    updateSignal: (signalUpdate) => ({
      type: 'UPDATE_SIGNAL',
      payload: signalUpdate
    }),
    
    // Market actions
    setMarketPrices: (prices) => ({
      type: 'SET_MARKET_PRICES',
      payload: prices
    }),
    
    // Chat actions
    addChatMessage: (message) => ({
      type: 'ADD_CHAT_MESSAGE',
      payload: message
    }),
    
    // UI actions
    setLoading: (component, loading) => ({
      type: 'SET_UI_LOADING',
      payload: { component, loading }
    }),
    
    addNotification: (notification) => ({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...notification
      }
    }),
    
    removeNotification: (id) => ({
      type: 'REMOVE_NOTIFICATION',
      payload: { id }
    }),
    
    setError: (component, error) => ({
      type: 'SET_ERROR',
      payload: { component, error }
    }),
    
    clearError: (component) => ({
      type: 'CLEAR_ERROR',
      payload: { component }
    })
  };

  /**
   * Utility methods for common state operations
   */
  utils = {
    // Check if user is authenticated
    isAuthenticated: () => this.getState('auth.isAuthenticated'),
    
    // Get current user
    getCurrentUser: () => this.getState('auth.user'),
    
    // Get user tier
    getUserTier: () => this.getState('profile.tier'),
    
    // Check if loading
    isLoading: (component = 'global') => 
      this.getState(`ui.loading.${component}`) || false,
    
    // Get errors
    getError: (component) => this.getState(`ui.errors.${component}`),
    
    // Get active signals
    getActiveSignals: () => this.getState('signals.active') || [],
    
    // Get market price
    getMarketPrice: (symbol) => this.getState(`market.prices.${symbol}`),
    
    // Get unread message count
    getUnreadCount: (roomId) => this.getState(`chat.unreadCounts.${roomId}`) || 0
  };
}

// Create global state manager instance
const stateManager = new StateManager();

// Add logging middleware in development
if (THA_CONFIG?.development?.enableConsoleLogging) {
  stateManager.addMiddleware((action, oldState, newState) => {
    console.group(`🗃️ State Action: ${action.type}`);
    console.log('Payload:', action.payload);
    console.log('Old State:', oldState);
    console.log('New State:', newState);
    console.groupEnd();
    return action;
  });
}

// Add validation middleware
stateManager.addMiddleware((action, oldState, newState) => {
  // Add any validation logic here
  return action;
});

// Make available globally
if (typeof window !== 'undefined') {
  window.stateManager = stateManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}