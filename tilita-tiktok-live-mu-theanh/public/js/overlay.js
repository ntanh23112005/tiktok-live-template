import {createSprite,preloadArt} from './art.js';
import {sampleAction,presentationBusy} from './actions.js';
import {ROLE_LABELS} from './experience.js';
import {createHall} from './hall.js';
import {createDialogues} from './dialogues.js';
import {createAcknowledgements} from './acknowledgements.js';
import {createEffects,renderGiftBoard} from './effects.js';
import {createNarration} from './narration.js';
import {musicURL} from './music-files.js';
const $=id=>document.getElementById(id),preview=location.pathname==='/preview';document.body.classList.toggle('preview',preview);
const actor=createSprite('male',220);$('actorSprite').append(actor.element);
const hall=createHall($('hall')),dialogues=createDialogues($('interactionBubbles')),effects=createEffects($('effectLayer'),$('particles'));renderGiftBoard($('giftTiers'));
const ready=preloadArt();
function fit(){$('stage').style.transform=`scale(${Math.min(innerWidth/1080,innerHeight/1920)})`;}addEventListener('resize',fit);fit();
let state,self,ws,lastJob,sentComplete,ctx,music,musicPath,ducked=false,lastFrame=0,milestones=new Set(),sounds=new Set(),musicEnded=false;
const duckers=new Set();function duck(owner,value){if(value)duckers.add(owner);else duckers.delete(owner);ducked=duckers.size>0;updateMusic();}
const primary=()=>!preview&&self&&state?.renderer===self,unlocked=()=>ctx?.state==='running';
const narration=createNarration({isPrimary:primary,getConfig:()=>state.config,onError:id=>send('audio-error',{id}),onDucking:value=>duck('card',value)});
const meme=createNarration({isPrimary:primary,getConfig:()=>state.config,getTrack:job=>job?.cue?{audio:job.cue,readAt:job.cue.readAt}:null,volumeKey:'volume',voice:false,onDucking:value=>duck('meme',value),onError:id=>send('audio-error',{id})});
const acknowledgements=createAcknowledgements({element:$('acknowledgement'),isPrimary:primary,getConfig:()=>state.config,onDucking:value=>duck('ack',value),applause:()=>sfx('applause'),onError:id=>send('ack-audio-error',{id})});
function send(type,data={}){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type,...data}));}
function stopSounds(){for(const audio of sounds){audio.pause();audio.removeAttribute('src');audio.load();}sounds.clear();}
function sfx(name){const cue=state?.sounds?.byId?.[name];if(!cue||!primary()||!unlocked()||!state.config.volume)return;const audio=new Audio(cue.url);audio.volume=state.config.volume;sounds.add(audio);audio.onended=()=>sounds.delete(audio);audio.onerror=()=>sounds.delete(audio);audio.play().catch(()=>sounds.delete(audio));}
async function enableAudio(){if(!primary())return;try{ctx||=new AudioContext();await ctx.resume();$('enableAudio').hidden=unlocked();send('audio',{enabled:unlocked()});updateMusic();}catch{$('enableAudio').hidden=false;}}
$('enableAudio').onclick=enableAudio;
function updateMusic(){const filename=state?.config.musicFile;if(!primary()||!filename||!unlocked()){music?.pause();return;}if(musicPath!==filename){music?.pause();music=new Audio(musicURL(filename));musicPath=filename;musicEnded=false;music.onerror=()=>{$('connection').hidden=false;$('connection').textContent='Nhạc bị lỗi. Chọn lại bài trong admin.';};music.onended=()=>musicEnded=true;}music.loop=state.config.musicLoop!==false;music.volume=state.config.musicVolume*(ducked ? .316 : 1);if(music.loop)musicEnded=false;if(music.paused&&!musicEnded)music.play().catch(()=>{$('enableAudio').hidden=false;});}
const safeImage=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
function setJob(job){narration.setJob(job);meme.setJob(job);stopSounds();effects.clear();effects.setJob(job);hall.animate(false,null);milestones=new Set();document.body.classList.remove('reading-card','thanking-donor');$('donationThanks').hidden=$('fanCard').hidden=$('actor').hidden=true;if(!job)return;
  const skin=job.character||'male';actor.set(skin);
  $('actorName').textContent=job.nickname;$('actorAction').textContent=state.actions[job.action];
  if(job.thanks){const thanks=job.thanks;$('thanksName').textContent=thanks.nickname;$('thanksCoins').textContent=Number(thanks.coins).toLocaleString('vi-VN')+' xu';$('thanksGift').textContent=`${thanks.giftName} ×${thanks.quantity}${job.simulated?' · Mô phỏng':''}`;const image=safeImage(thanks.avatar);$('thanksAvatar').hidden=!image;$('thanksInitial').hidden=!!image;$('thanksInitial').textContent=Array.from(thanks.nickname)[0]||'M';if(image)$('thanksAvatar').src=image;$('thanksAvatar').onerror=()=>{$('thanksAvatar').hidden=true;$('thanksInitial').hidden=false;};}
  if(job.fanCard){$('cardNumber').textContent=`THẺ FAN MU · ${String(job.fanCard.number).padStart(2,'0')}/99`;$('cardTitle').textContent=job.fanCard.title;$('cardMessage').textContent=job.fanCard.message;$('cardRecipient').textContent='Gửi '+job.nickname;}
}
function render(s){const previous=state?.renderer;state=s;$('title').textContent=s.config.sceneTitle;$('channel').textContent=s.source.status==='connected'?'@'+s.source.username:'Vào hang cùng anh em';$('memberCount').textContent=s.hall.totalParticipants;$('giftBoard').hidden=!s.config.showGiftBoard;$('ranking').hidden=!s.config.showLeaderboard;$('rankingTitle').textContent=s.hall.mode==='demo'?'TOP MÔ PHỎNG':'Fan cứng';
  $('top').replaceChildren();const leaders=s.hall.leaderboard.slice(0,7);if(!leaders.length){const p=document.createElement('p');p.textContent='Chưa có fan tặng quà';$('top').append(p);}for(const [i,u] of leaders.entries()){const row=document.createElement('div');row.className='rank-row';const name=document.createElement('span'),role=document.createElement('small');name.textContent=`${i+1}. ${u.name}`;role.textContent=ROLE_LABELS[u.role]||'Fan MU';row.append(name,role);$('top').append(row);}
  hall.render(s.hall);$('hallRoster').textContent=`${s.hall.totalParticipants} fan đã vào hang · Nhóm ${s.hall.rotationPage}/${s.hall.rotationPages}${s.hall.mode==='demo'?' · MÔ PHỎNG':''}`;
  dialogues.render(s.hall,s.interactions);
  acknowledgements.set(s.acknowledgements?.current||null);
  $('nextName').textContent=s.queue[0]?.nickname||'Chờ anh em vào hang';$('waiting').textContent=`${s.queue.length} lượt chờ${s.paused?' · Tạm dừng':''}`;
  if(s.current?.id!==lastJob){lastJob=s.current?.id;sentComplete=null;setJob(s.current);}
  if(previous!==s.renderer){if(primary()){narration.setJob(s.current);meme.setJob(s.current);acknowledgements.set(s.acknowledgements?.current||null,true);enableAudio();}else{narration.stop();meme.stop();stopSounds();}}
  $('enableAudio').hidden=preview||!primary()||unlocked();updateMusic();
}
function frame(time){requestAnimationFrame(frame);if(time-lastFrame<1000/30)return;lastFrame=time;effects.draw();if(!state)return;
  const seconds=Math.max(0,Math.floor((Date.now()-state.hall.startedAt)/1000));$('sessionClock').textContent=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
  const job=state.current,t=job?Math.max(0,Date.now()-job.startedAt):0,scene=job?sampleAction(job,t):null;
  acknowledgements.frame(presentationBusy(job,t),unlocked());
  dialogues.frame(!!scene&&(scene.thanking||scene.intro||scene.card||scene.group||scene.meme));
  if(!scene){$('actor').hidden=true;return;}
  $('donationThanks').hidden=!scene.thanking;document.body.classList.toggle('thanking-donor',scene.thanking);$('fanCard').hidden=!scene.card;document.body.classList.toggle('reading-card',scene.card);$('actor').hidden=scene.thanking||scene.card||scene.meme;
  if(scene.thanking){effects.sample(null);return;}
  narration.sample(job,t,unlocked());meme.sample(job,t,unlocked());const skin=job.character||'male';actor.set(skin,scene.pose);
  let jump=0,turn=0;if(job.action==='siuuu'&&scene.t>1300&&scene.t<2600){const p=(scene.t-1300)/1300;jump=-Math.sin(p*Math.PI)*100;turn=p*360;}if(job.action==='antony'&&scene.t>1100&&scene.t<4400)turn=(scene.t-1100)/3300*720;
  $('actor').style.left=scene.x+'px';$('actor').style.top=scene.y-300+50*scene.scale+jump+'px';$('actor').style.opacity=scene.opacity;$('actor').style.transform=`translateX(-50%) scale(${scene.scale}) rotateY(${turn}deg)`;$('actorAction').textContent=scene.phase;
  hall.animate(scene.group,job.userId);effects.sample(scene,job);
  if(!scene.intro&&!scene.returning&&!milestones.has('start')){milestones.add('start');if(job.action==='visit')sfx('applause');}
  if(scene.card&&!milestones.has('card')){milestones.add('card');effects.burst(45,1120);}
  if(t>=job.duration&&primary()&&sentComplete!==job.id){sentComplete=job.id;send('complete',{id:job.id});}
}
requestAnimationFrame(frame);
function connect(){ws=new WebSocket(`ws://${location.host}/ws?role=${preview?'preview':'overlay'}`);ws.onmessage=async event=>{const message=JSON.parse(event.data);if(message.type==='hello'){self=message.data.id;try{await ready;if(!preview)send('ready');$('connection').hidden=true;}catch(error){$('connection').hidden=false;$('connection').textContent='Thiếu hoặc lỗi bộ hình MU: '+error.message;}}if(message.type==='state')render(message.data);if(message.type==='effect')sfx('applause');};ws.onclose=()=>{narration.stop();meme.stop();acknowledgements.stop();stopSounds();music?.pause();effects.clear();hall.animate(false,null);$('actor').hidden=$('donationThanks').hidden=$('fanCard').hidden=$('interactionBubbles').hidden=true;lastJob=undefined;$('connection').hidden=false;$('connection').textContent='Mất kết nối · Đang thử lại';setTimeout(connect,2000);};}
addEventListener('pagehide',()=>{narration.stop();meme.stop();acknowledgements.stop();stopSounds();music?.pause();ws?.close();});connect();


