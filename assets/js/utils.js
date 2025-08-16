/**
 * TRADERS HELMET ACADEMY - UTILITY FUNCTIONS
 * Common utility functions and helpers used throughout the application
 */

const THA_Utils = {
  
  /**
   * Date and Time Utilities
   */
  date: {
    /**
     * Format date to readable string
     */
    format(date, options = {}) {
      const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      const config = { ...defaultOptions, ...options };
      return new Intl.DateTimeFormat('en-US', config).format(new Date(date));
    },

    /**
     * Get relative time (e.g., "2 hours ago")
     */
    getRelativeTime(date) {
      const now = new Date();
      const past = new Date(date);
      const diffInSeconds = Math.floor((now - past) / 1000);

      const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
      };

      for (const [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / seconds);
        if (interval >= 1) {
          return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
      }

      return 'Just now';
    },

    /**
     * Check if date is today
     */
    isToday(date) {
      const today = new Date();
      const checkDate = new Date(date);
      return checkDate.toDateString() === today.toDateString();
    },

    /**
     * Get trading session info
     */
    getTradingSession() {
      const now = new Date();
      const hour = now.getUTCHours();
      
      // Trading sessions (UTC)
      const sessions = {
        sydney: { start: 21, end: 6, name: 'Sydney' },
        tokyo: { start: 0, end: 9, name: 'Tokyo' },
        london: { start: 8, end: 17, name: 'London' },
        newYork: { start: 13, end: 22, name: 'New York' }
      };
      
      for (const [key, session] of Object.entries(sessions)) {
        if (
          (session.start < session.end && hour >= session.start && hour < session.end) ||
          (session.start > session.end && (hour >= session.start || hour < session.end))
        ) {
          return { active: key, name: session.name, isActive: true };
        }
      }
      
      return { active: null, name: 'Market Closed', isActive: false };
    }
  },

  /**
   * Number and Currency Utilities
   */
  number: {
    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'USD', locale = 'en-US') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    },

    /**
     * Format percentage
     */
    formatPercentage(value, decimals = 2) {
      return `${(value * 100).toFixed(decimals)}%`;
    },

    /**
     * Format large numbers (1K, 1M, etc.)
     */
    formatLargeNumber(num) {
      if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
      return num.toString();
    },

    /**
     * Calculate percentage change
     */
    percentageChange(oldValue, newValue) {
      if (oldValue === 0) return 0;
      return ((newValue - oldValue) / oldValue) * 100;
    },

    /**
     * Generate random number in range
     */
    randomInRange(min, max, decimals = 0) {
      const random = Math.random() * (max - min) + min;
      return parseFloat(random.toFixed(decimals));
    },

    /**
     * Calculate risk-reward ratio
     */
    calculateRiskReward(entryPrice, stopLoss, takeProfit) {
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit - entryPrice);
      return reward / risk;
    }
  },

  /**
   * String Utilities
   */
  string: {
    /**
     * Capitalize first letter
     */
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Convert to title case
     */
    toTitleCase(str) {
      return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    },

    /**
     * Generate random string
     */
    randomString(length = 10) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },

    /**
     * Truncate string with ellipsis
     */
    truncate(str, length = 50) {
      return str.length > length ? str.substring(0, length) + '...' : str;
    },

    /**
     * Slug-ify string
     */
    slugify(str) {
      return str
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    },

    /**
     * Extract initials from name
     */
    getInitials(name) {
      return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    }
  },

  /**
   * Validation Utilities
   */
  validation: {
    /**
     * Validate email
     */
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    /**
     * Validate password strength
     */
    validatePassword(password) {
      const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      };

      const score = Object.values(checks).filter(Boolean).length;
      const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

      return { checks, score, strength, isValid: score >= 3 };
    },

    /**
     * Validate phone number
     */
    isValidPhone(phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    },

    /**
     * Validate trading symbol
     */
    isValidTradingSymbol(symbol) {
      const symbolRegex = /^[A-Z]{3,6}(\/[A-Z]{3})?$/;
      return symbolRegex.test(symbol.toUpperCase());
    }
  },

  /**
   * DOM Utilities
   */
  dom: {
    /**
     * Query selector with error handling
     */
    $(selector, parent = document) {
      try {
        return parent.querySelector(selector);
      } catch (e) {
        console.error(`Invalid selector: ${selector}`, e);
        return null;
      }
    },

    /**
     * Query all with error handling
     */
    $$(selector, parent = document) {
      try {
        return Array.from(parent.querySelectorAll(selector));
      } catch (e) {
        console.error(`Invalid selector: ${selector}`, e);
        return [];
      }
    },

    /**
     * Create element with attributes
     */
    createElement(tag, attributes = {}, children = []) {
      const element = document.createElement(tag);
      
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element.setAttribute(key, value);
        }
      });

      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Element) {
          element.appendChild(child);
        }
      });

      return element;
    },

    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    },

    /**
     * Smooth scroll to element
     */
    scrollTo(element, offset = 0) {
      const targetPosition = element.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    }
  },

  /**
   * Storage Utilities
   */
  storage: {
    /**
     * Set item with expiration
     */
    setWithExpiry(key, value, ttl) {
      const now = new Date();
      const item = {
        value: value,
        expiry: now.getTime() + ttl
      };
      localStorage.setItem(`tha_${key}`, JSON.stringify(item));
    },

    /**
     * Get item with expiration check
     */
    getWithExpiry(key) {
      try {
        const itemStr = localStorage.getItem(`tha_${key}`);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        const now = new Date();

        if (now.getTime() > item.expiry) {
          localStorage.removeItem(`tha_${key}`);
          return null;
        }

        return item.value;
      } catch (e) {
        console.error('Storage get error:', e);
        return null;
      }
    },

    /**
     * Clear expired items
     */
    clearExpired() {
      const keys = Object.keys(localStorage);
      const now = new Date().getTime();

      keys.forEach(key => {
        if (key.startsWith('tha_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item.expiry && now > item.expiry) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Invalid JSON, remove it
            localStorage.removeItem(key);
          }
        }
      });
    }
  },

  /**
   * Performance Utilities
   */
  performance: {
    /**
     * Debounce function
     */
    debounce(func, wait, immediate) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          timeout = null;
          if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
      };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    /**
     * Measure function execution time
     */
    measureTime(func, label = 'Function') {
      return function(...args) {
        const start = performance.now();
        const result = func.apply(this, args);
        const end = performance.now();
        console.log(`${label} took ${end - start} milliseconds`);
        return result;
      };
    }
  },

  /**
   * Trading Utilities
   */
  trading: {
    /**
     * Calculate position size
     */
    calculatePositionSize(accountBalance, riskPercentage, entryPrice, stopLoss) {
      const riskAmount = accountBalance * (riskPercentage / 100);
      const priceDistance = Math.abs(entryPrice - stopLoss);
      return riskAmount / priceDistance;
    },

    /**
     * Calculate pip value
     */
    calculatePipValue(pair, accountCurrency = 'USD', lotSize = 100000) {
      // Simplified pip value calculation
      const pipSize = 0.0001; // Standard for most pairs
      
      // This is a simplified version - real implementation would need exchange rates
      if (pair.endsWith(accountCurrency)) {
        return (pipSize * lotSize);
      }
      
      return (pipSize * lotSize); // Would need actual conversion rates
    },

    /**
     * Determine market direction
     */
    getMarketDirection(prices) {
      if (prices.length < 2) return 'neutral';
      
      const recent = prices.slice(-5); // Last 5 prices
      const rising = recent.every((price, i) => i === 0 || price >= recent[i - 1]);
      const falling = recent.every((price, i) => i === 0 || price <= recent[i - 1]);
      
      if (rising) return 'bullish';
      if (falling) return 'bearish';
      return 'neutral';
    },

    /**
     * Calculate moving average
     */
    calculateMA(prices, period) {
      if (prices.length < period) return null;
      
      const slice = prices.slice(-period);
      const sum = slice.reduce((acc, price) => acc + price, 0);
      return sum / period;
    },

    /**
     * Calculate RSI
     */
    calculateRSI(prices, period = 14) {
      if (prices.length < period + 1) return null;
      
      const changes = [];
      for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
      }
      
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) return 100;
      
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    }
  },

  /**
   * Color Utilities
   */
  color: {
    /**
     * Get tier color
     */
    getTierColor(tier) {
      const colors = {
        gold: '#ffd700',
        platinum: '#e5e4e2',
        diamond: '#b9f2ff',
        admin: '#ff6b6b'
      };
      return colors[tier] || '#6c757d';
    },

    /**
     * Generate random color
     */
    randomColor() {
      return '#' + Math.floor(Math.random() * 16777215).toString(16);
    },

    /**
     * Lighten/darken color
     */
    adjustBrightness(hex, percent) {
      const num = parseInt(hex.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      
      return '#' + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
      ).toString(16).slice(1);
    }
  },

  /**
   * Error Handling Utilities
   */
  error: {
    /**
     * Safe JSON parse
     */
    safeJsonParse(str, defaultValue = null) {
      try {
        return JSON.parse(str);
      } catch (e) {
        console.error('JSON parse error:', e);
        return defaultValue;
      }
    },

    /**
     * Retry async function
     */
    async retry(fn, maxAttempts = 3, delay = 1000) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (attempt === maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    },

    /**
     * Log error with context
     */
    logError(error, context = {}) {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context
      };
      
      console.error('Application Error:', errorInfo);
      
      // In production, you might want to send this to an error tracking service
      if (THA_CONFIG?.environment === 'production') {
        // Send to error tracking service
      }
    }
  },

  /**
   * Device and Browser Detection
   */
  device: {
    /**
     * Check if mobile device
     */
    isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Check if tablet
     */
    isTablet() {
      return /iPad|Android/i.test(navigator.userAgent) && !this.isMobile();
    },

    /**
     * Get device type
     */
    getDeviceType() {
      if (this.isMobile()) return 'mobile';
      if (this.isTablet()) return 'tablet';
      return 'desktop';
    },

    /**
     * Check if online
     */
    isOnline() {
      return navigator.onLine;
    },

    /**
     * Get viewport dimensions
     */
    getViewport() {
      return {
        width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      };
    }
  }
};

// Make utilities globally available
if (typeof window !== 'undefined') {
  window.THA_Utils = THA_Utils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = THA_Utils;
}

// Auto-cleanup expired storage on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    THA_Utils.storage.clearExpired();
  });
}