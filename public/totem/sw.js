/* Service worker del totem: permite arrancar sin internet y guarda las imágenes de los anuncios. */
const VERSION = 'totem-pch-totem-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys()
      await Promise.all(nombres.filter((n) => n.startsWith('totem-pch-totem-') && n !== VERSION).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const mismoOrigen = url.origin === self.location.origin

  // Tipografías de Google (hoja de estilos y archivos): del caché primero, y se renuevan en segundo plano.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION)
        const guardada = await cache.match(request)
        const red = fetch(request).then((r) => { if (r.ok || r.type === 'opaque') cache.put(request, r.clone()); return r }).catch(() => null)
        return guardada || (await red) || Response.error()
      })(),
    )
    return
  }

  // Imágenes (también de otros orígenes, p. ej. Google Drive): del caché primero, y se renueva en segundo plano.
  if (request.destination === 'image') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION)
        const guardada = await cache.match(request)
        const red = fetch(request).then((r) => { if (r.ok || r.type === 'opaque') cache.put(request, r.clone()); return r }).catch(() => null)
        return guardada || (await red) || Response.error()
      })(),
    )
    return
  }

  // Archivos del propio totem: red primero; sin conexión, lo último guardado.
  if (mismoOrigen && url.pathname.startsWith('/totem')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION)
        try {
          const r = await fetch(request)
          if (r.ok) cache.put(request, r.clone())
          return r
        } catch {
          return (await cache.match(request)) || (await cache.match('/totem/')) || Response.error()
        }
      })(),
    )
  }
})
