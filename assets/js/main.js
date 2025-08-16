
/**
 * TRADERS HELMET ACADEMY - CORE JAVASCRIPT FRAMEWORK
 * Core utilities, authentication, and shared functionality
 */

class TradersHelmetCore {
  constructor() {
    this.config = {
      supabaseUrl: '', // To be set from config.js
      supabaseKey: '', // To be set from config.js
      apiEndpoint: '/api',
      environment: 'development'
    };
    
    this.user = null;
    this.userTier = null;
    this.notifications = [];
    this.eventListeners = new Map();
    
    this.init();
  }

  /**
   * Initialize the core framework
   */
  init() {
    this.setupEventListeners();
    this.setupFloatingElements();
    this.checkAuthState();
    this.setupNotificationSystem();
    
    console.log('🚀 Traders Helmet Academy Core Initialized');
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Form enhancements
    document.addEventListener('DOMContentLoaded', () => {
      this.enhanceForms();
      this.setupButtonAnimations();
      this.setupModalSystem();
    });

    // Handle clicks outside modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.closeModal();
      }
    });

    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Setup intersection observer for animations
    this.setupScrollAnimations();
  }

  /**
   * Enhance all forms with validation and animations
   */
  enhanceForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('.form-input');
      
      inputs.forEach(input => {
        // Focus animations
        input.addEventListener('focus', () => {
          input.parentElement.style.transform = 'scale(1.02)';
          input.parentElement.style.transition = 'transform 0.3s ease';
        });

        input.addEventListener('blur', () => {
          input.parentElement.style.transform = 'scale(1)';
          this.validateField(input);
        });

        // Real-time validation
        input.addEventListener('input', () => {
          this.clearFieldError(input);
        });
      });

      // Form submission handling
      form.addEventListener('submit', (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
        }
      });
    });
  }

  /**
   * Setup button animations and loading states
   */
  setupButtonAnimations() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
          button.style.transform = 'translateY(-2px)';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
          button.style.transform = 'translateY(0)';
        }
      });
    });
  }

  /**
   * Setup floating background elements
   */
  setupFloatingElements() {
    const existingElements = document.querySelectorAll('.floating-background');
    if (existingElements.length > 0) return;

    const floatingBg = document.createElement('div');
    floatingBg.className = 'floating-background';
    
    // Create 6 floating elements
    for (let i = 0; i < 6; i++) {
      const element = document.createElement('div');
      element.className = 'floating-element';
      
      // Random positioning and sizing
      const size = Math.random() * 100 + 50;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const delay = Math.random() * 6;
      
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.top = `${top}%`;
      element.style.left = `${left}%`;
      element.style.animationDelay = `${delay}s`;
      
      floatingBg.appendChild(element);
    }
    
    document.body.appendChild(floatingBg);
  }

  /**
   * Setup scroll-triggered animations
   */
  setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements that should animate on scroll
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

  /**
   * Notification System
   */
  setupNotificationSystem() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        width: 100%;
      `;
      document.body.appendChild(container);
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const id = Date.now().toString();
    notification.id = `notification-${id}`;
    notification.className = `notification ${type}`;
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
      <i class="${icons[type]}"></i>
      <span>${message}</span>
      <button onclick="tradersHelmet.closeNotification('${id}')" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:auto;font-size:1.2em;">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.closeNotification(id);
      }, duration);
    }
    
    this.notifications.push({ id, element: notification });
    
    return id;
  }

  /**
   * Close notification
   */
  closeNotification(id) {
    const notification = document.getElementById(`notification-${id}`);
    if (notification) {
      notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        notification.remove();
        this.notifications = this.notifications.filter(n => n.id !== id);
      }, 300);
    }
  }

  /**
   * Modal System
   */
  showModal(content, options = {}) {
    const defaults = {
      title: '',
      closable: true,
      size: 'medium',
      backdrop: true
    };
    
    const config = { ...defaults, ...options };
    
    // Remove existing modal
    this.closeModal();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    
    const modal = document.createElement('div');
    modal.className = `modal modal-${config.size}`;
    
    let modalContent = '';
    
    if (config.title) {
      modalContent += `
        <div class="card-header d-flex justify-between align-center">
          <h3 class="m-0">${config.title}</h3>
          ${config.closable ? '<button onclick="tradersHelmet.closeModal()" class="btn btn-sm" style="background:none;border:none;font-size:1.5em;">×</button>' : ''}
        </div>
      `;
    }
    
    modalContent += `<div class="card-body">${content}</div>`;
    
    modal.innerHTML = modalContent;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    return overlay;
  }

  closeModal() {
    const modal = document.getElementById('active-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 300);
    }
  }

  /**
   * Form Validation
   */
  validateForm(form) {
    const inputs = form.querySelectorAll('.form-input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  validateField(input) {
    const value = input.value.trim();
    const type = input.type;
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (input.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    }
    
    // Email validation
    else if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }
    
    // Password validation
    else if (type === 'password' && value) {
      if (value.length < 8) {
        isValid = false;
        errorMessage = 'Password must be at least 8 characters long';
      }
    }
    
    // Update field appearance
    if (isValid) {
      input.classList.remove('error');
      input.classList.add('success');
      this.clearFieldError(input);
    } else {
      input.classList.add('error');
      input.classList.remove('success');
      this.showFieldError(input, errorMessage);
    }
    
    return isValid;
  }

  showFieldError(input, message) {
    this.clearFieldError(input);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.style.cssText = `
      color: var(--danger);
      font-size: var(--font-size-sm);
      margin-top: var(--spacing-xs);
    `;
    errorElement.textContent = message;
    
    input.parentElement.appendChild(errorElement);
  }

  clearFieldError(input) {
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  /**
   * Loading State Management
   */
  showLoading(element, text = 'Loading...') {
    if (element.tagName === 'BUTTON') {
      element.dataset.originalText = element.innerHTML;
      element.innerHTML = `<span class="loader"></span> ${text}`;
      element.disabled = true;
    }
  }

  hideLoading(element) {
    if (element.tagName === 'BUTTON' && element.dataset.originalText) {
      element.innerHTML = element.dataset.originalText;
      element.disabled = false;
      delete element.dataset.originalText;
    }
  }

  /**
   * Authentication Management
   */
  async checkAuthState() {
    try {
      // This will be implemented with Supabase
      const token = localStorage.getItem('tha_auth_token');
      if (token) {
        // Validate token and get user data
        await this.getCurrentUser();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.logout();
    }
  }

  async login(credentials, tier) {
    try {
      // Supabase authentication will be implemented here
      console.log('Login attempt:', { email: credentials.email, tier });
      
      // Simulate authentication
      const mockUser = {
        id: '123',
        email: credentials.email,
        tier: tier,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          avatar: null
        }
      };
      
      this.setUser(mockUser);
      this.showNotification('Login successful!', 'success');
      
      // Redirect based on tier
      this.redirectAfterLogin(tier);
      
      return { success: true, user: mockUser };
    } catch (error) {
      this.showNotification('Login failed. Please check your credentials.', 'error');
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      // Clear Supabase session
      localStorage.removeItem('tha_auth_token');
      this.user = null;
      this.userTier = null;
      
      this.showNotification('Logged out successfully', 'info');
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  setUser(user) {
    this.user = user;
    this.userTier = user.tier;
    localStorage.setItem('tha_auth_token', 'mock_token_' + Date.now());
    
    // Dispatch user login event
    this.emit('userLogin', user);
  }

  getCurrentUser() {
    return this.user;
  }

  redirectAfterLogin(tier) {
    const redirectUrls = {
      gold: '/dashboard/gold.html',
      platinum: '/dashboard/platinum.html',
      diamond: '/dashboard/diamond.html',
      admin: '/admin/dashboard.html'
    };
    
    window.location.href = redirectUrls[tier] || '/dashboard/';
  }

  /**
   * Utility Functions
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDate(date, options = {}) {
    const defaults = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaults, ...options }).format(new Date(date));
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

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
  }

  /**
   * Event System
   */
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
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * API Helper Functions
   */
  async apiCall(endpoint, options = {}) {
    const defaults = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add auth token if available
    const token = localStorage.getItem('tha_auth_token');
    if (token) {
      defaults.headers.Authorization = `Bearer ${token}`;
    }

    const config = { ...defaults, ...options };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${this.config.apiEndpoint}${endpoint}`, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Call failed:', error);
      throw error;
    }
  }

  /**
   * Local Storage Helpers
   */
  setStorage(key, value) {
    try {
      localStorage.setItem(`tha_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set failed:', error);
    }
  }

  getStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`tha_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get failed:', error);
      return defaultValue;
    }
  }

  removeStorage(key) {
    try {
      localStorage.removeItem(`tha_${key}`);
    } catch (error) {
      console.error('Storage remove failed:', error);
    }
  }

  /**
   * Tier Access Control
   */
  hasAccess(requiredTier, userTier = this.userTier) {
    const tierLevels = {
      gold: 1,
      platinum: 2,
      diamond: 3,
      admin: 999
    };
    
    return tierLevels[userTier] >= tierLevels[requiredTier];
  }

  /**
   * Real-time Features Setup (for Supabase integration)
   */
  setupRealTimeSubscriptions() {
    // This will be implemented with Supabase real-time subscriptions
    console.log('Setting up real-time subscriptions...');
  }

  /**
   * Chat System Helpers
   */
  initializeChat() {
    // Chat initialization logic will be implemented here
    console.log('Initializing chat system...');
  }
}

// Global instance
const tradersHelmet = new TradersHelmetCore();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradersHelmetCore;
}

// Add CSS for additional styles not in main.css
const additionalStyles = `
  .field-error {
    color: var(--danger);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-xs);
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .animate-on-scroll {
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);