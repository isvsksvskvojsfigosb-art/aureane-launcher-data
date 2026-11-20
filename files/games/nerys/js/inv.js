'use strict';
/* ==========================================================
   Nérys — inventaire façon Minecraft
   · barre rapide (5) toujours visible + sac (20)
   · glisser-déposer : clic gauche = tout le tas, clic droit = la moitié,
     Maj+clic = envoi rapide, lâcher hors de la fenêtre = jeter par terre
   · fabrication : à la main (inventaire) ou à une station (établi, fonderie, atelier, cuisine)
   · coffres : caisse (18) et silo (36)
   · menu pause : Reprendre · Paramètres · Sauvegarder · Quitter la partie
   ========================================================== */
const INV = { mode: 'inv', at: -1, st: 'main', cat: 'all', sel: null, drag: null };

/* ---------------- accès aux emplacements : 'p:3' (joueur) ou 'c:5' (coffre ouvert) ---------------- */
function slotArr(side) { if (side === 'p') return G.items; const b = G.bl[INV.at]; return b && b.inv; }
function getS(ref) { const [s, i] = ref.split(':'), A = slotArr(s); return A ? A[+i] : null; }
function setS(ref, v) { const [s, i] = ref.split(':'), A = slotArr(s); if (!A) return; A[+i] = v && v.n > 0 ? { k: v.k, n: v.n } : null; invChanged(); }
function giveBack(ref, d) {
  const f = getS(ref);
  if (!f) setS(ref, d);
  else if (f.k === d.k && f.n + d.n <= stackOf(d.k)) { f.n += d.n; invChanged(); }
  else { const a = add(d.k, d.n, true); if (a < d.n) throwItem(d.k, d.n - a); }
}
/* jeter devant soi (l'objet ne revient pas tout de suite dans le sac) */
function throwItem(k, n) {
  const f = DIRS[G.dir]; DROPS.push({ x: G.x + f[0] * 10, y: G.y - 4 + f[1] * 10, k, n, z: 8, vz: 60, vx: f[0] * 70 + rand(-10, 10), vy: f[1] * 50 + rand(-8, 8), t: 0, wait: 2.5 });
  SFX.pickup(); invChanged();
}

/* ---------------- barre rapide (HUD) ---------------- */
let hotSig = '';
function hotbar(force) {
  if (!G || !G.items) return;
  const sig = G.sel + '|' + G.items.slice(0, HOTN).map(s => s ? s.k + s.n : '-').join(',');
  if (!force && sig === hotSig && !invDirty) return; hotSig = sig;
  $('#hot').innerHTML = G.items.slice(0, HOTN).map((s, i) => `<button class="hs ${i === G.sel ? 'on' : ''}" data-h="${i}">${s ? ic('i_' + s.k, 34) + (s.n > 1 ? `<b>${s.n}</b>` : '') : ''}</button>`).join('');
  if (UI.modal === 'inv') renderInv();
  invDirty = false;
}
function selectHot(i) {
  if (!G || i < 0 || i >= HOTN) return;
  G.sel = i; SFX.tab(); hotbar(true);
  const s = G.items[i], n = $('#hotName');
  n.textContent = s ? ITEMS[s.k].n : '';
  n.classList.remove('on'); void n.offsetWidth; if (s) n.classList.add('on');
}
$('#hot').addEventListener('pointerdown', e => { const b = e.target.closest('[data-h]'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (STATE === 'play') selectHot(+b.dataset.h); });

/* ---------------- fenêtre d'inventaire ---------------- */
function openInv(mode = 'inv', at = -1) {
  INV.mode = mode; INV.at = at; INV.sel = null;
  INV.st = mode === 'st' ? G.bl[at].id : 'main';
  if (mode === 'st' && INV.cat !== 'all' && INV.cat !== 'obj' && !RECIPES.some(r => r.st === INV.st && r.cat === INV.cat)) INV.cat = 'all';
  if (mode === 'inv') INV.cat = 'all';
  renderInv(true); SFX.ui();
}
function slotHTML(ref, s, cls = '') { return `<div class="isl ${cls} ${INV.sel === ref ? 'sel' : ''}" data-s="${ref}">${s ? ic('i_' + s.k, 32) + (s.n > 1 ? `<b>${s.n}</b>` : '') : ''}</div>`; }
function playerGrid() {
  const bag = G.items.slice(HOTN).map((s, i) => slotHTML('p:' + (i + HOTN), s)).join('');
  const hot = G.items.slice(0, HOTN).map((s, i) => slotHTML('p:' + i, s, 'hotc' + (i === G.sel ? ' cur' : ''))).join('');
  return `<div class="ipane"><h3>Sac</h3><div class="igrid5">${bag}</div><h3>Barre rapide</h3><div class="igrid5 hotrow">${hot}</div></div>`;
}
function detailHTML() {
  const s = INV.sel && getS(INV.sel);
  if (!s) return '';
  const it = ITEMS[s.k], src = s.k[0] === '@' ? 'Construction : place-la dans la barre rapide pour la poser.' : it.tool ? `Outil ${it.tool === 'rod' ? '' : TIERN[it.tier]} : ${it.tool === 'pick' ? 'roche et minerais' : it.tool === 'axe' ? 'bois, champignons, cactus' : 'pêche'}${it.tool !== 'rod' && toolBonus(it.tool) ? ' · +' + [0, 0, 0, 1, 2, 4][it.tier] + ' de récolte' : ''}. Il sert tout seul, n’importe où dans l’inventaire.` : it.food ? it.food.d : itemSource(s.k);
  return `<div class="idet">${ic('i_' + s.k, 30)}<div class="tx"><b>${it.n} <small>×${s.n}</small></b><small>${esc(src || '')}</small></div>${it.food ? `<button class="btn sm pri" data-a="eat">Manger</button>` : ''}<button class="btn sm" data-a="toss1">Jeter 1</button>${s.n > 1 ? `<button class="btn sm" data-a="tossall">Jeter tout</button>` : ''}</div>`;
}
/* --- fabrication --- */
function recipeList() {
  const st = INV.st, all = RECIPES.map((r, i) => [r, i]).filter(([r]) => r.st === st);
  const ok = all.filter(([r]) => hasR(r.r)), locked = all.filter(([r]) => !hasR(r.r));
  let L = ok;
  if (st !== 'main') L = INV.cat === 'all' ? ok : INV.cat === 'obj' ? ok.filter(([r]) => r.o[0] !== '@') : ok.filter(([r]) => r.cat === INV.cat);
  L.sort((a, b) => (canPay(b[0].i) ? 1 : 0) - (canPay(a[0].i) ? 1 : 0));
  const rows = L.map(([r, i]) => {
    const can = canPay(r.i), it = ITEMS[r.o], many = stackOf(r.o) > 1;
    return `<div class="rcp ${can ? '' : 'off'}" data-a="mk:${i},1" title="${esc(it.n)}">${ic('i_' + r.o, 30)}<div class="rn"><b>${it.n}${r.n > 1 ? ' ×' + r.n : ''}</b><div>${costHTML(r.i)}</div></div>${many ? `<button class="btn sm" data-a="mk:${i},5">×5</button>` : ''}<button class="btn sm ${can ? 'pri' : 'off'}" data-a="mk:${i},1">Fabriquer</button></div>`;
  }).join('') || '<p class="hint">Rien à fabriquer ici pour l’instant.</p>';
  const lk = locked.length ? `<p class="hint">${ic('u_lock', 12)} ${locked.length} recette${locked.length > 1 ? 's' : ''} à débloquer avec la recherche.</p>` : '';
  let tabs = '';
  if (st !== 'main') {
    const cats = [['all', 'Tout'], ['obj', 'Matériaux'], ...CATS.filter(([k]) => ok.some(([r]) => r.cat === k))];
    tabs = `<div class="tabs ctabs">${cats.map(([k, n]) => `<button class="tab ${INV.cat === k ? 'on' : ''}" data-a="cat:${k}">${n}</button>`).join('')}</div>`;
  }
  const title = st === 'main' ? 'Fabriquer à la main' : STATIONS[st];
  const tip = '';
  return `<div class="ipane cpane"><h3>${st === 'main' ? ic('u_hammer', 18) : ic('i_@' + st, 22)} ${title}</h3>${tabs}<div class="rlist">${rows}</div>${lk}${tip}</div>`;
}
function chestGrid() {
  const b = G.bl[INV.at]; if (!b || !b.inv) return '';
  const used = b.inv.filter(Boolean).length;
  return `<div class="ipane cpane"><h3>${ic('i_@' + b.id, 22)} ${BLD[b.id].n} <small>· ${used}/${b.inv.length}</small></h3><div class="igrid6">${b.inv.map((s, i) => slotHTML('c:' + i, s)).join('')}</div><div class="row2"><button class="btn sm" data-a="dump">Tout ranger dedans</button><button class="btn sm" data-a="grab">Tout prendre</button></div></div>`;
}
function renderInv(open) {
  const m = $('#modal'), sc = m.querySelector('.rlist'), y = sc ? sc.scrollTop : 0;
  if (INV.mode === 'chest' && !G.bl[INV.at]) { closeModal(); return; }
  const left = INV.mode === 'chest' ? chestGrid() : recipeList();
  const title = INV.mode === 'chest' ? 'Coffre' : INV.mode === 'st' ? STATIONS[INV.st] : 'Inventaire';
  modal(title, `<div class="invwrap">${left}${playerGrid()}</div>${detailHTML()}`, INVA, { id: 'inv', cls: 'big invB', icon: INV.mode === 'chest' ? 'i_@caisse' : INV.mode === 'st' ? 'i_@' + INV.st : 'u_bag' });
  const sc2 = m.querySelector('.rlist'); if (sc2 && !open) sc2.scrollTop = y;
}
const INVA = {
  mk: a => { const [i, n] = a.split(','); craftN(+i, +n); },
  cat: k => { INV.cat = k; SFX.tab(); renderInv(true); },
  eat: () => { const s = INV.sel && getS(INV.sel); if (s) eat(s.k); },
  toss1: () => { const s = INV.sel && getS(INV.sel); if (!s) return; setS(INV.sel, { k: s.k, n: s.n - 1 }); throwItem(s.k, 1); renderInv(); },
  tossall: () => { const s = INV.sel && getS(INV.sel); if (!s) return; setS(INV.sel, null); throwItem(s.k, s.n); INV.sel = null; renderInv(); },
  dump: () => { for (let i = HOTN; i < NSLOT; i++) { const s = G.items[i]; if (s) quickMove('p:' + i, true); } SFX.pickup(); renderInv(); },
  grab: () => { const b = G.bl[INV.at]; if (!b) return; b.inv.forEach((s, i) => { if (s) quickMove('c:' + i, true); }); SFX.pickup(); renderInv(); },
};
function craftN(i, n) {
  const r = RECIPES[i]; let d = 0;
  if (r.st !== 'main' && !(INV.mode === 'st' && INV.st === r.st)) { toast('Ça se fabrique à : ' + STATIONS[r.st], 'i_@' + r.st, '', 'bad'); SFX.bad(); return 0; }
  for (; d < n; d++) { if (!canPay(r.i)) break; pay(r.i); const a = add(r.o, r.n, d > 0); if (a < r.n) throwItem(r.o, r.n - a); }
  if (d) { inc('craft', d); SFX.ok(); vib(10); if (ITEMS[r.o].tool) toast(ITEMS[r.o].n + ' fabriquée !', 'i_' + r.o, 'Elle sert toute seule, garde-la dans ton inventaire'); }
  else SFX.bad();
  if (UI.modal === 'inv') renderInv();
  return d;
}
function eat(k) {
  const f = ITEMS[k].food; if (!f || !take(k, 1)) return; G.buffs[f.b] = Math.max(G.buffs[f.b] || 0, f.t); inc('eat');
  SFX.chomp(); toast('Miam : ' + ITEMS[k].n, 'i_' + k, f.d); if (UI.modal === 'inv') renderInv();
}
/* envoi rapide : barre <-> sac, ou joueur <-> coffre */
function quickMove(ref, quiet) {
  const s = getS(ref); if (!s) return;
  const [side, idx] = ref.split(':'), i = +idx; let targets;
  if (INV.mode === 'chest') targets = side === 'p' ? G.bl[INV.at].inv.map((_, j) => 'c:' + j) : G.items.map((_, j) => 'p:' + j);
  else targets = i < HOTN ? G.items.map((_, j) => 'p:' + j).slice(HOTN) : G.items.map((_, j) => 'p:' + j).slice(0, HOTN);
  let left = s.n; const st = stackOf(s.k);
  for (const t of targets) { const x = getS(t); if (x && x.k === s.k && x.n < st) { const q = Math.min(st - x.n, left); x.n += q; left -= q; if (!left) break; } }
  for (const t of targets) { if (!left) break; if (!getS(t)) { const q = Math.min(st, left); setS(t, { k: s.k, n: q }); left -= q; } }
  setS(ref, left ? { k: s.k, n: left } : null);
  if (!quiet) { SFX.tab(); renderInv(); }
}

/* ---------------- glisser-déposer (souris et doigt) ---------------- */
document.addEventListener('contextmenu', e => { if (e.target.closest('#modal') || e.target.closest('#hot')) e.preventDefault(); });
document.addEventListener('pointerdown', e => {
  if (UI.modal !== 'inv') return;
  const el = e.target.closest('.isl'); if (!el) return;
  e.preventDefault();
  const ref = el.dataset.s, s = getS(ref);
  if (!s) { INV.sel = null; renderInv(); return; }
  if (e.shiftKey) { quickMove(ref); return; }
  const half = e.button === 2 && s.n > 1, n = half ? Math.ceil(s.n / 2) : s.n;
  INV.drag = { from: ref, k: s.k, n, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId };
  setS(ref, { k: s.k, n: s.n - n });
  const g = document.createElement('div'); g.id = 'dragGhost'; g.innerHTML = ic('i_' + s.k, 36) + (n > 1 ? `<b>${n}</b>` : ''); document.body.appendChild(g);
  g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px';
  el.classList.add('lifted'); el.innerHTML = getS(ref) ? ic('i_' + s.k, 32) + (getS(ref).n > 1 ? `<b>${getS(ref).n}</b>` : '') : '';
}, true);
document.addEventListener('pointermove', e => {
  const D = INV.drag; if (!D || e.pointerId !== D.id) return;
  if (Math.hypot(e.clientX - D.x0, e.clientY - D.y0) > 6) D.moved = true;
  const g = $('#dragGhost'); if (g) { g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; }
  document.querySelectorAll('.isl.hover').forEach(x => x.classList.remove('hover'));
  const t = document.elementFromPoint(e.clientX, e.clientY); const sl = t && t.closest('.isl'); if (sl) sl.classList.add('hover');
});
const dragEnd = e => {
  const D = INV.drag; if (!D || (e && e.pointerId !== D.id)) return; INV.drag = null;
  const g = $('#dragGhost'); if (g) g.remove();
  const t = e ? document.elementFromPoint(e.clientX, e.clientY) : null, sl = t && t.closest('.isl'), inBox = t && t.closest('.mbox');
  const d = { k: D.k, n: D.n };
  if (!D.moved && sl && sl.dataset.s === D.from) { giveBack(D.from, d); INV.sel = D.from; SFX.tab(); }
  else if (sl) dropOn(sl.dataset.s, D.from, d);
  else if (!inBox && e) { throwItem(d.k, d.n); if (INV.sel === D.from && !getS(D.from)) INV.sel = null; }
  else giveBack(D.from, d);
  if (UI.modal === 'inv') renderInv();
};
document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', () => dragEnd(null));
function dropOn(ref, from, d) {
  const t = getS(ref);
  if (!t) { setS(ref, d); INV.sel = ref; }
  else if (t.k === d.k) { const st = stackOf(d.k), q = Math.min(st - t.n, d.n); t.n += q; d.n -= q; invChanged(); if (d.n > 0) giveBack(from, d); INV.sel = ref; }
  else if (!getS(from)) { setS(from, t); setS(ref, d); INV.sel = ref; }
  else giveBack(from, d);
  SFX.tab();
}

/* ---------------- menu pause & paramètres ---------------- */
function openPause() {
  if (!G || G.demo) return;
  const mp = G.mp;
  modal('Pause', `<div class="pausem">
    <button class="btn pri big" data-a="close">Reprendre</button>
    <button class="btn big" data-a="set">Paramètres</button>
    <button class="btn big" data-a="quit">${mp ? 'Quitter le serveur' : 'Quitter la partie'}</button></div>
    <p class="hint">${mp ? 'Partie en ligne : tout est enregistré sur le serveur.' : 'Planète ' + (SLOT + 1) + ' · sauvegarde automatique.'}</p>`,
    { set: () => openSettings(openPause), quit: () => { save(); closeModal(); toTitle(); } }, { id: 'pause', cls: 'small', icon: 'u_planet' });
}
function openSettings(back) {
  const r = () => modal('Paramètres', TABV.opt() + (back ? `<button class="btn wide" data-a="back">‹ Retour</button>` : ''), { ...MENUA, back: back || closeModal }, { id: 'set', cls: 'big setB', icon: 'u_gear', r });
  r();
}
