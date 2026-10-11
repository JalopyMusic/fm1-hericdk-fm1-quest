// FM1 Quest lab — pixel toolkit + tile builder for the full-screen "new" screens (canvas 240x240, TAVERN palette, no side view).
(function (G) {
'use strict';
const Sc = G.Scene, PAL = Sc.PALS['1c'];
const UI = { bg: '#1e1418', tx: '#f2e2c4', dim: '#a89080', pnl: '#3a2620', bd: '#c8963c', hi: '#f0c860', ln: '#5a3a28', rec: '#e0503c', off: '#2e2226', t: ['#5a8ad0', '#7ab04e', '#f0c860', '#e08a3a'] };
const col = i => typeof i === 'number' ? PAL[i] : i;
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, fr = v => v - Math.floor(v);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, outBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const hs = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---- crisp text: the glyphs are rasterised once, thresholded, and kept as 1 px runs (no anti-aliasing, like the device font)
const tcv = document.createElement('canvas'); tcv.width = 420; tcv.height = 110; const tcx = tcv.getContext('2d', { willReadFrequently: true });
const MASKS = new Map();
const TF = { name: 'Jacquarda Bastarda 9', scale: 1 };
function fontOf(f, sz) { return f === 't' ? `${Math.max(8, Math.round(sz * TF.scale))}px "${TF.name}", serif` : `${sz}px "Pixelify Sans", "Hiragino Sans", sans-serif`; }
function mask(s, f, sz) {
  const key = (f === 't' ? TF.name : 'p') + f + sz + '|' + s, hit = MASKS.get(key); if (hit) return hit;
  const font = fontOf(f, sz), ready = document.fonts.check(font);
  tcx.clearRect(0, 0, tcv.width, tcv.height); tcx.font = font; tcx.textBaseline = 'top'; tcx.fillStyle = '#fff';
  const w = Math.min(tcv.width, Math.ceil(tcx.measureText(s).width) + 2), h = Math.min(tcv.height, Math.ceil(sz * 1.35));
  tcx.fillText(s, 1, 0);
  const d = tcx.getImageData(0, 0, w, h).data, runs = [];
  for (let y = 0; y < h; y++) { let x0 = -1; for (let x = 0; x <= w; x++) { const on = x < w && d[(y * w + x) * 4 + 3] >= 110; if (on && x0 < 0) x0 = x; else if (!on && x0 >= 0) { runs.push([x0, y, x - x0]); x0 = -1; } } }
  const m = { w, h, runs }; if (ready) MASKS.set(key, m); return m;
}

// ---- drawing context for one canvas
function makeG(cv) {
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const CF = CanvasRenderingContext2D.prototype.fillRect; c.fillRect = function (a, b, w, h) { g.n++; return CF.call(c, a, b, w, h); };
  const g = {
    n: 0,
    c, W: 240, H: 240, PAL, UI,
    R(x, y, w, h, i) { c.fillStyle = col(i); c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },
    px(x, y, i) { c.fillStyle = col(i); c.fillRect(Math.round(x), Math.round(y), 1, 1); },
    clear(i) { g.pn = null; c.fillStyle = col(i); c.fillRect(0, 0, 240, 240); },
    line(x0, y0, x1, y1, i) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); c.fillStyle = col(i); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0; for (;;) { c.fillRect(x0, y0, 1, 1); if ((x0 === x1 && y0 === y1) || n++ > 600) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    poly(P, i) {
      let y0 = 1e9, y1 = -1e9; for (const p of P) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(239, Math.ceil(y1)); c.fillStyle = col(i);
      for (let y = y0; y <= y1; y++) {
        const yy = y + .5, xs = [];
        for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
        xs.sort((p, q) => p - q); for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) c.fillRect(xa, y, xb - xa, 1); }
      }
    },
    polyO(P, i) { for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; g.line(a[0], a[1], b[0], b[1], i); } },
    ell(cx, cy, rx, ry, i) { c.fillStyle = col(i); const n = Math.ceil(ry); for (let dy = -n; dy <= n; dy++) { const q = 1 - (dy / (ry + .01)) * (dy / (ry + .01)); if (q < 0) continue; const w = Math.round(rx * Math.sqrt(q)); c.fillRect(Math.round(cx) - w, Math.round(cy) + dy, 2 * w + 1, 1); } },
    ellO(cx, cy, rx, ry, i, a0, a1) { c.fillStyle = col(i); a0 = a0 == null ? 0 : a0; a1 = a1 == null ? TAU : a1; const n = Math.max(8, Math.ceil(Math.max(rx, ry) * 3)); for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; c.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1); } },
    disc(cx, cy, r, i) { g.ell(cx, cy, r, r, i); },
    // dithered band between y0..y1 (each colour a band; a 2-row checker at every border)
    sky(y0, y1, cols, dith) {
      const n = cols.length, h = (y1 - y0) / n;
      for (let k = 0; k < n; k++) {
        const a = Math.round(y0 + k * h), b = Math.round(y0 + (k + 1) * h); g.R(0, a, 240, b - a, cols[k]);
        if (dith !== false && k > 0) { c.fillStyle = col(cols[k - 1]); for (let r = 0; r < 2; r++) for (let x = (r % 2); x < 240; x += 2) c.fillRect(x, a + r, 1, 1); }
      }
    },
    txt(s, x, y, i, o) {
      o = o || {}; const f = o.f || 'p'; let sz = o.sz || 10, str = String(s), m = mask(str, f, sz), ox = Math.round(x);
      if (o.mw) { while (m.w > o.mw && sz > 8) { sz--; m = mask(str, f, sz); } let cut = false; while (m.w > o.mw && str.length > 2) { str = str.slice(0, -1); cut = true; m = mask(str + '…', f, sz); } if (cut) { str += '…'; m = mask(str, f, sz); } }
      if (o.ls) { const chars = [...str], ws = chars.map(ch => mask(ch, f, sz).w - 1), tot = ws.reduce((a, b) => a + b + o.ls, 0) - o.ls; let cx = Math.round(x); if (o.al === 'c') cx -= Math.round(tot / 2); else if (o.al === 'r') cx -= tot; const oy0 = Math.round(y); const rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), mx = tot / 2, my = sz / 2; const dr = (dx, dy, ci) => { c.fillStyle = col(ci); let px = cx; chars.forEach((ch, i) => { const mm = mask(ch, f, sz); for (const r of mm.runs) { if (!rot) c.fillRect(px + r[0] + dx, oy0 + r[1] + dy, r[2], 1); else for (let q = 0; q < r[2]; q++) { const lx = px - cx + r[0] + q - mx, ly = r[1] - my; c.fillRect(Math.round(cx + mx + lx * cr - ly * sr) + dx, Math.round(oy0 + my + lx * sr + ly * cr) + dy, 1, 2); } } px += ws[i] + o.ls; }); }; if (o.ol != null) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) dr(a, b, o.ol); dr(0, 0, i); return tot; }
      const pn = g.pn; if (pn && !o.nofit && !o.al && y >= pn.y - 1 && y < pn.y + pn.h) { const lim = pn.x + pn.w - 5; while (ox + m.w > lim && sz > 8) { sz--; m = mask(str, f, sz); } let cut = false; while (ox + m.w > lim && str.length > 3) { str = str.slice(0, -1); cut = true; m = mask(str + '…', f, sz); } if (cut) str += '…'; m = mask(str, f, sz); }
      if (o.al === 'c') ox -= Math.round(m.w / 2); else if (o.al === 'r') ox -= m.w;
      const oy = Math.round(y), draw = (dx, dy, ci) => { c.fillStyle = col(ci); for (const r of m.runs) c.fillRect(ox + r[0] + dx, oy + r[1] + dy, r[2], 1); };
      if (o.ol != null) { draw(1, 0, o.ol); draw(-1, 0, o.ol); draw(0, 1, o.ol); draw(0, -1, o.ol); }
      if (o.sh != null) draw(1, 1, o.sh);
      draw(0, 0, i); return m.w;
    },
    tw(s, f, sz) { return mask(String(s), f || 'p', sz || 8).w; },
    panel(x, y, w, h) { g.pn = { x, y, w, h }; g.R(x - 1, y - 1, w + 2, h + 2, UI.bg); g.R(x, y, w, h, UI.bd); g.R(x + 1, y + 1, w - 2, h - 2, UI.bg); g.R(x + 2, y + 2, w - 4, h - 4, '#6a4030'); g.R(x + 3, y + 3, w - 6, h - 6, UI.pnl); },
    bar(title, sub, right) {
      g.R(0, 0, 240, 19, UI.bg); g.R(0, 18, 240, 1, UI.ln);
      const w = g.txt(title, 6, 1, UI.hi, { f: 't', sz: 16 }); if (sub) g.txt(sub, 6 + w + 6, 5, UI.dim);
      if (right) g.txt(right, 234, 5, UI.tx, { al: 'r' });
    },
    dials(lab, val, ratio) {
      const F = g._foot, Y = F ? 187 : 197;      // a screen with a footer gives 10 px of the dial block to the black strip
      g.R(0, Y, 240, 240 - Y, UI.bg); g.R(0, Y, 240, 1, UI.ln);
      for (let i = 0; i < 4; i++) {
        const cx = 30 + i * 60; let kc = DIAL[i]; if (!kc) { kc = DIAL[i] = document.createElement('canvas'); kc.width = kc.height = 20; }
        kc.dataset.knob = clamp(ratio[i], 0, 1); kc.dataset.col = UI.t[i]; kc.dataset.dir = '1c'; Sc.drawKnob(kc); c.drawImage(kc, cx - 10, Y + 4);
        g.txt(lab[i], cx, Y + 26, UI.dim, { al: 'c', mw: 56 }); g.txt(val[i], cx, Y + 34, UI.tx, { al: 'c', mw: 56 });
      }
      if (F) { g.R(0, 230, 240, 10, '#000000'); g.txt(F[0], 4, 231, '#8a8a96', { sz: 8, nofit: true }); if (F[1]) g.txt(F[1], 236, 231, '#8a8a96', { sz: 8, al: 'r', nofit: true }); }
    },
  };
  return g;
}
const DIAL = [];

// ---- tile data → DOM
const REG = [];
const AUD = { ctx: null, on: () => { const b = document.getElementById('c-sound'); return !b || b.classList.contains('on'); },
  get() { if (!AUD.ctx) AUD.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (AUD.ctx.state === 'suspended') AUD.ctx.resume(); return AUD.ctx; },
  // 2-operator FM voice: ratio, index (modulation index), decay (index fades), f0, dur
  fm(o) { if (!AUD.on()) return; const c = AUD.get(), t = c.currentTime, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), out = c.createGain();
    const f0 = o.f0 || 220, fm = f0 * (o.ratio || 1), idx = (o.index || 0) * fm; car.frequency.value = f0; mod.frequency.value = fm; mg.gain.setValueAtTime(idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * Math.exp(-(o.decay || 0) * 2.4)), t + (o.dur || 1));
    mod.connect(mg); mg.connect(car.frequency); out.gain.setValueAtTime(.0001, t); out.gain.linearRampToValueAtTime(.22, t + .01); out.gain.exponentialRampToValueAtTime(.0001, t + (o.dur || 1)); car.connect(out); out.connect(c.destination); car.start(t); mod.start(t); car.stop(t + (o.dur || 1) + .05); mod.stop(t + (o.dur || 1) + .05); },
  // amplitude envelope on a plain saw (the ADSR dojo)
  env(A, D, S, R, dur) { if (!AUD.on()) return; const c = AUD.get(), t = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 196; f.type = 'lowpass'; f.frequency.value = 1800; const a = Math.max(.005, A * dur), d = Math.max(.01, D * dur), r = Math.max(.02, R * dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.25, t + a); g.gain.linearRampToValueAtTime(.25 * S, t + a + d); g.gain.setValueAtTime(.25 * S, t + dur - r); g.gain.linearRampToValueAtTime(.0001, t + dur); o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .05); },
  voice(fx) { if (!AUD.on()) return; const c = AUD.get(), t = c.currentTime, out = c.createGain(), o = c.createOscillator(), f = c.createBiquadFilter(); out.gain.value = .0001; const P = [[300, 440], [320, 380], [560, 760], [130, 190], [300, 440], [0, 0]][fx];
    if (fx === 5) { const b = c.createBuffer(1, c.sampleRate * .5, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.4; s.connect(f); f.connect(out); out.gain.setValueAtTime(.0001, t); out.gain.linearRampToValueAtTime(.18, t + .05); out.gain.exponentialRampToValueAtTime(.0001, t + .45); s.start(t); out.connect(c.destination); return; }
    o.type = fx === 1 ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(P[0], t); o.frequency.linearRampToValueAtTime(P[1], t + .12); o.frequency.linearRampToValueAtTime(P[0] * 1.1, t + .3); f.type = 'lowpass'; f.frequency.value = fx === 1 ? 2400 : 1500; f.Q.value = fx === 3 ? 6 : 3; o.connect(f); f.connect(out);
    if (fx === 1) { const lf = c.createOscillator(), lg = c.createGain(); lf.frequency.value = 45; lg.gain.value = .5; lf.connect(lg); lg.connect(out.gain); lf.start(t); lf.stop(t + .5); }
    out.gain.setValueAtTime(.0001, t); out.gain.linearRampToValueAtTime(.2, t + .03); out.gain.exponentialRampToValueAtTime(.0001, t + .4); o.start(t); o.stop(t + .45);
    if (fx === 4) { const d = c.createDelay(1), fb = c.createGain(); d.delayTime.value = .22; fb.gain.value = .5; out.connect(d); d.connect(fb); fb.connect(d); d.connect(c.destination); } out.connect(c.destination); },
  harm(arr, f0) { if (!AUD.on()) return; const c = AUD.get(), t = c.currentTime, o = c.createOscillator(), gn = c.createGain(), re = new Float32Array(arr.length + 1), im = new Float32Array(arr.length + 1); arr.forEach((a, i) => { im[i + 1] = a; }); o.setPeriodicWave(c.createPeriodicWave(re, im)); o.frequency.value = f0 || 196; gn.gain.setValueAtTime(.0001, t); gn.gain.linearRampToValueAtTime(.2, t + .02); gn.gain.setValueAtTime(.2, t + .8); gn.gain.exponentialRampToValueAtTime(.0001, t + 1.2); o.connect(gn); gn.connect(c.destination); o.start(t); o.stop(t + 1.25); },
  tone(f, dur) { if (!AUD.on()) return; const c = AUD.get(), t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.2, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + (dur || .4)); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (dur || .4) + .05); } };
// computer keys A S D F G and the FM-1 over USB MIDI both feed the games
const INP = { subs: [], held: new Set(), log: [], midi: null, name: '' };
INP.fire = ev => { INP.subs.forEach(f => { try { f(ev); } catch (e) {} }); };
addEventListener('keydown', e => { if (e.key === '[' || e.key === ']') INP.fire({ type: 'octave', d: e.key === ']' ? 1 : -1 }); const simOn = window.G && G.SIM && G.SIM.api && G.SIM.api.host && G.SIM.api.host.offsetParent !== null; if (simOn) return;      /* with the simulator in view, the letters are buttons (F, E, L…) and the digits are the pads: no second mapping */
  if (!e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') { const w = 'asdfghjkl'.indexOf(e.key.toLowerCase()); if (w >= 0) INP.fire({ type: 'white', w: 7 + w, t: performance.now(), src: 'kbd' }); } if (e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; const l = 'asdfg'.indexOf(e.key.toLowerCase()); if (l >= 0) INP.fire({ type: 'lane', lane: l, t: performance.now(), src: 'kbd' }); });
INP.connect = async () => { if (!navigator.requestMIDIAccess) { INP.name = 'Web MIDI indisponível (use Chrome ou Edge)'; return INP.name; } try { const m = await navigator.requestMIDIAccess({ sysex: false }); INP.midi = m; const ins = [...m.inputs.values()]; INP.name = ins.length ? 'FM-1 conectado (' + ins.length + ' entrada' + (ins.length > 1 ? 's' : '') + ' MIDI)' : 'nenhuma entrada MIDI encontrada'; ins.forEach(i => { i.onmidimessage = e => { const [st, d1, d2] = e.data, k = st & 240; const rec = { st, d1, d2, t: e.timeStamp }; INP.log.unshift(rec); INP.log.length = Math.min(INP.log.length, 12); if (k === 144 && d2 > 0) { INP.held.add(d1); INP.fire({ type: 'note', note: d1, vel: d2, lane: ((d1 % 12) * 5 / 12) | 0, t: e.timeStamp, src: 'midi' }); } else if (k === 128 || (k === 144 && !d2)) INP.held.delete(d1); }; }); return INP.name; } catch (e) { INP.name = 'acesso MIDI negado'; return INP.name; } };
function how(spec, proposal) {
  const kinds = { tap: 'TAP', hold: 'HOLD', turn: 'TURN', key: 'KEY', press: 'PRESS', auto: 'AUTO', rec: 'REC' };
  const rows = spec.map(line => {
    const ix = line.indexOf(' = '), lhs = ix < 0 ? line : line.slice(0, ix), res = ix < 0 ? '' : line.slice(ix + 3);
    const steps = lhs.split(' + ').map(tok => { const j = tok.indexOf(':'), k = tok.slice(0, j), v = tok.slice(j + 1); return `<span class="kc k-${k}"><i>${kinds[k] || k}</i><b>${v}</b></span>`; }).join('<span class="pl">+</span>');
    return `<div class="row">${steps}${res ? `<span class="res">${res}</span>` : ''}</div>`;
  }).join('');
  return `<div class="how${proposal ? ' prop' : ''}"><div class="t">COMO ACESSAR${proposal ? ' <u>proposta</u>' : ''}</div>${rows}</div>`;
}
const fmtMs = (w, h) => (w * h * 2) / 1500;
function spiHTML(an, fps) {
  if (!an) return '';
  const ms = fmtMs(an[0], an[1]), share = ms * fps / 10, maxf = 550 / ms;
  return `<div class="spi ${share > 55 ? 'bad' : ''}"><b>SPI</b> área animada ${an[0]}×${an[1]} = ${ms.toFixed(0)} ms/quadro · a ${fps} fps usa <b>${Math.round(share)}%</b> do barramento (teto 55% ≈ ${Math.floor(maxf)} fps)</div>`;
}
function add(def) { REG.push(def); return def; }
function build(def, host) {
  const el = document.createElement('div'); el.className = 'tile gfx';
  const k = def.fields.map(f => f.v);
  el.innerHTML = `<div class="lcdbox"><canvas class="cv" width="240" height="240"></canvas></div>
    <div class="cap"><b>${def.name}</b><span>${def.tag}</span></div>
    ${def.how ? how(def.how, def.prop !== false) : ''}
    ${def.fields.length ? `<div class="ctl">${def.fields.map((f, i) => `<label>${f.l}<input type="range" min="0" max="1" step="0.01" value="${f.v}" data-i="${i}"><output></output></label>`).join('')}</div>
    <div class="help"><ul>${def.fields.map(f => `<li><b>${f.l}</b> ${f.d}</li>`).join('')}</ul></div>` : ''}
    <div class="note">${def.desc}</div>
    ${def.an ? '<div class="spi-h"></div>' : ''}
    <ul>${def.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
  host.append(el);
  const t = { def, el, k, cv: el.querySelector('canvas'), st: {}, vis: true, g: null, outs: [] };
  t.g = makeG(t.cv);
  const upd = () => { def.fields.forEach((f, i) => { t.outs[i].textContent = f.fmt ? f.fmt(t.k[i]) : Math.round(t.k[i] * 100); }); };
  el.querySelectorAll('input[type=range]').forEach(inp => { const i = +inp.dataset.i; t.outs[i] = inp.nextElementSibling; inp.oninput = () => { t.k[i] = +inp.value; upd(); if (def.onField) def.onField(t, i); }; });
  upd(); t.upd = upd;
  if (def.extra) def.extra(t);
  t.setSpi = fps => { const h = el.querySelector('.spi-h'); if (h) h.innerHTML = spiHTML(def.an, fps); };
  t.setSpi(G.LAB ? G.LAB.fps : 16);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { t.vis = e.isIntersecting; })).observe(el);
  TILES.push(t); return t;
}
function placeholder(def, host) {
  const el = document.createElement('div'); el.className = 'tile';
  el.innerHTML = `<div class="ph"><span class="n">${def.n}</span><b>${def.name}</b><em>${def.tag}</em></div>
    <div class="cap"><b>${def.name}</b><span>${def.tag}</span></div>
    ${def.how ? how(def.how, true) : ''}
    ${def.fields.length ? `<div class="help"><ul>${def.fields.map(f => `<li><b>${f[0]}</b> ${f[1]}</li>`).join('')}</ul></div>` : ''}
    <div class="note">${def.desc}</div>
    <ul>${def.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
  host.append(el);
}
const TILES = [];
let last = 0, t0 = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const L = G.LAB; if (!L) return; const fps = L.fps || 16;
  if (now - last < 1000 / fps - 4) return; last = now; if (L.ctl && L.ctl.freeze) return;
  const t = (now - t0) / 1000;
  for (const tl of TILES) { if (!tl.vis && !G.GFX.all) continue; const p0 = performance.now(); tl.g.n = 0; tl.g._foot = (G.FOOT && G.FOOT[tl.def.name]) || null; try { tl.def.draw(tl.g, t, tl.k, tl.st, tl); tl.rects = tl.g.n; tl.ms = performance.now() - p0; if (G.STYLE && G.STYLE.on) { const pn = G.STYLE.forDef(tl.def.name); if (pn) { G.STYLE.apply(tl.g.c, 0, 19, 240, 178, pn); G.STYLE.flat(tl.g.c, 0, 0, 240, 19, pn); G.STYLE.flat(tl.g.c, 0, 197, 240, 43, pn); } else G.STYLE.flat(tl.g.c, 0, 0, 240, 240, 'castelo'); } } catch (e) { if (!tl.err) { tl.err = 1; console.error(tl.def.name, e); } } }
}
requestAnimationFrame(loop);
G.GFX = { AUD, INP, TF, MASKS, nowT: () => (performance.now() - t0) / 1000, sheet(idx) { G.GFX.all = true; let o = document.getElementById('__sheet'); if (o) o.remove(); o = document.createElement('canvas'); o.id = '__sheet'; o.width = 800; o.height = 585; o.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#222'; const c = o.getContext('2d'); c.imageSmoothingEnabled = false; idx.forEach((i, n) => { const t = TILES[i]; if (!t) return; const x = (n % 2) * 400, y = Math.floor(n / 2) * 292; c.drawImage(t.cv, x, y, 288, 288); c.fillStyle = '#fff'; c.font = '11px monospace'; c.fillText(i + ' ' + t.def.name, x + 296, y + 12); }); document.body.append(o); return 'ok'; },  add, build, placeholder, TILES, REG, how, spiHTML, UI, col, PAL, TAU, clamp, lerp, fr, ease, outBack, hs, makeG };
})(window);
