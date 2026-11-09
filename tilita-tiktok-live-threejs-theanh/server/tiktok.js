import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { normalizeEvent } from './engine.js';

export class TikTokAdapter {
  constructor(engine) { this.engine = engine; this.generation = 0; this.wanted = false; this.client = null; this.timer = null; }
  status(status, error = '') { this.engine.connection = { ...this.engine.connection, status, error: String(error).slice(0, 350) }; this.engine.change(); }
  async connect(host) {
    await this.disconnect(); this.wanted = true; this.host = host; this.attempt = 0;
    return this.open(++this.generation);
  }
  async open(generation) {
    if (!this.wanted || generation !== this.generation) return;
    this.engine.connection = { status: 'connecting', host: this.host, room: '', error: '', attempt: this.attempt };
    this.engine.change();
    // Gift events carry their own metadata. The optional catalog requires paid signing.
    const client = new TikTokLiveConnection(this.host, { processInitialData: false, enableExtendedGiftInfo: false,
      ...(process.env.SIGN_API_KEY ? { signApiKey: process.env.SIGN_API_KEY } : {}),
      webClientOptions: { timeout: { request: 12000 } }, wsClientOptions: { handshakeTimeout: 15000 } });
    this.client = client; let room = ''; const since = Date.now();
    const accept = (type, payload) => {
      if (this.client !== client || generation !== this.generation) return;
      const event = normalizeEvent(type, payload, room || client.roomId || this.host);
      if (!event || event.createdAt && event.createdAt < since - 15000) return;
      this.engine.ingest(event);
    };
    client.on(WebcastEvent.CHAT, event => accept('comment', event));
    client.on(WebcastEvent.FOLLOW, event => accept('follow', event));
    client.on(WebcastEvent.LIKE, event => accept('likes', event));
    client.on(WebcastEvent.GIFT, event => accept('gift', event));
    client.on(ControlEvent.ERROR, event => { if (this.client === client) this.engine.log(event?.info || event?.exception?.message || 'TikTok connection error', 'warning'); });
    client.on(ControlEvent.DISCONNECTED, () => {
      if (this.client === client && this.wanted && generation === this.generation) this.retry(generation, 'TikTok disconnected.');
    });
    client.on(ControlEvent.STREAM_END, () => { if (this.client === client) { this.wanted = false; clearTimeout(this.timer); this.status('ended', 'The LIVE session has ended.'); } });
    try {
      const state = await client.connect();
      if (generation !== this.generation || !this.wanted) { await client.disconnect(); return; }
      room = String(state.roomId); this.attempt = 0;
      this.engine.connection = { status: 'connected', host: this.host, room, error: '', attempt: 0 };
      if (this.engine.settings.autoPlay) this.engine.setPaused(false);
      this.engine.log(`Connected to LIVE @${this.host}.`);
    } catch (error) {
      if (generation !== this.generation || !this.wanted) return;
      const message = String(error.message || error).replace(/(?:api[_-]?key|token|sessionid)\s*[=:]\s*\S+/gi, '[credentials hidden]');
      const offline = error.name === 'UserOfflineError' || /isn.t online|not.*live/i.test(message);
      this.retry(generation, offline ? `Account @${this.host} is not LIVE right now.` : message, offline ? 30000 : 0);
    }
  }
  retry(generation, error, minimumDelay = 0) {
    if (this.timer || !this.wanted) return;
    this.attempt++; const delay = Math.max(minimumDelay, Math.min(60000, 5000 * 2 ** Math.min(this.attempt - 1, 4)));
    this.status('reconnecting', `${error} · Retrying in ${delay / 1000}s`);
    this.timer = setTimeout(async () => { this.timer = null; const old = this.client; this.client = null; await old?.disconnect().catch(() => {}); this.open(generation); }, delay);
  }
  async disconnect() {
    this.wanted = false; this.generation++; clearTimeout(this.timer); this.timer = null;
    const client = this.client; this.client = null; await client?.disconnect().catch(() => {});
    this.status('disconnected');
  }
}
