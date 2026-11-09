export function createNarration({ isPrimary, getConfig, onError, onDucking }) {
  let audio = null, jobId = null, attempted = false, failed = false, generation = 0;
  const stop = () => { generation++; if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load(); } audio = null; onDucking(false); };
  const setJob = job => {
    stop(); jobId = job?.id || null; attempted = false; failed = false;
    if (!job?.fortune?.audio) return;
    audio = new Audio(job.fortune.audio.url); audio.preload = 'auto';
    audio.onended = () => onDucking(false);
    audio.onerror = () => { if (!failed) { failed = true; onError(job.id); } onDucking(false); };
    audio.load();
  };
  const sample = (job, elapsed, audioUnlocked) => {
    if (!audio) return;
    const config = getConfig();
    audio.volume = config.voiceVolume;
    if (!isPrimary() || !config.voiceEnabled) { stop(); return; }
    if (attempted || failed || !audioUnlocked || elapsed < job.fortune.readAt) return;
    attempted = true;
    // Continue at the current point after late audio unlock, never start a stale full reading.
    const offset = Math.max(0, (elapsed - job.fortune.readAt) / 1000);
    if (offset >= job.fortune.audio.duration) return;
    audio.currentTime = offset;
    const token = generation, activeJobId = jobId;
    onDucking(true);
    audio.play().catch(() => { if (token !== generation) return; if (!failed) { failed = true; onError(activeJobId); } onDucking(false); });
  };
  return { setJob, sample, stop, get playing() { return !!audio && !audio.paused; } };
}
