from pathlib import Path
import json,math
from shapely.geometry import shape
from shapely.ops import unary_union
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];out=root/'public/icons/atlas-v1';out.mkdir(parents=True,exist_ok=True)
BG='#103f39';FG='#f4efdf';GOLD='#b89a60'
geo=json.loads((root/'public/assets/map.json').read_text())
land=unary_union([shape(f['geometry']).buffer(0) for f in geo['features']])
# Mollweide projection retains all continents without country borders. Tiny islands omitted at icon scale.
def project(lon,lat):
 lat=math.radians(max(-89.999,min(89.999,lat)));t=lat
 for _ in range(14):
  den=2+2*math.cos(2*t)
  if abs(den)<1e-9:break
  t-=(2*t+math.sin(2*t)-math.pi*math.sin(lat))/den
 return (256+194*(lon/180)*math.cos(t),256-97*math.sin(t))
polys=[]
for p in land.geoms:
 if p.area<1.3:continue
 p=p.simplify(.22,preserve_topology=True)
 polys.append([project(x,y) for x,y in p.exterior.coords])
def svg():
 paths=''.join('<path d="'+''.join(('M' if i==0 else 'L')+f'{x:.2f},{y:.2f}' for i,(x,y) in enumerate(p))+'Z"/>' for p in polys)
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>世界マスター</title><rect width="512" height="512" fill="{BG}"/><circle cx="256" cy="256" r="233" fill="none" stroke="{GOLD}" stroke-width="1.5"/><ellipse cx="256" cy="256" rx="199" ry="102" fill="none" stroke="{GOLD}" stroke-width="2"/><g fill="{FG}">{paths}</g></svg>'
(out/'master.svg').write_text(svg())
def raster(size,mask=False,small=False):
 k=size*4/512;im=Image.new('RGB',(size*4,size*4),BG);d=ImageDraw.Draw(im)
 if not small and not mask:d.ellipse([23*k,23*k,489*k,489*k],outline=GOLD,width=max(1,round(1.5*k)))
 d.ellipse([57*k,154*k,455*k,358*k],outline=GOLD,width=max(1,round((3 if small else 2)*k)))
 for p in polys:d.polygon([(x*k,y*k) for x,y in p],fill=FG)
 return im.resize((size,size),Image.Resampling.LANCZOS)
for n,s,m in [('master-1024.png',1024,False),('apple-touch-icon.png',180,False),('icon-192.png',192,False),('icon-512.png',512,False),('maskable-192.png',192,True),('maskable-512.png',512,True),('favicon-16.png',16,False),('favicon-32.png',32,False)]:raster(s,m,s<=32).save(out/n)
raster(64,small=True).save(out/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])
proof=Image.new('RGB',(900,470),'#e9e5d8');d=ImageDraw.Draw(proof)
proof.paste(Image.open('/workspace/sites/japan-geography-master/dist/icons/atlas-v7/icon-512.png').resize((300,300)),(24,32));proof.paste(raster(300),(348,32));proof.paste(raster(192,True),(680,32))
for i,s in enumerate([16,32,60,96]):proof.paste(raster(s,small=s<=32),(24+i*140,365))
proof.save(root/'icon-design-proof.png')
(out/'provenance.json').write_text(json.dumps({'source':'Existing public/assets/map.json; Natural Earth public-domain geographic data','sourceUrl':'https://www.naturalearthdata.com/about/terms-of-use/','processing':'Country polygons unioned; coastline simplified 0.22 degrees; tiny islands under 1.3 square degrees omitted; Mollweide projection. Decorative world overview, not a quiz map.','palette':[BG,FG,GOLD],'maskableCriticalRadius':199,'safeRadius':204.8,'reference':'Japan Geography Master atlas-v7 local current icon; palette and fine outer ring matched'},ensure_ascii=False,indent=2))
