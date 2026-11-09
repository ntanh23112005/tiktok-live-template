import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LiveEngine,normalizeEvent} from '../src/core.js';
import {getSoundLibrary} from '../src/sounds.js';
import {MEME_SCENES,memePhase} from '../public/js/meme-scenes.js';
import {sampleAction,presentationBusy} from '../public/js/actions.js';
const config=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
const gift=coins=>normalizeEvent('gift',{eventId:crypto.randomUUID(),user:{id:'supporter',nickname:'Người tặng'},giftId:'g',giftType:2,diamondCount:coins,repeatCount:1},'v13');

test('each coin tier uses its own meme performer and a sound on the visible action',()=>{
  for(const [coins,action,person,size] of [[3,'cave-door','maguire','small'],[5,'antony','antony','small'],[10,'siuuu','ronaldo','medium'],[30,'ole','ole','medium'],[100,'fergie','fergie','full'],[500,'ggmu','carrick','full']]){
    const engine=new LiveEngine(config);engine.ingest(gift(coins));const job=engine.queue[0],spec=MEME_SCENES[action];
    assert.equal(job.action,action);assert.equal(spec.hero,person);assert.equal(spec.size,size);assert.equal(job.thanksDuration,3000);assert.equal(job.actionStartDelay,7000);
    assert.ok(job.cue);assert.equal(job.cue.readAt,7000+spec.soundAt);assert.ok(job.cue.readAt<7000+spec.duration);
    assert.equal(sampleAction(job,6999).meme,false);assert.equal(sampleAction(job,7000).meme,true);assert.equal(sampleAction(job,job.effectEnd).returning,true);
    assert.equal(presentationBusy(job,job.cue.readAt),true);assert.equal(presentationBusy(job,job.effectEnd),false);assert.ok(job.duration<=18000);
  }
});

test('a replacement longer than the scene holds its presentation and only then returns',()=>{
  const bank=getSoundLibrary(),old=bank.byId.siuuu;bank.byId.siuuu={url:'/assets/sounds/long.mp3',duration:20};
  try{const engine=new LiveEngine(config);engine.ingest(gift(10));const job=engine.queue[0];assert.equal(job.effectEnd,job.cue.readAt+20000);assert.equal(sampleAction(job,job.effectEnd-1).meme,true);assert.equal(sampleAction(job,job.effectEnd-1).returning,false);assert.equal(sampleAction(job,job.effectEnd).returning,true);}finally{bank.byId.siuuu=old;}
});

test('card voice finishes before applause, and applause finishes before the return',()=>{
  const engine=new LiveEngine(config);engine.ingest(gift(1));const job=engine.queue[0];
  assert.ok(job.fanCard.audio);const end=job.fanCard.readAt+Math.ceil(job.fanCard.audio.duration*1000);
  assert.equal(job.cue.readAt,end+1500);assert.equal(sampleAction(job,end-1).card,true);assert.equal(sampleAction(job,job.cue.readAt).card,false);
  assert.equal(job.effectEnd,job.cue.readAt+job.cueDuration);assert.equal(job.duration,job.effectEnd+1500);
});

test('new cue assets are present and short; prepared sources remain intact',()=>{
  const bank=getSoundLibrary();assert.deepEqual(bank.missing,[]);assert.equal(bank.items.length,12);
  for(const id of Object.keys(MEME_SCENES))assert.ok(bank.byId[id].duration<=6.05);
  for(const name of ['goal','clap','siuuuu'])assert.ok(fs.statSync(new URL('../public/assets/sounds/source/'+name+'.mp3',import.meta.url)).size>30000);
  for(const name of ['cast','red-devil'])assert.ok(fs.statSync(new URL('../public/assets/mu-meme-v1.3/'+name+'.png',import.meta.url)).size>100000);
});

test('visual impact matches sound onset and meme beats have distinct endings',()=>{
  for(const [id,spec] of Object.entries(MEME_SCENES)){assert.equal(memePhase(id,spec.soundAt-1).impact,0);assert.equal(memePhase(id,spec.soundAt).impact,1);assert.equal(memePhase(id,spec.duration-100).closeup,true);}
  assert.equal(memePhase('antony',3999).flyBall,false);assert.equal(memePhase('antony',4000).flyBall,true);
  assert.equal(memePhase('fergie',2299).goal,false);assert.equal(memePhase('fergie',2300).goal,true);
});
