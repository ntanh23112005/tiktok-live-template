// The last three priorities are prototype defaults, not user-confirmed values.
export const RULES = [
  { id: 'comment', trigger: 'Comment', label: 'Draw @username', short: 'Name shot', priority: 1, kind: 'name', size: 1, icon: 'message-circle', color: '#63708a', duration: 5 },
  { id: 'likes', trigger: '100 likes / person', label: 'Draw @username', short: '100 likes', priority: 1, kind: 'name', size: 1, icon: 'heart', color: '#d65377', duration: 5 },
  { id: 'follow', trigger: 'Follow', label: 'Draw mini avatar', short: 'Mini avatar', priority: 5, kind: 'avatar', size: 1.25, icon: 'user-plus', color: '#5f8f77', duration: 5 },
  { id: 'coin1', trigger: '1 coin', label: 'Priority @username', short: 'Priority name', priority: 10, kind: 'name', size: 1, coins: 1, icon: 'fast-forward', color: '#d48c45', duration: 5 },
  { id: 'coin10', trigger: '10 coin', label: 'Draw mini avatar', short: 'Mini avatar', priority: 20, kind: 'avatar', size: 1.25, coins: 10, icon: 'image', color: '#5f8f77', duration: 5 },
  { id: 'coin30', trigger: '30 coin', label: 'Draw Big avatar', short: 'Big avatar', priority: 50, kind: 'avatar', size: 2.65, coins: 30, icon: 'scan-face', color: '#598a9e', duration: 6 },
  { id: 'coin50', trigger: '50 coin', label: 'Medium avatar + name', short: 'Medium + name', priority: 75, provisional: true, kind: 'combo', size: 2.1, coins: 50, icon: 'contact-round', color: '#647cbd', duration: 6 },
  { id: 'coin100', trigger: '100 coin', label: 'BIG avatar + name', short: 'BIG + name', priority: 100, provisional: true, kind: 'combo', size: 3.2, coins: 100, icon: 'sparkles', color: '#ee5266', duration: 7 },
  { id: 'coin500', trigger: '500+ coin', label: 'MEGA STATUE ×200', short: 'Mega statue ×200', priority: 200, provisional: true, kind: 'statue', size: 3.1, scale: 200, coins: 500, icon: 'crown', color: '#b58635', duration: 18 }
];

export function resolveRule(type, coins = 0) {
  if (type !== 'gift') return RULES.find(rule => rule.id === type) ?? null;
  if (!Number.isFinite(coins) || coins < 1) return null;
  return [...RULES].reverse().find(rule => rule.coins && coins >= rule.coins) ?? null;
}

export function sortQueue(queue) {
  return [...queue].sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
}

export class LikeMeter {
  constructor() { this.users = new Map(); }
  add(userId, count) {
    if (!userId || !Number.isFinite(count) || count <= 0) return 0;
    const total = (this.users.get(userId) ?? 0) + Math.floor(count);
    const earned = Math.floor(total / 100);
    this.users.set(userId, total % 100);
    return earned;
  }
  remaining(userId) { return this.users.get(userId) ?? 0; }
}
