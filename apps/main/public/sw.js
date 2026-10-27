const CACHE = "mijime-pwa-v1";
const CORE = [
  "/",
  "/apps/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/site-192.png",
  "/icons/site-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match("/offline.html")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  const cacheFirst =
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/apps/") ||
    /\.(?:css|js|mjs|png|jpe?g|webp|svg|woff2?|ico|parquet)$/i.test(url.pathname);

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      if (cacheFirst) {
        if (cached) {
          fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response);
            })
            .catch(() => undefined);
          return cached;
        }
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      }

      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
