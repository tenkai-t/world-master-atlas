"""Merge separately researched, visually reviewed photo manifests, preserving existing photos and quiz levels."""
from pathlib import Path
import json,hashlib,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parent
path=ROOT/'public/assets/heritage.json'
base=json.loads(subprocess.check_output(['git','show','HEAD:public/assets/heritage.json'],cwd=ROOT))
rows=json.loads(path.read_text()); byid={q['id']:q for q in rows}; added=[]
for name in ['heritage-photos-even.json','heritage-photos-odd.json']:
 p=ROOT/name
 if not p.exists():continue
 raw=json.loads(p.read_text())
 entries=raw if isinstance(raw,list) else raw.get('photos',raw)
 if isinstance(entries,dict):entries=[dict(id=k,**v) for k,v in entries.items()]
 for item in entries:
  key=item.get('id');key='wh-'+str(key) if not str(key).startswith('wh-') else key
  q=byid[key]
  if q['photo']:continue
  photo=item['photo'];required=['path','fileTitle','author','license','licenseUrl','sourcePage','sourceUrl','changes','checked','sha256']
  assert all(photo.get(k) for k in required),(key,'missing photo fields')
  assert any(x in photo['license'] for x in ['CC BY','CC0','Public domain']), (key,photo['license'])
  file=ROOT/'public'/photo['path'];assert file.resolve().is_relative_to((ROOT/'public/assets/heritage').resolve())
  assert hashlib.sha256(file.read_bytes()).hexdigest()==photo['sha256']
  with Image.open(file) as im:im.verify()
  q['learningLevel']='advanced' if q['transnational'] or len(q['positions'])>3 else 'all'
  q['photo']=photo;q['photoSubject']=item['photoSubject'];q['photoAnswers']=item.get('photoAnswers',[]);
  if item.get('photoHint'):q['photoHint']=item['photoHint']
  added.append(key)
for old in base:
 if old['photo']:assert byid[old['id']]==old,('changed existing photo record',old['id'])
assert len(rows)==len(base) and {q['id'] for q in rows}=={q['id'] for q in base}
path.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
credits=ROOT/'public/licenses/heritage-photo-credits.json';oldcredits=json.loads(credits.read_text());existing={r['id'] for r in oldcredits}
for q in rows:
 if q['photo'] and q['id'] not in existing:oldcredits.append(dict(id=q['id'],subject=q['photoSubject'],**q['photo']))
credits.write_text(json.dumps(oldcredits,ensure_ascii=False,indent=2)+'\n')
print({'added':len(added),'withPhoto':sum(bool(q['photo']) for q in rows),'missing':sum(not q['photo'] for q in rows)})
