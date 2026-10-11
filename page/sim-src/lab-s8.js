// FM1 Quest lab — system screens (round 4): Help scrolls, Pads remap, Character sheet.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, { add, UI, TAU, clamp, lerp, fr, hs } = T, INP = T.INP;
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, '0')).join(''); };
const outE = u => 1 - Math.pow(1 - clamp(u, 0, 1), 4);                       // expo-ish ease-out (fast start, soft end)

// ------------------------------------------------------------------ Help · Pergaminhos
const HELP = [
  ['Buttons', ['TAP opens the screen of', 'that button. TAP again for', 'its next page.', '', 'HOLD + KEY = layer.', 'Let go and you are back.']],
  ['Knobs', ['The four coloured knobs', 'always match the four', 'coloured labels.', '', 'SEL = a second row of', 'knobs (1/2 · 2/2).']],
  ['Navigation', ['MASTER  volume', 'SELECT  page / list', 'PRESETS sound of the hero', 'ALGORITHM  which hero', '', 'These four never remap.']],
  ['Keys & LEDs', ['Dim LED = note in scale.', 'Bright LED = the root.', 'Ripples show where you', 'played.', '', 'Change it in the LED menu.']],
  ['REC & Loops', ['REC arms the loop.', 'First note: count-in.', 'REC again closes the loop', 'and the boss appears.', '', 'HOLD REC to clear a hero.']],
  ['Quest', ['One hero per track.', 'Play more, they hit harder.', 'The loop is the fight:', 'the boss loses HP as the', 'loop goes round.', '']],
];
add({ name: 'Help · Pergaminhos', tag: 'ajuda em páginas que deslizam', tier: 'sys', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'turn:PRESETS = SYSTEM → Help · press:OCT+', 'turn:KNOB 1 = desliza as páginas'],
  fields: [{ l: 'page', d: 'desliza os pergaminhos. Ao soltar o knob, a página mais próxima se centraliza sozinha.', v: 0, fmt: v => (Math.round(v * (HELP.length - 1)) + 1) + '/' + HELP.length }],
  desc: 'A ajuda do aparelho: cada pergaminho é um quadro de texto curto. O knob 1 arrasta o conjunto de lado; quando você solta, o pergaminho mais próximo vem para o centro com uma curva rápida no começo e macia no fim. Quadros que saem encolhem e escurecem; o que entra cresce.',
  bullets: ['Só o texto muda: tela estática entre movimentos (custo de SPI só enquanto desliza)', 'Texto em inglês (como os rótulos dos knobs); as páginas podem ser traduzidas junto com o menu', 'O ponto embaixo mostra em qual página você está'],
  draw(g, t, k, st, tl) {
    const N = HELP.length, raw = k[0] * (N - 1);
    if (st.last === undefined) { st.last = k[0]; st.p = raw; st.tc = -9; }
    if (k[0] !== st.last) { st.last = k[0]; st.tc = t; }
    const held = t - st.tc < .5;
    if (held) st.p += (raw - st.p) * .5; else { const tgt = Math.round(raw); st.p += (tgt - st.p) * .22; if (Math.abs(tgt - st.p) < .004) { st.p = tgt; if (Math.abs(k[0] * (N - 1) - tgt) > .001) { k[0] = tgt / (N - 1); st.last = k[0]; if (tl && tl.upd) tl.upd(); } } }
    g.clear(0); g.R(0, 19, 240, 178, '#1d1520'); for (let i = 0; i < 12; i++) g.R(((i * 53 + 11) % 240), 22 + (i * 37) % 160, 1, 1, 5);
    g.c.save(); g.c.beginPath(); g.c.rect(0, 20, 240, 176); g.c.clip();
    const order = HELP.map((_, i) => i).sort((a, b) => Math.abs(b - st.p) - Math.abs(a - st.p));
    order.forEach(i => {
      const d = i - st.p, a = Math.abs(d); if (a > 1.6) return;
      const w = Math.round(lerp(190, 150, clamp(a, 0, 1))), h = Math.round(lerp(150, 112, clamp(a, 0, 1))), cx = 120 + d * 196, x = Math.round(cx - w / 2), y = Math.round(104 - h / 2 + Math.sin(t * 2 + i) * (a < .1 ? 1 : 0));
      g.panel(x, y, w, h); const dim = a > .5;
      if (dim) { g.c.fillStyle = 'rgba(30,20,24,.55)'; g.c.fillRect(x, y, w, h); }
      if (a < 1.05) { const tc = dim ? UI.dim : UI.hi; g.txt(HELP[i][0], x + w / 2, y + 8, tc, { f: 't', sz: 16, al: 'c' }); g.R(x + 14, y + 26, w - 28, 1, UI.ln);
        HELP[i][1].forEach((s, r) => { if (s) g.txt(s, x + 14, y + 33 + r * 12, dim ? UI.dim : UI.tx, { sz: 10, nofit: true }); }); }
    });
    g.c.restore();
    for (let i = 0; i < N; i++) { const on = Math.round(st.p) === i; g.R(120 - N * 5 + i * 10 - 2, 187, on ? 6 : 4, on ? 6 : 4, on ? UI.hi : UI.ln); }
    g.txt('◂', 8, 92, UI.dim, { sz: 14 }); g.txt('▸', 226, 92, UI.dim, { sz: 14 });
    g.bar('Help', 'scrolls', (Math.round(st.p) + 1) + '/' + N);
    g.dials(['page', '', '', ''], [(Math.round(st.p) + 1) + '/' + N, '', '', ''], [raw / (N - 1), 0, 0, 0]);
  } });

// ------------------------------------------------------------------ Pads · Remap
const ACT = [['NOTE', 'plays the note of the key'], ['MUTE 1', 'mute / unmute hero 1'], ['MUTE 2', 'mute / unmute hero 2'], ['MUTE 3', 'mute / unmute hero 3'], ['MUTE 4', 'mute / unmute hero 4'], ['SOLO', 'solo the selected hero'], ['TAP TEMPO', 'tap to set the bpm'], ['SPELL', 'a punch FX while held'], ['SECTION A', 'jump to section A'], ['SECTION B', 'jump to section B'], ['TRANSPOSE +', 'up one semitone'], ['TRANSPOSE −', 'down one semitone'], ['UNDO', 'undo the last edit'], ['HALF LOOP', 'loop only the first half']];
const KL = 'FGABCDEFGABCDEFG';
const PROT = [['MASTER', 6, 6], ['SELECT', 22, 6], ['PRESETS', 6, 22], ['ALGO', 22, 22], ['FX', 42, 8], ['HOME', 42, 20], ['SEL', 58, 8], ['SAVE', 58, 20], ['PLAY', 74, 8], ['REC', 74, 20]];
const PS = { map: Array(16).fill(0), combo: Array(16).fill(''), midi: Array(16).fill(-1) }; try { const sv = JSON.parse(localStorage.getItem('fm1lab.pads') || 'null'); if (sv) Object.assign(PS, sv); } catch (e) {}
G.PADS = { ACT, PS, save() { try { localStorage.setItem('fm1lab.pads', JSON.stringify(PS)); } catch (e) {} } };
const learn = { note: -1, t: -9 }; INP.subs.push(ev => { if (ev.type === 'note') { learn.note = ev.note; learn.t = performance.now(); } });
add({ name: 'Pads · Remap', tag: 'escolha o que cada tecla faz', tier: 'sys', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'turn:PRESETS = SYSTEM → Pads · press:OCT+', 'turn:KNOB 1–4 = PAD · ACTION · MODE · LEARN'],
  fields: [{ l: 'pad', d: 'qual das 16 teclas brancas você está editando.', v: 0, fmt: v => (1 + Math.round(v * 15)) }, { l: 'action', d: 'o que a tecla passa a fazer (NOTE = padrão do aparelho).', v: 0, fmt: v => ACT[Math.round(v * (ACT.length - 1))][0] }, { l: 'mode', d: 'TAP: um toque. COMBO: segure um botão e aperte a tecla; o aparelho grava a combinação.', v: 0, fmt: v => v > .5 ? 'COMBO' : 'TAP' }, { l: 'learn', d: 'ligado: toque uma nota no teclado MIDI externo e ela passa a acionar esta tecla.', v: 0, fmt: v => v > .5 ? 'ON' : 'OFF' }],
  desc: 'Tela no estilo "remapear controle": escolha uma tecla, escolha a ação e pronto. Os botões de navegação (MASTER, SELECT, PRESETS, ALGORITHM, FX, HOME, SEL, PLAY/STOP, REC, SAVE) aparecem com cadeado: nunca podem ser trocados, assim ninguém fica preso fora do menu. No modo COMBO a tela pede o gesto (segure um botão e aperte a tecla) e grava; no MIDI LEARN, a próxima nota do teclado externo vira esta tecla.',
  bullets: ['EDIT e GLO ainda sem decisão: aparecem com "?"', 'Salvar no projeto ou no aparelho: a decidir (cabe em poucos bytes)', 'No Simulador, segure um botão e aperte a tecla no modo COMBO para ver a captura'],
  draw(g, t, k, st) {
    if (st.pad === undefined) { st.pad = -1; st.ai = -1; } st.map = PS.map; st.combo = PS.combo; st.midi = PS.midi;   // remap state is shared by every instance of this screen (and by the Simulador)
    const pad = Math.round(k[0] * 15), ai = Math.round(k[1] * (ACT.length - 1)), combo = k[2] > .5, lrn = k[3] > .5;
    if (pad !== st.pad) { st.pad = pad; st.ai = st.map[pad]; k[1] = st.ai / (ACT.length - 1); st.act = st.ai; }
    else if (ai !== st.act) { st.act = ai; st.map[pad] = ai; G.PADS.save(); }
    const SIM = G.SIM && G.SIM.sim; const chord = SIM && SIM.chord;
    if (combo && lrn && chord && chord.t > st.ct) { st.combo[pad] = chord.s; st.ct = chord.t; G.PADS.save(); } if (st.ct === undefined) st.ct = performance.now();
    if (!combo && lrn && learn.t > (st.lt || 0)) { st.midi[pad] = learn.note; st.lt = learn.t; G.PADS.save(); }
    g.clear(0); g.R(0, 19, 240, 178, '#1d1520');
    // action card
    g.panel(8, 26, 130, 64); const a = ACT[st.map[pad]];
    g.txt('PAD ' + String(pad + 1).padStart(2, '0') + ' · ' + KL[pad], 16, 33, UI.dim, { sz: 10 });
    g.txt(a[0], 16, 45, UI.hi, { f: 't', sz: 16 }); g.txt(a[1], 16, 64, UI.tx, { sz: 10, mw: 116 });
    const sub = combo ? (st.combo[pad] ? 'combo: ' + st.combo[pad] : 'combo: —') : (st.midi[pad] >= 0 ? 'MIDI note ' + st.midi[pad] : 'tap');
    g.txt(sub, 16, 76, combo ? UI.t[2] : UI.dim, { sz: 9, mw: 116 });
    // protected controls (padlocked)
    g.panel(146, 26, 88, 64); g.txt('LOCKED', 190, 30, UI.dim, { sz: 9, al: 'c' });
    PROT.forEach(([n, px, py], i) => { const x = 152 + (i % 2) * 42, y = 40 + Math.floor(i / 2) * 9; g.txt(n, x, y, UI.tx, { sz: 8, nofit: true }); });
    g.txt('EDIT · GLO = ?', 190, 82, UI.dim, { sz: 8, al: 'c', nofit: true });
    // the 16 keys
    for (let i = 0; i < 16; i++) { const x = 8 + i * 14, on = i === pad, m = st.map[i], ch = st.combo[i] ? 'C' : st.midi[i] >= 0 ? 'M' : m ? ACT[m][0][0] : '·';
      g.R(x, 104, 13, 38, 0); g.R(x + 1, 105, 11, 36, on ? UI.hi : '#e8dfc8'); if (on) g.R(x - 1, 102 + Math.round(Math.sin(t * 8)), 15, 2, UI.rec);
      g.txt(KL[i], x + 6.5, 108, 0, { sz: 8, al: 'c', nofit: true }); g.txt(ch, x + 6.5, 126, m || st.combo[i] || st.midi[i] >= 0 ? UI.rec : '#8a8070', { sz: 10, al: 'c', nofit: true }); }
    g.txt('assignments: letter = action · C = combo · M = MIDI', 120, 148, UI.dim, { sz: 8, al: 'c', nofit: true });
    // learn strip
    const blink = Math.floor(t * 3) % 2;
    g.R(8, 162, 224, 28, lrn ? (blink ? '#4a1e1a' : '#34181a') : UI.off); g.R(8, 162, 224, 1, UI.ln);
    g.txt(lrn ? (combo ? 'PRESS the combo now: hold a button + a key' : 'MIDI LEARN: play a note on your keyboard') : 'learn off — turn KNOB 4', 120, 170, lrn ? UI.rec : UI.dim, { sz: 10, al: 'c', mw: 214 });
    g.txt(lrn && !combo && learn.note >= 0 ? 'last note: ' + learn.note : combo && chord ? 'last: ' + chord.s : '', 120, 180, UI.tx, { sz: 9, al: 'c', nofit: true });
    g.bar('Pads', 'remap', (pad + 1) + '/16');
    g.dials(['pad', 'action', 'mode', 'learn'], [pad + 1, a[0], combo ? 'COMBO' : 'TAP', lrn ? 'ON' : 'OFF'], [k[0], k[1], k[2], k[3]]);
  } });

// ------------------------------------------------------------------ Character view
const BASE = ['#c8503c', '#e08a3a', '#d8b43a', '#7ab04e', '#3f9a7a', '#3a8ac0', '#4a62c0', '#7a56c0', '#b4509a', '#d86a8a', '#8a8a96', '#c8b090'];
const NAMES = ['Mira', 'Tobin', 'Ysolde', 'Bram', 'Kestrel', 'Odile', 'Fenn', 'Lark', 'Rook', 'Sable', 'Wren', 'Corvin', 'Ilsa', 'Dax', 'Pim', 'Thessaly'];
const PERS = [['Steady', 'on the beat', .5, [3, 3, 2, 2]], ['Eager', 'a hair ahead', .8, [4, 3, 1, 2]], ['Lazy', 'lays back', .25, [2, 2, 4, 3]], ['Wild', 'loose swing', .6, [3, 4, 2, 4]], ['Precise', 'snaps to grid', .5, [2, 4, 4, 1]], ['Dreamy', 'long releases', .35, [1, 2, 5, 3]]];
const ITEMS = [['potion', 'Potion'], ['scroll', 'Scroll'], ['sword', 'Blade'], ['shield', 'Shield'], ['flute', 'Flute'], ['drum', 'Drum'], ['gem', 'Gem'], ['mush', 'Cap']];
const SEED = [[0, 2, 3, 5], [2, 0, 4, 6], [1, 4, 7, 0], [5, 6, 2, 7], [3, 1, 6, 4], [4, 7, 1, 6]];
function icon(g, ty, x, y) {
  switch (ty) {
    case 'potion': g.R(x + 3, y, 4, 3, 4); g.R(x + 2, y + 3, 6, 6, 8); g.R(x + 3, y + 5, 4, 3, 10); break;
    case 'scroll': g.R(x, y + 1, 10, 7, 11); g.R(x - 1, y, 2, 9, 4); g.R(x + 9, y, 2, 9, 4); g.R(x + 2, y + 3, 6, 1, 5); g.R(x + 2, y + 5, 5, 1, 5); break;
    case 'sword': g.line(x + 1, y + 9, x + 8, y + 1, 7); g.R(x, y + 7, 4, 2, 4); g.R(x + 8, y, 2, 2, 10); break;
    case 'shield': g.poly([[x + 1, y], [x + 9, y], [x + 8, y + 6], [x + 5, y + 10], [x + 2, y + 6]], 6); g.R(x + 4, y + 1, 2, 8, 10); break;
    case 'flute': g.R(x, y + 4, 10, 2, 4); for (let i = 0; i < 4; i++) g.px(x + 2 + i * 2, y + 4, 0); break;
    case 'drum': g.R(x + 1, y + 3, 8, 6, 6); g.R(x + 1, y + 2, 8, 2, 11); g.R(x + 1, y + 8, 8, 1, 4); break;
    case 'gem': g.poly([[x + 5, y], [x + 9, y + 3], [x + 5, y + 9], [x + 1, y + 3]], 12); g.R(x + 4, y + 2, 1, 3, 7); break;
    default: g.R(x + 1, y + 1, 8, 4, 8); g.px(x + 3, y + 2, 7); g.px(x + 6, y + 3, 7); g.R(x + 4, y + 5, 2, 4, 11);
  }
}
function face(g, x, y, f, t) {
  // 14×12 grid at 2 px per cell (head 28×24): skin, hair, eyes and mouth picked by `f` (0..7)
  const R = (cx, cy, w, h, c) => g.R(x + cx * 2, y + cy * 2, w * 2, h * 2, c);
  const hair = [4, 1, 9, 12, 10, 4, 6, 3][f], hs2 = f % 4, eyes = (f * 3) % 4, mouth = f % 3, sk = 15, blink = Math.floor(t * .7) % 5 === 0 && fr(t * .7) < .1;
  R(-1, -1, 16, 14, 0); R(0, 0, 14, 12, sk);
  if (hs2 === 0) { R(-1, -3, 16, 5, hair); R(-1, 0, 3, 7, hair); R(12, 0, 3, 5, hair); }
  else if (hs2 === 1) { R(-1, -3, 16, 4, hair); for (let i = 0; i < 5; i++) R(i * 3 - 1, -6 + (i & 1) * 2, 2, 4, hair); }
  else if (hs2 === 2) { R(-1, -3, 16, 4, hair); R(-2, 0, 4, 13, hair); R(12, 0, 4, 13, hair); }
  else { R(-1, -3, 16, 4, hair); R(4, -7, 6, 4, hair); R(6, -9, 2, 2, 0); }
  const ey = 5; if (blink) { R(2, ey + 1, 3, 1, 0); R(9, ey + 1, 3, 1, 0); }
  else if (eyes === 0) { R(3, ey, 2, 3, 0); R(9, ey, 2, 3, 0); } else if (eyes === 1) { R(2, ey, 3, 3, 0); R(9, ey, 3, 3, 0); R(2, ey, 1, 1, 7); R(9, ey, 1, 1, 7); } else if (eyes === 2) { R(2, ey + 1, 3, 1, 0); R(9, ey + 1, 3, 1, 0); } else { R(3, ey, 1, 3, 0); R(10, ey, 1, 3, 0); R(2, ey - 1, 1, 1, 0); R(11, ey - 1, 1, 1, 0); }
  if (mouth === 0) { R(5, 9, 4, 1, 14); R(4, 8, 1, 1, 14); R(9, 8, 1, 1, 14); } else if (mouth === 1) R(5, 9, 4, 1, 14); else R(6, 9, 2, 2, 14);
  R(1, 7, 2, 1, 10); R(11, 7, 2, 1, 10);
}
// six-sided die icon: `face` 1..6 drawn with pips
function dieIcon(g, x, y, face, shake) {
  const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
  const ox = shake ? Math.round((hs(face * 3.1 + x) - .5) * 3) : 0, oy = shake ? Math.round((hs(face * 7.7) - .5) * 3) : 0; x += ox; y += oy;
  g.R(x - 1, y - 1, 17, 17, 0); g.R(x, y, 15, 15, 15); g.R(x, y + 13, 15, 2, 11); g.R(x + 13, y, 2, 15, 11); g.R(x, y, 15, 1, 12);
  (PIPS[face] || PIPS[6]).forEach(([px, py]) => { g.R(x + 3 + px * 4, y + 3 + py * 4, 3, 3, 0); });
}
add({ name: 'Character view', tag: 'ficha editável do herói', tier: 'sys', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:SELECT = TAVERN → Status → editar', 'turn:KNOB 1–4 = COLOR · FACE · NAME · TRAIT'],
  fields: [{ l: 'color', d: 'cor-base do corpo (12 opções). As outras duas tonalidades saem dela sozinhas.', v: .45, fmt: v => 1 + Math.round(v * 11) }, { l: 'face', d: 'corpo e cabelo: 4 masculinos e 4 femininos.', v: .15, fmt: v => 1 + Math.round(v * 7) }, { l: 'name', d: 'escolhe um nome da lista. Toque no nome ou no dado para sortear.', v: .2, fmt: v => NAMES[Math.round(v * 15)] }, { l: 'trait', d: 'personalidade: muda o inventário inicial e o jeito de tocar do herói.', v: 0, fmt: v => PERS[Math.round(v * 5)][0] }],
  desc: 'A ficha de um herói: rosto, nome, cores e inventário. A cor tem 3 tons: o 1º é do corpo, o 2º (um pouco mais escuro) vai no braço e na perna do lado de cá, o 3º (o mais escuro) no braço e na perna do lado de lá, o que dá volume sem desenhar nada a mais. A personalidade define os itens iniciais e o "jeito de tocar" (adiantado, atrasado, na grade). A classe aparece só como etiqueta.',
  bullets: ['Cores: base · −1 (lado de cá) · −2 (lado de lá), tudo calculado, 12 cores-base', 'Inventário pré-preenchido pela personalidade; slots vazios tracejados', 'Troca de classe e de grupo: só se o firmware permitir; aqui é só etiqueta', 'Toque no nome ou no dado para sortear outro nome'],
  extra(tl) { tl.cv.addEventListener('pointerdown', e => { const r = tl.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 240, y = (e.clientY - r.top) / r.height * 240; if (x > 116 && x < 232 && y > 22 && y < 46) { tl.k[2] = Math.floor(Math.random() * 16) / 15; tl.upd(); tl.st.roll = G.GFX.nowT(); tl.st.face = 1 + Math.floor(Math.random() * 6); } }); },
  draw(g, t, k, st) {
    const ci = Math.round(k[0] * 11), fc = Math.round(k[1] * 7), ni = Math.round(k[2] * 15), pi = Math.round(k[3] * 5), P = PERS[pi];
    const base = BASE[ci], near = shade(base, .76), far = shade(base, .55), bob = Math.round(Math.sin(t * 3) * 1), lvl = 12;
    g.clear(0); g.R(0, 19, 240, 178, '#1d1520'); g.R(0, 150, 240, 47, '#2a1d22'); for (let x = 0; x < 240; x += 16) g.R(x, 150, 1, 47, '#241a1e');
    // portrait stage with a spot of light
    g.panel(8, 22, 100, 170); g.ell(58, 135, 26, 5, 0);
    // portrait: the articulated rig in its "body" look (rounded limbs, 3 tones), drawn at 2×
    g.c.imageSmoothingEnabled = false; const FACE = [{ sex: 'm', hair: 1 }, { sex: 'm', hair: 4 }, { sex: 'm', hair: 0 }, { sex: 'm', hair: 6 }, { sex: 'f', hair: 2 }, { sex: 'f', hair: 7 }, { sex: 'f', hair: 3 }, { sex: 'f', hair: 5 }][fc], cvp = G.RIG.render('idle', t * .8, 48, { tones: G.RIG.tonesOnly(base), style: 'body', hair: FACE.hair, sex: FACE.sex, dir: 1 }); g.c.drawImage(cvp, 10, 44 + bob, 96, 96);
    // name plate (tap = dice)
    g.panel(116, 22, 116, 24); g.txt(NAMES[ni], 124, 26, UI.hi, { f: 't', sz: 16, mw: 84 }); const rolling = st.roll !== undefined && t - st.roll < .55; dieIcon(g, 210, 27, rolling ? 1 + Math.floor(hs(Math.floor(t * 18)) * 6) : (st.face || 6), rolling);
    // stats
    const SC = ['STR', 'AGI', 'INT', 'LUK']; g.panel(116, 52, 116, 52);
    SC.forEach((n, i) => { const v = (P[3][i] + (hs(ci * 7 + i) > .5 ? 1 : 0)) / 6, y = 58 + i * 11; g.txt(n, 124, y, UI.dim, { sz: 9 }); g.R(150, y + 2, 70, 5, 0); g.R(151, y + 3, Math.round(68 * clamp(v, .1, 1)), 3, UI.t[i]); });
    // trait
    g.panel(116, 110, 116, 28); g.txt(P[0], 124, 114, UI.hi, { sz: 11 }); g.txt('lv ' + lvl, 224, 114, UI.tx, { sz: 10, al: 'r' }); g.txt('plays ' + P[1], 124, 126, UI.tx, { sz: 9 });
    // colour tones: base, −1, −2
    [[base, 'base'], [near, '−1'], [far, '−2']].forEach(([c, n], i) => { g.R(116 + i * 40, 144, 36, 12, 0); g.R(117 + i * 40, 145, 34, 10, c); g.txt(n, 134 + i * 40, 158, UI.dim, { sz: 8, al: 'c', nofit: true }); });
    // inventory: seeded by trait, two empty slots
    g.txt('PACK', 116, 170, UI.dim, { sz: 9 });
    for (let i = 0; i < 6; i++) { const x = 140 + i * 16, y = 166, has = i < 4; g.R(x, y, 14, 14, has ? 0 : UI.ln); g.R(x + 1, y + 1, 12, 12, has ? '#3a2e34' : '#1d1520'); if (has) { if (G.ITEMS) G.ITEMS.draw(g, G.ITEMS.SEEDS[P[0]][i], x + 1, y + 1); else icon(g, ITEMS[SEED[pi][i]][0], x + 2, y + 2); } }
    g.txt('class: ' + ['mage', 'archer', 'cleric', 'warrior'][ci % 4], 8, 183, UI.dim, { sz: 8, nofit: true });
    g.bar('Hero', 'character sheet', NAMES[ni]);
    g.dials(['color', 'face', 'name', 'trait'], [ci + 1, fc + 1, NAMES[ni], P[0]], [k[0], k[1], k[2], k[3]]);
  } });
G.CHAR = { icon, ITEMS, SEED, PERS, NAMES, BASE };
})(window);
