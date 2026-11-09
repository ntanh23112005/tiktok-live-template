import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listMusic } from '../src/music.js';
import { isMusicFile, musicURL } from '../public/js/music-files.js';
import { validateConfig } from '../src/core.js';
const defaults = JSON.parse(fs.readFileSync(new URL('../config/default.json',import.meta.url)));
defaults.participation.likesEnabled=true;

test('music selection accepts local tracks, preserves percentages and rejects escaping the library', () => {
  for (const file of ['music.mp3','music.wav','music/sen-tinh.mp3','music/Tĩnh tâm (1).MP3']) {
    assert.equal(isMusicFile(file),true);
    const c = validateConfig({...structuredClone(defaults),musicFile:file,musicVolume:.01});
    assert.equal(c.musicFile,file); assert.equal(c.musicVolume,.01);
  }
  assert.equal(musicURL('music/Tĩnh tâm (1).MP3'),'/assets/music/T%C4%A9nh%20t%C3%A2m%20(1).MP3');
  assert.equal(validateConfig({...structuredClone(defaults),musicFile:''}).musicFile,'');
  for (const file of ['../outside.mp3','music/../outside.mp3','music/..\\outside.mp3','music/%2e%2e.mp3','music/sub/track.mp3','https://example.org/music.mp3','music/track.mp3?x=1','music/.hidden.mp3','music/script.js']) {
    assert.equal(isMusicFile(file),false,file); assert.throws(() => validateConfig({...structuredClone(defaults),musicFile:file}));
    assert.equal(musicURL(file),'');
  }
});

test('music library lists actual files only and rescans additions without a restart', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'temple-music-'));
  try {
    fs.mkdirSync(path.join(dir,'music'));
    fs.writeFileSync(path.join(dir,'music.mp3'),'legacy');
    fs.writeFileSync(path.join(dir,'music','sen-tinh.mp3'),'track');
    fs.writeFileSync(path.join(dir,'music','notes.txt'),'ignored');
    const metadataPath=path.join(dir,'catalog.json');
    fs.writeFileSync(metadataPath,JSON.stringify([{file:'music/sen-tinh.mp3',title:'Sen tĩnh'},{file:'music/missing.mp3',title:'Không có'}]));
    const catalog=listMusic({assetsDir:dir,metadataPath});
    assert.deepEqual(catalog.tracks.map(t=>t.file),['music/sen-tinh.mp3','music.mp3']);
    assert.equal(catalog.tracks[0].title,'Sen tĩnh');
    fs.writeFileSync(path.join(dir,'music','Tĩnh tâm.ogg'),'new');
    const refreshed=listMusic({assetsDir:dir,metadataPath});
    assert.equal(refreshed.tracks.length,3); assert.ok(refreshed.tracks.some(t=>t.url==='/assets/music/T%C4%A9nh%20t%C3%A2m.ogg'));
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
