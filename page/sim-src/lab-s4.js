// FM1 Quest lab — roster (heroes and enemies with state buttons) + the campfire menu.
(function (G) {
'use strict';
const T = G.GFX, Sc = G.Scene, PAL = Sc.PALS['1c'], { add, UI, TAU, clamp, lerp, fr, ease, hs, shade } = T, fig = Sc.fig;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CLSD = { mage: ['Mage', 'ACID 303 · feitiços e baixos FM', 'faixa 1'], archer: ['Archer', 'DUB CHORD · flechas e acordes', 'faixa 2'], cleric: ['Cleric', 'ATMOS PAD · cura e pads', 'faixa 3'], warrior: ['Warrior', 'TECHNO · bateria e golpes', 'faixa 4'] };
const HST = [['parado', 'idle'], ['andando', 'walk'], ['atacando', 'attack'], ['descansando', 'sit'], ['dormindo', 'sleep'], ['ferido', 'hurt'], ['vitória', 'win']];
const EST = [['parado', 'idle'], ['atacando', 'attack'], ['ferido', 'hurt'], ['derrotado', 'dead']];
const scaled = (g, ox, oy, s) => (x, y, w, h, i) => g.R(ox + x * s, oy + y * s, w * s, h * s, i);

function stage(g, t, night, ground) {
  g.clear(0); g.sky(19, 120, night ? [0, 0, 1, 1, 2] : [1, 13, 2, 8, 9]);
  for (let i = 0; i < 24; i++) if (Math.sin(t * 2 + i * 3) > -.5) g.px(hs(i) * 240, 22 + hs(i + 5) * 70, i & 1 ? 7 : 10);
  for (let x = 0; x < 240; x += 2) { const h = 12 + Math.sin(x * .05) * 8 + hs(Math.floor(x / 9)) * 6; g.R(x, 120 - h, 2, h, 13); }
  g.R(0, 120, 240, 80, ground || 3); for (let y = 122; y < 197; y += 6) g.R(0, y, 240, 1, shade(PAL[ground || 3], .8));
  g.ell(120, 160, 70, 14, shade(PAL[ground || 3], .6));
}
function heroDef(cls) {
  const [nm, role, trk] = CLSD[cls];
  return {
    name: nm, tag: role, tier: 'hero', stateButtons: HST, an: null,
    fields: [{ l: 'zoom', d: 'tamanho do personagem na tela (2× a 4×); no aparelho o jogo usa 1× e 2×.', v: .66, fmt: v => (2 + Math.round(v * 2)) + '×' }],
    desc: 'O ' + nm.toLowerCase() + ' é o herói da ' + trk + '. Os botões acima mostram cada pose que ele faz no jogo: parado, andando, atacando e os estados extras de descanso, sono, dano e vitória.',
    bullets: ['Ataca quando o step da faixa dispara · anda no ritmo do bpm', 'Descansando = faixa em mute (fogueira) · dormindo = aparelho parado há um tempo', 'Ferido e vitória aparecem no Boss e no Rank', 'Cada pose é um sprite 4 bpp com máscara (já na flash, exceto as poses extras)'],
    extra(tile) {
      tile.st.state = 'idle'; const row = document.createElement('div'); row.className = 'ctl'; row.style.cssText = 'flex-direction:row;flex-wrap:wrap;gap:4px';
      HST.forEach(([lab, key]) => { const b = document.createElement('button'); b.textContent = lab; b.dataset.k = key; b.onclick = () => { tile.st.state = key; tile.st.t0 = G.GFX.nowT(); row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; if (key === 'idle') b.classList.add('on'); row.append(b); });
      tile.el.querySelector('.cap').after(row);
    },
    draw(g, t, k, st) {
      const s = 2 + Math.round(k[0] * 2), S = st.state || 'idle', u = t - (st.t0 || 0), night = S === 'sit' || S === 'sleep';
      stage(g, t, true, night ? 3 : 3);
      const gy = 156, bx = 120 - Math.round(8.5 * s); let oy = gy - 24 * s, ox = bx; const o = { s, t };
      let sc = 0; if (S === 'walk') { sc = t * 60; for (let i = 0; i < 12; i++) { const x = 240 - ((i * 37 + sc) % 280); g.R(x, 162 + (i % 3) * 8, 6, 1, 4); } o.f = Math.floor(t * 6) & 1; oy += o.f ? -1 : 0; }
      if (S === 'idle') oy += Math.round(Math.sin(t * 2.4) * 1);
      if (S === 'attack') { o.p = lerp(-.5, 1.1, fr(u / 1.3)); if (o.p > 0 && o.p < .3) { g.poly([[ox + 20 * s, oy + 4 * s], [ox + 28 * s, oy + 10 * s], [ox + 20 * s, oy + 16 * s]], 10); } }
      if (S === 'sit') { o.sit = true; g.disc(180, 156, 6, 0); const f = 3 + Math.round(Math.sin(t * 11) * 2); g.poly([[180, 148 - f], [175, 156], [185, 156]], 9); g.poly([[180, 152 - f / 2], [177, 156], [183, 156]], 10); for (let q = 0; q < 6; q++) { const a = fr(t * .5 + q / 6); g.px(180 + Math.sin(a * 7 + q) * 4, 146 - a * 40, a < .5 ? 6 : 5); } }
      if (S === 'sleep') { o.sit = true; o.cmap = Object.assign({}, G.Scene.CL ? G.Scene.CL[cls] : {}, { eye: 15 }); oy += Math.round(Math.sin(t * 1.6) * 1); for (let q = 0; q < 3; q++) { const a = fr(t * .4 + q / 3); g.txt('z', ox + 18 * s + a * 14, oy - a * 36, 7, { sz: 10 + q * 4 }); } }
      if (S === 'hurt') { ox += Math.round(Math.sin(u * 60) * 3 * Math.max(0, 1 - u / .8)); if (fr(u / .2) < .5 && u < .9) o.solid = 7; for (let q = 0; q < 4; q++) { const a = u * 7 + q * 1.6; g.R(ox + 8 * s + Math.cos(a) * 14 * s / 2, oy - 4 + Math.sin(a) * 4, 2, 2, 10); } if (fr(t / 2.2) > .85) o.solid = null; }
      if (S === 'win') { oy -= Math.round(Math.abs(Math.sin(t * 5)) * 10); for (let q = 0; q < 8; q++) { const a = q / 8 * TAU + t * 2; g.R(120 + Math.cos(a) * 46, 110 + Math.sin(a) * 30, 2, 2, [10, 7, 8][q % 3]); } g.txt('!', 120, oy - 12, 10, { al: 'c', f: 't', sz: 16, ol: 0 }); }
      g.ell(120, gy + 2, 14 * s / 2 + 6, 4, 0);
      fig(g.R, cls, ox, oy, o);
      g.bar(nm, 'hero · ' + trk, HST.find(x => x[1] === S)[0]);
      g.R(0, 197, 240, 43, UI.bg); g.R(0, 197, 240, 1, UI.ln);
      g.txt(HST.find(x => x[1] === S)[0], 120, 203, UI.hi, { al: 'c', sz: 16, sh: 0 }); g.txt(role, 120, 224, UI.dim, { al: 'c' });
    },
  };
}
['mage', 'archer', 'cleric', 'warrior'].forEach(c => { const d = heroDef(c); d.cls = c; G.GFX.add(d); });

// ---------------------------------------------------------------- enemies
const MON = Sc.MON['1c'];
function enemyDef(kind, nm, role, w, h) {
  return {
    name: nm, tag: role, tier: 'enemy', stateButtons: EST, an: null,
    fields: [{ l: 'zoom', d: 'tamanho do inimigo na tela.', v: .5, fmt: v => (2 + Math.round(v * 2)) + '×' }],
    desc: 'O ' + nm + ' aparece na Party e no Boss. Os botões mostram as poses: parado, atacando, ferido (pisca em branco) e derrotado.',
    bullets: kind === 'slime' ? ['Mesma animação da Party: pula no ritmo do bpm com amassa-e-estica', 'Ferido: pisca em branco e treme', 'Derrotado: dissolve em pixels (mesmo tracejado da Party)'] : kind === 'bat' ? ['Bate asa em 2 quadros, flutua com seno', 'Mergulha na direção da câmera quando ataca', 'Derrotado: dissolve em pixels'] : kind === 'king' ? ['Chefe do Boss: HP cai com a posição do loop', 'Coroa e olhos mudam de cor quando enfurece', 'Derrotado: afunda no chão'] : ['Rival do Duel: o "Shadow" do herói', 'Ataca em investida curta; escudo e espada', 'Derrotado: escurece e afunda'],
    extra(tile) {
      tile.st.state = 'idle'; const row = document.createElement('div'); row.className = 'ctl'; row.style.cssText = 'flex-direction:row;flex-wrap:wrap;gap:4px';
      EST.forEach(([lab, key]) => { const b = document.createElement('button'); b.textContent = lab; b.onclick = () => { tile.st.state = key; tile.st.t0 = G.GFX.nowT(); row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; if (key === 'idle') b.classList.add('on'); row.append(b); });
      tile.el.querySelector('.cap').after(row);
    },
    draw(g, t, k, st) {
      const z = (2 + Math.round(k[0] * 2)) / 2 * 1.5, S = st.state || 'idle', u = t - (st.t0 || 0), beat = t * 2.2, gy = 158, M = MON;
      stage(g, t, true, 3); let flash = false, sh = 0, dph = 0; const off = { x: 0, y: 0 };
      if (S === 'hurt') { sh = Math.round(Math.sin(u * 55) * 2 * Math.max(0, 1 - u / .8)); flash = fr(u / .2) < .5 && u < .9; }
      if (S === 'dead') { const c = fr(u / 2.6); dph = c < .15 ? 0 : Math.min(1.1, (c - .15) / .6); flash = c > .05 && c < .15; if (c > .95) dph = 0; }
      const sk = dph > 0 ? (x, y) => hs(x * 13 + y * 7 + 500) < dph : null, big = S === 'attack';
      g.ell(120, gy + 3, 30 * z / 2 + 6, 5, 0);
      if (kind === 'slime') { const hp = Sc.hop(beat, big ? 11 : 4), R = scaled(g, 120 - 40 * z + sh, gy - 40 * z, z); Sc.slimeD(R, 40, 40, 22, 16, M.slime, { lift: dph > 0 ? 0 : hp.lift, sq: dph > 0 ? 0 : hp.sq, flash, skip: sk, noShadow: dph > .4 }); }
      else if (kind === 'bat') { const R = scaled(g, 120 - 14 * z + sh, gy - 42 * z - 14 + Math.round(Math.sin(t * 5) * 2) - (big ? Math.sin(fr(u / 1.2) * Math.PI) * -18 : 0), z); Sc.spr(R, Math.floor(beat * 2) % 2 ? Sc.BATB : Sc.BATA, 0, 0, M.bat, { s: 2, solid: flash ? 7 : null, skip: sk }); }
      else if (kind === 'king') { const hp = Sc.hop(beat, big ? 7 : 3), R = scaled(g, 120 - 40 * z * .9 + sh, gy - 40 * z * .9, z * .9); Sc.slimeD(R, 40, 40, 44, 32, M.king, { crown: 1, lift: dph > 0 ? 0 : hp.lift, sq: dph > 0 ? 0 : hp.sq, flash, skip: sk, noShadow: dph > .4 }); }
      else { const sc = z * .55, step = big ? Math.round(Math.sin(clamp(fr(u / 1.2) * 1.4, 0, 1) * Math.PI) * 20) : 0, sink = dph * 50; g.c.save(); g.c.beginPath(); g.c.rect(0, 0, 240, gy + 2); g.c.clip(); const R = scaled(g, 120 - 22 * sc + sh + step, gy + sink, sc); Sc.knight(R, 0, 0, Math.round(Math.sin(t * 3)), beat, flash ? 7 : (dph > 0 ? 5 : null)); g.c.restore(); }
      if (S === 'hurt' && u < 1) for (let q = 0; q < 5; q++) { const a2 = u * 8 + q * 1.3; g.R(120 + Math.cos(a2) * 30, 110 + Math.sin(a2) * 14, 3, 3, [10, 7, 8][q % 3]); }
      g.bar(nm, role, EST.find(x => x[1] === S)[0]);
      g.R(0, 197, 240, 43, UI.bg); g.R(0, 197, 240, 1, UI.ln); g.txt(EST.find(x => x[1] === S)[0], 120, 203, UI.hi, { al: 'c', sz: 16, sh: 0 }); g.txt(role, 120, 224, UI.dim, { al: 'c' });
    },
  };
}
[['slime', 'Slime', 'inimigo comum · Party'], ['bat', 'Bat', 'inimigo voador · Party'], ['king', 'King Slime', 'chefe · Boss'], ['knight', 'Shadow', 'rival · Duel']].forEach(([k, n, r]) => { const d = enemyDef(k, n, r); d.cls = k; G.GFX.add(d); });

// ---------------------------------------------------------------- campfire menu (4 languages)

// front-facing seated chibis for the campfire (every hero looks at the screen)
function chibi(g, cls, x, y, sleep, t) {
  const b = Math.round(Math.sin(t * 1.6 + x) * 1), sk = 15, C = { mage: { rob: 12, trim: 9, hat: 12, hair: 9 }, archer: { rob: 11, trim: 4, hat: 3, hair: 1 }, cleric: { rob: 7, trim: 10, hat: 7, hair: 10 }, warrior: { rob: 6, trim: 8, hat: 6, hair: 4 } }[cls];
  g.R(x - 9, y - 5, 18, 6, 0); g.R(x - 8, y - 4, 16, 4, shade(PAL[C.rob], .7)); g.R(x - 10, y - 3, 5, 4, 0); g.R(x + 5, y - 3, 5, 4, 0); g.R(x - 9, y - 3, 3, 2, 4); g.R(x + 6, y - 3, 3, 2, 4);
  g.R(x - 7, y - 15 + b, 14, 11, 0); g.R(x - 6, y - 14 + b, 12, 9, C.rob); g.R(x - 6, y - 8 + b, 12, 2, C.trim); g.R(x - 8, y - 12 + b, 3, 7, 0); g.R(x + 5, y - 12 + b, 3, 7, 0); g.R(x - 7, y - 11 + b, 2, 5, C.rob); g.R(x + 5, y - 11 + b, 2, 5, C.rob); g.R(x - 3, y - 6 + b, 2, 2, sk); g.R(x + 1, y - 6 + b, 2, 2, sk);
  g.R(x - 6, y - 25 + b, 12, 11, 0); g.R(x - 5, y - 24 + b, 10, 9, sk);
  if (sleep) { g.R(x - 4, y - 20 + b, 3, 1, 0); g.R(x + 1, y - 20 + b, 3, 1, 0); } else { g.R(x - 4, y - 21 + b, 2, 3, 0); g.R(x + 2, y - 21 + b, 2, 3, 0); g.px(x - 4, y - 21 + b, 7); g.px(x + 2, y - 21 + b, 7); }
  g.R(x - 1, y - 17 + b, 2, 1, 14);
  if (cls === 'mage') { g.R(x - 8, y - 26 + b, 16, 3, 0); g.R(x - 7, y - 25 + b, 14, 2, C.hat); g.poly([[x, y - 42 + b], [x - 6, y - 25 + b], [x + 6, y - 25 + b]], 0); g.poly([[x, y - 40 + b], [x - 4, y - 26 + b], [x + 4, y - 26 + b]], C.hat); g.R(x - 6, y - 27 + b, 12, 2, 10); g.px(x, y - 33 + b, 10); g.R(x - 6, y - 22 + b, 2, 5, C.hair); g.R(x + 4, y - 22 + b, 2, 5, C.hair); }
  else if (cls === 'archer') { g.R(x - 7, y - 28 + b, 14, 6, 0); g.R(x - 6, y - 27 + b, 12, 5, C.hat); g.R(x - 6, y - 23 + b, 12, 1, 4); g.R(x + 3, y - 31 + b, 2, 4, 10); g.R(x - 6, y - 22 + b, 2, 4, C.hair); g.R(x + 4, y - 22 + b, 2, 4, C.hair); g.line(x + 9, y - 22 + b, x + 9, y - 2, 4); g.line(x + 10, y - 20 + b, x + 10, y - 4, 7); }
  else if (cls === 'cleric') { g.R(x - 7, y - 28 + b, 14, 8, 0); g.R(x - 6, y - 27 + b, 12, 7, C.hat); g.R(x - 6, y - 21 + b, 12, 1, 10); g.R(x - 6, y - 23 + b, 2, 8, C.hat); g.R(x + 4, y - 23 + b, 2, 8, C.hat); g.R(x - 1, y - 31 + b, 2, 4, 10); g.R(x - 2, y - 30 + b, 4, 1, 10); g.R(x + 10, y - 30, 2, 28, 4); g.disc(x + 11, y - 32, 3, 12); g.px(x + 11, y - 33, 7); }
  else { g.R(x - 7, y - 28 + b, 14, 7, 0); g.R(x - 6, y - 27 + b, 12, 6, C.hat); g.R(x - 6, y - 27 + b, 12, 2, 7); g.R(x - 1, y - 21 + b, 2, 5, 5); g.R(x - 6, y - 14 + b, 12, 2, C.trim); g.R(x + 8, y - 16, 8, 10, 0); g.R(x + 9, y - 15, 6, 8, 5); g.R(x + 11, y - 14, 2, 6, 10); }
}
T.chibi = chibi;
const LANGS = ['EN', 'PT', 'ES', 'JA'];
const TXT = {
  EN: { title: 'Menu', sub: 'the party rests', rows: ['COLOR', 'LOW CUT', 'ZOOM', 'LIGHTS', 'KEYS', 'NOTES', 'USB AUDIO', 'LANGUAGE', 'CALIBRATION', 'ABOUT', 'BACK'], on: ['OFF', 'ON'], col: ['MONO', 'TAVERN'], lt: ['LOW', 'MID', 'HIGH'], ky: ['WHITE KEYS', 'ALL KEYS'], usb: ['FULL', 'MIX', 'OFF'], hint: 'presets: move   knob 1: set   oct+: ok' },
  PT: { title: 'Menu', sub: 'o grupo descansa', rows: ['COR', 'CORTE GRAVE', 'ZOOM', 'LUZES', 'TECLAS', 'NOTAS', 'ÁUDIO USB', 'IDIOMA', 'CALIBRAÇÃO', 'SOBRE', 'VOLTAR'], on: ['NÃO', 'SIM'], col: ['MONO', 'TAVERNA'], lt: ['BAIXA', 'MÉDIA', 'ALTA'], ky: ['BRANCAS', 'TODAS'], usb: ['TOTAL', 'MIX', 'NÃO'], hint: 'presets: mover   knob 1: valor   oct+: ok' },
  ES: { title: 'Menú', sub: 'el grupo descansa', rows: ['COLOR', 'CORTE GRAVES', 'ZOOM', 'LUCES', 'TECLAS', 'NOTAS', 'AUDIO USB', 'IDIOMA', 'CALIBRACIÓN', 'ACERCA DE', 'VOLVER'], on: ['NO', 'SÍ'], col: ['MONO', 'TABERNA'], lt: ['BAJA', 'MEDIA', 'ALTA'], ky: ['BLANCAS', 'TODAS'], usb: ['TOTAL', 'MIX', 'NO'], hint: 'presets: mover   knob 1: valor   oct+: ok' },
  JA: { title: 'メニュー', sub: 'やすみ', rows: ['カラー', 'ローカット', 'ズーム', 'ライト', 'けんばん', 'ノート', 'USBオーディオ', 'げんご', 'ちょうせい', 'について', 'もどる'], on: ['オフ', 'オン'], col: ['モノ', 'タバーン'], lt: ['ひくい', 'ふつう', 'たかい'], ky: ['しろけん', 'ぜんぶ'], usb: ['フル', 'ミックス', 'オフ'], hint: 'presets: いどう   knob 1: せってい   oct+: けってい' },
};
const MSZ = [2, 2, 2, 3, 2, 2, 3, 4, 0, 0, 0];
add({ name: 'Menu', tag: 'fogueira · menu do aparelho', tier: 'q', an: [240, 125],
  how: ['hold:HOME = abre o menu (0,7 s)', 'turn:PRESETS = move o cursor · turn:KNOB 1 = muda o valor', 'hold:HOME = de novo, sai do menu'],
  fields: [{ l: 'cursor', d: 'linha selecionada da lista (11 linhas; a janela de 5 acompanha).', v: .7, fmt: v => Math.round(v * 10) + 1 }, { l: 'valor', d: 'muda o valor da linha selecionada (ex.: COLOR mono/taverna; LANGUAGE troca o idioma de verdade).', v: .5 }],
  desc: 'O grupo reunido em volta da fogueira, vista de cima em diagonal, todos de frente para a tela, com a floresta escura ao redor. O menu fica embaixo deles como uma lista de pergaminho; a janela rola conforme o cursor.',
  bullets: ['Personagens sentados em elipse (sprites já existentes, pose "sit")', 'Idioma em EN, PT, ES e JA: só trocam as tabelas de texto (veja o orçamento)', 'Japonês só em kana: ~160 glifos de 8×8 em 1 bpp ≈ 1,3 KB', 'Fogueira, fumaça e vagalumes = poucos pixels por quadro'],
  draw(g, t, k, st) {
    const lang = (G.LAB && G.LAB.lang) || 'EN', L = TXT[lang], N = L.rows.length, cur = Math.round(k[0] * 10), fire = 1.1;
    if (st.vals == null) st.vals = [1, 0, 0, 2, 0, 0, 0, 0]; const row = cur, mx = MSZ[row] || 0;
    if (st.lastV !== k[1] && mx > 1) { st.vals[row] = Math.min(mx - 1, Math.floor(k[1] * mx * .999)); } st.lastV = k[1]; if (row === 7) st.vals[7] = LANGS.indexOf(lang);
    g.clear(0); g.sky(19, 40, [0, 0]);
    g.R(0, 19, 240, 130, '#0d1428');
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, rx = 104 + hs(i) * 28, ry = 52 + hs(i + 3) * 14, x = 120 + Math.cos(a) * rx, y = 86 + Math.sin(a) * ry; g.disc(x, y, 9 + hs(i + 9) * 6, i & 1 ? '#10213a' : '#0b1830'); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + .1; g.R(120 + Math.cos(a) * 90 - 2, 86 + Math.sin(a) * 43 - 14, 4, 16 + hs(i) * 10, '#2a1a10'); }
    g.ell(120, 90, 96, 44, '#14243d'); g.ell(120, 90, 80, 36, '#1a3a4a'); g.ell(120, 90, 62, 28, '#2a3a30');
    for (let r = 0; r < 5; r++) g.ell(120, 92, 56 - r * 9, 25 - r * 4, [shade('#2a3a30', .9), shade(PAL[4], .7), shade(PAL[4], .9), PAL[9] + '', 9][Math.min(r, 3)] === 9 ? 9 : [shade('#2a3a30', .9), shade(PAL[4], .75), shade(PAL[4], .95), shade(PAL[9], .6)][Math.min(r, 3)]);
    g.ell(120, 92, 12 + fire * 8, 6 + fire * 3, shade(PAL[9], .8));
    const gl = [shade(PAL[4], .5), shade(PAL[4], .75), shade(PAL[9], .55), shade(PAL[9], .85)]; for (let r = 3; r >= 0; r--) g.ellO(120, 92, 20 + r * 12 + fire * 6, 9 + r * 5 + fire * 3, gl[3 - r]);
    const flick = Math.sin(t * 13) * Math.sin(t * 7);
    const hero = [{ c: 'mage', x: 66, y: 100 }, { c: 'archer', x: 174, y: 98 }, { c: 'cleric', x: 118, y: 128 }, { c: 'warrior', x: 120, y: 70, sleep: true }].sort((a, b) => a.y - b.y);
    for (const h of hero) { g.ell(h.x, h.y + 1, 12, 3, '#0a1020'); g.R(h.x - 16, h.y - 26, 32, 28, shade(PAL[9], .08 + .06 * fire + .03 * flick)); chibi(g, h.c, h.x, h.y, h.sleep, t); if (h.sleep) { const a = fr(t * .4); g.txt('z', h.x + 10 + a * 8, h.y - 28 - a * 14, 7, { sz: 12 }); } }
    g.R(106, 96, 28, 4, 4); g.R(110, 99, 22, 3, 0); const fh = 14 + fire * 14 + flick * 3;
    g.poly([[120, 90 - fh], [106, 92], [120, 100], [134, 92]], 8); g.poly([[120, 92 - fh * .7], [111, 93], [120, 99], [129, 93]], 9); g.poly([[120, 94 - fh * .4], [115, 95], [120, 99], [125, 95]], 10); g.px(120, 91 - fh * .9, 7);
    for (let q = 0; q < 10; q++) { const a = fr(t * .35 + q / 10); g.R(120 + Math.sin(a * 6 + q) * 10, 76 - a * 52, 2 + a * 3, 2 + a * 3, a < .5 ? 6 : 5); }
    for (let q = 0; q < 8; q++) { const a = fr(t * .8 + q / 8), x = 120 + Math.sin(a * 9 + q) * (10 + a * 30), y = 88 - a * 60; g.px(x, y, a < .6 ? 10 : 9); }
    for (let i = 0; i < 12; i++) g.px((hs(i) * 240 + Math.sin(t * .5 + i) * 10) % 240, 30 + hs(i + 3) * 100, Math.sin(t * 3 + i * 5) > 0 ? 10 : 11);
    // menu list under the fire
    g.R(0, 149, 240, 91, UI.bg); g.R(0, 149, 240, 1, UI.ln); g.panel(6, 153, 228, 70);
    const first = clamp(cur - 2, 0, N - 5);
    for (let r = 0; r < 5; r++) {
      const i = first + r, y = 158 + r * 12, on = i === cur; if (on) g.R(8, y - 1, 224, 12, 3 + 0);
      if (on) g.poly([[12, y + 1], [12, y + 8], [17, y + 4.5]], UI.hi);
      g.txt(L.rows[i], 22, y, on ? UI.tx : '#c8b090'); let v = '';
      if (i === 0) v = L.col[st.vals[0] ? 1 : 0]; else if (i === 1) v = L.on[st.vals[1]]; else if (i === 2) v = L.on[st.vals[2]]; else if (i === 3) v = L.lt[st.vals[3]]; else if (i === 4) v = L.ky[st.vals[4]]; else if (i === 5) v = L.on[st.vals[5] ? 0 : 1]; else if (i === 6) v = L.usb[st.vals[6]]; else if (i === 7) v = lang;
      if (v) g.txt(v, 226, y, on ? UI.hi : UI.tx, { al: 'r' });
    }
    g.R(224, 156 + 52 * (first / Math.max(1, N - 5)), 3, 12, UI.bd);
    g.txt(L.hint, 120, 228, UI.dim, { al: 'c' });
    g.bar(L.title, L.sub, lang);
  } });
})(window);
