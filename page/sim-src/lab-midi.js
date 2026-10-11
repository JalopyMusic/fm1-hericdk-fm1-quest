// FM1 Quest lab — MIDI: the FM-1 over USB and any other MIDI keyboard / controller drive the simulator (keys, knobs, buttons).
// Panel (button "FM-1 USB" in the top bar): devices, channel, transpose, and a MIDI-learn table for every control. Everything is saved in this browser.
(function (G) {
'use strict';
const T = G.GFX, INP = T && T.INP, SIM = G.SIM; if (!INP || !SIM || !SIM.api) return;
const A = SIM.api, LS = 'fm1lab.midi', $ = (s, r) => (r || document).querySelector(s);
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], noteName = n => NAMES[n % 12] + (Math.floor(n / 12) - 1);
const KNOBS = [['master', 'MASTER'], ['select', 'SELECT'], ['presets', 'PRESETS'], ['algo', 'ALGORITHM'], ['k1', 'KNOB 1'], ['k2', 'KNOB 2'], ['k3', 'KNOB 3'], ['k4', 'KNOB 4']];
const BUTTONS = A.BTN.map(([id, lab]) => [id, lab]).concat([['octm', 'OCT −'], ['octp', 'OCT +']]);
const BLACKS = A.BLAB.map((l, i) => [i, l || '·']);
// defaults most controllers send out of the box (knobs 1–8 of Arturia/Novation/Akai are CC 21–28 or 70–77; CC7 volume; CC64 sustain pedal)
const DEF = { 'knob:master': [7], 'knob:k1': [21, 70], 'knob:k2': [22, 71], 'knob:k3': [23, 72], 'knob:k4': [24, 73], 'knob:algo': [25, 74], 'knob:presets': [26, 75], 'knob:select': [27, 76], 'btn:play': [64] };
let CFG = { ch: 0, tr: 0, rel: false, off: {}, map: {}, bk: {} };
try { Object.assign(CFG, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(CFG)); } catch (e) {} };
const M = { access: null, inputs: [], learning: null, last: '', cc: {}, acc: {}, down: new Set(), held: new Map(), prog: -1 };

// ---- sending things to the simulator -------------------------------------------------------------------------------------------------------
const WOFF = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26], BGAP = [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14];
function keyOf(note) {                                                                  // → { i, black } (learned pads first, then the F3–G5 row, repeating every 27 semitones)
  const P = G.PADS && G.PADS.PS, wi = P ? P.midi.indexOf(note) : -1; if (wi >= 0) return { i: wi, black: false };
  const bi = Object.keys(CFG.bk).find(k => CFG.bk[k] === note); if (bi != null) return { i: +bi, black: true };
  const semi = ((((note + CFG.tr) - 53) % 27) + 27) % 27, w = WOFF.indexOf(semi); if (w >= 0) return { i: w, black: false };
  const j = BGAP.findIndex(g => WOFF[g] + 1 === semi); return j >= 0 ? { i: j, black: true } : null;
}
const targetsFor = (kind, n) => { const out = []; Object.keys(CFG.map).forEach(t => { const b = CFG.map[t]; if (b.k === kind && b.n === n) out.push(t); }); Object.keys(DEF).forEach(t => { if (!CFG.map[t] && kind === 'cc' && DEF[t].includes(n)) out.push(t); }); return out; };
const vis = () => !!(A.host && A.host.offsetParent);
const turn = (id, d, n) => { for (let i = 0; i < n; i++) A.knobTurn(id, d); };
function noteOn(n, v, ch) {
  const ts = targetsFor('note', n).filter(t => t.startsWith('btn:'));
  if (ts.length) { if (!vis()) return; ts.forEach(t => { const id = t.slice(4); if (id === 'octm' || id === 'octp') A.btnDown(id); else A.btnDown(id); M.down.add(t); }); INP.fire({ type: 'note', note: n, vel: v, lane: ((n % 12) * 5 / 12) | 0, t: performance.now(), src: 'midi', ctl: true }); return; }
  const k = vis() && keyOf(n); if (k) { A.keyPress(k.i, k.black); M.held.set(n, k); }
  INP.fire({ type: 'note', note: n, vel: v, lane: ((n % 12) * 5 / 12) | 0, t: performance.now(), src: 'midi' });
}
function noteOff(n) {
  targetsFor('note', n).filter(t => t.startsWith('btn:')).forEach(t => { if (M.down.delete(t)) A.btnUp(t.slice(4)); });
  const k = M.held.get(n); if (k) { M.held.delete(n); A.keyRelease(k.i, k.black); } INP.held.delete(n); INP.fire({ type: 'noteoff', note: n, t: performance.now(), src: 'midi' });
}
function cc(n, v) {
  if (!vis()) return;
  targetsFor('cc', n).forEach(t => {
    const [kind, id] = t.split(':'), b = CFG.map[t] || {};
    if (kind === 'knob') {
      if (CFG.rel || b.rel) { const d = v < 64 ? v : v - 128; if (d) turn(id, d > 0 ? 1 : -1, Math.min(4, Math.abs(d))); return; }
      const key = n + ':' + id; if (M.cc[key] == null) { M.cc[key] = v; return; } M.acc[key] = (M.acc[key] || 0) + (v - M.cc[key]); M.cc[key] = v;
      while (Math.abs(M.acc[key]) >= 4) { turn(id, M.acc[key] > 0 ? 1 : -1, 1); M.acc[key] -= 4 * Math.sign(M.acc[key]); }
    } else if (kind === 'btn') { const on = v >= 64; if (on && !M.down.has(t)) { M.down.add(t); A.btnDown(id); } else if (!on && M.down.has(t)) { M.down.delete(t); A.btnUp(id); } }
  });
}
function program(p) { if (!vis()) return; if (M.prog >= 0 && p !== M.prog) A.knobTurn('presets', p > M.prog ? 1 : -1); M.prog = p; }

// ---- receiving ----------------------------------------------------------------------------------------------------------------------------
function onMsg(e, dev) {
  const [st, d1, d2] = e.data; if (st >= 248) return; const k = st & 240, ch = (st & 15) + 1; INP.log.unshift({ st, d1, d2, t: e.timeStamp }); INP.log.length = Math.min(INP.log.length, 12);
  M.last = (dev ? dev.name + ' · ' : '') + (k === 144 && d2 ? 'nota ' + noteName(d1) + ' vel ' + d2 : k === 128 || k === 144 ? 'solta ' + noteName(d1) : k === 176 ? 'CC ' + d1 + ' = ' + d2 : k === 192 ? 'programa ' + d1 : k === 224 ? 'pitch bend' : 'msg ' + st) + ' · canal ' + ch; paintLog();
  if (CFG.ch && ch !== CFG.ch) return;
  if (M.learning) { const t = M.learning.t, okNote = !t.startsWith('knob:'), okCC = t.startsWith('knob:') || t.startsWith('btn:'); if (k === 144 && d2 > 0 && okNote) { learned('note', d1, ch); return; } if (k === 176 && okCC) { learned('cc', d1, ch); return; } if ((k === 144 && d2 > 0) || k === 176) return; }
  if (k === 144 && d2 > 0) { INP.held.add(d1); noteOn(d1, d2, ch); } else if (k === 128 || (k === 144 && !d2)) noteOff(d1); else if (k === 176) cc(d1, d2); else if (k === 192) program(d1);
}
async function connect() {
  if (!navigator.requestMIDIAccess) { INP.name = 'Web MIDI indisponível (use Chrome ou Edge)'; return INP.name; }
  try { if (!M.access) { M.access = await navigator.requestMIDIAccess({ sysex: false }); M.access.onstatechange = () => { scan(); paint(); }; } scan(); return INP.name; } catch (e) { INP.name = 'acesso MIDI negado'; return INP.name; }
}
function scan() {
  const ins = [...M.access.inputs.values()]; M.inputs = ins; INP.midi = M.access;
  ins.forEach(i => { i.onmidimessage = CFG.off[i.id] ? null : (e => onMsg(e, i)); });
  INP.name = ins.length ? ins.filter(i => !CFG.off[i.id]).map(i => i.name).join(' + ') || 'todas as entradas desligadas' : 'nenhuma entrada MIDI encontrada';
  const o = $('#o-usb'); if (o) o.textContent = INP.name;
}
INP.connect = connect;

// ---- learn ---------------------------------------------------------------------------------------------------------------------------------
function learned(kind, n, ch) {
  const t = M.learning.t; M.learning = null;
  if (t.startsWith('wk:')) { const i = +t.slice(3); if (G.PADS) { G.PADS.PS.midi[i] = n; G.PADS.save(); } }
  else if (t.startsWith('bk:')) { CFG.bk[t.slice(3)] = n; }
  else CFG.map[t] = { k: kind, n, ch };
  save(); paint();
}
const bound = t => {
  if (t.startsWith('wk:')) { const P = G.PADS && G.PADS.PS, n = P ? P.midi[+t.slice(3)] : -1; return n >= 0 ? 'nota ' + noteName(n) : 'padrão'; }
  if (t.startsWith('bk:')) return CFG.bk[t.slice(3)] != null ? 'nota ' + noteName(CFG.bk[t.slice(3)]) : 'padrão';
  const b = CFG.map[t]; if (b) return (b.k === 'cc' ? 'CC ' : 'nota ') + (b.k === 'cc' ? b.n : noteName(b.n)); return DEF[t] ? 'CC ' + DEF[t].join(' / ') + ' (padrão)' : '—';
};
const clearT = t => { if (t.startsWith('wk:')) { if (G.PADS) { G.PADS.PS.midi[+t.slice(3)] = -1; G.PADS.save(); } } else if (t.startsWith('bk:')) delete CFG.bk[t.slice(3)]; else delete CFG.map[t]; save(); paint(); };

// ---- panel ---------------------------------------------------------------------------------------------------------------------------------
const css = document.createElement('style'); css.textContent = `#midi-back{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:30px 12px}
#midi-back.on{display:flex}#midi-panel{background:#1b191f;border:1px solid var(--line,#444);border-radius:10px;width:760px;max-width:100%;padding:14px 16px;color:var(--fg,#e8e0d0);box-shadow:0 20px 60px #000a}
#midi-panel h3{margin:0 0 4px;font-size:15px}#midi-panel h4{margin:14px 0 6px;font-size:12px;letter-spacing:.06em;color:var(--accent,#e0b84a);text-transform:uppercase}#midi-panel .sub{color:var(--dim,#998);font-size:12px;margin:0 0 8px}
#midi-panel .row{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:6px 0}#midi-panel label{font-size:12px;color:var(--dim,#998)}
#midi-panel .mon{font:12px ui-monospace,Menlo,monospace;background:#0f0e12;border:1px solid var(--line,#444);border-radius:6px;padding:6px 8px;min-height:18px;color:#e0b84a}
#midi-panel .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(222px,1fr));gap:6px}
#midi-panel .cell{display:flex;align-items:center;gap:6px;border:1px solid var(--line,#444);border-radius:6px;padding:4px 6px;font-size:12px}#midi-panel .cell b{min-width:76px;font-weight:600}#midi-panel .cell span{flex:1;color:var(--dim,#998);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#midi-panel .cell button{padding:2px 7px;font-size:11px}#midi-panel .cell.on{border-color:#e0503c;background:rgba(224,80,60,.12)}#midi-panel .x{float:right}`;
document.head.append(css);
const back = document.createElement('div'); back.id = 'midi-back'; back.innerHTML = '<div id="midi-panel"></div>'; document.body.append(back);
back.addEventListener('mousedown', e => { if (e.target === back) closePanel(); }); addEventListener('keydown', e => { if (e.key === 'Escape' && back.classList.contains('on')) { if (M.learning) { M.learning = null; paint(); } else closePanel(); } }, true);
function paintLog() { const m = $('#midi-mon'); if (m) m.textContent = M.last || 'toque uma tecla ou mexa um knob do seu teclado…'; }
function paint() {
  const p = $('#midi-panel'); if (!p || !back.classList.contains('on')) return;
  const cell = (t, label) => `<div class="cell ${M.learning && M.learning.t === t ? 'on' : ''}"><b>${label}</b><span>${M.learning && M.learning.t === t ? 'toque / mexa agora…' : bound(t)}</span><button data-l="${t}">aprender</button><button data-c="${t}" title="voltar ao padrão">×</button></div>`;
  p.innerHTML = `<button class="x" id="midi-x">fechar ✕</button><h3>MIDI · FM-1 e outros teclados</h3><p class="sub">${INP.name || 'não conectado'}. As teclas brancas e pretas tocam por nota (padrão: a fileira F3–G5 se repete a cada 27 semitons); knobs e botões você mapeia aqui — clique em "aprender" e mexa o controle do seu aparelho.</p>
  <div class="row"><button id="midi-con">${M.access ? 'procurar de novo' : 'conectar MIDI'}</button><label>canal <select id="midi-ch"><option value="0">todos</option>${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${CFG.ch === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label><label>transpor <input type="number" id="midi-tr" min="-48" max="48" value="${CFG.tr}" style="width:54px"> semitons</label><label><input type="checkbox" id="midi-rel" ${CFG.rel ? 'checked' : ''}> knobs relativos (encoders sem fim)</label></div>
  <div class="mon" id="midi-mon"></div>
  <h4>Aparelhos</h4><div class="row">${M.inputs.length ? M.inputs.map(i => `<label><input type="checkbox" data-d="${i.id}" ${CFG.off[i.id] ? '' : 'checked'}> ${i.name}${i.manufacturer ? ' · ' + i.manufacturer : ''} <small>(${i.state})</small></label>`).join('') : '<small class="sub">nenhum aparelho. Ligue o FM-1 por USB e clique em conectar (Chrome ou Edge).</small>'}</div>
  <h4>Knobs</h4><div class="grid">${KNOBS.map(([id, l]) => cell('knob:' + id, l)).join('')}</div>
  <h4>Botões</h4><div class="grid">${BUTTONS.map(([id, l]) => cell('btn:' + id, l)).join('')}</div>
  <h4>Teclas de baixo (as 16 brancas)</h4><div class="grid">${Array.from({ length: 16 }, (_, i) => cell('wk:' + i, 'tecla ' + (i + 1) + ' · ' + A.WK[i].toUpperCase())).join('')}</div>
  <h4>Teclas de cima (as 11 pretas)</h4><div class="grid">${BLACKS.map(([i, l]) => cell('bk:' + i, l + ' (' + (i + 1) + ')')).join('')}</div>`;
  paintLog();
  $('#midi-x', p).onclick = closePanel; $('#midi-con', p).onclick = async () => { await connect(); paint(); };
  $('#midi-ch', p).onchange = e => { CFG.ch = +e.target.value; save(); }; $('#midi-tr', p).oninput = e => { CFG.tr = +e.target.value || 0; save(); }; $('#midi-rel', p).onchange = e => { CFG.rel = e.target.checked; save(); };
  p.querySelectorAll('[data-d]').forEach(c => c.onchange = () => { CFG.off[c.dataset.d] = !c.checked; save(); if (M.access) scan(); });
  p.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { M.learning = M.learning && M.learning.t === b.dataset.l ? null : { t: b.dataset.l }; paint(); });
  p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => clearT(b.dataset.c));
}
function openPanel() { back.classList.add('on'); paint(); }
function closePanel() { back.classList.remove('on'); M.learning = null; }
const usb = $('#c-usb'); if (usb) usb.onclick = async () => { await connect(); openPanel(); };
G.MIDI = { connect, openPanel, closePanel, CFG, KNOBS, BUTTONS, noteName, state: M, _sim: { noteOn, noteOff, cc, program, onMsg } };
})(window);
