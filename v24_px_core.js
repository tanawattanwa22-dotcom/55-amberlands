/* 55 AMBERLANDS V24 — PIXEL ENGINE (core)
 * Every pixel in this layer is drawn by code at runtime (no image files, no cut/paste art).
 * Style target: Ragnarok-Online-like 2D sprites: chibi proportions, selective dark outlines,
 * cel-shaded ramps with hue-shifted highlights/shadows, squash & stretch animation.
 *
 *   PX.Sp        software sprite buffer (hard-alpha pixel art, optional soft glow)
 *   PX.ramp()    6-tone ramp from a base colour
 *   Sp.shade()   bevel shading from the silhouette (light from top-left)
 *   Sp.blit()    composite with optional rim line (interior outlines between parts)
 *   Sp.sel()     "selective outline": outline coloured by the pixel it hugs
 *   PX.anim      tiny animation player: <img> elements whose src is a registered frame
 *                are advanced in place, so the game's own render code needs no changes.
 */
(() => {
'use strict';
const PX = window.PX = window.PX || {};
PX.version = 'v24.1';

/* ---------------- maths / random ---------------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
PX.clamp = clamp; PX.lerp = lerp;
PX.ease = { io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t, back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); } };
PX.hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
PX.rng = seed => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
// smooth value noise 1D / 2D (deterministic)
PX.noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i, h = k => (PX.hash(k + ':' + seed) % 10000) / 10000, u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u); };

/* ---------------- colour ---------------- */
const pcache = new Map();
function P(c) {                    // anything -> packed ABGR uint32
  if (typeof c === 'number') return c >>> 0;
  let v = pcache.get(c); if (v !== undefined) return v;
  let s = String(c).trim(), r = 0, g = 0, b = 0, a = 255;
  if (s[0] === '#') {
    s = s.slice(1);
    if (s.length === 3 || s.length === 4) s = s.split('').map(x => x + x).join('');
    r = parseInt(s.slice(0, 2), 16); g = parseInt(s.slice(2, 4), 16); b = parseInt(s.slice(4, 6), 16);
    if (s.length >= 8) a = parseInt(s.slice(6, 8), 16);
  } else if (/^rgba?\(/.test(s)) {
    const m = s.match(/[\d.]+/g).map(Number); r = m[0]; g = m[1]; b = m[2]; if (m.length > 3) a = Math.round(m[3] * 255);
  }
  v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; pcache.set(c, v); return v;
}
const pack = (r, g, b, a = 255) => ((clamp(a | 0, 0, 255) << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
const unpack = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];
PX.P = P; PX.pack = pack; PX.unpack = unpack;
PX.hex = c => { const [r, g, b] = unpack(P(c)); return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); };
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
PX.hsl = (h, s, l, a = 255) => { const [r, g, b] = hsl2rgb(h, clamp(s, 0, 1), clamp(l, 0, 1)); return pack(r, g, b, a); };
PX.mix = (a, b, t) => { const A = unpack(P(a)), B = unpack(P(b)); return pack(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), lerp(A[3], B[3], t)); };
PX.alpha = (c, a) => { const [r, g, b] = unpack(P(c)); return pack(r, g, b, a * 255); };
PX.lum = c => { const [r, g, b] = unpack(P(c)); return (r * .299 + g * .587 + b * .114) / 255; };
PX.shift = (c, dh = 0, ds = 0, dl = 0) => { const [r, g, b, a] = unpack(P(c)), [h, s, l] = rgb2hsl(r, g, b), [R, G, B] = hsl2rgb(h + dh, clamp(s + ds, 0, 1), clamp(l + dl, 0, 1)); return pack(R, G, B, a); };
const hueToward = (h, target, k) => { let d = ((target - h + 540) % 360) - 180; return h + d * k; };
/* 6-tone ramp: [0]=deep(outline) [1]=dark [2]=shade [3]=base [4]=light [5]=highlight; warm highlights, cool shadows */
const rcache = new Map();
PX.ramp = function (base) {
  const key = typeof base === 'number' ? base : String(base); let r = rcache.get(key); if (r) return r;
  const [R, G, B] = unpack(P(base));
  const mul = (a, b, c) => pack(R * a, G * b, B * c);
  const tint = (c, t) => PX.mix(pack(R, G, B), c, t);
  const lum = (R * .299 + G * .587 + B * .114) / 255;
  const t = [mul(.34, .26, .46), mul(.56, .45, .68), mul(.79, .70, .86), pack(R, G, B), tint('#fff2c8', .28 - lum * .06), tint('#fffbe6', .58 - lum * .10)];
  r = { t, dk2: t[0], dk: t[1], sh: t[2], md: t[3], lt: t[4], hi: t[5], base: t[3] }; rcache.set(key, r); return r;
};

/* ---------------- Sprite buffer ---------------- */
class Sp {
  constructor(w, h) { this.w = w | 0; this.h = h | 0; this.d = new Uint32Array(this.w * this.h); }
  clone() { const s = new Sp(this.w, this.h); s.d.set(this.d); return s; }
  clear() { this.d.fill(0); return this; }
  get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[y * this.w + x]; }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    c = P(c); const a = c >>> 24; if (a === 255) this.d[y * this.w + x] = c; else if (a > 0) this.d[y * this.w + x] = over(this.d[y * this.w + x], c);
    return this;
  }
  fillAll(c) { this.d.fill(P(c)); return this; }
  rect(x, y, w, h, c) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); for (let j = 0; j < h; j++)for (let i = 0; i < w; i++)this.px(x + i, y + j, c); return this; }
  hline(x, y, w, c) { return this.rect(x, y, w, 1, c); }
  vline(x, y, h, c) { return this.rect(x, y, 1, h, c); }
  ell(cx, cy, rx, ry, c) {
    rx = Math.max(.5, rx); ry = Math.max(.5, ry);
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++)for (let x = x0; x <= x1; x++) { const dx = (x - cx) / (rx + .08), dy = (y - cy) / (ry + .08); if (dx * dx + dy * dy <= 1) this.px(x, y, c); }
    return this;
  }
  disc(cx, cy, r, c) { return this.ell(cx, cy, r, r, c); }
  line(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
    const r = (th - 1) / 2;
    for (; ;) {
      if (th <= 1) this.px(x0, y0, c); else this.ell(x0, y0, r + .5, r + .5, c);
      if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  /* tapered capsule between two points (limbs, tails, horns) */
  cap(x0, y0, x1, y1, r0, r1, c) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6));
    for (let i = 0; i <= n; i++) { const t = i / n; this.ell(lerp(x0, x1, t), lerp(y0, y1, t), lerp(r0, r1, t), lerp(r0, r1, t), c); }
    return this;
  }
  poly(pts, c) {
    let minY = 1e9, maxY = -1e9; for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    minY = Math.floor(minY); maxY = Math.ceil(maxY);
    for (let y = minY; y <= maxY; y++) {
      const yy = y + .5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); for (let x = xa; x < xb; x++) this.px(x, y, c); }
    }
    return this;
  }
  /* composite another sprite. opts: flip, add (additive glow), alpha(0..1), rim(colour|true), tint */
  blit(src, ox = 0, oy = 0, o = {}) {
    ox = Math.round(ox); oy = Math.round(oy);
    if (o.rim) this._rim(src, ox, oy, o);
    const fl = !!o.flip, al = o.alpha == null ? 1 : o.alpha;
    for (let y = 0; y < src.h; y++) {
      const ty = y + oy; if (ty < 0 || ty >= this.h) continue;
      for (let x = 0; x < src.w; x++) {
        const tx = (fl ? src.w - 1 - x : x) + ox; if (tx < 0 || tx >= this.w) continue;
        let c = src.d[y * src.w + x]; if (!(c >>> 24)) continue;
        if (o.tint != null) c = tintPx(c, o.tint, o.tintAmt == null ? .6 : o.tintAmt);
        if (al < 1) c = (c & 0x00ffffff | (Math.round((c >>> 24) * al) << 24)) >>> 0;
        const i = ty * this.w + tx; this.d[i] = o.add ? addPx(this.d[i], c) : over(this.d[i], c);
      }
    }
    return this;
  }
  _rim(src, ox, oy, o) {
    const fl = !!o.flip, w = src.w, h = src.h;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (src.d[y * w + x] >>> 24) > 128;
    for (let y = -1; y <= h; y++)for (let x = -1; x <= w; x++) {
      if (solid(x, y)) continue; let best = 0, bl = 9;
      for (const [dx, dy] of N4) if (solid(x + dx, y + dy)) { const c = src.d[(y + dy) * w + (x + dx)], l = lumPx(c); if (l < bl) { bl = l; best = c; } }
      if (!best) continue;
      const tx = (fl ? w - 1 - x : x) + ox, ty = y + oy; if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
      this.d[ty * this.w + tx] = o.rim === true ? darkOf(best) : P(o.rim);
    }
  }
  /* selective outline on transparent pixels touching the sprite (sprite needs 1px margin). */
  sel(col, diag = false) {
    const w = this.w, h = this.h, out = this.d.slice();
    for (let y = 0; y < h; y++)for (let x = 0; x < w; x++) {
      if (this.d[y * w + x] >>> 24) continue; let best = 0, bl = 9;
      for (const [dx, dy] of (diag ? N8 : N4)) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const c = this.d[yy * w + xx]; if ((c >>> 24) > 128) { const l = lumPx(c); if (l < bl) { bl = l; best = c; } } }
      if (best) out[y * w + x] = col ? P(col) : darkOf(best);
    }
    this.d = out; return this;
  }
  padded(n) { const s = new Sp(this.w + n * 2, this.h + n * 2); s.blit(this, n, n); return s; }
  flipX() { const s = new Sp(this.w, this.h); for (let y = 0; y < this.h; y++)for (let x = 0; x < this.w; x++)s.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x]; return s; }
  crop(x, y, w, h) { const s = new Sp(w, h); for (let j = 0; j < h; j++)for (let i = 0; i < w; i++)s.d[j * w + i] = this.get(x + i, y + j); return s; }
  bbox() { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < this.h; y++)for (let x = 0; x < this.w; x++)if (this.d[y * this.w + x] >>> 24) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; }
  /* whole-sprite colour flash (hurt) */
  tint(c, amt) { const t = P(c); for (let i = 0; i < this.d.length; i++) if (this.d[i] >>> 24) this.d[i] = tintPx(this.d[i], t, amt); return this; }
  alphaMul(a) { for (let i = 0; i < this.d.length; i++) { const c = this.d[i]; if (c >>> 24) this.d[i] = (c & 0x00ffffff | (Math.round((c >>> 24) * a) << 24)) >>> 0; } return this; }
  /* soft radial glow (additive-friendly, alpha falls off) */
  glow(cx, cy, r, col, a = 1, add = true) {
    const c = unpack(P(col)); const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++)for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue; const d = Math.hypot(x - cx, y - cy) / r; if (d >= 1) continue;
      const q = Math.pow(1 - d, 1.7) * a; if (q < .03) continue; const p = pack(c[0], c[1], c[2], q * 255), i = y * this.w + x;
      this.d[i] = add ? addPx(this.d[i], p) : over(this.d[i], p);
    }
    return this;
  }
  /* quantised glow rings (more pixel-art than smooth falloff) */
  halo(cx, cy, r, col, a = .5, steps = 3) { for (let i = steps; i >= 1; i--)this.ell(cx, cy, r * i / steps, r * i / steps, PX.alpha(col, a * (1 - i / (steps + 1)))); return this; }

  /* ---------- bevel shading ----------
   * Treat each distinct flat colour as a material. Compute distance-to-edge inside the material,
   * derive a height-field normal and light it from the top-left. Result: rounded cel shading. */
  shade(map, o = {}) {
    const w = this.w, h = this.h, R = o.R || 3, L = o.light || [-.55, -.62, .56], str = o.strength == null ? 1 : o.strength, vb = o.vbias || 0, dith = !!o.dither;
    const groups = new Map();
    for (let i = 0; i < this.d.length; i++) { const c = this.d[i]; if (c >>> 24) { let g = groups.get(c); if (!g) groups.set(c, g = []); g.push(i); } }
    const out = this.d.slice();
    for (const [col, idx] of groups) {
      const ramp = map ? (map[col] || map[PX.hex(col)] || (typeof map === 'function' ? map(col) : null)) : null;
      const rp = ramp ? (ramp.t ? ramp : PX.ramp(ramp)) : PX.ramp(col);
      const inG = new Uint8Array(w * h); for (const i of idx) inG[i] = 1;
      const dist = new Float32Array(w * h).fill(99);
      for (const i of idx) { const x = i % w, y = (i / w) | 0; let edge = false; for (const [dx, dy] of N4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h || !inG[yy * w + xx]) { edge = true; break; } } dist[i] = edge ? 1 : 99; }
      // chamfer passes
      for (let y = 0; y < h; y++)for (let x = 0; x < w; x++) { const i = y * w + x; if (!inG[i]) continue; let d = dist[i]; if (x > 0) d = Math.min(d, dist[i - 1] + 1); if (y > 0) d = Math.min(d, dist[i - w] + 1); if (x > 0 && y > 0) d = Math.min(d, dist[i - w - 1] + 1.4); if (x < w - 1 && y > 0) d = Math.min(d, dist[i - w + 1] + 1.4); dist[i] = d; }
      for (let y = h - 1; y >= 0; y--)for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!inG[i]) continue; let d = dist[i]; if (x < w - 1) d = Math.min(d, dist[i + 1] + 1); if (y < h - 1) d = Math.min(d, dist[i + w] + 1); if (x < w - 1 && y < h - 1) d = Math.min(d, dist[i + w + 1] + 1.4); if (x > 0 && y < h - 1) d = Math.min(d, dist[i + w - 1] + 1.4); dist[i] = d; }
      const hf = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return 0; const i = y * w + x; return inG[i] ? Math.min(dist[i], R) / R : 0; };
      // y extent for vertical bias
      let ymin = 1e9, ymax = -1; for (const i of idx) { const y = (i / w) | 0; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
      for (const i of idx) {
        const x = i % w, y = (i / w) | 0;
        const gx = (hf(x + 1, y - 1) + 2 * hf(x + 1, y) + hf(x + 1, y + 1)) - (hf(x - 1, y - 1) + 2 * hf(x - 1, y) + hf(x - 1, y + 1));
        const gy = (hf(x - 1, y + 1) + 2 * hf(x, y + 1) + hf(x + 1, y + 1)) - (hf(x - 1, y - 1) + 2 * hf(x, y - 1) + hf(x + 1, y - 1));
        let nx = -gx * .55 * str, ny = -gy * .55 * str, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
        let l = nx * L[0] + ny * L[1] + nz * L[2];
        if (vb && ymax > ymin) l -= vb * ((y - ymin) / (ymax - ymin) - .45);
        let k;
        if (dith) { const j = ((x + y) & 1) * .05 - .025; l += j; }
        k = l < .20 ? 1 : l < .44 ? 2 : l < .80 ? 3 : l < .94 ? 4 : 5;
        out[i] = rp.t[k];
      }
    }
    this.d = out; return this;
  }
  toCanvas(scale = 1) {
    const c = document.createElement('canvas'); c.width = this.w * scale; c.height = this.h * scale; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (scale === 1) { const id = new ImageData(new Uint8ClampedArray(this.d.buffer.slice(0)), this.w, this.h); x.putImageData(id, 0, 0); return c; }
    const base = this.toCanvas(1); x.drawImage(base, 0, 0, c.width, c.height); return c;
  }
  toURL(scale = 1) { return this.toCanvas(scale).toDataURL(); }
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
function over(dst, src) {
  const sa = src >>> 24; if (sa === 255 || !(dst >>> 24)) return src; if (!sa) return dst;
  const da = dst >>> 24, a = sa / 255, ia = 1 - a, oa = a + da / 255 * ia;
  const r = ((src & 255) * a + (dst & 255) * (da / 255) * ia) / oa, g = (((src >>> 8) & 255) * a + ((dst >>> 8) & 255) * (da / 255) * ia) / oa, b = (((src >>> 16) & 255) * a + ((dst >>> 16) & 255) * (da / 255) * ia) / oa;
  return pack(r, g, b, oa * 255);
}
function addPx(dst, src) {
  const sa = (src >>> 24) / 255; if (!sa) return dst; const da = dst >>> 24;
  if (!da) return (src & 0x00ffffff | (Math.round(sa * 255) << 24)) >>> 0;
  return pack((dst & 255) + (src & 255) * sa, ((dst >>> 8) & 255) + ((src >>> 8) & 255) * sa, ((dst >>> 16) & 255) + ((src >>> 16) & 255) * sa, Math.max(da, sa * 255));
}
function tintPx(c, t, amt) { const a = c >>> 24; return pack(lerp(c & 255, t & 255, amt), lerp((c >>> 8) & 255, (t >>> 8) & 255, amt), lerp((c >>> 16) & 255, (t >>> 16) & 255, amt), a); }
function lumPx(c) { return ((c & 255) * .299 + ((c >>> 8) & 255) * .587 + ((c >>> 16) & 255) * .114) / 255; }
function darkOf(c) { const [r, g, b] = unpack(c), [h, s, l] = rgb2hsl(r, g, b), [R, G, B] = hsl2rgb(hueToward(h, 262, .28), clamp(s * .9 + .06, 0, 1), Math.max(.05, l * .30)); return pack(R, G, B); }
PX.Sp = Sp; PX.darkOf = darkOf;
PX.sp = (w, h) => new Sp(w, h);

/* ---------------- sheets / helpers ---------------- */
PX.sheet = function (frames, cols, o = {}) {      // contact sheet canvas of Sp frames
  const s = o.scale || 2, pad = o.pad == null ? 4 : o.pad, fw = Math.max(...frames.map(f => f.w)), fh = Math.max(...frames.map(f => f.h));
  const rows = Math.ceil(frames.length / cols), c = document.createElement('canvas'); c.width = cols * (fw * s + pad) + pad; c.height = rows * (fh * s + pad) + pad;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, c.width, c.height); }
  frames.forEach((f, i) => { const cx = pad + (i % cols) * (fw * s + pad), cy = pad + Math.floor(i / cols) * (fh * s + pad); if (o.cell) { x.fillStyle = o.cell; x.fillRect(cx, cy, fw * s, fh * s); } x.drawImage(f.toCanvas(1), cx + ((fw - f.w) >> 1) * s, cy + (fh - f.h) * s, f.w * s, f.h * s); });
  return c;
};

/* ---------------- animation player ---------------- */
const byUrl = new Map();          // frame url -> {set, i}
const sets = new Map();
PX.anim = {
  mode: 'idle',                    // 'idle' | 'fight' : heroes switch loops with this
  fightFn: null,
  reg(key, states, o = {}) {       // states: {idle:[Sp...], fight:[Sp...]} or array of Sp
    if (Array.isArray(states)) states = { idle: states };
    if (sets.has(key)) return sets.get(key).first;
    const set = { key, states: {}, fps: o.fps || 10, first: null, sync: o.sync !== false, static: !!o.static };
    for (const k in states) {
      const fr = states[k].map(f => f.toURL ? f.toURL(1) : f);
      const fps = (o.fpsBy && o.fpsBy[k]) || set.fps;
      set.states[k] = { urls: fr, fps };
      fr.forEach((u, i) => { if (!byUrl.has(u)) byUrl.set(u, { set, state: k, i }); });
    }
    set.first = (set.states.idle || Object.values(set.states)[0]).urls[0];
    sets.set(key, set); return set.first;
  },
  has: key => sets.has(key),
  get: key => sets.get(key),
  info: url => byUrl.get(url),
  step: stepImgs
};
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const phase = new WeakMap();
function pick(set, mode) { return set.states[mode] || set.states.idle || Object.values(set.states)[0]; }
function updateImg(im, now, mode) {
  const s = im.getAttribute('src'); if (!s) return; const e = byUrl.get(s); if (!e) return;
  const st = pick(e.set, e.set.states[mode] ? mode : 'idle'); if (!st || !st.urls.length) return;
  let ph = phase.get(im); if (ph == null) { ph = e.set.sync ? 0 : Math.random() * 4000; phase.set(im, ph); }
  const n = st.urls.length, idx = reduce ? 0 : Math.floor((now + ph) / (1000 / st.fps)) % n, u = st.urls[idx];
  if (u !== s) im.src = u;
}
function stepImgs() {
  if (document.hidden) return; const now = performance.now(); let mode = PX.anim.mode;
  try { if (PX.anim.fightFn) mode = PX.anim.fightFn() ? 'fight' : 'idle'; } catch (e) { }
  PX.anim.mode = mode;
  const imgs = document.images; for (let i = 0; i < imgs.length; i++) updateImg(imgs[i], now, mode);
}
PX.anim.start = function () {
  if (PX.anim._t) return; PX.anim._t = setInterval(stepImgs, 66);
  try {
    const mo = new MutationObserver(ms => { const now = performance.now(), mode = PX.anim.mode; for (const m of ms) { for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.tagName === 'IMG') updateImg(n, now, mode); else if (n.querySelectorAll) n.querySelectorAll('img').forEach(im => updateImg(im, now, mode)); } } });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) { }
};

/* ---------------- generic frame cache ---------------- */
const cache = new Map();
PX.memo = (key, fn) => { if (cache.has(key)) return cache.get(key); const v = fn(); cache.set(key, v); return v; };
})();
