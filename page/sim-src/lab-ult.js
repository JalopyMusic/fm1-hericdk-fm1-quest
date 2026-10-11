// FM1 Quest lab — Efeitos: os golpes finais (ultimates) em dither, no topo da página.
// Cada herói tem a sua folha de quadros (ult/*.png, quadros de 120 x 120). Aqui o dither é aplicado ao vivo: método, tons, tamanho do pixel,
// brilho, contraste e cores; "estimar peso" calcula o que cada animação pesaria no firmware; "baixar vídeo" grava a animação inteira.
(function (G) {
'use strict';
const host = document.getElementById('fxg'); if (!host) return;
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HEROES = [['mago', 'Mago'], ['arqueiro', 'Arqueiro'], ['clerigo', 'Clérigo'], ['guerreiro', 'Cavaleiro'], ['warrior', 'Guerreiro vermelho']];
const QPAL = ['1a1016', '2b2338', '5a3050', '2f4a3a', '6a4030', '4a3c48', 'a89aa0', 'f2e2c4', 'c8443c', 'e08a3a', 'f0c860', '6a9a4a', '4a78b0', '8a6a9a', 'e09090', 'f0b890']
  .map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
const BAYER = { 2: [0, 2, 3, 1], 4: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], 8: null };
BAYER[8] = (() => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0, a = x, b = y ^ x; for (let i = 0; i < 3; i++) { v = (v << 2) | ((a >> (2 - i) & 1) << 1) | (b >> (2 - i) & 1); } m.push(v); } return m; })();
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));

const st = { hero: 'mago', method: 'bayer4', tones: 'p16', block: 1, bright: 0, contrast: 1, ink: '#f2e2c4', paper: '#14101a', speed: 1, keep: 0, paused: false, t0: performance.now(), fps: 8 };
const meta = {}, sheets = {};
fetch('ult/ult.json').then(r => r.json()).then(j => { Object.assign(meta, j); HEROES.forEach(([k]) => { const im = new Image(); im.src = 'ult/' + k + '.png'; sheets[k] = im; }); }).catch(() => {});

const sec = el('div', 'edsec'); sec.innerHTML = '<h3>Ultimates · dither</h3><p class="sub2">As animações dos golpes finais com o dither aplicado ao vivo. Mexa nas opções ao lado: a imagem muda na hora (ou pause, ajuste e retome). O peso é uma estimativa do que cada animação ocuparia no firmware.</p>';
host.insertBefore(sec, host.firstChild);
const wrap = el('div'); wrap.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start'; sec.append(wrap);
const cv = document.createElement('canvas'); cv.width = 240; cv.height = 240; cv.title = '240 × 240 px: o tamanho da tela do FM-1'; cv.style.cssText = 'width:240px;height:240px;image-rendering:pixelated;background:#14101a;border-radius:8px'; wrap.append(cv);
const ctl = el('div'); ctl.style.cssText = 'min-width:260px;flex:1;display:grid;gap:8px;font:13px system-ui,sans-serif'; wrap.append(ctl);
const row = (label, node) => { const d = el('label'); d.style.cssText = 'display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center'; d.append(el('span', null, label), node); ctl.append(d); return node; };
const sel = (opts, val, f) => { const s = document.createElement('select'); opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); }); s.value = val; s.onchange = () => f(s.value); return s; };
const rng = (min, max, step, val, f) => { const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val; r.oninput = () => f(+r.value); return r; };
row('herói', sel(HEROES.map(([k, n]) => [k, n]), st.hero, v => { st.hero = v; st.t0 = performance.now(); est.textContent = ''; }));
row('método', sel([['none', 'sem dither (limiar)'], ['bayer2', 'ordenado 2×2'], ['bayer4', 'ordenado 4×4'], ['bayer8', 'ordenado 8×8'], ['floyd', 'Floyd–Steinberg'], ['atk', 'Atkinson'], ['noise', 'ruído']], st.method, v => st.method = v));
row('tons', sel([['p2', '1 bit (tinta e papel)'], ['p4', '2 bits (4 tons)'], ['p8', '3 bits (8 tons)'], ['p16', 'paleta do Quest (16 cores)'], ['orig', 'cores originais']], st.tones, v => st.tones = v));
const PXS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];
row('tamanho do pixel', sel(PXS.map(v => [String(v), v + ' px  (' + Math.round(240 / v) + '×' + Math.round(240 / v) + ' na tela de 240)']), String(st.block), v => { st.block = +v; est.textContent = ''; }));
row('brilho', rng(-80, 80, 1, 0, v => st.bright = v));
row('contraste', rng(0.4, 2.5, 0.05, 1, v => st.contrast = v));
const inkc = document.createElement('input'); inkc.type = 'color'; inkc.value = st.ink; inkc.oninput = () => st.ink = inkc.value; row('tinta', inkc);
const papc = document.createElement('input'); papc.type = 'color'; papc.value = st.paper; papc.oninput = () => st.paper = papc.value; row('papel', papc);
row('quadros guardados', sel([['0', 'todos'], ['8', '8 quadros'], ['12', '12 quadros'], ['16', '16 quadros'], ['24', '24 quadros'], ['32', '32 quadros']], '0', v => { st.keep = +v; st.t0 = performance.now(); est.textContent = ''; }));
row('velocidade', sel([['0.5', '×0,5'], ['1', '×1'], ['2', '×2'], ['4', '×4']], '1', v => { st.speed = +v; st.t0 = performance.now(); }));
const btns = el('div'); btns.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap'; ctl.append(btns);
const mk = (t, f) => { const b = el('button', null, t); b.style.cssText = 'padding:8px 12px;border-radius:8px;border:1px solid #3a3644;background:#1d1823;color:#f2e2c4;cursor:pointer;font:600 13px system-ui'; b.onclick = f; btns.append(b); return b; };
const pb = mk('Pausar', () => { st.paused = !st.paused; pb.textContent = st.paused ? 'Retomar' : 'Pausar'; if (!st.paused) { const m = meta[st.hero] || { n: 1, fps: 8 }; st.t0 = performance.now() - (st.fj || 0) / nKept(m.n) * (m.n / m.fps) / st.speed * 1000; } });
mk('Do começo', () => { st.t0 = performance.now(); st.paused = false; pb.textContent = 'Pausar'; });
const rec = mk('Baixar vídeo (animação completa)', () => record());
mk('Estimar peso', () => estimate());
const est = el('div'); est.style.cssText = 'font:12px/1.5 system-ui;color:#a89080;white-space:pre-line'; ctl.append(est);
const info = el('div'); info.style.cssText = 'font:12px system-ui;color:#a89080'; ctl.append(info);

// ---- pixels: frame -> RGB array at 120/block -> dither -> canvas
const grabCv = {};
function grab(k, i, blk) {
  const m = meta[k], im = sheets[k]; if (!m || !im || !im.complete || !im.naturalWidth) return null;
  const c = i % m.cols, r = Math.floor(i / m.cols), n = Math.round(240 / blk);
  const g = grabCv[n] || (grabCv[n] = (() => { const t = document.createElement('canvas'); t.width = n; t.height = n; return { t, x: t.getContext('2d', { willReadFrequently: true }) }; })());
  g.x.imageSmoothingEnabled = true; g.x.clearRect(0, 0, n, n); g.x.drawImage(im, c * 120, r * 120, 120, 120, 0, 0, n, n);
  return { d: g.x.getImageData(0, 0, n, n).data, n };
}
function ramp(count) { const a = hex(st.paper), b = hex(st.ink); return Array.from({ length: count }, (_, i) => a.map((v, j) => Math.round(v + (b[j] - v) * i / (count - 1)))); }
function palette() { return st.tones === 'p2' ? ramp(2) : st.tones === 'p4' ? ramp(4) : st.tones === 'p8' ? ramp(8) : st.tones === 'p16' ? QPAL : null; }
const nearest = (P, r, g, b) => { let bi = 0, bd = 1e12; for (let i = 0; i < P.length; i++) { const dr = r - P[i][0], dg = g - P[i][1], db = b - P[i][2], d = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (d < bd) { bd = d; bi = i; } } return bi; };
function process(k, i, blk) {
  const g = grab(k, i, blk); if (!g) return null; const { d, n } = g, P = palette(), out = new Uint8Array(n * n), rgb = new Float32Array(n * n * 3);
  const ct = st.contrast, br = st.bright;
  for (let p = 0; p < n * n; p++) { const a = d[p * 4 + 3] / 255; for (let j = 0; j < 3; j++) { const v = d[p * 4 + j] * a + (st.tones === 'orig' ? 0 : hex(st.paper)[j]) * (1 - a); rgb[p * 3 + j] = clamp((v - 128) * ct + 128 + br, 0, 255); } }
  if (!P) return { n, rgb: Array.from(rgb), idx: null, P: null };
  const m = st.method;
  if (m === 'floyd' || m === 'atk') {
    const E = new Float32Array(rgb);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const p = y * n + x, r = clamp(E[p * 3], 0, 255), g2 = clamp(E[p * 3 + 1], 0, 255), b = clamp(E[p * 3 + 2], 0, 255), q = nearest(P, r, g2, b); out[p] = q;
      const er = [r - P[q][0], g2 - P[q][1], b - P[q][2]];
      const sp = (xx, yy, f) => { if (xx < 0 || xx >= n || yy >= n) return; const pp = yy * n + xx; for (let j = 0; j < 3; j++) E[pp * 3 + j] += er[j] * f; };
      if (m === 'floyd') { sp(x + 1, y, 7 / 16); sp(x - 1, y + 1, 3 / 16); sp(x, y + 1, 5 / 16); sp(x + 1, y + 1, 1 / 16); }
      else { [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => sp(x + dx, y + dy, 1 / 8)); }
    }
  } else {
    const spread = P.length <= 2 ? 120 : P.length <= 4 ? 70 : P.length <= 8 ? 44 : 30;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const p = y * n + x; let t = 0;
      if (m === 'bayer2') t = (BAYER[2][(y & 1) * 2 + (x & 1)] / 4 - .5) * spread; else if (m === 'bayer4') t = (BAYER[4][(y & 3) * 4 + (x & 3)] / 16 - .5) * spread;
      else if (m === 'bayer8') t = (BAYER[8][(y & 7) * 8 + (x & 7)] / 64 - .5) * spread; else if (m === 'noise') t = (Math.sin(x * 12.9898 + y * 78.233 + i * 3.1) * 43758.5453 % 1 - .5) * spread;
      out[p] = nearest(P, rgb[p * 3] + t, rgb[p * 3 + 1] + t, rgb[p * 3 + 2] + t);
    }
  }
  return { n, idx: out, P };
}
const outCv = {};
function paint(pr) {
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  if (!pr) { x.fillStyle = st.paper; x.fillRect(0, 0, 240, 240); return; }
  const n = pr.n, t = outCv[n] || (outCv[n] = (() => { const c = document.createElement('canvas'); c.width = n; c.height = n; return c; })()), tx = t.getContext('2d'), im = tx.createImageData(n, n);
  for (let p = 0; p < n * n; p++) { const c = pr.idx ? pr.P[pr.idx[p]] : [pr.rgb[p * 3], pr.rgb[p * 3 + 1], pr.rgb[p * 3 + 2]]; im.data[p * 4] = c[0]; im.data[p * 4 + 1] = c[1]; im.data[p * 4 + 2] = c[2]; im.data[p * 4 + 3] = 255; }
  tx.putImageData(im, 0, 0); x.drawImage(t, 0, 0, n, n, 0, 0, 240, 240);
}
const srcFrame = (j, n) => st.keep && st.keep < n ? Math.round(j * (n - 1) / (st.keep - 1)) : j;
const nKept = n => st.keep && st.keep < n ? st.keep : n;
function frameAt(tsec) { const m = meta[st.hero]; if (!m) return 0; return Math.floor(tsec * m.fps * st.speed) % m.n; }
function tick() {
  const m = meta[st.hero];
  if (m) {
    const now = performance.now();
    const nk = nKept(m.n), D = m.n / m.fps, j = st.paused ? (st.fj || 0) : Math.floor(((now - st.t0) / 1000) * st.speed / D * nk) % nk;
    st.fj = j;
    const i = srcFrame(j, m.n); st.fi = i;
    paint(process(st.hero, i, st.block));
    info.textContent = `${HEROES.find(h => h[0] === st.hero)[1]} · quadro ${j + 1}/${nk} (original ${i + 1}/${m.n}) · ${(m.n / m.fps).toFixed(1)} s · ${Math.round(240 / st.block)}×${Math.round(240 / st.block)} px · pixel de ${st.block} px · saída 240×240`;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
G.ULTLAB = { st, run: async () => { await estimate(); return est.textContent; } };

// ---- weight estimate: pack the indices (bits a pixel), raw and deflated, whole frames and frame-to-frame differences
async function deflate(u8) { if (!('CompressionStream' in window)) return null; const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter(); w.write(u8); w.close(); return (await new Response(cs.readable).arrayBuffer()).byteLength; }
async function estimate() {
  const m = meta[st.hero]; if (!m) return; est.textContent = 'calculando…'; const P = palette(), bpp = !P ? 24 : P.length <= 2 ? 1 : P.length <= 4 ? 2 : P.length <= 8 ? 3 : 4, n = Math.round(240 / st.block);
  const keep = st.method; let all = [], prev = null, dl = [];
  const nk = nKept(m.n); for (let j = 0; j < nk; j++) { const pr = process(st.hero, srcFrame(j, m.n), st.block); if (!pr || !pr.idx) { est.textContent = 'escolha uma paleta (1, 2, 3 ou 4 bits) para estimar'; return; }
    const pk = new Uint8Array(Math.ceil(n * n * bpp / 8)); for (let p = 0; p < n * n; p++) { const v = pr.idx[p], bit = p * bpp; for (let b = 0; b < bpp; b++) if ((v >> b) & 1) pk[(bit + b) >> 3] |= 1 << ((bit + b) & 7); }
    all.push(pk); dl.push(prev ? pk.map((v, j) => v ^ prev[j]) : pk); prev = pk; if (j % 40 === 0) await new Promise(r => setTimeout(r)); }
  const cat = a => { const t = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let o = 0; a.forEach(x => { t.set(x, o); o += x.length; }); return t; };
  const raw = cat(all).length, d1 = await deflate(cat(all)), d2 = await deflate(cat(dl)); st.method = keep;
  const kb = v => v == null ? '—' : (v / 1024).toFixed(1) + ' KB';
  est.textContent = `${nk} quadros · ${n}×${n} px · ${bpp} bit${bpp > 1 ? 's' : ''} por pixel\nbruto: ${kb(raw)} · comprimido: ${kb(d1)} · só as diferenças entre quadros: ${kb(d2)}\n(um golpe final no firmware: ~${kb(d2 != null ? d2 * 1.15 : null)} contando o leitor)`;
}

// ---- the whole animation to a video file
async function record() {
  const m = meta[st.hero]; if (!m) return; if (!window.MediaRecorder) { est.textContent = 'este navegador não grava vídeo'; return; }
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'], type = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  const stream = cv.captureStream(m.fps * st.speed), rc = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4e6 }), chunks = [];
  rc.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => rc.onstop = r);
  st.paused = false; pb.textContent = 'Pausar'; st.t0 = performance.now(); rec.disabled = true; rc.start();
  const dur = m.n / m.fps / st.speed * 1000;
  const iv = setInterval(() => { est.textContent = `gravando ${Math.min(100, Math.round((performance.now() - st.t0) / dur * 100))}%…`; }, 400);
  await new Promise(r => setTimeout(r, dur + 250)); rc.stop(); await done; clearInterval(iv); rec.disabled = false;
  const ext = /mp4/.test(type) ? 'mp4' : 'webm', blob = new Blob(chunks, { type: type || 'video/webm' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `ult-${st.hero}-dither.${ext}`; a.click();
  est.textContent = ext === 'mp4' ? 'vídeo baixado (mp4).' : 'este navegador gravou em webm (o mp4 depende do navegador): vídeo baixado em webm.';
}
})(window);
