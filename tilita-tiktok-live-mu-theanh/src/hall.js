import { VISIBLE_HALL_CAPACITY, PINNED_DONORS, HALL_ROTATION_MS, roleForRank } from '../public/js/experience.js';
export function hallView(leaders,participants,now=0,startedAt=0) {
  const roster=new Map(Object.values(participants||{}).map(u=>[u.id,{...u,coins:0,gifts:0,kind:'participant',role:'fan'}]));
  leaders.forEach((u,i)=>roster.set(u.id,{...roster.get(u.id),...u,rank:i+1,kind:'contributor',role:roleForRank(i+1)}));
  const pinned=leaders.slice(0,PINNED_DONORS).map(u=>({...roster.get(u.id),pinned:true})),ids=new Set(pinned.map(u=>u.id));
  const guests=[...roster.values()].filter(u=>!ids.has(u.id)).sort((a,b)=>(a.joinedOrder??a.attainedOrder??0)-(b.joinedOrder??b.attainedOrder??0)||a.id.localeCompare(b.id));
  const size=VISIBLE_HALL_CAPACITY-PINNED_DONORS,pages=Math.max(1,Math.ceil(guests.length/size)),page=Math.floor(Math.max(0,now-startedAt)/HALL_ROTATION_MS)%pages;
  const visible=guests.slice(page*size,(page+1)*size);
  return {seats:[...Array.from({length:PINNED_DONORS},(_,i)=>pinned[i]||null),...visible],totalParticipants:roster.size,rotationPage:page+1,rotationPages:pages,offscreenParticipants:guests.length-visible.length};
}
export const hallSeats=(...args)=>hallView(...args).seats;
