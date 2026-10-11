// FM1 Quest lab — Editor tab: indexed pixel editor (16-colour TAVERN palette + 3 character tones), sprite sets 15×15 / 48×48, rig parts, interface art.
(function (G) {
'use strict';
const host = document.getElementById('editor'); if (!host) return;
const Sc = G.Scene, RIG = G.RIG, Store = G.Store, PAL = Sc.PALS['1c'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], PALRGB = PAL.map(hex2rgb);
const CNAME = ['vermelho', 'laranja', 'amarelo', 'verde', 'verde-água', 'azul', 'azul-escuro', 'roxo', 'magenta', 'rosa', 'cinza', 'areia'];
const BASES = ['#c8503c', '#e08a3a', '#d8b43a', '#7ab04e', '#3f9a7a', '#3a8ac0', '#4a62c0', '#7a56c0', '#b4509a', '#d86a8a', '#8a8a96', '#c8b090'];
const nearest = (r, g, b) => { let best = 0, bd = 1e9; for (let k = 0; k < 16; k++) { const p = PALRGB[k], d = (r - p[0]) ** 2 * .3 + (g - p[1]) ** 2 * .59 + (b - p[2]) ** 2 * .11; if (d < bd) { bd = d; best = k; } } return best; };
const blankImg = (w, h) => ({ w, h, px: Array(w * h).fill(-1) });
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const download = (name, url) => { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); };

// ---------------------------------------------------------------- the editor widget
class PixelEditor {
  constructor(parent, o) {
    this.w = o.w; this.h = o.h; this.zoom = o.zoom || 8; this.tones = !!o.tones; this.only3 = !!o.only3; if (this.only3) this.col = 16; this.onChange = o.onChange || (() => {}); this.onCommit = o.onCommit || null; this.pal = o.pal || PAL; this.palRgb = this.pal.map(hex2rgb); this.tones4 = !!o.tones4; this.simple = !!o.simple; this.img = blankImg(this.w, this.h); this.undo = []; this.redo = []; this.col = 0; this.tool = 'pencil'; this.mirror = false; this.fill = false; this.base = BASES[5]; this.bg = null; this.grid = true;
    const r = this.root = el('div', 'pxe'); parent.append(r);
    r.innerHTML = `<div class="pxe-tb"></div><div class="pxe-main"><div class="pxe-pal"></div><div class="pxe-cv"><canvas class="bg"></canvas><canvas class="pse"></canvas><canvas class="bgi"></canvas><canvas class="main"></canvas><canvas class="ov"></canvas><div class="gridl"></div></div></div>`;
    this.tb = r.querySelector('.pxe-tb'); this.palEl = r.querySelector('.pxe-pal'); this.wrap = r.querySelector('.pxe-cv');
    [this.cBg, this.cRef, this.cMain, this.cOv, this.cPose] = ['bg', 'bgi', 'main', 'ov', 'pse'].map(c => r.querySelector('canvas.' + c)); this.grd = r.querySelector('.gridl');
    this.buildTools(); this.buildPalette(); this.resize(this.w, this.h); this.bind(); if (o.noUndoUI) this.tb.querySelectorAll('[data-a=undo],[data-a=redo]').forEach(b => { b.style.display = 'none'; });
  }
  buildTools() {
    const T = this.simple ? [['pencil', '✎', 'lápis'], ['eraser', '⌫', 'borracha'], ['fill', '▧', 'balde'], ['line', '╱', 'linha'], ['pick', '✚', 'conta-gotas']] : [['pencil', '✎', 'lápis'], ['eraser', '⌫', 'borracha'], ['fill', '▧', 'balde'], ['line', '╱', 'linha'], ['rect', '▭', 'retângulo'], ['ellipse', '◯', 'elipse'], ['pick', '✚', 'conta-gotas']];
    if (this.simple) {
      this.tb.innerHTML = T.map(([k, i, t]) => `<button data-t="${k}" title="${t}" class="${k === this.tool ? 'on' : ''}"><b>${i}</b><small>${t}</small></button>`).join('') + '<i class="sp"></i><button data-a="undo" title="desfazer (Ctrl+Z)"><b>↶</b><small>desfazer</small></button><button data-a="redo" title="refazer (Ctrl+Shift+Z)"><b>↷</b><small>refazer</small></button>';
      this.tb.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.t) { this.tool = b.dataset.t; this.tb.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); return; } if (b.dataset.a === 'undo') this.doUndo(); else if (b.dataset.a === 'redo') this.doRedo(); });
      return;
    }
    this.tb.innerHTML = T.map(([k, i, t]) => `<button data-t="${k}" title="${t}" class="${k === this.tool ? 'on' : ''}">${i}</button>`).join('') + '<i class="sp"></i><button data-a="undo" title="desfazer (Ctrl+Z)">↶</button><button data-a="redo" title="refazer (Ctrl+Shift+Z)">↷</button><i class="sp"></i><button data-a="mirror" title="espelhar o traço na horizontal">⇋</button><button data-a="fillshape" title="formas preenchidas">■</button><button data-a="grid" class="on" title="grade">▦</button><i class="sp"></i><button data-a="l" title="deslocar ←">←</button><button data-a="r" title="→">→</button><button data-a="u" title="↑">↑</button><button data-a="d" title="↓">↓</button><button data-a="clear" title="limpar">✕</button><label class="zm">zoom <input type="range" min="2" max="24" value="' + this.zoom + '"></label>';
    this.tb.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t) { this.tool = b.dataset.t; this.tb.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); return; }
      const a = b.dataset.a; if (a === 'undo') this.doUndo(); else if (a === 'redo') this.doRedo(); else if (a === 'mirror') { this.mirror = !this.mirror; b.classList.toggle('on', this.mirror); } else if (a === 'fillshape') { this.fill = !this.fill; b.classList.toggle('on', this.fill); } else if (a === 'grid') { this.grid = !this.grid; b.classList.toggle('on', this.grid); this.grd.style.display = this.grid ? '' : 'none'; }
      else if (a === 'clear') { this.push(); this.img.px.fill(-1); this.changed(); this.onCommit && this.onCommit(this); } else if ('lrud'.includes(a)) { this.push(); this.shift(a === 'l' ? -1 : a === 'r' ? 1 : 0, a === 'u' ? -1 : a === 'd' ? 1 : 0); this.changed(); this.onCommit && this.onCommit(this); }
    });
    this.tb.querySelector('input').oninput = e => { this.zoom = +e.target.value; this.resize(this.w, this.h); };
  }
  buildPalette() {
    const items = this.only3 ? [] : this.pal.map((c, i) => [i, c, 'cor ' + i]); if (this.tones4) items.push([19, this.tcol().light, 'luz'], [16, this.tcol().base, 'tom base'], [17, this.tcol().near, 'tom médio'], [18, this.tcol().far, 'tom escuro']); else if (this.tones) { items.push([16, this.tcol().base, RIG.CFG.tones === 2 ? 'tom da frente' : 'tom base do personagem']); if (RIG.CFG.tones !== 2) items.push([17, this.tcol().near, 'tom −1 (lado de cá)']); items.push([18, this.tcol().far, RIG.CFG.tones === 2 ? 'tom de trás' : 'tom −2 (lado de lá)']); }
    this.palEl.innerHTML = items.map(([i, c, t]) => `<b data-i="${i}" title="${t}" style="background:${c}" class="${i === this.col ? 'on' : ''} ${i > 15 ? 'tn' : ''}">${i > 15 ? (this.tones4 ? { 16: 'B', 17: 'M', 18: 'E', 19: 'L' }[i] : (RIG.CFG.tones === 2 ? { 16: 'F', 18: 'T' }[i] : ['B', '−1', '−2'][i - 16])) : ''}</b>`).join('') + (this.only3 ? '<small class="p3">a cor vem do menu · só 3 tons</small>' : '');
    this.palEl.onclick = e => { const b = e.target.closest('b[data-i]'); if (b) { this.col = +b.dataset.i; this.palEl.querySelectorAll('b').forEach(x => x.classList.toggle('on', x === b)); } };
  }
  tcol() { return this.tones4 ? RIG.ramp4(this.base) : RIG.tonesOnly(this.base); }
  colorOf(i) { const t = this.tcol(); return i === 16 ? t.base : i === 17 ? t.near : i === 18 ? t.far : i === 19 ? t.light : this.pal[i]; }
  setPal(arr) { this.pal = arr; this.palRgb = arr.map(hex2rgb); if (this.col < 16 && this.col >= arr.length) this.col = 0; this.buildPalette(); this.paint(); }
  setBase(h) { this.base = h; if (this.tones) this.buildPalette(); this.paint(); }
  resize(w, h) {
    if (w !== this.w || h !== this.h) { const old = this.img; this.img = blankImg(w, h); for (let y = 0; y < Math.min(h, old.h); y++) for (let x = 0; x < Math.min(w, old.w); x++) this.img.px[y * w + x] = old.px[y * old.w + x]; this.w = w; this.h = h; this.undo = []; this.redo = []; }
    [this.cBg, this.cRef, this.cMain, this.cOv, this.cPose].forEach(c => { c.width = this.w; c.height = this.h; c.style.width = this.w * this.zoom + 'px'; c.style.height = this.h * this.zoom + 'px'; });
    this.wrap.style.width = this.w * this.zoom + 'px'; this.wrap.style.height = this.h * this.zoom + 'px'; this.grd.style.backgroundSize = `${this.zoom}px ${this.zoom}px`; this.paint(); this.paintBg();
  }
  paintBg() { const x = this.cBg.getContext('2d'); x.clearRect(0, 0, this.w, this.h); for (let yy = 0; yy < this.h; yy++) for (let xx = 0; xx < this.w; xx++) { x.fillStyle = (xx + yy) & 1 ? '#2a2630' : '#322e39'; x.fillRect(xx, yy, 1, 1); } }
  // pose reference: a picture (crop of an image / GIF frame) under everything, to draw the pose of each frame over
  setPose(canvas, alpha) { const x = this.cPose.getContext('2d'); x.clearRect(0, 0, this.w, this.h); if (canvas) { x.globalAlpha = alpha == null ? .5 : alpha; x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, this.w, this.h); x.globalAlpha = 1; } }
  // reference layer (onion skin / dummy): a canvas drawn faintly under the pixels
  setRef(canvas, alpha) { const x = this.cRef.getContext('2d'); x.clearRect(0, 0, this.w, this.h); if (canvas) { x.globalAlpha = alpha == null ? .45 : alpha; x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, this.w, this.h); x.globalAlpha = 1; } }
  paint() { const x = this.cMain.getContext('2d'), id = x.createImageData(this.w, this.h), t = this.tcol(), rgb = i => i === 16 ? hex2rgb(t.base) : i === 17 ? hex2rgb(t.near) : i === 18 ? hex2rgb(t.far) : i === 19 ? hex2rgb(t.light) : this.palRgb[i]; for (let k = 0; k < this.img.px.length; k++) { const i = this.img.px[k]; if (i >= 0) { const c = rgb(i); id.data[k * 4] = c[0]; id.data[k * 4 + 1] = c[1]; id.data[k * 4 + 2] = c[2]; id.data[k * 4 + 3] = 255; } } x.putImageData(id, 0, 0); }
  get() { return { w: this.w, h: this.h, px: this.img.px.slice() }; }
  set(img) { this.w = img.w; this.h = img.h; this.img = { w: img.w, h: img.h, px: img.px.slice() }; this.undo = []; this.redo = []; this.resize(img.w, img.h); }
  push() { this.undo.push(this.img.px.slice()); if (this.undo.length > 80) this.undo.shift(); this.redo = []; }
  doUndo() { if (!this.undo.length) return; this.redo.push(this.img.px.slice()); this.img.px = this.undo.pop(); this.changed(true); this.onCommit && this.onCommit(this); }
  doRedo() { if (!this.redo.length) return; this.undo.push(this.img.px.slice()); this.img.px = this.redo.pop(); this.changed(true); this.onCommit && this.onCommit(this); }
  changed() { this.paint(); this.onChange(this); }
  shift(dx, dy) { const n = Array(this.w * this.h).fill(-1); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h) n[ny * this.w + nx] = this.img.px[y * this.w + x]; } this.img.px = n; }
  put(x, y, c, px) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; px[y * this.w + x] = c; if (this.mirror) { const mx = this.w - 1 - x; px[y * this.w + mx] = c; } }
  floodFill(x, y, c) { const px = this.img.px, w = this.w, h = this.h, tgt = px[y * w + x]; if (tgt === c) return; const st = [[x, y]]; while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= w || cy >= h || px[cy * w + cx] !== tgt) continue; px[cy * w + cx] = c; st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); } }
  shape(kind, a, b, c, px) {
    const [x0, y0] = a, [x1, y1] = b;
    if (kind === 'line') { let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy, x = x0, y = y0; for (let n = 0; n < 1000; n++) { this.put(x, y, c, px); if (x === x1 && y === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx; } if (e2 <= dx) { e += dx; y += sy; } } }
    else if (kind === 'rect') { const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1); for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) if (this.fill || x === xa || x === xb || y === ya || y === yb) this.put(x, y, c, px); }
    else { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2 + .5, ry = Math.abs(y1 - y0) / 2 + .5; for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (this.fill ? d <= 1 : d <= 1 && d > ((rx - 1) / rx) ** 2 * .9 - .02) this.put(x, y, c, px); } }
  }
  cell(e) { const r = this.cOv.getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) / r.width * this.w), 0, this.w - 1), clamp(Math.floor((e.clientY - r.top) / r.height * this.h), 0, this.h - 1)]; }
  bind() {
    let down = null, last = null; const ov = this.cOv, ox = ov.getContext('2d');
    const erase = e => e.button === 2 || this.tool === 'eraser';
    ov.addEventListener('contextmenu', e => e.preventDefault());
    ov.addEventListener('pointerdown', e => {
      e.preventDefault(); try { ov.setPointerCapture(e.pointerId); } catch (err) {} const p = this.cell(e), c = erase(e) ? -1 : this.col;
      if (this.tool === 'pick') { const v = this.img.px[p[1] * this.w + p[0]]; if (v >= 0) { this.col = v; this.palEl.querySelectorAll('b').forEach(x => x.classList.toggle('on', +x.dataset.i === v)); } return; }
      this.push();
      if (this.tool === 'fill') { this.floodFill(p[0], p[1], c); this.changed(); this.onCommit && this.onCommit(this); return; }
      down = { p, c, kind: this.tool }; last = p; if (this.tool === 'pencil' || this.tool === 'eraser') { this.put(p[0], p[1], c, this.img.px); this.changed(); }
    });
    ov.addEventListener('pointermove', e => {
      if (!down) return; const p = this.cell(e);
      if (down.kind === 'pencil' || down.kind === 'eraser') { this.shape('line', last, p, down.c, this.img.px); last = p; this.changed(); }
      else { ox.clearRect(0, 0, this.w, this.h); const tmp = Array(this.w * this.h).fill(-1); this.shape(down.kind, down.p, p, down.c < 0 ? 0 : down.c, tmp); for (let k = 0; k < tmp.length; k++) if (tmp[k] >= 0) { ox.fillStyle = this.colorOf(tmp[k]); ox.globalAlpha = .8; ox.fillRect(k % this.w, Math.floor(k / this.w), 1, 1); } ox.globalAlpha = 1; }
    });
    const end = e => { if (!down) return; if (down.kind !== 'pencil' && down.kind !== 'eraser') { const p = this.cell(e); ox.clearRect(0, 0, this.w, this.h); this.shape(down.kind, down.p, p, down.c, this.img.px); this.changed(); } down = null; this.onCommit && this.onCommit(this); };
    ov.addEventListener('pointerup', end); ov.addEventListener('pointercancel', end);
    this.root.tabIndex = 0; this.root.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.doRedo() : this.doUndo(); } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.doRedo(); } });
  }
  toCanvas(scale) { const c = document.createElement('canvas'); c.width = this.w * (scale || 1); c.height = this.h * (scale || 1); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(this.cMain, 0, 0, c.width, c.height); return c; }
}
// image <-> canvas helpers shared with the other tools
const PX = {
  toCanvas(img, T, scale) { const c = document.createElement('canvas'); c.width = img.w * (scale || 1); c.height = img.h * (scale || 1); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; for (let k = 0; k < img.px.length; k++) { const i = img.px[k]; if (i < 0) continue; x.fillStyle = i === 16 ? T.base : i === 17 ? T.near : i === 18 ? T.far : i === 19 ? (T.light || T.base) : PAL[i]; x.fillRect((k % img.w) * (scale || 1), Math.floor(k / img.w) * (scale || 1), scale || 1, scale || 1); } return c; },
  fromCanvas(cv, w, h) { const t = document.createElement('canvas'); t.width = w; t.height = h; const x = t.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, px = Array(w * h); for (let k = 0; k < w * h; k++) px[k] = d[k * 4 + 3] < 128 ? -1 : nearest(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]); return { w, h, px }; },
  blank: blankImg, nearest, PAL, PALRGB, BASES, hex2rgb,
  rle(img) { let n = 0, i = 0; const p = img.px; while (i < p.length) { let j = i; while (j < p.length && p[j] === p[i] && j - i < 255) j++; n += 2; i = j; } return n; },
};
G.PXE = PixelEditor; G.PX = PX;

// ================================================================ Editor · simples ============================================================
// Uma tela só: escolha o personagem, desenhe uma PARTE do corpo (o esqueleto move tudo) ou retoque um QUADRO; o boneco ao lado anda sozinho, na cena, já com a paleta de poucas cores.
const CLS = ['mago', 'arqueiro', 'clerigo', 'guerreiro'], CLSN = { mago: 'Mago', arqueiro: 'Arqueiro', clerigo: 'Clérigo', guerreiro: 'Guerreiro' };
const ANIM48 = ['idle', 'walk', 'run', 'attack', 'cast', 'hurt', 'dead'], ANIM15 = Object.keys(RIG.TINY), TLAB = RIG.TINYL;
const PORDER = ['head', 'torso', 'uarmN', 'farmN', 'weapon', 'thighN', 'shinN', 'uarmF', 'farmF', 'thighF', 'shinF'];
const PLAB = { head: 'cabeça', torso: 'tronco', uarmN: 'braço da frente · cima', farmN: 'braço da frente · baixo', weapon: 'arma', thighN: 'perna da frente · coxa', shinN: 'perna da frente · baixo e pé', uarmF: 'braço de trás · cima', farmF: 'braço de trás · baixo', thighF: 'perna de trás · coxa', shinF: 'perna de trás · baixo e pé' };
const PDEF = {}; RIG.PART_DEF.forEach(d => { PDEF[d[1]] = d; });
function nearestBase(hex) { const r = PX.hex2rgb(hex); let best = BASES[0], bd = 1e9; BASES.forEach(b => { const q = PX.hex2rgb(b), d = (r[0] - q[0]) ** 2 + (r[1] - q[1]) ** 2 + (r[2] - q[2]) ** 2; if (d < bd) { bd = d; best = b; } }); return best; }
const tinyFrames = cls => { const f = []; Object.keys(RIG.TINY).forEach(a => { for (let i = 0; i < RIG.TINY[a]; i++) f.push(RIG.tinyPx(cls, a, i)); }); return f; };
const tinyOff = a => { let o = 0; for (const k of ANIM15) { if (k === a) break; o += RIG.TINY[k]; } return o; };
const D = { cls: {}, tiny: {}, ver: 0 };
CLS.forEach(c => { const b = nearestBase(RIG.CLASSES[c]); D.cls[c] = { parts: RIG.defaultParts(), ovr: {}, base: b, touched: false }; D.tiny[c] = { frames: tinyFrames(c), base: b, touched: false }; });
const save = () => { D.ver++; Store.debounce('char.v3', () => ({ cls: D.cls, tiny: D.tiny })); };
const U = { cls: 'mago', size: 48, mode: 'parts', part: 'head', anim: 'idle', fi: 0, play: true, t0: performance.now(), pidx: 0 };
const SENT = { base: '#ff0000', near: '#00ff00', far: '#0000ff' };                                // sentinel colours so the render can be turned back into palette / tone indices

host.innerHTML = `<div class="ed3"><p class="ed3-help"><b>1</b> escolha o personagem · <b>2</b> desenhe uma parte do corpo (o esqueleto leva a parte junto em todos os quadros) ou retoque um quadro · <b>3</b> o boneco ao lado anda sozinho, na cena, com a paleta de poucas cores. Salva sozinho.</p>
  <div class="ed3-top"><div class="seg" id="e3-cls"></div><div class="seg" id="e3-size"><button data-s="48">cena 48×48</button><button data-s="15">luta 15×15</button></div><div class="seg" id="e3-mode"><button data-m="parts">Partes do corpo</button><button data-m="frames">Quadros</button></div><span class="sw" id="e3-base">${BASES.map((b, i) => `<button data-v="${b}" title="${CNAME[i]}" style="background:${b}"></button>`).join('')}</span></div>
  <div class="ed3-main"><div class="ed3-list" id="e3-list"></div><div class="ed3-draw"><div id="e3-ed"></div><div class="ed3-sub" id="e3-sub"></div></div>
   <div class="ed3-prev"><canvas id="e3-pv" width="240" height="240"></canvas><div class="seg wrap" id="e3-anims"></div><div class="row"><button id="e3-play">❚❚ pausar</button><span id="e3-info"></span></div></div></div>
  <div class="ed3-strip" id="e3-strip"></div></div>`;
const $e = id => host.querySelector('#' + id);
const ed = new PixelEditor($e('e3-ed'), { w: 11, h: 11, zoom: 20, tones: true, only3: true, simple: true, onChange: () => onDraw() });
const cache = new Map(), PNG_ALPHA = 128;
const cur = () => D.cls[U.cls], tcur = () => D.tiny[U.cls];
const toneOf = cls => RIG.tonesOnly((U.size === 15 ? D.tiny[cls] : D.cls[cls]).base);
function canvasToIdx(cv) {
  const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data, px = Array(w * h).fill(-1), S3 = [[255, 0, 0, 16], [0, 255, 0, 17], [0, 0, 255, 18]];
  for (let k = 0; k < w * h; k++) { if (d[k * 4 + 3] < PNG_ALPHA) continue; const r = d[k * 4], g = d[k * 4 + 1], b = d[k * 4 + 2]; let best = -1, bd = 1e9; S3.forEach(s => { const q = (r - s[0]) ** 2 + (g - s[1]) ** 2 + (b - s[2]) ** 2; if (q < bd) { bd = q; best = s[3]; } }); if (bd > 3000) best = PX.nearest(r, g, b); px[k] = best; }
  return { w, h, px };
}
function frameImg(cls, anim, i) {                                                                  // my retouched frame, or the skeleton + my parts
  const o = D.cls[cls].ovr[anim]; if (o && o[i]) return o[i]; const key = [cls, anim, i, D.ver].join('|'); let im = cache.get(key); if (im) return im;
  const A = RIG.ALL[anim], n = A.n, u = A.loop ? i / n : i / Math.max(1, n - 1); im = canvasToIdx(RIG.renderParts(48, RIG.poseAt(anim, u), D.cls[cls].parts, { tones: SENT, palette: PAL })); cache.set(key, im); if (cache.size > 600) cache.delete(cache.keys().next().value); return im;
}
const idxCanvas = (img, base) => PX.toCanvas(img, RIG.tonesOnly(base), 1);
const frameCount = () => U.size === 48 ? RIG.ALL[U.anim].n : RIG.TINY[U.anim];
const frameNow = () => U.size === 48 ? frameImg(U.cls, U.anim, U.fi) : tcur().frames[tinyOff(U.anim) + U.fi];

// ---- the editing canvas -----------------------------------------------------------------------------------------------------------------------
let pivot = null;
function showPivot() {
  if (pivot) { pivot.remove(); pivot = null; } if (U.size !== 48 || U.mode !== 'parts') return; const d = PDEF[U.part]; if (!d) return;
  pivot = document.createElement('div'); pivot.className = 'ed3-pivot'; pivot.title = 'a cruz marca onde esta parte se prende ao corpo'; pivot.style.left = ((d[6] + .5) * ed.zoom - 9) + 'px'; pivot.style.top = ((d[7] + .5) * ed.zoom - 9) + 'px'; ed.wrap.append(pivot);
}
function loadEditor() {
  const c = U.size === 48 ? cur() : tcur(); ed.setBase(c.base); $e('e3-base').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === c.base)); ed.setRef(null);
  if (U.size === 48 && U.mode === 'parts') { const p = cur().parts[U.part]; ed.zoom = clamp(Math.floor(340 / Math.max(p.w, p.h)), 10, 28); ed.set(p); }
  else if (U.size === 48) { ed.zoom = 8; ed.set(frameNow()); if (U.fi > 0) ed.setRef(idxCanvas(frameImg(U.cls, U.anim, U.fi - 1), c.base), .3); }
  else { ed.zoom = 24; ed.set(frameNow()); const k = tinyOff(U.anim) + U.fi; if (k > 0) ed.setRef(idxCanvas(tcur().frames[k - 1], c.base), .3); }
  ed.tb.querySelector('input') && (ed.tb.querySelector('input').value = ed.zoom); showPivot();
}
function onDraw() {
  const img = ed.get();
  if (U.size === 48 && U.mode === 'parts') { cur().parts[U.part] = img; cur().touched = true; }
  else if (U.size === 48) { const o = cur().ovr; (o[U.anim] = o[U.anim] || {})[U.fi] = img; cur().touched = true; }
  else { tcur().frames[tinyOff(U.anim) + U.fi] = img; tcur().touched = true; }
  save(); paintLists(false);
}

// ---- left list (parts) / bottom strip (frames) ---------------------------------------------------------------------------------------------------
function paintLists(rebuild) {
  const list = $e('e3-list'), strip = $e('e3-strip'), base = (U.size === 48 ? cur() : tcur()).base, T = RIG.tonesOnly(base);
  const parts = U.size === 48 && U.mode === 'parts'; list.style.display = parts ? '' : 'none'; strip.style.display = parts ? 'none' : '';
  if (parts) {
    if (rebuild || !list.children.length) { list.innerHTML = '<b class="h">partes do corpo</b>' + PORDER.map(k => `<button data-p="${k}"><canvas></canvas><span>${PLAB[k]}</span></button>`).join(''); list.querySelectorAll('button').forEach(b => b.onclick = () => { U.part = b.dataset.p; loadEditor(); paintLists(false); sub(); }); }
    list.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.p === U.part); const p = cur().parts[b.dataset.p], cv = b.querySelector('canvas'), im = PX.toCanvas(p, T, 1); cv.width = p.w; cv.height = p.h; cv.getContext('2d').drawImage(im, 0, 0); cv.style.width = Math.max(18, p.w * 3) + 'px'; });
  } else {
    const n = frameCount(); if (rebuild || strip.children.length !== n) { strip.innerHTML = Array.from({ length: n }, (_, i) => `<button data-f="${i}"><canvas></canvas><span>${i + 1}</span></button>`).join(''); strip.querySelectorAll('button').forEach(b => b.onclick = () => { U.fi = +b.dataset.f; U.play = false; playBtn(); loadEditor(); paintLists(false); sub(); }); }
    strip.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === U.fi); const im = U.size === 48 ? frameImg(U.cls, U.anim, i) : tcur().frames[tinyOff(U.anim) + i], cv = b.querySelector('canvas'); cv.width = im.w; cv.height = im.h; cv.getContext('2d').drawImage(PX.toCanvas(im, T, 1), 0, 0); cv.style.width = (im.w <= 16 ? im.w * 4 : im.w * 1.4) + 'px'; const mine = U.size === 48 ? !!(cur().ovr[U.anim] && cur().ovr[U.anim][i]) : false; b.classList.toggle('mine', mine); });
  }
}
function sub() {
  const box = $e('e3-sub');
  if (U.size === 48 && U.mode === 'parts') { const p = cur().parts[U.part]; box.innerHTML = `<div class="row"><span>largura ${p.w}</span><button data-d="-1,0">−</button><button data-d="1,0">+</button><span>altura ${p.h}</span><button data-d="0,-1">−</button><button data-d="0,1">+</button><button id="e3-rp">restaurar esta parte</button></div><p class="est">A cruz marca onde a parte se prende ao corpo. Para uma roupa ou armadura, aumente a parte e desenhe: ela acompanha o corpo em todos os quadros.</p>`;
    box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const [dw, dh] = b.dataset.d.split(',').map(Number), q = cur().parts[U.part], w = clamp(q.w + dw, 3, 24), h = clamp(q.h + dh, 3, 24), px = Array(w * h).fill(-1); for (let y = 0; y < Math.min(h, q.h); y++) for (let x = 0; x < Math.min(w, q.w); x++) px[y * w + x] = q.px[y * q.w + x]; cur().parts[U.part] = { w, h, px }; cur().touched = true; save(); loadEditor(); paintLists(false); sub(); });
    $e('e3-rp').onclick = () => { cur().parts[U.part] = RIG.defaultParts()[U.part]; save(); loadEditor(); paintLists(false); sub(); }; }
  else if (U.size === 48) { const has = !!(cur().ovr[U.anim] && cur().ovr[U.anim][U.fi]); box.innerHTML = `<div class="row"><span>quadro ${U.fi + 1} de ${frameCount()}</span><button id="e3-rb" ${has ? '' : 'disabled'}>voltar ao boneco neste quadro</button><button id="e3-cp" ${U.fi ? '' : 'disabled'}>copiar o quadro anterior</button></div><p class="est">Dourado = quadro que você retocou. Os outros quadros vêm das partes do corpo.</p>`;
    $e('e3-rb').onclick = () => { delete cur().ovr[U.anim][U.fi]; save(); loadEditor(); paintLists(false); sub(); }; $e('e3-cp').onclick = () => { const o = cur().ovr; (o[U.anim] = o[U.anim] || {})[U.fi] = { w: 48, h: 48, px: frameImg(U.cls, U.anim, U.fi - 1).px.slice() }; cur().touched = true; save(); loadEditor(); paintLists(false); sub(); }; }
  else { const k = tinyOff(U.anim) + U.fi; box.innerHTML = `<div class="row"><span>quadro ${U.fi + 1} de ${frameCount()}</span><button id="e3-rt">voltar ao desenho padrão</button></div><p class="est">15×15 é o tamanho de verdade na luta contra o chefe. Cada quadro é desenhado à mão.</p>`;
    $e('e3-rt').onclick = () => { tcur().frames[k] = tinyFrames(U.cls)[k]; save(); loadEditor(); paintLists(false); }; }
}

// ---- top bar -----------------------------------------------------------------------------------------------------------------------------------
function paintTop() {
  $e('e3-cls').innerHTML = CLS.map(c => `<button data-c="${c}" class="${c === U.cls ? 'on' : ''}"><i style="background:${D.cls[c].base}"></i>${CLSN[c]}</button>`).join(''); $e('e3-cls').querySelectorAll('button').forEach(b => b.onclick = () => { U.cls = b.dataset.c; refreshAll(true); });
  $e('e3-size').querySelectorAll('button').forEach(b => { b.classList.toggle('on', +b.dataset.s === U.size); b.onclick = () => { U.size = +b.dataset.s; if (U.size === 15) U.mode = 'frames'; U.anim = U.size === 48 ? 'idle' : 'idle'; U.fi = 0; refreshAll(true); }; });
  $e('e3-mode').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.m === U.mode); b.style.display = U.size === 15 && b.dataset.m === 'parts' ? 'none' : ''; b.onclick = () => { U.mode = b.dataset.m; U.fi = 0; refreshAll(true); }; });
  const list = U.size === 48 ? ANIM48 : ANIM15; $e('e3-anims').innerHTML = list.map(a => `<button data-a="${a}" class="${a === U.anim ? 'on' : ''}">${U.size === 48 ? RIG.ALL[a].label.replace(/ \(.*\)/, '') : TLAB[a]}</button>`).join(''); $e('e3-anims').querySelectorAll('button').forEach(b => b.onclick = () => { U.anim = b.dataset.a; U.fi = 0; U.t0 = performance.now(); refreshAll(true); });
}
$e('e3-base').querySelectorAll('button').forEach(bb => bb.onclick = () => { const c = U.size === 48 ? cur() : tcur(); c.base = bb.dataset.v; D.cls[U.cls].base = c.base; D.tiny[U.cls].base = c.base; ed.setBase(c.base); $e('e3-base').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === bb)); save(); paintTop(); paintLists(false); });
function playBtn() { $e('e3-play').textContent = U.play ? '❚❚ pausar' : '▶ tocar'; }
$e('e3-play').onclick = () => { U.play = !U.play; if (U.play) U.t0 = performance.now(); playBtn(); };
function refreshAll(rebuild) { paintTop(); loadEditor(); paintLists(rebuild); sub(); }

// ---- live preview: the real street scene (palette, dither, lamp light) with my character walking in the middle ----------------------------------------
const pv = $e('e3-pv'); let lastPv = 0, shownIdx = -1;
function previewIdx(now) {
  const n = frameCount(), A = U.size === 48 ? RIG.ALL[U.anim] : null, fps = U.size === 48 ? A.fps : (U.anim === 'idle' || U.anim === 'walk' ? 3 : 6), loop = U.size === 48 ? A.loop : (U.anim === 'idle' || U.anim === 'walk');
  if (!U.play) return U.mode === 'frames' ? U.fi : U.pidx; const t = (now - U.t0) / 1000 * fps; return loop ? Math.floor(t) % n : Math.min(n - 1, Math.floor(t % (n + Math.ceil(fps * .7)))); }
function drawChar(g, by, idx) {
  const base = (U.size === 48 ? cur() : tcur()).base, im = U.size === 48 ? frameImg(U.cls, U.anim, idx) : tcur().frames[tinyOff(U.anim) + idx], cv = idxCanvas(im, base), x = 120, y = by + 18;
  g.c.fillStyle = 'rgba(0,0,0,.3)'; g.c.fillRect(x - Math.round(im.w * .3), y - 1, Math.round(im.w * .6), 2); g.c.drawImage(cv, Math.round(x - im.w / 2), Math.round(y - im.h * (im.w > 16 ? .95 : 1) + (im.w > 16 ? 0 : 1)));
}
function tickPv(now) {
  requestAnimationFrame(tickPv); if (!pv.offsetParent || now - lastPv < 33) return; lastPv = now; const idx = previewIdx(now); U.pidx = idx;
  G.SCENES.render(pv, 'street', now / 1000, { tod: .52, crowd: 0, speed: 0 }, { wire: false, band: true, nohud: true, cap: (U.size === 48 ? RIG.ALL[U.anim].label.replace(/ \(.*\)/, '') : TLAB[U.anim]) + ' · quadro ' + (idx + 1) + ' de ' + frameCount(), hook: (g, by) => drawChar(g, by, idx) });
  $e('e3-info').textContent = U.play ? 'tocando sozinho' : 'pausado'; if (idx !== shownIdx) { shownIdx = idx; host.querySelectorAll('#e3-strip button').forEach((b, i) => b.classList.toggle('play', i === idx && U.play)); }
}
requestAnimationFrame(tickPv);

// ---- what the scenes use ------------------------------------------------------------------------------------------------------------------------------
const scaled = new Map();
const SPR = G.SPR = { on: true, has: () => CLS.some(c => D.cls[c].touched || D.tiny[c].touched),
  get(cls, anim, u, size, base, dir) {                                                               // my 48×48 character (parts + retouched frames), only for classes I drew
    const c = D.cls[cls]; if (!SPR.on || !c || !c.touched || !RIG.ALL[anim] || RIG.isBack(anim) || !ANIM48.includes(anim)) return null; const A = RIG.ALL[anim], n = A.n, uu = A.loop ? ((u % 1) + 1) % 1 : clamp(u, 0, 1), i = A.loop ? Math.floor(uu * n) % n : Math.min(n - 1, Math.floor(uu * n * .999));
    const key = [D.ver, cls, anim, i, base, size, dir].join('|'); let cv = scaled.get(key); if (!cv) { const src = idxCanvas(frameImg(cls, anim, i), base); cv = document.createElement('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; if (dir < 0) { x.translate(size, 0); x.scale(-1, 1); } x.drawImage(src, 0, 0, size, size); scaled.set(key, cv); if (scaled.size > 500) scaled.delete(scaled.keys().next().value); } return cv; },
  tiny(cls, anim, u, base) {
    const c = D.tiny[cls]; if (!SPR.on || !c || !c.touched) return null; const n = RIG.TINY[anim] || 1, fi = anim === 'idle' || anim === 'walk' ? Math.floor(u * 2) % 2 : Math.min(n - 1, Math.floor(clamp(u, 0, .999) * n)), key = ['t', D.ver, cls, anim, fi, base].join('|'); let cv = scaled.get(key); if (!cv) { cv = PX.toCanvas(c.frames[tinyOff(anim) + fi], RIG.tonesOnly(base), 1); scaled.set(key, cv); } return cv; },
  // what the game really shows (mine when I drew it, the generated body otherwise): used by the Personagens tab
  big(cls, anim, u, base, size, dir) { return SPR.get(cls, anim, u, size || 48, base, dir || 1) || (G.PIXHERO && G.PIXHERO.canvas(cls, anim, u, size || 48, base, dir || 1)) || RIG.render(anim, u, size || 48, { tones: RIG.tonesOnly(base), style: 'body', dir: dir || 1, sex: cls === 'arqueiro' || cls === 'clerigo' ? 'f' : 'm', weapon: anim === 'attack' }); },
  small(cls, anim, u, base) { return SPR.tiny(cls, anim, u, base) || RIG.tiny(cls, anim, u, base); } };

// ---- load ----------------------------------------------------------------------------------------------------------------------------------------------
(async () => {
  const sv = await Store.get('char.v3', null);
  if (sv) { CLS.forEach(c => { if (sv.cls && sv.cls[c]) { const s = sv.cls[c]; D.cls[c] = { parts: Object.assign(RIG.defaultParts(), s.parts || {}), ovr: s.ovr || {}, base: s.base || D.cls[c].base, touched: !!s.touched }; } if (sv.tiny && sv.tiny[c]) { const s = sv.tiny[c]; D.tiny[c] = { frames: s.frames && s.frames.length === 12 ? s.frames : D.tiny[c].frames, base: s.base || D.tiny[c].base, touched: !!s.touched }; } }); }
  else { const old = await Store.get('sprites', null); if (old) CLS.forEach(c => { const s = old[c + ' 15']; if (s && s.frames && s.frames.length === 12) { const def = tinyFrames(c); if (s.frames.some((f, i) => f.px.some((v, k) => v !== def[i].px[k]))) { D.tiny[c] = { frames: s.frames, base: s.base || D.tiny[c].base, touched: true }; } } }); }
  D.ver++; playBtn(); refreshAll(true);
})();
G.EDITOR = { D, U, ed, PixelEditor, SPR };
})(window);
