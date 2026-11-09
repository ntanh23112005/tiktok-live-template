import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { LiveEngine, validateConfig, migrateConfig, normalizeEvent, ACTIONS } from './src/core.js';
import { JsonStore } from './src/store.js';
import { TikTokSource } from './src/tiktok.js';
import { listMusic } from './src/music.js';

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp({ dataDir = process.env.TILITA_DATA_DIR || path.join(root, 'data') } = {}) {
  const defaults = JSON.parse(fs.readFileSync(path.join(root, 'config/default.json'), 'utf8'));
  const store = new JsonStore(dataDir);
  let config = store.read('config', defaults);
  try {
    const oldVersion = config.sceneVersion !== 'wooden-temple-v2';
    // Validate before migration so malformed files cannot be silently replaced.
    validateConfig(config);
    if (oldVersion && !store.blocked.has('config')) {
      const original = path.join(dataDir, 'config.json'), backup = path.join(dataDir, 'config-before-v2.json');
      if (fs.existsSync(original) && !fs.existsSync(backup)) fs.copyFileSync(original, backup);
    }
    config = validateConfig(migrateConfig(config));
    if (oldVersion && !store.blocked.has('config')) store.write('config', config);
  } catch (e) { store.blocked.add('config'); store.errors.push(`Cấu hình không hợp lệ: ${e.message} File được giữ nguyên.`); config = defaults; }
  let stats = store.read('stats', { users: {}, totalGifts: 0, totalCoins: 0 });
  if (!stats || !stats.users || Array.isArray(stats.users) || typeof stats.users !== 'object' || !Number.isFinite(stats.totalGifts) || !Number.isFinite(stats.totalCoins) || Object.values(stats.users).some(u => !u || !Number.isFinite(u.coins) || !Number.isFinite(u.gifts))) {
    store.blocked.add('stats'); store.errors.push('Thống kê không hợp lệ; file gốc được giữ nguyên.'); stats = { users: {}, totalGifts: 0, totalCoins: 0 };
  }
  const engine = new LiveEngine(config, stats);
  const app = express(); const server = http.createServer(app); const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
  const clients = new Map(); let source;
  const snapshot = () => ({ ...engine.snapshot(), source: source?.state || {}, actions: ACTIONS, audioReady: [...clients.values()].some(c => c.id === engine.renderer && c.audio), clients: [...clients].filter(([, c]) => c.ready && c.role === 'overlay').length });
  const broadcast = (type = 'state', data = snapshot()) => { for (const ws of clients.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, data })); };
  let broadcastTimer=null,closing=false;
  const changed = () => { if(!closing && !broadcastTimer) broadcastTimer=setTimeout(()=>{broadcastTimer=null;broadcast();},80); };
  source = new TikTokSource(engine, changed);
  engine.on('change', changed); engine.on('effect', data => broadcast('effect', data));
  let persistenceError = '';
  engine.on('stats', () => { try { store.write('stats', engine.stats); } catch (e) { if (e.message !== persistenceError) { persistenceError = e.message; engine.log('error', e.message); } } });
  store.errors.forEach(e => engine.log('error', e));
  // Same-origin and Host validation protect the loopback control API from other websites.
  const validHost = req => ['127.0.0.1', 'localhost'].includes((req.headers.host || '').split(':')[0]);
  const validOrigin = req => !req.headers.origin || req.headers.origin === `http://${req.headers.host}`;
  app.use((req, res, next) => { if (!validHost(req) || !validOrigin(req)) return res.status(403).json({ error: 'Chỉ chấp nhận truy cập từ trang local của tool.' }); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
  app.use(express.json({ limit: '100kb' }));
  app.get('/', (_req, res) => res.redirect('/admin'));
  for (const route of ['admin', 'overlay', 'preview']) app.get('/' + route, (_req, res) => res.sendFile(path.join(root, 'public', route === 'admin' ? 'admin.html' : 'overlay.html')));
  app.get('/api/state', (_req, res) => res.json(snapshot()));
  app.get('/api/fortunes', (_req, res) => res.json(engine.fortuneAudio));
  app.get('/api/music', (_req, res) => { res.setHeader('Cache-Control','no-store'); res.json(listMusic()); });
  app.put('/api/config', (req, res) => {
    const c = validateConfig(req.body); store.write('config', c); engine.config = c; changed(); res.json({ ok: true });
  });
  app.post('/api/connect', async (req, res, next) => { try { await source.connect(req.body.username); res.json({ ok: true }); } catch (e) { next(e); } });
  app.post('/api/disconnect', (_req, res) => { source.disconnect(); res.json({ ok: true }); });
  app.post('/api/control', (req, res) => { engine.control(req.body.command, req.body.id); res.json({ ok: true }); });
  app.post('/api/simulate', (req, res) => {
    engine.simulationSeatsEnabled = source.state.status !== 'connected';
    const { scenario = 'rose', nickname = 'Người thử', comment = 'cầu an' } = req.body;
    const id = randomUUID(); const user = { userId: String(req.body.userId || id), nickname };
    if (scenario === 'hall') {
      if (source.state.status === 'connected') return res.status(400).json({ error: 'Ngắt kết nối TikTok trước khi thử bảng đóng góp mẫu.' });
      engine.showHallDemo(); return res.json({ status: 'hall-demo' });
    }
    if (scenario === 'ritual') {
      if (!Object.hasOwn(ACTIONS, req.body.action)) return res.status(400).json({ error: 'Kịch bản không hợp lệ.' });
      return res.json(engine.ingest(normalizeEvent('gift', { user, giftName: 'Thử kịch bản', eventId: id, groupId: id, repeatEnd: true }, 'sim', true), req.body.action));
    }
    if (scenario === 'burst') {
      const result = [];
      for (let i = 0; i < 4; i++) result.push(engine.ingest(normalizeEvent(i < 2 ? 'comment' : 'gift', { eventId: randomUUID(), user: { userId: randomUUID(), nickname: ['Minh An', 'Bình Tâm', 'Thanh Hoa', 'Thiện Tâm'][i] }, content: 'thắp hương', giftName: 'Rose', giftId: '5655', repeatCount: 1, repeatEnd: true, giftType: 1, diamondCount: 1 }, 'sim', true)));
      return res.json({ result });
    }
    if (scenario === 'comment') return res.json(engine.ingest({ ...normalizeEvent('comment', { user, content: comment, eventId: id }, 'sim', true), seatSimulation: source.state.status !== 'connected' }));
    if (['like', 'follow', 'share'].includes(scenario)) return res.json(engine.ingest({ ...normalizeEvent(scenario, { user, eventId: id, likeCount: req.body.likeCount ?? 5 }, 'sim', true), seatSimulation: source.state.status !== 'connected' }));
    if (!['rose', 'combo', 'grand', 'duplicate', 'gift'].includes(scenario)) return res.status(400).json({ error: 'Mô phỏng không hợp lệ.' });
    const coins = scenario === 'gift' ? Number(req.body.coins) : scenario === 'grand' ? 500 : 1;
    if (!Number.isInteger(coins) || coins < 0 || coins > 100000) return res.status(400).json({ error: 'Giá trị thử từ 0 đến 100000 xu.' });
    const raw = { user, giftId: scenario === 'gift' ? 'test-tier' : scenario === 'grand' ? 'test-grand' : '5655', giftName: scenario === 'gift' ? `Quà ${coins} xu` : scenario === 'grand' ? 'Quà đại lễ' : 'Rose', giftType: 1, groupId: id, eventId: id, diamondCount: coins };
    const counts = scenario === 'combo' ? [1, 2, 2, 5] : [1];
    counts.forEach(repeatCount => engine.ingest(normalizeEvent('gift', { ...raw, repeatCount, repeatEnd: false }, 'sim', true)));
    const final = { ...raw, repeatCount: counts.at(-1), repeatEnd: true };
    const result = engine.ingest(normalizeEvent('gift', final, 'sim', true));
    if (scenario === 'duplicate') engine.ingest(normalizeEvent('gift', final, 'sim', true));
    res.json(result);
  });
  app.use(express.static(path.join(root, 'public')));
  app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || 'Yêu cầu không hợp lệ.' }));
  server.on('upgrade', (req, socket, head) => {
    if (!validHost(req) || !validOrigin(req) || req.url?.split('?')[0] !== '/ws') return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const chooseRenderer = () => {
    const next = [...clients].find(([, c]) => c.role === 'overlay' && c.ready);
    engine.setRenderer(next?.[1].id || null);
  };
  wss.on('connection', (ws, req) => {
    const role = new URL(req.url, 'http://localhost').searchParams.get('role');
    const client = { id: randomUUID(), role, ready: false, alive: true }; clients.set(ws, client);
    ws.on('pong', () => { client.alive = true; });
    ws.send(JSON.stringify({ type: 'hello', data: { id: client.id } }));
    ws.send(JSON.stringify({ type: 'state', data: snapshot() }));
    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'ready' && role === 'overlay') { client.ready = true; if (!engine.renderer) chooseRenderer(); changed(); }
        if (msg.type === 'complete' && engine.renderer === client.id && engine.current?.id === msg.id && Date.now() >= engine.current.startedAt + engine.current.duration - 500) engine.finish(msg.id);
        if (msg.type === 'audio') { client.audio = msg.enabled === true; changed(); }
        if (msg.type === 'audio-error' && engine.renderer === client.id && msg.id === engine.current?.id && !client.audioErrorJobs?.has(msg.id)) {
          (client.audioErrorJobs ||= new Set()).add(msg.id);
          if (client.audioErrorJobs.size > 100) client.audioErrorJobs.clear();
          engine.log('warn', `Không phát được lời đọc cho ${engine.current.nickname}. Giữ thẻ theo thời gian dự phòng.`);
        }
      } catch { /* Invalid renderer input cannot affect the queue. */ }
    });
    ws.on('error', () => {});
    ws.on('close', () => { clients.delete(ws); if (engine.renderer === client.id) { engine.setRenderer(null); chooseRenderer(); } changed(); });
  });
  const tick = setInterval(() => engine.tick(), 1000);
  const heartbeat = setInterval(() => { for (const [ws, c] of clients) { if (!c.alive) ws.terminate(); else { c.alive = false; ws.ping(); } } }, 5000);
  function close() { closing=true;clearTimeout(broadcastTimer);engine.flushParticipants(true);clearInterval(tick); clearInterval(heartbeat); source.disconnect(); for (const ws of clients.keys()) ws.terminate(); wss.close(); return new Promise(resolve => server.close(resolve)); }
  return { app, server, engine, source, close };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const instance = createApp(); const port = Number(process.env.PORT || 3000);
  instance.server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Cổng ${port} đang bận. Đóng tool cũ hoặc chương trình dùng cổng này rồi mở lại.` : e.message); instance.close().finally(() => process.exit(1)); });
  instance.server.listen(port, '127.0.0.1', () => {
    console.log(`Tilita LIVE\nQuản lý: http://127.0.0.1:${port}/admin\nOBS: http://127.0.0.1:${port}/overlay\nChưa kết nối TikTok. Ctrl+C để đóng.`);
    if (process.argv.includes('--open') && process.platform === 'win32') {
      const browser = spawn('explorer.exe', [`http://127.0.0.1:${port}/admin`], { detached: true, stdio: 'ignore', windowsHide: true });
      browser.on('error', () => console.log('Mở trang quản lý bằng địa chỉ ở trên.')); browser.unref();
    }
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => instance.close().finally(() => process.exit(0)));
}
