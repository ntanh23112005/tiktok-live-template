"""Align inherited admission/viewport fixtures with the explicit V1.2 product changes."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,fn):
    p=ROOT/'test'/name;p.write_text(fn(p.read_text(encoding='utf-8-sig')),encoding='utf-8')
def block(s,title,next_title,replacement):
    start=s.index("test('"+title);end=s.index("test('"+next_title,start);return s[:start]+replacement+'\n'+s[end:]
def core(s):
    s=s.replace("content = 'cổ vũ'","content = 'vào hang'")
    s=s.replace("const e=engine();assert.equal(e.ingest(chat('1','CO VU cho anh em'))", "const e=engine();for(const id of ['1','2','3'])e.seatParticipant(chat(id,'vào hang'));assert.equal(e.ingest(chat('1','CO VU cho anh em'))")
    return s
edit('core.test.js',core)
edit('donation-thanks.test.js',lambda s:s.replace("content:'GGMU'","content:'vào hang'").replace('duration,SCENES.cheer.duration','duration,5500+SCENES.visit.duration'))
edit('mu.test.js',lambda s:s.replace("e.ingest(event('like','a'));","e.ingest(event('like','a',{likeCount:10}));").replace("const e=new LiveEngine(config);assert.equal(e.ingest(event('comment','guest'","const e=new LiveEngine(config);e.ingest(event('comment','guest',{content:'vào hang'}));assert.equal(e.ingest(event('comment','guest'").replace("event('join','newfan')","event('comment','newfan',{content:'vào hang'})").replace('Math.ceil(count/24)','Math.ceil(count/80)').replace('shown.length<=24','shown.length<=80').replace('view.seats.length<=31','view.seats.length<=87'))
def unlimited(s):
    s=s.replace("content:'GGMU'","content:'vào hang'").replace('<=31','<=87').replace('length<40000','length<120000').replace("e.ingest(event('like','a'));","e.ingest(event('like','a',{count:10}));")
    return block(s,'one like, any comment','1000 members',"""test('only ten likes, the entry phrase or a gift admit new users; disabled social effects do not affect eligibility',()=>{
 const e=new LiveEngine({...defaults,social:{like:false,follow:false,share:false}});
 assert.equal(e.ingest(event('like','like',{count:10})).joined,true);assert.equal(e.ingest(event('comment','comment')).joined,true);
 for(const kind of ['follow','share','join'])assert.equal(e.ingest(event(kind,kind)).joined,undefined);
 assert.equal(e.snapshot().hall.totalParticipants,2);assert.equal(e.stats.totalCoins,0);
 const repeated=event('comment','one');e.ingest(repeated);const count=e.stats.session.participants.one.interactions;
 assert.equal(e.ingest(repeated).status,'duplicate');assert.equal(e.stats.session.participants.one.interactions,count);
});""")
edit('unlimited-hall.test.js',unlimited)
def v2(s):
    s=block(s,'any positive like','likes and folded',"""test('ten likes qualify once; a large packet never creates multiple processions',()=>{
 const e=new LiveEngine(defaults);assert.equal(e.ingest(like('a',4)).status,'like-progress');assert.equal(e.queue.length,0);
 const last=like('a',6);assert.equal(e.ingest(last).status,'queued');assert.equal(e.ingest(last).status,'duplicate');
 assert.equal(e.ingest(like('b',50)).status,'queued');assert.equal(e.queue.length,2);assert.ok(e.queue.every(j=>j.free&&j.action==='visit'&&j.priority===0));
 assert.equal(e.stats.totalCoins,0);assert.equal(e.snapshot().hall.leaderboard.length,0);assert.equal(e.snapshot().hall.seats.filter(Boolean).length,2);
});""")
    s=block(s,'likes and folded','per-user likes',"""test('ten likes and folded entry phrase share pending restriction and cooldown',()=>{
 let now=100000;const e=new LiveEngine(defaults,undefined,()=>now);
 assert.equal(e.ingest(chat('a','  VAO   HANG  ')).status,'queued');assert.equal(e.ingest(like('a',50)).status,'already-queued');
 e.setRenderer('screen');assert.equal(e.ingest(like('a',50)).status,'cooldown');e.finish(e.current.id);now+=31000;
 assert.equal(e.ingest(like('a',4)).status,'like-progress');assert.equal(e.ingest(like('a',6)).status,'queued');
 assert.equal(e.ingest(chat('b','vào hang')).status,'queued');assert.equal(e.ingest(chat('c','bình luận bất kỳ')).status,'entry-required');
});""")
    s=block(s,'same-room reconnect','31 coordinates',"""test('same-room reconnect preserves partial hearts; a new room resets them',()=>{
 const e=new LiveEngine(defaults);e.beginSession('room-1');assert.equal(e.ingest(like('a',4)).status,'like-progress');e.beginSession('room-1');assert.equal(e.ingest(like('a',6)).status,'queued');
 e.beginSession('room-2');assert.equal(e.likeCounts.size,0);assert.equal(e.cooldowns.size,0);
});""")
    s=block(s,'31 coordinates','migration preserves',"""test('87 coordinates reserve top 3, next 4 and eighty tightly packed fans',()=>{
 assert.equal(HALL_LAYOUT.length,87);assert.equal(new Set(HALL_LAYOUT.map(p=>p.x+':'+p.y)).size,87);
 assert.equal(HALL_LAYOUT.filter(p=>p.row===0).length,3);assert.equal(HALL_LAYOUT.filter(p=>p.row===1).length,4);
 for(let row=2;row<=9;row++){assert.equal(HALL_LAYOUT.filter(p=>p.row===row&&p.side==='left').length,5);assert.equal(HALL_LAYOUT.filter(p=>p.row===row&&p.side==='right').length,5);}
 assert.ok(HALL_LAYOUT.slice(7).every(p=>p.x<=390||p.x>=660));assert.ok(HALL_LAYOUT.every(p=>p.y<=1760&&p.x<980));
});""")
    s=s.replace("chat('b','GGMU')","chat('b','vào hang')").replace("chat('real','GGMU')","chat('real','vào hang')")
    for id in ['a','guest','demo','ignored-demo']:s=s.replace("like('"+id+"',5)","like('"+id+"',10)")
    s=s.replace('for(let i=0;i<40;i++)','for(let i=0;i<100;i++)').replace('hall.seats.length,31','hall.seats.length,87')
    s=block(s,'actual v3 decoded','v3 total never',"""test('actual v3 decoded per-user counts accumulate to ten, including zero placeholder identifiers',()=>{
 const e=new LiveEngine(defaults);const packet=count=>{const raw=WebcastLikeMessage.decode(Uint8Array.of(16,count));assert.equal(Object.hasOwn(raw,'likeCount'),false);return normalizeEvent('like',{...raw,user:{id:'0',uniqueId:'real-viewer',nickname:'Người xem thật'},common:{msgId:'0',roomId:'0'}},'room-real');};
 const first=packet(4);assert.equal(first.likeCount,4);assert.equal(first.userId,'real-viewer');assert.equal(first.eventId,'');assert.equal(first.room,'room-real');assert.equal(e.ingest(first).status,'like-progress');assert.equal(e.snapshot().participation.lastLike.progress,4);
 assert.equal(e.ingest(packet(6)).seatStatus,'seated');assert.equal(e.snapshot().hall.seats.filter(Boolean)[0].id,'real-viewer');assert.equal(e.queue.length,1);assert.equal(e.snapshot().participation.receivedLikes,10);assert.equal(e.snapshot().participation.receivedLikeEvents,2);
});""")
    s=s.replace("{count:5,total:","{count:10,total:").replace("{likeCount:5,user:{id:'legacy'}","{likeCount:10,user:{id:'legacy'}").replace('participation.receivedLikes,5','participation.receivedLikes,10')
    return s
edit('v2.test.js',v2)
