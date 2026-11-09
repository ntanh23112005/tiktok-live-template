import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { randomInt } from 'node:crypto';

export const FAN_CARDS = JSON.parse(fs.readFileSync(new URL('../config/fan-cards.json', import.meta.url), 'utf8')).map(f => {
  const readText = `Thẻ fan MU số ${f.number}! ${f.title}! ${f.message}`;
  return { ...f, readText, textVersion: createHash('sha256').update(readText).digest('hex').slice(0, 16) };
});
export function loadFanCardAudio() {
  let manifest = { items: [] };
  try { manifest = JSON.parse(fs.readFileSync(new URL('../public/assets/fan-cards/manifest.json', import.meta.url), 'utf8')); } catch {}
  const items = FAN_CARDS.map(f => {
    const a = manifest.items?.find(a => a.id === f.id && a.textVersion === f.textVersion && a.voice === 'tiendat');
    const valid = a && /^[a-z0-9-]+\.(wav|mp3)$/.test(a.file) && Number.isFinite(a.duration) && a.duration > 0 && a.duration <= 32 && fs.existsSync(new URL('../public/assets/fan-cards/' + a.file, import.meta.url));
    return { ...f, audio: valid ? { url: '/assets/fan-cards/' + a.file, duration: a.duration, voice: a.voice } : null };
  });
  return { items, ready: items.filter(f => f.audio).length, total: items.length, missing: items.filter(f => !f.audio).map(f => f.number), voice: manifest.voice || 'Chưa có bộ giọng' };
}
export function pickFanCard(catalog) { return catalog.items[randomInt(catalog.items.length)]; }
