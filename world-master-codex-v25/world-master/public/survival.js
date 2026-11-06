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
function survivalSameConfig(a,b){if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;return ['content','mode','level','region','input','scope','category','kind','countryLevel'].every(k=>(a[k]??null)===(b[k]??null));}
function survivalFixedConfig(raw){const c={...(raw||{})};c.region='世界全体';c.level=c.content==='country'?'countryMaster':'advanced';if(c.content==='mixed')c.countryLevel='countryMaster';return c;}
function survivalIsFixed(c){return !!c&&c.region==='世界全体'&&(c.content==='country'?c.level==='countryMaster':c.level==='advanced')&&(c.content!=='mixed'||c.countryLevel==='countryMaster');}
// Cleanup (user-approved), run when the rankings page opens: records under
// conditions that can no longer be selected are deleted. Learning: ranking-type
// history entries (test form, not review) whose region is not the whole world,
// whose count is not 10, or that are streak challenges; ranking bests are
// rebuilt from what remains. Survival: bests and history outside the fixed
// conditions. The active checkpoint is never touched. Idempotent; writes only
// when something was actually removed.
function purgeUnselectableRecords(){
 if(!activePlayer||isGuest())return;
 let changed=false;
 if(Array.isArray(db.history)){
  const keep=db.history.filter(h=>{
   if(!h||h.practice!=='test'||h.review||typeof h.rankKey!=='string')return true;
   let c;try{c=JSON.parse(h.rankKey)}catch{return true}
   const region=c.region||h.region||'世界全体',count=c.count??h.n;
   return region==='世界全体'&&count===10&&c.challenge!=='streak';
  });
  if(keep.length!==db.history.length){db.history=keep;db.rankingBests=collectRankingBests({...db,rankingBests:{}});changed=true;}
 }
 const s=db.survival;
 if(s&&s.version===1){
  if(s.bests&&typeof s.bests==='object'&&!Array.isArray(s.bests))for(const k of Object.keys(s.bests)){if(!survivalIsFixed(s.bests[k]?.condition?.config)){delete s.bests[k];changed=true;}}
  if(Array.isArray(s.history)){const keep=s.history.filter(h=>survivalIsFixed(h?.condition?.config));if(keep.length!==s.history.length){s.history=keep;changed=true;}}
 }
 if(changed)void save();
}
function survivalGroupKey(h){return JSON.stringify({config:h.condition.config,targets:h.condition.targets});}
function survivalCarriedBests(s){
 const out=[];if(!s||typeof s!=='object'||!s.bests||typeof s.bests!=='object')return out;
 for(const h of Object.values(s.bests)){
  if(!h||h.source!=='local'||!h.condition||typeof h.condition!=='object'||h.condition.material===WM_RELEASE.version||!Array.isArray(h.condition.targets))continue;
  let cfg;try{cfg=WMSurvivalRules.normalize(h.condition.config);}catch(e){continue;}
  if(!survivalSameConfig(cfg,h.condition.config))continue;
  let targets;try{targets=survivalEntries(cfg).map(e=>e.identity).sort();}catch(e){continue;}
  if(JSON.stringify(targets)!==JSON.stringify([...h.condition.targets].sort()))continue;
  const condition={rule:WMSurvivalRules.rule,dataVersion:DATA_VERSION,material:WM_RELEASE.version,config:cfg,targets};
  out.push({...h,key:JSON.stringify({source:'local',...condition}),condition});
 }
 return out;
}
function survivalApplyCarryOver(){
 const d=survivalData();let changed=false;
 for(const c of survivalCarriedBests(d)){const old=d.bests[c.key];if(!old||c.right>old.right){d.bests[c.key]=c;changed=true;}}
 return changed;
}
function survivalMergedBests(s){
 const merged={...(s&&s.bests&&typeof s.bests==='object'?s.bests:{})};
 for(const c of survivalCarriedBests(s||{})){const old=merged[c.key];if(!old||c.right>old.right)merged[c.key]=c;}
 return Object.values(merged);
}
function survivalRecord(h){
 survivalApplyCarryOver();
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
function survivalSetup(initial=survivalLastConfig||{content:'country',mode:'flag',level:'countryMaster',region:'世界全体',input:'choice'}){
 if(!activePlayer||!playerAccess())return;
 if(survivalApplyCarryOver())void save();
 view='survival-setup';survivalVisit++;const visit=survivalVisit;
 app.innerHTML=`<div class="setup"><button class="back" onclick="home()">← ホーム</button><span class="eyebrow">UNTIL THE FIRST MISTAKE</span><h1>間違えるまでチャレンジ</h1><p class="notice">正解する限り続きます。不正解・「わからない」で終了。全問正解なら全問制覇！時間制限・ヒントなし。同じ問題は一度だけ。途中終了はランキング対象外です。難易度は最上位（国・国旗はマスター、その他は発展）、地域は世界全体に固定です。</p><form id="survivalSetup" class="card"><div class="fields"><div><label for="svContent">分野</label><select id="svContent">${WMSurvivalRules.contents.map(k=>`<option value="${k}">${survivalLabel[k]}</option>`).join('')}</select></div><div><label for="svMode">学び方</label><select id="svMode"></select></div><div><label for="svLevel">難易度</label><select id="svLevel"></select></div><div><label for="svCountryLevel">総合の国・国旗レベル</label><select id="svCountryLevel"><option value="countryMaster">${COUNTRY_LEVELS.countryMaster}</option></select></div><div><label for="svRegion">地域</label><select id="svRegion"><option>世界全体</option></select></div><div><label for="svCategory">地形の種類</label><select id="svCategory"><option value="all">すべて</option>${Object.entries(terrainCategories).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div><label for="svKind">遺産の種類</label><select id="svKind"><option value="all">すべて</option>${Object.entries(heritageKinds).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div></div><p id="svPoolInfo" role="status"></p><p class="note">オンライン・サーバー採点で遊びます。記録はオンラインランキング・この端末のみんな・自分の記録に保存されます。オフラインのときは同じ条件で遊べますが、記録はこの端末のみんな・自分の記録にだけ保存されます。</p><button id="svBegin" class="primary">チャレンジを開始</button><button type="button" id="svRankings">ランキング</button><p id="svMessage" role="status"></p></form><div id="svResumeArea"></div></div>`;
 $('#svContent').value=initial.content;$('#svRegion').value=initial.region||'世界全体';$('#svCountryLevel').value='countryMaster';$('#svCategory').value=initial.category||'all';$('#svKind').value=initial.kind||'all';
 let lastContent='',sequence=0;
 const config=()=>WMSurvivalRules.normalize({content:$('#svContent').value,mode:$('#svMode').value,level:$('#svLevel').value,countryLevel:$('#svCountryLevel').value,region:$('#svRegion').value,input:'choice',category:$('#svCategory').value,kind:$('#svKind').value},true);
 const update=async()=>{
  const content=$('#svContent').value,seq=++sequence,canOnline=!isGuest()&&navigator.onLine!==false;
  if(content!==lastContent){const oldMode=lastContent?$('#svMode').value:initial.mode,oldLevel=lastContent?$('#svLevel').value:initial.level;$('#svMode').innerHTML=WMSurvivalRules.onlineModes[content].map(k=>`<option value="${k}">${allLabels()[k]||'分野ごとの名前問題'}</option>`).join('');if([...$('#svMode').options].some(o=>o.value===oldMode))$('#svMode').value=oldMode;$('#svLevel').innerHTML=Object.entries(content==='country'?{countryMaster:COUNTRY_LEVELS.countryMaster}:{advanced:THREE_LEVELS.advanced}).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');if([...$('#svLevel').options].some(o=>o.value===oldLevel))$('#svLevel').value=oldLevel;lastContent=content;}
  $('#svCountryLevel').parentElement.hidden=content!=='mixed';$('#svCategory').parentElement.hidden=content!=='terrain';$('#svKind').parentElement.hidden=content!=='heritage';
  const c=config();survivalLastConfig=c;let total=survivalEntries(c).length;$('#svBegin').disabled=true;
  $('#svPoolInfo').textContent=`対象 ${total}問（全問出題・重複なし）`;$('#svMessage').textContent='';
  if(canOnline){try{const catalog=await survivalAPI('survival-catalog?config='+encodeURIComponent(JSON.stringify(c)),null,false);if(visit!==survivalVisit||seq!==sequence||!$('#svBegin'))return;if(catalog.condition.material!==WM_RELEASE.version)throw Error('教材が更新されています。アプリの更新を確認してください。');total=catalog.total;$('#svPoolInfo').textContent=`オンラインの対象 ${total}問（全問出題・重複なし）`;}catch(e){if(visit===survivalVisit&&seq===sequence&&$('#svMessage'))$('#svMessage').textContent=e.message;}}
  if(visit===survivalVisit&&seq===sequence&&$('#svBegin'))$('#svBegin').disabled=!total;
 };
 $('#survivalSetup').onchange=()=>void update();$('#survivalSetup').onsubmit=async e=>{e.preventDefault();const c=config();$('#svBegin').disabled=true;try{await survivalBegin(c);}catch(err){if($('#svMessage'))$('#svMessage').textContent=err.message;else survivalNotice(err);if($('#svBegin'))$('#svBegin').disabled=false;}};
 $('#svRankings').onclick=()=>survivalRankings('online',config());
 try{if(survivalRefs()[activePlayer.id])$('#svResumeArea').innerHTML='<button id="svResume" class="primary">中断中のオンライン挑戦を確認・再開</button>';if($('#svResume'))$('#svResume').onclick=()=>void survivalResume();}catch(e){$('#svResumeArea').textContent=e.message;}
 void update();
}
let survivalStartNotice='';
async function survivalBegin(raw){
 survivalStartNotice='';
 let c=null;try{c=WMSurvivalRules.normalize(raw,true);}catch{c=null;}
 if(!c){survivalStart(raw);return;}
 if(isGuest()){survivalStart(c);return;}
 if(navigator.onLine===false){survivalStartNotice='オフラインのため、この端末の記録として開始します';survivalStart(c);return;}
 const id=activePlayer?.id;
 if(survivalRefs()[id])throw Error('中断中のオンライン挑戦があります。開始画面から確認・再開してください。');
 let catalog=null;try{catalog=await survivalAPI('survival-catalog?config='+encodeURIComponent(JSON.stringify(c)),null,false);}catch{catalog=null;}
 if(catalog&&catalog.condition.material!==WM_RELEASE.version)throw Error('教材が更新されています。アプリを更新してから開始してください。');
 if(!catalog){survivalStartNotice='オンラインに接続できないため、この端末の記録として開始します';survivalStart(c);return;}
 try{await survivalStartOnline(c);}
 catch(e){let ref=null;try{ref=survivalRefs()[id];}catch{}if(ref)throw e;survivalStartNotice='オンラインに接続できないため、この端末の記録として開始します';survivalStart(c);}
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
function survivalLocalProgress(){const s=session;if(!s?.survival)return;let p=$('#svProgress');if(!p){p=document.createElement('p');p.id='svProgress';p.className='notice';p.setAttribute('aria-live','polite');app.prepend(p);}p.textContent=`連続正解 ${s.results.filter(r=>r.ok).length}問 ／ 回答済み ${s.results.length} / 対象 ${s.queue.length}問${survivalStartNotice?' ／ '+survivalStartNotice:''}`;
 $('#inkKeyboard')?.remove();app.querySelectorAll('button[onclick="hint()"],button[onclick="readingHint()"],button[onclick="terrainHint()"],button[onclick="heritageHint()"]').forEach(b=>b.remove());
 const b=$('#feedback button[onclick="next()"]');if(b&&s.done&&(!s.results.at(-1)?.ok||s.results.length===s.queue.length))b.textContent='結果を見る →';
}
const survivalOriginalQuestion=question;question=(...args)=>{if(session?.survival&&session.inputChanged)throw Error('回答方法は固定です。新しい条件で開始してください。');const r=survivalOriginalQuestion(...args);survivalLocalProgress();return r;};
const survivalOriginalAnswer=submitAnswer;submitAnswer=(...args)=>{const s=session,n=s?.results.length;const r=survivalOriginalAnswer(...args);if(s?.survival&&s.results.length!==n){survivalData().active=survivalLocalHistory(s,'aborted');void save();if(s.results.at(-1)?.ok)survivalScheduleAutoAdvance(()=>{if(session===s&&s.done&&!s.ended&&view==='game'&&playerAccess()&&(typeof playerCanAnswer!=='function'||playerCanAnswer()))next();});}survivalLocalProgress();return r;};
const survivalOriginalNext=next;next=()=>{survivalClearAutoAdvance();const s=session;if(s?.survival&&s.done){if(!s.results.at(-1)?.ok)return void survivalFinishLocal('wrong');if(s.results.length===s.queue.length)return void survivalFinishLocal('complete');}return survivalOriginalNext();};
const survivalOriginalMixedSetup=mixedSetup;mixedSetup=(...args)=>{survivalOriginalMixedSetup(...args);$('#practice option[value="survival"]')?.remove();};
function survivalLocalHistory(s,reason){const c=s.survival.condition;return{id:s.survival.id,key:JSON.stringify({source:'local',...c}),condition:c,source:'local',right:s.results.filter(r=>r.ok).length,total:s.queue.length,reason,at:Date.now()};}
async function survivalFinishLocal(reason){const s=session;if(!s?.survival||s.resultSaved||!playerAccess())return;const epoch=playerEpoch,owner=activePlayer.id;s.resultSaved=true;s.ended=true;delete survivalData().active;const h=survivalLocalHistory(s,reason);survivalRecord(h);if(!await save()){s.resultSaved=false;return;}if(playerEpoch===epoch&&activePlayer?.id===owner&&playerAccess())survivalResult(h);}
const survivalOriginalLeave=leave;leave=()=>{survivalClearAutoAdvance();if(!session?.survival)return survivalOriginalLeave();showModal('<h2>挑戦を中断しますか？</h2><p>回答済みの学習記録は残ります。中断した成績はランキングに登録しません。</p><button id="svAbortLocal">中断して結果へ</button>');$('#svAbortLocal').onclick=()=>{$('#modal').close();void survivalFinishLocal('aborted');};};
const survivalOriginalHome=home;home=(...args)=>{if(session?.survival&&!session.resultSaved){survivalRecord(survivalLocalHistory(session,'aborted'));delete survivalData().active;void save();}else if(!session?.survival&&db.survival?.active){survivalRecord({...db.survival.active,reason:'aborted'});delete db.survival.active;void save();}survivalVisit++;survivalOriginalHome(...args);if(activePlayer&&view==='home')app.insertAdjacentHTML('beforeend','<section class="card section"><h2>間違えるまでチャレンジ</h2><p>対象全問に挑戦。不正解まで続けて、全問制覇を目指そう。</p><div class="row"><button class="primary" onclick="survivalSetup()">チャレンジを開始</button><button onclick="survivalRankings()">ランキングを見る</button></div></section>');};
const survivalOriginalSwitch=finishPlayerSwitch;finishPlayerSwitch=async(...args)=>{if(session?.survival&&!session.resultSaved){survivalRecord(survivalLocalHistory(session,'aborted'));delete survivalData().active;if(!await save())return;session.resultSaved=true;}return survivalOriginalSwitch(...args);};
const survivalOriginalReset=resetPlayerView;resetPlayerView=(...args)=>{survivalClearAutoAdvance();survivalOnline=null;survivalVisit++;return survivalOriginalReset(...args);};
function survivalResult(h){
 survivalOnline=null;session=null;view='survival-result';const label={wrong:'不正解で終了',complete:'全問制覇！',aborted:'中断（ランキング対象外）'}[h.reason];
 app.innerHTML=`<div class="setup"><h1>${label}</h1><section class="card"><div class="resultScore">${h.right}<span style="font-size:24px">問連続正解 / 対象 ${h.total}問</span></div><p>${esc(survivalDescription(h.condition.config))}</p><p>${h.source==='online'?'オンライン・サーバー採点':'この端末の記録'} ／ 時間制限なし</p><div class="row"><button id="svAgain" class="primary">同じ条件でもう一度</button><button id="svResultRanking">ランキング</button><button onclick="home()">ホーム</button></div></section></div>`;
 $('#svAgain').onclick=()=>{void survivalBegin(h.condition.config).catch(survivalNotice);};$('#svResultRanking').onclick=()=>survivalRankings(h.source==='online'?'online':'device',h.condition.config,h.serverKey);
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
const survivalPreloadedFlags=new Set();
function survivalPreloadQueue(r){
 if(!r||!Array.isArray(r.queue))return;
 for(const q of r.queue){if(q?.mode==='flag'&&q.item&&!survivalPreloadedFlags.has(q.item)){survivalPreloadedFlags.add(q.item);const im=document.createElement('img');im.src=flagPath(q.item);}}
}
let survivalAutoTimer=null;
function survivalClearAutoAdvance(){if(survivalAutoTimer!==null){clearTimeout(survivalAutoTimer);survivalAutoTimer=null;}}
function survivalScheduleAutoAdvance(fire){survivalClearAutoAdvance();survivalAutoTimer=setTimeout(()=>{survivalAutoTimer=null;try{fire();}catch{}},900);if(survivalAutoTimer&&typeof survivalAutoTimer==='object')survivalAutoTimer.unref?.();}
function survivalOnlineScreen(){
 const r=survivalOnline;if(!r||activePlayer?.id!==r.localId||!playerAccess())return;
 survivalClearAutoAdvance();survivalPreloadQueue(r);
 view='official';app.innerHTML=`<div class="setup"><button class="back" id="svBack">← 挑戦を保存して戻る</button><h1>間違えるまでチャレンジ</h1><p class="notice">連続正解 ${r.right}問 ／ 回答済み ${r.position} / 対象 ${r.total}問</p><p>${esc(survivalDescription(r.condition.config))}</p>${r.condition.material!==WM_RELEASE.version?'<p class="notice">開始時の教材版の条件で再開します。成績はその版のランキングに保存します。</p>':''}<section class="card"><div id="svVisual"></div><h2 id="svPrompt"></h2><div id="svChoices" class="choices"></div><div id="svFeedback"></div><p id="svOnlineMessage" role="status"></p><button id="svAbortOnline">この挑戦を中断・終了する（投稿しない）</button></section></div>`;
 $('#svBack').onclick=()=>{survivalOnline=null;survivalSetup(r.condition.config);};$('#svAbortOnline').onclick=()=>{showModal('<h2>この挑戦を終了しますか？</h2><p>中断した成績はランキングに登録しません。再開する場合はキャンセルし、「保存して戻る」を使ってください。</p><button id="svConfirmAbort">中断・終了を確定</button>');$('#svConfirmAbort').onclick=()=>{$('#modal').close();void survivalAbortOnline();};};
 if(r.feedback&&!r.pending){const f=r.feedback,item=survivalItem(f.question);$('#svPrompt').textContent=f.ok?'正解！':'ここで覚えよう';$('#svFeedback').innerHTML=`<h3>${esc(item?.name||f.correct)}</h3><p>${esc(item?.description||item?.note||'')}</p><button class="primary" id="svOnlineNext">${r.done?'結果を見る':'次の問題へ'}</button>`;$('#svOnlineNext').onclick=()=>{survivalClearAutoAdvance();if(r.done)void survivalFinishOnline();else{r.feedback=null;survivalOnlineScreen();}};if(f.ok)survivalScheduleAutoAdvance(()=>{if(survivalOnline===r&&r.feedback===f&&playerAccess()){if(r.done)void survivalFinishOnline();else{r.feedback=null;survivalOnlineScreen();}}});return;}
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
function survivalRankTable(rows){if(!rows.length)return '<p>まだ記録がありません。</p>';const top=rows.filter(r=>(r.rank||1+rows.filter(x=>x.right>r.right).length)<=10);return `<div class="tableScroll"><table class="rankingTable"><thead><tr><th>順位</th><th>プレイヤー</th><th>連続正解</th><th>達成日</th></tr></thead><tbody>${top.map((r,i)=>`<tr class="${r.mine?'mine':''}"><td>${r.rank||1+rows.filter(x=>x.right>r.right).length}</td><td>${esc(r.icon||'🌱')} ${esc(r.name)}${r.mine?'（自分）':''}</td><td>${r.right} / ${r.total}${r.reason==='complete'||r.complete?' ★全問制覇':''}</td><td>${new Date(r.at).toLocaleDateString('ja-JP')}</td></tr>`).join('')}</tbody></table></div>`;}
let survivalPanelCfg=null,survivalPanelKey=null;
function survivalRankings(tab='online',cfg,boardKey){if(!activePlayer||!playerAccess())return;if(cfg)survivalPanelCfg=cfg;survivalPanelKey=boardKey||null;rankKind='survival';rankScope=tab;rankings();const sec=$('#rankViewSection');if(sec&&typeof sec.scrollIntoView==='function')sec.scrollIntoView();}
function survivalRankPanel(){
 const tab=rankScope,cfg=survivalPanelCfg||survivalLastConfig||{content:'country',mode:'flag',level:'countryMaster',region:'世界全体',input:'choice'},boardKey=survivalPanelKey,panel=$('#rankingPanel');
 if(!panel||!activePlayer||!playerAccess())return;if(survivalApplyCarryOver())void save();survivalLastConfig=WMSurvivalRules.normalize(survivalFixedConfig(cfg));session=null;survivalOnline=null;const visit=++survivalVisit,id=activePlayer.id;
 panel.innerHTML='<div id="svRankPanel"></div>';
 if(tab==='online'){
  const conds=[];for(const content of WMSurvivalRules.contents)for(const mode of WMSurvivalRules.onlineModes[content]){const variants=content==='heritage'?['all',...Object.keys(heritageKinds)]:['all'];for(const variant of variants)conds.push(WMSurvivalRules.normalize({content,mode,level:content==='country'?'countryMaster':'advanced',countryLevel:'countryMaster',region:'世界全体',input:'choice',category:'all',kind:content==='heritage'?variant:'all'},true));}
  let initial=survivalLastConfig;
  if(!conds.some(c=>JSON.stringify(c)===JSON.stringify(initial))){if(!boardKey&&initial.content==='terrain'&&initial.category!=='all')initial=conds.find(c=>c.content==='terrain');else conds.unshift(initial);}
  const selected=conds.findIndex(c=>JSON.stringify(c)===JSON.stringify(initial));let key=boardKey,seq=0;
  $('#svRankPanel').innerHTML='<label for="svOnlineCondition">出題条件</label><select id="svOnlineCondition">'+conds.map((c,i)=>`<option value="${i}"${i===selected?' selected':''}>${esc(survivalDescription(c))}</option>`).join('')+'</select><p id="svBoardMessage" role="status">順位を取得中…</p><button id="svBoardRetry">再取得</button><div id="svBoard"></div>';
  const load=async()=>{const my=++seq,c=conds[+$('#svOnlineCondition').value];survivalLastConfig=c;survivalPanelCfg=c;try{if(!isGuest())await rankPrepare(id);const b=await survivalAPI('survival-leaderboard?config='+encodeURIComponent(JSON.stringify(c))+(key?'&boardKey='+encodeURIComponent(key):''),null,!isGuest());if(my!==seq||visit!==survivalVisit||view!=='rankings'||!$('#svBoard'))return;$('#svBoardMessage').textContent=survivalDescription(b.condition.config)+' ／ 対象 '+b.total+'問 ／ '+(b.own?`自分：${b.own.rank}位・${b.own.right}問連続正解`:'自分：未挑戦')+(b.mergedFrom>1?' ／ 教材は複数版を統合':'');$('#svBoard').innerHTML=survivalRankTable(b.rows);}catch(e){if(my===seq&&visit===survivalVisit&&$('#svBoardMessage'))$('#svBoardMessage').textContent=e.message;}};$('#svOnlineCondition').onchange=()=>{key=null;survivalPanelKey=null;$('#svBoardMessage').textContent='順位を取得中…';void load();};$('#svBoardRetry').onclick=()=>void load();void load();return;
 }
 let rows=[],history=[];try{const players=tab==='personal'?[activePlayer]:readPlayerIndex().players;for(const p of players){const d=p.id===activePlayer.id?db:readPlayerData(p.id).data;for(const h of survivalMergedBests(d.survival))rows.push({...h,playerId:p.id,name:p.name,icon:p.icon,mine:p.id===id});if(p.id===id)history=d.survival?.history||[];}}catch(e){$('#svRankPanel').textContent='一部の記録を読み取れませんでした。先生に確認してください。';return;}
 rows=rows.filter(h=>survivalIsFixed(h.condition.config));const groupMap=new Map();for(const h of rows){const g=survivalGroupKey(h);if(!groupMap.has(g))groupMap.set(g,[]);groupMap.get(g).push(h);}const groups=[...groupMap.entries()].map(([gkey,list])=>{const mats=[...new Set(list.map(h=>h.condition.material))],cur=list.find(h=>h.condition.material===WM_RELEASE.version);return {gkey,config:(cur||list[0]).condition.config,sources:[...new Set(list.map(h=>h.source))],total:list[0].total,materials:mats,serverKey:(list.find(h=>h.condition.material===WM_RELEASE.version&&h.serverKey)||list.find(h=>h.serverKey))?.serverKey};});$('#svRankPanel').innerHTML='<label for="svConditionGroup">出題条件・教材版</label><select id="svConditionGroup">'+groups.map((g,i)=>`<option value="${i}">${esc(survivalDescription(g.config))} ／ ${g.sources.length>1?'端末＋オンライン':g.sources[0]==='online'?'オンライン':'端末'} ／ ${g.total}問${g.materials.length===1?` ／ 教材${esc(g.materials[0].slice(0,8))}`:' ／ 教材は複数版を統合'}</option>`).join('')+'</select><p id="svOwnRank"></p><div id="svLocalBoard"></div><button id="svOldOnline" hidden>この条件のオンライン順位</button>'+(tab==='personal'?'<details><summary>このモードの履歴（中断を含む）</summary>'+history.map(h=>`<p>${new Date(h.at).toLocaleDateString('ja-JP')}：${h.right}/${h.total}・${({wrong:'不正解終了',complete:'全問制覇',aborted:'中断'})[h.reason]}</p>`).join('')+'</details>':'');
 const draw=()=>{const g=groups[+$('#svConditionGroup').value],byPlayer=new Map();if(g)for(const h of rows.filter(x=>survivalGroupKey(x)===g.gkey)){const cur=byPlayer.get(h.playerId);if(!cur||h.right>cur.right||h.right===cur.right&&h.at<cur.at)byPlayer.set(h.playerId,h);}const list=[...byPlayer.values()].sort((a,b)=>b.right-a.right||a.at-b.at||a.playerId.localeCompare(b.playerId));$('#svLocalBoard').innerHTML=survivalRankTable(list);$('#svOldOnline').hidden=!g?.serverKey;$('#svOldOnline').onclick=()=>survivalRankings('online',g.config,g.serverKey);const own=list.find(h=>h.mine);$('#svOwnRank').textContent=own?`自分：${1+list.filter(h=>h.right>own.right).length}位`:'自分：未挑戦';};$('#svConditionGroup').onchange=draw;draw();
}
const survivalOriginalRankings=rankings;rankings=(...args)=>{purgeUnselectableRecords();survivalOriginalRankings(...args);};
