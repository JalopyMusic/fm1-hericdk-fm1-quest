// FM1 Quest lab — screen transitions drawn on canvas: shared by the Story tab (between scenes) and the Efeitos tab (previews that show BEFORE → AFTER).
// draw(ctx, kind, p, A, B, H): A = old screen, B = new screen (240-wide canvases), p = 0..1 linear progress, H = visible height (160 band or 240).
(function (G) {
'use strict';
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const E = p => 1 - Math.pow(1 - clamp(p), 3.4);                                  // fast stretched start, soft end (the user's easing)
const M4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (M4[(y & 3) * 4 + (x & 3)] + .5) / 16;
const tmp = document.createElement('canvas'); tmp.width = tmp.height = 240; const tx = tmp.getContext('2d');
const KINDS = {
  cut:    { name: 'corte seco', dur: .01, desc: 'Sem efeito: a tela nova aparece de uma vez.' },
  fade:   { name: 'fusão', dur: .9, desc: 'A tela antiga some enquanto a nova aparece por cima, suave. Para passar tempo ou trocar de lugar sem pressa.' },
  wipe:   { name: 'cortina', dur: .6, desc: 'Uma linha clara varre da esquerda para a direita e deixa a tela nova para trás. Para trocar de página.' },
  drop:   { name: 'gaveta', dur: .6, desc: 'A tela nova desce de cima como uma gaveta se abrindo. Para sub-telas e camadas.' },
  iris:   { name: 'íris', dur: .8, desc: 'Um círculo abre do centro e mostra a tela nova dentro dele. Para entrar num menu.' },
  tv:     { name: 'TV ligando', dur: 1.1, desc: 'Um ponto brilhante vira uma linha, depois a tela cresce, como TV de tubo ligando. Para ligar o aparelho.' },
  vhs:    { name: 'VHS', dur: .9, desc: 'A imagem treme em faixas, ganha cor roxa, chuvisco e uma barra rolando, e se firma na tela nova. Para avançar e rebobinar cenas.' },
  flash:  { name: 'clarão', dur: .7, desc: 'Um clarão branco cobre tudo e, quando apaga, já é a tela nova. Para começar uma luta.' },
  slide:  { name: 'deslizar', dur: .7, desc: 'A tela nova empurra a antiga para a esquerda. Para ir para a próxima cena.' },
  blinds: { name: 'persianas', dur: .8, desc: 'Faixas horizontais abrem e mostram a tela nova, como persianas. Para trocar de lugar dentro da cena.' },
  pixel:  { name: 'pixelar', dur: .9, desc: 'A imagem vira blocos grandes, troca por trás e os blocos voltam a ser pixels. Para trocar de personagem ou classe.' },
  dither: { name: 'pontilhado', dur: 1, desc: 'A tela nova nasce ponto a ponto, num padrão de pontinhos, como na arte de poucas cores. Para viradas de tempo (dia → noite).' },
};
function draw(c, kind, p, A, B, H) {
  H = H || 240; const W = 240, e = E(p); c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip(); c.imageSmoothingEnabled = false;
  if (kind === 'cut' || p >= 1) c.drawImage(B, 0, 0);
  else if (kind === 'fade') { c.drawImage(A, 0, 0); c.globalAlpha = p; c.drawImage(B, 0, 0); c.globalAlpha = 1; }
  else if (kind === 'wipe') { c.drawImage(A, 0, 0); const x = e * W; c.drawImage(B, 0, 0, x, H, 0, 0, x, H); c.fillStyle = '#fff'; c.globalAlpha = 1 - p; c.fillRect(x - 2, 0, 3, H); c.globalAlpha = (1 - p) * .35; c.fillRect(x - 10, 0, 8, H); c.globalAlpha = 1; }
  else if (kind === 'drop') { c.drawImage(A, 0, 0); const y = e * H; c.drawImage(B, 0, 0, W, y, 0, 0, W, y); c.fillStyle = '#fff'; c.globalAlpha = 1 - p; c.fillRect(0, y - 2, W, 3); c.globalAlpha = (1 - p) * .35; c.fillRect(0, y - 10, W, 8); c.globalAlpha = 1; }
  else if (kind === 'iris') { c.drawImage(A, 0, 0); const r = e * Math.hypot(W, H) / 2 * 1.02; c.save(); c.beginPath(); c.arc(W / 2, H / 2, r, 0, 7); c.clip(); c.drawImage(B, 0, 0); c.restore(); c.strokeStyle = '#fff'; c.globalAlpha = 1 - p; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H / 2, r, 0, 7); c.stroke(); c.globalAlpha = 1; }
  else if (kind === 'tv') {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.globalAlpha = clamp(1 - p / .12); c.drawImage(A, 0, 0); c.globalAlpha = 1;
    const q = p < .38 ? p / .38 : 1, sx = p < .38 ? lerp(.03, 1, E(q)) : 1, sy = p < .38 ? lerp(.004, .008, q) : lerp(.008, 1, E((p - .38) / .62)), w = W * sx, h = Math.max(1.5, H * sy);
    tx.clearRect(0, 0, 240, 240); tx.drawImage(B, 0, 0); tx.globalCompositeOperation = 'source-atop'; tx.fillStyle = `rgba(255,255,255,${clamp(1 - (p - .38) / .35) * (p < .38 ? 1 : .8)})`; tx.fillRect(0, 0, 240, 240); tx.globalCompositeOperation = 'source-over';
    c.drawImage(tmp, 0, 0, W, H, (W - w) / 2, (H - h) / 2, w, h); }
  else if (kind === 'vhs') {
    const k = Math.sin(Math.PI * p), base = p < .45 ? A : B, other = p < .45 ? B : A; c.drawImage(base, 0, 0);
    for (let y = 0; y < H; y += 4) { const r = Math.sin(y * 12.9898 + p * 80) * 43758.5453, f = r - Math.floor(r); if (f < .55 * k) { const dx = Math.round((f - .27) * 70 * k); c.drawImage(f < .2 * k ? other : base, 0, y, W, 4, dx, y, W, 4); } }
    c.globalCompositeOperation = 'screen'; c.fillStyle = `rgba(60,10,110,${.32 * k})`; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    const by = ((p * 3.2) % 1) * (H + 30) - 15; c.fillStyle = `rgba(255,255,255,${.3 * k})`; c.fillRect(0, by, W, 8 + k * 8);
    for (let i = 0; i < 160 * k; i++) { c.fillStyle = Math.random() > .5 ? '#fff' : '#000'; c.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 16, 1); } }
  else if (kind === 'flash') { const q = p < .3 ? p / .3 : 1 - (p - .3) / .7; c.drawImage(p < .3 ? A : B, 0, 0); c.fillStyle = `rgba(255,255,255,${clamp(q)})`; c.fillRect(0, 0, W, H); }
  else if (kind === 'slide') { const x = Math.round(e * W); c.drawImage(A, -x, 0); c.drawImage(B, W - x, 0); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(W - x - 5, 0, 5, H); }
  else if (kind === 'blinds') { c.drawImage(A, 0, 0); const n = 8, sh = H / n, h = e * sh; for (let i = 0; i < n; i++) { const y = i * sh; c.drawImage(B, 0, y, W, h, 0, y, W, h); c.fillStyle = '#fff'; c.globalAlpha = (1 - p) * .6; c.fillRect(0, y + h - 1, W, 2); c.globalAlpha = 1; } }
  else if (kind === 'pixel') { const bs = Math.max(1, Math.round(1 + 30 * Math.sin(Math.PI * p))), base = p < .5 ? A : B, w = Math.max(1, Math.ceil(W / bs)), h = Math.max(1, Math.ceil(H / bs)); tx.clearRect(0, 0, 240, 240); tx.imageSmoothingEnabled = true; tx.drawImage(base, 0, 0, W, H, 0, 0, w, h); tx.imageSmoothingEnabled = false; c.drawImage(tmp, 0, 0, w, h, 0, 0, w * bs, h * bs); }
  else if (kind === 'dither') {
    const a = A.getContext('2d').getImageData(0, 0, W, H), b = B.getContext('2d').getImageData(0, 0, W, H), o = c.createImageData(W, H), t = p * 1.06;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, src = bay(x >> 1, y >> 1) < t ? b.data : a.data; o.data[i] = src[i]; o.data[i + 1] = src[i + 1]; o.data[i + 2] = src[i + 2]; o.data[i + 3] = 255; } c.putImageData(o, 0, 0); }
  else c.drawImage(B, 0, 0);
  c.restore();
}
G.TRANSFX = { KINDS, draw, ease: E };
})(window);
