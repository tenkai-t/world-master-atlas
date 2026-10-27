'use strict';
// Only reviewed, hash-checked, same-origin teaching files enter these caches.
const WM_META='world-master-offline-meta-v1', WM_PREFIX='world-master-material-v1-';
const metaURL='/__world_master_offline_state__';
let currentJob=null;
const jsonResponse=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
async function readState(){try{const r=await(await caches.open(WM_META)).match(metaURL);if(!r)return{schema:1,active:null,pending:null};const s=await r.json();if(s?.schema!==1||['active','pending'].some(k=>s[k]&&(!validManifest(s[k].manifest)||typeof s[k].ready!=='object')))throw Error('metadata');return s}catch{return{schema:1,active:null,pending:null,issue:'保存教材の管理情報を読み込めません。学習記録は維持しています。オンラインで教材を修復してください。'}}}
// Rebuild a same-origin, hash-checked response. Redirect history must not enter a navigation.
function cleanResponse(r){const headers=new Headers(r.headers);for(const name of ['Content-Encoding','Content-Length','Content-Location','Location'])headers.delete(name);return new Response(r.body,{status:r.status,statusText:r.statusText,headers})}
async function timedFetch(url,options={},ms=15000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}}

async function writeState(s){await(await caches.open(WM_META)).put(metaURL,jsonResponse(s))}
const cacheName=(version,pack)=>WM_PREFIX+version+'-'+pack;
function validManifest(m){return m?.schema===1&&/^[a-f0-9]{20}$/.test(m.version)&&['core','photos','handwriting'].every(k=>Array.isArray(m.packs?.[k])&&m.packs[k].every(f=>typeof f.url==='string'&&/^\/(?:assets\/|icons\/|licenses\/|vendor\/|[a-z][a-z0-9-]*\.(?:html|js|css|webmanifest))/.test(f.url)&&!f.url.includes('..')&&!f.url.includes('://')&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&/^[a-f0-9]{64}$/.test(f.sha256)))}
async function manifest(){const controller=new AbortController();let timer;try{return await Promise.race([(async()=>{const r=await fetch('/offline-manifest.json',{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!r.ok)throw Error('教材一覧を取得できません。オンラインで再試行してください。');const m=await r.json();if(!validManifest(m))throw Error('教材一覧の形式が不正です。');return m})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('教材一覧の読み込みが止まりました。通信を確認して再試行してください。'))},15000)})])}finally{clearTimeout(timer)}}
async function checkFile(response,file){if(!response?.ok)throw Error('教材を取得できません：'+file.url);const bytes=await response.clone().arrayBuffer();if(bytes.byteLength!==file.bytes)throw Error('教材の容量が一致しません：'+file.url);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==file.sha256)throw Error('教材の内容が一致しません：'+file.url)}
async function verifiedPack(m,pack){if(!validManifest(m))return false;try{const cache=await caches.open(cacheName(m.version,pack));for(let i=0;i<m.packs[pack].length;i+=8){const results=await Promise.all(m.packs[pack].slice(i,i+8).map(async f=>{try{await checkFile(await cache.match(f.url),f);return true}catch{return false}}));if(results.includes(false))return false}return true}catch{return false}}

async function status(){const s=await readState(),a=s.active,pendingAvailable={};for(const pack of ['core','photos','handwriting'])pendingAvailable[pack]=!!s.pending?.ready?.[pack]&&await verifiedPack(s.pending.manifest,pack);if(!a)return{state:s,available:{core:false,photos:false,handwriting:false},files:[],pendingAvailable};const available={},files=[];for(const pack of ['core','photos','handwriting']){const usable=!!a.ready?.[pack]&&await verifiedPack(a.manifest,pack);available[pack]=usable;if(usable)files.push(...a.manifest.packs[pack].map(f=>f.url))}return{state:s,available,files,pendingAvailable}}
async function tidyCaches(s,previous){const keep=new Set([s.active?.manifest.version,s.pending?.manifest.version,previous].filter(Boolean));const clients=await self.clients.matchAll?.({includeUncontrolled:true})||[];for(const client of clients)keep.add(await pinnedVersion(client.id,s.active.manifest.version));for(const version of clientVersions.values())keep.add(version);for(const name of await caches.keys()){if(!name.startsWith(WM_PREFIX))continue;const version=name.slice(WM_PREFIX.length,WM_PREFIX.length+20);if(!keep.has(version))await caches.delete(name)}}
// This worker-only hotfix can take control without changing a running document's assets.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{const port=event.ports?.[0],send=x=>port?.postMessage(x);event.waitUntil((async()=>{try{
 const command=event.data?.command;
 if(command==='activateRepair'){await self.skipWaiting();send({done:true});return}
 if(command==='cancel'){if(currentJob){currentJob.cancelled=true;currentJob.controller?.abort()}send({done:true});return}
 if(command==='ping'){send({done:true,repairRevision:4,updateRevision:1});return}
 if(command==='status'){send({done:true,repairRevision:4,updateRevision:1,...await status()});return}
 if(command==='clients'){const windows=await self.clients.matchAll?.({type:'window',includeUncontrolled:true})||[];send({done:true,count:windows.length});return}
 if(command==='manifest'){send({done:true,manifest:await manifest()});return}
 if(command==='delete'){if(currentJob)throw Error('準備を中断してから削除してください。');const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith(WM_PREFIX)||n===WM_META).map(n=>caches.delete(n)));send({done:true});return}
 if(command==='activate'){
  if(currentJob)throw Error('準備中です。');currentJob={activating:true};try{const s=await readState(),p=s.pending;if(!p||!await verifiedPack(p.manifest,'core'))throw Error('基本教材がそろっていません。再準備してください。');if(event.data.expectedVersion&&p.manifest.version!==event.data.expectedVersion)throw Error('準備した版が変わりました。再確認してください。');if(event.data.exclusive){const windows=await self.clients.matchAll?.({type:'window',includeUncontrolled:true})||[];if(windows.length>1)throw Error('ほかのタブを閉じて更新してください。')}const previous=s.active?.manifest.version;delete s.issue;s.active=p;s.pending=null;await writeState(s);await tidyCaches(s,previous).catch(()=>{});send({done:true});return}finally{currentJob=null}
 }
 if(command!=='prepare')throw Error('操作を確認してください。');if(currentJob)throw Error('別の準備が進行中です。');
 const job={cancelled:false,controller:null};currentJob=job;
 try{
 const m=await manifest(),pack=event.data.pack;if(event.data.expectedVersion&&event.data.expectedVersion!==m.version)throw Error('公開版が変わりました。最新版を再確認してください。');if(!['core','photos','handwriting'].includes(pack))throw Error('教材を選んでください。');
 let s=await readState();if(pack!=='core'&&s.pending?.manifest.version!==m.version&&s.active?.manifest.version!==m.version)throw Error('先に現在の基本教材を準備してください。');
 const cache=await caches.open(cacheName(m.version,pack));let completed=0,bytes=0;
 for(const f of m.packs[pack]){
  if(job.cancelled)throw Error('準備を中断しました。保存済みの教材と学習記録は残ります。');
  let response=await cache.match(f.url);try{await checkFile(response,f)}catch{
   // Reuse only bytes verified against the NEW manifest, across complete or partial packs.
   response=null;for(const name of await caches.keys()){if(!name.startsWith(WM_PREFIX)||name===cacheName(m.version,pack))continue;const candidate=await(await caches.open(name)).match(f.url);if(!candidate)continue;try{await checkFile(candidate,f);response=candidate;break}catch{}}
   if(response){await cache.put(f.url,cleanResponse(response.clone()))}else{

   const controller=new AbortController();job.controller=controller;const timer=setTimeout(()=>controller.abort(),45000);
   try{response=await fetch(f.url,{cache:'reload',credentials:'same-origin',signal:controller.signal});await checkFile(response,f);await cache.put(f.url,cleanResponse(response.clone()))}finally{clearTimeout(timer);job.controller=null}
   }
  }
  bytes+=f.bytes;send({progress:true,completed:++completed,total:m.packs[pack].length,bytes});
 }
 if(job.cancelled)throw Error('準備を中断しました。');if(!await verifiedPack(m,pack))throw Error('保存結果を確認できませんでした。');
 if(pack==='core')await cache.put('/__manifest__',jsonResponse(m));
 s=await readState();if(pack==='core')delete s.issue;let target;if(s.active?.manifest.version===m.version)target=s.active;else{if(s.pending?.manifest.version!==m.version)s.pending={manifest:m,ready:{}};target=s.pending}target.ready[pack]=true;await writeState(s);send({done:true,pending:!!s.pending,pack});
 }finally{currentJob=null}
 }catch(err){send({done:true,error:err.name==='QuotaExceededError'?'端末の保存容量が不足しています。学習記録は消していません。不要なオフライン教材だけを整理して再試行できます。':err.message||'教材を保存できませんでした。再試行できます。'})}})())});
// Pin an existing document to its complete version; never mix a new data book into an old quiz.
const clientVersions=new Map();
async function pinnedVersion(id,fallback){if(!id)return fallback;if(clientVersions.has(id))return clientVersions.get(id);const cache=await caches.open(WM_META),stored=await cache.match('/__client__'+id);const version=stored?await stored.text():fallback;await pinVersion(id,version);return version}
async function pinVersion(id,version){if(!id)return;clientVersions.set(id,version);await(await caches.open(WM_META)).put('/__client__'+id,new Response(version))}

function recoveryResponse(){return new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>世界マスター · 教材の復旧</title><body style="font:18px system-ui;background:#f7f8f2;color:#183f3b;padding:24px;line-height:1.8"><h1>保存教材を確認してください</h1><p>起動に必要な教材が不足しているか、読み込めませんでした。プレイヤーと学習記録は削除していません。</p><p>通信を戻してから、教材を修復してください。</p><p><a href="/repair.html">記録を残して教材を修復する</a></p><p><a href="/play.html">もう一度開く</a></p></body></html>',{status:503,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}
async function onlineNavigation(request,clientId){
 await pinVersion(clientId,'network').catch(()=>{});
 // Fetch the canonical path directly; do not return a followed redirect to a navigation request.
 try{const r=await timedFetch(request,{cache:'no-store'},12000);if(r.type==='opaqueredirect')return r;if(r.ok&&(!r.url||new URL(r.url).origin===self.location.origin))return cleanResponse(r);return r}catch{return recoveryResponse()}
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 // Recovery and update discovery must always bypass a previously pinned teaching version.
 if(['/repair.html','/repair','/repair.js','/sw.js','/offline-manifest.json','/release.json'].includes(url.pathname))return;
 event.respondWith((async()=>{
 const nav=request.mode==='navigate'&&['/','/play','/play.html'].includes(url.pathname),clientId=event.resultingClientId||event.clientId;
 try{
  const s=await readState();
  if(nav){
   if(!s.active||!s.active.manifest.packs.core.some(f=>f.url==='/player-security.js')||!await verifiedPack(s.active.manifest,'core'))return onlineNavigation(request,clientId);
   const m=s.active.manifest;if(!m.packs.core.some(f=>f.url==='/app-update.js')){const upgraded=await onlineNavigation(request,clientId);if(upgraded.status!==503)return upgraded}await pinVersion(clientId,m.version).catch(()=>{});
   const cached=await(await caches.open(cacheName(m.version,'core'))).match('/play.html');
   if(!cached)return onlineNavigation(request,clientId);
   // Also repairs redirected responses already present in version 17 caches, without deleting them.
   return cleanResponse(cached);
  }
  if(!s.active)return fetch(request);
  const version=await pinnedVersion(event.clientId,s.active.manifest.version).catch(()=>s.active.manifest.version);
  if(version==='network')return fetch(request,{cache:'no-store'});
  let m=s.active.manifest;
  if(version!==m.version){const old=await(await caches.open(cacheName(version,'core'))).match('/__manifest__');if(old)m=await old.json();else return fetch(request)}
  if(!validManifest(m))return fetch(request);
  const path=url.pathname,file=Object.values(m.packs).flat().find(f=>f.url===path);if(!file)return fetch(request);
  for(const pack of ['core','photos','handwriting']){const cached=await(await caches.open(cacheName(version,pack))).match(path);if(cached)return cleanResponse(cached)}
  try{return await fetch(request)}catch{return new Response('この教材は端末に保存されていません。オンラインで教材を修復してください。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}
 }catch{if(nav)return onlineNavigation(request,clientId);try{return await fetch(request)}catch{return new Response('教材を読み込めません。通信を戻して /repair.html を開いてください。',{status:503})}}
 })());
});
