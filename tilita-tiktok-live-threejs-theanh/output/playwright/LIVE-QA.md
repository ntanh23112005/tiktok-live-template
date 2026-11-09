# LIVE v0.2 verification — 2026-11-06

Passed syntax check, production build, and 13 behavior tests covering modern protobuf normalization, exact coin thresholds, per-person likes, duplicate packets, gift streaks with and without group IDs, late streak endings, unknown prices, priority/FIFO, pause/resume, cooldown/follow dedupe and interrupted-job recovery.

Browser checks passed against the local production server:

- 500+ creates a statue whose actual uniform world scale is 200.
- Gun audio context unlocked, sampled WAV decoded and 36 shots played during the first 4.5 seconds of a statue animation.
- Server queue order was 200 → 10 → 5 → 1; pause froze the same current job.
- Four packets of 25 likes from the same simulated person created one username job.
- Studio and a second output page shared the same job UUID; studio muted while output was present.
- Output loaded even when autoplay required manual unlocking; the event connection was not blocked by that pending browser permission.
- The final output canvas and CSS rectangle are both exactly 1080×1920 with zero page overflow and no studio controls/safe-zone guides in the broadcast.
- Username HUD stays above the lower 27% chat reserve and to the left of the right 14% button reserve. The rules panel was moved left to avoid the main avatar.
- No horizontal overflow at 375×812, 812×375, 1440×1080. No JavaScript runtime errors during the checks.
- Settings survived switching from the dev server to the hidden production launcher; @theanh2005 was retained.
- A production server was deliberately stopped during a simulated 100-coin job and restarted. That same job was recovered paused in the queue, with the real coin statistic still zero. The test job was then removed.
- Requests without the same-origin JSON command headers were rejected with 403.

Observed live-source limitation: @theanh2005 was reported offline. No real incoming gifts/comments, real TikTok avatar CDN request, OBS capture/audio routing, or actual broadcast was verified. The app never started a TikTok broadcast or sent chat messages.

Screenshots are actual Three.js browser captures. Final broadcast screenshot is `super-statue-final-1080x1920.png`; studio preview is `live-studio-avatar-final.png`.
