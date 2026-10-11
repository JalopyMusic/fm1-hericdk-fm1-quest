// FM1 Quest lab — Ferramentas: imagem -> dither. Envie uma imagem, escolha o método, os tons, o tamanho do pixel, o brilho e o contraste; retoque pixel a pixel e baixe o PNG.
(function (G) {
'use strict';
const host = document.getElementById('imgdither'); if (!host) return;
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const QPAL = ['1a1016', '2b2338', '5a3050', '2f4a3a', '6a4030', '4a3c48', 'a89aa0', 'f2e2c4', 'c8443c', 'e08a3a', 'f0c860', '6a9a4a', '4a78b0', '8a6a9a', 'e09090', 'f0b890'].map(h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)));
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], B2 = [0, 2, 3, 1];
const B8 = (() => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0, a = x, b = y ^ x; for (let i = 0; i < 3; i++) v = (v << 2) | ((a >> (2 - i) & 1) << 1) | (b >> (2 - i) & 1); m.push(v); } return m; })();
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const st = { method: 'bayer4', tones: 'p2', px: 2, bright: 0, contrast: 1, ink: '#f2e2c4', paper: '#14101a', fit: 'cover', bg: 1, tool: 'ink' };
let img = null, edits = new Map(), last = null;

const sec = el('div', 'edsec'); sec.innerHTML = '<h3>Imagem → dither</h3><p class="sub2">Envie uma imagem (PNG, JPG, GIF, WebP). Ela é ajustada à tela de 240×240; o dither muda na hora com as opções. Com o lápis você retoca pixels à mão (os retoques ficam ao trocar as opções), e o botão baixa um PNG do tamanho que você escolheu.</p>';
host.append(sec);
const wrap = el('div'); wrap.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start'; sec.append(wrap);
const cv = document.createElement('canvas'); cv.width = 240; cv.height = 240; cv.style.cssText = 'width:480px;height:480px;max-width:100%;image-rendering:pixelated;background:#14101a;border-radius:8px;cursor:crosshair;touch-action:none'; wrap.append(cv);
const ctl = el('div'); ctl.style.cssText = 'min-width:260px;flex:1;display:grid;gap:8px;font:13px system-ui,sans-serif'; wrap.append(ctl);
const row = (label, node) => { const d = el('label'); d.style.cssText = 'display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center'; d.append(el('span', null, label), node); ctl.append(d); return node; };
const sel = (opts, val, f) => { const s = document.createElement('select'); opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); }); s.value = val; s.onchange = () => { f(s.value); draw(); }; return s; };
const rng = (min, max, step, val, f) => { const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val; r.oninput = () => { f(+r.value); draw(); }; return r; };
const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; row('imagem', file);
file.onchange = () => { const f = file.files[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { img = im; edits.clear(); draw(); URL.revokeObjectURL(u); }; im.src = u; };
const px = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];
row('tamanho do pixel', sel(px.map(v => [String(v), v + ' px (' + Math.round(240 / v) + '×' + Math.round(240 / v) + ')']), String(st.px), v => { st.px = +v; edits.clear(); }));
row('método', sel([['none', 'sem dither (limiar)'], ['bayer2', 'ordenado 2×2'], ['bayer4', 'ordenado 4×4'], ['bayer8', 'ordenado 8×8'], ['floyd', 'Floyd–Steinberg'], ['atk', 'Atkinson'], ['noise', 'ruído']], st.method, v => st.method = v));
row('tons', sel([['p2', '1 bit (tinta e papel)'], ['p4', '2 bits (4 tons)'], ['p8', '3 bits (8 tons)'], ['p16', 'paleta do Quest (16 cores)'], ['orig', 'cores originais']], st.tones, v => st.tones = v));
row('enquadrar', sel([['cover', 'preencher (corta)'], ['contain', 'caber inteira']], st.fit, v => { st.fit = v; edits.clear(); }));
row('brilho', rng(-100, 100, 1, 0, v => st.bright = v));
row('contraste', rng(0.4, 3, 0.05, 1, v => st.contrast = v));
const inkc = document.createElement('input'); inkc.type = 'color'; inkc.value = st.ink; inkc.oninput = () => { st.ink = inkc.value; draw(); }; row('tinta', inkc);
const papc = document.createElement('input'); papc.type = 'color'; papc.value = st.paper; papc.oninput = () => { st.paper = papc.value; draw(); }; row('papel', papc);
row('lápis', sel([['ink', 'pinta com a tinta'], ['paper', 'pinta com o papel'], ['off', 'desligado']], st.tool, v => st.tool = v));
const bt = el('div'); bt.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap'; ctl.append(bt);
const mk = (t, f) => { const b = el('button', null, t); b.style.cssText = 'padding:8px 12px;border-radius:8px;border:1px solid #3a3644;background:#1d1823;color:#f2e2c4;cursor:pointer;font:600 13px system-ui'; b.onclick = f; bt.append(b); return b; };
mk('Limpar retoques', () => { edits.clear(); draw(); });
mk('Baixar PNG', () => { const o = document.createElement('canvas'), n = Math.round(240 / st.px), z = 240 / n; o.width = 240; o.height = 240; o.getContext('2d').drawImage(cv, 0, 0); const a = document.createElement('a'); a.href = o.toDataURL('image/png'); a.download = 'dither-' + n + 'x' + n + '.png'; a.click(); });
mk('Baixar pequeno (1 pixel = 1 ponto)', () => { if (!last) return; const o = document.createElement('canvas'); o.width = last.n; o.height = last.n; const x = o.getContext('2d'), im = x.createImageData(last.n, last.n); last.rgb.forEach((c, p) => { im.data[p * 4] = c[0]; im.data[p * 4 + 1] = c[1]; im.data[p * 4 + 2] = c[2]; im.data[p * 4 + 3] = 255; }); x.putImageData(im, 0, 0); const a = document.createElement('a'); a.href = o.toDataURL('image/png'); a.download = 'dither-' + last.n + 'x' + last.n + '-pequeno.png'; a.click(); });
const info = el('div'); info.style.cssText = 'font:12px system-ui;color:#a89080'; ctl.append(info);

function palette() { const mkr = c => { const a = hex(st.paper), b = hex(st.ink); return Array.from({ length: c }, (_, i) => a.map((v, j) => Math.round(v + (b[j] - v) * i / (c - 1)))); };
  return st.tones === 'p2' ? mkr(2) : st.tones === 'p4' ? mkr(4) : st.tones === 'p8' ? mkr(8) : st.tones === 'p16' ? QPAL : null; }
const nearest = (P, r, g, b) => { let bi = 0, bd = 1e12; for (let i = 0; i < P.length; i++) { const dr = r - P[i][0], dg = g - P[i][1], db = b - P[i][2], d = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (d < bd) { bd = d; bi = i; } } return bi; };
function draw() {
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  if (!img) { x.fillStyle = st.paper; x.fillRect(0, 0, 240, 240); x.fillStyle = '#a89080'; x.font = '12px system-ui'; x.fillText('envie uma imagem', 70, 120); info.textContent = ''; return; }
  const n = Math.round(240 / st.px), t = document.createElement('canvas'); t.width = n; t.height = n; const tx = t.getContext('2d', { willReadFrequently: true });
  tx.fillStyle = st.paper; tx.fillRect(0, 0, n, n); tx.imageSmoothingEnabled = true;
  const s = st.fit === 'cover' ? Math.max(n / img.width, n / img.height) : Math.min(n / img.width, n / img.height), w = img.width * s, h = img.height * s;
  tx.drawImage(img, (n - w) / 2, (n - h) / 2, w, h);
  const d = tx.getImageData(0, 0, n, n).data, P = palette(), rgb = new Float32Array(n * n * 3), out = [];
  for (let p = 0; p < n * n; p++) for (let j = 0; j < 3; j++) rgb[p * 3 + j] = clamp((d[p * 4 + j] - 128) * st.contrast + 128 + st.bright, 0, 255);
  const idx = new Array(n * n);
  if (!P) { for (let p = 0; p < n * n; p++) out[p] = [rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]]; }
  else if (st.method === 'floyd' || st.method === 'atk') {
    const E = new Float32Array(rgb);
    for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) { const p = y * n + xx, r = clamp(E[p * 3], 0, 255), g = clamp(E[p * 3 + 1], 0, 255), b = clamp(E[p * 3 + 2], 0, 255), q = nearest(P, r, g, b); idx[p] = q;
      const er = [r - P[q][0], g - P[q][1], b - P[q][2]], sp = (a, c, f) => { if (a < 0 || a >= n || c >= n) return; const pp = c * n + a; for (let j = 0; j < 3; j++) E[pp * 3 + j] += er[j] * f; };
      if (st.method === 'floyd') { sp(xx + 1, y, 7 / 16); sp(xx - 1, y + 1, 3 / 16); sp(xx, y + 1, 5 / 16); sp(xx + 1, y + 1, 1 / 16); } else [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => sp(xx + dx, y + dy, 1 / 8)); }
  } else {
    const spread = P.length <= 2 ? 120 : P.length <= 4 ? 70 : P.length <= 8 ? 44 : 30;
    for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) { const p = y * n + xx; let th = 0, m = st.method;
      if (m === 'bayer2') th = (B2[(y & 1) * 2 + (xx & 1)] / 4 - .5) * spread; else if (m === 'bayer4') th = (B4[(y & 3) * 4 + (xx & 3)] / 16 - .5) * spread; else if (m === 'bayer8') th = (B8[(y & 7) * 8 + (xx & 7)] / 64 - .5) * spread; else if (m === 'noise') th = (Math.sin(xx * 12.9898 + y * 78.233) * 43758.5453 % 1 - .5) * spread;
      idx[p] = nearest(P, rgb[p * 3] + th, rgb[p * 3 + 1] + th, rgb[p * 3 + 2] + th); }
  }
  const o = tx.createImageData(n, n), pk = hex(st.paper), ik = hex(st.ink);
  for (let p = 0; p < n * n; p++) { let c = P ? P[idx[p]] : out[p]; const e = edits.get(p); if (e) c = e === 1 ? ik : pk; o.data[p * 4] = c[0]; o.data[p * 4 + 1] = c[1]; o.data[p * 4 + 2] = c[2]; o.data[p * 4 + 3] = 255; }
  tx.putImageData(o, 0, 0); x.drawImage(t, 0, 0, n, n, 0, 0, 240, 240);
  last = { n, rgb: Array.from({ length: n * n }, (_, p) => [o.data[p * 4], o.data[p * 4 + 1], o.data[p * 4 + 2]]) };
  info.textContent = `${n}×${n} pontos · pixel de ${st.px} px · ${P ? P.length + ' tons' : 'cores originais'}${edits.size ? ' · ' + edits.size + ' retoques' : ''}`;
}
let down = false;
const paintAt = e => { if (st.tool === 'off' || !img) return; const r = cv.getBoundingClientRect(), n = Math.round(240 / st.px), xx = Math.floor((e.clientX - r.left) / r.width * n), yy = Math.floor((e.clientY - r.top) / r.height * n); if (xx < 0 || yy < 0 || xx >= n || yy >= n) return; edits.set(yy * n + xx, st.tool === 'ink' ? 1 : 2); draw(); };
cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); paintAt(e); });
cv.addEventListener('pointermove', e => { if (down) paintAt(e); });
cv.addEventListener('pointerup', () => down = false);
draw();
})(window);
