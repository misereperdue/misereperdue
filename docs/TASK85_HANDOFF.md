# Task 85 — profile polish, settings and inline management

Codex, codex/85-profile-polish from f5c2b655. Compact avatar is centered in a fixed
36px slot; SVG expand control sits in a 30px bubble, SVG star/points in a capsule.
Full avatar, badge placement, action icons and spacing use consistent dimensions.
No empty Listening placeholder or empty details wrapper is rendered.

Manage user is a phase of the same status bar, with a labeled five-badge grant
picker and chat ban/restore controls. It is injected only for an owner viewing
another user. Uses existing /api/badge (username + badge toggles ownership) and
/api/ban (username + banned boolean), with pending locks and inline error/retry.
Grim's bot badge stays permanent. No Worker changes or privilege expansion.

Own badge selection shares the picker: granted badges + None, clear selected
state, error/retry, current avatar/header/profile sync. Respect explicit
activeBadge:null instead of falling back to verified when a user chooses None.

Existing settings controls are regrouped, not rebuilt: Profile (open), Listening,
Notifications, Signature, Account (password/X/recovery), plus Sign out. Native
expandable sections and 16px inputs; no autofocus keyboard. Avatar/photo upload
is retained; pinned photos remain removed. Field save handlers stay attached.

Natural content size now controls bar height, rather than an allocated scroll
viewport that prevented shrinking. ResizeObserver updates height for save/error
feedback and dynamic content, cleaned on close. Existing frost, entry fade,
reduced motion and navigation cleanup remain. No migrations/data deletion.

Tests mock all badge/ban/account writes, including owner grant/revoke, ban error
and retry/restore, nonowner/own-profile gates, own badge error/retry/None (verified
user)/VIP, settings grouping and feedback visibility. Existing phone/desktop,
Globe/shop, FM, music, no-photos, geometry and keyboard checks remain.
Pins site843/chat439/profile-cards11/SW450 (FM11 unchanged). Exact release evidence
belongs in issue #85/PR. Rollback is the website PR revert.
