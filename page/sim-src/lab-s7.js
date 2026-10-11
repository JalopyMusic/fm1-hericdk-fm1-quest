// FM1 Quest lab — round 3: the remaining suggestion screens, drawn.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, PAL = Sc.PALS['1c'], { add, UI, TAU, clamp, lerp, fr, ease, hs, shade, floor7, outBack } = T, fig = Sc.fig, pct = v => Math.round(v * 100), CLS = ['mage', 'archer', 'cleric', 'warrior'];
const AUD = T.AUD, INP = T.INP;

// ------------------------------------------------------------------ Practice Loop
add({ name: 'Practice Loop', tag: 'treino em loop A–B', tier: 'n3', an: [240, 125],
  how: ['tap:SEQ = (no FM Hero) marca A e B', 'turn:KNOB 2 = velocidade 50–100%'],
  fields: [{ l: 'A', d: 'compasso onde o loop começa (1–8).', v: .15, fmt: v => 1 + Math.round(v * 7) }, { l: 'B', d: 'compasso onde o loop termina (1–8).', v: .5, fmt: v => 1 + Math.round(v * 7) }, { l: 'velocidade', d: 'andamento do treino (50% a 100%); só o relógio muda.', v: .5, fmt: v => Math.round(50 + v * 50) + '%' }, { l: 'espelhar', d: 'inverte as pistas (esquerda ↔ direita) para treinar a outra mão.', v: 0, fmt: v => v > .5 ? 'sim' : 'não' }],
  desc: 'Uma estrada na horizontal dividida em 8 compassos, da esquerda para a direita, com bandeiras A e B marcando o trecho em loop. O herói corre só entre elas, na velocidade escolhida; o espelhar inverte a cena.',
  bullets: ['Velocidade = relógio do sequenciador, sem reamostrar áudio', 'Pista espelhada ajuda a treinar a outra mão', 'Marca no chart os compassos que você mais erra', 'Tela estática mais o herói: barata'],
  draw(g, t, k, st) {
    let a = 1 + Math.round(k[0] * 7), b = 1 + Math.round(k[1] * 7); if (b <= a) b = Math.min(8, a + 1); if (b <= a) a = b - 1; const sp = .5 + k[2] * .5, mir = k[3] > .5; st.u = ((st.u || 0) + (t - (st.lt || t)) * sp * .25); st.lt = t; const pos = a - 1 + (st.u % (b - a + 1)), X = x => mir ? 240 - x : x, hz = 96, x0 = 10, mw = 27.5, RY = 112, RH = 34;
    g.clear(0); g.sky(19, hz, [1, 13, 2, 14, 15]); for (let x = 0; x < 240; x += 2) { const h = 14 + Math.sin(x * .05) * 8; g.R(x, hz - h, 2, h, 13); } g.R(0, hz, 240, 101, 3); for (let y = hz + 2; y < 197; y += 4) g.R(0, y, 240, 1, 0);
    // the road: 8 measures side by side; the ones inside A–B are lit
    for (let m = 0; m < 8; m++) { const inL = m + 1 >= a && m + 1 <= b, xa = x0 + m * mw, xb = xa + mw - 1; g.R(Math.min(X(xa), X(xb)), RY, Math.round(mw) - 1, RH, inL ? (m & 1 ? 5 : '#5a5068') : (m & 1 ? 1 : 0)); g.R(Math.min(X(xa), X(xb)), RY, Math.round(mw) - 1, 2, inL ? 6 : 0); g.txt(m + 1, X(xa + mw / 2), RY + RH - 12, inL ? UI.hi : UI.dim, { al: 'c', sz: 8 }); }
    g.R(0, RY + RH, 240, 2, 0);
    const fx = n => X(x0 + (n - 1) * mw) , fb = X(x0 + b * mw);
    for (const [px, nm, c] of [[fx(a), 'A', 11], [fb, 'B', 8]]) { g.R(px, RY - 34, 2, 34, 7); g.poly([[px + (mir ? 0 : 2), RY - 34], [px + (mir ? -12 : 14), RY - 29], [px + (mir ? 0 : 2), RY - 24]], c); g.txt(nm, px + (mir ? -6 : 8), RY - 33, 7, { al: 'c', sz: 8 }); }
    const hxp = X(x0 + pos * mw + mw * .5); fig(g.R, 'warrior', hxp - 17, RY + RH - 44 - Math.abs(Math.sin(t * 8)) * 3, { s: 2, t, f: Math.floor(t * 8) & 1 });
    g.panel(8, 170, 224, 22); g.txt('loop ' + a + ' → ' + b + ' · ' + Math.round(sp * 100) + '% speed' + (mir ? ' · mirrored' : ''), 18, 174, UI.tx); g.R(18, 184, 204, 4, UI.off); g.R(18 + 204 * (a - 1) / 8, 184, 204 * (b - a + 1) / 8, 4, 12); g.R(18 + 204 * pos / 8 - 1, 182, 3, 8, 10);
    g.bar('Practice', 'A–B loop', Math.round(sp * 100) + '%'); g.dials(['A', 'B', 'speed', 'mirror'], [a, b, Math.round(sp * 100) + '%', mir ? 'on' : 'off'], [k[0], k[1], k[2], mir ? 1 : 0]);
  } });

// ------------------------------------------------------------------ Duel
add({ name: 'Duel', tag: 'duelo de pistas contra o Shadow', tier: 'n3', an: [240, 125],
  how: ['tap:GLO + tap:PLAY = FM Hero → Duel', 'key:1–3 = suas pistas (esquerda)'],
  fields: [{ l: 'rival', d: 'habilidade do rival Shadow (mais alta = erra menos).', v: .6 }, { l: 'você', d: 'habilidade do jogador de demonstração (na vida real é você).', v: .6 }, { l: 'bpm', d: 'andamento da música do duelo.', v: .4, fmt: v => Math.round(80 + v * 90) }],
  desc: 'A pista é dividida ao meio: você de um lado e o rival Shadow do Duel do outro, cada um com 3 pistas. Uma corda no topo mostra quem está ganhando; heróis nas pontas puxam para o lado deles.',
  bullets: ['Pode usar um teclado MIDI na entrada TRS como segundo jogador', 'A corda é a diferença de pontuação', 'Vencer rende moedas para a loja', 'Mesma perspectiva do FM Hero, em duas metades'],
  draw(g, t, k, st) {
    const bpm = 80 + k[2] * 90, step = t * bpm / 15, hz = 54, YH = 170, spd = 2.4; g.clear(0); g.sky(19, hz, [0, 0, 1, 1, 2]); g.R(0, hz, 240, 143, 0); st.sc = st.sc || [0, 0]; st.pn = st.pn == null ? Math.floor(step) : st.pn; const PAT = ['1010100010101000', '0010001000100010', '1000100010001000']; const sk = [k[1], k[0]];
    while (st.pn < Math.floor(step)) { st.pn++; for (let side = 0; side < 2; side++) for (let l = 0; l < 3; l++) if (PAT[(l + side) % 3][st.pn % 16] === '1' && hs(st.pn * 7 + l + side * 11) < sk[side] + .2) st.sc[side] += 100; }
    const diff = clamp((st.sc[0] - st.sc[1]) / 1500, -1, 1); if (Math.max(...st.sc) > 3000) { st.sc = [0, 0]; }
    for (let side = 0; side < 2; side++) { const cx = side ? 168 : 72, wd = 22, Xs = (X, z) => cx + X / z, Ys = z => hz + (YH - hz) / z; for (let l = 0; l < 3; l++) { const a = (l - 1.5) * wd, b = a + wd; g.poly([[Xs(a, 8), Ys(8)], [Xs(b, 8), Ys(8)], [Xs(b, .8), Ys(.8)], [Xs(a, .8), Ys(.8)]], l & 1 ? 1 : '#241a26'); }
      for (let l = 0; l <= 3; l++) g.line(Xs((l - 1.5) * wd, 8), Ys(8), Xs((l - 1.5) * wd, .8), Ys(.8), 5);
      for (let N = Math.floor(step) - 1; N < Math.floor(step) + 18; N++) for (let l = 0; l < 3; l++) if (PAT[(l + side) % 3][((N % 16) + 16) % 16] === '1') { const dts = (N - step) * 60 / bpm / 4, z = 1 + dts * spd; if (z < .8 || z > 8) continue; const x = Xs((l - 1) * wd, z), y = Ys(z), r = 9 / z; if (r < 1.5) g.R(x, y, 2, 2, [11, 10, 12][l]); else { g.disc(x, y, r + 1, 0); g.disc(x, y, r, [11, 10, 12][l]); if (r > 4) g.px(x - r * .3, y - r * .3, 7); } }
      g.R(Xs(-1.5 * wd, 1), YH - 1, 3 * wd, 2, 7); for (let l = 0; l < 3; l++) { g.ell(Xs((l - 1) * wd, 1), YH + 3, 10, 4, 0); g.ellO(Xs((l - 1) * wd, 1), YH + 3, 10, 4, [11, 10, 12][l]); } }
    g.R(119, hz, 2, 130, 5);
    fig(g.R, 'warrior', 4, 24, { s: 1, t }); fig(g.R, 'warrior', 216, 24, { s: 1, t, solid: 13, noOut: 1 }); g.R(30, 34, 180, 6, 0); g.R(31, 35, 178, 4, UI.off); g.R(120, 35, diff * 89, 4, diff > 0 ? 12 : 8); g.R(120 + diff * 89 - 2, 31, 5, 12, 10); g.txt('YOU ' + st.sc[0], 36, 24, 12, { sz: 8, ol: 0 }); g.txt('SHADOW ' + st.sc[1], 204, 24, 8, { al: 'r', sz: 8, ol: 0 });
    g.panel(8, 176, 224, 16); g.txt(diff > .1 ? 'you are ahead' : diff < -.1 ? 'Shadow is ahead' : 'neck and neck', 18, 180, UI.tx, { sz: 8 });
    g.bar('Duel', 'vs Shadow', Math.round(bpm) + ' bpm'); g.dials(['rival', 'you', 'bpm', 'lead'], [pct(k[0]), pct(k[1]), Math.round(bpm), Math.round(diff * 100)], [k[0], k[1], k[2], .5 + diff / 2]);
  } });

// ------------------------------------------------------------------ Jam Tavern
add({ name: 'Jam Tavern', tag: 'convidados MIDI na taverna', tier: 'n3', an: [240, 125],
  how: ['hold:HOME = menu → TAVERN → Jam'],
  fields: [{ l: 'convidados', d: 'quantos canais MIDI externos estão tocando (1–4).', v: 1, fmt: v => 1 + Math.round(v * 3) }, { l: 'canal', d: 'qual convidado está selecionado (anel dourado).', v: 0, fmt: v => 'ch ' + [2, 5, 10, 12][Math.round(v * 3)] }, { l: 'volume', d: 'nível do convidado selecionado.', v: .7 }, { l: 'bpm', d: 'andamento do grupo (clock MIDI externo).', v: .4, fmt: v => Math.round(70 + v * 110) }],
  desc: 'Uma taverna vista de cima: cada canal MIDI externo é um bardo sentado numa mesa, com seu instrumento. Quando o canal toca uma nota o bardo balança e solta uma nota musical colorida.',
  bullets: ['Mostra quem está tocando o quê quando há vários teclados', 'Usa o roteamento de canais do MIDI IN (TRS ou USB)', 'Pode gravar o convidado numa faixa', 'Barra acima da cabeça = volume do canal'],
  draw(g, t, k, st) {
    const n = 1 + Math.round(k[0] * 3), sel = Math.round(k[1] * 3), vol = k[2], bpm = 70 + k[3] * 110, beat = t * bpm / 60, P = (x, y) => [120 + (x - y) * 22, 56 + (x + y) * 11], CH = [2, 5, 10, 12]; g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]);
    for (let x = 0; x < 7; x++) for (let y = 0; y < 7; y++) { const p = P(x - 1, y - 1); g.poly([[p[0], p[1]], [p[0] + 22, p[1] + 11], [p[0], p[1] + 22], [p[0] - 22, p[1] + 11]], (x + y) & 1 ? 4 : '#5a3a28'); }
    const w0 = P(-1, -1), w1 = P(6, -1), w2 = P(-1, 6); g.poly([w0, w1, [w1[0], w1[1] - 40], [w0[0], w0[1] - 40]], '#4a3c58'); g.poly([w0, w2, [w2[0], w2[1] - 40], [w0[0], w0[1] - 40]], '#2f2840'); const fp = P(2.5, -1); g.R(fp[0] - 20, fp[1] - 30, 40, 30, 6); g.R(fp[0] - 16, fp[1] - 26, 32, 26, 0); const fl = 3 + Math.round(Math.sin(t * 11) * 2); g.poly([[fp[0], fp[1] - 6 - fl * 1.5], [fp[0] - 7, fp[1]], [fp[0] + 7, fp[1]]], 8); g.poly([[fp[0], fp[1] - 3 - fl], [fp[0] - 4, fp[1]], [fp[0] + 4, fp[1]]], 10);
    const seats = [[1, 2], [4, 1.5], [1.5, 4.5], [4.5, 4]], ins = ['lute', 'drum', 'flute', 'horn'];
    for (let i = 0; i < n; i++) { const [sx, sy] = seats[i], p = P(sx, sy), on = fr(beat * [1, .5, 2, 1][i] + i * .3) < .35, sc = on ? 1 : 0; g.ell(p[0], p[1] + 6, 24, 9, 4); g.ell(p[0], p[1] + 4, 22, 8, 15); g.R(p[0] - 3, p[1] + 4, 6, 10, 4); T.chibi(g, CLS[i], p[0], p[1] + 2 - (on ? 2 : 0), false, t); g.R(p[0] - 22, p[1] - 40, 44, 5, 0); g.R(p[0] - 21, p[1] - 39, 42, 3, UI.off); g.R(p[0] - 21, p[1] - 39, 42 * (i === sel ? vol : .6), 3, UI.t[i]); g.txt('ch ' + CH[i], p[0], p[1] - 52, i === sel ? 10 : UI.dim, { al: 'c', sz: 8 }); if (i === sel) g.ellO(p[0], p[1] + 4, 28, 11, 10); if (on) g.txt(['♪', '♫'][i & 1], p[0] + 14, p[1] - 34 - (fr(beat * 2) * 8), UI.t[i], { sz: 12 }); }
    g.panel(8, 170, 224, 22); g.txt(n + ' guests · selected ch ' + CH[sel] + ' · vol ' + pct(vol) + '%', 18, 174, UI.tx); g.txt('external clock ' + Math.round(bpm) + ' bpm', 18, 183, UI.dim);
    g.bar('Jam Tavern', 'MIDI guests', n + ' / 4'); g.dials(['guests', 'channel', 'volume', 'bpm'], [n, 'ch ' + CH[sel], pct(vol), Math.round(bpm)], k);
  } });
// ------------------------------------------------------------------ Spectrum Sky
add({ name: 'Spectrum Sky', tag: 'espectro como paisagem noturna', tier: 'n3', an: [240, 150],
  how: ['hold:HOME = menu → TAVERN → Sky'],
  fields: [{ l: 'bandas', d: 'quantas faixas de frequência (8, 12 ou 16).', v: 1, fmt: v => [8, 12, 16][Math.round(v * 2)] }, { l: 'suavização', d: 'quão rápido as barras caem (alta = mais suave).', v: .5 }, { l: 'graves', d: 'quanto os graves (kick) sacodem a cena e a lua.', v: .6 }],
  desc: 'O espectro do som vira uma noite no lago: as barras levantam as montanhas da frente (graves à esquerda, agudos à direita), uma aurora de cortinas de luz dança acima e tudo se reflete na água com ondulações. Os graves fazem a lua pulsar.',
  bullets: ['Precisa de um hook leve de filtros em 8 a 16 bandas', 'Três camadas de montanhas com parallax; só a da frente segue o espectro', 'Aurora e reflexo desenhados com faixas de poucos pixels', 'Aqui o espectro é simulado com um kick e ruído'],
  draw(g, t, k, st) {
    const nb = [8, 12, 16][Math.round(k[0] * 2)], sm = .5 + k[1] * .45, kick = fr(t * 2.1), bass = (1 - kick) * k[2]; st.v = st.v || []; g.clear(0); g.sky(19, 120, [0, 0, 1, 1, 2, 13]);
    for (let i = 0; i < 46; i++) if (Math.sin(t * 2 + i * 3) > -.7) g.px(hs(i) * 240, 22 + hs(i + 4) * 70, i & 1 ? 7 : 6);
    const val = []; for (let i = 0; i < nb; i++) { const lo = i / nb, tgt = clamp((.55 - lo * .35) * (.5 + .5 * hs(Math.floor(t * 8) + i * 3.7)) + (i < 2 ? bass * .8 : 0) + .05, 0, 1); st.v[i] = (st.v[i] || 0) * sm + tgt * (1 - sm); val.push(st.v[i]); }
    const mr = 14 + bass * 4; g.disc(190, 52, mr + 4, 1); g.disc(190, 52, mr, 7); g.disc(195, 49, mr - 3, 0); g.px(186, 56, 6); g.px(190, 59, 6);
    for (let c = 0; c < 2; c++) for (let x = 0; x < 240; x += 3) { const w = Math.sin(x * .035 + t * .6 + c * 1.7) * 14 + Math.sin(x * .08 - t * .9 + c) * 6, top = 34 + c * 16 + w * .6, hgt = 22 + Math.sin(x * .05 + c + t * .4) * 8; for (let y = 0; y < hgt; y += 3) g.R(x, top + y, 3, 2, y < hgt * .3 ? 11 : y < hgt * .7 ? 12 : 13); }
    const mt = (amp, base, col, ph) => { for (let x = 0; x < 240; x++) { const h = amp + Math.sin(x * .03 + ph) * amp * .5 + Math.sin(x * .09 + ph * 2) * amp * .2; g.R(x, base - h, 1, h + 1, col); } };
    mt(22, 124, '#2a2640', 1); mt(18, 126, '#1e1a30', 3);
    const bw = 240 / nb; for (let x = 0; x < 240; x++) { const f = x / bw, i = Math.min(nb - 1, Math.floor(f)), j = Math.min(nb - 1, i + 1), h = lerp(val[i], val[j], f - i) * 56 + 12; g.R(x, 128 - h, 1, h, x & 1 ? '#161224' : '#120e1e'); g.R(x, 128 - h, 1, 2, h > 44 ? 7 : 13); }
    g.R(0, 128, 240, 69, '#0d0a18'); for (let y = 130; y < 197; y += 2) { const d = (y - 128) / 69, off = Math.sin(y * .3 + t * 2) * (1 + d * 3); for (let x = 0; x < 240; x += 2) { const f = (x + off) / bw, i = Math.min(nb - 1, Math.max(0, Math.floor(f))), hh = val[i] * 56 + 12, mirror = (y - 128) * 1.1; if (mirror < hh && ((x + y) & 3) === 0) g.px(x, y, '#2a2640'); } if (y % 6 === 0) g.R(40 + hs(y) * 160, y, 14, 1, 13); }
    g.R(0, 128, 240, 1, 13);
    g.bar('Sky', 'night lake', nb + ' bands'); g.dials(['bands', 'smooth', 'bass', 'peak'], [nb, pct(sm), pct(k[2]), pct(Math.max(...val))], [k[0], k[1], k[2], Math.max(...val)]);
  } });
})(window);
