// Render the flat Stars product images from the real 3D models in js/stars3d.js, so tiles and fallbacks match the viewer.
// MP_PLAYWRIGHT=<playwright> [STARS_SIZE=2508] [STARS_SS=2] [STARS_PACKS=500,1100] node tools/stars/render-stills.cjs [outdir]
//   -> img/stars-{light,dark}.jpg + stars-<n>-<theme>.jpg
// STARS_VARIANT=1 -> img/stars-variant-<n>-<theme>.jpg only: no pack label, stack centred and scaled to fill ~64%, so it clears the 64x80 cover-cropped cart thumb (cart + Shopify variant photos).
// Each still is rendered STARS_SS times larger (Playwright deviceScaleFactor + three.js pixel ratio),
// then Lanczos-downscaled onto the product-photo backdrop so chip edges stay crisp at 3x DPR.
// Default STARS_SIZE=2508 is 2× the original 1254, enough for the 688px product stage at 3x.
// STARS_SIZE=2048 is still accepted for Shopify uploads.
const pw = require(process.env.MP_PLAYWRIGHT || 'playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), ORIGIN = 'https://misereperdue.com', OUT = process.argv[2] || path.join(ROOT, 'img');
const PACKS = process.env.STARS_PACKS ? process.env.STARS_PACKS.split(',').map(Number) : [100, 500, 1000, 1100, 2400, 2500, 6500];
const S = +process.env.STARS_SIZE || 2508, MH = Math.round(S * 0.8), SS = Math.max(1, +process.env.STARS_SS || 2);
const BG = { light: ['#e6e7ea', '#d8d9dd'], dark: ['#18234f', '#0c1230'] }, INK = { light: '#0a0f29', dark: '#f5f5f7' };
const T = { '.js': 'application/javascript', '.html': 'text/html' };
const VARIANT = !!process.env.STARS_VARIANT;
const COMPOSITE = path.join(__dirname, 'composite.py');
(async () => {
  const launch = { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  const chrome = process.env.MP_CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
  if (chrome) launch.executablePath = chrome;
  const browser = await pw.chromium.launch(launch);
  const tmp = fs.mkdtempSync('/tmp/stars-stills-');
  for (const theme of ['light', 'dark']) {
    const c = await browser.newContext({ viewport: { width: S, height: MH }, deviceScaleFactor: SS, colorScheme: theme, serviceWorkers: 'block' });
    await c.route('**/*', r => {
      const u = new URL(r.request().url());
      if (u.pathname === '/still.html') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="${theme}"><body style="margin:0;background:transparent"><div id="st" style="width:${S}px;height:${MH}px"></div><script src="/js/stars3d.js"></script></body></html>` });
      const f = path.join(ROOT, decodeURIComponent(u.pathname));
      return fs.existsSync(f) ? r.fulfill({ path: f, contentType: T[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' });
    });
    const p = await c.newPage();
    for (const pack of VARIANT ? PACKS : [0, ...PACKS]) {
      await p.goto(ORIGIN + '/still.html');
      await p.evaluate(([n, bg]) => { const st = document.getElementById('st'); st.setAttribute('data-pack', String(n || 100)); st.setAttribute('data-still', n ? '-0.45' : '-0.2'); st.setAttribute('data-bg', bg); window.__d = MPStars3D.mount(st); }, [pack, BG[theme][1]]);
      await p.waitForSelector('#st[data-ready]', { timeout: 180000 });
      const model = path.join(tmp, `m-${theme}-${pack}.png`);
      // Read the WebGL backing store (S×SS by MH×SS). Playwright element screenshots can
      // multiply deviceScaleFactor again and inflate a 2× render to 4×.
      const data = await p.evaluate(() => document.querySelector('#st canvas').toDataURL('image/png'));
      fs.writeFileSync(model, Buffer.from(data.split(',')[1], 'base64'));
      const name = VARIANT ? `stars-variant-${pack}-${theme}.jpg` : pack ? `stars-${pack}-${theme}.jpg` : `stars-${theme}.jpg`;
      execFileSync('python3', [COMPOSITE, '--size', String(S), '--mh', String(MH), '--model', model, '--out', path.join(OUT, name), '--c0', BG[theme][0], '--c1', BG[theme][1], '--ink', INK[theme], '--pack', String(pack), ...(VARIANT ? ['--center'] : [])], { stdio: 'inherit' });
    }
    await c.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
