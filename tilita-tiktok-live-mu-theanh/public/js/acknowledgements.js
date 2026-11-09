import {createNarration} from './narration.js';
export function createAcknowledgements({element,isPrimary,getConfig,onDucking,applause,onError=()=>{}}) {
  const portrait=element.querySelector('img'),initial=element.querySelector('.ack-initial'),name=element.querySelector('strong'),message=element.querySelector('.ack-message'),line=element.querySelector('.ack-scroll');
  let item=null,lastId=null,clapped=false,pausedElapsed=null;
  const voice=createNarration({isPrimary,getConfig,onDucking,onError,getTrack:event=>event?{audio:event.audio,readAt:0}:null});
  function set(next,force=false){
    item=next;if(next?.id===lastId&&!force)return;lastId=next?.id;clapped=false;pausedElapsed=null;voice.setJob(next);
    element.hidden=!next;if(!next)return;
    name.textContent=next.nickname;message.textContent=next.message;initial.textContent=Array.from(next.nickname)[0]||'M';
    let url='';try{const candidate=new URL(next.avatar);if(['https:','http:'].includes(candidate.protocol))url=candidate.href;}catch{}
    portrait.hidden=!url;initial.hidden=!!url;if(url)portrait.src=url;portrait.onerror=()=>{portrait.hidden=true;initial.hidden=false;};
  }
  function frame(blocked,unlocked){
    if(!item){element.hidden=true;return;}
    let elapsed=Math.max(0,Date.now()-item.startedAt);if(blocked){pausedElapsed??=elapsed;elapsed=pausedElapsed;}else pausedElapsed=null;
    element.hidden=elapsed>=item.duration;if(element.hidden){voice.stop();return;}
    const width=line.parentElement.clientWidth,progress=Math.min(1,elapsed/Math.max(1,item.duration));line.style.transform=`translateX(${width-(width+line.scrollWidth)*progress}px)`;
    voice.sample(item,elapsed,unlocked,blocked);
    if(!blocked&&!clapped&&unlocked&&isPrimary()){clapped=true;if(item.applause)applause();}
  }
  return {set,frame,stop(){voice.stop();item=null;lastId=null;element.hidden=true;}};
}
