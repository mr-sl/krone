const CACHE = 'krone-v2';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
];

// CDN hosts used by the OCR engine – cached on first use so scanning works offline
const OCR_HOSTS = [
  'cdn.jsdelivr.net',
  'tessdata.projectnaptha.com',
  'unpkg.com'
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

function isOcrAsset(url){
  for(var i=0;i<OCR_HOSTS.length;i++){
    if(url.indexOf(OCR_HOSTS[i]) !== -1) return true;
  }
  return false;
}

self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // never cache the live exchange-rate API – always go to network
  if(url.indexOf('frankfurter.app') !== -1){
    return;
  }

  // OCR engine + language data: cache-first (they're versioned & large).
  // Once fetched online, scanning keeps working without a connection.
  if(isOcrAsset(url)){
    e.respondWith(
      caches.match(e.request).then(function(hit){
        if(hit) return hit;
        return fetch(e.request).then(function(res){
          if(res && (res.status === 200 || res.type === 'opaque')){
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
          }
          return res;
        });
      })
    );
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
