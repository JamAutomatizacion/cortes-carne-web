// Service worker: deja la app guardada en el dispositivo para que abra sin internet.
// vite.config.ts reemplaza ARCHIVOS (lista de todo el build) y VERSION en cada compilación;
// una versión nueva descarga todo de nuevo y borra la anterior.
const VERSION = 'mw14cj0w';
const CACHE = `cortes-carne-${VERSION}`;
const ARCHIVOS = ["./","./apple-touch-icon.png","./assets/index-Cystls3n.js","./assets/index-DwNviBhX.css","./icono-192.png","./icono-512.png","./icono.svg","./index.html","./manifest.webmanifest"];
// Los pedidos que hace la página (script/estilo con crossorigin) traen otras cabeceras que el guardado inicial;
// sin ignoreVary el navegador no los reconoce como el mismo archivo.
const COINCIDIR = { ignoreSearch: true, ignoreVary: true };

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ARCHIVOS.map((a) => new URL(a, self.location).href));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre.startsWith('cortes-carne-') && nombre !== CACHE) await caches.delete(nombre);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;

  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // La página va primero a la red (para ver los cambios) y, si no hay internet, usa lo guardado.
      if (pedido.mode === 'navigate') {
        try {
          const respuesta = await fetch(pedido);
          if (respuesta.ok) cache.put(pedido, respuesta.clone());
          return respuesta;
        } catch {
          return (
            (await cache.match(pedido, COINCIDIR)) ??
            (await cache.match(new URL('./index.html', self.location).href, COINCIDIR)) ??
            Response.error()
          );
        }
      }
      // El resto (archivos con nombre único) sale del guardado.
      const guardado = await cache.match(pedido, COINCIDIR);
      if (guardado) return guardado;
      const respuesta = await fetch(pedido);
      if (respuesta.ok) cache.put(pedido, respuesta.clone());
      return respuesta;
    })(),
  );
});
