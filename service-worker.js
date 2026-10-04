const CACHE_NAME = 'roflix-app-shell-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/roflix-icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ROFLIX_SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;if(url.pathname==='/admin.html'||url.pathname.startsWith('/admin/'))return;
 if(req.mode==='navigate'||url.pathname.endsWith('.html')){event.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(req.mode==='navigate'?'/index.html':req,c))}return r}).catch(()=>caches.match(req.mode==='navigate'?'/index.html':req)));return}
 if(url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname.endsWith('.json')||url.pathname.endsWith('.webmanifest')){event.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(req,c))}return r}).catch(()=>caches.match(req)));return}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{if(r.ok&&r.type==='basic'){const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(req,c))}return r})))
});
