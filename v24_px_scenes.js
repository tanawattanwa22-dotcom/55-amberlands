/* 55 AMBERLANDS V24 — LIVING PIXEL MAPS
 * Twelve scenes (10 world maps + 2 dungeons) generated in code at the pixel-scale of the screen
 * (every logical pixel = SCALE css pixels). A static background is baked once; every frame we copy it and
 * draw the moving things on top: drifting clouds, windmill blades, swaying grass/trees, waterfalls,
 * ripples, torch flames, lava flow, fireflies, snow, sand, embers, lightning, banners, floating runes.
 *   const s = PX.scenes.create('forest', W, H);   s.render(timeMs) -> Sp
 *   PX.scenes.mount(sceneElement)                  installs the live canvas layer inside the game's #scene
 */
(() => {
'use strict';
const PX = window.PX; if (!PX) return;
const { Sp, rng, hash, mix, noise1 } = PX;
const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2;
const SCALE = 3;

/* ---------- little painters ---------- */
function gradSky(sp, stops, hor) {       // stops: colours top->horizon, quantised to bands
  const n = stops.length;
  for (let y = 0; y < hor; y++) { const f = y / Math.max(1, hor - 1) * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = Math.floor((f - i) * 5) / 5; sp.hline(0, y, sp.w, mix(stops[i], stops[i + 1], t)); }
}
function ridge(sp, base, amp, freq, seed, color, o = {}) {
  const w = sp.w, r = rng(seed);
  for (let x = 0; x < w; x++) {
    let y = base - amp * (noise1(x * freq, seed) * .7 + noise1(x * freq * 2.3, seed + 5) * .3);
    if (o.peak) y -= Math.max(0, 1 - Math.abs(((x / w * o.peak) % 1) - .5) * 2.4) * amp * .6;
    y = Math.round(y); for (let yy = y; yy < (o.to || sp.h); yy++) sp.px(x, yy, o.grad ? mix(color, o.grad, Math.min(1, (yy - y) / (o.gh || 20))) : color);
    if (o.snow && y < base - amp * .45) { sp.px(x, y, o.snow); sp.px(x, y + 1, o.snow); if (noise1(x * .5, seed) > .5) sp.px(x, y + 2, o.snow); }
  }
}
const feat = (sp, fn, R = 2, rim = true, ox = 0, oy = 0) => { const t = new Sp(sp.w, sp.h); fn(t); const bb = t.bbox(); if (!bb) return; const c = t.crop(bb.x, bb.y, bb.w, bb.h); c.shade(null, { R }); sp.blit(c, bb.x + ox, bb.y + oy, { rim }); };
function cloud(sp, x, y, w, c1 = '#ffffff', c2 = '#dfe9f8') {
  const r = rng(Math.floor(x * 7 + y)), n = 4 + (w >> 3);
  for (let i = 0; i < n; i++) { const cx = x + (i / n - .5) * w, cy = y + Math.sin(i * 1.7) * 2, rr = 4 + r() * 4; sp.ell(cx, cy + 2, rr * 1.2, rr * .7, c2); }
  for (let i = 0; i < n; i++) { const cx = x + (i / n - .5) * w, cy = y + Math.sin(i * 1.7) * 2, rr = 4 + r() * 4; sp.ell(cx, cy, rr * 1.2, rr * .75, c1); }
}
function tree(sp, x, y, h, c1, c2, trunk = '#6a4228') {
  feat(sp, t => { t.rect(x - 1.5, y - h * .45, 3, h * .45, trunk); t.ell(x, y - h * .72, h * .34, h * .3, c1); t.ell(x - h * .2, y - h * .6, h * .22, h * .2, c2 || c1); t.ell(x + h * .2, y - h * .6, h * .22, h * .2, c2 || c1); t.ell(x, y - h * .95, h * .24, h * .2, c1); }, 3, true);
}
function pine(sp, x, y, h, c1, snow) {
  feat(sp, t => { t.rect(x - 1, y - 3, 2, 3, '#5a3a22'); for (let i = 0; i < 4; i++) { const yy = y - 3 - i * h * .22, ww = h * (.28 - i * .05); t.poly([[x - ww, yy], [x + ww, yy], [x, yy - h * .32]], c1); } if (snow) for (let i = 0; i < 4; i++) { const yy = y - 3 - i * h * .22, ww = h * (.28 - i * .05); t.poly([[x - ww * .55, yy - h * .12], [x + ww * .55, yy - h * .12], [x, yy - h * .32]], snow); } }, 2, true);
}
function house(sp, x, y, w, h, wall, roof) {
  feat(sp, t => { t.rect(x - w / 2, y - h, w, h, wall); t.poly([[x - w / 2 - 2, y - h], [x + w / 2 + 2, y - h], [x, y - h - w * .5]], roof); t.rect(x - 2, y - h * .5, 4, h * .5, '#5a3a22'); }, 2, true);
  sp.rect(x - w / 2 + 2, y - h * .8, 3, 3, '#ffe9a0'); sp.rect(x + w / 2 - 5, y - h * .8, 3, 3, '#ffe9a0'); sp.rect(x + w / 4, y - h - w * .3, 3, w * .3, '#8a6a5a');
}
function cactus(sp, x, y, h) { feat(sp, t => { t.rect(x - 2, y - h, 4, h, '#3a9a5a'); t.rect(x - 7, y - h * .65, 3, 3, '#3a9a5a'); t.rect(x - 7, y - h * .65 - 6, 3, 7, '#3a9a5a'); t.rect(x + 4, y - h * .5, 3, 3, '#3a9a5a'); t.rect(x + 4, y - h * .5 - 7, 3, 8, '#3a9a5a'); t.rect(x - 7, y - h * .65, 7, 3, '#3a9a5a'); t.rect(x, y - h * .5, 7, 3, '#3a9a5a'); }, 2, true); }
function crystal(sp, x, y, h, c) { feat(sp, t => { t.poly([[x - h * .22, y], [x - h * .1, y - h], [x + h * .12, y - h * .8], [x + h * .24, y]], c); t.poly([[x + h * .2, y], [x + h * .3, y - h * .55], [x + h * .5, y]], c); }, 2, true); }
function pillar(sp, x, y, w, h, c) { feat(sp, t => { t.rect(x - w / 2, y - h, w, h, c); t.rect(x - w / 2 - 2, y - h, w + 4, 3, c); t.rect(x - w / 2 - 2, y - 3, w + 4, 3, c); for (let i = 1; i < 4; i++) t.vline(x - w / 2 + i * w / 4, y - h + 4, h - 8, PX.mix(c, '#000', .15)); }, 2, true); }
function rocks(sp, x, y, n, c, sz = 6, seed = 1) { const r = rng(seed + x); feat(sp, t => { for (let i = 0; i < n; i++) { const rx = x + (r() - .5) * sz * 3, ry = y + r() * 3, s = sz * (.5 + r() * .7); t.poly([[rx - s, ry], [rx - s * .6, ry - s * .8], [rx + s * .3, ry - s], [rx + s, ry - s * .2], [rx + s * .8, ry]], c); } }, 2, true); }
function flowerField(sp, y0, y1, cols, seed, dens = .12) { const r = rng(seed); for (let y = y0; y < y1; y++)for (let x = 0; x < sp.w; x++) if (r() < dens * ((y - y0) / (y1 - y0) + .2)) { sp.px(x, y, cols[Math.floor(r() * cols.length)]); } }
function tuft(sp, x, y, h, c) { sp.px(x, y, c); sp.px(x - 1, y - 1, c); sp.px(x + 1, y - 1, c); if (h > 2) { sp.px(x, y - 2, c); sp.px(x - 1, y - 2, c); sp.px(x + 1, y - 3, c); } }

/* particle helpers (deterministic: position is a function of time) */
const frac = v => v - Math.floor(v);
function motes(sp, t, n, seed, o) {            // generic drifting particles
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r() * sp.w, y0 = r() * sp.h, spd = (o.spd || 1) * (.5 + r() * .8), ph = r(), sw = (o.sway || 0) * (.5 + r());
    const f = frac(t * spd * (o.rate || .00006) + ph);
    let x = x0 + (o.dx || 0) * f * sp.w + sin(f * TAU * 2 + ph * 6) * sw, y = y0 + (o.dy || 0) * f * sp.h;
    x = ((x % sp.w) + sp.w) % sp.w; y = ((y % sp.h) + sp.h) % sp.h;
    if (o.ymin != null && (y < o.ymin || y > (o.ymax || sp.h))) continue;
    const tw = o.twinkle ? (.5 + .5 * sin(t * .004 + ph * 20)) : 1, c = Array.isArray(o.col) ? o.col[i % o.col.length] : o.col;
    sp.px(x, y, o.alpha != null ? PX.alpha(c, o.alpha * tw) : c);
    if (o.size > 1) { sp.px(x + 1, y, o.alpha != null ? PX.alpha(c, o.alpha * tw * .7) : c); sp.px(x, y + 1, o.alpha != null ? PX.alpha(c, o.alpha * tw * .7) : c); }
  }
}

/* ======================================================================
 * SCENE DEFINITIONS: build(W,H,B) draws static art into B.base and returns {frame(sp,t)}.
 * hor = horizon row, ground below it.
 * ====================================================================== */
const SC = {};

SC.school = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .48), r = rng(11);
  gradSky(base, ['#5ab8ff', '#8ad4ff', '#c8ecff', '#fff4d0'], hor + 6);
  base.glow(W * .78, H * .14, 14, '#fff6c0', .8, false); base.ell(W * .78, H * .14, 5, 5, '#fff8d8');
  ridge(base, hor - 6, 22, .035, 3, '#a8c8e8', { to: hor + 8 }); ridge(base, hor + 1, 14, .05, 8, '#7fb8a0', { to: hor + 10 }); ridge(base, hor + 5, 9, .08, 13, '#5aa860');
  for (let y = hor + 8; y < H; y++) base.hline(0, y, W, mix('#58b24e', '#2f8a3a', Math.min(1, (y - hor) / (H - hor) * 1.2)));
  // village
  house(base, W * .22, hor + 8, 20, 13, '#f4e4c0', '#d4503a'); house(base, W * .5, hor + 6, 16, 11, '#f0d8b0', '#4a78c8'); house(base, W * .82, hor + 9, 22, 14, '#ead0a0', '#c8702a');
  // windmill tower
  const wmx = W * .66, wmy = hor + 6; feat(base, t => { t.poly([[wmx - 6, wmy], [wmx + 6, wmy], [wmx + 3, wmy - 22], [wmx - 3, wmy - 22]], '#e8dcc0'); t.poly([[wmx - 5, wmy - 22], [wmx + 5, wmy - 22], [wmx, wmy - 28]], '#a8402a'); }, 2, true);
  // path
  for (let y = hor + 14; y < H; y++) { const w = 12 + (y - hor) * .9, cx = W * .5 + sin(y * .06) * 8; base.hline(cx - w / 2, y, w, mix('#d8b878', '#b8985a', (y - hor) / H)); }
  for (const x of [W * .06, W * .38, W * .94]) tree(base, x, hor + 10, 28, '#3f9a48', '#58b858');
  flowerField(base, hor + 14, H, ['#ff6a8a', '#ffe14d', '#ffffff', '#a8a0ff'], 5, .06);
  const grass = []; for (let i = 0; i < 70; i++)grass.push([r() * W, hor + 16 + r() * (H - hor - 16), r()]);
  const clouds = [[.1, 12, 26], [.5, 20, 34], [.85, 9, 22]];
  return {
    frame(sp, t) {
      clouds.forEach(([x, y, w], i) => { const cx = ((x * W + t * .006 * (1 + i * .3)) % (W + 60)) - 30; cloud(sp, cx, y, w); });
      // windmill blades
      const a = t * .0016; for (let i = 0; i < 4; i++) { const ang = a + i * PI / 2, bx = wmx + cos(ang) * 17, by = wmy - 22 + sin(ang) * 17; sp.line(wmx, wmy - 22, bx, by, '#8a5a3a', 1); sp.line(wmx + cos(ang) * 6, wmy - 22 + sin(ang) * 6, bx + cos(ang + 1.57) * 3, by + sin(ang + 1.57) * 3, '#f4ecd8', 2); } sp.disc(wmx, wmy - 22, 2, '#a8402a');
      // chimney smoke
      for (let i = 0; i < 6; i++) { const f = frac(t * .0004 + i / 6); sp.px(W * .22 + 7 + f * 4 + sin(f * 9) * 1.5, hor - 8 - f * 20, PX.alpha('#ffffff', .6 * (1 - f))); }
      // birds
      for (let i = 0; i < 3; i++) { const bx = ((t * .02 * (1 + i * .2) + i * 60) % (W + 20)) - 10, by = 18 + i * 8 + sin(t * .004 + i) * 2, fl = sin(t * .02 + i) > 0 ? -1 : 1; sp.px(bx, by, '#2a2a40'); sp.px(bx - 1, by + fl, '#2a2a40'); sp.px(bx + 1, by + fl, '#2a2a40'); sp.px(bx - 2, by + fl * 1.5, '#2a2a40'); sp.px(bx + 2, by + fl * 1.5, '#2a2a40'); }
      for (const [x, y, ph] of grass) { const sw = Math.round(sin(t * .004 + x * .3 + ph * 6) * 1.2); sp.px(x + sw, y - 2, '#7ad86a'); sp.px(x + sw * .5, y - 1, '#4aa84a'); sp.px(x, y, '#3a8a3a'); }
    }, base
  };
};

SC.forest = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .5), r = rng(21);
  gradSky(base, ['#1f5a48', '#3f8f6a', '#9fd8a0'], hor);
  ridge(base, hor - 4, 14, .05, 4, '#2a6a52', { to: hor + 4 }); ridge(base, hor, 10, .07, 9, '#1f5a3a');
  for (let i = 0; i < 9; i++) tree(base, i * W / 8 + r() * 6, hor + 6, 34 + r() * 14, '#256a3a', '#2f8a46', '#4a3020');
  for (let y = hor + 4; y < H; y++) base.hline(0, y, W, mix('#2f7a3a', '#143f26', (y - hor) / (H - hor)));
  // big foreground trunks
  for (const [x, w] of [[W * .04, 12], [W * .96, 14]]) { feat(base, t => { t.rect(x - w / 2, 0, w, H, '#5a3a22'); for (let k = 0; k < 6; k++)t.vline(x - w / 2 + 2 + k * 2, 0, H, '#4a2e1a'); t.cap(x + w / 2, H * .5, x + w * 1.6, H * .65, 3, 1.5, '#5a3a22'); }, 3, true); }
  for (let i = 0; i < 6; i++) { const x = r() * W, y = hor + 14 + r() * (H - hor - 18); feat(base, t => { t.rect(x - 1, y - 3, 2, 3, '#e8e0c8'); t.ell(x, y - 4, 3, 2, ['#e0364a', '#a45cf0', '#ff9a2a'][i % 3]); }, 1, true); }
  const flies = 22, leaves = 12, vines = [[W * .2, 14], [W * .45, 9], [W * .72, 12]];
  return {
    frame(sp, t) {
      for (let i = 0; i < 4; i++) { const x = W * (.2 + i * .2) + sin(t * .0005 + i) * 5, a = .07 + .04 * sin(t * .001 + i * 2); for (let y = 0; y < H * .8; y++) { const w = 4 + y * .12, xx = x + y * .22; sp.hline(xx - w, y, w * 2, PX.alpha('#fff6b0', a * (1 - y / (H * .85)))); } }
      for (const [x, l] of vines) for (let k = 0; k < l; k++) sp.px(x + sin(t * .002 + k * .5) * (k * .12), k, k % 3 ? '#3a9a48' : '#6ad86a');
      motes(sp, t, flies, 5, { spd: 1.4, sway: 6, dy: .04, dx: .06, col: ['#e8ff7a', '#ffffa0'], twinkle: 1, alpha: .95, size: 2, ymin: hor * .8 });
      for (let i = 0; i < leaves; i++) { const f = frac(t * .00018 + i / leaves), x = (i * 37 % W) + sin(f * 12 + i) * 8 + f * 14, y = f * H; sp.px(x, y, i % 2 ? '#a8d84a' : '#6aa83a'); sp.px(x + 1, y, '#4a8a2a'); }
    }, base
  };
};

SC.water = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .5), r = rng(31);
  gradSky(base, ['#7fd0ff', '#b8e8ff', '#e8f8ff'], hor);
  ridge(base, hor - 4, 20, .05, 6, '#5a8aa8', { to: hor }); const cliffL = Math.round(W * .52);
  feat(base, t => { t.poly([[cliffL - 22, 0], [W, 0], [W, hor + 6], [cliffL + 14, hor + 6], [cliffL + 10, hor * .6], [cliffL - 4, hor * .35]], '#6a7a8a'); for (let i = 0; i < 12; i++) t.rect(cliffL - 18 + r() * (W - cliffL), r() * hor, 6 + r() * 8, 2, '#8a9aaa'); }, 3, true);
  tree(base, W * .7, hor * .25 + 6, 24, '#3f9a48', '#58b858'); tree(base, W * .9, hor * .3, 28, '#3f9a48', '#58b858');
  for (let y = hor; y < H; y++) base.hline(0, y, W, mix('#3aa8d8', '#1a5a98', (y - hor) / (H - hor)));
  rocks(base, W * .2, hor + 10, 4, '#6a7a88', 7, 1); rocks(base, W * .88, hor + 20, 5, '#5a6a78', 8, 2); rocks(base, W * .1, H - 8, 4, '#4a5a68', 9, 3);
  for (let i = 0; i < 4; i++) feat(base, t => { t.ell(W * .3 + i * 14, hor + 22 + (i % 2) * 8, 6, 2.4, '#58b858'); }, 1, true);
  const wx = cliffL, wTop = Math.round(hor * .4);
  return {
    frame(sp, t) {
      for (let y = wTop; y < hor + 4; y++) for (let x = wx - 5; x < wx + 8; x++) { const v = sin((y * .8 - t * .03) + x * 1.3) + sin(y * .3 - t * .02 + x * .7); const c = v > 1.2 ? '#ffffff' : v > .2 ? '#cfeeff' : '#8ad0f0'; sp.px(x, y, c); }
      for (let i = 0; i < 14; i++) { const f = frac(t * .0009 + i / 14), x = wx + 1 + sin(i * 5 + f * 9) * 12, y = hor + 3 - f * 9; sp.px(x, y, PX.alpha('#ffffff', .8 * (1 - f))); }
      sp.ell(wx + 2, hor + 6, 12 + sin(t * .004) * 1.2, 3, '#ffffffaa'); sp.ell(wx + 2, hor + 6, 8, 2, '#ffffffcc');
      for (let k = 0; k < 7; k++) { const rr = ((t * .006 + k * 9) % 36), y = hor + 18 + (k % 3) * 9, x = (k * 41) % W; sp.hline(x - rr * .5, y, rr, PX.alpha('#ffffff', .35 * (1 - rr / 36))); }
      for (let y = hor + 3; y < H; y += 3) for (let x = (y * 5) % 9; x < W; x += 9) { const a = .5 + .5 * sin(t * .004 + x * .7 + y); if (a > .8) sp.px(x, y, '#e8fbff'); }
      // mist + rainbow
      for (let i = 0; i < 8; i++) { const x = (i * 29 + t * .004) % W; sp.ell(x, hor - 2 + sin(t * .001 + i) * 2, 14, 3, PX.alpha('#ffffff', .18)); }
      const rc = ['#ff6a6a', '#ffb05a', '#ffe85a', '#7aff8a', '#5ad8ff', '#8a8aff']; rc.forEach((c, i) => { for (let a = 3.3; a < 5.8; a += .02) sp.px(W * .2 + cos(a) * (28 - i), hor + 6 + sin(a) * (28 - i) * .9, PX.alpha(c, .22)); });
    }, base
  };
};

SC.ruins = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .52), r = rng(41);
  base.fillAll('#2a2230'); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = noise1(x * .15, y) * .5 + noise1(y * .2 + 9, x) * .5; if (n > .62) base.px(x, y, '#3a3040'); else if (n < .25) base.px(x, y, '#211a28'); }
  for (let x = 0; x < W; x += 3) { const l = 6 + noise1(x * .2, 4) * 18; for (let k = 0; k < l; k++) base.px(x, k, mix('#14101a', '#2a2230', k / l)); base.px(x, l, '#14101a'); }
  for (let y = hor; y < H; y++) base.hline(0, y, W, mix('#5a4a40', '#3a2e2a', (y - hor) / (H - hor)));
  for (let x = -4; x < W; x += 9) { const y0 = hor + 3 + ((x * 7) % 5); base.hline(x, y0, 8, '#6a5a50'); }
  for (const x of [W * .18, W * .5, W * .82]) { feat(base, t => { t.rect(x - 2, hor - 34, 4, 38, '#6a4a2a'); t.rect(x - 16, hor - 34, 32, 4, '#7a5a34'); }, 2, true); }
  // rails
  for (let x = 0; x < W; x += 5) base.rect(x, H - 14, 2, 4, '#4a3020'); base.hline(0, H - 13, W, '#8a8a9a'); base.hline(0, H - 11, W, '#6a6a7a');
  feat(base, t => { t.poly([[W * .62, H - 14], [W * .62 + 20, H - 14], [W * .62 + 17, H - 24], [W * .62 + 3, H - 24]], '#7a5a3a'); t.rect(W * .62 + 2, H - 27, 16, 3, '#8a8a9a'); for (let i = 0; i < 3; i++) t.ell(W * .62 + 5 + i * 5, H - 27, 3, 2, '#ffd24a'); }, 2, true);
  const cr = [[W * .1, hor + 6, 20, '#6ad8ff'], [W * .35, hor + 8, 14, '#ff6aa8'], [W * .78, hor + 5, 24, '#6aff9a'], [W * .93, hor + 12, 14, '#6ad8ff']]; cr.forEach(([x, y, h, c]) => crystal(base, x, y, h, c));
  const torches = [W * .18, W * .5, W * .82];
  return {
    frame(sp, t) {
      cr.forEach(([x, y, h, c], i) => sp.glow(x, y - h * .5, h * .9, c, .3 + .18 * sin(t * .003 + i * 2)));
      torches.forEach((x, i) => { const fl = sin(t * .02 + i) * .5, y = hor - 37; sp.glow(x, y, 22 + fl * 3, '#ffa84a', .28); const fh = 5 + Math.round(sin(t * .03 + i * 3) * 1.5); sp.poly([[x - 3, y + 3], [x + 3, y + 3], [x + 1 + fl, y - fh], [x - 1, y - fh * .5]], '#ff7a1a'); sp.poly([[x - 2, y + 3], [x + 2, y + 3], [x, y - fh * .5]], '#ffd24a'); });
      motes(sp, t, 26, 7, { spd: .5, sway: 3, dy: .02, dx: -.02, col: ['#c8b8a0', '#ffd8a0'], alpha: .6 });
      for (let i = 0; i < 5; i++) { const f = frac(t * .0007 + i * .2); sp.px(W * .34 + i * 2, hor - 30 + f * 36, PX.alpha('#8ad8ff', .8 * (1 - f))); }
    }, base
  };
};

SC.desert = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .46), r = rng(51);
  gradSky(base, ['#ffb85a', '#ffd88a', '#fff0c0', '#ffe8a8'], hor + 4);
  ridge(base, hor - 2, 8, .05, 5, '#e8a860', { to: hor + 10 }); ridge(base, hor + 6, 12, .035, 12, '#d8984a', { grad: '#c8883a', gh: 30 });
  // pyramids
  for (const [x, s] of [[W * .72, 20], [W * .84, 13]]) feat(base, t => { t.poly([[x - s, hor + 4], [x, hor + 4 - s * .9], [x + s, hor + 4]], '#e8b860'); t.poly([[x, hor + 4 - s * .9], [x + s, hor + 4], [x + 2, hor + 4]], '#b88838'); }, 2, true);
  ridge(base, hor + 16, 16, .03, 17, '#e8b45a', { grad: '#c88a3a', gh: 40 }); ridge(base, hor + 30, 12, .05, 23, '#f0c46a', { grad: '#d89a48', gh: 40 });
  cactus(base, W * .15, hor + 26, 16); cactus(base, W * .9, hor + 38, 20); rocks(base, W * .3, H - 14, 3, '#a8784a', 7, 4);
  feat(base, t => { t.cap(W * .55, H - 12, W * .55, H - 4, 2, 2, '#e8e0c8'); t.ell(W * .55, H - 14, 4, 3, '#e8e0c8'); t.rect(W * .55 - 4, H - 14, 2, 2, '#14101c'); t.rect(W * .55 + 1, H - 14, 2, 2, '#14101c'); }, 1, true);
  return {
    frame(sp, t) {
      sp.glow(W * .25, H * .15, 26, '#fff0b0', .55); sp.ell(W * .25, H * .15, 8, 8, '#fff4c8'); sp.ell(W * .25, H * .15, 6, 6, '#ffe590');
      for (let y = hor - 4; y < hor + 6; y++) { const o = Math.round(sin(t * .005 + y * .9) * 1.2); if (o) for (let x = 0; x < W; x += 5) sp.px(x + o, y, PX.alpha('#ffe8b0', .22)); }
      for (let i = 0; i < 3; i++) { const a = t * .0004 + i * 2.1, x = W * .5 + cos(a) * 34, y = H * .22 + sin(a * 1.3) * 10; sp.px(x, y, '#2a2020'); sp.px(x - 2, y - 1, '#2a2020'); sp.px(x + 2, y - 1, '#2a2020'); sp.px(x - 3, y, '#2a2020'); sp.px(x + 3, y, '#2a2020'); }
      motes(sp, t, 60, 9, { spd: 2.5, sway: 1, dx: .8, dy: .03, col: ['#f8e0a0', '#e8c070'], alpha: .6, ymin: hor + 8 });
      for (let k = 0; k < 4; k++) { const f = frac(t * .00007 + k / 4), y = hor + 20 + k * 11; sp.hline(f * W * 1.3 - 30, y, 24, PX.alpha('#f8e0a0', .3)); }
    }, base
  };
};

SC.snow = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .5), r = rng(61);
  gradSky(base, ['#a8c8f0', '#d0e4fa', '#f4faff'], hor + 6);
  ridge(base, hor - 6, 34, .03, 7, '#b8cce8', { snow: '#ffffff', peak: 2.4, to: hor + 10, grad: '#9fb8d8', gh: 24 }); ridge(base, hor + 2, 20, .05, 15, '#9fb4d4', { snow: '#ffffff', to: hor + 12 });
  for (let y = hor + 6; y < H; y++) base.hline(0, y, W, mix('#f0f8ff', '#cfe0f4', (y - hor) / (H - hor)));
  for (let i = 0; i < 10; i++) pine(base, i * W / 9 + r() * 8, hor + 10 + (i % 3) * 7, 26 + r() * 12, '#2a6a58', '#ffffff');
  for (let i = 0; i < 5; i++) { const x = r() * W, y = hor + 24 + r() * (H - hor - 30); crystal(base, x, y, 8 + r() * 8, '#9fe8ff'); }
  rocks(base, W * .12, H - 8, 4, '#7a8aa8', 7, 5); rocks(base, W * .9, H - 12, 3, '#8a9ab8', 8, 6);
  return {
    frame(sp, t) {
      for (let i = 0; i < 3; i++) for (let x = 0; x < W; x += 1) { const y = 6 + i * 5 + sin(x * .06 + t * .0009 + i) * 5; const c = ['#6affc8', '#6ac8ff', '#c89aff'][i]; sp.px(x, y, PX.alpha(c, .22)); sp.px(x, y + 1, PX.alpha(c, .16)); sp.px(x, y + 2, PX.alpha(c, .08)); }
      for (let i = 0; i < 4; i++) { const x = ((i * 53 + t * .004) % (W + 40)) - 20; cloud(sp, x, 8 + i * 4, 24, '#ffffffcc', '#e8f0fcaa'); }
      for (const [n, sp1, size, a] of [[40, 1, 1, .9], [28, 1.7, 1, 1], [16, 2.6, 2, 1]]) motes(sp, t, n, n * 3, { spd: sp1, sway: 4, dy: 1, dx: -.15, rate: .00028, col: '#ffffff', alpha: a, size });
      for (let i = 0; i < 6; i++) { const f = frac(t * .0006 + i / 6); sp.px(W * .1 + i * 28, hor + 20 - f * 12, PX.alpha('#e8fbff', 1 - f)); }
    }, base
  };
};

SC.dragon = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .5), r = rng(71);
  gradSky(base, ['#3a1018', '#7a2418', '#e8602a', '#ffb050'], hor + 4);
  ridge(base, hor - 8, 38, .03, 9, '#3a1a20', { peak: 3, to: hor + 8 }); ridge(base, hor, 20, .06, 19, '#2a1218', { to: hor + 10 });
  // volcano
  feat(base, t => { t.poly([[W * .6, hor + 4], [W * .72, hor - 34], [W * .76, hor - 34], [W * .9, hor + 4]], '#4a2428'); }, 2, true);
  for (let y = hor + 4; y < H; y++) base.hline(0, y, W, mix('#3a2428', '#1a0e12', (y - hor) / (H - hor)));
  rocks(base, W * .12, hor + 20, 5, '#5a3a3a', 9, 7); rocks(base, W * .55, H - 10, 4, '#4a2a2e', 8, 8);
  feat(base, t => { t.cap(W * .35, hor + 22, W * .35, hor + 4, 2, 1, '#e8dcc0'); for (let i = 0; i < 5; i++) t.cap(W * .35, hor + 20 - i * 3, W * .35 + 9, hor + 22 - i * 3, 1.2, .8, '#e8dcc0'); t.ell(W * .35 - 3, hor + 2, 5, 4, '#e8dcc0'); }, 1, true);
  const lavaY = Math.round(H * .78);
  return {
    frame(sp, t) {
      sp.glow(W * .74, hor - 36, 22, '#ff8a3a', .5); for (let i = 0; i < 8; i++) { const f = frac(t * .0005 + i / 8); sp.ell(W * .74 + sin(f * 8 + i) * 6, hor - 38 - f * 30, 4 + f * 6, 3 + f * 4, PX.alpha('#4a3030', .5 * (1 - f))); }
      for (let y = lavaY; y < H; y++) for (let x = 0; x < W; x++) { const v = sin(x * .22 + y * .5 - t * .004) + sin(x * .1 - y * .3 + t * .003); sp.px(x, y, v > 1.1 ? '#fff0a0' : v > .3 ? '#ff9a2a' : v > -.7 ? '#e8501a' : '#a82a14'); }
      sp.glow(W * .5, lavaY, W * .5, '#ff7a2a', .25);
      motes(sp, t, 40, 3, { spd: 1.5, sway: 4, dy: -1, dx: .05, rate: .0002, col: ['#ffd24a', '#ff7a2a', '#ffb050'], alpha: .95, size: 1 });
      const dx = ((t * .012) % (W + 80)) - 40, dy = 20 + sin(t * .002) * 6, fl = sin(t * .015); // flying dragon silhouette
      sp.poly([[dx, dy], [dx - 8, dy - 6 - fl * 4], [dx - 4, dy], [dx - 12, dy - 2 - fl * 3], [dx - 3, dy + 2]], '#1a0a10'); sp.ell(dx + 3, dy, 4, 2, '#1a0a10'); sp.px(dx + 6, dy - 1, '#ffe14d'); sp.cap(dx - 4, dy + 1, dx - 12, dy + 4, 1.4, .5, '#1a0a10');
    }, base
  };
};

SC.night = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .52), r = rng(81);
  gradSky(base, ['#080818', '#1a1038', '#3a1a58', '#6a3a7a'], hor + 6);
  const stars = []; for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * hor * .8; stars.push([x, y, r()]); }
  // castle / city
  ridge(base, hor - 2, 10, .06, 4, '#241838', { to: hor + 10 });
  const bl = []; for (let i = 0; i < 14; i++) { const x = i * W / 13 + r() * 5, w = 9 + r() * 10, h = 18 + r() * 38; bl.push([x, w, h]); feat(base, t => { t.rect(x - w / 2, hor + 6 - h, w, h, '#1c1230'); if (i % 3 === 0) t.poly([[x - w / 2 - 1, hor + 6 - h], [x + w / 2 + 1, hor + 6 - h], [x, hor + 6 - h - 12]], '#2a1a48'); }, 2, true); }
  const wins = []; bl.forEach(([x, w, h], i) => { for (let k = 0; k < Math.floor(h / 8); k++) for (let j = 0; j < Math.floor(w / 5); j++) if (r() < .5) wins.push([x - w / 2 + 2 + j * 5, hor + 6 - h + 4 + k * 8, r()]); });
  for (let y = hor + 6; y < H; y++) base.hline(0, y, W, mix('#2a2038', '#120c1c', (y - hor) / (H - hor)));
  for (let x = 0; x < W; x += 8) for (let y = hor + 8; y < H; y += 6) if (((x + y * 3) % 5) === 0) base.px(x, y, '#3a2e4a');
  for (const x of [W * .1, W * .5, W * .9]) feat(base, t => { t.rect(x - 1, hor + 8, 2, 22, '#14101c'); t.ell(x, hor + 8, 3, 3, '#ffd88a'); }, 1, true);
  const bats = 5;
  return {
    frame(sp, t) {
      stars.forEach(([x, y, ph]) => { const a = .5 + .5 * sin(t * .004 + ph * 30); if (a > .35) sp.px(x, y, PX.alpha('#ffffff', a)); });
      sp.glow(W * .78, H * .15, 20, '#fff4c8', .35); sp.disc(W * .78, H * .15, 8, '#fff6d8'); sp.disc(W * .78 - 2, H * .15 - 1, 6, '#f0e8c0'); sp.disc(W * .78 + 3, H * .15 + 2, 2, '#d8cfa8'); sp.disc(W * .78 - 3, H * .15 + 3, 1.5, '#d8cfa8');
      wins.forEach(([x, y, ph]) => { if (sin(t * .0007 + ph * 40) > -.6) sp.rect(x, y, 3, 3, '#ffd88a'); });
      for (let i = 0; i < bats; i++) { const a = t * .0009 * (1 + i * .12) + i * 1.3, x = W * .5 + cos(a) * (30 + i * 8), y = 14 + sin(a * 1.7) * 9 + i * 3, fl = sin(t * .03 + i) > 0 ? -2 : 1; sp.px(x, y, '#0a0612'); sp.px(x - 1, y + fl, '#0a0612'); sp.px(x + 1, y + fl, '#0a0612'); sp.px(x - 2, y + fl, '#0a0612'); sp.px(x + 2, y + fl, '#0a0612'); }
      for (let k = 0; k < 6; k++) { const x = (k * 47 + t * .006) % W; sp.ell(x, hor + 12 + (k % 3) * 8, 20, 2.4, PX.alpha('#9a7ac8', .12)); }
      const lt = (t * .0004) % 6; if (lt < .12) { const x = W * .3; let yy = 0, xx = x; while (yy < hor) { const nx = xx + (hash('l' + Math.floor(t / 2400) + yy) % 7 - 3), ny = yy + 5; sp.line(xx, yy, nx, ny, '#e8e0ff', 1); xx = nx; yy = ny; } for (let y = 0; y < hor; y++) sp.hline(0, y, W, PX.alpha('#c8b8ff', .12)); }
    }, base
  };
};

SC.dungeon = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .56), r = rng(91);
  base.fillAll('#1c1830'); for (let y = 0; y < hor; y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) { base.rect(x, y, 15, 7, ((x + y) % 3 ? '#2a2444' : '#322a50')); }
  for (let i = 0; i < 4; i++) { const cx = W * (.12 + i * .25); pillar(base, cx, hor + 4, 12, hor - 6, '#4a4268'); }
  for (let y = hor; y < H; y++) { for (let x = 0; x < W; x++) base.px(x, y, ((Math.floor(x / 12) + Math.floor((y - hor) / 7)) & 1) ? '#3a3458' : '#2e2848'); }
  for (let y = hor; y < H; y += 7) base.hline(0, y, W, '#1c1830');
  feat(base, t => { t.poly([[W * .3, hor], [W * .3, hor - 26], [W * .36, hor - 34], [W * .64, hor - 34], [W * .7, hor - 26], [W * .7, hor]], '#14101f'); }, 2, true);
  const circle = [W * .5, H * .76];
  return {
    frame(sp, t) {
      for (let i = 0; i < 4; i++) { const cx = W * (.12 + i * .25), y = hor - 32; sp.glow(cx, y, 18, '#b06aff', .3 + .1 * sin(t * .01 + i)); const fh = 5 + Math.round(sin(t * .025 + i * 2) * 1.5); sp.poly([[cx - 3, y + 3], [cx + 3, y + 3], [cx + sin(t * .01 + i), y - fh]], '#b06aff'); sp.poly([[cx - 1.5, y + 3], [cx + 1.5, y + 3], [cx, y - fh * .5]], '#f0d8ff'); }
      sp.ell(circle[0], circle[1], 30, 9, PX.alpha('#8a5aff', .22)); for (let a = 0; a < 24; a++) { const aa = a / 24 * TAU + t * .0005; sp.px(circle[0] + cos(aa) * 30, circle[1] + sin(aa) * 9, '#c8a0ff'); } for (let a = 0; a < 6; a++) { const aa = a / 6 * TAU - t * .0008; sp.px(circle[0] + cos(aa) * 17, circle[1] + sin(aa) * 5, '#ffffff'); }
      for (let i = 0; i < 5; i++) { const f = t * .0006 + i * 1.2, x = W * (.1 + i * .2) + sin(f) * 4, y = H * .3 + sin(f * 1.3) * 8; sp.rect(x, y, 3, 3, PX.alpha('#c8a0ff', .5 + .4 * sin(t * .005 + i))); sp.px(x + 1, y - 2, '#ffffff'); }
      motes(sp, t, 22, 9, { spd: .6, sway: 3, dy: -.2, col: ['#b890ff', '#ffffff'], alpha: .7, twinkle: 1 });
    }, base
  };
};

SC.worldboss = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .56), r = rng(101);
  gradSky(base, ['#06040f', '#1a0a3a', '#4a1a6a', '#8a2a7a'], hor + 4);
  for (let i = 0; i < 80; i++) base.px(r() * W, r() * hor, ['#ffffff', '#c8a0ff', '#ffa0e0'][i % 3]);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 160; i++) { const a = r() * TAU, d = r() * 40; base.px(W * .5 + cos(a) * d * 1.4 + k * 4, H * .22 + sin(a) * d * .5, PX.alpha(['#8a2aff', '#ff2aa8', '#2ac8ff'][k], .15)); }
  for (const [x, y, w] of [[W * .12, hor - 20, 26], [W * .86, hor - 30, 22], [W * .62, hor - 8, 30]]) feat(base, t => { t.poly([[x - w, y], [x + w, y], [x + w * .6, y + 8], [x, y + w * .7], [x - w * .6, y + 8]], '#3a2a58'); t.rect(x - w, y - 2, w * 2, 4, '#4a8a5a'); t.rect(x - 4, y - 14, 8, 12, '#6a5a88'); }, 2, true);
  for (let y = hor; y < H; y++) base.hline(0, y, W, mix('#2a1a48', '#0e0820', (y - hor) / (H - hor)));
  for (let i = 0; i < 9; i++) { const x = r() * W, y = hor + 6 + r() * (H - hor - 10); base.hline(x, y, 8 + r() * 14, '#3a2a60'); }
  return {
    frame(sp, t) {
      const px = W * .5, py = H * .24, rr = 22; sp.glow(px, py, rr + 14, '#c84aff', .35 + .1 * sin(t * .004)); for (let a = 0; a < 90; a++) { const ang = a / 90 * TAU + t * .0007, d = rr * (.4 + .6 * frac(a * .37)); sp.px(px + cos(ang + d * .15) * d, py + sin(ang + d * .15) * d * .85, ['#ffffff', '#e8a0ff', '#ff6ae0', '#6ad8ff'][a % 4]); } sp.disc(px, py, 4, '#ffffff');
      for (let i = 0; i < 3; i++) { const ph = (t * .0012 + i * 2) % 6; if (ph < .25) { let xx = W * (.2 + i * .3), yy = 0; while (yy < hor) { const nx = xx + (hash('w' + Math.floor(t / 900) + yy + i) % 9 - 4); sp.line(xx, yy, nx, yy + 5, '#f0e0ff', 1); xx = nx; yy += 5; } } }
      motes(sp, t, 38, 4, { spd: 1.6, sway: 4, dy: -.8, rate: .0002, col: ['#e8a0ff', '#6ad8ff', '#ffffff'], alpha: .9, twinkle: 1 });
      for (let i = 0; i < 3; i++) { const x = W * (.12 + i * .38), y = hor - 20 + sin(t * .0015 + i) * 4; sp.hline(x - 3, y + 12, 6, PX.alpha('#c84aff', .3)); }
    }, base
  };
};

SC.dg_dragon = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .58), r = rng(111);
  base.fillAll('#2a1014'); for (let y = 0; y < hor; y += 8) for (let x = ((y / 8) % 2) * 9; x < W; x += 18) base.rect(x, y, 17, 7, ((x * 3 + y) % 4 ? '#3a1a20' : '#46222a'));
  // lava windows
  for (const cx of [W * .2, W * .5, W * .8]) { feat(base, t => { t.rect(cx - 8, hor - 52, 16, 40, '#14080c'); t.ell(cx, hor - 52, 8, 7, '#14080c'); }, 2, true); }
  for (let i = 0; i < 4; i++) pillar(base, W * (.05 + i * .3), hor + 4, 10, hor - 8, '#5a2a30');
  for (let y = hor; y < H; y++) for (let x = 0; x < W; x++) base.px(x, y, ((Math.floor(x / 14) + Math.floor((y - hor) / 8)) & 1) ? '#3a1c22' : '#2c1218');
  const banners = [W * .35, W * .65];
  return {
    frame(sp, t) {
      for (const cx of [W * .2, W * .5, W * .8]) { for (let y = hor - 58; y < hor - 12; y++) for (let x = cx - 7; x < cx + 8; x++) { if (Math.hypot((x - cx) / 8, (y - (hor - 52)) / 7) > 1 && y < hor - 52) continue; const v = sin(x * .4 + t * .004 + y * .2) + sin(y * .3 - t * .003); sp.px(x, y, v > 1 ? '#ffd24a' : v > 0 ? '#ff8a2a' : '#e8402a'); } sp.glow(cx, hor - 30, 22, '#ff6a2a', .25 + .08 * sin(t * .005 + cx)); }
      banners.forEach((x, i) => { for (let k = 0; k < 26; k++) { const o = sin(t * .004 + k * .25 + i) * (k * .09); sp.rect(x + o - 5, 6 + k, 11, 1, k < 3 ? '#d8a030' : k % 6 < 4 ? '#b0201a' : '#8a1812'); } sp.poly([[x - 5, 32], [x + 6, 32], [x, 38]], '#8a1812'); sp.px(x, 18, '#ffd24a'); sp.px(x - 1, 19, '#ffd24a'); sp.px(x + 1, 19, '#ffd24a'); });
      for (const x of [W * .08, W * .5, W * .92]) { const y = hor + 6; sp.rect(x - 4, y, 8, 3, '#5a3a2a'); sp.rect(x - 1, y + 3, 2, 8, '#5a3a2a'); sp.glow(x, y - 4, 16, '#ff8a2a', .35); const fh = 7 + Math.round(sin(t * .03 + x) * 2); sp.poly([[x - 4, y], [x + 4, y], [x + sin(t * .01 + x) * 1.5, y - fh]], '#ff7a1a'); sp.poly([[x - 2, y], [x + 2, y], [x, y - fh * .55]], '#ffe14d'); }
      motes(sp, t, 40, 6, { spd: 1.6, sway: 4, dy: -1, rate: .00022, col: ['#ffd24a', '#ff7a2a'], alpha: .95 });
      const sh = sin(t * .0006); sp.ell(W * .5, H * .86, 24, 5, PX.alpha('#ff5a1a', .12 + .05 * sh));
    }, base
  };
};

SC.dg_ice = (W, H) => {
  const base = new Sp(W, H), hor = Math.round(H * .58), r = rng(121);
  gradSky(base, ['#0a1838', '#183a78', '#3a78b8', '#8ac8f0'], hor + 4);
  for (let i = 0; i < 9; i++) { const x = i * W / 8 + r() * 6; crystal(base, x, hor + 6, 36 + r() * 30, ['#8ad8ff', '#b8ecff', '#6ac0f8'][i % 3]); }
  for (let y = hor; y < H; y++) for (let x = 0; x < W; x++) base.px(x, y, mix('#cfe8ff', '#6aa0d8', ((y - hor) / (H - hor)) * .8 + noise1(x * .2, y) * .15));
  for (let i = 0; i < 8; i++) { const x = r() * W, y = hor + 8 + r() * (H - hor - 10); base.line(x, y, x + 6 + r() * 12, y + 2, '#ffffffaa', 1); }
  for (const x of [W * .1, W * .5, W * .9]) { pillar(base, x, hor + 8, 12, hor - 4, '#b8dcf8'); }
  feat(base, t => { t.poly([[W * .4, hor + 4], [W * .4, hor - 20], [W * .5, hor - 30], [W * .6, hor - 20], [W * .6, hor + 4]], '#6aa8e0'); }, 2, true);
  return {
    frame(sp, t) {
      for (let k = 0; k < 4; k++) for (let x = 0; x < W; x++) { const y = 6 + k * 5 + sin(x * .05 + t * .0008 + k) * 5, c = ['#6affc8', '#6ac8ff', '#c89aff', '#6affc8'][k]; sp.px(x, y, PX.alpha(c, .25)); sp.px(x, y + 1, PX.alpha(c, .15)); }
      for (let i = 0; i < 9; i++) { const x = i * W / 8; sp.glow(x + 4, hor - 14, 16, '#9fe8ff', .12 + .08 * sin(t * .003 + i)); }
      motes(sp, t, 70, 8, { spd: 1.3, sway: 4, dy: 1, dx: -.1, rate: .00026, col: '#ffffff', alpha: .9, size: 1 });
      for (let i = 0; i < 6; i++) { const x = (i * 33 + 10) % W, f = (sin(t * .002 + i * 3) + 1) / 2; sp.px(x, hor + 12 + (i % 3) * 8, PX.alpha('#ffffff', f)); sp.px(x + 1, hor + 12 + (i % 3) * 8, PX.alpha('#ffffff', f * .6)); sp.px(x - 1, hor + 12 + (i % 3) * 8, PX.alpha('#ffffff', f * .6)); }
      sp.ell(W * .5, H * .85, 22, 5, PX.alpha('#9fe8ff', .14 + .06 * sin(t * .004)));
    }, base
  };
};

const KEYS = ['school', 'forest', 'water', 'ruins', 'desert', 'snow', 'dragon', 'night', 'dungeon', 'worldboss'];
function create(key, W, H) {
  const def = SC[key] || SC.school, s = def(W, H), buf = new Sp(W, H);
  return {
    W, H, key,
    render(t) { buf.d.set(s.base.d); s.frame(buf, t); return buf; }
  };
}
PX.scenes = { create, SC, KEYS, SCALE };
})();
