// Cache version — update this string whenever you deploy new files.
// The timestamp below is set at build time; changing it forces all
// devices to discard the old cache and fetch fresh files.
const CACHE = 'wortschatz-202606081201';

// Static shell: cache-first (fast, changes rarely)
const SHELL = ['./index.html', './manifest.json'];

// Data file: network-first (always try to get the latest version,
// fall back to cache only when offline)
const DATA = ['./vocab.json'];

// ── Install: cache everything ──────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([...SHELL, ...DATA]))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete all old caches ───────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isData = DATA.some(d => url.pathname.endsWith(d.replace('./', '/')));

  if (isData) {
    // Network-first for vocab.json: always try the server so a
    // freshly deployed vocabulary list is picked up immediately.
    // Falls back to the cached copy when offline.
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for the app shell (HTML, manifest).
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        });
      })
    );
  }
});
