"""Build a reviewable source ZIP by allowlist. Never copy personal runtime data."""
import hashlib,json,shutil,sys,zipfile
from datetime import datetime
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parents[1]
release=root/'output/releases'/('community-preview-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
dest=release/'tam-an-lac'
dest.mkdir(parents=True)
def copy(name,target=None):
    out=dest/(target or name);out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,out)
def write(name,text):
    p=dest/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8',newline='\n')
for name in ['server.js','package.json','package-lock.json']: copy(name)
for folder in ['src','test']:
    for p in (root/folder).glob('*.js'): copy(p.relative_to(root))
for p in (root/'public').rglob('*'):
    if p.is_file() and p.suffix in ['.js','.html','.css'] and 'assets' not in p.parts and p.name!='particles.js': copy(p.relative_to(root))
copy('scripts/release-assets/particles.js','public/js/particles.js')
for name in ['default.json','fortunes.json']: copy('config/'+name)
for p in (root/'public/assets/wooden-temple-v1').glob('*.png'): copy(p.relative_to(root))
for p in (root/'public/assets/fortunes').iterdir():
    if p.suffix in ['.wav','.json']: copy(p.relative_to(root))
for slug in ['sen-tinh','truc-an','may-thien']: copy('public/assets/music/'+slug+'.mp3')
music=json.loads((root/'config/music.json').read_text(encoding='utf-8'))
write('config/music.json',json.dumps([m for m in music if m['file'] in [f'music/{s}.mp3' for s in ['sen-tinh','truc-an','may-thien']]],ensure_ascii=False,indent=2))
for name in ['prepare-fortunes.py','audit-fortunes.py','prepare-ambient-music.py']: copy('scripts/'+name)
for package in ['tiktok-live-connector','tiktok-live-proto','express','ws']:
    copy(f'node_modules/{package}/LICENSE',f'third-party-licenses/{package}.txt')
copy('node_modules/tiktok-live-connector/LICENSE','LICENSE-AGPL-3.0.PROPOSED.txt')
pkg=json.loads((dest/'package.json').read_text(encoding='utf-8'));pkg['name']='tam-an-lac-community-preview'
lock=json.loads((dest/'package-lock.json').read_text(encoding='utf-8'));lock['name']=pkg['name'];lock['packages']['']['name']=pkg['name']
write('package.json',json.dumps(pkg,ensure_ascii=False,indent=2));write('package-lock.json',json.dumps(lock,ensure_ascii=False,indent=2))
server=(dest/'server.js').read_text(encoding='utf-8').replace('process.env.PORT || 3000','process.env.PORT || 3001')
server=server.replace("process.argv.includes('--open') && process.platform === 'win32'","process.argv.includes('--open') && ['win32','darwin'].includes(process.platform)")
server=server.replace("spawn('explorer.exe',", "spawn(process.platform === 'darwin' ? 'open' : 'explorer.exe',")
write('server.js',server)
starter=(root/'start.cmd').read_text(encoding='utf-8').replace('output\\qa-v2\\data','data')
write('start.cmd',starter)
write('start.command','''#!/bin/bash
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo "Can cai Node.js 24: https://nodejs.org/en/download"; exit 1
fi
if [ ! -f node_modules/.package-lock.json ]; then npm ci --no-audit --no-fund; fi
export PORT="${PORT:-3001}"
export TILITA_DATA_DIR="${TILITA_DATA_DIR:-$PWD/data}"
node server.js --open
''')
(dest/'start.command').chmod(0o755)
# Community edition has three original tracks, with no externally downloaded chants.
t=(dest/'test/server.test.js').read_text(encoding='utf-8').replace('music.tracks.length>=5','music.tracks.length>=3')
t=t.replace("assert.ok(music.tracks.some(t=>t.file==='music.mp3'));","assert.ok(!music.tracks.some(t=>t.file==='music.mp3'));")
t=t.replace(",'music/niem-phat-phoi-khi.mp3'",'')
write('test/server.test.js',t)
copy('scripts/release-assets/COMMUNITY-README.md','README.md')
copy('scripts/release-assets/RELEASE-REVIEW.md','RELEASE-REVIEW.md')
write('.gitignore','node_modules/\ndata/\n.env\n*.log\noutput/\n.DS_Store\n')
write('THIRD-PARTY.md','''# Nguồn và giấy phép

- TikTok-Live-Connector 2.5.0 và tiktok-live-proto: AGPL-3.0-only. Bản giấy phép kèm trong third-party-licenses. Các dependency cài qua npm giữ giấy phép riêng.
- Express và ws: MIT; kèm thông báo giấy phép.
- Nền chùa gỗ và sheet áo nâu: tạo mới bằng ImageGen cho dự án. Không kèm ảnh lấy từ repo tham khảo.
- Hiệu ứng hạt trong bản community: mã viết mới tại public/js/particles.js. Không kèm engine sao chép từ repo tham khảo.
- 99 lời xăm tự soạn; tiếng đọc tạo trước bằng ZeroTTS/Mai Chi. Không kèm mô hình/giọng tham chiếu. Nguồn mô hình và giấy phép MIT: https://huggingface.co/zeroweight-ai/ZeroTTS .
- Sen tĩnh, Trúc an, Mây thiền: nhạc tổng hợp riêng, không dùng sample bản ghi bên ngoài; kèm script tạo lại.
- Không kèm hai bản niệm Phật tải ngoài vì chưa xác nhận quyền phân phối lại.
- Đây là bản duyệt nội bộ. LICENSE-AGPL-3.0.PROPOSED.txt là đề xuất để chủ dự án duyệt, chưa phải tuyên bố cấp phép phần mã/tài nguyên tự tạo.
''')
# Verify empty identity defaults and exact voice coverage before archiving.
assert json.loads((dest/'config/default.json').read_text(encoding='utf-8'))['username']==''
assert len(list((dest/'public/assets/fortunes').glob('*.wav')))==99
assert not (dest/'data').exists()
assert not (dest/'node_modules').exists()
private=json.loads((root/'output/qa-v2/data/config.json').read_text(encoding='utf-8')).get('username','')
for p in dest.rglob('*'):
    if p.is_file() and p.suffix in ['.js','.json','.html','.md','.cmd','.command']:
        text=p.read_text(encoding='utf-8')
        assert 'C:/Users/as' not in text and 'A:\\tiktok-live' not in text
        if private: assert private.casefold() not in text.casefold(),str(p)
archive=release/'tam-an-lac-community-preview.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in dest.rglob('*'):
        if p.is_file():z.write(p,p.relative_to(release))
report={'folder':str(dest),'zip':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'status':'review-candidate-not-published','macOS':'launcher provided; not tested on a Mac'}
(release/'BUILD-REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
