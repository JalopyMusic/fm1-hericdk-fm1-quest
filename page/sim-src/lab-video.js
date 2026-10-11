// FM1 Quest lab — Ferramentas: video → dithered pixel art (for cinematic scenes). Source = a video file or a storyboard scene.
// Crop · trim · colour/dither ranges · ready-made looks (the map palettes included) · playback box · frame-by-frame editing with propagation and undo/redo · size estimate · export.
(function (G) {
'use strict';
const host = document.getElementById('tools'); if (!host || !G.PXE) return;
const PX = G.PX, PXE = G.PXE, Store = G.Store, SC = G.SCENES, STY = G.STYLE, RIG = G.RIG;
const $ = (s, r) => (r || host).querySelector(s), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, hex2 = PX.hex2rgb, fmtB = n => n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB';
const down = (name, url) => { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); };

// ---------------------------------------------------------------- palettes
const PALETTES = { tavern: ['TAVERN · 16 cores do aparelho', PX.PAL], gameboy: ['Game Boy · 4 verdes', ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']], onebit: ['1 bit · preto e branco', ['#101010', '#f4f4f4']], sepia: ['Sépia · 5 tons', ['#1c120c', '#4a3320', '#7a5a38', '#b08a5a', '#e8d0a0']] };
if (STY) Object.entries(STY.PALS).forEach(([k, p]) => { PALETTES['mapa_' + k] = ['Mapa · ' + p.name, p.tones.concat(STY.LIGHT)]; });
const palOf = name => PALETTES[name] ? PALETTES[name][1] : PALETTES.tavern[1];
const SIZES = { '240x240': 'tela cheia 240×240 (1:1)', '160x160': '160×160 (1:1)', '120x120': '120×120 (1:1, arte da abertura)', '60x60': '60×60 (1:1, para ocupar pouco espaço)' };

// ---------------------------------------------------------------- state
const V = { w: 240, h: 240, fps: 8, kind: 'video', video: null, dur: 0, vw: 0, vh: 0, pt: 0, frames: [], pal: 'tavern', fi: 0, play: true, hist: [], fut: [], last: null, busy: false, cancel: false, scene: 'town', zoom: 1, px: .5, py: .5 };
const S = { bri: 0, con: 110, sat: 100, gam: 100, dith: 70, type: 'bayer4', scan: 0, chroma: 0, vig: 0, max: 60 };

// ---------------------------------------------------------------- UI
const sec = (t, sub) => { const d = el('div', 'edsec'); d.innerHTML = `<h3>${t}</h3>${sub ? `<p class="sub2">${sub}</p>` : ''}`; host.prepend(d); return d; };
// build in reading order (prepend reverses, so create bottom → top)
const sEdit = sec('4 · Editar quadro a quadro', 'Escolha um quadro, retoque com o lápis, o balde ou as formas. Com “propagar”, o mesmo traço é aplicado também nos quadros seguintes (por exemplo para tapar uma legenda ou acender uma janela em toda a cena). Desfazer e refazer valem para o clipe inteiro.');
const sOut = sec('3 · Resultado', 'Caixa de reprodução do clipe convertido, com o tamanho estimado no aparelho. O slot de sample (USR) tem 80 KiB; a flash do aparelho está praticamente cheia, então clipes longos precisam de RLE/delta ou de ficar no computador.');
const sStyle = sec('2 · Estilo (faixas e efeitos)', 'Cada faixa é um controle: brilho, contraste, saturação, gama, quantidade de dither; efeitos de linhas de varredura, deslocamento de cor e vinheta. Os botões aplicam um “visual” pronto; as paletas dos mapas usam a mesma luz laranja dos cenários.');
const sSrc = sec('1 · Origem, recorte e corte de tempo');
sSrc.insertAdjacentHTML('beforeend', `<div class="edrow"><label>origem <select id="vd-kind"><option value="video">arquivo de vídeo</option><option value="scene">cena do storyboard</option></select></label>
  <label class="filebtn" id="vd-filel">escolher vídeo<input type="file" id="vd-file" accept="video/*"></label><label id="vd-scenel" hidden>cena <select id="vd-scene">${Object.entries(SC ? SC.SCENES : {}).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></label>
  <label>tamanho final <select id="vd-size">${Object.entries(SIZES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><span class="sv" id="vd-info">nenhum vídeo carregado — use “cena do storyboard” para testar</span></div>
  <div class="edcols"><div class="edcol"><canvas id="vd-src" class="vdcv"></canvas><div class="edrow"><label>posição <input type="range" id="vd-pt" min="0" max="1000" value="0"></label><output id="vd-pto">0.0 s</output><button id="vd-srcplay" class="on">▶ play</button></div></div>
  <div class="edcol side"><div class="edbox"><b>recorte</b><div class="edrow"><label>zoom <input type="range" id="vd-zoom" min="1" max="4" step=".05" value="1"></label><label>x <input type="range" id="vd-cx" min="0" max="1" step=".01" value=".5"></label><label>y <input type="range" id="vd-cy" min="0" max="1" step=".01" value=".5"></label></div></div>
  <div class="edbox"><b>corte de tempo</b><div class="edrow"><label>início <input type="range" id="vd-ta" min="0" max="1000" value="0"></label><label>fim <input type="range" id="vd-tb" min="0" max="1000" value="1000"></label></div><div class="edrow"><label>quadros por segundo <input type="range" id="vd-fps" min="2" max="15" value="8"></label><output id="vd-fpso">8</output><label>máx. de quadros <input type="range" id="vd-max" min="4" max="150" value="60"></label><output id="vd-maxo">60</output></div><div class="est" id="vd-trim"></div></div></div></div>`);
sStyle.insertAdjacentHTML('beforeend', `<div class="edrow" id="vd-presets"></div>
  <div class="edcols"><div class="edcol side" style="max-width:640px"><div class="edbox"><b>faixas</b>
   ${[['bri', 'brilho', -100, 100], ['con', 'contraste', 40, 300], ['sat', 'saturação', 0, 250], ['gam', 'gama', 40, 220], ['dith', 'dither', 0, 100], ['scan', 'linhas de varredura', 0, 100], ['chroma', 'deslocar o vermelho (px)', 0, 6], ['vig', 'vinheta', 0, 100]].map(([k, l, a, b]) => `<div class="edrow"><label style="min-width:170px">${l}</label><input type="range" data-s="${k}" min="${a}" max="${b}" value="${S[k]}" style="flex:1"><output>${S[k]}</output></div>`).join('')}
   <div class="edrow"><label style="min-width:170px">tipo de dither</label><select id="vd-type"><option value="none">nenhum</option><option value="bayer2">Bayer 2×2</option><option value="bayer4" selected>Bayer 4×4</option><option value="bayer8">Bayer 8×8</option><option value="fs">Floyd–Steinberg</option><option value="atk">Atkinson</option><option value="noise">ruído</option></select></div>
   <div class="edrow"><label style="min-width:170px">paleta</label><select id="vd-pal">${Object.entries(PALETTES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div>
   <div class="edcol"><canvas id="vd-prev" class="vdcv"></canvas><div class="edrow"><button id="vd-stplay" class="on">▶ play</button><span class="est">pré-visualização com o estilo: rode o vídeo para ver como fica em movimento (atualiza ao mexer)</span></div></div></div>`);
sOut.insertAdjacentHTML('beforeend', `<div class="edrow"><button id="vd-go" class="on">converter</button><button id="vd-stop" hidden>cancelar</button><progress id="vd-prog" value="0" max="1" hidden></progress><span class="sv" id="vd-stat"></span></div>
  <div class="edcols"><div class="edcol"><canvas id="vd-play" class="vdcv"></canvas><div class="edrow"><button id="vd-pl" class="on">▶</button><input type="range" id="vd-fr" min="0" max="0" value="0" style="flex:1;min-width:200px"><output id="vd-fro">—</output></div></div>
  <div class="edcol side"><div class="edbox"><b>tamanho estimado</b><div class="est" id="vd-est">converta um clipe para ver</div></div>
   <div class="edbox"><b>arquivos</b><div class="edrow"><button id="vd-save">salvar neste navegador</button><button id="vd-load">carregar o salvo</button></div><div class="edrow"><button id="vd-png">folha PNG</button><button id="vd-gif">GIF animado</button><button id="vd-json">JSON (RLE)</button></div></div></div></div>`);
sEdit.insertAdjacentHTML('beforeend', `<div class="edrow"><button id="vd-u">↶ desfazer</button><button id="vd-r">↷ refazer</button><label><input type="checkbox" id="vd-prop"> propagar o traço para os próximos</label><label>quantos <input type="range" id="vd-propn" min="1" max="60" value="8"></label><output id="vd-propo">8</output><span class="sv" id="vd-hist"></span></div><div class="frames" id="vd-strip"></div><div id="vd-ed"></div>`);
// the whole section order (prepend reversed it): put them in reading order
[sSrc, sStyle, sOut, sEdit].forEach(s => host.append(s));

// ---------------------------------------------------------------- source frames
const srcCv = $('#vd-src'), prevCv = $('#vd-prev'), playCv = $('#vd-play'), work = document.createElement('canvas'), tmpScene = document.createElement('canvas'); tmpScene.width = tmpScene.height = 240;
function cropRect(sw, sh) { const c = Math.min(sw, sh) / V.zoom; return [(sw - c) * V.px, (sh - c) * V.py, c, c]; }          // always 1:1: a square cut of the picture
async function seek(t) { const v = V.video; if (!v) return; await new Promise(res => { const f = () => { v.removeEventListener('seeked', f); res(); }; v.addEventListener('seeked', f); v.currentTime = clamp(t, 0, Math.max(0, V.dur - .001)); setTimeout(res, 800); }); }
function sourceImage(t) { if (V.kind === 'scene') { const sc = SC.SCENES[V.scene]; SC.render(tmpScene, V.scene, clamp(t, 0, sc.dur), {}, { wire: false, band: false, pal: 'original' }); return [tmpScene, 240, 240]; } if (!V.video) return null; return [V.video, V.vw, V.vh]; }
async function grab(t) { if (V.kind === 'video' && !(typeof srcPlaying !== 'undefined' && srcPlaying)) await seek(t); const s = sourceImage(t); if (!s) return null; const [im, sw, sh] = s, r = cropRect(sw, sh); work.width = V.w; work.height = V.h; const x = work.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, V.w, V.h); return x.getImageData(0, 0, V.w, V.h); }
function drawSource() { const s = sourceImage(V.pt); const cx = srcCv.getContext('2d'); if (!s) { srcCv.width = 320; srcCv.height = 200; cx.fillStyle = '#26222c'; cx.fillRect(0, 0, 320, 200); cx.fillStyle = '#8a8590'; cx.font = '12px sans-serif'; cx.fillText('carregue um vídeo ou use uma cena', 50, 100); return; } const [im, sw, sh] = s; srcCv.width = 400; srcCv.height = Math.round(400 * sh / sw); cx.imageSmoothingEnabled = true; cx.drawImage(im, 0, 0, srcCv.width, srcCv.height); const r = cropRect(sw, sh), k = srcCv.width / sw; cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(0, 0, srcCv.width, srcCv.height); cx.save(); cx.beginPath(); cx.rect(r[0] * k, r[1] * k, r[2] * k, r[3] * k); cx.clip(); cx.drawImage(im, 0, 0, srcCv.width, srcCv.height); cx.restore(); cx.strokeStyle = '#f0c860'; cx.lineWidth = 2; cx.strokeRect(r[0] * k, r[1] * k, r[2] * k, r[3] * k); }

// ---------------------------------------------------------------- processing: adjust → dither to the palette
const BAY = { 2: [0, 2, 3, 1], 4: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], 8: null }; (function () { const m = [[0]]; let n = 1; while (n < 8) { const o = []; for (let y = 0; y < n * 2; y++) { o[y] = []; for (let x = 0; x < n * 2; x++) { const b = m[y % n][x % n] * 4; o[y][x] = b + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]; } } m.length = 0; o.forEach(r => m.push(r)); n *= 2; } BAY[8] = m.flat(); })();
function process(img, pal) {
  const w = V.w, h = V.h, src = img.data, prgb = pal.map(hex2), n = prgb.length, out = new Uint8Array(w * h), f = new Float32Array(w * h * 3);
  const bri = S.bri * 2.55, con = S.con / 100, sat = S.sat / 100, gam = 1 / (S.gam / 100), vig = S.vig / 100, scan = S.scan / 100, sh = Math.round(S.chroma);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let r = src[(y * w + clamp(x - sh, 0, w - 1)) * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
    const gray = .3 * r + .59 * g + .11 * b; r = gray + (r - gray) * sat; g = gray + (g - gray) * sat; b = gray + (b - gray) * sat;
    r = (r - 128) * con + 128 + bri; g = (g - 128) * con + 128 + bri; b = (b - 128) * con + 128 + bri;
    r = 255 * Math.pow(clamp(r, 0, 255) / 255, gam); g = 255 * Math.pow(clamp(g, 0, 255) / 255, gam); b = 255 * Math.pow(clamp(b, 0, 255) / 255, gam);
    let k = 1; if (vig > 0) { const dx = (x / w - .5) * 2, dy = (y / h - .5) * 2; k *= 1 - vig * clamp((dx * dx + dy * dy - .3) / 1.2, 0, 1); } if (scan > 0 && (y & 1)) k *= 1 - scan * .6;
    f[i * 3] = r * k; f[i * 3 + 1] = g * k; f[i * 3 + 2] = b * k;
  }
  const nearest = (r, g, b) => { let best = 0, bd = 1e9; for (let k = 0; k < n; k++) { const p = prgb[k], d = (r - p[0]) ** 2 * .3 + (g - p[1]) ** 2 * .59 + (b - p[2]) ** 2 * .11; if (d < bd) { bd = d; best = k; } } return best; };
  const amt = S.dith / 100, type = S.type, spread = 255 / Math.max(2, Math.sqrt(n)) * amt;
  if (type === 'fs' || type === 'atk') {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 3, r = clamp(f[i], 0, 255), g = clamp(f[i + 1], 0, 255), b = clamp(f[i + 2], 0, 255), k = nearest(r, g, b), p = prgb[k]; out[y * w + x] = k; const er = (r - p[0]) * amt, eg = (g - p[1]) * amt, eb = (b - p[2]) * amt;
      const add = (dx, dy, wt) => { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) return; const j = (yy * w + xx) * 3; f[j] += er * wt; f[j + 1] += eg * wt; f[j + 2] += eb * wt; };
      if (type === 'fs') { add(1, 0, 7 / 16); add(-1, 1, 3 / 16); add(0, 1, 5 / 16); add(1, 1, 1 / 16); } else { [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => add(dx, dy, 1 / 8)); } }
  } else {
    const m = type === 'bayer2' ? BAY[2] : type === 'bayer4' ? BAY[4] : type === 'bayer8' ? BAY[8] : null, nm = m ? Math.sqrt(m.length) : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; let t = 0; if (type === 'noise') t = (Math.random() - .5) * spread * 1.6; else if (m) t = (m[(y % nm) * nm + (x % nm)] / m.length - .5) * spread * 1.6; out[y * w + x] = nearest(clamp(f[i] + t, 0, 255), clamp(f[i + 1] + t, 0, 255), clamp(f[i + 2] + t, 0, 255)); }
  }
  return out;
}
const toCanvas = (idx, pal, cv) => { cv = cv || document.createElement('canvas'); cv.width = V.w; cv.height = V.h; const x = cv.getContext('2d'), id = x.createImageData(V.w, V.h), p = pal.map(hex2); for (let k = 0; k < idx.length; k++) { const c = p[idx[k]] || [0, 0, 0]; id.data[k * 4] = c[0]; id.data[k * 4 + 1] = c[1]; id.data[k * 4 + 2] = c[2]; id.data[k * 4 + 3] = 255; } x.putImageData(id, 0, 0); return cv; };
let prevT = 0;
async function livePreview() { const my = ++prevT; const img = await grab(V.pt); if (my !== prevT || !img) return; toCanvas(process(img, palOf(V.pal)), palOf(V.pal), prevCv); }

// ---------------------------------------------------------------- convert
async function convert() {
  if (V.busy) return; const dur = V.kind === 'scene' ? SC.SCENES[V.scene].dur : V.dur; if (!dur) { alert('Carregue um vídeo ou escolha uma cena.'); return; }
  V.busy = true; V.cancel = false; $('#vd-go').disabled = true; $('#vd-stop').hidden = false; $('#vd-prog').hidden = false;
  const a = +$('#vd-ta').value / 1000 * dur, b = Math.max(a + .1, +$('#vd-tb').value / 1000 * dur), n = Math.min(S.max, Math.max(1, Math.floor((b - a) * V.fps))), pal = palOf(V.pal), frames = [];
  for (let i = 0; i < n; i++) { if (V.cancel) break; const img = await grab(a + i / V.fps); if (!img) break; frames.push(process(img, pal)); $('#vd-prog').value = (i + 1) / n; $('#vd-stat').textContent = (i + 1) + ' / ' + n; await new Promise(r => setTimeout(r, 0)); }
  V.busy = false; $('#vd-go').disabled = false; $('#vd-stop').hidden = true; $('#vd-prog').hidden = true;
  if (frames.length) { V.frames = frames; V.palUsed = pal.slice(); V.fi = 0; V.hist = []; V.fut = []; $('#vd-fr').max = frames.length - 1; setupEditor(); stats(); strip(); loadFrame(0); }
}
// ---------------------------------------------------------------- stats
function rle(f) { let n = 0, i = 0; while (i < f.length) { let j = i; while (j < f.length && f[j] === f[i] && j - i < 255) j++; n += 2; i = j; } return n; }
function delta(f, p) { let n = 2, i = 0; while (i < f.length) { if (f[i] === p[i]) { i++; continue; } let j = i; while (j < f.length && f[j] !== p[j]) j++; n += 2 + Math.ceil((j - i) / 2); i = j; } return n; }
function stats() {
  const F = V.frames; if (!F.length) return; const bpp = V.palUsed.length > 16 ? 8 : V.palUsed.length > 4 ? 4 : V.palUsed.length > 2 ? 2 : 1, raw = F.length * Math.ceil(V.w * V.h * bpp / 8), r = F.reduce((s, f) => s + rle(f), 0), d = F.reduce((s, f, i) => s + (i ? Math.min(rle(f), delta(f, F[i - 1])) : rle(f)), 0), best = Math.min(raw, r, d), per = best / F.length, slot = 81920;
  $('#vd-est').innerHTML = `${F.length} quadros · ${V.w}×${V.h} · ${V.fps} fps = <b>${(F.length / V.fps).toFixed(1)} s</b><br>bruto (${bpp} bpp, ${V.palUsed.length} cores): <b>${fmtB(raw)}</b><br>RLE por quadro: <b>${fmtB(r)}</b>${r > raw ? ' <i>(pior que o bruto: o dither quebra as sequências)</i>' : ''}<br>RLE só com o que muda entre quadros: <b>${fmtB(d)}</b><br>melhor: <b>${fmtB(best)}</b> = <b>${Math.round(best / slot * 100)} %</b> de um slot de 80 KiB · cabem cerca de <b>${Math.max(0, Math.floor(slot / per))}</b> quadros por slot<br><span style="color:var(--dim)">para caber: menos quadros, tamanho menor (120×80), menos cores (Game Boy/1 bit), dither mais fraco ou Bayer 2×2.</span>`;
}
// ---------------------------------------------------------------- playback
let pt0 = 0;
function tickPlay(now) { requestAnimationFrame(tickPlay); if (!playCv.offsetParent || !V.frames.length) return; if (V.play) V.fi = Math.floor(now / 1000 * V.fps) % V.frames.length; if (playCv.width !== V.w) { playCv.width = V.w; playCv.height = V.h; } toCanvas(V.frames[V.fi], V.palUsed, playCv); $('#vd-fr').value = V.fi; $('#vd-fro').textContent = (V.fi + 1) + ' / ' + V.frames.length; }
requestAnimationFrame(tickPlay);
$('#vd-pl').onclick = e => { V.play = !V.play; e.target.classList.toggle('on', V.play); e.target.textContent = V.play ? '▶' : '❚❚'; };
$('#vd-fr').oninput = e => { V.play = false; $('#vd-pl').classList.remove('on'); $('#vd-pl').textContent = '❚❚'; V.fi = +e.target.value; selectFrame(V.fi); };

// ---------------------------------------------------------------- frame editing with propagation + undo/redo (diffs for the whole clip)
let ed = null;
function setupEditor() { const wrap = $('#vd-ed'); if (!ed) ed = new PXE(wrap, { w: V.w, h: V.h, zoom: V.w > 150 ? 3 : 5, tones: false, noUndoUI: true, pal: V.palUsed, onCommit: commit }); else { ed.setPal(V.palUsed); } }
function loadFrame(i) { V.fi = i; ed.resize(V.w, V.h); ed.set({ w: V.w, h: V.h, px: Array.from(V.frames[i]) }); V.last = Array.from(V.frames[i]); highlight(); }
function selectFrame(i) { if (!ed || !V.frames[i]) return; loadFrame(i); }
function commit(e) {
  const f = V.frames[V.fi]; if (!f) return; const cur = e.img.px, ch = [], prop = $('#vd-prop').checked, N = prop ? +$('#vd-propn').value : 0;
  for (let k = 0; k < f.length; k++) { const nv = cur[k] < 0 ? 0 : cur[k]; if (nv !== V.last[k]) { for (let j = V.fi; j <= Math.min(V.frames.length - 1, V.fi + N); j++) { const g = V.frames[j]; if (g[k] !== nv) { ch.push([j, k, g[k], nv]); g[k] = nv; } } } }
  if (!ch.length) { V.last = Array.from(f); return; } V.hist.push(ch); if (V.hist.length > 200) V.hist.shift(); V.fut = []; V.last = Array.from(f); e.img.px = Array.from(f); e.paint(); strip(); stats(); histInfo();
}
function applyEntry(ch, rev) { for (const [j, k, o, n] of ch) V.frames[j][k] = rev ? o : n; }
function undo() { const ch = V.hist.pop(); if (!ch) return; applyEntry(ch, true); V.fut.push(ch); loadFrame(V.fi); strip(); stats(); histInfo(); }
function redo() { const ch = V.fut.pop(); if (!ch) return; applyEntry(ch, false); V.hist.push(ch); loadFrame(V.fi); strip(); stats(); histInfo(); }
const histInfo = () => { $('#vd-hist').textContent = V.hist.length + ' ações' + (V.fut.length ? ' · ' + V.fut.length + ' para refazer' : ''); };
$('#vd-u').onclick = undo; $('#vd-r').onclick = redo; $('#vd-propn').oninput = e => { $('#vd-propo').textContent = e.target.value; };
addEventListener('keydown', e => { if (!host.offsetParent || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); } });
function strip() { const box = $('#vd-strip'); box.innerHTML = ''; V.frames.forEach((f, i) => { const c = toCanvas(f, V.palUsed); c.className = 'fr' + (i === V.fi ? ' on' : ''); c.style.width = '72px'; c.onclick = () => { V.play = false; $('#vd-pl').classList.remove('on'); selectFrame(i); }; box.append(c); }); }
function highlight() { [...$('#vd-strip').children].forEach((c, i) => c.classList.toggle('on', i === V.fi)); }

// ---------------------------------------------------------------- looks (presets)
const LOOKS = [
  ['TAVERN 16', { pal: 'tavern', type: 'bayer4', dith: 60, con: 110, sat: 105, gam: 100, scan: 0, chroma: 0, vig: 0, bri: 0 }], ['Game Boy', { pal: 'gameboy', type: 'bayer4', dith: 80, con: 125, sat: 0, gam: 100, scan: 0, chroma: 0, vig: 0, bri: 5 }], ['1 bit', { pal: 'onebit', type: 'atk', dith: 100, con: 135, sat: 0, gam: 100, scan: 0, chroma: 0, vig: 0, bri: 0 }],
  ['VHS', { pal: 'tavern', type: 'bayer2', dith: 40, con: 115, sat: 135, gam: 95, scan: 55, chroma: 2, vig: 35, bri: 0 }], ['Noir', { pal: 'mapa_cidade', type: 'fs', dith: 80, con: 150, sat: 0, gam: 110, scan: 0, chroma: 0, vig: 30, bri: -5 }], ['Sépia', { pal: 'sepia', type: 'bayer4', dith: 70, con: 115, sat: 0, gam: 100, scan: 0, chroma: 0, vig: 25, bri: 0 }],
  ['Ruínas', { pal: 'mapa_ruina', type: 'bayer4', dith: 90, con: 130, sat: 80, gam: 120, scan: 0, chroma: 0, vig: 25, bri: -8 }], ['Noite violeta', { pal: 'mapa_noite', type: 'bayer4', dith: 90, con: 120, sat: 90, gam: 110, scan: 0, chroma: 0, vig: 25, bri: -5 }], ['Floresta', { pal: 'mapa_floresta', type: 'bayer4', dith: 85, con: 115, sat: 90, gam: 100, scan: 0, chroma: 0, vig: 20, bri: 0 }],
  ['Castelo', { pal: 'mapa_castelo', type: 'bayer8', dith: 85, con: 130, sat: 70, gam: 115, scan: 0, chroma: 0, vig: 30, bri: -5 }], ['Cidade à noite', { pal: 'mapa_cidade', type: 'bayer4', dith: 90, con: 125, sat: 90, gam: 120, scan: 0, chroma: 0, vig: 30, bri: -6 }],
];
function applyLook(l) { V.pal = l.pal; Object.keys(S).forEach(k => { if (k in l) S[k] = l[k]; }); if (l.type) S.type = l.type; syncUI(); livePreview(); }
function syncUI() { host.querySelectorAll('[data-s]').forEach(r => { r.value = S[r.dataset.s]; r.nextElementSibling.textContent = S[r.dataset.s]; }); $('#vd-type').value = S.type; $('#vd-pal').value = V.pal; }
const pr = $('#vd-presets'); LOOKS.forEach(([n, l]) => { const b = el('button', null, n); b.onclick = () => applyLook(l); pr.append(b); });

// ---------------------------------------------------------------- wiring
host.querySelectorAll('[data-s]').forEach(r => r.oninput = () => { S[r.dataset.s] = +r.value; r.nextElementSibling.textContent = r.value; clearTimeout(V.t); V.t = setTimeout(livePreview, 80); });
$('#vd-type').onchange = e => { S.type = e.target.value; livePreview(); }; $('#vd-pal').onchange = e => { V.pal = e.target.value; livePreview(); };
$('#vd-size').onchange = e => { const [w, h] = e.target.value.split('x').map(Number); V.w = w; V.h = h; drawSource(); livePreview(); };
$('#vd-kind').onchange = e => { V.kind = e.target.value; $('#vd-filel').hidden = V.kind !== 'video'; $('#vd-scenel').hidden = V.kind !== 'scene'; V.pt = 0; $('#vd-pt').value = 0; updInfo(); drawSource(); livePreview(); };
$('#vd-scene').onchange = e => { V.scene = e.target.value; updInfo(); drawSource(); livePreview(); };
function updInfo() { const d = V.kind === 'scene' ? SC.SCENES[V.scene].dur : V.dur; $('#vd-info').textContent = V.kind === 'scene' ? 'cena “' + SC.SCENES[V.scene].name + '” · ' + d + ' s' : V.video ? V.vw + '×' + V.vh + ' · ' + d.toFixed(1) + ' s' : 'nenhum vídeo carregado — use “cena do storyboard” para testar'; trim(); }
function trim() { const d = V.kind === 'scene' ? SC.SCENES[V.scene].dur : V.dur, a = +$('#vd-ta').value / 1000 * d, b = Math.max(a + .1, +$('#vd-tb').value / 1000 * d), n = Math.min(S.max, Math.max(1, Math.floor((b - a) * V.fps))); $('#vd-trim').textContent = d ? `de ${a.toFixed(1)} s até ${b.toFixed(1)} s → ${n} quadros` : ''; $('#vd-pto').textContent = (V.pt).toFixed(1) + ' s'; }
['zoom', 'cx', 'cy'].forEach(id => $('#vd-' + id).oninput = e => { const v = +e.target.value; if (id === 'zoom') V.zoom = v; else if (id === 'cx') V.px = v; else V.py = v; drawSource(); clearTimeout(V.t); V.t = setTimeout(livePreview, 80); });
let srcPlaying = false, srcLast = 0;
function srcLoop(now) {                                                   // the source runs by itself: the video plays, the scene advances; the picture and the crop follow
  if (!srcPlaying) return;
  const dur = V.kind === 'scene' ? (SC.SCENES[V.scene] || { dur: 0 }).dur : V.dur;
  if (V.kind === 'video' && V.video) V.pt = V.video.currentTime; else { V.pt += (now - srcLast) / 1000; if (dur && V.pt >= dur) V.pt = 0; }
  srcLast = now; if (dur) { $('#vd-pt').value = Math.round(V.pt / dur * 1000); $('#vd-pto').textContent = V.pt.toFixed(1) + ' s'; }
  drawSource(); if (now - (srcLoop.p || 0) > 90) { srcLoop.p = now; livePreview(); }                   // the styled picture follows at ~10 fps
  requestAnimationFrame(srcLoop);
}
$('#vd-srcplay').onclick = e => {
  srcPlaying = !srcPlaying; e.target.textContent = srcPlaying ? '❚❚ pausar' : '▶ play'; $('#vd-stplay').textContent = e.target.textContent;
  if (V.kind === 'video' && V.video) { if (srcPlaying) { V.video.loop = true; V.video.play().catch(() => {}); } else V.video.pause(); }
  if (srcPlaying) { srcLast = performance.now(); requestAnimationFrame(srcLoop); }
};
$('#vd-stplay').onclick = () => $('#vd-srcplay').click();
$('#vd-pt').oninput = async e => { const d = V.kind === 'scene' ? SC.SCENES[V.scene].dur : V.dur; V.pt = +e.target.value / 1000 * d; if (V.kind === 'video') await seek(V.pt); trim(); drawSource(); livePreview(); };
['ta', 'tb'].forEach(id => $('#vd-' + id).oninput = trim); $('#vd-fps').oninput = e => { V.fps = +e.target.value; $('#vd-fpso').textContent = V.fps; trim(); }; $('#vd-max').oninput = e => { S.max = +e.target.value; $('#vd-maxo').textContent = S.max; trim(); };
$('#vd-file').onchange = e => { const f = e.target.files[0]; if (!f) return; if (V.video) URL.revokeObjectURL(V.video.src); const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(f); v.onloadedmetadata = () => { V.video = v; V.dur = v.duration; V.vw = v.videoWidth; V.vh = v.videoHeight; V.pt = 0; updInfo(); seek(0).then(() => { drawSource(); livePreview(); }); }; v.onerror = () => { $('#vd-info').textContent = 'não consegui abrir este vídeo (formato não suportado pelo navegador)'; }; e.target.value = ''; };
$('#vd-go').onclick = convert; $('#vd-stop').onclick = () => { V.cancel = true; };
// ---------------------------------------------------------------- save / export
$('#vd-save').onclick = async () => { if (!V.frames.length) return; await Store.set('video.clip', { w: V.w, h: V.h, fps: V.fps, pal: V.palUsed, frames: V.frames }); $('#vd-stat').textContent = 'salvo'; };
$('#vd-load').onclick = async () => { const c = await Store.get('video.clip', null); if (!c) { $('#vd-stat').textContent = 'nada salvo ainda'; return; } V.w = c.w; V.h = c.h; V.fps = c.fps; V.palUsed = c.pal; V.frames = c.frames.map(f => Uint8Array.from(f)); V.fi = 0; V.hist = []; V.fut = []; $('#vd-fr').max = V.frames.length - 1; $('#vd-size').value = c.w + 'x' + c.h; setupEditor(); stats(); strip(); loadFrame(0); $('#vd-stat').textContent = 'carregado'; };
$('#vd-png').onclick = () => { if (!V.frames.length) return; const cols = Math.min(6, V.frames.length), rows = Math.ceil(V.frames.length / cols), c = document.createElement('canvas'); c.width = cols * V.w; c.height = rows * V.h; const x = c.getContext('2d'); V.frames.forEach((f, i) => x.drawImage(toCanvas(f, V.palUsed), (i % cols) * V.w, Math.floor(i / cols) * V.h)); down('clipe_' + V.w + 'x' + V.h + '.png', c.toDataURL()); };
$('#vd-json').onclick = () => { if (!V.frames.length) return; const R = f => { const o = []; let i = 0; while (i < f.length) { let j = i; while (j < f.length && f[j] === f[i] && j - i < 255) j++; o.push([j - i, f[i]]); i = j; } return o; }; down('clipe.fm1clip.json', 'data:application/json,' + encodeURIComponent(JSON.stringify({ w: V.w, h: V.h, fps: V.fps, palette: V.palUsed, frames: V.frames.map(R) }))); };
function lzw(idx, minBits) { const clear = 1 << minBits, eoi = clear + 1, out = []; let size = minBits + 1, next = eoi + 1, cur = 0, nb = 0, dict = new Map(); const emit = c => { cur |= c << nb; nb += size; while (nb >= 8) { out.push(cur & 255); cur >>= 8; nb -= 8; } }; emit(clear); let pre = idx[0];
  for (let i = 1; i < idx.length; i++) { const k = idx[i], key = (pre << 8) | k, hit = dict.get(key); if (hit !== undefined) pre = hit; else { emit(pre); if (next < 4096) { dict.set(key, next); if (next === (1 << size) && size < 12) size++; next++; } else { emit(clear); dict.clear(); next = eoi + 1; size = minBits + 1; } pre = k; } } emit(pre); emit(eoi); if (nb > 0) out.push(cur & 255); return out; }
$('#vd-gif').onclick = () => { if (!V.frames.length) return; const pal = V.palUsed, bits = Math.max(2, Math.ceil(Math.log2(pal.length))), size = 1 << bits, o = [], b = (...a) => a.forEach(v => o.push(v)), w16 = v => b(v & 255, v >> 8);
  'GIF89a'.split('').forEach(c => b(c.charCodeAt(0))); w16(V.w); w16(V.h); b(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0); for (let i = 0; i < size; i++) { const c = pal[i] ? hex2(pal[i]) : [0, 0, 0]; b(c[0], c[1], c[2]); } b(0x21, 0xFF, 0x0B); 'NETSCAPE2.0'.split('').forEach(c => b(c.charCodeAt(0))); b(3, 1, 0, 0, 0);
  const delay = Math.round(100 / V.fps); V.frames.forEach(f => { b(0x21, 0xF9, 4, 0, delay & 255, delay >> 8, 0, 0); b(0x2C); w16(0); w16(0); w16(V.w); w16(V.h); b(0); b(bits); const data = lzw(f, bits); for (let i = 0; i < data.length; i += 255) { const ch = data.slice(i, i + 255); b(ch.length); ch.forEach(v => o.push(v)); } b(0); }); b(0x3B);
  const url = URL.createObjectURL(new Blob([new Uint8Array(o)], { type: 'image/gif' })); down('clipe_' + V.w + 'x' + V.h + '.gif', url); };
G.VIDEO = { V, S, process, lzw };
drawSource(); trim(); syncUI(); histInfo(); livePreview();
})(window);
