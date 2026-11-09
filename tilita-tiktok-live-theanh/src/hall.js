import { VISIBLE_HALL_CAPACITY, PINNED_DONORS, HALL_ROTATION_MS } from '../public/js/experience.js';

// Top four contributors stay in front; everyone else takes a rotating display slot.
// Display capacity limits the DOM, never the session membership.
export function hallView(leaders, participants, now = 0, startedAt = 0) {
  const donors = leaders.slice(0, PINNED_DONORS).map((user, i) => ({ ...user, kind: 'contributor', rank: i + 1, pinned: true }));
  const donorIds = new Set(donors.map(user => user.id));
  const roster = new Map(Object.values(participants || {}).map(user => [user.id,{...user,coins:0,gifts:0,kind:'participant'}]));
  leaders.forEach((user,i)=>roster.set(user.id,{...roster.get(user.id),...user,kind:'contributor',rank:i+1}));
  const guests = [...roster.values()]
    .filter(user => !donorIds.has(user.id))
    .sort((a,b)=>(a.joinedOrder??a.attainedOrder??0)-(b.joinedOrder??b.attainedOrder??0)||a.id.localeCompare(b.id));
  const size=VISIBLE_HALL_CAPACITY-PINNED_DONORS,pages=Math.max(1,Math.ceil(guests.length/size));
  const page=Math.floor(Math.max(0,now-startedAt)/HALL_ROTATION_MS)%pages;
  const visible=guests.slice(page*size,(page+1)*size);
  return {seats:[...Array.from({length:PINNED_DONORS},(_,i)=>donors[i]||null),...visible],totalParticipants:roster.size,rotationPage:page+1,rotationPages:pages,offscreenParticipants:guests.length-visible.length};
}
export const hallSeats=(leaders,participants,now=0,startedAt=0)=>hallView(leaders,participants,now,startedAt).seats;
