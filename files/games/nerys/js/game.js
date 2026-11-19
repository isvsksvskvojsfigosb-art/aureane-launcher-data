'use strict';
/* ==========================================================
   Nérys — logique : état, sauvegarde, récolte, construction,
   énergie, terraformation, hors-ligne, créatures, événements
   ========================================================== */
const SAVE_KEY = 'nerys_save_v2';
let G = null;
const P = { x: 0, y: 0, dir: 'd', step: 0, mv: false, bub: null, bt: 30, stuck: 0, lr: 'r' };
let MOBL = [], PETL = [], DROPS = [], PARTS = [], DRONES = [];
const SHAKE = {};
const AG = { slots: BAG, prodBase: 0, solar: 0, prod: 0, cons: 0, eff: 1, rate: { o: 0, h: 0, w: 0, b: 0 }, sciRate: .1, nb: {}, comfort: 0, lights: [], mult: 1 };
const DIRS = { d: [0, 1], u: [0, -1], l: [-1, 0], r: [1, 0] };
const now = () => Date.now();

/* ---------- petites fonctions utilisées par les données ---------- */
const cnt = k => (G && G.cnt[k]) || 0;
const inc = (k, n = 1) => { G.cnt[k] = (G.cnt[k] || 0) + n; };
const stg = () => G ? G.stage : 0;
const nMobs = () => Object.keys(MOBS).filter(k => G.mobs[k]).length;
const nFish = () => Object.keys(G.fish).length;
const explored = () => W.fogN / (WW * WH);
const comfort = () => AG.comfort;
const dayN = () => Math.floor(G.tm / DAY) + 1;
const hasR = id => !id || (G && G.res.includes(id));
const nb = id => AG.nb[id] || 0;
const inv = k => G.inv[k] || 0;
/* outils : le meilleur que tu possèdes dans le sac est utilisé tout seul */
const toolTier = kind => { let t = 0; for (const k in G.inv) { const it = ITEMS[k]; if (it && it.tool === kind && G.inv[k] > 0 && it.tier > t) t = it.tier; } return t; };
const toolBonus = (kind = 'pick') => [0, 0, 1, 2, 4][toolTier(kind)] || 0;
let needT = 0;
function needTool(kind) { if (performance.now() - needT < 2500) return; needT = performance.now(); SFX.bad(); toast('Il te faut ' + TOOLN[kind], kind === 'rod' ? 'i_canne' : kind === 'axe' ? 'i_hache' : 'i_pioche', 'Sac > Fabriquer > À la main', 'bad'); floatTxt(G.x, G.y - 28, 'Il faut ' + TOOLN[kind] + ' !', '#ff8a9a'); }
const isHost = () => !G || !G.mp || (typeof MP !== 'undefined' && MP.host);
const buff = k => (G.buffs[k] || 0) > 0 || (G.buffs.all || 0) > 0;
function daylight() { return clamp(.5 + .65 * Math.cos(2 * Math.PI * (G.tm % DAY) / DAY), 0, 1); }
function nightness() { return G ? 1 - daylight() : 0; }
function clockTxt() { const p = (G.tm % DAY) / DAY, h = (p * 24 + 12) % 24, hh = h | 0, mm = ((h - hh) * 60) | 0; return `Jour ${dayN()} · ${String(hh).padStart(2, '0')}:${String(Math.floor(mm / 10) * 10).padStart(2, '0')}`; }

/* ================= NOUVELLE PARTIE / SAUVEGARDE ================= */
function blankState(who, seed) {
  return {
    v: 3, seed, who, t: now(), tm: DAY * .86, x: 0, y: 0, dir: 'd',
    inv: {}, coins: 0, sci: 0, st: { o: 0, h: 0, w: 0, b: 0 }, stage: 0, res: [], bl: {}, fl: {}, od: {}, rg: {}, pets: [],
    hats: ['none', 'casquette'], suits: ['orange', 'teal', 'blanc'], hat: 'casquette', suit: who === 'm' ? 'orange' : 'teal', helmet: true, pm: 'follow', pt: 0, px: null, py: null,
    looks: { m: { hat: who === 'm' ? 'casquette' : 'none', suit: 'orange' }, f: { hat: who === 'f' ? 'casquette' : 'none', suit: 'teal' } },
    fish: {}, mobs: {}, cnt: {}, tro: {}, disc: {}, tok: {}, shop: null, orders: [], buffs: {}, said: {}, tips: {}, radar: false, met: null, tpN: 0, clr: {},
  };
}
function newGame(who) {
  const seed = (Math.random() * 1e9) | 0;
  G = blankState(who, seed); genWorld(seed);
  G.x = W.spawn.x * TS + 8; G.y = (W.spawn.y + 2) * TS + 8;
  initRuntime();
}
function fogPack() { const b = new Uint8Array(WW * WH / 8); for (let i = 0; i < WW * WH; i++) if (W.fog[i]) b[i >> 3] |= 1 << (i & 7); let s = ''; for (let i = 0; i < b.length; i += 4096) s += String.fromCharCode.apply(null, b.subarray(i, i + 4096)); return btoa(s); }
function fogUnpack(s) { try { const t = atob(s); W.fogN = 0; for (let i = 0; i < WW * WH; i++) if ((t.charCodeAt(i >> 3) >> (i & 7)) & 1) { W.fog[i] = 1; W.fogN++; } } catch (e) { } }
/* 3 emplacements de sauvegarde (le 1er garde la clé historique) */
let SLOT = 0;
const slotKey = n => n ? 'nerys_save_s' + n : SAVE_KEY;
function saveData() { return JSON.stringify({ ...G, t: now(), px: P.x, py: P.y, fogS: fogPack() }); }
function save() {
  if (!G || G.demo) return; G.t = now(); G.px = P.x; G.py = P.y;
  if (G.mp) { if (typeof MP !== 'undefined') MP.saveMe(); return; }
  try { localStorage.setItem(slotKey(SLOT), saveData()); } catch (e) { }
}
function saveNow() { if (!G || G.demo) return; save(); SFX.ok(); toast(G.mp ? 'Progression envoyée au serveur' : 'Partie sauvegardée', 'u_star', G.mp ? '' : 'Emplacement ' + (SLOT + 1)); }
function slotRaw(n) { try { return localStorage.getItem(slotKey(n)); } catch (e) { return null; } }
function hasSave() { return [0, 1, 2].some(n => !!slotRaw(n)); }
function slotInfo(n) { const r = slotRaw(n); if (!r) return null; try { const s = JSON.parse(r); return { who: s.who, stage: s.stage || 0, day: Math.floor((s.tm || 0) / DAY) + 1, t: s.t, pt: s.pt || 0, hat: s.hat, suit: s.suit, size: r.length }; } catch (e) { return { bad: true }; } }
function deleteSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) { } }
function loadFrom(str) {
  let s; try { s = JSON.parse(str); } catch (e) { return false; }
  if (!s || !s.seed || !s.who) return false;
  G = Object.assign(blankState(s.who, s.seed), s);
  genWorld(G.seed);
  for (const i in G.od) W.o[i] = G.od[i];
  for (const i in G.bl) if (G.bl[i].ore) W.o[i] = 0;
  fogUnpack(G.fogS || ''); delete G.fogS;
  if (!s.v || s.v < 3) { // v2 -> v3 : les outils deviennent des objets à fabriquer ; on offre ceux déjà « recherchés »
    G.v = 3; const T = hasR('r_outil3') ? ['pioche_ba', 'hache_cr'] : hasR('r_outil2') ? ['pioche_cr', 'hache_cr'] : hasR('r_outil1') ? ['pioche_cu', 'hache_cu'] : ['pioche', 'hache'];
    for (const k of T) G.inv[k] = 1; if (hasR('r_peche')) G.inv.canne = 1;
  }
  initRuntime(); return true;
}
function load(n = SLOT) { SLOT = n; try { return loadFrom(slotRaw(n)); } catch (e) { return false; } }

function initRuntime() {
  MOBL = []; DROPS = []; PARTS = []; DRONES = []; P.x = G.px != null ? G.px : G.x + 16; P.y = G.py != null ? G.py : G.y + 2; P.bt = 25; P.mv = false;
  if (!G.looks) G.looks = { m: { hat: 'none', suit: 'orange' }, f: { hat: 'none', suit: 'teal' } };
  recount(); updateV(G.st); unstick(); spawnPets(); reveal(G.x / TS | 0, G.y / TS | 0, 10);
  if (!G.orders.length) ordersTick();
}

/* ================= INVENTAIRE ================= */
function add(k, n, quiet) {
  if (n <= 0) return 0;
  const cur = G.inv[k] || 0, a = Math.max(0, Math.min(room(k), n));
  if (a > 0) {
    G.inv[k] = cur + a; inc('got_' + k, a);
    if (!G.disc['i_' + k]) { G.disc['i_' + k] = 1; G.sci += 2; if (!quiet) toast(`Nouveau : ${ITEMS[k].n}`, 'i_' + k, '+2 science'); }
  }
  if (a < n && !quiet) fullWarn(k);
  return a;
}
let fullT = 0;
function fullWarn(k) { if (performance.now() - fullT < 4000) return; fullT = performance.now(); SFX.bad(); toast('Sac plein ! (' + ITEMS[k].n + ')', 'u_bag', 'Jette ou vends des objets, ou construis des caisses de rangement', 'bad'); }
/* sac à emplacements : 99 par emplacement (outils : 1) */
function slotsUsed() { let s = 0; for (const k in G.inv) if (G.inv[k] > 0) s += Math.ceil(G.inv[k] / stackOf(k)); return s; }
function room(k) { const st = stackOf(k), c = inv(k), free = Math.max(0, AG.slots - slotsUsed()); return free * st + (c % st ? st - c % st : 0); }
const canPay = c => Object.entries(c || {}).every(([k, v]) => inv(k) >= v);
const pay = c => Object.entries(c || {}).forEach(([k, v]) => { G.inv[k] = inv(k) - v; if (G.inv[k] <= 0) delete G.inv[k]; });
const refund = c => Object.entries(c || {}).forEach(([k, v]) => { G.inv[k] = inv(k) + v; });
function itemSource(k) {
  const where = { fer: [0, 4], cuivre: [3], cristal: [2], bois: [1], fibre: [0, 3, 2], gelee: [3], glace: [4], soufre: [5], fruit: [0, 1], spore: [1], graine: [0, 3, 1], bananium: [5, 2] }[k];
  if (!where) return ITEMS[k].cr ? 'Se fabrique' : k === 'poisson' ? 'Se pêche dans les lacs' : '';
  const tx = G.x / TS, ty = G.y / TS; let best = null;
  for (const b of where) { const n = nearestSeed(b, tx, ty); if (n && (!best || n.d < best.d)) best = { ...n, b }; }
  if (!best) return '';
  const here = W.b[tI(tx | 0, ty | 0)] === best.b;
  return BIOMES[best.b].n + (here ? ' (ici !)' : ', ' + compass(tx, ty, best.s.x, best.s.y) + ' (~' + Math.round(best.d / 10) * 10 + ' pas)');
}

/* ================= AGRÉGATS (constructions) ================= */
function recount() {
  const nbm = {}; let slots = BAG, prod = 0, solar = 0, cons = 0, com = 0; const lights = [];
  for (const i in G.bl) {
    const b = G.bl[i], d = BLD[b.id]; if (!d) continue; nbm[b.id] = (nbm[b.id] || 0) + 1;
    if (d.slots) slots += d.slots;
    if (d.pw > 0) { if (d.solar) solar += d.pw; else prod += d.pw; } else if (d.pw < 0) cons -= d.pw;
    if (d.ch) com += d.ch;
    if (d.light || d.pw || d.tf) lights.push(+i);
  }
  AG.nb = nbm; AG.slots = slots; AG.prodBase = prod; AG.solar = solar; AG.cons = cons; AG.comfort = com; AG.lights = lights;
  AG.mult = 1 + (hasR('r_boost1') ? .25 : 0) + (hasR('r_boost2') ? .5 : 0) + (hasR('r_boost3') ? 1 : 0);
  power(daylight()); rates();
}
function power(dl) { AG.prod = AG.prodBase + AG.solar * (dl > .3 ? 1 : dl / .3); AG.eff = AG.cons > 0 ? Math.min(1, AG.prod / AG.cons) : 1; return AG.eff; }
function treeGrown(b) { return now() - b.t >= BLD.arbre.grow * 1000; }
function rates() {
  const r = { o: 0, h: 0, w: 0, b: 0 }; let sci = .05;
  for (const i in G.bl) {
    const b = G.bl[i], d = BLD[b.id];
    if (d.tf) { const k = d.grow ? (treeGrown(b) ? 1 : 0) : AG.eff; for (const s in d.tf) r[s] += d.tf[s] * k; }
    if (d.sci) sci += d.sci * AG.eff;
  }
  const m = AG.mult * (1 + Math.min(.5, AG.comfort / 600));
  for (const s in r) r[s] *= m;
  AG.rate = r; AG.sciRate = sci;
}
function comfortBonus() { return Math.min(.5, AG.comfort / 600); }

/* ================= STADES ================= */
function calcStage() {
  let n = G.stage; const s = G.st;
  for (; ;) { const t = stageThr(n + 1); if (s.o + s.h + s.w + s.b >= t && Math.min(s.o, s.h, s.w, s.b) >= t / 8) n++; else break; }
  return n;
}
function stageProgress() {
  const n = G.stage, a = stageThr(n), t = stageThr(n + 1), s = G.st, tot = s.o + s.h + s.w + s.b;
  const p1 = clamp((tot - a) / (t - a), 0, 1), p2 = clamp(Math.min(s.o, s.h, s.w, s.b) / (t / 8), 0, 1);
  return { p: Math.min(p1, p2), tot, need: t, lag: p2 < p1 ? ['o', 'h', 'w', 'b'].reduce((m, k) => s[k] < s[m] ? k : m, 'o') : null };
}
function checkStage(quiet) {
  const n = calcStage(); if (n <= G.stage) return;
  while (G.stage < n) {
    G.stage++; const st = G.stage, sci = Math.round(10 * Math.pow(2, st)), coins = 25 * st;
    G.sci += sci; G.coins += coins;
    if (!quiet) { stageUp(st, sci, coins); }
  }
  updateV(G.st); recount();
}

/* ================= TICK PRINCIPAL ================= */
let tAcc = 0, tAcc2 = 0, tAcc3 = 0, droneAcc = 0;
function gameTick(dt) {
  G.tm += dt; G.pt = (G.pt || 0) + dt;
  for (const k in G.buffs) { G.buffs[k] -= dt; if (G.buffs[k] <= 0) delete G.buffs[k]; }
  tAcc += dt; if (tAcc >= .25) { if (isHost()) machines(tAcc, false); else { power(daylight()); rates(); } tAcc = 0; }
  tAcc2 += dt; if (tAcc2 >= 1) { tAcc2 = 0; if (updateV(G.st)) { unstick(); renderMap(); } }
  tAcc3 += dt; if (tAcc3 >= 2) { tAcc3 = 0; if (isHost()) { respawnTick(); natureTick(); ordersTick(); } trophyCheck(); eventsTick(2); tipsTick(); }
}
function machines(dt, off) {
  power(off ? .5 : daylight()); rates();
  for (const s in AG.rate) G.st[s] += AG.rate[s] * dt;
  G.sci += AG.sciRate * dt;
  const eff = AG.eff;
  for (const i in G.bl) {
    const b = G.bl[i], d = BLD[b.id];
    if (d.rate && b.ore) b.b = Math.min(d.buf, (b.b || 0) + d.rate * dt * eff);
    else if (b.id === 'niche' && b.pet != null && G.pets[b.pet]) b.b = Math.min(20, (b.b || 0) + dt / 60 * (G.pets[b.pet].gold ? 2 : 1));
  }
  droneAcc += dt; if (droneAcc >= 4 || off) { droneAcc = 0; drones(off); }
  checkStage(off);
}
function bufItem(b) {
  if (b.ore) return OBJ[b.ore].it;
  if (b.id === 'niche' && b.pet != null && G.pets[b.pet]) return MOBS[G.pets[b.pet].sp].drop;
  return null;
}
const CROPS = { fruit: [180, 6], fibre: [180, 8], bois: [300, 6], spore: [300, 6], gelee: [360, 4], glace: [360, 4] };
function cropReady(b) { return b.crop && now() >= b.crop.t0 + b.crop.d * 1000; }
function harvestCrop(i, auto) {
  const b = G.bl[i]; if (!cropReady(b)) return 0;
  const k = b.crop.k, n = CROPS[k][1] + (auto ? 0 : toolBonus('axe')), a = add(k, n, auto);
  if (Math.random() < .5) add('graine', 1, true);
  inc('crop'); b.crop = null;
  if (auto && inv('graine') > 0) { G.inv.graine--; plantCrop(i, k); }
  return a;
}
function plantCrop(i, k) { const b = G.bl[i]; b.crop = { k, t0: now(), d: CROPS[k][0] * (b.fert ? .5 : 1) }; b.fert = 0; }
function drones(off) {
  for (const hi in G.bl) {
    if (G.bl[hi].id !== 'ruche') continue;
    const hx = hi % WW, hy = hi / WW | 0, R = BLD.ruche.rad;
    for (const i in G.bl) {
      const b = G.bl[i], tx = i % WW, ty = i / WW | 0; if (tdist(hx, hy, tx, ty) > R) continue;
      let got = 0, it = null;
      if (b.b >= 1) { it = bufItem(b); if (it) { const n = Math.floor(b.b), a = add(it, n, true); b.b -= a; got = a; } }
      else if (b.id === 'jardin' && cropReady(b)) { it = b.crop.k; got = harvestCrop(+i, true); }
      if (got > 0 && !off && DRONES.length < 12) DRONES.push({ fx: tx * TS + 8, fy: ty * TS, tx: hx * TS + 8, ty: hy * TS - 6, t: 0, it });
    }
  }
}

/* ================= HORS-LIGNE ================= */
function offline() {
  const cap = (hasR('r_absence') ? 24 : 8) * 3600, dt = Math.min(cap, (now() - G.t) / 1000);
  if (dt < 45) return null;
  const st0 = { ...G.st }, sci0 = G.sci, stage0 = G.stage, inv0 = { ...G.inv };
  machines(dt, true); G.tm += dt;
  const got = {}; for (const k in G.inv) { const d = (G.inv[k] || 0) - (inv0[k] || 0); if (d > 0) got[k] = d; }
  return { dt, full: (now() - G.t) / 1000 > cap, st: Object.fromEntries(Object.keys(st0).map(k => [k, G.st[k] - st0[k]])), sci: G.sci - sci0, stages: G.stage - stage0, got };
}

/* ================= DÉPLACEMENTS ================= */
function solidAt(tx, ty) {
  const i = tI(tx, ty), k = tkind(i); if (k === 2 || k === 3) return true;
  const o = W.o[i]; if (o && OBJ[o].solid) return true;
  const b = G.bl[i]; if (b) { const d = BLD[b.id]; if (d && d.solid !== 0) return true; }
  return false;
}
function blocked(x, y) {
  return solidAt(Math.floor((x - 4) / TS), Math.floor((y - 3) / TS)) || solidAt(Math.floor((x + 4) / TS), Math.floor((y - 3) / TS)) ||
    solidAt(Math.floor((x - 4) / TS), Math.floor((y + 1) / TS)) || solidAt(Math.floor((x + 4) / TS), Math.floor((y + 1) / TS));
}
function unstick() {
  if (!blocked(G.x, G.y)) return;
  const tx = Math.floor(G.x / TS), ty = Math.floor(G.y / TS);
  for (let r = 1; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = (tx + dx) * TS + 8, y = (ty + dy) * TS + 9;
    if (!blocked(x, y)) { G.x = (x + WP) % WP; G.y = (y + HP) % HP; return; }
  }
}
function speed() { return 74 * (1 + (hasR('r_bottes') ? .25 : 0) + (hasR('r_trotti') ? .4 : 0)) * (buff('speed') ? 1.4 : 1); }
let stepAcc = 0, lastTile = -1;
function playerMove(dt, ix, iy) {
  let l = Math.hypot(ix, iy); G.mv = l > .15;
  if (!G.mv) return;
  if (l > 1) { ix /= l; iy /= l; l = 1; }
  const k = tkind(tI(G.x / TS | 0, G.y / TS | 0)), v = speed() * (k === 1 ? .65 : 1) * dt * Math.max(.45, l);
  const ox = G.x, oy = G.y;
  if (!blocked(G.x + ix * v, G.y)) G.x += ix * v;
  if (!blocked(G.x, G.y + iy * v)) G.y += iy * v;
  G.x = (G.x + WP) % WP; G.y = (G.y + HP) % HP;
  const ax = Math.abs(ix), ay = Math.abs(iy);
  if (ax > ay * 1.15) G.dir = ix < 0 ? 'l' : 'r'; else if (ay > ax * 1.15) G.dir = iy < 0 ? 'u' : 'd';
  if (ix) G.lr = ix < 0 ? 'l' : 'r';
  const d = Math.hypot(wrapD(G.x - ox), wrapD(G.y - oy)); G.step = (G.step || 0) + d; stepAcc += d; inc('walk', d / TS);
  if (stepAcc > 15) { stepAcc = 0; if (k === 1) { SFX.splash(); puff(G.x, G.y, '#bff0ff', 3); } else SFX.step(); }
  const ti = tI(G.x / TS | 0, G.y / TS | 0); if (ti !== lastTile) { lastTile = ti; reveal(G.x / TS | 0, G.y / TS | 0, 9); }
}

/* ================= COMPAGNON ================= */
function partnerUpdate(dt) {
  if (G.mp) return;
  if (G.pm === 'stay') { P.mv = false; if (P.bub) { P.bub.t -= dt; if (P.bub.t <= 0) P.bub = null; } return; }
  const dx = wrapD(G.x - P.x), dy = wrapD(G.y - P.y), d = Math.hypot(dx, dy);
  if (d > 220) { P.x = G.x - 14; P.y = G.y + 2; P.mv = false; }
  else if (d > 28) {
    const sp = Math.min(speed() * 1.1, d * 2.6) * dt, ux = dx / d, uy = dy / d, ox = P.x, oy = P.y;
    if (!blocked(P.x + ux * sp, P.y)) P.x += ux * sp;
    if (!blocked(P.x, P.y + uy * sp)) P.y += uy * sp;
    const mv = Math.hypot(P.x - ox, P.y - oy); P.mv = mv > .01; P.step += mv;
    if (!P.mv) { P.stuck += dt; if (P.stuck > 1.2) { P.x = G.x; P.y = G.y; P.stuck = 0; } } else P.stuck = 0;
    const ax = Math.abs(ux), ay = Math.abs(uy); P.dir = ax > ay ? (ux < 0 ? 'l' : 'r') : (uy < 0 ? 'u' : 'd');
  } else P.mv = false;
  P.x = (P.x + WP) % WP; P.y = (P.y + HP) % HP;
  if (P.bub) { P.bub.t -= dt; if (P.bub.t <= 0) P.bub = null; }
  P.bt -= dt;
  if (P.bt <= 0) {
    P.bt = rand(50, 100); const b = W.b[tI(G.x / TS | 0, G.y / TS | 0)];
    const pool = nightness() > .6 ? SAY_NIGHT : Math.random() < .4 ? SAY_BIOME[b] : SAY_IDLE;
    bubble(pick(pool));
  }
}
function bubble(txt, t = 5) { if (G && G.mp) return; P.bub = { txt, t }; }
/* le compagnon : « reste ici » / « suis-moi » */
function partnerToggle() {
  if (!G || G.mp || G.demo) return;
  G.pm = G.pm === 'stay' ? 'follow' : 'stay'; SFX.tab();
  const near = Math.hypot(wrapD(G.x - P.x), wrapD(G.y - P.y)) < 200;
  if (near) bubble(G.pm === 'stay' ? pick(['OK, je reste là. Je compte les cailloux.', 'Je t’attends ici. Ramène-moi un truc !', 'Je garde la base. Personne ne passera. Sauf les canards.']) : pick(['J’arrive !', 'On y va ! Attends-moi !', 'Je te suis, chef.']));
  toast(NM[G.who === 'm' ? 'f' : 'm'] + (G.pm === 'stay' ? ' reste ici' : ' te suit'), 'u_heart', G.pm === 'stay' ? 'Tu peux la·le retrouver sur la carte' : '');
  if (G.pm === 'follow' && !near) { P.x = G.x - 14; P.y = G.y + 2; }
  hud(true);
}
/* changer de personnage : on prend le contrôle de l'autre astronaute (là où il est) */
function switchChar() {
  if (!G || G.mp || G.demo || blocking()) return;
  const o = G.who === 'm' ? 'f' : 'm';
  G.looks[G.who] = { hat: G.hat, suit: G.suit };
  const x = G.x, y = G.y, d = G.dir; G.x = P.x; G.y = P.y; G.dir = P.dir || 'd'; P.x = x; P.y = y; P.dir = d; P.mv = false;
  G.who = o; const L = G.looks[o] || {}; G.hat = L.hat || 'none'; G.suit = L.suit || (o === 'm' ? 'orange' : 'teal');
  unstick(); lastTile = -1; reveal(G.x / TS | 0, G.y / TS | 0, 9); BUILD = null; buildBar();
  SFX.pop(); puff(G.x, G.y - 10, '#ffffff', 8); toast('Tu joues ' + NM[o], 'u_heart', NM[G.who === 'm' ? 'f' : 'm'] + (G.pm === 'stay' ? ' reste sur place' : ' te suit')); hud(true);
}

/* ================= CRÉATURES ================= */
let spawnAcc = 0;
function mobSpecies(b) { return Object.keys(MOBS).filter(k => { const m = MOBS[k]; if (!m.b.includes(b)) return false; if (m.st && G.stage < m.st) return false; if (m.night) return nightness() > .55; return true; }); }
function mobsUpdate(dt) {
  spawnAcc += dt;
  if (spawnAcc > 1.2) {
    spawnAcc = 0;
    MOBL = MOBL.filter(m => Math.hypot(wrapD(m.x - G.x), wrapD(m.y - G.y)) < 30 * TS && !(m.sp === 'meduse' && nightness() < .3 && Math.random() < .1));
    if (MOBL.length < 9) {
      const a = Math.random() * 6.283, r = rand(11, 18) * TS, x = (G.x + Math.cos(a) * r + WP) % WP, y = (G.y + Math.sin(a) * r + HP) % HP;
      const tx = x / TS | 0, ty = y / TS | 0, i = tI(tx, ty);
      if (tkind(i) === 0 && !solidAt(tx, ty) && !G.bl[i] && !G.fl[i]) {
        const sp = mobSpecies(W.b[i]); if (sp.length) {
          const s = pick(sp), gold = Math.random() < (buff('luck') ? 1 / 20 : 1 / 60);
          MOBL.push({ sp: s, gold, x: tx * TS + 8, y: ty * TS + 10, t: 0, vx: 0, vy: 0, love: 0, cd: 0, at: Math.random() * 9, face: 1, seen: false });
        }
      }
    }
  }
  for (const m of MOBL) mobStep(m, dt, null);
  for (const m of PETL) mobStep(m, dt, m.home);
}
function mobStep(m, dt, home) {
  m.at += dt; m.t -= dt; if (m.cd > 0) m.cd -= dt; if (m.hop > 0) m.hop -= dt;
  const dxp = wrapD(G.x - m.x), dyp = wrapD(G.y - m.y), dp = Math.hypot(dxp, dyp);
  if (m.gold && !m.seen && dp < 120) { m.seen = true; inc('goldseen'); toast(`Un ${MOBS[m.sp].n} DORÉ !`, 'u_star', 'Caresse-le vite', 'gold'); }
  if (m.t <= 0) {
    m.t = rand(1, 3.2);
    if (home) { const hx = wrapD(home.x - m.x), hy = wrapD(home.y - m.y); if (Math.hypot(hx, hy) > 40) { const l = Math.hypot(hx, hy); m.vx = hx / l * 16; m.vy = hy / l * 16; return; } }
    if (Math.random() < .45) { m.vx = m.vy = 0; }
    else if (dp < 50 && Math.random() < .4) { m.vx = dxp / dp * 12; m.vy = dyp / dp * 12; }
    else { const a = Math.random() * 6.283; m.vx = Math.cos(a) * 16; m.vy = Math.sin(a) * 16; }
  }
  if (dp < 18) { m.vx *= .8; m.vy *= .8; }
  const fly = m.sp === 'meduse', nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
  if (fly || !blocked(nx, m.y)) m.x = nx; else m.vx = -m.vx;
  if (fly || !blocked(m.x, ny)) m.y = ny; else m.vy = -m.vy;
  m.x = (m.x + WP) % WP; m.y = (m.y + HP) % HP;
  if (Math.abs(m.vx) > 1) m.face = m.vx > 0 ? 1 : -1; else if (dp < 60) m.face = dxp > 0 ? 1 : -1;
  m.mv = Math.abs(m.vx) + Math.abs(m.vy) > 2;
}
function spawnPets() {
  PETL = [];
  G.pets.forEach((p, k) => {
    let home = null; for (const i in G.bl) if (G.bl[i].id === 'niche' && G.bl[i].pet === k) home = { x: (i % WW) * TS + 8, y: (i / WW | 0) * TS + 20 };
    if (!home) home = { x: W.spawn.x * TS + 8, y: (W.spawn.y + 3) * TS };
    PETL.push({ sp: p.sp, gold: p.gold, name: p.name, pet: k, x: home.x + rand(-10, 10), y: home.y + rand(-4, 8), home, t: 0, vx: 0, vy: 0, love: 5, cd: 0, at: Math.random() * 9, face: 1, seen: true });
  });
}
function petMob(m) {
  const S2 = { blobo: 'blop', canardo: 'quack', lavachat: 'purr', pingou: 'squeak', cristaloup: 'squeak', champi: 'blop', meduse: 'pop' }[m.sp];
  SFX[S2] ? SFX[S2]() : SFX.pop(); vib(10);
  m.hop = .35; m.vx = m.vy = 0; m.t = 1.5; inc('pet');
  hearts(m.x, m.y - 12);
  const key = m.sp + (m.gold ? '_g' : '');
  if (!G.mobs[m.sp]) { G.mobs[m.sp] = 1; G.sci += 10; toast(`Nouvelle créature : ${MOBS[m.sp].n}`, 'm_' + m.sp + '_0', '+10 science'); }
  if (m.gold && !G.mobs[key]) { G.mobs[key] = 1; G.sci += 30; toast(`${MOBS[m.sp].n} doré ajouté au bestiaire !`, 'u_star', '+30 science', 'gold'); }
  if (m.pet == null) m.love = Math.min(5, m.love + 1);
  if (m.cd <= 0 && Math.random() < .4) { m.cd = 5; drop(m.x, m.y - 6, MOBS[m.sp].drop, m.gold ? 3 : 1); }
}
function freeNiche() { for (const i in G.bl) if (G.bl[i].id === 'niche' && (G.bl[i].pet == null || !G.pets[G.bl[i].pet])) return +i; return -1; }
function adopt(m) {
  if (!hasR('r_niche')) { toast('Il faut la recherche « Apprivoisement »', 'u_lock', '', 'bad'); return; }
  const n = freeNiche(); if (n < 0) { toast('Construis une niche libre d’abord', 'b_niche', '', 'bad'); SFX.bad(); return; }
  if (inv('fruit') < 1) { toast('Il faut 1 fruit-bulle pour l’adopter', 'i_fruit', '', 'bad'); SFX.bad(); return; }
  G.inv.fruit--; const name = pick(PET_NAMES);
  G.pets.push({ sp: m.sp, gold: m.gold, name }); G.bl[n].pet = G.pets.length - 1; G.bl[n].b = 0;
  MOBL = MOBL.filter(x => x !== m); inc('tame'); spawnPets(); SFX.fanfare(); hearts(m.x, m.y - 12); hearts(m.x, m.y - 18);
  toast(`${name} le ${MOBS[m.sp].n} est adopté !`, 'u_heart', 'Il file à sa niche produire : ' + ITEMS[MOBS[m.sp].drop].n);
  save();
}

/* ================= OBJETS AU SOL ================= */
function drop(x, y, k, n) { DROPS.push({ x, y, k, n, z: 6, vz: rand(40, 70), vx: rand(-20, 20), vy: rand(-10, 10), t: 0 }); }
function dropsUpdate(dt) {
  for (const d of DROPS) {
    d.t += dt; if (d.z > 0 || d.vz > 0) { d.vz -= 240 * dt; d.z = Math.max(0, d.z + d.vz * dt); d.x += d.vx * dt; d.y += d.vy * dt; if (d.z === 0 && d.vz < 0) { d.vz = Math.abs(d.vz) > 40 ? -d.vz * .35 : 0; d.vx *= .5; d.vy *= .5; } }
    const dx = wrapD(G.x - d.x), dy = wrapD(G.y - 4 - d.y), l = Math.hypot(dx, dy);
    if (d.t > .5 && l < 40) { const s = Math.min(l, (60 + d.t * 60) * dt); d.x += dx / l * s; d.y += dy / l * s; }
    if (d.t > .5 && l < 8) {
      d.dead = 1;
      if (d.k === 'duck') { G.coins += 3; inc('ducks'); inc('coins', 3); SFX.quack(); floatTxt(G.x, G.y - 26, '+3', '#ffd23f', 'u_coin'); }
      else { const a = add(d.k, d.n); if (a) { SFX.pickup(); floatTxt(G.x, G.y - 26, '+' + a, ITEMS[d.k].c, 'i_' + d.k); } }
    }
    if (d.t > 120) d.dead = 1;
  }
  DROPS = DROPS.filter(d => !d.dead);
}

/* ================= RÉCOLTE / INTERACTIONS ================= */
function tileCenter(i) { return [(i % WW) * TS + 8, (i / WW | 0) * TS + 10]; }
function findTarget() {
  const px = G.x, py = G.y - 4, f = DIRS[G.dir]; let best = null, bs = 1e9;
  const con = (t, x, y, r) => { const dx = wrapD(x - px), dy = wrapD(y - py), d = Math.hypot(dx, dy); if (d > r) return; const s = d - (dx * f[0] + dy * f[1]) / (d || 1) * 9; if (s < bs) { bs = s; best = t; } };
  for (const m of MOBL) con({ k: 'mob', m }, m.x, m.y - 5, 24);
  for (const m of PETL) con({ k: 'mob', m }, m.x, m.y - 5, 22);
  if (!G.mp) { const dx = wrapD(P.x - px), dy = wrapD(P.y - 5 - py), d = Math.hypot(dx, dy); if (d < 18 && d + 12 < bs) { bs = d + 12; best = { k: 'partner' }; } }
  const tx = Math.floor(G.x / TS), ty = Math.floor((G.y - 4) / TS);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const i = tI(tx + dx, ty + dy), [cx, cy] = tileCenter(i), X = (tx + dx) * TS + 8, Y = (ty + dy) * TS + 10;
    const b = G.bl[i]; if (b && !BLD[b.id].floor && !BLD[b.id].wall) { con({ k: 'bld', i }, X, Y, 24); continue; }
    const o = W.o[i]; if (o && (OBJ[o].h || OBJ[o].special)) con({ k: 'obj', i }, X, Y, o === 23 ? 34 : 24);
  }
  if (!best && toolTier('rod')) {
    for (const r of [14, 22]) { const i = tI(Math.floor((G.x + f[0] * r) / TS), Math.floor((G.y - 3 + f[1] * r) / TS)); if (isWaterK(tkind(i))) { best = { k: 'fish', i }; break; } }
  }
  return best;
}
function targetLabel(t) {
  if (!t) return '';
  if (t.k === 'mob') return t.m.pet != null ? 'Câlin' : t.m.love >= 5 && hasR('r_niche') ? 'Adopter' : 'Caresser';
  if (t.k === 'partner') return 'Parler';
  if (t.k === 'fish') return 'Pêcher';
  if (t.k === 'bld') {
    const b = G.bl[t.i], d = BLD[b.id];
    if (b.id === 'jardin') return cropReady(b) ? 'Récolter' : b.crop ? 'Voir' : 'Planter';
    if (b.b >= 1) return 'Collecter';
    if (d.st) return 'Fabriquer';
    if (b.id === 'arbre') return 'Admirer';
    return d.act ? { sleep: 'Dormir', tv: 'Regarder', boing: 'Sauter', flush: 'Tirer', piano: 'Jouer', juke: 'Musique', arcade: 'Jouer', disco: 'Danser', chomp: 'Nourrir', quack: 'Caresser', sock: 'Renifler', purr: 'Câliner' }[d.act] || 'Utiliser' : 'Ouvrir';
  }
  const o = W.o[t.i], d = OBJ[o];
  if (d.special === 'cap') return 'Ouvrir';
  if (d.special === 'mono' || d.special === 'mono2') return 'Vénérer';
  if (d.special === 'wreck') return 'Épave';
  return 'Récolter';
}
function act(t) {
  if (!t) return false;
  if (t.k === 'mob') { if (t.m.pet == null && t.m.love >= 5 && hasR('r_niche')) adopt(t.m); else petMob(t.m); return true; }
  if (t.k === 'partner') { talkPartner(); return true; }
  if (t.k === 'fish') { if (!toolTier('rod')) { needTool('rod'); return true; } startFishing(t.i); return true; }
  if (t.k === 'bld') { useBuilding(t.i); return true; }
  if (t.k === 'obj') { hit(t.i); return true; }
  return false;
}
function hit(i) {
  const o = W.o[i], d = OBJ[o]; if (!d) return;
  const [x, y] = tileCenter(i);
  if (d.special === 'wreck') { openWreck(); return; }
  if (d.special === 'cap') { openCapsule(i); return; }
  if (d.special === 'mono' || d.special === 'mono2') { monolith(i); return; }
  if (d.tool && !toolTier(d.tool)) { needTool(d.tool); SHAKE[i] = .12; return; }
  SHAKE[i] = .25; inc('hits'); vib(8);
  W.hp[i]++;
  if (d.it) {
    let n = d.y + (d.tool ? toolBonus(d.tool) : 0); if (buff('harvest') || G.buffs.rainbow > 0) n *= 2;
    const a = add(d.it, n); if (a) floatTxt(x, y - 18, '+' + a, ITEMS[d.it].c, 'i_' + d.it);
    SFX.hit(d.it); chips(x, y - 6, ITEMS[d.it].c);
    if (d.seed && Math.random() < d.seed) { add('graine', 1, true); }
  } else { SFX.hit('rock'); chips(x, y - 6, '#9a90b8'); }
  if (W.hp[i] >= (d.h || 1)) {
    W.hp[i] = 0;
    if (d.loot) for (const [k, p] of d.loot) if (Math.random() < p) drop(x, y - 4, k, 1 + toolBonus(d.tool || 'pick'));
    if (d.special === 'meteor') { const got = loot(1.5, 'meteor'); lootToast('Météorite', got); G.met = null; }
    const nw = d.left || 0; W.o[i] = nw; G.od[i] = nw;
    if (d.rg) G.rg[i] = now() + d.rg * 1000 * rand(.8, 1.2);
    else if (W.o0[i] === nw) delete G.od[i];
    puff(x, y - 4, '#ffffff', 5); dirtyMapAt(i);
  }
}
function dirtyMapAt(i) { const x = MAPC.getContext('2d'); x.fillStyle = W.o[i] ? '#000' : (tileLook(i) || PAL.bed)[1]; if (!W.o[i]) x.fillRect(i % WW, i / WW | 0, 1, 1); }
function respawnTick() {
  const t = now(), ptx = Math.floor(G.x / TS), pty = Math.floor(G.y / TS);
  for (const k in G.rg) {
    if (G.rg[k] > t) continue; const i = +k;
    if (G.bl[i] || G.fl[i] || (Math.abs((i % WW) - ptx) <= 1 && Math.abs((i / WW | 0) - pty) <= 1)) { G.rg[k] = t + 30000; continue; }
    W.o[i] = W.o0[i]; delete G.od[i]; delete G.rg[k];
  }
}
function natureTick() {
  if (G.stage < 3 || cnt('nat') > 2500) return;
  for (let k = 0; k < 3; k++) {
    const tx = (G.x / TS | 0) + ri(-26, 26), ty = (G.y / TS | 0) + ri(-18, 18), i = tI(tx, ty);
    if (W.o[i] || G.bl[i] || G.fl[i] || G.clr[i] || tkind(i) !== 0 || W.g[i] / 255 >= V.gc) continue;
    if (Math.abs(tx - G.x / TS) < 12 && Math.abs(ty - G.y / TS) < 8) continue;
    const tree = G.stage >= 8 && Math.random() < .3;
    if (!tree && Math.random() < .5) continue;
    W.o[i] = tree ? 22 : 21; G.od[i] = W.o[i]; inc('nat');
  }
}

/* ================= CAPSULES, STATUES, ÉPAVE ================= */
function loot(scale, src) {
  const st = G.stage, got = [], pool = ['fer', 'cuivre', 'cristal', 'bois', 'fibre', 'gelee', 'glace', 'soufre', 'fruit', 'spore', 'graine'];
  for (let n = ri(2, 3); n > 0; n--) { const k = pick(pool), q = Math.round(rand(5, 11) * (1 + st * .5) * scale); got.push(['i_' + k, add(k, q, true), ITEMS[k].n]); }
  if (st >= 4 && Math.random() < .35) { const q = ri(1, 3); got.push(['i_bananium', add('bananium', q, true), 'Bananium']); }
  const c = Math.round(ri(10, 30) * (1 + st * .3) * scale), s = Math.round(ri(5, 12) * (1 + st * .6) * scale);
  G.coins += c; inc('coins', c); G.sci += s; got.push(['u_coin', c, 'pièces'], ['u_sci', s, 'science']);
  if (src === 'cap' && Math.random() < .3) { const h = HATS.filter(h => h[2] === 'cap' && !G.hats.includes(h[0])); if (h.length) { const k = pick(h); G.hats.push(k[0]); got.push(['h_' + k[0], 1, 'Chapeau : ' + k[1]]); } }
  if (Math.random() < .12) { const d = pick(DECO.filter(d => d[5] && d[5].shop)); G.tok[d[0]] = (G.tok[d[0]] || 0) + 1; got.push(['b_' + d[0], 1, d[1]]); }
  return got;
}
function openCapsule(i) {
  W.o[i] = 0; G.od[i] = 0; inc('cap'); SFX.fanfare(); vib(30);
  const [x, y] = tileCenter(i); puff(x, y - 6, '#ffd23f', 12); confettiAt(x, y - 10);
  lootToast('Capsule de fret', loot(1, 'cap')); save();
}
function monolith(i) {
  const [x, y] = tileCenter(i);
  if (W.o[i] === 24) { SFX.quack(); floatTxt(x, y - 30, 'Coin.', '#ffd23f'); return; }
  W.o[i] = 24; G.od[i] = 24; inc('mono'); SFX.quack(); setTimeout(SFX.fanfare, 400);
  const s = Math.round(40 * (1 + G.stage)); G.sci += s; G.coins += 40;
  confettiAt(x, y - 20);
  const n = cnt('mono');
  dialog([['', `La statue de canard s’illumine. Un « coin » profond résonne dans ta poitrine. (${n}/8)`], ['{p}', pick(['Je crois qu’on vient de rejoindre une secte. Une secte sympa.', 'Elle m’a fait un clin d’œil. Je te jure.', 'Coin. Coin coin. … Désolé, c’est sorti tout seul.', 'Qui a construit ça ? Des canards géants ? DES CANARDS GÉANTS ?'])], ['', `+${s} science, +40 pièces.`]]);
  save();
}

/* ================= CONSTRUCTION ================= */
function bldCount(id) { return nb(id); }
function isUnlocked(id) { const d = BLD[id]; return hasR(d.r) && (!d.shop || (G.tok[id] || 0) > 0 || nb(id) > 0); }
function costOf(id) { return BLD[id].c || {}; }
function canAfford(id) { const d = BLD[id]; return d.shop ? (G.tok[id] || 0) > 0 : canPay(d.c); }
function placeErr(id, tx, ty) {
  const d = BLD[id], i = tI(tx, ty), k = tkind(i), o = W.o[i];
  if (!isUnlocked(id)) return 'Pas encore débloqué';
  if (d.max && nb(id) >= d.max) return 'Une seule possible';
  if (!canAfford(id)) return 'Il manque des ressources';
  if (d.floor) { if (k !== 0 && k !== 5) return 'Pas sur l’eau'; if (G.fl[i] === id) return 'Déjà posé'; if (o && OBJ[o].solid) return 'Il y a un obstacle'; return ''; }
  if (G.bl[i]) return 'Déjà occupé';
  if (k === 2 || k === 3) return 'Pas sur l’eau';
  if (d.on === 'ore') { if (!o || !OBJ[o].ore) return 'À poser sur un filon'; }
  else if (o && o !== 21 && o !== 5 && o !== 7) return 'Il y a un obstacle';
  if (d.on === 'volcan' && W.b[i] !== 5) return 'Seulement sur un volcan';
  const solid = d.solid !== 0;
  if (solid) {
    const pt = (x, y) => Math.floor(x / TS) === (tx & WM) && Math.floor(y / TS) === (ty & WM);
    const ptx = (G.x + WP) % WP, pty = (G.y + HP) % HP;
    for (const [ox, oy] of [[-4, -3], [4, -3], [-4, 1], [4, 1]]) if (pt((ptx + ox + WP) % WP, (pty + oy + HP) % HP)) return 'Tu es dessus !';
  }
  return '';
}
function place(id, tx, ty) {
  const err = placeErr(id, tx, ty); if (err) { SFX.bad(); return err; }
  const d = BLD[id], i = tI(tx, ty);
  if (d.shop) G.tok[id]--; else pay(d.c);
  if (d.floor) { const old = G.fl[i]; if (old) refund(BLD[old].c); G.fl[i] = id; if (W.o[i] === 21) { W.o[i] = 0; G.od[i] = 0; } SFX.place(); inc('build'); return ''; }
  const b = { id, t: now() };
  if (d.on === 'ore') { b.ore = W.o[i]; b.b = 0; delete G.rg[i]; }
  if (W.o[i]) { W.o[i] = 0; G.od[i] = 0; delete G.rg[i]; }
  if (id === 'tp') b.n = 'Téléporteur ' + (++G.tpN);
  G.bl[i] = b; inc('build'); if (!G.disc['b_' + id]) { G.disc['b_' + id] = 1; G.sci += 1; }
  recount(); SFX.place(); vib(15);
  const [x, y] = tileCenter(i); puff(x, y, '#ffffff', 8);
  if (id === 'radar') radarReveal(i);
  if (d.pw < 0 && AG.prod <= 0 && !G.tips.pow) { G.tips.pow = 1; setTimeout(() => tip('Cette machine a besoin d’électricité ⚡ : construis un panneau solaire ou une éolienne (Recherche > Électricité).'), 600); }
  return '';
}
function pickup(tx, ty) {
  const i = tI(tx, ty);
  if (G.bl[i]) {
    const b = G.bl[i], d = BLD[b.id];
    if (b.id === 'fusee' && G.launched) { toast('La fusée est un monument, on la garde !', 'b_fusee', '', 'bad'); return false; }
    const it = bufItem(b); if (it && b.b >= 1) add(it, Math.floor(b.b));
    if (b.crop) refund({ graine: 1 });
    if (d.shop) G.tok[b.id] = (G.tok[b.id] || 0) + 1; else refund(d.c);
    if (b.ore) { W.o[i] = b.ore; if (W.o0[i] === b.ore) delete G.od[i]; else G.od[i] = b.ore; }
    if (b.id === 'niche' && b.pet != null) { /* la créature attend une autre niche */ }
    delete G.bl[i]; recount(); spawnPets(); SFX.pickup();
    const [x, y] = tileCenter(i); puff(x, y, '#ffffff', 6); return true;
  }
  if (G.fl[i]) { refund(BLD[G.fl[i]].c); delete G.fl[i]; SFX.pickup(); return true; }
  return false;
}
/* Défricher : enlève un objet du monde POUR DE BON (rien ne repousse) et rend ce qu'il contenait */
function clearAt(tx, ty) {
  const i = tI(tx, ty), o = W.o[i]; if (!o) return 'Rien à défricher ici';
  const d = OBJ[o];
  if (d.special === 'cap') return 'C’est une capsule : ouvre-la avec A !';
  if (d.special === 'meteor') return 'Une météorite : tape dessus avec A !';
  if (d.special) return 'Impossible à déplacer';
  if (d.tool && !toolTier(d.tool)) return 'Il faut ' + TOOLN[d.tool];
  const [x, y] = tileCenter(i);
  if (d.it) { const a = add(d.it, d.y * Math.max(1, (d.h || 1) - W.hp[i])); if (a) floatTxt(x, y - 18, '+' + a, ITEMS[d.it].c, 'i_' + d.it); }
  if (d.loot) for (const [k, p] of d.loot) if (Math.random() < p) add(k, 1, true);
  if (d.seed && Math.random() < d.seed) add('graine', 1, true);
  W.o[i] = 0; W.hp[i] = 0; G.clr[i] = 1; delete G.rg[i];
  if (W.o0[i]) G.od[i] = 0; else delete G.od[i];
  inc('clear'); SFX.hit(d.it || 'rock'); puff(x, y - 4, '#ffffff', 6); chips(x, y - 6, d.it ? ITEMS[d.it].c : '#9a90b8');
  return '';
}
function radarReveal(i) { reveal(i % WW, i / WW | 0, 40); G.radar = true; renderMap(true); toast('Radar en ligne : capsules repérées sur la carte', 'b_radar', ''); }

/* ================= UTILISATION DES CONSTRUCTIONS ================= */
function collect(i) {
  const b = G.bl[i], it = bufItem(b); if (!it || b.b < 1) return 0;
  const n = Math.floor(b.b), a = add(it, n); b.b -= a;
  if (a && G.mp && !MP.host) MP.op({ k: 'take', i, n: a });
  if (a) { const [x, y] = tileCenter(i); floatTxt(x, y - 22, '+' + a, ITEMS[it].c, 'i_' + it); SFX.pickup(); }
  return a;
}
function useBuilding(i) {
  const b = G.bl[i], d = BLD[b.id]; const [x, y] = tileCenter(i);
  if (b.b >= 1) { collect(i); return; }
  if (b.id === 'jardin' && cropReady(b)) { const a = harvestCrop(i); floatTxt(x, y - 18, '+' + a, ITEMS[b.crop ? b.crop.k : 'fruit'].c); SFX.hit('fruit'); return; }
  switch (d.act) {
    case 'boing': SFX.boing(); inc('boing'); G.jump = .6; return;
    case 'flush': SFX.flush(); inc('flush'); floatTxt(x, y - 24, 'FLOUUUSH', '#5ab8ff'); return;
    case 'quack': SFX.quack(); floatTxt(x, y - 28, 'COIN', '#ffd23f'); return;
    case 'chomp': SFX.chomp(); floatTxt(x, y - 24, 'MIAM', '#e0402a'); return;
    case 'purr': SFX.purr(); floatTxt(x, y - 30, 'rrrrr', '#bff0ff'); return;
    case 'sock': floatTxt(x, y - 16, 'Beurk.', '#7ce86a'); SFX.bad(); return;
    case 'piano': { const n = [60, 62, 64, 67, 69, 72][ri(0, 5)]; tone(mf(n), .5, { type: 'triangle', v: .08 }); tone(mf(n + 4), .5, { type: 'triangle', v: .05, delay: .1 }); floatTxt(x, y - 24, '♪', '#ffffff'); return; }
    case 'juke': MUS.style = MUS.style ? 0 : 1; toast(MUS.style ? 'Juke-box : polka goofy !' : 'Juke-box : retour au calme', 'b_jukebox', ''); return;
    case 'disco': G.disco = G.disco ? 0 : 1; floatTxt(x, y - 30, G.disco ? 'DISCO !' : 'fin de la fête', '#ff6fae'); return;
    case 'tv': bubble(pick(['« …et la météo : il pleut des canards. » Classique.', 'C’est une émission de cuisine. Ils cuisinent… une télé.', 'Que de la neige. Comme dans la toundra.', 'Un documentaire sur nous ! Ah non, c’est un dessin animé.'])); return;
    case 'arcade': { const s = ri(100, 99999); bubble(`Score : ${s}. ${s > 50000 ? 'RECORD !' : 'Bof.'}`); SFX.coin(); return; }
    case 'sleep': sleep(); return;
  }
  openBuildingPanel(i);
}
function sleep() {
  if (nightness() < .45) { bubble('Dormir en plein jour ? On n’est pas des Flottigelées.'); return; }
  inc('sleep');
  fadeOut(() => { const p = (G.tm % DAY) / DAY; G.tm += ((.78 - p + 1) % 1) * DAY; bubble('Bien dormi ! J’ai rêvé de canards.'); });
}

/* ================= COMPAGNON : IDÉES (pas de quêtes) ================= */
function idea() {
  const I = [];
  if (!nb('etabli')) I.push(inv('fer') >= 10 ? 'On a 10 ferrailles ! Un établi, ce serait chouette. Bouton marteau.' : 'Les débris gris autour de l’épave, c’est de la ferraille. Avec 10, on fait un établi.');
  const af = RES.filter(r => !hasR(r.id) && (r.req || []).every(hasR) && (!r.st || G.stage >= r.st) && G.sci >= r.c);
  if (af.length) I.push(`On a assez de science pour « ${af[0].n} ». Sac > Recherche.`);
  if (AG.cons > 0 && AG.eff < 1) I.push('Les machines manquent de jus ⚡. Plus de panneaux solaires ou d’éoliennes ?');
  if (hasR('r_terra1') && !nb('souffleur') && !nb('radiateur') && !nb('fonte') && !nb('semeur')) I.push('Avec « Terraformation I », on peut construire des machines pour réchauffer, mouiller et oxygéner la planète.');
  const lag = stageProgress().lag; if (lag && G.res.includes('r_terra1')) I.push(`La planète manque surtout de ${{ o: 'oxygène', h: 'chaleur', w: 'eau', b: 'biomasse' }[lag]}. Il faudrait des machines pour ça.`);
  if (G.pets.length === 0 && hasR('r_niche') && !nb('niche')) I.push('Une niche, et on pourrait adopter une bestiole ! Caresse-la 5 fois, puis donne-lui un fruit.');
  if (!hasR('r_peche') && G.res.length > 4) I.push('Je rêve d’une canne à pêche. Il paraît qu’il y a des poissons-chaussettes.');
  if (G.met) { const [x, y] = [G.met % WW, G.met / WW | 0]; I.push(`La météorite est tombée ${compass(G.x / TS, G.y / TS, x, y)}. Allons voir !`); }
  if (slotsUsed() >= AG.slots) I.push('Le sac déborde ! Des caisses de rangement, vite.');
  if (hasR('r_piste') && !nb('piste')) I.push('Zorg n’attend qu’une piste pour venir faire du commerce.');
  if (W.caps.some(i => W.o[i] === 18 && W.fog[i])) I.push('On a repéré une capsule de fret sur la carte. Il y a peut-être des chapeaux dedans !');
  const r = Math.random();
  if (!I.length || r < .25) return pick(SAY_IDLE);
  return pick(I.slice(0, 3));
}
function talkPartner() {
  SFX.ui(); const id = idea();
  const b = W.b[tI(G.x / TS | 0, G.y / TS | 0)];
  dialog([['{p}', id], ...(Math.random() < .3 ? [['{p}', pick(SAY_BIOME[b])]] : [])]);
}

/* ================= PÊCHE ================= */
function fishPool(i) {
  const b = W.b[i];
  return FISH.filter(f => (f.b === b || f.b === -1) && (!f.st || G.stage >= f.st));
}
function rollFish(i) {
  const pool = fishPool(i), luck = buff('luck'), w = pool.map(f => f.r * (luck && f.r < 15 ? 3 : 1)), tot = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot; for (let k = 0; k < pool.length; k++) { r -= w[k]; if (r <= 0) return pool[k]; } return pool[0];
}
function catchFish(f) {
  inc('fish'); add('poisson', 1, true);
  const first = !G.fish[f.id]; G.fish[f.id] = (G.fish[f.id] || 0) + 1;
  if (first) G.sci += 4 + Math.round(f.v / 2);
  return first;
}

/* ================= COMMERCE (ZORG) ================= */
const BUNDLES = [['bananium', 3, 90], ['graine', 10, 15], ['soufre', 20, 40], ['cristal', 20, 40], ['verre', 10, 70], ['batterie', 3, 45], ['circuit', 5, 45], ['pousse', 3, 30], ['glace', 20, 35], ['gelee', 15, 30]];
function shopRefresh() {
  const slot = Math.floor(now() / (20 * 60e3)); if (G.shop && G.shop.s === slot) return;
  const R = mulberry(slot * 7919 + G.seed), pool = [];
  HATS.forEach(h => { if (h[2].startsWith('shop') && !G.hats.includes(h[0])) pool.push({ k: 'hat', id: h[0], p: +h[2].split(':')[1] }); });
  SUITS.forEach(s => { if (s[3].startsWith('shop') && !G.suits.includes(s[0])) pool.push({ k: 'suit', id: s[0], p: +s[3].split(':')[1] }); });
  DECO.forEach(d => { if (d[5] && d[5].shop) pool.push({ k: 'deco', id: d[0], p: d[5].shop }); });
  const items = [];
  for (let n = 0; n < 3 && pool.length; n++) items.push(pool.splice(R() * pool.length | 0, 1)[0]);
  const bp = BUNDLES.slice(); for (let n = 0; n < 3; n++) { const b = bp.splice(R() * bp.length | 0, 1)[0]; items.push({ k: 'res', id: b[0], n: b[1], p: b[2] }); }
  G.shop = { s: slot, items, bought: [] };
}
function buyShop(n) {
  const it = G.shop.items[n]; if (!it || G.shop.bought.includes(n)) return false;
  if (G.coins < it.p) { SFX.bad(); return false; }
  if (it.k === 'res' && room(it.id) < it.n) { toast('Pas assez de place dans le sac', 'u_bag', '', 'bad'); SFX.bad(); return false; }
  G.coins -= it.p;
  if (it.k === 'hat') G.hats.push(it.id); else if (it.k === 'suit') G.suits.push(it.id);
  else if (it.k === 'deco') G.tok[it.id] = (G.tok[it.id] || 0) + 1; else add(it.id, it.n);
  if (it.k !== 'deco') G.shop.bought.push(n);
  SFX.coin(); save(); return true;
}
function sell(k, n) {
  n = Math.min(n, inv(k)); if (n <= 0) return 0; const v = ITEMS[k].v * n;
  G.inv[k] -= n; G.coins += v; inc('coins', v); inc('sell', n); SFX.coin(); return v;
}
function orderPool() {
  const p = ['fer', 'cuivre', 'cristal', 'bois', 'fibre', 'gelee', 'glace', 'soufre', 'fruit', 'spore'];
  if (G.stage >= 4) p.push('bananium');
  for (const r of RECIPES) if (nb(r.st) && hasR(r.r) && !ITEMS[r.o].food) p.push(r.o);
  if (hasR('r_peche')) p.push('poisson');
  return p;
}
function genOrder() {
  const st = G.stage, pool = orderPool(), it = {};
  for (let n = Math.random() < .55 ? 1 : 2; n > 0; n--) {
    const k = pick(pool), v = ITEMS[k].v, q = Math.max(1, Math.round(rand(10, 22) * (1 + st * .45) / Math.sqrt(v)));
    it[k] = Math.min(60, (it[k] || 0) + q);
  }
  const val = Object.entries(it).reduce((s, [k, q]) => s + ITEMS[k].v * q, 0);
  return { it, c: Math.round(val * 1.9 + 15), s: Math.round(val * .35 + 5 * (st + 1)) };
}
function ordersTick() {
  if (!G) return; const t = now();
  while (G.orders.length < 3) G.orders.push(genOrder());
  G.orders = G.orders.map(o => o.wait && o.wait <= t ? genOrder() : o);
}
function deliver(n) {
  const o = G.orders[n]; if (!o || o.wait || !canPay(o.it)) { SFX.bad(); return false; }
  pay(o.it); G.coins += o.c; G.sci += o.s; inc('coins', o.c); inc('order');
  G.orders[n] = { wait: now() + 90e3 }; SFX.fanfare(); save(); return true;
}

/* ================= TROPHÉES, ÉVÉNEMENTS, ASTUCES ================= */
function trophyCheck() {
  for (const [id, n, d, chk, rw] of TROPHIES) {
    if (G.tro[id]) continue; let ok = false; try { ok = chk(); } catch (e) { }
    if (!ok) continue; G.tro[id] = now(); let sub = d;
    if (rw && rw.hat && !G.hats.includes(rw.hat)) { G.hats.push(rw.hat); sub = 'Chapeau débloqué : ' + HATS.find(h => h[0] === rw.hat)[1]; }
    if (rw && rw.suit && !G.suits.includes(rw.suit)) { G.suits.push(rw.suit); sub = 'Combinaison débloquée : ' + SUITS.find(s => s[0] === rw.suit)[1]; }
    toast('Trophée : ' + n, 'u_trophy', sub, 'gold'); SFX.level();
  }
}
let evT = rand(150, 260);
function eventsTick(dt) {
  evT -= dt; if (evT > 0) return; evT = rand(260, 520);
  const r = Math.random();
  if (r < .4) duckRain(); else if (r < .78) meteor(); else { G.buffs.rainbow = 60; toast('Arc-en-ciel ! Récolte ×2 pendant 1 minute', 'u_star', '', 'gold'); SFX.level(); }
}
function duckRain() {
  const n = ri(10, 16); for (let k = 0; k < n; k++) setTimeout(() => { if (!G) return; const d = { x: G.x + rand(-90, 90), y: G.y + rand(-60, 60), k: 'duck', n: 1, z: 120, vz: 0, vx: 0, vy: 0, t: 0 }; DROPS.push(d); }, k * 180);
  toast('Il pleut des canards en plastique !', 'u_duck', 'Ramasse-les : +3 pièces chacun', 'gold'); SFX.quack();
}
function meteor() {
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * 6.283, r = rand(14, 28), tx = (G.x / TS + Math.cos(a) * r) | 0, ty = (G.y / TS + Math.sin(a) * r) | 0, i = tI(tx, ty);
    if (tkind(i) !== 0 || W.o[i] || G.bl[i] || G.fl[i]) continue;
    W.o[i] = 20; G.od[i] = 20; G.met = i; SFX.boing(); shakeCam(.5);
    toast('Une météorite est tombée ' + compass(G.x / TS, G.y / TS, tx, ty) + ' !', 'u_star', 'Suis la flèche', 'gold'); return;
  }
}
let tipT = -20000;
function tipsTick() {
  if (!CFG.tips || blocking() || performance.now() - tipT < 25000) return;
  const T = (k, txt, c) => { if (!G.tips[k] && c) { G.tips[k] = 1; tipT = performance.now(); tip(txt); return true; } return false; };
  const K = typeof keyLabel === 'function' ? keyLabel : (c => c);
  T('a', PC ? 'Approche-toi d’un débris gris et fais un clic gauche dessus pour le ramasser (maintiens pour continuer).' : 'Approche-toi d’un débris gris et appuie sur A (ou touche-le) pour le ramasser.', cnt('hits') === 0 && cnt('walk') > 15) ||
    T('tools', 'Avec 8 ferrailles et 6 fibres, fabrique une pioche et une hache : ' + (PC ? K('KeyQ') + ' (sac)' : 'Sac') + ' > Fabriquer > À la main.', inv('fer') >= 4 && !toolTier('pick')) ||
    T('etabli', 'Tu as 10 ferrailles : ' + (PC ? 'touche ' + K('KeyB') : 'bouton marteau') + ' > Établi pour le construire où tu veux.', inv('fer') >= 10 && !nb('etabli') && toolTier('pick')) ||
    T('craft', (PC ? 'Clic droit sur l’établi' : 'Touche l’établi') + ' pour fabriquer des plaques (3 ferrailles).', nb('etabli') && !cnt('craft')) ||
    T('sci', 'Tu as de la science ! Menu > Recherche pour débloquer de nouvelles machines.', G.sci >= 15 && !G.res.length && nb('etabli')) ||
    T('map', 'La carte (' + (PC ? K('KeyM') : 'en haut à droite') + ') montre ce que tu as exploré. La planète boucle : marche tout droit et tu en feras le tour !', cnt('walk') > 400) ||
    T('night', 'La nuit tombe. Pas de danger ici : les machines s’allument et les Flottigelées sortent.', nightness() > .6) ||
    T('partner', G.mp ? '' : `${NM[G.who === 'm' ? 'f' : 'm']} peut t’attendre quelque part (${PC ? K('KeyF') : 'bouton 📍'}) et tu peux jouer l’un ou l’autre (${PC ? K('KeyG') : 'bouton ⇄'}).`, !G.mp && cnt('build') >= 3) ||
    T('pick', PC ? 'Pour enlever une construction : maintiens le clic gauche dessus (tout est remboursé). Pour faire place nette : ' + K('KeyC') + ' (défricher).' : 'Pour enlever une construction : appui long dessus (tout est remboursé). Pour faire place nette : marteau > Défricher.', cnt('build') >= 6);
}
