// FM1 Quest — Sloop-like engine: state, step sequencer, WebAudio synth, FX, punch FX, record.
// Nothing here knows about the game layer; scenes/screens only read from Engine.S.
(function (G) {
'use strict';

const SCALES = [[0,2,4,5,7,9,11],[0,2,3,5,7,8,10],[0,2,3,5,7,9,10],[0,1,3,5,7,8,10]];
const SCALE_NAMES = ['maj','min','dor','phr'];
const BIOMES = ['forest','cave','coast','ruins'];
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KIT = ['kick','kick2','snare','clap','hat','open','pedal','rim','snr 2','tom l','tom h','crash','ride','shake','conga','bell'];
const PUNCH = ['loop 4','loop 8','loop16','loop32','stutt','rev','stop','half','low','high','phone','crush','alias','gate','echo','wobble'];
// preset items: [label, icon, family, description, synth params]
const PRESETS = [
  ['303','saw','synth / analog',{t:'sawtooth',cut:900,q:9,atk:.003,dec:.22,sus:.0,rel:.08,env:3200}],
  ['sub','sine','bass / sub',{t:'sine',cut:500,q:1,atk:.005,dec:.35,sus:.5,rel:.12,env:200,oct:-1}],
  ['bell','tri','mallet / fm',{t:'triangle',cut:6000,q:1,atk:.002,dec:.9,sus:0,rel:.4,env:0,fm:3.01}],
  ['pluck','saw','string / pluck',{t:'sawtooth',cut:1600,q:3,atk:.002,dec:.28,sus:0,rel:.12,env:3000}],
  ['reese','saw','bass / detuned',{t:'sawtooth',cut:700,q:2,atk:.01,dec:.5,sus:.6,rel:.15,env:600,det:14,two:1}],
  ['wob','square','bass / wobble',{t:'square',cut:500,q:6,atk:.01,dec:.4,sus:.6,rel:.1,env:0,lfo:6}],
  ['sqr','square','lead / pulse',{t:'square',cut:2400,q:2,atk:.004,dec:.18,sus:.25,rel:.1,env:1500}],
  ['choir','sine','vocal / airy',{t:'sine',cut:2600,q:1,atk:.12,dec:.4,sus:.7,rel:.5,env:0,two:1,det:7}],
  ['noise','noise','fx / texture',{t:'noise',cut:2200,q:2,atk:.01,dec:.25,sus:0,rel:.1,env:0}],
  ['arp','tri','arp / digital',{t:'triangle',cut:3200,q:2,atk:.002,dec:.14,sus:0,rel:.06,env:2000}],
  ['pad','sine','pad / warm',{t:'sawtooth',cut:1100,q:1,atk:.35,dec:.6,sus:.8,rel:.9,env:0,two:1,det:9}],
  ['lead','square','lead / saw',{t:'sawtooth',cut:3200,q:3,atk:.005,dec:.2,sus:.5,rel:.2,env:2200}],
];
const KITS = ['808','909','lofi','dub','rock','trap','jazz','tech','hard','soft','crunch','tight'];
const KIT_TUNE = [1,1.08,0.9,0.85,1.05,0.8,1.15,1.2,0.95,1.1,0.88,1.02];
const KIT_DEC  = [1.4,1,1.1,1.3,.9,1.5,.8,.8,1,1.2,.9,.7];

const TRK = [
  { name:'ACID 303',  cls:'mage',    base:36, chord:0 },
  { name:'DUB CHORD', cls:'archer',  base:48, chord:1 },
  { name:'ATMOS PAD', cls:'cleric',  base:48, chord:1 },
  { name:'TECHNO',    cls:'warrior', base:36, chord:0 },
];

const S = {
  bpm: 130, swing: 50, playing: false,
  screen: 'title', prevScreen: 'party',
  sel: 0, solo: -1,
  keyRoot: 2, scale: 0, transp: 0, chordMode: 0, keyLock: 0,
  fx: { dst: .2, cho: .4, dly: .5, rev: .6 },
  punch: -1, dust: 0, duck: 0, pfilt: 0,
  oct: 0, page: 0,
  drumSel: 4, drumCur: 0, kitSel: 0, kitRev: .12,
  tracks: [], drum: [], dvel: [], dlev: Array(16).fill(.8),
  rec: { state: 'off', bars: 2, startInstant: 0, hp: 1, bar: 0, target: 0, flash: 0 },
  menu: { cur: 6, vals: { COLOR: 0, LOWCUT: 0, ZOOM: 0, LIGHTS: 2, KEYS: 0, NOTES: 0, 'USB AUDIO': 0 } },
  click: 1,
  duelDiv: 1,
  presetNo: 22,
};
const MENU_DEFS = [
  ['COLOR', ['MONO','TAVERN']], ['LOWCUT', ['OFF','ON']], ['ZOOM', ['OFF','ON']], ['LIGHTS', ['LOW','MID','HIGH']],
  ['KEYS', ['WHITE KEYS','ALL KEYS']], ['NOTES', ['ON','OFF']], ['USB AUDIO', ['FULL','MIX','OFF']],
  ['VILLAGE WALK', ['5 s','10 s','15 s','20 s','30 s','45 s','60 s','TOWN ONLY']], ['START HOUR', ['RANDOM','DAWN','NOON','SUNSET','NIGHT']],
  ['HARDWARE CALIBRATION', null], ['ABOUT', null], ['BACK', null],
];
S.menu.vals.COLOR = 1; S.menu.vals['VILLAGE WALK'] = 3;

function mkTracks() {
  S.tracks = TRK.map((d, i) => ({
    name: d.name, cls: d.cls, steps: 16, level: i === 3 ? .78 : .81, pan: .5, mute: false,
    preset: [0, 3, 10, 0][i], cutoff: .62, reso: .4, env: .55, decay: .3,
    pat: Array(64).fill(null), fx: { inp: 1, lpf: 1, hpf: 0, out: 1 },
  }));
  const set = (t, str, degs) => { str.split('').forEach((c, i) => { if (c === '1') { S.tracks[t].pat[i] = degs[i % degs.length]; S.tracks[t].pat[i + 16] = degs[(i + 3) % degs.length]; } }); };
  set(0, '1011010110110110', [0, 0, 7, 0, 2, 0, 4, 0]);
  set(1, '0000001000000100', [0, 2]);
  set(2, '1000000000000000', [0]);
  S.drum = KIT.map(() => Array(64).fill(0));
  S.dvel = KIT.map(() => Array(64).fill(.8));
  const D = { 0:'1000100010001000', 2:'0000100000001000', 3:'0000000000001000', 4:'0010001000100010', 5:'0000001000000010', 7:'0001000000010010', 14:'0000000001000001', 11:'1000000000000000' };
  Object.keys(D).forEach(k => D[k].split('').forEach((c, i) => { if (c === '1') { S.drum[k][i] = 1; S.drum[k][i + 16] = 1; } }));
  S.tracks[3].steps = 16;
}
mkTracks();

// ---------------------------------------------------------------- persistence
const SAVE_KEY = 'fm1quest.project.v1';
function save() { return; 
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      bpm: S.bpm, swing: S.swing, keyRoot: S.keyRoot, scale: S.scale, transp: S.transp, fx: S.fx, tracks: S.tracks, drum: S.drum, dvel: S.dvel,
      dlev: S.dlev, kitSel: S.kitSel, kitRev: S.kitRev, menu: S.menu.vals, rec: { bars: S.rec.bars, startInstant: S.rec.startInstant }, click: S.click,
    }));
  } catch (e) {}
}
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (!o) return;
    Object.assign(S, { bpm: o.bpm, swing: o.swing, keyRoot: o.keyRoot, scale: o.scale, transp: o.transp, fx: o.fx, tracks: o.tracks, drum: o.drum, dvel: o.dvel, dlev: o.dlev, kitSel: o.kitSel, kitRev: o.kitRev, click: o.click });
    Object.assign(S.menu.vals, o.menu || {}); Object.assign(S.rec, o.rec || {});
  } catch (e) {}
}
let saveT = 0;
function dirty() { clearTimeout(saveT); saveT = setTimeout(save, 400); }
function resetProject() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); }

// ---------------------------------------------------------------- music helpers
const sc = () => SCALES[S.scale];
function degToSemi(d) { const oct = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return sc()[i] + 12 * oct; }
function degToMidi(d, tr) { return TRK[tr].base + S.keyRoot + S.transp + degToSemi(d); }
function midiToDeg(m, tr) {
  const semi = m - (TRK[tr].base + S.keyRoot + S.transp); let best = 0, bd = 99;
  for (let d = -14; d <= 21; d++) { const e = Math.abs(degToSemi(d) - semi); if (e < bd) { bd = e; best = d; } }
  return best;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- audio graph
let ctx = null, A = null, noiseBuf = null, soundOn = true;
let masterV = 1;
function setSound(on) { soundOn = on; if (A) A.out.gain.value = on ? .8 * masterV : 0; }
function setMaster(v) { masterV = v; if (A && soundOn) A.out.gain.value = .8 * v; }
function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  A = {};
  A.tb = [0, 1, 2, 3].map(() => { const g = ctx.createGain(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), go = ctx.createGain(), p = ctx.createStereoPanner(); hp.type = 'highpass'; hp.frequency.value = 10; lp.type = 'lowpass'; lp.frequency.value = 20000; g.connect(hp); hp.connect(lp); lp.connect(go); go.connect(p); return { g, hp, lp, go, p }; });     // voices -> IN level -> HPF -> LPF -> OUT level -> pan
  A.mix = ctx.createGain();
  A.tb.forEach(t => t.p.connect(A.mix));
  A.low = ctx.createBiquadFilter(); A.low.type = 'highpass'; A.low.frequency.value = 10;
  A.pf = ctx.createBiquadFilter(); A.pf.type = 'allpass';
  A.crush = ctx.createWaveShaper(); A.crushOn = false;
  A.gate = ctx.createGain(); A.duck = ctx.createGain();
  A.mix.connect(A.low); A.low.connect(A.pf); A.pf.connect(A.gate); A.gate.connect(A.duck);
  A.pre = ctx.createGain(); A.duck.connect(A.pre);
  A.out = ctx.createGain(); A.out.gain.value = soundOn ? .8 * masterV : 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  A.out.connect(comp); comp.connect(ctx.destination);
  A.pre.connect(A.out);
  // sends
  const send = () => { const g = ctx.createGain(); g.gain.value = 0; A.pre.connect(g); return g; };
  A.sDst = send(); A.sCho = send(); A.sDly = send(); A.sRev = send();
  const ws = ctx.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 6); } ws.curve = c; ws.oversample = '2x';
  const dg = ctx.createGain(); dg.gain.value = .55; A.sDst.connect(ws); ws.connect(dg); dg.connect(A.out);
  const cd = ctx.createDelay(.1); cd.delayTime.value = .022; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .8; lg.gain.value = .006; lfo.connect(lg); lg.connect(cd.delayTime); lfo.start();
  const cd2 = ctx.createDelay(.1); cd2.delayTime.value = .031; const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 1.1; lg2.gain.value = .005; lfo2.connect(lg2); lg2.connect(cd2.delayTime); lfo2.start();
  const cg = ctx.createGain(); cg.gain.value = .8; A.sCho.connect(cd); A.sCho.connect(cd2); cd.connect(cg); cd2.connect(cg); cg.connect(A.out);
  A.dly = ctx.createDelay(2); const fb = ctx.createGain(); fb.gain.value = .42; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  A.sDly.connect(A.dly); A.dly.connect(dlp); dlp.connect(fb); fb.connect(A.dly); const dgn = ctx.createGain(); dgn.gain.value = .8; dlp.connect(dgn); dgn.connect(A.out);
  const conv = ctx.createConvolver(); const len = ctx.sampleRate * 1.9, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const dd = ir.getChannelData(ch); for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  conv.buffer = ir; const rg = ctx.createGain(); rg.gain.value = .9; A.sRev.connect(conv); conv.connect(rg); rg.connect(A.out);
  // drum reverb send (kit "reverb" knob)
  A.drumRev = ctx.createGain(); A.drumRev.gain.value = S.kitRev; A.tb[3].g.connect(A.drumRev); A.drumRev.connect(conv);
  // crush curve
  const cc = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; cc[i] = Math.round(x * 6) / 6; } A.crush.curve = cc;
  applyAll();
}
function applyFx() {
  if (!A) return; const t = ctx.currentTime;
  A.sDst.gain.setTargetAtTime(S.fx.dst * .9, t, .02);
  A.sCho.gain.setTargetAtTime(S.fx.cho * .7, t, .02);
  A.sDly.gain.setTargetAtTime(S.fx.dly * .8 + (S.punch === 14 ? .5 : 0), t, .02);
  A.sRev.gain.setTargetAtTime(S.fx.rev * .9, t, .02);
}
function applyMix() {
  if (!A) return; const t = ctx.currentTime, anySolo = S.solo >= 0;
  S.tracks.forEach((tr, i) => {
    const on = anySolo ? i === S.solo : !tr.mute;
    const f = tr.fx || { inp: 1, lpf: 1, hpf: 0, out: 1 };
    A.tb[i].g.gain.setTargetAtTime(on ? tr.level * (i === 3 ? 1 : .8) * f.inp : 0, t, .015);
    A.tb[i].hp.frequency.setTargetAtTime(10 * Math.pow(400, f.hpf), t, .02); A.tb[i].lp.frequency.setTargetAtTime(250 * Math.pow(80, f.lpf), t, .02); A.tb[i].go.gain.setTargetAtTime(f.out, t, .02);
    A.tb[i].p.pan.setTargetAtTime((tr.pan - .5) * 2, t, .02);
  });
  A.low.frequency.setTargetAtTime(S.menu.vals.LOWCUT ? 140 : 10, t, .03);
  A.drumRev.gain.setTargetAtTime(S.kitRev, t, .03);
  A.dly.delayTime.setTargetAtTime(Math.min(1.9, 60 / S.bpm * .75), t, .05);
}
function applyPunchFilter() {
  if (!A) return; const t = ctx.currentTime, p = S.punch;
  const f = A.pf;
  if (A.wob) { try { A.wob.stop(); } catch (e) {} A.wob = null; }
  A.pf.disconnect(); A.gate.disconnect && 0;
  // chain: low -> pf (-> crush) -> gate
  A.pf.disconnect(); A.crush.disconnect();
  if (p === 11 || p === 12) { A.pf.connect(A.crush); A.crush.connect(A.gate); if (p === 12) { const cc = new Float32Array(64); for (let i = 0; i < 64; i++) { const x = i / 31.5 - 1; cc[i] = Math.round(x * 2) / 2; } A.crush.curve = cc; } else { const cc = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; cc[i] = Math.round(x * 6) / 6; } A.crush.curve = cc; } }
  else A.pf.connect(A.gate);
  const base = S.pfilt; // knob "filter": 0 off, .33 lp, .66 hp
  let type = 'allpass', fr = 1000, q = .7;
  if (p === 8) { type = 'lowpass'; fr = 400; } else if (p === 9) { type = 'highpass'; fr = 2200; } else if (p === 10) { type = 'bandpass'; fr = 1300; q = 1.2; }
  else if (p === 15) { type = 'lowpass'; fr = 1200; q = 6; }
  else if (base > .05 && base < .5) { type = 'lowpass'; fr = 400 + (1 - base * 2) * 8000; } else if (base >= .5) { type = 'highpass'; fr = 200 + (base - .5) * 2 * 5000; }
  f.type = type; f.frequency.setTargetAtTime(fr, t, .01); f.Q.setTargetAtTime(q, t, .01);
  if (p === 15) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = S.bpm / 60 * 1.5; g.gain.value = 900; o.connect(g); g.connect(f.frequency); o.start(); A.wob = o; }
  applyFx();
}
function applyAll() { applyFx(); applyMix(); applyPunchFilter(); }

// ---------------------------------------------------------------- voices
function noiseSrc(t, dur) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random()); s.stop(t + dur + .05); return s; }
function env(g, t, a, peak, d, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + dur); }
function drum(i, t, vel, out) {
  vel = vel * S.dlev[i]; const o = out || A.tb[3].g, tune = KIT_TUNE[S.kitSel], dm = KIT_DEC[S.kitSel];
  const tone = (f0, f1, dur, peak, type) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = type || 'sine'; os.frequency.setValueAtTime(f0 * tune, t); os.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * tune), t + dur * .7); env(g, t, .002, peak * vel, dur * dm, 0); os.connect(g); g.connect(o); os.start(t); os.stop(t + dur * dm + .1); };
  const noise = (type, fr, q, dur, peak, a) => { const s = noiseSrc(t, dur * dm), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = type; f.frequency.value = fr; f.Q.value = q; env(g, t, a || .001, peak * vel, dur * dm, 0); s.connect(f); f.connect(g); g.connect(o); };
  switch (i) {
    case 0: tone(150, 45, .45, 1.1); break;
    case 1: tone(110, 38, .6, 1.1); tone(900, 200, .02, .3, 'square'); break;
    case 2: noise('highpass', 1600, .7, .2, .7); tone(220, 140, .12, .6, 'triangle'); break;
    case 3: for (let k = 0; k < 3; k++) { const tt = t + k * .011, s = noiseSrc(tt, .06), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.2; env(g, tt, .001, .6 * vel, .05, 0); s.connect(f); f.connect(g); g.connect(o); } noise('bandpass', 1200, 1, .2, .5, .03); break;
    case 4: noise('highpass', 7500, .7, .05, .45); break;
    case 5: noise('highpass', 6500, .7, .32, .4); break;
    case 6: noise('highpass', 6000, .7, .03, .3); break;
    case 7: tone(820, 700, .04, .5, 'square'); noise('bandpass', 2400, 2, .03, .3); break;
    case 8: noise('bandpass', 2200, .6, .18, .7); tone(260, 180, .1, .5, 'triangle'); break;
    case 9: tone(120, 70, .35, .9); break;
    case 10: tone(210, 130, .28, .9); break;
    case 11: noise('highpass', 5000, .5, 1.3, .5, .002); break;
    case 12: noise('bandpass', 8200, 1.5, .5, .35); tone(5200, 5100, .3, .1, 'triangle'); break;
    case 13: noise('bandpass', 6200, 2, .09, .4, .03); break;
    case 14: tone(340, 260, .18, .8); break;
    case 15: tone(1040, 1030, .8, .35, 'triangle'); tone(1560, 1555, .6, .2, 'triangle'); break;
  }
}
function synth(tr, midi, t, dur, vel, out) {
  const T = S.tracks[tr], P = PRESETS[T.preset][3];
  const o = out || A.tb[tr].g, f0 = mtof(midi + (P.oct || 0) * 12);
  const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass';
  const cutBase = P.cut * (.25 + T.cutoff * 2.2), peak = (T.env * 2 - .4) * (P.env || 1200) * 1.0;
  f.Q.value = Math.max(.3, P.q * (.4 + T.reso * 1.8));
  const dec = P.dec * (.3 + T.decay * 2.4);
  f.frequency.setValueAtTime(Math.max(60, cutBase + Math.max(0, peak)), t); f.frequency.exponentialRampToValueAtTime(Math.max(60, cutBase), t + dec);
  const end = t + dur + P.rel;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel * .5, t + P.atk);
  const sust = Math.max(.0003, vel * .5 * P.sus);
  g.gain.exponentialRampToValueAtTime(sust, t + P.atk + dec);
  g.gain.setValueAtTime(sust, Math.max(t + P.atk + dec, t + dur)); g.gain.exponentialRampToValueAtTime(0.0001, end);
  const stopAt = end + .05; let srcs = [];
  if (P.t === 'noise') { const s = noiseSrc(t, end - t); s.connect(f); srcs.push(s); }
  else {
    const mk = (det) => { const os = ctx.createOscillator(); os.type = P.t; os.frequency.value = f0; os.detune.value = det; os.connect(f); os.start(t); os.stop(stopAt); return os; };
    mk(P.two ? -(P.det || 8) : 0); if (P.two) mk(P.det || 8);
    if (P.fm) { const m = ctx.createOscillator(), mg = ctx.createGain(); m.frequency.value = f0 * P.fm; mg.gain.value = f0 * 1.5; m.connect(mg); const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = f0; mg.connect(os.frequency); const og = ctx.createGain(); og.gain.value = .6; os.connect(og); og.connect(f); m.start(t); os.start(t); m.stop(stopAt); os.stop(stopAt); }
    if (P.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = S.bpm / 60 * (P.lfo / 4); lg.gain.value = cutBase * .8; l.connect(lg); lg.connect(f.frequency); l.start(t); l.stop(stopAt); }
  }
  f.connect(g); g.connect(o);
}
function playDegree(tr, deg, t, dur, vel) {
  const T = TRK[tr];
  if (T.chord || S.chordMode) [0, 2, 4].forEach((o, i) => synth(tr, degToMidi(deg + o, tr) + (tr === 2 ? 12 : 0), t, dur, vel * (i ? .7 : 1)));
  else synth(tr, degToMidi(deg, tr), t, dur, vel);
}
function click(t, accent) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = accent ? 1600 : 1100;
  env(g, t, .001, .22, .03, 0); o.connect(g); g.connect(A.out); o.start(t); o.stop(t + .06);
}

// ---------------------------------------------------------------- sequencer
const LOOK = .12;
const T = { next: 0, idx: 0, q: [], cur: null, timer: 0, punchBase: 0, wall0: performance.now(), wbeat: 0, lastWall: performance.now() };
const stepDur = () => 60 / (S.bpm * (S.tape || 1)) / 4;           // S.tape: the tape effect (FX held + OCT±) bends the tempo like a cassette
function effIdx(idx) {
  const p = S.punch, b = T.punchBase;
  if (p >= 0 && p <= 3) { const n = [4, 8, 16, 32][p]; return b + (((idx - b) % n) + n) % n; }
  if (p === 4) return b;
  if (p === 5) return b - (idx - b);
  if (p === 7) return b + Math.floor((idx - b) / 2);
  return idx;
}
const trLen = i => S.tracks[i].steps;
const at = (i, idx) => { const L = trLen(i); return ((idx % L) + L) % L; };
function schedStep(idx, t) {
  const rec = S.rec, countIn = idx < 0;
  const sd = stepDur();
  if (countIn) { if (S.click && idx % 4 === 0) click(t, idx === -16); if (S.click && idx % 4 !== 0 && false) click(t, 0); return; }
  if (rec.state === 'rec' && S.click && idx % 4 === 0) click(t, idx % 16 === 0);
  const e = effIdx(idx), swing = (idx % 2 === 1) ? (S.swing / 100 - .5) * 2 * sd : 0, tt = t + swing;
  const p = S.punch;
  if (p === 6) return;
  // gate
  if (p === 13) { A.gate.gain.setValueAtTime(1, t); A.gate.gain.setValueAtTime(.02, t + sd * .5); } else if (A.gate.gain.value < .99) A.gate.gain.setValueAtTime(1, t);
  // duck
  if (S.duck > .02 && idx % 4 === 0) { A.duck.gain.setValueAtTime(1 - S.duck * .75, t); A.duck.gain.linearRampToValueAtTime(1, t + sd * 3); }
  if (S.dust > .02) for (let k = 0; k < 4; k++) if (Math.random() < S.dust * .7) { const tc = t + Math.random() * sd, s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = noiseBuf; g.gain.value = .12 * S.dust; s.connect(g); g.connect(A.out); s.start(tc, Math.random(), .004); }
  // tracks
  for (let i = 0; i < 3; i++) {
    const deg = S.tracks[i].pat[at(i, e)]; if (deg == null) continue;
    const dur = sd * (i === 2 ? 6 : i === 1 ? 2 : 1.4);
    playDegree(i, deg, tt, dur, .85);
  }
  const di = at(3, e);
  for (let s = 0; s < 16; s++) if (S.drum[s][di]) drum(s, tt, S.dvel[s][di]);
}
function tickSched() {
  if (!S.playing) return;
  while (T.next < ctx.currentTime + LOOK) {
    schedStep(T.idx, T.next);
    T.q.push({ t: T.next, idx: T.idx, sd: stepDur() });
    T.next += stepDur(); T.idx++;
  }
}
function visual() {
  const wall = performance.now();
  if (!S.playing || !ctx) {
    // free-running cosmetic beat for idle animation
    const b = (wall - T.wall0) / 1000 * S.bpm / 60;
    return { beat: b, step: b * 4, playing: false };
  }
  const now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  while (T.q.length && T.q[0].t <= now) T.cur = T.q.shift();
  if (!T.cur) return { beat: T.idx / 4 - .1, step: T.idx - .4, playing: true };
  const st = T.cur.idx + Math.min(1.2, (now - T.cur.t) / T.cur.sd);
  return { beat: st / 4, step: st, playing: true };
}
function play() {
  ensureAudio(); if (S.playing) return;
  S.playing = true; T.idx = 0; T.next = ctx.currentTime + .06; T.q = []; T.cur = null; T.punchBase = 0;
  clearInterval(T.timer); T.timer = setInterval(tickSched, 25);
}
function stop() {
  S.playing = false; clearInterval(T.timer); T.q = []; T.cur = null;
  if (A) { A.gate.gain.cancelScheduledValues(0); A.gate.gain.value = 1; A.duck.gain.cancelScheduledValues(0); A.duck.gain.value = 1; }
  if (S.rec.state !== 'off') { S.rec.state = 'off'; }
}
function togglePlay() { if (S.playing) stop(); else play(); }

// ---------------------------------------------------------------- record (boss fight)
function recPress() {
  const r = S.rec;
  if (r.state === 'off') { ensureAudio(); r.state = 'ready'; r.hp = 1; r.target = S.sel; r.pending = null; if (r.startInstant) recBegin(); }
  else if (r.state === 'ready') recAbort();
  else if (r.state === 'rec') recFinish();
  else if (r.state === 'count') recAbort();
}
function recBegin() {
  const r = S.rec; ensureAudio(); if (S.playing) stop(); r.state = 'count'; r.hp = 1; r.bar = 0;
  S.playing = true; T.idx = -16; T.next = ctx.currentTime + .06; T.q = []; T.cur = null; T.punchBase = 0;
  r.buf = Array(r.bars * 16).fill(null); r.got = 0;
  clearInterval(T.timer); T.timer = setInterval(tickSched, 25);
}
function recAbort() { S.rec.state = 'off'; S.rec.hp = 1; if (S.playing && T.idx < 0) { stop(); } }
function recFinish() {
  const r = S.rec, tr = S.tracks[r.target], len = r.bars * 16;
  r.state = 'off'; r.hp = 0; r.flash = performance.now();
  if (r.got > 0) {
    tr.steps = len; tr.pat = Array(64).fill(null);
    if (r.target === 3) { S.drum.forEach((row, s) => row.fill(0)); }
    r.buf.forEach((v, i) => { if (v == null) return; if (r.target === 3) { S.drum[v][i] = 1; S.dvel[v][i] = .85; } else tr.pat[i] = v; });
  }
  // grow pattern arrays when 32 steps
  dirty(); G.Engine.onRecDone && G.Engine.onRecDone();
}
function recTick(v) {
  const r = S.rec; if (r.state === 'off') return;
  if (r.state === 'ready' || !S.playing) return;
  if (r.state === 'count' && v.step >= 0) { r.state = 'rec'; }
  if (r.state === 'rec') {
    const total = r.bars * 16, p = v.step;
    r.bar = Math.floor(p / 16); r.hp = Math.max(0, 1 - p / total);
    if (p >= total) recFinish();
  }
}
// a note was played by the player (keyboard / pad). semi = midi note
function noteOn(midi, source) {
  ensureAudio(); const r = S.rec, tr = S.sel;
  if (tr === 3) { const s = ((midi - 48) % 16 + 16) % 16; drum(s, ctx.currentTime + .005, .9); S.drumSel = s; recordNote(s); return; }
  let deg = midiToDeg(midi + (S.oct * 12), tr);
  if (S.keyLock) midi = degToMidi(deg, tr);
  const m = S.keyLock ? midi : midi + S.oct * 12;
  const t = ctx.currentTime + .005;
  if (TRK[tr].chord || S.chordMode) [0, 2, 4].forEach((o, i) => synth(tr, degToMidi(deg + o, tr), t, .3, i ? .6 : .9));
  else synth(tr, m, t, .3, .9);
  recordNote(deg);
}
function recordNote(val) {
  const r = S.rec;
  if (r.state === 'ready') { recBegin(); return; }
  if (r.state !== 'rec') return;
  const v = visual(), q = ((Math.round(v.step) % (r.bars * 16)) + r.bars * 16) % (r.bars * 16);
  r.buf[q] = val; r.got++;
}

// ---------------------------------------------------------------- edit actions
function toggleStep(tr, i) {
  const t = S.tracks[tr], idx = i + S.page * 16; if (idx >= t.steps) return;
  if (tr === 3) { const row = S.drum[S.drumSel]; row[idx] = row[idx] ? 0 : 1; S.drumCur = idx; if (row[idx]) previewDrum(S.drumSel); }
  else { if (t.pat[idx] == null) { const ds = [0, 2, 4, 7, 4, 2, 0, 5]; t.pat[idx] = ds[idx % ds.length]; if (S.playing || ctx) previewDeg(tr, t.pat[idx]); } else t.pat[idx] = null; }
  dirty();
}
function previewDrum(s) { ensureAudio(); drum(s, ctx.currentTime + .005, .9); }
function previewDeg(tr, d) { ensureAudio(); playDegree(tr, d, ctx.currentTime + .005, .25, .8); }
function setSolo(tr) { S.solo = (S.solo === tr) ? -1 : tr; applyMix(); }
function toggleMute(tr) { S.tracks[tr].mute = !S.tracks[tr].mute; applyMix(); dirty(); }
function eraseSound(s) { S.drum[s].fill(0); dirty(); }
function eraseTrack(tr) { if (tr === 3) S.drum.forEach(r => r.fill(0)); else S.tracks[tr].pat.fill(null); dirty(); }
function rotate(tr, dir) {
  const t = S.tracks[tr], L = t.steps;
  const rot = a => { const c = a.slice(0, L); const o = dir > 0 ? [c[L - 1], ...c.slice(0, L - 1)] : [...c.slice(1), c[0]]; for (let i = 0; i < L; i++) a[i] = o[i]; };
  if (tr === 3) S.drum.forEach(rot); else rot(t.pat); dirty();
}
function setPunch(i) { S.punch = i; if (i >= 0) { const v = visual(); T.punchBase = Math.max(0, Math.floor(v.step)); } applyPunchFilter(); }
function setBpm(b) { S.bpm = Math.max(60, Math.min(200, Math.round(b))); applyMix(); dirty(); }
let taps = [];
function tapTempo() { const n = performance.now(); if (taps.length && n - taps[taps.length - 1] > 2000) taps = []; taps.push(n); if (taps.length > 1) { const ds = []; for (let i = 1; i < taps.length; i++) ds.push(taps[i] - taps[i - 1]); const m = ds.reduce((a, b) => a + b) / ds.length; setBpm(60000 / m); } if (taps.length > 6) taps.shift(); }
function patString(tr) {
  const t = S.tracks[tr], L = t.steps; let s = '';
  for (let i = 0; i < L; i++) s += (tr === 3 ? S.drum.some(r => r[i]) : t.pat[i] != null) ? '1' : '0';
  return s;
}
function trackActivity(tr) { return patString(tr).split('1').length - 1; }

G.Engine = {
  S, TRK, SCALES, SCALE_NAMES, BIOMES, NOTE_NAMES, KIT, PUNCH, PRESETS, KITS, MENU_DEFS,
  ensureAudio, play, stop, togglePlay, visual, recPress, recBegin, recAbort, recTick, noteOn, toggleStep, setSolo, toggleMute,
  eraseSound, eraseTrack, rotate, setPunch, setBpm, tapTempo, patString, trackActivity, applyAll, applyFx, applyMix, applyPunchFilter,
  previewDrum, previewDeg, dirty, load, save, resetProject, degToMidi, midiToDeg, mkTracks,
  audioReady: () => !!ctx, setSound, setMaster,
};
})(window);
