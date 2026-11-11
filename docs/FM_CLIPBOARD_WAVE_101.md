# FM waveform / schedule / clipboard follow-up — #101

Agent: Codex. Branch `codex/101-fm-clipboard`. Backend PR: misereperdue/misery-worker#27 (issue26).

Waveform root cause: the loading sentinel was a string, whose length passed the waveform-data guard. Rendering character values as amplitudes poisoned smoothed energy with NaN, leaving subsequent frames blank even after the map loaded. The renderer now consumes only Uint8Array map data, recovers non-finite energy, resizes for height-only changes and retries a zero-size canvas after layout. Foreground resume restarts drawing independently of network refresh. Idle waves remain visible while map data is pending/missing, including reduced motion.

Clipboard bubble text is exactly Update your now playing? with a checkmark confirmation button. Both bubble and check start the same trusted native clipboard read. The browser's Paste result OR a native paste event fulfills that single pending read and immediately resolves/saves the song. No visible or hidden URL input, extra confirmation or custom Paste form is created. Escape dismisses an idle suggestion. Existing auth guards, explicit consent, retry and no-background-write behavior remain. Browser/OS clipboard permission requirements still apply.

Backend319 removes the arbitrary30-day schedule cap (valid finite future dates only). Website's historical FM source fixture mirrors that validation. User-visible scheduling/countdowns continue unchanged and can display long future intervals.

Validation: actual renderer code executed against Chromium canvas verifies visible pixels for pending/ready/failed maps, NaN recovery, height resize, zero-to-visible layout and reduced motion. Focused clipboard suite covers all services, granted/prompt/denied/pending-native-paste paths, exactly one save after Paste without another tap, checkmark UI/no inputs, retry/dedup/signed-out gating; scheduling test uses999 days. Existing FM imports/queue and build/check/verify pass. Worker tests exercise real route, storage and alarms with31/999/36500-day schedules. API writes and clipboard values mocked; native iOS not claimed from Linux.

Pins: site851/chat444/FM18/SW458. Profile15 unchanged. Website rollback: revert this PR; Worker rollback: route to318 (restores old cap). Grok: do not reintroduce string waveform sentinels into amplitude calculations or the extra clipboard URL form.
