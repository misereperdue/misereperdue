# Design & delivery playbook (read before any visual or Powers work)

How Claude designs, verifies and ships on misereperdue.com, written so Codex and Grok Bot can work the same way. The goal is that dc never sees a guess: every visual change is rendered, inspected and compared before it ships.

## 1. Core loop (every task)

1. **Read the ask literally, then find the code.** Grep for the exact class or feature; read the surrounding function before editing. Never assume a selector or API shape.
2. **Change the source, not the build.** Edit `src/js/*.js` and `src/css/site.css`; `node tools/build.mjs` generates `js/` and `css/`. If the build touches `js/power-icons.js` without you changing it, run `git checkout js/power-icons.js`.
3. **Render it and look at it.** Run the harness (section 6) in **light and dark** and open the PNGs. If a screenshot looks off, it is off. Crop and zoom (3–5x DPR) for anything small: icons, hats, logos, pill contents.
4. **Measure, don't eyeball.** For sizes and alignment, read `getBoundingClientRect()` in the harness and compare numbers (for example, pill heights must match: 26px).
5. **Checks:** `npm run -s verify` (built files byte-identical) and `npm run -s check` (0 errors). For Worker changes, run every `test/*.test.mjs` and compare against `main`. A test that fails on main too is pre-existing; say so in the PR rather than hiding it.
6. **Bump pins.** Every changed asset gets its `?v=` bumped in `index.html` **and** `sw.js`, plus `SW_VERSION` in `sw.js` and `sw.js?v=` in `index.html`. Always read the current numbers from `origin/main` first, because another agent may have bumped them.
7. **PR → merge → confirm live.** Poll `https://misereperdue.com/?x=$RANDOM` until the new pin appears. For the Worker, poll an endpoint whose response changes (the Durable Object can take 3–6 minutes to pick up a deploy).
8. **Report like a person.** Say what changed (in dc's words), what was tested and how, and what wasn't tested. No internal jargon, and never claim something works unless you saw it.

## 2. Taking design feedback from dc

- When dc says "I don't like X" without a direction, **render 4–6 options side by side in the real UI** (light and dark), send the image, and ask him to pick. Don't ship a guess; don't ask in the abstract.
- When dc sends a **reference image**, measure it: radii, gaps, angles and proportions in pixels, converted to ratios. Example: the Chanel CC is outer R=551, inner 376 (stroke 32% of R), centres 541 apart (~R), openings ±29.5° from horizontal, radial cuts, one solid shape. Write the measured numbers in a code comment.
- Change **only** what he asked. If he likes part of a design ("the pill looks cool"), keep that part exactly.
- Feedback that sounds contradictory usually means a specific detail is wrong; isolate it (for example "too tight" meant spacing, not thickness) and render variations of just that detail.
- Remove effects he dislikes everywhere they appear (sheen, pulsing rings, rainbow), not just in one spot.
- Layout rules dc has set: badges sit **on the avatar**, never beside the name; only gem charms go next to the name; badge pills go under the stars line; nothing next to the name except gem charms.

## 3. Visual language

- **Colours:** navy `#0a1230` (light-mode accent/ink), ice `#a9d7f5` (dark-mode accent), dark background `#070f29`, VIP gold `#f5bf45` (reserved), 07 ring navy/ice. Use the CSS variables (`--bg`, `--ink`, `--muted`, `--accent`, `--fill`) rather than hard-coded greys.
- **No rainbow, no gimmicks** unless asked. Prefer one material (black glass, silver, knit) with a single restrained accent. Animations are subtle, slow and off under `prefers-reduced-motion`.
- **Glass:** surfaces use the `--glass-*` tokens; sheets use the top-bar profile chrome (`mp-profile-bar-head` with round Back/Close controls).

### Power icons (`src/js/power-icons.js`)
- 24×24 viewBox, 1.8 stroke, round caps and joins, `currentColor` only (they inherit navy or ice). A soft `fill-opacity:.14` body fill is allowed.
- Each power also gets a distinctive round bubble in `site.css`: `[data-pw="id"]:is(.pow-ico,.pw-ico,i){background:…}`.

### Hats (`hatSvg` / `HAT_SVG` in `src/js/chat.js`)
- Drawn into a 140×145 box over the avatar; the **avatar circle is centred (70,95) r50**, so the head top is y≈45. The overlay sits at `left/right:-20%; top:-45%` with a −7° tilt (headphones untilted).
- Realism comes from: a radial-gradient light source (top-left), clipped texture (knit columns curving to the crown, stitch chevrons, growth rings), a fold shadow under cuffs, thin highlights at ~10–20% white, and a `drop-shadow` on the whole SVG.
- Beanies sit on the upper ~40% of the head (`translate(5.6 -13) scale(.92 1)` on the dome group), not over the eyes.
- Gradient/clip ids are fixed strings (identical across instances), so duplicates are harmless.
- One hat at a time. Chanel and Louis are Hat styles unlocked by buying them; option rows marked `requires` only show when owned, and the Chanel colour row only shows when Chanel is the chosen style.

### Badges and pills
- Avatar badges and the Everypower pill: the black glass disc with a pearl edge and white infinity on the avatar; the pill uses a bare holographic infinity (masked gradient) with no orbit line and no sheen. Pill height must equal the VIP/07 pills.

## 4. Powers system rules (Worker + site must agree)

- Catalog lives in `POWERS` in the Worker. `powerStyle(u)` produces the look map the site renders; the site's `mpPwFromProfile` must mirror it exactly (hat style mapping, Charms gating, one hat at a time).
- `requires: "<id>"` gates buying, and the look only applies while the required power is on (Charms → gems, Hat → Chanel/Louis).
- New powers automatically notify every user once (stored `powers:catalog`); Everypower holders are told to buy the new power to keep the badge. Adding a power is therefore user-visible: mention it in the PR.
- Ship the **site first** when the Worker adds options the old site can't handle; ship the **Worker first** when the site depends on new data. Both must be backwards compatible for the gap between the two deploys.

## 5. Worker deploy checklist (dc has given standing approval for Claude; agents follow AGENTS.md)

1. Confirm the live version equals the last deployed `main` (download `content/v2` and compare its hash with `git show <commit>:worker.js`).
2. Run every test; compare failures with `main`.
3. Upload a version with the same non-secret bindings plus `keep_bindings:["secret_text"]`, and an annotation naming the PR and the rollback version.
4. Verify **12 secrets** and the bindings `AI, BACKUPS, CHAT_ROOM, FM_BUCKET, SHOPIFY_CLIENT_ID`.
5. Deploy 100%, then health-check: `/api/powers` 200, `/api/me` and `/api/vip` 401, cron `17 8 * * *` still present.
6. Poll until the change is visible (Durable Object restart lag).

## 6. Screenshot harness

`tools/shot-chat-profile.cjs` mocks the API and WebSocket, loads the local site (`python3 -m http.server 8811` in the repo) and screenshots chat plus the profile in light and dark, with any power looks you pass:

```
python3 -m http.server 8811 &
node tools/shot-chat-profile.cjs '{"ana":{"hat":"beanie"},"fan":{"couture":"ivory"}}' /tmp/shots
```

Notes that cost time before:
- Chat only renders if `/api/ws-ticket` returns `{ok:true,ticket}` and the fake WebSocket sends a `hello`.
- Playwright routes: **the last registered route wins**. Register specific mocks (for example `/api/preview`) after the catch-all.
- Re-check that both PNGs were rewritten (stale files fooled a review once).
- Profile header children use flex `order`; when moving elements into `.mp-pb-nm`, set `order` explicitly.
- Local `fetch` to Apple, Wikimedia and similar may be blocked in the sandbox; measure from images dc sends instead.

## 7. Reliability habits

- Re-read the current file from `origin/main` before editing; other agents ship constantly.
- Smallest change that fully solves the ask; no drive-by refactors.
- Keep a mental (or written) list when dc sends several asks in one message, and answer every item.
- If something is blocked (network, credentials, a test that can't run), say exactly what and why.
- Never commit secrets; never put dc's email or personal data in code, URLs or external requests.
