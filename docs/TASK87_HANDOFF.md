# Task 87 — music icon, profile alignment and FM catalog metadata

Codex branch codex/87-music-profile from f70e1546. Circular red Music menu icon
uses an original rounded filled double-note mark inspired by Apple Music. Catalog
fallback/brand assets are untouched. Compact profile text is centered, while star
and expand controls are matching 30px circles on the same row; large counts use
compact notation with full points in the accessible label/tooltip. VIP/07 pills
match the adjacent 26px chips. Orders copies the shop nav's actual bag artwork;
Dashboard uses four valid rounded SVG tiles. Badge choices are centered icon-only
boxes with accessible names/pressed state and a small selection check. Sign out
has a filled capsule. Empty Listening/photo removals remain.

FM Add songs opens a URL/metadata panel, then an explicit audio file chooser:
- Only canonical HTTPS music.apple.com song links (song route or album ?i=id).
- Fetch iTunes metadata by numeric id/storefront; no arbitrary URL fetching.
- Show title/artist/album/artwork and allow lookup error/retry/cancel.
- Attach a user-supplied audio file; snapshot metadata per upload (no stale match
  leaking to later direct uploads). Single matched file; ordinary batch uploads
  remain. Persistent external picker survives sheet remounts/iOS return.
- Apply title, artist, album, year, genre, explicitness and matched artwork through
  existing FM upload/art routes. Real audio duration wins over catalog duration.
- No commercial audio search/downloader, Apple stream extraction or preview-audio
  reuse. User was told the supported alternative is metadata + authorized audio.
- Lookup cancels on edit/close, times out, validates record id; optional artwork
  failures do not undo a successful audio upload. Existing analysis/waves remain.

No misery-chat Worker changes or API contract changes. The website Pages CSP
connect-src adds only https://*.mzstatic.com in both _headers and middleware for
artwork blob fetching; nonce/other policies unchanged. This is Pages middleware,
not the separate stale Worker snapshot; never deploy that snapshot.

Tests mock all account/FM/catalog/media traffic. New test-fm-apple-import.cjs
covers malicious host/album validation, catalog failure/retry, no preview audio
retrieval or upload on lookup, matched metadata/cover with real fixture bytes,
picker remount, direct-upload isolation and listener UI. Profile suite checks
circle geometry/text alignment, icon-only choices, chip sizes, Orders artwork,
sign-out bubble and existing manage/settings/FM flows. Old FM picker helper now
opens the Add panel before the file chooser. Native WebKit host libraries remain
unavailable; no native iOS claim.

Pins site844/chat440/profile-cards12/misery-fm12/SW451. Reconcile fresh main, verify
preview and exact public bytes before completion. Exact tested head and deployed
merge belong in issue #87/PR. Rollback is a website PR revert, no migrations.
