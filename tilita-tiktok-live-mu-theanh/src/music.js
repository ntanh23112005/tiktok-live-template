import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMusicFile, musicURL } from '../public/js/music-files.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function listMusic({ assetsDir = path.join(projectRoot,'public','assets'), metadataPath = path.join(projectRoot,'config','music.json') } = {}) {
  let metadata = [];
  try { const value = JSON.parse(fs.readFileSync(metadataPath,'utf8')); if (Array.isArray(value)) metadata = value; } catch {}
  const names = new Set();
  const scan = (dir, prefix = '') => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const file = prefix + entry.name;
      if (entry.isFile() && isMusicFile(file)) names.add(file);
    }
  };
  scan(assetsDir); scan(path.join(assetsDir,'music'),'music/');
  const order = new Map(metadata.map((m,i) => [m.file,i]));
  const tracks = [...names].sort((a,b) => (order.get(a) ?? 9999) - (order.get(b) ?? 9999) || a.localeCompare(b,'vi')).map(file => {
    const label = metadata.find(m => m.file === file)?.title;
    return { file, title: typeof label === 'string' && label.trim() ? label.trim().slice(0,120) : file.replace(/^music\//,'').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '), url: musicURL(file) };
  });
  return { tracks, folder: 'public/assets/music' };
}
