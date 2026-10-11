// FM1 Quest — the 15 LCD screens (TAVERN). Each screen returns {bar, scene, ov, hud, knobs}.
// All sizes are device pixels (1x); the LCD element is zoomed by an integer factor.
(function (G) {
'use strict';
const E = G.Engine, S = E.S;
const C = { bg: '#1e1418', text: '#f2e2c4', dim: '#a89080', pdim: '#c8b090', line: '#5a3a28', off: '#2e2226', offHi: '#45343a', pad: '#24181c', padC: '#3a4a78',
  panel: '#3a2620', border: '#c8963c', hi: '#f0c860', hiText: '#1e1418', rec: '#e0503c', t: ['#5a8ad0', '#7ab04e', '#f0c860', '#e08a3a'], shade: '#1e1418', pbg: '#45343a' };
const cc = i => C.t[((i % 4) + 4) % 4];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = v => Math.round(v * 100);

const tri = (c) => `<i class="tri" style="border-left-color:${c || C.text}"></i>`;
const panel = (inner, st) => `<div class="panel" style="${st || ''}">${inner}</div>`;
const title = (t, c) => `<span class="ttl"${c ? ` style="color:${c}"` : ''}>${t}</span>`;
const bpmBox = () => `<div class="bpm"><b>${S.bpm}</b><span style="color:${C.dim}">bpm</span></div>`;
function pos(v) { const b = Math.floor(v.beat); const bar = Math.floor(b / 4) + 1, bt = ((b % 4) + 4) % 4; return { bar, bt }; }
function posBox(v, pipCol) {
  const p = pos(v);
  const pips = [0, 1, 2, 3].map(i => `<u style="background:${(v.playing && i === p.bt) ? (pipCol || C.text) : C.off}"></u>`).join('');
  return `<div class="posb">${S.playing ? tri() : `<i class="sq" style="background:${C.dim}"></i>`}<span>${S.playing ? Math.max(1, p.bar) + '.' + (p.bt + 1) : '--'}</span><div class="pips">${pips}</div></div>`;
}
function knobsHTML(list) {
  return `<div class="knobs" style="grid-template-columns:repeat(${list.length},1fr)">` + list.map(k =>
    `<div class="kn"><canvas data-knob="${clamp(k.v, 0, 1)}" data-col="${k.color}" data-dir="1c" width="20" height="20"></canvas><span style="color:${C.dim}">${k.l}</span><span>${k.t}</span></div>`).join('') + '</div>';
}
function portrait(cls, bd, extra) { return `<canvas class="por" data-portrait="${cls}" data-dir="1c" data-bg="${C.pbg}" width="15" height="15" style="border-color:${bd};${extra || ''}"></canvas>`; }
const pad = (label, bg, fg, top, bd, h) => `<div class="pad" style="background:${bg};color:${fg};border-color:${bd || C.padC};${top ? `border-top-color:${top};border-top-width:2px;` : ''}${h ? `height:${h}px` : ''}"><span>${label}</span></div>`;
const trk = i => S.tracks[i];

// ---------------------------------------------------------------- knob tables (get / set 0..1)
const swingK = { l: 'swing', color: cc(0), get: () => ({ v: (S.swing - 50) / 25, t: S.swing + '%' }), set: v => { S.swing = 50 + Math.round(v * 25); } };
const levelK = { l: 'level', color: cc(1), get: () => ({ v: trk(S.sel).level, t: pct(trk(S.sel).level) }), set: v => { trk(S.sel).level = v; E.applyMix(); } };
const stepsK = { l: 'steps', color: cc(2), get: () => ({ v: trk(S.sel).steps / 64, t: trk(S.sel).steps }), set: v => { trk(S.sel).steps = clamp(Math.round(v * 16) * 4, 4, 64); } };
const panK = { l: 'pan', color: cc(3), get: () => ({ v: trk(S.sel).pan, t: pct(trk(S.sel).pan - .5) }), set: v => { trk(S.sel).pan = v; E.applyMix(); } };
const sel = (name, idx, opts, color, set) => ({ l: name, color, get: () => ({ v: opts.length > 1 ? idx() / (opts.length - 1) : 0, t: opts[idx()] }), set: v => set(Math.round(v * (opts.length - 1))) });
const barsOpts = [1, 2, 4];
const KN = {
  party: [swingK, levelK, stepsK, panK],
  equip: ['cutoff', 'reso', 'env', 'decay'].map((n, i) => ({ l: n, color: cc(i), get: () => ({ v: trk(S.sel)[n], t: pct(trk(S.sel)[n]) }), set: v => { trk(S.sel)[n] = v; } })),
  boss: null,
  duel: [
    { l: 'sound', color: cc(0), get: () => ({ v: S.drumSel / 15, t: E.KIT[S.drumSel] }), set: v => { S.drumSel = Math.round(v * 15); } },
    sel('div', () => S.duelDiv, ['1/8', '1/16', '1/32'], cc(1), i => { S.duelDiv = i; }),
    swingK, stepsK],
  recready: [
    { l: 'mode', color: cc(0), get: () => ({ v: .5, t: 'tempo' }), set: () => {} },
    { l: 'length', color: cc(1), get: () => ({ v: barsOpts.indexOf(S.rec.bars) / 2, t: S.rec.bars + ' bars' }), set: v => { S.rec.bars = barsOpts[Math.round(v * 2)]; } },
    sel('start', () => S.rec.startInstant, ['note', 'now'], cc(2), i => { S.rec.startInstant = i; })],
  count: [
    { l: 'length', color: cc(0), get: () => ({ v: barsOpts.indexOf(S.rec.bars) / 2, t: S.rec.bars + ' bars' }), set: v => { S.rec.bars = barsOpts[Math.round(v * 2)]; } },
    { l: 'tempo', color: cc(1), get: () => ({ v: (S.bpm - 60) / 140, t: S.bpm }), set: v => E.setBpm(60 + v * 140) },
    sel('click', () => S.click, ['off', 'on'], cc(2), i => { S.click = i; })],
  steps: [
    { l: 'sound', color: cc(0), get: () => ({ v: S.drumSel / 15, t: E.KIT[S.drumSel] }), set: v => { S.drumSel = Math.round(v * 15); } },
    { l: 'step', color: cc(1), get: () => ({ v: S.drumCur / 31, t: S.drumCur + 1 }), set: v => { S.drumCur = Math.round(v * (Math.min(32, trk(3).steps) - 1)); } },
    { l: 'hit', color: cc(2), get: () => { const on = S.drum[S.drumSel][S.drumCur]; return { v: on ? S.dvel[S.drumSel][S.drumCur] : 0, t: on ? pct(S.dvel[S.drumSel][S.drumCur]) : '--' }; }, set: v => { if (S.drum[S.drumSel][S.drumCur]) S.dvel[S.drumSel][S.drumCur] = Math.max(.05, v); } },
    { l: 'level', color: cc(3), get: () => ({ v: S.dlev[S.drumSel], t: pct(S.dlev[S.drumSel]) }), set: v => { S.dlev[S.drumSel] = v; } }],
  kit: [
    { l: 'kit', color: cc(0), get: () => ({ v: S.kitSel / 11, t: E.KITS[S.kitSel] }), set: v => { S.kitSel = Math.round(v * 11); } },
    { l: 'level', color: cc(1), get: () => ({ v: trk(3).level, t: pct(trk(3).level) }), set: v => { trk(3).level = v; E.applyMix(); } },
    { l: 'reverb', color: cc(2), get: () => ({ v: S.kitRev, t: pct(S.kitRev) }), set: v => { S.kitRev = v; E.applyMix(); } },
    panK2(3)],
  punch: [
    { l: 'filter', color: cc(0), get: () => ({ v: S.pfilt, t: S.pfilt < .05 ? 'off' : S.pfilt < .5 ? 'lp' : 'hp' }), set: v => { S.pfilt = v; E.applyPunchFilter(); } },
    { l: 'dust', color: cc(1), get: () => ({ v: S.dust, t: pct(S.dust) }), set: v => { S.dust = v; } },
    { l: 'duck', color: cc(2), get: () => ({ v: S.duck, t: pct(S.duck) }), set: v => { S.duck = v; } }],
  key: [
    sel('chord', () => S.chordMode, ['off', 'on'], cc(0), i => { S.chordMode = i; }),
    sel('scale', () => S.scale, E.SCALE_NAMES, cc(1), i => { S.scale = i; }),
    sel('keys', () => S.keyLock, ['off', 'lock'], cc(2), i => { S.keyLock = i; }),
    { l: 'transp', color: cc(3), get: () => ({ v: (S.transp + 12) / 24, t: S.transp }), set: v => { S.transp = Math.round(v * 24) - 12; } }],
  mix: [0, 1, 2, 3].map(i => ({ l: String(i + 1), color: cc(i), get: () => ({ v: trk(i).level, t: pct(trk(i).level) }), set: v => { trk(i).level = v; E.applyMix(); } })),
  erase: [
    { l: 'shift', color: cc(0), get: () => ({ v: .5, t: '< >' }), set: () => {} },
    stepsK2()],
  fx: ['dst', 'cho', 'dly', 'rev'].map((n, i) => ({ l: n.toUpperCase(), color: cc(i), get: () => ({ v: S.fx[n], t: pct(S.fx[n]) + '%' }), set: v => { S.fx[n] = v; E.applyFx(); } })),
  menu: [{ l: 'value', color: cc(0), get: () => ({ v: 0, t: '' }), set: () => {} }],
};
function panK2(i) { return { l: 'pan', color: cc(3), get: () => ({ v: trk(i).pan, t: pct(trk(i).pan - .5) }), set: v => { trk(i).pan = v; E.applyMix(); } }; }
function stepsK2() { return { l: 'length', color: cc(1), get: () => ({ v: trk(S.sel).steps / 64, t: trk(S.sel).steps }), set: v => { trk(S.sel).steps = clamp(Math.round(v * 16) * 4, 4, 64); } }; }
KN.boss = KN.party;
const knobVals = scr => (KN[scr] || []).map(k => Object.assign({ l: k.l, color: k.color }, k.get()));
// knob drag/wheel: absolute-ish delta in 0..1 applied to the current value (continuous or snapped by set)
function knobTurn(scr, i, delta) {
  if (scr === 'steps' && i === 1) { /* cursor moves in whole steps */ }
  if (scr === 'menu' && i === 0) { menuTurn(delta > 0 ? 1 : -1); return; }
  if (scr === 'erase' && i === 0) { if (Math.abs(delta) > 0) { E.rotate(S.sel, delta > 0 ? 1 : -1); } return; }
  const k = (KN[scr] || [])[i]; if (!k) return;
  const cur = k.get().v; k.set(clamp(cur + delta, 0, 1)); E.dirty();
}
function knobTurnStep(scr, i, dir) {
  // discrete knobs: one notch = one option; continuous: 1/40
  const k = (KN[scr] || [])[i]; if (!k) return;
  const step = 1 / 40; knobTurn(scr, i, dir * step);
}
function menuTurn(dir) {
  const d = E.MENU_DEFS[S.menu.cur]; if (!d[1]) return;
  const v = S.menu.vals[d[0]] || 0; S.menu.vals[d[0]] = clamp(v + dir, 0, d[1].length - 1); E.applyAll(); E.dirty();
}

// ---------------------------------------------------------------- screens
const SC = {};

SC.title = () => ({ full: true, bar: '', scene: null, hud: `
  <div class="tbg"></div><div class="tgrad"></div>
  <img class="tlogo" src="assets/logo-340.png" alt="FM1 Quest">
  <div class="tbot">${panel(`${tri()}<span>press play</span>`, 'padding:5px 11px;display:flex;align-items:center;gap:5px')}</div>` });

SC.party = v => ({
  bar: `${bpmBox()}${posBox(v)}<div class="fl"></div>${title('Party')}`,
  scene: { key: 'party', h: 72 },
  hud: `<div class="rows">` + [0, 1, 2, 3].map(i => {
    const t = trk(i), ps = E.patString(i), p = S.playing ? Math.floor(v.step) : -1, cur = p >= 0 ? ((p % t.steps) + t.steps) % t.steps : -1;
    const dead = t.mute || (S.solo >= 0 && S.solo !== i);
    const pips = Array.from({ length: Math.min(16, t.steps) }, (_, k) => {
      const idx = k + S.page * 16, on = ps[idx] === '1', isCur = idx === cur;
      return `<div class="pip" style="background:${isCur ? C.text : on ? (dead ? C.dim : cc(i)) : (k % 4 === 0 ? C.offHi : C.off)}"></div>`;
    }).join('');
    return `<div class="trow${S.sel === i ? ' sel' : ''}">${portrait(t.cls, S.sel === i ? C.hi : cc(i), dead ? 'opacity:.45' : '')}
      <div class="tm"><div class="tn"><span style="color:${C.dim}">${i + 1}</span><span style="color:${S.sel === i ? C.text : C.dim}">${t.name}</span><span style="color:${cc(i)}">${t.mute ? 'rest' : S.solo === i ? 'duel' : t.cls}</span></div><div class="pips16">${pips}</div></div>
      <div class="hp"><span style="color:${C.dim}">hp ${pct(t.level)}</span><div class="hpb"><div style="width:${pct(t.level)}%;background:${cc(i)}"></div></div></div></div>`;
  }).join('') + '</div>' + knobsHTML(knobVals('party')) });

SC.equip = v => {
  const t = trk(S.sel), isDrum = S.sel === 3, items = isDrum ? E.KITS.map((n, i) => [n, i % 2 ? 'square' : 'noise']) : E.PRESETS.map(p => [p[0], p[1]]);
  const cur = isDrum ? S.kitSel : t.preset;
  const grid = items.map((k, i) => `<div class="slot" style="background:${i === cur ? C.hi : C.pad};color:${i === cur ? C.hiText : C.text}"><canvas data-icon="${k[1]}" data-col="${i === cur ? C.hiText : cc(i)}" width="12" height="12"></canvas><span>${k[0]}</span></div>`).join('');
  const info = isDrum ? [E.KITS[S.kitSel], 'drum kit / ' + (S.kitSel < 6 ? 'electronic' : 'acoustic')] : [E.PRESETS[t.preset][0] === '303' ? 'Acid 303' : cap(E.PRESETS[t.preset][0]), E.PRESETS[t.preset][2]];
  const classNames = { mage: 'MAGE', archer: 'ARCHER', cleric: 'CLERIC', warrior: 'WARRIOR' };
  return { bar: `${title('Equip')}<span>${S.sel + 1} ${t.name}</span><div class="fl"></div><span style="color:${C.dim}">No. ${cur + 1}/${items.length}</span>`,
    scene: null,
    hud: `<div class="eqwrap"><div class="eqtop">
      ${panel(`<div class="eqp">${[0, 1, 2, 3].map(i => portrait(trk(i).cls, i === S.sel ? C.hi : C.padC)).join('')}</div><div class="eqslot"></div><div class="eqlv"><span>${classNames[t.cls]}</span><span style="color:${C.pdim}">lv ${pct(t.level)}</span></div>`, 'width:86px;padding:4px 3px;display:flex;flex-direction:column;gap:3px;align-items:center;flex:none')}
      <div class="eqr"><div class="slots">${grid}</div>
        ${panel(`${title(info[0])}<span style="color:${C.pdim}">${info[1]}</span><div style="display:flex;gap:8px"><span>oct+: equip</span><span style="color:${C.pdim}">oct-: back</span></div>`, 'padding:4px 5px;display:flex;flex-direction:column;gap:2px;line-height:1')}</div></div>
      ${knobsHTML(knobVals('equip'))}</div>` };
};

SC.boss = v => {
  const r = S.rec, cmds = [['FIGHT', 'play'], ['SPELL', 'punch'], ['ITEM', 'kit'], ['RUN', 'stop']].map((m, i) => `<div class="chip${i === 0 ? ' on' : ''}"><span>${m[0]}</span></div>`).join('');
  const p = pos(v), pips = [0, 1, 2, 3].map(i => `<u style="background:${i < Math.min(4, r.bar + 1) ? C.rec : C.off}"></u>`).join('');
  return { bar: `${bpmBox()}<div class="posb">${tri()}<span>${r.bar + 1}.${p.bt + 1}</span><div class="pips">${pips}</div></div><div class="fl"></div><span style="color:${C.rec}">rec</span>`,
    scene: { key: 'boss', h: 128 },
    ov: `<div class="bossn">${title('King Slime', C.text)}<div class="bossb"><div style="width:${pct(r.hp)}%;background:${C.rec}"></div></div></div>`,
    hud: `<div class="bhud" style="gap:5px"><div class="chips">${cmds}</div>${knobsHTML(knobVals('boss'))}</div>` };
};

SC.duel = v => {
  const i = S.solo >= 0 ? S.solo : S.sel, t = trk(i), ps = E.patString(i), p = S.playing ? Math.floor(v.step) : -1;
  const cur = p >= 0 ? ((p % t.steps) + t.steps) % t.steps : -1, pages = Math.ceil(t.steps / 16), pg = cur >= 0 ? Math.floor(cur / 16) : S.page;
  const cells = Array.from({ length: 16 }, (_, k) => { const idx = k + pg * 16, on = ps[idx] === '1'; return `<div class="dcell" style="background:${idx === cur ? C.text : on ? cc(3) : (k % 4 === 0 ? C.offHi : C.off)}"></div>`; }).join('');
  return { bar: `${title('Duel')}<span style="color:${C.dim}">solo ${i + 1}</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
    scene: { key: 'solo', h: 110 },
    ov: `<div class="combo"><span>combo</span><b style="color:${C.hi}">x${S.combo | 0}</b></div>`,
    hud: `<div class="dhud"><div class="dhead"><span style="color:${C.dim}">${i + 1}</span><span>${t.name}</span><span style="color:${cc(i)}">${t.cls}</span><div class="fl"></div><span style="color:${C.dim}">page ${pg + 1}/${pages}</span></div>
      <div class="dsteps">${cells}</div>${knobsHTML(knobVals('duel'))}</div>` };
};

function trackList(rec, showFill) {
  return `<div class="tl">` + [0, 1, 2, 3].map(i => {
    const t = trk(i), ps = E.patString(i);
    const cells = Array.from({ length: 16 }, (_, k) => `<div style="flex:1;height:4px;background:${showFill && ps[k] === '1' ? cc(i) : C.off}"></div>`).join('');
    return `<div class="tlr" style="border-color:${i === S.rec.target ? C.rec : 'transparent'}"><div style="width:6px;height:6px;flex:none;background:${cc(i)}"></div><span style="width:59px;flex:none;white-space:nowrap;color:${i === S.rec.target ? C.text : C.dim}">${t.name}</span><div style="display:flex;gap:1px;flex:1">${cells}</div></div>`;
  }).join('') + '</div>';
}
SC.recready = v => ({ bar: `${bpmBox()}<div class="posb"><i class="sq" style="background:${C.dim}"></i><span style="color:${C.dim}">loop</span></div><div class="fl"></div><span style="color:${C.rec}">rec ready</span>`,
  scene: { key: 'rec', h: 84 },
  hud: `<div class="hh">${panel(`<span style="color:${C.rec}">A wild LOOP appears!</span><div style="display:flex;gap:9px"><span>play a note: fight</span><span style="color:${C.pdim}">rec: flee</span></div>`, 'padding:3px 5px;display:flex;flex-direction:column;gap:2px')}
    ${trackList(true, true)}${knobsHTML(knobVals('recready'))}</div>` });
SC.count = v => { const n = clamp(-Math.floor(v.beat), 1, 4);
  return { bar: `${bpmBox()}<div class="posb"><i class="sq" style="background:${C.dim}"></i><span style="color:${C.dim}">loop</span></div><div class="fl"></div><span style="color:${C.rec}">count-in</span>`,
    scene: { key: 'count', h: 84 },
    ov: `<div class="bign"><span>${n}</span></div>`,
    hud: `<div class="hh">${panel(`<span style="color:${C.rec}">Battle in one bar!</span><div style="display:flex;gap:9px"><span>4 clicks</span><span style="color:${C.pdim}">rec: cancel</span></div>`, 'padding:3px 5px;display:flex;flex-direction:column;gap:2px')}
      ${trackList(true, false)}${knobsHTML(knobVals('count'))}</div>` }; };

SC.steps = v => {
  const base = S.drumSel >= 8 ? 8 : 0, L = Math.min(16, trk(3).steps), p = S.playing ? Math.floor(v.step) : -1, cur = p >= 0 ? ((p % trk(3).steps) + trk(3).steps) % trk(3).steps : -1, col = cur >= 0 ? cur - S.page * 16 : -1;
  let g = '';
  for (let r = 0; r < 8; r++) { const s = base + r; g += `<div class="grow${s === S.drumSel ? ' gs' : ''}">`;
    for (let c = 0; c < 16; c++) { const idx = c + S.page * 16, on = S.drum[s][idx], isCur = s === S.drumSel && idx === S.drumCur, ph = c === col;
      g += `<div class="gc" style="background:${isCur ? C.rec : on ? (ph ? C.hi : cc(3)) : ph ? C.offHi : (c % 4 === 0 ? C.offHi : C.off)};${isCur && !on ? `background:transparent;box-shadow:inset 0 0 0 1px ${C.rec}` : ''}${idx >= trk(3).steps ? 'opacity:.25' : ''}"></div>`; }
    g += '</div>'; }
  return { bar: `${title('Dungeon')}<span style="color:${C.dim}">drum grid</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
    scene: { key: 'steps', h: 84 },
    hud: `<div class="hh"><div class="grid">${g}</div><div class="gl"><span style="color:${C.dim}">${E.KIT[base]}-${E.KIT[base + 7]}</span><span style="color:${cc(3)}">${E.KIT[S.drumSel]}</span><span style="color:${C.dim}">page ${S.page + 1}</span></div>${knobsHTML(knobVals('steps'))}</div>` };
};

SC.kit = v => ({ bar: `${title('Kit')}<span style="color:${C.dim}">chest</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
  scene: { key: 'kit', h: 84 },
  hud: `<div class="hh"><div class="pads">${E.KIT.map((l, i) => pad(l, i === S.drumSel ? C.hi : C.pad, i === S.drumSel ? C.hiText : C.text, null, C.padC, 17)).join('')}</div>${knobsHTML(knobVals('kit'))}</div>` });

SC.punch = v => ({ bar: `${title('Spells')}<span style="color:${C.dim}">punch fx</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
  scene: { key: 'punch', h: 84 },
  hud: `<div class="hh"><div class="pads">${E.PUNCH.map((l, i) => pad(l, i === S.punch ? C.hi : C.pad, i === S.punch ? C.hiText : C.text, cc(Math.floor(i / 4)), C.padC, 17)).join('')}</div>${knobsHTML(knobVals('punch'))}</div>` });

const KEYPCS = [5, 7, 9, 11, 0, 2, 4, 5, 7, 9, 11, 0, 2, 4, 5, 7], KEYL = ['F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
SC.key = v => ({ bar: `${title('Biome')}<span style="color:${C.dim}">${E.NOTE_NAMES[S.keyRoot]} ${E.SCALE_NAMES[S.scale]}</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
  scene: { key: 'key', h: 84 },
  hud: `<div class="hh"><div class="pads">${KEYL.map((l, i) => { const on = KEYPCS[i] === S.keyRoot; return pad(l, on ? cc(1) : C.pad, on ? C.hiText : C.text, null, C.padC, 15); }).join('')}</div>
    <div class="legend">${[['maj', 'forest'], ['min', 'cave'], ['dor', 'coast'], ['phr', 'ruins']].map((b, i) => `<div style="border:1px solid ${i === S.scale ? cc(1) : 'transparent'};color:${i === S.scale ? cc(1) : C.dim}"><span>${b[0]}</span> <span>${b[1]}</span></div>`).join('')}</div>${knobsHTML(knobVals('key'))}</div>` });

SC.mix = v => {
  const rest = [0, 1, 2, 3].map(i => pad('rest ' + (i + 1), trk(i).mute ? cc(i) : C.pad, trk(i).mute ? C.hiText : C.dim, null, C.padC, 17));
  const duel = [0, 1, 2, 3].map(i => pad('duel ' + (i + 1), S.solo === i ? C.hi : C.pad, S.solo === i ? C.hiText : C.dim, cc(i), C.padC, 17));
  const bl = pad('', 'transparent', C.dim, null, 'transparent', 17), tap = pad('tap', 'transparent', C.dim, null, 'transparent', 17), bpm = pad(S.bpm, C.offHi, C.text, null, C.padC, 17);
  return { bar: `${title('Camp')}<span style="color:${C.dim}">mix</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
    scene: { key: 'mix', h: 84 },
    hud: `<div class="hh"><div class="pads">${rest.join('')}${duel.join('')}${bl}${bl}${tap}${bpm}</div>${knobsHTML(knobVals('mix'))}</div>` };
};

SC.erase = v => {
  const base = S.sel === 3, has = i => S.drum[i].some(Boolean);
  return { bar: `${title('Banish')}<span style="color:${C.dim}">erase</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
    scene: { key: 'erase', h: 84 },
    hud: `<div class="hh"><div class="pads">${E.KIT.map((l, i) => pad(l, i === S.drumSel ? C.rec : C.pad, i === S.drumSel ? C.hiText : (has(i) ? C.text : C.dim), has(i) ? C.rec : C.padC, C.padC, 17)).join('')}</div>${knobsHTML(knobVals('erase'))}</div>` };
};

SC.fx = v => {
  const FXV = [['DST', 'drive', '', 'dst'], ['CHO', 'chorus', '', 'cho'], ['DLY', 'delay', '', 'dly'], ['REV', 'reverb', '', 'rev']];
  const kv = knobVals('fx');
  return { bar: `${title('FX')}<span style="color:${C.dim}">sends</span><div class="fl"></div>${S.playing ? tri() : ''}<span>${S.bpm}</span>`,
    scene: { key: 'fx', h: 84 },
    hud: `<div class="fxg">${FXV.map((f, i) => { const n = Math.round(S.fx[f[3]] * 10);
      return `<div class="fxc"><span style="color:${cc(i)}">${f[0]}</span><span style="color:${C.dim}">${f[1]}</span><canvas data-knob="${kv[i].v}" data-col="${cc(i)}" data-dir="1c" width="20" height="20"></canvas><span>${kv[i].t}</span><span style="color:${cc(i)}">${f[2]}</span>
      <div class="seg">${Array.from({ length: 10 }, (_, j) => `<div style="background:${j >= 10 - n ? cc(i) : C.off}"></div>`).join('')}</div></div>`; }).join('')}</div>
      <div class="fxf"><span>FX SENDS</span><div class="fl"></div><span style="color:${C.dim}">fx 1/4</span></div>` };
};

SC.menu = v => ({ bar: `${title('Menu')}<span style="color:${C.dim}">the party rests</span>`,
  scene: { key: 'menu', h: 60 },
  hud: `<div class="hh">${panel(E.MENU_DEFS.map((m, i) => { const cur = i === S.menu.cur, val = m[1] ? m[1][S.menu.vals[m[0]] || 0] : '';
    return `<div class="mrow" data-menu="${i}"><i class="tri sm" style="border-left-color:${cur ? C.text : 'transparent'}"></i><span>${m[0]}</span><span style="color:${cur ? C.text : C.pdim}">${val}</span></div>`; }).join(''), 'padding:3px 5px;display:flex;flex-direction:column')}
    <div class="hint" style="color:${C.dim}"><div><span>presets: move</span><span>knob 1: set</span></div><div><span>oct+: ok</span><span>oct-: back</span></div></div></div>` });

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
G.Screens = { SC, KN, knobVals, knobTurn, knobTurnStep, menuTurn, C, KEYPCS };
})(window);
