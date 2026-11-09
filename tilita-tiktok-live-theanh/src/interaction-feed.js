// A burst updates one pending entry per person without pushing others out of line.
export class InteractionFeed {
  constructor() { this.pending=new Map();this.current=null;this.last=null;this.sequence=0;this.nextAt=0; }
  record(e) {
    const labels={like:`Đã thả ${e.likeCount} tim`,follow:'Vừa theo dõi kênh',share:'Vừa chia sẻ buổi LIVE',join:'Vừa vào đạo tràng',gift:`Đã gửi ${e.giftName} ×${e.quantity}`};
    const item={userId:e.userId,nickname:e.nickname,avatar:e.avatar,kind:e.kind,text:e.kind==='comment'?e.comment.slice(0,120):labels[e.kind],count:1};
    if(this.current?.userId===e.userId) { Object.assign(this.current,{...item,count:this.current.count+1});return; }
    const old=this.pending.get(e.userId);this.pending.set(e.userId,{...item,count:(old?.count||0)+1});
  }
  tick(now,blocked=false) {
    const delta=this.last===null?0:Math.max(0,now-this.last);this.last=now;
    if(blocked) { if(this.current)this.current.startedAt+=delta;this.nextAt+=delta;return; }
    if(this.current && now>=this.current.startedAt+4000) {this.current=null;this.nextAt=now+600;}
    if(!this.current && this.pending.size && now>=this.nextAt) {
      const [key,item]=this.pending.entries().next().value;this.pending.delete(key);
      this.current={...item,id:`activity-${++this.sequence}`,startedAt:now,duration:4000};
    }
  }
  snapshot() { return {current:this.current,pendingPeople:this.pending.size}; }
}
