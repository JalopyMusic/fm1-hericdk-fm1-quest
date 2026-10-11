// FM1 Quest — screen lab. One shared engine state + clock; every tile renders one Quest screen from it.
(function (G) {
'use strict';
const E = G.Engine, S = E.S, Sc = G.Scene, Scr = G.Screens;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
E.setSound(false); S.combo = 0; S.menu.cur = 6; S.rec.hp = 1; S.rec.bar = 0; S.rec.target = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let rev = 0; const touch = () => { rev++; };
const pref = { get(k, d) { try { const v = localStorage.getItem('fm1lab.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('fm1lab.' + k, JSON.stringify(v)); } catch (e) {} } };

// ---------------------------------------------------------------- tile catalogue (the 15 Quest screens)
const TILES = [
  { scr: 'title', name: 'Title', fw: 'splash.c', note: 'Tela ao ligar. Arte 120×120 em 4 bpp dobrada + logo 1-bit. Qualquer toque entra na Party.', mini: t => [stepper('brilho do LCD', () => ['baixo', 'médio', 'alto'][S.menu.vals.LIGHTS], d => { S.menu.vals.LIGHTS = clamp(S.menu.vals.LIGHTS + d, 0, 2); t.lcd.style.filter = `brightness(${[.6, .8, 1][S.menu.vals.LIGHTS]})`; }), button('piscar', () => t.lcd.classList.toggle('blink'))] },
  { scr: 'party', name: 'Party', fw: 'q_party_screen', note: 'Home. 4 faixas = 4 heróis; pips = steps; HP = level. Clique numa linha para selecionar a faixa, nos 16 passos para editar.', mini: t => [stepper('faixa', () => S.sel + 1, d => { S.sel = (S.sel + d + 4) % 4; touch(); }), stepper('página', () => S.page + 1, d => { S.page = (S.page + d + 4) % 4 % Math.max(1, Math.ceil(S.tracks[S.sel].steps / 16)); touch(); })] },
  { scr: 'equip', name: 'Equip', fw: 'EDIT · q_equip', note: 'Escolha de preset/kit da faixa selecionada. Clique num slot.', mini: t => [stepper('faixa', () => S.sel + 1, d => { S.sel = (S.sel + d + 4) % 4; touch(); }), stepper('preset', () => (S.sel === 3 ? S.kitSel : S.tracks[S.sel].preset) + 1, d => press('equip', ((S.sel === 3 ? S.kitSel : S.tracks[S.sel].preset) + d + (S.sel === 3 ? 12 : E.PRESETS.length)) % (S.sel === 3 ? 12 : E.PRESETS.length)))] },
  { scr: 'boss', name: 'Boss', fw: 'q_boss_screen', note: 'Gravando loop = luta contra o King Slime. HP cai conforme a posição no loop. Barra de cima: "loop boss" faz o HP drenar sozinho.', mini: t => [stepper('alvo', () => S.rec.target + 1, d => { S.rec.target = (S.rec.target + d + 4) % 4; touch(); })] },
  { scr: 'duel', name: 'Duel', fw: 'q_duel_screen', note: 'Solo de uma faixa. Combo conta as notas que acertam o padrão enquanto toca.', mini: t => [stepper('solo', () => S.solo < 0 ? '–' : S.solo + 1, d => { S.solo = clamp((S.solo < 0 ? (d > 0 ? -1 : 4) : S.solo) + d, -1, 3); S.combo = 0; touch(); })] },
  { scr: 'recready', name: 'Rec ready', fw: 'REC armado', note: '"A wild LOOP appears!" — espera a primeira nota. Lista as faixas e onde já há notas.', mini: () => [stepper('alvo', () => S.rec.target + 1, d => { S.rec.target = (S.rec.target + d + 4) % 4; touch(); })] },
  { scr: 'count', name: 'Count-in', fw: 'contagem', note: '4 cliques antes do loop. Aqui o número cicla sozinho a cada batida.', mini: () => [stepper('compassos', () => S.rec.bars, d => { S.rec.bars = [1, 2, 4][clamp([1, 2, 4].indexOf(S.rec.bars) + d, 0, 2)]; touch(); })] },
  { scr: 'steps', name: 'Dungeon', fw: 'STEP grid de bateria', note: '8 linhas de som × 16 steps. Clique num quadrado para ligar/desligar o hit.', mini: () => [stepper('som', () => E.KIT[S.drumSel], d => { S.drumSel = (S.drumSel + d + 16) % 16; touch(); }), stepper('página', () => S.page + 1, d => { S.page = (S.page + d + 2) % 2; touch(); })] },
  { scr: 'kit', name: 'Kit', fw: 'pads de bateria', note: '16 pads de som. Clique para ouvir/selecionar.', mini: () => [stepper('kit', () => E.KITS[S.kitSel], d => { S.kitSel = (S.kitSel + d + 12) % 12; touch(); })] },
  { scr: 'punch', name: 'Spells', fw: 'PUNCH FX', note: '16 pads de efeitos performáticos (loop, stutter, filtros…). Segure o clique = feitiço ativo.', mini: () => [stepper('feitiço', () => E.PUNCH[Math.max(0, S.punch)], d => E.setPunch((Math.max(0, S.punch) + d + 16) % 16)), button('soltar', () => E.setPunch(-1))] },
  { scr: 'key', name: 'Biome', fw: 'KEY / escala', note: 'Raiz e escala; a escala escolhe o bioma da cena (maj floresta, min caverna, dor costa, phr ruínas).', mini: () => [stepper('escala', () => E.SCALE_NAMES[S.scale], d => { S.scale = (S.scale + d + 4) % 4; $('#c-scale').value = S.scale; touch(); }), stepper('raiz', () => E.NOTE_NAMES[S.keyRoot], d => { S.keyRoot = (S.keyRoot + d + 12) % 12; $('#c-root').value = S.keyRoot; touch(); })] },
  { scr: 'mix', name: 'Camp', fw: 'MIX', note: 'Pads: rest 1–4 (mute), duel 1–4 (solo), tap tempo, bpm.', mini: () => [0, 1, 2, 3].map(i => button('rest ' + (i + 1), () => E.toggleMute(i))).concat([stepper('solo', () => S.solo < 0 ? '–' : S.solo + 1, d => { S.solo = clamp((S.solo < 0 ? (d > 0 ? -1 : 4) : S.solo) + d, -1, 3); }), button('tap tempo', () => { E.tapTempo(); $('#c-bpm').value = S.bpm; $('#o-bpm').textContent = S.bpm; })]) },
  { scr: 'erase', name: 'Banish', fw: 'ERASE', note: 'Pads de som; os que têm notas ficam marcados. Clique apaga o som.', mini: () => [button('reset demo', () => { E.mkTracks(); touch(); })] },
  { scr: 'fx', name: 'FX', fw: 'FX sends', note: 'Dst = drive, cho = chorus, dly = delay, rev = reverb. Sliders na barra de cima ou role sobre os knobs.', mini: () => ['dst', 'cho', 'dly', 'rev'].map(n => stepper(n, () => Math.round(S.fx[n] * 100), d => { S.fx[n] = clamp(Math.round((S.fx[n] + d * .1) * 10) / 10, 0, 1); E.applyFx(); $$('.fx').forEach(r => { r.value = S.fx[r.dataset.fx]; }); })) },
];



// ---------------------------------------------------------------- how to reach each screen (SLOOP.md, "The panel: tap, hold, layers")
const HOWQ = {
  title: ['auto:POWER = aparece ao ligar o FM-1'],
  party: ['tap:HOME = volta para a Party', 'turn:ALGORITHM = troca o herói (faixa 1–4)'],
  equip: ['tap:EDIT = páginas EDIT 1/2 (Equip)', 'turn:PRESETS = troca o som da faixa'],
  boss: ['tap:REC = (tocando) começa a gravar sobre o loop → Boss', 'tap:REC = de novo, fecha a gravação'],
  duel: ['hold:GLO + key:5–8 = solo na faixa 1–4 → Duel', 'hold:GLO + key:5–8 = de novo, sai do solo'],
  recready: ['tap:REC = (parado) arma a gravação → Rec ready'],
  count: ['tap:REC + turn:KNOB 3 = start: "count"', 'tap:PLAY = 1 compasso de cliques 4-3-2-1'],
  steps: ['turn:ALGORITHM = faixa 4 (bateria) + tap:SEQ = grid', 'turn:KNOB 1 = escolhe o som da linha'],
  kit: ['turn:ALGORITHM = faixa 4 + tap:EDIT = grid / kit', 'turn:PRESETS = troca o kit'],
  punch: ['hold:FX + key:1–16 = feitiço enquanto segura', 'hold:FX + turn:KNOB 1 = FILTER'],
  key: ['hold:SCL + key:1–16 = tonalidade da song', 'hold:SCL + turn:KNOB 2 = escala'],
  mix: ['hold:GLO + key:1–4 = mute · key 5–8 = solo', 'hold:GLO + key:16 = tap tempo'],
  erase: ['hold:EDIT + key:1–16 = apaga aquele som/nota', 'hold:EDIT + press:OCT− = desfazer'],
  fx: ['tap:FX = páginas FX', 'turn:KNOB 1–4 = DST · CHO · DLY · REV'],
  menu: ['hold:HOME = menu (0,7 s)', 'hold:HOME = de novo, sai do menu'],
  armory: ['hold:EDIT + press:PRESETS = (proposta) abre o banco de sons', 'tap:SAVE = Samples → Armory entra como página extra'],
  fit: ['tap:OCT+ = (proposta) dentro do Armory, ajusta o sample', 'turn:KNOB 1 = taxa'],
};

// ---------------------------------------------------------------- what each control under a tile does
const HELP = {
  title: '<b>brilho do LCD</b> muda o brilho (LIGHTS do menu). <b>piscar</b> liga/desliga o "press play". Na tela real, qualquer botão entra na Party.',
  party: '<b>faixa ◂▸</b> escolhe qual herói (1–4) fica selecionado. <b>página ◂▸</b> troca os 16 passos mostrados (faixas com 32/64 steps). Na tela: clique numa linha = selecionar; clique num quadradinho de passo = liga/desliga a nota.',
  equip: '<b>faixa ◂▸</b> muda o herói que está sendo equipado. <b>preset ◂▸</b> troca o som (preset do synth, ou kit se for a faixa 4). Na tela: clique num slot para equipar.',
  boss: '<b>alvo ◂▸</b> escolhe qual herói é o alvo destacado na lista. O HP do boss vem da barra de cima (slider “boss hp” ou “loop boss”).',
  duel: '<b>solo ◂▸</b> escolhe qual faixa duela (– = nenhuma, usa a selecionada). Zera o combo. Na tela: clique nos quadrados para editar os 16 passos.',
  recready: '<b>alvo ◂▸</b> escolhe em qual faixa o loop vai ser gravado (linha com borda vermelha).',
  count: '<b>compassos ◂▸</b> define o tamanho do loop (1, 2 ou 4 compassos). O número 4-3-2-1 gira sozinho no ritmo do bpm.',
  steps: '<b>som ◂▸</b> escolhe qual som da bateria está em edição (linha com marca vermelha). <b>página ◂▸</b> alterna steps 1–16 e 17–32. Na tela: clique num quadrado = liga/desliga o hit.',
  kit: '<b>kit ◂▸</b> troca o kit de bateria (808, 909, lofi…). Na tela: clique num pad para ouvir e selecionar o som.',
  punch: '<b>feitiço ◂▸</b> escolhe e ativa um dos 16 efeitos; <b>soltar</b> desliga. Na tela: <b>segure o clique</b> num pad para ativar e solte para desligar.',
  key: '<b>escala ◂▸</b> troca maj/min/dor/phr — a cena de cima muda de bioma junto. Na tela: clique numa nota para definir a raiz.',
  mix: '<b>rest 1–4</b> silencia cada faixa. <b>solo ◂▸</b> escolhe a faixa em duelo. <b>tap tempo</b> marca o ritmo e muda o bpm. Na tela: clique nos pads rest / duel / tap.',
  erase: '<b>reset demo</b> recarrega as faixas de exemplo. Na tela: clicar num pad <b>apaga todas as notas daquele som</b>.',
  fx: '<b>dst · cho · dly · rev ◂▸</b> mudam cada send em passos de 10%. Também dá para rolar o mouse sobre as colunas.',
  menu: '<b>cursor ◂▸</b> move a linha selecionada. <b>valor ◂▸</b> muda a opção da linha (ex.: COLOR mono/tavern). Na tela: clique numa linha para selecionar.',
  armory: '<b>instrumento ◂▸</b> percorre a lista do banco. <b>slot ◂▸</b> escolhe USR1, USR2 ou USR3 como destino. <b>carregar</b> grava o instrumento no slot (só simulado: atualiza as barras de uso e mostra se coube).',
  fit: '<b>taxa ◂▸</b> muda a taxa de amostragem (11–44 kHz). <b>duração ◂▸</b> muda o comprimento do som. <b>carregar no slot</b> grava o trecho no slot escolhido no Armory (atualiza as barras de uso lá). Na tela: <b>role o mouse sobre os 4 knobs</b> para mexer start / end / loop in / loop out e clique numa zona para definir a raiz.',
};
const SB = [  // [name, family, seconds, rate, looped]  — demo bank, sizes are computed (IMA ADPCM = 4 bit/sample)
  ['Harp', 'strings', 1.8, 22050, 1], ['Slap bass', 'bass', 0.9, 22050, 1], ['Chime', 'mallet', 2.2, 16000, 0], ['Choir ah', 'voice', 3.0, 11025, 1],
  ['Brass hit', 'brass', 0.6, 22050, 0], ['Flute', 'wind', 1.5, 22050, 1], ['Timpani', 'perc', 1.2, 16000, 0], ['Crystal', 'synth', 2.6, 32000, 1],
];
const SLOT = 81920, usr = [0, 0, 0]; let sbSel = 0, sbSlot = 0, fitRate = 22050, fitSec = 1.8;
const bytesOf = (sec, rate) => Math.round(sec * rate / 2);
const kb = b => (b / 1024).toFixed(1) + ' KB';
Scr.SC.armory = () => {
  const rows = SB.map((b, i) => `<div class="mrow" style="grid-template-columns:7px 70px 52px 1fr;height:12px;${i === sbSel ? 'background:#3a2620' : ''}"><i class="tri sm" style="border-left-color:${i === sbSel ? '#f2e2c4' : 'transparent'}"></i><span>${b[0]}</span><span style="color:#a89080">${b[1]}</span><span style="color:#c8b090">${kb(bytesOf(b[2], b[3]))}</span></div>`).join('');
  const sel = SB[sbSel], need = bytesOf(sel[2], sel[3]), fits = need <= SLOT;
  const meters = usr.map((u, i) => `<div style="display:grid;grid-template-columns:30px 1fr 40px;gap:4px;align-items:center;height:10px"><span style="color:${i === sbSlot ? '#f0c860' : '#a89080'}">USR${i + 1}</span><div style="height:5px;background:#2e2226"><div style="width:${Math.min(100, u / SLOT * 100)}%;height:5px;background:${['#5a8ad0', '#7ab04e', '#e08a3a'][i]}"></div></div><span>${Math.round(u / SLOT * 100)}%</span></div>`).join('');
  return { bar: `<span class="ttl">Armory</span><span style="color:#a89080">sound bank</span><div class="fl"></div><span style="color:#a89080">${sbSel + 1}/${SB.length}</span>`, scene: null,
    hud: `<div class="hh"><div class="panel" style="padding:3px 4px;display:flex;flex-direction:column;gap:0">${rows}</div>
      <div class="panel" style="padding:4px 5px;display:flex;flex-direction:column;gap:2px"><span class="ttl">${sel[0]}</span><span style="color:#c8b090">${sel[3] / 1000} kHz · ${(sel[2]).toFixed(1)} s · ${sel[4] ? 'loop' : 'one-shot'} · ${kb(need)}</span><span style="color:${fits ? '#7ab04e' : '#e0503c'}">${fits ? 'fits in a slot' : 'too big — lower the rate'}</span><span style="color:#a89080">limit 80 KB / slot · 16 zones</span></div>
      <div style="display:flex;flex-direction:column;gap:1px;margin-top:2px">${meters}</div>
      <div class="knobs" style="grid-template-columns:repeat(4,1fr)">${['bank', 'program', 'root', 'fine'].map((l, i) => `<div class="kn"><canvas data-knob="${[.2, sbSel / 7, .5, .5][i]}" data-col="${['#5a8ad0', '#7ab04e', '#f0c860', '#e08a3a'][i]}" data-dir="1c" width="20" height="20"></canvas><span style="color:#a89080">${l}</span><span>${['GM', sbSel + 1, 'C3', '0'][i]}</span></div>`).join('')}</div></div>` };
};
const fitK = [0, 1, .3, .8]; let fitRoot = 2;
const fitNeed = () => Math.round(Math.max(.05, fitK[1] - fitK[0]) * fitSec * fitRate / 2);
Scr.SC.fit = () => {
  const need = fitNeed(), pct = need / SLOT, fits = pct <= 1, st = (fitRate >= 32000 ? 'hi' : fitRate >= 22050 ? 'mid' : 'lo');
  const zones = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((n, i) => `<div class="pad" style="height:17px;background:${i === fitRoot ? '#f0c860' : '#24181c'};color:${i === fitRoot ? '#1e1418' : '#f2e2c4'};border-color:#3a4a78"><span>${n}</span></div>`).join('');
  const lab = ['start', 'end', 'loop in', 'loop out'];
  return { bar: `<span class="ttl">Chisel</span><span style="color:#a89080">fit a sample</span><div class="fl"></div><span style="color:#a89080">USR${sbSlot + 1}</span>`, scene: null,
    hud: `<div class="hh"><canvas data-wave="${fitSec}" data-k="${fitK.join(',')}" width="228" height="56" style="width:228px;height:56px;background:#24181c;border:1px solid #c8963c"></canvas>
      <div style="display:flex;gap:6px"><span>${fitRate / 1000} kHz</span><span>${((fitK[1] - fitK[0]) * fitSec).toFixed(1)} s</span><span style="color:#c8b090">quality ${st}</span><div class="fl"></div><span style="color:${fits ? '#7ab04e' : '#e0503c'}">${kb(need)} / 80 KB</span></div>
      <div style="height:7px;background:#2e2226;border:1px solid #5a3a28"><div style="width:${Math.min(100, pct * 100)}%;height:100%;background:${fits ? '#7ab04e' : '#e0503c'}"></div></div>
      <div style="color:#a89080">root zone (click) · zones across the keyboard</div><div class="pads" style="grid-template-columns:repeat(6,1fr)">${zones}</div>
      <div class="knobs" style="grid-template-columns:repeat(4,1fr)">${lab.map((l, i) => `<div class="kn"><canvas data-knob="${fitK[i]}" data-col="${['#5a8ad0', '#7ab04e', '#f0c860', '#e08a3a'][i]}" data-dir="1c" width="20" height="20"></canvas><span style="color:#a89080">${l}</span><span>${Math.round(fitK[i] * 100)}%</span></div>`).join('')}</div></div>` };
};
function drawWaves(root) { $$('canvas[data-wave]', root).forEach(c => { const x = c.getContext('2d'), sec = +c.dataset.wave, K = c.dataset.k.split(',').map(Number); x.fillStyle = '#24181c'; x.fillRect(0, 0, 228, 56); x.fillStyle = '#5a8ad0';
  for (let i = 0; i < 228; i++) { const t = i / 228, env = Math.exp(-t * 2.2 / Math.max(.6, sec / 2)), a = env * (Math.sin(t * sec * 40) * .6 + Math.sin(t * sec * 91) * .3) * 24, inside = t >= K[0] && t <= K[1]; x.fillStyle = inside ? '#5a8ad0' : '#3a3050'; x.fillRect(i, 28 - Math.abs(a), 1, Math.max(1, Math.abs(a) * 2)); }
  x.fillStyle = '#7ab04e'; x.fillRect(Math.round(228 * K[0]), 0, 2, 56); x.fillRect(Math.round(228 * K[1]) - 1, 0, 2, 56);
  x.fillStyle = '#f0c860'; x.fillRect(Math.round(228 * lerpK(K)[0]), 0, 1, 56); x.fillStyle = '#e08a3a'; x.fillRect(Math.round(228 * lerpK(K)[1]), 0, 1, 56); }); }
function lerpK(K) { const a = K[0], b = K[1]; return [a + (b - a) * K[2], a + (b - a) * K[3]]; }
const NEWT = [
  { scr: 'armory', name: 'Armory', fw: 'novo · banco de sons', note: 'Lista de instrumentos de um banco (estilo SoundFont/SNES), com tamanho calculado e uso dos 3 slots USR de 80 KiB.', mini: () => [
      stepper('instrumento', () => sbSel + 1, d => { sbSel = (sbSel + d + SB.length) % SB.length; fitSec = SB[sbSel][2]; fitRate = SB[sbSel][3]; }),
      stepper('slot', () => 'USR' + (sbSlot + 1), d => { sbSlot = (sbSlot + d + 3) % 3; }),
      button('carregar', () => { const n = bytesOf(SB[sbSel][2], SB[sbSel][3]); if (n <= SLOT) usr[sbSlot] = n; })] },
  { scr: 'fit', name: 'Chisel', fw: 'novo · ajuste de sample', note: 'Mostra se um som cabe num slot, em qual taxa, com marcadores de loop e o mapa de zonas pelo teclado.', mini: () => [
      stepper('taxa', () => fitRate / 1000 + 'k', d => { const r = [11025, 16000, 22050, 32000, 44100]; fitRate = r[clamp(r.indexOf(fitRate) + d, 0, 4)]; }),
      stepper('duração', () => fitSec.toFixed(1) + 's', d => { fitSec = clamp(Math.round((fitSec + d * .3) * 10) / 10, .3, 8); }), button('carregar no slot', () => { const n = fitNeed(); if (n <= SLOT) usr[sbSlot] = n; })] },
];

// ---------------------------------------------------------------- widgets
function button(label, fn, cls) { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = () => { fn(); touch(); }; return b; }
function stepper(label, get, fn) {
  const w = document.createElement('span'), v = document.createElement('b'); v.style.cssText = 'color:var(--txt);min-width:34px;display:inline-block;text-align:center';
  w.append(label + ' ', button('◂', () => fn(-1)), v, button('▸', () => fn(1))); w._upd = () => { v.textContent = get(); }; return w;
}

// ---------------------------------------------------------------- title art (same 16-colour quantisation the firmware uses)
let titleURL = '';
(function () {
  const img = new Image(); img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 240, 240);
    const d = x.getImageData(0, 0, 240, 240), pal = Sc.PALS['1c'].map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < 240; y++) for (let xx = 0; xx < 240; xx++) {
      const i = (y * 240 + xx) * 4, th = (B[(y % 4) * 4 + (xx % 4)] / 16 - .5) * 28; let best = 0, bd = 1e9;
      const r = d.data[i] + th, g = d.data[i + 1] + th, b = d.data[i + 2] + th;
      for (let k = 0; k < 16; k++) { const dr = r - pal[k][0], dg = g - pal[k][1], db = b - pal[k][2], dd = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (dd < bd) { bd = dd; best = k; } }
      d.data[i] = pal[best][0]; d.data[i + 1] = pal[best][1]; d.data[i + 2] = pal[best][2];
    }
    x.putImageData(d, 0, 0); titleURL = c.toDataURL(); touch();
  }; img.src = 'assets/title-bg-240.png';
})();

// ---------------------------------------------------------------- build the Quest tiles
const gq = $('#g-quest');
function mkTile(t, host) {
  const el = document.createElement('div'); el.className = 'tile';
  el.innerHTML = `<div class="lcdbox"><div class="lcd"><div class="bar"></div><div class="scenew"><canvas class="sc" width="240" height="84"></canvas><div class="ov"></div></div><div class="hud"></div></div></div>
    <div class="cap"><b>${t.name}</b><span>${t.fw}</span></div>${HOWQ[t.scr] ? G.GFX.how(HOWQ[t.scr], t.scr === 'armory' || t.scr === 'fit') : ''}<div class="mini"></div><div class="help">${HELP[t.scr] || ''}</div><div class="note">${t.note}</div>`;
  t.el = el; t.lcd = $('.lcd', el); t.bar = $('.bar', el); t.sw = $('.scenew', el); t.sc = $('.sc', el); t.ov = $('.ov', el); t.hud = $('.hud', el);
  t.eqc = document.createElement('canvas'); t.eqc.className = 'eqc'; t.eqc.width = 72; t.eqc.height = 96; t.sig = '';
  t.minis = t.mini ? t.mini(t) : []; const mn = $('.mini', el); t.minis.forEach(m => mn.append(m)); if (!t.minis.length) mn.remove();
  host.append(el);
  t.hud.addEventListener('pointerdown', e => hudClick(t, e));
  t.hud.addEventListener('pointerup', () => { if (t.scr === 'punch') { E.setPunch(-1); touch(); } });
  t.hud.addEventListener('wheel', e => { const k = e.target.closest('.kn,.fxc'); if (!k) return; e.preventDefault(); const i = [...k.parentNode.children].indexOf(k), dir = e.deltaY < 0 ? 1 : -1;
    if (t.scr === 'fit') { fitK[i] = clamp(Math.round((fitK[i] + dir * .03) * 100) / 100, 0, 1); if (fitK[0] > fitK[1] - .05) { if (i === 0) fitK[0] = fitK[1] - .05; else fitK[1] = fitK[0] + .05; } fitK[0] = clamp(fitK[0], 0, .95); fitK[1] = clamp(fitK[1], .05, 1); } else if (t.scr === 'armory') { if (i === 1) { sbSel = (sbSel + (dir > 0 ? 1 : -1) + SB.length) % SB.length; fitSec = SB[sbSel][2]; fitRate = SB[sbSel][3]; } } else if (t.scr === 'menu' || t.scr === 'erase') Scr.knobTurn(t.scr, i, dir); else Scr.knobTurnStep(t.scr, i, dir); touch(); }, { passive: false });
}
TILES.forEach(t => mkTile(t, gq));
NEWT.forEach(t => mkTile(t, $('#g-new')));
TILES.push(...NEWT);

function hydrate(root) { $$('canvas[data-knob]', root).forEach(Sc.drawKnob); $$('canvas[data-portrait]', root).forEach(Sc.drawPortrait); $$('canvas[data-icon]', root).forEach(Sc.drawIcon); }
function viewFor(t, v) {
  if (t.scr === 'count') { const b = ((v.beat % 4) + 4) % 4; return { beat: -(4 - Math.floor(b)) + 0.01, step: v.step, playing: false }; }
  if (t.scr === 'boss' || t.scr === 'recready') return v;
  return v;
}
function rebuild(t, v) {
  const def = Scr.SC[t.scr](viewFor(t, v));
  t.def = def;
  t.bar.innerHTML = def.bar || ''; t.bar.style.display = def.full ? 'none' : '';
  if (def.scene) { t.sw.style.display = ''; t.sc.width = 240; t.sc.height = def.scene.h; t.sw.style.height = def.scene.h + 1 + 'px'; } else t.sw.style.display = 'none';
  t.ov.innerHTML = def.ov || '';
  t.hud.innerHTML = def.hud;
  if (def.full && titleURL) { const b = $('.tbg', t.hud); if (b) b.style.backgroundImage = `url(${titleURL})`; }
  const slot = $('.eqslot', t.hud); if (slot) slot.appendChild(t.eqc);
  hydrate(t.hud); drawWaves(t.hud);
  t.lcd.classList.toggle('blink', t.scr === 'title');
}

// click → same intent as the hardware pad handling in the prototype
function hudClick(t, e) {
  E.ensureAudio();
  const scr = t.scr, tr = S.sel;
  const row = e.target.closest('.trow'); if (row && scr === 'party') { S.sel = [...row.parentNode.children].indexOf(row); touch(); return; }
  const m = e.target.closest('[data-menu]'); if (m) { S.menu.cur = +m.dataset.menu; touch(); return; }
  const idxIn = sel => { const x = e.target.closest(sel); return x ? [...x.parentNode.children].indexOf(x) : -1; };
  if (scr === 'title') return;
  if (scr === 'armory') { const r = idxIn('.mrow'); if (r >= 0) { sbSel = r; fitSec = SB[r][2]; fitRate = SB[r][3]; touch(); } return; }
  if (scr === 'fit') { const r = idxIn('.pad'); if (r >= 0) { fitRoot = r; touch(); } return; }
  if (scr === 'party') { const p = idxIn('.pip'); if (p >= 0) { E.toggleStep(S.sel, p + S.page * 16); touch(); } return; }
  if (scr === 'duel') { const p = idxIn('.dcell'); if (p >= 0) { E.toggleStep(S.solo >= 0 ? S.solo : S.sel, p + S.page * 16); touch(); } return; }
  if (scr === 'steps') { const c = e.target.closest('.gc'); if (c) { const r = [...c.parentNode.parentNode.children].indexOf(c.parentNode), cc = [...c.parentNode.children].indexOf(c); const base = S.drumSel >= 8 ? 8 : 0; S.drumSel = base + r; S.drumCur = cc + S.page * 16; E.toggleStep(3, cc + S.page * 16); touch(); } return; }
  const i = scr === 'equip' ? idxIn('.slot') : idxIn('.pad'); if (i >= 0) { press(scr, i); touch(); }
}
function press(scr, i) {
  const tr = S.sel;
  switch (scr) {
    case 'equip': { const n = tr === 3 ? 12 : E.PRESETS.length; if (i < n) { if (tr === 3) { S.kitSel = i; E.previewDrum(0); } else { S.tracks[tr].preset = i; E.previewDeg(tr, 0); } } break; }
    case 'kit': S.drumSel = i; E.previewDrum(i); break;
    case 'punch': E.setPunch(i); break;
    case 'key': S.keyRoot = Scr.KEYPCS[i]; $('#c-root').value = S.keyRoot; E.previewDeg(tr === 3 ? 0 : tr, 0); break;
    case 'mix': if (i < 4) E.toggleMute(i); else if (i < 8) { E.setSolo(i - 4); } else if (i >= 10) E.tapTempo(); $('#c-bpm').value = S.bpm; $('#o-bpm').textContent = S.bpm; break;
    case 'erase': S.drumSel = i; E.eraseSound(i); E.previewDrum(i); break;
  }
}

// ---------------------------------------------------------------- scene state (same mapping as the prototype)
function bgBiome() { if ($('#c-bg').value !== 'cycle') return E.BIOMES[S.scale]; const d = +$('#c-day').value; return d < .2 ? 'coast' : d < .45 ? 'forest' : d < .6 ? 'ruins' : d < .9 ? 'night' : 'coast'; }
let sp = 0;
function sceneState(t, v, dt) {
  if (v.playing) sp += dt * S.bpm * 0.22;
  const pats = {}, mute = {}, hp = {};
  E.TRK.forEach((tr, i) => { pats[tr.cls] = E.patString(i); mute[tr.cls] = S.tracks[i].mute || (S.solo >= 0 && S.solo !== i); hp[tr.cls] = S.tracks[i].level; });
  const solo = S.solo >= 0 ? S.solo : S.sel, L = S.tracks[solo].steps;
  let duelR = ''; for (let i = 0; i < L; i++) duelR += (i % 16 === 12) ? '1' : '0';
  return { t, beat: v.beat, bpm: S.bpm, sp, playing: v.playing, pats, mute, hp, fx: S.fx, biome: bgBiome(), eqCls: S.tracks[S.sel].cls, duelH: E.patString(solo), duelR, loopOn: S.punch >= 0 && S.punch <= 3 };
}


// knobs of the Armory and the Chisel (used by the tiles' wheel handler and by the Simulador's faceplate)
const KCOLS = ['#5a8ad0', '#7ab04e', '#f0c860', '#e08a3a'];
function extraParams(scr) {
  if (scr === 'fit') return ['start', 'end', 'loop in', 'loop out'].map((l, i) => ({ l, color: KCOLS[i], get: () => ({ v: fitK[i], t: Math.round(fitK[i] * 100) + '%' }), turn: dir => { fitK[i] = clamp(Math.round((fitK[i] + dir * .03) * 100) / 100, 0, 1); if (fitK[0] > fitK[1] - .05) { if (i === 0) fitK[0] = fitK[1] - .05; else fitK[1] = fitK[0] + .05; } fitK[0] = clamp(fitK[0], 0, .95); fitK[1] = clamp(fitK[1], .05, 1); touch(); } }));
  if (scr === 'armory') return ['bank', 'program', 'root', 'fine'].map((l, i) => ({ l, color: KCOLS[i], get: () => ({ v: i === 1 ? sbSel / 7 : .5, t: i === 1 ? String(sbSel + 1) : i === 0 ? 'GM' : i === 2 ? 'C3' : '0' }), turn: dir => { if (i === 1) { sbSel = (sbSel + (dir > 0 ? 1 : -1) + SB.length) % SB.length; fitSec = SB[sbSel][2]; fitRate = SB[sbSel][3]; touch(); } } }));
  return null;
}

// ---------------------------------------------------------------- loop
const ctl = { freeze: false }; const LABX = { fps: 16, ctl, lang: 'EN' }; let last = performance.now(), lastFrame = 0, t0 = performance.now(), lastStep = -9;
function frame(now) {
  requestAnimationFrame(frame);
  if (now - lastFrame < 1000 / LABX.fps - 4) return; const dt = Math.min(.2, (now - last) / 1000); last = now; lastFrame = now;
  const v = E.visual(), t = (now - t0) / 1000;
  // boss hp follows the loop position
  if (v.playing && $('#c-loop').classList.contains('on')) { const L = S.rec.bars * 16, p = ((v.step % L) + L) % L; S.rec.hp = 1 - p / L; S.rec.bar = Math.floor(p / 16); $('#c-hp').value = S.rec.hp; $('#o-hp').textContent = Math.round(S.rec.hp * 100); }
  // duel combo
  if (v.playing) { const n = Math.floor(v.step); if (n !== lastStep) { lastStep = n; const ps = E.patString(S.solo >= 0 ? S.solo : S.sel), L = ps.length; if (ps[((n % L) + L) % L] === '1') S.combo = Math.min(99, (S.combo | 0) + 1); } }
  const ST = sceneState(t, v, dt);
  TILES.forEach(tl => {
    if (!tl.el.offsetParent) return;
    const cb = tl.scr === 'count' ? Math.floor(((v.beat % 4) + 4) % 4) : 0;
    const sig = [rev, v.playing ? Math.floor(v.step) : -1, cb, Math.round(S.rec.hp * 50), titleURL ? 1 : 0, tl.scr === 'party' || tl.scr === 'duel' || tl.scr === 'recready' || tl.scr === 'steps' ? 0 : ''].join('|');
    if (sig !== tl.sig) { tl.sig = sig; rebuild(tl, v); tl.minis.forEach(m => m._upd && m._upd()); }
    if (!ctl.freeze && tl.def && tl.def.scene) { Sc.drawScene(tl.sc, '1c', tl.def.scene.key, t, ST); if (G.STYLE && G.STYLE.on) G.STYLE.apply(tl.sc.getContext('2d'), 0, 0, tl.sc.width, tl.sc.height, G.STYLE.forBiome(tl.def.scene.key === 'boss' ? 'boss' : ST.biome)); }
    if (!ctl.freeze && tl.scr === 'equip') Sc.drawScene(tl.eqc, '1c', 'equip', t, ST);
  });
  $('#c-play').textContent = S.playing ? '❚❚ pause' : '▶ play'; $('#c-play').classList.toggle('on', S.playing);
  $$('#c-trk button').forEach((b, i) => b.classList.toggle('on', S.sel === i));
  $('#c-mute').classList.toggle('on', S.tracks[S.sel].mute); $('#c-solo').classList.toggle('on', S.solo === S.sel);
}

// ---------------------------------------------------------------- global controls
$('#c-play').onclick = () => { E.ensureAudio(); E.togglePlay(); touch(); };
$('#c-sound').onclick = e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); E.setSound(on); };
$('#c-loop').onclick = e => e.currentTarget.classList.toggle('on');
$('#c-bpm').oninput = e => { E.setBpm(+e.target.value); $('#o-bpm').textContent = S.bpm; touch(); };
$('#c-swing').oninput = e => { S.swing = +e.target.value; $('#o-swing').textContent = S.swing; touch(); };
$('#c-scale').onchange = e => { S.scale = +e.target.value; touch(); };
E.NOTE_NAMES.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; $('#c-root').append(o); }); $('#c-root').value = S.keyRoot;
$('#c-root').onchange = e => { S.keyRoot = +e.target.value; touch(); };
[0, 1, 2, 3].forEach(i => $('#c-trk').append(button(String(i + 1), () => { S.sel = i; })));
$('#c-mute').onclick = () => { E.toggleMute(S.sel); touch(); };
$('#c-solo').onclick = () => { E.setSolo(S.sel); S.combo = 0; touch(); };
$$('.fx').forEach(r => { r.value = S.fx[r.dataset.fx]; r.oninput = () => { S.fx[r.dataset.fx] = +r.value; E.applyFx(); touch(); }; });
$('#c-hp').oninput = e => { $('#c-loop').classList.remove('on'); S.rec.hp = +e.target.value; $('#o-hp').textContent = Math.round(S.rec.hp * 100); touch(); };
let zoom = innerWidth >= 1440 ? 1 : pref.get('zoom', 2);
function setZoom(z) { zoom = clamp(z, 1, 3); document.documentElement.style.setProperty('--z', zoom); $('#o-z').textContent = zoom + '×'; pref.set('zoom', zoom); }
document.getElementById('z-').onclick = () => setZoom(zoom - 1); document.getElementById('z+').onclick = () => setZoom(zoom + 1); setZoom(zoom);
$('#c-scan').onclick = e => { const on = e.currentTarget.classList.toggle('on'); TILES.forEach(t => t.lcd.classList.toggle('scan', on)); };
$('#c-mono').onclick = e => { const on = e.currentTarget.classList.toggle('on'); TILES.forEach(t => t.lcd.classList.toggle('mono', on)); };
$('#c-fps').oninput = e => { LABX.fps = +e.target.value; $('#o-fps').textContent = LABX.fps; G.GFX && G.GFX.TILES.forEach(t => t.setSpi(LABX.fps)); spiTop(); };
function spiTop() { const ms = 240 * 84 * 2 / 1500, sh = ms * LABX.fps / 10; $('#o-spi').textContent = 'cena 84px: ' + Math.round(sh) + '% do SPI'; $('#o-spi').style.color = sh > 55 ? '#e0503c' : ''; }
spiTop();
$('#c-lang').onchange = e => { LABX.lang = e.target.value; touch(); };
$('#c-usb').onclick = async () => { $('#o-usb').textContent = '…'; $('#o-usb').textContent = await G.GFX.INP.connect(); };
$('#c-bg').onchange = () => touch(); $('#c-day').oninput = () => touch();
$('#c-dbg').onclick = e => { const on = e.currentTarget.classList.toggle('on'); $('#dbg').hidden = !on; setTimeout(() => document.documentElement.style.setProperty('--barh', $('#bar-ctl').offsetHeight + 'px'), 30); };
$('#c-style').onchange = e => { G.STYLE.setOn(e.target.checked); }; $('#c-style').checked = G.STYLE ? G.STYLE.on : true;
$('#c-freeze').onclick = e => { ctl.freeze = e.currentTarget.classList.toggle('on'); };

// ---------------------------------------------------------------- section 2: real firmware captures
const SHOTS = [
  ['env1', 'ENV 1/2', 'Envelope de amplitude (curva ADSR desenhada) — voz da faixa'],
  ['env2', 'ENV 2/2', 'Destinos do envelope'],
  ['lfo1', 'LFO 1/2', 'Forma de onda, taxa, profundidade'],
  ['lfo2', 'LFO 2/2', 'Destinos do LFO'],
  ['edit3', 'EDIT · voz 3/4', 'Parâmetros de oscilador da voz'],
  ['edit4', 'EDIT · voz 4/4', 'Filtro / mod da voz'],
  ['fx2', 'FX · slicer', 'Fatiador rítmico (barras = padrão de gate)'],
  ['fx3', 'FX · delay', 'Tempo, feedback, mix'],
  ['fx4', 'FX · reverb / chorus', 'Tamanho, mix, profundidade'],
  ['scl1', 'SCL 1/2', 'Escala: parâmetros'],
  ['scl2', 'SCL 2/2', 'Escala: máscara de notas (teclado de graus)'],
  ['save1', 'SAVE · song', 'Lista de entradas da song, seções, compassos'],
  ['layer-roll', 'Layer · roll', 'Piano roll / grade de notas por faixa'],
  ['layer-steps', 'Layer · steps', 'Overlay de steps sobre a tela atual'],
  ['layer-song', 'Layer · song', 'Overlay de slots de song'],
  ['about', 'ABOUT', 'Créditos do aparelho (menu)'],
  ['hold-clear', 'Hold-clear', 'Overlay ao segurar para apagar'],
];
G.LAB_SHOTS = SHOTS;

if (G.GFX.render) G.GFX.render();
if (G.GFX.buildTabs) G.GFX.buildTabs();

// ---------------------------------------------------------------- section 4: data table
const DATA = [
  ['bpm', 'ok', 'Velocidade de rolagem da cena (0,22 px/s por bpm), ritmo de animação dos sprites', 'Boss mais rápido em andamentos altos; clima "frenético"'],
  ['Padrão de steps por faixa', 'ok', 'Quando cada herói ataca; pips da Party; densidade', 'Densidade → AGI; padrão → ordem de turnos'],
  ['Level / volume da faixa', 'ok', 'HP do herói', 'Level baixo = herói ferido; zerar = cair em combate'],
  ['Mute / solo', 'ok', 'Rest e Duel', 'Solo = duelo 1×1; mute = herói descansando'],
  ['Escala + raiz', 'ok', 'Bioma da cena (maj/min/dor/phr)', 'Raiz → hora do dia e cor do céu; modulação → viagem'],
  ['Sends de FX (dst/cho/dly/rev)', 'ok', 'Drive, chorus, delay e reverb (só som: não mexem mais nas cenas)', 'Cada send é independente'],
  ['Posição no loop (clk_pos)', 'ok', 'HP do boss', 'Rank final por precisão do loop'],
  ['Pan por faixa', 'firmware', '—', 'Formação do grupo no eixo X; stereo como "flanco"'],
  ['Preset / kit selecionado', 'firmware', 'Equip (ícones de onda)', 'Bestiário de timbres; classe do herói por família de som'],
  ['Cutoff / resonance / envelope', 'firmware', '—', 'Forja: calor do metal, brilho, golpe do martelo; névoa = filtro fechado'],
  ['LFO (forma, taxa, depth)', 'firmware', '—', 'Movimento de água/vento; poção na Alquimia'],
  ['Swing', 'firmware', 'Atraso do passo (knob da Party)', 'Andar "bêbado" dos sprites; sorte (SOR) no status'],
  ['Seções da song / compassos', 'firmware', '—', 'Mapa da dungeon e capítulos; ciclo dia-noite ao longo da song'],
  ['Notas tocadas ao vivo (pitch/vel)', 'firmware', 'Notas disparam hits de som', 'Dano flutuante (vel), altura do arco do ataque (pitch)'],
  ['Notas em acorde vs. única', 'firmware', '—', 'Acorde = ataque em área; nota única = golpe preciso'],
  ['Duração da nota segurada', 'hook', '—', 'Ataque carregado / "charge"; defesa enquanto segura'],
  ['Erro de tempo vs. grade', 'hook', '—', 'Precisão: crit/perfeito/falha, rank do boss'],
  ['Nível de áudio (pico/RMS)', 'hook', '—', 'Energia da cena: relâmpago, tremor de tela, brilho do boss'],
  ['Densidade / energia por compasso', 'hook', '—', 'Nuvens/estrelas, tamanho do inimigo, tensão da luta'],
  ['Pico de volume por faixa (VU)', 'hook', '—', 'Barra de “mana” de cada herói; golpes mais fortes quando a faixa estoura'],
  ['Tempo entre notas (groove)', 'hook', '—', 'Estilo de luta: preciso (grade) × solto (humanizado); afeta esquiva'],
  ['Intervalo tocado (2ª, 3ª, 5ª…)', 'hook', '—', 'Tipo de magia por intervalo; dissonância = dano de veneno'],
  ['Progressão de acordes (grau I–V–vi…)', 'hook', '—', 'Capítulos da música; resolver para a tônica = cura da party'],
  ['Notas “fora da escala”', 'hook', '—', 'Armadilhas/monstros raros; bônus se for intencional (cromatismo)'],
  ['Tecla segurada vs. solta (gate)', 'firmware', '—', 'Escudo enquanto segura; ataque ao soltar'],
  ['Slot de sample em uso (USR1–3)', 'firmware', '—', 'Inventário de bolsas; “peso” do inventário = % da flash'],
  ['MIDI recebido (canal/velocity)', 'firmware', '—', 'Convidados na party: cada canal MIDI externo vira um aliado'],
  ['Latência de pad (toque→som)', 'hook', '—', 'Calibração do Rhythm Hero (“offset” de acerto)'],
  ['Humanização (desvio do tempo por nota)', 'hook', '—', 'Criaturas “bêbadas” se solto, “marcham” se na grade; vira estilo de luta e o viés do histograma do FM Hero'],
  ['Silêncio e pausas (compassos vazios)', 'firmware', '—', 'Descanso na fogueira: pausa cura HP/mana; música sem respiro cansa o grupo'],
  ['Camadas ativas ao mesmo tempo', 'firmware', '—', 'Tamanho do grupo e do boss: 1 faixa = patrulha, 4 faixas = guerra; o boss invoca aliados'],
  ['Comprimentos diferentes por faixa (poliritmia)', 'firmware', '—', 'Orrery: planetas com períodos diferentes; alinhamento = downbeat geral'],
  ['Modo da escala (brilho lídio → lócrio)', 'firmware', 'maj/min/dor/phr = bioma', 'Humor do céu e da trilha: modos brilhantes = amanhecer, escuros = tempestade'],
  ['Maior salto melódico', 'hook', '—', 'Altura dos pulos dos heróis e das plataformas; saltos grandes = golpe aéreo'],
  ['Curva de dinâmica (crescendo / decrescendo)', 'hook', '—', 'Barra de fúria / overdrive; decrescendo = o boss recua'],
  ['Repetição do mesmo padrão há N compassos', 'firmware', '—', '“Grind”: o inimigo se adapta e fica mais forte até você variar; recompensa variar'],
  ['DUST (bits e taxa do master)', 'firmware', 'só o som', 'A tela vira 8-bit: dither e menos cores quanto mais lo-fi for o master'],
  ['Sidechain / DUCK', 'firmware', '—', 'O mundo “pulsa” no kick: tremor e zoom de 1–2 px a cada batida'],
  ['Troca de preset ao vivo', 'firmware', '—', 'Animação de troca de equipamento/classe com a transição do Class change'],
  ['Tempo de sessão (relógio)', 'firmware', '—', 'XP por tempo tocado; o Companion cresce; aviso de descanso depois de horas'],
  ['Clock MIDI externo / convidados MIDI', 'firmware', '—', 'Aliados externos (Jam Tavern); bandeira de “sincronizado” no mapa'],
  ['Teclas mais usadas (mapa de calor)', 'hook', '—', 'Trilha de pegadas no mapa e dicas do FM School (“você nunca usa a 5ª”)'],
  ['Contadores persistentes (flash)', 'hook', '—', 'Conquistas, bestiário, rank — progresso entre sessões'],
];
const lab = { ok: ['ok', 'já lido'], firmware: ['', 'firmware'], hook: ['hook', 'hook novo'] };
$('#tbl').innerHTML = '<tr><th>Dado</th><th>Estado</th><th>Uso hoje</th><th>Como usar no RPG</th></tr>' +
  DATA.map(d => `<tr><td>${d[0]}</td><td><span class="pill ${lab[d[1]][0]}">${lab[d[1]][1]}</span></td><td>${d[2]}</td><td>${d[3]}</td></tr>`).join('');

document.fonts && document.fonts.load("8px 'Pixelify Sans'").then(() => document.fonts.load("16px 'Jacquarda Bastarda 9'")).then(() => touch());
requestAnimationFrame(frame);
G.LAB = Object.assign(LABX, { E, S, touch, TILES, usr, SLOT, mkTile, HOWQ, fitK, extraParams, fitState: () => ({ root: fitRoot, rate: fitRate, sec: fitSec, sel: sbSel }) });
})(window);

(function () { const bar = document.getElementById('bar-ctl'), set = () => document.documentElement.style.setProperty('--barh', bar.offsetHeight + 'px'); set(); addEventListener('resize', set); setTimeout(set, 500); })();
