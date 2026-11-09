// Shared by config validation, the local library and the browser player.
export function isMusicFile(file) {
  if (typeof file !== 'string' || file.length > 180) return false;
  if (/^music\.(mp3|wav|m4a|ogg)$/i.test(file)) return true;
  if (!file.startsWith('music/')) return false;
  const name = file.slice(6);
  return !name.includes('..') && /^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._()-]*\.(mp3|wav|m4a|ogg)$/iu.test(name);
}
export const musicURL = file => isMusicFile(file) ? '/assets/' + file.split('/').map(encodeURIComponent).join('/') : '';
