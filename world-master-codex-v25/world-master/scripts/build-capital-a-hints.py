# Curated facts were checked against object-specific pages; no runtime generation.
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
assets=root/'public/assets'
new=json.load(open(root/'scripts/hints-capital-a-facts.json'))
old=json.load(open(root/'content/hints/baseline-v1.json'))['capital']
assigned=sorted([q for q in json.load(open(assets/'capitals.json')) if q.get('quizEligible')],key=lambda q:q['id'])[:104]
out={}
for q in assigned:
 id=q['id']
 if id in new:
  r=new[id];out[id]={'hints':[{'text':t,'stage':['手がかり','特徴','決め手'][min(i,2)],'inClue':False,'appearance':False} for i,t in enumerate(r['h'])],'sources':[{'url':u,'checked':'2026-10-20'} for u in r['u']]}
 else:out[id]=old[id]
# Replace weak regional filler while retaining useful old clues.
updates={
 'cap-ca-ottawa':('Ottawa',['オンタリオ州とケベック州の境に近い、川沿いの都市です。','対岸のガティノーと一つの首都圏をつくっています。']),
 'cap-eg-cairo':('Cairo',['ナイル川がデルタへと分かれる場所の、すぐ南にあります。']),
 'cap-es-madrid':('Madrid',['イベリア半島の中央部、メセタと呼ばれる高原にあります。','古い市街はマンサナレス川の左岸の丘から発展しました。']),
 'cap-fr-paris':('Paris',['川の中州シテ島は、古くから交易と街の中心になった場所です。']),
 'cap-cn-beijing':('Beijing',['天壇には、明・清の皇帝が豊作を祈るために訪れました。','胡同と呼ばれる細い路地や、四合院という伝統的な住居が残ります。'])
}
for id,(page,add) in updates.items():
 r=out[id]
 if id in ['cap-ca-ottawa','cap-eg-cairo','cap-es-madrid','cap-fr-paris']:r['hints']=r['hints'][1:]
 if id=='cap-cn-beijing':r['hints']=[r['hints'][-1]]
 r['hints']=[{'text':t,'stage':'手がかり' if i==0 else '特徴','inClue':False,'appearance':False} for i,t in enumerate(add)]+r['hints']
 r['sources'].append({'url':'https://en.wikipedia.org/wiki/'+page,'checked':'2026-10-20'})
# Every candidate remains understandable even when another hint is filtered out.
self_contained={
 'cap-cn-beijing':{'その宮殿は「紫禁城」と呼ばれています。':'明・清の皇帝が暮らした宮殿「紫禁城」があります。'},
 'cap-fj-suva':{'同じ島の西側のナンディより、雨が多い地域にあります。':'ビティレブ島の西側のナンディより、雨が多い地域にあります。'},
 'cap-jm-kingston':{'その砂の陸地には、ポート・ロイヤルの町と国際空港があります。':'砂の陸地パリサドーズには、ポート・ロイヤルの町と国際空港があります。'}
}
for id,replacements in self_contained.items():
 for h in out[id]['hints']:h['text']=replacements.get(h['text'],h['text'])
# Personal names in the independent roles are not supplied as spelling/letter clues.
obj={'version':1,'capital':out}
(root/'content/hints/hints-capital-a.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
review={'assigned':len(assigned),'objects':len(out),'newObjects':len(new),'existingObjectsRetained':len(assigned)-len(new),'existingObjectsStrengthened':len(updates),'contentReviewed':len(out),'missing':[],'checked':'2026-10-20','method':'各都市固有の地理・川・海・山・歴史的建築・都市形成を資料から確認して短く要約。前半の公式観光・自治体資料と、取得可能な百科事典の都市別記事を使用。Britannicaの現行ページは取得不能のため不採用。既存15対象の有用なヒントは維持し、弱い5対象は再確認のうえ補強。','limitations':['既存資料の基準に合わせ、首都移転・係争地の分類や採点条件は変更していない。','ブラウザでの問題形式別検証は親エージェントが担当。','大半の追加資料はWikipediaの都市別記事。すべてを一次資料で再確認したとはしていない。'],'examples':{id:[h['text'] for h in out[id]['hints']] for id in ['cap-ad-andorra-la-vella','cap-bz-belmopan','cap-cv-praia','cap-kh-phnom-penh']}}
(root/'scripts/hints-capital-a-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
print('wrote',len(out),'objects',sum(len(r['hints']) for r in out.values()),'candidate hints')
