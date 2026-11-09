"""Read alpha bounds, write CSS clipping metadata. Does not modify generated images."""
from pathlib import Path
from PIL import Image
import numpy as np,json
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'public/assets/mu-cave-v1';poses=['standing','sitting','lying','crying','cursing','walkL','walkR','bowStand','bowKneel','bowLow','celebrating','kicking'];result={}
for name in ['male','female','ronaldo','maguire']:
    im=Image.open(ART/(name+'.png')).convert('RGBA');w,h=im.size;alpha=np.asarray(im)[:,:,3];rects={}
    for i,pose in enumerate(poses):
        x0=int(i%4*w/4);y0=int(i//4*h/3);x1=int((i%4+1)*w/4);y1=int((i//4+1)*h/3)
        ys,xs=np.where(alpha[y0:y1,x0:x1]>220)
        if not len(xs):raise ValueError(name+' '+pose+' has no opaque pixels')
        # Clip strictly to cell boundaries so an adjacent pose can never bleed in.
        left=max(x0,x0+int(xs.min())-2);top=max(y0,y0+int(ys.min())-2);right=min(x1,x0+int(xs.max())+3);bottom=min(y1,y0+int(ys.max())+3)
        rects[pose]={'x':left,'y':top,'w':right-left,'h':bottom-top}
    result[name]={'width':w,'height':h,'standingHeight':rects['standing']['h'],'poses':rects}
    print(name,im.size,'transparent fraction',round(float((alpha==0).mean()),3))
(ART/'atlases.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
