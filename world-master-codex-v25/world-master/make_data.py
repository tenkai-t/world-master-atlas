import json,tarfile,os
root='/workspace/sites/world-master-atlas/dist'
codes='AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CR CI HR CU CY CZ KP CD DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA KR RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TH TL TG TO TT TN TR TM TV UG UA AE GB TZ US UY UZ VU VE VN YE ZM ZW'.split()
g=json.load(open(root+'/assets/countries.geojson'))
features=[]; countries=[]
regions={'Asia':'アジア','Europe':'ヨーロッパ','Africa':'アフリカ','Americas':'南北アメリカ','Oceania':'オセアニア'}
for f in g['features']:
 p=f['properties']; code=p['ISO_A2_EH']
 if p['ADM0_A3']=='FRA':code='FR'
 if p['ADM0_A3']=='NOR':code='NO'
 f['properties']={'code':code}; features.append(f)
 if code in codes and not any(c['id']==code for c in countries):
  countries.append(dict(id=code,name=p['NAME_JA'],en=p['NAME_EN'],region=regions.get(p['REGION_UN'],'その他'),lng=p['LABEL_X'],lat=p['LABEL_Y'],aliases=[p['NAME_JA'],p['NAME_EN'],p['ADMIN']],source='Natural Earth 5.1 / UN',checked='2026-10-16'))
missing=set(codes)-{c['id'] for c in countries};print('count',len(countries),'missing',missing)
# Map omits some microstates; explicit point coordinates for their selection markers.
extra={'SG':('シンガポール','Singapore',103.82,1.35,'アジア'),'NR':('ナウル','Nauru',166.93,-0.52,'オセアニア'),'TV':('ツバル','Tuvalu',179.19,-8.52,'オセアニア'),'MC':('モナコ','Monaco',7.42,43.74,'ヨーロッパ'),'SM':('サンマリノ','San Marino',12.46,43.94,'ヨーロッパ'),'LI':('リヒテンシュタイン','Liechtenstein',9.55,47.16,'ヨーロッパ'),'AD':('アンドラ','Andorra',1.52,42.51,'ヨーロッパ')}
for code in missing:
 n,e,x,y,r=extra[code];countries.append(dict(id=code,name=n,en=e,lng=x,lat=y,region=r,aliases=[n,e],source='Natural Earth / UN',checked='2026-10-16'))
assert len(countries)==193 and len({c['id'] for c in countries})==193
aliases={'US':['アメリカ','アメリカ合衆国','米国','USA','United States'],'GB':['イギリス','英国','UK','United Kingdom'],'CN':['中国','中華人民共和国','ちゅうごく'],'JP':['日本','にほん','にっぽん'],'KR':['韓国','大韓民国','かんこく'],'KP':['北朝鮮','朝鮮民主主義人民共和国'],'AE':['アラブ首長国連邦','UAE'],'CD':['コンゴ民主共和国'],'CG':['コンゴ共和国'],'TR':['トルコ','Türkiye','Turkey'],'CZ':['チェコ','Czechia'],'SZ':['エスワティニ','スワジランド'],'CI':['コートジボワール','Côte d’Ivoire']}
for c in countries:c['aliases']+=aliases.get(c['id'],[])
json.dump({'type':'FeatureCollection','features':features},open(root+'/assets/map.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(countries,open(root+'/assets/data.json','w'),ensure_ascii=False,separators=(',',':'))
os.remove(root+'/assets/countries.geojson')
with tarfile.open('/tmp/flags.tar.gz') as t:
 for code in codes:
  m=t.getmember('flag-icons-main/flags/4x3/'+code.lower()+'.svg');open(root+'/assets/'+code+'.svg','wb').write(t.extractfile(m).read())
 open(root+'/assets/flag-icons-LICENSE','wb').write(t.extractfile('flag-icons-main/LICENSE').read())
