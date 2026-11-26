# dc's rules checklist

Read this before any UI change on misereperdue.com. For visual language, Powers, icons, hats, the render loop, pin bumps and Worker deploys, follow [DESIGN_PLAYBOOK.md](DESIGN_PLAYBOOK.md) — do not copy it here.

dc tests in the iPhone home-screen app, in light and dark. His latest instruction wins.

## Nav and sheets

- Every menu opened from the nav pill morphs out of the pill through `MPProfiles.openSheet`. Never fade or scale a nav menu in on its own (misery fm included).
- The pill keeps the shape the user last left it in (tabs, fm or You) across pages and reloads. No per-page collapsed or expanded rules. Persist it (`mp-dock-state`); no entrance morph on load.
- Page changes (for example chat to globe) use the same spring as the rest of the nav. No jump, flash or re-layout snap. Work out page room from where the pill is going, not mid-slide.
- No badge on the nav pill. The status is a 12px dot on the lower-right of the avatar circle, with a background ring. It follows the circle as the bubble resizes, and hides when the You bubble is expanded (the status button is there).
- No unread or online count on the chat tab. The bag count is the small ice-glass chip (site light blue, navy type) that eases when the number changes.

## Sheets

- Content never scrolls horizontally.
- Footers and buy bars sit in the sheet's flow, never floating.
- The close (X) is always reachable below the status bar. Cap the sheet height so it does not go under the status bar.
- Sheet chrome matches the profile bar: `mp-profile-bar-head` with round Back and Close.

## Style

Visual tokens, colours, Powers, hats and icon drawing rules live in the [playbook](DESIGN_PLAYBOOK.md). In short:

- Surfaces use the `--glass-*` tokens. Accents are navy `#0a1230` and ice `#a9d7f5`. No rainbow, no gimmicks, no pulsing rings or sheen unless asked. Honour `prefers-reduced-motion`.
- Icons are Hugeicons-style: 24×24, 1.8 stroke, round caps and joins, `currentColor`.
- Confirms use `mpTwoTap`. The armed state turns red.
- Dividers fade at both ends (dc's divider).
- Inputs are 16px. Usernames are lowercase. "misery fm" is lowercase in user-facing copy. Page titles are `Misère Perdue · <page>`.
- On profiles: badges sit on the avatar, never beside the name. Only gem charms go next to the name. Badge pills go under the stars line.

## Never

- `content-visibility` on chat messages.
- `media=` on iTunes URLs.
- Trimming product images, or changing the vip3d camera fit.
- Workflows that email dc.
- Changing the public repo to private.
- Real charges, or real production test accounts (mocked tests only).
- Committing secrets, or putting dc's email or personal data in code, URLs or external requests.

## Process

- One PR per request. Branch `grok/<issue>-<task>` or `codex/<issue>-<task>` from latest `origin/main`. Rebase before merging. Check open PRs first.
- Edit `src/js` and `src/css`, then `node tools/build.mjs`. Checks: `node tools/check.mjs` and `npm run verify` only, unless you are fixing a bug that needs a test.
- Fresh `?v=` pins from `origin/main` in both `index.html` and `sw.js`, and bump `SW_VERSION`.
- When dc dislikes something without giving a direction, render 4–6 options in the real UI (light and dark) and let him pick. When he gives a direction, build that. Change only what he asked.
- Site PRs ship live once merged. Worker deploys need dc's approval each time, and must not be a stale snapshot (see the playbook).
