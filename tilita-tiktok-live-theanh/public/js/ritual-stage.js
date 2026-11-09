export function createRitualStage(parent) {
  parent.innerHTML = '<div class="ritual-incense" hidden><i></i><i></i><i></i></div><div class="offering-lotus" hidden><div class="lotus-petals"></div><b></b></div><div class="offering-fruit" hidden><div class="fruit-tray"></div></div><div class="ritual-lamps"></div><div class="ritual-cylinder" hidden><i></i><i></i><i></i><i></i><i></i><i></i><b>AN</b></div><div class="ritual-bell" hidden><i></i><b>AN</b><span></span></div>';
  const incense = parent.querySelector('.ritual-incense'), lotus = parent.querySelector('.offering-lotus'), fruit = parent.querySelector('.offering-fruit'), cylinder = parent.querySelector('.ritual-cylinder');
  for (let i = 0; i < 9; i++) { const petal = document.createElement('i'); petal.style.setProperty('--angle', `${(i - 4) * 23}deg`); lotus.querySelector('.lotus-petals').append(petal); }
  for (let i = 0; i < 5; i++) { const item = document.createElement('i'); item.className = 'fruit-piece'; item.style.setProperty('--fruit', ['#d95237', '#dba544', '#84a151', '#cd6b33', '#c8b95a'][i]); item.style.left = (i * 38) + 'px'; item.style.bottom = (i % 2 * 12 + 12) + 'px'; fruit.append(item); }
  const lamps = [];
  for (let i = 0; i < 8; i++) { const lamp = document.createElement('div'); lamp.className = 'path-lamp'; lamp.style.left = (i % 2 ? 665 + Math.floor(i / 2) * 25 : 415 - Math.floor(i / 2) * 25) + 'px'; lamp.style.top = (1200 + Math.floor(i / 2) * 145) + 'px'; lamp.innerHTML = '<i></i><b></b>'; parent.querySelector('.ritual-lamps').append(lamp); lamps.push(lamp); }
  return sample => {
    incense.hidden = !sample?.incense; lotus.hidden = !sample?.lotus; fruit.hidden = !sample?.fruit; cylinder.hidden = !sample?.cylinder;
    parent.querySelector('.ritual-bell').hidden = !sample?.bell;
    lamps.forEach((lamp, i) => lamp.classList.toggle('lit', i < (sample?.lights || 0)));
    parent.classList.toggle('grand-light', sample?.grand || false);
    if (!sample) return;
    lotus.style.setProperty('--open', sample.lotusOpen);
    lotus.style.transform = `translate(-50%, ${-sample.lotusRise * 190}px) scale(${.5 + sample.lotusOpen * .7})`;
    fruit.style.top = (1030 - sample.fruitRise * 180) + 'px';
  };
}
