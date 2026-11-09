"""Import user-provided clips; composites play sequentially in the requested order."""
from pathlib import Path
import json,shutil,subprocess
from datetime import datetime,timezone,timedelta
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/assets/sounds'
INPUTS={name:Path('C:/Users/as/Downloads')/(name+'.mp3') for name in ['goal','clap','siuuuu']}
RECIPES={
    'vo-tay':['clap'],
    'hoa-hong-1':['clap'],
    'dong-cua-hang':['goal'],
    'compa-antony':['goal'],
    'siuuu':['siuuuu'],
    'ole-cam-lai':['goal','clap'],
    'fergie-time':['goal','clap','siuuuu'],
    'ggmu-mo-hoi':['goal','clap','siuuuu'],
    'khan-dai':['goal'],
}
def duration(file):
    result=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(file)],capture_output=True,text=True,check=True)
    return float(json.loads(result.stdout)['format']['duration'])
def main():
    for file in INPUTS.values():
        if not file.is_file():raise FileNotFoundError(file)
    sources=DEST/'source';sources.mkdir(parents=True,exist_ok=True)
    for name,file in INPUTS.items():shutil.copy2(file,sources/(name+'.mp3'))
    backup=ROOT/'output'/('sounds-before-import-'+datetime.now(timezone(timedelta(hours=7))).strftime('%Y%m%d-%H%M%S'))
    items=[]
    for name,recipe in RECIPES.items():
        target=DEST/(name+'.mp3')
        if target.exists():backup.mkdir(parents=True,exist_ok=True);shutil.copy2(target,backup/target.name)
        temporary=DEST/(name+'.tmp.mp3')
        if len(recipe)==1:shutil.copy2(sources/(recipe[0]+'.mp3'),temporary)
        else:
            args=['ffmpeg','-hide_banner','-loglevel','error','-y']
            for part in recipe:args+=['-i',str(sources/(part+'.mp3'))]
            filters=[f'[{i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a{i}]' for i in range(len(recipe))]
            filters.append(''.join(f'[a{i}]' for i in range(len(recipe)))+f'concat=n={len(recipe)}:v=0:a=1[out]')
            args+=['-filter_complex',';'.join(filters),'-map','[out]','-c:a','libmp3lame','-b:a','192k',str(temporary)]
            subprocess.run(args,check=True)
        temporary.replace(target)
        seconds=duration(target);items.append({'cue':name,'file':target.name,'parts':recipe,'mode':'sequential','duration':seconds})
        print(name+' = '+' -> '.join(recipe)+f' ({seconds:.3f}s)',flush=True)
    (ROOT/'config/user-sounds.json').write_text(json.dumps({'sources':'public/assets/sounds/source','mode':'sequential','clipsTrimmed':False,'items':items},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
