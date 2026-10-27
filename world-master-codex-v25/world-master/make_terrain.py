import json,math,urllib.request
from pathlib import Path
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
cache=Path('/tmp/world-terrain');cache.mkdir(exist_ok=True)
files=['ne_10m_geography_regions_elevation_points','ne_10m_geography_regions_polys','ne_50m_rivers_lake_centerlines','ne_50m_lakes']
layers={}
for f in files:
 p=cache/(f+'.json')
 if not p.exists():p.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'+f+'.geojson').read())
 layers[f]=json.loads(p.read_text())['features']
P,R,W,L=[layers[f] for f in files]
existing={q['name']:q['id'] for q in json.loads(Path('public/assets/terrain.json').read_text())} if Path('public/assets/terrain.json').exists() else {}
rows=[]
def add(cat,key,name,reading,region,countries,desc,aliases=[]):
 source=P if cat=='mountain' else W if cat=='river' else L if cat=='lake' else R
 matches=[f for f in source if f['properties'].get('NAME',f['properties'].get('name')) in (key if isinstance(key,list) else [key])]
 if key=='IBERIA':
  fs=json.load(open('public/assets/map.json'))['features'];gs=[shape(f['geometry']) for f in fs if f['properties']['code'] in ['ES','PT','GI']];parts=[]
  for g in gs:parts+=list(g.geoms) if g.geom_type=='MultiPolygon' else [g]
  parts=[g for g in parts if g.area>2 and -10<g.centroid.x<4 and 35<g.centroid.y<45];geom=unary_union(parts);sourcefile='ne_50m_admin_0_countries';labels=['ES/PT mainland union']
 else:
  assert matches,(cat,key)
  gs=[shape(f['geometry']) for f in matches]
  if cat=='river':
   lines=[]
   for g in gs:lines+=list(g.geoms) if g.geom_type=='MultiLineString' else [g]
   from shapely.geometry import MultiLineString
   geom=MultiLineString(lines)
  else:geom=unary_union(gs)
  sourcefile=files[0 if cat=='mountain' else 2 if cat=='river' else 3 if cat=='lake' else 1];labels=[f['properties'].get('NAME',f['properties'].get('name')) for f in matches]
 geom=geom.simplify(.025,preserve_topology=True);assert not geom.is_empty
 b=list(geom.bounds);center=geom.representative_point();n=len([r for r in rows if r['category']==cat])+1
 new_id=existing.get(name,'terrain-'+cat+'-'+str(max([int(v.rsplit('-',1)[1]) for v in existing.values() if v.startswith('terrain-'+cat+'-')]+[0])+1).zfill(2));existing[name]=new_id
 rows.append(dict(id=new_id,category=cat,name=name,reading=reading,aliases=list(dict.fromkeys([name,reading]+aliases+labels)),regions=region.split('/'),countries=countries.split(),description=desc,geometry=mapping(geom),bbox=b,lng=center.x,lat=center.y,accuracy='山頂の位置' if cat=='mountain' else '本流の主な流路を簡略化（上流部・河口の分流・支流の一部は省略、湖内中心線を含む場合があります）' if cat=='river' else '簡略化した水域の形' if cat=='lake' else '学習用のおおよその範囲（海岸線・地形境界の厳密な表示ではありません）',level='intro' if n<=4 else 'basic',checked='2026-10-16',sourceLayer=sourcefile,sourceNames=labels,sources=[{'title':'Natural Earth — '+sourcefile,'url':'https://github.com/nvkelso/natural-earth-vector/tree/master/'+('10m_physical' if sourcefile.startswith('ne_10m') else '50m_physical')},{'title':'Natural Earth 地形ラベルの精度と範囲','url':'https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-physical-labels/'}],license='Public domain'))
add('mountain','Mount Everest','エベレスト','えべれすと','アジア','NP CN','ヒマラヤ山脈にある山。ネパールと中国の境界付近にあります。',['エヴェレスト','エベレスト山','チョモランマ','サガルマータ'])
add('mountain','Mount Kilimanjaro','キリマンジャロ','きりまんじゃろ','アフリカ','TZ','タンザニアにある山。アフリカ東部に位置します。',['キリマンジャロ山'])
add('mountain','Fuji','富士山','ふじさん','アジア','JP','日本の本州にある山。太平洋側に位置します。',['ふじやま','Mount Fuji'])
add('mountain','Mont Blanc','モンブラン','もんぶらん','ヨーロッパ','FR IT','ヨーロッパのアルプス山脈にある山。フランスとイタリアの境界付近です。',['モンブラン山'])
add('mountain','K2','K2','けーつー','アジア','PK CN','カラコルム山脈にある山。ヒマラヤ山脈の北西側に位置します。',['ケーツー','ケイツー'])
add('mountain','Cerro Aconcagua','アコンカグア','あこんかぐあ','南北アメリカ','AR','アルゼンチンにあるアンデス山脈の山です。',['アコンカグア山'])
add('mountain','Denali','デナリ','でなり','南北アメリカ','US','北アメリカのアラスカにある山です。',['マッキンリー','マッキンリー山','デナリ山'])
add('mountain','Mount Kosciuszko','コジオスコ山','こじおすこさん','オセアニア','AU','オーストラリア大陸の南東部にある山です。',['コジオスコ','コジアスコ','コジアスコ山'])
for key,n,r,reg,c,desc,a in [
('HIMALAYAS','ヒマラヤ山脈','ひまらやさんみゃく','アジア','NP CN IN BT','南アジアの北側に連なる山脈。エベレストもこの山脈にあります。','ヒマラヤ'),
('ANDES','アンデス山脈','あんですさんみゃく','南北アメリカ','VE CO EC PE BO CL AR','南アメリカの西側に沿って、南北に長く連なる山脈です。','アンデス'),
('ROCKY MOUNTAINS','ロッキー山脈','ろっきーさんみゃく','南北アメリカ','CA US','北アメリカ西部を、カナダからアメリカ合衆国へ延びる山脈です。','ロッキー'),
('ALPS','アルプス山脈','あるぷすさんみゃく','ヨーロッパ','FR CH IT AT DE SI','ヨーロッパにあり、複数の国にまたがる山脈です。','アルプス'),
('URAL MOUNTAINS','ウラル山脈','うらるさんみゃく','ヨーロッパ/アジア','RU KZ','ヨーロッパとアジアの境界の目安の一つとされる山脈です。','ウラル'),
('ATLAS MOUNTAINS','アトラス山脈','あとらすさんみゃく','アフリカ','MA DZ TN','アフリカ北西部の山脈。地中海とサハラ砂漠の間の地域にあります。','アトラス'),
('APPALACHIAN MTS.','アパラチア山脈','あぱらちあさんみゃく','南北アメリカ','US CA','北アメリカの東側に連なる山脈です。','アパラチア'),
('GREAT DIVIDING RANGE','グレートディバイディング山脈','ぐれーとでぃばいでぃんぐさんみゃく','オセアニア','AU','オーストラリア大陸の東側に沿って広がる山地です。','グレートディヴァイディング山脈')]: add('range',key,n,r,reg,c,desc,[a])
for key,n,r,reg,c,desc,aa in [
(['Nile'],'ナイル川','ないるがわ','アフリカ','EG SD','アフリカ北東部を流れ、地中海へ注ぐ川です。',['ナイル','Nile River']),
(['Amazonas'],'アマゾン川','あまぞんがわ','南北アメリカ','PE CO BR','南アメリカを流れ、大西洋へ注ぐ川です。',['アマゾン','Amazon','Amazon River']),
(['Chang Jiang','Yangtze'],'長江','ちょうこう','アジア','CN','中国を西から東へ流れる川。揚子江とも呼ばれます。',['揚子江','ようすこう','Yangtze River']),
(['Mississippi'],'ミシシッピ川','みししっぴがわ','南北アメリカ','US','北アメリカの内陸を流れ、メキシコ湾へ注ぐ川です。',['ミシシッピ','Mississippi River']),
(['Huang'],'黄河','こうが','アジア','CN','中国北部を流れる川。長江より北側を流れています。',['Huang He','Yellow River']),
(['Danube'],'ドナウ川','どなうがわ','ヨーロッパ','DE AT SK HU HR RS RO BG MD UA','ヨーロッパの複数の国を流れ、黒海へ注ぐ川です。',['ドナウ','Danube River']),
(['Congo'],'コンゴ川','こんごがわ','アフリカ','CD CG','アフリカ中央部を流れ、大西洋へ注ぐ川です。',['コンゴ','Congo River','ザイール川']),
(['Mekong'],'メコン川','めこんがわ','アジア','CN MM LA TH KH VN','東南アジアの複数の国を流れる川です。',['メコン','Mekong River']),
(['Ganges'],'ガンジス川','がんじすがわ','アジア','IN BD','南アジアを流れる川。下流はバングラデシュの地域へ続きます。',['ガンジス','Ganges River']),
(['Murray'],'マレー川','まれーがわ','オセアニア','AU','オーストラリア大陸南東部を流れる川です。',['マレー','マーレー川','マーレー','Murray River'])]:add('river',key,n,r,reg,c,desc,aa)
for key,n,r,reg,c,desc,a in [
('Lake Baikal','バイカル湖','ばいかるこ','アジア','RU','ロシアのシベリア南部にある湖です。','バイカル'),
('Lake Victoria','ビクトリア湖','びくとりあこ','アフリカ','TZ UG KE','東アフリカにあり、複数の国にまたがる湖です。','ヴィクトリア湖'),
('Lake Superior','スペリオル湖','すぺりおるこ','南北アメリカ','CA US','北アメリカの五大湖の一つ。カナダとアメリカ合衆国にまたがります。','スペリオル'),
('Lake Tanganyika','タンガニーカ湖','たんがにーかこ','アフリカ','TZ CD BI ZM','東アフリカにある、南北に長い湖です。','タンガニーカ'),
('Lago Titicaca','チチカカ湖','ちちかかこ','南北アメリカ','PE BO','アンデス山脈の高地にある、ペルーとボリビアにまたがる湖です。','チチカカ'),
('Lake Geneva','レマン湖','れまんこ','ヨーロッパ','CH FR','スイスとフランスにまたがる湖です。','ジュネーブ湖'),
('Great Bear Lake','グレートベア湖','ぐれーとべあこ','南北アメリカ','CA','カナダ北西部にある湖です。','グレートベア'),
('Lake Malawi','マラウイ湖','まらういこ','アフリカ','MW MZ TZ','アフリカ南東部にある、南北に長い湖です。','ニアサ湖')]:add('lake',key,n,r,reg,c,desc,[a])
for key,n,r,reg,c,desc,a in [
('GREENLAND','グリーンランド島','ぐりーんらんどとう','南北アメリカ','GL','北アメリカの北東側にある大きな島です。','グリーンランド'),
('MADAGASCAR','マダガスカル島','まだがすかるとう','アフリカ','MG','アフリカ大陸の南東、インド洋にある島です。','マダガスカル'),
('BORNEO','ボルネオ島','ぼるねおとう','アジア','ID MY BN','東南アジアの島。インドネシア・マレーシア・ブルネイが位置します。','カリマンタン島'),
('NEW GUINEA','ニューギニア島','にゅーぎにあとう','オセアニア','ID PG','オーストラリア大陸の北側にある島です。','ニューギニア'),
('SUMATRA','スマトラ島','すまとらとう','アジア','ID','インドネシア西部にある島。マレー半島の南西側にあります。','スマトラ'),
('GREAT BRITAIN','グレートブリテン島','ぐれーとぶりてんとう','ヨーロッパ','GB','ヨーロッパ大陸の北西にある島。イギリスの一部です。','グレートブリテン'),
('ICELAND','アイスランド島','あいすらんどとう','ヨーロッパ','IS','北大西洋にある島です。','アイスランド'),
('SRI LANKA','スリランカ島','すりらんかとう','アジア','LK','インド半島の南東にある島です。セイロン島とも呼ばれます。','セイロン島')]:add('island',key,n,r,reg,c,desc,[a])
for key,n,r,reg,c,desc,a in [
('HAWAIIAN ISLANDS','ハワイ諸島','はわいしょとう','オセアニア','US','太平洋の中央部に並ぶ島々です。ハワイ島一島とは区別します。','ハワイ列島'),
('PHILIPPINES','フィリピン諸島','ふぃりぴんしょとう','アジア','PH','東南アジアに広がる島々です。','フィリピン'),
('JAPAN','日本列島','にほんれっとう','アジア','JP','アジア大陸の東側に沿って連なる島々です。','にっぽんれっとう'),
('ARCHIPIÉLAGO DE COLÓN','ガラパゴス諸島','がらぱごすしょとう','南北アメリカ','EC','南アメリカ大陸の西、太平洋にある島々です。','ガラパゴス'),
('ISLAS CANARIAS','カナリア諸島','かなりあしょとう','アフリカ','ES','アフリカ北西岸の沖にある、スペインの島々です。','カナリア'),
('BRITISH ISLES','ブリテン諸島','ぶりてんしょとう','ヨーロッパ','GB IE','グレートブリテン島やアイルランド島などを含む地理的な島々の総称です。','イギリス諸島'),
('NEW ZEALAND','ニュージーランド諸島','にゅーじーらんどしょとう','オセアニア','NZ','南太平洋にあり、北島・南島などからなる島々です。','ニュージーランド'),
('SOLOMON ISANDS','ソロモン諸島','そろもんしょとう','オセアニア','SB PG','ニューギニア島の東側に連なる島々。地理上の諸島と国の範囲は同じではありません。','ソロモン列島')]:add('archipelago',key,n,r,reg,c,desc,[a])
for key,n,r,reg,c,desc,a in [
('ARABIAN PENINSULA','アラビア半島','あらびあはんとう','アジア','SA YE OM AE QA KW','アジアの南西部にあり、紅海とペルシャ湾などに囲まれた半島です。','アラビア'),
('IBERIA','イベリア半島','いべりあはんとう','ヨーロッパ','ES PT','ヨーロッパ南西部の半島。スペインやポルトガルが位置します。','イベリア'),
('SCANDINAVIA','スカンディナビア半島','すかんでぃなびあはんとう','ヨーロッパ','NO SE FI','ヨーロッパ北部の半島。ノルウェーやスウェーデンが位置します。','スカンディナヴィア半島'),
('MALAY PENINSULA','マレー半島','まれーはんとう','アジア','MY TH MM','東南アジアで南へ細長く延びる半島です。','マレー'),
('BALKAN PEN.','バルカン半島','ばるかんはんとう','ヨーロッパ','GR AL BG MK','ヨーロッパ南東部の半島。複数の国が位置します。','バルカン'),
('KOREA','朝鮮半島','ちょうせんはんとう','アジア','KR KP','アジア東部で、日本列島と中国大陸の間に位置する半島です。','朝鮮'),
('KAMCHATKA PENINSULA','カムチャツカ半島','かむちゃつかはんとう','アジア','RU','アジア北東部で、太平洋側へ延びる半島です。','カムチャツカ'),
('PEN. DE YUCATÁN','ユカタン半島','ゆかたんはんとう','南北アメリカ','MX BZ GT','中央アメリカで、メキシコ湾とカリブ海の間にある半島です。','ユカタン')]:add('peninsula',key,n,r,reg,c,desc,[a])
assert len(rows)==58
Path('public/assets/terrain.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
print('terrain',len(rows),'bytes',Path('public/assets/terrain.json').stat().st_size)
