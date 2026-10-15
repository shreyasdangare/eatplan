/* EatPlan service worker: offline app shell + last-known shopping list / plan. */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const API = `api-${VERSION}`;
const OFFLINE_API = [/^\/api\/shopping-list(\/)?$/, /^\/api\/meal-plans(\/)?$/];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || /^\/icon-\d+/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    // Signed-out pages: drop any cached household data on this device.
    if (/^\/(login|signup)/.test(url.pathname)) {
      event.waitUntil(caches.delete(API).then(() => caches.delete(PAGES)));
      return;
    }
    if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/admin")) return;
    event.respondWith(
      networkFirst(request, PAGES).catch(
        () => caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match("/shopping-list") ||
          new Response("<h1>You're offline</h1><p>Reconnect to load this page.</p>", { headers: { "Content-Type": "text/html" } }))
      )
    );
    return;
  }

  if (OFFLINE_API.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, API));
  }
});
