// FM1 Quest lab — simple PIXEL-ART heroes: a puppet built only from whole-pixel blocks (no smooth capsules), recoloured per class, dark 1 px outline.
// It follows the same skeleton poses as the rig, so every animation (idle, walk, run, attack, cast, hurt, dead, sit, grab…) comes for free.
(function (G) {
'use strict';
const RIG = G.RIG; if (!RIG || !RIG.joints) return;
const OL = '#1c1210', SKIN = '#f0c8a0', BOOT = '#3a2418', GOLD = '#e0b84a';
const CL = { mago: { a: '#3a6ab0', hair: '#e8e0f0', hat: 'point', w: 'staff' }, arqueiro: { a: '#5a9a4a', hair: '#8a5a2a', hat: 'hood', w: 'bow' }, clerigo: { a: '#e8d8a8', hair: '#d8b43a', hat: 'halo', w: 'mace' }, guerreiro: { a: '#c9703f', hair: '#4a2a1a', hat: 'helm', w: 'sword' }, warrior: { a: '#b83a2a', hair: '#2a1a14', hat: 'horns', w: 'axe' }, npc: { a: '#8a8a96', hair: '#6a4a2a', hat: 'none', w: 'none' } };
const mix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0')).join(''); };
function line(x, x0, y0, x1, y1, w, col) { x.fillStyle = col; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, a = x0, b = y0; for (let n = 0; n < 400; n++) { x.fillRect(a - (w >> 1), b - (w >> 1), w, w); if (a === x1 && b === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; a += sx; } if (e2 <= dx) { e += dx; b += sy; } } }
function disc(x, cx, cy, r, col) { x.fillStyle = col; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + r * .6) x.fillRect(Math.round(cx) + xx, Math.round(cy) + yy, 1, 1); }
function outline(cv) {
  const w = cv.width, h = cv.height, x = cv.getContext('2d'), d = x.getImageData(0, 0, w, h), s = d.data, o = new Uint8Array(w * h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { if (s[(yy * w + xx) * 4 + 3] > 0) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = xx + dx, ny = yy + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && s[(ny * w + nx) * 4 + 3] > 0) { o[yy * w + xx] = 1; break; } } }
  x.fillStyle = OL; for (let i = 0; i < o.length; i++) if (o[i]) x.fillRect(i % w, Math.floor(i / w), 1, 1);
}
const cache = new Map();
function canvas(cls, anim, u, size, base, dir, noW) {
  const A = RIG.ALL[anim]; if (!A || RIG.isBack(anim)) return null; const n = A.n, i = A.loop ? Math.floor(((u % 1) + 1) % 1 * n) % n : Math.min(n - 1, Math.floor(Math.max(0, Math.min(1, u)) * n * .999)), key = [cls, anim, i, size, base, dir, noW ? 1 : 0].join('|'); let c = cache.get(key); if (c) return c;
  const C = CL[cls] || CL.npc, a = base || C.a, b = mix(a, '#000000', .42), l = mix(a, '#ffffff', .28), S = size, off = 2, uu = A.loop ? i / n : i / Math.max(1, n - 1), Jr = RIG.joints(anim, uu, S); if (!Jr) return null;
  const J = {}; for (const k in Jr) J[k] = [Jr[k][0] + off, Jr[k][1] + off]; const W = Math.max(2, Math.round(S / 16)); let cv = document.createElement('canvas'); cv.width = cv.height = S + off * 2; const x = cv.getContext('2d');
  // far side first
  line(x, ...J.hpF, ...J.knF, W, b); line(x, ...J.knF, ...J.anF, W, b); line(x, ...J.anF, ...J.toF, W, BOOT);
  line(x, ...J.shF, ...J.elF, W, mix(a, '#000000', .3)); line(x, ...J.elF, ...J.haF, W, mix(a, '#000000', .3)); disc(x, J.haF[0], J.haF[1], 1, SKIN);
  // torso (a tunic) and belt
  line(x, J.pelvis[0], J.pelvis[1], J.chest[0], J.chest[1] + 1, W * 2 + 1, a); line(x, J.pelvis[0] - 1, J.pelvis[1] - 1, J.chest[0] - 1, J.chest[1], 1, l); line(x, J.pelvis[0] - W, J.pelvis[1], J.pelvis[0] + W, J.pelvis[1], 1, GOLD); line(x, ...J.chest, ...J.neck, 2, SKIN);
  // head
  const hr = Math.max(3, Math.round(S * .1)); disc(x, J.head[0], J.head[1], hr, SKIN);
  x.fillStyle = C.hair; for (let yy = -hr; yy <= -1; yy++) for (let xx = -hr; xx <= hr; xx++) if (xx * xx + yy * yy <= hr * hr + hr * .6 && !(yy > -2 && xx > 0)) x.fillRect(Math.round(J.head[0]) + xx, Math.round(J.head[1]) + yy, 1, 1); x.fillRect(Math.round(J.head[0]) - hr, Math.round(J.head[1]), 2, hr);
  x.fillStyle = '#2a1a14'; x.fillRect(Math.round(J.head[0]) + Math.max(1, hr - 2), Math.round(J.head[1]), 1, 2);
  const hx = Math.round(J.head[0]), hy = Math.round(J.head[1]);
  if (C.hat === 'point') { for (let k = 0; k < hr * 2; k++) { x.fillStyle = k < 2 ? mix(a, '#fff', .2) : a; x.fillRect(hx - hr + 1 + (k >> 1), hy - hr - k, Math.max(1, 2 * hr - 2 - k), 1); } x.fillStyle = mix(a, '#000', .3); x.fillRect(hx - hr - 1, hy - hr + 1, 2 * hr + 3, 1); }
  else if (C.hat === 'hood') { disc(x, hx - 1, hy - 1, hr + 1, a); disc(x, hx + 1, hy + 1, hr - 1, SKIN); x.fillStyle = '#2a1a14'; x.fillRect(hx + Math.max(1, hr - 2), hy + 1, 1, 2); }
  else if (C.hat === 'halo') { x.fillStyle = GOLD; for (let k = -hr; k <= hr; k++) x.fillRect(hx + k, hy - hr - 2 + (Math.abs(k) > hr - 2 ? 1 : 0), 1, 1); }
  else if (C.hat === 'helm') { x.fillStyle = '#9a9aa4'; for (let yy = -hr; yy <= -1; yy++) for (let xx = -hr; xx <= hr; xx++) if (xx * xx + yy * yy <= hr * hr + hr * .6) x.fillRect(hx + xx, hy + yy, 1, 1); x.fillStyle = '#c8c8d2'; x.fillRect(hx - 1, hy - hr, 3, 1); x.fillStyle = '#b83a2a'; x.fillRect(hx - 1, hy - hr - 2, 2, 2); }
  else if (C.hat === 'horns') { x.fillStyle = '#e8e0c8'; x.fillRect(hx - hr, hy - hr - 1, 1, 3); x.fillRect(hx + hr, hy - hr - 1, 1, 3); x.fillRect(hx - hr - 1, hy - hr - 2, 1, 2); x.fillRect(hx + hr + 1, hy - hr - 2, 1, 2); }
  // near side
  line(x, ...J.hpN, ...J.knN, W, mix(a, '#000000', .55)); line(x, ...J.knN, ...J.anN, W, mix(a, '#000000', .55)); line(x, ...J.anN, ...J.toN, W, BOOT); x.fillStyle = mix(BOOT, '#fff', .2); x.fillRect(Math.round(J.toN[0]) - 1, Math.round(J.toN[1]) - 1, 2, 1);
  line(x, ...J.shN, ...J.elN, W, a); line(x, ...J.elN, ...J.haN, W, a); disc(x, J.haN[0], J.haN[1], 1, SKIN);
  // the weapon follows the hand
  const hx2 = J.haN[0], hy2 = J.haN[1], tx = J.wpn[0], ty = J.wpn[1], WP = noW ? '' : C.w;
  if (WP === 'staff') { line(x, hx2 - (tx - hx2) * .6, hy2 - (ty - hy2) * .6, tx + (tx - hx2) * .3, ty + (ty - hy2) * .3, 1, '#7a4e2a'); disc(x, tx + (tx - hx2) * .3, ty + (ty - hy2) * .3, 2, '#9ad0ff'); x.fillStyle = '#fff'; x.fillRect(Math.round(tx + (tx - hx2) * .3) - 1, Math.round(ty + (ty - hy2) * .3) - 1, 1, 1); }
  else if (WP === 'sword') { line(x, hx2, hy2, tx, ty, 1, '#e8e8f2'); line(x, hx2 - 1, hy2 - 1, hx2 + 1, hy2 + 1, 1, GOLD); }
  else if (WP === 'mace') { line(x, hx2, hy2, tx, ty, 1, '#7a4e2a'); disc(x, tx, ty, 2, GOLD); }
  else if (WP === 'axe') { line(x, hx2, hy2, tx, ty, 1, '#7a4e2a'); x.fillStyle = '#c8c8d2'; x.fillRect(Math.round(tx) - 2, Math.round(ty) - 2, 4, 4); x.fillStyle = '#fff'; x.fillRect(Math.round(tx) - 2, Math.round(ty) - 2, 1, 4); }
  else if (WP === 'bow') { const mx = (hx2 + tx) / 2, my = (hy2 + ty) / 2; line(x, mx - 1, my - 5, mx + 2, my, 1, '#8a5a2a'); line(x, mx + 2, my, mx - 1, my + 5, 1, '#8a5a2a'); line(x, mx - 1, my - 5, mx - 1, my + 5, 1, '#e8e0c8'); }
  outline(cv);
  if (dir < 0) { const f = document.createElement('canvas'); f.width = cv.width; f.height = cv.height; const fx = f.getContext('2d'); fx.translate(cv.width, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0); cv = f; }
  cache.set(key, cv); if (cache.size > 900) cache.delete(cache.keys().next().value); return cv;
}
G.PIXHERO = { canvas, CL };
})(window);
