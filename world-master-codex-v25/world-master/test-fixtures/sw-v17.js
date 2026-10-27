'use strict';
// Only reviewed, hash-checked, same-origin teaching files enter these caches.
const WM_META='world-master-offline-meta-v1', WM_PREFIX='world-master-material-v1-';
const metaURL='/__world_master_offline_state__';
let currentJob=null;
const jsonResponse=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
async function readState(){const r=await(await caches.open(WM_META)).match(metaURL);return r?await r.json():{schema:1,active:null,pending:null}}
async function writeState(s){await(await caches.open(WM_META)).put(metaURL,jsonResponse(s))}
const cacheName=(version,pack)=>WM_PREFIX+version+'-'+pack;
function validManifest(m){return m?.schema===1&&/^[a-f0-9]{20}$/.test(m.version)&&['core','photos','handwriting'].every(k=>Array.isArray(m.packs?.[k])&&m.packs[k].every(f=>typeof f.url==='string'&&/^\/(?:assets\/|icons\/|licenses\/|vendor\/|[a-z][a-z0-9-]*\.(?:html|js|css|webmanifest))/.test(f.url)&&!f.url.includes('..')&&!f.url.includes('://')&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&/^[a-f0-9]{64}$/.test(f.sha256)))}
async function manifest(){const r=await fetch('/offline-manifest.json',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('教材一覧を取得できません。オンラインで再試行してください。');const m=await r.json();if(!validManifest(m))throw Error('教材一覧の形式が不正です。');return m}
async function checkFile(response,file){if(!response?.ok)throw Error('教材を取得できません：'+file.url);const bytes=await response.clone().arrayBuffer();if(bytes.byteLength!==file.bytes)throw Error('教材の容量が一致しません：'+file.url);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==file.sha256)throw Error('教材の内容が一致しません：'+file.url)}
async function verifiedPack(m,pack){const cache=await caches.open(cacheName(m.version,pack));for(const f of m.packs[pack]){const r=await cache.match(f.url);if(!r)return false;try{await checkFile(r,f)}catch{return false}}return true}
async function status(){const s=await readState(),a=s.active;if(!a)return{state:s,available:{core:false,photos:false,handwriting:false},files:[]};const available={},files=[];for(const pack of ['core','photos','handwriting']){const usable=!!a.ready?.[pack]&&await verifiedPack(a.manifest,pack);available[pack]=usable;if(usable)files.push(...a.manifest.packs[pack].map(f=>f.url))}return{state:s,available,files}}
async function tidyCaches(s,previous){const keep=new Set([s.active?.manifest.version,s.pending?.manifest.version,previous].filter(Boolean));const clients=await self.clients.matchAll?.({includeUncontrolled:true})||[];for(const client of clients)keep.add(await pinnedVersion(client.id,s.active.manifest.version));for(const version of clientVersions.values())keep.add(version);for(const name of await caches.keys()){if(!name.startsWith(WM_PREFIX))continue;const version=name.slice(WM_PREFIX.length,WM_PREFIX.length+20);if(!keep.has(version))await caches.delete(name)}}
self.addEventListener('install',()=>{});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{const port=event.ports?.[0],send=x=>port?.postMessage(x);event.waitUntil((async()=>{try{
 const command=event.data?.command;
 if(command==='cancel'){if(currentJob){currentJob.cancelled=true;currentJob.controller?.abort()}send({done:true});return}
 if(command==='status'){send({done:true,...await status()});return}
 if(command==='manifest'){send({done:true,manifest:await manifest()});return}
 if(command==='delete'){if(currentJob)throw Error('準備を中断してから削除してください。');const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith(WM_PREFIX)||n===WM_META).map(n=>caches.delete(n)));send({done:true});return}
 if(command==='activate'){
  if(currentJob)throw Error('準備中です。');const s=await readState(),p=s.pending;if(!p||!await verifiedPack(p.manifest,'core'))throw Error('基本教材がそろっていません。再準備してください。');const previous=s.active?.manifest.version;s.active=p;s.pending=null;await writeState(s);await tidyCaches(s,previous).catch(()=>{});send({done:true});return;
 }
 if(command!=='prepare')throw Error('操作を確認してください。');if(currentJob)throw Error('別の準備が進行中です。');
 const job={cancelled:false,controller:null};currentJob=job;
 try{
 const m=await manifest(),pack=event.data.pack;if(!['core','photos','handwriting'].includes(pack))throw Error('教材を選んでください。');
 let s=await readState();if(pack!=='core'&&s.pending?.manifest.version!==m.version&&s.active?.manifest.version!==m.version)throw Error('先に現在の基本教材を準備してください。');
 const cache=await caches.open(cacheName(m.version,pack));let completed=0,bytes=0;
 for(const f of m.packs[pack]){
  if(job.cancelled)throw Error('準備を中断しました。保存済みの教材と学習記録は残ります。');
  let response=await cache.match(f.url);try{await checkFile(response,f)}catch{
   const controller=new AbortController();job.controller=controller;const timer=setTimeout(()=>controller.abort(),45000);
   try{response=await fetch(f.url,{cache:'reload',credentials:'same-origin',signal:controller.signal});await checkFile(response,f);await cache.put(f.url,response.clone())}finally{clearTimeout(timer);job.controller=null}
  }
  bytes+=f.bytes;send({progress:true,completed:++completed,total:m.packs[pack].length,bytes});
 }
 if(job.cancelled)throw Error('準備を中断しました。');if(!await verifiedPack(m,pack))throw Error('保存結果を確認できませんでした。');
 if(pack==='core')await cache.put('/__manifest__',jsonResponse(m));
 s=await readState();let target;if(s.active?.manifest.version===m.version)target=s.active;else{if(s.pending?.manifest.version!==m.version)s.pending={manifest:m,ready:{}};target=s.pending}target.ready[pack]=true;await writeState(s);send({done:true,pending:!!s.pending,pack});
 }finally{currentJob=null}
 }catch(err){send({done:true,error:err.name==='QuotaExceededError'?'端末の保存容量が不足しています。学習記録は消していません。不要なオフライン教材だけを整理して再試行できます。':err.message||'教材を保存できませんでした。再試行できます。'})}})())});
// Pin an existing document to its complete version; never mix a new data book into an old quiz.
const clientVersions=new Map();
async function pinnedVersion(id,fallback){if(!id)return fallback;if(clientVersions.has(id))return clientVersions.get(id);const cache=await caches.open(WM_META),stored=await cache.match('/__client__'+id);const version=stored?await stored.text():fallback;await pinVersion(id,version);return version}
async function pinVersion(id,version){if(!id)return;clientVersions.set(id,version);await(await caches.open(WM_META)).put('/__client__'+id,new Response(version))}

self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith((async()=>{
  const s=await readState();if(!s.active)return fetch(request);const nav=request.mode==='navigate'&&['/','/play','/play.html'].includes(url.pathname);
  let version=await pinnedVersion(event.clientId,s.active.manifest.version);
  if(nav)version=s.active.manifest.version;
  if(event.resultingClientId)await pinVersion(event.resultingClientId,version);
  const names=await caches.keys();let m=s.active.manifest;
  if(version!==m.version){const old=await(await caches.open(cacheName(version,'core'))).match('/__manifest__');if(old)m=await old.json();else return fetch(request)}
  const path=nav?'/play.html':url.pathname;const file=Object.values(m.packs).flat().find(f=>f.url===path);
  if(!file)return fetch(request);
  for(const pack of ['core','photos','handwriting']){const name=cacheName(version,pack);if(!names.includes(name))continue;const cached=await(await caches.open(name)).match(path);if(cached)return cached}
  try{return await fetch(request)}catch{return new Response('この教材は端末に保存されていません。オンラインで「オフラインで遊ぶ準備」を行ってください。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}
 })());
});
