// FM1 Quest lab — new screens, batch 3: FM Hero (rhythm), Piano Hero, FM School, Importer, Zones.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, PAL = Sc.PALS['1c'], { add, UI, TAU, clamp, lerp, fr, ease, hs, outBack, shade, floor7 } = T, fig = Sc.fig;
const pct = v => Math.round(v * 100), HEX = i => PAL[i];

// ------------------------------------------------------------------ 16 · FM Hero (rhythm game on a 3D highway)
const LANEC = [11, 8, 10, 12, 9], CHART = ['1000100010001000100010001001000', '0000100000001000000010000000100', '0010001000100010001000100010001', '0000001000000010000000100000011', '1000000010000000100000001000000'];
const SONGS = [['Dungeon Groove', 121, CHART.map(r => (r + '0'.repeat(40)).slice(0, 32))], ['Boss Rush', 150, ['1010101010101010', '0100010001000100', '0010001000100010', '0001000100010001', '1000100010001000'].map(r => r + r)], ['Lofi Tavern', 80, ['1000000010000000', '0000100000001000', '0010000000100100', '0000001000000010', '1000000000001000'].map(r => r + r)], ['Chip Quest', 120, ['1000100010001000', '0100010001000100', '0010001000100010', '0001000100010001', '1000000010000000'].map(r => r + r)], ['Slow Ballad', 90, ['1000000000000000', '0000100000000000', '0000000010000000', '0000000000001000', '1000000010000000'].map(r => r + r)]];
let CHL = CHART.map(s => (s + '0'.repeat(40)).slice(0, 32)), CLEN = 32, CHSRC = 'chart de exemplo';
function parseMidi(buf) {
  const d = new DataView(buf); let p = 0; const str = n => { let r = ''; for (let i = 0; i < n; i++) r += String.fromCharCode(d.getUint8(p + i)); p += n; return r; };
  if (str(4) !== 'MThd') throw new Error('não é um .mid'); p += 4; p += 2; const nt = d.getUint16(p); p += 2; const ppq = d.getUint16(p); p += 2; const notes = []; let tempo = 0;
  for (let t = 0; t < nt; t++) { if (str(4) !== 'MTrk') break; const len = d.getUint32(p); p += 4; const end = p + len; let tick = 0, run = 0;
    while (p < end) { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 127); } while (b & 128); tick += v; let st = d.getUint8(p); if (st & 128) { run = st; p++; } else st = run; const k = st & 240;
      if (st === 255) { const ty = d.getUint8(p++); let l = 0, bb; do { bb = d.getUint8(p++); l = (l << 7) | (bb & 127); } while (bb & 128); if (ty === 81 && l === 3 && !tempo) tempo = (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2); p += l; }
      else if (st === 240 || st === 247) { let l = 0, bb; do { bb = d.getUint8(p++); l = (l << 7) | (bb & 127); } while (bb & 128); p += l; }
      else if (k === 192 || k === 208) p += 1; else { const a1 = d.getUint8(p++), a2 = d.getUint8(p++); if (k === 144 && a2 > 0 && (st & 15) !== 9) notes.push({ tick, note: a1 }); } }
    p = end; }
  return { notes, ppq, bpm: tempo ? 60e6 / tempo : 120 };
}
function midiToChart(m) {
  if (!m.notes.length) throw new Error('sem notas'); const t0 = Math.min(...m.notes.map(n => n.tick)), ps = [...new Set(m.notes.map(n => n.note))].sort((a, b) => a - b), len = 64, ch = Array.from({ length: 5 }, () => Array(len).fill('0'));
  m.notes.forEach(n => { const st = Math.round((n.tick - t0) / m.ppq * 4); if (st < 0 || st >= len) return; const lane = Math.min(4, Math.floor(ps.indexOf(n.note) * 5 / ps.length)); ch[lane][st] = '1'; }); return ch.map(r => r.join(''));
}
add({ name: 'FM Hero', tag: 'notas descendo em perspectiva', tier: 'tr', an: [190, 118],
  how: ['hold:HOME = abre o menu', 'tap:PLAY = GAMES → FM Hero (toca o padrão do projeto)', 'key:1–5 = as 5 pistas ficam nas teclas 1–5 (proposta)'],
  fields: [{ l: 'velocidade', d: 'quão rápido as notas descem. No mínimo vira modo ESPERA: a nota para na linha e só avança quando você aperta a tecla certa (tecla errada não faz nada).', v: .45, fmt: v => v < .03 ? 'ESPERA' : (1.2 + v * 2.2).toFixed(1) + '×' }, { l: 'bpm', d: 'andamento do chart.', v: .45, fmt: v => Math.round(80 + v * 90) }, { l: 'habilidade', d: 'precisão do jogador de demonstração (mais baixa = mais erros, mais "hit" e combo quebrando). Ignorada quando você joga.', v: .65 }, { l: 'janela', d: 'tolerância de tempo: fácil aceita mais "crit"; difícil exige precisão (±30 ms a ±70 ms).', v: .5, fmt: v => ['difícil', 'normal', 'fácil'][Math.min(2, Math.floor(v * 3))] }],
  desc: 'Cinco pistas em perspectiva real (1/z): as notas nascem no horizonte, crescem e passam pela linha de acerto. Acertos viram golpes de RPG: CRIT (acerto perfeito), HIT (perto) e MISS. À esquerda, uma poção enche com os acertos: o fundo pulsa no tempo da música e as camadas seguem as cores de crit, hit e miss.',
  bullets: ['Chart vem do próprio padrão do projeto, de um MIDI importado (botão abaixo) ou de uma lição', 'CRIT = dentro da janela curta · HIT = perto, mas fora dela · MISS = fora ou sem tecla', 'Poção: nível = combo acumulado; camadas = proporção de crit (ouro), hit (verde) e miss (vermelho); sequência longa de crit cria nuvens coloridas', 'Dá para jogar de verdade: teclas A S D F G do computador ou as teclas do FM-1 por USB MIDI', 'Só as notas, linhas e os fãs animam: o resto do cenário é estático (menos SPI)'],
  extra(tile) {
    const st = tile.st; const row = document.createElement('div'); row.className = 'ctl'; row.style.cssText = 'flex-direction:row;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;color:var(--dim)';
    const live = document.createElement('button'); live.textContent = 'jogar eu mesmo (A S D F G / FM-1)'; live.onclick = () => { st.live = !st.live; live.classList.toggle('on', st.live); st.reset = true; };
    const f = document.createElement('input'); f.type = 'file'; f.accept = '.mid,.midi'; f.style.maxWidth = '170px'; const msg = document.createElement('span'); msg.textContent = 'chart: exemplo';
    f.onchange = async () => { try { const m = parseMidi(await f.files[0].arrayBuffer()); CHL = midiToChart(m); CLEN = CHL[0].length; CHSRC = f.files[0].name; msg.textContent = 'chart: ' + CHSRC + ' · ' + Math.round(m.bpm) + ' bpm'; const inp = tile.el.querySelector('input[data-i="1"]'); inp.value = clamp((m.bpm - 80) / 90, 0, 1); tile.k[1] = +inp.value; tile.upd(); st.reset = true; } catch (e) { msg.textContent = 'erro: ' + e.message; } };
    const sb = document.createElement('button'); sb.textContent = 'chart de exemplo'; sb.onclick = () => { CHL = CHART.map(s => (s + '0'.repeat(40)).slice(0, 32)); CLEN = 32; CHSRC = 'exemplo'; msg.textContent = 'chart: exemplo'; st.reset = true; };
    const nm = document.createElement('span'); nm.style.cssText = 'color:var(--gold)'; st.song = 0;
    const setSong = d => { st.song = (st.song + d + SONGS.length) % SONGS.length; const S0 = SONGS[st.song]; CHL = S0[2]; CLEN = CHL[0].length; CHSRC = S0[0]; nm.textContent = (st.song + 1) + '/' + SONGS.length + ' ' + S0[0]; const inp = tile.el.querySelector('input[data-i="1"]'); inp.value = clamp((S0[1] - 80) / 90, 0, 1); tile.k[1] = +inp.value; tile.upd(); st.reset = true; msg.textContent = ''; };
    const mkb = (txt, d) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = () => setSong(d); return b; };
    nm.textContent = '1/' + SONGS.length + ' ' + SONGS[0][0]; G.GFX.INP.subs.push(ev => { if (ev.type === 'octave' && tile.vis) setSong(ev.d); });
    row.append(mkb('◂ OCT−', -1), nm, mkb('OCT+ ▸', 1), ' · teclas [ e ] também', live, 'importar .mid', f, sb, msg); tile.el.querySelector('.ctl').after(row);
    G.GFX.INP.subs.push(ev => { if (!st.live || ev.lane == null) return; st.press = st.press || []; st.press.push({ lane: ev.lane, at: performance.now() }); });
  },
  draw(g, t, k, st) {
    const wait = k[0] < .03, speed = wait ? 1.6 : 1.2 + k[0] * 2.2, bpm = 80 + k[1] * 90, skill = .45 + k[2] * .55, wsel = Math.min(2, Math.floor(k[3] * 3)), PW = [.03, .045, .07][wsel], hz = 44, YH = 166, stepSec = 60 / bpm / 4, live = !!st.live;
    if (st.lt == null || st.reset) { st.lt = t; st.S = 0; st.proc = -1; st.score = 0; st.combo = 0; st.fill = .15; st.cnt = { p: 1, g: 1, m: 0 }; st.ev = []; st.streak = 0; st.res = {}; st.press = []; st.reset = false; }
    const dt = Math.min(.25, t - st.lt); st.lt = t; let nS = st.S + dt / stepSec; st.waiting = null;
    const pend = N => { for (let l = 0; l < 5; l++) if (CHL[l][((N % CLEN) + CLEN) % CLEN] === '1' && !st.res[N * 5 + l]) return true; return false; };
    if (wait) { const lo = Math.max(0, Math.ceil(st.S - 1e-6)), hi = Math.floor(nS + 1e-6); for (let N = lo; N <= hi; N++) if (pend(N)) { nS = N; st.waiting = N; break; } }
    st.S = nS; const S = st.S, lagS = live ? .14 / stepSec : 0; if (wait) st.proc = Math.floor(S) - 1;
    const jit = (N, l) => (hs(N * 7 + l) - .5) * (.17 - .08 * skill), hit = (N, l) => hs(N * 13 + l * 7) < skill;
    const judge = (res, l) => { if (res === 'p') { st.combo++; st.streak++; st.score += 100 * (1 + Math.min(3, Math.floor(st.combo / 8))); st.fill = Math.min(1, st.fill + .045); st.cnt.p++; st.ev.push({ t, l, r: 'CRIT' }); } else if (res === 'g') { st.combo++; st.streak = 0; st.score += 60 * (1 + Math.min(3, Math.floor(st.combo / 8))); st.fill = Math.min(1, st.fill + .025); st.cnt.g++; st.ev.push({ t, l, r: 'HIT' }); } else { st.combo = 0; st.streak = 0; st.fill = Math.max(.05, st.fill - .1); st.cnt.m++; st.ev.push({ t, l, r: 'MISS' }); } st.cnt.p *= .985; st.cnt.g *= .985; st.cnt.m *= .985; };
    if (wait && st.waiting != null) {
      const N = st.waiting, has = l => CHL[l][((N % CLEN) + CLEN) % CLEN] === '1' && !st.res[N * 5 + l];
      if (live) { for (const pr of st.press.splice(0)) if (has(pr.lane)) { st.res[N * 5 + pr.lane] = 'p'; judge('p', pr.lane); } }
      else { st.wt0 = st.wt0 || t; if (t - st.wt0 > .7) { for (let l = 0; l < 5; l++) if (has(l)) { st.res[N * 5 + l] = 'p'; judge('p', l); } st.wt0 = 0; } }
    } else st.wt0 = 0;
    if (live && !wait) { for (const pr of st.press.splice(0)) { const nowS = S; let best = null, bd = 9; for (let N = Math.floor(nowS - 4); N <= Math.ceil(nowS + 4); N++) { if (CHL[pr.lane][((N % CLEN) + CLEN) % CLEN] !== '1' || st.res[N * 5 + pr.lane]) continue; const d = Math.abs(N - nowS) * stepSec; if (d < bd) { bd = d; best = N; } } if (best != null && bd < .14) { st.res[best * 5 + pr.lane] = bd < PW ? 'p' : 'g'; judge(bd < PW ? 'p' : 'g', pr.lane); } } }
    while (!wait && st.proc < Math.floor(S - lagS)) { st.proc++; const N = st.proc; for (let l = 0; l < 5; l++) if (CHL[l][((N % CLEN) + CLEN) % CLEN] === '1') { if (live) { if (!st.res[N * 5 + l]) { st.res[N * 5 + l] = 'm'; judge('m', l); } } else if (hit(N, l)) { const e = Math.abs(jit(N, l)); st.res[N * 5 + l] = e < PW ? 'p' : 'g'; judge(e < PW ? 'p' : 'g', l); } else { st.res[N * 5 + l] = 'm'; judge('m', l); } } }
    st.ev = st.ev.filter(e => t - e.t < .62); const od = st.combo >= 16, beatT = (S / 4) % 1;
    g.clear(0); g.R(0, 19, 240, hz - 19, '#3a2418'); for (let x = 0; x < 240; x += 18) { g.R(x, 19, 1, hz - 19, '#2a1810'); g.R(x + 9, 19, 1, hz - 19, '#46301e'); } g.R(0, 19, 240, 5, '#1e120c'); g.R(0, hz - 3, 240, 3, '#1e120c');
    for (const lx of [44, 120, 196]) { g.R(lx, 24, 1, 6, 5); g.R(lx - 3, 30, 7, 8, 4); const fl = 2 + Math.round(Math.sin(t * 9 + lx)); g.R(lx - 1, 32, 3, 5 + fl, 10); for (let py = -9; py <= 9; py++) for (let px = -14; px <= 14; px++) { const d = Math.hypot(px / 14, py / 9); if (d < 1 && ((px + py) & 1) === 0) g.px(lx + px, 34 + py, d < .5 ? 9 : 4); } }
    for (let i = 0; i < 5; i++) { const x = 6 + i * 11; g.R(x, 28, 6, 7, [7, 15, 9, 15, 7][i]); g.R(x + 6, 29, 2, 4, 15); g.R(x + 196 - i * 0 + 0, 28, 6, 7, [15, 7, 9, 7, 15][i]); }
    g.R(2, 36, 62, 2, 4); g.R(176, 36, 62, 2, 4); for (const bx of [4, 224]) { g.ell(bx + 6, hz - 6, 8, 5, 4); g.R(bx - 2, hz - 12, 16, 12, 4); g.R(bx - 2, hz - 8, 16, 1, 0); g.R(bx - 2, hz - 3, 16, 1, 0); }
    const PAT = [['horn', 24], ['wiz', 74], ['elf', 166], ['hood', 214], ['top', 96], ['plain', 144]];
    for (const [ty, px] of PAT) { const bob = Math.sin(t * 2.4 + px) > .6 ? 1 : 0, y = hz - 6 - bob, C = '#120a0e'; g.ell(px, y + 2, 9, 7, C); g.disc(px, y - 9, 5, C); if (ty === 'horn') { g.R(px - 8, y - 14, 3, 2, C); g.R(px + 5, y - 14, 3, 2, C); g.R(px - 8, y - 17, 2, 4, C); g.R(px + 6, y - 17, 2, 4, C); } if (ty === 'wiz') g.poly([[px, y - 28], [px - 8, y - 12], [px + 8, y - 12]], C); if (ty === 'elf') { g.poly([[px - 5, y - 11], [px - 11, y - 14], [px - 5, y - 8]], C); g.poly([[px + 5, y - 11], [px + 11, y - 14], [px + 5, y - 8]], C); } if (ty === 'hood') g.poly([[px - 7, y - 6], [px, y - 19], [px + 7, y - 6]], C); if (ty === 'top') { g.R(px - 5, y - 20, 10, 8, C); g.R(px - 8, y - 13, 16, 2, C); } if (Math.sin(t * 1.3 + px * 3) > .75) g.R(px + 8, y - 4, 4, 5, '#2a1810'); g.px(px - 2, y - 10, 10); g.px(px + 2, y - 10, 10); }
    g.R(0, hz, 240, 197 - hz, '#1a100c'); floor7(g, hz, 197, 120, 34, 120, 0, 30, '#2a1a12', '#221410');
    const XW = 95, Xs = (X, z) => 120 + X / z, Ys = z => hz + (YH - hz) / z, ZM = 9;
    for (let l = 0; l < 5; l++) { const a = (l - 2.5) * 38, b = a + 38; g.poly([[Xs(a, ZM), Ys(ZM)], [Xs(b, ZM), Ys(ZM)], [Xs(b, .72), Ys(.72)], [Xs(a, .72), Ys(.72)]], od ? '#1a2840' : (l & 1 ? 1 : '#241a26')); }
    for (let l = 0; l <= 5; l++) { const X = (l - 2.5) * 38; g.line(Xs(X, ZM), Ys(ZM), Xs(X, .72), Ys(.72), od ? 12 : 5); }
    for (const sd of [-1, 1]) g.line(Xs(sd * (XW + 3), ZM), Ys(ZM), Xs(sd * (XW + 3), .72), Ys(.72), od ? 12 : 13);
    const bt0 = Math.floor(S / 4); for (let b = bt0; b < bt0 + 12; b++) { const dtS = (b * 4 - S) * stepSec, z = 1 + dtS * speed; if (z < .74 || z > ZM) continue; g.line(Xs(-XW, z), Ys(z), Xs(XW, z), Ys(z), b % 4 === 0 ? 6 : 5); }
    const N0 = Math.floor(S) - 4, N1 = Math.floor(S + (ZM - 1) / speed / stepSec) + 1, notes = [];
    for (let N = N0; N <= N1; N++) for (let l = 0; l < 5; l++) if (CHL[l][((N % CLEN) + CLEN) % CLEN] === '1') { const dtS = (N - S) * stepSec, z = 1 + dtS * speed; if (z < .74 || z > ZM) continue; const r = st.res[N * 5 + l]; notes.push({ N, l, z, r, sus: l === 3 && N % 8 === 6 ? 2 : 0, dtS }); }
    notes.sort((a, b) => b.z - a.z);
    for (const n of notes) {
      const X = (n.l - 2) * 38, c = LANEC[n.l];
      if (n.sus && n.dtS > -.2) { const z2 = 1 + (n.dtS + n.sus * stepSec) * speed, zz = Math.max(1, n.z); g.poly([[Xs(X - 4, zz), Ys(zz)], [Xs(X + 4, zz), Ys(zz)], [Xs(X + 4, Math.max(1, z2)), Ys(Math.max(1, z2))], [Xs(X - 4, Math.max(1, z2)), Ys(Math.max(1, z2))]], shade(PAL[c], .8)); }
      if (n.r === 'p' || n.r === 'g') continue; const x = Xs(X, n.z), y = Ys(n.z), r = 13 / n.z, miss = n.r === 'm' || (n.dtS < -.1 && !live && !n.r);
      if (r < 1.6) { g.R(x, y, 2, 2, miss ? 6 : c); continue; }
      g.disc(x, y, r + 1, 0); g.disc(x, y, r, miss ? 6 : c); g.disc(x, y + r * .15, r * .72, miss ? 5 : shade(PAL[c], .75)); if (r > 4) g.disc(x - r * .3, y - r * .3, Math.max(1, r * .28), 7);
    }
    g.R(Xs(-XW, 1) - 2, YH - 1, XW * 2 + 4, 2, od ? 12 : 7);
    for (let l = 0; l < 5; l++) { const X = (l - 2) * 38, x = Xs(X, 1), c = LANEC[l], ev = st.ev.filter(e => e.l === l && t - e.t < .14).length; g.ell(x, YH + 4, 17, 6, 0); g.ell(x, YH + 2, 15, 5, ev ? c : 1); g.ellO(x, YH + 2, 15, 5, ev ? 7 : c); g.txt('ASDFG'[l], x, YH - 1, ev ? 0 : UI.dim, { al: 'c', sz: 8 }); if (ev) { g.disc(x, YH - 4, 7, 7); g.poly([[x - 8, YH - 2], [x, YH - 26 - Math.sin(t * 40) * 3], [x + 8, YH - 2]], 10); g.poly([[x - 4, YH - 2], [x, YH - 16], [x + 4, YH - 2]], 7); } }
    for (const e of st.ev) { if (e.a == null) e.a = (hs(e.t * 91 + e.l) > .5 ? 1 : -1) * (.12 + hs(e.t * 37) * .16); const u = (t - e.t) / .6, x = Xs((e.l - 2) * 38, 1), y = YH - 40 - ease(clamp(u, 0, 1)) * 26, col = e.r === 'CRIT' ? 10 : e.r === 'HIT' ? 11 : 8, al = u < .55 ? 1 : clamp((1 - u) / .45, 0, 1), ang = e.a * (1 - Math.exp(-u * 7)); g.c.globalAlpha = al; g.txt(e.r, x, y, col, { al: 'c', sz: 12, ls: 2, ol: 0, rot: ang }); g.c.globalAlpha = 1; }
    g.panel(40, 22, 84, 28); g.txt('SCORE', 46, 26, UI.dim, { sz: 8 }); g.txt(String(Math.round(st.score)).padStart(6, '0'), 118, 26, UI.tx, { al: 'r' }); g.txt('combo', 46, 38, UI.dim, { sz: 8 }); g.txt(st.combo, 118, 38, od ? 12 : 10, { al: 'r' });
    const mul = 1 + Math.min(3, Math.floor(st.combo / 8)); g.txt('x' + mul, 216, 24, od ? 12 : 10, { al: 'r', f: 't', sz: 16, ol: 0 }); for (let i = 0; i < 4; i++) g.R(190 + i * 5, 44, 4, 4, (st.combo % 8) * 4 / 8 > i || mul > i + 1 ? UI.t[i] : UI.off);
    // vertical potion bottle (gold collar, cork, heart): layers = miss (red) / hit (green) / crit (gold); glass pulses with the beat
    const BX = 24, BTOP = 74, BBOT = 150, BW = 12, tot = st.cnt.p + st.cnt.g + st.cnt.m, fh = (BBOT - 86) * st.fill, hp = fh * st.cnt.p / tot, hg = fh * st.cnt.g / tot, hm = fh * st.cnt.m / tot;
    g.ell(BX, BBOT + 3, 18, 3, 0);
    const outline = [[BX - 5, BTOP], [BX + 5, BTOP], [BX + 5, BTOP + 14], [BX + BW, BTOP + 26], [BX + BW, BBOT - 4], [BX + BW - 4, BBOT], [BX - BW + 4, BBOT], [BX - BW, BBOT - 4], [BX - BW, BTOP + 26], [BX - 5, BTOP + 14]];
    g.poly(outline.map(p => [BX + (p[0] - BX) * 1.18, p[1]]), 10); g.poly(outline, 0); g.poly(outline.map(p => [BX + (p[0] - BX) * .86, p[1] + (p[1] > BTOP ? 1 : 0)]), beatT < .25 ? '#3a2850' : '#241a36');
    const rowW = y => y < BTOP + 14 ? 4 : y < BTOP + 26 ? 4 + (y - BTOP - 14) * (BW - 5) / 12 : BW - 2;
    for (let yy = BBOT - 2; yy > BTOP + 4; yy--) { const from = BBOT - 2 - yy; if (from > fh) break; const w = Math.floor(rowW(yy) - 1 + (yy > BBOT - 6 ? -(yy - (BBOT - 6)) * .5 : 0)), c = from < hm ? 8 : from < hm + hg ? 11 : 10; g.R(BX - w, yy, 2 * w + 1, 1, c); if (from > fh - 2) g.R(BX - w, yy, 2 * w + 1, 1, 7); }
    g.R(BX - 9, BTOP + 30, 2, 44, 7); g.px(BX - 8, BTOP + 27, 7); g.R(BX - 3, BTOP - 7, 7, 8, 4); g.R(BX - 3, BTOP - 7, 7, 2, 15); g.R(BX - 7, BTOP + 12, 15, 3, 10); g.R(BX - 7, BTOP + 12, 15, 1, 7);
    for (let q = 0; q < 3; q++) { const a = fr(t * .5 + q / 3); g.px(BX - 5 + q * 5, BBOT - 5 - a * Math.min(fh, 40), a < .5 ? 7 : 15); }
    for (const sd of [-1, 1]) { g.line(BX + sd * 13, BTOP + 28, BX + sd * 17, BTOP + 20, 10); g.line(BX + sd * 17, BTOP + 20, BX + sd * 14, BTOP + 15, 10); g.px(BX + sd * 14, BTOP + 14, 10); }
    g.poly([[BX, BTOP - 12], [BX - 5, BTOP - 16], [BX - 8, BTOP - 12], [BX - 5, BTOP - 9], [BX, BTOP - 5]], 8); g.poly([[BX, BTOP - 12], [BX + 5, BTOP - 16], [BX + 8, BTOP - 12], [BX + 5, BTOP - 9], [BX, BTOP - 5]], shade(PAL[8], .7)); g.px(BX - 4, BTOP - 14, 14);
    g.txt(Math.round(st.fill * 100) + '%', BX, BBOT + 6, UI.tx, { al: 'c', sz: 8 });
    if (od) g.txt('OVERDRIVE', 120, 52, 12, { al: 'c', ol: 0 });
    g.panel(40, 170, 160, 22); g.txt('CRIT ' + Math.round(st.cnt.p) + '   HIT ' + Math.round(st.cnt.g) + '   MISS ' + Math.round(st.cnt.m), 48, 174, UI.tx, { sz: 8 }); g.txt((live ? 'você joga' : 'demo') + ' · ' + CHSRC + ' · janela ' + ['difícil', 'normal', 'fácil'][wsel], 48, 183, UI.dim, { sz: 8 });
    g.bar('FM Hero', CHSRC.slice(0, 16), wait ? 'WAIT' : Math.round(bpm) + ' bpm');
    g.dials(['speed', 'bpm', 'skill', 'window'], [wait ? 'WAIT' : speed.toFixed(1) + '×', Math.round(bpm), live ? '—' : pct(skill), ['hard', 'norm', 'easy'][wsel]], k);
  } });

// ------------------------------------------------------------------ 17 · Piano Hero (waterfall onto a keyboard)
const RH = [9, 9, 10, 11, 11, 10, 9, 8, 7, 7, 8, 9, 9, 8, 8, 9, 9, 10, 11, 11, 10, 9, 8, 7, 7, 8, 9, 8, 7, 7], FING = [3, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 3, 2, 2];
add({ name: 'Piano Hero', tag: 'cachoeira de notas no teclado', tier: 'tr', an: [240, 128],
  how: ['hold:HOME = abre o menu', 'tap:PLAY = GAMES → Piano Hero', 'key:1–16 = as 16 teclas brancas tocam a música'],
  fields: [{ l: 'tempo', d: 'andamento da música. Em zero vira modo ESPERA: a barra para sobre a tecla e só avança quando você toca a tecla certa (tecla errada não faz nada).', v: .4, fmt: v => v < .03 ? 'ESPERA' : Math.round(60 + v * 80) }, { l: 'música', d: 'qual das 5 músicas de treino cai (use também OCT− / OCT+ ou as teclas [ e ]): Ode à Alegria, Brilha Brilha, Escala, Mary e Jingle.', v: 0, fmt: v => ['Ode', 'Twinkle', 'Escala', 'Mary', 'Jingle'][Math.min(4, Math.round(v * 4))] }, { l: 'mãos', d: 'mão direita, esquerda ou as duas (cores diferentes).', v: 1, fmt: v => ['D', 'E', 'D+E'][Math.min(2, Math.round(v * 2))] }, { l: 'antecedência', d: 'quantos tempos de música você enxerga caindo.', v: .5, fmt: v => (2 + Math.round(v * 6)) + ' tempos' }],
  desc: 'Barras coloridas caem em perspectiva sobre um teclado de 14 teclas brancas (como o Synthesia). Quando a barra encosta, a tecla acende; o número no topo da barra é o dedo sugerido.',
  bullets: ['Cada tecla do FM-1 já é uma nota: a tela só mostra qual vem a seguir', 'Modo lento aprende; modo normal pontua (usa o hook de erro de tempo)', 'Ensina escala, acordes e progressões do bioma atual', 'Cores: azul = mão direita · laranja = mão esquerda'],
  extra(tile) {
    const st = tile.st, row = document.createElement('div'); row.className = 'ctl'; row.style.cssText = 'flex-direction:row;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;color:var(--dim)';
    const b = document.createElement('button'); b.textContent = 'jogar eu mesmo (A S D F G H J K L / FM-1)'; b.onclick = () => { st.live = !st.live; b.classList.toggle('on', st.live); st.lt = null; }; const sm = (d) => { const i = tile.el.querySelector('input[data-i="1"]'); const n = (Math.round(+i.value * 4) + d + 5) % 5; i.value = n / 4; tile.k[1] = n / 4; tile.upd(); }; const mk2 = (txt, d) => { const bb = document.createElement('button'); bb.textContent = txt; bb.onclick = () => sm(d); return bb; }; G.GFX.INP.subs.push(ev => { if (ev.type === 'octave' && tile.vis) sm(ev.d); }); row.append(mk2('◂ OCT−', -1), mk2('OCT+ ▸', 1), b, 'no modo ESPERA só a tecla certa avança'); tile.el.querySelector('.ctl').after(row);
    G.GFX.INP.subs.push(ev => { if (!st.live) return; st.press = st.press || []; if (ev.type === 'white') st.press.push(ev.w); else if (ev.type === 'note') st.press.push((Math.floor(ev.note / 12) - 4) * 7 + [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][ev.note % 12]); });
  },
  draw(g, t, k, st) {
    const MEL = [RH, [7, 7, 11, 11, 12, 12, 11, 10, 10, 9, 9, 8, 8, 7, 11, 11, 10, 10, 9, 9, 8, 11, 11, 10, 10, 9, 9, 8], [7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8], [9, 8, 7, 8, 9, 9, 9, 8, 8, 8, 9, 11, 11], [9, 9, 9, 9, 9, 9, 9, 11, 7, 8, 9]], mel = Math.min(4, Math.round(k[1] * 4)), M = MEL[mel], LM = M.length, wait = k[0] < .03, bpm = wait ? 80 : 60 + k[0] * 80, per = 60 / bpm, la = 2 + Math.round(k[3] * 6), hz = 40, YH = 166, hands = Math.min(2, Math.round(k[2] * 2));
    if (st.lt == null) { st.lt = t; st.B = 0; st.res = {}; st.press = []; } const dtp = Math.min(.25, t - st.lt); st.lt = t; let nB = st.B + dtp / per; st.wn = null;
    const notesAt = n => { const m = ((n % LM) + LM) % LM, arr = []; if (hands !== 1) arr.push(M[m]); if (hands !== 0 && n % 2 === 0) arr.push([0, 4, 3, 4][(n / 2) % 4 | 0]); return arr; }, pendN = n => notesAt(n).some(w => !st.res[n * 100 + w]);
    if (wait) { for (let n = Math.max(0, Math.ceil(st.B - 1e-6)); n <= Math.floor(nB + 1e-6); n++) if (pendN(n)) { nB = n; st.wn = n; break; } } st.B = nB; const B = st.B;
    if (wait && st.wn != null) { const n = st.wn; if (st.live) { for (const w of st.press.splice(0)) if (notesAt(n).includes(w) && !st.res[n * 100 + w]) st.res[n * 100 + w] = 1; } else { st.wt0 = st.wt0 || t; if (t - st.wt0 > .8) { notesAt(n).forEach(w => { st.res[n * 100 + w] = 1; }); st.wt0 = 0; } } } else st.wt0 = 0;
    if (st.live && !wait) { st.hits = st.hits || 0; st.miss = st.miss || 0; st.seen = st.seen || {}; for (const w of st.press.splice(0)) { let best = null, bd = 9; for (let n = Math.floor(B - 1); n <= Math.ceil(B + 1); n++) { if (!notesAt(n).includes(w) || st.res[n * 100 + w]) continue; const d = Math.abs(n - B); if (d < bd) { bd = d; best = n; } } if (best != null && bd < .45) { st.res[best * 100 + w] = 1; st.hits++; } } for (let n = Math.floor(B - 3); n < Math.floor(B - .5); n++) for (const w of notesAt(n)) { const key = n * 100 + w; if (n >= 0 && !st.res[key] && !st.seen[key]) { st.seen[key] = 1; st.miss++; } } }
    g.clear(0); g.sky(19, hz, [0, 0, 1]); for (let i = 0; i < 20; i++) g.px(hs(i) * 240, 20 + hs(i + 2) * 12, i & 1 ? 6 : 5);
    const X = (w, z) => 120 + (14 + w * 16 - 120) / z, Y = z => hz + (YH - hz) / z; // z = 1 at the keys
    g.R(0, hz, 240, 197 - hz, 0);
    for (let w = 0; w < 14; w++) { g.poly([[X(w, 14), Y(14)], [X(w + 1, 14), Y(14)], [X(w + 1, .8), Y(.8)], [X(w, .8), Y(.8)]], w & 1 ? '#2b2338' : '#1d1520'); }
    for (let w = 0; w <= 14; w++) g.line(X(w, 14), Y(14), X(w, .8), Y(.8), 6);
    const nb = Math.floor(B) - 1, lit = new Set(), bars = [];
    for (let n = nb; n < nb + la + 3; n++) { const m = ((n % LM) + LM) % LM, rhN = M[m]; if (hands !== 1) bars.push({ n, w: rhN, len: 1, c: 12, f: FING[m % 15], h: 'R' }); if (hands !== 0 && n % 2 === 0) bars.push({ n, w: [0, 4, 3, 4][(n / 2) % 4 | 0] , len: 2, c: 9, f: 5, h: 'L' }); }
    bars.sort((a, b) => b.n - a.n);
    for (const b of bars) {
      if (st.res[b.n * 100 + b.w]) continue;
      const z0 = 1 + (b.n - B) / la * 6, z1 = 1 + (b.n + b.len * .92 - B) / la * 6; if (z1 < 1) continue; const za = Math.max(1, z0), zb = z1; if (za > 14) continue;
      const pad = .06; const x0a = X(b.w + pad, za), x1a = X(b.w + 1 - pad, za), x0b = X(b.w + pad, Math.min(14, zb)), x1b = X(b.w + 1 - pad, Math.min(14, zb));
      g.poly([[x0b, Y(Math.min(14, zb))], [x1b, Y(Math.min(14, zb))], [x1a, Y(za)], [x0a, Y(za)]], b.c); g.polyO([[x0b, Y(Math.min(14, zb))], [x1b, Y(Math.min(14, zb))], [x1a, Y(za)], [x0a, Y(za)]], 0);
      if (z0 <= 1 && z1 > 1) lit.add(b.w + (b.h === 'R' ? 100 : 0)); const wd = x1a - x0a; if (wd > 9 && za < 3) g.txt(b.f, (x0a + x1a) / 2, Y(za) - 9, 0, { al: 'c' });
    }
    const heldW = new Set([...G.GFX.INP.held].map(m => (Math.floor(m / 12) - 4) * 7 + [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][m % 12])), litW = new Set([...lit].map(v => v % 100)), BK = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
    for (let w = 0; w < 14; w++) { const on = litW.has(w) || heldW.has(w), x = 14 + w * 16, y = on ? 170 : 168; g.R(x, y, 15, 27 - (on ? 2 : 0), 0); g.R(x + 1, y, 13, 26 - (on ? 2 : 0), on ? (heldW.has(w) ? 11 : lit.has(w + 100) ? 12 : 9) : 7); g.R(x + 1, y + 20, 13, 1, 15); }
    for (const w of BK) g.R(14 + w * 16 + 11, 168, 10, 16, 0);
    g.R(0, 165, 240, 3, 4); g.R(0, 165, 240, 1, 10);
    const total = LM, pr = (B % total) / total; g.R(10, 22, 220, 3, UI.off); g.R(10, 22, 220 * pr, 3, 10); g.disc(10 + 220 * pr, 23, 3, 7);
    g.bar('Piano Hero', ['Ode to Joy', 'Twinkle', 'Scale', 'Mary had a lamb', 'Jingle Bells'][mel], 'bar ' + (1 + Math.floor((B % total) / 4)) + '/8');
    g.dials([wait ? 'mode' : 'tempo', 'song', 'hands', 'look-ahead'], [wait ? 'WAIT' : Math.round(bpm), ['Ode', 'Twink', 'Scale', 'Mary', 'Jingle'][mel], ['R', 'L', 'R+L'][hands], la + ' beats'], k);
  } });

// ------------------------------------------------------------------ 18 · FM School
const LESSON = [['Sine', 'one pure tone: no harmonics'], ['Harmonics', 'a saw is a stack of sines'], ['Ratio', 'carrier : modulator sets the pitch colour'], ['Index', 'how far the modulator bends the carrier'], ['Envelope', 'the index can fade: bright then mellow'], ['Feedback', 'an operator modulating itself'], ['Algorithm', 'how the 4 operators are wired'], ['Exam', 'match the target sound by ear']];
function besselJ(n, x) { let s = 0; const N = 24; for (let i = 0; i < N; i++) { const tau = (i + .5) / N * Math.PI; s += Math.cos(n * tau - x * Math.sin(tau)); } return s / N; }
// ------------------------------------------------------------------ 19 · Importer (the scribe's transmutation circle)
const SRC = [['.sf2', 12], ['.mid', 13], ['.wav', 11], ['.mod', 9]], RATE = [11025, 16000, 22050, 32000];
add({ name: 'Importer', tag: 'círculo de transmutação', tier: 'bk', an: [240, 125],
  how: ['hold:SAVE = Importer (OCT+ = Zones, OCT− volta)', 'hold:REC = apaga o slot escolhido', 'knob 3 = slot USR1–3'],
  fields: [{ l: 'fonte', d: 'tipo de arquivo que chega voando: .sf2, .mid, .wav ou .mod.', v: 0, fmt: v => SRC[Math.round(v * 3)][0] }, { l: 'taxa', d: 'taxa de saída: menor = cabe mais som no slot; maior = mais agudo e mais pesado.', v: .5, fmt: v => RATE[Math.round(v * 3)] / 1000 + ' kHz' }, { l: 'slot', d: 'em qual frasco (USR1, USR2 ou USR3) o som é guardado.', v: .5, fmt: v => 'USR' + (1 + Math.round(v * 2)) }],
  desc: 'Um pergaminho chega voando e cai num círculo de transmutação no chão; o escriba o corta, reamostra e comprime em ADPCM e o resultado sai como um frasco de cristal que voa até a prateleira e enche o slot escolhido. O log mostra cada passo e se coube.',
  bullets: ['Lê .sf2/.wav/.mod no computador (o aparelho não decodifica nada disso)', 'Corta a zona, reamostra para 11–32 kHz e comprime em ADPCM 4 bits', 'O nível do frasco é o uso real do slot (~80 KiB)', 'Envia pelo editor web (mesmo canal do upload de samples)'],
  draw(g, t, k, st) {
    const src = SRC[Math.round(k[0] * 3)], rate = RATE[Math.round(k[1] * 3)], slot = Math.round(k[2] * 2), bytes = rate * 1.8 / 2, fill = bytes / 81920, T0 = 2.6, cyc = Math.floor(t / T0), u = (t - cyc * T0) * 4.4 / 2.6; st.fill = st.fill || [0, 0, 0];
    if (st.cy !== cyc) { st.cy = cyc; if (cyc > 0) { st.fill[slot] += fill; if (st.fill[slot] > 1) st.fill[slot] = fill; } }
    G.STORE = G.STORE || { cap: 81920, usr: [0, 0, 0] }; G.STORE.usr = st.fill.map(f => Math.round(f * G.STORE.cap)); G.STORE.erase = s => { st.fill[s] = 0; };      // what About shows (on the device these numbers come from SMP_INFO)
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]); for (let i = 0; i < 28; i++) g.px(hs(i) * 240, 22 + hs(i + 5) * 80, i & 1 ? 6 : 5);
    g.R(0, 130, 240, 67, 4); for (let i = 0; i < 8; i++) g.R(0, 134 + i * 8, 240, 1, 0);
    for (let i = 0; i < 4; i++) { g.R(i * 62 + 10, 40, 6, 90, 5); g.R(i * 62 + 9, 40, 8, 3, 6); }
    const cx = 100, cy = 150, glow = u > 1.4 && u < 2.4 ? 1 : 0;
    g.ell(cx, cy, 62, 20, 0); g.ellO(cx, cy, 62, 20, 13); g.ellO(cx, cy, 52, 16, 12); for (let i = 0; i < 24; i++) { const a = t * .8 + i / 24 * TAU, x = cx + Math.cos(a) * 57, y = cy + Math.sin(a) * 18; g.R(x, y, 2, 2, i % 3 ? 13 : 10); }
    for (let i = 0; i < 6; i++) { const a = -t * .6 + i / 6 * TAU; g.line(cx + Math.cos(a) * 20, cy + Math.sin(a) * 6.5, cx + Math.cos(a + 2.1) * 20, cy + Math.sin(a + 2.1) * 6.5, glow ? 10 : 13); }
    if (glow) { for (let q = 0; q < 60; q += 2) g.R(cx - 5 + (q & 2 ? 0 : 1), cy - q * 1.3, 10 - q / 8, 2, q < 30 ? 7 : 12); for (let q = 0; q < 14; q++) { const a = fr(t * 1.4 + q / 14); g.px(cx + Math.sin(a * 9 + q) * 24, cy - a * 80, a < .5 ? 10 : 7); } }
    if (u < 1.4) { const p = u / 1.4, x = lerp(14, cx, ease(p)), y = lerp(70, cy - 12, p) - Math.sin(p * Math.PI) * 40, ang = p * 9, w = Math.abs(Math.cos(ang)) * 12 + 2; g.R(x - w, y - 8, w * 2, 16, 7); g.R(x - w, y - 8, w * 2, 2, 15); g.R(x - w, y + 6, w * 2, 2, 15); g.R(x - w - 2, y - 9, 3, 18, 4); g.R(x + w - 1, y - 9, 3, 18, 4); if (w > 8) g.txt(src[0], x, y - 4, 0, { al: 'c', sz: 8 }); g.px(x - 14, y + 2, src[1]); }
    else if (u < 2.4) { const p = (u - 1.4), r = 8 - p * 6; g.disc(cx, cy - 12 - p * 6, Math.max(1, r), 7); }
    if (u > 2.0 && u < 3.4) { const p = (u - 2.0) / 1.4, X1 = 196, Y1 = 120 + slot * 22, x = lerp(cx, X1, ease(p)), y = lerp(cy - 14, Y1, p) - Math.sin(p * Math.PI) * 50; g.R(x - 3, y - 4, 7, 9, 0); g.R(x - 2, y - 3, 5, 7, UI.t[slot]); g.R(x - 1, y - 7, 3, 3, 7); for (let q = 1; q < 5; q++) g.px(x - q * 3, y + q, 10); }
    g.R(172, 56, 62, 124, 4); g.R(174, 58, 58, 120, 1); for (let s2 = 0; s2 < 3; s2++) { const y = 70 + s2 * 36, sel = s2 === slot, c = UI.t[s2], fl = Math.min(1, st.fill[s2] + (u > 3.4 && sel ? fill * clamp((u - 3.4) / .8, 0, 1) : 0)); g.R(174, y + 24, 58, 4, 4); g.R(176, y, 6, 24, 5);
      g.poly([[196, y - 2], [210, y - 2], [210, y + 6], [216, y + 14], [216, y + 24], [190, y + 24], [190, y + 14], [196, y + 6]], sel ? 13 : 5); g.poly([[197, y - 1], [209, y - 1], [209, y + 7], [215, y + 15], [215, y + 23], [191, y + 23], [191, y + 15], [197, y + 7]], 0); const lh = 20 * fl; g.R(192, y + 23 - lh, 22, lh, c); g.R(192, y + 23 - lh, 22, 1, 7); g.R(198, y - 5, 10, 3, 4);
      g.txt('USR' + (s2 + 1), 186, y + 8, sel ? UI.hi : UI.dim, { al: 'r', sz: 8 }); g.txt(Math.round(fl * 100) + '%', 186, y + 17, UI.tx, { al: 'r', sz: 8 }); if (sel && u > 2.2 && u < 3.4) g.ellO(203, y + 12, 18 + Math.sin(t * 12) * 2, 14, 10); }
    const LOG = ['reading piano' + src[0], 'cutting zone C3 · 1.8 s', 'resample → ' + rate / 1000 + ' kHz', 'adpcm 4 bit · ' + (bytes / 1024).toFixed(1) + ' KB', 'USR' + (slot + 1) + (fill <= 1 ? ' · fits' : ' · too big')], li = Math.min(LOG.length, Math.floor(u / 4.4 * (LOG.length + 1)));
    g.panel(8, 166, 224, 26); for (let q = 0; q < 3; q++) { const idx = li - 2 + q; if (idx < 0 || idx >= LOG.length) continue; g.txt((idx < li ? '✓ ' : '> ') + LOG[idx], 16, 169 + q * 7.5, idx < li ? UI.dim : (fill > 1 && idx === 4 ? 8 : UI.tx), { sz: 8 }); }
    { const used = G.STORE.usr.reduce((a, b) => a + b, 0), tot = G.STORE.cap * 3; g.txt('mem ' + (used / 1024).toFixed(1) + '/' + (tot / 1024).toFixed(0) + ' KiB', 6, 21, '#8a8090', { sz: 8, nofit: true }); g.txt('USR' + (slot + 1) + ' ' + (G.STORE.usr[slot] / 1024).toFixed(1) + '/' + (G.STORE.cap / 1024) + ' KiB', 234, 21, '#8a8090', { sz: 8, al: 'r', nofit: true }); }
    g.bar('Importer', 'transmutation', src[0]);
    g.dials(['source', 'rate', 'slot', 'size'], [src[0], rate / 1000 + 'k', 'USR' + (slot + 1), (bytes / 1024).toFixed(0) + 'K'], [k[0], k[1], k[2], Math.min(1, fill)]);
  } });

// ------------------------------------------------------------------ 20 · Zones
add({ name: 'Zones', tag: 'mapa de zonas no teclado', tier: 'bk', an: [240, 125],
  how: ['hold:HOME = abre o menu', 'press:OCT+ = (no Armory/Chisel) abre o mapa de zonas'],
  fields: [{ l: 'zonas', d: 'em quantas zonas o instrumento é dividido pelo teclado (2 a 8; o firmware aceita até 16 por slot).', v: .4, fmt: v => 2 + Math.round(v * 6) }, { l: 'duração', d: 'comprimento do sample de cada zona: altura da barra 3D.', v: .5 }, { l: 'raiz', d: 'desloca a nota raiz da zona selecionada (a bandeira vermelha).', v: .5, fmt: v => 'C' + (2 + Math.round(v * 3)) }],
  desc: 'O teclado visto de um ângulo em órbita, com cada zona virando um bloco em pé: a altura mostra o comprimento do sample e a bandeira marca a nota raiz. Gire a câmera para ver os blocos de todos os lados.',
  bullets: ['Zonas contíguas em volta de uma nota raiz (como no formato do firmware)', 'Altura = duração; cor = zona; bandeira = nota raiz', 'Até 16 zonas por slot de sample no firmware atual', 'Blocos 3D com poucas faces: só retângulos preenchidos'],
  draw(g, t, k, st) {
    const nz = 2 + Math.round(k[0] * 6), th = -.35, D = 24, f = 130, Yc = 14, cs = Math.cos(th), sn = Math.sin(th);
    const PR = (x, y, z) => { const X = x * cs + z * sn, Z = -x * sn + z * cs + D; return [120 + X * f / Z, 80 + (Yc - y) * f / Z, Z]; };
    g.clear(0); g.sky(19, 197, [0, 0, 1, 1, 0]);
    for (let i = 0; i < 30; i++) g.px(hs(i) * 240, 22 + hs(i + 5) * 60, i & 1 ? 5 : 6);
    const NK = 21, kx = i => i - NK / 2; g.poly([PR(-NK / 2 - 1, -.3, -4.2), PR(NK / 2 + 1, -.3, -4.2), PR(NK / 2 + 1, -.3, 4.2), PR(-NK / 2 - 1, -.3, 4.2)], 4);
    for (let i = 0; i < NK; i++) { const a = PR(kx(i), 0, -3.8), b = PR(kx(i) + .92, 0, -3.8), c = PR(kx(i) + .92, 0, 3.8), d = PR(kx(i), 0, 3.8); g.poly([a, b, c, d], 7); g.polyO([a, b, c, d], 5); }
    for (const i of [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19]) { const a = PR(kx(i) + .62, .6, -3.8), b = PR(kx(i) + 1.3, .6, -3.8), c = PR(kx(i) + 1.3, .6, -1.6), d = PR(kx(i) + .62, .6, -1.6); g.poly([a, b, c, d], 0); }
    const zones = Array.from({ length: nz }, (_, i) => { const a = Math.round(i * NK / nz), b = Math.round((i + 1) * NK / nz), h = 1.2 + (.4 + hs(i * 3.1) * .9) * (k[1] * 7); return { i, a, b, h }; }), selz = Math.min(nz - 1, Math.floor(fr(t / 5) * nz));
    zones.sort((p, q) => PR((p.a + p.b) / 2 - NK / 2, 0, 0)[2] - PR((q.a + q.b) / 2 - NK / 2, 0, 0)[2]).reverse();
    const ZC = [12, 11, 10, 9, 13, 14, 8, 6];
    for (const z of zones) {
      const x0 = z.a - NK / 2 + .12, x1 = z.b - NK / 2 - .12, zz0 = -1.5, zz1 = 1.5, h = z.h, c = PAL[ZC[z.i % 8]], faces = [[[x0, 0, zz0], [x1, 0, zz0], [x1, h, zz0], [x0, h, zz0]], [[x1, 0, zz0], [x1, 0, zz1], [x1, h, zz1], [x1, h, zz0]], [[x1, 0, zz1], [x0, 0, zz1], [x0, h, zz1], [x1, h, zz1]], [[x0, 0, zz1], [x0, 0, zz0], [x0, h, zz0], [x0, h, zz1]]].map(f => f.map(p => PR(...p)));
      faces.sort((p, q) => (q[0][2] + q[2][2]) - (p[0][2] + p[2][2])); faces.forEach((fc, n) => { g.poly(fc, shade(c, .5 + .1 * n)); g.polyO(fc, 0); });
      g.poly([PR(x0, h, zz0), PR(x1, h, zz0), PR(x1, h, zz1), PR(x0, h, zz1)], c); g.polyO([PR(x0, h, zz0), PR(x1, h, zz0), PR(x1, h, zz1), PR(x0, h, zz1)], 0);
      const lp = PR((x0 + x1) / 2, h, 0); g.txt(z.i + 1, lp[0], lp[1] - 3, 0, { al: 'c' });
      if (z.i === selz) { const rk = Math.round(((x0 + x1) / 2 + NK / 2) + (k[2] - .5) * 6), fl = PR(rk - NK / 2 + .4, h, 0), pole = PR(rk - NK / 2 + .4, h + 4, 0); g.line(fl[0], fl[1], pole[0], pole[1], 7); g.poly([[pole[0], pole[1]], [pole[0] + 9, pole[1] + 3], [pole[0], pole[1] + 6]], 8); }
    }
    const sz = zones.find(z => z.i === selz); g.panel(8, 166, 224, 26); g.txt('zone ' + (selz + 1) + '/' + nz + ' · ' + (sz ? sz.b - sz.a : 0) + ' keys', 18, 170, UI.tx); g.txt('root C' + (2 + Math.round(k[3] * 3)) + ' · loop 30–80%', 18, 180, UI.dim); g.txt(((1.2 + k[1] * 3).toFixed(1)) + ' s', 222, 175, 10, { al: 'r' });
    g.bar('Zones', 'keyboard map', nz + ' zones');
    g.dials(['zones', 'length', 'root', 'keys'], [nz, pct(k[1]), 'C' + (2 + Math.round(k[2] * 3)), 21], [k[0], k[1], k[2], 1]);
  } });


// ------------------------------------------------------------------ the games start only when you choose: a tape (FM Hero) or a score (Piano Hero); PLAY starts, the song is played once, then the result
(function gameFlow() {
  const REG = T.REG, PIANO = ['Ode to Joy', 'Twinkle Twinkle', 'Scale', 'Mary had a little lamb', 'Jingle Bells'], PBPM = [100, 96, 90, 104, 120];
  const stT = n => { const A = G.SIM && G.SIM.api; return A && A.gtile ? A.gtile(n) : null; };
  const cassette = (g, x, y, w, col, on) => { g.R(x, y, w, 30, 0); g.R(x + 1, y + 1, w - 2, 28, on ? col : '#4a4254'); g.R(x + 4, y + 4, w - 8, 12, '#d8cfae'); g.R(x + 8, y + 19, 8, 7, 0); g.R(x + w - 16, y + 19, 8, 7, 0); g.disc(x + 12, y + 22, 2, '#d8cfae'); g.disc(x + w - 12, y + 22, 2, '#d8cfae'); };
  const sheet = (g, x, y, w, on) => { g.R(x, y, w, 30, on ? '#f2e8cc' : '#8a8478'); g.R(x, y, w, 30, 0); g.R(x + 1, y + 1, w - 2, 28, on ? '#f2e8cc' : '#8a8478'); for (let i = 0; i < 5; i++) g.R(x + 4, y + 6 + i * 4, w - 8, 1, '#3a2c1c'); for (let i = 0; i < 6; i++) g.disc(x + 8 + i * ((w - 16) / 5), y + 8 + (i * 7 % 13), 2, '#3a2c1c'); };
  function wrap(name, list, kind, startFn, scoreFn, doneFn, label) {
    const def = REG.find(d => d.name === name), orig = def.draw;
    const flow = st => (st.F = st.F || { ph: 'select', i: 0 });
    G.GFX.INP.subs.push(ev => {
      const tl = stT(name); if (!tl || !tl.vis) return; const F = flow(tl.st);
      if (ev.type === 'octave' && F.ph !== 'play') { F.i = (F.i + ev.d + list.length) % list.length; F.ph = F.ph === 'result' ? 'select' : F.ph; }
      else if (ev.type === 'gamebtn' && ev.id === 'play') { if (F.ph === 'play') return; F.ph = 'play'; startFn(tl, F.i); }
      else if (ev.type === 'gamebtn' && ev.id === 'rec' && F.ph === 'play') { F.ph = 'select'; tl.st.live = false; }
    });
    def.draw = function (g, t, k, st, tl) {
      const F = flow(st);
      if (F.ph === 'play') { st.live = true; orig(g, t, k, st, tl); if (doneFn(st)) { F.ph = 'result'; F.res = scoreFn(st); } return; }
      g.clear('#14101a'); g.R(0, 19, 240, 170, '#1d1520');
      if (F.ph === 'result') {
        const r = F.res; g.txt(kind === 'tape' ? 'FITA CONCLUÍDA' : 'PARTITURA CONCLUÍDA', 120, 30, '#f0c860', { f: 't', sz: 12, al: 'c', nofit: true }); g.txt(list[F.i][0], 120, 48, '#f2e2c4', { sz: 10, al: 'c', nofit: true, mw: 220 });
        g.txt(r.rank, 120, 66, r.rank === 'S' ? '#f0c860' : r.rank === 'A' ? '#7ab04e' : '#f2e2c4', { f: 't', sz: 40, al: 'c', nofit: true }); g.txt('acertos ' + r.hit + ' · erros ' + r.miss + (r.score != null ? ' · pontos ' + r.score : ''), 120, 120, '#f2e2c4', { sz: 9, al: 'c', nofit: true }); g.txt(r.pct + '% de precisão', 120, 134, '#a89080', { sz: 9, al: 'c', nofit: true });
        g.txt('PLAY: jogar de novo · OCT±: outra ' + (kind === 'tape' ? 'fita' : 'partitura'), 120, 160, '#a89080', { sz: 8, al: 'c', nofit: true }); g.bar(name, 'resultado', r.rank); g.dials(['', '', '', ''], ['', '', '', ''], [0, 0, 0, 0]); return;
      }
      g.txt(kind === 'tape' ? 'ESCOLHA A FITA' : 'ESCOLHA A PARTITURA', 120, 26, '#f0c860', { f: 't', sz: 12, al: 'c', nofit: true });
      for (let d = -1; d <= 1; d++) { const j = F.i + d; if (j < 0 || j >= list.length) continue; const cx = 120 + d * 78, on = d === 0; (kind === 'tape' ? cassette : (gg, x, y, w, o) => sheet(gg, x, y, w, o))(g, cx - (on ? 34 : 26), on ? 52 : 62, on ? 68 : 52, ['#5a8ad0', '#7ab04e', '#f0c860', '#e0803a', '#c8483a'][j % 5], on); }
      g.txt(list[F.i][0], 120, 96, '#f2e2c4', { f: 't', sz: 14, al: 'c', nofit: true, mw: 220 }); g.txt(list[F.i][1], 120, 114, '#a89080', { sz: 9, al: 'c', nofit: true });
      for (let i = 0; i < list.length; i++) g.R(120 - list.length * 5 + i * 10, 134, i === F.i ? 7 : 4, i === F.i ? 7 : 4, i === F.i ? '#f0c860' : '#4a4254');
      g.txt('OCT± ou SELECT: escolhe · PLAY: começa', 120, 152, '#a89080', { sz: 8, al: 'c', nofit: true }); g.txt(label, 120, 164, '#7a7080', { sz: 8, al: 'c', nofit: true });
      g.bar(name, kind === 'tape' ? 'fitas' : 'partituras', (F.i + 1) + '/' + list.length); g.dials(['', '', '', ''], ['', '', '', ''], [0, 0, 0, 0]);
    };
  }
  wrap('FM Hero', SONGS.map(s => [s[0], Math.round(s[1]) + ' bpm']), 'tape',
    (tl, i) => { const S0 = SONGS[i]; CHL = S0[2]; CLEN = CHL[0].length; CHSRC = S0[0]; tl.k[1] = clamp((S0[1] - 80) / 90, 0, 1); tl.k[0] = Math.max(tl.k[0], .45); tl.st.live = true; tl.st.reset = true; tl.upd && tl.upd(); },
    st => { const tot = st.cnt.p + st.cnt.g + st.cnt.m; const hit = Math.round(st.cnt.p + st.cnt.g), miss = Math.round(st.cnt.m), pct = tot ? Math.round((st.cnt.p + st.cnt.g) / tot * 100) : 0; return { hit, miss, pct, score: Math.round(st.score), rank: pct >= 95 ? 'S' : pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'D' }; },
    st => st.S > CLEN + 6, 'teclas 1–5 (ou o teclado do FM-1 / MIDI)');
  wrap('Piano Hero', PIANO.map((n, i) => [n, PBPM[i] + ' bpm']), 'score',
    (tl, i) => { tl.k[1] = i / 4; tl.k[0] = Math.max(tl.k[0], .4); tl.k[2] = 1; const st = tl.st; st.live = true; st.lt = null; st.hits = 0; st.miss = 0; st.seen = {}; st.res = {}; st.press = []; st.endB = [30, 28, 12, 13, 11][i] + 2; tl.upd && tl.upd(); },
    st => { const hit = st.hits || 0, miss = st.miss || 0, tot = hit + miss, pct = tot ? Math.round(hit / tot * 100) : 0; return { hit, miss, pct, score: hit * 100, rank: pct >= 95 ? 'S' : pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'D' }; },
    st => st.B > (st.endB || 34), 'teclas 1–10 e ⇧5–⇧0 (ou o teclado do FM-1 / MIDI)');
})();
})(window);
