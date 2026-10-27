"""Append six terrain categories; keep preexisting categories byte-for-byte semantically.
Sources: Natural Earth 1:10 million. Marine label extents are clipped to ocean
so shaded areas represent water, not the uncut cartographic label polygons.
Run after make_terrain.py. Requires shapely; no hand-drawn geographic geometry.
"""
import json, urllib.request, hashlib
from pathlib import Path
from collections import Counter
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely import make_valid
ROOT=Path(__file__).resolve().parent
CACHE=Path('/tmp/world-terrain');CACHE.mkdir(exist_ok=True)
def layer(n):
 p=CACHE/(n+'.json')
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'+n+'.geojson').read())
 return json.loads(p.read_text())['features']
marine=layer('ne_10m_geography_marine_polys');landforms=layer('ne_10m_geography_regions_polys')
ocean=unary_union([make_valid(shape(f['geometry'])) for f in layer('ne_10m_ocean')])
# key | Japanese name | reading | region(s) | principal related countries | description
DATA={
'sea':'''Sea of Japan|日本海|にほんかい|アジア|JP KR KP RU|日本列島とアジア大陸の間にある海です。
East China Sea|東シナ海|ひがししなかい|アジア|CN JP TW|中国大陸の東、日本の南西諸島の西にある海です。
South China Sea|南シナ海|みなみしなかい|アジア|CN VN PH MY|東南アジアの大陸部と島々に囲まれた海です。
Sea of Okhotsk|オホーツク海|おほーつくかい|アジア|RU JP|北海道の北東、サハリンやカムチャツカ半島に囲まれた海です。
Red Sea|紅海|こうかい|アジア/アフリカ|EG SD ER SA YE|アフリカ北東部とアラビア半島の間の細長い海です。
Black Sea|黒海|こっかい|ヨーロッパ/アジア|TR BG RO UA RU GE|ヨーロッパ南東部とアナトリアの間にある海です。
North Sea|北海|ほっかい|ヨーロッパ|GB NO DK DE NL BE FR|グレートブリテン島とヨーロッパ大陸の間にある海です。
Caribbean Sea|カリブ海|かりぶかい|南北アメリカ|CU JM CO VE|中央アメリカと南アメリカ北岸、アンティル諸島の間の海です。
Arabian Sea|アラビア海|あらびあかい|アジア/アフリカ|IN PK OM SO|アラビア半島とインド半島の間に広がる海です。
Coral Sea|珊瑚海|さんごかい|オセアニア|AU PG SB|オーストラリア大陸の北東に広がる海です。''',
'bay':'''Bay of Bengal|ベンガル湾|べんがるわん|アジア|IN BD MM|インド半島の東側に広がる大きな湾です。
Gulf of Mexico|メキシコ湾|めきしこわん|南北アメリカ|MX US CU|北アメリカ南部とユカタン半島、キューバの間にある湾です。
Persian Gulf|ペルシャ湾|ぺるしゃわん|アジア|IR IQ KW SA QA AE BH|アラビア半島とイランの間にある湾です。
Hudson Bay|ハドソン湾|はどそんわん|南北アメリカ|CA|カナダ北東部に深く入り込む大きな湾です。
Gulf of Guinea|ギニア湾|ぎにあわん|アフリカ|GH NG CM GQ GA|西アフリカから中央アフリカの海岸に面する湾です。
Gulf of Alaska|アラスカ湾|あらすかわん|南北アメリカ|US CA|アラスカ南岸に面する北太平洋の湾です。
Bay of Biscay|ビスケー湾|びすけーわん|ヨーロッパ|FR ES|フランス西岸とスペイン北岸の間にある湾です。
Gulf of Thailand|タイ湾|たいわん|アジア|TH KH VN MY|インドシナ半島南部とマレー半島の間にある湾です。
Gulf of Aden|アデン湾|あでんわん|アジア/アフリカ|YE SO DJ|アラビア半島南岸とアフリカの角の間にある湾です。
Gulf of Carpentaria|カーペンタリア湾|かーぺんたりあわん|オセアニア|AU|オーストラリア大陸北部に入り込む湾です。''',
'strait':'''Strait of Gibraltar|ジブラルタル海峡|じぶらるたるかいきょう|ヨーロッパ/アフリカ|ES MA|イベリア半島とアフリカ北西岸の間で、大西洋と地中海を結ぶ海峡です。
Strait of Malacca|マラッカ海峡|まらっかかいきょう|アジア|MY ID TH|マレー半島とスマトラ島の間にある海峡です。
Taiwan Strait|台湾海峡|たいわんかいきょう|アジア|TW CN|台湾島と中国大陸の間にある海峡です。
Tsugaru Strait|津軽海峡|つがるかいきょう|アジア|JP|北海道と本州の間にある海峡です。
La Pérouse Strait|宗谷海峡|そうやかいきょう|アジア|JP RU|北海道とサハリンの間にある海峡です。
Korea Strait|対馬海峡|つしまかいきょう|アジア|JP KR|九州と朝鮮半島の間の海峡です。ここでは対馬の東西の水路を含む広い範囲を示します。
Bass Strait|バス海峡|ばすかいきょう|オセアニア|AU|オーストラリア大陸とタスマニア島の間の海峡です。
Cook Strait|クック海峡|くっくかいきょう|オセアニア|NZ|ニュージーランドの北島と南島の間にある海峡です。
Torres Strait|トレス海峡|とれすかいきょう|オセアニア|AU PG|オーストラリア大陸とニューギニア島の間にある海峡です。
Davis Strait|デービス海峡|でーびすかいきょう|南北アメリカ|CA GL|バフィン島とグリーンランド島の間にある海峡です。''',
'desert':'''SAHARA|サハラ砂漠|さはらさばく|アフリカ|DZ LY EG SD TD NE ML MR|アフリカ北部に広がる大きな砂漠です。
GOBI DESERT|ゴビ砂漠|ごびさばく|アジア|MN CN|モンゴルと中国北部に広がる乾燥地帯です。
TAKLIMAKAN DESERT|タクラマカン砂漠|たくらまかんさばく|アジア|CN|中国西部のタリム盆地にある砂漠です。
NAMIB DESERT|ナミブ砂漠|なみぶさばく|アフリカ|NA AO ZA|アフリカ南西部の大西洋岸に沿う砂漠です。
KALAHARI DESERT|カラハリ砂漠|からはりさばく|アフリカ|BW NA ZA|アフリカ南部の内陸に広がる乾燥地帯です。
DESIERTO DE ATACAMA|アタカマ砂漠|あたかまさばく|南北アメリカ|CL PE|南アメリカ西岸、アンデス山脈の西側にある砂漠です。
GREAT VICTORIA DESERT|グレートビクトリア砂漠|ぐれーとびくとりあさばく|オセアニア|AU|オーストラリア大陸南部の内陸にある砂漠です。
THAR DESERT|タール砂漠|たーるさばく|アジア|IN PK|インド北西部とパキスタン東部にまたがる砂漠です。
SONORAN DESERT|ソノラ砂漠|そのらさばく|南北アメリカ|US MX|アメリカ合衆国南西部とメキシコ北西部の砂漠です。
RUB’ AL KHALI|ルブアルハリ砂漠|るぶあるはりさばく|アジア|SA OM AE YE|アラビア半島南部に広がる砂漠です。''',
'plain':'''GREAT PLAINS|グレートプレーンズ|ぐれーとぷれーんず|南北アメリカ|US CA|ロッキー山脈の東側に広がる平原です。
NORTH CHINA PLAIN|華北平原|かほくへいげん|アジア|CN|中国東部、黄河下流域などに広がる平原です。
GANGES PLAIN|ガンジス平原|がんじすへいげん|アジア|IN BD NP|ヒマラヤ山脈の南、ガンジス川流域に広がる平原です。
WESTERN SIBERIAN PLAIN|西シベリア平原|にししべりあへいげん|アジア|RU KZ|ウラル山脈の東側に広がる低く平坦な地域です。
NORTHERN EUROPEAN PLAIN|北ヨーロッパ平原|きたよーろっぱへいげん|ヨーロッパ|FR BE NL DE PL|ヨーロッパ北部に東西に広がる平原です。
PAMPAS|パンパ|ぱんぱ|南北アメリカ|AR UY|南アメリカ南東部に広がる草原の平原です。
LLANOS|リャノ|りゃの|南北アメリカ|VE CO|オリノコ川流域に広がる熱帯の平原です。
NULLARBOR PLAIN|ナラボー平原|ならぼーへいげん|オセアニア|AU|オーストラリア南部の海岸近くにある平原です。
MANCHURIAN PLAIN|中国東北平原|ちゅうごくとうほくへいげん|アジア|CN|中国東北部に広がる平原です。
Alföld|ハンガリー大平原|はんがりーだいへいげん|ヨーロッパ|HU RO RS|カルパティア盆地東部に広がる平原です。''',
'plateau':'''PLATEAU OF TIBET|チベット高原|ちべっとこうげん|アジア|CN IN|ヒマラヤ山脈の北に広がる標高の高い高原です。
DECCAN PLATEAU|デカン高原|でかんこうげん|アジア|IN|インド半島の内陸に広がる高原です。
BRAZILIAN HIGHLANDS|ブラジル高原|ぶらじるこうげん|南北アメリカ|BR|ブラジル東部から中央部に広がる高地です。
CENTRAL SIBERIAN PLATEAU|中央シベリア高原|ちゅうおうしべりあこうげん|アジア|RU|西シベリア平原の東、シベリア中央部にある高原です。
MONGOLIAN PLATEAU|モンゴル高原|もんごるこうげん|アジア|MN CN|モンゴルと中国北部に広がる高原です。
COLORADO PLATEAU|コロラド高原|ころらどこうげん|南北アメリカ|US|アメリカ合衆国南西部の内陸にある高原です。
ALTIPLANO|アルティプラノ|あるてぃぷらの|南北アメリカ|BO PE|アンデス山脈の中央部に広がる高原です。
Loess Plateau|黄土高原|こうどこうげん|アジア|CN|中国の黄河中流域にあり、黄土に覆われた高原です。
SHAN PLATEAU|シャン高原|しゃんこうげん|アジア|MM TH|ミャンマー東部を中心に広がる高原です。
KIMBERLEY PLATEAU|キンバリー高原|きんばりーこうげん|オセアニア|AU|オーストラリア大陸北西部の高原です。'''}
path=ROOT/'public/assets/terrain.json'; original=json.loads(path.read_text());rows=[r for r in original if r['category'] not in DATA]
assert len(rows)==58
base=json.loads(json.dumps(rows));codes={r['id'] for r in json.loads((ROOT/'public/assets/data.json').read_text())};audit=[]
for cat,text in DATA.items():
 for i,line in enumerate(text.splitlines(),1):
  key,name,reading,regions,countries,desc=line.split('|');iswater=cat in ('sea','bay','strait');src=marine if iswater else landforms
  fs=[f for f in src if f['properties'].get('name',f['properties'].get('NAME'))==key];assert len(fs)==1,(cat,key,len(fs))
  g=make_valid(shape(fs[0]['geometry']))
  if iswater:g=g.intersection(ocean)
  g=g.simplify(.005 if cat=='strait' else .015,preserve_topology=True)
  if g.geom_type=='GeometryCollection':g=unary_union([p for p in g.geoms if p.geom_type in ('Polygon','MultiPolygon')])
  assert g.is_valid and not g.is_empty and g.area>0,(name,g.geom_type)
  assert set(countries.split())<=codes,(name,set(countries.split())-codes)
  p=g.representative_point();layername='ne_10m_geography_'+('marine_polys' if iswater else 'regions_polys')
  acc='Natural Earth の海域区分を海岸線データで水域に限定し簡略化した範囲（海の境界は概略、領海・航路・航海用ではありません）' if iswater else 'Natural Earth の地形ラベル区域による学習用のおおよその範囲（自然地形の厳密な境界ではありません）'
  aliases=[name,reading,key]
  if name=='日本海': aliases+=['Japan Sea','East Sea','東海']
  if name=='中国東北平原':aliases+=['満州平原','まんしゅうへいげん','東北平原']
  if name=='グレートビクトリア砂漠':aliases+=['グレートヴィクトリア砂漠']
  if name=='ペルシャ湾':aliases+=['ペルシア湾']
  rows.append(dict(id=f'terrain-{cat}-{i:02d}',category=cat,name=name,reading=reading,aliases=aliases,regions=regions.split('/'),countries=countries.split(),description=desc,geometry=mapping(g),bbox=list(g.bounds),lng=p.x,lat=p.y,accuracy=acc,level='intro' if i<=4 else 'basic',checked='2026-10-16',sourceLayer=layername+(' + ne_10m_ocean' if iswater else ''),sourceNames=[key],sources=[dict(title='Natural Earth — '+layername,url='https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/'+layername+'.geojson'),dict(title='Natural Earth — Physical Labels (scale and approximate extents)',url='https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/')]+([dict(title='Natural Earth — 1:10m Ocean coastline clipping',url='https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-ocean/')] if iswater else []),license='Public domain'))
  audit.append(dict(id=rows[-1]['id'],name=name,source=key,geometry=g.geom_type,areaSquareDegrees=round(g.area,5),valid=g.is_valid))
assert rows[:58]==base
assert len({r['id'] for r in rows})==len(rows)
path.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
report=dict(checked='2026-10-16',preserved=58,added=60,total=len(rows),counts=dict(Counter(r['category'] for r in rows)),method='Named Natural Earth 10m polygons; marine label areas intersected with 10m ocean; topology-preserving simplification 0.005 degrees straits / 0.015 others. No artificial rectangles, points or invented routes.',warnings=['Landform polygons are cartographic approximate extents, not scientific surveyed boundaries.','Marine open-water boundaries use Natural Earth named subdivisions; subordinate gulfs may be separate from parent seas.','Straits use actual clipped water-area polygons, not navigational centerlines.','Related countries are principal geographic links, not claims about sovereignty or complete coast-country lists.','Sea of Japan is the dataset primary name; East Sea/東海 are searchable aliases.'],sources={n:hashlib.sha256((CACHE/(n+'.json')).read_bytes()).hexdigest() for n in ['ne_10m_geography_marine_polys','ne_10m_geography_regions_polys','ne_10m_ocean']},validation=audit)
(ROOT/'terrain-expansion-source-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:report[k] for k in ['preserved','added','total','counts']},ensure_ascii=False))
