"""Validate bundled heritage media, credits, immutable old records, and frozen learning levels."""
from pathlib import Path
import json,hashlib,subprocess
from PIL import Image
root=Path(__file__).resolve().parent
h=json.loads((root/'public/assets/heritage.json').read_text());old=json.loads(subprocess.check_output(['git','show','HEAD:public/assets/heritage.json'],cwd=root));credits=json.loads((root/'public/licenses/heritage-photo-credits.json').read_text());c={x['id']:x for x in credits};b={q['id']:q for q in old};new=[]
assert len(h)==len(old) and {q['id'] for q in h}==set(b)
for q in h:
 p=q.get('photo');o=b[q['id']]
 if o['photo']:assert o==q,('old record changed',q['id'])
 else:
  assert {k:v for k,v in q.items() if k not in ['photo','photoSubject','photoAnswers','learningLevel','photoHint']}=={k:v for k,v in o.items() if k not in ['photo','photoSubject','photoAnswers','learningLevel','photoHint']}
 if not p:continue
 for k in ['path','author','fileTitle','license','licenseUrl','sourcePage','sourceUrl','changes','checked','sha256']:assert isinstance(p.get(k),str) and p[k].strip(),(q['id'],k)
 assert p['path'].startswith('assets/heritage/') and '..' not in p['path']
 assert all(p[k].startswith(('https://','http://')) for k in ['licenseUrl','sourcePage','sourceUrl'])
 file=root/'public'/p['path'];assert hashlib.sha256(file.read_bytes()).hexdigest()==p['sha256'],q['id']
 with Image.open(file) as im:im.verify()
 assert q['id'] in c and c[q['id']]==dict(id=q['id'],subject=q['photoSubject'],**p)
 if not o['photo']:
  new.append(q['id']);assert q['learningLevel']==('advanced' if q['transnational'] or len(q['positions'])>3 else 'all')
assert len(c)==len(credits)==sum(bool(q['photo']) for q in h)
print({'total':len(h),'added':len(new),'withPhoto':len(c),'missing':len(h)-len(c),'oldPhotosPreserved':sum(bool(q['photo']) for q in old)})
