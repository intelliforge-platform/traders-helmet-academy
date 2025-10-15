/**
 * TRADERS HELMET ACADEMY - ADVANCED NOTIFICATION SYSTEM
 * Push notifications, in-app notifications, email alerts, and real-time updates
 */

class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.subscriptions = new Map();
    this.serviceWorkerRegistration = null;
    this.isSupported = this.checkSupport();
    this.isPermissionGranted = false;
    this.unreadCount = 0;
    
    // Notification configuration
    this.config = {
      maxNotifications: 50,
      defaultDuration: 5000,
      sound: true,
      vibration: true,
      persistentNotifications: true,
      categories: ['signal', 'system', 'payment', 'chat', 'alert', 'general'],
      priorities: ['low', 'normal', 'high', 'urgent'],
      apiEndpoint: '/api/notifications'
    };

    // Notification templates
    this.templates = new Map();
    
    this.init();
  }

  /**
   * Initialize notification system
   */
  async init() {
    try {
      // Check browser support
      if (!this.isSupported) {
        console.warn('⚠️ Push notifications not supported in this browser');
        return;
      }

      // Setup notification templates
      this.setupNotificationTemplates();
      
      // Request permission if not already granted
      await this.requestPermission();
      
      // Register service worker for push notifications
      await this.registerServiceWorker();
      
      // Setup in-app notification container
      this.setupInAppNotifications();
      
      // Load existing notifications
      await this.loadNotifications();
      
      // Setup real-time subscription
      this.setupRealTimeSubscription();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('🔔 Notification Manager initialized');
    } catch (error) {
      console.error('❌ Notification Manager initialization failed:', error);
    }
  }

  /**
   * Check browser support for notifications
   */
  checkSupport() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      this.isPermissionGranted = permission === 'granted';
      
      if (this.isPermissionGranted) {
        console.log('✅ Notification permission granted');
      } else {
        console.warn('⚠️ Notification permission denied');
      }
      
      return this.isPermissionGranted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker() {
    if (!this.isSupported) return;

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
      
      // Subscribe to push notifications
      await this.subscribeToPush();
      
      console.log('📱 Service worker registered for push notifications');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush() {
    if (!this.serviceWorkerRegistration || !this.isPermissionGranted) return;

    try {
      // Get VAPID public key from config
      const vapidPublicKey = THA_CONFIG?.notifications?.push?.vapidKey;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      console.log('📨 Push subscription created');
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  /**
   * Setup notification templates
   */
  setupNotificationTemplates() {
    // Trading signal notification
    this.templates.set('signal', {
      title: 'New Trading Signal',
      icon: '/assets/images/signal-icon.png',
      badge: '/assets/images/badge-72.png',
      actions: [
        { action: 'view', title: 'View Signal', icon: '/assets/images/view-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      sound: '/assets/sounds/signal-alert.mp3',
      vibrate: [200, 100, 200],
      tag: 'trading-signal'
    });

    // Price alert notification
    this.templates.set('alert', {
      title: 'Price Alert',
      icon: '/assets/images/alert-icon.png',
      badge: '/assets/images/badge-72.png',
      actions: [
        { action: 'view', title: 'View Chart', icon: '/assets/images/chart-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      sound: '/assets/sounds/alert.mp3',
      vibrate: [300, 200, 300],
      tag: 'price-alert'
    });

    // Payment notification
    this.templates.set('payment', {
      title: 'Payment Update',
      icon: '/assets/images/payment-icon.png',
      badge: '/assets/images/badge-72.png',
      actions: [
        { action: 'view', title: 'View Details', icon: '/assets/images/view-icon.png' }
      ],
      sound: '/assets/sounds/payment.mp3',
      vibrate: [100, 50, 100],
      tag: 'payment'
    });

    // Chat message notification
    this.templates.set('chat', {
      title: 'New Message',
      icon: '/assets/images/chat-icon.png',
      badge: '/assets/images/badge-72.png',
      actions: [
        { action: 'reply', title: 'Reply', icon: '/assets/images/reply-icon.png' },
        { action: 'view', title: 'View Chat', icon: '/assets/images/chat-icon.png' }
      ],
      sound: '/assets/sounds/message.mp3',
      vibrate: [100, 100, 100],
      tag: 'chat-message'
    });

    // System notification
    this.templates.set('system', {
      title: 'System Update',
      icon: '/assets/images/system-icon.png',
      badge: '/assets/images/badge-72.png',
      actions: [
        { action: 'view', title: 'View Details', icon: '/assets/images/view-icon.png' }
      ],
      tag: 'system'
    });

    // General notification
    this.templates.set('general', {
      title: 'Notification',
      icon: '/assets/images/icon-192.png',
      badge: '/assets/images/badge-72.png',
      actions: [
        { action: 'view', title: 'View', icon: '/assets/images/view-icon.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/assets/images/dismiss-icon.png' }
      ],
      tag: 'general'
    });
  }

  /**
   * Setup in-app notification container
   */
  setupInAppNotifications() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    // Add notification styles
    this.addNotificationStyles();
  }

  /**
   * Add notification styles
   */
  addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;

    const styles = `
      <style id="notification-styles">
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          max-width: 400px;
          width: 100%;
          pointer-events: none;
        }
        
        .notification {
          background: var(--white);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          margin-bottom: var(--spacing-md);
          padding: var(--spacing-lg);
          border-left: 4px solid var(--primary-blue);
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
          pointer-events: auto;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        
        .notification.show {
          opacity: 1;
          transform: translateX(0);
        }
        
        .notification.signal {
          border-left-color: var(--gold-primary);
        }
        
        .notification.alert {
          border-left-color: var(--warning);
        }
        
        .notification.payment {
          border-left-color: var(--success);
        }
        
        .notification.chat {
          border-left-color: var(--info);
        }
        
        .notification.system {
          border-left-color: var(--admin-primary);
        }
        
        .notification.error {
          border-left-color: var(--danger);
        }
        
        .notification-header {
          display: flex;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }
        
        .notification-icon {
          width: 24px;
          height: 24px;
          margin-right: var(--spacing-sm);
          font-size: 1.2rem;
        }
        
        .notification-title {
          font-weight: var(--font-weight-semibold);
          color: var(--dark-gray);
          margin: 0;
          flex: 1;
        }
        
        .notification-time {
          font-size: var(--font-size-xs);
          color: var(--gray);
        }
        
        .notification-close {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
          background: none;
          border: none;
          color: var(--gray);
          cursor: pointer;
          font-size: 1.2rem;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }
        
        .notification-close:hover {
          background: var(--light-gray);
          color: var(--dark-gray);
        }
        
        .notification-body {
          color: var(--dark-gray);
          line-height: 1.4;
        }
        
        .notification-actions {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
        }
        
        .notification-action {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--primary-blue);
          color: var(--white);
          border: none;
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .notification-action:hover {
          background: var(--primary-deep-blue);
          transform: translateY(-1px);
        }
        
        .notification-action.secondary {
          background: var(--light-gray);
          color: var(--dark-gray);
        }
        
        .notification-action.secondary:hover {
          background: var(--gray);
          color: var(--white);
        }
        
        .notification-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: var(--primary-blue);
          transition: width linear;
        }
        
        .notification-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--danger);
          color: var(--white);
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: var(--font-size-xs);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @media (max-width: 768px) {
          .notification-container {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }
          
          .notification {
            margin-bottom: var(--spacing-sm);
            padding: var(--spacing-md);
          }
        }
        
        @keyframes notificationSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes notificationSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .notification.slide-in {
          animation: notificationSlideIn 0.3s ease forwards;
        }
        
        .notification.slide-out {
          animation: notificationSlideOut 0.3s ease forwards;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Show in-app notification
   */
  showNotification(message, type = 'general', options = {}) {
    const notification = this.createNotification(message, type, options);
    this.displayNotification(notification);
    return notification.id;
  }

  /**
   * Create notification object
   */
  createNotification(message, type, options) {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const template = this.templates.get(type) || this.templates.get('general');
    
    const notification = {
      id,
      type,
      message,
      title: options.title || template.title,
      icon: options.icon || template.icon,
      timestamp: Date.now(),
      priority: options.priority || 'normal',
      duration: options.duration || this.config.defaultDuration,
      persistent: options.persistent || false,
      actions: options.actions || template.actions || [],
      data: options.data || {},
      url: options.url || null,
      sound: options.sound !== false ? (options.sound || template.sound) : null,
      vibrate: options.vibrate !== false ? (options.vibrate || template.vibrate) : null,
      isRead: false,
      isDisplayed: false
    };

    this.notifications.set(id, notification);
    this.updateUnreadCount();
    
    return notification;
  }

  /**
   * Display notification in UI
   */
  displayNotification(notification) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notificationElement = this.createNotificationElement(notification);
    container.appendChild(notificationElement);

    // Trigger show animation
    requestAnimationFrame(() => {
      notificationElement.classList.add('show');
    });

    // Auto-remove after duration (if not persistent)
    if (!notification.persistent && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }

    // Play sound if enabled
    if (notification.sound && this.config.sound) {
      this.playNotificationSound(notification.sound);
    }

    // Vibrate if enabled
    if (notification.vibrate && this.config.vibration && navigator.vibrate) {
      navigator.vibrate(notification.vibrate);
    }

    notification.isDisplayed = true;
  }

  /**
   * Create notification DOM element
   */
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification ${notification.type}`;
    element.id = `notification-${notification.id}`;
    element.dataset.notificationId = notification.id;

    const timeAgo = this.getTimeAgo(notification.timestamp);
    
    element.innerHTML = `
      <button class="notification-close" onclick="notificationManager.removeNotification('${notification.id}')">
        <i class="fas fa-times"></i>
      </button>
      
      <div class="notification-header">
        <div class="notification-icon">
          <i class="${this.getIconClass(notification.type)}"></i>
        </div>
        <h6 class="notification-title">${notification.title}</h6>
        <span class="notification-time">${timeAgo}</span>
      </div>
      
      <div class="notification-body">
        ${notification.message}
      </div>
      
      ${notification.actions.length > 0 ? `
        <div class="notification-actions">
          ${notification.actions.map(action => `
            <button class="notification-action ${action.secondary ? 'secondary' : ''}" 
                    onclick="notificationManager.handleNotificationAction('${notification.id}', '${action.action}')">
              ${action.title}
            </button>
          `).join('')}
        </div>
      ` : ''}
      
      ${!notification.persistent && notification.duration > 0 ? `
        <div class="notification-progress" style="animation-duration: ${notification.duration}ms"></div>
      ` : ''}
    `;

    // Add click handler for notification body
    element.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-close') && !e.target.closest('.notification-actions')) {
        this.handleNotificationClick(notification.id);
      }
    });

    return element;
  }

  /**
   * Get icon class for notification type
   */
  getIconClass(type) {
    const icons = {
      signal: 'fas fa-signal',
      alert: 'fas fa-exclamation-triangle',
      payment: 'fas fa-credit-card',
      chat: 'fas fa-comment',
      system: 'fas fa-cog',
      error: 'fas fa-exclamation-circle',
      success: 'fas fa-check-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle',
      general: 'fas fa-bell'
    };
    
    return icons[type] || icons.general;
  }

  /**
   * Remove notification
   */
  removeNotification(notificationId) {
    const element = document.getElementById(`notification-${notificationId}`);
    if (element) {
      element.classList.add('slide-out');
      setTimeout(() => {
        element.remove();
      }, 300);
    }

    this.notifications.delete(notificationId);
    this.updateUnreadCount();
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Mark as read
    notification.isRead = true;
    this.updateUnreadCount();

    // Navigate to URL if specified
    if (notification.url) {
      window.location.href = notification.url;
    }

    // Emit click event
    this.emit('notificationClick', notification);

    // Auto-remove after click (if not persistent)
    if (!notification.persistent) {
      this.removeNotification(notificationId);
    }
  }

  /**
   * Handle notification action
   */
  handleNotificationAction(notificationId, action) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Mark as read
    notification.isRead = true;
    this.updateUnreadCount();

    // Emit action event
    this.emit('notificationAction', { notification, action });

    // Handle common actions
    switch (action) {
      case 'dismiss':
        this.removeNotification(notificationId);
        break;
        
      case 'view':
        if (notification.url) {
          window.location.href = notification.url;
        }
        break;
        
      case 'reply':
        if (notification.type === 'chat') {
          this.openChatReply(notification.data);
        }
        break;
        
      default:
        // Custom action handling
        break;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(message, type = 'general', options = {}) {
    if (!this.isPermissionGranted || !this.serviceWorkerRegistration) {
      console.warn('Push notifications not available');
      return;
    }

    try {
      const template = this.templates.get(type) || this.templates.get('general');
      
      const notificationData = {
        title: options.title || template.title,
        body: message,
        icon: options.icon || template.icon,
        badge: options.badge || template.badge,
        tag: options.tag || template.tag,
        data: {
          url: options.url,
          type: type,
          timestamp: Date.now(),
          ...options.data
        },
        actions: options.actions || template.actions || [],
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        vibrate: options.vibrate || template.vibrate
      };

      await this.serviceWorkerRegistration.showNotification(
        notificationData.title,
        notificationData
      );

      console.log('📨 Push notification sent');
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Setup real-time subscription for notifications
   */
  setupRealTimeSubscription() {
    if (!window.supabaseManager) return;

    // Subscribe to user-specific notifications
    const userId = window.authService?.getCurrentUser()?.id;
    if (!userId) return;

    window.supabaseManager.supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleRealtimeNotification(payload.new);
      })
      .subscribe();
  }

  /**
   * Handle real-time notification
   */
  handleRealtimeNotification(notificationData) {
    const options = {
      title: notificationData.title,
      url: notificationData.action_url,
      data: notificationData.data || {},
      priority: notificationData.priority
    };

    // Show in-app notification
    this.showNotification(
      notificationData.message,
      notificationData.type,
      options
    );

    // Send push notification if user is not active
    if (document.hidden) {
      this.sendPushNotification(
        notificationData.message,
        notificationData.type,
        options
      );
    }
  }

  /**
   * Load existing notifications from server
   */
  async loadNotifications() {
    try {
      const response = await window.apiService?.get('/notifications?limit=20');
      const notifications = response?.data || [];

      notifications.forEach(notification => {
        const notificationObj = this.createNotification(
          notification.message,
          notification.type,
          {
            title: notification.title,
            url: notification.action_url,
            data: notification.data,
            priority: notification.priority,
            persistent: true
          }
        );
        
        notificationObj.isRead = notification.is_read;
        notificationObj.timestamp = new Date(notification.created_at).getTime();
      });

      this.updateUnreadCount();
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.isRead) return;

    try {
      // Update server
      await window.apiService?.patch(`/notifications/${notificationId}`, {
        is_read: true
      });

      // Update local state
      notification.isRead = true;
      this.updateUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      // Update server
      await window.apiService?.post('/notifications/mark-all-read');

      // Update local state
      this.notifications.forEach(notification => {
        notification.isRead = true;
      });

      this.updateUnreadCount();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Update unread count
   */
  updateUnreadCount() {
    const unreadNotifications = Array.from(this.notifications.values())
      .filter(n => !n.isRead);
    
    this.unreadCount = unreadNotifications.length;
    
    // Update UI badge
    const badge = document.getElementById('notification-count');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }

    // Emit count update event
    this.emit('unreadCountUpdate', this.unreadCount);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Mark displayed notifications as read when user returns
        this.markDisplayedAsRead();
      }
    });

    // Handle service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          this.handlePushNotificationClick(event.data);
        }
      });
    }
  }

  /**
   * Mark currently displayed notifications as read
   */
  markDisplayedAsRead() {
    const displayedNotifications = Array.from(this.notifications.values())
      .filter(n => n.isDisplayed && !n.isRead);

    displayedNotifications.forEach(notification => {
      this.markAsRead(notification.id);
    });
  }

  /**
   * Handle push notification click
   */
  handlePushNotificationClick(data) {
    // Focus the window
    window.focus();

    // Navigate to URL if specified
    if (data.url) {
      window.location.href = data.url;
    }

    // Emit click event
    this.emit('pushNotificationClick', data);
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      await window.apiService?.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  /**
   * Play notification sound
   */
  playNotificationSound(soundUrl) {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Failed to create audio for notification:', error);
    }
  }

  /**
   * Open chat reply modal
   */
  openChatReply(chatData) {
    // Implementation would integrate with chat system
    if (window.chatSystem) {
      window.chatSystem.openReplyModal(chatData);
    }
  }

  /**
   * Utility methods
   */
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Event system
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
          console.error(`Error in notification event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Public API methods
   */
  getUnreadCount() {
    return this.unreadCount;
  }

  getAllNotifications() {
    return Array.from(this.notifications.values());
  }

  getNotificationsByType(type) {
    return Array.from(this.notifications.values())
      .filter(n => n.type === type);
  }

  clearAllNotifications() {
    const container = document.getElementById('notification-container');
    if (container) {
      container.innerHTML = '';
    }
    
    this.notifications.clear();
    this.updateUnreadCount();
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.clearAllNotifications();
    this.subscriptions.clear();
    this.eventListeners.clear();
  }
}

// Create global notification manager instance
const notificationManager = new NotificationManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.notificationManager = notificationManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}
