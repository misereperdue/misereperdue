# Task 79 — resumed from Grim

Codex resumed Grim's uncommitted t546u task on Nov 11 from main 27c5c80f.
No published WIP branch or PR existed. The authoritative scope is issue #79.

- Menu-only original beamed note in a 36px pink/red rounded square. Catalog
  fallback `mpMusicIcon()` and reaction/brand/badge artwork are unchanged.
- Share/Edit are small icon buttons in the name column above the name, with
  no absolute corner positioning. Removed repeated @username and duplicate
  empty-bio/footer-edit prompts. Name casing and account metadata remain.
- Listening stays above the photos. Photo stack uses the card's available width
  and square photos, with rear-card peeking and no Photos label. Flick completion
  waits for its transition instead of resetting early; cancelled swipes snap
  back instead of advancing. Scroll and reduced-motion behavior remain.
- Settings retain all controls and 16px inputs with quieter, consistent spacing.
  No city/location controls or dividers added. Continuous-blur morph geometry,
  sheet tokens and the share-profile artwork builder are unchanged.

No Worker changes. Build the scoped modules; reconcile fresh asset/SW pins
against main before release. Browser checks include profile glass/anchoring,
large photos, top tools, menu icon, settings and saved profile flows, with all
account/catalog writes mocked. Native WebKit needs its existing host libraries;
the test can select Chromium with MP_PROFILE_ENGINE=chromium.

Rollback is a revert of the website PR; there are no migrations or stored-data
changes. Keep issue/PR updated with exact tested head and public deployment
verification. Earlier speculative music-transparency WIP remains stashed and
must not be applied over Grim's shipped work.
