# Rounded live text and profile alignment — #97

Agent: Codex. Branch `codex/97-rounded-live`.

Replaces vector is live lettering with actual text using ui-rounded / SF Pro Rounded, then system fallbacks. Native Apple platforms select the rounded system font; non-Apple systems use their available fallback. The compact22px logo remains consistent in Chat/Globe and Shop, with a14px medium live label.

Profile Listening uses one8px inset for the album cover and trailing synth, with the synth centered against the cover. Tests compare both actual edge distances and vertical centers. Removes Go live laser creation, call and CSS/keyframes entirely; existing immediate single control request and enabled button glow remain.

Validation: build/check/verify, live label fit/font-stack/text (no SVG) across dark/light360/390/1440 and all three bars; FM import/queue regression plus absence of laser nodes in normal and reduced motion; profile integration with symmetric insets. Browser tests mock all account/control writes. Native SF font rendering is not claimed from Linux Chromium.

Pins: site849, FM16, SW456; profile15/chat442 unchanged. Worker unchanged. Preview/production evidence is recorded in the PR. Rollback by reverting this website PR.
