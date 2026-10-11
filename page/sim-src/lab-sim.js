// FM1 Quest — "Simulador": the FM-1 faceplate driving the same screens as the lab tiles.
// Controls: mouse, computer keyboard, or the FM-1 over USB MIDI. Layer rules follow SLOOP.md (hold a button + a key).
(function (G) {
'use strict';
const host = document.getElementById('sim'); if (!host) return; host.classList.add('sim');
const A = {};   // public API shared with lab-3d.js and lab-led.js
const T = G.GFX, L = G.LAB, E = L.E, S = L.S, Scr = G.Screens, INP = T.INP, AUD = T.AUD;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const KCOL = ['#5a8ad0', '#7ab04e', '#f0c860', '#e08a3a'];

// ---------------------------------------------------------------- hardware tables (from the FM-1 reference image)
const BTN = [['fx', 'FX', 'F'], ['sel', 'SEL', 'Enter'], ['env', 'ENV', 'E'], ['lfo', 'LFO', 'L'], ['edit', 'EDIT', 'D'], ['glo', 'GLO', 'G'],
  ['home', 'HOME', 'H'], ['save', 'SAVE', 'S'], ['arp', 'ARP', 'A'], ['seq', 'SEQ', 'Q'], ['play', 'PLAY/STOP', 'P'], ['rec', 'REC', 'R']];
const CODEB = { KeyF: 'fx', Enter: 'sel', NumpadEnter: 'sel', KeyE: 'env', KeyL: 'lfo', KeyD: 'edit', KeyG: 'glo', KeyH: 'home', KeyS: 'save', KeyA: 'arp', KeyQ: 'seq', KeyP: 'play', KeyR: 'rec', KeyZ: 'octm', KeyX: 'octp' };   // by physical key: any layout works
const DIGC = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'], digIdx = c => { let i = DIGC.indexOf(c); if (i < 0) i = DIGC.map(x => x.replace('Digit', 'Numpad')).indexOf(c); return i; };   // 1…0 play pads 1–10; Shift+5…0 play pads 11–16; Shift+1…4 pick a knob
const CODEW = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyQ', 'KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'];
const KMAP = { '1': 'fx', '2': 'sel', '3': 'env', '4': 'lfo', '5': 'edit', '6': 'glo', '7': 'home', '8': 'save', '9': 'arp', '0': 'seq', ' ': 'play', r: 'rec', z: 'octm', x: 'octp' };
const WK = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⇧5', '⇧6', '⇧7', '⇧8', '⇧9', '⇧0'];                                   // 16 white keys on the computer keyboard (R is REC)
const WOFF = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26];   // semitones above F3 — the key row starts on F (Screens.KEYPCS)
const BGAP = [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14];                // a raised key sits right of white key g: F# G# A# | C# D# | F# G# A# | C# D# | F#
const BLAB = ['OP1', 'OP2', 'OP3', 'OP4', 'OP5', 'OP6', 'PIT', 'GLO', 'MONO', 'POLY', ''];
const KEYPC = Scr.KEYPCS;
const LAYER = ['fx', 'sel', 'glo', 'edit', 'arp', 'seq', 'save'];
const HOLD_MS = { home: 700, rec: 1200 }, HOLD_DEF = 380;

// tap a button = first page; tap again = next page (the pages the lab designed for that button)
const CYC = {
  fx: [{ q: 'fx' }, { g: 'FX Slicer · Towers' }, { g: 'FX Delay · Floresta' }, { g: 'FX Reverb · Catedral' }],
  env: [{ g: 'Forge' }, { g: 'ENV · Feitiço 1/2' }],
  lfo: [{ g: 'Alchemy' }, { g: 'LFO · Sea' }],
  edit: [{ q: 'equip' }, { g: 'Status' }, { g: 'Character view' }, { g: 'Formation' }, { g: 'Party · Grupo' }, { g: 'Song Select' }],
  sel: [{ q: 'key' }, { g: 'SCL · Torch wall' }, { g: 'Overworld' }, { g: 'Orrery' }],
  glo: [{ q: 'mix' }, { g: 'FM Hero' }, { g: 'Piano Hero' }, { g: 'Echo' }, { g: 'Companion' }],
  save: [{ g: 'SAVE · Baús' }, { g: 'Hearth' }],
  arp: [{ g: 'Spellbook' }, { g: 'Layer Roll · Runas' }],
  seq: [{ q: 'steps' }, { g: 'Layer Steps · Placas' }],
};
const LAYSCR = { fx: { q: 'punch' }, sel: { q: 'key' }, glo: { q: 'mix' }, edit: { q: 'erase' }, arp: { g: 'Layer Roll · Runas' }, seq: { q: 'steps' }, save: { g: 'Importer' } };
const GAMEY = new Set(['FM Hero', 'Piano Hero', 'Echo', 'Duel', 'Practice Loop', 'Envelope Dojo', 'Song Select', 'Jam Tavern']);
const QMAP = { Settings: 'menu', Armory: 'armory', Chisel: 'fit', Party: 'party' };
const TAV = [['TAVERN', 'Taverna · Fitas'], ['TAVERN', 'Party'], ['TOOLS', 'LED Effects'], ['SYSTEM', 'Achievements'], ['TAVERN', 'Party · Grupo'], ['TAVERN', 'Status'], ['TAVERN', 'Quest log'], ['TAVERN', 'Damage meter'], ['TAVERN', 'Formation'], ['TAVERN', 'Trophies'], ['TAVERN', 'Orrery'], ['TAVERN', 'Companion'], ['TAVERN', 'Jam Tavern'], ['TAVERN', 'Visualizer'],
  ['GAMES', 'FM Hero'], ['GAMES', 'Piano Hero'], ['GAMES', 'Echo'], ['GAMES', 'Envelope Dojo'], ['GAMES', 'Song Select'], ['GAMES', 'Practice Loop'], ['GAMES', 'Duel'],
  ['TOOLS', 'Armory'], ['TOOLS', 'Chisel'], ['TOOLS', 'Importer'], ['TOOLS', 'Zones'], ['TOOLS', 'Party · Blocos'], ['SYSTEM', 'Help · Pergaminhos'], ['SYSTEM', 'Pads · Remap'], ['SYSTEM', 'Character view'], ['SYSTEM', 'Settings'], ['SYSTEM', 'About']]
  .filter(([, n]) => QMAP[n] || T.REG.some(d => d.name === n));
// boot: a 3 s wave of 9 rising notes (A minor pentatonic) that runs along the keys, a big chord with every key lit, then a short dungeon-synth tail (pad, 4 notes) that fades out
const JING = [220, 261.6, 329.6, 392, 440, 523.3, 659.3, 784, 880].map((f, k) => [k * .27, Math.round(k * 15 / 8), f]).concat([[2.55, -1, 880]]);   // [seconds, LED column (-1 = all), Hz]
const TAIL = [[2.7, 110, 2.6, 1], [3.9, 164.8, 2.6, 7], [5.1, 130.8, 2.6, 4], [6.3, 110, 3.6, 1]];                       // [start s, Hz, length s, LED column]

// ---------------------------------------------------------------- DOM
const knobHTML = (id, label, cls, col) => `<div class="kc"><div class="knob ${cls || ''}" data-k="${id}" tabindex="0" ${col ? `style="--kc:${col}"` : ''}><i></i></div><span class="kn1" data-l="${id}">${label}</span><span class="kv" data-v="${id}"></span></div>`;
host.innerHTML = `
<div class="plate">
  <div class="side">
    <div class="kg">${knobHTML('master', 'MASTER', '', '#e0a838')}${knobHTML('select', 'SELECT', 'enc')}${knobHTML('presets', 'PRESETS', 'enc')}${knobHTML('algo', 'ALGORITHM', 'enc')}</div>
    <div class="octs"><div class="bw" style="width:46px"><button class="pb" data-b="octm">OCT−<span class="cap-k">Z</span></button></div><span class="o" id="s-oct">OCT 0</span><div class="bw" style="width:46px"><button class="pb" data-b="octp">OCT+<span class="cap-k">X</span></button></div></div>
  </div>
  <div class="bezel"><div class="lcdslot"></div><div class="pgchip" hidden></div><div class="rowchip" hidden></div></div>
  <div class="side">
    <div class="kg r">${[1, 2, 3, 4].map(i => knobHTML('k' + i, 'KNOB ' + i, '', KCOL[i - 1])).join('')}</div>
    <div class="btns">${BTN.map(([id, lab, k]) => `<div class="bw"><button class="pb" data-b="${id}">${lab}<span class="cap-k">${k}</span></button><i class="led ${id === 'rec' ? 'red' : ''}" data-led="${id}"></i></div>`).join('')}</div>
  </div>
  <div class="keys">
    <div class="whites">${WK.map((c, i) => `<div class="wk" data-w="${i}"><b>${c}</b><i class="led" data-led="w${i}"></i></div>`).join('')}</div>
    <div class="blacks">${BGAP.map((g, j) => `<div class="bk" data-bk="${j}" style="left:calc((100% - 60px)/16*${g + 1} + ${g + 1}*4px - 2px)"><b>${BLAB[j]}</b><i class="led" data-led="b${j}"></i></div>`).join('')}</div>
  </div>
</div>
<div class="below">
  <div class="stool">
    <div class="sstat"></div>
    <div class="r1"><button id="s-pow">desligar</button><button id="s-boot">repetir abertura</button><input type="hidden" id="s-tr" value="auto">
      <label><input type="checkbox" id="s-guide" checked> LEDs guiam a escala (tocando/gravando)</label></div>
    <details class="leg"><summary>Atalhos do teclado do computador</summary><table>
      <tr><td><kbd>1</kbd>…<kbd>6</kbd> · <kbd>7</kbd><kbd>8</kbd><kbd>9</kbd><kbd>0</kbd> · <kbd>⇧ Shift</kbd> · <kbd>R</kbd></td><td>FX SEL ENV LFO EDIT GLO · HOME SAVE ARP SEQ · PLAY/STOP · REC (Shift usado com clique ou tecla não liga/desliga a música)</td></tr>
      <tr><td><kbd>Z</kbd> <kbd>X</kbd></td><td>OCT− · OCT+</td></tr>
      <tr><td><kbd>A S D F G H J K</kbd><br><kbd>Q W E T Y U I O</kbd></td><td>as 16 teclas brancas (esquerda → direita). Teclas pretas: só mouse.</td></tr>
      <tr><td>segurar <kbd>1</kbd> + tecla</td><td>camada do botão (como no aparelho). <b>Shift+clique</b> ou botão direito num botão = <b>trava</b> o hold (clique de novo solta).</td></tr>
      <tr><td>knobs</td><td>roda do mouse, arrastar para cima/baixo, ou setas com o knob focado</td></tr>
    </table></details>
  </div>
  <div class="how-slot"></div>
</div>
<p class="simnote"><b>Provisório, a confirmar com o FM-1 plugado:</b> o que as etiquetas das teclas pretas (OP1…POLY) fazem no aparelho não está no manual — aqui elas só tocam o sustenido e acendem o LED. O mapeamento das teclas do FM-1 por MIDI usa a faixa F3–G5; os knobs do aparelho podem ser encoders (aqui giram sem fim nos três de navegação). Nada disto muda o firmware.</p>`;

const $ = (s, r) => (r || host).querySelector(s), $$ = (s, r) => [...(r || host).querySelectorAll(s)];
const slot = $('.lcdslot'), plate = $('.plate');
// fit the faceplate to the window: 2× LCD when there is room, 1× plus a uniform zoom when not
function fit() { if (!host.offsetParent) return; plate.style.zoom = ''; const avail = host.clientWidth; host.style.setProperty('--z', avail >= 1160 ? 2 : 1); const nat = plate.offsetWidth; plate.style.zoom = nat > avail ? (avail / nat).toFixed(3) : ''; }
addEventListener('resize', fit); let was = false; new MutationObserver(() => { const now = !!host.offsetParent; if (now && !was) fit(); was = now; }).observe(host, { attributes: true, attributeFilter: ['style'] }); setTimeout(fit, 0);

// the Quest DOM screen (real tile machinery from lab.js), re-parented into the faceplate
const dumHost = document.createElement('div'); dumHost.hidden = true; host.append(dumHost);
const Q = { scr: 'title', name: 'Simulador', fw: '', note: '', sim: true };
L.mkTile(Q, dumHost);
const lcdbox = Q.el.querySelector('.lcdbox'); slot.append(lcdbox); Q.el = lcdbox; L.TILES.push(Q);
const dummy = document.createElement('div');
const tav = document.createElement('div'); tav.className = 'lcd tav'; tav.style.display = 'none'; lcdbox.append(tav);
const gt = {}; let curG = null;
function gtile(name) {
  if (gt[name]) return gt[name];
  const def = T.REG.find(d => d.name === name); if (!def) return null;
  const t = T.build(def, dumHost); t.sim = true; t.vis = false; gt[name] = t; return t;
}

// ---------------------------------------------------------------- state
const sim = { master: .8, enc: { select: 0, presets: 0, algo: 0 }, row: 0, cur: { q: 'title' }, layerPrev: null, off: false, booting: false, rip: [], flash: 0, held: new Set(), latched: new Set(), tav: { i: 0 }, lastRec: 'off', clearT: 0, ang: {} };
const press = {}; const wDown = new Set(), bDown = new Set();
const sameT = (a, b) => a && b && (a.q || a.g || (a.tav ? '#tav' : '')) === (b.q || b.g || (b.tav ? '#tav' : ''));
E.setMaster && E.setMaster(sim.master);

// ---------------------------------------------------------------- screens
function paramsFor(c) {
  if (c.q && L.extraParams) { const ex = L.extraParams(c.q); if (ex) return ex.map(k => ({ l: k.l, col: k.color, get: k.get, turn: k.turn })); }
  if (c.q) { const kn = Scr.KN[c.q] || []; return kn.map((k, i) => ({ l: k.l, col: k.color || KCOL[i % 4], get: () => k.get(), turn: dir => { if (c.q === 'menu' || c.q === 'erase') Scr.knobTurn(c.q, i, dir); else Scr.knobTurnStep(c.q, i, dir); L.touch(); } })).slice(0, 8); }
  if (c.g) { const t = gtile(c.g); if (!t) return []; return t.def.fields.slice(0, 8).map((f, i) => ({ l: f.l, col: KCOL[i % 4], get: () => ({ v: t.k[i], t: f.fmt ? f.fmt(t.k[i]) : Math.round(t.k[i] * 100) + '%' }), turn: dir => { t.k[i] = clamp(Math.round((t.k[i] + dir / 40) * 1000) / 1000, 0, 1); t.upd(); if (t.def.onField) t.def.onField(t, i); } })); }
  return [];
}
const params = () => paramsFor(sim.cur);
const TR = {
  tv: { dur: 760, ease: 'cubic-bezier(.16,1,.3,1)', kf: [{ transform: 'scale(.03,.004)', filter: 'brightness(1.7)' }, { transform: 'scale(1,.006)', filter: 'brightness(1.4)', offset: .38 }, { transform: 'scale(1,1)', filter: 'brightness(1)' }] },
  iris: { dur: 560, ease: 'cubic-bezier(.16,1,.3,1)', kf: [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(76% at 50% 50%)' }] },
  wipe: { dur: 300, ease: 'cubic-bezier(.16,1,.3,1)', kf: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
  drop: { dur: 420, ease: 'cubic-bezier(.16,1,.3,1)', kf: [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }] },
  vhs: { dur: 560, ease: 'steps(9,end)', kf: [{ filter: 'hue-rotate(28deg) saturate(1.3) contrast(1.15) blur(.6px)', transform: 'translateX(-14px) skewX(7deg)' }, { filter: 'hue-rotate(-14deg) contrast(1.1)', transform: 'translateX(9px) skewX(-4deg)', offset: .3 }, { filter: 'none', transform: 'none' }] },
};
function trans(name) { const o = TR[name]; if (!o || !lcdbox.animate) return; lcdbox.animate(o.kf, { duration: o.dur, easing: o.ease }); }
function autoTr(to) { if (to.tav) return 'iris'; if (to.q === 'title') return 'tv'; if (to.g && GAMEY.has(to.g)) return 'vhs'; return 'wipe'; }

function go(tgt, opt) {
  opt = opt || {}; if (!opt.force && sameT(tgt, sim.cur) && tgt.idx === sim.cur.idx) return;
  if (tgt.g && !gtile(tgt.g)) return;
  const from = sim.cur; sim.cur = tgt; sim.row = 0;
  if (curG) { curG.vis = false; curG.cv.remove(); curG = null; }
  Q.lcd.style.display = tgt.q ? '' : 'none'; tav.style.display = tgt.tav ? '' : 'none';
  if (tgt.q) { Q.scr = tgt.q; Q.sig = ''; Q.el = lcdbox; L.touch(); } else Q.el = dummy;
  if (tgt.g) { curG = gtile(tgt.g); lcdbox.append(curG.cv); curG.vis = true; }
  if (tgt.tav) renderTav();
  const sel = $('#s-tr').value, name = sel === 'auto' ? (opt.tr || autoTr(tgt)) : sel;
  if (!sim.booting || opt.boot) trans(name);
  info(); knobsInfo(); if (G.STORYMODE) G.STORYMODE.onGo(tgt, opt);
}
function info() {
  const c = sim.cur, nm = c.tav ? 'Tavern (menu)' : c.q ? ({ title: 'Title', party: 'Party', equip: 'Equip', boss: 'Boss', duel: 'Duel', recready: 'Rec ready', count: 'Count-in', steps: 'Dungeon', kit: 'Kit', punch: 'Spells', key: 'Biome', mix: 'Camp', erase: 'Banish', fx: 'FX', menu: 'Settings' })[c.q] || c.q : c.g;
  sim.scrName = nm;
  const lay = c.layer ? ` · camada <b>${c.layer.toUpperCase()}</b> (segurando)` : '';
  $('.sstat').innerHTML = `<b>${nm}</b>${lay}<br><small>${sim.off ? 'desligado' : c.btn && CYC[c.btn].length > 1 ? 'página ' + (c.idx + 1) + '/' + CYC[c.btn].length + ' de ' + c.btn.toUpperCase() + ' · toque de novo para a próxima' : 'toque em HOME para voltar à Party'}</small>`;
  let spec = c.tav ? ['hold:HOME = abre este menu (0,7 s)', 'turn:PRESETS = move o cursor · turn:SELECT = igual', 'press:OCT+ = entra · press:OCT− = volta'] : c.q ? L.HOWQ[c.q] : (T.REG.find(d => d.name === c.g) || {}).how;
  $('.how-slot').innerHTML = spec ? T.how(spec, false) : '';
  const pg = $('.pgchip'), cyc = c.btn ? CYC[c.btn] : null;
  if (cyc && cyc.length > 1) { pg.hidden = false; pg.innerHTML = cyc.map((_, i) => `<u class="${i === c.idx ? 'on' : ''}"></u>`).join(''); } else pg.hidden = true;
}
function knobsInfo() {
  const P = params(), rowOff = sim.row * 4, two = P.length > 4;
  [1, 2, 3, 4].forEach(i => { const p = P[rowOff + i - 1], l = $(`[data-l=k${i}]`), kb = $(`[data-k=k${i}]`); l.textContent = p ? String(p.l).toUpperCase() : '—'; kb.style.setProperty('--kc', p ? p.col : '#4a4650'); kb.style.opacity = p ? 1 : .35; });
  const rc = $('.rowchip'); rc.hidden = !two; rc.textContent = 'SEL ' + (sim.row + 1) + '/2';
}

// ---------------------------------------------------------------- Tavern (menu)
function renderTav() {                                                                                    // the menu is the Taverna itself (animated room behind) with a small box on the right
  const n = TAV.length, i = sim.tav.i, from = clamp(i - 4, 0, Math.max(0, n - 9)); let h = '', last = '';
  for (let k = from; k < Math.min(n, from + 9); k++) { const [sec, name] = TAV[k]; if (sec !== last) { last = sec; h += `<div style="color:#a89080;font-size:8px;letter-spacing:.14em;height:9px">${sec}</div>`; }
    h += `<div class="mrow" data-t="${k}" style="grid-template-columns:8px 1fr;height:13px;${k === i ? 'background:#3a2620' : ''}"><i class="tri" style="border-left-color:${k === i ? '#f2e2c4' : 'transparent'}"></i><span style="color:${k === i ? '#f0c860' : '#f2e2c4'};font-size:10px">${name}</span></div>`; }
  tav.innerHTML = `<canvas class="tbg" width="240" height="240"></canvas><div class="bar"><span class="ttl">Tavern</span><span style="color:#a89080">menu</span><div class="fl"></div><span style="color:#a89080">${i + 1}/${n}</span></div><div class="tbox">${h}</div><div class="tfoot"><span>SEL: ${sim.tavHide ? 'MOSTRA' : 'ESCONDE'} O MENU</span><span style="float:right;margin-right:4px">OCT+: ENTRA</span></div>`; tav.classList.toggle('hide', !!sim.tavHide);
}
tav.addEventListener('pointerdown', e => { const r = e.target.closest('[data-t]'); if (r) { sim.tav.i = +r.dataset.t; enterTav(); } });
function enterTav() { const [, n] = TAV[sim.tav.i]; go(QMAP[n] ? { q: QMAP[n], from: 'tav' } : { g: n, from: 'tav' }, { tr: GAMEY.has(n) ? 'vhs' : 'wipe' }); }
function openTav() { go({ tav: true }); }

// ---------------------------------------------------------------- buttons: tap / hold / layers
const padsLearn = () => { const t = gt['Pads · Remap']; return !!(sim.cur.g === 'Pads · Remap' && t && t.k[3] > .5 && t.k[2] > .5); };   // COMBO + LEARN: the faceplate only records the gesture
const layerHeld = () => LAYER.find(id => press[id] || sim.latched.has(id));
function cycle(id) { const list = CYC[id].filter(d => d.q || T.REG.some(r => r.name === d.g)), c = sim.cur; const i = c.btn === id ? (c.idx + 1) % list.length : 0; go(Object.assign({}, list[i], { btn: id, idx: i })); }
function anyKeyFromTitle() { if (sim.cur.q === 'title' && !sim.booting) { go({ q: 'party' }, { tr: 'iris' }); return true; } return false; }
function onTap(id) {
  if (sim.off) { boot(); return; }
  if (G.STORYMODE && G.STORYMODE.onTap(id)) return;
  if (G.GAME && G.GAME.onTap(id)) return;
  if (anyKeyFromTitle()) return;
  if (padsLearn() && id !== 'home') return;
  if (sim.cur.g === 'FM Hero' || sim.cur.g === 'Piano Hero') { INP.fire({ type: 'gamebtn', id }); if (id === 'play') return; }
  E.ensureAudio();
  switch (id) {
    case 'home': sim.tavHide = false; go({ q: 'party' }); break;
    case 'play': E.togglePlay(); L.touch(); break;
    case 'rec': E.recPress(); L.touch(); break;
    case 'octm': oct(-1); break; case 'octp': oct(1); break;
    case 'sel': if (params().length > 4) { sim.row ^= 1; knobsInfo(); } else cycle('sel'); break;
    default: cycle(id);
  }
}
function oct(d) {
  if (sim.cur.tav) { if (d > 0) enterTav(); else go({ q: 'party' }); return; }
  if (sim.cur.g === 'Importer' && d > 0) { go({ g: 'Zones', layer: sim.cur.layer, from: sim.cur.from }); return; } if (sim.cur.g === 'Zones' && d < 0) { go({ g: 'Importer', layer: sim.cur.layer, from: sim.cur.from }); return; }
  if (sim.cur.from === 'tav' && d < 0) { openTav(); return; }                  // a screen opened from the menu: OCT− goes back to the menu (OCT+ in the menu enters)
  if (sim.cur.q === 'armory' && d > 0) { go({ q: 'fit' }); return; } if (sim.cur.q === 'fit' && d < 0) { go({ q: 'armory' }); return; }
  S.oct = clamp((S.oct | 0) + d, -2, 2); INP.fire({ type: 'octave', d }); L.touch();
}
function onHold(id) {
  if (sim.off) return;
  if (padsLearn() && id !== 'home') return;
  if (id === 'home') { openTav(); return; }
  if (id === 'play') { go({ g: 'Visualizer' }, { tr: 'fade' }); return; }                 // PLAY held: the visualizer, which stays after you let go (HOME leaves)
  if (id === 'rec' && sim.cur.g === 'Importer' && G.STORE && G.STORE.erase) { const tl = gtile('Importer'); G.STORE.erase(Math.round((tl ? tl.k[2] : .5) * 2)); toast(L3('Slot de sample apagado', 'Sample slot erased', 'Slot de sample borrado')); return; }
  if (id === 'rec') { try { G.Engine.eraseTrack(G.Engine.S.sel); } catch (e) {} toast(L3('Faixa apagada', 'Track cleared', 'Pista borrada')); return; }                  // REC held: the selected track is cleared (no screen of its own)
  if (LAYER.includes(id)) enterLayer(id);
}
function enterLayer(id) { if (!sim.cur.layer && !sim.layerPrev) sim.layerPrev = sim.cur; go(Object.assign({}, LAYSCR[id], { layer: id }), { tr: 'wipe' }); }
function exitLayer() { if (sim.layerPrev && !layerHeld() && !press.rec) { const p = sim.layerPrev; sim.layerPrev = null; go(p, { tr: 'wipe' }); } }
function btnDown(id) {
  if (window.FM1W) FM1W.btn(id, 1);
  if (G.STORYMODE && G.STORYMODE.onDown && G.STORYMODE.onDown(id)) { press[id] = { used: true, hold: false, story: true }; return; }
  if (id !== 'play' && press.play) press.play.used = true;
  if (press[id]) return; const p = press[id] = { used: false, hold: false }; render();
  if ((id === 'octm' || id === 'octp') && sim.cur.layer === 'fx') p.used = true;
  p.timer = setTimeout(() => { p.hold = true; onHold(id); }, HOLD_MS[id] || HOLD_DEF);
  if (id === 'octm' || id === 'octp' || id === 'play') p.fast = true;
}
function btnUp(id) {
  if (window.FM1W) FM1W.btn(id, 0);
  const p = press[id]; if (!p) return; if (p.story) { delete press[id]; G.STORYMODE.onUp(id); render(); return; } clearTimeout(p.timer); delete press[id];
  if (!p.hold && !p.used) onTap(id);
  if (p.hold || p.used) { if (id === 'home' && p.hold) { /* menu stays open */ } else exitLayer(); }
  render();
}
function toggleLatch(id) { if (press.play) press.play.used = true; if (sim.latched.has(id)) { sim.latched.delete(id); exitLayer(); } else { sim.latched.add(id); enterLayer(id); } render(); }
$$('.pb').forEach(b => {
  const id = b.dataset.b;
  b.addEventListener('pointerdown', e => { e.preventDefault(); if (e.button === 2 || e.shiftKey) { toggleLatch(id); return; } if (sim.latched.has(id)) { sim.latched.delete(id); exitLayer(); render(); return; } b.setPointerCapture(e.pointerId); btnDown(id); });
  b.addEventListener('pointerup', e => { if (e.button === 2 || e.shiftKey) return; btnUp(id); });
  b.addEventListener('pointercancel', () => btnUp(id));
  b.addEventListener('contextmenu', e => e.preventDefault());
});


// ---------------------------------------------------------------- balloons (what each control is and does) + toast
let LANG = (() => { try { const q = new URLSearchParams(location.search).get('lang'); return ['pt', 'en', 'es'].includes(q) ? q : 'pt'; } catch (e) { return 'pt'; } })();
function L3(pt, en, es) { return LANG === 'en' ? en : LANG === 'es' ? es : pt; }
const KEYL = 'FGABCDEFGABCDEFG';
const BDESC_PT = {
  fx: 'toque: páginas de FX (Sends · Slicer · Delay · Reverb)|segure + tecla: feitiço de performance (Spells)',
  sel: 'toque: escala (Biome · Torch wall · Overworld) ou a 2ª fileira de knobs|segure + tecla: define a tonalidade',
  env: 'toque: envelope (Feitiço · Forge)', lfo: 'toque: LFO (Sea · Alchemy)',
  edit: 'toque: Equip e troca de classe|segure + tecla: apaga o som daquela tecla',
  glo: 'toque: Camp (mix)|segure + tecla 1–4: mute · 5–8: solo · 16: tap tempo',
  home: 'toque: volta à Party|segure 0,7 s: abre o menu Tavern',
  save: 'toque: Baús (song) · Hearth|segure + tecla 1–4: toca a seção · 5–8: grava o loop na seção',
  arp: 'toque: Spellbook e Layer Roll|segure + tecla: note repeat', seq: 'toque: grade de steps|segure + tecla: liga/desliga o step',
  play: 'inicia ou para a música', rec: 'toque: arma a gravação · de novo: fecha o loop|segure 1,2 s: limpa a faixa selecionada',
  octm: 'oitava abaixo · nos menus: voltar', octp: 'oitava acima · nos menus: entrar',
};
const KDESC_PT = { master: 'volume geral', select: 'navegação: passa as páginas do botão atual · no Tavern move a lista', presets: 'troca o som (preset) do herói selecionado · no Tavern move a lista', algo: 'troca o herói selecionado (1–4)' };
const BDESC_EN = {
  fx: 'tap: FX pages (Sends · Slicer · Delay · Reverb)|hold + key: performance spell (Spells)',
  sel: 'tap: scale (Biome · Torch wall · Overworld) or the 2nd row of knobs|hold + key: sets the key',
  env: 'tap: envelope (Spell · Altars · Forge)', lfo: 'tap: LFO (Sea · Alchemy)',
  edit: 'tap: Equip and class change|hold + key: erases the sound of that key',
  glo: 'tap: Camp (mix)|hold + key 1–4: mute · 5–8: solo · 16: tap tempo',
  home: 'tap: back to the Party|hold 0.7 s: opens the Tavern menu',
  save: 'tap: Chests (song) · Hearth|hold + key 1–4: plays the section · 5–8: records the loop into the section',
  arp: 'tap: Spellbook and Layer Roll|hold + key: note repeat', seq: 'tap: step grid|hold + key: toggles the step',
  play: 'starts or stops the music', rec: 'tap: arms recording · again: closes the loop|hold 1.2 s: clears the selected track',
  octm: 'octave down · in menus: back', octp: 'octave up · in menus: enter',
};
const BDESC_ES = {
  fx: 'toque: páginas de FX (Sends · Slicer · Delay · Reverb)|mantén + tecla: hechizo de interpretación (Spells)',
  sel: 'toque: escala (Biome · Torch wall · Overworld) o la 2ª fila de knobs|mantén + tecla: define la tonalidad',
  env: 'toque: envolvente (Hechizo · Forge)', lfo: 'toque: LFO (Sea · Alchemy)',
  edit: 'toque: Equip y cambio de clase|mantén + tecla: borra el sonido de esa tecla',
  glo: 'toque: Camp (mezcla)|mantén + tecla 1–4: mute · 5–8: solo · 16: tap tempo',
  home: 'toque: vuelve a la Party|mantén 0,7 s: abre el menú Tavern',
  save: 'toque: Cofres (canción) · Hearth|mantén + tecla 1–4: toca la sección · 5–8: graba el loop en la sección',
  arp: 'toque: Spellbook y Layer Roll|mantén + tecla: repetición de nota', seq: 'toque: rejilla de pasos|mantén + tecla: activa/desactiva el paso',
  play: 'inicia o detiene la música', rec: 'toque: arma la grabación · otra vez: cierra el loop|mantén 1,2 s: borra la pista seleccionada',
  octm: 'octava abajo · en los menús: volver', octp: 'octava arriba · en los menús: entrar',
};
const KDESC_EN = { master: 'overall volume', select: 'navigation: flips the pages of the current button · in the Tavern it moves the list', presets: 'changes the sound (preset) of the selected hero · in the Tavern it moves the list', algo: 'changes the selected hero (1–4)' };
const KDESC_ES = { master: 'volumen general', select: 'navegación: pasa las páginas del botón actual · en la Tavern mueve la lista', presets: 'cambia el sonido (preset) del héroe seleccionado · en la Tavern mueve la lista', algo: 'cambia el héroe seleccionado (1–4)' };
const bdesc = id => (LANG === 'en' ? BDESC_EN : LANG === 'es' ? BDESC_ES : BDESC_PT)[id], KDESC = new Proxy({}, { get: (_, k) => (LANG === 'en' ? KDESC_EN : LANG === 'es' ? KDESC_ES : KDESC_PT)[k] });
function describe(kind, id, i) {
  const P = G.PADS, drag = L3('clique e arraste para cima ou para baixo (ou role sobre ele)', 'click and drag up or down (or scroll over it)', 'haz clic y arrastra arriba o abajo (o desplaza sobre él)');
  if (kind === 'btn') { const b = BTN.find(x => x[0] === id); return b ? { label: b[1], sc: b[2], lines: bdesc(id).split('|') } : { label: id === 'octm' ? 'OCT−' : 'OCT+', sc: id === 'octm' ? 'Z' : 'X', lines: bdesc(id).split('|') }; }
  if (kind === 'knob') {
    if (KDESC[id]) return { label: ({ master: 'MASTER', select: 'SELECT', presets: 'PRESETS', algo: 'ALGORITHM' })[id], lines: [KDESC[id], drag] };
    const n = +id[1], p = params()[sim.row * 4 + n - 1], sc = 'Shift+' + n;
    return { label: 'KNOB' + n, sc, lines: (p ? [L3('controla <b>', 'controls <b>', 'controla <b>') + String(p.l).toUpperCase() + '</b> (' + p.get().t + ')', L3('na tela: ', 'on screen: ', 'en pantalla: ') + (sim.scrName || '')] : [L3('esta tela não usa este knob', 'this screen does not use this knob', 'esta pantalla no usa este knob')]).concat(L3('atalho: ' + sc + ', depois mova o mouse para cima ou para baixo (ou role): o knob gira e a página não rola. Esc solta.', 'shortcut: ' + sc + ', then move the mouse up or down (or scroll): the knob turns and the page does not scroll. Esc releases.', 'atajo: ' + sc + ', luego mueve el ratón arriba o abajo (o desplaza): el knob gira y la página no se desplaza. Esc suelta.'), drag) };
  }
  if (kind === 'bk') return { label: BLAB[i] || L3('(sem nome)', '(no name)', '(sin nombre)'), lines: [L3('tecla de cima (' + KEYL[BGAP[i]] + '♯)', 'upper key (' + KEYL[BGAP[i]] + '♯)', 'tecla de arriba (' + KEYL[BGAP[i]] + '♯)'), L3('a função da etiqueta ainda não foi medida no aparelho: aqui toca o sustenido', 'what the label does on the device has not been measured yet: here it plays the sharp', 'la función de la etiqueta aún no se midió en el aparato: aquí toca el sostenido'), L3('só com o mouse ou um teclado MIDI', 'mouse or a MIDI keyboard only', 'solo con el ratón o un teclado MIDI')] };
  if (kind === 'wk') {
    const d = { label: 'PAD ' + (i + 1), sc: WK[i], lines: [L3('toca a nota ', 'plays the note ', 'toca la nota ') + KEYL[i], L3('com um botão segurado: a ação da camada daquele botão', 'with a button held: that button\'s layer action', 'con un botón mantenido: la acción de la capa de ese botón'), L3('teclado: 1 a 0 tocam os pads 1–10 · segure Shift e use 5 a 0 para os pads 11–16', 'keyboard: 1 to 0 play pads 1–10 · hold Shift and use 5 to 0 for pads 11–16', 'teclado: 1 a 0 tocan los pads 1–10 · mantén Shift y usa 5 a 0 para los pads 11–16')] };
    if (P) { const cu = [], a = P.PS.map[i]; if (a > 0) cu.push({ name: P.ACT[a][0], detail: '— ' + P.ACT[a][1] }); if (P.PS.combo[i]) cu.push({ name: L3('combinação', 'combination', 'combinación'), detail: P.PS.combo[i] }); if (P.PS.midi[i] >= 0) cu.push({ name: 'MIDI learn', detail: L3('nota ', 'note ', 'nota ') + P.PS.midi[i] }); if (cu.length) d.custom = cu; }
    return d;
  }
  return { label: '', lines: [] };
}
const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.append(tip);
function showTip(d, x, y) { tip.innerHTML = `<div class="h"><b>${d.label}</b>${d.sc ? `<kbd>${d.sc}</kbd>` : ''}</div>` + d.lines.map(l => `<div class="d">${l}</div>`).join('') + (d.custom ? `<div class="c"><i>${L3('personalizado', 'custom', 'personalizado')}</i>${d.custom.map(c => `<div><b>${c.name}</b> ${c.detail || ''}</div>`).join('')}</div>` : ''); tip.hidden = false; moveTip(x, y); }
function moveTip(x, y) { const w = tip.offsetWidth, h = tip.offsetHeight; let px = x + 16, py = y + 18; if (px + w > innerWidth - 8) px = x - w - 12; if (py + h > innerHeight - 8) py = y - h - 12; tip.style.left = Math.max(4, px) + 'px'; tip.style.top = Math.max(4, py) + 'px'; }
const hideTip = () => { tip.hidden = true; };
const toastEl = document.createElement('div'); toastEl.className = 'simtoast'; toastEl.hidden = true; host.append(toastEl); let toastT = 0;
function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 1800); }
// pads personalised in Pads · Remap run their action instead of the note
function padAction(i, down) {
  const P = G.PADS; if (!P) return false; const a = P.PS.map[i]; if (!a) return false; const n = P.ACT[a][0];
  if (!down) { if (n === 'SPELL') { E.setPunch(-1); L.touch(); } return true; }
  let m;
  if ((m = /^MUTE (\d)/.exec(n))) { E.toggleMute(+m[1] - 1); toast('pad ' + (i + 1) + ' (personalizado): mute do herói ' + m[1]); }
  else if (n === 'SOLO') { E.setSolo(S.sel); toast('pad ' + (i + 1) + ' (personalizado): solo'); }
  else if (n === 'TAP TEMPO') { E.tapTempo(); toast('pad ' + (i + 1) + ' (personalizado): tap tempo'); }
  else if (n === 'SPELL') { E.setPunch(i); }
  else if (n === 'TRANSPOSE +' || n === 'TRANSPOSE −') { S.transp = clamp((S.transp | 0) + (n === 'TRANSPOSE +' ? 1 : -1), -12, 12); toast('pad ' + (i + 1) + ' (personalizado): transpose ' + S.transp); }
  else toast('pad ' + (i + 1) + ' (personalizado): ' + n + ' — ainda não ligado ao motor do simulador');
  L.touch(); return true;
}

// ---------------------------------------------------------------- keys
function keyMidi(i, black) { return 53 + (black ? WOFF[BGAP[i]] + 1 : WOFF[i]); }
function keyX(i, black) { return black ? BGAP[i] + .5 : i; }
function keyPress(i, black) {
  if (window.FM1W) FM1W.key(i, black, 1);
  if (sim.off) return; if (anyKeyFromTitle()) return; if (press.play) press.play.used = true;
  const set = black ? bDown : wDown; if (set.has(i)) return; set.add(i); ripple(keyX(i, black), 1); if (G.GAME && !sim.booting) G.GAME.onKey();
  { const hb = BTN.map(b => b[0]).filter(id => press[id] || sim.latched.has(id)).map(id => id.toUpperCase()); sim.chord = { s: hb.concat('KEY ' + (black ? 'b' : '') + (i + 1)).join(' + '), t: performance.now() }; }
  if (black && bDown.size > 11) return;
  if (padsLearn()) { render(); return; }
  const P = G.PADS;
  if (P && sim.chord) { const cp = P.PS.combo.findIndex(c => c && c === sim.chord.s); if (cp >= 0) { if (!padAction(cp, true)) E.noteOn(keyMidi(cp, false), 'sim'); render(); return; } }
  const lay = layerHeld(); E.ensureAudio();
  if (sim.cur.g && GAMEY.has(sim.cur.g) && !lay) { if (!black) { INP.fire({ type: 'white', w: i, t: performance.now(), src: 'sim' }); if (i < 5) INP.fire({ type: 'lane', lane: i, t: performance.now(), src: 'sim' }); } render(); return; }
  if (lay) { press[lay] && (press[lay].used = true); enterLayer(lay); layerKey(lay, i, black); render(); return; }
  if (!black && padAction(i, true)) { render(); return; }
  E.noteOn(keyMidi(i, black), 'sim'); L.touch(); render();
}
function keyRelease(i, black) {
  if (window.FM1W) FM1W.key(i, black, 0);
  const set = black ? bDown : wDown; if (!set.delete(i)) return;
  if (sim.cur.layer === 'fx') { E.setPunch(-1); L.touch(); }
  if (!black) padAction(i, false);
  render();
}
function layerKey(lay, i, black) {
  const n = black ? 16 + i : i;
  switch (lay) {
    case 'fx': if (n < 16) E.setPunch(n); break;
    case 'sel': { const pc = black ? (KEYPC[BGAP[i]] + 1) % 12 : KEYPC[i]; S.keyRoot = pc; const rt = document.getElementById('c-root'); if (rt) rt.value = pc; const tw = gt['SCL · Torch wall']; if (tw) { tw.k[0] = pc / 11; tw.upd(); } E.noteOn(keyMidi(i, black), 'sim'); break; }
    case 'glo': if (n < 4) E.toggleMute(n); else if (n < 8) E.setSolo(n - 4); else if (n === 15) { E.tapTempo(); } break;
    case 'edit': if (n < 16) E.eraseSound(n); break;
    case 'seq': if (n < 16) E.toggleStep(S.sel, n + S.page * 16); break;
    default: E.noteOn(keyMidi(i, black), 'sim');
  }
  L.touch();
}
$$('.wk').forEach(k => { const i = +k.dataset.w; k.addEventListener('pointerdown', e => { e.preventDefault(); k.setPointerCapture(e.pointerId); keyPress(i, false); }); k.addEventListener('pointerup', () => keyRelease(i, false)); k.addEventListener('pointercancel', () => keyRelease(i, false)); });
$$('.bk').forEach(k => { const i = +k.dataset.bk; k.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); k.setPointerCapture(e.pointerId); keyPress(i, true); }); k.addEventListener('pointerup', () => keyRelease(i, true)); k.addEventListener('pointercancel', () => keyRelease(i, true)); });
lcdbox.addEventListener('pointerdown', () => { if (sim.off) boot(); else anyKeyFromTitle(); });

const active = () => host.offsetParent !== null;
const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range' ? true : e.target.isContentEditable;
const heldKey = {};
let armed = null, armAcc = 0;                                                                         // Shift+1…4 picks a knob; then the mouse moving up/down (or the wheel) turns it, and the page does not scroll
function disarm() { if (!armed) return; armed = null; sim.armed = null; toastEl.hidden = true; }
function armKnob(id) { if (armed === id) { disarm(); return; } armed = id; armAcc = 0; sim.armed = id; toastEl.textContent = L3('KNOB ' + id[1] + ': mova o mouse para cima ou para baixo (ou role). Esc solta.', 'KNOB ' + id[1] + ': move the mouse up or down (or scroll). Esc releases.', 'KNOB ' + id[1] + ': mueve el ratón arriba o abajo (o desplaza). Esc suelta.'); toastEl.hidden = false; clearTimeout(toastT); }
addEventListener('pointermove', e => { if (!armed || !active()) return; armAcc -= e.movementY || 0; while (Math.abs(armAcc) >= 7) { knobTurn(armed, armAcc > 0 ? 1 : -1); armAcc -= Math.sign(armAcc) * 7; } }, true);
addEventListener('wheel', e => { if (!armed || !active()) return; e.preventDefault(); e.stopPropagation(); knobTurn(armed, e.deltaY < 0 ? 1 : -1); }, { passive: false, capture: true });
addEventListener('pointerdown', () => { if (armed) disarm(); }, true);
addEventListener('keydown', e => {
  if (!active() || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape' && armed) { disarm(); return; }
  const di = digIdx(e.code);
  if (di >= 0) { e.preventDefault(); e.stopPropagation(); if (e.repeat) return; if (e.shiftKey && di < 4) { armKnob('k' + (di + 1)); return; } const w = e.shiftKey ? 10 + (di - 4) : di; heldKey[e.code] = w; keyPress(w, false); return; }
  const b = CODEB[e.code]; if (b) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) btnDown(b); }
}, true);
addEventListener('keyup', e => {
  if (!active()) return; const hw = heldKey[e.code]; if (hw !== undefined) { e.stopPropagation(); delete heldKey[e.code]; keyRelease(hw, false); return; }
  const b = CODEB[e.code]; if (b) { e.preventDefault(); e.stopPropagation(); btnUp(b); }
}, true);
// FM-1 / MIDI keyboard: note → nearest key in the F3–G5 row (provisional mapping, see the note under the faceplate)
INP.subs.push(ev => { if (!active() || ev.type !== 'note' || G.MIDI) return; const mp = G.PADS ? G.PADS.PS.midi.indexOf(ev.note) : -1; if (mp >= 0) { keyPress(mp, false); setTimeout(() => keyRelease(mp, false), 160); return; } const semi = (((ev.note - 53) % 27) + 27) % 27; let bi = -1, black = false;
  const wi = WOFF.indexOf(semi); if (wi >= 0) bi = wi; else { const j = BGAP.findIndex(g => WOFF[g] + 1 === semi); if (j >= 0) { bi = j; black = true; } }
  if (bi < 0) return; keyPress(bi, black); setTimeout(() => keyRelease(bi, black), 160); });

// ---------------------------------------------------------------- knobs
function selectTurn(dir) {
  const c = sim.cur;
  if (c.g === 'FM Hero' || c.g === 'Piano Hero') { INP.fire({ type: 'octave', d: dir }); return; }
  if (c.g === 'Visualizer') { const tl = gtile('Visualizer'); if (tl) { tl.k[0] = clamp(tl.k[0] + dir / 5, 0, 1); tl.upd && tl.upd(); } return; }
  if (c.tav) { sim.tav.i = clamp(sim.tav.i + dir, 0, TAV.length - 1); renderTav(); return; }
  if (c.btn && CYC[c.btn].length > 1) { const n = CYC[c.btn].length, i = (c.idx + dir + n) % n; go(Object.assign({}, CYC[c.btn][i], { btn: c.btn, idx: i })); }
}
function knobTurn(id, dir) {
  if (window.FM1W) FM1W.knob(id, dir);
  if (sim.off) return; E.ensureAudio();
  if (G.STORYMODE && G.STORYMODE.onKnob(id, dir)) return;
  if (G.GAME && G.GAME.onKnob(id, dir)) return;
  if (id === 'master') { sim.master = clamp(sim.master + dir * .04, 0, 1); E.setMaster && E.setMaster(sim.master); return; }
  if (id === 'select') { sim.enc.select += dir; selectTurn(dir); return; }
  if (id === 'presets') { sim.enc.presets += dir; if (sim.cur.tav) { selectTurn(dir); return; } const tr = S.sel; if (tr === 3) { S.kitSel = (S.kitSel + dir + 12) % 12; E.previewDrum(0); } else { S.tracks[tr].preset = (S.tracks[tr].preset + dir + E.PRESETS.length) % E.PRESETS.length; E.previewDeg(tr, 0); } L.touch(); return; }
  if (id === 'algo') { sim.enc.algo += dir; S.sel = (S.sel + dir + 4) % 4; L.touch(); return; }
  const i = +id[1] - 1, p = params()[sim.row * 4 + i]; if (p) { p.turn(dir); const g = p.get(); sim.knobFlash = { t: performance.now(), v: clamp(g.v, 0, 1), i }; }
}
$$('.knob').forEach(el => {
  const id = el.dataset.k; let y0 = null, acc = 0;
  el.addEventListener('wheel', e => { e.preventDefault(); knobTurn(id, e.deltaY < 0 ? 1 : -1); }, { passive: false });
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); y0 = e.clientY; acc = 0; el.focus(); });
  el.addEventListener('pointermove', e => { if (y0 == null) return; acc += y0 - e.clientY; y0 = e.clientY; while (Math.abs(acc) >= 7) { knobTurn(id, acc > 0 ? 1 : -1); acc -= Math.sign(acc) * 7; } });
  el.addEventListener('pointerup', () => { y0 = null; }); el.addEventListener('pointercancel', () => { y0 = null; });
  el.addEventListener('keydown', e => { const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); e.stopPropagation(); knobTurn(id, d); } });
});

// balloons on the 2D faceplate too
$$('.pb').forEach(b => { const id = b.dataset.b; b.addEventListener('mouseenter', e => showTip(describe('btn', id), e.clientX, e.clientY)); b.addEventListener('mousemove', e => moveTip(e.clientX, e.clientY)); b.addEventListener('mouseleave', hideTip); });
$$('.wk').forEach(b => { const i = +b.dataset.w; b.addEventListener('mouseenter', e => showTip(describe('wk', null, i), e.clientX, e.clientY)); b.addEventListener('mousemove', e => moveTip(e.clientX, e.clientY)); b.addEventListener('mouseleave', hideTip); });
$$('.bk').forEach(b => { const i = +b.dataset.bk; b.addEventListener('mouseenter', e => showTip(describe('bk', null, i), e.clientX, e.clientY)); b.addEventListener('mousemove', e => moveTip(e.clientX, e.clientY)); b.addEventListener('mouseleave', hideTip); });
$$('.knob').forEach(b => { const id = b.dataset.k; b.addEventListener('mouseenter', e => showTip(describe('knob', id), e.clientX, e.clientY)); b.addEventListener('mousemove', e => moveTip(e.clientX, e.clientY)); b.addEventListener('mouseleave', hideTip); });

// ---------------------------------------------------------------- LEDs (3 levels: off / dim / full) and the ripple "puddle"
const leds = {}; $$('[data-led]').forEach(el => { leds[el.dataset.led] = { el, l: -1 }; });
const LEDC = { n: [[43, 40, 49], [140, 106, 42], [255, 215, 112]], r: [[43, 40, 49], [122, 42, 34], [255, 93, 76]] }, ledEnv = {};
const setLed = (id, l, c) => {
  const o = leds[id]; if (!o) return; const now = performance.now(), e = ledEnv[id] || (ledEnv[id] = { v: 0, t: now }), dt = Math.min(.1, (now - e.t) / 1000); e.t = now;
  const rel = G.LEDFX && G.LEDFX.cfg.fade != null ? G.LEDFX.cfg.fade : .6; if (l >= e.v) e.v = l; else e.v = Math.max(l, e.v - dt * 2 / Math.max(.05, rel));        // light comes on at once and fades out over `rel` seconds
  const v = Math.round(e.v * 12) / 12; c = c || null; if (o.l === v && o.c === c) return; o.l = v; o.c = c;
  if (c) { o.el.classList.toggle('col', true); o.el.style.setProperty('--lc', c); o.el.style.background = ''; o.el.style.boxShadow = ''; o.el.classList.toggle('l1', v >= 1 && v < 2); o.el.classList.toggle('l2', v >= 2); return; }
  o.el.classList.remove('col', 'l1', 'l2'); o.el.style.removeProperty('--lc'); const P = LEDC[o.el.classList.contains('red') ? 'r' : 'n'], f = v <= 1 ? [P[0], P[1], v] : [P[1], P[2], v - 1], mix = f[0].map((a, i) => Math.round(a + (f[1][i] - a) * f[2]));
  o.el.style.background = `rgb(${mix})`; o.el.style.boxShadow = v > 1.05 ? `0 0 ${7 * (v - 1)}px rgba(255,182,46,${(v - 1).toFixed(2)}),0 0 2px rgba(255,255,255,${((v - 1) * .5).toFixed(2)})` : 'inset 0 0 0 1px #0007';
};
function ripple(x, a) { sim.rip.push({ x, t: performance.now(), a: a || 1 }); if (sim.rip.length > 24) sim.rip.shift(); }
function pad(freq, t0, len) {                                                                           // simple dungeon-synth pad: two detuned saws + a sub, dark low-pass, slow attack, long release
  if (!AUD.on()) return; const c = AUD.get(), t = c.currentTime + t0, g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + len * .5); f.frequency.linearRampToValueAtTime(300, t + len);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.11, t + .55); g.gain.setValueAtTime(.11, t + len * .6); g.gain.exponentialRampToValueAtTime(.0001, t + len); f.connect(g); g.connect(c.destination);
  [[freq, 'sawtooth', 6], [freq, 'sawtooth', -6], [freq / 2, 'triangle', 0]].forEach(([fr, ty, det]) => { const o = c.createOscillator(); o.type = ty; o.frequency.value = fr; o.detune.value = det; o.connect(f); o.start(t); o.stop(t + len + .05); });
}
function jingle() {
  const L = G.LEDFX, f0 = L ? L.cfg.fade : null; if (L) L.cfg.fade = 1.5; setTimeout(() => { if (L && f0 != null) L.cfg.fade = f0; }, 10500);
  JING.forEach(([t, col, f]) => setTimeout(() => { if (col < 0) { sim.flash = performance.now() + 420; AUD.tone(440, 1.4); AUD.tone(659.3, 1.4); AUD.tone(880, 1.4); } else { ripple(col, 1.4); AUD.tone(f, .45); } }, t * 1000));
  TAIL.forEach(([t, f, len]) => { pad(f, t, len); });                                                  // the pad has no key light: the blink of every key (2.55 s) is the end of the key animation
}
function ledTick(now) {
  if (window.FM1W && FM1W.on) { FM1W.leds(setLed); return; }
  sim.rip = sim.rip.filter(r => now - r.t < 3200);
  const amp = x => { let a = 0; for (const r of sim.rip) { const age = (now - r.t) / 1000, d = Math.abs(x - r.x); a += Math.exp(-Math.pow(d - 11 * age, 2) / 1.7) * Math.exp(-age * 1.9) * r.a; } return a; };
  const q = a => a > .5 ? 2 : a > .22 ? 1 : 0, all = now < sim.flash, guide = $('#s-guide').checked, root = S.keyRoot, scl = E.SCALES[S.scale];
  const live = S.playing || S.rec.state !== 'off';   // keys stay dark unless something is playing, recording, pressed or an effect is running
  const kl = (pc, base) => { if (!guide || !live) return base; const rel = ((pc - root) % 12 + 12) % 12; return rel === 0 ? 2 : scl.includes(rel) ? 1 : 0; };
  const rec = S.rec.state, blink = Math.floor(now / 220) % 2;
  // optional LED effects module (lab-led.js): idle effect + key-press effect, added on top of the scale guide
  const vis = E.visual(), scr = sim.cur.q || sim.cur.g || (sim.cur.tav ? 'tav' : ''), FX = !sim.off && !all && A.ledFx ? A.ledFx(now, { rip: sim.rip, bpm: S.bpm, step: vis.step, beat: vis.beat, playing: S.playing, rec: S.rec, root, scl, scr, layer: sim.cur.layer, punch: S.punch }) : null;
  BTN.forEach(([id]) => {
    let l = 0; if (sim.off) l = 0; else if (all) l = 2; else if (press[id] || sim.latched.has(id)) l = 2;
    if (id === 'play' && S.playing) l = Math.floor(vis.step) % 4 === 0 ? 2 : 1;
    if (id === 'rec') l = rec === 'rec' ? 2 : rec === 'ready' || rec === 'count' ? (blink ? 2 : 0) : l;
    if (sim.off) l = 0;
    setLed(id, l);
  });
  const fxHeld = !sim.off && sim.cur.layer === 'fx';                      // FX held: the four spell keys (1, 5, 9, 13) light up
  for (let i = 0; i < 16; i++) { let l = sim.off ? 0 : all ? 2 : FX && FX.ov ? FX.w[i] : Math.max(kl(KEYPC[i], 0), FX ? FX.w[i] : q(amp(i))); if (fxHeld) l = i % 4 === 0 ? 2 : 0; if (wDown.has(i)) l = 2; setLed('w' + i, l, FX && l ? FX.wc[i] : null); }
  for (let j = 0; j < 11; j++) { let l = sim.off ? 0 : all ? 2 : FX && FX.ov ? FX.b[j] : Math.max(kl((KEYPC[BGAP[j]] + 1) % 12, 0), FX ? FX.b[j] : q(amp(BGAP[j] + .5))); if (fxHeld) l = 0; if (bDown.has(j)) l = 2; setLed('b' + j, l, FX && l ? FX.bc[j] : null); }
}
function render() {
  $$('.pb').forEach(b => { const id = b.dataset.b; b.classList.toggle('dn', !!press[id]); b.classList.toggle('lat', sim.latched.has(id)); });
  $$('.wk').forEach(k => k.classList.toggle('dn', wDown.has(+k.dataset.w))); $$('.bk').forEach(k => k.classList.toggle('dn', bDown.has(+k.dataset.bk)));
}

// ---------------------------------------------------------------- power + boot
function boot() {
  sim.off = false; sim.booting = true; lcdbox.classList.remove('off'); $('#s-pow').textContent = 'desligar';
  go({ q: 'title' }, { tr: 'tv', force: true, boot: true }); jingle(); setTimeout(() => { sim.booting = false; info(); }, 1500);
}
function powerOff() {
  if (G.VILA && G.VILA.V.started && G.Engine && G.Engine.S.playing) { G.Engine.stop(); G.VILA.V.started = false; }
  sim.off = true; $('#s-pow').textContent = 'ligar';
  if (lcdbox.animate) lcdbox.animate([{ transform: 'scale(1,1)', filter: 'brightness(1)' }, { transform: 'scale(1,.012)', filter: 'brightness(5)', offset: .55 }, { transform: 'scale(.02,.004)', filter: 'brightness(9)' }], { duration: 420, easing: 'cubic-bezier(.7,0,.84,0)' }).onfinish = () => lcdbox.classList.add('off'); else lcdbox.classList.add('off');
  info();
}
$('#s-pow').onclick = () => { if (sim.off) boot(); else powerOff(); };
$('#s-boot').onclick = () => { if (sim.off) { boot(); return; } boot(); };

// ---------------------------------------------------------------- frame
let lastT = 0;
function tick(now) {
  requestAnimationFrame(tick); if (!active() || now - lastT < 33) return; lastT = now;
  if (curG) curG.vis = true;
  ledTick(now);
  { const fxl = !sim.off && sim.cur.layer === 'fx', tgt = fxl && press.octp ? 1.7 : fxl && press.octm ? .5 : 1, cur = S.tape || 1; S.tape = Math.abs(cur - tgt) < .015 ? (tgt === 1 ? 1 : tgt) : cur + (tgt - cur) * (tgt !== 1 ? .22 : .35); if (S.tape === 1) delete S.tape; }
  // REC state drives its screens (the engine owns the state machine)
  const rs = S.rec.state; if (rs !== sim.lastRec) { sim.lastRec = rs; if (!sim.off && !sim.cur.layer && !sim.cur.tav && !sim.booting) {
    if (rs === 'ready') go({ q: 'recready' }); else if (rs === 'count') go({ q: 'count' }); else if (rs === 'rec') go({ q: 'boss' }); else if (['recready', 'count', 'boss'].includes(sim.cur.q)) go({ q: 'party' }); } }
  // hold REC: charge the Banish screen
  // knob pointers + values
  const P = params(), ro = sim.row * 4, ang = sim.ang;
  [1, 2, 3, 4].forEach(i => { const p = P[ro + i - 1], kb = $(`[data-k=k${i}]`), v = $(`[data-v=k${i}]`); ang['k' + i] = p ? clamp(p.get().v, 0, 1) * 270 - 135 : -135; if (p) { const g = p.get(); kb.style.setProperty('--a', (clamp(g.v, 0, 1) * 270 - 135) + 'deg'); if (v.textContent !== String(g.t)) v.textContent = g.t; } else { kb.style.setProperty('--a', '-135deg'); v.textContent = ''; } });
  ang.master = sim.master * 270 - 135; ['select', 'presets', 'algo'].forEach(id => { ang[id] = sim.enc[id] * 22; });
  $('[data-k=master]').style.setProperty('--a', (sim.master * 270 - 135) + 'deg'); $('[data-v=master]').textContent = Math.round(sim.master * 100) + '%';
  ['select', 'presets', 'algo'].forEach(id => { $(`[data-k=${id}]`).style.setProperty('--a', (sim.enc[id] * 22) + 'deg'); });
  $('[data-v=algo]').textContent = 'hero ' + (S.sel + 1); $('[data-v=presets]').textContent = S.sel === 3 ? 'kit ' + (S.kitSel + 1) : 'preset ' + (S.tracks[S.sel].preset + 1);
  $('#s-oct').textContent = 'OCT ' + ((S.oct | 0) > 0 ? '+' : '') + (S.oct | 0);
  { const oc = S.oct | 0, kb = !!($('#s-kbd') && $('#s-kbd').checked), key = oc + ':' + kb; if (sim.noteKey !== key) { sim.noteKey = key; const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; $$('.wk b').forEach((b, i) => { const m = 53 + WOFF[i] + 12 * oc; b.innerHTML = NN[m % 12] + (Math.floor(m / 12) - 1) + (kb ? '<small>' + WK[i].toUpperCase() + '</small>' : ''); }); } }
}
requestAnimationFrame(tick);

// opening: runs once when the page loads on this tab (sound stays off unless the user turns it on)
setTimeout(() => { if (!sim.off) { go({ q: 'title' }, { tr: 'tv', force: true, boot: true }); jingle(); sim.booting = true; setTimeout(() => { sim.booting = false; info(); }, 1500); } }, 350);
info(); knobsInfo();
A.setLang = l => { if (['pt', 'en', 'es'].includes(l)) { LANG = l; hideTip(); try { document.dispatchEvent(new CustomEvent('fm1lang', { detail: l })); } catch (e) {} } };
addEventListener('message', e => { if (e.data && e.data.fm1lang) A.setLang(e.data.fm1lang); });
G.SIM = { sim, go, boot, powerOff, ripple, api: Object.assign(A, { btnDown, btnUp, keyPress, keyRelease, knobTurn, toggleLatch, press, wDown, bDown, leds, params, BTN, BLAB, WK, CYC, host, plate, slot, lcdbox, fit, set3d: null, describe, showTip, moveTip, hideTip, toast, gtile, TR }) };
})(window);
