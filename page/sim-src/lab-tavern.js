// FM1 Quest lab — the TAVERN, redrawn: an isometric room (pixel-art, warm wood), no vikings; the four heroes and seven regulars drink, toast and enjoy the music (notes rise from them).
// All art is made of rectangles from a fixed colour list, so it stays pixel-sharp (no smooth lines); the regulars are the user's own sprites (tavern/*.png|gif), shrunk, trimmed and quantised to ≤14 colours each to fit the FM-1 memory.
(function (G) {
'use strict';
const SC = G.SCENES, Hh = SC && SC.H; if (!SC || !Hh) return; const { hs, mixc } = Hh, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const K = { ol: '#1c1210', w1: '#3a2416', w2: '#5a3820', w3: '#7a4e2a', p1: '#b5793a', p2: '#c98d48', p3: '#dba35c', p4: '#ecc27a', pl: '#e8d5a8', ps: '#cdb584', cr: '#f6ebc8', r1: '#a8322a', r2: '#c8483a', g1: '#5a7a3a', g2: '#7a9a4a', b1: '#4a6a9a', b2: '#7a9aca', s1: '#7a7068', s2: '#9a9084', bk: '#0c0808', gd: '#e0b84a', f1: '#f08a30', f2: '#ffc460' };
// ---- the regulars: user sprites → trimmed, shrunk, quantised ----------------------------------------------------------------------------------------------
const SRC = { crono: ['39.png'], lucca: ['44.png'], robo: ['47.png'], frog: ['48.png'], ayla: ['50.png'], magus: ['52.png'], marle: ['41.png', [44, 16, 48, 136]] }, HT = { crono: 28, lucca: 27, robo: 30, frog: 23, ayla: 28, magus: 29, marle: 28 }, CH = { mem: {} };
function quant(cv, n) {                                                                                  // popularity palette (n colours) + nearest mapping, hard alpha
  const x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height), h = new Map(); for (let i = 0; i < d.data.length; i += 4) { if (d.data[i + 3] < 110) continue; const k = ((d.data[i] >> 4) << 8) | ((d.data[i + 1] >> 4) << 4) | (d.data[i + 2] >> 4); h.set(k, (h.get(k) || 0) + 1); }
  const pal = [...h.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => [((k >> 8) & 15) * 17, ((k >> 4) & 15) * 17, (k & 15) * 17]);
  for (let i = 0; i < d.data.length; i += 4) { if (d.data[i + 3] < 110) { d.data[i + 3] = 0; continue; } let b = 0, bd = 1e9; pal.forEach((p, j) => { const q = (p[0] - d.data[i]) ** 2 + (p[1] - d.data[i + 1]) ** 2 + (p[2] - d.data[i + 2]) ** 2; if (q < bd) { bd = q; b = j; } }); d.data[i] = pal[b][0]; d.data[i + 1] = pal[b][1]; d.data[i + 2] = pal[b][2]; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return pal.length;
}
function prep(src, crop, ht) {
  const c0 = document.createElement('canvas'), sw = crop ? crop[2] : src.width, sh = crop ? crop[3] : src.height; c0.width = sw; c0.height = sh; const x0 = c0.getContext('2d'); if (crop) x0.drawImage(src, crop[0], crop[1], sw, sh, 0, 0, sw, sh); else x0.drawImage(src, 0, 0);
  { const id = x0.getImageData(0, 0, sw, sh), dd = id.data; for (let i = 0; i < dd.length; i += 4) if (dd[i] + dd[i + 1] + dd[i + 2] < 36) dd[i + 3] = 0; x0.putImageData(id, 0, 0); }          // sheets have an opaque black background
  const d = x0.getImageData(0, 0, sw, sh).data; let x1 = sw, y1 = sh, x2 = 0, y2 = 0; for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (d[(y * sw + x) * 4 + 3] > 40 && (d[(y * sw + x) * 4] + d[(y * sw + x) * 4 + 1] + d[(y * sw + x) * 4 + 2]) > 30) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  const bw = x2 - x1 + 1, bh = y2 - y1 + 1, f = crop ? 32 / bh : .5, w = Math.max(6, Math.round(bw * f)), h = Math.max(8, Math.round(bh * f)), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c0, x1, y1, bw, bh, 0, 0, w, h); c.n = quant(c, 24); return c;
}
const load = u => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
(async () => {
  for (const [k, [f, crop]] of Object.entries(SRC)) { const im = await load('tavern/' + f); if (im) { CH[k] = prep(im, crop, HT[k]); CH.mem[k] = Math.ceil(CH[k].width * CH[k].height / 2); } }
  CH.dances = [[], []]; for (const [di, f] of ['53.gif', '54.gif'].entries()) { try { const r = await fetch('tavern/' + f), dec = new ImageDecoder({ data: await r.arrayBuffer(), type: 'image/gif' }); await dec.tracks.ready; for (let i = 0; i < dec.tracks.selectedTrack.frameCount; i++) { const fr = await dec.decode({ frameIndex: i }), c = document.createElement('canvas'); c.width = fr.image.displayWidth; c.height = fr.image.displayHeight; c.getContext('2d').drawImage(fr.image, 0, 0); fr.image.close(); CH.dances[di].push(prep(c, null, 28)); } } catch (e) {} }
  CH.ready = true; CH.bytes = Object.values(CH.mem).reduce((a, b) => a + b, 0) + CH.dances.flat().reduce((a, c) => a + Math.ceil(c.width * c.height / 2), 0);
})();
G.TAVCH = CH;
// ---- the four heroes: hand-made pixel sprites (12×14, seated), recoloured per class -----------------------------------------------------------------------
const BASE = ['....oooo....', '...ohhhho...', '..ohhhhhho..', '..ohssssho..', '..osesseso..', '...ossso....', '..oaaaaao...', '.oaaacaaaao.', '.osaacaaaso.', '.oaaabaaaao.', '.oabbbbbbao.', '..obbbbbbo..', '...oooooo...'];
const HERO = { mago: { a: '#4a6aa8', hair: '#d8d0e0', hat: 'point', ear: 1 }, arqueiro: { a: '#5a8a4a', hair: '#8a5a2a', hat: 'hood' }, clerigo: { a: '#e8d8a8', hair: '#d8b43a', hat: 'halo' }, guerreiro: { a: '#c9703f', hair: '#4a2a1a', hat: 'helm' } }, heroCache = {};
const HCOL = { mago: '#3a8ac0', arqueiro: '#7ab04e', clerigo: '#d8b43a', guerreiro: '#e08a3a' };
function hero(cls, fi) {                                                                                  // the medium-size hero (seated), shrunk with the same method as the regulars
  const key = cls + fi; if (heroCache[key]) return heroCache[key]; if (G.PIXHERO) { const pc = G.PIXHERO.canvas(cls, 'sit', (fi % 4) / 4, 30, HCOL[cls], 1); if (pc) return heroCache[key] = pc; } const R = G.RIG, A = R.ALL.sit, big = R.render('sit', (fi % A.n) / A.n, 56, { tones: R.tonesOnly(HCOL[cls]), style: 'body', sex: cls === 'arqueiro' || cls === 'clerigo' ? 'f' : 'm' });
  return heroCache[key] = prep(big, null, 0);
}
// ---- the room --------------------------------------------------------------------------------------------------------------------------------------------
const OX = 120, OY = 36, TW = 16, TH = 8, P = (i, j) => [OX + (i - j) * TW, OY + (i + j) * TH];
function quad(g, a, b, c, d, col) { g.poly([a, b, c, d], col); }
function floor(g, o, t) {
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const col = (i + j) & 1 ? K.p2 : K.p1; quad(g, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), o.wire ? '#6a5a3a' : col);
    if (!o.wire) { const a = P(i, j + .5), b = P(i + 1, j + .5); g.line(a[0], a[1], b[0], b[1], (i + j) & 1 ? K.p1 : K.p2); for (let q = 0; q < 3; q++) { const u = hs(i * 7 + j * 3 + q), p = P(i + u, j + hs(q + i) * .9); g.px(p[0], p[1], K.w3); } } }
  const A = P(0, 7), B = P(7, 7), C = P(7, 0); for (let k = 0; k < 4; k++) { g.line(A[0], A[1] + k, B[0], B[1] + k, k ? K.w2 : K.p4); g.line(B[0], B[1] + k, C[0], C[1] + k, k ? K.w2 : K.p4); }                          // front edge of the floor
  g.poly([A, B, [B[0], B[1] + 4], [A[0], A[1] + 4]], K.w2); g.poly([B, C, [C[0], C[1] + 4], [B[0], B[1] + 4]], K.w1);
}
function wallR(g, o, t) {                                                                                  // back-right wall (j = 0), i from 0 to 7
  const a = P(0, 0), b = P(7, 0), H = 38; g.poly([a, b, [b[0], b[1] - H], [a[0], a[1] - H]], o.wire ? '#4a4a6a' : K.pl);
  for (let i = 0; i < 7; i++) { const p = P(i, 0), q = P(i + 1, 0); g.R(p[0] - 1, p[1] - H + 2 + i, 3, H - 2 - i + 0, K.w2); }
  const top = (u) => P(u, 0); g.line(a[0], a[1] - H, b[0], b[1] - H, K.w1); g.line(a[0], a[1] - H + 1, b[0], b[1] - H + 1, K.w2); g.line(a[0], a[1] - H + 2, b[0], b[1] - H + 2, K.w3);
  for (let k = 0; k < 40; k++) { const u = hs(k) * 7, p = P(u, 0); g.px(p[0], p[1] - 4 - hs(k * 3) * 30, K.ps); }
  // shelves with bottles (behind the bar) and a window
  [[2.4, 12], [2.4, 24]].forEach(([i0, hh]) => { const p = P(i0, 0), q = P(i0 + 2.8, 0); g.line(p[0], p[1] - hh, q[0], q[1] - hh, K.w1); g.line(p[0], p[1] - hh + 1, q[0], q[1] - hh + 1, K.w3);
    for (let k = 0; k < 8; k++) { const u = i0 + .15 + k * .34, pp = P(u, 0), c = [K.r2, K.g2, K.b2, K.gd, K.r1, K.g1][k % 6], bh = 4 + (k * 7 % 3); g.R(pp[0] - 1, pp[1] - hh - bh, 3, bh, c); g.R(pp[0], pp[1] - hh - bh - 1, 1, 1, K.cr); } });
  const w0 = P(5.6, 0), w1 = P(6.6, 0); g.poly([[w0[0], w0[1] - 30], [w1[0], w1[1] - 30], [w1[0], w1[1] - 14], [w0[0], w0[1] - 14]], K.w1); g.poly([[w0[0] + 2, w0[1] - 28], [w1[0] - 2, w1[1] - 28], [w1[0] - 2, w1[1] - 16], [w0[0] + 2, w0[1] - 16]], K.b2); g.line((w0[0] + w1[0]) / 2, w0[1] - 28 + 2, (w0[0] + w1[0]) / 2, w0[1] - 14, K.w1);
  const d0 = P(.5, 0), d1 = P(1.6, 0); g.poly([[d0[0], d0[1]], [d1[0], d1[1]], [d1[0], d1[1] - 26], [d0[0], d0[1] - 26]], K.ol); g.poly([[d0[0] + 1, d0[1]], [d1[0] - 1, d1[1]], [d1[0] - 1, d1[1] - 25], [d0[0] + 1, d0[1] - 25]], K.p1); g.ell((d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2 - 24, (d1[0] - d0[0]) / 2 - 1, 6, K.p1); for (let k = 1; k < 4; k++) { const a = P(.5 + k * .27, 0); g.R(a[0], a[1] - 30 + k, 1, 28, K.w3); } g.px(d1[0] - 4, d1[1] - 12, K.gd);
  // lanterns
  [[2.2], [5.0]].forEach(([u]) => { const p = P(u, 0); g.R(p[0], p[1] - H + 3, 1, 6, K.ol); g.R(p[0] - 2, p[1] - H + 9, 5, 6, K.ol); g.R(p[0] - 1, p[1] - H + 10, 3, 4, (Math.floor(t * 9 + u) % 7) ? K.f2 : K.f1); });
}
function wallL(g, o, t) {                                                                                  // back-left wall (i = 0), j from 0 to 7
  const a = P(0, 0), b = P(0, 7), H = 38; g.poly([a, b, [b[0], b[1] - H], [a[0], a[1] - H]], o.wire ? '#3a3a5a' : K.ps);
  for (let j = 0; j < 7; j++) { const p = P(0, j); g.R(p[0] - 1, p[1] - H + 2 - j, 3, H - 2 + j, K.w1); }
  g.line(a[0], a[1] - H, b[0], b[1] - H, K.w1); g.line(a[0], a[1] - H + 1, b[0], b[1] - H + 1, K.w2);
  for (let k = 0; k < 40; k++) { const u = hs(k + 9) * 7, p = P(0, u); g.px(p[0], p[1] - 4 - hs(k * 5) * 30, K.pl); }
  // fireplace (stone) at j 2.6–4.4
  const f0 = P(0, 2.4), f1 = P(0, 4.4); g.poly([[f0[0], f0[1] - 30], [f1[0], f1[1] - 30], [f1[0], f1[1]], [f0[0], f0[1]]], K.s1); for (let k = 0; k < 6; k++) { const p = P(0, 2.4 + k * .33); g.R(p[0], p[1] - 29 + (k & 1) * 3, 1, 29, K.s2); }
  const h0 = P(0, 2.9), h1 = P(0, 3.9); g.poly([[h0[0], h0[1] - 16], [h1[0], h1[1] - 16], [h1[0], h1[1]], [h0[0], h0[1]]], K.bk);
  const Ev = G.Engine, vv = Ev && Ev.visual && Ev.S && Ev.S.playing ? Ev.visual() : null, bt = vv ? vv.beat : t * 1.8, kk = Math.max(0, 1 - (bt - Math.floor(bt)) * 3.2), fl = .4 + .3 * Math.sin(t * 12) + .9 * kk; for (let k = 0; k < 6; k++) { const p = P(0, 3 + k * .16), hh = 6 + hs(k + Math.floor(t * 9)) * 5 + fl * 7; g.poly([[p[0] - 3, p[1]], [p[0] - 1, p[1] - hh], [p[0] + 3, p[1]]], k % 2 ? K.f1 : K.f2); }
  g.R(f0[0] + 4, f0[1] - 36, 18, 3, K.w2);
  // door-like window on this wall (j 0.6–1.6) and a banner
  const d0 = P(0, 0.5), d1 = P(0, 1.5); g.poly([[d0[0], d0[1] - 28], [d1[0], d1[1] - 28], [d1[0], d1[1] - 8], [d0[0], d0[1] - 8]], K.w1); g.poly([[d0[0], d0[1] - 26], [d1[0], d1[1] - 26], [d1[0], d1[1] - 10], [d0[0], d0[1] - 10]], K.b2);
  const bn = P(0, 5.6); g.R(bn[0] - 1, bn[1] - 34, 12, 2, K.w1); g.poly([[bn[0] - 1, bn[1] - 32], [bn[0] + 11, bn[1] - 32 + 6], [bn[0] + 11, bn[1] - 8], [bn[0] + 5, bn[1] - 12], [bn[0] - 1, bn[1] - 8 - 6]], K.r1); g.R(bn[0] + 3, bn[1] - 24, 3, 3, K.gd);
}
const EL = 7;
function platform(g) {
  const i0 = .5, i1 = 6.6, j0 = 0, j1 = 2.3, T = (i, j) => { const p = P(i, j); return [p[0], p[1] - EL]; };
  g.poly([T(i0, j0), T(i1, j0), T(i1, j1), T(i0, j1)], K.p3);
  for (let k = 0; k < 7; k++) { const a = T(i0, .3 + k * .33), b = T(i1, .3 + k * .33); g.line(a[0], a[1], b[0], b[1], k & 1 ? K.p2 : K.p4); }
  const a = P(i0, j1), b = P(i1, j1), c = P(i1, j0); g.poly([a, b, [b[0], b[1] - EL], [a[0], a[1] - EL]], K.w3); g.poly([b, c, [c[0], c[1] - EL], [b[0], b[1] - EL]], K.w2); g.line(a[0], a[1] - EL, b[0], b[1] - EL, K.p4);
  for (let k = 0; k <= 9; k++) { const u = i0 + k * (i1 - i0) / 9, p = P(u, j1); if (u > 3.5 && u < 4.7) continue; g.R(p[0] - 1, p[1] - EL - 7, 2, 8, K.w1); }
  const r0 = T(i0, j1), r1 = T(3.5, j1), r2 = T(4.7, j1), r3 = T(i1, j1); [[r0, r1], [r2, r3]].forEach(([u, v]) => { g.line(u[0], u[1] - 7, v[0], v[1] - 7, K.w1); g.line(u[0], u[1] - 6, v[0], v[1] - 6, K.w3); });
  for (let k = 0; k < 3; k++) { const q0 = P(3.5, j1 + .1 + k * .25), q1 = P(4.7, j1 + .1 + k * .25); g.poly([[q0[0], q0[1] - EL + k * 2.3], [q1[0], q1[1] - EL + k * 2.3], [q1[0], q1[1] - EL + k * 2.3 + 3], [q0[0], q0[1] - EL + k * 2.3 + 3]], k & 1 ? K.p2 : K.p3); }
}
function plant(g, i, j) { const p = P(i, j); g.R(p[0] - 4, p[1] - 6, 8, 6, K.r1); g.R(p[0] - 5, p[1] - 7, 10, 2, K.r2); for (let k = 0; k < 7; k++) { const a = -2.6 + k * .85; g.line(p[0], p[1] - 7, p[0] + Math.cos(a) * 7, p[1] - 7 + Math.sin(a) * 9 - 3, k & 1 ? K.g1 : K.g2); } g.px(p[0] + 3, p[1] - 15, K.r2); g.px(p[0] - 4, p[1] - 12, K.gd); }
function table(g, ci, cj, w, d, cloth) {                                                                           // rectangular wooden table (iso box), centre (ci,cj), w tiles along i, d along j
  const i0 = ci - w / 2, i1 = ci + w / 2, j0 = cj - d / 2, j1 = cj + d / 2, hh = 9;
  [[i0 + .1, j1 - .1], [i1 - .1, j1 - .1], [i1 - .1, j0 + .1]].forEach(([i, j]) => { const p = P(i, j); g.R(p[0] - 1, p[1] - 1, 3, hh, K.w1); });
  const top = [P(i0, j0), P(i1, j0), P(i1, j1), P(i0, j1)].map(p => [p[0], p[1] - hh]); g.poly(top, cloth ? K.cr : K.p3); if (cloth) { const m2 = [[top[0][0], top[0][1] + 1], [top[1][0] - 1, top[1][1] + 1], [top[2][0], top[2][1] - 1], [top[3][0] + 1, top[3][1] - 1]]; g.polyO(m2, K.pl); } g.poly([top[3], top[2], [top[2][0], top[2][1] + 2], [top[3][0], top[3][1] + 2]], K.w3); g.poly([top[2], top[1], [top[1][0], top[1][1] + 2], [top[2][0], top[2][1] + 2]], K.w2);
  const m = P((i0 + i1) / 2, (j0 + j1) / 2); g.line(top[0][0] + 2, top[0][1], top[1][0] - 1, top[1][1], K.p4); return [m[0], m[1] - hh];
}
function chair(g, i, j) { const p = P(i, j); g.R(p[0] - 3, p[1] - 5, 6, 2, K.w3); g.R(p[0] - 3, p[1] - 3, 1, 4, K.w1); g.R(p[0] + 2, p[1] - 3, 1, 4, K.w1); g.R(p[0] - 3, p[1] - 11, 6, 6, K.w2); g.R(p[0] - 2, p[1] - 10, 4, 4, K.w3); }
function barrel(g, i, j, h) { const p = P(i, j); g.ell(p[0], p[1] - h * 3 - 2, 7, 3, K.w3); g.R(p[0] - 7, p[1] - h * 3 - 2, 14, h * 3 + 2, K.w2); g.R(p[0] - 7, p[1] - 6, 14, 1, K.w1); g.R(p[0] - 7, p[1] - h * 3 + 1, 14, 1, K.w1); g.R(p[0] - 5, p[1] - h * 3 - 2, 2, h * 3 + 2, K.w3); g.ell(p[0], p[1] - h * 3 - 2, 5, 2, K.p2); g.ell(p[0], p[1], 7, 3, K.w1); }
function rug(g, ci, cj, w, d, c1, c2) { const pts = [[ci - w / 2, cj - d / 2], [ci + w / 2, cj - d / 2], [ci + w / 2, cj + d / 2], [ci - w / 2, cj + d / 2]].map(([i, j]) => P(i, j)); g.poly(pts, K.ol); const q = [[ci - w / 2 + .1, cj - d / 2 + .1], [ci + w / 2 - .1, cj - d / 2 + .1], [ci + w / 2 - .1, cj + d / 2 - .1], [ci - w / 2 + .1, cj + d / 2 - .1]].map(([i, j]) => P(i, j)); g.poly(q, c1);
  for (let k = 0; k < 5; k++) for (let m = 0; m < 3; m++) { const p = P(ci - w / 2 + .35 + k * (w - .7) / 4, cj - d / 2 + .3 + m * (d - .6) / 2); g.R(p[0] - 1, p[1] - 1, 3, 2, c2); } }
function note(g, x, y, c) { g.R(x + 2, y, 1, 5, K.ol); g.R(x + 3, y, 2, 1, K.ol); g.R(x, y + 4, 3, 2, K.ol); g.R(x + 3, y + 1, 1, 1, K.ol); g.R(x + 1, y + 1, 1, 4, c); g.R(x + 1, y + 4, 2, 1, c); g.R(x + 2, y + 4, 1, 1, c); }
// ---- the scene -------------------------------------------------------------------------------------------------------------------------------------------
const SPOTS = [  // [kind, i, j (feet), depth tweak, who, phase]
  ['reg', 'frog', 4.1, .75, 0, 1], ['reg', 'robo', 1.3, 3.5, 1.3], ['reg', 'crono', 1.0, 5.4, .5], ['reg', 'marle', 2.4, 6.0, 1.7], ['reg', 'lucca', 4.8, 6.1, 2.4], ['reg', 'magus', 6.5, 5.8, .9], ['dance', 'ayla', 5.9, 3.7, 0],
  ['hero', 'mago', 2.5, 3.6, 0], ['hero', 'arqueiro', 4.6, 3.3, .7], ['hero', 'clerigo', 3.4, 2.6, 1.4], ['hero', 'guerreiro', 3.6, 4.3, 2.1],
];
SC.SCENES.tavern = Object.assign(SC.SCENES.tavern, { nopal: true, sprites: false,
  desc: 'Uma taverna isométrica cheia de vida: os 4 heróis na mesa grande, sete frequentadores bebendo, brindando e dançando; notas de música sobem de quem está curtindo o som.',
  params: [{ id: 'fogo', l: 'fogo da lareira', v: .7 }, { id: 'musica', l: 'notas de música', v: .8 }],
  draw(g, t, P0, o, H) {
    g.clear(o.wire ? '#14141c' : '#0c0808'); floor(g, o, t); wallR(g, o, t); wallL(g, o, t); platform(g);
    const items = []; const add = (d, f) => items.push([d, f]);
    rug(g, 3.5, 3.4, 3.4, 2.6, K.r1, K.r2); rug(g, 5.9, 3.9, 1.8, 1.6, K.g1, K.g2); rug(g, 1.8, 5.7, 2.2, 1.6, K.b1, K.b2);
    // bar counter along the back (i 2.2–6.2 at j 1.5)
    add(1.5 + 4.2, () => { g.c.save(); g.c.translate(0, -EL); const a = P(2.2, 1.2), b = P(6.4, 1.2), c = P(6.4, 1.9), d = P(2.2, 1.9); g.poly([[a[0], a[1] - 10], [b[0], b[1] - 10], [c[0], c[1] - 10], [d[0], d[1] - 10]], K.p3); g.poly([[d[0], d[1] - 10], [c[0], c[1] - 10], [c[0], c[1] + 1], [d[0], d[1] + 1]], K.w3); g.poly([[c[0], c[1] - 10], [b[0], b[1] - 10], [b[0], b[1] + 1], [c[0], c[1] + 1]], K.w2); for (let k = 0; k < 7; k++) { const p = P(2.5 + k * .55, 1.9); g.R(p[0], p[1] - 9, 1, 9, K.w1); } [[3.2, K.cr], [4.9, K.cr], [5.8, K.gd]].forEach(([i, c2]) => { const p = P(i, 1.5); g.R(p[0] - 1, p[1] - 15, 3, 4, c2); g.R(p[0] - 2, p[1] - 14, 1, 2, c2); }); g.c.restore(); });
    add(3.5 + 3.4 - 1, () => table(g, 3.5, 3.4, 1.7, 1.1, 1)); add(1.8 + 5.7 - 1, () => table(g, 1.8, 5.7, 1.1, .9, 1)); add(5.4 + 6.1 - 1, () => table(g, 5.6, 6.0, 1.5, .9, 1)); add(6.6 + 6.5, () => plant(g, 6.6, 6.6)); add(0.6 + 0.6, () => barrel(g, .8, .8, 4)); add(1.4 + .9, () => barrel(g, 1.5, 1.0, 4)); add(1.1 + .5, () => barrel(g, 1.1, .5, 4));
    [[2.4, 3.4], [4.6, 3.4], [3.5, 2.5], [3.5, 4.3], [0.6, 5.7], [2.7, 5.7], [4.4, 6.0], [6.8, 6.0]].forEach(([i, j]) => add(i + j - .4, () => chair(g, i, j)));
    add(6.6 + .7, () => barrel(g, 6.6, .7, 4)); add(6.9 + 1.5, () => barrel(g, 6.9, 1.5, 3)); add(.5 + 6.6, () => barrel(g, .5, 6.6, 3)); add(1 + 6.5, () => barrel(g, 1.2, 6.8, 2));
    // the beat: the real tempo when something plays, a calm 108 bpm otherwise; everybody hops on the beat (alternating sides) and the toast lands on the bar
    const E = G.Engine, vis = E && E.visual && E.S && E.S.playing ? E.visual() : null, beat = vis ? vis.beat : t * 1.8, fb = beat - Math.floor(beat), CHs = window.TAVCH || {}, mus = P0.musica;
    SPOTS.forEach(([kind, who, i, j, ph, elev]) => add(i + j + .2, () => {
      const p0 = P(i, j), p = [p0[0], p0[1] - (elev ? EL : 0)], bob = Math.round(Math.abs(Math.sin(Math.PI * fb)) * -2), flip = (Math.floor(beat + ph) & 1) === 1, toast = Math.floor(beat) % 4 === 0 && fb < .6 && hs(ph * 5 + 1) > .3;
      g.c.fillStyle = 'rgba(0,0,0,.28)'; g.c.fillRect(p[0] - 5, p[1] - 1, 11, 2); let top = p[1] - 20;
      const put = (spr, dy) => { const bx = Math.round(p[0] - spr.width / 2), by = Math.round(p[1] - spr.height + 2 + dy); if (flip && kind !== 'hero') { g.c.save(); g.c.translate(bx + spr.width, by); g.c.scale(-1, 1); g.c.drawImage(spr, 0, 0); g.c.restore(); } else g.c.drawImage(spr, bx, by); top = by; if (toast) { g.R(p[0] + 6, by + 10, 3, 3, K.p4); g.R(p[0] + 6, by + 10, 3, 1, K.cr); } };
      if (kind === 'hero') put(hero(who, Math.floor(beat)), bob);
      else if (kind === 'dance' && CHs.dances && CHs.dances[0].length) { let k = 0, s0 = 0, len = 3 + 5 * hs(0); while (s0 + len < t && k < 400) { s0 += len; k++; len = 3 + 5 * hs(k * 3.7); } const arr = CHs.dances[hs(k * 7.1 + 2) > .5 ? 1 : 0].length ? CHs.dances[hs(k * 7.1 + 2) > .5 ? 1 : 0] : CHs.dances[0]; put(arr[Math.floor(beat * 2) % arr.length], 0); }   // two dances, swapped at random every 3–8 s, frames on the 8th notes
      else if (CHs[who]) put(CHs[who], toast ? -3 : bob);
      if (mus > .05) { const per = 2.2 + hs(ph * 9) * 1.4, u = ((t + ph * 1.7) % per) / per; if (u < 1 && (hs(Math.floor((t + ph * 1.7) / per) + ph) < mus)) note(g, Math.round(p[0] - 2 + Math.sin(u * 7 + ph) * 4), Math.round(top - 4 - u * 22), u > .75 ? K.pl : K.cr); }
    }));
    items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
    if (!o.wire) { const f = .5 + .5 * Math.sin(t * 12), a = P(0, 3.4); for (let k = 0; k < 30; k++) { const u = hs(k + Math.floor(t * 6)), x = a[0] + 3 + u * 48, y = a[1] - 4 + hs(k * 3 + 1) * 34; if (((Math.round(x) + Math.round(y)) & 1) && u < .35 + .25 * P0.fogo * f) g.px(x, y, K.f1); } }
  } });
})(window);
