// FM1 Quest lab — story mode inside the simulator: the opening (the Story tab's scenes) plays on the LCD when the device boots, in sync with the boot jingle.
//   OCT+  = skip (VHS fast-forward icon) · OCT− = back to the start of the scene · SELECT knob = rewind / advance scene by scene with a VHS glitch
//   Any other button opens its Quest screen as a popup over the story (the story dims and keeps running); keys, loops and effects keep working underneath.
(function (G) {
'use strict';
const SIM = G.SIM, ST = G.STORY; if (!SIM || !ST || !ST.renderTo) return;
const A = SIM.api, sim = SIM.sim, lcdbox = A.lcdbox, $ = (s, r) => (r || document).querySelector(s), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const css = document.createElement('style'); css.textContent = `.sim .lcdbox canvas.stv,.scr3d .lcdbox canvas.stv{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;display:none;z-index:6;pointer-events:none;transition:filter .25s}
.lcdbox.stv-on canvas.stv{display:block}.lcdbox.stv-on>*:not(.stv){visibility:hidden}
.lcdbox.stv-on.stv-pop canvas.stv{filter:brightness(.42) saturate(.7)}
.lcdbox.stv-on.stv-pop>*:not(.stv){visibility:visible;position:relative;z-index:7;transform-origin:50% 50%;transform:scale(.86);box-shadow:0 0 0 2px #1e1418,0 0 0 4px #c8963c,0 8px 24px #000b}`;
document.head.append(css);
const cv = document.createElement('canvas'); cv.width = cv.height = 240; cv.className = 'stv'; lcdbox.append(cv); const ctx = cv.getContext('2d'), tmp = document.createElement('canvas'); tmp.width = tmp.height = 240; const tx = tmp.getContext('2d');
const SM = { on: true, playing: false, T: 0, last: 0, ff: 0, vhs: 0, vdir: 1, pop: 0, wasBoot: false, jump: null, rate: 1, dirHeld: 0, spd: 2, skip0: null, min: null };
const SPEEDS = [2, 3, 4, 6, 8, 12];                                                     // the speed filter of OCT+ / OCT−, set with KNOB 4
try { SM.on = localStorage.getItem('fm1lab.storymode') !== '0'; } catch (e) {}

function start() { if (!SM.on || !ST.ST || !ST.ST.scenes.length) return; if (G.VILA) G.VILA.onStart(); SM.playing = true; SM.T = -3; SM.ff = 0; SM.vhs = 0; SM.pop = 0; SM.jump = null; SM.rate = 1; SM.dirHeld = 0; { const i0 = ST.ST.scenes.findIndex(s => s.type !== 'tavern'); SM.skip0 = i0 > 0 ? i0 : null; SM.min = null; } lcdbox.classList.remove('stv-on', 'stv-pop'); }   // the opening waits 3 s: the title and the boot wave play first
function stop() { if (G.VILA) G.VILA.onStop(); SM.playing = false; SM.ff = 0; SM.pop = 0; lcdbox.classList.remove('stv-on', 'stv-pop'); }
const glitch = dir => { SM.vhs = 1; SM.vdir = dir || 1; };
function skip() { if (!SM.playing) return; SM.ff = 1; glitch(1); }
function toScene(d) {                                                                    // one scene back / forward, with the VHS glitch
  const loc = ST.locate(SM.T), st = ST.starts(), n = st.length; let i = loc.i;
  if (d < 0) { i = loc.t > 1.2 ? i : Math.max(0, i - 1); } else i = i + 1;
  if (i >= n) { SM.ff = 1; glitch(1); return; } SM.T = st[i] + .01; glitch(d); }
// ---- hooks called by the simulator ----
G.STORYMODE = {
  on: () => SM.on, playing: () => SM.playing, state: SM, start, stop, skip,
  // OCT+ / OCT−: hold to run the opening (and the walk through the village) forward / backward; let go and it slows down quickly back to normal speed, right where you are
  onDown(id) { if (!SM.playing || SM.pop || SM.T < 0 || (id !== 'octp' && id !== 'octm')) return false; SM.dirHeld = id === 'octp' ? 1 : -1; return true; },
  onUp(id) { if (id === 'octp' || id === 'octm') SM.dirHeld = 0; },
  onTap(id) { return SM.playing && !SM.pop && (id === 'octp' || id === 'octm'); },
  // KNOB 4 sets how fast that fast-forward / rewind is
  onKnob(id, dir) { if (!SM.playing || SM.pop || id !== 'k4') return false; SM.spd = clamp(SM.spd + dir, 0, SPEEDS.length - 1); SM.spdShow = performance.now(); return true; },
  onGo(tgt, opt) { if (!SM.playing || sim.booting || (opt && opt.boot) || !tgt || tgt.q === 'title') return; lcdbox.classList.add('stv-pop'); SM.pop = performance.now() + 5200; },
};
// ---- VHS glitch drawn over the frame ----
function vhsFX(k, dir, now) {
  tx.clearRect(0, 0, 240, 240); tx.drawImage(cv, 0, 0); const H = 240;
  for (let y = 0; y < H; y += 3) { const r = Math.sin(y * 12.9898 + now * .02) * 43758.5453, f = r - Math.floor(r); if (f < .5 * k) { const dx = Math.round((f - .25) * 40 * k); ctx.drawImage(tmp, 0, y, 240, 3, dx, y, 240, 3); } }
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(40,0,70,${.25 * k})`; ctx.fillRect(0, 0, 240, H); ctx.globalCompositeOperation = 'source-over';
  const by = ((now * .25) % (H + 40)) - 20; ctx.fillStyle = `rgba(255,255,255,${.22 * k})`; ctx.fillRect(0, by, 240, 5 + k * 4);
  for (let i = 0; i < 70 * k; i++) { ctx.fillStyle = Math.random() > .5 ? '#fff' : '#000'; ctx.fillRect(Math.random() * 240, Math.random() * H, 2 + Math.random() * 10, 1); }
  // the icon: two triangles, blinking
  if (((now / 180) | 0) % 2 === 0 || k > .6) { const x0 = dir > 0 ? 196 : 22, s = dir > 0 ? 1 : -1; ctx.fillStyle = '#000'; for (let i = 0; i < 2; i++) { const x = x0 + i * 15 * s; ctx.beginPath(); ctx.moveTo(x - 1 * s, 11); ctx.lineTo(x + 15 * s, 22); ctx.lineTo(x - 1 * s, 33); ctx.fill(); } ctx.fillStyle = '#f2e2c4'; for (let i = 0; i < 2; i++) { const x = x0 + i * 15 * s; ctx.beginPath(); ctx.moveTo(x + 1 * s, 14); ctx.lineTo(x + 12 * s, 22); ctx.lineTo(x + 1 * s, 30); ctx.fill(); } }
}
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.1, (now - SM.last) / 1000); SM.last = now;
  const boot = !!sim.booting, vis = !!A.host.offsetParent; if (boot && !SM.wasBoot && vis) start(); SM.wasBoot = boot;
  if (vis && !SM.first) { SM.first = true; if (!sim.off && !SM.playing) start(); }                     // the page booted while another tab was in front: play the opening the first time the simulator is shown
  if (sim.off && SM.playing) stop(); if (!SM.playing || !A.host.offsetParent) return;
  if (SM.pop && now > SM.pop) { SM.pop = 0; lcdbox.classList.remove('stv-pop'); }
  const total = ST.total(); const target = SM.dirHeld ? SM.dirHeld * SPEEDS[SM.spd] : 1; SM.rate += (target - SM.rate) * (1 - Math.exp(-dt * (SM.dirHeld ? 7 : 16))); if (Math.abs(SM.rate - target) < .02) SM.rate = target;
  const dtE = dt * SM.rate; SM.T += SM.ff ? dt * Math.max(12, (total - SM.T) / 1.1) : dtE;
  if (SM.T >= 0 && SM.skip0 != null) { SM.T = ST.starts()[SM.skip0] + .01; SM.min = SM.T - .01; SM.skip0 = null; }
  if (SM.min != null && SM.T < SM.min) SM.T = SM.min;
  if (SM.T < 0) return; if (!lcdbox.classList.contains('stv-on')) lcdbox.classList.add('stv-on');
  if (SM.T >= total - .05) { stop(); return; }
  if (SM.ff) { SM.ff += dt; glitch(1); }
  if (G.VILA && !SM.pop) G.VILA.tick(SM, SM.ff ? dt : dtE);
  ST.renderTo(cv, SM.T, { wire: false });
  if (Math.abs(SM.rate - 1) > .25 || (SM.spdShow && now - SM.spdShow < 1400)) {                      // a small pixel readout of the speed filter
    const fwd = SM.rate >= 1, txt = (SM.dirHeld || Math.abs(SM.rate - 1) > .25 ? (SM.rate < 0 ? '\u25C2\u25C2 ' : '\u25B8\u25B8 ') : 'x ') + '\u00D7' + SPEEDS[SM.spd]; ctx.save(); ctx.fillStyle = 'rgba(14,10,16,.8)'; ctx.fillRect(176, 5, 59, 15); ctx.strokeStyle = '#c8963c'; ctx.strokeRect(176.5, 5.5, 58, 14); ctx.fillStyle = '#f0c860'; ctx.font = '10px "Pixelify Sans", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(txt, 205, 13); ctx.restore();
  }
  if (SM.vhs > 0) { vhsFX(SM.ff ? .85 : SM.vhs, SM.vdir, now); if (!SM.ff) SM.vhs = Math.max(0, SM.vhs - dt * 2.4); }
}
requestAnimationFrame(frame);
// switch in the faceplate panel
const boot = $('#s-boot'); if (boot) { boot.insertAdjacentHTML('afterend', '<label class="sv" title="ao ligar, a abertura da aba Story toca no visor (OCT+ pula)"><input type="checkbox" id="s-story"> abertura em história</label>'); const cb = $('#s-story'); cb.checked = SM.on; cb.onchange = () => { SM.on = cb.checked; try { localStorage.setItem('fm1lab.storymode', SM.on ? '1' : '0'); } catch (e) {} if (!SM.on) stop(); }; }
})(window);
