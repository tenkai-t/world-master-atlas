const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=path.join(__dirname,'../public');
const html=fs.readFileSync(path.join(root,'play.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)/g)].map(x=>x[1]);
const core=new Set(['play.html','style.css','manifest.webmanifest',...scripts,...['data','map','terrain','heritage','capitals','flag-ratios','learning-schema','hintbook','hint-coverage','handwriting'].map(n=>'assets/'+n+'.json')]);
const walk=d=>fs.readdirSync(path.join(root,d),{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(d+'/'+f.name):[d+'/'+f.name]);
for(const f of [...walk('assets/flags-native'),...walk('icons/atlas-v1'),...walk('licenses'),...walk('assets/fonts')])if(!/master|original|\.md$/.test(f)||f.startsWith('licenses/'))core.add(f);
const heritage=JSON.parse(fs.readFileSync(path.join(root,'assets/heritage.json'),'utf8'));
const photos=[...new Set(heritage.filter(q=>q.photo).map(q=>q.photo.path.replace(/^\//,'')))];
const handwriting=walk('vendor/kanjicanvas');
function file(f){const b=fs.readFileSync(path.join(root,f));return{url:'/'+f,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}}
const packs={core:[...core].sort().map(file),photos:photos.sort().map(file),handwriting:handwriting.sort().map(file)};
const version=crypto.createHash('sha256').update(JSON.stringify(packs)).digest('hex').slice(0,20);
fs.writeFileSync(path.join(root,'offline-manifest.json'),JSON.stringify({schema:1,version,packs},null,2)+'\n');
console.log(Object.fromEntries(Object.entries(packs).map(([k,v])=>[k,{files:v.length,bytes:v.reduce((n,f)=>n+f.bytes,0)}])));
