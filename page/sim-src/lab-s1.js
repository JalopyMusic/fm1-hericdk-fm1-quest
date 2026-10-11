// FM1 Quest lab — new screens, batch 1 (tiers 1–3). Perspective / isometric / mode-7 scenes, TAVERN palette, no side view.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, PAL = Sc.PALS['1c'], { add, UI, TAU, clamp, lerp, fr, ease, hs, outBack } = T, fig = Sc.fig;
const CLS = ['mage', 'archer', 'cleric', 'warrior'], TRK = ['ACID 303', 'DUB CHORD', 'ATMOS PAD', 'TECHNO'];
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = Math.round((n >> 16) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f); return '#' + [r, g, b].map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join(''); };
const pct = v => Math.round(v * 100);

// mode-7 style checker floor: horizon hz, bottom y1, camera x-centre cx, scroll in world units
function floor7(g, hz, y1, cx, camH, foc, scroll, size, cA, cB) {
  for (let y = hz + 1; y <= y1;) {
    const dy = y - hz, h = dy < 28 ? 3 : dy < 56 ? 2 : 1, z = camH * foc / dy, step = size * foc / z, zc = Math.floor((z + scroll) / size);
    const i0 = Math.floor(-cx / step) - 1, i1 = Math.ceil((240 - cx) / step) + 1;
    for (let i = i0; i < i1; i++) { const a = Math.floor(cx + i * step), b = Math.ceil(cx + (i + 1) * step); g.R(a, y, b - a, h, ((i + zc) & 1) ? cB : cA); }
    y += h;
  }
}
const box = (g, x, y, w, h, c, d) => { d = d || 5; g.R(x, y, w, h, c); g.poly([[x + w, y], [x + w + d, y - d / 2], [x + w + d, y + h - d / 2], [x + w, y + h]], shade(c.length ? c : '#888888', .6)); g.poly([[x, y], [x + d, y - d / 2], [x + w + d, y - d / 2], [x + w, y]], shade(c.length ? c : '#888888', 1.25 > 1 ? 1 : 1)); };

// ------------------------------------------------------------------ 1 · Status
add({ name: 'Status', tag: 'ficha do herói', tier: 't1', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:SELECT = TAVERN → Status'],
  fields: [{ l: 'classe', d: 'escolhe o herói mostrado: mage, archer, cleric ou warrior.', v: 0, fmt: v => ['Elf Wizard', 'Archer', 'Cleric', 'Knight', 'Warrior', 'Em breve'][Math.round(v * 5)] },
    { l: 'FOR', d: 'força: velocity média dos hits da faixa; sobe o pilar vermelho-alaranjado.', v: .7 },
    { l: 'AGI', d: 'agilidade: densidade (notas por compasso).', v: .55 },
    { l: 'INT', d: 'inteligência: amplitude em graus da escala usada.', v: .4 }],
  desc: 'O herói gira num pedestal sob um holofote, cercado por quatro pilares que crescem com os números da faixa. O anel de runas no chão acende conforme o XP (steps preenchidos).',
  bullets: ['Um herói por tela: a faixa selecionada, em escala 3×', '<b>FOR</b> = velocity média · <b>AGI</b> = notas por compasso', '<b>INT</b> = amplitude em graus · <b>SOR</b> = swing + notas fora da grade', 'Anel de runas = XP (steps preenchidos / total)', 'Knobs: troca de classe e leitura dos 3 primeiros stats'],
  draw(g, t, k, st) {
    const hi5 = Math.round(k[0] * 5), cls = CLS[Math.min(3, hi5)], NM = ['Elf Wizard', 'Archer', 'Cleric', 'Knight', 'Warrior', 'Em breve'], gm = G.GAME, locked = hi5 === 5 || (hi5 === 4 && !(gm && gm.warrior)), tg = [k[1], k[2], k[3], .5 + .3 * Math.sin(t * .7)], xp = .35 + .3 * Math.sin(t * .3);
    st.h = st.h || [0, 0, 0, 0]; for (let i = 0; i < 4; i++) st.h[i] += (tg[i] - st.h[i]) * .2;
    g.clear(0); g.sky(19, 100, [0, 0, 1, 1, 2]);
    g.poly([[104, 19], [136, 19], [196, 156], [44, 156]], 1); g.poly([[112, 19], [128, 19], [166, 156], [74, 156]], 2);
    g.ell(120, 170, 150, 44, 0); g.ell(120, 160, 72, 19, 4); g.ell(120, 154, 72, 19, 5); g.ell(120, 154, 62, 15, 1);
    for (let i = 0; i < 24; i++) { const a = t * .5 + i / 24 * TAU, x = 120 + Math.cos(a) * 67, y = 154 + Math.sin(a) * 17, lit = i / 24 < xp; g.R(x, y, 2, 2, lit ? 10 : 2); }
    g.ell(120, 156, 28, 7, 0);
    if (locked) { g.R(104, 100, 32, 26, '#d8b43a'); g.R(108, 88, 4, 14, '#d8b43a'); g.R(128, 88, 4, 14, '#d8b43a'); g.R(108, 86, 24, 4, '#d8b43a'); g.R(118, 108, 4, 8, '#3a2a1c'); g.txt(hi5 === 4 ? 'conquiste 3 ULTs com remixagens diferentes' : 'mais um herói chega em breve', 120, 132, UI.tx, { sz: 9, al: 'c', nofit: true, mw: 200 }); }
    else fig(g.R, hi5 === 4 ? 'warrior' : cls, 120 - 26, 156 - 70 + Math.round(Math.sin(t * 2) * 1.2), { s: 3, t });
    const L = ['FOR', 'AGI', 'INT', 'SOR'], X = [14, 44, 178, 208], Y = [168, 150, 150, 168];
    for (let i = 0; i < 4; i++) { const h = 12 + st.h[i] * 78, c = UI.t[i]; box(g, X[i], Y[i] - h, 16, h, c, 6); g.txt(L[i], X[i] + 8, Y[i] - h - 18, UI.dim, { al: 'c' }); g.txt(pct(st.h[i]), X[i] + 8, Y[i] - h - 10, UI.tx, { al: 'c' }); }
    g.bar('Status', NM[hi5], locked ? 'bloqueado' : 'lv ' + pct(xp));
    g.dials(['class', 'FOR', 'AGI', 'INT'], [cls, pct(st.h[0]), pct(st.h[1]), pct(st.h[2])], k);
  } });

// ------------------------------------------------------------------ 2 · Quest log (still parchment, quests get struck through)
const QUESTS = ['Record a 2-bar loop', 'Play on all 4 tracks', 'Change the scale', 'Cast a punch FX', 'Save to slot B', 'Reach 140 bpm', 'Defeat King Slime', 'Solo a track (duel)', 'Use 3 FX at once', 'Learn a new preset', 'Mute and unmute', 'Tap the tempo'], QXP = [50, 30, 20, 20, 40, 30, 120, 40, 60, 30, 10, 10];
add({ name: 'Quest log', tag: 'missões da sessão', tier: 't1', an: [240, 120],
  how: ['hold:HOME = abre o menu', 'turn:PRESETS = TAVERN → Quest log'],
  fields: [{ l: 'concluídas', d: 'quantas missões foram cumpridas: as concluídas ganham um visto vermelho à esquerda.', v: .3, fmt: v => Math.round(v * 12) + '/12' }, { l: 'página', d: 'alterna entre as missões 1–6 e 7–12.', v: 0, fmt: v => (Math.round(v) + 1) + '/2' }, { l: 'automático', d: 'ligado: o aparelho cumpre uma missão nova a cada poucos segundos para você ver o visto sendo desenhado.', v: 0, fmt: v => v > .5 ? 'on' : 'off' }],
  desc: 'Um papel parado com a lista de missões bem legível. Quando uma missão é cumprida, um visto vermelho é desenhado no quadradinho à esquerda (com um brilho) e o XP ganho fica verde.',
  bullets: ['Missões ligadas à música: gravar um loop, trocar de escala, usar um punch, salvar um slot…', 'O visto é desenhado em ~0,6 s e depois fica fixo: custo zero com a tela parada', 'Cada missão concluída rende XP (alimenta Status e Trophies)', 'Duas páginas de 6 missões; texto em 10 px para ler bem'],
  draw(g, t, k, st) {
    const auto = k[2] > .5, D = auto ? Math.floor(t / 3.5) % 13 : Math.round(k[0] * 12), pg = Math.round(k[1]), old = false;
    st.t0 = st.t0 || []; for (let i = 0; i < 12; i++) { if (i < D) { if (st.t0[i] == null) st.t0[i] = st.seen ? t : -99; } else st.t0[i] = null; } st.seen = true;
    g.clear(0); g.sky(19, 197, [0, 0, 1, 0, 1, 0]);
    const paper = old ? 15 : 7, edge = old ? 9 : 15;
    g.R(22, 30, 196, 160, 4); g.R(24, 30, 192, 160, paper); g.R(24, 30, 192, 2, edge); g.R(24, 188, 192, 2, edge); g.R(24, 30, 3, 160, edge); g.R(213, 30, 3, 160, edge);
    g.ell(120, 28, 100, 4, 4); g.ell(120, 27, 98, 3, edge); g.ell(120, 191, 100, 4, 4); g.ell(120, 190, 98, 3, edge);
    if (old) for (let i = 0; i < 40; i++) g.px(28 + hs(i) * 184, 34 + hs(i + 9) * 152, 9);
    g.txt('Quests', 120, 33, 4, { al: 'c', f: 't', sz: 16 }); g.R(60, 52, 120, 1, 4); g.R(60, 54, 120, 1, edge);
    for (let r = 0; r < 6; r++) {
      const i = pg * 6 + r, y = 58 + r * 19, ok = i < D, ts = st.t0[i], w = g.tw(QUESTS[i]), sp = ok ? clamp((t - ts) / .6, 0, 1) : 0;
      g.R(34, y + 1, 11, 11, 4); g.R(35, y + 2, 9, 9, paper === 7 ? 15 : 7);
      g.txt(QUESTS[i], 52, y, 4); g.txt('+' + QXP[i] + ' xp', 52, y + 10, ok ? 11 : 9);
      if (ok) {
        const c1 = sp > .15, c2 = sp > .5;
        g.R(35, y + 2, 9, 9, paper === 7 ? 15 : 7); if (c1) { g.R(36, y + 6, 2, 2, 8); g.R(37, y + 7, 2, 2, 8); g.R(38, y + 8, 2, 2, 8); } if (c2) { g.R(39, y + 7, 2, 2, 8); g.R(40, y + 5, 2, 2, 8); g.R(41, y + 3, 2, 2, 8); g.R(42, y + 1, 2, 2, 8); }
        if (sp < 1) { const px2 = 36 + sp * 8; g.disc(px2, y + 6, 8 * (1 - sp) + 1, 8); g.ellO(px2, y + 6, 10 * sp + 2, 10 * sp + 2, 10); }
      }
    }
    const tot = Math.min(D, 12); g.R(34, 174, 172, 4, 4); g.R(35, 175, 170, 2, edge); g.R(35, 175, 170 * tot / 12, 2, 11); g.txt(tot + '/12', 207, 175, 4, { al: 'r' }); g.txt('xp ' + QXP.slice(0, tot).reduce((a, b) => a + b, 0), 34, 179, 4);
    g.bar('Quest Log', 'missions', tot + '/12');
    g.dials(['done', 'page', 'auto', 'xp'], [tot, (pg + 1) + '/2', auto ? 'on' : 'off', QXP.slice(0, tot).reduce((a, b) => a + b, 0)], [k[0], k[1], k[2], Math.min(1, QXP.slice(0, tot).reduce((a, b) => a + b, 0) / 500)]);
  } });

// ------------------------------------------------------------------ 3 · Damage meter
add({ name: 'Damage meter', tag: 'combate em números', tier: 't1', an: [240, 125],
  how: ['hold:HOME = abre o menu', 'tap:REC = TAVERN → Damage meter'],
  fields: [{ l: 'bpm', d: 'andamento: quantos golpes por segundo caem no boneco de treino.', v: .45, fmt: v => Math.round(70 + v * 110) }, { l: 'crit', d: 'chance de acerto crítico (número amarelo grande).', v: .2 }, { l: 'velocity', d: 'quanto o dano varia entre hits fracos e fortes.', v: .5 }, { l: 'level', d: 'nível do grupo: multiplica todo o dano (1 a 99).', v: .3, fmt: v => 1 + Math.round(v * 98) }],
  desc: 'Uma arena xadrez em perspectiva e um boneco de treino de palha com capacete de metal ao fundo. Cada nota vira um número que voa em arco até a câmera; abaixo, o placar de dano por herói.',
  bullets: ['Tamanho do número = velocity; amarelo grande = acento no tempo 1', 'Rodapé: DPS por herói e MVP da barra', 'O boneco balança e o capacete brilha a cada golpe', 'Level do grupo multiplica o dano mostrado'],
  draw(g, t, k, st) {
    const bpm = 70 + k[0] * 110, hz = 74, lv = 1 + Math.round(k[3] * 98), mult = 1 + lv / 20;
    g.clear(0); g.sky(19, hz, [1, 1, 2, 2, 13]); for (let i = 0; i < 8; i++) { const x = 8 + i * 32; g.R(x, hz - 22, 6, 22, 5); g.R(x + 1, hz - 25, 4, 3, 5); const f = 3 + Math.round(Math.sin(t * 9 + i * 2)); g.R(x + 1, hz - 20 - f, 4, f + 2, i % 2 ? 9 : 10); }
    floor7(g, hz, 165, 120, 36, 120, 0, 24, 1, 5);
    const n = Math.floor(t * bpm / 60 * 4), PAT = ['1011010110110110', '0000001000000100', '1000000000000000', '1000100010001000'];
    st.d = st.d || []; st.sum = st.sum || [0, 0, 0, 0]; st.n = st.n == null ? n : st.n;
    while (st.n < n) { st.n++; for (let i = 0; i < 4; i++) if (PAT[i][st.n % 16] === '1') { const crit = hs(st.n * 3 + i) < k[1] * .5 || (i === 0 && st.n % 16 === 0); const v = Math.round((20 + hs(st.n + i * 9) * (30 + 90 * k[2])) * mult * (crit ? 2.5 : 1)); st.d.push({ t0: t, v, crit, i, ox: (i - 1.5) * 20 + (hs(st.n) - .5) * 14 }); st.sum[i] += v; st.hit = t; } }
    st.d = st.d.filter(d => t - d.t0 < 1.2).slice(-14);
    const ht = st.hit ? t - st.hit : 9, sw = ht < .35 ? Math.sin(ht * 38) * 5 * (1 - ht / .35) : 0, flash = ht < .08, gy = hz + 52;
    g.ell(120, gy + 2, 24, 6, 0); g.R(117, gy - 52, 6, 52, 4); g.R(118, gy - 52, 2, 52, 15); g.R(96, gy - 40, 48, 5, 4); g.R(96, gy - 40, 48, 1, 15);
    for (const sd of [-1, 1]) for (let q = 0; q < 5; q++) g.R(120 + sd * (24 + q * 3) + sw * .4 - 1, gy - 38 + q * 3 - Math.abs(sd) * 0, 2, 7 + q, q & 1 ? 10 : 9);
    g.R(106 + sw * .5, gy - 38, 28, 26, 9); for (let q = 0; q < 14; q++) g.R(107 + q * 2 + sw * .5, gy - 38, 1, 26, q & 1 ? 10 : 9); g.R(106 + sw * .5, gy - 28, 28, 3, 4); g.R(106 + sw * .5, gy - 17, 28, 3, 4);
    g.R(105 + sw * .5, gy - 14, 4, 12, 9); g.R(131 + sw * .5, gy - 14, 4, 12, 9);
    const hx = 120 + sw * .9, hy = gy - 54; g.disc(hx, hy + 6, 9, 10); g.disc(hx, hy + 6, 8, 9); g.poly([[hx - 11, hy + 7], [hx - 9, hy - 8], [hx, hy - 12], [hx + 9, hy - 8], [hx + 11, hy + 7]], flash ? 7 : 6); g.poly([[hx - 8, hy - 7], [hx, hy - 10], [hx + 4, hy - 8], [hx - 3, hy + 2], [hx - 8, hy + 2]], 7); g.R(hx - 9, hy + 1, 18, 2, 5); g.R(hx - 6, hy + 4, 12, 2, 0); g.R(hx - 1, hy - 14, 2, 4, 6); g.px(hx - 8, hy - 2, 7); g.px(hx + 7, hy - 2, 7);
    for (const d of st.d) {
      const u = (t - d.t0) / 1.1, x = 120 + d.ox * (1 + u * 2.2), y = gy - 50 - 40 * Math.sin(u * 2.6) + 90 * u * u, sz = d.crit ? (u > .4 ? 16 : 12) : (u > .5 ? 12 : 10);
      if (u > .8 && ((st.n + d.i) & 1)) continue; g.txt(d.v, x, y, d.crit ? 10 : UI.t[d.i], { al: 'c', sz, ol: 0 }); if (d.crit && u < .5) g.txt('CRIT', x, y - 11, 8, { al: 'c', ol: 0 });
    }
    g.panel(8, 166, 224, 27); const mx = Math.max(1, ...st.sum), who = st.sum.indexOf(mx);
    for (let i = 0; i < 4; i++) { g.txt(TRK[i].slice(0, 4), 16, 170 + i * 5.5, i === who ? 10 : UI.dim, { sz: 8 }); g.R(50, 171 + i * 5.5, st.sum[i] / mx * 136, 3, UI.t[i]); }
    g.txt('MVP', 214, 172, 10, { al: 'c' }); g.txt(who + 1, 214, 182, UI.tx, { al: 'c' });
    for (let i = 0; i < 4; i++) st.sum[i] *= .997;
    g.bar('Damage', 'training dummy', Math.round(bpm) + ' bpm');
    g.dials(['bpm', 'crit', 'velocity', 'level'], [Math.round(bpm), pct(k[1] * .5) + '%', pct(k[2]), lv], k);
  } });

// ------------------------------------------------------------------ 4 · Formation
add({ name: 'Formation · Pan (antiga)', tag: 'formação do grupo (versão só com pan, substituída)', tier: 'n2', an: [240, 150],
  how: ['hold:HOME = abre o menu', 'tap:GLO = TAVERN → Formation'],
  fields: [1, 2, 3, 4].map((n, i) => ({ l: 'pan ' + n, d: 'posição esquerda–direita do herói ' + n + ' (pan da faixa ' + n + ').', v: [.2, .8, .5, .5][i], fmt: v => (v < .45 ? 'L' : v > .55 ? 'R' : 'C') + Math.abs(Math.round((v - .5) * 200)) })),
  desc: 'Visto de cima em ângulo isométrico, o grupo se posiciona num palco em ângulo fixo. O pan de cada faixa move o herói de um lado para o outro.',
  bullets: ['Posição horizontal = pan; profundidade = ordem das faixas', 'Sombra e linhas de energia ligam os heróis (a "party")', 'Rodapé: abertura estéreo (stereo width) em %', 'Girar um knob é "arrumar a party"'],
  draw(g, t, k, st) {
    g.clear(0); g.sky(19, 197, [0, 0, 1, 0, 1]); const th = -.62, c = Math.cos(th), s = Math.sin(th);
    const P = (x, z) => [120 + (x * c - z * s) * 27, 98 + (x * s + z * c) * 13];
    for (let gx = -4; gx < 4; gx++) for (let gz = -3; gz < 3; gz++) g.poly([P(gx, gz), P(gx + 1, gz), P(gx + 1, gz + 1), P(gx, gz + 1)], (gx + gz) & 1 ? 4 : 5);
    const corners = [P(-4, -3), P(4, -3), P(4, 3), P(-4, 3)]; for (let q = 0; q < 6; q++) { g.poly([corners[2], corners[3], [corners[3][0], corners[3][1] + q], [corners[2][0], corners[2][1] + q]], q === 5 ? 0 : 4); }
    g.polyO(corners, 10);
    const hero = [0, 1, 2, 3].map(i => ({ i, x: (k[i] - .5) * 3.6 - 2, z: [-1.6, .9, -.4, 1.8][i] })).map(h => ({ ...h, p: P(h.x, h.z) })).sort((a, b) => a.p[1] - b.p[1]);
    for (let a = 0; a < 3; a++) { const A = hero[a].p, B = hero[a + 1].p; for (let q = 0; q <= 14; q += 2) g.px(lerp(A[0], B[0], q / 14), lerp(A[1], B[1], q / 14) - 10 - Math.sin(q / 14 * Math.PI) * 6, 10); }
    for (const h of hero) { g.ell(h.p[0], h.p[1] + 1, 14, 5, 0); fig(g.R, CLS[h.i], h.p[0] - 17, h.p[1] - 46 + Math.round(Math.sin(t * 3 + h.i * 1.7) * 1), { s: 2, t }); g.R(h.p[0] - 3, h.p[1] + 4, 7, 7, UI.t[h.i]); g.txt(h.i + 1, h.p[0], h.p[1] + 4, 0, { al: 'c' }); }
    { const q = P(3.3, -.6); g.ell(q[0], q[1] + 1, 12, 4, 0); g.ell(q[0], q[1] - 7, 11, 8, 11); g.R(q[0] - 5, q[1] - 9, 3, 3, 0); g.R(q[0] + 2, q[1] - 9, 3, 3, 0); g.txt('enemies', q[0], q[1] - 26, UI.dim, { al: 'c', sz: 8 }); }
    const xs = k.map(v => v), spread = (Math.max(...xs) - Math.min(...xs)), ctr = xs.reduce((a, b) => a + b) / 4 - .5;
    g.panel(8, 170, 224, 22); g.txt('stereo width', 18, 175, UI.dim); g.R(92, 176, 134 * spread, 4, spread > .6 ? 10 : 11); g.R(92, 176, 134, 1, UI.ln); g.txt(pct(spread) + '%  center ' + (ctr >= 0 ? 'R' : 'L') + Math.abs(Math.round(ctr * 100)), 18, 183, UI.tx);
    g.bar('Formation', 'party pan', spread > .6 ? 'wide' : spread > .3 ? 'mid' : 'tight');
    g.dials(['pan 1', 'pan 2', 'pan 3', 'pan 4'], k.map(v => (v < .45 ? 'L' : v > .55 ? 'R' : 'C') + Math.abs(Math.round((v - .5) * 200))), k);
  } });

// ------------------------------------------------------------------ 5 · Forge
add({ name: 'Forge', tag: 'forja: envelope + filtro', tier: 't2', an: [240, 150],
  how: ['tap:ENV = páginas ENV; Forge entra como 3ª página', 'hold:ENV + key:1–16 = (proposta) atalho de preset de envelope'],
  fields: [{ l: 'attack', d: 'tempo de subida: o cabo da espada (lado esquerdo) cresce devagar ou de uma vez.', v: .25, fmt: v => Math.round(2 + v * 400) + ' ms' }, { l: 'decay', d: 'queda depois do pico: a "cintura" da lâmina.', v: .4, fmt: v => Math.round(20 + v * 800) + ' ms' }, { l: 'sustain', d: 'nível que a nota mantém: a espessura da lâmina inteira.', v: .55 }, { l: 'release', d: 'tempo de saída: o comprimento da ponta que afina.', v: .5, fmt: v => Math.round(30 + v * 1200) + ' ms' }],
  desc: 'A curva ADSR vira uma espada sobre a bigorna: o martelo bate, faíscas voam para a câmera e o aço esquenta onde foi golpeado. Mexer no envelope muda a forma da lâmina.',
  bullets: ['Attack = cabo · Decay = cintura · Sustain = espessura · Release = ponta', 'Cutoff vira o calor do metal (cor), resonance o brilho', 'O mesmo ENV 1/2 do aparelho, só que com metáfora legível', 'Faíscas são poucas partículas de 1–3 px: barato'],
  draw(g, t, k, st) {
    const A = .06 + k[0] * .3, D = .06 + k[1] * .3, S = .2 + k[2] * .7, Rl = .1 + k[3] * .45;
    g.clear(0); g.sky(19, 197, [0, 0, 1, 0]);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) { const x = c * 28 + (r & 1) * 14 - 8, y = 22 + r * 14; g.R(x, y, 26, 12, (r + c) % 3 === 0 ? 5 : 1); }
    const fl = .7 + .3 * Math.sin(t * 13) * Math.sin(t * 7); g.ell(205, 70, 30, 30, 4); g.ell(205, 72, 22, 22, 8); g.ell(205, 74, 14 * fl + 4, 14 * fl + 4, 9); g.ell(205, 76, 7 * fl + 2, 7 * fl + 2, 10);
    // anvil
    g.ell(120, 176, 76, 9, 0); g.poly([[70, 156], [172, 156], [182, 172], [60, 172]], 5); g.poly([[88, 136], [154, 136], [160, 156], [82, 156]], 5); g.poly([[58, 116], [182, 116], [176, 138], [64, 138]], 6); g.poly([[58, 116], [30, 124], [64, 138]], 6); g.R(58, 115, 124, 1, 7); g.R(32, 124, 26, 1, 7);
    const T0 = 1.5, ph = fr(t / T0), cyc = Math.floor(t / T0); const xh = 90 + hs(cyc * 7) * 62;
    if (st.cyc !== cyc && ph > .12) { st.cyc = cyc; st.heat = 1; st.sp = (st.sp || []).concat(Array.from({ length: 16 }, (_, q) => ({ x: xh, y: 110, vx: (hs(cyc * 31 + q) - .5) * 90, vy: -40 - hs(cyc * 17 + q) * 70, z: 0, vz: 20 + hs(q + cyc) * 60, t0: t }))); }
    st.heat = (st.heat || 0) * .94;
    // blade lying on the anvil: the ADSR as a silhouette (hilt = attack side)
    const bx0 = 74, bx1 = 168, N = 47, prof = u => { if (u < A) return u / A; if (u < A + D) return lerp(1, S, (u - A) / D); if (u < 1 - Rl) return S; return S * (1 - (u - (1 - Rl)) / Rl); };
    for (let i = 0; i < N; i++) { const u = i / N, h = Math.max(1, prof(u) * 15), x = bx0 + u * (bx1 - bx0), heat = Math.max(0, 1 - Math.abs(x - xh) / 38) * st.heat * 1.2; const c = heat > .7 ? 10 : heat > .4 ? 9 : heat > .15 ? 8 : (i % 6 < 3 ? 6 : 7); g.R(x, 112 - h, 2.1, h, c); g.R(x, 112, 2.1, 2, 0); }
    g.R(bx0 - 6, 94, 5, 19, 10); g.R(bx0 - 16, 100, 11, 7, 4); g.disc(bx0 - 19, 103, 4, 10);
    const th = ph < .12 ? lerp(-1.2, .5, ph / .12) : ph < .3 ? lerp(.5, .15, ease((ph - .12) / .18)) : lerp(.15, -1.2, ease((ph - .3) / .7));
    const L = 78, px = xh + 70 * Math.sin(.5) - 0, py = 110 - 70 * Math.cos(.5) - 6; const hx = px - L * Math.sin(th), hy = py + L * Math.cos(th);
    g.line(px, py, hx, hy, 4); g.line(px + 1, py, hx + 1, hy, 4); g.line(px - 1, py, hx - 1, hy, 15);
    const nx = Math.cos(th), ny = Math.sin(th); g.poly([[hx - 11 * nx - 3 * ny, hy - 11 * ny + 3 * nx], [hx + 11 * nx - 3 * ny, hy + 11 * ny + 3 * nx], [hx + 11 * nx + 7 * ny, hy + 11 * ny - 7 * nx], [hx - 11 * nx + 7 * ny, hy - 11 * ny - 7 * nx]], 6); g.polyO([[hx - 11 * nx - 3 * ny, hy - 11 * ny + 3 * nx], [hx + 11 * nx - 3 * ny, hy + 11 * ny + 3 * nx], [hx + 11 * nx + 7 * ny, hy + 11 * ny - 7 * nx], [hx - 11 * nx + 7 * ny, hy - 11 * ny - 7 * nx]], 0);
    st.sp = (st.sp || []).filter(p => t - p.t0 < .9);
    for (const p of st.sp) { const u = t - p.t0, x = p.x + p.vx * u, y = p.y + p.vy * u + 160 * u * u, z = p.vz * u, s = 1 + Math.floor(z / 22); g.R(x, y, s, s, u < .25 ? 7 : u < .5 ? 10 : u < .7 ? 9 : 8); }
    g.panel(8, 168, 224, 24); g.txt('A ' + Math.round(2 + k[0] * 400) + 'ms   D ' + Math.round(20 + k[1] * 800) + 'ms', 18, 173, UI.tx); g.txt('S ' + pct(S) + '%   R ' + Math.round(30 + k[3] * 1200) + 'ms', 18, 183, UI.tx);
    g.txt('heat', 176, 173, UI.dim); g.R(176, 183, 46, 4, UI.off); g.R(176, 183, 46 * Math.min(1, st.heat), 4, 9);
    g.bar('Forge', 'the amp envelope', 'lv ' + pct(S));
    g.dials(['attack', 'decay', 'sustain', 'release'], [Math.round(2 + k[0] * 400), Math.round(20 + k[1] * 800), pct(S), Math.round(30 + k[3] * 1200)], k);
  } });

// ------------------------------------------------------------------ 6 · Alchemy
const wave = (s, p) => { p = fr(p); return s === 0 ? Math.sin(p * TAU) : s === 1 ? (p < .5 ? p * 4 - 1 : 3 - p * 4) : s === 2 ? p * 2 - 1 : (p < .5 ? 1 : -1); };
add({ name: 'Alchemy', tag: 'alquimia = LFO', tier: 't2', an: [240, 150],
  how: ['tap:LFO = páginas LFO; Alchemy entra como 3ª página'],
  fields: [{ l: 'rate', d: 'velocidade do LFO: o ritmo em que a poção ondula e borbulha.', v: .4, fmt: v => (.2 + v * 8).toFixed(1) + ' Hz' }, { l: 'depth', d: 'profundidade: o tamanho das ondas na superfície.', v: .6 }, { l: 'forma', d: 'sine, tri, saw ou square: muda o desenho das ondas e a receita no canto.', v: 0, fmt: v => ['sine', 'tri', 'saw', 'sq'][Math.round(v * 3)] }, { l: 'destino', d: 'o que a onda modula: pitch, filtro, volume ou pan (só muda o texto da receita).', v: .2, fmt: v => ['pitch', 'filter', 'amp', 'pan'][Math.round(v * 3)] }],
  desc: 'Um caldeirão visto de cima e de lado: o LFO é a onda que percorre a superfície da poção, com bolhas subindo e vapor. A receita no canto mostra a forma de onda escolhida.',
  bullets: ['Taxa = velocidade das ondas · depth = altura das ondas', 'Forma de onda = formato dos anéis (sine suave, square em degraus)', 'Cor da poção = destino da modulação', 'Bolhas e vapor são partículas de 1–6 px'],
  draw(g, t, k) {
    const rate = .2 + k[0] * 8, shape = Math.round(k[2] * 3), pc = 11, dark = 3, dst = ['pitch', 'filter', 'amp', 'pan'][Math.round(k[3] * 3)];
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]);
    g.R(0, 176, 240, 21, 4); for (let i = 0; i < 6; i++) g.R(i * 40 + 6, 176, 1, 21, 0); g.R(0, 176, 240, 1, 15);
    for (let i = 0; i < 5; i++) { const x = 86 + i * 17 + Math.sin(i * 3) * 4, f = 6 + Math.round(Math.sin(t * 9 + i * 2) * 3); g.R(x - 2, 168, 6, 8, 4); g.poly([[x + 1, 150 - f], [x - 3, 168], [x + 5, 168]], 8); g.poly([[x + 1, 156 - f / 2], [x - 1, 168], [x + 3, 168]], 9); g.poly([[x + 1, 162], [x, 168], [x + 2, 168]], 10); }
    g.R(70, 164, 100, 6, 4); g.ell(120, 130, 70, 44, 0); g.ell(120, 128, 66, 42, 5); g.ell(120, 124, 58, 36, 0);
    g.R(62, 150, 6, 22, 0); g.R(172, 150, 6, 22, 0);
    g.ell(120, 100, 68, 22, 0); g.ell(120, 99, 66, 20, 6); g.ell(120, 100, 58, 16, 0); g.ell(120, 102, 55, 14, dark);
    for (let j = 0; j < 4; j++) { const base = (j + .6) / 4.2, w = wave(shape, t * rate * .5 - j * .22) * k[1] * .22, rr = clamp(base + w, .08, .98); g.ellO(120, 102, 54 * rr, 13.5 * rr, j % 2 ? pc : 7); }
    g.ell(120, 102, 7, 2, pc);
    for (let i = 0; i < 9; i++) { const u = fr(t * (.25 + hs(i) * .25) + hs(i + 5)), x = 120 + (hs(i + 9) - .5) * 96 * (.6 + u * .4) + Math.sin(t * 2 + i) * 4, y = 94 - u * 62, s = 2 + Math.round(u * 4); if (u < .06) continue; g.ellO(x, y, s, s, 7); g.px(x - s / 2, y - s / 2, 7); }
    for (let i = 0; i < 12; i++) { const u = fr(t * .4 + i / 12), x = 120 + Math.sin(u * 9 + i) * (12 + u * 30), y = 90 - u * 56; if (u > .85 && (i & 1)) continue; g.R(x, y, 2 + (u > .5), 1 + (u > .5), u > .55 ? 5 : 6); }
    g.panel(160, 22, 72, 40); g.txt('recipe', 168, 26, UI.dim); for (let x = 0; x < 58; x++) { const v = wave(shape, x / 58 * 2 * (.5 + k[0])) * k[1]; g.px(168 + x, 48 - v * 10, pc); } g.R(168, 48, 58, 1, UI.ln); g.txt(['sine', 'tri', 'saw', 'square'][shape], 226, 26, 10, { al: 'r' }); g.txt('→ ' + dst, 226, 38, UI.dim, { al: 'r' }); { const px = Math.round(fr(t * rate * .5 / (2 * (.5 + k[0]))) * 57), vv = wave(shape, px / 58 * 2 * (.5 + k[0])) * k[1]; g.R(168 + px, 48 - vv * 10 - 1, 3, 3, 10); }
    g.bar('Alchemy', 'the lfo brew', rate.toFixed(1) + ' Hz');
    g.dials(['rate', 'depth', 'wave', 'dest'], [rate.toFixed(1), pct(k[1]), ['sine', 'tri', 'saw', 'sq'][shape], dst], k);
  } });

// ------------------------------------------------------------------ 7 · Overworld
const FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'], BIOME = [['forest', 11, 3], ['cave', 5, 0], ['coast', 15, 12], ['ruins', 6, 8]];
add({ name: 'Overworld', tag: 'mapa-múndi = tonalidade', tier: 't2', an: [240, 126],
  how: ['tap:SCL = páginas SCL; Overworld entra como 3ª página', 'hold:SCL + key:1–16 = tonalidade (como hoje)'],
  fields: [{ l: 'raiz', d: 'escolhe a nota raiz no círculo de quintas: o barco navega até a ilha.', v: .17, fmt: v => FIFTHS[Math.round(v * 11)] }, { l: 'escala', d: 'maj, min, dor ou phr: muda o bioma de todas as ilhas.', v: 0, fmt: v => ['maj', 'min', 'dor', 'phr'][Math.round(v * 3)] }],
  desc: 'As 12 tonalidades são ilhas num anel (círculo de quintas) que gira como num mapa em mode 7. A ilha da raiz atual fica à frente, com bandeira; transpor é navegar até a vizinha.',
  bullets: ['Ilhas vizinhas no anel = tonalidades próximas (boas modulações)', 'Cada escala tem um bioma: floresta, caverna, costa, ruínas', 'Pad escolhe a raiz, knob escolhe a escala', 'Mar e ilhas são faixas e discos: poucos polígonos'],
  draw(g, t, k, st) {
    const sel = Math.round(k[0] * 11), bi = BIOME[Math.round(k[1] * 3)], camH = 49, sway = 0;
    const target = -Math.PI / 2 - sel * TAU / 12; if (st.th == null) st.th = target; let d = target - st.th; d = Math.atan2(Math.sin(d), Math.cos(d)); st.th += d * .12; if (Math.abs(d) < .02) st.prev = sel; const th = st.th + sway;
    g.clear(0); g.sky(19, 66, [1, 13, 2, 14, 15]); for (let i = 0; i < 5; i++) { const x = ((i * 63 + t * 5) % 300) - 30; g.R(x, 30 + i * 6, 26 + i * 4, 3, 7); g.R(x + 5, 28 + i * 6, 16, 3, 7); }
    g.sky(66, 197, [12, 12, 12, 12, 12]); const hz = 66;
    for (let y = hz + 1; y < 197; y++) { const dy = y - hz, z = camH * 120 / dy, band = Math.floor(z * .12 + t * 1.2) & 1, h = Math.sin(z * .5 + t * 2) > .75; g.R(0, y, 240, 1, band ? 12 : '#3f6aa0'); if (h && dy > 6) g.R(40 + (hs(y) * 160), y, 8 + dy / 6, 1, 7); }
    const isl = FIFTHS.map((n, i) => { const a = i * TAU / 12 + th, x = Math.cos(a) * 92, z = 138 + Math.sin(a) * 92; return { n, i, x, z }; }).sort((a, b) => b.z - a.z);
    for (const o of isl) { const f = 120 / o.z, sx = 120 + o.x * f, sy = hz + camH * f, r = 15 * f; if (r < 1.5 || sy > 196) continue; const on = o.i === sel;
      g.ell(sx, sy + r * .1, r * 1.15, r * .38, 7); g.ell(sx, sy - r * .05, r, r * .34, bi[1] === 5 ? 6 : 15); g.ell(sx, sy - r * .12, r * .8, r * .26, bi[1]);
      const m = Math.max(1, Math.round(r / 7)); if (bi[0] === 'forest') { for (let q = -1; q <= 1; q++) g.poly([[sx + q * r * .32, sy - r * .1 - m * 7], [sx + q * r * .32 - m * 3, sy - r * .1], [sx + q * r * .32 + m * 3, sy - r * .1]], 3); } else if (bi[0] === 'cave') g.poly([[sx, sy - m * 12], [sx - r * .5, sy - r * .05], [sx + r * .5, sy - r * .05]], 5); else if (bi[0] === 'coast') { g.R(sx - m, sy - m * 9, m, m * 9, 4); g.poly([[sx, sy - m * 9], [sx - m * 5, sy - m * 7], [sx - m * 2, sy - m * 8]], 11); g.poly([[sx, sy - m * 9], [sx + m * 5, sy - m * 7], [sx + m * 2, sy - m * 8]], 11); } else for (let q = -1; q <= 1; q++) g.R(sx + q * r * .3 - m, sy - m * 8 + Math.abs(q) * 3, m * 2, m * 8, 6);
      if (r > 5) g.txt(o.n, sx, sy - r * .9 - 12 - m * 6, on ? 10 : UI.tx, { al: 'c', ol: 0 });
      if (on) { g.ellO(sx, sy, r * 1.2 + Math.sin(t * 4) * 1.5, r * .42, 10); const fm = Math.min(m, 2); g.R(sx + r * .2, sy - fm * 20, 1, fm * 10, 7); g.poly([[sx + r * .2, sy - fm * 20], [sx + r * .2 + fm * 6, sy - fm * 17], [sx + r * .2, sy - fm * 14]], 8); } }
    const sx = 120 + Math.sin(t * 1.3) * 3, sy = 150 + Math.sin(t * 2.2) * 1.5; g.poly([[sx - 12, sy], [sx + 12, sy], [sx + 8, sy + 6], [sx - 8, sy + 6]], 4); g.R(sx - 1, sy - 18, 2, 18, 4); g.poly([[sx + 1, sy - 17], [sx + 13, sy - 4], [sx + 1, sy - 4]], 7); g.poly([[sx - 1, sy - 14], [sx - 9, sy - 4], [sx - 1, sy - 4]], 15);
    const nb = [FIFTHS[(sel + 11) % 12], FIFTHS[(sel + 1) % 12]];
    g.panel(8, 168, 224, 24); g.txt(FIFTHS[sel] + ' ' + ['maj', 'min', 'dor', 'phr'][Math.round(k[1] * 3)] + ' · ' + bi[0], 18, 173, UI.hi); g.txt('neighbours: ' + nb[0] + '  ' + nb[1], 18, 183, UI.tx); g.txt('sail: SCL', 226, 183, UI.dim, { al: 'r' });
    g.bar('Overworld', 'the circle of fifths', FIFTHS[sel]);
    g.dials(['root', 'scale', 'neighbor', 'biome'], [FIFTHS[sel], ['maj', 'min', 'dor', 'phr'][Math.round(k[1] * 3)], FIFTHS[(sel + 1) % 12], bi[0]], [k[0], k[1], ((sel + 1) % 12) / 11, k[1]]);
  } });

// ------------------------------------------------------------------ 9 · Spellbook
add({ name: 'Spellbook', tag: 'arpejador = combos', tier: 't2', an: [240, 150],
  how: ['tap:ARP = páginas ARP; Spellbook entra como 3ª página', 'hold:ARP + key:1–16 = (hoje) note repeat'],
  fields: [{ l: 'modo', d: 'up, down, updown ou random: troca o grimório (capa, marcador e o mapa da página esquerda).', v: 0, fmt: v => ['up', 'down', 'u-d', 'rnd'][Math.round(v * 3)] }, { l: 'rate', d: 'velocidade das notas: cada runa acesa solta uma faísca.', v: .5 }, { l: 'oitavas', d: 'altura da espiral de magia que sobe do livro.', v: .5, fmt: v => 1 + Math.round(v * 3) }, { l: 'gate', d: 'duração de cada faísca (nota curta ou longa).', v: .5 }],
  desc: 'Um grimório aberto que muda com o modo do arpejo: cada modo tem capa e marcador de cor própria. A página esquerda é um mapa do caminho das notas (sobe, desce, vai-e-volta ou aleatório) com um ponto percorrendo-o; a direita tem as 8 runas que acendem em ordem.',
  bullets: ['Mapa da esquerda = a ordem real das 8 notas do modo escolhido', 'Capa azul = up · verde = down · roxa = up/down · vermelha = random', 'Altura da espiral = número de oitavas', 'Sem virada de página: só o ponto, as runas e as faíscas se movem'],
  draw(g, t, k, st) {
    const mode = Math.round(k[0] * 3), rate = 2 + k[1] * 9, oct = 1 + Math.round(k[2] * 3), gate = .2 + k[3] * .9, H = [0, 2, 4, 1, 3, 5, 2, 6], cov = [12, 11, 13, 8][mode], ribbon = [10, 7, 10, 9][mode];
    g.clear(0); g.sky(19, 197, [0, 0, 1, 0, 1]); g.R(0, 168, 240, 29, 4); for (let i = 0; i < 6; i++) g.R(0, 170 + i * 6, 240, 1, 0);
    const n = Math.floor(t * rate), order = i => mode === 0 ? i % 8 : mode === 1 ? 7 - (i % 8) : mode === 2 ? (i % 14 < 8 ? i % 14 : 14 - (i % 14)) : Math.floor(hs(i) * 8), cur = ((order(n) % 8) + 8) % 8;
    g.R(24, 126, 192, 60, 0); g.poly([[28, 124], [118, 134], [118, 186], [24, 176]], cov); g.poly([[122, 134], [212, 124], [216, 176], [122, 186]], cov); g.poly([[28, 124], [118, 134], [118, 136], [28, 126]], shade(PAL[cov], 1.4 > 1 ? 1 : 1));
    g.poly([[34, 128], [118, 138], [118, 182], [30, 172]], 7); g.poly([[122, 138], [206, 128], [210, 172], [122, 182]], 7); g.R(119, 136, 3, 46, 0);
    for (let q = 0; q < 3; q++) { g.line(34, 172 + q * .3, 118, 182, 15); g.line(122, 182, 210, 172, 15); }
    g.R(116, 184, 8, 12, ribbon); g.poly([[116, 196], [120, 192], [124, 196]], 0);
    // left page: the path the arp takes through the 8 notes
    const base = Math.floor(n / 8) * 8, q = n - base, P = i => { const ni = ((order(base + i) % 8) + 8) % 8; return [44 + ni * 9, 166 - H[ni] * 5 - ni * .5]; };
    g.txt(['up', 'down', 'up / down', 'random'][mode], 76, 132, 4, { al: 'c' });
    for (let i = 0; i < 8; i++) { const ni = i, x = 44 + ni * 9, y = 166 - H[ni] * 5 - ni * .5; g.disc(x, y, 2, 15); }
    for (let i = 0; i < 7; i++) { const a = P(i), b = P(i + 1); g.line(a[0], a[1], b[0], b[1], i < q ? cov : 9); }
    const pp = P(q); g.disc(pp[0], pp[1], 3, 10); g.ellO(pp[0], pp[1], 4 + Math.sin(t * 16), 4 + Math.sin(t * 16), 7);
    // right page: the runes
    for (let i = 0; i < 8; i++) { const x = 130 + i * 9, y = 176 - H[i] * 5 - i * .6; g.disc(x, y, 3, i === cur ? 10 : 4); if (i === cur) g.ellO(x, y, 5 + Math.sin(t * 20), 5, 10); }
    st.sp = st.sp || []; if (st.n !== n) { st.n = n; st.sp.push({ t0: t, x: 130 + cur * 9, y: 176 - H[cur] * 5, a0: hs(n) * TAU, c: cur % 4 }); }
    st.sp = st.sp.filter(s => t - s.t0 < gate * 1.4).slice(-12);
    for (const s of st.sp) { const u = (t - s.t0) / (gate * 1.4), a = s.a0 + u * 7, r = 14 + u * 8, z = Math.sin(a), x = 150 + (s.x - 150) * (1 - u) + Math.cos(a) * r, y = s.y - u * (30 + oct * 22), sz = z > 0 ? 3 : 2; g.R(x, y, sz, sz, UI.t[s.c]); if (u < .5) g.px(x - 1, y - 1, 7); }
    g.R(212, 22, 10, 22, 7); g.poly([[217, 10 + Math.round(Math.sin(t * 9))], [214, 22], [220, 22]], 10);
    for (let i = 0; i < 10; i++) { const x = (hs(i) * 240 + t * (4 + i)) % 240, y = 30 + hs(i + 3) * 100; g.px(x, y, 6); }
    g.bar('Spellbook', 'arp combos', Math.round(rate * 15) + ' bpm');
    g.dials(['mode', 'rate', 'octaves', 'gate'], [['up', 'down', 'u-d', 'rnd'][mode], pct(k[1]), oct, pct(k[3])], k);
  } });
T.floor7 = floor7; T.shade = shade; T.CLS = CLS; T.TRK = TRK; T.box = box;
})(window);
