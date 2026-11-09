import {randomUUID} from 'node:crypto';
const messages={follow:'Cảm ơn bạn mới đã follow',share:'Cảm ơn bạn đã chia sẻ',likes:'Cảm ơn bạn đã gửi chuỗi 10 tim'};
export class Acknowledgements {
  constructor(){this.pending=new Map();this.current=null;this.last=null;this.recent=new Map();}
  record(event,kind,audio=null,applause=true){
    const key=`${event.simulated}:${event.room}:${event.userId||event.nickname}:${kind}`,now=event.receivedAt;
    if(this.current?.key===key||this.pending.has(key)||(now-(this.recent.get(key)??-Infinity)<30000))return false;
    this.pending.set(key,{id:randomUUID(),key,kind,nickname:event.nickname,avatar:event.avatar,message:messages[kind],audio,applause,readAt:0,duration:Math.max(6500,Math.ceil((audio?.duration||0)*1000)+1500,(messages[kind].length+event.nickname.length)*65+2000),simulated:event.simulated});
    this.recent.set(key,now);return true;
  }
  tick(now,blocked=false){
    const delta=this.last===null?0:Math.max(0,now-this.last);this.last=now;
    if(blocked){if(this.current)this.current.startedAt+=delta;return;}
    if(this.current&&now>=this.current.startedAt+this.current.duration)this.current=null;
    if(!this.current&&this.pending.size){const [key,item]=this.pending.entries().next().value;this.pending.delete(key);this.current={...item,startedAt:now};}
    for(const [key,time] of this.recent)if(now-time>3600000)this.recent.delete(key);
  }
  snapshot(){return {current:this.current,pending:this.pending.size};}
}
