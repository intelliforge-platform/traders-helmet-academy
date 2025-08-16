
/**
 * TRADERS HELMET ACADEMY - MULTI-TIER DASHBOARD SYSTEM
 * Dynamic dashboard with tier-specific features and real-time updates
 */

class DashboardManager {
  constructor() {
    this.currentUser = null;
    this.userTier = 'gold';
    this.widgets = new Map();
    this.activeCharts = new Map();
    this.realTimeUpdates = new Map();
    this.refreshInterval = null;
    
    // Dashboard configuration per tier
    this.tierConfigs = {
      gold: {
        widgets: ['welcome', 'account-summary', 'recent-signals', 'market-overview', 'performance'],
        signalLimit: 3,
        chartLimit: 2,
        features: ['basic_signals', 'market_data', 'chat_support'],
        refreshRate: 30000, // 30 seconds
        theme: 'gold'
      },
      platinum: {
        widgets: ['welcome', 'account-summary', 'recent-signals', 'market-overview', 'performance', 'portfolio', 'news'],
        signalLimit: 10,
        chartLimit: 4,
        features: ['advanced_signals', 'portfolio_tracking', 'priority_support', 'technical_analysis'],
        refreshRate: 15000, // 15 seconds
        theme: 'platinum'
      },
      diamond: {
        widgets: ['welcome', 'account-summary', 'recent-signals', 'market-overview', 'performance', 'portfolio', 'news', 'analytics', 'alerts'],
        signalLimit: -1, // Unlimited
        chartLimit: 8,
        features: ['all_signals', 'advanced_analytics', 'vip_support', 'custom_indicators', 'api_access'],
        refreshRate: 5000, // 5 seconds
        theme: 'diamond'
      },
      admin: {
        widgets: ['admin-overview', 'user-stats', 'revenue-stats', 'system-health', 'recent-activity'],
        signalLimit: -1,
        chartLimit: -1,
        features: ['admin_all'],
        refreshRate: 10000,
        theme: 'admin'
      }
    };

    this.init();
  }

  /**
   * Initialize dashboard system
   */
  async init() {
    try {
      // Get current user from auth service
      this.currentUser = window.authService?.getCurrentUser() || window.stateManager?.getState('auth.user');
      this.userTier = this.currentUser?.tier || 'gold';

      // Initialize dashboard based on user tier
      await this.initializeDashboard();
      
      // Setup real-time updates
      this.setupRealTimeUpdates();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log(`📊 Dashboard initialized for ${this.userTier} tier`);
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
    }
  }

  /**
   * Initialize dashboard based on user tier
   */
  async initializeDashboard() {
    const config = this.tierConfigs[this.userTier];
    if (!config) return;

    // Apply tier-specific theme
    this.applyTierTheme();

    // Create dashboard layout
    this.createDashboardLayout();

    // Initialize widgets
    await this.initializeWidgets(config.widgets);

    // Start data refresh cycle
    this.startDataRefresh(config.refreshRate);

    // Setup tier-specific features
    this.setupTierFeatures(config.features);
  }

  /**
   * Create dashboard layout
   */
  createDashboardLayout() {
    const dashboardContainer = document.getElementById('dashboard-container') || document.getElementById('main-content');
    if (!dashboardContainer) return;

    dashboardContainer.innerHTML = `
      <div class="dashboard-layout">
        <!-- Dashboard Header -->
        <div class="dashboard-header">
          <div class="container-fluid">
            <div class="row align-items-center">
              <div class="col-md-6">
                <h1 class="dashboard-title">
                  <i class="fas fa-tachometer-alt"></i>
                  Dashboard
                  <span class="badge bg-${this.userTier} ms-2">${this.userTier.charAt(0).toUpperCase() + this.userTier.slice(1)}</span>
                </h1>
                <p class="dashboard-subtitle">Welcome back, ${this.currentUser?.profile?.first_name || 'Trader'}!</p>
              </div>
              <div class="col-md-6 text-md-end">
                <div class="dashboard-actions">
                  <button class="btn btn-outline-primary btn-sm me-2" id="refresh-dashboard">
                    <i class="fas fa-sync"></i> Refresh
                  </button>
                  <button class="btn btn-outline-secondary btn-sm me-2" id="customize-dashboard">
                    <i class="fas fa-cog"></i> Customize
                  </button>
                  ${this.userTier !== 'diamond' ? `
                    <button class="btn btn-primary btn-sm" id="upgrade-tier">
                      <i class="fas fa-crown"></i> Upgrade
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Content -->
        <div class="dashboard-content">
          <div class="container-fluid">
            <div id="dashboard-widgets" class="dashboard-widgets">
              <!-- Widgets will be dynamically inserted here -->
            </div>
          </div>
        </div>

        <!-- Dashboard Footer -->
        <div class="dashboard-footer">
          <div class="container-fluid">
            <div class="row">
              <div class="col-md-6">
                <small class="text-muted">Last updated: <span id="last-updated">Loading...</span></small>
              </div>
              <div class="col-md-6 text-md-end">
                <small class="text-muted">Market Status: <span id="market-status">Loading...</span></small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addDashboardStyles();
  }

  /**
   * Initialize dashboard widgets
   */
  async initializeWidgets(widgetList) {
    const widgetsContainer = document.getElementById('dashboard-widgets');
    if (!widgetsContainer) return;

    const widgetPromises = widgetList.map(widgetType => this.createWidget(widgetType));
    const widgets = await Promise.all(widgetPromises);

    // Arrange widgets in responsive grid
    let widgetHTML = '<div class="row">';
    
    widgets.forEach((widget, index) => {
      if (widget) {
        const colClass = this.getWidgetColumnClass(widget.type, index);
        widgetHTML += `<div class="${colClass}">${widget.html}</div>`;
      }
    });
    
    widgetHTML += '</div>';
    widgetsContainer.innerHTML = widgetHTML;

    // Initialize interactive elements in widgets
    this.initializeWidgetInteractions();
  }

  /**
   * Create individual widget
   */
  async createWidget(type) {
    const widgetConfig = this.getWidgetConfig(type);
    if (!widgetConfig) return null;

    const widgetData = await this.fetchWidgetData(type);
    
    const widget = {
      type,
      config: widgetConfig,
      data: widgetData,
      html: this.generateWidgetHTML(type, widgetConfig, widgetData)
    };

    this.widgets.set(type, widget);
    return widget;
  }

  /**
   * Get widget configuration
   */
  getWidgetConfig(type) {
    const configs = {
      'welcome': {
        title: 'Welcome',
        icon: 'fas fa-hand-wave',
        size: 'col-12',
        refreshable: false
      },
      'account-summary': {
        title: 'Account Summary',
        icon: 'fas fa-wallet',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'recent-signals': {
        title: 'Recent Signals',
        icon: 'fas fa-signal',
        size: 'col-md-6 col-lg-8',
        refreshable: true
      },
      'market-overview': {
        title: 'Market Overview',
        icon: 'fas fa-chart-line',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'performance': {
        title: 'Performance',
        icon: 'fas fa-trophy',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'portfolio': {
        title: 'Portfolio',
        icon: 'fas fa-briefcase',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'news': {
        title: 'Market News',
        icon: 'fas fa-newspaper',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'analytics': {
        title: 'Analytics',
        icon: 'fas fa-chart-bar',
        size: 'col-12',
        refreshable: true
      },
      'alerts': {
        title: 'Price Alerts',
        icon: 'fas fa-bell',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'admin-overview': {
        title: 'System Overview',
        icon: 'fas fa-server',
        size: 'col-12',
        refreshable: true
      },
      'user-stats': {
        title: 'User Statistics',
        icon: 'fas fa-users',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'revenue-stats': {
        title: 'Revenue Statistics',
        icon: 'fas fa-dollar-sign',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'system-health': {
        title: 'System Health',
        icon: 'fas fa-heartbeat',
        size: 'col-md-6 col-lg-4',
        refreshable: true
      },
      'recent-activity': {
        title: 'Recent Activity',
        icon: 'fas fa-history',
        size: 'col-12',
        refreshable: true
      }
    };

    return configs[type];
  }

  /**
   * Fetch widget data
   */
  async fetchWidgetData(type) {
    try {
      switch (type) {
        case 'welcome':
          return this.getWelcomeData();
        
        case 'account-summary':
          return await this.getAccountSummaryData();
        
        case 'recent-signals':
          return await this.getRecentSignalsData();
        
        case 'market-overview':
          return await this.getMarketOverviewData();
        
        case 'performance':
          return await this.getPerformanceData();
        
        case 'portfolio':
          return await this.getPortfolioData();
        
        case 'news':
          return await this.getNewsData();
        
        case 'analytics':
          return await this.getAnalyticsData();
        
        case 'alerts':
          return await this.getAlertsData();
        
        case 'admin-overview':
          return await this.getAdminOverviewData();
        
        case 'user-stats':
          return await this.getUserStatsData();
        
        case 'revenue-stats':
          return await this.getRevenueStatsData();
        
        case 'system-health':
          return await this.getSystemHealthData();
        
        case 'recent-activity':
          return await this.getRecentActivityData();
        
        default:
          return {};
      }
    } catch (error) {
      console.error(`Failed to fetch data for widget ${type}:`, error);
      return { error: 'Failed to load data' };
    }
  }

  /**
   * Generate widget HTML
   */
  generateWidgetHTML(type, config, data) {
    const baseHTML = `
      <div class="widget widget-${type}" data-widget="${type}">
        <div class="widget-header">
          <h5 class="widget-title">
            <i class="${config.icon}"></i>
            ${config.title}
          </h5>
          ${config.refreshable ? `
            <button class="btn btn-sm btn-outline-secondary widget-refresh" data-widget="${type}">
              <i class="fas fa-sync"></i>
            </button>
          ` : ''}
        </div>
        <div class="widget-body">
          ${this.generateWidgetContent(type, data)}
        </div>
      </div>
    `;

    return baseHTML;
  }

  /**
   * Generate widget content based on type
   */
  generateWidgetContent(type, data) {
    if (data.error) {
      return `<div class="widget-error"><i class="fas fa-exclamation-triangle"></i> ${data.error}</div>`;
    }

    switch (type) {
      case 'welcome':
        return this.generateWelcomeContent(data);
      
      case 'account-summary':
        return this.generateAccountSummaryContent(data);
      
      case 'recent-signals':
        return this.generateRecentSignalsContent(data);
      
      case 'market-overview':
        return this.generateMarketOverviewContent(data);
      
      case 'performance':
        return this.generatePerformanceContent(data);
      
      case 'portfolio':
        return this.generatePortfolioContent(data);
      
      case 'news':
        return this.generateNewsContent(data);
      
      case 'analytics':
        return this.generateAnalyticsContent(data);
      
      case 'alerts':
        return this.generateAlertsContent(data);
      
      case 'admin-overview':
        return this.generateAdminOverviewContent(data);
      
      case 'user-stats':
        return this.generateUserStatsContent(data);
      
      case 'revenue-stats':
        return this.generateRevenueStatsContent(data);
      
      case 'system-health':
        return this.generateSystemHealthContent(data);
      
      case 'recent-activity':
        return this.generateRecentActivityContent(data);
      
      default:
        return '<div class="widget-placeholder">Widget content coming soon...</div>';
    }
  }

  /**
   * Widget content generators
   */
  generateWelcomeContent(data) {
    const greeting = this.getTimeBasedGreeting();
    return `
      <div class="welcome-content">
        <h4>${greeting}, ${this.currentUser?.profile?.first_name || 'Trader'}!</h4>
        <p>Ready to make some profitable trades today?</p>
        <div class="welcome-stats">
          <div class="stat">
            <span class="stat-label">Member Since</span>
            <span class="stat-value">${this.formatDate(this.currentUser?.created_at)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Current Tier</span>
            <span class="stat-value badge bg-${this.userTier}">${this.userTier.charAt(0).toUpperCase() + this.userTier.slice(1)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Last Login</span>
            <span class="stat-value">${this.formatRelativeTime(this.currentUser?.last_login)}</span>
          </div>
        </div>
      </div>
    `;
  }

  generateAccountSummaryContent(data) {
    return `
      <div class="account-summary">
        <div class="summary-item">
          <div class="summary-icon">
            <i class="fas fa-wallet text-primary"></i>
          </div>
          <div class="summary-details">
            <span class="summary-label">Account Balance</span>
            <span class="summary-value">${this.formatCurrency(data.balance || 0)}</span>
          </div>
        </div>
        
        <div class="summary-item">
          <div class="summary-icon">
            <i class="fas fa-chart-line ${data.pnl >= 0 ? 'text-success' : 'text-danger'}"></i>
          </div>
          <div class="summary-details">
            <span class="summary-label">Total P&L</span>
            <span class="summary-value ${data.pnl >= 0 ? 'text-success' : 'text-danger'}">
              ${data.pnl >= 0 ? '+' : ''}${this.formatCurrency(data.pnl || 0)}
            </span>
          </div>
        </div>
        
        <div class="summary-item">
          <div class="summary-icon">
            <i class="fas fa-percentage text-info"></i>
          </div>
          <div class="summary-details">
            <span class="summary-label">Win Rate</span>
            <span class="summary-value">${(data.winRate || 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  generateRecentSignalsContent(data) {
    if (!data.signals || data.signals.length === 0) {
      return '<div class="no-data">No recent signals available</div>';
    }

    return `
      <div class="signals-list">
        ${data.signals.slice(0, 5).map(signal => `
          <div class="signal-item">
            <div class="signal-symbol">
              <strong>${signal.symbol}</strong>
              <span class="signal-type">${signal.signal_type}</span>
            </div>
            <div class="signal-action">
              <span class="badge ${signal.action === 'buy' ? 'bg-success' : 'bg-danger'}">
                ${signal.action.toUpperCase()}
              </span>
            </div>
            <div class="signal-price">
              ${this.formatPrice(signal.entry_price)}
            </div>
            <div class="signal-time">
              ${this.formatRelativeTime(signal.created_at)}
            </div>
          </div>
        `).join('')}
        
        <div class="widget-footer">
          <a href="/pages/signals/" class="btn btn-sm btn-outline-primary">
            View All Signals <i class="fas fa-arrow-right"></i>
          </a>
        </div>
      </div>
    `;
  }

  generateMarketOverviewContent(data) {
    if (!data.markets || data.markets.length === 0) {
      return '<div class="no-data">Market data unavailable</div>';
    }

    return `
      <div class="market-overview">
        ${data.markets.map(market => `
          <div class="market-item">
            <div class="market-symbol">${market.symbol}</div>
            <div class="market-price">${this.formatPrice(market.price)}</div>
            <div class="market-change ${market.change >= 0 ? 'positive' : 'negative'}">
              ${market.change >= 0 ? '+' : ''}${market.change.toFixed(2)}%
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  generatePerformanceContent(data) {
    return `
      <div class="performance-metrics">
        <div class="metric">
          <span class="metric-label">Total Trades</span>
          <span class="metric-value">${data.totalTrades || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Winning Trades</span>
          <span class="metric-value text-success">${data.winningTrades || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Losing Trades</span>
          <span class="metric-value text-danger">${data.losingTrades || 0}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Best Trade</span>
          <span class="metric-value text-success">${this.formatCurrency(data.bestTrade || 0)}</span>
        </div>
      </div>
      
      <div class="performance-chart">
        <canvas id="performance-chart-${Date.now()}" width="100" height="50"></canvas>
      </div>
    `;
  }

  /**
   * Data fetching methods
   */
  getWelcomeData() {
    return {
      greeting: true
    };
  }

  async getAccountSummaryData() {
    try {
      // Mock data - replace with actual API calls
      return {
        balance: 10000.50,
        pnl: 1250.75,
        winRate: 68.5
      };
    } catch (error) {
      return { error: 'Failed to load account data' };
    }
  }

  async getRecentSignalsData() {
    try {
      const response = await window.apiService?.signals.getAll({ limit: 5 });
      return {
        signals: response?.data || this.getMockSignals()
      };
    } catch (error) {
      return {
        signals: this.getMockSignals()
      };
    }
  }

  async getMarketOverviewData() {
    try {
      const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];
      const response = await window.apiService?.market.getPrices(symbols);
      return {
        markets: response?.data || this.getMockMarketData()
      };
    } catch (error) {
      return {
        markets: this.getMockMarketData()
      };
    }
  }

  async getPerformanceData() {
    try {
      // Mock performance data
      return {
        totalTrades: 145,
        winningTrades: 98,
        losingTrades: 47,
        bestTrade: 850.25,
        worstTrade: -125.50
      };
    } catch (error) {
      return { error: 'Failed to load performance data' };
    }
  }

  /**
   * Mock data generators
   */
  getMockSignals() {
    return [
      {
        symbol: 'EURUSD',
        signal_type: 'forex',
        action: 'buy',
        entry_price: 1.0875,
        created_at: new Date(Date.now() - 300000).toISOString()
      },
      {
        symbol: 'BTCUSD',
        signal_type: 'crypto',
        action: 'sell',
        entry_price: 45250.50,
        created_at: new Date(Date.now() - 600000).toISOString()
      },
      {
        symbol: 'GBPUSD',
        signal_type: 'forex',
        action: 'buy',
        entry_price: 1.2650,
        created_at: new Date(Date.now() - 900000).toISOString()
      }
    ];
  }

  getMockMarketData() {
    return [
      { symbol: 'EURUSD', price: 1.0875, change: 0.25 },
      { symbol: 'GBPUSD', price: 1.2650, change: -0.18 },
      { symbol: 'USDJPY', price: 149.85, change: 0.45 },
      { symbol: 'BTCUSD', price: 45250.50, change: 2.15 }
    ];
  }

  /**
   * Utility methods
   */
  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatPrice(price) {
    return parseFloat(price).toFixed(5);
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

  getWidgetColumnClass(type, index) {
    const config = this.getWidgetConfig(type);
    return config?.size || 'col-md-6 col-lg-4';
  }

  /**
   * Apply tier-specific theme
   */
  applyTierTheme() {
    document.body.classList.add(`theme-${this.userTier}`);
  }

  /**
   * Add dashboard-specific styles
   */
  addDashboardStyles() {
    if (document.getElementById('dashboard-styles')) return;

    const styles = `
      <style id="dashboard-styles">
        .dashboard-layout {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .dashboard-header {
          background: var(--white);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 2rem 0;
          margin-bottom: 2rem;
        }
        
        .dashboard-title {
          color: var(--primary-deep-blue);
          margin-bottom: 0.5rem;
        }
        
        .dashboard-subtitle {
          color: var(--gray);
          margin: 0;
        }
        
        .dashboard-widgets .row {
          gap: 0 1rem;
        }
        
        .widget {
          background: var(--white);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition: all var(--transition-normal);
        }
        
        .widget:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
        
        .widget-header {
          padding: 1.5rem 1.5rem 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .widget-title {
          color: var(--primary-deep-blue);
          font-weight: var(--font-weight-semibold);
          margin: 0;
        }
        
        .widget-body {
          padding: 1.5rem;
        }
        
        .widget-refresh {
          border: none;
          background: none;
          color: var(--gray);
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }
        
        .widget-refresh:hover {
          background: var(--light-gray);
          color: var(--primary-blue);
        }
        
        .signals-list .signal-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f0f0f0;
          gap: 1rem;
        }
        
        .signals-list .signal-item:last-child {
          border-bottom: none;
        }
        
        .market-overview .market-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .market-change.positive {
          color: var(--success);
        }
        
        .market-change.negative {
          color: var(--danger);
        }
        
        .account-summary .summary-item {
          display: flex;
          align-items: center;
          padding: 1rem 0;
          gap: 1rem;
        }
        
        .summary-icon {
          font-size: 1.5rem;
        }
        
        .summary-details {
          display: flex;
          flex-direction: column;
        }
        
        .summary-label {
          font-size: 0.875rem;
          color: var(--gray);
        }
        
        .summary-value {
          font-weight: var(--font-weight-semibold);
          font-size: 1.1rem;
        }
        
        .performance-metrics {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .metric {
          text-align: center;
          padding: 1rem;
          background: var(--light-gray);
          border-radius: var(--radius-md);
        }
        
        .metric-label {
          display: block;
          font-size: 0.875rem;
          color: var(--gray);
          margin-bottom: 0.25rem;
        }
        
        .metric-value {
          display: block;
          font-weight: var(--font-weight-bold);
          font-size: 1.25rem;
        }
        
        .welcome-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .welcome-stats .stat {
          display: flex;
          flex-direction: column;
          text-align: center;
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: var(--gray);
        }
        
        .stat-value {
          font-weight: var(--font-weight-semibold);
          margin-top: 0.25rem;
        }
        
        .dashboard-footer {
          padding: 1rem 0;
          margin-top: 2rem;
          border-top: 1px solid #e9ecef;
          background: var(--white);
        }
        
        .no-data, .widget-error, .widget-placeholder {
          text-align: center;
          color: var(--gray);
          padding: 2rem;
        }
        
        .widget-footer {
          text-align: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f0f0f0;
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 1rem 0;
          }
          
          .dashboard-actions .btn {
            margin-bottom: 0.5rem;
            width: 100%;
          }
          
          .welcome-stats {
            flex-direction: column;
            text-align: center;
          }
          
          .performance-metrics {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Setup real-time updates
   */
  setupRealTimeUpdates() {
    // Subscribe to real-time updates based on user tier
    if (window.supabaseManager) {
      // Subscribe to signals updates
      window.supabaseManager.on('realtime:signals', (payload) => {
        this.updateSignalsWidget(payload);
      });

      // Subscribe to market data updates
      window.supabaseManager.on('realtime:market', (payload) => {
        this.updateMarketWidget(payload);
      });
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh dashboard button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'refresh-dashboard') {
        this.refreshDashboard();
      }
      
      if (e.target.classList.contains('widget-refresh')) {
        const widgetType = e.target.dataset.widget;
        this.refreshWidget(widgetType);
      }
      
      if (e.target.id === 'customize-dashboard') {
        this.showCustomizeModal();
      }
      
      if (e.target.id === 'upgrade-tier') {
        this.showUpgradeModal();
      }
    });
  }

  /**
   * Refresh entire dashboard
   */
  async refreshDashboard() {
    const refreshBtn = document.getElementById('refresh-dashboard');
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    try {
      const config = this.tierConfigs[this.userTier];
      await this.initializeWidgets(config.widgets);
      
      // Update last updated time
      document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
      
      tradersHelmet.showNotification('Dashboard refreshed successfully', 'success');
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
      tradersHelmet.showNotification('Failed to refresh dashboard', 'error');
    } finally {
      icon.classList.remove('fa-spin');
      refreshBtn.disabled = false;
    }
  }

  /**
   * Refresh individual widget
   */
  async refreshWidget(widgetType) {
    const widget = this.widgets.get(widgetType);
    if (!widget) return;

    const refreshBtn = document.querySelector(`[data-widget="${widgetType}"]`);
    const icon = refreshBtn.querySelector('i');
    
    icon.classList.add('fa-spin');
    
    try {
      const newData = await this.fetchWidgetData(widgetType);
      const newHTML = this.generateWidgetContent(widgetType, newData);
      
      const widgetBody = document.querySelector(`.widget-${widgetType} .widget-body`);
      if (widgetBody) {
        widgetBody.innerHTML = newHTML;
      }
      
      // Update widget data
      widget.data = newData;
    } catch (error) {
      console.error(`Failed to refresh widget ${widgetType}:`, error);
    } finally {
      icon.classList.remove('fa-spin');
    }
  }

  /**
   * Start automatic data refresh
   */
  startDataRefresh(interval) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.refreshDashboard();
    }, interval);
  }

  /**
   * Setup tier-specific features
   */
  setupTierFeatures(features) {
    features.forEach(feature => {
      switch (feature) {
        case 'basic_signals':
          this.enableBasicSignals();
          break;
        case 'advanced_signals':
          this.enableAdvancedSignals();
          break;
        case 'portfolio_tracking':
          this.enablePortfolioTracking();
          break;
        case 'technical_analysis':
          this.enableTechnicalAnalysis();
          break;
        case 'advanced_analytics':
          this.enableAdvancedAnalytics();
          break;
        case 'api_access':
          this.enableAPIAccess();
          break;
        case 'admin_all':
          this.enableAdminFeatures();
          break;
      }
    });
  }

  /**
   * Feature enablers (to be implemented)
   */
  enableBasicSignals() {
    console.log('Basic signals enabled');
  }

  enableAdvancedSignals() {
    console.log('Advanced signals enabled');
  }

  enablePortfolioTracking() {
    console.log('Portfolio tracking enabled');
  }

  enableTechnicalAnalysis() {
    console.log('Technical analysis enabled');
  }

  enableAdvancedAnalytics() {
    console.log('Advanced analytics enabled');
  }

  enableAPIAccess() {
    console.log('API access enabled');
  }

  enableAdminFeatures() {
    console.log('Admin features enabled');
  }

  /**
   * Show upgrade modal
   */
  showUpgradeModal() {
    const nextTier = this.userTier === 'gold' ? 'platinum' : 'diamond';
    tradersHelmet.showModal(`
      <h4>Upgrade to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</h4>
      <p>Unlock additional features and benefits with our ${nextTier} membership.</p>
      <div class="text-center">
        <a href="/pages/payment/upgrade.html?tier=${nextTier}" class="btn btn-primary">
          Upgrade Now
        </a>
      </div>
    `, { title: 'Upgrade Your Plan' });
  }

  /**
   * Show customize modal
   */
  showCustomizeModal() {
    tradersHelmet.showModal(`
      <h4>Customize Dashboard</h4>
      <p>Dashboard customization features coming soon!</p>
      <p>You'll be able to:</p>
      <ul>
        <li>Rearrange widgets</li>
        <li>Choose which widgets to display</li>
        <li>Set refresh intervals</li>
        <li>Customize themes</li>
      </ul>
    `, { title: 'Dashboard Customization' });
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.widgets.clear();
    this.activeCharts.clear();
    this.realTimeUpdates.clear();
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.authService?.isAuthenticated()) {
    window.dashboardManager = new DashboardManager();
  }
});

// Make available globally
if (typeof window !== 'undefined') {
  window.DashboardManager = DashboardManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardManager;
}