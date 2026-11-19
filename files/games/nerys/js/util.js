'use strict';
/* ==========================================================
   Nérys — utilitaires : maths, bruit, couleurs, réglages, audio
   ========================================================== */
const $ = s => document.querySelector(s);
/* PC (souris + clavier) ou application de bureau (Aureane Launcher) */
const ELECTRON = /Electron/i.test(navigator.userAgent);
const PC = ELECTRON || (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches && !('ontouchstart' in window));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.random() * a.length | 0];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/* bruit de valeur périodique (pour une planète qui boucle) */
function vnoise(x, y, p, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, m = v => ((v % p) + p) % p;
  const a = hash2(m(xi), m(yi), s), b = hash2(m(xi + 1), m(yi), s), c = hash2(m(xi), m(yi + 1), s), d = hash2(m(xi + 1), m(yi + 1), s);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, p, s, o = 4) { let t = 0, amp = 1, n = 0; for (let i = 0; i < o; i++) { t += vnoise(x, y, p, s + i * 101) * amp; n += amp; amp *= .5; x *= 2; y *= 2; p *= 2; } return t / n; }

function fmt(n) {
  n = +n || 0; const a = Math.abs(n);
  if (a < 1e3) return a < 1 && n % 1 ? (Math.floor(n * 100) / 100).toString().replace('.', ',') : a < 10 && n % 1 ? (Math.floor(n * 10) / 10).toString().replace('.', ',') : String(Math.floor(n));
  const u = ['k', 'M', 'G', 'T', 'P', 'E']; let i = -1;
  while (Math.abs(n) >= 1e3 && i < u.length - 1) { n /= 1e3; i++; }
  const s = Math.abs(n) < 10 ? n.toFixed(2) : Math.abs(n) < 100 ? n.toFixed(1) : String(Math.floor(n));
  return s.replace('.', ',') + u[i];
}
function fmtT(s) {
  s = Math.max(0, Math.round(s));
  if (s < 60) return s + ' s';
  if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return m + ' min' + (r && m < 10 ? ' ' + r + ' s' : ''); }
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
}
function hexRgb(h) { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1); }
function shd(h, k) { let [r, g, b] = hexRgb(h); if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; } return rgbHex(r, g, b); }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }

/* ---------- réglages (séparés de la sauvegarde) ---------- */
const DEFC = { vm: 80, vs: 100, vx: 55, vib: true, zoom: 1, lefty: false, bs: 100, bo: 90, nd: 65, fps: false, intro: false, tips: true, ui: 100, keys: true, keyhelp: false };
let CFG = { ...DEFC };
try { const s = localStorage.getItem('nerys_cfg'); if (s) Object.assign(CFG, JSON.parse(s)); else if (PC) CFG.zoom = .8; } catch (e) { }
function saveCfg() { try { localStorage.setItem('nerys_cfg', JSON.stringify(CFG)); } catch (e) { } }
const vib = ms => { if (CFG.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };

/* ---------- audio synthétisé (aucun fichier) ---------- */
const AU = { ctx: null };
function audio() {
  try {
    if (!AU.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      const a = AU.ctx = new C();
      AU.master = a.createGain(); AU.master.connect(a.destination);
      AU.sfx = a.createGain(); AU.sfx.connect(AU.master);
      AU.mus = a.createGain(); AU.mus.connect(AU.master);
      setVol();
    }
    if (AU.ctx.state === 'suspended' && !document.hidden) AU.ctx.resume();
  } catch (e) { }
  return AU.ctx;
}
function setVol() { if (!AU.ctx) return; AU.master.gain.value = CFG.vm / 100; AU.sfx.gain.value = CFG.vs / 100; AU.mus.gain.value = CFG.vx / 100 * .7; }
function tone(f, d, o = {}) {
  const a = AU.ctx; if (!a || a.state !== 'running' || CFG.vs <= 0 || CFG.vm <= 0) return;
  try {
    const t = a.currentTime + (o.delay || 0), os = a.createOscillator(), g = a.createGain();
    os.type = o.type || 'square'; os.frequency.setValueAtTime(f, t);
    if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(20, f + o.slide), t + d);
    const v = o.v || .05; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let n = os; if (o.bp) { const fl = a.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = o.bp; fl.Q.value = o.q || 2; os.connect(fl); n = fl; }
    n.connect(g); g.connect(o.dest || AU.sfx); os.start(t); os.stop(t + d + .05);
  } catch (e) { }
}
let NB = null;
function noise(d, o = {}) {
  const a = AU.ctx; if (!a || a.state !== 'running' || CFG.vs <= 0) return;
  try {
    if (!NB) { NB = a.createBuffer(1, a.sampleRate, a.sampleRate); const c = NB.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
    const t = a.currentTime + (o.delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = NB; f.type = o.hp ? 'highpass' : 'bandpass'; f.frequency.value = o.f || 1200; f.Q.value = o.q || 1;
    g.gain.setValueAtTime(o.v || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(o.dest || AU.sfx); s.start(t, Math.random() * .5); s.stop(t + d + .02);
  } catch (e) { }
}
const SFX = {
  ui: () => tone(700, .05, { v: .035 }),
  tab: () => tone(520, .04, { v: .03, type: 'triangle' }),
  ok: () => { tone(523, .09, { v: .04 }); tone(784, .14, { v: .04, delay: .07 }); },
  bad: () => tone(170, .16, { type: 'sawtooth', v: .035, slide: -60 }),
  pop: () => tone(500, .09, { type: 'sine', v: .09, slide: 700 }),
  place: () => { noise(.08, { f: 400, v: .08 }); tone(220, .1, { type: 'triangle', v: .07, slide: -80 }); },
  pickup: () => tone(380, .12, { type: 'sine', v: .07, slide: 400 }),
  coin: () => { tone(988, .07, { v: .035 }); tone(1319, .18, { v: .035, delay: .06 }); },
  sci: () => { tone(1200, .06, { type: 'sine', v: .05 }); tone(1600, .1, { type: 'sine', v: .04, delay: .05 }); },
  boing: () => tone(160, .35, { type: 'sine', v: .12, slide: 520 }),
  splash: () => { noise(.3, { f: 900, q: .7, v: .09 }); tone(300, .2, { type: 'sine', v: .05, slide: -150 }); },
  step: () => noise(.04, { f: 300 + Math.random() * 200, v: .025 }),
  quack: () => { for (const d of [0, .17]) tone(620, .13, { type: 'sawtooth', v: .07, slide: -260, bp: 1300, q: 3, delay: d }); },
  blop: () => { tone(300, .12, { type: 'sine', v: .1, slide: 380 }); },
  purr: () => { for (let i = 0; i < 5; i++) tone(70, .08, { type: 'sawtooth', v: .03, bp: 400, delay: i * .07 }); },
  squeak: () => tone(1500, .1, { type: 'sine', v: .05, slide: 600 }),
  hit(m) {
    if (m === 'bois') { noise(.07, { f: 700, v: .1 }); tone(180, .06, { type: 'triangle', v: .06 }); }
    else if (m === 'cristal' || m === 'glace' || m === 'bananium') { tone(1400 + Math.random() * 600, .12, { type: 'triangle', v: .05 }); noise(.05, { f: 4000, hp: 1, v: .04 }); }
    else if (m === 'fibre' || m === 'fruit' || m === 'spore' || m === 'gelee' || m === 'graine') { noise(.06, { f: 2500, v: .06 }); tone(600, .06, { type: 'sine', v: .05, slide: 300 }); }
    else { noise(.06, { f: 1800, v: .1 }); tone(420 + Math.random() * 80, .06, { v: .03 }); }
  },
  level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, { v: .045, type: 'square', delay: i * .09 })),
  fanfare: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 6 ? .5 : .16, { v: .05, type: 'square', delay: i * .12 })),
  flush: () => { noise(1.2, { f: 600, q: .5, v: .12 }); tone(400, 1, { type: 'sine', v: .04, slide: -300 }); },
  chomp: () => { noise(.06, { f: 500, v: .12 }); noise(.06, { f: 500, v: .12, delay: .12 }); },
  type: () => tone(380 + Math.random() * 120, .025, { v: .012, type: 'square' }),
};

/* ---------- musique générative (lo-fi le jour, nappes la nuit) ---------- */
const MUS = { next: 0, step: 0, style: 0, seed: 7 };
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
const PROGS = [
  [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]],
  [[2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [9, 12, 16, 19]],
];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
function mnote(f, t, d, type, v, att = .01) {
  const a = AU.ctx, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(AU.mus); o.start(t); o.stop(t + d + .05);
}
function musicTick() {
  const a = AU.ctx; if (!a || a.state !== 'running' || document.hidden || CFG.vx <= 0 || CFG.vm <= 0) return;
  const night = typeof nightness === 'function' ? nightness() > .5 : false, polka = MUS.style === 1;
  const bpm = polka ? 132 : night ? 60 : 82, sp = 60 / bpm / 2;
  if (MUS.next < a.currentTime) MUS.next = a.currentTime + .05;
  while (MUS.next < a.currentTime + .7) {
    const s = MUS.step++, prog = PROGS[(s >> 5) & 1], ch = prog[(s >> 3) & 3], i = s & 7, t = MUS.next, root = 48, r = hash2(s, 3, MUS.seed);
    if (polka) {
      if (i % 2 === 0) mnote(mf(root + ch[0] - (i % 4 ? 5 : 0)), t, .18, 'square', .05);
      else ch.slice(1).forEach(n => mnote(mf(root + 12 + n), t, .12, 'square', .018));
      if (r < .6) mnote(mf(72 + PENTA[(hash2(s, 9, 1) * 8) | 0]), t, .2, 'triangle', .05);
    } else if (night) {
      if (i === 0) ch.forEach((n, k) => mnote(mf(root + 12 + n), t + k * .05, 3.2, 'sine', .03, .6));
      if (i === 0) mnote(mf(root + ch[0] - 12), t, 2.8, 'triangle', .08, .3);
      if (r < .28) mnote(mf(72 + PENTA[(hash2(s, 5, 2) * 8) | 0]), t, 1.3, 'sine', .035, .02);
    } else {
      if (i === 0) ch.forEach((n, k) => mnote(mf(root + 12 + n), t + k * .02, 1.8, 'triangle', .022, .25));
      if (i === 0 || i === 5) mnote(mf(root + ch[0] - 12), t, .5, 'triangle', .1);
      if (i === 3) mnote(mf(root + ch[2] - 12), t, .4, 'triangle', .07);
      if (r < .55) { const n = 72 + PENTA[(hash2(s, 5, 3) * 8) | 0]; mnote(mf(n), t, .55, 'sine', .05, .005); mnote(mf(n + 12), t, .2, 'sine', .012, .005); }
      if (i % 2 === 1) noise(.03, { f: 8000, hp: 1, v: .012, dest: AU.mus, delay: t - a.currentTime });
    }
    MUS.next += sp;
  }
}
setInterval(musicTick, 150);
addEventListener('pointerdown', () => audio(), true);
addEventListener('keydown', () => audio(), true);
