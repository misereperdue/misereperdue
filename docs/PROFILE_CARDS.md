# Profiles in the status bar — task #81

Avatar taps replace the active page's status-bar content with a compact profile
summary. Tap that row to grow the same glass bar into a scrollable full profile.
Edit morphs the same surface into the existing account editor. Back steps through
edit → full → compact; Close restores the original status bar. Escape follows the
same steps. Navigation closes the profile and restores inert/ARIA/style state.
On pages without a status bar, account settings use the main navigation bar.

Full profiles keep lowercase names, avatar rings/badges, points, complete bio,
share artwork, whisper/hide and owner management. Listening precedes up to three
pinned photos in a **static grid**. There is no flickable stack, carousel, location
section or divider. Existing photos and stored city values are preserved.

The existing editor retains avatar/username/bio, music/photo controls, account
and recovery settings, signature and notification controls. Inputs remain 16px;
opening the editor does not focus an input or open the keyboard. Upload/search,
explicit save and error retry retain the existing API contracts. Completed saves
refresh the profile without replacing its bar. No Worker changes or migrations.

Implementation: `src/js/profile-cards.js` owns bar state, size animation and cleanup;
`src/js/chat.js` supplies authenticated profile data/actions and mounts the existing
editor inline. `src/js/misery-fm.js` yields any now-playing morph and skips its bar
capture/decorating while the profile is open. FM playback is unchanged. The bar's
own backdrop never fades or scales during transitions. Reduced motion skips
animations; visual-viewport changes recalculate the available editor height.

Run `npm run check`, `npm run verify`, `git diff --check`, and
`MP_PROFILE_ENGINES=chromium node tools/test-profile-cards.cjs`. The established
`test-profile-expanded.cjs` command aliases the new status-bar suite. Browser
checks mock account/catalog/upload/FM APIs, cover both phone widths/themes,
reduced motion and desktop, real avatar taps, the same DOM bar through all phases,
geometry/glass, no keyboard on entry, FM coexistence, static photos, upload/search,
save failure/retry/reopen, Globe entry, shop settings and navigation cleanup.
Native WebKit currently lacks required host libraries; Chromium mobile emulation
is not native iOS verification.

Rollback: revert the website PR. No stored data is removed or migrated. Probe
preview/production before fetching final versioned assets; verify the exact
served bytes, not just Cloudflare's deployment status.
