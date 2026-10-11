// FM1 Quest lab — the VILLAGE walk at the start of the adventure:
//   · the hour is drawn when the device is switched on (dawn and sunset are the favourites; afternoon and night are rarer)
//   · the party walks the village for N seconds (menu → "Config · Aventura": 5 to 60 s; above that they stay in town), then the story goes on into the forest (slimes and bats)
//   · while they walk, the music starts: the loop blocks of the 4 tracks (one row per hero) fill the lower panel, one hero joining at a time
(function (G) {
'use strict';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), LS = 'fm1lab.vila';
const CFG = { seg: 20, hora: 'sorteio' };                       // seg: 5..60, 61 = "só na vila"; hora: sorteio | amanhecer | tarde | poente | noite
try { Object.assign(CFG, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(CFG)); } catch (e) {} };
const SEGS = [5, 10, 15, 20, 30, 45, 60, 61], HORAS = ['sorteio', 'amanhecer', 'tarde', 'poente', 'noite'];      // the two rows of the Settings menu (js/engine.js MENU_DEFS: VILLAGE WALK, START HOUR)
function menuSync(fromMenu) {
  const E = G.Engine; if (!E) return; const v = E.S.menu.vals;
  if (fromMenu) { const s = SEGS[v['VILLAGE WALK']], h = HORAS[v['START HOUR'] || 0]; if (s != null && (s !== CFG.seg || h !== CFG.hora)) { CFG.seg = s; CFG.hora = h; save(); } }
  else { v['VILLAGE WALK'] = Math.max(0, SEGS.indexOf(CFG.seg)); v['START HOUR'] = Math.max(0, HORAS.indexOf(CFG.hora)); }
}
setTimeout(() => menuSync(false), 0);
const MODES = [{ name: 'amanhecer', tod: 0, w: .35, label: 'amanhecer' }, { name: 'tarde', tod: .27, w: .15, label: 'tarde' }, { name: 'poente', tod: .62, w: .35, label: 'poente' }, { name: 'noite', tod: .86, w: .15, label: 'noite' }];
const TODB = G.TODB = { modes: MODES, cur: MODES[0], pick(force) { const f = force || (CFG.hora !== 'sorteio' ? CFG.hora : null); let m = MODES.find(x => x.name === f); if (!m) { let r = Math.random(), a = 0; m = MODES[MODES.length - 1]; for (const x of MODES) { a += x.w; if (r < a) { m = x; break; } } } TODB.cur = m; return m; } };
TODB.pick();

// ---- state of the village phase -------------------------------------------------------------------------------------------------------------------------
const V = { inTown: false, t0: 0, started: false, demo: false };
const HERO_COL = ['#3a8ac0', '#7ab04e', '#d8b43a', '#e08a3a'], HERO = ['mago', 'arqueiro', 'clerigo', 'guerreiro'], JOIN = [1, 5, 9, 13];       // each hero joins the loop at these seconds of the walk

function music(on, tt) {                                                                                  // starts the engine and brings the 4 tracks in one by one ('all' = everybody in)
  const E = G.Engine; if (!E) return; const S = E.S, set = (i, bits, degs) => bits.split('').forEach((c, k) => { if (c === '1') { S.tracks[i].pat[k] = degs[k % degs.length]; S.tracks[i].pat[k + 16] = degs[(k + 2) % degs.length]; } });
  if (on === 'all') { S.tracks.forEach(x => { x.mute = false; }); try { E.applyMix(); } catch (e) {} return; }
  if (!V.started) { V.started = true; if (E.trackActivity(1) <= 2) set(1, '0010000100100100', [0, 2, 4]); if (E.trackActivity(2) <= 2) set(2, '1000000010000000', [0, 4]);   // a sparse starter pattern gets a little more life
    S.tracks.forEach((x, i) => { x.mute = i > 0; }); try { E.applyMix(); if (!S.playing) E.play(); } catch (e) {} }
  S.tracks.forEach((x, i) => { const m = tt < JOIN[i]; if (x.mute !== m) { x.mute = m; try { E.applyMix(); } catch (e) {} } });
}
// the 4 rows of loop blocks: what each track really plays (drums for the warrior's row), 16 steps, a playhead that follows the engine
function rowsOf() {
  const E = G.Engine, S = E && E.S, r = [];
  for (let i = 0; i < 4; i++) { let bits; if (E && i < 3) bits = E.patString(i).padEnd(16, '0').slice(0, 16); else if (E) { bits = ''; for (let k = 0; k < 16; k++) bits += S.drum[0][k] || S.drum[2][k] || S.drum[4][k] ? '1' : '0'; } else bits = '1010101010101010'; r.push(bits); }
  return r;
}
function panel(g, t, P, o, H) {                                                                           // draws into the 240×80 strip under the picture
  const E = G.Engine, vis = E && E.visual ? E.visual() : null, step = vis && vis.playing ? vis.step : t * 8, ph = Math.floor(((step % 16) + 16) % 16), fb = ((step % 1) + 1) % 1, rows = rowsOf(), y0 = H + 4, tt = o.vt != null ? o.vt : t;
  const R = (x, y, w, h, c) => { g.c.fillStyle = c; g.c.fillRect(Math.round(x), Math.round(y), w, h); };
  for (let i = 0; i < 4; i++) {
    const y = y0 + i * 17, on = tt >= JOIN[i], u = clamp((tt - JOIN[i]) / .8, 0, 1), col = HERO_COL[i], pc = G.PORTRAITS && G.PORTRAITS.cv ? G.PORTRAITS.cv(HERO[i], 1) : null;
    R(5, y - 1, 15, 16, on ? col : '#3a3040'); if (pc) { g.c.save(); g.c.imageSmoothingEnabled = false; g.c.globalAlpha = on ? 1 : .35; g.c.drawImage(pc, 6, y, 13, 14); g.c.restore(); } else R(6, y, 13, 14, '#2a2230');
    for (let k = 0; k < 16; k++) {
      const x = 25 + k * 12, act = rows[i][k] === '1', head = k === ph, appear = on ? clamp(u * 16 - k * .6, 0, 1) : 0;
      R(x, y, 11, 14, '#14101a'); R(x + 1, y + 1, 9, 12, head ? '#3a3050' : '#241c2c');
      if (act && on) { const h = Math.round(12 * (head ? 1 : .8) * appear); R(x + 1, y + 13 - h, 9, h, head ? '#fff6c8' : col); if (h > 3) R(x + 1, y + 13 - h, 9, 1, head ? '#ffffff' : '#ffffff55'); if (head) R(x - 1, y - 1, 13, 1, col); }
      else if (head) R(x + 1, y + 1, 9, 1, on ? col : '#4a4058');
    }
  }
  g.txt('LOOP', 221, y0 + 2, '#a89080', { sz: 8, nofit: true }); g.txt(String(ph + 1).padStart(2, '0') + '/16', 217, y0 + 14, '#e0b84a', { sz: 8, nofit: true });
  for (let i = 0; i < 4; i++) g.R(218 + i * 5, y0 + 30, 4, 4, tt >= JOIN[i] ? HERO_COL[i] : '#3a3040');
  g.txt('faixas', 218, y0 + 38, '#7a6a68', { sz: 7, nofit: true });
}

// ---- the story player calls these ------------------------------------------------------------------------------------------------------------------------
G.VILA = { CFG, save, V, panel, TODB, JOIN,
  onStart() { menuSync(true); TODB.pick(); V.inTown = false; V.started = false; if (G.STORY) { G.STORY.hold = null; G.STORY.music = false; } },
  onStop() { if (G.STORY) { G.STORY.hold = null; G.STORY.music = false; } V.inTown = false; },
  // returns true when it moved the clock (the scene changed)
  tick(SM, dt) {
    const ST = G.STORY; if (!ST || !ST.ST) return false; menuSync(true); if (SM.ff) { ST.hold = null; V.inTown = false; music('all'); return false; } const loc = ST.locate(SM.T), sc = ST.ST.scenes[loc.i]; if (!sc) return false;
    if (sc.type !== 'street') { if (V.inTown) { V.inTown = false; ST.hold = null; } return false; }
    if (!V.inTown) { V.inTown = true; ST.music = true; V.t0 = loc.t; ST.hold = { i: loc.i, t: loc.t, start: loc.start, music: true }; V.fin = false; }
    ST.hold.t = Math.max(0, ST.hold.t + dt * (SM.ff ? 6 : 1)); const tt = ST.hold.t; music(true, tt);
    if (CFG.seg <= 60 && tt >= CFG.seg) { music('all');                                                                  // leaves the village into the forest (slimes and bats): the next "walk" scene
      const sts = ST.starts(), j = ST.ST.scenes.findIndex((x, i) => i > loc.i && x.type === 'walk'), to = j >= 0 ? j : loc.i + 1; ST.from = { s: sc, tt, toI: to }; ST.hold = null; V.inTown = false; SM.T = (sts[to] != null ? sts[to] : loc.start + sc.dur) + .01; return true; }
    SM.T = loc.start + clamp(tt, 0, sc.dur - .2); if (SM.T < loc.start) SM.T = loc.start;           // the scene's own clock is held while we walk (time can go past its length)
    return false;
  } };
['street', 'grave', 'vista', 'walk', 'fight'].forEach(k => { const sc = G.SCENES && G.SCENES.SCENES && G.SCENES.SCENES[k]; if (sc) sc.panel = panel; });   // the loop panel shows under the picture in the village, the forest and the boss fight
})(window);
