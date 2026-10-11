// FM1 Quest lab — close-up portraits, one per class, in a 4-tone ramp of the colour you pick (dark · mid · base · light), ordered-dithered.
// Idea of the reference: a dynamic 3/4 face lit by a glow, scarf/hood in motion, dark painted background, almost no colours.
// Each portrait is generated from shapes + lighting, then handed to the pixel editor (tones4) so every pixel can be redrawn by hand.
(function (G) {
'use strict';
const W = 96, H = 120, B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, RAMP = [18, 17, 16, 19];        // far (dark) · near (mid) · base · light
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; };
const inEll = (x, y, cx, cy, rx, ry, rot) => { const c = Math.cos(rot || 0), s = Math.sin(rot || 0), dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c; return (u / rx) ** 2 + (v / ry) ** 2 <= 1; };
const dSeg = (x, y, a, b, c, d) => { const vx = c - a, vy = d - b, t = clamp(((x - a) * vx + (y - b) * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(x - (a + vx * t), y - (b + vy * t)); };
const noise = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };

function build(cls, o) {
  o = o || {}; const px = Array(W * H).fill(-1), fig = new Uint8Array(W * H);
  const ink = (x, y, v, f) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const t = v * 3 + (B4[(y & 3) * 4 + (x & 3)] / 16 - .47) * .9; px[y * W + x] = RAMP[clamp(Math.round(t), 0, 3)]; if (f !== false) fig[y * W + x] = 1; };
  const flat = (x, y, idx, f) => { if (x < 0 || y < 0 || x >= W || y >= H) return; px[y * W + x] = idx; if (f !== false) fig[y * W + x] = 1; };
  // light sources: [x, y, radius, intensity]
  const SRC = { mago: [[22, 84, 62, 1.25]], arqueiro: [[8, 6, 90, .55], [6, 96, 60, .3]], clerigo: [[52, 8, 52, .75], [22, 86, 48, .9]], guerreiro: [[6, 110, 80, .65], [90, 20, 50, .35]] }[cls];
  const lit = (x, y) => { let v = .06; for (const [sx, sy, r, k] of SRC) { const d = Math.hypot(x - sx, y - sy); if (d < r) v += k * Math.pow(1 - d / r, 1.5); } return v; };
  const paint = (inside, val, f) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) ink(x, y, val(x, y), f); };
  // ---- background: dark painted smoke + the light spilling over it
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = Math.sin(x * .06 + Math.cos(y * .045) * 2.4) * .5 + .5, s2 = Math.sin(y * .07 - x * .03 + 1.7) * .5 + .5; ink(x, y, .1 + (s > .72 ? .2 : 0) + (s2 > .8 ? .12 : 0) + lit(x, y) * .55 + (noise(x >> 1, y >> 1) - .5) * .06, false); }
  // ---- body (cloak / robe / armour), neck and head
  const BODY = [[22, 86], [38, 72], [66, 72], [84, 80], [95, 100], [96, 120], [4, 120], [8, 100]];
  const folds = (x, y) => Math.sin(x * .22 + y * .13) * .07 + Math.sin(x * .09 - y * .2) * .05;
  paint((x, y) => inPoly(x, y, BODY), (x, y) => .2 + lit(x, y) * .7 + folds(x, y) - (x > 60 ? .05 : 0));
  paint((x, y) => inPoly(x, y, [[46, 56], [60, 56], [64, 78], [42, 78]]), (x, y) => .34 + lit(x, y) * .55 - (x > 54 ? .22 : 0));
  const FACE = [[37, 30], [44, 24], [58, 23], [66, 31], [68, 46], [63, 58], [54, 64], [46, 63], [40, 55], [36, 44]];
  paint((x, y) => inPoly(x, y, FACE), (x, y) => .52 + lit(x, y) * .6 - (x > 56 ? .25 : 0) - (y > 56 ? .12 : 0) + (noise(x, y) - .5) * .03);
  paint((x, y) => inEll(x, y, 66, 46, 3, 5, 0), (x, y) => .4 + lit(x, y) * .3);                                 // ear
  // ---- class garments, hair, props
  if (cls === 'mago') {
    paint((x, y) => inPoly(x, y, [[30, 40], [34, 22], [46, 14], [62, 14], [72, 26], [74, 50], [68, 36], [54, 28], [40, 32]]), (x, y) => .14 + lit(x, y) * .35);                          // hair under the hat
    paint((x, y) => inPoly(x, y, [[36, 27], [70, 27], [62, 8], [54, 1], [56, 14], [48, 16]]), (x, y) => .16 + lit(x, y) * .5 - (x > 56 ? .08 : 0));                                       // hat cone
    paint((x, y) => inEll(x, y, 52, 28, 27, 6, -.08), (x, y) => .2 + lit(x, y) * .6);                                                                                                  // brim
    paint((x, y) => inPoly(x, y, [[36, 54], [62, 54], [78, 66], [72, 86], [42, 82], [32, 66]]), (x, y) => .3 + lit(x, y) * .7 + folds(x, y) * 1.4);                                       // scarf over the mouth
    paint((x, y) => inPoly(x, y, [[4, 104], [10, 92], [18, 88], [28, 90], [32, 100], [18, 106]]), (x, y) => .55 + lit(x, y) * .55);                                                        // hand
    for (let k = 0; k < 4; k++) paint((x, y) => dSeg(x, y, 8 + k * 5, 98 - k * 1, 6 + k * 5, 86 - k * 3 - (k === 0 ? 0 : 0)) < 1.6, (x, y) => .7 + lit(x, y) * .3);                      // fingers
    paint((x, y) => Math.hypot(x - 22, y - 80) < 12, (x, y) => .95 + lit(x, y) * .2);                                                                                                  // orb
    const star = (x, y) => [0, 1, 2, 3, 4].some(i => { const a = i * 1.2566 - 1.5708, b = ((i + 2) % 5) * 1.2566 - 1.5708; return dSeg(x, y, 22 + Math.cos(a) * 8, 80 + Math.sin(a) * 8, 22 + Math.cos(b) * 8, 80 + Math.sin(b) * 8) < .7; });
    for (let y = 66; y < 96; y++) for (let x = 8; x < 38; x++) if (Math.hypot(x - 22, y - 80) < 12 && star(x, y)) flat(x, y, 18);
  } else if (cls === 'arqueiro') {
    paint((x, y) => inPoly(x, y, [[27, 46], [28, 22], [42, 8], [62, 8], [76, 22], [78, 58], [70, 76], [60, 62], [66, 44], [64, 30], [52, 26], [40, 30], [36, 44]]), (x, y) => .18 + lit(x, y) * .55 + folds(x, y));   // hood
    paint((x, y) => inPoly(x, y, [[28, 24], [42, 6], [50, 4], [38, 16]]), (x, y) => .3 + lit(x, y) * .5);
    paint((x, y) => dSeg(x, y, 66, 6, 96, 40) < 2 || dSeg(x, y, 70, 8, 58, 0) < 1.2, (x, y) => .78);                                                                                   // feather
    paint((x, y) => inPoly(x, y, [[36, 56], [62, 56], [72, 70], [66, 82], [42, 80], [34, 68]]), (x, y) => .28 + lit(x, y) * .7 + folds(x, y) * 1.3);                                       // neck wrap
    paint((x, y) => dSeg(x, y, 18, 70, 88, 112) < 2.2, (x, y) => .58 + lit(x, y) * .3);                                                                                                // quiver strap
    paint((x, y) => { const bx = 84 + Math.sin((y - 4) / 112 * Math.PI) * 8; return Math.abs(x - bx) < 1.8 && y > 4 && y < 116; }, (x, y) => .72 + lit(x, y) * .3);                      // bow
    paint((x, y) => Math.abs(x - 84) < .6 && y > 6 && y < 114, (x, y) => .95);                                                                                                         // string
    paint((x, y) => dSeg(x, y, 22, 68, 84, 68) < 1, (x, y) => .85);                                                                                                                    // arrow
    paint((x, y) => inPoly(x, y, [[22, 64], [34, 68], [22, 72]]), (x, y) => .6);
  } else if (cls === 'clerigo') {
    paint((x, y) => inPoly(x, y, [[28, 52], [28, 24], [40, 10], [64, 10], [76, 24], [78, 62], [72, 78], [62, 62], [66, 44], [62, 30], [52, 24], [42, 30], [36, 46]]), (x, y) => .3 + lit(x, y) * .55 + folds(x, y));    // veil / hood
    paint((x, y) => inEll(x, y, 52, 9, 24, 5.5, 0) && !inEll(x, y, 52, 9, 19, 3, 0), (x, y) => 1.1);                                                                                    // halo
    paint((x, y) => inPoly(x, y, [[34, 58], [64, 58], [76, 70], [70, 86], [42, 84], [30, 70]]), (x, y) => .34 + lit(x, y) * .6 + folds(x, y) * 1.2);                                       // mantle collar
    paint((x, y) => inPoly(x, y, [[4, 106], [10, 94], [20, 90], [30, 94], [34, 104], [18, 110]]), (x, y) => .55 + lit(x, y) * .5);                                                         // hand
    paint((x, y) => (Math.abs(x - 22) < 2.2 && y > 70 && y < 98) || (Math.abs(y - 80) < 2.2 && x > 12 && x < 32), (x, y) => 1.15);                                                       // holy cross
    paint((x, y) => Math.hypot(x - 22, y - 80) < 14 && Math.hypot(x - 22, y - 80) > 11, (x, y) => .9 + lit(x, y) * .2);
  } else {
    paint((x, y) => inPoly(x, y, [[29, 34], [30, 26], [44, 14], [62, 14], [74, 26], [75, 44], [70, 36], [60, 30], [44, 32]]), (x, y) => .12 + lit(x, y) * .4);                          // hair edge
    paint((x, y) => inEll(x, y, 52, 27, 22, 14, 0) && y < 36, (x, y) => .34 + lit(x, y) * .5 + (y < 18 ? .1 : 0));                                                                      // helmet dome
    paint((x, y) => inPoly(x, y, [[43, 28], [48, 28], [47, 46], [43, 44]]), (x, y) => .5 + lit(x, y) * .4);                                                                           // nose guard
    paint((x, y) => inPoly(x, y, [[62, 30], [70, 32], [70, 56], [62, 62], [58, 50]]), (x, y) => .3 + lit(x, y) * .4);                                                                   // cheek plate
    paint((x, y) => inPoly(x, y, [[46, 14], [52, 2], [60, 14], [54, 12]]), (x, y) => .62 + lit(x, y) * .4);                                                                          // crest
    paint((x, y) => inEll(x, y, 80, 88, 17, 12, -.3), (x, y) => .4 + lit(x, y) * .55 - (y > 90 ? .12 : 0));                                                                           // pauldron
    for (let k = 0; k < 3; k++) flat(72 + k * 7, 84 + (k === 1 ? -1 : 0), 19);
    paint((x, y) => dSeg(x, y, 92, 18, 36, 108) < 3, (x, y) => .6 + lit(x, y) * .2 + (dSeg(x, y, 92, 18, 36, 108) < 1.2 ? .4 : 0));                                                     // sword blade
    paint((x, y) => dSeg(x, y, 26, 102, 46, 110) < 2, (x, y) => .3);                                                                                                                    // crossguard
    paint((x, y) => dSeg(x, y, 44, 56, 52, 46) < .6, (x, y) => .25);                                                                                                                    // scar
  }
  // ---- face details (all classes): brow, eye with highlight, nose, mouth
  const mouthVisible = cls !== 'mago' && cls !== 'arqueiro';
  for (let y = 33; y < 62; y++) for (let x = 36; x < 66; x++) {
    if (!inPoly(x, y, FACE)) continue;
    if (dSeg(x, y, 38, 39, 48, 36) < 1) flat(x, y, 18);                                                                  // brow
    if (inEll(x, y, 44, 43, 4.2, 3, -.15)) flat(x, y, 19);                                                              // eye white
    if (Math.hypot(x - 43, y - 43) < 2.4) flat(x, y, 16); if (Math.hypot(x - 43, y - 43) < 1.3) flat(x, y, 18);        // iris + pupil
    if (dSeg(x, y, 39, 41, 48, 40) < .7) flat(x, y, 18);                                                                // upper lid
    if (mouthVisible && dSeg(x, y, 42, 56, 49, 55) < .6) flat(x, y, 18);                                                // mouth
  }
  flat(42, 42, 19); flat(37, 49, 17); flat(37, 50, 17); flat(38, 51, 18);
  // ---- outline of the figure (darkest tone), so it reads against the busy background
  const out = px.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fig[y * W + x]) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !fig[ny * W + nx]) { out[y * W + x] = 18; break; } } }
  for (let i = 0; i < out.length; i++) px[i] = out[i];
  if (o.transparent) for (let i = 0; i < px.length; i++) if (!fig[i]) px[i] = -1;
  return { w: W, h: H, px };
}
const NAMES = { mago: 'Mago', arqueiro: 'Arqueiro', clerigo: 'Clérigo', guerreiro: 'Guerreiro' };
G.PORTRAIT = { build, NAMES, W, H };

// ---- UI inside the Personagens tab -------------------------------------------------------------------------------
const host = document.getElementById('chars'); if (!host || !G.RIG || !G.PXE) return;
const RIG = G.RIG, PX = G.PX, Store = G.Store, BASES = PX.BASES;
const sec = document.createElement('div'); sec.className = 'edsec';
sec.innerHTML = `<h3>Retratos · zoom no rosto (um por classe)</h3><p class="sub2">Referência: rosto em 3/4 iluminado por um brilho, cachecol/capuz em movimento, fundo escuro pintado e poucas cores. Aqui cada classe tem o seu retrato em <b>4 tons da cor que você escolher</b> (escuro · médio · base · luz); a cor padrão é a da classe. É um ponto de partida gerado por código: clique em “editar” para redesenhar pixel a pixel.</p><div class="ptgrid" id="pt-grid"></div>
<div class="edcols"><div class="edcol"><div class="edrow"><b id="pt-title">—</b><button id="pt-regen">refazer o original da classe</button><button id="pt-png">baixar PNG</button><label><input type="checkbox" id="pt-tr"> fundo transparente</label></div><div id="pt-editor"></div></div></div>`;
host.append(sec);
const CLASSES = ['mago', 'arqueiro', 'clerigo', 'guerreiro'], st = { cur: 'mago', cols: {}, imgs: {} };
CLASSES.forEach(c => { st.cols[c] = RIG.CLASSES[c]; });
const grid = sec.querySelector('#pt-grid');
const ed = new G.PXE(sec.querySelector('#pt-editor'), { w: 96, h: 120, zoom: 6, tones: true, tones4: true, only3: true, onChange: e => { st.imgs[st.cur] = e.get(); Store.debounce('portraits', () => ({ imgs: st.imgs, cols: st.cols })); paintCards(); } });
const NB = c => { const r = PX.hex2rgb(RIG.CLASSES[c]); let best = BASES[0], bd = 1e9; BASES.forEach(b => { const q = PX.hex2rgb(b), d = (r[0] - q[0]) ** 2 + (r[1] - q[1]) ** 2 + (r[2] - q[2]) ** 2; if (d < bd) { bd = d; best = b; } }); return best; };
CLASSES.forEach(c => { st.cols[c] = NB(c); });
function cvOf(c, scale) { const T = RIG.ramp4(st.cols[c]), img = st.imgs[c] || (st.imgs[c] = build(c)), cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; const col = i => i === 16 ? T.base : i === 17 ? T.near : i === 18 ? T.far : i === 19 ? T.light : PX.PAL[i]; for (let k = 0; k < img.px.length; k++) if (img.px[k] >= 0) { x.fillStyle = col(img.px[k]); x.fillRect((k % W) * scale, Math.floor(k / W) * scale, scale, scale); } return cv; }
const cards = {};
CLASSES.forEach(c => { const d = document.createElement('div'); d.className = 'ptcard'; d.innerHTML = `<canvas width="${W * 3}" height="${H * 3}"></canvas><b>${NAMES[c]}</b><label>cor <select>${BASES.map((b, i) => `<option value="${b}">${['vermelho', 'laranja', 'amarelo', 'verde', 'verde-água', 'azul', 'azul-escuro', 'roxo', 'magenta', 'rosa', 'cinza', 'areia'][i]}</option>`).join('')}</select></label><button>editar</button>`; grid.append(d); cards[c] = d;
  d.querySelector('select').value = st.cols[c]; d.querySelector('select').onchange = e => { st.cols[c] = e.target.value; if (st.cur === c) ed.setBase(st.cols[c]); paintCards(); Store.debounce('portraits', () => ({ imgs: st.imgs, cols: st.cols })); };
  d.querySelector('button').onclick = () => select(c); d.querySelector('canvas').onclick = () => select(c); });
function paintCards() { CLASSES.forEach(c => { const cv = cards[c].querySelector('canvas'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(cvOf(c, 1), 0, 0, cv.width, cv.height); cards[c].classList.toggle('on', c === st.cur); }); }
function select(c) { st.cur = c; sec.querySelector('#pt-title').textContent = NAMES[c]; ed.setBase(st.cols[c]); ed.set(st.imgs[c] || (st.imgs[c] = build(c))); paintCards(); }
sec.querySelector('#pt-regen').onclick = () => { if (confirm('Refazer o retrato original de ' + NAMES[st.cur] + '? (apaga suas edições deste retrato)')) { st.imgs[st.cur] = build(st.cur, { transparent: sec.querySelector('#pt-tr').checked }); select(st.cur); Store.debounce('portraits', () => ({ imgs: st.imgs, cols: st.cols })); } };
sec.querySelector('#pt-png').onclick = () => { const cv = cvOf(st.cur, 4), a = document.createElement('a'); a.href = cv.toDataURL(); a.download = 'retrato_' + st.cur + '.png'; a.click(); };
Store.get('portraits', null).then(v => { if (v) { Object.assign(st.imgs, v.imgs || {}); Object.assign(st.cols, v.cols || {}); CLASSES.forEach(c => { cards[c].querySelector('select').value = st.cols[c]; }); } select('mago'); });
paintCards(); select('mago');
st.cv = cvOf;
// ---- the author's own portraits (B&W, 4 greys): Knight · Priest · Warrior · Elf Wizard. cv() gives the head (52×64), cardPic() the whole picture (52×100) or the small one (32×62);
//      Archer has no new art yet and keeps the generated portrait. Loaded from assets/portraits/<class>.png (_s = small).
st.art = {}; const ARTCLS = ['mago', 'clerigo', 'guerreiro', 'warrior'], oldCv = cvOf;
ARTCLS.forEach(c => ['', '_s'].forEach(sfx => { const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0); (st.art[c] = st.art[c] || {})[sfx || 'full'] = cv; }; im.src = 'assets/portraits/' + c + sfx + '.png'; }));
st.useArt = false;                                                  // the author's portraits are kept but not used (Party and the fight show the pixel heroes)
st.cv = function (c, scale) { const a = st.useArt && st.art[c] && st.art[c].full; if (!a) return c === 'warrior' ? null : oldCv(c, scale); const s = scale || 1, cv = document.createElement('canvas'); cv.width = 52 * s; cv.height = 64 * s; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(a, 0, 0, 52, 64, 0, 0, cv.width, cv.height); return cv; };
st.cardPic = (c, small) => st.art[c] ? st.art[c][small ? '_s' : 'full'] || null : null;
G.PORTRAITS = st;

})(window);
