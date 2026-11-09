import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LiveEngine,normalizeEvent } from '../src/core.js';
import { sampleRitual,RITUALS } from '../public/js/rituals.js';
const defaults=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
const gift=(groupId,coins,quantity=1,ended=true)=>normalizeEvent('gift',{groupId,diamondCount:coins,giftType:1,repeatEnd:ended,repeatCount:quantity,giftName:'Quà thử',user:{userId:'donor',nickname:'Người ủng hộ',profilePictureUrl:'https://example.com/avatar.png'}},'room');

test('combo thanks is queued once after finalization with final coins, name and avatar',()=>{
  const e=new LiveEngine(defaults); e.setRenderer('screen');
  for(const count of [1,2,2,5]) e.ingest(gift('combo',2,count,false));
  assert.equal(e.current,null); assert.equal(e.queue.length,0);
  const end=gift('combo',2,5); e.ingest(end); const active=e.current;
  assert.equal(active.thanks.coins,10); assert.equal(active.thanks.quantity,5);
  assert.equal(active.thanks.nickname,'Người ủng hộ'); assert.equal(active.thanks.avatar,'https://example.com/avatar.png');
  assert.equal(active.duration,3000+RITUALS.prayer.duration);
  assert.equal(sampleRitual(active,2999).thanking,true); assert.equal(sampleRitual(active,3000).thanking,false);
  assert.equal(sampleRitual(active,3000).ritualTime,0);
  assert.equal(e.ingest(end).status,'duplicate'); assert.equal(e.queue.length,0); assert.equal(e.current.id,active.id);
  e.ingest(gift('second',3)); assert.equal(e.current.id,active.id);
  assert.equal(e.queue[0].thanks.coins,3); assert.equal(e.stats.totalCoins,13);
  e.control('skip'); assert.equal(e.current.thanks.coins,3);
});

test('fortune thank-you delays the whole ritual and narration without shortening its tail',()=>{
  const e=new LiveEngine(defaults); e.ingest(gift('fortune',1)); const job=e.queue[0];
  assert.equal(job.fortune.readAt,7200);
  assert.equal(sampleRitual(job,job.fortune.readAt-1).card,false);
  assert.equal(sampleRitual(job,job.fortune.readAt).card,true);
  assert.equal(job.duration,job.fortune.readAt+Math.ceil(job.fortune.audio.duration*1000)+1500);
  assert.equal(sampleRitual(job,job.duration).opacity,0);
});

test('free participation has no donation thanks or extra delay',()=>{
  const e=new LiveEngine(defaults);
  e.ingest(normalizeEvent('comment',{eventId:'chant',user:{id:'viewer'},content:'nam mo a di da phat'},'room'));
  assert.equal(e.queue[0].thanks,undefined); assert.equal(e.queue[0].duration,RITUALS.incense.duration);
  assert.equal(sampleRitual(e.queue[0],0).thanking,false);
});
