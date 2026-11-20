'use strict';
/* ==========================================================
   Nérys — rendu : caméra, tri en profondeur, nuit, météo,
   particules, fantôme de construction
   ========================================================== */
const cv = $('#c'), ctx = cv.getContext('2d');
let S = 3, VW = 0, VH = 0, camX = 0, camY = 0, CAMSH = 0;
const NC = cnv(8, 8), nctx = NC.getContext('2d');
function fit() {
  const d = Math.min(devicePixelRatio || 1, 3);
  cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
  S = Math.max(2, Math.round(Math.min(cv.height / 200, cv.width / 330) * CFG.zoom)); VW = cv.width / S; VH = cv.height / S;
  NC.width = Math.ceil(VW) + 2; NC.height = Math.ceil(VH) + 2; ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', fit);
function shakeCam(s) { CAMSH = Math.max(CAMSH, s); }

/* ---------- particules ---------- */
function floatTxt(x, y, txt, c, ic) { PARTS.push({ k: 't', x, y, txt, c, ic, life: 1.3, max: 1.3, vy: -18 }); }
function puff(x, y, c, n) { for (let i = 0; i < n; i++) PARTS.push({ k: 'p', x, y, vx: rand(-30, 30), vy: rand(-30, 5), c, life: rand(.3, .6), max: .6, s: 2, g: 0 }); }
function chips(x, y, c) { for (let i = 0; i < 5; i++) PARTS.push({ k: 'p', x: x + rand(-3, 3), y, vx: rand(-40, 40), vy: rand(-70, -30), c, life: .5, max: .5, s: 1 + (Math.random() < .4), g: 220 }); }
function hearts(x, y) { for (let i = 0; i < 3; i++) PARTS.push({ k: 'h', x: x + rand(-6, 6), y, vx: rand(-8, 8), vy: rand(-30, -18), life: 1, max: 1 }); }
const CONF = ['#ff6fae', '#ffd23f', '#5ab8ff', '#7ce86a', '#b78cff', '#ffffff'];
function confettiAt(x, y, n = 30) { for (let i = 0; i < n; i++) PARTS.push({ k: 'p', x, y, vx: rand(-70, 70), vy: rand(-110, -30), c: pick(CONF), life: rand(.8, 1.6), max: 1.6, s: 2, g: 120 }); }
function partsUpdate(dt) {
  for (const p of PARTS) { p.life -= dt; p.x += (p.vx || 0) * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; if (p.k === 't') p.vy *= .96; }
  PARTS = PARTS.filter(p => p.life > 0);
  for (const d of DRONES) d.t += dt * .7; DRONES = DRONES.filter(d => d.t < 1);
  for (const k in SHAKE) { SHAKE[k] -= dt; if (SHAKE[k] <= 0) delete SHAKE[k]; }
  if (CAMSH > 0) CAMSH = Math.max(0, CAMSH - dt);
  if (G.jump > 0) G.jump -= dt;
  if (G.swing > 0) G.swing -= dt;
}

/* ---------- sols et murs ---------- */
const FLOORC = {};
function floorTile(id) {
  if (FLOORC[id]) return FLOORC[id];
  const pal = BLD[id].pal, c = S2(id, pal); FLOORC[id] = c; return c;
}
function S2(id, [a, b, l]) {
  const c = cnv(16, 16), d = Dr(c);
  d.r(0, 0, 16, 16, a);
  if (id === 'f_bois') { for (let y = 0; y < 16; y += 4) { d.r(0, y + 3, 16, 1, b); d.r(((y * 5) % 16), y, 1, 3, b); d.r(0, y, 16, 1, l); } }
  else if (id === 'f_damier') { d.r(0, 0, 8, 8, b); d.r(8, 8, 8, 8, b); }
  else if (id === 'f_carrelage') { d.r(0, 7, 16, 2, '#e8f4ff'); d.r(7, 0, 2, 16, '#e8f4ff'); d.r(1, 1, 3, 1, l); d.r(10, 10, 3, 1, l); }
  else if (id === 'f_moquette' || id === 'f_herbe') { for (let i = 0; i < 40; i++) d.p(hash2(i, 1, 9) * 16 | 0, hash2(i, 2, 9) * 16 | 0, i % 2 ? b : l); }
  else if (id === 'f_bulle') { for (const [x, y, r] of [[4, 4, 3], [12, 6, 2.5], [6, 12, 2.5], [13, 13, 1.5]]) { d.el(x, y, r, r, l); d.p(x - 1, y - 1, '#ffffff'); } }
  else if (id === 'f_pierre') { d.r(0, 7, 16, 1, b); d.r(7, 0, 1, 7, b); d.r(3, 8, 1, 8, b); d.r(12, 8, 1, 8, b); d.r(1, 1, 3, 1, l); d.r(9, 9, 2, 1, l); }
  else { d.r(0, 0, 16, 1, l); d.r(0, 0, 1, 16, l); d.r(0, 15, 16, 1, b); d.r(15, 0, 1, 16, b); for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) d.p(x, y, l); if (id === 'f_or') d.r(3, 5, 6, 1, '#fff6c0'); }
  return c;
}
const isWall = (tx, ty) => { const b = G.bl[tI(tx, ty)]; return b && BLD[b.id].wall; };
function drawWall(tx, ty, id) {
  const X = tx * TS, Y = ty * TS, [top, face] = BLD[id].pal, n = isWall(tx, ty - 1), s = isWall(tx, ty + 1), w = isWall(tx - 1, ty), e = isWall(tx + 1, ty);
  const glass = id === 'w_verre'; if (glass) ctx.globalAlpha = .75;
  R(X, Y - 8, 16, s ? 24 : 16, top);
  for (let k = 0; k < 6; k++) { const hx = hash2(tx * 7 + k, ty, 3) * 14 | 0, hy = hash2(tx, ty * 7 + k, 4) * 14 | 0; R(X + 1 + hx, Y - 7 + hy, 1, 1, shd(top, id === 'w_haie' ? -.2 : .15)); }
  if (!s) {
    R(X, Y + 8, 16, 8, face);
    if (id === 'w_brique') { for (let r = 0; r < 2; r++) { R(X, Y + 11 + r * 4, 16, 1, shd(face, -.3)); R(X + (r ? 3 : 10), Y + 8 + r * 4, 1, 3, shd(face, -.3)); } }
    else if (id === 'w_bois') { R(X + 5, Y + 8, 1, 8, shd(face, -.3)); R(X + 11, Y + 8, 1, 8, shd(face, -.3)); }
    else if (id === 'w_bonbon') { for (let k = 0; k < 4; k++) R(X + k * 4, Y + 9 + (k % 2) * 3, 2, 2, '#ffffff'); }
    R(X, Y + 15, 16, 1, OL);
  }
  if (!n) R(X, Y - 8, 16, 1, OL); else R(X, Y - 8, 16, 1, shd(top, -.1));
  if (!w) R(X, Y - 8, 1, s ? 24 : 24, OL);
  if (!e) R(X + 15, Y - 8, 1, s ? 24 : 24, OL);
  if (!n) R(X + 1, Y - 7, 14, 1, shd(top, .3));
  if (glass) { R(X + 3, Y - 5, 1, 6, '#ffffff'); ctx.globalAlpha = 1; }
}
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/* ---------- lumières ---------- */
const LGT = (() => { const c = cnv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.5, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; })();
const GLOWC = {};
function glow(col) { if (GLOWC[col]) return GLOWC[col]; const c = cnv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); GLOWC[col] = c; return c; }

/* ---------- météo (écran) ---------- */
const WX = []; for (let i = 0; i < 70; i++) WX.push({ x: Math.random(), y: Math.random(), s: Math.random() });
let rainT = 0, raining = false;

/* ---------- dessin principal ---------- */
const RL = [];
let TGT = null, BUILD = null; // cible d'interaction, mode construction
function draw(t, dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0a18'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G) return;
  const sh = CAMSH > 0 ? CAMSH * 3 : 0;
  camX = Math.round(G.x - VW / 2 + rand(-sh, sh)); camY = Math.round(G.y - 12 - VH / 2 + rand(-sh, sh));
  ctx.setTransform(S, 0, 0, S, -camX * S, -camY * S); ctx.imageSmoothingEnabled = false;
  const cx = camX + VW / 2, cy = camY + VH / 2;
  const ox = x => cx + wrapD(x - cx), oy = y => cy + wrapD(y - cy);
  /* sol */
  reRendered = 0;
  const cr0 = Math.floor(camY / CKP), cr1 = Math.floor((camY + VH) / CKP), cc0 = Math.floor(camX / CKP), cc1 = Math.floor((camX + VW) / CKP);
  for (let r = cr0; r <= cr1; r++) for (let c = cc0; c <= cc1; c++) ctx.drawImage(chunk(c, r), c * CKP, r * CKP);
  prefetchChunks(cc0, cc1, cr0, cr1);
  /* cases visibles */
  RL.length = 0;
  const x0 = Math.floor(camX / TS) - 2, x1 = Math.floor((camX + VW) / TS) + 2, y0 = Math.floor(camY / TS) - 1, y1 = Math.floor((camY + VH) / TS) + 3, tt = t / 1000;
  const spawnI = tI(W.spawn.x, W.spawn.y);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = tI(tx, ty), X = tx * TS, Y = ty * TS;
    const k = tkind(i);
    if (k === 1 || k === 2) { const h = (tx * 7 + ty * 13 + Math.floor(tt * 1.5 + hash2(tx, ty, 5) * 9)) % 11; if (h === 0) { R(X + (hash2(tx, ty, 8) * 12 | 0), Y + (hash2(tx, ty, 9) * 12 | 0), 3, 1, 'rgba(255,255,255,.7)'); } }
    else if (k === 3 && (tx * 5 + ty * 3 + Math.floor(tt * 2)) % 13 === 0) { R(X + 6, Y + 6 + (tt * 4 % 4 | 0), 2, 2, '#ffd23f'); }
    const fl = G.fl[i]; if (fl) ctx.drawImage(floorTile(fl), X, Y);
    const o = W.o[i]; if (o) { if (o === 23) { if (i === spawnI) RL.push([Y + 16, 9, X, Y]); } else RL.push([Y + 13, 1, i, X, Y]); }
    const b = G.bl[i]; if (b && !BLD[b.id].floor) RL.push([Y + (BLD[b.id].solid === 0 ? 6 : 15), BLD[b.id].wall ? 3 : 2, i, X, Y]);
  }
  for (const m of MOBL) RL.push([oy(m.y), 4, m]);
  for (const m of PETL) RL.push([oy(m.y), 4, m]);
  for (const d of DROPS) RL.push([oy(d.y), 7, d]);
  if (!G.mp) RL.push([oy(P.y), 6]); RL.push([G.y, 5]);
  if (G.mp) for (const id in MP.players) { const p = MP.players[id]; RL.push([oy(p.y), 8, p]); }
  RL.sort((a, b) => a[0] - b[0]);
  for (const e of RL) {
    switch (e[1]) {
      case 1: drawObj(e[2], e[3], e[4]); break;
      case 2: drawBld(e[2], e[3], e[4], t); break;
      case 3: drawWall(e[3] / TS, e[4] / TS, G.bl[e[2]].id); break;
      case 4: drawMob(e[2], ox(e[2].x), oy(e[2].y), t); break;
      case 5: drawPlayer(G.x, G.y, t); break;
      case 6: drawPartner(ox(P.x), oy(P.y), t); break;
      case 8: { const p = e[2], X = ox(p.x), Y = oy(p.y); drawAstroAt(p.who || 'm', p.suit || 'orange', p.dir || 'd', astroFrame(p.mv, p.step || 0), X, Y - (p.j > 0 ? Math.sin(p.j / .6 * Math.PI) * 14 : 0), p.hat, t, p.hm !== 0); label(p.name || '?', X, Y - 27, '#ffd23f'); if (p.msg && p.msgT > 0) drawBubble(X, Y - 38, p.msg); break; }
      case 7: { const d = e[2], X = ox(d.x), Y = oy(d.y), a = ART[d.k === 'duck' ? 'duck' : 'i_' + d.k]; R(X - 3, Y - 1, 6, 2, 'rgba(0,0,0,.25)'); ctx.drawImage(a, Math.round(X - a.width / 2), Math.round(Y - a.height - d.z + Math.sin(t / 200 + d.x) * (d.z ? 0 : 1))); break; }
      case 9: { const a = ART.wreck; ctx.drawImage(a, e[2] + 8 - 26, e[3] + 16 - 40); const bl = Math.sin(t / 300) > 0; R(e[2] + 8 - 26 + 28, e[3] + 16 - 40 + 1, 2, 1, bl ? '#ff4d6d' : '#7a2a3a'); break; }
    }
  }
  /* drones */
  for (const d of DRONES) { const k = d.t, x = ox(lerp(d.fx, d.tx, k)), y = oy(lerp(d.fy, d.ty, k)) - Math.sin(k * Math.PI) * 20; ctx.drawImage(ART.drone, Math.round(x - 5), Math.round(y - 4)); if (d.it && ART['i_' + d.it]) ctx.drawImage(ART['i_' + d.it], Math.round(x - 4), Math.round(y + 2), 8, 8); }
  /* cible */
  if (TGT && !BUILD && !UI.modal) drawTarget(TGT, t, ox, oy);
  if (HOVT && !BUILD && !UI.modal && !(TGT && HOVT.k === TGT.k && HOVT.i === TGT.i && HOVT.m === TGT.m)) { ctx.globalAlpha = .6; drawTarget(HOVT, t, ox, oy); ctx.globalAlpha = 1; }
  if (MOVE && !MOVE.t) { const x = ox(MOVE.x), y = oy(MOVE.y), k = (t / 120) % 4 | 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x) - 3 - (k & 1) + .5, Math.round(y) - 2 + .5, 6 + (k & 1) * 2, 3); }
  /* construction */
  if (BUILD) drawGhost(t);
  if (BRK && !(BRK.delay > 0) && !BRK.done) drawBreak(BRK, ox, oy);
  if (G.mp && MP.me && MP.me.msgT > 0) drawBubble(G.x, G.y - 30, MP.me.msg);
  /* particules */
  ctx.font = '8px PS, monospace'; ctx.textAlign = 'center';
  for (const p of PARTS) {
    const X = ox(p.x), Y = oy(p.y), a = clamp(p.life / p.max * 2, 0, 1);
    if (p.k === 'p') { ctx.globalAlpha = a; R(Math.round(X), Math.round(Y), p.s, p.s, p.c); }
    else if (p.k === 'h') { ctx.globalAlpha = a; ctx.drawImage(ART.u_heart, Math.round(X - 4), Math.round(Y - 4), 8, 8); }
    else { ctx.globalAlpha = a; let w = ctx.measureText(p.txt).width, x = Math.round(X - (p.ic ? 5 : 0)); if (p.ic && ART[p.ic]) ctx.drawImage(ART[p.ic], Math.round(x + w / 2 + 1), Math.round(Y - 9), 10, 10); txt(p.txt, x, Math.round(Y), p.c); }
  }
  ctx.globalAlpha = 1;
  if (P.bub) drawBubble(ox(P.x), oy(P.y) - 30, P.bub.txt);
  /* ambiance (écran) */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const haze = .2 * (1 - V.sky); if (haze > .01) { ctx.fillStyle = `rgba(110,50,150,${haze})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (G.buffs.rainbow > 0) rainbow(t);
  nightFx(t, ox, oy);
  weather(t, dt);
  if (G.met) arrowTo(G.met, '#ffd23f', ox, oy);
  if (!G.mp && G.pm === 'stay') arrowTo(tI(P.x / TS | 0, P.y / TS | 0), '#7ce86a', ox, oy);
  if (G.mp) for (const id in MP.players) { const p = MP.players[id]; arrowTo(tI(p.x / TS | 0, p.y / TS | 0), '#5ab8ff', ox, oy); }
  if (BUILD && BUILD.err && BUILD.errT > 0) { BUILD.errT -= dt; }
}
function txt(s, x, y, c) { ctx.fillStyle = OL; ctx.fillText(s, x + 1, y + 1); ctx.fillText(s, x - 1, y); ctx.fillText(s, x, y + 1); ctx.fillStyle = c; ctx.fillText(s, x, y); }

function objKey(o, i) { const k = OBJ[o].k; return k === 'rock' ? 'rock_' + W.b[i] : k === 'flower' ? 'flower_' + (i & 3) : k; }
function drawObj(i, X, Y) {
  const o = W.o[i], a = ART[objKey(o, i)]; if (!a) return;
  const sk = SHAKE[i] ? Math.round(Math.sin(SHAKE[i] * 60) * 1.5) : 0;
  const x = X + 8 - (a.width >> 1) + sk, y = Y + 16 - a.height + 1;
  if (OBJ[o].solid) R(X + 2, Y + 13, 12, 3, 'rgba(0,0,0,.18)');
  ctx.drawImage(a, x, y);
  if (o === 18 && Math.sin(performance.now() / 250 + i) > .6) R(X + 12, Y + 2, 2, 2, '#ffffff');
}
function drawBld(i, X, Y, t) {
  const b = G.bl[i], d = BLD[b.id];
  let key = 'b_' + b.id; if (b.id === 'arbre') key = treeGrown(b) ? 'b_arbre' : 'b_arbre0';
  const a = ART[key]; if (!a) return;
  const on = !d.pw || d.pw > 0 || AG.eff > 0.05;
  let bob = 0; if ((b.id === 'foreuse' || b.id === 'foreuse2') && on) bob = Math.round(Math.sin(t / 60 + i) * .6);
  if ((d.tf && !d.grow) && on) bob = Math.sin(t / 400 + i) > .7 ? -1 : 0;
  const x = X + 8 - (a.width >> 1), y = Y + 16 - a.height + bob;
  if (d.solid !== 0) R(X + 1, Y + 13, 14, 3, 'rgba(0,0,0,.2)');
  ctx.drawImage(a, x, y);
  // yeux qui suivent le joueur
  if (d.eyes) {
    const blink = ((t / 100 + i * 37) % 70) < 1.4;
    for (const [ex, ey] of d.eyes) {
      const px = x + ex, py = y + ey;
      if (blink) { R(px - 2, py - 1, 4, 2, shd('#9aa3c0', -.4)); continue; }
      const dx = wrapD(G.x - px), dy = wrapD(G.y - 8 - py), l = Math.hypot(dx, dy) || 1;
      R(px - 1 + Math.round(dx / l), py - 1 + Math.round(dy / l * .9), 2, 2, OL);
    }
  }
  if (b.id === 'eolienne') { const cx2 = x + 8, cy2 = y + 7, ang = t / (on ? 180 : 900) + i; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 3; k++) { const aa = ang + k * 2.094; ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(aa) * 8, cy2 + Math.sin(aa) * 8); } ctx.stroke(); R(cx2 - 1, cy2 - 1, 2, 2, '#9aa3c0'); }
  if (b.id === 'roue') ctx.drawImage(ART['roue_b' + (Math.floor(t / 90) % 4)], x + 3, y + 7);
  if (b.id === 'jardin' && b.crop) { const p = (now() - b.crop.t0) / (b.crop.d * 1000), c = ART[p >= 1 ? 'crop_' + b.crop.k : p > .5 ? 'crop_1' : 'crop_0']; ctx.drawImage(c, X, Y + 16 - c.height - 3); if (p >= 1 && Math.sin(t / 200) > 0) R(X + 14, Y - 2, 2, 2, '#ffffff'); }
  if (b.id === 'tp') { for (let k = 0; k < 3; k++) { const yy = (t / 20 + k * 10 + i) % 24; R(X + 3 + k * 4, Y + 10 - yy, 1, 2, `rgba(224,208,255,${1 - yy / 24})`); } }
  if (b.id === 'piste') { const zy = Y - 26 + Math.sin(t / 500) * 2; ctx.drawImage(ART.zorg, X + 8 - 18, Math.round(zy)); }
  if (b.id === 'disco' && G.disco) { R(x + (t / 50 % 14 | 0), y + 9, 1, 1, '#ffffff'); }
  // production prête : petite bulle
  const it = bufItem(b);
  if ((it && b.b >= 1) || (b.id === 'jardin' && cropReady(b))) {
    const ic = ART['i_' + (it || b.crop.k)], by = y - 13 + Math.round(Math.sin(t / 250 + i) * 1.5);
    R(X + 2, by - 1, 12, 12, '#fff8ec'); R(X + 2, by - 1, 12, 1, OL); R(X + 2, by + 10, 12, 1, OL); R(X + 1, by, 1, 10, OL); R(X + 14, by, 1, 10, OL); R(X + 7, by + 11, 2, 2, '#fff8ec');
    ctx.drawImage(ic, X + 3, by, 10, 10);
  }
  if (d.pw < 0 && AG.eff < .99 && Math.sin(t / 300 + i) > .3) { R(x + a.width - 3, y - 4, 3, 5, '#ff4d6d'); }
}
function mobFrame(m, t) { return m.mv ? Math.floor(m.at * 8) % 4 : (Math.floor(m.at * 2) % 2) * (m.sp === 'blobo' ? 1 : 0); }
function drawMob(m, x, y, t) {
  const f = m.sp === 'meduse' ? Math.floor(m.at * 4) % 4 : mobFrame(m, t), a = ART['m_' + m.sp + '_' + f + (m.gold ? 'g' : '')];
  let oy2 = m.hop > 0 ? -Math.sin(m.hop / .35 * Math.PI) * 6 : 0; if (m.sp === 'meduse') oy2 = -8 + Math.sin(m.at * 2) * 3;
  R(Math.round(x - 5), Math.round(y - 1), 10, 2, 'rgba(0,0,0,.22)');
  ctx.save(); ctx.translate(Math.round(x), Math.round(y + oy2));
  if (m.face < 0) ctx.scale(-1, 1);
  ctx.drawImage(a, -9, -17); ctx.restore();
  if (m.gold && Math.sin(t / 120 + m.at) > .7) R(Math.round(x + rand(-7, 7)), Math.round(y - rand(4, 16)), 1, 1, '#ffffff');
  const near = Math.hypot(wrapD(G.x - m.x), wrapD(G.y - m.y)) < 40;
  if (m.pet == null && m.love > 0 && near) for (let k = 0; k < 5; k++) R(Math.round(x - 7 + k * 3), Math.round(y - 22 + oy2), 2, 2, k < m.love ? '#ff4d6d' : 'rgba(255,255,255,.35)');
  if (m.pet != null && near) label(m.name, x, y - 19 + oy2, '#ffd23f');
}
function astroFrame(mv, step) { return mv ? [1, 0, 3, 0][Math.floor(step / 7) % 4] : 0; }
function drawAstroAt(who, suit, dir, fr, x, y, hat, t, helm = G.helmet) {
  x = Math.round(x); y = Math.round(y);
  R(x - 5, y - 1, 10, 3, 'rgba(0,0,0,.25)');
  const a = astro(who, suitColor(suit, t), dir, fr, helm); ctx.drawImage(a, x - 8, y - 22);
  if (hat && hat !== 'none' && ART['h_' + hat]) { const bob = fr === 1 || fr === 3 ? 1 : 0; ctx.drawImage(ART['h_' + hat], x - 8 + (dir === 'l' ? -1 : dir === 'r' ? 1 : 0), y - 22 - 8 + bob + (helm ? 0 : 2)); }
  if (suit === 'arcenciel') ASTRO.forEach((v, k) => { if (k.startsWith(who + '#')) ASTRO.delete(k); });
}
function drawPlayer(x, y, t) {
  let jy = 0; if (G.jump > 0) jy = -Math.sin(G.jump / .6 * Math.PI) * 14;
  if (G.swing > 0) { const f = DIRS[G.dir], k = G.swing / .18, ic = ART[G.swingIco]; if (ic) { ctx.save(); ctx.translate(Math.round(x + f[0] * 7 + (G.dir === 'd' || G.dir === 'u' ? 6 : 0)), Math.round(y - 8 + f[1] * 4)); ctx.rotate((1 - k) * 2 - 1); ctx.drawImage(ic, -7, -12, 12, 12); ctx.restore(); } else { const l = Math.sin(k * Math.PI) * 2; x += f[0] * l; y += f[1] * l; } }
  drawAstroAt(G.who, G.suit, G.dir, astroFrame(G.mv, G.step || 0), x, y + jy, G.hat, t);
}
function drawPartner(x, y, t) {
  const w = G.who === 'm' ? 'f' : 'm', L = (G.looks && G.looks[w]) || {};
  drawAstroAt(w, L.suit || (w === 'm' ? 'orange' : 'teal'), P.dir, astroFrame(P.mv, P.step), x, y, L.hat || 'none', t);
  if (G.pm === 'stay') { const bx = Math.round(x) + 6, by = Math.round(y) - 30 + Math.round(Math.sin(t / 300)); R(bx, by, 1, 8, '#4a5068'); R(bx + 1, by, 5, 3, '#7ce86a'); R(bx + 1, by + 3, 3, 1, '#7ce86a'); }
}
/* fine barre de progression quand on casse un objet / une construction */
function drawBreak(B, ox, oy) {
  const i = B.t.i; if (i == null) return;
  const p = clamp(B.p / B.dur, 0, 1), tx = (i % WW) * TS, ty = (i / WW | 0) * TS;
  const h = B.t.k === 'flr' && G.fl[i] && !G.bl[i] ? 16 : Math.max(16, sprH(i)), X = Math.round(ox(tx)), Y = Math.round(oy(ty + 16)) - h;
  const w = 14, bx = X + 1, by = Y + h + 2;
  R(bx, by, w, 2, 'rgba(29,21,48,.75)'); R(bx, by, Math.max(1, Math.round(w * p)), 2, p > .8 ? '#ffd166' : '#ffffff');
}/* petit texte toujours lisible, quelle que soit l'échelle du monde */
function label(s, x, y, c) { const k = clamp(10 * Math.min(devicePixelRatio || 1, 3) / (8 * S), .3, 1); ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k); ctx.font = '8px PS, monospace'; ctx.textAlign = 'center'; txt(s, 0, 0, c); ctx.restore(); }
function drawBubble(x0, y0, s) {
  const k = clamp(11 * Math.min(devicePixelRatio || 1, 3) / (8 * S), .3, 1); ctx.save(); ctx.translate(Math.round(x0), Math.round(y0)); ctx.scale(k, k); let x = 0, y = 0;
  ctx.font = '8px PS, monospace'; ctx.textAlign = 'left';
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > 130 && cur) { lines.push(cur); cur = w; } else cur = tst; }
  lines.push(cur);
  const w = Math.min(140, Math.max(...lines.map(l => ctx.measureText(l).width))) + 10, h = lines.length * 10 + 6;
  x = Math.round(x - w / 2); y = Math.round(y - h);
  R(x, y, w, h, '#fff8ec'); R(x, y - 1, w, 1, OL); R(x, y + h, w, 1, OL); R(x - 1, y, 1, h, OL); R(x + w, y, 1, h, OL);
  R(x + (w >> 1) - 2, y + h, 4, 2, '#fff8ec'); R(x + (w >> 1) - 1, y + h + 2, 2, 2, '#fff8ec');
  ctx.fillStyle = OL; lines.forEach((l, n) => ctx.fillText(l, x + 5, y + 11 + n * 10)); ctx.restore();
}
function drawTarget(T, t, ox, oy) {
  let x, y, w = 16, h = 16;
  if (T.k === 'mob') { x = ox(T.m.x) - 8; y = oy(T.m.y) - 16; }
  else if (T.k === 'partner') { x = ox(P.x) - 8; y = oy(P.y) - 22; h = 22; }
  else if (T.k === 'fish') { x = ox((T.i % WW) * TS); y = oy((T.i / WW | 0) * TS); ctx.drawImage(ART.bobber, x + 5, y + 4 + Math.round(Math.sin(t / 300) * 1.5)); }
  else { x = ox((T.i % WW) * TS); y = oy((T.i / WW | 0) * TS); if (T.k === 'obj' && W.o[T.i] === 23) return; }
  const p = Math.round(Math.sin(t / 160) * 1) + 1, c = '#ffffff';
  for (const [a, b, sx, sy] of [[x - p, y - p, 1, 1], [x + w + p - 3, y - p, -1, 1], [x - p, y + h + p - 3, 1, -1], [x + w + p - 3, y + h + p - 3, -1, -1]]) { R(a, b + (sy < 0 ? 2 : 0), 3, 1, c); R(a + (sx < 0 ? 2 : 0), b, 1, 3, c); }
}
function buildCursor() {
  if (BUILD.cur) return BUILD.cur;
  const f = DIRS[G.dir]; return [Math.floor((G.x + f[0] * 14) / TS), Math.floor((G.y - 4 + f[1] * 14) / TS)];
}
function drawGhost(t) {
  const [tx, ty] = buildCursor(), X = tx * TS, Y = ty * TS;
  if (BUILD.clear) { const o = W.o[tI(tx, ty)], ok = o && !OBJ[o].special; ctx.strokeStyle = ok ? '#ffb040' : 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, 15, 15); if (ok && Math.sin(t / 150) > 0) ctx.drawImage(ART.u_pick, X + 3, Y - 12, 10, 10); return; }
  if (BUILD.pick) { const ok = G.bl[tI(tx, ty)] || G.fl[tI(tx, ty)]; ctx.strokeStyle = ok ? '#ff4d6d' : 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, 15, 15); if (ok && Math.sin(t / 150) > 0) R(X + 6, Y - 6, 4, 4, '#ff4d6d'); return; }
  const id = BUILD.id, d = BLD[id], err = placeErr(id, tx, ty);
  ctx.globalAlpha = .65 + Math.sin(t / 200) * .1;
  if (d.floor) ctx.drawImage(floorTile(id), X, Y);
  else if (d.wall) { const [top, face] = d.pal; R(X, Y - 8, 16, 16, top); R(X, Y + 8, 16, 8, face); }
  else { const a = ART['b_' + (id === 'arbre' ? 'arbre0' : id)]; if (a) ctx.drawImage(a, X + 8 - (a.width >> 1), Y + 16 - a.height); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = err ? '#ff4d6d' : '#7cff9a'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, 15, 15);
  if (id === 'ruche') { ctx.strokeStyle = 'rgba(255,210,63,.5)'; ctx.beginPath(); ctx.arc(X + 8, Y + 8, BLD.ruche.rad * TS, 0, 6.283); ctx.stroke(); }
}

/* ---------- nuit et lumières ---------- */
function nightFx(t, ox, oy) {
  const L = daylight(), a = (1 - L) * .86 * CFG.nd / 100, dusk = Math.max(0, 1 - Math.abs(L - .5) * 3.2);
  if (dusk > .02) { ctx.fillStyle = `rgba(255,120,70,${.13 * dusk})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (a < .02) return;
  const n = nctx; n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, NC.width, NC.height);
  n.fillStyle = `rgba(10,8,46,${a})`; n.fillRect(0, 0, NC.width, NC.height); n.globalCompositeOperation = 'destination-out';
  const glows = [];
  const lamp = (x, y, r, k = 1, col) => { const gx = x - camX, gy = y - camY; if (gx < -r || gy < -r || gx > VW + r || gy > VH + r) return; n.globalAlpha = k; n.drawImage(LGT, gx - r, gy - r, r * 2, r * 2); if (col) glows.push([gx, gy, r * .8, col]); };
  lamp(G.x, G.y - 10, 56, 1); lamp(ox(P.x), oy(P.y) - 10, 40, .9);
  for (const i of AG.lights) {
    const b = G.bl[i]; if (!b) continue; const d = BLD[b.id], x = ox((i % WW) * TS + 8), y = oy((i / WW | 0) * TS + 4);
    if (d.light) lamp(x, y, d.light, 1, b.id === 'disco' ? null : 'rgba(255,200,120,.35)');
    else if (!d.pw || d.pw > 0 || AG.eff > 0) lamp(x, y, d.tf ? 30 : 24, .85, d.tf ? 'rgba(140,255,230,.18)' : null);
    if (b.id === 'disco') for (let k = 0; k < 5; k++) { const aa = t / 600 + k * 1.256; glows.push([x - camX + Math.cos(aa) * 30, y - camY + Math.sin(aa) * 18, 16, ['rgba(255,80,160,.5)', 'rgba(80,180,255,.5)', 'rgba(255,220,60,.5)', 'rgba(120,255,140,.5)', 'rgba(190,120,255,.5)'][k]]); }
  }
  for (const m of MOBL) if (m.sp === 'meduse' || m.gold) lamp(ox(m.x), oy(m.y) - 12, 22, .7, m.gold ? 'rgba(255,220,80,.4)' : 'rgba(200,160,255,.4)');
  const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS);
  for (let ty = y0; ty <= y0 + VH / TS + 1; ty++) for (let tx = x0; tx <= x0 + VW / TS + 1; tx++) {
    const i = tI(tx, ty), o = W.o[i];
    if (o === 9 || o === 16 || o === 15) lamp(tx * TS + 8, ty * TS + 6, 18, .6, o === 9 ? 'rgba(80,240,230,.3)' : 'rgba(255,240,80,.3)');
    else if (W.a[i] < 64 && W.b[i] === 5 && ((tx + ty) & 1)) lamp(tx * TS + 8, ty * TS + 8, 22, .55, 'rgba(255,110,40,.25)');
  }
  n.globalAlpha = 1; n.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true; ctx.drawImage(NC, 0, 0, NC.width * S, NC.height * S);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, c] of glows) ctx.drawImage(glow(c), (x - r) * S, (y - r) * S, r * 2 * S, r * 2 * S);
  ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
  // étoiles et lucioles
  if (a > .3) { for (let k = 0; k < 14; k++) { const fx = (hash2(k, 1, 3) * VW + Math.sin(t / 900 + k) * 10) * S, fy = (hash2(k, 2, 3) * VH + Math.cos(t / 1100 + k) * 8) * S; if (V.gc > .2 && Math.sin(t / 400 + k * 2) > .3) { ctx.fillStyle = 'rgba(220,255,140,.85)'; ctx.fillRect(fx, fy, S, S); } } }
}
function rainbow(t) {
  const cols = ['255,80,80', '255,170,60', '255,230,80', '120,230,120', '90,170,255', '170,110,255'], w = cv.width, h = cv.height;
  ctx.lineWidth = Math.max(4, h / 40);
  cols.forEach((c, k) => { ctx.strokeStyle = `rgba(${c},.16)`; ctx.beginPath(); ctx.arc(w / 2, h * 1.4, h * 1.25 - k * ctx.lineWidth, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
}
function weather(t, dt) {
  const b = W.b[tI(G.x / TS | 0, G.y / TS | 0)];
  rainT -= dt; if (rainT <= 0) { rainT = rand(60, 200); raining = G.stage >= 5 && Math.random() < .35; }
  const snow = b === 4 && V.melt < .85, spores = b === 1, rain = raining, conf = G.stage >= 10 || (G.party || 0) > 0;
  if (!snow && !spores && !rain && !conf) return;
  const w = cv.width, h = cv.height;
  for (const p of WX) {
    if (rain) { p.y += dt * (1.6 + p.s); p.x -= dt * .2; ctx.fillStyle = 'rgba(180,210,255,.5)'; ctx.fillRect(p.x * w, p.y * h, S * .6, S * 4); }
    else if (snow) { p.y += dt * (.05 + p.s * .06); p.x += Math.sin(t / 900 + p.s * 9) * dt * .02; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(p.x * w, p.y * h, S, S); }
    else if (spores) { p.y -= dt * (.02 + p.s * .02); p.x += Math.sin(t / 1200 + p.s * 9) * dt * .015; ctx.fillStyle = 'rgba(200,160,255,.55)'; ctx.fillRect(p.x * w, p.y * h, S, S); }
    else { p.y += dt * (.08 + p.s * .1); p.x += Math.sin(t / 500 + p.s * 9) * dt * .03; ctx.fillStyle = CONF[(p.s * 6) | 0]; ctx.fillRect(p.x * w, p.y * h, S * 1.5, S); }
    if (p.y > 1) { p.y -= 1; p.x = Math.random(); } if (p.y < 0) p.y += 1; if (p.x < 0) p.x += 1; if (p.x > 1) p.x -= 1;
  }
  if (G.party > 0) G.party -= dt;
}
function arrowTo(i, col, ox, oy) {
  const x = ox((i % WW) * TS + 8) - camX, y = oy((i / WW | 0) * TS + 8) - camY;
  if (x > 0 && x < VW && y > 0 && y < VH) return;
  const a = Math.atan2(y - VH / 2, x - VW / 2), c = Math.cos(a), s = Math.sin(a), k = Math.min((VW / 2 - 14) / Math.abs(c || 1e-6), (VH / 2 - 14) / Math.abs(s || 1e-6));
  ctx.save(); ctx.translate((VW / 2 + c * k) * S, (VH / 2 + s * k) * S); ctx.rotate(a); ctx.scale(S, S);
  ctx.fillStyle = OL; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.fill(); ctx.restore();
}
