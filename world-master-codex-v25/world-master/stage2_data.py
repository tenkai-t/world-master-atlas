import json,tarfile,re
from pathlib import Path
r=Path('public');d=[c for c in json.load(open(r/'assets/data.json')) if c.get('scope','un')=='un'];g=json.load(open('/tmp/world-ne-stage2.json'))
for c in d:
 c['scope']='un';c['status']='国連加盟国';c['sources']=[{'title':'国連加盟国一覧','url':'https://www.un.org/en/about-us/member-states'}];c['flagKind']='国旗'
rows=[
('PS','パレスチナ','Palestine','アジア',35.25,31.9,'observer','国連非加盟オブザーバー国家。承認状況は国によって異なります。','https://research.un.org/en/unmembers/observers',['パレスチナ国','ぱれすちなこく']),
('VA','バチカン','Vatican City','ヨーロッパ',12.4534,41.9029,'observer','国連でオブザーバーの地位を持つのは聖座（Holy See）です。ここでは地理の学習対象としてバチカン市国を収録します。','https://www.un.org/en/about-us/non-member-states',['バチカン市国','ばちかんしこく']),
('TW','台湾','Taiwan','アジア',121,23.7,'limited','独自の統治機構がある地域。国家としての承認や国際的な位置付けは国によって異なります。','https://commonslibrary.parliament.uk/research-briefings/cbp-9254/',['たいわん','中華民国','ちゅうかみんこく']),
('XK','コソボ','Kosovo','ヨーロッパ',20.9,42.6,'limited','独立を宣言し、一部の国が国家として承認しています。セルビアは独立を認めておらず、国連には加盟していません。','https://www.gov.uk/government/speeches/the-uk-calls-on-member-states-who-have-not-yet-done-so-to-join-the-majority-and-recognise-kosovos-independence-uk-statement-at-the-un-security-counc',['コソボ共和国','こそぼきょうわこく']),
('XNC','北キプロス','Northern Cyprus','アジア',33.4,35.25,'limited','キプロス島北部を実効統治する地域。自称「北キプロス・トルコ共和国」は国際的に広く承認されていません。','https://www.gov.uk/foreign-travel-advice/cyprus/regional-risks',['きたきぷろす','北キプロス・トルコ共和国']),
('HK','香港','Hong Kong','アジア',114.17,22.32,'territory','中国の特別行政区です。国家とは分けて学習します。','https://www.gov.hk/en/about/abouthk/',['ほんこん']),
('MO','マカオ','Macao','アジア',113.55,22.17,'territory','中国の特別行政区です。国家とは分けて学習します。','https://www.gov.mo/en/',['澳門','Macau']),
('GL','グリーンランド','Greenland','南北アメリカ',-42,72,'territory','デンマーク王国の一部で、自治政府を持ちます。地理上は北アメリカに位置します。','https://stm.dk/en/the-prime-ministers-office/the-unity-of-the-realm/greenland/',[]),
('PR','プエルトリコ','Puerto Rico','南北アメリカ',-66.5,18.2,'territory','カリブ海にあるアメリカ合衆国の地域です。','https://www.doi.gov/node/11613',[]),
('GU','グアム','Guam','オセアニア',144.79,13.44,'territory','西太平洋にあるアメリカ合衆国の地域です。','https://www.doi.gov/oia/islands',[]),
('CK','クック諸島','Cook Islands','オセアニア',-159.78,-21.23,'associated','ニュージーランドと自由連合関係にあります。日本は国家として承認しています。海外領土とは区別します。','https://www.mofa.go.jp/mofaj/area/cook/data.html',['くっくしょとう']),
('NU','ニウエ','Niue','オセアニア',-169.87,-19.05,'associated','ニュージーランドと自由連合関係にあります。日本は国家として承認しています。海外領土とは区別します。','https://www.mofa.go.jp/mofaj/area/niue/data.html',[])]
for id,n,en,reg,x,y,scope,status,url,aliases in rows:
 c=dict(id=id,name=n,en=en,region=reg,lng=x,lat=y,scope=scope,status=status,aliases=[n,en]+aliases,source='Natural Earth / 参考資料',sources=[{'title':'分類・位置付けの参考資料','url':url}],checked='2026-10-16',flagKind='地域で使用される旗' if scope in ['territory','limited'] else '旗');d.append(c)
# Preserve base map geometry, add an explicit ID to Northern Cyprus.
mp=json.load(open(r/'assets/map.json'))
for f,orig in zip(mp['features'],g['features']):
 if orig['properties']['ADMIN']=='Northern Cyprus':f['properties']['code']='XNC'
 # Kosovo's ISO placeholder differs between datasets.
 if orig['properties']['ADMIN']=='Kosovo':f['properties']['code']='XK'
json.dump(mp,open(r/'assets/map.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(d,open(r/'assets/data.json','w'),ensure_ascii=False,separators=(',',':'))
with tarfile.open('/tmp/flags.tar.gz') as t:
 for row in rows:
  code=row[0]
  if code!='XNC':open(r/('assets/'+code+'.svg'),'wb').write(t.extractfile('flag-icons-main/flags/4x3/'+code.lower()+'.svg').read())
m=json.load(open('/workspace/sites/japan-geography-master/dist/assets/handwriting.json'));m['characters']={c:v for c,v in m['characters'].items() if re.match('[ぁ-ヺー]',c)};m['modification']='Kana-only subset of KanjiVG templates; strokes sampled at 16 points and normalized. Used by a local template recognizer. Does not support kanji or Latin handwriting.';m['missing']=[]
json.dump(m,open(r/'assets/handwriting.json','w'),ensure_ascii=False,separators=(',',':'))
print('entries',len(d),'handwriting',len(m['characters']),'XNC svg',open(r/'assets/XNC.svg').read()[:70])
