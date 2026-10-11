// FM1 Quest lab — rig engine: a stick-figure skeleton (forward kinematics) with a pose/animation library, pixel-crisp dummy rendering,
// and a parts compositor (the same idea as Dead Cells' SkinMaker: drawn parts follow the bones of the pose library).
// Angles are radians, 0 = pointing straight down, + = towards the way the figure faces. Lengths are fractions of the figure height.
(function (G) {
'use strict';
const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), eo = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3), ei = t => Math.pow(clamp(t, 0, 1), 2);
const BL = { spine: .30, neck: .05, uarm: .16, farm: .15, thigh: .21, shin: .21, foot: .075, wpn: .30 };
// two medium-size models to compare: A has a bigger head, shorter legs and firmer limbs (easier to read and to edit); B is slimmer, like the character sheet
const MODELS = {
  A: { name: 'A · cabeça maior, membros firmes', bl: { spine: .27, neck: .045, hr: .118, uarm: .145, farm: .135, thigh: .165, shin: .165, foot: .075, wpn: .30 }, hd: [.108, .102], k: 1.5 },
  B: { name: 'B · esbelto (folha de personagens)', bl: { spine: .30, neck: .05, hr: .085, uarm: .16, farm: .15, thigh: .21, shin: .21, foot: .075, wpn: .30 }, hd: [.072, .068], k: 1 },
};
const CFG = { model: 'B', tones: 2 }; try { CFG.model = localStorage.getItem('fm1lab.model') === 'A' ? 'A' : 'B'; CFG.tones = localStorage.getItem('fm1lab.tones') === '3' ? 3 : 2; } catch (e) {}   // tones: 2 = one colour, two tones for the front and back layers
const dn = (a, l) => [Math.sin(a) * l, Math.cos(a) * l], upv = (a, l) => [Math.sin(a) * l, -Math.cos(a) * l], add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const DEF = { x: 0, y: 0, lean: 0, head: 0, aN1: 0, aN2: 0, aF1: 0, aF2: 0, lN1: 0, lN2: 0, lF1: 0, lF2: 0, fN: 0, fF: 0 };
const P = o => Object.assign({}, DEF, o);
const mix = (a, b, t) => { const o = {}; for (const k in DEF) o[k] = lerp(a[k] || 0, b[k] || 0, t); return o; };

// ---- side view: forward kinematics ------------------------------------------------------------------------------
function solve(p, m) {
  const BL = MODELS[m || CFG.model].bl, J = {}; J.pelvis = [p.x, p.y]; J.chest = add(J.pelvis, upv(p.lean, BL.spine)); J.neck = add(J.chest, upv(p.lean + p.head * .5, BL.neck)); J.head = add(J.neck, upv(p.lean + p.head, BL.hr));
  J.shN = J.chest; J.shF = add(J.chest, [-.012, 0]);
  J.elN = add(J.shN, dn(p.aN1, BL.uarm)); J.haN = add(J.elN, dn(p.aN1 + p.aN2, BL.farm)); J.elF = add(J.shF, dn(p.aF1, BL.uarm)); J.haF = add(J.elF, dn(p.aF1 + p.aF2, BL.farm));
  J.hpN = J.pelvis; J.hpF = add(J.pelvis, [-.01, 0]);
  J.knN = add(J.hpN, dn(p.lN1, BL.thigh)); J.anN = add(J.knN, dn(p.lN1 + p.lN2, BL.shin)); J.toN = add(J.anN, [Math.cos(p.fN) * BL.foot, -Math.sin(p.fN) * BL.foot]);
  J.knF = add(J.hpF, dn(p.lF1, BL.thigh)); J.anF = add(J.knF, dn(p.lF1 + p.lF2, BL.shin)); J.toF = add(J.anF, [Math.cos(p.fF) * BL.foot, -Math.sin(p.fF) * BL.foot]);
  J.wpn = add(J.haN, dn(p.aN1 + p.aN2, BL.wpn));
  return J;
}
// ---- animation library ------------------------------------------------------------------------------------------
const SIT = P({ y: .13, lean: .04, head: -.02, aN1: .85, aN2: .75, aF1: .6, aF2: .9, lN1: 1.5, lN2: -1.5, lF1: 1.46, lF2: -1.46 });
const IDLE0 = P({ lean: .03, head: -.02, aN1: .12, aN2: .2, aF1: -.1, aF2: .15, lN1: .06, lN2: -.04, lF1: -.07, lF2: .03 });
const ANIMS = {
  idle: { label: 'parado', loop: true, fps: 4, n: 4, f(u) { const b = Math.sin(u * TAU); return P({ y: -b * .006, lean: .03 + .01 * b, head: -.02, aN1: .12 + .05 * b, aN2: .2, aF1: -.1 - .05 * b, aF2: .15, lN1: .06, lN2: -.04, lF1: -.07, lF2: .03 }); } },
  walk: { label: 'andando', loop: true, fps: 8, n: 8, f(u) { const ph = u * TAU, s = Math.sin(ph), c = Math.cos(ph), s2 = Math.sin(ph + Math.PI), c2 = Math.cos(ph + Math.PI); return P({ y: -Math.abs(c) * .02, lean: .06, head: -.04, lN1: .5 * s, lN2: -.95 * Math.max(0, c), lF1: .5 * s2, lF2: -.95 * Math.max(0, c2), fN: -.25 * Math.max(0, c), fF: -.25 * Math.max(0, c2), aN1: -.55 * s, aN2: .25 + .25 * Math.max(0, -s), aF1: -.55 * s2, aF2: .25 + .25 * Math.max(0, -s2) }); } },
  run: { label: 'correndo', loop: true, fps: 10, n: 8, f(u) { const ph = u * TAU, s = Math.sin(ph), c = Math.cos(ph), s2 = Math.sin(ph + Math.PI), c2 = Math.cos(ph + Math.PI); return P({ y: -Math.abs(c) * .035, lean: .22, head: -.12, lN1: .85 * s, lN2: -1.5 * Math.max(0, c), lF1: .85 * s2, lF2: -1.5 * Math.max(0, c2), fN: -.3 * Math.max(0, c), fF: -.3 * Math.max(0, c2), aN1: -.95 * s, aN2: 1.1, aF1: -.95 * s2, aF2: 1.1 }); } },
  attack: { label: 'ataque (espada)', loop: false, fps: 10, n: 6, f(u) { const w = clamp(u / .35, 0, 1), s = clamp((u - .35) / .2, 0, 1), r = clamp((u - .55) / .45, 0, 1); const arm = u < .35 ? lerp(.1, -2.4, eo(w)) : u < .55 ? lerp(-2.4, 1.25, ei(s)) : lerp(1.25, .1, eo(r)), fore = u < .35 ? lerp(.2, -.5, w) : u < .55 ? lerp(-.5, .2, s) : lerp(.2, .2, r), lean = u < .35 ? lerp(.03, -.12, w) : u < .55 ? lerp(-.12, .28, ei(s)) : lerp(.28, .03, eo(r)), lunge = u < .35 ? .2 * w : u < .55 ? lerp(.2, .8, s) : lerp(.8, .06, eo(r)); return P({ lean, head: -.05, aN1: arm, aN2: fore, aF1: -.4 * lean, aF2: .3, lN1: lunge, lN2: -.15 - lunge * .3, lF1: -lunge * .8, lF2: -.1, y: -.01 * Math.sin(u * Math.PI) }); } },
  cast: { label: 'magia', loop: false, fps: 8, n: 6, f(u) { const e = eo(u / .5), h = u > .5 ? Math.sin((u - .5) * TAU * 2) * .06 : 0; return P({ lean: -.06 * e, head: -.1 * e, aN1: lerp(.1, 2.6, e) + h, aN2: lerp(.2, .2, e), aF1: lerp(-.1, 2.3, e) - h, aF2: .15, lN1: .1, lN2: -.1, lF1: -.12, lF2: .05, y: -.01 * e }); } },
  hurt: { label: 'ferido', loop: false, fps: 8, n: 3, f(u) { const r = 1 - eo(u); return P({ lean: -.3 * r, head: -.28 * r, aN1: .9 * r, aN2: .4, aF1: 1.2 * r, aF2: .4, lN1: .3 * r, lN2: -.2, lF1: -.4 * r, lF2: -.1, y: -.03 * Math.sin(u * Math.PI) }); } },
  dead: { label: 'derrotado', loop: false, fps: 8, n: 6, f(u) { const e = eo(u); return P({ lean: lerp(.03, -1.5, e), head: lerp(0, -.3, e), aN1: lerp(.1, 1.2, e), aN2: .2, aF1: lerp(-.1, .6, e), aF2: .2, lN1: lerp(.06, -.6, e), lN2: lerp(-.04, -.9, e), lF1: lerp(-.07, -.2, e), lF2: lerp(.03, -1.0, e), y: lerp(0, .02, e) }); } },
  kneel: { label: 'ajoelhado (juramento)', loop: true, fps: 3, n: 4, f(u) { const b = Math.sin(u * TAU); return P({ y: .115 - b * .004, lean: .14, head: .22 + b * .02, aN1: .55, aN2: .35, aF1: .15, aF2: .25, lN1: 1.35, lN2: -1.4, lF1: -.45, lF2: -1.15 }); } },
  hammer: { label: 'martelando', loop: true, fps: 6, n: 6, f(u) { const ph = u * TAU, s2 = Math.sin(ph), up = Math.max(0, s2); return P({ lean: .1 + .12 * (1 - up), head: .12, aN1: lerp(2.0, -.2, 1 - up) , aN2: lerp(-.3, .7, 1 - up), aF1: .5, aF2: .5, lN1: .3, lN2: -.2, lF1: -.35, lF2: -.1, y: -.01 * up }); } },
  sit: { label: 'sentado à mesa', loop: true, fps: 3, n: 4, f(u) { const b = Math.sin(u * TAU); return Object.assign({}, SIT, { y: SIT.y - b * .004, head: -.02 + b * .02 }); } },
  stand: { label: 'levantando', loop: false, fps: 8, n: 6, f(u) { const e = eo(u); const p = mix(SIT, IDLE0, e); p.lean += .18 * Math.sin(u * Math.PI); p.y -= .02 * Math.sin(u * Math.PI); return p; } },
  grab: { label: 'pegando o equipamento', loop: false, fps: 8, n: 6, f(u) { const r = u < .4 ? eo(u / .4) : u < .6 ? 1 : 1 - eo((u - .6) / .4); return mix(IDLE0, P({ lean: .1, head: .08, aN1: 1.45, aN2: .05, aF1: .1, aF2: .2, lN1: .1, lN2: -.1, lF1: -.1, lF2: .05 }), r); } },
};
// ---- back / front view (limbs symmetric; used for "seen from behind") -------------------------------------------
const BACK = {
  backIdle: { label: 'de costas parado', loop: true, fps: 3, n: 4, f(u) { const b = Math.sin(u * TAU); return { sway: b * .004, lift: 0, aL: .08 + b * .03, aR: .08 - b * .03, lgL: 0, lgR: 0, head: b * .02, point: 0 }; } },
  backWalk: { label: 'de costas andando', loop: true, fps: 8, n: 8, f(u) { const s = Math.sin(u * TAU); return { sway: s * .012, lift: Math.abs(Math.cos(u * TAU)) * .018, aL: .1 + s * .2, aR: .1 - s * .2, lgL: Math.max(0, s) * .06, lgR: Math.max(0, -s) * .06, head: 0, point: 0 }; } },
  backPoint: { label: 'de costas apontando', loop: false, fps: 6, n: 4, f(u) { const e = eo(u); return { sway: 0, lift: 0, aL: .08, aR: lerp(.08, 2.4, e), lgL: 0, lgR: 0, head: e * .05, point: e }; } },
};
const ALL = Object.assign({}, ANIMS, BACK);
const isBack = n => !!BACK[n];

// ---- crisp drawing helpers --------------------------------------------------------------------------------------
function line(ctx, x0, y0, x1, y1, w, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); ctx.fillStyle = col; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0; const o = Math.floor((w - 1) / 2);
  for (;;) { ctx.fillRect(x0 - o, y0 - o, w, w); if ((x0 === x1 && y0 === y1) || n++ > 600) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function polyFill(ctx, P, col) { ctx.fillStyle = col; let y0 = 1e9, y1 = -1e9; P.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const yy = y + .5, xs = []; for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } xs.sort((m, n) => m - n); for (let k = 0; k + 1 < xs.length; k += 2) ctx.fillRect(Math.round(xs[k]), y, Math.max(1, Math.round(xs[k + 1]) - Math.round(xs[k])), 1); } }
function disc(ctx, cx, cy, r, col) { ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy); for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y + .25)); ctx.fillRect(cx - w, cy + y, 2 * w + 1, 1); } }
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, '0')).join(''); };
const tones = base => ({ base, near: CFG.tones === 2 ? base : shade(base, .76), far: shade(base, CFG.tones === 2 ? .58 : .55), skin: '#e8c4a0', line: '#f2e2c4' });
// three-tone version: every pixel is base / −1 / −2 of the character's colour (used for sprites, which only have those 3 paint colours)
// four-step ramp of one colour for the close-up portraits: dark · mid · base · light
const tint = (hex, f) => { const n = parseInt(hex.slice(1), 16); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(v + (255 - v) * f), 0, 255).toString(16).padStart(2, '0')).join(''); };
const ramp4 = base => ({ base, near: shade(base, .62), far: shade(base, .32), light: tint(base, .58) });
const tonesOnly = base => { const t = tones(base); return Object.assign(t, { skin: t.near, eye: t.far, line: t.base, wpn: t.base, hair: t.far }); };
// each class starts with its own colour; the user can change it from the menu
const CLASSES = { mago: '#3a8ac0', arqueiro: '#7ab04e', clerigo: '#d8b43a', guerreiro: '#e08a3a', warrior: '#b83a2a', monstro: '#8a8a96' };
const mk = s => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };

// ---- renderers: two looks, like the reference sheet -----------------------------------------------------------
//  'line' : the thin stick-figure drawing (step 1 of the reference): 1–2 px dark-green lines, ring for the head
//  'body' : the same pose with flesh (step 2): rounded limbs that taper, torso, head with hair; each part in its own tone
const LINE = '#2f4a2f', ONION = '#4a7ad0', REFBG = '#7f9488', REFRED = '#c8503c';
function discAt(ctx, cx, cy, r) { cx = Math.round(cx); cy = Math.round(cy); if (r < .75) { ctx.fillRect(cx, cy, 1, 1); return; } const ri = Math.round(r); for (let y = -ri; y <= ri; y++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y) + .25)); ctx.fillRect(cx - w, cy + y, 2 * w + 1, 1); } }
function capsule(ctx, x0, y0, x1, y1, r0, r1, col) { ctx.fillStyle = col; const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6)); for (let i = 0; i <= n; i++) { const t = i / n; discAt(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t); } }
function ellipse(ctx, cx, cy, rx, ry, col) { ctx.fillStyle = col; for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) { const q = 1 - (y / (ry + .01)) ** 2; if (q < 0) continue; const w = Math.round(rx * Math.sqrt(q)); ctx.fillRect(Math.round(cx) - w, Math.round(cy) + y, 2 * w + 1, 1); } }
function ring(ctx, cx, cy, r, w, col) { ctx.fillStyle = col; const n = Math.max(12, Math.ceil(r * 8)); for (let k = 0; k < n; k++) { const a = k / n * TAU; ctx.fillRect(Math.round(cx + Math.cos(a) * r) - (w > 1 ? 0 : 0), Math.round(cy + Math.sin(a) * r), w, w); } }
const styleOf = o => (o.style === 'wire' || o.style === 'line') ? 'line' : 'body';
// where the weapon is kept: in the hand (default), at the waist, strapped across the back, or floating behind the shoulders. J = joints (figure units), returns [x0,y0,x1,y1] in figure units
function weaponSeg(J, o) {
  const m = o.mount || 'hand', bob = Math.sin((o.t || 0) * 3) * .012;
  if (m === 'waist') { const h = [J.hpN[0] - .01, J.hpN[1] + .01]; return [h[0], h[1], h[0] - .17, h[1] + .13]; }
  if (m === 'back') { const b = [J.pelvis[0] - .03, J.pelvis[1] - .03]; return [b[0], b[1], J.chest[0] - .15, J.neck[1] - .1]; }
  if (m === 'float') { const c = [J.chest[0] - .22, J.chest[1] + bob]; return [c[0], c[1] + .16, c[0], c[1] - .16]; }
  return [J.haN[0], J.haN[1], J.wpn[0], J.wpn[1]];
}
function renderSide(size, pose, o) {
  o = o || {}; const cv = o.canvas || mk(size), ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
  const M0 = o.model || CFG.model, J = solve(pose, M0), T = o.tones || tonesOnly('#5a8ad0'), dir = o.dir < 0 ? -1 : 1, fig = size * (o.fig || .82), cx = size * .5, S = size / 48, st = styleOf(o), kk = MODELS[M0].k;
  const lowest = Math.max(J.anN[1], J.anF[1], J.toN[1], J.toF[1]), oy = size * (o.ground || .95) - lowest * fig;
  const X = j => Math.round(cx + (j[0] - pose.x) * fig * dir), Y = j => Math.round(oy + j[1] * fig);
  if (st === 'line') {
    const col = o.mono || LINE, lw = size >= 40 ? 2 : 1, seg = (a, b) => line(ctx, X(a), Y(a), X(b), Y(b), lw, col), hr = Math.max(2.5, size * (M0 === 'A' ? .1 : .066));
    seg(J.shF, J.elF); seg(J.elF, J.haF); seg(J.hpF, J.knF); seg(J.knF, J.anF); seg(J.anF, J.toF);
    seg(J.pelvis, J.chest); seg(J.chest, J.neck); ring(ctx, X(J.head), Y(J.head), hr, lw, col);
    seg(J.hpN, J.knN); seg(J.knN, J.anN); seg(J.anN, J.toN); seg(J.shN, J.elN); seg(J.elN, J.haN);
    if (o.weapon) { const w = weaponSeg(J, o); line(ctx, X([w[0], w[1]]), Y([w[0], w[1]]), X([w[2], w[3]]), Y([w[2], w[3]]), lw, o.wcol || col); }
    return cv;
  }
  // slim medium-size body (about 6 heads tall): thin limbs, small head, hands and feet. Two builds: 'm' broader shoulders, 'f' narrow shoulders, waist and wider hips, long hair.
  const F = o.sex === 'f', Rr = F ? { ua: [1.15, .95], fa: [.95, .75], th: [2.1, 1.45], sh: [1.45, 1.0], ch: 2.7, wa: 1.9, hp: 3.2, nk: .95, hd: MODELS[M0].hd[1] } : { ua: [1.35, 1.05], fa: [1.05, .85], th: [2.1, 1.5], sh: [1.5, 1.05], ch: 3.4, wa: 2.8, hp: 3.0, nk: 1.15, hd: MODELS[M0].hd[0] };
  const cap = (a, b, r0, r1, col) => capsule(ctx, X(a), Y(a), X(b), Y(b), r0 * S * kk, r1 * S * kk, col), hair = o.hair != null ? o.hair | 0 : F ? 2 : 1;
  if (o.cape) { const cc = o.cape === true ? T.far : o.cape, sw = Math.sin((o.t || 0) * 3) * 1.5 * S; polyFill(ctx, [[X(J.chest), Y(J.chest) - 1], [X(J.chest) - dir * 3 * S, Y(J.chest) + 2], [X(J.pelvis) - dir * (12 * S + sw), Y(J.pelvis) + 16 * S], [X(J.pelvis) - dir * 1, Y(J.pelvis) + 16 * S]], cc); }
  cap(J.shF, J.elF, Rr.ua[0], Rr.ua[1], T.far); cap(J.elF, J.haF, Rr.fa[0], Rr.fa[1], T.far); ctx.fillStyle = T.far; discAt(ctx, X(J.haF), Y(J.haF), 1.0 * S);
  cap(J.hpF, J.knF, Rr.th[0], Rr.th[1], T.far); cap(J.knF, J.anF, Rr.sh[0], Rr.sh[1], T.far); cap(J.anF, J.toF, 1.0, .85, T.far);
  const mid = [(J.pelvis[0] + J.chest[0]) / 2, (J.pelvis[1] + J.chest[1]) / 2 - .004]; cap(J.chest, mid, Rr.ch, Rr.wa, T.base); cap(mid, J.pelvis, Rr.wa, Rr.hp, T.base);
  cap(J.chest, J.neck, Rr.nk, Rr.nk * .9, T.skin);
  const hx = X(J.head), hy = Y(J.head), rx = size * Rr.hd, ry = size * (Rr.hd + .012), hc = T.hair || T.far;
  if (hair !== 6) ellipse(ctx, hx - dir * rx * .55, hy - ry * .1, rx * (hair === 5 ? 1.2 : hair === 1 ? .75 : .95), ry * (hair === 5 ? 1.12 : hair === 1 ? .82 : .96), hc);   // hair mass behind
  if (hair === 2) capsule(ctx, hx - dir * rx * .75, hy, hx - dir * rx * .95, hy + size * .19, rx * .55, rx * .42, hc);                                       // long hair falls behind the shoulder
  if (hair === 7) capsule(ctx, hx - dir * rx * .9, hy - ry * .2, hx - dir * rx * 1.7, hy + size * .13, rx * .35, rx * .22, hc);
  if (hair === 3) discAt(ctx, hx - dir * rx * .3, hy - ry * 1.15, size * .05, hc); if (hair === 4) [-1, 0, 1].forEach(k => discAt(ctx, hx + k * rx * .55 - dir * rx * .25, hy - ry * 1.05, size * .03, hc));
  ellipse(ctx, hx + dir * rx * .08, hy + ry * .12, rx * .86, ry * .88, T.skin); if (hair !== 6) ellipse(ctx, hx - dir * rx * .05, hy - ry * .62, rx * 1.0, ry * .45, hc);   // face + fringe
  ctx.fillStyle = T.eye || '#1e1418'; ctx.fillRect(hx + dir * Math.round(rx * .5) - (dir < 0 ? 1 : 0), hy, 1, Math.max(1, Math.round(S * 1.4)));
  if (o.crown) { ctx.fillStyle = o.crown === true ? '#f0c860' : o.crown; const cy0 = Math.round(hy - ry * 1.15); ctx.fillRect(hx - Math.round(rx * .7), cy0, Math.round(rx * 1.5), Math.max(1, Math.round(S * 1.6))); [-.6, 0, .6].forEach(k => ctx.fillRect(hx + Math.round(k * rx) - 0, cy0 - Math.max(1, Math.round(S * 1.6)), 1, Math.max(1, Math.round(S * 1.6)))); }
  cap(J.hpN, J.knN, Rr.th[0] + .1, Rr.th[1] + .05, T.near); cap(J.knN, J.anN, Rr.sh[0] + .05, Rr.sh[1], T.near); cap(J.anN, J.toN, 1.1, .9, T.near);
  cap(J.shN, J.elN, Rr.ua[0] + .1, Rr.ua[1] + .05, T.near); cap(J.elN, J.haN, Rr.fa[0] + .05, Rr.fa[1], T.near); ctx.fillStyle = T.skin; discAt(ctx, X(J.haN), Y(J.haN), 1.1 * S);
  if (o.weapon) { const w = weaponSeg(J, o); ctx.fillStyle = T.wpn || '#d8d4e0'; line(ctx, X([w[0], w[1]]), Y([w[0], w[1]]), X([w[2], w[3]]), Y([w[2], w[3]]), Math.max(1, Math.round(1.2 * S)), T.wpn || '#d8d4e0'); }
  return cv;
}
function renderBack(size, p, o) {
  o = o || {}; const cv = o.canvas || mk(size), ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height); const BL = MODELS[o.model || CFG.model].bl, hk = (o.model || CFG.model) === 'A' ? 1.25 : 1, T = o.tones || tonesOnly('#5a8ad0'), fig = size * (o.fig || .82), S = size / 48, st = styleOf(o);
  const gy = size * (o.ground || .95), sw = size * .075, cx = size / 2 + p.sway * fig, hipY = gy - (BL.thigh + BL.shin) * fig * .98 - p.lift * fig, chY = hipY - BL.spine * fig, hdY = chY - (BL.neck + .085) * fig;
  const armPts = (sx, a) => { const xs = cx + sx * sw * .9, ex = xs + Math.sin(a * (sx > 0 ? 1 : -1)) * BL.uarm * fig, ey = chY + Math.cos(a) * BL.uarm * fig; return [[xs, chY], [ex, ey], [ex + Math.sin(a * (sx > 0 ? 1 : -1)) * BL.farm * fig * .9, ey + Math.cos(a) * BL.farm * fig * .9]]; };
  if (st === 'line') { const col = o.mono || LINE, lw = size >= 40 ? 2 : 1, hr = Math.max(2.5, size * .068); [-1, 1].forEach(sx => { const x = cx + sx * sw * .7, lift = sx < 0 ? p.lgL : p.lgR; line(ctx, x, hipY, x, gy - lift * fig, lw, col); const A = armPts(sx, sx < 0 ? p.aL : p.aR); line(ctx, A[0][0], A[0][1], A[1][0], A[1][1], lw, col); line(ctx, A[1][0], A[1][1], A[2][0], A[2][1], lw, col); }); line(ctx, cx, hipY, cx, chY, lw, col); line(ctx, cx - sw * .9, chY, cx + sw * .9, chY, lw, col); ring(ctx, cx + p.head * fig, hdY, hr, lw, col); return cv; }
  [-1, 1].forEach(sx => { const x = cx + sx * sw * .7, lift = sx < 0 ? p.lgL : p.lgR, c = sx < 0 ? T.far : T.near; capsule(ctx, x, hipY, x, gy - lift * fig, 2.1 * S, 1.2 * S, c); });
  const FB = o.sex === 'f'; capsule(ctx, cx, chY, cx, hipY, (FB ? 3.1 : 3.8) * S, (FB ? 3.4 : 3.0) * S, T.base); capsule(ctx, cx - sw * (FB ? .75 : .95), chY + 1, cx + sw * (FB ? .75 : .95), chY + 1, 1.5 * S, 1.5 * S, T.base);
  [-1, 1].forEach(sx => { const A = armPts(sx, sx < 0 ? p.aL : p.aR), c = sx < 0 ? T.far : T.near; capsule(ctx, A[0][0], A[0][1], A[1][0], A[1][1], 1.3 * S, 1.05 * S, c); capsule(ctx, A[1][0], A[1][1], A[2][0], A[2][1], 1.05 * S, .85 * S, c); });
  ellipse(ctx, cx + p.head * fig, hdY, size * .074 * hk, size * .083 * hk, T.hair || T.far); if (FB || o.hair === 2) capsule(ctx, cx + p.head * fig, hdY + size * .04, cx + p.head * fig, hdY + size * .2, size * .062, size * .045, T.hair || T.far); return cv;
}
// pose of an animation at progress u (loops: any u; one-shots: clamped 0..1)
function poseAt(name, u) { const a = ALL[name] || ANIMS.idle; return a.f(a.loop ? ((u % 1) + 1) % 1 : clamp(u, 0, 1)); }
function render(name, u, size, o) { o = Object.assign({ anim: name }, o); return isBack(name) ? renderBack(size, poseAt(name, u), o) : renderSide(size, poseAt(name, u), o); }
// joint positions in pixel coordinates (same maths as renderSide): used to carry a manual edit from one frame to the next through the skeleton
function joints(name, u, size, o) {
  o = o || {}; if (isBack(name)) return null; const pose = poseAt(name, u), J = solve(pose, o.model || CFG.model), fig = size * (o.fig || .82), cx = size * .5, lowest = Math.max(J.anN[1], J.anF[1], J.toN[1], J.toF[1]), oy = size * (o.ground || .95) - lowest * fig, out = {};
  for (const k in J) { const j = J[k]; if (Array.isArray(j) && j.length >= 2 && typeof j[0] === 'number') out[k] = [cx + (j[0] - pose.x) * fig, oy + j[1] * fig]; } return out;
}
// previous frame in blue under the current one (the reference's onion skin) — line look
function renderOnion(name, u, size, o) { const A = ALL[name], step = 1 / (A.loop ? A.n : Math.max(1, A.n - 1)), cv = mk(size); const x = cv.getContext('2d'); if (A.loop || u > 0) x.drawImage(render(name, u - step, size, Object.assign({}, o, { style: 'line', mono: ONION })), 0, 0); x.drawImage(render(name, u, size, Object.assign({}, o, { style: 'line' })), 0, 0); return cv; }
// sheet of N frames of one animation (for the PNG reference sheet people draw over)
function sheet(name, size, o) { o = o || {}; const a = ALL[name], n = a.n, cv = document.createElement('canvas'); cv.width = size * n; cv.height = size; const ctx = cv.getContext('2d'); if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, cv.width, cv.height); } for (let i = 0; i < n; i++) { const u = a.loop ? i / n : i / Math.max(1, n - 1), f = o.onion && styleOf(o) === 'line' ? renderOnion(name, u, size, o) : render(name, u, size, o); ctx.drawImage(f, i * size, 0); if (o.frame) { ctx.fillStyle = REFRED; ctx.fillRect(i * size, 0, size, 1); ctx.fillRect(i * size, size - 1, size, 1); ctx.fillRect(i * size, 0, 1, size); ctx.fillRect(i * size + size - 1, 0, 1, size); } } return cv; }

// ---- parts compositor (drawn parts follow the bones) ------------------------------------------------------------
// parts: { name: { w, h, px: [palette index | -1 | 16 base | 17 near | 18 far] } }
const PART_DEF = [
  ['shF', 'uarmF', 'elF', 'braço de lá (cima)', 4, 9, 2, 1, 'far'], ['elF', 'farmF', 'haF', 'braço de lá (baixo)', 4, 9, 2, 1, 'far'],
  ['hpF', 'thighF', 'knF', 'coxa de lá', 5, 11, 2, 1, 'far'], ['knF', 'shinF', 'anF', 'perna de lá (baixo + pé)', 7, 11, 2, 1, 'far'],
  ['chest', 'torso', 'pelvis', 'tronco', 10, 16, 5, 2, 'base'], ['head', 'head', 'chest', 'cabeça', 11, 11, 5, 5, 'base'],
  ['hpN', 'thighN', 'knN', 'coxa de cá', 5, 11, 2, 1, 'near'], ['knN', 'shinN', 'anN', 'perna de cá (baixo + pé)', 7, 11, 2, 1, 'near'],
  ['shN', 'uarmN', 'elN', 'braço de cá (cima)', 4, 9, 2, 1, 'near'], ['elN', 'farmN', 'haN', 'braço de cá (baixo)', 4, 9, 2, 1, 'near'],
  ['haN', 'weapon', 'wpn', 'arma', 3, 15, 1, 2, 'base'],
];
function defaultParts() {
  const parts = {}, tn = { base: 16, near: 17, far: 18 };
  const tapered = (w, h, r0, r1, fill, edge) => { const px = Array(w * h).fill(-1); for (let y = 0; y < h; y++) { const r = r0 + (r1 - r0) * y / (h - 1), c = (w - 1) / 2; for (let x = 0; x < w; x++) { const d = Math.abs(x - c); if (d <= r) px[y * w + x] = edge != null && (d > r - 1 || y === h - 1) ? edge : fill; } } return { w, h, px }; };
  PART_DEF.forEach(([a, key, b, label, w, h, , , tone]) => {
    const f = tn[tone];
    if (key === 'head') { const px = Array(w * h).fill(-1), cx = 7, cy = 7; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = ((x - 5 + .5) / 5.2) ** 2 + ((y - 5 + .5) / 5.4) ** 2; if (d <= 1) px[y * w + x] = (y < 3 || (x < 3 && y < 8)) ? 18 : 17; } px[4 * w + 7] = 18; px[7 * w + 7] = 18; parts[key] = { w, h, px }; }
    else if (key === 'torso') { const px = Array(w * h).fill(-1); for (let y = 0; y < h; y++) { const hw = y < 3 ? 4 + y * .25 : y < 9 ? 4.4 - (y - 3) * .3 : 2.8 + (y - 9) * .35; for (let x = 0; x < w; x++) if (Math.abs(x - 4.5) <= hw) px[y * w + x] = Math.abs(x - 4.5) > hw - 1 ? 18 : 16; } parts[key] = { w, h, px }; }
    else if (key === 'weapon') { const px = Array(w * h).fill(-1); for (let y = 2; y < h; y++) px[y * w + 1] = 16; px[3 * w + 0] = 18; px[3 * w + 2] = 18; px[2 * w + 1] = 18; parts[key] = { w, h, px }; }
    else if (key.startsWith('thigh')) parts[key] = tapered(w, h, 2.1, 1.5, f, tone === 'far' ? null : 18);
    else if (key.startsWith('shin')) { const t = tapered(w, h, 1.5, 1.1, f, tone === 'far' ? null : 18); for (let x = 2; x < 6; x++) t.px[(h - 2) * w + x] = f; for (let x = 2; x < 7; x++) t.px[(h - 1) * w + x] = tone === 'far' ? f : 18; parts[key] = t; }
    else parts[key] = tapered(w, h, 1.6, 1.1, f, tone === 'far' ? null : 18);
  });
  return parts;
}
function renderParts(size, pose, parts, o) {
  o = o || {}; const T = o.tones || tones('#5a8ad0'), pal = o.palette, cv = o.canvas || mk(size), ctx = cv.getContext('2d'); ctx.clearRect(0, 0, size, size);
  const J = solve(pose), fig = size * (o.fig || .82), lowest = Math.max(J.anN[1], J.anF[1], J.toN[1], J.toF[1]), oy = size * (o.ground || .95) - lowest * fig, cx = size * .5;
  const X = j => cx + (j[0] - pose.x) * fig, Y = j => oy + j[1] * fig, cache = renderParts._c || (renderParts._c = new Map());
  const colOf = i => i === 16 ? T.base : i === 17 ? T.near : i === 18 ? T.far : pal[i];
  const canvasOf = part => { const key = part.w + 'x' + part.h + ':' + part.px.join('') + T.base; let c = cache.get(key); if (!c) { c = mk(Math.max(part.w, part.h)); c.width = part.w; c.height = part.h; const x = c.getContext('2d'); for (let yy = 0; yy < part.h; yy++) for (let xx = 0; xx < part.w; xx++) { const i = part.px[yy * part.w + xx]; if (i >= 0) { x.fillStyle = colOf(i); x.fillRect(xx, yy, 1, 1); } } cache.set(key, c); if (cache.size > 300) cache.delete(cache.keys().next().value); } return c; };
  ctx.imageSmoothingEnabled = false;
  PART_DEF.forEach(([a, key, b, , , , pxv, pyv]) => { const part = parts[key]; if (!part) return; const A = J[a], B = J[b]; if (!A || !B) return; const phi = Math.atan2(B[0] - A[0], B[1] - A[1]);
    ctx.save(); ctx.translate(Math.round(X(A)), Math.round(Y(A))); ctx.rotate(key === 'head' ? -(pose.lean * .0 + pose.head) : -phi + (key === 'torso' ? 0 : 0)); ctx.translate(-pxv, -pyv); ctx.drawImage(canvasOf(part), 0, 0); ctx.restore(); });
  if (o.dir < 0) { const f = mk(size), fx = f.getContext('2d'); fx.translate(size, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0); ctx.clearRect(0, 0, size, size); ctx.drawImage(f, 0, 0); }
  return cv;
}

// ---- tiny 15×15 sprites: the size every character has when facing a (huge) boss. Hooded / cloaked chunky silhouettes in 3 tones;
//      only the drawing changes per class. Built from rectangles so the pixels stay clean. Frames per animation: idle 2 · walk 2 · attack 4 · cast 2 · hurt 1 · dead 1.
const TINY = { idle: 2, walk: 2, attack: 4, cast: 2, hurt: 1, dead: 1 };
const TINYL = { idle: 'parado', walk: 'andando', attack: 'ataque', cast: 'magia', hurt: 'ferido', dead: 'derrotado' };
function tinyPx(cls, anim, fi) {
  const W = 15, px = Array(W * W).fill(-1), B = 16, N = 17, F = 18, set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < W) px[y * W + x] = c; }, rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  fi = fi || 0;
  if (cls === 'monstro') {                                                         // slime blob: squashes and stretches
    const sq = anim === 'idle' || anim === 'walk' ? fi % 2 : anim === 'attack' ? [0, 2, 2, 1][fi % 4] : 0, hh = 7 - (sq === 1 ? 1 : 0) + (sq === 2 ? 1 : 0), w = 11 + (sq === 1 ? 2 : 0) - (sq === 2 ? 2 : 0), x0 = 7 - Math.floor(w / 2), yt = 14 - hh;
    if (anim === 'dead') { rect(2, 12, 11, 2, B); rect(4, 11, 7, 1, N); return { w: W, h: W, px }; }
    for (let y = 0; y < hh; y++) { const inset = y === 0 ? 3 : y === 1 ? 1 : 0; rect(x0 + inset, yt + y, w - inset * 2, 1, y === hh - 1 ? F : B); set(x0 + inset, yt + y, F); set(x0 + w - inset - 1, yt + y, N); }
    set(x0 + w - 5, yt + 2, F); set(x0 + 3, yt + 2, F); set(x0 + 3, yt + 3, N); return { w: W, h: W, px };
  }
  let bob = 0, lunge = 0, step = 0, hurt = 0; const sw = anim === 'attack' ? fi % 4 : -1, cast = anim === 'cast' ? 1 + (fi % 2) : 0;
  if (anim === 'idle') bob = fi % 2; else if (anim === 'walk') { bob = fi % 2; step = fi % 2 ? 1 : -1; } else if (anim === 'attack') lunge = [0, 2, 3, 1][sw]; else if (anim === 'hurt') hurt = 1;
  if (anim === 'dead') { rect(3, 12, 9, 2, B); rect(2, 11, 3, 3, N); set(3, 12, F); rect(11, 12, 2, 2, F); rect(5, 13, 6, 1, F); return { w: W, h: W, px }; }
  const ox = lunge - hurt, ty = 7 + bob, h0 = 3 + bob;
  rect(6 + ox, 12, 2, step < 0 ? 2 : 3, F); rect(9 + ox, 12, 2, step > 0 ? 2 : 3, N);                                 // legs
  for (let y = ty; y <= 11; y++) { const k = y - ty, w = 5 + Math.min(2, k), x0 = 8 - Math.floor(w / 2) + ox; rect(x0, y, w, 1, B); set(x0, y, F); set(x0 + w - 1, y, N); }   // cloak
  rect(5 + ox, 11, 7, 1, F);
  rect(6 + ox, h0, 3, 1, B); rect(5 + ox, h0 + 1, 5, 1, B); rect(5 + ox, h0 + 2, 5, 1, B); rect(5 + ox, h0 + 3, 5, 1, B); rect(7 + ox, h0 + 2, 3, 2, N); set(9 + ox, h0 + 2, F); set(5 + ox, h0 + 3, F);   // hood + face
  if (cls === 'mago') { rect(7 + ox, h0 - 3, 1, 1, N); rect(6 + ox, h0 - 2, 3, 1, B); rect(5 + ox, h0 - 1, 5, 1, B); rect(4 + ox, h0, 7, 1, F); set(6 + ox, h0 - 1, F); }
  else if (cls === 'arqueiro') { set(5 + ox, h0 - 1, F); set(4 + ox, h0 - 2, N); set(6 + ox, h0, F); }
  else if (cls === 'clerigo') { set(6 + ox, h0 - 1, N); set(8 + ox, h0 - 1, N); set(7 + ox, h0 - 2, N); }
  else { rect(5 + ox, h0, 5, 2, F); set(7 + ox, h0 - 1, N); set(8 + ox, h0 + 2, N); }
  set(11 + ox, ty + 2, N);                                                                                              // near hand
  if (cls === 'mago') {
    const up = cast || (sw === 0 || sw === 1);
    rect(12 + ox, up ? 3 : 4, 1, up ? 10 : 9, F); rect(11 + ox, up ? 1 : 2, 3, up ? 2 : 2, N); set(12 + ox, up ? 1 : 2, B);
    if (cast === 2 || sw === 1) { set(10 + ox, 2, N); set(14, 2, N); set(12 + ox, 0, N); set(14, 5, B); }
  } else if (cls === 'arqueiro') {
    [[12, 6], [13, 7], [13, 8], [13, 9], [13, 10], [12, 11]].forEach(([x, y]) => set(x + ox, y, F)); rect(12 + ox, 7, 1, 4, N);
    if (sw === 1 || sw === 2) rect(10 + ox + (sw - 1) * 2, 9, 4, 1, B), set(14, 9, N);
  } else if (cls === 'clerigo') {
    rect(12 + ox, 5, 1, 9, F); rect(11 + ox, 3, 3, 1, N); rect(12 + ox, 2, 1, 3, N);
    if (cast || sw === 1 || sw === 2) { set(10 + ox, 1, B); set(14, 1, B); set(14, 4, N); set(10 + ox, 5, N); }
  } else {
    if (sw === 0) rect(11 + ox, 2, 1, 5, N); else if (sw === 1) rect(11 + ox, 9, 4, 1, N); else if (sw === 2) { rect(13, 10, 1, 4, N); set(12, 9, N); } else rect(12 + ox, 6, 1, 5, N);
    rect(11 + ox, 11, 3, 1, F); set(12 + ox, 12, F); rect(4 + ox, 8, 2, 3, F); set(4 + ox, 8, N);
  }
  return { w: W, h: W, px };
}
function tiny(cls, anim, u, base, o) {
  o = o || {}; const n = TINY[anim] || 1, fi = anim === 'idle' || anim === 'walk' ? Math.floor(u * 2) % 2 : Math.min(n - 1, Math.floor(clamp(u, 0, .999) * n)), img = tinyPx(cls, anim, fi), T = tonesOnly(base), cv = mk(15), x = cv.getContext('2d');
  for (let k = 0; k < img.px.length; k++) { const i = img.px[k]; if (i < 0) continue; x.fillStyle = i === 16 ? T.base : i === 17 ? T.near : T.far; x.fillRect(k % 15, Math.floor(k / 15), 1, 1); }
  if (o.dir < 0) { const f = mk(15), fx = f.getContext('2d'); fx.translate(15, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0); return f; } return cv;
}
// faint mirrored copy below the feet (wet-floor look of the reference sheet)
function reflect(ctx, cv, x, y, a) { ctx.save(); ctx.globalAlpha = a == null ? .22 : a; ctx.translate(Math.round(x), Math.round(y) + cv.height); ctx.scale(1, -1); ctx.drawImage(cv, 0, 0); ctx.restore(); }
G.RIG = { joints, CFG, MODELS, ramp4, tint, TINY, TINYL, tinyPx, tiny, reflect, renderOnion, REFBG, REFRED, LINE, ONION, capsule, tonesOnly, CLASSES, solve, ANIMS, BACK, ALL, isBack, poseAt, render, renderSide, renderBack, sheet, renderParts, defaultParts, PART_DEF, tones, shade, BL, line, disc };
})(window);
