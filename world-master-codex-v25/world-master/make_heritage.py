import json,xml.etree.ElementTree as ET,urllib.request,hashlib
from pathlib import Path
cache=Path('/tmp/world-heritage');cache.mkdir(exist_ok=True)
if not (cache/'unesco.xml').exists():(cache/'unesco.xml').write_bytes(urllib.request.urlopen('https://whc.unesco.org/en/list/xml/').read())
xml={r.findtext('id_number'):r for r in ET.parse(cache/'unesco.xml').getroot()}
# Only registry facts are reused. Descriptions and Japanese answer dictionaries are editorial.
rows=[
(252,'タージ・マハル','たーじまはる',['タージマハル'],'白い大理石の霊廟がある文化遺産です。','タージ・マハル',[]),
(438,'万里の長城','ばんりのちょうじょう',[],'中国に残る長大な防御施設の遺産です。','万里の長城の一部',[]),
(274,'マチュ・ピチュの歴史保護区','まちゅぴちゅのれきしほごく',['マチュピチュ','マチュ・ピチュ'],'アンデスの遺跡と周囲の自然を含む複合遺産です。','マチュ・ピチュの遺跡',[]),
(86,'メンフィスとその墓地遺跡―ギザからダハシュールまでのピラミッド地帯','めんふぃすとそのぼちいせきぎざからだはしゅーるまでのぴらみっどちたい',['メンフィスとその墓地遺跡','めんふぃすとそのぼちいせき'],'複数のピラミッド群などを含む文化遺産です。写真のギザはその一部です。','ギザのピラミッド群',['ギザのピラミッド','ぎざのぴらみっど','ギザの三大ピラミッド']),
(326,'ペトラ','ぺとら',['ペトラ遺跡'],'岩を彫って造られた建造物などが残る文化遺産です。','ペトラのエル・ハズネ',['エルハズネ','エル・ハズネ','えるはずね']),
(668,'アンコール','あんこーる',['アンコール遺跡'],'複数の寺院や都市の遺構を含む文化遺産です。','アンコール・ワット',['アンコールワット','アンコール・ワット','あんこーるわっと']),
(404,'アテネのアクロポリス','あてねのあくろぽりす',['アクロポリス'],'丘の上の神殿群などからなる文化遺産です。','アクロポリスのパルテノン神殿',['パルテノン神殿','ぱるてのんしんでん']),
(80,'モン・サン・ミシェルとその湾','もんさんみしぇるとそのわん',['モンサンミシェル','モン・サン・ミシェル'],'修道院のある小島と周囲の湾を含む文化遺産です。','モン・サン・ミシェル',[]),
(91,'ローマ歴史地区、教皇領とサン・パオロ・フオーリ・レ・ムーラ大聖堂','ろーまれきしちくきょうこうりょうとさんぱおろふおーりれむーらだいせいどう',['ローマ歴史地区','ろーまれきしちく'],'歴史地区と聖座の関連資産からなる文化遺産。登録の所在国はイタリアと聖座です。','ローマのコロッセオ',['コロッセオ','ころっせお','コロセウム']),
(394,'ヴェネツィアとその潟','ゔぇねつぃあとそのかた',['ヴェネツィア','ベネチア','ヴェネチア','べねちあとそのかた'],'歴史ある街と周囲の潟からなる文化遺産です。','ヴェネツィアの運河',[]),
(688,'古都京都の文化財','こときょうとのぶんかざい',['古都京都','こときょうと'],'京都・宇治・大津の寺社や城などからなる文化遺産です。','鹿苑寺（金閣寺）',['金閣寺','きんかくじ','鹿苑寺','ろくおんじ']),
(1418,'富士山―信仰の対象と芸術の源泉','ふじさんしんこうのたいしょうとげいじゅつのげんせん',['富士山','ふじさん'],'山や神社などの構成資産からなる文化遺産です。自然遺産ではありません。','富士山とその周辺',[]),
(156,'セレンゲティ国立公園','せれんげてぃこくりつこうえん',['セレンゲティ'],'東アフリカの草原と生き物の営みを含む自然遺産です。','セレンゲティ国立公園の風景',[]),
(28,'イエローストーン国立公園','いえろーすとーんこくりつこうえん',['イエローストーン'],'温泉や間欠泉など、多彩な自然のある自然遺産です。','イエローストーンのグランド・プリズマティック・スプリング',['グランドプリズマティックスプリング','グランド・プリズマティック・スプリング']),
(75,'グランド・キャニオン国立公園','ぐらんどきゃにおんこくりつこうえん',['グランドキャニオン','グランド・キャニオン'],'大きな峡谷の地形を含む自然遺産です。','グランド・キャニオン',[]),
(154,'グレート・バリア・リーフ','ぐれーとばりありーふ',['グレートバリアリーフ'],'オーストラリア北東岸の沖に広がるサンゴ礁の自然遺産です。','グレート・バリア・リーフの一部',[]),
(509,'モシ・オ・トゥニャ／ビクトリアの滝','もしおとぅにゃびくとりあのたき',['ビクトリアの滝','びくとりあのたき','ヴィクトリアの滝','ビクトリア滝'],'ザンビアとジンバブエにまたがる滝の自然遺産です。','ビクトリアの滝',[]),
(1314,'ワッデン海','わっでんかい',[],'オランダ・ドイツ・デンマークにまたがる干潟などの自然遺産です。','ワッデン海の干潟',[]),
(421,'トンガリロ国立公園','とんがりろこくりつこうえん',['トンガリロ'],'火山の自然とマオリの文化的価値を含む複合遺産です。','トンガリロ国立公園の湖と山の風景',[]),
(303,'イグアス国立公園（アルゼンチン）','いぐあすこくりつこうえんあるぜんちん',['イグアス国立公園','いぐあすこくりつこうえん'],'アルゼンチン側の国立公園です。ブラジル側のイグアス国立公園は別の登録遺産です。','イグアスの滝（アルゼンチン側の国立公園を出題）',['イグアスの滝','いぐあすのたき'])]
if not (cache/'photos.json').exists():
 (cache/'photos.json').write_text(json.dumps({p['id'].removeprefix('wh-'):{k:v for k,v in p.items() if k not in ['id','subject']} for p in json.loads(Path('public/licenses/heritage-photo-credits.json').read_text())},ensure_ascii=False))
photos=json.loads((cache/'photos.json').read_text());countries=json.loads(Path('public/assets/data.json').read_text());byid={c['id']:c for c in countries};out=[]
for id,name,reading,aliases,desc,subject,pa in rows:
 r=xml[str(id)];pts=[dict(lat=float(p.findtext('latitude')),lng=float(p.findtext('longitude')),country=p.findtext('iso2').upper()) for p in r.findall('geolocations/poi')];assert pts
 cs=[c.upper() for c in r.findtext('iso_code').split(',')];assert all(c in byid for c in cs)
 ph=photos[str(id)];assert 'error' not in ph,(id,ph);ph['sha256']=hashlib.sha256(Path('public',ph['path']).read_bytes()).hexdigest()
 out.append(dict(id='wh-'+str(id),unescoId=str(id),name=name,reading=reading,en=r.findtext('site'),aliases=list(dict.fromkeys([name,reading,r.findtext('site')]+aliases)),photoAnswers=pa,photoSubject=subject,description=desc,kind=r.findtext('category').lower(),countries=cs,regions=list(dict.fromkeys(byid[c]['region'] for c in cs)),positions=pts,bbox=[min(p['lng'] for p in pts),min(p['lat'] for p in pts),max(p['lng'] for p in pts),max(p['lat'] for p in pts)],transnational=r.findtext('transnational')=='1',inscribed=int(r.findtext('date_inscribed')),secondaryDates=r.findtext('secondary_dates') or '',source=r.findtext('http_url'),checked='2026-10-16',photo=ph,accuracy='UNESCOが掲載する地点。点は登録範囲の境界や面積を表しません。',scopeNote='本ゲームでは登録名の略称も受け付けます。写真問題に限り、指定した代表的構成資産名も正解として扱います。'))
Path('public/assets/heritage.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
Path('public/licenses/heritage-photo-credits.json').write_text(json.dumps([dict(id=q['id'],subject=q['photoSubject'],**q['photo'])for q in out],ensure_ascii=False,indent=2))
print('heritage',len(out),[(q['name'],q['kind'],len(q['positions']))for q in out])
