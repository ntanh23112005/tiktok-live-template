"""Render three original, quiet instrumental loops. No downloaded samples or live dependencies."""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
from scipy.signal import lfilter

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/assets/music'
SR = 32000
SECONDS = 192
N = SR * SECONDS

def note(midi, seconds, voice, seed):
    rng = np.random.default_rng(seed)
    t = np.arange(int(seconds * SR), dtype=np.float32) / SR
    freq = 440 * 2 ** ((midi - 69) / 12)
    phase = 2 * np.pi * freq * t
    if voice == 'bell':
        sound = sum(g * np.sin(phase * ratio) * np.exp(-t / decay)
                    for ratio, g, decay in [(1, .75, 3.0), (2.001, .17, 1.8), (2.756, .035, .8), (4.01, .012, .45)])
        envelope = np.minimum(t / .09, 1) * np.minimum((seconds - t) / .8, 1)
    elif voice == 'flute':
        phase += .035 * np.sin(2*np.pi*4.3*t)
        breath = lfilter([.03], [1, -.97], rng.standard_normal(len(t))).astype(np.float32)
        sound = .78*np.sin(phase) + .1*np.sin(2*phase) + .025*np.sin(3*phase) + .05*breath
        envelope = np.sin(np.pi * np.minimum(t/.8,1)/2)**2 * np.sin(np.pi * np.minimum((seconds-t)/1.3,1)/2)**2
    else:
        sound = sum(g*(np.sin(phase*ratio + .04*np.sin(2*np.pi*.17*t))
                       + np.sin(phase*ratio*1.0018 + .13))/2
                    for ratio,g in [(1,.68),(2,.12),(3,.025)])
        envelope = np.sin(np.pi*np.minimum(t/3,1)/2)**2 * np.sin(np.pi*np.minimum((seconds-t)/4,1)/2)**2
    return (sound * np.clip(envelope,0,1)).astype(np.float32)

def render(slug, title, style, seed):
    rng = np.random.default_rng(seed)
    # Extra tail is folded into the beginning for a continuous looping boundary.
    mix = np.zeros((N + SR*24, 2), dtype=np.float32)
    def add(midi, start, length, voice, gain, pan=0):
        sound = note(midi, length, voice, seed + int(start*10) + midi)
        pos = int(start*SR)
        mix[pos:pos+len(sound),0] += sound * gain * np.sqrt((1-pan)/2)
        mix[pos:pos+len(sound),1] += sound * gain * np.sqrt((1+pan)/2)
    roots = [48,45,41,43] if style != 'flute' else [45,41,48,43]
    for bar in range(12):
        root = roots[bar % 4]
        third = 3 if root == 45 else 4
        for midi,gain in [(root-12,.07),(root,.05),(root+7,.035),(root+third+12,.018)]:
            add(midi,bar*16,21,'pad',gain,float(rng.uniform(-.3,.3)))
    patterns = {
        'bell': [[72,76,79,74],[69,72,76,72],[72,69,67,72],[74,79,76,74]],
        'flute': [[69,72,74,76],[72,69,67,69],[72,76,79,76],[74,72,69,67]],
        'strings': [[64,67,72,67],[64,69,72,69],[65,69,72,69],[62,67,71,67]],
    }
    for bar in range(12):
        for step,midi in enumerate(patterns[style][bar % 4]):
            start = bar*16 + step*4
            voice = 'bell' if style in ['bell','strings'] else 'flute'
            add(midi,start,5.8 if voice=='bell' else 3.7,voice,.035 if style=='strings' else .055,float(rng.uniform(-.45,.45)))
    mix[:SR*24] += mix[N:]
    dry = mix[:N].copy()
    # Dark, quiet echoes leave space for narration and the ritual bell.
    for delay,gain in [(0.31,.10),(.47,.08),(1.1,.14),(1.79,.10),(2.63,.075),(3.91,.045)]:
        echo = np.roll(dry,int(delay*SR),axis=0)
        echo = lfilter([.09],[1,-.91],echo,axis=0).astype(np.float32)
        dry += echo[:,::-1] * gain
    dry *= .5 / max(float(np.max(np.abs(dry))), .001)
    DEST.mkdir(parents=True,exist_ok=True)
    target = DEST / f'{slug}.mp3'
    temp = DEST / f'.{slug}.tmp.mp3'
    command = ['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','pipe:0',
               '-af','loudnorm=I=-25:TP=-3:LRA=7','-ar','44100','-c:a','libmp3lame','-q:a','3',
               '-metadata',f'title={title}','-metadata','artist=Tâm an lạc — nhạc nền gốc',
               '-metadata','comment=Original procedural ambient composition; no sampled recordings.',str(temp)]
    subprocess.run(command,input=dry.astype('<f4').tobytes(),check=True)
    temp.replace(target)
    print(f'Ready: {title} — {SECONDS}s ({target.stat().st_size} bytes)',flush=True)
    return {'file':str(target.relative_to(ROOT)).replace('\\','/'),'title':title,'duration':SECONDS,'original':True}

if __name__ == '__main__':
    items = [render('sen-tinh','Sen tĩnh','bell',114),render('truc-an','Trúc an','flute',225),render('may-thien','Mây thiền','strings',336)]
    report = ROOT/'output/audio/ambient-originals.json'
    report.parent.mkdir(parents=True,exist_ok=True)
    report.write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
