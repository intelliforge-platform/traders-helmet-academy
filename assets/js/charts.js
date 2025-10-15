/**
 * TRADERS HELMET ACADEMY - CHARTS & TRADING VISUALIZATION
 * Advanced charting system with technical indicators and real-time updates
 */

class TradingChartsManager {
  constructor() {
    this.charts = new Map();
    this.indicators = new Map();
    this.realTimeData = new Map();
    this.subscriptions = new Map();
    
    // Chart configuration defaults
    this.defaultConfig = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#fff',
          borderWidth: 1,
          displayColors: false,
          callbacks: {}
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              minute: 'HH:mm',
              hour: 'HH:mm',
              day: 'MMM DD',
              week: 'MMM DD',
              month: 'MMM YYYY'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#666'
          }
        },
        y: {
          position: 'right',
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#666',
            callback: function(value) {
              return typeof value === 'number' ? value.toFixed(4) : value;
            }
          }
        }
      }
    };

    this.setupIndicators();
    this.init();
  }

  /**
   * Initialize charts manager
   */
  init() {
    // Load Chart.js plugins if needed
    this.loadChartPlugins();
    
    console.log('📊 Trading Charts Manager initialized');
  }

  /**
   * Load additional Chart.js plugins
   */
  async loadChartPlugins() {
    try {
      // Load additional plugins as needed
      // Example: chartjs-adapter-date-fns for time scale
      if (typeof Chart !== 'undefined') {
        // Register custom plugins
        this.registerCustomPlugins();
      }
    } catch (error) {
      console.error('Failed to load chart plugins:', error);
    }
  }

  /**
   * Register custom Chart.js plugins
   */
  registerCustomPlugins() {
    // Crosshair plugin
    Chart.register({
      id: 'crosshair',
      afterEvent: (chart, args) => {
        const { event } = args;
        if (event.type === 'mousemove') {
          chart.crosshair = { x: event.x, y: event.y };
          chart.draw();
        }
      },
      afterDraw: (chart) => {
        if (chart.crosshair) {
          const { ctx, chartArea } = chart;
          const { x, y } = chart.crosshair;
          
          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
          
          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
          
          ctx.restore();
        }
      }
    });

    // Price levels plugin
    Chart.register({
      id: 'priceLevels',
      afterDraw: (chart) => {
        if (chart.options.plugins.priceLevels?.levels) {
          const { ctx, chartArea, scales } = chart;
          const levels = chart.options.plugins.priceLevels.levels;
          
          ctx.save();
          
          levels.forEach(level => {
            const y = scales.y.getPixelForValue(level.price);
            
            ctx.setLineDash(level.style === 'dashed' ? [5, 5] : []);
            ctx.strokeStyle = level.color || '#ffcc00';
            ctx.lineWidth = level.width || 2;
            
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
            
            // Draw label
            if (level.label) {
              ctx.fillStyle = level.color || '#ffcc00';
              ctx.font = '12px Arial';
              ctx.fillText(level.label, chartArea.right - 100, y - 5);
            }
          });
          
          ctx.restore();
        }
      }
    });
  }

  /**
   * Create a new trading chart
   */
  createChart(containerId, type = 'line', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Chart container not found:', containerId);
      return null;
    }

    // Create canvas element
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    const config = this.buildChartConfig(type, options);
    const chart = new Chart(canvas, config);
    
    const chartInstance = {
      id: containerId,
      chart,
      canvas,
      container,
      type,
      options: options,
      data: [],
      isRealTime: options.realTime || false,
      symbol: options.symbol || null,
      timeframe: options.timeframe || '1h'
    };

    this.charts.set(containerId, chartInstance);
    
    // Setup real-time updates if enabled
    if (chartInstance.isRealTime && chartInstance.symbol) {
      this.setupRealTimeUpdates(containerId);
    }

    return chartInstance;
  }

  /**
   * Build chart configuration based on type and options
   */
  buildChartConfig(type, options) {
    const config = {
      type,
      data: {
        datasets: []
      },
      options: { ...this.defaultConfig }
    };

    // Merge custom options
    config.options = this.deepMerge(config.options, options.chartOptions || {});

    // Setup chart type specific configurations
    switch (type) {
      case 'candlestick':
        config.type = 'line'; // We'll simulate candlestick with custom drawing
        config.options.plugins.candlestick = {
          enabled: true,
          upColor: '#00ff88',
          downColor: '#ff4444',
          wickColor: '#666'
        };
        break;
        
      case 'ohlc':
        config.type = 'line';
        config.options.plugins.ohlc = {
          enabled: true,
          upColor: '#00ff88',
          downColor: '#ff4444'
        };
        break;
        
      case 'volume':
        config.options.scales.y.beginAtZero = true;
        break;
    }

    // Add price levels if specified
    if (options.priceLevels) {
      config.options.plugins.priceLevels = {
        levels: options.priceLevels
      };
    }

    // Enable crosshair if specified
    if (options.crosshair !== false) {
      config.options.plugins.crosshair = { enabled: true };
    }

    return config;
  }

  /**
   * Setup real-time data updates
   */
  setupRealTimeUpdates(chartId) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance || !chartInstance.symbol) return;

    // Subscribe to real-time price updates
    if (window.supabaseManager) {
      const subscription = window.supabaseManager.supabase
        .channel(`price_updates_${chartInstance.symbol}`)
        .on('broadcast', { event: 'price_update' }, (payload) => {
          this.updateChartData(chartId, payload.payload);
        })
        .subscribe();

      this.subscriptions.set(chartId, subscription);
    }

    // Fallback: Poll for updates
    const interval = setInterval(async () => {
      try {
        const priceData = await this.fetchPriceData(
          chartInstance.symbol, 
          chartInstance.timeframe,
          1 // Just latest candle
        );
        
        if (priceData && priceData.length > 0) {
          this.updateChartData(chartId, priceData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch real-time data:', error);
      }
    }, 5000); // Update every 5 seconds

    chartInstance.updateInterval = interval;
  }

  /**
   * Fetch historical price data
   */
  async fetchPriceData(symbol, timeframe = '1h', limit = 100) {
    try {
      if (window.apiService) {
        const response = await window.apiService.market.getCandles(symbol, timeframe, limit);
        return response.data;
      } else {
        // Mock data for demonstration
        return this.generateMockData(limit);
      }
    } catch (error) {
      console.error('Failed to fetch price data:', error);
      return this.generateMockData(limit);
    }
  }

  /**
   * Generate mock price data for demonstration
   */
  generateMockData(count = 100) {
    const data = [];
    let price = 1.2000;
    const now = Date.now();
    
    for (let i = count; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000); // Hourly data
      const change = (Math.random() - 0.5) * 0.01;
      price += change;
      
      const high = price + Math.random() * 0.005;
      const low = price - Math.random() * 0.005;
      const open = data.length > 0 ? data[data.length - 1].close : price;
      const close = price;
      const volume = Math.floor(Math.random() * 1000000);
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume
      });
    }
    
    return data;
  }

  /**
   * Load data into chart
   */
  async loadChartData(chartId, symbol, timeframe = '1h', limit = 100) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance) return;

    try {
      // Show loading state
      this.setChartLoading(chartId, true);
      
      const data = await this.fetchPriceData(symbol, timeframe, limit);
      chartInstance.data = data;
      chartInstance.symbol = symbol;
      chartInstance.timeframe = timeframe;
      
      // Process data based on chart type
      this.updateChartDatasets(chartId, data);
      
      // Hide loading state
      this.setChartLoading(chartId, false);
      
      return data;
    } catch (error) {
      console.error('Failed to load chart data:', error);
      this.setChartLoading(chartId, false);
      throw error;
    }
  }

  /**
   * Update chart datasets with new data
   */
  updateChartDatasets(chartId, data) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance || !data) return;

    const chart = chartInstance.chart;
    
    switch (chartInstance.type) {
      case 'line':
        this.updateLineChart(chart, data);
        break;
      case 'candlestick':
        this.updateCandlestickChart(chart, data);
        break;
      case 'volume':
        this.updateVolumeChart(chart, data);
        break;
      case 'area':
        this.updateAreaChart(chart, data);
        break;
    }
    
    chart.update('none'); // Update without animation for better performance
  }

  /**
   * Update line chart
   */
  updateLineChart(chart, data) {
    const prices = data.map(candle => ({
      x: candle.timestamp,
      y: candle.close
    }));

    chart.data.datasets = [{
      label: 'Price',
      data: prices,
      borderColor: '#2a5298',
      backgroundColor: 'rgba(42, 82, 152, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4
    }];
  }

  /**
   * Update candlestick chart (simulated with line chart)
   */
  updateCandlestickChart(chart, data) {
    // Since Chart.js doesn't have native candlestick support,
    // we'll create a custom implementation
    const candleData = data.map(candle => ({
      x: candle.timestamp,
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close
    }));

    chart.data.datasets = [{
      label: 'OHLC',
      data: candleData,
      borderColor: (ctx) => {
        const candle = candleData[ctx.dataIndex];
        return candle.c >= candle.o ? '#00ff88' : '#ff4444';
      },
      backgroundColor: (ctx) => {
        const candle = candleData[ctx.dataIndex];
        return candle.c >= candle.o ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)';
      },
      borderWidth: 1,
      pointRadius: 0
    }];
  }

  /**
   * Update volume chart
   */
  updateVolumeChart(chart, data) {
    const volumeData = data.map(candle => ({
      x: candle.timestamp,
      y: candle.volume
    }));

    chart.data.datasets = [{
      label: 'Volume',
      data: volumeData,
      backgroundColor: (ctx) => {
        const index = ctx.dataIndex;
        if (index === 0) return 'rgba(42, 82, 152, 0.6)';
        
        const current = data[index];
        const previous = data[index - 1];
        return current.close >= previous.close 
          ? 'rgba(0, 255, 136, 0.6)' 
          : 'rgba(255, 68, 68, 0.6)';
      },
      borderWidth: 0
    }];
  }

  /**
   * Update area chart
   */
  updateAreaChart(chart, data) {
    const prices = data.map(candle => ({
      x: candle.timestamp,
      y: candle.close
    }));

    chart.data.datasets = [{
      label: 'Price',
      data: prices,
      borderColor: '#2a5298',
      backgroundColor: 'rgba(42, 82, 152, 0.3)',
      borderWidth: 2,
      fill: true,
      tension: 0.2,
      pointRadius: 0,
      pointHoverRadius: 4
    }];
  }

  /**
   * Update chart with single new data point
   */
  updateChartData(chartId, newData) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance) return;

    const chart = chartInstance.chart;
    
    // Add or update the latest data point
    if (chartInstance.data.length > 0) {
      const lastCandle = chartInstance.data[chartInstance.data.length - 1];
      
      if (newData.timestamp === lastCandle.timestamp) {
        // Update existing candle
        chartInstance.data[chartInstance.data.length - 1] = newData;
      } else {
        // Add new candle
        chartInstance.data.push(newData);
        
        // Limit data points to prevent memory issues
        if (chartInstance.data.length > 1000) {
          chartInstance.data = chartInstance.data.slice(-500);
        }
      }
    } else {
      chartInstance.data = [newData];
    }

    // Update chart
    this.updateChartDatasets(chartId, chartInstance.data);
  }

  /**
   * Add technical indicator to chart
   */
  addIndicator(chartId, indicatorType, params = {}) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance || !chartInstance.data.length) return;

    const indicator = this.calculateIndicator(indicatorType, chartInstance.data, params);
    if (!indicator) return;

    const chart = chartInstance.chart;
    
    // Add indicator dataset
    chart.data.datasets.push({
      label: indicator.label,
      data: indicator.data,
      borderColor: indicator.color || '#ffcc00',
      backgroundColor: indicator.backgroundColor || 'transparent',
      borderWidth: indicator.width || 1,
      fill: false,
      tension: 0,
      pointRadius: 0,
      yAxisID: indicator.yAxisID || 'y'
    });

    // Add separate Y-axis if needed
    if (indicator.separateAxis) {
      chart.options.scales[indicator.yAxisID] = {
        type: 'linear',
        position: 'left',
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#666'
        }
      };
    }

    chart.update();
    
    // Store indicator reference
    if (!chartInstance.indicators) {
      chartInstance.indicators = [];
    }
    chartInstance.indicators.push({
      type: indicatorType,
      params,
      datasetIndex: chart.data.datasets.length - 1
    });
  }

  /**
   * Setup technical indicators
   */
  setupIndicators() {
    // Simple Moving Average
    this.indicators.set('sma', (data, params) => {
      const period = params.period || 20;
      const values = data.map(d => d.close);
      const smaData = [];
      
      for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        smaData.push({
          x: data[i].timestamp,
          y: sum / period
        });
      }
      
      return {
        label: `SMA(${period})`,
        data: smaData,
        color: params.color || '#ffcc00'
      };
    });

    // Exponential Moving Average
    this.indicators.set('ema', (data, params) => {
      const period = params.period || 20;
      const multiplier = 2 / (period + 1);
      const values = data.map(d => d.close);
      const emaData = [];
      
      let ema = values[0];
      emaData.push({ x: data[0].timestamp, y: ema });
      
      for (let i = 1; i < values.length; i++) {
        ema = (values[i] * multiplier) + (ema * (1 - multiplier));
        emaData.push({
          x: data[i].timestamp,
          y: ema
        });
      }
      
      return {
        label: `EMA(${period})`,
        data: emaData,
        color: params.color || '#ff6b6b'
      };
    });

    // Relative Strength Index
    this.indicators.set('rsi', (data, params) => {
      const period = params.period || 14;
      const values = data.map(d => d.close);
      const rsiData = [];
      
      // Calculate price changes
      const changes = [];
      for (let i = 1; i < values.length; i++) {
        changes.push(values[i] - values[i - 1]);
      }
      
      // Calculate RSI
      for (let i = period; i < changes.length; i++) {
        const recentChanges = changes.slice(i - period, i);
        const gains = recentChanges.filter(c => c > 0);
        const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
        
        const avgGain = gains.reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        rsiData.push({
          x: data[i + 1].timestamp,
          y: rsi
        });
      }
      
      return {
        label: 'RSI(14)',
        data: rsiData,
        color: params.color || '#9c27b0',
        yAxisID: 'rsi',
        separateAxis: true
      };
    });

    // Bollinger Bands
    this.indicators.set('bollinger', (data, params) => {
      const period = params.period || 20;
      const stdDev = params.stdDev || 2;
      const values = data.map(d => d.close);
      const upperBand = [];
      const lowerBand = [];
      const middleBand = [];
      
      for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / period;
        
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        const timestamp = data[i].timestamp;
        middleBand.push({ x: timestamp, y: sma });
        upperBand.push({ x: timestamp, y: sma + (standardDeviation * stdDev) });
        lowerBand.push({ x: timestamp, y: sma - (standardDeviation * stdDev) });
      }
      
      return [
        {
          label: 'BB Upper',
          data: upperBand,
          color: '#ff9800',
          width: 1
        },
        {
          label: 'BB Middle',
          data: middleBand,
          color: '#2196f3',
          width: 1
        },
        {
          label: 'BB Lower',
          data: lowerBand,
          color: '#ff9800',
          width: 1
        }
      ];
    });
  }

  /**
   * Calculate technical indicator
   */
  calculateIndicator(type, data, params) {
    const calculator = this.indicators.get(type);
    if (!calculator) {
      console.warn('Unknown indicator type:', type);
      return null;
    }

    return calculator(data, params);
  }

  /**
   * Remove indicator from chart
   */
  removeIndicator(chartId, indicatorIndex) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance || !chartInstance.indicators) return;

    const chart = chartInstance.chart;
    const indicator = chartInstance.indicators[indicatorIndex];
    
    if (indicator) {
      // Remove dataset
      chart.data.datasets.splice(indicator.datasetIndex, 1);
      
      // Remove indicator reference
      chartInstance.indicators.splice(indicatorIndex, 1);
      
      // Update dataset indices
      chartInstance.indicators.forEach((ind, index) => {
        if (ind.datasetIndex > indicator.datasetIndex) {
          ind.datasetIndex--;
        }
      });
      
      chart.update();
    }
  }

  /**
   * Set chart loading state
   */
  setChartLoading(chartId, loading) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance) return;

    const container = chartInstance.container;
    
    if (loading) {
      // Add loading overlay
      if (!container.querySelector('.chart-loading')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'chart-loading';
        loadingOverlay.innerHTML = `
          <div class="loading-content">
            <div class="spinner-border text-primary" role="status">
              <span class="sr-only">Loading...</span>
            </div>
            <p>Loading chart data...</p>
          </div>
        `;
        loadingOverlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        `;
        container.style.position = 'relative';
        container.appendChild(loadingOverlay);
      }
    } else {
      // Remove loading overlay
      const loadingOverlay = container.querySelector('.chart-loading');
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
    }
  }

  /**
   * Resize chart
   */
  resizeChart(chartId) {
    const chartInstance = this.charts.get(chartId);
    if (chartInstance) {
      chartInstance.chart.resize();
    }
  }

  /**
   * Destroy chart
   */
  destroyChart(chartId) {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance) return;

    // Clean up real-time subscription
    if (this.subscriptions.has(chartId)) {
      const subscription = this.subscriptions.get(chartId);
      if (subscription && window.supabaseManager) {
        window.supabaseManager.supabase.removeChannel(subscription);
      }
      this.subscriptions.delete(chartId);
    }

    // Clear update interval
    if (chartInstance.updateInterval) {
      clearInterval(chartInstance.updateInterval);
    }

    // Destroy chart
    chartInstance.chart.destroy();
    
    // Remove from registry
    this.charts.delete(chartId);
  }

  /**
   * Get chart instance
   */
  getChart(chartId) {
    return this.charts.get(chartId);
  }

  /**
   * Export chart as image
   */
  exportChart(chartId, format = 'png') {
    const chartInstance = this.charts.get(chartId);
    if (!chartInstance) return null;

    return chartInstance.chart.toBase64Image(format, 1.0);
  }

  /**
   * Utility methods
   */
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
   * Cleanup all charts
   */
  cleanup() {
    for (const chartId of this.charts.keys()) {
      this.destroyChart(chartId);
    }
  }
}

// Create global charts manager instance
const tradingCharts = new TradingChartsManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.tradingCharts = tradingCharts;
  
  // Auto-resize charts on window resize
  window.addEventListener('resize', THA_Utils.performance.throttle(() => {
    for (const chartId of tradingCharts.charts.keys()) {
      tradingCharts.resizeChart(chartId);
    }
  }, 250));
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradingChartsManager;
}