#!/bin/sh
# Sphere power orb from dc's Holo.mp4 (2518x2160, 60fps, 15s; orb centre 584.5,1080.5, radius ~143px).
# usage: sh tools/sphere-orb/build.sh /path/to/Holo.mp4    (run from a scratch directory)
set -e
V="$1"; T=$(dirname "$0")
rm -rf full loop && mkdir full
ffmpeg -v error -y -i "$V" -vf "crop=290:290:440:936" full/%04d.png        # the orb, every frame
python3 "$T/loopframes.py" 30                                                # 13.5s seamless loop: last 1.5s crossfaded into the start
ffmpeg -v error -y -framerate 30 -i loop/%04d.png -vf "scale=256:256:flags=lanczos" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 28 -preset slow -movflags +faststart -an sphere-orb.mp4
ffmpeg -v error -y -framerate 30 -i loop/%04d.png -vf "scale=256:256:flags=lanczos" -c:v libvpx-vp9 -b:v 220k -maxrate 300k -row-mt 1 -pass 1 -an -f null /dev/null
ffmpeg -v error -y -framerate 30 -i loop/%04d.png -vf "scale=256:256:flags=lanczos" -c:v libvpx-vp9 -b:v 220k -maxrate 300k -row-mt 1 -pass 2 -an sphere-orb.webm
python3 - <<'PY'
from PIL import Image; import numpy as np
f=np.array(Image.open('loop/0120.png').convert('RGB').resize((256,256),Image.LANCZOS))
y,x=np.mgrid[0:256,0:256]; a=(np.clip(143.2*256/290-np.hypot(x-127.5,y-127.5),0,1)*255).astype(np.uint8)
Image.fromarray(np.dstack([f,a]),'RGBA').save('sphere-orb-still.webp','WEBP',quality=86,alpha_quality=90)
PY
echo "copy sphere-orb.mp4 sphere-orb.webm sphere-orb-still.webp to img/powers/ and bump ?v= in js/sphere-orb.js"
