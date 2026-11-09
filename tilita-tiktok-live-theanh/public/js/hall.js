import { createPose } from './temple-art.js?v=wooden-v1';
import { bowPose } from './rituals.js';
import { HALL_LAYOUT } from './experience.js';

export function createHall(parent) {
  let signature = '', collective = false, pending = null;
  const seats = new Map();
  const render = hall => {
    if (collective) { pending = hall; return; }
    const leaders = hall?.seats || hall?.leaderboard || [];
    const next = JSON.stringify([hall?.mode, leaders]);
    if (next === signature) return;
    signature = next; parent.dataset.mode = hall?.mode || 'live';
    const retained = new Set();
    HALL_LAYOUT.forEach((slot, index) => {
      const user = leaders[index], key = user ? `user:${user.id}` : `empty:${index}`;
      retained.add(key);
      let seat = seats.get(key);
      if (!seat) {
        const element = document.createElement('div'); element.setAttribute('role', 'listitem');
        element.innerHTML = '<span class="seat-pad"></span>';
        const frames = user ? [3, 4, 5, 6, 7].map(pose => {
          const frame = createPose(pose, 112); frame.classList.add('hall-pose'); frame.classList.toggle('active', pose === 3); element.append(frame); return frame;
        }) : [];
        if (user) element.insertAdjacentHTML('beforeend', '<div class="seat-badge"><b class="seat-rank"></b><span class="seat-avatar"></span><strong class="seat-name"></strong></div>');
        else element.insertAdjacentHTML('beforeend', '<small class="seat-vacant"></small>');
        seat = { element, frames, pose: 3 }; seats.set(key, seat); parent.append(element);
      }
      const element = seat.element;
      seat.row = slot.row;
      const donor = user && user.coins > 0;
      element.className = `hall-person ${user ? 'occupied' : 'empty'}${user?.pinned ? ' vip front-row' : ''}${user && !donor ? ' participant' : ''}`;
      Object.assign(element.style, { left: slot.x + 'px', top: slot.y + 'px', zIndex: String(10 + slot.row), transform: `translateX(-50%) scale(${slot.scale})` });
      element.dataset.rank = index + 1;
      if (user) {
        element.dataset.userId = user.id;
        element.setAttribute('aria-label', `${donor ? `Hạng ${user.rank}` : `Chỗ thiền ${index + 1}`}: ${user.name}${donor ? `, ${user.coins} xu` : ', đang ngồi thiền'}${hall.mode === 'demo' ? ', mô phỏng' : ''}`);
        element.querySelector('.seat-rank').textContent = donor ? user.rank : '•';
        const label = element.querySelector('.seat-name'); label.textContent = user.name; label.title = `${user.name} · ${donor ? `${user.coins.toLocaleString('vi-VN')} xu` : 'Đang ngồi thiền'}`;
        const avatar = element.querySelector('.seat-avatar');
        if (seat.avatar !== user.avatar || seat.name !== user.name) {
          avatar.replaceChildren(); avatar.textContent = user.name.slice(0, 1).toUpperCase();
          try { const url = new URL(user.avatar); if (['https:', 'http:'].includes(url.protocol)) { const img = new Image(); img.src = url.href; img.alt = ''; img.onerror = () => img.remove(); avatar.append(img); } } catch {}
          seat.avatar = user.avatar; seat.name = user.name;
        }
      } else { element.setAttribute('aria-label', index<4?`Chỗ top ${index+1} còn trống`:'Chỗ thiền còn trống'); element.querySelector('.seat-vacant').textContent = index<4?`Top ${index+1}`:''; }
    });
    for (const [key, seat] of seats) if (!retained.has(key)) { seat.element.remove(); seats.delete(key); }
  };
  const animate = time => {
    collective = time !== null;
    parent.classList.toggle('collective', collective);
    if (!collective && pending) { const next = pending; pending = null; render(next); }
    for (const seat of seats.values()) {
      const pose = time === null ? 3 : bowPose(Math.max(-1, time - seat.row * 130));
      if (seat.pose === pose) continue;
      seat.pose = pose;
      for (const frame of seat.frames) frame.classList.toggle('active', Number(frame.dataset.pose) === pose);
    }
  };
  return { render, animate };
}
