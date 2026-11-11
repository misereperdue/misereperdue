# FM feedback polish — website #95

Agent: Codex. Branch `codex/95-fm-feedback`. Website only; Worker API unchanged.

Completed audio uploads are removed from the in-memory progress list after metadata/artwork/wave processing, including the last list container. Errors remain visible. Successful uploads and queue additions no longer toast. Queue buttons show a checked queue icon while their track is in the server queue, with accessible labels and duplicate submission disabled. The edit menu uses the same queued state; numbered Next badges are removed.

Go live now sweeps twelve neon beams across the viewport for 2.4 seconds, inspired by iMessage lasers, with non-interactive decoration and cleanup. Reduced motion skips all beams. Existing immediate owner command remains single and unchanged.

Live FM branding uses a 22px artwork canvas (down from 32px) in Chat/Globe and Shop nav. The profile explicit marker reuses the global fm-e badge (15px, rounded grey box, 800 weight) instead of its own variant.

Validation: build/check/verify; FM upload/import, silent success, queue icon state, cleanup, dark/light/reduced-motion and owner-only tests; wordmark sizing/fit across three views at 360/390/1440; profile integration with explicit badge computed-style assertions. Hosted preview and production release recorded in PR. All account/control traffic mocked in browser tests; no actual Go live or production uploads performed.

Pins: site848, FM15, profile15, SW455; chat442 unchanged. Rollback by reverting this website PR. Grok: preserve error feedback and pending uploads; only successful completed entries disappear.
