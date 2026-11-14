// Screenshot chat + the profile view in light and dark with mocked API/WebSocket and any power looks.
// Usage: python3 -m http.server 8811 &   then
//   node tools/shot-chat-profile.cjs '<json map user -> pw look>' [outDir] [profileUser]
// Example: node tools/shot-chat-profile.cjs '{"ana":{"hat":"beanie"},"fan":{"couture":"ivory"}}' /tmp/shots fan
// Writes chat-<scheme>.png, profile-<scheme>.png and per-avatar close-ups avatar-<scheme>-<n>.png (5x DPR).
// See docs/DESIGN_PLAYBOOK.md section 6.
const { chromium } = require(process.env.MP_PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
const PW = JSON.parse(process.argv[2] || '{"ana":{},"fan":{}}');
const OUT = process.argv[3] || '/tmp/mp-shots';
const ME = process.argv[4] || Object.keys(PW).slice(-1)[0] || 'fan';
const BASE = process.env.MP_BASE || 'http://localhost:8811';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block', colorScheme: scheme });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    const now = Date.now(), names = Object.keys(PW);
    const msgs = names.map((u, i) => ({ id: 'm' + i, user: u, text: 'hello from ' + u, ts: now - (names.length - i) * 60e3, pw: PW[u] }));
    const look = PW[ME] || {};
    const me = { username: ME, points: 900, numId: 42, createdAt: Date.parse('2025-03-02'), badges: [], powers: Object.keys(look), powersOn: Object.keys(look), powerSettings: {} };
    await ctx.route('https://api.misereperdue.com/**', r => {
      const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
      const u = r.request().url(), J = o => r.fulfill({ status: 200, headers: H, contentType: 'application/json', body: JSON.stringify(o) });
      if (/ws-ticket/.test(u)) return J({ ok: true, ticket: 'tk' });
      if (/\/api\/me|\/api\/user\//.test(u)) return J({ ok: true, user: me });
      if (/\/api\/messages/.test(u)) return J({ ok: true, messages: msgs, pw: PW });
      return J({ ok: true, messages: [], users: [], threads: [] });
    });
    await p.addInitScript(([me, msgs, PW]) => {
      localStorage.setItem('chat_token', 't'); try { sessionStorage.setItem('mp-splash-shown', '1'); } catch (e) {}
      class FWS { constructor() { this.readyState = 0; setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); setTimeout(() => this.onmessage && this.onmessage({ data: JSON.stringify({ t: 'hello', you: me, messages: msgs, badges: {}, pw: PW, online: msgs.length, caps: {} }) }), 30); }, 30); } send() {} close() {} addEventListener(t, f) { this['on' + t] = f; } }
      FWS.OPEN = 1; window.WebSocket = FWS;
    }, [me, msgs, PW]);
    await p.goto(BASE + '/#chat', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await p.locator('.chat-msgs').screenshot({ path: path.join(OUT, `chat-${scheme}.png`) });
    const avs = await p.$$('.chat-msg .chat-avatar-wrap');
    for (let i = 0; i < avs.length; i++) { const bx = await avs[i].boundingBox(); await p.screenshot({ path: path.join(OUT, `avatar-${scheme}-${i}.png`), clip: { x: bx.x - bx.width * .35, y: bx.y - bx.height * .6, width: bx.width * 1.7, height: bx.height * 1.7 } }); }
    await p.evaluate(u => MPChat.openUserSheet(u), ME);
    const o = p.locator('.mp-profile-summary-open'); await o.waitFor({ timeout: 8000 }); await p.waitForTimeout(400); await o.click(); await p.waitForTimeout(1500);
    await p.locator('.mp-profile-bar').screenshot({ path: path.join(OUT, `profile-${scheme}.png`) });
    await ctx.close();
  }
  console.log('wrote', OUT, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
