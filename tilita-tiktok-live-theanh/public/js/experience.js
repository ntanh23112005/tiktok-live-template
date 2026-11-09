// Shared tiers, top-donor ranking limit and the bounded rotating hall viewport.
export const SCENE_VERSION = 'wooden-temple-v2';
export const RUNTIME_REVISION = 'wooden-temple-v2.7';
export const HALL_CAPACITY = 40;
export const VISIBLE_HALL_CAPACITY = 28;
export const PINNED_DONORS = 4;
export const HALL_ROTATION_MS = 10000;
export const GIFT_TIERS = Object.freeze([
  { min: 1, label: 'Xin quẻ', action: 'fortune', icon: 'fortune' },
  { min: 3, label: 'Dâng hương', action: 'incense', icon: 'incense' },
  { min: 5, label: 'Hoa sen', action: 'lotus', icon: 'lotus' },
  { min: 10, label: 'Hoa đăng nguyện', action: 'prayer', icon: 'lantern' },
  { min: 30, label: 'Mâm lễ', action: 'fruit', icon: 'fruit' },
  { min: 100, label: 'Đại hồng chung', action: 'bell', icon: 'bell' },
  { min: 500, label: 'Phật quang phổ chiếu', action: 'grand', icon: 'halo' },
]);
export const giftTier = coins => GIFT_TIERS.findLast(tier => coins >= tier.min);

// Rank proceeds from the aisle outwards, alternating left and right.
export const HALL_LAYOUT = Object.freeze(Array.from({ length: VISIBLE_HALL_CAPACITY }, (_, index) => {
  const front = index < 4, offset = front ? index : index - 4;
  const row = front ? 0 : 1 + Math.floor(offset / 6), column = Math.floor(offset % (front ? 4 : 6) / 2), right = offset % 2;
  return { rank: index + 1, row, column, side: right ? 'right' : 'left',
    x: right ? 660 + column * (front ? 165 : 85) : 365 - column * (front ? 165 : 85),
    y: front ? 1090 : 1220 + (row - 1) * 110, scale: front ? 1.08 : .95 + row * .025 };
}));
