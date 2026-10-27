// Publish one runtime book; maintain reviewed authoring inputs separately from teaching data.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),assets=path.join(root,'public/assets');
const read=name=>JSON.parse(fs.readFileSync(path.join(assets,name+'.json'),'utf8'));
const book={...JSON.parse(fs.readFileSync(path.join(root,'content/hints/baseline-v1.json'),'utf8')),version:1,revision:2,checked:'2026-10-20',policy:'対象別に確認した事実を、答える内容・問題文・写真に合わせて最大3段階で提示。読みは入力問題専用の別補助。ヒントの取得・検証失敗はゲームの起動から分離。',country:{}};
const targets={country:new Set(read('data').map(q=>q.id)),capital:new Set(read('capitals').filter(q=>q.quizEligible).map(q=>q.id)),terrain:new Set(read('terrain').map(q=>q.id)),heritage:new Set(read('heritage').map(q=>q.id))};
const parts=['capital-a','capital-b','terrain','heritage','country','flags'];
for(const part of parts){
 const filename=path.join(root,'content/hints','hints-'+part+'.json');
 const fallback=path.join(assets,'hints-'+part+'.json');
 const input=JSON.parse(fs.readFileSync(fs.existsSync(filename)?filename:fallback,'utf8'));
 for(const content of Object.keys(targets))for(const [id,record] of Object.entries(input[content]||{})){
  assert(targets[content].has(id),part+': unknown or ineligible target '+id);
  assert(Array.isArray(record.hints)&&record.hints.length>=2,part+': too few candidate facts '+id);
  assert(record.sources?.length&&record.sources.every(s=>/^https?:\/\//.test(s.url)&&/^\d{4}-\d{2}-\d{2}$/.test(s.checked)),part+': invalid source '+id);
  for(const hint of record.hints)assert(typeof hint.text==='string'&&hint.text.length>=6&&hint.text.length<=110,part+': invalid clue '+id);
  if(part==='flags'){
   assert(book.country[id],part+': no country geography '+id);
   book.country[id].hints.push(...record.hints);
   const sources=[...book.country[id].sources,...record.sources];book.country[id].sources=sources.filter((s,i)=>sources.findIndex(x=>x.url===s.url&&x.checked===s.checked)===i);
  }else book[content][id]=record;
 }
}
// Explicit editorial overrides are applied last, so rebuilding cannot restore older CN clues.
const cn=JSON.parse(fs.readFileSync(path.join(root,'content/hints/china-override.json'),'utf8'));
const previous=book.country[cn.id];
book.country[cn.id]={hints:[...cn.hints,...previous.hints.map(h=>({...h,excludeModes:[...new Set([...(h.excludeModes||[]),...cn.nameModes])]}))],sources:[...previous.sources,...cn.sources]};
book.revision=3;book.checked=cn.checked;
for(const content of Object.keys(targets))assert.deepEqual(Object.keys(book[content]).sort(),[...targets[content]].sort(),content+': inventory differs');
fs.writeFileSync(path.join(assets,'hintbook.json'),JSON.stringify(book,null,2)+'\n');
console.log('Merged reviewed hint objects: '+JSON.stringify(Object.fromEntries(Object.keys(targets).map(k=>[k,Object.keys(book[k]).length]))));
