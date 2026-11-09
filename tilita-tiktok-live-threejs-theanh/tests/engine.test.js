import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveEngine, normalizeEvent } from '../server/engine.js';
const base = { room:'room',userId:'123456789123456789',username:'@viewer',avatarUrl:'',giftId:'rose',giftType:1,unitCoins:1,groupId:'combo1',quantity:1 };

test('modern protobuf fields preserve IDs, gift metadata and per-person likes',()=>{
 const e=normalizeEvent('gift',{common:{msgId:'999999999999999999',createTime:'1700000000'},user:{id:'123456789123456789',displayId:'viewer',avatarThumb:{urlList:['https://a.tiktokcdn.com/photo.jpg']}},gift:{id:'5655',type:1,diamondCount:10},repeatCount:3,repeatEnd:1,groupId:'combo'},'room');
 assert.equal(e.userId,'123456789123456789');assert.equal(e.username,'@viewer');assert.equal(e.unitCoins,10);assert.equal(e.repeatEnd,true);assert.equal(e.createdAt,1700000000000);assert.equal(e.avatarUrl,'https://a.tiktokcdn.com/photo.jpg');
 assert.equal(normalizeEvent('likes',{user:{displayId:'a'},count:25}).likes,25);
 assert.equal(normalizeEvent('comment',{user:{id:'1',nickName:'A display name'}}),null);
});
test('combo 1 → 2 → 2 → 5 → end awards exactly five coins once',()=>{
 const e=new LiveEngine();for(const count of [1,2,2,5])e.ingest({...base,type:'gift',quantity:count,repeatEnd:false});
 assert.equal(e.queue.length,0);e.ingest({...base,type:'gift',quantity:5,repeatEnd:true});e.ingest({...base,type:'gift',quantity:5,repeatEnd:true});
 assert.equal(e.queue.length,1);assert.equal(e.queue[0].coins,5);assert.equal(e.stats.coins,5);
});
test('streak timeout and late final never double count, late extra units use a delta',()=>{
 let now=1000;const e=new LiveEngine({},()=>{},()=>now);e.ingest({...base,type:'gift',quantity:10});now+=5000;e.tick();
 assert.equal(e.stats.coins,10);e.ingest({...base,type:'gift',quantity:10,repeatEnd:true});assert.equal(e.stats.coins,10);
 e.ingest({...base,type:'gift',quantity:12,repeatEnd:true});assert.equal(e.stats.coins,12);assert.deepEqual(e.queue.map(j=>j.coins),[10,2]);
});
test('non-streak receipts deduplicate independently of distinct gifts',()=>{
 const e=new LiveEngine();const event={...base,type:'gift',giftType:0,id:'one',unitCoins:100};e.ingest(event);e.ingest(event);e.ingest({...event,giftId:'other'});
 assert.equal(e.queue.length,2);assert.equal(e.stats.coins,200);
});
test('rapid ungrouped streaks remain distinct and replayed starts are ignored',()=>{
 const e=new LiveEngine();
 for(const id of ['gift-a','gift-b']){e.ingest({...base,groupId:'0',type:'gift',id,repeatEnd:false});e.ingest({...base,groupId:'0',type:'gift',id,repeatEnd:true});}
 assert.equal(e.stats.coins,2);assert.equal(e.queue.length,2);
 e.ingest({...base,groupId:'0',type:'gift',id:'gift-a',repeatEnd:false});e.ingest({...base,groupId:'0',type:'gift',id:'gift-a',repeatEnd:true});assert.equal(e.stats.coins,2);
});
test('unknown gift prices are not silently treated as one coin',()=>{
 const e=new LiveEngine();e.ingest({...base,type:'gift',unitCoins:0,repeatEnd:true});assert.equal(e.queue.length,0);assert.equal(e.logs[0].level,'warning');
});
test('100 likes are per person, preserve remainder and ignore duplicate packets',()=>{
 const e=new LiveEngine();e.ingest({...base,type:'likes',id:'a',likes:75});e.ingest({...base,userId:'other',username:'@other',type:'likes',id:'b',likes:75});
 e.ingest({...base,type:'likes',id:'c',likes:150});e.ingest({...base,type:'likes',id:'c',likes:150});assert.equal(e.queue.length,2);assert.equal(e.likes.get('room:123456789123456789'),25);assert.equal(e.stats.likes,300);
});
test('new high-priority events never interrupt active jobs; pause preserves elapsed',()=>{
 let now=1000;const e=new LiveEngine({},()=>{},()=>now);e.renderers=1;e.add('comment',base);e.setPaused(false);const first=e.current.id;
 e.add('coin500',base);assert.equal(e.current.id,first);now+=2200;e.setPaused(true);assert.equal(e.elapsed(),2.2);now+=9000;assert.equal(e.elapsed(),2.2);e.setPaused(false);now+=7000;e.tick();assert.equal(e.current.ruleId,'coin500');
});
test('restart restores interrupted jobs paused without awarding gifts twice',()=>{
 const e=new LiveEngine();e.renderers=1;e.ingest({...base,type:'gift',repeatEnd:true,quantity:30});e.setPaused(false);
 const restored=new LiveEngine(e.serialize());assert.equal(restored.paused,true);assert.equal(restored.current,null);assert.equal(restored.queue.length,1);assert.equal(restored.queue[0].coins,30);
 restored.ingest({...base,type:'gift',repeatEnd:true,quantity:30});assert.equal(restored.stats.coins,30);assert.equal(restored.queue.length,1);
});
test('comment cooldown and follow dedupe are isolated per room and user',()=>{
 const e=new LiveEngine();e.ingest({...base,type:'comment',id:'1'});e.ingest({...base,type:'comment',id:'2'});e.ingest({...base,type:'follow',id:'3'});e.ingest({...base,type:'follow',id:'4'});assert.equal(e.queue.length,2);
 e.ingest({...base,type:'comment',id:'5',room:'new-room'});assert.equal(e.queue.length,3);
});
test('avatar normalization chooses the largest available source',()=>{
 const e=normalizeEvent('follow',{user:{id:'1',displayId:'a',avatarThumb:{urlList:['thumb']},avatarMedium:{urlList:['medium']},avatarLarger:{urlList:['large']}}});
 assert.equal(e.avatarUrl,'large');
 assert.equal(normalizeEvent('follow',{user:{displayId:'a',avatarLarger:{urlList:[]},avatarThumb:{urlList:['thumb']}}}).avatarUrl,'thumb');
});
test('wall sequence follows playback order, survives restart and ignores gift arrival order',()=>{
 const e=new LiveEngine();e.renderers=1;e.add('comment',base);e.add('coin100',base);e.setPaused(false);assert.equal(e.current.wallIndex,0);e.finish();assert.equal(e.current.wallIndex,1);
 const recovered=new LiveEngine(e.serialize());recovered.renderers=1;recovered.setPaused(false);assert.equal(recovered.current.wallIndex,1);recovered.add('coin1',base);recovered.finish();assert.equal(recovered.current.wallIndex,2);
});
test('music pause, resume and restart keep playhead and independent levels',()=>{
 let now=1000;const e=new LiveEngine({},()=>{},()=>now);e.setMusic({id:'track',name:'song.wav'});e.musicAction('play');now+=3500;e.musicAction('pause');assert.equal(e.music.offset,3.5);now+=5000;e.musicAction('play');now+=2000;
 e.updateSettings({volume:1,musicVolume:.18,duckMusic:true});const recovered=new LiveEngine(e.serialize());assert.equal(recovered.music.playing,false);assert.equal(recovered.music.offset,5.5);assert.equal(recovered.settings.volume,1);assert.equal(recovered.settings.musicVolume,.18);
 e.musicAction('remove');assert.equal(e.music.track,null);assert.equal(e.music.playing,false);
});
