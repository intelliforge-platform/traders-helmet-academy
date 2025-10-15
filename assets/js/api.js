/**
 * TRADERS HELMET ACADEMY - API SERVICE LAYER
 * Centralized API service for HTTP requests, caching, and error handling
 */

class APIService {
  constructor() {
    this.baseURL = THA_CONFIG?.api?.baseUrl || '/api';
    this.timeout = THA_CONFIG?.api?.timeout || 30000;
    this.retryAttempts = THA_CONFIG?.api?.retryAttempts || 3;
    this.retryDelay = THA_CONFIG?.api?.retryDelay || 1000;
    
    // Cache for GET requests
    this.cache = new Map();
    this.cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    
    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    // Rate limiting
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 10;
    
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default request/response interceptors
   */
  setupDefaultInterceptors() {
    // Default request interceptor - adds auth token
    this.addRequestInterceptor((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Add timestamp for cache busting if needed
      if (config.cacheBust) {
        const separator = config.url.includes('?') ? '&' : '?';
        config.url += `${separator}_t=${Date.now()}`;
      }
      
      return config;
    });

    // Default response interceptor - handles common errors
    this.addResponseInterceptor(
      (response) => response,
      (error) => {
        this.handleResponseError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return localStorage.getItem(THA_CONFIG?.auth?.tokenKey || 'tha_auth_token');
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(fulfilled, rejected) {
    this.responseInterceptors.push({ fulfilled, rejected });
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(config) {
    let finalConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      try {
        finalConfig = await interceptor(finalConfig);
      } catch (error) {
        console.error('Request interceptor error:', error);
      }
    }
    
    return finalConfig;
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors(response, error = null) {
    let finalResponse = response;
    let finalError = error;
    
    for (const interceptor of this.responseInterceptors) {
      try {
        if (error && interceptor.rejected) {
          finalError = await interceptor.rejected(finalError);
        } else if (!error && interceptor.fulfilled) {
          finalResponse = await interceptor.fulfilled(finalResponse);
        }
      } catch (interceptorError) {
        console.error('Response interceptor error:', interceptorError);
      }
    }
    
    if (finalError) {
      throw finalError;
    }
    
    return finalResponse;
  }

  /**
   * Handle response errors
   */
  handleResponseError(error) {
    const status = error.response?.status;
    
    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        this.emit('unauthorized');
        if (typeof window !== 'undefined') {
          window.location.href = '/login.html';
        }
        break;
        
      case 403:
        // Forbidden
        this.emit('forbidden', error);
        tradersHelmet?.showNotification('Access denied', 'error');
        break;
        
      case 429:
        // Rate limited
        this.emit('rateLimited', error);
        tradersHelmet?.showNotification('Too many requests. Please try again later.', 'warning');
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        this.emit('serverError', error);
        tradersHelmet?.showNotification('Server error. Please try again.', 'error');
        break;
        
      default:
        if (error.message === 'Network Error') {
          this.emit('networkError', error);
          tradersHelmet?.showNotification('Network error. Check your connection.', 'error');
        }
    }
  }

  /**
   * Generate cache key
   */
  generateCacheKey(url, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    
    return `${url}?${paramString}`;
  }

  /**
   * Get from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheMaxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Retry mechanism for failed requests
   */
  async retry(fn, attempts = this.retryAttempts, delay = this.retryDelay) {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retry(fn, attempts - 1, delay * 1.5); // Exponential backoff
    }
  }

  /**
   * Rate limiting for requests
   */
  async throttleRequest(requestFn) {
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        if (this.activeRequests >= this.maxConcurrentRequests) {
          this.requestQueue.push(executeRequest);
          return;
        }
        
        this.activeRequests++;
        
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          
          if (this.requestQueue.length > 0) {
            const nextRequest = this.requestQueue.shift();
            setTimeout(nextRequest, 10); // Small delay to prevent overwhelming
          }
        }
      };
      
      executeRequest();
    });
  }

  /**
   * Core HTTP request method
   */
  async request(config) {
    const defaultConfig = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: this.timeout
    };
    
    let finalConfig = { ...defaultConfig, ...config };
    
    // Apply request interceptors
    finalConfig = await this.applyRequestInterceptors(finalConfig);
    
    // Build full URL
    const url = finalConfig.url.startsWith('http') 
      ? finalConfig.url 
      : `${this.baseURL}${finalConfig.url}`;
    
    // Check cache for GET requests
    if (finalConfig.method === 'GET' && finalConfig.cache !== false) {
      const cacheKey = this.generateCacheKey(url, finalConfig.params);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const requestFn = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);
      
      try {
        // Prepare request options
        const requestOptions = {
          method: finalConfig.method,
          headers: finalConfig.headers,
          signal: controller.signal
        };
        
        // Add body for non-GET requests
        if (finalConfig.data && finalConfig.method !== 'GET') {
          if (finalConfig.data instanceof FormData) {
            requestOptions.body = finalConfig.data;
            // Remove Content-Type for FormData to let browser set it
            delete requestOptions.headers['Content-Type'];
          } else {
            requestOptions.body = JSON.stringify(finalConfig.data);
          }
        }
        
        // Add query params for GET requests
        let requestUrl = url;
        if (finalConfig.params && finalConfig.method === 'GET') {
          const searchParams = new URLSearchParams();
          Object.entries(finalConfig.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, value.toString());
            }
          });
          const paramString = searchParams.toString();
          if (paramString) {
            requestUrl += (url.includes('?') ? '&' : '?') + paramString;
          }
        }
        
        const response = await fetch(requestUrl, requestOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.response = {
            status: response.status,
            statusText: response.statusText,
            data: await response.text()
          };
          throw error;
        }
        
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
        
        const finalResponse = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        };
        
        // Cache GET responses
        if (finalConfig.method === 'GET' && finalConfig.cache !== false) {
          const cacheKey = this.generateCacheKey(url, finalConfig.params);
          this.setCache(cacheKey, finalResponse);
        }
        
        return await this.applyResponseInterceptors(finalResponse);
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          error.message = 'Request timeout';
        }
        
        await this.applyResponseInterceptors(null, error);
        throw error;
      }
    };
    
    // Apply throttling and retry logic
    return this.throttleRequest(() => this.retry(requestFn));
  }

  /**
   * HTTP method shortcuts
   */
  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }
  
  async post(url, data = null, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }
  
  async put(url, data = null, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }
  
  async patch(url, data = null, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }
  
  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }

  /**
   * SPECIFIC API ENDPOINTS
   */

  /**
   * Authentication APIs
   */
  auth = {
    login: (credentials) => this.post('/auth/login', credentials),
    logout: () => this.post('/auth/logout'),
    refresh: () => this.post('/auth/refresh'),
    register: (userData) => this.post('/auth/register', userData),
    forgotPassword: (email) => this.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => this.post('/auth/reset-password', { token, password: newPassword }),
    verifyEmail: (token) => this.post('/auth/verify-email', { token })
  };

  /**
   * User APIs
   */
  users = {
    getProfile: () => this.get('/users/profile'),
    updateProfile: (data) => this.patch('/users/profile', data),
    uploadAvatar: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return this.post('/users/avatar', formData);
    },
    changePassword: (passwords) => this.post('/users/change-password', passwords),
    deleteAccount: () => this.delete('/users/account')
  };

  /**
   * Subscription APIs
   */
  subscriptions = {
    getCurrent: () => this.get('/subscriptions/current'),
    getHistory: () => this.get('/subscriptions/history'),
    upgrade: (tier) => this.post('/subscriptions/upgrade', { tier }),
    cancel: () => this.post('/subscriptions/cancel'),
    reactivate: () => this.post('/subscriptions/reactivate'),
    getInvoices: () => this.get('/subscriptions/invoices')
  };

  /**
   * Trading Signals APIs
   */
  signals = {
    getAll: (filters = {}) => this.get('/signals', { params: filters }),
    getById: (id) => this.get(`/signals/${id}`),
    markViewed: (id) => this.post(`/signals/${id}/view`),
    getFavorites: () => this.get('/signals/favorites'),
    addToFavorites: (id) => this.post(`/signals/${id}/favorite`),
    removeFromFavorites: (id) => this.delete(`/signals/${id}/favorite`),
    getStats: () => this.get('/signals/stats')
  };

  /**
   * Chat APIs
   */
  chat = {
    getRooms: () => this.get('/chat/rooms'),
    getMessages: (roomId, limit = 50) => this.get(`/chat/rooms/${roomId}/messages`, { params: { limit } }),
    sendMessage: (roomId, message) => this.post(`/chat/rooms/${roomId}/messages`, { message }),
    uploadFile: (roomId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return this.post(`/chat/rooms/${roomId}/files`, formData);
    }
  };

  /**
   * Payment APIs
   */
  payments = {
    createPaymentIntent: (amount, currency = 'USD') => 
      this.post('/payments/create-intent', { amount, currency }),
    confirmPayment: (paymentIntentId) => 
      this.post('/payments/confirm', { paymentIntentId }),
    getPaymentMethods: () => this.get('/payments/methods'),
    addPaymentMethod: (paymentMethod) => 
      this.post('/payments/methods', paymentMethod),
    removePaymentMethod: (methodId) => 
      this.delete(`/payments/methods/${methodId}`),
    getInvoices: () => this.get('/payments/invoices')
  };

  /**
   * Admin APIs
   */
  admin = {
    getUsers: (page = 1, limit = 50) => 
      this.get('/admin/users', { params: { page, limit } }),
    getUser: (userId) => this.get(`/admin/users/${userId}`),
    updateUser: (userId, data) => this.patch(`/admin/users/${userId}`, data),
    deleteUser: (userId) => this.delete(`/admin/users/${userId}`),
    
    getSubscriptions: (page = 1, limit = 50) => 
      this.get('/admin/subscriptions', { params: { page, limit } }),
    updateSubscription: (subscriptionId, data) => 
      this.patch(`/admin/subscriptions/${subscriptionId}`, data),
    
    createSignal: (signalData) => this.post('/admin/signals', signalData),
    updateSignal: (signalId, data) => this.patch(`/admin/signals/${signalId}`, data),
    deleteSignal: (signalId) => this.delete(`/admin/signals/${signalId}`),
    
    getAnalytics: (timeframe = '30d') => 
      this.get('/admin/analytics', { params: { timeframe } }),
    getStats: () => this.get('/admin/stats'),
    
    createDiscount: (discountData) => this.post('/admin/discounts', discountData),
    updateDiscount: (discountId, data) => this.patch(`/admin/discounts/${discountId}`, data),
    deleteDiscount: (discountId) => this.delete(`/admin/discounts/${discountId}`),
    getDiscounts: () => this.get('/admin/discounts')
  };

  /**
   * Market Data APIs
   */
  market = {
    getPrices: (symbols) => this.get('/market/prices', { 
      params: { symbols: symbols.join(',') },
      cache: false // Don't cache real-time prices
    }),
    getCandles: (symbol, timeframe, limit = 100) => 
      this.get('/market/candles', { params: { symbol, timeframe, limit } }),
    getNews: (limit = 20) => this.get('/market/news', { params: { limit } }),
    getEconomicCalendar: (date) => 
      this.get('/market/calendar', { params: { date } })
  };

  /**
   * Event system for API events
   */
  eventListeners = new Map();

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`API event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Utility methods
   */
  
  /**
   * Check if online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Queue requests for offline mode
   */
  queueOfflineRequest(config) {
    const offlineQueue = JSON.parse(localStorage.getItem('tha_offline_queue') || '[]');
    offlineQueue.push({
      ...config,
      timestamp: Date.now()
    });
    localStorage.setItem('tha_offline_queue', JSON.stringify(offlineQueue));
  }

  /**
   * Process offline queue when back online
   */
  async processOfflineQueue() {
    const offlineQueue = JSON.parse(localStorage.getItem('tha_offline_queue') || '[]');
    
    if (offlineQueue.length === 0) return;
    
    console.log(`Processing ${offlineQueue.length} offline requests...`);
    
    const results = [];
    for (const config of offlineQueue) {
      try {
        const result = await this.request(config);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    // Clear the queue
    localStorage.removeItem('tha_offline_queue');
    
    return results;
  }
}

// Create global instance
const apiService = new APIService();

// Handle online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online - processing queued requests...');
    apiService.processOfflineQueue();
  });
  
  window.addEventListener('offline', () => {
    console.log('Gone offline - requests will be queued');
  });
}

// Make available globally
if (typeof window !== 'undefined') {
  window.apiService = apiService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIService;
}