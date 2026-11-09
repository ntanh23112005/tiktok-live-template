import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LiveEngine,normalizeEvent } from '../src/core.js';
import { sampleAction,SCENES } from '../public/js/actions.js';
import {getSoundLibrary} from '../src/sounds.js';
const defaults=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
defaults.participation.likesEnabled=true;
const gift=(groupId,coins,quantity=1,ended=true)=>normalizeEvent('gift',{groupId,diamondCount:coins,giftType:1,repeatEnd:ended,repeatCount:quantity,giftName:'Quà thử',user:{userId:'donor',nickname:'Người ủng hộ',profilePictureUrl:'https://example.com/avatar.png'}},'room');

test('combo thanks is queued once after finalization with final coins, name and avatar',()=>{
  const e=new LiveEngine(defaults); e.setRenderer('screen');
  for(const count of [1,2,2,5]) e.ingest(gift('combo',2,count,false));
  assert.equal(e.current,null); assert.equal(e.queue.length,0);
  const end=gift('combo',2,5); e.ingest(end); const active=e.current;
  assert.equal(active.thanks.coins,10); assert.equal(active.thanks.quantity,5);
  assert.equal(active.thanks.nickname,'Người ủng hộ'); assert.equal(active.thanks.avatar,'https://example.com/avatar.png');
  assert.equal(active.duration,8500+SCENES.siuuu.duration);
  assert.equal(sampleAction(active,2999).thanking,true); assert.equal(sampleAction(active,3000).thanking,false);
  assert.equal(sampleAction(active,3000).t,0);
  assert.equal(e.ingest(end).status,'duplicate'); assert.equal(e.queue.length,0); assert.equal(e.current.id,active.id);
  e.ingest(gift('second',3)); assert.equal(e.current.id,active.id);
  assert.equal(e.queue[0].thanks.coins,3); assert.equal(e.stats.totalCoins,13);
  e.control('skip'); assert.equal(e.current.thanks.coins,3);
});

test('fortune thank-you delays the whole ritual and narration without shortening its tail',()=>{
  const e=new LiveEngine(defaults); e.ingest(gift('fan-card',1)); const job=e.queue[0];
  assert.equal(job.fanCard.readAt,9000);
  assert.equal(sampleAction(job,job.fanCard.readAt-1).card,false);
  assert.equal(sampleAction(job,job.fanCard.readAt).card,true);
  assert.equal(job.cue.readAt,job.fanCard.readAt+Math.ceil(job.fanCard.audio.duration*1000)+1500);
  assert.equal(job.duration,job.cue.readAt+job.cueDuration+(job.returnDuration||0));
  assert.equal(sampleAction(job,job.duration).opacity,0);
});

test('free participation has no donation thanks or extra delay',()=>{
  const e=new LiveEngine(defaults);
  e.ingest(normalizeEvent('comment',{eventId:'chant',user:{id:'viewer'},content:'vào hang'},'room'));
  assert.equal(e.queue[0].thanks,undefined); assert.equal(e.queue[0].duration,5500+Math.max(SCENES.visit.duration,Math.ceil(getSoundLibrary().byId.applause.duration*1000)));
  assert.equal(sampleAction(e.queue[0],0).thanking,false);
});
