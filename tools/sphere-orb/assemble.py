# frames dir (R=light, G=hot) -> strips: <pre>-a.png, <pre>-hot-a.png and the site's webp strips
import sys,glob
from PIL import Image
d,pre,S=sys.argv[1],sys.argv[2],int(sys.argv[3]); fs=sorted(glob.glob(d+'/f*.png')); N=len(fs)
A=Image.new('L',(S*N,S)); H=Image.new('L',(S*N,S))
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB').resize((S,S),Image.LANCZOS); r,g,_=im.split(); A.paste(r,(i*S,0)); H.paste(g,(i*S,0))
A.save(pre+'-a.png'); H.save(pre+'-hot-a.png')
W=Image.new('L',(S*N,S),255)
if len(sys.argv)>4:
    Image.merge('RGBA',(W,W,W,A)).save(pre+'.webp','WEBP',quality=72,alpha_quality=72,method=6)
    Image.merge('RGBA',(W,W,W,H)).save(pre+'-hot.webp','WEBP',quality=72,alpha_quality=72,method=6)
print(N)
