import {GIFT_TIERS} from './experience.js';
const paths={card:'M6 3h15v22H6z M10 9h7m-7 5h7m-7 5h4',door:'M4 27V6l12-3 12 3v21M16 3v24M11 16h1m8 0h1',ball:'M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28z m-5 9 10 0 3 9-8 6-8-6z M16 2v5m14 9-5 1M3 16l5 1m3 12 1-5m9 5-1-5',star:'m16 2 4 9 10 1-8 7 2 11-8-6-8 6 2-11-8-7 10-1z',wheel:'M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28z m-3 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M2 14l11 2m17-2-11 2m-3 3v11',clock:'M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28z M16 7v10l7 4',trophy:'M8 3h16v10a8 8 0 0 1-16 0z M8 6H3v4a6 6 0 0 0 6 6m15-10h5v4a6 6 0 0 1-6 6M16 21v7m-7 1h14'};
export function renderGiftBoard(parent) {
  parent.replaceChildren(...GIFT_TIERS.map((tier,i)=>{const row=document.createElement('div');row.className='gift-tier';row.innerHTML=`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="${paths[tier.icon]}"/></svg><div><strong>${tier.min}${i===6?'+':''} xu</strong><span>${tier.label}</span></div>`;return row;}));
}
export {createEffects} from './meme-effects.js';
