from pathlib import Path
import urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path('/tmp/world-share-font');root.mkdir(exist_ok=True)
for name in ['NotoSansJP[wght].ttf','OFL.txt']:
 p=root/name
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/'+urllib.parse.quote(name),timeout=45).read())
font=TTFont(root/'NotoSansJP[wght].ttf');text=Path('public/app.js').read_text()+Path('public/expansion.js').read_text()+'0123456789年月日/：・（）→'
opts=subset.Options();opts.recalc_bounds=True;sub=subset.Subsetter(options=opts);sub.populate(text=text);sub.subset(font)
for rec in font['name'].names:
 if rec.nameID in [1,3,4,6,16]:rec.string='WorldMasterShare'.encode(rec.getEncoding())
font.flavor=None;font.save(root/'WorldMasterShare.ttf');font.flavor='woff';font.save('public/assets/fonts/world-master-share.woff')
Path('public/licenses/NotoSansJP-OFL.txt').write_bytes((root/'OFL.txt').read_bytes())
print('Share font',Path('public/assets/fonts/world-master-share.woff').stat().st_size)
