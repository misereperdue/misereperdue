# Profile links and Go live — website #91

Agent: Codex. Website branch `codex/91-profile-links`. Backend PR: misereperdue/misery-worker#23 (issue #22).

Listening settings now accept pasted Apple Music, Spotify and SoundCloud track URLs. Metadata is fetched through authenticated `/api/profile/music`, shown for confirmation, then saved through `/api/profile`. No keyboard opens automatically. Failed lookups disable save; edited input aborts stale results; clearing/removing a song is supported. Existing saved songs are compatible and may be enriched on display without writing the profile.

Expanded Listening shows title/E when explicit, artist photo/name and the right-aligned synth. It remains passive. Compact now-playing has a synth and bold title; bio is limited to 60 Unicode characters and ellipsis. Expanded bio has a bubble. Photos remain retired.

Go live keeps the existing immediate single owner action. Enabled buttons glow gently; pressing emits twelve decorative rays and a ring for under one second. Reduced motion skips the burst and pulse. Existing Apple metadata plus user-supplied FM audio import is retained.

Validation: build/check/verify, Chromium profile integration (360/390 mobile and 1440 desktop; both themes; reduced motion), URL save roundtrips for all three providers, explicit/photo/synth/bio assertions and existing settings/management/Whisper behavior. FM integration covers dark/light, normal/reduced motion, one Go live command, burst cleanup, imports and non-owner controls. API/account writes mocked. Native iOS not claimed.

Pins: site846, chat442, profile-cards14, misery-fm13, SW453. Deploy backend PR23 before this website release. Roll back by reverting the website PR; old website remains compatible with the new API. Backend no migration/binding changes; exact rollback version in Worker notes.
