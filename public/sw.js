// Service Worker for Checkout Page
const CACHE_NAME = 'checkout-v1';
const urlsToCache = [
  '/checkout.html',
  '/assets/style.css',
  '/assets/images/Logo.svg',
  '/assets/images/lock.svg',
  '/assets/images/6-bottles.png',
  '/assets/images/PayPal.svg',
  '/assets/images/applypay.svg',
  '/assets/images/googlepay.svg',
  '/assets/images/visa.svg',
  '/assets/images/mastercard.svg',
  '/assets/images/american-express.svg',
  '/assets/images/check.svg',
  '/assets/images/circle-check.svg',
  '/assets/images/star.svg'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
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
    })
  );
});