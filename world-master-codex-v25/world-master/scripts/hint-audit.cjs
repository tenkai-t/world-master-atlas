const fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'../public/');
async function harness(assetRoot=root){
 const dom=new JSDOM(fs.readFileSync(assetRoot+'play.html','utf8'),{url:'https://audit.local/play.html',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:720,height:420});
 const salt='0123456789abcdef0123456789abcdef',v={algorithm:'PBKDF2-SHA256',iterations:600000,salt,hash:require('node:crypto').pbkdf2Sync('1234',Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex'),version:'audit-fixture'};w.localStorage.setItem('world-master:security:v1',JSON.stringify({schema:1,players:{legacy:v},admin:v,minutes:5}));const timers=[];const sandbox={TextEncoder,document:w.document,navigator:{locks:{request:async(_k,fn)=>fn()}},localStorage:w.localStorage,sessionStorage:w.sessionStorage,crypto:require('node:crypto').webcrypto,console,setTimeout,clearTimeout,setInterval:(...args)=>{const id=setInterval(...args);timers.push(id);return id},clearInterval,URL,Blob,performance,AbortController,addEventListener:w.addEventListener.bind(w),fetch:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(assetRoot+p,'utf8'))})};
 sandbox.window=sandbox;const ctx=vm.createContext(sandbox),e=s=>vm.runInContext(s,ctx);
 for(const tag of w.document.scripts){const file=new URL(tag.src).pathname.slice(1);vm.runInContext(fs.readFileSync(assetRoot+file,'utf8'),ctx,{filename:file})}
 await e('playersReady');for(let i=0;i<100&&w.document.querySelector('#app').textContent.includes('世界地図を準備しています');i++)await new Promise(r=>setTimeout(r,10));await e("selectPlayer('legacy')");w.document.querySelector('#loginPin').value='1234';await w.document.querySelector('#securityLogin').onsubmit({preventDefault(){}});
 function fixture(q,cfg){
  const content=cfg.content,m=cfg.mode;let title='示された対象の名前は？';
  if(m==='capitalName')title=e(`capCountry(${JSON.stringify(q)}).name`)+'の'+q.promptQualifier+'は？';
  if(m==='capitalCountry')title=q.name+'（'+q.promptQualifier+'）がある国は？';
  if(m==='capitalFlag')title='この旗の国の'+q.promptQualifier+'は？';
  if(m==='chooseFlag')title=q.name+'の旗は、どれ？';
  if(m==='location'||/Location$/.test(m))title=q.name+'は、どこ？';
  if(m==='heritageCountry')title=q.name+'の所在国をすべて選ぼう';
  if(m==='heritageType')title=q.name+'は、どの種類？';
  const app=w.document.querySelector('#app');app.innerHTML='<section class="answerPanel"><h2></h2></section>';app.querySelector('h2').textContent=title;
  if(m.endsWith('Clue')){const clue=w.document.createElement('p');clue.className='clue';clue.textContent=e(`safeClue(${JSON.stringify(q)},'${content}')`);app.append(clue)}
  if(content==='heritage'&&q.photo&&!['heritageMap','heritageLocation','heritageClue'].includes(m))app.insertAdjacentHTML('beforeend','<div id="heritageVisual"><div class="heritagePhoto"><img alt="出題写真"></div></div>');
  if(m==='heritagePhoto'&&q.photoHint){const p=w.document.createElement('p');p.className='notice';p.textContent=q.photoHint;app.querySelector('.answerPanel').append(p)}
  e('session='+JSON.stringify({cfg,queue:[q],i:0,done:false,options:[]}));e('view="game"');
 }
 return{w,e,fixture,close:()=>{timers.forEach(clearInterval);w.close()}};
}
async function audit(assetRoot=root,configure){
 const h=await harness(assetRoot);if(configure)await configure(h);const {e}=h,report={version:1,checked:'2026-10-23',method:'実際のヒント関数を、各形式の問題文・写真の有無を再現したDOMで全対象に適用。2件以上は件数上の基準であり、内容の事実確認を代替しません。',contentReview:{country:'既存教材の首都・地形・UNESCO登録国・採用地図の共有境界を照合し、不足する島嶼等は個別資料で補足。',capital:'都市別の地理・歴史資料を確認。公式観光・自治体・議会・UNESCO等に加え百科事典記事を使用し、すべてを一次資料で再確認したものではありません。',terrain:'地形別に公式機関・国立公園・河川管理機関・研究資料などの本文または検索本文で確認。一部は直接閲覧に制限があります。',heritage:'UNESCOの各登録ページ108件を確認し、登録単位ごとに要約。外観と特徴問題の既出内容を区別。',flags:'ゲームが採用している205の原寸比SVGを比較シートで目視し、色・配置・模様を説明。法律上の規格を新たに認定するものではありません。'},categories:{},missing:[],issues:e('typeof hintbookIssues!=="undefined"?hintbookIssues:[]')};
 for(const content of ['country','capital','terrain','heritage']){
  const source=e(({country:'data',capital:'capitals.filter(q=>q.quizEligible)',terrain:'terrain',heritage:'heritage'})[content]);
  const category=report.categories[content]={targets:source.length,authored:e(`editorialCount('${content}')`),modes:{}};
  const completed=new Set(source.map(q=>q.id));
  for(const mode of e(`Object.keys(modesFor('${content}'))`)){
   if(mode==='chooseFlag'){category.modes[mode]={eligible:source.length,provided:false,reason:'国名から国旗は答えの漏えいを避けるためヒントなし'};continue}
   const pool=source.filter(q=>!['silhouette','rotated'].includes(mode)||e(`hasCountryShape(${JSON.stringify(q)})`)).filter(q=>mode!=='heritagePhoto'||q.photo);
   const summary=category.modes[mode]={eligible:pool.length,twoOrMore:0,one:0,none:0};
   for(const q of pool){const cfg={content,mode,input:'choice',practice:'practice',region:'世界全体',level:content==='country'?'countryMaster':'advanced'};h.fixture(q,cfg);const hints=e(`studyHints(${JSON.stringify(q)},${JSON.stringify(cfg)})`);
    if(hints.length>=2)summary.twoOrMore++;else{summary[hints.length?'one':'none']++;completed.delete(q.id);report.missing.push({content,id:q.id,name:q.name,mode,validHints:hints.length})}
   }
  }
  category.twoOrMoreInEveryEligibleMode=completed.size;
 }
 h.close();return report;
}
module.exports={harness,audit};
if(require.main===module)audit().then(report=>{const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.categories,null,2))}).catch(err=>{console.error(err);process.exit(1)});
