exec(open('/tmp/heritage-even.py').read().split('\nresults=[]')[0])
import shutil,xml.etree.ElementTree as ET
SELECT=json.loads((C/'selection.json').read_text());results=json.loads((C/'results.json').read_text());registry={r.findtext('id_number'):r for r in ET.parse('/tmp/unesco-expansion.xml').getroot()};properties={q['unescoId']:q for q in json.loads((R/'public/assets/heritage.json').read_text())};out=[]
SUB={2:'キト歴史地区の街並み',26:'ゴレ島の海岸と街並み',78:'フィラデルフィアの独立記念館',84:'ヴェズレーのサント・マドレーヌ聖堂',90:'アブ・メナの遺跡',100:'ドゥルミトル国立公園の黒い湖（ツルノ湖）',132:'マルタの巨石神殿群のハジャー・イム神殿',4:'ランス・オ・メドーの元のヴァイキング建物の遺構',102:'ベニ・ハンマドの城塞の遺構',130:'ハル・サフリエニ地下墳墓内部の歴史写真',136:'ガランバ国立公園の空撮風景',140:'タフティ・バヒの仏教僧院跡',144:'キルワ・キシワニの大モスク遺構',150:'マンモス・ケーブ国立公園の洞窟内部',158:'ヘッド・スマッシュト・インの狩猟に使われた崖',160:'フォンテーヌブロー宮殿の中庭',162:'アミアン大聖堂の外観',164:'アルルのローマ円形闘技場',170:'フェズ旧市街の歴史写真',180:'シタデル・ラフェリエールの要塞',184:'サブラタのローマ劇場',208:'バーミヤン渓谷の崖に残る僧院の石窟',228:'アヴィニョンの教皇宮殿',246:'コナーラクの太陽神寺院の外壁と彫刻装飾',356:'イスタンブールのアヤソフィア',604:'ノヴゴロドの聖ソフィア大聖堂',1142:'那智の滝とその周辺'}
for sid,n in SELECT.items():
 id=int(sid);assert id%2==0;old=properties[sid];assert old['photo'] is None
 r=next(q for q in results if q['id']==id and q['n']==n);i=r['info'];e=i['extmetadata'];lic=clean(e.get('LicenseShortName',{}).get('value'));page=i.get('descriptionurl','https://commons.wikimedia.org/wiki/'+r['title'].replace(' ','_'));url=e.get('LicenseUrl',{}).get('value','');cats=e.get('Categories',{}).get('value','')
 if 'CC-Zero' in cats or e.get('License',{}).get('value')=='cc-zero':lic='CC0';url='https://creativecommons.org/publicdomain/zero/1.0/'
 if not url:url=page+'#Licensing'
 src=Path(r['file']);dest=R/f'public/assets/heritage/{id}.jpg';shutil.copyfile(src,dest)
 desc=clean(e.get('ImageDescription',{}).get('value','').split('<div')[0])[:1400];author=clean(e.get('Artist',{}).get('value',''))
 if not author:author=clean(e.get('Credit',{}).get('value',''))
 assert author,(id,'missing author')
 ph=dict(path=f'assets/heritage/{id}.jpg',fileTitle=r['title'],author=author,license=lic,licenseUrl=url,sourcePage=page,sourceUrl=i['url'].split('?')[0],description=SUB.get(id,old['name'])+'。',changes='表示用に長辺900px以内へ縮小、JPEGとして保存。画像内容の改変なし。',checked='2026-10-16',sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
 out.append(dict(id=f'wh-{id}',photo=ph,photoSubject=SUB.get(id,old['name']),photoAnswers={132:['ハジャー・イム神殿','ハジャーイム神殿','はじゃーいむしんでん'],140:['タフティ・バヒ','たふてぃばひ'],144:['キルワ・キシワニ','きるわきしわに'],164:['アルルの円形闘技場','あるるのえんけいとうぎじょう'],180:['シタデル・ラフェリエール','シタデルラフェリエール'],228:['教皇宮殿','きょうこうきゅうでん'],356:['アヤソフィア','あやそふぃあ'],1142:['那智の滝','なちのたき']}.get(id,[]),evidence=dict(unescoSource=f'https://whc.unesco.org/en/list/{id}',registrySource='https://whc.unesco.org/en/list/xml/',registryPropertyName=old['en'],photoLocationEvidence=SUB.get(id,old['name'])+'が登録物件またはその構成資産に対応する。Commonsの撮影地・被写体情報とUNESCOの登録情報を照合。',visualReview='実写を目視確認。登録物件そのもの、または記載した構成資産の写真。')))
(R/'heritage-photos-even.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print('MANIFEST',len(out))
