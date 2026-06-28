/* Сэргийлэгч — service worker (app-shell cache).
   Зөвхөн локал GET файлыг кэшлэнэ. Firebase, газрын зургийн tile, фонт зэрэг
   гадаад/динамик хүсэлтийг кэшлэхгүй — сүлжээ рүү шууд дамжуулна. */
const CACHE = "sergiilegch-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./app.js",
  "./live.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                 // зөвхөн GET
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // гадаад хүсэлтийг шууд сүлжээгээр (Firebase/tiles/fonts)
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
