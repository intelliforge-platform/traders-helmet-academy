/**
 * TRADERS HELMET ACADEMY - REAL-TIME CHAT SYSTEM
 * Complete chat functionality with real-time messaging, file sharing, and moderation
 */

class ChatSystem {
  constructor() {
    this.currentRoom = null;
    this.currentUser = null;
    this.messages = new Map(); // roomId -> messages array
    this.isConnected = false;
    this.typingUsers = new Set();
    this.typingTimeout = null;
    this.messageHistory = 100; // Keep last 100 messages per room
    
    // UI Elements (will be set when chat is initialized)
    this.chatContainer = null;
    this.messagesContainer = null;
    this.messageInput = null;
    this.sendButton = null;
    this.fileInput = null;
    this.typingIndicator = null;
    this.usersList = null;
    
    // Chat settings from config
    this.maxMessageLength = THA_CONFIG?.chat?.maxMessageLength || 1000;
    this.allowFileUpload = THA_CONFIG?.chat?.fileUpload?.enabled || true;
    this.maxFileSize = THA_CONFIG?.chat?.fileUpload?.maxFileSize || 5 * 1024 * 1024; // 5MB
    this.allowedFileTypes = THA_CONFIG?.chat?.fileUpload?.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    // Rate limiting
    this.lastMessageTime = 0;
    this.messageCount = 0;
    this.maxMessagesPerMinute = THA_CONFIG?.chat?.moderation?.maxMessagesPerMinute || 10;
    
    this.init();
  }

  /**
   * Initialize chat system
   */
  async init() {
    try {
      // Get current user from Supabase manager
      if (window.supabaseManager) {
        this.currentUser = window.supabaseManager.getCurrentUser();
        
        // Listen for auth changes
        window.supabaseManager.on('userLogin', (user) => {
          this.currentUser = user;
          this.handleUserLogin();
        });
        
        window.supabaseManager.on('userLogout', () => {
          this.currentUser = null;
          this.handleUserLogout();
        });
      }
      
      console.log('✅ Chat system initialized');
    } catch (error) {
      console.error('❌ Chat system initialization failed:', error);
    }
  }

  /**
   * Handle user login
   */
  handleUserLogin() {
    if (this.currentRoom) {
      this.connectToRoom(this.currentRoom);
    }
  }

  /**
   * Handle user logout
   */
  handleUserLogout() {
    this.disconnectFromRoom();
    this.clearMessages();
  }

  /**
   * Create chat UI
   */
  createChatUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Chat container not found:', containerId);
      return;
    }

    container.innerHTML = `
      <div class="chat-system">
        <div class="chat-header">
          <h3 class="chat-title">
            <i class="fas fa-comments"></i>
            <span id="chat-room-name">Support Chat</span>
          </h3>
          <div class="chat-status">
            <span class="connection-status" id="connection-status">
              <i class="fas fa-circle"></i>
              <span>Connecting...</span>
            </span>
          </div>
        </div>
        
        <div class="chat-body">
          <div class="chat-messages" id="chat-messages">
            <div class="welcome-message">
              <div class="message-content">
                <p>Welcome to Traders Helmet Academy support chat!</p>
                <p>Our team is here to help you with any questions.</p>
              </div>
            </div>
          </div>
          
          <div class="typing-indicator" id="typing-indicator" style="display: none;">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="typing-text">Someone is typing...</span>
          </div>
        </div>
        
        <div class="chat-footer">
          <div class="message-input-container">
            <div class="input-group">
              <button class="file-upload-btn" id="file-upload-btn" title="Upload file">
                <i class="fas fa-paperclip"></i>
              </button>
              <input type="file" id="file-input" accept="${this.allowedFileTypes.join(',')}" style="display: none;">
              
              <div class="message-input-wrapper">
                <textarea 
                  id="message-input" 
                  class="message-input" 
                  placeholder="Type your message..."
                  maxlength="${this.maxMessageLength}"
                  rows="1"
                ></textarea>
                <div class="message-counter">
                  <span id="char-counter">0</span>/${this.maxMessageLength}
                </div>
              </div>
              
              <button class="send-button" id="send-button" disabled>
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Store UI element references
    this.chatContainer = container.querySelector('.chat-system');
    this.messagesContainer = container.querySelector('#chat-messages');
    this.messageInput = container.querySelector('#message-input');
    this.sendButton = container.querySelector('#send-button');
    this.fileInput = container.querySelector('#file-input');
    this.fileUploadBtn = container.querySelector('#file-upload-btn');
    this.typingIndicator = container.querySelector('#typing-indicator');
    this.connectionStatus = container.querySelector('#connection-status');
    this.charCounter = container.querySelector('#char-counter');

    this.setupEventListeners();
    this.applyChatStyles();
  }

  /**
   * Apply chat styles
   */
  applyChatStyles() {
    const styles = `
      .chat-system {
        display: flex;
        flex-direction: column;
        height: 600px;
        max-height: 80vh;
        background: var(--white);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.1);
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg);
        background: var(--gradient-primary);
        color: var(--white);
      }

      .chat-title {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin: 0;
        font-size: var(--font-size-lg);
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: var(--font-size-sm);
        opacity: 0.9;
      }

      .connection-status.connected .fa-circle {
        color: var(--success);
      }

      .connection-status.disconnected .fa-circle {
        color: var(--danger);
      }

      .connection-status.connecting .fa-circle {
        color: var(--warning);
        animation: pulse 2s infinite;
      }

      .chat-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-md);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .welcome-message {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--gray);
        border-bottom: 1px solid rgba(0,0,0,0.1);
        margin-bottom: var(--spacing-md);
      }

      .message {
        display: flex;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
        animation: fadeInUp 0.3s ease-out;
      }

      .message.own {
        flex-direction: row-reverse;
      }

      .message-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--gradient-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-weight: var(--font-weight-semibold);
        font-size: var(--font-size-sm);
        flex-shrink: 0;
      }

      .message.own .message-avatar {
        background: var(--gradient-cream);
        color: var(--primary-deep-blue);
      }

      .message-bubble {
        max-width: 70%;
        background: var(--light-gray);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        position: relative;
      }

      .message.own .message-bubble {
        background: var(--gradient-primary);
        color: var(--white);
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
      }

      .message-author {
        font-weight: var(--font-weight-semibold);
        font-size: var(--font-size-sm);
      }

      .message-time {
        font-size: var(--font-size-xs);
        opacity: 0.7;
      }

      .message-content {
        word-wrap: break-word;
        line-height: 1.4;
      }

      .message-file {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        background: rgba(0,0,0,0.05);
        border-radius: var(--radius-md);
        margin-top: var(--spacing-sm);
      }

      .message.own .message-file {
        background: rgba(255,255,255,0.1);
      }

      .typing-indicator {
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        color: var(--gray);
        font-size: var(--font-size-sm);
      }

      .typing-dots {
        display: flex;
        gap: 2px;
      }

      .typing-dots span {
        width: 6px;
        height: 6px;
        background: var(--gray);
        border-radius: 50%;
        animation: typingBounce 1.4s infinite;
      }

      .typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }

      .chat-footer {
        padding: var(--spacing-md);
        background: var(--light-gray);
        border-top: 1px solid rgba(0,0,0,0.1);
      }

      .input-group {
        display: flex;
        align-items: flex-end;
        gap: var(--spacing-sm);
      }

      .file-upload-btn {
        padding: var(--spacing-md);
        background: var(--primary-blue);
        color: var(--white);
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-normal);
        flex-shrink: 0;
      }

      .file-upload-btn:hover {
        background: var(--primary-deep-blue);
        transform: translateY(-1px);
      }

      .message-input-wrapper {
        flex: 1;
        position: relative;
      }

      .message-input {
        width: 100%;
        min-height: 44px;
        max-height: 120px;
        padding: var(--spacing-md);
        border: 2px solid #e0e0e0;
        border-radius: var(--radius-lg);
        font-family: inherit;
        font-size: var(--font-size-base);
        resize: none;
        outline: none;
        transition: all var(--transition-normal);
      }

      .message-input:focus {
        border-color: var(--primary-blue);
        box-shadow: 0 0 0 3px rgba(42, 82, 152, 0.1);
      }

      .message-counter {
        position: absolute;
        bottom: 4px;
        right: 8px;
        font-size: var(--font-size-xs);
        color: var(--gray);
        pointer-events: none;
      }

      .send-button {
        padding: var(--spacing-md);
        background: var(--primary-blue);
        color: var(--white);
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-normal);
        flex-shrink: 0;
      }

      .send-button:hover:not(:disabled) {
        background: var(--primary-deep-blue);
        transform: translateY(-1px);
      }

      .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      @keyframes typingBounce {
        0%, 60%, 100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-10px);
        }
      }

      @media (max-width: 768px) {
        .chat-system {
          height: 500px;
        }

        .message-bubble {
          max-width: 85%;
        }

        .chat-header {
          padding: var(--spacing-md);
        }

        .chat-title {
          font-size: var(--font-size-base);
        }
      }
    `;

    // Inject styles if not already present
    if (!document.getElementById('chat-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'chat-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.messageInput || !this.sendButton) return;

    // Message input events
    this.messageInput.addEventListener('input', (e) => {
      this.handleInputChange(e);
      this.handleTyping();
    });

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button click
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // File upload events
    this.fileUploadBtn?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files[0]);
    });

    // Auto-resize textarea
    this.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });
  }

  /**
   * Handle input changes
   */
  handleInputChange(e) {
    const length = e.target.value.length;
    if (this.charCounter) {
      this.charCounter.textContent = length;
    }

    // Enable/disable send button
    if (this.sendButton) {
      this.sendButton.disabled = length === 0 || length > this.maxMessageLength;
    }
  }

  /**
   * Auto-resize textarea
   */
  autoResizeTextarea() {
    if (!this.messageInput) return;
    
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
  }

  /**
   * Handle typing indicator
   */
  handleTyping() {
    if (!this.currentRoom || !this.currentUser) return;

    // Clear previous typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Send typing event to other users
    if (window.supabaseManager?.supabase) {
      window.supabaseManager.supabase
        .channel(`typing:${this.currentRoom}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: this.currentUser.id,
            user_name: this.getUserDisplayName(this.currentUser),
            typing: true
          }
        });
    }

    // Stop typing after 3 seconds
    this.typingTimeout = setTimeout(() => {
      if (window.supabaseManager?.supabase) {
        window.supabaseManager.supabase
          .channel(`typing:${this.currentRoom}`)
          .send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              user_id: this.currentUser.id,
              typing: false
            }
          });
      }
    }, 3000);
  }

  /**
   * Connect to chat room
   */
  async connectToRoom(roomId) {
    if (!window.supabaseManager) {
      console.error('Supabase manager not available');
      return;
    }

    try {
      this.currentRoom = roomId;
      
      // Load existing messages
      await this.loadMessages(roomId);
      
      // Subscribe to new messages
      const messagesChannel = window.supabaseManager.subscribeToChat(roomId);
      
      // Listen for real-time events
      window.supabaseManager.on(`realtime:chat:${roomId}`, (payload) => {
        this.handleRealtimeMessage(payload);
      });

      // Subscribe to typing indicators
      const typingChannel = window.supabaseManager.supabase
        .channel(`typing:${roomId}`)
        .on('broadcast', { event: 'typing' }, (payload) => {
          this.handleTypingEvent(payload.payload);
        })
        .subscribe();

      this.updateConnectionStatus('connected');
      console.log('✅ Connected to chat room:', roomId);
      
    } catch (error) {
      console.error('❌ Failed to connect to chat room:', error);
      this.updateConnectionStatus('disconnected');
    }
  }

  /**
   * Disconnect from current room
   */
  disconnectFromRoom() {
    if (this.currentRoom && window.supabaseManager) {
      window.supabaseManager.unsubscribeFromChannel(`chat:${this.currentRoom}`);
      window.supabaseManager.unsubscribeFromChannel(`typing:${this.currentRoom}`);
    }
    
    this.currentRoom = null;
    this.updateConnectionStatus('disconnected');
  }

  /**
   * Load existing messages
   */
  async loadMessages(roomId) {
    if (!window.supabaseManager) return;

    try {
      const result = await window.supabaseManager.getChatMessages(roomId, this.messageHistory);
      
      if (result.success) {
        this.messages.set(roomId, result.data);
        this.renderMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  /**
   * Handle real-time message updates
   */
  handleRealtimeMessage(payload) {
    const { eventType, new: newMessage, old: oldMessage } = payload;
    
    switch (eventType) {
      case 'INSERT':
        this.addMessage(newMessage);
        break;
      case 'UPDATE':
        this.updateMessage(newMessage);
        break;
      case 'DELETE':
        this.removeMessage(oldMessage);
        break;
    }
  }

  /**
   * Handle typing events
   */
  handleTypingEvent(payload) {
    const { user_id, user_name, typing } = payload;
    
    if (user_id === this.currentUser?.id) return; // Ignore own typing events
    
    if (typing) {
      this.typingUsers.add(user_name || 'Someone');
    } else {
      this.typingUsers.delete(user_name || 'Someone');
    }
    
    this.updateTypingIndicator();
  }

  /**
   * Update typing indicator
   */
  updateTypingIndicator() {
    if (!this.typingIndicator) return;
    
    if (this.typingUsers.size > 0) {
      const users = Array.from(this.typingUsers);
      let text;
      
      if (users.length === 1) {
        text = `${users[0]} is typing...`;
      } else if (users.length === 2) {
        text = `${users[0]} and ${users[1]} are typing...`;
      } else {
        text = `${users.length} people are typing...`;
      }
      
      this.typingIndicator.querySelector('.typing-text').textContent = text;
      this.typingIndicator.style.display = 'flex';
    } else {
      this.typingIndicator.style.display = 'none';
    }
  }

  /**
   * Send message
   */
  async sendMessage() {
    if (!this.messageInput || !this.currentRoom || !this.currentUser) return;
    
    const message = this.messageInput.value.trim();
    if (!message || message.length > this.maxMessageLength) return;
    
    // Rate limiting check
    if (!this.checkRateLimit()) {
      tradersHelmet?.showNotification('You are sending messages too quickly. Please slow down.', 'warning');
      return;
    }

    try {
      // Disable input while sending
      this.setInputState(false);
      
      const result = await window.supabaseManager.sendChatMessage(this.currentRoom, message);
      
      if (result.success) {
        this.messageInput.value = '';
        this.handleInputChange({ target: { value: '' } });
        this.autoResizeTextarea();
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      tradersHelmet?.showNotification('Failed to send message. Please try again.', 'error');
    } finally {
      this.setInputState(true);
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset count if more than a minute has passed
    if (now - this.lastMessageTime > oneMinute) {
      this.messageCount = 0;
    }
    
    this.messageCount++;
    this.lastMessageTime = now;
    
    return this.messageCount <= this.maxMessagesPerMinute;
  }

  /**
   * Set input state (enabled/disabled)
   */
  setInputState(enabled) {
    if (this.messageInput) this.messageInput.disabled = !enabled;
    if (this.sendButton) this.sendButton.disabled = !enabled;
    if (this.fileUploadBtn) this.fileUploadBtn.disabled = !enabled;
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(file) {
    if (!file || !this.currentRoom || !this.currentUser) return;
    
    // Validate file
    if (!this.validateFile(file)) return;
    
    try {
      this.setInputState(false);
      tradersHelmet?.showNotification('Uploading file...', 'info');
      
      // Upload file to Supabase storage
      const fileName = `${Date.now()}_${file.name}`;
      const result = await window.supabaseManager.uploadFile('chat-files', fileName, file);
      
      if (result.success) {
        const fileUrl = window.supabaseManager.getFileUrl('chat-files', fileName);
        
        // Send file message
        const fileMessage = {
          type: 'file',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileUrl: fileUrl
        };
        
        await window.supabaseManager.sendChatMessage(
          this.currentRoom, 
          JSON.stringify(fileMessage), 
          'file'
        );
        
        tradersHelmet?.showNotification('File uploaded successfully!', 'success');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('File upload failed:', error);
      tradersHelmet?.showNotification('File upload failed. Please try again.', 'error');
    } finally {
      this.setInputState(true);
      if (this.fileInput) this.fileInput.value = '';
    }
  }

  /**
   * Validate file upload
   */
  validateFile(file) {
    if (!this.allowFileUpload) {
      tradersHelmet?.showNotification('File uploads are not allowed.', 'error');
      return false;
    }
    
    if (file.size > this.maxFileSize) {
      const maxSizeMB = this.maxFileSize / (1024 * 1024);
      tradersHelmet?.showNotification(`File size must be less than ${maxSizeMB}MB.`, 'error');
      return false;
    }
    
    if (!this.allowedFileTypes.includes(file.type)) {
      tradersHelmet?.showNotification('File type not allowed.', 'error');
      return false;
    }
    
    return true;
  }

  /**
   * Add message to UI
   */
  addMessage(message) {
    if (!this.messagesContainer) return;
    
    const messageElement = this.createMessageElement(message);
    this.messagesContainer.appendChild(messageElement);
    
    // Remove old messages to maintain history limit
    const messages = this.messagesContainer.querySelectorAll('.message');
    if (messages.length > this.messageHistory) {
      messages[0].remove();
    }
    
    // Scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Create message element
   */
  createMessageElement(message) {
    const isOwn = message.user_id === this.currentUser?.id;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : ''}`;
    messageDiv.dataset.messageId = message.id;
    
    const displayName = this.getUserDisplayName(message.user_profiles);
    const avatar = this.getUserAvatar(message.user_profiles);
    const time = THA_Utils.date.format(message.created_at, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let messageContent = '';
    
    if (message.message_type === 'file') {
      const fileData = JSON.parse(message.message);
      messageContent = this.createFileMessage(fileData);
    } else {
      messageContent = this.escapeHtml(message.message);
    }
    
    messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-bubble">
        <div class="message-header">
          <span class="message-author">${displayName}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${messageContent}</div>
      </div>
    `;
    
    return messageDiv;
  }

  /**
   * Create file message content
   */
  createFileMessage(fileData) {
    const isImage = fileData.fileType.startsWith('image/');
    const fileSize = THA_Utils.string.formatFileSize ? 
      THA_Utils.string.formatFileSize(fileData.fileSize) : 
      Math.round(fileData.fileSize / 1024) + ' KB';
    
    if (isImage) {
      return `
        <img src="${fileData.fileUrl}" alt="${fileData.fileName}" 
             style="max-width: 200px; max-height: 200px; border-radius: 8px; cursor: pointer;"
             onclick="window.open('${fileData.fileUrl}', '_blank')">
        <div class="message-file">
          <i class="fas fa-image"></i>
          <div>
            <div style="font-weight: 600;">${fileData.fileName}</div>
            <div style="font-size: 0.8em; opacity: 0.7;">${fileSize}</div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="message-file">
          <i class="fas fa-file"></i>
          <div>
            <div style="font-weight: 600;">${fileData.fileName}</div>
            <div style="font-size: 0.8em; opacity: 0.7;">${fileSize}</div>
          </div>
          <a href="${fileData.fileUrl}" target="_blank" class="btn btn-sm">
            <i class="fas fa-download"></i>
          </a>
        </div>
      `;
    }
  }

  /**
   * Get user display name
   */
  getUserDisplayName(userProfile) {
    if (!userProfile) return 'Anonymous';
    
    const firstName = userProfile.first_name || '';
    const lastName = userProfile.last_name || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return userProfile.email?.split('@')[0] || 'User';
  }

  /**
   * Get user avatar
   */
  getUserAvatar(userProfile) {
    if (userProfile?.avatar_url) {
      return `<img src="${userProfile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
    
    const displayName = this.getUserDisplayName(userProfile);
    return THA_Utils.string.getInitials(displayName);
  }

  /**
   * Render messages
   */
  renderMessages(messages) {
    if (!this.messagesContainer) return;
    
    // Clear existing messages (except welcome message)
    const existingMessages = this.messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Add all messages
    messages.forEach(message => {
      this.addMessage(message);
    });
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status) {
    if (!this.connectionStatus) return;
    
    const statusText = this.connectionStatus.querySelector('span');
    const statusIcon = this.connectionStatus.querySelector('i');
    
    this.connectionStatus.className = `connection-status ${status}`;
    
    switch (status) {
      case 'connected':
        statusText.textContent = 'Connected';
        break;
      case 'connecting':
        statusText.textContent = 'Connecting...';
        break;
      case 'disconnected':
        statusText.textContent = 'Disconnected';
        break;
    }
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    if (this.messagesContainer) {
      const messages = this.messagesContainer.querySelectorAll('.message');
      messages.forEach(msg => msg.remove());
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy chat system
   */
  destroy() {
    this.disconnectFromRoom();
    this.clearMessages();
    
    if (this.chatContainer) {
      this.chatContainer.remove();
    }
    
    // Remove event listeners
    if (window.supabaseManager) {
      window.supabaseManager.off('userLogin');
      window.supabaseManager.off('userLogout');
    }
  }
}

// Create global instance
const chatSystem = new ChatSystem();

// Make available globally
if (typeof window !== 'undefined') {
  window.chatSystem = chatSystem;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatSystem;
}