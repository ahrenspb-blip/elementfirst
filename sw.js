const CACHE = 'element-first-v10';
const APP_SHELL = ['./index.html','./manifest.json','./styles.css','./icons/icon-192.png','./icons/icon-512.png',
  './vendor/supabase-js-2.45.4.js','./vendor/chart-4.4.1.umd.min.js'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Solo se guardan respuestas completas y correctas del propio sitio (nunca un 404, un 500 o una respuesta parcial).
const guardable = response => response && response.ok && response.status === 200 && response.type === 'basic';

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Always prefer the newest HTML so Safari/iOS does not keep a broken old app.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    const esLaApp = url.pathname === '/' || url.pathname.endsWith('/index.html');
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Solo la página de la app reemplaza la copia sin conexión; otra ruta (p. ej. un 404) no la pisa.
          if (esLaApp && guardable(response)) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Estilos, librerías, íconos e imágenes: se sirven al instante desde la caché y se actualizan en segundo plano,
  // así una publicación nueva llega en la siguiente carga sin tener que cambiar CACHE a mano.
  const red = fetch(event.request)
    .then(response => {
      if (guardable(response)) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    });
  event.waitUntil(red.catch(() => {}));
  event.respondWith(
    caches.match(event.request).then(cached => cached || red.catch(() => Response.error()))
  );
});
