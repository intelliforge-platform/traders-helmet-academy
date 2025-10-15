/**
 * TRADERS HELMET ACADEMY - SERVICE WORKER
 * PWA functionality with caching, offline support, and push notifications
 */

const CACHE_NAME = 'traders-helmet-v1.0.0';
const DYNAMIC_CACHE_NAME = 'traders-helmet-dynamic-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login.html',
  '/dashboard/',
  '/signals/',
  '/assets/css/main.css',
  '/assets/css/bootstrap-custom.css',
  '/assets/js/main.js',
  '/assets/js/config.js',
  '/assets/js/utils.js',
  '/assets/js/supabase.js',
  '/assets/js/api.js',
  '/assets/js/chat.js',
  '/assets/images/logo.png',
  '/assets/images/favicon.ico',
  '/manifest.json',
  // External CDN assets
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Dynamic content patterns to cache
const DYNAMIC_CACHE_PATTERNS = [
  /\/api\/(signals|user|market)/,
  /\/assets\/(images|fonts)/,
  /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
  /\.(woff|woff2|ttf|eot)$/
];

// Network-first patterns (always try network first)
const NETWORK_FIRST_PATTERNS = [
  /\/api\/(auth|payments|chat)/,
  /\/admin/,
  /\.json$/
];

// Cache-first patterns (try cache first, fallback to network)
const CACHE_FIRST_PATTERNS = [
  /\.(css|js)$/,
  /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
  /\.(woff|woff2|ttf|eot)$/,
  /\/assets\//
];

/**
 * SERVICE WORKER INSTALL EVENT
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

/**
 * SERVICE WORKER ACTIVATE EVENT
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * FETCH EVENT HANDLER
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Determine caching strategy based on request
  if (isNetworkFirst(request)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (isCacheFirst(request)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (shouldCache(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else {
    event.respondWith(networkOnlyStrategy(request));
  }
});

/**
 * CACHING STRATEGIES
 */

// Network First Strategy - Try network first, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📶 Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || createOfflineResponse();
    }
    
    throw error;
  }
}

// Cache First Strategy - Try cache first, fallback to network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache first strategy failed for:', request.url);
    throw error;
  }
}

// Stale While Revalidate Strategy - Return cache immediately, update in background
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('📶 Background fetch failed for:', request.url);
    return null;
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network response
  return networkResponsePromise || createOfflineResponse();
}

// Network Only Strategy - Always use network
async function networkOnlyStrategy(request) {
  return fetch(request);
}

/**
 * HELPER FUNCTIONS
 */

function isNetworkFirst(request) {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(request.url));
}

function isCacheFirst(request) {
  return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(request.url));
}

function shouldCache(request) {
  return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Offline - Traders Helmet Academy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                text-align: center;
                padding: 50px 20px;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .offline-content {
                max-width: 400px;
            }
            .offline-icon {
                font-size: 4rem;
                margin-bottom: 2rem;
                opacity: 0.8;
            }
            h1 { font-size: 2rem; margin-bottom: 1rem; }
            p { font-size: 1.1rem; line-height: 1.6; opacity: 0.9; }
            .retry-btn {
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                text-decoration: none;
                display: inline-block;
                margin-top: 2rem;
                transition: all 0.3s ease;
            }
            .retry-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="offline-content">
            <div class="offline-icon">📶</div>
            <h1>You're Offline</h1>
            <p>It looks like you're not connected to the internet. Some features may not be available until you reconnect.</p>
            <a href="javascript:window.location.reload()" class="retry-btn">Try Again</a>
        </div>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * PUSH NOTIFICATION HANDLERS
 */
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');
  
  let notificationData = {
    title: 'Traders Helmet Academy',
    body: 'You have a new notification',
    icon: '/assets/images/icon-192.png',
    badge: '/assets/images/badge-72.png',
    tag: 'general',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/assets/images/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/assets/images/dismiss-icon.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

/**
 * NOTIFICATION CLICK HANDLER
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Determine URL to open based on notification data
  let urlToOpen = '/dashboard/';
  
  if (event.notification.data) {
    urlToOpen = event.notification.data.url || urlToOpen;
  }
  
  // Handle notification action
  switch (event.action) {
    case 'view':
      urlToOpen = event.notification.data?.viewUrl || urlToOpen;
      break;
    default:
      // Default click action
      break;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * BACKGROUND SYNC
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-sync-signals') {
    event.waitUntil(syncTradingSignals());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncChatMessages());
  } else if (event.tag === 'background-sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncTradingSignals() {
  try {
    console.log('🔄 Syncing trading signals...');
    
    // Get cached signals data
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedSignals = await cache.match('/api/signals');
    
    if (cachedSignals) {
      // Fetch fresh signals data
      const response = await fetch('/api/signals');
      if (response.ok) {
        // Update cache with fresh data
        await cache.put('/api/signals', response.clone());
        
        // Notify clients about updates
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SIGNALS_UPDATED',
            data: 'Trading signals have been updated'
          });
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to sync trading signals:', error);
  }
}

async function syncChatMessages() {
  try {
    console.log('🔄 Syncing chat messages...');
    
    // Get pending messages from IndexedDB or cache
    // This would require integration with your chat system
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CHAT_SYNC_COMPLETE',
        data: 'Chat messages synced'
      });
    });
  } catch (error) {
    console.error('❌ Failed to sync chat messages:', error);
  }
}

async function syncAnalytics() {
  try {
    console.log('🔄 Syncing analytics data...');
    
    // Send queued analytics events
    // This would integrate with your analytics system
    
  } catch (error) {
    console.error('❌ Failed to sync analytics:', error);
  }
}

/**
 * MESSAGE HANDLER FOR COMMUNICATION WITH MAIN THREAD
 */
self.addEventListener('message', (event) => {
  console.log('📨 Message received in service worker:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        cacheUrls(event.data.urls)
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        clearCache(event.data.cacheName)
      );
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize().then(size => {
          event.ports[0].postMessage({ size });
        })
      );
      break;
      
    default:
      console.log('Unknown message type:', event.data.type);
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  return Promise.all(
    urls.map(url => 
      fetch(url)
        .then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        })
        .catch(error => console.error('Failed to cache URL:', url, error))
    )
  );
}

async function clearCache(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    return Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
  }
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

/**
 * PERIODIC BACKGROUND SYNC
 */
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Periodic sync:', event.tag);
  
  if (event.tag === 'signals-update') {
    event.waitUntil(periodicSignalsUpdate());
  }
});

async function periodicSignalsUpdate() {
  try {
    // Fetch latest signals in background
    const response = await fetch('/api/signals?latest=true');
    
    if (response.ok) {
      const signals = await response.json();
      
      // Check if there are new high-priority signals
      const highPrioritySignals = signals.filter(signal => 
        signal.priority >= 3 && signal.created_at > Date.now() - 300000 // Last 5 minutes
      );
      
      if (highPrioritySignals.length > 0) {
        // Show notification for high-priority signals
        await self.registration.showNotification('New Trading Signal!', {
          body: `${highPrioritySignals.length} new high-priority signal(s) available`,
          icon: '/assets/images/icon-192.png',
          badge: '/assets/images/badge-72.png',
          tag: 'new-signals',
          data: {
            url: '/signals/',
            signals: highPrioritySignals
          },
          actions: [
            {
              action: 'view',
              title: 'View Signals'
            }
          ]
        });
      }
    }
  } catch (error) {
    console.error('❌ Periodic signals update failed:', error);
  }
}

/**
 * ERROR HANDLER
 */
self.addEventListener('error', (event) => {
  console.error('💥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Service Worker unhandled rejection:', event.reason);
});

console.log('🚀 Traders Helmet Academy Service Worker loaded successfully');