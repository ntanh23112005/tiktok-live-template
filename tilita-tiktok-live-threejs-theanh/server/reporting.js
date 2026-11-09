import { randomUUID } from 'node:crypto';

const counters = () => ({ comments: 0, follows: 0, likes: 0, gifts: 0, coins: 0, queued: 0, completed: 0, skipped: 0, cancelled: 0, rejected: 0 });
const session = now => ({ id: randomUUID(), startedAt: now, endedAt: null, live: counters(), demo: counters(), donors: {} });
const csvCell = value => {
  const text = String(value ?? '');
  return `"${(typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
};

export class SessionReports {
  constructor(saved = {}, now = Date.now) {
    this.now = now;
    this.current = saved.current || session(now());
    this.archives = (saved.archives || []).slice(-20);
  }
  record(event, key, amount = 1) {
    const stats = event.simulated ? this.current.demo : this.current.live;
    stats[key] = (stats[key] || 0) + amount;
    if (key === 'coins' && !event.simulated) {
      const id = String(event.userId);
      const donor = Object.hasOwn(this.current.donors, id) ? this.current.donors[id] : { userId: id, username: event.username, coins: 0, gifts: 0 };
      donor.username = event.username; donor.coins += amount; donor.gifts += event.quantity || 1;
      Object.defineProperty(this.current.donors, id, { value: donor, writable: true, enumerable: true, configurable: true });
    }
  }
  snapshot(report = this.current) {
    return { ...report, donors: Object.values(report.donors).sort((a, b) => b.coins - a.coins || a.username.localeCompare(b.username)) };
  }
  publicState() {
    const current = this.snapshot();
    return { ...current, donors: current.donors.slice(0, 100), donorCount: current.donors.length,
      archives: this.archives.map(({ id, startedAt, endedAt, live, demo }) => ({ id, startedAt, endedAt, live, demo })).reverse() };
  }
  start() {
    this.current.endedAt = this.now();
    this.archives.push(this.current); this.archives = this.archives.slice(-20);
    this.current = session(this.now());
  }
  export(id) {
    const report = !id || id === this.current.id ? this.current : this.archives.find(item => item.id === id);
    if (!report) throw new Error('Session report not found.');
    return this.snapshot(report);
  }
  serialize() { return { current: this.current, archives: this.archives }; }
}

export function reportCSV(report) {
  const rows = [['section', 'metric / username', 'value', 'gift units'],
    ['session', 'id', report.id], ['session', 'started_at', new Date(report.startedAt).toISOString()],
    ['session', 'ended_at', report.endedAt ? new Date(report.endedAt).toISOString() : 'In progress']];
  for (const mode of ['live', 'demo']) for (const [key, value] of Object.entries(report[mode])) rows.push([mode, key, value]);
  for (const donor of report.donors) rows.push(['donor', donor.username, donor.coins, donor.gifts]);
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
