/* 55 AMBERLANDS V24 — PIXEL ART INTEGRATION ("skinner")
 * Does NOT touch save / online / Supabase logic. It only swaps what the player SEES:
 *   scene background -> live animated pixel canvas      monsters / bosses -> animated sprite sheets (by name)
 *   heroes -> animated pixel heroes holding their real weapon     wings / pet / shop goods / ores -> pixel assets
 *   skill effects -> generated 10-frame atlases (see v23_skill_arts.js)     V8 icons / gear icons -> pixel icons
 *   gear modal -> animated "try-on" preview (boss gear gets a rainbow sparkling stage)
 * Everything is re-applied automatically whenever the game re-renders (MutationObserver), so game code stays as it was.
 */
(() => {
'use strict';
const PX = window.PX; if (!PX || !PX.shop) { console.warn('[px24] engine missing'); return; }
const $ = id => document.getElementById(id);
const jobName = j => ({ 'เวท': 'จอมเวท' }[j] || j || 'นักผจญภัย');
const G = () => { try { return { state: (typeof state !== 'undefined') ? state : null, raid: (typeof raid !== 'undefined') ? raid : null }; } catch (e) { return { state: null, raid: null }; } };
const log = (...a) => { try { console.log('[px24]', ...a); } catch (e) { } };
const safe = fn => { try { return fn(); } catch (e) { console.warn('[px24]', e && e.message); } };

/* ---------- 1. shop / ore icons usable from old code: PXI(id, fallback) ---------- */
window.PXI = (id, fb) => {
  try {
    const n = PX.shop.iconFor(id); if (n) return `<img class="ic px24-shop" src="${PX.shop.goodsURL(n)}" alt="">`;
    if (PX.items.icon(id)) return `<img class="ic px24-shop" src="${PX.items.iconURL(id)}" alt="">`;
  } catch (e) { }
  return fb || '';
};

/* ---------- 2. V8 icon table -> pixel icons ---------- */
safe(() => { const IC = window.V8IC; if (!IC) return; for (const n of PX.items.names()) if (n in IC) IC[n] = PX.items.iconURL(n); });

/* ---------- 3. animation mode: heroes fight while AUTO / raid / dungeon is running ---------- */
PX.anim.fightFn = () => {
  const { state, raid } = G(); if (!state) return false;
  if (raid && raid.started && raid.alive !== false) return true;
  if (window.AMBER_DUNGEON && window.AMBER_DUNGEON.isInside && window.AMBER_DUNGEON.isInside()) { const ms = $('mobScene'); return !!ms && ms.style.display !== 'none'; }
  return !!state.auto;
};

/* ---------- 4. avatars used in profile / party cards ---------- */
safe(() => {
  if (!window.AMBER_AVATAR) return; const og = window.AMBER_AVATAR.get;
  window.AMBER_AVATAR.get = (g, j) => { try { return PX.hero.reg(jobName(j), g, null); } catch (e) { return og(g, j); } };
});

/* ---------- 5. LIVE SCENE LAYER ---------- */
let layer = null, ctx = null, scn = null, scnKey = '', scnW = 0, scnH = 0, t0 = performance.now();
function sceneKey() {
  const sc = $('scene'); if (!sc) return '';
  if (sc.classList.contains('amber24-dungeon-scene')) { const k = 'dg_' + (sc.dataset.dungeon || 'dragon'); return PX.scenes.SC[k] ? k : 'dg_dragon'; }
  let i = 0; try { i = mapIndex(); } catch (e) { }
  return PX.scenes.KEYS[i % PX.scenes.KEYS.length];
}
function ensureLayer() {
  const sc = $('scene'); if (!sc) return false;
  if (!layer || layer.parentNode !== sc) { layer = document.createElement('canvas'); layer.id = 'px24Scene'; sc.insertBefore(layer, sc.firstChild); ctx = layer.getContext('2d'); scn = null; }
  return true;
}
function drawScene() {
  if (document.hidden || !ensureLayer()) return;
  const sc = $('scene'), r = sc.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return;
  const S = PX.scenes.SCALE, W = Math.ceil(r.width / S), H = Math.ceil(r.height / S), key = sceneKey();
  if (!scn || key !== scnKey || W !== scnW || H !== scnH) { scnKey = key; scnW = W; scnH = H; layer.width = W; layer.height = H; scn = PX.scenes.create(key, W, H); }
  const sp = scn.render(performance.now() - t0);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(sp.d.buffer.slice(0)), W, H), 0, 0);
}
setInterval(() => safe(drawScene), 83);

/* ---------- 6. skinning helpers ---------- */
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️‍]/gu;
const cleanName = t => String(t || '').replace(/Lv\..*$/, '').replace(EMOJI, '').replace(/\s+/g, ' ').trim();
const isOurs = (src, key) => { const i = PX.anim.info(src); return !!i && (!key || i.set.key === key); };
function skinMob(img, name) {
  if (!img || !name || !PX.creatures.TABLE[name]) return;
  const key = 'mon|' + name, src = img.getAttribute('src');
  if (isOurs(src, key)) return;
  const u = PX.creatures.reg(name); img.src = u; img.classList.add('px24-mob'); img.dataset.px24 = name;
}
function wspecOf(w) { return w ? PX.weaponSpec(w) : null; }
function heroDesc(i) {
  const { state } = G(), people = window.AMBER_SCENE_PLAYERS || [];
  if (i === 0) {
    const currentGear = (state.gear || []).find(g => String(g.id) === String(state.eq?.W));
    const wi = window.AMBER_V12 && window.AMBER_V12.weaponInfo && window.AMBER_V12.weaponInfo();
    return { job: jobName(state.job), gender: state.gender || 'male', w: currentGear || (wi && wi.name ? { w: wi.name, wt: wi.cls, wr: wi.rar, we: wi.enh, wl: wi.lv } : null) };
  }
  const p = people[i - 1];
  if (p) return { job: jobName(p.job), gender: p.gender || 'male', w: p.w ? { w: p.w, wt: p.wt, wr: p.wr, we: p.we, wl: p.wl } : null };
  const cl = (typeof classes !== 'undefined') ? classes[i % 4] : 'ดาบ', job = jobName(cl);
  return { job, gender: i % 2 ? 'female' : 'male', w: { w: 'อาวุธฝึกหัด', wt: job, wr: 0, we: 0, wl: 1 } };
}
function skinSprites() {
  const { state } = G(); if (!state) return;
  document.querySelectorAll('#sprites .sprite').forEach((el, i) => {
    const img = el.querySelector(':scope > img:not(.amber20-characterWing):not(.amber-equipped-weapon):not(.amber23-pet-sprite)'); if (!img) return;
    const d = heroDesc(i), sp = wspecOf(d.w), key = ['hero', PX.hero.jobOf(d.job), d.gender === 'female' ? 'female' : 'male', PX.weaponKey(sp), sp ? sp.cls : ''].join('|');
    if (isOurs(img.getAttribute('src'), key)) return;
    img.src = PX.hero.reg(d.job, d.gender, sp); img.classList.add('px24-hero'); img.classList.add('amber20-characterBody');
  });
}
function skinMisc() {
  document.querySelectorAll('img[src*="wing_amber"],img[src*="wing_violet"]').forEach(im => { const s = im.getAttribute('src') || ''; im.src = PX.shop.wingURL(/amber/.test(s) ? 'sun' : 'moon'); im.classList.add('px24-wing'); });
  document.querySelectorAll('img[src*="pet_dog_v23"]').forEach(im => { im.src = PX.shop.dogURL(); im.classList.add('px24-dog'); });
}
function skinPortrait() {
  const p = $('portrait'), { state } = G(); if (!p || !state) return;
  const d = heroDesc(0), key = 'portrait|' + PX.hero.jobOf(d.job) + '|' + d.gender;
  if (p.dataset.px24 === key) return;
  const fr = PX.hero.frames(d.job, d.gender, null), sp = fr.idle[0].crop(10, 0, 36, 36);
  p.src = sp.toURL(1); p.dataset.px24 = key; p.classList.add('px24-portrait');
}
const headCache = new Map();
function headURL(d) {
  const sp = wspecOf(d.w), key = PX.hero.jobOf(d.job) + '|' + d.gender; let u = headCache.get(key);
  if (!u) { const f = PX.hero.frames(d.job, d.gender, null).idle[0].crop(10, 0, 36, 36); u = f.toURL(1); headCache.set(key, u); } return u;
}
function skinMembers() {
  const { state } = G(); if (!state) return;
  document.querySelectorAll('.members, #members').forEach(box => box.querySelectorAll(':scope > .member').forEach((m, i) => {
    const im = m.querySelector(':scope > img'); if (!im || im.dataset.px24h) return;
    const d = heroDesc(i); im.src = headURL(d); im.dataset.px24h = '1'; im.classList.add('px24-head');
  }));
}
function skinAll() {
  safe(skinMembers);
  safe(() => { const mi = $('mobimg'); if (mi) skinMob(mi, cleanName($('mobname') && $('mobname').textContent)); });
  safe(() => document.querySelectorAll('.monster').forEach(b => skinMob(b.querySelector('img'), cleanName(b.querySelector('span') && b.querySelector('span').textContent))));
  safe(() => document.querySelectorAll('.raidcard').forEach(c => { const im = c.querySelector(':scope > img'); const bb = c.querySelector('p b'); if (im && bb) skinMob(im, cleanName(bb.textContent)); }));
  safe(skinSprites); safe(skinMisc); safe(skinPortrait); safe(tryOnPanel);
}

/* ---------- 7. gear modal: animated try-on ---------- */
function tryOnPanel() {
  const body = $('modalBody'); if (!body || body.querySelector('#px24Try')) return;
  const btn = body.querySelector('[onclick*="equipG("]'); if (!btn) return;
  const id = (btn.getAttribute('onclick').match(/equipG\('([^']+)'\)/) || [])[1]; if (!id) return;
  const { state } = G(); const g = state && (state.gear || []).find(x => String(x.id) === id); if (!g) return;
  const host = body.querySelector('.gi.big') && body.querySelector('.gi.big').parentElement; if (!host) return;
  const wi = window.AMBER_V12 && window.AMBER_V12.weaponInfo && window.AMBER_V12.weaponInfo();
  const cur = wi && wi.name ? { w: wi.name, wt: wi.cls, wr: wi.rar, we: wi.enh, wl: wi.lv } : null;
  const job = g.cls ? jobName(g.cls) : jobName(state.job), gender = state.gender || 'male', boss = PX.items.isBoss(g);
  const u = PX.shop.tryon(job, gender, g, cur), st = PX.shop.stageURL(boss);
  const div = document.createElement('div'); div.id = 'px24Try'; div.className = 'px24-try';
  div.innerHTML = `<div class="px24-tryhd">${boss ? '🌈' : '✨'} ลองใส่ (พิกเซล) · ${job}</div><div class="px24-stage"><img class="px24-stagebg" src="${st}" alt=""><img class="px24-trychar" id="px24TryImg" src="${u.idle}" alt="ลองใส่"></div><div class="px24-trybtns"><button type="button" data-m="idle">🧍 ยืนนิ่ง</button><button type="button" data-m="fight">⚔️ ท่าโจมตี</button></div>`;
  div.querySelectorAll('button').forEach(b => b.onclick = () => { $('px24TryImg').src = u[b.dataset.m]; });
  host.insertAdjacentElement('afterend', div);
}

/* ---------- 8. observer: re-skin after every game render ---------- */
let queued = false;
const schedule = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; skinAll(); }); };
new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'attributes') { const s = m.target.getAttribute && m.target.getAttribute('src'); if (s && PX.anim.info(s)) continue; schedule(); return; }
    for (const n of m.addedNodes) if (n.nodeType === 1) { schedule(); return; }
  }
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

/* ---------- 9. CSS ---------- */
const css = document.createElement('style'); css.id = 'px24css';
css.textContent = `
#scene{background-image:none!important;background-color:#101827!important;overflow:hidden}
#px24Scene{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;z-index:0;pointer-events:none;border-radius:inherit}
#scene.amber24-dungeon-scene{background-image:none!important}
.px24-mob,.px24-hero,.px24-wing,.px24-dog,.px24-shop,.px24-portrait,.px24-gear,.px24-ore{image-rendering:pixelated;image-rendering:crisp-edges}
#scene #mobScene>img#mobimg.px24-mob{width:auto!important;height:auto!important;max-width:none!important;min-width:0!important;zoom:2;object-fit:contain!important;filter:drop-shadow(0 3px 0 #0006)}
@media(max-width:700px){#scene #mobScene>img#mobimg.px24-mob{zoom:1.45}}
.monster span img.ic{width:15px!important;height:15px!important;display:inline!important;margin:0 2px 0 0!important}
.monster img.px24-mob{width:56px!important;height:56px!important;object-fit:contain!important}
.raidcard>img.px24-mob{width:96px!important;height:96px!important;object-fit:contain!important}
#sprites .sprite{flex:1 1 0!important;min-width:0!important;max-width:112px!important;width:auto!important}
@media(max-width:700px){#sprites .sprite{max-width:78px!important}}
#sprites .sprite>img.px24-hero{width:100%!important;max-width:112px!important;height:auto!important;aspect-ratio:64/72;object-fit:contain!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;filter:drop-shadow(0 2px 0 #0007)!important}
#sprites .sprite>.amber-equipped-weapon{display:none!important}
#sprites .sprite>img.amber20-characterWing,#sprites .sprite>img.px24-wing{width:150%!important;height:auto!important;aspect-ratio:96/76;left:calc(50% - 4%)!important;top:-15%!important;transform:translateX(-50%)!important;filter:drop-shadow(0 0 6px #ffcf6a88)!important;animation:none!important;image-rendering:pixelated}
#sprites .sprite>.amber23-pet-sprite{width:50px!important;height:42px!important;right:-34px!important;bottom:0!important;image-rendering:pixelated}
.px24-head,.member>img.px24-head{image-rendering:pixelated;object-fit:cover!important;background:#2a1a4a}
.px24-portrait,.portrait.px24-portrait{object-fit:cover!important;image-rendering:pixelated;background:#2a1a4a}
img.px24-shop{width:40px;height:40px;object-fit:contain}
.amber20-bottle img.px24-shop,.amber21-detailPotion img.px24-shop,.amber20-thumb img.px24-shop{width:64px;height:64px}
.amber23-goods>span img.px24-shop{width:48px;height:48px}.amber232-ore-emoji img.px24-shop{width:36px;height:36px}
.amber20-grid img.px24-wing,.amber20-inventory img.px24-wing,.amber21-detailWing.px24-wing,.amber20-wingSlot img.px24-wing{image-rendering:pixelated;object-fit:contain}
.px24-try{margin:10px auto;max-width:330px;border:1px solid #9a6bd8;border-radius:10px;background:#1a1030;padding:6px;text-align:center}
.px24-tryhd{font-size:12px;color:#ffe9a8;margin-bottom:4px}
.px24-stage{position:relative;height:150px;border-radius:8px;overflow:hidden;border:1px solid #c9a0ff}
.px24-stagebg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;image-rendering:pixelated}
.px24-trychar{position:absolute;left:50%;bottom:4px;height:136px;width:auto;transform:translateX(-50%);image-rendering:pixelated;filter:drop-shadow(0 3px 0 #0008)}
.px24-trybtns{display:flex;gap:6px;justify-content:center;margin-top:6px}.px24-trybtns button{padding:6px 10px}
.px24-gear{width:100%;height:100%;object-fit:contain}
`;
document.head.appendChild(css);

/* ---------- 10. go ---------- */
// Pixel Codex stays reachable as /pixel-codex.html; do not add buttons to the original UI.
PX.anim.start();
document.title = document.title.replace(/\s*·?\s*Pixel V24.*/, '') + ' · Pixel V24';
safe(() => { const l = $('logo'); });
skinAll(); drawScene();
setTimeout(() => { skinAll(); drawScene(); }, 600);
log('pixel layer on');
})();
