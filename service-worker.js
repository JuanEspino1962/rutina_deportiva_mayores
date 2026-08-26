/* ==========================================================================
   PASO VITAL - SERVICE WORKER PARA FUNCIONAMIENTO 100% OFFLINE (PWA)
   ========================================================================== */

const CACHE_NAME = 'paso-vital-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './css/responsive.css',
    './js/plans.js',
    './js/storage.js',
    './js/accessibility.js',
    './js/workout.js',
    './js/app.js',
    './manifest.json'
];

// Instalar Service Worker y precachear recursos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Pre-cacheando recursos de la aplicación...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activar Service Worker y limpiar cachés antiguos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[ServiceWorker] Eliminando caché antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceptar peticiones (Cache First, fallback to Network)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Devolver desde caché local sin conexión
                }
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                });
            })
            .catch(() => {
                // Si la red falla y no está en caché, devolver página principal
                return caches.match('./index.html');
            })
    );
});
