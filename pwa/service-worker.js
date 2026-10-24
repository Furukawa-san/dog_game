'use strict';
// Saves live in localStorage, never in this cache.
const RELEASE='2026-10-24-3d-v7.3';
const PREFIX='shiba-pocket-'+new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi,'_')+'-';
const CACHE=PREFIX+RELEASE;
const FILES=['./index.html','./manifest.webmanifest','./pwa.js','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // Pages redirects index.html to /. Cache the canonical response under one HTML key.
 const html=await fetch(new URL('./',self.registration.scope),{cache:'reload'});
 if(!html.ok||html.redirected)throw Error('Canonical game HTML unavailable');
 await cache.put(new URL('./index.html',self.registration.scope),html);
 await cache.addAll(FILES.slice(1));
 // Only recover the broken v2 redirect cache automatically; normal updates still wait.
 const broken=PREFIX+'2026-10-10-touch3d-v2';
 if((await caches.keys()).includes(broken)){
  const old=await caches.open(broken),document=await old.match('./index.html');
  if(document?.redirected)await self.skipWaiting();
 }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(event.request,{ignoreSearch:true});if(hit)return hit;if(event.request.mode==='navigate')return (await cache.match('./index.html'))||fetch(event.request);return fetch(event.request);})());});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(f=>cache.match(f)))).every(Boolean);event.ports[0]?.postMessage({ready,release:RELEASE});})());});
