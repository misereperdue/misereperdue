import numpy as np, glob, os, sys
from PIL import Image
fs=sorted(glob.glob('full/*.png')); N=len(fs); FPS=int(sys.argv[1]); XF=1.5
K=int(round((15-XF)*FPS)); X=int(round(XF*FPS))
src=lambda sec: np.array(Image.open(fs[min(N-1,int(round(sec*60)))]).convert('RGB'),dtype=np.float32)
os.makedirs('loop',exist_ok=True)
for k in range(K):
    f=src(k/FPS)
    if k<X:
        w=k/X; w=w*w*(3-2*w); f=f*w+src((K+k)/FPS)*(1-w)
    Image.fromarray(np.clip(f,0,255).astype(np.uint8)).save('loop/%04d.png'%k)
print(K)
