import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LiveEngine,normalizeEvent} from '../src/core.js';
import {createNarration} from '../public/js/narration.js';
import {HALL_LAYOUT,VISIBLE_HALL_CAPACITY} from '../public/js/experience.js';
import {getSoundLibrary} from '../src/sounds.js';
import {loadFanCardAudio} from '../src/fan-cards.js';
import {sampleAction,speechBusy} from '../public/js/actions.js';
import {scanSounds} from '../src/sounds.js';
import os from 'node:os';
import path from 'node:path';
const config=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
const event=(kind,id,fields={})=>normalizeEvent(kind,{eventId:crypto.randomUUID(),user:{id,nickname:id,profilePictureUrl:'https://example.com/avatar.png'},content:'xin chào',likeCount:1,...fields},'room-v12');
const gift=(id,coins,count=1)=>event('gift',id,{giftId:'gift',groupId:crypto.randomUUID(),giftName:'Rose',giftType:1,repeatEnd:true,repeatCount:count,diamondCount:coins});
test('fanCard narration creates Audio and plays only at readAt, primary-only, with immediate stop',async()=>{
 const previous=globalThis.Audio,instances=[],ducks=[];let primary=true;
 globalThis.Audio=class{constructor(src){this.src=src;this.readyState=1;this.paused=true;this.plays=0;instances.push(this);}load(){}play(){this.plays++;this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}};
 try{
   const player=createNarration({isPrimary:()=>primary,getConfig:()=>config,onDucking:x=>ducks.push(x)});
   const job={id:'card',fanCard:{readAt:9000,audio:{url:'/assets/fan-cards/fan-001-energy.wav',duration:6}}};
   player.setJob(job);assert.equal(instances.length,1,'fanCard must not be checked as legacy fortune');assert.match(instances[0].src,/energy/);
   player.sample(job,8999,true);assert.equal(instances[0].plays,0);player.sample(job,9350,true);assert.equal(instances[0].plays,1);assert.equal(instances[0].currentTime,.35);assert.equal(instances[0].volume,.85);assert.equal(ducks.at(-1),true);
   player.stop();assert.equal(instances[0].paused,true);assert.equal(instances[0].src,'');assert.equal(ducks.at(-1),false);
   primary=false;player.setJob({...job,id:'preview'});player.sample({...job,id:'preview'},10000,true);assert.equal(instances[1].plays,0);
 }finally{globalThis.Audio=previous;}
});
test('ordinary comment, follow, share and entering the room never bypass 10-like admission',()=>{
 const engine=new LiveEngine(config);
 for(const kind of ['comment','follow','share','join'])engine.ingest(event(kind,kind));
 assert.equal(engine.snapshot().hall.totalParticipants,0);assert.equal(engine.ingest(event('comment','command',{content:'Ronaldo'})).status,'entry-required');
 engine.ingest(event('like','viewer',{likeCount:4}));assert.equal(engine.snapshot().hall.totalParticipants,0);
 const last=event('like','viewer',{likeCount:6});assert.equal(engine.ingest(last).joined,true);assert.equal(engine.snapshot().hall.totalParticipants,1);assert.equal(engine.current?.action||engine.queue[0].action,'visit');
 const count=engine.queue.length;assert.equal(engine.ingest(last).status,'duplicate');assert.equal(engine.queue.length,count);assert.equal(engine.snapshot().participation.receivedLikes,10);
});
test('one 50-like packet creates at most one procession; phrase is accent/case folded',()=>{
 const engine=new LiveEngine(config);engine.ingest(event('like','many',{likeCount:50}));assert.equal(engine.queue.length,1);assert.equal(engine.acknowledgements.snapshot().current.kind,'likes');
 engine.ingest(event('comment','phrase',{content:'  VAO   HANG! '}));assert.equal(engine.snapshot().hall.totalParticipants,2);assert.equal(engine.queue.length,2);
 engine.ingest(event('comment','phrase',{content:'NỮ'}));assert.equal(engine.stats.session.participants.phrase.character,'female');
});
test('admission survives a full action queue; donation priority matches requested amounts',()=>{
 const full=new LiveEngine({...config,queueLimit:1});full.ingest(gift('donor',1));full.ingest(event('like','new',{likeCount:10}));assert.ok(full.stats.session.participants.new);assert.equal(full.queue.length,1);
 const engine=new LiveEngine(config);
 for(const [coins,count,expected] of [[1,1,10],[1,5,50],[3,1,30],[10,1,100],[30,1,300],[100,1,1000],[500,1,100000000000]]){
   const id=coins+'-'+count;const result=engine.ingest(gift(id,coins,count));assert.equal(engine.queue.find(job=>job.id===result.id).priority,expected);
 }
 assert.equal(engine.queue[0].priority,100000000000);
});
test('follow/share acknowledgements keep avatar/name and the required Vietnamese text',()=>{
 const engine=new LiveEngine(config);engine.ingest(event('follow','newfan'));engine.ingest(event('share','sharer'));
 const ack=engine.snapshot().acknowledgements.current;assert.equal(ack.nickname,'newfan');assert.equal(ack.avatar,'https://example.com/avatar.png');assert.equal(ack.message,'Cảm ơn bạn mới đã follow');assert.equal(ack.applause,true);
 assert.equal([...engine.acknowledgements.pending.values()][0].message,'Cảm ơn bạn đã chia sẻ');assert.equal(engine.snapshot().hall.totalParticipants,0);
});
test('dense view is bounded at 87 and three offscreen speakers are pinned to their own chairs',()=>{
 let now=1000;const engine=new LiveEngine(config,undefined,()=>now);
 for(let i=0;i<160;i++)engine.ingest(event('comment','p'+i,{content:'vào hang'}));
 engine.interactions.active=[];engine.interactions.pending.clear();engine.interactions.nextAt=now;
 for(let i=157;i<160;i++){engine.ingest(event('comment','p'+i,{content:'Tôi đang nói '+i}));now+=700;engine.tick();}
 const snapshot=engine.snapshot();assert.equal(snapshot.hall.totalParticipants,160);assert.ok(snapshot.hall.seats.filter(Boolean).length<=87);assert.equal(HALL_LAYOUT.length,VISIBLE_HALL_CAPACITY);
 for(const speech of snapshot.interactions.items)assert.ok(snapshot.hall.seats.some(user=>user?.id===speech.userId));assert.ok(snapshot.interactions.items.length<=3);
});
test('99 energetic card files and three social voices are complete; missing memes are silent',()=>{
 const cards=loadFanCardAudio();assert.equal(cards.total,99);assert.equal(cards.ready,99);assert.ok(cards.items.every(item=>item.audio.url.endsWith('-energy.wav')));
 const sounds=getSoundLibrary();for(const id of ['follow-voice','share-voice','likes-voice'])assert.ok(sounds.byId[id]?.duration>0);
 for(const id of ['applause','fan-card','cave-door','antony','siuuu','ole','fergie','ggmu'])if(!sounds.byId[id])assert.ok(sounds.missing.includes(id));
});
test('SIUUU plays at landing during the scene, and return waits for the scene and audio',()=>{
 const bank=getSoundLibrary(),old=bank.byId.siuuu;bank.byId.siuuu={url:'/assets/sounds/siuuu.wav',duration:2.25};
 try{const engine=new LiveEngine(config);engine.ingest(gift('donor',10));const job=engine.queue[0];assert.equal(job.cue.readAt,job.actionStartDelay+2300);assert.equal(job.cueDuration,2250);assert.equal(job.duration,job.actionStartDelay+job.actionDuration+1500);
 assert.equal(sampleAction(job,job.cue.readAt).cuePlaying,true);assert.equal(sampleAction(job,job.cue.readAt).returning,false);assert.equal(sampleAction(job,job.cue.readAt+2250).returning,false);assert.equal(sampleAction(job,job.effectEnd).returning,true);assert.equal(speechBusy(job,job.cue.readAt),true);
 }finally{if(old)bank.byId.siuuu=old;else delete bank.byId.siuuu;}
});
test('the sound bank discovers real replacement WAV durations without a server restart',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mu-sounds-'));
 try{
  const samples=24000,buffer=Buffer.alloc(44+samples*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(24000,24);buffer.writeUInt32LE(48000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);fs.writeFileSync(path.join(folder,'vo-tay.wav'),buffer);
  const bank=await scanSounds({folder});assert.equal(bank.byId.applause.duration,1);assert.match(bank.byId.applause.url,/vo-tay.wav\?v=/);assert.ok(bank.missing.includes('siuuu'));
 }finally{for(const file of fs.readdirSync(folder))fs.unlinkSync(path.join(folder,file));fs.rmdirSync(folder);}
});
