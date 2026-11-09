import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRule, sortQueue, LikeMeter } from '../src/rules.js';

test('coin thresholds use the highest applicable tier', () => {
  for (const [value, id] of [[0,null],[1,'coin1'],[9,'coin1'],[10,'coin10'],[29,'coin10'],[30,'coin30'],[49,'coin30'],[50,'coin50'],[99,'coin50'],[100,'coin100'],[499,'coin100'],[500,'coin500'],[5000,'coin500']]) {
    assert.equal(resolveRule('gift', value)?.id ?? null, id);
  }
});
test('priority beats arrival order and equal priorities preserve FIFO', () => {
  assert.deepEqual(sortQueue([
    { id:'first', priority:1, sequence:0 },
    { id:'follow', priority:5, sequence:1 },
    { id:'rose', priority:10, sequence:2 },
    { id:'second', priority:1, sequence:3 }
  ]).map(item=>item.id), ['rose','follow','first','second']);
});
test('likes accumulate per person, retain remainder, and never combine users', () => {
  const meter = new LikeMeter();
  assert.equal(meter.add('a',70),0);
  assert.equal(meter.add('b',70),0);
  assert.equal(meter.add('a',45),1);
  assert.equal(meter.remaining('a'),15);
  assert.equal(meter.remaining('b'),70);
  assert.equal(meter.add('a',210),2);
  assert.equal(meter.remaining('a'),25);
  assert.equal(meter.add('a',-100),0);
});
