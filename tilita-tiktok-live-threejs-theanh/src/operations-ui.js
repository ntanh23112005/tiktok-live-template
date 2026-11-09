import { RULES } from './rules.js';
import { adminRule, adminMessage } from './admin-locale.js';
import { actionSeconds } from './timing.js';
import './operations.css';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = value => new Intl.NumberFormat('vi-VN').format(value || 0);
const clock = seconds => seconds < 60 ? `${Math.ceil(Math.max(0, seconds))} giây` : `${Math.floor(seconds / 60)} phút ${Math.floor(seconds % 60)} giây`;
const date = time => new Date(time).toLocaleString('vi-VN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const metric = (label, id, value = '0') => `<div class="ops-metric"><span>${label}</span><strong id="${id}">${value}</strong></div>`;

export function mountOperations({ store, api, command, toast, icon, refresh, ruleFor: broadcastRuleFor }) {
  const ruleFor = id => adminRule(broadcastRuleFor(id));
  const $ = selector => document.querySelector(selector);
  const workspace = $('.workspace');
  const take = selector => $(selector);
  const old = { connect: take('.connect-panel'), queue: take('.queue-panel'), log: take('.connection-log'),
    toolbar: take('.preview-toolbar'), frame: take('.broadcast-surround'), playback: take('.live-playback'),
    rules: take('#rules-list'), sample: take('.sample-user'), enqueue: take('#enqueue'), note: take('.inspector-note'),
    quick: take('.quick-settings'), like: take('.like-tester') };
  $('.live-intro h1').innerHTML = 'Phòng điều khiển LIVE<span>.</span>';
  $('.live-intro p').textContent = 'Quản lý buổi live, chạy thử tương tác và theo dõi từng lượt của người xem.';
  $('.version').textContent = 'QUẢN TRỊ v0.4';
  $('#rules-open').innerHTML = icon('settings-2') + 'Luật tương tác';
  const root = document.createElement('div'); root.className = 'ops-shell';
  root.innerHTML = `<nav class="ops-nav" aria-label="Các mục quản trị">
    ${[['operations', 'camera', 'Vận hành'], ['rules', 'settings-2', 'Luật tương tác'], ['rehearsal', 'play', 'Chạy thử'], ['summary', 'crown', 'Tổng kết']].map(([id, glyph, text]) => `<button data-page="${id}" aria-controls="page-${id}">${icon(glyph)}<span>${text}</span>${id === 'operations' ? '<span id="nav-queue" class="ops-count">0</span>' : ''}</button>`).join('')}
    <div class="ops-nav-note"><span class="eyebrow">ỨNG DỤNG TRÊN MÁY</span><p>Quản trị tại đây.<br>OBS lấy hình từ /overlay.</p><span id="session-elapsed">Phiên —</span></div>
  </nav><div class="ops-layout"><div class="ops-pages">
    <section id="page-operations" class="ops-page" aria-label="Vận hành">
      <div class="ops-page-heading"><div><span class="eyebrow">VẬN HÀNH BUỔI LIVE</span><h2>Sẵn sàng đón người xem.</h2></div><span class="ops-badge" id="ops-play-status">Tạm dừng</span></div>
      <div class="ops-metrics">${metric('Lượt đang chờ', 'ops-waiting')}${metric('Thời lượng hàng chờ', 'ops-duration', '0 giây')}${metric('Coin thật trong phiên', 'ops-coins')}${metric('Cửa sổ phát', 'ops-outputs')}</div>
      <div id="ops-connect-slot"></div>
      <section class="ops-card"><div class="ops-card-heading"><h3>Lượt đang vẽ</h3><span class="ops-badge" id="current-mode">ĐANG CHỜ</span></div><div id="ops-current" class="ops-current"></div><div class="ops-current-track"><span id="current-progress"></span></div><div id="current-controls" class="ops-actions"></div><p class="ops-help">Tạm dừng sẽ giữ nguyên tiến độ vẽ và vẫn nhận lượt mới vào hàng chờ. Quà mới chờ đến khi lượt hiện tại hoàn thành.</p></section>
      <div id="ops-queue-slot"></div><section class="ops-card ops-status"><div id="ops-log-slot"></div></section>
    </section>
    <section id="page-rules" class="ops-page" aria-label="Luật tương tác" hidden>
      <div class="ops-page-heading"><div><span class="eyebrow">LUẬT TƯƠNG TÁC</span><h2>Chọn thứ tự các lượt.</h2><p>Ưu tiên cao chạy trước. Cùng mức ưu tiên thì ai đến trước chạy trước.</p></div></div>
      <form id="ops-rules-form" class="ops-card"><div class="ops-card-heading"><h3>Tương tác và mức ưu tiên</h3><span id="rule-save-status" role="status">Đã lưu</span></div><div class="ops-table-scroll"><table class="ops-table rules-editor"><thead><tr><th>Bật</th><th>Tương tác</th><th>Nội dung vẽ</th><th>Ưu tiên</th></tr></thead><tbody id="ops-rule-rows"></tbody></table></div>
        <div id="ops-settings-slot" class="ops-rule-settings"></div><div class="ops-actions"><button class="button primary" type="submit">${icon('check')}Lưu luật và cài đặt</button><button class="button subtle" type="button" id="rules-revert">Bỏ thay đổi</button></div>
        <p class="ops-help">Bật/tắt luật áp dụng cho tương tác mới. Khi lưu ưu tiên, hàng chờ được sắp xếp lại; lượt đang vẽ vẫn tiếp tục. Quà chọn mốc coin cao nhất phù hợp. Mốc bị tắt sẽ không tạo lượt vẽ.</p>
      </form>
    </section>
    <section id="page-rehearsal" class="ops-page" aria-label="Chạy thử" hidden>
      <div class="ops-page-heading"><div><span class="eyebrow">CHẠY THỬ</span><h2>Thử toàn bộ buổi live.</h2><p>Sự kiện thử dùng chung bộ luật và hàng chờ với tương tác thật.</p></div><span class="ops-badge demo-badge">THỬ</span></div>
      <section class="ops-card"><div class="ops-card-heading"><h3>Người xem và tương tác thử</h3><span id="demo-feedback" role="status">Chọn một mốc</span></div><div id="demo-user-slot"></div><div id="demo-rules-slot"></div><div class="ops-actions" id="demo-enqueue-slot"></div><div id="demo-note-slot"></div></section>
      <section class="ops-card"><h3>Tương tác tùy chỉnh</h3><div class="ops-form-grid"><label>Giá trị quà (coin)<input id="demo-coins" type="number" min="1" max="1000000" step="1" value="50"></label><button class="button subtle" id="demo-gift">${icon('plus')}Gửi quà thử</button><label>Lượt thích từ người này<input id="demo-likes" type="number" min="1" max="10000" step="1" value="25"></label><button class="button subtle" id="demo-like">${icon('heart')}Gửi lượt thích thử</button></div><p id="demo-like-progress" class="ops-help">Tiến độ: 0 / 100 lượt thích. Lượt thích được cộng riêng cho từng người.</p><div id="demo-like-slot" hidden></div><div class="ops-actions"><button class="button subtle" id="demo-burst">${icon('plus')}Thử 6 người cùng lúc</button><button class="button subtle" id="demo-all">${icon('sparkles')}Thử tất cả các mốc</button></div><p class="ops-help">Thử nhiều người sẽ dùng các tên khác nhau. Mọi lượt thử đều có nhãn THỬ; không cộng vào coin thật hay bảng xếp hạng đóng góp.</p></section>
      <section class="ops-card inspector ops-audio"><h3>Âm thanh và hiệu ứng</h3><div id="ops-audio-slot"></div></section>
    </section>
    <section id="page-summary" class="ops-page" aria-label="Tổng kết phiên" hidden>
      <div class="ops-page-heading"><div><span class="eyebrow">TỔNG KẾT PHIÊN</span><h2>Theo dõi kết quả buổi live.</h2><p id="report-period">Phiên hiện tại</p></div><button class="button subtle" id="new-session">${icon('plus')}Bắt đầu phiên mới</button></div>
      <div class="ops-report-toolbar"><label>Báo cáo<select id="report-select"><option value="">Phiên hiện tại</option></select></label><div class="ops-actions"><a class="button subtle" id="export-csv" href="/api/report?format=csv" download>${icon('external-link')}Tải CSV</a><a class="button subtle" id="export-json" href="/api/report?format=json" download>Tải JSON</a></div></div>
      <div class="ops-metrics summary-metrics">${metric('Coin thật', 'report-coins')}${metric('Số quà thật', 'report-gifts')}${metric('Bình luận thật', 'report-comments')}${metric('Lượt thích thật', 'report-likes')}${metric('Lượt theo dõi thật', 'report-follows')}${metric('Lượt vẽ thật hoàn thành', 'report-completed')}${metric('Lượt thật đã bỏ qua', 'report-skipped')}${metric('Lượt thử hoàn thành', 'report-demo')}</div>
      <div class="summary-grid"><section class="ops-card"><div class="ops-card-heading"><h3>Người tặng coin nhiều nhất</h3><span class="ops-badge">CHỈ TÍNH COIN THẬT</span></div><div id="donor-list"></div></section><section class="ops-card"><h3>Hoạt động trong phiên</h3><div id="session-detail"></div><p class="ops-help">Số bình luận gồm cả lượt bị chống spam. Số quà tính theo số lượng khi chuỗi quà kết thúc. Coin lấy từ giá trị quà nhận được. Báo cáo phiên bắt đầu từ v0.4; tổng tích lũy trước đó được giữ bên dưới.</p><div id="lifetime-stats" class="ops-lifetime"></div></section></div>
      <section class="ops-card"><div class="ops-card-heading"><div><h3>Lịch sử các lượt</h3><p class="ops-help">200 lượt gần nhất đã hoàn thành, bỏ qua hoặc hủy qua các phiên.</p></div><label class="ops-inline-label">Hiện<select id="history-filter"><option value="all">Tất cả lượt</option><option value="live">Chỉ lượt thật</option><option value="demo">Chỉ lượt thử</option></select></label></div><div class="ops-table-scroll"><table class="ops-table"><thead><tr><th>Người xem</th><th>Nội dung vẽ</th><th>Loại lượt</th><th>Kết quả</th><th>Kết thúc</th></tr></thead><tbody id="history-list"></tbody></table></div></section>
      <section class="ops-card"><h3>Nhật ký hệ thống</h3><div id="summary-logs" class="ops-logs"></div></section>
    </section>
  </div><aside class="ops-preview"><div id="ops-preview-slot"></div><section class="ops-card obs-card"><div class="ops-card-heading"><h3>Nguồn trình duyệt OBS</h3><span id="output-state" class="ops-badge">0 đang mở</span></div><label>Đường dẫn màn hình phát<input id="obs-url" readonly aria-label="Đường dẫn màn hình phát cho OBS"></label><p class="ops-help">Rộng <strong>1080</strong> · Cao <strong>1920</strong> · 60 khung hình/giây</p><details><summary>Cách thêm vào OBS</summary><ol><li>Trong OBS: Nguồn → + → Trình duyệt → Tạo mới.</li><li>Dán đường dẫn trên. Không chọn mục Tệp cục bộ.</li><li>Đặt chiều rộng 1080, chiều cao 1920 rồi bấm Đồng ý.</li><li>Đặt khung hình OBS là 1080 × 1920 để live TikTok. Bấm Ctrl+F để nguồn vừa khung.</li><li>Bấm chuột phải nguồn → Tương tác → bật tiếng nếu được yêu cầu. Kiểm tra bộ trộn âm thanh trong OBS.</li></ol><p>Giữ ứng dụng này chạy trên máy. Điều khiển buổi live từ màn hình quản trị.</p><a href="https://obsproject.com/kb/browser-source" target="_blank" rel="noopener">Tài liệu nguồn trình duyệt OBS ↗</a></details></section></aside></div>`;
  workspace.insertBefore(root, $('.studio-grid'));
  $('#ops-connect-slot').append(old.connect); old.connect.classList.add('ops-card');
  $('#ops-queue-slot').append(old.queue); old.queue.classList.add('ops-card');
  $('#ops-log-slot').append(old.log);
  $('#ops-preview-slot').append(old.toolbar, old.frame, old.playback);
  $('#demo-rules-slot').append(old.rules); $('#demo-user-slot').append(old.sample);
  $('#demo-enqueue-slot').append(old.enqueue); $('#demo-note-slot').append(old.note);
  $('#ops-audio-slot').append(old.quick); $('#demo-like-slot').append(old.like);
  $('#current-controls').append($('#queue-play'), $('#skip'));
  for (const id of ['comment-cooldown', 'show-rules', 'show-queue', 'autoplay', 'quality']) $('#ops-settings-slot').append($('#' + id).closest('label'));
  $('#rules-dialog').remove(); $('.studio-grid').remove();
  $('#obs-url').value = `${location.origin}/overlay`;
  $('#queue-list').insertAdjacentHTML('beforebegin', '<div class="queue-filters"><label>Tìm người xem<input id="queue-search" type="search" placeholder="@tennguoidung"></label><label>Loại lượt<select id="queue-filter"><option value="all">Tất cả lượt</option><option value="live">Chỉ lượt thật</option><option value="demo">Chỉ lượt thử</option></select></label><span id="queue-visible-count"></span></div>');
  $('#queue-list').insertAdjacentHTML('afterend', '<button class="button subtle queue-more" id="queue-more" hidden>Xem thêm 50 lượt</button>');
  $('.queue-footnote').textContent = 'Ưu tiên cao trước · Cùng mức thì theo thứ tự đến · Thời gian dự kiến thay đổi khi có quà mới';
  $('#clear').textContent = 'Xóa hàng chờ';
  document.body.insertAdjacentHTML('beforeend', '<dialog id="new-session-dialog"><h2>Bắt đầu báo cáo phiên mới?</h2><p>Báo cáo hiện tại sẽ được lưu vào lịch sử. Hàng chờ, lượt đang vẽ, dữ liệu chống trùng quà và tiến độ lượt thích của từng người được giữ nguyên. Máy lưu tối đa 20 báo cáo phiên cũ.</p><div class="ops-actions"><button class="button subtle" id="cancel-session">Hủy</button><button class="button primary" id="confirm-session">Lưu phiên cũ và bắt đầu</button></div></dialog>');

  let state, page = 'operations', dirty = false, rulesSignature = '', limit = 50, selectedReport = null, reportRequest = 0, reportLoading = false;
  function navigate(next, writeHash = true) {
    page = ['operations', 'rules', 'rehearsal', 'summary'].includes(next) ? next : 'operations';
    document.querySelectorAll('.ops-page').forEach(section => { section.hidden = section.id !== `page-${page}`; });
    document.querySelectorAll('[data-page]').forEach(button => { button.classList.toggle('selected', button.dataset.page === page); if (button.dataset.page === page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
    root.classList.toggle('summary-open', page === 'summary');
    if (writeHash) history.replaceState(null, '', `#${page}`);
    if (page === 'summary') renderSummary();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  root.querySelector('.ops-nav').addEventListener('click', event => { const button = event.target.closest('[data-page]'); if (button) navigate(button.dataset.page); });
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1), false));
  $('#rules-open').addEventListener('click', () => navigate('rules'));
  function fillRules(force = false) {
    if (!state || dirty && !force) return;
    const signature = JSON.stringify([state.priorities, state.enabledRules, state.settings.commentCooldown, state.settings.showRules, state.settings.showQueue, state.settings.autoPlay, state.settings.quality]);
    if (!force && signature === rulesSignature) return;
    rulesSignature = signature;
    $('#ops-rule-rows').innerHTML = RULES.map(adminRule).map(rule => `<tr><td><input type="checkbox" data-enabled="${rule.id}" aria-label="Bật ${rule.trigger}" ${state.enabledRules?.[rule.id] !== false ? 'checked' : ''}></td><td><span class="ops-trigger">${icon(rule.icon)}${rule.trigger}</span></td><td>${rule.label}</td><td><input type="number" data-priority="${rule.id}" aria-label="Ưu tiên ${rule.trigger}" min="0" max="9999" step="1" required value="${state.priorities[rule.id]}"></td></tr>`).join('');
    const s = state.settings; $('#comment-cooldown').value = s.commentCooldown; $('#show-rules').checked = s.showRules; $('#show-queue').checked = s.showQueue; $('#autoplay').checked = s.autoPlay; $('#quality').value = s.quality;
    dirty = false; $('#rule-save-status').textContent = 'Đã lưu'; refresh();
  }
  $('#ops-rules-form').addEventListener('input', () => { dirty = true; $('#rule-save-status').textContent = 'Chưa lưu thay đổi'; });
  $('#ops-rules-form').addEventListener('submit', async event => {
    event.preventDefault();
    const priorities = Object.fromEntries([...root.querySelectorAll('[data-priority]')].map(input => [input.dataset.priority, Number(input.value)]));
    const enabledRules = Object.fromEntries([...root.querySelectorAll('[data-enabled]')].map(input => [input.dataset.enabled, input.checked]));
    const result = await command('settings', { priorities, enabledRules, commentCooldown: Number($('#comment-cooldown').value), showRules: $('#show-rules').checked, showQueue: $('#show-queue').checked, autoPlay: $('#autoplay').checked, quality: $('#quality').value });
    if (result) { state = result; dirty = false; fillRules(true); toast('Đã lưu luật và cài đặt hiển thị.'); }
  });
  $('#rules-revert').addEventListener('click', () => fillRules(true));
  function remaining() { const j = state?.current; return j ? Math.max(0, (j.totalDuration || actionSeconds(ruleFor(j.ruleId))) - j.offset - (state.paused ? 0 : (Date.now() + store.clockOffset - j.startedAt) / 1000)) : 0; }
  function renderQueue() {
    if (!state) return;
    const text = $('#queue-search').value.toLowerCase(), mode = $('#queue-filter').value;
    let wait = remaining();
    const queued = state.queue.map((job, index) => { const row = { job, index, wait }; wait += actionSeconds(ruleFor(job.ruleId)); return row; });
    const filtered = queued.filter(({ job }) => job.username.toLowerCase().includes(text) && (mode === 'all' || job.simulated === (mode === 'demo')));
    $('#queue-visible-count').textContent = `${num(filtered.length)} / ${num(state.queueCount)} lượt`;
    $('#ops-duration').textContent = clock(wait); $('#ops-waiting').textContent = num(state.queueCount); $('#nav-queue').textContent = num(state.queueCount);
    $('#queue-list').innerHTML = filtered.length ? filtered.slice(0, limit).map(({ job: j, index, wait }) => `<div class="queue-item"><span class="queue-number">${index + 1}</span><div class="queue-user"><strong>${escape(j.username)} ${j.simulated ? '<em class="ops-mini-demo">THỬ</em>' : ''}</strong><span>${escape(ruleFor(j.ruleId)?.trigger)} · ${escape(ruleFor(j.ruleId)?.short)}${j.coins ? ` · ${num(j.coins)} coin` : ''}</span><span>${state.paused ? 'Tạm dừng · ' : ''}Dự kiến sau ~${clock(wait)} · đã chờ ${clock((Date.now() + store.clockOffset - j.receivedAt) / 1000)}</span></div><span class="queue-prio">ƯT ${j.priority}</span><button class="icon-button" data-promote="${j.id}" aria-label="Đưa ${escape(j.username)} lên kế tiếp" title="Đưa lên kế tiếp">${icon('fast-forward')}</button><button class="icon-button queue-delete" data-delete="${j.id}" aria-label="Xóa lượt của ${escape(j.username)}">${icon('x')}</button></div>`).join('') : '<div class="empty-queue">' + (state.queueCount ? 'Không có người xem phù hợp.' : 'Hàng chờ đang trống. Thêm lượt trong mục Chạy thử hoặc kết nối buổi live.') + '</div>';
    $('#queue-more').hidden = filtered.length <= limit; refresh();
  }
  for (const id of ['queue-search', 'queue-filter']) $('#' + id).addEventListener('input', () => { limit = 50; renderQueue(); });
  $('#queue-more').addEventListener('click', () => { limit += 50; renderQueue(); });
  $('#queue-list').addEventListener('click', async event => { const button = event.target.closest('[data-promote]'); if (button && await command('promote', { id: button.dataset.promote })) toast('Đã đưa người xem lên kế tiếp. Lượt đang vẽ sẽ hoàn thành trước.'); });

  async function simulate(data, username = store.sample) {
    const result = await command('simulate', { username, ...data });
    if (!result) return;
    const s = result.simulation;
    const message = s?.queued ? `Đã thêm ${s.queued} lượt thử vào hàng chờ` : data.type === 'likes' ? `Tiến độ: ${s?.likeProgress || 0} / 100 lượt thích` : 'Chưa xếp lượt: luật đang tắt, chưa hết thời gian chống spam hoặc người này đã theo dõi';
    $('#demo-feedback').textContent = message; $('#demo-like-progress').textContent = `Tiến độ của ${username}: ${s?.likeProgress || 0} / 100 lượt thích.`; toast(message); return result;
  }
  $('#demo-gift').addEventListener('click', () => { if ($('#demo-coins').reportValidity()) simulate({ type: 'gift', coins: Number($('#demo-coins').value) }); });
  $('#demo-like').addEventListener('click', () => { if ($('#demo-likes').reportValidity()) simulate({ type: 'likes', likes: Number($('#demo-likes').value) }); });
  async function burst(all) {
    const button = $(all ? '#demo-all' : '#demo-burst'); button.disabled = true;
    const stamp = Date.now().toString(36); const tiers = all ? RULES : [RULES[0], RULES[2], RULES[3], RULES[5], RULES[7], RULES[8]];
    try { for (const [i, rule] of tiers.entries()) await api('simulate', { username: `demo_${stamp}_${i + 1}`, type: rule.coins ? 'gift' : rule.id, coins: rule.coins, likes: 100 }); toast(`Đã gửi thử ${tiers.length} người xem. Mở Vận hành để theo dõi hàng chờ.`); }
    catch (error) { toast(error.message); } finally { button.disabled = false; }
  }
  $('#demo-burst').addEventListener('click', () => burst(false)); $('#demo-all').addEventListener('click', () => burst(true));
  $('#history-filter').addEventListener('change', renderHistory);
  function renderHistory() {
    if (!state) return;
    const mode = $('#history-filter').value;
    const jobs = state.history.filter(job => mode === 'all' || job.simulated === (mode === 'demo'));
    $('#history-list').innerHTML = jobs.map(j => `<tr><td>${escape(j.username)}</td><td>${escape(ruleFor(j.ruleId)?.short)}</td><td>${j.simulated ? '<span class="ops-mini-demo">THỬ</span>' : 'THẬT'}</td><td>${j.cancelled ? 'Đã hủy' : j.skipped ? 'Đã bỏ qua' : 'Hoàn thành'}</td><td>${date(j.completedAt)}</td></tr>`).join('') || '<tr><td colspan="5" class="ops-empty">Chưa có lượt nào phù hợp bộ lọc.</td></tr>';
  }
  function renderSummary() {
    if (!state?.session || reportLoading) return;
    const report = selectedReport || state.session;
    $('#report-period').textContent = `${date(report.startedAt)} → ${report.endedAt ? date(report.endedAt) : 'Đang ghi nhận'}`;
    for (const key of ['coins', 'gifts', 'comments', 'likes', 'follows', 'completed', 'skipped']) $('#report-' + key).textContent = num(report.live[key]);
    $('#report-demo').textContent = num(report.demo.completed);
    $('#donor-list').innerHTML = report.donors.length ? report.donors.slice(0, 100).map((donor, i) => `<div class="ops-donor"><span>${i + 1}</span><strong>${escape(donor.username)}</strong><span>${num(donor.coins)} coin<small>${num(donor.gifts)} quà</small></span></div>`).join('') : '<div class="ops-empty">Phiên này chưa nhận quà thật.<br>Quà thử không được tính vào bảng này.</div>';
    $('#session-detail').innerHTML = [['Lượt thật đã xếp hàng', report.live.queued], ['Lượt thật không được xếp', report.live.rejected], ['Lượt thật đã hủy khỏi hàng chờ', report.live.cancelled], ['Lượt thử đã xếp hàng', report.demo.queued], ['Lượt thử đã bỏ qua', report.demo.skipped], ['Lượt thử đã hủy khỏi hàng chờ', report.demo.cancelled]].map(([name, value]) => `<div class="ops-detail-row"><span>${name}</span><strong>${num(value)}</strong></div>`).join('');
    $('#lifetime-stats').textContent = `Tổng đã nhận: ${num(state.stats.coins)} coin · ${num(state.stats.comments)} bình luận · ${num(state.stats.follows)} lượt theo dõi · ${num(state.stats.likes)} lượt thích`;
    $('#summary-logs').innerHTML = state.logs.map(log => `<p class="log-${log.level}"><time>${date(log.at)}</time><span>${escape(adminMessage(log.message))}</span></p>`).join('') || '<p class="ops-empty">Chưa có thông báo hệ thống.</p>';
    renderHistory();
  }
  $('#report-select').addEventListener('change', async event => {
    const id = event.target.value, request = ++reportRequest; selectedReport = null; reportLoading = !!id;
    $('#export-csv').href = `/api/report?format=csv${id ? `&session=${encodeURIComponent(id)}` : ''}`;
    $('#export-json').href = `/api/report?format=json${id ? `&session=${encodeURIComponent(id)}` : ''}`;
    if (id) { $('#report-period').textContent = 'Đang tải báo cáo…'; try { const response = await fetch(`/api/report?session=${encodeURIComponent(id)}`); const report = await response.json(); if (!response.ok) throw new Error(report.error); if (request !== reportRequest) return; selectedReport = report; } catch (error) { if (request !== reportRequest) return; toast(error.message); $('#report-select').value = ''; $('#export-csv').href = '/api/report?format=csv'; $('#export-json').href = '/api/report?format=json'; } }
    if (request !== reportRequest) return; reportLoading = false;
    renderSummary();
  });
  $('#new-session').addEventListener('click', () => $('#new-session-dialog').showModal());
  $('#cancel-session').addEventListener('click', () => $('#new-session-dialog').close());
  $('#confirm-session').addEventListener('click', async () => { const result = await command('session/new'); if (result) { reportRequest++; reportLoading = false; selectedReport = null; $('#report-select').value = ''; $('#export-csv').href = '/api/report?format=csv'; $('#export-json').href = '/api/report?format=json'; update(result); $('#new-session-dialog').close(); toast('Đã lưu báo cáo cũ và bắt đầu phiên mới. Hàng chờ được giữ nguyên.'); } });
  function tick() {
    if (!state) return;
    if (state.session) $('#session-elapsed').textContent = `Phiên ${clock((Date.now() + store.clockOffset - state.session.startedAt) / 1000)}`;
    const job = state.current, total = job?.totalDuration || (job ? actionSeconds(ruleFor(job.ruleId)) : 1), left = remaining();
    $('#current-progress').style.width = job ? `${Math.min(100, Math.max(0, 1 - left / total) * 100)}%` : '0%';
    if (job) $('#current-time').textContent = `${clock(left)} còn lại${state.paused ? ' · tạm dừng' : ''}`;
  }
  function update(remote) {
    state = remote; fillRules();
    $('#ops-coins').textContent = num(remote.session?.live.coins); $('#ops-outputs').textContent = num(remote.outputs);
    $('#output-state').textContent = `${remote.outputs} đang mở`;
    $('#ops-play-status').textContent = remote.paused ? 'Tạm dừng' : remote.current ? 'Đang vẽ' : 'Đang chờ người xem';
    const job = remote.current; $('#current-mode').textContent = job ? job.simulated ? 'THỬ' : 'THẬT' : 'ĐANG CHỜ';
    $('#ops-current').innerHTML = job ? `<div><strong>${escape(job.username)}</strong><p>${escape(ruleFor(job.ruleId)?.label)}${job.coins ? ` · ${num(job.coins)} coin` : ''} · ƯT ${job.priority}</p></div><span id="current-time"></span>` : '<p>Chưa có lượt đang vẽ. Bấm Chạy để bắt đầu các lượt đang chờ.</p>';
    $('#skip').disabled = !job; $('#clear').disabled = !remote.queueCount;
    const select = $('#report-select'), selected = select.value;
    const options = '<option value="">Phiên hiện tại</option>' + (remote.session?.archives || []).map(report => `<option value="${report.id}">${date(report.startedAt)} · ${num(report.live.coins)} coin</option>`).join('');
    if (select.innerHTML !== options) { select.innerHTML = options; select.value = selected; }
    renderQueue(); if (page === 'summary') renderSummary(); tick();
  }
  setInterval(tick, 500);
  navigate(location.hash.slice(1), false); refresh();
  return { update, navigate, simulate };
}
