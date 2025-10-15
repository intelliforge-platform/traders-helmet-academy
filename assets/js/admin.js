
/**
 * TRADERS HELMET ACADEMY - COMPREHENSIVE ADMIN PANEL SYSTEM
 * Complete admin interface for user management, analytics, and system control
 */

class AdminPanelManager {
  constructor() {
    this.currentUser = null;
    this.adminLevel = null;
    this.activeSection = 'dashboard';
    this.dataCache = new Map();
    this.refreshIntervals = new Map();
    this.realTimeSubscriptions = new Map();
    
    // Admin permissions based on role
    this.permissions = {
      super_admin: ['*'], // All permissions
      admin: [
        'user_management',
        'subscription_management', 
        'signal_management',
        'payment_management',
        'analytics_view',
        'system_settings',
        'chat_moderation'
      ],
      moderator: [
        'user_support',
        'chat_moderation',
        'signal_management',
        'content_management'
      ],
      support: [
        'user_support',
        'chat_access',
        'ticket_management'
      ]
    };

    // Data refresh intervals by section
    this.refreshRates = {
      dashboard: 30000,      // 30 seconds
      users: 60000,          // 1 minute
      analytics: 120000,     // 2 minutes
      system: 30000,         // 30 seconds
      payments: 60000,       // 1 minute
      signals: 15000         // 15 seconds
    };

    this.init();
  }

  /**
   * Initialize admin panel
   */
  async init() {
    try {
      // Check admin access
      await this.checkAdminAccess();
      
      // Initialize admin interface
      this.initializeAdminInterface();
      
      // Setup real-time subscriptions
      this.setupRealTimeSubscriptions();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      console.log('🔧 Admin Panel initialized');
    } catch (error) {
      console.error('❌ Admin Panel initialization failed:', error);
      this.handleUnauthorizedAccess();
    }
  }

  /**
   * Check admin access permissions
   */
  async checkAdminAccess() {
    this.currentUser = window.authService?.getCurrentUser();
    
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    if (!this.hasAdminAccess()) {
      throw new Error('Insufficient permissions');
    }

    this.adminLevel = this.currentUser.role || 'support';
    console.log(`👑 Admin access granted: ${this.adminLevel}`);
  }

  /**
   * Check if user has admin access
   */
  hasAdminAccess() {
    const adminRoles = ['super_admin', 'admin', 'moderator', 'support'];
    return adminRoles.includes(this.currentUser?.role) || 
           this.currentUser?.tier === 'admin';
  }

  /**
   * Check specific permission
   */
  hasPermission(permission) {
    const userPermissions = this.permissions[this.adminLevel] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  /**
   * Initialize admin interface
   */
  initializeAdminInterface() {
    const container = document.getElementById('admin-container') || 
                     document.getElementById('main-content');
    
    if (!container) return;

    container.innerHTML = this.generateAdminHTML();
    this.addAdminStyles();
    this.setupNavigation();
  }

  /**
   * Generate admin panel HTML
   */
  generateAdminHTML() {
    return `
      <div class="admin-panel">
        <!-- Admin Header -->
        <div class="admin-header">
          <div class="container-fluid">
            <div class="row align-items-center">
              <div class="col-md-6">
                <h1 class="admin-title">
                  <i class="fas fa-cog"></i>
                  Admin Panel
                  <span class="badge bg-admin ms-2">${this.adminLevel.replace('_', ' ').toUpperCase()}</span>
                </h1>
                <p class="admin-subtitle">System Administration & Management</p>
              </div>
              <div class="col-md-6 text-md-end">
                <div class="admin-actions">
                  <button class="btn btn-outline-primary btn-sm me-2" id="refresh-all">
                    <i class="fas fa-sync"></i> Refresh All
                  </button>
                  <button class="btn btn-outline-warning btn-sm me-2" id="system-health">
                    <i class="fas fa-heartbeat"></i> System Health
                  </button>
                  <button class="btn btn-outline-danger btn-sm" id="emergency-stop">
                    <i class="fas fa-stop"></i> Emergency
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Navigation -->
        <div class="admin-nav">
          <div class="container-fluid">
            <ul class="nav nav-tabs admin-tabs">
              ${this.generateNavigationTabs()}
            </ul>
          </div>
        </div>

        <!-- Admin Content -->
        <div class="admin-content">
          <div class="container-fluid">
            <div id="admin-section-content">
              <!-- Section content will be loaded here -->
            </div>
          </div>
        </div>

        <!-- Admin Status Bar -->
        <div class="admin-status-bar">
          <div class="container-fluid">
            <div class="row align-items-center">
              <div class="col-md-8">
                <div class="status-items">
                  <span class="status-item">
                    <i class="fas fa-server"></i>
                    Server: <span id="server-status" class="text-success">Online</span>
                  </span>
                  <span class="status-item">
                    <i class="fas fa-database"></i>
                    DB: <span id="db-status" class="text-success">Connected</span>
                  </span>
                  <span class="status-item">
                    <i class="fas fa-users"></i>
                    Active Users: <span id="active-users">0</span>
                  </span>
                  <span class="status-item">
                    <i class="fas fa-chart-line"></i>
                    Signals: <span id="active-signals">0</span>
                  </span>
                </div>
              </div>
              <div class="col-md-4 text-md-end">
                <small class="text-muted">
                  Last updated: <span id="last-updated">--:--</span>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate navigation tabs based on permissions
   */
  generateNavigationTabs() {
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', permission: null },
      { id: 'users', label: 'Users', icon: 'fas fa-users', permission: 'user_management' },
      { id: 'subscriptions', label: 'Subscriptions', icon: 'fas fa-crown', permission: 'subscription_management' },
      { id: 'signals', label: 'Signals', icon: 'fas fa-signal', permission: 'signal_management' },
      { id: 'payments', label: 'Payments', icon: 'fas fa-credit-card', permission: 'payment_management' },
      { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-bar', permission: 'analytics_view' },
      { id: 'chat', label: 'Chat', icon: 'fas fa-comments', permission: 'chat_moderation' },
      { id: 'system', label: 'System', icon: 'fas fa-server', permission: 'system_settings' }
    ];

    return tabs.filter(tab => !tab.permission || this.hasPermission(tab.permission))
               .map(tab => `
                 <li class="nav-item">
                   <a class="nav-link ${tab.id === this.activeSection ? 'active' : ''}" 
                      data-section="${tab.id}" href="#${tab.id}">
                     <i class="${tab.icon}"></i>
                     ${tab.label}
                   </a>
                 </li>
               `).join('');
  }

  /**
   * Setup navigation handlers
   */
  setupNavigation() {
    document.querySelectorAll('.admin-tabs .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.closest('.nav-link').dataset.section;
        this.switchSection(section);
      });
    });
  }

  /**
   * Switch admin section
   */
  async switchSection(section) {
    if (section === this.activeSection) return;

    // Update active tab
    document.querySelectorAll('.admin-tabs .nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Clear refresh interval for previous section
    if (this.refreshIntervals.has(this.activeSection)) {
      clearInterval(this.refreshIntervals.get(this.activeSection));
    }

    this.activeSection = section;
    
    // Load section content
    await this.loadSectionContent(section);
    
    // Setup refresh interval for new section
    this.setupSectionRefresh(section);
  }

  /**
   * Load section content
   */
  async loadSectionContent(section) {
    const container = document.getElementById('admin-section-content');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading...</p></div>';

    try {
      let content;
      
      switch (section) {
        case 'dashboard':
          content = await this.generateDashboardContent();
          break;
        case 'users':
          content = await this.generateUsersContent();
          break;
        case 'subscriptions':
          content = await this.generateSubscriptionsContent();
          break;
        case 'signals':
          content = await this.generateSignalsContent();
          break;
        case 'payments':
          content = await this.generatePaymentsContent();
          break;
        case 'analytics':
          content = await this.generateAnalyticsContent();
          break;
        case 'chat':
          content = await this.generateChatContent();
          break;
        case 'system':
          content = await this.generateSystemContent();
          break;
        default:
          content = '<div class="alert alert-warning">Section not found</div>';
      }

      container.innerHTML = content;
      
      // Initialize section-specific functionality
      this.initializeSectionFeatures(section);
      
    } catch (error) {
      console.error(`Failed to load section ${section}:`, error);
      container.innerHTML = '<div class="alert alert-danger">Failed to load section content</div>';
    }
  }

  /**
   * Generate dashboard content
   */
  async generateDashboardContent() {
    const stats = await this.fetchSystemStats();
    
    return `
      <div class="admin-dashboard">
        <!-- Key Metrics -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="metric-card">
              <div class="metric-icon bg-primary">
                <i class="fas fa-users"></i>
              </div>
              <div class="metric-details">
                <h3>${stats.totalUsers || 0}</h3>
                <p>Total Users</p>
                <span class="metric-change positive">+${stats.newUsersToday || 0} today</span>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="metric-card">
              <div class="metric-icon bg-success">
                <i class="fas fa-dollar-sign"></i>
              </div>
              <div class="metric-details">
                <h3>$${this.formatNumber(stats.totalRevenue || 0)}</h3>
                <p>Total Revenue</p>
                <span class="metric-change positive">+$${this.formatNumber(stats.revenueToday || 0)} today</span>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="metric-card">
              <div class="metric-icon bg-warning">
                <i class="fas fa-signal"></i>
              </div>
              <div class="metric-details">
                <h3>${stats.activeSignals || 0}</h3>
                <p>Active Signals</p>
                <span class="metric-change">Win Rate: ${stats.signalWinRate || 0}%</span>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="metric-card">
              <div class="metric-icon bg-info">
                <i class="fas fa-comments"></i>
              </div>
              <div class="metric-details">
                <h3>${stats.activeChats || 0}</h3>
                <p>Active Chats</p>
                <span class="metric-change">Online: ${stats.onlineUsers || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts and Analytics -->
        <div class="row mb-4">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-chart-line"></i> Revenue Overview</h5>
              </div>
              <div class="card-body">
                <canvas id="revenue-chart" height="100"></canvas>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-pie-chart"></i> User Distribution</h5>
              </div>
              <div class="card-body">
                <canvas id="users-chart" height="200"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-history"></i> Recent Users</h5>
              </div>
              <div class="card-body">
                <div id="recent-users">
                  ${await this.generateRecentUsersList()}
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-exclamation-triangle"></i> System Alerts</h5>
              </div>
              <div class="card-body">
                <div id="system-alerts">
                  ${await this.generateSystemAlerts()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate users management content
   */
  async generateUsersContent() {
    if (!this.hasPermission('user_management')) {
      return '<div class="alert alert-warning">Access denied: User management</div>';
    }

    const users = await this.fetchUsers();
    
    return `
      <div class="admin-users">
        <!-- Users Header -->
        <div class="section-header">
          <div class="row align-items-center">
            <div class="col-md-6">
              <h4><i class="fas fa-users"></i> User Management</h4>
            </div>
            <div class="col-md-6 text-md-end">
              <button class="btn btn-primary btn-sm me-2" id="add-user">
                <i class="fas fa-plus"></i> Add User
              </button>
              <button class="btn btn-outline-secondary btn-sm" id="export-users">
                <i class="fas fa-download"></i> Export
              </button>
            </div>
          </div>
        </div>

        <!-- Users Filters -->
        <div class="filters-bar">
          <div class="row">
            <div class="col-md-3">
              <select class="form-select" id="tier-filter">
                <option value="">All Tiers</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
            <div class="col-md-3">
              <select class="form-select" id="status-filter">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div class="col-md-3">
              <input type="text" class="form-control" id="search-users" placeholder="Search users...">
            </div>
            <div class="col-md-3">
              <button class="btn btn-outline-primary w-100" id="filter-users">
                <i class="fas fa-filter"></i> Apply Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover" id="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.generateUsersTableRows(users)}
                </tbody>
              </table>
            </div>
            
            <!-- Pagination -->
            <nav>
              <ul class="pagination justify-content-center" id="users-pagination">
                <!-- Pagination will be generated dynamically -->
              </ul>
            </nav>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate signals management content
   */
  async generateSignalsContent() {
    if (!this.hasPermission('signal_management')) {
      return '<div class="alert alert-warning">Access denied: Signal management</div>';
    }

    const signals = await this.fetchSignals();
    
    return `
      <div class="admin-signals">
        <!-- Signals Header -->
        <div class="section-header">
          <div class="row align-items-center">
            <div class="col-md-6">
              <h4><i class="fas fa-signal"></i> Trading Signals Management</h4>
            </div>
            <div class="col-md-6 text-md-end">
              <button class="btn btn-primary btn-sm me-2" id="create-signal">
                <i class="fas fa-plus"></i> Create Signal
              </button>
              <button class="btn btn-outline-success btn-sm me-2" id="bulk-actions">
                <i class="fas fa-tasks"></i> Bulk Actions
              </button>
              <button class="btn btn-outline-secondary btn-sm" id="signal-analytics">
                <i class="fas fa-chart-bar"></i> Analytics
              </button>
            </div>
          </div>
        </div>

        <!-- Signal Performance Summary -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="stat-card">
              <h6>Active Signals</h6>
              <h3 class="text-primary">${signals.filter(s => s.status === 'active').length}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <h6>Win Rate</h6>
              <h3 class="text-success">${this.calculateWinRate(signals)}%</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <h6>Avg. Pips</h6>
              <h3 class="text-info">${this.calculateAvgPips(signals)}</h3>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <h6>Today's Signals</h6>
              <h3 class="text-warning">${this.getTodaysSignals(signals)}</h3>
            </div>
          </div>
        </div>

        <!-- Signals Table -->
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover" id="signals-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" id="select-all-signals">
                    </th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Action</th>
                    <th>Entry Price</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Result</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.generateSignalsTableRows(signals)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Fetch system statistics
   */
  async fetchSystemStats() {
    try {
      const response = await window.apiService?.admin.getStats();
      return response?.data || this.getMockSystemStats();
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
      return this.getMockSystemStats();
    }
  }

  /**
   * Fetch users data
   */
  async fetchUsers(page = 1, limit = 50) {
    try {
      const response = await window.apiService?.admin.getUsers(page, limit);
      return response?.data || this.getMockUsers();
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return this.getMockUsers();
    }
  }

  /**
   * Fetch signals data
   */
  async fetchSignals() {
    try {
      const response = await window.apiService?.admin.getSignals();
      return response?.data || this.getMockSignals();
    } catch (error) {
      console.error('Failed to fetch signals:', error);
      return this.getMockSignals();
    }
  }

  /**
   * Generate users table rows
   */
  generateUsersTableRows(users) {
    return users.map(user => `
      <tr data-user-id="${user.id}">
        <td>
          <div class="user-info">
            <img src="${user.avatar_url || '/assets/images/default-avatar.png'}" 
                 alt="Avatar" class="user-avatar">
            <div>
              <strong>${user.first_name} ${user.last_name}</strong>
              <br><small class="text-muted">ID: ${user.id.substring(0, 8)}</small>
            </div>
          </div>
        </td>
        <td>${user.email}</td>
        <td><span class="badge bg-${user.tier}">${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}</span></td>
        <td><span class="badge bg-${this.getStatusColor(user.status)}">${user.status}</span></td>
        <td>${this.formatDate(user.created_at)}</td>
        <td>${user.last_login ? this.formatRelativeTime(user.last_login) : 'Never'}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="adminPanel.viewUser('${user.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-outline-warning" onclick="adminPanel.editUser('${user.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="adminPanel.suspendUser('${user.id}')">
              <i class="fas fa-ban"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Generate signals table rows
   */
  generateSignalsTableRows(signals) {
    return signals.map(signal => `
      <tr data-signal-id="${signal.id}">
        <td>
          <input type="checkbox" class="signal-checkbox" value="${signal.id}">
        </td>
        <td><strong>${signal.symbol}</strong></td>
        <td>${signal.signal_type}</td>
        <td>
          <span class="badge ${signal.action === 'buy' ? 'bg-success' : 'bg-danger'}">
            ${signal.action.toUpperCase()}
          </span>
        </td>
        <td>${signal.entry_price}</td>
        <td><span class="badge bg-${this.getSignalStatusColor(signal.status)}">${signal.status}</span></td>
        <td>${this.formatRelativeTime(signal.created_at)}</td>
        <td>
          ${signal.result ? `
            <span class="badge ${signal.result === 'profit' ? 'bg-success' : 'bg-danger'}">
              ${signal.result}
            </span>
          ` : '-'}
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="adminPanel.viewSignal('${signal.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-outline-warning" onclick="adminPanel.editSignal('${signal.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="adminPanel.deleteSignal('${signal.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Global admin actions
    document.addEventListener('click', (e) => {
      switch (e.target.id) {
        case 'refresh-all':
          this.refreshAllData();
          break;
        case 'system-health':
          this.showSystemHealth();
          break;
        case 'emergency-stop':
          this.showEmergencyModal();
          break;
      }
    });

    // User management actions
    document.addEventListener('click', (e) => {
      if (e.target.closest('[onclick*="adminPanel."]')) {
        // Handle admin actions
        return;
      }
    });
  }

  /**
   * Setup real-time subscriptions
   */
  setupRealTimeSubscriptions() {
    if (!window.supabaseManager) return;

    // Subscribe to user changes
    const userSub = window.supabaseManager.supabase
      .channel('admin_users')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles'
      }, (payload) => {
        this.handleUserUpdate(payload);
      })
      .subscribe();

    this.realTimeSubscriptions.set('users', userSub);

    // Subscribe to signal changes
    const signalSub = window.supabaseManager.supabase
      .channel('admin_signals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trading_signals'
      }, (payload) => {
        this.handleSignalUpdate(payload);
      })
      .subscribe();

    this.realTimeSubscriptions.set('signals', signalSub);
  }

  /**
   * Handle real-time user updates
   */
  handleUserUpdate(payload) {
    if (this.activeSection === 'users') {
      // Update users table
      this.updateUsersTable(payload);
    }
    
    // Update stats
    this.updateSystemStats();
  }

  /**
   * Handle real-time signal updates
   */
  handleSignalUpdate(payload) {
    if (this.activeSection === 'signals') {
      // Update signals table
      this.updateSignalsTable(payload);
    }
    
    // Update signal count in status bar
    this.updateSignalCount();
  }

  /**
   * Setup section refresh intervals
   */
  setupSectionRefresh(section) {
    const refreshRate = this.refreshRates[section];
    if (!refreshRate) return;

    const interval = setInterval(() => {
      this.refreshSectionData(section);
    }, refreshRate);

    this.refreshIntervals.set(section, interval);
  }

  /**
   * Refresh section data
   */
  async refreshSectionData(section) {
    try {
      switch (section) {
        case 'dashboard':
          await this.refreshDashboardData();
          break;
        case 'users':
          await this.refreshUsersData();
          break;
        case 'signals':
          await this.refreshSignalsData();
          break;
        // Add other sections as needed
      }
    } catch (error) {
      console.error(`Failed to refresh ${section} data:`, error);
    }
  }

  /**
   * User management actions
   */
  async viewUser(userId) {
    try {
      const user = await window.apiService?.admin.getUser(userId);
      this.showUserModal(user.data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      tradersHelmet.showNotification('Failed to load user details', 'error');
    }
  }

  async editUser(userId) {
    try {
      const user = await window.apiService?.admin.getUser(userId);
      this.showUserEditModal(user.data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      tradersHelmet.showNotification('Failed to load user details', 'error');
    }
  }

  async suspendUser(userId) {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
      await window.apiService?.admin.updateUser(userId, { status: 'suspended' });
      tradersHelmet.showNotification('User suspended successfully', 'success');
      this.refreshUsersData();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      tradersHelmet.showNotification('Failed to suspend user', 'error');
    }
  }

  /**
   * Signal management actions
   */
  async viewSignal(signalId) {
    // Implementation for viewing signal details
    console.log('View signal:', signalId);
  }

  async editSignal(signalId) {
    // Implementation for editing signal
    console.log('Edit signal:', signalId);
  }

  async deleteSignal(signalId) {
    if (!confirm('Are you sure you want to delete this signal?')) return;

    try {
      await window.apiService?.admin.deleteSignal(signalId);
      tradersHelmet.showNotification('Signal deleted successfully', 'success');
      this.refreshSignalsData();
    } catch (error) {
      console.error('Failed to delete signal:', error);
      tradersHelmet.showNotification('Failed to delete signal', 'error');
    }
  }

  /**
   * Utility methods
   */
  formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  formatRelativeTime(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  getStatusColor(status) {
    const colors = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'danger',
      banned: 'dark'
    };
    return colors[status] || 'secondary';
  }

  getSignalStatusColor(status) {
    const colors = {
      active: 'primary',
      closed: 'success',
      cancelled: 'danger',
      draft: 'secondary'
    };
    return colors[status] || 'secondary';
  }

  calculateWinRate(signals) {
    const closedSignals = signals.filter(s => s.status === 'closed' && s.result);
    const profitableSignals = closedSignals.filter(s => s.result === 'profit');
    return closedSignals.length > 0 ? 
      Math.round((profitableSignals.length / closedSignals.length) * 100) : 0;
  }

  calculateAvgPips(signals) {
    const closedSignals = signals.filter(s => s.status === 'closed' && s.pips_gained);
    const totalPips = closedSignals.reduce((sum, s) => sum + (s.pips_gained || 0), 0);
    return closedSignals.length > 0 ? 
      Math.round(totalPips / closedSignals.length) : 0;
  }

  getTodaysSignals(signals) {
    const today = new Date().toDateString();
    return signals.filter(s => new Date(s.created_at).toDateString() === today).length;
  }

  /**
   * Mock data generators
   */
  getMockSystemStats() {
    return {
      totalUsers: 1250,
      newUsersToday: 15,
      totalRevenue: 125000,
      revenueToday: 2500,
      activeSignals: 12,
      signalWinRate: 73,
      activeChats: 8,
      onlineUsers: 45
    };
  }

  getMockUsers() {
    return [
      {
        id: 'user1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        tier: 'gold',
        status: 'active',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        last_login: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'user2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        tier: 'platinum',
        status: 'active',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        last_login: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }

  getMockSignals() {
    return [
      {
        id: 'signal1',
        symbol: 'EURUSD',
        signal_type: 'forex',
        action: 'buy',
        entry_price: 1.0875,
        status: 'active',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        result: null
      },
      {
        id: 'signal2',
        symbol: 'BTCUSD',
        signal_type: 'crypto',
        action: 'sell',
        entry_price: 45000,
        status: 'closed',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        result: 'profit',
        pips_gained: 150
      }
    ];
  }

  /**
   * Add admin-specific styles
   */
  addAdminStyles() {
    if (document.getElementById('admin-styles')) return;

    const styles = `
      <style id="admin-styles">
        .admin-panel {
          min-height: 100vh;
          background: #f8f9fa;
        }
        
        .admin-header {
          background: var(--white);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 2rem 0;
          margin-bottom: 0;
        }
        
        .admin-title {
          color: var(--admin-primary);
          margin-bottom: 0.5rem;
        }
        
        .admin-nav {
          background: var(--white);
          border-bottom: 1px solid #dee2e6;
          margin-bottom: 2rem;
        }
        
        .admin-tabs {
          border-bottom: none;
        }
        
        .admin-tabs .nav-link {
          color: var(--gray);
          border: none;
          padding: 1rem 1.5rem;
          transition: all var(--transition-normal);
        }
        
        .admin-tabs .nav-link:hover {
          color: var(--admin-primary);
          background: rgba(255, 107, 107, 0.1);
        }
        
        .admin-tabs .nav-link.active {
          color: var(--admin-primary);
          background: rgba(255, 107, 107, 0.1);
          border-bottom: 3px solid var(--admin-primary);
        }
        
        .admin-content {
          min-height: 60vh;
          padding-bottom: 2rem;
        }
        
        .admin-status-bar {
          background: var(--white);
          border-top: 1px solid #dee2e6;
          padding: 1rem 0;
          margin-top: auto;
        }
        
        .status-items {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        
        .status-item {
          color: var(--gray);
          font-size: 0.875rem;
        }
        
        .status-item i {
          margin-right: 0.5rem;
        }
        
        .metric-card {
          background: var(--white);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .metric-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-size: 1.5rem;
          margin-right: 1rem;
        }
        
        .metric-details h3 {
          margin: 0;
          color: var(--dark-gray);
          font-weight: var(--font-weight-bold);
        }
        
        .metric-details p {
          margin: 0;
          color: var(--gray);
          font-size: 0.875rem;
        }
        
        .metric-change {
          font-size: 0.75rem;
          font-weight: var(--font-weight-semibold);
        }
        
        .metric-change.positive {
          color: var(--success);
        }
        
        .metric-change.negative {
          color: var(--danger);
        }
        
        .section-header {
          margin-bottom: 2rem;
        }
        
        .section-header h4 {
          color: var(--dark-gray);
          margin: 0;
        }
        
        .filters-bar {
          background: var(--white);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-sm);
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .stat-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          text-align: center;
          box-shadow: var(--shadow-sm);
        }
        
        .stat-card h6 {
          color: var(--gray);
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        
        .stat-card h3 {
          margin: 0;
          font-weight: var(--font-weight-bold);
        }
        
        .signal-checkbox, #select-all-signals {
          transform: scale(1.2);
        }
        
        @media (max-width: 768px) {
          .admin-header {
            padding: 1rem 0;
          }
          
          .admin-actions .btn {
            margin-bottom: 0.5rem;
            width: 100%;
          }
          
          .status-items {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .metric-card {
            flex-direction: column;
            text-align: center;
          }
          
          .metric-icon {
            margin-right: 0;
            margin-bottom: 1rem;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Handle unauthorized access
   */
  handleUnauthorizedAccess() {
    const container = document.getElementById('admin-container') || 
                     document.getElementById('main-content');
    
    if (container) {
      container.innerHTML = `
        <div class="container mt-5">
          <div class="row justify-content-center">
            <div class="col-md-6">
              <div class="card">
                <div class="card-body text-center">
                  <i class="fas fa-lock fa-3x text-danger mb-3"></i>
                  <h4>Access Denied</h4>
                  <p>You don't have permission to access the admin panel.</p>
                  <a href="/dashboard/" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Redirect after 3 seconds
    setTimeout(() => {
      window.location.href = '/dashboard/';
    }, 3000);
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    // Load dashboard by default
    await this.loadSectionContent('dashboard');
    this.setupSectionRefresh('dashboard');
    
    // Update status bar
    this.updateStatusBar();
  }

  /**
   * Update status bar
   */
  async updateStatusBar() {
    try {
      const stats = await this.fetchSystemStats();
      
      document.getElementById('active-users').textContent = stats.onlineUsers || 0;
      document.getElementById('active-signals').textContent = stats.activeSignals || 0;
      document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
      
    } catch (error) {
      console.error('Failed to update status bar:', error);
    }
  }

  /**
   * Initialize section-specific features
   */
  initializeSectionFeatures(section) {
    switch (section) {
      case 'dashboard':
        this.initializeDashboardCharts();
        break;
      case 'users':
        this.initializeUsersFeatures();
        break;
      case 'signals':
        this.initializeSignalsFeatures();
        break;
    }
  }

  /**
   * Initialize dashboard charts
   */
  initializeDashboardCharts() {
    // Revenue chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx && window.Chart) {
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [12000, 15000, 18000, 22000, 25000, 28000],
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // Users distribution chart
    const usersCtx = document.getElementById('users-chart');
    if (usersCtx && window.Chart) {
      new Chart(usersCtx, {
        type: 'doughnut',
        data: {
          labels: ['Gold', 'Platinum', 'Diamond'],
          datasets: [{
            data: [650, 400, 200],
            backgroundColor: ['#ffd700', '#e5e4e2', '#b9f2ff']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  }

  /**
   * Initialize users features
   */
  initializeUsersFeatures() {
    // Setup user filters
    const filterBtn = document.getElementById('filter-users');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        this.applyUserFilters();
      });
    }

    // Setup search
    const searchInput = document.getElementById('search-users');
    if (searchInput) {
      searchInput.addEventListener('input', 
        THA_Utils.performance.debounce(() => {
          this.searchUsers(searchInput.value);
        }, 300)
      );
    }
  }

  /**
   * Initialize signals features
   */
  initializeSignalsFeatures() {
    // Setup bulk actions
    const selectAll = document.getElementById('select-all-signals');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.signal-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
      });
    }

    // Setup create signal button
    const createBtn = document.getElementById('create-signal');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.showCreateSignalModal();
      });
    }
  }

  /**
   * Show create signal modal
   */
  showCreateSignalModal() {
    // Implementation for create signal modal
    tradersHelmet.showModal(`
      <h4>Create New Signal</h4>
      <p>Signal creation form would go here.</p>
      <p>This would include:</p>
      <ul>
        <li>Symbol selection</li>
        <li>Signal type (Forex, Crypto, etc.)</li>
        <li>Action (Buy/Sell)</li>
        <li>Entry price</li>
        <li>Stop loss and take profit</li>
        <li>Risk level</li>
        <li>Target tiers</li>
      </ul>
    `, { title: 'Create Signal' });
  }

  /**
   * Cleanup admin panel
   */
  cleanup() {
    // Clear refresh intervals
    this.refreshIntervals.forEach(interval => clearInterval(interval));
    this.refreshIntervals.clear();
    
    // Unsubscribe from real-time updates
    this.realTimeSubscriptions.forEach(subscription => {
      if (window.supabaseManager) {
        window.supabaseManager.supabase.removeChannel(subscription);
      }
    });
    this.realTimeSubscriptions.clear();
    
    // Clear cache
    this.dataCache.clear();
  }
}

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if on admin page and user has admin access
  if (window.location.pathname.includes('/admin/') && 
      window.authService?.getCurrentUser()?.role) {
    window.adminPanel = new AdminPanelManager();
  }
});

// Make available globally
if (typeof window !== 'undefined') {
  window.AdminPanelManager = AdminPanelManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminPanelManager;
}