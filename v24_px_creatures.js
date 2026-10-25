/* 55 AMBERLANDS V24 — PIXEL MONSTERS & BOSSES
 * ~14 procedural body plans (blob, beast, humanoid, mushroom, treant, wisp, golem, bat, arthropod,
 * serpent, dragon, ...) x palettes/accessories => a distinct, animated sprite for every monster,
 * map boss, world boss and dungeon boss. Each sprite owns a FRAME TABLE:
 *   idle x8  |  attack x6  |  hurt x2  |  die x6
 * The game loop plays idle with a periodic attack lunge/breath; the Codex shows the full table.
 * Sprites face LEFT (towards the party) — bodies are drawn facing right and mirrored.
 */
(() => {
'use strict';
const PX = window.PX; if (!PX) return;
const { Sp, mix, rng, hash } = PX;
const sin = Math.sin, cos = Math.cos, PI = Math.PI;

function layerOf(S, fn, R = 3, o = {}) {
  const t = new Sp(S + 20, S + 20); fn(t); const bb = t.bbox(); if (!bb) return null;
  const c = t.crop(bb.x, bb.y, bb.w, bb.h); c.shade(o.map || null, { R, dither: !!o.dither, vbias: o.vbias || 0, strength: o.strength }); return { s: c, x: bb.x, y: bb.y };
}
const put = (d, L, o = { rim: true }) => { if (L) d.blit(L.s, L.x, L.y, o); };
function ik(sx, sy, hx, hy, u, f, bend) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy); const mx = u + f - .05;
  if (d > mx) { const k = mx / d; hx = sx + dx * k; hy = sy + dy * k; dx *= k; dy *= k; d = mx; } if (d < .6) d = .6;
  const a = (u * u - f * f + d * d) / (2 * d), h = Math.sqrt(Math.max(0, u * u - a * a)), ux = dx / d, uy = dy / d;
  return { ex: sx + ux * a - uy * h * bend, ey: sy + uy * a + ux * h * bend, hx, hy };
}
const glowEye = (sp, x, y, c, r = 1) => { sp.glow(x, y, 3 + r, c, .45); sp.rect(x - r * .5, y - r * .5, Math.max(1, r), Math.max(1, r), '#ffffff'); sp.px(x, y, c); };
function eyes(sp, x, y, gap, c, o = {}) { const big = o.big || 2; for (const dx of [0, gap]) { sp.rect(x + dx, y, big, big + 1, '#1a1020'); sp.rect(x + dx + (o.pupil != null ? o.pupil : 1), y + 1, Math.max(1, big - 1), Math.max(1, big - 1), c); sp.px(x + dx, y, '#ffffff'); } if (o.angry) { sp.line(x - 1, y - 2, x + big, y - 1, '#1a1020', 1); sp.line(x + gap - 1, y - 1, x + gap + big, y - 2, '#1a1020', 1); } }

/* attack timeline helper: a in [0,1] -> {fw: forward lunge px, up: lift, wind: crouch, hit: strike flag} */
function atk(p) {
  const a = p.a; if (a == null || a < 0) return { fw: 0, up: 0, wind: 0, hit: 0, open: 0 };
  if (a < .38) { const k = a / .38; return { fw: -2 * p.u * k, up: 0, wind: k, hit: 0, open: k * .6 }; }
  if (a < .62) { const k = (a - .38) / .24; return { fw: (-2 + 9 * k) * p.u, up: -sin(k * PI) * 2 * p.u, wind: 1 - k, hit: 1, open: 1 }; }
  const k = (a - .62) / .38; return { fw: (7 * (1 - k)) * p.u, up: 0, wind: 0, hit: 0, open: 1 - k };
}

/* =========================== BODY PLANS =========================== */
const PLANS = {};

PLANS.blob = (sp, p) => {
  const { S, u, c } = p, A = atk(p), bob = sin(p.t * PI * 2), cx = S / 2 + A.fw * .8, gy = S - 3 * u + A.up;
  const sq = 1 + .07 * bob - A.wind * .18 + (A.hit ? .12 : 0), w = S * .34 * (1 / sq) * (1 + .02 * bob), h = S * .30 * sq;
  const body = layerOf(S, s => { s.ell(cx, gy - h, w, h, c.a); s.ell(cx, gy - h * 1.15, w * .72, h * .8, c.a); if (c.b) s.ell(cx - w * .1, gy - h * .45, w * .62, h * .5, c.b); }, Math.max(3, S / 9), { vbias: .25 });
  put(sp, body);
  // gloss
  sp.ell(cx - w * .45, gy - h * 1.55, w * .22, h * .13, '#ffffffcc'); sp.px(cx - w * .72, gy - h * 1.25, '#ffffffcc');
  const ey = gy - h * 1.05, ex = cx + w * .05;
  eyes(sp, ex - 1, ey, Math.round(w * .55), c.eye || '#ffffff', { big: Math.max(2, Math.round(S / 14)), angry: p.angry || A.hit });
  if (A.open > .3) { sp.rect(ex + w * .15, ey + 5 * u, 5 * u, 3 * u, '#6a1030'); sp.rect(ex + w * .15 + u, ey + 6 * u, 3 * u, u, '#ff7a8a'); } else sp.hline(ex + w * .15, ey + 5 * u, 4 * u, '#3a1030');
  if (c.hat) { const t0 = layerOf(S, s => { s.rect(cx - w * .55, gy - h * 2.25, w * 1.1, 3 * u, c.hat); s.poly([[cx - w * .8, gy - h * 2.25], [cx + w * .8, gy - h * 2.25], [cx, gy - h * 2.55]], c.hat); }, 2); put(sp, t0); sp.px(cx + w * .6, gy - h * 2.05 + 3 * u, '#ffd24a'); }
  if (c.crown) { const t0 = layerOf(S, s => { s.rect(cx - w * .5, gy - h * 2.0, w, 3 * u, '#f2c14e'); for (let i = 0; i < 3; i++) s.poly([[cx - w * .5 + i * w * .5, gy - h * 2.0], [cx - w * .5 + i * w * .5 + 2 * u, gy - h * 2.0 - 4 * u], [cx - w * .5 + i * w * .5 + 4 * u, gy - h * 2.0]], '#f2c14e'); }, 1); put(sp, t0); }
  if (c.drip) for (let i = 0; i < 3; i++) { const y = gy - 2 + ((p.t * 3 + i * .33) % 1) * 4; sp.px(cx - w + i * w * .8 + 2, y - h * .3, c.drip); }
  if (c.spikes) { const t0 = layerOf(S, s => { for (let i = 0; i < 5; i++) { const a = -PI * .85 + i * PI * .18; s.poly([[cx + cos(a) * w * .85 - 1.5, gy - h * 1.1 + sin(a) * h * 1.3], [cx + cos(a) * w * 1.25, gy - h * 1.1 + sin(a) * h * 1.7], [cx + cos(a) * w * .85 + 1.5, gy - h * 1.1 + sin(a) * h * 1.3]], c.spikes); } }, 1); put(sp, t0, { rim: true }); }
};

PLANS.beast = (sp, p) => {   // quadruped: wolf / rat / yeti-hound / crystal beast
  const { S, u, c } = p, A = atk(p), bob = sin(p.t * PI * 2), step = sin(p.t * PI * 4), cx = S * .46 + A.fw, gy = S - 3 * u + A.up * .6;
  const bl = S * .30, bh = S * .17 + (A.wind ? A.wind * u : 0), by = gy - S * .22 + bob * .6 - A.wind * 1.5 * u;
  const wag = sin(p.t * PI * 4);
  // tail
  put(sp, layerOf(S, s => { s.cap(cx - bl * .85, by - bh * .3, cx - bl * 1.25, by - bh * (1.3 + (c.tailUp ? .9 : 0)) + wag * 2, 2.6 * u, 1.2 * u, c.b || c.a); if (c.bushy) s.ell(cx - bl * 1.25, by - bh * 1.5 + wag * 2, 3 * u, 4 * u, c.b || c.a); }, 2));
  // far legs
  const leg = (x, ph, front) => layerOf(S, s => { const sw = sin(p.t * PI * 2 + ph) * 2 * u * (A.hit ? .3 : 1), fy = gy; s.cap(x, by + bh * .4, x + sw, fy - 2 * u, 3 * u, 2.2 * u, front ? c.a : c.b || c.a); s.ell(x + sw + u, fy - u, 3 * u, 1.8 * u, c.paw || c.b || c.a); }, 2);
  put(sp, leg(cx - bl * .6, 0, false)); put(sp, leg(cx + bl * .55, PI, false));
  // body
  put(sp, layerOf(S, s => { s.ell(cx, by, bl, bh, c.a); if (c.b) s.ell(cx + bl * .1, by + bh * .55, bl * .75, bh * .45, c.b); if (c.mane) s.ell(cx + bl * .55, by - bh * .2, bl * .45, bh * 1.1, c.mane); }, Math.max(3, S / 10), { vbias: .2 }));
  if (c.stripe) for (let i = 0; i < 3; i++) sp.line(cx - bl * .5 + i * bl * .45, by - bh * .9, cx - bl * .5 + i * bl * .45 + 2, by - bh * .1, c.stripe, 1);
  put(sp, leg(cx - bl * .35, PI, true)); put(sp, leg(cx + bl * .8, 0, true));
  // head
  const hx = cx + bl * .95 + A.fw * .4, hy = by - bh * .75 + bob * .5 - (A.wind ? A.wind * u : 0), jaw = A.open * 3 * u;
  put(sp, layerOf(S, s => {
    s.ell(hx, hy, S * .13, S * .115, c.a); s.ell(hx + S * .11, hy + S * .03, S * .085, S * .06, c.snout || c.b || c.a);
    s.poly([[hx - S * .05, hy - S * .08], [hx - S * .02, hy - S * .2 - (c.bigEar ? 4 * u : 0)], [hx + S * .05, hy - S * .09]], c.a);
    s.poly([[hx + S * .03, hy - S * .08], [hx + S * .08, hy - S * .18 - (c.bigEar ? 3 * u : 0)], [hx + S * .11, hy - S * .06]], c.b || c.a);
    if (c.horn) s.poly([[hx + S * .02, hy - S * .1], [hx + S * .05, hy - S * .27], [hx + S * .09, hy - S * .1]], c.horn);
  }, 3));
  if (jaw > .5) { put(sp, layerOf(S, s => { s.ell(hx + S * .1, hy + S * .08 + jaw, S * .07, S * .035, c.b || c.a); }, 1)); sp.rect(hx + S * .08, hy + S * .06, 3, 3 + jaw, '#6a1030'); }
  sp.px(hx + S * .17, hy + S * .01, '#1a1020'); sp.px(hx + S * .17 + 1, hy + S * .01, '#1a1020');
  eyes(sp, hx + S * .02, hy - S * .04, Math.round(S * .075), c.eye || '#ffe14d', { big: 2, angry: true, pupil: 1 });
  if (c.fang || A.open) { sp.px(hx + S * .13, hy + S * .08, '#ffffff'); sp.px(hx + S * .17, hy + S * .08, '#ffffff'); }
  if (c.crystals) put(sp, layerOf(S, s => { for (let i = 0; i < 4; i++) s.poly([[cx - bl * .6 + i * bl * .38 - 2, by - bh * .8], [cx - bl * .6 + i * bl * .38 + 1, by - bh * 1.9 - (i % 2) * 3], [cx - bl * .6 + i * bl * .38 + 4, by - bh * .8]], c.crystals); }, 2));
};

PLANS.humanoid = (sp, p) => {
  const { S, u, c } = p, A = atk(p), bob = Math.round(.5 + .5 * sin(p.t * PI * 2 - 1)), cx = S * .5 + A.fw * .6, gy = S - 3 * u;
  const k = Math.min((c.k || 1) * 1.2, (S - 8) / (33 * u)), ty = gy - 26 * u * k + bob * .8 - A.wind * 1.2 * u + A.up;
  const hov = c.float ? 3 * u + sin(p.t * PI * 2) * 2 * u : 0, T = ty - hov;
  const skin = c.skin || '#f0c8a0', cloth = c.cloth || '#555', armor = c.armor || cloth;
  const wob = sin(p.t * PI * 2 + .5);
  // wings
  if (c.wings) { const fl = sin(p.t * PI * 2) * 5 * u, col = c.wingC || '#6a2a8a'; put(sp, layerOf(S, s => { for (const sd of [-1]) { s.poly([[cx - 4 * u, T + 8 * u], [cx - 16 * u * k, T - 8 * u + fl], [cx - 12 * u * k, T + 4 * u + fl], [cx - 20 * u * k, T + 2 * u + fl], [cx - 10 * u * k, T + 14 * u], [cx - 4 * u, T + 14 * u]], col); } }, 2)); }
  if (c.cape) put(sp, layerOf(S, s => { s.poly([[cx - 6 * u * k, T + 6 * u], [cx + 2 * u, T + 6 * u], [cx - 3 * u * k - 4 * u * wob, gy - 2 * u], [cx - 12 * u * k - 3 * u * wob, gy - 3 * u]], c.cape); }, 3));
  const sh = [cx + 4 * u * k, T + 9 * u * k], shB = [cx - 6 * u * k, T + 9 * u * k];
  // far arm
  const armD = (S0, H0, col, hand, bend) => layerOf(S, s => { const q = ik(S0[0], S0[1], H0[0], H0[1], 7 * u * k, 7 * u * k, bend); s.cap(S0[0], S0[1], q.ex, q.ey, 2.7 * u * k, 2.3 * u * k, col); s.cap(q.ex, q.ey, q.hx, q.hy, 2.3 * u * k, 2 * u * k, c.glove || col); s.ell(q.hx, q.hy, 2.5 * u * k, 2.5 * u * k, hand); }, 2);
  const hF = [cx + (9 + A.fw * .1) * u * k + (A.hit ? 6 * u : 0), T + (17 - (A.wind ? A.wind * 12 : 0) + (A.hit ? -3 : 0)) * u * k], hB = [cx - 8 * u * k, T + 19 * u * k];
  put(sp, armD(shB, hB, cloth, c.glove || skin, -1));
  // legs
  const leg = (x, ph) => layerOf(S, s => { const sw = sin(p.t * PI * 2 + ph) * u * .8; s.cap(x, T + 20 * u * k, x + sw, gy - 3 * u, 3.2 * u * k, 2.7 * u * k, c.pants || cloth); s.ell(x + sw + 1.5 * u, gy - 1.4 * u, 4.3 * u * k, 2.5 * u * k, c.boots || '#3a2a2a'); }, 2);
  if (!c.float) { put(sp, leg(cx - 3 * u * k, 0)); put(sp, leg(cx + 3 * u * k, PI)); }
  else put(sp, layerOf(S, s => { s.poly([[cx - 6 * u * k, T + 18 * u], [cx + 6 * u * k, T + 18 * u], [cx + 1 * u, gy - 6 * u + 3 * sin(p.t * 6.28)], [cx - 2 * u, gy - 2 * u + 2 * sin(p.t * 6.28 + 1)]], c.ghostly || cloth); }, 3));
  // torso
  put(sp, layerOf(S, s => {
    if (c.robe) s.poly([[cx - 7 * u * k, T + 8 * u], [cx + 7 * u * k, T + 8 * u], [cx + 10 * u * k, gy - 4 * u], [cx - 10 * u * k, gy - 4 * u]], cloth);
    else { s.ell(cx, T + 14 * u * k, 8 * u * k, 8 * u * k, armor); s.rect(cx - 7 * u * k, T + 19 * u * k, 14 * u * k, 3 * u, c.belt || '#4a3a2a'); if (c.chest) s.ell(cx, T + 12 * u * k, 3.2 * u * k, 3 * u * k, c.chest); }
    if (c.pauldron) { s.ell(cx + 6 * u * k, T + 9 * u * k, 4.2 * u * k, 3.4 * u * k, c.pauldron); s.ell(cx - 6 * u * k, T + 9 * u * k, 4.2 * u * k, 3.4 * u * k, c.pauldron); }
  }, 3));
  // head
  const hx = cx + 1 * u, hy = T + 2 * u * k, hr = (c.headR || 9) * u * k;
  put(sp, layerOf(S, s => { if (c.head === 'skull' || c.head === 'ghost' || c.head === 'bare' || !c.head || c.head === 'horn' || c.head === 'crown' || c.head === 'hood') s.ell(hx, hy, hr, hr * .92, c.head === 'skull' ? '#efe6d2' : skin); if (c.head === 'helm') { s.ell(hx, hy, hr * 1.02, hr, c.helm || armor); } }, 4));
  if (c.head === 'hood') put(sp, layerOf(S, s => { s.ell(hx - 1 * u, hy - 1 * u, hr * 1.2, hr * 1.1, c.hood || cloth); }, 3));
  if (c.hair) put(sp, layerOf(S, s => { s.ell(hx - 1 * u, hy - 6.5 * u, hr * 1.04, hr * .5, c.hair); if (c.hairLong) s.cap(hx - hr, hy, hx - hr - 2 * u - wob * u, hy + 16 * u, 4 * u, 2 * u, c.hair); }, 3), { rim: false });
  // face
  if (c.head === 'helm') { sp.rect(hx - hr * .1, hy - 1.5 * u, hr * .9, 2 * u, '#0a0510'); glowEye(sp, hx + hr * .45, hy - .5 * u, c.eye || '#ff5a3a', 1); sp.vline(hx + hr * .5, hy - 6 * u, 5 * u, c.helm2 || '#cfd6e6'); }
  else if (c.head === 'hood') { sp.rect(hx - hr * .2, hy - 2 * u, hr * 1.1, hr * .9, '#0a0510'); glowEye(sp, hx + hr * .15, hy - .5 * u, c.eye || '#ff3a3a', 1); glowEye(sp, hx + hr * .65, hy - .5 * u, c.eye || '#ff3a3a', 1); }
  else if (c.head === 'skull') { sp.rect(hx - hr * .1, hy - 2 * u, 3 * u, 3 * u, '#14101c'); sp.rect(hx + hr * .45, hy - 2 * u, 3 * u, 3 * u, '#14101c'); sp.px(hx, hy - u, c.eye || '#6aff9a'); sp.px(hx + hr * .55, hy - u, c.eye || '#6aff9a'); sp.rect(hx + hr * .05, hy + 3 * u, hr * .8, 2 * u, '#14101c'); for (let i = 0; i < 4; i++) sp.vline(hx + hr * .1 + i * 2 * u, hy + 3 * u, 2 * u, '#efe6d2'); }
  else { eyes(sp, hx - hr * .05, hy - u, Math.round(hr * .5), c.eye || '#ff5a3a', { big: 2, angry: true }); if (A.open > .3 || c.fangs) { sp.rect(hx + hr * .1, hy + 4 * u, hr * .6, 2 * u, '#5a1020'); sp.px(hx + hr * .12, hy + 4 * u, '#fff'); sp.px(hx + hr * .6, hy + 4 * u, '#fff'); } else sp.hline(hx + hr * .1, hy + 4 * u, hr * .5, '#4a2030'); }
  if (c.head === 'horn') put(sp, layerOf(S, s => { s.poly([[hx - 4 * u, hy - 6 * u], [hx - 7 * u, hy - 15 * u], [hx - 1 * u, hy - 7 * u]], c.horn || '#e8dcc0'); s.poly([[hx + 4 * u, hy - 6 * u], [hx + 8 * u, hy - 15 * u], [hx + 6 * u, hy - 5 * u]], c.horn || '#e8dcc0'); }, 2));
  if (c.head === 'crown') put(sp, layerOf(S, s => { s.rect(hx - 6 * u, hy - 9 * u, 12 * u, 3 * u, '#f2c14e'); for (let i = 0; i < 4; i++)s.poly([[hx - 6 * u + i * 4 * u, hy - 9 * u], [hx - 4 * u + i * 4 * u, hy - 14 * u], [hx - 2 * u + i * 4 * u, hy - 9 * u]], '#f2c14e'); }, 1));
  if (c.crest) put(sp, layerOf(S, s => { s.poly([[hx - 2 * u, hy - 8 * u], [hx + 2 * u + wob, hy - 17 * u], [hx + 5 * u, hy - 8 * u]], c.crest); }, 1));
  if (c.ears) put(sp, layerOf(S, s => { s.poly([[hx - hr * .8, hy - 2 * u], [hx - hr * 1.4, hy - 6 * u], [hx - hr * .6, hy - 5 * u]], skin); }, 1));
  // weapon + front arm
  const W = c.weapon, wx = hF[0], wy = hF[1];
  const ang = A.hit ? 80 : A.wind ? -40 : 18 + wob * 4;
  const wcol = c.wc || '#cfd9e8';
  const weapon = () => layerOf(S, s => {
    const a = ang * PI / 180, X = (lx, ly) => [wx + lx * cos(a) - ly * sin(a), wy + lx * sin(a) + ly * cos(a)];
    const P = (pts, col) => s.poly(pts.map(q => X(q[0] * u, q[1] * u)), col);
    if (W === 'sword' || W === 'greatsword') { const L = (W === 'greatsword' ? 24 : 17) * k; P([[-2, -3], [2, -3], [2, -L], [0, -L - 3], [-2, -L]], wcol); P([[-5, -3], [5, -3], [5, -1], [-5, -1]], c.wg || '#8a6a2a'); P([[-1, -1], [1, -1], [1, 6], [-1, 6]], '#4a2a1a'); }
    else if (W === 'club' || W === 'axe') { P([[-1, 6], [1, 6], [1, -14], [-1, -14]], '#6a4a2a'); if (W === 'club') { P([[-4, -10], [4, -10], [5, -20], [-5, -20]], c.wc || '#8a6a3a'); } else { P([[1, -14], [9, -18], [9, -6], [1, -9]], wcol); P([[-1, -14], [-8, -18], [-8, -7], [-1, -9]], wcol); } }
    else if (W === 'staff') { P([[-1, 10], [1, 10], [1, -18], [-1, -18]], '#6a4a2a'); const q = X(0, -20 * u); s.ell(q[0], q[1], 4 * u, 4 * u, c.orb || '#a45cf0'); }
    else if (W === 'dagger') { P([[-1.5, -2], [1.5, -2], [0, -12]], wcol); P([[-3, -2], [3, -2], [3, 0], [-3, 0]], '#8a6a2a'); }
    else if (W === 'scythe') { P([[-1, 10], [1, 10], [1, -22], [-1, -22]], '#4a3a3a'); P([[0, -22], [12, -20], [16, -10], [10, -15], [0, -17]], wcol); }
    else if (W === 'spear') { P([[-1, 12], [1, 12], [1, -20], [-1, -20]], '#6a4a2a'); P([[-2.5, -20], [2.5, -20], [0, -30]], wcol); }
  }, 2);
  if (W && !c.weaponBack) put(sp, armD(sh, hF, cloth, c.glove || skin, 1)), put(sp, weapon());
  else put(sp, armD(sh, hF, cloth, c.glove || skin, 1));
  if (c.aura) { sp.halo(cx, T + 16 * u * k, 17 * u * k, c.aura, .16 + .06 * sin(p.t * 6.28), 3); }
};

PLANS.mushroom = (sp, p) => {
  const { S, u, c } = p, A = atk(p), bob = sin(p.t * PI * 2), cx = S / 2 + A.fw * .6, gy = S - 3 * u + A.up;
  const sq = 1 - A.wind * .15 + .03 * bob, cy = gy - S * .22 * sq;
  put(sp, layerOf(S, s => { s.cap(cx - 4 * u, gy - 2 * u, cx - 4 * u, cy, 4 * u, 5 * u, c.b || '#f3ead0'); s.cap(cx + 4 * u, gy - 2 * u, cx + 4 * u + sin(p.t * 6.28) * u, cy, 4 * u, 5 * u, c.b || '#f3ead0'); s.ell(cx, cy + 2 * u, 9 * u, 8 * u, c.b || '#f3ead0'); s.ell(cx - 5 * u, gy - 2 * u, 3 * u, 2 * u, c.b || '#f3ead0'); s.ell(cx + 6 * u, gy - 2 * u, 3 * u, 2 * u, c.b || '#f3ead0'); }, 3));
  eyes(sp, cx - 4 * u, cy + 1 * u, Math.round(6 * u), '#1a1020', { big: 2, pupil: 0, angry: true });
  if (A.open > .3) sp.rect(cx - u, cy + 6 * u, 4 * u, 3 * u, '#5a1020'); else sp.hline(cx - u, cy + 6 * u, 3 * u, '#6a4a3a');
  const capW = S * .34 * (1 + A.hit * .08), capH = S * .2 * sq;
  put(sp, layerOf(S, s => { s.ell(cx, cy - 4 * u - (A.wind * 2 * u), capW, capH, c.a); s.rect(cx - capW, cy - 4 * u, capW * 2, 3 * u, c.a2 || c.a); }, Math.max(3, S / 9), { vbias: .2 }));
  for (const [dx, dy, r] of [[-.45, -.55, 3], [.15, -.85, 3.5], [.5, -.4, 2.5], [-.1, -.35, 2]]) sp.ell(cx + capW * dx, cy - 4 * u + capH * dy, r * u, r * u * .8, c.spot || '#f4f0e0');
  if (A.hit) for (let i = 0; i < 5; i++) sp.px(cx + (i - 2) * 4 * u, cy - capH - 8 * u - i % 2 * 3, c.spore || '#9aff8a');
  else if (c.spore) for (let i = 0; i < 3; i++) sp.px(cx - 8 * u + i * 8 * u, cy - capH - 4 * u - ((p.t * 3 + i * .33) % 1) * 6, c.spore);
};

PLANS.treant = (sp, p) => {
  const { S, u, c } = p, A = atk(p), cx = S / 2 + A.fw * .5, gy = S - 3 * u, sw = sin(p.t * PI * 2);
  put(sp, layerOf(S, s => { s.poly([[cx - 11 * u, gy], [cx + 11 * u, gy], [cx + 8 * u, gy - 14 * u], [cx + 9 * u, gy - 28 * u], [cx - 9 * u, gy - 28 * u], [cx - 8 * u, gy - 14 * u]], c.a); for (const x of [-12, -7, 7, 12]) s.cap(cx + x * u, gy - 4 * u, cx + (x * 1.3) * u, gy, 2.5 * u, 1.2 * u, c.a); }, 4));
  for (let i = 0; i < 5; i++) sp.vline(cx - 6 * u + i * 3 * u, gy - 24 * u, 14 * u, PX.alpha(c.dark || '#2a1a10', .45));
  eyes(sp, cx - 3 * u, gy - 20 * u, Math.round(6 * u), c.eye || '#ffe14d', { big: 3, angry: true }); sp.rect(cx - 2 * u, gy - 13 * u, 7 * u, A.open > .3 ? 5 * u : 2 * u, '#1a0a05');
  const arm = (x0, ph, fw) => layerOf(S, s => { const w = sin(p.t * 6.28 + ph) * 2 * u; s.cap(cx + x0 * u, gy - 20 * u, cx + (x0 * 1.9 + fw) * u, gy - 14 * u + w - (A.wind ? 8 * u : 0) + (A.hit ? 5 * u : 0), 3 * u, 2 * u, c.a); for (let i = 0; i < 3; i++) s.cap(cx + (x0 * 1.9 + fw) * u, gy - 14 * u + w, cx + (x0 * 1.9 + fw + 3) * u, gy - 20 * u + w + i * 4 * u, 1.3 * u, .8 * u, c.a); }, 2);
  put(sp, arm(-9, 1, -2)); put(sp, arm(9, 0, 5 + A.fw * .6));
  put(sp, layerOf(S, s => { for (const [x, y, r] of [[-9, -34, 9], [0, -39, 11], [9, -33, 9], [-3, -31, 8]]) s.ell(cx + x * u * (1 + sw * .03), gy + y * u * .8 + 0, r * u, r * u * .85, c.leaf || '#4aa84a'); }, 4, { dither: true }));
  if (c.leaf2) for (let i = 0; i < 4; i++) sp.px(cx - 14 * u + i * 8 * u, gy - 24 * u + ((p.t + i * .25) % 1) * 20 * u, c.leaf2);
};

PLANS.wisp = (sp, p) => {   // cute ghost / spirit with scalloped hem
  const { S, u, c } = p, A = atk(p), bob = sin(p.t * PI * 2) * 2 * u, cx = S / 2 + A.fw * .8, R = S * .21, top = S * .16 + bob + A.up, al = c.alpha || 1;
  const fin = (L, a) => { if (L && al < 1) L.s.alphaMul(a); return L; };
  put(sp, fin(layerOf(S, s => {
    s.ell(cx, top + R, R, R, c.a); s.rect(cx - R, top + R, R * 2, R * .95, c.a);
    for (let i = 0; i < 4; i++) { const x = cx - R * .75 + i * R * .5; s.ell(x, top + R * 1.95 + sin(p.t * 6.28 + i * 1.3) * 1.8 * u, R * .27, R * .42, c.a); }
  }, 4, { vbias: .1 }), al + .1), { rim: al >= 1 });
  const hit = A.hit ? 5 * u : 0, up = A.wind ? -7 * u * A.wind : 0;
  put(sp, fin(layerOf(S, s => { s.cap(cx + R * .8, top + R * 1.25, cx + R * 1.5 + A.fw * .5 + hit, top + R * 1.4 + up + hit * .5, 3 * u, 2.2 * u, c.a); s.cap(cx - R * .8, top + R * 1.25, cx - R * 1.25, top + R * 1.6 + sin(p.t * 6.28) * u, 3 * u, 2.2 * u, c.a); }, 2), al + .15), { rim: al >= 1 });
  eyes(sp, cx - R * .1, top + R * .85, Math.round(R * .62), c.eye || '#14101c', { big: Math.max(2, Math.round(S / 16)), angry: A.hit });
  if (c.eye === '#ffffff' || (c.alpha && c.eye)) { /* glowing eyes read on pale ghosts */ }
  sp.ell(cx + R * .3, top + R * 1.45, 2.4 * u, A.open > .3 ? 3.2 * u : 1.6 * u, '#14101c');
  if (c.hat) put(sp, layerOf(S, s => { s.rect(cx - R * .8, top - 1 * u, R * 1.6, 3 * u, '#1a1a2a'); s.rect(cx - R * .5, top - 5 * u, R * 1.0, 5 * u, '#1a1a2a'); s.rect(cx - R * .5, top - 2 * u, R * 1.0, u, '#ffd24a'); }, 1));
  for (let i = 0; i < 4; i++) { const a = p.t * 6.28 + i * 1.6; sp.px(cx + cos(a) * S * .34, top + R + sin(a) * S * .25, c.spark || '#ffffff'); }
  if (c.wings) { const fl = sin(p.t * 6.28) * 5 * u; put(sp, layerOf(S, s => { s.poly([[cx - R * .6, top + R], [cx - R * 2.1, top - R * .2 + fl], [cx - R * 1.5, top + R * 1.1], [cx - R * 2.2, top + R * 1.5 + fl]], c.wingC || c.a); }, 2)); }
};

PLANS.golem = (sp, p) => {
  const { S, u, c } = p, A = atk(p), bob = Math.round(.5 + .5 * sin(p.t * PI * 2)), cx = S / 2 + A.fw * .5, gy = S - 3 * u, sc = c.k || 1;
  const ty = gy - 30 * u * sc - bob * .6 - A.wind * 2 * u + A.up;
  const rock = (s, x, y, w, h, col) => { s.poly([[x - w, y - h * .4], [x - w * .5, y - h], [x + w * .6, y - h * .9], [x + w, y - h * .2], [x + w * .8, y + h * .6], [x - w * .6, y + h * .8]], col); };
  const fist = (x, y, col) => layerOf(S, s => rock(s, x, y, 5.5 * u * sc, 5 * u * sc, col), 2);
  put(sp, layerOf(S, s => { s.cap(cx - 8 * u * sc, ty + 14 * u * sc, cx - 12 * u * sc, gy - 12 * u, 4 * u * sc, 4 * u * sc, c.b || c.a); }, 2)); put(sp, fist(cx - 12 * u * sc, gy - 9 * u * sc + bob, c.b || c.a));
  put(sp, layerOf(S, s => { rock(s, cx - 5 * u * sc, gy - 8 * u, 6 * u * sc, 8 * u, c.b || c.a); rock(s, cx + 6 * u * sc, gy - 8 * u, 6 * u * sc, 8 * u, c.b || c.a); }, 2));
  put(sp, layerOf(S, s => { rock(s, cx, ty + 17 * u * sc, 12 * u * sc, 14 * u * sc, c.a); }, 4, { dither: !!c.dither }));
  put(sp, layerOf(S, s => { rock(s, cx + 1 * u, ty + 5 * u * sc, 8 * u * sc, 8 * u * sc, c.a); }, 3));
  const cy = ty + 5 * u * sc; sp.rect(cx - 3 * u, cy - u, 8 * u, 2 * u, '#120a18'); glowEye(sp, cx - 1 * u, cy, c.eye || '#ff7a2a', 1); glowEye(sp, cx + 4 * u, cy, c.eye || '#ff7a2a', 1);
  const cor = ty + 18 * u * sc; sp.glow(cx, cor, 6 * u + sin(p.t * 6.28) * u, c.core || c.eye || '#ff7a2a', .8); sp.ell(cx, cor, 2.4 * u, 2.4 * u, '#ffffff');
  const hy = ty + 15 * u * sc + (A.hit ? 6 * u : 0) - (A.wind ? 10 * u : 0);
  put(sp, layerOf(S, s => { s.cap(cx + 9 * u * sc, ty + 12 * u * sc, cx + 14 * u * sc + A.fw * .4, hy, 4 * u * sc, 4 * u * sc, c.a); }, 2)); put(sp, fist(cx + 15 * u * sc + A.fw * .4, hy + 2 * u, c.b || c.a));
  if (c.crystals) put(sp, layerOf(S, s => { for (let i = 0; i < 5; i++) s.poly([[cx - 9 * u * sc + i * 4.5 * u * sc, ty + 8 * u * sc], [cx - 8 * u * sc + i * 4.5 * u * sc, ty - (6 + (i % 2) * 6) * u * sc], [cx - 5 * u * sc + i * 4.5 * u * sc, ty + 9 * u * sc]], c.crystals); }, 2));
  if (c.moss) for (let i = 0; i < 6; i++) sp.rect(cx - 10 * u + i * 4 * u, ty + 12 * u * sc + (i % 3) * 3 * u, 3 * u, 2 * u, c.moss);
  if (c.crown) put(sp, layerOf(S, s => { s.rect(cx - 6 * u, ty - 4 * u * sc, 14 * u, 3 * u, '#f2c14e'); for (let i = 0; i < 4; i++) s.poly([[cx - 6 * u + i * 4 * u, ty - 4 * u * sc], [cx - 4 * u + i * 4 * u, ty - 9 * u * sc], [cx - 2 * u + i * 4 * u, ty - 4 * u * sc]], '#f2c14e'); }, 1));
  if (A.hit) for (let i = 0; i < 6; i++) sp.px(cx + 10 * u + i * 3, gy - 2 - (i % 3), c.dust || '#d8c8a0');
};

PLANS.bat = (sp, p) => {
  const { S, u, c } = p, A = atk(p), fl = sin(p.t * PI * 4), cx = S / 2 + A.fw * 1.1, cy = S * .45 + sin(p.t * PI * 2) * 2 * u + A.up * 2;
  const wing = sd => layerOf(S, s => { const x = cx + sd * 4 * u; s.poly([[x, cy - 2 * u], [x + sd * 14 * u, cy - 12 * u - fl * 8 * u], [x + sd * 20 * u, cy - 2 * u - fl * 5 * u], [x + sd * 15 * u, cy + 1 * u - fl * 3 * u], [x + sd * 11 * u, cy + 5 * u - fl * 2 * u], [x + sd * 7 * u, cy + 3 * u]], c.b || c.a); }, 2);
  put(sp, wing(-1)); put(sp, layerOf(S, s => { s.ell(cx, cy + 3 * u, 6 * u, 7 * u, c.a); s.ell(cx + 1 * u, cy - 5 * u, 6 * u, 5.5 * u, c.a); s.poly([[cx - 4 * u, cy - 8 * u], [cx - 5 * u, cy - 15 * u], [cx - 1 * u, cy - 9 * u]], c.a); s.poly([[cx + 3 * u, cy - 9 * u], [cx + 6 * u, cy - 15 * u], [cx + 7 * u, cy - 8 * u]], c.a); }, 3)); put(sp, wing(1));
  eyes(sp, cx - 1 * u, cy - 5 * u, Math.round(5 * u), c.eye || '#ff4a4a', { big: 2, angry: true }); if (A.open > .3 || c.fang) { sp.px(cx + 1 * u, cy - 1 * u, '#fff'); sp.px(cx + 4 * u, cy - 1 * u, '#fff'); sp.rect(cx + 1 * u, cy - 2 * u, 4 * u, 2 * u, '#5a1020'); }
};

PLANS.arthropod = (sp, p) => {    // scorpion / spider
  const { S, c } = p, u = p.u * 1.3, A = atk(p), cx = S * .46 + A.fw, gy = S - 3 * u, bob = sin(p.t * PI * 4) * u * .5, spider = c.spider;
  const by = gy - (spider ? 12 : 8) * u + bob;
  const legs = (back) => layerOf(S, s => {
    const n = spider ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const bx = cx - 6 * u + i * (spider ? 4.4 : 5) * u + (back ? 2 * u : 0), ph = sin(p.t * 6.28 + i * 1.3 + (back ? 1.7 : 0)) * 1.2 * u, dir = (i - (n - 1) / 2) * (spider ? 6.5 : 4.5) * u;
      const kx = bx + dir * .8 + ph, ky = by - (spider ? 10 : 6) * u, fx = bx + dir * 1.9 + ph, fy = gy - u;
      s.cap(bx, by, kx, ky, 1.5 * u, 1.2 * u, c.b || c.a); s.cap(kx, ky, fx, fy, 1.2 * u, .9 * u, c.b || c.a);
    }
  }, 1);
  put(sp, legs(true));
  if (!spider) { const st = sin(p.t * 6.28) * 2 * u + (A.hit ? 6 * u : 0) - A.wind * 4 * u; put(sp, layerOf(S, s => { s.cap(cx - 11 * u, by - 1 * u, cx - 17 * u, by - 9 * u, 3 * u, 2.4 * u, c.a); s.cap(cx - 17 * u, by - 9 * u, cx - 14 * u + st, by - 17 * u, 2.4 * u, 2 * u, c.a); s.poly([[cx - 16 * u + st, by - 16 * u], [cx - 10 * u + st, by - 17 * u], [cx - 11 * u + st, by - 12 * u]], c.sting || '#ff4a3a'); }, 2)); }
  put(sp, layerOf(S, s => { s.ell(cx, by, spider ? 8 * u : 11 * u, spider ? 7 * u : 6 * u, c.a); if (spider) s.ell(cx + 10 * u, by - 1 * u, 5 * u, 4.5 * u, c.b || c.a); else s.ell(cx + 10 * u, by, 5.5 * u, 4.5 * u, c.b || c.a); }, 3));
  const cl = layerOf(S, s => { const o = A.hit ? 6 * u : 0 - A.wind * 3 * u; for (const sy of [-3, 4]) { s.cap(cx + 12 * u, by + sy * u, cx + 19 * u + o, by + sy * u - 2 * u, 2 * u, 1.6 * u, c.a); s.poly([[cx + 19 * u + o, by + sy * u - 5 * u], [cx + 26 * u + o, by + sy * u - 2 * u], [cx + 19 * u + o, by + sy * u + 1 * u]], c.claw || c.a); } }, 2); if (!spider) put(sp, cl);
  if (spider && c.stripe) { sp.ell(cx, by, 3 * u, 2 * u, c.stripe); }
  put(sp, legs(false));
  eyes(sp, cx + 8 * u, by - 3 * u, Math.round(3 * u), c.eye || '#ff3a3a', { big: 2 }); if (spider) { sp.px(cx + 10 * u, by - 5 * u, c.eye || '#ff3a3a'); sp.px(cx + 13 * u, by - 5 * u, c.eye || '#ff3a3a'); }
  if (A.open > .3 && spider) sp.rect(cx + 12 * u, by + 1 * u, 4 * u, 2 * u, '#ffe14d');
};

PLANS.serpent = (sp, p) => {   // snake, or naga (with torso)
  const { S, u, c } = p, A = atk(p), gy = S - 3 * u, cx = S * .42 + A.fw * .6, n = 20, lift = c.naga ? 12 : 17;
  const seg = f => { const k = f * f * (3 - 2 * f); return [cx - 13 * u + f * 24 * u + sin(f * Math.PI * 2.4 - p.t * 6.28) * 5.5 * u * (1 - f * .35), gy - 4 * u - k * (c.naga ? 12 : 24) * u]; };
  put(sp, layerOf(S, s => { for (let i = 0; i < n; i++) { const f = i / n, [x, y] = seg(f), r = (c.naga ? 7.5 : 5.6) * u * (.55 + .45 * sin(Math.min(1, f * 1.15 + .1) * Math.PI * .95)); s.ell(x, y, r, r * .92, i % 4 < 2 && c.b ? c.b : c.a); } }, 4, { dither: true }));
  const [bx, by] = seg(1), lean = A.hit ? 7 * u : -A.wind * 3 * u;
  if (c.naga) {
    put(sp, layerOf(S, s => { s.ell(bx + lean * .5, by - 8 * u, 7 * u, 8 * u, c.cloth || c.b); s.ell(bx + 1 * u + lean, by - 19 * u, 7 * u, 6.5 * u, c.skin || '#c8e0f0'); s.ell(bx + lean * .5 - 1 * u, by - 21 * u, 8.5 * u, 7 * u, c.hair || '#2a6aa8'); s.cap(bx - 6 * u, by - 18 * u, bx - 9 * u - sin(p.t * 6.28) * 2 * u, by - 4 * u, 3.5 * u, 2 * u, c.hair || '#2a6aa8'); }, 3));
    eyes(sp, bx + lean - u, by - 19 * u, Math.round(4 * u), c.eye || '#4affff', { big: 2 }); sp.hline(bx + 2 * u + lean, by - 15 * u, 3 * u, '#8a2a4a');
    put(sp, layerOf(S, s => { s.cap(bx + 5 * u, by - 12 * u, bx + 12 * u + lean, by - 14 * u + (A.hit ? 4 * u : 0), 2.2 * u, 2 * u, c.skin || '#c8e0f0'); s.cap(bx - 5 * u, by - 12 * u, bx - 9 * u, by - 7 * u, 2.2 * u, 2 * u, c.skin || '#c8e0f0'); }, 2));
    if (c.crown) put(sp, layerOf(S, s => { s.rect(bx - 5 * u + lean, by - 28 * u, 12 * u, 3 * u, '#a8f0ff'); for (let i = 0; i < 3; i++) s.poly([[bx - 5 * u + lean + i * 4 * u, by - 28 * u], [bx - 3 * u + lean + i * 4 * u, by - 34 * u], [bx - 1 * u + lean + i * 4 * u, by - 28 * u]], '#a8f0ff'); }, 1));
  } else {
    put(sp, layerOf(S, s => { if (c.hood) s.poly([[bx - 6 * u + lean, by + 1 * u], [bx + 1 * u + lean, by - 15 * u], [bx + 9 * u + lean, by + 1 * u]], c.hood); s.ell(bx + 3 * u + lean, by - 3 * u, 7 * u, 5.6 * u, c.a); s.ell(bx + 9 * u + lean, by - 1 * u, 5 * u, 3.6 * u, c.b || c.a); }, 3));
    eyes(sp, bx + 3 * u + lean, by - 5 * u, Math.round(4 * u), c.eye || '#ffe14d', { big: 2, angry: true });
    if (A.open > .3) { sp.rect(bx + 11 * u + lean, by - 1 * u, 5 * u, 3 * u, '#5a1020'); sp.px(bx + 12 * u + lean, by + 2 * u, '#fff'); sp.px(bx + 15 * u + lean, by + 2 * u, '#fff'); } else if (p.t % .5 < .15) sp.line(bx + 13 * u + lean, by, bx + 18 * u + lean, by, '#ff4a6a', 1);
  }
};

PLANS.dragon = (sp, p) => {
  const { S, u, c } = p, A = atk(p), bob = sin(p.t * PI * 2), fl = sin(p.t * PI * 2), cx = S * .46 + A.fw * .5, gy = S - 3 * u, bh = S * .17, by = gy - S * .24 + bob * u * .8 - A.wind * 2 * u, bl = S * .26;
  // far wing
  const wing = (flap, far) => layerOf(S, s => { const ox = cx - bl * .2, oy = by - bh * .6; s.poly([[ox, oy], [ox - S * .12, oy - S * .3 - flap * S * .14], [ox - S * .05, oy - S * .1 - flap * S * .05], [ox - S * .24, oy - S * .16 - flap * S * .1], [ox - S * .12, oy + S * .02], [ox - S * .26, oy + S * .06 - flap * S * .06], [ox - S * .02, oy + S * .1]], far ? (c.wing2 || c.b) : (c.wing || c.b)); }, 2);
  if (!c.noWings) put(sp, wing(fl * .6, true));
  // tail
  put(sp, layerOf(S, s => { const sw = sin(p.t * PI * 2) * 2 * u; s.cap(cx - bl * .8, by, cx - bl * 1.35, by + bh * .1 + sw, bh * .75, bh * .45, c.a); s.cap(cx - bl * 1.35, by + bh * .1 + sw, cx - bl * 1.8, by - bh * .6 + sw * 2, bh * .45, bh * .12, c.a); if (c.tailSpike) s.poly([[cx - bl * 1.8, by - bh * .9 + sw * 2], [cx - bl * 2.05, by - bh * 1.2 + sw * 2], [cx - bl * 1.75, by - bh * .3 + sw * 2]], c.tailSpike); }, 3));
  const leg = (x, ph, far) => layerOf(S, s => { const sw = sin(p.t * 6.28 + ph) * u; s.cap(x, by + bh * .5, x + sw, gy - 4 * u, bh * .5, bh * .36, far ? (c.b || c.a) : c.a); s.ell(x + sw + 2 * u, gy - 1.5 * u, bh * .55, 2.4 * u, c.claw || c.b || c.a); for (let i = 0; i < 3; i++) s.px(x + sw + 3 * u + i * 2, gy - u, c.claw2 || '#fff'); }, 2);
  put(sp, leg(cx - bl * .5, 0, true)); put(sp, leg(cx + bl * .45, PI, true));
  put(sp, layerOf(S, s => { s.ell(cx, by, bl, bh, c.a); s.ell(cx + bl * .1, by + bh * .55, bl * .85, bh * .5, c.belly || c.b || c.a); }, Math.max(3, S / 10), { vbias: .25 }));
  if (c.spines) put(sp, layerOf(S, s => { for (let i = 0; i < 6; i++) s.poly([[cx - bl * .8 + i * bl * .3, by - bh * .9], [cx - bl * .72 + i * bl * .3, by - bh * 1.4 - (i % 2) * 2 * u], [cx - bl * .6 + i * bl * .3, by - bh * .9]], c.spines); }, 1));
  put(sp, leg(cx - bl * .3, PI, false)); put(sp, leg(cx + bl * .72, 0, false));
  if (!c.noWings) put(sp, wing(-fl * .6 + .2, false));
  // neck + head
  const nx = cx + bl * .85, ny = by - bh * .55, hx = nx + S * .11 + A.fw * .5 + (A.wind ? -3 * u : 0), hy = ny - S * .13 - (A.wind ? 2 * u * A.wind : 0) + (A.hit ? 4 * u : 0) + bob * .5, jaw = A.open * 4 * u;
  put(sp, layerOf(S, s => { s.cap(cx + bl * .5, by - bh * .2, nx + S * .05, ny - S * .05, bh * .62, bh * .45, c.a); }, 3));
  put(sp, layerOf(S, s => { s.ell(hx, hy, S * .105, S * .09, c.a); s.ell(hx + S * .1, hy + S * .02, S * .085, S * .05, c.snout || c.a); s.poly([[hx - S * .07, hy - S * .05], [hx - S * .15, hy - S * .2], [hx - S * .02, hy - S * .08]], c.horn || '#f2e8c8'); s.poly([[hx - S * .01, hy - S * .08], [hx - S * .04, hy - S * .22], [hx + S * .05, hy - S * .08]], c.horn || '#f2e8c8'); }, 3));
  put(sp, layerOf(S, s => { s.ell(hx + S * .09, hy + S * .06 + jaw, S * .075, S * .03, c.b || c.a); }, 1));
  if (jaw > 1) sp.rect(hx + S * .03, hy + S * .035, S * .14, jaw + 1, '#5a1020');
  glowEye(sp, hx + S * .03, hy - S * .025, c.eye || '#ffe14d', 1); sp.px(hx + S * .17, hy + S * .015, '#14101c');
  if (A.hit && c.breath) { const bx = hx + S * .18, by2 = hy + S * .06; for (let i = 0; i < 16; i++) { const f = i / 16, r = 2 + f * 9 * u; sp.ell(bx + f * S * .38, by2 + f * 3 + sin(i) * 1.2, r, r * .8, PX.alpha(f < .35 ? c.breath[0] : f < .7 ? c.breath[1] : c.breath[2], .85 - f * .35)); } }
  if (c.crystals) put(sp, layerOf(S, s => { for (let i = 0; i < 4; i++) s.poly([[cx - bl * .5 + i * bl * .35, by - bh * .85], [cx - bl * .4 + i * bl * .35, by - bh * 1.8 - (i % 2) * 3 * u], [cx - bl * .25 + i * bl * .35, by - bh * .85]], c.crystals); }, 2));
};

PLANS.winged = (sp, p) => PLANS.humanoid(sp, p);

/* =========================== MONSTER TABLE =========================== */
const hum = (o) => ({ plan: 'humanoid', ...o });
const TABLE = {
  /* --- school --- */
  'สไลม์ฝึกหัด': { plan: 'blob', c: { a: '#6ed86a', b: '#9af08a', eye: '#ffffff' } },
  'หนูโรงเรียน': { plan: 'beast', c: { a: '#9a9aa8', b: '#c8c8d4', snout: '#e8b8b8', eye: '#ff6a6a', tailUp: false, bigEar: true, fang: true }, S: 48 },
  'นักเรียนหลงวิญญาณ': { plan: 'wisp', c: { a: '#c8d8ff', eye: '#ff6a6a', alpha: .78, hat: true, spark: '#aaccff' } },
  'ผู้พิทักษ์สนาม': hum({ c: { skin: '#e8b890', cloth: '#3a5a8a', armor: '#5a7aaa', pants: '#2a3a5a', boots: '#4a3a2a', weapon: 'club', wc: '#8a6a3a', head: 'helm', helm: '#6a8aba', eye: '#ffd24a', k: 1.02 } }),
  'หัวหน้าผีโรงเรียน': { plan: 'wisp', boss: 1, c: { a: '#b8a8ff', eye: '#ff3a5a', alpha: .82, hat: true, wings: true, wingC: '#6a5ac8', spark: '#ffffff' } },
  /* --- forest --- */
  'หมาป่าพงไพร': { plan: 'beast', c: { a: '#7a8a6a', b: '#a8b890', snout: '#c8d0b0', eye: '#ffe14d', fang: true, tailUp: false, bushy: true } },
  'เห็ดพิษเดินได้': { plan: 'mushroom', c: { a: '#d84a4a', a2: '#a82a3a', b: '#f3ead0', spot: '#f8f4e8', spore: '#9aff8a' } },
  'วิญญาณต้นไม้': { plan: 'treant', c: { a: '#7a5a3a', dark: '#2a1a10', leaf: '#4aa84a', leaf2: '#a8f08a', eye: '#a8ff6a' } },
  'นักล่าป่ามืด': hum({ c: { skin: '#a8805a', cloth: '#2a4a2a', armor: '#3a5a3a', pants: '#2a3a2a', boots: '#2a1a10', head: 'hood', hood: '#2a4a2a', eye: '#ffe14d', weapon: 'dagger', wc: '#cfd9e8', cape: '#1f3a1f' } }),
  'ราชาหมาป่าทมิฬ': { plan: 'beast', boss: 1, c: { a: '#3a3a4a', b: '#5a5a70', snout: '#6a6a80', eye: '#ff4a4a', fang: true, mane: '#2a2a38', bushy: true, bigEar: true, horn: '#c8c8d8', stripe: '#8a8aa0' } },
  /* --- water --- */
  'เห็ดพิษ': { plan: 'mushroom', c: { a: '#4aa8d8', b: '#e8f0f8', spot: '#d8f4ff', spore: '#7ae0ff' } },
  'สไลม์น้ำ': { plan: 'blob', c: { a: '#4aa8ff', b: '#8ad0ff', eye: '#ffffff', drip: '#bfe8ff' } },
  'วิญญาณน้ำตก': { plan: 'wisp', c: { a: '#7ad8ff', eye: '#ffffff', alpha: .7, spark: '#e8fbff' } },
  'นักรบหมอก': hum({ c: { skin: '#b8d0e0', cloth: '#7a9ab8', armor: '#9ab8d0', pants: '#5a7a98', boots: '#4a6a88', head: 'helm', helm: '#a8c8e0', eye: '#e8ffff', weapon: 'spear', wc: '#d8f0ff', float: false, cape: '#5a7a98' } }),
  'ราชินีน้ำตก': { plan: 'serpent', boss: 1, c: { a: '#2a8ac8', b: '#5ac8e8', naga: true, skin: '#cfe6f2', hair: '#2a9ae8', cloth: '#1a6aa8', eye: '#ffffff', crown: true } },
  /* --- ruins / mine --- */
  'โกเลมหิน': { plan: 'golem', c: { a: '#8a8a94', b: '#6a6a78', eye: '#ffb02e', moss: '#5aa84a' } },
  'ค้างคาวเหมือง': { plan: 'bat', c: { a: '#5a4a6a', b: '#7a6a8a', eye: '#ff6a4a', fang: true } },
  'คนงานต้องสาป': hum({ c: { skin: '#8ab08a', cloth: '#6a5a3a', armor: '#7a6a4a', pants: '#4a3a2a', boots: '#2a1a10', head: 'bare', eye: '#d8ff6a', weapon: 'axe', wc: '#9aa4b0', hair: '#3a3a2a', fangs: true } }),
  'ผู้พิทักษ์แร่': { plan: 'golem', c: { a: '#4a8ac8', b: '#2a5a98', eye: '#aaf0ff', crystals: '#8ad8ff', core: '#8ad8ff', k: 1.05 } },
  'ราชาโกเลม': { plan: 'golem', boss: 1, c: { a: '#7a6a5a', b: '#5a4a3a', eye: '#ff7a2a', crown: true, moss: '#6aa84a', k: 1.1, dust: '#d8c8a0' } },
  /* --- desert --- */
  'แมงป่องทะเลทราย': { plan: 'arthropod', c: { a: '#c8903a', b: '#e0b060', claw: '#a8702a', eye: '#14101c', sting: '#ff4a3a' } },
  'โจรทะเลทราย': hum({ c: { skin: '#c8905a', cloth: '#c8a04a', armor: '#a8803a', pants: '#6a4a2a', boots: '#4a2a1a', head: 'hood', hood: '#e8d8a8', eye: '#ffe14d', weapon: 'dagger', wc: '#e8e8f0', cape: '#a8402a' } }),
  'อสูรทราย': { plan: 'golem', c: { a: '#e0b060', b: '#c8903a', eye: '#ff4a2a', core: '#ffd24a', dither: true, dust: '#f8e0a0' } },
  'งูทราย': { plan: 'serpent', c: { a: '#d8b060', b: '#a87a30', eye: '#ff4a3a', hood: '#c8903a' } },
  'ราชันทะเลทราย': hum({ boss: 1, c: { skin: '#c8a878', cloth: '#e8d8a8', armor: '#d8b050', pants: '#e8d8a8', boots: '#a87a2a', head: 'crown', eye: '#4affff', weapon: 'staff', orb: '#4affff', cape: '#2a6ab8', k: 1.1, aura: '#ffd24a', robe: false, chest: '#4affff', pauldron: '#e8c040', hair: '#1a1a2a' } }),
  /* --- snow --- */
  'หมาป่าหิมะ': { plan: 'beast', c: { a: '#e0ecf8', b: '#b8d0e8', snout: '#c8dcf0', eye: '#4ac8ff', fang: true, bushy: true } },
  'ภูตน้ำแข็ง': { plan: 'wisp', c: { a: '#bff0ff', eye: '#3a9aff', alpha: .72, wings: true, wingC: '#e8fbff', spark: '#ffffff' } },
  'เยติ': hum({ c: { skin: '#e8f0f8', cloth: '#d8e8f4', armor: '#e0ecf8', pants: '#c0d4e8', boots: '#a8c0d8', head: 'bare', eye: '#3a9aff', hair: '#f0f6ff', fangs: true, k: 1.25, glove: '#e8f0f8', headR: 10, ears: false } }),
  'อัศวินน้ำแข็ง': hum({ c: { skin: '#cfe6f2', cloth: '#4a78c8', armor: '#a8d0f0', pants: '#3a5a9a', boots: '#7aa8d8', head: 'helm', helm: '#cfe8ff', eye: '#4affff', weapon: 'sword', wc: '#bfeaff', cape: '#3a68b8', pauldron: '#cfe8ff' } }),
  'ราชินีเหมันต์': hum({ boss: 1, c: { skin: '#e8f4ff', cloth: '#6aa8e8', armor: '#a8d0f8', robe: true, boots: '#cfe8ff', head: 'crown', eye: '#4affff', weapon: 'staff', orb: '#bff8ff', hair: '#e8fbff', hairLong: true, aura: '#9fe8ff', k: 1.05, cape: '#4a88d8', wings: true, wingC: '#cfe8ff' } }),
  /* --- dragon valley --- */
  'ลูกมังกร': { plan: 'dragon', c: { a: '#e8603a', b: '#c8402a', belly: '#ffd8a0', eye: '#ffe14d', horn: '#f2e8c8', wing: '#ff9a5a', wing2: '#c8402a', noWings: false }, k: .8 },
  'นักรบมังกร': hum({ c: { skin: '#c8402a', cloth: '#6a2a1a', armor: '#a8402a', pants: '#4a1a10', boots: '#2a0a08', head: 'horn', horn: '#f2e8c8', eye: '#ffe14d', weapon: 'greatsword', wc: '#d8c8b0', fangs: true, pauldron: '#c8502a' } }),
  'มังกรเพลิง': { plan: 'dragon', c: { a: '#ff5a2a', b: '#c82a1a', belly: '#ffc87a', eye: '#ffffff', horn: '#ffe8a0', wing: '#ff8a3a', wing2: '#a8201a', breath: ['#fff1a0', '#ff9a2a', '#e8402a'], spines: '#ffe08a' } },
  'อัศวินมังกร': hum({ c: { skin: '#d8a070', cloth: '#8a2a1a', armor: '#c8402a', pants: '#4a1a10', boots: '#3a1008', head: 'helm', helm: '#e8603a', helm2: '#ffe08a', eye: '#ffb02e', weapon: 'greatsword', wc: '#e8e0d0', cape: '#8a1a14', pauldron: '#ffb02e', k: 1.08, crest: '#ffb02e' } }),
  'มังกรทมิฬ': { plan: 'dragon', boss: 1, c: { a: '#2a2a3a', b: '#4a4a62', belly: '#6a5a7a', eye: '#ff3a3a', horn: '#d8d8e8', wing: '#5a3a7a', wing2: '#2a1a3a', breath: ['#e8a8ff', '#8a4aff', '#3a1a6a'], spines: '#a888ff', tailSpike: '#a888ff' } },
  /* --- night city --- */
  'เงาวิญญาณ': { plan: 'wisp', c: { a: '#3a2a5a', eye: '#ff4aff', alpha: .72, spark: '#c88aff' } },
  'ปีศาจรัตติกาล': hum({ c: { skin: '#7a3a9a', cloth: '#3a1a4a', armor: '#5a2a6a', pants: '#2a1a3a', boots: '#1a0a28', head: 'horn', horn: '#d8c8f0', eye: '#ffe14d', wings: true, wingC: '#4a1a6a', fangs: true, weapon: 'dagger', wc: '#c8a8f0', k: .95 } }),
  'นักฆ่าเงา': hum({ c: { skin: '#a88a78', cloth: '#1a1a28', armor: '#2a2a3a', pants: '#14141e', boots: '#0a0a12', head: 'hood', hood: '#1a1a28', eye: '#ff3a6a', weapon: 'dagger', wc: '#a8f0ff', cape: '#14141e' } }),
  'อัศวินมืด': hum({ c: { skin: '#8a7a9a', cloth: '#2a1a3a', armor: '#3a2a4a', pants: '#1a1226', boots: '#120a1c', head: 'helm', helm: '#4a3a5a', helm2: '#c88aff', eye: '#ff4aff', weapon: 'greatsword', wc: '#8a6ac8', wg: '#4a3a5a', cape: '#3a1a5a', pauldron: '#5a4a7a', k: 1.1, crest: '#c88aff' } }),
  'ราชันรัตติกาล': hum({ boss: 1, c: { skin: '#d8d0e8', cloth: '#3a1a4a', armor: '#5a2a6a', pants: '#2a1a3a', boots: '#120a1c', head: 'crown', eye: '#ff3a5a', weapon: 'scythe', wc: '#c8a8ff', cape: '#2a1040', wings: true, wingC: '#3a1a5a', k: 1.15, aura: '#a84aff', fangs: true, hair: '#14101c', hairLong: true, pauldron: '#8a4ac8' } }),
  /* --- special dungeon / world --- */
  'แมงมุมโบราณ': { plan: 'arthropod', c: { a: '#3a3a4a', b: '#5a4a6a', eye: '#ff3a3a', spider: true, stripe: '#c8a8ff' } },
  'โครงกระดูก': hum({ c: { skin: '#efe6d2', cloth: '#efe6d2', armor: '#d8cfb8', pants: '#d8cfb8', boots: '#c8bfa8', head: 'skull', eye: '#6aff9a', weapon: 'sword', wc: '#a8a8b8', belt: '#6a5a4a' } }),
  'อสูรผลึก': { plan: 'beast', c: { a: '#4a6ac8', b: '#2a4a98', snout: '#8ab0ff', eye: '#aaf0ff', crystals: '#a8e8ff', fang: true, horn: '#a8e8ff' } },
  'ผู้เฝ้าดันเจี้ยน': { plan: 'golem', boss: 1, c: { a: '#5a5a78', b: '#3a3a58', eye: '#aa6aff', core: '#aa6aff', crystals: '#8a5aff', k: 1.15, crown: true } },
  'ผู้พิทักษ์โลก': hum({ c: { skin: '#f8e8d0', cloth: '#e8e0f8', armor: '#f0e8ff', pants: '#d8d0f0', boots: '#e8c05a', head: 'helm', helm: '#f8f0ff', helm2: '#ffd24a', eye: '#4affff', weapon: 'sword', wc: '#fff8d0', wings: true, wingC: '#fff8e8', cape: '#8ab0ff', pauldron: '#ffd24a', aura: '#fff1a0', k: 1.05 } }),
  'จอมมารอมตะ': hum({ c: { skin: '#a82a3a', cloth: '#2a0a12', armor: '#4a1a24', pants: '#1a060a', boots: '#0a0305', head: 'horn', horn: '#f0e0c8', eye: '#ffe14d', wings: true, wingC: '#6a1a2a', weapon: 'greatsword', wc: '#ff5a3a', fangs: true, cape: '#3a0a14', k: 1.18, aura: '#ff3a3a', pauldron: '#8a2a3a' } }),
  'มังกรบรรพกาล': { plan: 'dragon', c: { a: '#4a8a6a', b: '#2a5a4a', belly: '#c8e8a8', eye: '#ffe14d', horn: '#f2e8c8', wing: '#6ac89a', wing2: '#2a5a4a', breath: ['#e8ffd0', '#7aff9a', '#2a8a5a'], spines: '#d8f8b0', tailSpike: '#d8f8b0' } },
  'เทพอสูร': hum({ boss: 1, c: { skin: '#c8a0ff', cloth: '#14081e', armor: '#2a1040', pants: '#0a0412', boots: '#0a0412', head: 'horn', horn: '#ffd24a', eye: '#ffffff', wings: true, wingC: '#4a1a7a', weapon: 'greatsword', wc: '#ffd24a', wg: '#8a2aff', cape: '#2a0a40', k: 1.25, aura: '#d84aff', fangs: true, pauldron: '#ffd24a', crest: '#ffd24a', hair: '#ffffff' } }),
  /* --- dungeon bosses --- */
  'อัศวินเปลวไฟ': hum({ boss: 1, c: { skin: '#ffb070', cloth: '#6a1a10', armor: '#c8402a', pants: '#3a0a08', boots: '#2a0805', head: 'helm', helm: '#e8502a', helm2: '#ffe08a', eye: '#ffe14d', weapon: 'greatsword', wc: '#ff9a2a', wg: '#ffe08a', cape: '#8a1a10', pauldron: '#ffb02e', k: 1.18, aura: '#ff7a2a', crest: '#ffb02e' } }),
  'อสูรพิทักษ์มังกร': { plan: 'beast', boss: 1, c: { a: '#c8402a', b: '#8a2a1a', snout: '#ff8a4a', eye: '#ffe14d', fang: true, mane: '#ff7a2a', bushy: true, bigEar: true, horn: '#ffe8a0', crystals: '#ffb02e' } },
  'จ้าวมังกรเพลิง': { plan: 'dragon', boss: 1, c: { a: '#d8301a', b: '#8a1a10', belly: '#ffb06a', eye: '#ffffff', horn: '#ffe8a0', wing: '#ff7a2a', wing2: '#8a1a10', breath: ['#ffffff', '#ffd24a', '#ff5a1a'], spines: '#ffd24a', tailSpike: '#ffd24a' } },
  'ผู้พิทักษ์น้ำแข็ง': { plan: 'golem', boss: 1, c: { a: '#a8d8f8', b: '#5a98d8', eye: '#ffffff', core: '#4affff', crystals: '#e8fbff', k: 1.15, dust: '#e8fbff' } },
  'มังกรผลึกเหมันต์': { plan: 'dragon', boss: 1, c: { a: '#7ab0e8', b: '#3a68b8', belly: '#e8f4ff', eye: '#ffffff', horn: '#e8fbff', wing: '#bff0ff', wing2: '#4a88d8', breath: ['#ffffff', '#9fe8ff', '#3a9aff'], crystals: '#e8fbff', spines: '#e8fbff' } },
  'ราชินีแห่งเหมันต์': hum({ boss: 1, c: { skin: '#f0f8ff', cloth: '#4a88d8', armor: '#bff0ff', robe: true, boots: '#e8fbff', head: 'crown', eye: '#4affff', weapon: 'staff', orb: '#ffffff', hair: '#f0fbff', hairLong: true, aura: '#9fe8ff', k: 1.2, cape: '#3a68b8', wings: true, wingC: '#e8fbff', pauldron: '#e8fbff' } })
};
const FALLBACK_PLANS = ['blob', 'beast', 'humanoid', 'wisp', 'golem', 'mushroom'];
function entryFor(name) {
  let e = TABLE[name]; if (e) return e;
  const h = PX.hash(name), plan = FALLBACK_PLANS[h % FALLBACK_PLANS.length], hue = h % 360;
  const a = PX.hsl(hue, .55, .5), b = PX.hsl(hue + 25, .5, .62);
  return plan === 'humanoid' ? hum({ c: { skin: '#e0b890', cloth: a, armor: b, pants: PX.mix(a, '#000', .4), boots: '#2a1a10', head: 'helm', helm: b, eye: '#ffe14d', weapon: 'sword' } }) : { plan, c: { a, b, eye: '#ffe14d', crystals: b } };
}

/* =========================== FRAME BUILDER =========================== */
function drawOne(name, S, mode, i, n) {
  const e = entryFor(name), sp = new Sp(S, S), u = S / 48 * (e.k || 1) * 1;
  const p = { S, u: S / 48, c: e.c, t: 0, a: -1 };
  if (mode === 'idle') p.t = i / n;
  else if (mode === 'attack') { p.a = (i + .5) / n; p.t = i / n * .3; }
  else if (mode === 'hurt') { p.t = .1; p.a = -1; }
  else p.t = .25;
  const body = new Sp(S, S); PLANS[e.plan](body, p);
  if (mode === 'hurt') { body.tint('#ff3a3a', i === 0 ? .55 : .3); const dx = i === 0 ? 2 : -1; const m = new Sp(S, S); m.blit(body, dx, 0); return m.flipX(); }
  if (mode === 'die') { const k = (i + 1) / n, m = new Sp(S, S), H = Math.max(1, Math.round(S * (1 - k * .85))); for (let y = 0; y < S; y++) { const sy = Math.floor(S - 1 - (S - 1 - y) / (1 - k * .85)); if (sy < 0 || sy >= S) continue; for (let x = 0; x < S; x++) { const c = body.d[sy * S + x]; if (c >>> 24) m.d[y * S + x] = c; } } m.tint('#ffffff', Math.max(0, .7 - k)); m.alphaMul(Math.max(.05, 1 - k * 1.05)); return m.flipX(); }
  return body.flipX();
}
const sizeOf = (e, name) => e.S || (e.boss ? (e.plan === 'dragon' ? 96 : e.plan === 'humanoid' ? 96 : 88) : (e.plan === 'dragon' ? 64 : e.plan === 'humanoid' ? 60 : 52));
const cacheTbl = new Map();
function table(name) {
  let v = cacheTbl.get(name); if (v) return v;
  const e = entryFor(name), S = sizeOf(e, name);
  v = { name, S, boss: !!e.boss, plan: e.plan, idle: [], attack: [], hurt: [], die: [] };
  for (let i = 0; i < 8; i++) v.idle.push(drawOne(name, S, 'idle', i, 8));
  for (let i = 0; i < 6; i++) v.attack.push(drawOne(name, S, 'attack', i, 6));
  for (let i = 0; i < 2; i++) v.hurt.push(drawOne(name, S, 'hurt', i, 2));
  for (let i = 0; i < 6; i++) v.die.push(drawOne(name, S, 'die', i, 6));
  cacheTbl.set(name, v); return v;
}
/* registered animated image: idle loop twice, then the attack, so bosses visibly strike every ~3s */
function reg(name) {
  const key = 'mon|' + name; if (PX.anim.has(key)) return PX.anim.get(key).first;
  const t = table(name), loop = [...t.idle, ...t.idle, ...t.attack];
  return PX.anim.reg(key, { idle: loop }, { fps: 8 });
}
PX.creatures = { table, reg, TABLE, entryFor, PLANS };
})();
