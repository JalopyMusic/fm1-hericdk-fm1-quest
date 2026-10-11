// FM1 Quest lab — the OPENING as in the reference trailer (ref/trailer/f_NN.jpg): studio logo → one long continuous street pan with stations
// (stone house + notice board + horse → potion shop with striped awning → timber houses → forge with red smiths → market/cart/horse →
// tower arch with banners → golden hour → night) → black-out oath with the king and queen → cemetery → title card.
// Every station is built from the same few shapes so it can be re-skinned; every layer is named (o.L) so the Story tab can hide it, show its lines or change its speed.
(function (G) {
'use strict';
const SC = G.SCENES, T = G.GFX, RIG = G.RIG; if (!SC || !SC.H || !RIG) return;
const { hs, mixc, skyCols, night, SH, cloud, lampGlow, label, smoke } = SC.H, { DEPTH, HEROES, CFG } = SC, clamp = T.clamp, lerp = T.lerp;
const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
const STN = '#a8a090', STD = '#6e685c', PL = '#d8cfae', PL2 = '#b8a880', TB = '#44301e', RR = '#b0503a', RRD = '#7a3226', SL = '#5a6a78', SLD = '#3e4a56', GRN = '#3a6a58', BLU = '#4a78b0', WD = '#7a5a3a', GLS = '#2a3448', HAY = '#c8a850';

// ---- little tools -------------------------------------------------------------------------------------------------------------------------
// scanline-filled polygon with rows of roof tiles (the rows are clipped to the polygon, unlike a plain rectangle of stripes)
function roof(g, P, c, d, step) {
  step = step || 3; let y0 = 1e9, y1 = -1e9; P.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); y0 = Math.floor(y0);
  for (let y = y0; y <= Math.ceil(y1); y++) { const yy = y + .5, xs = [];
    for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) { const r = (y - y0) % step; g.R(xa, y, xb - xa, 1, r === 0 ? d : c); if (r === step - 1) for (let q = xa + ((y - y0) / step & 1) * 2; q < xb; q += 4) g.px(q, y, d); } } }
}
function stones(g, x, y, w, h, c, d) { g.R(x, y, w, h, c); for (let r = 0; r * 5 < h; r++) { g.R(x, y + r * 5, w, 1, d); for (let k = (r & 1) * 4; k < w; k += 9) g.R(x + k, y + r * 5, 1, Math.min(5, h - r * 5), d); } }
function glass(g, x, y, w, h, arch, shut) {
  if (arch) g.ell(x + w / 2, y, w / 2 + 1, 4, TB); g.R(x - 1, y - 1, w + 2, h + 2, TB); if (arch) g.ell(x + w / 2, y, w / 2, 3, GLS); g.R(x, y, w, h, GLS); g.R(x + 1, y + 1, 1, h - 2, '#4a5a7a'); g.R(x + Math.floor(w / 2), y - (arch ? 2 : 0), 1, h + (arch ? 2 : 0), TB); if (h > 8) g.R(x, y + Math.floor(h / 2), w, 1, TB);
  if (shut) { g.R(x - 3, y, 2, h, shut); g.R(x + w + 1, y, 2, h, shut); }
}
function door(g, x, by, w, h, col, arch) { g.R(x, by - h, w, h, col); if (arch) g.ell(x + w / 2, by - h, w / 2, 5, col); g.R(x + w / 2, by - h, 1, h, mixc(col, '#000000', .4)); for (let k = 3; k < h; k += 4) g.R(x, by - h + k, w, 1, mixc(col, '#000000', .25)); g.px(x + w - 3, by - h * .45, '#e0c060'); g.R(x - 2, by - 2, w + 4, 2, STD); }
function barrel(g, x, by, w, h) { g.R(x, by - h, w, h, WD); g.R(x, by - h + 2, w, 1, '#3a2a1c'); g.R(x, by - 3, w, 1, '#3a2a1c'); g.R(x + 1, by - h, 1, h, '#9a7a4a'); g.R(x + w - 2, by - h, 2, h, '#4a3220'); g.R(x + 1, by - h - 1, w - 2, 1, '#a88a58'); }
function pot(g, x, by, c) { g.R(x, by - 5, 6, 5, '#a8583a'); g.R(x - 1, by - 5, 8, 1, '#c8683a'); g.px(x + 1, by - 7, c); g.px(x + 3, by - 8, '#4a8a3a'); g.px(x + 4, by - 7, c); g.px(x + 2, by - 6, '#4a8a3a'); }
function lampPost(g, x, by, h, Lg) { g.R(x, by - h, 2, h, '#2a2a32'); g.R(x - 3, by - h - 6, 8, 6, '#2a2a30'); g.R(x - 2, by - h - 5, 6, 4, '#8a7a50'); g.R(x - 4, by - h - 8, 10, 2, '#2a2a30'); g.R(x - 3, by - h * .55, 4, 1, '#2a2a32'); Lg.push({ k: 'lamp', x: x + 1, y: by - h - 3 }); }
function hang(g, x, y, Lg) { g.R(x, y - 3, 6, 1, '#2a2a32'); g.R(x + 5, y - 3, 1, 4, '#2a2a32'); g.R(x + 3, y + 1, 5, 6, '#2a2a30'); g.R(x + 4, y + 2, 3, 4, '#8a7a50'); Lg.push({ k: 'lamp', x: x + 5.5, y: y + 4 }); }
function torchW(g, x, y, Lg) { g.R(x - 1, y, 3, 9, '#4a3a2a'); g.R(x - 3, y - 1, 7, 2, '#2a2218'); Lg.push({ k: 'torch', x: x + .5, y: y - 1 }); }
function ivy(g, x, y, n, seed) { for (let k = 0; k < n; k++) { const a = hs(seed + k * 2.3), b = hs(seed + k * 5.1); g.R(x + a * 8, y + b * 16, 2 + (k & 1), 3, '#2f5a2a'); g.px(x + a * 8 + 1, y + b * 16 + 1, '#4a8a3a'); } }
function horse(g, o, x, gy, t, dir, coat, mane, col2) {
  const d = dir || 1, X = a => Math.round(x + a * d), dark = mixc(coat, '#000000', .35), bob = Math.round(Math.sin(t * 1.3) * 1);
  if (o.wire) { g.R(x - 16, gy - 36, 32, 24, DEPTH[3]); g.R(X(12), gy - 44, 10 * d, 18, DEPTH[3]); [-11, -6, 6, 11].forEach(a => g.R(X(a) - 1, gy - 14, 3, 14, DEPTH[3])); return; }
  g.ell(x, gy, 19, 3, 'rgba(0,0,0,.28)'); [-12, 9].forEach(a => { g.R(X(a) - 1 - (d < 0 ? 2 : 0), gy - 18, 4, 18, dark); g.R(X(a) - 1 - (d < 0 ? 2 : 0), gy - 3, 4, 3, '#2a2018'); });
  g.ell(X(-2), gy - 25, 15, 8, coat); g.ell(X(8), gy - 26, 8, 9, coat); [-7, 12].forEach(a => { g.R(X(a) - 1 - (d < 0 ? 2 : 0), gy - 17, 4, 17, coat); g.R(X(a) - 1 - (d < 0 ? 2 : 0), gy - 3, 4, 3, '#2a2018'); });
  g.poly([[X(9), gy - 30], [X(14), gy - 42 + bob], [X(19), gy - 41 + bob], [X(15), gy - 25]], coat); g.poly([[X(15), gy - 43 + bob], [X(25), gy - 37 + bob], [X(24), gy - 33 + bob], [X(17), gy - 34 + bob]], coat); g.poly([[X(13), gy - 43 + bob], [X(9), gy - 31], [X(12), gy - 31], [X(16), gy - 42 + bob]], mane);
  g.px(X(19), gy - 38 + bob, '#14100c'); g.R(X(14), gy - 47 + bob, 2, 3, coat); g.R(X(24) - (d < 0 ? 1 : 0), gy - 34 + bob, 2, 2, dark);
  const sw = Math.round(Math.sin(t * 1.7) * 2); g.poly([[X(-15), gy - 29], [X(-19 + sw), gy - 20], [X(-19 + sw), gy - 10], [X(-15 + sw), gy - 12], [X(-14), gy - 24]], mane);
  g.R(X(-7), gy - 33, 11, 5, col2 || '#a8483a'); g.R(X(-6), gy - 36, 8, 3, '#5a3a22'); g.R(X(-7), gy - 28, 11, 1, mixc(col2 || '#a8483a', '#000000', .4));
}
function pet(g, o, x, gy, t, col, big) { if (o.wire) { g.R(x - 4, gy - 6, 9, 6, DEPTH[3]); return; } const s = big ? 1.4 : 1; g.ell(x, gy - 3 * s, 4 * s, 2.4 * s, col); g.disc(x + 4 * s, gy - 5 * s, 2 * s, col); g.px(x + 4 * s, gy - 8 * s, col); g.px(x + 6 * s, gy - 8 * s, col); g.R(x - 6 * s, gy - 5 * s - Math.sin(t * 6 + x) * 1.2, 2 * s, 1, col); g.R(x - 3 * s, gy - 1, 1, 2, col); g.R(x + 2 * s, gy - 1, 1, 2, col); }
const HARM = { '#3a8ac0': '#4f8fb0', '#7ab04e': '#6f9a5c', '#d8b43a': '#c9a74e', '#e08a3a': '#c9703f' };          // the four heroes: teal-blue, sage, mustard, terracotta (one colour each, same earthy family as the street)
const harm = c => HARM[c] || mixc(c, '#7a6a58', .2);
function act(g, o, anim, u, x, y, size, base, dir, ex) {
  ex = ex || {}; if (o.sprite && !o.wire && !ex.dim) base = harm(base); size = Math.max(11, Math.round(size * CFG.hero / 48)); let cv = !o.wire && ex.cls && !ex.dim && G.SPR && G.SPR.get(ex.cls, anim, u, size, base, dir || 1);
  const put = c2 => { if (o.sprite && !o.wire) o.sprite(c2, Math.round(x - size / 2), Math.round(y - size * .95)); else g.c.drawImage(c2, Math.round(x - size / 2), Math.round(y - size * .95)); return c2; };
  if (cv) return put(cv);
  if (o.wire) cv = RIG.render(anim, u, size, { style: 'line', mono: ex.mono || '#eee8d2', dir: dir || 1, weapon: !!ex.weapon });
  else if (G.PIXHERO && !ex.cape && !ex.crown && G.PIXHERO.canvas(ex.cls || 'npc', anim, u, size, mixc(base, '#0a0a14', ex.dim || 0), dir || 1)) cv = G.PIXHERO.canvas(ex.cls || 'npc', anim, u, size, mixc(base, '#0a0a14', ex.dim || 0), dir || 1);
  else { const tn = RIG.tonesOnly(mixc(base, '#0a0a14', ex.dim || 0)); if (ex.hairc) tn.hair = mixc(ex.hairc, '#0a0a14', ex.dim || 0); if (ex.skinc) tn.skin = ex.skinc; cv = RIG.render(anim, u, size, { tones: tn, style: 'body', dir: dir || 1, sex: ex.sex || 'm', hair: ex.hair, cape: ex.cape, crown: ex.crown, weapon: !!ex.weapon, t: ex.t || 0 }); }
  return put(cv);
}

// ---- the stations (world x, width) -----------------------------------------------------------------------------------------------------------
const ST = {
  stone(g, o, x, by, t, Lg) {
    const w = 124; if (o.wire) { g.R(x, by - 56, w, 56, DEPTH[2]); g.poly([[x, by - 56], [x + w / 2, by - 116], [x + w, by - 56]], DEPTH[3]); label(g, o, 'casa de pedra', x + 20, by - 40); return; }
    g.R(x + w * .66, by - 108, 9, 30, STD); g.R(x + w * .66 - 1, by - 110, 11, 3, STN); stones(g, x + 6, by - 56, w - 12, 56, STN, STD);
    roof(g, [[x - 2, by - 54], [x + w / 2, by - 118], [x + w + 2, by - 54]], SL, SLD, 3); glass(g, x + w / 2 - 4, by - 96, 8, 13, true); g.R(x + w / 2 - 6, by - 82, 12, 2, STN);
    glass(g, x + 22, by - 44, 9, 15, true); glass(g, x + w - 32, by - 44, 9, 15, true); Lg.push({ k: 'win', x: x + 22, y: by - 44, w: 9, h: 15 }); Lg.push({ k: 'win', x: x + w - 32, y: by - 44, w: 9, h: 15 }); door(g, x + w / 2 - 7, by, 14, 28, '#4a3220', true);
    g.R(x + w / 2 - 12, by - 4, 24, 4, STD); ivy(g, x + 4, by - 50, 5, 3); hang(g, x + w / 2 + 12, by - 36, Lg); torchW(g, x + 38, by - 30, Lg); lampPost(g, x + w + 6, by, 50, Lg); barrel(g, x + w + 14, by, 13, 17);
  },
  board(g, o, x, by, t, Lg) {
    if (o.wire) { g.R(x, by - 44, 46, 38, DEPTH[3]); label(g, o, 'quadro', x, by - 52); return; }
    g.R(x + 3, by - 38, 3, 38, WD); g.R(x + 40, by - 38, 3, 38, WD); g.R(x, by - 44, 46, 5, '#5a3a22'); g.R(x + 1, by - 46, 44, 2, '#8a5a32'); g.R(x + 5, by - 38, 36, 28, '#c8a070'); g.R(x + 4, by - 39, 38, 1, '#5a3a22'); g.R(x + 4, by - 10, 38, 1, '#5a3a22');
    for (let k = 0; k < 9; k++) { const px = x + 7 + (k % 3) * 12 + hs(k) * 3, py = by - 36 + Math.floor(k / 3) * 9 + hs(k * 3) * 2; g.R(px, py, 9, 7, k % 4 === 0 ? '#e8d8a8' : '#f0ead0'); g.R(px + 1, py + 2, 6, 1, '#8a7a5a'); g.R(px + 1, py + 4, 5, 1, '#8a7a5a'); g.px(px + 4, py, k % 3 ? '#c8443c' : '#4a78b0'); }
  },
  shop(g, o, x, by, t, Lg) {
    const w = 118; if (o.wire) { g.R(x, by - 50, w, 50, DEPTH[2]); g.poly([[x, by - 50], [x + w / 2, by - 100], [x + w, by - 50]], DEPTH[3]); label(g, o, 'loja de poções', x + 14, by - 30); return; }
    g.R(x + 6, by - 52, w - 12, 52, PL); g.R(x + 6, by - 52, 3, 52, PL2); g.R(x + w - 10, by - 52, 4, 52, PL2);
    roof(g, [[x - 4, by - 50], [x + w / 2, by - 100], [x + w + 4, by - 50]], RR, RRD, 3); g.R(x + w * .72, by - 92, 7, 14, STD); g.R(x + w / 2 - 12, by - 76, 24, 20, RR); g.R(x + w / 2 - 8, by - 66, 16, 12, PL);
    glass(g, x + w / 2 - 5, by - 64, 10, 9, false, '#3a6a58'); Lg.push({ k: 'win', x: x + w / 2 - 5, y: by - 64, w: 10, h: 9 });
    const aw = by - 30; for (let k = 0; k < w - 12; k += 6) g.R(x + 6 + k, aw, 6, 7, (k / 6) % 2 ? BLU : '#e8e0d0'); for (let k = 0; k < w - 12; k += 6) g.R(x + 7 + k, aw + 7, 4, 1, (k / 6) % 2 ? BLU : '#e8e0d0');
    g.R(x + 10, by - 22, w - 20, 22, '#1c2438'); g.R(x + 10, by - 12, w - 20, 2, WD); g.R(x + 10, by - 22, w - 20, 1, WD);
    for (let k = 0; k < 11; k++) { const bx = x + 13 + k * 9, by2 = k % 2 ? by - 13 : by - 21; g.R(bx, by2 - 5, 4, 5, ['#8a4aa8', '#4aa86a', '#c8443c', '#4a78b0', '#e0a040'][k % 5]); g.R(bx + 1, by2 - 7, 2, 2, '#d8d0b8'); }
    g.R(x + 10, by - 10, w - 20, 10, WD); g.R(x + 10, by - 10, w - 20, 1, '#9a7a4a'); for (let k = 0; k < 5; k++) g.R(x + 16 + k * 20, by - 8, 12, 5, HAY);
    pot(g, x - 2, by, '#e08a8a'); pot(g, x + 8, by, '#e0c060'); barrel(g, x - 16, by, 13, 17); lampPost(g, x - 6, by, 44, Lg); hang(g, x + w - 14, by - 40, Lg);
  },
  timber(g, o, x, by, t, Lg) {
    const w = 106; if (o.wire) { g.R(x, by - 70, w, 70, DEPTH[2]); g.poly([[x, by - 70], [x + w / 2, by - 112], [x + w, by - 70]], DEPTH[3]); label(g, o, 'casa enxaimel', x + 10, by - 40); return; }
    g.R(x + 4, by - 34, w - 8, 34, PL2); g.R(x - 6, by - 72, w + 12, 40, PL); g.R(x - 6, by - 33, w + 12, 3, TB); for (let k = 0; k <= 5; k++) g.R(x - 6 + k * ((w + 11) / 5), by - 72, 2, 40, TB); g.R(x - 6, by - 72, w + 12, 2, TB); g.R(x - 6, by - 52, w + 12, 2, TB);
    for (let k = 0; k < 5; k++) { g.line(x - 6 + k * ((w + 11) / 5), by - 52, x - 6 + (k + 1) * ((w + 11) / 5), by - 72, TB); g.line(x - 6 + (k + 1) * ((w + 11) / 5), by - 33, x - 6 + k * ((w + 11) / 5), by - 52, TB); }
    roof(g, [[x - 10, by - 70], [x + w / 2, by - 112], [x + w + 10, by - 70]], '#6a4a3a', '#4a3226', 3); glass(g, x + 12, by - 68, 10, 12, false, '#3a6a58'); glass(g, x + w - 24, by - 68, 10, 12, false, '#3a6a58'); glass(g, x + w / 2 - 5, by - 90, 10, 11, true);
    Lg.push({ k: 'win', x: x + 12, y: by - 68, w: 10, h: 12 }, { k: 'win', x: x + w - 24, y: by - 68, w: 10, h: 12 }, { k: 'win', x: x + w / 2 - 5, y: by - 90, w: 10, h: 11 });
    g.R(x - 8, by - 44, w + 16, 3, '#5a3a22'); for (let k = x - 7; k < x + w + 8; k += 5) g.R(k, by - 50, 1, 6, '#5a3a22'); g.R(x - 8, by - 51, w + 16, 1, '#5a3a22');
    door(g, x + w / 2 - 8, by, 16, 26, '#3a6a58', false); glass(g, x + 14, by - 26, 12, 14, false, '#3a6a58'); glass(g, x + w - 26, by - 26, 12, 14, false, '#3a6a58'); Lg.push({ k: 'win', x: x + 14, y: by - 26, w: 12, h: 14 }, { k: 'win', x: x + w - 26, y: by - 26, w: 12, h: 14 });
    g.R(x + w / 2 - 12, by - 34, 24, 4, '#3a6a58'); for (let k = 0; k < 6; k++) g.R(x + w / 2 - 12 + k * 4, by - 31, 2, 1, '#2a4a3e'); pot(g, x + 2, by - 44, '#e08a8a'); pot(g, x + w - 14, by - 44, '#e0c060'); pot(g, x + 30, by, '#e08a8a'); hang(g, x + w / 2 + 14, by - 32, Lg);
  },
  hall(g, o, x, by, t, Lg) {
    const w = 128; if (o.wire) { g.R(x, by - 98, w, 98, DEPTH[2]); g.poly([[x, by - 98], [x + w / 2, by - 128], [x + w, by - 98]], DEPTH[3]); label(g, o, 'casarão', x + 14, by - 60); return; }
    g.R(x, by - 100, w, 100, '#c8a868'); for (let k = 0; k <= 6; k++) g.R(x + k * (w - 3) / 6, by - 100, 3, 100, TB); [[-100], [-72], [-44]].forEach(([y]) => g.R(x, by + y, w, 3, TB)); g.R(x, by - 100, w, 3, TB);
    for (let k = 0; k < 3; k++) { g.line(x + k * 42, by - 72, x + k * 42 + 21, by - 100, TB); g.line(x + 21 + k * 42, by - 100, x + 42 + k * 42, by - 72, TB); }
    roof(g, [[x - 4, by - 98], [x + w / 2, by - 128], [x + w + 4, by - 98]], '#8a5a3a', '#5a3a26', 3); g.R(x + w / 2 - 15, by - 94, 30, 14, '#b89858'); glass(g, x + w / 2 - 4, by - 92, 8, 10, true);
    [x + 14, x + w - 28].forEach((wx, i) => { [by - 70, by - 42].forEach((wy, j) => { glass(g, wx, wy, 10, 14, false, '#7a4a2a'); Lg.push({ k: 'win', x: wx, y: wy, w: 10, h: 14 }); }); });
    g.R(x + w / 2 - 22, by - 52, 44, 3, TB); for (let k = x + w / 2 - 22; k < x + w / 2 + 22; k += 4) g.R(k, by - 58, 1, 6, TB); g.R(x + w / 2 - 22, by - 59, 44, 1, TB);
    door(g, x + w / 2 - 8, by, 16, 30, '#6a4a2a', true); g.poly([[x + w / 2 - 12, by - 30], [x + w / 2, by - 44], [x + w / 2 + 12, by - 30]], '#b83a2a'); g.R(x + w / 2 - 12, by - 31, 24, 2, '#8a2a20'); pot(g, x + w / 2 - 22, by, '#e08a8a'); pot(g, x + w / 2 + 14, by, '#e0c060'); lampPost(g, x - 8, by, 46, Lg); torchW(g, x + w / 2 - 20, by - 34, Lg); torchW(g, x + w / 2 + 20, by - 34, Lg);
  },
  forge(g, o, x, by, t, Lg, P) {
    const w = 44; if (o.wire) { g.R(x, by - 124, w, 124, DEPTH[2]); label(g, o, 'forja', x + 2, by - 60); return; }
    stones(g, x, by - 124, w, 124, '#c8a868', '#9a7a48'); g.R(x, by - 124, w, 4, '#a88a58'); g.R(x - 4, by - 128, w + 8, 5, '#b89858'); g.R(x + w - 6, by - 124, 6, 124, '#a88a58');
    g.ell(x + w / 2, by - 92, 8, 6, '#6a4a2a'); g.R(x + w / 2 - 8, by - 92, 16, 2, '#6a4a2a'); g.ell(x + w / 2, by - 96, 6, 4, '#a88a58'); g.R(x + w / 2 - 6, by - 96, 12, 4, '#a88a58');                  // horseshoe emblem
    g.R(x + 6, by - 44, w - 12, 44, '#3a2a1c'); g.ell(x + w / 2, by - 44, (w - 12) / 2, 10, '#3a2a1c'); g.R(x + 8, by - 42, w - 16, 42, '#1c1410'); g.ell(x + w / 2, by - 42, (w - 16) / 2, 8, '#1c1410');
    Lg.push({ k: 'forge', x: x + w / 2, y: by - 20, w: w - 18, h: 34 }); smoke(g, o, x + w / 2 + 2, by - 128, t);
    g.R(x - 8, by - 12, 6, 12, '#4a4a54'); g.R(x - 10, by - 14, 10, 3, '#5a5a64'); torchW(g, x + w + 6, by - 36, Lg);                                                                                                              // anvil
  },
  redhouse(g, o, x, by, t, Lg) {
    const w = 126; if (o.wire) { g.R(x, by - 44, w, 44, DEPTH[2]); g.poly([[x - 6, by - 44], [x + w / 2, by - 92], [x + w + 6, by - 44]], DEPTH[3]); label(g, o, 'casa de telhado vermelho', x + 6, by - 24); return; }
    g.R(x + 4, by - 48, w - 8, 48, PL); g.R(x + 4, by - 48, w - 8, 3, PL2); roof(g, [[x - 8, by - 46], [x + w * .36, by - 94], [x + w + 8, by - 46]], RR, RRD, 3);
    g.R(x + w * .36 - 14, by - 80, 28, 22, RR); g.R(x + w * .36 - 10, by - 72, 20, 14, PL); glass(g, x + w * .36 - 5, by - 70, 10, 10, false, '#3a6a58'); Lg.push({ k: 'win', x: x + w * .36 - 5, y: by - 70, w: 10, h: 10 });
    glass(g, x + 14, by - 38, 10, 14, false, '#3a6a58'); Lg.push({ k: 'win', x: x + 14, y: by - 38, w: 10, h: 14 }); door(g, x + w * .6, by, 16, 28, '#6a4a2a', false); glass(g, x + w - 24, by - 38, 10, 14, false, '#3a6a58'); Lg.push({ k: 'win', x: x + w - 24, y: by - 38, w: 10, h: 14 });
    g.R(x + w * .72, by - 56, 8, 14, STD); for (let k = -4; k < w + 8; k += 7) { g.R(x + k, by - 11, 3, 11, '#7a5a3a'); } g.R(x - 6, by - 9, w + 14, 2, '#7a5a3a'); g.R(x - 6, by - 4, w + 14, 2, '#7a5a3a'); g.ell(x + w * .3, by - 3, 4, 3, '#8a8a96'); pot(g, x + w - 8, by, '#e08a8a');
  },
  tower(g, o, x, by, t, Lg) {
    const w = 104; if (o.wire) { g.R(x, by - 108, w, 108, DEPTH[2]); label(g, o, 'torre com arco', x + 12, by - 60); return; }
    stones(g, x, by - 70, w, 70, '#a8987c', STD); g.R(x - 2, by - 108, w + 4, 38, '#c8a868'); for (let k = 0; k <= 5; k++) g.R(x - 2 + k * ((w + 1) / 5), by - 108, 3, 38, TB); g.R(x - 2, by - 108, w + 4, 3, TB); g.R(x - 2, by - 71, w + 4, 3, TB);
    for (let k = 0; k < 4; k++) { g.line(x - 2 + k * 21, by - 71, x + 19 + k * 21, by - 108, TB); }
    roof(g, [[x - 8, by - 106], [x + w / 2, by - 134], [x + w + 8, by - 106]], '#7a5a3a', '#4a3226', 3);
    [x + 10, x + w - 22].forEach(wx => { glass(g, wx, by - 98, 10, 16, false, '#7a4a2a'); Lg.push({ k: 'win', x: wx, y: by - 98, w: 10, h: 16 }); }); glass(g, x + w / 2 - 6, by - 98, 12, 14, true); Lg.push({ k: 'win', x: x + w / 2 - 6, y: by - 98, w: 12, h: 14 });
    g.R(x + 14, by - 76, w - 28, 3, TB); for (let k = x + 14; k < x + w - 14; k += 4) g.R(k, by - 82, 1, 6, TB); g.R(x + 14, by - 83, w - 28, 1, TB);
    g.R(x + 20, by - 54, w - 40, 54, '#0c1420'); g.ell(x + w / 2, by - 54, (w - 40) / 2, 16, '#0c1420'); g.ell(x + w / 2, by - 54, (w - 40) / 2 - 4, 12, '#1a2a40'); g.R(x + 24, by - 52, w - 48, 52, '#1a2a40'); g.R(x + w / 2 - 1, by - 36, 3, 20, '#2a2438'); Lg.push({ k: 'lamp', x: x + w / 2, y: by - 38 });
    for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; g.R(x + w / 2 + Math.cos(a) * 26 - 2, by - 54 + Math.sin(a) * 18 - 2, 5, 5, '#c8b890'); }
    [x + 8, x + w - 17].forEach(bx => { g.R(bx, by - 66, 1, 4, '#2a2a32'); g.R(bx - 1, by - 62, 11, 22, BLU); g.poly([[bx - 1, by - 40], [bx + 4.5, by - 34], [bx + 10, by - 40]], BLU); g.R(bx + 3, by - 56, 3, 8, '#d8d0b8'); g.R(bx + 1, by - 53, 7, 2, '#d8d0b8'); });
    g.R(x - 3, by - 70, 3, 70, '#8a7a5c'); g.R(x + w, by - 70, 3, 70, '#8a7a5c'); torchW(g, x + 14, by - 34, Lg); torchW(g, x + w - 14, by - 34, Lg);
  },
  golden(g, o, x, by, t, Lg) {
    const w = 128; if (o.wire) { g.R(x, by - 46, w, 46, DEPTH[2]); g.poly([[x - 8, by - 46], [x + w / 2, by - 72], [x + w + 8, by - 46]], DEPTH[3]); label(g, o, 'casa baixa', x + 10, by - 24); return; }
    g.R(x, by - 48, w, 48, '#c8b078'); g.R(x, by - 48, 3, 48, '#a89058'); g.R(x, by - 50, w, 3, TB); g.R(x, by - 2, w, 2, TB); for (let k = 0; k <= 8; k++) g.R(x + k * (w - 2) / 8, by - 48, 2, 46, TB);
    roof(g, [[x - 10, by - 48], [x + w * .5, by - 80], [x + w + 10, by - 48]], '#8a6a4a', '#5a4230', 4); g.R(x - 10, by - 49, w + 20, 3, '#5a4230');
    g.R(x + 14, by - 38, 52, 22, GLS); for (let k = 0; k < 4; k++) g.R(x + 14 + k * 13, by - 38, 1, 22, TB); g.R(x + 14, by - 28, 52, 1, TB); g.R(x + 12, by - 40, 56, 2, TB); g.R(x + 12, by - 16, 56, 2, TB); Lg.push({ k: 'win', x: x + 14, y: by - 38, w: 52, h: 22 });
    door(g, x + w - 38, by, 16, 30, '#6a4a2a', true); g.R(x + w - 44, by - 36, 28, 3, '#5a3a22'); glass(g, x + w - 14, by - 36, 8, 14, false, '#7a4a2a'); Lg.push({ k: 'win', x: x + w - 14, y: by - 36, w: 8, h: 14 }); pot(g, x + 70, by, '#e08a8a'); pot(g, x + 4, by, '#e0c060'); barrel(g, x + 76, by, 12, 15); hang(g, x + w - 52, by - 38, Lg); torchW(g, x + 8, by - 34, Lg);
  },
  lantern(g, o, x, by, t, Lg) {
    const w = 112; if (o.wire) { g.R(x, by - 60, w, 60, DEPTH[2]); g.poly([[x - 8, by - 60], [x + w / 2, by - 106], [x + w + 8, by - 60]], DEPTH[3]); label(g, o, 'casa da lanterna', x + 10, by - 30); return; }
    g.R(x + 4, by - 62, w - 8, 62, '#c89a62'); for (let k = 0; k <= 4; k++) g.R(x + 4 + k * (w - 10) / 4, by - 62, 2, 62, TB); g.R(x + 4, by - 40, w - 8, 2, TB);
    roof(g, [[x - 8, by - 60], [x + w / 2, by - 108], [x + w + 8, by - 60]], '#b8583a', '#7a3226', 3); glass(g, x + w / 2 - 6, by - 84, 12, 14, true); Lg.push({ k: 'win', x: x + w / 2 - 6, y: by - 84, w: 12, h: 14 });
    glass(g, x + 14, by - 56, 11, 15, false, '#7a4a2a'); glass(g, x + w - 26, by - 56, 11, 15, false, '#7a4a2a'); Lg.push({ k: 'win', x: x + 14, y: by - 56, w: 11, h: 15 }, { k: 'win', x: x + w - 26, y: by - 56, w: 11, h: 15 });
    door(g, x + w / 2 - 8, by, 16, 28, '#5a3a22', true); Lg.push({ k: 'win', x: x + w / 2 - 3, y: by - 26, w: 6, h: 10 }); glass(g, x + 16, by - 30, 10, 14, false, '#7a4a2a'); Lg.push({ k: 'win', x: x + 16, y: by - 30, w: 10, h: 14 }); lampPost(g, x - 12, by, 52, Lg); pot(g, x + w - 18, by, '#e08a8a'); hang(g, x + w / 2 + 12, by - 34, Lg);
  },
  night(g, o, x, by, t, Lg) {
    const w = 118; if (o.wire) { g.R(x, by - 66, w, 66, DEPTH[2]); g.poly([[x - 8, by - 66], [x + w / 2, by - 108], [x + w + 8, by - 66]], DEPTH[3]); label(g, o, 'casas da noite', x + 10, by - 36); return; }
    g.R(x + 4, by - 68, w - 8, 68, PL2); g.R(x - 4, by - 70, w + 8, 4, TB); for (let k = 0; k <= 5; k++) g.R(x + 4 + k * (w - 10) / 5, by - 68, 2, 68, TB); g.R(x + 4, by - 36, w - 8, 2, TB);
    roof(g, [[x - 8, by - 66], [x + w * .45, by - 110], [x + w + 8, by - 66]], '#5a4a58', '#3a2e3a', 3); g.R(x + w * .75, by - 96, 8, 20, STD);
    [[x + 12, by - 62], [x + w - 24, by - 62], [x + 12, by - 30], [x + w - 24, by - 30]].forEach(([wx, wy]) => { glass(g, wx, wy, 11, 15, false, '#3a6a58'); Lg.push({ k: 'win', x: wx, y: wy, w: 11, h: 15, always: 1 }); });
    glass(g, x + w * .45 - 6, by - 90, 12, 14, true); Lg.push({ k: 'win', x: x + w * .45 - 6, y: by - 90, w: 12, h: 14 }); door(g, x + w / 2 - 8, by, 16, 28, '#4a3220', true); Lg.push({ k: 'win', x: x + w / 2 - 3, y: by - 26, w: 6, h: 10, always: 1 }); lampPost(g, x - 6, by, 50, Lg); hang(g, x + w / 2 + 14, by - 34, Lg); torchW(g, x + w - 6, by - 30, Lg);
  },
};
// world layout: [station, x, width]; the camera moves from 0 to ≈1300
const WORLD = [['board', 6, 46], ['stone', 60, 124], ['shop', 220, 118], ['timber', 372, 106], ['hall', 500, 128], ['forge', 650, 44], ['redhouse', 700, 126], ['tower', 850, 104], ['golden', 996, 128], ['lantern', 1150, 112], ['night', 1290, 118], ['night', 1440, 118]];
// people that live on the street (world x, pose, colour, size, facing, extras, ground row 0 = on the street line); r = rank for the "crowd" parameter (smaller shows first)
const CIT = [
  { wx: 56, a: 'idle', c: '#d8603a', s: 40, d: 1, sex: 'f', hairc: '#c8301c', r: 0 }, { wx: 74, a: 'idle', c: '#4a4a56', s: 42, d: 1, r: 0 },
  { wx: 300, a: 'idle', c: '#4a6a9a', s: 34, d: -1, sex: 'f', r: 1 }, { wx: 410, a: 'idle', c: '#4a78b0', s: 34, d: -1, sex: 'f', hairc: '#e8e4ec', r: 2 }, { wx: 424, a: 'idle', c: '#4a78b0', s: 34, d: -1, sex: 'f', r: 2 }, { wx: 440, a: 'idle', c: '#4a78b0', s: 34, d: -1, sex: 'f', r: 2 },
  { wx: 448, a: 'idle', c: '#8a6a3a', s: 22, d: -1, r: 3 }, { wx: 556, a: 'idle', c: '#c8a050', s: 40, d: 1, r: 3 }, { wx: 596, a: 'idle', c: '#8a8a96', s: 40, d: -1, sex: 'f', r: 4 },
  { wx: 680, a: 'hammer', c: '#b83a2a', s: 46, d: -1, r: 0, u: 0 }, { wx: 704, a: 'hammer', c: '#b83a2a', s: 44, d: -1, r: 0, u: .5 }, { wx: 726, a: 'idle', c: '#b83a2a', s: 46, d: -1, r: 1 }, { wx: 748, a: 'idle', c: '#b83a2a', s: 40, d: -1, sex: 'f', r: 2 }, { wx: 782, a: 'idle', c: '#6a3a3a', s: 42, d: -1, r: 3 },
  { wx: 884, a: 'idle', c: '#8a8a96', s: 44, d: 1, r: 1 }, { wx: 930, a: 'idle', c: '#c8a050', s: 40, d: -1, r: 2 },
  { wx: 1040, a: 'idle', c: '#a8483a', s: 36, d: 1, sex: 'f', r: 3 }, { wx: 1180, a: 'idle', c: '#c8a050', s: 38, d: -1, r: 3 }, { wx: 1240, a: 'idle', c: '#d8603a', s: 36, d: -1, sex: 'f', r: 4 }, { wx: 1380, a: 'idle', c: '#8a8a96', s: 40, d: 1, r: 4 },
];
// companions that fall into step with the group when it reaches them
const COMP = [
  { wx: 410, c: '#c8c8d8', sex: 'f', hairc: '#ecebf4', hair: 2, s: 44, cape: '#8a2a2a' }, { wx: 470, c: '#8a8a96', sex: 'f', hairc: '#4a4a56', hair: 3, s: 36 },
  { wx: 560, c: '#4a4a56', sex: 'm', s: 46 }, { wx: 640, c: '#3f9a7a', sex: 'm', hair: 6, s: 44, skinc: '#6aa8a0' }, { wx: 770, c: '#e08a3a', sex: 'm', s: 32, hair: 5 },
  { wx: 860, c: '#b83a2a', sex: 'm', s: 46 }, { wx: 1010, c: '#7ab04e', sex: 'f', hair: 1, s: 40, orb: 1 }, { wx: 1130, c: '#a82a2a', sex: 'f', hair: 2, s: 42, cape: '#a82a2a' },
];
const LAMPS = [150, 345, 490, 835, 990, 1120, 1275, 1425, 1560];
const SLOT0 = [56, 72, 88, 104], SLOTC = k => 122 + k * 13;
const NPC = ['#a8483a', '#4a6a9a', '#7a8a3a', '#a8789a', '#8a8a96', '#c8a050'];
const FG = [[30, 'flowers'], [170, 'barrel'], [420, 'wheel'], [610, 'bags'], [820, 'bucket'], [980, 'wheel'], [1190, 'barrel'], [1330, 'flowers'], [1480, 'bags']];
const farHouses = (g, o, cam, sp, by, col, fogc, nt) => { const per = 360, off = -((cam * sp) % per); for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) { const w = 26 + Math.round(hs(i * 3.1) * 20), x = off + k * per + i * 40 - 10, h = 26 + Math.round(hs(i * 7.3) * 26); if (x > 250 || x + w < -4) continue; const c = o.wire ? DEPTH[1] : mixc(col, fogc, .35 + (i % 3) * .08); g.R(x, by - h, w, h, c); g.poly([[x - 2, by - h], [x + w / 2, by - h - w * .55], [x + w + 2, by - h]], o.wire ? DEPTH[1] : mixc(c, '#1a3a40', .25)); if (!o.wire && nt > .1 && hs(i + k) > .4) g.R(x + 5, by - h + 8, 3, 4, '#f0c860'); } };

// ---- sky actors: the rising sun with its lens-flare circles (they sit in the sky, so the houses cover them), the sun of the afternoon, the crescent moon ----
function sunLayer(g, sm, gy, t) {
  const n = sm.name, e = sm.ez, c = g.c; let sx, sy, r, core, glowA, flare, warm;
  if (n === 'amanhecer') { sx = 176; sy = lerp(54, 17, e); r = 10; core = '#fff0c0'; glowA = .45 + .55 * e; flare = e; warm = [255, 190, 130]; }
  else if (n === 'poente') { sx = 176; sy = 28; r = 12; core = '#ffb860'; glowA = 1; flare = .7; warm = [255, 160, 80]; }
  else if (n === 'tarde') { sx = 172; sy = 17; r = 7; core = '#fffbe0'; glowA = .7; flare = .3; warm = [255, 235, 170]; }
  else return;
  const disc = (x, y, rr, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); };
  [[38, .05], [28, .08], [20, .12], [14, .16]].forEach(([rr, a]) => disc(sx, sy, rr, `rgba(${warm[0]},${warm[1]},${warm[2]},${a * glowA})`));
  if (n === 'tarde') for (let k = 0; k < 10; k++) { const a = k * .628 + t * .15; g.line(sx + Math.cos(a) * (r + 3), sy + Math.sin(a) * (r + 3), sx + Math.cos(a) * (r + 7 + (k & 1) * 4), sy + Math.sin(a) * (r + 7 + (k & 1) * 4), '#fff6c8'); }
  g.disc(sx, sy, r, core); g.disc(sx, sy, Math.max(2, r - 4), '#fffef0');
  if (flare > .02) {                                                  // lens flare: circles along the line through the middle of the picture + a thin horizontal streak
    const sh = .85 + .15 * Math.sin(t * 1.7);
    c.fillStyle = `rgba(${warm[0]},${warm[1]},${warm[2]},${.5 * flare * sh})`; c.fillRect(Math.round(sx - 70), Math.round(sy), 140, 1); c.fillRect(Math.round(sx - 36), Math.round(sy) - 1, 72, 3);
    [[14, 7, '255,235,170', 0], [32, 5, '255,160,140', 1], [52, 12, '255,245,210', 1], [76, 6, '170,220,255', 0], [100, 9, '255,225,160', 1], [126, 5, '255,255,255', 0]].forEach(([d, rr, col, ring]) => {
      const x = sx - d * .88, y = sy + d * .48; if (ring) { c.strokeStyle = `rgba(${col},${1 * flare * sh})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke(); disc(x, y, rr - 1, `rgba(${col},${.3 * flare * sh})`); } else disc(x, y, rr, `rgba(${col},${.85 * flare * sh})`); });
  }
}
// the hour clock (village only): a dial with the 4 hours of the day, the one the party is living lit up
const CLK = [['amanhecer', 135, 225, '#f08a6a'], ['tarde', 225, 315, '#f2d070'], ['poente', 315, 405, '#e0603a'], ['noite', 45, 135, '#4a56a8']];
function clockHud(g, name, t) {
  const c = g.c, cx = 17, cy = 17, r = 12, d2r = Math.PI / 180; c.save();
  c.fillStyle = '#14101a'; c.beginPath(); c.arc(cx, cy, r + 3, 0, 7); c.fill(); c.strokeStyle = '#c8963c'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r + 2.5, 0, 7); c.stroke();
  CLK.forEach(([n, a0, a1, col]) => { const on = n === name; c.fillStyle = col; c.globalAlpha = on ? 1 : .32; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, on ? r : r - 2, a0 * d2r + .03, a1 * d2r - .03); c.closePath(); c.fill(); });
  c.globalAlpha = 1; const cur = CLK.find(x => x[0] === name) || CLK[0], am = (cur[1] + cur[2]) / 2 * d2r, pulse = 1 + .25 * Math.sin(t * 4);
  c.strokeStyle = '#fff6d8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(am) * (r - 3) * pulse, cy + Math.sin(am) * (r - 3) * pulse); c.stroke(); c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(cx, cy, 2, 0, 7); c.fill();
  c.fillStyle = '#14101a'; c.fillRect(cx - 1, cy - r - 2, 2, 4); c.fillRect(cx - 1, cy + r - 2, 2, 4); c.fillRect(cx - r - 2, cy - 1, 4, 2); c.fillRect(cx + r - 2, cy - 1, 4, 2);          // little ticks between the 4 slices
  c.restore();
}
function crescent(g, cx, cy, r) {                                      // a crescent moon: a disc minus a shifted disc, pixel by pixel
  lampGlow(g, cx, cy, r + 14, .1); lampGlow(g, cx, cy, r + 7, .1);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; const bx = x - r * .5, by = y + r * .22; if (bx * bx + by * by <= (r * .88) * (r * .88)) continue; g.R(cx + x, cy + y, 1, 1, y > r * .35 ? '#e8e0b0' : '#f6efc8'); }
}
SC.SCENES.street = { sprites: true, name: 'Rua da vila (panorâmica do trailer)', dur: 40, desc: 'Uma única panorâmica lateral como no trailer: casa de pedra com quadro de avisos e cavalo → loja de poções de toldo listrado → casas enxaimel → casarão → forja com ferreiros de vermelho → casa de telhado vermelho → torre com arco e estandartes → hora dourada → noite. Os 4 heróis andam e os companheiros entram no grupo quando ele chega neles. A hora é sorteada a cada vez que o aparelho liga (amanhecer e fim de tarde são os favoritos): no amanhecer o sol sobe atrás das casas com círculos de flare; à tarde o sol brilha e tudo está iluminado; no poente as tochas acendem quando o grupo passa por elas; à noite aparece a lua crescente. No visor, a música entra: as 4 fileiras de blocos do loop (uma por herói) enchem o painel de baixo.',
  params: [{ id: 'tod', l: 'hora do dia (0 = a hora sorteada ao ligar)', v: 0 }, { id: 'ciclo', l: 'o dia passa sozinho (1) em vez da hora sorteada', v: 0 }, { id: 'crowd', l: 'gente na rua', v: .95 }],
  draw(g, t, P, o, H) {
    const dur = 40, PER = 1600, pr = ((t % dur) / dur + 1) % 1, auto = !(P.tod > .01);
    // the day passes by itself and comes back to where it started (day → gold → night → dawn → day), so the end of the street connects to its beginning
    const DAYK = [[0, 0], [.42, 0], [.58, 1], [.72, 2], [.86, 2], [.95, 3], [1, 0]], SKYK = [skyCols(.25), skyCols(.6), skyCols(.85), skyCols(0)];
    let sk, nt, golden, sunM = null; const TB = auto && !(P.ciclo > .5) && G.TODB && G.TODB.cur;
    if (TB) { const rise = TB.name === 'amanhecer' ? Math.min(1, t / 24) : 1, ez = 1 - Math.pow(1 - rise, 2.2), todv = TB.tod + (TB.name === 'amanhecer' ? ez * .09 : 0); sk = skyCols(todv); nt = Math.min(.5, night(todv) * .66); golden = clamp((todv - .34) / .2, 0, 1) * (1 - clamp((todv - .7) / .15, 0, 1)); sunM = { name: TB.name, ez, todv }; }
    else if (auto) { let k = 0; while (k < DAYK.length - 2 && pr > DAYK[k + 1][0]) k++; const u = (pr - DAYK[k][0]) / (DAYK[k + 1][0] - DAYK[k][0]), A0 = SKYK[DAYK[k][1]], B0 = SKYK[DAYK[k + 1][1]]; sk = A0.map((c, i) => mixc(c, B0[i], u)); nt = .5 * (pr < .56 ? 0 : pr < .72 ? (pr - .56) / .16 : pr < .86 ? 1 : 1 - (pr - .86) / .14 * .95); golden = Math.max(0, 1 - Math.abs(pr - .52) / .14) * (pr > .3 ? 1 : 0); }
    else { sk = skyCols(P.tod); nt = Math.min(.5, night(P.tod) * .66); golden = clamp((P.tod - .34) / .2, 0, 1) * (1 - clamp((P.tod - .7) / .15, 0, 1)); }
    if (o.light) { o.light.nt = nt; o.light.gold = golden; }
    const tod = nt > .05 ? .7 : golden > .3 ? .5 : .3, v = P.speed === 0 ? 0 : PER / (dur - .5), cam = v * (t < 1 ? t * t / 2 : t - .5), gy = Math.round(H * .8), by = gy - 2, L = o.L || ((n, f) => f()), sp = (n, k) => o.spd ? o.spd(n, k) : k, Lg = []; if (o.wire) g.clear('#0e1020');
    const wrapX = (x, per, lo) => ((x % per) + per + lo) % per - lo;
    const camS = n => cam * sp(n, 1);
    L('céu e nuvens', () => { if (o.wire) return; if (sunM) { const sh2 = Math.round(gy * .5); g.sky(0, sh2, sk); g.R(0, sh2, 240, gy - sh2, sk[4]); sunLayer(g, sunM, gy, t); } else g.sky(0, gy, sk); for (let i = 0; i < 3; i++) cloud(g, ((i * 96 - camS('céu e nuvens') * .05) % 300 + 300) % 300 - 40, 8 + i * 12, 2 + i % 2, nt > .3 ? '#2a2a50' : '#ffffff99'); if (nt > .2) { SC.H.stars(g, o, t, 46, gy - 60); crescent(g, 198, 24, 9); } });
    L('telhados distantes', () => farHouses(g, o, cam, sp('telhados distantes', .16), gy - 30, '#3a6a62', sk[3], nt));
    L('casas ao fundo', () => farHouses(g, o, cam + 140, sp('casas ao fundo', .4), gy - 6, '#5a6a6a', sk[3], nt));
    L('fachadas', () => { const cx = camS('fachadas'); WORLD.forEach(([k, wx, w], i) => { const x = Math.round(wrapX(wx - cx, PER, 300)); if (x > 244 || x + w + 40 < -20) return; ST[k](g, o, x, by, t, Lg, P); }); if (!o.wire) LAMPS.forEach(wx => { const x = Math.round(wrapX(wx - cx, PER, 300)); if (x > -10 && x < 250) lampPost(g, x, by + 3, 46, Lg); }); });
    L('chão', () => { g.R(0, gy, 240, H - gy, o.wire ? DEPTH[4] : '#8a8272'); if (o.wire) return; const cx = camS('chão'); for (let r = 0, y = gy; y < H; r++, y += 6 + r * 2) { g.R(0, y, 240, 1, '#5a5448'); const bw = 18 + r * 6; for (let x = -((cx * (1 + r * .08)) % bw) + (r & 1) * bw / 2; x < 240; x += bw) g.R(x, y, 1, 6 + r * 2, '#5a5448'); } for (let k = 0; k < 14; k++) { const x = (((k * 71 - cx) % 340) + 340) % 340 - 30; g.R(x, gy + 3 + (k % 3) * 9, 5 + k % 4, 1, '#a8a090'); } });
    L('pessoas e bichos', () => { if (o.hook) return; const N = Math.round(CIT.length * clamp(P.crowd, 0, 1) + (P.crowd > .05 ? 3 : 0)), cx = camS('pessoas e bichos');
      CIT.forEach((c, i) => { if (c.r > P.crowd * 5) return; const x = wrapX(c.wx - cx, PER, 300), y = by + 10 + (i % 3) * 5; if (x < -30 || x > 270) return; if (!o.wire) SH(g, x, y - 1, c.s * .4, 2); act(g, o, c.a, c.u != null ? t * 1.1 + c.u : t * .4 + i * .13, x, y, c.s, c.c, c.d, { sex: c.sex || (i & 1 ? 'f' : 'm'), hairc: c.hairc, t }); });
      [[262, '#c8a050'], [905, '#d86a2a'], [1020, '#8a8a96'], [1060, '#d86a2a'], [1260, '#c8a050']].forEach(([wx, col], i) => { const x = wrapX(wx - cx, PER, 300) + Math.sin(t * .6 + i) * 6; if (x > -10 && x < 250) pet(g, o, x, by + 16 + (i & 1) * 4, t, col, i === 1); });
      horse(g, o, wrapX(30 - cx, PER, 300), by + 8, t, 1, '#a8602a', '#4a2a16'); horse(g, o, wrapX(872 - cx, PER, 300), by + 10, t, 1, '#8a5a2a', '#3a9a3a', '#4a78b0'); });
    L('o grupo', () => {
      if (o.hook) { o.hook(g, by, t, H, o.post); return; }
      const cxg = camS('o grupo');
      COMP.forEach((c, k) => { const sx = SLOTC(k), wxS = c.wx - cxg, x = Math.max(sx, wxS), joined = wxS <= sx;
        const y = by + 14 + (k % 3) * 3; if (!joined && (x > 270 || x < -30)) return; if (!o.wire) SH(g, x, y - 1, c.s * .4, 2);
        const ex = { sex: c.sex, hairc: c.hairc, hair: c.hair, cape: c.cape, skinc: c.skinc, t };
        act(g, o, joined ? 'walk' : 'idle', joined ? t * 1.15 + k * .17 : t * .4 + k, joined ? sx + Math.sin(t * .8 + k * 2) * 1.5 : x, y, c.s, c.c, 1, ex);
        if (c.orb) { const ox = (joined ? sx : x) + 12, oy = y - c.s * CFG.hero / 48 * .8 + Math.sin(t * 3) * 2; if (!joined && x > 262) return; Lg.push({ k: 'orb', x: ox, y: oy }); } });
      for (let i = 0; i < 4; i++) { const x = SLOT0[i] + Math.sin(t * .6 + i) * 1.5, y = by + 12 + (i % 2) * 5; if (!o.wire) SH(g, x, y - 1, 24, 2); act(g, o, 'walk', t * 1.15 + i * .21, x, y, 48, HEROES[i], 1, { cls: ['mago', 'arqueiro', 'clerigo', 'guerreiro'][i], sex: i === 1 || i === 2 ? 'f' : 'm', t, hairc: i === 1 ? '#6a4a2a' : undefined }); } });
    L('primeiro plano', () => { const cx = camS('primeiro plano') * 1.5, draw = () => FG.forEach(([wx, k], i) => { const x = Math.round(wrapX(wx - cx, PER * 1.5, 200)); if (x < -60 || x > 270) return; const dk = o.wire ? DEPTH[5] : '#12161a', b = H;
      if (k === 'flowers') { for (let q = 0; q < 12; q++) { g.R(x + q * 4 - 8, b - 6 - (q * 7 % 9), 3, 8 + (q * 7 % 9), '#1a2a22'); g.R(x + q * 4 - 9, b - 8 - (q * 7 % 9), 5, 3, o.wire ? DEPTH[5] : '#6a78c8'); } }
      else if (k === 'barrel') { g.R(x, b - 22, 24, 24, dk); g.R(x - 1, b - 14, 26, 2, '#2a3036'); g.R(x - 1, b - 6, 26, 2, '#2a3036'); }
      else if (k === 'wheel') { g.disc(x + 20, b + 6, 26, dk); g.disc(x + 20, b + 6, 21, o.wire ? DEPTH[4] : '#1c2226'); g.disc(x + 20, b + 6, 5, dk); for (let a = 0; a < 6; a++) g.line(x + 20, b + 6, x + 20 + Math.cos(a * 1.047) * 24, b + 6 + Math.sin(a * 1.047) * 24, dk); }
      else if (k === 'bags') { g.ell(x + 12, b - 4, 16, 14, dk); g.ell(x + 34, b - 2, 12, 10, dk); g.R(x + 10, b - 18, 4, 4, dk); }
      else { g.R(x, b - 16, 14, 18, dk); g.ell(x + 7, b - 16, 7, 3, '#2a3036'); g.R(x + 12, b - 24, 2, 10, dk); } }); if (o.sprite && !o.wire) o.post(draw); else draw(); });
    if (sunM && !o.wire && o.post) o.post(() => clockHud(g, sunM.name, t));
    L('luz da hora', () => { if (o.wire) return; g.c.fillStyle = `rgba(255,150,40,${golden * .22})`; g.c.fillRect(0, 0, 240, H); g.c.fillStyle = `rgba(8,12,52,${nt * .8})`; g.c.fillRect(0, 0, 240, H); if (golden > .05) { g.c.fillStyle = `rgba(255,200,90,${golden * .12})`; g.c.fillRect(0, 0, 240, 36); } });
    L('luzes acesas', () => { if (o.wire) return; const GXs = SLOT0[3] + 14, ign = l => l.always ? 1 : nt > .3 ? 1 : (golden > .3 || nt > .05) ? clamp((GXs + 12 - l.x) / 18, 0, 1) : 0, winOn = nt > .22;
      Lg.forEach(l => { if (l.x < -30 || l.x > 270) return; const fl = Math.sin(t * 9 + l.x) * .04;
        if (l.k === 'forge') { const f = .92 + Math.sin(t * 11 + l.x) * .08; g.R(l.x - l.w / 2, l.y - l.h * .4, l.w, l.h * .8, mixc('#e0701c', '#ffc460', .25)); g.ell(l.x, l.y - l.h * .4, l.w / 2, 9, '#f0902c'); g.R(l.x - l.w / 3, l.y, l.w * .66, l.h * .35, '#ffd878'); g.ell(l.x, l.y + 6, l.w / 3, 5, '#fff0b8'); for (let q = 0; q < 5; q++) g.px(l.x - 8 + hs(q + Math.floor(t * 4)) * 16, l.y - 8 - ((t * 20 + q * 7) % 22), '#ffd878'); lampGlow(g, l.x, l.y, 46, .2 * f); lampGlow(g, l.x, l.y, 26, .22 * f); }
        else if (l.k === 'lamp' && ign(l) > 0) { const ig = ign(l), burst = ig < .95 ? 1 - Math.abs(ig - .5) * 2 : 0; g.R(l.x - 2, l.y - 2, 5, 5, ig > .35 ? '#ffd878' : '#8a7040'); lampGlow(g, l.x, l.y, 26, (.2 + fl) * ig); lampGlow(g, l.x, l.y, 14, .24 * ig); lampGlow(g, l.x, l.y, 7, .3 * ig); if (burst > 0) { lampGlow(g, l.x, l.y, 38, .22 * burst); g.px(l.x - 3, l.y - 4 - burst * 3, '#fff0b0'); g.px(l.x + 3, l.y - 3 - burst * 4, '#ffd878'); } g.c.fillStyle = `rgba(255,170,60,${.1 * ig})`; g.c.beginPath(); g.c.ellipse(l.x, by + 12, 30, 7, 0, 0, 7); g.c.fill(); }
        else if (l.k === 'torch' && ign(l) > 0) { const ig = ign(l), burst = ig < .95 ? 1 - Math.abs(ig - .5) * 2 : 0, f = Math.sin(t * 13 + l.x * 3) * 1.2, up = .35 + .65 * ig + burst * .5; g.poly([[l.x - 2, l.y], [l.x - 1 + f, l.y - 7 * up], [l.x, l.y - 3 * up], [l.x + 2 + f, l.y - 8 * up], [l.x + 3, l.y]], '#ff9a30'); g.poly([[l.x - 1, l.y], [l.x + f * .5, l.y - 4 * up], [l.x + 1, l.y]], '#ffe090'); lampGlow(g, l.x, l.y - 3, 20, .2 * ig + .15 * burst); lampGlow(g, l.x, l.y - 3, 9, .2 * ig); if (burst > 0) { g.px(l.x - 2, l.y - 9 - burst * 4, '#fff0b0'); g.px(l.x + 3, l.y - 8 - burst * 5, '#ffd878'); } }
        else if (l.k === 'win' && (winOn || l.always || (golden > .45 && l.x < GXs)) && hs(l.x * .37 + l.y) > (l.always ? -1 : .3)) { g.R(l.x, l.y, l.w, l.h, '#f0c860'); g.R(l.x + 1, l.y + 1, Math.max(1, l.w - 2), 2, '#fff0b0'); g.R(l.x + Math.floor(l.w / 2), l.y, 1, l.h, '#b08a3a'); if (l.h > 8) g.R(l.x, l.y + Math.floor(l.h / 2), l.w, 1, '#b08a3a'); lampGlow(g, l.x + l.w / 2, l.y + l.h / 2, 12, .1); }
        else if (l.k === 'orb') { g.disc(l.x, l.y, 2, '#baffc0'); g.px(l.x, l.y, '#ffffff'); lampGlow(g, l.x, l.y, 10, .25); } }); });
  } };

// ---- 4 · cemetery --------------------------------------------------------------------------------------------------------------------------
SC.SCENES.grave = { sprites: true, name: 'Cemitério', dur: 12, desc: 'Dia pálido: cerca de ferro com pontas, túmulos com flores brancas, pinheiros e uma construção ao fundo na névoa. O grupo à esquerda, a de cabelo branco sozinha à frente.', params: [{ id: 'folhas', l: 'folhas caindo', v: .8 }],
  draw(g, t, P, o, H) {
    const gy = Math.round(H * .78), L = o.L || ((n, f) => f()), sp = (n, k) => o.spd ? o.spd(n, k) : k, cam = t * 1.2 * sp('cerca', 1); if (o.wire) g.clear('#0e1020');
    L('céu', () => { if (o.wire) return; g.sky(0, gy, ['#7a9a8a', '#a8c0b0', '#c8d8c8', '#dce8dc', '#e8f0e4']); });
    L('construção ao fundo', () => { const c = o.wire ? DEPTH[1] : '#8a9a98'; g.R(88, gy - 70, 72, 70, c); g.poly([[84, gy - 70], [124, gy - 100], [164, gy - 70]], c); g.R(96, gy - 90, 8, 22, c); g.poly([[94, gy - 90], [100, gy - 112], [106, gy - 90]], c); g.R(144, gy - 96, 8, 28, c); g.poly([[142, gy - 96], [148, gy - 120], [154, gy - 96]], c); if (!o.wire) { [[108, gy - 56], [122, gy - 56], [136, gy - 56]].forEach(([x, y]) => { g.R(x, y, 5, 14, '#6a7a7a'); g.ell(x + 2.5, y, 2.5, 3, '#6a7a7a'); }); } });
    L('árvores', () => { for (let i = 0; i < 9; i++) { const x = ((i * 34 - cam * .25) % 330 + 330) % 330 - 40, h = 70 + hs(i * 3) * 34; if (x > 250) continue; for (let k = 0; k < 5; k++) { const w = 12 + k * 6, y = gy - h + k * 14; g.poly([[x - w / 2, y + 16], [x, y - 8], [x + w / 2, y + 16]], o.wire ? DEPTH[2] : mixc('#2a4a3a', '#a8c0b0', .15 + k * .03 + (i % 2) * .08)); } g.R(x - 1, gy - 14, 3, 14, o.wire ? DEPTH[2] : '#3a2a1e'); } });
    L('cerca', () => { const per = 14, x0 = -((cam * .7) % per); g.R(0, gy - 36, 240, 2, o.wire ? DEPTH[3] : '#2a2e34'); g.R(0, gy - 12, 240, 2, o.wire ? DEPTH[3] : '#2a2e34'); for (let x = x0 - per; x < 250; x += per) { g.R(x, gy - 40, 2, 30, o.wire ? DEPTH[3] : '#2a2e34'); g.poly([[x - 1, gy - 40], [x + 1, gy - 46], [x + 3, gy - 40]], o.wire ? DEPTH[3] : '#2a2e34'); } for (let k = 0; k < 4; k++) { const px = ((k * 100 - cam * .7) % 400 + 400) % 400 - 40; if (px > 250) continue; g.R(px, gy - 48, 10, 50, o.wire ? DEPTH[3] : '#9a9a96'); g.R(px - 1, gy - 50, 12, 3, o.wire ? DEPTH[3] : '#b8b8b2'); g.poly([[px + 1, gy - 50], [px + 5, gy - 62], [px + 9, gy - 50]], o.wire ? DEPTH[3] : '#b8b8b2'); g.disc(px + 5, gy - 64, 2, o.wire ? DEPTH[3] : '#b8b8b2'); } });
    L('chão', () => { g.R(0, gy, 240, H - gy, o.wire ? DEPTH[4] : '#a8a8a0'); if (o.wire) return; for (let y = gy + 6; y < H; y += 10) g.R(0, y, 240, 1, '#8a8a84'); for (let x = -((cam * 1) % 24); x < 240; x += 24) for (let y = gy + 6; y < H; y += 10) g.R(x + ((y / 10 | 0) & 1) * 12, y, 1, 10, '#8a8a84'); });
    L('túmulos', () => { const x = 168 - cam * .0; g.R(x, gy + 2, 76, 14, o.wire ? DEPTH[3] : '#c0c0b8'); g.R(x - 2, gy, 80, 4, o.wire ? DEPTH[3] : '#d8d8d0'); g.R(x, gy + 14, 76, 3, o.wire ? DEPTH[3] : '#8a8a84'); g.R(x + 16, gy + 24, 90, 12, o.wire ? DEPTH[3] : '#b8b8b0'); g.R(x + 14, gy + 22, 94, 4, o.wire ? DEPTH[3] : '#d8d8d0'); g.R(x + 16, gy + 34, 90, 3, o.wire ? DEPTH[3] : '#8a8a84'); if (!o.wire) { for (let k = 0; k < 7; k++) { g.disc(x + 30 + k * 3, gy - 1 + (k % 2), 2, '#f4f4f0'); g.px(x + 30 + k * 3, gy - 1, '#e0c860'); } g.R(x + 60, gy - 30, 12, 34, '#b8b8b0'); g.ell(x + 66, gy - 30, 6, 6, '#b8b8b0'); g.R(x + 65, gy - 26, 2, 12, '#8a8a84'); g.R(x + 62, gy - 22, 8, 2, '#8a8a84'); } });
    L('o grupo', () => { const xs = [4, 16, 28, 40, 52, 64, 76]; xs.forEach((x, i) => { const y = gy + 14 + (i % 3) * 4; if (!o.wire) SH(g, x + 6, y - 1, 18, 2); act(g, o, 'idle', t * .35 + i * .31, x + 10, y, [40, 36, 34, 38, 44, 40, 46][i], i === 0 ? '#6a4a3a' : ['#a82a2a', '#b83a2a', '#8a6a4a', '#4a5a6a', '#d8603a', '#7a8a9a'][i % 6], 1, { sex: i === 1 || i === 3 || i === 5 ? 'f' : 'm', hairc: i === 1 || i === 3 ? '#c8301c' : undefined, t }); }); const y = gy + 18; if (!o.wire) SH(g, 110, y - 1, 22, 2); act(g, o, 'idle', t * .3, 112, y, 52, '#c8c8d8', 1, { sex: 'f', hair: 2, hairc: '#ecebf4', cape: '#8a2a2a', t }); });
    L('folhas e luz', () => { if (o.wire) return; const n = Math.round(6 + P.folhas * 12);
      for (let k = 0; k < n; k++) { const sp = .09 + hs(k) * .07, u = (t * sp + hs(k * 3)) % 1, x0 = hs(k * 7) * 250, x = x0 + Math.sin(t * (1 + hs(k) * .8) + k) * 14 + u * 26, y = -6 + u * (H + 12), r = Math.sin(t * 2.2 + k * 1.7), col = ['#d8a040', '#c07a30', '#a85a28', '#e0b858'][k % 4];
        g.R(x, y, 4, 2, col); g.R(x + (r > 0 ? 1 : 0), y - 1, 3, 1, mixc(col, '#ffffff', .25)); g.R(x + (r > 0 ? 0 : 2), y + 2, 2, 1, mixc(col, '#000000', .3)); }
      g.c.fillStyle = 'rgba(255,248,210,.07)'; g.c.beginPath(); g.c.moveTo(130, 0); g.c.lineTo(170, 0); g.c.lineTo(100, H); g.c.lineTo(40, H); g.c.fill(); });
  } };

SC.TRAILER_REF = { street: [2, 30], grave: [43, 47] };
})(window);
