import json,urllib.request,urllib.parse,re,html,hashlib,time
from pathlib import Path
from PIL import Image,ImageDraw
R=Path('/workspace/sites/world-master-atlas');C=Path('/tmp/heritage-even');C.mkdir(exist_ok=True)
Q={2:'Quito historic center panorama',4:'L Anse aux Meadows reconstructed houses',26:'Goree island house slaves',78:'Independence Hall Philadelphia exterior',84:'Vezelay basilica exterior',90:'Abu Mena ruins',100:'Durmitor Black Lake',102:'Beni Hammad fortress ruins',130:'Hal Saflieni Hypogeum interior',132:'Hagar Qim temple Malta',136:'Garamba National Park landscape',140:'Takht i Bahi monastery ruins',144:'Kilwa Kisiwani Great Mosque ruins',150:'Mammoth Cave National Park cave',158:'Head Smashed In Buffalo Jump cliff',160:'Fontainebleau palace courtyard',162:'Amiens cathedral facade',164:'Arles amphitheatre exterior',170:'Fes medina panorama',180:'Citadelle Laferriere Haiti',184:'Sabratha Roman theatre',208:'Bamiyan Buddha cliff',228:'Avignon palais des papes',246:'Konark Sun Temple exterior',356:'Hagia Sophia exterior Istanbul',604:'Novgorod Saint Sophia cathedral',1142:'Kumano Nachi Taisha waterfall'}
def clean(t):return html.unescape(re.sub('<[^>]+>','',t or '')).strip()
def api(id,q):
 p=C/f'{id}.json'
 if p.exists():return json.loads(p.read_text())
 u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',generator='search',gsrsearch=q+' filetype:bitmap',gsrnamespace=6,gsrlimit=4,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=800,format='json'))
 p.write_bytes(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'WorldMasterAtlas/1.0 educational map'}),timeout=30).read());return json.loads(p.read_text())
results=[]
for id,q in Q.items():
 try:
  d=api(id,q);pages=sorted(d.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',0));found=[]
  for p in pages:
   i=p['imageinfo'][0];e=i.get('extmetadata',{});lic=clean(e.get('LicenseShortName',{}).get('value'));u=i.get('thumburl',i['url']).split('?')[0]
   if not any(v in lic for v in ['CC BY','CC0','Public domain'])or not re.search(r'\.(jpg|jpeg|png)$',u,re.I):continue
   n=p.get('index',1);f=C/f'{id}-{n}.jpg'
   try:
    if not f.exists():
     raw=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://commons.wikimedia.org/'}),timeout=30).read();f.write_bytes(raw)
    im=Image.open(f);im.thumbnail((900,900));im.convert('RGB').save(f,quality=87)
    found.append(dict(id=id,n=n,title=p['title'],info=i,file=str(f)))
    # Two alternatives for visual verification, avoiding a single misleading search hit.
    if len(found)>=2:break
   except Exception as ex:print(id,n,'download',str(ex)[:90],flush=True)
  results.extend(found);print(id,'candidates',len(found),flush=True)
 except Exception as ex:print(id,'metadata',str(ex)[:110],flush=True)
 (C/'results.json').write_text(json.dumps(results,ensure_ascii=False))
# 8 candidates per sheet, readable source labels are printed separately.
for k in range(0,len(results),12):
 chunk=results[k:k+12];s=Image.new('RGB',(1200,((len(chunk)+3)//4)*210),'white');dr=ImageDraw.Draw(s)
 for j,v in enumerate(chunk):
  im=Image.open(v['file']);im.thumbnail((295,180));x=j%4*300;y=j//4*210;s.paste(im,(x,y));dr.text((x,y+181),f"{v['id']}-{v['n']} {v['title'][5:42]}",fill='black')
 s.save(C/f'contact-{k//12}.jpg')
print('DONE',len(results),flush=True)
