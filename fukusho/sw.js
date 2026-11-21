// 腹証奇覧：オフライン用 Service Worker
const CACHE = "fukusho-202611210857";
const SHELL = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "img/fig_011L.jpg", "img/fig_013L.jpg", "img/fig_015L.jpg", "img/fig_016L.jpg", "img/fig_018R.jpg", "img/fig_019L.jpg", "img/fig_021R.jpg", "img/fig_023L.jpg", "img/fig_024L.jpg", "img/fig_026R.jpg", "img/fig_027R.jpg", "img/fig_028R.jpg", "img/fig_029R.jpg", "img/fig_030R.jpg", "img/fig_031R.jpg", "img/fig_032L.jpg", "img/fig_033L.jpg", "img/fig_035R.jpg", "img/fig_036R.jpg", "img/fig_044L.jpg", "img/fig_045L.jpg", "img/fig_046L.jpg", "img/fig_048R.jpg", "img/fig_049L.jpg", "img/fig_052R.jpg", "img/fig_053R.jpg", "img/fig_054R.jpg", "img/fig_055R.jpg", "img/fig_056R.jpg", "img/fig_057R.jpg", "img/fig_059L.jpg", "img/fig_061L.jpg", "img/fig_063L.jpg", "img/fig_064L.jpg", "img/fig_066R.jpg", "img/fig_067R.jpg", "img/fig_069R.jpg", "img/fig_070R.jpg", "img/fig_071R.jpg", "img/fig_072R.jpg", "img/fig_073R.jpg", "img/fig_074L.jpg", "img/fig_b088R.jpg", "img/fig_b089L.jpg", "img/fig_b090L.jpg", "img/fig_b092R.jpg", "img/fig_b093R.jpg", "img/fig_b094R.jpg", "img/fig_b095R.jpg"];

self.addEventListener("install", e => {
// 更新時はブラウザのHTTPキャッシュを通さず取り直す（図を差し替えても古い画像が残らないように）
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("fukusho-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 本体：ネット優先（つながれば最新版）、だめならキャッシュ
  if (req.mode === "navigate" || url.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("index.html", c)); return r; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }
  // 書体（Google Fonts）・アイコン・腹証図：キャッシュ優先、裏で更新
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});
