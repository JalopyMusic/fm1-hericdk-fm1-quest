// FM1 Quest lab — Personagens tab: a VIEWER. Everything runs animated at the real size of the FM-1 screen (240×240); nothing here is edited (drawing is in the Editor tab).
//   · the four heroes, each cycling through all its states (or paused on one you pick)
//   · the 12 base colours of the 15×15 fighter, animated
//   · scale: heroes 15×15, scene hero 48×48 and the boss, all idle
//   · inventory: each personality's items + its hobby (read only)
(function (G) {
'use strict';
const host = document.getElementById('chars'); if (!host || !G.RIG || !G.SCENES) return;
const RIG = G.RIG, SC = G.SCENES, T = G.GFX, IT = G.ITEMS, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const BASES = ['#c8503c', '#e08a3a', '#d8b43a', '#7ab04e', '#3f9a7a', '#3a8ac0', '#4a62c0', '#7a56c0', '#b4509a', '#d86a8a', '#8a8a96', '#c8b090'];
const CLS = ['mago', 'arqueiro', 'clerigo', 'guerreiro'], CLSN = { mago: 'Mago', arqueiro: 'Arqueiro', clerigo: 'Clérigo', guerreiro: 'Guerreiro' };
const STATES = ['idle', 'walk', 'run', 'attack', 'cast', 'hurt', 'dead'], SL = { idle: 'parado', walk: 'andando', run: 'correndo', attack: 'ataque', cast: 'magia', hurt: 'ferido', dead: 'derrotado' };
const box = el('div', 'chv'); host.prepend(box);
box.innerHTML = '<div class="chrow" id="chv-heroes"></div><h3>Tamanho e cor (15×15 na luta)</h3><div class="chrow" id="chv-sizes"></div><h3>Itens e personalidades</h3><div id="chv-inv" class="inv"></div>';
const vis = new Set(); const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? vis.add(e.target) : vis.delete(e.target); })) : null;
let bg = null;
const stage = () => { if (!bg) { bg = document.createElement('canvas'); bg.width = bg.height = 240; SC.render(bg, 'street', 6, { tod: .52, crowd: 0, speed: 0 }, { wire: false, band: true, nohud: true, cap: '', hook: () => {} }); } return bg; };
const baseOf = c => (G.EDITOR && G.EDITOR.D && G.EDITOR.D.cls[c] ? G.EDITOR.D.cls[c].base : RIG.CLASSES[c]);
const GY = 144;                                                                                            // ground line of the stage (feet)
function screen(title, sub) { const w = el('div', 'chs'), cv = document.createElement('canvas'); cv.width = cv.height = 240; w.append(cv); w.insertAdjacentHTML('beforeend', `<b>${title}</b><small>${sub || ''}</small>`); io && io.observe(cv); return { w, cv, g: T.makeG(cv) }; }
const caption = (g, l1, l2) => { g.txt(l1, 8, 166, '#f2e2c4', { sz: 11, nofit: true }); if (l2) g.txt(l2, 8, 184, '#a89080', { sz: 9, nofit: true }); };
const shadow = (c, x, y, w) => { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(Math.round(x - w / 2), y - 1, w, 2); };
// time → frame of an animation (loops keep looping, one-shots hold their last frame a moment)
const frameU = (anim, t) => { const A = RIG.ALL[anim], n = A.n; if (A.loop) return { u: ((t * A.fps / n) % 1), i: Math.floor(t * A.fps) % n }; const hold = Math.ceil(A.fps * .8), k = Math.floor(t * A.fps) % (n + hold), i = Math.min(n - 1, k); return { u: i / Math.max(1, n - 1), i }; };

// ---- 1 · the four heroes -----------------------------------------------------------------------------------------------------------------------------
const heroes = CLS.map(c => { const s = screen(CLSN[c], 'todas as animações · 48×48'), st = { c, fixed: null }; s.w.insertAdjacentHTML('beforeend', `<div class="chips">${['auto'].concat(STATES).map(a => `<button data-a="${a}" class="${a === 'auto' ? 'on' : ''}">${a === 'auto' ? 'todos' : SL[a]}</button>`).join('')}</div>`);
  s.w.querySelectorAll('.chips button').forEach(b => b.onclick = () => { st.fixed = b.dataset.a === 'auto' ? null : b.dataset.a; s.w.querySelectorAll('.chips button').forEach(x => x.classList.toggle('on', x === b)); }); $('#chv-heroes').append(s.w); return Object.assign(s, st); });
function $(q) { return box.querySelector(q); }
// ---- 2 · colours and sizes -------------------------------------------------------------------------------------------------------------------------------
const sz = screen('As 12 cores-base', 'guerreiro 15×15 · tamanho real da luta'), sz2 = screen('Escala', 'herói 15×15 · herói de cena 48×48 · chefe'); $('#chv-sizes').append(sz.w, sz2.w);

function tick(now) {
  requestAnimationFrame(tick); if (!host.offsetParent) return; const t = now / 1000;
  heroes.forEach(h => { if (!vis.has(h.cv) || (h._l && now - h._l < 50)) return; h._l = now; const cyc = STATES.map(a => a), per = 2.4, k = Math.floor(t / per) % cyc.length, anim = h.fixed || cyc[k], tt = h.fixed ? t : t % per, f = frameU(anim, tt), c = h.cv.getContext('2d'), base = baseOf(h.c);
    c.imageSmoothingEnabled = false; c.drawImage(stage(), 0, 0); const sp = G.SPR.big(h.c, anim, f.u, base, 48, 1); shadow(c, 120, GY + 1, 26); c.drawImage(sp, 96, GY - 46); caption(h.g, CLSN[h.c] + ' · ' + SL[anim], 'quadro ' + (f.i + 1) + ' de ' + RIG.ALL[anim].n + (h.fixed ? '' : '  ·  passa sozinho'));
    const mine = G.SPR && G.SPR.has && G.EDITOR && G.EDITOR.D.cls[h.c].touched; h.g.txt(mine ? 'seu desenho' : 'boneco gerado', 232, 184, mine ? '#e0b84a' : '#7a6a58', { sz: 8, al: 'r', nofit: true }); });
  if (vis.has(sz.cv)) { const c = sz.cv.getContext('2d'), per = 3, k = Math.floor(t / per) % 3, anim = ['idle', 'walk', 'attack'][k], tt = t % per; c.imageSmoothingEnabled = false; c.drawImage(stage(), 0, 0);
    BASES.forEach((b, i) => { const x = 8 + i * 19.5, spr = G.SPR.small('guerreiro', anim, anim === 'attack' ? (tt * 2 % 1) : tt * 2, b); shadow(c, x + 7, GY + 1, 11); c.drawImage(spr, Math.round(x), GY - 14); RIG.reflect(c, spr, Math.round(x), GY + 2, .22); });
    caption(sz.g, '12 cores · ' + ({ idle: 'parado', walk: 'andando', attack: 'ataque' })[anim], 'cada classe começa com uma delas'); }
  if (vis.has(sz2.cv)) { const c = sz2.cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(stage(), 0, 0); const br = Math.sin(t * 1.3) * 2;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(178, GY + 4, 70, 7, 0, 0, 7); c.fill(); c.fillStyle = '#6aa04a'; c.beginPath(); c.ellipse(178, GY - 44 - br, 62, 52 + br, 0, 0, 7); c.fill(); c.fillStyle = '#92cc6a'; c.beginPath(); c.ellipse(158, GY - 66 - br, 24, 18, 0, 0, 7); c.fill(); c.fillStyle = '#14180f'; c.fillRect(150, GY - 56 - br, 6, 9); c.fillRect(176, GY - 56 - br, 6, 9);
    CLS.forEach((cl, i) => { const x = 10 + i * 17, spr = G.SPR.small(cl, 'idle', t * 2, baseOf(cl)); shadow(c, x + 7, GY + 1, 11); c.drawImage(spr, x, GY - 14); });
    const big = G.SPR.big('guerreiro', 'idle', t * .25 % 1, baseOf('guerreiro'), 48, 1); shadow(c, 112, GY + 1, 26); c.drawImage(big, 88, GY - 46);
    sz2.g.txt('15×15', 44, 150, '#c8c0a8', { sz: 8, al: 'c', nofit: true }); sz2.g.txt('48×48', 112, 150, '#c8c0a8', { sz: 8, al: 'c', nofit: true }); sz2.g.txt('chefe', 178, 150, '#c8c0a8', { sz: 8, al: 'c', nofit: true });
    caption(sz2.g, 'Todos parados, lado a lado', 'a diferença de tamanho é o ponto da luta'); }
}
requestAnimationFrame(tick);

// ---- 3 · inventory (read only): personality items + the hobby ---------------------------------------------------------------------------------------------
const PN = { Steady: 'Constante', Eager: 'Ansioso', Lazy: 'Preguiçoso', Wild: 'Selvagem', Precise: 'Preciso', Dreamy: 'Sonhador' };
const HOB = { pesca: ['Pesca', 'peixe'], leitura: ['Leitura', 'livrovermelho'], musica: ['Música', 'flauta'], gemas: ['Colecionar gemas', 'gema'], cozinha: ['Cozinhar', 'queijo'], mapas: ['Viagens e mapas', 'mapa'], jardim: ['Jardinagem', 'cogumeloazul'], cartas: ['Cartas e recados', 'carta'], ritmo: ['Tambor', 'tambor'] };
const PH = { Steady: ['pesca', 'jardim'], Eager: ['mapas', 'cartas'], Lazy: ['cozinha', 'pesca'], Wild: ['musica', 'ritmo'], Precise: ['gemas', 'leitura'], Dreamy: ['leitura', 'musica'] };
function inventory() {
  const inv = $('#chv-inv'); if (!inv || !IT) return; inv.innerHTML = ''; const item = id => IT.LIST.find(x => x.id === id), icon = (id, sc) => { const c = IT.canvasOf(id, sc, '#2a2530'); c.style.cssText = 'image-rendering:pixelated;border-radius:4px;display:block'; return c; };
  Object.entries(IT.SEEDS).forEach(([p, ids]) => { const c = el('div', 'icard'); c.append(el('b', null, PN[p] || p), el('small', null, 'personalidade · começa com 4 itens')); const r1 = el('div', 'ir'); ids.slice(0, 4).forEach(id => { const w = el('div', 'it'); w.title = item(id).name + ' — ' + item(id).fx; w.append(icon(id, 3), el('span', null, item(id).name)); r1.append(w); }); c.append(r1);
    c.append(el('small', null, 'pode achar')); const r2 = el('div', 'ir'); ids.slice(4).forEach(id => { const w = el('div', 'it'); w.title = item(id).name + ' — ' + item(id).fx; w.append(icon(id, 2), el('span', null, item(id).name)); r2.append(w); }); c.append(r2);
    c.append(el('small', null, 'hobby · um item a mais, que alguns personagens têm e outros não')); const r3 = el('div', 'ir'); PH[p].forEach((h, i) => { const [nm, id] = HOB[h], w = el('div', 'it' + (i ? ' alt' : '')); w.title = (i ? 'também pode gostar de ' : 'hobby: ') + nm; w.append(icon(id, 3), el('span', null, nm + (i ? ' (às vezes)' : ''))); r3.append(w); }); c.append(r3); inv.append(c); });
}
inventory(); setTimeout(inventory, 600);
G.CHARS = { heroes, inventory };
})(window);
