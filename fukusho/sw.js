// 腹証奇覧：オフライン用 Service Worker
const CACHE = "fukusho-202611211808";
const SHELL = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "img/fig_011L.jpg", "img/fig_013L.jpg", "img/fig_015L.jpg", "img/fig_016L.jpg", "img/fig_018R.jpg", "img/fig_019L.jpg", "img/fig_021R.jpg", "img/fig_023L.jpg", "img/fig_024L.jpg", "img/fig_026R.jpg", "img/fig_027R.jpg", "img/fig_028R.jpg", "img/fig_029R.jpg", "img/fig_030R.jpg", "img/fig_031R.jpg", "img/fig_032L.jpg", "img/fig_033L.jpg", "img/fig_035R.jpg", "img/fig_036R.jpg", "img/fig_044L.jpg", "img/fig_045L.jpg", "img/fig_046L.jpg", "img/fig_048R.jpg", "img/fig_049L.jpg", "img/fig_052R.jpg", "img/fig_053R.jpg", "img/fig_054R.jpg", "img/fig_055R.jpg", "img/fig_056R.jpg", "img/fig_057R.jpg", "img/fig_059L.jpg", "img/fig_061L.jpg", "img/fig_063L.jpg", "img/fig_064L.jpg", "img/fig_066R.jpg", "img/fig_067R.jpg", "img/fig_069R.jpg", "img/fig_070R.jpg", "img/fig_071R.jpg", "img/fig_072R.jpg", "img/fig_073R.jpg", "img/fig_074L.jpg", "img/fig_087L.jpg", "img/fig_089L.jpg", "img/fig_091L.jpg", "img/fig_093R.jpg", "img/fig_094R.jpg", "img/fig_095R.jpg", "img/fig_098L.jpg", "img/fig_100R.jpg", "img/fig_101L.jpg", "img/fig_103R.jpg", "img/fig_105R.jpg", "img/fig_107L.jpg", "img/fig_110R.jpg", "img/fig_111L.jpg", "img/fig_114L.jpg", "img/fig_114R.jpg", "img/fig_116R.jpg", "img/fig_118L.jpg", "img/fig_137L.jpg", "img/fig_137R.jpg", "img/fig_146L.jpg", "img/fig_146R.jpg", "img/fig_147R.jpg", "img/fig_150L.jpg", "img/fig_151R.jpg", "img/fig_156R.jpg", "img/fig_162L.jpg", "img/fig_163R.jpg", "img/fig_169L.jpg", "img/fig_170R.jpg", "img/fig_183L.jpg", "img/fig_188R.jpg", "img/fig_192L.jpg", "img/fig_194R.jpg", "img/fig_195L.jpg", "img/fig_201R.jpg", "img/fig_b088R.jpg", "img/fig_b089L.jpg", "img/fig_b090L.jpg", "img/fig_b092R.jpg", "img/fig_b093R.jpg", "img/fig_b094R.jpg", "img/fig_b095R.jpg", "img/fig_b097R.jpg", "img/fig_b098L.jpg", "img/fig_b100L.jpg", "img/fig_b102L.jpg", "img/fig_b106R.jpg", "img/fig_b108L.jpg", "img/fig_b109L.jpg", "img/fig_b110L.jpg", "img/fig_b112R.jpg", "img/fig_b113R.jpg", "img/fig_b114L.jpg", "img/fig_b115L.jpg", "img/fig_b116L.jpg"];

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
