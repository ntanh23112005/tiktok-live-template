import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFile} from 'music-metadata';
import {SOUND_SPECS} from '../public/js/sound-cues.js';
const root=fileURLToPath(new URL('../public/assets/sounds/',import.meta.url)),cache=new Map();
export async function scanSounds({folder=root}={}) {
  const items=await Promise.all(SOUND_SPECS.map(async spec=>{
    const dir=path.join(folder,spec.folder||'');
    const file=['mp3','wav','m4a','ogg'].map(ext=>spec.name+'.'+ext).find(file=>fs.existsSync(path.join(dir,file)));
    if(!file)return {...spec,ready:false};
    try{
      const full=path.join(dir,file),stat=fs.statSync(full),key=full+':'+stat.size+':'+stat.mtimeMs;
      let duration=cache.get(key);if(!duration){duration=(await parseFile(full,{duration:true,skipCovers:true})).format.duration;if(!Number.isFinite(duration)||duration<=0||duration>120)throw Error('File phải dài từ 0 đến 120 giây');cache.set(key,duration);}
      const url='/assets/sounds/'+(spec.folder?spec.folder+'/':'')+file+'?v='+Math.floor(stat.mtimeMs);
      return {...spec,file,url,duration,ready:true};
    }catch(error){return {...spec,file,ready:false,error:error.message};}
  }));
  return {folder:'public/assets/sounds',items,byId:Object.fromEntries(items.filter(x=>x.ready).map(x=>[x.id,{url:x.url,duration:x.duration}])),missing:items.filter(x=>!x.ready).map(x=>x.id)};
}
let library=await scanSounds();
export const getSoundLibrary=()=>library;
export async function refreshSounds(){library=await scanSounds();return library;}
