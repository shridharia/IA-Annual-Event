/* Impact 11 Years — service worker. Build: 38c91d3-mwoo8jrg (replaced by scripts/build-sw.mjs; a changed file = an update). */
const VERSION = "38c91d3-mwoo8jrg";
const SHELL = `impact11-shell-${VERSION}`;
const RUNTIME = `impact11-runtime-${VERSION}`;
const PRECACHE = ["/", "/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  // No skipWaiting() here: the page shows "Update available" and asks us to activate (see SKIP_WAITING below).
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, RUNTIME]);
      for (const k of await caches.keys()) if (k.startsWith("impact11-") && !keep.has(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache private/dynamic surfaces.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/organizer")) return;

  // Pages: network-first, fall back to the cached copy (event info stays available), then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok && (url.pathname === "/" || url.pathname === "/offline")) {
            const c = await caches.open(SHELL);
            c.put(url.pathname, fresh.clone());
          }
          return fresh;
        } catch {
          return (await caches.match(url.pathname, { ignoreSearch: true })) || (await caches.match("/")) || (await caches.match("/offline"));
        }
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate (hashed _next assets are immutable, icons/fonts rarely change).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|jpg|jpeg|webp|avif|svg)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const hit = await cache.match(req);
        const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })(),
    );
  }
});

/* ─────────── Web Push ─────────── */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "11 Years of Impact", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "11 Years of Impact";
  const urgent = data.category === "urgent";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      image: data.image || undefined,
      tag: data.id ? `n-${data.id}` : "impact11",
      renotify: false,
      requireInteraction: urgent,
      data: { url: data.url || "/", id: data.id || null },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, id } = event.notification.data || {};
  const target = new URL(url || "/", self.location.origin);
  if (target.origin !== self.location.origin) return; // defence in depth: never open off-site links
  event.waitUntil(
    (async () => {
      if (id && id !== "00000000-0000-4000-8000-000000000000") {
        fetch("/api/push/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }).catch(() => {});
      }
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          await c.focus();
          if ("navigate" in c) { try { await c.navigate(target.href); } catch { /* cross-doc nav may be blocked */ } }
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});

// If the browser rotates/invalidates a subscription, the page re-subscribes on next visit (see lib/push/client.ts).
