# Unread bell indicator — #207

Codex; codex/207-unread-bell. Two causes: Globe header wiring marked all notifications read on its first render, and final MPForum assignment discarded refreshNotifs while omitting updateBellBadge (called by Chat header setup). Chat could therefore miss both initial and live badge updates.

Remove the render-time read POST; retain marking read only after notifications load in the opened menu. Export both refresh hooks on the final module object. Fetch initially/auth/foreground, repaint cached counts when headers rebuild without bypassing the existing 30-second fetch throttle. Ignore outdated responses across user changes and refreshes. Keep existing badge design and add unread count to the accessible bell label.

Validation: expanded test-notif-morph covers initial Chat unread badge, switching to Globe without a read POST, WebSocket notification count refresh, and opening the tray clearing both badges; existing menu chrome/layout/close checks remain. build/check/verify/diff checks. All API traffic is mocked. Frontend only; backend untouched.

Grok: do not mark notifications read from header wiring. Keep both public badge refresh methods in the final MPForum export. Pins forum1191/SW536; other pins unchanged. Target-purge and verify exact production assets after successful Pages deployment. Rollback by reverting this PR.
