/* 55 AMBERLANDS V24 — PIXEL HEROES (Ragnarok-style chibi, animated)
 * Five looks (ดาบ / หมัด / ธนู / จอมเวท / นักผจญภัย) x two genders, drawn procedurally every frame:
 * 2-bone IK arms & legs, squash/bob breathing, cape / headband / hair / hat sway, blinking, and a class
 * specific attack loop (slash, jab-cross, draw-and-loose, cast). The equipped weapon is drawn in the hand
 * with the same geometry as its bag icon, so the swing is always attached to the hero.
 */
(() => {
'use strict';
const PX = window.PX; if (!PX || !PX.weapon) return;
const { Sp, rng, hash, mix } = PX;
const W = 64, H = 72, CX = 28, GY = 68;
const SK = '#f7d0ac', SKF = '#f9dabd', LINE = '#2a1c3a';

const JOBS = {
  'ดาบ': { key: 'sword', eye: '#d9534a', hairM: '#7a4528', hairF: '#b03a48', cloth: '#c43a3a', trim: '#e8c05a', armor: '#b9c4d6', pants: '#4a4256', boots: '#8a90a4' },
  'หมัด': { key: 'fist', eye: '#e8892e', hairM: '#2c2636', hairF: '#e0608f', cloth: '#e8892e', trim: '#2a2a33', armor: '#f1ead8', pants: '#2f2f3c', boots: '#8a5a2a' },
  'ธนู': { key: 'bow', eye: '#3fcf6a', hairM: '#d8dde8', hairF: '#e8cf70', cloth: '#3f8f4a', trim: '#9b6b3a', armor: '#9b6b3a', pants: '#6a4a2a', boots: '#7a4a2a' },
  'จอมเวท': { key: 'mage', eye: '#a45cf0', hairM: '#4a7aff', hairF: '#8a5adf', cloth: '#2d3f9a', trim: '#e8c05a', armor: '#2d3f9a', pants: '#2d3f9a', boots: '#e8c05a' },
  'นักผจญภัย': { key: 'novice', eye: '#4a8fd8', hairM: '#8a5a3a', hairF: '#c9854a', cloth: '#f0dfb0', trim: '#8a5a2a', armor: '#f0dfb0', pants: '#7a5a3a', boots: '#6a4222' }
};
const jobOf = j => JOBS[j] ? j : 'นักผจญภัย';

/* ---------- helpers ---------- */
function ik(sx, sy, hx, hy, u, f, bend) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy); const mx = u + f - .05;
  if (d > mx) { const k = mx / d; hx = sx + dx * k; hy = sy + dy * k; dx *= k; dy *= k; d = mx; } if (d < .6) d = .6;
  const a = (u * u - f * f + d * d) / (2 * d), h = Math.sqrt(Math.max(0, u * u - a * a)), ux = dx / d, uy = dy / d;
  return { ex: sx + ux * a - uy * h * bend, ey: sy + uy * a + ux * h * bend, hx, hy };
}
/* draw flat shapes -> crop -> bevel-shade -> {s,x,y} */
function layer(fn, R = 2, o = {}) {
  const t = new Sp(W + 24, H + 8); fn(t); const bb = t.bbox(); if (!bb) return null;
  const c = t.crop(bb.x, bb.y, bb.w, bb.h); c.shade(o.map || null, { R, dither: !!o.dither, vbias: o.vbias || 0, strength: o.strength }); return { s: c, x: bb.x, y: bb.y };
}
const put = (dst, L, o = { rim: true }) => { if (L) dst.blit(L.s, L.x, L.y, o); };
function eye(sp, x, y, col, o = {}) {
  const dk = LINE;
  if (o.blink) { sp.hline(x - 1, y + 1, 4, dk); return; }
  const w = o.small ? 2 : 3, tall = o.small ? 4 : 5;
  sp.rect(x, y - 1, w, tall, mix(col, '#000000', .1));
  sp.rect(x, y + tall - 2, w, 1, PX.shift(col, 0, -.1, .22)); sp.rect(x, y - 1, w, 1, PX.shift(col, 0, 0, -.28));
  sp.hline(x - (o.fem ? 1 : 0), y - 2, w + 1 + (o.fem ? 1 : 0), dk);
  sp.px(x - 1, y, dk); sp.px(x - 1, y + 1, dk);
  sp.px(x, y, '#ffffff'); if (!o.small) sp.px(x + 1, y + 2, '#ffffffaa');
  sp.px(x + w, y, dk);
}

/* ---------- pose generators ---------- */
const wave = (t, ph = 0, a = 1) => Math.sin((t + ph) * Math.PI * 2) * a;
function idlePose(job, t) {
  const J = JOBS[job], k = J.key, bob = Math.round(.5 + .5 * Math.sin((t - .25) * Math.PI * 2)), hb = Math.round(.5 + .5 * Math.sin((t - .38) * Math.PI * 2));
  const P = { dy: bob, hdy: hb - bob, hdx: 0, lean: 0, sh: [CX + 7, 44], shB: [CX - 8, 44], capeSw: wave(t, 0, 1), hairSw: wave(t, .15, 1), blink: (t > .74 && t < .86), mouth: 0, brow: 0, wAng: 38, pull: 0, arrow: false, shock: null, swoosh: null, flash: 0, footF: [CX + 6, GY - 1], footB: [CX - 5, GY - 1], bend: 1, backFront: false, fxT: t };
  if (k === 'sword' || k === 'novice') { P.handF = [CX + 12, 49 + bob + Math.round(wave(t, .1, .6))]; P.handB = [CX - 10, 51 + bob]; P.wAng = k === 'novice' ? 34 : 30; }
  else if (k === 'fist') { P.handF = [CX + 12, 46 + bob]; P.handB = [CX + 8, 49 + bob]; P.wAng = 0; P.backFront = true; P.fistGuard = true; }
  else if (k === 'bow') { P.handF = [CX + 12, 46 + bob]; P.handB = [CX - 9, 52 + bob]; P.wAng = 0; }
  else { P.handF = [CX + 10, 47 + bob + Math.round(wave(t, .2, .6))]; P.handB = [CX - 9, 51 + bob]; P.wAng = 4; }
  return P;
}
const lerpA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mixP = (A, B, t) => { const o = { ...A }; for (const k of ['dy', 'hdy', 'hdx', 'lean', 'wAng', 'pull']) o[k] = A[k] + (B[k] - A[k]) * t; for (const k of ['handF', 'handB', 'footF', 'footB']) o[k] = lerpA(A[k], B[k], t); return o; };
function fightPose(job, i, n = 8) {
  const J = JOBS[job], k = J.key, t = i / n, P = idlePose(job, t); P.fight = true;
  const S = (o) => Object.assign(P, o);
  if (k === 'sword' || k === 'novice') {
    const K = [
      { handF: [CX + 12, 48], wAng: 40, lean: 0, dy: 0 },
      { handF: [CX + 6, 38], wAng: -25, lean: -1, dy: 1, footF: [CX + 4, GY - 1] },
      { handF: [CX + 1, 33], wAng: -70, lean: -2, dy: 1, brow: 1, footB: [CX - 8, GY - 1] },
      { handF: [CX + 11, 40], wAng: 25, lean: 1, dy: 0, footF: [CX + 9, GY - 1], mouth: 1, brow: 1, swoosh: [-70, 25] },
      { handF: [CX + 17, 47], wAng: 95, lean: 3, dy: 1, footF: [CX + 12, GY - 1], mouth: 1, brow: 1, swoosh: [25, 95] },
      { handF: [CX + 16, 52], wAng: 140, lean: 3, dy: 1, footF: [CX + 12, GY - 1], mouth: 1, swoosh: [95, 145] },
      { handF: [CX + 14, 51], wAng: 100, lean: 2, dy: 1, footF: [CX + 10, GY - 1] },
      { handF: [CX + 12, 49], wAng: 55, lean: 0, dy: 0 }
    ][i];
    S(K); P.handB = [CX - 9 + (K.lean || 0), 50]; if (i >= 1 && i <= 2) P.handB = [CX - 4, 40]; if (i >= 3) P.handB = [CX - 10 + K.lean, 52];
  } else if (k === 'fist') {
    const K = [
      { handF: [CX + 12, 46], handB: [CX + 7, 49], lean: 0 },
      { handF: [CX + 7, 46], handB: [CX + 11, 47], lean: -1, brow: 1, dy: 1 },
      { handF: [CX + 25, 44], handB: [CX + 3, 49], lean: 3, brow: 1, mouth: 1, dy: 1, shock: [CX + 31, 44, 1], footF: [CX + 11, GY - 1] },
      { handF: [CX + 27, 44], handB: [CX + 3, 49], lean: 3, mouth: 1, dy: 1, shock: [CX + 33, 44, 2], footF: [CX + 11, GY - 1] },
      { handF: [CX + 13, 46], handB: [CX + 8, 48], lean: 0, dy: 0 },
      { handB: [CX + 25, 46], handF: [CX + 5, 49], lean: 3, brow: 1, mouth: 1, dy: 1, shock: [CX + 31, 46, 1], footF: [CX + 10, GY - 1] },
      { handB: [CX + 27, 46], handF: [CX + 5, 49], lean: 3, mouth: 1, dy: 1, shock: [CX + 33, 46, 2], footF: [CX + 10, GY - 1] },
      { handF: [CX + 12, 46], handB: [CX + 8, 49], lean: 0, dy: 0 }
    ][i];
    S(K);
  } else if (k === 'bow') {
    const K = [
      { handF: [CX + 12, 47], handB: [CX - 9, 52], pull: 0, wAng: 0 },
      { handF: [CX + 15, 43], handB: [CX - 6, 47], pull: 2, wAng: 0, lean: -1 },
      { handF: [CX + 18, 42], handB: [CX + 1, 42], pull: 8, wAng: 0, arrow: true, brow: 1, lean: -1 },
      { handF: [CX + 18, 42], handB: [CX - 3, 42], pull: 11, wAng: 0, arrow: true, brow: 1, lean: -2 },
      { handF: [CX + 18, 42], handB: [CX - 7, 44], pull: 0, wAng: 0, shot: 1, mouth: 1, lean: 0 },
      { handF: [CX + 17, 43], handB: [CX - 9, 48], pull: 0, wAng: 0, shot: 2, lean: 0 },
      { handF: [CX + 14, 46], handB: [CX - 10, 51], pull: 0, wAng: 0, lean: 0 },
      { handF: [CX + 12, 47], handB: [CX - 12, 46], pull: 0, wAng: 0, lean: 0 }
    ][i];
    S(K);
  } else {
    const K = [
      { handF: [CX + 10, 47], wAng: 5, handB: [CX - 9, 51] },
      { handF: [CX + 9, 41], wAng: -5, handB: [CX - 3, 44], brow: 1, dy: 1 },
      { handF: [CX + 9, 35], wAng: 12, handB: [CX - 1, 38], brow: 1, dy: 1, mouth: 1, cast: 1 },
      { handF: [CX + 13, 37], wAng: 50, handB: [CX + 2, 39], brow: 1, mouth: 1, lean: 1, cast: 2 },
      { handF: [CX + 15, 41], wAng: 70, handB: [CX + 3, 42], mouth: 1, lean: 2, cast: 3 },
      { handF: [CX + 14, 43], wAng: 62, handB: [CX + 1, 46], mouth: 1, lean: 2, cast: 2 },
      { handF: [CX + 12, 46], wAng: 30, handB: [CX - 6, 49], lean: 1, cast: 1 },
      { handF: [CX + 10, 47], wAng: 8, handB: [CX - 9, 51] }
    ][i];
    S(K);
  }
  return P;
}
/* knocked-down pose (0 HP): drawn lying, used for the dungeon death state */

/* ---------- body drawing ---------- */
const memo = new Map();
function drawHero(job, gender, wspec, P) {
  job = jobOf(job); const J = JOBS[job], k = J.key, F = gender === 'female', spr = new Sp(W, H), dy = P.dy | 0;
  const cx = CX + (P.lean | 0), ty = 41 + dy, hx = cx + 1 + (P.hdx | 0), hy = 28 + dy + (P.hdy | 0);
  const hair = F ? J.hairF : J.hairM, skin = F ? SKF : SK;
  // soft ground shadow
  spr.ell(CX + 2, GY + 1, 12, 2.6, '#1a102855');
  /* ---- back layer ---- */
  if (k === 'sword') { // cape
    const sw = P.capeSw, L = layer(s => { const top = ty + 3; const pts = [[cx - 7, top], [cx + 1, top]]; for (let i = 0; i <= 6; i++) pts.push([cx + 1 - i * 1.7 - sw * (i / 6) * 3 - (P.fight ? i * .4 : 0), top + 4 + i * 3.4 + Math.sin(i + sw * 2) * .5]); for (let i = 6; i >= 0; i--) pts.push([cx - 8 - i * 1.0 - sw * (i / 6) * 3 - (P.fight ? i * .8 : 0), top + 5 + i * 2.8]); s.poly(pts.slice(0, 2).concat(pts.slice(2)), J.cloth); }, 3); put(spr, L); }
  if (k === 'bow') { const q = layer(s => { s.cap(cx - 9, ty + 1, cx - 15, ty + 13, 2.8, 2.8, '#7a4a2a'); s.cap(cx - 9, ty + 1, cx - 15, ty + 13, 1.2, 1.2, '#4a2a18'); }, 2); put(spr, q);
    const ar = layer(s => { for (let i = 0; i < 3; i++) { s.line(cx - 10 + i * 1.4, ty - 1, cx - 12 + i * 1.4, ty - 6 - (i % 2), '#e8d8b0', 1); s.px(cx - 12 + i * 1.4, ty - 7 - (i % 2), i === 1 ? '#7dff9a' : '#ff8a8a'); } }, 1, { map: null }); put(spr, ar, { rim: false }); }
  if (k === 'fist') { // headband tails
    const tl = layer(s => { const w = P.hairSw; s.cap(hx - 9, hy - 4, hx - 15 - w, hy + 2 + (P.fight ? 1 : 0), 1.6, 1.0, '#d9352f'); s.cap(hx - 9, hy - 4, hx - 17 - w * 2, hy + 8, 1.5, .8, '#d9352f'); }, 1); put(spr, tl, { rim: true }); }
  if (k === 'novice') { const bp = layer(s => { s.ell(cx - 10, ty + 7, 4, 6, '#a9743c'); s.rect(cx - 11, ty + 4, 3, 2, '#e8c05a'); }, 2); put(spr, bp); }
  // back hair / ponytail / long hair
  const bh = layer(s => {
    s.ell(hx - 3, hy - 1, 12.4, 11.6, hair);
    if (F) { const sw = P.hairSw * 1.6; if (k === 'mage' || k === 'sword') { s.cap(hx - 8, hy + 2, hx - 11 - sw, hy + 18, 5.6, 3.6, hair); } else { s.cap(hx - 9, hy - 2, hx - 17 - sw, hy + 11, 3.6, 2.2, hair); s.ell(hx - 17 - sw, hy + 12, 3, 3, hair); } }
    else if (k === 'bow' || k === 'sword' || k === 'novice') s.cap(hx - 8, hy + 1, hx - 12 - P.hairSw, hy + 7, 3, 2, hair);
  }, 3, { dither: true }); put(spr, bh);

  /* ---- far arm (behind torso unless backFront) ---- */
  const sleeve = (k === 'fist') ? skin : k === 'mage' ? J.cloth : k === 'sword' ? J.cloth : k === 'bow' ? J.cloth : J.cloth;
  const fore = k === 'sword' ? J.armor : k === 'fist' ? '#f1ead8' : k === 'bow' ? J.trim : k === 'mage' ? J.trim : skin;
  const hand = k === 'sword' ? J.armor : k === 'fist' ? (wspec ? PX.weapon.pal(wspec).metal : '#d8dde8') : skin;
  const mkArm = (S, Hd, o = {}) => layer(s => { const q = ik(S[0], S[1] + dy, Hd[0], Hd[1], o.u || 6.5, o.f || 6.5, o.bend || 1); s.cap(S[0], S[1] + dy, q.ex, q.ey, 2.7, 2.4, o.sleeve || sleeve); s.cap(q.ex, q.ey, q.hx, q.hy, 2.4, 2.1, o.fore || fore); if (!o.noHand) s.ell(q.hx, q.hy, 2.5, 2.5, o.hand || hand); if (o.cuff) s.ell(q.ex * .35 + q.hx * .65, q.ey * .35 + q.hy * .65, 2.7, 2.7, o.cuff); }, 2);
  const shB = [P.shB[0] + (P.lean | 0), P.shB[1]], shF = [P.sh[0] + (P.lean | 0), P.sh[1]];
  const armBL = mkArm(shB, P.handB, { bend: -1, cuff: k === 'mage' ? J.trim : null });
  if (!P.backFront) put(spr, armBL);

  /* ---- legs ---- */
  const hipF = [cx + 3, ty + 12], hipB = [cx - 3, ty + 12];
  const legL = (hip, foot, back) => layer(s => { const q = ik(hip[0], hip[1], foot[0] + (P.lean | 0) * .3, foot[1] - 3, 7, 7, 1); const pc = k === 'mage' ? '#1c2766' : J.pants; s.cap(hip[0], hip[1], q.ex, q.ey, 3.1, 2.7, pc); s.cap(q.ex, q.ey, q.hx, q.hy, 2.7, 2.4, k === 'fist' ? '#f1ead8' : pc); const bc = J.boots; s.ell(foot[0] + 1.4, foot[1] - 1.2, 4.3, 2.6, bc); s.rect(foot[0] - 2, foot[1] - 4.6, 5, 3, k === 'bow' ? '#4a2a18' : bc); if (k === 'sword') s.rect(foot[0] - 2, foot[1] - 5, 5, 1.3, J.trim); }, 2);
  put(spr, legL(hipB, P.footB, true)); put(spr, legL(hipF, P.footF, false));

  /* ---- torso ---- */
  const tor = layer(s => {
    if (k === 'sword') { s.ell(cx, ty + 7, 8.6, 7.8, J.armor); s.rect(cx - 2.6, ty + 2, 5.2, 13, J.cloth); s.rect(cx - 9, ty + 11.6, 18, 2.6, '#6b4228'); s.rect(cx - 1.6, ty + 11.2, 3.2, 3.4, J.trim); s.ell(cx - 7, ty + 1.8, 3.6, 3, J.armor); s.rect(cx - 5, ty + 14, 10, 4, J.cloth); }
    else if (k === 'fist') { s.ell(cx, ty + 7, 8.2, 7.6, J.cloth); s.poly([[cx - 2, ty], [cx + 3, ty], [cx + 1, ty + 8]], skin); s.rect(cx - 8.5, ty + 11, 17, 3, J.trim); s.rect(cx + 2, ty + 11, 2.4, 6.4, J.trim); s.rect(cx - 5, ty + 14, 11, 3, J.pants); }
    else if (k === 'bow') { s.ell(cx, ty + 7, 8.2, 7.6, J.cloth); s.poly([[cx - 7, ty + 1], [cx - 4, ty], [cx + 7, ty + 13], [cx + 4, ty + 14]], J.trim); s.rect(cx - 8.4, ty + 11.4, 17, 2.4, '#5a3a22'); s.rect(cx - 1.4, ty + 11, 3, 3, J.trim); s.rect(cx - 5, ty + 14, 11, 4, J.cloth); }
    else if (k === 'mage') { s.poly([[cx - 8, ty + 1], [cx + 8, ty + 1], [cx + 12, ty + 25], [cx - 12, ty + 25]], J.cloth); s.rect(cx - 2.4, ty + 3, 4.8, 22, J.trim); s.rect(cx - 9, ty + 11, 18, 2.6, '#e8c05a'); s.ell(cx, ty + 12.3, 2.2, 2.2, '#a45cf0'); s.rect(cx - 12, ty + 22, 24, 3, J.trim); }
    else { s.ell(cx, ty + 7, 8.2, 7.6, J.cloth); s.rect(cx - 8.4, ty + 11, 17, 2.6, J.trim); s.rect(cx - 5, ty + 14, 11, 4, J.cloth); s.rect(cx + 2, ty + 2, 5, 3, '#ffd24a'); }
    if (F && k !== 'mage') s.poly([[cx - 8, ty + 14], [cx + 8, ty + 14], [cx + 10, ty + 19], [cx - 10, ty + 19]], k === 'sword' ? J.cloth : k === 'bow' ? J.cloth : k === 'fist' ? J.pants : J.cloth);
  }, 3, { dither: false });
  put(spr, tor);
  if (k === 'mage') { // feet peek out under the robe hem
    const ft = layer(s => { s.ell(P.footF[0] + 2, GY - 1, 3.6, 2.2, '#e8c05a'); s.ell(P.footB[0] + 2, GY - 1, 3.6, 2.2, '#e8c05a'); }, 1); put(spr, ft);
  }

  /* ---- head ---- */
  const hd = layer(s => { s.ell(hx, hy, 11.5, 10.6, skin); s.ell(hx + 1, hy + 3, 10.4, 8.4, skin); }, 5);
  put(spr, hd);
  // blush
  spr.px(hx + 2, hy + 6, '#ff9aa855'); spr.px(hx + 3, hy + 6, '#ff9aa866'); spr.px(hx + 9, hy + 6, '#ff9aa855');
  // front hair (cap with bangs)
  const fh = layer(s => {
    s.ell(hx - 1, hy - 3, 12.8, 9.4, hair);
    // clear everything under the bang line
    for (let x = hx - 16; x <= hx + 16; x++) {
      let b; const dx = x - hx;
      if (dx < -7) b = hy + 7; else { const z = ((dx + 8) % 5 + 5) % 5; b = hy - 5.5 + (z === 0 ? 3.5 : z === 1 ? 2.6 : z === 2 ? 1.2 : z === 3 ? 2.4 : 0.5) + (dx > 6 ? -1 : 0); }
      for (let y = Math.ceil(b); y < hy + 12; y++) if (s.get(x, y)) s.d[y * s.w + x] = 0;
    }
    if (!F && (k === 'sword' || k === 'fist' || k === 'novice')) { for (let i = 0; i < 4; i++) s.poly([[hx - 9 + i * 5, hy - 9], [hx - 7 + i * 5 + P.hairSw * .6, hy - 15 - (i % 2) * 2], [hx - 3 + i * 5, hy - 9]], hair); }
    if (F && (k === 'fist')) { s.ell(hx - 7, hy - 12, 4.3, 4, hair); s.ell(hx + 5, hy - 12, 4.3, 4, hair); }
    if (F && (k === 'sword' || k === 'novice')) s.cap(hx - 8, hy - 8, hx - 11, hy + 3, 2.6, 1.7, hair);
  }, 3, { dither: true });
  put(spr, fh, { rim: false });
  // headgear
  if (k === 'sword') { const cr = layer(s => { s.rect(hx - 11, hy - 6, 22, 2.4, J.armor); s.ell(hx + 1, hy - 5, 1.9, 1.9, '#e0364a'); }, 1); put(spr, cr, { rim: false }); }
  if (k === 'fist') { const hb = layer(s => { s.rect(hx - 11, hy - 6.4, 22, 2.8, '#d9352f'); s.rect(hx + 9, hy - 6, 2, 3, '#d9352f'); }, 1); put(spr, hb, { rim: false }); }
  if (k === 'bow') { const fe = layer(s => { s.cap(hx - 6, hy - 11, hx - 10 - P.hairSw, hy - 18, 1.6, .9, '#7dff9a'); s.cap(hx - 6, hy - 11, hx - 8, hy - 17, 1.2, .6, '#fff'); s.rect(hx - 11, hy - 6, 22, 2, '#3f8f4a'); }, 1); put(spr, fe, { rim: true });
    if (!F) { /* elf-like ear */ } }
  if (k === 'mage') {
    const brim = layer(s => { s.ell(hx, hy - 9, 17, 3.6, J.cloth); }, 2); put(spr, brim);
    const sw = P.hairSw;
    const hat = layer(s => { s.poly([[hx - 10, hy - 9], [hx + 10, hy - 9], [hx + 4 + sw * 2, hy - 20], [hx + 8 + sw * 4, hy - 25], [hx - 2 + sw, hy - 21], [hx - 7, hy - 14]], J.cloth); s.rect(hx - 10, hy - 11.4, 20, 2.6, J.trim); s.ell(hx + 1, hy - 10.2, 1.7, 1.7, '#a45cf0'); }, 3); put(spr, hat);
  }
  if (k === 'novice') { const rb = layer(s => { s.rect(hx - 11, hy - 6, 22, 2, '#e8c05a'); }, 1); put(spr, rb, { rim: false }); }
  if (F && k !== 'mage' && k !== 'fist') { const rib = layer(s => { s.poly([[hx - 8, hy - 11], [hx - 12, hy - 14], [hx - 12, hy - 8]], k === 'sword' ? '#e8c05a' : '#ff8ab0'); s.poly([[hx - 8, hy - 11], [hx - 4, hy - 14], [hx - 4, hy - 8]], k === 'sword' ? '#e8c05a' : '#ff8ab0'); }, 1); put(spr, rib); }
  // face
  const eyeCol = J.eye, ex = hx + 1, ey = hy + 1;
  eye(spr, ex, ey, eyeCol, { blink: P.blink, fem: F }); eye(spr, ex + 7, ey, eyeCol, { blink: P.blink, small: true, fem: F });
  if (P.brow) { spr.hline(ex - 1, ey - 4, 4, hair === '#d8dde8' ? '#8a90a4' : PX.mix(hair, '#000', .45)); spr.hline(ex + 6, ey - 4, 3, PX.mix(hair, '#000', .45)); }
  else { spr.hline(ex, ey - 4, 3, PX.alpha(PX.mix(hair, '#000', .4), .7)); spr.hline(ex + 7, ey - 4, 2, PX.alpha(PX.mix(hair, '#000', .4), .7)); }
  if (P.mouth) { spr.rect(hx + 5, hy + 6, 3, 2, '#8a2a3a'); spr.px(hx + 6, hy + 7, '#e0586a'); } else { spr.hline(hx + 5, hy + 7, 2, '#a8505a'); spr.px(hx + 7, hy + 6, '#a8505a'); }
  if (k === 'fist' && F) { /* nothing extra */ }

  /* ---- front arm + weapon ---- */
  if (P.backFront) put(spr, armBL);
  const wp = wspec;
  if (k === 'bow' && wp) {
    // bow: held in the forward hand, string hand pulls back
    const hF = P.handF, hB = P.handB;
    const armF = mkArm(shF, hF, { bend: 1 }); put(spr, armF);
    const pull = P.pull | 0; PX.weapon.stamp(spr, wp, hF[0] + 1, hF[1] - 1, 0, { scale: 1, pull, arrow: !!P.arrow, arrowLen: 20 });
    if (P.arrow || (P.shot)) { /* arrow flight */ }
    if (P.shot === 1) { spr.line(hF[0] + 6, hF[1] - 1, hF[0] + 24, hF[1] - 1, '#fff6d8', 1); spr.rect(hF[0] + 24, hF[1] - 2, 2, 3, '#ffffff'); spr.px(hF[0] + 5, hF[1] - 2, '#7dff9a'); }
    if (P.shot === 2) { spr.line(hF[0] + 17, hF[1] - 1, hF[0] + 33, hF[1] - 1, '#fff6d855', 1); spr.px(hF[0] + 34, hF[1] - 1, '#ffffff99'); }
    if (P.arrow) { /* hand sits on the string */ }
  } else {
    const hF = P.handF, armF = mkArm(shF, hF, { bend: 1, cuff: k === 'sword' ? J.trim : null }); put(spr, armF);
    if (wp && wp.cls === 'หมัด') {
      const ang = P.fistGuard ? -8 : P.shock ? 78 : 22; // gauntlet drawn pointing up (guard) or forward (punch)
      PX.weapon.stamp(spr, wp, hF[0], hF[1] - 1, P.shock ? 88 : 14, { scale: .66 });
      PX.weapon.fx(spr, wp, hF[0], hF[1], 14, P.fxT, .66);
    } else if (wp) {
      // swoosh trail for slashes
      if (P.swoosh) { const [a0, a1] = P.swoosh, rr = wp.cls === 'ดาบ' ? 24 + (wp.tier | 0) * 2 : 28; swoosh(spr, hF[0], hF[1], rr, a0, a1, wp); }
      const b = PX.weapon.stamp(spr, wp, hF[0], hF[1] + 1, P.wAng, { scale: 1 });
      PX.weapon.fx(spr, wp, hF[0], hF[1] + 1, P.wAng, P.fxT, 1);
      if (wp.cls === 'จอมเวท' && P.cast) castFx(spr, wp, hF[0], hF[1] + 1, P.wAng, P.cast, b);
    }
  }
  if (!wp && k === 'fist') { /* bare hand is the fist */ }
  if (P.shock) shockFx(spr, P.shock[0], P.shock[1], P.shock[2], wp);
  if (P.flash) spr.tint('#ff4040', P.flash);
  return spr;
}
function swoosh(spr, x, y, r, a0, a1, wp) {
  const th = (wp && wp.theme) || 'normal', cols = th === 'fire' ? ['#ffe08a', '#ff9a2a', '#e8502a'] : th === 'ice' ? ['#ffffff', '#bff0ff', '#6fc8ff'] : th === 'prism' ? ['#ffffff', '#ffd0f0', '#c9a0ff'] : ['#ffffff', '#e8f0ff', '#a8c0e8'];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180, f = i / steps, rr = r;
    const px = x + Math.sin(a) * rr, py = y - Math.cos(a) * rr;
    const c = f > .8 ? cols[0] : f > .45 ? cols[1] : cols[2], al = Math.round(70 + 185 * f).toString(16).padStart(2, '0');
    spr.px(px, py, PX.alpha(c, (70 + 185 * f) / 255));
    if (f > .35) spr.px(x + Math.sin(a) * (rr - 1.4), y - Math.cos(a) * (rr - 1.4), PX.alpha(c, (50 + 150 * f) / 255));
    if (f > .6) spr.px(x + Math.sin(a) * (rr + 1.4), y - Math.cos(a) * (rr + 1.4), PX.alpha(c, f * .6));
  }
}
function shockFx(spr, x, y, kind, wp) {
  const th = (wp && wp.theme) || 'normal', c = th === 'fire' ? '#ff9a2a' : th === 'ice' ? '#9fe8ff' : '#ffe9a0';
  if (kind === 1) { for (let i = 0; i < 3; i++) spr.hline(x - 12 - i * 3, y - 3 + i * 3, 6, PX.alpha('#ffffff', .6)); }
  else { spr.ell(x, y, 3.2, 3.2, '#ffffff'); for (let a = 0; a < 8; a++) { const r = 5 + (a % 2) * 2; spr.line(x + Math.cos(a * .785) * 3, y + Math.sin(a * .785) * 3, x + Math.cos(a * .785) * r, y + Math.sin(a * .785) * r, c, 1); } spr.px(x, y, '#ffffff'); }
}
function castFx(spr, wp, x, y, ang, lv, b) {
  const a = ang * Math.PI / 180, hd = b.head || [0, -24], hx = x + hd[0] * Math.cos(a) - hd[1] * Math.sin(a), hy = y + hd[0] * Math.sin(a) + hd[1] * Math.cos(a);
  const th = wp.theme, c = th === 'fire' ? '#ff9a2a' : th === 'ice' ? '#9fe8ff' : wp.tier >= 3 ? '#fff1a0' : wp.tier === 2 ? '#d6a8ff' : wp.tier === 1 ? '#ffb04a' : '#9fe8ff';
  spr.glow(hx, hy, 5 + lv * 2, c, .55 + lv * .1);
  if (lv >= 2) { for (let i = 0; i < 6; i++) { const r = 6 + lv * 2 + (i % 2) * 2, aa = i * 1.05 + lv; spr.px(hx + Math.cos(aa) * r, hy + Math.sin(aa) * r, '#ffffff'); } }
  if (lv === 3) { spr.ell(hx, hy, 4, 4, '#ffffff'); for (let i = 0; i < 4; i++) { const aa = i * 1.571 + .4; spr.line(hx, hy, hx + Math.cos(aa) * 10, hy + Math.sin(aa) * 10, c, 1); } }
}

/* ---------- frame sets ---------- */
function frames(job, gender, wspec) {
  const idle = [], fight = [];
  for (let i = 0; i < 8; i++) idle.push(drawHero(job, gender, wspec, idlePose(job, i / 8)));
  for (let i = 0; i < 8; i++) fight.push(drawHero(job, gender, wspec, fightPose(job, i)));
  return { idle, fight };
}
const reg = (job, gender, wspec) => {
  job = jobOf(job); gender = gender === 'female' ? 'female' : 'male';
  const key = ['hero', job, gender, PX.weaponKey(wspec), wspec ? wspec.cls : ''].join('|');
  if (PX.anim.has(key)) return PX.anim.get(key).first;
  return PX.anim.reg(key, frames(job, gender, wspec), { fps: 8, fpsBy: { idle: 6, fight: 11 } });
};
PX.hero = { W, H, JOBS, drawHero, idlePose, fightPose, frames, reg, jobOf };
PX.heroFirstFrame = (job, gender, wspec) => drawHero(job, gender, wspec, idlePose(jobOf(job), 0));
})();
