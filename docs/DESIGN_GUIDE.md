# Misère Perdue design guide

The source of truth for how the site looks and moves. Read this before any visual change, then the short [DC_RULES_CHECKLIST.md](DC_RULES_CHECKLIST.md) before merge. How to render, measure, pin and ship is in [DESIGN_PLAYBOOK.md](DESIGN_PLAYBOOK.md).

Values here are taken from live tokens in `src/css/site.css` and the standing rules dc has set. Do not invent new colours, easings or radii when an existing token or pattern already covers it. His latest instruction wins. He tests in the iPhone home-screen app, in light and dark.

---

## 1. Principles

- Calm, glassy, minimal. One material (frosted glass) and one restrained accent. No rainbow, no gimmicks, no pulsing rings or sheen unless he asks.
- The site is a phone app first. Design for a thumb, a notch, a home indicator and a keyboard.
- Lowercase voice in the product: usernames, "misery fm", quiet labels. Titles use the proper name: `Misère Perdue · <page>`.
- Change only what he asked. If he dislikes something without a direction, render 4–6 options in the real UI (light and dark) and let him pick. Do not ship a guess.
- Light and dark must both be designed, not one as an afterthought.

## 2. Tokens

Use the CSS variables. Do not hard-code greys or glass.

### Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` / `--bg-2` | `#fff` | `#070f29` | Page background |
| `--ink` | `#1c1c1e` | `#f5f5f7` | Text |
| `--muted` | `#636366` | `#b7bdd0` | Secondary text |
| `--accent` | `#0a1230` (navy) | `#a9d7f5` (ice) | Theme accent |
| `--fill` | `#f4f4f6` | `rgba(255,255,255,.06)` | Inset chips, fields |
| `--wash` | `rgba(10,18,48,.07)` | `rgba(169,215,245,.13)` | Soft page wash |
| `--stroke` / `--hairline` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.28)` / `.1` | Hairlines |
| `--spec` | `rgba(255,255,255,.8)` | `rgba(255,255,255,.28)` | Specular |

Special colours (not always tokens): VIP gold `#f5bf45` / `#f5c542` (reserved for VIP and gold confirms). Status dots: online `#30d158`, idle `#ffb020`, dnd `#ff3b30`, invisible `#8e8e93`. Chat mine bubble: ice `rgba(169,215,245,.88)` in dark, navy `rgba(10,18,48,.92)` in light. Others: `rgba(58,58,64,.55)` / `rgba(228,228,232,.62)`.

Nav-only (under `html.mp-bnav`):

| Token | Light | Dark |
|---|---|---|
| `--nv-glass` | `rgba(255,255,255,.42)` | `rgba(24,30,54,.36)` |
| `--nv-ink` | `#111318` | `#f4f6fb` |
| `--nv-sub` | `rgba(60,60,67,.6)` | `rgba(235,240,255,.55)` |
| `--nv-ice` | `#7eb8d9` | `#a9d7f5` |
| `--nv-blue` | `#0a84ff` | `#3d9bff` (focus rings) |
| `--nv-in` / `--nv-lens` | `rgba(118,118,128,.12)` / `.14` | `rgba(255,255,255,.09)` / `.13` |
| `--nv-rim` / `--nv-rim2` | `rgba(255,255,255,.95)` / `rgba(0,0,0,.05)` | `rgba(255,255,255,.16)` / `.05` |

Selected tab icons use ice/navy strokes (`#bfe0f8` / `#1a2558` plus SVG gradients `#nv-sel-d` / `#nv-sel-l`), not `--nv-blue`.

Misery fm accents follow the theme: `--fm-red: var(--accent)` (ice in dark, navy in light), `--fm-on` `#fff` / `#0a1230`. Veils: `--fm-veil` / `--fm-veil-m`.

### Glass

Every frosted surface uses these, including sheets (`--sheet-*` aliases them):

| Token | Value |
|---|---|
| `--glass-clear` | `blur(12px) saturate(150%)` |
| `--glass-regular` | `blur(24px) saturate(160%)` |
| `--glass-clear-tint` | light `rgba(255,255,255,.42)` · dark `rgba(10,12,24,.42)` |
| `--glass-regular-tint` | light `rgba(255,255,255,.55)` · dark `rgba(22,22,26,.38)` |
| `--glass-hairline` | `0.5px solid` black `.1` / white `.22` |
| `--glass-spec` | `inset 0 1px 0` white `.55` / `.28` |
| `--sheet-bg` / `--sheet-blur` / `--sheet-border` | aliases of regular tint, regular blur, hairline |
| `--sheet-shadow` | `var(--glass-spec), var(--shadow)` |
| `--sheet-scrim` | `rgba(0,0,0,.45)` |

Dock glass uses a tighter recipe: `blur(4px) saturate(190%) brightness(1.03)` on `--nv-glass`, plus `--nv-shadow` and inset rims. An open dock sheet steps up to `blur(28px) saturate(160%)`. The old-pill skin uses `--lg-*` / `--orb-*` (see `nv-skin-old`); do not mix those into new work unless the old skin is on.

### Type

Family: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif`. `body` line-height `1.4`. There is no `--type-*` scale; these are the sizes in use:

- 9–10px · tags, compact counts
- 11.5px · nav subtitle (`--nv-sub`)
- 12–13.5px · secondary UI, profile chips, dashboard
- 14px · nav title, toasts (`font-weight: 600–700`)
- 15px · chat bubbles (`line-height: 1.3`)
- **16px · all inputs and textareas** (standing rule). Exception: the chat composer is `17px !important` so iOS does not zoom on focus.
- 17px · a few numeric fields (gift amount)

### Spacing, radii, shadows

There are no `--space-*` or `--radius-*` tokens. Repeat the numbers already in the file:

- Gaps and padding commonly 4, 6, 8, 10, 12, 14, 16.
- Radii: fields and photos 11–14px; chat bubbles 16px; cards ~20px; an open sheet 28–30px (`#mp-dock.is-profile-bar` is `30px`); pills and chips `999px`; dock bubbles are a half-height capsule.
- Shadows: `--shadow` is `0 8px 24px rgba(40,40,70,.08)` in light, `0 10px 28px rgba(0,0,0,.28)` in dark. Dock: `--nv-shadow` `0 10px 30px` plus a tight second shadow.

### Motion

| Name | Value | Use |
|---|---|---|
| `MP_EASE` / `--mpd-e` | `cubic-bezier(.32,.72,0,1)` | Sheet morph, page view transitions (`0.42s`), dock lift |
| `--nv-spring` | `cubic-bezier(.32,.86,.28,1)` | Dock shape travel (`.56s`) |
| Bag count | `240ms` + `MP_EASE` | Scale/opacity on change |
| Sheet open height | `460ms` `MP_EASE`, radius to `28px` | `MPProfiles.openSheet` |
| Sheet close height | `380ms` `MP_EASE`, back to pill radius | Reverse morph |
| Sheet content in | `340ms` delay `80ms`, `translateY(6px) scale(.985)` | Incoming body |
| Chrome fade | `180–260ms` | Labels, previous pill contents |

Honour `prefers-reduced-motion: reduce`: drop travel to ~`0.01s`, skip entrance morphs, leave waveforms and rain still.

## 3. Layout and safe areas

- Test target: iPhone home-screen app (standalone), light and dark, narrow width (~390px).
- Top of content: `--mpd-top: calc(env(safe-area-inset-top, 0px) + 14px)`.
- Dock sits at `bottom: var(--mpd-b, var(--mpd-edge))`. In Safari `--mpd-edge` is `6px` (tight to the URL bar). In the standalone PWA it is `safe-area-inset-bottom + 8px` (just above the home indicator). On Chat it is placed above the composer (`--mpd-b`).
- Page room under the dock: `--mpd-clear` (default `--mpd-edge + 56px`). Compute it from where the pill is going, not mid-slide.
- Dock: `--mpd-h: 48px`. JS layout: `H=48`, inner shapes `S=44`, gap `G=6`, pad `P=4`, You/fm circles `C=40`. CSS default width 370px; JS caps at `min(innerWidth - 20, 430)`.
- The close (X) of a sheet must sit below the status bar. Cap sheet height so it never goes under the status bar.
- Content never scrolls horizontally. Do not lock `body` with `position: fixed` (it lifts the chat composer on iOS).

## 4. Components

### Nav pill / dock (`#mp-dock`)

- Every menu opened from the pill morphs through `MPProfiles.openSheet`. Never fade or scale a nav menu in on its own.
- The pill keeps the last shape the user left it in (tabs, fm or You) across pages and reloads (`mp-dock-state`). No per-page rules. No entrance morph on load.
- Page changes use the same `--nv-spring` as the shapes. No jump, flash or re-layout snap.
- No badge on the pill. No unread or online count on the chat tab.
- Status is a **12px** dot on the lower-right of the avatar circle, with a `2px` `--bg` ring. It follows the circle as the bubble resizes, and hides when You is expanded (the status button is there).
- Bag count is the ice-glass chip: `--nv-ice` fill, navy `#0a1230` type, 15px tall, inset highlight, eases when the number changes.
- When misery fm is live, the fm circle shows the album cover (or the fm icon if there is no art) and the label reads "misery fm is live" with no wordmark. Off air: the eyes logo on a white circular background, and the misery fm logo beside "is off air". Live dot: 8px `--nv-ice` chip, `--bg` ring, no pulse.
- Open sheet chrome is the pill itself (`z-index: 60`, radius 30px). Scrim is `#mpd-scrim` (`z-index: 44`, dark `rgba(3,7,20,.42)`, light `rgba(30,40,70,.2)`). Dock at rest is `z-index: 45`.

### Sheets and morphs

- One surface: `--sheet-*` (the profile sheet's frosted glass). Header is `mp-profile-bar-head` with round Back and Close.
- Morph: height from the pill (`--mpd-h`, radius half of that) to the sheet (`28–30px` radius), `460ms` open / `380ms` close, `MP_EASE`.
- Footers and buy bars sit in the sheet's flow, never floating, never horizontally scrollable.
- Notifications/activity stack: flick up past 28px or `vy <= -0.45` dismisses the group; a short drag springs back; sideways flicks still switch modes.

### Bubbles and embeds

- Chat bubbles: 16px radius, 15px type, 8px 12px padding. Mine are ice (dark) / navy (light).
- Music/listen cards: album-cover gradient bubbles. No album-art animation.
- Voice: dotted V3 waveform. Still under reduced motion.
- Polls: light-blue selected ring (`#a9d7f5` on `.is-mine .chat-poll-ring .fg`). Water-drop ripple on press.
- Compact profile is a bubble popover, not a full-page takeover, unless the full profile sheet is opened from the pill.

### Buttons, chips, badges, inputs, cards, dividers, toasts, popovers

- Buttons and chips are glass or `--fill`, often `999px` pills. Primary actions follow `--accent`. Destructive idle text is in the red family (`#df596a`, `#e5484d`); confirms use `mpTwoTap` (below).
- Profile badges sit **on the avatar**, never beside the name. Only gem charms go next to the name. Badge pills go under the stars line. (Not on the nav pill.)
- Inputs: 16px type, comfortable padding, 11–14px radius, 16px on iOS so the page does not zoom. Composer exception: 17px.
- Cards use glass-regular or `--fill`, ~20px radius (dashboard `.dz-card` is 20px).
- Dividers: dc's faded-end rule. Tokens `--mp-div-c` (`color-mix(in srgb, var(--ink) 16%, transparent)`), `--mp-div` (15% fade at each end), `--mp-div-in` (same, inset 12px). Use `.mp-divider` or `border-image: var(--mp-div-in) 1`.
- Toasts (`.mp-toast`): pill, sheet glass, 14px / 600, above the dock (`bottom: calc(var(--mpd-clear) + 6px)` when the bottom nav is on). `z-index: 2147483001`.
- Popovers and menus share `--sheet-*`. Do not invent a second glass recipe.

### Confirms

`mpTwoTap(button, armedLabel, go)`: first tap adds `.is-confirm` and the armed label; a second tap within 3s runs `go()`. The armed state turns red (dashboard uses `--dz-danger: #d92d20` light / `#ff6b61` dark, or `#ff5a5f`). No confirm popups.

## 5. Icons and logos

- Hand-draw SVGs on a **24×24** viewBox, Hugeicons style: `fill="none"`, `stroke="currentColor"`, **stroke-width 1.8**, `stroke-linecap="round"`, `stroke-linejoin="round"`. A soft `fill-opacity: .14` body fill is allowed on power icons.
- They inherit navy or ice through `currentColor`. Nav icons render at 20–22px; keep optical size by insetting in the viewBox, not with CSS padding (padding plus a rounded clip cuts off corner strokes).
- Show new icon options in the real nav, in light and dark, when he has not picked one.
- Power icons also get a distinctive round bubble in `site.css`. Hats, Sphere and badge construction: [DESIGN_PLAYBOOK.md](DESIGN_PLAYBOOK.md) §§3–4.
- The misery fm wordmark is `assets/misery-fm-logo.svg`, applied as a `currentColor` mask, never recoloured as a bitmap.

## 6. Imagery

- Promo and product images start from reference photos and the brand look (navy, ice, glass, calm). Do not invent a new colour story.
- **Never trim product images.** Never change the vip3d camera fit.
- Album covers fill a circle or rounded square with `object-fit: cover`. Do not animate the art.

## 7. Motion

Use the easings in §2. Keep travel short and slightly springy, not bouncy (`--nv-spring` was softened from a stronger overshoot for a reason). Animations are subtle, and off under `prefers-reduced-motion`. Do not add pulse, rainbow shimmer or looping attention effects.

View transitions on full navigation: `0.42s` `MP_EASE`. The dock itself should not play an entrance morph on load; it already knows its saved shape.

## 8. Copy and voice

- Page titles: `Misère Perdue · <page>`.
- "misery fm" is lowercase in user-facing copy. Usernames are lowercase.
- Quiet, short, literal labels. Prefer "is off air" and "Tap again to …" over shouting or joke microcopy.
- Report shipped work the same way: what changed in his words, what was tested, what was not.

## 9. Accessibility

- Aim for a **44px** effective tap target. Today's dock is slightly under that: the pill is 48px tall, tab hits are about 42px, You/fm circles are 40px. Do not shrink them further. Prefer 44px for new controls.
- Contrast follows `--ink` on `--bg` and `--muted` for secondary text. Ice on navy (and the reverse) is the accent pair.
- Focus: `#mp-dock :focus-visible` is a `2px` outline in `--nv-blue`, offset `2px`. Keep a visible focus ring on new controls.
- Honour `prefers-reduced-motion`. `touch-action: manipulation` on buttons and tappable rows. Inputs stay 16px (composer 17px) so iOS does not zoom.

## 10. Never

- Rainbow, gimmicks, pulsing live dots, or sheen he has already rejected.
- Fading or scaling a nav menu in; any path except `MPProfiles.openSheet`.
- Per-page pill rules, or an entrance morph on load.
- A badge, chat unread, or online count on the nav pill.
- Horizontal scroll in sheets. Floating footers or buy bars. An X hidden under the status bar.
- `content-visibility` on chat messages.
- `media=` on iTunes URLs.
- Trimming product images, or changing the vip3d camera fit.
- A second glass recipe when `--glass-*` / `--sheet-*` already fit.
- `body { position: fixed }` to lock scroll.
- Animating `filter` on an element that also has `backdrop-filter` (WebKit crash).
- Workflows that email dc. Changing the public repo to private.
- Real charges, or real production test accounts.
- Secrets, or dc's email or personal data, in code, URLs or requests.

## 11. Pre-ship design checklist

1. Plan the change against this guide and the ask, then read the code you will touch.
2. Match existing patterns and tokens. Edit `src/`, not the built files.
3. Check light and dark, and a small iPhone width.
4. Walk the morph, scroll and keyboard paths (composer, sheet close, page change, reduced motion).
5. Run the short [DC_RULES_CHECKLIST.md](DC_RULES_CHECKLIST.md), then the [playbook](DESIGN_PLAYBOOK.md) loop (pins, `check.mjs`, verify, confirm live).

### Gaps (no token in the repo)

These are observed, not invented. Ask dc before turning them into new tokens:

- No `--space-*`, `--radius-*` or type-scale variables; values are hardcoded.
- No single `--danger` token (reds in use: `#df596a`, `#e5484d`, `#ff5a5f`, `--dz-danger`).
- No 44px tap-target token; nav circles are 40px today.
- `--nv-blue` is the focus colour, not the selected-tab colour.
- Light-mode nav ice (`--nv-ice: #7eb8d9`) is not the same as dark `--accent` (`#a9d7f5`).
- z-index is not a named scale (dock 45, open sheet 60, leftover `.fm-sheet` 1101, toast `2147483001`).
