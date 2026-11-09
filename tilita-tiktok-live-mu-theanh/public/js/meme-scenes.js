// Offsets are milliseconds from the end of the walk-up/bow, shared with the server.
export const MEME_SCENES=Object.freeze({
  'cave-door':{hero:'maguire',size:'small',duration:6500,soundAt:1500,title:'ĐÓNG CỬA HANG!',caption:'Hẹn trận sau… lại thế!'},
  antony:{hero:'antony',size:'small',duration:6500,soundAt:1800,title:'COMPA ANTONY',caption:'Bóng đi rồi. Anh vẫn quay.'},
  siuuu:{hero:'ronaldo',size:'medium',duration:6200,soundAt:2300,title:'SIUUUU!',caption:'Tiếp đất phát, rung cả hang!'},
  ole:{hero:'ole',size:'medium',duration:7500,soundAt:1800,title:'OLE CẦM LÁI',caption:'Bằng lái để ở Old Trafford!'},
  fergie:{hero:'fergie',size:'full',duration:8500,soundAt:2300,title:'FERGIE TIME',caption:'Chưa thắng thì chưa hết giờ!'},
  ggmu:{hero:'carrick',size:'full',duration:9500,soundAt:2200,title:'GGMU · MỞ HỘI!',caption:'Hang này hôm nay không ngủ!'},
});
export const MEME_CAST=Object.freeze({
  maguire:{column:0,row:0,name:'MAGUIRE'},antony:{column:1,row:0,name:'ANTONY'},ronaldo:{column:2,row:0,name:'RONALDO'},
  ole:{column:0,row:1,name:'OLE'},fergie:{column:1,row:1,name:'SIR ALEX'},carrick:{column:2,row:1,name:'CARRICK'},
});
export function memePhase(action,time) {
  const spec=MEME_SCENES[action];if(!spec)return null;
  const t=Math.max(0,time),impact=spec.soundAt;
  return {...spec,t,progress:Math.min(1,t/spec.duration),closeup:t<850||t>=spec.duration-1250,impact:Math.max(0,1-(t-impact)/500)*(t>=impact?1:0),
    goal:action==='fergie'&&t>=impact,flyBall:action==='antony'&&t>=4000};
}
