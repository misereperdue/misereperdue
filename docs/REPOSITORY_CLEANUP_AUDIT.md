# Repository cleanup audit — 2026-11-09

Scope: repository inventory and Cloudflare-read-only comparisons. This report proposes changes; it does not delete live resources.

## Key findings
- Main tree has 4,248 entries. Most are 4,009 files under `emoji/twemoji-17/` (around 10.1 MB). This is an intentional vendored emoji set, **not** verified dead weight.
- `src/js/` and `src/css/` are editable sources. `js/` and `css/` are built assets deployed to the site. They **must not** be deduplicated by deleting one side.
- `vendor/` includes locally vendored Three.js and Tiptap code. Preserve until network/offline use is checked.
- `docs/CODEX_GRIM_HANDOFF.md` includes current development and live Misery FM implementation details. Preserve.
- `worker/misery-chat/wrangler.toml` is a historical backup, not a safe deployment source. Its contents must be reconciled with live settings before use.
- `tools/test-*.cjs` and `tools/check.mjs` may be needed to validate mobile UI and service worker/version pins. Preserve.
- No obvious `.env`, archived copies, or temporary build outputs appeared in tracked file paths in the inspected main tree.

## Safe cleanup roadmap
1. Establish issue/PR-based agent coordination and recheck current branches before edits.
2. Audit static asset references and service worker cache pins before eliminating any images, icons, or media.
3. Separate generated vs source file ownership in documentation and CI.
4. Find dead code with explicit imports/references and behavior tests, not just filename similarity.
5. Use focused task-specific PRs for any actual removals; include tests and rollback steps.

## Do not remove without further evidence
- Emoji, vendor assets, `src/` or built `js/`/`css/` code
- Current Misery FM or Shopify assets
- Existing service-worker resources
- Historical handoff documentation

Related issue: #52. Cloudflare Worker repository: misereperdue/misery-worker.
