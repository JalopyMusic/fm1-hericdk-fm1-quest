// FM1 Quest lab — the TAVERN v2: the user's own isometric background (tavern/bg.png, 240×160, 32 colours, dithered) + live pixel layers on top:
//   · the 4 heroes on the stage, each with an instrument and a tiny FM-1 in the hero's colour whose screen blinks on the beat
//   · the 7 regulars (user sprites) dancing around the tables, the fireplace flames following the beat
// Everything follows the real tempo when something plays, and a calm 108 bpm otherwise, so the room is always partying.
(function (G) {
'use strict';
const SC = G.SCENES, Hh = SC && SC.H; if (!SC || !Hh || !SC.SCENES.tavern) return; const { hs } = Hh;
const OL = '#1c1210', HCOL = { mago: '#3a8ac0', arqueiro: '#7ab04e', clerigo: '#d8b43a', guerreiro: '#e08a3a' };
const bg = new Image(); bg.src = 'tavern/bg.png';
// where each hero stands on the stage (feet) and where each regular stands / dances (feet), in the 240×160 picture
const STAGE = [['mago', 90, 76], ['arqueiro', 116, 81], ['clerigo', 142, 82], ['guerreiro', 168, 77]];
const FLOOR = [['robo', 70, 104], ['crono', 98, 122], ['marle', 168, 120], ['lucca', 205, 98], ['frog', 150, 108], ['magus', 44, 96], ['ayla', 124, 107]];
const REGH = 21;
const regs = {};                                                                                                 // regulars shrunk once more to fit the smaller room (nearest neighbour, whole pixels)
function shrink(src, h) { const f = h / src.height, w = Math.max(5, Math.round(src.width * f)), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, w, h); return c; }
function regSprites() {
  const CH = G.TAVCH; if (!CH || !CH.ready) return null; if (regs.ok) return regs;
  ['crono', 'lucca', 'robo', 'frog', 'magus', 'marle'].forEach(k => { if (CH[k]) regs[k] = shrink(CH[k], REGH); });
  regs.dances = CH.dances.map(a => a.map(c => shrink(c, REGH + 1))); regs.ok = true; return regs;
}
function R(g, x, y, w, h, c) { g.c.fillStyle = c; g.c.fillRect(Math.round(x), Math.round(y), w, h); }
function note(g, x, y, c) {                                                                                   // a quaver: head, stem, flag, with a 1 px outline
  const PX = [[0, 5], [1, 5], [2, 5], [0, 6], [1, 6], [2, 6], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 0], [4, 1], [4, 2]];
  PX.forEach(([a, b]) => { [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => R(g, x + a + dx, y + b + dy, 1, 1, OL)); }); PX.forEach(([a, b]) => R(g, x + a, y + b, 1, 1, c));
}
// ---- instruments (drawn in front of the hero) ---------------------------------------------------------------------------------------------------------------
function keyboard(g, x, y, beat, fb) {                                                                          // synth on a stand
  R(g, x - 7, y - 13, 16, 5, OL); R(g, x - 6, y - 12, 14, 3, '#2a2230'); R(g, x - 6, y - 12, 14, 1, '#d8d0e0'); for (let k = 0; k < 7; k++) R(g, x - 5 + k * 2, y - 12, 1, 1, '#2a2230');
  const on = Math.floor(beat * 2) % 7; R(g, x - 6 + on * 2, y - 12, 2, 2, '#9ad0ff'); R(g, x - 6, y - 8, 1, 8, OL); R(g, x + 7, y - 8, 1, 8, OL); R(g, x - 6, y - 8, 14, 1, OL);
}
function guitar(g, x, y, beat, fb) {                                                                            // bass guitar slung low, neck pointing up-right
  const sw = fb < .25 ? 1 : 0; R(g, x - 3, y - 12 + sw, 8, 7, OL); R(g, x - 2, y - 11 + sw, 6, 5, '#8a5a2a'); R(g, x - 1, y - 10 + sw, 4, 3, '#a8743a'); R(g, x + 1, y - 9 + sw, 2, 2, OL);
  for (let k = 0; k < 11; k++) { R(g, x + 4 + k, y - 12 - k * .8 + sw * 0, 1, 2, k < 10 ? '#5a3820' : OL); } R(g, x + 15, y - 21, 3, 3, OL); R(g, x + 15, y - 21, 2, 2, '#c8b078'); R(g, x - 4, y - 14, 1, 7, '#7ab04e');
  if (fb < .3) { R(g, x + 6, y - 13, 1, 1, '#fff6d8'); R(g, x + 9, y - 17, 1, 1, '#fff6d8'); }
}
function harp(g, x, y, beat, fb) {                                                                              // small golden harp
  const hx = x + 6; R(g, hx - 1, y - 22, 3, 18, OL); R(g, hx, y - 22, 1, 17, '#e0b84a'); for (let k = 0; k < 11; k++) { R(g, hx + 1 + k, y - 22 + k * .6 + 0, 1, 3, OL); R(g, hx + 1 + k, y - 22 + k * .6 + 0, 1, 2, '#e0b84a'); }
  R(g, hx, y - 6, 13, 3, OL); R(g, hx + 1, y - 5, 11, 1, '#e0b84a');
  for (let k = 0; k < 5; k++) { const ln = 14 - k * 2, on = Math.floor(beat * 4 + k) % 5 === 0; R(g, hx + 2 + k * 2, y - 6 - ln + 0, 1, ln - 1, on ? '#ffffff' : '#fff6d8'); }
}
function drum(g, x, y, beat, fb) {                                                                              // snare + sticks (left, right alternate on the 8th notes)
  R(g, x - 6, y - 10, 14, 8, OL); R(g, x - 5, y - 9, 12, 6, '#c8483a'); R(g, x - 5, y - 5, 12, 1, '#f6ebc8'); R(g, x - 6, y - 12, 14, 4, OL); R(g, x - 5, y - 11, 12, 2, '#f6ebc8');
  R(g, x - 5, y - 2, 1, 2, OL); R(g, x + 6, y - 2, 1, 2, OL); const l = Math.floor(beat * 2) % 2 === 0, u = (beat * 2) % 1 < .35;
  const stick = (sx, up) => { for (let k = 0; k < 5; k++) R(g, sx + k, (up ? y - 13 - k : y - 13 - (k >> 1)) | 0, 1, 1, '#f6ebc8'); };
  stick(x - 9, l && u ? 0 : 1); stick(x + 5, !l && u ? 0 : 1);
}
const INSTR = { mago: keyboard, arqueiro: guitar, clerigo: harp, guerreiro: drum };
function fm1(g, x, y, cls, on, big) {                                                                           // a tiny FM-1: dark body, hero-coloured trim, a screen that flashes
  const c = HCOL[cls];
  R(g, x - 1, y - 1, 15, 10, OL); R(g, x, y, 13, 8, '#2a2230'); R(g, x, y, 13, 1, c); R(g, x + 1, y + 2, 6, 4, OL); R(g, x + 2, y + 3, 4, 2, on ? '#fff6d8' : c + '66'); if (on && big) R(g, x + 1, y + 2, 6, 4, c);
  R(g, x + 8, y + 2, 2, 2, '#8a8090'); R(g, x + 11, y + 2, 1, 2, '#8a8090'); for (let k = 0; k < 6; k++) R(g, x + 1 + k * 2, y + 7, 1, 1, k % 2 ? '#8a8090' : '#d8d0e0');
}
function fire(g, t, kk, fogo) {                                                                                  // flames in the fireplace opening, taller on the beat
  const x0 = 151, y0 = 56, W = 12; R(g, x0 - 1, y0 - 15, W + 2, 16, '#0c0808');
  for (let k = 0; k < W; k++) { const mid = 1 - Math.abs(k - (W - 1) / 2) / (W / 2), n = hs(k * 3.1 + Math.floor(t * 9)) * .95 + .15, h = Math.round((2 + 8 * mid * n + 7 * kk * mid) * (.6 + .5 * fogo));
    for (let j = 0; j < h; j++) { const u = j / Math.max(1, h); R(g, x0 + k, y0 - j, 1, 1, u < .3 ? '#ffe9a0' : u < .55 ? '#f6b23a' : u < .8 ? '#e0662a' : '#a8322a'); } }
}
function glow(g, kk, t, fogo) {                                                                                 // light thrown by the fire on the nearby stones, stronger on the beat
  const a = (.05 + .05 * Math.sin(t * 11)) * fogo + .1 * kk; g.c.fillStyle = 'rgba(255,150,50,' + Math.max(0, a * .6) + ')'; g.c.fillRect(138, 30, 38, 34); g.c.fillStyle = 'rgba(255,170,60,' + Math.max(0, a) + ')'; g.c.fillRect(144, 38, 26, 22);
}
SC.SCENES.tavern = Object.assign(SC.SCENES.tavern, { nopal: true, sprites: false,
  desc: 'A taverna do autor (imagem 240×160, 32 cores, pontilhada) com camadas vivas: os 4 heróis no palco tocando, cada um com um mini FM-1 da sua cor piscando no tempo; os frequentadores dançando; a lareira batendo com a música. Sem música, a festa continua em 108 bpm.',
  params: [{ id: 'fogo', l: 'fogo da lareira', v: .8 }, { id: 'musica', l: 'notas de música', v: .8 }],
  draw(g, t, P0, o, H) {
    g.clear('#000'); const oy = Math.round((H - 160) / 2), c = g.c; c.save(); c.translate(-Math.round(o.shift || 0), oy); c.imageSmoothingEnabled = false; if (bg.complete && bg.naturalWidth) c.drawImage(bg, 0, 0, 240, 160);
    const E = G.Engine, vis = E && E.visual && E.S && E.S.playing ? E.visual() : null, beat = vis ? vis.beat : t * 1.8, fb = beat - Math.floor(beat), kk = Math.max(0, 1 - fb * 3.2), mus = P0.musica == null ? .8 : P0.musica, fogo = P0.fogo == null ? .8 : P0.fogo;
    glow(g, kk, t, fogo); fire(g, t, kk, fogo);
    const items = [], add = (d, f) => items.push([d, f]), RS = regSprites();
    // regulars: hop on the beat, alternate the side they face; Ayla dances (two dances swapped at random every 3–8 s)
    FLOOR.forEach(([who, x, y], i) => add(y, () => { const ph = i * .37, flip = (Math.floor(beat + ph) & 1) === 1, bob = Math.round(Math.abs(Math.sin(Math.PI * ((beat + ph * .5) % 1))) * -2); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x - 5, y - 1, 11, 2); let spr = null;
      if (who === 'ayla' && RS && RS.dances && RS.dances[0].length) { let k = 0, s0 = 0, len = 3 + 5 * hs(0); while (s0 + len < t && k < 400) { s0 += len; k++; len = 3 + 5 * hs(k * 3.7); } const arr = RS.dances[hs(k * 7.1 + 2) > .5 ? 1 : 0].length ? RS.dances[hs(k * 7.1 + 2) > .5 ? 1 : 0] : RS.dances[0]; spr = arr[Math.floor(beat * 2) % arr.length]; }
      else if (RS && RS[who]) spr = RS[who]; if (!spr) return;
      const bx = Math.round(x - spr.width / 2), by = Math.round(y - spr.height + 1 + bob); if (flip) { c.save(); c.translate(bx + spr.width, by); c.scale(-1, 1); c.drawImage(spr, 0, 0); c.restore(); } else c.drawImage(spr, bx, by);
      if (mus > .05) { const per = 2.4 + hs(i * 9) * 1.4, u = ((t + ph * 3) % per) / per; if (hs(Math.floor((t + ph * 3) / per) + i) < mus) note(g, Math.round(x - 2 + Math.sin(u * 7 + i) * 4), Math.round(by - 4 - u * 18), u > .75 ? '#e8d5a8' : '#f6ebc8'); } }));
    // the band on the stage
    STAGE.forEach(([cls, x, y], i) => add(y + .5, () => {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x - 7, y - 1, 15, 2); const bob = Math.round(Math.abs(Math.sin(Math.PI * fb)) * -1), spr = G.PIXHERO && G.PIXHERO.canvas(cls, 'idle', (beat * .5 + i * .25) % 1, 26, HCOL[cls], 1, true);
      if (spr) c.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height + 2 + bob)); INSTR[cls](g, x, y, beat, fb);
      // the tiny FM-1: each plays its own rhythm
      const on = cls === 'mago' ? fb < .35 : cls === 'arqueiro' ? (fb > .45 && fb < .8) : cls === 'clerigo' ? (beat % 4) < 1.2 : (beat * 2) % 1 < .35, fy = y - 44 + Math.round(Math.sin(t * 2 + i) * 1);
      fm1(g, x - 7, fy, cls, on, on && cls !== 'clerigo');
      if (mus > .05) { const per = 2.0 + hs(i * 5) * 1.2, u = ((t + i * .9) % per) / per; if (hs(Math.floor((t + i * .9) / per) + i * 3) < mus + .15) note(g, Math.round(x + 6 + Math.sin(u * 7 + i) * 4), Math.round(fy - 2 - u * 16), u > .75 ? '#e8d5a8' : HCOL[cls]); } }));
    items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f()); c.restore();
  } });
})(window);
