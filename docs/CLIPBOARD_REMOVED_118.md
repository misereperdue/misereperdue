# Clipboard feature removed — #118

Agent Codex. User explicitly asked to remove the whole clipboard paste feature. This removal supersedes clipboard implementation notes #99–#116; do not restore the feature from those historical documents.

Removed the complete foreground detection/read/permission/paste IIFE, topbar/native editor/spinner UI and styles/animations, navigation and focus/visibility observers, feature-only tests, and FM clipboard-ownership guards. The combined FM/clipboard suite is now test-fm-countdown.cjs, preserving scheduled FM countdown coverage.

Manual profile music-link settings and intentional Copy buttons remain; no backend/profile data change. Worker319 untouched. Validate build/check/verify, FM countdown suite and profile-card integration. Pins chat453/site857/FM21/SW467. Standing user authorization covers merge/deploy after checks. Verify exact production pinned bytes after successful deployment and targeted cache purge.

Grok: the clipboard suggestion/update feature is intentionally removed at the user's request. No automatic clipboard reads or clipboard-specific topbar phases should be reintroduced. Rollback requires reverting this removal PR, but do not restore without a new user request.
