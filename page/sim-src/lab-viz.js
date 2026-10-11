// FM1 Quest lab — the VISUALIZER (hold PLAY): six pages, SELECT / KNOB 1 change page, the screen stays until HOME is pressed (a background to leave on).
//   1 Sky (the night lake)   2 Tides (four coloured waves, one per hero)   3 Ring (a circular wave)   4 Canyon (mirrored bars)   5 Scope (the classic horizontal oscilloscope + bars)   6 Campfire (the four heroes around a fire that grows and shakes with the music)
// There is no audio analyser in the engine, so the "sound" is each track's pattern played at the real step (the same rhythm you hear); with nothing playing the room keeps its calm 108 bpm.
(function (G) {
'use strict';
const T = G.GFX; if (!T) return; const { add, UI, clamp, lerp, hs, fr } = T, Sc = G.Scene, fig = Sc && Sc.fig, HC = ['#5a8ad0', '#7ab04e', '#f0c860', '#e0803a'], CLS = ['mage', 'archer', 'cleric', 'warrior'];
const NAMES = ['Sky', 'Tides', 'Ring', 'Canyon', 'Scope', 'Campfire'];
function levels(t, st) {                                                  // 4 track envelopes (0..1) + the beat phase, from the real patterns and the real step
  const E = G.Engine, S = E && E.S, v = E && E.visual ? E.visual() : null, step = v && v.playing ? v.step : t * 7.2, idx = Math.floor(step), since = step - idx, out = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    let pat = '1010101010101010'; if (E) { if (i < 3) pat = E.patString(i).padEnd(16, '0'); else { pat = ''; for (let k = 0; k < 16; k++) pat += S.drum[0][k] || S.drum[2][k] || S.drum[4][k] ? '1' : '0'; } }
    let e = 0; for (let d = 0; d < 4; d++) { const k = (((idx - d) % 16) + 16) % 16; if (pat[k] === '1') e = Math.max(e, Math.exp(-(d + since) * 1.05)); } if (S && S.tracks[i].mute) e = 0;
    st.e = st.e || [0, 0, 0, 0]; st.e[i] = Math.max(e, st.e[i] * .86); out[i] = st.e[i];
  }
  return { e: out, beat: 1 - clamp(since, 0, 1), step };
}
function skyMode(g, t, st, k, tl) { const d = G.GFX.REG.find(x => x.name === 'Spectrum Sky'); st.sky = st.sky || {}; d.draw(g, t, [1, .5, .6], st.sky, tl); }
function tides(g, t, st, L) { g.clear('#0c1020'); g.sky(19, 197, [0, 0, 1, 1, 2]); for (let i = 0; i < 4; i++) { const y0 = 56 + i * 34, amp = 6 + L.e[i] * 22, col = HC[i]; for (let x = 0; x < 240; x += 2) { const y = y0 + Math.sin(x * .045 + t * (1.4 + i * .35) + i) * amp + Math.sin(x * .11 - t * 2) * amp * .25; g.R(x, y, 2, 2, col); g.R(x, y + 3, 2, 6, col + '66'); } g.txt(['MAGE', 'ARCHER', 'CLERIC', 'WARRIOR'][i], 6, y0 - 22, col, { sz: 8, nofit: true }); } }
function ring(g, t, st, L) { g.clear('#0c0a14'); const cx = 120, cy = 108; for (let i = 0; i < 4; i++) { const r0 = 18 + i * 14, amp = 3 + L.e[i] * 12; for (let a = 0; a < 120; a++) { const th = a / 120 * Math.PI * 2, r = r0 + Math.sin(th * (3 + i) + t * (1 + i * .4)) * amp; g.R(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 2, 2, HC[i]); } } g.disc(cx, cy, 6 + L.beat * 6, '#fff6d8'); g.disc(cx, cy, 3, '#f0c860'); }
function canyon(g, t, st, L) { g.clear('#0a0814'); g.R(0, 19, 240, 80, '#1a1230'); const N = 40; st.b = st.b || Array(N).fill(0); for (let i = 0; i < N; i++) { const tr = Math.floor(i / N * 4), tgt = clamp(L.e[tr] * (.5 + .5 * hs(Math.floor(t * 9) + i * 2.3)) + .06, 0, 1); st.b[i] = Math.max(tgt, st.b[i] * .88); const h = 8 + st.b[i] * 62, x = i * 6; g.R(x, 108 - h, 5, h, HC[tr]); g.R(x, 108 - h, 5, 2, '#fff6d8'); g.R(x, 110, 5, h * .55, HC[tr] + '44'); } g.R(0, 108, 240, 2, '#3a3050'); }
function scope(g, t, st, L) { g.clear('#06140c'); for (let x = 0; x < 240; x += 24) g.R(x, 19, 1, 178, '#0d2a18'); for (let y = 30; y < 190; y += 20) g.R(0, y, 240, 1, '#0d2a18'); g.R(0, 108, 240, 1, '#1a4a2a'); let py = 108; for (let x = 0; x < 240; x++) { let y = 0; for (let i = 0; i < 4; i++) y += Math.sin(x * (.05 + i * .037) + t * (3 + i)) * L.e[i] * 16; const yy = 108 + y; g.line(x - 1, py, x, yy, '#6aff9a'); py = yy; } const N = 24; st.b = st.b || Array(N).fill(0); for (let i = 0; i < N; i++) { const tr = Math.floor(i / N * 4), tgt = clamp(L.e[tr] * (.4 + .6 * hs(Math.floor(t * 10) + i * 1.9)), 0, 1); st.b[i] = Math.max(tgt, st.b[i] * .85); g.R(8 + i * 9.6, 192 - st.b[i] * 40, 7, st.b[i] * 40 + 1, '#2ab05a'); } }
function fire(g, t, st, L) {
  g.clear('#0a0810'); g.sky(19, 130, [0, 0, 1, 1, 2]); for (let i = 0; i < 40; i++) g.px(hs(i) * 240, 22 + hs(i + 3) * 80, i & 1 ? '#8a8aa8' : '#5a5a78'); g.R(0, 138, 240, 59, '#1a1410'); for (let y = 140; y < 197; y += 5) g.R(0, y, 240, 1, '#120e0a');
  const act = (L.e[0] + L.e[1] + L.e[2] + L.e[3]) / 4, cx = 120, by = 150, hgt = 16 + act * 36 + L.beat * 6, sh = Math.sin(t * 40) * act * 3;
  g.c.fillStyle = `rgba(255,150,50,${.1 + act * .14})`; g.c.beginPath(); g.c.arc(cx, by - 14, 70 + act * 20, 0, 7); g.c.fill();
  for (let q = 0; q < 3; q++) g.R(cx - 14 + q * 10, by + 2, 18, 4, '#3a2418');
  for (let f = 0; f < 5; f++) { const w = 14 - f * 2.4, hh = hgt * (1 - f * .17), x0 = cx + sh * (f * .3) + Math.sin(t * 9 + f) * 2; g.poly([[x0 - w, by], [x0 - w * .6, by - hh * .55], [x0 + Math.sin(t * 12 + f) * 3, by - hh], [x0 + w * .6, by - hh * .5], [x0 + w, by]], ['#a8322a', '#e0602a', '#f6a23a', '#ffd878', '#fff6d8'][f]); }
  for (let q = 0; q < 8; q++) { const u = fr(t * (.6 + q * .08) + q / 8); g.R(cx + Math.sin(q * 2.1 + t) * 16 + u * 6, by - 20 - u * (50 + act * 40), 2, 2, u < .6 ? '#ffd878' : '#a8322a'); }
  const P = [[cx - 62, by + 10], [cx - 26, by + 22], [cx + 26, by + 22], [cx + 62, by + 10]]; const dir = [1, 1, -1, -1];
  if (fig) for (let i = 0; i < 4; i++) { const [x, y] = P[i]; g.R(x - 9, y + 20, 18, 3, '#00000066'); fig(g.R, CLS[i], x - 12 + (dir[i] < 0 ? 0 : 0), y - 8 - Math.round(L.e[i] * 2), { s: 1, t, sit: true, f: dir[i] < 0 ? 1 : 0 }); g.R(x - 2, y + 24, 5, 5, HC[i]); }
}
add({ name: 'Visualizer', tag: 'visualizador (segure PLAY): 6 páginas, fica de fundo até apertar HOME', tier: 'sys', an: [240, 150],
  how: ['hold:PLAY = abre o visualizador (continua depois de soltar)', 'turn:SELECT / KNOB 1 = muda de página', 'tap:HOME = sai e volta ao jogo'],
  fields: [{ l: 'página', d: 'Sky · Tides · Ring · Canyon · Scope · Campfire.', v: 0, fmt: v => NAMES[Math.round(v * 5)] }],
  desc: 'Segure PLAY e a tela vira um visualizador que fica ali, como papel de parede, mesmo depois de soltar. São 6 páginas: o céu noturno (Sky), três ondas diferentes (Tides, Ring e Canyon), o osciloscópio horizontal clássico (Scope) e uma fogueira com os quatro heróis em volta, onde o fogo cresce e treme com a música. A tecla HOME sai.',
  bullets: ['O "som" que move as figuras é o padrão real de cada faixa tocado no passo real; sem música, o ritmo calmo de 108 bpm continua', 'Faixa muda = a onda daquele herói fica parada', 'Nada trava: SELECT passa de página, HOME volta ao jogo'],
  draw(g, t, k, st, tl) {
    const L = levels(t, st), page = Math.round(k[0] * 5); st.pages = st.pages || {}; const ps = st.pages[page] = st.pages[page] || {};
    [skyMode, tides, ring, canyon, scope, fire][page](g, t, page === 0 ? st : ps, page === 0 ? k : L, page === 0 ? tl : L);
    if (page !== 0) {} g.bar('Visualizer', NAMES[page], (page + 1) + '/6'); g.dials(['page', '', '', ''], [NAMES[page], '', '', ''], [k[0], 0, 0, 0]);
  } });
G.VIZLEV = levels;
})(window);
