"""Synthesize three original fanclub loops and five original stadium sound effects."""
from pathlib import Path
import json, subprocess
import numpy as np
from scipy.signal import lfilter
import soundfile as sf
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'public/assets/music';ART=ROOT/'public/assets/mu-cave-v1';SR=32000
def freq(note):return 440*2**((note-69)/12)
def instrument(note,seconds,kind):
    t=np.arange(int(seconds*SR),dtype=np.float32)/SR;p=2*np.pi*freq(note)*t
    if kind=='guitar':s=sum(np.sin(p*k)*(.65/k)*np.exp(-t*(1.5+k*.6)) for k in range(1,7));env=np.minimum(t/.008,1)*np.minimum((seconds-t)/.04,1)
    elif kind=='bass':s=(np.sin(p)+.15*np.sin(2*p))*np.exp(-t*1.8);env=np.minimum(t/.012,1)*np.minimum((seconds-t)/.1,1)
    elif kind=='rock':s=np.tanh(2*(np.sin(p)+.33*np.sin(3*p)))*.4;env=np.minimum(t/.025,1)*np.minimum((seconds-t)/.15,1)
    else:s=(np.sin(p)+np.sin(p*1.002)+.15*np.sin(2*p))/2;env=np.sin(np.pi*np.clip(t/.8,0,1)/2)**2*np.sin(np.pi*np.clip((seconds-t)/1.2,0,1)/2)**2
    return (s*np.clip(env,0,1)).astype(np.float32)
def noise(seconds,kind,rng):
    t=np.arange(int(seconds*SR),dtype=np.float32)/SR
    if kind=='kick':return (np.sin(2*np.pi*(48*t+22*(1-np.exp(-t*20))))*np.exp(-t*12)).astype(np.float32)
    return (rng.standard_normal(len(t))*np.exp(-t*(15 if kind=='snare' else 65))*.22).astype(np.float32)
def render(slug,title,style,bpm):
    beat=60/bpm;bars=48;seconds=bars*4*beat;n=int(seconds*SR);mix=np.zeros((n+SR*8,2),np.float32);rng=np.random.default_rng(20261103+style)
    def add(w,at,gain=1,pan=0):
        start=int(at*SR);stop=min(len(mix),start+len(w));w=w[:stop-start]*gain;mix[start:stop,0]+=w*(.7-pan*.3);mix[start:stop,1]+=w*(.7+pan*.3)
    chords=[(45,57,60,64),(41,53,57,60),(48,55,60,64),(43,55,59,62)]
    for bar in range(bars):
        root,*triad=chords[(bar//2)%4];start=bar*4*beat
        for note in triad:add(instrument(note,beat*4+2,'pad'),start,.08,(-1 if note%2 else 1)*.5)
        for step in range(8):
            note=triad[[0,1,2,1,0,2,1,2][step]]+(12 if step%4==3 else 0);add(instrument(note,beat*1.8,'guitar'),start+step*beat/2,.21 if style!=2 else .12,(-1 if step%2 else 1)*.45)
        for step in range(4):
            add(instrument(root,beat*.8,'bass'),start+step*beat,.22)
            add(noise(.6,'kick',rng),start+step*beat,.2 if style==0 else .42)
            if step%2:add(noise(.24,'snare',rng),start+step*beat,.21 if style==0 else .45)
            for off in [0,.5]:add(noise(.09,'hat',rng),start+(step+off)*beat,.09 if style==0 else .17,off-.25)
        if style==2:
            for step in [0,1.5,2.5]:
                for note in [root+12,root+19]:add(instrument(note,beat*.9,'rock'),start+step*beat,.15,.6 if note%2 else -.6)
        if style==1:
            for step in [0,1,2.5,3]:add(noise(.36,'snare',rng),start+step*beat,.12)
    # Fold reverberation tails into the next loop instead of a jarring pause.
    mix[:SR*8]+=mix[n:n+SR*8];mix=mix[:n]
    mix/=max(1,float(np.max(np.abs(mix)))/.8)
    wav=DEST/(slug+'.wav');sf.write(wav,mix,SR,subtype='PCM_16')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-23:TP=-2:LRA=9','-c:a','libmp3lame','-b:a','192k',str(DEST/(slug+'.mp3'))],check=True);wav.unlink()
    print(slug,round(seconds,1),flush=True)
    return {'file':'music/'+slug+'.mp3','title':title,'source':'Original procedural composition for Hang MU'}
def effects():
    rng=np.random.default_rng(1717)
    for name,duration in [('clap',1.4),('crowd',3.8),('whistle',.85),('kick',.35),('door',1.1)]:
        t=np.arange(int(duration*SR),dtype=np.float32)/SR;s=np.zeros_like(t)
        if name=='whistle':s=np.sin(2*np.pi*(2450*t+12*np.sin(2*np.pi*8*t)))*np.sin(np.pi*t/duration)**2*.4
        elif name=='kick':s=noise(duration,'kick',rng)+rng.standard_normal(len(t))*np.exp(-t*45)*.1
        elif name=='door':s=lfilter([.08],[1,-.92],rng.standard_normal(len(t)))*np.exp(-t*3)+np.sin(2*np.pi*65*t)*np.exp(-t*6)*.2
        elif name=='clap':
            for at in [.02,.16,.32,.56,.75,.96]:
                start=int(at*SR);length=min(int(SR*.22),len(t)-start);s[start:start+length]+=rng.standard_normal(length)*np.exp(-np.arange(length)/SR*32)*.25
        else:
            s=lfilter([.06],[1,-.94],rng.standard_normal(len(t)))
            for f in [155,173,198,224,263,301]:s+=np.sin(2*np.pi*f*t+np.sin(t*7+f))*.018
            s*=np.sin(np.pi*t/duration)**.6
        s=s/max(.001,float(np.max(np.abs(s))))*.66;fade=min(500,len(s)//4);s[:fade]*=np.linspace(0,1,fade);s[-fade:]*=np.linspace(1,0,fade);sf.write(ART/(name+'.wav'),s,SR,subtype='PCM_16')
if __name__=='__main__':
    DEST.mkdir(parents=True,exist_ok=True);items=[{'file':'music/glory-glory-man-united.mp3','title':'Glory Glory Man United · Có lời','source':'File supplied by project owner'}]
    for args in [('fanclub-chill','Fanclub Chill · Không lời',0,88),('terrace-drums','Nhịp khán đài · Trống cổ vũ',1,104),('red-devil-rock','Red Devil Rock · Không lời',2,112)]:items.append(render(*args))
    (ROOT/'config/music.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8');effects()
