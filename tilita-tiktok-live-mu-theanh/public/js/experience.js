export const SCENE_VERSION = 'mu-cave-v1';
export const RUNTIME_REVISION = 'mu-cave-v1.3';
export const HALL_CAPACITY = 100;
export const PINNED_DONORS = 7;
export const VISIBLE_HALL_CAPACITY = 87;
export const HALL_ROTATION_MS = 10000;
export const GIFT_TIERS = Object.freeze([
  { min: 1, label: 'Lật thẻ meme MU', action: 'fan-card', icon: 'card',priority:10 },
  { min: 3, label: 'Đóng cửa hang!', action: 'cave-door', icon: 'door',priority:30 },
  { min: 5, label: 'Compa Antony', action: 'antony', icon: 'ball',priority:50 },
  { min: 10, label: 'SIUUU!', action: 'siuuu', icon: 'star',priority:100 },
  { min: 30, label: 'Ole cầm lái', action: 'ole', icon: 'wheel',priority:300 },
  { min: 100, label: 'Fergie Time', action: 'fergie', icon: 'clock',priority:1000 },
  { min: 500, label: 'GGMU — Mở hội!', action: 'ggmu', icon: 'trophy',priority:100000000000 },
]);
export const giftTier = coins => GIFT_TIERS.findLast(t => coins >= t.min);
export const roleForRank = rank => rank > 0 && rank <= 3 ? 'chief' : rank <= 7 && rank > 0 ? 'vice' : 'fan';
export const ROLE_LABELS = { chief: 'Bá chủ hang', vice: 'Phó chủ', fan: 'Fan MU' };
export const HALL_LAYOUT = Object.freeze(Array.from({length:VISIBLE_HALL_CAPACITY},(_,i)=>{
  if(i<3) return { x:[365,705,215][i], y:i===2?1220:1175, row:0, scale:1.13, side:i===1?'right':'left' };
  if(i<7) return { x:[385,675,205,855][i-3], y:1295, row:1, scale:1.02, side:i%2?'left':'right' };
  const offset=i-7, row=Math.floor(offset/10), pair=Math.floor(offset%10/2), right=offset%2;
  return { x:right?660+pair*70:390-pair*70, y:1410+row*50, row:row+2, scale:.86+row*.015, side:right?'right':'left' };
}));
