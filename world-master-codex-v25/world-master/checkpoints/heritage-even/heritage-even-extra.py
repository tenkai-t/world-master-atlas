exec(open('/tmp/heritage-even.py').read().split('\nresults=[]')[0])
exec(open('/tmp/heritage-even-fast.py').read().split('def dl(id,pages):')[1].split('\npool=')[0].join(['def dl(id,pages):','']))
import concurrent.futures as F
manual=[(4,'LanseAuxMeadows LargeBuilding.JPG','Clinton Pierce','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','https://upload.wikimedia.org/wikipedia/commons/c/c2/LanseAuxMeadows_LargeBuilding.JPG','Original Viking largest building archaeological outline at L’Anse aux Meadows, Canada; not a reconstructed building.'),(102,"Al Qal'a of Beni Hammad-108942.jpg",'Yvon Fruneau / UNESCO Photobank','CC BY-SA 3.0 IGO','https://creativecommons.org/licenses/by-sa/3.0/igo/','https://upload.wikimedia.org/wikipedia/commons/7/7f/Al_Qal%27a_of_Beni_Hammad-108942.jpg','Ruins of the first Hammadid capital, Al Qal’a of Beni Hammad, Algeria.'),(136,'Garamba National Park overhead.jpg','Nuria Ortega','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','https://upload.wikimedia.org/wikipedia/commons/1/1d/Garamba_National_Park_overhead.jpg','Aerial view of Garamba National Park, Democratic Republic of the Congo.'),(130,'Richard Ellis, Hal Saflieni Hypogeum (large room with painted ceiling).jpg','Richard Ellis (1842–1924)','Public domain','https://commons.wikimedia.org/wiki/Template:PD-old-90','https://upload.wikimedia.org/wikipedia/commons/2/22/Richard_Ellis%2C_Hal_Saflieni_Hypogeum_%28large_room_with_painted_ceiling%29.jpg','Historical photograph of the large room with painted ceiling, Hal Saflieni Hypogeum, Malta, by Richard Ellis.')]
jobs=[]
for id,title,author,lic,lu,u,desc in manual:
 thumb=u.replace('/commons/','/commons/thumb/')+'/960px-'+u.rsplit('/',1)[1]
 if id in [102,136,130]:thumb=u
 info=dict(url=u,thumburl=thumb,descriptionurl='https://commons.wikimedia.org/wiki/File:'+urllib.parse.quote(title.replace(' ','_'),safe=''),extmetadata={k:dict(value=v)for k,v in dict(Artist=author,LicenseShortName=lic,LicenseUrl=lu,ImageDescription=desc).items()});jobs.append((id,[dict(title='File:'+title,index=100,imageinfo=[info])]))
for id,n in [(162,4),(170,2),(246,2)]:
 d=json.loads((C/f'{id}.json').read_text());p=next(p for p in d['query']['pages'].values()if p['index']==n);jobs.append((id,[p]))
results=json.loads((C/'results.json').read_text())
with F.ThreadPoolExecutor(max_workers=2)as pool:
 for r in pool.map(lambda v:dl(*v),jobs):
  if r:results.append(r)
  (C/'results.json').write_text(json.dumps(results,ensure_ascii=False))
print('EXTRAS DONE',flush=True)
