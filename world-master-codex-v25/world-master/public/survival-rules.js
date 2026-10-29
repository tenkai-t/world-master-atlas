'use strict';
// Shared condition and pool rules; loaded as a classic script and by the Worker.
var WMSurvivalRules = globalThis.WMSurvivalRules = (() => {
 const rule='survival-v1', contents=['country','capital','terrain','heritage','mixed'];
 const modes={country:['flag','name','location','chooseFlag','flagLocation'],capital:['capitalName','capitalCountry','capitalMap','capitalLocation','capitalFlag'],terrain:['terrainName','terrainLocation','terrainClue'],heritage:['heritagePhoto','heritageMap','heritageLocation','heritageCountry','heritageType','heritageClue'],mixed:['mixed']};
 const onlineModes={country:['flag','location'],capital:['capitalName'],terrain:['terrainName'],heritage:['heritageMap'],mixed:['mixed']};
 const defaultMode={country:'flag',capital:'capitalName',terrain:'terrainName',heritage:'heritageMap',mixed:'mixed'};
 const regions=['世界全体','アジア','ヨーロッパ','アフリカ','南北アメリカ','オセアニア'];
 const levels=['intro','all','advanced'],countryLevels=['c1','c2','c3','c4','c5','countryMaster'];
 const fixed = mode => ['location','flagLocation','capitalLocation','terrainLocation','heritageLocation','chooseFlag','heritageMap','heritageClue','heritageCountry','heritageType'].includes(mode);
 function normalize(raw={},online=false){
  const content=raw.content||'country';if(!contents.includes(content))throw Error('分野が不正です。');
  const mode=raw.mode||defaultMode[content];if(!(online?onlineModes:modes)[content].includes(mode))throw Error('この出題形式はこの挑戦では利用できません。');
  const level=raw.level||(content==='country'?'c1':'all');if(!(content==='country'?countryLevels:levels).includes(level))throw Error('難易度が不正です。');
  const region=raw.region||'世界全体';if(!regions.includes(region))throw Error('地域が不正です。');
  const input=fixed(mode)?'choice':raw.input||'choice';if(!['choice','text','ink'].includes(input)||online&&input!=='choice')throw Error('オンラインは4択または国の位置回答です。');
  const category=raw.category||'all',kind=raw.kind||'all';
  if(!['all','mountain','range','river','lake','island','archipelago','peninsula','sea','bay','strait','desert','plain','plateau'].includes(category)||!['all','cultural','natural','mixed'].includes(kind))throw Error('分類が不正です。');
  const countryLevel=raw.countryLevel||'c3';if(!countryLevels.includes(countryLevel))throw Error('国の難易度が不正です。');
  return {content,mode,level,region,input,scope:'all',category:content==='terrain'?category:'all',kind:content==='heritage'?kind:'all',countryLevel:content==='mixed'?countryLevel:null};
 }
 function countryAt(q,level,schema){const stage=Object.values(schema.countryStages).findIndex(ids=>ids.includes(q.id));return level==='countryMaster'||(stage<0?6:stage+1)<=Number(level.slice(1));}
 function pool(config,bank,schema){
  const groups=config.content==='mixed'?contents.slice(0,4):[config.content],out=[],seen=new Set();
  for(const content of groups){const level=content==='country'?(config.content==='mixed'?config.countryLevel:config.level):config.level,mode=config.content==='mixed'?defaultMode[content]:config.mode;
   for(const item of bank[content]||[]){
    if(content==='country'?!countryAt(item,level,schema):({intro:1,all:2,advanced:3}[schema.tiers[content]?.[item.id]]||3)>({intro:1,all:2,advanced:3}[level]||3))continue;
    if(content==='capital'&&!item.quizEligible)continue;
    if(config.region!=='世界全体'&&!(item.regions||[item.region]).includes(config.region))continue;
    if(content==='terrain'&&config.category!=='all'&&item.category!==config.category)continue;
    if(content==='heritage'&&config.kind!=='all'&&item.kind!==config.kind)continue;
    if(mode==='heritagePhoto'&&!item.photo)continue;
    const identity=content+':'+item.id+':'+mode;if(seen.has(identity))continue;seen.add(identity);
    out.push({item,content,mode,level,identity});
   }
  }return out;
 }
 function condition(config,entries,dataVersion,material){return {rule,dataVersion,material,config,targets:entries.map(e=>e.identity).sort()};}
 return Object.freeze({rule,contents,modes,onlineModes,defaultMode,regions,levels,countryLevels,fixed,normalize,countryAt,pool,condition});
})();
