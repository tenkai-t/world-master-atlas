// Execute the real HTML script order in separate classic-script scopes, and check bindings
// statically: a concatenated/sloppy eval can hide undeclared assignments in strict files.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),{Linter}=require('eslint');
const root=__dirname+'/public/',html=fs.readFileSync(root+'play.html','utf8');
const probe=new JSDOM(html,{url:'https://test.local/play.html'});
const files=[...probe.window.document.scripts].map(s=>new URL(s.src).pathname.slice(1));
const code=files.map(f=>fs.readFileSync(root+f,'utf8'));
const globals=Object.fromEntries(Object.getOwnPropertyNames(probe.window).map(k=>[k,'writable']));
Object.assign(globals,{fetch:'readonly',module:'readonly',Worker:'readonly',TextEncoder:'readonly',MessageChannel:'readonly',InkRecognizer:'readonly',KanjiEngine:'readonly'});
const lint=new Linter().verify(code.join('\n'),[{languageOptions:{ecmaVersion:'latest',sourceType:'script',globals},rules:{'no-undef':'error'}}]);
assert.deepEqual(lint.map(x=>x.message),[],'All classic scripts must declare bindings before boot');
probe.window.close();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const legacy={version:1,records:{'JP:flag':{right:5,wrong:2,last:1,streak:1,dates:['2026-10-15']}},history:[],settings:{sound:true},nickname:'旅人'};
async function launch(failure,store=new Map([['world-master:v1',JSON.stringify(legacy)]])){
 if(!store.has('world-master:security:v1')){const salt='0123456789abcdef0123456789abcdef',v={algorithm:'PBKDF2-SHA256',iterations:600000,salt,hash:require('node:crypto').pbkdf2Sync('1234',Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex'),version:'fixture'};store.set('world-master:security:v1',JSON.stringify({schema:1,players:{legacy:v},admin:v,minutes:5}))}
 const dom=new JSDOM(html,{url:'https://test.local/play.html',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:720,height:420});
 const timers=[];const sandbox={document:w.document,navigator:{locks:{request:async(k,fn)=>fn()}},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},sessionStorage:w.sessionStorage,
 crypto:require('node:crypto').webcrypto,TextEncoder,console,setTimeout:(fn,ms,...args)=>setTimeout(fn,[4000,15000].includes(ms)?10:ms,...args),clearTimeout,setInterval:(...args)=>{const id=setInterval(...args);timers.push(id);return id},clearInterval,URL,Blob,performance,AbortController,
 addEventListener:w.addEventListener.bind(w),fetch:async path=>{
  if(path===failure?.path){if(failure.kind==='hang')return new Promise(()=>{});if(failure.kind==='jsonHang')return{ok:true,json:()=>new Promise(()=>{})};if(failure.kind==='json')return{ok:true,json:async()=>{throw SyntaxError('bad json')}};return{ok:false}}
  return{ok:true,json:async()=>JSON.parse(fs.readFileSync(root+path,'utf8'))}
 }};sandbox.window=sandbox;const ctx=vm.createContext(sandbox),e=s=>vm.runInContext(s,ctx);
 files.forEach((file,i)=>vm.runInContext(code[i],ctx,{filename:file}));await e('playersReady');for(let i=0;i<100&&w.document.querySelector('#app').textContent.includes('世界地図を準備しています');i++)await delay(20);
 const login=async()=>{await e("selectPlayer('legacy')");w.document.querySelector('#loginPin').value='1234';await w.document.querySelector('#securityLogin').onsubmit({preventDefault(){}})};
 return{w,e,login,store,recover:()=>{failure.path=''},close:()=>{timers.forEach(clearInterval);w.close()}};
}
(async()=>{
 for(const kind of [null,'http','json','hang','jsonHang']){
  const x=await launch(kind?{path:'assets/hintbook.json',kind}:null),{w,e}=x;
  assert.equal(e('view'),'players',kind+': '+w.document.querySelector('#app').textContent.slice(0,250));assert(w.document.querySelector('#app').textContent.includes('だれが遊びますか'));
  await x.login();assert.equal(e('view'),'home');assert.equal(e("db.records['JP:flag'].right"),5);
  assert.equal(x.store.get('world-master:v1'),JSON.stringify(legacy));assert.equal(e('hintbookError'),!!kind);
  for(const [content,id,mode] of [['country','JP','flag'],['capital','cap-jp-tokyo','capitalName'],['terrain','terrain-river-01','terrainName'],['heritage','wh-252','heritageMap']]){
   e(`beginExpanded({content:'${content}',ids:['${id}'],mode:'${mode}',input:'choice',practice:'practice',count:1})`);
   assert(e('session'));e('hint()');e('submitAnswer(false,session.queue[0].id)');e('next()');assert.equal(e('view'),'result');e('home()');assert.equal(e('view'),'home');
  }
  await e('playerQueue');const raw=x.store.get('world-master:player:v1:legacy');const y=await launch(null,x.store);await y.login();assert.equal(y.store.get('world-master:player:v1:legacy'),raw);assert.equal(y.e("db.records['JP:flag'].right"),6);y.close();x.close();
 }
 for(const kind of ['http','json','hang','jsonHang']){
  const x=await launch({path:'assets/data.json',kind});assert(x.w.document.querySelector('#app').textContent.includes('再試行'));
  assert.equal(x.store.get('world-master:v1'),JSON.stringify(legacy));
  x.recover();await x.e('boot()');assert.equal(x.e('view'),'players');await x.e("selectPlayer('legacy')");assert.equal(x.e("db.records['JP:flag'].right"),5);
  x.close();
 }
 console.log('PASS startup: declared bindings, actual separate script order, player/home boot, optional hint HTTP/JSON/response+parse timeout recovery, four category answer/result/home flows, required asset failure UI, legacy and player records preserved on reload');
})().catch(err=>{console.error(err);process.exit(1)});
