const CACHE_NAME = "spiningebi-v9";
const STATIC_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) return;
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext))
    || url.pathname.startsWith("/assets/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// Push notification handler — fires even when tab is closed
self.addEventListener("push", (event) => {
  let data = { title: "spiningebi.ge", body: "ახალი შეტყობინება", url: "/", tag: "", image: "", icon: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  // Use unique tag per message so notifications stack (not replace each other)
  const notifTag = data.tag || ("push-" + Date.now());

  const options = {
    body: data.body,
    icon: data.icon || "/pwa-icon.png",
    badge: "/favicon.png",
    tag: notifTag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    silent: false,
    data: { url: data.url, broadcastId: data.broadcastId || null },
  };

  // image field shows a large product photo in the notification on Android/Chrome
  if (data.image) options.image = data.image;

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click on notification — open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let targetUrl = data.url || "/";

  // Append broadcastId so the app can auto-mark it as read (avoids duplicate in-app banner)
  if (data.broadcastId) {
    const sep = targetUrl.includes("?") ? "&" : "?";
    targetUrl = `${targetUrl}${sep}mark_read=${data.broadcastId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
