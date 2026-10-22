// Renders the MISERY link-preview cards (1200x630 JPG) into img/og/ with
// Playwright + Chrome, from existing site artwork and the Shopify product photos.
// Usage: node tools/build-og.mjs   (needs playwright-core + /usr/bin/google-chrome; see /workspace/tools)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_FROM || '/workspace/tools/package.json');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'img/og');
fs.mkdirSync(OUT, { recursive: true });
const data = (f, type) => `data:${type};base64,` + fs.readFileSync(path.join(ROOT, f)).toString('base64');
async function remote(url) { const r = await fetch(url); return 'data:image/png;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64'); }

// Product photos: from the Product JSON-LD in p/*.html (same source as the site).
function productImage(handle) {
  const s = fs.readFileSync(path.join(ROOT, 'p', handle + '.html'), 'utf8');
  for (const b of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const d = JSON.parse(b[1]);
    for (const x of Array.isArray(d) ? d : [d]) if (x['@type'] === 'Product') return [].concat(x.image)[0];
  }
}
const EYES = data('img/splash-eyes.png', 'image/png');
const M = data('img/og-image.jpg', 'image/jpeg');
const ORN = data('video/header.jpg', 'image/jpeg');
const MASK = await remote(productImage('misery-v_v-sleeping-mask') + '&width=1000');
const VIP = await remote(productImage('membership') + '&width=1000');

const CSS = `
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#070f29;position:relative;
  font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;color:#f5f5f7}
.glow{position:absolute;inset:0;background:radial-gradient(70% 90% at 0% 0%,rgba(169,215,245,.13),transparent 62%)}
.copy{position:absolute;left:84px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center;z-index:2}
.kicker{font-weight:600;font-size:20px;letter-spacing:.36em;color:#a9d7f5;margin-bottom:22px}
.title{font-weight:800;font-size:64px;letter-spacing:-.02em;line-height:1.04}
.sub{font-weight:600;font-size:24px;line-height:1.4;color:#b7bdd0;margin-top:18px}
.eyes{position:absolute;left:84px;bottom:64px;width:118px;height:31px;background:#a9d7f5;opacity:.85;
  -webkit-mask:url(${EYES}) center/contain no-repeat;z-index:2}
.url{position:absolute;right:56px;bottom:58px;font-size:18px;letter-spacing:.08em;color:#7f88a8;z-index:2}
.fade-l{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 34%)}
`;
const card = (inner, extra = '') => `<!doctype html><html><head><style>${CSS}${extra}</style></head><body><div class="glow"></div>${inner}<div class="eyes"></div></body></html>`;
const copy = (k, t, s) => `<div class="copy"><div class="kicker">${k}</div><div class="title">${t}</div>${s ? `<div class="sub">${s}</div>` : ''}</div>`;

const globe = `<canvas id="g" width="1300" height="1300" style="position:absolute;right:-330px;top:-260px;width:1050px;height:1050px"></canvas>
<script>
const c=document.getElementById('g'),x=c.getContext('2d'),R=520,cx=650,cy=650,tilt=.41,rot=.6,ax=.38;
const P=(lat,lon)=>{let X=Math.cos(lat)*Math.sin(lon+rot),Y=Math.sin(lat),Z=Math.cos(lat)*Math.cos(lon+rot);
 let Y2=Y*Math.cos(ax)-Z*Math.sin(ax),Z2=Y*Math.sin(ax)+Z*Math.cos(ax);
 return [cx+(X*Math.cos(-tilt)-Y2*Math.sin(-tilt))*R, cy-(X*Math.sin(-tilt)+Y2*Math.cos(-tilt))*R, Z2];};
const g=x.createRadialGradient(cx-180,cy-210,40,cx,cy,R);g.addColorStop(0,'rgba(169,215,245,.16)');g.addColorStop(1,'rgba(169,215,245,.03)');
x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
const line=(f,n,front,a,w)=>{x.beginPath();let on=false;for(let i=0;i<=n;i++){const p=f(i/n);if(front?p[2]>=0:p[2]<0){on?x.lineTo(p[0],p[1]):(x.moveTo(p[0],p[1]),on=true)}else on=false}
 x.strokeStyle='rgba(169,215,245,'+a+')';x.lineWidth=w;x.stroke()};
for(const front of [false,true]){for(let m=0;m<12;m++){const lon=m/12*Math.PI*2;line(t=>P(-Math.PI/2+t*Math.PI,lon),120,front,front?.75:.16,front?2.6:1.6)}
 for(const d of [-60,-30,0,30,60]){line(t=>P(d*Math.PI/180,t*Math.PI*2),200,front,front?(d?.8:.95):.14,front?(d?2.6:3.2):1.6)}}
x.beginPath();x.arc(cx,cy,R,0,7);x.strokeStyle='rgba(169,215,245,.85)';x.lineWidth=3;x.stroke();
</script>`;

const cards = {
  'home': card(copy('MISERY', 'Misère<br>Perdue', 'Toronto · misereperdue.com') +
    `<img src="${M}" class="fade-l" style="position:absolute;right:-40px;top:-35px;width:700px;height:700px;object-fit:cover">`),
  'product-misery-v_v-sleeping-mask': card(copy('MISERY', 'V_V Mask', 'Silk sleeping mask') +
    `<img src="${MASK}" class="fade-l" style="position:absolute;right:-30px;top:-15px;width:700px;height:660px;object-fit:cover">`, 'body{background:#0b122f}'),
  'product-membership': card(copy('MISERY', 'VIP', 'Membership') +
    `<img src="${VIP}" class="fade-l" style="position:absolute;right:20px;top:0;width:640px;height:630px;object-fit:cover">`, 'body{background:#0b122f}'),
  'shop': card(copy('MISERY', 'Shop', 'V_V Mask · VIP') +
    `<div class="fade-l" style="position:absolute;right:0;top:0;width:720px;height:630px;display:flex">
      <img src="${MASK}" style="width:420px;height:630px;object-fit:contain;margin-right:-40px"><img src="${VIP}" style="width:340px;height:630px;object-fit:cover"></div>`, 'body{background:#0b122f}'),
  'globe': card(copy('MISERY', 'Misery<br>Globe', 'Fashion, music &amp; more') + globe),
  'thread': card(copy('MISERY GLOBE', 'Join the<br>discussion', 'misereperdue.com/globe') +
    `<img src="${ORN}" class="fade-l" style="position:absolute;right:-120px;top:0;width:900px;height:630px;object-fit:cover;object-position:62% 50%;opacity:.92">`),
};

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, name + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
  console.log(path.relative(ROOT, file), Math.round(fs.statSync(file).size / 1024) + 'KB');
}
await b.close();
