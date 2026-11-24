// 類聚方広義 症状検索：オフライン用 Service Worker
const CACHE = "ruijuho-__VER__";
const SHELL = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ruijuho-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 本体：ネット優先（つながれば最新版）、だめならキャッシュ
  // 音声（mp3）は保存しない（容量が大きいため。音声のページは別の場所）
  if (/\.mp3$/i.test(url.pathname)) return;
  if (req.mode === "navigate" || url.pathname.endsWith("index.html")) {
    // このアプリ自身のページだけを扱う（同じサイトの別の場所は素通し）
    const scope = new URL(self.registration.scope).pathname;
    if (url.pathname !== scope && url.pathname !== scope + "index.html") return;
    // ログイン（Cloudflare Access）への転送や失敗の応答は保存しない（オフライン用の版を上書きしないため）
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(r => { if (r.ok && r.type === "basic" && !r.redirected) { const c = r.clone(); caches.open(CACHE).then(x => x.put("index.html", c)); } return r; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }
  // 書体（Google Fonts）とアイコン：キャッシュ優先、裏で更新
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && ((r.ok && !r.redirected) || r.type === "opaque")) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});
