// Sphere power orb renderer: ray-marched light inside a glass ball, rendered in headless Chromium (SwiftShader).
//   node tools/sphere-orb/render.cjs 288 60 /tmp/frames 2.4,0.58,3.4,3.0
//   python3 tools/sphere-orb/assemble.py /tmp/frames out 144 webp   (then re-save with alpha_quality=55)
// Output strips: R channel = light (img/powers/sphere-light.webp), G channel = hot spots (sphere-hot.webp).
// node render.cjs <size> <frames> <outPrefix> [kx ky kz kw]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const [S,N,out]=[+process.argv[2]||256,+process.argv[3]||12,process.argv[4]||'g'];const K=(process.argv[5]||'2.2,1.6,2.2,2.5').split(',').map(Number);
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>console.log('console',m.text()));
await p.goto('file://'+path.resolve(__dirname,'orb.html')+'?s='+S);await p.waitForFunction(()=>window.ready,null,{timeout:10000});
fs.mkdirSync(out,{recursive:true});
for(let i=0;i<N;i++){const d=await p.evaluate(([t,k])=>render(t,k),[i/N,K]);fs.writeFileSync(`${out}/f${String(i).padStart(3,'0')}.png`,Buffer.from(d.split(',')[1],'base64'));}
await b.close();console.log('ok',N);})();
