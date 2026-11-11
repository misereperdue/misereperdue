# Live FM wordmark — website #93 / Worker #24

Agent: Codex. Branch `codex/93-fm-wordmark`. Worker companion repairs Apple profile metadata.

The custom logo is drawn with 12-unit rounded strokes on a160-unit canvas; system font measurements could not match it and inherited tiny shop nav text. The live label now uses vector lettering with identical stroke thickness, lowercase height and baseline. Both brand elements share a fixed32px artwork canvas in Chat, Globe and Shop, independent of inherited navbar fonts. The existing accessible bar description and transition behavior remain. No header height changes.

Targeted Chromium tests cover normal dark/light,360/390/1440 widths and Chat→Shop→Globe navigation. They measure logo, label AND rendered SVG (not just the wrapper) so generic navbar icon CSS cannot shrink the lettering. Screenshots reviewed. Build/check/verify pass. Pins: site847/FM14/SW454; chat442/profile14 unchanged.

Rollback: revert this website PR; backend change is independently compatible. See Worker docs/APPLE_PROFILE_METADATA_24.md for the Apple403 root cause and repair.
