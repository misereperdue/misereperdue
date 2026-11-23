# Sphere power: render the orb's internal light (refracted petal beams, sparkling core, sweeping rim) as an
# alpha-only looping strip. The site colours it with the user's Sphere colour through a CSS mask.
import numpy as np, sys
from PIL import Image
S=int(sys.argv[1]) if len(sys.argv)>1 else 128; N=int(sys.argv[2]) if len(sys.argv)>2 else 60
SS=2; R=S*SS
y,x=np.mgrid[0:R,0:R]; cx=cy=(R-1)/2
X=(x-cx)/(R/2); Y=(y-cy)/(R/2); r=np.sqrt(X*X+Y*Y); th=np.arctan2(Y,X)
inside=(r<=1.0).astype(float)
rng=np.random.default_rng(7)
# sparkles near the core: fixed spots that twinkle on their own phase
K=60; sp_r=np.concatenate([np.abs(rng.normal(0,.16,24)),rng.uniform(.2,.85,36)]); sp_a=rng.uniform(0,2*np.pi,K); sp_ph=rng.uniform(0,1,K); sp_s=rng.uniform(.01,.024,K)
sp_x=sp_r*np.cos(sp_a); sp_y=sp_r*np.sin(sp_a)
def frame(t):
    T=2*np.pi*t
    # refraction warp: low-frequency angular/radial wobble so the beams bend like light through thick glass
    w=0.35*np.sin(3*th+T)+0.22*np.sin(2*r*np.pi*1.5-2*T)+0.18*np.cos(5*th-T*2)
    # two petal fields turning opposite ways (6 and 5 lobes): the lobes cross, merge and split
    p1=(0.5+0.5*np.cos(6*(th+w*0.35)-T))**4
    p2=(0.5+0.5*np.cos(5*(th-w*0.3)+T*2))**5
    prof=np.exp(-((r-0.6)/0.33)**2)            # beams strongest mid-radius, gone at the core and rim
    petals=(0.75*p1+0.6*p2)*prof
    # brighter flares riding a few lobes (the hot streaks in the reference)
    flare=(0.5+0.5*np.cos(3*(th+0.3*np.sin(T))-T))**18*np.exp(-((r-0.55)/0.22)**2)*1.1
    core=np.exp(-(r/0.17)**2)*(0.85+0.15*np.sin(2*T*3))
    spark=np.zeros_like(r)
    for i in range(K):
        a=(0.5+0.5*np.sin(2*np.pi*(t*2+sp_ph[i])))**4
        spark+=a*np.exp(-((X-sp_x[i])**2+(Y-sp_y[i])**2)/(2*sp_s[i]**2))
    # fresnel rim with a highlight arc sweeping round, plus a soft inner rim
    rim=np.exp(-((r-0.955)/0.045)**2)*(0.5+0.9*(0.5+0.5*np.cos(th-T))**3)
    inner=np.exp(-((r-0.86)/0.1)**2)*0.22
    body=0.10+0.22*r**3                        # the glass itself glows (fresnel: brighter towards the edge)
    v=body+petals*1.1+flare*1.0+core*0.8+spark*0.9+rim*0.9+inner
    hot=np.clip(flare*0.55+core*0.7+spark*1.1+rim*np.clip((0.5+0.5*np.cos(th-T))**10,0,1)*0.6+np.maximum(petals*1.1-0.8,0)*1.2,0,None)
    hot=(1-np.exp(-1.2*hot))*0.8
    v=1-np.exp(-1.35*v)                           # soft tone curve, highlights roll off instead of clipping
    a=np.clip(v,0,1)*np.clip((1.0-r)*R/2.5+1,0,1)*inside  # anti-aliased disc edge
    edge=np.clip((1.0-r)*R/2.5+1,0,1)*inside
    img=Image.fromarray((a*255).astype(np.uint8),'L').resize((S,S),Image.LANCZOS)
    h=Image.fromarray((np.clip(hot,0,1)*edge*255).astype(np.uint8),'L').resize((S,S),Image.LANCZOS)
    return img,h
strip=Image.new('LA',(S*N,S),(255,0)); hs=Image.new('LA',(S*N,S),(255,0))
for i in range(N):
    f,h=frame(i/N); W=Image.new('L',(S,S),255)
    strip.paste(Image.merge('LA',(W,f)),(i*S,0)); hs.paste(Image.merge('LA',(W,h)),(i*S,0))
out=sys.argv[3] if len(sys.argv)>3 else 'orb-strip.webp'
strip.convert('RGBA').save(out,'WEBP',quality=72,alpha_quality=70,method=6)
hs.convert('RGBA').save(out.replace('.webp','-hot.webp'),'WEBP',quality=72,alpha_quality=70,method=6)
strip.split()[1].save(out.replace('.webp','-alpha.png')); hs.split()[1].save(out.replace('.webp','-hot-alpha.png'))
print(out)
