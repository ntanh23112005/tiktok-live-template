export function mountMusicPanel({ api, toast, audio, refresh, unlock }) {
  const panel=document.createElement('section');panel.className='music-panel';
  panel.innerHTML=`<div class="eyebrow">NHẠC NỀN</div><label class="music-drop" id="music-drop"><i data-lucide="upload" aria-hidden="true"></i><span>Thả tệp nhạc vào đây hoặc bấm để chọn<small>MP3, WAV, M4A… · tối đa 50 MB</small></span><input id="music-file" type="file" accept="audio/*,.m4a,.flac" hidden></label><p id="music-name">Chưa chọn nhạc nền</p><div class="music-actions"><button id="music-play" class="button subtle" disabled><i data-lucide="play" aria-hidden="true"></i>Phát nhạc</button><button id="music-remove" class="icon-button" aria-label="Xóa nhạc nền" disabled><i data-lucide="trash-2" aria-hidden="true"></i></button></div><label class="music-level">Âm lượng nhạc<input id="music-volume" type="range" min="0" max="100" value="20"><output id="music-volume-value">20%</output></label><label class="music-duck"><input id="music-duck" type="checkbox" checked>Giảm nhạc khi có tiếng súng</label><p class="music-help">Nhạc được phát lặp lại. Âm lượng nhạc và tiếng súng được chỉnh riêng.</p>`;
  document.querySelector('.inspector').appendChild(panel);
  const $=selector=>panel.querySelector(selector);let state,uploading=false,timer;
  async function upload(file){
    if(!file||uploading)return;if(file.size>50*1024*1024)return toast('Tệp nhạc phải nhỏ hơn 50 MB.');
    uploading=true;$('#music-name').textContent=`Đang tải ${file.name} lên…`;
    try{const response=await fetch('/api/music/upload',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error);toast('Đã tải nhạc lên. Bấm Phát nhạc để nghe.');}
    catch(error){toast(error.message);$('#music-name').textContent=state?.music?.track?.name||'Chưa chọn nhạc nền';}
    finally{uploading=false;$('#music-file').value='';}
  }
  $('#music-file').addEventListener('change',event=>upload(event.target.files[0]));
  const drop=$('#music-drop');for(const name of ['dragenter','dragover'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('drag-over');});
  for(const name of ['dragleave','drop'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('drag-over');if(name==='drop')upload(event.dataTransfer.files[0]);});
  $('#music-play').addEventListener('click',async()=>{try{await unlock();await api(state?.music?.playing?'music/pause':'music/play');}catch(error){toast(error.message);}});
  $('#music-remove').addEventListener('click',async()=>{try{await api('music/remove');}catch(error){toast(error.message);}});
  $('#music-volume').addEventListener('input',event=>{const value=Number(event.target.value)/100;$('#music-volume-value').textContent=`${event.target.value}%`;audio.musicVolume=value;if(audio.musicGain)audio.musicGain.gain.setTargetAtTime(audio.enabled?value:0,audio.context.currentTime,.02);clearTimeout(timer);timer=setTimeout(()=>api('settings',{musicVolume:value}).catch(error=>toast(error.message)),200);});
  $('#music-duck').addEventListener('change',event=>api('settings',{duckMusic:event.target.checked}).catch(error=>toast(error.message)));
  refresh();
  return { update(remote){state=remote;const music=remote.music;$('#music-name').textContent=uploading?'Đang tải nhạc lên…':music?.track?.name||'Chưa chọn nhạc nền';$('#music-play').disabled=!music?.track;$('#music-remove').disabled=!music?.track;$('#music-play').innerHTML=`<i data-lucide="${music?.playing?'pause':'play'}" aria-hidden="true"></i>${music?.playing?'Tạm dừng':'Phát nhạc'}`;if(document.activeElement!==$('#music-volume'))$('#music-volume').value=(remote.settings.musicVolume??.2)*100;$('#music-volume-value').textContent=`${Math.round((remote.settings.musicVolume??.2)*100)}%`;$('#music-duck').checked=remote.settings.duckMusic!==false;refresh();} };
}
