/* Guarda la pantalla en el teléfono para que la app abra sin internet.
   Los datos siempre se piden a Apps Script: eso sí necesita conexión. */
const CACHE = 'genebov-app-v2';
const PANTALLA = [
  './', 'index.html', 'config.js', 'manifest.json', 'logo.png',
  'iconos/icono-192.png', 'iconos/icono-512.png',
  'iconos/apple-touch-icon.png', 'iconos/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PANTALLA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // solo las propias: la app de Ganado vive en el mismo dominio y tiene las suyas
      .then(ks => Promise.all(ks.filter(k => k.indexOf('genebov-app-') === 0 && k !== CACHE)
                                .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Apps Script, Drive y las fuentes siempre van a la red
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // La pantalla y su configuración: primero la red, para que al recargar se vea
  // la versión nueva. Sin internet, lo que esté guardado.
  const esPantalla = e.request.mode === 'navigate' ||
                     url.pathname.endsWith('/') ||
                     /\/(index\.html|config\.js)$/.test(url.pathname);
  if (esPantalla) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
        return r;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  // Iconos y logo: lo guardado primero, y se refresca por detrás.
  e.respondWith(
    caches.match(e.request).then(hit => {
      const red = fetch(e.request).then(r => {
        if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
