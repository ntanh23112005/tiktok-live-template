"""Build local Vietnamese narration. Live playback needs only the generated files, not Python."""
import argparse
import hashlib
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('OMP_WAIT_POLICY', 'PASSIVE')
if os.name == 'nt':
    import ctypes
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from zerotts import ZeroTTS
from zerotts.text_norm import normalize_vi_text

root = Path(__file__).resolve().parents[1]
dest = root / 'public/assets/fortunes'
model = None

def read_text(f):
    return f"Lời xăm số {f['number']}. {f['title']}. {f['message']}"

def text_version(f):
    return hashlib.sha256(read_text(f).encode()).hexdigest()[:16]

def minimum_duration(f):
    return max(3, len(read_text(f).split()) * .11)

def initialize_model(threads):
    global model
    model = ZeroTTS.from_pretrained('zeroweight-ai/ZeroTTS', intra_op_num_threads=max(1, threads))

def build_audio(task):
    f, voice = task
    # The Python synthesis API expects spoken forms; normalization is otherwise CLI-only.
    text = normalize_vi_text(read_text(f))
    for attempt in range(3):
        wav = np.asarray(model.synthesize(text, voice=voice), dtype=np.float32).reshape(-1)
        if len(wav) and np.isfinite(wav).all() and minimum_duration(f) <= len(wav)/model.sample_rate*20/19 <= 32 and np.max(np.abs(wav)) > 0:
            break
        print(f"Retry {f['number']}: incomplete or invalid narration (attempt {attempt+1})", flush=True)
    else:
        raise ValueError(f"Invalid/incomplete narration: {f['id']}; existing catalog stays active")
    wav -= wav.mean()
    # A gentle 0.95 pace, baked before live. Resampling also lowers pitch slightly.
    wav = resample_poly(wav, 20, 19)
    peak = np.max(np.abs(wav))
    if peak > 0: wav *= 0.86 / peak
    fade = min(int(model.sample_rate * .018), len(wav) // 4)
    wav[:fade] *= np.linspace(0, 1, fade)
    wav[-fade:] *= np.linspace(1, 0, fade)
    duration = round(len(wav) / model.sample_rate, 3)
    if not (minimum_duration(f) <= duration <= 32) or peak <= 0:
        raise ValueError(f"Invalid narration duration/volume: {f['id']}")
    filename = f"{f['id']}.wav"
    audio_temp = dest / (f['id'] + '.tmp.wav')
    sf.write(audio_temp, wav, model.sample_rate, subtype='PCM_16')
    audio_temp.replace(dest / filename)
    return {'id': f['id'], 'textVersion': text_version(f), 'voice': voice, 'file': filename, 'duration': duration, 'textNormalized': True}

def atomic_json(file, value):
    temp = file.with_suffix('.json.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(file)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int)
    parser.add_argument('--voice', default='maichi')
    parser.add_argument('--threads', type=int, default=1)
    parser.add_argument('--workers', type=int, default=1, choices=range(1,5), help='Independent TTS workers; only the parent writes the manifest')
    parser.add_argument('--force-id', action='append', default=[], help='Regenerate this ID instead of using cached audio (repeatable)')
    parser.add_argument('--additions', action='append', default=[], help='JSON additions (repeatable); publish only after all audio is ready')
    args = parser.parse_args()
    dest.mkdir(parents=True, exist_ok=True)
    fortunes = json.loads((root / 'config/fortunes.json').read_text(encoding='utf-8'))
    for additions_path in args.additions:
        for f in json.loads(Path(additions_path).read_text(encoding='utf-8')):
            old = next((old for old in fortunes if old['id'] == f['id']), None)
            if old is not None and old != f: raise ValueError(f"Existing fortune changed: {f['id']}")
            if old is None: fortunes.append(f)
    if len({f['id'] for f in fortunes}) != len(fortunes) or len({f['number'] for f in fortunes}) != len(fortunes):
        raise ValueError('Duplicate fortune IDs or numbers')
    for f in fortunes:
        if f['id'] != f"an-{f['number']:02d}" or any(not isinstance(f.get(key), str) or not f[key].strip() for key in ['title','text','message']):
            raise ValueError(f"Invalid fortune: {f.get('id')}")
    manifest_path = dest / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'items': []}
    manifest.update({'engine': 'ZeroTTS 0.1.5', 'voice': args.voice, 'speed': 0.95, 'license': 'MIT'})
    pending = []
    for f in fortunes[:args.limit]:
        old = next((a for a in manifest['items'] if a['id'] == f['id'] and a['textVersion'] == text_version(f) and a['voice'] == args.voice), None)
        if old and old.get('file') == f"{f['id']}.wav" and (dest / old['file']).exists() and minimum_duration(f) <= old['duration'] <= 32 and (f['number'] < 100 or old.get('textNormalized')) and f['id'] not in args.force_id:
            print(f"Cached {f['number']}", flush=True)
        else:
            pending.append((f,args.voice))
    def commit(entry):
        manifest['items'] = [a for a in manifest['items'] if a['id'] != entry['id']] + [entry]
        atomic_json(manifest_path, manifest)
        print(f"Built {entry['id']}: {entry['duration']}s", flush=True)
    if pending and args.workers == 1:
        initialize_model(args.threads)
        for task in pending: commit(build_audio(task))
    elif pending:
        with ProcessPoolExecutor(max_workers=args.workers, initializer=initialize_model, initargs=(args.threads,)) as pool:
            for entry in pool.map(build_audio, pending): commit(entry)
    if args.additions and (args.limit is None or args.limit >= len(fortunes)):
        for f in fortunes:
            a = next((a for a in manifest['items'] if a['id'] == f['id'] and a['textVersion'] == text_version(f)), None)
            if not a or not (dest / a['file']).exists() or not (minimum_duration(f) <= a['duration'] <= 32) or (f['number'] >= 100 and not a.get('textNormalized')):
                raise ValueError(f"Incomplete audio: {f['id']}; existing catalog stays active")
        catalog_path = root / 'config/fortunes.json'
        backup_dir = root / 'output/fortune-expansion'
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup = backup_dir / f"fortunes-before-{len(fortunes)}.json"
        if not backup.exists(): backup.write_bytes(catalog_path.read_bytes())
        atomic_json(catalog_path, fortunes)
        print(f"Published {len(fortunes)} fortunes with local narration. Running server is untouched.",flush=True)

if __name__ == '__main__':
    main()
