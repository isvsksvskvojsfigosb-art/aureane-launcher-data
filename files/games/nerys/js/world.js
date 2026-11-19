'use strict';
/* ==========================================================
   Nérys — monde : génération (planète torique 256×256),
   état des cases, rendu du sol par morceaux, mini-carte
   ========================================================== */
const W = { b: null, a: null, o: null, o0: null, g: null, hp: null, fog: null, seeds: [], spawn: { x: 128, y: 128 }, caps: [], monos: [], fogN: 0 };
const tI = (tx, ty) => ((ty & WM) * WW) + (tx & WM);
const wrapD = d => d - WP * Math.round(d / WP);
function tdist(ax, ay, bx, by) { const dx = Math.abs(ax - bx), dy = Math.abs(ay - by); return Math.hypot(Math.min(dx, WW - dx), Math.min(dy, WH - dy)); }

/* paramètres visuels issus de la terraformation (mis à jour par game.js) */
const V = { gc: 0, wl: 0, wb: 0, melt: 0, sky: 0, st: 0, ver: '' };

function genWorld(seed) {
  const N = WW * WH; CHUNKS.clear(); mapVer = '';
  W.b = new Uint8Array(N); W.a = new Uint8Array(N); W.o = new Uint8Array(N); W.g = new Uint8Array(N); W.hp = new Uint8Array(N); W.fog = new Uint8Array(N); W.fogN = 0;
  const R = mulberry(seed), sx = 128, sy = 128; W.spawn = { x: sx, y: sy };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
  /* --- graines de biomes (Voronoï déformé) --- */
  const seeds = [{ x: sx, y: sy, b: 0 }]; let tries = 0;
  while (seeds.length < 36 && tries++ < 8000) { const x = R() * WW, y = R() * WH; if (seeds.every(s => tdist(s.x, s.y, x, y) > 33)) seeds.push({ x, y, b: -1 }); }
  const order = seeds.slice(1).sort((a, b) => tdist(a.x, a.y, sx, sy) - tdist(b.x, b.y, sx, sy));
  let bag = shuffle([1, 2, 3, 4, 5]);
  order.forEach((s, i) => { if (!bag.length) bag = shuffle([0, 1, 2, 3, 4, 5]); s.b = bag.pop(); });
  W.seeds = seeds;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const wx = x + (fbm(x / WW * 6, y / WH * 6, 6, seed + 11, 3) - .5) * 34, wy = y + (fbm(x / WW * 6, y / WH * 6, 6, seed + 12, 3) - .5) * 34;
    let bd = 1e9, bb = 0;
    for (const s of seeds) { const d = tdist(s.x, s.y, wx, wy); if (d < bd) { bd = d; bb = s.b; } }
    if (tdist(x, y, sx, sy) < 13) bb = 0;
    W.b[y * WW + x] = bb;
  }
  /* --- altitude : lacs (7 %) et cuvettes à remplir (6 %) --- */
  const alt = new Float32Array(N);
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) alt[y * WW + x] = fbm(x / WW * 10, y / WH * 10, 10, seed + 21, 4) + (tdist(x, y, sx, sy) < 11 ? 1 : 0);
  const srt = Float32Array.from(alt).sort(), q1 = srt[N * .07 | 0], q2 = srt[N * .13 | 0];
  for (let i = 0; i < N; i++) { const a = alt[i]; W.a[i] = a < q1 ? Math.floor(a / q1 * 63) : a < q2 ? 64 + Math.floor((a - q1) / (q2 - q1) * 20.99) : 85 + Math.min(170, Math.floor((a - q2) * 300)); }
  /* --- seuil d'herbe : bruit lisse classé (couverture = proportion exacte) --- */
  const gv = new Float32Array(N);
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) gv[y * WW + x] = fbm(x / WW * 14, y / WH * 14, 14, seed + 31, 3) * .8 + hash2(x, y, seed) * .2;
  const idx = new Uint32Array(N); for (let i = 0; i < N; i++) idx[i] = i;
  idx.sort((p, q) => gv[p] - gv[q]); for (let r = 0; r < N; r++) W.g[idx[r]] = Math.floor(r / N * 255);
  /* --- objets --- */
  const TAB = [
    [[1, .022], [3, .035], [4, .02], [2, .01]],
    [[6, .085], [8, .035], [4, .012], [1, .012]],
    [[9, .03], [1, .028], [17, .022], [16, .0014]],
    [[10, .028], [11, .035], [12, .045], [1, .01]],
    [[13, .045], [14, .028], [1, .02], [4, .008]],
    [[15, .032], [1, .04], [16, .004], [14, .01]],
  ];
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const i = y * WW + x; if (W.a[i] < 85) continue;
    const d0 = tdist(x, y, sx, sy); if (d0 < 3.5) continue;
    const cl = fbm(x / WW * 18, y / WH * 18, 18, seed + 41, 2), f = cl > .56 ? 2.3 : cl < .42 ? .35 : 1;
    let r = hash2(x, y, seed + 5);
    if (d0 < 22 && W.b[i] === 0) { const pd = .07 * (1 - d0 / 22); if (r < pd) { W.o[i] = 2; continue; } r -= pd; }
    for (const [o, p] of TAB[W.b[i]]) { const pp = o === 16 ? p : p * f; if (r < pp) { W.o[i] = o; break; } r -= pp; }
  }
  /* épave (3×2 cases) */
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 0; dy++) W.o[tI(sx + dx, sy + dy)] = 23;
  /* capsules et statues */
  const free = (x, y) => { const i = tI(x, y); return W.a[i] >= 85 && !W.o[i]; };
  W.caps = []; tries = 0;
  while (W.caps.length < 40 && tries++ < 20000) { const x = R() * WW | 0, y = R() * WH | 0; if (tdist(x, y, sx, sy) > 16 && free(x, y) && W.caps.every(i => tdist(i % WW, i / WW | 0, x, y) > 14)) { const i = tI(x, y); W.o[i] = 18; W.caps.push(i); } }
  W.monos = []; tries = 0;
  while (W.monos.length < 8 && tries++ < 20000) { const x = R() * WW | 0, y = R() * WH | 0; if (tdist(x, y, sx, sy) > 34 && free(x, y) && free(x, y - 1) && W.monos.every(i => tdist(i % WW, i / WW | 0, x, y) > 42)) { const i = tI(x, y); W.o[i] = 19; W.monos.push(i); } }
  W.o0 = Uint8Array.from(W.o);
}

/* type de case : 0 terre, 1 eau peu profonde, 2 eau profonde, 3 lave, 4 glace, 5 cuvette sèche */
function tkind(i) {
  const a = W.a[i];
  if (a < 64) { const b = W.b[i]; return b === 5 ? 3 : b === 4 && V.melt < .55 ? 4 : 2; }
  if (a < 85) return (a - 64) < 21 * V.wl ? 1 : 5;
  return 0;
}
const isWaterK = k => k === 1 || k === 2 || k === 3;
function nearestSeed(b, tx, ty) { let best = null, bd = 1e9; for (const s of W.seeds) if (s.b === b) { const d = tdist(s.x, s.y, tx, ty); if (d < bd) { bd = d; best = s; } } return best ? { s: best, d: bd } : null; }
function compass(fx, fy, tx, ty) {
  let dx = tx - fx, dy = ty - fy; if (dx > WW / 2) dx -= WW; if (dx < -WW / 2) dx += WW; if (dy > WH / 2) dy -= WH; if (dy < -WH / 2) dy += WH;
  const a = Math.atan2(dy, dx); return ['à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest', 'au nord', 'au nord-est'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}
function reveal(tx, ty, r) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; const i = tI(tx + x, ty + y); if (!W.fog[i]) { W.fog[i] = 1; W.fogN++; } }
}

/* ---------------- palettes ---------------- */
const PAL = {
  land: [['#4a3b6b', '#55447a', '#614f88', '#7a68a8', '#3c2f58'], ['#2c3d52', '#33475e', '#3b5169', '#5a7a8c', '#e0607a'], ['#d68f6e', '#e09d78', '#eaae86', '#f6c9a0', '#b9735a'],
  ['#3c5238', '#455e3f', '#4f6a46', '#6c8a4a', '#2e4a4a'], ['#5c6a72', '#66757d', '#708089', '#8a9aa2', '#4a565e'], ['#2e2228', '#36282f', '#3f2f37', '#ff7a3a', '#4c3a44']],
  snow: ['#c8d6ea', '#d8e4f4', '#e8f0fb', '#ffffff', '#a8b8d8'],
  bed: ['#5a4650', '#634e58', '#6c5662', '#3e3038', '#7a6470'],
  ice: ['#a8d8f0', '#bfe6f8', '#d8f2ff', '#ffffff', '#8ccaf0'],
  lava: ['#5a1c1c', '#e8541e', '#ff8a2a', '#ffc04a', '#7a2a1a'],
};
const GRASS = ['#3f9a4a', '#4aac52', '#58bf5c'], FLOW = ['#ffd23f', '#ff6fae', '#ffffff', '#8fd0ff'];
const BIOTINT = [.12, .25, .3, .3, .05, .35];
let RGB = new Map(); const rgb = h => { let v = RGB.get(h); if (!v) { v = hexRgb(h); RGB.set(h, v); } return v; };

/* tables de bruit pour la texture et le tremblement des bords */
const JX = new Int8Array(1024), JY = new Int8Array(1024), TX = new Float32Array(4096);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { JX[y * 32 + x] = Math.round((vnoise(x / 8, y / 8, 4, 1) - .5) * 11 + (vnoise(x / 4, y / 4, 8, 5) - .5) * 4); JY[y * 32 + x] = Math.round((vnoise(x / 8, y / 8, 4, 2) - .5) * 11 + (vnoise(x / 4, y / 4, 8, 6) - .5) * 4); }
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) TX[y * 64 + x] = vnoise(x / 6.4, y / 6.4, 10, 3) * .7 + vnoise(x / 3.2, y / 3.2, 20, 4) * .3;

function visualVersion() { return [V.gc * 60 | 0, V.wl * 21 | 0, V.wb * 20 | 0, V.melt * 40 | 0, V.st >= 3 ? 1 : 0].join('|'); }
function updateV(st) {
  const L = x => { x *= 4; for (let n = 1; n < 60; n++) { const t = stageThr(n); if (x < t) { const p = stageThr(n - 1); return n - 1 + (p <= 0 ? x / t : Math.log(Math.max(x, p) / p) / Math.log(t / p)); } } return 60; };
  V.gc = clamp((L(st.b) - 2.2) / 6.3, 0, 1); V.wl = clamp((L(st.w) - 1.4) / 5, 0, 1); V.wb = clamp((L(st.w) - 2) / 7, 0, 1);
  V.melt = clamp((L(st.h) - 2.5) / 6, 0, 1); V.sky = clamp((L(st.o) - 2.5) / 6, 0, 1); V.st = G ? G.stage : 0;
  const v = visualVersion(); if (v !== V.ver) { V.ver = v; return true; } return false;
}

/* ---------------- rendu du sol par morceaux de 16×16 cases ---------------- */
const CK = 16, CKP = CK * TS, CHUNKS = new Map();
function tileLook(i) {
  // renvoie [palette(5 couleurs), kind, deep]
  const k = tkind(i), b = W.b[i];
  if (k === 0) {
    if (b === 4 && W.g[i] / 255 > V.melt * 1.1) return PAL.snow;
    if (W.g[i] / 255 < V.gc * (b === 5 ? .7 : b === 2 ? .85 : 1)) return GRASSP[b];
    return PAL.land[b];
  }
  if (k === 5) return PAL.bed;
  if (k === 4) return PAL.ice;
  if (k === 3) return PAL.lava;
  return null; // eau
}
let GRASSP = [];
function buildGrass() { GRASSP = PAL.land.map((p, b) => [...GRASS.map(g => mix(g, p[1], BIOTINT[b])), mix('#7ad86a', p[1], BIOTINT[b] * .5), mix('#2f7a3a', p[0], .2)]); }
buildGrass();
function waterCols() { return { deep: rgb(mix('#6aa02a', '#2a5ec0', V.wb)), mid: rgb(mix('#8fbf2a', '#3a7ad8', V.wb)), shal: rgb(mix('#a8d84a', '#58a8ec', V.wb)), foam: rgb(mix('#e0f8a0', '#e8f8ff', V.wb)) }; }

function renderChunk(cx, cy) {
  let e = CHUNKS.get(cx + cy * 64); if (!e) { e = { c: cnv(CKP, CKP), ver: '' }; CHUNKS.set(cx + cy * 64, e); }
  const x = e.c.getContext('2d'), img = x.createImageData(CKP, CKP), p = img.data, E = CK + 2;
  const look = new Array(E * E), kind = new Uint8Array(E * E), deep = new Uint8Array(E * E), wc = waterCols();
  for (let ty = -1; ty <= CK; ty++) for (let tx = -1; tx <= CK; tx++) { const i = tI(cx * CK + tx, cy * CK + ty), j = (ty + 1) * E + tx + 1; kind[j] = tkind(i); look[j] = tileLook(i); }
  for (let ty = 0; ty < CK; ty++) for (let tx = 0; tx < CK; tx++) { const j = (ty + 1) * E + tx + 1; if (kind[j] === 2) deep[j] = (kind[j - 1] === 2 && kind[j + 1] === 2 && kind[j - E] === 2 && kind[j + E] === 2) ? 1 : 0; }
  const flowers = V.st >= 3, gx0 = cx * CKP, gy0 = cy * CKP;
  const kAt = (px, py) => { const tx = Math.floor(px / TS), ty = Math.floor(py / TS); return (ty + 1) * E + tx + 1; };
  for (let py = 0; py < CKP; py++) for (let px = 0; px < CKP; px++) {
    const gx = gx0 + px, gy = gy0 + py, jj = (gy & 31) * 32 + (gx & 31);
    const sx = clamp(px + JX[jj], -TS, CKP + TS - 1), sy = clamp(py + JY[jj], -TS, CKP + TS - 1);
    const j = kAt(sx, sy), k = kind[j], o = (py * CKP + px) * 4, n = TX[(gy & 63) * 64 + (gx & 63)];
    let col;
    if (k === 1 || k === 2) {
      const above = kind[kAt(sx, sy - 3)], above1 = kind[kAt(sx, sy - 1)];
      if (!isWaterK(above1) && above1 !== 4) col = rgb(shd((look[kAt(sx, sy - 1)] || PAL.bed)[0], -.35));
      else if (!isWaterK(above) && above !== 4) col = wc.foam;
      else col = k === 1 ? wc.shal : deep[j] && n > .35 ? wc.deep : wc.mid;
      if (n > .78 && (gx * 7 + gy * 3) % 11 === 0) col = wc.foam;
    } else {
      const P = look[j]; if (!P) { col = wc.mid; } else {
        if (k === 3) col = rgb(n < .38 ? P[0] : n < .55 ? P[4] : n < .8 ? P[1] : P[2]);
        else col = rgb(n < .36 ? P[0] : n < .64 ? P[1] : P[2]);
        const h = hash2(gx, gy, 77);
        if (k === 0 && P.length > 3) {
          if (h < .010) col = rgb(P[3]); else if (h < .016) col = rgb(P[4]);
          if (flowers && P.length === 5 && GRASSP.includes(P) && h > .996) col = rgb(FLOW[(gx + gy) & 3]);
        }
        if (k === 5 && h < .03) col = rgb(P[3]);
        if (k === 4 && h < .012) col = rgb(P[4]);
        // bord de rive : léger contour sombre côté eau
        const below = kind[kAt(sx, sy + 1)]; if (isWaterK(below) && k !== 3) col = rgb(shd(P[0], -.25));
      }
    }
    p[o] = col[0]; p[o + 1] = col[1]; p[o + 2] = col[2]; p[o + 3] = 255;
  }
  x.putImageData(img, 0, 0); e.ver = V.ver; return e.c;
}
let reRendered = 0;
function chunk(cx, cy) {
  cx &= (WW / CK - 1); cy &= (WH / CK - 1);
  const e = CHUNKS.get(cx + cy * 64);
  if (!e) { if (CHUNKS.size > 30) { const k = CHUNKS.keys().next().value; CHUNKS.delete(k); } reRendered++; return renderChunk(cx, cy); }
  if (e.ver !== V.ver && reRendered < 1) { reRendered++; return renderChunk(cx, cy); }
  CHUNKS.delete(cx + cy * 64); CHUNKS.set(cx + cy * 64, e); // LRU
  return e.c;
}
/* pré-calcule un morceau voisin quand la frame n'a rien eu à calculer (évite les saccades) */
function prefetchChunks(c0, c1, r0, r1) {
  if (reRendered) return;
  for (let r = r0 - 1; r <= r1 + 1; r++) for (let c = c0 - 1; c <= c1 + 1; c++) {
    const cx = c & (WW / CK - 1), cy = r & (WH / CK - 1), e = CHUNKS.get(cx + cy * 64);
    if (!e || e.ver !== V.ver) { if (!e && CHUNKS.size > 30) CHUNKS.delete(CHUNKS.keys().next().value); renderChunk(cx, cy); reRendered++; return; }
  }
}
function dirtyChunkAt(tx, ty) { const e = CHUNKS.get(((tx & WM) / CK | 0) + ((ty & WM) / CK | 0) * 64); if (e) e.ver = ''; }

/* ---------------- mini-carte ---------------- */
const MAPC = cnv(WW, WH); let mapVer = '';
function renderMap(force) {
  if (!force && mapVer === V.ver) return; mapVer = V.ver;
  const x = MAPC.getContext('2d'), img = x.createImageData(WW, WH), p = img.data, wc = waterCols();
  for (let i = 0; i < WW * WH; i++) {
    const k = tkind(i), P = tileLook(i); let c = k === 1 ? wc.shal : k === 2 ? wc.mid : rgb(P[1]);
    const o = W.o[i]; if (o && o !== 5 && o !== 7) c = rgb(shd(P ? P[1] : '#000000', -.25));
    if (o === 18 && (W.fog[i] || G.radar)) c = [255, 255, 255];
    p[i * 4] = c[0]; p[i * 4 + 1] = c[1]; p[i * 4 + 2] = c[2]; p[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}
