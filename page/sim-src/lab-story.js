// FM1 Quest lab — Story tab (storyboard of the opening) and Cenas tab (each scene alone, with its controls).
(function (G) {
'use strict';
const SC = G.SCENES, Store = G.Store; if (!SC) return;
const $ = (s, r) => (r || document).querySelector(s), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const TYPES = SC.SCENES, TRANS = G.TRANSFX ? Object.fromEntries(Object.entries(G.TRANSFX.KINDS).map(([k, v]) => [k, v.name])) : { cut: 'corte seco', fade: 'fusão', iris: 'íris', tv: 'TV ligando', vhs: 'VHS', flash: 'clarão' };
const MUSIC = ['— sem trilha —'].concat(G.GAME ? G.GAME.TAPES.map(t => t.title) : ['Taverna', 'Estrada', 'Vila ao entardecer', 'Colina', 'Luta', 'Cemitério', 'Forja', 'Jam da banda']);
const LAYERS = { tavern: ['parede (fundo)', 'lareira e ganchos', 'mesa', 'personagens', 'luz'], board: ['parede', 'quadro e avisos', 'chão', 'personagens de costas', 'lanterna'], exit: ['sala escura (fundo)', 'porta e luz', 'chão', 'silhuetas'], town: ['céu', 'montanhas distantes', 'casas ao fundo (parallax .14)', 'casas do meio (.34)', 'rua e fachadas', 'props: lampiões, barris, barracas (.62)', 'multidão em 3 fileiras', 'grupo', 'primeiro plano escuro (1.5)'], vista: ['céu e sol', 'nuvens', 'montanhas em 4 camadas', 'névoa', 'colina', 'grupo de costas', 'rochas do primeiro plano'], walk: ['céu', 'montanhas', 'árvores (.5)', 'estrada', 'monstros', 'grupo'], fight: ['céu', 'colinas', 'chão', 'monstro / chefe', 'heróis 15×15', 'barras de vida e carga', 'golpe final'] };
const uid = () => Math.random().toString(36).slice(2, 8);
const mkScene = type => ({ id: uid(), type, title: TYPES[type].name, dur: TYPES[type].dur, trans: 'cut', music: MUSIC[0], caption: '', note: '', params: SC.defaults(type) });
const SEQ = ['tavern', 'board', 'exit', 'street', 'grave', 'vista', 'walk', 'fight'];
const NOTES = {
  logo: ['', 'Preto; o emblema do estúdio aparece e some (trailer: ~2 s).'], tavern: ['Amanhece na taverna. O grupo se levanta e pega o equipamento.', 'Os 4 sentados à mesa; levantam; pegam o equipamento nos ganchos; saem para o quadro de missões.'],
  board: ['Hoje tem missão nova.', 'Câmera de costas: 4 heróis em frente ao quadro. Um aponta um aviso.'], exit: ['', 'Corte: saem da taverna em silhueta contra a luz.'],
  street: ['', 'Segue o trailer: UMA panorâmica contínua, sem cortes. Casa de pedra + quadro + cavalo → poções → enxaimel → casarão → forja → telhado vermelho → torre com estandartes → hora dourada → noite. Companheiros entram no grupo.'],
  oath: ['', 'Apagão: silhuetas, rei e rainha, uma ajoelha e a outra vira brilhos.'], grave: ['', 'Cemitério: grupo à esquerda, a de cabelo branco à frente.'], title: ['', 'Cartela do título.'],
  vista: ['', 'Colina com vista: montanhas em camadas, nuvens, rochas; o grupo de costas.'], walk: ['', 'Caminhada lateral; monstros aparecem; o encontro vira luta.'], fight: ['', 'A luta usa os sprites 15×15. O chefe gigante fica depois do loop; carga cheia no começo; golpe final de um herói sorteado.'] };
// how each scene is joined to the one before it (what the viewer's eye keeps from one frame to the next):
//  exit→street: the light of the open door melts into the street (soft fade, no white flash) · street→grave: dots (same hour, new place) · grave→vista: soft fade · vista→walk: slide (we keep walking to the right) · walk→fight: pixelate (no flashing)
const TRANSIN = { street: 'fade', grave: 'dither', vista: 'fade', walk: 'slide', fight: 'pixel' }, MUS = { tavern: 1, street: 3, vista: 4, walk: 2, fight: 5, grave: 6 };
const DEFAULT = () => { const s = { band: true, wire: true, rev: 3, scenes: SEQ.map(mkScene) };
  s.scenes.forEach(sc => { const n = NOTES[sc.type]; if (n) { sc.caption = n[0]; sc.note = n[1]; } if (TRANSIN[sc.type]) sc.trans = TRANSIN[sc.type]; if (MUS[sc.type] != null) sc.music = MUSIC[MUS[sc.type]]; });
  return s; };
// stories saved by older versions get the new opening scenes added at the right places (nothing the user edited is removed)
function migrate(S) {
  if ((S.rev || 1) >= 3) return S;
  if ((S.rev || 1) < 2) { const has = t => S.scenes.some(x => x.type === t); if (!has('street')) { const i = S.scenes.findIndex(x => x.type === 'exit'), sc = mkScene('street'); S.scenes.splice(i < 0 ? S.scenes.length : i + 1, 0, sc); } }
  S.scenes = S.scenes.filter(x => !['logo', 'oath', 'title'].includes(x.type)); if (!S.scenes.some(x => x.type === 'grave')) { const i = S.scenes.findIndex(x => x.type === 'street'), sc = mkScene('grave'); sc.trans = 'dither'; S.scenes.splice(i < 0 ? S.scenes.length : i + 1, 0, sc); }
  S.scenes.forEach(x => { if (x.type === 'street' && x.params) { delete x.params.speed; delete x.params.forja; x.params.crowd = Math.max(x.params.crowd || 0, .95); } if (x.type === 'grave' && x.params) delete x.params.nevoa; });
  S.rev = 3; return S; }
let full = () => {}, syncUndo = () => {};   // assigned once the Story UI exists (used by undo/redo and edits)
let ST = DEFAULT(), sel = 0, T = 0, playing = false, last = performance.now(), hist = [], fut = [], loaded = false;
const total = () => ST.scenes.reduce((a, s) => a + s.dur, 0);
const locate = tt => { let a = 0; for (let i = 0; i < ST.scenes.length; i++) { if (tt < a + ST.scenes[i].dur || i === ST.scenes.length - 1) return { i, t: clamp(tt - a, 0, ST.scenes[i].dur), start: a }; a += ST.scenes[i].dur; } return { i: 0, t: 0, start: 0 }; };
const starts = () => { let a = 0; return ST.scenes.map(s => { const x = a; a += s.dur; return x; }); };
const snap = () => JSON.stringify(ST);
function push() { hist.push(snap()); if (hist.length > 120) hist.shift(); fut = []; syncUndo(); }
function undo() { if (!hist.length) return; fut.push(snap()); ST = JSON.parse(hist.pop()); sel = clamp(sel, 0, ST.scenes.length - 1); full(); persist(); }
function redo() { if (!fut.length) return; hist.push(snap()); ST = JSON.parse(fut.pop()); sel = clamp(sel, 0, ST.scenes.length - 1); full(); persist(); }
function persist() { const b = $('#st-saved'); if (b) { b.textContent = 'salvando…'; } Store.debounce('story', () => ST, 500); setTimeout(() => { const b2 = $('#st-saved'); if (b2) b2.textContent = 'salvo neste navegador'; }, 900); }

G.STORY = G.STORY || {};
// ================================================================ Story UI
const host = document.getElementById('story');
if (host) {
  host.classList.add('story');
  host.innerHTML = `<div class="st-bar"><button id="st-play" class="on">▶</button><input type="range" id="st-scrub" min="0" max="1000" value="0"><output id="st-time">0:00</output>
    <button id="st-edit" title="abre o Editor para desenhar os bonecos">editar os bonecos</button><button id="st-wire" title="esboço (linhas e cores por profundidade) ou cena melhorada">esboço ↔ cena</button><span class="sv">bonecos <span class="chips" id="st-hero"><button data-v="32">32</button><button data-v="40">40</button><button data-v="48">48</button></span></span><label class="sv" title="usa no lugar do boneco os conjuntos que você desenhou no Editor e ligou a uma animação"><input type="checkbox" id="st-spr" checked> meus sprites</label><button id="st-lines" title="desenha o contorno de cada camada na sua cor de profundidade">linhas das camadas</button><button id="st-band" title="faixa de cinema 240×160 ou tela cheia 240×240">faixa 240×160</button>
    <span class="sep"></span><button id="st-undo" title="desfazer (Ctrl+Z)">↶</button><button id="st-redo" title="refazer">↷</button><span class="sv" id="st-saved">salvo neste navegador</span>
    <span class="sep"></span><button id="st-exp">exportar JSON</button><label class="filebtn">importar<input type="file" id="st-imp" accept="application/json"></label><button id="st-sheet" title="baixa uma página com 3 quadros, o texto e a ligação de cada cena">exportar storyboard</button><button id="st-reset">refazer do zero</button></div>
  <div class="st-main"><div class="st-view"><div class="st-frame"><canvas id="st-cv" width="240" height="240"></canvas><div class="st-cap" id="st-cap"></div><div class="st-tag" id="st-tag"></div><img id="st-refov" class="st-refov" alt=""></div><div class="st-legend" id="st-leg"></div>
    <div class="st-ref" id="st-ref"><img id="st-refimg" alt=""><div><b>referência: quadro do trailer</b><small id="st-refcap"></small><label><input type="checkbox" id="st-refck"> sobrepor no quadro (50%)</label></div></div></div>
   <div class="st-side" id="st-side"></div></div>
  <div class="st-strip" id="st-strip"></div>`;
  const cv = $('#st-cv', host), tmpA = document.createElement('canvas'), tmpB = document.createElement('canvas'); tmpA.width = tmpA.height = tmpB.width = tmpB.height = 240;
  const side = $('#st-side', host), strip = $('#st-strip', host);
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function drawTrans(ctx, kind, p, A, B, H) { if (G.TRANSFX) G.TRANSFX.draw(ctx, kind, p, A, B, H); else ctx.drawImage(B, 0, 0); }
  function renderAt(tt, canvas, ov) {
    const hold = G.STORY.hold && canvas !== cv ? G.STORY.hold : null, loc = hold ? { i: hold.i, t: hold.t, start: hold.start } : locate(tt), s = ST.scenes[loc.i], H = ST.band ? 160 : 240, o = { music: canvas !== cv && !!(hold || G.STORY.music), vt: hold ? hold.t : 99, wire: ov && ov.wire != null ? ov.wire : ST.wire, band: ST.band, pal: s.pal, layers: s.layers, lines: ST.lines && canvas === cv, cap: s.caption, hud: (loc.i + 1) + '/' + ST.scenes.length + ' · ' + s.title }, ctx = canvas.getContext('2d');
    SC.render(tmpB, s.type, loc.t, s.params, o);
    const tl = G.TRANSFX && G.TRANSFX.KINDS[s.trans] ? G.TRANSFX.KINDS[s.trans].dur : .7; ctx.clearRect(0, 0, 240, 240);
    if (G.STORY.from && (G.STORY.from.toI !== loc.i || loc.t >= tl)) G.STORY.from = null;
    if (loc.i > 0 && loc.t < tl && s.trans !== 'cut') { const fr = G.STORY.from && G.STORY.from.toI === loc.i ? G.STORY.from : null, ps = fr ? fr.s : ST.scenes[loc.i - 1]; SC.render(tmpA, ps.type, fr ? fr.tt + loc.t : ps.dur, ps.params, fr ? Object.assign({}, o, { music: false }) : o); drawTrans(ctx, s.trans, loc.t / tl, tmpA, tmpB, H); } else ctx.drawImage(tmpB, 0, 0);
    if (canvas === cv) { const nm = tmpB._layers || []; if (nm.join('|') !== host._layerKey) { host._layerKey = nm.join('|'); layerUI(nm); } }
    return loc;
  }
  function layerUI(names) {
    const box = $('#st-lay', host); if (!box) return; const s = ST.scenes[sel]; if (!s) return; s.layers = s.layers || {};
    const lg = $('#st-leg', host); if (lg) lg.innerHTML = '<b>camadas</b> ' + names.map((n, i, a) => `<span><i style="background:${SC.DEPTH[Math.min(5, Math.round(i / Math.max(1, a.length - 1) * 5))]}"></i>${n}</span>`).join('');
    box.innerHTML = '<b>camadas</b> <small>(o olho oculta · o controle muda a velocidade do parallax)</small>' + names.map((n, i) => { const c = s.layers[n] || {}, col = SC.DEPTH[Math.min(5, Math.round(i / Math.max(1, names.length - 1) * 5))]; return `<div class="lyr"><i style="background:${col}"></i><label><input type="checkbox" data-v="${n}" ${c.vis === false ? '' : 'checked'}> ${n}</label><input type="range" data-sp="${n}" min="0" max="300" value="${Math.round((c.spd || 1) * 100)}" title="velocidade"><output>${Math.round((c.spd || 1) * 100)}%</output></div>`; }).join('');
    box.querySelectorAll('[data-v]').forEach(cb => cb.onchange = () => { push(); s.layers[cb.dataset.v] = Object.assign(s.layers[cb.dataset.v] || {}, { vis: cb.checked }); stripUI(); persist(); });
    box.querySelectorAll('[data-sp]').forEach(r => r.oninput = () => { s.layers[r.dataset.sp] = Object.assign(s.layers[r.dataset.sp] || {}, { spd: +r.value / 100 }); r.nextElementSibling.textContent = r.value + '%'; persist(); });
  }
  G.STORY.renderTo = (canvas, tt, ov) => renderAt(tt, canvas, ov);
  function paintView() {
    const loc = renderAt(T, cv), s = ST.scenes[loc.i]; $('#st-cap', host).textContent = s.caption || ''; $('#st-cap', host).style.display = s.caption && !ST.band ? '' : 'none';
    $('#st-tag', host).textContent = (loc.i + 1) + '/' + ST.scenes.length + ' · ' + s.title + ' · ' + loc.t.toFixed(1) + ' s'; $('#st-time', host).textContent = fmt(T) + ' / ' + fmt(total());
    $('#st-scrub', host).value = Math.round(T / total() * 1000);
    host.querySelectorAll('.st-card').forEach((c, i) => c.classList.toggle('now', i === loc.i));
    const rg = SC.TRAILER_REF && SC.TRAILER_REF[s.type], box = $('#st-ref', host); box.style.display = rg ? '' : 'none'; if (rg) { const n = Math.round(rg[0] + (rg[1] - rg[0]) * clamp(loc.t / s.dur, 0, 1)), src = 'ref/trailer/f_' + String(n).padStart(2, '0') + '.jpg'; if (box._src !== src) { box._src = src; $('#st-refimg', host).src = src; $('#st-refov', host).src = src; $('#st-refcap', host).textContent = 'f_' + String(n).padStart(2, '0') + ' (de ' + rg[0] + ' a ' + rg[1] + ' do vídeo, um quadro a cada 2 s)'; } }
    else { $('#st-refov', host).style.display = 'none'; }
    if (rg) { const ov = $('#st-refov', host); ov.style.display = $('#st-refck', host).checked ? '' : 'none'; ov.style.height = ST.band ? '320px' : '480px'; } return loc;
  }
  // visual scene picker: thumbnails instead of a dropdown
  const pickCache = {};
  function pickScene(title, cb) {
    const ov = el('div', 'st-pickback'), box = el('div', 'st-pick', `<button class="x">fechar ✕</button><h3>${title}</h3><div class="pg"></div>`); ov.append(box); document.body.append(ov); const close = () => ov.remove(); ov.onmousedown = e => { if (e.target === ov) close(); }; box.querySelector('.x').onclick = close;
    Object.entries(TYPES).forEach(([k, v]) => { const c = el('button', 'pc', `<canvas width="240" height="160"></canvas><b>${v.name}</b><small>${v.desc.split('. ')[0]}.</small>`), cv = c.querySelector('canvas'); let img = pickCache[k]; if (!img) { const t0 = document.createElement('canvas'); t0.width = t0.height = 240; SC.render(t0, k, v.dur * .45, SC.defaults(k), { wire: false, band: true, nohud: true }); img = pickCache[k] = t0; } cv.getContext('2d').drawImage(img, 0, 0, 240, 160, 0, 0, 240, 160); c.onclick = () => { close(); cb(k); }; box.querySelector('.pg').append(c); });
  }
  function stripUI() {
    strip.innerHTML = ''; const st = starts();
    ST.scenes.forEach((s, i) => {
      const c = el('div', 'st-card' + (i === sel ? ' sel' : '')), th = document.createElement('canvas'); th.width = th.height = 240; const mid = document.createElement('canvas'); mid.width = mid.height = 240;
      SC.render(mid, s.type, s.dur * .45, s.params, { wire: ST.wire, band: ST.band, pal: s.pal }); th.getContext('2d').drawImage(mid, 0, 0); th.style.aspectRatio = ST.band ? '3/2' : '1/1'; th.style.objectFit = 'cover'; th.style.objectPosition = 'top';
      c.append(th); c.insertAdjacentHTML('beforeend', `<b>${i + 1}. ${s.title}</b><small>${s.dur} s · ${TRANS[s.trans]}</small><i style="width:${s.dur / total() * 100}%"></i>`);
      c.onclick = () => { sel = i; T = st[i] + .01; host._layerKey = ''; stripUI(); sideUI(); paintView(); }; strip.append(c);
    });
    const add = el('div', 'st-add', '<button id="st-addbtn"><span>+</span>adicionar cena</button>'); strip.append(add);
    $('#st-addbtn', host).onclick = () => pickScene('Adicionar qual cena?', type => { push(); ST.scenes.splice(sel + 1, 0, mkScene(type)); sel++; full(); persist(); });
  }
  function sideUI() {
    host._layerKey = '';                                   // the side panel is rebuilt: the layer list must be rebuilt too
    const s = ST.scenes[sel], T0 = TYPES[s.type]; if (!s) return;
    const chips = (id, items, cur) => `<div class="chips" id="${id}">${items.map(([v, l, st]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}" ${st ? `style="${st}"` : ''}>${l}</button>`).join('')}</div>`;
    const PALS = G.STYLE ? G.STYLE.PALS : {}, palDot = k => `background:${k && PALS[k] ? PALS[k].tones[2] : k === 'original' ? 'linear-gradient(135deg,#d44,#4a4,#44d)' : '#777'}`;
    side.innerHTML = `<h4>Cena ${sel + 1} · ${T0.name}</h4><p class="d">${T0.desc}</p>
     <label>título <input id="p-title" value="${s.title.replace(/"/g, '&quot;')}"></label>
     <div class="row"><button id="p-swap">trocar por outra cena…</button></div>
     <label>duração <input type="range" id="p-dur" min="2" max="60" step=".5" value="${s.dur}"><output>${s.dur} s</output></label>
     ${T0.params.map(p => `<label>${p.l} <input type="range" data-p="${p.id}" min="0" max="1" step=".01" value="${s.params[p.id]}"><output>${Math.round(s.params[p.id] * 100)}</output></label>`).join('')}
     <div class="lab">as mudanças valem para</div>${chips('p-prop', [['one', 'só esta cena'], ['type', 'todas as cenas iguais a esta']], ST.prop || 'one')}
     <div class="lab">como esta cena começa (ligação com a anterior)</div>${chips('p-trans', Object.entries(TRANS).map(([k, v]) => [k, v]), s.trans)}
     <div class="lab">cores da cena</div>${chips('p-pal', [['', 'auto', palDot('')], ...Object.entries(PALS).map(([k, v]) => [k, v.name.split(' · ')[0], palDot(k)]), ['original', 'originais', palDot('original')]].map(([v, l, st]) => [v, `<i style="${st}"></i>${l}`]), s.pal || '')}
     <div class="lab">música (fita)</div>${chips('p-music', MUSIC.map((m, i) => [m, i ? m : 'nenhuma']), s.music)}
     <label>legenda <textarea id="p-cap" rows="2">${s.caption}</textarea></label><label>anotação <textarea id="p-note" rows="3">${s.note}</textarea></label>
     ${s.type === 'fight' ? '<div id="st-ult" class="ultbox"></div>' : ''}
     <div id="st-lay" class="lays"></div><div class="row"><button id="p-up">↑ subir</button><button id="p-dn">↓ descer</button><button id="p-dup">duplicar</button><button id="p-del">apagar</button></div>`;
    if (s.type === 'fight' && G.ULT && $('#st-ult', host)) G.ULT.ui($('#st-ult', host));
    $('#st-leg', host).innerHTML = '<b>camadas</b> ' + (LAYERS[s.type] || []).map((n, i, a) => `<span><i style="background:${SC.DEPTH[Math.min(5, Math.round(i / Math.max(1, a.length - 1) * 5))]}"></i>${n}</span>`).join('');
    const propTargets = pid => ST.prop === 'type' ? ST.scenes.filter(x => x.type === s.type) : [s];
    const bindChips = (id, fn) => side.querySelectorAll('#' + id + ' button').forEach(b => b.onclick = () => fn(b.dataset.v));
    let burst = 0; const first = () => { if (Date.now() - burst > 700) push(); burst = Date.now(); };
    $('#p-title', host).oninput = e => { first(); s.title = e.target.value; stripUI(); persist(); };
    $('#p-swap', host).onclick = () => pickScene('Trocar esta cena por…', type => { push(); s.type = type; s.params = SC.defaults(type); s.dur = TYPES[type].dur; s.title = TYPES[type].name; s.layers = {}; full(); persist(); });
    $('#p-dur', host).oninput = e => { first(); propTargets('dur').forEach(x => { x.dur = +e.target.value; }); e.target.nextElementSibling.textContent = e.target.value + ' s'; stripUI(); persist(); };
    side.querySelectorAll('[data-p]').forEach(r => r.oninput = () => { first(); const pid = r.dataset.p; propTargets(pid).forEach(x => { if (pid in x.params) x.params[pid] = +r.value; }); r.nextElementSibling.textContent = Math.round(r.value * 100); stripUI(); paintView(); persist(); });
    bindChips('p-prop', v => { ST.prop = v; persist(); sideUI(); });
    bindChips('p-pal', v => { push(); propTargets('pal').forEach(x => { x.pal = v; }); full(); persist(); });
    bindChips('p-trans', v => { push(); propTargets('trans').forEach(x => { x.trans = v; }); full(); persist(); T = Math.max(0, starts()[sel] - .5); playing = true; last = performance.now(); const pb = $('#st-play', host); pb.classList.add('on'); pb.textContent = '❚❚'; });
    bindChips('p-music', v => { push(); propTargets('music').forEach(x => { x.music = v; }); persist(); sideUI(); });
    $('#p-cap', host).oninput = e => { first(); s.caption = e.target.value; paintView(); persist(); }; $('#p-note', host).oninput = e => { first(); s.note = e.target.value; persist(); };
    $('#p-up', host).onclick = () => { if (sel > 0) { push(); [ST.scenes[sel - 1], ST.scenes[sel]] = [ST.scenes[sel], ST.scenes[sel - 1]]; sel--; full(); persist(); } };
    $('#p-dn', host).onclick = () => { if (sel < ST.scenes.length - 1) { push(); [ST.scenes[sel + 1], ST.scenes[sel]] = [ST.scenes[sel], ST.scenes[sel + 1]]; sel++; full(); persist(); } };
    $('#p-dup', host).onclick = () => { push(); const c = JSON.parse(JSON.stringify(s)); c.id = uid(); c.title += ' (cópia)'; ST.scenes.splice(sel + 1, 0, c); sel++; full(); persist(); };
    $('#p-del', host).onclick = () => { if (ST.scenes.length < 2) return; push(); ST.scenes.splice(sel, 1); sel = clamp(sel, 0, ST.scenes.length - 1); full(); persist(); };
  }
  syncUndo = function () { $('#st-undo', host).disabled = !hist.length; $('#st-redo', host).disabled = !fut.length; };
  function bar() { $('#st-wire', host).classList.toggle('on', ST.wire); $('#st-lines', host).classList.toggle('on', !!ST.lines); $('#st-wire', host).textContent = ST.wire ? 'vendo: esboço (linhas)' : 'vendo: cena final'; $('#st-band', host).textContent = ST.band ? 'faixa 240×160' : 'tela cheia 240×240'; $('#st-band', host).classList.toggle('on', ST.band); $('.st-frame', host).style.height = '480px'; cv.style.objectFit = 'cover'; cv.style.objectPosition = 'top'; syncUndo(); }
  full = function () { bar(); stripUI(); sideUI(); paintView(); };
  $('#st-play', host).onclick = e => { playing = !playing; e.target.classList.toggle('on', playing); e.target.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
  $('#st-scrub', host).oninput = e => { T = +e.target.value / 1000 * total(); const l = locate(T); if (sel !== l.i) host._layerKey = ''; sel = l.i; stripUI(); sideUI(); paintView(); };
  $('#st-wire', host).onclick = () => { ST.wire = !ST.wire; persist(); full(); }; $('#st-lines', host).onclick = () => { ST.lines = !ST.lines; persist(); full(); }; $('#st-band', host).onclick = () => { ST.band = !ST.band; persist(); full(); };
  const heroChips = () => host.querySelectorAll('#st-hero button').forEach(b => b.classList.toggle('on', +b.dataset.v === SC.CFG.hero)); heroChips();
  host.querySelectorAll('#st-hero button').forEach(b => b.onclick = () => { SC.CFG.hero = +b.dataset.v; ST.hero = SC.CFG.hero; heroChips(); persist(); stripUI(); paintView(); });
  $('#st-spr', host).onchange = e => { if (G.SPR) G.SPR.on = e.target.checked; ST.spr = e.target.checked; persist(); stripUI(); paintView(); };
  $('#st-edit', host).onclick = () => { const b = [...document.querySelectorAll('#tabs button')].find(x => x.textContent === 'Editor'); if (b) b.click(); };
  $('#st-undo', host).onclick = undo; $('#st-redo', host).onclick = redo;
  $('#st-exp', host).onclick = () => { const a = document.createElement('a'); a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(ST, null, 1)); a.download = 'storyboard.json'; a.click(); };
  $('#st-imp', host).onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const j = JSON.parse(t); if (j.scenes && j.scenes.length) { push(); ST = j; sel = 0; T = 0; full(); persist(); } } catch (err) { alert('JSON inválido'); } }); e.target.value = ''; };
  $('#st-reset', host).onclick = () => { if (confirm('Voltar ao storyboard inicial? (dá para desfazer)')) { push(); ST = DEFAULT(); sel = 0; T = 0; full(); persist(); } };
  // storyboard export: a self-contained page, one card per scene (three frames, the scene text as a prompt, how it joins the previous scene)
  const CONT = { 'tavern>board': 'o grupo levantado vira o grupo visto de costas, parado diante do quadro (mesmo enquadramento, mesma luz da lareira)', 'board>exit': 'depois de ler o aviso eles se viram e vão para a porta: o movimento continua para o mesmo lado', 'exit>street': 'o branco da porta aberta se derrete na luz da rua; os heróis saem da silhueta e já estão andando para a direita', 'street>grave': 'pontilhado: o mesmo dia muda de lugar sem corte seco; a paleta troca de marrom quente para azul frio', 'grave>vista': 'fusão suave: o grupo continua em pé, a câmera sobe para o horizonte', 'vista>walk': 'deslizar: a câmera desce da colina e o grupo volta a andar para a direita', 'walk>fight': 'pixelar: a cena vira blocos grandes e volta como a arena do chefe' };
  $('#st-sheet', host).onclick = () => {
    const esc = x => String(x || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), cv0 = document.createElement('canvas'); cv0.width = cv0.height = 240; let html = '';
    ST.scenes.forEach((sc, i) => { const imgs = [.15, .5, .85].map(u => { SC.render(cv0, sc.type, sc.dur * u, sc.params, { wire: false, band: ST.band, pal: sc.pal, layers: sc.layers, nohud: true, cap: sc.caption }); return cv0.toDataURL('image/png'); });
      const prev = i ? ST.scenes[i - 1] : null, tr = G.TRANSFX && G.TRANSFX.KINDS[sc.trans], link = prev ? (CONT[prev.type + '>' + sc.type] || 'mantém a direção do movimento e a paleta da cena anterior') : 'abertura: começa direto na cena',
        prompt = `Cena ${i + 1} — ${sc.title} (${sc.dur} s). ${sc.note || ''}${sc.caption ? ' Texto na tela: “' + sc.caption + '”.' : ''} Entrada: ${tr ? tr.name : sc.trans}${prev ? ', ligando com “' + prev.title + '”: ' + link : ''}.`;
      html += `<section><div class="fr">${imgs.map(u => `<img src="${u}">`).join('')}</div><h2>${i + 1}. ${esc(sc.title)} <small>${sc.dur} s · música: ${esc(sc.music)}</small></h2><p>${esc(sc.note)}</p>${sc.caption ? `<p class="cap">“${esc(sc.caption)}”</p>` : ''}<p class="tr"><b>entrada:</b> ${esc(tr ? tr.name : sc.trans)} — ${esc(tr ? tr.desc : '')}<br><b>ligação:</b> ${esc(link)}</p><pre>${esc(prompt)}</pre></section>`; });
    const doc = `<!doctype html><meta charset="utf-8"><title>Storyboard · FM1 Quest</title><style>body{background:#1a1520;color:#f2e2c4;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px;max-width:1100px;margin:auto}section{border-top:1px solid #4a3a52;padding:22px 0}.fr{display:flex;gap:10px}.fr img{width:300px;image-rendering:pixelated;border-radius:4px}h2{margin:12px 0 4px;font-size:20px}h2 small{color:#a89080;font-weight:400;font-size:13px;margin-left:8px}.cap{color:#e0b84a}.tr{color:#a89080}pre{white-space:pre-wrap;background:#241c2c;padding:10px;border-radius:6px;color:#d8cfae;font:12px/1.5 ui-monospace,Menlo,monospace}</style><h1>Storyboard · FM1 Quest</h1>${html}`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' })); a.download = 'storyboard-fm1-quest.html'; a.click(); };
  addEventListener('keydown', e => { if (!host.offsetParent || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); } });
  (async () => { const saved = await Store.get('story', null); if (saved && saved.scenes && saved.scenes.length) { ST = migrate(saved); if (ST.hero) { SC.CFG.hero = ST.hero; heroChips(); } } if (ST.spr === false) { if (G.SPR) G.SPR.on = false; $('#st-spr', host).checked = false; } loaded = true; full(); })();
  full();
  (function loop(now) { requestAnimationFrame(loop); if (!host.offsetParent) { last = now; return; } const dt = Math.min(.1, (now - last) / 1000); last = now; if (playing) { T += dt; if (T >= total()) T = 0; const l = locate(T); if (l.i !== sel) { sel = l.i; host._layerKey = ''; stripUI(); sideUI(); } } paintView(); })(performance.now());
}

// ================================================================ Cenas tab: every scene alone
const gal = document.getElementById('scenes');
if (gal) {
  gal.classList.add('scgal'); const cards = [];
  Object.entries(TYPES).forEach(([id, def]) => {
    const c = el('div', 'sccard'); c.innerHTML = `<div class="scv"><canvas width="240" height="240"></canvas></div><div class="scc"><h4>${def.name}</h4><p>${def.desc}</p>
      <label>tempo <input type="range" class="t" min="0" max="${def.dur}" step=".05" value="0"><output>0 s</output></label>${def.params.map(p => `<label>${p.l} <input type="range" data-p="${p.id}" min="0" max="1" step=".01" value="${p.v}"><output>${Math.round(p.v * 100)}</output></label>`).join('')}
      <div class="row"><button class="pl on">▶</button><button class="wi on">esboço</button><button class="bd on">faixa</button></div>
      <div class="lay"><b>camadas</b> ${(LAYERS[id] || []).map((n, i, a) => `<span><i style="background:${SC.DEPTH[Math.min(5, Math.round(i / Math.max(1, a.length - 1) * 5))]}"></i>${n}</span>`).join('')}</div></div>`;
    gal.append(c); const cv = c.querySelector('canvas'), st = { id, t: 0, play: true, wire: true, band: true, P: SC.defaults(id), vis: true }; cards.push(st);
    const fit = () => { c.querySelector('.scv').style.height = (st.band ? 320 : 480) + 'px'; }; fit();
    c.querySelector('.t').oninput = e => { st.t = +e.target.value; st.play = false; c.querySelector('.pl').classList.remove('on'); c.querySelector('.pl').textContent = '▶'; };
    c.querySelectorAll('[data-p]').forEach(r => r.oninput = () => { st.P[r.dataset.p] = +r.value; r.nextElementSibling.textContent = Math.round(r.value * 100); });
    c.querySelector('.pl').onclick = e => { st.play = !st.play; e.target.classList.toggle('on', st.play); e.target.textContent = st.play ? '▶' : '❚❚'; };
    c.querySelector('.wi').onclick = e => { st.wire = !st.wire; e.target.classList.toggle('on', st.wire); e.target.textContent = st.wire ? 'esboço' : 'cena'; };
    c.querySelector('.bd').onclick = e => { st.band = !st.band; e.target.classList.toggle('on', st.band); e.target.textContent = st.band ? 'faixa' : 'cheia'; fit(); };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(en => { st.vis = en.isIntersecting; })).observe(c);
    st.cv = cv; st.out = c.querySelector('.t'); st.def = def;
  });
  let lt = performance.now();
  (function loop(now) { requestAnimationFrame(loop); if (!gal.offsetParent) { lt = now; return; } const dt = Math.min(.1, (now - lt) / 1000); lt = now; cards.forEach(st => { if (!st.vis) return; if (st.play) { st.t += dt; if (st.t > st.def.dur) st.t = 0; st.out.value = st.t; } st.out.nextElementSibling.textContent = st.t.toFixed(1) + ' s'; SC.render(st.cv, st.id, st.t, st.P, { wire: st.wire, band: st.band }); }); })(performance.now());
}
Object.assign(G.STORY, { TRANS, MUSIC, total, locate, starts }); Object.defineProperty(G.STORY, 'ST', { get: () => ST, configurable: true });
})(window);
