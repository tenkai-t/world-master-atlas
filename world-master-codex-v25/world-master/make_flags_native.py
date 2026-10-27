"""Fetch untouched native-proportion flag SVGs, pinned to upstream Git revision.
Outputs are original source geometries, never rescaled fixed-ratio icons.
"""
import concurrent.futures,json,urllib.request,xml.etree.ElementTree as ET,re,time,pathlib,hashlib
from fractions import Fraction
ROOT=pathlib.Path(__file__).resolve().parent
REV='c09927e63705529bbf59ca6684cd9b23225dddad'
BASE=f'https://raw.githubusercontent.com/hampusborgos/country-flags/{REV}/'
OUT=ROOT/'public/assets/flags-native';OUT.mkdir(exist_ok=True)
def fetch(url):
 for n in range(3):
  try:
   return urllib.request.urlopen(url,timeout=65).read()
  except Exception:
   if n==2: raise

def one(d):
 id=d['id'];code={'XNC':'trnc'}.get(id,id.lower());url=BASE+'svg/'+code+'.svg'
 if id=='XNC': url='https://upload.wikimedia.org/wikipedia/commons/1/1e/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg?download=1'
 try:
  b=(OUT/(id+'.svg')).read_bytes() if (OUT/(id+'.svg')).exists() else fetch(url);e=ET.fromstring(b)
  if e.tag.rsplit('}',1)[-1]!='svg':raise ValueError('not SVG')
  if any(x.tag.rsplit('}',1)[-1] in ('script','foreignObject') for x in e.iter()):raise ValueError('unsafe SVG')
  vb=[float(x) for x in re.split('[ ,]+',e.attrib.get('viewBox','').strip())] if e.attrib.get('viewBox') else None
  def dim(s):return float(re.sub('[^0-9.eE+-]','',s))
  w,h=(vb[2],vb[3]) if vb else (dim(e.attrib['width']),dim(e.attrib['height']))
  (OUT/(id+'.svg')).write_bytes(b)
  return dict(id=id,path='assets/flags-native/'+id+'.svg',width=w,height=h,ratio=w/h,viewBox=vb,source=url,adoptedVariant='National flag as depicted by upstream; native SVG proportions',checked='2026-10-16',license='Public domain (upstream README; Wikimedia-derived)',geometry='rectangular',sourceRepository='https://github.com/hampusborgos/country-flags')
 except Exception as e:return {'id':id,'error':str(e),'source':url}
if __name__=='__main__':
 ds=json.loads((ROOT/'public/assets/data.json').read_text())
 with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
  rows=list(pool.map(one,ds))
 for r in rows:
  if 'error' in r: continue
  r['ratioConvention']='width / height'
  r['ratioHW']=':'.join(str(x) for x in (Fraction(r['height']/r['width']).limit_denominator(1000).numerator,Fraction(r['height']/r['width']).limit_denominator(1000).denominator))
  r['sha256']=hashlib.sha256((OUT/(r['id']+'.svg')).read_bytes()).hexdigest()
  r['verification']='SVG parsed; native upstream viewBox/intrinsic dimensions checked, not independent legal certification'
  r['adoptedVariant']='Upstream national/territorial flag artwork; native proportions retained'
  if r['id']=='NP':
   r['geometry']='nonrectangular double pennon'
   r['ratioHW']='≈1.219:1 (outer bounds)'
   r['adoptedVariant']='Constitutional double-pennon construction with blue border; transparent area outside pennons retained. width/height are stroke-aware SVG outer bounds, not a rectangular flag field.'
   r['verificationSources']=['https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/संविधान/constitution-of-nepal/']
  variants={
   'CH':'Square national flag (1:1); maritime ensign is a separate rectangular variant.',
   'VA':'Square Vatican City flag (1:1); upstream rendering of keys and tiara.',
   'MC':'Red-white national/civil bicolour, adopted 4:5 height:width rendering; 2:3 usage also documented. State/princely arms-on-white flag is distinct.',
   'ID':'Red-white national flag, 2:3 height:width, Law 24/2009 Article 4.',
   'DK':'Rectangular Dannebrog stutflag, adopted 28:37 height:width; permitted/traditional fly lengths vary and splitflag is distinct.',
   'BE':'Official-proportion national tricolour, 13:15 height:width; 2:3 flags also commonly used.',
   'GB':'Union Flag at 1:2 height:width; 3:5 land-use rendering also exists.',
   'AF':'Islamic Republic of Afghanistan black-red-green tricolour, 2:3; retained historical/UN-representation variant, distinct from the de facto Islamic Emirate white flag.',
   'SY':'Green-white-black three-red-star flag; upstream current design, 2:3.',
   'XNC':'Northern Cyprus territorial flag, 2:3 height:width, original Wikimedia SVG (900×600).'}
  if r['id'] in variants:r['adoptedVariant']=variants[r['id']]
  refs={
   'CH':['https://www.aboutswitzerland.eda.admin.ch/en/swiss-flag','https://www.aboutswitzerland.eda.admin.ch/en/the-swiss-flag-a-plus-for-the-country'],
   'VA':['https://www.vaticanstate.va/en/state-and-government/general-informations/flag.html'],
   'MC':['https://www.gouv.mc/gouvernement-et-institutions/histoire-et-patrimoine/les-differents-symboles/drapeau-monegasque','https://www.crwflags.com/fotw/flags/mc.html'],
   'ID':['https://peraturan.bpk.go.id/Download/27970/UU%20Nomor%2024%20Tahun%202009.pdf']}
  if r['id'] in refs:r['verificationSources']=refs[r['id']]
  if r['id']=='XNC':
   r['source']='https://upload.wikimedia.org/wikipedia/commons/1/1e/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg?download=1'
   r['sourcePage']='https://commons.wikimedia.org/wiki/File:Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg?download=1'
   r['sourceRepository']=None
   r['license']='CC BY-SA 4.0 (also tagged public-domain simple geometry on Commons)'
   r['attribution']='Mike Rohsopht and Wikimedia Commons file-history contributors'
   r['licenseUrl']='https://creativecommons.org/licenses/by-sa/4.0/'
   r['changes']='None; original SVG bytes retained'
 (ROOT/'public/assets/flag-ratios.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print('READY',len([r for r in rows if 'error' not in r]),'ERRORS',[r for r in rows if 'error'in r],flush=True)
