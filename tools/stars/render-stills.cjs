// Render the flat Stars product images from the real 3D models in js/stars3d.js, so tiles and fallbacks match the viewer.
// MP_PLAYWRIGHT=<playwright> [STARS_SIZE=2048] [STARS_PACKS=500,1100] node tools/stars/render-stills.cjs [outdir]   -> img/stars-{light,dark}.jpg + stars-<n>-<theme>.jpg
// Each still: the model (transparent canvas) composited on a flat product-photo backdrop, no text.
const pw = require(process.env.MP_PLAYWRIGHT || 'playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), ORIGIN = 'https://misereperdue.com', OUT = process.argv[2] || path.join(ROOT, 'img');
const PACKS = process.env.STARS_PACKS ? process.env.STARS_PACKS.split(',').map(Number) : [100, 500, 1000, 1100, 2400, 2500, 6500];
const S = +process.env.STARS_SIZE || 1254, MH = S; // STARS_SIZE=2048 for Shopify uploads
const BG = { light: '#d8d9dd', dark: '#0c1230' }; // flat backdrop, no glow
const T = { '.js': 'application/javascript', '.html': 'text/html' };
(async () => {
  const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const tmp = fs.mkdtempSync('/tmp/stars-stills-');
  for (const theme of ['light', 'dark']) {
    const c = await browser.newContext({ viewport: { width: S, height: MH }, colorScheme: theme, serviceWorkers: 'block' });
    await c.route('**/*', r => {
      const u = new URL(r.request().url());
      if (u.pathname === '/still.html') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="${theme}"><body style="margin:0;background:transparent"><div id="st" style="width:${S}px;height:${MH}px"></div><script src="/js/stars3d.js"></script></body></html>` });
      const f = path.join(ROOT, decodeURIComponent(u.pathname));
      return fs.existsSync(f) ? r.fulfill({ path: f, contentType: T[path.extname(f)] || 'application/octet-stream' }) : r.fulfill({ status: 404, body: '' });
    });
    const p = await c.newPage();
    for (const pack of [0, ...PACKS]) {
      await p.goto(ORIGIN + '/still.html');
      await p.evaluate(([n, bg]) => { const st = document.getElementById('st'); st.setAttribute('data-pack', String(n || 100)); st.setAttribute('data-still', n ? '-0.45' : '-0.2'); st.setAttribute('data-bg', bg); st.setAttribute('data-fit', n ? '0.97' : '1'); window.__d = MPStars3D.mount(st); }, [pack, BG[theme]]);
      await p.waitForSelector('#st[data-ready]', { timeout: 120000 });
      const data = await p.evaluate(() => document.querySelector('#st canvas').toDataURL('image/png'));
      const model = path.join(tmp, `m-${theme}-${pack}.png`);
      fs.writeFileSync(model, Buffer.from(data.split(',')[1], 'base64'));
      const name = pack ? `stars-${pack}-${theme}.jpg` : `stars-${theme}.jpg`;
      const args = ['-size', `${S}x${S}`, `xc:${BG[theme]}`, model, '-geometry', '+0+0', '-composite'];
      args.push('-strip', '-quality', '88', '-sampling-factor', '4:2:0', path.join(OUT, name));
      execFileSync('convert', args);
      console.log('wrote', name);
    }
    await c.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
