import {MEME_CAST,memePhase} from './meme-scenes.js';
const clamp=v=>Math.min(1,Math.max(0,v));
const safeImage=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};

export function createEffects(layer,canvas) {
  // Static markup; viewer-provided strings are always assigned with textContent.
  layer.innerHTML=`<div class="meme-stage">
    <div class="meme-backdrop"></div><div class="meme-rays"></div><div class="meme-spotlight left"></div><div class="meme-spotlight right"></div>
    <img class="meme-devil" src="/assets/mu-meme-v1.3/red-devil.png" alt="">
    <div class="meme-flag left"><img src="/assets/mu-cave-v1/manchester-united.svg" alt=""></div><div class="meme-flag right"><img src="/assets/mu-cave-v1/manchester-united.svg" alt=""></div>
    <div class="meme-clock"></div><div class="meme-goal"></div><div class="meme-striker meme-cutout"></div>
    <div class="meme-vortex"><i></i><i></i><i></i></div><div class="meme-skid"></div>
    <div class="meme-hero meme-cutout"></div><div class="meme-ball prop"></div><div class="meme-shock"></div>
    <div class="meme-doors"><div class="meme-door left"><span>HẸN TRẬN</span></div><div class="meme-door right"><span>SAU NHÉ!</span></div></div>
    <div class="meme-face meme-cutout"></div><div class="meme-trophy prop"></div><div class="meme-crowd"></div>
    <div class="meme-heading"><small></small><strong></strong></div><div class="meme-caption"></div>
    <div class="meme-recipient"><img hidden alt=""><span class="meme-initial"></span><div><small>ANH EM TIẾP LỬA</small><strong></strong><b></b></div></div>
  </div>`;
  const $=selector=>layer.querySelector(selector),stage=$('.meme-stage'),hero=$('.meme-hero'),face=$('.meme-face'),ball=$('.meme-ball'),clock=$('.meme-clock'),striker=$('.meme-striker'),shock=$('.meme-shock'),devil=$('.meme-devil'),trophy=$('.meme-trophy');
  const title=$('.meme-heading strong'),kicker=$('.meme-heading small'),caption=$('.meme-caption'),doors=[...layer.querySelectorAll('.meme-door')],flags=[...layer.querySelectorAll('.meme-flag')],vortex=$('.meme-vortex');
  const recipient=$('.meme-recipient'),avatar=recipient.querySelector('img'),initial=$('.meme-initial'),name=recipient.querySelector('strong'),coins=recipient.querySelector('b'),ctx=canvas.getContext('2d');
  let particles=[],lastTime=0,jobId=null,lastAction=null,burstDone=false;
  for(let i=0;i<12;i++){const fan=document.createElement('div');fan.className='meme-cutout';fan.style.backgroundPosition=`${i%3*50}% 0%`;fan.style.setProperty('--i',i);$('.meme-crowd').append(fan);}
  function cutout(node,person,portrait=false){const cast=MEME_CAST[person];node.style.backgroundPosition=`${cast.column*50}% ${(cast.row+(portrait?2:0))*100/3}%`;}
  function setJob(job){
    jobId=job?.id;burstDone=false;lastAction=null;
    name.textContent=job?.nickname||'';coins.textContent=job?.thanks?Number(job.thanks.coins).toLocaleString('vi-VN')+' xu':'';
    const url=safeImage(job?.avatar);avatar.hidden=!url;initial.hidden=!!url;initial.textContent=Array.from(job?.nickname||'M')[0];if(url)avatar.src=url;
    avatar.onerror=()=>{avatar.hidden=true;initial.hidden=false;};
  }
  function burst(amount=120,originY=820){
    particles.push(...Array.from({length:amount},(_,i)=>({x:150+Math.random()*780,y:originY,vx:(Math.random()-.5)*740,vy:-Math.random()*850-120,age:0,life:2.4+Math.random()*1.8,color:['#e22b23','#ffcd6b','#fff2d7'][i%3]})));
    particles=particles.slice(-360);
  }
  function sample(scene,job) {
    const beat=scene?.meme?memePhase(scene.action,scene.t):null;
    layer.hidden=!beat;
    if(!beat){delete document.body.dataset.memeSize;lastAction=null;return;}
    if(job?.id!==jobId)setJob(job);
    const {t,hero:person,size}=beat,action=scene.action;
    document.body.dataset.memeSize=size;layer.dataset.action=action;stage.dataset.size=size;
    if(lastAction!==action){lastAction=action;cutout(hero,person);cutout(face,person,true);cutout(striker,'ronaldo');kicker.textContent=MEME_CAST[person].name+' · HANG MU';}
    const open=clamp(t/320),remaining=(job.effectEnd??beat.duration+job.actionStartDelay)-scene.elapsed,fade=clamp(remaining/250);
    stage.style.opacity=String(Math.min(open,fade));
    const hit=beat.impact;stage.style.transform=`translate(${Math.sin(t*.09)*hit*12}px,${Math.cos(t*.07)*hit*9}px) scale(${.93+.07*open+.025*hit})`;
    stage.style.setProperty('--impact',hit);stage.style.setProperty('--beat',String(Math.sin(t/180)));
    title.textContent=beat.goal?'VÀOOOOOO!':beat.title;caption.textContent=beat.caption;
    face.hidden=!beat.closeup;hero.hidden=beat.closeup;face.style.transform=`translateX(-50%) rotate(${Math.sin(t/75)*1.8}deg) scale(${1+.12*Math.sin(Math.min(t,850)/850*Math.PI)+hit*.15})`;
    hero.style.transform='translateX(-50%)';hero.style.opacity='1';hero.style.filter='';
    ball.hidden=!['antony','fergie'].includes(action);clock.hidden=action!=='fergie';striker.hidden=action!=='fergie'||beat.goal;
    devil.hidden=trophy.hidden=action!=='ggmu';vortex.hidden=action!=='antony';
    $('.meme-goal').hidden=action!=='fergie';$('.meme-doors').hidden=action!=='cave-door';$('.meme-skid').hidden=action!=='ole';
    $('.meme-crowd').hidden=!(action==='ggmu'&&t>=2200||beat.goal);flags.forEach(flag=>flag.hidden=!['ggmu','ole','fergie'].includes(action));
    shock.style.transform=`translate(-50%,-50%) scale(${1-hit*.9})`;shock.style.opacity=String(hit*.8);
    if(action==='cave-door'){
      const gap=t<900?1:t<1500?1-clamp((t-900)/600):t<2500?0:.16+clamp((t-2500)/1900)*.72;
      doors.forEach((door,i)=>door.style.transform=`translateX(${(i?1:-1)*gap*99}%) rotateY(${(i?1:-1)*gap*18}deg)`);
      hero.style.transform=`translateX(-50%) rotate(${Math.sin(t/90)*6}deg)`;
    }
    if(action==='antony'){
      const spin=clamp((t-850)/3100),fly=Math.max(0,t-4000);
      hero.style.transform=`translateX(calc(-50% + ${Math.sin(t/65)*spin*25}px)) rotateY(${spin*1440}deg) rotate(${Math.sin(t/85)*spin*9}deg) scale(${1+spin*.13})`;
      hero.style.filter=`drop-shadow(${Math.sin(t/50)*spin*22}px 0 10px #ffad4688)`;
      vortex.style.transform=`translateX(-50%) rotate(${t*.3}deg) scale(${.45+spin*.8})`;
      ball.style.left=325+Math.cos(t/115)*205+fly*.65+'px';ball.style.top=550+Math.sin(t/115)*65-fly*.28+'px';ball.style.transform=`rotate(${t*.8}deg)`;
      if(fly)caption.textContent='BÓNG ĐÂU RỒI? KỆ, QUAY TIẾP!';
    }
    if(action==='siuuu'){
      const flight=clamp((t-1000)/1300),jump=Math.sin(flight*Math.PI)*300;
      hero.style.transform=`translate(-50%,${-jump}px) rotateY(${flight*360}deg) scale(${1+.16*hit})`;
      if(t<2300)title.textContent='ANH BẢY LẤY ĐÀ…';
    }
    if(action==='ole'){
      const entrance=-650*(1-clamp((t-850)/1000));
      hero.style.transform=`translate(calc(-50% + ${entrance+Math.sin(t/240)*135}px),${Math.abs(Math.sin(t/100))*-23}px) rotate(${Math.sin(t/220)*12}deg)`;
      flags.forEach((flag,i)=>flag.style.transform=`rotate(${(i?1:-1)*12+Math.sin(t/160)*9}deg)`);
    }
    if(action==='fergie'){
      clock.textContent=beat.goal?'90+7  ·  1—0':'90:00  +'+(4+Math.min(3,Math.floor(t/600)));
      const shot=clamp((t-900)/1400);ball.hidden=t>2600;ball.style.left=190+shot*460+'px';ball.style.top=1140-shot*410-Math.sin(shot*Math.PI)*180+'px';ball.style.transform=`rotate(${shot*950}deg) scale(${1-shot*.65})`;
      striker.style.transform=`rotate(${-20+shot*45}deg)`;hero.style.transform=`translateX(-50%) rotate(${Math.sin(t/180)*1.5}deg)`;
      if(beat.goal)caption.textContent='NGÀI NHẢ KẸO. CẢ HANG NHẢY!';
    }
    if(action==='ggmu'){
      const rise=clamp((t-850)/1350);hero.style.transform=`translate(-50%,${(1-rise)*500+Math.sin(t/210)*-10}px) scale(${.7+rise*.3})`;
      devil.style.transform=`translateX(-50%) scale(${.75+rise*.25})`;devil.style.opacity=String(rise*.9);
      trophy.style.transform=`translateX(-50%) rotate(${Math.sin(t/270)*8}deg)`;
      flags.forEach((flag,i)=>flag.style.transform=`rotate(${(i?1:-1)*15+Math.sin(t/130)*12}deg)`);
      if(t>=2200)caption.textContent='CARRICK GẬT ĐẦU. CẢ HANG LÊN NÓC!';
    }
    if(!burstDone&&t>=beat.soundAt){burstDone=true;if(['ggmu','fergie','siuuu'].includes(action))burst(action==='ggmu'?260:action==='fergie'?180:80,size==='full'?1000:850);}
  }
  function draw(time=performance.now()){
    const dt=Math.min(.05,Math.max(0,(time-(lastTime||time))/1000));lastTime=time;ctx.clearRect(0,0,1080,1920);particles=particles.filter(p=>p.age<p.life);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=470*dt;p.age+=dt;ctx.globalAlpha=clamp((p.life-p.age)/.7);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.age*6);ctx.fillRect(-5,-10,10,20);ctx.restore();}ctx.globalAlpha=1;
  }
  return {setJob,sample,draw,burst,clear(){particles=[];burstDone=false;lastTime=0;ctx.clearRect(0,0,1080,1920);sample(null);}};
}
