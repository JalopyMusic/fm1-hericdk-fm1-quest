// FM1 Quest lab — the two new hub screens, drawn from scratch in the new language (cinema band + castle palette + one gold frame):
//   · Taverna · Fitas — the band's tape deck: SELECT / KNOB 1 picks a tape, the tape shows its musician, level to unlock it and your XP
//   · LED Effects — turn SELECT to browse every key-light effect; the LED strip on the screen is the real LED state; KNOB 2-4 = strength, speed, fade-out
// Game data (tapes, XP) lives in lab-game.js (G.GAME); the screens only read it, so this file can load before the simulator.
(function (G) {
'use strict';
const T = G.GFX, { add, UI, clamp, lerp, fr, hs } = T;
G.FOOT = Object.assign(G.FOOT || {}, { 'Status': ['OCT− OCT+: HERÓI · SEL: GRUPO', 'HOME: JOGO · SEGURE: MENU'], 'Taverna · Fitas': ['SELECT: FITAS · OCT+: CONQUISTAS', 'HOME: JOGO'], 'LED Effects': ['SELECT: EFEITOS', 'HOME: JOGO'], 'Help · Pergaminhos': ['KNOB 1: PÁGINAS', 'HOME: JOGO'], 'Pads · Remap': ['KNOB 4: APRENDER MIDI', 'HOME: JOGO'], 'Achievements': ['OCT−: TAVERNA', 'HOME: JOGO'], 'Party · Grupo': ['KNOB 1: MOVE · SEL: PEGA / SOLTA', 'HOME: JOGO'] });
const wrap = (g, s, w, sz) => { const words = String(s).split(/\s+/), lines = []; let cur = ''; words.forEach(x => { if (g.tw((cur + ' ' + x).trim(), 'p', sz) > w && cur) { lines.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); }); if (cur) lines.push(cur); return lines; };

// ---- the cassette ---------------------------------------------------------------------------------------------------------------------------------
function cassette(g, x, y, tape, locked, t, playing, photo) {
  const body = locked ? '#4a4038' : '#7a6248', lab = locked ? '#8a8272' : '#d8cfae', ink = locked ? '#5a5248' : '#3a2a1c';
  g.R(x + 2, y, 92, 60, '#14101a'); g.R(x, y + 2, 96, 56, '#14101a'); g.R(x + 1, y + 1, 94, 58, body); g.R(x + 2, y + 2, 92, 1, '#a8905c'); g.R(x + 1, y + 58, 94, 1, '#3a2c1c');
  g.R(x + 6, y + 6, 84, 27, lab); g.R(x + 6, y + 31, 84, 2, '#b8ae8e');                                               // label
  if (photo) { g.c.save(); g.c.imageSmoothingEnabled = false; g.c.drawImage(photo, x + 8, y + 8, 23, 23); g.c.restore(); g.R(x + 8, y + 8, 23, 1, '#00000055'); }
  else { g.R(x + 8, y + 8, 23, 23, '#2a2230'); g.disc(x + 19.5, y + 17, 5, '#6a5a78'); g.ell(x + 19.5, y + 30, 9, 6, '#6a5a78'); g.R(x + 8, y + 8, 23, 23, '#00000033'); }
  g.R(x + 8, y + 8, 23, 1, '#e8e0c8'); g.R(x + 8, y + 30, 23, 1, '#6a5a78');
  const lines = wrap(g, tape.title, 54, 8); lines.slice(0, 2).forEach((l, i) => g.txt(l, x + 35, y + 9 + i * 9, ink, { sz: 8, nofit: true })); g.R(x + 35, y + 26, 52, 1, ink); g.txt(tape.genre, x + 35, y + 21 + (lines.length > 1 ? 0 : 0) + 6, ink, { sz: 8, nofit: true, mw: 52 });
  g.R(x + 20, y + 36, 56, 16, '#14101a'); g.R(x + 21, y + 37, 54, 14, locked ? '#2a2630' : '#3a3046');                   // window with the reels
  [[x + 34, y + 44], [x + 62, y + 44]].forEach(([cx, cy], k) => { g.disc(cx, cy, 6, '#cbbf9c'); g.disc(cx, cy, 5, '#14101a'); const a = (playing ? t * 5 : 0) + k * 1.1; for (let q = 0; q < 3; q++) g.line(cx, cy, cx + Math.cos(a + q * 2.094) * 5, cy + Math.sin(a + q * 2.094) * 5, '#cbbf9c'); g.disc(cx, cy, 1.5, '#cbbf9c'); });
  g.R(x + 24, y + 51, 48, 1, '#14101a'); g.poly([[x + 12, y + 58], [x + 16, y + 53], [x + 80, y + 53], [x + 84, y + 58]], '#14101a');
  if (locked) { g.c.fillStyle = 'rgba(10,8,16,.5)'; g.c.fillRect(x, y, 96, 60); g.R(x + 41, y + 28, 14, 11, '#d8b43a'); g.R(x + 43, y + 21, 2, 8, '#d8b43a'); g.R(x + 51, y + 21, 2, 8, '#d8b43a'); g.R(x + 43, y + 21, 10, 2, '#d8b43a'); g.R(x + 47, y + 32, 2, 4, '#3a2a1c'); }
}

add({ name: 'Taverna · Fitas', tag: 'o toca-fitas da banda: escolha a fita, ganhe XP, libere músicas', tier: 'sys', an: [240, 150],
  how: ['tap:HOME = volta para a Taverna', 'turn:SELECT = passa as fitas', 'turn:KNOB 1 = passa as fitas', 'turn:KNOB 2 = modo (história · tudo liberado)'],
  fields: [{ l: 'fita', d: 'qual fita está no toca-fitas. Também funciona com o knob SELECT.', v: 0, fmt: v => { const g = G.GAME; return g ? (Math.round(v * (g.TAPES.length - 1)) + 1) + '/' + g.TAPES.length : ''; } }, { l: 'modo', d: 'história: as fitas abrem conforme o seu nível. tudo: todas liberadas para testar.', v: 0, fmt: v => v > .5 ? 'tudo' : 'história' }],
  desc: 'A Taverna é o centro do jogo: o cenário da taverna ao fundo (o mesmo da abertura, com a paleta de poucas cores) e, na frente, o toca-fitas da banda. Cada fita é uma música com o rosto do músico; as fitas travadas mostram o nível necessário. Tocar, gravar loops e vencer chefes dá XP; o nível sobe e abre novas fitas e estilos.',
  bullets: ['SELECT ou o knob 1 passam as fitas; o knob 2 troca entre "história" (abre por XP) e "tudo" (para testar)', 'O rosto do músico vem de uma foto sua, pontilhada na paleta (painel "Fitas e XP" no Simulador)', 'O XP aparece numa barra: tocar +1, gravar um loop +25, ficar tocando +5 a cada 10 s'],
  draw(g, t, k, st, tl) {
    const gm = G.GAME; g.clear(0); if (!gm) { g.txt('carregando…', 120, 110, UI.dim, { al: 'c' }); return; }
    const N = gm.TAPES.length; if (st.last === undefined) { st.last = -1; st.k0 = k[0]; st.t0 = -9; }
    if (gm.pendingSel != null) { k[0] = gm.pendingSel / (N - 1); gm.pendingSel = null; if (tl && tl.upd) tl.upd(); }
    const idx = clamp(Math.round(k[0] * (N - 1)), 0, N - 1); if (idx !== st.last) { st.last = idx; st.slide = t; st.dir = idx > (st.prev == null ? idx : st.prev) ? 1 : -1; st.prev = idx; gm.sel = idx; }
    const all = k[1] > .5; if (gm.unlockAll !== all) { gm.unlockAll = all; gm.save(); }
    // the tavern behind (same art as the opening), refreshed ~15×/s
    const bg = st.bg || (st.bg = document.createElement('canvas')); if (t - st.t0 > .066 || t < st.t0) { bg.width = bg.height = 240; G.SCENES.render(bg, 'tavern', 5 + (t % 4) * .01, {}, { wire: false, band: true, nohud: true }); st.t0 = t; }
    g.c.drawImage(bg, 0, 0, 240, 160, 0, 19, 240, 160); g.R(0, 179, 240, 18, '#1e1418'); g.R(0, 179, 240, 1, '#5a3a28');
    g.c.fillStyle = 'rgba(14,10,16,.42)'; g.c.fillRect(0, 19, 240, 160);
    const tape = gm.TAPES[idx], locked = !gm.isUnlocked(tape), u = clamp((t - (st.slide || -9)) / .35, 0, 1), e = 1 - Math.pow(1 - u, 4), off = (1 - e) * 80 * (st.dir || 1);
    // the tape row: neighbours small and dim, the chosen one big
    [-2, -1, 1, 2].forEach(d => { const j = idx + d; if (j < 0 || j >= N) return; const tp = gm.TAPES[j], lk = !gm.isUnlocked(tp), cx = 120 + d * 62 - off * .4; g.c.save(); g.c.globalAlpha = .55; g.c.translate(cx, 94); g.c.scale(.45, .45); cassette(g, -48, -30, tp, lk, t, false, gm.photo(tp.id)); g.c.restore(); });
    g.c.save(); g.c.translate(off, 0); cassette(g, 72, 52, tape, locked, t, !locked && (G.Engine && G.Engine.S && G.Engine.S.playing), gm.photo(tape.id)); g.c.restore();
    g.txt('◂', 14, 78, idx > 0 ? UI.hi : UI.dim, { sz: 18 }); g.txt('▸', 218, 78, idx < N - 1 ? UI.hi : UI.dim, { sz: 18 });
    // text under the tape
    g.txt(tape.title, 120, 118, locked ? UI.dim : UI.hi, { f: 't', sz: 14, al: 'c', mw: 220 }); g.txt(locked ? 'trava até o nível ' + tape.lvl : tape.genre + ' · ' + tape.artist, 120, 134, locked ? '#c8963c' : UI.tx, { sz: 9, al: 'c', nofit: true, mw: 220 });
    for (let i = 0; i < N; i++) g.R(120 - N * 4 + i * 8, 150, i === idx ? 6 : 4, i === idx ? 6 : 4, i === idx ? UI.hi : gm.isUnlocked(gm.TAPES[i]) ? '#8a8070' : '#3a3030');
    // XP and level
    const lv = gm.level(), nx = gm.nextXP(), pr = gm.progress(); g.R(8, 181, 224, 4, '#00000099'); g.R(9, 182, Math.round(222 * pr), 2, '#e0b84a'); g.txt('NV ' + lv + ' · ' + (nx ? (gm.xp - gm.levelXP(lv)) + '/' + (nx - gm.levelXP(lv)) + ' XP' : gm.xp + ' XP'), 120, 164, UI.tx, { sz: 8, al: 'c', nofit: true });
    if (gm.lastGain && t - gm.lastGain.t < 2.2) { const a = 1 - (t - gm.lastGain.t) / 2.2; g.txt('+' + gm.lastGain.n + ' XP · ' + gm.lastGain.why, 120, 40 - (1 - a) * 6, '#f0c860', { sz: 10, al: 'c', nofit: true, ol: '#1e1418' }); }
    g.bar('Taverna', all ? 'tudo liberado' : 'modo história', 'NV ' + lv);
    g.dials(['fita', 'modo', '', ''], [(idx + 1) + '/' + N, all ? 'tudo' : 'história', '', ''], [k[0], k[1], 0, 0]);
  } });

// ---- LED lab --------------------------------------------------------------------------------------------------------------------------------------
add({ name: 'LED Effects', tag: 'teste os efeitos de luz das teclas: gire o knob e veja', tier: 'sys', an: [240, 150],
  how: ['turn:SELECT = passa os efeitos', 'turn:KNOB 1 = passa os efeitos', 'turn:KNOB 2 = força', 'turn:KNOB 3 = velocidade', 'turn:KNOB 4 = fade-out (quanto demora para apagar)'],
  fields: [{ l: 'efeito', d: 'qual efeito de luz está valendo agora (repouso ou ao tocar).', v: 0, fmt: v => { const L = G.LEDFX ? G.LEDFX.LIST() : []; return L.length ? (Math.round(v * (L.length - 1)) + 1) + '/' + L.length : ''; } }, { l: 'força', d: 'o brilho máximo do efeito.', v: 1, fmt: v => Math.round(v * 100) + '%' }, { l: 'veloc.', d: 'a velocidade da animação.', v: .4, fmt: v => (.25 + v * 2.75).toFixed(1) + '×' }, { l: 'fade-out', d: 'quanto tempo a luz leva para apagar (em vez de cortar de uma vez).', v: .24, fmt: v => (.1 + v * 2.4).toFixed(1) + ' s' }],
  desc: 'O laboratório de luz: a lista tem todos os efeitos das teclas, os de repouso (rodam sozinhos) e os de "ao tocar" (disparam quando você toca; aqui a tela dispara um toque sozinho a cada segundo para você ver). O efeito escolhido já vale no aparelho e no 3D. A tira de LEDs desta tela é o estado real das teclas.',
  bullets: ['Inclui efeitos inspirados no ROLI Piano M (palco, raiz e escala, cascata, pulso de conexão) e outros comuns em teclados com luz', 'A luz acende de uma vez e apaga suave: o fade-out é o knob 4', 'Girar um knob em qualquer tela desenha o valor como uma barra de luz nas teclas'],
  draw(g, t, k, st, tl) {
    const LF = G.LEDFX, A = G.SIM && G.SIM.api; g.clear(0); if (!LF || !A) return; const LIST = LF.LIST(), N = LIST.length;
    if (G.GAME && G.GAME.pendingLed != null) { k[0] = G.GAME.pendingLed / (N - 1); G.GAME.pendingLed = null; if (tl && tl.upd) tl.upd(); }
    const idx = clamp(Math.round(k[0] * (N - 1)), 0, N - 1), cur = LIST[idx]; if (st.last !== idx) { st.last = idx; LF.apply(cur); st.t0 = t; }
    LF.cfg.gain = clamp(k[1], .1, 1); LF.cfg.speed = .25 + k[2] * 2.75; LF.cfg.fade = .1 + k[3] * 2.4;
    const sim = G.SIM.sim, now = performance.now(); if (cur.kind === 'press' && (!st.rip || now - st.rip > 1100)) { st.rip = now; sim.rip.push({ x: 1 + Math.floor(Math.random() * 14), t: now, a: 1 }); }
    g.R(0, 19, 240, 178, '#1d1520'); for (let i = 0; i < 14; i++) g.R((i * 53 + 11) % 240, 24 + (i * 37) % 80, 1, 1, '#5a4a60');
    g.txt(cur.kind === 'idle' ? 'EM REPOUSO' : 'AO TOCAR', 120, 24, cur.kind === 'idle' ? '#7ab04e' : '#e08a3a', { f: 't', sz: 11, al: 'c', ls: 2, nofit: true });
    // the list as a wheel
    for (let d = -2; d <= 2; d++) { const j = idx + d; if (j < 0 || j >= N) continue; const y = 62 + d * 17, a = d === 0; g.txt(LIST[j].name, 120, y - (a ? 7 : 4), a ? UI.hi : d === -1 || d === 1 ? UI.tx : UI.dim, { f: a ? 't' : 'p', sz: a ? 16 : 9, al: 'c', nofit: true, mw: 200 }); }
    g.R(36, 53, 168, 1, UI.ln); g.R(36, 71, 168, 1, UI.ln); g.txt('◂', 10, 54, UI.dim, { sz: 14 }); g.txt('▸', 222, 54, UI.dim, { sz: 14 });
    wrap(g, cur.desc, 216, 8).slice(0, 3).forEach((l, i) => g.txt(l, 12, 108 + i * 10, UI.tx, { sz: 8, nofit: true }));
    // the real LEDs: black keys on top, white keys below
    const bx = j => 14 + (A.BGAPS ? A.BGAPS[j] : [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14][j]) * 13.4 + 10;
    for (let j = 0; j < 11; j++) { const L = A.leds['b' + j], v = L ? L.l : 0, a = clamp(v / 2, 0, 1); g.R(bx(j) - 6, 145, 13, 8, '#5a5068'); g.R(bx(j) - 5, 146, 11, 6, mixLed(a)); if (a > .6) { g.c.fillStyle = `rgba(255,190,60,${(a - .6) * .5})`; g.c.fillRect(bx(j) - 8, 143, 17, 12); } }
    for (let i = 0; i < 16; i++) { const L = A.leds['w' + i], v = L ? L.l : 0, a = clamp(v / 2, 0, 1); g.R(14 + i * 13.4 - 1, 160, 12, 16, '#5a5068'); g.R(14 + i * 13.4, 161, 10, 14, mixLed(a)); if (a > .6) { g.c.fillStyle = `rgba(255,190,60,${(a - .6) * .5})`; g.c.fillRect(14 + i * 13.4 - 3, 158, 16, 20); } }
    g.txt('as teclas de verdade', 120, 180, UI.dim, { sz: 8, al: 'c', nofit: true });
    g.bar('LED Effects', cur.kind === 'idle' ? 'repouso' : 'ao tocar', (idx + 1) + '/' + N);
    g.dials(['efeito', 'força', 'veloc.', 'fade-out'], [(idx + 1) + '/' + N, Math.round(k[1] * 100) + '%', (.25 + k[2] * 2.75).toFixed(1) + '×', (.1 + k[3] * 2.4).toFixed(1) + ' s'], [k[0], k[1], k[2], k[3]]);
  } });
function mixLed(a) { const c0 = [52, 46, 62], c1 = [140, 106, 42], c2 = [255, 215, 112], f = a < .5 ? [c0, c1, a * 2] : [c1, c2, (a - .5) * 2]; return '#' + f[0].map((v, i) => Math.round(v + (f[1][i] - v) * f[2]).toString(16).padStart(2, '0')).join(''); }

// ---- achievements ------------------------------------------------------------------------------------------------------------------------------------
add({ name: 'Achievements', tag: 'conquistas: por enquanto uma só (libera o Warrior)', tier: 'sys', an: [240, 150], how: ['tap:OCT+ (na Taverna) = abre as conquistas', 'tap:OCT− = volta para a Taverna'], fields: [], 
  desc: 'A lista de conquistas do jogo. Por enquanto existe uma: soltar 3 ULTs com remixagens diferentes libera o Warrior. Quando não houver mais nada a liberar, a tela avisa que novas conquistas virão.',
  bullets: ['A cada ULT solta com um loop diferente, o progresso sobe de 1/3 a 3/3', 'O aviso aparece no topo, 2 s depois do fim da animação da ULT, nunca durante ela'],
  draw(g, t, k, st) {
    const gm = G.GAME; g.clear(0); g.R(0, 19, 240, 168, '#1d1520'); if (!gm) return; const n = Math.min(3, gm.ultSigs), done = gm.warrior;
    g.panel(10, 28, 220, 78); g.txt(done ? 'LIBERADO' : 'EM ANDAMENTO', 120, 34, done ? '#7ab04e' : '#e0b84a', { f: 't', sz: 11, al: 'c', ls: 1, nofit: true });
    g.txt('Ultrapassar os limites', 120, 50, UI.hi, { f: 't', sz: 14, al: 'c', nofit: true, mw: 200 }); g.txt('Solte 3 ULTs com remixagens diferentes', 120, 68, UI.tx, { sz: 9, al: 'c', nofit: true, mw: 204 });
    for (let i = 0; i < 3; i++) { const x = 70 + i * 40, on = i < n; g.R(x, 80, 30, 14, '#00000099'); g.R(x + 1, 81, 28, 12, on ? '#e0b84a' : '#2a2230'); g.txt(on ? 'OK' : String(i + 1), x + 15, 83, on ? '#1e1418' : '#7a7080', { sz: 9, al: 'c', nofit: true }); }
    g.txt(n + '/3', 120, 98, UI.dim, { sz: 9, al: 'c', nofit: true });
    g.txt('Recompensa: o herói Warrior', 120, 118, UI.tx, { sz: 9, al: 'c', nofit: true });
    if (done) g.txt('Novas conquistas serão adicionadas em breve.', 120, 150, '#a89080', { sz: 9, al: 'c', nofit: true, mw: 220 });
    g.bar('Achievements', done ? '1 de 1' : n + '/3', ''); g.dials(['', '', '', ''], ['', '', '', ''], [0, 0, 0, 0]);
  } });
// ---- party: the 4 active heroes (one sound track each) + the bench ---------------------------------------------------------------------------------
const PINFO = { mago: ['Elf Wizard', 'ACID 303', '#3a8ac0'], arqueiro: ['Archer', 'DUB CHORD', '#7ab04e'], clerigo: ['Cleric', 'ATMOS PAD', '#d8b43a'], guerreiro: ['Knight', 'TECHNO', '#e08a3a'], warrior: ['Warrior', 'BERSERK', '#b83a2a'] };
const faceCache = {};
const CLSHEAD = { mago: 'WIZARD', arqueiro: 'ARCHER', clerigo: 'CLERIC', guerreiro: 'KNIGHT', warrior: 'WARRIOR' };
function face(id) {   // the hero's face, 1 px = 1 px: the portrait for the 4 classes, the pixel puppet's head for the Warrior
  if (faceCache[id]) return faceCache[id];
  const ART = G.PORTRAITS && G.PORTRAITS.useArt && G.PORTRAITS.cardPic && ['mago', 'clerigo', 'guerreiro', 'warrior'].includes(id); if (ART && !G.PORTRAITS.cardPic(id)) return null;   // the author's portrait is still loading: not cached yet
  let c = null; if ((id !== 'warrior' || ART) && G.PORTRAITS && G.PORTRAITS.cv) c = G.PORTRAITS.cv(id, 1);
  if (!c && G.PIXHERO) { const s = G.PIXHERO.canvas(id, 'idle', 0, 48, null, 1); if (s) { c = document.createElement('canvas'); c.width = 30; c.height = 30; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#2a2230'; x.fillRect(0, 0, 30, 30); x.drawImage(s, 8, 4, 30, 30, 0, 0, 30, 30); } }
  if (c) faceCache[id] = c; return c;
}
G.PARTYFACE = face;
const CW = 36, CH = 104, CY = 48;
function card(g, id, x, y, o) {   // one vertical card: track number, face, name, class
  o = o || {}; const inf = PINFO[id], hi = o.hi, lift = o.lift || 0, sc = o.sc || 1, dim = o.dim || 0;
  g.c.save(); g.c.translate(x + CW / 2, y + CH / 2 - lift); g.c.scale(sc, sc); g.c.translate(-CW / 2, -CH / 2); const X = 0, Y = 0;
  if (lift) { g.c.fillStyle = 'rgba(0,0,0,.35)'; g.c.fillRect(X + 3, Y + CH + 3 + lift, CW - 4, 3); }
  g.R(X - 1, Y - 1, CW + 2, CH + 2, hi ? '#f0c860' : '#14101a'); g.R(X, Y, CW, CH, '#2a2230'); g.R(X + 1, Y + 1, CW - 2, CH - 2, '#1d1520'); g.R(X + 1, Y + 1, CW - 2, 3, inf[2]);
  if (hi) { g.R(X - 2, Y - 2, CW + 4, 1, '#f0c86088'); g.R(X - 2, Y + CH + 1, CW + 4, 1, '#f0c86088'); }
  const pic = G.PORTRAITS && G.PORTRAITS.cardPic && G.PORTRAITS.useArt ? G.PORTRAITS.cardPic(id, true) : null;      // (the author's portraits are off for now: the cards show the same pixel heroes as everywhere)
  if (pic) {   // the author's portrait: class name in the header band, the picture under it, the synth below
    g.R(X + 1, Y + 1, CW - 2, 11, '#3a3a3e'); g.txt(CLSHEAD[id] || inf[0], X + CW / 2, Y + 3, '#ffffff', { sz: 7, al: 'c', nofit: true, mw: CW - 2 });
    g.c.save(); g.c.imageSmoothingEnabled = false; g.c.drawImage(pic, X + 2, Y + 13); g.c.restore(); g.R(X + 1, Y + 12, CW - 2, 1, '#14101a');
    inf[1].split(' ').forEach((w, i, a) => g.txt(w, X + CW / 2, Y + (a.length > 1 ? 79 : 83) + i * 8, inf[2], { sz: 7, al: 'c', nofit: true, mw: CW - 4 }));
    if (dim) { g.c.fillStyle = 'rgba(14,10,16,' + dim + ')'; g.c.fillRect(X - 1, Y - 1, CW + 2, CH + 2); }
    g.c.restore(); return;
  }
  const f = face(id); g.R(X + 3, Y + 8, CW - 6, CW - 6, '#14101a'); g.R(X + 4, Y + 9, CW - 8, CW - 8, inf[2] + '55');
  if (f) { g.c.save(); g.c.imageSmoothingEnabled = false; g.c.drawImage(f, 0, 0, f.width, f.height, X + 4, Y + 9, CW - 8, CW - 8); g.c.restore(); } else g.txt(id[0].toUpperCase(), X + CW / 2, Y + 18, inf[2], { f: 't', sz: 14, al: 'c', nofit: true });
  g.R(X + 4, Y + 9 + CW - 8, CW - 8, 1, inf[2]);
  inf[0].split(' ').forEach((w, i, a) => g.txt(w, X + CW / 2, Y + (a.length > 1 ? 41 : 46) + i * 9, '#f2e2c4', { sz: w.length > 6 ? 7 : 8, al: 'c', nofit: true, mw: CW - 2 })); g.R(X + 6, Y + 60, CW - 12, 1, '#4a3a52');
  inf[1].split(' ').forEach((w, i, a) => g.txt(w, X + CW / 2, Y + (a.length > 1 ? 64 : 68) + i * 8, inf[2], { sz: 7, al: 'c', nofit: true, mw: CW - 4 }));
  if (dim) { g.c.fillStyle = 'rgba(14,10,16,' + dim + ')'; g.c.fillRect(X - 1, Y - 1, CW + 2, CH + 2); }
  g.c.restore();
}
function hand(g, x, y, t) {   // a small floating pixel hand, pointing down
  const b = Math.round(Math.sin(t * 5) * 1.5); y += b; const S = '#f0c8a0', O = '#1c1210';
  [[2, 0, 6, 8], [1, 3, 8, 6], [0, 5, 10, 3]].forEach(([a, c, w, h]) => { g.R(x + a - 1, y + c - 1, w + 2, h + 2, O); }); [[2, 0, 6, 8], [1, 3, 8, 6], [0, 5, 10, 3]].forEach(([a, c, w, h]) => g.R(x + a, y + c, w, h, S));
  g.R(x + 5, y + 1, 1, 6, '#c8987a'); g.R(x + 2, y + 6, 1, 3, '#c8987a'); g.R(x + 8, y + 6, 1, 3, '#c8987a'); g.R(x + 1, y + 10, 8, 2, '#3a6ab0'); g.R(x, y + 9, 10, 1, '#1c1210');
}
function swapIcon(g, cx, cy, t) {   // refresh ⟳: two arrows chasing each other
  const a = t * 4; g.c.save(); g.c.translate(cx, cy);
  for (let q = 0; q < 2; q++) { for (let i = 0; i < 9; i++) { const th = a + q * Math.PI + i * .22; g.R(Math.round(Math.cos(th) * 5) - 1, Math.round(Math.sin(th) * 5) - 1, 2, 2, i > 6 ? '#fff6d8' : '#e0b84a'); } const th = a + q * Math.PI + 9 * .22; const hx = Math.round(Math.cos(th) * 5), hy = Math.round(Math.sin(th) * 5); g.R(hx - 1, hy - 1, 3, 3, '#fff6d8'); }
  g.c.restore();
}
function star4(g, cx, cy, t) {   // a stretched 4-pointed star: long vertical points, short horizontal ones
  const p = 1 + Math.sin(t * 2) * .12, v = Math.round(11 * p), h = Math.round(5 * p);
  g.c.fillStyle = '#f0c860'; g.c.beginPath(); g.c.moveTo(cx, cy - v); g.c.lineTo(cx + 2, cy - 2); g.c.lineTo(cx + h, cy); g.c.lineTo(cx + 2, cy + 2); g.c.lineTo(cx, cy + v); g.c.lineTo(cx - 2, cy + 2); g.c.lineTo(cx - h, cy); g.c.lineTo(cx - 2, cy - 2); g.c.closePath(); g.c.fill();
  g.R(cx - 1, cy - 1, 2, 2, '#fffbe8'); g.c.fillStyle = 'rgba(240,200,96,.18)'; g.c.fillRect(cx - 1, cy - 22, 2, 44);
}
add({ name: 'Party · Grupo', tag: 'o grupo: só 4 heróis ficam ativos, um por faixa de som', tier: 'sys', an: [240, 150],
  how: ['turn:KNOB 1 = passa de carta em carta', 'tap:SEL = pega a carta (mãozinha); SEL de novo = solta e troca com a carta sob o cursor', 'tap:SEL na tela Status = abre aqui com aquele herói já pego', 'tap:HOME = volta para o jogo'],
  fields: [{ l: 'carta', d: 'qual carta está marcada. SEL pega a carta; gire e solte em outra para trocar.', v: 0, fmt: v => { const g = G.GAME; return g ? (Math.round(v * (g.plist().length - 1)) + 1) + '/' + g.plist().length : ''; } }],
  desc: 'Só 4 heróis podem estar ativos ao mesmo tempo, cada um é uma faixa de som. As 4 cartas verticais à esquerda são o grupo; depois da linha com a estrela fica o banco (o Warrior, depois que ele é liberado). Gire o knob 1 para marcar uma carta, aperte SEL para pegá-la (aparece uma mãozinha acima e o ícone de trocar embaixo), gire até a outra e aperte SEL de novo: as duas trocam de lugar, uma passando por trás da outra.',
  bullets: ['O sistema abre junto com o Warrior (conquista "Ultrapassar os limites"); antes disso, as cartas aparecem só para ver', 'Dá para chegar aqui pelo menu da Taverna ou apertando SEL na tela Status de um herói (ele já vem pego)', 'A troca vale para a luta, o Status e as faixas de som: quem está nas 4 vagas é quem toca'],
  draw(g, t, k, st, tl) {
    const gm = G.GAME; g.clear(0); g.R(0, 19, 240, 168, '#16111c'); if (!gm) return; for (let i = 0; i < 16; i++) g.R((i * 61 + 7) % 240, 22 + (i * 29) % 150, 1, 1, '#4a3a58');
    const u = gm.pui, un = gm.partyUnlocked(), L = gm.plist(), M = L.length, ci = clamp(Math.round(k[0] * (M - 1)), 0, M - 1), X0 = 6, GAP = 40, BX = 184, an = u.anim, now = performance.now();
    const slotX = i => i < 4 ? X0 + i * GAP : BX + (i - 4) * GAP;
    // tracks header and the divider with the star
    g.txt('GRUPO ATIVO · 4 FAIXAS', X0 + 2, 22, '#a89080', { sz: 7, nofit: true }); g.txt(un ? 'BANCO' : 'TRAVADO', BX + 2, 22, un ? '#a89080' : '#c8963c', { sz: 7, nofit: true });
    g.R(171, CY - 6, 1, CH + 12, '#e0b84a55'); star4(g, 171, CY + CH / 2, t);
    const pos = {}; L.forEach((id, i) => { pos[i] = { x: slotX(i), y: CY, sc: 1, lift: 0, dim: 0 }; });
    // the swap: card A goes in front to B's slot, card B goes behind to A's slot (3D: scale and shade swap with depth)
    let order = L.map((_, i) => i), z = {};
    if (an) { const e0 = clamp((now - an.t0) / 600, 0, 1), e = 1 - Math.pow(1 - e0, 3), a = pos[an.from], b = pos[an.to], xa = slotX(an.from), xb = slotX(an.to), s = Math.sin(e * Math.PI);
      a.x = xa + (xb - xa) * e; a.sc = 1 + .22 * s; a.lift = 16 * s; a.dim = 0; z[an.from] = 2;
      b.x = xb + (xa - xb) * e; b.sc = 1 - .2 * s; b.lift = -6 * s; b.dim = .55 * s; z[an.to] = 0; }
    order.sort((p, q) => (z[p] == null ? 1 : z[p]) - (z[q] == null ? 1 : z[q]));
    const carrying = u.mode === 'carry' && !an;
    order.forEach(i => { const P = pos[i], id = L[i], isC = carrying && i === u.from, isCur = !an && i === ci; if (isC) { P.lift = 6 + Math.sin(t * 5) * 1.5; P.sc = 1.04; } else if (carrying && isCur) P.dim = 0; else if (carrying) P.dim = .25;
      card(g, id, P.x, P.y, { hi: isCur || isC, lift: P.lift, sc: P.sc, dim: P.dim, track: i < 4 ? i + 1 : 0 }); });
    const lo = an ? Math.min(an.from, an.to) : 9, hi2 = an ? Math.max(an.from, an.to) : -1;
    for (let i = 0; i < 4; i++) { if (i >= lo && i <= hi2) continue; const bx = slotX(i) + CW / 2; g.R(bx - 6, CY + CH - 15, 12, 11, '#14101a'); g.txt(String(i + 1), bx, CY + CH - 14, '#e0b84a', { sz: 8, al: 'c', nofit: true }); }   // the track numbers belong to the SLOTS, not to the cards
    if (carrying) { const i = u.from, P = pos[i]; hand(g, P.x + CW / 2 - 5, CY - 19 - P.lift, t); swapIcon(g, P.x + CW / 2, CY + CH + 11, t); if (ci !== i && !(ci >= 4 && i >= 4)) { const cx = slotX(ci) + CW / 2; swapIcon(g, cx, CY + CH + 11, -t); } }
    else if (!an && un) g.R(slotX(ci) + 2, CY + CH + 5, CW - 4, 1, '#f0c860');
    if (!un) { const x = BX; g.R(x - 1, CY - 1, CW + 2, CH + 2, '#14101a'); g.R(x, CY, CW, CH, '#2a2230'); g.R(x + 1, CY + 1, CW - 2, CH - 2, '#1d1520'); g.R(x + CW / 2 - 7, CY + 36, 14, 11, '#d8b43a'); g.R(x + CW / 2 - 5, CY + 29, 2, 8, '#d8b43a'); g.R(x + CW / 2 + 3, CY + 29, 2, 8, '#d8b43a'); g.R(x + CW / 2 - 5, CY + 29, 10, 2, '#d8b43a'); g.R(x + CW / 2 - 1, CY + 40, 2, 4, '#3a2a1c'); g.txt('Warrior', x + CW / 2, CY + 58, '#7a7080', { sz: 8, al: 'c', nofit: true }); g.txt('em breve', x + CW / 2, CY + 70, '#7a7080', { sz: 7, al: 'c', nofit: true }); }
    // message line
    const msg = !un ? 'Libere o Warrior para trocar de herói' : an ? 'trocando…' : carrying ? 'gire e aperte SEL na carta que vai trocar' : 'SEL pega a carta · gire para marcar';
    g.txt(msg, 120, 175, !un ? '#c8963c' : carrying ? '#f0c860' : '#a89080', { sz: 8, al: 'c', nofit: true, mw: 232 });
    const nm = PINFO[L[ci]] ? PINFO[L[ci]][0] : '';
    g.bar('Party', un ? '4 ativos · SEL troca' : 'em breve', nm); g.dials(['carta', '', '', ''], [(ci + 1) + '/' + M, '', '', ''], [k[0], 0, 0, 0]);
  } });
})(window);
