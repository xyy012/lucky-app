/* Service Worker：缓存资源，支持离线使用；页面优先联网获取以保证及时更新 */
var CACHE = 'lucky-app-v2';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  /* 页面导航：网络优先，失败时用缓存兜底 */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }
  /* 其他资源：缓存优先 */
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        return res;
      });
    })
  );
});
