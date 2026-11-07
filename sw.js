/* Spotter offline cache: the app's own files load from the phone, so it opens without signal */
const CACHE='spotter-v1';
const FILES=['./','index.html','manifest.webmanifest','anim.js','data.js','ui-common.js','ui-coach.js','ui-meals.js','ui-client.js','ui-report.js','ui-extras.js','ui-templates.js','ui-calendar.js','ui-checkins.js','app.js','assets/icon-192.png','assets/icon-512.png','assets/icon-180.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// network first, so updates show up straight away; the cached copy is the fallback when offline
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match('index.html'))));
});
