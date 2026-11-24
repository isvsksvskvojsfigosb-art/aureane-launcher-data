'use strict';
/* ==========================================================
   Nérys — multijoueur en ligne (serveur dédié « Nérys Serveur »)
   - Liste de serveurs comme Minecraft : nom + adresse (IP:port)
   - Le serveur garde le monde ; un des joueurs (l'« hôte ») fait
     tourner les machines, les autres reçoivent les changements.
   - Le monde (bâtiments, terraformation, recherche, pièces, science)
     est partagé ; le sac, les tenues et la collection sont à chacun.
   ========================================================== */
const PROTO = 2, MP_PORT = 25570, SERVER_URL = 'https://github.com/isvsksvskvojsfigosb-art/aureane-launcher-data/releases/download/nerys-serveur/Nerys-Serveur.zip';
const MP = { ws: null, on: false, host: false, id: 0, players: {}, info: null, addr: '', name: '', snap: null, acc: 0, pAcc: 0, meAcc: 0, tAcc: 0, me: { msg: '', msgT: 0 }, ev: [], mbAcc: 0 };
const MAPF = ['od', 'bl', 'fl', 'rg', 'clr', 'tok'], DELTAF = ['sci', 'coins'], REPF = ['stage', 'res', 'pets', 'orders', 'shop', 'met', 'tpN', 'launched'];
const PERS = ['items', 'sel', 'hats', 'suits', 'hat', 'suit', 'helmet', 'fish', 'mobs', 'cnt', 'tro', 'disc', 'buffs', 'tips', 'said', 'x', 'y', 'dir', 'pt', 'looks'];
const mpUrl = a => { a = String(a || '').trim().replace(/^wss?:\/\//i, '').replace(/\/+$/, ''); if (!/:\d+$/.test(a)) a += ':' + MP_PORT; return 'ws://' + a; };
const mpLabel = a => String(a || '').trim().replace(/^wss?:\/\//i, '');

/* ---------------- liste de serveurs + pseudo (gardés sur l'appareil) ---------------- */
function mpStore() { try { return JSON.parse(localStorage.getItem('nerys_mp') || '{}'); } catch (e) { return {}; } }
function mpSave(s) { try { localStorage.setItem('nerys_mp', JSON.stringify(s)); } catch (e) { } }
function launcherName() { try { const u = new URLSearchParams(location.search).get('user'); return u ? u.split('#')[0].slice(0, 16) : ''; } catch (e) { return ''; } }

/* ---------------- ping (statut dans la liste) ---------------- */
function mpPing(addr) {
  return new Promise(res => {
    let ws, done = false; const t0 = performance.now();
    const end = r => { if (done) return; done = true; try { ws.close(); } catch (e) { } res(r); };
    try { ws = new WebSocket(mpUrl(addr)); } catch (e) { return res({ ok: false }); }
    const to = setTimeout(() => end({ ok: false }), 4000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'ping' }));
    ws.onmessage = e => { clearTimeout(to); let m; try { m = JSON.parse(e.data); } catch (x) { return end({ ok: false }); } end({ ok: true, ms: Math.round(performance.now() - t0), ...m }); };
    ws.onerror = () => { clearTimeout(to); end({ ok: false }); };
  });
}

/* ---------------- écran Multijoueur ---------------- */
const PINGS = {};
function openMulti() {
  const st = mpStore(), lname = launcherName(); st.servers = st.servers || []; if (lname) st.name = lname; if (!st.name) st.name = ''; if (!st.who) st.who = 'm';
  const r = () => {
    const rows = st.servers.map((s, n) => {
      const p = PINGS[s.addr]; const stx = !p ? '<small>Recherche…</small>' : p.ok ? `<small>${esc(p.motd || '')}</small><small>${p.players}/${p.max} joueurs · ${p.ms} ms${p.v !== PROTO ? ' · <b class="no">version différente</b>' : ''}</small>` : '<small class="no">Hors ligne ou introuvable</small>';
      return `<div class="srv"><i class="st ${p ? (p.ok ? 'on' : 'off') : ''}"></i><div class="tx"><b>${esc(s.name || 'Serveur')}</b><small>${esc(mpLabel(s.addr))}</small>${stx}</div><button class="btn sm pri" data-a="join:${n}">Rejoindre</button><button class="btn sm" data-a="edit:${n}">Modifier</button><button class="btn sm" data-a="del:${n}">✕</button></div>`;
    }).join('') || '<p class="hint">Aucun serveur. Ajoute celui de tes amis avec son adresse (IP).</p>';
    modal('Multijoueur', `<div class="mpme"><label>Pseudo</label><input class="fld" id="mpName" maxlength="16" placeholder="Ton pseudo" value="${esc(st.name)}" autocomplete="off" ${lname ? 'readonly title="Pseudo de ton compte Aureane"' : ''}>${lname ? '<small class="hint">compte Aureane</small>' : ''}<div class="who2">${['m', 'f'].map(g => `<button class="btn sm ${st.who === g ? 'on' : ''}" data-a="who:${g}">${NM[g]}</button>`).join('')}</div></div>
      <h3>Serveurs</h3><div class="srvl">${rows}</div>
      <div class="row2"><button class="btn sm pri" data-a="add">+ Ajouter un serveur</button><button class="btn sm" data-a="refresh">Actualiser</button><button class="btn sm" data-a="host">Héberger un serveur</button></div>`,
      {
        who: g => { st.who = g; mpSave(st); SFX.tab(); r(); },
        add: () => serverForm(st, -1, r), edit: n => serverForm(st, +n, r),
        del: n => { st.servers.splice(+n, 1); mpSave(st); r(); },
        refresh: () => { for (const k in PINGS) delete PINGS[k]; pingAll(); r(); },
        host: () => hostHelp(r),
        join: n => { const name = ($('#mpName').value || '').trim(); if (name.length < 2) { toast('Choisis un pseudo (2 lettres minimum)', 'u_x', '', 'bad'); return; } st.name = name; mpSave(st); joinServer(st.servers[+n], name, st.who); },
      }, { id: 'multi', icon: 'u_planet', r });
    const ni = $('#mpName'); if (ni) ni.onchange = () => { st.name = ni.value.trim(); mpSave(st); };
  };
  const pingAll = () => st.servers.forEach(s => { if (PINGS[s.addr]) return; mpPing(s.addr).then(p => { PINGS[s.addr] = p; if (UI.modal === 'multi') r(); }); });
  r(); pingAll();
}
function serverForm(st, n, back) {
  const s = n >= 0 ? st.servers[n] : { name: '', addr: '' };
  modal(n >= 0 ? 'Modifier le serveur' : 'Ajouter un serveur', `<div class="mpform"><label>Nom du serveur</label><input class="fld" id="sfN" maxlength="32" value="${esc(s.name)}" placeholder="Le serveur des copains"><label>Adresse du serveur</label><input class="fld" id="sfA" value="${esc(s.addr)}" placeholder="ex. 82.64.12.34 ou 82.64.12.34:${MP_PORT}"><p class="hint">Demande l’adresse à la personne qui héberge. Le port ${MP_PORT} est ajouté tout seul s’il manque.</p></div><div class="row2"><button class="btn" data-a="back">Annuler</button><button class="btn pri" data-a="ok">Enregistrer</button></div>`,
    {
      back, ok: () => {
        const a = $('#sfA').value.trim(); if (!a) { toast('Indique l’adresse du serveur', 'u_x', '', 'bad'); return; }
        const e = { name: $('#sfN').value.trim() || mpLabel(a), addr: a };
        if (n >= 0) st.servers[n] = e; else st.servers.push(e); mpSave(st); delete PINGS[a]; openMulti();
      }
    }, { cls: 'small' });
}
function hostHelp(back) {
  modal('Héberger un serveur', `<div class="hosthelp">
    <p><b>1.</b> Télécharge le serveur (Windows, gratuit) : <code></code> — aussi disponible depuis la page Nérys du launcher Aureane. Dézippe-le et lance <code>Nerys-Serveur.exe</code> sur un PC qui reste allumé pendant que vous jouez.</p>
    <p><b>2.</b> Même box internet : les autres ajoutent l’adresse <b>locale</b> affichée (ex. <code>192.168.1.20</code>).</p>
    <p><b>3.</b> Par internet : sur ta box, ouvre (redirige) le port <code>${MP_PORT}</code> en TCP vers ce PC, puis donne ton <b>IP publique</b> à tes amis. Sans accès à la box, un service de tunnel gratuit (playit.gg) fonctionne aussi.</p>
    <p><b>4.</b> Le nom du serveur, le message, le nombre de joueurs et un mot de passe se règlent dans <code>nerys-server.json</code>, à côté du serveur.</p>
    <p>Le monde est sauvegardé dans <code>monde.json</code>. Tapez <code>stop</code> dans la fenêtre pour l’éteindre proprement.</p></div><div class="row2"><button class="btn" data-a="back">‹ Retour</button><button class="btn pri" data-a="copy">Copier le lien</button></div>`, { back: openMulti, copy: () => { try { navigator.clipboard.writeText(SERVER_URL).then(() => toast('Lien copié !', 'u_star', 'Colle-le dans ton navigateur'), () => showCode(SERVER_URL)); } catch (e) { showCode(SERVER_URL); } } }, { cls: 'small' });
}

/* ---------------- connexion ---------------- */
function joinServer(s, name, who, pass) {
  modal('Connexion…', `<p class="desc">Connexion à <b>${esc(s.name)}</b>…</p><button class="btn wide" data-a="cancel">Annuler</button>`, { cancel: () => { MP.leave(); openMulti(); } }, { cls: 'small', id: 'conn' });
  let ws; try { ws = new WebSocket(mpUrl(s.addr)); } catch (e) { return fail('Adresse invalide.'); }
  MP.ws = ws; MP.addr = s.addr; MP.name = name;
  const to = setTimeout(() => { if (!MP.on) fail('Le serveur ne répond pas. Vérifie l’adresse, et qu’il est bien lancé.'); }, 8000);
  function fail(msg, needPass) {
    clearTimeout(to); try { ws.close(); } catch (e) { } if (MP.ws === ws) MP.ws = null;
    if (needPass) {
      modal('Mot de passe', `<p class="desc">Ce serveur est protégé.</p><input class="fld" id="mpPass" type="password" placeholder="Mot de passe"><div class="row2"><button class="btn" data-a="back">Retour</button><button class="btn pri" data-a="ok">Rejoindre</button></div>`, { back: openMulti, ok: () => joinServer(s, name, who, $('#mpPass').value) }, { cls: 'small' });
      return;
    }
    modal('Connexion impossible', `<p class="desc">${esc(msg)}</p><button class="btn wide" data-a="back">‹ Retour</button>`, { back: openMulti }, { cls: 'small' });
  }
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', v: PROTO, name, who, pass: pass || s.pass || '' }));
  ws.onerror = () => { if (!MP.on) fail('Impossible de joindre le serveur. Vérifie l’adresse et ta connexion.'); };
  ws.onclose = () => { if (MP.ws === ws && MP.on) MP.lost(); };
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (x) { return; }
    if (m.t === 'deny') { if (m.pass) s.pass = ''; return fail(m.msg || 'Refusé par le serveur.', !!m.pass); }
    if (m.t === 'welcome') { clearTimeout(to); if (pass) s.pass = pass; MP.start(m, who); return; }
    MP.recv(m);
  };
}

/* ---------------- copie « instantané » pour détecter les changements ---------------- */
function mpSnap() {
  const s = { m: {}, d: {}, r: {}, st: { ...G.st } };
  for (const f of MAPF) { s.m[f] = {}; for (const k in G[f] || {}) s.m[f][k] = JSON.stringify(G[f][k]); }
  for (const f of DELTAF) s.d[f] = G[f] || 0;
  for (const f of REPF) s.r[f] = JSON.stringify(G[f] === undefined ? null : G[f]);
  return s;
}
function mpDiff() {
  const S = MP.snap, p = {}; let any = false;
  for (const f of MAPF) {
    const cur = G[f] || {}, sn = S.m[f]; let o = null;
    for (const k in cur) { const j = JSON.stringify(cur[k]); if (sn[k] !== j) { (o = o || {})[k] = cur[k]; sn[k] = j; } }
    for (const k in sn) if (!(k in cur)) { (o = o || {})[k] = null; delete sn[k]; }
    if (o) { (p.m = p.m || {})[f] = o; any = true; }
  }
  for (const f of DELTAF) { const d = (G[f] || 0) - S.d[f]; if (Math.abs(d) > 1e-6) { (p.d = p.d || {})[f] = d; S.d[f] = G[f] || 0; any = true; } }
  for (const k in G.st) { const d = G.st[k] - (S.st[k] || 0); if (Math.abs(d) > 1e-6) { (p.d = p.d || {})['st.' + k] = d; S.st[k] = G.st[k]; any = true; } }
  for (const f of REPF) { const j = JSON.stringify(G[f] === undefined ? null : G[f]); if (S.r[f] !== j) { (p.r = p.r || {})[f] = G[f] === undefined ? null : G[f]; S.r[f] = j; any = true; } }
  return any ? p : null;
}
function mpApply(p) {
  const S = MP.snap; let rc = false, pets = false, stg0 = G.stage;
  if (p.m) for (const f in p.m) {
    if (!MAPF.includes(f)) continue; G[f] = G[f] || {};
    for (const k in p.m[f]) {
      const v = p.m[f][k];
      if (v === null) { delete G[f][k]; delete S.m[f][k]; } else { G[f][k] = v; S.m[f][k] = JSON.stringify(v); }
      if (f === 'od') W.o[k] = v === null ? W.o0[k] : v;
      if (f === 'bl') { rc = true; if (v) W.o[k] = 0; else if (G.od[k] === undefined) W.o[k] = W.o0[k]; }
      if (f === 'fl') { rc = true; if (v && W.o[k] && OBJ[W.o[k]].solid) W.o[k] = 0; }
      if (f === 'tok') { rc = true; if (v) W.o[k] = 0; }
    }
  }
  if (p.d) for (const f in p.d) {
    const v = +p.d[f] || 0;
    if (f.startsWith('st.')) { const k = f.slice(3); G.st[k] = (G.st[k] || 0) + v; S.st[k] = (S.st[k] || 0) + v; }
    else if (DELTAF.includes(f)) { G[f] = (G[f] || 0) + v; S.d[f] += v; }
  }
  if (p.r) for (const f in p.r) {
    if (f === 'tm') { if (!MP.host) G.tm = p.r.tm; continue; }
    if (!REPF.includes(f)) continue; G[f] = p.r[f]; S.r[f] = JSON.stringify(p.r[f]);
    if (f === 'res') rc = true; if (f === 'pets') pets = true;
  }
  if (rc) recount(); if (pets) spawnPets();
  if (G.stage > stg0) { updateV(G.st); stageUp(G.stage, 0, 0); }
}

/* ---------------- démarrage de la partie en ligne ---------------- */
MP.start = function (m, who) {
  const w = m.world || {}, sh = w.shared || {};
  MP.on = true; MP.id = m.id; MP.host = !!m.host; MP.info = m.info || {}; MP.players = {};
  G = blankState(who, w.seed); genWorld(w.seed);
  for (const f of [...MAPF, ...REPF, ...DELTAF, 'st', 'tm']) if (sh[f] !== undefined && sh[f] !== null) G[f] = sh[f];
  G.st = Object.assign({ o: 0, h: 0, w: 0, b: 0 }, G.st);
  const me = m.me;
  if (me) { for (const k of PERS) if (me[k] !== undefined) G[k] = me[k]; }
  else { G.x = (W.spawn.x + ri(-3, 3)) * TS + 8; G.y = (W.spawn.y + ri(2, 4)) * TS + 8; }
  G.who = who; if (G.looks && G.looks[who]) { G.hat = G.looks[who].hat || G.hat; G.suit = G.looks[who].suit || G.suit; }
  G.mp = true; G.pm = 'off';
  applyWorld();
  if (me && me.fogS) fogUnpack(me.fogS);
  initRuntime();
  if (MP.host && !Object.keys(G.tok).length && Object.keys(G.bl).some(k => pwNode(+k))) autoCable(); // ancien monde : on relie les machines
  for (const p of m.players || []) MP.players[p.id] = { ...p, tx: p.x, ty: p.y };
  MP.snap = mpSnap();
  closeModal(); begin(false);
  chatLine('', `Bienvenue sur ${MP.info.name || 'le serveur'} !${MP.info.motd ? ' ' + MP.info.motd : ''}`, 'sys');
  if (MP.host) MP.becomeHost(w.t);
};
MP.becomeHost = function (t) {
  MP.host = true;
  if (t) { G.t = t; const o = offline(); G.t = now(); if (o) setTimeout(() => offlineSummary(o), 900); }
  MP.send({ t: 'tick' });
};
MP.send = o => { if (MP.ws && MP.ws.readyState === 1) MP.ws.send(JSON.stringify(o)); };
MP.op = o => MP.send({ t: 'op', o });
MP.chat = msg => { MP.send({ t: 'chat', m: msg }); chatLine(MP.name, msg); MP.me.msg = msg; MP.me.msgT = 6; };
MP.saveMe = function () {
  if (!MP.on) return;
  const d = {}; for (const k of PERS) d[k] = G[k]; d.who = G.who; d.fogS = fogPack();
  MP.send({ t: 'me', d });
};
MP.update = function (dt) {
  if (!MP.on) return;
  for (const id in MP.players) { const p = MP.players[id], k = Math.min(1, dt * 10), ox = p.x, oy = p.y; p.x += wrapD(p.tx - p.x) * k; p.y += wrapD(p.ty - p.y) * k; p.x = (p.x + WP) % WP; p.y = (p.y + HP) % HP; p.step = (p.step || 0) + Math.hypot(p.x - ox, p.y - oy); if (p.msgT > 0) p.msgT -= dt; if (p.j > 0) p.j -= dt; }
  if (MP.me.msgT > 0) MP.me.msgT -= dt;
  for (const id in MP.players) { const p = MP.players[id]; if (p.swing > 0) p.swing -= dt; }
  MP.pAcc += dt; if (MP.pAcc >= .1) {
    MP.pAcc = 0;
    const m = { t: 'p', x: Math.round(G.x), y: Math.round(G.y), dir: G.dir, mv: G.mv ? 1 : 0, who: G.who, hat: G.hat, suit: G.suit, hm: G.helmet ? 1 : 0, j: G.jump > 0 ? +G.jump.toFixed(2) : 0, sn: G.swingN || 0, si: G.swingIco || '', bi: G.swingAt == null ? -1 : G.swingAt, st: SIT ? (SIT.lie ? 2 : 1) : 0 };
    if (MP.ev.length) { m.ev = MP.ev.slice(0, 40); MP.ev = MP.ev.slice(40); }
    // l'hôte envoie les créatures (id, espèce, doré, x, y, sens, bouge, amour, saut)
    if (MP.host && (MP.mbAcc = (MP.mbAcc + 1) % 2) === 0) m.mb = MOBL.map(o => [o.id, o.sp, o.gold ? 1 : 0, Math.round(o.x), Math.round(o.y), o.face, o.mv ? 1 : 0, o.love, o.hop > 0 ? 1 : 0]);
    MP.send(m);
  }
  MP.acc += dt; if (MP.acc >= .25) { MP.acc = 0; const p = mpDiff(); if (p) MP.send({ t: 'sync', p }); }
  if (MP.host) { MP.tAcc += dt; if (MP.tAcc >= 2) { MP.tAcc = 0; MP.send({ t: 'sync', p: { r: { tm: G.tm } } }); MP.send({ t: 'tick' }); } }
  MP.meAcc += dt; if (MP.meAcc >= 10) { MP.meAcc = 0; MP.saveMe(); }
};
MP.recv = function (m) {
  switch (m.t) {
    case 'p': {
      const p = MP.players[m.id];
      if (p) {
        p.tx = m.x; p.ty = m.y; p.dir = m.dir; p.mv = m.mv; p.who = m.who; p.hat = m.hat; p.suit = m.suit; p.hm = m.hm; if (m.j) p.j = m.j; p.sit = m.st || 0;
        if (m.sn != null && m.sn !== p.sn) { if (p.sn != null) { p.swing = .18; p.si = m.si; const bi = +m.bi; if (bi >= 0 && bi < WW * WH) { SHAKE[bi] = .22; const [x, y] = tileCenter(bi); const o = OBJ[W.o[bi]]; chips(x, y - 6, o && o.it ? ITEMS[o.it].c : '#c9bfe0'); } } p.sn = m.sn; }
      }
      if (Array.isArray(m.ev)) MP.evs(m.ev);
      if (Array.isArray(m.mb) && !MP.host) MP.mobs(m.mb);
      break;
    }
    case 'sync': mpApply(m.p); break;
    case 'join': MP.players[m.p.id] = { ...m.p, tx: m.p.x, ty: m.p.y }; chatLine('', m.p.name + ' a rejoint la planète', 'sys'); SFX.pop(); break;
    case 'leave': { const p = MP.players[m.id]; if (p) chatLine('', p.name + ' est parti·e', 'sys'); delete MP.players[m.id]; break; }
    case 'host': if (m.id === MP.id && !MP.host) { MP.becomeHost(m.wt); chatLine('', 'Ton jeu fait maintenant tourner les machines du serveur.', 'sys'); } else if (m.id !== MP.id) MP.host = false; break;
    case 'chat': { const p = MP.players[m.id]; chatLine(m.name, m.m); if (p) { p.msg = m.m; p.msgT = 6; } SFX.type(); break; }
    case 'op': if (MP.host && m.o) {
      if (m.o.k === 'take') { const b = G.bl[m.o.i]; if (b) b.b = Math.max(0, (b.b || 0) - (+m.o.n || 0)); }
      else if (m.o.k === 'pet') { const o = MOBL.find(x => x.id === m.o.id); if (o) { o.love = Math.min(5, o.love + 1); o.hop = .35; o.vx = o.vy = 0; o.t = 1.5; if (o.cd <= 0 && Math.random() < .4) { o.cd = 5; drop(o.x, o.y - 6, MOBS[o.sp].drop, o.gold ? 3 : 1); } } }
      else if (m.o.k === 'rmmob') MOBL = MOBL.filter(x => x.id !== m.o.id);
    } break;
    case 'kick': MP.leave(); toTitle(); modal('Déconnecté', `<p class="desc">${esc(m.msg || 'Le serveur t’a déconnecté.')}</p><button class="btn wide" data-a="close">OK</button>`, {}, { cls: 'small' }); break;
  }
};
/* objets au sol des autres joueurs */
MP.evs = function (L) {
  for (const v of L) {
    if (!v || typeof v !== 'object') continue;
    if (v.e === 'd' && ITEMS[v.k] && v.n > 0) DROPS.push({ id: v.id, x: +v.x, y: +v.y, k: v.k, n: Math.min(999, +v.n), z: +v.z || 6, vz: +v.vz || 0, vx: +v.vx || 0, vy: +v.vy || 0, t: 0, wait: Math.max(.9, +v.w || 0) });
    else if (v.e === 'pk') DROPS = DROPS.filter(d => d.id !== v.id);
  }
};
/* créatures envoyées par l'hôte : on garde les mêmes objets pour des déplacements fluides */
MP.mobs = function (L) {
  const old = new Map(MOBL.map(o => [o.id, o])), out = [];
  for (const r of L) {
    if (!Array.isArray(r)) continue; const [id, sp, gold, x, y, face, mv, love, hop] = r; if (!MOBS[sp]) continue;
    let o = old.get(id);
    if (!o) o = { id, sp, gold: !!gold, x, y, t: 0, vx: 0, vy: 0, love: love || 0, cd: 0, at: Math.random() * 9, face: face || 1, seen: false };
    o.tx = x; o.ty = y; o.face = face || 1; o.mv = !!mv; o.love = love || 0; if (hop && !(o.hop > 0)) o.hop = .35; out.push(o);
  }
  MOBL = out;
};
MP.leave = function () {
  if (MP.on) { try { MP.saveMe(); } catch (e) { } }
  MP.on = false; MP.host = false; MP.players = {}; MP.ev = [];
  const ws = MP.ws; MP.ws = null; if (ws) { ws.onclose = null; setTimeout(() => { try { ws.close(); } catch (e) { } }, 150); }
  document.body.classList.remove('mp'); $('#chatLog').innerHTML = '';
};
MP.lost = function () {
  MP.on = false; MP.ws = null; MP.players = {};
  if (STATE === 'play' && G && G.mp) { toTitle(); modal('Connexion perdue', `<p class="desc">Le serveur ne répond plus. Ta progression a été enregistrée sur le serveur jusqu’à ta dernière minute de jeu.</p><button class="btn wide pri" data-a="re">Retour au multijoueur</button>`, { re: openMulti }, { cls: 'small' }); }
};

/* ---------------- fenêtre de chat ---------------- */
function chatLine(name, msg, cls = '') {
  const box = $('#chatLog'); if (!box) return;
  const d = document.createElement('div'); d.className = cls; d.innerHTML = (name ? `<b>${esc(name)}</b> ` : '') + esc(msg);
  box.appendChild(d); while (box.children.length > 6) box.firstChild.remove();
  setTimeout(() => d.classList.add('old'), 9000); setTimeout(() => d.remove(), 10500);
}
