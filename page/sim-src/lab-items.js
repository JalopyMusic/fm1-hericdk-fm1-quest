// FM1 Quest lab — inventory items: simplified 12×12 icons (3–4 colours from the TAVERN palette) adapted from the reference sheets,
// the item list (name, effect, rarity) and which items each personality starts with. Duplicates and near-duplicates of the references were dropped.
(function (G) {
'use strict';
// palette indices (TAVERN): 0 near-black · 1 dark purple · 2 maroon · 3 dark green · 4 brown · 5 grey-purple · 6 light grey · 7 cream · 8 red · 9 orange · 10 yellow · 11 green · 12 blue · 13 purple · 14 pink · 15 skin
const ICONS = {
  espada(o) { o.l(10, 1, 4, 7, 6); o.l(9, 1, 3, 7, 7); o.p(11, 0, 7); o.l(2, 5, 6, 9, 10); o.l(3, 8, 1, 10, 4); o.p(0, 11, 10); },
  martelo(o) { o.r(1, 1, 8, 4, 6); o.r(1, 1, 8, 1, 7); o.r(1, 4, 8, 1, 5); o.l(5, 5, 2, 10, 4); o.l(6, 5, 3, 10, 4); o.p(2, 11, 9); },
  picareta(o) { [[1, 5], [2, 3], [3, 2], [5, 1], [7, 1], [9, 2], [10, 3], [10, 5]].forEach(([x, y]) => o.p(x, y, 6)); o.r(3, 2, 6, 1, 7); o.r(5, 2, 2, 9, 4); o.r(5, 2, 1, 9, 9); },
  arco(o) { [[4, 0], [5, 1], [6, 2], [7, 4], [7, 5], [7, 6], [7, 7], [6, 9], [5, 10], [4, 11]].forEach(([x, y]) => { o.p(x, y, 4); o.p(x - 1, y, 9); }); o.l(3, 0, 3, 11, 7); },
  flecha(o) { o.l(1, 10, 9, 2, 4); o.pl([[8, 0], [11, 0], [11, 3], [9, 3]], 6); o.pl([[0, 8], [3, 11], [0, 11]], 8); o.p(2, 8, 8); o.p(1, 7, 8); },
  escudo(o) { o.pl([[1, 1], [10, 1], [10, 6], [5, 11], [1, 6]], 6); o.pl([[2, 2], [9, 2], [9, 6], [5, 10], [2, 6]], 12); o.r(5, 2, 2, 8, 10); o.r(2, 4, 8, 2, 10); },
  elmo(o) { o.e(5, 5, 5, 4, 6); o.r(0, 6, 11, 4, 6); o.r(0, 8, 11, 2, 5); o.r(3, 6, 6, 1, 0); o.r(5, 0, 2, 2, 8); o.r(1, 5, 2, 1, 7); },
  chapeu(o) { o.e(5, 9, 5, 2, 13); o.pl([[6, 0], [9, 8], [2, 8]], 13); o.pl([[7, 2], [9, 8], [6, 8]], 1); o.r(3, 7, 6, 1, 10); o.p(7, 0, 13); },
  pocaoazul(o) { o.r(5, 0, 2, 1, 9); o.r(5, 1, 2, 3, 6); o.r(3, 4, 6, 1, 12); o.r(2, 5, 8, 4, 12); o.r(3, 9, 6, 1, 12); o.r(3, 6, 1, 2, 7); o.r(7, 8, 2, 1, 1); },
  pocaovermelha(o) { o.r(5, 0, 2, 1, 9); o.r(5, 1, 2, 3, 6); o.r(3, 4, 6, 1, 8); o.r(2, 5, 8, 4, 8); o.r(3, 9, 6, 1, 8); o.r(3, 6, 1, 2, 14); o.r(7, 8, 2, 1, 2); },
  cristal(o) { o.pl([[5, 0], [9, 4], [8, 11], [3, 11], [2, 4]], 12); o.pl([[5, 0], [5, 11], [3, 11], [2, 4]], 7); o.r(3, 10, 6, 1, 5); o.pl([[5, 0], [6, 1], [6, 11], [5, 11]], 12); },
  gema(o) { o.pl([[3, 1], [8, 1], [11, 4], [11, 7], [8, 10], [3, 10], [0, 7], [0, 4]], 8); o.pl([[3, 1], [8, 1], [6, 4], [5, 4]], 14); o.pl([[8, 1], [11, 4], [8, 5], [6, 4]], 8); o.pl([[6, 5], [11, 5], [11, 7], [8, 10], [6, 10]], 2); o.r(2, 3, 2, 1, 14); },
  orbe(o) { o.pl([[6, 0], [9, 4], [10, 8], [6, 11], [2, 8], [3, 4]], 8); o.pl([[6, 3], [9, 7], [6, 11], [3, 7]], 9); o.pl([[6, 6], [8, 8], [6, 10], [4, 8]], 10); },
  anel(o) { o.d(5, 7, 4, 10); o.d(5, 7, 2, -1); o.r(4, 1, 3, 3, 8); o.p(4, 1, 14); o.r(1, 9, 8, 1, 9); },
  pergaminho(o) { o.r(2, 2, 8, 8, 7); o.r(0, 1, 3, 10, 9); o.r(9, 1, 3, 10, 9); o.r(4, 4, 4, 1, 4); o.r(4, 6, 3, 1, 4); o.r(4, 8, 4, 1, 4); },
  livrovermelho(o) { o.r(1, 1, 9, 10, 8); o.r(1, 1, 2, 10, 2); o.r(3, 10, 7, 1, 7); o.r(5, 4, 4, 1, 10); o.r(5, 6, 3, 1, 10); },
  livroazul(o) { o.r(1, 1, 9, 10, 12); o.r(1, 1, 2, 10, 5); o.r(3, 10, 7, 1, 7); o.r(5, 4, 4, 2, 6); o.p(8, 8, 8); },
  carta(o) { o.r(0, 2, 11, 8, 7); o.pl([[0, 2], [10, 2], [5, 6]], 6); o.d(5, 6, 1, 8); o.r(0, 9, 11, 1, 6); },
  mapa(o) { o.r(0, 1, 11, 9, 7); o.r(3, 1, 1, 9, 6); o.r(7, 1, 1, 9, 6); [[5, 4], [6, 5], [7, 6], [7, 4], [5, 6]].forEach(([x, y]) => o.p(x, y, 8)); o.r(0, 9, 11, 1, 6); },
  chave(o) { o.d(3, 3, 3, 10); o.d(3, 3, 1, -1); o.l(5, 5, 10, 10, 10); o.l(6, 5, 10, 9, 9); o.p(8, 8, 10); o.p(9, 7, 10); o.p(7, 10, 10); },
  cadeado(o) { o.r(3, 0, 5, 1, 6); o.r(3, 0, 1, 5, 6); o.r(7, 0, 1, 5, 6); o.r(1, 4, 9, 7, 10); o.r(1, 8, 9, 3, 9); o.r(5, 6, 1, 3, 0); },
  vela(o) { o.r(3, 4, 4, 7, 7); o.r(6, 4, 1, 7, 6); o.r(4, 2, 1, 2, 0); o.pl([[4, 0], [5, 1], [5, 2], [4, 2]], 10); o.r(2, 10, 6, 1, 9); },
  calice(o) { o.r(1, 0, 9, 1, 10); o.pl([[1, 1], [9, 1], [7, 5], [3, 5]], 10); o.r(2, 1, 7, 1, 8); o.r(4, 5, 2, 3, 10); o.r(2, 8, 7, 2, 9); },
  sino(o) { o.e(5, 5, 4, 4, 10); o.r(0, 8, 11, 2, 10); o.r(7, 3, 2, 6, 9); o.d(5, 10, 1, 9); o.r(4, 0, 2, 1, 9); },
  bolsa(o) { o.pl([[3, 0], [5, 2], [7, 0], [8, 3], [3, 3]], 4); o.e(5, 7, 4, 3, 4); o.r(2, 3, 7, 1, 10); o.r(3, 4, 5, 1, 4); o.r(3, 6, 2, 2, 9); o.r(8, 8, 1, 2, 2); o.p(0, 3, 10); o.p(10, 3, 10); },
  bau(o) { o.r(0, 4, 11, 7, 4); o.r(0, 1, 11, 4, 4); o.r(0, 1, 11, 1, 9); o.r(0, 5, 11, 1, 10); o.r(4, 4, 3, 4, 10); o.p(5, 6, 0); },
  pena(o) { o.pl([[10, 0], [11, 3], [6, 8], [2, 10]], 13); o.pl([[10, 0], [11, 3], [9, 4]], 1); o.l(1, 11, 10, 1, 7); },
  osso(o) { o.l(4, 8, 8, 4, 7); o.l(3, 8, 7, 4, 7); o.d(2, 9, 1, 7); o.d(3, 10, 1, 7); o.d(9, 2, 1, 7); o.d(10, 3, 1, 7); o.p(5, 6, 6); },
  cogumeloazul(o) { o.e(5, 4, 5, 3, 12); o.r(0, 5, 11, 1, 5); o.r(4, 6, 3, 4, 7); o.r(3, 2, 2, 1, 7); o.p(7, 3, 7); o.r(3, 10, 5, 1, 6); },
  cogumelovermelho(o) { o.e(5, 4, 5, 3, 8); o.r(0, 5, 11, 1, 2); o.r(4, 6, 3, 4, 7); o.r(3, 2, 2, 1, 7); o.p(7, 3, 7); o.r(3, 10, 5, 1, 6); },
  maca(o) { o.d(5, 7, 4, 8); o.p(3, 5, 14); o.p(3, 6, 14); o.r(5, 1, 1, 3, 4); o.pl([[6, 2], [9, 1], [8, 3]], 11); o.r(6, 10, 3, 1, 2); },
  queijo(o) { o.pl([[0, 5], [10, 2], [10, 9], [0, 9]], 10); o.r(0, 8, 10, 1, 9); o.d(4, 6, 1, 9); o.d(7, 5, 1, 9); o.r(10, 3, 1, 6, 9); },
  ovo(o) { o.e(5, 6, 3, 4, 7); o.r(7, 4, 1, 5, 6); o.p(3, 4, 15); o.p(3, 5, 15); },
  peixe(o) { o.e(5, 6, 4, 2, 6); o.pl([[8, 6], [11, 3], [11, 9]], 6); o.p(2, 5, 0); o.r(1, 7, 6, 1, 7); o.r(4, 4, 3, 1, 5); },
  pinha(o) { o.pl([[5, 0], [8, 3], [8, 9], [5, 11], [2, 9], [2, 3]], 4); [[4, 3], [6, 3], [3, 5], [5, 5], [7, 5], [4, 7], [6, 7], [5, 9]].forEach(([x, y]) => o.p(x, y, 9)); },
  minerio(o) { o.pl([[1, 5], [4, 2], [9, 3], [10, 8], [6, 10], [1, 9]], 5); o.p(4, 4, 6); o.p(7, 6, 6); o.p(3, 7, 7); o.r(7, 8, 2, 1, 1); o.p(6, 3, 12); },
  ouro(o) { o.pl([[2, 3], [10, 3], [11, 8], [0, 8]], 10); o.r(2, 3, 8, 1, 7); o.r(0, 7, 11, 1, 9); o.r(3, 5, 2, 1, 9); },
  coroa(o) { o.r(1, 6, 9, 4, 10); o.pl([[1, 6], [1, 1], [3, 5], [5, 0], [7, 5], [9, 1], [9, 6]], 10); o.p(3, 8, 8); o.p(5, 8, 12); o.p(7, 8, 8); o.r(1, 9, 9, 1, 9); },
  flauta(o) { o.l(0, 10, 10, 2, 9); o.l(0, 9, 9, 2, 10); [[3, 8], [5, 6], [6, 5], [8, 3]].forEach(([x, y]) => o.p(x, y, 0)); o.p(10, 1, 4); },
  tambor(o) { o.r(1, 4, 9, 6, 8); o.e(5, 4, 5, 2, 7); o.r(1, 8, 9, 1, 10); o.r(1, 9, 9, 1, 2); o.l(0, 0, 4, 3, 6); o.l(10, 0, 6, 3, 6); },
};
const LIST = [
  ['espada', 'Espada', 'ataque mais forte', 'comum'], ['martelo', 'Martelo', 'golpe pesado: atordoa', 'comum'], ['picareta', 'Picareta', 'quebra defesas', 'comum'], ['arco', 'Arco', 'ataque à distância', 'comum'], ['flecha', 'Flecha', 'dano extra à distância', 'comum'], ['escudo', 'Escudo', 'reduz o dano', 'comum'],
  ['elmo', 'Elmo', 'protege dos golpes críticos', 'incomum'], ['chapeu', 'Chapéu de bruxo', 'aumenta a magia (INT)', 'incomum'], ['pocaoazul', 'Poção azul', 'recupera mana', 'comum'], ['pocaovermelha', 'Poção vermelha', 'cura o herói', 'comum'], ['cristal', 'Cristal', 'guarda uma nota (eco)', 'raro'], ['gema', 'Gema vermelha', 'dá sorte (LUK)', 'raro'],
  ['orbe', 'Orbe de fogo', 'feitiço pronto: fogo', 'raro'], ['anel', 'Anel', 'melhora a precisão do tempo', 'incomum'], ['pergaminho', 'Pergaminho', 'feitiço pronto', 'incomum'], ['livrovermelho', 'Livro vermelho', 'ensina uma lição (FM School)', 'incomum'],
  ['livroazul', 'Livro azul', 'ensina escalas', 'incomum'], ['carta', 'Carta', 'missão extra', 'comum'], ['mapa', 'Mapa', 'mostra a próxima zona', 'incomum'], ['chave', 'Chave', 'abre baús', 'comum'],
  ['cadeado', 'Cadeado', 'trava um efeito (HOLD)', 'incomum'], ['vela', 'Vela', 'ilumina a taverna: cura devagar', 'comum'], ['calice', 'Cálice', 'descansa o grupo', 'incomum'], ['sino', 'Sino', 'marca o compasso', 'comum'],
  ['bolsa', 'Bolsa', 'guarda 1 sample extra', 'comum'], ['bau', 'Baú', 'um espaço de save extra', 'incomum'], ['pena', 'Pena', 'notas mais leves', 'comum'], ['osso', 'Osso', 'ataque selvagem', 'comum'],
  ['cogumeloazul', 'Cogumelo azul', 'sonho: reverb maior', 'incomum'], ['cogumelovermelho', 'Cogumelo vermelho', 'ataque com veneno', 'incomum'], ['maca', 'Maçã', 'cura leve', 'comum'], ['queijo', 'Queijo', 'vira energia', 'comum'],
  ['ovo', 'Ovo', 'chocar um mascote', 'raro'], ['peixe', 'Peixe', 'comida: cura média', 'comum'], ['pinha', 'Pinha', 'material de forja', 'comum'], ['minerio', 'Minério', 'material da Chisel', 'comum'],
  ['ouro', 'Barra de ouro', 'valioso: vende na loja', 'raro'], ['coroa', 'Coroa', 'só para chefes: dobra o XP', 'lendário'], ['flauta', 'Flauta', 'toca uma nota extra', 'comum'], ['tambor', 'Tambor', 'marca o ritmo', 'comum'],
].map(([id, name, fx, rar]) => ({ id, name, fx, rar }));
// the first 4 are what that personality starts with; the others are what it may find
const SEEDS = { Steady: ['martelo', 'escudo', 'maca', 'chave', 'picareta', 'queijo'], Eager: ['flecha', 'arco', 'pocaovermelha', 'pena', 'peixe', 'sino'], Lazy: ['cogumelovermelho', 'queijo', 'ovo', 'vela', 'livroazul', 'calice'], Wild: ['orbe', 'osso', 'espada', 'coroa', 'gema', 'tambor'], Precise: ['anel', 'cadeado', 'pergaminho', 'mapa', 'cristal', 'elmo'], Dreamy: ['pocaoazul', 'cogumeloazul', 'pena', 'livrovermelho', 'chapeu', 'flauta'] };

// ---- rasteriser: the little DSL → 12×12 palette indices -----------------------------------------------------------
const cache = {};
function raster(id) {
  if (cache[id]) return cache[id]; const a = Array(144).fill(-1), set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 12 && y >= 0 && y < 12) a[y * 12 + x] = c; };
  const o = {
    p: (x, y, c) => set(x, y, c), r(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); },
    l(x0, y0, x1, y1, c) { let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy, n = 0; for (;;) { set(x0, y0, c); if ((x0 === x1 && y0 === y1) || n++ > 50) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    d(cx, cy, r, c) { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + .4) set(x, y, c); },
    e(cx, cy, rx, ry, c) { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (((x - cx) / (rx + .3)) ** 2 + ((y - cy) / (ry + .3)) ** 2 <= 1) set(x, y, c); },
    pl(P, c) { for (let y = 0; y < 12; y++) { const yy = y + .5, xs = []; for (let k = 0; k < P.length; k++) { const A = P[k], B = P[(k + 1) % P.length]; if ((A[1] <= yy && B[1] > yy) || (B[1] <= yy && A[1] > yy)) xs.push(A[0] + (yy - A[1]) / (B[1] - A[1]) * (B[0] - A[0])); } xs.sort((m, n) => m - n); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) set(x, y, c); } },
  };
  (ICONS[id] || (() => {}))(o); cache[id] = a; return a;
}
// the same one-colour-per-pixel icon drawn through a GFX context (used by the Character screen)
function draw(g, id, x, y) { const a = raster(id); for (let k = 0; k < 144; k++) if (a[k] >= 0) g.R(x + (k % 12), y + Math.floor(k / 12), 1, 1, a[k]); }
function canvasOf(id, scale, bg) { const PAL = G.Scene.PALS['1c'], c = document.createElement('canvas'); c.width = c.height = 12 * (scale || 1); const x = c.getContext('2d'); if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); } const a = raster(id); for (let k = 0; k < 144; k++) if (a[k] >= 0) { x.fillStyle = PAL[a[k]]; x.fillRect((k % 12) * (scale || 1), Math.floor(k / 12) * (scale || 1), scale || 1, scale || 1); } return c; }
G.ITEMS = { LIST, SEEDS, ICONS, raster, draw, canvasOf, colours: id => new Set(raster(id).filter(v => v >= 0)).size };
})(window);
