import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LiveEngine,normalizeEvent} from '../src/core.js';
import {parseCommand} from '../src/commands.js';
import {hallView} from '../src/hall.js';
import {SCENE_VERSION,roleForRank} from '../public/js/experience.js';
const config=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
const event=(kind,id,extra={})=>normalizeEvent(kind,{eventId:crypto.randomUUID(),user:{id,nickname:'Fan '+id},content:'GGMU',likeCount:1,...extra},'room');
const gift=(id,coins)=>event('gift',id,{giftType:2,giftId:'test',diamondCount:coins,repeatCount:1});
test('player and pose commands normalize accents and spacing without matching ordinary sentences',()=>{
 for(const [raw,character] of [['  CR7  ','ronaldo'],['MARGUIRE','maguire'],['nữ','female']])assert.deepEqual(parseCommand(raw),{field:'character',value:character});
 for(const [raw,value] of [['ĐỨNG','standing'],['ngoi','sitting'],['nằm','lying'],['nam xuong','lying'],['khoc','crying'],['AN   MUNG','celebrating']])assert.deepEqual(parseCommand(raw),{field:'preferredPose',value});
 assert.equal(parseCommand('Ronaldo đá hay quá'),null);assert.deepEqual(parseCommand('nam'),{field:'character',value:'male'});
});
test('commands admit immediately, persist offscreen choices, and never wait for action cooldown',()=>{
 const e=new LiveEngine({...config,queueLimit:1});e.ingest(event('like','a',{likeCount:10}));
 const before=e.queue.length;assert.equal(e.ingest(event('comment','a',{content:'Maguire'})).status,'command');assert.equal(e.ingest(event('comment','a',{content:'nằm'})).status,'command');
 assert.equal(e.queue.length,before);assert.equal(e.stats.session.participants.a.character,'maguire');assert.equal(e.stats.session.participants.a.preferredPose,'lying');
 const restored=new LiveEngine(config,structuredClone(e.stats));assert.equal(restored.snapshot().hall.seats.find(u=>u?.id==='a').character,'maguire');assert.equal(restored.stats.totalCoins,0);
});
test('captain command never grants donor rank and only succeeds for top seven',()=>{
 const e=new LiveEngine(config);e.ingest(event('comment','guest',{content:'vào hang'}));assert.equal(e.ingest(event('comment','guest',{content:'doi truong'})).status,'role-restricted');assert.ok(e.stats.session.participants.guest);
 for(let i=1;i<=8;i++)e.ingest(gift('d'+i,100-i));
 assert.equal(e.ingest(event('comment','d1',{content:'ĐỘI TRƯỞNG'})).status,'command');assert.equal(e.ingest(event('comment','d8',{content:'đội trưởng'})).status,'role-restricted');
 const leaders=e.snapshot().hall.leaderboard;assert.deepEqual(leaders.slice(0,3).map(u=>u.role),['chief','chief','chief']);assert.ok(leaders.slice(3,7).every(u=>u.role==='vice'));assert.equal(leaders[7].role,'fan');assert.equal(roleForRank(0),'fan');
});
test('collective action freezes rank and seats while new membership is still counted',()=>{
 let now=1000;const e=new LiveEngine(config,undefined,()=>now);
 for(let i=1;i<=8;i++)e.ingest(gift('d'+i,20-i));e.queue=[];e.setRenderer('screen');e.ingest(gift('boss',500));
 const before=e.snapshot().hall,ids=before.seats.map(u=>u?.id);e.ingest(gift('newboss',1000));e.ingest(event('comment','newfan',{content:'vào hang'}));now+=15000;
 const frozen=e.snapshot().hall;assert.deepEqual(frozen.seats.map(u=>u?.id),ids);assert.deepEqual(frozen.leaderboard.map(u=>u.id),before.leaderboard.map(u=>u.id));assert.equal(frozen.totalParticipants,before.totalParticipants+2);
 e.finish(e.current.id,'completed',false);assert.equal(e.snapshot().hall.leaderboard[0].id,'newboss');assert.ok(!Object.hasOwn(e.snapshot().current||{},'hallView'));
});
for(const count of [0,3,7,8,31,100,1000])test(`bounded viewport for ${count} people; full rotation has coverage`,()=>{
 const participants=Object.fromEntries(Array.from({length:count},(_,i)=>['p'+i,{id:'p'+i,name:'Fan '+i,joinedOrder:i}]));const seen=new Set();const pages=Math.max(1,Math.ceil(count/80));
 for(let p=0;p<pages;p++){const view=hallView([],participants,p*10000,0),shown=view.seats.filter(Boolean);assert.ok(shown.length<=80);assert.ok(view.seats.length<=87);assert.equal(new Set(shown.map(u=>u.id)).size,shown.length);shown.forEach(u=>seen.add(u.id));assert.equal(view.totalParticipants,count);}assert.equal(seen.size,count);
});
test('new room cannot replay old jobs and duplicate first gift stays deduplicated',()=>{
 const e=new LiveEngine(config);e.setRenderer('screen');e.ingest(gift('a',10));e.ingest(event('comment','b'));assert.ok(e.current);e.beginSession('other');assert.equal(e.current,null);assert.equal(e.queue.length,0);
 const g={...gift('c',3),room:'other'};e.ingest(g);assert.equal(e.ingest(g).status,'duplicate');assert.equal(e.stats.session.totalCoins,3);assert.equal(e.stats.totalCoins,13);
});
test('new project identity, four real music files and complete new art are self-contained',()=>{
 assert.equal(SCENE_VERSION,'mu-cave-v1');assert.equal(config.sceneVersion,SCENE_VERSION);assert.equal(config.username,'');
 for(const name of ['background.png','male.png','female.png','ronaldo.png','maguire.png','carrick.png','props.png','card-frame.png','manchester-united.svg','atlases.json'])assert.ok(fs.statSync(new URL('../public/assets/mu-cave-v1/'+name,import.meta.url)).size>0);
 for(const file of ['glory-glory-man-united','fanclub-chill','terrace-drums','red-devil-rock'])assert.ok(fs.statSync(new URL('../public/assets/music/'+file+'.mp3',import.meta.url)).size>100000);
});
