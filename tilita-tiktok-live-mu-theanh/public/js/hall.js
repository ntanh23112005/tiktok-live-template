import {HALL_LAYOUT,ROLE_LABELS} from './experience.js';
import {createSprite} from './art.js';
const safeImage=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
export function createHall(parent) {
  const seats=new Map();let activeId=null,party=false;
  function render(hall) {
    const active=new Set();(hall?.seats||[]).forEach((user,index)=>{
      if(!user)return;active.add(user.id);let seat=seats.get(user.id);
      if(!seat) {
        const element=document.createElement('div');element.className='seat';element.setAttribute('role','listitem');
        const sprite=createSprite(user.character||'ronaldo',index<3?143:index<7?135:105,index<7?155:70),badge=document.createElement('div');badge.className='seat-badge';
        const avatar=document.createElement('img'),rank=document.createElement('em'),name=document.createElement('b');avatar.alt='';avatar.onerror=()=>avatar.hidden=true;badge.append(avatar,rank,name);
        const crown=document.createElement('span');crown.className='role-crown';crown.innerHTML='<svg viewBox="0 0 40 25" fill="currentColor"><path d="m2 3 9 7L20 0l9 10 9-7-4 20H6z"/></svg>';
        const band=document.createElement('span');band.className='role-band';element.append(sprite.element,crown,band,badge);parent.append(element);seat={element,sprite,avatar,rank,name,crown,band};seats.set(user.id,seat);
      }
      seat.user=user;seat.sprite.resize(index<3?143:index<7?135:105,index<7?155:70);const point=HALL_LAYOUT[index];seat.element.style.left=point.x+'px';seat.element.style.top=point.y+'px';seat.element.style.zIndex=String(5+point.row);seat.element.style.scale=point.scale;
      seat.element.className='seat '+user.role+(user.id===activeId?' active-actor':'');seat.element.dataset.userId=user.id;seat.element.dataset.role=user.role;
      seat.name.textContent=user.name;seat.rank.textContent=user.rank?String(user.rank):'';seat.element.title=`${user.name} · ${ROLE_LABELS[user.role]||ROLE_LABELS.fan}`;
      seat.crown.hidden=user.role!=='chief';seat.band.hidden=user.role==='fan';
      const avatar=safeImage(user.avatar);seat.avatar.hidden=!avatar;if(avatar&&seat.avatar.src!==avatar)seat.avatar.src=avatar;
      seat.sprite.set(user.character||'ronaldo',party?'celebrating':user.preferredPose||'standing');
    });
    for(const [id,seat] of seats)if(!active.has(id)){seat.element.remove();seats.delete(id);}
  }
  function animate(celebrating,id) {party=celebrating;activeId=id;for(const [key,seat] of seats){seat.element.classList.toggle('active-actor',key===id);seat.sprite.set(seat.user.character||'ronaldo',party?'celebrating':seat.user.preferredPose||'standing');}}
  return {render,animate};
}
