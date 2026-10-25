/* 55 AMBERLANDS V24 — PIXEL ITEMS, GEAR ICONS & BOSS RAINBOW TILES
 *  - every gear piece (weapon / armor / gloves / boots / ring) gets a hand-built pixel icon whose look depends on
 *    slot, class, tier (name), theme (fire / ice / prism for dungeon-boss drops) — see PX.weaponSpec()
 *  - boss drops are shown on an animated, sparkling RAINBOW tile (8-frame shimmer) with a jewelled frame
 *  - ores, potions, gems and common bag items replace the old 16px icons
 */
(() => {
'use strict';
const PX = window.PX; if (!PX || !PX.weapon) return;
const { Sp, mix, rng, hash } = PX;
const RAIN = PX.weapon.RAIN;
const sin = Math.sin, cos = Math.cos, PI = Math.PI;

function lay(size, fn, R = 2) { const t = new Sp(size, size); fn(t); t.shade(null, { R }); return t; }
const fin = (t, rim = true) => { const o = new Sp(t.w, t.h); o.blit(t, 0, 0, { rim }); return o; };

/* --------- palettes for armour pieces (tier 0..3 or theme) --------- */
const AP = [
  { a: '#9aa8bd', b: '#6a7a92', t: '#e8c05a', c: '#c43a3a', g: '#4a8fd8' },            // iron
  { a: '#c8402a', b: '#8a2a1a', t: '#f0a030', c: '#ffb02e', g: '#ff3a2a' },            // dragon
  { a: '#4b3f6b', b: '#2a2040', t: '#c9a0ff', c: '#9b6bff', g: '#e05aff' },            // king
  { a: '#fff3c0', b: '#d9a53a', t: '#ffd24a', c: '#ffffff', g: '#4ae0ff' }             // god
];
const TH = {
  fire: { a: '#ff6a2a', b: '#a82a14', t: '#ffd24a', c: '#ffb02e', g: '#ff3a2a' },
  ice: { a: '#8fd8ff', b: '#4a88d8', t: '#e8fbff', c: '#ffffff', g: '#4ae8ff' },
  prism: { a: '#e8d8ff', b: '#9a7ad8', t: '#fff1a0', c: '#ff62d5', g: '#74f7b4' }
};
function palOf(spec) { return spec.theme && TH[spec.theme] ? TH[spec.theme] : AP[Math.max(0, Math.min(3, spec.tier | 0))]; }

/* --------- armour / gloves / boots / ring --------- */
function armorIcon(spec, slot) {
  const p = palOf(spec), S = 32, t = spec.tier | 0, cls = spec.cls, th = spec.theme;
  if (slot === 'S') {
    const s = lay(S, d => {
      if (cls === 'จอมเวท') {                       // robe
        d.poly([[10, 6], [22, 6], [27, 28], [5, 28]], p.a); d.poly([[10, 6], [3, 18], [8, 22], [12, 12]], p.a); d.poly([[22, 6], [29, 18], [24, 22], [20, 12]], p.a);
        d.rect(14, 6, 4, 22, p.t); d.rect(9, 17, 14, 3, p.t); d.rect(5, 26, 22, 2, p.t); d.ell(16, 18.5, 2, 2, p.g); d.rect(3, 16, 5, 3, p.t); d.rect(24, 16, 5, 3, p.t);
      } else if (cls === 'หมัด') {                  // gi
        d.poly([[9, 6], [23, 6], [26, 27], [6, 27]], p.a); d.poly([[9, 6], [3, 15], [7, 19], [11, 11]], p.a); d.poly([[23, 6], [29, 15], [25, 19], [21, 11]], p.a);
        d.poly([[13, 6], [19, 6], [16, 16]], '#f7d0ac'); d.rect(6, 19, 20, 3, p.b); d.rect(18, 19, 3, 8, p.b); d.rect(4, 14, 4, 3, p.t); d.rect(24, 14, 4, 3, p.t);
      } else if (cls === 'ธนู') {                   // leather vest
        d.poly([[10, 6], [22, 6], [25, 27], [7, 27]], p.a); d.poly([[8, 7], [3, 13], [7, 17], [11, 11]], p.b); d.poly([[24, 7], [29, 13], [25, 17], [21, 11]], p.b);
        d.poly([[11, 6], [14, 6], [24, 26], [21, 27]], p.t); d.rect(7, 20, 18, 3, p.b); d.rect(14, 19, 4, 5, p.t); d.rect(10, 5, 12, 2, p.b);
      } else {                                       // plate
        d.poly([[9, 8], [23, 8], [24, 27], [8, 27]], p.a); d.ell(7, 10, 5, 4, p.b); d.ell(25, 10, 5, 4, p.b); d.ell(7, 8.5, 3, 2, p.a); d.ell(25, 8.5, 3, 2, p.a);
        d.rect(13, 8, 6, 19, p.c); d.rect(8, 21, 16, 3, p.t); d.ell(16, 22.5, 2.2, 2.2, p.g); d.rect(10, 6, 12, 3, p.b);
      }
      if (t >= 2 || th) { d.poly([[3, 12], [1, 6], [6, 9]], p.t); d.poly([[29, 12], [31, 6], [26, 9]], p.t); }
    }, 2);
    return fin(s);
  }
  if (slot === 'G') {
    const s = lay(S, d => {
      d.rect(8, 15, 15, 9, p.a); for (let i = 0; i < 4; i++) { d.ell(9.5 + i * 3.6, 12, 1.9, 4.4, p.a); d.ell(9.5 + i * 3.6, 8.5, 1.6, 1.4, p.t); }
      d.ell(6, 18, 2.6, 4.5, p.a); d.rect(7, 23, 17, 6, p.b); d.rect(7, 24.5, 17, 1.4, p.t);
      d.ell(15.5, 19.5, 2.6, 2.6, p.g);
      if (t >= 1 || th) { d.poly([[8, 15], [3, 10], [9, 12]], p.t); d.poly([[23, 15], [28, 10], [22, 12]], p.t); }
      if (t >= 3 || th === 'prism') { d.poly([[8, 25], [2, 22], [3, 29], [8, 28]], p.t); d.poly([[24, 25], [30, 22], [29, 29], [24, 28]], p.t); }
    }, 2);
    return fin(s);
  }
  if (slot === 'B') {
    const s = lay(S, d => {
      d.rect(11, 5, 10, 17, p.a); d.poly([[10, 20], [22, 20], [28, 24], [29, 28], [6, 28], [6, 24]], p.a); d.rect(10, 5, 12, 4, p.b); d.rect(10, 9, 12, 2, p.t);
      d.rect(6, 27, 23, 2.4, p.b); d.ell(16, 16, 2, 2, p.g); d.rect(10, 20, 3, 5, p.b);
      if (t >= 1 || th) { d.poly([[11, 8], [4, 4], [4, 11], [11, 12]], p.t); }
      if (t >= 2 || th) { d.poly([[21, 8], [28, 4], [28, 11], [21, 12]], p.t); }
      if (t >= 3 || th === 'prism') { d.poly([[11, 10], [2, 6], [3, 13], [11, 14]], p.c); }
    }, 2);
    return fin(s);
  }
  // ring
  const s = new Sp(S, S);
  const band = lay(S, d => { d.ell(16, 19, 9.5, 9.5, p.t); }, 3);
  band.d.forEach((c, i) => { const x = i % S, y = (i / S) | 0; if (c >>> 24 && Math.hypot(x - 16, y - 19) < 5.8) band.d[i] = 0; });
  s.blit(band, 0, 0, { rim: true });
  const gem = lay(S, d => { d.poly([[16, 3], [21, 8], [16, 13], [11, 8]], p.g); }, 2); s.blit(gem, 0, 0, { rim: true });
  s.px(14, 6, '#ffffff'); s.px(15, 5, '#ffffff'); s.px(14, 7, '#ffffffaa');
  if (t >= 2 || th) { s.poly([[8, 9], [5, 5], [11, 7]], p.t); s.poly([[24, 9], [27, 5], [21, 7]], p.t); }
  return s;
}

/* --------- rainbow tile for boss drops (animated, 8 frames) --------- */
function rainbowTile(size, f, n = 8) {
  const t = new Sp(size, size), k = f / n;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = ((x + y) / (size * 2) * 2 + 1 - k) % 1, i = Math.floor(v * 7), c = RAIN[i % 7], c2 = RAIN[(i + 1) % 7], tt = (v * 7) % 1;
    let col = mix(c, c2, Math.floor(tt * 3) / 3);
    const d = Math.hypot(x - size / 2 + .5, y - size / 2 + .5) / (size * .62);
    col = mix(col, '#ffffff', Math.max(0, .26 - d * .22)); col = mix(col, '#3a1a6a', Math.min(.32, Math.pow(d, 2.4) * .22 + .04));
    t.px(x, y, col);
  }
  const r = rng(hash('rb' + size));
  for (let i = 0; i < 16; i++) {                               // twinkling 4-point stars
    const x = 2 + Math.floor(r() * (size - 4)), y = 2 + Math.floor(r() * (size - 4)), ph = r(), a = Math.max(0, sin((k + ph) * PI * 2));
    if (a > .55) { t.px(x, y, '#ffffff'); if (a > .8) { t.px(x - 1, y, '#ffffffcc'); t.px(x + 1, y, '#ffffffcc'); t.px(x, y - 1, '#ffffffcc'); t.px(x, y + 1, '#ffffffcc'); } } else if (a > .3) t.px(x, y, '#ffffff99');
  }
  // sweeping glint
  const gx = ((k * 1.6 - .3) * size * 1.6);
  for (let y = 0; y < size; y++) { const x = gx - y; t.px(x, y, '#ffffff77'); t.px(x + 1, y, '#ffffff44'); }
  // jewelled frame
  const fc = ['#fff1a0', '#c9a0ff', '#ff9ad8'][Math.floor(k * 3) % 3];
  for (let i = 0; i < size; i++) { t.px(i, 0, '#3a2060'); t.px(i, size - 1, '#3a2060'); t.px(0, i, '#3a2060'); t.px(size - 1, i, '#3a2060'); t.px(i, 1, i % 4 === Math.floor(k * 4) ? '#ffffff' : fc); t.px(i, size - 2, fc); t.px(1, i, fc); t.px(size - 2, i, i % 4 === Math.floor(k * 4) ? '#ffffff' : fc); }
  for (const [x, y] of [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2]]) { t.px(x, y, '#ffffff'); }
  return t;
}

/* --------- generic icon painter for the small items --------- */
const ICONS = {};
const I = (name, fn, R = 2, size = 24) => { ICONS[name] = () => { const s = new Sp(size, size); const t = new Sp(size, size); fn(t); t.shade(null, { R }); s.blit(t, 0, 0, { rim: true }); return s; }; };
const post = (name, fn) => { const o = ICONS[name]; ICONS[name] = () => { const s = o(); fn(s); return s; }; };
function potion(c, c2) { return d => { d.rect(10, 3, 4, 3, '#a9743c'); d.rect(9, 6, 6, 3, '#e8f0f8'); d.ell(12, 15, 7.5, 7, c); d.ell(12, 12, 4, 3, c); d.rect(9, 8, 6, 4, c2 || c); }; }
I('hp', potion('#e0364a', '#c02a3a')); post('hp', s => { s.px(9, 14, '#ffffff'); s.px(8, 15, '#ffffff88'); s.px(9, 15, '#ffffff'); s.rect(7, 18, 10, 1, '#ff9aa8'); });
I('mp', potion('#3d8cff', '#2a6ad8')); post('mp', s => { s.px(9, 14, '#ffffff'); s.px(8, 15, '#ffffff88'); s.px(9, 15, '#ffffff'); s.rect(7, 18, 10, 1, '#9ad0ff'); });
I('sword', d => { d.poly([[12, 1], [15, 4], [15, 14], [9, 14], [9, 4]], '#cfd9e8'); d.rect(5, 14, 14, 2.5, '#e8c05a'); d.rect(10.5, 16, 3, 5, '#6b4228'); d.ell(12, 22, 2, 1.6, '#e8c05a'); }, 2);
I('bag', d => { d.ell(12, 14, 8, 7.5, '#b8742f'); d.rect(8, 4, 8, 4, '#8a5a2a'); d.rect(6, 7, 12, 2, '#6a4222'); d.rect(10, 12, 4, 4, '#f2c14e'); });
I('chest', d => { d.rect(3, 9, 18, 11, '#b8742f'); d.poly([[3, 9], [21, 9], [19, 4], [5, 4]], '#a9743c'); d.rect(3, 12, 18, 2, '#f2c14e'); d.rect(10, 11, 4, 6, '#ffd24a'); d.rect(3, 4, 18, 1.5, '#f2c14e'); });
I('coin', d => { d.ell(12, 12, 8.5, 8.5, '#f2c14e'); d.ell(12, 12, 5.5, 5.5, '#d99a2a'); d.rect(11, 8, 2, 8, '#f2c14e'); });
I('gem', d => { d.poly([[7, 4], [17, 4], [22, 10], [12, 22], [2, 10]], '#4aa3ff'); d.poly([[7, 4], [17, 4], [14, 10], [10, 10]], '#8ad0ff'); d.poly([[2, 10], [10, 10], [12, 22]], '#2f6fd0'); }, 1);
I('shield', d => { d.poly([[4, 3], [20, 3], [20, 13], [12, 22], [4, 13]], '#b9c4d6'); d.rect(10.5, 4, 3, 16, '#c43a3a'); d.rect(5, 8, 14, 3, '#c43a3a'); d.ell(12, 9.5, 2, 2, '#ffd24a'); }, 2);
I('scroll', d => { d.rect(5, 5, 14, 15, '#f1deb0'); d.ell(5, 12.5, 2.5, 8.5, '#d8c08a'); d.ell(19, 12.5, 2.5, 8.5, '#d8c08a'); d.rect(8, 9, 8, 1, '#8a5a2a'); d.rect(8, 12, 8, 1, '#8a5a2a'); d.rect(8, 15, 6, 1, '#8a5a2a'); }, 1);
I('gear', d => { d.ell(12, 12, 8, 8, '#9aa7b8'); for (let i = 0; i < 8; i++) { const a = i * PI / 4; d.rect(12 + cos(a) * 9 - 2, 12 + sin(a) * 9 - 2, 4, 4, '#9aa7b8'); } });
post('gear', s => { s.ell(12, 12, 3, 3, '#2a2230'); });
I('people', d => { d.ell(8, 8, 3.6, 3.6, '#f6cfa8'); d.ell(8, 17, 5, 5, '#3d8cff'); d.ell(16, 9, 3.6, 3.6, '#f6cfa8'); d.ell(16, 18, 5, 5, '#e0364a'); });
I('star', d => { d.poly([[12, 1], [15, 8], [23, 9], [17, 14], [19, 22], [12, 18], [5, 22], [7, 14], [1, 9], [9, 8]], '#f2c14e'); }, 2);
I('leaf', d => { d.poly([[12, 2], [20, 10], [17, 19], [12, 22], [7, 19], [4, 10]], '#5bc257'); d.rect(11.2, 6, 1.6, 16, '#2d7a34'); });
I('fang', d => { d.poly([[7, 3], [17, 3], [15, 12], [12, 22], [9, 12]], '#f3ead8'); });
I('crystal', d => { d.poly([[12, 1], [18, 7], [15, 22], [9, 22], [6, 7]], '#ff5a6a'); d.poly([[12, 1], [15, 7], [12, 20], [9, 7]], '#ffc0c8'); }, 1);
I('orb', d => { d.ell(12, 12, 8.5, 8.5, '#a45cf0'); }, 4); post('orb', s => { s.ell(9, 8.5, 2.4, 1.6, '#ffffffcc'); s.px(7, 11, '#ffffffaa'); });
I('heart', d => { d.ell(7.5, 8, 5, 5, '#e0364a'); d.ell(16.5, 8, 5, 5, '#e0364a'); d.poly([[3, 10], [21, 10], [12, 21]], '#e0364a'); }, 3);
I('drop', d => { d.poly([[12, 1], [18, 11], [19, 15], [12, 22], [5, 15], [6, 11]], '#3d8cff'); d.ell(12, 15, 7, 6.5, '#3d8cff'); }, 3);
I('crown', d => { d.rect(4, 12, 16, 8, '#f2c14e'); d.poly([[4, 12], [4, 4], [9, 9], [12, 3], [15, 9], [20, 4], [20, 12]], '#f2c14e'); d.ell(12, 15.5, 2, 2, '#e0364a'); });
I('boots', d => { d.rect(7, 3, 8, 13, '#8a5a2a'); d.poly([[6, 15], [15, 15], [21, 19], [21, 22], [5, 22]], '#8a5a2a'); d.rect(6, 3, 10, 3, '#c9954f'); }, 2);
I('ring', d => { d.ell(12, 14, 8, 8, '#f2c14e'); }, 3);
post('ring', s => { for (let y = 0; y < 24; y++)for (let x = 0; x < 24; x++) if (Math.hypot(x - 12, y - 14) < 4.4) s.d[y * 24 + x] = 0; s.sel(); s.poly([[12, 1], [16, 5], [12, 9], [8, 5]], '#4aa3ff'); s.px(11, 3, '#ffffff'); });
/* ores (dungeon materials) */
const ore = (c1, c2, c3) => d => { d.poly([[4, 16], [7, 6], [14, 3], [20, 8], [21, 17], [14, 21]], c1); d.poly([[7, 6], [14, 3], [12, 11]], c2); d.poly([[14, 3], [20, 8], [16, 12], [12, 11]], c3); d.poly([[12, 11], [16, 12], [21, 17], [14, 21], [9, 17]], PX.mix(c1, '#000', .2)); };
I('ore_fire', ore('#e8502a', '#ffb02e', '#ff7a2a'), 2); post('ore_fire', s => { s.px(9, 8, '#fff1a0'); s.px(15, 6, '#ffffff'); s.px(11, 14, '#ffd24a'); });
I('ore_ice', ore('#4a98e8', '#bff0ff', '#8ad8ff'), 2); post('ore_ice', s => { s.px(9, 8, '#ffffff'); s.px(15, 6, '#ffffff'); s.px(11, 14, '#e8fbff'); });
I('ore_prism', ore('#a87ad8', '#fff1a0', '#7dffe0'), 2);
I('gw', d => { d.poly([[12, 1], [19, 8], [12, 22], [5, 8]], '#ff6a3a'); d.poly([[12, 1], [15, 8], [12, 20], [9, 8]], '#ffd24a'); }, 1);
I('ga', d => { d.ell(12, 12, 8.5, 8.5, '#f4f0ff'); }, 4); post('ga', s => { s.ell(9, 8.5, 2.4, 1.6, '#ffffffcc'); });
I('potion', potion('#e0364a'));
PX.items = {
  rainbowTile, armorIcon, RAIN,
  icon(name, size) { const f = ICONS[name]; if (!f) return null; return PX.memo('ico|' + name, f); },
  names: () => Object.keys(ICONS)
};

/* gear -> Sp (32x32) for slot/class/tier/theme */
function gearSp(g) {
  const spec = PX.weaponSpec(g.slot === 'W' ? g : { ...g, cls: g.cls || 'ดาบ' }) || { cls: 'ดาบ', tier: 0, theme: 'normal', seed: 0 };
  if (g.slot === 'W') return PX.weapon.icon(spec, 32);
  return armorIcon(spec, g.slot);
}
const isBoss = g => !!(g && (g.boss === true || g.bossDrop === true || /^dg_/.test(String(g.id || '')) || /🌈/.test(g.name || '')));
PX.items.isBoss = isBoss;
const gearKey = g => ['gear', g.slot, g.cls || '', g.name || '', g.lv || 0, g.rar || 0, g.enh || 0, isBoss(g) ? 'B' : 'N'].join('|');
/* returns the url of (animated if boss) icon */
PX.items.gearURL = function (g) {
  const key = gearKey(g); if (PX.anim.has(key)) return PX.anim.get(key).first;
  const ic = gearSp(g);
  if (!isBoss(g)) return PX.anim.reg(key, [ic], { fps: 1, static: true });
  const frames = []; for (let f = 0; f < 8; f++) { const tile = rainbowTile(36, f, 8); tile.blit(ic, 2, 2, { rim: false }); fxBoss(tile, f, 8); frames.push(tile); }
  return PX.anim.reg(key, frames, { fps: 8 });
};
function fxBoss(t, f, n) { const k = f / n; for (let i = 0; i < 3; i++) { const a = (k + i / 3) * PI * 2; t.px(18 + cos(a) * 15, 18 + sin(a) * 15, '#ffffff'); } }
/* HTML for the game's gi(g,size) */
PX.items.gearImg = (g, s) => `<img class="ic ${s || ''} px24-gear${isBoss(g) ? ' px24-boss' : ''}" src="${PX.items.gearURL(g)}" alt="">`;
PX.items.iconURL = name => { const key = 'icoanim|' + name; if (PX.anim.has(key)) return PX.anim.get(key).first; const sp = PX.items.icon(name); return sp ? PX.anim.reg(key, [sp], { static: true }) : ''; };
PX.items.oreImg = (id, s) => `<img class="ic ${s || ''} px24-ore" src="${PX.items.iconURL(id)}" alt="">`;
})();
