export const POSES=['standing','sitting','lying','crying','cursing','walkL','walkR','bowStand','bowKneel','bowLow','celebrating','kicking'];
export const CHARACTER_NAMES={male:'Nam',female:'Nữ',ronaldo:'Ronaldo',maguire:'Maguire'};
export const atlases=await fetch('/assets/mu-cave-v1/atlases.json').then(r=>{if(!r.ok)throw Error('Thiếu bản đồ sprite');return r.json();});
export function createSprite(character='ronaldo',height=130,maxWidth=Infinity) {
  const element=document.createElement('div'),img=document.createElement('img');element.className='sprite';img.alt='';element.append(img);let last='',currentSkin=character,currentPose='standing';
  function set(skin=character,pose='standing') {
    if(!atlases[skin])skin='ronaldo';if(!POSES.includes(pose))pose='standing';
    const key=skin+pose;if(key===last)return;last=key;currentSkin=skin;currentPose=pose;
    const atlas=atlases[skin],rect=atlas.poses[pose],factor=Math.min(height/atlas.standingHeight,maxWidth/rect.w);
    element.dataset.character=skin;element.dataset.pose=pose;
    element.style.width=rect.w*factor+'px';element.style.height=rect.h*factor+'px';
    img.src='/assets/mu-cave-v1/'+skin+'.png';img.style.width=atlas.width*factor+'px';img.style.height=atlas.height*factor+'px';img.style.left=-rect.x*factor+'px';img.style.top=-rect.y*factor+'px';
  }
  set(character);return {element,set,resize(nextHeight,nextWidth){if(height===nextHeight&&maxWidth===nextWidth)return;height=nextHeight;maxWidth=nextWidth;last='';set(currentSkin,currentPose);}};
}
export async function preloadArt() {
  await Promise.all(['male','female','ronaldo','maguire','carrick','props','card-frame','background'].map(name=>{const image=new Image();image.src='/assets/mu-cave-v1/'+name+'.png';return image.decode();}));
  await Promise.all(['cast','red-devil'].map(name=>{const image=new Image();image.src='/assets/mu-meme-v1.3/'+name+'.png';return image.decode();}));
}
