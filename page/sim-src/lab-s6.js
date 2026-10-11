// FM1 Quest lab — round 2 screens drawn from the dashed suggestions: Syllabus, Envelope Dojo, Song Select, Orrery, Companion.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, PAL = Sc.PALS['1c'], { add, UI, TAU, clamp, lerp, fr, ease, hs, shade, floor7, outBack } = T, fig = Sc.fig, pct = v => Math.round(v * 100);
const MON = Sc.MON['1c'], scaled = (g, ox, oy, s) => (x, y, w, h, i) => g.R(ox + x * s, oy + y * s, w * s, h * s, i);
const LES = ['Sine', 'Harmonics', 'Ratio', 'Index', 'Envelope', 'Feedback', 'Algorithm', 'Exam'];

// ------------------------------------------------------------------ Envelope Dojo
const TARGETS = [['pluck', .02, .1, .0, .1], ['pad', .35, .3, .75, .4], ['bell', .01, .4, .05, .45], ['808 bass', .02, .2, .6, .15], ['organ', .02, .03, .9, .08]];
const envf = (u, A, D, S, R) => u < A ? u / A : u < A + D ? lerp(1, S, (u - A) / D) : u < 1 - R ? S : S * (1 - (u - (1 - R)) / R);
add({ name: 'Envelope Dojo', tag: 'dojo do ADSR', tier: 'n2', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:ALGORITHM = GAMES → FM School → Envelope Dojo', 'turn:KNOB 1–4 = A · D · S · R'],
  fields: [{ l: 'attack', d: 'sobe a faixa branca mais rápido ou mais devagar (começo da curva).', v: .2 }, { l: 'decay', d: 'a queda depois do pico.', v: .3 }, { l: 'sustain', d: 'altura do platô.', v: .5 }, { l: 'release', d: 'comprimento da cauda final.', v: .3 }],
  desc: 'Um tatame em perspectiva com a silhueta de um envelope-alvo (pluck, pad, sino, baixo 808, órgão) flutuando no ar. Você ajusta A, D, S e R até a sua curva encaixar; a faixa do cinto muda de branca a preta conforme o acerto.',
  bullets: ['O alvo troca a cada 10 s; a pontuação é a área entre as duas curvas', 'Faixas: branca → amarela → verde → preta', 'Aproveita a curva ADSR já desenhada na página ENV', 'O som tocado acompanha: o alvo e depois o seu, para comparar de ouvido'],
  extra(tile) {
    const row = document.createElement('div'); row.className = 'ctl'; row.style.cssText = 'flex-direction:row;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;color:var(--dim)'; const A = G.GFX.AUD;
    const mk = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; return b; };
    row.append(mk('▶ ouvir o alvo', () => { const tg = TARGETS[Math.floor(G.GFX.nowT() / 10) % TARGETS.length]; A.env(tg[1], tg[2], tg[3], tg[4], 1.6); }), mk('▶ ouvir o meu', () => { const k = tile.k; A.env(.02 + k[0] * .3, .03 + k[1] * .3, .1 + k[2] * .85, .05 + k[3] * .4, 1.6); }), 'compare o alvo e o seu de ouvido'); tile.el.querySelector('.ctl').after(row);
  },
  draw(g, t, k, st) {
    const ti = ((Math.floor(t / 10) % TARGETS.length) + TARGETS.length) % TARGETS.length, tg = TARGETS[ti], mine = [.02 + k[0] * .3, .03 + k[1] * .3, .1 + k[2] * .85, .05 + k[3] * .4];
    let err = 0; for (let i = 0; i < 40; i++) { const u = i / 39; err += Math.abs(envf(u, tg[1], tg[2], tg[3], tg[4]) - envf(u, ...mine)); } const score = clamp(1 - err / 40 * 1.7, 0, 1), belt = score > .92 ? 0 : score > .75 ? 11 : score > .5 ? 10 : 7, bn = score > .92 ? 'black' : score > .75 ? 'green' : score > .5 ? 'yellow' : 'white';
    g.clear(0); g.sky(19, 110, [0, 0, 1, 1]); g.R(0, 40, 240, 70, '#1d1520'); for (let i = 0; i < 7; i++) g.R(i * 36 - 4, 40, 3, 70, 4); g.poly([[30, 24], [90, 24], [90, 56], [60, 66], [30, 56]], 8); [[42, 50, 52, 32], [52, 32, 58, 39], [58, 39, 72, 39], [72, 39, 78, 50]].forEach(([x0, y0, x1, y1]) => { g.line(x0, y0, x1, y1, 7); g.line(x0, y0 + 1, x1, y1 + 1, 7); }); g.poly([[150, 24], [210, 24], [210, 56], [180, 66], [150, 56]], 8); g.disc(176, 49, 5, 7); g.R(180, 29, 2, 20, 7); g.poly([[182, 29], [190, 35], [190, 40], [182, 34]], 7);
    floor7(g, 110, 197, 120, 26, 120, 0, 28, 15, 9);
    const X0 = 40, W = 160, Y0 = 150, H = 62; const pt = (u, v) => [X0 + u * W, Y0 - v * H];
    const poly = (fn, c, o) => { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(pt(u, fn(u))); } pts.push(pt(1, 0), pt(0, 0)); if (o) g.polyO(pts, c); else g.poly(pts, c); };
    g.ell(120, 156, 90, 12, 0); poly(u => envf(u, ...mine), shade(PAL[12], .8)); const pts2 = []; for (let i = 0; i <= 40; i++) { const u = i / 40, p = pt(u, envf(u, ...mine)); pts2.push(p); if (i) g.line(pts2[i - 1][0], pts2[i - 1][1], p[0], p[1], 7); }
    for (let i = 0; i <= 80; i++) { const u = i / 80, p = pt(u, envf(u, tg[1], tg[2], tg[3], tg[4])); if (i % 2 === 0) { g.R(p[0], p[1] - 1, 2, 2, 10); } }
    fig(g.R, 'warrior', 6, 128, { s: 1, t }); g.R(14, 152, 14, 3, belt); g.R(14, 152, 14, 1, 7);
    g.panel(8, 170, 224, 22); g.txt('target: ' + tg[0], 18, 174, UI.hi); g.txt('match ' + pct(score) + '% · ' + bn + ' belt', 18, 183, UI.tx); g.R(150, 176, 74, 6, UI.off); g.R(150, 176, 74 * score, 6, belt === 0 ? 7 : belt);
    g.bar('Dojo', 'envelope match', bn);
    g.dials(['attack', 'decay', 'sustain', 'release'], [Math.round(2 + k[0] * 400), Math.round(20 + k[1] * 800), pct(mine[2]), Math.round(30 + k[3] * 1200)], k);
  } });

// ------------------------------------------------------------------ Song Select (cassette carousel)
const SONGS = [['Ode to Joy', 100, 'A', 2], ['Acid Night', 130, 'S', 3], ['Dub Chord', 110, 'B', 2], ['Chip Quest', 150, '—', 4], ['Lofi Rain', 80, 'A', 1], ['Boss Theme', 170, '—', 5]];
add({ name: 'Song Select', tag: 'prateleira de fitas', tier: 'n2', an: [240, 150],
  how: ['tap:PLAY = FM Hero → escolher música', 'turn:SELECT = gira a prateleira · press:OCT+ = jogar'],
  fields: [{ l: 'música', d: 'qual fita fica na frente do carrossel (gire o knob SELECT).', v: .2, fmt: v => SONGS[Math.round(v * 5)][0] }, { l: 'dificuldade', d: 'fácil, normal ou difícil: quantas pistas e notas o chart tem.', v: .5, fmt: v => ['fácil', 'normal', 'difícil'][Math.round(v * 2)] }, { l: 'fonte', d: 'projeto atual, MIDI importado ou lição pronta.', v: 0, fmt: v => ['projeto', 'MIDI', 'lição'][Math.round(v * 2)] }],
  desc: 'Um carrossel 3D de fitas cassete: a da frente mostra título, BPM, dificuldade em estrelas e o melhor rank; as outras diminuem em perspectiva. As fitas têm carretéis que giram.',
  bullets: ['Fonte "projeto atual" não precisa de importação', 'Rank salvo por música e dificuldade', 'Carretéis giram no ritmo do BPM da fita da frente', 'Mesmo carrossel do Bestiary: reaproveita o código'],
  draw(g, t, k, st) {
    const sel = Math.round(k[0] * 5), diff = Math.round(k[1] * 2), src = Math.round(k[2] * 2); if (st.rot == null) st.rot = 0; let d = sel - st.rot; if (d > 3) d -= 6; if (d < -3) d += 6; st.rot += d * .16; st.rot = (st.rot + 6) % 6;
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 2]); const cy = 100; for (let i = 0; i < 20; i++) g.px(hs(i) * 240, 22 + hs(i + 4) * 70, i & 1 ? 6 : 5);
    g.ell(120, cy + 62, 110, 16, 1); g.ellO(120, cy + 62, 110, 16, 5);
    const cards = SONGS.map((s, i) => { const a = (i - st.rot) * TAU / 6; return { i, s, a, x: 120 + Math.sin(a) * 92, dep: Math.cos(a) }; }).sort((a, b) => a.dep - b.dep);
    for (const c of cards) {
      const sc = .55 + .45 * (c.dep + 1) / 2, w = 92 * sc, h = 58 * sc, x = c.x - w / 2, y = cy - h / 2 + (1 - sc) * 24, front = c.dep > .85, col = [12, 9, 11, 13, 10, 8][c.i];
      g.R(x - 1, y - 1, w + 2, h + 2, 0); g.R(x, y, w, h, shade(PAL[col], .7)); g.R(x + 2, y + 2, w - 4, h - 4, 7); g.R(x + 4, y + 4, w - 8, h * .38, shade(PAL[col], .9)); g.R(x + 4, y + h * .5, w - 8, h * .3, 0);
      const rr = h * .13; for (const rx of [x + w * .3, x + w * .7]) { g.disc(rx, y + h * .64, rr + 1, 7); g.disc(rx, y + h * .64, rr, 0); if (front) for (let q = 0; q < 3; q++) { const a = q * TAU / 3 + t * SONGS[c.i][1] / 60 * 2; g.line(rx, y + h * .64, rx + Math.cos(a) * rr, y + h * .64 + Math.sin(a) * rr, 7); } }
      if (front) { g.txt(c.s[0], c.x, y + 7, 0, { al: 'c' }); for (let q = 0; q < 5; q++) g.R(x + 8 + q * 7, y + h - 10, 5, 5, q < Math.min(5, c.s[3] + diff - 1) ? 10 : 5); g.txt(c.s[1] + ' bpm', x + w - 8, y + h - 12, 0, { al: 'r' }); }
    }
    const s = SONGS[sel]; g.panel(8, 168, 224, 24); g.txt(s[0] + ' · ' + ['project', 'MIDI', 'lesson'][src], 18, 172, UI.hi); g.txt('best rank ' + s[2] + ' · ' + ['easy', 'normal', 'hard'][diff] + ' · ' + s[1] + ' bpm', 18, 182, UI.tx);
    g.bar('Song Select', 'FM Hero', (sel + 1) + '/6');
    g.dials(['song', 'level', 'source', 'best'], [s[0].slice(0, 7), ['easy', 'normal', 'hard'][diff], ['proj', 'MIDI', 'lesson'][src], s[2]], [k[0], k[1], k[2], s[2] === 'S' ? 1 : s[2] === 'A' ? .75 : s[2] === 'B' ? .5 : 0]);
  } });

// ------------------------------------------------------------------ Orrery (polyrhythm)
const LENS = [[16, 12, 20, 64], [16, 16, 16, 16], [16, 12, 8, 24], [7, 5, 9, 16]];
add({ name: 'Orrery', tag: 'poliritmia como planetas', tier: 'n2', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'turn:SELECT = TAVERN → Orrery'],
  fields: [{ l: 'bpm', d: 'velocidade em que os planetas giram.', v: .4, fmt: v => Math.round(70 + v * 110) }, { l: 'comprimentos', d: 'qual combinação de steps por faixa: 16/12/20/64, todas 16, 16/12/8/24 ou 7/5/9/16.', v: 0, fmt: v => LENS[Math.round(v * 3)].join('/') }, { l: 'rastro', d: 'comprimento do rastro de cada planeta.', v: .5 }],
  desc: 'Quatro planetas giram em órbitas inclinadas em volta de um cristal central; cada um é uma faixa e seu período é o número de steps. Quando passam pela marca do topo, tocam a nota; quando os quatro se alinham é o "downbeat" geral.',
  bullets: ['Mostra poliritmia de forma óbvia (16 / 12 / 20 / 64 steps)', 'Tempo para alinhar tudo = menor múltiplo comum dos comprimentos', 'Marca no topo = o momento do step 1; planeta brilha ao cruzá-la', 'Barato: elipses, pontos e rastros curtos'],
  draw(g, t, k, st) {
    const bpm = 70 + k[0] * 110, len = LENS[Math.round(k[1] * 3)], tilt = .4, step = t * bpm / 15, cx = 120, cy = 108; g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]);
    for (let i = 0; i < 40; i++) g.px(hs(i) * 240, 22 + hs(i + 9) * 170, i & 1 ? 6 : 5);
    const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = len.reduce((a, b) => a / gcd(a, b) * b); let ali = 0;
    for (let i = 0; i < 4; i++) { const rx = 38 + i * 24, ry = rx * tilt; g.ellO(cx, cy, rx, ry, 5); }
    g.R(cx - 1, cy - 78, 2, 8, 7); g.poly([[cx, cy - 72], [cx - 4, cy - 68], [cx + 4, cy - 68]], 10);
    const pl = [];
    for (let i = 0; i < 4; i++) { const rx = 38 + i * 24, ry = rx * tilt, ph = fr(step / len[i]), a = -Math.PI / 2 + ph * TAU; if (ph < .04 || ph > .98) ali++; for (let q = 1; q <= 6; q++) { const aa = a - q * .06 * (1 + k[2] * 2); g.px(cx + Math.cos(aa) * rx, cy + Math.sin(aa) * ry, q < 3 ? UI.t[i] : 5); } pl.push({ i, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, ph }); }
    const q = Math.floor(step); if (st.q !== q) { st.q = q; st.fl = pl.map(p => p.ph < .05 ? t : (st.fl ? st.fl[p.i] : -9)); } st.fl = st.fl || [-9, -9, -9, -9];
    const cr = 8 + Math.sin(t * 3) * 1 + (ali === 4 ? 4 : 0); g.poly([[cx, cy - cr * 1.6], [cx + cr, cy], [cx, cy + cr * 1.6], [cx - cr, cy]], ali === 4 ? 10 : 12); g.poly([[cx, cy - cr * 1.6], [cx, cy + cr * 1.6], [cx - cr, cy]], ali === 4 ? 7 : 13);
    pl.sort((a, b) => a.y - b.y).forEach(p => { const fl = t - st.fl[p.i] < .25; g.disc(p.x, p.y, 4 + (fl ? 2 : 0), 0); g.disc(p.x, p.y, 3 + (fl ? 2 : 0), fl ? 7 : UI.t[p.i]); g.px(p.x - 1, p.y - 1, 7); g.txt(len[p.i], p.x, p.y + 6, UI.t[p.i], { al: 'c' }); });
    g.panel(8, 170, 224, 22); g.txt('steps ' + len.join(' · '), 18, 174, UI.tx); g.txt('all align every ' + lcm + ' steps (' + Math.max(1, Math.round(lcm / 16)) + ' bars)', 18, 183, UI.dim);
    g.bar('Orrery', 'polyrhythm', Math.round(bpm) + ' bpm');
    g.dials(['bpm', 'lengths', 'trail', 'align'], [Math.round(bpm), len.join('/').slice(0, 8), pct(k[2]), ali === 4 ? 'now' : '—'], [k[0], k[1], k[2], ali === 4 ? 1 : 0]);
  } });

// ------------------------------------------------------------------ Companion (the slime is a vocal effect)
const VOX = [['normal', 'voz limpa'], ['robô', 'vocoder: voz quadrada e metálica'], ['agudo', 'pitch alto estilo esquilo'], ['grave', 'pitch baixo e pesado'], ['eco', 'a voz repete e some'], ['sussurro', 'só ruído filtrado']];
add({ name: 'Companion', tag: 'mascote com voz = efeito vocal', tier: 'n2', an: [240, 125],
  how: ['hold:HOME = abre o menu', 'turn:SELECT = TAVERN → Companion', 'turn:KNOB 1 = troca o efeito de voz'],
  fields: [{ l: 'voz', d: 'efeito aplicado à voz do slime: normal, robô, agudo, grave, eco ou sussurro. Clique em "falar" para ouvir.', v: 0, fmt: v => VOX[Math.round(v * 5)][0] }, { l: 'level', d: 'horas tocadas: o slime cresce e ganha traços novos (1–10).', v: .3, fmt: v => 1 + Math.round(v * 9) }, { l: 'roupa', d: 'item desbloqueado nos mini-games: nada, chapéu de mago ou coroa.', v: .5, fmt: v => ['nada', 'chapéu', 'coroa'][Math.round(v * 2)] }, { l: 'bpm', d: 'andamento do seu groove (a dança e a fala acompanham).', v: .4, fmt: v => Math.round(70 + v * 110) }],
  desc: 'Um slime filhote vive num quarto aconchegante (lareira, estante, janela, tapete, cama). Ele pula no ritmo com a mesma animação do slime do jogo e fala: a voz dele passa pelo efeito escolhido, mostrado no balão como uma onda de cada tipo. Serve de efeito vocal para o seu som.',
  bullets: ['O knob 1 troca o efeito: normal, robô, agudo, grave, eco ou sussurro', 'O balão mostra a forma da voz (senoide, degraus, ruído, repetições)', 'Mesma animação de pulo do slime da Party e do Boss', 'No aparelho a voz seria um sample do slime passando pelo FX de voz (sem microfone)'],
  extra(tile) { const row = document.createElement('div'); row.className = 'ctl'; row.style.cssText = 'flex-direction:row;gap:4px'; const b = document.createElement('button'); b.textContent = '▶ falar'; b.onclick = () => { tile.st.talk = G.GFX.nowT(); G.GFX.AUD.voice(Math.round(tile.k[0] * 5)); }; row.append(b); tile.el.querySelector('.ctl').after(row); },
  onField(tile, i) { if (i === 0) { tile.st.talk = G.GFX.nowT(); G.GFX.AUD.voice(Math.round(tile.k[0] * 5)); } },
  draw(g, t, k, st) {
    const vx = Math.round(k[0] * 5), lv = 1 + Math.round(k[1] * 9), hat = Math.round(k[2] * 2), bpm = 70 + k[3] * 110, beat = t * bpm / 60, M = MON, P = (x, y) => [120 + (x - y) * 22, 50 + (x + y) * 11];
    if (st.talk == null) st.talk = -9; const auto = Math.floor(t / 4.5), tk = (st.autoN !== auto) ? (st.autoN = auto, st.talk = st.talk) : 0; const talking = t - st.talk < 1.3 || fr(t / 4.5) < .22;
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]);
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) { const p = P(x - 1, y - 1); g.poly([[p[0], p[1]], [p[0] + 22, p[1] + 11], [p[0], p[1] + 22], [p[0] - 22, p[1] + 11]], (x + y) & 1 ? 4 : '#5a3a28'); }
    const W0 = P(-1, -1), W1 = P(5, -1), W2 = P(-1, 5); g.poly([W0, W1, [W1[0], W1[1] - 46], [W0[0], W0[1] - 46]], '#4a3c58'); g.poly([W0, W2, [W2[0], W2[1] - 46], [W0[0], W0[1] - 46]], '#2f2840');
    for (let q = 0; q < 6; q++) { g.line(W0[0] + q * 22, W0[1] - 46 + q * 11, W0[0] + q * 22, W0[1] + q * 11, '#3a3050'); }
    const fp = P(1.4, -1); g.R(fp[0] - 22, fp[1] - 32, 44, 32, 6); g.R(fp[0] - 18, fp[1] - 28, 36, 28, 0); const fl = 4 + Math.round(Math.sin(t * 11) * 2); g.poly([[fp[0], fp[1] - 8 - fl * 1.5], [fp[0] - 8, fp[1]], [fp[0] + 8, fp[1]]], 8); g.poly([[fp[0], fp[1] - 5 - fl], [fp[0] - 5, fp[1]], [fp[0] + 5, fp[1]]], 9); g.poly([[fp[0], fp[1] - 2 - fl / 2], [fp[0] - 2, fp[1]], [fp[0] + 2, fp[1]]], 10); g.R(fp[0] - 22, fp[1] - 34, 44, 3, 7);
    const wp = P(3.7, -1); g.R(wp[0] - 15, wp[1] - 40, 30, 24, 0); g.R(wp[0] - 13, wp[1] - 38, 26, 20, 1); for (let i = 0; i < 6; i++) g.px(wp[0] - 11 + hs(i) * 22, wp[1] - 36 + hs(i + 3) * 16, 7); g.disc(wp[0] + 7, wp[1] - 31, 3, 7); g.R(wp[0] - 1, wp[1] - 38, 2, 20, 0);
    const sh = P(-.6, 1.6); g.R(sh[0] - 4, sh[1] - 44, 22, 40, 4); for (let r = 0; r < 3; r++) { g.R(sh[0] - 3, sh[1] - 42 + r * 13, 20, 2, 15); for (let q = 0; q < 5; q++) g.R(sh[0] - 2 + q * 4, sh[1] - 40 + r * 13, 3, 9, [8, 12, 11, 10, 13][(q + r) % 5]); }
    const ln = P(2.2, 2.2); g.R(ln[0], ln[1] - 56, 1, 14, 4); g.poly([[ln[0] - 5, ln[1] - 42], [ln[0] + 6, ln[1] - 42], [ln[0] + 3, ln[1] - 48], [ln[0] - 2, ln[1] - 48]], 10); g.ell(ln[0], ln[1] - 36, 14 + Math.sin(t * 3), 6, shade(PAL[10], .18));
    const rug = P(2, 2.4); g.ell(rug[0], rug[1] + 10, 52, 20, 8); g.ell(rug[0], rug[1] + 10, 44, 16, 14); g.ell(rug[0], rug[1] + 10, 32, 11, 8); g.ell(rug[0], rug[1] + 10, 20, 7, 14);
    const bed = P(-.2, 3.8); g.poly([[bed[0] - 30, bed[1]], [bed[0], bed[1] - 14], [bed[0] + 30, bed[1]], [bed[0], bed[1] + 14]], 4); g.poly([[bed[0] - 26, bed[1]], [bed[0], bed[1] - 11], [bed[0] + 26, bed[1]], [bed[0], bed[1] + 11]], 12); g.ell(bed[0] + 12, bed[1] - 2, 8, 4, 7);
    const pl = P(4.4, 3.8); g.R(pl[0] - 5, pl[1] - 8, 10, 10, 4); for (let q = 0; q < 5; q++) g.poly([[pl[0], pl[1] - 8], [pl[0] + (q - 2) * 7, pl[1] - 20 - (q % 2) * 6], [pl[0] + (q - 2) * 7 + 3, pl[1] - 18]], 11);
    const bowl = P(3.3, 3.3); g.ell(bowl[0], bowl[1], 8, 3, 6); g.ell(bowl[0], bowl[1] - 1, 6, 2, 8);
    const hop = Sc.hop(beat, 5), s = 1.3 + lv * .09, sx = rug[0], sy = rug[1] + 12; g.ell(sx, sy + 3, 14 * s, 4, 0);
    const R = scaled(g, sx - 22 * s / 2, sy - 18 * s, s); Sc.slimeD(R, 11, 18, 22, 16, M.slime, { lift: hop.lift, sq: hop.sq, noShadow: true });
    const ey = sy - 12 * s - hop.lift * s; if (hat === 1) g.poly([[sx, ey - 20 * s / 1.5], [sx - 9, ey - 6], [sx + 9, ey - 6]], 12); if (hat === 2) { g.R(sx - 8, ey - 9, 16, 4, 10); for (let q = 0; q < 3; q++) g.R(sx - 8 + q * 7, ey - 13, 2, 4, 10); }
    if (talking) { const bx = 150, by = 52, effFx = [0, 1, 2, 3, 4, 5][vx], w = 74; g.R(bx - 1, by - 1, w + 2, 36, 0); g.R(bx, by, w, 34, 7); g.poly([[bx + 6, by + 33], [bx + 16, by + 33], [bx - 6, by + 48]], 7);
      const copies = vx === 4 ? 3 : 1; for (let c = 0; c < copies; c++) { const al = c ? .5 / c : 1; for (let x = 0; x < w - 8; x++) { const u = x / (w - 8), ph = u * (vx === 2 ? 10 : vx === 3 ? 2 : 5) - t * 6 - c * .8; let y = 0; if (vx === 1) y = Math.sign(Math.sin(ph * TAU)) * 7; else if (vx === 5) y = (hs(x + Math.floor(t * 20)) - .5) * 9; else y = Math.sin(ph * TAU) * (vx === 3 ? 12 : vx === 2 ? 6 : 8) * Math.sin(u * Math.PI); g.R(bx + 4 + x, by + 17 + y, 1, 2, c ? shade(PAL[12], al) : (vx === 5 ? 6 : 12)); } }
      g.txt(VOX[vx][0], bx + w / 2, by + 3, 0, { al: 'c', sz: 8 }); }
    g.panel(8, 170, 224, 22); g.txt('Slime lv ' + lv + ' · voz: ' + VOX[vx][0], 18, 174, UI.hi); g.txt(VOX[vx][1], 18, 183, UI.tx);
    g.bar('Companion', 'your slime', 'lv ' + lv);
    g.dials(['voice', 'level', 'outfit', 'bpm'], [VOX[vx][0], lv, ['none', 'hat', 'crown'][hat], Math.round(bpm)], k);
  } });
})(window);
