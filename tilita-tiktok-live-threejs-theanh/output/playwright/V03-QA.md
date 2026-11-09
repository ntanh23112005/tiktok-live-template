# v0.3 verification — 2026-11-06

- Syntax check, production build and 18 behavior tests pass.
- English UI and validation text; coin labels replace the previous unit label.
- Sharp avatar texture resolution is 1024px, tone mapping is disabled for the photo, and sparse drawing dots disappear on completion.
- Camera movement starts on the final stroke: observed at 3.479s for a 3.450s drawing. The following viewer started after 3.925s total, including the 0.42s move; there is no separate idle hold.
- At most two previous wall groups are kept; repeated wall changes returned to the same texture count. The floating origin wrapped correctly at wall 64.
- Mega Statue: 200× world scale, 480 firework sparks across six bursts, 240 confetti pieces, a golden glow, English labels and no shooter inset. Idle celebration motion continues unless paused or reduced-motion is active.
- Local WAV upload/play/pause passed. Music volume changed to 37% while gun volume stayed at 100%. Shot ducking reduced the music bus to approximately 0.12 before restoring it.
- Compact rule panel at 470px preview width: left 14.09px, top 100.27px, width 122.19px, height 196.16px. All nine rows fit with no scroll clipping, inside the creator's marked rectangle.
- Production server was updated only after confirming its source was disconnected. A backup was saved under data/backups. Existing current/pending demo events and the saved account were preserved; interrupted work recovered paused.
- No real TikTok broadcast or real incoming gift was initiated by these checks.

Images: rules-compact-v03.png, avatar-sharp-v03.png, mega-statue-party-v03.png and wall-transition-v03.png.
