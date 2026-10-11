// FM1 Quest lab — layout of the "new screens" sections + the next round of suggestions (dashed boxes) + notes.
(function (G) {
'use strict';
const T = G.GFX, host = document.getElementById('sug');
const PROP = (n, name, tag, how, fields, desc, bullets) => ({ n: String(n).padStart(2, '0'), name, tag, how, fields, desc, bullets });
const SCHOOL = [
  PROP(2, 'Oscilloscope Lab', 'laboratório de harmônicos', ['tap:ALGORITHM = FM School → Lab', 'turn:KNOB 1–4 = 4 primeiros harmônicos'], [['harmônicos', 'altura de cada drawbar (8 barras) que soma uma onda.'], ['alvo', 'onda tracejada que você precisa igualar.'], ['zoom', 'quantos ciclos o osciloscópio mostra.']], 'Um osciloscópio em perspectiva sobre a bancada: as barras de harmônicos somam uma onda ao vivo e você tenta cobrir a onda-alvo tracejada.', ['Ensina por que serra = muitos harmônicos e quadrada = só ímpares', 'Pontuação = erro médio entre as duas curvas', 'Usa o motor de órgão (drawbar) que o firmware já tem']),
  PROP(3, 'Filter Gym', 'ginásio do filtro', ['tap:ALGORITHM = FM School → Filter Gym', 'turn:KNOB 1 = cutoff · KNOB 2 = resonance'], [['cutoff', 'move o portão de frequência para a esquerda ou direita.'], ['resonance', 'afina o portão: mais pico, mais difícil e mais bonito.'], ['velocidade', 'velocidade com que os portões chegam.']], 'Um corredor 3D onde portões de frequência vêm na sua direção; a bolinha (o som) só passa se o cutoff estiver no vão certo.', ['Treina a relação entre cutoff, resonance e timbre', 'Fases com varredura automática (LFO) para você acompanhar', 'Cada portão atravessado dá moedas para a loja']),
  PROP(4, 'Envelope Dojo', 'dojo do ADSR', ['tap:ALGORITHM = FM School → Envelope Dojo', 'turn:KNOB 1–4 = A · D · S · R'], [['attack/decay', 'moldam a subida e a queda da faixa branca.'], ['sustain/release', 'altura do platô e comprimento da cauda.'], ['faixa', 'cor da faixa: quanto mais perto do alvo, mais escura.']], 'Um tatame em perspectiva com a silhueta de um envelope-alvo no ar; você ajusta A, D, S e R até a sua curva encaixar na silhueta e ganha a faixa preta.', ['Alvo vem de sons famosos: pluck, pad, sino, baixo 808', 'Pontuação = área entre a sua curva e a do alvo', 'Aproveita a curva ADSR que já é desenhada na página ENV']),
  PROP(5, 'Operator Workshop', 'oficina de operadores', ['tap:ALGORITHM = FM School → Workshop', 'turn:KNOB 1 = escolhe o operador · KNOB 2 = a quem ele liga'], [['operador', 'qual dos 4 operadores está selecionado.'], ['ligação', 'para quem ele envia sinal (os "tubos").'], ['saída', 'quais operadores soam direto (carriers).']], 'Uma oficina isométrica com quatro máquinas ligadas por tubos de energia: ligar saídas a entradas monta o algoritmo FM e a tela mostra o caminho do sinal.', ['Ensina algoritmos como quebra-cabeça (qual operador modula qual)', 'Cada ligação nova toca o resultado na hora', 'Bom para "Algorithm" e "Feedback" do currículo']),
  PROP(6, 'Ear Exam', 'prova de ouvido A/B', ['tap:ALGORITHM = FM School → Exam', 'press:OCT+ = alterna A (alvo) / B (o seu)'], [['A/B', 'alterna entre o som alvo e o seu.'], ['parâmetros', 'os knobs da lição que você pode mexer.'], ['semelhança', 'régua que mostra o quão perto está (revelada só no fim).']], 'Uma cabine com fones vista em perspectiva: ouça o alvo, reconstrua de ouvido e compare. A nota só aparece quando você confirma.', ['Treina ouvido para timbre, não só para altura', 'Comparação feita por parâmetros, sem precisar analisar áudio', 'Resultado vai para o boletim']),
  PROP(7, 'Report Card', 'boletim', ['hold:HOME = abre o menu', 'tap:ALGORITHM = FM School → Report'], [['aula', 'qual linha do boletim está destacada.'], ['período', 'semana, mês ou geral.'], ['carimbo', 'tipo de selo recebido (A+, medalha, estrela).']], 'Um boletim com carimbos e medalhas, uma linha por aula, e um gráfico radar com os seus pontos fortes (ritmo, timbre, melodia, harmonia).', ['Mostra o progresso entre sessões (contadores na flash)', 'Radar de 4 eixos: ritmo · timbre · melodia · harmonia', 'Compartilhável pelo editor web como imagem']),
];
const HERO = [
  PROP(8, 'Song Select', 'prateleira de fitas', ['tap:PLAY = FM Hero → escolher música', 'turn:SELECT = gira a prateleira'], [['música', 'qual fita está na frente.'], ['dificuldade', 'fácil, normal ou difícil (quantas pistas e notas).'], ['fonte', 'projeto atual, MIDI importado ou lição.']], 'Um carrossel 3D de fitas cassete com título, BPM, dificuldade em estrelas e o melhor rank de cada uma.', ['Reaproveita o carrossel do Bestiary', 'A fonte "projeto atual" não precisa de importação', 'Mostra o rank salvo e o combo máximo']),
  PROP(9, 'Calibration', 'calibração de latência', ['hold:HOME = menu → FM HERO → CALIBRATION', 'key:1 = toque junto com a luz'], [['toques', 'quantos toques foram medidos.'], ['offset', 'média de adiantado/atrasado em ms.'], ['aplicar', 'grava o offset para os acertos.']], 'Uma luz pulsa no centro de um túnel em perspectiva; você toca junto 8 vezes e a tela mostra a média do atraso para compensar nos acertos.', ['Necessária porque o jogo mede acertos na casa de dezenas de ms', 'Só guarda um número (offset) na flash', 'O SLOOP já compensa ~12 ms de tecla→som na gravação: dá um ponto de partida']),
  PROP(10, 'Practice Loop', 'treino em loop', ['tap:SEQ = (no FM Hero) marca A e B', 'turn:KNOB 2 = velocidade 50–100%'], [['A–B', 'trecho que se repete.'], ['velocidade', 'andamento do treino (o tom não muda: só o relógio).'], ['espelhar', 'inverte as pistas (esquerda↔direita).']], 'A pista com uma barra de seção A–B que se enrola em loop e diminui a velocidade para treinar passagens difíceis.', ['Velocidade = relógio do sequenciador, sem reamostrar áudio', 'Pista espelhada ajuda a treinar a outra mão', 'Marca no chart os compassos que você mais erra']),
  PROP(11, 'Duel', 'duelo de pistas', ['tap:GLO + tap:PLAY = FM Hero → Duel', 'key:1–16 = pistas do jogador'], [['rival', 'quem toca a outra metade (Shadow, MIDI externo ou auto).'], ['dificuldade', 'nível do rival.'], ['cabo-de-guerra', 'quem está levando a vantagem.']], 'A pista é dividida ao meio: você de um lado e o rival Shadow do Duel do outro, com uma barra de cabo-de-guerra no topo.', ['Pode usar um teclado MIDI na entrada TRS como segundo jogador', 'Barra de vantagem = diferença de pontuação', 'Vencer rende moedas para a loja']),
  PROP(12, 'Timing Histogram', 'histograma de tempo', ['auto:FM Hero = ao terminar a música', 'press:OCT+ = detalhes por pista'], [['pista', 'qual pista é analisada.'], ['janela', 'largura do histograma (±50, ±100 ms).'], ['dica', 'recomendação em texto (você corre 18 ms).']], 'Barras 3D em perspectiva mostram quantas notas foram adiantadas ou atrasadas, com uma dica do tipo "você adianta 18 ms".', ['Mostra viés de tempo (rushing/dragging) por pista', 'Dados vêm do hook de erro de tempo', 'Alimenta o Rank e o boletim']),
];
const MORE = [
  PROP(13, 'Companion', 'mascote que cresce', ['hold:HOME = menu → TAVERN → Companion'], [['humor', 'reage ao groove: dança, dorme, bravo se parar.'], ['nível', 'cresce com horas tocadas.'], ['roupa', 'itens desbloqueados nos mini-games.']], 'Um slime filhote que vive numa caminha em perspectiva e reage à música: dança no tempo, dorme se o aparelho fica parado e evolui com o uso.', ['Funciona como tela ociosa divertida', 'Usa os sprites do slime que já existem', 'Evolução guardada em um byte de nível']),
  PROP(14, 'Spectrum Sky', 'espectro como céu', ['hold:HOME = menu → TAVERN → Sky'], [['bandas', 'quantas faixas de frequência (8–16).'], ['estilo', 'cordilheira, aurora ou fogueiras.'], ['suavização', 'quão rápido as barras caem.']], 'O espectro do som vira uma cordilheira com aurora acima: graves são montanhas à esquerda, agudos são luzes à direita.', ['Precisa de um hook leve de FFT/filtros em 8 bandas', 'Barras em degraus: poucos retângulos por quadro', 'Boa tela de fundo para o modo performance']),
  PROP(15, 'Tour Bus', 'corrente da song como viagem', ['hold:SAVE + key:16 = a corrente (hoje); Tour Bus é a vista em mapa'], [['posição', 'em qual seção A–D o ônibus está.'], ['velocidade', 'acompanha o bpm.'], ['paradas', 'pontos de repetição do loop.']], 'Um mapa de estrada em perspectiva onde um ônibus viaja de uma seção a outra; cada parada é uma seção da song.', ['Mostra a ordem das seções de forma visual', 'Curva da estrada = mudança de tonalidade', 'Reaproveita a estrada do Day / Night']),
  PROP(16, 'Shop', 'loja de presets e skins', ['hold:HOME = menu → TAVERN → Shop'], [['moedas', 'ganhas nos mini-games.'], ['item', 'preset, kit, paleta ou classe.'], ['comprar', 'desbloqueia o item no firmware.']], 'Uma vitrine em perspectiva onde as moedas dos mini-games compram novos kits, paletas e até classes de personagem.', ['Motiva a jogar FM School e FM Hero', 'Itens são só flags na flash: não pesa', 'Pode liberar skins do Class change']),
  PROP(17, 'Jam Tavern', 'convidados MIDI', ['hold:HOME = menu → TAVERN → Jam'], [['canal', 'canal MIDI do convidado (1–16).'], ['mesa', 'qual NPC sentou onde.'], ['volume', 'nível de cada convidado.']], 'Uma taverna vista de cima: cada canal MIDI externo é um bardo numa mesa, que acende quando toca (entrada TRS ou USB).', ['Mostra quem está tocando o quê quando há vários teclados', 'Usa o mesmo roteamento de canais do MIDI IN do SLOOP', 'Pode gravar o convidado numa faixa']),
  PROP(18, 'Orrery', 'poliritmia como planetas', ['hold:HOME = menu → TAVERN → Orrery'], [['faixa', 'qual planeta (faixa 1–4).'], ['comprimento', 'período orbital = steps da faixa.'], ['fase', 'onde cada planeta está agora.']], 'Quatro planetas giram em torno do bastão do tempo; faixas com comprimentos diferentes giram em períodos diferentes, e o alinhamento marca o "downbeat" geral.', ['Mostra poliritmia de forma óbvia (steps 16 / 12 / 20 / 64)', 'O tempo para alinhar tudo = menor múltiplo comum dos comprimentos', 'Barato: elipses e pontos']),
  PROP(19, 'Postcard', 'cartão-postal da sessão', ['auto:HOME hold = ao fechar o aparelho (proposta)', 'tap:SAVE = TAVERN → Postcard'], [['foto', 'cena do dia (bioma, hora, clima).'], ['texto', 'bpm, escala, loops, rank.'], ['exportar', 'envia ao editor web como imagem.']], 'Um cartão-postal em pixel art com a cena do bioma atual e o resumo da sessão (tempo tocado, loops, melhor rank), que o editor web pode baixar.', ['Resumo bonito para compartilhar', 'Gerado só com contadores que já existem', 'Não pesa: uma tela estática']),
];

SCHOOL.length = 0; HERO.length = 0; MORE.length = 0;
const GAMES = ['Echo', 'FM Hero', 'Piano Hero', 'Envelope Dojo', 'Song Select', 'Practice Loop', 'Duel'];
const GROUPS = [
  ['t1', 'Tier 1 — Alto impacto · usa dados que o Quest já lê', 'Quase de graça: padrões, level, mute/solo e posição de loop que a Party já consome.'],
  ['t2', 'Tier 2 — Médio · lê páginas que o firmware já tem', 'ENV, LFO, ARP, SEQ SONG e SCL como metáforas legíveis.'],
  ['t3', 'Tier 3 — Ambicioso · hooks novos ou persistência', 'Precisam medir áudio/tempo ou guardar progresso na flash.'],
  ['tr', 'Treino — mini-games que ensinam tocar e sintetizar', 'Echo, FM Hero, Piano Hero e FM School. O áudio é o próprio sintetizador; a pontuação precisa do hook "erro de tempo vs grade".'],
  ['bk', 'Bancos de som — SoundFont / SNES / samples', 'O Armory e o Chisel já estão na seção 1b; aqui o Importer e o Zones.'],
  ['n2', 'Rodada 2 — FM School, FM Hero e telas gerais', 'Library (grimórios de aulas e músicas), Envelope Dojo, Song Select, Orrery e Companion.'],
  ['n3', 'Rodada 3 — FM School, FM Hero e telas gerais', 'Practice Loop, Duel, Spectrum Sky e Jam Tavern.'],
  ['fx', 'Formação — para um FX novo', 'O palco do Formation vira a base de um FX: a abertura do grupo é o pan das faixas e o level muda o dano.'],
  ['sys', 'Sistema — ajuda, pads e ficha do herói', 'Help em pergaminhos que deslizam, remapeamento das teclas (com MIDI learn) e a ficha editável do herói. Abra pelo Simulador: segure HOME → Tavern → SYSTEM.'],
  ['cls', 'Personagens — troca de classe (teste)', 'Aperte um botão ou gire o knob: transição entre as classes. Não precisa desenhar tudo de novo: paleta, silhueta e vagas bloqueadas.'],
];
const head = (tag, txt, sub) => `<div class="tier ${tag}"><h3><i>${tag.toUpperCase()}</i>${txt}</h3><p>${sub}</p></div>`;


// ---------------------------------------------------------------- section 2 (others) + import notes
const others = () => {
  const host2 = document.getElementById('g-shots'); const D = {}; (G.LAB_SHOTS || []).forEach(x => { D[x[0]] = x; });
  const png = id => { const x = D[id]; const el = document.createElement('div'); el.className = 'tile'; el.innerHTML = `<img class="shot" src="shots/${id}.png" alt="${x ? x[1] : id}"><div class="cap"><b>${x ? x[1] : id}</b><span>original · ${id}.png</span></div><div class="note">${x ? x[2] : ''}<br><i>captura real do firmware (ainda no padrão antigo)</i></div>`; host2.append(el); };
  const sk = name => { const d = T.REG.find(r => r.name === name); if (d) T.build(d, host2); };
  const pend = (name, note) => { const el = document.createElement('div'); el.className = 'tile'; el.innerHTML = `<div class="ph pend"><span class="n">📷</span><b>${name}</b><em>foto pendente</em></div><div class="cap"><b>${name}</b><span>captura que falta</span></div><div class="note">${note || 'Tire uma foto desta tela no aparelho e me mostre para eu redesenhar.'}</div>`; host2.append(el); };
  ['sk:ENV · Feitiço 1/2', 'sk:LFO · Sea', 'png:edit3', 'png:edit4', 'sk:FX Slicer · Towers', 'sk:FX Delay · Floresta', 'sk:FX Reverb · Catedral', 'sk:SCL · Torch wall',
    'p:ARP 1/2', 'p:ARP 2/2', 'p:GLO 1/4', 'p:GLO 2/4', 'p:GLO 3/4', 'p:GLO 4/4', 'p:SEQ 1/3', 'p:SEQ 2/3', 'p:SEQ 3/3', 'sk:SAVE · Baús', 'p:SAVE 2/4', 'p:SAVE 3/4', 'p:SAVE 4/4', 'sk:Layer Roll · Runas', 'sk:Layer Steps · Placas', 'sk:About', 'png:about', 'png:hold-clear'].forEach(k => { const [t, v] = [k.split(':')[0], k.slice(k.indexOf(':') + 1)]; if (t === 'sk') sk(v); else if (t === 'png') png(v); else pend(v); });
};
const imp = () => {
  const el = document.getElementById('imp'); const A = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  el.innerHTML = `<h2>2b · Importar músicas e sons <span class="pill">como funciona</span></h2>
  <div class="note-box"><h4 style="margin-top:0">Como a importação funciona</h4><ul>
    <li><b>Por USB, não por Bluetooth.</b> O editor web fala com o FM-1 por <b>Web MIDI (SysEx) pelo cabo USB</b>, no Chrome ou no Edge, com o cabo ligado direto no computador. O FM-1 tem Bluetooth MIDI para tocar, mas o manual só descreve o envio de samples e projetos pelo USB.</li>
    <li><b>Serve neste mesmo link.</b> O editor é a página que o site do GitHub Pages já publica (feito por <code>web/make_site.py</code>): ele roda no navegador, então dá para abrir o link, plugar o FM-1 e importar. Importadores novos (MIDI, MOD, SF2) seriam código novo dentro desse editor, sem custo no aparelho.</li>
    <li><b>Uma música só para a escola?</b> Dá: seria um "pacote de lição" pequeno (notas + alvo de timbre) enviado como mais um tipo de arquivo, sem mexer nos bancos de sons. Ainda não existe; é um recurso novo do editor e do firmware.</li>
    <li><b>Banco de sons tem limite?</b> Sim: <b>3 slots (USR1–3) de cerca de 7,4 s cada (~80 KiB)</b> e até <b>16 arquivos por slot</b>. O Armory mostra o uso de cada slot, o limite e se o instrumento coube.</li>
  </ul>
  <h4>Formatos: o que importa hoje e o que não importa</h4>
  <table class="data"><tr><th>Formato</th><th>O que é</th><th>Importa hoje?</th></tr>
    <tr><td>.wav · .mp3 · .aiff</td><td>Áudio gravado (samples, recortes, instrumentos extraídos).</td><td><span class="pill ok">sim</span> aba Samples do editor, com CHOP, até 16 por slot</td></tr>
    <tr><td>.mid</td><td>Notas, tempo e faixas (sem som). O mais leve para músicas e charts.</td><td><span class="pill hook">não</span> importador novo no editor</td></tr>
    <tr><td>.chart · notes.mid · .sm · .ssc · .osu</td><td>Charts de jogos de ritmo (texto ou MIDI com pistas). Só as notas; o áudio fica de fora.</td><td><span class="pill hook">não</span> importador novo</td></tr>
    <tr><td>.mod · .xm · .it · .s3m</td><td>Trackers: padrões + samples pequenos de 8 bits (música de jogos antigos).</td><td><span class="pill hook">não</span> importador novo (padrões + slots)</td></tr>
    <tr><td>.sf2 · .sfz · .brr</td><td>Bancos de samples (SoundFont / SNES).</td><td><span class="pill hook">não</span> extrair instrumentos pequenos para WAV e usar o item da primeira linha</td></tr>
    <tr><td>.nsf · .spc · .vgm · .gbs</td><td>Registros ou programas de chips de som (NES, SNES, Mega Drive, Game Boy).</td><td><span class="pill hook">não</span> o FM-1 não emula esses chips</td></tr>
  </table>
  <h4>Onde baixar para testar (só o que importa hoje: áudio WAV)</h4><ul>
    <li>${A('https://github.com/sgossner/VCSL', 'VCSL — Versilian Community Sample Library')} (CC0, instrumentos reais em WAV; é uma das fontes dos sons do aparelho)</li>
    <li>${A('https://github.com/sgossner/VSCO-2-CE', 'VSCO 2 Community Edition')} (CC0, orquestra em WAV)</li>
    <li>${A('https://www.adventurekid.se/akrt/waveforms/adventure-kid-waveforms/', 'Adventure Kid Waveforms (AKWF)')} (ondas de um ciclo em WAV, ótimas para sons "chip"; CC0)</li>
    <li>${A('https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples', 'Samples do Sonic Pi')} (WAV/FLAC curtos; confira a licença de cada arquivo)</li>
    <li>${A('https://freesound.org', 'Freesound')} (filtre por licença CC0; precisa de conta para baixar)</li>
    <li>No próprio projeto: pastas <code>assets/samples-cc0</code> e <code>assets/hiphop-pack</code>.</li>
  </ul><p class="legend2">Os links são de bibliotecas conhecidas; confira a licença de cada arquivo antes de usar. Para os formatos marcados "não", ainda não há importador, então não listei downloads.</p></div>`;
};


const FONTS = [['Jacquarda Bastarda 9', 1, 'atual · gótica pixelada'], ['Jacquard 12', 1.2, 'gótica pixelada (família do atual)'], ['Jacquard 24', 1, 'gótica pixelada mais fina'], ['Pixelify Sans', 1, 'a do corpo do texto, em tamanho de título'], ['Silkscreen', .8, 'pixel limpa, só maiúsculas'], ['Press Start 2P', .62, 'pixel clássica de arcade'], ['Tiny5', 1.15, 'pixel pequena e legível'], ['DotGothic16', .95, 'pixel estilo japonês'], ['VT323', 1.2, 'terminal retrô'], ['MedievalSharp', .9, 'medieval vetorial'], ['Uncial Antiqua', .85, 'uncial de manuscrito'], ['Pirata One', 1, 'gótica pirata'], ['Metamorphous', .85, 'fantasia elegante'], ['IM Fell English SC', .95, 'tipografia antiga em versalete'], ['Almendra', .95, 'conto de fadas'], ['Cinzel Decorative', .8, 'romana decorada']];
const setFont = (name, scale, btns) => { T.TF.name = name; T.TF.scale = scale; T.MASKS.clear(); document.documentElement.style.setProperty('--title-font', `"${name}"`); document.documentElement.style.setProperty('--title-scale', scale); btns.forEach(b => b.classList.toggle('on', b.dataset.n === name)); document.fonts.load(`16px "${name}"`).then(() => { T.MASKS.clear(); G.LAB && G.LAB.touch(); }); G.LAB && G.LAB.touch(); };
const fontsUI = () => { const el = document.getElementById('fonts'); el.className = 'fontgrid'; const btns = []; FONTS.forEach(([n, sc, d]) => { const b = document.createElement('button'); b.dataset.n = n; b.className = 'fbtn' + (n === T.TF.name ? ' on' : ''); b.innerHTML = `<span style="font-family:'${n}',serif;font-size:${Math.round(20 * sc)}px">Quest Log · Menu</span><small>${n} — ${d}</small>`; b.onclick = () => setFont(n, sc, btns); btns.push(b); el.append(b); }); };


const TABKEY = { 'TF': 'Telas (histórico)', 'FE2': 'Ferramentas', 'FE3': 'Ferramentas', 'S': 'Simulador', 'ST': 'Story', 'SC': 'Cenas', 'FXG': 'Efeitos', '0': 'Personagens', '0b': 'Personagens', 'ED': 'Editor', 'FE': 'Ferramentas', '00': 'Ferramentas', '1': 'Telas Quest', '1b': 'Banco de sons', '2': 'Outras telas', '2b': 'Ferramentas', '3': 'Novas telas', '3b': 'Sugestões', '4': 'Notas', '5': 'FM Hero · Piano · School' };
function buildTabs() {
  const main = document.querySelector('main'); ['sug', 'imp'].forEach(id => { const el = document.getElementById(id); if (el) { while (el.firstChild) main.insertBefore(el.firstChild, el); el.remove(); } });
  let cur = 'Fontes'; const names = []; [...main.children].forEach(ch => { const hh = ch.tagName === 'H2' ? ch : (ch.firstElementChild && ch.firstElementChild.tagName === 'H2' ? ch.firstElementChild : null); if (hh) { const key = hh.textContent.trim().split(/\s/)[0]; if (TABKEY[key]) cur = TABKEY[key]; } ch.dataset.tab = cur; if (!names.includes(cur)) names.push(cur); });
  const nav = document.createElement('nav'); nav.id = 'tabs'; main.prepend(nav); const show = n => { [...main.children].forEach(ch => { if (ch !== nav) ch.style.display = ch.dataset.tab === n ? '' : 'none'; }); nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.n === n)); try { localStorage.setItem('fm1lab.tab', n); } catch (e) {} window.scrollTo(0, 0); };
  names.forEach(n => { const b = document.createElement('button'); b.textContent = n; b.dataset.n = n; b.onclick = () => show(n); nav.append(b); });
  document.querySelectorAll('input[name=cat]').forEach(r => r.addEventListener('change', () => T.applyFilter()));
  let st = 'Simulador'; try { st = localStorage.getItem('fm1lab.tab') || st; } catch (e) {} show(names.includes(st) ? st : names[0]);
}
const CATN = { opt: ['Orrery', 'Practice Loop', 'Duel', 'Formation · Battle', 'Damage meter'], drop: [] };
function applyFilter() {
  const f = (document.querySelector('input[name=cat]:checked') || {}).value || 'all', main = document.querySelector('main'), nav = document.getElementById('tabs');
  const catOf = el => { const n = (el.querySelector('.cap b') || {}).textContent || ''; return CATN.opt.includes(n) ? 'opt' : CATN.drop.includes(n) ? 'drop' : 'use'; };
  main.querySelectorAll('.tile').forEach(el => { el.dataset.hide = (f !== 'all' && catOf(el) !== f) ? '1' : ''; el.style.display = el.dataset.hide ? 'none' : ''; });
  main.querySelectorAll('.tiles').forEach(g => { const any = [...g.children].some(x => !x.dataset.hide); g.style.display = any ? '' : 'none'; const pv = g.previousElementSibling; if (pv && pv.classList.contains('tier')) pv.style.display = any ? '' : 'none'; });
  const has = {}; [...main.children].forEach(ch => { if (ch === nav) return; const tabn = ch.dataset.tab, tiles = ch.querySelectorAll ? [...ch.querySelectorAll('.tile')] : []; has[tabn] = has[tabn] || false; if (ch.classList && ch.classList.contains('tiles')) { if (tiles.some(x => !x.dataset.hide)) has[tabn] = true; } else if (!tiles.length && !(ch.classList && ch.classList.contains('tier')) && ch.tagName !== 'H2' && !ch.querySelector('h2') && f !== 'opt' && f !== 'drop') has[tabn] = has[tabn] || false; });
  [...main.children].forEach(ch => { if (ch !== nav && ch.dataset.tab && !ch.querySelector && 0) return; });
  const tabHasTiles = {}, tabHasAny = {}; [...main.children].forEach(ch => { if (ch === nav) return; const n = ch.dataset.tab; if (ch.classList.contains('tiles')) { tabHasTiles[n] = true; if ([...ch.children].some(x => !x.dataset.hide)) tabHasAny[n] = true; } });
  const visibleTab = n => !tabHasTiles[n] ? (f === 'all' || f === 'use') : !!tabHasAny[n];
  nav.querySelectorAll('button').forEach(b => { b.style.display = visibleTab(b.dataset.n) ? '' : 'none'; });
  const on = nav.querySelector('button.on'); if (!on || on.style.display === 'none') { const first = [...nav.querySelectorAll('button')].find(b => b.style.display !== 'none'); if (first) first.click(); }
}
T.applyFilter = applyFilter;
T.buildTabs = buildTabs;

T.render = function () {
  fontsUI();
  const out = [];
  const roster = (tier, id) => T.REG.filter(d => d.tier === tier).forEach(d => T.build(d, document.getElementById(id)));
  roster('hero', 'g-heroes'); roster('enemy', 'g-enemies'); roster('q', 'g-quest'); others(); imp();
  const h2 = (t, p) => { const e = document.createElement('div'); e.innerHTML = `<h2>${t}</h2>${p ? `<p class="sub">${p}</p>` : ''}`; host.append(e); };
  h2('3 · Novas telas, agora desenhadas <span class="pill ok">animadas ao vivo</span>', 'Sem sideview: cenas com perspectiva, isométrico, mode 7 e carrosséis, no mesmo palette TAVERN e com as mesmas fontes pixeladas. Cada tela tem seus campos de ajuste (sliders, que fazem o papel dos knobs) e explica o que cada um faz. Em cada tela aparece também o custo estimado de SPI: telas animadas em área grande custam mais que a cena de 84 px do Quest.');
  GROUPS.forEach(([tag, title, sub]) => {
    const wrap = document.createElement('div'); wrap.innerHTML = head(tag, title, sub); host.append(wrap);
    const grid = document.createElement('div'); grid.className = 'tiles'; host.append(grid);
    T.REG.filter(d => d.tier === tag && !GAMES.includes(d.name)).forEach(d => T.build(d, grid));
  });
  h2('5 · FM Hero, Piano Hero e FM School <span class="pill ok">jogos e escola</span>', 'Todas as telas dos jogos de ritmo e da escola de síntese juntas. No FM Hero e no Piano Hero use OCT− / OCT+ (ou as teclas [ e ]) para trocar de música de treino.');
  { const grid = document.createElement('div'); grid.className = 'tiles'; host.append(grid); GAMES.forEach(n => { const d = T.REG.find(r => r.name === n); if (d) T.build(d, grid); }); }
  // ---- how FM Hero works
  const box = document.createElement('div'); box.className = 'note-box'; box.innerHTML = `
    <h4 style="margin-top:0">Como funcionaria o FM Hero (e o nome)</h4>
    <p style="margin:2px 0 6px"><b>Nome:</b> recomendo <b>FM Hero</b> — combina com FM Quest e FM School, e "Hero" sozinho é genérico (evita parecer cópia de marca). "Rhythm Hero" fica como subtítulo na tela de título.</p>
    <ul>
      <li><b>1 · Chart:</b> uma lista de eventos <code>{tempo em steps, pista, duração}</code>. Três fontes: (a) o padrão que você já gravou no projeto (nada a importar), (b) um MIDI importado, (c) lições embutidas.</li>
      <li><b>2 · Relógio:</b> o sequenciador já tem relógio exato (sample-accurate). A posição de cada nota na tela é <code>(tempo da nota − agora) × velocidade</code>, desenhada com 1/z para dar a perspectiva.</li>
      <li><b>3 · Entrada:</b> cada tecla ou pad tem timestamp na varredura. O acerto compara esse instante com o da nota: janela "perfeito" ≈ ±50 ms e "bom" ≈ ±100 ms (a calibrar com a tela Calibration).</li>
      <li><b>4 · Som:</b> o próprio sintetizador toca as outras faixas; a nota acertada toca a pista, o erro silencia ou toca nota errada.</li>
      <li><b>5 · Placar:</b> combo, multiplicador, rock meter e, no fim, o Rank e o histograma de tempo.</li>
      <li><b>6 · Custo:</b> pista animada de ~240×125 px = ~40 ms de SPI por quadro, ou seja ~16 fps já passa do teto de 55% do barramento. Soluções: redesenhar só as notas (partial redraw), pista menor ou 10–12 fps.</li>
    </ul>
    <h4>Formatos de música que dá para trazer</h4>
    <ul>
      <li><b>.mid (Standard MIDI):</b> o mais comum e mais leve; notas, tempo e faixas viram chart e padrões. Melhor opção. <span class="pill hook">importador novo no editor</span></li>
      <li><b>.chart / notes.mid (Clone Hero / Guitar Hero):</b> texto ou MIDI com pistas; dá para ler as notas (o áudio .ogg fica de fora).</li>
      <li><b>.sm / .ssc (StepMania) e .osu (osu!):</b> texto simples com tempo e pista; importáveis, sem o áudio.</li>
      <li><b>.mod / .xm / .it / .s3m (trackers):</b> música de jogos antigos, com padrões e samples de 8 bits pequenos; convertem bem para padrões + slots USR (ADPCM).</li>
      <li><b>.nsf / .spc / .vgm / .gbs (NES, SNES, Mega Drive, Game Boy):</b> são programas ou registros de chips de som. O FM-1 não emula esses chips; teria que converter no computador para MIDI ou tracker antes.</li>
      <li><b>.sf2 / .sfz e .brr (SNES):</b> bancos de samples. Extrair instrumentos pequenos para WAV e mandar para um slot USR (cabe cerca de 7,4 s por slot).</li>
      <li><b>.wav / .mp3 / .aiff:</b> já aceitos hoje pelo editor web (aba Samples, com CHOP), segundo o manual.</li>
    </ul>
    <p class="legend2">O manual só descreve importação de WAV/MP3/AIFF; leitura de MIDI, MOD e SF2 seriam recursos novos do editor web (no computador), sem custo no aparelho.</p>
    <h4>O que deixa a tela leve ou pesada no aparelho</h4>
    <ul>
      <li><b>Número de cores não pesa no SPI:</b> o LCD recebe 2 bytes por pixel (RGB565) seja qual for a paleta. Paleta de 16 cores só ajuda na flash e na RAM dos sprites (4 bpp = ¼).</li>
      <li><b>O que pesa:</b> área redesenhada × quadros por segundo (SPI) e quantidade de retângulos/polígonos por quadro (CPU).</li>
      <li><b>Mais leve:</b> redesenhar só o que mudou, cena menor, sprites pré-prontos em vez de polígonos, partes distantes simplificadas (como o rabisco no pergaminho). Desenhar em meia resolução e dobrar não reduz o SPI, porque os 240 pixels de largura continuam sendo enviados.</li>
      <li><b>fps:</b> subir o fps não danifica o painel: são só mais bytes por segundo. O limite real é o orçamento de SPI e de CPU (o firmware já faz fade de voz se faltar CPU). Use o slider de fps da barra de cima para sentir 12, 16, 20 ou 24; cada tela mostra a porcentagem do barramento que ela usaria.</li>
    </ul>`;
  host.append(box);
  // ---- next round of suggestions (dashed boxes)
  if ([SCHOOL, HERO, MORE].some(l => l.some(d => !T.REG.some(r => r.name === d.name)))) h2('3b · Próxima rodada de sugestões <span class="pill hook">ideias — ainda sem desenho</span>', 'Análise do que já temos: o Quest cobre bem <b>tempo, nota e mix</b>, mas pouco <b>progresso</b> (conquistas, loja), <b>aprendizado</b> (FM School) e <b>jogo</b> (FM Hero). As caixas abaixo detalham esses três caminhos e adicionam telas gerais. Cada quadrado é do tamanho real (240×240).');
  [['t2', 'Trilha FM School — currículo', 'Da onda senoidal ao exame final, uma sala por conceito, sempre usando o motor FM de 4 operadores que o aparelho já tem.', SCHOOL], ['tr', 'Trilha FM Hero — a vida do jogo de ritmo', 'Do menu de músicas à calibração e à análise de tempo.', HERO], ['t3', 'Telas gerais novas', 'Companheiro, loja, taverna de convidados, poliritmia e mais.', MORE]].forEach(([tag, title, sub, list]) => {
    const rest = list.filter(d => !T.REG.some(r => r.name === d.name)); if (!rest.length) return;
    const wrap = document.createElement('div'); wrap.innerHTML = head(tag, title, sub); host.append(wrap);
    const grid = document.createElement('div'); grid.className = 'tiles'; host.append(grid); rest.forEach(d => T.placeholder(d, grid));
  });
};
})(window);
