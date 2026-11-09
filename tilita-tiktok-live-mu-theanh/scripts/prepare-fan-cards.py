"""Prepare Vietnamese Tiến Đạt WAVs before LIVE; playback has no Python dependency."""
import argparse, hashlib, json, os, sys,subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
os.environ.setdefault('OMP_NUM_THREADS','1')
os.environ.setdefault('OMP_WAIT_POLICY','PASSIVE')
sys.stdout.reconfigure(encoding='utf-8')
import numpy as np
import soundfile as sf
from zerotts import ZeroTTS
from zerotts.text_norm import normalize_vi_text
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/assets/fan-cards'
model=None
def spoken(card):return card.get('spoken') or f"Thẻ fan MU số {card['number']}! {card['title']}! {card['message']}"
def version(card):return hashlib.sha256(spoken(card).encode()).hexdigest()[:16]
def initialize(threads):
    global model
    if os.name=='nt':
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(),0x4000)
    model=ZeroTTS.from_pretrained('zeroweight-ai/ZeroTTS',intra_op_num_threads=threads)
def build(card):
    for attempt in range(3):
        wav=np.asarray(model.synthesize(normalize_vi_text(spoken(card)),voice='tiendat'),dtype=np.float32).reshape(-1)
        duration=len(wav)/model.sample_rate
        minimum=max(1.2,len(spoken(card).split())*.08) if card.get('spoken') else max(3,len(spoken(card).split())*.11)
        if np.isfinite(wav).all() and minimum<=duration<=32 and np.max(np.abs(wav))>0:break
        print(f"Retry {card['id']}: {duration:.1f}s",flush=True)
    else:raise ValueError('Invalid narration '+card['id'])
    wav-=wav.mean();wav*=.86/max(.001,float(np.max(np.abs(wav))))
    fade=min(int(model.sample_rate*.018),len(wav)//4)
    wav[:fade]*=np.linspace(0,1,fade);wav[-fade:]*=np.linspace(1,0,fade)
    target=Path(card.get('dest',str(DEST)));target.mkdir(parents=True,exist_ok=True)
    name=card.get('filename',card['id']+'-energy.wav');temporary=target/(card['id']+'.raw.wav');output=target/name;sf.write(temporary,wav,model.sample_rate,subtype='PCM_16')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(temporary),'-af','atempo=1.06,acompressor=threshold=0.09:ratio=3:attack=5:release=90:makeup=2,loudnorm=I=-14:TP=-1:LRA=7','-ar','24000','-c:a','pcm_s16le',str(output)],check=True)
    temporary.unlink();duration=sf.info(output).duration
    return {'id':card['id'],'file':name,'duration':round(duration,3),'voice':'tiendat','textVersion':version(card),'textNormalized':True,'delivery':'energetic-v2','loudnessLUFS':-14}
def main():
    p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=99);p.add_argument('--workers',type=int,default=2);p.add_argument('--threads',type=int,default=1);a=p.parse_args()
    cards=json.loads((ROOT/'config/fan-cards.json').read_text(encoding='utf-8'));DEST.mkdir(parents=True,exist_ok=True)
    file=DEST/'manifest.json';manifest=json.loads(file.read_text()) if file.exists() else {'items':[]}
    manifest.update(engine='ZeroTTS',voice='tiendat',speed=1.06,delivery='energetic-v2',loudnessLUFS=-14)
    pending=[c for c in cards[:a.limit] if not any(v.get('id')==c['id'] and v.get('textVersion')==version(c) and v.get('voice')=='tiendat' and (DEST/v['file']).exists() for v in manifest['items'])]
    speech=ROOT/'public/assets/sounds/voice';speech.mkdir(parents=True,exist_ok=True)
    social=[{'id':key,'spoken':text,'dest':str(speech),'filename':key+'.wav'} for key,text in [('follow-thanks','Cảm ơn bạn mới đã follow! Chào mừng bạn đến với hang MU!'),('share-thanks','Cảm ơn bạn đã chia sẻ! Cùng rủ anh em vào hang nào!'),('likes-thanks','Cảm ơn bạn đã gửi mười tim! Vào hang cùng anh em nào!')]]
    tasks=social+pending
    original=DEST/'manifest-before-energy.json'
    if file.exists() and not original.exists():original.write_bytes(file.read_bytes())
    with ProcessPoolExecutor(max_workers=a.workers,initializer=initialize,initargs=(a.threads,)) as pool:
        for entry in pool.map(build,tasks):
            if not entry['id'].startswith('fan-'):
                print('Built '+entry['id'],flush=True);continue
            manifest['items']=[v for v in manifest['items'] if v['id']!=entry['id']]+[entry]
            temp=file.with_suffix('.json.tmp');temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(file)
            print(f"Built {entry['id']}: {entry['duration']}s",flush=True)
if __name__=='__main__':main()
