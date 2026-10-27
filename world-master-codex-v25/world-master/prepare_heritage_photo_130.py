"""Remove only printed book margins/caption from a newly sourced PD historical photograph."""
from pathlib import Path
import json,hashlib,shutil
from PIL import Image
root=Path(__file__).resolve().parent
photo=root/'public/assets/heritage/130.jpg';source=root/'checkpoints/heritage-even/130-source-before-margin-crop.jpg'
if not source.exists():shutil.copy2(photo,source)
with Image.open(source) as im:
 assert im.size==(900,660),im.size
 im.crop((114,110,794,555)).convert('RGB').save(photo,quality=88,optimize=True)
path=root/'heritage-photos-even.json';rows=json.loads(path.read_text());entry=next(x for x in rows if x['id']=='wh-130')
entry['photo']['sha256']=hashlib.sha256(photo.read_bytes()).hexdigest()
entry['photo']['changes']='表示用縮小後、書籍の余白と地名入りの印刷キャプションだけを除去。写真内の遺構・署名は改変していません。歴史写真。'
path.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
