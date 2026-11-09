import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LiveEngine,normalizeEvent } from '../src/core.js';
import { hallView } from '../src/hall.js';
import { InteractionFeed } from '../src/interaction-feed.js';
const defaults=JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
defaults.participation.likesEnabled=true;
const event=(kind,id,extra={})=>normalizeEvent(kind,{eventId:crypto.randomUUID(),user:{id,nickname:'Người '+id},content:'vào hang',count:1,...extra},'room');

test('only ten likes, the entry phrase or a gift admit new users; disabled social effects do not affect eligibility',()=>{
 const e=new LiveEngine({...defaults,social:{like:false,follow:false,share:false}});
 assert.equal(e.ingest(event('like','like',{count:10})).joined,true);assert.equal(e.ingest(event('comment','comment')).joined,true);
 for(const kind of ['follow','share','join'])assert.equal(e.ingest(event(kind,kind)).joined,undefined);
 assert.equal(e.snapshot().hall.totalParticipants,2);assert.equal(e.stats.totalCoins,0);
 const repeated=event('comment','one');e.ingest(repeated);const count=e.stats.session.participants.one.interactions;
 assert.equal(e.ingest(repeated).status,'duplicate');assert.equal(e.stats.session.participants.one.interactions,count);
});
test('1000 members join despite a full ritual queue, survive reconnect and do not inflate screen payload',()=>{
  let now=1000;const e=new LiveEngine({...defaults,queueLimit:1},undefined,()=>now);
  let writes=0;e.on('stats',()=>writes++);
  for(let i=0;i<1000;i++) assert.equal(e.ingest(event('comment','member'+i)).joined,true);
  assert.equal(e.queue.length,1);assert.equal(e.snapshot().hall.totalParticipants,1000);
  assert.ok(e.snapshot().hall.seats.length<=87);assert.ok(JSON.stringify(e.snapshot()).length<120000);
  assert.ok(writes<=2);e.flushParticipants(true);assert.ok(writes<=3);
  const again=e.ingest(event('comment','member999',{content:'Nội dung mới nhất'}));
  assert.equal(again.joined,true);assert.equal(e.stats.session.participants.member999.lastComment,'Nội dung mới nhất');
  const restored=new LiveEngine(defaults,structuredClone(e.stats),()=>now);restored.beginSession('room');
  assert.equal(restored.snapshot().hall.totalParticipants,1000);
  restored.beginSession('other');assert.equal(restored.snapshot().hall.totalParticipants,0);
});

test('top seven remain fixed while every other member gets a turn without duplicate seats',()=>{
  const donors=Array.from({length:8},(_,i)=>({id:'d'+i,name:'Top '+i,coins:100-i,attainedOrder:i}));
  const participants=Object.fromEntries(Array.from({length:90},(_,i)=>['p'+i,{id:'p'+i,name:'Khách '+i,joinedOrder:i}]));
  participants.d0={id:'d0',name:'Cũng là thành viên',joinedOrder:0};
  const seen=new Set();
  for(let page=0;page<4;page++) {
    const view=hallView(donors,participants,page*10000,0),seats=view.seats.filter(Boolean);
    assert.deepEqual(seats.slice(0,7).map(x=>x.id),['d0','d1','d2','d3','d4','d5','d6']);
    assert.equal(new Set(seats.map(x=>x.id)).size,seats.length);assert.ok(seats.length<=87);
    for(const user of seats)seen.add(user.id);
    assert.equal(view.offscreenParticipants,view.totalParticipants-seats.length);
  }
  assert.equal(seen.size,98);
  const changed=hallView([{id:'p89',name:'Vừa lên top',coins:999},...donors],participants,0,0);
  assert.equal(changed.seats[0].id,'p89');assert.equal(changed.seats.filter(u=>u?.id==='p89').length,1);
});

test('interaction cards coalesce spam without dropping other people and pause for prominent rituals',()=>{
  const feed=new InteractionFeed();
  for(let i=0;i<1000;i++) feed.record(event('comment','spam',{content:'Lần '+i}));
  feed.record(event('comment','next'));assert.equal(feed.pending.size,2);
  feed.tick(0);assert.equal(feed.current.userId,'spam');assert.equal(feed.current.count,1000);
  assert.equal(feed.current.text,'Lần 999');
  feed.tick(3000,true);assert.equal(feed.pending.size,1);assert.equal(feed.current.startedAt,3000);
  feed.tick(4000);assert.equal(feed.current.userId,'spam');
  feed.tick(7000);assert.equal(feed.current.userId,'next');
  feed.tick(8000);assert.equal(feed.current,null);
});

test('membership and comments are independent of per-person ritual cooldown',()=>{
  const e=new LiveEngine(defaults);e.setRenderer('screen');
  e.ingest(event('like','a',{count:10}));
  const result=e.ingest(event('comment','a',{content:'Quỷ đỏ lên nào anh em'}));
  assert.equal(result.status,'joined');assert.equal(result.joined,true);
  assert.equal(e.stats.session.participants.a.lastComment,'Quỷ đỏ lên nào anh em');
  assert.equal(e.interactions.pending.get('a').text,'Quỷ đỏ lên nào anh em');
  e.finish(e.current.id);e.tick();assert.equal(e.interactions.current.text,'Quỷ đỏ lên nào anh em');
});
