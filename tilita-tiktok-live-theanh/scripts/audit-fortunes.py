"""Read-only waveform + local ASR check; optionally wait for a staged audio expansion."""
import argparse
import difflib
import hashlib
import json
import os
import re
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('OMP_NUM_THREADS', '1')
if os.name == 'nt':
    import ctypes
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
parser = argparse.ArgumentParser()
parser.add_argument('--additions', action='append', default=[])
parser.add_argument('--from-number', type=int, default=1)
parser.add_argument('--numbers', nargs='+', type=int, help='Check only these numbers')
parser.add_argument('--threads', type=int, default=2)
parser.add_argument('--wait-seconds', type=int, default=0, help='Maximum wait per pending narration')
parser.add_argument('--output', default='output/qa-v2/narration-audit.json')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
fortunes = json.loads((root / 'config/fortunes.json').read_text(encoding='utf-8'))
for source in args.additions:
    for f in json.loads(Path(source).read_text(encoding='utf-8')):
        old = next((old for old in fortunes if old['id'] == f['id']), None)
        if old is not None and old != f: raise ValueError(f"Existing fortune changed: {f['id']}")
        if old is None: fortunes.append(f)
model = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=max(1,args.threads))
results = []
fold = lambda s: re.sub(r'[^\w\s]', '', s.lower()).split()
dest = root / args.output
dest.parent.mkdir(parents=True, exist_ok=True)
for f in sorted(fortunes, key=lambda f:f['number']):
    if f['number'] < args.from_number: continue
    if args.numbers and f['number'] not in args.numbers: continue
    expected = f"Lời xăm số {f['number']}. {f['title']}. {f['message']}"
    version = hashlib.sha256(expected.encode()).hexdigest()[:16]
    deadline = time.monotonic() + args.wait_seconds
    while True:
        manifest = json.loads((root / 'public/assets/fortunes/manifest.json').read_text(encoding='utf-8'))
        item = next((a for a in manifest['items'] if a['id']==f['id'] and a['textVersion']==version), None)
        if item is not None and f['number'] >= 100 and not item.get('textNormalized'): item = None
        if item is not None: break
        if time.monotonic() >= deadline: raise ValueError(f"Narration not ready: {f['id']}")
        time.sleep(1)
    file = root / 'public/assets/fortunes' / item['file']
    wav, sr = sf.read(file)
    assert wav.ndim == 1 and len(wav) > 0 and np.isfinite(wav).all(), f"Invalid waveform: {file}"
    assert abs(len(wav)/sr - item['duration']) <= .002, f"Duration mismatch: {file}"
    audio16 = resample_poly(wav, 16000, sr).astype(np.float32)
    segments, info = model.transcribe(audio16, language='vi', beam_size=3, condition_on_previous_text=False)
    transcript = ' '.join(s.text.strip() for s in segments)
    result = {'id':item['id'], 'duration':round(len(wav)/sr,3), 'peak':round(float(np.max(np.abs(wav))),4), 'clipped':int(np.sum(np.abs(wav)>=.999)), 'similarity':round(difflib.SequenceMatcher(None,fold(expected),fold(transcript)).ratio(),3), 'transcript':transcript, 'expected':expected}
    results.append(result)
    temp = dest.with_suffix('.json.tmp')
    temp.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    temp.replace(dest)
    print(f"{item['id']}: similarity={result['similarity']} peak={result['peak']} clipped={result['clipped']} {transcript}",flush=True)
