import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { LiveEngine, normalizeEvent, validateConfig } from '../src/core.js';
import { JsonStore } from '../src/store.js';
const defaults = JSON.parse(fs.readFileSync(new URL('../config/default.json', import.meta.url)));
defaults.participation.likesEnabled=true;
const engine = () => new LiveEngine(defaults);
const gift = (overrides = {}, simulated = false) => normalizeEvent('gift', { user: { userId: '1', nickname: 'Minh' }, giftId: '5655', giftName: 'Rose', giftType: 1, repeatEnd: true, repeatCount: 1, diamondCount: 1, groupId: randomUUID(), ...overrides }, 'room', simulated);
const chat = (name, content = 'vào hang') => normalizeEvent('comment', { user: { userId: name, nickname: name }, eventId: randomUUID(), content }, 'room', true);

test('combo 1→2→2→5→end creates one x5 job; duplicated final not counted', () => {
  const e = engine(), groupId = randomUUID();
  for (const repeatCount of [1, 2, 2, 5]) assert.equal(e.ingest(gift({ groupId, repeatCount, repeatEnd: false })).status, 'combo');
  assert.equal(e.queue.length, 0); e.ingest(gift({ groupId, repeatCount: 5 })); e.ingest(gift({ groupId, repeatCount: 5 }));
  assert.equal(e.queue.length, 1); assert.equal(e.queue[0].quantity, 5); assert.equal(e.stats.totalGifts, 5); assert.equal(e.stats.totalCoins, 5);
});
test('two people sending same gift have separate combo keys', () => {
  const e = engine(); e.ingest(gift({ groupId: 'same' })); e.ingest(gift({ groupId: 'same', user: { userId: '2', nickname: 'An' } })); assert.equal(e.queue.length, 2);
});
test('connector v3 schema: gift.type, common.msgId, avatarThumb and zero group', () => {
  const e = engine();
  const payload = { common: { msgId: '101', roomId: '1000' }, giftId: '900', groupId: '0', repeatEnd: 0, repeatCount: 1, user: { id: '123', nickname: 'Viewer', avatarThumb: { urlList: ['https://example.com/avatar.jpg'] } }, gift: { id: '900', type: 2, name: 'Gift', diamondCount: 5 } };
  const normalized = normalizeEvent('gift', payload);
  assert.equal(normalized.room, '1000'); assert.equal(normalized.avatar, 'https://example.com/avatar.jpg');
  e.ingest(normalized); e.ingest(normalizeEvent('gift', { ...payload, common: { ...payload.common, msgId: '102' } }));
  assert.equal(e.queue.length, 2); assert.equal(e.stats.totalCoins, 10); assert.equal(e.queue[0].action, 'antony');
});
test('nonstreak gift processes without repeatEnd; unknown value stays zero', () => {
  const e = engine(); const result = e.ingest(gift({ giftType: 2, repeatEnd: false, diamondCount: undefined })); assert.equal(e.stats.totalCoins, 0); assert.equal(e.stats.totalGifts, 1); assert.equal(e.queue.length, 0); assert.equal(result.status, 'unknown-value');
});
test('no message identity is rejected instead of counting reconnect duplicates', () => {
  const e = engine(); assert.equal(e.ingest(gift({ groupId: '' })).status, 'missing-id'); assert.equal(e.stats.totalGifts, 0);
});
test('configured keywords are folded whole phrases; ordinary chat never queues a show',()=>{
 const e=engine();for(const id of ['1','2','3'])e.seatParticipant(chat(id,'vào hang'));assert.equal(e.ingest(chat('1','CO VU cho anh em')).status,'queued');assert.equal(e.queue[0].action,'cheer');
 assert.equal(e.ingest(chat('2','co vuabc')).status,'joined');assert.equal(e.ingest(chat('3','VAO HANG')).status,'queued');assert.equal(e.queue[1].action,'visit');
});
test('comment cooldown and one pending comment per user', () => {
  const e = engine(); e.ingest(chat('1')); assert.equal(e.ingest(chat('1')).status, 'already-queued');
  e.setRenderer('screen'); assert.equal(e.ingest(chat('1')).status, 'cooldown');
});
test('gift moves before pending comment without interrupting active job', () => {
  const e = engine(); e.setRenderer('screen'); e.ingest(chat('A')); const active = e.current.id;
  e.ingest(chat('B')); e.ingest(gift({}, true)); assert.equal(e.current.id, active); assert.equal(e.queue[0].kind, 'gift');
  e.finish(active); assert.equal(e.current.kind, 'gift'); assert.equal(e.queue[0].nickname, 'B');
});
test('normal queue gets a turn after five priority jobs', () => {
  const e = engine(); for (let i = 0; i < 7; i++) e.ingest(gift({}, true)); e.ingest(chat('normal')); e.setRenderer('screen');
  for (let i = 0; i < 5; i++) { assert.equal(e.current.kind, 'gift'); e.finish(e.current.id); }
  assert.equal(e.current.nickname, 'normal');
});
test('paused engine still accepts, stop-accept records real gifts without jobs', () => {
  const e = engine(); e.setRenderer('screen'); e.control('pause'); e.ingest(gift({}, true)); assert.equal(e.current, null);
  e.control('resume'); assert.ok(e.current); e.control('stop-accept'); const count = e.queue.length;
  assert.equal(e.ingest(gift()).status, 'not-accepting'); assert.equal(e.queue.length, count); assert.equal(e.stats.totalGifts, 1);
});
test('simulator is isolated from real statistics', () => { const e = engine(); e.ingest(gift({}, true)); assert.equal(e.stats.totalCoins, 0); assert.deepEqual(e.stats.users, {}); });
test('full queue preserves gift statistics and reports rejection', () => {
  const e = engine(); e.config.queueLimit = 1; e.ingest(chat('a')); assert.equal(e.ingest(gift()).status, 'full'); assert.equal(e.stats.totalGifts, 1);
});
test('renderer disconnect marks interruption and never replays old job', () => {
  const e = engine(); e.setRenderer('a'); e.ingest(chat('a')); e.ingest(chat('b')); const id = e.current.id;
  e.setRenderer(null); assert.equal(e.current, null); assert.equal(e.history[0].status, 'interrupted'); assert.equal(e.queue.length, 1);
  assert.equal(e.finish(id), false); e.setRenderer('b'); assert.equal(e.current.nickname, 'b');
});
test('watchdog releases frozen renderer and missing combo does not invent a gift', () => {
  let now = 100000; const e = new LiveEngine(defaults, undefined, () => now); e.setRenderer('a'); e.ingest(chat('a'));
  now += 14000; e.tick(); assert.equal(e.current, null); assert.equal(e.history[0].status, 'timeout');
  e.ingest(gift({ repeatEnd: false })); now += 121000; e.tick(); assert.equal(e.stats.totalGifts, 0); assert.equal(e.combos.size, 0);
});
test('V2 prevents a gift override from contradicting the permanent board', () => {
  const config = structuredClone(defaults); config.rules.unshift({ id: 'id-specific', type: 'gift', enabled: true, match: 'id:5655', action: 'ggmu', priority: 15 });
  const e = new LiveEngine(config); e.ingest(gift()); assert.equal(e.queue[0].action, 'fan-card'); assert.equal(e.config.rules.filter(r => r.type === 'gift').length, 1);
});
test('unsafe avatar URL is stripped; bad config is rejected', () => {
  assert.equal(normalizeEvent('comment', { user: { profilePictureUrl: 'javascript:alert(1)' } }).avatar, '');
  assert.throws(() => validateConfig({ ...defaults, volume: 99 })); assert.throws(() => validateConfig({ ...defaults, musicFile: '../../x' }));
});
test('malformed data file is not overwritten and good data survives reload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tilita-store-'));
  try { const store = new JsonStore(dir); store.write('good', { saved: true }); assert.deepEqual(new JsonStore(dir).read('good', {}), { saved: true });
    fs.writeFileSync(path.join(dir, 'bad.json'), '{invalid'); assert.deepEqual(store.read('bad', { fallback: 1 }), { fallback: 1 }); assert.throws(() => store.write('bad', {})); assert.equal(fs.readFileSync(path.join(dir, 'bad.json'), 'utf8'), '{invalid');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
