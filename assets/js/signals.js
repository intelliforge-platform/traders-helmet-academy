
/**
 * TRADERS HELMET ACADEMY - TRADING SIGNALS MANAGEMENT SYSTEM
 * Complete signals management with real-time updates, analytics, and tier-based access
 */

class SignalsManager {
  constructor() {
    this.currentUser = null;
    this.userTier = 'gold';
    this.activeSignals = new Map();
    this.signalHistory = new Map();
    this.subscriptions = new Map();
    this.favorites = new Set();
    this.filters = {
      type: 'all',
      status: 'all',
      symbol: '',
      risk: 'all',
      dateRange: 'all'
    };
    this.realTimeEnabled = true;
    this.autoRefresh = true;
    this.refreshInterval = null;

    // Tier-based access limits
    this.tierLimits = {
      gold: {
        dailySignals: 3,
        signalHistory: 7, // days
        features: ['basic_signals', 'favorites'],
        refreshRate: 60000 // 1 minute
      },
      platinum: {
        dailySignals: 10,
        signalHistory: 30, // days
        features: ['advanced_signals', 'analytics', 'alerts', 'favorites'],
        refreshRate: 30000 // 30 seconds
      },
      diamond: {
        dailySignals: -1, // unlimited
        signalHistory: -1, // unlimited
        features: ['all_signals', 'advanced_analytics', 'custom_alerts', 'api_access', 'favorites'],
        refreshRate: 15000 // 15 seconds
      },
      admin: {
        dailySignals: -1,
        signalHistory: -1,
        features: ['*'],
        refreshRate: 5000 // 5 seconds
      }
    };

    this.init();
  }

  /**
   * Initialize signals manager
   */
  async init() {
    try {
      // Get current user and tier
      this.currentUser = window.authService?.getCurrentUser() || window.stateManager?.getState('auth.user');
      this.userTier = this.currentUser?.tier || 'gold';

      // Load user favorites
      await this.loadFavorites();

      // Setup UI if container exists
      const container = document.getElementById('signals-container');
      if (container) {
        this.initializeSignalsUI();
      }

      // Setup real-time subscriptions
      this.setupRealTimeSubscriptions();

      // Load initial signals
      await this.loadSignals();

      // Setup auto-refresh
      this.setupAutoRefresh();

      // Setup event listeners
      this.setupEventListeners();

      console.log(`📊 Signals Manager initialized for ${this.userTier} tier`);
    } catch (error) {
      console.error('❌ Signals Manager initialization failed:', error);
    }
  }

  /**
   * Initialize signals UI
   */
  initializeSignalsUI() {
    const container = document.getElementById('signals-container');
    if (!container) return;

    container.innerHTML = this.generateSignalsHTML();
    this.addSignalsStyles();
    this.setupFilters();
  }

  /**
   * Generate signals HTML structure
   */
  generateSignalsHTML() {
    const tierConfig = this.tierLimits[this.userTier];
    
    return `
      <div class="signals-manager">
        <!-- Signals Header -->
        <div class="signals-header">
          <div class="container-fluid">
            <div class="row align-items-center">
              <div class="col-md-6">
                <h2 class="signals-title">
                  <i class="fas fa-signal"></i>
                  Trading Signals
                  <span class="badge bg-${this.userTier} ms-2">${this.userTier.charAt(0).toUpperCase() + this.userTier.slice(1)}</span>
                </h2>
                <p class="signals-subtitle">
                  ${tierConfig.dailySignals === -1 ? 'Unlimited' : tierConfig.dailySignals} signals per day
                  ${this.hasFeature('real_time') ? ' • Real-time updates' : ''}
                </p>
              </div>
              <div class="col-md-6 text-md-end">
                <div class="signals-actions">
                  <button class="btn btn-outline-primary btn-sm me-2" id="refresh-signals">
                    <i class="fas fa-sync"></i> Refresh
                  </button>
                  ${this.hasFeature('alerts') ? `
                    <button class="btn btn-outline-warning btn-sm me-2" id="manage-alerts">
                      <i class="fas fa-bell"></i> Alerts
                    </button>
                  ` : ''}
                  ${this.hasFeature('analytics') ? `
                    <button class="btn btn-outline-info btn-sm" id="view-analytics">
                      <i class="fas fa-chart-bar"></i> Analytics
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Signals Filters -->
        <div class="filters-section">
          <div class="container-fluid">
            <div class="filters-card">
              <div class="row">
                <div class="col-md-2">
                  <select class="form-select" id="signal-type-filter">
                    <option value="all">All Types</option>
                    <option value="forex">Forex</option>
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                    <option value="commodities">Commodities</option>
                    <option value="indices">Indices</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <select class="form-select" id="signal-status-filter">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <select class="form-select" id="risk-level-filter">
                    <option value="all">All Risk</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <input type="text" class="form-control" id="symbol-search" 
                         placeholder="Search symbol (e.g., EURUSD, BTCUSD)">
                </div>
                <div class="col-md-2">
                  <button class="btn btn-primary w-100" id="apply-filters">
                    <i class="fas fa-filter"></i> Filter
                  </button>
                </div>
                <div class="col-md-1">
                  <button class="btn btn-outline-secondary w-100" id="clear-filters" title="Clear Filters">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Signals Stats -->
        <div class="signals-stats">
          <div class="container-fluid">
            <div class="row">
              <div class="col-md-3">
                <div class="stat-card">
                  <div class="stat-icon bg-primary">
                    <i class="fas fa-signal"></i>
                  </div>
                  <div class="stat-details">
                    <h4 id="active-signals-count">0</h4>
                    <p>Active Signals</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card">
                  <div class="stat-icon bg-success">
                    <i class="fas fa-trophy"></i>
                  </div>
                  <div class="stat-details">
                    <h4 id="win-rate">0%</h4>
                    <p>Win Rate</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card">
                  <div class="stat-icon bg-info">
                    <i class="fas fa-chart-line"></i>
                  </div>
                  <div class="stat-details">
                    <h4 id="avg-pips">+0</h4>
                    <p>Avg. Pips</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card">
                  <div class="stat-icon bg-warning">
                    <i class="fas fa-star"></i>
                  </div>
                  <div class="stat-details">
                    <h4 id="favorites-count">0</h4>
                    <p>Favorites</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Signals Content -->
        <div class="signals-content">
          <div class="container-fluid">
            <div class="row">
              <!-- Active Signals -->
              <div class="col-lg-8">
                <div class="signals-section">
                  <div class="section-header">
                    <h5><i class="fas fa-chart-line"></i> Active Signals</h5>
                    <div class="section-actions">
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="auto-refresh" checked>
                        <label class="form-check-label" for="auto-refresh">
                          Auto Refresh
                        </label>
                      </div>
                    </div>
                  </div>
                  <div id="active-signals-list" class="signals-list">
                    <!-- Active signals will be loaded here -->
                  </div>
                </div>
              </div>

              <!-- Sidebar -->
              <div class="col-lg-4">
                <!-- Favorites -->
                ${this.hasFeature('favorites') ? `
                  <div class="sidebar-section">
                    <h6><i class="fas fa-star"></i> Your Favorites</h6>
                    <div id="favorites-list" class="favorites-list">
                      <!-- Favorites will be loaded here -->
                    </div>
                  </div>
                ` : ''}

                <!-- Recent Performance -->
                <div class="sidebar-section">
                  <h6><i class="fas fa-history"></i> Recent Performance</h6>
                  <div id="recent-performance" class="performance-list">
                    <!-- Recent performance will be loaded here -->
                  </div>
                </div>

                <!-- Market Overview -->
                <div class="sidebar-section">
                  <h6><i class="fas fa-globe"></i> Market Overview</h6>
                  <div id="market-overview" class="market-overview">
                    <!-- Market overview will be loaded here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Signal History (if accessible) -->
        ${this.hasFeature('history') ? `
          <div class="signals-history">
            <div class="container-fluid">
              <div class="section-header">
                <h5><i class="fas fa-history"></i> Signal History</h5>
              </div>
              <div id="signals-history-list" class="signals-list">
                <!-- Signal history will be loaded here -->
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Load signals data
   */
  async loadSignals() {
    try {
      this.showLoading(true);

      // Fetch active signals
      const activeSignals = await this.fetchActiveSignals();
      this.activeSignals.clear();
      activeSignals.forEach(signal => {
        this.activeSignals.set(signal.id, signal);
      });

      // Fetch signal history if accessible
      if (this.hasFeature('history')) {
        const historySignals = await this.fetchSignalHistory();
        this.signalHistory.clear();
        historySignals.forEach(signal => {
          this.signalHistory.set(signal.id, signal);
        });
      }

      // Update UI
      this.renderActiveSignals();
      this.updateSignalsStats();
      this.renderFavorites();
      this.renderRecentPerformance();

      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load signals:', error);
      this.showError('Failed to load signals. Please try again.');
    }
  }

  /**
   * Fetch active signals from API
   */
  async fetchActiveSignals() {
    try {
      const filters = this.buildFiltersQuery();
      const response = await window.apiService?.signals.getAll(filters);
      
      return response?.data || this.getMockActiveSignals();
    } catch (error) {
      console.error('Failed to fetch active signals:', error);
      return this.getMockActiveSignals();
    }
  }

  /**
   * Fetch signal history
   */
  async fetchSignalHistory() {
    try {
      const response = await window.apiService?.signals.getHistory();
      return response?.data || this.getMockSignalHistory();
    } catch (error) {
      console.error('Failed to fetch signal history:', error);
      return this.getMockSignalHistory();
    }
  }

  /**
   * Build filters query object
   */
  buildFiltersQuery() {
    const query = {};
    
    if (this.filters.type !== 'all') query.signal_type = this.filters.type;
    if (this.filters.status !== 'all') query.status = this.filters.status;
    if (this.filters.risk !== 'all') query.risk_level = this.filters.risk;
    if (this.filters.symbol) query.symbol = this.filters.symbol;
    
    return query;
  }

  /**
   * Render active signals
   */
  renderActiveSignals() {
    const container = document.getElementById('active-signals-list');
    if (!container) return;

    const signals = Array.from(this.activeSignals.values());
    
    if (signals.length === 0) {
      container.innerHTML = `
        <div class="no-signals">
          <div class="no-signals-content">
            <i class="fas fa-signal fa-3x mb-3 text-muted"></i>
            <h5>No Active Signals</h5>
            <p>There are no active signals matching your filters.</p>
            <button class="btn btn-outline-primary" id="clear-all-filters">
              Clear Filters
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = signals.map(signal => this.generateSignalCard(signal)).join('');
  }

  /**
   * Generate signal card HTML
   */
  generateSignalCard(signal) {
    const timeAgo = this.getTimeAgo(signal.created_at);
    const isFavorite = this.favorites.has(signal.id);
    const canView = this.canViewSignal(signal);
    
    return `
      <div class="signal-card ${signal.risk_level}" data-signal-id="${signal.id}">
        <div class="signal-header">
          <div class="signal-symbol">
            <h5>${signal.symbol}</h5>
            <span class="signal-type">${signal.signal_type}</span>
          </div>
          <div class="signal-actions">
            ${this.hasFeature('favorites') ? `
              <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                      onclick="signalsManager.toggleFavorite('${signal.id}')">
                <i class="fas fa-star"></i>
              </button>
            ` : ''}
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                      data-bs-toggle="dropdown">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#" onclick="signalsManager.viewSignalDetails('${signal.id}')">
                  <i class="fas fa-eye"></i> View Details
                </a></li>
                ${this.hasFeature('alerts') ? `
                  <li><a class="dropdown-item" href="#" onclick="signalsManager.createAlert('${signal.id}')">
                    <i class="fas fa-bell"></i> Create Alert
                  </a></li>
                ` : ''}
                <li><a class="dropdown-item" href="#" onclick="signalsManager.shareSignal('${signal.id}')">
                  <i class="fas fa-share"></i> Share
                </a></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="signal-content">
          <div class="signal-main-info">
            <div class="signal-action">
              <span class="action-badge ${signal.action}">${signal.action.toUpperCase()}</span>
              <span class="risk-badge ${signal.risk_level}">${signal.risk_level.toUpperCase()}</span>
            </div>
            
            ${canView ? `
              <div class="signal-prices">
                <div class="price-item">
                  <label>Entry Price</label>
                  <span class="price">${this.formatPrice(signal.entry_price)}</span>
                </div>
                <div class="price-item">
                  <label>Stop Loss</label>
                  <span class="price text-danger">${this.formatPrice(signal.stop_loss)}</span>
                </div>
                <div class="price-item">
                  <label>Take Profit</label>
                  <span class="price text-success">${this.formatPrice(signal.take_profit)}</span>
                </div>
              </div>
            ` : `
              <div class="signal-locked">
                <i class="fas fa-lock"></i>
                <p>Upgrade to ${this.getRequiredTier(signal)} to view signal details</p>
                <button class="btn btn-sm btn-primary" onclick="signalsManager.showUpgradeModal()">
                  Upgrade Now
                </button>
              </div>
            `}
          </div>

          ${canView && signal.description ? `
            <div class="signal-description">
              <p><i class="fas fa-info-circle"></i> ${signal.description}</p>
            </div>
          ` : ''}

          <div class="signal-footer">
            <div class="signal-meta">
              <span class="signal-time">
                <i class="fas fa-clock"></i> ${timeAgo}
              </span>
              ${signal.confidence ? `
                <span class="signal-confidence">
                  <i class="fas fa-percent"></i> ${signal.confidence}% confidence
                </span>
              ` : ''}
            </div>
            <div class="signal-status">
              <span class="status-badge ${signal.status}">${signal.status}</span>
            </div>
          </div>
        </div>

        ${signal.status === 'closed' && signal.result ? `
          <div class="signal-result ${signal.result}">
            <i class="fas fa-${signal.result === 'profit' ? 'arrow-up' : 'arrow-down'}"></i>
            <span>${signal.result.toUpperCase()}</span>
            ${signal.pips_gained ? `<span class="pips">+${signal.pips_gained} pips</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Update signals statistics
   */
  updateSignalsStats() {
    const activeSignals = Array.from(this.activeSignals.values());
    const allSignals = [...activeSignals, ...Array.from(this.signalHistory.values())];
    
    // Active signals count
    document.getElementById('active-signals-count').textContent = activeSignals.length;
    
    // Win rate calculation
    const closedSignals = allSignals.filter(s => s.status === 'closed' && s.result);
    const profitableSignals = closedSignals.filter(s => s.result === 'profit');
    const winRate = closedSignals.length > 0 ? Math.round((profitableSignals.length / closedSignals.length) * 100) : 0;
    document.getElementById('win-rate').textContent = `${winRate}%`;
    
    // Average pips
    const signalsWithPips = closedSignals.filter(s => s.pips_gained !== null);
    const avgPips = signalsWithPips.length > 0 ? 
      Math.round(signalsWithPips.reduce((sum, s) => sum + (s.pips_gained || 0), 0) / signalsWithPips.length) : 0;
    document.getElementById('avg-pips').textContent = avgPips >= 0 ? `+${avgPips}` : avgPips.toString();
    
    // Favorites count
    document.getElementById('favorites-count').textContent = this.favorites.size;
  }

  /**
   * Setup real-time subscriptions
   */
  setupRealTimeSubscriptions() {
    if (!window.supabaseManager || !this.realTimeEnabled) return;

    // Subscribe to trading signals updates
    const signalsChannel = window.supabaseManager.subscribeToSignals();
    
    // Listen for real-time updates
    window.supabaseManager.on('realtime:signals', (payload) => {
      this.handleRealTimeUpdate(payload);
    });

    this.subscriptions.set('signals', signalsChannel);
  }

  /**
   * Handle real-time signal updates
   */
  handleRealTimeUpdate(payload) {
    const { eventType, new: newSignal, old: oldSignal } = payload;
    
    switch (eventType) {
      case 'INSERT':
        this.handleNewSignal(newSignal);
        break;
      case 'UPDATE':
        this.handleSignalUpdate(newSignal, oldSignal);
        break;
      case 'DELETE':
        this.handleSignalDelete(oldSignal);
        break;
    }
  }

  /**
   * Handle new signal
   */
  handleNewSignal(signal) {
    this.activeSignals.set(signal.id, signal);
    this.renderActiveSignals();
    this.updateSignalsStats();
    
    // Show notification for new signal
    if (window.notificationManager) {
      window.notificationManager.showNotification(
        `New ${signal.signal_type} signal: ${signal.action.toUpperCase()} ${signal.symbol}`,
        'signal',
        {
          title: 'New Trading Signal',
          url: `/signals/#${signal.id}`,
          data: { signalId: signal.id }
        }
      );
    }
  }

  /**
   * Handle signal update
   */
  handleSignalUpdate(newSignal, oldSignal) {
    if (this.activeSignals.has(newSignal.id)) {
      this.activeSignals.set(newSignal.id, newSignal);
      this.renderActiveSignals();
      this.updateSignalsStats();
    }
    
    // If signal was closed, show notification
    if (oldSignal.status === 'active' && newSignal.status === 'closed') {
      if (window.notificationManager) {
        window.notificationManager.showNotification(
          `Signal ${newSignal.symbol} closed with ${newSignal.result}`,
          'signal',
          {
            title: 'Signal Closed',
            url: `/signals/#${newSignal.id}`
          }
        );
      }
    }
  }

  /**
   * Handle signal deletion
   */
  handleSignalDelete(signal) {
    this.activeSignals.delete(signal.id);
    this.renderActiveSignals();
    this.updateSignalsStats();
  }

  /**
   * Setup auto-refresh
   */
  setupAutoRefresh() {
    const tierConfig = this.tierLimits[this.userTier];
    
    if (this.autoRefresh && tierConfig.refreshRate) {
      this.refreshInterval = setInterval(() => {
        this.loadSignals();
      }, tierConfig.refreshRate);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      switch (e.target.id) {
        case 'refresh-signals':
          this.loadSignals();
          break;
        case 'apply-filters':
          this.applyFilters();
          break;
        case 'clear-filters':
        case 'clear-all-filters':
          this.clearFilters();
          break;
        case 'manage-alerts':
          this.showAlertsModal();
          break;
        case 'view-analytics':
          this.showAnalyticsModal();
          break;
      }
    });

    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('auto-refresh');
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', (e) => {
        this.autoRefresh = e.target.checked;
        if (this.autoRefresh) {
          this.setupAutoRefresh();
        } else {
          if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
          }
        }
      });
    }

    // Search input with debounce
    const symbolSearch = document.getElementById('symbol-search');
    if (symbolSearch) {
      symbolSearch.addEventListener('input', 
        THA_Utils.performance.debounce(() => {
          this.filters.symbol = symbolSearch.value.toUpperCase();
          this.applyFilters();
        }, 500)
      );
    }
  }

  /**
   * Setup filters
   */
  setupFilters() {
    const filterElements = {
      type: document.getElementById('signal-type-filter'),
      status: document.getElementById('signal-status-filter'),
      risk: document.getElementById('risk-level-filter')
    };

    Object.entries(filterElements).forEach(([key, element]) => {
      if (element) {
        element.value = this.filters[key] || 'all';
        element.addEventListener('change', () => {
          this.filters[key] = element.value;
        });
      }
    });
  }

  /**
   * Apply filters
   */
  async applyFilters() {
    // Update filters from UI
    this.updateFiltersFromUI();
    
    // Reload signals with new filters
    await this.loadSignals();
    
    // Update URL parameters
    this.updateURLParams();
  }

  /**
   * Update filters from UI elements
   */
  updateFiltersFromUI() {
    const filterElements = {
      type: document.getElementById('signal-type-filter'),
      status: document.getElementById('signal-status-filter'),
      risk: document.getElementById('risk-level-filter'),
      symbol: document.getElementById('symbol-search')
    };

    Object.entries(filterElements).forEach(([key, element]) => {
      if (element) {
        this.filters[key] = element.value;
      }
    });
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = {
      type: 'all',
      status: 'all',
      symbol: '',
      risk: 'all',
      dateRange: 'all'
    };

    // Reset UI elements
    const elements = ['signal-type-filter', 'signal-status-filter', 'risk-level-filter'];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = 'all';
    });

    const symbolSearch = document.getElementById('symbol-search');
    if (symbolSearch) symbolSearch.value = '';

    // Reload signals
    this.loadSignals();
  }

  /**
   * Toggle signal favorite
   */
  async toggleFavorite(signalId) {
    try {
      if (this.favorites.has(signalId)) {
        // Remove from favorites
        await window.apiService?.signals.removeFromFavorites(signalId);
        this.favorites.delete(signalId);
        tradersHelmet.showNotification('Removed from favorites', 'info');
      } else {
        // Add to favorites
        await window.apiService?.signals.addToFavorites(signalId);
        this.favorites.add(signalId);
        tradersHelmet.showNotification('Added to favorites', 'success');
      }

      // Update UI
      this.updateFavoriteButtons();
      this.renderFavorites();
      this.updateSignalsStats();
      
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      tradersHelmet.showNotification('Failed to update favorites', 'error');
    }
  }

  /**
   * Load user favorites
   */
  async loadFavorites() {
    if (!this.hasFeature('favorites')) return;

    try {
      const response = await window.apiService?.signals.getFavorites();
      const favorites = response?.data || [];
      
      this.favorites.clear();
      favorites.forEach(signal => {
        this.favorites.add(signal.id);
      });
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }

  /**
   * Render favorites list
   */
  renderFavorites() {
    if (!this.hasFeature('favorites')) return;

    const container = document.getElementById('favorites-list');
    if (!container) return;

    const favoriteSignals = Array.from(this.activeSignals.values())
      .filter(signal => this.favorites.has(signal.id));

    if (favoriteSignals.length === 0) {
      container.innerHTML = `
        <div class="no-favorites">
          <i class="fas fa-star text-muted"></i>
          <p>No favorite signals yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = favoriteSignals.map(signal => `
      <div class="favorite-item" data-signal-id="${signal.id}">
        <div class="favorite-symbol">
          <strong>${signal.symbol}</strong>
          <span class="favorite-action ${signal.action}">${signal.action.toUpperCase()}</span>
        </div>
        <div class="favorite-price">${this.formatPrice(signal.entry_price)}</div>
        <button class="btn-remove-favorite" onclick="signalsManager.toggleFavorite('${signal.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  }

  /**
   * View signal details
   */
  viewSignalDetails(signalId) {
    const signal = this.activeSignals.get(signalId) || this.signalHistory.get(signalId);
    if (!signal) return;

    // Mark signal as viewed
    this.markSignalViewed(signalId);

    // Show signal details modal
    this.showSignalDetailsModal(signal);
  }

  /**
   * Mark signal as viewed
   */
  async markSignalViewed(signalId) {
    try {
      await window.apiService?.signals.markViewed(signalId);
    } catch (error) {
      console.error('Failed to mark signal as viewed:', error);
    }
  }

  /**
   * Show signal details modal
   */
  showSignalDetailsModal(signal) {
    const canView = this.canViewSignal(signal);
    
    let content = `
      <div class="signal-details-modal">
        <div class="signal-header-modal">
          <h4>${signal.symbol} - ${signal.action.toUpperCase()}</h4>
          <span class="badge bg-${signal.risk_level}">${signal.risk_level.toUpperCase()} RISK</span>
        </div>
    `;

    if (canView) {
      content += `
        <div class="signal-info-grid">
          <div class="info-item">
            <label>Signal Type</label>
            <span>${signal.signal_type.toUpperCase()}</span>
          </div>
          <div class="info-item">
            <label>Entry Price</label>
            <span class="price-value">${this.formatPrice(signal.entry_price)}</span>
          </div>
          <div class="info-item">
            <label>Stop Loss</label>
            <span class="price-value text-danger">${this.formatPrice(signal.stop_loss)}</span>
          </div>
          <div class="info-item">
            <label>Take Profit</label>
            <span class="price-value text-success">${this.formatPrice(signal.take_profit)}</span>
          </div>
          <div class="info-item">
            <label>Risk/Reward</label>
            <span>${this.calculateRiskReward(signal)}</span>
          </div>
          <div class="info-item">
            <label>Confidence</label>
            <span>${signal.confidence || 'N/A'}%</span>
          </div>
        </div>
        
        ${signal.description ? `
          <div class="signal-description-modal">
            <h6>Analysis</h6>
            <p>${signal.description}</p>
          </div>
        ` : ''}
        
        <div class="signal-timestamps">
          <small class="text-muted">
            Created: ${this.formatFullDate(signal.created_at)}
            ${signal.updated_at !== signal.created_at ? `<br>Updated: ${this.formatFullDate(signal.updated_at)}` : ''}
          </small>
        </div>
      `;
    } else {
      content += `
        <div class="upgrade-prompt">
          <i class="fas fa-lock fa-3x mb-3"></i>
          <h5>Premium Signal</h5>
          <p>Upgrade to ${this.getRequiredTier(signal)} tier to view full signal details.</p>
          <button class="btn btn-primary" onclick="signalsManager.showUpgradeModal()">
            Upgrade Now
          </button>
        </div>
      `;
    }

    content += '</div>';

    tradersHelmet.showModal(content, {
      title: 'Signal Details',
      size: 'large'
    });
  }

  /**
   * Check if user can view signal based on tier
   */
  canViewSignal(signal) {
    // Admin can view all signals
    if (this.userTier === 'admin') return true;
    
    // Check if signal tier access includes user tier
    if (signal.tier_access && Array.isArray(signal.tier_access)) {
      return signal.tier_access.includes(this.userTier);
    }
    
    // Default: all tiers can view basic signals
    return true;
  }

  /**
   * Get required tier for signal access
   */
  getRequiredTier(signal) {
    if (signal.tier_access && Array.isArray(signal.tier_access)) {
      const tiers = ['gold', 'platinum', 'diamond'];
      const requiredTier = signal.tier_access.find(tier => 
        tiers.indexOf(tier) > tiers.indexOf(this.userTier)
      );
      return requiredTier || 'platinum';
    }
    return 'platinum';
  }

  /**
   * Check if user has specific feature
   */
  hasFeature(feature) {
    const tierConfig = this.tierLimits[this.userTier];
    return tierConfig.features.includes('*') || tierConfig.features.includes(feature);
  }

  /**
   * Utility methods
   */
  formatPrice(price) {
    return parseFloat(price).toFixed(5);
  }

  formatFullDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  calculateRiskReward(signal) {
    const entryPrice = parseFloat(signal.entry_price);
    const stopLoss = parseFloat(signal.stop_loss);
    const takeProfit = parseFloat(signal.take_profit);
    
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    
    return `1:${(reward / risk).toFixed(2)}`;
  }

  /**
   * Show/hide loading state
   */
  showLoading(show) {
    const container = document.getElementById('active-signals-list');
    if (!container) return;

    if (show) {
      container.innerHTML = `
        <div class="signals-loading">
          <div class="text-center p-5">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Loading signals...</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('active-signals-list');
    if (!container) return;

    container.innerHTML = `
      <div class="signals-error">
        <div class="text-center p-5">
          <i class="fas fa-exclamation-triangle fa-2x mb-3 text-danger"></i>
          <h5>Error Loading Signals</h5>
          <p>${message}</p>
          <button class="btn btn-primary" onclick="signalsManager.loadSignals()">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Mock data generators
   */
  getMockActiveSignals() {
    return [
      {
        id: 'signal1',
        symbol: 'EURUSD',
        signal_type: 'forex',
        action: 'buy',
        entry_price: 1.0875,
        stop_loss: 1.0825,
        take_profit: 1.0925,
        risk_level: 'medium',
        status: 'active',
        confidence: 85,
        description: 'EUR showing strength against USD with bullish momentum',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
        tier_access: ['gold', 'platinum', 'diamond']
      },
      {
        id: 'signal2',
        symbol: 'BTCUSD',
        signal_type: 'crypto',
        action: 'sell',
        entry_price: 45250.50,
        stop_loss: 45750.50,
        take_profit: 44250.50,
        risk_level: 'high',
        status: 'active',
        confidence: 72,
        description: 'Bitcoin facing resistance at key level, expecting pullback',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
        tier_access: ['platinum', 'diamond']
      }
    ];
  }

  getMockSignalHistory() {
    return [
      {
        id: 'signal_history1',
        symbol: 'GBPUSD',
        signal_type: 'forex',
        action: 'buy',
        entry_price: 1.2650,
        stop_loss: 1.2600,
        take_profit: 1.2750,
        risk_level: 'low',
        status: 'closed',
        result: 'profit',
        pips_gained: 85,
        confidence: 78,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 82800000).toISOString(),
        tier_access: ['gold', 'platinum', 'diamond']
      }
    ];
  }

  /**
   * Add signals-specific styles
   */
  addSignalsStyles() {
    if (document.getElementById('signals-styles')) return;

    const styles = `
      <style id="signals-styles">
        .signals-manager {
          min-height: 100vh;
          background: #f8f9fa;
        }
        
        .signals-header {
          background: var(--white);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 2rem 0;
          margin-bottom: 0;
        }
        
        .signals-title {
          color: var(--primary-deep-blue);
          margin-bottom: 0.5rem;
        }
        
        .filters-section {
          padding: 1rem 0;
          background: rgba(255,255,255,0.5);
        }
        
        .filters-card {
          background: var(--white);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        
        .signals-stats {
          padding: 1.5rem 0;
        }
        
        .stat-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-normal);
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .stat-icon {
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
        
        .stat-details h4 {
          margin: 0;
          color: var(--dark-gray);
          font-weight: var(--font-weight-bold);
        }
        
        .stat-details p {
          margin: 0;
          color: var(--gray);
          font-size: 0.875rem;
        }
        
        .signals-content {
          padding: 2rem 0;
        }
        
        .signals-section {
          background: var(--white);
          border-radius: var(--radius-xl);
          padding: 2rem;
          box-shadow: var(--shadow-sm);
          margin-bottom: 2rem;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .section-header h5 {
          color: var(--primary-deep-blue);
          margin: 0;
        }
        
        .signal-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-sm);
          border-left: 4px solid var(--primary-blue);
          transition: all var(--transition-normal);
        }
        
        .signal-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .signal-card.low {
          border-left-color: var(--success);
        }
        
        .signal-card.medium {
          border-left-color: var(--warning);
        }
        
        .signal-card.high {
          border-left-color: var(--danger);
        }
        
        .signal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        
        .signal-symbol h5 {
          margin: 0;
          color: var(--dark-gray);
          font-weight: var(--font-weight-bold);
        }
        
        .signal-type {
          background: var(--light-gray);
          color: var(--gray);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: var(--font-weight-semibold);
        }
        
        .signal-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        
        .btn-favorite {
          background: none;
          border: none;
          color: var(--gray);
          font-size: 1.2rem;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }
        
        .btn-favorite:hover {
          background: var(--light-gray);
          color: var(--warning);
        }
        
        .btn-favorite.active {
          color: var(--warning);
        }
        
        .signal-main-info {
          margin-bottom: 1rem;
        }
        
        .signal-action {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .action-badge {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-weight: var(--font-weight-bold);
          font-size: 0.875rem;
        }
        
        .action-badge.buy {
          background: var(--success);
          color: var(--white);
        }
        
        .action-badge.sell {
          background: var(--danger);
          color: var(--white);
        }
        
        .risk-badge {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: var(--font-weight-semibold);
        }
        
        .risk-badge.low {
          background: rgba(40, 167, 69, 0.1);
          color: var(--success);
        }
        
        .risk-badge.medium {
          background: rgba(255, 193, 7, 0.1);
          color: var(--warning);
        }
        
        .risk-badge.high {
          background: rgba(220, 53, 69, 0.1);
          color: var(--danger);
        }
        
        .signal-prices {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .price-item {
          text-align: center;
          padding: 0.75rem;
          background: var(--light-gray);
          border-radius: var(--radius-md);
        }
        
        .price-item label {
          display: block;
          font-size: 0.75rem;
          color: var(--gray);
          margin-bottom: 0.25rem;
          font-weight: var(--font-weight-semibold);
        }
        
        .price-item .price {
          font-size: 1.1rem;
          font-weight: var(--font-weight-bold);
          color: var(--dark-gray);
        }
        
        .signal-locked {
          text-align: center;
          padding: 2rem;
          color: var(--gray);
        }
        
        .signal-locked i {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        
        .signal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f0f0f0;
        }
        
        .signal-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--gray);
        }
        
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: var(--font-weight-semibold);
        }
        
        .status-badge.active {
          background: rgba(23, 162, 184, 0.1);
          color: var(--info);
        }
        
        .status-badge.closed {
          background: rgba(40, 167, 69, 0.1);
          color: var(--success);
        }
        
        .signal-result {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          text-align: center;
          font-weight: var(--font-weight-bold);
        }
        
        .signal-result.profit {
          background: rgba(40, 167, 69, 0.1);
          color: var(--success);
        }
        
        .signal-result.loss {
          background: rgba(220, 53, 69, 0.1);
          color: var(--danger);
        }
        
        .sidebar-section {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-sm);
        }
        
        .sidebar-section h6 {
          color: var(--primary-deep-blue);
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .favorite-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .favorite-item:last-child {
          border-bottom: none;
        }
        
        .favorite-symbol strong {
          display: block;
        }
        
        .favorite-action {
          font-size: 0.75rem;
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-sm);
        }
        
        .favorite-action.buy {
          background: rgba(40, 167, 69, 0.1);
          color: var(--success);
        }
        
        .favorite-action.sell {
          background: rgba(220, 53, 69, 0.1);
          color: var(--danger);
        }
        
        .btn-remove-favorite {
          background: none;
          border: none;
          color: var(--gray);
          padding: 0.25rem;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }
        
        .btn-remove-favorite:hover {
          background: var(--danger);
          color: var(--white);
        }
        
        .no-signals, .no-favorites, .signals-loading, .signals-error {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
        }
        
        .no-signals-content i {
          margin-bottom: 1rem;
        }
        
        @media (max-width: 768px) {
          .signals-header {
            padding: 1rem 0;
          }
          
          .signals-actions .btn {
            margin-bottom: 0.5rem;
          }
          
          .signal-prices {
            grid-template-columns: 1fr;
          }
          
          .signal-footer {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .sidebar-section {
            margin-top: 2rem;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Update URL parameters
   */
  updateURLParams() {
    const params = new URLSearchParams();
    
    Object.entries(this.filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newURL);
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Unsubscribe from real-time updates
    this.subscriptions.forEach(subscription => {
      if (window.supabaseManager) {
        window.supabaseManager.supabase.removeChannel(subscription);
      }
    });

    // Clear data
    this.activeSignals.clear();
    this.signalHistory.clear();
    this.subscriptions.clear();
    this.favorites.clear();
  }
}

// Initialize signals manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('signals-container') && window.authService?.isAuthenticated()) {
    window.signalsManager = new SignalsManager();
  }
});

// Make available globally
if (typeof window !== 'undefined') {
  window.SignalsManager = SignalsManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalsManager;
}