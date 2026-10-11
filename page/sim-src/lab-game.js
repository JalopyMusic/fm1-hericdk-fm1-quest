// FM1 Quest lab — game layer: tapes (cassettes) that unlock with XP, XP from playing, the musician photos, and the slot for the user's own ultimate animation.
//   XP: +1 per key · +25 for a recorded loop · +5 every 10 s of playing · levels open tapes (or the switch "tudo liberado" opens them all to test).
(function (G) {
'use strict';
const SIM = G.SIM; if (!SIM) return;
const A = SIM.api, sim = SIM.sim, $ = (s, r) => (r || document).querySelector(s), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LS = 'fm1lab.game';
const TAPES = [
  { id: 't1', title: 'Taverna', genre: 'dungeon synth', artist: 'a definir', lvl: 1 }, { id: 't2', title: 'Estrada', genre: 'fantasy synth', artist: 'a definir', lvl: 1 },
  { id: 't3', title: 'Vila ao entardecer', genre: 'folk eletrônico', artist: 'a definir', lvl: 2 }, { id: 't4', title: 'Colina', genre: 'synth épico', artist: 'a definir', lvl: 3 },
  { id: 't5', title: 'Luta', genre: 'synthwave', artist: 'a definir', lvl: 4 }, { id: 't6', title: 'Cemitério', genre: 'ambient', artist: 'a definir', lvl: 5 },
  { id: 't7', title: 'Forja', genre: 'chiptune industrial', artist: 'a definir', lvl: 6 }, { id: 't8', title: 'Jam da banda', genre: 'lofi', artist: 'a definir', lvl: 8 },
];
const LV = [0, 30, 80, 150, 250, 380, 540, 740, 980, 1260];                                  // XP needed to reach level n+1
const D = { xp: 0, unlockAll: false, photos: {}, warrior: false, sigs: [], party: ['mago', 'arqueiro', 'clerigo', 'guerreiro'] }, photoCv = {};
try { Object.assign(D, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
const GM = G.GAME = {
  TAPES, sel: 0, pendingSel: null, pendingLed: null, lastGain: null,
  get xp() { return D.xp; }, get unlockAll() { return D.unlockAll; }, set unlockAll(v) { D.unlockAll = !!v; },
  level() { let l = 1; for (let i = 1; i < LV.length; i++) if (D.xp >= LV[i]) l = i + 1; return l; }, levelXP(l) { return LV[Math.min(l, LV.length) - 1]; }, nextXP() { const l = GM.level(); return l >= LV.length ? 0 : LV[l]; },
  progress() { const l = GM.level(), nx = GM.nextXP(); return nx ? (D.xp - LV[l - 1]) / (nx - LV[l - 1]) : 1; },
  isUnlocked(t) { return D.unlockAll || GM.level() >= t.lvl; },
  save() { try { localStorage.setItem(LS, JSON.stringify(D)); } catch (e) {} paintPanel(); },
  gain(n, why) {
    const before = GM.level(); D.xp += n; if (why) GM.lastGain = { n, why, t: (G.GFX.nowT ? G.GFX.nowT() : performance.now() / 1000) };
    const after = GM.level(); if (after > before) { const t = TAPES.filter(x => x.lvl === after); popup('NÍVEL ' + after, '', t.length ? 'fita nova: ' + t.map(x => x.title).join(', ') : ''); if (G.SIM.sim) GM.lastGain = { n, why: 'nível ' + after, t: G.GFX.nowT ? G.GFX.nowT() : performance.now() / 1000 }; }
    GM.save();
  },
  photo(id) { if (photoCv[id] !== undefined) return photoCv[id]; if (!D.photos[id]) return (photoCv[id] = null); const c = document.createElement('canvas'); c.width = c.height = 64; photoCv[id] = c; const im = new Image(); im.onload = () => { c.getContext('2d').drawImage(im, 0, 0); }; im.src = D.photos[id]; return c; },
  setPhoto(id, file) {                                                                                   // any picture → square, 64×64, dithered into the castle palette
    const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), s = Math.min(im.width, im.height); x.imageSmoothingEnabled = true; x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 64, 64);
      const d = x.getImageData(0, 0, 64, 64); for (let i = 0; i < d.data.length; i += 4) { const l = (d.data[i] * .3 + d.data[i + 1] * .59 + d.data[i + 2] * .11); const v = Math.min(255, Math.max(0, (l - 128) * 1.25 + 128)); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } x.putImageData(d, 0, 0); if (G.STYLE) G.STYLE.apply(x, 0, 0, 64, 64, 'castelo', { dither: 1 });
      D.photos[id] = c.toDataURL('image/png'); photoCv[id] = c; GM.save(); URL.revokeObjectURL(im.src); }; im.src = URL.createObjectURL(file); },
  clearPhoto(id) { delete D.photos[id]; delete photoCv[id]; GM.save(); },
  reset() { D.xp = 0; D.warrior = false; D.sigs = []; D.party = ['mago', 'arqueiro', 'clerigo', 'guerreiro']; GM.save(); },
  heroes: () => D.party.slice(),                                                                      // the 4 ACTIVE heroes: one per sound track
  owned: () => ['mago', 'arqueiro', 'clerigo', 'guerreiro'].concat(D.warrior || D.unlockAll ? ['warrior'] : []), bench: () => GM.owned().filter(h => !D.party.includes(h)), partyUnlocked: () => !!(D.warrior || D.unlockAll),
  swapParty(slot, hero) { const i = D.party.indexOf(hero); if (i >= 0) { D.party[i] = D.party[slot]; D.party[slot] = hero; } else D.party[slot] = hero; GM.save(); },
  pui: { mode: 'browse', carry: null, anim: null },
  get warrior() { return D.warrior || D.unlockAll; }, get ultSigs() { return D.sigs.length; },
  CLASSINFO: { mago: { name: 'Elf Wizard', col: '#3a8ac0' }, arqueiro: { name: 'Archer', col: '#7ab04e' }, clerigo: { name: 'Cleric', col: '#d8b43a' }, guerreiro: { name: 'Knight', col: '#e08a3a' }, warrior: { name: 'Warrior', col: '#b83a2a' } },
  front: 0, live: false, recT: 0,
  onTap(id) {                                                                                           // OCT± swaps the hero on Status; OCT+ opens the achievements from the Taverna
    const c = sim.cur; if (c.g === 'Party · Grupo' && id === 'sel') { GM.partySel(); return true; } if (c.g === 'Status' && id === 'sel') { const tl = A.gtile('Status'), i = tl ? Math.round(tl.k[0] * 5) : 0; GM.partyFrom(['mago', 'arqueiro', 'clerigo', 'guerreiro', 'warrior'][i] || 'mago'); return true; }
    if (c.tav && id === 'sel') { sim.tavHide = !sim.tavHide; const t = A.lcdbox.querySelector('.tav'); if (t) { t.classList.toggle('hide', sim.tavHide); const f = t.querySelector('.tfoot span'); if (f) f.textContent = 'SEL: ' + (sim.tavHide ? 'MOSTRA' : 'ESCONDE') + ' O MENU'; } return true; }
    if (!c.g) return false;
    if (c.g === 'Status' && (id === 'octm' || id === 'octp')) { const tl = A.gtile('Status'); if (tl) { const i = Math.round(tl.k[0] * 5), n = (i + (id === 'octp' ? 1 : -1) + 6) % 6; tl.k[0] = n / 5; tl.upd && tl.upd(); } return true; }
    if (c.g === 'Taverna · Fitas' && id === 'octp') { G.SIM.go({ g: 'Achievements' }, { force: true }); return true; }
    if (c.g === 'Achievements' && id === 'octm') { G.SIM.go({ g: 'Taverna · Fitas' }, { force: true }); return true; }
    return false;
  },
  onKnob(id, dir) {                                                                                      // the SELECT knob walks the tapes / the LED effects when those screens are open
    const c = sim.cur; if (id !== 'select' || !c.g) return false;
    if (c.g === 'Taverna · Fitas') { GM.pendingSel = clamp(GM.sel + dir, 0, TAPES.length - 1); GM.sel = GM.pendingSel; return true; }
    if (c.g === 'LED Effects') { const n = G.LEDFX.LIST().length, tl = A.gtile('LED Effects'), cur = tl ? Math.round(tl.k[0] * (n - 1)) : 0; GM.pendingLed = clamp(cur + dir, 0, n - 1); return true; }
    return false;
  },
};
// ---- XP sources ---------------------------------------------------------------------------------------------------------------------------------
let secs = 0, lastRec = 'off';
setInterval(() => { const S = G.Engine && G.Engine.S; if (!S || sim.off) return; if (S.playing) { secs++; if (secs >= 10) { secs = 0; GM.gain(5, 'tocando'); } } if (lastRec === 'rec' && S.rec.state !== 'rec') GM.gain(25, 'loop gravado'); lastRec = S.rec.state; }, 1000);
GM.onKey = () => { GM.gain(1); };

// ---- panel on the Simulador tab: XP, tapes, photos -------------------------------------------------------------------------------------------------
const panel = document.createElement('div'); panel.className = 'gamebox'; A.host.insertBefore(panel, A.host.querySelector('.simnote'));
function paintPanel() {
  if (!panel.isConnected) return; const lv = GM.level(), nx = GM.nextXP();
  panel.innerHTML = `<h4>Fitas e XP <small>tocar dá XP · o nível abre as fitas</small></h4>
   <div class="gr"><b>NV ${lv}</b><div class="xpb"><i style="width:${Math.round(GM.progress() * 100)}%"></i></div><span>${D.xp} XP${nx ? ' · próximo nível em ' + nx : ' · nível máximo'}</span>
    <div class="chips" id="gm-mode"><button data-v="0" class="${D.unlockAll ? '' : 'on'}">modo história (abre por nível)</button><button data-v="1" class="${D.unlockAll ? 'on' : ''}">todas as fitas liberadas</button></div>
    <button id="gm-100">+100 XP (testar)</button><button id="gm-reset">zerar</button></div>
   <div class="tapes">${TAPES.map((t, i) => { const lk = !GM.isUnlocked(t); return `<div class="tp ${lk ? 'lk' : ''} ${GM.sel === i ? 'on' : ''}" data-i="${i}"><div class="ph">${D.photos[t.id] ? `<img src="${D.photos[t.id]}">` : '<span>foto</span>'}</div><b>${t.title}</b><small>${t.genre} · ${lk ? '🔒 NV ' + t.lvl : 'liberada'}</small><div class="r"><label class="filebtn">foto do músico<input type="file" accept="image/*" data-f="${t.id}"></label>${D.photos[t.id] ? `<button data-x="${t.id}">×</button>` : ''}</div></div>`; }).join('')}</div>`;
  panel.querySelectorAll('#gm-mode button').forEach(b => b.onclick = () => { D.unlockAll = b.dataset.v === '1'; GM.save(); });
  $('#gm-100', panel).onclick = () => GM.gain(100, 'teste'); $('#gm-reset', panel).onclick = () => { if (confirm('Zerar o XP?')) GM.reset(); };
  panel.querySelectorAll('[data-f]').forEach(inp => inp.onchange = e => { const f = e.target.files[0]; if (f) GM.setPhoto(inp.dataset.f, f); });
  panel.querySelectorAll('[data-x]').forEach(b => b.onclick = () => GM.clearPhoto(b.dataset.x));
  panel.querySelectorAll('.tp').forEach(c => c.onclick = e => { if (e.target.closest('label,button')) return; const i = +c.dataset.i; GM.sel = i; GM.pendingSel = i; paintPanel(); });
}
paintPanel();

// ---- the user's own ultimate animation (replaces the whole screen) -------------------------------------------------------------------------------------
const ULT = G.ULT = { frames: {}, fps: {}, ready: {}, keys: ['all', 'mago', 'arqueiro', 'clerigo', 'guerreiro'], names: { all: 'todos os heróis', mago: 'mago', arqueiro: 'arqueiro', clerigo: 'clérigo', guerreiro: 'guerreiro' },
  meta: null, sheets: {}, cvs: {}, uhas: k => !!(ULT.frames[k] && ULT.frames[k].length),
  has: k => ULT.uhas(k) || !!(ULT.meta && ULT.meta[k]),
  dur: k => ULT.uhas(k) ? ULT.frames[k].length / (ULT.fps[k] || 12) : ULT.meta && ULT.meta[k] ? ULT.meta[k].n / ULT.meta[k].fps : 0,
  frame(k, t) {                                                                                         // the user's own upload wins; otherwise the dithered video sheet that ships with the lab
    if (ULT.uhas(k)) { const n = ULT.frames[k].length, i = Math.min(n - 1, Math.floor(Math.max(0, t) * (ULT.fps[k] || 12))); return ULT.ready[k] ? ULT.frames[k][i] : null; }
    const m = ULT.meta && ULT.meta[k]; if (!m) return null; let im = ULT.sheets[k]; if (!im) { im = ULT.sheets[k] = new Image(); im.src = 'ult/' + k + '.png'; } if (!im.complete || !im.naturalWidth) return null;
    const i = Math.min(m.n - 1, Math.floor(Math.max(0, t) * m.fps)), c = ULT.cvs[k] || (ULT.cvs[k] = Object.assign(document.createElement('canvas'), { width: 240, height: 240 })), x = c.getContext('2d'); x.imageSmoothingEnabled = false; const cl = m.cell || 240; x.drawImage(im, (i % m.cols) * cl, Math.floor(i / m.cols) * cl, cl, cl, 0, 0, 240, 240); return c; },
  async load() { try { const st = await G.Store.get('ult.v1', null); if (!st) return; for (const k of Object.keys(st)) { ULT.fps[k] = st[k].fps; ULT.ready[k] = false; ULT.frames[k] = await Promise.all(st[k].frames.map(u => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 240; c.getContext('2d').drawImage(im, 0, 0); ok(c); }; im.src = u; }))); ULT.ready[k] = true; } } catch (e) {} },
  async persist() { const o = {}; for (const k of Object.keys(ULT.frames)) if (ULT.has(k)) o[k] = { fps: ULT.fps[k], frames: ULT.frames[k].map(c => c.toDataURL('image/png')) }; await G.Store.set('ult.v1', o); },
  async set(k, file) {                                                                                  // GIF / animated WebP / PNG strip / video → 240×240 frames
    const frames = []; let fps = 12;
    const put = src => { const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, 240, 240); const w = src.videoWidth || src.displayWidth || src.naturalWidth || src.width, h = src.videoHeight || src.displayHeight || src.naturalHeight || src.height, s = Math.min(240 / w, 240 / h); x.drawImage(src, (240 - w * s) / 2, (240 - h * s) / 2, w * s, h * s); frames.push(c); };
    if (/^video\//.test(file.type)) { const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(file); await new Promise(ok => { v.onloadedmetadata = ok; }); const n = Math.min(60, Math.floor(v.duration * 12)); for (let i = 0; i < n; i++) { v.currentTime = i / 12; await new Promise(ok => { v.onseeked = ok; }); put(v); } }
    else if (/gif|webp/.test(file.type) && typeof ImageDecoder !== 'undefined') { const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type }); await dec.tracks.ready; const n = Math.min(90, dec.tracks.selectedTrack.frameCount); let dur = 0; for (let i = 0; i < n; i++) { const r = await dec.decode({ frameIndex: i }); dur += (r.image.duration || 83000) / 1e6; put(r.image); r.image.close(); } fps = clamp(Math.round(n / Math.max(.2, dur)), 4, 30); }
    else { const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); }); if (im.width >= im.height * 2 && im.width % im.height === 0) { const n = im.width / im.height; for (let i = 0; i < n; i++) { const c = document.createElement('canvas'); c.width = c.height = im.height; c.getContext('2d').drawImage(im, i * im.height, 0, im.height, im.height, 0, 0, im.height, im.height); put(c); } } else put(im); }
    if (!frames.length) return false; ULT.frames[k] = frames; ULT.fps[k] = fps; ULT.ready[k] = true; await ULT.persist(); return true;
  },
  async clear(k) { delete ULT.frames[k]; delete ULT.fps[k]; delete ULT.ready[k]; await ULT.persist(); },
  ui(box) {                                                                                             // the slot, drawn inside the Story side panel of a fight scene
    const paint = () => { box.innerHTML = '<div class="lab">golpe final · a sua animação (ocupa a tela toda)</div><p class="est">Envie um GIF, um WebP animado, uma tira de PNG (quadros quadrados lado a lado) ou um vídeo curto. Se não houver nenhuma, vale o golpe provisório.</p>' + ULT.keys.map(k => `<div class="ultrow"><span>${ULT.names[k]}</span>${ULT.has(k) ? `<canvas width="48" height="48"></canvas><small>${ULT.frames[k].length} quadros · ${ULT.dur(k).toFixed(1)} s</small><button data-x="${k}">tirar</button>` : '<small>vazio</small>'}<label class="filebtn">enviar<input type="file" accept="image/*,video/*" data-k="${k}"></label></div>`).join(''); box.querySelectorAll('canvas').forEach((cv, i) => { const k = ULT.keys.filter(q => ULT.has(q))[i]; cv.getContext('2d').drawImage(ULT.frames[k][0], 0, 0, 48, 48); }); box.querySelectorAll('[data-k]').forEach(inp => inp.onchange = async e => { const f = e.target.files[0]; if (f) { await ULT.set(inp.dataset.k, f); paint(); } }); box.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { await ULT.clear(b.dataset.x); paint(); }); };
    paint();
  } };
setTimeout(() => ULT.load(), 800); fetch('ult/ult.json').then(r => r.json()).then(j => { ULT.meta = j; Object.keys(j).forEach(k => { const im = ULT.sheets[k] = new Image(); im.src = 'ult/' + k + '.png'; }); }).catch(() => {});

// ---- during a recording: the fight on the LCD (faces + bars); on release: the hero in front lets the ULT go, full screen, no sound ----------------------
const css = document.createElement('style'); css.textContent = `.sim .lcdbox canvas.gmo,.scr3d .lcdbox canvas.gmo{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;display:none;z-index:8;pointer-events:none}.lcdbox.gm-on canvas.gmo{display:block}.lcdbox.gm-on>*:not(.gmo):not(.stv):not(.gmpop){visibility:hidden}
.gmpop{position:absolute;left:8px;right:8px;top:8px;z-index:9;background:#1e1418;border:2px solid #e0b84a;box-shadow:0 0 0 2px #000,0 6px 18px #000a;padding:6px 8px;font:11px/1.25 'Pixelify Sans',monospace;color:#f2e2c4;text-align:center;pointer-events:none;animation:gmin .35s cubic-bezier(.16,1,.3,1)}.gmpop b{display:block;font-size:14px;color:#e0b84a;letter-spacing:.06em}.gmpop i{font-style:normal;color:#f0c860}@keyframes gmin{from{transform:translateY(-30px);opacity:0}to{transform:none;opacity:1}}.gmpop.out{animation:gmout .4s cubic-bezier(.5,0,.9,.4) forwards}@keyframes gmout{from{transform:none;opacity:1}to{transform:translateY(-34px);opacity:0}}`; document.head.append(css);
const lcdbox = A.lcdbox, ov = Object.assign(document.createElement('canvas'), { width: 240, height: 240, className: 'gmo' }); lcdbox.append(ov);
const OV = { mode: '', t0: 0, key: '', endT: 0 };
const sigNow = () => { const S = G.Engine.S; try { const j = JSON.stringify([S.tracks.map(t => t.pat), S.drum]); let h = 0; for (let i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0; return String(h); } catch (e) { return String(Math.random()); } };
function popup(h, l1, l2) {                                                                              // every notice: slides in, stays, slides out; gone after 4 s in total
  const d = document.createElement('div'); d.className = 'gmpop'; d.innerHTML = `<b>${h}</b>${l1 ? l1 + '<br>' : ''}${l2 ? '<i>' + l2 + '</i>' : ''}`; lcdbox.append(d); setTimeout(() => d.classList.add('out'), 3600); setTimeout(() => d.remove(), 4000); }
function afterUlt() {                                                                                    // 2 s after the video ends: the achievement pops up on the music screen (never over the ULT)
  OV.mode = ''; lcdbox.classList.remove('gm-on'); const sig = OV.sig;
  setTimeout(() => { if (D.sigs.includes(sig) || D.warrior) return; D.sigs.push(sig); const n = D.sigs.length;
    if (n >= 3) { D.warrior = true; GM.save(); popup('Sistema de party liberado', '', 'Acesse pela tela de status ou menu.'); }
    else { GM.save(); popup('CONQUISTA ' + n + '/3', 'Você ultrapassou seus limites.', 'Continue assim e libere o WARRIOR'); } }, 2000);
}
function startUlt() { const h = GM.heroes(), key = h[GM.front] || h[0]; OV.mode = 'ult'; OV.t0 = performance.now(); OV.key = key; OV.sig = sigNow(); lcdbox.classList.add('gm-on'); }
let wasRec = false, recT0 = 0;
setInterval(() => {
  const S = G.Engine && G.Engine.S; if (!S || sim.off || (G.STORYMODE && G.STORYMODE.playing())) return; const r = S.rec.state === 'rec';
  if (r && !wasRec) { recT0 = performance.now(); GM.bossN = (GM.bossN || 0) + 1; GM.front = Math.floor(Math.random() * GM.heroes().length); GM.live = true; OV.mode = 'fight'; lcdbox.classList.add('gm-on'); }
  if (!r && wasRec) { GM.live = false; if ((performance.now() - recT0) / 1000 >= 3.2) startUlt(); else { OV.mode = ''; lcdbox.classList.remove('gm-on'); } }
  wasRec = r;
}, 80);
(function loop(now) {
  requestAnimationFrame(loop); if (!OV.mode || !A.host.offsetParent) return; const x = ov.getContext('2d');
  if (OV.mode === 'fight') { GM.recT = (performance.now() - recT0) / 1000; G.SCENES.render(ov, 'fight', GM.recT, { gravacao: 1 }, { wire: false, band: true, nohud: true, live: true, front: GM.front, music: true, vt: 99, boss: ((GM.bossN || 1) - 1) % 2 ? 'wyvern' : 'slime' }); }
  else if (OV.mode === 'ult') { const t = (performance.now() - OV.t0) / 1000, fr = ULT.frame(OV.key, t); if (fr) { x.imageSmoothingEnabled = false; x.drawImage(fr, 0, 0); } if (t >= ULT.dur(OV.key) + .15 && ULT.dur(OV.key) > 0) afterUlt(); else if (t > 3 && ULT.dur(OV.key) === 0) afterUlt(); }
})(0);

// the Tavern menu's background: the same animated room as the hub
let tavT = 0;
let tavShift = 0;                                                                                       // the room slides left while the menu box is open, so the stage and the fireplace stay in view
(function tloop(now) { requestAnimationFrame(tloop); if (!sim.cur.tav || !A.host.offsetParent || now - tavT < 66) return; tavT = now; tavShift += ((sim.tavHide ? 0 : 58) - tavShift) * .35; const cv = lcdbox.querySelector('.tav .tbg'); if (cv) G.SCENES.render(cv, 'tavern', now / 1000, {}, { wire: false, band: true, nohud: true, nofoot: true, shift: tavShift }); })(0);

// ---- Party screen controls: KNOB 1 moves the cursor over the cards (4 active + the bench), SEL picks a card up, SEL again drops it on another card: the two swap places
GM.plist = () => GM.heroes().concat(GM.bench());
GM.partySel = () => {
  const u = GM.pui, tl = A.gtile('Party · Grupo'); if (!tl || !GM.partyUnlocked() || u.anim) return; const L = GM.plist(), M = L.length, ci = clamp(Math.round(tl.k[0] * (M - 1)), 0, M - 1);
  if (u.mode === 'browse') { u.mode = 'carry'; u.from = ci; u.t0 = performance.now(); return; }
  if (ci === u.from || (ci >= 4 && u.from >= 4)) { u.mode = 'browse'; return; }                              // dropped where it was: nothing changes
  u.mode = 'browse'; u.anim = { t0: performance.now(), from: u.from, to: ci };
  setTimeout(() => { const a = u.anim; if (!a) return; const P = GM.plist(), ha = P[a.from], hb = P[a.to]; if (a.from < 4 && a.to < 4) { D.party[a.from] = hb; D.party[a.to] = ha; } else { const slot = Math.min(a.from, a.to), inn = P[Math.max(a.from, a.to)]; D.party[slot] = inn; } GM.save(); u.anim = null; const nl = GM.plist(), j = nl.indexOf(ha); tl.k[0] = nl.length > 1 ? clamp(j, 0, nl.length - 1) / (nl.length - 1) : 0; tl.upd && tl.upd(); }, 640);
};
// from a hero's STATUS page: open the party screen with that hero already picked up (choose who takes the place)
GM.partyFrom = id => {
  const u = GM.pui; u.anim = null; u.mode = 'browse'; G.SIM.go({ g: 'Party · Grupo' }, { force: true }); const tl = A.gtile('Party · Grupo'), L = GM.plist(), i = L.indexOf(id);
  if (tl && GM.partyUnlocked() && i >= 0) { tl.k[0] = L.length > 1 ? i / (L.length - 1) : 0; tl.upd && tl.upd(); u.mode = 'carry'; u.from = i; u.t0 = performance.now(); }
};
})(window);
