import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAW_END, WALL_TRAVEL_SECONDS, actionSeconds } from '../src/timing.js';
import { LiveEngine } from '../server/engine.js';
test('the next wall starts immediately after drawing and travels in 0.42 seconds',()=>{
 assert.equal(DRAW_END,.69);assert.equal(WALL_TRAVEL_SECONDS,.42);
 assert.ok(Math.abs(actionSeconds({kind:'name',duration:5})-3.87)<1e-9);
});
test('the server advances as soon as the fast transition completes',()=>{
 let now=1000;const engine=new LiveEngine({},()=>{},()=>now);engine.renderers=1;
 engine.add('comment',{username:'@a',userId:'a'});engine.add('comment',{username:'@b',userId:'b'});engine.setPaused(false);
 now+=3450;engine.tick();assert.equal(engine.current.username,'@a');
 now+=430;engine.tick();assert.equal(engine.current.username,'@b');assert.equal(engine.current.wallIndex,1);
});
