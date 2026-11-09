import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { SCENES, ACTIONS } from '../public/js/actions.js';
import { parseCommand } from './commands.js';
import { SCENE_VERSION, RUNTIME_REVISION, HALL_CAPACITY, VISIBLE_HALL_CAPACITY, HALL_LAYOUT, GIFT_TIERS, giftTier, roleForRank } from '../public/js/experience.js';
import { loadFanCardAudio, pickFanCard } from './fan-cards.js';
import { hallView } from './hall.js';
import { InteractionFeed } from './interaction-feed.js';
import { isMusicFile } from '../public/js/music-files.js';
import {getSoundLibrary} from './sounds.js';
import {Acknowledgements} from './acknowledgements.js';
import {presentationBusy} from '../public/js/actions.js';
import {MEME_SCENES} from '../public/js/meme-scenes.js';

export { ACTIONS };
export const normalize = v => String(v ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const text = (v, max = 160) => String(v ?? '').normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, '').slice(0, max).trim();
const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const identifier = (...values) => values.map(v => String(v ?? '').trim()).find(v => v && v !== '0') || '';
const avatarURL = v => { try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const emptySession = (roomId = '', now = Date.now()) => ({ roomId, startedAt: now, users: {}, participants: {}, participantSequence: 0, totalCoins: 0, totalGifts: 0, sequence: 0 });
const rankUsers = users => Object.values(users).filter(u => u.coins > 0).sort((a, b) => b.coins - a.coins || (a.attainedOrder ?? a.attainedAt ?? 0) - (b.attainedOrder ?? b.attainedAt ?? 0) || a.id.localeCompare(b.id));
const tierRule = () => ({ id: 'mu-gift-tiers', type: 'gift', enabled: true, match: '*', action: 'auto', priority: 10 });
export function migrateConfig(input) {
  if (input?.sceneVersion === SCENE_VERSION) return input;
  const c = structuredClone(input);
  c.sceneVersion = SCENE_VERSION;
  c.rules = [...(c.rules || []).filter(r => r.type !== 'gift'), tierRule()];
  return c;
}

export function validateConfig(input) {
  if (!input || !Array.isArray(input.rules) || input.rules.length > 100) throw new Error('Cần danh sách luật hợp lệ (tối đa 100).');
  const c = structuredClone(input);
  c.sceneTitle = text(c.sceneTitle, 70) || 'HANG MU · THEANH'; c.username = text(c.username, 50).replace(/^@/, '');
  for (const [key, min, max] of [['volume', 0, 1], ['musicVolume', 0, 1], ['queueLimit', 1, 1000], ['commentCooldownSec', 1, 3600]]) {
    if (!Number.isFinite(Number(c[key])) || Number(c[key]) < min || Number(c[key]) > max) throw new Error(`${key}: giá trị từ ${min} đến ${max}.`);
    c[key] = Number(c[key]);
  }
  c.queueLimit = Math.floor(c.queueLimit);
  c.musicFile = String(c.musicFile || '');
  if (c.musicFile && !isMusicFile(c.musicFile)) throw new Error('Chọn file MP3/WAV/M4A/OGG trong thư mục nhạc của tool.');
  c.social = Object.fromEntries(['like', 'follow', 'share'].map(k => [k, c.social?.[k] === true]));
  c.sceneVersion = SCENE_VERSION;
  c.showGiftBoard = c.showGiftBoard !== false;
  c.showLeaderboard = c.showLeaderboard !== false;
  c.voiceEnabled = c.voiceEnabled !== false;
  c.musicLoop = c.musicLoop !== false;
  c.voiceVolume = number(c.voiceVolume, .85);
  if (c.voiceVolume < 0 || c.voiceVolume > 1) throw new Error('Âm lượng giọng đọc từ 0 đến 1.');
  c.participation = { likesEnabled:c.participation?.entryPolicy==='ten-likes-v1'?c.participation.likesEnabled!==false:true,likesRequired:10,cooldownSec:30,phrase:'vào hang',entryPolicy:'ten-likes-v1' };
  c.giftTiers = structuredClone(GIFT_TIERS);
  const ids = new Set();
  c.rules = c.rules.map(r => {
    if (!['comment', 'gift'].includes(r.type) || (!Object.hasOwn(ACTIONS, r.action) && !(r.type === 'gift' && r.action === 'auto'))) throw new Error('Loại luật hoặc hành động không hợp lệ.');
    const id = text(r.id, 60) || randomUUID(); if (ids.has(id)) throw new Error('Mã luật bị trùng.'); ids.add(id);
    const match = text(r.match, 300); if (!match || (r.type === 'comment' && match.split(',').some(t => !normalize(t)))) throw new Error('Luật phải có từ khóa/tên hoặc ID quà hợp lệ.');
    if (!Number.isFinite(Number(r.priority)) || Number(r.priority) < 0 || Number(r.priority) > 100) throw new Error('Ưu tiên từ 0 đến 100.');
    return { id, type: r.type, enabled: r.enabled === true, match, action: r.action, priority: Number(r.priority) };
  });
  // V2's permanent board is a contract: all gifts use the same value tiers.
  c.rules = [...c.rules.filter(r => r.type === 'comment'), tierRule()];
  return c;
}

export function normalizeEvent(kind, data, room = '', simulated = false) {
  const u = data.user || data; const gift = data.gift || data.giftDetails || {};
  return {
    kind, simulated, room: identifier(data.common?.roomId, room), eventId: identifier(data.eventId, data.common?.msgId, data.event?.msgId, data.msgId),
    userId: identifier(u.userId, u.id, u.uniqueId, u.displayId, data.uniqueId),
    nickname: text(u.nickname || u.uniqueId || u.displayId || data.nickname || 'Người xem', 60),
    avatar: avatarURL(u.profilePictureUrl || u.profilePicture?.urls?.[0] || u.avatarThumb?.urlList?.[0] || u.avatarMedium?.urlList?.[0] || data.profilePictureUrl),
    comment: text(data.comment || data.content, 240), giftId: String(data.giftId || gift.id || ''),
    giftName: text(data.giftName || gift.name || gift.giftName || data.extendedGiftInfo?.name || 'Quà tặng', 80),
    coins: Math.max(0, number(gift.diamondCount ?? data.diamondCount ?? data.extendedGiftInfo?.diamond_count)),
    quantity: Math.min(100000, Math.max(1, Math.floor(number(data.repeatCount ?? data.comboCount, 1)))),
    // Connector 2.5's v3 protocol calls this `count`; legacy payloads use `likeCount`.
    // `total` / `totalLikeCount` belong to the whole room and must never qualify a user.
    likeCount: Math.max(0, Math.min(100000, Math.floor(number(data.count ?? data.likeCount)))),
    groupId: data.groupId && String(data.groupId) !== '0' ? String(data.groupId) : '', giftType: number(data.giftType ?? gift.type ?? gift.giftType),
    ended: [true, 1, '1', 'true'].includes(data.repeatEnd),
  };
}

const participantsFor=(engine,id)=>(engine.hallDemo?engine.demoParticipants:engine.stats.session.participants)[id];
const defaultCharacter=id=>['male','female','ronaldo','maguire'][Array.from(id).reduce((sum,c)=>sum+c.codePointAt(0),0)%4];

export class LiveEngine extends EventEmitter {
  constructor(config, stats = { users: {}, totalGifts: 0, totalCoins: 0 }, now = Date.now) {
    super(); this.config = validateConfig(config); this.stats = stats; this.now = now;
    if (!stats.session || !stats.session.users || Array.isArray(stats.session.users) || typeof stats.session.users !== 'object' || Object.values(stats.session.users).some(u => !u || !Number.isFinite(u.coins) || !Number.isFinite(u.gifts))) stats.session = emptySession('', now());
    const participants = stats.session.participants;
    if (!participants || Array.isArray(participants) || typeof participants !== 'object' || Object.values(participants).some(u => !u || typeof u.id !== 'string' || typeof u.name !== 'string' || !Number.isFinite(u.joinedOrder))) stats.session.participants = {};
    stats.session.participantSequence = Object.values(stats.session.participants).reduce((max, person) => Math.max(max, person.joinedOrder), 0);
    this.hallDemo = null;
    this.demoParticipants = {};
    this.interactions = new InteractionFeed();this.acknowledgements=new Acknowledgements(); this.participantsDirty = false;
    this.queue = []; this.current = null; this.history = []; this.logs = [];
    this.paused = false; this.accepting = true; this.renderer = null; this.primaryRun = 0;
    this.seen = new Map(); this.combos = new Map(); this.cooldowns = new Map(); this.likeCounts = new Map(); this.lastSocial = new Map(); this.notice = null;
    this.fanCardAudio = loadFanCardAudio();
    this.likeDiagnostics = { events: 0, likes: 0, last: null };
  }
  log(level, message) { this.logs.unshift({ time: this.now(), level, message }); this.logs.length = Math.min(100, this.logs.length); this.emit('change'); }
  beginSession(roomId) {
    roomId = String(roomId || '');
    if (!roomId || this.stats.session.roomId === roomId) return;
    if(this.stats.session.roomId) { this.queue=[]; if(this.current)this.finish(this.current.id,'interrupted',false); this.combos.clear(); this.seen.clear(); }
    this.stats.session = emptySession(roomId, this.now()); this.hallDemo = null;this.returnSeat=null;this.frozenHall=null;
    this.interactions = new InteractionFeed();this.acknowledgements=new Acknowledgements();
    this.demoParticipants = {};
    this.likeCounts.clear(); this.cooldowns.clear();
    this.likeDiagnostics = { events: 0, likes: 0, last: null };
    this.emit('stats'); this.emit('change');
  }
  showHallDemo() {
    this.interactions = new InteractionFeed();
    this.demoParticipants = {};
    const names = ['Minh MU', 'Fan Quỷ Đỏ', 'Thanh Hoa', 'Quang Huy', 'Hải Yến', 'Lan Anh', 'Hoàng Nam', 'Mai Phương', 'Khánh Linh'];
    this.hallDemo = Array.from({ length: 7 }, (_, i) => ({ id: `demo-${i}`, name: names[i], character:['male','female','ronaldo','maguire'][i%4], preferredPose:'sitting', avatar:'', coins: (7-i)*100, gifts: 7-i, attainedAt: i }));
    this.demoParticipants=Object.fromEntries(Array.from({length:93},(_,i)=>{const id=`demo-member-${i}`;return [id,{id,name:names[(i+4)%names.length]+` ${i+1}`,avatar:'',character:['male','female','ronaldo','maguire'][i%4],preferredPose:'sitting',joinedOrder:i+1}];}));
    this.demoFixture=true;
    this.interactions.record({kind:'comment',userId:'demo-member-0',nickname:'An Nhiên',avatar:'',comment:'Quỷ đỏ lên nào! GGMU!'});
    this.interactions.tick(this.now());
    this.emit('change');
  }
  snapshot() {
    const allLeaders = this.hallDemo || rankUsers(this.stats.session.users);
    let leaders = allLeaders.slice(0, HALL_CAPACITY).map((u,i)=>({...participantsFor(this,u.id),...u,role:roleForRank(i+1)}));
    const participants = this.hallDemo ? this.demoParticipants : this.stats.session.participants;
    const calculated = hallView(allLeaders, participants, ['ggmu','fergie'].includes(this.current?.action) ? this.current.startedAt : this.now(), this.stats.session.startedAt);
    const returning=this.current?.procession?{userId:this.current.userId,until:Infinity}:this.returnSeat;
    const spotlight=[...(returning&&returning.until>this.now()?[returning.userId]:[]),...this.interactions.active.map(item=>item.userId)];let reserved=VISIBLE_HALL_CAPACITY-1;
    const protectedIds=new Set(spotlight);
    for(const id of protectedIds)if(!calculated.seats.some(u=>u?.id===id)) {
      const profile=participants[id]||allLeaders.find(u=>u.id===id);
      if(profile){while(reserved>=7&&protectedIds.has(calculated.seats[reserved]?.id))reserved--;const rank=allLeaders.findIndex(u=>u.id===id)+1;calculated.seats[reserved--]={...profile,rank,role:roleForRank(rank),kind:rank?'contributor':'participant'};}
    }
    let view=calculated;
    if(['ggmu','fergie'].includes(this.current?.action)) {
      if(this.frozenHall?.jobId!==this.current.id)this.frozenHall={jobId:this.current.id,view:structuredClone(calculated),leaders:structuredClone(leaders)};
      view={...this.frozenHall.view,totalParticipants:calculated.totalParticipants};leaders=this.frozenHall.leaders;
    } else this.frozenHall=null;
    return { runtimeRevision: RUNTIME_REVISION, config: this.config, queue: this.queue, current: this.current, history: this.history, logs: this.logs,
      paused: this.paused, accepting: this.accepting, renderer: this.renderer, notice: this.notice,
      hall: { mode: this.hallDemo ? 'demo' : 'live', capacity: VISIBLE_HALL_CAPACITY, roomId: this.stats.session.roomId, startedAt: this.stats.session.startedAt, leaderboard: leaders, ...view, waitingParticipants: 0, totalCoins: this.stats.session.totalCoins, totalGifts: this.stats.session.totalGifts },
      fanCardAudio: { ready: this.fanCardAudio.ready, total: this.fanCardAudio.total, missing: this.fanCardAudio.missing, voice: this.fanCardAudio.voice },
      interactions: this.interactions.snapshot(),
      acknowledgements:this.acknowledgements.snapshot(),sounds:getSoundLibrary(),
      participation: { likesRequired:10,cooldownSec:30,countingUsers:this.likeCounts.size,receivedLikeEvents:this.likeDiagnostics.events,receivedLikes:this.likeDiagnostics.likes,lastLike:this.likeDiagnostics.last },
      stats: { totalGifts: this.stats.totalGifts, totalCoins: this.stats.totalCoins, leaderboard: Object.values(this.stats.users).sort((a, b) => b.coins - a.coins).slice(0, 20) } };
  }
  flushParticipants(force=false) { if(this.participantsDirty && (force || this.now()-(this.lastParticipantFlush??-Infinity)>=1000)) { this.lastParticipantFlush=this.now();this.participantsDirty=false; this.emit('stats'); } }
  interactionBlocked() { return !!this.current && (this.current.action==='fan-card' || MEME_SCENES[this.current.action] || this.now()-this.current.startedAt < (this.current.actionStartDelay||0)); }
  tick() {
    const now = this.now();
    this.interactions.tick(now,this.interactionBlocked());this.acknowledgements.tick(now,presentationBusy(this.current,this.current?now-this.current.startedAt:0)); this.flushParticipants();
    if(this.displaySecond!==Math.floor(now/1000)) { this.displaySecond=Math.floor(now/1000); this.emit('change'); }
    for (const [key, at] of this.seen) if (now - at > 3600000) this.seen.delete(key);
    for (const [key, c] of this.combos) if (now - c.at > 120000) { this.combos.delete(key); this.log('warn', `Combo ${c.name} chưa có kết thúc, không tự tạo lượt.`); }
    for (const [key, at] of this.cooldowns) if (now - at > 3600000) this.cooldowns.delete(key);
    for (const [key, item] of this.likeCounts) if (now - item.at > 3600000) this.likeCounts.delete(key);
    if (this.current && now > this.current.startedAt + this.current.duration + 5000) { this.log('warn', 'Màn hình không báo hoàn tất; kết thúc lượt bằng thời hạn dự phòng.'); this.finish(this.current.id, 'timeout'); }
  }
  setRenderer(id) {
    if (this.renderer === id) return;
    if (this.renderer && this.current) this.finish(this.current.id, 'interrupted', false);
    this.renderer = id; this.emit('change'); this.pump();
  }
  ingest(e, manualAction = null) {
    const result = this.processEvent(e, manualAction);
    const eligible=this.isMember(e)||result.eligible||e.kind==='gift';
    if(this.accepting && eligible && e.userId && ['comment','like','follow','share','join','gift'].includes(e.kind) && !['duplicate','combo','missing-id','invalid-like'].includes(result.status) && (e.kind!=='like'||e.likeCount>0) && !(e.simulated && (e.seatSimulation===false || this.simulationSeatsEnabled===false))) {
      this.beginSession(e.simulated ? '' : e.room);
      const seatStatus=this.seatParticipant(e);
      const people=e.simulated?this.demoParticipants:this.stats.session.participants;
      const person=people[e.userId];
      person.interactions=(person.interactions||0)+1;person.lastKind=e.kind;person.lastSeen=this.now();
      if(e.kind==='comment') person.lastComment=e.comment;
      if(e.kind==='like') person.likes=(person.likes||0)+e.likeCount;
      if(e.kind==='comment')this.interactions.record(e,{coins:e.simulated?(this.hallDemo||[]).find(u=>u.id===e.userId)?.coins||0:this.stats.session.users[e.userId]?.coins||0});this.interactions.tick(this.now(),this.interactionBlocked());
      result.seatStatus=seatStatus;result.joined=true;this.emit('change');
    }
    if (e.kind === 'like' && !e.simulated) {
      this.likeDiagnostics.events++;
      if (result.status !== 'duplicate') this.likeDiagnostics.likes += e.likeCount;
      this.likeDiagnostics.last = { nickname:e.nickname,count:e.likeCount,progress:result.likeProgress??this.likeCounts.get(`${e.simulated}:${e.room}:${e.userId}`)?.count??0,joined:!!result.joined,status:result.status,seatStatus:result.seatStatus||null,at:this.now() };
      this.emit('change');
    }
    return result;
  }
  isMember(e){return Object.hasOwn(e.simulated?this.demoParticipants:this.stats.session.participants,e.userId)||(!e.simulated&&this.stats.session.users[e.userId]?.coins>0);}
  acknowledge(e,kind,applause=true){
    const voice=getSoundLibrary().byId[kind==='likes'?'likes-voice':kind+'-voice'];
    this.acknowledgements.record({...e,receivedAt:this.now()},kind,voice||null,applause);
    this.acknowledgements.tick(this.now(),presentationBusy(this.current,this.current?this.now()-this.current.startedAt:0));this.emit('change');
  }
  processEvent(e, manualAction = null) {
    if (manualAction && (!e.simulated || !Object.hasOwn(SCENES, manualAction))) throw new Error('Chỉ mô phỏng được chọn kịch bản trực tiếp.');
    this.tick();
    if (!e.simulated && ['comment','like','follow','share','join','gift'].includes(e.kind)) this.beginSession(e.room);
    if (e.kind === 'gift') {
      const base = `${e.simulated}:${e.room}:${e.userId || e.nickname}:${e.giftId || e.giftName}`;
      const key = `${base}:${e.groupId}`;
      if (e.giftType === 1) {
        if (!e.ended) { const prev = this.combos.get(key); this.combos.set(key, { at: this.now(), quantity: Math.max(e.quantity, prev?.quantity || 0), name: e.giftName }); return { status: 'combo' }; }
        e.quantity = Math.max(e.quantity, this.combos.get(key)?.quantity || 0); this.combos.delete(key);
      }
      const dedup = e.giftType === 1 && e.groupId ? `combo:${key}` : e.eventId ? `event:${e.simulated}:${e.room}:${e.eventId}` : e.groupId ? `combo:${key}` : '';
      if (!dedup) { this.log('warn', 'Quà thiếu mã giao dịch/nhóm; bỏ qua để tránh tính trùng.'); return { status: 'missing-id' }; }
      if (this.seen.has(dedup)) return { status: 'duplicate' };
      this.seen.set(dedup, this.now());
      if (!e.simulated) {
        this.beginSession(e.room);
        if(this.hallDemo) this.interactions = new InteractionFeed();
        this.hallDemo = null;
        this.demoParticipants = {};
        const id = e.userId || e.nickname;
        if (!Object.hasOwn(this.stats.users, id)) Object.defineProperty(this.stats.users, id, { value: { id, name: e.nickname, avatar: e.avatar, coins: 0, gifts: 0 }, enumerable: true, writable: true });
        const s = this.stats.users[id];
        s.name = e.nickname; s.avatar = e.avatar; s.coins += e.coins * e.quantity; s.gifts += e.quantity;
        this.stats.totalGifts += e.quantity; this.stats.totalCoins += e.coins * e.quantity;
        const session = this.stats.session;
        if (!Object.hasOwn(session.users, id)) Object.defineProperty(session.users, id, { value: { id, name: e.nickname, avatar: e.avatar, coins: 0, gifts: 0, attainedAt: this.now() }, enumerable: true, writable: true });
        const contributor = session.users[id];
        contributor.name = e.nickname; if (e.avatar) contributor.avatar = e.avatar;
        contributor.coins += e.coins * e.quantity; contributor.gifts += e.quantity;
        if (e.coins > 0) { contributor.attainedAt = this.now(); session.sequence = (session.sequence || 0) + 1; contributor.attainedOrder = session.sequence; }
        session.totalCoins += e.coins * e.quantity; session.totalGifts += e.quantity; this.emit('stats');
      }
      this.notice = { id: randomUUID(), time: this.now(), nickname: e.nickname, giftName: e.giftName, quantity: e.quantity, coins: e.coins * e.quantity, simulated: e.simulated };
      this.emit('change');
    } else if (['comment','like','follow','share','join'].includes(e.kind) && e.eventId) {
      const key = `${e.kind}:${e.simulated}:${e.room}:${e.eventId}`;
      if (this.seen.has(key)) return { status: 'duplicate' }; this.seen.set(key, this.now());
    }
    if (e.kind === 'like') {
      if (!this.accepting) return { status: 'not-accepting' };
      if (!e.userId || !e.likeCount) return { status: 'invalid-like' };
      const key = `${e.simulated}:${e.room}:${e.userId}`;
      const count=(this.likeCounts.get(key)?.count||0)+e.likeCount;
      if(count<10){this.likeCounts.set(key,{count,at:this.now()});return {status:'like-progress',likeProgress:count};}
      this.likeCounts.delete(key);
      const result=this.config.participation.likesEnabled?this.enqueue(e,{action:'visit',priority:0},true):{status:'qualified'};
      this.acknowledge(e,'likes',result.status!=='queued');
      return {...result,eligible:true,likeProgress:10};
    }
    if (e.kind === 'join') return {status:this.isMember(e)?'joined':'entry-required'};
    if (['follow', 'share'].includes(e.kind)) {
      if(!this.accepting)return {status:'not-accepting'};
      this.acknowledge(e,e.kind,this.config.social[e.kind]);return {status:'acknowledged'};
    }
    if (!this.accepting) return { status: 'not-accepting' };
    const eligible = this.config.rules.filter(r => r.enabled && r.type === e.kind);
    const tokens = r => r.match.split(',').map(x => x.trim()).filter(Boolean);
    let rule;
    if (e.kind === 'comment') {
      if(` ${normalize(e.comment)} `.includes(' vao hang '))return {...this.enqueue(e,{action:'visit',priority:0},true),eligible:true};
      if(!this.isMember(e))return {status:'entry-required'};
      const command=parseCommand(e.comment);
      if(command) {
        this.seatParticipant(e);const person=participantsFor(this,e.userId||e.nickname);
        const leaders=e.simulated?(this.hallDemo||[]):rankUsers(this.stats.session.users);
        const rank=leaders.findIndex(u=>u.id===person.id)+1;
        if(command.field==='captain' && !(rank>0&&rank<=7)) return {status:'role-restricted'};
        person[command.field]=command.value;if(command.field==='preferredPose')person.poseChangedAt=this.now();if(!e.simulated)this.participantsDirty=true;
        return {status:'command',command:command.field,value:command.value};
      }
      rule=eligible.find(r=>tokens(r).some(t=>` ${normalize(e.comment)} `.includes(` ${normalize(t)} `)));
    }
    else if (e.kind === 'gift') {
      rule = eligible.find(r => tokens(r).includes(`id:${e.giftId}`)) || eligible.find(r => tokens(r).some(t => normalize(t) === normalize(e.giftName))) || eligible.find(r => tokens(r).includes('*'));
    }
    if (e.kind === 'comment' && !rule && e.comment) return {status:'joined'};
    if (manualAction) rule = { action: manualAction, priority: 10 };
    if (!rule) return { status: 'no-rule' };
    return this.enqueue(e, rule, e.kind === 'comment');
  }
  freeGate(userKey) {
    if (this.queue.some(j => j.free && j.userKey === userKey)) return 'already-queued';
    if (this.now() - (this.cooldowns.get(userKey) ?? -Infinity) < Math.max(30, this.config.commentCooldownSec) * 1000) return 'cooldown';
    return null;
  }
  seatParticipant(e) {
    if (e.simulated && (e.seatSimulation === false || this.simulationSeatsEnabled===false)) return 'simulation-only';
    if (e.simulated) {
      // Offline interactions never alter live session statistics.
      if (this.demoFixture || !Object.keys(this.demoParticipants).length) {this.demoFixture=false;this.demoParticipants={};this.hallDemo = [];this.interactions=new InteractionFeed();}
    } else { this.demoFixture=false;if(this.hallDemo) this.interactions=new InteractionFeed();this.hallDemo = null; this.demoParticipants = {}; }
    const people = e.simulated ? this.demoParticipants : this.stats.session.participants;
    const id = e.userId || e.nickname;
    let person = Object.hasOwn(people, id) ? people[id] : null;
    if (!person) {
      const joinedOrder = e.simulated ? Object.keys(people).length + 1 : ++this.stats.session.participantSequence;
      person = { id, name: e.nickname, avatar: e.avatar, character:defaultCharacter(id),preferredPose:'sitting',joinedOrder,joinedAt:this.now() };
      Object.defineProperty(people, id, { value: person, enumerable: true, writable: true, configurable: true });
    } else { person.name = e.nickname; if (e.avatar) person.avatar = e.avatar; }
    if (!e.simulated) this.participantsDirty = true;
    const leaders = e.simulated ? (this.hallDemo || []) : rankUsers(this.stats.session.users);
    return hallView(leaders,people,this.now(),this.stats.session.startedAt).seats.some(user => user?.id === id) ? 'seated' : 'rotating';
  }
  enqueue(e, rule, free = false) {
    const userKey = `${e.simulated}:${e.room}:${e.userId || e.nickname}`;
    if (free) { const gated = this.freeGate(userKey); if (gated) { this.likeCounts.delete(userKey); return { status: gated }; } }
    if (this.queue.length >= this.config.queueLimit) { this.log('warn', 'Hàng chờ đã đầy. Sự kiện vẫn được ghi nhận nhưng không tạo lượt mới.'); return { status: 'full' }; }
    const total = e.coins * e.quantity;
    const action = rule.action === 'auto' ? giftTier(total)?.action : rule.action;
    if (!action) { this.log('warn', `Quà ${e.giftName} chưa có giá trị xu hợp lệ; không đoán hiệu ứng.`); return { status: 'unknown-value' }; }
    const appearance=participantsFor(this,e.userId||e.nickname);
    const ranks=e.simulated?(this.hallDemo||[]):rankUsers(this.stats.session.users);
    const job = { ...e, character:appearance?.character||defaultCharacter(e.userId||e.nickname), role:roleForRank(ranks.findIndex(u=>u.id===e.userId)+1), id: randomUUID(), userKey, free, action, priority:e.kind==='gift'?(giftTier(total)?.priority||10):rule.priority, duration: SCENES[action].duration, createdAt: this.now() };
    if (action === 'fan-card') {
      const f = pickFanCard(this.fanCardAudio);
      job.fanCard = { ...f, audio: this.config.voiceEnabled ? f.audio : null, readAt: 2000 };
      job.duration = 2000 + (job.fanCard.audio ? Math.ceil(job.fanCard.audio.duration * 1000) : 16000) + 1500;
    }
    if (e.kind === 'gift' && total > 0) {
      job.thanks = { nickname: e.nickname, avatar: e.avatar, coins: total, giftName: e.giftName, quantity: e.quantity };
      job.thanksDuration=3000;
    }
    job.procession=e.kind==='gift'&&total>0||action==='visit';
    job.actionDuration=job.duration;
    job.actionStartDelay=(job.thanksDuration||0)+(job.procession?4000:0);
    job.returnDuration=job.procession?1500:0;
    const cue=getSoundLibrary().byId[action]||(action==='ggmu'?getSoundLibrary().byId.crowd:null);
    const meme=MEME_SCENES[action];
    if(cue)job.cue={...cue,readAt:job.actionStartDelay+(meme?meme.soundAt:job.actionDuration)};
    job.cueDuration=cue?Math.ceil(cue.duration*1000):0;
    // Free visits play applause at the end of the bow; let the whole replacement clip finish.
    if(action==='visit')job.actionDuration=Math.max(job.actionDuration,Math.ceil((getSoundLibrary().byId.applause?.duration||0)*1000));
    job.effectEnd=Math.max(job.actionStartDelay+job.actionDuration,job.cue?job.cue.readAt+job.cueDuration:0);
    job.duration=job.effectEnd+job.returnDuration;
    if(job.fanCard)job.fanCard.readAt+=job.actionStartDelay;
    if (e.kind === 'gift' && this.notice) this.notice.jobId = job.id;
    this.queue.push(job); this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    let seatStatus;
    if (free) { this.cooldowns.set(userKey, this.now()); this.likeCounts.delete(userKey); seatStatus = this.seatParticipant(e); }
    this.emit('change'); this.pump(); return { status: 'queued', id: job.id, ...(seatStatus ? { seatStatus } : {}) };
  }
  pump() {
    if (this.paused || !this.renderer || this.current || !this.queue.length) return;
    let idx = this.primaryRun >= 5 ? this.queue.findIndex(j => j.priority === 0) : 0; if (idx < 0) idx = 0;
    const [job] = this.queue.splice(idx, 1); this.primaryRun = job.priority > 0 ? this.primaryRun + 1 : 0;
    const people=job.simulated?this.demoParticipants:this.stats.session.participants;
    const leaders=job.simulated?(this.hallDemo||[]):rankUsers(this.stats.session.users);
    const seat=hallView(leaders,people,this.now(),this.stats.session.startedAt).seats.findIndex(u=>u?.id===job.userId);
    const point=HALL_LAYOUT[seat<0?VISIBLE_HALL_CAPACITY-1:seat];
    this.current = { ...job,home:{x:point.x,y:point.y},startedAt: this.now() }; this.emit('change');
  }
  finish(id, status = 'completed', advance = true) {
    if (!this.current || this.current.id !== id) return false;
    if(this.current.procession&&status==='completed'){
      this.returnSeat={userId:this.current.userId,until:this.now()+10000};
      const person=participantsFor(this,this.current.userId);
      if(person&&(person.poseChangedAt||0)<=this.current.startedAt){person.preferredPose='sitting';if(!this.current.simulated)this.participantsDirty=true;}
    }
    this.history.unshift({ ...this.current, status, finishedAt: this.now() }); this.history.length = Math.min(30, this.history.length);
    this.current = null; this.emit('change'); if (advance) this.pump(); return true;
  }
  control(command, id) {
    if (command === 'pause') this.paused = true;
    else if (command === 'resume') this.paused = false;
    else if (command === 'accept') this.accepting = true;
    else if (command === 'stop-accept') this.accepting = false;
    else if (command === 'skip') this.finish(this.current?.id, 'skipped', false);
    else if (command === 'remove') this.queue = this.queue.filter(j => j.id !== id);
    else if (command === 'clear') this.queue = [];
    else if (command === 'hall-live') { this.hallDemo = null; this.demoParticipants = {}; }
    else throw new Error('Lệnh không hợp lệ.');
    this.emit('change'); this.pump();
  }
}

