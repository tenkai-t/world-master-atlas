import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { rankingGateway } from './server/ranking-gateway.mjs';
import { survivalCatalog } from './server/survival-ranking.mjs';
const require=createRequire(import.meta.url),{fixture,launch,login}=require('./tests-security.cjs');
const bank=Object.fromEntries([['country','data'],['capital','capitals'],['terrain','terrain'],['heritage','heritage'],['icons','player-icons']].map(([key,name])=>[key,JSON.parse(fs.readFileSync('public/assets/'+name+'.json'))]));
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const DB={prepare(query){return{bind(...args){return{async first(){return sql.prepare(query).get(...args)||null;},async all(){return{results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};}};}};
const runtime={DB,WM_AUTH_MODE:'player-key'},origin='https://test.local';
const a={id:crypto.randomUUID(),secret:'a'.repeat(64)},b={id:crypto.randomUUID(),secret:'b'.repeat(64)};
async function api(action,body,who=a,extra={},customBank=bank){const request=new Request(origin+'/api/rank/'+action,{method:body?'POST':'GET',headers:{...(who?{'X-WM-Player':who.id,'X-WM-Key':who.secret}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});const response=await rankingGateway(request,action.split('?')[0],runtime,customBank);return{status:response.status,j:await response.json()};}
for(const who of [a,b])assert.equal((await api('profile',{name:'人工旅人',icon:'🌱',revision:0,mutation:crypto.randomUUID()},who)).status,200);
const c={content:'country',mode:'flag',level:'c1',region:'世界全体',input:'choice'};
const catalog=(await api('survival-catalog?config='+encodeURIComponent(JSON.stringify(c)),null,null)).j;
assert.equal(catalog.total,15);assert.equal(new Set(catalog.condition.targets).size,catalog.total);
async function start(config=c,who=a,customBank=bank){const cat=await survivalCatalog(config,customBank);return api('survival-start',{config,key:cat.key,score:999999},who,{},customBank);}
const catalogMixed=await survivalCatalog({content:'mixed',mode:'mixed',level:'advanced',countryLevel:'countryMaster'},bank);
assert.equal(catalogMixed.total,new Set(catalogMixed.condition.targets.map(x=>x.split(':').slice(0,-1).join(':'))).size);
assert.equal((await api('survival-start',{config:c,key:catalog.key},null)).status,403);
assert.equal((await api('survival-start',{config:c,key:catalog.key},{...a,secret:b.secret})).status,403);
assert.equal((await api('survival-start',{config:c,key:catalog.key},a,{Origin:'https://foreign.local'})).status,403);
assert.equal((await api('survival-start',{config:c,key:'stale'})).status,409);
assert.equal((await api('survival-start',{config:{...c,input:'text'},key:catalog.key})).status,400);
assert.equal((await api('survival-start',{config:{...c,region:'ない地域'},key:catalog.key})).status,400);
assert.equal((await start({...c,region:'オセアニア'})).status,200);
const zeroBank={...bank,country:[]};assert.equal((await start(c,a,zeroBank)).status,400);
const oneBank={...bank,country:bank.country.filter(q=>q.id==='JP')};
const oneConfig={...c,mode:'location'};
const one=await start(oneConfig,a,oneBank);assert.equal(one.status,200);assert.equal(one.j.total,1);
let oneDone=await api('survival-answer',{run:one.j.run,position:0,question:one.j.question.id,choice:'JP'},a,{},oneBank);assert.equal(oneDone.j.reason,'complete');assert.equal(oneDone.j.right,1);
const first=await start();assert.equal(first.status,200);assert(!JSON.stringify(first.j).includes('"answer":'));assert(!first.j.queue);
const body={run:first.j.run,position:0,question:first.j.question.id,choice:'skip',score:999999};
assert.equal((await api('answer',body)).status,409,'Old official endpoint cannot grade a survival run');
assert.equal((await api('survival-answer',body,b)).status,404);
assert.equal((await api('survival-answer',{...body,position:2})).status,409);
const wrong=await api('survival-answer',body);assert.equal(wrong.j.reason,'wrong');assert.equal(wrong.j.right,0);assert.equal(wrong.j.position,1);assert(wrong.j.feedback.correct);assert.equal(wrong.j.question,null);
assert.equal((await api('survival-answer',body)).j.outcome,'first');
assert.equal((await api('survival-answer',{...body,choice:wrong.j.feedback.correct})).status,409);
assert.equal((await api('survival-resume',{run:body.run})).j.reason,'wrong');
const requestId=crypto.randomUUID(),request={config:c,key:catalog.key,requestId};const beforeStarts=sql.prepare('SELECT COUNT(*) AS n FROM player_ranking_runs').get().n;const starts=await Promise.all([api('survival-start',request),api('survival-start',request)]);assert(starts.every(r=>r.status===200));assert.equal(starts[0].j.question.id,starts[1].j.question.id);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM player_ranking_runs').get().n,beforeStarts+1);assert.equal((await api('survival-start',request,b)).status,403);
const failedAfter=await start();let snap=JSON.parse(sql.prepare('SELECT questions FROM player_ranking_runs WHERE id=?').get(failedAfter.j.run).questions);
let state=failedAfter.j;for(let i=0;i<3;i++){const q=snap.queue[i];const r=await api('survival-answer',{run:state.run,position:i,question:q.id,choice:q.answer});assert.equal(r.status,200);state=r.j;}
const afterWrong=await api('survival-answer',{run:state.run,position:3,question:snap.queue[3].id,choice:'skip'});assert.equal(afterWrong.j.right,3);assert.equal(afterWrong.j.reason,'wrong');
const scoreBefore=sql.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=?').get(a.id,catalog.key);
const aborted=await start();assert.equal((await api('survival-abort',{run:aborted.j.run})).j.reason,'aborted');assert.equal((await api('survival-answer',{run:aborted.j.run,position:0,question:aborted.j.question.id,choice:'skip'})).status,409);assert.deepEqual(sql.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=?').get(a.id,catalog.key),scoreBefore);
const completed=await start();snap=JSON.parse(sql.prepare('SELECT questions FROM player_ranking_runs WHERE id=?').get(completed.j.run).questions);assert.equal(new Set(snap.queue.map(q=>q.content+':'+q.item+':'+q.mode)).size,snap.queue.length);
// No hidden one-hour expiry on the new mode.
sql.prepare('UPDATE player_ranking_runs SET started=? WHERE id=?').run(Date.now()-10*86400000,completed.j.run);
for(let i=0;i<snap.queue.length;i++){const q=snap.queue[i],answer={run:completed.j.run,position:i,question:q.id,choice:q.answer};const rs=await Promise.all([api('survival-answer',answer),api('survival-answer',answer)]);assert(rs.every(r=>r.status===200));state=rs[0].j;assert.equal(state.right,i+1);}
assert.equal(state.reason,'complete');assert.equal(state.right,catalog.total);
assert.equal((await api('survival-resume',{run:completed.j.run},b)).status,404);
assert.equal((await api('survival-resume',{run:completed.j.run})).j.right,catalog.total);
const best=sql.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=?').get(a.id,catalog.key);
const worse=await start();await api('survival-answer',{run:worse.j.run,position:0,question:worse.j.question.id,choice:'skip'});assert.deepEqual(sql.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=?').get(a.id,catalog.key),best);
const board=(await api('survival-leaderboard?config='+encodeURIComponent(JSON.stringify(c)),null,null)).j;assert(board.rows[0].complete);assert.equal(board.own,null);assert.equal((await api('leaderboard?department=flags')).j.rows.length,0);assert.equal((await api('survival-leaderboard?config='+encodeURIComponent(JSON.stringify({...c,region:'アジア'})))).j.rows.length,0);assert.equal((await api('survival-leaderboard?boardKey='+catalog.key+'&config='+encodeURIComponent(JSON.stringify({...c,region:'アジア'})))).j.key,catalog.key);
for(const value of [a.id,a.secret,'secret_hash','owner_id'])assert(!JSON.stringify(board).includes(value));
// Same score ties, outside top20 own rank, and earliest best timestamp preserved.
for(let i=0;i<22;i++){const id=crypto.randomUUID();sql.prepare('INSERT INTO ranking_players VALUES(?,?,?,?,?,?,?)').run(id,'fixture','fixture','テスト'+i,'🌱',1,crypto.randomUUID());sql.prepare('INSERT INTO player_ranking_scores VALUES(?,?,?,?,?,?,?,?,?)').run(id,catalog.key,catalog.version,catalog.total,catalog.total,999,i,crypto.randomUUID(),'first');}
let ranked=(await api('survival-leaderboard?config='+encodeURIComponent(JSON.stringify(c)))).j;assert.equal(ranked.rows.length,20);assert(ranked.rows.every(r=>r.rank===1));assert.equal(ranked.own.rank,1);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM ranking_scores').get().n,0);
console.log('PASS survival server: zero/one/all targets, no duplicates, 0/right-before-wrong/full completion, indefinite resume, abort exclusion, concurrency/idempotence, forged scores/keys/CSRF/order/endpoint isolation, ties/top20/own and durable best.');

const localId='local-survival',otherId='other-local';
const store=new Map([['world-master:players:v1',JSON.stringify({version:1,players:[{id:localId,name:'旅人',icon:'🌱'},{id:otherId,name:'別の旅人',icon:'🌱'}],last:localId})],['world-master:security:v1',JSON.stringify({schema:1,players:{[localId]:fixture('1234'),[otherId]:fixture('2345')},admin:fixture('654321'),minutes:5})],...[localId,otherId].map(id=>['world-master:player:v1:'+id,JSON.stringify({schema:1,revision:crypto.randomUUID(),data:{version:1,records:{},history:[]}})])]);
let disconnect=false;
const transport=async(path,opts)=>{if(path.startsWith('/api/')){const request=new Request(origin+path,opts);if(request.method==='POST')request.headers.set('Origin',origin);const response=await rankingGateway(request,path.split('/').pop().split('?')[0],runtime,bank);if(disconnect&&path==='/api/rank/survival-answer'){disconnect=false;throw Error('response lost after server commit');}return response;}return{ok:true,json:async()=>JSON.parse(fs.readFileSync('public/'+path))};};
const x=await launch(store,{fetch:transport});
try{
 await login(x,localId);assert(x.$('button[onclick="survivalSetup()"]'));x.e('mixedSetup()');assert(!x.$('#practice option[value=survival]'));x.e("setup('flag',true)");assert(!x.$('#practice option[value=survival]'));x.e("setup('flag')");assert(x.$('#practice option[value=survival]'));x.e('home()');
 assert.equal(x.e('testTotals().n'),0);assert(x.e('survivalStart('+JSON.stringify(c)+')'));assert.equal(x.e('session.queue.length'),15);assert.equal(x.e('session.cfg.challenge'),'survival');
 assert(!x.$('button[onclick="hint()"]'));x.e('hint()');assert.equal(x.e('session.hint'),0);
 x.e('submitAnswer(true)');assert(x.$('#feedback').textContent.includes('ここで覚えよう'));assert(x.$('#svProgress').textContent.includes('連続正解 0'));
 x.e('next()');await x.e('playerQueue');await new Promise(r=>setTimeout(r,10));assert(x.$('h1').textContent.includes('不正解'));assert.equal(x.e('testTotals().n'),0);assert.equal(x.e('Object.keys(db.survival.bests).length'),1);assert.equal(x.e('db.history.length'),0);
 x.e('survivalStart('+JSON.stringify(c)+')');for(let i=0;i<3;i++){x.e('submitAnswer(false,session.queue[session.i].id)');x.e('next()');}x.e('submitAnswer(true)');x.e('next()');await x.e('playerQueue');await new Promise(r=>setTimeout(r,10));assert.equal(x.e('Object.values(db.survival.bests)[0].right'),3);
 x.e('survivalStart('+JSON.stringify(c)+')');x.e('leave()');x.$('#svAbortLocal').click();await x.e('playerQueue');await new Promise(r=>setTimeout(r,10));assert.equal(x.e('Object.values(db.survival.bests)[0].right'),3);assert(x.$('h1').textContent.includes('中断'));
 // One local target and a complete run.
 x.e("globalThis.savedSurvivalData=data;data=data.filter(q=>q.id==='JP')");x.e('survivalStart('+JSON.stringify({...c,mode:'location'})+')');x.e("session.selected='JP';submitAnswer()");x.e('next()');await x.e('playerQueue');await new Promise(r=>setTimeout(r,10));assert(x.$('h1').textContent.includes('全問制覇'));x.e('data=globalThis.savedSurvivalData');
 x.e('db.survival.history=[]');await x.e('save()');assert(x.e('Object.values(db.survival.bests).some(h=>h.right===3)'));assert(x.e('validBackup(db,true)'));
 const reload=await launch(store,{fetch:transport});await login(reload,localId);assert(reload.e('Object.values(db.survival.bests).some(h=>h.right===3)'));reload.close();
 x.e('navigator.onLine=true');await x.e('survivalStartOnline('+JSON.stringify(c)+')');assert.equal(x.e('view'),'official');disconnect=true;await x.e("survivalAnswerOnline('skip')");assert(x.$('#svRetryOnline'));await x.e("survivalAnswerOnline('skip')");assert(x.$('#svOnlineNext'));assert.equal(x.e('survivalOnline.right'),0);assert.equal(x.e('survivalOnline.reason'),'wrong');
 await x.e('survivalResume()');assert.equal(x.e('survivalOnline.reason'),'wrong');await x.e('survivalFinishOnline()');assert.equal(x.e('testTotals().n'),0);
 await x.e('survivalStartOnline('+JSON.stringify(c)+')');const run=x.e('survivalOnline.run');await x.e('finishPlayerSwitch()');await login(x,otherId,'2345');await x.e('survivalResume()');assert.equal(x.e('survivalOnline'),null);await x.e('finishPlayerSwitch()');await login(x,localId);await x.e('survivalResume()');assert.equal(x.e('survivalOnline.run'),run);
 await x.e('survivalAbortOnline()');assert(x.$('h1').textContent.includes('中断'));
 await x.e('finishPlayerSwitch()');const persisted=JSON.stringify([...store]);await x.e('startGuest()');x.e('survivalStart('+JSON.stringify(c)+')');x.e('submitAnswer(true)');x.e('next()');await new Promise(r=>setTimeout(r,10));assert.equal(JSON.stringify([...store]),persisted);await assert.rejects(()=>x.e('survivalStartOnline('+JSON.stringify(c)+')'));
 await x.e('finishPlayerSwitch()');await login(x,localId);x.e('survivalStart('+JSON.stringify(c)+')');x.e('submitAnswer(false,session.queue[0].id)');await x.e('playerQueue');const interrupted=await launch(store,{fetch:transport});await login(interrupted,localId);assert.equal(interrupted.e('db.survival.history[0].reason'),'aborted');assert.equal(interrupted.e('db.survival.history[0].right'),1);assert.equal(interrupted.e('db.survival.active'),undefined);interrupted.close();
 console.log('PASS survival frontend: real script order, local 0/partial/full/abort, existing learning records but no ordinary-test totals, hints disabled, durable best/reload/backups, lost-response retry, terminal resume, player isolation, guest nonpersistence/online denial.');
}finally{x.close();sql.close();}
