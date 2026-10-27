import { VERSION, DEPARTMENTS, makeQuestions, legacyRankingRequest } from './ranking-legacy.mjs';
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const fail=(message,status=400)=>json({error:message},status);
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const pub=q=>q?{id:q.id,item:q.item,content:q.content,mode:q.mode,options:q.options,prompt:q.prompt}:null;
const publicProfile=p=>({id:p.id,name:p.name,icon:p.icon,revision:p.revision,mutation:p.mutation});
const nameOK=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=20&&!/[\x00-\x1f\x7f]|\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200D\uFE0F\u20E3]/u.test(s);
export async function rankingRequest(request,action,DB,bank,user){
 if(!DB)return fail('ランキングを利用できません。端末内の学習は続けられます。',503);
 if(!user)return fail('オンラインランキングはサイトへのログインが必要です。',401);
 const uid=String(user),url=new URL(request.url);if(uid.length>300)return fail('認証情報を確認できません',401);
 try{
  if(request.method==='GET'&&action==='legacy')return legacyRankingRequest(request,'leaderboard',DB,bank,user);
  let body={};
  if(request.method==='POST'){
   if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return fail('同じサイトから操作してください',403);
   if(!request.headers.get('Content-Type')?.includes('application/json'))return fail('JSONを送信してください',415);
   const raw=await request.text();if(raw.length>4096)return fail('送信内容が大きすぎます',413);
   try{body=JSON.parse(raw)}catch{return fail('送信内容を読み取れません')}
   if(!body||typeof body!=='object'||Array.isArray(body))return fail('送信内容を確認してください');
  }else if(request.method!=='GET')return fail('この操作は利用できません',405);
  const id=request.headers.get('X-WM-Player'),secret=request.headers.get('X-WM-Key');
  let profile=null;
  if(id||secret){
   if(!/^[a-f0-9-]{36}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(secret||''))return fail('プレイヤーの本人確認が必要です。',403);
   profile=await DB.prepare('SELECT * FROM ranking_players WHERE id=?').bind(id).first();
   if(profile&&(profile.owner_id!==uid||profile.secret_hash!==await digest(secret)))return fail('このプレイヤーの操作権限がありません。',403);
  }
  if(action==='profile'&&request.method==='POST'){
   if(!id||!secret)return fail('プレイヤーの本人確認が必要です。',403);
   if(!nameOK(body.name)||typeof body.icon!=='string'||!bank.icons?.includes(body.icon))return fail('名前は20文字以内・絵文字なしで入力し、アイコンを選んでください');
   if(!Number.isSafeInteger(body.revision)||body.revision<0||!/^[a-f0-9-]{36}$/.test(body.mutation||''))return fail('更新情報を確認してください');
   if(!profile){
    if(body.revision!==0)return fail('登録情報が一致しません。',409);
    await DB.prepare('INSERT INTO ranking_players(id,owner_id,secret_hash,name,icon,revision,mutation) VALUES(?,?,?,?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(id,uid,await digest(secret),body.name,body.icon,body.mutation).run();
   }else if(profile.mutation!==body.mutation){
    await DB.prepare('UPDATE ranking_players SET name=?,icon=?,revision=revision+1,mutation=? WHERE id=? AND owner_id=? AND revision=?').bind(body.name,body.icon,body.mutation,id,uid,body.revision).run();
   }
   profile=await DB.prepare('SELECT * FROM ranking_players WHERE id=?').bind(id).first();
   if(profile.owner_id!==uid||profile.secret_hash!==await digest(secret))return fail('このプレイヤーの操作権限がありません。',403);
   if(profile.mutation!==body.mutation)return json({error:'別の画面で名前が更新されました。再確認してください。',profile:publicProfile(profile)},409);
   return json({profile:publicProfile(profile)});
  }
  if(action==='leaderboard'&&request.method==='GET'){
   if(url.searchParams.has('version')&&url.searchParams.get('version')!==VERSION)return fail('旧記録は「旧ランキング」から確認してください。');
   const dept=url.searchParams.get('department')||'flags';if(!DEPARTMENTS[dept])return fail('部門がありません');
   const rows=await DB.prepare('SELECT s.*,p.name,p.icon FROM player_ranking_scores s JOIN ranking_players p ON p.id=s.player_id WHERE s.department=? AND s.version=? ORDER BY s.right_count DESC,s.at ASC,s.player_id ASC LIMIT 20').bind(dept,VERSION).all();
   const mine=profile?await DB.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=? AND version=?').bind(id,dept,VERSION).first():null;
   let own=null;if(mine){const n=await DB.prepare('SELECT COUNT(*) AS n FROM player_ranking_scores WHERE department=? AND version=? AND right_count>?').bind(dept,VERSION,mine.right_count).first();own={rank:n.n+1,right_count:mine.right_count,question_count:mine.question_count,at:mine.at,name:profile.name,icon:profile.icon}}
   let prior=null,rank=0;return json({department:DEPARTMENTS[dept],version:VERSION,own,rows:rows.results.map((r,i)=>{if(prior!==r.right_count)rank=i+1;prior=r.right_count;return{rank,nickname:r.name,icon:r.icon,right:r.right_count,count:r.question_count,at:r.at,mine:r.player_id===profile?.id}})});
  }
  if(!profile)return fail('プレイヤーを登録してから挑戦してください。',403);
  if(request.method!=='POST')return fail('この操作は利用できません',405);
  if(action==='start'){
   const dept=body.department,d=DEPARTMENTS[dept];if(!d)return fail('部門がありません');
   const active=await DB.prepare('SELECT COUNT(*) AS n FROM player_ranking_runs WHERE owner_id=? AND started>?').bind(uid,Date.now()-3600000).first();if(active.n>=30)return fail('開始回数の上限です。少し待って再挑戦してください。',429);
   const qs=makeQuestions(dept,bank),run=crypto.randomUUID();await DB.prepare('INSERT INTO player_ranking_runs(id,owner_id,player_id,department,version,questions,answers,position,right_count,started) VALUES(?,?,?,?,?,?,?,0,0,?)').bind(run,uid,id,dept,VERSION,JSON.stringify(qs),'[]',Date.now()).run();
   return json({run,department:d,version:VERSION,position:0,question:pub(qs[0]),player:id});
  }
  if(action==='answer'){
   if(typeof body.run!=='string'||body.run.length>80||!Number.isInteger(body.position))return fail('回答情報を確認してください');
   let r=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=? AND owner_id=? AND player_id=?').bind(body.run,uid,id).first();if(!r)return fail('この挑戦は見つかりません',404);
   if(r.version!==VERSION)return fail('新しく挑戦してください',409);
   const qs=JSON.parse(r.questions),answers=JSON.parse(r.answers),i=body.position;
   if(i<0||i>=qs.length||i>r.position)return fail('問題の順序が一致しません',409);
   if(i<r.position&&answers[i]?.choice!==body.choice)return fail('この問題は別の回答で確定済みです',409);
   if(i===r.position){
    if(Date.now()-r.started>3600000)return fail('この挑戦は1時間で終了しました。新しく始めてください',410);
    const q=qs[i];if(body.question!==q.id||(!(q.mode==='location'?q.allowed?.includes(body.choice):q.options.some(x=>x.id===body.choice))&&body.choice!=='skip'))return fail('選択肢が一致しません');
    answers.push({choice:body.choice,ok:body.choice===q.answer});
    await DB.prepare('UPDATE player_ranking_runs SET answers=?,position=?,right_count=?,finished=? WHERE id=? AND player_id=? AND position=?').bind(JSON.stringify(answers),i+1,r.right_count+(body.choice===q.answer?1:0),i+1===qs.length?Date.now():null,r.id,id,i).run();
    r=await DB.prepare('SELECT * FROM player_ranking_runs WHERE id=? AND owner_id=? AND player_id=?').bind(r.id,uid,id).first();
   }
   const a=JSON.parse(r.answers);if(a[i]?.choice!==body.choice)return fail('回答が先に確定されました',409);
   const done=r.position===qs.length;let outcome=null;
   if(done){
    // Outcome is computed by SQLite in the same statement that compares/replaces the best.
    await DB.prepare(`INSERT INTO player_ranking_scores(player_id,department,version,right_count,question_count,duration_ms,at,run_id,outcome) VALUES(?,?,?,?,?,?,?,?,'first') ON CONFLICT(player_id,department,version) DO UPDATE SET right_count=excluded.right_count,question_count=excluded.question_count,duration_ms=excluded.duration_ms,at=excluded.at,run_id=excluded.run_id,outcome='best' WHERE excluded.right_count>player_ranking_scores.right_count`).bind(id,r.department,VERSION,r.right_count,qs.length,r.finished-r.started,r.finished,r.id).run();
    const best=await DB.prepare('SELECT * FROM player_ranking_scores WHERE player_id=? AND department=? AND version=?').bind(id,r.department,VERSION).first();outcome=best.run_id===r.id?best.outcome:'unchanged';
   }
   return json({run:r.id,position:r.position,ok:a[i].ok,correct:qs[i].answer,right:r.right_count,count:qs.length,done,outcome,question:pub(qs[r.position])});
  }
  return fail('操作がありません',404);
 }catch{return fail('ランキングへ接続できませんでした。もう一度送信してください。',503)}
}
