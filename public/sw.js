// Service Worker for Checkout Page - Enhanced Version
const CACHE_VERSION = 'v2';
const CACHE_NAME = `checkout-${CACHE_VERSION}`;
const urlsToCache = [
  '/checkout.html',
  '/thankyou.html',
  '/assets/style.css',
  '/assets/images/Logo.svg',
  '/assets/images/lock.svg',
  '/assets/images/6-bottles.png',
  '/assets/images/PayPal.svg',
  '/assets/images/paypal-big.svg',
  '/assets/images/applypay.svg',
  '/assets/images/googlepay.svg',
  '/assets/images/visa.svg',
  '/assets/images/mastercard.svg',
  '/assets/images/american-express.svg',
  '/assets/images/check.svg',
  '/assets/images/check-dark.svg',
  '/assets/images/circle-check.svg',
  '/assets/images/star.svg',
  '/assets/images/info.svg',
  '/assets/images/mcafee-seeklogo.svg',
  '/assets/images/Norton.svg',
  '/assets/images/Truste.svg',
  '/assets/images/money-back.png',
  '/assets/images/bonus-ebooks.png',
  '/assets/images/bonus-call.png',
  '/assets/images/olivia.png',
  '/assets/images/emily.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Fetch with network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // HTML pages - network first, fall back to cache
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // For assets - cache first, fall back to network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});