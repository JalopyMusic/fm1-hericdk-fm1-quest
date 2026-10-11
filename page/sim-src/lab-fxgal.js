// FM1 Quest lab — Efeitos tab: LED effects, screen transitions, code-made hit/magic effects.
(function (G) {
'use strict';
const host = document.getElementById('fxg'); if (!host) return;
const LF = G.LEDFX, SIM = G.SIM, RIG = G.RIG, A = SIM && SIM.api;
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, fr = v => v - Math.floor(v), hs = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const vis = new Set(); const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? vis.add(e.target) : vis.delete(e.target); })) : null;
const goto = (name, tgt) => { const b = [...document.querySelectorAll('#tabs button')].find(x => x.textContent === 'Simulador'); if (b) b.click(); setTimeout(() => G.SIM.go(tgt, { force: true }), 200); };

// ================================================================ 1 · LEDs
const sec = (t, sub) => { const d = el('div', 'edsec'); d.innerHTML = `<h3>${t}</h3><p class="sub2">${sub}</p>`; host.append(d); return d; };
const s1 = sec('LEDs · efeitos', 'Todos os LEDs são amarelos: o que muda é o brilho (apagado · fraco · forte) e o piscar. As teclas só acendem se estiver tocando, gravando, se você apertar ou se um efeito estiver em andamento. Escolha um efeito de repouso e um efeito ao tocar; eles passam a valer no Simulador.');
const gridIdle = el('div', 'fxgrid'), gridPress = el('div', 'fxgrid'); s1.append(el('h4', null, 'Em repouso (sempre que selecionado)'), gridIdle, el('h4', null, 'Ao tocar uma tecla'), gridPress);
const ledCanvas = () => { const c = document.createElement('canvas'); c.width = 300; c.height = 54; c.className = 'ledcv'; return c; };
const BG = LF.BGAP;
function drawLeds(c, w, b) { const x = c.getContext('2d'); x.fillStyle = '#1a181e'; x.fillRect(0, 0, 300, 54); const col = l => l === 2 ? '#ffd770' : l === 1 ? '#8c6a2a' : '#2b2831';
  for (let j = 0; j < 11; j++) { const lx = 12 + (BG[j] + 1) * 17.6 - 6; x.fillStyle = col(b[j]); if (b[j] === 2) { x.shadowColor = '#ffb62e'; x.shadowBlur = 8; } x.fillRect(lx, 8, 12, 12); x.shadowBlur = 0; }
  for (let i = 0; i < 16; i++) { x.fillStyle = col(w[i]); if (w[i] === 2) { x.shadowColor = '#ffb62e'; x.shadowBlur = 8; } x.fillRect(12 + i * 17.6, 28, 14, 18); x.shadowBlur = 0; } }
const cards = [];
function ledCard(host2, kind, id, def) {
  const c = el('div', 'fxcard'), cv = ledCanvas(); c.append(cv); c.insertAdjacentHTML('beforeend', `<b>${def.name}</b><small>${def.desc}</small><button>usar no Simulador</button>`); host2.append(c); io && io.observe(c);
  c.querySelector('button').onclick = () => { LF.cfg[kind] = id; LF.save(); document.querySelectorAll('.fxcard.on').forEach(x => { if (x.dataset.k === kind) x.classList.remove('on'); }); c.classList.add('on'); const sel = document.getElementById(kind === 'idle' ? 'lf-idle' : 'lf-press'); if (sel) sel.value = id; };
  c.dataset.k = kind; if (LF.cfg[kind] === id) c.classList.add('on'); cards.push({ c, cv, kind, id, def });
}
Object.entries(LF.IDLE).forEach(([id, d]) => ledCard(gridIdle, 'idle', id, d)); Object.entries(LF.PRESS).forEach(([id, d]) => ledCard(gridPress, 'press', id, d));
const s1b = sec('LEDs ligados à tela', 'Algumas telas comandam os LEDs com o que mostram.'); const sg = el('div', 'fxgrid'); s1b.append(sg);
[['Spells', 'O feitiço ativo toca o seu padrão nas teclas: strobe (stutter), varredura (reverse), fade (stop), onda (wobble), eco…', { q: 'punch' }], ['Alchemy', 'A onda do LFO rola pelas teclas: a forma e a velocidade vêm do LFO e a profundidade é o contraste entre fraco e forte. Acende tocando/gravando ou 2,5 s depois de mexer nos knobs.', { g: 'Alchemy' }], ['Chisel', 'Região do sample fraca; início e fim fixos; loop-in pisca rápido e loop-out pisca devagar; a raiz pulsa; faíscas ao mexer nos knobs (2,5 s).', { q: 'fit' }]].forEach(([n, d, t]) => { const c = el('div', 'fxcard', `<b>${n}</b><small>${d}</small><button>abrir no Simulador</button>`); c.querySelector('button').onclick = () => goto(n, t); sg.append(c); });
const rip = []; let lastRip = 0;
function tickLed(now) {
  requestAnimationFrame(tickLed); if (!host.offsetParent) return; if (now - lastRip > 1300) { lastRip = now; rip.length = 0; rip.push({ x: 2 + Math.floor(Math.random() * 12), t: now, a: 1 }); }
  const ctx = { now, t: now / 1000, sp: 1, bpm: 120, step: now / 125, beat: now / 500, playing: true, rec: { state: 'off', bars: 1 }, root: 2, scl: [0, 2, 4, 5, 7, 9, 11], rip };
  cards.forEach(({ cv, c, kind, id, def }) => { if (!vis.has(c)) return; const w = Array(16).fill(0), b = Array(11).fill(0), o = { W: (i, l) => { w[i] = Math.max(w[i], l); }, B: (j, l) => { b[j] = Math.max(b[j], l); }, Btn() {} };
    if (kind === 'idle') def.f(ctx, o); else { for (let i = 0; i < 16; i++) w[i] = LF.pressLevel(id, rip, now, i, true); BG.forEach((g, j) => { b[j] = LF.pressLevel(id, rip, now, g + .5, true); }); } drawLeds(cv, w, b); });
}
requestAnimationFrame(tickLed);

// ================================================================ 2 · transitions
// every card plays ANTES → DEPOIS with the real transition (same code the Story tab uses), with a progress bar, so the effect is easy to see
const s2 = sec('Transições de tela', 'Cada quadro mostra uma tela ANTES (azul, letra A) virando uma tela DEPOIS (laranja, letra B) com o efeito de verdade. A curva é rápida no começo e macia no fim. No Simulador, "automática" escolhe uma por destino; no Story você escolhe a transição de cada cena.');
const TX = G.TRANSFX, USE = { cut: 'Story', fade: 'Story', wipe: 'Simulador · Story', drop: 'Simulador · Story', iris: 'Simulador (abrir menu) · Story', tv: 'Simulador (ligar) · Story', vhs: 'Simulador (jogos) · Story (pular e rebobinar)', flash: 'Story (começar luta)', slide: 'Story', blinds: 'Story', pixel: 'Story', dither: 'Story' };
const trc = el('div', 'edrow', '<span class="chips" id="tr-sp" data-v="2.5"><button data-v="1">normal</button><button data-v="2.5" class="on">câmera lenta</button></span><button id="tr-all">tocar todas juntas</button><span class="est">passe o mouse num quadro para pausar</span>'); s2.append(trc);
const gT = el('div', 'trgrid'); s2.append(gT); const tcards = [];
function mkScr(letter, c1, c2, c3) { const cv = document.createElement('canvas'); cv.width = cv.height = 240; const x = cv.getContext('2d'); x.fillStyle = c1; x.fillRect(0, 0, 240, 240); x.fillStyle = c2; for (let i = -240; i < 240; i += 40) { x.beginPath(); x.moveTo(i, 240); x.lineTo(i + 40, 240); x.lineTo(i + 280, 0); x.lineTo(i + 240, 0); x.fill(); } x.fillStyle = c3; x.fillRect(20, 20, 200, 200); x.fillStyle = c1; x.fillRect(26, 26, 188, 188); x.fillStyle = c3; x.font = 'bold 150px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(letter, 120, 128); x.font = 'bold 18px sans-serif'; x.fillText(letter === 'A' ? 'ANTES' : 'DEPOIS', 120, 212); return cv; }
const SA = mkScr('A', '#1c2a50', '#26386a', '#8ab0ff'), SB = mkScr('B', '#6a2e10', '#8a4018', '#ffc460');
if (TX) Object.entries(TX.KINDS).forEach(([k, d]) => {
  const c = el('div', 'fxcard trc'); c.innerHTML = `<canvas width="240" height="240" class="trcv"></canvas><div class="trbar"><i></i></div><b>${d.name}</b><small>${d.desc}</small><small class="use">usada em: ${USE[k]} · ${d.dur < .05 ? 'instantânea' : Math.round(d.dur * 1000) + ' ms'}</small>`; gT.append(c); io && io.observe(c);
  const st = { c, k, cv: c.querySelector('canvas'), bar: c.querySelector('.trbar i'), off: tcards.length * .35, hold: false, T0: 0 }; c.onmouseenter = () => { st.hold = true; }; c.onmouseleave = () => { st.hold = false; st.T0 = performance.now(); }; c.onclick = () => { st.T0 = performance.now(); st.hold = false; }; tcards.push(st);
});
host.querySelectorAll('#tr-sp button').forEach(b => b.onclick = () => { host.querySelector('#tr-sp').dataset.v = b.dataset.v; host.querySelectorAll('#tr-sp button').forEach(x => x.classList.toggle('on', x === b)); });
host.querySelector('#tr-all').onclick = () => { tcards.forEach(s => { s.T0 = performance.now(); }); };
function tickTr(now) {
  requestAnimationFrame(tickTr); if (!host.offsetParent || !TX) return; const sp = +host.querySelector('#tr-sp').dataset.v;
  tcards.forEach(s => { if (!vis.has(s.c) || s.hold) return; const d = TX.KINDS[s.k].dur * sp, h1 = .7, h2 = .9, tot = h1 + d + h2, u = (((now - s.T0) / 1000 + s.off) % tot), p = clamp((u - h1) / d, 0, 1), x = s.cv.getContext('2d');
    TX.draw(x, s.k, u < h1 ? 0 : p, SA, SB, 240); if (u < h1) x.drawImage(SA, 0, 0); else if (u > h1 + d) x.drawImage(SB, 0, 0); s.bar.style.width = (u / tot * 100) + '%'; s.bar.style.background = u < h1 ? '#5a8ad0' : u > h1 + d ? '#e08a3a' : '#f0c860'; });
}
requestAnimationFrame(tickTr);

// ================================================================ 3 · hit / magic effects made by code
const s3 = sec('Golpes e magias gerados por código', 'Pergunta: o flash e o ataque são desenhados ou gerados? Resposta: os efeitos comuns (arco de espada, faísca, flecha, raio, onda, brilho de cura) saem por código, bem baratos; só o golpe final de cada herói é uma animação desenhada por você (pré-renderizada). Cada efeito abaixo é uma função curta; o tamanho aproximado do código aparece ao lado do custo de uma folha de sprites equivalente.');
const FXS = {
  slash: { n: 'arco de espada', f(x, u, a, b, big) { const r = big ? 26 : 11, n = big ? 28 : 14; for (let k = 0; k < n; k++) { const t = k / n, an = lerp(-1.3, 1.1, t), on = t < u * 1.15 && t > u * 1.15 - .6; if (!on) continue; x.fillStyle = `rgba(255,255,255,${1 - Math.abs(u - .5)})`; x.fillRect(Math.round(b[0] + Math.cos(an) * r), Math.round(b[1] + Math.sin(an) * r), big ? 3 : 2, big ? 3 : 2); } } },
  spark: { n: 'faísca de impacto', f(x, u, a, b, big) { const n = big ? 14 : 8; for (let k = 0; k < n; k++) { const an = k / n * 6.283 + hs(k) * .6, r = u * (big ? 22 : 10) * (.6 + hs(k + 3) * .6); x.fillStyle = k % 2 ? '#ffffff' : '#f0c860'; x.globalAlpha = 1 - u; x.fillRect(Math.round(b[0] + Math.cos(an) * r), Math.round(b[1] + Math.sin(an) * r), 2, 2); } x.globalAlpha = 1; } },
  arrow: { n: 'flecha', f(x, u, a, b, big) { const px = lerp(a[0], b[0], clamp(u * 1.3, 0, 1)), py = lerp(a[1], b[1], clamp(u * 1.3, 0, 1)); if (u < .78) { x.fillStyle = '#f2e2c4'; x.fillRect(Math.round(px - 5), Math.round(py), 6, 1); x.fillStyle = '#f0c860'; x.fillRect(Math.round(px + 1), Math.round(py), 1, 1); } else FXS.spark.f(x, (u - .78) / .22, a, b, big); } },
  bolt: { n: 'bola de magia', f(x, u, a, b, big) { const t = clamp(u * 1.25, 0, 1), px = lerp(a[0], b[0], t), py = lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * 10; if (u < .8) { for (let k = 0; k < 5; k++) { x.fillStyle = ['#9ad0ff', '#5a8ad0', '#3a62c0', '#3a62c0', '#1e3a80'][k]; x.fillRect(Math.round(px - k * 2), Math.round(py + k * .6), 2 - (k > 2 ? 1 : 0), 2 - (k > 2 ? 1 : 0)); } x.fillStyle = '#fff'; x.fillRect(Math.round(px), Math.round(py), 2, 2); } else { const r = (u - .8) / .2 * (big ? 20 : 11); x.strokeStyle = `rgba(154,208,255,${1 - (u - .8) / .2})`; x.lineWidth = 2; x.beginPath(); x.ellipse(b[0], b[1], r, r * .8, 0, 0, 7); x.stroke(); } } },
  lightning: { n: 'raio', f(x, u, a, b, big) { if (u > .7) return; const fl = Math.floor(u * 24) % 2; x.fillStyle = fl ? '#ffffff' : '#f0e090'; let px = b[0] + (hs(Math.floor(u * 12)) - .5) * 10, py = 0; while (py < b[1]) { const nx = lerp(px, b[0], .35) + (hs(py + Math.floor(u * 12)) - .5) * 9; x.fillRect(Math.round(px), py, 2, 4); x.fillRect(Math.round(nx), py + 3, 2, 2); px = nx; py += 5; } } },
  heal: { n: 'brilho de cura', f(x, u, a, b, big) { for (let k = 0; k < 8; k++) { const px = a[0] + (hs(k) - .5) * 24, py = a[1] - 4 - ((u * 22 + k * 5) % 24); x.fillStyle = k % 2 ? '#c8f0a0' : '#ffffff'; x.globalAlpha = 1 - u * .6; x.fillRect(Math.round(px), Math.round(py), 1, 3); x.fillRect(Math.round(px) - 1, Math.round(py) + 1, 3, 1); } x.globalAlpha = 1; } },
  shock: { n: 'onda de choque', f(x, u, a, b, big) { const r = u * (big ? 50 : 30); x.strokeStyle = `rgba(255,255,255,${1 - u})`; x.lineWidth = 2; x.beginPath(); x.ellipse(b[0], b[1] + 8, r, r * .35, 0, 0, 7); x.stroke(); x.strokeStyle = `rgba(240,200,96,${(1 - u) * .7})`; x.beginPath(); x.ellipse(b[0], b[1] + 8, r * .7, r * .25, 0, 0, 7); x.stroke(); } },
  charge: { n: 'carga + clarão', f(x, u, a, b, big) { for (let k = 0; k < 16; k++) { const an = k / 16 * 6.283 + u * 4, r = (1 - Math.min(u / .8, 1)) * (big ? 26 : 16) + 2; x.fillStyle = k % 2 ? '#ffffff' : '#f0c860'; x.fillRect(Math.round(a[0] + Math.cos(an) * r), Math.round(a[1] - 6 + Math.sin(an) * r * .8), 2, 2); } if (u > .85) { const r = (u - .85) / .15 * (big ? 30 : 18); x.strokeStyle = `rgba(255,255,255,${1 - (u - .85) / .15})`; x.lineWidth = 2; x.beginPath(); x.ellipse(a[0], a[1] - 6, r, r * .8, 0, 0, 7); x.stroke(); } } },
};
const ctrl = el('div', 'edrow', '<span class="chips" id="fx-big" data-v="0"><button data-v="0" class="on">herói 15×15 (luta)</button><button data-v="1">herói 48×48 (cena)</button></span><label>velocidade <input type="range" id="fx-sp" min=".3" max="2" step=".05" value="1"></label>'); s3.append(ctrl);
host.querySelectorAll('#fx-big button').forEach(b => b.onclick = () => { host.querySelector('#fx-big').dataset.v = b.dataset.v; host.querySelectorAll('#fx-big button').forEach(x => x.classList.toggle('on', x === b)); });
const gE = el('div', 'fxgrid'); s3.append(gE); const ecards = [];
Object.entries(FXS).forEach(([id, d]) => {
  const c = el('div', 'fxcard'), cv = document.createElement('canvas'); cv.width = 120; cv.height = 80; cv.className = 'efcv'; c.append(cv);
  const codeB = d.f.toString().length, sprite = 8 * 15 * 15 / 2; c.insertAdjacentHTML('beforeend', `<b>${d.n}</b><small>código ≈ <b>${codeB} B</b> de fonte · folha de 8 quadros 15×15 em 4 bpp = <b>${sprite} B</b> (e 48×48: ${8 * 48 * 48 / 2} B)</small>`); gE.append(c); io && io.observe(c); ecards.push({ cv, c, d });
});
const hero = RIG ? RIG.tiny('guerreiro', 'idle', .1, RIG.CLASSES.guerreiro) : null;
function tickFx(now) {
  requestAnimationFrame(tickFx); if (!host.offsetParent || !hero) return; const big = host.querySelector('#fx-big').dataset.v === '1', sp = +host.querySelector('#fx-sp').value;
  ecards.forEach(({ cv, c, d }) => { if (!vis.has(c)) return; const x = cv.getContext('2d'), u = fr(now / 1000 * .55 * sp); x.imageSmoothingEnabled = false; x.fillStyle = '#2a2f36'; x.fillRect(0, 0, 120, 80); x.fillStyle = '#3a4a46'; x.fillRect(0, 62, 120, 18);
    const a = [28, 54], b = [92, 44];
    if (big) { const dm = RIG.render('idle', 0, 48, { tones: RIG.tonesOnly(RIG.CLASSES.guerreiro), style: 'body' }); x.drawImage(dm, a[0] - 24, 62 - 48 + 2); } else { x.drawImage(hero, a[0] - 7, 62 - 14); RIG.reflect(x, hero, a[0] - 7, 63, .2); }
    x.fillStyle = '#6aa04a'; x.beginPath(); x.ellipse(b[0] + 4, 54, 20, 14, 0, 0, 7); x.fill(); x.fillStyle = '#14180f'; x.fillRect(b[0] - 4, 44, 3, 5); x.fillRect(b[0] + 6, 44, 3, 5);
    x.save(); d.f(x, u, a, b, big); x.restore(); });
}
requestAnimationFrame(tickFx);
G.FXG = { FXS };
})(window);
