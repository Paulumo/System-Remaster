/**
 * Service Worker for System Remaster HST
 * Provides offline functionality, caching, and background sync
 */

const CACHE_NAME = 'system-remaster-hst-v1.0.0';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Files to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/js/main.js',
  '/js/config.js',
  '/js/modules/MapManager.js',
  '/js/modules/WaypointManager.js',
  '/js/modules/SearchManager.js',
  '/js/modules/FlightCalculator.js',
  '/js/modules/UIManager.js',
  '/js/modules/DragDropManager.js',
  '/js/modules/StateManager.js',
  '/js/modules/utils/dom.js',
  '/js/modules/utils/security.js',
  '/js/modules/utils/validation.js',
  '/js/modules/utils/accessibility.js',
  '/js/modules/utils/progressive.js',
  '/js/modules/utils/common.js',
  '/icon/pixelated.png',
  '/waypoints.kml',
  // External resources
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries'
];

// Network-first resources (always try network first)
const NETWORK_FIRST = [
  '/waypoints.kml',
  '/api/'
];

// Cache-first resources (try cache first)
const CACHE_FIRST = [
  'https://cartodb-basemaps-a.global.ssl.fastly.net/',
  'https://cartodb-basemaps-b.global.ssl.fastly.net/',
  'https://cartodb-basemaps-c.global.ssl.fastly.net/',
  'https://cartodb-basemaps-d.global.ssl.fastly.net/',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/'
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static resources...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Static resources cached successfully');
        // Force service worker to become active immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error caching static resources:', error);
      })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        // Claim all clients immediately
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('❌ Error during activation:', error);
      })
  );
});

/**
 * Fetch Event Handler
 * Implements different caching strategies based on request type
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (shouldUseNetworkFirst(request)) {
    event.respondWith(networkFirst(request));
  } else if (shouldUseCacheFirst(request)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Network First Strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // If network request succeeds, cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔄 Network failed, trying cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // No cached version available
    return createOfflineResponse(request);
  }
}

/**
 * Cache First Strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache and network both failed for:', request.url);
    return createOfflineResponse(request);
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background to update cache
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.log('🔄 Background update failed for:', request.url);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // No cached version, wait for network
  try {
    return await networkPromise;
  } catch (error) {
    return createOfflineResponse(request);
  }
}

/**
 * Determine if request should use network-first strategy
 */
function shouldUseNetworkFirst(request) {
  return NETWORK_FIRST.some(pattern => request.url.includes(pattern));
}

/**
 * Determine if request should use cache-first strategy
 */
function shouldUseCacheFirst(request) {
  return CACHE_FIRST.some(pattern => request.url.includes(pattern));
}

/**
 * Create offline response for failed requests
 */
function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // For HTML pages, return offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response(createOfflineHTML(), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
  
  // For API requests, return offline JSON
  if (url.pathname.includes('/api/') || request.headers.get('accept')?.includes('application/json')) {
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'This feature requires an internet connection',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // For other resources, return generic offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

/**
 * Create offline HTML page
 */
function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - System Remaster HST</title>
      <style>
        body {
          font-family: 'Space Grotesk', 'Noto Sans', sans-serif;
          background: #15181e;
          color: #ffffff;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .offline-container {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
        }
        .offline-icon {
          width: 80px;
          height: 80px;
          background: #f59e0b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
        }
        .offline-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #ffffff;
        }
        .offline-message {
          font-size: 1.1rem;
          color: #a0a9bb;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        .retry-button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .retry-button:hover {
          background: #1d4ed8;
        }
        .offline-features {
          margin-top: 2rem;
          text-align: left;
          background: #1c1f26;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #2c333f;
        }
        .offline-features h3 {
          color: #2563eb;
          margin-top: 0;
          margin-bottom: 1rem;
        }
        .offline-features ul {
          color: #a0a9bb;
          padding-left: 1.2rem;
        }
        .offline-features li {
          margin-bottom: 0.5rem;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 256 256">
            <path d="M248,128a87.34,87.34,0,0,1-17.6,52.81,8,8,0,1,1-12.8-9.62A71.34,71.34,0,0,0,232,128a72,72,0,0,0-144,0,71.34,71.34,0,0,0,14.4,43.19,8,8,0,1,1-12.8,9.62A87.34,87.34,0,0,1,72,128a88,88,0,0,1,176,0ZM128,192a64,64,0,1,0-64-64A64.07,64.07,0,0,0,128,192Zm0-112a48,48,0,1,1-48,48A48.05,48.05,0,0,1,128,80Z"/>
          </svg>
        </div>
        
        <h1 class="offline-title">You're Offline</h1>
        
        <p class="offline-message">
          No internet connection available. Some features of System Remaster HST require an internet connection to work properly.
        </p>
        
        <button class="retry-button" onclick="window.location.reload()">
          Try Again
        </button>
        
        <div class="offline-features">
          <h3>Available Offline Features</h3>
          <ul>
            <li>Basic flight planning forms</li>
            <li>Previously cached waypoint data</li>
            <li>Flight calculations and performance</li>
            <li>Crew and aircraft information</li>
            <li>Saved flight plans</li>
          </ul>
        </div>
      </div>
      
      <script>
        // Listen for online event to reload page
        window.addEventListener('online', () => {
          window.location.reload();
        });
        
        // Show connection status
        if (!navigator.onLine) {
          console.log('Application is offline');
        }
      </script>
    </body>
    </html>
  `;
}

/**
 * Background Sync Event
 * Handle background sync when connection is restored
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-flight-data') {
    event.waitUntil(syncFlightData());
  }
});

/**
 * Sync flight data when connection is restored
 */
async function syncFlightData() {
  try {
    console.log('📡 Syncing flight data...');
    
    // Get pending sync data from IndexedDB or localStorage
    const pendingData = await getPendingSyncData();
    
    if (pendingData.length > 0) {
      for (const data of pendingData) {
        try {
          // Attempt to sync each piece of data
          await fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          // Remove from pending sync after successful upload
          await removePendingSyncData(data.id);
          
        } catch (error) {
          console.error('❌ Failed to sync data:', error);
        }
      }
      
      console.log('✅ Flight data sync completed');
    }
    
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

/**
 * Get pending sync data (placeholder - implement with IndexedDB)
 */
async function getPendingSyncData() {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return [];
}

/**
 * Remove pending sync data (placeholder - implement with IndexedDB)
 */
async function removePendingSyncData(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Removing synced data:', id);
}

/**
 * Push Event Handler
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('📬 Push message received');
  
  const options = {
    body: 'Flight plan update available',
    icon: '/icon/pixelated.png',
    badge: '/icon/pixelated.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Update',
        icon: '/icon/pixelated.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon/pixelated.png'
      }
    ]
  };
  
  if (event.data) {
    const pushData = event.data.json();
    options.body = pushData.body || options.body;
    options.data = pushData.data || options.data;
  }
  
  event.waitUntil(
    self.registration.showNotification('System Remaster HST', options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message Handler
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
  console.log('💌 Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then((cache) => {
          return cache.addAll(event.data.urls);
        })
    );
  }
});

/**
 * Periodic Background Sync (future)
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'weather-update') {
    event.waitUntil(updateWeatherData());
  }
});

/**
 * Update weather data periodically
 */
async function updateWeatherData() {
  try {
    console.log('🌤️ Updating weather data...');
    
    // Fetch latest weather data
    const response = await fetch('/api/weather');
    if (response.ok) {
      const weatherData = await response.json();
      
      // Cache the weather data
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put('/api/weather', new Response(JSON.stringify(weatherData)));
      
      console.log('✅ Weather data updated');
    }
    
  } catch (error) {
    console.error('❌ Failed to update weather data:', error);
  }
}

console.log('🎯 Service Worker loaded successfully');