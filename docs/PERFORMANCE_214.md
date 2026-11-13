# Whole-app performance follow-up — #214

Codex; codex/214-app-performance. User asked to continue Claude's whole-web-app performance work. Latest pushed Claude work was merged #213; no unfinished performance branch/PR or handoff was available. Baseline is main 0eb4665d.

## Changes

1. Hidden sign-in tabs no longer poll layout for up to 180 animation frames. Initial sizing and ResizeObserver handle first reveal/resize; a panel-class fallback handles browsers without ResizeObserver. Repeated identical geometry does not rewrite styles or force layout. Turnstile/security and authentication requirements are unchanged.
2. Bag payment artwork loads on actual Bag entry, including programmatic pushState routing. The old four-second background timer fetched these images on Shop/Chat/Globe even if Bag was never opened. Decode is asynchronous. Appearance and checkout behavior are unchanged.
3. Shop/Globe decorative globes precompute invariant sphere coordinates, project each vertex once per frame, and reuse projected points for front/back rendering. Same samples, frame cadence, colours, live pins, reduced motion and visibility behavior. No reduction in visual quality.

## Evidence and limits

Public anonymous cold loads in Chromium, 390x844, DPR2, 4x CPU throttle, service worker blocked, six-second captures. This is a lab sample, not field Core Web Vitals, authenticated-session performance, INP, or a physical iPhone measurement. Network, third-party challenge work and rendering timing vary.

| Route | Payment requests before → after | Payment transfer bytes before → after | Main-frame ScriptDuration before → after |
|---|---|---|---|
| Shop | 3 → 0 | 71,063 → 0 | 1.046s → .919s |
| Chat (signed out) | 3 → 0 | 71,063 → 0 | .711s → .765s |
| Globe | 3 → 0 | 71,063 → 0 | .960s → .817s |

Do not claim the whole app is a fixed percentage faster: the Chat sample did not improve and its challenge-frame work dominates. First paint was already fast; no speculative loading-framework rewrite was made. The trace showed hidden-auth callback costs disappearing; page-level timing remains noisy.

Actual canvas microbenchmark, 150 frames at 512x256: original 116.3/112.8/137.4ms, optimized 94.1/51.6/30.9ms across three runs (shared-runner variance). A subsequent four-orientation pixel check was 124.5 → 36.6ms with zero differing channels out of 2,097,152. These are canvas-loop costs, not end-to-end speed claims. Fixed geometry takes roughly 70KB per globe in exchange for fewer per-frame trig calculations/allocations.

Reproduce (full git history and Chromium/Playwright needed):
- `MP_PERF_BASE_REF=0eb4665d node tools/benchmark-globe.cjs` — real canvas comparison at four rotations; fails if pixels differ.
- `MP_PERF_VARIANT=before node tools/measure-app-performance.cjs`
- `MP_PERF_VARIANT=after node tools/measure-app-performance.cjs`

Raw trace files go to /tmp/mp-app-performance; APIs and third-party responses remain live in the measurement harness, so results are observational. The asset overrides compare baseline versus current code while leaving the same public page environment.

## Validation / Grok handoff

`test-app-performance` covers no idle payment downloads, bounded hidden auth layout reads, tab selection and resize alignment, sign-up validation/security widget, all payment images loading on programmatic Bag entry, and no repeat downloads. API traffic is mocked. `test-shop-header-spacing` passes at 360/390/1440 in dark/light; canvas pixel comparison passes. Build/check/verify/diff checks pass.

Frontend only, no Worker or resource changes. Pins chat490/shop135/app14/SW541 (other pins unchanged). Preserve these startup/Bag behaviors in future edits. After successful Pages deploy, purge only new pinned/canonical asset URLs and verify actual delivered bytes. Rollback by reverting this PR. Future profiling can separately address signed-out challenge cost and large authenticated chat histories with representative data; neither is claimed fixed here.
