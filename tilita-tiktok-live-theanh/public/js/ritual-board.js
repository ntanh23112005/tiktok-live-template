import { GIFT_TIERS } from './experience.js';

// Original code-native ritual illustrations for Tâm an lạc; no reference-image crops.
const illustrations = {
  fortune: '<path d="M24 29h32l-3 40H27z" fill="url(#bronze)"/><path d="M30 29 26 8m11 21L35 5m9 24 2-22m5 22 7-19"/><path d="M25 44h30M25 60h29"/><circle cx="40" cy="52" r="5"/>',
  incense: '<path d="M18 56h44l-7 14H25z" fill="url(#bronze)"/><path d="M30 55V24m10 31V16m10 39V24"/><path d="M30 21c-8-9 8-10 0-19m10 11c-8-8 7-10 0-12m10 20c-7-8 7-9 0-18" opacity=".65"/>',
  lotus: '<path d="M40 65C17 63 8 47 12 32c17 1 25 9 28 22C43 41 51 33 68 32c4 15-5 31-28 33Z" fill="url(#bronze)"/><path d="M40 58C20 45 23 24 29 16c8 7 11 17 11 27 0-10 3-20 11-27 6 8 9 29-11 42Z" fill="#dca663"/><path d="M40 58C29 45 29 24 40 8c11 16 11 37 0 50Z" fill="#f2d999"/><path d="M21 70h38"/>',
  lantern: '<path d="M15 49q25 29 50 0M20 58h40"/><path d="M26 45h28l-3 14H29z" fill="url(#bronze)"/><path d="M40 44c-15-7-10-20 0-32 11 13 15 26 0 32Z" fill="#f4d993"/><path d="M40 39c-6-4-4-10 0-16 5 7 6 12 0 16Z" fill="#fff2c4"/><path d="m16 18-3-5m50 5 4-5M9 35H3m68 0h6" opacity=".7"/>',
  fruit: '<path d="M10 56h60l-8 10H18zM31 67v5h18v-5" fill="url(#bronze)"/><circle cx="25" cy="45" r="11" fill="#b88951"/><circle cx="53" cy="45" r="11" fill="#cfa461"/><circle cx="40" cy="30" r="13" fill="#f0ce89"/><path d="M39 18q-8-13 5-13m-3 14q14-11 20-4-10 10-20 4Z" fill="#a2a16c"/>',
  bell: '<path d="M25 17q15-12 30 0l5 39 8 7H12l8-7z" fill="url(#bronze)"/><path d="M33 14V8q7-7 14 0v6M23 37h34M19 55h42M30 69q10 10 20 0"/><path d="M34 30h12m-6-5v21"/>',
  halo: '<circle cx="40" cy="40" r="24" fill="url(#bronze)"/><circle cx="40" cy="40" r="17"/><circle cx="40" cy="40" r="7" fill="#f8e0a3"/><path d="M40 2v10m0 56v10M2 40h10m56 0h10M13 13l7 7m40 40 7 7M13 67l7-7m40-40 7-7M40 23v10m0 14v10M23 40h10m14 0h10"/>'
};
export function renderRitualBoard(parent, tiers = GIFT_TIERS) {
  parent.replaceChildren();
  tiers.forEach((tier, i) => {
    const row = document.createElement('div'); row.className = 'ritual-tier'; row.dataset.action = tier.action;
    const svg = `<svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="bronze-${i}" x2="0" y2="1"><stop stop-color="#f5d78d"/><stop offset="1" stop-color="#86582c"/></linearGradient></defs><g fill="none" stroke="#f4d48e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${illustrations[tier.icon].replaceAll('url(#bronze)', `url(#bronze-${i})`)}</g></svg>`;
    row.innerHTML = svg;
    const text = document.createElement('div'), value = document.createElement('strong'), label = document.createElement('span');
    value.textContent = `${tier.min}${i === tiers.length - 1 ? '+' : ''} xu`;
    label.textContent = tier.label; text.append(value, label); row.append(text); parent.append(row);
  });
}
