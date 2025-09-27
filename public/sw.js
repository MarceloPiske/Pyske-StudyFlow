const CACHE_NAME = 'studyflow-v2'; // Bumped version to ensure new SW is installed
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/components.css',
  '/navigation.css',
  '/dashboard.css',
  '/topics.css',
  '/books.css',
  '/articles.css',
  '/priorities.css',
  '/auth.css',
  '/app.js',
  '/manifest.json',
  '/modules/dashboard.js',
  '/modules/topics.js',
  '/modules/books.js',
  '/modules/articles.js',
  '/modules/priorities.js',
  '/services/firestore-service.js',
  '/services/session-manager.js',
  '/utils/ModalManager.js'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use addAll for atomic operation, but handle potential individual failures gracefully
        return Promise.all(
          urlsToCache.map(url => cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err);
          }))
        );
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

// Fetch event: Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests and Firebase requests
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        // Fetch from network in the background to update the cache
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          // Network fetch failed, which is expected offline
          console.warn('Network request failed:', err);
        });
        
        // Return cached response immediately if available, otherwise wait for network
        return response || fetchPromise;
      });
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});