export const ACTIONS = Object.freeze({ 'fan-card':'Lật thẻ meme MU', 'cave-door':'Đóng cửa hang!', antony:'Compa Antony', siuuu:'SIUUU!', ole:'Ole cầm lái', fergie:'Fergie Time', ggmu:'GGMU — Mở hội!', cheer:'Cổ vũ cùng hang',visit:'Vào hang · Vái Carrick' });
import {MEME_SCENES} from './meme-scenes.js';
export const SCENES = Object.freeze({ 'fan-card':{duration:14000},...Object.fromEntries(Object.entries(MEME_SCENES).map(([id,spec])=>[id,{duration:spec.duration}])), cheer:{duration:4500},visit:{duration:900} });
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function speechBusy(job,elapsed){return !!job&&((!!job.fanCard?.audio&&elapsed>=job.fanCard.readAt&&elapsed<job.fanCard.readAt+job.fanCard.audio.duration*1000)||(!!job.cue&&elapsed>=job.cue.readAt&&elapsed<job.cue.readAt+job.cue.duration*1000));}
export function presentationBusy(job,elapsed){return speechBusy(job,elapsed)||!!(job&&MEME_SCENES[job.action]&&elapsed>=(job.actionStartDelay||0)&&elapsed<(job.effectEnd??(job.actionStartDelay||0)+(job.actionDuration||job.duration)));}
export function sampleAction(job,elapsed) {
  const delay=job.actionStartDelay||0,t=Math.max(0,elapsed-delay),duration=job.actionDuration||job.duration-delay;
  const cueStart=job.cue?.readAt??delay+duration,cuePlaying=!!job.cueDuration&&elapsed>=cueStart&&elapsed<cueStart+job.cueDuration;
  const effectEnd=job.effectEnd??Math.max(delay+duration,cueStart+(job.cueDuration||0));
  const thanking=elapsed<(job.thanksDuration||0),intro=job.procession&&elapsed<delay&&!thanking,returning=!!job.returnDuration&&elapsed>=effectEnd;
  const home=job.home||{x:540,y:1650},pre=Math.max(0,elapsed-(job.thanksDuration||0)),walkPose=Math.floor(elapsed/180)%2?'walkR':'walkL';
  let x=540,y=1120,scale=.67,pose='standing',phase=ACTIONS[job.action],walking=false;
  if(intro) {
    if(pre<1400){const p=clamp(pre/1400);x=home.x+(540-home.x)*Math.min(1,p*2);y=home.y+(1120-home.y)*p;scale=.88-(.88-.55)*p;pose=walkPose;walking=true;phase='Đi lên chào Chủ nhiệm Carrick';}
    else{const bow=pre-1400;scale=.55;pose=bow<450?'bowStand':bow<850?'bowKneel':bow<1650?'bowLow':bow<2150?'bowKneel':'bowStand';phase='Vái Chủ nhiệm Carrick';}
  } else if(returning) {
    const p=clamp((elapsed-effectEnd)/(job.returnDuration||1500));x=540+(home.x-540)*Math.max(0,(p-.45)/.55);y=1120+(home.y-1120)*p;scale=.67+(.88-.67)*p;pose=p>.9?'sitting':walkPose;walking=p<=.9;phase='Về chỗ ngồi trong hang';
  } else if(!thanking) {
    const entry=!job.procession&&t<1100;walking=entry;
    if(entry){const p=clamp(t/1100);y=1650-530*p;pose=walkPose;scale=.88-.21*p;}
    else pose=({'cave-door':'crying',antony:'kicking',siuuu:'celebrating',ole:'sitting',fergie:t<2300?'kicking':'celebrating',ggmu:'celebrating',cheer:'celebrating',visit:'sitting'})[job.action]||'standing';
    if(job.action==='fergie')phase=t<2300?'90+ · Chưa hết giờ là chưa hết hy vọng!':'VÀOOO! Fergie Time!';
  }
  if(cuePlaying){pose='celebrating';phase='Meme · '+ACTIONS[job.action];}
  const meme=!thanking&&!intro&&!returning&&elapsed<effectEnd&&!!MEME_SCENES[job.action];
  return { action:job.action,t,elapsed,thanking,intro,returning,cuePlaying,walking,pose,x,y,scale,meme,progress:clamp(t/duration),
    opacity:thanking?0:job.procession?clamp((job.duration-elapsed)/180):clamp(t/250)*clamp((effectEnd-elapsed)/350),
    card:!intro&&!returning&&!cuePlaying&&job.action==='fan-card'&&t>=2000,
    group:!thanking&&!intro&&!returning&&((job.action==='ggmu'&&t>=2200)||(job.action==='fergie'&&t>=2300)),
    phase,
  };
}
