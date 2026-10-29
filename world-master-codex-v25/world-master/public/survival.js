'use strict';
// Additional mode: existing grading, learning records and shared-device guards
// remain the source of truth for local answers. Online answers use the Worker.
let survivalLastConfig=null,survivalOnline=null,survivalVisit=0;
const SURVIVAL_SESSION='world-master:survival:v1';
const survivalBank=()=>({country:data,capital:capitals,terrain,heritage});
const survivalLabel={country:'国・国旗',capital:'首都',terrain:'地形',heritage:'世界遺産',mixed:'総合'};
function survivalDescription(c){return [survivalLabel[c.content],allLabels()[c.mode]||'分野ごとの名前問題',LEVELS[c.level]||c.level,c.content==='mixed'?COUNTRY_LEVELS[c.countryLevel]:'',c.region,inputLabel(c.mode,c.input),c.category!=='all'?terrainCategoryLabel(c.category):'',c.kind!=='all'?heritageKinds[c.kind]:''].filter(Boolean).join(' / ');}
function survivalEntries(c){return WMSurvivalRules.pool(c,survivalBank(),learningSchema).filter(e=>e.mode!=='heritagePhoto'||offlineHasPhoto(e.item));}
function survivalData(){if(!db.survival)db.survival={version:1,bests:{},history:[]};return db.survival;}
function survivalRecord(h){
 const d=survivalData();if(d.history.some(x=>x.id===h.id)||Object.values(d.bests).some(x=>x.id===h.id))return;
 d.history.unshift(h);d.history=d.history.slice(0,300);
 if(h.reason!=='aborted'){const old=d.bests[h.key];if(!old||h.right>old.right)d.bests[h.key]={...h};}
}
const survivalOriginalBackup=validBackup;
validBackup=(x,known=true)=>{
 if(!survivalOriginalBackup(x,known))return false;if(x.survival===undefined)return true;
 const s=x.survival,safe=h=>h&&typeof h.id==='string'&&typeof h.key==='string'&&typeof h.condition==='object'&&h.condition!==null&&Number.isSafeInteger(h.at)&&h.at>=0&&Number.isSafeInteger(h.total)&&h.total>0&&Number.isSafeInteger(h.right)&&h.right>=0&&h.right<=h.total&&['wrong','complete','aborted'].includes(h.reason)&&['local','online'].includes(h.source)&&h.condition.rule===WMSurvivalRules.rule&&h.condition.config&&typeof h.condition.material==='string';
 return !!s&&s.version===1&&s.bests&&typeof s.bests==='object'&&!Array.isArray(s.bests)&&Array.isArray(s.history)&&s.history.every(safe)&&(s.active===undefined||safe(s.active)&&s.active.source==='local')&&Object.values(s.bests).every(h=>safe(h)&&h.reason!=='aborted');
};
function survivalRefs(){const x=JSON.parse(sessionStorage.getItem(SURVIVAL_SESSION)||'{}');if(!x||typeof x!=='object'||Array.isArray(x))throw Error('中断情報を読み取れません。');return x;}
function survivalWriteRef(id,value){const refs=survivalRefs();if(value)refs[id]=value;else delete refs[id];sessionStorage.setItem(SURVIVAL_SESSION,JSON.stringify(refs));}
function survivalNotice(error){showModal('<h2>挑戦を開始できませんでした</h2><p>'+esc(error.message||String(error))+'</p>');}
function survivalSetup(initial=survivalLastConfig||{content:'country',mode:'flag',level:'c1',region:'世界全体',input:'choice'}){
 if(!activePlayer||!playerAccess())return;
 view='survival-setup';survivalVisit++;const visit=survivalVisit;
 app.innerHTML=`<div class="setup"><button class="back" onclick="home()">← ホーム</button><span class="eyebrow">UNTIL THE FIRST MISTAKE</span><h1>間違えるまでチャレンジ</h1><p class="notice">正解する限り続きます。不正解・「わからない」で終了。全問正解なら全問制覇！時間制限・ヒントなし。同じ問題は一度だけ。途中終了はランキング対象外です。</p><form id="survivalSetup" class="card"><div class="fields"><div><label for="svContent">分野</label><select id="svContent">${WMSurvivalRules.contents.map(k=>`<option value="${k}">${survivalLabel[k]}</option>`).join('')}</select></div><div><label for="svOnline">遊ぶ場所</label><select id="svOnline"><option value="local">この端末（オフライン可）</option><option value="online" ${isGuest()?'disabled':''}>オンライン・サーバー採点</option></select></div><div><label for="svMode">学び方</label><select id="svMode"></select></div><div><label for="svLevel">難易度</label><select id="svLevel"></select></div><div><label for="svCountryLevel">総合の国・国旗レベル</label><select id="svCountryLevel">${Object.entries(COUNTRY_LEVELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div><label for="svRegion">地域</label><select id="svRegion">${WMSurvivalRules.regions.map(k=>`<option>${k}</option>`).join('')}</select></div><div><label for="svInput">回答方法</label><select id="svInput"><option value="choice">4択</option><option value="text">キーボード入力</option><option value="ink">手書き</option></select></div><div><label for="svCategory">地形の種類</label><select id="svCategory"><option value="all">すべて</option>${Object.entries(terrainCategories).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div><label for="svKind">遺産の種類</label><select id="svKind"><option value="all">すべて</option>${Object.entries(heritageKinds).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div></div><p id="svPoolInfo" role="status"></p><p class="note">オンライン対応：国旗4択・国の位置・首都4択・地形4択・世界遺産地図4択、およびこれらの名前問題を組み合わせた総合。オンラインは通信が必要です。</p><button id="svBegin" class="primary">チャレンジを開始</button><button type="button" id="svRankings">専用ランキング</button><p id="svMessage" role="status"></p></form><div id="svResumeArea"></div></div>`;
 $('#svContent').value=initial.content;$('#svOnline').value='local';$('#svRegion').value=initial.region||'世界全体';$('#svInput').value=initial.input||'choice';$('#svCountryLevel').value=initial.countryLevel||'c3';$('#svCategory').value=initial.category||'all';$('#svKind').value=initial.kind||'all';
 let lastContent='',lastOnline='',sequence=0;
 const config=()=>WMSurvivalRules.normalize({content:$('#svContent').value,mode:$('#svMode').value,level:$('#svLevel').value,countryLevel:$('#svCountryLevel').value,region:$('#svRegion').value,input:$('#svInput').value,category:$('#svCategory').value,kind:$('#svKind').value},$('#svOnline').value==='online');
 const update=async()=>{
  const content=$('#svContent').value,online=$('#svOnline').value==='online',seq=++sequence;
  if(content!==lastContent||String(online)!==lastOnline){const oldMode=lastContent?$('#svMode').value:initial.mode,oldLevel=lastContent?$('#svLevel').value:initial.level;$('#svMode').innerHTML=(online?WMSurvivalRules.onlineModes:WMSurvivalRules.modes)[content].map(k=>`<option value="${k}">${allLabels()[k]||'分野ごとの名前問題'}</option>`).join('');if([...$('#svMode').options].some(o=>o.value===oldMode))$('#svMode').value=oldMode;$('#svLevel').innerHTML=Object.entries(content==='country'?COUNTRY_LEVELS:THREE_LEVELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');if([...$('#svLevel').options].some(o=>o.value===oldLevel))$('#svLevel').value=oldLevel;lastContent=content;lastOnline=String(online);}
  $('#svCountryLevel').parentElement.hidden=content!=='mixed';$('#svCategory').parentElement.hidden=content!=='terrain';$('#svKind').parentElement.hidden=content!=='heritage';
  $('#svInput').disabled=online||WMSurvivalRules.fixed($('#svMode').value);if($('#svInput').disabled)$('#svInput').value='choice';
  const c=config();survivalLastConfig=c;let total=survivalEntries(c).length;$('#svBegin').disabled=true;
  $('#svPoolInfo').textContent=`対象 ${total}問（全問出題・重複なし）`;$('#svMessage').textContent='';
  if(online){try{const catalog=await survivalAPI('survival-catalog?config='+encodeURIComponent(JSON.stringify(c)),null,false);if(visit!==survivalVisit||seq!==sequence||!$('#svBegin'))return;if(catalog.condition.material!==WM_RELEASE.version)throw Error('教材が更新されています。アプリの更新を確認してください。');total=catalog.total;$('#svPoolInfo').textContent=`オンラインの対象 ${total}問（全問出題・重複なし）`;}catch(e){if(visit===survivalVisit&&seq===sequence&&$('#svMessage'))$('#svMessage').textContent=e.message;return;}}
  if(visit===survivalVisit&&seq===sequence&&$('#svBegin'))$('#svBegin').disabled=!total||online&&(isGuest()||navigator.onLine===false);
 };
 $('#survivalSetup').onchange=()=>void update();$('#survivalSetup').onsubmit=async e=>{e.preventDefault();const c=config();$('#svBegin').disabled=true;try{if($('#svOnline').value==='online')await survivalStartOnline(c);else survivalStart(c);}catch(err){if($('#svMessage'))$('#svMessage').textContent=err.message;else survivalNotice(err);if($('#svBegin'))$('#svBegin').disabled=false;}};
 $('#svRankings').onclick=()=>survivalRankings('device',config());
 try{if(survivalRefs()[activePlayer.id])$('#svResumeArea').innerHTML='<button id="svResume" class="primary">中断中のオンライン挑戦を確認・再開</button>';if($('#svResume'))$('#svResume').onclick=()=>void survivalResume();}catch(e){$('#svResumeArea').textContent=e.message;}
 void update();
}
function survivalStart(raw){
 if(!activePlayer||!playerCanAnswer())return false;
 const c=WMSurvivalRules.normalize(raw),entries=survivalEntries(c);
 if(!entries.length){if($('#svMessage'))$('#svMessage').textContent='この条件には問題がありません。';return false;}
 const condition=WMSurvivalRules.condition(c,entries,DATA_VERSION,WM_RELEASE.version),cfg={...c,practice:'test',challenge:'survival',count:entries.length};
 const queue=shuffle(entries).map(e=>({...e.item,task:{...cfg,content:e.content,mode:e.mode,level:e.level}}));
 survivalLastConfig=c;session={localPlayerId:activePlayer.id,cfg:{...cfg},initialCfg:{...cfg},mixed:c.content==='mixed',challengeOptions:{...cfg},queue,i:0,results:[],began:Date.now(),done:false,hint:0,survival:{id:crypto.randomUUID(),condition,config:c,owner:activePlayer.id}};
 survivalData().active=survivalLocalHistory(session,'aborted');void save();question();return true;
}
function survivalLocalProgress(){const s=session;if(!s?.survival)return;let p=$('#svProgress');if(!p){p=document.createElement('p');p.id='svProgress';p.className='notice';p.setAttribute('aria-live','polite');app.prepend(p);}p.textContent=`連続正解 ${s.results.filter(r=>r.ok).length}問 ／ 回答済み ${s.results.length} / 対象 ${s.queue.length}問`;
 $('#inkKeyboard')?.remove();app.querySelectorAll('button[onclick="hint()"],button[onclick="readingHint()"],button[onclick="terrainHint()"],button[onclick="heritageHint()"]').forEach(b=>b.remove());
 const b=$('#feedback button[onclick="next()"]');if(b&&s.done&&(!s.results.at(-1)?.ok||s.results.length===s.queue.length))b.textContent='結果を見る →';
}
const survivalOriginalQuestion=question;question=(...args)=>{if(session?.survival&&session.inputChanged)throw Error('回答方法は固定です。新しい条件で開始してください。');const r=survivalOriginalQuestion(...args);survivalLocalProgress();return r;};
const survivalOriginalAnswer=submitAnswer;submitAnswer=(...args)=>{const s=session,n=s?.results.length;const r=survivalOriginalAnswer(...args);if(s?.survival&&s.results.length!==n){survivalData().active=survivalLocalHistory(s,'aborted');void save();}survivalLocalProgress();return r;};
const survivalOriginalNext=next;next=()=>{const s=session;if(s?.survival&&s.done){if(!s.results.at(-1)?.ok)return void survivalFinishLocal('wrong');if(s.results.length===s.queue.length)return void survivalFinishLocal('complete');}return survivalOriginalNext();};
const survivalOriginalBegin=beginExpanded;beginExpanded=cfg=>cfg.practice==='survival'?survivalStart(cfg):survivalOriginalBegin(cfg);
const survivalOriginalExpandedSetup=expandedSetup;expandedSetup=(...args)=>{survivalOriginalExpandedSetup(...args);if(args[2])return;$('#practice')?.insertAdjacentHTML('beforeend','<option value="survival">間違えるまで・対象全問</option>');const form=$('#expandedSetup'),update=form.onchange;form.onchange=e=>{update?.(e);const isSurvival=$('#practice').value==='survival';$('#count').disabled=isSurvival;if(isSurvival)$('#poolInfo').textContent+=' 間違えるまで・対象全問。時間制限とヒントなし。';};};
const survivalOriginalMixedSetup=mixedSetup;mixedSetup=(...args)=>{survivalOriginalMixedSetup(...args);$('#practice option[value="survival"]')?.remove();};
function survivalLocalHistory(s,reason){const c=s.survival.condition;return{id:s.survival.id,key:JSON.stringify({source:'local',...c}),condition:c,source:'local',right:s.results.filter(r=>r.ok).length,total:s.queue.length,reason,at:Date.now()};}
async function survivalFinishLocal(reason){const s=session;if(!s?.survival||s.resultSaved||!playerAccess())return;const epoch=playerEpoch,owner=activePlayer.id;s.resultSaved=true;s.ended=true;delete survivalData().active;const h=survivalLocalHistory(s,reason);survivalRecord(h);if(!await save()){s.resultSaved=false;return;}if(playerEpoch===epoch&&activePlayer?.id===owner&&playerAccess())survivalResult(h);}
const survivalOriginalLeave=leave;leave=()=>{if(!session?.survival)return survivalOriginalLeave();showModal('<h2>挑戦を中断しますか？</h2><p>回答済みの学習記録は残ります。中断した成績はランキングに登録しません。</p><button id="svAbortLocal">中断して結果へ</button>');$('#svAbortLocal').onclick=()=>{$('#modal').close();void survivalFinishLocal('aborted');};};
const survivalOriginalHome=home;home=(...args)=>{if(session?.survival&&!session.resultSaved){survivalRecord(survivalLocalHistory(session,'aborted'));delete survivalData().active;void save();}else if(!session?.survival&&db.survival?.active){survivalRecord({...db.survival.active,reason:'aborted'});delete db.survival.active;void save();}survivalVisit++;survivalOriginalHome(...args);if(activePlayer&&view==='home')app.insertAdjacentHTML('beforeend','<section class="card section"><h2>間違えるまでチャレンジ</h2><p>対象全問に挑戦。不正解まで続けて、全問制覇を目指そう。</p><div class="row"><button class="primary" onclick="survivalSetup()">チャレンジする</button><button onclick="survivalRankings()">専用ランキング</button></div></section>');};
const survivalOriginalSwitch=finishPlayerSwitch;finishPlayerSwitch=async(...args)=>{if(session?.survival&&!session.resultSaved){survivalRecord(survivalLocalHistory(session,'aborted'));delete survivalData().active;if(!await save())return;session.resultSaved=true;}return survivalOriginalSwitch(...args);};
const survivalOriginalReset=resetPlayerView;resetPlayerView=(...args)=>{survivalOnline=null;survivalVisit++;return survivalOriginalReset(...args);};
function survivalResult(h){
 survivalOnline=null;session=null;view='survival-result';const label={wrong:'不正解で終了',complete:'全問制覇！',aborted:'中断（ランキング対象外）'}[h.reason];
 app.innerHTML=`<div class="setup"><h1>${label}</h1><section class="card"><div class="resultScore">${h.right}<span style="font-size:24px">問連続正解 / 対象 ${h.total}問</span></div><p>${esc(survivalDescription(h.condition.config))}</p><p>${h.source==='online'?'オンライン・サーバー採点':'この端末の記録'} ／ 時間制限なし</p><div class="row"><button id="svAgain" class="primary">同じ条件でもう一度</button><button id="svResultRanking">専用ランキング</button><button onclick="home()">ホーム</button></div></section></div>`;
 $('#svAgain').onclick=()=>{if(h.source==='online')void survivalStartOnline(h.condition.config).catch(survivalNotice);else survivalStart(h.condition.config);};$('#svResultRanking').onclick=()=>survivalRankings(h.source==='online'?'online':'device',h.condition.config,h.serverKey);
}
async function survivalAPI(action,body,authenticated=true){
 if(navigator.onLine===false)throw Error('オンライン機能は接続後に利用できます。');
 const id=activePlayer?.id,epoch=playerEpoch;if(!id||!playerAccess())throw Error('本人確認をしてください。');
 if(authenticated&&isGuest())throw Error('ゲストは閲覧のみです。');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch('/api/rank/'+action,{method:body?'POST':'GET',credentials:'same-origin',signal:controller.signal,headers:{...(authenticated?rankHeaders(id):{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw Error(value.error||'接続できませんでした。');if(epoch!==playerEpoch||activePlayer?.id!==id||!playerAccess())throw Error('元のプレイヤーで入り直してください。');return value;}finally{clearTimeout(timer);}
}
async function survivalStartOnline(raw){
 const c=WMSurvivalRules.normalize(raw,true),id=activePlayer?.id,epoch=playerEpoch;if(!id||isGuest()||!playerAccess())throw Error('登録プレイヤーで入ってください。');
 if(survivalRefs()[id])throw Error('中断中のオンライン挑戦があります。開始画面から確認・再開してください。');
 // Check storage before starting a durable server run; never discard old pointers.
 survivalWriteRef(id,null);await rankPrepare(id);
 const catalog=await survivalAPI('survival-catalog?config='+encodeURIComponent(JSON.stringify(c)),null,false);
 if(catalog.condition.material!==WM_RELEASE.version)throw Error('教材が更新されています。アプリを更新してから開始してください。');
 const start={config:c,key:catalog.key,requestId:crypto.randomUUID()};survivalWriteRef(id,{start});const state=await survivalAPI('survival-start',start);
 if(epoch!==playerEpoch||activePlayer?.id!==id||!playerAccess())return;
 survivalWriteRef(id,{run:state.run});survivalLastConfig=c;session=null;survivalOnline={...state,localId:id};survivalOnlineScreen();
}
async function survivalResume(){
 try{const id=activePlayer.id,ref=survivalRefs()[id];if(!ref)return;await rankPrepare(id);const state=ref.start?await survivalAPI('survival-start',ref.start):await survivalAPI('survival-resume',{run:ref.run});
  // Stored order and grading remain authoritative across app updates.
  const pending=ref.pending&&ref.pending.position>=state.position&&!state.done?ref.pending:null;survivalWriteRef(id,{run:state.run,...(pending?{pending}:{})});
  session=null;survivalOnline={...state,localId:id,pending};survivalOnlineScreen();
 }catch(e){survivalNotice(e);}
}
function survivalItem(q){return survivalBank()[q.content]?.find(x=>x.id===q.item);}
function survivalOnlineScreen(){
 const r=survivalOnline;if(!r||activePlayer?.id!==r.localId||!playerAccess())return;
 view='official';app.innerHTML=`<div class="setup"><button class="back" id="svBack">← 挑戦を保存して戻る</button><h1>間違えるまでチャレンジ</h1><p class="notice">連続正解 ${r.right}問 ／ 回答済み ${r.position} / 対象 ${r.total}問</p><p>${esc(survivalDescription(r.condition.config))}</p>${r.condition.material!==WM_RELEASE.version?'<p class="notice">開始時の教材版の条件で再開します。成績はその版のランキングに保存します。</p>':''}<section class="card"><div id="svVisual"></div><h2 id="svPrompt"></h2><div id="svChoices" class="choices"></div><div id="svFeedback"></div><p id="svOnlineMessage" role="status"></p><button id="svAbortOnline">この挑戦を中断・終了する（投稿しない）</button></section></div>`;
 $('#svBack').onclick=()=>{survivalOnline=null;survivalSetup(r.condition.config);};$('#svAbortOnline').onclick=()=>{showModal('<h2>この挑戦を終了しますか？</h2><p>中断した成績はランキングに登録しません。再開する場合はキャンセルし、「保存して戻る」を使ってください。</p><button id="svConfirmAbort">中断・終了を確定</button>');$('#svConfirmAbort').onclick=()=>{$('#modal').close();void survivalAbortOnline();};};
 if(r.feedback&&!r.pending){const f=r.feedback,item=survivalItem(f.question);$('#svPrompt').textContent=f.ok?'正解！':'ここで覚えよう';$('#svFeedback').innerHTML=`<h3>${esc(item?.name||f.correct)}</h3><p>${esc(item?.description||item?.note||'')}</p><button class="primary" id="svOnlineNext">${r.done?'結果を見る':'次の問題へ'}</button>`;$('#svOnlineNext').onclick=()=>{if(r.done)void survivalFinishOnline();else{r.feedback=null;survivalOnlineScreen();}};return;}
 if(r.done){void survivalFinishOnline();return;}
 const q=r.question,item=survivalItem(q);if(!item){$('#svOnlineMessage').textContent='この問題の教材が見つかりません。更新前のタブで再開してください。';return;}
 $('#svPrompt').textContent=q.prompt;if(q.mode==='flag')$('#svVisual').innerHTML=flag(item)+(['ID','MC','RO','TD'].includes(item.id)?`<p>地域：${esc(item.region)}</p>`:'');
 if(q.mode==='terrainName')mountTerrainMap($('#svVisual'),[item]).focus(item);if(q.mode==='heritageMap')mountHeritageMap($('#svVisual'),[item]).focus(item);
 if(q.mode==='location'){let selected=null;const map=mountMap($('#svVisual'),{onSelect:id=>{if(q.allowed.includes(id)){selected=id;map.select(id);$('#svMapSubmit').disabled=false;}}});$('#svChoices').innerHTML='<button id="svMapSubmit" class="primary" disabled>選んだ位置で回答する</button>';$('#svMapSubmit').onclick=()=>void survivalAnswerOnline(selected);}
 else{$('#svChoices').innerHTML=q.options.map(o=>`<button data-survival-choice="${esc(o.id)}">${esc(o.label)}</button>`).join('');$('#svChoices').onclick=e=>{const b=e.target.closest('[data-survival-choice]');if(b)void survivalAnswerOnline(b.dataset.survivalChoice);};}
 $('#svChoices').insertAdjacentHTML('afterend','<button id="svSkipOnline">わからない</button>');$('#svSkipOnline').onclick=()=>void survivalAnswerOnline('skip');
 if(r.pending){$('#svChoices').querySelectorAll('button').forEach(b=>b.disabled=true);$('#svSkipOnline').disabled=true;$('#svFeedback').innerHTML='<p>前回の回答を確認します。別の回答には変更できません。</p><button id="svRetryOnline">同じ回答を再送信</button>';$('#svRetryOnline').onclick=()=>void survivalAnswerOnline(r.pending.choice);}
}
async function survivalAnswerOnline(choice){
 const r=survivalOnline;if(!r||r.sending||r.done||!playerAccess()||activePlayer?.id!==r.localId)return;
 const pending=r.pending||{run:r.run,position:r.position,question:r.question.id,choice};
 try{survivalWriteRef(r.localId,{run:r.run,pending});r.pending=pending;r.sending=true;$('#svChoices')?.querySelectorAll('button').forEach(b=>b.disabled=true);if($('#svSkipOnline'))$('#svSkipOnline').disabled=true;
  const state=await survivalAPI('survival-answer',pending);if(survivalOnline!==r)return;Object.assign(r,state,{pending:null});survivalWriteRef(r.localId,{run:r.run});survivalOnlineScreen();
 }catch(e){if(survivalOnline===r&&playerAccess()){survivalOnlineScreen();$('#svOnlineMessage').textContent=e.message;}}finally{r.sending=false;}
}
async function survivalAbortOnline(){const r=survivalOnline;if(!r||r.sending)return;try{r.sending=true;const state=await survivalAPI('survival-abort',{run:r.run});if(survivalOnline!==r)return;Object.assign(r,state);await survivalFinishOnline();}catch(e){if($('#svOnlineMessage'))$('#svOnlineMessage').textContent=e.message;}finally{r.sending=false;}}
async function survivalFinishOnline(){const r=survivalOnline;if(!r||!r.done||activePlayer?.id!==r.localId||!playerAccess())return;
 const h={id:r.run,key:JSON.stringify({source:'online',...r.condition}),condition:r.condition,serverKey:r.key,source:'online',right:r.right,total:r.total,reason:r.reason,at:r.at||Date.now()};survivalRecord(h);
 const epoch=playerEpoch;if(!await save())return;if(playerEpoch!==epoch||activePlayer?.id!==r.localId||!playerAccess())return;survivalWriteRef(r.localId,null);survivalResult(h);
}
function survivalRankTable(rows){if(!rows.length)return '<p>まだ記録がありません。</p>';return `<div class="tableScroll"><table class="rankingTable"><thead><tr><th>順位</th><th>プレイヤー</th><th>連続正解</th><th>達成日</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.mine?'mine':''}"><td>${r.rank||1+rows.filter(x=>x.right>r.right).length}</td><td>${esc(r.icon||'🌱')} ${esc(r.name)}${r.mine?'（自分）':''}</td><td>${r.right} / ${r.total}${r.reason==='complete'||r.complete?' ★全問制覇':''}</td><td>${new Date(r.at).toLocaleDateString('ja-JP')}</td></tr>`).join('')}</tbody></table></div>`;}
function survivalRankings(tab='device',cfg=survivalLastConfig||{content:'country',mode:'flag',level:'c1',region:'世界全体',input:'choice'},boardKey=null){
 if(!activePlayer||!playerAccess())return;survivalLastConfig=WMSurvivalRules.normalize(cfg);session=null;survivalOnline=null;view='survival-rankings';const visit=++survivalVisit,id=activePlayer.id;
 app.innerHTML=`<div class="setup"><button class="back" onclick="home()">← ホーム</button><h1>間違えるまで・専用ランキング</h1><div class="rankingTabs">${[['device','この端末のみんな'],['online','オンライン'],['personal','自分の記録']].map(([key,label])=>`<button data-sv-tab="${key}" aria-pressed="${key===tab}">${label}</button>`).join('')}</div><p>同じ条件の連続正解数で比較。同点は同順位です。時間は順位に使いません。</p><button id="svChangeConditions">条件を選ぶ・挑戦する</button><section class="card section" id="svRankPanel"></section></div>`;
 app.querySelectorAll('[data-sv-tab]').forEach(b=>b.onclick=()=>survivalRankings(b.dataset.svTab,survivalLastConfig));$('#svChangeConditions').onclick=()=>survivalSetup(survivalLastConfig);
 if(tab==='online'){
  $('#svRankPanel').innerHTML='<p id="svBoardMessage" role="status">順位を取得中…</p><button id="svBoardRetry">再取得</button><div id="svBoard"></div>';
  const load=async()=>{try{const c=WMSurvivalRules.normalize(survivalLastConfig,true);if(!isGuest())await rankPrepare(id);const b=await survivalAPI('survival-leaderboard?config='+encodeURIComponent(JSON.stringify(c))+(boardKey?'&boardKey='+encodeURIComponent(boardKey):''),null,!isGuest());if(visit!==survivalVisit||view!=='survival-rankings')return;$('#svBoardMessage').textContent=survivalDescription(b.condition.config)+' ／ 対象 '+b.total+'問 ／ '+(b.own?`自分：${b.own.rank}位・${b.own.right}問連続正解`:'自分：未挑戦');$('#svBoard').innerHTML=survivalRankTable(b.rows);}catch(e){if(visit===survivalVisit&&$('#svBoardMessage'))$('#svBoardMessage').textContent=e.message;}};$('#svBoardRetry').onclick=()=>void load();void load();return;
 }
 let rows=[],history=[];try{const players=tab==='personal'?[activePlayer]:readPlayerIndex().players;for(const p of players){const d=p.id===activePlayer.id?db:readPlayerData(p.id).data;for(const h of Object.values(d.survival?.bests||{}))rows.push({...h,playerId:p.id,name:p.name,icon:p.icon,mine:p.id===id});if(p.id===id)history=d.survival?.history||[];}}catch(e){$('#svRankPanel').textContent='一部の記録を読み取れませんでした。先生に確認してください。';return;}
 const groups=[...new Map(rows.map(h=>[h.key,h])).values()];$('#svRankPanel').innerHTML='<label for="svConditionGroup">出題条件・教材版</label><select id="svConditionGroup">'+groups.map((h,i)=>`<option value="${i}">${esc(survivalDescription(h.condition.config))} ／ ${h.source==='online'?'オンライン':'端末'} ／ ${h.total}問 ／ 教材${esc(h.condition.material.slice(0,8))}</option>`).join('')+'</select><p id="svOwnRank"></p><div id="svLocalBoard"></div><button id="svOldOnline" hidden>この条件のオンライン順位</button>'+(tab==='personal'?'<details><summary>このモードの履歴（中断を含む）</summary>'+history.map(h=>`<p>${new Date(h.at).toLocaleDateString('ja-JP')}：${h.right}/${h.total}・${({wrong:'不正解終了',complete:'全問制覇',aborted:'中断'})[h.reason]}</p>`).join('')+'</details>':'');
 const draw=()=>{const key=groups[+$('#svConditionGroup').value]?.key,list=rows.filter(h=>h.key===key).sort((a,b)=>b.right-a.right||a.at-b.at||a.playerId.localeCompare(b.playerId));$('#svLocalBoard').innerHTML=survivalRankTable(list);const selected=groups[+$('#svConditionGroup').value];$('#svOldOnline').hidden=!selected?.serverKey;$('#svOldOnline').onclick=()=>survivalRankings('online',selected.condition.config,selected.serverKey);const own=list.find(h=>h.mine);$('#svOwnRank').textContent=own?`自分：${1+list.filter(h=>h.right>own.right).length}位`:'自分：未挑戦';};$('#svConditionGroup').onchange=draw;draw();
}
const survivalOriginalRankings=rankings;rankings=(...args)=>{survivalOriginalRankings(...args);if(view==='rankings')app.insertAdjacentHTML('beforeend','<button class="section" onclick="survivalRankings()">間違えるまで・専用ランキング</button>');};
