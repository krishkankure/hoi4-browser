import './style.css';

const nations = {
  germany: { name: 'German Reich', flag: '🇩🇪', color: '#626f50', relation: 'You', growth: 1.12 },
  france: { name: 'French Republic', flag: '🇫🇷', color: '#526b86', relation: '-35', growth: 1.08 },
  britain: { name: 'United Kingdom', flag: '🇬🇧', color: '#7a5a50', relation: '-25', growth: 1.1 },
  poland: { name: 'Polish Republic', flag: '🇵🇱', color: '#a36c72', relation: '-50', growth: 1.07 },
  soviet: { name: 'Soviet Union', flag: '🇷🇺', color: '#8b493f', relation: '-65', growth: 1.15 },
  scandinavia: { name: 'Scandinavian Union', flag: '🇸🇪', color: '#967e4c', relation: '+10', growth: 1.06 }
};

const mapData = [
  { id: 'britain', power: 46, factories: 18, path: 'M104 218 L72 192 78 153 111 134 123 92 151 70 169 98 163 137 185 167 170 202 139 207 125 245 99 252 84 237 Z' },
  { id: 'france', power: 51, factories: 22, path: 'M174 282 L190 236 227 219 277 227 304 259 297 312 264 341 238 382 197 364 180 326 143 310 Z' },
  { id: 'germany', power: 62, factories: 28, path: 'M286 232 L303 183 337 168 375 181 395 216 383 252 402 285 376 322 339 315 304 333 292 297 267 274 Z' },
  { id: 'poland', power: 38, factories: 14, path: 'M397 210 L425 184 482 180 520 205 514 251 532 279 493 305 442 298 403 281 383 251 Z' },
  { id: 'scandinavia', power: 34, factories: 13, path: 'M304 151 L277 114 290 65 322 20 350 30 347 74 329 111 356 146 382 118 394 60 420 29 438 43 425 89 405 143 369 176 334 164 Z' },
  { id: 'soviet', power: 108, factories: 42, path: 'M515 173 L555 137 619 119 676 129 730 104 802 111 862 84 932 100 1000 85 1031 118 1014 168 1038 215 1018 263 1034 307 995 337 920 328 862 349 798 330 735 350 678 323 621 332 570 300 532 278 513 245 Z' }
];

let state;
function reset() {
  state = {
    day: 1, month: 0, year: 1936, speed: 0, selected: 'germany', panel: 'command',
    manpower: 720, equipment: 620, command: 70, wars: [], toast: '', over: false,
    nations: mapData.map(n => ({ ...structuredClone(n), growth: nations[n.id].growth, baseGrowth: nations[n.id].growth })),
    logs: ['The German high command awaits orders.'], showInstructions: true
  };
}
reset();

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const adjacency = {
  germany: ['france', 'poland', 'scandinavia', 'britain'], france: ['germany'], britain: ['france', 'germany'],
  poland: ['germany', 'soviet'], scandinavia: ['germany', 'soviet'], soviet: ['poland', 'scandinavia']
};
const app = document.querySelector('#app');
const land = id => state.nations.find(n => n.id === id);
const atWar = (a, b) => state.wars.some(w => w.nations.includes(a) && w.nations.includes(b));
const atAnyWar = id => state.wars.some(w => w.nations.includes(id));
function report(message) { state.logs.unshift(message); state.logs = state.logs.slice(0, 8); }
function notify(message) { state.toast = message; setTimeout(() => { state.toast = ''; render(); }, 2800); }

function advanceDay() {
  state.day += 1;
  // All economic and military growth happens only here, so pausing freezes the simulation completely.
  state.manpower += 2;
  state.equipment += Math.max(2, Math.floor(land('germany').factories / 5));
  state.command = Math.min(100, state.command + 1);
  if (state.day > 30) {
    state.day = 1; state.month += 1;
    state.nations.forEach(n => { n.power += Math.max(1, Math.floor(n.growth)); });
    if (state.month > 11) {
      state.month = 0; state.year += 1;
      state.nations.forEach(n => {
        n.power = Math.round(n.power * n.growth);
        n.factories += Math.max(1, Math.round(n.factories * (n.growth - 1)));
      });
      report(`Industrial reports for ${state.year} show rising military strength across Europe.`);
    }
    cpuTurn();
  }
  checkEnd();
}

function cpuTurn() {
  ['france', 'britain', 'poland', 'soviet', 'scandinavia'].forEach(id => {
    const actor = land(id); if (!actor || !atWar(id, 'germany')) return;
    const targets = adjacency[id].filter(t => atWar(id, t)).map(land).filter(Boolean).sort((a, b) => a.power - b.power);
    if (targets[0] && actor.power > targets[0].power * 1.35) resolveBattle(actor, targets[0], true);
  });
}

function resolveBattle(attacker, defender, cpu = false) {
  const committed = Math.max(10, Math.floor(attacker.power * 0.65));
  const attackScore = committed + (state.year - 1936) * 2 + (cpu ? 0 : state.command / 5);
  const defenseScore = defender.power * 0.8 + defender.factories * 0.6;
  attacker.power = Math.max(5, attacker.power - Math.ceil(committed * 0.25));
  defender.power = Math.max(0, defender.power - Math.ceil(committed * 0.45));
  if (attackScore >= defenseScore) {
    const old = defender.id;
    const war = state.wars.find(w => w.nations.includes(attacker.id) && w.nations.includes(old));
    // Victory ends the wartime penalty and improves the winner's pre-war growth by 25%.
    attacker.baseGrowth = (war?.preWarGrowth[attacker.id] || attacker.baseGrowth) * 1.25;
    if (war) state.wars = state.wars.filter(w => w !== war);
    attacker.growth = attacker.baseGrowth * (atAnyWar(attacker.id) ? 0.5 : 1);
    defender.id = attacker.id; defender.baseGrowth = attacker.baseGrowth; defender.growth = attacker.growth; defender.power = Math.max(12, Math.floor(committed * 0.45));
    report(`${nations[attacker.id].name} occupied ${nations[old].name}.`);
    if (!cpu) notify(`${nations[old].name} has capitulated.`);
  } else {
    report(`${nations[attacker.id].name}'s offensive was halted by ${nations[defender.id].name}.`);
    if (!cpu) notify('The offensive was repelled.');
  }
}

function declareWar(opponent) {
  const germany = land('germany');
  const target = land(opponent);
  if (!germany || !target || atWar('germany', opponent)) return;
  const preWarGrowth = { germany: germany.baseGrowth, [opponent]: target.baseGrowth };
  if (!atAnyWar('germany')) germany.growth = germany.baseGrowth * 0.5;
  if (!atAnyWar(opponent)) target.growth = target.baseGrowth * 0.5;
  state.wars.push({ nations: ['germany', opponent], preWarGrowth });
  report(`Germany declared war on ${nations[opponent].name}. Both economies entered wartime slowdown.`);
  notify('War declared. National growth has fallen by half.');
}

function checkEnd() {
  if (!land('germany')) state.over = 'DEFEAT';
  else if (state.nations.every(n => n.id === 'germany' || n.id === 'scandinavia')) state.over = 'VICTORY';
}

function render() {
  const selected = land(state.selected) || land('germany') || state.nations[0];
  if (!land(state.selected)) state.selected = selected.id;
  const germany = land('germany');
  app.innerHTML = `<main class="app">
    <header class="topbar">
      <div class="brand"><div class="iron-cross">✠</div><div><h1>IRON COMMAND</h1><span>EUROPEAN THEATRE</span></div></div>
      <div class="resources">
        <div class="resource"><small>Manpower</small><b>${state.manpower}K <em>+2K/day</em></b></div>
        <div class="resource"><small>Equipment</small><b>${state.equipment} <em>+${germany ? Math.max(2, Math.floor(germany.factories / 5)) : 0}/day</em></b></div>
        <div class="resource"><small>Army Power</small><b>${germany?.power || 0}</b></div>
        <div class="resource"><small>Factories</small><b>${germany?.factories || 0}</b></div>
      </div>
      <div class="date-box"><div class="date"><strong>${String(state.day).padStart(2, '0')} ${months[state.month]} ${state.year}</strong><small>${state.speed ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}</small></div><div class="speed"><button data-speed="0" class="${state.speed === 0 ? 'active' : ''}">Ⅱ</button><button data-speed="1" class="${state.speed === 1 ? 'active' : ''}">▶</button><button data-speed="3" class="${state.speed === 3 ? 'active' : ''}">▶▶</button></div></div>
    </header>
    <section class="workspace">
      <aside class="sidebar"><div class="country-card"><span class="big-flag">🇩🇪</span><div><h2>GERMAN REICH</h2><p>Berlin · Player Nation</p></div></div><div class="section-title">Reich Chancellery</div>
        ${[['command', '◆', 'High Command'], ['army', '♟', 'Wehrmacht'], ['diplomacy', '⚑', 'Diplomacy'], ['intel', '◎', 'European Powers']].map(n => `<button class="nav-btn ${state.panel === n[0] ? 'active' : ''}" data-panel="${n[0]}"><span class="icon">${n[1]}</span>${n[2]}</button>`).join('')}
        <div class="objective"><b>Strategic Directive</b><p>Expand German influence while preparing industry and armed forces for a continental war.</p><div class="bar"><i style="width:${Math.min(100, (germany?.power || 0))}%"></i></div></div>
      </aside>
      <div class="map-wrap"><div class="map-title"><span>EUROPE</span><small>POLITICAL & MILITARY MAP · 1936</small></div>
        <svg class="europe-map" viewBox="40 0 1020 440" role="img" aria-label="Political map of Europe">
          <defs><pattern id="grain" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".6" fill="#fff" opacity=".13"/></pattern></defs>
          ${state.nations.map((t, i) => `<g class="country ${t.id === state.selected ? 'selected' : ''}" data-territory="${t.id}"><path d="${mapData[i].path}" fill="${nations[t.id].color}"/><path d="${mapData[i].path}" fill="url(#grain)"/><text x="${labelPositions[i][0]}" y="${labelPositions[i][1]}" class="flag-label">${nations[t.id].flag}</text><text x="${labelPositions[i][0]}" y="${labelPositions[i][1] + 25}" class="country-label">${shortName(t.id)}</text><g transform="translate(${labelPositions[i][0] - 28} ${labelPositions[i][1] + 35})"><rect class="counter" width="56" height="30"/><text x="28" y="13" class="counter-main">${t.power} PWR</text><text x="28" y="24" class="counter-sub">${nations[t.id].flag} ${t.factories} IND</text></g></g>`).join('')}
          <text x="110" y="395" class="sea">ATLANTIC OCEAN</text><text x="420" y="406" class="sea">MEDITERRANEAN SEA</text><text x="760" y="45" class="ural">URAL FRONTIER →</text>
        </svg>
        <div class="legend"><span><i class="you"></i>German Reich</span><span><i class="foreign"></i>Foreign Power</span><span>Click a nation for details</span></div>${state.toast ? `<div class="toast">${state.toast}</div>` : ''}
      </div>
      <aside class="panel">${panelContent(selected)}</aside>
    </section>
    <footer class="statusbar"><span>SELECTED: <b>${nations[selected.id].name.toUpperCase()}</b></span><span>TOTAL EUROPEAN POWER: <b>${state.nations.reduce((s, n) => s + n.power, 0)}</b></span><span>ACTIVE WARS: <b>${state.wars.length}</b></span><span style="margin-left:auto">BERLIN COMMAND NET · SECURE</span></footer>
    ${state.showInstructions ? instructionsPopup() : ''}
    ${state.over ? `<div class="victory"><div><h2>${state.over}</h2><p>${state.over === 'VICTORY' ? 'Germany dominates the European continent.' : 'Berlin has fallen and Germany has capitulated.'}</p><button id="restart">NEW CAMPAIGN</button></div></div>` : ''}
  </main>`;
  bind();
}

const labelPositions = [[125, 150], [230, 265], [338, 220], [462, 222], [364, 82], [760, 184]];
function shortName(id) { return { germany: 'GERMANY', france: 'FRANCE', britain: 'BRITAIN', poland: 'POLAND', soviet: 'SOVIET UNION', scandinavia: 'SCANDINAVIA' }[id]; }

function instructionsPopup() {
  return `<div class="instructions" role="dialog" aria-modal="true" aria-labelledby="instructions-title"><div class="instructions-card">
    <div class="briefing-kicker">OKW FIELD BRIEFING · 1936</div><h2 id="instructions-title">WELCOME, COMMANDER</h2><p class="briefing-lead">Lead Germany through a changing Europe. Build strength, choose your wars, and prevent Berlin from falling.</p>
    <div class="mechanics-grid"><div><span>Ⅰ</span><h3>CONTROL TIME</h3><p>Use pause, normal, or fast speed in the top-right. While paused, time, production, training, growth, and combat are completely frozen.</p></div><div><span>Ⅱ</span><h3>BUILD POWER</h3><p>Open Wehrmacht to raise formations. Manpower and equipment accumulate over time, while every nation grows stronger each year.</p></div><div><span>Ⅲ</span><h3>WAGE WAR</h3><p>Declare war through Diplomacy, select Germany, then invade. War halves both nations' growth; the victor gains 1.25× their pre-war growth.</p></div><div><span>Ⅳ</span><h3>WIN EUROPE</h3><p>Military power and industry determine battles. Occupy the hostile powers to win. If Germany falls, the campaign is lost.</p></div></div>
    <button class="action begin" id="dismiss-instructions">ASSUME COMMAND</button><small>Tip: inspect any country by selecting it directly on the map.</small>
  </div></div>`;
}

function panelContent(selected) {
  const meta = nations[selected.id];
  if (state.panel === 'army') return `<h3>WEHRMACHT</h3><div class="subtitle">Mobilization & reinforcement</div><div class="stat-grid"><div class="stat"><small>Army Power</small><b>${land('germany')?.power || 0}</b></div><div class="stat"><small>Recruit Cost</small><b>60 EQP</b></div></div><button class="action" id="recruit">RAISE NEW FORMATION</button><p class="subtitle">Adds 8 army power. Requires 35K manpower and 60 equipment. Production and training stop while paused.</p>`;
  if (state.panel === 'diplomacy') return `<h3>FOREIGN OFFICE</h3><div class="subtitle">Treaties, relations and declarations</div>${Object.entries(nations).filter(([id]) => id !== 'germany' && land(id)).map(([id, n]) => `<button class="nation-row" data-select="${id}"><span class="row-flag">${n.flag}</span><span><strong>${n.name}</strong><small>${atWar('germany', id) ? 'At war with Germany' : 'Sovereign state'}</small></span><em>${n.relation}</em></button><button class="action ${atWar('germany', id) ? '' : 'danger'} diplo" data-nation="${id}" ${atWar('germany', id) ? 'disabled' : ''}>${atWar('germany', id) ? 'WAR IN PROGRESS' : 'DECLARE WAR'}</button>`).join('')}`;
  if (state.panel === 'intel') return `<h3>EUROPEAN POWERS</h3><div class="subtitle">Military and industrial estimates</div>${state.nations.map(n => `<div class="nation-row static"><span class="row-flag">${nations[n.id].flag}</span><span><strong>${nations[n.id].name}</strong><small>${n.power} power · ${n.factories} factories</small></span><em>×${n.growth.toFixed(2)}/yr</em></div>`).join('')}<div class="log"><div class="section-title">Command Log</div>${state.logs.map(x => `<div class="log-item">${x}</div>`).join('')}</div>`;
  const targets = selected.id === 'germany' ? adjacency.germany.map(land).filter(Boolean) : [];
  return `<div class="nation-heading"><span>${meta.flag}</span><div><h3>${meta.name.toUpperCase()}</h3><div class="subtitle">National Command Overview</div></div></div><div class="stat-grid"><div class="stat"><small>Army Power</small><b>${selected.power}</b></div><div class="stat"><small>Industry</small><b>${selected.factories}</b></div><div class="stat"><small>Annual Growth</small><b>×${selected.growth.toFixed(2)}</b></div><div class="stat"><small>Status</small><b>${selected.id === 'germany' ? 'PLAYER' : atWar('germany', selected.id) ? 'AT WAR' : 'PEACE'}</b></div></div>${atWar('germany', selected.id) ? '<div class="war-warning">⚠ WARTIME GROWTH: 50%</div>' : ''}${selected.id === 'germany' ? targets.map(t => `<button class="action danger attack" data-target="${t.id}" ${atWar('germany', t.id) ? '' : 'disabled'}>INVADE ${shortName(t.id)}</button>`).join('') : `<button class="action danger diplo" data-nation="${selected.id}" ${atWar('germany', selected.id) ? 'disabled' : ''}>${atWar('germany', selected.id) ? 'WAR IN PROGRESS' : 'DECLARE WAR'}</button><p class="subtitle">Select Germany after declaring war to plan an invasion.</p>`}<div class="log"><div class="section-title">Latest Reports</div>${state.logs.slice(0, 4).map(x => `<div class="log-item">${x}</div>`).join('')}</div>`;
}

function bind() {
  document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { state.speed = +b.dataset.speed; render(); });
  document.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => { state.panel = b.dataset.panel; render(); });
  document.querySelectorAll('[data-territory], [data-select]').forEach(b => b.onclick = () => { state.selected = b.dataset.territory || b.dataset.select; state.panel = 'command'; render(); });
  document.querySelectorAll('.diplo').forEach(b => b.onclick = () => { declareWar(b.dataset.nation); render(); });
  document.querySelectorAll('.attack').forEach(b => b.onclick = () => { if (!state.speed) return notify('Unpause time before launching an offensive.'); resolveBattle(land('germany'), land(b.dataset.target)); checkEnd(); render(); });
  const recruit = document.querySelector('#recruit');
  if (recruit) recruit.onclick = () => { if (!state.speed) return notify('Unpause time to train new formations.'); if (state.equipment < 60 || state.manpower < 35) return notify('Insufficient manpower or equipment.'); state.equipment -= 60; state.manpower -= 35; land('germany').power += 8; report('A new army formation completed mobilization.'); notify('Formation ready for service.'); render(); };
  const restart = document.querySelector('#restart'); if (restart) restart.onclick = () => { reset(); render(); };
  const dismiss = document.querySelector('#dismiss-instructions'); if (dismiss) dismiss.onclick = () => { state.showInstructions = false; render(); };
}

setInterval(() => { if (state.speed && !state.over) { for (let i = 0; i < state.speed; i += 1) advanceDay(); render(); } }, 900);
render();
