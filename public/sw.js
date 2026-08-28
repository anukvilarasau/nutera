const CACHE = 'nutera-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Solo manejar requests GET del mismo origen
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Solo cachear respuestas exitosas del mismo origen (no redirects ni SSO)
        if (response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE)
            .then(cache => cache.put(event.request, clone))
            .catch(() => null)
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached ?? Response.error()),
      ),
  )
})
