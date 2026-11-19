'use strict';
/* ==========================================================
   Nérys — démarrage, écrans titre, commandes, boucle
   ========================================================== */
let STATE = 'boot';
const JOY = { x: 0, y: 0, id: null, ox: 0, oy: 0, moved: false, t0: 0, sx: 0, sy: 0 };
const KEYS = {};

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
  STATE = 'title'; BUILD = null; buildBar(); closeMap && MAPO && closeMap();
  ['#hud', '#ctl', '#pick'].forEach(s => show(s, false)); show('#title', true); cv.classList.add('blur');
  startDemo(); titleButtons();
}
function titleButtons() {
  const s = hasSave();
  $('#tBtns').innerHTML = (s ? `<button class="btn big pri" data-t="cont">Continuer</button><button class="btn big" data-t="new">Nouvelle planète</button>` : `<button class="btn big pri" data-t="new">Jouer</button>`) + `<button class="btn big" data-t="opt">Options</button>` + (ELECTRON ? `<button class="btn big" data-t="quit">Quitter</button>` : '');
}
$('#tBtns').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return; audio(); SFX.ui();
  const a = b.dataset.t;
  if (a === 'cont') { if (load()) { const off = offline(); begin(false, off); } else toast('Sauvegarde illisible', 'u_x', '', 'bad'); }
  else if (a === 'new') {
    if (hasSave()) modal('Nouvelle planète ?', `<p class="desc">Ta partie actuelle sera <b class="no">effacée</b>. Copie-la d’abord (Options > Copier la sauvegarde) si tu veux la garder.</p><div class="row2"><button class="btn" data-a="close">Annuler</button><button class="btn pri" data-a="ok">Recommencer</button></div>`, { ok: () => { closeModal(); pickChar(); } }, { cls: 'small' });
    else pickChar();
  }
  else if (a === 'opt') { UI.tab = 'opt'; openMenu('opt'); }
  else if (a === 'quit') window.close();
});
function pickChar() {
  show('#title', false); show('#pick', true);
  const row = $('#pickRow'); row.innerHTML = '';
  for (const g of ['m', 'f']) {
    const d = document.createElement('button'); d.className = 'pcard';
    const c = cnv(48, 69), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(astro(g, g === 'm' ? '#f0a030' : '#2fb7a8', 'd', 0, true), 0, 0, 48, 69);
    d.appendChild(c); d.insertAdjacentHTML('beforeend', `<b>${NM[g]}</b><small>${g === 'm' ? 'Mécanicien de bord. Parle aux cailloux.' : 'Pilote de secours. A « atterri ».'}</small>`);
    d.onclick = () => { SFX.ok(); try { localStorage.removeItem(SAVE_KEY); } catch (e) { } newGame(g); begin(!CFG.intro); };
    row.appendChild(d);
  }
}
$('#pickBack').onclick = () => { SFX.tab(); show('#pick', false); show('#title', true); };
function begin(intro, off) {
  STATE = 'play'; show('#title', false); show('#pick', false); show('#hud', true); show('#ctl', true); cv.classList.remove('blur');
  CHUNKS.clear(); fit(); applyCfg(); renderMap(true); hud(true); lastTile = -1;
  const f = $('#fade'); f.style.transition = 'none'; f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 1s'; f.classList.remove('on'); }));
  if (intro) { CFG.intro = true; saveCfg(); setTimeout(() => dialog(INTRO), 900); }
  else if (off) setTimeout(() => offlineSummary(off), 700);
  save();
}
function offlineSummary(o) {
  const st = Object.entries(o.st).map(([k, v]) => `<div class="li">${ic(STATN[k][1], 26)}<b>+${fmt(v)}</b><small>${STATN[k][0]}</small></div>`).join('');
  const got = Object.entries(o.got).map(([k, v]) => `<div class="li">${ic('i_' + k, 26)}<b>+${fmt(v)}</b><small>${ITEMS[k].n}</small></div>`).join('');
  modal('Pendant ton absence…', `<p class="desc">Tu es parti·e ${fmtT(o.dt)}${o.full ? ' (maximum ' + (hasR('r_absence') ? '24' : '8') + ' h)' : ''}. Les machines, elles, ont bossé.</p><div class="loot">${st}<div class="li">${ic('u_sci', 26)}<b>+${fmt(o.sci)}</b><small>science</small></div>${got}</div>${o.stages ? `<p class="good">La planète a gagné ${o.stages} stade${o.stages > 1 ? 's' : ''} !</p>` : ''}<button class="btn pri wide" data-a="close">On s’y remet</button>`, {}, { cls: 'small', id: 'off' });
  if (o.stages) { G.party = 6; SFX.fanfare(); }
}

/* ---------------- commandes tactiles ---------------- */
const joyZ = $('#joyZ'), joyB = $('#joy'), knob = $('#knob');
function joyR() { return 46 * CFG.bs / 100; }
joyZ.addEventListener('pointerdown', e => {
  if (STATE !== 'play') return; e.preventDefault(); audio();
  MOVE = null; JOY.id = e.pointerId; joyZ.setPointerCapture(e.pointerId); JOY.ox = e.clientX; JOY.oy = e.clientY; JOY.moved = false; JOY.t0 = performance.now();
  joyB.style.left = e.clientX + 'px'; joyB.style.top = e.clientY + 'px'; joyB.classList.add('on'); knob.style.transform = '';
});
joyZ.addEventListener('pointermove', e => {
  if (e.pointerId !== JOY.id) return; let dx = e.clientX - JOY.ox, dy = e.clientY - JOY.oy; const l = Math.hypot(dx, dy), r = joyR();
  if (l > 10) JOY.moved = true; if (!JOY.moved) return;
  if (l > r) { JOY.ox += dx / l * (l - r); JOY.oy += dy / l * (l - r); joyB.style.left = JOY.ox + 'px'; joyB.style.top = JOY.oy + 'px'; dx = e.clientX - JOY.ox; dy = e.clientY - JOY.oy; }
  JOY.x = dx / r; JOY.y = dy / r; knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const joyUp = e => {
  if (e.pointerId !== JOY.id) return; JOY.id = null; JOY.x = JOY.y = 0; joyB.classList.remove('on'); knob.style.transform = '';
  if (!JOY.moved && performance.now() - JOY.t0 < 350) clickWorld(e.clientX, e.clientY);
};
joyZ.addEventListener('pointerup', joyUp); joyZ.addEventListener('pointercancel', joyUp);
function screenWorld(cx, cy) { const d = Math.min(devicePixelRatio || 1, 3); return [cx * d / S + camX, cy * d / S + camY]; }
function screenTile(cx, cy) { const [x, y] = screenWorld(cx, cy); return [Math.floor(x / TS), Math.floor(y / TS)]; }
let paint = null, MOVE = null, MHOLD = null, mholdT = 0, MOUSE = null, HOVT = null;

/* ---------------- cibles sous le doigt / la souris ---------------- */
function sprH(i) { const b = G.bl[i]; if (b) { const a = ART['b_' + b.id]; return a ? a.height : 16; } const o = W.o[i]; if (!o) return 0; const a = ART[objKey(o, i)]; return a ? a.height : 16; }
function targetAt(wx, wy) {
  const m = [...MOBL, ...PETL].find(m => Math.hypot(wrapD(m.x - wx), wrapD(m.y - 7 - wy)) < 11);
  if (m) return { k: 'mob', m };
  if (Math.hypot(wrapD(P.x - wx), wrapD(P.y - 10 - wy)) < 8) return { k: 'partner' };
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  for (const dy of [0, 1, 2]) {
    const i = tI(tx, ty + dy); if (dy && sprH(i) < 16 * dy + 6) continue; // un sprite haut déborde sur la case du dessus
    const b = G.bl[i]; if (b && !BLD[b.id].floor && !BLD[b.id].wall) return { k: 'bld', i };
    const o = W.o[i]; if (o && (OBJ[o].h || OBJ[o].special)) return { k: 'obj', i };
  }
  const i = tI(tx, ty); if (hasR('r_peche') && isWaterK(tkind(i))) return { k: 'fish', i };
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
  return true;
}
function treach(t) { const [x, y] = tpos(t), r = t.k === 'fish' ? 30 : t.k === 'obj' && W.o[t.i] === 23 ? 40 : 25; return Math.hypot(wrapD(x - G.x), wrapD(y - (G.y - 4))) < r; }
function faceTo(t) { const [x, y] = tpos(t), dx = wrapD(x - G.x), dy = wrapD(y - (G.y - 4)); G.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 'u' : 'd'); if (dx) G.lr = dx < 0 ? 'l' : 'r'; }
function doAct(t) { if (!tvalid(t)) return; faceTo(t); if (t.k === 'obj') G.swing = .18; act(t); }

/* ---------------- clic / toucher dans le monde ---------------- */
function paintable() { if (!BUILD) return false; const d = BUILD.id && BLD[BUILD.id]; return BUILD.pick || BUILD.clear || (d && (d.floor || d.wall)); }
function clickWorld(cx, cy) {
  if (STATE !== 'play' || blocking()) return;
  const [wx, wy] = screenWorld(cx, cy), tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  if (BUILD) {
    if (PC || paintable()) { buildAt(tx, ty); if (BUILD) BUILD.cur = [tx, ty]; return; }
    if (BUILD.cur && BUILD.cur[0] === tx && BUILD.cur[1] === ty) buildAt(tx, ty); else { BUILD.cur = [tx, ty]; SFX.tab(); }
    return;
  }
  const t = targetAt(wx, wy);
  if (t) { MHOLD = t; mholdT = .38; if (treach(t)) { MOVE = null; doAct(t); } else MOVE = { t }; return; }
  MHOLD = null; MOVE = { x: wx, y: wy };
  PARTS.push({ k: 'p', x: wx, y: wy, vx: 0, vy: 0, c: '#ffffff', life: .35, max: .35, s: 2, g: 0 });
}
function followMove(dt) {
  if (MOVE.t) {
    if (!tvalid(MOVE.t)) { MOVE = null; return; }
    if (treach(MOVE.t)) { const t = MOVE.t; MOVE = null; G.mv = false; doAct(t); return; }
    [MOVE.x, MOVE.y] = tpos(MOVE.t);
  }
  const dx = wrapD(MOVE.x - G.x), dy = wrapD(MOVE.y - G.y), l = Math.hypot(dx, dy);
  if (l < 3) { MOVE = null; G.mv = false; return; }
  const ox = G.x, oy = G.y; playerMove(dt, dx / l, dy / l);
  if (Math.hypot(wrapD(G.x - ox), wrapD(G.y - oy)) < speed() * dt * .2) { MOVE.stuck = (MOVE.stuck || 0) + dt; if (MOVE.stuck > .35) { MOVE = null; G.mv = false; } } else MOVE.stuck = 0;
}

/* ---------------- souris / doigt sur le jeu ---------------- */
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (STATE !== 'play') return; audio();
  if (e.button === 2) { if (BUILD) { BUILD = null; buildBar(); SFX.tab(); } MOVE = null; return; }
  if (paintable()) { paint = e.pointerId; cv.setPointerCapture(e.pointerId); }
  clickWorld(e.clientX, e.clientY);
});
cv.addEventListener('pointermove', e => {
  MOUSE = { x: e.clientX, y: e.clientY };
  if (!BUILD || STATE !== 'play') return;
  const [tx, ty] = screenTile(e.clientX, e.clientY);
  if (paint === e.pointerId) { if (BUILD.cur && BUILD.cur[0] === tx && BUILD.cur[1] === ty) return; BUILD.cur = [tx, ty]; buildAt(tx, ty); }
  else if (PC && e.pointerType === 'mouse') BUILD.cur = [tx, ty];
});
const cvUp = () => { paint = null; MHOLD = null; };
cv.addEventListener('pointerup', cvUp); cv.addEventListener('pointercancel', cvUp);
cv.addEventListener('pointerleave', () => { MOUSE = null; });
cv.addEventListener('wheel', e => {
  if (STATE !== 'play' || blocking()) return; e.preventDefault();
  CFG.zoom = clamp(Math.round(CFG.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12) * 100) / 100, .6, 1.8); fit(); saveCfg();
}, { passive: false });

let holdA = null, holdT = 0;
function press(rep) {
  if (STATE !== 'play') return;
  if (DLG.on) { if (!rep) dlgNext(); return; }
  if (FISH_ST) { if (!rep) fishTap(); return; }
  if (MAPO) { if (!rep) closeMap(); return; }
  if (UI.modal) return;
  if (BUILD) { if (!rep) buildAt(...buildCursor()); return; }
  if (!TGT) { if (!rep) SFX.tab(); return; }
  if (rep && !(TGT.k === 'obj' || (TGT.k === 'bld' && G.bl[TGT.i] && G.bl[TGT.i].b >= 1))) return;
  if (TGT.k === 'obj') G.swing = .18;
  act(TGT);
}
const bA = $('#bA');
bA.addEventListener('pointerdown', e => { e.preventDefault(); audio(); bA.classList.add('down'); MOVE = null; press(false); holdA = e.pointerId; holdT = .38; vib(6); });
const upA = () => { holdA = null; bA.classList.remove('down'); };
bA.addEventListener('pointerup', upA); bA.addEventListener('pointercancel', upA); bA.addEventListener('pointerleave', upA);
$('#bBuild').addEventListener('pointerdown', e => { e.preventDefault(); if (STATE !== 'play' || DLG.on || FISH_ST) return; SFX.ui(); if (BUILD) { BUILD = null; buildBar(); } else openBuild(); });
$('#bMenu').addEventListener('click', () => { if (STATE !== 'play' || DLG.on || FISH_ST) return; SFX.ui(); openMenu(); });
$('#bMap').addEventListener('click', () => { if (STATE !== 'play' || DLG.on || FISH_ST) return; MAPO ? closeMap() : openMap(); });
$('#hStageW').addEventListener('click', () => { if (STATE !== 'play' || DLG.on || FISH_ST) return; SFX.ui(); openMenu('planet'); });
$('#dlg').addEventListener('pointerdown', e => { e.preventDefault(); if (e.target.closest('#dlgX')) { dlgSkip(); return; } dlgNext(); });
$('#pickX').onclick = () => $('#pickBack').click();

/* ---------------- clavier ---------------- */
const ACTK = [' ', 'e', 'enter'];
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); KEYS[k] = 1;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (ACTK.includes(k)) { e.preventDefault(); if (!e.repeat) { MOVE = null; press(false); holdA = 'k'; holdT = .38; } }
  else if (k === 'f11') { e.preventDefault(); toggleFS(); }
  else if (k === 'b' && STATE === 'play' && !blocking()) { BUILD ? (BUILD = null, buildBar()) : openBuild(); }
  else if ((k === 'tab' || k === 'i') && STATE === 'play') { e.preventDefault(); UI.modal ? closeModal() : (!blocking() && openMenu()); }
  else if (k === 'm' && STATE === 'play') { MAPO ? closeMap() : (!blocking() && openMap()); }
  else if (k === 'c' && STATE === 'play' && !blocking()) { BUILD = { clear: true }; buildBar(); }
  else if ((k === '+' || k === '=' || k === '-') && STATE === 'play' && !blocking()) { CFG.zoom = clamp(Math.round(CFG.zoom * (k === '-' ? 1 / 1.12 : 1.12) * 100) / 100, .6, 1.8); fit(); saveCfg(); }
  else if (k === 'escape') back();
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); KEYS[k] = 0; if (ACTK.includes(k) && holdA === 'k') holdA = null; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = 0; holdA = null; MHOLD = null; });
function keyVec() {
  let x = 0, y = 0;
  if (KEYS.arrowleft || KEYS.a || KEYS.q) x -= 1; if (KEYS.arrowright || KEYS.d) x += 1;
  if (KEYS.arrowup || KEYS.w || KEYS.z) y -= 1; if (KEYS.arrowdown || KEYS.s) y += 1;
  return [x, y];
}
function toggleFS() { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen(); } catch (e) { } }
function back() {
  if (FISH_ST) { fishEnd(false, 'Tu as rangé la canne.'); return true; }
  if (UI.modal) { closeModal(); return true; }
  if (MAPO) { closeMap(); return true; }
  if (DLG.on) { dlgSkip(); return true; }
  if (BUILD) { BUILD = null; buildBar(); return true; }
  if (STATE === 'play') { openMenu('opt'); return true; }
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
      if (blocking()) { G.mv = false; MOVE = null; }
      else if (manual) playerMove(dt, ix, iy);
      else if (MOVE) followMove(dt);
      else G.mv = false;
      if (manual && BUILD && !paint && !PC) BUILD.cur = null;
      gameTick(dt); partnerUpdate(dt); mobsUpdate(dt); dropsUpdate(dt); partsUpdate(dt); dlgUpdate(dt); fishUpdate(dt);
      TGT = blocking() || BUILD ? null : findTarget();
      HOVT = PC && MOUSE && !BUILD && !blocking() ? targetAt(...screenWorld(MOUSE.x, MOUSE.y)) : null;
      cv.style.cursor = HOVT ? 'pointer' : BUILD ? 'crosshair' : 'default';
      if (holdA !== null) { holdT -= dt; if (holdT <= 0) { holdT = .26; press(true); } }
      if (MHOLD && !MOVE && !blocking()) { mholdT -= dt; if (mholdT <= 0) { mholdT = .26; if (tvalid(MHOLD) && treach(MHOLD) && (MHOLD.k === 'obj' || (MHOLD.k === 'bld' && G.bl[MHOLD.i].b >= 1))) doAct(MHOLD); } }
      hud();
      saveT += dt; if (saveT > 20) { saveT = 0; save(); }
    } else if (STATE === 'title') { demoUpdate(dt); partsUpdate(dt); }
    draw(t, dt);
  } catch (e) { console.error(e); }
  fpsN++; if (t - fpsT > 500) { if (CFG.fps) $('#fps').textContent = Math.round(fpsN * 1000 / (t - fpsT)) + ' FPS'; fpsN = 0; fpsT = t; }
}

/* ---------------- cycle de vie (arrière-plan, bouton retour Android) ---------------- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (STATE === 'play') save(); if (AU.ctx) try { AU.ctx.suspend(); } catch (e) { } }
  else {
    if (AU.ctx) try { AU.ctx.resume(); } catch (e) { }
    if (STATE === 'play' && G) { const o = offline(); if (o) { G.t = now(); offlineSummary(o); } }
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
  ['u_hammer', 'u_bag', 'u_map'].forEach((k, n) => { const el = [$('#bBuild'), $('#bMenu'), $('#bMap')][n]; el.innerHTML = ic(k, 26); });
  applyCfg(); toTitle(); if (bar) bar.style.width = '100%';
  requestAnimationFrame(loop);
  setTimeout(() => { const s = $('#splash'); s.classList.add('out'); setTimeout(() => s.remove(), 700); }, Math.max(400, 2400 - (performance.now() - T0)));
})();
