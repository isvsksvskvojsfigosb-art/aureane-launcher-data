'use strict';
/* ==========================================================
   Nérys — pixel art généré par le code (aucune image requise)
   Chaque sprite peut être remplacé par assets/<clé>.png
   ========================================================== */
const OL = '#1d1530';
const ART = {};
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function outline(c, col = OL) {
  const x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), p = d.data, o = new Uint8ClampedArray(p), [r, g, b] = hexRgb(col);
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = (y * w + X) * 4; if (p[i + 3] > 40) continue;
    if ((X > 0 && p[i - 1] > 40) || (X < w - 1 && p[i + 7] > 40) || (y > 0 && p[i - w * 4 + 3] > 40) || (y < h - 1 && p[i + w * 4 + 3] > 40)) { o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; }
  }
  d.data.set(o); x.putImageData(d, 0, 0);
}
function Dr(c) {
  const x = c.getContext('2d');
  const d = {
    x,
    r(a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); },
    p(a, b, col) { x.fillStyle = col; x.fillRect(a, b, 1, 1); },
    el(cx, cy, rx, ry, col) {
      x.fillStyle = col;
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx - 1); X <= Math.ceil(cx + rx); X++) {
        const dx = (X + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) x.fillRect(X, y, 1, 1);
      }
    },
    ball(cx, cy, rx, ry, col, spec = true) {
      const C = [shd(col, .38), shd(col, .14), col, shd(col, -.22), shd(col, -.4)];
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx - 1); X <= Math.ceil(cx + rx); X++) {
        const dx = (X + .5 - cx) / rx, dy = (y + .5 - cy) / ry, q = dx * dx + dy * dy; if (q > 1) continue;
        const t = dx * .55 + dy * .8;
        x.fillStyle = t > .62 ? C[4] : t > .3 ? C[3] : t < -.62 ? C[0] : t < -.3 ? C[1] : C[2];
        if (spec && Math.abs(dx + .42) < .2 && Math.abs(dy + .5) < .18) x.fillStyle = shd(col, .7);
        x.fillRect(X, y, 1, 1);
      }
    },
    box(a, b, w, h, col) {
      d.r(a, b, w, h, col); d.r(a, b, w, 1, shd(col, .32)); d.r(a, b + 1, 1, h - 1, shd(col, .14));
      d.r(a, b + h - 1, w, 1, shd(col, -.32)); d.r(a + w - 1, b + 1, 1, h - 1, shd(col, -.2));
    },
    ln(x0, y0, x1, y1, col) {
      x.fillStyle = col; let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
      for (; ;) { x.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    },
    poly(pts, col) {
      x.fillStyle = col; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [a, b] of pts) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
      for (let y = Math.floor(y0); y <= y1; y++) for (let X = Math.floor(x0); X <= x1; X++) {
        let ins = false; const px = X + .5, py = y + .5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
        }
        if (ins) x.fillRect(X, y, 1, 1);
      }
    },
    eyeW(a, b) { d.r(a - 2, b - 1, 4, 2, '#fff'); d.r(a - 1, b - 2, 2, 4, '#fff'); },
    eye(a, b, lx = 0, ly = 1) { d.eyeW(a, b); d.r(a - 1 + (lx > 0 ? 1 : lx < 0 ? -1 : 0), b - 1 + (ly > 0 ? 1 : 0), 2, 1 + (ly > 0 ? 0 : 1), '#1d1530'); },
    rivets(a, b, w, col) { for (let i = a + 1; i < a + w - 1; i += 3) d.p(i, b, shd(col, .5)); },
  };
  return d;
}
function SP(key, w, h, fn, ol = true) { const c = cnv(w, h); fn(Dr(c), w, h); if (ol) outline(c); ART[key] = c; return c; }

/* doré : recolore en conservant la luminosité (créatures dorées) */
function goldify(src) {
  const c = cnv(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 40) continue; const l = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255;
    if (l < .13 || (p[i] > 245 && p[i + 1] > 245 && p[i + 2] > 245)) continue;
    const [r, g, b] = hexRgb(mix('#8a5a00', '#fff4a8', clamp(l * 1.15, 0, 1))); p[i] = r; p[i + 1] = g; p[i + 2] = b;
  }
  x.putImageData(d, 0, 0); return c;
}

/* ================= ICÔNES DE RESSOURCES (14×14) ================= */
function genItems() {
  const I = (k, fn) => SP('i_' + k, 14, 14, fn);
  I('fer', d => { d.poly([[2, 9], [7, 3], [11, 5], [8, 11], [3, 11]], '#9aa3c0'); d.ln(4, 9, 8, 5, '#c8cfe6'); d.ball(10, 10, 2, 2, '#7d86a3'); d.p(10, 10, '#4a5068'); });
  I('cuivre', d => { d.ball(7, 8, 5, 4, '#e08a3c'); d.ball(5, 6, 2, 2, '#ffb070'); d.p(9, 9, '#a0501a'); });
  I('cristal', d => { d.poly([[7, 1], [10, 5], [9, 12], [5, 12], [4, 5]], '#4fe3e0'); d.poly([[7, 1], [7, 12], [5, 12], [4, 5]], '#9ff6f2'); d.ln(7, 2, 7, 11, '#2aa8b0'); });
  I('bois', d => { d.box(2, 5, 10, 6, '#c98b5a'); d.el(3, 8, 2, 3, '#e8b88a'); d.p(3, 8, '#a0663a'); d.r(5, 6, 6, 1, '#a0663a'); d.r(6, 9, 5, 1, '#a0663a'); });
  I('fibre', d => { for (let k = 0; k < 4; k++) for (let y = 2; y < 12; y++) d.p(3 + k * 2 + (Math.sin(y * 1.3 + k) > 0 ? 1 : 0), y, k % 2 ? '#e3e070' : '#c9c040'); d.r(3, 7, 9, 1, '#ff6f91'); });
  I('gelee', d => { d.ball(7, 8, 5, 4.5, '#7ce86a'); d.p(5, 8, '#1d1530'); d.p(9, 8, '#1d1530'); d.r(6, 10, 3, 1, '#3a9a3a'); });
  I('glace', d => { d.box(3, 3, 8, 8, '#bfe9ff'); d.r(4, 4, 3, 1, '#ffffff'); d.r(4, 5, 1, 2, '#ffffff'); d.ln(6, 8, 9, 6, '#8ccaf0'); });
  I('soufre', d => { d.ball(5, 9, 3, 3, '#f2d230'); d.ball(9, 8, 3, 3.5, '#ffe050'); d.ball(7, 5, 2, 2, '#fff080'); });
  I('fruit', d => { d.ball(7, 8, 5, 5, '#ff6fae'); d.r(7, 1, 1, 3, '#5a3a20'); d.el(9, 3, 2, 1, '#5fd068'); });
  I('spore', d => { d.ball(5, 8, 3, 3, '#b78cff'); d.ball(9, 7, 3, 3, '#c9a0ff'); d.ball(7, 4, 2.5, 2.5, '#d8b8ff'); });
  I('graine', d => { d.ball(4, 8, 2, 2.5, '#a0d060'); d.ball(9, 6, 2, 2.5, '#b8e070'); d.ball(8, 11, 2, 1.8, '#90c050'); });
  I('bananium', d => { d.poly([[2, 4], [5, 9], [10, 10], [12, 8], [8, 7], [5, 4], [4, 2]], '#fff04a'); d.ln(4, 4, 8, 8, '#c0b020'); d.r(3, 2, 1, 2, '#5a3a20'); });
  I('poisson', d => { d.ball(6, 7, 4.5, 3, '#7fb8ff'); d.poly([[10, 7], [13, 4], [13, 10]], '#5a98e0'); d.p(4, 6, '#1d1530'); });
  I('plaque', d => { d.box(2, 3, 10, 8, '#c9cfe6'); d.p(3, 4, '#7d86a3'); d.p(10, 4, '#7d86a3'); d.p(3, 9, '#7d86a3'); d.p(10, 9, '#7d86a3'); });
  I('cable', d => { d.el(7, 7, 5, 5, '#ffa257'); d.el(7, 7, 3, 3, 'rgba(0,0,0,0)'); d.x.clearRect(5, 5, 4, 4); d.el(7, 7, 4, 4, '#d07030'); d.x.clearRect(6, 6, 2, 2); d.r(11, 9, 2, 1, '#ffd23f'); });
  I('planche', d => { d.box(1, 5, 12, 4, '#e0a46c'); d.r(3, 6, 4, 1, '#b07a4a'); d.r(8, 7, 3, 1, '#b07a4a'); });
  I('tissu', d => { d.box(2, 4, 10, 7, '#ff9ccf'); d.r(2, 7, 10, 1, '#e07aae'); d.p(4, 5, '#fff'); d.p(8, 9, '#fff'); });
  I('circuit', d => { d.box(2, 2, 10, 10, '#2f9a4a'); d.box(5, 5, 4, 4, '#1d1530'); for (let i = 3; i < 12; i += 2) { d.p(i, 2, '#ffd23f'); d.p(i, 11, '#ffd23f'); } d.ln(3, 4, 5, 6, '#9bff9b'); });
  I('engrais', d => { d.poly([[3, 4], [11, 4], [12, 12], [2, 12]], '#9a7a4a'); d.r(4, 3, 6, 2, '#c9a06a'); d.ball(7, 8, 1.5, 1.5, '#5fd068'); });
  I('pousse', d => { d.box(4, 8, 6, 5, '#c0603a'); d.r(7, 3, 1, 6, '#3a9a3a'); d.el(5, 4, 2, 1.2, '#5fd068'); d.el(9, 3, 2, 1.2, '#5fd068'); });
  I('verre', d => { d.box(3, 2, 8, 10, '#a8f0ff'); d.ln(4, 6, 7, 3, '#ffffff'); d.ln(5, 9, 9, 5, '#ffffff'); });
  I('batterie', d => { d.box(3, 3, 8, 10, '#ffe066'); d.r(5, 1, 4, 2, '#7d86a3'); d.r(4, 7, 6, 1, '#1d1530'); d.p(7, 5, '#1d1530'); d.p(6, 9, '#c0a020'); });
  I('moteur', d => { d.box(2, 4, 10, 8, '#8fa0ff'); d.ball(7, 8, 3, 3, '#c9cfe6'); d.p(7, 8, '#1d1530'); d.r(4, 2, 2, 2, '#7d86a3'); d.r(8, 2, 2, 2, '#7d86a3'); });
  I('puce', d => { d.box(2, 2, 10, 10, '#a02a90'); d.box(4, 4, 6, 6, '#ff5ad9'); d.p(6, 6, '#ffffff'); for (let i = 3; i < 12; i += 2) { d.p(1, i, '#ffd23f'); d.p(12, i, '#ffd23f'); } });
  I('smoothie', d => { d.poly([[3, 4], [11, 4], [10, 12], [4, 12]], '#9cff7a'); d.r(3, 4, 8, 1, '#ffffff'); d.ln(9, 1, 8, 6, '#ff6f91'); d.p(5, 8, '#5fd068'); });
  I('pizza', d => { d.poly([[2, 3], [12, 3], [7, 12]], '#ffcf6a'); d.r(2, 2, 11, 2, '#c97a3a'); d.p(6, 5, '#e0402a'); d.p(9, 5, '#e0402a'); d.p(7, 8, '#b78cff'); });
  I('sushi', d => { d.box(2, 6, 10, 6, '#ffffff'); d.box(3, 3, 8, 4, '#ff8a6a'); d.r(2, 8, 10, 1, '#1d4a2a'); d.r(4, 4, 3, 1, '#ffb090'); });
  I('soupe', d => { d.el(7, 9, 5, 3, '#c97a3a'); d.r(3, 7, 9, 2, '#ffcf8a'); d.ln(5, 2, 5, 5, '#ffffff'); d.ln(8, 1, 9, 5, '#ffffff'); });
  // outils : tête de la couleur du matériau
  const PK = (k, c) => I(k, d => { d.ln(3, 12, 10, 5, '#8a5a34'); d.ln(4, 12, 11, 5, '#c98b5a'); d.poly([[3, 4], [7, 1], [12, 2], [13, 6], [11, 4], [7, 3], [4, 6]], c); d.p(7, 2, shd(c, .5)); });
  const AX = (k, c) => I(k, d => { d.ln(3, 12, 10, 3, '#8a5a34'); d.ln(4, 12, 11, 3, '#c98b5a'); d.poly([[8, 2], [12, 1], [13, 6], [10, 7], [8, 5]], c); d.p(11, 2, shd(c, .5)); });
  PK('pioche_bois', '#c98b5a'); AX('hache_bois', '#c98b5a');
  I('baton', d => { d.ln(3, 11, 11, 3, '#8a5a34'); d.ln(4, 11, 12, 3, '#c98b5a'); d.p(7, 6, '#5fd068'); d.p(8, 6, '#5fd068'); });
  PK('pioche', '#9aa3c0'); PK('pioche_cu', '#e08a3c'); PK('pioche_cr', '#4fe3e0'); PK('pioche_ba', '#fff04a');
  AX('hache', '#9aa3c0'); AX('hache_cu', '#e08a3c'); AX('hache_cr', '#4fe3e0');
  I('canne', d => { d.ln(2, 12, 11, 2, '#c98b5a'); d.ln(11, 2, 12, 9, '#e8e8f0'); d.ball(12, 10, 1.5, 1.5, '#ff4d6d'); d.r(3, 10, 2, 2, '#4a5068'); });
}

/* ================= ICÔNES D'INTERFACE ================= */
function genUI() {
  const U = (k, fn, w = 14, h = 14) => SP('u_' + k, w, h, fn);
  U('hammer', d => { d.box(2, 2, 8, 4, '#c9cfe6'); d.r(6, 6, 2, 7, '#c98b5a'); d.r(6, 6, 1, 7, '#e0a46c'); });
  U('bag', d => { d.ball(7, 8, 5, 5, '#e0a46c'); d.r(4, 2, 6, 2, '#b07a4a'); d.r(5, 8, 4, 2, '#ffd23f'); });
  U('map', d => { d.poly([[1, 3], [5, 2], [9, 3], [13, 2], [13, 11], [9, 12], [5, 11], [1, 12]], '#f2e6c8'); d.ln(5, 2, 5, 11, '#c9b890'); d.ln(9, 3, 9, 12, '#c9b890'); d.p(7, 6, '#ff4d6d'); d.p(10, 8, '#5fd068'); d.p(3, 7, '#5ab8ff'); });
  U('gear', d => { for (let a = 0; a < 8; a++) d.r(7 + Math.round(Math.cos(a * Math.PI / 4) * 5) - 1, 7 + Math.round(Math.sin(a * Math.PI / 4) * 5) - 1, 2, 2, '#9aa3c0'); d.ball(7, 7, 4, 4, '#c9cfe6'); d.el(7, 7, 1.6, 1.6, '#4a5068'); });
  U('sci', d => { d.r(5, 1, 4, 5, '#d8f4ff'); d.poly([[5, 5], [9, 5], [12, 12], [2, 12]], '#d8f4ff'); d.poly([[4, 8], [10, 8], [12, 12], [2, 12]], '#b78cff'); d.p(6, 10, '#ffffff'); });
  U('coin', d => { d.ball(7, 7, 5, 5, '#ffd23f'); d.r(6, 4, 2, 6, '#c9a020'); });
  U('bolt', d => { d.poly([[8, 1], [3, 8], [7, 8], [5, 13], [11, 5], [7, 5]], '#ffe050'); });
  U('o', d => { d.ball(6, 7, 4, 4, '#8fd8ff'); d.ball(10, 4, 2, 2, '#bff0ff'); d.ball(11, 10, 1.5, 1.5, '#bff0ff'); });
  U('h', d => { d.r(5, 1, 4, 9, '#f0f0f8'); d.r(6, 3, 2, 7, '#ff5a3a'); d.ball(7, 10, 3, 3, '#ff5a3a'); });
  U('w', d => { d.poly([[7, 1], [11, 8], [7, 12], [3, 8]], '#4fa0e8'); d.ball(7, 8, 4, 4, '#4fa0e8'); d.p(5, 7, '#bff0ff'); });
  U('b', d => { d.poly([[2, 12], [3, 6], [8, 2], [12, 2], [11, 7], [6, 11]], '#5fd068'); d.ln(3, 11, 10, 4, '#2f8a3e'); });
  U('duck', d => { d.ball(6, 9, 5, 3.5, '#ffd23f'); d.ball(8, 5, 3, 3, '#ffd23f'); d.r(10, 5, 3, 2, '#ff8a2a'); d.p(8, 4, '#1d1530'); });
  U('heart', d => { d.ball(4.5, 5, 3, 3, '#ff4d6d'); d.ball(9.5, 5, 3, 3, '#ff4d6d'); d.poly([[1.5, 6], [12.5, 6], [7, 12.5]], '#ff4d6d'); d.p(4, 4, '#ffb0c0'); }, 14, 14);
  U('star', d => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.5 : 6; p.push([7 + Math.cos(a) * r, 7 + Math.sin(a) * r]); } d.poly(p, '#ffd23f'); });
  U('lock', d => { d.box(3, 6, 8, 7, '#ffd23f'); d.r(4, 2, 1, 4, '#9aa3c0'); d.r(9, 2, 1, 4, '#9aa3c0'); d.r(4, 2, 6, 1, '#9aa3c0'); d.r(6, 8, 2, 3, '#1d1530'); });
  U('home', d => { d.poly([[1, 7], [7, 1], [13, 7]], '#ff6f91'); d.box(3, 7, 8, 6, '#f2e6c8'); d.r(6, 9, 2, 4, '#9a6a40'); });
  U('trophy', d => { d.r(4, 2, 6, 6, '#ffd23f'); d.el(7, 6, 3, 3, '#ffd23f'); d.r(6, 9, 2, 2, '#c9a020'); d.box(4, 11, 6, 2, '#c9a020'); d.r(2, 3, 2, 3, '#ffd23f'); d.r(10, 3, 2, 3, '#ffd23f'); d.p(5, 3, '#fff7a0'); });
  U('book', d => { d.box(2, 2, 10, 11, '#5ab8ff'); d.r(3, 3, 1, 9, '#2a6ab0'); d.r(6, 5, 4, 1, '#ffffff'); d.r(6, 7, 4, 1, '#ffffff'); });
  U('shirt', d => { d.poly([[3, 2], [5, 2], [7, 4], [9, 2], [11, 2], [13, 6], [11, 7], [11, 12], [3, 12], [3, 7], [1, 6]], '#ff6f91'); });
  U('planet', d => { d.ball(7, 7, 5, 5, '#5fd068'); d.el(5, 6, 2, 1.5, '#4fa0e8'); d.el(9, 9, 1.5, 1, '#4fa0e8'); d.ln(0, 9, 13, 4, '#ffd23f'); });
  U('pick', d => { d.poly([[1, 4], [7, 1], [13, 4], [12, 5], [7, 3], [2, 5]], '#c9cfe6'); d.r(6, 3, 2, 10, '#c98b5a'); });
  U('x', d => { d.ln(3, 3, 10, 10, '#ff4d6d'); d.ln(4, 3, 11, 10, '#ff4d6d'); d.ln(10, 3, 3, 10, '#ff4d6d'); d.ln(11, 3, 4, 10, '#ff4d6d'); });
}

/* ================= OBJETS DU MONDE ================= */
const ROCKC = ['#7a6a9a', '#5a6a80', '#c08a78', '#5a6a50', '#a8b8d0', '#4c3a44'];
function genObjects() {
  ROCKC.forEach((c, b) => {
    SP('rock_' + b, 16, 14, d => { d.ball(8, 9, 6.5, 4.5, c); d.ball(6, 7, 3.5, 3, shd(c, .1)); d.p(10, 9, shd(c, -.35)); d.p(11, 10, shd(c, -.35)); if (b === 4) { d.r(4, 4, 5, 1, '#ffffff'); d.r(3, 5, 3, 1, '#ffffff'); } });
  });
  SP('stick', 16, 12, d => { d.ln(2, 10, 12, 6, '#8a5a34'); d.ln(3, 10, 13, 6, '#c98b5a'); d.ln(5, 7, 13, 9, '#8a5a34'); d.ln(5, 8, 13, 10, '#c98b5a'); d.p(9, 5, '#5fd068'); });
  SP('debris', 16, 14, d => { d.poly([[2, 11], [5, 4], [11, 3], [14, 8], [12, 12]], '#8a93b0'); d.poly([[5, 4], [11, 3], [9, 7]], '#c9cfe6'); d.r(6, 8, 5, 1, '#5a6080'); d.r(3, 10, 3, 2, '#ff6f91'); d.p(12, 9, '#ffd23f'); });
  SP('fibreplant', 16, 16, d => { const c = ['#e3e070', '#c9c040', '#f2ee90']; for (let k = 0; k < 6; k++) { let x = 3 + k * 2; for (let y = 14; y > 4 + (k % 3); y--) { d.p(x, y, c[k % 3]); if (y % 3 === 0) x += (k % 2 ? 1 : -1); } } });
  SP('bush', 16, 15, d => { d.ball(8, 9, 6.5, 5, '#3f8f6a'); d.ball(5, 7, 3, 3, '#4fa87a'); [[4, 9], [9, 6], [11, 10], [7, 11]].forEach(([x, y]) => { d.ball(x, y, 1.6, 1.6, '#ff6fae'); d.p(x - 1, y - 1, '#ffd0e4'); }); });
  SP('bush_e', 16, 15, d => { d.ball(8, 9, 6, 4.5, '#2d5a4a'); d.ball(5, 8, 2.5, 2.5, '#3a6a56'); });
  SP('mushtree', 24, 30, d => { d.box(10, 14, 5, 15, '#efe2cf'); d.r(11, 16, 1, 10, '#ffffff'); d.ball(12, 10, 11, 8, '#e0607a'); d.el(12, 15, 10, 2, '#b84060'); [[7, 7], [14, 5], [17, 10], [9, 12]].forEach(([x, y]) => d.el(x, y, 1.6, 1.3, '#ffe0ea')); });
  SP('stump', 16, 12, d => { d.box(5, 5, 7, 6, '#c98b5a'); d.el(8.5, 5, 3.5, 1.5, '#e8c39a'); d.p(8, 5, '#a0663a'); d.r(13, 8, 2, 1, '#5fd068'); });
  SP('sporepuff', 16, 14, d => { d.ball(8, 9, 5, 4.5, '#b78cff'); d.ball(5, 11, 2.5, 2, '#9a6ae0'); d.ball(11, 11, 2.5, 2, '#9a6ae0'); d.p(8, 5, '#3a2a6a'); d.p(7, 7, '#ffffff'); });
  SP('crystal', 16, 18, d => { d.poly([[3, 16], [4, 8], [6, 6], [8, 16]], '#2fc3c8'); d.poly([[6, 16], [8, 2], [11, 5], [11, 16]], '#4fe3e0'); d.poly([[8, 2], [8, 16], [6, 16]], '#9ff6f2'); d.poly([[10, 16], [12, 9], [14, 11], [13, 16]], '#2fc3c8'); d.p(9, 6, '#ffffff'); });
  SP('copper', 16, 14, d => { d.ball(8, 9, 6.5, 4.5, '#5a5a6a'); [[5, 8], [9, 7], [11, 10], [6, 11]].forEach(([x, y]) => { d.r(x, y, 2, 2, '#e08a3c'); d.p(x, y, '#ffc080'); }); });
  SP('gelpod', 16, 14, d => { d.r(7, 8, 2, 6, '#3a7a3a'); d.ball(8, 7, 5, 5, '#7ce86a'); d.ball(6, 5, 2, 2, '#c0ffb0'); d.p(7, 7, '#1d1530'); d.p(10, 7, '#1d1530'); });
  SP('reed', 16, 16, d => { for (let k = 0; k < 4; k++) { const x = 3 + k * 3, top = 3 + (k % 2) * 3; d.ln(x, 15, x + (k % 2 ? 1 : -1), top + 3, '#6aa04a'); d.r(x + (k % 2 ? 1 : -1) - 0, top, 2, 4, '#9a5a3a'); d.p(x + (k % 2 ? 1 : -1), top, '#c98b5a'); } d.el(4, 12, 2, 1, '#8fd06a'); d.el(12, 11, 2, 1, '#8fd06a'); });
  SP('iceblock', 16, 15, d => { d.box(2, 4, 12, 10, '#bfe9ff'); d.r(3, 5, 5, 1, '#ffffff'); d.r(3, 6, 1, 3, '#ffffff'); d.ln(8, 11, 12, 7, '#8ccaf0'); d.r(2, 4, 12, 2, '#e8f8ff'); });
  SP('ironore', 16, 14, d => { d.ball(8, 9, 6.5, 4.5, '#6a7a90'); [[5, 7], [10, 8], [7, 11]].forEach(([x, y]) => { d.r(x, y, 2, 2, '#c8a090'); d.p(x, y, '#f0d0c0'); }); d.r(3, 5, 4, 1, '#ffffff'); });
  SP('sulfur', 16, 16, d => { d.ball(8, 11, 6.5, 4, '#4c3a44'); d.ball(8, 9, 3.5, 3, '#f2d230'); d.ball(5, 11, 2, 2, '#ffe050'); d.ball(11, 11, 2, 2, '#ffe050'); d.r(7, 3, 2, 3, '#fff6a0'); });
  SP('bananium', 16, 16, d => { d.ball(8, 12, 6.5, 3.5, '#3f2f37'); d.poly([[3, 8], [6, 12], [12, 12], [13, 9], [9, 10], [6, 7], [5, 4]], '#fff04a'); d.ln(5, 7, 9, 11, '#c0b020'); d.p(5, 3, '#5a3a20'); });
  SP('cactus', 16, 18, d => { d.box(6, 4, 4, 13, '#5fbf6a'); d.box(2, 7, 3, 5, '#5fbf6a'); d.box(11, 5, 3, 6, '#5fbf6a'); d.el(8, 4, 2.5, 2, '#ff9ccf'); d.p(7, 8, '#ffffff'); d.p(8, 12, '#ffffff'); });
  SP('capsule', 16, 16, d => { d.box(2, 5, 12, 10, '#e8e8f0'); d.r(2, 9, 12, 2, '#ff6f91'); d.box(5, 2, 6, 4, '#9aa3c0'); d.p(4, 7, '#ffffff'); d.r(12, 6, 1, 2, '#ffd23f'); d.r(7, 12, 2, 2, '#4a5068'); });
  SP('monolith', 16, 28, d => { d.box(2, 20, 12, 7, '#7a6a9a'); d.ball(8, 14, 5, 5, '#c9b8ff'); d.ball(9, 7, 3.5, 3.5, '#c9b8ff'); d.r(12, 7, 3, 2, '#ffb84a'); d.p(9, 6, '#1d1530'); d.r(4, 22, 8, 1, '#5fffe0'); });
  SP('mono_done', 16, 28, d => { d.box(2, 20, 12, 7, '#7a6a9a'); d.ball(8, 14, 5, 5, '#ffd23f'); d.ball(9, 7, 3.5, 3.5, '#ffd23f'); d.r(12, 7, 3, 2, '#ff8a2a'); d.p(9, 6, '#1d1530'); d.r(4, 22, 8, 1, '#ffd23f'); });
  SP('meteor', 16, 14, d => { d.el(8, 11, 7, 3, '#2a2030'); d.ball(8, 8, 5, 4.5, '#6a4a5a'); d.r(6, 6, 2, 2, '#ff8a2a'); d.p(10, 9, '#ffd23f'); d.p(5, 9, '#ff4d6d'); });
  ['#ffd23f', '#ff6fae', '#8fd0ff', '#ffffff'].forEach((c, k) => SP('flower_' + k, 16, 14, d => { d.r(8, 6, 1, 7, '#3a9a3a'); d.el(6, 10, 2, 1, '#5fd068'); d.ball(8, 5, 3, 3, c); d.p(8, 5, k === 0 ? '#ff8a2a' : '#ffd23f'); }));
  SP('tree', 24, 32, d => { d.box(10, 18, 5, 13, '#a06a3a'); d.ball(12, 12, 10, 9, '#4fbf5a'); d.ball(8, 9, 5, 5, '#6fd86a'); d.ball(16, 14, 4, 4, '#3fa04a'); [[7, 13], [15, 8], [12, 16]].forEach(([x, y]) => d.ball(x, y, 1.5, 1.5, '#bff0ff')); });
  SP('wreck', 52, 40, d => {
    d.el(26, 34, 25, 5, '#2a2040');
    d.poly([[4, 30], [8, 14], [30, 8], [46, 12], [50, 28], [40, 34], [12, 34]], '#c9cfe6');
    d.poly([[8, 14], [30, 8], [46, 12], [30, 16]], '#e8ecf8'); d.poly([[30, 16], [46, 12], [50, 28], [40, 34]], '#9aa3c0');
    d.r(14, 20, 12, 2, '#ff6f91'); d.r(14, 23, 12, 1, '#ffd23f'); d.ball(37, 21, 5, 4, '#5ab8ff'); d.p(35, 19, '#ffffff');
    d.poly([[44, 14], [52, 6], [52, 16], [47, 18]], '#9aa3c0'); d.poly([[6, 26], [0, 22], [1, 32]], '#7d86a3');
    d.r(18, 27, 6, 6, '#3a3448'); d.r(19, 28, 4, 4, '#ffd23f'); d.p(20, 29, '#ffffff');
    d.ln(10, 16, 14, 30, '#7d86a3'); d.r(28, 2, 2, 7, '#7d86a3'); d.r(27, 1, 4, 2, '#ff4d6d');
  });
  SP('duck', 12, 11, d => { d.ball(5, 7, 4, 3, '#ffd23f'); d.ball(7, 4, 2.5, 2.5, '#ffd23f'); d.r(9, 4, 2, 2, '#ff8a2a'); d.p(7, 3, '#1d1530'); });
  SP('zorg', 36, 28, d => {
    d.el(18, 25, 14, 3, 'rgba(0,0,0,.25)');
    d.ball(18, 15, 13, 8, '#ff9ccf'); d.el(18, 15, 13, 2, '#e07aae'); d.box(30, 11, 5, 3, '#ff9ccf'); d.r(33, 9, 2, 3, '#ff9ccf');
    d.poly([[5, 12], [0, 6], [1, 14]], '#ff9ccf'); d.ball(18, 7, 6, 4, '#bff0ff'); d.ball(18, 8, 3, 3, '#7ce86a'); d.p(17, 7, '#1d1530'); d.p(19, 7, '#1d1530');
    d.r(17, 2, 1, 3, '#7ce86a'); d.p(17, 1, '#ffd23f'); d.r(17, 0, 2, 1, '#ffd23f'); [[8, 16], [14, 18], [22, 18], [28, 16]].forEach(([x, y]) => d.p(x, y, '#ffd23f'));
  });
  SP('drone', 10, 8, d => { d.ball(5, 5, 3, 2, '#c9cfe6'); d.r(0, 1, 4, 1, '#9aa3c0'); d.r(6, 1, 4, 1, '#9aa3c0'); d.p(5, 5, '#ff4d6d'); });
  SP('bobber', 6, 7, d => { d.r(2, 0, 1, 2, '#1d1530'); d.ball(2.5, 4, 2, 2.2, '#ff4d6d'); d.r(1, 4, 3, 1, '#ffffff'); });
}

/* ================= CONSTRUCTIONS ================= */
function genBuildings() {
  const B = (id, h, fn, w = 16) => SP('b_' + id, w, h, fn);
  const feet = (d, h, c = '#4a5068') => { d.r(3, h - 3, 3, 2, c); d.r(10, h - 3, 3, 2, c); };
  const eyes = (d, id) => (BLD[id].eyes || []).forEach(([x, y]) => d.eyeW(x, y));
  // ---- base
  B('etabli', 16, d => { d.r(2, 9, 2, 6, '#8a5a34'); d.r(12, 9, 2, 6, '#8a5a34'); d.box(1, 5, 14, 5, '#c98b5a'); d.r(1, 5, 14, 1, '#e8b88a'); d.box(10, 2, 4, 3, '#9aa3c0'); d.r(3, 3, 5, 1, '#7d86a3'); d.r(6, 2, 1, 3, '#c98b5a'); eyes(d, 'etabli'); });
  B('caisse', 16, d => { d.box(2, 3, 12, 12, '#c98b5a'); d.ln(3, 4, 12, 13, '#8a5a34'); d.ln(12, 4, 3, 13, '#8a5a34'); d.r(2, 3, 12, 2, '#e0a46c'); d.r(2, 13, 12, 2, '#a06a3a'); });
  B('jardin', 12, d => { d.box(1, 3, 14, 8, '#b07a4a'); d.r(2, 3, 12, 3, '#5a3a2a'); d.p(4, 4, '#7a5a3a'); d.p(10, 4, '#7a5a3a'); d.r(1, 7, 14, 1, '#8a5a34'); });
  B('labo', 22, d => { feet(d, 22); d.box(2, 8, 12, 12, '#e8ecf8'); d.r(3, 14, 10, 4, '#5ab8ff'); d.r(4, 15, 3, 1, '#bff0ff'); d.r(6, 2, 4, 6, '#bff0ff'); d.el(8, 6, 3, 2, '#b78cff'); d.p(7, 1, '#d8b8ff'); eyes(d, 'labo'); });
  B('fonderie', 24, d => { d.box(1, 6, 14, 17, '#c0604a'); for (let y = 8; y < 22; y += 3) d.r(2, y, 12, 1, '#94443a'); d.box(4, 15, 8, 6, '#2a1a20'); d.r(5, 16, 6, 4, '#ff8a2a'); d.r(6, 17, 4, 2, '#ffd23f'); d.box(11, 0, 3, 6, '#7d86a3'); eyes(d, 'fonderie'); });
  B('cuisine', 20, d => { d.box(1, 6, 14, 13, '#e8ecf8'); d.r(3, 12, 10, 5, '#9aa3c0'); d.r(4, 13, 8, 1, '#c9cfe6'); d.box(4, 2, 8, 4, '#ff6f91'); d.r(3, 2, 10, 1, '#c0406a'); d.ln(6, 0, 6, 1, '#ffffff'); d.ln(9, 0, 10, 1, '#ffffff'); eyes(d, 'cuisine'); });
  B('atelier', 22, d => { feet(d, 22); d.box(1, 5, 14, 15, '#7d86a3'); d.r(2, 12, 12, 1, '#ffd23f'); d.r(2, 13, 12, 1, '#1d1530'); d.ball(11, 5, 3, 3, '#c9cfe6'); d.p(11, 5, '#4a5068'); d.ln(3, 4, 7, 1, '#ff8a2a'); d.r(7, 1, 2, 2, '#ff8a2a'); eyes(d, 'atelier'); });
  const drill = (id, c, h) => B(id, h, d => { d.ln(2, h - 2, 6, 3, '#4a5068'); d.ln(14, h - 2, 10, 3, '#4a5068'); d.box(4, 4, 8, 10, c); d.r(5, 5, 6, 1, shd(c, .4)); d.poly([[6, 14], [10, 14], [8, h - 1]], '#c9cfe6'); d.ln(7, 15, 9, 17, '#7d86a3'); d.r(6, 1, 4, 3, '#4a5068'); eyes(d, id); });
  drill('foreuse', '#ffb040', 24); drill('foreuse2', '#e8483a', 26);
  B('niche', 18, d => { d.box(2, 8, 12, 9, '#e0a46c'); d.poly([[1, 9], [8, 2], [15, 9]], '#ff6f91'); d.r(1, 8, 14, 1, '#c0406a'); d.el(8, 13, 2.5, 3.5, '#2a1a20'); d.r(5, 16, 6, 1, '#2a1a20'); });
  B('ruche', 24, d => { d.box(2, 8, 12, 14, '#ffd23f'); for (let y = 10; y < 21; y += 3) d.r(2, y, 12, 1, '#c9a020'); d.el(8, 7, 6, 3, '#ffe066'); d.r(6, 16, 4, 3, '#2a1a20'); d.r(7, 1, 2, 5, '#9aa3c0'); d.p(7, 0, '#ff4d6d'); eyes(d, 'ruche'); });
  B('silo', 30, d => { d.box(2, 6, 12, 23, '#c9cfe6'); d.el(8, 6, 6, 3, '#e8ecf8'); for (let y = 10; y < 28; y += 4) d.r(3, y, 10, 1, '#9aa3c0'); d.r(5, 12, 2, 12, '#ff6f91'); d.ln(12, 4, 12, 28, '#7d86a3'); });
  B('radar', 26, d => { d.r(7, 12, 2, 12, '#7d86a3'); d.box(4, 22, 8, 3, '#4a5068'); d.el(8, 8, 7, 5, '#e8ecf8'); d.el(8, 8, 5, 3, '#c9cfe6'); d.ln(8, 8, 12, 2, '#4a5068'); d.p(12, 2, '#ff4d6d'); });
  B('tp', 12, d => { d.el(8, 7, 7, 4, '#4a5068'); d.el(8, 6, 6, 3, '#b78cff'); d.el(8, 6, 4, 2, '#e0d0ff'); d.p(8, 6, '#ffffff'); });
  B('piste', 12, d => { d.box(0, 2, 16, 9, '#5a5470'); d.r(1, 3, 14, 1, '#ffd23f'); d.r(1, 9, 14, 1, '#ffd23f'); d.r(5, 4, 1, 5, '#ffffff'); d.r(10, 4, 1, 5, '#ffffff'); d.r(5, 6, 6, 1, '#ffffff'); });
  B('superlabo', 26, d => { feet(d, 26); d.box(1, 9, 14, 15, '#e8ecf8'); d.r(2, 15, 12, 6, '#b78cff'); d.r(3, 16, 4, 1, '#e0d0ff'); d.ball(8, 6, 4, 4, '#bff0ff'); d.el(8, 7, 3, 2, '#7ce86a'); d.r(13, 0, 1, 9, '#7d86a3'); d.p(13, 0, '#ff4d6d'); eyes(d, 'superlabo'); });
  B('fusee', 44, d => { d.poly([[8, 0], [13, 10], [13, 34], [3, 34], [3, 10]], '#e8ecf8'); d.poly([[8, 0], [13, 10], [3, 10]], '#ff4d6d'); d.ball(8, 17, 3, 3, '#5ab8ff'); d.p(7, 16, '#ffffff'); d.poly([[3, 26], [0, 38], [3, 36]], '#ff4d6d'); d.poly([[13, 26], [16, 38], [13, 36]], '#ff4d6d'); d.r(5, 34, 6, 3, '#4a5068'); d.r(3, 24, 10, 2, '#ffd23f'); d.r(5, 37, 6, 6, '#ff8a2a'); d.r(6, 38, 4, 3, '#ffd23f'); }, 17);
  // ---- énergie
  B('solaire', 14, d => { d.r(7, 9, 2, 4, '#7d86a3'); d.poly([[0, 8], [3, 1], [16, 1], [13, 8]], '#2a4a9a'); for (let x = 3; x < 15; x += 3) d.ln(x, 2, x - 2, 7, '#5ab8ff'); d.r(1, 4, 14, 1, '#5ab8ff'); d.p(4, 2, '#ffffff'); });
  B('eolienne', 30, d => { d.poly([[7, 8], [9, 8], [10, 29], [6, 29]], '#e8ecf8'); d.r(6, 28, 4, 2, '#9aa3c0'); d.ball(8, 7, 2, 2, '#c9cfe6'); });
  B('roue', 20, d => { d.el(8, 10, 7.5, 8.5, '#c98b5a'); d.el(8, 10, 6, 7, '#5a3a2a'); d.r(3, 18, 10, 2, '#8a5a34'); });
  B('generateur', 20, d => { feet(d, 20); d.box(1, 6, 14, 12, '#ffd23f'); d.r(2, 12, 12, 1, '#1d1530'); for (let x = 3; x < 13; x += 3) d.r(x, 13, 2, 3, '#c9a020'); d.box(11, 1, 3, 5, '#7d86a3'); eyes(d, 'generateur'); });
  B('geo', 22, d => { d.el(8, 19, 7, 3, '#ff6a2a'); d.box(2, 8, 12, 11, '#7d86a3'); d.box(4, 2, 3, 7, '#c9cfe6'); d.box(9, 4, 3, 5, '#c9cfe6'); d.r(3, 12, 10, 2, '#ff8a2a'); });
  B('reacteur', 26, d => { d.box(1, 16, 14, 9, '#4a5068'); d.ball(8, 12, 7, 7, '#bff0ff'); d.ball(8, 13, 4, 4, '#fff04a'); d.poly([[5, 12], [7, 15], [11, 15], [11, 13], [9, 14], [7, 11]], '#ffe070'); eyes(d, 'reacteur'); });
  // ---- terraformation
  B('souffleur', 18, d => { d.box(3, 9, 10, 8, '#ff6fae'); d.r(3, 9, 10, 1, '#ffb0d0'); d.box(6, 4, 4, 5, '#c9cfe6'); d.ball(4, 3, 2, 2, '#bff0ff'); d.ball(11, 2, 1.5, 1.5, '#bff0ff'); eyes(d, 'souffleur'); });
  B('radiateur', 18, d => { feet(d, 18); for (let x = 2; x < 14; x += 3) d.box(x, 4, 3, 11, '#ff5a3a'); d.r(2, 9, 12, 1, '#c03a2a'); eyes(d, 'radiateur'); });
  B('fonte', 20, d => { feet(d, 20); d.box(2, 7, 12, 11, '#5ab8ff'); d.box(4, 1, 8, 6, '#bff0ff'); d.r(5, 2, 3, 1, '#ffffff'); d.r(3, 14, 10, 2, '#2a6ab0'); eyes(d, 'fonte'); });
  B('semeur', 20, d => { d.poly([[2, 18], [8, 2], [14, 18]], '#9a6ae0'); d.r(2, 17, 12, 2, '#6a3ab0'); d.p(8, 5, '#d8b8ff'); d.p(6, 13, '#2a1a40'); d.p(10, 13, '#2a1a40'); eyes(d, 'semeur'); });
  B('pompe', 22, d => { feet(d, 22); d.box(3, 5, 10, 15, '#4fd0e0'); d.r(4, 6, 2, 12, '#bff6ff'); d.box(1, 2, 14, 4, '#7d86a3'); d.r(7, 0, 2, 2, '#c9cfe6'); eyes(d, 'pompe'); });
  B('grillepain', 22, d => { d.box(1, 7, 14, 14, '#c9cfe6'); d.r(3, 8, 4, 1, '#1d1530'); d.r(9, 8, 4, 1, '#1d1530'); d.box(3, 3, 4, 5, '#e0a050'); d.box(9, 1, 4, 7, '#e0a050'); d.r(14, 13, 2, 2, '#ff4d6d'); eyes(d, 'grillepain'); });
  B('nuage', 22, d => { feet(d, 22); d.box(3, 12, 10, 8, '#5a98e0'); d.r(7, 9, 2, 3, '#7d86a3'); d.ball(5, 6, 3.5, 3, '#ffffff'); d.ball(10, 5, 4, 3.5, '#ffffff'); d.ball(8, 7, 3, 2.5, '#e8f4ff'); eyes(d, 'nuage'); });
  B('lichen', 22, d => { d.box(1, 5, 14, 16, '#bff0ff'); d.r(2, 12, 12, 8, '#5fbf6a'); d.ball(5, 12, 2, 2, '#8fe07a'); d.ball(10, 11, 2.5, 2.5, '#8fe07a'); d.r(1, 4, 14, 2, '#7d86a3'); d.r(3, 7, 1, 4, '#ffffff'); eyes(d, 'lichen'); });
  B('poumon', 28, d => { d.box(2, 22, 12, 5, '#7d86a3'); d.r(7, 16, 2, 6, '#c9cfe6'); d.ball(5, 10, 4.5, 7, '#ff8ab0'); d.ball(11, 10, 4.5, 7, '#ff8ab0'); d.ln(8, 4, 8, 15, '#c0406a'); eyes(d, 'poumon'); });
  B('soleil', 26, d => { d.box(4, 19, 8, 6, '#7d86a3'); d.r(7, 14, 2, 5, '#c9cfe6'); for (let a = 0; a < 8; a++) d.ln(8, 8, 8 + Math.round(Math.cos(a * .785) * 7), 8 + Math.round(Math.sin(a * .785) * 7), '#ffb040'); d.ball(8, 8, 5, 5, '#ffe050'); eyes(d, 'soleil'); });
  B('pluie', 28, d => { d.box(3, 20, 10, 7, '#5a98e0'); d.ball(5, 7, 4, 3.5, '#c9d8ff'); d.ball(11, 6, 4.5, 4, '#c9d8ff'); d.ball(8, 9, 4, 3, '#a8bce8'); for (let x = 3; x < 14; x += 3) d.r(x, 13 + (x % 2) * 2, 1, 3, '#5ab8ff'); eyes(d, 'pluie'); });
  B('coeur', 28, d => { d.box(3, 22, 10, 5, '#a06a3a'); d.r(7, 16, 2, 6, '#3a9a3a'); d.ball(5, 10, 4, 4, '#5fd068'); d.ball(11, 10, 4, 4, '#5fd068'); d.poly([[1, 11], [15, 11], [8, 19]], '#5fd068'); d.ball(5, 9, 1.5, 1.5, '#ff6fae'); eyes(d, 'coeur'); });
  B('megao', 34, d => { d.box(6, 20, 4, 13, '#8a5a34'); d.ball(8, 12, 7.5, 10, '#7de0e0'); d.ball(6, 8, 3, 4, '#bff6ff'); [[4, 14], [11, 6], [10, 16]].forEach(([x, y]) => d.ball(x, y, 1.5, 1.5, '#ffffff')); eyes(d, 'megao'); });
  B('megah', 30, d => { d.box(2, 24, 12, 5, '#4a5068'); d.ball(8, 13, 7, 9, '#ff6a2a'); d.ball(7, 11, 4, 5, '#ffb040'); d.ln(1, 4, 1, 24, '#7d86a3'); d.ln(14, 4, 14, 24, '#7d86a3'); d.r(1, 4, 14, 1, '#7d86a3'); eyes(d, 'megah'); });
  B('megaw', 30, d => { d.box(4, 24, 8, 5, '#4a5068'); d.r(7, 18, 2, 6, '#7d86a3'); d.poly([[2, 6], [12, 2], [14, 8], [6, 14]], '#bff0ff'); d.ball(8, 12, 5, 5, '#5ab8ff'); d.ball(7, 11, 2, 2, '#bff6ff'); eyes(d, 'megaw'); });
  B('megab', 32, d => { d.box(5, 16, 6, 15, '#efe2cf'); d.ball(8, 11, 7.5, 9, '#b78cff'); d.el(8, 18, 7, 2, '#7a4ac0'); [[5, 6], [11, 8], [7, 13]].forEach(([x, y]) => d.ball(x, y, 1.6, 1.4, '#f0e0ff')); eyes(d, 'megab'); });
  B('arbre0', 16, d => { d.r(7, 8, 2, 7, '#8a5a34'); d.ball(5, 7, 3, 2.5, '#6fd86a'); d.ball(11, 6, 3, 2.5, '#5fd068'); d.ball(8, 4, 2.5, 2.5, '#8fe87a'); });
  B('arbre', 30, d => { d.box(6, 17, 4, 12, '#a06a3a'); d.ball(8, 11, 7.5, 9, '#4fbf5a'); d.ball(5, 8, 4, 4, '#6fd86a'); d.ball(11, 13, 3, 3, '#3fa04a'); d.ball(9, 6, 1.5, 1.5, '#ff6fae'); d.ball(4, 13, 1.5, 1.5, '#ffd23f'); });
  // ---- déco
  const D2 = (id, h, fn) => B(id, h, fn);
  D2('pot', 16, d => { d.box(4, 9, 8, 6, '#c0603a'); d.r(3, 9, 10, 2, '#d8784a'); d.ball(5, 6, 3, 2.5, '#5fd068'); d.ball(11, 5, 3, 2.5, '#4fbf5a'); d.ball(8, 3, 2.5, 2.5, '#6fd86a'); });
  D2('chaise', 16, d => { d.box(4, 2, 8, 7, '#c98b5a'); d.box(3, 9, 10, 3, '#e0a46c'); d.r(4, 12, 2, 3, '#8a5a34'); d.r(10, 12, 2, 3, '#8a5a34'); });
  D2('table', 14, d => { d.box(1, 3, 14, 5, '#e0a46c'); d.r(1, 3, 14, 1, '#f2c08a'); d.r(2, 8, 2, 5, '#8a5a34'); d.r(12, 8, 2, 5, '#8a5a34'); d.ball(8, 2, 2, 1.5, '#ff6fae'); });
  D2('lampe', 16, d => { d.box(6, 11, 4, 4, '#9aa3c0'); d.r(7, 7, 2, 4, '#7d86a3'); d.poly([[3, 7], [5, 1], [11, 1], [13, 7]], '#ffe070'); d.r(5, 2, 6, 1, '#fff6c0'); });
  D2('pancarte', 18, d => { d.r(7, 9, 2, 8, '#8a5a34'); d.box(1, 2, 14, 8, '#e0a46c'); d.r(3, 4, 4, 1, '#5a3a2a'); d.r(8, 4, 5, 1, '#5a3a2a'); d.r(4, 6, 8, 1, '#5a3a2a'); d.p(13, 7, '#ff4d6d'); });
  D2('nain', 18, d => { d.ball(8, 13, 4.5, 4, '#5ab8ff'); d.ball(8, 8, 3.5, 3, '#7ce86a'); d.poly([[4, 7], [8, 0], [12, 7]], '#ff4d6d'); d.r(5, 9, 6, 3, '#ffffff'); d.p(7, 8, '#1d1530'); d.p(9, 8, '#1d1530'); d.r(4, 16, 3, 1, '#4a3020'); d.r(9, 16, 3, 1, '#4a3020'); });
  D2('chaussettes', 10, d => { d.poly([[2, 4], [6, 4], [7, 8], [11, 8], [11, 9], [3, 9]], '#ff9ccf'); d.poly([[8, 2], [12, 2], [13, 6], [15, 7], [14, 9], [9, 7]], '#7de0b0'); d.r(2, 4, 4, 1, '#ffffff'); d.r(8, 2, 4, 1, '#ffffff'); });
  D2('flamant', 22, d => { d.r(8, 13, 1, 8, '#ff6fae'); d.ln(8, 17, 10, 19, '#ff6fae'); d.ball(8, 11, 5, 3.5, '#ff8ac0'); d.ln(5, 9, 4, 3, '#ff8ac0'); d.ln(4, 9, 3, 3, '#ff8ac0'); d.ball(4, 2.5, 2, 2, '#ff8ac0'); d.r(1, 3, 2, 1, '#1d1530'); d.p(4, 2, '#1d1530'); });
  D2('drapeau', 24, d => { d.r(3, 1, 1, 22, '#c9cfe6'); d.r(2, 21, 3, 2, '#7d86a3'); d.box(4, 2, 10, 7, '#5ab8ff'); d.r(4, 5, 10, 1, '#ff6f91'); d.ball(7, 4, 1.5, 1.5, '#ffd23f'); });
  D2('canape', 14, d => { d.box(0, 2, 16, 7, '#ff8ac0'); d.box(0, 7, 16, 5, '#ff9ccf'); d.box(0, 4, 3, 8, '#e07aae'); d.box(13, 4, 3, 8, '#e07aae'); d.r(7, 8, 1, 3, '#e07aae'); });
  D2('lit', 16, d => { d.box(1, 1, 14, 4, '#c98b5a'); d.box(1, 4, 14, 10, '#ffffff'); d.box(1, 8, 14, 6, '#5ab8ff'); d.r(1, 8, 14, 1, '#8ccaf4'); d.box(3, 5, 5, 3, '#f2f0f8'); d.r(1, 13, 2, 2, '#8a5a34'); d.r(13, 13, 2, 2, '#8a5a34'); });
  D2('tele', 16, d => { d.box(1, 3, 14, 10, '#c98b5a'); d.box(2, 4, 10, 8, '#2a3a5a'); d.r(3, 5, 3, 1, '#8fd0ff'); d.ball(13.5, 6, 1, 1, '#ffd23f'); d.p(13, 9, '#ff4d6d'); d.ln(5, 0, 7, 3, '#9aa3c0'); d.ln(11, 0, 9, 3, '#9aa3c0'); d.r(3, 13, 2, 2, '#5a3a2a'); d.r(11, 13, 2, 2, '#5a3a2a'); });
  D2('lavalampe', 18, d => { d.poly([[5, 3], [11, 3], [12, 13], [4, 13]], '#ff6fae'); d.ball(8, 6, 2, 2, '#ffd23f'); d.ball(7, 11, 2, 1.5, '#ffd23f'); d.box(4, 13, 8, 4, '#9aa3c0'); d.box(6, 1, 4, 2, '#9aa3c0'); });
  D2('frigo', 24, d => { d.box(2, 1, 12, 22, '#e8ecf8'); d.r(2, 8, 12, 1, '#9aa3c0'); d.r(11, 3, 1, 4, '#9aa3c0'); d.r(11, 10, 1, 6, '#9aa3c0'); d.eye(5, 4, 0, 1); d.eye(8, 4, 0, 1); d.ball(6, 14, 1.5, 1.5, '#ff6f91'); d.r(4, 18, 4, 2, '#ffd23f'); });
  D2('aquarium', 16, d => { d.box(1, 3, 14, 10, '#5ab8ff'); d.r(2, 4, 12, 2, '#bff0ff'); d.ball(5, 9, 2, 1.2, '#ff8a2a'); d.ball(10, 7, 1.5, 1, '#ffd23f'); d.r(9, 10, 1, 2, '#5fd068'); d.r(1, 12, 14, 3, '#4a5068'); });
  D2('arcade', 24, d => { d.box(2, 1, 12, 22, '#9a6aff'); d.box(3, 4, 10, 7, '#1d1530'); d.r(4, 5, 2, 2, '#7ce86a'); d.r(8, 7, 3, 2, '#ff4d6d'); d.r(2, 12, 12, 3, '#6a3ab0'); d.ball(5, 13, 1, 1, '#ff4d6d'); d.p(9, 13, '#ffd23f'); d.p(11, 13, '#5ab8ff'); d.r(3, 1, 10, 2, '#ffd23f'); });
  D2('trampoline', 10, d => { d.el(8, 4, 7.5, 3, '#4a5068'); d.el(8, 4, 6, 2, '#2a3a5a'); d.r(1, 5, 2, 4, '#9aa3c0'); d.r(13, 5, 2, 4, '#9aa3c0'); d.r(7, 6, 2, 3, '#9aa3c0'); });
  D2('barbecue', 18, d => { d.el(8, 7, 6, 3, '#2a2030'); d.box(2, 6, 12, 4, '#4a5068'); d.ln(4, 10, 2, 16, '#7d86a3'); d.ln(12, 10, 14, 16, '#7d86a3'); d.r(4, 5, 3, 1, '#c97a3a'); d.r(9, 5, 3, 1, '#ff6f91'); d.ln(6, 0, 6, 3, '#c9cfe6'); });
  D2('lampadaire', 30, d => { d.r(7, 6, 2, 22, '#4a5068'); d.box(5, 27, 6, 2, '#4a5068'); d.box(4, 1, 8, 6, '#ffe070'); d.r(4, 1, 8, 1, '#4a5068'); d.r(5, 2, 2, 3, '#fff6c0'); });
  D2('bonhomme', 22, d => { d.ball(8, 16, 6, 5, '#ffffff'); d.ball(8, 8, 4.5, 4, '#ffffff'); d.r(5, 1, 6, 4, '#1d1530'); d.r(4, 4, 8, 1, '#1d1530'); d.p(7, 7, '#1d1530'); d.p(10, 7, '#1d1530'); d.r(9, 9, 3, 1, '#ff8a2a'); d.r(4, 12, 8, 1, '#ff4d6d'); });
  D2('disco', 26, d => { d.r(8, 0, 1, 8, '#9aa3c0'); d.ball(8, 14, 7, 7, '#c9cfe6'); for (let y = 8; y < 21; y += 2) for (let x = 2; x < 15; x += 2) if ((x + y) % 4 === 0) d.p(x, y, '#ffffff'); d.p(5, 10, '#ff6fae'); d.p(11, 15, '#5ab8ff'); d.p(7, 18, '#ffd23f'); });
  D2('fontaine', 20, d => { d.el(8, 15, 7.5, 4, '#9aa3c0'); d.el(8, 14, 6, 2.5, '#5ab8ff'); d.r(7, 5, 2, 9, '#c9cfe6'); d.el(8, 5, 4, 1.5, '#9aa3c0'); d.ln(4, 6, 2, 12, '#bff0ff'); d.ln(12, 6, 14, 12, '#bff0ff'); d.r(7, 0, 2, 4, '#bff0ff'); });
  D2('statue', 26, d => { d.box(2, 18, 12, 7, '#9aa3c0'); d.ball(8, 12, 5.5, 4.5, '#ffd23f'); d.ball(10, 5, 3.5, 3.5, '#ffd23f'); d.r(13, 5, 3, 2, '#ff8a2a'); d.p(10, 4, '#1d1530'); d.r(4, 20, 8, 1, '#ffffff'); });
  D2('toilettes', 20, d => { d.box(3, 1, 10, 7, '#ffd23f'); d.el(8, 12, 6, 4, '#ffd23f'); d.el(8, 11, 4, 2.5, '#fff6c0'); d.el(8, 11, 2.5, 1.5, '#5ab8ff'); d.box(5, 15, 6, 4, '#ffd23f'); d.r(11, 3, 2, 1, '#ffffff'); });
  D2('piano', 20, d => { d.box(1, 2, 14, 16, '#2a2440'); d.r(2, 9, 12, 3, '#ffffff'); for (let x = 3; x < 14; x += 2) d.p(x, 9, '#1d1530'); d.r(3, 4, 4, 1, '#5a5470'); d.r(2, 17, 2, 2, '#1d1530'); d.r(12, 17, 2, 2, '#1d1530'); });
  D2('jukebox', 24, d => { d.box(1, 6, 14, 17, '#ff6f91'); d.ball(8, 6, 7, 5, '#ff6f91'); d.ball(8, 7, 5, 3.5, '#ffd23f'); d.r(3, 13, 10, 4, '#2a2440'); for (let x = 4; x < 13; x += 2) d.p(x, 15, '#7ce86a'); d.r(3, 19, 10, 2, '#c0406a'); });
  D2('dino', 16, d => { d.ball(8, 9, 7, 5, '#f2ecd8'); d.r(2, 11, 12, 3, '#f2ecd8'); for (let x = 3; x < 14; x += 2) d.r(x, 12, 1, 2, '#ffffff'); d.ball(6, 7, 1.8, 1.8, '#1d1530'); d.ball(11, 7, 1.3, 1.3, '#1d1530'); d.r(9, 3, 3, 1, '#c9c0a8'); });
  D2('baignoire', 14, d => { d.box(1, 4, 14, 8, '#ffffff'); d.r(2, 4, 12, 3, '#bff0ff'); d.ball(4, 3, 2, 2, '#ffffff'); d.ball(8, 2, 2.5, 2.5, '#ffffff'); d.ball(12, 3, 2, 2, '#ffffff'); d.r(2, 12, 2, 2, '#ffd23f'); d.r(12, 12, 2, 2, '#ffd23f'); });
  D2('carnivore', 22, d => { d.box(4, 16, 8, 5, '#c0603a'); d.r(7, 9, 2, 7, '#3a9a3a'); d.el(5, 14, 2, 1, '#5fd068'); d.ball(8, 6, 6, 5, '#e0402a'); d.r(3, 6, 10, 1, '#1d1530'); for (let x = 4; x < 13; x += 2) { d.p(x, 5, '#ffffff'); d.p(x + 1, 7, '#ffffff'); } d.p(6, 3, '#ffd23f'); d.p(10, 3, '#ffd23f'); });
  D2('neon', 18, d => { d.box(0, 2, 16, 12, '#2a2440'); d.r(2, 5, 3, 1, '#ff6fae'); d.r(2, 5, 1, 5, '#ff6fae'); d.r(2, 9, 3, 1, '#ff6fae'); d.r(4, 7, 1, 3, '#ff6fae'); d.r(6, 5, 3, 5, '#5affe0'); d.r(7, 6, 1, 3, '#2a2440'); d.r(10, 5, 3, 5, '#ffd23f'); d.r(11, 6, 1, 3, '#2a2440'); d.r(14, 5, 1, 5, '#ff6fae'); d.r(7, 14, 2, 3, '#4a5068'); });
  D2('statuezorg', 26, d => { d.box(2, 19, 12, 6, '#9aa3c0'); d.ball(8, 12, 5, 6, '#7ce86a'); d.ball(8, 6, 4, 3.5, '#7ce86a'); d.p(6, 6, '#1d1530'); d.p(10, 6, '#1d1530'); d.r(7, 0, 1, 3, '#7ce86a'); d.p(7, 0, '#ffd23f'); d.r(6, 9, 4, 1, '#1d1530'); });
  D2('nainor', 18, d => { d.ball(8, 13, 4.5, 4, '#ffd23f'); d.ball(8, 8, 3.5, 3, '#ffe070'); d.poly([[4, 7], [8, 0], [12, 7]], '#ffcc33'); d.r(5, 9, 6, 3, '#fff6c0'); d.p(7, 8, '#1d1530'); d.p(9, 8, '#1d1530'); d.p(5, 2, '#ffffff'); });
  D2('chaisebanane', 16, d => { d.poly([[1, 4], [4, 12], [12, 13], [15, 10], [8, 10], [4, 3]], '#fff04a'); d.ln(4, 5, 8, 11, '#c0b020'); d.r(4, 13, 2, 2, '#8a5a34'); d.r(11, 13, 2, 2, '#8a5a34'); });
  D2('licorne', 22, d => { d.ball(8, 15, 6.5, 4.5, '#ffffff'); d.ball(4, 8, 3.5, 3.5, '#ffffff'); d.poly([[3, 5], [5, 5], [3, 0]], '#ffd23f'); d.r(6, 5, 2, 7, '#ff6fae'); d.r(8, 7, 1, 6, '#5ab8ff'); d.p(3, 8, '#1d1530'); d.el(8, 19, 7, 1.5, '#ff8ac0'); });
  D2('fuseejouet', 22, d => { d.poly([[8, 0], [12, 6], [12, 17], [4, 17], [4, 6]], '#ff4d6d'); d.ball(8, 9, 2, 2, '#bff0ff'); d.poly([[4, 13], [1, 20], [4, 18]], '#ffd23f'); d.poly([[12, 13], [15, 20], [12, 18]], '#ffd23f'); d.r(6, 17, 4, 2, '#4a5068'); d.r(4, 12, 8, 1, '#ffffff'); });
  // cultures (jardinière)
  SP('crop_0', 16, 12, d => { d.r(5, 7, 1, 3, '#5fd068'); d.r(10, 6, 1, 4, '#5fd068'); d.p(4, 6, '#8fe87a'); d.p(11, 5, '#8fe87a'); });
  SP('crop_1', 16, 14, d => { for (const x of [4, 8, 12]) { d.r(x, 5, 1, 8, '#3a9a3a'); d.el(x - 1, 6, 2, 1, '#5fd068'); d.el(x + 1, 8, 2, 1, '#5fd068'); } });
  const ripe = { fruit: '#ff6fae', fibre: '#e3e070', bois: '#c98b5a', spore: '#b78cff', gelee: '#7ce86a', glace: '#bfe9ff' };
  for (const k in ripe) SP('crop_' + k, 16, 16, d => { for (const x of [4, 8, 12]) { d.r(x, 6, 1, 9, '#3a9a3a'); d.el(x - 1, 9, 2, 1, '#5fd068'); d.ball(x + .5, 5, 2.2, 2.2, ripe[k]); } });
}

/* ================= CRÉATURES (16×16, 4 frames) ================= */
function genMobs() {
  const M = (sp, fn) => { for (let f = 0; f < 4; f++) { const c = SP('m_' + sp + '_' + f, 18, 18, d => fn(d, f)); ART['m_' + sp + '_' + f + 'g'] = goldify(c); } };
  M('blobo', (d, f) => { const sq = [0, 1, 0, -1][f]; d.ball(9, 12 - (f === 3 ? 2 : 0) + sq * .5, 6.5 + sq, 5 - sq, '#7ce86a'); d.eye(7, 10 - (f === 3 ? 2 : 0) + sq, 0, 1); d.eye(11, 10 - (f === 3 ? 2 : 0) + sq, 0, 1); });
  M('champi', (d, f) => { const l = f % 2; d.r(5, 14 - l, 2, 3, '#c97a6a'); d.r(11, 14 - (1 - l), 2, 3, '#c97a6a'); d.ball(9, 12, 6, 3.5, '#f0c0b0'); d.ball(9, 7, 7, 4.5, '#e0607a'); d.el(6, 6, 1.4, 1, '#ffe0ea'); d.el(11, 5, 1.4, 1, '#ffe0ea'); d.el(14, 12, 1.5, 1.2, '#ff9ab0'); d.p(14, 12, '#a04050'); d.eye(10, 11, 1, 1); });
  M('cristaloup', (d, f) => { const l = f % 2; d.r(4 + l, 13, 2, 4, '#2fa8b0'); d.r(11 - l, 13, 2, 4, '#2fa8b0'); d.ball(8, 11, 6, 3.5, '#4fe3e0'); d.ball(13, 8, 3.5, 3, '#4fe3e0'); d.poly([[12, 6], [13, 2], [14, 6]], '#9ff6f2'); d.poly([[5, 9], [6, 4], [8, 8]], '#9ff6f2'); d.poly([[8, 8], [9, 5], [10, 8]], '#9ff6f2'); d.r(1, 9 - l, 3, 1, '#4fe3e0'); d.p(14, 8, '#1d1530'); d.p(16, 9, '#1d1530'); });
  M('pingou', (d, f) => { const w = f % 2; d.r(6 - w, 15, 2, 2, '#ff9a3a'); d.r(10 + w, 15, 2, 2, '#ff9a3a'); d.ball(9, 11, 6, 5.5, '#eef4ff'); d.ball(5, 8, 2.5, 2.5, '#ffffff'); d.ball(12, 8, 2.5, 2.5, '#ffffff'); d.ball(9, 10, 3.5, 3, '#2a3a5a'); d.p(8, 9, '#ffffff'); d.p(10, 9, '#ffffff'); d.r(8, 11, 2, 1, '#ff9a3a'); });
  M('lavachat', (d, f) => { const l = f % 2; d.r(4 + l, 14, 2, 3, '#3a2a30'); d.r(11 - l, 14, 2, 3, '#3a2a30'); d.ball(8, 12, 6, 3.5, '#4a3038'); d.ln(2, 11, 1, 6 + l, '#ff7a3a'); d.ball(13, 8, 3.5, 3.5, '#4a3038'); d.poly([[10, 6], [11, 3], [12, 6]], '#4a3038'); d.poly([[14, 6], [15, 3], [16, 6]], '#4a3038'); d.ln(5, 11, 9, 12, '#ff7a3a'); d.p(7, 13, '#ffd23f'); d.p(12, 8, '#ffd23f'); d.p(15, 8, '#ffd23f'); });
  M('canardo', (d, f) => { const w = [0, 1, 0, -1][f]; d.r(6, 15, 2, 2, '#ff8a2a'); d.r(10, 15, 2, 2, '#ff8a2a'); d.ball(8, 12 + w * .3, 6, 4, '#ffd23f'); d.ball(11, 6, 3.5, 3.5, '#ffd23f'); d.r(14, 6, 3, 2, '#ff8a2a'); d.eye(11, 5, 1, 0); d.el(6, 11, 3, 1.6, '#e8b820'); });
  M('meduse', (d, f) => { for (let k = 0; k < 4; k++) { const x = 5 + k * 2.5 | 0; for (let y = 10; y < 17; y++) d.p(x + (Math.sin(y * .8 + f * 1.5 + k) > 0 ? 1 : 0), y, '#e0c8ff'); } d.ball(9, 7, 6.5, 5, '#c9a0ff'); d.el(9, 10, 6, 1.5, '#a07ae0'); d.p(7, 7, '#1d1530'); d.p(11, 7, '#1d1530'); d.p(5, 4, '#ffffff'); });
  // roue à Blobo : blobo qui court
  for (let f = 0; f < 4; f++) SP('roue_b' + f, 10, 8, d => { const sq = [0, 1, 0, -1][f]; d.ball(5, 5, 3.5 + sq * .4, 2.8 - sq * .3, '#7ce86a'); d.p(4, 4, '#1d1530'); d.p(6, 4, '#1d1530'); });
}

/* ================= POISSONS ================= */
function genFish() {
  for (const F of FISH) SP('fi_' + F.id, 16, 12, d => {
    const [a, b] = F.c;
    if (F.id === 'botte') { d.poly([[4, 1], [9, 1], [9, 7], [14, 7], [14, 11], [4, 11]], a); d.r(4, 1, 5, 2, b); d.r(4, 10, 10, 1, b); return; }
    if (F.id === 'grenouille') { d.ball(8, 7, 6, 4, a); d.ball(5, 4, 2, 2, a); d.ball(11, 4, 2, 2, a); d.p(5, 3, '#1d1530'); d.p(11, 3, '#1d1530'); d.r(6, 8, 4, 1, b); return; }
    if (F.id === 'anguille') { for (let x = 1; x < 15; x++) d.r(x, 5 + Math.round(Math.sin(x * .8) * 2), 1, 3, x % 3 ? a : b); d.p(14, 5, '#1d1530'); return; }
    d.ball(7, 6, 5.5, 3.6, a); d.poly([[11, 6], [15, 2], [15, 10]], shd(a, -.2)); d.el(6, 8, 4, 1.4, b); d.p(4, 5, '#1d1530');
    if (F.id === 'requin') d.poly([[6, 3], [8, 0], [9, 3]], a);
    if (F.id === 'glouglou') { d.r(4, 0, 5, 2, '#ffd23f'); d.p(4, 0, '#ff4d6d'); d.p(8, 0, '#ff4d6d'); }
    if (F.id === 'pyjama') for (let x = 4; x < 11; x += 2) d.r(x, 3, 1, 6, b);
    if (F.id === 'pizzafish') { d.p(7, 5, '#e0402a'); d.p(9, 7, '#e0402a'); }
    if (F.id === 'paillette') { d.p(6, 4, '#ffffff'); d.p(9, 6, '#ffffff'); }
  });
}

/* ================= CHAPEAUX (dessinés au-dessus de la tête) ================= */
function genHats() {
  const H = (k, fn) => SP('h_' + k, 16, 12, fn);
  H('casquette', d => { d.ball(8, 9, 5, 3, '#ff4d6d'); d.r(10, 9, 5, 2, '#c0304a'); d.p(8, 6, '#ffffff'); });
  H('cowboy', d => { d.el(8, 10, 7.5, 1.6, '#a0663a'); d.box(4, 4, 8, 6, '#c98b5a'); d.r(4, 8, 8, 1, '#5a3a2a'); });
  H('antennes', d => { d.ln(5, 10, 3, 3, '#4a5068'); d.ln(11, 10, 13, 3, '#4a5068'); d.ball(3, 3, 1.8, 1.8, '#7ce86a'); d.ball(13, 3, 1.8, 1.8, '#ff6fae'); });
  H('sombrero', d => { d.el(8, 10, 7.5, 1.8, '#ffd23f'); d.ball(8, 7, 3.5, 3.5, '#ffd23f'); d.r(3, 10, 10, 1, '#ff4d6d'); d.p(5, 10, '#5fd068'); d.p(11, 10, '#5fd068'); });
  H('hautforme', d => { d.el(8, 10, 6.5, 1.5, '#2a2440'); d.box(5, 1, 6, 9, '#2a2440'); d.r(5, 7, 6, 1, '#ff4d6d'); });
  H('bonnet', d => { d.ball(8, 8, 5, 4, '#5ab8ff'); d.r(3, 9, 10, 2, '#ffffff'); d.ball(8, 3, 2, 2, '#ffffff'); });
  H('champi', d => { d.ball(8, 7, 7, 4, '#e0607a'); d.el(5, 5, 1.4, 1, '#ffe0ea'); d.el(10, 4, 1.4, 1, '#ffe0ea'); d.r(2, 9, 12, 1, '#b84060'); });
  H('poulpe', d => { d.ball(8, 6, 5, 4, '#ff8ac0'); for (let x = 3; x < 14; x += 2) d.r(x, 9, 1, 3, '#ff8ac0'); d.p(6, 6, '#1d1530'); d.p(10, 6, '#1d1530'); });
  H('viking', d => { d.ball(8, 8, 5, 3.5, '#9aa3c0'); d.r(3, 9, 10, 1, '#c9a020'); d.poly([[3, 8], [0, 2], [2, 2], [5, 7]], '#f2ecd8'); d.poly([[13, 8], [16, 2], [14, 2], [11, 7]], '#f2ecd8'); });
  H('lunettes', d => { d.r(2, 9, 5, 3, '#ff4d6d'); d.r(9, 9, 5, 3, '#5ab8ff'); d.r(7, 9, 2, 1, '#ffffff'); });
  H('banane', d => { d.poly([[2, 7], [5, 10], [11, 10], [14, 6], [10, 8], [5, 7], [3, 4]], '#fff04a'); d.p(3, 3, '#5a3a20'); });
  H('cone', d => { d.poly([[4, 11], [8, 0], [12, 11]], '#ff8a2a'); d.r(5, 5, 6, 2, '#ffffff'); d.r(3, 10, 10, 2, '#ff8a2a'); });
  H('helice', d => { d.ball(8, 9, 5, 3, '#5ab8ff'); d.r(7, 3, 2, 4, '#ffd23f'); d.r(2, 2, 12, 1, '#ff4d6d'); });
  H('noeud', d => { d.poly([[8, 7], [2, 3], [2, 11]], '#ff4d6d'); d.poly([[8, 7], [14, 3], [14, 11]], '#ff4d6d'); d.ball(8, 7, 1.8, 1.8, '#c0304a'); });
  H('pirate', d => { d.poly([[1, 10], [3, 4], [8, 2], [13, 4], [15, 10]], '#2a2440'); d.ball(8, 6, 1.8, 1.6, '#ffffff'); d.r(1, 10, 14, 1, '#ffd23f'); });
  H('poisson', d => { d.ball(7, 7, 6, 4, '#ffd23f'); d.poly([[12, 7], [16, 3], [16, 11]], '#ff8a2a'); d.p(4, 6, '#1d1530'); d.el(5, 9, 2, 1, '#ffffff'); });
  H('canard', d => { d.ball(7, 8, 4.5, 3, '#ffd23f'); d.ball(9, 4, 2.5, 2.5, '#ffd23f'); d.r(11, 4, 3, 2, '#ff8a2a'); d.p(9, 3, '#1d1530'); });
  H('chef', d => { d.box(4, 6, 8, 5, '#ffffff'); d.ball(5, 4, 3, 3, '#ffffff'); d.ball(11, 4, 3, 3, '#ffffff'); d.ball(8, 3, 3.5, 3, '#ffffff'); });
  H('couronne', d => { d.poly([[3, 11], [3, 4], [5.5, 7], [8, 2], [10.5, 7], [13, 4], [13, 11]], '#ffd23f'); d.p(8, 8, '#ff4d6d'); d.p(5, 9, '#5ab8ff'); d.p(11, 9, '#7ce86a'); });
  H('fleur', d => { for (let x = 2; x < 15; x += 3) { d.ball(x, 9, 1.8, 1.8, ['#ff6fae', '#ffd23f', '#8fd0ff', '#ffffff', '#ff8a2a'][(x / 3) | 0]); d.p(x, 9, '#ffd23f'); } d.r(2, 10, 12, 1, '#3a9a3a'); });
  H('canardroi', d => { d.ball(7, 8, 4.5, 3, '#ffd23f'); d.ball(9, 5, 2.5, 2.5, '#ffd23f'); d.r(11, 5, 3, 2, '#ff8a2a'); d.p(9, 4, '#1d1530'); d.poly([[6, 3], [7, 0], [8, 2], [9, 0], [10, 2], [11, 0], [11, 3]], '#ff4d6d'); });
  H('aureole', d => { d.el(8, 3, 6, 2, '#fff6a0'); d.el(8, 3, 4, .8, 'rgba(0,0,0,0)'); d.x.clearRect(4, 3, 8, 1); });
  H('fete', d => { d.poly([[4, 11], [8, 0], [12, 11]], '#9a6aff'); d.p(6, 8, '#ffd23f'); d.p(9, 5, '#7ce86a'); d.p(8, 9, '#ff6fae'); d.ball(8, 1, 1.5, 1.5, '#ffd23f'); });
}

/* ================= ASTRONAUTES (rendus à la demande, mis en cache) ================= */
const CHARS = { m: { hair: '#2b2a6b', skin: '#d9a07a' }, f: { hair: '#d1457a', skin: '#f0c39a' } };
const ASTRO = new Map();
function suitColor(id, t) { if (id === 'arcenciel') return rgbHex(...hsl(((t / 20) % 360), .8, .65)); const s = SUITS.find(s => s[0] === id); return s ? s[2] : '#f0a030'; }
function hsl(h, s, l) { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0) * 255, f(8) * 255, f(4) * 255]; }
/* planche PNG perso (assets/joueur_m.png, joueur_f.png) : 3 colonnes (repos, pas 1, pas 2) × 8 lignes
   (bas, gauche, droite, haut avec casque puis les mêmes sans casque), cases de 16×23.
   La couleur de combinaison choisie en jeu remplace celle de la planche (mêmes teintes que le dessin d'origine). */
const SUITMAP = new Map();
function astro(who, suit, dir, fr, helmet) {
  const sh = ART['joueur_' + who]; if (!sh) return astroGen(who, suit, dir, fr, helmet);
  const key = 'P' + who + suit + dir + fr + (helmet ? 1 : 0); let c = ASTRO.get(key); if (c) return c;
  if (ASTRO.size > 400) ASTRO.clear();
  c = cnv(16, 23); const x = c.getContext('2d'), row = { d: 0, l: 1, r: 2, u: 3 }[dir] + (helmet ? 0 : 4), col = fr === 1 ? 1 : fr === 3 ? 2 : 0;
  x.drawImage(sh, col * 16, row * 23, 16, 23, 0, 0, 16, 23);
  const base = suitColor(who === 'm' ? 'orange' : 'teal');
  if (suit !== base) {
    const mk = who + suit; let map = SUITMAP.get(mk);
    if (!map) {
      map = new Map();
      for (const dd of ['d', 'l', 'u']) for (const h of [true, false]) {
        const a = astroGen(who, base, dd, 0, h).getContext('2d').getImageData(0, 0, 16, 23).data, b = astroGen(who, suit, dd, 0, h).getContext('2d').getImageData(0, 0, 16, 23).data;
        for (let p = 0; p < a.length; p += 4) if (a[p + 3] && (a[p] !== b[p] || a[p + 1] !== b[p + 1] || a[p + 2] !== b[p + 2])) map.set((a[p] << 16) | (a[p + 1] << 8) | a[p + 2], [b[p], b[p + 1], b[p + 2]]);
      }
      if (SUITMAP.size > 60) SUITMAP.clear(); SUITMAP.set(mk, map);
    }
    const im = x.getImageData(0, 0, 16, 23), D = im.data;
    for (let p = 0; p < D.length; p += 4) { if (!D[p + 3]) continue; const m = map.get((D[p] << 16) | (D[p + 1] << 8) | D[p + 2]); if (m) { D[p] = m[0]; D[p + 1] = m[1]; D[p + 2] = m[2]; } }
    x.putImageData(im, 0, 0);
  }
  ASTRO.set(key, c); return c;
}
/* planche des sprites joueurs dessinés par le code (pour les exporter / les refaire) */
function astroSheet(who, helmetOnly) {
  const c = cnv(48, 23 * 8), x = c.getContext('2d'), suit = suitColor(who === 'm' ? 'orange' : 'teal');
  ['d', 'l', 'r', 'u'].forEach((d, r) => [0, 1, 3].forEach((fr, col) => { x.drawImage(astroGen(who, suit, d, fr, true), col * 16, r * 23); x.drawImage(astroGen(who, suit, d, fr, false), col * 16, (r + 4) * 23); }));
  return c;
}
function astroGen(who, suit, dir, fr, helmet) {
  const key = who + suit + dir + fr + (helmet ? 1 : 0); let c = ASTRO.get(key); if (c) return c;
  if (ASTRO.size > 400) ASTRO.clear();
  const flip = dir === 'r'; if (flip) dir = 'l';
  c = cnv(16, 23); const d = Dr(c), C = CHARS[who], side = dir === 'l' || dir === 'r', back = dir === 'u';
  const bob = fr === 1 || fr === 3 ? 1 : 0, lL = fr === 1 ? -1 : fr === 3 ? 1 : 0;
  const boots = '#3a3448', pack = '#9aa3c0';
  // jambes
  if (side) { d.r(6 + lL, 18, 3, 3 - bob, boots); d.r(8 - lL, 18, 3, 3 - bob, shd(boots, .15)); d.r(6 + lL, 20 - bob, 3, 1, '#5a5470'); }
  else { d.r(5, 18 - (lL < 0 ? 1 : 0), 3, 3, boots); d.r(9, 18 - (lL > 0 ? 1 : 0), 3, 3, boots); }
  const by = 11 + bob;
  // sac à dos
  if (side) d.box(dir === 'l' ? 11 : 2, by + 1, 3, 6, pack);
  if (back) d.box(4, by, 9, 7, pack);
  // corps
  d.box(4, by, 9, 8 - bob, suit);
  if (!back) { d.r(4, by + 5 - bob, 9, 1, shd(suit, -.3)); if (!side) { d.r(6, by + 2, 2, 2, '#ffffff'); d.p(9, by + 2, '#ff4d6d'); d.p(10, by + 2, '#5ab8ff'); } }
  if (back) { d.box(5, by + 1, 7, 5, pack); d.r(6, by + 2, 5, 1, shd(pack, .3)); }
  // bras
  const sw = fr === 1 ? 1 : fr === 3 ? -1 : 0;
  if (side) d.r(dir === 'l' ? 6 + sw : 9 - sw, by + 1, 2, 5, shd(suit, -.12));
  else { d.r(2, by + 1 + (sw > 0 ? 1 : 0), 2, 5, shd(suit, -.1)); d.r(13, by + 1 + (sw < 0 ? 1 : 0), 2, 5, shd(suit, -.1)); d.r(2, by + 5 + (sw > 0 ? 1 : 0), 2, 1, '#e8e8f0'); d.r(13, by + 5 + (sw < 0 ? 1 : 0), 2, 1, '#e8e8f0'); }
  // tête
  const hy = 6 + bob;
  if (helmet) {
    d.ball(8.5, hy, 6, 5.6, '#eef2fa', false);
    if (back) { d.r(4, hy + 3, 9, 1, '#c9cfe6'); }
    else {
      const vx = side ? (dir === 'l' ? 6.5 : 10.5) : 8.5;
      d.el(vx, hy + .5, side ? 3.4 : 4.4, 3.6, '#a8dcf4');
      d.el(vx, hy + 1.2, side ? 2.6 : 3.4, 2.6, C.skin);
      d.r(Math.round(vx - (side ? 2 : 3)), hy - 2, side ? 4 : 6, 1, C.hair);
      if (side) d.p(Math.round(vx + (dir === 'l' ? -1 : 1)), hy + 1, '#1d1530');
      else { d.p(Math.round(vx) - 2, hy + 1, '#1d1530'); d.p(Math.round(vx) + 1, hy + 1, '#1d1530'); d.p(Math.round(vx) - 1, hy + 3, '#c0606a'); }
      d.r(Math.round(vx - (side ? 1 : 3)), hy - 2, 2, 1, 'rgba(255,255,255,.8)');
    }
    d.r(14, hy - 4, 1, 3, '#9aa3c0'); d.p(14, hy - 5, '#ff4d6d');
  } else {
    d.ball(8.5, hy + 1, 4.6, 4.4, C.skin, false);
    if (who === 'm') { d.el(8.5, hy - 2, 5, 2.5, C.hair); d.p(4, hy, C.hair); d.p(13, hy, C.hair); d.p(7, hy - 5, C.hair); d.p(10, hy - 5, C.hair); }
    else { d.el(8.5, hy - 2, 5, 2.4, C.hair); d.r(side ? (dir === 'l' ? 12 : 3) : 13, hy - 1, 2, 6, C.hair); d.r(4, hy - 1, 1, 3, C.hair); }
    if (back) d.el(8.5, hy, 4.8, 4, C.hair);
    else if (side) { d.p(dir === 'l' ? 6 : 11, hy + 1, '#1d1530'); d.p(dir === 'l' ? 7 : 10, hy + 3, '#c0606a'); }
    else { d.p(6, hy + 1, '#1d1530'); d.p(11, hy + 1, '#1d1530'); d.r(8, hy + 3, 2, 1, '#c0606a'); d.p(5, hy + 2, '#ff9ab0'); d.p(12, hy + 2, '#ff9ab0'); }
  }
  outline(c);
  if (flip) { const f = cnv(16, 23), x = f.getContext('2d'); x.translate(16, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); c = f; }
  ASTRO.set(key, c); return c;
}
/* portrait pour les dialogues */
function portrait(who, helmet, suit) {
  const c = cnv(32, 32), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const a = astro(who, suit, 'd', 0, helmet); x.drawImage(a, 0, 0, 16, 16, 0, 2, 32, 32); return c.toDataURL();
}

/* ================= SURCHARGES PNG + GÉNÉRATION ================= */
function genArt() { genItems(); genUI(); genObjects(); genBuildings(); genMobs(); genFish(); genHats(); genBldIcons(); }
/* icône carrée des constructions-objets (le sprite garde ses proportions) */
function genBldIcons() {
  for (const k in ITEMS) {
    if (k[0] !== '@') continue; const id = k.slice(1), d = BLD[id], c = cnv(32, 32), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (d.floor) { const pal = d.pal; x.fillStyle = OL; x.fillRect(3, 3, 26, 26); x.fillStyle = pal[0]; x.fillRect(5, 5, 22, 22); x.fillStyle = pal[1]; x.fillRect(5, 15, 22, 2); x.fillRect(15, 5, 2, 22); x.fillStyle = pal[2]; x.fillRect(6, 6, 6, 2); }
    else if (d.wall) { const [t, f] = d.pal; x.fillStyle = OL; x.fillRect(5, 3, 22, 26); x.fillStyle = t; x.fillRect(7, 5, 18, 12); x.fillStyle = f; x.fillRect(7, 17, 18, 10); }
    else { const a = ART['b_' + (id === 'arbre' ? 'arbre0' : id)]; if (a) { const s = Math.min(32 / a.width, 32 / a.height), w = Math.floor(a.width * s), h = Math.floor(a.height * s); x.drawImage(a, (32 - w) >> 1, 32 - h, w, h); } }
    ART['i_' + k] = c;
  }
}
const ICON = {};
function iconURL(key) { if (!ICON[key]) { const a = ART[key]; ICON[key] = !a ? '' : a.toDataURL ? a.toDataURL() : a.src; } return ICON[key]; }
async function loadOverrides() {
  // assets/manifest.json est généré par scripts/prepare.js : liste des PNG déposés dans assets/
  let list = [];
  try { const r = await fetch('assets/manifest.json'); if (r.ok) list = await r.json(); } catch (e) { }
  // la clé du sprite = nom du fichier sans .png (ex. assets/sprites/b_etabli.png remplace le sprite "b_etabli")
  await Promise.all(list.map(p => new Promise(res => { const i = new Image(), k = p.split('/').pop().replace(/\.png$/, ''); i.onload = () => { ART[k] = i; res(); }; i.onerror = res; i.src = 'assets/' + p; })));
}
