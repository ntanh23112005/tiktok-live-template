# Mockup QA — 2026-11-05

Passed `npm run check`, `npm test` (3 behavioral tests), and `npm run build`.

Browser verification passed:

- All nine event tiers initialize and render dot geometry.
- Avatar drawing reveals dots progressively; playback pauses correctly.
- UI queue sorts 1-xu, follow and comment as priorities 10, 5 and 1.
- Adding a 500+ event during a drawing leaves the current drawing intact and places the new event first among waiting jobs.
- Four +25-like actions create exactly one username job for the same viewer.
- Priority editor updates a provisional tier.
- Usernames are displayed as text, including markup-shaped input.
- Uploading a local PNG updates the avatar and scene.
- Returning to the same tier after repeated tier changes returns to the same GPU texture/geometry counts after the cache is warm.
- No JavaScript runtime errors during the interaction checks.
- No horizontal overflow at 375×812, 812×375, 1024×768 and 1440×1080 (scroll width checked against viewport width, allowing the normal scrollbar gutter).
- Portrait preview fits the character and avatar in a 9:16 frame.
- Reduced-motion leaves the initial scene static. Drawing motion is explicitly started by the user.
- OBS-only mode hides studio controls.

Screenshots in this directory are real browser captures of the local Three.js scene. No TikTok connection or live broadcast was tested or initiated. The production bundle is about 612 kB before gzip and emits Vite's size advisory; code splitting is deferred for this visual prototype.
