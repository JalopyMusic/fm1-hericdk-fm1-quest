// FM1 Quest lab — resource budget simulator (SPI, draw cost, flash, RAM). Numbers marked "est." are my estimates, not measurements.
(function (G) {
'use strict';
const T = G.GFX, L = G.LAB, $ = s => document.querySelector(s);
const XIP = 581564, STRIP = 240 * 124 * 2, SLOTB = 81920, BPMS = 1500;
const pref = { get(k, d) { try { const v = localStorage.getItem('fm1lab.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('fm1lab.' + k, JSON.stringify(v)); } catch (e) {} } };
const EST = [
  ['Classe nova (≈10 quadros 24×32 em 4 bpp + máscara)', 4800, 'cada quadro = 24·32/2 + 24·32/8 = 480 B'],
  ['Poses extras dos 4 heróis (sono, ferido, vitória)', 5760, '3 quadros × 480 B × 4 heróis'],
  ['Paleta alternativa por classe', 32, '16 cores × 2 B'],
  ['Telas novas do Tier 1 (4 telas em C)', 12000, 'est.: ~3 KB de código por tela'],
  ['Mini-games Echo + FM Hero + Piano Hero + FM School', 16000, 'est.: ~4 KB por tela'],
  ['Menu fogueira (cena + textos)', 3500, 'est.'],
  ['Idiomas PT + ES (textos)', 3000, 'est.: ~1,5 KB por idioma'],
  ['Idioma JA em kana (fonte 8×8 + textos)', 3400, '~160 glifos × 8 B = 1,3 KB + textos'],
  ['Glifos latinos acentuados', 320, '~40 glifos × 8 B'],
  ['Sprites dos inimigos extras (ghost, mushroom, skull)', 2400, 'est.'],
];
const on = pref.get('bud.on', EST.map(() => false)), used = pref.get('bud.used', '');
function spiRows() {
  const rows = [];
  T.TILES.filter(t => !t.sim).forEach(t => { if (t.def.an) rows.push([t.def.name, t.def.an[0], t.def.an[1]]); });
  (L.TILES || []).filter(t => !t.sim).forEach(t => { const h = { duel: 110, boss: 84, party: 72, menu: 60 }[t.scr] || 84; rows.push([t.name, 240, t.scr === 'title' ? 24 : h]); });
  return rows.map(r => { const ms = r[1] * r[2] * 2 / BPMS, sh = ms * L.fps / 10; return { n: r[0], w: r[1], h: r[2], ms, sh, max: Math.floor(550 / ms) }; }).sort((a, b) => b.sh - a.sh);
}
function render() {
  const rows = spiRows(), worst = rows[0], vis = T.TILES.filter(t => t.vis && t.rects != null), cpu = vis.slice().sort((a, b) => b.rects - a.rects), sel = EST.reduce((s, e, i) => s + (on[i] ? e[1] : 0), 0), u = parseInt(used, 10), head = isNaN(u) ? null : XIP - u;
  const usr = L.usr || [0, 0, 0], B = (v, bad) => `<div class="bar${bad ? ' bad' : ''}"><i style="width:${Math.min(100, v)}%"></i></div>`;
  $('#o-bud').textContent = worst ? '· SPI ' + Math.round(worst.sh) + '%' : '';
  $('#o-bud').style.color = worst && worst.sh > 55 ? '#e0503c' : '';
  const el = $('#budget'); if (el.hidden || el.contains(document.activeElement)) return;
  el.innerHTML = `<h4>SPI do LCD (12 MHz = 1500 B/ms) a ${L.fps} fps · teto 55%</h4>
    <table><tr><th>tela</th><th>área</th><th>ms</th><th>uso</th><th>fps máx</th></tr>${rows.slice(0, 9).map(r => `<tr><td>${r.n}</td><td>${r.w}×${r.h}</td><td>${r.ms.toFixed(0)}</td><td style="color:${r.sh > 55 ? '#e9a99f' : '#bfe0b0'}">${Math.round(r.sh)}%</td><td>${r.max}</td></tr>`).join('')}</table>
    <div class="est">pior caso: ${worst ? worst.n : '—'} — ${worst ? Math.round(worst.sh) : 0}% do barramento. Meia resolução dobrada não reduz: os 240 px de largura continuam sendo enviados.</div>${B(worst ? worst.sh : 0, worst && worst.sh > 55)}
    <h4>CPU — retângulos desenhados por quadro (proxy; tempo em ms é do PC, não do aparelho)</h4>
    <table><tr><th>tela</th><th>retângulos</th><th>ms (PC)</th></tr>${cpu.slice(0, 6).map(t => `<tr><td>${t.def.name}</td><td>${t.rects}</td><td>${t.ms.toFixed(1)}</td></tr>`).join('') || '<tr><td colspan=3 class="est">role a página até as telas animadas</td></tr>'}</table>
    <h4>Flash do código (XIP) — limite ${XIP.toLocaleString('pt-BR')} B</h4>
    <div class="est">Quanto o firmware ocupa hoje: cole o número do último build (CI) — não consigo medir daqui.</div>
    <div style="margin:4px 0">usado hoje (B): <input type="number" id="bud-used" value="${used}" placeholder="ex.: 540000"></div>
    ${EST.map((e, i) => `<label style="display:block"><input type="checkbox" data-i="${i}" ${on[i] ? 'checked' : ''}> ${e[0]} <b>${e[1].toLocaleString('pt-BR')} B</b> <span class="est">${e[2]}</span></label>`).join('')}
    <div style="margin-top:4px">somado: <b>${sel.toLocaleString('pt-BR')} B</b> ${head == null ? '' : '· folga hoje <b>' + head.toLocaleString('pt-BR') + ' B</b> → depois: <b style="color:' + (head - sel < 0 ? '#e9a99f' : '#bfe0b0') + '">' + (head - sel).toLocaleString('pt-BR') + ' B</b>'}</div>${head == null ? '' : B((u + sel) / XIP * 100, head - sel < 0)}
    <div class="est">Todas as linhas acima são estimativas minhas. Antes de decidir, meça com o arquivo .map do CI.</div>
    <h4>Entrada MIDI do FM-1 (USB)</h4><div class="est">${T.INP.name || 'não conectado — use o botão FM-1 USB da barra'}${T.INP.log.length ? '<br>' + T.INP.log.slice(0, 5).map(r => 'st ' + r.st + ' · ' + r.d1 + ' · ' + r.d2).join('<br>') : ''}</div><h4>RAM e samples</h4>
    <div class="est">Buffer de cena (strip máx. do cv_*, 240×124×2): <b>${STRIP.toLocaleString('pt-BR')} B</b>. RAM livre total do chip: desconhecida (a medir).</div>
    <div class="est">Samples (região separada da flash, 3 slots × ${SLOTB.toLocaleString('pt-BR')} B): ${usr.map((v, i) => 'USR' + (i + 1) + ' ' + Math.round(v / SLOTB * 100) + '%').join(' · ')}</div>`;
  el.querySelectorAll('input[type=checkbox]').forEach(c => { c.onchange = () => { on[+c.dataset.i] = c.checked; pref.set('bud.on', on); render(); }; });
  const inp = el.querySelector('#bud-used'); if (inp) inp.onchange = () => { pref.set('bud.used', inp.value); render(); };
}
$('#c-budget').onclick = () => { const el = $('#budget'); el.hidden = !el.hidden; render(); };
setInterval(() => { if (!document.hidden) render(); }, 900);
G.LAB.budget = render;
})(window);
