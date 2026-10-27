const fs=require('fs'),assert=require('node:assert/strict'),{harness,audit}=require('./scripts/hint-audit.cjs');
(async()=>{
 const h=await harness(),{e,w}=h;
 const original=e('JSON.stringify(editorialHintBook)'),book=JSON.parse(original);
 // A bad object, unknown id, bad individual clue, or wrong mode cannot poison other objects.
 book.capital['cap-jp-tokyo'].hints.push(null,{text:'invalid',onlyModes:['not-a-mode']});
 book.capital.bad={hints:[],sources:[]};book.terrain['terrain-mountain-02']=null;
 const checked=e(`normalizeHintbook(${JSON.stringify(book)})`);
 assert(checked.issues.length>=4);assert(checked.book.capital['cap-jp-tokyo'].hints.length>=2);
 assert(!checked.book.capital.bad);assert(!checked.book.terrain['terrain-mountain-02']);
 assert(checked.book.heritage['wh-252'].hints.length>=2);
 // A failed refresh retains the last good book and the exact question/input/history.
 e("capitalStart({ids:['cap-jp-tokyo'],input:'text',practice:'practice',count:1})");
 w.document.querySelector('#answer').value='東京';e('hint()');const input=w.document.querySelector('#answer'),history=w.document.querySelector('#hint').textContent;
 const realFetch=e('fetch');e('fetch=async()=>{throw Error("network")}');assert.equal(await e('loadHintbook()'),false);assert.equal(e('JSON.stringify(editorialHintBook)'),original);assert.equal(w.document.querySelector('#answer'),input);assert.equal(input.value,'東京');assert.equal(w.document.querySelector('#hint').textContent,history);
 // Reloading source data updates only available clues; no new usage is counted without display.
 const hint=e('session.hint'),s=e('session');
 const b=w.document.createElement('button'),note=w.document.createElement('p');note.className='hintLoadError';note.append(b);w.document.querySelector('#hint').after(note);
  e('window.setFetch=function(value){fetch=value}');e('window.setFetch')(realFetch);
 await e('retryHintbook')(b);assert.equal(e('session'),s);assert.equal(e('session.hint'),hint);assert.equal(w.document.querySelector('#answer'),input);assert.equal(input.value,'東京');assert(w.document.querySelector('#hint').textContent.includes(history.replace('この問題のヒントはすべて表示しました','')));
 e("capitalStart({ids:['cap-jp-tokyo'],input:'text',practice:'test',count:1})");e('hint()');e('readingHint()');assert.equal(e('session.hint'),0);assert(!w.document.querySelector('#readingHint'));
 // Render the real question DOM for every format, independently of audit fixtures.
 const beforeTests=e('testTotals().n');
 for(const [content,id] of [['country','JP'],['capital','cap-fr-paris'],['terrain','terrain-river-01'],['heritage','wh-252']])for(const mode of e(`Object.keys(modesFor('${content}'))`)){
  e(`beginExpanded({content:'${content}',ids:['${id}'],mode:'${mode}',input:'choice',practice:'practice',count:1})`);
  if(mode==='chooseFlag'){assert.equal(e('session.hintHistory.available.length'),0);assert(!w.document.querySelector('button[onclick="hint()"]'));e('hint()');assert.equal(e('session.hint'),0);continue}
  assert(e('session.hintHistory.available.length')>=2,content+':'+mode);
  assert(!w.document.querySelector('#readingHint'));
  e('hint()');const first=w.document.querySelector('#hint').textContent;
  e('leave()');w.document.querySelector('#modal').close();assert.equal(w.document.querySelector('#hint').textContent,first);
  for(let n=0;n<8;n++)e('hint()');const count=e('session.hint'),shown=w.document.querySelector('#hint').textContent;
  assert(count>=2&&count<=3);assert(shown.includes(first));assert(shown.includes('すべて表示しました'));
  e('hint()');assert.equal(e('session.hint'),count);e('submitAnswer(true)');assert.equal(w.document.querySelector('#hint').textContent,shown);
  e('next()');assert.equal(e('view'),'result');e('home()');
 }
 assert.equal(e('testTotals().n'),beforeTests);h.close();
 const report=await audit();assert.equal(report.issues.length,0);
 for(const [content,group] of Object.entries(report.categories)){
  assert.equal(group.authored,group.targets,content+': all eligible objects need reviewed records');
  for(const [mode,summary] of Object.entries(group.modes).filter(([m])=>m!=='chooseFlag'))assert.equal(summary.twoOrMore,summary.eligible,content+':'+mode+': every eligible target has at least two useful candidate hints');
 }
 const bookRaw=JSON.parse(fs.readFileSync('public/assets/hintbook.json','utf8'));
 for(const content of ['country','capital','terrain','heritage'])for(const [id,r] of Object.entries(bookRaw[content])){
  assert(r.sources.length&&r.sources.every(s=>/^https?:\/\//.test(s.url)&&/^\d{4}-\d{2}-\d{2}$/.test(s.checked)),id);
  assert(r.hints.length>=2,id);assert(r.hints.every(x=>x.text.length>=6&&x.text.length<=110),id);
 }
 console.log('PASS hintbook: full target inventory, all mode/answer filters, per-item schema quarantine, last-good book and input/history retention on refresh failure, retry/no phantom usage, tests remain hint-free');
})().catch(err=>{console.error(err);process.exit(1)});
