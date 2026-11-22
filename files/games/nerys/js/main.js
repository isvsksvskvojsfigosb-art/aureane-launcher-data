'use strict';
/* ==========================================================
   Nérys — démarrage, écrans titre, commandes, boucle
   PC   : ZQSD bouger · clic gauche casser/récolter · clic droit poser/utiliser
   Mobile : joystick · A agir · toucher un objet · appui long = casser
   Le clic ne déplace JAMAIS le personnage sur PC.
   ========================================================== */
let STATE = 'boot';
const JOY = { x: 0, y: 0, id: null, ox: 0, oy: 0, moved: false, t0: 0 };
const KEYS = {};

/* ---------------- noms des touches selon le clavier (AZERTY / QWERTY) ---------------- */
const KEYDEF = { KeyW: 'Z', KeyA: 'Q', KeyS: 'S', KeyD: 'D', KeyQ: 'A', KeyE: 'E', KeyB: 'B', KeyC: 'C', KeyM: 'M', KeyF: 'F', KeyG: 'G', KeyT: 'T', Tab: 'Tab', Space: 'Espace', Escape: 'Échap', Enter: 'Entrée' };
let KMAP = null;
const PHYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ'];
function keyLabel(code) { const v = PHYS.includes(code) && KMAP && KMAP.get && KMAP.get(code); return v && v.length === 1 ? v.toUpperCase() : (KEYDEF[code] || code); }
try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { KMAP = m; keysHelp(); }).catch(() => { }); } catch (e) { }
function keysHelp() {
  const K = keyLabel, el = $('#keysTxt'); if (!el) return;
  el.innerHTML = `<span><b>${K('KeyW')}${K('KeyA')}${K('KeyS')}${K('KeyD')}</b> bouger</span><span><b>Clic G</b> casser / récolter</span><span><b>Clic D</b> poser / utiliser</span><span><b>E</b> agir</span><span><b>${K('KeyQ')}</b> inventaire</span><span><b>1-5</b> barre rapide</span><span><b>C</b> défricher</span><span><b>Tab</b> journal</span><span><b>Échap</b> pause</span>${G && G.mp ? `<span><b>Entrée</b> chat</span>` : `<span><b>${K('KeyF')}</b> reste / suis</span><span><b>${K('KeyG')}</b> changer de perso</span>`}<span><b>M</b> carte</span>`;
}

/* ---------------- écran titre : une vraie base qui vit en fond ---------------- */
let DEMO = null;
function startDemo() {
  G = blankState('f', 424242); G.demo = true; genWorld(424242);
  G.st = { o: 9e4, h: 9e4, w: 9e4, b: 9e4 }; G.stage = 4; G.res = RES.map(r => r.id); G.tm = DAY * .33;
  const sx = W.spawn.x, sy = W.spawn.y, put = (dx, dy, id) => { const i = tI(sx + dx, sy + dy); W.o[i] = 0; G.bl[i] = { id, t: 0, b: 0 }; };
  for (let dx = -3; dx <= 3; dx++) for (let dy = 3; dy <= 5; dy++) { const i = tI(sx + dx, sy + dy); W.o[i] = 0; G.fl[i] = 'f_bois'; }
  put(-3, 3, 'etabli'); put(-1, 3, 'labo'); put(2, 3, 'cuisine'); put(-5, 2, 'eolienne'); put(-6, 4, 'solaire'); put(-6, 6, 'solaire');
  put(5, 2, 'souffleur'); put(6, 3, 'radiateur'); put(5, 5, 'fonte'); put(6, 6, 'semeur'); put(3, 5, 'lampadaire'); put(-3, 5, 'flamant');
  put(0, 7, 'arbre'); put(-4, 8, 'arbre'); put(4, 8, 'arbre'); put(1, 5, 'pot'); put(-1, 5, 'chaise'); put(8, 0, 'pompe'); put(-8, 0, 'grillepain');
  G.x = sx * TS + 8; G.y = (sy + 4) * TS + 8; initRuntime(); DEMO = { tx: G.x, ty: G.y, t: 0 };
}
function demoUpdate(dt) {
  if (!G || !G.demo) return;
  G.tm += dt * 2; DEMO.t -= dt;
  const dx = wrapD(DEMO.tx - G.x), dy = wrapD(DEMO.ty - G.y), l = Math.hypot(dx, dy);
  if (DEMO.t <= 0 || l < 4) { DEMO.t = rand(3, 7); DEMO.tx = (W.spawn.x + rand(-9, 9)) * TS; DEMO.ty = (W.spawn.y + rand(2, 9)) * TS; DEMO.wait = rand(0, 1.5); }
  if (DEMO.wait > 0) { DEMO.wait -= dt; G.mv = false; } else if (l > 4) playerMove(dt * .6, dx / l, dy / l);
  partnerUpdate(dt); mobsUpdate(dt); P.bt = 99;
}

/* ---------------- écrans ---------------- */
const show = (id, on) => $(id).classList.toggle('on', on);
function toTitle() {
  STATE = 'title'; BUILD = null; buildBar(); if (MAPO) closeMap(); if (FISH_ST) fishEnd(false, '');
  if (typeof MP !== 'undefined' && MP.on) MP.leave();
  ['#hud', '#ctl', '#pick'].forEach(s => show(s, false)); show('#title', true); cv.classList.add('blur');
  startDemo(); titleButtons();
}
function titleButtons() {
  $('#tBtns').innerHTML = `<button class="btn big pri" data-t="solo">${hasSave() ? 'Jouer' : 'Nouvelle partie'}</button><button class="btn big" data-t="multi">Multijoueur</button><button class="btn big" data-t="opt">Options</button>` + (ELECTRON ? `<button class="btn big" data-t="quit">Quitter</button>` : '');
}
$('#tBtns').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return; audio(); SFX.ui();
  const a = b.dataset.t;
  if (a === 'solo') { if (hasSave()) openSlots(); else pickChar(0); }
  else if (a === 'multi') openMulti();
  else if (a === 'opt') openSettings();
  else if (a === 'quit') window.close();
});

/* ---------------- emplacements de sauvegarde ---------------- */
function openSlots() {
  const r = () => {
    const cards = [0, 1, 2].map(n => {
      const s = slotInfo(n);
      if (!s) return `<div class="slot empty"><div class="sl-ic">+</div><div class="sl-tx"><b>Emplacement ${n + 1}</b><small>Libre</small></div><div class="sl-bt"><button class="btn sm pri" data-a="new:${n}">Nouvelle planète</button><button class="btn sm" data-a="imp:${n}">Importer</button></div></div>`;
      if (s.bad) return `<div class="slot"><div class="sl-ic">!</div><div class="sl-tx"><b>Emplacement ${n + 1}</b><small class="no">Sauvegarde abîmée</small></div><div class="sl-bt"><button class="btn sm" data-a="del:${n}">Supprimer</button></div></div>`;
      const c = cnv(32, 46), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(astro(s.who, suitColor(s.suit, 0), 'd', 0, s.stage < 6), 0, 0, 32, 46);
      const ago = s.t ? fmtT((now() - s.t) / 1000) : '?';
      return `<div class="slot"><img class="sl-av" src="${c.toDataURL()}" alt=""><div class="sl-tx"><b>Planète ${n + 1} · ${NM[s.who]}</b><small>Stade ${s.stage} · ${esc(stageName(s.stage))} · Jour ${s.day}</small><small>${fmtT(s.pt)} de jeu · sauvegardée il y a ${ago}</small></div>
        <div class="sl-bt"><button class="btn sm pri" data-a="play:${n}">Jouer</button><button class="btn sm" data-a="exp:${n}">Partager</button><button class="btn sm" data-a="del:${n}">Supprimer</button></div></div>`;
    }).join('');
    modal('Tes planètes', `<div class="slots">${cards}</div><p class="hint">La partie se sauvegarde toute seule (et avec ${PC ? 'Ctrl+S' : 'le bouton Sauvegarder du menu'}). « Partager » crée un fichier de ta planète, à garder ou à envoyer à quelqu’un.</p>`, {
      play: n => { closeModal(); if (load(+n)) { const off = offline(); begin(false, off); } else toast('Sauvegarde illisible', 'u_x', '', 'bad'); },
      new: n => { closeModal(); pickChar(+n); },
      del: n => modal('Supprimer la planète ' + (+n + 1) + ' ?', `<p class="desc">Cette planète sera <b class="no">effacée pour toujours</b>. Exporte-la d’abord si tu veux la garder.</p><div class="row2"><button class="btn" data-a="back">Annuler</button><button class="btn pri" data-a="ok">Supprimer</button></div>`, { back: openSlots, ok: () => { deleteSlot(+n); SFX.ok(); hasSave() ? openSlots() : (closeModal(), titleButtons()); } }, { cls: 'small' }),
      exp: n => exportSlot(+n),
      imp: n => importSlot(+n),
    }, { id: 'slots', icon: 'u_planet', r });
  };
  r();
}
function exportSlot(n) {
  const raw = slotRaw(n); if (!raw) return;
  const name = `nerys-planete-${n + 1}-${new Date().toISOString().slice(0, 10)}.json`;
  if (window.Capacitor) { showCode(btoa(unescape(encodeURIComponent(raw)))); return; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast('Planète exportée', 'u_star', name);
  } catch (e) { showCode(btoa(unescape(encodeURIComponent(raw)))); }
}
function importSlot(n) {
  const go = txt => {
    let s = String(txt || '').trim(); if (!s) return;
    if (s[0] !== '{') { try { s = decodeURIComponent(escape(atob(s))); } catch (e) { s = ''; } }
    let ok = false; try { const j = JSON.parse(s); ok = !!(j && j.seed && j.who); } catch (e) { }
    if (!ok) { toast('Fichier ou code invalide', 'u_x', '', 'bad'); SFX.bad(); return; }
    try { localStorage.setItem(slotKey(n), s); } catch (e) { toast('Pas assez de place pour enregistrer', 'u_x', '', 'bad'); return; }
    SFX.ok(); toast('Planète importée !', 'u_star', 'Emplacement ' + (n + 1)); openSlots();
  };
  modal('Importer une planète', `<p class="desc">Choisis un fichier exporté (.json), ou colle un code de sauvegarde.</p><input type="file" id="impF" accept=".json,.nerys,.txt,application/json" class="fileIn"><textarea class="code" id="impT" placeholder="…ou colle un code ici"></textarea><div class="row2"><button class="btn" data-a="back">Retour</button><button class="btn pri" data-a="go">Importer</button></div>`,
    { back: openSlots, go: () => go($('#impT').value) }, { cls: 'small' });
  $('#impF').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => go(r.result); r.readAsText(f); };
}

function pickChar(slot, cb) {
  show('#title', false); show('#pick', true);
  const row = $('#pickRow'); row.innerHTML = '';
  for (const g of ['m', 'f']) {
    const d = document.createElement('button'); d.className = 'pcard';
    const c = cnv(48, 69), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(astro(g, g === 'm' ? '#f0a030' : '#2fb7a8', 'd', 0, true), 0, 0, 48, 69);
    d.appendChild(c); d.insertAdjacentHTML('beforeend', `<b>${NM[g]}</b><small>${g === 'm' ? 'Mécanicien de bord. Parle aux cailloux.' : 'Pilote de secours. A « atterri ».'}</small>`);
    d.onclick = () => { SFX.ok(); if (cb) { show('#pick', false); cb(g); return; } SLOT = slot; deleteSlot(slot); newGame(g); begin(!CFG.intro); };
    row.appendChild(d);
  }
}
$('#pickBack').onclick = () => { SFX.tab(); show('#pick', false); show('#title', true); };
function begin(intro, off) {
  STATE = 'play'; show('#title', false); show('#pick', false); show('#hud', true); show('#ctl', true); cv.classList.remove('blur');
  document.body.classList.toggle('mp', !!G.mp);
  CHUNKS.clear(); fit(); applyCfg(); renderMap(true); hud(true); keysHelp(); hotbar(true); lastTile = -1; BUILD = null;
  if (G.said && G.said.invmig === 1) { G.said.invmig = 2; setTimeout(() => toast('Nouvel inventaire !', 'u_bag', 'Ce qui ne rentrait pas est rangé dans des caisses près de l’épave', 'gold'), 1500); }
  const f = $('#fade'); f.style.transition = 'none'; f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 1s'; f.classList.remove('on'); }));
  if (intro) {
    CFG.intro = true; saveCfg();
    const K = keyLabel, ctl = PC ? `${K('KeyW')}${K('KeyA')}${K('KeyS')}${K('KeyD')} : bouger. Clic gauche : casser / récolter. Clic droit : poser / utiliser. ${K('KeyQ')} : sac. ${K('KeyB')} : construire.` : 'Joystick : bouger. A : agir. Touche un objet proche pour l’utiliser, appui long pour casser une construction.';
    setTimeout(() => dialog(INTRO.map(l => l[1] === 'CONTROLES' ? ['', ctl] : l)), 900);
  }
  else if (off) setTimeout(() => offlineSummary(off), 700);
  save();
}
function offlineSummary(o) {
  const st = Object.entries(o.st).map(([k, v]) => `<div class="li">${ic(STATN[k][1], 26)}<b>+${fmt(v)}</b><small>${STATN[k][0]}</small></div>`).join('');
  const got = Object.entries(o.got).map(([k, v]) => `<div class="li">${ic('i_' + k, 26)}<b>+${fmt(v)}</b><small>${ITEMS[k].n}</small></div>`).join('');
  modal('Pendant ton absence…', `<p class="desc">${G.mp ? 'Le serveur dormait depuis' : 'Tu es parti·e'} ${fmtT(o.dt)}${o.full ? ' (maximum ' + (hasR('r_absence') ? '24' : '8') + ' h)' : ''}. Les machines, elles, ont bossé.</p><div class="loot">${st}<div class="li">${ic('u_sci', 26)}<b>+${fmt(o.sci)}</b><small>science</small></div>${got}</div>${o.stages ? `<p class="good">La planète a gagné ${o.stages} stade${o.stages > 1 ? 's' : ''} !</p>` : ''}<button class="btn pri wide" data-a="close">On s’y remet</button>`, {}, { cls: 'small', id: 'off' });
  if (o.stages) { G.party = 6; SFX.fanfare(); }
}

/* ---------------- repères écran → monde ---------------- */
function screenWorld(cx, cy) { const d = Math.min(devicePixelRatio || 1, 3); return [cx * d / S + camX, cy * d / S + camY]; }
function screenTile(cx, cy) { const [x, y] = screenWorld(cx, cy); return [Math.floor(x / TS), Math.floor(y / TS)]; }
let paint = null, MOVE = null, MHOLD = null, mholdT = 0, MOUSE = null, HOVT = null, BRK = null, LDOWN = false, LP = null;

/* ---------------- cibles sous le doigt / la souris ---------------- */
function sprH(i) { const b = G.bl[i]; if (b) { const a = ART['b_' + b.id]; return a ? a.height : 16; } const o = W.o[i]; if (!o) return 0; const a = ART[objKey(o, i)]; return a ? a.height : 16; }
function targetAt(wx, wy) {
  const m = [...MOBL, ...PETL].find(m => Math.hypot(wrapD(m.x - wx), wrapD(m.y - 7 - wy)) < 11);
  if (m) return { k: 'mob', m };
  if (!G.mp && Math.hypot(wrapD(P.x - wx), wrapD(P.y - 10 - wy)) < 8) return { k: 'partner' };
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  for (const dy of [0, 1, 2]) {
    const i = tI(tx, ty + dy); if (dy && sprH(i) < 16 * dy + 6) continue; // un sprite haut déborde sur la case du dessus
    const b = G.bl[i]; if (b && !BLD[b.id].floor && !BLD[b.id].wall) return { k: 'bld', i };
    const o = W.o[i]; if (o && (OBJ[o].h || OBJ[o].special)) return { k: 'obj', i };
  }
  const i = tI(tx, ty); if (isWaterK(tkind(i))) return { k: 'fish', i };
  return null;
}
/* murs et sols posés : cassables au clic gauche maintenu */
function flatAt(wx, wy) {
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  for (const dy of [0, 1]) { const i = tI(tx, ty + dy), b = G.bl[i]; if (b && BLD[b.id].wall) return { k: 'flr', i }; }
  const i = tI(tx, ty); if (G.fl[i]) return { k: 'flr', i };
  return null;
}
function tpos(t) {
  if (t.k === 'mob') return [t.m.x, t.m.y - 5];
  if (t.k === 'partner') return [P.x, P.y - 5];
  return [(t.i % WW) * TS + 8, (t.i / WW | 0) * TS + 10];
}
function tvalid(t) {
  if (t.k === 'mob') return MOBL.includes(t.m) || PETL.includes(t.m);
  if (t.k === 'bld') return !!G.bl[t.i];
  if (t.k === 'obj') return !!W.o[t.i];
  if (t.k === 'flr') return !!(G.fl[t.i] || G.bl[t.i]);
  return true;
}
function treach(t) { const [x, y] = tpos(t), r = t.k === 'fish' ? 34 : t.k === 'obj' && W.o[t.i] === 23 ? 44 : 30; return Math.hypot(wrapD(x - G.x), wrapD(y - (G.y - 4))) < r; }
function faceTo(t) { const [x, y] = tpos(t), dx = wrapD(x - G.x), dy = wrapD(y - (G.y - 4)); G.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 'u' : 'd'); if (dx) G.lr = dx < 0 ? 'l' : 'r'; }
function doAct(t, ex) { if (!tvalid(t)) return; faceTo(t); if (t.k === 'obj' && mineable(t.i)) { mineStart(t, ex || { auto: !PC }); return; } act(t); }
/* ---- casser façon Minecraft : on maintient, le perso tape en boucle, la vitesse dépend de l'outil ---- */
function brkDur(t) {
  if (t.k === 'obj') return mineTime(t.i);
  const pt = toolTier('pick');
  return t.k === 'flr' ? .25 / (1 + .25 * pt) : 1.5 / (1 + .25 * pt);
}
function canBreak(t) {
  if (t.k === 'flr') return true;
  if (t.k === 'obj') return mineable(t.i);
  if (t.k !== 'bld') return false;
  const b = G.bl[t.i]; return !!b && !(b.b >= 1) && !(b.id === 'jardin' && cropReady(b));
}
function startBrk(t, ex) { BRK = { t, p: 0, dur: brkDur(t), sw: 0, ...(ex || {}) }; }
const sameT = (a, b) => a && b && a.k === b.k && a.i === b.i;
function mineStart(t, ex) {
  if (BRK && sameT(BRK.t, t)) { Object.assign(BRK, ex || {}); return; }
  const d = OBJ[W.o[t.i]];
  if (!toolOk(d)) { needTool(d.tool, d.mt); SHAKE[t.i] = .12; return; }
  if (!treach(t)) { if (!PC) MOVE = { t }; return; }
  faceTo(t); startBrk(t, ex);
}
function toolIco(kind) { let best = null, tr = 0; for (const s of G.items) { const it = s && ITEMS[s.k]; if (it && it.tool === kind && it.tier > tr) { tr = it.tier; best = 'i_' + s.k; } } return best; }
function brkSwing(t) {
  if (!PC) faceTo(t);
  G.swing = .18;
  if (t.k === 'obj') { G.swingIco = toolIco(OBJ[W.o[t.i]].tool); mineSwing(t.i); }
  else { G.swingIco = toolIco('pick'); const [x, y] = tpos(t); SHAKE[t.i] = .2; SFX.hit('rock'); chips(x, y - 6, '#c9bfe0'); vib(5); }
}
let farT = 0;
function tooFar(wx, wy) { if (performance.now() - farT < 900) return; farT = performance.now(); SFX.bad(); floatTxt(wx, wy - 6, 'Trop loin', '#ffb0b8'); }
/* clic gauche : casser / récolter / caresser.   clic droit (ou toucher) : utiliser / ouvrir */
function primaryLabel(t) {
  if (!t) return '';
  if (t.k === 'bld') { const b = G.bl[t.i]; return b.b >= 1 ? 'Collecter' : b.id === 'jardin' && cropReady(b) ? 'Récolter' : 'Casser'; }
  if (t.k === 'flr') return 'Casser';
  if (t.k === 'obj') { const d = OBJ[W.o[t.i]]; if (!d) return ''; if (d.special && d.special !== 'meteor') return targetLabel(t); if (!toolOk(d)) return 'Il faut ' + TOOLN[d.tool] + (d.mt > 1 ? ' ' + TIERN[d.mt] : ''); return 'Casser'; }
  return targetLabel(t);
}
function useLabel(t) { if (!t) return ''; if (t.k === 'flr') return ''; if (t.k === 'bld') return targetLabel(t); return targetLabel(t); }
function primary(t) {
  if (!tvalid(t)) return;
  if (t.k === 'bld') {
    const b = G.bl[t.i];
    if (b.b >= 1) { collect(t.i); return; }
    if (b.id === 'jardin' && cropReady(b)) { doAct(t); return; }
    startBrk(t); return;
  }
  if (t.k === 'flr') { startBrk(t); return; }
  doAct(t, {});
}
function breakTarget(t) {
  if (!tvalid(t)) return;
  if (t.k === 'obj') { breakObj(t.i); return; }
  const i = t.i, tx = i % WW, ty = i / WW | 0;
  if (t.k === 'flr' && G.bl[i] && BLD[G.bl[i].id].wall) pickup(tx, ty);
  else if (!pickup(tx, ty)) SFX.bad();
  vib(15);
}

function paintable() { if (!BUILD) return false; const d = BUILD.id && BLD[BUILD.id]; return !!(BUILD.pick || BUILD.clear || (d && (d.floor || d.wall))); }
/* ---------------- souris (PC) : le curseur est caché, on agit sur ce qui est DEVANT le personnage ---------------- */
let RDOWN = false, lastPaint = '', clearT = 0;
/* clic maintenu : le regard reste fixe, on peut marcher de côté pour poser ou casser toute une rangée */
function dirLock() { return PC && STATE === 'play' && (LDOWN || RDOWN); }
const flatHeld = () => BUILD && BUILD.id && (BLD[BUILD.id].floor || BLD[BUILD.id].wall);
function syncBuild() {
  if (BUILD && BUILD.clear) return;
  const id = heldBld();
  if (id) { if (!BUILD || BUILD.id !== id) { BUILD = { id, cur: null }; buildBar(); } }
  else if (BUILD) { BUILD = null; buildBar(); }
}
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (STATE !== 'play') return; audio();
  if (e.pointerType !== 'mouse') { touchDown(e); return; }
  if (blocking()) return;
  if (e.button === 2) {                                  // ---- clic droit : poser / utiliser / manger
    RDOWN = true; lastPaint = '';
    if (BUILD && BUILD.clear) { BUILD = null; buildBar(); SFX.tab(); return; }
    if (BUILD && BUILD.id) { const [tx, ty] = buildCursor(); lastPaint = tx + ',' + ty; buildAt(tx, ty); return; }
    if (TGT && !(TGT.k === 'obj' && mineable(TGT.i))) { doAct(TGT); return; }
    const h = held(); if (h && ITEMS[h.k].food) eat(h.k);
    return;
  }
  if (e.button !== 0) return;                            // ---- clic gauche : casser / récolter (maintenir pour continuer)
  LDOWN = true; clearT = 0; mholdT = .3;
  if (BUILD && BUILD.clear) return;
  if (TGT) primary(TGT);
});
addEventListener('pointerup', e => { if (e.pointerType && e.pointerType !== 'mouse') return; LDOWN = false; RDOWN = false; BRK = null; MHOLD = null; });
function pcHold(dt) {
  if (RDOWN && flatHeld()) { const [tx, ty] = buildCursor(), k = tx + ',' + ty; if (k !== lastPaint) { lastPaint = k; buildAt(tx, ty); } }
  if (!LDOWN) return;
  if (BUILD && BUILD.clear) { clearT -= dt; if (clearT <= 0) { clearT = .22; buildAt(...buildCursor()); } return; }
  const t = TGT; if (!t) { BRK = null; return; }
  if (BRK && sameT(BRK.t, t)) return;
  if (!canBreak(t)) { BRK = null; return; }
  if (t.k === 'obj') { const d = OBJ[W.o[t.i]]; if (!toolOk(d)) { BRK = null; needTool(d.tool, d.mt); return; } }
  startBrk(t);
}
cv.addEventListener('pointermove', e => {
  if (LP && Math.hypot(e.clientX - LP.x, e.clientY - LP.y) > 12) LP.moved = true;
  if (e.pointerType === 'mouse' || !BUILD || STATE !== 'play') return;
  const [tx, ty] = screenTile(e.clientX, e.clientY);
  if (paint === e.pointerId) { if (BUILD.cur && BUILD.cur[0] === tx && BUILD.cur[1] === ty) return; BUILD.cur = [tx, ty]; buildAt(tx, ty); }
});
const cvUp = e => { paint = null; if (e && e.pointerType !== 'mouse') { MHOLD = null; touchUp(e); } };
cv.addEventListener('pointerup', cvUp); cv.addEventListener('pointercancel', () => { paint = null; MHOLD = null; LDOWN = false; RDOWN = false; BRK = null; LP = null; });
cv.addEventListener('wheel', e => {
  if (STATE !== 'play' || blocking()) return; e.preventDefault();
  if (e.ctrlKey) { CFG.zoom = clamp(Math.round(CFG.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12) * 100) / 100, .6, 1.8); fit(); saveCfg(); return; }
  selectHot(((G.sel || 0) + (e.deltaY > 0 ? 1 : -1) + HOTN) % HOTN);
}, { passive: false });
/* ---------------- tactile (mobile) : toucher = utiliser, appui long = casser ---------------- */
function touchDown(e) {
  if (blocking()) return;
  const [wx, wy] = screenWorld(e.clientX, e.clientY);
  if (BUILD) { if (paintable()) { paint = e.pointerId; cv.setPointerCapture(e.pointerId); } tapWorld(e.clientX, e.clientY); return; }
  const t = targetAt(wx, wy), f = t ? null : flatAt(wx, wy), bt = t && t.k === 'bld' ? t : f;
  LP = { x: e.clientX, y: e.clientY, t0: performance.now(), tap: t, brk: bt, moved: false, done: false };
  if (t && t.k === 'obj' && mineable(t.i)) { LP.done = true; MOVE = null; doAct(t, { auto: true }); return; }
  if (bt && treach(bt)) startBrk(bt, { touch: true, delay: .2 });
}
function touchUp(e) {
  const lp = LP; LP = null; if (!(BRK && BRK.auto)) BRK = null; if (!lp || lp.done || lp.moved) return;
  if (performance.now() - lp.t0 < 450) tapWorld(e.clientX, e.clientY);
}
function tapWorld(cx, cy) {
  if (STATE !== 'play' || blocking()) return;
  const [wx, wy] = screenWorld(cx, cy), tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  if (BUILD) {
    if (paintable()) { buildAt(tx, ty); if (BUILD) BUILD.cur = [tx, ty]; return; }
    if (BUILD.cur && BUILD.cur[0] === tx && BUILD.cur[1] === ty) buildAt(tx, ty); else { BUILD.cur = [tx, ty]; SFX.tab(); }
    return;
  }
  const t = targetAt(wx, wy); if (!t) return;
  if (treach(t)) { MOVE = null; doAct(t); }
  else MOVE = { t };                                     // mobile : marche jusqu'à l'objet touché
}
function followMove(dt) {
  if (!MOVE.t || !tvalid(MOVE.t)) { MOVE = null; return; }
  if (treach(MOVE.t)) { const t = MOVE.t; MOVE = null; G.mv = false; doAct(t); return; }
  const [x, y] = tpos(MOVE.t), dx = wrapD(x - G.x), dy = wrapD(y - G.y), l = Math.hypot(dx, dy) || 1;
  const ox = G.x, oy = G.y; playerMove(dt, dx / l, dy / l);
  if (Math.hypot(wrapD(G.x - ox), wrapD(G.y - oy)) < speed() * dt * .2) { MOVE.stuck = (MOVE.stuck || 0) + dt; if (MOVE.stuck > .35) { MOVE = null; G.mv = false; } } else MOVE.stuck = 0;
}

/* joystick : la moitié gauche de l'écran */
const joyZ = $('#joyZ'), joyB = $('#joy'), knob = $('#knob');
function joyR() { return 46 * CFG.bs / 100; }
joyZ.addEventListener('pointerdown', e => {
  if (STATE !== 'play') return; e.preventDefault(); audio();
  MOVE = null; JOY.id = e.pointerId; joyZ.setPointerCapture(e.pointerId); JOY.moved = false; JOY.t0 = performance.now();
  // Joystick FIXE : il ne bouge pas. On le pilote en touchant près de lui ; ailleurs, c'est un toucher dans le monde.
  const jr = joyB.getBoundingClientRect(); JOY.ox = jr.left + jr.width / 2; JOY.oy = jr.top + jr.height / 2;
  JOY.stick = Math.hypot(e.clientX - JOY.ox, e.clientY - JOY.oy) < jr.width * .85;
  if (JOY.stick) { joyB.classList.add('on'); joyMove(e); return; }
  if (!blocking() && !BUILD) { const [wx, wy] = screenWorld(e.clientX, e.clientY), t = targetAt(wx, wy), f = t ? null : flatAt(wx, wy), bt = t && t.k === 'bld' ? t : f; if (bt && treach(bt)) startBrk(bt, { touch: true, delay: .2 }); }
});
function joyMove(e) {
  let dx = e.clientX - JOY.ox, dy = e.clientY - JOY.oy; const l = Math.hypot(dx, dy), r = joyR();
  if (l < 6) { JOY.x = JOY.y = 0; knob.style.transform = ''; return; }
  JOY.moved = true; if (BRK && BRK.touch) BRK = null;
  if (l > r) { dx = dx / l * r; dy = dy / l * r; }
  JOY.x = dx / r; JOY.y = dy / r; knob.style.transform = `translate(${dx}px,${dy}px)`;
}
joyZ.addEventListener('pointermove', e => {
  if (e.pointerId !== JOY.id) return;
  if (JOY.stick) return joyMove(e);
  if (Math.hypot(e.clientX - JOY.ox, e.clientY - JOY.oy) > 10) JOY.moved = true;
});
const joyUp = e => {
  if (e.pointerId !== JOY.id) return; JOY.id = null; JOY.x = JOY.y = 0; joyB.classList.remove('on'); knob.style.transform = '';
  const broke = BRK && BRK.done; if (!(BRK && BRK.auto)) BRK = null; MHOLD = null;
  if (!JOY.stick && !JOY.moved && !broke && performance.now() - JOY.t0 < 450) tapWorld(e.clientX, e.clientY);
  JOY.stick = false;
};
joyZ.addEventListener('pointerup', joyUp); joyZ.addEventListener('pointercancel', joyUp);

/* ---------------- bouton A (mobile) / touche E ---------------- */
let holdA = null, holdT = 0;
function press(rep, src) {
  if (STATE !== 'play') return;
  if (DLG.on) { if (!rep) dlgNext(); return; }
  if (FISH_ST) { if (!rep) fishTap(); return; }
  if (MAPO) { if (!rep) closeMap(); return; }
  if (UI.modal) return;
  if (BUILD) { if (!rep) buildAt(...buildCursor()); return; }
  if (!TGT) { if (!rep) SFX.tab(); return; }
  if (TGT.k === 'obj' && mineable(TGT.i)) { if (!rep || !BRK) doAct(TGT, src === 'k' ? { key: true } : { auto: true }); return; }
  if (rep && !(TGT.k === 'bld' && G.bl[TGT.i] && G.bl[TGT.i].b >= 1)) return;
  act(TGT);
}
const bA = $('#bA');
bA.addEventListener('pointerdown', e => { e.preventDefault(); audio(); bA.classList.add('down'); MOVE = null; press(false); holdA = e.pointerId; holdT = .38; vib(6); });
const upA = () => { holdA = null; bA.classList.remove('down'); };
bA.addEventListener('pointerup', upA); bA.addEventListener('pointercancel', upA); bA.addEventListener('pointerleave', upA);
const playOk = () => STATE === 'play' && !DLG.on && !FISH_ST;
$('#bBuild').addEventListener('pointerdown', e => { e.preventDefault(); if (!playOk() || blocking()) return; SFX.ui(); BUILD = BUILD && BUILD.clear ? null : { clear: true }; buildBar(); });
$('#bMenu').addEventListener('click', () => { if (!playOk()) return; UI.modal === 'inv' ? closeModal() : openInv(); });
$('#bJournal').addEventListener('click', () => { if (!playOk()) return; SFX.ui(); UI.modal === 'menu' ? closeModal() : openMenu(); });
$('#bPause').addEventListener('click', () => { if (STATE !== 'play') return; SFX.ui(); UI.modal === 'pause' ? closeModal() : (closeModal(), openPause()); });
$('#bMap').addEventListener('click', () => { if (!playOk()) return; MAPO ? closeMap() : openMap(); });
$('#bSave').addEventListener('click', () => { if (STATE === 'play') saveNow(); });
$('#bStay').addEventListener('pointerdown', e => { e.preventDefault(); if (playOk() && !blocking()) partnerToggle(); });
$('#bSwap').addEventListener('pointerdown', e => { e.preventDefault(); if (playOk() && !blocking()) switchChar(); });
$('#bChat').addEventListener('pointerdown', e => { e.preventDefault(); if (STATE === 'play' && G.mp) openChat(); });
$('#hStageW').addEventListener('click', () => { if (!playOk()) return; SFX.ui(); openMenu('planet'); });
$('#dlg').addEventListener('pointerdown', e => { e.preventDefault(); if (e.target.closest('#dlgX')) { dlgSkip(); return; } dlgNext(); });
$('#pickX').onclick = () => $('#pickBack').click();

/* ---------------- clavier : déplacement par touches PHYSIQUES (ZQSD en AZERTY = WASD en QWERTY) ---------------- */
const MOVEK = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
addEventListener('keydown', e => {
  const c = e.code;
  const typing = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
  if (typing) { if (c === 'Escape') e.target.blur(); return; }
  KEYS[c] = 1;
  if (c === 'Escape') { back(); return; }
  if (c === 'F11') { e.preventDefault(); toggleFS(); return; }
  if (STATE !== 'play') return;
  if ((e.ctrlKey || e.metaKey) && c === 'KeyS') { e.preventDefault(); saveNow(); return; }
  const ch = (e.key || '').toLowerCase();
  if (/^Digit[1-5]$/.test(c) && !UI.modal) { selectHot(+c.slice(5) - 1); return; }
  if (c === 'KeyQ') { if (UI.modal === 'inv') closeModal(); else if (!DLG.on && !FISH_ST && !MAPO && !UI.modal) openInv(); return; }
  if (c === 'Tab' || ch === 'j') { e.preventDefault(); if (UI.modal === 'menu') closeModal(); else if (!blocking()) openMenu(); return; }
  if (c === 'Space' || ch === 'e') { e.preventDefault(); if (!e.repeat) { MOVE = null; holdA = 'k'; press(false, 'k'); holdT = .38; } return; }
  if (c === 'Enter' || c === 'NumpadEnter') { if (DLG.on) dlgNext(); else if (G.mp && !blocking()) { e.preventDefault(); openChat(); } return; }
  if (ch === 'm') { MAPO ? closeMap() : (!blocking() && openMap()); return; }
  if (blocking()) return;
  if (ch === 'c') { BUILD = BUILD && BUILD.clear ? null : { clear: true }; buildBar(); }
  else if (ch === 'f') partnerToggle();
  else if (ch === 'g') switchChar();
  else if (c === 'Equal' || c === 'NumpadAdd' || c === 'Minus' || c === 'NumpadSubtract') { const out = c === 'Minus' || c === 'NumpadSubtract'; CFG.zoom = clamp(Math.round(CFG.zoom * (out ? 1 / 1.12 : 1.12) * 100) / 100, .6, 1.8); fit(); saveCfg(); }
});addEventListener('keyup', e => { const c = e.code; KEYS[c] = 0; if ((c === 'Space' || (e.key || '').toLowerCase() === 'e') && holdA === 'k') holdA = null; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = 0; holdA = null; MHOLD = null; BRK = null; LDOWN = false; });
function keyVec() {
  let x = 0, y = 0;
  for (const c in MOVEK) if (KEYS[c]) { x += MOVEK[c][0]; y += MOVEK[c][1]; }
  return [clamp(x, -1, 1), clamp(y, -1, 1)];
}
function toggleFS() { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen(); } catch (e) { } }
function back() {
  if (CHAT.open) { closeChat(); return true; }
  if (FISH_ST) { fishEnd(false, 'Tu as rangé la canne.'); return true; }
  if (UI.modal) { closeModal(); return true; }
  if (MAPO) { closeMap(); return true; }
  if (DLG.on) { dlgSkip(); return true; }
  if (BUILD) { BUILD = null; buildBar(); return true; }
  if (STATE === 'play') { openPause(); return true; }
  if ($('#pick').classList.contains('on')) { $('#pickBack').click(); return true; }
  return false;
}

/* ---------------- boucle ---------------- */
let last = 0, saveT = 0, fpsN = 0, fpsT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
  try {
    if (STATE === 'play' && G) {
      const [kx, ky] = keyVec(), ix = JOY.x || kx, iy = JOY.y || ky, manual = !!(ix || iy);
      if (manual) MOVE = null;
      if (blocking()) G.mv = false;
      else if (manual) playerMove(dt, ix, iy);
      else if (MOVE) followMove(dt);
      else G.mv = false;
      if (manual && BUILD && !paint && !PC) BUILD.cur = null;
      gameTick(dt); partnerUpdate(dt); mobsUpdate(dt); dropsUpdate(dt); partsUpdate(dt); dlgUpdate(dt); fishUpdate(dt);
      if (G.mp) MP.update(dt);
      syncBuild();
      TGT = blocking() || (BUILD && BUILD.clear) ? null : findTarget(); HOVT = null;
      cv.style.cursor = blocking() ? 'default' : 'none';
      if (PC && !blocking()) pcHold(dt);
      if (holdA !== null) { holdT -= dt; if (holdT <= 0) { holdT = .26; press(true, holdA === 'k' ? 'k' : 'a'); } }
      if (BRK) {
        const bt = BRK.t;
        if (BRK.delay > 0) BRK.delay -= dt;
        else if (blocking() || !tvalid(bt) || !treach(bt) || (bt.k === 'obj' && !mineable(bt.i)) || (LP && LP.moved && BRK.touch) || (BRK.auto && manual) || (BRK.key && holdA !== 'k')) BRK = null;
        else {
          BRK.sw -= dt; if (BRK.sw <= 0) { BRK.sw = .38; brkSwing(bt); }
          BRK.p += dt;
          if (BRK.p >= BRK.dur) { breakTarget(bt); if (LP) LP.done = true; BRK.done = true; const keep = BRK; BRK = null; if (keep.touch) { BRK = { ...keep, p: 0, done: true, delay: 9 }; } }
        }
      }
      hud();
      saveT += dt; if (saveT > 20) { saveT = 0; save(); }
    } else if (STATE === 'title') { demoUpdate(dt); partsUpdate(dt); }
    draw(t, dt);
  } catch (e) { console.error(e); }
  fpsN++; if (t - fpsT > 500) { if (CFG.fps) $('#fps').textContent = Math.round(fpsN * 1000 / (t - fpsT)) + ' FPS'; fpsN = 0; fpsT = t; }
}

/* ---------------- chat (multijoueur) ---------------- */
const CHAT = { open: false };
function openChat() {
  if (!G || !G.mp || CHAT.open) return; CHAT.open = true;
  const b = $('#chatIn'); b.classList.add('on'); const i = b.querySelector('input'); i.value = ''; setTimeout(() => i.focus(), 10);
}
function closeChat() { CHAT.open = false; const b = $('#chatIn'); b.classList.remove('on'); b.querySelector('input').blur(); }
$('#chatIn').querySelector('input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) MP.chat(v); closeChat(); e.preventDefault(); }
  else if (e.key === 'Escape') closeChat();
  e.stopPropagation();
});
$('#chatIn').querySelector('button').addEventListener('click', () => { const i = $('#chatIn').querySelector('input'), v = i.value.trim(); if (v) MP.chat(v); closeChat(); });

/* ---------------- cycle de vie (arrière-plan, bouton retour Android) ---------------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (STATE === 'play') save(); if (AU.ctx) try { AU.ctx.suspend(); } catch (e) { } }
  else {
    if (AU.ctx) try { AU.ctx.resume(); } catch (e) { }
    if (STATE === 'play' && G && !G.mp) { const o = offline(); if (o) { G.t = now(); offlineSummary(o); } }
  }
});
addEventListener('pagehide', () => { if (STATE === 'play') save(); });
addEventListener('beforeunload', () => { if (STATE === 'play') save(); });
try {
  const AP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
  if (AP) AP.addListener('backButton', () => { if (!back() && STATE === 'title') AP.exitApp(); });
} catch (e) { }

/* ---------------- démarrage ---------------- */
(async function boot() {
  const T0 = performance.now(), bar = $('#spB');
  document.body.classList.toggle('pc', PC); fit(); if (bar) bar.style.width = '20%';
  await new Promise(r => setTimeout(r, 30));
  genArt(); if (bar) bar.style.width = '60%';
  await loadOverrides(); if (bar) bar.style.width = '80%';
  try { await document.fonts.load('8px PS'); } catch (e) { }
  [['#bBuild', 'u_pick'], ['#bMenu', 'u_bag'], ['#bMap', 'u_map'], ['#bSave', 'u_star'], ['#bJournal', 'u_book'], ['#bSwap', 'u_swap']].forEach(([s, k]) => { $(s).innerHTML = ic(k, 26); });
  applyCfg(); toTitle(); keysHelp(); if (bar) bar.style.width = '100%';
  requestAnimationFrame(loop);
  setTimeout(() => { const s = $('#splash'); s.classList.add('out'); setTimeout(() => s.remove(), 700); }, Math.max(400, 2400 - (performance.now() - T0)));
})();
