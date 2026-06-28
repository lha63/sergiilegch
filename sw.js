/* Сэргийлэгч — service worker.
   Network-first: онлайн үед ҮРГЭЛЖ шинэ хувилбарыг авна (шинэчлэлт шууд харагдана),
   офлайн үед кэшнээс fallback хийнэ. Firebase, газрын зургийн tile, фонт зэрэг
   гадаад хүсэлтийг шууд сүлжээгээр дамжуулна. */
const CACHE = "sergiilegch-v3";
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
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // гадаад (Firebase/tiles/fonts) → шууд сүлжээ
  // Network-first: шинэ хувилбарыг урьдчилан авч, кэшийг шинэчилнэ; алдвал кэшнээс
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
