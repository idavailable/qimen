/* ============================================================
   奇门遁甲 · Service Worker（PWA 离线）
   核心卖点是「排盘零网络」：public/ 下的静态资源 cache-first，
   断网也能起局、看盘面、翻存档（localStorage）。

   两条硬规则：
   1) GET /api/* 永不缓存 —— 解读与存档必须联网，宁可报错也不给陈旧结果；
      缓存里已有的 /api/ 条目在新版本激活时一律清掉。
   2) 只缓存同源 GET；POST/DELETE（存档写入、解读请求）直接透传不拦截。

   版本号：改动静态资源清单时递增 CACHE，activate 里按白名单清旧缓存。
   ============================================================ */
const CACHE = 'qimen-v5';  // 2026-10-27 自定义求测（智能取用）+ 界面/提示词联动，清旧缓存
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './engine.js',
  './yongshen.js',
  './prompt.js',
  './interpret.js',
  './app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      /* 单个资源失败不阻塞安装（例如个别图标 404），装完再补 */
      .catch(() => caches.open(CACHE).then((c) => Promise.all(
        ASSETS.map((u) => c.add(u).catch(() => {}))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // 写操作不拦截
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // 只管同源
  /* 规则 1：/api/ 永不缓存，也绝不拿缓存应答 */
  if (url.pathname.indexOf('/api/') === 0) return;

  /* 规则 3（2026-10-17）：页面导航网络优先——cache-first 会让发版后的第一次
     打开仍用旧 index.html（进而加载旧 app.js），模型清单等改动要等第二次才生效。
     离线时回退缓存，排盘零网络的卖点不变。 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        /* 命中即返；后台静默更新，下次打开就是新版 */
        fetch(req).then((res) => {
          if (res && res.ok && res.type === 'basic') {
            caches.open(CACHE).then((c) => c.put(req, res.clone()));
          }
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        /* 导航请求离线且未缓存 → 回退到已缓存的首页（shell 已在清单内） */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
