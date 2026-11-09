// At most three dialogues; coalesced per person, coin priority with a normal turn after five donor turns.
export class InteractionFeed {
  constructor(){this.pending=new Map();this.active=[];this.last=null;this.sequence=0;this.order=0;this.nextAt=0;this.priorityRun=0;}
  get current(){return this.active[0]||null;}
  record(e,{coins=0}={}) {
    if(e.kind!=='comment'||!e.comment)return;
    const item={userId:e.userId,nickname:e.nickname,avatar:e.avatar,kind:'comment',text:e.comment.slice(0,120),coins:Math.max(0,Number(coins)||0),count:1};
    const active=this.active.find(a=>a.userId===e.userId);
    if(active){Object.assign(active,{...item,count:active.count+1});return;}
    const old=this.pending.get(e.userId);this.pending.set(e.userId,{...item,count:(old?.count||0)+1,order:old?.order??++this.order});
  }
  tick(now,blocked=false) {
    const delta=this.last===null?0:Math.max(0,now-this.last);this.last=now;
    if(blocked){for(const item of this.active)item.startedAt+=delta;this.nextAt+=delta;return;}
    this.active=this.active.filter(item=>now<item.startedAt+item.duration);
    if(this.active.length>=3||!this.pending.size||now<this.nextAt)return;
    const ordered=[...this.pending.values()].sort((a,b)=>b.coins-a.coins||a.order-b.order);
    const normal=this.priorityRun>=5?[...this.pending.values()].filter(a=>!a.coins).sort((a,b)=>a.order-b.order)[0]:null;
    const item=normal||ordered[0];this.pending.delete(item.userId);this.priorityRun=item.coins?this.priorityRun+1:0;
    this.active.push({...item,id:`activity-${++this.sequence}`,startedAt:now,duration:4000});this.nextAt=now+650;
  }
  snapshot(){return {current:this.current,items:this.active,pendingPeople:this.pending.size,maxVisible:3};}
}
