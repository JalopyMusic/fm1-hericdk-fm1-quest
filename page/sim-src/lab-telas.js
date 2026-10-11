// FM1 Quest lab — Telas · histórico: em colunas, o que era na v0.1 (as telas do SLOOP), o que pensamos para a v0.2 (as telas do lab) e como está hoje (o firmware de verdade).
(function (G) {
'use strict';
const host = document.getElementById('telas'); if (!host) return;
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const css = el('style', null, `
#telas .th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;position:sticky;top:0;z-index:3;background:var(--bg,#14101a);padding:8px 0;border-bottom:1px solid #3a3644}
#telas .th b{font:700 14px system-ui;color:#f0c860}#telas .th small{display:block;color:#a89080;font:12px system-ui}
#telas .row{border-bottom:1px solid #2a2530;padding:12px 0}
#telas .row>h3{margin:0 0 8px;font:700 15px system-ui;color:#f2e2c4}
#telas .cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
#telas .cell{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;min-height:30px}
#telas .cell figure{margin:0;width:150px}#telas .cell img{width:150px;height:150px;image-rendering:pixelated;border-radius:6px;background:#14101a;display:block;cursor:zoom-in}
#telas .cell figcaption{font:11px system-ui;color:#a89080;margin-top:3px}
#telas .plan{width:100%;background:#1d1823;border-radius:8px;padding:8px 10px;font:12px/1.45 system-ui;color:#d8c8b0}
#telas .plan b{color:#f2e2c4}#telas .empty{color:#6a5a50;font:12px system-ui;padding:6px 0}
#telas .tag{display:inline-block;font:700 10px system-ui;padding:1px 6px;border-radius:9px;margin-left:6px;vertical-align:middle}
#telas .tag.new{background:#2d4a2a;color:#a8e8a0}#telas .tag.old{background:#4a3a2a;color:#f0c860}
#telas input{background:#1d1823;color:#f2e2c4;border:1px solid #3a3644;border-radius:8px;padding:6px 10px;margin:8px 0;width:260px}
@media(max-width:900px){#telas .th,#telas .cols{grid-template-columns:1fr}}`);
document.head.append(css);
const ROWS = [
  { t: 'Abertura', v01: [], v02: ['title'], now: ['abertura-16-cores', 'abertura-4-cores'], n: 'Agora colorida (16 cores); a de 4 cores é a anterior.' },
  { t: 'Party · a aventura', v01: [], v02: ['party', 'equip'], now: ['page-tracks', 'party-camp-a', 'party-camp-b', 'party-run-a', 'party-run-b', 'party-fight'], n: 'Parados: o acampamento ocupa a tela toda; com PLAY todos correm para os lugares.' },
  { t: 'Vila', v01: [], v02: [], now: ['town-dawn', 'town-day', 'town-gold', 'town-sunset', 'town-night', 'town-late', 'town-guild-a', 'town-guild-b', 'town-guild-c', 'town-guild-d'], n: 'A rua com a guilda e o quadro de missões; o ciclo de moradores; quem está em rest para na rua.' },
  { t: 'Boss', v01: [], v02: ['boss', 'duel'], now: ['home-boss', 'home-boss-combo', 'home-boss2'], n: 'King Slime, combo, barras de ritmo finas e a cena em 2 passos.' },
  { t: 'Gravação (REC)', v01: [], v02: ['recready', 'count', 'mix'], now: ['live-rec-ready', 'live-rec-count', 'live-rec-countin', 'live-rec-free', 'live-rec-notes', 'live-rec-tempo', 'live-free-take'] },
  { t: 'Efeitos (FX / feitiços)', v01: ['fx2', 'fx3', 'fx4'], v02: ['fx', 'punch'], now: ['page-fx', 'layer-punch', 'layer-punch-on'] },
  { t: 'Envelope', v01: ['env1', 'env2'], v02: ['steps'], now: ['page-env', 'scene-0'] },
  { t: 'LFO', v01: ['lfo1', 'lfo2'], v02: [], now: ['scene-1', 'scene-2'] },
  { t: 'Escala', v01: ['scl1', 'scl2'], v02: ['key'], now: ['scene-6', 'page-scale'] },
  { t: 'Slicer · Delay · Reverb', v01: [], v02: [], now: ['scene-3', 'scene-4', 'scene-5'] },
  { t: 'Editar · Salvar · Sobre', v01: ['edit3', 'edit4', 'save1', 'about'], v02: ['erase'], now: ['page-edit', 'page-song', 'song-screen', 'page-about', 'page-about-mem', 'page-about-cr', 'page-step'] },
  { t: 'Camadas (segurar um botão)', v01: ['layer-roll', 'layer-song', 'layer-steps', 'hold-clear'], v02: [], now: ['layer-roll', 'layer-song', 'layer-steps', 'layer-erase', 'layer-key', 'layer-locked', 'layer-mix', 'hold-clear'] },
  { t: 'Menu', v01: [], v02: [], now: ['page-menu', 'page-party', 'page-party-flip', 'page-party-bard', 'page-party-warrior', 'page-status', 'page-led', 'page-importer', 'menu-usb', 'page-global', 'page-master'], n: 'Novo: SOUND SELECT, PARTY em terceiro, KEYBOARD LED, BOOT SOUND.' },
  { t: 'Kit · grade', v01: [], v02: ['kit', 'steps'], now: ['live-kit', 'live-grid', 'live-tracks'] },
  { t: 'Visualizadores', v01: [], v02: [], now: ['viz-0', 'viz-1', 'viz-2', 'viz-3', 'viz-4', 'viz-5'] },
  { t: 'Jogos (FM Hero · Piano Hero)', v01: [], v02: [], now: ['game-select', 'song-select', 'song-select-empty', 'game-0', 'game-1', 'game-result'], n: 'Song select com as fitas flutuantes; o tempo no knob SELECT.' },
];
const OLD = new Set(['page-rhythms', 'page-sounds', 'page-menu-lights', 'page-menu-notes', 'page-splash', 'party-front', 'party-run', 's', 'home-boss2']);
const used = new Set(); ROWS.forEach(r => r.now.forEach(n => used.add(n)));
const names = (window.FW_TELAS || []).slice();
const rest = names.filter(n => !used.has(n));
if (rest.length) ROWS.push({ t: 'Outras', v01: [], v02: [], now: rest, n: 'Capturas dos testes que não entraram nas linhas acima (algumas são de telas que já saíram).' });
const th = el('div', 'th', '<div><b>v0.1 · o SLOOP original</b><small>as telas do aparelho antes do Quest</small></div><div><b>v0.2 · o que pensamos</b><small>as telas do lab (protótipos)</small></div><div><b>Hoje · o firmware</b><small>capturas reais do que está no FM-1</small></div>');
const q = el('input'); q.placeholder = 'filtrar (boss, vila, menu…)';
host.append(q, th);
const rowsEl = el('div'); host.append(rowsEl);
const goto = tab => { const b = [...document.querySelectorAll('#tabs button')].find(x => x.dataset.n === tab); if (b) b.click(); };
function fig(src, cap, tag) { const f = el('figure'); f.innerHTML = `<a href="${src}" target="_blank"><img loading="lazy" src="${src}" alt="${cap}"></a><figcaption>${cap}${tag ? `<span class="tag ${tag}">${tag === 'new' ? 'novo' : 'antigo'}</span>` : ''}</figcaption>`; return f; }
function draw() {
  const f = q.value.trim().toLowerCase(); rowsEl.innerHTML = '';
  ROWS.filter(r => !f || (r.t + ' ' + r.now.join(' ')).toLowerCase().includes(f)).forEach(r => {
    const row = el('div', 'row'); row.append(el('h3', null, r.t + (r.n ? `<small style="font:12px system-ui;color:#a89080;margin-left:8px">${r.n}</small>` : '')));
    const cols = el('div', 'cols'), c1 = el('div', 'cell'), c2 = el('div', 'cell'), c3 = el('div', 'cell');
    if (r.v01.length) r.v01.forEach(n => c1.append(fig('shots/' + n + '.png', n))); else c1.append(el('div', 'empty', 'não existia'));
    const T = (G.LAB && G.LAB.TILES) || [];
    if (r.v02.length) { r.v02.forEach(s => { const t = T.find(x => x.scr === s); if (t) c2.append(el('div', 'plan', `<b>${t.name}</b> <span style="color:#a89080">${t.fw || ''}</span><br>${t.note || ''}`)); }); const b = el('button', null, 'ver no lab (Telas Quest)'); b.style.cssText = 'padding:5px 10px;border-radius:8px;border:1px solid #3a3644;background:#1d1823;color:#f0c860;cursor:pointer'; b.onclick = () => goto('Telas Quest'); c2.append(b); }
    else c2.append(el('div', 'empty', 'sem protótipo próprio (nasceu direto no firmware)'));
    r.now.forEach(n => c3.append(fig('firmware-telas/' + n + '.png', n, OLD.has(n) ? 'old' : '')));
    cols.append(c1, c2, c3); row.append(cols); rowsEl.append(row);
  });
}
q.oninput = draw; draw();
const bt = document.getElementById('go-telas'); if (bt) bt.onclick = () => goto('Telas (histórico)');
const ts = document.getElementById('toolshots');
if (ts) { ts.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px'; [['page-sounds', 'Seleção de sons (segurar PLAY)'], ['page-importer', 'Importer'], ['page-led', 'Luzes das teclas'], ['page-menu', 'Menu'], ['menu-usb', 'USB'], ['page-status', 'Status'], ['page-party', 'Party'], ['song-select', 'Song select'], ['game-select', 'Jogos']].forEach(([n, c]) => { const f = fig('firmware-telas/' + n + '.png', c); f.style.width = '200px'; f.querySelector('img').style.cssText = 'width:200px;height:200px;image-rendering:pixelated;border-radius:6px'; ts.append(f); }); }
})(window);
