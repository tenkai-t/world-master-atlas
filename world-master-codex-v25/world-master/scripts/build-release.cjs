// Deterministic app identity: generated from deployable content, never a hand-maintained comparator.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.join(__dirname,'../public');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(d,f.name)):[path.join(d,f.name)]);
const excluded=new Set(['app-version.js','release.json','offline-manifest.json']);
const hash=crypto.createHash('sha256');for(const file of walk(root).filter(f=>!excluded.has(path.relative(root,f))).sort()){hash.update(path.relative(root,file));hash.update(fs.readFileSync(file))}
const notes=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/release-notes.json'),'utf8'));hash.update(JSON.stringify(notes));
const version=hash.digest('hex').slice(0,20),release={schema:1,version,label:notes.label+' · '+version.slice(0,8),notes:notes.notes};
fs.writeFileSync(path.join(root,'app-version.js'),'\'use strict\';\nconst WM_RELEASE='+JSON.stringify(release)+';\n');
cp.execFileSync(process.execPath,[path.join(__dirname,'build-offline-manifest.cjs')],{stdio:'inherit'});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'offline-manifest.json')));
fs.writeFileSync(path.join(root,'release.json'),JSON.stringify({...release,materialVersion:manifest.version},null,2)+'\n');console.log('App release '+release.label+' / materials '+manifest.version);
