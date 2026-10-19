const CACHE_NAME = "rev-mobile-shell-v58";
const SHELL = ["./", "./index.html", "./trips.html", "./rev-app-mode.js", "./rev-visual-identity.css", "./manifest.webmanifest", "./rev-app-icon.svg"];

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
  // فایل ناوبری همیشه تازه
  if (url.includes("rev-app-mode.js")) {
    event.respondWith(fetch(url, {cache: "reload"}).then(r => {
      const copy = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
      return r;
    }).catch(() => caches.match(event.request)));
    return;
  }
  // هدایت CDNهای کند به سریع‌تر
  const url = event.request.url;
  if (url.includes("unpkg.com/leaflet")) {
    const fast = url.replace("https://unpkg.com/leaflet@1.9.4/dist/",
                              "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/");
    event.respondWith(fetch(fast));
    return;
  }
  // تایل‌های نقشه: OSM کند -> CartoDB سریع‌تر
  if (url.includes("tile.openstreetmap.org")) {
    const m = url.match(/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png/);
    if (m) {
      const fastTile = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${m[1]}/${m[2]}/${m[3]}.png`;
      event.respondWith(fetch(fastTile));
      return;
    }
  }
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
