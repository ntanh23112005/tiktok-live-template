/* Original lightweight renderer for the community preview; no borrowed images or particle code. */
(() => {
  class CommunityParticles {
    constructor(canvas) {
      this.canvas=canvas; canvas.width=1080; canvas.height=1920;
      this.ctx=canvas.getContext('2d'); this.items=[]; this.tips=[]; this.last=0;
      for(let i=0;i<18;i++) this.items.push({kind:'dust',x:Math.random()*1080,y:Math.random()*1920,vx:0,vy:-9-Math.random()*12,age:0,life:Infinity,size:1+Math.random()*2});
      this.frame=this.frame.bind(this); requestAnimationFrame(this.frame);
    }
    setIncenseTips(tips) { this.tips=Array.isArray(tips)?tips:[]; }
    add(item) { if(this.items.length<160) this.items.push({age:0,life:3,size:3,vx:0,vy:0,...item}); }
    spawnIncenseBurst(x=540,y=790) {
      for(let i=0;i<16;i++) this.add({kind:'spark',x,y,vx:(Math.random()-.5)*90,vy:-35-Math.random()*70,life:1.5+Math.random(),size:2+Math.random()*2});
    }
    spawnBellWave(x=540,y=750,count=2) {
      for(let i=0;i<Math.min(count,4);i++) this.add({kind:'ring',x,y,age:-i*.18,life:2.4,size:20});
    }
    spawnGrandCeremonyRain() {
      for(let i=0;i<48;i++) this.add({kind:'petal',x:Math.random()*1080,y:-Math.random()*500,vx:(Math.random()-.5)*24,vy:80+Math.random()*55,life:18,size:5+Math.random()*5,angle:Math.random()*6.28});
      this.spawnBellWave(540,750,3);
    }
    spawnFloatingMerit(text='',x=540,y=940,color='#ffe082') { this.add({kind:'text',text:String(text).slice(0,60),x,y,vy:-45,life:2,color}); }
    frame(time) {
      requestAnimationFrame(this.frame);
      if(document.hidden) { this.last=time; return; }
      if(time-this.last<1000/30) return;
      const dt=Math.min((time-this.last)/1000,.08); this.last=time;
      const c=this.ctx; c.clearRect(0,0,1080,1920);
      if(Math.random()<.3) for(const tip of this.tips) this.add({kind:'smoke',x:tip.x,y:tip.y,vx:(Math.random()-.5)*7,vy:-22,life:3.5,size:5});
      this.items=this.items.filter(p=>p.age<p.life);
      for(const p of this.items) {
        p.age+=dt; if(p.age<0) continue;
        p.x+=p.vx*dt; p.y+=p.vy*dt;
        const fade=Math.max(0,1-p.age/p.life);
        c.save(); c.globalAlpha=p.kind==='dust'?.35:fade*.7; c.fillStyle=p.color||'#efc978';
        if(p.kind==='dust') { if(p.y<0)p.y=1920; c.beginPath(); c.arc(p.x,p.y,p.size,0,Math.PI*2); c.fill(); }
        else if(p.kind==='ring') { c.strokeStyle='#f5d48c'; c.lineWidth=2; c.beginPath(); c.arc(p.x,p.y,20+p.age*135,0,Math.PI*2); c.stroke(); }
        else if(p.kind==='smoke') { c.globalAlpha=fade*.065; c.fillStyle='#e9ddc6'; c.beginPath(); c.ellipse(p.x+Math.sin(p.age*2)*9,p.y,p.size+p.age*7,p.size+p.age*11,0,0,Math.PI*2); c.fill(); }
        else if(p.kind==='petal') { c.translate(p.x,p.y); c.rotate(p.angle+p.age*.7); c.fillStyle='#e3ae91'; c.beginPath(); c.ellipse(0,0,p.size*.45,p.size,0,0,Math.PI*2); c.fill(); }
        else if(p.kind==='text') { c.font='24px sans-serif'; c.textAlign='center'; c.fillText(p.text,p.x,p.y); }
        else { c.beginPath(); c.arc(p.x,p.y,p.size,0,Math.PI*2); c.fill(); }
        c.restore();
      }
    }
  }
  window.TempleParticleEngine=CommunityParticles;
})();
