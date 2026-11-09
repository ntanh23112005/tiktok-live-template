"""Build short meme cues from the preserved user recordings, never modify originals."""
from pathlib import Path
from array import array
import json, math, shutil, subprocess

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/assets/sounds'
SOURCE=DEST/'source'
BACKUP=ROOT/'output/before-meme-v1.3/sounds'
RECIPES={
    'vo-tay':[('clap',3.4)],'hoa-hong-1':[('clap',3.4)],
    'dong-cua-hang':[('goal',3.6)],'compa-antony':[('goal',3.6)],
    'siuuu':[('siuuuu',2.1)],'ole-cam-lai':[('goal',3.0),('clap',2.0)],
    'fergie-time':[('goal',2.4),('clap',1.3),('siuuuu',2.1)],
    'ggmu-mo-hoi':[('goal',2.4),('clap',1.3),('siuuuu',2.1)],
    'khan-dai':[('goal',3.6)],
}

def loudest_segment(name,length):
    # 100 ms energy windows select a strong section without changing its speed or pitch.
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(SOURCE/(name+'.mp3')),'-ar','8000','-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout
    samples=array('f');samples.frombytes(raw)
    energy=[sum(s*s for s in samples[i:i+800]) for i in range(0,len(samples),800)]
    count=max(1,math.ceil(length*10));best=0;maximum=-1
    for start in range(max(1,len(energy)-count+1)):
        total=sum(energy[start:start+count])
        if total>maximum:maximum=total;best=start
    # Keep short calls complete: in particular preserve the initial 'S' of SIUUU.
    return 0 if name=='siuuuu' or len(samples)/8000<=length+.4 else round(best*.1,2)

def main():
    BACKUP.mkdir(parents=True,exist_ok=True);items=[]
    for name,recipe in RECIPES.items():
        target=DEST/(name+'.mp3')
        if target.exists() and not (BACKUP/target.name).exists():shutil.copy2(target,BACKUP/target.name)
        args=['ffmpeg','-hide_banner','-loglevel','error','-y'];filters=[];parts=[]
        for index,(source,length) in enumerate(recipe):
            start=loudest_segment(source,length);parts.append({'source':source,'start':start,'length':length})
            args+=['-ss',str(start),'-t',str(length),'-i',str(SOURCE/(source+'.mp3'))]
            filters.append(f'[{index}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={length-.035}:d=0.035[a{index}]')
        filters.append(''.join(f'[a{i}]' for i in range(len(parts)))+f'concat=n={len(parts)}:v=0:a=1,alimiter=limit=0.95:level=false[out]')
        temporary=DEST/(name+'.short.tmp.mp3')
        args+=['-filter_complex',';'.join(filters),'-map','[out]','-c:a','libmp3lame','-b:a','192k',str(temporary)]
        subprocess.run(args,check=True);temporary.replace(target)
        duration=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(target)],capture_output=True,text=True,check=True).stdout)
        items.append({'cue':name,'file':target.name,'parts':parts,'duration':duration})
        print(f'{name}: {duration:.3f}s; {parts}',flush=True)
    (ROOT/'config/user-sounds.json').write_text(json.dumps({'version':'mu-meme-v1.3','sources':'public/assets/sounds/source','mode':'short-sequential','clipsTrimmed':True,'selection':'strongest energy window, original pitch and speed','items':items},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':main()
