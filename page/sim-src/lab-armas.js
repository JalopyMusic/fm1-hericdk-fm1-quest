// FM1 Quest lab — Armas: onde o boneco guarda a arma (na mão, na cintura, nas costas, flutuando atrás). Usa o mesmo esqueleto de lab-rig.js.
(function (G) {
'use strict';
const RIG = G.RIG; if (!RIG || !RIG.render) return;
const main = document.querySelector('main'); if (!main) return;
const h = document.createElement('h2'); h.innerHTML = 'ARM · Armas <span class="pill ok">onde ficam no corpo</span>'; main.append(h);
const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'O mesmo boneco em linhas com a arma na mão, na cintura, nas costas e flutuando atrás. Parado e andando; a arma muda de lugar para a mão ao atacar.'; main.append(p);
const box = document.createElement('div'); box.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:760px;margin:8px 0 28px';
main.append(box);
const MOUNTS = [['hand', 'na mão'], ['waist', 'na cintura'], ['back', 'nas costas'], ['float', 'flutuando']], COL = { mago: '#3a8ac0', arqueiro: '#7ab04e', clerigo: '#d8b43a', guerreiro: '#e08a3a', warrior: '#b83a2a' };
Object.entries(COL).forEach(([cls, col]) => MOUNTS.forEach(([m, label]) => {
  const c = document.createElement('div'); c.style.cssText = 'background:#0e0b12;border:1px solid #2e2536;border-radius:8px;padding:6px;text-align:center;font:12px system-ui,sans-serif;color:#a89aa0';
  const cv = document.createElement('canvas'); cv.width = cv.height = 96; cv.style.cssText = 'width:96px;height:96px;image-rendering:pixelated'; c.append(cv, document.createElement('br'), document.createTextNode(cls + ' · ' + label)); box.append(c);
  const x = cv.getContext('2d'); let t0 = performance.now();
  const frame = () => { const t = (performance.now() - t0) / 1000, u = (t % 1);
    x.clearRect(0, 0, 96, 96); x.drawImage(RIG.render(m === 'float' || m === 'back' ? 'idle' : 'walk', u, 96, { style: 'line', weapon: true, mount: m, mono: col, wcol: '#f2e2c4', t }), 0, 0); requestAnimationFrame(frame); };
  frame();
}));
})(window);
