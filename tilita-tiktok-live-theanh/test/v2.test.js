import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LiveEngine, normalizeEvent, validateConfig, migrateConfig } from '../src/core.js';
import { GIFT_TIERS, HALL_LAYOUT } from '../public/js/experience.js';
import { FORTUNES, loadFortuneAudio } from '../src/fortunes.js';
import { sampleRitual } from '../public/js/rituals.js';
import { WebcastLikeMessage } from 'tiktok-live-proto/v3';
const defaults = JSON.parse(fs.readFileSync(new URL('../config/default.json', import.meta.url)));
const like = (id, count, eventId = randomUUID()) => normalizeEvent('like', { user: { id, nickname: id }, likeCount: count, totalLikeCount: 999999, eventId }, 'room-1', true);
const chat = (id, content) => normalizeEvent('comment', { user: { id, nickname: id }, content, eventId: randomUUID() }, 'room-1', true);
const gift = (coins, overrides = {}) => normalizeEvent('gift', { user: { id: randomUUID(), nickname: 'Người tặng' }, diamondCount: coins, giftName: 'Rose', giftId: '5655', giftType: 1, groupId: randomUUID(), repeatEnd: true, ...overrides }, 'room-1', true);

test('every boundary uses the same published tier list, including Rose and combo total', () => {
  const e = new LiveEngine(defaults);
  for (const [coins, expected] of [[1,'fortune'],[2,'fortune'],[3,'incense'],[4,'incense'],[5,'lotus'],[9,'lotus'],[10,'prayer'],[29,'prayer'],[30,'fruit'],[99,'fruit'],[100,'bell'],[499,'bell'],[500,'grand']]) {
    assert.equal(e.ingest(gift(coins)).status, 'queued'); assert.equal(e.queue.at(-1)?.id === undefined, false);
    const job = e.queue.find(j => j.coins === coins); assert.equal(job.action, expected);
    assert.equal(GIFT_TIERS.findLast(t => coins >= t.min).action, expected);
  }
  e.ingest(gift(1, { repeatCount: 100 })); assert.equal(e.queue.find(j => j.quantity === 100).action, 'bell');
});
test('any positive like admits immediately; batched likes and duplicates do not repeat rituals', () => {
  const e = new LiveEngine(defaults);
  assert.equal(e.ingest(like('a',2)).status, 'queued'); assert.equal(e.queue.length,1);
  const last = like('a',3); assert.equal(e.ingest(last).status,'already-queued'); assert.equal(e.ingest(last).status,'duplicate');
  assert.equal(e.ingest(like('b',50)).status,'queued'); assert.equal(e.queue.length,2);
  assert.ok(e.queue.every(j => j.free && j.action === 'incense' && j.priority === 0));
  assert.equal(e.stats.totalCoins,0); assert.equal(e.snapshot().hall.leaderboard.length,0);
  assert.equal(e.snapshot().hall.seats.filter(Boolean).length,2); assert.ok(e.snapshot().hall.seats.filter(Boolean).every(user => user.kind === 'participant'));
});
test('likes and folded chant share pending restriction and cooldown, with no banked likes', () => {
  let now = 100000; const e = new LiveEngine(defaults, undefined, () => now);
  assert.equal(e.ingest(chat('a','  NAM   MO A DI DA PHAT  ')).status,'queued');
  assert.equal(e.ingest(like('a',50)).status,'already-queued');
  e.setRenderer('screen'); assert.equal(e.ingest(like('a',50)).status,'cooldown'); e.finish(e.current.id);
  now += 31000;
  assert.equal(e.ingest(like('a',2)).status,'queued'); assert.equal(e.ingest(like('a',3)).status,'cooldown');
  assert.equal(e.ingest(chat('b','Nam mô A Di Đà Phật')).status,'queued');
  assert.equal(e.ingest(chat('c','nam mo a di da phatabc')).status,'queued');
});
test('per-user likes never use total room likes and respect stop-accept / missing identity', () => {
  const e = new LiveEngine(defaults);
  assert.equal(e.ingest(like('a',0)).status,'invalid-like'); assert.equal(e.ingest(like('',5)).status,'invalid-like');
  e.control('stop-accept'); assert.equal(e.ingest(like('a',5)).status,'not-accepting'); assert.equal(e.queue.length,0);
});
test('same-room reconnect retains membership and pending ritual; new room resets participation', () => {
  const e = new LiveEngine(defaults); e.beginSession('room-1'); e.ingest(like('a',2));
  e.beginSession('room-1'); assert.equal(e.ingest(like('a',3)).status,'already-queued');
  e.beginSession('room-2'); assert.equal(e.likeCounts.size,0); assert.equal(e.cooldowns.size,0);
});
test('28 coordinates are unique, balanced and separated from aisle and comment zone', () => {
  assert.equal(HALL_LAYOUT.length,28); assert.equal(new Set(HALL_LAYOUT.map(s => `${s.x}:${s.y}`)).size,28);
  assert.equal(HALL_LAYOUT.filter(s=>s.row===0).length,4); for (let row=1; row<=4; row++) { assert.equal(HALL_LAYOUT.filter(s => s.row === row && s.side === 'left').length,3); assert.equal(HALL_LAYOUT.filter(s => s.row === row && s.side === 'right').length,3); }
  assert.ok(HALL_LAYOUT.every(s => s.y < 1600 && (s.x < 400 || s.x > 650) && s.x < 930));
});
test('migration preserves channel, sound and comment rules while removing gift override', () => {
  const old = {...structuredClone(defaults),sceneVersion:undefined,username:'saved',musicVolume:.1,rules:[{id:'custom',type:'comment',enabled:true,match:'an lành',action:'prayer',priority:0},{id:'rose',type:'gift',enabled:true,match:'Rose',action:'lotus',priority:10}]};
  const c = validateConfig(migrateConfig(old)); assert.equal(c.username,'saved'); assert.equal(c.musicVolume,.1); assert.equal(c.rules[0].match,'an lành');
  assert.equal(c.rules.find(r => r.type === 'gift').action,'auto'); assert.equal(c.sceneVersion,'wooden-temple-v2');
});
test('99 distinct fortunes: backend chooses once, timeline waits for narration and ends after 1.5s', () => {
  assert.equal(FORTUNES.length,99);
  for (const key of ['id','title','text','message']) assert.equal(new Set(FORTUNES.map(f => f[key])).size,99, `Duplicate ${key}`);
  assert.deepEqual(FORTUNES.map(f => f.number).sort((a,b) => a-b), Array.from({length:99},(_,i) => i+1));
  for (const f of FORTUNES) { assert.equal(f.text.split('\n').length,2); assert.ok(f.title.length<=30 && f.message.length<=240); }
  const e = new LiveEngine(defaults); e.ingest(gift(1)); const job = e.queue[0];
  const id = job.fortune.id; assert.equal(e.snapshot().queue[0].fortune.id,id);
  assert.equal(sampleRitual(job,job.fortune.readAt-1).card,false); assert.equal(sampleRitual(job,job.fortune.readAt).card,true);
  assert.ok(job.duration >= 5700); assert.equal(sampleRitual(job,job.duration).opacity,0);
  if(job.fortune.audio) assert.equal(job.duration,job.fortune.readAt+Math.ceil(job.fortune.audio.duration*1000)+1500);
});
test('audio preflight validates complete, versioned local catalog', () => {
  const catalog = loadFortuneAudio(); assert.equal(catalog.total,99); assert.equal(catalog.ready,99); assert.deepEqual(catalog.missing,[]);
  for(const f of catalog.items) { assert.ok(f.audio.url.startsWith('/assets/fortunes/')); assert.ok(f.audio.duration>=Math.max(3,f.readText.split(/\s+/).length*.11) && f.audio.duration<=32, `Incomplete narration: ${f.id}`); }
});

test('real likes and chant take seats and stay after the ritual, without becoming donors', () => {
  const e = new LiveEngine(defaults);
  assert.equal(e.ingest({...like('a',5),simulated:false}).seatStatus,'seated');
  assert.equal(e.ingest({...chat('b','Nam mô A Di Đà Phật'),simulated:false}).seatStatus,'seated');
  e.setRenderer('screen'); e.finish(e.current.id);
  const hall = e.snapshot().hall;
  assert.equal(hall.mode,'live'); assert.deepEqual(hall.seats.filter(Boolean).map(user => user.id),['a','b']);
  assert.equal(hall.leaderboard.length,0); assert.equal(e.stats.totalCoins,0); assert.equal(e.stats.totalGifts,0);
  const restored = new LiveEngine(defaults,JSON.parse(JSON.stringify(e.stats)));
  restored.beginSession('room-1'); assert.equal(restored.snapshot().hall.seats.filter(Boolean).length,2);
  restored.beginSession('room-2'); assert.equal(restored.snapshot().hall.seats.filter(Boolean).length,0);
});
test('a seated participant donating becomes one contributor, without a duplicate chair', () => {
  const e = new LiveEngine(defaults);
  e.ingest({...like('a',5),simulated:false}); e.ingest({...chat('b','nam mo a di da phat'),simulated:false});
  e.ingest({...gift(100,{user:{id:'b',nickname:'Người B'}}),simulated:false});
  const hall = e.snapshot().hall;
  assert.equal(hall.seats.filter(Boolean).length,2); assert.equal(hall.seats[0].id,'b'); assert.equal(hall.seats[0].kind,'contributor');
  assert.equal(hall.seats.filter(user => user?.id === 'b').length,1); assert.equal(hall.leaderboard[0].coins,100);
});
test('a full display keeps top four priority and admits another participant to rotation', () => {
  const e = new LiveEngine(defaults);
  for(let i=0;i<40;i++) e.ingest({...gift(1,{user:{id:'donor-'+i,nickname:'Donor '+i}}),simulated:false});
  assert.equal(e.ingest({...like('guest',5),simulated:false}).seatStatus,'rotating');
  assert.equal(e.snapshot().hall.seats.length,28); assert.equal(e.snapshot().hall.waitingParticipants,0);
  assert.ok(e.snapshot().hall.seats.filter(Boolean).every(user => user.kind === 'contributor'));
});
test('offline seating simulations replace the fixture, while connected simulations leave real seating alone', () => {
  const e = new LiveEngine(defaults); e.showHallDemo(); e.ingest(like('demo',5));
  assert.equal(e.snapshot().hall.mode,'demo'); assert.deepEqual(e.snapshot().hall.seats.filter(Boolean).map(user => user.id),['demo']);
  assert.deepEqual(e.stats.session.participants,{});
  e.ingest({...chat('real','nam mo a di da phat'),simulated:false});
  e.ingest({...like('ignored-demo',5),seatSimulation:false});
  assert.equal(e.snapshot().hall.mode,'live'); assert.deepEqual(e.snapshot().hall.seats.filter(Boolean).map(user => user.id),['real']);
});

test('actual v3 decoded count packets seat immediately, including zero placeholder IDs', () => {
  const e = new LiveEngine(defaults);
  const packet = count => {
    // Field 2 is decoded by the installed connector protocol, not our simulator schema.
    const raw = WebcastLikeMessage.decode(Uint8Array.of(16,count));
    assert.equal(Object.hasOwn(raw,'likeCount'),false);
    return normalizeEvent('like',{...raw,user:{id:'0',uniqueId:'real-viewer',nickname:'Người xem thật'},common:{msgId:'0',roomId:'0'}},'room-real');
  };
  const first = packet(2); assert.equal(first.likeCount,2); assert.equal(first.userId,'real-viewer'); assert.equal(first.eventId,''); assert.equal(first.room,'room-real');
  assert.equal(e.ingest(first).seatStatus,'seated'); assert.equal(e.snapshot().participation.lastLike.progress,1);
  assert.equal(e.ingest(packet(3)).seatStatus,'seated');
  assert.equal(e.snapshot().hall.seats.filter(Boolean)[0].id,'real-viewer'); assert.equal(e.queue.length,1);
  assert.equal(e.snapshot().participation.receivedLikes,5); assert.equal(e.snapshot().participation.receivedLikeEvents,2);
});
test('v3 total never substitutes for a user count; real message IDs still deduplicate', () => {
  const e = new LiveEngine(defaults);
  const missing = normalizeEvent('like',{total:'9000000',totalLikeCount:9000000,user:{id:'real'},common:{msgId:'0'}},'room-real');
  assert.equal(e.ingest(missing).status,'invalid-like'); assert.equal(e.queue.length,0);
  const event = normalizeEvent('like',{count:5,total:'9000000',user:{id:'real'},common:{msgId:'123'}},'room-real');
  assert.equal(e.ingest(event).seatStatus,'seated'); assert.equal(e.ingest(event).status,'duplicate');
  assert.equal(e.snapshot().participation.receivedLikes,5); assert.equal(e.queue.length,1);
});
test('legacy counts remain supported, simulated likes do not impersonate real diagnostics', () => {
  const e = new LiveEngine(defaults); e.ingest(like('sample',5));
  assert.equal(e.snapshot().participation.receivedLikeEvents,0); assert.equal(e.snapshot().participation.lastLike,null);
  const event = normalizeEvent('like',{likeCount:5,user:{id:'legacy'},eventId:'0',common:{msgId:'456'}},'room-real');
  assert.equal(event.eventId,'456'); assert.equal(e.ingest(event).seatStatus,'seated');
  assert.equal(e.snapshot().participation.receivedLikes,5);
});
