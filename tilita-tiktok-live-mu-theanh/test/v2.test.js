import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LiveEngine, normalizeEvent, validateConfig, migrateConfig } from '../src/core.js';
import { GIFT_TIERS, HALL_LAYOUT } from '../public/js/experience.js';
import { FAN_CARDS, loadFanCardAudio } from '../src/fan-cards.js';
import { sampleAction } from '../public/js/actions.js';
import { WebcastLikeMessage } from 'tiktok-live-proto/v3';
const defaults = JSON.parse(fs.readFileSync(new URL('../config/default.json', import.meta.url)));
defaults.participation.likesEnabled=true;
const like = (id, count, eventId = randomUUID()) => normalizeEvent('like', { user: { id, nickname: id }, likeCount: count, totalLikeCount: 999999, eventId }, 'room-1', true);
const chat = (id, content) => normalizeEvent('comment', { user: { id, nickname: id }, content, eventId: randomUUID() }, 'room-1', true);
const gift = (coins, overrides = {}) => normalizeEvent('gift', { user: { id: randomUUID(), nickname: 'Người tặng' }, diamondCount: coins, giftName: 'Rose', giftId: '5655', giftType: 1, groupId: randomUUID(), repeatEnd: true, ...overrides }, 'room-1', true);

test('every boundary uses the same published tier list, including Rose and combo total', () => {
  const e = new LiveEngine(defaults);
  for (const [coins, expected] of [[1,'fan-card'],[2,'fan-card'],[3,'cave-door'],[4,'cave-door'],[5,'antony'],[9,'antony'],[10,'siuuu'],[29,'siuuu'],[30,'ole'],[99,'ole'],[100,'fergie'],[499,'fergie'],[500,'ggmu']]) {
    assert.equal(e.ingest(gift(coins)).status, 'queued'); assert.equal(e.queue.at(-1)?.id === undefined, false);
    const job = e.queue.find(j => j.coins === coins); assert.equal(job.action, expected);
    assert.equal(GIFT_TIERS.findLast(t => coins >= t.min).action, expected);
  }
  e.ingest(gift(1, { repeatCount: 100 })); assert.equal(e.queue.find(j => j.quantity === 100).action, 'fergie');
});
test('ten likes qualify once; a large packet never creates multiple processions',()=>{
 const e=new LiveEngine(defaults);assert.equal(e.ingest(like('a',4)).status,'like-progress');assert.equal(e.queue.length,0);
 const last=like('a',6);assert.equal(e.ingest(last).status,'queued');assert.equal(e.ingest(last).status,'duplicate');
 assert.equal(e.ingest(like('b',50)).status,'queued');assert.equal(e.queue.length,2);assert.ok(e.queue.every(j=>j.free&&j.action==='visit'&&j.priority===0));
 assert.equal(e.stats.totalCoins,0);assert.equal(e.snapshot().hall.leaderboard.length,0);assert.equal(e.snapshot().hall.seats.filter(Boolean).length,2);
});
test('ten likes and folded entry phrase share pending restriction and cooldown',()=>{
 let now=100000;const e=new LiveEngine(defaults,undefined,()=>now);
 assert.equal(e.ingest(chat('a','  VAO   HANG  ')).status,'queued');assert.equal(e.ingest(like('a',50)).status,'already-queued');
 e.setRenderer('screen');assert.equal(e.ingest(like('a',50)).status,'cooldown');e.finish(e.current.id);now+=31000;
 assert.equal(e.ingest(like('a',4)).status,'like-progress');assert.equal(e.ingest(like('a',6)).status,'queued');
 assert.equal(e.ingest(chat('b','vào hang')).status,'queued');assert.equal(e.ingest(chat('c','bình luận bất kỳ')).status,'entry-required');
});
test('per-user likes never use total room likes and respect stop-accept / missing identity', () => {
  const e = new LiveEngine(defaults);
  assert.equal(e.ingest(like('a',0)).status,'invalid-like'); assert.equal(e.ingest(like('',5)).status,'invalid-like');
  e.control('stop-accept'); assert.equal(e.ingest(like('a',10)).status,'not-accepting'); assert.equal(e.queue.length,0);
});
test('same-room reconnect preserves partial hearts; a new room resets them',()=>{
 const e=new LiveEngine(defaults);e.beginSession('room-1');assert.equal(e.ingest(like('a',4)).status,'like-progress');e.beginSession('room-1');assert.equal(e.ingest(like('a',6)).status,'queued');
 e.beginSession('room-2');assert.equal(e.likeCounts.size,0);assert.equal(e.cooldowns.size,0);
});
test('87 coordinates reserve top 3, next 4 and eighty tightly packed fans',()=>{
 assert.equal(HALL_LAYOUT.length,87);assert.equal(new Set(HALL_LAYOUT.map(p=>p.x+':'+p.y)).size,87);
 assert.equal(HALL_LAYOUT.filter(p=>p.row===0).length,3);assert.equal(HALL_LAYOUT.filter(p=>p.row===1).length,4);
 for(let row=2;row<=9;row++){assert.equal(HALL_LAYOUT.filter(p=>p.row===row&&p.side==='left').length,5);assert.equal(HALL_LAYOUT.filter(p=>p.row===row&&p.side==='right').length,5);}
 assert.ok(HALL_LAYOUT.slice(7).every(p=>p.x<=390||p.x>=660));assert.ok(HALL_LAYOUT.every(p=>p.y<=1760&&p.x<980));
});
test('migration preserves channel, sound and comment rules while removing gift override', () => {
  const old = {...structuredClone(defaults),sceneVersion:undefined,username:'saved',musicVolume:.1,rules:[{id:'custom',type:'comment',enabled:true,match:'an lành',action:'siuuu',priority:0},{id:'rose',type:'gift',enabled:true,match:'Rose',action:'antony',priority:10}]};
  const c = validateConfig(migrateConfig(old)); assert.equal(c.username,'saved'); assert.equal(c.musicVolume,.1); assert.equal(c.rules[0].match,'an lành');
  assert.equal(c.rules.find(r => r.type === 'gift').action,'auto'); assert.equal(c.sceneVersion,'mu-cave-v1');
});
test('99 distinct fortunes: backend chooses once, timeline waits for narration and ends after 1.5s', () => {
  assert.equal(FAN_CARDS.length,99);
  for (const key of ['id','title','message']) assert.equal(new Set(FAN_CARDS.map(f => f[key])).size,99, `Duplicate ${key}`);
  assert.deepEqual(FAN_CARDS.map(f => f.number).sort((a,b) => a-b), Array.from({length:99},(_,i) => i+1));
  for (const f of FAN_CARDS) { assert.ok(f.title.length<=60 && f.message.length<=240); }
  const e = new LiveEngine(defaults); e.ingest(gift(1)); const job = e.queue[0];
  const id = job.fanCard.id; assert.equal(e.snapshot().queue[0].fanCard.id,id);
  assert.equal(sampleAction(job,job.fanCard.readAt-1).card,false); assert.equal(sampleAction(job,job.fanCard.readAt).card,true);
  assert.ok(job.duration >= 3500); assert.equal(sampleAction(job,job.duration).opacity,0);
  if(job.fanCard.audio) assert.equal(job.duration,job.fanCard.readAt+Math.ceil(job.fanCard.audio.duration*1000)+1500+(job.cueDuration||0)+(job.returnDuration||0));
});
test('audio preflight validates complete, versioned local catalog', () => {
  const catalog = loadFanCardAudio(); assert.equal(catalog.total,99); assert.equal(catalog.ready,99); assert.deepEqual(catalog.missing,[]);
  for(const f of catalog.items) { assert.ok(f.audio.url.startsWith('/assets/fan-cards/')); assert.ok(f.audio.duration>=Math.max(3,f.readText.split(/\s+/).length*.11) && f.audio.duration<=32, `Incomplete narration: ${f.id}`); }
});

test('real likes and chant take seats and stay after the ritual, without becoming donors', () => {
  const e = new LiveEngine(defaults);
  assert.equal(e.ingest({...like('a',10),simulated:false}).seatStatus,'seated');
  assert.equal(e.ingest({...chat('b','vào hang'),simulated:false}).seatStatus,'seated');
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
  e.ingest({...like('a',10),simulated:false}); e.ingest({...chat('b','vào hang'),simulated:false});
  e.ingest({...gift(100,{user:{id:'b',nickname:'Người B'}}),simulated:false});
  const hall = e.snapshot().hall;
  assert.equal(hall.seats.filter(Boolean).length,2); assert.equal(hall.seats[0].id,'b'); assert.equal(hall.seats[0].kind,'contributor');
  assert.equal(hall.seats.filter(user => user?.id === 'b').length,1); assert.equal(hall.leaderboard[0].coins,100);
});
test('a full display keeps top four priority and admits another participant to rotation', () => {
  const e = new LiveEngine(defaults);
  for(let i=0;i<100;i++) e.ingest({...gift(1,{user:{id:'donor-'+i,nickname:'Donor '+i}}),simulated:false});
  assert.equal(e.ingest({...like('guest',10),simulated:false}).seatStatus,'rotating');
  assert.equal(e.snapshot().hall.seats.length,87); assert.equal(e.snapshot().hall.waitingParticipants,0);
  assert.ok(e.snapshot().hall.seats.filter(Boolean).every(user => user.kind === 'contributor'));
});
test('offline seating simulations replace the fixture, while connected simulations leave real seating alone', () => {
  const e = new LiveEngine(defaults); e.showHallDemo(); e.ingest(like('demo',10));
  assert.equal(e.snapshot().hall.mode,'demo'); assert.deepEqual(e.snapshot().hall.seats.filter(Boolean).map(user => user.id),['demo']);
  assert.deepEqual(e.stats.session.participants,{});
  e.ingest({...chat('real','vào hang'),simulated:false});
  e.ingest({...like('ignored-demo',10),seatSimulation:false});
  assert.equal(e.snapshot().hall.mode,'live'); assert.deepEqual(e.snapshot().hall.seats.filter(Boolean).map(user => user.id),['real']);
});

test('actual v3 decoded per-user counts accumulate to ten, including zero placeholder identifiers',()=>{
 const e=new LiveEngine(defaults);const packet=count=>{const raw=WebcastLikeMessage.decode(Uint8Array.of(16,count));assert.equal(Object.hasOwn(raw,'likeCount'),false);return normalizeEvent('like',{...raw,user:{id:'0',uniqueId:'real-viewer',nickname:'Người xem thật'},common:{msgId:'0',roomId:'0'}},'room-real');};
 const first=packet(4);assert.equal(first.likeCount,4);assert.equal(first.userId,'real-viewer');assert.equal(first.eventId,'');assert.equal(first.room,'room-real');assert.equal(e.ingest(first).status,'like-progress');assert.equal(e.snapshot().participation.lastLike.progress,4);
 assert.equal(e.ingest(packet(6)).seatStatus,'seated');assert.equal(e.snapshot().hall.seats.filter(Boolean)[0].id,'real-viewer');assert.equal(e.queue.length,1);assert.equal(e.snapshot().participation.receivedLikes,10);assert.equal(e.snapshot().participation.receivedLikeEvents,2);
});
test('v3 total never substitutes for a user count; real message IDs still deduplicate', () => {
  const e = new LiveEngine(defaults);
  const missing = normalizeEvent('like',{total:'9000000',totalLikeCount:9000000,user:{id:'real'},common:{msgId:'0'}},'room-real');
  assert.equal(e.ingest(missing).status,'invalid-like'); assert.equal(e.queue.length,0);
  const event = normalizeEvent('like',{count:10,total:'9000000',user:{id:'real'},common:{msgId:'123'}},'room-real');
  assert.equal(e.ingest(event).seatStatus,'seated'); assert.equal(e.ingest(event).status,'duplicate');
  assert.equal(e.snapshot().participation.receivedLikes,10); assert.equal(e.queue.length,1);
});
test('legacy counts remain supported, simulated likes do not impersonate real diagnostics', () => {
  const e = new LiveEngine(defaults); e.ingest(like('sample',5));
  assert.equal(e.snapshot().participation.receivedLikeEvents,0); assert.equal(e.snapshot().participation.lastLike,null);
  const event = normalizeEvent('like',{likeCount:10,user:{id:'legacy'},eventId:'0',common:{msgId:'456'}},'room-real');
  assert.equal(event.eventId,'456'); assert.equal(e.ingest(event).seatStatus,'seated');
  assert.equal(e.snapshot().participation.receivedLikes,10);
});
