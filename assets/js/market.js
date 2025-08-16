/**
 * TRADERS HELMET ACADEMY - REAL-TIME MARKET DATA SYSTEM
 * Live market prices, economic calendar, news, and market analysis
 */

class MarketDataManager {
  constructor() {
    this.priceData = new Map();
    this.historicalData = new Map();
    this.newsData = [];
    this.economicEvents = [];
    this.subscriptions = new Map();
    this.priceSubscriptions = new Set();
    this.updateInterval = null;
    this.isConnected = false;
    
    // Configuration
    this.config = {
      updateInterval: 5000, // 5 seconds
      maxHistoryPoints: 1000,
      priceDecimalPlaces: 5,
      enableWebSocket: true,
      fallbackToPolling: true,
      newsRefreshInterval: 300000, // 5 minutes
      calendarRefreshInterval: 3600000 // 1 hour
    };

    // Market instruments
    this.instruments = {
      forex: [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
        'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY', 'EURAUD', 'EURCHF', 'AUDNZD'
      ],
      crypto: [
        'BTCUSD', 'ETHUSD', 'ADAUSD', 'DOTUSD', 'LINKUSD', 'LTCUSD', 'XRPUSD',
        'BNBUSD', 'SOLUSD', 'MATICUSD', 'AVAXUSD', 'ALGOUSD'
      ],
      indices: [
        'SPX500', 'NAS100', 'US30', 'UK100', 'GER30', 'FRA40', 'JPN225', 'AUS200'
      ],
      commodities: [
        'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS', 'COPPER', 'PLATINUM'
      ]
    };

    // Market sessions
    this.marketSessions = {
      sydney: { start: 21, end: 6, timezone: 'Australia/Sydney' },
      tokyo: { start: 0, end: 9, timezone: 'Asia/Tokyo' },
      london: { start: 8, end: 17, timezone: 'Europe/London' },
      newYork: { start: 13, end: 22, timezone: 'America/New_York' }
    };

    this.init();
  }

  /**
   * Initialize market data manager
   */
  async init() {
    try {
      // Setup UI if container exists
      const container = document.getElementById('market-container');
      if (container) {
        this.initializeMarketUI();
      }

      // Initialize WebSocket connection
      if (this.config.enableWebSocket) {
        await this.initializeWebSocket();
      }

      // Load initial market data
      await this.loadInitialData();

      // Setup data refresh intervals
      this.setupDataRefresh();

      // Setup event listeners
      this.setupEventListeners();

      console.log('📈 Market Data Manager initialized');
    } catch (error) {
      console.error('❌ Market Data Manager initialization failed:', error);
    }
  }

  /**
   * Initialize market UI
   */
  initializeMarketUI() {
    const container = document.getElementById('market-container');
    if (!container) return;

    container.innerHTML = this.generateMarketHTML();
    this.addMarketStyles();
  }

  /**
   * Generate market HTML structure
   */
  generateMarketHTML() {
    return `
      <div class="market-data-manager">
        <!-- Market Header -->
        <div class="market-header">
          <div class="container-fluid">
            <div class="row align-items-center">
              <div class="col-md-8">
                <h2 class="market-title">
                  <i class="fas fa-globe"></i>
                  Market Data
                  <span class="connection-status ${this.isConnected ? 'connected' : 'disconnected'}" 
                        id="connection-status">
                    <i class="fas fa-circle"></i>
                    ${this.isConnected ? 'Live' : 'Disconnected'}
                  </span>
                </h2>
                <div class="market-sessions" id="market-sessions">
                  <!-- Market sessions will be populated here -->
                </div>
              </div>
              <div class="col-md-4 text-md-end">
                <div class="market-actions">
                  <button class="btn btn-outline-primary btn-sm me-2" id="refresh-market">
                    <i class="fas fa-sync"></i> Refresh
                  </button>
                  <button class="btn btn-outline-info btn-sm" id="market-alerts">
                    <i class="fas fa-bell"></i> Alerts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Market Navigation -->
        <div class="market-nav">
          <div class="container-fluid">
            <ul class="nav nav-tabs market-tabs">
              <li class="nav-item">
                <a class="nav-link active" data-section="overview" href="#overview">
                  <i class="fas fa-chart-line"></i> Overview
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-section="forex" href="#forex">
                  <i class="fas fa-dollar-sign"></i> Forex
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-section="crypto" href="#crypto">
                  <i class="fab fa-bitcoin"></i> Crypto
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-section="indices" href="#indices">
                  <i class="fas fa-chart-bar"></i> Indices
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-section="commodities" href="#commodities">
                  <i class="fas fa-coins"></i> Commodities
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-section="news" href="#news">
                  <i class="fas fa-newspaper"></i> News
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" data-section="calendar" href="#calendar">
                  <i class="fas fa-calendar"></i> Calendar
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Market Content -->
        <div class="market-content">
          <div class="container-fluid">
            <div id="market-section-content">
              <!-- Section content will be loaded here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize WebSocket connection
   */
  async initializeWebSocket() {
    try {
      // This would connect to your WebSocket server for real-time data
      // For now, we'll simulate with polling
      if (this.config.fallbackToPolling) {
        this.setupPolling();
      }
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
      if (this.config.fallbackToPolling) {
        this.setupPolling();
      }
    }
  }

  /**
   * Setup polling for market data
   */
  setupPolling() {
    this.updateInterval = setInterval(() => {
      this.updateMarketData();
    }, this.config.updateInterval);
  }

  /**
   * Load initial market data
   */
  async loadInitialData() {
    try {
      // Load overview section by default
      await this.loadSectionContent('overview');
      
      // Update market sessions
      this.updateMarketSessions();
      
      // Load initial price data for major pairs
      await this.loadMajorPairs();
      
    } catch (error) {
      console.error('Failed to load initial market data:', error);
    }
  }

  /**
   * Load section content
   */
  async loadSectionContent(section) {
    const container = document.getElementById('market-section-content');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
      let content;
      
      switch (section) {
        case 'overview':
          content = await this.generateOverviewContent();
          break;
        case 'forex':
          content = await this.generateForexContent();
          break;
        case 'crypto':
          content = await this.generateCryptoContent();
          break;
        case 'indices':
          content = await this.generateIndicesContent();
          break;
        case 'commodities':
          content = await this.generateCommoditiesContent();
          break;
        case 'news':
          content = await this.generateNewsContent();
          break;
        case 'calendar':
          content = await this.generateCalendarContent();
          break;
        default:
          content = '<div class="alert alert-warning">Section not found</div>';
      }

      container.innerHTML = content;
      
      // Initialize section-specific features
      this.initializeSectionFeatures(section);
      
    } catch (error) {
      console.error(`Failed to load section ${section}:`, error);
      container.innerHTML = '<div class="alert alert-danger">Failed to load market data</div>';
    }
  }

  /**
   * Generate overview content
   */
  async generateOverviewContent() {
    const majorPairs = await this.fetchMajorPairs();
    const marketSummary = await this.getMarketSummary();
    
    return `
      <div class="market-overview">
        <!-- Market Summary -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="summary-card trending-up">
              <div class="summary-icon">
                <i class="fas fa-arrow-up"></i>
              </div>
              <div class="summary-details">
                <h4>${marketSummary.trending_up || 0}</h4>
                <p>Trending Up</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="summary-card trending-down">
              <div class="summary-icon">
                <i class="fas fa-arrow-down"></i>
              </div>
              <div class="summary-details">
                <h4>${marketSummary.trending_down || 0}</h4>
                <p>Trending Down</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="summary-card volatility">
              <div class="summary-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="summary-details">
                <h4>${marketSummary.high_volatility || 0}</h4>
                <p>High Volatility</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="summary-card volume">
              <div class="summary-icon">
                <i class="fas fa-chart-bar"></i>
              </div>
              <div class="summary-details">
                <h4>${this.formatVolume(marketSummary.total_volume || 0)}</h4>
                <p>24h Volume</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Major Pairs -->
        <div class="row">
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-star"></i> Major Currency Pairs</h5>
              </div>
              <div class="card-body">
                <div class="instruments-grid">
                  ${majorPairs.map(pair => this.generateInstrumentCard(pair)).join('')}
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-lg-4">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-fire"></i> Market Movers</h5>
              </div>
              <div class="card-body">
                <div id="market-movers">
                  ${await this.generateMarketMovers()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Market Heat Map -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-th"></i> Market Heat Map</h5>
              </div>
              <div class="card-body">
                <div class="heatmap-container" id="market-heatmap">
                  ${this.generateHeatMap()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate instrument card
   */
  generateInstrumentCard(instrument) {
    const changeClass = instrument.change >= 0 ? 'positive' : 'negative';
    const changeIcon = instrument.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    
    return `
      <div class="instrument-card" data-symbol="${instrument.symbol}">
        <div class="instrument-header">
          <h6 class="instrument-symbol">${instrument.symbol}</h6>
          <div class="instrument-actions">
            <button class="btn btn-sm btn-outline-primary" onclick="marketData.viewChart('${instrument.symbol}')">
              <i class="fas fa-chart-line"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="marketData.addToWatchlist('${instrument.symbol}')">
              <i class="fas fa-star"></i>
            </button>
          </div>
        </div>
        
        <div class="instrument-price">
          <span class="price" id="price-${instrument.symbol}">${this.formatPrice(instrument.price)}</span>
        </div>
        
        <div class="instrument-change ${changeClass}">
          <i class="fas ${changeIcon}"></i>
          <span class="change-value">${instrument.change >= 0 ? '+' : ''}${instrument.change.toFixed(2)}%</span>
          <span class="change-pips">(${instrument.pips >= 0 ? '+' : ''}${instrument.pips} pips)</span>
        </div>
        
        <div class="instrument-meta">
          <div class="meta-item">
            <span class="meta-label">High</span>
            <span class="meta-value">${this.formatPrice(instrument.high)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Low</span>
            <span class="meta-value">${this.formatPrice(instrument.low)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate market movers
   */
  async generateMarketMovers() {
    const movers = await this.getMarketMovers();
    
    return `
      <div class="market-movers">
        <div class="movers-section">
          <h6 class="text-success"><i class="fas fa-arrow-up"></i> Top Gainers</h6>
          ${movers.gainers.slice(0, 5).map(mover => `
            <div class="mover-item">
              <span class="mover-symbol">${mover.symbol}</span>
              <span class="mover-change text-success">+${mover.change.toFixed(2)}%</span>
            </div>
          `).join('')}
        </div>
        
        <div class="movers-section">
          <h6 class="text-danger"><i class="fas fa-arrow-down"></i> Top Losers</h6>
          ${movers.losers.slice(0, 5).map(mover => `
            <div class="mover-item">
              <span class="mover-symbol">${mover.symbol}</span>
              <span class="mover-change text-danger">${mover.change.toFixed(2)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate heat map
   */
  generateHeatMap() {
    const heatmapData = this.getHeatMapData();
    
    return heatmapData.map(item => `
      <div class="heatmap-item ${item.change >= 0 ? 'positive' : 'negative'}" 
           style="flex: ${Math.abs(item.change)}; min-width: 60px;"
           title="${item.symbol}: ${item.change.toFixed(2)}%">
        <div class="heatmap-symbol">${item.symbol}</div>
        <div class="heatmap-change">${item.change.toFixed(1)}%</div>
      </div>
    `).join('');
  }

  /**
   * Generate news content
   */
  async generateNewsContent() {
    const news = await this.fetchMarketNews();
    
    return `
      <div class="market-news">
        <div class="row">
          <div class="col-lg-8">
            <div class="news-main">
              ${news.slice(0, 1).map(article => `
                <div class="featured-news">
                  <div class="news-image">
                    <img src="${article.image || '/api/placeholder/400/200'}" alt="News Image">
                  </div>
                  <div class="news-content">
                    <h3>${article.title}</h3>
                    <p class="news-summary">${article.summary || article.description.substring(0, 200) + '...'}</p>
                    <div class="news-meta">
                      <span class="news-source"><i class="fas fa-building"></i> ${article.source}</span>
                      <span class="news-time"><i class="fas fa-clock"></i> ${this.getTimeAgo(article.published_at)}</span>
                      <span class="news-impact impact-${article.impact || 'medium'}">
                        <i class="fas fa-exclamation-triangle"></i> ${(article.impact || 'medium').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              `).join('')}
              
              <div class="news-list">
                ${news.slice(1).map(article => `
                  <div class="news-item">
                    <div class="news-item-content">
                      <h5>${article.title}</h5>
                      <p>${article.description.substring(0, 150) + '...'}</p>
                      <div class="news-item-meta">
                        <span class="news-source">${article.source}</span>
                        <span class="news-time">${this.getTimeAgo(article.published_at)}</span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="col-lg-4">
            <div class="news-sidebar">
              <div class="breaking-news">
                <h6><i class="fas fa-bolt text-warning"></i> Breaking News</h6>
                <div id="breaking-news-ticker">
                  <!-- Breaking news will scroll here -->
                </div>
              </div>
              
              <div class="market-sentiment">
                <h6><i class="fas fa-chart-pie"></i> Market Sentiment</h6>
                <div class="sentiment-meter">
                  <div class="sentiment-bar">
                    <div class="sentiment-fill" style="width: 65%"></div>
                  </div>
                  <div class="sentiment-labels">
                    <span>Fear</span>
                    <span>Greed</span>
                  </div>
                  <div class="sentiment-value">65 - Greed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate economic calendar content
   */
  async generateCalendarContent() {
    const events = await this.fetchEconomicEvents();
    
    return `
      <div class="economic-calendar">
        <div class="calendar-filters">
          <div class="row">
            <div class="col-md-3">
              <select class="form-select" id="calendar-country">
                <option value="">All Countries</option>
                <option value="USD">United States</option>
                <option value="EUR">European Union</option>
                <option value="GBP">United Kingdom</option>
                <option value="JPY">Japan</option>
                <option value="CAD">Canada</option>
                <option value="AUD">Australia</option>
              </select>
            </div>
            <div class="col-md-3">
              <select class="form-select" id="calendar-impact">
                <option value="">All Impact</option>
                <option value="high">High Impact</option>
                <option value="medium">Medium Impact</option>
                <option value="low">Low Impact</option>
              </select>
            </div>
            <div class="col-md-3">
              <input type="date" class="form-control" id="calendar-date" 
                     value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="col-md-3">
              <button class="btn btn-primary w-100" id="apply-calendar-filters">
                <i class="fas fa-filter"></i> Apply Filters
              </button>
            </div>
          </div>
        </div>
        
        <div class="calendar-content">
          <div class="calendar-timeline">
            ${events.map(event => `
              <div class="calendar-event impact-${event.impact}">
                <div class="event-time">
                  <span class="event-date">${this.formatEventDate(event.date)}</span>
                  <span class="event-hour">${this.formatEventTime(event.date)}</span>
                </div>
                <div class="event-flag">
                  <img src="/api/placeholder/24/16" alt="${event.country}" class="flag-icon">
                </div>
                <div class="event-content">
                  <h6 class="event-title">${event.title}</h6>
                  <div class="event-details">
                    <span class="event-currency">${event.currency}</span>
                    <span class="event-impact impact-${event.impact}">
                      ${Array(event.impact === 'high' ? 3 : event.impact === 'medium' ? 2 : 1).fill('●').join('')}
                    </span>
                  </div>
                  ${event.forecast !== null || event.previous !== null ? `
                    <div class="event-values">
                      ${event.forecast !== null ? `<span class="event-forecast">F: ${event.forecast}</span>` : ''}
                      ${event.previous !== null ? `<span class="event-previous">P: ${event.previous}</span>` : ''}
                      ${event.actual !== null ? `<span class="event-actual">A: ${event.actual}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update market data
   */
  async updateMarketData() {
    try {
      // Update prices for subscribed instruments
      const symbols = Array.from(this.priceSubscriptions);
      if (symbols.length > 0) {
        const prices = await this.fetchPrices(symbols);
        this.updatePriceDisplay(prices);
      }

      // Update connection status
      this.updateConnectionStatus(true);
      
    } catch (error) {
      console.error('Failed to update market data:', error);
      this.updateConnectionStatus(false);
    }
  }

  /**
   * Fetch market prices
   */
  async fetchPrices(symbols) {
    try {
      const response = await window.apiService?.market.getPrices(symbols);
      return response?.data || this.getMockPrices(symbols);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      return this.getMockPrices(symbols);
    }
  }

  /**
   * Update price display
   */
  updatePriceDisplay(prices) {
    Object.entries(prices).forEach(([symbol, data]) => {
      const priceElement = document.getElementById(`price-${symbol}`);
      if (priceElement) {
        const oldPrice = parseFloat(priceElement.textContent);
        const newPrice = data.price;
        
        // Update price
        priceElement.textContent = this.formatPrice(newPrice);
        
        // Add flash effect
        if (oldPrice !== newPrice) {
          const changeClass = newPrice > oldPrice ? 'price-up' : 'price-down';
          priceElement.classList.add(changeClass);
          setTimeout(() => {
            priceElement.classList.remove(changeClass);
          }, 500);
        }
      }
    });
  }

  /**
   * Update market sessions
   */
  updateMarketSessions() {
    const container = document.getElementById('market-sessions');
    if (!container) return;

    const currentSession = this.getCurrentMarketSession();
    const sessions = Object.keys(this.marketSessions);
    
    container.innerHTML = sessions.map(session => {
      const isActive = session === currentSession.active;
      return `
        <span class="market-session ${isActive ? 'active' : ''}">
          <i class="fas fa-circle"></i>
          ${session.charAt(0).toUpperCase() + session.slice(1)}
        </span>
      `;
    }).join('');
  }

  /**
   * Get current market session
   */
  getCurrentMarketSession() {
    const now = new Date();
    const hour = now.getUTCHours();
    
    for (const [session, times] of Object.entries(this.marketSessions)) {
      if (
        (times.start < times.end && hour >= times.start && hour < times.end) ||
        (times.start > times.end && (hour >= times.start || hour < times.end))
      ) {
        return { active: session, name: session.charAt(0).toUpperCase() + session.slice(1) };
      }
    }
    
    return { active: null, name: 'Market Closed' };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Market navigation
    document.querySelectorAll('.market-tabs .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.closest('.nav-link').dataset.section;
        this.switchSection(section);
      });
    });

    // Global market actions
    document.addEventListener('click', (e) => {
      switch (e.target.id) {
        case 'refresh-market':
          this.refreshMarketData();
          break;
        case 'market-alerts':
          this.showAlertsModal();
          break;
      }
    });
  }

  /**
   * Switch market section
   */
  async switchSection(section) {
    // Update active tab
    document.querySelectorAll('.market-tabs .nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Load section content
    await this.loadSectionContent(section);
  }

  /**
   * Initialize section-specific features
   */
  initializeSectionFeatures(section) {
    switch (section) {
      case 'overview':
        this.setupOverviewFeatures();
        break;
      case 'forex':
      case 'crypto':
      case 'indices':
      case 'commodities':
        this.setupInstrumentFeatures(section);
        break;
      case 'news':
        this.setupNewsFeatures();
        break;
      case 'calendar':
        this.setupCalendarFeatures();
        break;
    }
  }

  /**
   * Setup overview features
   */
  setupOverviewFeatures() {
    // Subscribe to major pairs for real-time updates
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
    majorPairs.forEach(pair => {
      this.priceSubscriptions.add(pair);
    });
  }

  /**
   * Fetch data methods
   */
  async fetchMajorPairs() {
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
    return this.getMockInstruments(symbols);
  }

  async getMarketSummary() {
    return {
      trending_up: 125,
      trending_down: 87,
      high_volatility: 23,
      total_volume: 5200000000
    };
  }

  async getMarketMovers() {
    return {
      gainers: [
        { symbol: 'EURUSD', change: 1.25 },
        { symbol: 'GBPUSD', change: 0.87 },
        { symbol: 'AUDUSD', change: 0.65 },
        { symbol: 'NZDUSD', change: 0.45 },
        { symbol: 'EURGBP', change: 0.32 }
      ],
      losers: [
        { symbol: 'USDJPY', change: -1.15 },
        { symbol: 'USDCHF', change: -0.95 },
        { symbol: 'USDCAD', change: -0.75 },
        { symbol: 'EURJPY', change: -0.55 },
        { symbol: 'GBPJPY', change: -0.35 }
      ]
    };
  }

  getHeatMapData() {
    return [
      { symbol: 'EURUSD', change: 1.25 },
      { symbol: 'GBPUSD', change: 0.87 },
      { symbol: 'USDJPY', change: -1.15 },
      { symbol: 'USDCHF', change: -0.95 },
      { symbol: 'AUDUSD', change: 0.65 },
      { symbol: 'USDCAD', change: -0.75 },
      { symbol: 'NZDUSD', change: 0.45 },
      { symbol: 'EURGBP', change: 0.32 }
    ];
  }

  async fetchMarketNews() {
    return [
      {
        title: 'Federal Reserve Signals Interest Rate Changes Ahead',
        description: 'The Federal Reserve Chairman spoke about upcoming monetary policy changes that could significantly impact global markets.',
        summary: 'Fed signals potential rate changes in upcoming meetings, causing market volatility.',
        source: 'Reuters',
        published_at: new Date(Date.now() - 3600000).toISOString(),
        impact: 'high',
        image: '/api/placeholder/400/200'
      },
      {
        title: 'European Central Bank Maintains Current Policy',
        description: 'ECB decides to keep interest rates unchanged amid ongoing economic uncertainty.',
        source: 'Bloomberg',
        published_at: new Date(Date.now() - 7200000).toISOString(),
        impact: 'medium'
      },
      {
        title: 'Oil Prices Surge on Supply Concerns',
        description: 'Crude oil prices jump 3% following reports of potential supply disruptions.',
        source: 'CNBC',
        published_at: new Date(Date.now() - 10800000).toISOString(),
        impact: 'high'
      }
    ];
  }

  async fetchEconomicEvents() {
    const today = new Date();
    return [
      {
        title: 'Non-Farm Payrolls',
        country: 'US',
        currency: 'USD',
        impact: 'high',
        date: new Date(today.getTime() + 3600000).toISOString(),
        forecast: 200000,
        previous: 185000,
        actual: null
      },
      {
        title: 'Unemployment Rate',
        country: 'US',
        currency: 'USD',
        impact: 'high',
        date: new Date(today.getTime() + 3600000).toISOString(),
        forecast: 3.7,
        previous: 3.8,
        actual: null
      },
      {
        title: 'CPI Monthly',
        country: 'EU',
        currency: 'EUR',
        impact: 'medium',
        date: new Date(today.getTime() + 7200000).toISOString(),
        forecast: 0.2,
        previous: 0.1,
        actual: null
      }
    ];
  }

  /**
   * Mock data generators
   */
  getMockInstruments(symbols) {
    return symbols.map(symbol => ({
      symbol,
      price: this.generateRandomPrice(symbol),
      change: (Math.random() - 0.5) * 2,
      pips: Math.floor((Math.random() - 0.5) * 100),
      high: this.generateRandomPrice(symbol) * 1.001,
      low: this.generateRandomPrice(symbol) * 0.999,
      volume: Math.floor(Math.random() * 1000000)
    }));
  }

  getMockPrices(symbols) {
    const prices = {};
    symbols.forEach(symbol => {
      prices[symbol] = {
        price: this.generateRandomPrice(symbol),
        timestamp: Date.now()
      };
    });
    return prices;
  }

  generateRandomPrice(symbol) {
    const basePrices = {
      'EURUSD': 1.0875,
      'GBPUSD': 1.2650,
      'USDJPY': 149.85,
      'USDCHF': 0.8875,
      'AUDUSD': 0.6650,
      'USDCAD': 1.3575,
      'BTCUSD': 45250.50,
      'ETHUSD': 2850.75
    };
    
    const basePrice = basePrices[symbol] || 1.0000;
    const variation = (Math.random() - 0.5) * 0.01;
    return basePrice * (1 + variation);
  }

  /**
   * Utility methods
   */
  formatPrice(price) {
    return parseFloat(price).toFixed(this.config.priceDecimalPlaces);
  }

  formatVolume(volume) {
    if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
    return volume.toString();
  }

  formatEventDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatEventTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
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

  /**
   * Update connection status
   */
  updateConnectionStatus(connected) {
    this.isConnected = connected;
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
      statusElement.innerHTML = `
        <i class="fas fa-circle"></i>
        ${connected ? 'Live' : 'Disconnected'}
      `;
    }
  }

  /**
   * Add market-specific styles
   */
  addMarketStyles() {
    if (document.getElementById('market-styles')) return;

    const styles = `
      <style id="market-styles">
        .market-data-manager {
          min-height: 100vh;
          background: #f8f9fa;
        }
        
        .market-header {
          background: var(--white);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 2rem 0;
          margin-bottom: 0;
        }
        
        .market-title {
          color: var(--primary-deep-blue);
          margin-bottom: 0.5rem;
        }
        
        .connection-status {
          font-size: 0.875rem;
          margin-left: 1rem;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
        }
        
        .connection-status.connected {
          background: rgba(40, 167, 69, 0.1);
          color: var(--success);
        }
        
        .connection-status.disconnected {
          background: rgba(220, 53, 69, 0.1);
          color: var(--danger);
        }
        
        .connection-status i {
          font-size: 0.75rem;
          margin-right: 0.25rem;
        }
        
        .market-sessions {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        
        .market-session {
          font-size: 0.875rem;
          color: var(--gray);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .market-session.active {
          color: var(--success);
          font-weight: var(--font-weight-semibold);
        }
        
        .market-session i {
          font-size: 0.5rem;
        }
        
        .market-nav {
          background: var(--white);
          border-bottom: 1px solid #dee2e6;
          margin-bottom: 2rem;
        }
        
        .market-tabs {
          border-bottom: none;
        }
        
        .market-tabs .nav-link {
          color: var(--gray);
          border: none;
          padding: 1rem 1.5rem;
          transition: all var(--transition-normal);
        }
        
        .market-tabs .nav-link:hover {
          color: var(--primary-blue);
          background: rgba(42, 82, 152, 0.1);
        }
        
        .market-tabs .nav-link.active {
          color: var(--primary-blue);
          background: rgba(42, 82, 152, 0.1);
          border-bottom: 3px solid var(--primary-blue);
        }
        
        .summary-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-normal);
          margin-bottom: 1rem;
        }
        
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .summary-icon {
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
        
        .trending-up .summary-icon {
          background: var(--success);
        }
        
        .trending-down .summary-icon {
          background: var(--danger);
        }
        
        .volatility .summary-icon {
          background: var(--warning);
        }
        
        .volume .summary-icon {
          background: var(--info);
        }
        
        .summary-details h4 {
          margin: 0;
          color: var(--dark-gray);
          font-weight: var(--font-weight-bold);
        }
        
        .summary-details p {
          margin: 0;
          color: var(--gray);
          font-size: 0.875rem;
        }
        
        .instruments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        .instrument-card {
          background: var(--white);
          border: 1px solid #e9ecef;
          border-radius: var(--radius-lg);
          padding: 1rem;
          transition: all var(--transition-normal);
        }
        
        .instrument-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary-blue);
        }
        
        .instrument-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .instrument-symbol {
          margin: 0;
          font-weight: var(--font-weight-bold);
          color: var(--dark-gray);
        }
        
        .instrument-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .instrument-price {
          font-size: 1.5rem;
          font-weight: var(--font-weight-bold);
          color: var(--dark-gray);
          margin-bottom: 0.5rem;
        }
        
        .instrument-change {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .instrument-change.positive {
          color: var(--success);
        }
        
        .instrument-change.negative {
          color: var(--danger);
        }
        
        .instrument-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .meta-label {
          color: var(--gray);
          font-size: 0.75rem;
        }
        
        .meta-value {
          font-weight: var(--font-weight-semibold);
          color: var(--dark-gray);
        }
        
        .heatmap-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          min-height: 200px;
        }
        
        .heatmap-item {
          border-radius: var(--radius-md);
          padding: 1rem;
          color: var(--white);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 80px;
          transition: all var(--transition-normal);
        }
        
        .heatmap-item.positive {
          background: var(--success);
        }
        
        .heatmap-item.negative {
          background: var(--danger);
        }
        
        .heatmap-item:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-lg);
        }
        
        .heatmap-symbol {
          font-weight: var(--font-weight-bold);
          font-size: 0.875rem;
        }
        
        .heatmap-change {
          font-size: 0.75rem;
          opacity: 0.9;
        }
        
        .market-movers {
          display: grid;
          gap: 1.5rem;
        }
        
        .movers-section h6 {
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .mover-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }
        
        .mover-symbol {
          font-weight: var(--font-weight-semibold);
        }
        
        .mover-change {
          font-weight: var(--font-weight-bold);
        }
        
        .price-up {
          animation: flashGreen 0.5s ease;
        }
        
        .price-down {
          animation: flashRed 0.5s ease;
        }
        
        @keyframes flashGreen {
          0% { background-color: transparent; }
          50% { background-color: rgba(40, 167, 69, 0.3); }
          100% { background-color: transparent; }
        }
        
        @keyframes flashRed {
          0% { background-color: transparent; }
          50% { background-color: rgba(220, 53, 69, 0.3); }
          100% { background-color: transparent; }
        }
        
        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
        }
        
        @media (max-width: 768px) {
          .market-header {
            padding: 1rem 0;
          }
          
          .market-sessions {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .instruments-grid {
            grid-template-columns: 1fr;
          }
          
          .heatmap-container {
            flex-direction: column;
          }
          
          .heatmap-item {
            min-width: 100%;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Setup data refresh intervals
   */
  setupDataRefresh() {
    // Refresh news every 5 minutes
    setInterval(() => {
      if (document.querySelector('.nav-link[data-section="news"].active')) {
        this.loadSectionContent('news');
      }
    }, this.config.newsRefreshInterval);

    // Refresh economic calendar every hour
    setInterval(() => {
      if (document.querySelector('.nav-link[data-section="calendar"].active')) {
        this.loadSectionContent('calendar');
      }
    }, this.config.calendarRefreshInterval);
  }

  /**
   * Public API methods
   */
  viewChart(symbol) {
    // This would integrate with the charts system
    if (window.tradingCharts) {
      window.tradingCharts.createChart(`chart-${symbol}`, 'line', {
        symbol: symbol,
        realTime: true
      });
    }
  }

  addToWatchlist(symbol) {
    // Add to user's watchlist
    tradersHelmet.showNotification(`${symbol} added to watchlist`, 'success');
  }

  refreshMarketData() {
    this.updateMarketData();
    tradersHelmet.showNotification('Market data refreshed', 'info');
  }

  showAlertsModal() {
    tradersHelmet.showModal(`
      <h4>Price Alerts</h4>
      <p>Price alert functionality coming soon!</p>
      <p>You'll be able to:</p>
      <ul>
        <li>Set price alerts for any instrument</li>
        <li>Receive notifications when targets are hit</li>
        <li>Customize alert conditions</li>
        <li>Manage all your alerts in one place</li>
      </ul>
    `, { title: 'Price Alerts' });
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Clear subscriptions
    this.subscriptions.clear();
    this.priceSubscriptions.clear();

    // Clear data
    this.priceData.clear();
    this.historicalData.clear();
  }
}

// Initialize market data manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('market-container')) {
    window.marketData = new MarketDataManager();
  }
});

// Make available globally
if (typeof window !== 'undefined') {
  window.MarketDataManager = MarketDataManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketDataManager;
}