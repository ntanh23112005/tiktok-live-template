import {HALL_LAYOUT} from './experience.js';
export function createDialogues(parent) {
  const nodes=new Map();
  const intersects=(a,b)=>a.x<b.x+232&&a.x+232>b.x&&a.y<b.y+140&&a.y+140>b.y;
  function render(hall,feed) {
    const items=(feed?.items||[]).slice(0,3),keep=new Set(),placed=[];
    for(const [slot,item] of items.entries()) {
      keep.add(item.id);let node=nodes.get(item.id);
      if(!node){const element=document.createElement('div');element.className='fan-dialogue';const name=document.createElement('strong'),text=document.createElement('p'),count=document.createElement('small');element.append(name,text,count);parent.append(element);node={element,name,text,count};nodes.set(item.id,node);}
      node.item=item;node.name.textContent=item.nickname;node.text.textContent=item.text;node.count.textContent=item.count>1?`${item.count} bình luận · Đã gộp`:'';
      const index=hall?.seats?.findIndex(u=>u?.id===item.userId)??-1,seat=index>=0?HALL_LAYOUT[index]:null;
      node.anchored=!!seat;if(!seat){node.element.hidden=true;continue;}
      const anchor={x:Math.max(30,Math.min(800,seat.x-116)),y:Math.max(1040,seat.y-230)};
      let spot={...anchor};while(placed.some(previous=>intersects(spot,previous)))spot.y-=145;placed.push(spot);
      node.element.style.setProperty('--tail-x',Math.max(16,Math.min(216,seat.x-spot.x))+'px');
      node.element.style.left=spot.x+'px';node.element.style.top=spot.y+'px';node.element.dataset.userId=item.userId;
    }
    for(const [id,node] of nodes)if(!keep.has(id)){node.element.remove();nodes.delete(id);}
  }
  function frame(blocked){parent.hidden=blocked;for(const node of nodes.values())node.element.hidden=!node.anchored||Date.now()>=node.item.startedAt+node.item.duration;}
  return {render,frame};
}
