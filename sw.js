/* Service Worker：缓存资源，支持离线使用；页面优先联网获取以保证及时更新 */
var CACHE = 'lucky-app-v3'; /* 改版本号会删除旧缓存（v2 里存过 GitHub 接口的过期 404，必须清掉） */
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
  /* 只接管本应用的资源。跨域（如 api.github.com 云同步接口）一律放行，
     否则会把接口返回的过期结果（例如早期的 404）缓存住，导致同步判断出错 */
  if (new URL(e.request.url).origin !== self.location.origin) return;
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
