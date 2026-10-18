const CACHE_NAME = "rev-mobile-shell-v25";
const SHELL = ["./", "./index.html", "./trips.html", "./rev-visual-identity.css", "./manifest.webmanifest", "./rev-app-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("rev-mobile-shell-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response && response.ok) {
          // Cache each document at its own URL; never overwrite index.html with trips.html.
          const req1 = request; await cache.put(req1, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        const path = url.pathname.endsWith("/trips.html") ? "./trips.html" : "./index.html";
        return (await cache.match(path)) || Response.error();
      }
    })());
    return;
  }

  if (url.search) return;
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone(); const req2 = request;
        caches.open(CACHE_NAME).then(cache => cache.put(req2, copy));
      }
      return response;
    }))
  );
});
