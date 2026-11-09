"""Update labels/docs and the sound-bank UI. Does not touch live session statistics."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def edit(name,fn):
    p=ROOT/name;p.write_text(fn(p.read_text(encoding='utf-8-sig')),encoding='utf-8')
for name in ['public/overlay.html','public/admin.html','public/js/admin.js']:edit(name,lambda s:s.replace('mu-v1.1','mu-v1.2'))
edit('public/admin.html',lambda s:s.replace('Tương tác bất kỳ → vào hang MU ngay','10 tim hoặc bình luận “vào hang” → vào ngồi').replace('Tim tạo lượt cổ vũ · Việc vào hang MU luôn được ghi nhận','Đủ 10 tim → lên vái Carrick (vẫn phải đủ 10 tim để vào ngồi)').replace('Follow → tiếng khán đài','Follow → vỗ tay cùng lời cảm ơn').replace('Share → tiếng khán đài','Share → vỗ tay cùng lời cảm ơn').replace('Tiếng vỗ tay khi tắt lượt cổ vũ từ tim','Vỗ tay từ tim (dùng sau khi đủ chuỗi 10)').replace('Đọc thẻ fan tiếng Việt','Đọc thẻ fan và cảm ơn tiếng Việt').replace('<button data-sim="like" data-likes="2">2 tim</button><button data-sim="like" data-likes="3">3 tim</button>','<button data-sim="like" data-likes="4">4 tim</button><button data-sim="like" data-likes="6">6 tim</button>').replace('<button data-sim="like">Gói 5 tim</button>','<button data-sim="like" data-likes="10">Gói 10 tim</button><button data-sim="like" data-likes="50">Gói 50 tim (một lượt)</button>').replace('<label>Nhạc nền<select','<section class="sound-bank"><h3>File meme &amp; vỗ tay của bạn</h3><p class="small muted">Chép file vào public/assets/sounds. File chưa có sẽ im lặng. Lời đọc nằm riêng trong voice/.</p><button id="refreshSounds" type="button">Nạp lại âm thanh</button><p id="soundStatus" class="small" role="status"></p><div id="soundLibrary"></div></section><label>Nhạc nền<select'))
edit('public/js/admin.js',lambda s:s.replace("${lastLike.joined ? 1 : lastLike.progress}/1", "${lastLike.progress}/10").replace('Mọi tim, bình luận và tương tác đều vào hang MU.','Đủ 10 tim hoặc bình luận “vào hang” để vào ngồi.').replace("Number(b.dataset.likes || 5)","Number(b.dataset.likes || 10)").replace("full: 'Hàng chờ đã đầy.'", "full: 'Hàng chờ biểu diễn đã đầy; người đủ điều kiện vẫn vào ngồi.', 'entry-required':'Cần đủ 10 tim hoặc bình luận vào hang trước.', 'like-progress':'Đang cộng tim theo người, đủ 10 sẽ vào.', acknowledged:'Đã xếp dòng cảm ơn.', qualified:'Đủ 10 tim, đã vào ngồi.'"))
edit('public/js/admin.js',lambda s:s+"""
let soundSample;
async function loadSounds(){
  $('refreshSounds').disabled=true;
  try{
    const response=await fetch('/api/sounds',{cache:'no-store'});if(!response.ok)throw Error('Mở lại tool để nạp bộ âm thanh V1.2.');
    const bank=await response.json();$('soundStatus').textContent=`${bank.items.filter(x=>x.ready).length}/${bank.items.length} cue có file · Còn thiếu ${bank.missing.length}.`;
    $('soundLibrary').replaceChildren(...bank.items.map(item=>{
      const row=document.createElement('div');row.className='sound-item';const label=document.createElement('span');label.textContent=`${item.name}${item.file?' · '+item.duration?.toFixed(1)+'s':' · Chưa có file'} — ${item.title}`;row.append(label);
      if(item.ready){const button=document.createElement('button');button.type='button';button.textContent='Nghe';button.onclick=()=>attempt(async()=>{soundSample?.pause();sampleAudio?.pause();soundSample=new Audio(item.url);soundSample.volume=Number($(item.folder==='voice'?'voiceVolume':'volume').value)/100;await soundSample.play();});row.append(button);}return row;
    }));
  }finally{$('refreshSounds').disabled=false;}
}
$('refreshSounds').onclick=()=>attempt(loadSounds);attempt(loadSounds);
addEventListener('pagehide',()=>soundSample?.pause());
""")
edit('server.js',lambda s:s.replace('likeCount: req.body.likeCount ?? 5','likeCount: req.body.likeCount ?? 10').replace("content: 'GGMU', giftName: 'Rose'", "content: 'vào hang', giftName: 'Rose'").replace('Không phát được lời đọc cho ${engine.current.nickname}. Giữ thẻ theo thời gian dự phòng.','Không phát được âm thanh lượt của ${engine.current.nickname}. Kiểm tra file trong admin; hàng đợi vẫn tiếp tục.'))
edit('README.md',lambda s:s.replace('Mọi tim, bình luận, follow, share và sự kiện vào phòng hợp lệ đều ghi nhận người tham gia; không giới hạn số người. Có 7 vị trí top và 24 vị trí fan luân phiên mỗi 10 giây để khung hình không tràn. Tổng người tham gia được giữ đầy đủ trong phiên.','Đủ 10 tim theo từng người hoặc bình luận “vào hang” để vào ngồi. Quà vẫn tự đưa người tặng vào. Follow/share có dòng cảm ơn, không tự chiếm chỗ. Không giới hạn tổng thành viên; khung hình xếp dày 7 vị trí top và 80 fan, nhóm luân phiên mỗi 10 giây.').replace('Bình luận thường chỉ vào ngồi và hiện thoại; không làm đầy hàng đợi biểu diễn.','Người đã vào ngồi bình luận sẽ hiện thoại trên đầu; người mới cần đủ 10 tim hoặc gõ vào hang trước.').replace('## Âm thanh','## Âm thanh\n\nFile meme/vỗ tay do bạn soạn nằm ở `public/assets/sounds/`. Xem `docs/AM-THANH-CAN-SOAN.md` và bấm Nạp lại âm thanh trong admin sau khi chép. Năm tiếng tổng hợp cũ không còn được gọi.'))
for name in ['package.json','package-lock.json']:
    p=ROOT/name;v=json.loads(p.read_text(encoding='utf-8'));v['version']='1.2.0'
    if name=='package-lock.json':v['packages']['']['version']='1.2.0'
    p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
