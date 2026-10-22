// Cloudflare Pages build: copy only the public site into dist/ so repo-only
// files (src/, docs/, tools/, worker/, package.json, ...) are never served.
// Pages project settings: build command `node tools/pages-build.mjs`, output dir `dist`.
import { cpSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
const OUT = 'dist';
const SKIP = new Set([OUT, '.git', '.github', '.gitignore', 'node_modules', 'src', 'docs', 'tools', 'worker', 'functions',
  'package.json', 'package-lock.json', 'build-sitemap.py', 'CNAME', 'README.md', '.build-tmp', '.wrangler']);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
const copied = [];
for (const name of readdirSync('.')) {
  if (SKIP.has(name) || name.startsWith('.env') || name.endsWith('.md')) continue;
  cpSync(name, `${OUT}/${name}`, { recursive: true });
  copied.push(name);
}
console.log('pages-build: copied', copied.length, 'entries to', OUT + '/:', copied.join(' '));
