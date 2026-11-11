# Strict clipboard detection and top-bar morph — #106

Agent: Codex. Branch `codex/106-clipboard-topbar`. Website only; Worker319 unchanged.

False detections came from the generic suggestion shown when clipboard permission was unknown/denied. That path is removed. Only validated HTTPS song/share URLs on Apple Music, Spotify or SoundCloud trigger UI; Apple artist/album-without-song pages, Spotify albums, reserved SoundCloud routes, lookalike domains, credentials and unrelated URLs stay quiet. If the browser cannot read clipboard automatically, no detection is claimed; a supported user paste can supply the validated link. Stale idle suggestions are removed on backgrounding. Rich clipboard/share-text parsing remains.

The active Chat/Globe header or Shop navbar now owns the clipboard phase. Existing bar children stay in place, hidden/inert while the clipboard content crossfades inside the exact same dimensions. No separate pill, clone header or height change. Dismissal/success restores prior child accessibility and styling. Navigation reparents the content to the new active bar. Profile/FM ownership events and FM guards avoid capture-listener conflicts; restoration reconciles the FM state.

A visible spinner and aria-busy status cover both metadata lookup and profile save, stop on success/error, and respect reduced motion. Confirmation uses the already validated link, so it does not prompt to reread an unknown clipboard. Outside tap/Escape still dismiss and abort unfinished work; no pre-confirmation metadata call or profile write.

Validation: build/check/verify; strict URL/unknown permission/resume tests, exact bar geometry/inert restoration, spinner held through both delayed requests, Chat→Shop relocation, profile claim and live-FM coexistence. Rich ClipboardItem/native-paste/outside tests remain; profile suite passes360/390/1440 and themes. UI/account writes and clipboard values are test fixtures; native iOS not claimed from Linux.

Pins: site852/chat447/profile16/FM19/SW461. Release verification must use exact pinned URLs; targeted CDN purge after successful deployment precedes loading production, due the stale query-cache issue in #103. Roll back by reverting this PR. Grok: never show a generic detection prompt when clipboard contents are unverified; preserve shared bar restoration and profile/FM handoff events.
