/* 55 AMBERLANDS V24 — ITEM SHOP ASSETS (pixel art, drawn by code)
 *  - 2 costume WINGS (sun / moon): flapping, 8-frame loop, two sizes (behind-character + icon)
 *  - hero WITH wings try-on composite
 *  - Pet dog: idle 8 / bark 6 frames
 *  - Shop goods icons on a sparkling tile: dog, 3 skill tomes, DUO card, dog food, reset skill/stat potions, wing tickets
 */
(() => {
'use strict';
const PX = window.PX; if (!PX) return;
const { Sp, mix } = PX;
const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2;

/* ---------------- WINGS ---------------- */
const WP = {
  sun:  { a: '#ffd24a', b: '#ffeb9a', c: '#f0a030', d: '#d9772a', t: '#fffbe6', glow: '#ffcc55', name: 'ปีกสุริยันสวรรค์' },
  moon: { a: '#a583f2', b: '#d9c8ff', c: '#7a58d0', d: '#4e3a9a', t: '#ffffff', glow: '#b99cff', name: 'ปีกจันทรารัตติกาล' }
};
const WW = 96, WH = 76, SX = 46, SY = 40;      // canvas + shoulder anchor
function feather(sp, x0, y0, ang, L, w, col) {
  const dx = cos(ang), dy = sin(ang), nx = -dy, ny = dx;
  const P = (t, s) => [x0 + dx * L * t + nx * w * s, y0 + dy * L * t + ny * w * s];
  sp.poly([P(0, -.35), P(.35, -1), P(.8, -.8), P(1, 0), P(.8, .8), P(.35, 1), P(0, .35)], col);
}
function wingSide(kind, f, n) {
  const c = WP[kind], sp = new Sp(WW, WH), fl = sin(f / n * TAU);          // fl: -1 (down) .. +1 (up)
  const lift = fl * .42 - .05;
  const rows = [
    { cnt: 7, L: 40, w: 5.2, col: [c.c, c.a], off: 0 },      // primaries (back, long)
    { cnt: 6, L: 29, w: 5.2, col: [c.a, c.b], off: .08 },     // secondaries
    { cnt: 5, L: 18, w: 4.6, col: [c.b, c.t], off: .16 }      // coverts (front, short)
  ];
  rows.forEach((r, ri) => {
    for (let i = r.cnt - 1; i >= 0; i--) {
      const aa = PI + .85 - i * (1.2 / (r.cnt)) + lift * .9 + (i / r.cnt) * fl * .12;
      const L = r.L * (1 - (i / r.cnt) * .12) * (1 - ri * .0);
      feather(sp, SX - 3, SY - 2 + ri * 2, aa, L, r.w, r.col[i % 2]);
    }
  });
  // shoulder bone / arm joint
  sp.ell(SX - 3, SY - 2, 4, 4, c.d); sp.ell(SX - 3, SY - 3, 2.6, 2.4, c.b);
  const t = new Sp(WW, WH); t.blit(sp, 0, 0); t.shade(null, { R: 2 });
  const out = new Sp(WW, WH); out.blit(t, 0, 0, { rim: true });
  // glowing tips + feather shafts
  for (let i = 0; i < 7; i++) { const aa = PI + .85 - i * (1.2 / 7) + lift * .9, L = 40 * (1 - (i / 7) * .12); out.px(SX - 3 + cos(aa) * (L - 1), SY - 2 + sin(aa) * (L - 1), c.t); }
  return out;
}
function wingPair(kind, f, n) {
  const L = wingSide(kind, f, n), out = new Sp(WW, WH);
  out.blit(wingSideMirror(L), 0, 0); out.blit(L, 0, 0);
  // magic glow behind
  const g = new Sp(WW, WH); g.glow(SX, SY - 4, 22, WP[kind].glow, .28 + .08 * sin(f / n * TAU)); g.blit(out, 0, 0);
  // sparkle drift
  for (let i = 0; i < 6; i++) { const k = (f / n + i / 6) % 1, x = SX + cos(i * 1.9) * (14 + k * 26), y = SY + 18 - k * 44 + sin(i * 2.3) * 6; if (k < .9) { g.px(x, y, WP[kind].t); if (i % 2) { g.px(x - 1, y, WP[kind].b); g.px(x + 1, y, WP[kind].b); g.px(x, y - 1, WP[kind].b); g.px(x, y + 1, WP[kind].b); } } }
  return g;
}
function wingSideMirror(L) { const o = new Sp(WW, WH); const ax = SX - 3, bx = SX + 2; for (let y = 0; y < WH; y++)for (let x = 0; x < WW; x++) { const c = L.get(x, y); if (c >>> 24) { const mx = Math.round(2 * (SX - .5) - x); if (mx >= 0 && mx < WW) o.d[y * WW + mx] = c; } } return o; }

const wingFrames = {};
function wingSet(kind) { return wingFrames[kind] || (wingFrames[kind] = Array.from({ length: 8 }, (_, i) => wingPair(kind, i, 8))); }
function wingRegURL(kind) { const key = 'wing|' + kind; return PX.anim.has(key) ? PX.anim.get(key).first : PX.anim.reg(key, wingSet(kind), { fps: 8 }); }

/* ---------------- hero + wings composite (for the try-on) ---------------- */
function heroWithWings(kind, job, gender, wspec) {
  const hf = PX.hero.frames(job, gender, wspec), w = wingSet(kind), idle = [], fight = [];
  const W = 112, H = 90, ox = 24, oy = 12;           // hero 64x72 placed at (24,6); wings anchored behind the shoulders
  const comp = (hs, i) => { const s = new Sp(W, H), wf = w[i % 8]; s.blit(wf, 7, 0); s.blit(hs, ox, oy); return s; };
  hf.idle.forEach((h, i) => idle.push(comp(h, i))); hf.fight.forEach((h, i) => fight.push(comp(h, i * 1)));
  return { idle, fight };
}
function heroWingURL(kind, job, gender, wspec) { job = PX.hero.jobOf(job); const key = ['herowing', kind, job, gender, PX.weaponKey(wspec)].join('|'); return PX.anim.has(key) ? PX.anim.get(key).first : PX.anim.reg(key, heroWithWings(kind, job, gender, wspec), { fps: 8, fpsBy: { idle: 6, fight: 11 } }); }

/* ---------------- PET DOG ---------------- */
function dogFrame(i, n, mode) {
  const sp = new Sp(48, 40), t = i / n, bob = mode === 'bark' ? -Math.abs(sin(t * PI)) * 3 : sin(t * TAU) * .6, tail = sin(t * TAU * (mode === 'bark' ? 2 : 1)) * (mode === 'bark' ? 6 : 4);
  const FUR = '#e0a24a', FURL = '#f3c878', FURD = '#b9772c', CREAM = '#fff0cf', DARK = '#3a2418', COL = '#e0364a';
  const by = 22 + bob;
  const legs = mode === 'bark' ? [0, 0, 0, 0] : [sin(t * TAU) * 1.2, -sin(t * TAU) * 1.2, -sin(t * TAU) * 1.2, sin(t * TAU) * 1.2];
  const d = new Sp(48, 40);
  // far legs
  d.rect(12, by + 5, 4, 10 + legs[1], FURD); d.rect(29, by + 5, 4, 10 + legs[3], FURD);
  // tail (wag)
  d.poly([[8, by + 1], [3 - tail * .2, by - 8 + tail * .4], [6 - tail * .2, by - 9 + tail * .4], [11, by - 1]], FURL);
  // body
  d.ell(22, by + 2, 14, 8.5, FUR); d.ell(22, by + 6, 10, 5, CREAM);
  // near legs
  d.rect(14, by + 6, 4.5, 10 + legs[0], FUR); d.rect(31, by + 6, 4.5, 10 + legs[2], FUR); d.rect(14, by + 14 + legs[0], 5, 2, CREAM); d.rect(31, by + 14 + legs[2], 5, 2, CREAM);
  // head
  const hy = by - 7 - (mode === 'bark' ? 2 : 0), hx = 36;
  d.ell(hx, hy, 8, 7, FUR); d.ell(hx + 6, hy + 2, 5.5, 4, CREAM); d.ell(hx + 10.5, hy + .5, 1.8, 1.6, DARK);
  d.poly([[hx - 5, hy - 4], [hx - 8, hy + 5 + sin(t * TAU) * .8], [hx - 3, hy + 3]], FURD);           // floppy ear
  d.poly([[hx + 1, hy - 6], [hx + 4, hy - 11], [hx + 6, hy - 5]], FUR);
  d.rect(hx - 4, by - 1, 10, 2, COL);                                                                  // collar
  d.ell(hx - 4 + 5, by + 2.5, 1.6, 1.6, '#ffd24a');
  d.shade(null, { R: 2 });
  sp.blit(d, 0, 0, { rim: true });
  // face details (after shading so they stay crisp)
  sp.px(hx + 4, hy - 1, DARK); sp.px(hx + 4, hy - 2, '#ffffff'); sp.px(hx + 5, hy - 1, DARK);
  if (mode === 'bark') { sp.rect(hx + 7, hy + 3, 4, 2, '#7a1a1a'); sp.px(hx + 8, hy + 3, '#ffffff'); sp.px(hx + 14, hy - 5, '#ffffff'); sp.px(hx + 15, hy - 7, '#fff1a0'); sp.px(hx + 16, hy - 3, '#fff1a0'); }
  return sp;
}
const dogSet = () => ({ idle: Array.from({ length: 8 }, (_, i) => dogFrame(i, 8, 'idle')), fight: Array.from({ length: 6 }, (_, i) => dogFrame(i, 6, 'bark')) });
function dogURL() { return PX.anim.has('pet|dog') ? PX.anim.get('pet|dog').first : PX.anim.reg('pet|dog', dogSet(), { fps: 8 }); }

/* ---------------- shop goods icons ---------------- */
function goodsTile(size, f, n) {
  const t = new Sp(size, size), k = f / n;
  for (let y = 0; y < size; y++)for (let x = 0; x < size; x++) { const d = Math.hypot(x - size / 2, y - size / 2) / (size * .7); t.px(x, y, mix(mix('#6a3aa8', '#2a1658', Math.min(1, d * 1.1)), '#c8a0ff', Math.max(0, .25 - d * .3))); }
  const r = PX.rng(77); for (let i = 0; i < 9; i++) { const x = Math.floor(r() * (size - 4)) + 2, y = Math.floor(r() * (size - 4)) + 2, ph = (k + r()) % 1; if (ph < .45) { t.px(x, y, '#ffffff'); if (ph < .25) { t.px(x - 1, y, '#e0ccff'); t.px(x + 1, y, '#e0ccff'); t.px(x, y - 1, '#e0ccff'); t.px(x, y + 1, '#e0ccff'); } } }
  for (let i = 0; i < size; i++) { t.px(i, 0, '#e8c05a'); t.px(i, size - 1, '#8a5a1a'); t.px(0, i, '#e8c05a'); t.px(size - 1, i, '#8a5a1a'); }
  return t;
}
const G = {};
const mk = (name, fn, R = 2) => { G[name] = () => { const t = new Sp(24, 24), s = new Sp(24, 24); fn(t); t.shade(null, { R }); s.blit(t, 0, 0, { rim: true }); return s; }; };
const tome = (sym) => d => { d.rect(4, 3, 16, 19, '#7a3aa8'); d.rect(4, 3, 3, 19, '#4a2070'); d.rect(7, 5, 12, 15, '#f1deb0'); sym(d); };
mk('tome_shield', tome(d => { d.poly([[9, 8], [17, 8], [17, 14], [13, 19], [9, 14]], '#3d8cff'); d.rect(12, 9, 2, 9, '#e8f0ff'); }));
mk('tome_regen', tome(d => { d.ell(10.5, 11.5, 2.6, 2.6, '#e0364a'); d.ell(15.5, 11.5, 2.6, 2.6, '#e0364a'); d.poly([[8, 12.5], [18, 12.5], [13, 19]], '#e0364a'); }));
mk('tome_attack', tome(d => { d.poly([[13, 7], [15, 9], [15, 17], [11, 17], [11, 9]], '#cfd9e8'); d.rect(9, 17, 8, 2, '#e8c05a'); d.rect(12, 19, 2, 2, '#6b4228'); }));
mk('duo', d => { d.rect(3, 4, 18, 17, '#fff1c0'); d.rect(3, 4, 18, 3, '#e8503a'); d.ell(9, 14, 3.2, 3.2, '#e0a24a'); d.ell(15.5, 14, 3.2, 3.2, '#8a5a2a'); d.rect(7, 18, 11, 1.5, '#7a3aa8'); });
mk('bone', d => { d.rect(6, 10, 12, 4, '#fff5d8'); d.ell(5, 9, 3, 3, '#fff5d8'); d.ell(5, 15, 3, 3, '#fff5d8'); d.ell(19, 9, 3, 3, '#fff5d8'); d.ell(19, 15, 3, 3, '#fff5d8'); });
mk('dogicon', d => { d.ell(12, 13, 8, 7.5, '#e0a24a'); d.poly([[4, 8], [7, 4], [9, 12]], '#b9772c'); d.poly([[20, 8], [17, 4], [15, 12]], '#b9772c'); d.ell(12, 16, 4.5, 3.5, '#fff0cf'); d.ell(12, 14.5, 1.6, 1.3, '#3a2418'); }, 2);
const potionI = (c, c2) => d => { d.rect(10, 3, 4, 3, '#a9743c'); d.rect(9, 6, 6, 3, '#e8f0f8'); d.ell(12, 15, 7.5, 7, c); d.rect(9, 8, 6, 4, c2); };
mk('reset_skill', potionI('#3ad8a0', '#1a9a70')); mk('reset_stat', potionI('#ffb02e', '#d98a1a'));
mk('ticket_sun', d => { d.rect(2, 6, 20, 12, '#ffd24a'); d.rect(2, 6, 20, 2, '#f0a030'); d.ell(12, 12, 3.6, 3.6, '#fff8d0'); for (let i = 0; i < 8; i++) { const a = i * PI / 4; d.rect(12 + cos(a) * 6 - .5, 12 + sin(a) * 6 - .5, 1.5, 1.5, '#fff8d0'); } });
mk('ticket_moon', d => { d.rect(2, 6, 20, 12, '#a583f2'); d.rect(2, 6, 20, 2, '#7a58d0'); d.ell(12, 12, 4.4, 4.4, '#f2eaff'); d.ell(14, 11, 3.6, 3.6, '#a583f2'); });
const goodsNames = Object.keys(G);
function goodsURL(name) { const key = 'goods|' + name; if (PX.anim.has(key)) return PX.anim.get(key).first; const ic = G[name](), fr = []; for (let f = 0; f < 8; f++) { const t = goodsTile(32, f, 8); t.blit(ic, 4, 4); fr.push(t); } return PX.anim.reg(key, fr, { fps: 6 }); }

PX.shop = {
  WINGS: WP, wingSet, wingURL: wingRegURL, heroWingURL, heroWithWings, dogSet, dogURL, dogFrame,
  goodsNames, goodsURL, goodsSp: n => G[n](), goodsTile,
  /* maps the game's own SKUs/ids to our icons */
  iconFor: id => ({ sun_1: 'ticket_sun', sun_3: 'ticket_sun', sun_7: 'ticket_sun', moon_1: 'ticket_moon', moon_3: 'ticket_moon', moon_7: 'ticket_moon', reset_skill: 'reset_skill', reset_stat: 'reset_stat', dog: 'dogicon', shield: 'tome_shield', regen: 'tome_regen', attack: 'tome_attack', duo: 'duo', food: 'bone' }[id] || null)
};

/* ---------------- TRY-ON: hero wearing / holding a gear piece ---------------- */
function themeColors(spec, f, n) {
  const th = spec && spec.theme, tier = spec ? spec.tier | 0 : 0;
  if (th === 'prism') { const c = PX.hsl((f / n) * 360, .75, .62); return { main: c, dark: PX.hsl((f / n) * 360 + 40, .6, .38), lite: '#ffffff' }; }
  if (th === 'fire') return { main: '#ff7a2a', dark: '#a52a14', lite: '#ffd24a' };
  if (th === 'ice') return { main: '#9fe8ff', dark: '#3a78c8', lite: '#ffffff' };
  return [{ main: '#b9c4d6', dark: '#6a748a', lite: '#e8eef8' }, { main: '#ffb04a', dark: '#a85a1a', lite: '#ffe0a0' }, { main: '#d6a8ff', dark: '#6a3aa8', lite: '#f2e0ff' }, { main: '#fff1a0', dark: '#c98a1a', lite: '#ffffff' }][Math.min(3, tier)];
}
function tryonFrames(job, gender, gear, curWeapon) {
  job = PX.hero.jobOf(job); gender = gender === 'female' ? 'female' : 'male';
  const slot = gear.slot, spec = PX.weaponSpec(slot === 'W' ? gear : { ...gear, cls: gear.cls || 'ดาบ' });
  const wspec = slot === 'W' ? spec : (curWeapon ? PX.weaponSpec(curWeapon) : null);
  const J = PX.hero.JOBS[job], keep = { ...J }, out = { idle: [], fight: [] };
  const boss = PX.items.isBoss(gear), N = 8;
  try {
    for (let i = 0; i < N; i++) {
      const col = themeColors(spec, i, N);
      if (slot === 'S') { J.cloth = col.dark; J.armor = col.main; J.trim = col.lite; }
      else if (slot === 'G') { J.trim = col.main; J.armor = mixc(keep.armor, col.main, .45); }
      else if (slot === 'B') { J.boots = col.main; J.pants = mixc(keep.pants, col.dark, .5); }
      else if (slot === 'R') { J.trim = col.lite; }
      for (const [k, arr, pose] of [['idle', out.idle, PX.hero.idlePose(job, i / N)], ['fight', out.fight, PX.hero.fightPose(job, i)]]) {
        const sp = PX.hero.drawHero(job, gender, wspec, pose);
        if (slot === 'R' || boss) { const aura = new Sp(sp.w, sp.h); aura.glow(28, 40, boss ? 30 : 22, boss ? PX.hsl((i / N) * 360, .8, .65) : col.main, boss ? .35 : .25); aura.blit(sp, 0, 0); arr.push(aura); } else arr.push(sp);
      }
    }
  } finally { Object.assign(J, keep); }
  return out;
}
const mixc = (a, b, t) => mix(a, b, t);
function tryonURLs(job, gender, gear, curWeapon) {
  const key = ['try', job, gender, gear.slot, gear.cls || '', gear.name || '', curWeapon ? curWeapon.name || curWeapon.w || '' : ''].join('|');
  if (!PX.anim.has(key + '|i')) { const fr = tryonFrames(job, gender, gear, curWeapon); PX.anim.reg(key + '|i', fr.idle, { fps: 6 }); PX.anim.reg(key + '|f', fr.fight, { fps: 11 }); }
  return { idle: PX.anim.get(key + '|i').first, fight: PX.anim.get(key + '|f').first };
}
function stageURL(boss) {
  const key = 'stage|' + (boss ? 'rain' : 'purple'); if (PX.anim.has(key)) return PX.anim.get(key).first;
  const fr = []; for (let f = 0; f < 8; f++) fr.push(boss ? PX.items.rainbowTile(72, f, 8) : goodsTile(72, f, 8)); return PX.anim.reg(key, fr, { fps: 6 });
}
PX.shop.tryon = tryonURLs; PX.shop.tryonFrames = tryonFrames; PX.shop.stageURL = stageURL;
})();
