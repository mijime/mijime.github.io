const CACHE = "mijime-pwa-v3";
const CORE = [
  "/",
  "/apps/",
  "/apps/emolog/",
  "/apps/flowdeck/",
  "/apps/lords-of-the-stigmata/",
  "/apps/madories/",
  "/apps/mintodo/",
  "/apps/otete/",
  "/apps/saiflow/",
  "/apps/emolog/manifest.webmanifest",
  "/apps/flowdeck/manifest.webmanifest",
  "/apps/lords-of-the-stigmata/manifest.webmanifest",
  "/apps/madories/manifest.webmanifest",
  "/apps/mintodo/manifest.webmanifest",
  "/apps/otete/manifest.webmanifest",
  "/apps/saiflow/manifest.webmanifest",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/site-192.png",
  "/icons/site-512.png",
  "/icons/emolog-180.png",
  "/icons/emolog-192.png",
  "/icons/flowdeck-180.png",
  "/icons/flowdeck-192.png",
  "/icons/lords-of-the-stigmata-180.png",
  "/icons/lords-of-the-stigmata-192.png",
  "/icons/madories-180.png",
  "/icons/madories-192.png",
  "/icons/mintodo-180.png",
  "/icons/mintodo-192.png",
  "/icons/otete-180.png",
  "/icons/otete-192.png",
  "/icons/saiflow-180.png",
  "/icons/saiflow-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 1件の404で全件失敗しないように、個別に追加する。
      .then((cache) =>
        Promise.allSettled(
          CORE.map((url) => cache.add(new Request(url, { cache: "no-store" }))),
        ),
      )
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
          // GitHub Pages の HTML は max-age=600 なので、HTTP キャッシュを
          // 使うとデプロイ後しばらく古い画面が返る。常に取り直す。
          const fresh = await fetch(request, { cache: "no-store" });
          if (fresh.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(request, fresh.clone());
          }
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

  // マニフェストは更新され得るので cache-first にしない。
  const isManifest = url.pathname.endsWith("manifest.webmanifest");
  // _astro 配下は内容ハッシュ付きで不変なので、毎回取り直さない。
  const isHashedAsset = url.pathname.startsWith("/_astro/");
  const cacheFirst =
    !isManifest &&
    (isHashedAsset ||
      url.pathname.startsWith("/icons/") ||
      /\.(?:css|js|mjs|png|jpe?g|webp|svg|woff2?|ico|parquet|json)$/i.test(url.pathname));

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      if (cacheFirst) {
        if (cached) {
          // ハッシュ付きアセット以外は、キャッシュを返しつつ裏で最新版に更新する。
          if (!isHashedAsset) {
            fetch(request)
              .then((response) => {
                if (response.ok) return cache.put(request, response);
                return undefined;
              })
              .catch(() => undefined);
          }
          return cached;
        }
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      }

      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
