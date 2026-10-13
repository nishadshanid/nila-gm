// Nila Gym service worker: makes the app installable and shows a friendly page offline.
// Data always comes from the network (it's shared between two phones and must be fresh);
// only Next's versioned static files and the icons are cached.

const CACHE = "nila-gym-v1";
// Items in a group (e.g. shopping) added within this long share one notification.
const GROUP_WINDOW_MS = 30 * 60 * 1000;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/logo.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always the network; the offline page if that fails.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Versioned build files and icons never change at the same URL: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

// Phone notifications sent by the server (reminders, hand-overs, the morning summary).
self.addEventListener("push", (event) => {
  let message = { title: "Nila Gym", body: "", path: "/" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    if (event.data) message.body = event.data.text();
  }
  event.waitUntil(show(message));
});

async function show(message) {
  const options = {
    body: message.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: message.tag,
    data: { path: message.path || "/" },
  };
  const group = message.group;
  if (group) {
    // Fold this item into a recent notification from the same group, if it's still
    // showing: one notification that grows, and only the first one buzzes.
    let items = [group.item];
    let merged = false;
    try {
      const [previous] = await self.registration.getNotifications({ tag: group.key });
      const data = previous?.data;
      if (data?.items && Date.now() - data.at < GROUP_WINDOW_MS) {
        items = [...data.items, group.item];
        merged = true;
      }
    } catch {
      // getNotifications isn't everywhere; then each item is its own notification.
    }
    const shown =
      items.slice(0, 6).join(", ") + (items.length > 6 ? ` +${items.length - 6} more` : "");
    options.tag = group.key;
    options.renotify = !merged;
    options.body =
      items.length === 1 ? message.body : `${group.who} added ${items.length} items: ${shown}`;
    options.data = { ...options.data, items, at: Date.now() };
  }
  return self.registration.showNotification(message.title, options);
}

// Tapping a notification opens Nila Gym (reusing an open window if there is one).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.path || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
