// FM1 Quest lab — "mapa de poucas cores": every environment is re-coloured with a tiny palette (3–5 tones + one warm light),
// ordered-dithered, so that one element always stands out (torch, lit window, the key, the player). References: black/cyan ruin, violet night,
// green forest, brown/grey castle with a glowing window, slate night city with copper lights. Light sources are always orange.
(function (G) {
'use strict';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PALS = {
  ruina: { name: 'Ruínas · preto, ciano e branco', tones: ['#0f1214', '#14707a', '#27c3cc', '#f4ffff'], gamma: 1.3, dither: .85, cap: .6 },
  noite: { name: 'Noite violeta', tones: ['#1c1033', '#3a2a6a', '#5a4a98', '#8a7ac8'], green: ['#3f8a6a', '#9ad8a0'], gamma: 1.15, dither: .9 },
  floresta: { name: 'Floresta · verdes e vinho', tones: ['#3e141e', '#2e4410', '#5e8218', '#a8d03a'], gamma: 1.2, dither: .9 },
  castelo: { name: 'Castelo · preto, marrom e cinza', tones: ['#000000', '#3a2a1a', '#6a5238', '#948c78', '#c8c0a8'], gamma: 1.2, dither: .95, cap: .9 },
  cidade: { name: 'Cidade à noite · ardósia', tones: ['#08080e', '#1a1e28', '#2c303a', '#464850', '#6a6a74'], gamma: 1.25, dither: .9, cap: .85 },
};
const LIGHT = ['#c8561a', '#f08a30', '#ffc460'];                     // warm light, always orange: dim → bright
Object.values(PALS).forEach(p => { p.rgb = p.tones.map(rgb); if (p.green) p.grgb = p.green.map(rgb); });
const LRGB = LIGHT.map(rgb);
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const S = { on: true, PALS, LIGHT };
S.on = false; try { S.on = localStorage.getItem('fm1lab.style2') === '1'; } catch (e) {}      // the filter on the OLD screens is off by default: they will be rebuilt one by one with the new sprites, not just recoloured
S.setOn = v => { S.on = v; try { localStorage.setItem('fm1lab.style2', v ? '1' : '0'); } catch (e) {} S.syncBody && S.syncBody(); };

// the filter: warm bright saturated pixels become the orange light, (violet night only) green pixels become the pale green, everything else is
// mapped by luminance to the palette's tones with a 4×4 ordered dither
S.apply = function (ctx, x, y, w, h, name, o) {
  const p = PALS[name]; if (!p) return; o = o || {}; const id = ctx.getImageData(x, y, w, h), d = id.data, n = p.rgb.length, pr = p.rgb, dith = (o.dither == null ? p.dither : o.dither), gam = p.gamma, gr = p.grn || p.grgb;
  for (let j = 0, py = 0; py < h; py++) for (let px = 0; px < w; px++, j += 4) {
    const r = d[j], g = d[j + 1], b = d[j + 2], mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b), l = (mx + mn) / 510, df = mx - mn;
    let out = null;
    if (df > 40 && l > .4) {                                           // coloured and not dark: light source or vegetation
      const sat = df / (255 - Math.abs(mx + mn - 255) + .001); let hh;
      if (mx === r) hh = 60 * (((g - b) / df + 6) % 6); else if (mx === g) hh = 60 * ((b - r) / df + 2); else hh = 60 * ((r - g) / df + 4);
      if (sat > .4 && (hh < 60 || hh > 340) && l > .45) out = LRGB[l > .72 ? 2 : l > .58 ? 1 : 0];
      else if (gr && sat > .25 && hh > 75 && hh < 170) out = gr[l > .55 ? 1 : 0];
    }
    if (!out) {
      let v = (.3 * r + .59 * g + .11 * b) / 255; const hi = mn > 228; v = Math.pow(v, gam) * (p.cap || 1); const t = v * (n - 1) + (B4[((py + (o.oy || 0)) & 3) * 4 + ((px + (o.ox || 0)) & 3)] / 16 - .47) * dith; out = pr[hi ? n - 1 : clamp(Math.round(t), 0, n - 1)];
    }
    d[j] = out[0]; d[j + 1] = out[1]; d[j + 2] = out[2];
  }
  ctx.putImageData(id, x, y);
};
// flat (no dither) mapping to a palette's tones + the warm light: used for the interface chrome and for screens that are only UI, so text stays crisp
const LUTS = {};
function lutFor(name) {
  if (LUTS[name]) return LUTS[name]; const p = PALS[name] || PALS.castelo, pal = p.rgb.concat(LRGB, p.grgb || []), L = new Uint8Array(32768);
  for (let i = 0; i < 32768; i++) { const r = ((i >> 10) & 31) * 8 + 4, g = ((i >> 5) & 31) * 8 + 4, b = (i & 31) * 8 + 4; let best = 0, bd = 1e9; for (let k = 0; k < pal.length; k++) { const q = pal[k], d = (r - q[0]) ** 2 * .3 + (g - q[1]) ** 2 * .59 + (b - q[2]) ** 2 * .11; if (d < bd) { bd = d; best = k; } } L[i] = best; }
  return LUTS[name] = { L, pal };
}
S.flat = function (ctx, x, y, w, h, name) {
  const { L, pal } = lutFor(name || 'castelo'), id = ctx.getImageData(x, y, w, h), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const c = pal[L[((d[j] >> 3) << 10) | ((d[j + 1] >> 3) << 5) | (d[j + 2] >> 3)]]; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; }
  ctx.putImageData(id, x, y);
};
// DOM screens (the Quest tiles): an SVG filter that maps luminance to the castle tones
(function () {
  const t = PALS.castelo.rgb, tv = i => t.map(c => (c[i] / 255).toFixed(3)).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="fx-castle" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1.25 0 0 0 -.08  0 1.25 0 0 -.08  0 0 1.25 0 -.08  0 0 0 1 0"/><feColorMatrix type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="discrete" tableValues="${tv(0)}"/><feFuncG type="discrete" tableValues="${tv(1)}"/><feFuncB type="discrete" tableValues="${tv(2)}"/></feComponentTransfer></filter>`;
  const add = () => document.body.append(svg); if (document.body) add(); else addEventListener('DOMContentLoaded', add);
  const st = document.createElement('style'); st.textContent = 'body.castle .lcd:not(.tav){filter:url(#fx-castle)}'; document.head.append(st);
  const sync = () => { if (document.body) document.body.classList.toggle('castle', S.on); }; S.syncBody = sync; sync(); addEventListener('DOMContentLoaded', sync);
})();
// which palette each environment gets (null = a menu screen: keep as drawn)
const DEFS = { 'Forge': 'castelo', 'Alchemy': 'castelo', 'Overworld': 'floresta', 'Dungeon map': 'ruina', 'Spellbook': 'noite', 'Hearth': 'castelo', 'Echo': 'noite', 'Formation · Battle': 'floresta', 'Formation': 'castelo',
  'ENV · Feitiço 1/2': 'castelo', 'ENV · Altares 2/2': 'ruina', 'LFO · Sea': 'noite', 'FX Slicer · Towers': 'cidade', 'FX Delay · Floresta': 'floresta', 'FX Reverb · Catedral': 'castelo', 'SCL · Torch wall': 'castelo',
  'Layer Roll · Runas': 'ruina', 'Layer Steps · Placas': 'castelo', 'SAVE · Baús': 'castelo', 'Hold Clear · Banir': 'noite', 'Orrery': 'cidade', 'Spectrum Sky': 'cidade', 'Jam Tavern': 'castelo', 'Library': 'castelo', 'Trophies': 'castelo', 'Class change': 'noite', 'Zones': 'floresta', 'Companion': 'noite', 'Practice Loop': 'castelo', 'Duel': 'noite', 'Piano Hero': 'noite', 'FM Hero': 'noite', 'Importer': 'ruina', 'Party · Blocos': 'noite', 'Envelope Dojo': 'castelo', 'Song Select': 'castelo' };
S.forDef = name => DEFS[name] || null;
S.forBiome = b => ({ forest: 'floresta', cave: 'ruina', coast: 'noite', ruins: 'castelo', night: 'cidade', boss: 'floresta' })[b] || 'castelo';
const SC = { tavern: 'castelo', board: 'castelo', exit: 'castelo', town: 'cidade', vista: 'noite', walk: 'floresta', fight: 'noite', street: 'castelo', logo: 'castelo', oath: 'noite', grave: 'ruina', title: 'castelo' };
S.forScene = id => SC[id] || 'castelo';
G.STYLE = S;
})(window);
