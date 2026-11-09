# Studio overrides

This is a local TikTok LIVE control studio and broadcast scene. Administration is entirely Vietnamese; the broadcast scene and /overlay remain entirely English. The embedded broadcast preview uses English scene labels too. Localize admin labels, rules, notifications, connection errors, queue/history, music controls and dates independently of shared broadcast rule data.

- Neutral studio controls: warm off-white `#f7f6f2`, paper `#fffefa`, dark green ink `#293832`, coral accent `#ee5266`.
- Fonts: self-hosted Be Vietnam Pro (Vietnamese body and controls), Space Grotesk (brand and numerals).
- Scene: matte pastel outdoor courtyard, pale concrete wall, warm paving, greenery, coral-clothed rounded character and gold gift statue.
- Control-room hierarchy: persistent navigation (Operations, Rules, Rehearsal, Summary); current job and queue on Operations; portrait preview to the right. Summary uses the full content width. Keep the established warm neutral palette and fonts, with readable dense tables and controls.
- Only event-related animation. The scene rests when idle; animation starts on a deliberate play action. Reduced-motion disables ancillary UI motion.
- View modes: wide, front, portrait 9:16. Container-aware canvas resize; capped device pixel ratio. Instanced colored dots for avatar/text.
- Sample events are explicitly marked DEMO. Live status is read from the backend rather than assumed. Real/demo reporting and real-gift rankings stay separate.
- Production broadcast is exactly 1080×1920. Reserve 8% at the top, 14% at the right, and 27% at the bottom for the surrounding TikTok interface. Safe-zone guides belong only to the studio.
- Normal-tier rules stay inside the compact upper-left rectangle: left 3%, top 12%, width 26%, maximum height 45cqw. All nine rows remain visible. Giant-tier rules collapse into a takeover title, and the live username remains above the chat reserve.
- The Mega Statue uses a real uniform 200× world transform, meme face, sharp chest portrait, automatic camera reveal, midnight-blue sky, six repeating fireworks and 240 confetti pieces. No shooter inset.
- Normal drawings leave immediately on their final stroke; wall travel takes 0.42 seconds. Retain only two previous panels and wrap coordinates for bounded memory.
- Avatars use 1024px color-correct textures revealed alongside the particles. Prefer larger incoming avatar sources.
- Use /overlay as the canonical OBS URL, with the legacy ?obs=1 URL retained for compatibility.
- Landscape browsers center a portrait 9:16 output. OBS at 1080×1920 fills the source exactly. Show OBS setup guidance in the studio only.
- Queue tools: viewer search, LIVE/DEMO filter, priority and estimated start, move-to-next, cancel, pause and skip. Rule edits remain intact during SSE updates. Session reports are persisted and exportable; starting a report archives the previous one without clearing paid jobs.
- Uploaded looping music has independent volume and temporary ducking during shots. Default gun volume is 100%; default music volume is 20%.
- Studio rendering is capped at 30 fps, output at 60 fps. Live jobs sample the server clock; opening another window does not create another queue or another award.
- Reference gun audio and light shake are tied to shots. Volume and shake are adjustable; reduced-motion disables shake.
