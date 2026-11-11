# Profiles in the status bar — tasks #81–85

Avatar taps replace the active page's status-bar content with a compact profile
summary with name, points, bio, and listening or account details. Tap that row to grow the same glass bar into a scrollable full profile.
Edit morphs the same surface into the existing account editor. Back steps through
edit/manage → full → compact; Close restores the original status bar. Escape follows the
same steps. Navigation closes the profile and restores inert/ARIA/style state.
On pages without a status bar, account settings use the main navigation bar.

The compact avatar is centered; expand and SVG star/points use bubble controls.
Full profiles keep lowercase names, avatar rings/badges, points, complete bio,
share artwork, whisper/hide and owner management. Photos are no longer shown or
editable. Empty Listening renders nothing. There is no carousel, location section or divider. Existing stored
photos/city values are preserved; listening saves omit both fields.

Settings use compact expandable Profile, Listening, Notifications, Signature and
Account groups. The existing editor retains avatar/username/bio, music controls, account
and recovery settings, signature and notification controls. Inputs remain 16px;
opening the editor does not focus an input or open the keyboard. Upload/search,
explicit save and error retry retain the existing API contracts. Completed saves
refresh the profile without replacing its bar. Own badge selection uses labeled
choices, None and visible pending/error states. Manage user morphs the same bar
into owner-only badge grant/revoke and chat ban/restore controls, preserving
existing server authorization. No Worker changes or migrations.

Implementation: `src/js/profile-cards.js` owns bar state, size animation and cleanup;
`src/js/chat.js` supplies authenticated profile data/actions and mounts the existing
editor inline. `src/js/misery-fm.js` yields any now-playing morph and skips its bar
capture/decorating while the profile is open. FM playback is unchanged. The bar's
own frosted backdrop never fades or scales during transitions. A diffuse avatar
image fills compact/full/edit phases. Regular bar content fades out while the
compact profile fades in; only content fades when changing profile phases. Reduced motion skips
animations; visual-viewport changes and content-size observation keep the bar
within available space and let short views shrink.

Run `npm run check`, `npm run verify`, `git diff --check`, and
`MP_PROFILE_ENGINES=chromium node tools/test-profile-cards.cjs`. The established
`test-profile-expanded.cjs` command aliases the new status-bar suite. Browser
checks mock account/catalog/upload/FM APIs, cover both phone widths/themes,
reduced motion and desktop, real avatar taps, the same DOM bar through all phases,
geometry/glass, no keyboard on entry, FM coexistence, no photo UI, avatar backdrop/frost/fade, music search,
save failure/retry/reopen, own badge selection/None, owner grants/revokes,
ban failure/retry/restore, nonowner gates, compact settings, Globe entry, shop settings and navigation cleanup.
Native WebKit currently lacks required host libraries; Chromium mobile emulation
is not native iOS verification.

Rollback: revert the website PR. No stored data is removed or migrated. Probe
preview/production before fetching final versioned assets; verify the exact
served bytes, not just Cloudflare's deployment status.
