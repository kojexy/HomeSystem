// Minimal service worker: it makes the app installable.
// It never caches Home Assistant data or camera frames.
const SHELL = "homesystem-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["./", "./index.html"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Network first, shell from cache only when offline.
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html"))));
});
