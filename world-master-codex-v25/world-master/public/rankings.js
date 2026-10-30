'use strict';
// Online ranking displays player records; historical account records stay stored separately.
let rankingTab='device',rankingVisit=0;
const rankAreas={country:'国・国旗',capital:'首都',terrain:'地形',heritage:'世界遺産',mixed:'総合'};
function rankingCondition(h){const c=JSON.parse(h.rankKey);return[allLabels()[h.mode]||h.mode,LEVELS[c.level]||c.level||'基本',c.countryLevel?COUNTRY_LEVELS[c.countryLevel]:'',c.region||'世界全体',scopeLabel[c.scope]||c.scope||'',c.category&&c.category!=='all'?terrainCategoryLabel(c.category):'',c.kind&&c.kind!=='all'?heritageKinds[c.kind]||c.kind:'',inputLabel(h.mode,c.input),h.n+'問',c.challenge?challengeLabel(c.challenge):'テスト',c.v===DATA_VERSION?'':'旧条件'].filter(Boolean).join(' / ')}
function challengeLabel(c){return({time:'タイムアタック',streak:'連続正解'})[c]||c}
function rankingTable(rows,ownId){if(!rows.length)return '<p>まだ記録がありません。</p>';return `<div class="tableScroll"><table class="rankingTable"><thead><tr><th>順位</th><th>プレイヤー</th><th>正解</th><th>達成日</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.mine||r.id===ownId?'mine':''}"><td>${r.rank||1+rows.filter(x=>x.right>r.right).length}</td><td><span aria-hidden="true">${esc(r.icon||'👤')}</span> ${esc(r.name||r.nickname)}${r.mine||r.id===ownId?' <small>自分</small>':''}</td><td>${r.right} / ${r.n||r.count}</td><td>${r.at===undefined?'—':new Date(r.at).toLocaleDateString('ja-JP')}</td></tr>`).join('')}</tbody></table></div>`}
rankings=()=>{
 if(!activePlayer||!playerAccess())return home();clearInterval(challengeTimer);view='rankings';rankingVisit++;
 app.innerHTML=`<button class="back" onclick="home()">← ホーム</button><span class="eyebrow">RANKINGS</span><h1>みんなの記録、自分のベスト。</h1><div class="rankingTabs" role="tablist" aria-label="ランキングの種類">${[['device','この端末のみんな'],['online','オンライン'],['personal','自分の記録']].map(([id,label])=>`<button role="tab" id="rankTab-${id}" data-rank-tab="${id}" aria-controls="rankingPanel" aria-selected="${rankingTab===id}">${label}</button>`).join('')}</div><section id="rankingPanel" class="card section" role="tabpanel"></section>`;
 document.querySelectorAll('[data-rank-tab]').forEach(b=>b.onclick=()=>{rankingTab=b.dataset.rankTab;rankings()});
 $('#rankingPanel').setAttribute('aria-labelledby','rankTab-'+rankingTab);
 if(rankingTab==='online')onlineRankingPanel();else localRankingPanel(rankingTab==='personal');
};
function localRankingPanel(personal){
 const panel=$('#rankingPanel');let rows=[],missing=0;
 try{
  const players=personal?(isGuest()?[activePlayer]:[readPlayerIndex().players.find(p=>p.id===activePlayer.id)]):readPlayerIndex().players;
  for(const p of players.filter(Boolean)){try{const d=p.id===activePlayer.id?db:readPlayerData(p.id).data;const best=collectRankingBests(d);for(const h of Object.values(best))rows.push({...h,id:p.id,name:p.name,icon:p.icon})}catch{missing++}}
 }catch{panel.innerHTML='<p>記録を読み込めませんでした。再読み込みしてください。</p>';return}
 panel.innerHTML=`<h2>${personal?'自分の記録':'この端末のみんな'}</h2><p class="note">同じ条件の自己ベストを比較します。同点は同順位です。</p>${missing?'<p role="status">一部の記録を読み込めませんでした。先生に確認してください。</p>':''}<label for="rankArea">分野</label><select id="rankArea">${Object.entries(rankAreas).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><label for="localGroup">学習条件</label><select id="localGroup"></select><div id="ownRank" role="status"></div><div id="localBoard"></div>${personal?'<details class="section"><summary>これまでの学習履歴</summary><div id="personalHistory"></div></details>':''}`;
 const areas=[...new Set(rows.map(r=>r.content||'country'))];if(areas.length)$('#rankArea').value=areas[0];
 const choose=()=>{const area=$('#rankArea').value,groups=[...new Map(rows.filter(r=>(r.content||'country')===area).map(r=>[r.rankKey,r])).values()];$('#localGroup').innerHTML=groups.map((h,i)=>`<option value="${i}">${esc(rankingCondition(h))}</option>`).join('');const draw=()=>{const key=groups[+$('#localGroup').value]?.rankKey,list=rows.filter(r=>r.rankKey===key).sort((a,b)=>b.right-a.right||a.at-b.at||a.id.localeCompare(b.id));$('#localBoard').innerHTML=rankingTable(list,activePlayer.id);const own=list.find(r=>r.id===activePlayer.id);$('#ownRank').textContent=own?`自分の順位：${1+list.filter(r=>r.right>own.right).length}位 · ${own.right}/${own.n}問`:'自分：未挑戦'};$('#localGroup').onchange=draw;draw()};$('#rankArea').onchange=choose;choose();
 if(personal){$('#personalHistory').innerHTML=db.history.length?`<div class="list">${db.history.slice(0,300).map(h=>`<p>${new Date(h.at).toLocaleDateString('ja-JP')} · ${esc(allLabels()[h.mode]||h.mode)} · ${h.right}/${h.n}問 · ${h.practice==='practice'?'練習':'テスト'}${h.complete===false?'（途中終了）':''}</p>`).join('')}</div>`:'<p>まだ学習履歴がありません。</p>'}
}
async function rankingAuthenticationHelp(){
 const target=$('#rankingIdentityHelp');if(!target)return;
 try{const r=await fetch('/api/rank/config',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const config=await r.json();if(!target.isConnected)return;
  if(config.authMode==='player-key')target.textContent='アカウントへのログインは不要です。この端末のプレイヤー専用情報でオンライン記録を保護します。ゲストは閲覧のみです。元のサイトの記録は元のサイトに残ります。ブラウザのデータを消すと、同じオンライン記録を操作できなくなります。';
 }catch{}
}
function onlineRankingPanel(){
 const panel=$('#rankingPanel');panel.innerHTML=`<h2>オンラインランキング</h2><p>${esc(activePlayer.icon)} ${esc(activePlayer.name)}</p><p class="note">プレイヤーごとの自己ベスト。同点は同順位・先に達成した順です。時間は順位に使いません。</p><label for="department">部門</label><select id="department">${Object.entries(officialDepartments).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><p class="note">世界全体・ヒントなし・回答方法は固定。挑戦は開始から1時間で終了します。</p><div class="row"><button class="primary" id="officialStart">この部門に挑戦</button><button id="rankReload">ランキングを再取得</button></div><p id="onlineMessage" role="status" aria-live="polite"></p><div id="onlineBoard"></div><details class="section"><summary>オンライン利用・記録の引き継ぎ</summary><p id="rankingIdentityHelp">オンラインは通信とサイトへのログインが必要です。<a href="/signin-with-chatgpt?return_to=%2Fplay.html" target="_top">サイトにログイン</a></p><p>バックアップの読み込みは新しいプレイヤーとして追加します。オンライン記録は自動で引き継ぎません。元の端末・同じログインアカウントで、元のプレイヤーから確認してください。</p></details>`;
 $('#department').onchange=()=>void loadLeaderboard();$('#rankReload').onclick=()=>void loadLeaderboard();
 $('#officialStart').disabled=isGuest()||navigator.onLine===false;
 $('#officialStart').onclick=async()=>{const id=activePlayer.id,epoch=playerEpoch,visit=rankingVisit,dept=$('#department').value,b=$('#officialStart');b.disabled=true;playerBusy=true;try{await rankPrepare(id);if(epoch!==playerEpoch||!playerAccess()||activePlayer?.id!==id||visit!==rankingVisit||view!=='rankings')return;const r=await apiRank('start',{department:dept});if(epoch!==playerEpoch||!playerAccess()||activePlayer?.id!==id)return;officialRun={...r,localPlayerId:id,departmentId:dept};sessionStorage.setItem('world-master:official',JSON.stringify(officialRun));officialQuestion()}catch(err){if($('#onlineMessage'))$('#onlineMessage').textContent=err.message}finally{playerBusy=false;if(b.isConnected)b.disabled=isGuest()||navigator.onLine===false}};
 try{const previous=JSON.parse(sessionStorage.getItem('world-master:official')||'null');if(previous?.player&&previous.localPlayerId===activePlayer.id&&previous.version===DATA_VERSION&&previous.question&&!isGuest()&&navigator.onLine!==false){const b=document.createElement('button');b.id='resumeOfficial';b.textContent='中断した公式問題を再開';b.onclick=()=>{if(!playerAccess())return;officialRun={...previous,sending:false};officialQuestion()};$('#onlineBoard').before(b)}}catch{}
 void rankingAuthenticationHelp();
 void loadLeaderboard();
}
loadLeaderboard=async()=>{
 const visit=rankingVisit,id=activePlayer?.id,department=$('#department')?.value;if(!department)return;
 const stamp=department;$('#onlineMessage').textContent='順位を取得中…';
 try{
  if(navigator.onLine===false)throw Error('オフラインです。接続後に再取得してください。');
  if(!isGuest()){$('#onlineMessage').textContent='名前・アイコンを同期しています…';await rankPrepare(id);}
  const j=await apiRank('leaderboard?department='+encodeURIComponent(department));
  if(view!=='rankings'||rankingTab!=='online'||visit!==rankingVisit||activePlayer?.id!==id||!playerAccess()||$('#department')?.value!==stamp)return;
  $('#onlineMessage').textContent=isGuest()?'ゲストは閲覧のみです。':j.own?`自分の順位：${j.own.rank}位 · ${j.own.right_count}/${j.own.question_count}問`:'自分：未挑戦';
  $('#onlineBoard').innerHTML=rankingTable(j.rows);
 }catch(err){if(view==='rankings'&&rankingTab==='online'&&visit===rankingVisit&&activePlayer?.id===id&&playerAccess()){$('#onlineMessage').textContent=err.message;$('#onlineBoard').innerHTML='<p>「ランキングを再取得」で再試行できます。</p>'}}
};
const rankingAPI=apiRank;apiRank=async(action,body)=>{
 if(navigator.onLine===false)throw Error('オンライン機能は接続後に利用できます。');
 if(action.startsWith('legacy')||isGuest()&&action.startsWith('leaderboard'))return rankingAPI(action,body);
 if(!activePlayer||isGuest()||!playerAccess())throw Error('本人のパスワードで入り直してください。');
 const id=activePlayer.id,epoch=playerEpoch;
 if(action==='answer'&&(!officialRun||officialRun.localPlayerId!==id))throw Error('この挑戦のプレイヤーが一致しません。');
 const response=await fetch('/api/rank/'+action,{method:body?'POST':'GET',credentials:'same-origin',headers:{...rankHeaders(id),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const j=await response.json();if(!response.ok)throw Error(j.error||'接続できませんでした');if(epoch!==playerEpoch||activePlayer?.id!==id||!playerAccess())throw Error('本人確認をしてから再開してください。');return j;
};
const rankingOfficialAnswer=officialAnswer;officialAnswer=async choice=>{if(!activePlayer||isGuest()||!playerAccess()||officialRun?.localPlayerId!==activePlayer.id||playerBusy)return;playerBusy=true;try{return await rankingOfficialAnswer(choice)}finally{playerBusy=false}};
window.addEventListener('storage',e=>{if(view==='rankings'&&playerAccess()&&(e.key===PLAYER_INDEX||e.key?.startsWith(PLAYER_PREFIX))&&rankingTab!=='online')rankings()});

// Retry previously authorized profile edits after restarting online.
void rankSyncPending();
