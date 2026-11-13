// Render the flat Stars product images from the real 3D models in js/stars3d.js, so tiles and fallbacks match the viewer.
// MP_PLAYWRIGHT=<playwright> node tools/stars/render-stills.cjs [outdir]   -> img/stars-{light,dark}.jpg + stars-<n>-<theme>.jpg
// Each still: the model (transparent canvas) composited on the product-photo backdrop, pack amount underneath.
const pw = require(process.env.MP_PLAYWRIGHT || 'playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), ORIGIN = 'https://misereperdue.com', OUT = process.argv[2] || path.join(ROOT, 'img');
const PACKS = [100, 500, 1000, 2400, 2500, 6500], S = 1254, MH = 1000;
const BG = { light: ['#e6e7ea', '#d8d9dd'], dark: ['#18234f', '#0c1230'] }, INK = { light: '#0a0f29', dark: '#f5f5f7' };
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
      await p.evaluate(n => { const st = document.getElementById('st'); st.setAttribute('data-pack', String(n || 100)); st.setAttribute('data-still', n ? '-0.45' : '-0.2'); window.__d = MPStars3D.mount(st); }, pack);
      await p.waitForSelector('#st[data-ready]', { timeout: 120000 });
      const data = await p.evaluate(() => document.querySelector('#st canvas').toDataURL('image/png'));
      const model = path.join(tmp, `m-${theme}-${pack}.png`);
      fs.writeFileSync(model, Buffer.from(data.split(',')[1], 'base64'));
      const name = pack ? `stars-${pack}-${theme}.jpg` : `stars-${theme}.jpg`;
      const args = ['-size', `${S}x${S}`, `radial-gradient:${BG[theme][0]}-${BG[theme][1]}`, model, '-geometry', pack ? `+0+${Math.round(S * 0.02)}` : `+0+${Math.round((S - MH) / 2)}`, '-composite'];
      if (pack) args.push('-font', 'DejaVu-Sans-Mono-Bold', '-pointsize', String(Math.round(S * 0.075)), '-fill', INK[theme], '-gravity', 'south', '-annotate', `+0+${Math.round(S * 0.07)}`, pack.toLocaleString('en-US'));
      args.push('-strip', '-quality', '86', '-sampling-factor', '4:2:0', path.join(OUT, name));
      execFileSync('convert', args);
      console.log('wrote', name);
    }
    await c.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
