const CACHE = 'krone-v1';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
        .map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // never cache the live exchange-rate API – always go to network
  if(url.indexOf('frankfurter.app') !== -1){
    return;
  }

  // app shell: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(function(hit){
      return hit || fetch(e.request).then(function(res){
        return caches.open(CACHE).then(function(c){
          if(e.request.method === 'GET' && res.status === 200){
            c.put(e.request, res.clone());
          }
          return res;
        });
      }).catch(function(){ return caches.match('index.html'); });
    })
  );
});
