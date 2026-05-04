const CACHE_NAME = 'wildfire-japan-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap'
];

// 1. インストール: 静的リソース（HTML/CSS/JS/Fonts）を事前に保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 2. アクティベート: 古いキャッシュの削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// 3. フェッチ: リソースの種類に応じたキャッシュ戦略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. NASA FIRMS API (Network First)
  // 最新の火災情報が重要なため、まずはネット、失敗したらキャッシュを返す
  if (url.href.includes('firms.modaps.eosdis.nasa.gov')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // B. 地図タイル (Cache First)
  // タイル画像は一度取得すれば変わらないため、キャッシュから即座に返す
  if (url.href.includes('arcgisonline.com') || url.href.includes('cartocdn.com')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        });
      })
    );
    return;
  }

  // C. その他（静的ファイルなど）
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
