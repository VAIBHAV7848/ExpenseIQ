/* ========================================
   ExpenseIQ — Service Worker
   Cache-first for static assets, network-only for APIs
   ======================================== */

const CACHE_NAME = 'expenseiq-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',
  '/css/index.css',
  '/css/animations.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/transactions.css',
  '/css/reports.css',
  '/css/budgets.css',
  '/css/categories.css',
  '/css/settings.css',
  '/css/goals.css',
  '/css/debts.css',
  '/css/login.css',
  '/css/sync.css',
  '/css/aiChat.css',
  '/js/supabaseConfig.js',
  '/js/utils.js',
  '/js/auth.js',
  '/js/store.js',
  '/js/router.js',
  '/js/app.js',
  '/js/ai.js',
  '/js/pwa.js',
  '/js/sync/offlineStore.js',
  '/js/sync/syncEngine.js',
  '/js/sync/conflictResolver.js',
  '/js/sync/retryQueue.js',
  '/js/sync/networkDetector.js',
  '/js/sync/subscriptionManager.js',
  '/js/data/defaultCategories.js',
  '/js/data/sampleData.js',
  '/js/components/charts.js',
  '/js/components/filterPanel.js',
  '/js/components/header.js',
  '/js/components/modal.js',
  '/js/components/sidebar.js',
  '/js/components/toast.js',
  '/js/components/confirmDialog.js',
  '/js/components/aiChat.js',
  '/js/pages/login.js',
  '/js/pages/dashboard.js',
  '/js/pages/transactions.js',
  '/js/pages/reports.js',
  '/js/pages/budgets.js',
  '/js/pages/categories.js',
  '/js/pages/settings.js',
  '/js/pages/goals.js',
  '/js/pages/debts.js'
];

// Install — cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for static, network-only for APIs
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NEVER cache Supabase, Groq, Google APIs, or CDN requests
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('groq.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('fonts.') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('ui-avatars.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first for local static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
