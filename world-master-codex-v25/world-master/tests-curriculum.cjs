const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=__dirname+'/public/';
function backend(){const data=new Map(),queues=new Map();return{data,fail:false,reads:[],writes:[],lock:(_key,fn)=>{const previous=queues.get(_key)||Promise.resolve();const next=previous.then(fn,fn);queues.set(_key,next.catch(()=>{}));return next},storage:{}}}
async function create(b,legacy){if(legacy)b.data.set('world-master:v1',JSON.stringify(legacy));const d=new JSDOM(fs.readFileSync(root+'play.html','utf8'),{url:'https://test.local',runScripts:'outside-only'}),w=d.window;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.SVGElement.prototype.setPointerCapture=function(){};w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:720,height:420});Object.defineProperty(w,'localStorage',{value:{getItem(k){b.reads.push(k);return b.data.get(k)||null},setItem(k,v){b.writes.push(k);if(b.fail||b.failKey===k)throw Error('quota exceeded');b.data.set(k,String(v))},removeItem(k){b.data.delete(k)}}});Object.defineProperty(w.navigator,'locks',{value:{request:b.lock}});w.fetch=async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(root+p,'utf8'))});w.eval(['handwriting.js','app.js','expansion.js','players.js','learning.js'].map(p=>fs.readFileSync(root+p,'utf8')).join('\n')+';window.ev=s=>eval(s)');await w.ev('playersReady');await new Promise(r=>setTimeout(r,30));return d}

(async()=>{const d=await create(backend()),w=d.window,e=w.ev;await e("selectPlayer('legacy')");
const expected=[
'US GB IN EG AU CA KR GR ES CN DE TR JP BR CH',
'IT RU AR IL KE SA JM SG NP VA BT MX SO TH ZA',
'ID KH MK LK PA PW BD MN FR BE PT MY MM VN FI',
'NZ IS IR UY AT NL QA SM TZ CL TV BH PE LA LY',
'KN VC BA SZ CK GE TN NO PH PL FM GT DK MA LB NA DO CZ HR ET UZ IQ DZ IE MR MG BG PG PK DM'];
let ids=[];for(let i=0;i<5;i++){ids.push(...expected[i].split(' '));assert.equal(new Set(ids).size,[15,30,45,60,90][i]);const got=e(`questionPool({content:'country',mode:'flag',level:'c${i+1}',scope:'basic',region:'世界全体'}).map(q=>q.id)`);assert.deepEqual([...got].sort(),ids.slice().sort());}
assert.equal(e("questionPool({content:'country',mode:'flag',level:'countryMaster',scope:'basic'}).length"),e('data.length'));
for(const level of ['c1','c2','c3','c4','c5','countryMaster'])for(const mode of e("Object.keys(modeLabel)")){
 e(`beginExpanded({content:'country',mode:'${mode}',level:'${level}',scope:'basic',count:10,input:'choice',practice:'practice'})`);
 assert(e(`session.queue.every(q=>countryAtLevel(q,'${level}'))`));
 if(['silhouette','rotated'].includes(mode))assert(e('session.queue.every(hasCountryShape)'));
 const options=e('session.options||[]');if(!['location','flagLocation'].includes(mode))assert(options.length===4,mode);assert(options.every(x=>e(`countryAtLevel(data.find(q=>q.id==='${x.id}'),'${level}')`)),mode);
 if(!['silhouette','rotated'].includes(mode)&&level!=='c1')assert(e(`session.queue.filter(q=>countryStage(q.id)===${level==='countryMaster'?6:level.slice(1)}).length>=5`));
}
for(const [level,id] of [['c2','VA'],['c5','CK']])assert(e(`questionPool({content:'country',level:'${level}',scope:'basic',mode:'flag'}).some(q=>q.id==='${id}')`));
e("setup('flag')");assert(!w.document.querySelector('#scope'));assert.deepEqual([...w.document.querySelector('#level').options].map(o=>o.value),['c1','c2','c3','c4','c5','countryMaster']);
w.document.querySelector('#region').value='アフリカ';w.document.querySelector('#expandedSetup').onchange();assert(!w.document.querySelector('#begin').disabled);w.document.querySelector('#expandedSetup').onsubmit({preventDefault(){}});assert.equal(e('session.queue[0].id'),'EG');assert.equal(e('session.options.length'),4);
e("beginExpanded({content:'country',mode:'location',level:'c1',count:1})");const svg=w.document.querySelector('.mapSvg'),node=w.document.querySelector('[data-code=VA]');svg.onpointerdown({target:node,clientX:100,clientY:100,pointerId:1});svg.onpointerup({target:node,clientX:100,clientY:100,pointerId:1});assert.equal(e('session.selected'),null);
e("beginExpanded({content:'country',mode:'flag',level:'master',count:1})");assert.equal(e('session.cfg.level'),'countryMaster');assert(w.document.querySelector('#app').textContent.includes('旧「達人」'));assert.equal(e('normalizeStudyConfig({content:"capital",level:"master"}).level'),'advanced');
e('mixedSetup()');assert.equal(w.document.querySelector('#level').options.length,3);assert.equal(w.document.querySelector('#countryLevel').options.length,6);e("mixedStart({level:'advanced',countryLevel:'c2',practice:'practice',count:20})");assert(e("session.queue.filter(q=>q.task.content==='country').every(q=>q.task.level==='c2'&&countryAtLevel(q,'c2'))"));assert(e("session.queue.filter(q=>q.task.content!=='country').every(q=>q.task.level==='advanced')"));
// Append, no duplicate taps, visible after answer, reset on next; all four dispatch paths.
for(const [content,mode] of [['country','flag'],['capital','capitalName'],['terrain','terrainName'],['heritage','heritageMap']]){
 e(`beginExpanded({content:'${content}',mode:'${mode}',ids:${JSON.stringify({country:['JP','US'],capital:['cap-jp-tokyo','cap-fr-paris'],terrain:['terrain-mountain-01','terrain-mountain-02'],heritage:['wh-252','wh-274']}[content])},practice:'practice',count:2})`);e('hint()');const first=w.document.querySelector('#hint').textContent;assert(first.includes('ヒント1：'));e('leave()');w.document.querySelector('#modal').close();assert.equal(w.document.querySelector('#hint').textContent,first);for(let i=0;i<10;i++)e('hint()');const all=w.document.querySelector('#hint').textContent,n=e('session.hint');assert(all.includes(first));assert(all.includes('この問題のヒントはすべて表示しました'));assert(n>=2&&n<=3);e('hint()');assert.equal(e('session.hint'),n);assert.equal(w.document.querySelector('#hint').textContent,all);e('submitAnswer(true)');assert.equal(w.document.querySelector('#hint').textContent,all);assert(!w.document.querySelector('#hint').closest('[hidden]'));assert.equal(e('session.results[0].hint'),n);e('next()');assert.equal(w.document.querySelector('#hint').textContent,'');assert.equal(e('session.hint'),0);
}
e("capitalStart({ids:['cap-jp-tokyo','cap-fr-paris'],input:'ink',practice:'practice',count:2})");await new Promise(r=>setTimeout(r,30));e('hint()');const before=w.document.querySelector('#hint').textContent;w.document.querySelector('#inkText').value='試し';w.document.querySelector('#inkKeyboard').click();assert.equal(w.document.querySelector('#answer').value,'試し');assert.equal(w.document.querySelector('#hint').textContent,before);assert.equal(e('session.hint'),1);e('hint()');assert(w.document.querySelector('#hint').textContent.includes(before));
e("capitalStart({practice:'test',count:1})");const n=e('session.hint');e('hint()');assert.equal(e('session.hint'),n);assert(!w.document.querySelector('button[onclick="hint()"]'));
// Exhaustive mode-aware hint safety/coverage using the actual prompt text for clue modes.
const coverage={};for(const [content,src] of [['capital','capitals.filter(q=>q.quizEligible)'],['terrain','terrain'],['heritage','heritage']]){
 coverage[content]={targets:e(src+'.length'),belowTwo:[],total:0};for(const q of e(src))for(const mode of e(`Object.keys(modesFor('${content}'))`)){
 const cfg={content,mode,input:'choice',practice:'practice',level:'advanced'};e('session.cfg='+JSON.stringify(cfg));const clue=mode.endsWith('Clue')?e(`safeClue(${JSON.stringify(q)},'${content}')`):'';w.document.querySelector('#app').innerHTML='<section class="answerPanel"><h2></h2><div class="clue"></div></section>';w.document.querySelector('.clue').textContent=clue;
 const hs=e('studyHints('+JSON.stringify(q)+','+JSON.stringify(cfg)+')');assert(!hs.some(t=>/読みの最初|から始ま|文字です|正解は/.test(t)));assert.equal(new Set(hs).size,hs.length);
 if(hs.length<2)coverage[content].belowTwo.push(q.id+':'+mode);coverage[content].total++;
 if(mode==='heritageCountry')for(const country of e('data.filter(c=>'+JSON.stringify(q.countries)+'.includes(c.id))'))assert(!hs.some(h=>h.includes(country.name)),q.id+': country leak');
 if(mode==='heritageType')assert(!hs.some(h=>/文化遺産|自然遺産|複合遺産/.test(h)));
 }
}
fs.writeFileSync('hint-coverage.json',JSON.stringify(coverage,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(Object.entries(coverage).map(([k,v])=>[k,{targets:v.targets,total:v.total,belowTwo:v.belowTwo.length}]))));
assert(e('validBackup(db,true)'));await e('save()');await e('resetPlayerView()');assert.equal(e('session'),null);console.log('PASS curriculum/hints: exact 6 country pools, scope override, all modes/distractors, stage allocation, region/map selection, old master notice, mixed three/six levels, persistent ordered hints/limits/answer/next/dialog/input/player, exhaustive hint mode safety');w.close();})().catch(err=>{console.error(err);process.exit(1)});
