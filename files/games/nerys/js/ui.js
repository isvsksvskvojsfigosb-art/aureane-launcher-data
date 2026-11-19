'use strict';
/* ==========================================================
   Nérys — interface : HUD, menus, panneaux, carte, pêche,
   dialogues, notifications
   ========================================================== */
const UI = { modal: null, tab: 'sac', coll: 'mobs', bcat: 'base', zorg: 'shop', live: null, sel: null };
const ic = (k, s = 20, cls = '') => `<img class="ic ${cls}" src="${iconURL(k)}" style="width:${s}px;height:${s}px" alt="">`;
const costHTML = c => Object.entries(c || {}).map(([k, v]) => `<span class="cost ${inv(k) >= v ? '' : 'no'}">${ic('i_' + k, 16)}<b>${v}</b></span>`).join('');
const bar = (p, col = 'var(--mint)') => `<div class="bar"><i style="width:${clamp(p, 0, 1) * 100}%;background:${col}"></i></div>`;
const STATN = { o: ['Oxygène', 'u_o', '#8fd8ff'], h: ['Chaleur', 'u_h', '#ff7a5a'], w: ['Eau', 'u_w', '#4fa0e8'], b: ['Biomasse', 'u_b', '#5fd068'] };
function blocking() { return !!(UI.modal || DLG.on || FISH_ST || MAPO); }

/* ================= NOTIFICATIONS ================= */
function toast(t, icon, sub, cls = '') {
  const box = $('#toasts'); if (!box) return;
  while (box.children.length >= 2) box.firstChild.remove();
  const d = document.createElement('div'); d.className = 'toast ' + cls;
  d.innerHTML = (icon && ART[icon] ? ic(icon, 22) : '') + `<div><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  box.appendChild(d); setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, cls === 'tip' ? 7500 : 3600);
  d.onclick = () => d.remove();
}
function tip(t) { toast('Astuce', 'u_star', t, 'tip'); }
function lootToast(title, got) {
  modal(title, `<div class="loot">${got.filter(g => g[1] > 0).map(([k, n, name]) => `<div class="li">${ic(k, 30)}<b>${n > 1 || k.startsWith('i_') || k.startsWith('u_') ? '+' + fmt(n) : 'Nouveau !'}</b><small>${esc(name)}</small></div>`).join('')}</div><button class="btn pri wide" data-a="close">Super !</button>`, {}, { id: 'loot', cls: 'small' });
}
function stageUp(n, sci, coins) {
  SFX.fanfare(); vib([30, 60, 30]); G.party = 6; confettiAt(G.x, G.y - 20, 50);
  const b = $('#banner'); b.innerHTML = `<small>LA PLANÈTE ÉVOLUE</small><b>Stade ${n}</b><span>${esc(stageName(n))}</span><em>${n < STAGES.length ? esc(STAGES[n].d) : 'Encore plus goofy qu’avant.'}</em><i>${ic('u_sci', 16)} +${fmt(sci)} &nbsp; ${ic('u_coin', 16)} +${coins}</i>`;
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  setTimeout(() => b.classList.remove('on'), 5200);
  if (n === 6 && !G.said.helm) { G.said.helm = 1; setTimeout(() => { G.helmet = false; ASTRO.clear(); dialog([['{p}', SAY_HELMET[0]], ['{me}', 'Pfiou. Ça sent la… gelée ? Et les fleurs.'], ['{p}', SAY_HELMET[1]], ['', 'Tu peux remettre le casque quand tu veux : Sac > Style.']]); }, 5500); }
  else setTimeout(() => bubble(pick(['La planète a changé, tu as vu ?!', 'Regarde ! C’est nous qui avons fait ça !', 'Stade ' + n + ' ! On fête ça avec une sieste ?', 'Je sens un petit vent tout doux. C’est nouveau.'])), 5400);
}

/* ================= DIALOGUES ================= */
const DLG = { on: false, q: [], cur: null, ti: 0, tm: 0, cb: null };
const fm = s => s.replace(/\{me\}/g, NM[G.who]).replace(/\{p\}/g, NM[G.who === 'm' ? 'f' : 'm']);
function dialog(lines, done) { DLG.q = lines.slice(); DLG.cb = done; DLG.on = true; $('#dlg').classList.add('on'); dlgNext(); }
function dlgNext() {
  if (DLG.cur && DLG.ti < DLG.cur[1].length) { DLG.ti = DLG.cur[1].length; dlgShow(); return; }
  if (!DLG.q.length) { DLG.on = false; DLG.cur = null; $('#dlg').classList.remove('on'); const f = DLG.cb; DLG.cb = null; if (f) f(); return; }
  const [w, t] = DLG.q.shift(); DLG.cur = [fm(w), fm(t), w]; DLG.ti = 0; DLG.tm = 0;
  const who = w === '{me}' ? G.who : w === '{p}' ? (G.who === 'm' ? 'f' : 'm') : null;
  $('#dlgN').textContent = DLG.cur[0]; $('#dlgN').style.display = DLG.cur[0] ? '' : 'none';
  const p = $('#dlgP'); if (who) { p.src = portrait(who, G.helmet, suitColor(who === G.who ? G.suit : (G.looks && G.looks[who] && G.looks[who].suit) || (who === 'm' ? 'orange' : 'teal'), 0)); p.style.display = ''; } else p.style.display = 'none';
  dlgShow();
}
function dlgShow() { $('#dlgT').textContent = DLG.cur ? DLG.cur[1].slice(0, DLG.ti) : ''; $('#dlgA').style.visibility = DLG.cur && DLG.ti >= DLG.cur[1].length ? 'visible' : 'hidden'; }
function dlgUpdate(dt) { if (!DLG.cur || DLG.ti >= DLG.cur[1].length) return; DLG.tm += dt; while (DLG.tm > .022 && DLG.ti < DLG.cur[1].length) { DLG.tm -= .022; DLG.ti++; if (DLG.ti % 3 === 0) SFX.type(); } dlgShow(); }

/* ================= MODALES ================= */
function modal(title, body, actions = {}, opts = {}) {
  const m = $('#modal'), still = m.classList.contains('on'); // déjà ouverte : pas d'animation (rafraîchissement, changement d'onglet)
  m.innerHTML = `<div class="mbox ${opts.cls || ''} ${still ? 'still' : ''}">${title !== null ? `<div class="mh">${opts.icon ? ic(opts.icon, 26) : ''}<h2>${title}</h2><button class="x" data-a="close" title="Fermer (Échap)">✕</button></div>` : `<button class="x xTop" data-a="close" title="Fermer (Échap)">✕</button>`}<div class="mb">${body}</div></div>`;
  m._a = actions; m._r = opts.r || null; UI.modal = opts.id || 'x'; UI.live = opts.live || null; m.classList.add('on');
}
function closeModal() { $('#modal').classList.remove('on'); UI.modal = null; UI.live = null; save(); }
function refresh() { const m = $('#modal'); if (m._r) { const b = m.querySelector('.mb'), y = b ? b.scrollTop : 0, r = m.querySelector('.rbody'), ry = r ? r.scrollTop : 0; m._r(); const b2 = m.querySelector('.mb'), r2 = m.querySelector('.rbody'); if (b2) b2.scrollTop = y; if (r2) r2.scrollTop = ry; } }
$('#modal').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); const m = $('#modal');
  if (!b) { if (e.target === m) { SFX.tab(); closeModal(); } return; }
  const [k, arg] = b.dataset.a.split(':');
  if (k === 'close') { SFX.tab(); closeModal(); return; }
  const f = m._a && m._a[k]; if (f) f(arg, b);
});

/* ================= MENU PRINCIPAL ================= */
const TABS = [['sac', 'Sac', 'u_bag'], ['craft', 'Fabriquer', 'u_hammer'], ['res', 'Recherche', 'u_sci'], ['planet', 'Planète', 'u_planet'], ['coll', 'Collection', 'u_book'], ['style', 'Style', 'u_shirt'], ['opt', 'Options', 'u_gear']];
function openMenu(tab) {
  if (tab) UI.tab = tab;
  const r = () => {
    const rail = TABS.map(([k, n, i]) => `<button class="rt ${k === UI.tab ? 'on' : ''}" data-a="tab:${k}">${ic(i, 22)}<span>${n}</span></button>`).join('');
    modal(null, `<div class="menu"><nav class="rail">${rail}<button class="rt cl" data-a="close">${ic('u_x', 20)}<span>Fermer</span></button></nav><section class="rbody">${TABV[UI.tab]()}</section></div>`, MENUA, { id: 'menu', cls: 'big menuB', r, live: UI.tab === 'planet' || UI.tab === 'sac' ? 1 : null });
  };
  r();
}
const MENUA = {
  tab: k => { UI.tab = k; UI.sel = null; SFX.tab(); openMenu(); const r = $('.rbody'); if (r) r.scrollTop = 0; },
  sel: k => { UI.sel = UI.sel === k ? null : k; SFX.tab(); refresh(); },
  eat: k => eat(k),
  craft: (a) => { const [i, n] = a.split(','); craftN(+i, n === 'max' ? 999 : +n); refresh(); },
  res: id => { research(id); refresh(); },
  rcat: k => { UI.rcat = k; SFX.tab(); refresh(); const r = $('.rbody'); if (r) r.scrollTop = 0; },
  drop: a => { const [k, n] = a.split(','); dropItem(k, n); },
  save: () => { saveNow(); refresh(); }, swap: () => { closeModal(); switchChar(); }, stay: () => { partnerToggle(); refresh(); },
  coll: k => { UI.coll = k; SFX.tab(); refresh(); },
  hat: k => { if (!G.hats.includes(k)) return SFX.bad(); G.hat = k; G.looks[G.who] = { hat: G.hat, suit: G.suit }; SFX.ok(); refresh(); },
  suit: k => { if (!G.suits.includes(k)) return SFX.bad(); G.suit = k; G.looks[G.who] = { hat: G.hat, suit: G.suit }; ASTRO.clear(); SFX.ok(); refresh(); },
  helm: () => { G.helmet = !G.helmet; ASTRO.clear(); SFX.ok(); refresh(); },
  tog: k => { CFG[k] = !CFG[k]; saveCfg(); applyCfg(); SFX.tab(); refresh(); },
  zoom: z => { CFG.zoom = +z; saveCfg(); fit(); SFX.tab(); refresh(); },
  fs: () => toggleFS(), quitApp: () => { save(); window.close(); },
  exp: () => G.mp ? null : (save(), exportSlot(SLOT)), quit: () => { save(); closeModal(); toTitle(); }, cred: () => credits(),
};
const TABV = {};
TABV.sac = () => {
  const stacks = []; for (const k of Object.keys(ITEMS)) { let n = inv(k); const st = stackOf(k); while (n > 0) { const q = Math.min(st, n); stacks.push([k, q]); n -= q; } }
  const tot = AG.slots, cells = stacks.map(([k, q]) => `<button class="slotc ${UI.sel === k ? 'on' : ''}" data-a="sel:${k}" title="${esc(ITEMS[k].n)}">${ic('i_' + k, 28)}${q > 1 ? `<b>${q}</b>` : ''}</button>`);
  for (let n = stacks.length; n < tot; n++) cells.push('<span class="slotc empty"></span>');
  let det = `<div class="det hint0">${ic('u_bag', 30)}<div><b>${PC ? 'Clique' : 'Touche'} un objet</b><small>pour voir où le trouver, le manger ou le jeter.</small></div></div>`;
  if (UI.sel && ITEMS[UI.sel] && inv(UI.sel) > 0) {
    const k = UI.sel, it = ITEMS[k], src = itemSource(k);
    const info = it.tool ? `Outil : ${it.tool === 'pick' ? 'roche, minerais, cristaux, glace' : it.tool === 'axe' ? 'champignons géants, arbres, cactus' : 'pêche dans les lacs'}${it.tool !== 'rod' ? ' · +' + [0, 0, 1, 2, 4][it.tier] + ' par coup' : ''}. Utilisé tout seul.` : it.food ? it.food.d : src;
    det = `<div class="det">${ic('i_' + k, 34)}<div><b>${it.n} <small>×${inv(k)}</small></b><small>${esc(info || '')}</small></div><div class="det-bt">${it.food ? `<button class="btn pri sm" data-a="eat:${k}">Manger</button>` : ''}<button class="btn sm" data-a="drop:${k},1">Jeter 1</button>${inv(k) > 1 ? `<button class="btn sm" data-a="drop:${k},all">Jeter tout</button>` : ''}</div></div>`;
  }
  const tl = ['pick', 'axe', 'rod'].map(t => { const tier = toolTier(t), k = Object.keys(ITEMS).find(x => ITEMS[x].tool === t && ITEMS[x].tier === tier && inv(x) > 0); return `<span class="chip ${k ? '' : 'miss'}">${ic(k ? 'i_' + k : t === 'pick' ? 'i_pioche' : t === 'axe' ? 'i_hache' : 'i_canne', 16)} ${k ? ITEMS[k].n : 'Pas de ' + (t === 'pick' ? 'pioche' : t === 'axe' ? 'hache' : 'canne')}</span>`; }).join('');
  const buffs = Object.entries(G.buffs).filter(([k, v]) => v > 0 && k !== 'rainbow').map(([k, v]) => `<span class="chip">${{ speed: 'Vitesse', harvest: 'Récolte ×2', luck: 'Chance', all: 'Super-forme' }[k]} · ${fmtT(v)}</span>`).join('');
  return `<h3>Sac <small>· ${stacks.length} / ${tot} emplacements</small></h3>${det}<div class="sgrid2">${cells.join('')}</div><div class="chips">${tl}${buffs}</div>`;
};const stationOk = st => st === 'main' || nb(st) > 0;
function recipeRows(st) {
  return RECIPES.map((r, i) => [r, i]).filter(([r]) => r.st === st && hasR(r.r)).map(([r, i]) => {
    const can = stationOk(r.st) && canPay(r.i) && room(r.o) >= r.n, mx = maxCraft(r), tool = ITEMS[r.o].tool;
    return `<div class="rrow ${can ? '' : 'off'}">${ic('i_' + r.o, 28)}<div class="rn"><b>${ITEMS[r.o].n}${r.n > 1 ? ' ×' + r.n : ''}</b><div>${costHTML(r.i)}</div></div><small>${inv(r.o) || ''}</small><button class="btn sm ${tool ? 'pri' : ''}" data-a="craft:${i},1">×1</button>${tool ? '' : `<button class="btn sm" data-a="craft:${i},5">×5</button><button class="btn sm pri" data-a="craft:${i},max">Max${mx ? ' ' + mx : ''}</button>`}</div>`;
  }).join('');
}
function maxCraft(r) { if (!stationOk(r.st)) return 0; let m = Math.floor(room(r.o) / r.n); for (const k in r.i) m = Math.min(m, Math.floor(inv(k) / r.i[k])); return Math.max(0, m); }
TABV.craft = () => Object.keys(STATIONS).map(st => {
  if (st === 'main') return `<h3>${ic('u_hammer', 22)} À la main <small>· pas besoin d’atelier</small></h3>${recipeRows('main')}`;
  const built = nb(st) > 0, unlocked = hasR(BLD[st].r);
  if (!unlocked) return `<h3 class="lock">${ic('u_lock', 16)} ${STATIONS[st]} <small>· recherche « ${RESI[BLD[st].r].n} »</small></h3>`;
  return `<h3>${ic('b_' + st, 22)} ${STATIONS[st]} ${built ? '' : '<small class="no">· à construire (' + (PC ? keyLabel('KeyB') : 'marteau') + ')</small>'}</h3>${recipeRows(st)}`;
}).join('') + '<p class="hint">Les stations marchent de partout : pas besoin d’être à côté. Les outils servent tout seuls quand ils sont dans le sac.</p>';
function craftN(i, n) {
  const r = RECIPES[i]; if (!stationOk(r.st)) { toast('Construis d’abord : ' + STATIONS[r.st], 'b_' + r.st, '', 'bad'); SFX.bad(); return 0; }
  let d = 0; for (; d < n; d++) { if (!canPay(r.i) || room(r.o) < r.n) break; pay(r.i); add(r.o, r.n, d > 0); }
  if (d) { inc('craft', d); SFX.ok(); vib(10); if (ITEMS[r.o].tool) toast(ITEMS[r.o].n + ' fabriquée !', 'i_' + r.o, 'Elle sert toute seule, garde-la dans le sac'); }
  else { SFX.bad(); if (room(r.o) < r.n) fullWarn(r.o); }
  return d;
}
function dropItem(k, n) { n = n === 'all' ? inv(k) : Math.min(inv(k), +n); if (n <= 0) return; G.inv[k] -= n; if (G.inv[k] <= 0) { delete G.inv[k]; UI.sel = null; } SFX.pickup(); refresh(); }function eat(k) {
  const f = ITEMS[k].food; if (!f || inv(k) < 1) return; G.inv[k]--; G.buffs[f.b] = Math.max(G.buffs[f.b] || 0, f.t); inc('eat');
  SFX.ok(); toast('Miam : ' + ITEMS[k].n, 'i_' + k, f.d); refresh();
}
function resState(r) {
  if (hasR(r.id)) return 'done';
  const miss = (r.req || []).filter(x => !hasR(x)); if (miss.length) return 'req';
  if (r.st && G.stage < r.st) return 'stage';
  return G.sci >= r.c ? 'ok' : 'poor';
}
function unlocksOf(id) { return Object.keys(BLD).filter(k => BLD[k].r === id && !BLD[k].shop).slice(0, 8); }
TABV.res = () => {
  const cat = UI.rcat || 'all', order = { ok: 0, poor: 1, stage: 2, req: 3, done: 4 };
  const all = RES.map(r => [r, resState(r)]);
  const chips = [['all', 'Tout'], ['dispo', 'Disponibles'], ...RESCATS, ['done', 'Terminées']].map(([k, n]) => { const c = k === 'dispo' ? all.filter(x => x[1] === 'ok').length : 0; return `<button class="tab ${cat === k ? 'on' : ''}" data-a="rcat:${k}">${n}${c ? ` <i class="cnt">${c}</i>` : ''}</button>`; }).join('');
  let L = all.filter(([r, s]) => cat === 'done' ? s === 'done' : s !== 'done' && (cat === 'all' || (cat === 'dispo' ? s === 'ok' : r.cat === cat)));
  L.sort((a, b) => order[a[1]] - order[b[1]] || a[0].c - b[0].c);
  const cards = L.map(([r, s]) => {
    if (s === 'done') return `<div class="rcard done"><div class="rt2"><b>✔ ${r.n}</b></div><small>${r.d}</small></div>`;
    const why = s === 'req' ? 'Nécessite : ' + r.req.filter(x => !hasR(x)).map(x => RESI[x].n).join(', ') : s === 'stage' ? 'Nécessite le stade ' + r.st + ' de la planète' : '';
    const un = unlocksOf(r.id);
    return `<div class="rcard ${s}"><div class="rt2"><b>${r.n}</b><span class="price">${ic('u_sci', 14)} ${fmt(r.c)}</span></div><small>${r.d}</small>${un.length ? `<div class="unl">${un.map(k => ic('b_' + k, 22)).join('')}</div>` : ''}${why ? `<small class="no">${why}</small>` : `<button class="btn ${s === 'ok' ? 'pri' : 'off'} sm" data-a="res:${r.id}">${s === 'ok' ? 'Rechercher' : 'Il manque ' + fmt(r.c - G.sci) + ' science'}</button>`}</div>`;
  }).join('');
  return `<h3>Recherche <small>· ${ic('u_sci', 14)} ${fmt(G.sci)} science (+${fmt(AG.sciRate)}/s) · ${all.filter(x => x[1] === 'done').length}/${RES.length}</small></h3><div class="tabs rtabs">${chips}</div><div class="rgrid">${cards || '<p class="hint">Rien ici pour le moment.</p>'}</div>
  <p class="hint">La science vient de l’épave (un peu), des labos, des découvertes, des commandes de Zorg, des capsules et de chaque nouveau stade de la planète.</p>`;
};function research(id) {
  const r = RESI[id]; if (resState(r) !== 'ok') { SFX.bad(); return; }
  G.sci -= r.c; G.res.push(id); recount(); SFX.level(); vib(20);
  const un = unlocksOf(id).map(k => BLD[k].n);
  toast('Recherche : ' + r.n, 'u_sci', un.length ? 'Débloque : ' + un.slice(0, 3).join(', ') + (un.length > 3 ? '…' : '') : r.d, 'gold'); save();
}
TABV.planet = () => {
  const sp = stageProgress(), n = G.stage;
  const stats = Object.entries(STATN).map(([k, [nm, i, c]]) => `<div class="stat">${ic(i, 20)}<div><b>${nm}</b>${bar(G.st[k] / Math.max(1, stageThr(n + 1) / 4), c)}<small>${fmt(G.st[k])} · +${fmt(AG.rate[k])}/s ${sp.lag === k ? '<em class="no">← à booster</em>' : ''}</small></div></div>`).join('');
  return `<div class="planet"><canvas id="plC" width="96" height="96"></canvas><div><small>STADE ${n}</small><h2>${esc(stageName(n))}</h2><p>${n < STAGES.length ? esc(STAGES[n].d) : 'Au-delà du paradis.'}</p>${bar(sp.p, 'var(--pink)')}<small>Prochain : <b>${esc(stageName(n + 1))}</b> · ${fmt(sp.tot)} / ${fmt(sp.need)} (chaque jauge ≥ ${fmt(sp.need / 8)})</small></div></div>
  <div class="stats">${stats}</div>
  <div class="kv"><span>${ic('u_bolt', 16)} Énergie</span><b class="${AG.eff < 1 ? 'no' : ''}">${fmt(AG.prod)} / ${fmt(AG.cons)} ⚡ ${AG.eff < 1 ? '· machines à ' + Math.round(AG.eff * 100) + ' %' : ''}</b></div>
  <div class="kv"><span>${ic('u_heart', 16)} Confort de la base</span><b>${AG.comfort} · terraformation +${Math.round(comfortBonus() * 100)} %</b></div>
  <div class="kv"><span>${ic('u_star', 16)} Bonus de recherche</span><b>×${AG.mult.toFixed(2).replace('.', ',')}</b></div>
  <div class="kv"><span>${ic('u_sci', 16)} Science</span><b>+${fmt(AG.sciRate)}/s</b></div>
  <h3>Les stades</h3><div class="stages">${Array.from({ length: Math.max(11, n + 2) }, (_, k) => `<span class="${k <= n ? 'ok' : ''}">${k <= n ? '✔' : k}. ${esc(stageName(k))}</span>`).join('')}</div>`;
};
function drawPlanetC() {
  const c = $('#plC'); if (!c) return; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 96, 96);
  const base = mix('#6a4a8a', '#3a7ad8', V.wb * .6), land = mix('#5a4879', '#4fbf5a', V.gc), t = performance.now() / 4000;
  x.fillStyle = mix('#2a1a40', '#9fd8ff', V.sky * .5); x.beginPath(); x.arc(48, 48, 46, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(48, 48, 40, 0, 7); x.clip(); x.fillStyle = base; x.fillRect(0, 0, 96, 96);
  for (let k = 0; k < 9; k++) { const px = ((hash2(k, 1, 4) * 120 + t * 20) % 120) - 12, py = 10 + hash2(k, 2, 4) * 76, r = 6 + hash2(k, 3, 4) * 12; x.fillStyle = k % 3 === 0 ? mix(land, '#ffffff', V.melt < .5 ? .6 : 0) : land; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
  const g = x.createRadialGradient(34, 34, 4, 48, 48, 44); g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(0,0,30,.45)'); x.fillStyle = g; x.fillRect(0, 0, 96, 96); x.restore();
}
TABV.coll = () => {
  const sub = [['mobs', 'Bestiaire'], ['fish', 'Poissons'], ['tro', 'Trophées'], ['exp', 'Exploration']].map(([k, n]) => `<button class="tab ${UI.coll === k ? 'on' : ''}" data-a="coll:${k}">${n}</button>`).join('');
  let b = '';
  if (UI.coll === 'mobs') b = `<div class="cgrid">${Object.entries(MOBS).map(([k, m]) => { const s = G.mobs[k], g = G.mobs[k + '_g']; return `<div class="cc ${s ? '' : 'unk'}">${s ? ic('m_' + k + '_0', 40) : '<div class="q">?</div>'}<b>${s ? m.n : '???'}</b><small>${s ? m.d : 'Pas encore rencontré'}</small>${s ? `<small>Donne : ${ITEMS[m.drop].n}${m.night ? ' · nuit' : ''}</small>` : ''}<span class="gold ${g ? 'on' : ''}">${g ? ic('m_' + k + '_0g', 22) + ' doré !' : '✦ doré : ?'}</span></div>`; }).join('')}</div><p class="hint">Caresse une créature pour l’ajouter. 1 chance sur 60 qu’elle soit dorée !</p>
    ${G.pets.length ? `<h3>Tes créatures</h3><div class="chips">${G.pets.map(p => `<span class="chip">${ic('m_' + p.sp + '_0' + (p.gold ? 'g' : ''), 18)} ${esc(p.name)}</span>`).join('')}</div>` : ''}`;
  else if (UI.coll === 'fish') b = `<h3>${nFish()} / ${FISH.length} espèces · ${cnt('fish')} prises</h3><div class="cgrid">${FISH.map(f => { const n = G.fish[f.id]; return `<div class="cc ${n ? '' : 'unk'}">${n ? ic('fi_' + f.id, 40) : '<div class="q">?</div>'}<b>${n ? f.n : '???'}</b><small>${f.b >= 0 ? BIOMES[f.b].n : 'Partout'}${f.r < 6 ? ' · très rare' : f.r < 16 ? ' · rare' : ''}${f.st ? ' · stade ' + f.st : ''}</small>${n ? `<small>Pêché ${n}×</small>` : ''}</div>`; }).join('')}</div>`;
  else if (UI.coll === 'tro') { const d = TROPHIES.filter(t => G.tro[t[0]]).length; b = `<h3>${d} / ${TROPHIES.length} trophées</h3><div class="tgrid">${TROPHIES.map(([id, n, desc, , rw]) => `<div class="tr ${G.tro[id] ? 'ok' : ''}">${ic(G.tro[id] ? 'u_trophy' : 'u_lock', 22)}<div><b>${n}</b><small>${desc}${rw ? ' · récompense : ' + (rw.hat ? 'chapeau' : '') + (rw.hat && rw.suit ? ' + ' : '') + (rw.suit ? 'combinaison' : '') : ''}</small></div></div>`).join('')}</div>`; }
  else b = `<div class="kv"><span>Planète explorée</span><b>${(explored() * 100).toFixed(1).replace('.', ',')} %</b></div>${bar(explored())}
    <div class="kv"><span>Capsules de fret ouvertes</span><b>${cnt('cap')} / ${W.caps.length}</b></div><div class="kv"><span>Statues de canard</span><b>${cnt('mono')} / 8</b></div>
    <div class="kv"><span>Distance parcourue</span><b>${(cnt('walk') / 1000).toFixed(2).replace('.', ',')} km</b></div><div class="kv"><span>Jours sur Nérys</span><b>${dayN()}</b></div>
    <div class="kv"><span>Coups de multi-outil</span><b>${fmt(cnt('hits'))}</b></div><div class="kv"><span>Constructions posées</span><b>${fmt(cnt('build'))}</b></div><div class="kv"><span>Caresses</span><b>${fmt(cnt('pet'))}</b></div><div class="kv"><span>Commandes livrées</span><b>${cnt('order')}</b></div>`;
  return `<div class="tabs">${sub}</div>${b}`;
};
TABV.style = () => {
  const hats = HATS.map(([k, n, src]) => { const own = G.hats.includes(k); return `<button class="sc ${G.hat === k ? 'on' : ''} ${own ? '' : 'unk'}" data-a="hat:${k}">${k === 'none' ? '<div class="q">∅</div>' : own ? ic('h_' + k, 36) : '<div class="q">?</div>'}<b>${own ? n : '???'}</b><small>${own ? '' : srcTxt(src)}</small></button>`; }).join('');
  const suits = SUITS.map(([k, n, c, src]) => { const own = G.suits.includes(k); return `<button class="sc ${G.suit === k ? 'on' : ''} ${own ? '' : 'unk'}" data-a="suit:${k}"><div class="sw2" style="background:${k === 'arcenciel' ? 'linear-gradient(90deg,#ff6f91,#ffd23f,#7ce86a,#5ab8ff,#b78cff)' : c}"></div><b>${own ? n : '???'}</b><small>${own ? '' : srcTxt(src)}</small></button>`; }).join('');
  return `<h3>Casque</h3>${G.stage >= 6 ? `<button class="btn" data-a="helm">${G.helmet ? 'Enlever le casque' : 'Remettre le casque'}</button>` : '<p class="hint">Atteins le stade 6 (air respirable) pour pouvoir enlever le casque.</p>'}
  <h3>Chapeaux (${G.hats.length - 1}/${HATS.length - 1})</h3><div class="sgrid">${hats}</div><h3>Combinaisons (${G.suits.length}/${SUITS.length})</h3><div class="sgrid">${suits}</div>`;
};
function srcTxt(s) { return s === 'cap' ? 'Capsules de fret' : s.startsWith('shop') ? 'Boutique de Zorg' : s; }
TABV.opt = () => {
  const sl = (k, l, min, max) => `<div class="sl"><label><span>${l}</span><b id="v_${k}">${CFG[k]}%</b></label><input type="range" data-k="${k}" min="${min}" max="${max}" value="${CFG[k]}" style="--v:${(CFG[k] - min) / (max - min) * 100}%"></div>`;
  const tg = (k, l, s) => `<button class="tg" data-a="tog:${k}"><span>${l}${s ? `<small>${s}</small>` : ''}</span><i class="sw ${CFG[k] ? 'on' : ''}"></i></button>`;
  const K = keyLabel, other = NM[G && G.who === 'm' ? 'f' : 'm'];
  const game = G && !G.demo ? `<h3>Partie</h3><div class="row2"><button class="btn pri sm" data-a="save">${ic('u_star', 14)} ${G.mp ? 'Envoyer ma progression' : 'Sauvegarder'}${PC ? ' (Ctrl+S)' : ''}</button>${G.mp ? '' : '<button class="btn sm" data-a="exp">Exporter en fichier</button>'}</div>
  ${G.mp ? `<p class="hint">Partie en ligne sur « ${esc(MP.info ? MP.info.name : MP.addr)} ». Tout est enregistré sur le serveur.</p>` : `<p class="hint">Sauvegarde automatique toutes les 20 secondes · emplacement ${SLOT + 1}.</p>
  <h3>Équipe</h3><div class="row2"><button class="btn sm" data-a="swap">⇄ Jouer ${other}${PC ? ' (' + K('KeyG') + ')' : ''}</button><button class="btn sm" data-a="stay">${G.pm === 'stay' ? 'Dire à ' + other + ' de te suivre' : 'Dire à ' + other + ' de rester ici'}${PC ? ' (' + K('KeyF') + ')' : ''}</button></div>`}
  <div class="row2"><button class="btn sm" data-a="quit">${G.mp ? 'Quitter le serveur' : 'Menu principal'}</button></div>` : '';
  const pcs = PC ? `<h3>Commandes</h3><div class="keys2">
    <span><b>${K('KeyW')} ${K('KeyA')} ${K('KeyS')} ${K('KeyD')}</b> ou flèches</span><i>Bouger</i>
    <span><b>Clic gauche</b></span><i>Casser, récolter, caresser (maintenir : continuer / casser une construction)</i>
    <span><b>Clic droit</b></span><i>Poser (en construction), utiliser, ouvrir, parler</i>
    <span><b>${K('KeyE')}</b> ou Espace</span><i>Agir sur ce qui est devant toi</i>
    <span><b>${K('KeyQ')}</b></span><i>Sac</i><span><b>Tab</b></span><i>Menu</i>
    <span><b>${K('KeyB')}</b></span><i>Construire</i><span><b>${K('KeyC')}</b></span><i>Défricher (enlève pour de bon)</i>
    <span><b>${K('KeyF')}</b></span><i>Compagnon : reste ici / suis-moi</i><span><b>${K('KeyG')}</b></span><i>Changer de personnage</i>
    <span><b>${K('KeyM')}</b></span><i>Carte</i><span><b>Entrée</b></span><i>Chat (multijoueur)</i>
    <span><b>Molette</b> · + / −</span><i>Zoom</i><span><b>Ctrl+S</b></span><i>Sauvegarder</i><span><b>F11</b></span><i>Plein écran</i></div>
    ${tg('keys', 'Aide des touches à l’écran')}<div class="row2"><button class="btn sm" data-a="fs">Plein écran (F11)</button>${ELECTRON ? '<button class="btn sm" data-a="quitApp">Quitter le jeu</button>' : ''}</div>` : '';
  return game + `<h3>Son</h3>${sl('vm', 'Volume général', 0, 100)}${sl('vs', 'Effets', 0, 100)}${sl('vx', 'Musique', 0, 100)}${PC ? '' : tg('vib', 'Vibrations')}
  <h3>Affichage</h3><div class="zoom"><span>Zoom</span>${[[.75, 'Loin'], [1, 'Normal'], [1.3, 'Près']].map(([z, n]) => `<button class="btn sm ${CFG.zoom === z ? 'pri' : ''}" data-a="zoom:${z}">${n}</button>`).join('')}</div>${sl('nd', 'Obscurité de la nuit', 0, 100)}${sl('ui', 'Taille de l’interface', 70, 130)}${tg('fps', 'Afficher les FPS')}
  ${pcs}${PC ? '' : `<h3>Commandes</h3>${tg('lefty', 'Mode gaucher', 'Joystick à droite, boutons à gauche')}${sl('bs', 'Taille des boutons', 70, 140)}${sl('bo', 'Opacité des boutons', 30, 100)}`}${tg('tips', 'Astuces', 'Petits conseils au début')}
  <div class="row2"><button class="btn sm" data-a="cred">Crédits</button></div><p class="ver">Nérys v2.2 · © Aureane Studio</p>`;
};$('#modal').addEventListener('input', e => {
  const t = e.target, k = t.dataset.k; if (!k) return; CFG[k] = +t.value;
  t.style.setProperty('--v', (t.value - t.min) / (t.max - t.min) * 100 + '%'); const l = $('#v_' + k); if (l) l.textContent = t.value + '%';
  applyCfg(); setVol(); saveCfg();
});
$('#modal').addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.k; if (k === 'vs' || k === 'vm') SFX.ok(); });
function applyCfg() {
  const s = document.documentElement.style; s.setProperty('--bs', CFG.bs / 100); s.setProperty('--bo', CFG.bo / 100);
  document.body.classList.toggle('lefty', !!CFG.lefty); document.body.classList.toggle('nokeys', CFG.keys === false); $('#fps').style.display = CFG.fps ? 'block' : 'none';
  s.setProperty('--ui', (CFG.ui || 100) / 100);
}
function exportSave() {
  save(); const s = localStorage.getItem(SAVE_KEY) || '', code = btoa(unescape(encodeURIComponent(s)));
  const done = () => toast('Sauvegarde copiée !', 'u_star', 'Colle-la sur l’autre appareil');
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, () => showCode(code)); else showCode(code);
}
function showCode(code) { modal('Ta sauvegarde', `<p class="hint">Copie ce texte :</p><textarea class="code" readonly>${code}</textarea><button class="btn wide" data-a="close">OK</button>`, {}, { cls: 'small' }); }
function importSave() {
  modal('Coller une sauvegarde', `<p class="hint">Colle ici le code copié depuis l’autre appareil. Ta partie actuelle sera remplacée.</p><textarea class="code" id="impT"></textarea><button class="btn pri wide" data-a="go">Charger</button>`, {
    go: () => { let s = ''; try { s = decodeURIComponent(escape(atob($('#impT').value.trim()))); } catch (e) { } if (!s || !loadFrom(s)) { toast('Code invalide', 'u_x', '', 'bad'); return; } save(); closeModal(); toast('Sauvegarde chargée !', 'u_star', ''); }
  }, { cls: 'small' });
}
function credits() { modal('Crédits', `<div class="cred"><b>NÉRYS</b><small>Une planète un peu bizarre</small><p>Aureane Studio</p><p>Développement & graphismes générés<br>naiffie</p><p>Personnages d’origine<br>naiffie & Léa Meyer</p><p>Police : Press Start 2P</p><p>Aucun canard n’a été maltraité.</p></div><button class="btn wide" data-a="back">‹ Retour</button>`, { back: () => openMenu('opt') }, { cls: 'small' }); }

/* ================= PALETTE DE CONSTRUCTION ================= */
function openBuild() {
  const r = () => {
    const chips = CATS.map(([k, n]) => `<button class="tab ${UI.bcat === k ? 'on' : ''}" data-a="cat:${k}">${n}</button>`).join('');
    const ids = Object.keys(BLD).filter(k => BLD[k].cat === UI.bcat && (!BLD[k].shop || (G.tok[k] || 0) > 0 || nb(k) > 0));
    const cards = ids.map(id => {
      const d = BLD[id], un = hasR(d.r), aff = un && canAfford(id) && !(d.max && nb(id) >= d.max);
      const spr = d.floor ? `<img class="ic" src="${floorTile(id).toDataURL()}" style="width:32px;height:32px">` : d.wall ? `<div class="wallp" style="background:linear-gradient(${d.pal[0]} 60%,${d.pal[1]} 60%)"></div>` : ic('b_' + (id === 'arbre' ? 'arbre' : id), 34);
      const tags = [d.pw > 0 ? `<em class="pw">+${d.pw}⚡</em>` : d.pw < 0 ? `<em class="pw no">${d.pw}⚡</em>` : '', d.tf ? Object.entries(d.tf).map(([k, v]) => `<em>${ic(STATN[k][1], 12)}+${fmt(v)}/s</em>`).join('') : '', d.ch ? `<em>♥ ${d.ch}</em>` : '', nb(id) ? `<em class="nb">×${nb(id)}</em>` : ''].join('');
      return `<button class="bc ${un ? '' : 'lock'} ${aff ? '' : 'poor'}" data-a="pick:${id}">${spr}<b>${d.n}</b><div class="tags">${tags}</div><div class="costs">${un ? (d.shop ? `<span class="cost">reste ${G.tok[id] || 0}</span>` : costHTML(d.c)) : `<small>${ic('u_lock', 12)} ${d.r ? RESI[d.r].n : ''}</small>`}</div></button>`;
    }).join('');
    modal('Construire', `<div class="tabs">${chips}</div><div class="row2 pickb"><button class="btn sm" data-a="clear">${ic('u_pick', 16)} Défricher (buissons, rochers…)</button><button class="btn sm" data-a="pickup">${ic('u_hammer', 16)} Ramasser / déplacer</button></div><div class="bgrid">${cards || '<p class="hint">Rien ici pour l’instant.</p>'}</div><p class="hint">${UI.bcat === 'deco' ? 'La déco augmente le confort de la base, et le confort booste la terraformation (jusqu’à +50 %).' : UI.bcat === 'terra' ? 'Ces machines font monter les 4 jauges de la planète, même quand le jeu est fermé.' : UI.bcat === 'energie' ? 'Si la consommation dépasse la production, toutes les machines ralentissent.' : (PC ? 'Choisis, puis clique sur le sol pour poser. Clic droit ou Échap pour arrêter.' : 'Choisis, puis touche le sol pour viser et touche encore (ou A) pour poser.')}</p>`, BUILDA, { id: 'build', cls: 'big', icon: 'u_hammer', r });
  };
  r();
}
const BUILDA = {
  cat: k => { UI.bcat = k; SFX.tab(); refresh(); const m = $('.mb'); if (m) m.scrollTop = 0; },
  pick: id => {
    const d = BLD[id]; if (!hasR(d.r)) { SFX.bad(); toast('Recherche nécessaire : ' + RESI[d.r].n, 'u_lock', d.n, 'bad'); return; }
    closeModal(); startBuild(id);
  },
  pickup: () => { closeModal(); BUILD = { pick: true }; buildBar(); },
  clear: () => { closeModal(); BUILD = { clear: true }; buildBar(); },
};
function startBuild(id) { BUILD = { id }; SFX.tab(); buildBar(); }
function buildBar() {
  const b = $('#buildBar');
  if (!BUILD) { b.classList.remove('on'); document.body.classList.remove('building'); return; }
  document.body.classList.add('building'); b.classList.add('on');
  if (BUILD.pick) { b.innerHTML = `<div class="bi">${ic('u_hammer', 26)}<div><b>Ramasser</b><small>${PC ? 'Clique' : 'Touche'} une construction ou un sol : c’est remboursé</small></div></div><span class="berr" id="berr"></span><button class="btn sm" data-b="exit">✕ Fini</button>`; return; }
  if (BUILD.clear) { b.innerHTML = `<div class="bi">${ic('u_pick', 26)}<div><b>Défricher</b><small>${PC ? 'Clique ou glisse' : 'Touche ou glisse'} sur buissons, rochers, plantes… Ils ne repoussent plus.</small></div></div><span class="berr" id="berr"></span><button class="btn sm" data-b="exit">✕ Fini</button>`; return; }
  const d = BLD[BUILD.id], spr = d.floor ? `<img class="ic" src="${floorTile(BUILD.id).toDataURL()}" style="width:26px;height:26px">` : d.wall ? '' : ic('b_' + BUILD.id, 26);
  b.innerHTML = `<div class="bi">${spr}<div><b>${d.n}</b><div class="costs">${d.shop ? `<span class="cost">reste ${G.tok[BUILD.id] || 0}</span>` : costHTML(d.c)}</div></div></div><span class="berr" id="berr"></span><button class="btn sm" data-b="menu">Changer</button><button class="btn sm" data-b="exit">✕</button>`;
}
$('#buildBar').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (!b) return; SFX.tab(); if (b.dataset.b === 'exit') { BUILD = null; buildBar(); } else { BUILD = null; buildBar(); openBuild(); } });
function buildAt(tx, ty) {
  if (!BUILD) return;
  const e = $('#berr'), showErr = m => { if (e && m) { e.textContent = m; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); } };
  if (BUILD.pick) { if (!pickup(tx, ty)) { SFX.bad(); showErr('Rien à ramasser ici'); } return; }
  if (BUILD.clear) { const m = clearAt(tx, ty); if (m) { if (!paint) SFX.bad(); showErr(m); } return; }
  const err = place(BUILD.id, tx, ty);
  if (err) showErr(err);
  else buildBar();
  if (!err && !BLD[BUILD.id].floor && !BLD[BUILD.id].wall && BLD[BUILD.id].cat !== 'deco' && !canAfford(BUILD.id)) { BUILD = null; buildBar(); }
}

/* ================= PANNEAUX DES CONSTRUCTIONS ================= */
function openBuildingPanel(i) {
  const r = () => {
    const b = G.bl[i]; if (!b) { closeModal(); return; }
    const d = BLD[b.id]; let body = `<p class="desc">${d.d || ''}</p>`;
    const pw = d.pw ? `<div class="kv"><span>${ic('u_bolt', 16)} Électricité</span><b class="${d.pw < 0 && AG.eff < 1 ? 'no' : ''}">${d.pw > 0 ? '+' + d.pw + (d.solar ? (daylight() > .3 ? ' (jour)' : ' (nuit : 0)') : '') : d.pw + (AG.eff < 1 ? ' · réseau à ' + Math.round(AG.eff * 100) + ' %' : ' · OK')}</b></div>` : '';
    if (d.st) body += `<div class="craftp">${recipeRows(b.id)}</div>`;
    if (d.tf) body += Object.entries(d.tf).map(([k, v]) => `<div class="kv"><span>${ic(STATN[k][1], 16)} ${STATN[k][0]}</span><b>+${fmt(v * (d.grow ? 1 : AG.eff) * AG.mult * (1 + comfortBonus()))}/s</b></div>`).join('');
    if (b.id === 'arbre') { const p = (now() - b.t) / (d.grow * 1000); body += p < 1 ? `<div class="kv"><span>Croissance</span><b>${Math.floor(p * 100)} % · ${fmtT((1 - p) * d.grow)}</b></div>${bar(p)}` : '<p class="good">Il est grand ! Il produit de la biomasse.</p>'; }
    if (b.ore || b.id === 'niche') {
      const it = bufItem(b);
      if (b.id === 'niche') { const p = b.pet != null && G.pets[b.pet]; body += p ? `<div class="pet">${ic('m_' + p.sp + '_0' + (p.gold ? 'g' : ''), 40)}<div><b>${esc(p.name)}</b><small>${MOBS[p.sp].n}${p.gold ? ' doré (×2)' : ''} · produit ${ITEMS[MOBS[p.sp].drop].n} (1/min)</small></div></div>` : '<p class="hint">Niche vide. Caresse une créature 5 fois, puis appuie sur A (« Adopter ») avec 1 fruit-bulle dans le sac.</p>'; }
      else body += `<div class="kv"><span>Filon</span><b>${OBJ[b.ore].n} · 1 ${ITEMS[it].n} / ${Math.round(1 / d.rate)} s</b></div>`;
      if (it) body += `<div class="kv"><span>${ic('i_' + it, 16)} Stock</span><b>${Math.floor(b.b || 0)} / ${d.buf || 20}</b></div>${bar((b.b || 0) / (d.buf || 20))}<button class="btn pri wide" data-a="col">Collecter</button>`;
      if (nb('ruche')) body += '<p class="hint">Si une ruche à drones est à moins de 14 cases, c’est collecté tout seul.</p>';
    }
    if (d.sci) body += `<div class="kv"><span>${ic('u_sci', 16)} Science</span><b>+${fmt(d.sci * AG.eff)}/s</b></div>`;
    if (d.slots) body += `<div class="kv"><span>${ic('u_bag', 16)} Sac</span><b>+${d.slots} emplacements (total : ${AG.slots})</b></div>`;
    if (d.ch) body += `<div class="kv"><span>${ic('u_heart', 16)} Confort</span><b>+${d.ch} (base : ${AG.comfort})</b></div>`;
    if (b.id === 'jardin') body += gardenUI(b);
    if (b.id === 'tp') body += tpUI(i);
    if (b.id === 'piste') body += zorgUI();
    if (b.id === 'fusee') body += G.stage >= 10 ? `<button class="btn pri wide" data-a="launch">🚀 Lancer la fête !</button>` : '';
    body += pw + `<div class="row2 foot"><button class="btn sm" data-a="pick">Ramasser (remboursé)</button><button class="btn sm" data-a="close">Fermer</button></div>`;
    modal(b.n || d.n, body, PANELA(i), { id: 'bld', cls: b.id === 'piste' || d.st ? 'big' : '', icon: 'b_' + (b.id === 'arbre' ? (treeGrown(b) ? 'arbre' : 'arbre0') : b.id), r, live: 1 });
  };
  r(); SFX.ui();
}
function PANELA(i) {
  return {
    col: () => { collect(i); refresh(); },
    pick: () => { const [tx, ty] = [i % WW, i / WW | 0]; closeModal(); pickup(tx, ty); },
    craft: a => { const [k, n] = a.split(','); craftN(+k, n === 'max' ? 999 : +n); refresh(); },
    plant: k => { if (inv('graine') < 1) { toast('Il faut 1 graine', 'i_graine', 'Les plantes en donnent parfois', 'bad'); SFX.bad(); return; } G.inv.graine--; plantCrop(i, k); SFX.ok(); refresh(); },
    fert: () => { const b = G.bl[i]; if (!b.crop || inv('engrais') < 1) { SFX.bad(); return; } G.inv.engrais--; const el = (now() - b.crop.t0) / 1000; b.crop.d = el + (b.crop.d - el) / 2; SFX.ok(); refresh(); },
    harv: () => { harvestCrop(i); SFX.hit('fruit'); refresh(); },
    tp: j => teleport(+j), home: () => teleport(-1),
    ztab: k => { UI.zorg = k; SFX.tab(); refresh(); },
    buy: n => { if (buyShop(+n)) toast('Acheté !', 'u_coin', ''); refresh(); },
    sell: a => { const [k, n] = a.split(','); const v = sell(k, n === 'all' ? inv(k) : +n); if (v) floatTxt(G.x, G.y - 26, '+' + v, '#ffd23f', 'u_coin'); refresh(); },
    del: n => { if (deliver(+n)) toast('Commande livrée !', 'u_coin', 'Zorg est ravi'); refresh(); },
    launch: () => { closeModal(); launchParty(); },
  };
}
function gardenUI(b) {
  if (!b.crop) return `<h3>Que planter ? <small>(1 graine · tu en as ${inv('graine')})</small></h3><div class="crops">${Object.entries(CROPS).map(([k, [t, n]]) => `<button class="btn sm" data-a="plant:${k}">${ic('i_' + k, 18)} ${ITEMS[k].n}<small>${n} en ${fmtT(t)}</small></button>`).join('')}</div>`;
  const p = (now() - b.crop.t0) / (b.crop.d * 1000);
  if (p >= 1) return `<p class="good">${ITEMS[b.crop.k].n} : c’est mûr !</p><button class="btn pri wide" data-a="harv">Récolter</button>`;
  return `<div class="kv"><span>${ic('i_' + b.crop.k, 16)} ${ITEMS[b.crop.k].n}</span><b>${fmtT((1 - p) * b.crop.d)}</b></div>${bar(p)}${inv('engrais') ? `<button class="btn sm" data-a="fert">Engrais (−50 % du temps restant)</button>` : ''}`;
}
function tpUI(i) {
  const L = Object.keys(G.bl).filter(k => G.bl[k].id === 'tp' && +k !== i);
  return `<h3>Destinations</h3><button class="btn wide" data-a="home">${ic('u_home', 16)} Épave (maison)</button>${L.map(k => `<button class="btn wide" data-a="tp:${k}">${ic('b_tp', 16)} ${esc(G.bl[k].n)} · ${BIOMES[W.b[k]].n}</button>`).join('')}${L.length ? '' : '<p class="hint">Construis un autre téléporteur ailleurs pour voyager.</p>'}`;
}
function teleport(j, free) {
  if (!free && AG.eff < .05 && AG.cons > 0) { toast('Pas assez d’électricité', 'u_bolt', '', 'bad'); SFX.bad(); return; }
  closeModal(); SFX.boing();
  fadeOut(() => {
    if (j < 0) { G.x = W.spawn.x * TS + 8; G.y = (W.spawn.y + 2) * TS + 8; } else { G.x = (j % WW) * TS + 8; G.y = (j / WW | 0) * TS + 22; }
    unstick(); if (G.pm !== 'stay') { P.x = G.x + 14; P.y = G.y; } MOBL = []; reveal(G.x / TS | 0, G.y / TS | 0, 9); bubble('Bzzzt ! J’ai encore tous mes doigts ? 1, 2, 3… 11 ?');
  });
}
function zorgUI() {
  shopRefresh(); if (isHost()) ordersTick();
  const tabs = [['shop', 'Boutique'], ['ord', 'Commandes'], ['sell', 'Vendre']].map(([k, n]) => `<button class="tab ${UI.zorg === k ? 'on' : ''}" data-a="ztab:${k}">${n}</button>`).join('');
  let b = `<div class="zorg">${ic('zorg', 52)}<p>« ${esc(ZORG[Math.floor(now() / 20000) % ZORG.length])} »</p><span class="pill">${ic('u_coin', 16)} ${fmt(G.coins)}</span></div><div class="tabs">${tabs}</div>`;
  if (UI.zorg === 'shop') {
    const left = 20 * 60 - Math.floor(now() / 1000) % (20 * 60);
    b += `<div class="bgrid">${G.shop.items.map((it, n) => { const sold = G.shop.bought.includes(n); const key = it.k === 'hat' ? 'h_' + it.id : it.k === 'deco' ? 'b_' + it.id : it.k === 'res' ? 'i_' + it.id : null; const nm = it.k === 'hat' ? HATS.find(h => h[0] === it.id)[1] : it.k === 'suit' ? 'Combinaison ' + SUITS.find(s => s[0] === it.id)[1] : it.k === 'deco' ? BLD[it.id].n : ITEMS[it.id].n + ' ×' + it.n; return `<button class="bc ${sold ? 'lock' : G.coins >= it.p ? '' : 'poor'}" data-a="buy:${n}">${key ? ic(key, 34) : `<div class="sw2" style="background:${SUITS.find(s => s[0] === it.id)[2]}"></div>`}<b>${nm}</b><div class="costs">${sold ? '<small>Vendu !</small>' : `<span class="cost">${ic('u_coin', 14)}<b>${it.p}</b></span>`}</div></button>`; }).join('')}</div><p class="hint">Nouveaux articles dans ${fmtT(left)}.</p>`;
  } else if (UI.zorg === 'ord') {
    b += G.orders.map((o, n) => o.wait ? `<div class="ord wait">Zorg réfléchit à une nouvelle commande… (${fmtT((o.wait - now()) / 1000)})</div>` : `<div class="ord ${canPay(o.it) ? 'ok' : ''}"><div>${costHTML(o.it)}</div><div class="rw">${ic('u_coin', 14)} ${o.c} &nbsp; ${ic('u_sci', 14)} ${o.s}</div><button class="btn sm ${canPay(o.it) ? 'pri' : 'off'}" data-a="del:${n}">Livrer</button></div>`).join('') + '<p class="hint">Les commandes ne s’arrêtent jamais. Zorg a toujours besoin de trucs.</p>';
  } else {
    const ks = Object.keys(ITEMS).filter(k => inv(k) > 0);
    b += ks.length ? ks.map(k => `<div class="rrow">${ic('i_' + k, 24)}<div class="rn"><b>${ITEMS[k].n}</b><small>${inv(k)} · ${ITEMS[k].v} pièce${ITEMS[k].v > 1 ? 's' : ''} l’unité</small></div><button class="btn sm" data-a="sell:${k},1">×1</button><button class="btn sm" data-a="sell:${k},10">×10</button><button class="btn sm" data-a="sell:${k},all">Tout</button></div>`).join('') : '<p class="hint">Rien à vendre.</p>';
  }
  return b;
}
function openWreck() {
  const r = () => modal('Épave de l’Aurore-7', `<p class="desc">Notre ancien vaisseau. L’ordinateur de bord fait encore un peu de science (+0,1/s) et les couchettes sont toujours là.</p>
    <div class="kv"><span>${ic('u_sci', 16)} Science totale</span><b>+${fmt(AG.sciRate)}/s</b></div><div class="kv"><span>${ic('u_bolt', 16)} Réseau électrique</span><b>${fmt(AG.prod)} / ${fmt(AG.cons)} ⚡</b></div>
    <div class="kv"><span>${ic('u_planet', 16)} Planète</span><b>Stade ${G.stage} · ${esc(stageName(G.stage))}</b></div>
    <div class="row2 foot"><button class="btn sm" data-a="sleep">Dormir dans les couchettes</button><button class="btn sm" data-a="close">Fermer</button></div>`, { sleep: () => { closeModal(); sleep(); } }, { id: 'wreck', icon: 'u_home', r });
  r(); SFX.ui();
}

/* ================= FUSÉE / FIN ================= */
function launchParty() {
  inc('launch'); G.launched = true; G.party = 30; SFX.fanfare(); shakeCam(1.5);
  for (let k = 0; k < 6; k++) setTimeout(() => { confettiAt(G.x + rand(-80, 80), G.y - rand(20, 80), 40); SFX.boing(); }, k * 500);
  setTimeout(() => dialog(ENDING, () => { trophyCheck(); toast('Merci d’avoir joué ♥', 'u_heart', 'La partie continue, pour toujours.', 'gold'); }), 3200);
}

/* ================= CARTE ================= */
let MAPO = false, mapZ = 2;
function openMap() {
  MAPO = true; renderMap(); $('#mapOv').classList.add('on'); drawMapOv(); SFX.tab();
}
function closeMap() { MAPO = false; $('#mapOv').classList.remove('on'); SFX.tab(); }
function drawMapOv() {
  const c = $('#mapC'), d = Math.min(devicePixelRatio || 1, 2); c.width = c.clientWidth * d; c.height = c.clientHeight * d;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#120d22'; x.fillRect(0, 0, c.width, c.height);
  const z = Math.max(1, Math.floor(Math.min(c.width, c.height) / WW * mapZ * .55)), cx = c.width / 2, cy = c.height / 2, px = G.x / TS, py = G.y / TS;
  // brouillard
  const fog = cnv(WW, WH), fx = fog.getContext('2d'), img = fx.createImageData(WW, WH);
  for (let i = 0; i < WW * WH; i++) { img.data[i * 4 + 3] = W.fog[i] ? 0 : 235; img.data[i * 4] = 18; img.data[i * 4 + 1] = 13; img.data[i * 4 + 2] = 34; }
  fx.putImageData(img, 0, 0);
  for (let oy2 = -1; oy2 <= 1; oy2++) for (let ox2 = -1; ox2 <= 1; ox2++) { const X = cx - px * z + ox2 * WW * z, Y = cy - py * z + oy2 * WH * z; x.drawImage(MAPC, X, Y, WW * z, WH * z); x.drawImage(fog, X, Y, WW * z, WH * z); }
  const mk = (tx, ty, key, s = 14) => { let dx = tx - px, dy = ty - py; if (dx > WW / 2) dx -= WW; if (dx < -WW / 2) dx += WW; if (dy > WH / 2) dy -= WH; if (dy < -WH / 2) dy += WH; const a = ART[key]; if (a) x.drawImage(a, cx + dx * z - s * d / 2, cy + dy * z - s * d / 2, s * d, s * d); };
  for (const i of W.caps) if (W.o[i] === 18 && (W.fog[i] || G.radar)) mk(i % WW, i / WW | 0, 'capsule', 12);
  for (const i of W.monos) if (W.fog[i]) mk(i % WW, i / WW | 0, W.o[i] === 24 ? 'mono_done' : 'monolith', 14);
  for (const k in G.bl) if (G.bl[k].id === 'tp' || G.bl[k].id === 'piste' || G.bl[k].id === 'niche') mk(k % WW, k / WW | 0, 'b_' + G.bl[k].id, 14);
  if (G.met) mk(G.met % WW, G.met / WW | 0, 'meteor', 14);
  mk(W.spawn.x, W.spawn.y, 'u_home', 18);
  if (!G.mp) mk(P.x / TS, P.y / TS, 'u_heart', G.pm === 'stay' ? 14 : 10);
  if (G.mp) for (const id in MP.players) { const p = MP.players[id]; mk(p.x / TS, p.y / TS, 'u_heart', 12); }
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, 5 * d, 0, 7); x.fill(); x.fillStyle = '#ff4d6d'; x.beginPath(); x.arc(cx, cy, 3.5 * d, 0, 7); x.fill();
  const b = W.b[tI(px | 0, py | 0)];
  $('#mapInfo').innerHTML = `<b>${BIOMES[b].n}</b> · exploré ${(explored() * 100).toFixed(1).replace('.', ',')} % · capsules ${cnt('cap')}/${W.caps.length} · statues ${cnt('mono')}/8`;
  $('#mapLeg').innerHTML = BIOMES.map(B => `<span><i style="background:${B.c}"></i>${B.n}</span>`).join('');
}
$('#mapOv').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const a = b.dataset.m; if (a === 'x') closeMap();
  else if (a === 'h') { const w = 180 - (now() - (G.homeT || 0)) / 1000; if (w > 0) { toast('Le module de retour recharge…', 'u_home', 'Encore ' + fmtT(w), 'bad'); SFX.bad(); return; } G.homeT = now(); closeMap(); teleport(-1, true); }
  else { mapZ = clamp(mapZ + (a === '+' ? 1 : -1), 1, 6); drawMapOv(); SFX.tab(); } });

/* ================= PÊCHE ================= */
let FISH_ST = null;
function startFishing(i) {
  if (FISH_ST) return;
  FISH_ST = { i, ph: 'wait', t: rand(1.4, 3.6), fish: rollFish(i), pos: 0, dir: 1, hits: 0, miss: 0 };
  const f = FISH_ST.fish, rare = f.r < 6 ? 2 : f.r < 16 ? 1 : 0, rod = toolBonus('rod') * .012;
  FISH_ST.zone = clamp(.3 - rare * .07 + rod, .12, .4); FISH_ST.sp = .9 + rare * .45; FISH_ST.zp = Math.random() * (1 - FISH_ST.zone); FISH_ST.zv = (rare + 1) * .12;
  SFX.splash(); fishDraw();
  $('#fishUI').classList.add('on');
}
function fishTap() {
  const F = FISH_ST; if (!F) return;
  if (F.ph === 'wait') { fishEnd(false, 'Trop tôt ! Le poisson a eu peur.'); return; }
  if (F.ph === 'bite') { F.ph = 'reel'; SFX.pop(); vib(20); fishDraw(); return; }
  if (F.ph === 'reel') {
    if (F.pos >= F.zp && F.pos <= F.zp + F.zone) { F.hits++; SFX.ok(); vib(15); if (F.hits >= 3) return fishEnd(true); F.zp = Math.random() * (1 - F.zone); }
    else { F.miss++; SFX.bad(); if (F.miss >= 3) return fishEnd(false, 'Il s’est échappé… Il reviendra.'); }
    fishDraw();
  }
}
function fishUpdate(dt) {
  const F = FISH_ST; if (!F) return;
  if (F.ph === 'wait') { F.t -= dt; if (F.t <= 0) { F.ph = 'bite'; F.t = .95; SFX.squeak(); vib(40); fishDraw(); } return; }
  if (F.ph === 'bite') { F.t -= dt; if (F.t <= 0) fishEnd(false, 'Trop lent ! Le poisson a mangé l’appât.'); return; }
  if (F.ph === 'reel') {
    F.pos += F.dir * F.sp * dt; if (F.pos > 1) { F.pos = 1; F.dir = -1; } if (F.pos < 0) { F.pos = 0; F.dir = 1; }
    F.zp = clamp(F.zp + Math.sin(performance.now() / 400) * F.zv * dt, 0, 1 - F.zone);
    const n = $('#fNeedle'), z = $('#fZone'); if (n) n.style.left = F.pos * 100 + '%'; if (z) { z.style.left = F.zp * 100 + '%'; z.style.width = F.zone * 100 + '%'; }
  }
}
function fishDraw() {
  const F = FISH_ST, u = $('#fishUI'), X = `<button class="x fx" title="Ranger la canne (Échap)">✕</button>`;
  if (F.ph === 'wait') u.innerHTML = X + `<b>Attends que ça morde…</b><small>Ne touche pas encore !</small>`;
  else if (F.ph === 'bite') u.innerHTML = X + `<b class="bite">! ÇA MORD ! Appuie !</b>`;
  else u.innerHTML = X + `<b>Appuie quand l’aiguille est dans la zone verte</b><div class="fbar"><i id="fZone" style="left:${F.zp * 100}%;width:${F.zone * 100}%"></i><em id="fNeedle"></em></div><div class="fdots">${[0, 1, 2].map(k => `<i class="${k < F.hits ? 'ok' : ''}"></i>`).join('')}<span></span>${[0, 1, 2].map(k => `<i class="${k < F.miss ? 'ko' : ''}"></i>`).join('')}</div>`;
}
function fishEnd(ok, msg) {
  const F = FISH_ST; FISH_ST = null; $('#fishUI').classList.remove('on');
  if (!ok) { toast(msg, 'i_poisson', '', 'bad'); return; }
  const f = F.fish, first = catchFish(f); SFX.fanfare(); const [x, y] = tileCenter(F.i); puff(x, y, '#bff0ff', 10);
  modal(first ? 'Nouveau poisson !' : 'Belle prise !', `<div class="catch">${ic('fi_' + f.id, 72)}<b>${f.n}</b><small>${f.r < 6 ? '★ Très rare ★' : f.r < 16 ? 'Rare' : 'Commun'} · pêché ${G.fish[f.id]}×</small>${first ? `<small class="good">+${4 + Math.round(f.v / 2)} science</small>` : ''}<small>+1 poisson dans le sac</small></div><button class="btn pri wide" data-a="close">Hop, dans le sac</button>`, {}, { cls: 'small', id: 'catch' });
}
$('#fishUI').addEventListener('pointerdown', e => { e.preventDefault(); if (e.target.closest('.fx')) { fishEnd(false, 'Tu as rangé la canne.'); return; } fishTap(); });
function dlgSkip() { DLG.q = []; DLG.cur = null; dlgNext(); }

/* ================= HUD ================= */
let hudT = 0;
function hud(force) {
  if (!G) return; hudT -= 1; if (hudT > 0 && !force) return; hudT = 15;
  const sp = stageProgress();
  $('#hStage').innerHTML = `${ic('u_planet', 22)}<div><b>Stade ${G.stage}</b><small>${esc(stageName(G.stage))}</small>${bar(sp.p, 'var(--pink)')}</div>`;
  const fc = v => v < 1e3 ? fmt(v) : fmt(v).replace(/,(\d)\d(?=\D)/, ',$1');
  $('#hStats').innerHTML = Object.entries(STATN).map(([k, [n, i]]) => `<span class="${sp.lag === k ? 'lag' : ''}">${ic(i, 14)}${fc(G.st[k])}</span>`).join('');
  $('#hCoins').innerHTML = ic('u_coin', 16) + fmt(G.coins);
  $('#hSci').innerHTML = ic('u_sci', 16) + fmt(G.sci);
  $('#hPow').innerHTML = ic('u_bolt', 16) + fmt(AG.prod) + '/' + fmt(AG.cons); $('#hPow').classList.toggle('warn', AG.eff < 1);
  $('#hClock').textContent = clockTxt();
  const al = targetLabel(TGT), A = $('#bAL'); if (A.textContent !== al) A.textContent = al;
  if (PC) { const k = $('#kAct'); let h = ''; if (HOVT && HOVT.far) h = 'Trop loin'; else if (HOVT) { const a = primaryLabel(HOVT), u = useLabel(HOVT); h = (a ? 'Clic G : ' + a : '') + (u && u !== a && HOVT.k !== 'flr' ? '   ·   Clic D : ' + u : ''); } else if (BUILD && !BUILD.clear && !BUILD.pick) h = 'Clic D : poser   ·   Clic G (maintenir) : casser   ·   ' + keyLabel('KeyB') + ' / Échap : terminer'; else if (al) h = keyLabel('KeyE') + ' : ' + al; if (k.textContent !== h) k.textContent = h; }
  $('#bStay').classList.toggle('stay', G.pm === 'stay'); $('#bStay').title = G.pm === 'stay' ? 'Compagnon : reste ici (appuie pour qu’il te suive)' : 'Compagnon : te suit (appuie pour qu’il t’attende ici)';
  if (G.mp) $('#hNet').innerHTML = ic('u_planet', 16) + (Object.keys(MP.players).length + 1) + ' en ligne';
  $('#bA').classList.toggle('dim', !TGT && !BUILD && !DLG.on && !FISH_ST);
  if (UI.live && UI.modal) { if (UI.modal === 'menu' && UI.tab === 'planet') drawPlanetC(); if (++UI.lv % 4 === 0) refreshLive(); }
}
UI.lv = 0;
function refreshLive() { const a = document.activeElement; if (a && a.tagName === 'INPUT') return; if (UI.modal === 'menu' && UI.tab !== 'planet' && UI.tab !== 'sac') return; refresh(); if (UI.modal === 'menu' && UI.tab === 'planet') drawPlanetC(); }

/* ================= FONDU ================= */
function fadeOut(fn, ms = 500) {
  const f = $('#fade'); f.style.transition = `opacity ${ms / 1000}s`; f.classList.add('on');
  setTimeout(() => { fn && fn(); setTimeout(() => f.classList.remove('on'), 80); }, ms + 30);
}
