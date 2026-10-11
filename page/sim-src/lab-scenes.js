// FM1 Quest lab — opening scenes (storyboard renderers). Every scene draws into a 240×H canvas through the GFX toolkit.
// `wire` = sketch: flat shapes, one colour per depth layer, 1 px skeleton dummies. Otherwise: simple finished scenery + 3-tone dummies.
(function (G) {
'use strict';
const T = G.GFX, RIG = G.RIG, hs = T.hs, clamp = T.clamp, lerp = T.lerp, fr = T.fr;
const DEPTH = ['#2c3a78', '#2f5f8a', '#2f8a78', '#7a9a38', '#c0983a', '#d06a38'];               // sketch colours, far → near
const HEROES = ['#3a8ac0', '#7ab04e', '#d8b43a', '#e08a3a'], SEX = ['m', 'f', 'f', 'm'];   // mage · archer · cleric · warrior                                       // mage · archer · cleric · warrior: each class has its own colour
const mixc = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(lerp((A >> s) & 255, (B >> s) & 255, t)).toString(16).padStart(2, '0')).join(''); };
const KEYS = [[0, ['#3a3a6a', '#8a5a7a', '#e08a6a', '#f0b070', '#f2d090']], [.25, ['#5a8ac8', '#7aa8d8', '#9ac0e0', '#b8d4e4', '#d0e0e0']], [.6, ['#2a2050', '#6a3a6a', '#c0605a', '#e08a4a', '#f0b050']], [.85, ['#0a0a20', '#141432', '#1e1e44', '#2a2a58', '#36366a']], [1, ['#3a3a6a', '#8a5a7a', '#e08a6a', '#f0b070', '#f2d090']]];
function skyCols(tod) { for (let i = 0; i < KEYS.length - 1; i++) { const a = KEYS[i], b = KEYS[i + 1]; if (tod <= b[0]) { const u = (tod - a[0]) / (b[0] - a[0]); return a[1].map((c, k) => mixc(c, b[1][k], u)); } } return KEYS[0][1]; }
const night = tod => clamp(tod < .55 ? 0 : tod < .85 ? (tod - .55) / .3 : tod < 1 ? 1 - (tod - .85) / .15 * .6 : 0, 0, 1) * .75;
const CFG = { hero: 48 };   // size of the cast: 32 / 40 / 48
const CLS4 = ['mago', 'arqueiro', 'clerigo', 'guerreiro'];
const HARM = { '#3a8ac0': '#4f8fb0', '#7ab04e': '#6f9a5c', '#d8b43a': '#c9a74e', '#e08a3a': '#c9703f' }, harm = c => HARM[c] || mixc(c, '#7a6a58', .2);   // one colour per hero, all from the same earthy family
function dummy(g, o, anim, u, x, y, size, base, dir) { size = Math.max(14, Math.round(size * CFG.hero / 48)); const hi = HEROES.indexOf(base), bc = o.sprite && !o.wire ? harm(base) : base, mine = !o.wire && hi >= 0 && G.SPR && G.SPR.get(CLS4[hi], anim, u, size, bc, dir || 1), cv = mine || (!o.wire && G.PIXHERO && G.PIXHERO.canvas(hi >= 0 ? CLS4[hi] : 'npc', anim, u, size, bc, dir || 1)) || RIG.render(anim, u, size, o.wire ? { style: 'line', mono: '#eee8d2', dir: dir || 1, weapon: anim === 'attack' } : { tones: RIG.tonesOnly(bc), style: 'body', dir: dir || 1, weapon: anim === 'attack', sex: hi >= 0 ? SEX[hi] : ((Math.round(x) + size) & 1 ? 'f' : 'm') }); if (o.sprite && !o.wire) o.sprite(cv, Math.round(x - size / 2), Math.round(y - size * .95)); else g.c.drawImage(cv, Math.round(x - size / 2), Math.round(y - size * .95)); }
const SH = (g, x, y, w, h) => { g.c.fillStyle = 'rgba(0,0,0,.28)'; g.c.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), h); };
const poly = (g, P, c) => g.poly(P, c);
// layered skyline of houses: seed → deterministic; speed = parallax factor
function houses(g, o, cam, speed, baseY, hMin, hMax, wMin, wMax, layer, seed, tod) {
  const period = 520, off = -((cam * speed) % period), n = 14, nt = night(tod); let x = off - 40, i = 0;
  for (let k = 0; k < 2; k++) { x = off + k * period - 20; for (i = 0; i < n; i++) {
    const w = Math.round(wMin + hs(seed + i * 3.1) * (wMax - wMin)), h = Math.round(hMin + hs(seed + i * 7.7) * (hMax - hMin)), top = baseY - h, tone = hs(seed + i * 1.9);
    if (x < 250 && x + w > -10) {
      if (o.wire) { g.R(x, top, w, h, DEPTH[layer]); g.R(x, top, w, 1, '#ffffff55'); poly(g, [[x - 2, top], [x + w / 2, top - w * .3], [x + w + 2, top]], DEPTH[layer]); }
      else {
        const wall = tone < .35 ? '#8a7a6a' : tone < .7 ? '#a8987e' : '#6a7a8a', roof = tone < .5 ? '#a8483a' : '#4a5a6a', sh = mixc(wall, '#0a0a20', .25 + layer * .06);
        g.R(x, top, w, h, mixc(wall, '#20203a', .2 + (4 - layer) * .12)); g.R(x, top, 3, h, sh); poly(g, [[x - 3, top + 1], [x + w / 2, top - w * .34], [x + w + 3, top + 1]], mixc(roof, '#20203a', .15 + (4 - layer) * .1));
        for (let wy = top + 8; wy < baseY - 10; wy += 14) for (let wx = x + 5; wx < x + w - 6; wx += 12) { const lit = nt > .1 && hs(seed + i + wx * .1 + wy) > .45; g.R(wx, wy, 5, 7, lit ? '#f0c860' : mixc('#2a2a44', wall, .15)); }
        if (layer >= 3) { g.R(x + w / 2 - 3, baseY - 14, 6, 14, '#4a3224'); }
      }
    }
    x += w + 2 + Math.round(hs(seed + i * 5.3) * 6);
  } }
}
function ridge(g, o, cam, speed, baseY, amp, step, layer, col, seed, tod) {
  const off = (cam * speed) % 600; for (let x = 0; x < 240; x += 2) { const wx = x + off, h = amp * (.55 + .45 * Math.sin(wx * .021 + seed) * Math.sin(wx * .0071 + seed * 2)) + hs(Math.floor(wx / step) + seed) * amp * .3; g.R(x, baseY - h, 2, h + 2, o.wire ? DEPTH[layer] : col); }
}
function cloud(g, x, y, s, c) { g.R(x, y + 3 * s, 16 * s, 4 * s, c); g.R(x + 3 * s, y, 8 * s, 6 * s, c); g.R(x + 8 * s, y + 1 * s, 7 * s, 5 * s, c); }
const torch = (g, o, x, y, t) => { if (o.wire) { g.R(x - 1, y, 3, 10, DEPTH[3]); g.R(x - 2, y - 8, 5, 7, DEPTH[5]); return; } g.R(x - 1, y, 3, 10, '#4a3a2a'); g.R(x - 3, y - 2, 7, 3, '#3a2a1c'); const f = Math.sin(t * 12 + x) * 1.4; g.poly([[x - 3, y - 2], [x - 1 + f, y - 12], [x, y - 7], [x + 2 + f, y - 13], [x + 4, y - 2]], '#e0701c'); g.poly([[x - 1, y - 2], [x + f * .5, y - 8], [x + 2, y - 2]], '#f8c050'); g.c.fillStyle = 'rgba(255,170,60,.16)'; g.c.beginPath(); g.c.arc(x, y - 6, 15 + Math.sin(t * 9 + x) * 2, 0, 7); g.c.fill(); };
const stars = (g, o, t, n, y1) => { if (o.wire) return; for (let i = 0; i < n; i++) { const x = hs(i * 3.7) * 240, y = hs(i * 9.1 + 2) * y1, tw = Math.sin(t * 2 + i * 1.7) > .55; g.px(x, y, tw ? '#ffffff' : '#c8c8d8'); if (i % 9 === 0 && tw) { g.px(x - 1, y, '#a8a8c0'); g.px(x + 1, y, '#a8a8c0'); g.px(x, y - 1, '#a8a8c0'); g.px(x, y + 1, '#a8a8c0'); } } };
const moon = (g, o, x, y, r) => { if (o.wire) return; g.disc(x, y, r, '#e8e8f4'); g.disc(x - r * .3, y + r * .2, r * .22, '#c8c8dc'); g.disc(x + r * .35, y - r * .3, r * .15, '#c8c8dc'); };
const smoke = (g, o, x, y, t) => { if (o.wire) return; for (let k = 0; k < 5; k++) { const u = (t * .5 + k * .2) % 1; g.disc(x + Math.sin(u * 5 + k) * 3 + u * 6, y - u * 22, 1.5 + u * 2.5, '#8a8a9a'); } };

// ---- town architecture: a long street of different buildings, alleys that open onto side streets, a square with a fountain, an arch, towers, a church.
const WALLS = ['#a89878', '#8a7a6a', '#7a8a8a', '#b8a088', '#9a8a7a'], ROOFS = ['#8a4838', '#5a4a58', '#4a5a68', '#7a5a3a'], STONE = '#8a8a98', DARKW = '#14142a';
const MID = [['tall', 38, 80], ['shop', 54, 52], ['alley', 32, 0], ['timber', 46, 66], ['low', 36, 38], ['tower', 30, 108], ['timber', 44, 72], ['plaza', 86, 0], ['tall', 40, 90], ['shop', 52, 50], ['arch', 60, 72], ['low', 34, 40], ['tall', 42, 86], ['alley', 30, 0], ['timber', 48, 64], ['church', 62, 114], ['shop', 50, 56], ['low', 38, 36], ['tall', 36, 94], ['plaza', 74, 0]];
const FAR = [['tall', 26, 44], ['tower', 20, 68], ['low', 30, 28], ['church', 40, 72], ['tall', 24, 50], ['spire', 16, 66], ['low', 34, 30], ['tall', 28, 46], ['tower', 22, 60], ['dome', 34, 42], ['low', 26, 30]];
function layout(L, gap) { let x = 0; const out = L.map((b, i) => { const o = { ty: b[0], w: b[1], h: b[2], x, i }; x += b[1] + gap + (i % 3); return o; }); out.period = x; return out; }
const MIDL = layout(MID, 2), FARL = layout(FAR, 3);
const lampGlow = (g, x, y, r, a) => { g.c.fillStyle = `rgba(255,170,60,${a})`; g.c.beginPath(); g.c.arc(x, y, r, 0, 7); g.c.fill(); };
function win(g, o, x, y, kind, lit, v, wl) {
  g.R(x - 1, y - 1, 7, 9, mixc(wl, '#000000', .5)); g.R(x, y, 5, 7, lit ? '#f0c860' : mixc('#2a3048', wl, .1));
  if (kind === 1) { g.R(x, y, 5, 1, mixc(wl, '#000000', .3)); g.px(x, y, mixc(wl, '#000000', .5)); g.px(x + 4, y, mixc(wl, '#000000', .5)); }              // arched
  if (kind === 2) { g.R(x - 2, y, 1, 7, '#3a5a4a'); g.R(x + 6, y, 1, 7, '#3a5a4a'); }                                                                          // shutters
  g.R(x + 2, y, 1, 7, mixc(wl, '#000000', .45)); if (v % 3 === 0 && !lit) { g.R(x - 1, y + 7, 7, 2, '#4a3a2a'); g.px(x, y + 6, '#6a9a4a'); g.px(x + 2, y + 6, '#6a9a4a'); g.px(x + 4, y + 6, '#e08a8a'); }   // flower box
  if (lit && v % 4 === 1) { g.R(x + 1, y + 3, 2, 4, '#14102a'); g.R(x + 1, y + 2, 2, 1, '#14102a'); }                                                      // somebody at the window
}
function roofTiles(g, pts, col, x0, x1, y0, y1) { g.poly(pts, col); g.c.fillStyle = mixc(col, '#000000', .25); for (let y = y0; y < y1; y += 3) g.c.fillRect(x0, y, x1 - x0, 1); }
function building(g, o, b, x, by, v, tod, dim, t, vis) {
  const ty = b.ty, w = b.w, h = b.h, wl = mixc(WALLS[v % 5], DARKW, dim), rf = mixc(ROOFS[(v >> 1) % 4], DARKW, dim * .8), sh = mixc(wl, '#08081a', .35), top = by - h, nt = night(tod), at = (a, c) => (nt > .06 || tod > .5) && hs(v * 7 + a + c) > .36;
  if (o.wire) { if (ty === 'alley' || ty === 'plaza') { g.R(x, by - 40, w, 40, '#000000'); g.R(x, by - 41, w, 1, DEPTH[2]); g.txt(ty, x + 2, by - 30, '#ffffff99', { sz: 8, nofit: true }); } else { g.R(x, top, w, h, DEPTH[Math.min(5, 1 + (dim > .3 ? 0 : 1) * 2)]); poly(g, [[x - 2, top], [x + w / 2, top - w * .3], [x + w + 2, top]], DEPTH[Math.min(5, 2 + (dim > .3 ? 0 : 1) * 2)]); } vis && vis.push({ ty, x, w, by, v }); return; }
  vis && vis.push({ ty, x, w, by, v });
  if (ty === 'tall' || ty === 'tower' || ty === 'timber' || ty === 'low' || ty === 'shop') {
    const ov = ty === 'timber' ? 4 : 0;
    if (ty === 'timber') { g.R(x, by - h * .42, w, h * .42, wl); g.R(x - ov, top, w + ov * 2, h * .6, mixc(wl, '#f0e8d0', .12)); g.R(x - ov, top + h * .6 - 2, w + ov * 2, 2, sh); for (let k = 0; k <= 4; k++) g.R(x - ov + k * ((w + ov * 2 - 1) / 4), top, 1, h * .6, '#2a1c12'); g.R(x - ov, top, w + ov * 2, 1, '#2a1c12'); g.R(x - ov, top + h * .3, w + ov * 2, 1, '#2a1c12'); for (let k = 0; k < 4; k++) g.line(x - ov + k * ((w + ov * 2 - 1) / 4), top + h * .3, x - ov + (k + 1) * ((w + ov * 2 - 1) / 4), top, '#2a1c12'); }
    else g.R(x, top, w, h, wl);
    g.R(x + w - 3, top, 3, h, sh); if (ty === 'tower') { for (let y = top + 4; y < by - 4; y += 7) { g.R(x, y, w, 1, sh); for (let k = 0; k < w; k += 8) g.R(x + k + (y / 7 & 1) * 4, y, 1, 7, sh); } for (let k = 0; k < Math.floor(w / 7); k++) g.R(x + 1 + k * 7, top - 4, 5, 4, wl); g.R(x + w / 2 - 1, by - h * .55, 2, 9, '#0a0a18'); g.R(x + w / 2 - 1, by - h * .3, 2, 9, '#0a0a18'); g.disc(x + w / 2, top + 14, 7, mixc('#d8d0b8', DARKW, dim)); g.line(x + w / 2, top + 14, x + w / 2, top + 9, '#2a2a3a'); g.line(x + w / 2, top + 14, x + w / 2 + 4, top + 14, '#2a2a3a'); g.R(x + w / 2, top - 12, 1, 9, '#2a2a3a'); g.R(x + w / 2 + 1, top - 12, 7, 4, '#a8483a'); }
    else {
      const rtop = ty === 'low' ? by - h : top; roofTiles(g, [[x - 3, rtop + 2], [x + w / 2, rtop - w * (ty === 'timber' ? .5 : ty === 'low' ? .42 : .38)], [x + w + 3, rtop + 2]], rf, x - 3, x + w + 3, rtop - (ty === 'low' ? 14 : 16), rtop + 2);
      g.R(x + w * .68, rtop - w * .3, 4, 9, mixc(wl, '#000000', .3)); smoke(g, o, x + w * .68 + 2, rtop - w * .3, t + v);
      const rows = ty === 'low' ? 1 : Math.max(1, Math.floor((h - 18) / 17)), cols = w > 44 ? 3 : 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const wx = x + 5 + c * ((w - 12) / Math.max(1, cols - 1 || 1)) * (cols > 1 ? 1 : 0), wy = by - h + 8 + r * 17 + (ty === 'timber' ? 2 : 0); if (ty === 'shop' && r === rows - 1) continue; win(g, o, Math.round(wx), wy, (v + r + c) % 3, at(wx, wy), v + r + c, wl); }
      if (ty === 'tall' && rows > 1) { const by2 = by - h + 8 + 17 + 8; g.R(x + 2, by2, w - 4, 2, '#2a2a3a'); for (let k = x + 3; k < x + w - 3; k += 3) g.R(k, by2 - 4, 1, 4, '#2a2a3a'); g.R(x + 5, by2 - 6, 3, 3, '#4a8a4a'); g.R(x + w - 9, by2 - 6, 3, 3, '#4a8a4a'); }
      if (ty === 'shop') { const aw = by - 26; for (let k = 0; k < w; k += 4) g.R(x + k, aw, 4, 6, (k / 4) % 2 ? '#4a78b0' : '#d8d0c0'); for (let k = 0; k < w; k += 4) g.R(x + k + 1, aw + 6, 2, 1, (k / 4) % 2 ? '#4a78b0' : '#d8d0c0'); g.R(x + 3, by - 20, w - 6, 14, at(x, 3) ? '#f0c860' : '#1c2438'); g.R(x + 3, by - 8, w - 6, 2, '#4a3a2a'); g.R(x + w - 12, by - 8, 7, 8, '#6a4a2a'); g.R(x + w - 12, by - 8, 7, 1, '#8a6a3a'); g.R(x + 2, aw - 8, 1, 6, '#2a2a3a'); g.R(x + 2, aw - 8, 9, 4, '#7a5a3a'); g.px(x + 5, aw - 7, '#f0c860'); }
      else { g.R(x + w / 2 - 4, by - 15, 8, 15, '#2a1c12'); g.R(x + w / 2 - 3, by - 16, 6, 1, '#2a1c12'); g.px(x + w / 2 + 2, by - 7, '#f0c860'); if (ty === 'low') { for (let k = x - 3; k < x + w + 3; k += 4) g.R(k, by - 6, 2, 6, '#7a5a3a'); g.ell(x + w - 4, by - 4, 6, 4, '#3a6a2a'); } }
      if (ty === 'timber') { g.R(x - ov - 2, top + 10, 1, 8, '#2a2a3a'); g.R(x - ov - 3, top + 18, 5, 5, at(x, 9) ? '#f0a040' : '#5a4a3a'); if (at(x, 9)) lampGlow(g, x - ov - 1, top + 20, 12, .16); }
    }
    for (let k = 0; k < 2; k++) if (hs(v + k * 3.1) > .5) { const ix = x + hs(v * 3 + k) * (w - 6); g.R(ix, by - 20 - hs(v + k) * 20, 3, 6, '#2f5a2a'); g.px(ix + 1, by - 22, '#4a8a3a'); }   // ivy
  } else if (ty === 'arch') {
    g.R(x, by - 72, w, 40, wl); g.R(x, by - 72, w, 3, sh); for (let k = 0; k < 3; k++) win(g, o, x + 8 + k * 17, by - 62, (v + k) % 3, at(x, k), v + k, wl);
    roofTiles(g, [[x - 2, by - 70], [x + w / 2, by - 92], [x + w + 2, by - 70]], rf, x - 2, x + w + 2, by - 90, by - 70);
    g.R(x, by - 32, 12, 32, STONE); g.R(x + w - 12, by - 32, 12, 32, STONE); for (let y = by - 30; y < by; y += 5) { g.R(x, y, 12, 1, '#5a5a68'); g.R(x + w - 12, y, 12, 1, '#5a5a68'); }
    g.R(x + 12, by - 32, w - 24, 32, '#0a0a18'); g.ell(x + w / 2, by - 32, (w - 24) / 2, 10, '#0a0a18'); g.R(x + 12, by - 36, w - 24, 3, STONE);
    g.R(x + w / 2 - 1, by - 22, 3, 22, '#2a2438'); g.R(x + w / 2, by - 24, 1, 4, '#f0a040'); lampGlow(g, x + w / 2 + .5, by - 22, 14, .18);        // far end of the passage: a lamp
  } else if (ty === 'alley') {
    g.R(x, by - 78, w, 78, '#0c0c1a'); g.R(x + 3, by - 70, w - 6, 70, '#12122a'); poly(g, [[x + 4, by], [x + w - 4, by], [x + w - 9, by - 24], [x + 9, by - 24]], '#2a2a3a');                    // side street receding
    for (let k = 0; k < 6; k++) { g.R(x + w - 12 + k, by - 4 - k * 5, 10 - k, 3, '#4a4a5a'); g.R(x + w - 12 + k, by - 1 - k * 5, 10 - k, 1, '#2a2a38'); }                                        // stairs going up
    g.R(x + 4, by - 60, 5, 7, '#f0c860'); lampGlow(g, x + 7, by - 56, 13, .2); g.R(x + 6, by - 50, 1, 50, '#2a2a38');
    g.line(x - 3, by - 70, x + w + 3, by - 62, '#3a3a4a'); [[.25, '#c8443c'], [.5, '#d8d0c0'], [.75, '#4a78b0']].forEach(([u, c]) => g.R(x + w * u, by - 69 + u * 7, 5, 7, c));                              // laundry across the alley
    g.R(x + w - 10, by - 58, 4, 5, '#3a3a52'); g.R(x + w / 2 - 4, by - 30, 3, 5, '#e8e0c8'); if (Math.sin(t * 1.5 + v) > 0) g.R(x + w / 2 - 3, by - 34, 1, 1, '#14102a');   // far window, a cat
  } else if (ty === 'plaza') {
    g.R(x, by - 26, w, 26, mixc('#6a6a7a', DARKW, dim)); for (let k = 0; k < w; k += 9) { g.R(x + k, by - 26, 5, 5, '#3a3a4a'); g.R(x + k + 1, by - 25, 3, 4, '#0a0a18'); } g.R(x, by - 27, w, 1, STONE);       // low wall with arches
    const fx = x + w * .55; g.ell(fx, by - 3, 20, 5, '#5a5a6a'); g.ell(fx, by - 4, 17, 4, '#4a7ab0'); g.R(fx - 3, by - 20, 6, 17, '#7a7a8a'); g.ell(fx, by - 21, 8, 3, '#8a8a9a'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, u = (t * 1.6 + k * .13) % 1; g.px(fx + Math.cos(a) * u * 9, by - 24 + u * 21 - Math.sin(u * 3.1) * 8, '#cfe8ff'); }
    const tx = x + 9; g.R(tx - 2, by - 38, 5, 38, '#4a3224'); g.ell(tx, by - 46, 14, 11, '#2f5a2a'); g.ell(tx - 6, by - 40, 9, 8, '#3a6a30'); g.ell(tx + 7, by - 41, 8, 7, '#274a24'); for (let k = 0; k < 7; k++) g.px(tx - 10 + hs(k + v) * 20, by - 52 + hs(k * 3) * 16, '#6a9a4a');
    g.R(x + w - 18, by - 7, 14, 2, '#6a4a2a'); g.R(x + w - 17, by - 5, 2, 5, '#4a3224'); g.R(x + w - 7, by - 5, 2, 5, '#4a3224');
  } else if (ty === 'church') {
    g.R(x + 16, by - 66, w - 16, 66, wl); g.R(x, by - h, 18, h, mixc(STONE, DARKW, dim)); for (let y = by - h + 4; y < by; y += 6) g.R(x, y, 18, 1, sh);
    poly(g, [[x - 2, by - h], [x + 9, by - h - 26], [x + 20, by - h]], rf); g.R(x + 8, by - h - 34, 2, 10, '#c8c0a8'); g.R(x + 5, by - h - 31, 8, 2, '#c8c0a8'); g.R(x + 4, by - h + 10, 10, 14, '#0a0a18'); g.R(x + 7, by - h + 12, 4, 9, '#f0c860');
    roofTiles(g, [[x + 14, by - 64], [x + w * .6 + 8, by - 92], [x + w + 2, by - 64]], rf, x + 14, x + w + 2, by - 90, by - 64);
    g.disc(x + w * .62, by - 44, 9, '#1a1a2e'); g.disc(x + w * .62, by - 44, 7, nt > .06 || tod > .5 ? '#f0c860' : '#8a9ac0'); g.R(x + w * .62 - 8, by - 45, 16, 1, '#1a1a2e'); g.R(x + w * .62, by - 52, 1, 16, '#1a1a2e');
    g.R(x + w * .62 - 6, by - 26, 12, 26, '#1a1a2e'); g.ell(x + w * .62, by - 26, 6, 5, '#1a1a2e'); g.R(x + w * .62 - 4, by - 24, 8, 24, '#3a2a1e'); for (let k = 0; k < 3; k++) { g.R(x + 24 + k * 10, by - 14, 5, 14, '#5a5a6a'); }
    if (nt > .06 || tod > .5) lampGlow(g, x + w * .62, by - 44, 22, .14);
  }
}
function skylineFar(g, o, cam, speed, by, tod) {
  const L = FARL, per = L.period, off = -((cam * speed) % per), nt = night(tod);
  for (let k = 0; k < 2; k++) L.forEach(b => { const x = off + k * per + b.x - 20; if (x > 250 || x + b.w < -10) return; const c = o.wire ? DEPTH[1] : mixc('#7a7a98', DARKW, .62 - nt * .1), top = by - b.h;
    if (b.ty === 'spire') { g.R(x + 4, top + 14, b.w - 8, b.h - 14, c); poly(g, [[x + 2, top + 16], [x + b.w / 2, top - 6], [x + b.w - 2, top + 16]], c); } else if (b.ty === 'dome') { g.R(x, top + 14, b.w, b.h - 14, c); g.ell(x + b.w / 2, top + 14, b.w / 2, 14, c); g.R(x + b.w / 2, top - 4, 1, 6, c); } else if (b.ty === 'tower') { g.R(x, top, b.w, b.h, c); for (let q = 0; q < Math.floor(b.w / 5); q++) g.R(x + 1 + q * 5, top - 3, 3, 3, c); } else if (b.ty === 'church') { g.R(x, top + 20, b.w, b.h - 20, c); g.R(x, top, 12, 20, c); poly(g, [[x - 1, top], [x + 6, top - 18], [x + 13, top]], c); } else { g.R(x, top, b.w, b.h, c); poly(g, [[x - 2, top], [x + b.w / 2, top - b.w * .3], [x + b.w + 2, top]], c); }
    if (!o.wire) for (let q = 0; q < 3; q++) if ((nt > .05 || tod > .5) && hs(b.i * 5 + q) > .4) g.R(x + 4 + q * 6, top + 6 + (q % 2) * 12, 2, 3, '#f0b850'); }); }
function streetMid(g, o, cam, speed, by, tod, t) {
  const L = MIDL, per = L.period, off = -((cam * speed) % per), vis = [];
  for (let k = 0; k < 2; k++) L.forEach(b => { const x = Math.round(off + k * per + b.x - 20); if (x > 250 || x + b.w < -10) return; building(g, o, b, x, by, b.i * 3 + k, tod, .22, t, vis); });
  return vis;
}
const label = (g, o, s, x, y) => { if (o.wire) g.txt(s, x, y, '#ffffffaa', { sz: 8, nofit: true }); };

// ------------------------------------------------------------------ the scenes
// the "ULT" mark: a pixel-gothic wordmark (serifed stems, like the logo) drawn once as an image, so it stays readable at 240 px
const ULTG = { U: ['####...####', '.###...###.', '.###...###.', '.###...###.', '.###...###.', '.###...###.', '.###...###.', '.###...###.', '.###...###.', '.####.####.', '.#########.', '..#######..'],
  L: ['#####.....', '.###......', '.###......', '.###......', '.###......', '.###......', '.###......', '.###......', '.###......', '.###....##', '.#########', '.#########'],
  T: ['###########', '###########', '##..###..##', '#...###...#', '....###....', '....###....', '....###....', '....###....', '....###....', '....###....', '...#####...', '..#######..'] };
const ULTC = { dim: ['#a8a0b0', '#6a6078'], hot0: ['#fff6c8', '#e8c050'], hot1: ['#f0c860', '#c8963c'] }, ultCache = {};
function ultMark(kind) {
  if (ultCache[kind]) return ultCache[kind]; const W = 36, Hh2 = 14, c = document.createElement('canvas'); c.width = W; c.height = Hh2; const x = c.getContext('2d'), px = new Map(), put = (X, Y, v) => px.set(X + ',' + Y, v);
  [['U', 1], ['L', 13], ['T', 24]].forEach(([k, ox]) => ULTG[k].forEach((row, r) => [...row].forEach((ch, q) => { if (ch === '#') put(ox + q, 1 + r, row[q + 1] === '#' ? 1 : 2); })));
  x.fillStyle = '#1c1210'; px.forEach((v, key) => { const [X, Y] = key.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]]) if (!px.has((X + dx) + ',' + (Y + dy))) x.fillRect(X + dx, Y + dy, 1, 1); });
  px.forEach((v, key) => { const [X, Y] = key.split(',').map(Number); x.fillStyle = ULTC[kind][v - 1]; x.fillRect(X, Y, 1, 1); });
  return ultCache[kind] = c;
}
const EXIT = new Image(); EXIT.src = 'assets/exit.png'; const EXIT_CV = Object.assign(document.createElement('canvas'), { width: 240, height: 240 });
const SCENES = {
  tavern: { name: 'Taverna', dur: 10, desc: 'Interior da taverna: os 4 sentados à mesa, levantam e pegam o equipamento nos ganchos da parede.',
    params: [{ id: 'fogo', l: 'fogo da lareira', v: .7 }, { id: 'luz', l: 'luz do ambiente', v: .5 }],
    draw(g, t, P, o, H) {
      const gy = H * .82; g.clear(o.wire ? '#14141c' : '#2a1c16');
      g.R(0, 0, 240, gy, o.wire ? DEPTH[0] : '#3a281e'); if (!o.wire) for (let y = 0; y < gy; y += 10) { g.R(0, y, 240, 1, '#2a1c16'); for (let x = (y / 10 & 1) * 12; x < 240; x += 24) g.R(x, y, 1, 10, '#2a1c16'); }
      g.R(0, gy, 240, H - gy, o.wire ? DEPTH[3] : '#4a3224'); for (let x = 0; x < 240; x += 18) g.R(x, gy, 1, H - gy, o.wire ? '#00000044' : '#2a1c16');
      const fl = .6 + .4 * Math.sin(t * 13) * P.fogo;                                                                        // fireplace
      g.R(8, gy - 52, 40, 52, o.wire ? DEPTH[1] : '#5a4a44'); g.R(14, gy - 40, 28, 40, '#14100e'); if (!o.wire) { for (let i = 0; i < 5; i++) g.poly([[18 + i * 5, gy], [20 + i * 5, gy - 8 - fl * 12 - hs(i + Math.floor(t * 8)) * 8], [23 + i * 5, gy]], i % 2 ? '#e08a3a' : '#f0c860'); } else g.R(18, gy - 14, 20, 14, '#e08a3a');
      for (let i = 0; i < 4; i++) { const x = 170 + i * 16; g.R(x, gy - 62, 3, 6, o.wire ? DEPTH[2] : '#6a5a4a'); }                       // gear pegs
      const tx = 118; g.R(tx - 46, gy - 22, 92, 6, o.wire ? DEPTH[4] : '#7a5a3a'); g.R(tx - 42, gy - 16, 5, 16, o.wire ? DEPTH[4] : '#5a4028'); g.R(tx + 37, gy - 16, 5, 16, o.wire ? DEPTH[4] : '#5a4028');
      label(g, o, 'fundo: parede', 70, 6); label(g, o, 'meio: mesa', 80, gy - 34);
      g.R(0, 0, 240, 7, o.wire ? DEPTH[1] : '#241810'); [64, 150, 232].forEach(x => g.R(x, 0, 5, gy - 6, o.wire ? DEPTH[1] : '#2a1c12'));
      g.R(156, 12, 30, 34, o.wire ? DEPTH[2] : '#1a1410'); g.R(158, 14, 26, 30, o.wire ? DEPTH[4] : '#9fb4d8'); g.R(170, 14, 2, 30, '#1a1410'); g.R(158, 28, 26, 2, '#1a1410'); if (!o.wire) { g.c.fillStyle = 'rgba(190,210,255,.10)'; g.poly([[158, 44], [184, 44], [210, gy], [140, gy]], 'rgba(190,210,255,.07)'); }
      torch(g, o, 110, 38, t); torch(g, o, 212, 40, t); torch(g, o, 54, 40, t);
      dummy(g, o, 'idle', t * .35, 214, gy - 14, 38, '#a8789a', -1);                                                                           // the innkeeper behind the bar
      g.R(192, gy - 22, 44, 22, o.wire ? DEPTH[4] : '#4a3220'); g.R(190, gy - 24, 48, 3, o.wire ? DEPTH[5] : '#6a4a2a'); if (!o.wire) { for (let k = 0; k < 5; k++) g.R(196 + k * 8, gy - 20, 1, 18, '#2a1c10'); g.R(194, gy - 40, 40, 2, '#3a2818'); [['#4a8a4a', 5], ['#c8a040', 6], ['#4a78b0', 5], ['#8a3a3a', 6], ['#c8a040', 5], ['#4a8a4a', 6], ['#8a3a3a', 5]].forEach(([c, h], k) => { g.R(196 + k * 5, gy - 40 - h, 3, h, c); g.R(197 + k * 5, gy - 40 - h - 1, 1, 1, '#e8e0c8'); }); g.R(200, gy - 27, 3, 3, '#c8c0a8'); g.R(222, gy - 27, 3, 3, '#c8c0a8'); for (let k = 0; k < 4; k++) g.R(14 + k * 3, 8 + (k % 2) * 3, 1, 8 + (k % 3) * 3, '#5a6a2a'); }
      if (!o.wire) { g.ell(226, gy - 8, 9, 10, '#5a4028'); g.R(218, gy - 10, 17, 2, '#2a1c10'); g.R(218, gy - 4, 17, 2, '#2a1c10'); [[90, 8], [128, 8], [146, 9]].forEach(([mx, my]) => { g.R(mx, gy - 22 - 5, 4, 5, '#c8c0a8'); g.R(mx + 4, gy - 26, 1, 3, '#c8c0a8'); }); }
      const u = t / 10;
      for (let i = 0; i < 4; i++) {
        const base = HEROES[i], x0 = tx - 34 + i * 23, delay = i * .04;
        if (t < 3 + delay * 4) dummy(g, o, 'sit', t * .5 + i * .2, x0, gy - 6, 48, base, i < 2 ? 1 : -1);
        else if (t < 5 + delay * 4) dummy(g, o, 'stand', (t - 3 - delay * 4) / 2, x0, gy - 6, 48, base, 1);
        else if (t < 8 + delay * 4) dummy(g, o, 'grab', (t - 5 - delay * 4) / 3, lerp(x0, 175 + i * 14, clamp((t - 5) / 2, 0, 1)), gy - 4, 48, base, 1);
        else dummy(g, o, 'walk', t * 1.2 + i * .2, lerp(175 + i * 14, 230 + i * 24, clamp((t - 8 - delay * 4) / 2, 0, 1)), gy - 4, 48, base, 1);
      }
      if (!o.wire) { g.c.fillStyle = `rgba(255,150,60,${.07 + .08 * fl * P.fogo})`; g.c.fillRect(0, 0, 240, H); g.c.fillStyle = `rgba(0,0,10,${.35 - P.luz * .3})`; g.c.fillRect(0, 0, 240, H); }
    } },
  board: { name: 'Quadro de missões (de costas)', dur: 6, desc: 'Os 4 vistos de costas diante do quadro de missões; um aponta para um aviso.',
    params: [{ id: 'notas', l: 'avisos no quadro', v: .6 }, { id: 'luz', l: 'lanterna', v: .6 }],
    draw(g, t, P, o, H) {
      const gy = H * .92; g.clear(o.wire ? '#1a1a22' : '#2e2218');
      g.R(14, 8, 212, H - 40, o.wire ? DEPTH[1] : '#6a4a2e'); g.R(18, 12, 204, H - 48, o.wire ? DEPTH[2] : '#8a6038'); if (!o.wire) for (let y = 12; y < H - 36; y += 11) g.R(18, y, 204, 1, '#6a4a2e');
      const n = 5 + Math.round(P.notas * 12); for (let i = 0; i < n; i++) { const x = 26 + (hs(i * 3.3) * 170 | 0), y = 18 + (hs(i * 5.1) * (H - 80) | 0), w = 16 + (hs(i * 7.7) * 10 | 0), h = 18 + (hs(i * 2.9) * 10 | 0); g.R(x, y, w, h, o.wire ? DEPTH[4] : i % 3 ? '#e8d8b0' : '#d8c8a0'); g.px(x + w / 2, y + 1, '#c8503c'); if (!o.wire) for (let k = 4; k < h - 2; k += 4) g.R(x + 2, y + k, w - 5, 1, '#8a7a5a'); }
      g.R(0, gy, 240, H - gy, o.wire ? DEPTH[5] : '#1a1410'); label(g, o, 'fundo: quadro', 80, 3);
      torch(g, o, 7, 52, t); torch(g, o, 233, 52, t); if (!o.wire) { g.R(204, 0, 1, 14, '#2a1c10'); g.R(199, 14, 11, 12, '#2a1c10'); g.R(201, 16, 7, 8, '#f0a040'); g.c.fillStyle = 'rgba(255,170,60,.2)'; g.c.beginPath(); g.c.arc(204, 20, 20, 0, 7); g.c.fill(); for (let k = 0; k < 3; k++) g.px(204 + Math.cos(t * 3 + k * 2) * (10 + k * 4), 20 + Math.sin(t * 4 + k) * 8, '#e8e0c8'); }
      for (let i = 0; i < 4; i++) { const x = 70 + i * 34, anim = i === 2 ? 'backPoint' : 'backIdle'; dummy(g, o, anim, i === 2 ? clamp(t / 1.5, 0, 1) : t * .35 + i * .3, x, H + 6, 78, HEROES[i], 1); }
      const gl = .55 + .45 * Math.sin(t * 7); if (!o.wire) { g.c.fillStyle = `rgba(255,190,90,${.05 + .12 * P.luz * gl})`; g.c.fillRect(0, 0, 240, H); }
    } },
  exit: { name: 'Saída da taverna', dur: 5, desc: 'A ilustração do grupo saindo da guilda (assets/exit.png, 240×240, tela inteira) em pixels 1:1 (sem zoom), entrando e saindo do preto. Sem a imagem, cai de volta na caminhada até a porta.',
    params: [{ id: 'luz', l: 'luz da porta', v: .8 }],
    draw(g, t, P, o, H) {
      if (EXIT.complete && EXIT.naturalWidth && !o.wire) {                          // the party leaves the guild: the illustration (240×240, the whole LCD) 1:1 pixels, fading in and out
        const c = EXIT_CV, x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(EXIT, 0, 0, 240, 240);                      // 1 image pixel = 1 LCD pixel (no zoom, so every pixel stays sharp)
        const a = Math.max(1 - clamp(t / .5, 0, 1), clamp((t - 4.4) / .6, 0, 1)); if (a > 0) { x.fillStyle = `rgba(0,0,0,${a})`; x.fillRect(0, 0, 240, 240); } o.full(c); o.hideFoot = true; g.clear('#000'); return;
      }
      const gy = H * .84; g.clear(o.wire ? '#101018' : '#1e1612'); const r = lerp(40, 130, clamp(t / 4, 0, 1)) * (.7 + P.luz * .5);
      g.R(150, gy - 96, 84, 96, o.wire ? DEPTH[4] : '#f2e2c4'); if (!o.wire) { for (let i = 0; i < 9; i++) g.poly([[150, gy - 90 + i * 11], [30 - i * 4, gy - 4 + i * 6], [30 - i * 4, gy + 6 + i * 6]], 'rgba(255,230,160,.06)'); g.c.fillStyle = `rgba(255,236,170,${.1 * P.luz})`; g.c.beginPath(); g.c.arc(190, gy - 50, r, 0, 7); g.c.fill(); }
      g.R(0, gy, 240, H - gy, o.wire ? DEPTH[5] : '#2a1c14'); g.R(140, gy - 100, 10, 100, o.wire ? DEPTH[2] : '#3a281e'); g.R(234, gy - 100, 8, 100, o.wire ? DEPTH[2] : '#3a281e'); g.R(140, gy - 104, 102, 6, o.wire ? DEPTH[2] : '#3a281e');
      label(g, o, 'fundo: luz', 160, gy - 120);
      if (!o.wire) { for (let k = 0; k < 9; k++) { g.R(136, gy - 100 + k * 11, 14, 10, k % 2 ? '#3a2a1e' : '#4a3626'); g.R(234, gy - 100 + k * 11, 10, 10, k % 2 ? '#3a2a1e' : '#4a3626'); } g.R(150, gy, 84, 3, '#d8c8a0'); g.R(146, gy + 3, 96, 3, '#a89880'); for (let k = 0; k < 6; k++) g.px(160 + k * 14 + Math.sin(t + k) * 2, gy - 60 - k * 5 + (t * 6 % 8), '#fff8d8'); }
      for (let i = 0; i < 4; i++) dummy(g, o, 'walk', t * 1.1 + i * .22, lerp(16 + i * 30, 200 + i * 26, clamp((t - i * .1) / 4.4, 0, 1)), gy + 4, 48, o.wire ? HEROES[i] : mixc(HEROES[i], '#0a0a14', .75), 1);
      if (t > 3.8) { g.c.fillStyle = `rgba(255,248,225,${clamp((t - 3.8) / 1.2, 0, 1)})`; g.c.fillRect(0, 0, 240, H); }
    } },
  town: { sprites: true, name: 'Vila (corrida lateral)', dur: 16, desc: 'Uma rua longa com casas de tipos diferentes (alta, loja, enxaimel, chalé, torre, arco, igreja), becos que se abrem para ruas laterais, uma praça com fonte e árvore, bandeirolas, roupa no varal e gente fazendo coisas em cada lugar. O grupo atravessa da esquerda para a direita; a luz vai do dia ao fim de tarde.',
    params: [{ id: 'tod', l: 'hora do dia', v: .3 }, { id: 'crowd', l: 'multidão', v: .6 }, { id: 'speed', l: 'velocidade', v: .5 }, { id: 'autotod', l: 'dia → fim de tarde sozinho', v: 1 }],
    draw(g, t, P, o, H) {
      const tod = P.autotod > .5 ? lerp(.2, .66, clamp(t / 16, 0, 1)) : P.tod, cam = t * (20 + P.speed * 60), gy = Math.round(H * .8), sk = skyCols(tod), NPC = ['#a8483a', '#4a6a9a', '#7a8a3a', '#a8789a', '#8a8a96', '#c8a050'], L = o.L || ((n, f) => f()), sp = (n, k) => o.spd ? o.spd(n, k) : k; let vis = [];
      if (o.wire) g.clear('#0e1020');
      L('céu e nuvens', () => { if (!o.wire) { g.sky(0, gy, sk); for (let i = 0; i < 3; i++) cloud(g, ((i * 90 - cam * sp('céu e nuvens', .04)) % 300 + 300) % 300 - 40, 14 + i * 12, 2 + i % 2, night(tod) > .3 ? '#2a2a50' : '#ffffffaa'); if (night(tod) > .2) { stars(g, o, t, 46, gy - 50); moon(g, o, 196, 26, 8); } } });
      L('montanhas', () => ridge(g, o, cam, sp('montanhas', .06), gy - 36, 30, 9, 0, mixc(sk[2], '#3a5a6a', .5), 3, tod));
      L('silhueta da cidade', () => skylineFar(g, o, cam, sp('silhueta da cidade', .12), gy - 10, tod));
      L('casas, becos e praça', () => { vis = streetMid(g, o, cam, sp('casas, becos e praça', .34), gy - 2, tod, t); });
      L('rua', () => { g.R(0, gy, 240, H - gy, o.wire ? DEPTH[4] : '#6a6258'); if (!o.wire) { for (let y = gy + 4; y < H; y += 8) for (let x = -((cam * .9) % 14) + (y / 8 & 1) * 7; x < 240; x += 14) g.R(x, y, 12, 1, '#524a40'); vis.filter(b => b.ty === 'alley').forEach(b => { poly(g, [[b.x + 2, gy], [b.x + b.w - 2, gy], [b.x + b.w + 14, gy + 12], [b.x - 14, gy + 12]], '#7a7268'); }); } });
      label(g, o, 'camadas: fundo → frente', 6, 4);
      L('bandeirolas', () => { if (!o.wire) { const per = 96, bx0 = -((cam * sp('bandeirolas', .5)) % per); for (let a = bx0 - per; a < 250; a += per) { const sag = 7 + hs(Math.round((a + cam * .5) / per)) * 3; let px0 = a, py0 = gy - 84; for (let u = 1; u <= 12; u++) { const x = a + u / 12 * per, y = gy - 84 + Math.sin(u / 12 * Math.PI) * sag; g.line(px0, py0, x, y, '#2a2230'); if (u % 2) g.poly([[x - 2, y], [x + 2, y], [x, y + 5]], ['#c8443c', '#4a78b0', '#e0b84a', '#6a9a4a'][u % 4]); px0 = x; py0 = y; } } } });
      L('lampiões, barris e barracas', () => { const per = 230; for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) { const x = ((i * 70 + k * per - cam * sp('lampiões, barris e barracas', .62)) % (per * 2) + per * 2) % (per * 2) - 30; if (x < -20 || x > 260) continue;
        if (i % 2 === 0) { g.R(x, gy - 38, 2, 40, o.wire ? DEPTH[3] : '#3a3a44'); g.R(x - 3, gy - 42, 8, 6, o.wire ? DEPTH[3] : '#2a2a30'); if (!o.wire) { lampGlow(g, x + 1, gy - 38, 14, night(tod) > .05 || tod > .5 ? .2 : .06); g.R(x - 1, gy - 41, 4, 4, '#f0c860'); } }
        else { g.R(x, gy - 14, 14, 16, o.wire ? DEPTH[3] : '#7a5a3a'); g.R(x, gy - 10, 14, 2, o.wire ? '#00000055' : '#4a3424'); g.R(x + 18, gy - 24, 26, 3, o.wire ? DEPTH[3] : '#4a78b0'); g.R(x + 20, gy - 24, 2, 24, o.wire ? DEPTH[3] : '#4a3424'); g.R(x + 42, gy - 24, 2, 24, o.wire ? DEPTH[3] : '#4a3424'); g.R(x + 24, gy - 17, 6, 4, '#8a3a2a'); g.R(x + 32, gy - 17, 6, 4, '#c8a040'); } } });
      L('moradores', () => { vis.forEach(b => { const by = gy - 2;
        if (b.ty === 'plaza') { [[.18, 'idle'], [.5, 'sit'], [.82, 'idle']].forEach(([u, a], q) => dummy(g, o, a, t * .4 + q, b.x + b.w * u, by + 7 + q * 2, 34, NPC[(b.v + q) % 6], q % 2 ? -1 : 1)); dummy(g, o, 'walk', t * 1.4 + b.v, b.x + ((t * 20 + b.v * 20) % (b.w - 14)), by + 12, 22, NPC[(b.v + 3) % 6], 1); }
        else if (b.ty === 'shop') dummy(g, o, 'idle', t * .4 + b.v, b.x + b.w * .35, by - 6, 30, NPC[(b.v + 1) % 6], 1);
        else if (b.ty === 'alley') { dummy(g, o, 'idle', t * .5, b.x + b.w * .5 - 4, by - 14, 20, NPC[(b.v + 2) % 6], 1); dummy(g, o, 'idle', t * .5 + 1, b.x + b.w * .5 + 6, by - 14, 20, NPC[(b.v + 4) % 6], -1); }
        else if (b.ty === 'arch') dummy(g, o, 'idle', t * .3, b.x + 7, by - 2, 36, '#8a8a96', 1); }); });
      L('multidão', () => { const N = Math.round(4 + P.crowd * 12);
        for (let i = 0; i < N; i++) { const row = i % 3, sz = [28, 36, 44][row], y = gy + [2, 10, 20][row] * (H / 160), spd = [.5, .7, .95][row], kind = i % 5 === 0 ? 'sit' : i % 5 === 1 ? 'idle' : 'walk', d = i % 2 ? 1 : -1;
          const x = (((i * 53 + 20) + (kind === 'walk' ? d * t * (7 + hs(i) * 9) : 0) - cam * spd) % 330 + 330) % 330 - 45; if (x < -30 || x > 270) continue; if (!o.wire) SH(g, x, y - 1, sz * .5, 2);
          dummy(g, o, kind, t * (kind === 'walk' ? 1.1 : .4) + i * .17, x, y, sz, NPC[i % 6], kind === 'walk' ? d : 1);
          if (kind === 'walk' && i % 4 === 0 && !o.wire) { g.R(x - 5, y - sz - 2, 10, 6, '#7a5a3a'); g.R(x - 5, y - sz - 2, 10, 1, '#9a7a4a'); } } });
      L('o grupo', () => { for (let i = 0; i < 4; i++) { const x = 70 + i * 26 + Math.sin(t * .6 + i) * 3; if (!o.wire) SH(g, x, gy + 22 * (H / 160), 24, 2); dummy(g, o, 'walk', t * 1.15 + i * .21, x, gy + 24 * (H / 160), 48, HEROES[i], 1); } });
      L('primeiro plano', () => { for (let i = 0; i < 5; i++) { const x = (((i * 120 - cam * sp('primeiro plano', 1.5)) % 620) + 620) % 620 - 60; if (x > 250) continue; g.R(x, H - 12 - (hs(i) * 10 | 0), 28, 20, o.wire ? DEPTH[5] : '#14181a'); for (let k = 0; k < 4; k++) poly(g, [[x + k * 7, H - 12], [x + k * 7 + 3, H - 28 - (hs(i + k) * 8 | 0)], [x + k * 7 + 7, H - 12]], o.wire ? DEPTH[5] : '#14181a'); } });
      L('luz da hora', () => { if (!o.wire) { g.c.fillStyle = `rgba(10,10,40,${night(tod) * .5})`; g.c.fillRect(0, 0, 240, H); g.c.fillStyle = `rgba(255,150,60,${tod > .4 && tod < .75 ? .09 : 0})`; g.c.fillRect(0, 0, 240, H); } });
    } },
  vista: { sprites: true, name: 'Colina com vista', dur: 8, desc: 'A câmera sobe: montanhas em quatro camadas, nuvens e rochas, o grupo de costas olhando o horizonte.',
    params: [{ id: 'tod', l: 'hora do dia', v: .3 }, { id: 'nevoa', l: 'névoa', v: .5 }],
    draw(g, t, P, o, H) {
      const gy = Math.round(H * .8), cam = t * 10, sk = skyCols(P.tod); if (o.wire) g.clear('#0e1020'); else { g.sky(0, H, sk); g.disc(170 - cam * .05, 34, 10, '#fff2c0'); }
      for (let i = 0; i < 4; i++) cloud(g, ((i * 80 - cam * .3) % 300 + 300) % 300 - 40, 20 + i * 14, 2 + (i & 1), o.wire ? DEPTH[0] : '#ffffffcc');
      if (!o.wire) { if (night(P.tod) > .15) { stars(g, o, t, 50, gy - 40); moon(g, o, 40, 30, 9); } for (let k = 0; k < 3; k++) { const bx = ((t * 14 + k * 70) % 300) - 30, by = 30 + k * 12 + Math.sin(t * 6 + k) * 3; g.px(bx, by, '#2a2a3a'); g.px(bx + 1, by - 1, '#2a2a3a'); g.px(bx + 2, by, '#2a2a3a'); g.px(bx - 1, by - 1, '#2a2a3a'); } }
      [[.1, 62, 70, 0, '#5a6a9a'], [.2, 50, 56, 1, '#46608a'], [.35, 38, 44, 2, '#34506a'], [.55, 26, 30, 3, '#243a4a']].forEach(([sp, base, amp, l, c], k) => { ridge(g, o, cam, sp, gy - 14 + k * 4, amp * .8, 14 - k * 2, l, mixc(c, sk[3], P.nevoa * (.55 - k * .12)), 7 + k * 5, P.tod); if (!o.wire && P.nevoa > .1) { g.c.fillStyle = `rgba(210,220,235,${P.nevoa * .08})`; g.c.fillRect(0, gy - 30 + k * 4, 240, 24); } });
      label(g, o, 'montanhas: 4 camadas', 6, 4);
      g.R(0, gy, 240, H - gy, o.wire ? DEPTH[4] : '#2a3a2a'); poly(g, [[0, gy + 6], [240, gy + 22], [240, H], [0, H]], o.wire ? DEPTH[5] : '#1a2a1e');
      for (let i = 0; i < 4; i++) dummy(g, o, 'backIdle', t * .3 + i * .25, 78 + i * 24, gy + 26 + (i & 1) * 3, 52, HEROES[i], 1);
      for (let i = 0; i < 3; i++) { const x = [10, 190, 224][i]; poly(g, [[x, H], [x + 6, H - 14 - i * 4], [x + 22, H - 10], [x + 30, H]], o.wire ? DEPTH[5] : '#10181a'); }
    } },
  walk: { sprites: true, name: 'Caminhada em grupo (com monstros)', dur: 12, desc: 'Corrida lateral na estrada: o grupo anda, monstros aparecem à direita e o encontro vira luta.',
    params: [{ id: 'tod', l: 'hora do dia', v: .4 }, { id: 'monstros', l: 'monstros', v: .5 }, { id: 'speed', l: 'velocidade', v: .5 }],
    draw(g, t, P, o, H) {
      const gy = Math.round(H * .8), cam = t * (24 + P.speed * 50), sk = skyCols(P.tod); if (o.wire) g.clear('#0e1020'); else g.sky(0, gy, sk);
      ridge(g, o, cam, .06, gy - 20, 38, 11, 1, '#5a6a8a', 4, P.tod); ridge(g, o, cam, .2, gy - 6, 28, 8, 2, '#3a5a5a', 9, P.tod);
      for (let i = 0; i < 10; i++) { const x = (((i * 60 - cam * .5) % 620) + 620) % 620 - 40; if (x > 260) continue; const h = 22 + (hs(i) * 16 | 0); g.R(x + 6, gy - 8, 3, 8, o.wire ? DEPTH[3] : '#3a2a1e'); g.ell(x + 7, gy - 8 - h / 2, 11, h / 2, o.wire ? DEPTH[3] : '#2a5a3a'); }
      g.R(0, gy, 240, H - gy, o.wire ? DEPTH[4] : '#6a5a40'); g.R(0, gy + 8, 240, 10, o.wire ? DEPTH[5] : '#8a7650'); for (let x = -((cam) % 24); x < 240; x += 24) g.R(x, gy + 12, 8, 1, o.wire ? '#00000055' : '#6a5a40');
      label(g, o, 'estrada', 6, gy + 20);
      if (!o.wire) { for (let i = 0; i < 14; i++) { const x = (((i * 37 - cam * 1.1) % 300) + 300) % 300 - 20; g.R(x, gy + 3, 1, 4 + (i % 3), '#2a4a1e'); g.R(x + 2, gy + 1, 1, 6, '#3a5a22'); g.R(x - 2, gy + 2, 1, 5, '#2a4a1e'); } }
      const ml = Math.round(1 + P.monstros * 3), enc = 6.5;
      for (let i = 0; i < ml; i++) { const x = lerp(280 + i * 26, 168 + i * 20, clamp((t - 2.5 - i * .3) / 3.5, 0, 1)); if (t < 2.5 + i * .3) continue; const hop = Math.abs(Math.sin(t * 5 + i * 2)) * 6, sy = gy + 18 - hop; g.ell(x, gy + 18, 10, 3, o.wire ? '#00000055' : '#00000044'); g.ell(x, sy - 6, 11, 8 - hop * .15, o.wire ? '#c0603a' : '#7ab04e'); if (!o.wire) { g.R(x - 4, sy - 9, 2, 3, '#1e1418'); g.R(x + 2, sy - 9, 2, 3, '#1e1418'); } }
      for (let i = 0; i < 4; i++) dummy(g, o, t > enc ? 'idle' : 'walk', t * 1.2 + i * .2, 40 + i * 24 + (t > enc ? 8 : 0), gy + 24, 48, HEROES[i], 1);
      (o.post || (f => f()))(() => { if (t > enc - .3 && t < enc + .5) { g.R(100, 20, 4, 14, '#e0503c'); g.R(100, 37, 4, 4, '#e0503c'); g.txt('!', 102, 18, '#fff', { sz: 20, al: 'c', nofit: true }); } if (t > enc + .2) { g.txt('→ LUTA', 120, H * .4, '#f2e2c4', { f: 't', sz: 22, al: 'c', ol: 0 }); } });
    } },
  fight: { sprites: true, name: 'Luta (15×15 contra um chefe enorme)', dur: 14, desc: 'Heróis de 15×15 diante de um chefe enorme. À esquerda, o rosto de cada herói com uma barrinha que enche enquanto você grava o loop; o herói que está à frente (sorteado) solta a ULT quando você para de gravar, se a barra estiver cheia. A primeira ULT carrega mais rápido, para dar impacto logo de cara.',
    params: [{ id: 'hp', l: 'vida do chefe', v: .75 }, { id: 'gravacao', l: 'quando você solta o REC', v: .7 }],
    foot: ['REC: SOLTAR LIBERA A ULT', 'HOME: VOLTA AO JOGO'],
    draw(g, t, P, o, H) {
      const gy = Math.round(H * .8), GMm = G.GAME, HER = GMm ? GMm.heroes() : ['mago', 'arqueiro', 'clerigo', 'guerreiro'], nH = HER.length, U0 = G.ULT, CI = (GMm && GMm.CLASSINFO) || {};
      const colOf = c => (CI[c] && CI[c].col) || HEROES[CLS4.indexOf(c)] || '#b83a2a';
      // recording starts at 0.4 s: the hero in front (random) starts half charged and is full after 3 s; the others start empty and fill slowly. The ULT only goes after REC is released.
      const REC0 = .4, front = (o.front != null ? o.front : Math.floor(hs(Math.floor(Date.now() / 14000) * 3.1 + .7) * 4)) % nH, tStop = o.live ? 1e9 : Math.min(2 + P.gravacao * 11, 11), tc = Math.min(t, tStop) - REC0, ukey = HER[front];
      const charge = i => i === front ? .5 + .5 * clamp(tc / 3, 0, 1) : clamp(tc / (10 + i * 2), 0, 1) * .6, full = charge(front) >= 1;
      const ult = !o.live && full && t > tStop && U0 && U0.has(ukey), ut = t - tStop, drain = ult ? clamp(1 - ut / .9, 0, 1) : clamp(1 - (t - tStop - .5) / 1.2, 0, 1), barOf = i => t <= tStop ? charge(i) : charge(i) * (i === front && ult ? drain : (ult ? clamp(1 - ut / 1.6, 0, 1) : drain)), who = front;
      if (ult) { const fa = U0.frame(ukey, ut); if (fa) o.full(fa); o.hideFoot = true; }
      if (o.wire) g.clear('#0e1020'); else { g.sky(0, gy, skyCols(.62)); } ridge(g, o, 0, 0, gy - 2, 30, 10, 1, '#4a4a6a', 6, .62);
      g.R(0, gy, 240, H - gy, o.wire ? DEPTH[4] : '#2e3a36'); if (!o.wire) { g.R(0, gy, 240, 1, '#4a5a56'); g.c.fillStyle = 'rgba(255,255,255,.04)'; for (let y = gy + 3; y < H; y += 5) g.c.fillRect(0, y, 240, 1); }
      torch(g, o, 40, gy - 8, t); torch(g, o, 232, gy - 8, t);
      if (!o.wire) { for (let k = 0; k < 6; k++) g.R(150 + k * 14 + hs(k) * 6, gy + 4 + (k % 3) * 6, 5 + (k % 2) * 4, 1, '#14120c'); }
      // the boss (huge)
      const BK = o.boss === 'wyvern' && G.WYV && G.WYV.ready ? 'wyvern' : 'slime', WYV = G.WYV;
      const bx = 180, bw = 74, bh = 112, br = Math.sin(t * 1.3) * 2, hit = Math.max(0, 1 - ((t * 1.1 + .3) % 1) * 7) * .16, ushake = ult && ut > .5 && ut < 1.4 ? Math.round(Math.sin(t * 60) * 2) : 0;
      const FALL = .42, fu = t < FALL ? t / FALL : 1, dropY = t < FALL ? -(gy + 150) * (1 - fu * fu) : 0, iu = Math.max(0, (t - FALL) / .5), osc = Math.exp(-6 * iu) * Math.cos(16 * iu), sqY = t < FALL ? 1 + .18 * (1 - fu) : 1 - .32 * osc, sqX = t < FALL ? 1 - .08 * (1 - fu) : 1 + .28 * osc, landShake = t > FALL && t < FALL + .16 ? Math.round(Math.sin(t * 90) * 2) : 0;
      if (BK === 'wyvern') {                                                // the Red Wyvern: the splash in the clouds, then it lands, idles, breathes fire (attack 2) and flinches when hit
        const W0 = 0, LAND = .12;                                           // it enters already landing: 0.12 s per landing frame, then it shakes from side to side
        const wt = t - W0, shk = wt > LAND * 5 && wt < LAND * 5 + .7 ? Math.round(Math.sin((wt - LAND * 5) * 55) * 3 * (1 - (wt - LAND * 5) / .7)) : 0, wx = bx - 4 + shk;
        // after landing and shaking, it moves between 'hurt' (stays longer, 60%) and 'attack 2' (40%): not a loop, each turn is drawn at random
        const tt = wt - (LAND * 5 + .7); let atk = false, loc = 0; if (tt >= 0) { let acc = 0, n = 0; for (; n < 400; n++) { const a = hs(n * 7.13 + 2.7) >= .6, len = a ? 1.2 : 1.5; if (tt < acc + len) { atk = a; loc = tt - acc; break; } acc += len; } }
        const af = Math.floor(loc / .12);
        g.c.fillStyle = 'rgba(0,0,0,.4)'; g.c.beginPath(); g.c.ellipse(bx, gy + 6, 70, 8, 0, 0, 7); g.c.fill();
        let anim = 'hurt', fi = 0;
        if (wt < 0) anim = null; else if (wt < LAND * 5) { anim = 'land'; fi = Math.floor(wt / LAND); } else if (atk) { anim = 'atk'; fi = Math.min(9, af); } else { anim = 'hurt'; fi = tt < 0 ? 0 : Math.floor(loc * 8) % 4; }
        if (anim) { const cvv = document.createElement('canvas'); cvv.width = 240; cvv.height = H; const cx = cvv.getContext('2d'); WYV.draw(cx, anim, fi, wx, gy + 6 + (anim === 'land' ? 0 : 0), true); if (o.sprite && !o.wire) o.sprite(cvv, 0, 0); else g.c.drawImage(cvv, 0, 0); }
        if (anim === 'atk' && fi >= 3) { const fl = (fi - 3) / 6; g.c.fillStyle = 'rgba(255,170,50,.16)'; g.c.fillRect(0, 0, 240, H); }
      }
      if (BK !== 'wyvern') {
      g.c.save(); g.c.translate(ushake + landShake, 0); g.c.translate(bx, gy + 5 + dropY); g.c.scale(sqX, sqY); g.c.translate(-bx, -(gy + 5));
      g.c.fillStyle = 'rgba(0,0,0,.4)'; g.c.beginPath(); g.c.ellipse(bx, gy + 5, bw + 14, 9, 0, 0, 7); g.c.fill();
      const body = mixc(o.wire ? '#c0603a' : '#6aa04a', '#ffffff', hit), lite = mixc(o.wire ? '#d88a5a' : '#92cc6a', '#ffffff', hit), dark = mixc(o.wire ? '#a04a2a' : '#4a7a38', '#000000', 0);
      g.ell(bx, gy - bh / 2 + 6 - br, bw, bh / 2 + br, body); g.ell(bx + 18, gy - 14 - br * .5, bw * .7, 16, dark); g.ell(bx - 22, gy - bh * .68 - br, 30, 22, lite);
      if (!o.wire) { for (let i = 0; i < 6; i++) { const px = bx - 40 + i * 17 + Math.sin(t + i) * 3, py = gy - 28 - (i % 3) * 20 - ((t * 6 + i * 9) % 12); g.ell(px, py, 3, 3, '#b8e090'); } g.R(bx - 36, gy - 66 - br, 7, 11, '#14180f'); g.R(bx - 33, gy - 64 - br, 3, 5, '#fff'); g.R(bx + 16, gy - 66 - br, 7, 11, '#14180f'); g.R(bx + 19, gy - 64 - br, 3, 5, '#fff'); g.R(bx - 18, gy - 40 - br, 36, 3, '#14180f'); }
      poly(g, [[bx - 34, gy - bh + 14 - br], [bx - 24, gy - bh - 8 - br], [bx - 10, gy - bh + 8 - br], [bx, gy - bh - 14 - br], [bx + 10, gy - bh + 8 - br], [bx + 24, gy - bh - 8 - br], [bx + 34, gy - bh + 14 - br]], '#f0c860');
      g.c.restore();
      if (t > FALL && t < FALL + .25 && !o.wire) for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI, d = (t - FALL) * 160; g.R(bx + Math.cos(a) * (bw * .6 + d) * (q < 4 ? -1 : 1) * (q % 4 + 1) / 2.5, gy + 4 - Math.sin(a) * d * .4, 3, 2, '#9ab070'); }       // dust at the landing
      }
      // heroes: 15×15; the one in front steps forward (and is drawn last)
      const CLS = HER, order = HER.map((_, i) => i).filter(i => i !== front).concat([front]);
      order.forEach(i => {
        const isF = i === front, per = 3.5, ph = (t + i * .85) % per, special = false, atk = special || ph < .75, u = special ? clamp(ut / 1.1, 0, 1) : atk ? ph / .75 : ph / per, anim = atk ? (CLS[i] === 'mago' || CLS[i] === 'clerigo' ? 'cast' : 'attack') : 'idle', x = 42 + i * 14 + (isF ? 10 : 0), y = gy + 6 + (i % 2) * 7;
        const bcI = o.sprite ? harm(colOf(CLS[i])) : colOf(CLS[i]), sp = (G.SPR && G.SPR.tiny(CLS[i], anim, atk ? u : t * 2, bcI)) || RIG.tiny(CLS[i], anim, atk ? u : t * 2, bcI); if (!o.wire) SH(g, x + 7, y - 1, 11, 2);
        if (o.wire) { g.c.fillStyle = '#eee8d2'; const img = RIG.tinyPx(CLS[i], anim, Math.min(3, Math.floor(u * 4))); for (let k = 0; k < 225; k++) if (img.px[k] >= 0) g.c.fillRect(x + (k % 15), y - 14 + Math.floor(k / 15), 1, 1); }
        else { if (o.sprite) o.sprite(sp, x, y - 14); else g.c.drawImage(sp, x, y - 14); RIG.reflect(g.c, sp, x, y + 1, .2); }
        if (!o.wire && isF && charge(i) >= 1 && !ult) for (let q = 0; q < 4; q++) g.px(x + 7 + Math.cos(t * 2 + q * 1.6) * 9, y - 7 + Math.sin(t * 2.6 + q * 1.6) * 8, q % 2 ? '#ffe9a0' : '#f0c860');       // charged: a few glints around the hero in front
        if (atk && !special && u > .3 && u < .85) {                                                    // code-made effects, one per class (no sprites needed)
          const a = (u - .3) / .55, tx = bx - 60, ty = gy - 40 - (i % 2) * 6;
          if (CLS[i] === 'arqueiro') { const ax = lerp(x + 12, tx, a); g.R(ax, y - 7, 5, 1, '#f2e2c4'); g.px(ax + 5, y - 7, '#f0c860'); }
          else if (CLS[i] === 'mago') { const ax = lerp(x + 12, tx, a), ay = lerp(y - 12, ty, a) - Math.sin(a * Math.PI) * 10; g.disc(ax, ay, 2, '#9ad0ff'); g.disc(ax, ay, 1, '#fff'); g.px(ax - 3, ay + 1, '#5a8ad0'); g.px(ax - 5, ay + 2, '#3a62c0'); }
          else if (CLS[i] === 'clerigo') { for (let q = 0; q < 4; q++) g.px(x + 7 + Math.sin(t * 9 + q) * 2, gy - 6 - a * 20 - q % 2 * 3, '#f0e090'); }
          else { g.c.strokeStyle = `rgba(255,255,255,${1 - a})`; g.c.lineWidth = 2; g.c.beginPath(); g.c.arc(x + 20, y - 6, 8 + a * 10, -1.2, 1); g.c.stroke(); }
        }
        if (atk && !special && u > .72 && u < .9) { const hx = bx - 78 + hs(i) * 10, hy = gy - 38 - hs(i + 3) * 34; for (let q = 0; q < 5; q++) g.px(hx + (hs(q + i) - .5) * 14, hy + (hs(q * 3 + i) - .5) * 14, q % 2 ? '#ffffff' : '#f0c860'); }
      });
      if (ult && !o.wire) { g.c.fillStyle = `rgba(0,0,0,${.3 * Math.min(1, ut / .3) * clamp(1 - (ut - 1.2) / 1.2, 0, 1)})`; g.c.fillRect(0, 0, 240, H); }
      const hpv = P.hp * (ult && ut > 1.0 ? clamp(1 - (ut - 1.0) * .3, .25, 1) : 1);
      (o.post || (f => f()))(() => {
        // faces on the left (one bar under each; the hero in front has a gold frame); locked slots at the end: the next hero, and "coming soon"
        const SL = 6, sy = i => 14 + i * 24, pulse = Math.floor(t * 5) % 2;
        g.c.imageSmoothingEnabled = false; g.c.drawImage(ultMark(full && !ult ? (pulse ? 'hot0' : 'hot1') : 'dim'), 2, -1);
        for (let i = 0; i < SL; i++) { const fx = 4, fy = sy(i), hero = i < nH ? HER[i] : null, isF = i === front;
          g.R(fx - 2, fy - 2, 24, 23, hero && isF ? '#e0b84a' : '#1e1418'); g.R(fx - 1, fy - 1, 22, 21, '#1e1418');
          if (hero) { const ptc = G.PORTRAITS && G.PORTRAITS.cv && G.PORTRAITS.cv(hero, 1) ? G.PORTRAITS.cv(hero, 1) : (G.PARTYFACE ? G.PARTYFACE(hero) : null), v = barOf(i);
            if (ptc) { g.c.save(); g.c.imageSmoothingEnabled = true; g.c.imageSmoothingQuality = 'high'; g.c.drawImage(ptc, fx, fy, 20, 19); g.c.restore(); } else { g.R(fx, fy, 20, 19, colOf(hero)); g.txt('W', fx + 10, fy + 4, '#1e1418', { f: 't', sz: 11, al: 'c', nofit: true }); }
            g.R(fx, fy + 19, 20, 2, '#00000099'); g.R(fx, fy + 19, Math.round(20 * v), 2, v >= 1 && pulse ? '#fff2b0' : '#e0b84a');
            if (isF && charge(i) >= 1 && !ult) for (let q = 0; q < 7; q++) { const a = q * .9 + t * 3, r = 13 + Math.sin(t * 8 + q) * 2; g.px(fx + 10 + Math.cos(a) * r * 1.05, fy + 9 + Math.sin(a) * r * .8, q % 2 ? '#ffffff' : '#f0c860'); } }
          else { g.R(fx, fy, 20, 19, '#2a2230'); g.R(fx + 7, fy + 9, 7, 6, '#6a5a78'); g.R(fx + 8, fy + 5, 1, 5, '#6a5a78'); g.R(fx + 12, fy + 5, 1, 5, '#6a5a78'); g.R(fx + 8, fy + 4, 5, 1, '#6a5a78'); } }
        g.R(104, 8, 130, 8, '#00000099'); g.R(106, 10, Math.round(126 * hpv), 4, '#e0503c'); g.txt('HP', 100, 8, '#f2e2c4', { sz: 8, al: 'r', nofit: true });
      });
    } },
};
// ---------------------------------------------------------------- canvas host: one scene to one canvas
function mkCanvas(H) { const c = document.createElement('canvas'); c.width = 240; c.height = 240; c.style.cssText = ''; return c; }
function render(cv, id, t, P, o) {
  const sc = SCENES[id]; if (!sc) return; const g = cv._g || (cv._g = T.makeG(cv)), H = o.band === false ? 240 : 160, post = [], layers = [], cfgL = o.layers || {};
  let fullCv = null; const sprites = [], light = { nt: 0, gold: 0 }, oo = { front: o.front, boss: o.boss, shift: o.shift, vt: o.vt, music: o.music, live: o.live, full: c2 => { fullCv = c2; }, wire: !!o.wire, hook: o.hook, light, sprite: sc.sprites && !o.wire ? (cv2, x, y) => sprites.push([cv2, x, y]) : null, post: f => post.push(f), spd: (n, k) => k * ((cfgL[n] && cfgL[n].spd) || 1),
    L: (name, fn) => { const rec = { name }; layers.push(rec); if (cfgL[name] && cfgL[name].vis === false) return; let before = null; if (o.lines) before = g.c.getImageData(0, 0, 240, H).data; fn(); if (o.lines) { const after = g.c.getImageData(0, 0, 240, H).data, m = new Uint8Array(240 * H); for (let k = 0; k < m.length; k++) { const j = k * 4; if (before[j] !== after[j] || before[j + 1] !== after[j + 1] || before[j + 2] !== after[j + 2]) m[k] = 1; } rec.mask = m; } } };
  g.n = 0; g.c.save(); g.c.beginPath(); g.c.rect(0, 0, 240, H); g.c.clip();
  try { sc.draw(g, t, Object.assign(defaults(id), P), oo, H); } catch (e) { console.error(id, e); (window.__errs = window.__errs || []).push(id + ': ' + (e && e.message)); }
  if (!o.wire && G.STYLE && o.pal !== 'original' && !sc.nopal) G.STYLE.apply(g.c, 0, 0, 240, H, G.STYLE.PALS[o.pal] ? o.pal : G.STYLE.forScene(id));      // few colours + dither; overlays are drawn after
  if (sprites.length) {                                   // characters keep their own colours (one per hero) instead of being dithered into the palette; the light of the hour is applied to them by hand
    const t2 = render._tmp || (render._tmp = document.createElement('canvas')); t2.width = 240; t2.height = 240; const tc = t2.getContext('2d'); tc.imageSmoothingEnabled = false; tc.clearRect(0, 0, 240, 240); sprites.forEach(([c2, x, y]) => tc.drawImage(c2, x, y));
    tc.globalCompositeOperation = 'source-atop'; if (light.nt > .01) { tc.fillStyle = `rgba(12,14,56,${light.nt * .55})`; tc.fillRect(0, 0, 240, 240); } if (light.gold > .01) { tc.fillStyle = `rgba(255,150,50,${light.gold * .16})`; tc.fillRect(0, 0, 240, 240); } tc.globalCompositeOperation = 'source-over'; g.c.drawImage(t2, 0, 0);
  }
  if (o.lines) layers.forEach((r, i) => { if (!r.mask) return; const col = DEPTH[Math.min(5, Math.round(i / Math.max(1, layers.length - 1) * 5))]; g.c.fillStyle = col; for (let y = 0; y < H; y++) for (let x = 0; x < 240; x++) { const k = y * 240 + x; if (!r.mask[k]) continue; if (x === 0 || y === 0 || x === 239 || y === H - 1 || !r.mask[k - 1] || !r.mask[k + 1] || !r.mask[k - 240] || !r.mask[k + 240]) g.c.fillRect(x, y, 1, 1); } });
  post.forEach(f => { try { f(); } catch (e) { console.error(id, e); (window.__errs = window.__errs || []).push(id + ': ' + (e && e.message)); } });
  g.c.restore(); cv._layers = layers.map(l => l.name);
  if (H < 240) {                                              // cinema strip: the art is 240×160; the rest of the 240×240 LCD is the dialogue box (no black bars)
    g.c.fillStyle = '#1e1418'; g.c.fillRect(0, H, 240, 240 - H); g.c.fillStyle = '#5a3a28'; g.c.fillRect(0, H, 240, 1); g.c.fillStyle = '#c8963c'; g.c.fillRect(0, H + 1, 240, 1);
    if (o.music && sc.panel) sc.panel(g, t, Object.assign(defaults(id), P), o, H); else {
    const words = String(o.cap || '').split(/\s+/).filter(Boolean), lines = []; let cur = ''; words.forEach(w => { if (g.tw((cur + ' ' + w).trim(), 'p', 10) > 222 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) lines.push(cur);
    lines.slice(0, 4).forEach((l, i) => g.txt(l, 8, H + 8 + i * 12, '#f2e2c4', { sz: 10, nofit: true }));
    if (!lines.length) g.txt('· · ·', 120, H + 28, '#5a3a28', { sz: 12, al: 'c', nofit: true });
    g.txt(o.hud || '', 8, 227, '#a89080', { sz: 8, nofit: true }); if (!o.nohud) g.txt('OCT+ pular ▸▸', 232, 227, '#a89080', { sz: 8, al: 'r', nofit: true });
    if (G.STYLE) G.STYLE.flat(g.c, 0, H, 240, 240 - H, 'castelo'); }
  }
  if (sc.foot && !oo.hideFoot && !o.nofoot && !fullCv) { g.c.fillStyle = '#000'; g.c.fillRect(0, 230, 240, 10); g.txt(sc.foot[0], 4, 231, '#8a8a96', { sz: 8, nofit: true }); if (sc.foot[1]) g.txt(sc.foot[1], 236, 231, '#8a8a96', { sz: 8, al: 'r', nofit: true }); }
  if (fullCv) g.c.drawImage(fullCv, 0, 0, 240, 240);                                // an animation that takes over the whole LCD (the user's own ultimate)
}
const defaults = id => { const o = {}; SCENES[id].params.forEach(p => { o[p.id] = p.v; }); return o; };
G.SCENES = { CFG, SCENES, render, defaults, HEROES, DEPTH, SEX, skyCols, mixc, mkCanvas, H: { hs, mixc, skyCols, night, dummy, SH, poly, cloud, lampGlow, ridge, stars, moon, smoke, torch, label, roofTiles } };
})(window);
