/* 55 AMBERLANDS V24 — PIXEL WEAPONS
 * Every weapon in the game (sword / knuckle-claw / bow / staff) is a short list of flat-colour
 * geometric ops in "local" space (grip at 0,0, tip towards -y). stamp() rotates the ops, rasterises
 * them flat, bevel-shades each material, rims it and composites it. The same ops feed 32px bag icons
 * and the in-hand weapon on the animated hero, so a swing is always in sync with the sprite.
 *
 * spec = { cls:'ดาบ'|'หมัด'|'ธนู'|'จอมเวท', tier:0..3, theme:'normal'|'fire'|'ice'|'prism'|'training',
 *          rar:0..3, enh:0..10, seed:int }
 */
(() => {
'use strict';
const PX = window.PX; if (!PX) return;
const { Sp, P, mix, ramp, rng, hash } = PX;

const THEMES = {
  normal: [
    { blade: '#cfd9e8', core: '#f2f7ff', edge: '#8fa2bd', guard: '#b88a3c', guard2: '#e8c05a', grip: '#6b4228', gem: '#4a8fd8', wood: '#a9743c', metal: '#9aa8bd', accent: '#d9503a' },
    { blade: '#dce4ee', core: '#fff1c8', edge: '#d9503a', guard: '#8a2a22', guard2: '#f0a030', grip: '#4a2a1c', gem: '#ff3a2a', wood: '#7a4a2a', metal: '#b8c4d4', accent: '#ff7a3a' },
    { blade: '#4b3f6b', core: '#9b6bff', edge: '#cfa8ff', guard: '#2a2040', guard2: '#c9a0ff', grip: '#2a1c3a', gem: '#b84aff', wood: '#4a3a5a', metal: '#6a5a8a', accent: '#e05aff' },
    { blade: '#fff3c0', core: '#ffffff', edge: '#ffd24a', guard: '#d9a53a', guard2: '#fff1a0', grip: '#e8e0f0', gem: '#4ae0ff', wood: '#e8c860', metal: '#ffe08a', accent: '#8affff' }
  ],
  fire: { blade: '#ff7a2a', core: '#ffe08a', edge: '#ff3a1a', guard: '#6a1e14', guard2: '#ffb02e', grip: '#3a1a14', gem: '#ff3a2a', wood: '#8a3a1a', metal: '#c8502a', accent: '#ffd24a' },
  ice: { blade: '#8fe0ff', core: '#f2fcff', edge: '#4aa8ff', guard: '#3a5fb0', guard2: '#d8f0ff', grip: '#2a3a68', gem: '#4ae8ff', wood: '#7aa8d8', metal: '#a8d0f0', accent: '#ffffff' },
  prism: { blade: '#ffffff', core: '#fff', edge: '#c9a0ff', guard: '#7a52c8', guard2: '#fff1a0', grip: '#3a2a5a', gem: '#ff62d5', wood: '#c9a0ff', metal: '#e0d0ff', accent: '#74f7b4' },
  training: { blade: '#c9965a', core: '#e0b87a', edge: '#8a5a2a', guard: '#7a5a3a', guard2: '#a9824a', grip: '#5a3a22', gem: '#a9824a', wood: '#a9743c', metal: '#9a8a7a', accent: '#c9965a' }
};
const pal = s => s.theme === 'normal' || !s.theme ? THEMES.normal[Math.max(0, Math.min(3, s.tier | 0))] : (THEMES[s.theme] || THEMES.normal[0]);
const RAIN = ['#ff416e', '#ff9a3c', '#ffe14d', '#7dff7a', '#4de1ff', '#6d8bff', '#c47bff'];

/* ---------- op builders ---------- */
const poly = (pts, c, post) => ({ t: 'poly', pts, c, post });
const ell = (cx, cy, rx, ry, c, post) => ({ t: 'ell', cx, cy, rx, ry, c, post });
const line = (x0, y0, x1, y1, c, th = 1, post) => ({ t: 'line', x0, y0, x1, y1, c, th, post });
const cap = (x0, y0, x1, y1, r0, r1, c, post) => ({ t: 'cap', x0, y0, x1, y1, r0, r1, c, post });
const rect = (x, y, w, h, c, post) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c, post);
const mirror = ops => ops.map(o => { const m = { ...o }; if (o.pts) m.pts = o.pts.map(p => [-p[0], p[1]]); if (o.cx != null) m.cx = -o.cx; if (o.x0 != null) { m.x0 = -o.x0; m.x1 = -o.x1; } return m; });

/* ---------- design: SWORD ---------- */
function swordOps(s) {
  const p = pal(s), t = s.theme === 'training' ? 0 : (s.tier | 0), th = s.theme || 'normal', ops = [];
  const L = 19 + t * 3.2, w = 2.2 + t * .55;
  const rnd = rng((s.seed | 0) + 7);
  // blade body
  const tip = 4 + t * .6;
  if (s.theme === 'training') {
    ops.push(poly([[-2, -3], [2, -3], [2, -L + 3], [0, -L], [-2, -L + 3]], p.blade), poly([[-.6, -4], [.6, -4], [.6, -L + 4], [-.6, -L + 4]], p.core, true));
    ops.push(rect(-4, -4, 8, 2, p.guard), rect(-1.2, -2, 2.4, 8, p.grip), ell(0, 8, 1.8, 1.6, p.guard2));
    return { ops, len: L };
  }
  const base = (th === 'prism') ? null : p.blade;
  if (th === 'prism') {          // rainbow bands along the blade
    const n = 7; for (let i = 0; i < n; i++) { const y0 = -3 - (L - 3 - tip) * i / n, y1 = -3 - (L - 3 - tip) * (i + 1) / n; const ww = w; ops.push(poly([[-ww, y0], [ww, y0], [ww, y1], [-ww, y1]], RAIN[i % 7])); }
    ops.push(poly([[-w, -L + tip], [w, -L + tip], [0, -L]], RAIN[6]));
  } else {
    ops.push(poly([[-w, -3], [w, -3], [w, -L + tip], [0, -L], [-w, -L + tip]], base));
    // serrations / flame / ice shards on outer edge
    if (th === 'fire') { for (let i = 0; i < 4; i++) { const y = -6 - i * (L - 10) / 4; ops.push(poly([[w, y], [w + 2.2 + (i % 2), y - 2], [w, y - 3]], p.edge)); } }
    else if (th === 'ice') { for (let i = 0; i < 3; i++) { const y = -7 - i * (L - 10) / 3; ops.push(poly([[w, y], [w + 2.6, y - 2.5], [w, y - 4]], p.core), poly([[-w, y - 1], [-w - 2, y - 3.5], [-w, y - 4.5]], p.edge)); } }
    else if (t === 1) { for (let i = 0; i < 3; i++) { const y = -6 - i * 4; ops.push(poly([[w, y], [w + 1.8, y - 1], [w, y - 2.4]], p.edge)); } }
    else if (t === 2) { for (let i = 0; i < 5; i++) { const y = -5 - i * 3.6; ops.push(poly([[w, y], [w + 1.7, y - 1.2], [w, y - 2.6]], p.edge), poly([[-w, y - 1], [-w - 1.2, y - 2], [-w, y - 3]], p.edge)); } }
    // fuller (bright centre line)
    ops.push(poly([[-.7, -4], [.7, -4], [.7, -L + tip + 1], [-.7, -L + tip + 1]], p.core));
    if (t >= 3 || th === 'fire' || th === 'ice') for (let i = 0; i < 3; i++) ops.push(ell(0, -8 - i * 4.5, .7, .7, '#ffffff', true));
  }
  // guard
  const gw = 5 + t * 1.6 + (th !== 'normal' ? 1 : 0);
  if (t === 0 && th === 'normal') ops.push(rect(-gw, -3, gw * 2, 2.4, p.guard), ell(-gw, -1.8, 1.3, 1.5, p.guard2), ell(gw, -1.8, 1.3, 1.5, p.guard2));
  else if (t === 1 || th === 'fire') ops.push(rect(-gw, -3, gw * 2, 2.4, p.guard), poly([[gw, -3], [gw + 2, -7], [gw + 3, -3], [gw + 1, -1.5]], p.guard2), poly([[-gw, -3], [-gw - 2, -7], [-gw - 3, -3], [-gw - 1, -1.5]], p.guard2));
  else if (t === 2 || th === 'ice') ops.push(rect(-gw, -3, gw * 2, 2.6, p.guard), poly([[-gw, -3], [-gw + 1, -7], [-gw + 2.5, -3]], p.guard2), poly([[-1.5, -3], [0, -8.5], [1.5, -3]], p.guard2), poly([[gw, -3], [gw - 1, -7], [gw - 2.5, -3]], p.guard2));
  else { for (let i = 0; i < 3; i++) { const dy = -1.6 + i * 1.2, ex = gw + 1.5 - i * 2.2; ops.push(poly([[0, -3 + dy], [ex, -4.5 + dy + i * .6], [ex - .6, -1.5 + dy]], i === 1 ? p.guard2 : p.guard)); ops.push(poly([[0, -3 + dy], [-ex, -4.5 + dy + i * .6], [-ex + .6, -1.5 + dy]], i === 1 ? p.guard2 : p.guard)); } ops.push(rect(-2, -3.4, 4, 3, p.guard2)); }
  ops.push(ell(0, -1.8, 1.5, 1.5, p.gem), ell(-.4, -2.3, .5, .5, '#ffffff', true));
  // grip + pommel
  ops.push(rect(-1.3, -.5, 2.6, 8.4, p.grip));
  ops.push(line(-1, 1.5, 1, 2.5, p.guard2, 1, true), line(-1, 4, 1, 5, p.guard2, 1, true));
  ops.push(ell(0, 8.6, 2, 1.9, t >= 3 ? p.guard2 : p.guard), ell(-.3, 8.2, .6, .6, '#ffffff', true));
  return { ops, len: L };
}

/* ---------- design: KNUCKLE / CLAW (worn on the hand) ---------- */
function clawOps(s) {
  const p = pal(s), t = s.theme === 'training' ? 0 : (s.tier | 0), th = s.theme || 'normal', ops = [];
  // clenched gauntlet seen from the front: four fingers, knuckle caps, thumb, back plate, cuff
  ops.push(rect(-5, -1.5, 10, 5.4, p.metal));
  for (let i = 0; i < 4; i++) { const x = -3.9 + i * 2.6; ops.push(ell(x, -3.4, 1.55, 2.5, p.metal)); ops.push(ell(x, -5.4, 1.35, 1.1, p.guard2)); }
  ops.push(ell(-5.4, -.2, 1.5, 2.7, p.edge === p.metal ? p.guard : p.metal));
  ops.push(line(-4.5, 0.6, 4.5, 0.6, p.guard, 1, true));
  if (t >= 1 || th === 'fire' || th === 'ice') {         // blades from knuckles
    for (let i = 0; i < 3; i++) { const x = -2.6 + i * 2.6, ext = 8 + (i === 1 ? 3 : 0) + t * 1.2; ops.push(poly([[x - 1, -6], [x + 1, -6], [x + .3, -6 - ext], [x - .4, -6 - ext]], p.blade)); ops.push(line(x, -7, x, -5 - ext * .7, p.core, 1, true)); }
  }
  if (t === 2) ops.push(poly([[-5.5, -1], [-9, -8], [-3.5, -4]], p.guard2), poly([[5.5, -1], [9, -8], [3.5, -4]], p.guard2));
  if (t >= 3 || th === 'prism') {
    ops.push(poly([[-5.4, 0], [-10, -5], [-8.6, 2], [-5.4, 3]], p.guard2), poly([[5.4, 0], [10, -5], [8.6, 2], [5.4, 3]], p.guard2));
    ops.push(poly([[-2.4, -6], [0, -15], [2.4, -6]], p.blade));
  }
  ops.push(ell(0, 1.4, 1.9, 1.9, p.gem), ell(-.5, .8, .6, .6, '#ffffff', true));
  ops.push(rect(-4.4, 3.9, 8.8, 3.6, p.grip), line(-4, 5.4, 4, 5.4, p.guard2, 1, true));
  return { ops, len: 14, mid: -3 };
}

/* ---------- design: BOW (grip at 0,0; bow axis vertical; belly bulges to +x, string on the left) ---------- */
function bowOps(s) {
  const p = pal(s), t = s.theme === 'training' ? 0 : (s.tier | 0), th = s.theme || 'normal', ops = [];
  const H = 17 + t * 2.6, bulge = 5 + t * .8, th0 = 2.3 + t * .35;
  const wood = th === 'normal' ? [p.wood, '#7a4a2a', '#d8b878', '#e8d8a0'][t] : p.metal;
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a0 = -H + (2 * H) * i / segs, a1 = -H + (2 * H) * (i + 1) / segs;
    const x0 = bulge * Math.cos((a0 / H) * Math.PI / 2) - bulge * .1, x1 = bulge * Math.cos((a1 / H) * Math.PI / 2) - bulge * .1;
    ops.push(cap(x0, a0, x1, a1, th0 * (1 - Math.abs(a0 / H) * .35), th0 * (1 - Math.abs(a1 / H) * .35), wood));
  }
  // limb tips + ornaments
  const tipX = bulge * Math.cos(Math.PI / 2) - bulge * .1;
  if (t === 1 || th === 'fire') { ops.push(poly([[tipX - 1, -H - 1], [tipX + 3, -H - 5], [tipX + 1, -H + 1]], p.accent), poly([[tipX - 1, H + 1], [tipX + 3, H + 5], [tipX + 1, H - 1]], p.accent)); }
  if (t === 2 || th === 'ice') { ops.push(poly([[tipX - 2, -H], [tipX + 2, -H - 6], [tipX + 3.5, -H + 2]], p.guard2), poly([[tipX - 2, H], [tipX + 2, H + 6], [tipX + 3.5, H - 2]], p.guard2)); }
  if (t >= 3 || th === 'prism') { ops.push(poly([[tipX - 2, -H], [tipX + 1, -H - 7], [tipX + 4, -H + 1]], p.guard2), poly([[tipX - 2, H], [tipX + 1, H + 7], [tipX + 4, H - 1]], p.guard2)); ops.push(ell(0.5, 0, 2.4, 2.4, p.gem), ell(0, -.6, .8, .8, '#fff', true)); }
  // grip
  ops.push(rect(-1.8, -3.4, 3.6, 6.8, p.grip), line(-1.5, -1, 1.5, -1, p.guard2, 1, true), line(-1.5, 1.4, 1.5, 1.4, p.guard2, 1, true));
  // feathers (gale bow)
  if (t === 1) for (let i = 0; i < 3; i++) ops.push(poly([[bulge - 1, -7 + i * 3.2], [bulge + 4, -9 + i * 3.4], [bulge + 1, -5.5 + i * 3.2]], '#7dff9a'));
  const stringC = (t >= 3 || th === 'prism') ? '#fffbd8' : th === 'ice' ? '#e8fbff' : '#f0ead8';
  return { ops, len: H, string: { x: tipX - .2, y0: -H, y1: H, c: stringC }, H, bulge };
}

/* ---------- design: STAFF (grip at 0,0; head up) ---------- */
function staffOps(s) {
  const p = pal(s), t = s.theme === 'training' ? 0 : (s.tier | 0), th = s.theme || 'normal', ops = [];
  const L = 24 + t * 2.6, shaft = th === 'normal' ? [p.wood, '#8a4a2a', '#4a3a6a', '#e8d070'][t] : p.wood;
  ops.push(cap(0, 11, 0, -L + 4, 1.5, 1.6, shaft));
  ops.push(line(-.3, 11, -.3, -L + 6, PX.mix(shaft, '#ffffff', .35), 1, true));
  ops.push(rect(-2, -.8, 4, 2.2, p.guard2), rect(-1.7, 4.2, 3.4, 1.4, p.guard2));
  const hy = -L + 1.5;
  if (t === 0 && (th === 'normal' || th === 'training')) {       // crystal in claw
    ops.push(poly([[-4, hy + 3], [-2.4, hy - 3], [-1, hy + 2]], p.metal), poly([[4, hy + 3], [2.4, hy - 3], [1, hy + 2]], p.metal));
    ops.push(poly([[0, hy - 7], [3.2, hy - 1], [0, hy + 4], [-3.2, hy - 1]], p.gem), poly([[0, hy - 6], [1.2, hy - 2], [0, hy + 1], [-1, hy - 2]], '#d8f4ff', true));
  } else if (t === 1 || th === 'fire') {   // fire orb with horn bracket
    ops.push(poly([[-5, hy - 2], [-3.4, hy + 4], [-1.4, hy + 2], [-3, hy - 6]], p.guard2), poly([[5, hy - 2], [3.4, hy + 4], [1.4, hy + 2], [3, hy - 6]], p.guard2));
    ops.push(ell(0, hy - 1, 3.6, 3.6, p.gem), ell(-.8, hy - 2, 1.3, 1.3, '#ffe9a0', true));
    ops.push(poly([[-1.6, hy - 4], [0, hy - 10], [1.6, hy - 4]], '#ff9a2a'), poly([[-.7, hy - 4], [0, hy - 8], [.7, hy - 4]], '#ffe14d', true));
  } else if (t === 2 || th === 'ice') {    // cosmos orb with ring
    ops.push(ell(0, hy - 1, 4.6, 4.6, p.guard));
    ops.push(ell(0, hy - 1, 3.2, 3.2, p.gem), ell(-1, hy - 2, 1.1, 1.1, '#fff', true));
    ops.push(poly([[-7, hy + 1], [0, hy - 2.5], [7, hy + 1], [0, hy + .6]], p.guard2), poly([[0, hy - 7], [1.4, hy - 4], [-1.4, hy - 4]], p.guard2));
  } else {                                 // star staff: golden wings + star + white orb
    ops.push(poly([[0, hy], [-8, hy - 6], [-6, hy + 1], [-9, hy + 3], [-3, hy + 3]], p.guard2), poly([[0, hy], [8, hy - 6], [6, hy + 1], [9, hy + 3], [3, hy + 3]], p.guard2));
    ops.push(poly([[0, hy - 10], [1.6, hy - 4.5], [7, hy - 4.5], [2.6, hy - 1.5], [4.2, hy + 3.5], [0, hy + .5], [-4.2, hy + 3.5], [-2.6, hy - 1.5], [-7, hy - 4.5], [-1.6, hy - 4.5]], p.guard));
    ops.push(ell(0, hy - 3, 2.6, 2.6, p.gem), ell(-.7, hy - 3.8, .9, .9, '#fff', true));
  }
  return { ops, len: L, head: [0, hy - 1] };
}

const BUILD = { 'ดาบ': swordOps, 'หมัด': clawOps, 'ธนู': bowOps, 'จอมเวท': staffOps };
const memoOps = new Map();
function build(spec) {
  const k = [spec.cls, spec.tier | 0, spec.theme || 'normal', spec.seed | 0].join('|');
  let v = memoOps.get(k); if (!v) { v = (BUILD[spec.cls] || swordOps)(spec); memoOps.set(k, v); } return v;
}

/* ---------- rasterise ---------- */
function raster(dst, ops, x, y, ang, sc, only) {
  const a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const T = (lx, ly) => [x + (lx * ca - ly * sa) * sc, y + (lx * sa + ly * ca) * sc];
  for (const o of ops) {
    if (only === 'flat' && o.post) continue; if (only === 'post' && !o.post) continue;
    if (o.t === 'poly') dst.poly(o.pts.map(p => T(p[0], p[1])), o.c);
    else if (o.t === 'ell') { const c = T(o.cx, o.cy); dst.ell(c[0], c[1], Math.max(.7, o.rx * sc), Math.max(.7, o.ry * sc), o.c); }
    else if (o.t === 'line') { const a0 = T(o.x0, o.y0), a1 = T(o.x1, o.y1); dst.line(a0[0], a0[1], a1[0], a1[1], o.c, Math.max(1, Math.round(o.th * sc))); }
    else if (o.t === 'cap') { const a0 = T(o.x0, o.y0), a1 = T(o.x1, o.y1); dst.cap(a0[0], a0[1], a1[0], a1[1], o.r0 * sc, o.r1 * sc, o.c); }
  }
}
/* Draw a weapon onto dst. x,y = grip pivot; ang in degrees, 0 = tip straight up, + = clockwise. */
function stamp(dst, spec, x, y, ang = 0, o = {}) {
  const b = build(spec), sc = o.scale || 1, tmp = new Sp(dst.w, dst.h);
  raster(tmp, b.ops, x, y, ang, sc, 'flat');
  if (b.string && o.string !== false) { /* bow string drawn after shade */ }
  tmp.shade(null, { R: o.R || 2 });
  raster(tmp, b.ops, x, y, ang, sc, 'post');
  // bow string (pull = px the middle is drawn back)
  if (b.string) {
    const a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), pull = o.pull || 0, S = b.string;
    const T = (lx, ly) => [x + (lx * ca - ly * sa) * sc, y + (lx * sa + ly * ca) * sc];
    const top = T(S.x, S.y0), bot = T(S.x, S.y1), mid = T(S.x - pull, 0);
    tmp.line(top[0], top[1], mid[0], mid[1], S.c, 1); tmp.line(mid[0], mid[1], bot[0], bot[1], S.c, 1);
    if (o.arrow) { // nocked arrow along +x axis in bow space
      const tail = T(S.x - pull, 0), head = T(S.x - pull + (o.arrowLen || 20), 0);
      tmp.line(tail[0], tail[1], head[0], head[1], '#e8d8b0', 1); tmp.px(head[0], head[1], '#ffffff'); tmp.rect(head[0] - 1, head[1] - 1, 2, 2, '#cfd9e8');
      const f0 = T(S.x - pull + 1, 0); tmp.px(f0[0], f0[1] - 1, '#7dff9a'); tmp.px(f0[0], f0[1] + 1, '#7dff9a');
    }
  }
  dst.blit(tmp, 0, 0, { rim: o.rim === false ? false : true });
  return b;
}
/* flame / frost / prism sparkles that follow the weapon (call per frame with time t in 0..1) */
function fx(dst, spec, x, y, ang, t, sc = 1) {
  const th = spec.theme || 'normal'; if (th === 'normal' || th === 'training') return;
  const b = build(spec), a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), r = rng(hash(th) + Math.floor(t * 8));
  const at = (lx, ly) => [x + (lx * ca - ly * sa) * sc, y + (lx * sa + ly * ca) * sc];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const ly = -(r() * (b.len || 20)), lx = (r() - .5) * 5, p = at(lx, ly);
    const up = ((t * 3 + i * .27) % 1);
    if (th === 'fire') { dst.px(p[0], p[1] - up * 4, up < .5 ? '#ffd24a' : '#ff7a2a'); }
    else if (th === 'ice') { dst.px(p[0], p[1] + up * 2, '#ffffff'); if (i % 2) dst.px(p[0] + 1, p[1] + up * 2, '#9fe8ff'); }
    else { dst.px(p[0], p[1] - up * 3, RAIN[(i + Math.floor(t * 7)) % 7]); }
  }
}
/* local-space points of every op (for fitting icons) */
function pointsOf(b) {
  if (b._pts) return b._pts; const out = [];
  for (const o of b.ops) {
    if (o.t === 'poly') o.pts.forEach(p => out.push(p));
    else if (o.t === 'ell') out.push([o.cx - o.rx, o.cy - o.ry], [o.cx + o.rx, o.cy + o.ry]);
    else if (o.t === 'line') out.push([o.x0, o.y0], [o.x1, o.y1]);
    else if (o.t === 'cap') out.push([o.x0 - o.r0, o.y0], [o.x1 + o.r1, o.y1], [o.x0, o.y0 - o.r0], [o.x1, o.y1 - o.r1]);
  }
  return b._pts = out;
}
/* icon: weapon laid diagonally like a classic RO item picture, auto-fitted to the canvas */
function icon(spec, size = 32) {
  const s = new Sp(size, size), b = build(spec), pts = pointsOf(b);
  const ang = spec.cls === 'หมัด' ? 12 : spec.cls === 'ธนู' ? 24 : spec.cls === 'จอมเวท' ? 38 : 45;
  const a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [lx, ly] of pts) { const X = lx * ca - ly * sa, Y = lx * sa + ly * ca; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
  const sc = Math.min(2.4, (size - 4) / Math.max(x1 - x0, y1 - y0));
  const px = size / 2 - ((x0 + x1) / 2) * sc, py = size / 2 - ((y0 + y1) / 2) * sc;
  stamp(s, spec, px, py, ang, { scale: sc, pull: 0 });
  fx(s, spec, px, py, ang, .3, sc);
  return s;
}
PX.weapon = { build, stamp, icon, fx, THEMES, RAIN, pal, raster };

/* ---------- naming: map any gear/appearance info to a spec ---------- */
const TIERWORDS = [
  [/ราชันทมิฬ|ราชันเพลิง|ราชันจันทรา|จักรวาล|นวมราชัน|ธนูราชัน|ราชัน/, 2],
  [/เทพสงคราม|เทพเจ้า|พิพากษา|ดวงดาว|เทพ/, 3],
  [/มังกร|อัคคี|อสูร|พิฆาต|คทาอัคคี|กรงเล็บ|ธนูพิฆาต|วายุ/, 1],
  [/เหล็กกล้า|พรานป่า|ผลึกมานา|ฝึกหัด/, 0]
];
function tierOf(name, lv) {
  name = String(name || '');
  if (/ฝึกหัด/.test(name)) return 0;
  for (const [re, t] of TIERWORDS) if (re.test(name)) return t;
  lv = lv || 1; return lv >= 76 ? 3 : lv >= 51 ? 2 : lv >= 26 ? 1 : 0;
}
function themeOf(name, boss) {
  name = String(name || '');
  if (/ฝึกหัด/.test(name)) return 'training';
  if (/น้ำแข็ง|เหมันต์|ผลึกน้ำแข็ง|หิมะ|แช่แข็ง|วิหาร/.test(name)) return 'ice';
  if (/เพลิง|อัคคี|ไฟ|ลาวา|ปราสาท|เปลวไฟ/.test(name) && boss !== 'prism') return 'fire';
  if (boss) { return /รุ้ง|ดารา/.test(name) ? 'prism' : (PX.hash(name) % 3 === 0 ? 'prism' : PX.hash(name) % 3 === 1 ? 'fire' : 'ice'); }
  return 'normal';
}
/* spec from a game gear object {name, cls, rar, lv, enh, boss, id} or a presence record {w,wt,wr,we,wl} */
PX.weaponSpec = function (g) {
  if (!g) return null;
  const name = g.name || g.w || '', cls = g.cls || g.wt || 'ดาบ', lv = g.lv || g.wl || 1;
  const boss = !!(g.boss === true || g.bossDrop === true || /^dg_/.test(String(g.id || '')) || /🌈|✦|\[เทพเจ้า\]/.test(name));
  const dgBoss = !!(g.boss === true || /^dg_/.test(String(g.id || '')));
  const spec = { cls: ['ดาบ', 'หมัด', 'ธนู', 'จอมเวท'].includes(cls) ? cls : 'ดาบ', tier: tierOf(name, lv), theme: themeOf(name, dgBoss ? 'any' : false), rar: g.rar != null ? g.rar : (g.wr || 0), enh: g.enh != null ? g.enh : (g.we || 0), seed: PX.hash(name) % 997 };
  if (dgBoss) spec.tier = Math.max(spec.tier, 2); if (dgBoss && spec.theme === 'normal') spec.theme = themeOf(name, 'any');
  if (spec.theme === 'training') spec.tier = 0;
  return spec;
};
PX.weaponKey = s => s ? [s.cls, s.tier, s.theme, s.seed].join('|') : 'none';
})();
