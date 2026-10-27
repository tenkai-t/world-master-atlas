exec(open('/tmp/heritage-even.py').read().split('\nresults=[]')[0])
import concurrent.futures as F
Q[4]="L'Anse aux Meadows"
# Empty search is retried with the conventional official place spelling.
(C/'4.json').unlink(missing_ok=True)
results=json.loads((C/'results.json').read_text());done={v['id'] for v in results}
def dl(id,pages):
 for p in pages:
  i=p['imageinfo'][0];e=i.get('extmetadata',{});lic=clean(e.get('LicenseShortName',{}).get('value'));u=i.get('thumburl',i['url']).split('?')[0]
  if not any(v in lic for v in ['CC BY','CC0','Public domain'])or not re.search(r'\.(jpg|jpeg|png)$',u,re.I):continue
  n=p.get('index',1);f=C/f'{id}-{n}.jpg'
  try:
   if not f.exists():f.write_bytes(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://commons.wikimedia.org/'}),timeout=35).read())
   im=Image.open(f);im.thumbnail((900,900));im.convert('RGB').save(f,quality=87)
   print(id,'photo',p['title'],flush=True);return dict(id=id,n=n,title=p['title'],info=i,file=str(f))
  except Exception as ex:
   print(id,n,'download',str(ex)[:100],flush=True)
   if '429' in str(ex):time.sleep(25)
 print(id,'NO PHOTO',flush=True)
pool=F.ThreadPoolExecutor(max_workers=2);pending=[]
for id,q in Q.items():
 if id in done:continue
 try:
  d=api(id,q);pages=sorted(d.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',0));print(id,'metadata',len(pages),flush=True);pending.append(pool.submit(dl,id,pages))
 except Exception as ex:
  print(id,'metadata error',str(ex)[:100],flush=True)
  if '429' in str(ex):time.sleep(30)
 for f in pending[:]:
  if f.done():
   r=f.result();pending.remove(f)
   if r:results.append(r)
 (C/'results.json').write_text(json.dumps(results,ensure_ascii=False))
for f in F.as_completed(pending):
 r=f.result()
 if r:results.append(r)
 (C/'results.json').write_text(json.dumps(results,ensure_ascii=False))
print('DONE',len(set(r['id']for r in results)),flush=True)
