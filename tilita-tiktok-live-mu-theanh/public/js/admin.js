import { RUNTIME_REVISION } from './experience.js?v=mu-v1.3';
const $ = id => document.getElementById(id);
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('vi-VN');
let state, draftRules = [], initialized = false, feedbackTimer, sampleAudio, fanCardCatalog, musicTracks = [], musicLoaded = false;
function renderMusicOptions(selected = state?.config.musicFile || '') {
  const select = $('musicFile');
  const option = (value,label) => { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; };
  select.replaceChildren(option('','Tắt nhạc nền'),...musicTracks.map(t => option(t.file,t.title)));
  if (selected && !musicTracks.some(t => t.file === selected)) select.append(option(selected,selected + (musicLoaded ? ' · Không tìm thấy file' : '')));
  select.value = selected;
}
async function loadMusic() {
  $('refreshMusic').disabled = true;
  try {
    const response = await fetch('/api/music',{cache:'no-store'});
    if (!response.ok) throw new Error('Mở lại tool để nạp danh sách nhạc mới.');
    const catalog = await response.json(); $('ggmuStatus').textContent=catalog.tracks.some(t=>t.file==='music/glory-glory-man-united.mp3')?'GGMU: đã có file local.':'GGMU: chưa có file local. Đặt glory-glory-man-united.mp3 vào public/assets/music rồi cập nhật danh sách.';
    const selected = initialized ? $('musicFile').value : state?.config.musicFile || '';
    musicTracks = catalog.tracks; musicLoaded = true; renderMusicOptions(selected);
    $('musicStatus').textContent = `${musicTracks.length} bài có sẵn · Chọn bài để đổi và lưu ngay.`;
  } catch (e) {
    $('musicStatus').textContent = e.message; throw e;
  } finally { $('refreshMusic').disabled = false; }
}
attempt(loadMusic);
$('refreshMusic').onclick = () => attempt(loadMusic);
$('musicFile').onchange = () => attempt(async () => {
  const selected = $('musicFile').value;
  $('musicFile').disabled = true;
  try {
    await api('config',{...state.config,musicFile:selected},'PUT');
    feedback(selected ? 'Đã đổi nhạc nền: ' + (musicTracks.find(t => t.file === selected)?.title || selected) : 'Đã tắt nhạc nền.');
  } catch (e) { renderMusicOptions(); throw e; }
  finally { $('musicFile').disabled = false; }
});
for (const [id, key] of [['boardVisible', 'showGiftBoard'], ['topVisible', 'showLeaderboard']]) $(id).onchange = () => attempt(async () => { await api('config', { ...state.config, [key]: $(id).checked }, 'PUT'); feedback('Đã cập nhật màn hình phát.'); });
fetch('/api/fan-cards').then(r => r.json()).then(c => {
  fanCardCatalog = c;
  $('fortuneSample').replaceChildren(...c.items.map(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = `${f.number}. ${f.title}${f.audio ? ` · ${f.audio.duration.toFixed(1)} giây` : ' · Thiếu audio'}`; return o; }));
}).catch(() => feedback('Không tải được danh sách thẻ fan.', true));
$('playFortuneSample').onclick = () => attempt(async () => {
  sampleAudio?.pause(); const f = fanCardCatalog?.items.find(f => f.id === $('fortuneSample').value);
  if (!f?.audio) throw new Error('Thẻ fan này chưa có file đọc hợp lệ.');
  sampleAudio = new Audio(f.audio.url); sampleAudio.volume = Number($('voiceVolume').value) / 100; await sampleAudio.play();
});
$('stopFortuneSample').onclick = () => sampleAudio?.pause();
addEventListener('pagehide', () => sampleAudio?.pause());
function feedback(message, error = false) { $('feedback').textContent = message; $('feedback').hidden = false; $('feedback').classList.toggle('error', error); clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => $('feedback').hidden = true, error ? 12000 : 5000); }
async function api(path, data, method = 'POST') {
  const res = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Thao tác thất bại.'); return result;
}
async function attempt(fn) { try { return await fn(); } catch (e) { feedback(e.message, true); } }
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => {
  document.querySelectorAll('.tab').forEach(section => section.hidden = section.id !== button.dataset.tab);
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('selected', b === button));
});
$('overlayUrl').value = location.origin + '/overlay';
$('copyUrl').onclick = () => attempt(async () => { await navigator.clipboard.writeText($('overlayUrl').value); feedback('Đã sao chép URL màn hình phát.'); });
$('connectForm').onsubmit = e => { e.preventDefault(); attempt(async () => { const username = $('username').value.trim().replace(/^@/, ''); if (!/^[\w.]{2,50}$/.test(username)) throw new Error('Nhập @username hợp lệ, không nhập đường link.'); await api('config', { ...state.config, username }, 'PUT'); await api('connect', { username }); feedback('Đang thử kết nối. Xem trạng thái kênh bên dưới.'); }); };
$('disconnect').onclick = () => attempt(() => api('disconnect', {}));
for (const [id, getCommand] of [['pause', () => state.paused ? 'resume' : 'pause'], ['accept', () => state.accepting ? 'stop-accept' : 'accept'], ['skip', () => 'skip']]) $(id).onclick = () => attempt(() => api('control', { command: getCommand() }));
$('clearQueue').onclick = () => { if (confirm('Xóa toàn bộ lượt đang chờ? Lượt đang diễn vẫn tiếp tục.')) attempt(() => api('control', { command: 'clear' })); };
$('queue').onclick = e => { const button = e.target.closest('[data-remove]'); if (button) attempt(() => api('control', { command: 'remove', id: button.dataset.remove })); };
function jobDescription(j) { return `${state.actions[j.action] || j.action}${j.kind === 'gift' ? ` · ${j.giftName} ×${j.quantity}` : ''}${j.simulated ? ' · Thử' : ''}`; }
function tag(id, text, good = false, warn = false) { $(id).textContent = text; $(id).className = 'tag' + (good ? ' good' : warn ? ' warn' : ''); }
function render(s) {
  state = s;
  $('runtimeWarning').hidden = s.runtimeRevision === RUNTIME_REVISION;
  const lastLike = s.participation?.lastLike;
  const likeStatuses = { queued: 'đã vào hang MU', 'like-progress': 'đang cộng tim', cooldown: 'đang chờ hết 30 giây', 'already-queued': 'đã có lượt chờ', 'invalid-like': 'gói tim thiếu số lượng/định danh', 'not-accepting': 'đang dừng nhận lượt', full: 'hàng hiệu ứng đã đầy', duplicate: 'gói tim trùng', ignored: 'lượt từ tim đang tắt', effect: 'chỉ phát hiệu ứng' };
  $('likeStatus').textContent = lastLike ? `Tim thật đã nhận: ${num(s.participation.receivedLikes)} · ${lastLike.nickname}: +${lastLike.count} tim, ${lastLike.progress}/10 · ${likeStatuses[lastLike.status] || lastLike.status}${lastLike.seatStatus === 'seated' ? ' · Đã vào ngồi trong hang' : lastLike.seatStatus === 'rotating' ? ' · Đã vào hang MU, luân phiên hiển thị' : ''}` : 'Chưa nhận gói tim thật trong phiên này. Tim mô phỏng không tính vào đây.';
  if (!initialized) { initialized = true; $('username').value = s.config.username; draftRules = structuredClone(s.config.rules.filter(r => r.type === 'comment')); renderRules(); fillSettings(); }
  $('boardVisible').checked = s.config.showGiftBoard; $('topVisible').checked = s.config.showLeaderboard;
  $('fanCardAudioStatus').textContent = `${s.fanCardAudio.ready}/${s.fanCardAudio.total} thẻ fan có audio · ${s.fanCardAudio.voice}${s.fanCardAudio.missing.length ? ' · Thiếu: ' + s.fanCardAudio.missing.join(', ') : ' · Sẵn sàng phát local'}`;
  $('fanCardAudioStatus').classList.toggle('error', s.fanCardAudio.ready !== s.fanCardAudio.total);
  if (!$('tierSummary').children.length) $('tierSummary').innerHTML = s.config.giftTiers.map((t, i) => `<span><b>${t.min}${i === 6 ? '+' : ''} xu</b> ${escape(t.label)}</span>`).join('');
  const connected = s.source.status === 'connected';
  const sourceLabels = { disconnected: 'Chưa kết nối', connecting: 'Đang kết nối…', retrying: 'Đang thử lại…', connected: 'Đã kết nối', error: 'Kết nối lỗi' };
  tag('sourceStatus', sourceLabels[s.source.status] || 'Chưa kết nối', connected, s.source.status === 'retrying');
  tag('modeTag', connected ? `LIVE @${s.source.username}` : 'Chưa kết nối TikTok', connected);
  $('sourceError').textContent = s.source.error || (connected ? `Phòng ${s.source.roomId}. Tool đang nhận sự kiện; OBS quản lý phát sóng riêng.` : 'Chỉ kết nối khi kênh đang phát LIVE. Tool không tự bắt đầu phát sóng.');
  tag('rendererStatus', s.renderer ? `Đã mở · ${s.clients} màn hình` : 'Chưa mở', !!s.renderer);
  $('audioStatus').textContent = s.audioReady ? 'Âm thanh đã sẵn sàng' : 'Mở “Bật tiếng” trong màn hình phát';
  tag('playStatus', s.paused ? 'Đang tạm dừng' : !s.renderer ? 'Chờ màn hình phát' : s.current ? 'Đang diễn' : 'Đang chờ', !!s.current, s.paused);
  $('pause').textContent = s.paused ? 'Tiếp tục lấy lượt' : 'Tạm dừng lấy lượt';
  $('accept').textContent = s.accepting ? 'Dừng nhận lượt' : 'Bật nhận lượt';
  $('skip').disabled = !s.current;
  $('current').classList.toggle('empty', !s.current);
  $('current').innerHTML = s.current ? `<strong>${escape(s.current.nickname)}</strong><span>${escape(jobDescription(s.current))}</span>` : 'Chưa có lượt. Thử một quà trong mục Thiết lập & chạy thử.';
  $('queueCount').textContent = s.queue.length;
  $('queue').innerHTML = s.queue.length ? s.queue.map((j, i) => `<div class="queue-item"><span class="number">${i + 1}</span><div class="grow"><strong>${escape(j.nickname)}</strong><p class="small muted">${escape(jobDescription(j))}</p></div><span class="tag">Ưu tiên ${j.priority}</span><button class="quiet" data-remove="${j.id}" aria-label="Xóa lượt ${escape(j.nickname)}">Xóa</button></div>`).join('') : '<p class="empty">Hàng chờ đang trống.</p>';
  $('giftTotal').textContent = num(s.stats.totalGifts); $('coinTotal').textContent = num(s.stats.totalCoins);
  $('hallStatus').textContent = `${s.hall?.totalParticipants || 0} người đã vào hang MU · ${s.hall?.seats?.filter(Boolean).length || 0} đang hiện · 3 Bá chủ + 4 Phó chủ · Nhóm ${s.hall?.rotationPage || 1}/${s.hall?.rotationPages || 1}${s.hall?.mode==='demo'?' · MÔ PHỎNG':''}`;
  $('leaderboard').innerHTML = (s.hall?.leaderboard || []).map((u, i) => `<div class="queue-item"><span class="number">${i + 1}</span><span class="grow">${escape(u.name)}</span><span>${num(u.coins)} xu</span></div>`).join('') || '<p class="small muted">Chưa có đóng góp quà. Đủ 10 tim hoặc bình luận “vào hang” để vào ngồi. Top 3 Bá chủ + 4 Phó chủ giữ hàng đầu; những người khác luân phiên hiện.</p>';
  if (!$('simRitual').options.length) $('simRitual').innerHTML = Object.entries(s.actions).map(([id, label]) => `<option value="${id}">${escape(label)}</option>`).join('');
  $('logs').innerHTML = s.logs.length ? s.logs.map(l => `<div class="log ${l.level}"><time>${new Date(l.time).toLocaleTimeString('vi-VN')}</time> · ${escape(l.message)}</div>`).join('') : '<p>Chưa có thông báo.</p>';
  const statuses = { completed: 'Hoàn tất', skipped: 'Đã bỏ qua', timeout: 'Hết thời gian dự phòng', interrupted: 'Gián đoạn màn hình' };
  $('history').innerHTML = s.history.map(j => `<div class="log">${escape(j.nickname)} · ${escape(statuses[j.status] || j.status)}${j.simulated ? ' · Thử' : ''}</div>`).join('') || '<p>Chưa có lượt đã chạy.</p>';
}
function actionOptions(selected, gift) { return Object.entries({ ...state.actions, ...(gift ? { auto: 'Theo giá trị quà' } : {}) }).map(([id, label]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`).join(''); }
function renderRules() {
  $('ruleEditor').innerHTML = draftRules.map((r, i) => `<div class="rule" data-index="${i}"><label class="check"><input type="checkbox" data-field="enabled" ${r.enabled ? 'checked' : ''}> Bật</label><span class="small muted">Bình luận</span><label>Từ khóa<input data-field="match" value="${escape(r.match)}" maxlength="300"></label><label>Hành động<select data-field="action">${actionOptions(r.action, false)}</select></label><label>Ưu tiên<input type="number" min="0" max="100" data-field="priority" value="${r.priority}"></label><div class="rule-tools"><button data-rule="up" ${i === 0 ? 'disabled' : ''}>Lên</button><button data-rule="down" ${i === draftRules.length - 1 ? 'disabled' : ''}>Xuống</button><button data-rule="delete" class="danger">Xóa luật</button></div></div>`).join('');
}
$('ruleEditor').oninput = e => { const row = e.target.closest('[data-index]'); if (!row || !e.target.dataset.field) return; const key = e.target.dataset.field; const r = draftRules[Number(row.dataset.index)]; r[key] = key === 'enabled' ? e.target.checked : key === 'priority' ? Number(e.target.value) : e.target.value; if (key === 'type') { if (r.action === 'auto') r.action = 'cheer'; renderRules(); } };
$('ruleEditor').onclick = e => { const b = e.target.closest('[data-rule]'); if (!b) return; const i = Number(b.closest('[data-index]').dataset.index); if (b.dataset.rule === 'delete') draftRules.splice(i, 1); else { const j = i + (b.dataset.rule === 'up' ? -1 : 1); [draftRules[i], draftRules[j]] = [draftRules[j], draftRules[i]]; } renderRules(); };
$('addRule').onclick = () => { draftRules.push({ id: crypto.randomUUID(), type: 'comment', enabled: true, match: '', action: 'cheer', priority: 0 }); renderRules(); };
$('saveRules').onclick = () => attempt(async () => { await api('config', { ...state.config, rules: draftRules }, 'PUT'); feedback('Đã lưu luật. Các lượt đã xếp giữ hành động cũ.'); });
function showAudioPercent(key) { $(key + 'Value').value = $(key).value + '%'; if (key === 'musicVolume') $('musicPercent').value = $(key).value; }
function fillSettings() { renderMusicOptions(); for (const key of ['sceneTitle', 'musicFile', 'queueLimit', 'commentCooldownSec']) $(key).value = state.config[key]; for (const key of ['volume','musicVolume','voiceVolume']) { $(key).value = Math.round(state.config[key] * 100); showAudioPercent(key); } for (const kind of ['like', 'follow', 'share']) $('social-' + kind).checked = state.config.social[kind]; $('musicLoop').checked = state.config.musicLoop; $('voiceEnabled').checked = state.config.voiceEnabled; $('likesEnabled').checked = state.config.participation.likesEnabled; }
for (const key of ['volume','musicVolume','voiceVolume']) {
  $(key).oninput = () => showAudioPercent(key);
  $(key).onchange = () => attempt(async () => { await api('config', { ...state.config, [key]: Number($(key).value) / 100 }, 'PUT'); feedback(`Đã đặt ${key === 'musicVolume' ? 'nhạc' : key === 'voiceVolume' ? 'giọng đọc' : 'hiệu ứng'} ${$(key).value}%.`); });
}
$('musicPercent').onchange = () => {
  const value = Number($('musicPercent').value);
  if (!$('musicPercent').value || !Number.isInteger(value) || value < 0 || value > 100) { feedback('Âm lượng nhạc từ 0 đến 100%.', true); $('musicPercent').value = $('musicVolume').value; return; }
  $('musicVolume').value = value; showAudioPercent('musicVolume'); $('musicVolume').onchange();
};
$('settingsForm').onsubmit = e => { e.preventDefault(); attempt(async () => { const c = structuredClone(state.config); for (const key of ['sceneTitle', 'musicFile', 'queueLimit', 'commentCooldownSec']) c[key] = $(key).value; for (const key of ['volume','musicVolume','voiceVolume']) c[key] = Number($(key).value) / 100; for (const kind of ['like', 'follow', 'share']) c.social[kind] = $('social-' + kind).checked; c.musicLoop=$('musicLoop').checked; c.voiceEnabled = $('voiceEnabled').checked; c.participation.likesEnabled = $('likesEnabled').checked; await api('config', c, 'PUT'); feedback('Đã lưu thiết lập trên máy.'); }); };
const results = { queued:'Đã thêm lượt thử vào hàng chờ.',cooldown:'Đang trong thời gian chống spam.','already-queued':'Người này đã có lượt miễn phí chờ.','no-rule':'Không có luật đang bật phù hợp.',full:'Hàng biểu diễn đã đầy; người đủ điều kiện vẫn vào ngồi.','entry-required':'Cần đủ 10 tim hoặc bình luận vào hang trước.','like-progress':'Đang cộng tim theo người, đủ 10 sẽ vào.',acknowledged:'Đã xếp dòng cảm ơn.',qualified:'Đủ 10 tim, đã vào ngồi.','not-accepting':'Đang dừng nhận lượt mới.',ignored:'Hiệu ứng này đang tắt.',effect:'Đã gửi hiệu ứng ngắn.','unknown-value':'Chưa biết giá trị xu, không đoán hiệu ứng.','invalid-like':'Sự kiện thiếu số tim hoặc định danh người gửi.' };
document.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => attempt(async () => { const r = await api('simulate', { scenario: b.dataset.sim, coins: Number(b.dataset.coins), likeCount: Number(b.dataset.likes || 10), action: $('simRitual').value, nickname: $('simName').value, userId: 'sim:' + $('simName').value, comment: b.dataset.comment || $('simComment').value }); feedback(r.seatStatus === 'seated' ? 'Đã vào hang MU mô phỏng. Lượt mốc quà meme được xử lý theo hàng chờ.' : r.seatStatus === 'rotating' ? 'Đã vào hang MU. Thành viên sẽ luân phiên hiện ở các hàng dưới.' : r.status === 'hall-demo' ? 'Đang thử 100 người và top 7 quà. Các nhóm đổi mỗi 10 giây; bấm Thoát top mẫu để quay lại dữ liệu thật.' : results[r.status] || 'Đã gửi các tương tác thử.'); }));
$('liveHall').onclick = () => attempt(() => api('control', { command: 'hall-live' }));
function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?role=admin`);
  ws.onopen = () => { $('serverState').textContent = 'Đã kết nối tool'; };
  ws.onmessage = e => { const msg = JSON.parse(e.data); if (msg.type === 'state') render(msg.data); if (msg.type === 'audio' && msg.data.id === state?.renderer) $('audioStatus').textContent = msg.data.enabled ? 'Âm thanh đã sẵn sàng' : 'Âm thanh chưa bật'; };
  ws.onclose = () => { $('serverState').textContent = 'Mất kết nối · đang thử lại'; setTimeout(connect, 2000); };
}
connect();

let musicSample; $('playMusicSample').onclick=()=>attempt(async()=>{musicSample?.pause();const track=musicTracks.find(t=>t.file===$('musicFile').value);if(!track)throw new Error('Chọn một bài có file thật.');musicSample=new Audio(track.url);musicSample.volume=Number($('musicVolume').value)/100;await musicSample.play();}); $('stopMusicSample').onclick=()=>musicSample?.pause(); addEventListener('pagehide',()=>musicSample?.pause());

let soundSample;
async function loadSounds(){
  $('refreshSounds').disabled=true;
  try{
    const response=await fetch('/api/sounds',{cache:'no-store'});if(!response.ok)throw Error('Mở lại tool để nạp bộ âm thanh V1.2.');
    const bank=await response.json();$('soundStatus').textContent=`${bank.items.filter(x=>x.ready).length}/${bank.items.length} cue có file · Còn thiếu ${bank.missing.length}.`;
    $('soundLibrary').replaceChildren(...bank.items.map(item=>{
      const row=document.createElement('div');row.className='sound-item';const label=document.createElement('span');label.textContent=`${item.name} · ${item.ready?item.duration.toFixed(1)+'s':item.error?'Lỗi file: '+item.error:'Chưa có file'} — ${item.title}`;row.append(label);
      if(item.ready){const button=document.createElement('button');button.type='button';button.textContent='Nghe';button.onclick=()=>attempt(async()=>{soundSample?.pause();sampleAudio?.pause();soundSample=new Audio(item.url);soundSample.volume=Number($(item.folder==='voice'?'voiceVolume':'volume').value)/100;await soundSample.play();});row.append(button);}return row;
    }));
  }finally{$('refreshSounds').disabled=false;}
}
$('refreshSounds').onclick=()=>attempt(loadSounds);attempt(loadSounds);
addEventListener('pagehide',()=>soundSample?.pause());
