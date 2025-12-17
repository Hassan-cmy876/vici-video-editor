/**
 * Vici Video Editor - Service Worker
 * Enables offline functionality and PWA installation
 */

const CACHE_NAME = 'vici-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/timeline.css',
    '/css/components.css',
    '/js/app.js',
    '/js/video.js',
    '/js/timeline.js',
    '/js/effects.js',
    '/js/templates.js',
    '/js/audio.js',
    '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching app assets');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then((fetchResponse) => {
                    // Don't cache external resources
                    if (!event.request.url.startsWith(self.location.origin)) {
                        return fetchResponse;
                    }
                    
                    // Cache new resources
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Handle share target (receiving files from gallery)
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'POST' && 
        event.request.url.includes('/index.html')) {
        
        event.respondWith(Response.redirect('/index.html'));
        
        event.waitUntil(
            (async () => {
                const formData = await event.request.formData();
                const files = formData.getAll('media');
                
                const client = await self.clients.get(event.resultingClientId);
                if (client) {
                    client.postMessage({
                        type: 'SHARED_MEDIA',
                        files: files
                    });
                }
            })()
        );
    }
});
