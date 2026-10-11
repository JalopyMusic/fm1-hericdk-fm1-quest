// FM1 Quest — "Conheça os atalhos": balloons over the 3D panel, each with a line down to its button, in groups (arrows to flip through them).
// Hover a balloon for the full sentence; on a phone, tap it.
(function () {
'use strict';
const stage = document.querySelector('.stage3d'), S = window.SIM3D, T = window.THREE;
if (!stage || !S || !T) return;
const BPOS = { fx: [565, 420], sel: [618, 420], env: [670, 420], lfo: [723, 420], edit: [775, 420], glo: [829, 420], home: [565, 472], save: [618, 472], arp: [670, 472], seq: [723, 472], play: [775, 472], rec: [829, 472], octm: [160, 483], octp: [255, 483] };
const KPOS = { master: [147, 327], select: [237, 327], presets: [147, 415], algo: [237, 415], k1: [553, 327], k2: [647, 327], k3: [742, 327], k4: [838, 327] };
const KEYS = [145 + 47.53 * 4, 668];
const G = [
  ['Tocar e gravar', [
    ['play', 'PLAY', 'Toca e para o loop. Ao dar play aparece "Play!" na tela dos heróis.'],
    ['rec', 'REC', 'Arma a gravação. Segure 0,7 s para limpar o loop do herói ativo.'],
    ['save', 'SAVE', 'Camada de salvar. Segurado, salva o projeto.'],
    ['home', 'HOME', 'Toque: troca de tela inicial (Party, Vila, Boss). Segurado: abre o menu.']]],
  ['Camadas (segure e toque uma tecla)', [
    ['fx', 'FX', 'Spells: efeitos de performance, como loops e stutter, ao tocar uma tecla.'],
    ['edit', 'EDIT', 'Banish: apaga passos e notas do herói ativo.'],
    ['arp', 'ARP', 'Roll: repetição de notas e arpejo, com as últimas notas na tela.'],
    ['seq', 'SEQ', 'Steps: edita os passos do loop do herói ativo.'],
    ['glo', 'GLO', 'Camp: silencia ou libera os heróis e marca o andamento.']]],
  ['Ajuste de som', [
    ['env', 'ENV', 'Forja: envelope do som (ataque, decaimento, sustentação, release). Aperte de novo para a próxima página.'],
    ['lfo', 'LFO', 'Maré: o movimento do som. Aperte de novo para o destino.'],
    ['sel', 'SEL', 'Escolhe o parâmetro ou a camada que o encoder vai mudar.'],
    ['presets', 'PRESETS', 'Troca de som, de herói ou de música, conforme a tela.']]],
  ['Botões giratórios', [
    ['master', 'MASTER', 'Volume geral.'],
    ['select', 'SELECT', 'Gira para navegar; muda o BPM na tela inicial.'],
    ['k1', 'KNOB 1', 'Primeiro parâmetro da tela (o primeiro círculo).'],
    ['k2', 'KNOB 2', 'Segundo parâmetro da tela.'],
    ['k3', 'KNOB 3', 'Terceiro parâmetro da tela.'],
    ['k4', 'KNOB 4', 'Quarto parâmetro da tela.']]],
  ['Oitava e efeitos', [
    ['octm', 'OCT −', 'Desce a oitava. Na tela dos jogos, volta.'],
    ['octp', 'OCT +', 'Sobe a oitava. No menu Party, troca o bardo e o cleric.'],
    ['algo', 'ALGORITHM', 'Muda o motor de som da trilha.']]]
];
let on = false, g = 0, raf = 0;
const css = document.createElement('style');
css.textContent = `.keys3d{position:absolute;right:12px;bottom:54px;z-index:7;display:flex;gap:4px;align-items:center;font:600 12px system-ui,sans-serif}
.keys3d button{background:#14121aD9;border:1px solid #3a3644;color:#f2e2c4;border-radius:9px;padding:7px 10px;cursor:pointer;font:inherit}
.keys3d button:hover,.keys3d button.on{border-color:#f0c860;color:#fff}
.keys3d .arr{padding:7px 9px}
.kov{position:absolute;inset:0;z-index:5;pointer-events:none}
.kov svg{position:absolute;inset:0;width:100%;height:100%}
.kov path{fill:none;stroke:#f0c860;stroke-width:1.5;stroke-dasharray:var(--l);stroke-dashoffset:var(--l);animation:kdraw .6s ease-out forwards}
@keyframes kdraw{to{stroke-dashoffset:0}}
.kov .kb{position:absolute;pointer-events:auto;max-width:150px;background:#14121aF2;border:1px solid #f0c860;border-radius:10px;padding:6px 9px;color:#f2e2c4;font:12px/1.3 system-ui,sans-serif;cursor:default;animation:kpop .25s ease-out both}
.kov .kb b{display:block;color:#f0c860;font-size:12px}
.kov .kb span{display:none}
.kov .kb:hover span,.kov .kb.open span{display:block;margin-top:3px}
.kov .kt{position:absolute;left:12px;top:10px;color:#f0c860;font:700 13px system-ui,sans-serif;text-shadow:0 1px 2px #000}
@keyframes kpop{from{opacity:0;transform:translateY(8px)}to{opacity:1}}`;
document.head.append(css);
const bar = document.createElement('div'); bar.className = 'keys3d';
bar.innerHTML = '<button class="arr" data-d="-1" hidden>‹</button><button class="go">Conheça os atalhos</button><button class="arr" data-d="1" hidden>›</button>';
stage.append(bar);
const ov = document.createElement('div'); ov.className = 'kov'; ov.hidden = true; stage.append(ov);
function screen(id) {
  const p = BPOS[id] || KPOS[id] || KEYS, v = new T.Vector3((p[0] - 500) / 100, (500 - p[1]) / 100, 0.35);
  S.dev.localToWorld(v); v.project(S.camera);
  const c = S.renderer.domElement.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return [(v.x * .5 + .5) * c.width + c.left - s.left, (-v.y * .5 + .5) * c.height + c.top - s.top];
}
function build() {
  ov.innerHTML = '<div class="kt"></div><svg></svg>';
  ov.querySelector('.kt').textContent = G[g][0] + '  ·  ' + (g + 1) + '/' + G.length;
  const n = G[g][1].length, w = stage.clientWidth;
  G[g][1].forEach(([id, title, desc], i) => {
    const b = document.createElement('div'); b.className = 'kb'; b.dataset.id = id;
    b.style.left = Math.round((i + .5) * w / n - 70) + 'px'; b.style.top = (34 + (i % 2) * 38) + 'px'; b.style.animationDelay = (i * 60) + 'ms';
    b.innerHTML = '<b>' + title + '</b><span>' + desc + '</span>';
    b.onclick = () => b.classList.toggle('open');
    ov.append(b);
  });
  lines(true);
}
function lines(fresh) {
  const svg = ov.querySelector('svg'), sr = stage.getBoundingClientRect();
  let h = '';
  ov.querySelectorAll('.kb').forEach(b => {
    const [x, y] = screen(b.dataset.id), bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight, L = Math.hypot(x - bx, y - by) | 0;
    h += `<path d="M${bx} ${by} L${x} ${y}" style="--l:${L}${fresh ? '' : ';animation:none;stroke-dashoffset:0'}"/><circle cx="${x}" cy="${y}" r="4" fill="#f0c860"/>`;
  });
  svg.innerHTML = h;
}
function loop() { if (!on) return; if (ov.querySelector('svg')) { const s = ov.querySelector('svg'); const ps = s.querySelectorAll('path'); const bs = ov.querySelectorAll('.kb'); bs.forEach((b, i) => { const [x, y] = screen(b.dataset.id), bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight; if (ps[i]) ps[i].setAttribute('d', `M${bx} ${by} L${x} ${y}`); const c = s.querySelectorAll('circle')[i]; if (c) c.setAttribute('cx', x), c.setAttribute('cy', y); }); } raf = requestAnimationFrame(loop); }
function open() { on = true; ov.hidden = false; bar.querySelectorAll('.arr').forEach(b => b.hidden = false); bar.querySelector('.go').classList.add('on'); bar.querySelector('.go').textContent = 'Fechar atalhos'; build(); loop(); }
function close() { on = false; ov.hidden = true; cancelAnimationFrame(raf); bar.querySelectorAll('.arr').forEach(b => b.hidden = true); bar.querySelector('.go').classList.remove('on'); bar.querySelector('.go').textContent = 'Conheça os atalhos'; }
bar.querySelector('.go').onclick = () => on ? close() : open();
bar.querySelectorAll('.arr').forEach(b => b.onclick = () => { g = (g + Number(b.dataset.d) + G.length) % G.length; build(); });
})();
