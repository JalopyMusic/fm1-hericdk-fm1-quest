// FM1 Quest lab — the RED WYVERN (second boss): the user's sprite sheets (assets/wyvern/*.png) cut into frames, scaled to the game and snapped to one small palette so the pixels stay crisp.
//   land  : 5 frames of 256 px (the dragon comes down and settles)        hurt : 4 frames of 256 px (crouched, hit)
//   atk2  : 10 frames of 200 px (fire breath; drawn smaller in the sheet, so it is rescaled by 89/70 to match the crouch)   fly : the dragon in the clouds (the splash when it enters)
(function (G) {
'use strict';
const GS = .6, K = 89 / 70, SRC = { land: ['assets/wyvern/land.png', 256, 5], hurt: ['assets/wyvern/hurt.png', 256, 4], atk: ['assets/wyvern/atk2.png', 200, 10] };
const WY = G.WYV = { ready: false, frames: {}, splash: null, GS, draw: () => false };
const ld = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = u; });
function palette(imgs, n) {                                           // a popularity palette (4 bits per channel) from every opaque pixel of the sheets
  const h = new Map(); imgs.forEach(im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); h.set(k, (h.get(k) || 0) + 1); } });
  return [...h.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => [((k >> 8) & 15) * 17, ((k >> 4) & 15) * 17, (k & 15) * 17]);
}
function snap(cv, pal) { const x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height), p = d.data; for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 120) { p[i + 3] = 0; continue; } p[i + 3] = 255; let b = 0, bd = 1e9; for (let j = 0; j < pal.length; j++) { const q = (pal[j][0] - p[i]) ** 2 + (pal[j][1] - p[i + 1]) ** 2 + (pal[j][2] - p[i + 2]) ** 2; if (q < bd) { bd = q; b = j; } } p[i] = pal[b][0]; p[i + 1] = pal[b][1]; p[i + 2] = pal[b][2]; } x.putImageData(d, 0, 0); return cv; }
(async () => {
  const im = {}; for (const k of Object.keys(SRC)) im[k] = await ld(SRC[k][0]); const fly = null; if (!im.land || !im.hurt || !im.atk) return;
  const pal = palette([im.land, im.hurt, im.atk], 28);
  for (const [k, [, cw, n]] of Object.entries(SRC)) { const s = GS * (k === 'atk' ? K : 1), arr = []; for (let f = 0; f < n; f++) { const w = Math.round(cw * s), h = Math.round(im[k].height * s), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im[k], f * cw, 0, cw, im[k].height, 0, 0, w, h); arr.push({ cv: snap(cv, pal), ax: k === 'atk' ? 26 * GS : 0 }); } WY.frames[k] = arr; }
  if (fly) { const cv = document.createElement('canvas'); cv.width = 240; cv.height = 160; const x = cv.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; const sw = fly.width, sh = sw * 160 / 240, sy = (fly.height - sh) / 2 + 30; x.drawImage(fly, 0, sy, sw, sh, 0, 0, 240, 160); const fp = palette([fly], 40), d = x.getImageData(0, 0, 240, 160), p = d.data; for (let i = 0; i < p.length; i += 4) { let b = 0, bd = 1e9; for (let j = 0; j < fp.length; j++) { const q = (fp[j][0] - p[i]) ** 2 + (fp[j][1] - p[i + 1]) ** 2 + (fp[j][2] - p[i + 2]) ** 2; if (q < bd) { bd = q; b = j; } } p[i] = fp[b][0]; p[i + 1] = fp[b][1]; p[i + 2] = fp[b][2]; p[i + 3] = 255; } x.putImageData(d, 0, 0); WY.splash = cv; }
  // draw(ctx, 'land'|'hurt'|'atk', frame, x, groundY, flip): x = the middle of the crouched body; the wyvern faces right in the sheets, flip = faces left (towards the heroes)
  WY.draw = (c, anim, i, x, gy, flip) => { const a = WY.frames[anim]; if (!a) return false; const fr = a[Math.max(0, Math.min(a.length - 1, i | 0))], bx = -110 * GS + fr.ax; c.save(); c.translate(Math.round(x), Math.round(gy)); if (flip) c.scale(-1, 1); c.imageSmoothingEnabled = false; c.drawImage(fr.cv, Math.round(bx), -fr.cv.height); c.restore(); return true; };
  WY.ready = true;
})();
})(window);
