# Tilita LIVE Canvas — The Anh · v0.4

Local TikTok LIVE software with viewer names, sharp avatars, an endless wall and a 200× Mega Statue celebration. The saved account on this computer is **@theanh2005**. The server binds to localhost and does not start broadcasts or send TikTok chat messages.

## Start and stop

Double-click **Start-Live.cmd**. It builds the current source if the app is not already running, starts the background server and opens the studio. If the app is already running, it opens the existing studio; stop it first when installing code changes.

- Studio: http://127.0.0.1:5178/
- OBS overlay: http://127.0.0.1:5178/overlay
- Legacy overlay URL: http://127.0.0.1:5178/?obs=1
- Stop: **Stop-Live.cmd**. Interrupted jobs return to the queue paused on the next launch.

Requires Node.js 20 or newer. Terminal commands:

```powershell
cd A:\tiktok-live\tilita-tiktok-live-threejs-theanh
npm ci
npm run build
npm start
```

`npm run dev` serves frontend and API together. `npm run check` checks syntax; `npm test` checks queue, gifts, likes, music and transition behavior.

## OBS setup

1. Add a Browser Source with the overlay URL. Set **Width 1080, Height 1920**. The overlay contains the scene only, without studio controls or safe-zone guides.
2. If sound is blocked by the browser, use **Interact** and click **Enable sound** once. Verify audio in the OBS mixer before broadcasting.
3. Use the **OBS Overlay** and **Copy OBS URL** buttons in the studio. The studio mutes its own audio while an output window is open, avoiding duplicate music/gunshots.
4. The studio guides reserve 8% at the top, 14% at the right and 27% at the bottom for TikTok controls/chat. Preview the actual TikTok layout before broadcasting because its interface can vary.
5. When the TikTok account is LIVE, click **Connect** and wait for **Connected to TikTok**. The app reconnects on failures with backoff.

For TikTok LIVE Studio, capture a browser window showing the overlay if you are not using OBS. Maintain the 9:16 aspect ratio and avoid capturing the same audio twice.

The overlay stays centered at 9:16 when opened in a landscape browser. An OBS Browser Source set to 1080 × 1920 fills its viewport exactly.

## Control room

The administration interface is Vietnamese: **Vận hành · Luật tương tác · Chạy thử · Tổng kết**. Broadcast captions and the OBS overlay stay English. Shared rule data remains English for the scene; administration uses separate Vietnamese labels and messages.

- **Operations** (`/#operations`): connection, output status, current drawing and a shared queue. Search viewers, filter LIVE/DEMO, inspect priority and estimated start time, move a waiting viewer to next, remove an event, pause/resume or skip. Estimates change when higher-priority gifts arrive. Removed waiting events remain in history as Cancelled.
- **Rules** (`/#rules`): enable/disable each of the nine prescribed tiers, edit priorities, comment cooldown, automatic playback, output legends and rendering quality. Unsaved edits survive incoming events until saved or discarded. Priority changes reorder waiting jobs; enabled switches apply to future interactions. Disabling a gift tier does not fall back to a cheaper drawing. Received real gifts still count in reports.
- **Rehearsal** (`/#rehearsal`): choose a demo viewer and tier, send a custom coin value or a like packet, queue six viewers or test all nine tiers. The per-viewer like counter shows progress to 100. Tests use the actual queue and are labelled DEMO. Preview animation stays local to the studio. Gun/music controls are here too.
- **Summary** (`/#summary`): real coins, gift units, comments, likes, follows, completed/skipped/cancelled drawings, a real-gift contributor leaderboard, the latest 200 drawings and system logs. DEMO counters are separate. Download the current or archived session as CSV/JSON.

Reports start with v0.4; earlier lifetime interaction totals are preserved separately. **New session report** archives the current report and begins fresh counters. It preserves the queue, current drawing, gift deduplication and per-person like progress. Up to 20 archived reports are saved locally, along with the current one. Reports survive restarting the app. Session completion counts refer to drawings finished during that reporting period, including jobs received in a previous period. The history table is labelled as spanning sessions.

## Interaction rules

| Event | Drawing | Default priority |
| --- | --- | --- |
| Comment | @username | 1 |
| Every 100 received likes from one person | @username | 1 |
| Follow | Mini avatar | 5 |
| 1+ coin | Priority @username | 10 |
| 10+ coin | Mini avatar | 20 |
| 30+ coin | Big avatar | 50 |
| 50+ coin | Medium avatar above + @username below | 75 |
| 100+ coin | BIG avatar above + @username below | 100 |
| 500+ coin | MEGA STATUE ×200, portrait, flying name and celebration | 200 |

Higher priorities run first; ties preserve arrival order. New gifts never interrupt an active drawing. Coin tiers apply to one completed gift/streak's metadata value; values between tiers use the highest lower tier. These values are not the creator's cash payout. Priorities remain editable.

The avatar path prefers TikTok's largest supplied image. A 1024px color-correct texture reveals alongside the drawing particles, then remains sharp after completion. Small source images cannot gain missing detail. Local avatar uploads are available for previews.

Normal drawings transition immediately when the last drawing stroke completes. The camera and character move to the neighboring panel in **0.42 seconds**. Only two previous panels are retained; coordinates wrap periodically, allowing continuous operation without accumulating unlimited GPU objects. Wall numbers follow playback order and survive recovery.

The Mega Statue uses an actual uniform **200× world scale**, a meme expression and a portrait medallion. Its midnight-blue celebration contains six repeating firework bursts (480 sparks), 240 confetti pieces and a golden glow. There is no shooter inset. The username remains readable in the HUD while its 3D letters fly upward.

## Background music and sound

- Drop a music file onto **Background music**, or click to select one. Supported formats: MP3, WAV, OGG, M4A, AAC, FLAC and WebM, up to 50 MB. Uploaded tracks are stored locally and loop during playback.
- Gunshots default to **100%**; background music defaults to **20%**. Both levels are adjustable independently. Saved user settings take precedence over defaults.
- **Duck music during gunshots** lowers the music temporarily while shots or the explosion sound play. It restores the music level afterward.
- Music play/pause and playhead synchronize across the studio and overlay. Restarting the server preserves the track but leaves music paused.
- Gunshots use a short sample from the user's supplied reference video, with a synthesized fallback. Screen shake is adjustable; reduced-motion disables it.

## Reliability and limitations

- A single server owns the queue and clock. Multiple windows do not multiply gifts or consume separate queues.
- Settings, queue, current job, wall sequence, like remainders, music state and deduplication records are saved in `data/state.json` through a temporary file.
- Gift streaks use room, sender, gift and group identifiers, and finalize once. A missing ending frame falls back to a 4-second quiet period; late frames only award additional units.
- Gift prices are never silently assumed to be one coin. Missing metadata is logged for inspection.
- Likes are counted from received events; taps TikTok does not send cannot be reconstructed. Comment cooldown defaults to 40 seconds per person. The queue is capped at 1000 events with a visible warning.
- `tiktok-live-connector` 2.5.0 is unofficial and can be affected by TikTok/provider changes. If required, set `SIGN_API_KEY` in the environment before starting; it is not stored in the page.
- The direct connection check on **6 November 2026** reported @theanh2005 offline. Real incoming gifts/comments, real viewer CDN images and the final OBS audio route still require validation while the account is LIVE. Browser/server tests use clearly marked DEMO events; no broadcast was started.

## Source files

- `server/engine.js`: normalized events, deduplication, queue, wall order and music clock.
- `server/reporting.js`: persistent session reports, real/demo counters, contributors and CSV export.
- `server/tiktok.js`: TikTok connection/reconnect.
- `server/index.js`: local API/SSE, avatar proxy, audio upload/range delivery and persistence.
- `src/live-main.js`: shared scene/overlay wiring; `src/operations-ui.js` and `src/operations.css`: four-section control room; `src/admin-locale.js`: Vietnamese admin rules and messages, separate from English broadcast data.
- `src/scene.js`: character, murals, sharp avatar reveal, endless wall and celebration.
- `src/audio.js`, `src/music-ui.js`: separate audio buses, music controls and ducking.
- `src/rules.js`, `src/timing.js`: tiers and shared animation timing.
- `output/playwright/`: screenshots and QA notes.

References: [connector](https://ttlc.docs.isaackogan.com/), [gift streak semantics](https://ttlc.docs.isaackogan.com/guides/gifts/).
