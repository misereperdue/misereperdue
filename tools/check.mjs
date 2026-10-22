// Lightweight sanity checks (run on every PR by .github/workflows/check.yml,
// and locally with `npm run check`). Deploys nothing, needs no network.
//   1. JS syntax: every js/*.js, src/js/*.js, sw.js and inline <script> parses.
//   2. Local links/assets: every src=/href= in the HTML pages points at a file
//      that exists in the repo (clean URLs like /shop resolve to shop.html).
//   3. Sitemap: every <loc> maps to a file, uses a clean URL (no .html).
//   4. Canonical / og:url on every page uses a clean URL.
//   5. Version pins: each ?v= in sw.js SHELL matches index.html (warning only).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.relative(ROOT, p);
let errors = 0, warnings = 0;
const err = m => { errors++; console.log('ERROR  ' + m); };
const warn = m => { warnings++; console.log('WARN   ' + m); };

function syntax(code, label, isModule) {
  if (isModule) {
    // ES module: let node itself parse it (imports are not resolved by --check).
    const tmp = path.join(os.tmpdir(), `mp-check-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(tmp, code);
    const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
    fs.unlinkSync(tmp);
    if (r.status !== 0) err(`${label}: JS syntax error: ${(r.stderr || '').split('\n').find(l => /Error/.test(l)) || r.stderr}`);
    return;
  }
  try { new vm.Script(code, { filename: label }); }
  catch (e) { err(`${label}: JS syntax error: ${e.message}`); }
}

// 1. JS files
const jsFiles = ['sw.js',
  ...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f),
  ...(fs.existsSync(path.join(ROOT, 'src/js')) ? fs.readdirSync(path.join(ROOT, 'src/js')).filter(f => f.endsWith('.js')).map(f => 'src/js/' + f) : [])];
for (const f of jsFiles) syntax(fs.readFileSync(path.join(ROOT, f), 'utf8'), f, false);

// HTML pages
const pages = [];
for (const d of ['.', 'p', 't']) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) pages.push(path.join(dir, f));
}
function resolveLocal(fromFile, url) {
  let u = url.split('#')[0].split('?')[0];
  if (!u) return true;
  u = decodeURIComponent(u);
  const base = u.startsWith('/') ? ROOT : path.dirname(fromFile);
  let p = path.join(base, u);
  if (u.endsWith('/')) p = path.join(p, 'index.html');
  return fs.existsSync(p) || fs.existsSync(p + '.html');
}
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  // inline scripts (skip JSON / importmap / module)
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\bsrc=/.test(attrs) || /type="(application\/ld\+json|importmap)"/.test(attrs)) {
      if (/application\/ld\+json/.test(attrs)) { try { JSON.parse(m[2]); } catch (e) { err(`${rel(page)}: invalid JSON-LD: ${e.message}`); } }
      continue;
    }
    syntax(m[2], `${rel(page)} inline <script>`, /type="module"/.test(attrs));
  }
  // 2. local refs
  const refRe = /\s(?:src|href)="([^"]+)"/g;
  while ((m = refRe.exec(html))) {
    const u = m[1];
    if (/^(https?:|\/\/|mailto:|tel:|data:|javascript:|#|\{|\$)/.test(u)) {
      const own = u.match(/^https:\/\/(?:www\.)?misereperdue\.com(\/[^"#?]*)/);
      if (own && !/\/(api|cdn-cgi)\//.test(own[1]) && !resolveLocal(page, own[1])) err(`${rel(page)}: ${u} -> no such file in repo`);
      continue;
    }
    if (!resolveLocal(page, u)) err(`${rel(page)}: local ref "${u}" -> no such file`);
  }
  // 4. canonical / og:url
  for (const r of [/rel="canonical" href="([^"]+)"/, /property="og:url" content="([^"]+)"/]) {
    const c = html.match(r);
    if (c && /\.html$/.test(c[1])) err(`${rel(page)}: ${c[0]} should use the clean URL (no .html)`);
  }
}

// 3. sitemap
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const [, loc] of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const p = new URL(loc).pathname;
  if (p.endsWith('.html')) err(`sitemap.xml: ${loc} should be a clean URL`);
  if (!resolveLocal(path.join(ROOT, 'index.html'), p)) err(`sitemap.xml: ${loc} -> no such file`);
}

// 5. version pins sw.js vs index.html
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const idxPins = {};
for (const [, f, v] of idx.matchAll(/["'](?:\/)?((?:js|css)\/[\w.-]+\.(?:js|css))\?v=(\d+)["']/g)) idxPins[f] = v;
for (const [, f, v] of sw.matchAll(/"\/((?:js|css)\/[\w.-]+\.(?:js|css))\?v=(\d+)"/g))
  if (idxPins[f] && idxPins[f] !== v) warn(`sw.js precaches ${f}?v=${v} but index.html loads ?v=${idxPins[f]} (precache entry is wasted; bump it next time sw.js changes)`);
const swVer = (sw.match(/SW_VERSION\s*=\s*(\d+)/) || [])[1];
const regVer = (idx.match(/sw\.js\?v=(\d+)/) || [])[1];
if (swVer !== regVer) err(`SW_VERSION (${swVer}) in sw.js does not match register("/sw.js?v=${regVer}") in index.html`);

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
