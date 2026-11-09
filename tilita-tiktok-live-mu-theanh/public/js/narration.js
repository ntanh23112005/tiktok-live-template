export function createNarration({ isPrimary, getConfig, onError=()=>{}, onDucking=()=>{},getTrack=job=>job?.fanCard,volumeKey='voiceVolume',voice=true }) {
  let audio = null, track=null,jobId = null, attempted = false, failed = false, generation = 0,blockedLast=false;
  const stop = () => { generation++; if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load(); } audio = null; onDucking(false); };
  const setJob = job => {
    stop(); jobId = job?.id || null; attempted = false; failed = false;
    track=getTrack(job);blockedLast=false;
    if (!track?.audio) return;
    audio = new Audio(track.audio.url); audio.preload = 'auto';
    audio.onended = () => onDucking(false);
    audio.onerror = () => { if (!failed) { failed = true; onError(job.id); } onDucking(false); };
    audio.load();
  };
  const sample = (job, elapsed, audioUnlocked,blocked=false) => {
    if (!audio||job?.id!==jobId) return;
    const config = getConfig();
    audio.volume = Math.max(0,Math.min(1,Number(config[volumeKey])||0));
    if (!isPrimary() || voice&&!config.voiceEnabled) { stop(); return; }
    if(blocked){if(!audio.paused)audio.pause();blockedLast=true;onDucking(false);return;}
    if(blockedLast&&attempted&&!failed&&audioUnlocked&&!audio.ended){blockedLast=false;onDucking(true);audio.play().catch(()=>{failed=true;onError(job.id);onDucking(false);});return;}
    blockedLast=false;
    if (attempted || failed || !audioUnlocked || elapsed < track.readAt || audio.readyState<1) return;
    attempted = true;
    // Continue at the current point after late audio unlock, never start a stale full reading.
    const offset = Math.max(0, (elapsed - track.readAt) / 1000);
    if (offset >= track.audio.duration) return;
    audio.currentTime = offset;
    const token = generation, activeJobId = jobId;
    onDucking(true);
    audio.play().catch(() => { if (token !== generation) return; if (!failed) { failed = true; onError(activeJobId); } onDucking(false); });
  };
  return { setJob, sample, stop, get playing() { return !!audio && !audio.paused; } };
}
