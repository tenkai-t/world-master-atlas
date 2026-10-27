const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const root=__dirname+'/public/',manifest=JSON.parse(fs.readFileSync(root+'offline-manifest.json'));
function workerTest(shared=new Map()){
 const events={};let offline=false,fail='',quota=false,network=0,windowCount=1;
 const key=x=>new URL(typeof x==='string'?x:x.url,'https://game.local').pathname;
 const caches={open:async n=>{if(!shared.has(n))shared.set(n,new Map());const m=shared.get(n);return{match:async p=>m.get(key(p))?.clone(),put:async(p,r)=>{if(quota)throw new DOMException('quota','QuotaExceededError');m.set(key(p),r.clone())},delete:async p=>m.delete(key(p))}},keys:async()=>[...shared.keys()],delete:async n=>shared.delete(n)};
 const context={Response,Headers,Request,URL,AbortController,setTimeout,clearTimeout,crypto,caches,console,fetch:async p=>{network++;const name=key(p);if(offline||name===fail)throw Error('network unavailable');if(name==='/offline-manifest.json')return Response.json(manifest);const file=root+name.slice(1);if(!fs.existsSync(file))return new Response('',{status:404});return new Response(fs.readFileSync(file))}};
 context.self={location:{origin:'https://game.local'},clients:{claim:async()=>{},matchAll:async()=>Array.from({length:windowCount},(_,i)=>({id:'tab'+i}))},addEventListener:(type,handler)=>events[type]=handler};vm.createContext(context);vm.runInContext(fs.readFileSync(root+'sw.js','utf8'),context);
 const msg=async(command,extra={})=>{const output=[];let task;events.message({data:{command,...extra},ports:[{postMessage:m=>output.push(m)}],waitUntil:p=>task=p});await task;return output.at(-1)};
 const get=async(path,clientId='document1',nav=false)=>{let promise;events.fetch({request:{url:'https://game.local'+path,method:'GET',mode:nav?'navigate':'cors'},clientId:nav?'':clientId,resultingClientId:nav?clientId:'',respondWith:p=>promise=p});if(!promise)return context.fetch(path);return await promise};
 return{msg,get,shared,caches,offline:v=>offline=v,fail:v=>fail=v,quota:v=>quota=v,network:()=>network,tabs:n=>windowCount=n};
}
(async()=>{
 const w=workerTest();assert.equal((await w.msg('status')).available.core,false);
 assert(!(await w.msg('prepare',{pack:'core'})).error);assert((await w.msg('status')).state.pending.ready.core);
 assert(!(await w.msg('activate')).error);assert((await w.msg('status')).available.core);
 for(const pack of ['photos','handwriting'])assert(!(await w.msg('prepare',{pack})).error);
 const status=await w.msg('status');assert(status.available.photos&&status.available.handwriting);assert.equal(status.files.length,Object.values(manifest.packs).flat().length);
 w.offline(true);const n=w.network();for(const p of ['/','/play','/play.html'])assert((await(await w.get(p,'nav-'+p,true)).text()).includes('世界マスター'));
 for(const f of Object.values(manifest.packs).flat())assert.equal((await(await w.get(f.url)).arrayBuffer()).byteLength,f.bytes,f.url);
 assert.equal(w.network(),n,'All prepared resources must be served without the network');
 await assert.rejects(()=>w.get('/api/rank/leaderboard'));assert(![...w.shared.keys()].some(k=>k.includes('/api')));
 // A new service worker process retains cache, metadata and pinned document versions.
 const restarted=workerTest(w.shared);restarted.offline(true);assert((await(await restarted.get('/play.html','reload',true)).text()).includes('だれが')===false);assert((await restarted.msg('status')).available.core);
 const core=await w.caches.open('world-master-material-v1-'+manifest.version+'-core');await core.delete('/assets/map.json');assert.equal((await w.msg('status')).available.core,false);assert((await w.msg('status')).available.photos);
 w.offline(false);w.fail('/assets/map.json');assert((await w.msg('prepare',{pack:'core'})).error);assert((await w.msg('status')).state.active,'A failed repair must not remove the active generation');
 w.fail('');w.quota(true);assert((await w.msg('prepare',{pack:'core'})).error.includes('容量'));w.quota(false);assert(!(await w.msg('prepare',{pack:'core'})).error);assert((await w.msg('status')).available.core);
 // A failed update keeps the old active shell and data. A successful update waits for explicit activation.
 const old=manifest.version;manifest.version='1234567890abcdefabcd';const htmlFile=manifest.packs.core.find(f=>f.url==='/play.html'),oldHash=htmlFile.sha256;htmlFile.sha256='0'.repeat(64);w.fail('/play.html');assert((await w.msg('prepare',{pack:'core'})).error);assert.equal((await w.msg('status')).state.active.manifest.version,old);
 w.fail('');htmlFile.sha256=oldHash;assert((await w.msg('prepare',{pack:'core',expectedVersion:'f'.repeat(20)})).error);const beforeReuse=w.network();assert(!(await w.msg('prepare',{pack:'core',expectedVersion:manifest.version})).error);assert.equal(w.network()-beforeReuse,1,'Verified old core bytes are reused; only manifest goes online');for(const pack of ['photos','handwriting']){const n=w.network();assert(!(await w.msg('prepare',{pack,expectedVersion:manifest.version})).error);assert.equal(w.network()-n,1,'Unchanged optional pack reuses verified bytes')}assert((await w.msg('activate',{expectedVersion:'e'.repeat(20)})).error);assert.equal((await w.msg('status')).state.active.manifest.version,old);assert((await w.msg('status')).state.pending);
 w.tabs(2);assert.equal((await w.msg('clients')).count,2);assert((await w.msg('activate',{expectedVersion:manifest.version,exclusive:true})).error);assert.equal((await w.msg('status')).state.active.manifest.version,old);w.tabs(1);assert(!(await w.msg('activate',{expectedVersion:manifest.version,exclusive:true})).error);assert.equal((await w.msg('status')).state.active.manifest.version,manifest.version);
 assert(!(await w.msg('delete')).error);assert.equal((await w.msg('status')).state.active,null);assert.equal(w.shared.size,1);manifest.version=old;
 console.log('PASS offline worker: all real files hash-verified and served disconnected, root/play navigation, cache persistence after worker restart, API excluded, partial loss/failed repair/quota/retry, atomic update with explicit activation, expected-version checks, zero asset redownload for identical packs, cache-only deletion');
})().catch(err=>{console.error(err);process.exit(1)});
