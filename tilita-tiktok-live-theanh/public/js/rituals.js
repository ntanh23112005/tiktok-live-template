// Shared deterministic choreography: the server owns duration, the browser samples time.
export const RITUALS = {
  incense: { duration: 8500, approach: 2050, title: 'Dâng hương · Tam bái' },
  prayer: { duration: 11000, approach: 0, title: 'Hoa đăng · Gửi lời cầu an' },
  fortune: { duration: 10500, approach: 0, title: 'Xin xăm · Lời nhắc bình an' },
  lotus: { duration: 10000, approach: 2100, title: 'Liên hoa · Sen nở' },
  lamp: { duration: 11000, approach: 2300, title: 'Đăng lễ · Thắp sáng đạo tràng' },
  fruit: { duration: 10500, approach: 2400, title: 'Dâng mâm quả · Tri ân' },
  bell: { duration: 9500, approach: 1800, title: 'Đại hồng chung · Nguyện an lành' },
  grand: { duration: 14000, approach: 1900, title: 'Đại lễ · Đạo tràng đồng lễ' },
};
const clamp = v => Math.max(0, Math.min(1, v));
export function bowPose(t) {
  if (t < 0) return 3;
  const n = t % 1800;
  return n < 220 ? 4 : n < 430 ? 5 : n < 620 ? 6 : n < 1100 ? 7 : n < 1320 ? 6 : n < 1530 ? 5 : 3;
}
export function sampleRitual(job, elapsed) {
  const def = RITUALS[job.action] || RITUALS.incense;
  const fortune = job.action === 'fortune' && job.fortune;
  const delay = job.ritualStartDelay || 0;
  const ritualDuration = job.ritualDuration || job.duration - delay;
  const duration = fortune ? ritualDuration : def.duration;
  const ritualTime = Math.max(0, elapsed - delay);
  const t = fortune ? ritualTime : ritualTime * def.duration / ritualDuration;
  const arrival = def.approach;
  const walking = arrival > 0 && t < arrival;
  const approach = arrival ? clamp(t / arrival) : 1;
  let pose = walking ? Math.floor(t / 185) % 2 : 3;
  let phase = walking ? 'Bước lên hành lễ' : 'Thành tâm';
  if (t >= arrival && t < arrival + 200) pose = 2;
  if (job.action === 'incense' && t >= arrival + 250) { pose = bowPose(t - arrival - 250); phase = 'Thắp hương · Đảnh lễ tam bái'; }
  if (job.action === 'prayer') { pose = t < 2300 ? 4 : 3; phase = t < 2500 ? 'Chắp tay cầu an' : 'Hoa đăng mang lời nguyện'; }
  if (job.action === 'fortune') { pose = t < 3600 ? 4 : 3; phase = t < 4200 ? 'Gieo ống xăm' : 'Mở lời nhắc bình an'; }
  if (job.action === 'lotus' && !walking) { pose = t < 5000 ? 4 : bowPose(t - 5000); phase = t < 5000 ? 'Dâng hoa sen · Sen nở' : 'Liên hoa hướng thiện'; }
  if (job.action === 'lamp' && !walking) { pose = t < 5000 ? 4 : 3; phase = t < 6500 ? 'Thắp sáng từng ngọn đèn' : 'Ánh sáng lan tỏa đạo tràng'; }
  if (job.action === 'fruit' && !walking) { pose = t < 5600 ? 4 : bowPose(t - 5600); phase = t < 5600 ? 'Dâng mâm ngũ quả' : 'Tri ân · Lễ tạ'; }
  if (job.action === 'bell' && !walking) { pose = t < 4700 ? 4 : 3; phase = t < 4700 ? 'Thỉnh đại hồng chung' : 'Tiếng chuông · Nguyện an lành'; }
  if (job.action === 'grand' && !walking) { pose = bowPose(t - 3000); phase = t < 3300 ? 'Khai lễ · Thỉnh chuông' : 'Đạo tràng đồng lễ'; }
  return {
    pose, phase, walking, progress: clamp(t / duration),
    thanking: !!job.thanks && elapsed < delay, ritualTime,
    y: arrival ? 1600 - approach * 610 : (job.action === 'fortune' ? 1340 : 1430),
    scale: arrival ? 1.12 - .12 * approach : 1.08,
    opacity: clamp(t / 300) * clamp((duration - t) / 900),
    incense: job.action === 'incense' && t > arrival,
    lotus: job.action === 'lotus' && t > arrival + 200,
    lotusOpen: clamp((t - 2900) / 1800), lotusRise: clamp((t - 6400) / 2500),
    lamp: job.action === 'lamp' && t > arrival,
    lights: job.action === 'lamp' ? Math.floor(clamp((t - 2800) / 4200) * 8) : job.action === 'grand' && t > 2500 ? 8 : 0,
    fruit: job.action === 'fruit' && t > 2400, fruitRise: clamp((t - 4400) / 1800),
    lantern: job.action === 'prayer' && t > 2500, lanternRise: clamp((t - 2500) / 7500),
    cylinder: job.action === 'fortune' && t < 4200,
    card: job.action === 'fortune' && t >= 4200 && t < duration - 900,
    bell: job.action === 'bell' && t >= 2400 && t < 8800,
    grand: job.action === 'grand' && t > 2300,
    banner: job.action === 'grand' && t > 2300 && t < 6500,
    groupTime: job.action === 'grand' && t > 3300 ? t - 3300 : null,
  };
}
