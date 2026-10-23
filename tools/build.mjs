// Build: minify the readable sources in src/ into the files the site loads.
//
//   src/js/<name>.js  -> js/<name>.js   (terser: compress + mangle)
//   src/css/site.css  -> css/site.css   (clean-css level 1)
//
// Only files that exist in src/ are built; hand-written files that are already
// readable (js/theme.js, js/shopify.js, js/social-logos.js, js/ph-icons.js,
// sw.js, *.html) are edited in place and never touched here.
//
//   npm run build            build everything in src/
//   npm run build -- chat    build only src/js/chat.js   (PREFER THIS: build only what you changed,
//                            so untouched files stay byte-identical and need no ?v= bump)
//   npm run verify           check every deployed file matches its source
//
// After a build that changes a file you MUST bump its ?v= pin in index.html
// (and in sw.js SHELL), and bump SW_VERSION + the sw.js?v= register call.
// See docs/SITE_GUIDE.md -> "Per-change checklist".
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const VERIFY = args.includes('--verify');
const only = args.filter(a => !a.startsWith('--'));

const TERSER = { compress: true, mangle: true, format: { comments: false } };
const CLEANCSS = { level: 1 };

const jobs = [];
for (const f of fs.readdirSync(path.join(ROOT, 'src/js')).sort())
  if (f.endsWith('.js')) jobs.push({ kind: 'js', src: `src/js/${f}`, out: `js/${f}` });
for (const f of fs.readdirSync(path.join(ROOT, 'src/css')).sort())
  if (f.endsWith('.css')) jobs.push({ kind: 'css', src: `src/css/${f}`, out: `css/${f}` });

async function build(job) {
  const code = fs.readFileSync(path.join(ROOT, job.src), 'utf8');
  if (job.kind === 'js') {
    const r = await minify(code, TERSER);
    return r.code;
  }
  const r = new CleanCSS(CLEANCSS).minify(code);
  if (r.errors.length) throw new Error(r.errors.join('; '));
  return r.styles;
}

// Normalised form used by --verify: terser compress (no mangle) for JS, so
// two files that are the same program (e.g. `a||(b||c)` vs `a||b||c`) compare
// equal; clean-css level 1 plus quote/space/time-unit normalisation for CSS.
async function normal(kind, code) {
  if (kind === 'js') return (await minify(code, { compress: true, mangle: false, format: { beautify: true, comments: false } })).code;
  return new CleanCSS({ level: 1 }).minify(code).styles
    .replace(/,\s+/g, ',').replace(/'/g, '"')
    .replace(/(^|[^\w.-])(\d*\.?\d+)(ms|s)\b/g, (m, p, n, u) => p + (u === 's' ? +(n * 1000).toFixed(3) : +n) + 'ms');
}

let bad = 0;
for (const job of jobs) {
  const name = path.basename(job.src, path.extname(job.src));
  if (only.length && !only.includes(name)) continue;
  const built = await build(job);
  const outPath = path.join(ROOT, job.out);
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  if (VERIFY) {
    let ok = current === built;
    let how = 'byte-identical to build';
    if (!ok && job.kind === 'js') {
      // Original Muse-era files were minified with other settings; accept
      // them if they parse to the same program as the source.
      ok = (await normal('js', current)) === (await normal('js', fs.readFileSync(path.join(ROOT, job.src), 'utf8')));
      how = 'same program as source (AST)';
    }
    if (!ok && job.kind === 'css') {
      ok = (await normal('css', current)) === (await normal('css', fs.readFileSync(path.join(ROOT, job.src), 'utf8')));
      how = 'same stylesheet as source';
    }
    console.log(`${ok ? 'OK  ' : 'DIFF'} ${job.out}${ok ? '  (' + how + ')' : '  <- deployed file does not match ' + job.src + '; run npm run build or port the change into src/'}`);
    if (!ok) bad++;
    continue;
  }
  if (current === built) { console.log(`same ${job.out}`); continue; }
  fs.writeFileSync(outPath, built);
  console.log(`wrote ${job.out}  ${current.length} -> ${built.length} bytes  (remember: bump ?v= in index.html + sw.js, and SW_VERSION)`);
}
if (VERIFY && bad) { console.error(`${bad} file(s) out of sync`); process.exit(1); }
