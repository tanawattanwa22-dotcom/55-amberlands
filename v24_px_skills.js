/* 55 AMBERLANDS V24 — 120 SKILL EFFECTS (pixel art, drawn by code)
 * 20 effect "styles" (5 per class) x 3 paths (POWER/DEX/INT colour families) x 10 tiers (index 0..9:
 * more blades / arrows / rings / sparks, bigger bursts, extra halos & white-hot cores as the tier rises).
 * Each effect is a 10-frame sheet at 64x64, exported 2x => 1280x128, consumed by v23_skill_arts.js as an atlas.
 */
(() => {
'use strict';
const PX = window.PX; if (!PX) return;
const { Sp, mix, rng, hash } = PX;
const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2, N = 64, C = 32;
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)] / 16;
const dpx = (sp, x, y, col, a = 1) => { x = Math.round(x); y = Math.round(y); if (a >= .98 || bay(x, y) < a) sp.px(x, y, col); };
const ease = t => t * t * (3 - 2 * t), eo = t => 1 - (1 - t) * (1 - t);

/* colour families */
const JOBC = { 'ดาบ': '#cfe0ff', 'หมัด': '#ffd060', 'ธนู': '#7dff9a', 'จอมเวท': '#c08aff' };
const PATHC = { POWER: '#ff5a3a', DEX: '#3ad8ff', INT: '#a45cff' };
function palette(job, path) {
  const base = mix(JOBC[job] || '#ffffff', PATHC[path] || '#ffffff', path === 'POWER' ? .55 : .6);
  const main = base, dark = PX.mix(base, '#1a0a30', .55), mid = PX.mix(base, '#1a0a30', .25), lit = PX.mix(base, '#ffffff', .55);
  return { d: dark, m: mid, c: main, l: lit, w: '#ffffff', acc: mix(PATHC[path], '#ffffff', .25) };
}
/* primitives */
function arcPix(sp, cx, cy, r0, r1, a0, a1, fn) {
  const R = Math.ceil(r1);
  for (let y = -R; y <= R; y++)for (let x = -R; x <= R; x++) { const d = Math.hypot(x, y); if (d < r0 || d > r1) continue; let a = Math.atan2(y, x); while (a < a0) a += TAU; if (a > a1) continue; fn(cx + x, cy + y, d, a); }
}
function streak(sp, x0, y0, x1, y1, w, pal, a = 1) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, ww = w * (.35 + .65 * t); for (let k = -ww; k <= ww; k++) { const nx = -(y1 - y0) / n, ny = (x1 - x0) / n; const f = Math.abs(k) / Math.max(.5, ww); dpx(sp, x + nx * k, y + ny * k, f < .35 ? pal.w : f < .7 ? pal.l : pal.c, a * (.4 + .6 * t)); } }
}
function star(sp, x, y, r, pal, a = 1) { for (let i = -r; i <= r; i++) { dpx(sp, x + i, y, i === 0 ? pal.w : Math.abs(i) < r * .5 ? pal.l : pal.c, a); dpx(sp, x, y + i, i === 0 ? pal.w : Math.abs(i) < r * .5 ? pal.l : pal.c, a); } sp.px(x, y, pal.w); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dpx(sp, x + dx, y + dy, pal.l, a * .8); }
function ring(sp, cx, cy, rx, ry, col, th = 1, a = 1, a0 = 0, a1 = TAU) { const n = Math.ceil(rx * 6); for (let i = 0; i < n; i++) { const ang = a0 + (a1 - a0) * i / n; for (let k = 0; k < th; k++) dpx(sp, cx + cos(ang) * (rx - k * .6), cy + sin(ang) * (ry - k * .6), col, a); } }
function burst(sp, cx, cy, r, pal, a = 1) { sp.ell(cx, cy, r, r, PX.alpha(pal.l, .55 * a)); sp.ell(cx, cy, r * .6, r * .6, PX.alpha(pal.w, .85 * a)); }
function sparks(sp, cx, cy, p, n, R, pal, seed, a = 1) { const r = rng(seed); for (let i = 0; i < n; i++) { const ang = r() * TAU, sp0 = .4 + r() * .6, d = eo(p) * R * sp0, x = cx + cos(ang) * d, y = cy + sin(ang) * d + p * p * 6; dpx(sp, x, y, r() > .5 ? pal.w : pal.l, a * (1 - p * .9)); } }
function halo(sp, cx, cy, r, pal, a) { for (let i = 3; i >= 1; i--) sp.ell(cx, cy, r * i / 3, r * i / 3, PX.alpha(pal.c, a * (.18 - i * .03))); }
function mini(sp, x, y, ang, len, pal, kind, a = 1) {      // tiny sword / arrow along angle (tip at x,y)
  const dx = cos(ang), dy = sin(ang);
  if (kind === 'sword') { for (let i = 0; i < len; i++) dpx(sp, x - dx * i, y - dy * i, i < 2 ? pal.w : i < len - 3 ? pal.l : pal.c, a); const gx = x - dx * (len - 3), gy = y - dy * (len - 3); for (let k = -2; k <= 2; k++) dpx(sp, gx - dy * k, gy + dx * k, pal.c, a); }
  else { for (let i = 0; i < len; i++) dpx(sp, x - dx * i, y - dy * i, i === 0 ? pal.w : i < len - 2 ? '#e8d8b0' : pal.l, a); dpx(sp, x - dx, y - dy - 1, pal.w, a); dpx(sp, x - dx, y - dy + 1, pal.w, a); const fx = x - dx * (len - 1), fy = y - dy * (len - 1); dpx(sp, fx - dy, fy + dx, pal.c, a); dpx(sp, fx + dy, fy - dx, pal.c, a); }
}

/* =================== STYLES: fn(sp, p, pal, k, seed) =================== */
const ST = {};

ST.cleave = (sp, p, P, k) => {
  const prog = eo(Math.min(1, p / .6)), fade = p > .6 ? 1 - (p - .6) / .4 : 1, R = 20 + k * 8;
  const a0 = -2.4, a1 = a0 + 2.9 * prog;
  arcPix(sp, C - 2, C + 4, R - 6 - k * 2, R + 4, a0, a1, (x, y, d, a) => { const f = (a - a0) / Math.max(.001, a1 - a0), th = (d - (R - 6 - k * 2)) / (10 + k * 2), edge = Math.abs(th - .55); const w = f * (1 - Math.abs(th - .55) * 1.3); if (w < .12) return; dpx(sp, x, y, w > .75 ? P.w : w > .5 ? P.l : w > .3 ? P.c : P.m, fade * (.35 + f * .65)); });
  if (p > .55) sparks(sp, C + 10, C + 14, (p - .55) / .45, 8 + k * 14, 18 + k * 6, P, 3, 1);
  if (k > .4) halo(sp, C, C, 26, P, prog * fade);
};
ST.crosscut = (sp, p, P, k) => {
  const L = 24 + k * 6, f1 = eo(Math.min(1, p / .35)), f2 = eo(Math.max(0, Math.min(1, (p - .25) / .35))), fade = p > .65 ? 1 - (p - .65) / .35 : 1;
  streak(sp, C - L, C - L, C - L + 2 * L * f1, C - L + 2 * L * f1, 3 + k * 2, P, fade);
  streak(sp, C + L, C - L, C + L - 2 * L * f2, C - L + 2 * L * f2, 3 + k * 2, P, fade);
  if (f2 > .4) { star(sp, C, C, 6 + Math.round(k * 6), P, fade); burst(sp, C, C, 5 + k * 6, P, fade * .8); }
  if (p > .5) sparks(sp, C, C, (p - .5) / .5, 10 + k * 14, 24, P, 5, 1);
};
ST.whirl = (sp, p, P, k) => {
  const n = 2 + Math.round(k * 3), R = 8 + eo(p) * (16 + k * 6), fade = p > .7 ? 1 - (p - .7) / .3 : 1;
  for (let i = 0; i < n; i++) { const base = p * TAU * 2.5 + i * TAU / n; arcPix(sp, C, C, R - 3, R + 3, base - 1.3, base, (x, y, d, a) => { const f = (a - (base - 1.3)) / 1.3; dpx(sp, x, y, f > .8 ? P.w : f > .5 ? P.l : f > .25 ? P.c : P.m, fade * f); }); }
  burst(sp, C, C, 4 + k * 4, P, (1 - p) * .9); if (k > .5) halo(sp, C, C, R + 6, P, fade);
};
ST.bladeburst = (sp, p, P, k) => {
  const n = 6 + Math.round(k * 8), grow = eo(Math.min(1, p / .5)), fade = p > .6 ? 1 - (p - .6) / .4 : 1;
  for (let i = 0; i < n; i++) { const a = i * TAU / n + (i % 2) * .1, L = (12 + (i % 2) * 8 + k * 8) * grow; for (let d = 4; d < L; d++) { const w = Math.max(0, 2.2 - d / L * 2.2); for (let q = -w; q <= w; q++) dpx(sp, C + cos(a) * d - sin(a) * q, C + sin(a) * d + cos(a) * q, d > L - 3 ? P.w : Math.abs(q) < .8 ? P.l : P.c, fade); } }
  burst(sp, C, C, 6 + k * 6, P, fade); ring(sp, C, C, grow * (22 + k * 6), grow * (22 + k * 6), P.l, 1, fade * .8);
};
ST.swordrain = (sp, p, P, k) => {
  const n = 5 + Math.round(k * 7), r = rng(17);
  for (let i = 0; i < n; i++) { const x = 8 + r() * 48, y0 = -10, yL = 28 + r() * 24, st = r() * .45, f = Math.max(0, Math.min(1, (p - st) / .35)); if (p < st) continue; const y = y0 + (yL - y0) * ease(f);
    if (f < 1) { mini(sp, x, y, PI / 2, 10 + Math.round(k * 5), P, 'sword', 1); for (let q = 1; q < 6; q++) dpx(sp, x, y - 10 - q * 2, P.l, .6 - q * .1); }
    else { const g = (p - st - .35) / .5; if (g < 1) { mini(sp, x, yL, PI / 2, 10 + Math.round(k * 5), P, 'sword', 1 - g); ring(sp, x, yL, 3 + g * 8, 1.5 + g * 3, P.l, 1, 1 - g); sparks(sp, x, yL, g, 4, 9, P, i, 1 - g * .5); } } }
};

ST.shockwave = (sp, p, P, k) => {
  const rings = 1 + Math.round(k * 2), fade = 1 - p * .7;
  for (let i = 0; i < rings; i++) { const f = Math.max(0, p - i * .12), R = eo(f) * (24 + k * 8); if (f <= 0) continue; ring(sp, C, C + 10, R, R * .42, i ? P.l : P.w, 2 + (k > .5 ? 1 : 0), fade * (1 - i * .2)); ring(sp, C, C + 10, R - 2, (R - 2) * .42, P.c, 1, fade * .6); }
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12, d0 = eo(p) * 8, d1 = eo(p) * (26 + k * 8); dpx(sp, C + cos(a) * d1, C + 10 + sin(a) * d1 * .45, P.w, fade); dpx(sp, C + cos(a) * (d1 - 3), C + 10 + sin(a) * (d1 - 3) * .45, P.l, fade); }
  if (p < .35) burst(sp, C, C + 8, 10 + k * 6 - p * 18, P, 1 - p * 2); sparks(sp, C, C + 8, p, 6 + k * 12, 26, P, 9, 1);
};
ST.uppercut = (sp, p, P, k) => {
  const rise = eo(Math.min(1, p / .55)), fade = p > .6 ? 1 - (p - .6) / .4 : 1, H = 38 + k * 10, y = C + 22 - rise * H;
  for (let d = 0; d < H * rise; d++) { const yy = C + 22 - d, w = 4 + k * 3 - d / H * 3; for (let q = -w; q <= w; q++) { const f = Math.abs(q) / w; dpx(sp, C + q + sin(d * .3) * .8, yy, f < .3 ? P.w : f < .6 ? P.l : P.c, fade * (.3 + .7 * d / (H * rise + 1))); } }
  sp.ell(C, y, 6 + k * 3, 6 + k * 3, PX.alpha(P.l, fade)); sp.ell(C, y, 4 + k * 2, 4 + k * 2, PX.alpha(P.w, fade)); star(sp, C, y - 2, 8 + Math.round(k * 5), P, fade);
  if (p > .5) { ring(sp, C, y, (p - .5) * 36, (p - .5) * 30, P.l, 1, fade); sparks(sp, C, y, (p - .5) / .5, 10 + k * 12, 22, P, 4, 1); }
};
ST.afterimage = (sp, p, P, k) => {
  const n = 4 + Math.round(k * 4), fade = p > .75 ? 1 - (p - .75) / .25 : 1;
  for (let i = 0; i < n; i++) { const f = Math.max(0, Math.min(1, p * 1.5 - i * .1)), x = 8 + f * 46, y = C - 6 + sin(i * 1.7) * 7 + i * 1.6; if (f <= 0) continue; const a = (1 - (n - 1 - i) / n * .6) * fade; sp.ell(x, y, 5, 6, PX.alpha(P.c, a * .6)); sp.ell(x + 3, y - 1, 3, 3, PX.alpha(P.l, a)); sp.px(x + 4, y - 2, P.w); streak(sp, x - 14, y, x, y, 2, P, a * .8); }
  if (p > .6) { const f = (p - .6) / .4; star(sp, C + 20, C - 4, 6 + Math.round(k * 6), P, 1 - f); burst(sp, C + 20, C - 4, 5 + k * 5, P, 1 - f); sparks(sp, C + 20, C - 4, f, 10 + k * 12, 18, P, 6, 1); }
};
ST.groundbreak = (sp, p, P, k) => {
  const r = rng(23), n = 7 + Math.round(k * 7), g = eo(Math.min(1, p / .5)), fade = p > .7 ? 1 - (p - .7) / .3 : 1;
  for (let i = 0; i < n; i++) { const a = i * TAU / n + r() * .3, L = (12 + r() * 14 + k * 8) * g; let x = C, y = C + 12; for (let d = 0; d < L; d++) { x += cos(a) + (r() - .5) * .8; y += sin(a) * .45 + (r() - .5) * .3; sp.px(x, y, P.d); dpx(sp, x, y - 1, d < L * .5 ? P.w : P.c, fade); } }
  for (let i = 0; i < 8 + k * 10; i++) { const a = r() * PI + PI, sp0 = .4 + r() * .8, t = Math.min(1, p * 1.2), x = C + cos(a) * 18 * sp0 * eo(t), y = C + 12 + sin(a) * 30 * sp0 * (4 * t * (1 - t)) * 1.2; if (p > .15) { sp.rect(x, y, 2 + (i % 3 > 0 ? 1 : 0), 2, i % 2 ? P.m : P.l); } }
  burst(sp, C, C + 10, (1 - p) * (10 + k * 8), P, 1 - p); if (p > .1) ring(sp, C, C + 12, g * 26, g * 11, P.l, 1, fade);
};
ST.spiralpunch = (sp, p, P, k) => {
  const L = eo(Math.min(1, p / .6)) * (44 + k * 6), fade = p > .7 ? 1 - (p - .7) / .3 : 1, x0 = 8;
  for (let d = 0; d < L; d++) for (let s = 0; s < 3; s++) { const ph = d * .45 - p * 14 + s * TAU / 3, w = 3 + d / 44 * (6 + k * 5); dpx(sp, x0 + d, C + sin(ph) * w, s ? P.l : P.w, fade * (.3 + d / L * .7)); dpx(sp, x0 + d, C + sin(ph) * w + 1, P.c, fade * .6); }
  const hx = x0 + L; sp.ell(hx, C, 6 + k * 3, 6 + k * 3, PX.alpha(P.l, fade)); sp.ell(hx, C, 4 + k * 2, 4 + k * 2, PX.alpha(P.w, fade)); star(sp, hx + 2, C, 9 + Math.round(k * 5), P, fade);
  if (p > .5) { ring(sp, hx, C, (p - .5) * 30, (p - .5) * 30, P.l, 1, fade); sparks(sp, hx, C, (p - .5) / .5, 10 + k * 10, 20, P, 8, 1); }
};

ST.arrowswarm = (sp, p, P, k) => {
  const n = 5 + Math.round(k * 7), r = rng(31);
  for (let i = 0; i < n; i++) { const a = -.5 + i / (n - 1) * 1.0, st = (i % 3) * .06, f = Math.max(0, Math.min(1, (p - st) / .6)); if (p < st) continue; const d = f * 56, x = 2 + cos(a) * d, y = C + 4 + sin(a) * d * .75 - 12 * sin(f * PI) * 0; const fade = f > .85 ? 1 - (f - .85) / .15 : 1; mini(sp, x, y, a * .75, 12, P, 'arrow', fade); for (let q = 1; q < 6; q++) dpx(sp, x - cos(a) * (12 + q * 2), y - sin(a * .75) * (12 + q * 2), P.l, fade * (.5 - q * .07)); }
  if (p > .7) { const f = (p - .7) / .3; burst(sp, 56, C + 4, 8 * (1 - f) + 2, P, 1 - f); sparks(sp, 56, C + 4, f, 10 + k * 10, 14, P, 5, 1); }
};
ST.pierce = (sp, p, P, k) => {
  const f = eo(Math.min(1, p / .5)), fade = p > .65 ? 1 - (p - .65) / .35 : 1, x = 2 + f * 58, w = 2 + k * 3;
  streak(sp, 2, C, x, C, w, P, fade); mini(sp, x, C, 0, 16 + Math.round(k * 6), P, 'arrow', fade);
  for (let i = 0; i < 4; i++) { const rx = x - i * 10; if (rx > 4) ring(sp, rx, C, 3 + i * 2 + (1 - f) * 2, 8 + i * 3, P.l, 1, fade * (1 - i * .2), -1.4, 1.4); }
  if (f >= 1) { burst(sp, 60, C, 8 + k * 6, P, fade); star(sp, 58, C, 8 + Math.round(k * 6), P, fade); }
  sparks(sp, x, C, p, 8 + k * 10, 14, P, 11, 1);
};
ST.arrowrain = (sp, p, P, k) => {
  const n = 8 + Math.round(k * 10), r = rng(41);
  for (let i = 0; i < n; i++) { const x = 6 + r() * 52, yL = 26 + r() * 28, st = r() * .5, f = Math.max(0, Math.min(1, (p - st) / .3)); if (p < st) continue; const y = -8 + (yL + 8) * ease(f);
    if (f < 1) { mini(sp, x, y, PI / 2 + .12, 10, P, 'arrow', 1); for (let q = 1; q < 5; q++) dpx(sp, x - .12 * q, y - 10 - q * 2, P.l, .5 - q * .08); }
    else { const g = (p - st - .3) / .45; if (g < 1) { mini(sp, x, yL, PI / 2 + .12, 10, P, 'arrow', 1 - g); ring(sp, x, yL + 1, 2 + g * 7, 1 + g * 2.5, P.l, 1, 1 - g); } } }
};
ST.homing = (sp, p, P, k) => {
  const n = 4 + Math.round(k * 5), tx = 50, ty = C;
  for (let i = 0; i < n; i++) { const a0 = i * TAU / n + .4, sx = 12 + cos(a0) * 8, sy = C + sin(a0) * 22, f = Math.max(0, Math.min(1, (p - i * .03) / .65)); if (f <= 0) continue; const pts = []; for (let t = 0; t <= f; t += .03) { const q = ease(t), bx = sx + (tx - sx) * q, by = sy + (ty - sy) * q + sin(q * PI) * (sy < C ? 16 : -16); pts.push([bx, by]); } pts.forEach(([x, y], j) => dpx(sp, x, y, j > pts.length - 4 ? P.w : j > pts.length * .5 ? P.l : P.c, .3 + .7 * j / pts.length)); const e = pts[pts.length - 1], b = pts[Math.max(0, pts.length - 3)]; if (e) mini(sp, e[0], e[1], Math.atan2(e[1] - b[1], e[0] - b[0]), 8, P, 'arrow', 1); }
  if (p > .62) { const f = (p - .62) / .38; burst(sp, tx, ty, 10 + k * 6 - f * 8, P, 1 - f); star(sp, tx, ty, 8 + Math.round(k * 5), P, 1 - f); sparks(sp, tx, ty, f, 10 + k * 10, 18, P, 7, 1); }
};
ST.bowburst = (sp, p, P, k) => {
  const n = 8 + Math.round(k * 8), g = eo(Math.min(1, p / .6)), fade = p > .7 ? 1 - (p - .7) / .3 : 1;
  for (let i = 0; i < n; i++) { const a = i * TAU / n, d = 6 + g * (22 + (i % 2) * 6 + k * 4); mini(sp, C + cos(a) * d, C + sin(a) * d, a, 9, P, 'arrow', fade); }
  burst(sp, C, C, 7 + k * 5, P, fade * (1 - p * .6)); ring(sp, C, C, g * 28, g * 28, P.l, 1 + (k > .6 ? 1 : 0), fade * .8); if (k > .4) halo(sp, C, C, 26, P, fade);
};

ST.spellring = (sp, p, P, k) => {
  const g = eo(Math.min(1, p / .35)), fade = p > .7 ? 1 - (p - .7) / .3 : 1, R = 22 + k * 6;
  for (const [rr, th, a] of [[R, 2, 1], [R * .72, 1, .8], [R * .45, 1, .6]]) ring(sp, C, C + 6, rr * g, rr * g * .45, P.l, th, fade * a);
  const runes = 8 + Math.round(k * 6); for (let i = 0; i < runes; i++) { const ang = i * TAU / runes + p * 3, x = C + cos(ang) * R * .86 * g, y = C + 6 + sin(ang) * R * .86 * .45 * g; sp.rect(x - 1, y - 1, 2, 2, P.w); dpx(sp, x, y - 2, P.l, fade); }
  const pil = 3 + Math.round(k * 4); for (let i = 0; i < pil; i++) { const a = i * TAU / pil + p * 2, x = C + cos(a) * R * .7 * g, y = C + 6 + sin(a) * R * .32 * g, h = (10 + (i % 3) * 8 + k * 10) * Math.min(1, p * 2.2); for (let d = 0; d < h; d++) dpx(sp, x, y - d, d > h - 3 ? P.w : P.l, fade * (1 - d / h * .6)); dpx(sp, x - 1, y - h / 2, P.c, fade * .5); dpx(sp, x + 1, y - h / 2, P.c, fade * .5); }
  if (p > .3) sparks(sp, C, C, (p - .3) / .7, 14 + k * 14, 26, P, 3, 1);
};
ST.meteor = (sp, p, P, k) => {
  const hit = .62;
  if (p < hit) { const f = p / hit, x = 8 + f * 40, y = -4 + f * 44, r = 5 + k * 5, a = Math.atan2(44, 40); for (let i = 0; i < 22; i++) { const d = i * 1.8; sp.ell(x - cos(a) * d, y - sin(a) * d, r * (1 - i / 26), r * (1 - i / 26), i < 5 ? P.l : i < 12 ? P.c : PX.alpha(P.m, .6)); } sp.ell(x, y, r, r, P.l); sp.ell(x, y, r * .62, r * .62, P.w); sparks(sp, x, y, (f * 4) % 1, 4, 8, P, 3, 1); }
  else { const g = (p - hit) / (1 - hit), R = eo(g) * (22 + k * 10), fade = 1 - g; burst(sp, 50, 42, R * .8, P, fade); ring(sp, 50, 42, R, R * .7, P.l, 2, fade); ring(sp, 50, 42, R * .6, R * .42, P.w, 1, fade); sparks(sp, 50, 42, g, 14 + k * 16, 26, P, 12, 1); for (let i = 0; i < 6; i++) { const a = -PI * (.1 + i * .16), d = g * 18; for (let q = 0; q < 6 * (1 - g); q++) dpx(sp, 50 + cos(a) * (d + q), 42 + sin(a) * (d + q) * 1.4, P.l, fade); } }
};
ST.lightning = (sp, p, P, k) => {
  const n = 1 + Math.round(k * 3), r0 = rng(Math.floor(p * 5) + 91), flick = p < .7 ? ((Math.floor(p * 14) % 2) ? 1 : .6) : 1 - (p - .7) / .3;
  for (let b = 0; b < n; b++) { let x = C + (b - (n - 1) / 2) * 12 + (r0() - .5) * 4, y = 0; const tx = C + (b - (n - 1) / 2) * 8; while (y < C + 18) { const nx = x + (tx - x) * .15 + (r0() - .5) * 10, ny = y + 4 + r0() * 3; for (let t = 0; t <= 1; t += .25) { const px = x + (nx - x) * t, py = y + (ny - y) * t; dpx(sp, px, py, P.w, flick); dpx(sp, px - 1, py, P.l, flick * .9); dpx(sp, px + 1, py, P.l, flick * .9); if (k > .5) dpx(sp, px + 2, py, P.c, flick * .6); } if (r0() < .3) { const bx = nx + (r0() - .5) * 18, by = ny + 8; for (let t = 0; t <= 1; t += .2) dpx(sp, nx + (bx - nx) * t, ny + (by - ny) * t, P.l, flick * .8); } x = nx; y = ny; } }
  burst(sp, C, C + 18, 7 + k * 6, P, flick * .9); ring(sp, C, C + 18, 10 + p * 18, 4 + p * 7, P.l, 1, flick * .8); sparks(sp, C, C + 18, p, 10 + k * 12, 22, P, 6, 1);
  if (p < .15) for (let y = 0; y < N; y++) for (let x = (y & 1); x < N; x += 2) dpx(sp, x, y, P.w, .1);
};
ST.icecrystals = (sp, p, P, k) => {
  const n = 5 + Math.round(k * 5), r = rng(53), g = eo(Math.min(1, p / .4)), fade = p > .75 ? 1 - (p - .75) / .25 : 1;
  for (let i = 0; i < n; i++) { const x = C + (i - (n - 1) / 2) * (44 / n) + (r() - .5) * 4, h = (14 + r() * 18 + k * 12) * g, w = 3 + r() * 3 + k, y = C + 18 - (i % 2) * 3;
    sp.poly([[x - w, y], [x - w * .4, y - h * .8], [x, y - h], [x + w * .5, y - h * .75], [x + w, y]], PX.alpha(P.c, fade)); sp.poly([[x - w * .5, y], [x - w * .2, y - h * .75], [x, y - h], [x - 1, y]], PX.alpha(P.l, fade)); sp.vline(x - w * .45, y - h * .7, h * .5, PX.alpha(P.w, fade)); sp.px(x, y - h, PX.alpha(P.w, fade)); }
  ring(sp, C, C + 18, g * 28, g * 8, P.l, 1, fade); sparks(sp, C, C + 6, p, 14 + k * 16, 26, P, 9, 1); if (k > .5) halo(sp, C, C + 4, 28, P, fade * .8);
};
ST.nova = (sp, p, P, k) => {
  const g = eo(p), fade = 1 - p * p, R = g * (26 + k * 6);
  sp.ell(C, C, R, R, PX.alpha(P.c, .25 * fade)); sp.ell(C, C, R * .7, R * .7, PX.alpha(P.l, .3 * fade)); ring(sp, C, C, R, R, P.w, 2, fade); ring(sp, C, C, R * .8, R * .8, P.l, 1, fade * .8);
  const n = 8 + Math.round(k * 8); for (let i = 0; i < n; i++) { const a = i * TAU / n + p * 1.2, d = R * (.2 + (i % 3) * .28); star(sp, C + cos(a) * d, C + sin(a) * d, 2 + (i % 2) + (k > .6 ? 1 : 0), P, fade); }
  burst(sp, C, C, (1 - p) * (10 + k * 8) + 3, P, 1); sparks(sp, C, C, p, 10 + k * 14, 28, P, 3, 1);
};

/* =================== sheet builder =================== */
const cache = new Map();
function frames(cfg) {
  const key = cfg.style + '|' + cfg.job + '|' + cfg.path + '|' + cfg.index;
  let v = cache.get(key); if (v) return v;
  const P = palette(cfg.job, cfg.path), k = (cfg.index || 0) / 9, fn = ST[cfg.style] || ST.nova, out = [];
  for (let i = 0; i < 10; i++) { const sp = new Sp(N, N); fn(sp, (i + .5) / 10, P, k, hash(key)); out.push(sp); }
  cache.set(key, out); return out;
}
const urls = new Map();
function sheetURL(cfg) {
  const key = cfg.style + '|' + cfg.job + '|' + cfg.path + '|' + cfg.index; let u = urls.get(key); if (u) return u;
  const fr = frames(cfg), c = document.createElement('canvas'); c.width = 1280; c.height = 128; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  fr.forEach((f, i) => x.drawImage(f.toCanvas(1), i * 128, 0, 128, 128)); u = c.toDataURL(); urls.set(key, u); return u;
}
/* 24x24 skill icon = peak frame on a dark jewelled tile */
function iconSp(cfg, size = 28) {
  const fr = frames(cfg), peak = fr[3], t = new Sp(size, size), P = palette(cfg.job, cfg.path);
  for (let y = 0; y < size; y++)for (let x = 0; x < size; x++) t.px(x, y, mix(mix(P.d, '#0a0618', .6), P.m, (1 - y / size) * .35));
  const sm = new Sp(size, size), sc = N / (size - 4);
  for (let y = 0; y < size - 4; y++)for (let x = 0; x < size - 4; x++) { let best = 0, bl = -1; for (let dy = 0; dy < 2; dy++)for (let dx = 0; dx < 2; dx++) { const c = peak.get(Math.floor(x * sc) + dx, Math.floor(y * sc) + dy); if ((c >>> 24) > 100) { const l = PX.lum(c); if (l > bl) { bl = l; best = c; } } } if (best) sm.d[(y + 2) * size + x + 2] = best | 0xff000000; }
  t.blit(sm, 0, 0, { rim: true });
  for (let i = 0; i < size; i++) { t.px(i, 0, P.l); t.px(i, size - 1, P.d); t.px(0, i, P.l); t.px(size - 1, i, P.d); } return t;
}
PX.skills = { ST, frames, sheetURL, palette, iconSp, STYLES: Object.keys(ST) };
})();
