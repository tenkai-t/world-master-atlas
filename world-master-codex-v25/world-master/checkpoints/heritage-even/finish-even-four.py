import json,urllib.request,urllib.parse,html,re,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
R=Path('/workspace/sites/world-master-atlas');C=R/'checkpoints/heritage-even';titles={150:'File:Rotunda in Mammoth Cave, NPS Photo (2649cd25-059e-442a-a255-329df533ee5f).jpg',162:'File:Amiens, cathedral Notre-Dame, the west facade.JPG',164:'File:Arles Amphitheater.jpg',604:'File:Saint Sophia Cathedral in Novgorod pic1.JPG'}
u='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(dict(action='query',titles='|'.join(titles.values()),prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=900,format='json'))
p=C/'remaining-four-metadata.json'
if not p.exists():p.write_bytes(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'WorldMasterAtlas/1.0 educational map'}),timeout=40).read())
d=json.loads(p.read_text());results=[]
for page in d['query']['pages'].values():
 id=next(k for k,v in titles.items()if v==page['title']);i=page['imageinfo'][0];f=C/f'{id}-final.jpg';url=i.get('thumburl',i['url']).split('?')[0]
 if not f.exists():f.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://commons.wikimedia.org/'}),timeout=40).read())
 im=Image.open(f);im.thumbnail((900,900));im.convert('RGB').save(f,quality=87);results.append(dict(id=id,title=page['title'],info=i,file=str(f)));print(id,'DOWNLOADED',flush=True)
(C/'remaining-four-results.json').write_text(json.dumps(results,ensure_ascii=False));sheet=Image.new('RGB',(1200,440),'white');dr=ImageDraw.Draw(sheet)
for n,r in enumerate(results):
 im=Image.open(r['file']);im.thumbnail((295,400));sheet.paste(im,(n*300,0));dr.text((n*300,405),str(r['id'])+' '+r['title'][5:35],fill='black')
sheet.save(C/'remaining-four-contact.jpg')
