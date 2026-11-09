import { randomUUID } from 'node:crypto';
import { RULES, resolveRule, sortQueue } from '../src/rules.js';
import { actionSeconds } from '../src/timing.js';
import { SessionReports } from './reporting.js';

const str = value => value == null ? '' : String(value);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clean = (value, limit = 80) => str(value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, limit);
export const DEFAULT_SETTINGS = { host: '', volume: 1, musicVolume: .2, duckMusic: true, shake: .32, commentCooldown: 40, autoPlay: true, showRules: true, showQueue: true, quality: 'balanced' };

export function normalizeEvent(type, data, room = '') {
  const user = data.user ?? {};
  const username = clean(user.displayId || user.uniqueId || data.uniqueId, 40).replace(/^@+/, '');
  const userId = str(user.id || user.userId || data.userId || username);
  if (!username || !userId) return null;
  const gift = data.gift ?? data.giftDetails ?? {};
  const extended = data.extendedGiftInfo ?? {};
  const avatar = [user.avatarLarger, user.avatarMedium, user.avatarThumb].find(image => image?.urlList?.length || image?.url_list?.length);
  const avatarUrl = avatar?.urlList?.[0] || avatar?.url_list?.[0] || user.profilePictureUrl || data.profilePictureUrl || '';
  const id = str(data.common?.msgId || data.msgId || data.eventId || data.logId);
  const created = number(data.common?.createTime);
  return {
    type, id, room: str(room), userId, username: `@${username}`, avatarUrl: clean(avatarUrl, 3000),
    comment: clean(data.content || data.comment, 200), likes: Math.max(0, Math.floor(number(data.count ?? data.likeCount))),
    giftId: str(data.giftId || gift.id), giftName: clean(gift.name || gift.giftName || extended.name, 80),
    giftType: number(gift.type ?? gift.giftType ?? data.giftType ?? extended.type),
    unitCoins: Math.max(0, number(gift.diamondCount ?? gift.diamond_count ?? extended.diamond_count ?? extended.diamondCount ?? data.diamondCount)),
    quantity: Math.max(1, Math.floor(number(data.repeatCount, 1))), groupId: str(data.groupId || data.comboId || ''),
    repeatEnd: data.repeatEnd === true || data.repeatEnd === 1 || data.repeatEnd === '1',
    createdAt: created > 0 ? created * (created < 1e12 ? 1000 : 1) : 0,
    simulated: data.simulated === true
  };
}

export class LiveEngine {
  constructor(saved = {}, onChange = () => {}, now = () => Date.now()) {
    this.now = now; this.onChange = onChange;
    this.settings = { ...DEFAULT_SETTINGS, ...saved.settings };
    this.priorities = { ...Object.fromEntries(RULES.map(rule => [rule.id, rule.priority])), ...saved.priorities };
    this.enabledRules = { ...Object.fromEntries(RULES.map(rule => [rule.id, true])), ...saved.enabledRules };
    this.reports = new SessionReports(saved.reports, now);
    this.queue = Array.isArray(saved.queue) ? saved.queue.slice(0, 1000) : [];
    // Recover an interrupted job, but start paused so reopening never silently consumes gifts.
    if (saved.current) this.queue.unshift({ ...saved.current, recovered: true });
    this.current = null; this.paused = true; this.sequence = number(saved.sequence);
    this.wallSerial = number(saved.wallSerial);
    this.music = { track: null, offset: 0, startedAt: 0, ...saved.music, playing: false };
    this.likes = new Map(saved.likes ?? []); this.cooldowns = new Map(saved.cooldowns ?? []);
    this.followed = new Set(saved.followed ?? []); this.seen = new Map(saved.seen ?? []);
    this.processedCombos = new Map(saved.processedCombos ?? []); this.combos = new Map(saved.combos ?? []);
    this.stats = { comments: 0, follows: 0, likes: 0, coins: 0, completed: 0, ...saved.stats };
    this.history = (saved.history ?? []).slice(-200); this.logs = [];
    this.connection = { status: 'disconnected', host: this.settings.host, room: '', error: '', attempt: 0 };
    this.renderers = 0; this.revision = 0;
  }
  rule(id) { const base = RULES.find(rule => rule.id === id); return base ? { ...base, priority: this.priorities[id], enabled: this.enabledRules[id] !== false } : null; }
  change() { this.revision++; this.onChange(this); }
  log(message, level = 'info') { this.logs.push({ id: randomUUID(), at: this.now(), message: clean(message, 400), level }); this.logs = this.logs.slice(-60); this.change(); }
  publicState() {
    return { revision: this.revision, serverTime: this.now(), settings: this.settings, priorities: this.priorities, enabledRules: this.enabledRules,
      connection: this.connection, paused: this.paused, renderers: this.renderers, outputs: this.outputs ?? 0, music: this.music,
      current: this.current, queue: sortQueue(this.queue), queueCount: this.queue.length,
      stats: this.stats, session: this.reports.publicState(), history: this.history.slice().reverse(), logs: this.logs.slice().reverse() };
  }
  serialize() {
    return { settings: this.settings, priorities: this.priorities, enabledRules: this.enabledRules, reports: this.reports.serialize(), queue: this.queue, current: this.current, wallSerial: this.wallSerial, music: { ...this.music, offset: this.music.offset + (this.music.playing ? Math.max(0,this.now()-this.music.startedAt)/1000 : 0), startedAt: this.now() },
      sequence: this.sequence, likes: [...this.likes], cooldowns: [...this.cooldowns], followed: [...this.followed].slice(-30000),
      seen: [...this.seen], processedCombos: [...this.processedCombos], combos: [...this.combos], stats: this.stats, history: this.history };
  }
  add(ruleId, event) {
    if (this.queue.length >= 1000) { this.reports.record(event, 'rejected'); this.log('The queue has reached 1000 events. Finish queued events before adding more.', 'error'); return null; }
    const rule = this.rule(ruleId); if (!rule) return null;
    if (!rule.enabled) { this.reports.record(event, 'rejected'); this.change(); return null; }
    const job = { id: randomUUID(), sequence: this.sequence++, ruleId, priority: rule.priority,
      username: clean(event.username, 41), userId: str(event.userId), avatarUrl: event.avatarUrl ?? '',
      coins: event.coins ?? 0, giftName: event.giftName ?? '', quantity: event.quantity ?? 1,
      simulated: !!event.simulated, sessionId: this.reports.current.id, receivedAt: this.now(), duration: rule.duration, hold: rule.kind === 'statue' ? 3 : 2.2 };
    this.reports.record(event, 'queued');
    this.queue.push(job); this.queue = sortQueue(this.queue); this.change(); this.advance(); return job;
  }
  ingest(event) {
    if (!event?.userId || !event.username) return false;
    const now = this.now(); const prefix = `${event.simulated ? 'demo' : event.room}:${event.userId}`;
    if (event.type === 'gift') return this.gift(event);
    if (event.id) { const key = `${event.room}:${event.type}:${event.id}`; if (this.seen.has(key)) return false; this.seen.set(key, now); }
    if (event.type === 'comment') {
      if (!event.simulated) this.stats.comments++;
      this.reports.record(event, 'comments');
      const key = `${prefix}:comment`; const last = this.cooldowns.get(key);
      if (last != null && now - last < this.settings.commentCooldown * 1000) { this.reports.record(event, 'rejected'); this.change(); return false; }
      this.cooldowns.set(key, now); return !!this.add('comment', event);
    }
    if (event.type === 'follow') {
      if (this.followed.has(prefix)) return false;
      this.followed.add(prefix); if (!event.simulated) this.stats.follows++;
      this.reports.record(event, 'follows');
      return !!this.add('follow', event);
    }
    if (event.type === 'likes') {
      if (!Number.isFinite(event.likes) || event.likes <= 0) return false;
      const total = (this.likes.get(prefix) ?? 0) + Math.floor(event.likes);
      const earned = Math.floor(total / 100); this.likes.set(prefix, total % 100);
      if (!event.simulated) this.stats.likes += Math.floor(event.likes);
      this.reports.record(event, 'likes', Math.floor(event.likes));
      for (let i = 0; i < Math.min(earned, 1000); i++) this.add('likes', event);
      this.change(); return earned > 0;
    }
    return false;
  }
  gift(event) {
    if (!Number.isFinite(event.unitCoins) || event.unitCoins <= 0) {
      this.log(`Missing coin value for gift ${event.giftId || 'unknown'}; no event was awarded to avoid an incorrect tier.`, 'warning'); return false;
    }
    const now = this.now();
    if (event.giftType === 1) {
      if (event.id) {
        const packet = `${event.room}:streak-packet:${event.userId}:${event.giftId}:${event.id}:${event.quantity}:${event.repeatEnd}`;
        if (this.seen.has(packet)) return false;
        this.seen.set(packet, now);
      }
      const group = event.groupId && event.groupId !== '0' ? event.groupId : 'ungrouped';
      const key = `${event.room}:${event.userId}:${event.giftId}:${group}`;
      let done = this.processedCombos.get(key);
      // Without a group ID, a new count=1 after a gap marks a new streak.
      if (group === 'ungrouped' && done && event.quantity === 1 && !event.repeatEnd && (event.id && event.id !== done.messageId || now - done.at > 2000)) {
        this.processedCombos.delete(key); done = null;
      }
      if (done && event.quantity <= done.count) return false;
      const pending = this.combos.get(key);
      this.combos.set(key, { event: { ...event, quantity: Math.max(event.quantity, pending?.event.quantity ?? 0) }, at: now, baseline: done?.count ?? 0 });
      if (event.repeatEnd) this.closeCombo(key);
      else this.change();
      return true;
    }
    const receipt = event.id || (event.groupId && event.groupId !== '0' ? `${event.userId}:${event.giftId}:${event.groupId}` : '');
    if (!receipt) { this.log('Gift event ID is missing; inspect the payload before awarding an event.', 'warning'); return false; }
    const key = `${event.room}:gift:${event.userId}:${event.giftId}:${receipt}`;
    if (this.seen.has(key)) return false;
    this.seen.set(key, now); this.awardGift(event, event.quantity); return true;
  }
  closeCombo(key) {
    const combo = this.combos.get(key); if (!combo) return;
    this.combos.delete(key); const count = combo.event.quantity;
    const delta = count - (this.processedCombos.get(key)?.count ?? combo.baseline);
    this.processedCombos.set(key, { count, at: this.now(), messageId: combo.event.id });
    if (delta > 0) this.awardGift(combo.event, delta);
    else this.change();
  }
  awardGift(event, quantity) {
    const coins = event.unitCoins * quantity;
    const rule = resolveRule('gift', coins); if (!rule) return;
    if (!event.simulated) this.stats.coins += coins;
    this.reports.record({ ...event, quantity }, 'gifts', quantity);
    this.reports.record({ ...event, quantity }, 'coins', coins);
    this.add(rule.id, { ...event, quantity, coins });
  }
  elapsed() {
    if (!this.current) return 0;
    return this.current.offset + (this.paused ? 0 : Math.max(0, this.now() - this.current.startedAt) / 1000);
  }
  setPaused(paused) {
    if (this.current) this.current.offset = this.elapsed();
    this.paused = !!paused;
    if (this.current) this.current.startedAt = this.now();
    this.change(); this.advance();
  }
  advance() {
    if (this.paused || this.current || this.renderers < 1 || !this.queue.length) return;
    this.queue = sortQueue(this.queue); const job = this.queue.shift();
    const wallIndex = job.recovered && Number.isInteger(job.wallIndex) ? job.wallIndex : this.wallSerial++;
    const activeRule=this.rule(job.ruleId);
    this.current = { ...job, wallIndex, totalDuration: actionSeconds(activeRule), hold: activeRule?.kind === 'statue' ? 1.2 : 0, startedAt: this.now(), offset: 0 };
    this.change();
  }
  finish(skipped = false) {
    if (!this.current) return;
    this.history.push({ ...this.current, completedSessionId: this.reports.current.id, completedAt: this.now(), skipped }); this.history = this.history.slice(-200);
    this.reports.record(this.current, skipped ? 'skipped' : 'completed');
    if (!skipped) this.stats.completed++;
    this.current = null; this.change(); this.advance();
  }
  cancelJobs(jobs) {
    for (const job of jobs) {
      this.history.push({ ...job, completedSessionId: this.reports.current.id, completedAt: this.now(), cancelled: true });
      this.reports.record(job, 'cancelled');
    }
    this.history = this.history.slice(-200);
  }
  remove(id) {
    const removed = this.queue.filter(job => job.id === id);
    this.queue = this.queue.filter(job => job.id !== id);
    if (removed.length) { this.cancelJobs(removed); this.change(); }
  }
  clearQueue() { this.cancelJobs(this.queue); this.queue = []; this.change(); }
  promote(id) {
    const job = this.queue.find(item => item.id === id); if (!job) throw new Error('This event is no longer waiting.');
    job.priority = Math.max(...this.queue.map(item => item.priority), 0);
    job.sequence = Math.min(...this.queue.map(item => item.sequence), 0) - 1;
    this.queue = sortQueue(this.queue); this.change();
  }
  startSession() { this.reports.start(); this.log('A new session report started. Queue and interaction records were preserved.'); }
  updateSettings(input) {
    const next = { ...this.settings };
    for (const key of ['showRules','showQueue','autoPlay','duckMusic']) if (typeof input[key] === 'boolean') next[key] = input[key];
    for (const [key, min, max] of [['volume',0,1],['musicVolume',0,1],['shake',0,1],['commentCooldown',0,600]]) {
      if (input[key] != null) { const value = Number(input[key]); if (!Number.isFinite(value)) throw new Error(`Value ${key} is invalid`); next[key] = Math.max(min, Math.min(max, value)); }
    }
    if (input.host != null) { const host = str(input.host).trim().replace(/^@/, ''); if (host && !/^[\w.]{1,40}$/.test(host)) throw new Error('TikTok usernames can contain letters, numbers, periods and underscores only.'); next.host = host; }
    if (['balanced','high','low'].includes(input.quality)) next.quality = input.quality;
    if (input.priorities) for (const rule of RULES) {
      const priority = Number(input.priorities[rule.id]);
      if (!Number.isInteger(priority) || priority < 0 || priority > 9999) throw new Error('Priority must be a whole number from 0 to 9999.');
    }
    if (input.enabledRules) for (const rule of RULES) {
      if (typeof input.enabledRules[rule.id] !== 'boolean') throw new Error('Each interaction must be enabled or disabled.');
    }
    this.settings = next;
    if (input.priorities) { this.priorities = { ...input.priorities }; this.queue.forEach(job => { job.priority = this.priorities[job.ruleId]; }); }
    if (input.enabledRules) this.enabledRules = Object.fromEntries(RULES.map(rule => [rule.id, input.enabledRules[rule.id]]));
    this.change();
  }
  setMusic(track) { this.music = { track, offset: 0, startedAt: this.now(), playing: false }; this.change(); }
  musicAction(action) {
    if(action==='remove'){this.setMusic(null);return;}
    if(!this.music.track)throw new Error('Choose a music file first.');
    const offset=this.music.offset+(this.music.playing?Math.max(0,this.now()-this.music.startedAt)/1000:0);
    this.music={...this.music,offset,startedAt:this.now(),playing:action==='play'};this.change();
  }
  tick() {
    const now = this.now();
    if(this.music.playing&&(!this.lastMusicSave||now-this.lastMusicSave>10000)){this.lastMusicSave=now;this.change();}
    for (const [key, combo] of this.combos) if (now - combo.at > 4000) this.closeCombo(key);
    if (this.current && !this.paused && this.elapsed() >= (this.current.totalDuration ?? this.current.duration + this.current.hold)) this.finish();
    this.advance();
    if (!this.lastPrune || now - this.lastPrune > 60000) {
      this.lastPrune = now;
      for (const [key, at] of this.seen) if (now - at > 24 * 3600000) this.seen.delete(key);
      for (const [key, record] of this.processedCombos) if (now - record.at > 24 * 3600000) this.processedCombos.delete(key);
      for (const [key, at] of this.cooldowns) if (now - at > 600000) this.cooldowns.delete(key);
    }
  }
}
