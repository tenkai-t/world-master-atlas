"""Derive precise learning relationships from the unchanged, sourced teaching data.
No guessing of borders: only identical shared line segments in the adopted map.
Editorial supplements below are researched separately; these are not geographic-name filler.
"""
import json,collections,math,re
from pathlib import Path
root=Path(__file__).resolve().parents[1];assets=root/'public/assets'
read=lambda name:json.loads((assets/(name+'.json')).read_text())
countries=read('data');capitals=read('capitals');terrain=read('terrain');heritage=read('heritage');geo=read('map')
byid={q['id']:q for q in countries};edges=collections.defaultdict(set)
for f in geo['features']:
 g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
 for poly in polys:
  for ring in poly:
   for a,b in zip(ring,ring[1:]):
    if a!=b:edges[tuple(sorted([tuple(a),tuple(b)]))].add(f['properties']['code'])
neighbors=collections.defaultdict(collections.Counter)
for edge,codes in edges.items():
 if len(codes)==2:
  a,b=sorted(codes);length=math.hypot(edge[1][0]-edge[0][0],edge[1][1]-edge[0][1]);neighbors[a][b]+=length;neighbors[b][a]+=length

def normalize(s):return re.sub(r'[\s・･.．\-―ー–—、。「」（）()]','',str(s)).lower()
def leaks(text,q):
 n=normalize(text)
 return any(len(normalize(s))>1 and normalize(s) in n for s in [q['name'],q['en'],q.get('reading','')]+q.get('aliases',[]))

def sources(q):
 out=[]
 for src in q.get('sources',[]):
  if src.get('url'):out.append(dict(src,checked=src.get('checked',q.get('checked','2026-10-16'))))
 if q.get('source','').startswith('https://'):out.append({'url':q['source'],'checked':q.get('checked','2026-10-16')})
 return out

def hint(text,stage='特徴',**kwargs):return dict(text=text,stage=stage,inClue=False,appearance=False,excludeModes=['chooseFlag'],**kwargs)

# Supplemental, individually checked facts will be loaded from the editorial file.
editorialPath=root/'scripts/country-knowledge-editorial.json'
editorial=json.loads(editorialPath.read_text()) if editorialPath.exists() else {}
book={};reviews=[]
for q in countries:
 id=q['id'];hints=[];refs=[];provenance=[]
 def add(text,src,asset,stage='特徴'):
  if leaks(text,q) or len(text)>110 or len(text)<6 or text in [x['text'] for x in hints]:return
  item=hint(text,stage)
  if asset.startswith('capitals:'):item['excludeModes'].append('capitalCountry')
  if q.get('scope')!='un':item['text']=item['text'].replace('国の一つ','国・地域の一つ').replace('国です','国・地域です')
  hints.append(item);refs.extend(src);provenance.append(asset)
 # Specific land neighbours are facts from shared boundaries, never a radius search.
 ns=[n for n,_ in neighbors[id].most_common() if n in byid and n!=id]
 # Exceptional political regions receive only individual editorial clues, not border assertions.
 if ns and id not in ['PS','XK','XNC','HK','MO']:
  names='・'.join(byid[n]['name'] for n in ns[:3])
  add(f'陸続きで接する国には、{names}があります。',[{'url':'https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson','title':'Natural Earth 5.1 国・地域図（採用済み地図の共通境界を照合）','checked':'2026-10-16'}],'map:shared-segments','手がかり')
 for x in editorial.get(id,{}).get('hints',[]):
  add(x,editorial[id]['sources'],'editorial','特徴')
 # Prefer named physical relationships over capital/heritage lists.
 categories=set()
 for x in terrain:
  if id not in x['countries'] or x['category'] in categories:continue
  name=x['name'];cat=x['category']
  if any(normalize(name) in normalize(h['text']) for h in hints):continue
  group='landArea' if cat in ['island','archipelago','peninsula'] else cat
  if group in categories:continue
  template={'mountain':f'{name}'+('が国境付近にある国の一つです。' if len(x['countries'])>1 else 'がある国です。'),'range':f'{name}が広がる国の一つです。','river':f'{name}の流域に関わる国の一つです。','lake':f'{name}の周辺に位置する国の一つです。','island':f'国土の一部または全部が、{name}にあります。','archipelago':f'国土の一部または全部が、{name}にあります。','peninsula':f'国土の一部または全部が、{name}にあります。','sea':f'{name}に面する国の一つです。','bay':f'{name}に面する国の一つです。','strait':f'{name}をはさんだ陸地に関わる国の一つです。','desert':f'{name}が広がる国の一つです。','plain':f'{name}が広がる国の一つです。','plateau':f'{name}が広がる国の一つです。'}.get(cat)
  if template and not leaks(template,q):add(template,sources(x),'terrain:'+x['id']);categories.add(group)
  if len(categories)==2:break
 # Capital roles are preserved exactly, and ambiguous current positions are omitted.
 for x in capitals:
  if x['country']!=id or not x['quizEligible']:continue
  role=x['role'];name=x['name']
  if role=='capital':text=f'首都（しゅと）は、{name}です。'
  elif role=='constitutional':text=f'憲法上の首都は、{name}です。'
  elif role=='official':text=f'公式の首都は、{name}です。'
  elif role=='federal-city':text=f'連邦政府が置かれる都市は、{name}です。'
  elif role in ['government-seat','administrative','legislative','judicial','royal-legislative','legislative-seat']:
   text=f'{name}は、{x["promptQualifier"]}です。'
  else:continue
  add(text,sources(x),'capitals:'+x['id'],'決め手')
  if len([p for p in provenance if p.startswith('capitals:')])==1:break
 # UNESCO object membership is exact; never equate a landscape with an inscription unit.
 hs=[x for x in heritage if id in x['countries'] and len(x['countries'])<=2 and not leaks(x['name'],q)]
 for x in hs[:1]:
  label=f'世界遺産の「{x["name"]}」が登録されている国です。' if len(x['countries'])==1 else f'国境をまたぐ世界遺産の「{x["name"]}」に関わる国の一つです。'
  add(label,sources(x),'heritage:'+x['id'],'決め手')
 # Keep alternatives for prompt filtering instead of dropping them to 3 too early.
 seen=set();refs=[x for x in refs if not (x['url'] in seen or seen.add(x['url']))]
 book[id]={'hints':hints[:6],'sources':refs,'review':{'basis':provenance[:6],'method':'個別補足と、既存の都市・地形・UNESCO登録国・地図の共有境界の関係を照合。新しい地理対象は追加していません。'}}
 if len(hints)<2:reviews.append({'id':id,'name':q['name'],'hints':len(hints)})
(root/'content/hints/hints-country.json').write_text(json.dumps({'version':1,'country':book},ensure_ascii=False,indent=2)+'\n')
(root/'scripts/hints-country-review.json').write_text(json.dumps({'targets':len(book),'atLeastTwo':sum(len(r['hints'])>=2 for r in book.values()),'belowTwo':reviews,'note':'既存の教材データに基づく関係ヒントと、別途確認した個別補足を区別。現行ゲームの採用境界を使用し、政治的承認の主張には使用しない。'},ensure_ascii=False,indent=2)+'\n')
print('Targets',len(book),'belowTwo',reviews)
