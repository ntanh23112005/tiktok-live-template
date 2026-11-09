import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createApp } from '../server.js';

test('HTTP/WS integration: preview isolation, primary acknowledgement, config and persistence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tilita-http-')); const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); const url = `http://127.0.0.1:${app.server.address().port}`;
  const request = async (route, data, method = 'POST', origin) => fetch(url + route, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(data) });
  const state = async () => (await fetch(url + '/api/state')).json();
  const waitFor = async predicate => { for (let i = 0; i < 100; i++) { const s = await state(); if (predicate(s)) return s; await new Promise(r => setTimeout(r, 10)); } throw Error('Timed out'); };
  let preview, screen;
  try {
    assert.equal((await fetch(url + '/admin')).status, 200);
    const fortunes = await (await fetch(url + '/api/fortunes')).json();
    assert.equal(fortunes.total,99); assert.equal(fortunes.ready,99);
    const lastFortune = fortunes.items.find(f => f.number === 99); assert.equal(lastFortune.id,'an-99');
    const narration = await fetch(url + lastFortune.audio.url); assert.equal(narration.status,200);
    const wav = Buffer.from(await narration.arrayBuffer()); assert.equal(wav.toString('ascii',0,4),'RIFF'); assert.equal(wav.toString('ascii',8,12),'WAVE');
    const music = await (await fetch(url + '/api/music')).json();
    assert.ok(music.tracks.length>=5);
    assert.ok(music.tracks.some(t=>t.file==='music.mp3'));
    assert.ok(!music.tracks.some(t=>t.file==='music.wav'));
    for (const file of ['music/sen-tinh.mp3','music/truc-an.mp3','music/may-thien.mp3','music/niem-phat-phoi-khi.mp3']) assert.ok(music.tracks.some(t=>t.file===file));
    const musicBytes=await fetch(url + '/assets/music/sen-tinh.mp3',{headers:{Range:'bytes=0-31'}});
    assert.equal(musicBytes.status,206); assert.equal((await musicBytes.arrayBuffer()).byteLength,32);
    assert.equal((await fetch(url + '/assets/wooden-temple-v1/background.png')).status, 200);
    assert.equal((await fetch(url + '/assets/wooden-temple-v1/devotee-sheet.png')).status, 200);
    assert.equal((await request('/api/control', { command: 'clear' }, 'POST', 'https://other.example')).status, 403);
    assert.equal((await request('/api/config', {}, 'PUT')).status, 400);
    const c = (await state()).config; c.sceneTitle = 'Cảnh đã lưu'; assert.equal((await request('/api/config', c, 'PUT')).status, 200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'config.json'))).sceneTitle, 'Cảnh đã lưu');
    for (const track of music.tracks) {
      const selected={...(await state()).config,musicFile:track.file,musicVolume:.01};
      assert.equal((await request('/api/config',selected,'PUT')).status,200);
      const saved=JSON.parse(fs.readFileSync(path.join(dir,'config.json')));
      assert.equal(saved.musicFile,track.file); assert.equal(saved.musicVolume,.01);
    }
    preview = new WebSocket(url.replace('http:', 'ws:') + '/ws?role=preview'); await once(preview, 'open'); preview.send(JSON.stringify({ type: 'ready' }));
    await request('/api/simulate', { scenario: 'combo' }); assert.equal((await state()).queue[0].quantity, 5); assert.equal((await state()).current, null);
    screen = new WebSocket(url.replace('http:', 'ws:') + '/ws?role=overlay'); await once(screen, 'open'); screen.send(JSON.stringify({ type: 'ready' }));
    const active = await waitFor(s => s.current); assert.equal(active.stats.totalGifts, 0);
    preview.send(JSON.stringify({ type: 'complete', id: active.current.id })); screen.send(JSON.stringify({ type: 'complete', id: active.current.id }));
    assert.equal((await state()).current.id, active.current.id); // preview and premature ack ignored
    app.engine.current.startedAt = Date.now() - app.engine.current.duration;
    screen.send(JSON.stringify({ type: 'complete', id: active.current.id })); await waitFor(s => !s.current);
    await request('/api/simulate', { scenario: 'rose' }); await waitFor(s => s.current); screen.close();
    const interrupted = await waitFor(s => !s.renderer); assert.equal(interrupted.current, null); assert.equal(interrupted.history[0].status, 'interrupted');
  } finally { preview?.terminate(); screen?.terminate(); await app.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
