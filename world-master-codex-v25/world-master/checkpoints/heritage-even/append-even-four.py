import json,hashlib,html,re,shutil
from pathlib import Path
R=Path('/workspace/sites/world-master-atlas');C=R/'checkpoints/heritage-even';p=R/'heritage-photos-even.json';out=json.loads(p.read_text());before=json.loads(p.read_text());assert len(out)==23
rows=json.loads((C/'remaining-four-results.json').read_text());subjects={150:'マンモス・ケーブ国立公園のロタンダ（洞窟内部）',162:'アミアン大聖堂の西正面',164:'アルルのローマ円形闘技場',604:'ノヴゴロドの聖ソフィア大聖堂'};notes={150:'米国国立公園局の写真で、マンモス・ケーブの歴史的入口内側にあるロタンダを撮影。洞窟内部の実写である。',162:'Commonsの撮影対象と位置がアミアン大聖堂の西正面に一致し、登録物件そのものを写している。',164:'Commonsの撮影対象と位置がアルルのローマ円形闘技場に一致。UNESCOの登録説明で円形闘技場が構成要素に挙げられている。',604:'撮影地はヴェリーキー・ノヴゴロド。UNESCOの登録説明で聖ソフィア聖堂が構成要素に挙げられており、キーウ等の同名聖堂ではない。'}
def clean(v):return html.unescape(re.sub('<[^>]+>','',v or '')).strip()
for row in rows:
 id=row['id'];assert not any(q['id']==f'wh-{id}'for q in out);i=row['info'];e=i['extmetadata'];page=i['descriptionurl'];dest=R/f'public/assets/heritage/{id}.jpg';shutil.copyfile(row['file'],dest);author=clean(e.get('Artist',{}).get('value'));lic=clean(e['LicenseShortName']['value']);assert author and any(s in lic for s in ['CC BY','CC0','Public domain'])
 photo=dict(path=f'assets/heritage/{id}.jpg',fileTitle=row['title'],author=author,license=lic,licenseUrl=e.get('LicenseUrl',{}).get('value')or page+'#Licensing',sourcePage=page,sourceUrl=i['url'].split('?')[0],description=subjects[id]+'の実写写真。',changes='表示用に長辺900px以内へ縮小、JPEGとして保存。画像内容の改変なし。',checked='2026-10-17',sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
 answers={164:['アルルの円形闘技場','あるるのえんけいとうぎじょう','Arles Amphitheatre'],604:['ノヴゴロドの聖ソフィア大聖堂','のゔごろどのせいそふぃあだいせいどう']}.get(id,[])
 out.append(dict(id=f'wh-{id}',photo=photo,photoSubject=subjects[id],photoAnswers=answers,evidence=dict(unescoSource=f'https://whc.unesco.org/en/list/{id}',commonsSource=page,photoLocationEvidence=notes[id],visualReview='2026-10-17にコンタクトシートで被写体を目視確認。')))
assert out[:23]==before and len(out)==27
for q in out:
 ph=q['photo'];assert hashlib.sha256((R/'public'/ph['path']).read_bytes()).hexdigest()==ph['sha256']
p.write_text(json.dumps(out,ensure_ascii=False,indent=2));shutil.copyfile('/tmp/finish-even-four.py',C/'finish-even-four.py');shutil.copyfile('/tmp/append-even-four.py',C/'append-even-four.py')
checkpoint=R/'heritage-photos-even-checkpoint.md';text=checkpoint.read_text();text+='\n## Resume completion — 2026-10-17\n\nAll four pending files (150,162,164,604) were retrieved through one serial Commons imageinfo API request and standard thumbnail downloads, with fresh license/author/location metadata saved in `checkpoints/heritage-even/remaining-four-metadata.json`. The four-image contact sheet was visually reviewed. `remaining-four-results.json` and the acquisition/append scripts are retained alongside it. Arles author follows the Commons declared Artist field, `Peter_Glyn` (own work, CC0).\n\nFinal even manifest:27accepted IDs,0pending. Original23manifest objects preserved; all27bundled image hashes verified. No sharedheritageJSON/credits/UI/deployment changes.\n';checkpoint.write_text(text)
print('DONE 27 accepted, 0 pending; preserved previous23; verified all27 hashes')
