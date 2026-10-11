// FM1 Quest lab — TRACK FX · CASTELO: the filter of the active track (the one ALGORITHM selected), drawn as a war field.
//   4 horizontal lanes = IN level · LPF · HPF · OUT level (KNOB 1–4). Each lane is a group of little soldiers marching from the castle: the more of the effect, the more soldiers and the further they advance.
//   They shake with the track's own rhythm. On the far side the Red Wyvern lands and spits fire (attack 2) at them. The knobs really drive the engine (a high-pass and a low-pass per track + input and output levels).
(function (G) {
'use strict';
const T = G.GFX; if (!T) return; const { add, UI, clamp, lerp, hs } = T, HC = ['#5a8ad0', '#7ab04e', '#f0c860', '#e0803a'];
const LANE = [['IN', '#9ad0ff'], ['LPF', '#7ab04e'], ['HPF', '#f0c860'], ['OUT', '#e0803a']];
const hz = f => f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + 'k' : Math.round(f) + '';
const FX = ['inp', 'lpf', 'hpf', 'out'];
add({ name: 'Track FX · Castelo', tag: 'filtro e níveis da faixa ativa: soldadinhos marchando', tier: 'sys', an: [240, 150],
  how: ['tap:FX (várias vezes) = Sends · Slicer · Delay · Reverb · Track FX', 'turn:ALGORITHM = escolhe a faixa', 'turn:KNOB 1–4 = IN · LPF · HPF · OUT'],
  fields: [{ l: 'IN', d: 'nível de entrada da faixa antes dos filtros.', v: 1, fmt: v => Math.round(v * 100) + '%' }, { l: 'LPF', d: 'filtro passa-baixa: todo aberto à direita; para a esquerda corta os agudos.', v: 1, fmt: v => hz(250 * Math.pow(80, v)) + 'Hz' }, { l: 'HPF', d: 'filtro passa-alta: desligado à esquerda; para a direita corta os graves.', v: 0, fmt: v => hz(10 * Math.pow(400, v)) + 'Hz' }, { l: 'OUT', d: 'nível de saída da faixa, depois dos filtros.', v: 1, fmt: v => Math.round(v * 100) + '%' }],
  desc: 'O filtro da faixa ativa, como no EP-133: nível de entrada, passa-baixa, passa-alta e nível de saída. Cada um é uma fileira horizontal de soldadinhos saindo do castelo; quanto mais efeito, mais soldados e mais longe eles avançam, e eles vibram com o ritmo da faixa. Do outro lado do campo o Red Wyvern pousa e cospe fogo neles. Mudou de faixa com o ALGORITHM, os soldados mostram a configuração dela.',
  bullets: ['Quatro fileiras = IN · LPF · HPF · OUT da faixa selecionada (cada faixa guarda o seu)', 'LPF e HPF valem no som de verdade (filtros por faixa no motor)', 'Os soldados vibram no ritmo da faixa; o Wyvern só decora o campo', 'Barato de desenhar: retângulos pequenos'],
  draw(g, t, k, st) {
    const E = G.Engine, S = E && E.S, sel = S ? S.sel : 0, tr = S && S.tracks[sel];
    if (tr) { tr.fx = tr.fx || { inp: 1, lpf: 1, hpf: 0, out: 1 }; if (st.sel !== sel) { st.sel = sel; FX.forEach((n, i) => { k[i] = tr.fx[n]; }); } else { let ch = false; FX.forEach((n, i) => { if (Math.abs(tr.fx[n] - k[i]) > .004) { tr.fx[n] = k[i]; ch = true; } }); if (ch) E.applyMix(); } }
    const L = G.VIZLEV ? G.VIZLEV(t, st) : { e: [.5, .5, .5, .5], beat: .5 }, env = L.e[sel] || 0, col = HC[sel];
    g.clear('#14101a'); g.R(0, 19, 240, 170, '#2a3a2a'); g.sky(19, 52, ['#7fb3ff', '#9cc6ff', '#b8d8ff', '#d0e6ff', '#e4f0ff']);
    for (let y = 56; y < 188; y += 6) g.R(0, y, 240, 1, '#233023');
    // lanes: ground bands
    const y0 = 52, LH = 34; for (let i = 0; i < 4; i++) { const y = y0 + i * LH; g.R(0, y + LH - 2, 240, 2, '#1c2a1c'); g.R(40, y + 6, 200, 1, '#33473a'); g.txt(LANE[i][0], 46, y + 2, LANE[i][1], { sz: 8, nofit: true }); }
    // the castle: a tall wall with a gate on every lane
    g.R(0, 40, 38, 148, '#6a6a7a'); g.R(0, 40, 38, 3, '#8a8a9a'); for (let x = 0; x < 38; x += 8) g.R(x, 34, 5, 7, '#6a6a7a'); for (let y = 52; y < 188; y += 8) g.R(0, y, 38, 1, '#585868'); g.R(30, 40, 8, 148, '#4a4a58');
    for (let i = 0; i < 4; i++) { const y = y0 + i * LH; g.R(6, y + 8, 18, 22, '#14101a'); g.R(7, y + 9, 16, 21, '#3a2a1c'); g.R(14, y + 9, 1, 21, '#14101a'); g.R(5, y + 3, 20, 3, LANE[i][1]); }
    g.R(10, 22, 4, 12, '#a8322a'); g.poly([[14, 22], [30, 27], [14, 32]], col);        // the banner in the colour of the selected track
    // soldiers: n grows with the value, the front advances with it, they shake with the rhythm
    const V = [k[0], k[1], 1 - k[2], k[3]];                 // LPF: open = lots of "brightness"; HPF: more = fewer low soldiers: shown inverted so that "less bass" is a thinner column
    for (let i = 0; i < 4; i++) { const v = clamp(V[i], 0, 1), n = 2 + Math.round(v * 6), front = 48 + v * 112, y = y0 + i * LH + LH - 4; for (let s = 0; s < n; s++) { const x = front - s * 8 + Math.round(Math.sin(t * 2 + s) * .6), j = Math.round(Math.sin(t * 24 + s * 1.7 + i) * env * 2), c = LANE[i][1]; g.R(x, y - 12 + j, 5, 6, c); g.R(x + 1, y - 15 + j, 3, 3, '#cfc8d8'); g.R(x + 1, y - 6 + j, 1, 6, '#2a2030'); g.R(x + 3, y - 6 + j, 1, 6, '#2a2030'); g.R(x + 5, y - 16 + j, 1, 12, '#cfc8d8'); } }
    // the Red Wyvern on the far side: lands, then hurt (60%) or attack 2 (40%) at random
    const W = G.WYV; if (W && W.ready) { const wt = t % 40, LAND = .12, tt = wt - (LAND * 5 + .5); let anim = 'land', fi = Math.min(4, Math.floor(wt / LAND)); if (wt >= LAND * 5) { anim = 'hurt'; fi = 0; if (tt >= 0) { let acc = 0; for (let n = 0; n < 200; n++) { const a = hs(n * 5.3 + 1.1) >= .6, len = a ? 1.2 : 1.5; if (tt < acc + len) { anim = a ? 'atk' : 'hurt'; fi = a ? Math.min(9, Math.floor((tt - acc) / .12)) : Math.floor((tt - acc) * 8) % 4; break; } acc += len; } } }
      g.c.save(); g.c.translate(214, 150); g.c.scale(.62, .62); W.draw(g.c, anim, fi, 0, 0, true); g.c.restore(); g.c.fillStyle = 'rgba(0,0,0,.3)'; g.c.fillRect(176, 151, 70, 3); if (anim === 'atk' && fi >= 3) { g.c.fillStyle = 'rgba(255,150,40,.10)'; g.c.fillRect(40, 40, 200, 148); } }
    g.panel(8, 170, 224, 16); g.txt('faixa ' + (sel + 1) + ' · ' + ['ACID 303', 'DUB CHORD', 'ATMOS PAD', 'TECHNO'][sel], 16, 174, col, { sz: 8, nofit: true }); g.txt('LPF ' + hz(250 * Math.pow(80, k[1])) + 'Hz · HPF ' + hz(10 * Math.pow(400, k[2])) + 'Hz', 224, 174, UI.dim, { sz: 8, al: 'r', nofit: true });
    g.bar('Track FX', 'faixa ' + (sel + 1), 'castelo'); g.dials(['IN', 'LPF', 'HPF', 'OUT'], [Math.round(k[0] * 100) + '%', hz(250 * Math.pow(80, k[1])), hz(10 * Math.pow(400, k[2])), Math.round(k[3] * 100) + '%'], k);
  } });
})(window);
