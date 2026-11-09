import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { LiveEngine } from './engine.js';
import { TikTokAdapter } from './tiktok.js';
import { reportCSV } from './reporting.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.TILITA_DATA_DIR || path.join(root, 'data');
const stateFile = path.join(dataDir, 'state.json'); fs.mkdirSync(dataDir, { recursive: true });
const mediaDir = path.join(dataDir, 'music'); fs.mkdirSync(mediaDir, { recursive: true });
let saved = {}; try { saved = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') console.warn('Could not read the saved state; the file has been preserved for inspection.'); }
const clients = new Map(); let writeTimer, broadcastTimer;
const persist = () => { try { const temporary = `${stateFile}.tmp`; fs.writeFileSync(temporary, JSON.stringify(engine.serialize())); fs.renameSync(temporary, stateFile); } catch (error) { console.error('Could not save the queue:', error.message); } };
const engine = new LiveEngine(saved, () => {
  if (!writeTimer) writeTimer = setTimeout(() => { writeTimer = null; persist(); }, 180);
  if (!broadcastTimer) broadcastTimer = setTimeout(() => { broadcastTimer = null; const event = `data: ${JSON.stringify(engine.publicState())}\n\n`; for (const { response } of clients.values()) response.write(event); }, 40);
});
const adapter = new TikTokAdapter(engine);
const dev = process.argv.includes('--dev'); const port = Number(process.env.PORT || 5178);
const vite = dev ? await (await import('vite')).createServer({ root, server: { middlewareMode: true }, appType: 'spa' }) : null;
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const send = (response, status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); };
const body = request => new Promise((resolve, reject) => {
  let text = ''; request.on('data', chunk => { text += chunk; if (text.length > 2 * 1024 * 1024) { reject(new Error('Request is too large')); request.destroy(); } });
  request.on('end', () => { try { resolve(text ? JSON.parse(text) : {}); } catch { reject(new Error('Invalid JSON')); } }); request.on('error', reject);
});
const avatarAllowed = url => { try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password && !u.port && ['tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','tiktok.com','byteoversea.com','ibytedtos.com','muscdn.com','tiktokv.com','byteimg.com','ttwstatic.com','tiktokcdn-in.com'].some(domain => u.hostname === domain || u.hostname.endsWith(`.${domain}`)); } catch { return false; } };
const avatarCache = new Map();
async function proxyAvatar(url, response) {
  if (!avatarAllowed(url)) return send(response, 400, { error: 'Unsupported avatar source.' });
  const cached = avatarCache.get(url);
  if (cached) { response.writeHead(200, { 'Content-Type': cached.type, 'Cache-Control': 'private, max-age=600' }); return response.end(cached.data); }
  let remote;
  for (let i = 0; i < 4; i++) {
    if (!avatarAllowed(url)) throw new Error('Invalid avatar redirect.');
    remote = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(7000) });
    if (remote.status >= 300 && remote.status < 400) { url = new URL(remote.headers.get('location'), url).href; continue; }
    break;
  }
  if (!remote.ok || !remote.headers.get('content-type')?.startsWith('image/')) throw new Error('Could not load the avatar.');
  if (Number(remote.headers.get('content-length')) > 5 * 1024 * 1024) throw new Error('Avatar is too large.');
  const parts = []; let bytes = 0;
  for await (const chunk of remote.body) { bytes += chunk.length; if (bytes > 5 * 1024 * 1024) { await remote.body.cancel().catch(() => {}); throw new Error('Avatar is too large.'); } parts.push(chunk); }
  const value = { data: Buffer.concat(parts), type: remote.headers.get('content-type').split(';')[0] };
  if (avatarCache.size >= 100) avatarCache.delete(avatarCache.keys().next().value); avatarCache.set(url, value);
  response.writeHead(200, { 'Content-Type': value.type, 'Cache-Control': 'private, max-age=600', 'X-Content-Type-Options': 'nosniff' }); response.end(value.data);
}

async function uploadMusic(request) {
  const formats={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.flac':'audio/flac','.webm':'audio/webm'};
  const name=decodeURIComponent(String(request.headers['x-file-name']||'')).replace(/[\u0000-\u001f\\/]/g,'').slice(0,150);
  const extension=path.extname(name).toLowerCase();if(!formats[extension])throw new Error('Choose MP3, WAV, OGG, M4A, AAC, FLAC or WebM.');
  if(Number(request.headers['content-length'])>50*1024*1024)throw new Error('Music files must be under 50 MB.');
  const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>50*1024*1024)throw new Error('Music files must be under 50 MB.');chunks.push(chunk);}
  if(!size)throw new Error('The music file is empty.');
  const id=randomUUID(),file=id+extension,previous=engine.music.track;
  fs.writeFileSync(path.join(mediaDir,file),Buffer.concat(chunks));
  engine.setMusic({id,file,name,bytes:size,mime:formats[extension],url:`/media/${file}`});
  if(previous?.file&&/^[a-f0-9-]+\.(mp3|wav|ogg|m4a|aac|flac|webm)$/.test(previous.file))fs.unlink(path.join(mediaDir,previous.file),()=>{});
}

const server = http.createServer(async (request, response) => {
  if (!allowedHosts.has(request.headers.host)) return send(response, 403, { error: 'This server only accepts localhost requests.' });
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname === '/api/health') return send(response, 200, { app: 'tilita-live-threejs-theanh', version: '0.4.0', pid: process.pid, workspace: root });
    if (url.pathname === '/api/state') return send(response, 200, engine.publicState());
    if (url.pathname === '/api/report') {
      const report = engine.reports.export(url.searchParams.get('session'));
      const csv = url.searchParams.get('format') === 'csv';
      response.writeHead(200, { 'Content-Type': csv ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="tilita-session-${report.id}.${csv ? 'csv' : 'json'}"`, 'Cache-Control': 'no-store' });
      return response.end(csv ? reportCSV(report) : JSON.stringify(report, null, 2));
    }
    if(url.pathname.startsWith('/media/')){
      const file=url.pathname.slice('/media/'.length),track=engine.music.track;
      if(!track||file!==track.file)return send(response,404,{error:'Music file not found.'});
      const filename=path.join(mediaDir,file),stat=fs.statSync(filename),range=request.headers.range;
      let start=0,end=stat.size-1,status=200;
      if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){response.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return response.end();}start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;status=206;if(start>end||start>=stat.size){response.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return response.end();}}
      response.writeHead(status,{'Content-Type':track.mime,'Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=600','X-Content-Type-Options':'nosniff',...(status===206?{'Content-Range':`bytes ${start}-${end}/${stat.size}`}:{})});fs.createReadStream(filename,{start,end}).pipe(response);return;
    }
    if (url.pathname === '/api/avatar') return await proxyAvatar(url.searchParams.get('url'), response);
    if (url.pathname === '/events') {
      const origin = request.headers.origin; if (origin && origin !== `http://${request.headers.host}`) return send(response, 403, { error: 'Invalid request origin.' });
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      const id = randomUUID(); clients.set(id, { response, role: url.searchParams.get('role') === 'output' ? 'output' : 'studio' });
      engine.renderers = clients.size; engine.outputs = [...clients.values()].filter(client => client.role === 'output').length;
      if (engine.outputLost) { engine.outputLost = false; engine.setPaused(false); }
      engine.advance(); response.write(`data: ${JSON.stringify(engine.publicState())}\n\n`); engine.change();
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 10000);
      request.on('close', () => {
        clearInterval(heartbeat); clients.delete(id); engine.renderers = clients.size; engine.outputs = [...clients.values()].filter(client => client.role === 'output').length;
        if (!clients.size && !engine.paused) { engine.outputLost = true; engine.setPaused(true); } engine.change();
      }); return;
    }
    if (url.pathname.startsWith('/api/')) {
      if(url.pathname==='/api/music/upload'){
        if(request.method!=='POST'||request.headers.origin!==`http://${request.headers.host}`)return send(response,403,{error:'Upload music from the local studio only.'});
        await uploadMusic(request);return send(response,200,engine.publicState());
      }
      if (request.method !== 'POST' || request.headers.origin !== `http://${request.headers.host}` || !request.headers['content-type']?.includes('application/json')) return send(response, 403, { error: 'Control commands must come from the local studio.' });
      const input = await body(request);
      switch (url.pathname) {
        case '/api/settings': engine.updateSettings(input); break;
        case '/api/connect': {
          engine.updateSettings({ host: input.host }); if (!engine.settings.host) throw new Error('Enter your TikTok @username before connecting.');
          adapter.connect(engine.settings.host).catch(error => engine.log(error.message, 'error')); break;
        }
        case '/api/disconnect': await adapter.disconnect(); break;
        case '/api/play': engine.setPaused(false); break;
        case '/api/pause': engine.setPaused(true); break;
        case '/api/skip': engine.finish(true); break;
        case '/api/remove': engine.remove(input.id); break;
        case '/api/promote': engine.promote(input.id); break;
        case '/api/session/new': engine.startSession(); break;
        case '/api/clear': engine.clearQueue(); break;
        case '/api/music/play': engine.musicAction('play'); break;
        case '/api/music/pause': engine.musicAction('pause'); break;
        case '/api/music/remove': {
          const old=engine.music.track;engine.musicAction('remove');
          if(old?.file&&/^[a-f0-9-]+\.(mp3|wav|ogg|m4a|aac|flac|webm)$/.test(old.file))fs.unlink(path.join(mediaDir,old.file),()=>{});break;
        }
        case '/api/simulate': {
          const username = `@${String(input.username || 'theanh.live').replace(/^@+/, '').replace(/[\u0000-\u001f]/g, '').slice(0, 40)}`;
          const event = { id: randomUUID(), room: 'simulation', type: input.type, userId: username, username, simulated: true,
            likes: Number(input.likes || 25), unitCoins: Number(input.coins || 0), quantity: 1, giftType: 0, giftId: 'demo', avatarUrl: '' };
          if (!['comment','follow','likes','gift'].includes(event.type)) throw new Error('Invalid event type.');
          if (event.type === 'gift' && (!Number.isFinite(event.unitCoins) || event.unitCoins < 1 || event.unitCoins > 1000000)) throw new Error('Invalid coin amount.');
          if (event.type === 'likes' && (!Number.isFinite(event.likes) || event.likes < 1 || event.likes > 10000)) throw new Error('Invalid like amount.');
          const queuedBefore = engine.sequence;
          const accepted = engine.ingest(event);
          return send(response, 200, { ...engine.publicState(), simulation: { accepted, queued: engine.sequence - queuedBefore, likeProgress: engine.likes.get(`demo:${username}`) || 0 } });
        }
        default: return send(response, 404, { error: 'Command not found.' });
      }
      return send(response, 200, engine.publicState());
    }
    if (vite) return vite.middlewares(request, response);
    const requested = decodeURIComponent(url.pathname); const asset = path.resolve(root, 'dist', `.${requested}`);
    const dist = path.join(root, 'dist'); if (asset !== dist && !asset.startsWith(`${dist}${path.sep}`)) return send(response, 403, { error: 'Invalid path.' });
    const file = fs.existsSync(asset) && fs.statSync(asset).isFile() ? asset : path.join(dist, 'index.html');
    if (!fs.existsSync(file)) return send(response, 503, { error: 'Run npm run build before opening the output.' });
    const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.wav':'audio/wav','.png':'image/png','.jpg':'image/jpeg' }[path.extname(file)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime, 'Cache-Control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=600' }); fs.createReadStream(file).pipe(response);
  } catch (error) { if (!response.headersSent) send(response, 400, { error: String(error.message).slice(0, 350) }); else response.end(); }
});
const timer = setInterval(() => engine.tick(), 100);
server.listen(port, '127.0.0.1', () => console.log(`Tilita LIVE Studio: http://127.0.0.1:${port}/\n1080×1920 output: http://127.0.0.1:${port}/overlay`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Open the running studio or change PORT.` : error.message); process.exit(1); });
async function shutdown() { clearInterval(timer); clearTimeout(writeTimer); clearTimeout(broadcastTimer); persist(); await adapter.disconnect(); for (const { response } of clients.values()) response.end(); await vite?.close(); server.close(); process.exit(0); }
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
