import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveEngine } from '../server/engine.js';
import { reportCSV } from '../server/reporting.js';

const gift = (id, extra = {}) => ({ type: 'gift', room: 'live', id, userId: '42', username: '@alice', giftId: 'g', giftType: 0, unitCoins: 30, quantity: 1, ...extra });

test('session counts deduplicated real gifts and demo completions separately, including streak deltas', () => {
  const e = new LiveEngine(); e.renderers = 1;
  const event = gift('a'); e.ingest(event); e.ingest(event);
  e.ingest(gift('demo', { simulated: true, unitCoins: 500 }));
  e.ingest(gift('combo', { giftType: 1, groupId: 'streak', quantity: 3, repeatEnd: true }));
  e.ingest(gift('combo-late', { giftType: 1, groupId: 'streak', quantity: 5, repeatEnd: true }));
  e.setPaused(false); e.finish(); e.finish(); e.finish(); e.finish(true);
  const report = e.reports.export();
  assert.equal(report.live.coins, 180); assert.equal(report.live.gifts, 6);
  assert.equal(report.live.completed, 2); assert.equal(report.live.skipped, 1);
  assert.equal(report.demo.coins, 500); assert.equal(report.demo.completed, 1);
  assert.equal(report.donors.length, 1); assert.equal(report.donors[0].coins, 180); assert.equal(report.donors[0].gifts, 6);
});

test('new report archives results and preserves queue, dedup and per-person like progress across restart', () => {
  let now = 1000; const e = new LiveEngine({}, () => {}, () => now);
  e.ingest(gift('a'));
  e.ingest({ type: 'likes', id: 'like1', room: 'live', userId: '42', username: '@alice', likes: 75 });
  const first = e.reports.current.id; now += 10000; e.startSession();
  assert.equal(e.queue.length, 1); assert.equal(e.reports.export(first).live.coins, 30); assert.equal(e.reports.current.live.coins, 0);
  const restored = new LiveEngine(e.serialize(), () => {}, () => now);
  restored.ingest(gift('a')); assert.equal(restored.reports.current.live.coins, 0);
  restored.ingest({ type: 'likes', id: 'like2', room: 'live', userId: '42', username: '@alice', likes: 25 });
  assert.equal(restored.queue.length, 2); assert.equal(restored.reports.current.live.likes, 25);
  assert.equal(restored.reports.export(first).endedAt, 11000);
});

test('disabled rules retain real gift totals but create no fallback drawing; saving priorities reorders waiting events only', () => {
  const e = new LiveEngine(); e.renderers = 1;
  e.add('comment', { userId: '1', username: '@current' }); e.setPaused(false); const active = e.current.id;
  const enabledRules = { ...e.enabledRules, coin30: false };
  e.updateSettings({ enabledRules }); e.ingest(gift('disabled'));
  assert.equal(e.queue.length, 0); assert.equal(e.stats.coins, 30); assert.equal(e.reports.current.live.rejected, 1);
  e.add('coin100', { userId: '2', username: '@one' }); e.add('follow', { userId: '3', username: '@two' });
  e.updateSettings({ priorities: { ...e.priorities, follow: 999 } });
  assert.equal(e.publicState().queue[0].ruleId, 'follow'); assert.equal(e.current.id, active);
  const restored = new LiveEngine(e.serialize()); assert.equal(restored.enabledRules.coin30, false);
});

test('move-to-next supports tied maximum priorities without interrupting current drawing', () => {
  const e = new LiveEngine(); e.renderers = 1;
  e.add('comment', { userId: '1', username: '@current' }); e.setPaused(false); const active = e.current.id;
  e.add('coin500', { userId: '2', username: '@big' });
  const target = e.add('comment', { userId: '3', username: '@next' });
  e.promote(target.id); assert.equal(e.publicState().queue[0].id, target.id); assert.equal(e.current.id, active);
  assert.throws(() => e.promote('missing'), /no longer waiting/);
});

test('reports serialize complete contributor data and export escaped spreadsheet-safe CSV', () => {
  const e = new LiveEngine(); e.ingest(gift('a', { username: '@alice,"quoted"' }));
  const restored = new LiveEngine(e.serialize());
  const csv = reportCSV(restored.reports.export());
  assert.match(csv, /donor/); assert.match(csv, /'@alice,""quoted""/);
  assert.equal(restored.reports.publicState().donors[0].coins, 30);
});

test('removing or clearing waiting gifts leaves a cancellation record and preserves received coins', () => {
  const e = new LiveEngine(); e.ingest(gift('a')); e.ingest(gift('b'));
  e.remove(e.queue[0].id); e.clearQueue();
  assert.equal(e.queue.length, 0); assert.equal(e.reports.current.live.cancelled, 2);
  assert.equal(e.reports.current.live.coins, 60); assert.equal(e.history.length, 2);
  assert.ok(e.history.every(job => job.cancelled));
});
