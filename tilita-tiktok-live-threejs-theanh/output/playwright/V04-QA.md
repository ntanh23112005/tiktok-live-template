# v0.4 control-room QA — 6 November 2026

- `npm run check`, `npm test` (24 tests), and production build passed. Vite retains its existing large Three.js bundle notice.
- Compared the local `tilita-tiktok-live-theanh` and `tilita-tiktok-live-mu-theanh` admin screens before implementing Operations, Rules, Rehearsal and Summary.
- Browser checks used a separate server on port 5188 and separate `ops-v04-data`; no demo events were added to the user's production queue.
- Tested nine editable priorities and enabled switches. Disabling the 30-coin tier rejects its drawing without falling back; received coin accounting is retained. Restored it in QA afterward.
- Unsaved priority 333 survived an incoming SSE demo event; Discard changes restored saved value 1.
- Four 25-like packets from one demo viewer produced exactly one drawing and remainder zero.
- Tested six-viewer burst and every-tier rehearsal: 15 waiting jobs sorted as 200, 200, 100, 100, 75, 75, 50, 20, 10, 10, 5, 5, 1, 1, 1.
- Viewer search, LIVE/DEMO filter, move-to-next, pause/resume and skip worked. Promotion kept the active job intact. Individual removal and clear produced 12 Cancelled history records after restart recovery.
- One normal drawing completed on the server clock; demo completions/skips/cancellations remained separate from real metrics and donors.
- Archived a session with seven demo queued events, selected it, and downloaded valid CSV and JSON. The queue stayed intact. Restart retained current and archived report IDs, settings, queue and like/dedup records.
- Studio and output received the same active job ID. Broadcast controls were hidden. Wide-browser frame: x=656.25, y=0, width=607.5, height=1080 on a 1920×1080 viewport. OBS portrait frame: x=0, y=0, width=1080, height=1920, document width1080.
- Checked all four sections near 375, 768, 1024 and 1440 CSS px. No document horizontal overflow; wide rule/history tables scroll within their containers. Reduced-motion mode loads. Browser console: zero errors and warnings.
- Production app restarted only after verifying disconnected and paused. Backed up its state, preserved @theanh2005, sound settings and all three waiting jobs. Verified v0.4 at port5178 with one selected nav item and a functioning portrait preview.
- Real incoming TikTok events and OBS audio routing were not exercised by this local rehearsal. No broadcast started.

Screenshots: `operations-v04.png`, `rules-v04.png`, `rehearsal-v04.png`, `summary-v04-production.png`, `overlay-landscape-v04.png`, `overlay-statue-v04.png`, and `mobile-*-v04.png`.
