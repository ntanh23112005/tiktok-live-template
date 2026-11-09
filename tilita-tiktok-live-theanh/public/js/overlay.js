import { ART, createPose } from './temple-art.js?v=wooden-v1';
import { sampleRitual } from './rituals.js';
import { createHall } from './hall.js';
import { createRitualStage } from './ritual-stage.js';
import { renderRitualBoard } from './ritual-board.js';
import { createNarration } from './narration.js';
import { musicURL } from './music-files.js';
const $ = id => document.getElementById(id);
const preview = location.pathname === '/preview'; document.body.classList.toggle('preview', preview);
const sprites = ART.anchors.map((_, i) => { const frame = createPose(i); frame.classList.toggle('active', i === 3); $('sprites').append(frame); return frame; });
const sheet = new Image(); sheet.src = ART.sheet;
const ready = Promise.all([sheet, document.querySelector('.background')].map(img => img.decode()));
const particles = new window.TempleParticleEngine($('particles')); particles.setIncenseTips([{ x: 540, y: 768 }]);
const hall = createHall($('hall'));
const ritualStage = createRitualStage($('ritualLayer'));
renderRitualBoard($('ritualTiers'));
function fit() { $('stage').style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`; }
addEventListener('resize', fit); fit();
let ws, self, state, lastJob, sentComplete, noticeId, lastFrame = 0, ctx, music, musicPath, lastPhase = '', milestones = new Set(), ducked = false;
const isPrimary = () => !preview && self && state?.renderer === self;
const narration = createNarration({ isPrimary, getConfig: () => state.config,
  onError: id => send('audio-error', { id }), onDucking: value => { ducked = value; updateMusic(); } });
function send(type, data = {}) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...data })); }
async function enableAudio() {
  if (preview || !isPrimary()) return;
  try { ctx ||= new AudioContext(); await ctx.resume(); $('enableAudio').hidden = ctx.state === 'running'; send('audio', { enabled: ctx.state === 'running' }); updateMusic(); } catch { $('enableAudio').hidden = false; }
}
$('enableAudio').onclick = enableAudio;
function tone(kind = 'bell') {
  if (!isPrimary() || !ctx || ctx.state !== 'running') return;
  const volume = state.config.volume; if (volume <= 0) return;
  const t = ctx.currentTime; const bell = kind !== 'like';
  for (const [i, f] of (bell ? [220, 445, 665, 1120] : [450, 760]).entries()) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(volume * (bell ? .11 : .2) / (i + 1), t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + (bell ? 3.5 : .18));
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + (bell ? 4 : .2));
  }
}
function updateMusic() {
  const filename = state?.config.musicFile;
  if (!isPrimary() || !filename || !ctx || ctx.state !== 'running') { music?.pause(); return; }
  if (musicPath !== filename) {
    music?.pause(); if (music) { music.removeAttribute('src'); music.load(); }
    music = new Audio(musicURL(filename)); music.loop = true; musicPath = filename;
    music.onerror = () => { $('connection').hidden = false; $('connection').textContent = 'Không phát được nhạc nền. Kiểm tra file và chọn lại bài trong admin.'; };
  }
  music.volume = state.config.musicVolume * (ducked ? .316 : 1);
  if (music.paused) music.play().catch(() => { $('enableAudio').hidden = false; });
}
const safeImage = value => { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
function setJob(job) {
  narration.setJob(job);
  document.body.classList.remove('reading-fortune');
  document.body.classList.remove('thanking-donor');
  $('donationThanks').hidden = true;
  $('walker').hidden = !job;
  for (const key of ['fortune', 'lantern', 'ceremony']) $(key).hidden = true;
  ritualStage(null); hall.animate(null); milestones = new Set(); lastPhase = '';
  if (!job) return;
  if (job.thanks) {
    const thanks = job.thanks;
    $('thanksName').textContent = thanks.nickname;
    $('thanksCoins').textContent = `${Number(thanks.coins).toLocaleString('vi-VN')} xu`;
    $('thanksGift').textContent = `${thanks.giftName} ×${thanks.quantity}${job.simulated ? ' · Tương tác thử' : ''}`;
    const initial = $('thanksInitial'), avatar = $('thanksAvatar');
    initial.textContent = Array.from(thanks.nickname)[0] || '♡'; initial.hidden = false;
    const image = safeImage(thanks.avatar); avatar.hidden = !image;
    avatar.onerror = () => { avatar.hidden = true; initial.hidden = false; };
    if (image) { avatar.src = image; initial.hidden = true; } else avatar.removeAttribute('src');
  }
  $('name').textContent = job.nickname; $('action').textContent = `${state.actions[job.action]}${job.kind === 'gift' ? ` · ${job.giftName} ×${job.quantity}` : ''}${job.simulated ? ' · Thử' : ''}`;
  $('wish').textContent = '';
  $('initial').textContent = job.nickname.slice(0, 1).toUpperCase(); $('initial').hidden = false;
  const src = safeImage(job.avatar); $('avatar').hidden = !src; if (src) { $('avatar').src = src; $('initial').hidden = true; }
  $('avatar').onerror = () => { $('avatar').hidden = true; $('initial').hidden = false; };
  $('lanternText').textContent = job.comment || 'Bình an';
  if (job.fortune) {
    $('fortuneNumber').textContent = `LỜI XĂM SỐ ${job.fortune.number}`;
    $('fortuneTitle').textContent = job.fortune.title;
    $('fortunePoem').textContent = job.fortune.text;
    $('fortuneText').textContent = job.fortune.message;
    $('fortuneRecipient').textContent = `Gửi ${job.nickname}`;
  }
  $('ceremonyName').textContent = job.nickname;
}
function render(s) {
  const previousRenderer = state?.renderer; state = s;
  $('title').textContent = s.config.sceneTitle; $('channel').textContent = s.source.status === 'connected' ? '@' + s.source.username : 'Hữu duyên gặp gỡ';
  $('top').replaceChildren();
  const leaders = s.hall?.leaderboard || [];
  $('rankingTitle').textContent = s.hall?.mode === 'demo' ? 'TOP MÔ PHỎNG' : 'Tấm lòng thành';
  $('ritualBoard').hidden = !s.config.showRitualBoard;
  $('ranking').hidden = !s.config.showLeaderboard;
  $('sessionTotal').textContent = s.hall?.mode === 'demo' ? 'Đạo tràng mô phỏng' : `${s.hall?.totalCoins.toLocaleString('vi-VN') || 0} xu trong phiên`;
  hall.render(s.hall);
  $('hallRoster').textContent = `Đạo tràng ${s.hall?.totalParticipants || 0} người · Nhóm ${s.hall?.rotationPage || 1}/${s.hall?.rotationPages || 1}`;
  const activity=s.interactions?.current;
  $('interactionName').textContent=activity?.nickname || '';
  $('interactionText').textContent=activity?.text || '';
  $('interactionCount').textContent=activity?.count>1?`${activity.count} tương tác được ghi nhận`:'';
  if (!leaders.length) { const p = document.createElement('p'); p.textContent = 'Chưa có người tặng quà'; $('top').append(p); }
  leaders.slice(0, 4).forEach((u, i) => { const row = document.createElement('div'); row.className = 'rank-row'; const name = document.createElement('span'), points = document.createElement('b'); name.textContent = `${i + 1}. ${u.name}`; points.textContent = `${u.coins.toLocaleString('vi-VN')} xu`; row.append(name, points); $('top').append(row); });
  $('nextName').textContent = s.queue[0]?.nickname || 'Chờ người hữu duyên'; $('waiting').textContent = `${s.queue.length} lượt chờ${s.paused ? ' · Tạm dừng' : ''}`;
  $('instructions').replaceChildren();
  s.config.rules.filter(r => r.enabled).slice(0, 3).forEach(r => { const item = document.createElement('div'); item.className = 'instruction'; const type = document.createElement('span'), label = document.createElement('strong'); type.textContent = r.type === 'comment' ? 'BÌNH LUẬN' : 'TẶNG QUÀ'; label.textContent = r.match.split(',')[0]; item.append(type, label); $('instructions').append(item); });
  if (s.current?.id !== lastJob) { lastJob = s.current?.id; sentComplete = null; setJob(s.current); }
  if (s.notice && s.notice.id !== noticeId) { noticeId = s.notice.id; $('giftNotice').replaceChildren(); const title = document.createElement('strong'), detail = document.createElement('small'); title.textContent = `${s.notice.nickname} · ${s.notice.giftName} ×${s.notice.quantity}`; detail.textContent = s.notice.simulated ? 'Tương tác thử' : 'Cảm ơn tấm lòng của bạn'; $('giftNotice').append(title, detail); }
  $('enableAudio').hidden = preview || !isPrimary() || ctx?.state === 'running';
  if (previousRenderer !== s.renderer && isPrimary()) enableAudio();
  if (!isPrimary()) narration.stop();
  updateMusic();
}
function frame(now) {
  requestAnimationFrame(frame); if (now - lastFrame < 1000 / 30) return; lastFrame = now;
  if (!state) return;
  // Gift acknowledgement belongs to its queued turn, so bursts cannot overwrite a donor's card.
  $('giftNotice').hidden = !state.notice || !!state.notice.jobId || Date.now() - state.notice.time > 4500;
  const job = state.current,activity=state.interactions?.current;
  const blocked=!!job && (job.action==='fortune'||job.action==='grand'||Date.now()-job.startedAt<(job.ritualStartDelay||0));
  $('interactionBubble').hidden=!activity || blocked || Date.now()>=activity.startedAt+activity.duration;
  if (!job) return;
  const t = Math.max(0, Date.now() - job.startedAt), scene = sampleRitual(job, t);
  $('donationThanks').hidden = !scene.thanking;
  document.body.classList.toggle('thanking-donor', scene.thanking);
  if (scene.thanking) {
    $('walker').hidden = true;
    for (const key of ['fortune','lantern','ceremony']) $(key).hidden = true;
    document.body.classList.remove('reading-fortune');
    ritualStage(null); hall.animate(null); return;
  }
  $('walker').hidden = false;
  if (!milestones.has('start')) {
    milestones.add('start');
    if (scene.ritualTime < 1500) {
      if (isPrimary()) tone();
      if (job.action === 'incense') particles.spawnIncenseBurst(540,790);
      if (job.action === 'grand') particles.spawnGrandCeremonyRain();
    }
  }
  narration.sample(job, t, ctx?.state === 'running');
  sprites.forEach((img, i) => img.classList.toggle('active', i === scene.pose));
  $('walker').style.top = `${scene.y + (scene.walking ? Math.sin(t / 185 * Math.PI) * 2 : 0)}px`; $('walker').style.opacity = scene.opacity;
  $('walker').style.transform = `translateX(-50%) scale(${scene.scale})`;
  if (lastPhase !== scene.phase) { lastPhase = scene.phase; $('action').textContent = scene.phase + (job.kind === 'gift' ? ` · ${job.giftName} ×${job.quantity}` : '') + (job.simulated ? ' · Thử' : ''); }
  $('halo').style.opacity = scene.grand ? String(.6 + Math.sin(t / 350) * .3) : '.4';
  $('fortune').hidden = !scene.card; $('ceremony').hidden = !scene.banner;
  document.body.classList.toggle('reading-fortune', scene.card);
  $('lantern').hidden = !scene.lantern; $('lantern').style.top = `${1250 - scene.lanternRise * 800}px`; $('lantern').style.opacity = 1 - Math.max(0, scene.lanternRise - .8) * 5;
  ritualStage(scene); hall.animate(scene.groupTime);
  if (scene.groupTime !== null && !milestones.has('group')) { milestones.add('group'); tone(); particles.spawnBellWave(540, 750, 4); }
  if (scene.bell) for (const [index, at] of [2400, 4200, 6000].entries()) if (scene.ritualTime >= at && !milestones.has('bell-' + index)) { milestones.add('bell-' + index); tone(); particles.spawnBellWave(540, 850, 3); }
  if (scene.lotusOpen > .5 && job.action === 'lotus' && !milestones.has('lotus')) { milestones.add('lotus'); particles.spawnIncenseBurst(540, 880); }
  if (t >= job.duration && isPrimary() && sentComplete !== job.id) { sentComplete = job.id; send('complete', { id: job.id }); }
}
requestAnimationFrame(frame);
function connect() {
  ws = new WebSocket(`ws://${location.host}/ws?role=${preview ? 'preview' : 'overlay'}`);
  ws.onmessage = async e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'hello') {
      self = msg.data.id;
      try { await ready; if (isPrimary()) enableAudio(); if (!preview) send('ready'); $('connection').hidden = true; }
      catch { $('connection').hidden = false; $('connection').textContent = 'Thiếu ảnh cảnh/nhân vật. Chưa nhận lượt. Kiểm tra public/assets rồi tải lại.'; }
    }
    if (msg.type === 'state') render(msg.data);
    if (msg.type === 'effect') { tone(msg.data.kind); particles.spawnBellWave(); }
  };
  ws.onclose = () => { narration.stop(); music?.pause(); $('walker').hidden = true; $('donationThanks').hidden = true; $('interactionBubble').hidden = true; document.body.classList.remove('reading-fortune','thanking-donor'); lastJob = undefined; $('connection').hidden = false; $('connection').textContent = 'Mất kết nối tool · Đang thử lại'; setTimeout(connect, 2000); };
}
connect();
