import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LiveEngine, normalizeEvent } from '../src/core.js';
import { SCENES, sampleAction } from '../public/js/actions.js';
const defaults = JSON.parse(fs.readFileSync(new URL('../config/default.json', import.meta.url)));
defaults.participation.likesEnabled=true;
const gift = (id, coins, room = 'room-1', simulated = false) => normalizeEvent('gift', { user: { id, nickname: 'Người ' + id }, giftName: 'Gift', giftId: 'gift', groupId: randomUUID(), repeatCount: 1, repeatEnd: true, giftType: 1, diamondCount: coins }, room, simulated);

test('hall selects all 45 donors and lets a former outsider enter without duplicate seats', () => {
  const e = new LiveEngine(defaults);
  for (let i = 1; i <= 45; i++) e.ingest(gift(String(i), i));
  let hall = e.snapshot().hall; assert.equal(hall.leaderboard.length, 45); assert.equal(hall.leaderboard[0].id, '45'); assert.equal(hall.leaderboard.at(-1).id, '1');
  e.ingest(gift('1', 60)); hall = e.snapshot().hall;
  assert.equal(hall.leaderboard[0].id, '1'); assert.equal(hall.leaderboard[0].coins, 61);
  assert.equal(hall.leaderboard.filter(u => u.id === '1').length, 1);
});
test('equal totals favor the first to reach that value even in the same millisecond', () => {
  const e = new LiveEngine(defaults, undefined, () => 1000);
  e.ingest(gift('z', 10)); e.ingest(gift('a', 10)); assert.equal(e.snapshot().hall.leaderboard[0].id, 'z');
  e.ingest(gift('a', 10)); e.ingest(gift('z', 10)); assert.equal(e.snapshot().hall.leaderboard[0].id, 'a');
});
test('same room reconnect preserves hall; new room starts fresh and keeps lifetime statistics', () => {
  const e = new LiveEngine(defaults); e.ingest(gift('one', 20)); e.beginSession('room-1');
  assert.equal(e.snapshot().hall.leaderboard.length, 1);
  const restored = new LiveEngine(defaults, JSON.parse(JSON.stringify(e.stats))); restored.beginSession('room-1');
  assert.equal(restored.snapshot().hall.leaderboard[0].coins, 20);
  restored.beginSession('room-2'); assert.equal(restored.snapshot().hall.leaderboard.length, 0); assert.equal(restored.stats.totalCoins, 20);
});
test('simulations and unknown gift value do not invent real contributors', () => {
  const e = new LiveEngine(defaults); e.ingest(gift('sim', 100, 'sim', true)); e.ingest(gift('unknown', 0));
  assert.equal(e.snapshot().hall.leaderboard.length, 0);
  e.showHallDemo(); assert.equal(e.snapshot().hall.mode, 'demo'); assert.equal(e.snapshot().hall.leaderboard.length, 7); assert.equal(e.snapshot().hall.totalParticipants,100);
  e.ingest(gift('real', 5)); assert.equal(e.snapshot().hall.mode, 'live'); assert.equal(e.snapshot().hall.leaderboard[0].id, 'real');
});
test('direct ritual simulation is explicit, isolated, and uses the correct duration', () => {
  const e = new LiveEngine(defaults);
  for (const action of Object.keys(SCENES)) {
    e.ingest(gift(action, 0, 'sim', true), action); const job = e.queue.at(-1);assert.equal(job.action,action);
    assert.equal(job.duration,job.effectEnd+job.returnDuration);assert.ok(job.effectEnd>=job.actionStartDelay+job.actionDuration);
    if(job.cue)assert.ok(job.effectEnd>=job.cue.readAt+job.cueDuration);
    if(job.fanCard)assert.equal(job.actionDuration,3500+(job.fanCard.audio?Math.ceil(job.fanCard.audio.duration*1000):16000));
  }
  assert.equal(e.stats.totalCoins, 0); assert.throws(() => e.ingest(gift('real', 5), 'ggmu'));
});
test('MU scenes use distinct poses and collective celebration with bounded durations',()=>{
  const at=(action,t)=>sampleAction({action,duration:SCENES[action].duration},t);
  assert.equal(at('cave-door',2200).pose,'crying');assert.equal(at('antony',2200).pose,'kicking');assert.equal(at('siuuu',2200).pose,'celebrating');assert.equal(at('ole',2200).pose,'sitting');
  assert.equal(at('fan-card',1999).card,false);assert.equal(at('fan-card',2000).card,true);
  assert.equal(at('fergie',2299).group,false);assert.equal(at('fergie',2300).group,true);assert.equal(at('ggmu',2200).group,true);
  for(const action of Object.keys(SCENES))assert.equal(at(action,SCENES[action].duration).opacity,0);
});
