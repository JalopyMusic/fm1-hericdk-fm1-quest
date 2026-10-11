// FM1 Quest lab — Títulos dos jogos e a abertura: como cada imagem fica em 240, 160 e 120 (dobrado) pixels, com o peso estimado no firmware.
(function () {
'use strict';
const main = document.querySelector('main'); if (!main) return;
const h = document.createElement('h2'); h.innerHTML = 'TIT · Títulos <span class="pill ok">FM Hero · Piano Hero · abertura</span>'; main.append(h);
const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'Cada imagem de 240×240 em três tamanhos de gravação: 240 (inteira), 160 (ampliada 1,5×) e 120 (dobrada). O peso é o de 1 bit por pixel para os títulos em preto e branco e de 2 bits (4 cores) para a abertura colorida, antes de qualquer compressão.'; main.append(p);
const IMGS = [['FM Hero', 'assets/titles/fm-hero.gif', 1], ['Piano Hero', 'assets/titles/piano-hero.gif', 1], ['Abertura (floresta)', 'assets/titles/abertura-floresta.gif', 2]];
const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;margin:8px 0 28px'; main.append(box);
IMGS.forEach(([name, src, bits]) => {
  const im = new Image(); im.onload = () => {
    const card = document.createElement('div'); card.style.cssText = 'background:#0e0b12;border:1px solid #2e2536;border-radius:10px;padding:10px;font:12px system-ui,sans-serif;color:#a89aa0'; 
    card.innerHTML = `<b style="color:#f0c860;font-size:14px">${name}</b><div class="row" style="display:flex;gap:10px;margin-top:8px"></div>`;
    [240, 160, 120].forEach(w => {
      const c = document.createElement('canvas'); c.width = w; c.height = w; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(im, 0, 0, w, w);
      const show = document.createElement('canvas'); show.width = 240; show.height = 240; const y = show.getContext('2d'); y.imageSmoothingEnabled = false; y.drawImage(c, 0, 0, 240, 240);
      const wrap = document.createElement('div'); wrap.style.textAlign = 'center'; wrap.append(show, document.createElement('br'), document.createTextNode(`${w}×${w} · ≈ ${(w * w * bits / 8 / 1024).toFixed(1)} KB`));
      card.querySelector('.row').append(wrap);
    });
    box.append(card);
  }; im.src = src;
});
})();
