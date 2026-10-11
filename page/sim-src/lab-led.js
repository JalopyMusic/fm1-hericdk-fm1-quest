// FM1 Quest — LED effects for the simulator (idle effect + key-press effect + a frame editor).
// The LEDs have 3 brightness levels (off / dim / full); whether they can change colour is unknown until measured on the device, so everything here is single-colour.
(function (G) {
'use strict';
const SIM = G.SIM; if (!SIM) return;
const A = SIM.api, sim = SIM.sim, host = A.host;
const BGAP = [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14], KEYPC = G.Screens.KEYPCS;
const BX = { fx: 8.84, sel: 9.95, env: 11.05, lfo: 12.16, edit: 13.25, glo: 14.39, home: 8.84, save: 9.95, arp: 11.05, seq: 12.16, play: 13.25, rec: 14.39 };   // button x in key units (from the photo)
const BIDS = Object.keys(BX);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const q3 = a => a > .5 ? 2 : a > .22 ? 1 : 0;
const cfg = { idle: 'none', press: 'ripple', speed: 1, max: 2, gain: 1, fade: .6, screenFx: true, rgb: false };   // the LEDs are all the same yellow: only brightness and blinking carry meaning
try { Object.assign(cfg, JSON.parse(localStorage.getItem('fm1lab.ledcfg') || '{}')); } catch (e) {} cfg.rgb = false;
const save = () => { try { localStorage.setItem('fm1lab.ledcfg', JSON.stringify(cfg)); localStorage.setItem('fm1lab.ledcustom', JSON.stringify(cust)); } catch (e) {} };

// ---- custom frames (editor) -------------------------------------------------------------------------------
const blank = () => ({ w: Array(16).fill(0), b: Array(11).fill(0), btn: {} });
let cust = { ms: 220, frames: [] };
try { const c = JSON.parse(localStorage.getItem('fm1lab.ledcustom') || 'null'); if (c && c.frames && c.frames.length) cust = c; } catch (e) {}
if (!cust.frames.length) { for (let f = 0; f < 6; f++) { const fr = blank(); for (let i = 0; i < 16; i++) { const d = Math.abs(i - (7.5 + (f < 3 ? -f : f - 5) * 0 )); fr.w[i] = d < f + .6 ? (d > f - .6 ? 2 : 1) : 0; } cust.frames.push(fr); } }
let cur = 0;

// ---- resting effects ---------------------------------------------------------------------------------------
const IDLE = {
  none: { name: 'só a escala', desc: 'Sem animação: só o guia da escala (fraco = nota da escala, forte = raiz).', f: () => null },
  chase: { name: 'varredura', desc: 'Um ponto de luz vai e volta pelas teclas, como um scanner.', f(c, o) { const u = (c.t * c.sp * .7) % 2, p = (u < 1 ? u : 2 - u) * 15; for (let i = 0; i < 16; i++) { const d = Math.abs(i - p); o.W(i, d < .7 ? 2 : d < 1.8 ? 1 : 0); } BGAP.forEach((g, j) => { const d = Math.abs(g + .5 - p); o.B(j, d < .7 ? 2 : d < 1.6 ? 1 : 0); }); } },
  breathe: { name: 'respirar', desc: 'As teclas brancas e as de cima respiram em fases opostas (3 níveis).', f(c, o) { const v = (Math.sin(c.t * c.sp * 1.4) + 1) / 2, lv = x => x > .66 ? 2 : x > .33 ? 1 : 0; for (let i = 0; i < 16; i++) o.W(i, lv(v) > 1 ? 1 : lv(v)); for (let j = 0; j < 11; j++) o.B(j, lv(1 - v) > 1 ? 1 : lv(1 - v)); } },
  sparkle: { name: 'faíscas', desc: 'Pontinhos acendem ao acaso, como estrelas.', f(c, o) { const k = Math.floor(c.t * c.sp * 4); for (let i = 0; i < 16; i++) { const h = hash(k + i * 17); o.W(i, h > .95 ? 2 : h > .88 ? 1 : 0); } for (let j = 0; j < 11; j++) { const h = hash(k + j * 29 + 300); o.B(j, h > .95 ? 2 : h > .9 ? 1 : 0); } } },
  beat: { name: 'pulso do beat', desc: 'No andamento da música: a raiz pisca a cada batida e o compasso novo acende tudo.', f(c, o) { if (!c.playing) return; const bf = c.beat - Math.floor(c.beat), bar = Math.floor(c.beat) % 4 === 0, l = bf < .12 ? 2 : bf < .3 ? 1 : 0; for (let i = 0; i < 16; i++) { const root = KEYPC[i] === c.root; o.W(i, root ? l : bar ? Math.min(l, 1) : 0); } } },
  loop: { name: 'barra do loop', desc: 'Uma barra enche da esquerda para a direita conforme o loop avança; na gravação todas as teclas ficam acesas atrás da cabeça.', f(c, o) { const len = (c.rec && c.rec.bars ? c.rec.bars : 1) * 16; if (!c.playing && c.rec.state !== 'rec') return; const pos = (((c.step % len) + len) % len) / len * 16; for (let i = 0; i < 16; i++) o.W(i, i < Math.floor(pos) ? 1 : i === Math.floor(pos) ? 2 : 0); BGAP.forEach((g, j) => o.B(j, g + 1 <= pos ? 1 : 0)); } },
  wave: { name: 'onda', desc: 'Uma onda de luz rola pelas teclas.', f(c, o) { for (let i = 0; i < 16; i++) { const s = Math.sin(i * .7 - c.t * c.sp * 3); o.W(i, s > .5 ? 2 : s > -.1 ? 1 : 0); } BGAP.forEach((g, j) => { const s = Math.sin((g + .5) * .7 - c.t * c.sp * 3); o.B(j, s > .55 ? 2 : s > 0 ? 1 : 0); }); } },
  rain: { name: 'gotas', desc: 'A luz "cai" das teclas de cima para as de baixo, cada coluna no seu tempo.', f(c, o) { BGAP.forEach((g, j) => { const p = (c.t * c.sp * 1.6 + hash(g) * 5) % 5; o.B(j, p < .6 ? 2 : p < 1.2 ? 1 : 0); }); for (let i = 0; i < 16; i++) { const p = (c.t * c.sp * 1.6 + hash(i) * 5) % 5; o.W(i, p >= 1 && p < 1.7 ? 2 : p >= 1.7 && p < 2.6 ? 1 : 0); } } },
  scalewalk: { name: 'caminho da escala', desc: 'Acende, uma por vez, as notas da escala atual a partir da raiz: ensina a escala (FM School).', f(c, o) { const k = Math.floor(c.t * c.sp * 1.5) % c.scl.length, pc = (c.root + c.scl[k]) % 12; for (let i = 0; i < 16; i++) if (KEYPC[i] === pc) o.W(i, 2); BGAP.forEach((g, j) => { if ((KEYPC[g] + 1) % 12 === pc) o.B(j, 2); }); } },
  stage: { name: 'palco', desc: 'Modo Stage do Piano M: as teclas ficam fracas e brilham de leve, como numa casa de show; ao tocar, a tecla acende forte.', f(c, o) { for (let i = 0; i < 16; i++) o.W(i, .35 + .25 * Math.sin(c.t * c.sp * 1.3 + i * .7)); BGAP.forEach((g, j) => o.B(j, .3 + .25 * Math.sin(c.t * c.sp * 1.3 + g * .7 + 2))); } },
  pro: { name: 'raiz e escala', desc: 'Modo Pro do Piano M: a raiz da escala acende forte e as outras notas da escala ficam fracas, mesmo sem tocar.', f(c, o) { for (let i = 0; i < 16; i++) { const rel = ((KEYPC[i] - c.root) % 12 + 12) % 12; o.W(i, rel === 0 ? 2 : c.scl.includes(rel) ? .8 : 0); } BGAP.forEach((g, j) => { const rel = (((KEYPC[g] + 1) - c.root) % 12 + 12) % 12; o.B(j, rel === 0 ? 2 : c.scl.includes(rel) ? .8 : 0); }); } },
  cascade: { name: 'cascata', desc: 'Modo Cascade do Piano M: as notas "caem" de cima: a tecla de cima avisa e, um instante depois, a tecla de baixo acende forte e apaga devagar. Ensina a melodia da escala.', f(c, o) { const n = c.scl.length, k0 = Math.floor(c.t * c.sp * 1.6), ph = c.t * c.sp * 1.6 - k0, d = (k0 % (n * 2 - 2)), deg = d < n ? d : n * 2 - 2 - d, pc = (c.root + c.scl[deg]) % 12; let wi = -1; for (let i = 4; i < 12; i++) if (KEYPC[i] === pc) { wi = i; break; } if (wi < 0) for (let i = 0; i < 16; i++) if (KEYPC[i] === pc) { wi = i; break; } if (wi < 0) return; const bj = BGAP.findIndex(g => g >= wi - 1 && g <= wi); if (bj >= 0) o.B(bj, (1 - ph) * 1.4); o.W(wi, ph < .45 ? .5 : 2 * (1 - (ph - .45) / .55 * .7)); } },
  gradient: { name: 'gradiente rolante', desc: 'Faixas de luz que sobem e descem suavemente pelas teclas (como o arco-íris do Piano M, só que em uma cor: o que muda é o brilho).', f(c, o) { for (let i = 0; i < 16; i++) o.W(i, (Math.sin(i * .5 - c.t * c.sp * 2.2) + 1)); BGAP.forEach((g, j) => o.B(j, (Math.sin((g + .5) * .5 - c.t * c.sp * 2.2 + .6) + 1) * .8)); } },
  pulse: { name: 'pulso de conexão', desc: 'Um anel de luz abre do meio para as pontas, de tempos em tempos: a animação que o Piano M faz quando conecta.', f(c, o) { const r = ((c.t * c.sp * 6) % 16), L = d => Math.exp(-Math.pow(d - r, 2) / 1.6) * 2; for (let i = 0; i < 16; i++) o.W(i, L(Math.abs(i - 7.5))); BGAP.forEach((g, j) => o.B(j, L(Math.abs(g + .5 - 7.5)) * .9)); } },
  stars: { name: 'estrelas', desc: 'Pontinhos que brilham e apagam devagar, cada um no seu tempo, como o céu.', f(c, o) { const tw = (id, x) => { const h = hash(id * 3.7), a = Math.sin(c.t * c.sp * (.8 + h * 1.6) + h * 40); return h > .45 ? Math.max(0, a) ** 6 * 2 : 0; }; for (let i = 0; i < 16; i++) o.W(i, tw(i)); for (let j = 0; j < 11; j++) o.B(j, tw(j + 50)); } },
  comet: { name: 'cometa', desc: 'Uma cabeça de luz com cauda longa vai e volta pelas teclas.', f(c, o) { const u = (c.t * c.sp * .6) % 2, head = (u < 1 ? u : 2 - u) * 16.5 - .5, dir = u < 1 ? 1 : -1, tail = x => { const d = (head - x) * dir; return d >= -.4 ? Math.exp(-Math.max(0, d) / 2.4) * 2 : 0; }; for (let i = 0; i < 16; i++) o.W(i, tail(i)); BGAP.forEach((g, j) => o.B(j, tail(g + .5) * .8)); } },
  split: { name: 'duas metades', desc: 'A metade esquerda e a direita respiram uma de cada vez, como o som indo de um lado para o outro (estéreo).', f(c, o) { const v = (Math.sin(c.t * c.sp * 1.6) + 1) / 2; for (let i = 0; i < 16; i++) o.W(i, (i < 8 ? v : 1 - v) * 1.8 + .1); BGAP.forEach((g, j) => o.B(j, (g < 8 ? v : 1 - v) * 1.4)); } },
  custom: { name: 'meu efeito (editor)', desc: 'Os quadros que você desenha no editor abaixo.', f(c, o) { const fr = cust.frames[Math.floor(c.now / cust.ms) % cust.frames.length]; for (let i = 0; i < 16; i++) o.W(i, fr.w[i]); for (let j = 0; j < 11; j++) o.B(j, fr.b[j]); } },
};
// ---- effects when a key is played -------------------------------------------------------------------------
const PRESS = {
  none: { name: 'nenhum', desc: 'A tecla só acende enquanto está apertada.' },
  ripple: { name: 'poça (onda)', desc: 'Uma onda se espalha a partir da tecla pelas outras teclas (os botões não acendem).' },
  echo: { name: 'eco da poça', desc: 'A onda volta duas vezes, cada vez mais fraca.' },
  trail: { name: 'rastro', desc: 'A tecla fica acesa e vai apagando em 3 passos.' },
  burst: { name: 'explosão', desc: 'Um anel de luz abre a partir da tecla.' },
  beam: { name: 'raio', desc: 'A luz corre da tecla até as duas pontas.' },
  flash: { name: 'clarão', desc: 'Todas as teclas brancas piscam fraco por um instante.' },
  stage: { name: 'palco (pisca)', desc: 'Modo Stage do Piano M: a tecla toca piscando duas ou três vezes e apaga devagar.' },
  glow: { name: 'brilho que apaga', desc: 'A tecla acende forte e apaga bem devagar, sem corte.' },
  comet: { name: 'cometas', desc: 'Dois cometas saem da tecla, um para cada lado, deixando cauda.' },
  chord: { name: 'acorde', desc: 'Tocando uma tecla, acendem as teclas do acorde dela dentro da escala (1ª, 3ª e 5ª): o ouvido e a luz aprendem juntos.' },
  pluck: { name: 'corda', desc: 'As teclas vizinhas tremem e acalmam, como uma corda dedilhada.' },
};
pressLevel.ctx = { root: 0, scl: [0, 2, 4, 5, 7, 9, 11] };
function pressLevel(kind, rip, now, x, isKey) {
  let l = 0;
  for (const r of rip) {
    const age = (now - r.t) / 1000, d = Math.abs(x - r.x);
    switch (kind) {
      case 'ripple': l = Math.max(l, Math.min(2, Math.exp(-Math.pow(d - 11 * age, 2) / 1.7) * Math.exp(-age * 1.9) * r.a * 2.6)); break;
      case 'echo': for (let k = 0; k < 3; k++) { const a = age - k * .38; if (a > 0) l = Math.max(l, Math.min(2, Math.exp(-Math.pow(d - 11 * a, 2) / 1.7) * Math.exp(-a * 2.2) * r.a * (1 - k * .28) * 2.6)); } break;
      case 'trail': if (isKey && d < .01) l = Math.max(l, age < .3 ? 2 : age < 1.1 ? 1 : 0); break;
      case 'burst': if (age < .5) { const rad = age * 14; if (d <= rad && d > rad - 2.2) l = Math.max(l, d < .6 ? 2 : 1); } break;
      case 'beam': if (age < .8) { const f = age * 22; if (d < f) l = Math.max(l, f - d < 2.4 ? 2 : age < .4 ? 1 : 0); } break;
      case 'flash': if (isKey && age < .14) l = Math.max(l, 1); break;
      case 'stage': if (isKey && d < .01 && age < 1.2) l = Math.max(l, 2 * Math.abs(Math.sin(age * 13)) * Math.exp(-age * 2)); break;
      case 'glow': if (isKey && d < .01) l = Math.max(l, 2 * Math.exp(-age * 1.3)); break;
      case 'comet': if (age < 1.3) { const h = age * 13; [-1, 1].forEach(sg => { const dd = (h - d * sg * (x >= r.x ? 1 : -1) * 0) ; const dist = h - Math.abs(x - r.x); if ((x - r.x) * sg > -.01 && dist >= -.4) l = Math.max(l, Math.exp(-Math.max(0, dist) / 2.2) * 2 * (1 - age / 1.4)); }); } break;
      case 'chord': if (isKey && age < 1.8) { const P = pressLevel.ctx, pk = KEYPC[Math.round(r.x)] === undefined ? 0 : KEYPC[Math.round(r.x)], rel = ((KEYPC[Math.round(x)] - pk) % 12 + 12) % 12, tone = [0, 3, 4, 7].includes(rel) && (P.scl.includes(((pk - P.root) % 12 + 12) % 12 + rel - (((pk - P.root) % 12 + 12) % 12)) || true); if (tone && x !== r.x) l = Math.max(l, 1.3 * Math.exp(-age * 1.2)); else if (x === r.x) l = Math.max(l, 2 * Math.exp(-age * .9)); } break;
      case 'pluck': if (isKey && d > 0 && d < 3.1 && age < 1.1) l = Math.max(l, (2 - d * .5) * Math.exp(-age * 3) * (.5 + .5 * Math.abs(Math.sin(age * 22 + d)))); else if (isKey && d < .01 && age < 1.1) l = Math.max(l, 2 * Math.exp(-age * 1.5)); break;
    }
  }
  return Math.min(2, l);
}

// ---- screen-linked effects: Spells, Alchemy, Chisel/Armory drive the LEDs (and their colours) with what the screen shows ------------
const E = G.Engine, fr = v => v - Math.floor(v), clampv = (v, a, b2) => Math.max(a, Math.min(b2, v));
const SPELLC = ['#5a8ad0', '#5a8ad0', '#5a8ad0', '#5a8ad0', '#e0503c', '#b46ad0', '#8a8a96', '#d8b43a', '#3a62c0', '#7ad0e0', '#7ab04e', '#e08a3a', '#d86a8a', '#f2e2c4', '#5ab0a0', '#c8503c'];
const DSTC = ['#7ab04e', '#5a8ad0', '#e08a3a', '#b46ad0'];            // alchemy destination: pitch · filter · amp · pan
let spellA = -2, spellT0 = 0, fitPrev = '', fitT = -9, alchPrev = '', alchT = -9, armPrev = -1, armT = -9, spark = { t: -9, x: 8 };
const busy = c => c.playing || c.rec.state !== 'off';
const SCR = {
  punch(c, o) {                                                   // Spells: every key shows its spell colour; the active one plays its pattern over the whole row
    const a = c.punch, t = c.t;
    if (a !== spellA) { spellA = a; spellT0 = t; } if (a < 0) return;
    const col = SPELLC[a], hz = c.bpm / 60, age = t - spellT0;
    const P = [
      x => Math.floor(x / 4) === Math.floor(fr(t * hz / [1, 2, 4, 8][a]) * 4) ? 2 : 1,                      // loop: a dot walks along 4 keys
      null, null, null,
      x => Math.floor(t * 12) % 2 ? 2 : 0,                                                                  // stutter: strobe
      x => { const d = ((15 - x) - (t * 14) % 22); return d > -3 && d < 0 ? 2 : d >= 0 && d < 3 ? 1 : 0; },   // reverse: sweep right → left
      x => { const f = clampv(1 - age / 1.2, 0, 1); return f > .66 ? 2 : f > .33 ? 1 : 0; },                 // stop: fades out
      x => x < 8 ? 2 : 0,                                                                                    // half
      x => x < 5 ? 2 : x < 10 ? 1 : 0,                                                                       // low
      x => x > 10 ? 2 : x > 5 ? 1 : 0,                                                                       // high
      x => x > 4.5 && x < 10.5 ? 2 : 0,                                                                      // phone: narrow band
      x => hash(Math.floor(t * 12) + x * 7) > .5 ? 2 : 0,                                                    // crush: noise
      x => (Math.floor(x) + Math.floor(t * 4)) % 2 ? 2 : 0,                                                  // alias: checker
      x => Math.floor(t * 8) % 2 ? 2 : 0,                                                                    // gate: square
      x => { const r = age % 1.7; let l = 0; for (let k = 0; k < 3; k++) { const q = r - k * .38; if (q > 0) l = Math.max(l, q3(Math.exp(-Math.pow(Math.abs(x - a) - 11 * q, 2) / 1.7) * Math.exp(-q * 2.2) * (1 - k * .28))); } return l; },   // echo
      x => { const v = (Math.sin(t * 6 + x * .5) + 1) / 2; return v > .66 ? 2 : v > .33 ? 1 : 0; },         // wobble
    ];
    P[1] = P[2] = P[3] = P[0];
    const f = P[a]; for (let i = 0; i < 16; i++) o.W(i, f(i), col); BGAP.forEach((g, j) => o.B(j, f(g + .5), col)); o.W(a, a === 4 || a === 13 ? f(a) : 2, col);
  },
  Alchemy(c, o) {                                                   // Alchemy: the LFO wave rolls across the keys in the colour of its destination
    const tl = A.gtile('Alchemy'); if (!tl) return; const k = tl.k, sg = k.join(','); if (sg !== alchPrev) { alchPrev = sg; alchT = c.now; } if (!(busy(c) || c.now - alchT < 2500)) return; const rate = .2 + k[0] * 8, depth = k[1], shape = Math.round(k[2] * 3), col = DSTC[Math.round(k[3] * 3)];
    const val = x => { const ph = fr(c.t * rate * .5 - x / 16); return shape === 0 ? (Math.sin(ph * 6.2832) + 1) / 2 : shape === 1 ? (ph < .5 ? ph * 2 : 2 - ph * 2) : shape === 2 ? ph : ph < .5 ? 1 : 0; };
    const lv = x => { const v = .5 + (val(x) - .5) * (.3 + depth * .7); return v > .7 ? 2 : v > .4 ? 1 : 0; };
    for (let i = 0; i < 16; i++) o.W(i, lv(i), col); BGAP.forEach((g, j) => o.B(j, lv(g + .5), col));
    for (let i = 0; i < 16; i++) if (hash(Math.floor(c.t * 6) + i * 13) > .93) o.W(i, 2, '#f2e2c4');      // bubbles
  },
  fit(c, o) {                                                       // Chisel: sample region, loop markers that blink, root zone, sparks while you hammer the knobs
    const LB = G.LAB; if (!LB || !LB.fitK) return; const k = LB.fitK, st = LB.fitState(), lo = k[0], hi = k[1], la = lo + (hi - lo) * k[2], lb = lo + (hi - lo) * k[3];
    const sig = k.join(','); if (sig !== fitPrev) { fitPrev = sig; fitT = c.now; spark = { t: c.now, x: Math.round(la * 15) }; } if (!(busy(c) || c.now - fitT < 2500)) return;
    const ix = p => Math.round(clampv(p, 0, 1) * 15), blink = Math.floor(c.now / 260) % 2;
    for (let i = 0; i < 16; i++) { const p = i / 15; if (p >= lo - .001 && p <= hi + .001) o.W(i, 1); }
    BGAP.forEach((g, j) => { const p = (g + .5) / 15; if (p >= lo && p <= hi) o.B(j, 1); });
    o.W(ix(lo), 2); o.W(ix(hi), 2); if (Math.floor(c.now / 140) % 2) o.W(ix(la), 2); if (Math.floor(c.now / 520) % 2) o.W(ix(lb), 2);          // start/end steady · loop-in blinks fast · loop-out blinks slow
    o.W(Math.min(15, Math.floor(st.root * 16 / 6)), Math.floor(c.now / 900) % 2 ? 2 : 1);               // root zone pulses slowly
    const age = (c.now - spark.t) / 1000; if (age < .45) for (let i = 0; i < 16; i++) { const d = Math.abs(i - spark.x); if (d < 4 && hash(Math.floor(c.now / 50) + i * 5) > .45 + d * .1) o.W(i, 2); }
  },
  armory(c, o) {                                                    // Armory: the highlighted instrument as a gold key among 8 pairs
    const LB = G.LAB; if (!LB || !LB.fitState) return; const sel = LB.fitState().sel; if (sel !== armPrev) { armPrev = sel; armT = c.now; } if (!(busy(c) || c.now - armT < 2500)) return; for (let i = 0; i < 16; i++) o.W(i, i >> 1 === sel ? 2 : 1, i >> 1 === sel ? '#f0c860' : '#3a62c0');
  },
};
A.ledFx = (now, c) => {
  const w = Array(16).fill(0), b = Array(11).fill(0), wc = Array(16).fill(null), bc = Array(11).fill(null); const mx = +cfg.max, gain = cfg.gain == null ? 1 : +cfg.gain; let ov = false;
  pressLevel.ctx = { root: c.root, scl: c.scl };
  const put = (arr, car, i, l, col, cap) => { l = Math.min(l, cap) * gain; if (l >= arr[i] && l > 0) { arr[i] = l; car[i] = cfg.rgb && col ? col : null; } };
  const kf = sim.knobFlash; if (kf && now - kf.t < 1500 && c.scr !== 'LED Effects') {                         // turning a knob draws its value as a bar along the keys
    const v = kf.v * 16, fade = Math.min(1, (1500 - (now - kf.t)) / 500); for (let i = 0; i < 16; i++) w[i] = Math.max(0, Math.min(1, v - i)) * 2 * fade; return { w, b, wc, bc, btn: {}, ov: true }; }
  const o = { W: (i, l, col) => put(w, wc, i, l, col, ov ? 2 : mx), B: (j, l, col) => put(b, bc, j, l, col, ov ? 2 : mx), Btn: () => {} };
  const scrFn = cfg.screenFx ? SCR[c.scr] : null;
  if (scrFn) { ov = true; scrFn(Object.assign({ now, t: now / 1000 }, c), o); }
  else {
    const demo = c.scr === 'LED Effects', e = IDLE[cfg.idle] || IDLE.none; e.f({ now, t: now / 1000, sp: +cfg.speed, bpm: c.bpm, step: demo ? now / 125 : c.step, beat: demo ? now / 500 : c.beat, playing: c.playing || demo, rec: c.rec, root: c.root, scl: c.scl }, o);
    if (cfg.press !== 'none') {
      for (let i = 0; i < 16; i++) { const l = pressLevel(cfg.press, c.rip, now, i, true); if (l > w[i]) { w[i] = l; wc[i] = null; } }
      BGAP.forEach((g, j) => { const l = pressLevel(cfg.press, c.rip, now, g + .5, true); if (l > b[j]) { b[j] = l; bc[j] = null; } });
    }
  }
  return { w, b, wc, bc, btn: {}, ov };
};
const LIST = () => Object.keys(IDLE).filter(k => k !== 'custom').map(k => ({ kind: 'idle', id: k, name: IDLE[k].name, desc: IDLE[k].desc })).concat(Object.keys(PRESS).filter(k => k !== 'none').map(k => ({ kind: 'press', id: k, name: PRESS[k].name, desc: PRESS[k].desc })));
const apply = e => { if (e.kind === 'idle') cfg.idle = e.id; else cfg.press = e.id; save(); const a = document.getElementById('lf-idle'), b2 = document.getElementById('lf-press'); if (a) a.value = cfg.idle; if (b2) b2.value = cfg.press; };
G.LEDFX = { IDLE, PRESS, SCR, cfg, cust, BX, BGAP, pressLevel, save, hash, q3, LIST, apply };

// ---- UI ------------------------------------------------------------------------------------------------------
const box = document.createElement('div'); box.className = 'ledfx';
const opts = (o, sel) => Object.entries(o).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.name}</option>`).join('');
box.innerHTML = `<h4>LEDs · efeitos <small>todos os LEDs são amarelos: 3 níveis (apagado · fraco · forte) e piscar</small></h4>
  <div class="r"><button id="lf-open">abrir a tela LED Effects</button><span class="d">gire SELECT para passar pelos efeitos · knobs 2–4: força, velocidade e fade-out</span><label><input type="checkbox" id="lf-scr" ${cfg.screenFx ? 'checked' : ''}> efeitos ligados à tela (Spells · Alchemy · Chisel)</label></div>
  <p class="d" id="lf-d"></p>
  <details class="ed"><summary>Editor de efeito: desenhe quadros e use como “meu efeito”</summary>
    <div class="fr"></div>
    <div class="grid"><div class="blk"></div><div class="whi"></div></div>
    <div class="r"><button id="lf-add">+ quadro</button><button id="lf-dup">duplicar</button><button id="lf-del">apagar</button><button id="lf-clr">limpar quadro</button><button id="lf-shr">→ deslocar</button>
      <label>tempo por quadro <input type="range" id="lf-ms" min="60" max="900" step="10" value="${cust.ms}"> <output id="lf-mso">${cust.ms}</output> ms</label><button id="lf-use">usar no simulador</button></div>
    <div class="r"><button id="lf-exp">exportar JSON</button><button id="lf-imp">importar JSON</button></div><textarea id="lf-json" rows="3" placeholder="JSON do efeito"></textarea>
    <p class="d">Clique num LED para passar apagado → fraco → forte. Arraste para pintar vários. Botão direito apaga.</p></details>`;
host.insertBefore(box, host.querySelector('.simnote'));
const $ = s => box.querySelector(s);
const desc = () => { if (!$('#lf-d')) return; $('#lf-d').innerHTML = `<b>${IDLE[cfg.idle].name}</b> — ${IDLE[cfg.idle].desc}<br><b>${PRESS[cfg.press].name}</b> — ${PRESS[cfg.press].desc}`; };
desc();
$('#lf-scr').onchange = e => { cfg.screenFx = e.target.checked; save(); };
$('#lf-open').onclick = () => G.SIM.go({ g: 'LED Effects' }, { force: true });

// editor
const grid = { b: $('.blk'), w: $('.whi') }, cells = { w: [], b: [], btn: {} };
for (let i = 0; i < 16; i++) { const c = document.createElement('i'); c.className = 'lc'; c.dataset.k = 'w' + i; grid.w.append(c); cells.w.push(c); }
BGAP.forEach((g, j) => { const c = document.createElement('i'); c.className = 'lc up'; c.dataset.k = 'b' + j; c.style.left = `calc(${(g + 1) / 16 * 100}% - 9px)`; grid.b.append(c); cells.b.push(c); });
const frame = () => cust.frames[cur];
function paintEd() {
  const f = frame(); cells.w.forEach((c, i) => { c.dataset.l = f.w[i]; }); cells.b.forEach((c, j) => { c.dataset.l = f.b[j]; });
  $('.fr').innerHTML = cust.frames.map((_, i) => `<button class="${i === cur ? 'on' : ''}" data-f="${i}">${i + 1}</button>`).join('');
}
let paint = null;
const setCell = (k, l) => { const f = frame(); if (k[0] === 'w') f.w[+k.slice(1)] = l; else f.b[+k.slice(1)] = l; paintEd(); save(); };
const getCell = k => { const f = frame(); return k[0] === 'w' ? f.w[+k.slice(1)] : f.b[+k.slice(1)]; };
box.querySelector('.grid').addEventListener('pointerdown', e => { const c = e.target.closest('.lc'); if (!c) return; e.preventDefault(); paint = e.button === 2 ? 0 : (getCell(c.dataset.k) + 1) % 3; setCell(c.dataset.k, paint); });
box.querySelector('.grid').addEventListener('pointerover', e => { const c = e.target.closest('.lc'); if (c && paint !== null && e.buttons) setCell(c.dataset.k, paint); });
addEventListener('pointerup', () => { paint = null; }); box.querySelector('.grid').addEventListener('contextmenu', e => e.preventDefault());
$('.fr').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { cur = +b.dataset.f; paintEd(); } };
$('#lf-add').onclick = () => { cust.frames.push(blank()); cur = cust.frames.length - 1; paintEd(); save(); };
$('#lf-dup').onclick = () => { cust.frames.splice(cur + 1, 0, JSON.parse(JSON.stringify(frame()))); cur++; paintEd(); save(); };
$('#lf-del').onclick = () => { if (cust.frames.length > 1) { cust.frames.splice(cur, 1); cur = Math.min(cur, cust.frames.length - 1); paintEd(); save(); } };
$('#lf-clr').onclick = () => { cust.frames[cur] = blank(); paintEd(); save(); };
$('#lf-shr').onclick = () => { const f = frame(); f.w.unshift(f.w.pop()); f.b.unshift(f.b.pop()); paintEd(); save(); };
$('#lf-ms').oninput = e => { cust.ms = +e.target.value; $('#lf-mso').textContent = cust.ms; save(); };
$('#lf-use').onclick = () => { cfg.idle = 'custom'; desc(); save(); };
$('#lf-exp').onclick = () => { $('#lf-json').value = JSON.stringify(cust); };
$('#lf-imp').onclick = () => { try { const c = JSON.parse($('#lf-json').value); if (c.frames && c.frames.length) { cust.frames = c.frames; cust.ms = c.ms || 220; cur = 0; paintEd(); save(); } } catch (e) { $('#lf-json').value = 'JSON inválido'; } };
paintEd();
G.LEDFX.paintEd = paintEd;
})(window);
