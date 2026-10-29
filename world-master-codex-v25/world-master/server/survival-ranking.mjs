import '../public/survival-rules.js';
import schema from '../public/assets/learning-schema.json' with {type:'json'};
import release from '../public/release.json' with {type:'json'};
import { VERSION } from './ranking-legacy.mjs';

const rules=globalThis.WMSurvivalRules,version=VERSION+':'+rules.rule;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status=400)=>json({error},status);
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const b=new Uint32Array(1);crypto.getRandomValues(b);const j=b[0]%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a;};
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const pub=q=>q?{id:q.id,item:q.item,content:q.content,mode:q.mode,options:q.options,prompt:q.prompt,allowed:q.allowed}:null;

export async function survivalCatalog(raw,bank){
 const config=rules.normalize(raw,true),entries=rules.pool(config,bank,schema),condition=rules.condition(config,entries,VERSION,release.version);
 const key='survival:'+await digest(JSON.stringify(condition));
 return {config,entries,condition,key,total:entries.length,version};
}
function questions(catalog,bank){
 return shuffle(catalog.entries).map(({item:q,content,mode})=>{
  const src=bank[content].filter(x=>x.id!==q.id&&(content!=='capital'||x.quizEligible&&x.country!==q.country)&&(content!=='terrain'||x.category===q.category)&&(content!=='country'||rules.countryAt(x,catalog.config.content==='mixed'?catalog.config.countryLevel:catalog.config.level,schema)));
  const options=mode==='location'?[]:shuffle([q,...shuffle(src).slice(0,3)]).map(x=>({id:x.id,label:x.name}));
  if(mode!=='location'&&options.length!==4)throw Error('選択肢が不足しています。');
  return {id:crypto.randomUUID(),item:q.id,content,mode,answer:q.id,options,allowed:mode==='location'?catalog.entries.filter(e=>e.content==='country').map(e=>e.item.id):undefined,
   prompt:content==='capital'?`${bank.country.find(c=>c.id===q.country)?.name}の${q.promptQualifier}は？`:mode==='location'?`${q.name}は、どこ？`:mode==='flag'?'この旗の国は？':content==='terrain'?'示された地形の名前は？':'地図の世界遺産の名前は？'};
 });
}
function state(row,snapshot){
 const answers=JSON.parse(row.answers),last=answers.at(-1),ended=!!row.finished;
 const reason=ended?(last?.aborted?'aborted':last?.ok===false?'wrong':'complete'):null;
 const lastQuestion=last&&!last.aborted?snapshot.queue[answers.length-1]:null;
 return {run:row.id,condition:snapshot.condition,key:row.department,total:snapshot.queue.length,position:row.position,right:row.right_count,done:ended,reason,at:row.finished||null,
  question:ended?null:pub(snapshot.queue[row.position]),feedback:lastQuestion?{ok:last.ok,correct:lastQuestion.answer,question:pub(lastQuestion)}:null};
}
async function finishScore(DB,row,snapshot){
 if(!row.finished||JSON.parse(row.answers).at(-1)?.aborted)return null;
 const n=snapshot.queue.length;
 await DB.prepare("INSERT INTO player_ranking_scores(player_id,department,version,right_count,question_count,duration_ms,at,run_id,outcome) VALUES(?,?,?,?,?,?,?,?,'first') ON CONFLICT(player_id,department,version) DO UPDATE SET right_count=excluded.right_count,question_count=excluded.question_count,duration_ms=excluded.duration_ms,at=excluded.at,run_id=excluded.run_id,outcome='best' WHERE excluded.right_count>player_ranking_scores.right_count").bind(row.player_id,row.department,row.version,row.right_count,n,row.finished-row.started,row.finished,row.id).run();
 const best=await DB.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=? AND version=?').bind(row.player_id,row.department,row.version).first();
 return best.run_id===row.id?best.outcome:'unchanged';
}
export async function survivalRequest(request,action,DB,bank,uid,profile,body){
 const url=new URL(request.url);
 if(['survival-catalog','survival-leaderboard'].includes(action)&&request.method==='GET'){
  let raw;try{const text=url.searchParams.get('config')||'{}';if(text.length>2048)throw Error();raw=JSON.parse(text);}catch{return fail('出題条件を読み取れません。');}
  let c;try{c=await survivalCatalog(raw,bank);}catch(e){return fail(e.message);}
  if(action==='survival-catalog')return json({config:c.config,condition:c.condition,key:c.key,total:c.total,version:c.version});
  // A resumed old-material challenge keeps its own board, never merges into a
  // newer target pool. Resolve the public condition from a server snapshot.
  const boardKey=url.searchParams.get('boardKey');
  if(boardKey&&boardKey!==c.key){
   if(!/^survival:[a-f0-9]{64}$/.test(boardKey))return fail('ランキング条件が不正です。');
   const saved=await DB.prepare('SELECT questions FROM player_ranking_runs WHERE department=? AND version=? LIMIT 1').bind(boardKey,version).first();
   if(!saved)return fail('この条件のランキングは見つかりません。',404);
   const snapshot=JSON.parse(saved.questions);c={...c,key:boardKey,condition:snapshot.condition,total:snapshot.queue.length};
  }
  const rows=await DB.prepare('SELECT s.*,p.name,p.icon FROM player_ranking_scores s JOIN ranking_players p ON p.id=s.player_id WHERE s.department=? AND s.version=? ORDER BY s.right_count DESC,s.at ASC,s.player_id ASC LIMIT 20').bind(c.key,version).all();
  const mine=profile?await DB.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=? AND version=?').bind(profile.id,c.key,version).first():null;
  let own=null;if(mine){const n=await DB.prepare('SELECT COUNT(*) AS n FROM player_ranking_scores WHERE department=? AND version=? AND right_count>?').bind(c.key,version,mine.right_count).first();own={rank:n.n+1,right:mine.right_count,total:mine.question_count,at:mine.at,complete:mine.right_count===mine.question_count};}
  let previous=null,rank=0;return json({key:c.key,total:c.total,condition:c.condition,own,rows:rows.results.map((r,i)=>{if(r.right_count!==previous)rank=i+1;previous=r.right_count;return {rank,name:r.name,icon:r.icon,right:r.right_count,total:r.question_count,at:r.at,complete:r.right_count===r.question_count,mine:r.player_id===profile?.id};})});
 }
 if(!profile)return fail('本人のプレイヤーで入ってください。ゲストは閲覧のみです。',403);
 if(action==='survival-start'&&request.method==='POST'){
  if(body.requestId!==undefined&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.requestId))return fail('開始情報が不正です。');
  if(body.requestId){
   const existing=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=?').bind(body.requestId).first();
   if(existing){
    if(existing.owner_id!==uid||existing.player_id!==profile.id||existing.department!==body.key||existing.version!==version)return fail('この開始操作を利用できません。',403);
    const snapshot=JSON.parse(existing.questions);return json({...state(existing,snapshot),outcome:await finishScore(DB,existing,snapshot)});
   }
  }
  let c;try{c=await survivalCatalog(body.config,bank);}catch(e){return fail(e.message);}
  if(body.key!==c.key)return fail('教材または出題条件が変わりました。開始画面を開き直してください。',409);
  if(!c.total)return fail('この条件には出題可能な問題がありません。');
  const count=await DB.prepare('SELECT COUNT(*) AS n FROM player_ranking_runs WHERE owner_id=? AND started>?').bind(uid,Date.now()-3600000).first();if(count.n>=30)return fail('開始回数の上限です。少し待って再挑戦してください。',429);
  // Snapshot all questions on the server; send only the current question.
  const snapshot={condition:c.condition,queue:questions(c,bank)},id=body.requestId||crypto.randomUUID(),now=Date.now();
  await DB.prepare('INSERT INTO player_ranking_runs(id,owner_id,player_id,department,version,questions,answers,position,right_count,started) VALUES(?,?,?,?,?,?,?,0,0,?) ON CONFLICT(id) DO NOTHING').bind(id,uid,profile.id,c.key,version,JSON.stringify(snapshot),'[]',now).run();
  const stored=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=?').bind(id).first();
  if(stored.owner_id!==uid||stored.player_id!==profile.id||stored.department!==c.key||stored.version!==version)return fail('この開始操作を利用できません。',403);
  return json({...state(stored,JSON.parse(stored.questions)),outcome:await finishScore(DB,stored,JSON.parse(stored.questions))});
 }
 if(!['survival-answer','survival-resume','survival-abort'].includes(action)||request.method!=='POST')return fail('この操作は利用できません。',405);
 if(typeof body.run!=='string'||body.run.length>80)return fail('挑戦情報が不正です。');
 let row=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=? AND owner_id=? AND player_id=?').bind(body.run,uid,profile.id).first();
 if(!row||row.version!==version||!row.department.startsWith('survival:'))return fail('この挑戦は見つかりません。',404);
 const snapshot=JSON.parse(row.questions);
 // Deliberately no elapsed-time expiry: old official challenges keep their 1h limit.
 if(action==='survival-answer'){
  const i=body.position,answers=JSON.parse(row.answers),q=snapshot.queue[i];
  if(!Number.isInteger(i)||i<0||i>row.position||!q||body.question!==q.id)return fail('問題の順序が一致しません。',409);
  if(i<row.position){if(answers[i]?.choice!==body.choice)return fail('この問題は別の回答で確定済みです。',409);}
  else{
   if(row.finished)return fail('この挑戦は終了しています。',409);
   if(body.choice!=='skip'&&!(q.mode==='location'?q.allowed.includes(body.choice):q.options.some(o=>o.id===body.choice)))return fail('回答が選択肢と一致しません。');
   const ok=body.choice===q.answer;answers.push({choice:body.choice,ok});
   await DB.prepare('UPDATE player_ranking_runs SET answers=?,position=?,right_count=?,finished=? WHERE id=? AND owner_id=? AND player_id=? AND position=? AND finished IS NULL').bind(JSON.stringify(answers),i+1,row.right_count+(ok?1:0),!ok||i+1===snapshot.queue.length?Date.now():null,row.id,uid,profile.id,i).run();
   row=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=? AND owner_id=? AND player_id=?').bind(row.id,uid,profile.id).first();
   if(JSON.parse(row.answers)[i]?.choice!==body.choice)return fail('回答が先に確定されました。',409);
  }
 }else if(action==='survival-abort'&&!row.finished){
  const answers=JSON.parse(row.answers);answers.push({aborted:true});
  await DB.prepare('UPDATE player_ranking_runs SET answers=?,finished=? WHERE id=? AND owner_id=? AND player_id=? AND position=? AND finished IS NULL').bind(JSON.stringify(answers),Date.now(),row.id,uid,profile.id,row.position).run();
  row=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=? AND owner_id=? AND player_id=?').bind(row.id,uid,profile.id).first();
  if(!row.finished)return fail('回答が先に確定されました。中断を再試行してください。',409);
 }
 return json({...state(row,snapshot),outcome:await finishScore(DB,row,snapshot)});
}
