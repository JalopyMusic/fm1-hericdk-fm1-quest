// FM1 Quest lab — new screens, batch 2: day/night, bestiary, trophies, hearth (save rooms), echo.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, PAL = Sc.PALS['1c'], { add, UI, TAU, clamp, lerp, fr, ease, hs, outBack, floor7, shade } = T, fig = Sc.fig;
const pct = v => Math.round(v * 100);

// ------------------------------------------------------------------ 12 · Library (FM School grimoires; was Bestiary)
const BOOKS = [['Sine', 'a pure tone', 12], ['Harmonics', 'saw = stacked sines', 11], ['Ratio', 'carrier : modulator', 13], ['Index', 'how far it bends', 8], ['Envelope', 'bright then mellow', 10], ['Feedback', 'an operator on itself', 9], ['Algorithm', 'wiring 4 operators', 14], ['Exam', 'match by ear', 7]], SONGB = [['Ode to Joy', 'C maj · 100 bpm', 12], ['Acid Night', 'D min · 130 bpm', 13], ['Dub Chord', 'A dor · 110 bpm', 11], ['Chip Quest', 'E phr · 150 bpm', 8], ['Lofi Rain', 'F maj · 80 bpm', 12], ['Boss Theme', 'D min · 170 bpm', 9], ['Twinkle', 'C maj · 90 bpm', 10], ['Scale Run', 'C maj · 120 bpm', 14]];
function glyph(g, i, x, y, c) {
  switch (i) {
    case 0: for (let q = -12; q <= 12; q++) g.px(x + q, y + Math.sin(q / 12 * TAU) * 6, c); break;
    case 1: for (let q = 0; q < 6; q++) g.R(x - 12 + q * 4, y + 8 - q * 3 - 3, 3, q * 3 + 3, c); break;
    case 2: g.ellO(x - 6, y, 6, 6, c); g.ellO(x + 6, y, 6, 6, c); g.R(x - 1, y - 1, 2, 2, c); break;
    case 3: for (let q = 1; q < 4; q++) g.ellO(x, y + 6, q * 4, q * 4, c, Math.PI * 1.15, Math.PI * 1.85); break;
    case 4: g.polyO([[x - 12, y + 7], [x - 6, y - 8], [x, y - 2], [x + 6, y - 2], [x + 12, y + 7]], c); break;
    case 5: g.ellO(x, y, 8, 6, c, .5, TAU - .5); g.poly([[x + 6, y - 7], [x + 11, y - 3], [x + 4, y - 3]], c); break;
    case 6: g.R(x - 12, y - 6, 7, 5, c); g.R(x + 5, y - 6, 7, 5, c); g.R(x - 3, y + 3, 7, 5, c); g.line(x - 5, y - 4, x, y + 3, c); g.line(x + 5, y - 4, x, y + 3, c); break;
    default: g.poly([[x, y - 9], [x + 3, y - 3], [x + 9, y - 3], [x + 4, y + 1], [x + 6, y + 8], [x, y + 4], [x - 6, y + 8], [x - 4, y + 1], [x - 9, y - 3], [x - 3, y - 3]], c);
  }
}
add({ name: 'Library', tag: 'FM School · grimórios de aulas e músicas', tier: 'n2', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:ALGORITHM = GAMES → FM School → Library', 'turn:SELECT = vira a prateleira'],
  fields: [{ l: 'livro', d: 'qual grimório vem para a frente (gire o knob SELECT).', v: 0, fmt: v => Math.round(v * 7) + 1 }, { l: 'progresso', d: 'quantos livros já foram estudados: os seguintes ficam acorrentados.', v: .35, fmt: v => Math.round(v * 8) + '/8' }, { l: 'estante', d: 'aulas do FM School ou músicas para estudar (tocar de ouvido ou no FM Hero).', v: 0, fmt: v => v > .5 ? 'músicas' : 'aulas' }],
  desc: 'Uma prateleira em carrossel de grimórios mágicos. Cada livro é uma aula (Sine, Harmonics, Ratio…) ou uma música para estudar, com capa de cor própria e um emblema; os livros ainda não liberados ficam acorrentados.',
  bullets: ['Livro da frente mostra título, assunto e estrelas conquistadas', 'Estante de aulas (8) e estante de músicas (8): mesma tela', 'Emblemas simples: onda, harmônicos, razão, índice, envelope…', 'No lugar do Syllabus: é a forma de navegar pelo curso'],
  draw(g, t, k, st) {
    const songs = k[2] > .5, L = songs ? SONGB : BOOKS, sel = Math.round(k[0] * 7), done = Math.round(k[1] * 8); if (st.rot == null) st.rot = 0; let d = sel - st.rot; if (d > 4) d -= 8; if (d < -4) d += 8; st.rot += d * .18; st.rot = (st.rot + 8) % 8;
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 2]); const cy = 100; g.disc(120, cy, 50 + Math.sin(t * 2) * 2, 1); g.ell(120, cy + 82, 110, 16, 1); g.ellO(120, cy + 82, 110, 16, 5);
    for (let i = 0; i < 20; i++) g.px(hs(i) * 240, 22 + hs(i + 4) * 70, i & 1 ? 6 : 5);
    const cards = L.map((b, i) => { const a = (i - st.rot) * TAU / 8; return { i, b, a, x: 120 + Math.sin(a) * 92, dep: Math.cos(a) }; }).sort((p, q) => p.dep - q.dep);
    for (const c of cards) {
      const sc = .5 + .5 * (c.dep + 1) / 2, w = 66 * sc * (.6 + .4 * Math.abs(Math.cos(c.a))), h = 92 * sc, x = c.x - w / 2, y = cy - h / 2 + (1 - sc) * 22, front = c.dep > .85, lock = c.i >= done, col = PAL[c.b[2]], cc = lock ? '#3a3040' : col;
      g.R(x - 1, y - 1, w + 2, h + 2, 0); g.R(x, y, w, h, shade(typeof cc === 'string' ? cc : PAL[cc], .75)); g.R(x + 3, y + 2, w - 5, h - 4, cc); g.R(x, y, 4, h, shade(typeof cc === 'string' ? cc : PAL[cc], .5));
      g.R(x + 3, y + 2, w - 5, 2, 10); g.R(x + 3, y + h - 4, w - 5, 2, 10); for (const [qx, qy] of [[x + 4, y + 3], [x + w - 6, y + 3], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) g.R(qx, qy, 3, 3, 10);
      if (w > 24) { g.disc(c.x + 2, y + h * .42, Math.max(6, 14 * sc), shade(PAL[10], .55)); glyph(g, c.i, c.x + 2, y + h * .42, lock ? 5 : 7); }
      if (lock) { g.R(c.x - 8, y + h * .4, 18, 3, 6); g.R(x + 4, y + h * .62, w - 8, 3, 6); g.R(c.x - 3, y + h * .55, 9, 8, 10); g.ellO(c.x + 1, y + h * .55, 3, 4, 10); }
      if (front) { g.txt(lock ? '???' : c.b[0], c.x, y + h + 6, lock ? UI.dim : UI.hi, { al: 'c', sz: 12 }); g.txt(lock ? 'locked' : c.b[1], c.x, y + h + 18, UI.dim, { al: 'c' }); if (!lock) for (let q = 0; q < 3; q++) g.R(c.x - 9 + q * 7, y + h - 14, 5, 5, c.i < done - 1 || q < 2 ? 10 : UI.off); }
    }
    g.bar('Library', songs ? 'songs to study' : 'FM School lessons', done + '/8');
    g.dials(['book', 'studied', 'shelf', 'stars'], [sel + 1, done + '/8', songs ? 'songs' : 'lessons', done * 2], [k[0], k[1], k[2], done / 8]);
  } });

// ------------------------------------------------------------------ 13 · Trophies
const TROPH = [['First loop', 'cup'], ['4 tracks', 'star'], ['Key change', 'note'], ['100 notes', 'medal'], ['Boss flawless', 'crown'], ['Night owl', 'moon'], ['Full song', 'shield'], ['Remix', 'gem'], ['Guest star', 'cup']];
function trophy(g, kind, x, y, s, lit, t) {
  const c = lit ? 10 : 5, d = lit ? 9 : 1, h = lit ? 7 : 6;
  switch (kind) {
    case 'cup': g.R(x - 5 * s, y - 12 * s, 10 * s, 7 * s, c); g.R(x - 6 * s, y - 11 * s, s, 4 * s, d); g.R(x + 5 * s, y - 11 * s, s, 4 * s, d); g.R(x - s, y - 5 * s, 2 * s, 3 * s, d); g.R(x - 4 * s, y - 2 * s, 8 * s, 2 * s, d); g.R(x - 4 * s, y - 12 * s, s, 3 * s, h); break;
    case 'star': g.poly([[x, y - 14 * s], [x + 3 * s, y - 8 * s], [x + 9 * s, y - 8 * s], [x + 4 * s, y - 4 * s], [x + 6 * s, y], [x, y - 3 * s], [x - 6 * s, y], [x - 4 * s, y - 4 * s], [x - 9 * s, y - 8 * s], [x - 3 * s, y - 8 * s]], c); g.R(x - s, y - 9 * s, 2 * s, 2 * s, h); break;
    case 'note': g.R(x + 2 * s, y - 14 * s, 2 * s, 11 * s, c); g.R(x - 4 * s, y - 5 * s, 7 * s, 5 * s, c); g.R(x + 3 * s, y - 14 * s, 5 * s, 3 * s, d); g.R(x - 3 * s, y - 4 * s, 2 * s, s, h); break;
    case 'medal': g.R(x - 3 * s, y - 14 * s, 2 * s, 7 * s, lit ? 8 : 1); g.R(x + s, y - 14 * s, 2 * s, 7 * s, lit ? 12 : 1); g.disc(x, y - 5 * s, 5 * s, d); g.disc(x, y - 5 * s, 4 * s, c); g.R(x - s, y - 7 * s, 2 * s, 4 * s, h); break;
    case 'crown': g.R(x - 8 * s, y - 6 * s, 16 * s, 5 * s, c); for (let i = 0; i < 3; i++) g.poly([[x - 8 * s + i * 8 * s, y - 6 * s], [x - 5 * s + i * 8 * s, y - 13 * s], [x - 2 * s + i * 8 * s, y - 6 * s]], c); g.R(x - 6 * s, y - 4 * s, 2 * s, 2 * s, lit ? 8 : 1); g.R(x + 4 * s, y - 4 * s, 2 * s, 2 * s, lit ? 12 : 1); break;
    case 'moon': g.disc(x, y - 7 * s, 7 * s, c); g.disc(x + 3 * s, y - 9 * s, 6 * s, 0); g.R(x - 4 * s, y - 8 * s, s, s, h); break;
    case 'shield': g.poly([[x - 7 * s, y - 13 * s], [x + 7 * s, y - 13 * s], [x + 7 * s, y - 6 * s], [x, y], [x - 7 * s, y - 6 * s]], c); g.R(x - s, y - 12 * s, 2 * s, 9 * s, d); g.R(x - 5 * s, y - 9 * s, 10 * s, 2 * s, d); break;
    case 'gem': g.poly([[x - 7 * s, y - 9 * s], [x - 4 * s, y - 13 * s], [x + 4 * s, y - 13 * s], [x + 7 * s, y - 9 * s], [x, y - 1 * s]], lit ? 12 : 5); g.poly([[x - 4 * s, y - 13 * s], [x + 4 * s, y - 13 * s], [x + 2 * s, y - 9 * s], [x - 2 * s, y - 9 * s]], lit ? 7 : 6); break;
  }
  if (lit && Math.sin(t * 3 + x) > .92) { g.R(x - 2, y - 10 * s, 5, 1, 7); g.R(x, y - 10 * s - 2, 1, 5, 7); }
}
add({ name: 'Trophies', tag: 'conquistas', tier: 't3', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:EDIT = TAVERN → Trophies'],
  fields: [{ l: 'conquistas', d: 'quantos troféus já foram desbloqueados (os outros ficam cinzas).', v: .55, fmt: v => Math.round(v * 9) + '/9' }, { l: 'selecionado', d: 'qual troféu a seta aponta e descreve embaixo.', v: .3, fmt: v => TROPH[Math.round(v * 8)][0] }, { l: 'aviso', d: 'frequência do banner "achievement unlocked" (0 = desligado).', v: .5 }],
  desc: 'Um armário em perspectiva de um ponto, com três prateleiras que se afastam. Troféus liberados brilham em ouro e cintilam; um banner com moeda girando desce do topo a cada conquista nova.',
  bullets: ['"Primeiro loop", "4 faixas ativas", "Mudou de escala", "100 notas"…', 'Banner com moeda girando (largura = cos do ângulo)', 'Contadores persistentes: poucos bytes na flash', 'Reforça o jogo sem atrapalhar o fluxo musical'],
  draw(g, t, k, st) {
    const un = Math.round(k[0] * 9), sel = Math.round(k[1] * 8), lum = .6; g.clear(0);
    const L = [20, 22, 70, 56, 170, 150, 220, 190];
    g.R(70, 56, 100, 94, lum > .5 ? 5 : 1); g.poly([[20, 22], [70, 56], [70, 150], [20, 190]], 4); g.poly([[220, 22], [170, 56], [170, 150], [220, 190]], 4); g.poly([[20, 22], [220, 22], [170, 56], [70, 56]], 0); g.poly([[20, 190], [220, 190], [170, 150], [70, 150]], 4);
    for (let i = 1; i < 6; i++) { const f = i / 6; g.line(lerp(70, 20, f), 150 + f * 40 + 0, lerp(170, 220, f), 150 + f * 40 + 0, 0); }
    for (let i = 0; i < 4; i++) { const f = i / 4; g.line(lerp(20, 70, f), lerp(22, 56, f), lerp(20, 70, f), lerp(190, 150, f), 0); g.line(lerp(220, 170, f), lerp(22, 56, f), lerp(220, 170, f), lerp(190, 150, f), 0); }
    const yb = [84, 112, 140];
    for (let r = 0; r < 3; r++) { const yf = 106 + (yb[r] - 106) * 2; g.poly([[70, yb[r]], [170, yb[r]], [220, yf], [20, yf]], 4); g.R(20, yf, 200, 3, 0); g.line(70, yb[r], 20, yf, 15); g.line(170, yb[r], 220, yf, 15); g.R(70, yb[r], 100, 1, 15); }
    for (let i = 0; i < 9; i++) { const r = Math.floor(i / 3), c = i % 3, ym = 106 + (yb[r] - 106) * 1.45, x = 120 + (c - 1) * 34 * 1.45, lit = i < un; g.ell(x, ym + 1, 9, 2, 0); trophy(g, TROPH[i][1], x, ym, 1.4 > 1 ? 1 : 1, lit, t); if (i === sel) { g.poly([[x - 4, ym - 22 + Math.sin(t * 6) * 2], [x + 4, ym - 22 + Math.sin(t * 6) * 2], [x, ym - 17 + Math.sin(t * 6) * 2]], 7); } }
    for (const lx of [92, 148]) { const fl = 2 + Math.round(Math.sin(t * 9 + lx) * 1.5); g.R(lx, 22, 1, 12, 0); g.R(lx - 3, 34, 7, 6, 4); g.ell(lx, 38 + 6, 5 + lum * 14, 3 + lum * 5, shade(PAL[10], .35 * lum)); g.R(lx - 1, 35, 3, fl + 2, 10); }
    const per = 9 - k[2] * 6, u = (t % per); if (k[2] > .02 && u < 2.6) { const e = u < .5 ? outBack(u / .5) : u > 2.1 ? 1 - (u - 2.1) / .5 : 1, y = lerp(-26, 24, clamp(e, 0, 1.1)); g.panel(40, y, 160, 24); const w = Math.abs(Math.cos(t * 6)) * 8 + 1; g.ell(60, y + 12, w, 8, 10); g.ellO(60, y + 12, w, 8, 9); g.txt('Achievement unlocked!', 74, y + 5, 10); g.txt(TROPH[un % 9][0], 74, y + 14, UI.tx); }
    g.R(0, 190, 240, 7, 0); g.txt(TROPH[sel][0] + (sel < un ? '' : ' (locked)'), 120, 191 - 2, sel < un ? UI.hi : UI.dim, { al: 'c' });
    g.bar('Trophies', 'the hall of fame', un + '/9');
    g.dials(['unlocked', 'select', 'toast', 'xp'], [un + '/9', TROPH[sel][0].slice(0, 7), k[2] > .02 ? pct(k[2]) : 'off', un * 40], [k[0], k[1], k[2], un / 9]);
  } });

// ------------------------------------------------------------------ 14 · Hearth (save rooms)
add({ name: 'Hearth', tag: 'salas de save (estalagem)', tier: 't3', an: [240, 150],
  how: ['tap:SAVE = (fora da Party) páginas SAVE; Hearth entra como página PROJECT', 'hold:SAVE + key:5–8 = (hoje) salva o loop na seção A–D'],
  fields: [{ l: 'sala', d: 'qual slot A–D está selecionado: a câmera caminha até a porta e ela abre.', v: .34, fmt: v => 'ABCD'[Math.round(v * 3)] }, { l: 'densidade', d: 'quantas notas o projeto da sala tem (prévia em pontinhos).', v: .6 }, { l: 'passo', d: 'velocidade com que a câmera anda pelo corredor.', v: .5 }],
  desc: 'Um corredor de estalagem em perspectiva de um ponto, com uma porta por slot de projeto. Escolher a sala faz a câmera andar até a porta, que se abre derramando luz e mostrando uma prévia do que está salvo.',
  bullets: ['Salvar = "dormir na estalagem" · carregar = "continuar jornada"', 'Prévia da sala: bpm, tonalidade e densidade das 4 faixas', 'Corredor feito de faixas e quadriláteros: poucos polígonos', 'Lê os slots do SAVE 1–4 que o firmware já tem'],
  draw(g, t, k, st) {
    const sel = Math.round(k[0] * 3), DZ = [4.5, 7.5, 10.5, 13.5], DS = [-1, 1, -1, 1]; if (st.z == null) st.z = 0; const tz = DZ[sel] - 2.6; st.z += (tz - st.z) * (.04 + k[2] * .12); const z0 = st.z + Math.sin(t * 1.5) * .04;
    const F = 112, CX = 120, CY = 102, P = (x, y, z) => [CX + x * F / (z - z0 + .001), CY + y * F / (z - z0 + .001)], lum = .6, BIO = [13, 11, 12, 8][sel];
    g.clear(0); const ZF = z0 + 16;
    g.R(0, 19, 240, 178, 0);
    for (let zi = Math.floor(ZF); zi > z0 + .35; zi--) {
      const za = Math.max(z0 + .35, zi), zb = zi + 1; if (zb - z0 < .4) continue;
      const q = (a, b) => [P(a[0], a[1], zb), P(b[0], b[1], zb), P(b[0], b[1], za), P(a[0], a[1], za)];
      g.poly(q([-1, .8], [1, .8]), zi & 1 ? 4 : 15 === 0 ? 4 : '#5a3a28');
      g.poly(q([-1, -1], [1, -1]), zi & 1 ? 0 : 1);
      g.poly(q([-1, -1], [-1, .8]), zi & 1 ? shade(PAL[4], .7) : shade(PAL[4], .55)); g.poly(q([1, -1], [1, .8]), zi & 1 ? shade(PAL[4], .7) : shade(PAL[4], .55));
      const bm = [P(-1, -1, zi), P(1, -1, zi), P(1, -.8, zi), P(-1, -.8, zi)]; g.poly(bm, 0);
    }
    const win = P(0, -.2, ZF), ww = 120 / (ZF - z0) * .8; g.R(win[0] - ww, win[1] - ww * 1.2, ww * 2, ww * 2.4, 12);
    for (let i = 3; i >= 0; i--) {
      const dz = DZ[i], s = DS[i], x = s; if (dz + 1 - z0 < .4) continue;
      const dd = (a, b, zz, yy) => P(x, yy, zz), open = i === sel, o = open ? clamp((z0 - (DZ[i] - 3.2)) / 1.4, 0, 1) : 0, za = Math.max(dz, z0 + .4), zb = dz + 1.1;
      g.poly([P(x, .8, za), P(x, .8, zb), P(x, -.45, zb), P(x, -.45, za)], 4);
      g.poly([P(x, .8, za), P(x, .8, zb), P(x, -.45, zb), P(x, -.45, za)].map(p => [p[0], p[1]]), open && o > .05 ? 9 : shade(PAL[4], .9));
      if (open && o > .05) { g.poly([P(x, .8, za), P(x, .8, zb), P(x - s * 1.8 * o, .8 + 0, zb + 0), P(x - s * 1.8 * o, .8, za)], shade(PAL[BIO], .5 + .4 * lum)); }
      else { g.poly([P(x, .75, za + .08), P(x, .75, zb - .08), P(x, -.4, zb - .08), P(x, -.4, za + .08)], shade(PAL[4], 1.15)); const m = P(x, .15, dz + .55); g.R(m[0] - 1, m[1], 2, 2, 10); }
      const m = P(x, -.7, dz + .55), sc = F / (dz - z0 + .55); if (sc > 28) g.txt('ABCD'[i], m[0], m[1] - 3, i === sel ? 10 : UI.tx, { al: 'c' });
      const sz = P(x * .98, -.2, dz + 1.6), fl = 2 + Math.round(Math.sin(t * 9 + i * 3) * 1.4); if (dz + 1.6 - z0 > .7) { const e = F / (dz + 1.6 - z0) * .05 + 1; g.R(sz[0] - e, sz[1], 2 * e, 3 * e, 4); g.R(sz[0] - e / 2, sz[1] - fl * e * .6, Math.max(1, e), fl * e * .6 + 1, 10); }
    }
    if (st.z > DZ[sel] - 3.4) { const o = clamp((z0 - (DZ[sel] - 3.2)) / 1.4, 0, 1), sp = P(0, .8, DZ[sel] + .5); g.poly([P(DS[sel], .8, DZ[sel]), P(DS[sel], .8, DZ[sel] + 1.1), P(DS[sel] * -.2, .8, DZ[sel] + 3), P(DS[sel] * -.2, .8, DZ[sel] + .3)], shade(PAL[BIO], .15 + .3 * lum * o)); }
    for (let i = 0; i < 18; i++) { const u = fr(t * .06 + hs(i)), x = (hs(i + 3) * 1.8 - .9), z = z0 + .5 + u * 9; const p = P(x, .1 + Math.sin(t + i) * .25, z); if (hs(i) < .4 + k[3] * .3) g.px(p[0], p[1], 10); }
    g.panel(8, 170, 224, 22); g.txt('room ' + 'ABCD'[sel] + ' · ' + (96 + sel * 14) + ' bpm · ' + ['D min', 'C maj', 'A dor', 'E phr'][sel], 18, 174, UI.tx); for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) { if (hs(sel * 5 + r * 17 + c) < .15 + k[1] * .55) g.R(150 + c * 4, 173 + r * 4, 3, 3, UI.t[r]); }
    g.bar('Hearth', 'save rooms', 'slot ' + 'ABCD'[sel]);
    g.dials(['room', 'density', 'walk', 'biome'], ['ABCD'[sel], pct(k[1]), pct(k[2]), ['cave', 'forest', 'coast', 'ruins'][sel]], [k[0], k[1], k[2], sel / 3]);
  } });

// ------------------------------------------------------------------ 15 · Echo
add({ name: 'Echo', tag: 'ouça e repita', tier: 'tr', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:SELECT = GAMES → Echo'],
  fields: [{ l: 'notas', d: 'tamanho da frase por rodada (2 a 8 notas).', v: .35, fmt: v => 2 + Math.round(v * 6) }, { l: 'tempo', d: 'velocidade em que o aparelho toca a frase.', v: .5 }, { l: 'pads', d: 'quantas gemas há no anel (3 a 6): mais pads, mais difícil.', v: .25, fmt: v => 3 + Math.round(v * 3) }, { l: 'erro', d: 'chance de o jogador de demonstração errar (para ver a reação).', v: .2 }],
  desc: 'Um anel inclinado com gemas que acendem em sequência (LISTEN); depois é a sua vez (YOUR TURN) e você repete nos pads. Acertos acendem uma coluna de luz, erros custam um coração.',
  bullets: ['Frase tirada da escala atual: treina ouvido relativo e intervalos', 'Rodada a rodada a frase cresce; dificuldade sobe com escala "estranha"', 'Anel em perspectiva: elipses, não precisa de sprites grandes', 'Estado do jogo é puro tempo: nenhum buffer de áudio necessário'],
  draw(g, t, k, st) {
    const Lq = 2 + Math.round(k[0] * 6), d = .75 - k[1] * .5, P = 3 + Math.round(k[2] * 3), cx = 120, cy = 118, rx = 84, ry = 34;
    const listenT = Lq * d + .5, turnT = Lq * d * 1.25 + .6, T = listenT + turnT + 1.2, cyc = Math.floor(t / T), u = t - cyc * T; const seq = Array.from({ length: Lq }, (_, i) => Math.floor(hs(cyc * 13 + i * 7) * P));
    let lit = -1, phase = 'LISTEN', fail = -1, good = false;
    if (u < listenT) { const j = Math.floor((u - .3) / d), f = fr((u - .3) / d); if (u > .3 && j < Lq && f < .75) lit = seq[j]; }
    else if (u < listenT + turnT) { phase = 'YOUR TURN'; const v = u - listenT - .3, j = Math.floor(v / (d * 1.25)), f = fr(v / (d * 1.25)); if (v > 0 && j < Lq && f < .6) { const err = hs(cyc * 5 + j) < k[3]; lit = err ? (seq[j] + 1) % P : seq[j]; if (err) fail = lit; } }
    else { phase = 'RESULT'; good = !seq.some((_, j) => hs(cyc * 5 + j) < k[3]); }
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]);
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + t * .05, r = 70 + hs(i) * 60; g.px(120 + Math.cos(a) * r * 1.6, 118 + Math.sin(a) * r * .55 - 20, i & 1 ? 5 : 6); }
    for (let r = 4; r >= 1; r--) g.ell(cx, cy + 14, rx * (1 + r * .08), ry * (1 + r * .08) + 2, r & 1 ? 1 : 0); g.ell(cx, cy + 14, rx, ry, 5); g.ell(cx, cy + 12, rx - 5, ry - 3, 1); g.ellO(cx, cy + 12, rx - 5, ry - 3, 2);
    const GEM = [UI.t[0], UI.t[1], UI.t[2], UI.t[3], '#8a6a9a', '#e09090'];
    const pads = Array.from({ length: P }, (_, i) => { const a = Math.PI / 2 + i * TAU / P + Math.PI * (P % 2 ? 0 : 1 / P); return { i, x: cx + Math.cos(a) * (rx - 14), y: cy + 12 + Math.sin(a) * (ry - 8), a }; }).sort((a, b) => a.y - b.y);
    const crystal = (x, y, h, w, col, lit, spin) => { const cs = Math.cos(spin), ww = Math.max(2, w * Math.abs(cs)), left = cs > 0 ? 1.0 : .6, right = cs > 0 ? .6 : 1.0, hex = typeof col === 'string' ? col : PAL[col]; g.poly([[x, y - h], [x - ww, y - h * .2], [x, y + h * .75]], lit ? 7 : shade(hex, left)); g.poly([[x, y - h], [x + ww, y - h * .2], [x, y + h * .75]], lit ? 15 : shade(hex, right)); g.polyO([[x, y - h], [x + ww, y - h * .2], [x, y + h * .75], [x - ww, y - h * .2]], 0); g.line(x, y - h, x, y + h * .75, shade(hex, .45)); g.px(x - ww * .4, y - h * .5, 7); };
    const mageY = cy - 62 + Math.round(Math.sin(t * 1.8) * 3);
    g.ell(cx, cy + 14, 30 + Math.sin(t * 1.8) * 2, 7, 0); for (let r = 0; r < 3; r++) g.ellO(cx, mageY + 44, 20 + r * 6 + Math.sin(t * 2 + r) * 1.5, 6 + r * 2, r ? 13 : 10);
    for (const p of pads) {
      const on = p.i === lit, c = GEM[p.i], bob = Math.sin(t * 2 + p.i * 1.7) * 3, y = p.y - 14 + bob, spin = t * (on ? 5 : 1.3) + p.i, h = 11 + (p.y - cy) * .09;
      if (on) { for (let q = 0; q < 70; q += 2) g.R(p.x - 2 + (q & 2 ? 0 : 1), y - h - q, 4 - (q > 40 ? 2 : 0), 2, q < 30 ? 7 : c); g.ellO(p.x, p.y + 4, 10 + (u * 40) % 30, 4 + ((u * 40) % 30) * .4, c); }
      g.ell(p.x, p.y + 4, 8 + bob * .4, 3, 0); crystal(p.x, y, h, h * .62, fail === p.i && on ? 8 : c, on, spin); for (let q = 0; q < 3; q++) { const aa = t * 2 + p.i + q * 2.1; g.px(p.x + Math.cos(aa) * (h * .9), y + Math.sin(aa) * 4, on ? 7 : 6); }
    }
    fig(g.R, 'mage', cx - 26, mageY, { s: 3, t, sit: true });
    const bn = phase === 'LISTEN' ? 12 : phase === 'YOUR TURN' ? 11 : good ? 10 : 8, bt = phase === 'RESULT' ? (good ? 'NICE!' : 'OOPS') : phase, e = outBack(clamp((u - (phase === 'LISTEN' ? 0 : phase === 'YOUR TURN' ? listenT : listenT + turnT)) / .35, 0, 1));
    g.txt(bt, 120, 22 - 8 + 10 * e, bn, { al: 'c', f: 't', sz: 16, ol: 0 });
    for (let i = 0; i < Lq; i++) { const done = phase === 'LISTEN' ? u > .3 + (i + .5) * d : phase === 'YOUR TURN' ? u - listenT - .3 > (i + .5) * d * 1.25 : phase === 'RESULT'; g.ell(120 - (Lq - 1) * 5 + i * 10, 62, 3, 3, done ? 10 : 5); }
    const lives = 3 - (phase === 'RESULT' && !good ? 1 : 0); for (let i = 0; i < 3; i++) { const x = 206 + i * 9; g.poly([[x, 25], [x + 4, 23], [x + 4, 27], [x, 31], [x - 4, 27], [x - 4, 23]], i < lives ? 8 : UI.off); }
    g.panel(8, 170, 224, 22); g.txt('round ' + (cyc + 1) + ' · ' + Lq + ' notes · ' + P + ' pads', 18, 174, UI.tx); g.txt(phase === 'LISTEN' ? 'listen to the phrase…' : phase === 'YOUR TURN' ? 'play it back on the pads' : good ? 'perfect round' : 'one slip', 18, 183, UI.dim);
    g.bar('Echo', 'listen & repeat', 'x' + (1 + cyc % 5));
    g.dials(['notes', 'tempo', 'pads', 'slip'], [Lq, pct(k[1]), P, pct(k[3]) + '%'], k);
  } });
})(window);
