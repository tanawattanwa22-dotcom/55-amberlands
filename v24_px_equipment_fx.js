/* 55 AMBERLANDS V24 — Equipment effects: visuals only.
 * Reads original state.gear/state.eq. Does not change gameplay, save, login, SQL,
 * inventory, shop, stats or any network calls.
 */
(() => {
  'use strict';
  const PX = window.PX;
  if (!PX || !PX.items) return;
  const SLOTS = { W: 'weapon', S: 'armor', G: 'gloves', B: 'boots', R: 'ring' };
  const TYPES = Object.values(SLOTS);
  function currentState() {
    try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; }
  }
  function actualEquipped(st) {
    const out = {};
    if (!st || !st.eq || !Array.isArray(st.gear)) return out;
    for (const [slot, type] of Object.entries(SLOTS)) {
      const id = st.eq[slot];
      if (!id) continue;
      const g = st.gear.find(it => String(it.id) === String(id));
      if (g && PX.items.isBoss(g)) out[type] = g;
    }
    return out;
  }
  const css = document.createElement('style');
  css.id = 'px24EquipmentOnlyCSS';
  css.textContent = `
/* Entire boss cards should glow rainbow—not just an outline. */
.gc.amber-boss-rainbow,.item.amber-boss-rainbow{
  background:linear-gradient(135deg,#ff439cb0,#ffe76dad,#65ffbcae,#5baaffb8,#c16affc0,#ff439cb0)!important;
  background-size:350% 350%!important;
  animation:px24FullRainbow 7s linear infinite!important;
  box-shadow:inset 0 0 5px #fff8,0 0 10px #9159ff8a!important;
}
.amber-boss-rainbow-icon{
  background:linear-gradient(115deg,#ff469abb,#fff08cba,#65ffbeaa,#6b9dffba,#cb82ffbf,#ff469abb)!important;
  background-size:340% 340%!important;
  animation:px24FullRainbow 6s linear infinite!important;
}
@keyframes px24FullRainbow {to{background-position:350% 350%}}
#sprites .sprite.px24-boss-equipped{position:relative;overflow:visible!important}
#sprites .sprite .px24-equipfx{
  position:absolute;pointer-events:none;z-index:5;display:block;
  mix-blend-mode:screen;image-rendering:pixelated;
}
#sprites .sprite .px24-equipfx.armor{
  left:22%;top:12%;width:58%;height:72%;border-radius:47%;
  background:radial-gradient(ellipse,#fff59a18 8%,#fff7a85a 46%,#ff5a992c 65%,transparent 75%);
  box-shadow:0 0 13px 3px #b184ff65;
  animation:px24Aura 1.9s ease-in-out infinite alternate
}
#sprites .sprite .px24-equipfx.weapon{
  left:61%;top:23%;width:34%;height:48%;border-radius:50%;
  background:radial-gradient(ellipse,#ffffffdd 0%,#ffe47b84 27%,#ff7c7050 52%,transparent 70%);
  box-shadow:0 0 9px #f7d85b99;animation:px24Weapon 1.05s ease-in-out infinite alternate
}
#sprites .sprite .px24-equipfx.gloves{
  left:9%;top:38%;width:83%;height:21%;
  background:radial-gradient(circle at 12% 50%,#d4f9fffa 0%,#6aa5ffb0 7%,transparent 19%),radial-gradient(circle at 88% 50%,#d4f9fffa 0%,#bc74ffaa 7%,transparent 19%);
  animation:px24Gloves 1.1s ease-in-out infinite alternate
}
#sprites .sprite .px24-equipfx.boots{
  left:23%;bottom:9%;width:55%;height:15%;border-radius:50%;
  background:radial-gradient(ellipse,#fff9d799 0%,#9bf8ff7b 42%,transparent 72%);
  box-shadow:0 0 7px #9bf8ff70;animation:px24Boots 1.35s ease-in-out infinite alternate
}
#sprites .sprite .px24-equipfx.ring{
  left:18%;top:15%;width:64%;height:69%;border-radius:50%;
  border:2px dotted #f9ce8ecc;box-shadow:0 0 9px #c879ff82,inset 0 0 9px #a0f7ff63;
  animation:px24Ring 4s linear infinite
}
@keyframes px24Aura{from{opacity:.52;transform:scale(.94)}to{opacity:1;transform:scale(1.12)}}
@keyframes px24Weapon{from{opacity:.38;transform:translateY(2px) scale(.88)}to{opacity:1;transform:translateY(-4px) scale(1.15)}}
@keyframes px24Gloves{from{opacity:.38}to{opacity:.95}}
@keyframes px24Boots{from{opacity:.45;transform:scale(.94)}to{opacity:1;transform:scale(1.16)}}
@keyframes px24Ring{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){
  #sprites .sprite .px24-equipfx,.gc.amber-boss-rainbow,.item.amber-boss-rainbow,.amber-boss-rainbow-icon{animation:none!important}
}
`;
  document.head.append(css);
  let lastHero = null;
  let lastKey = '';
  function refresh() {
    const el = document.querySelector('#sprites .sprite');
    if (!el) return;
    const equipped = actualEquipped(currentState());
    const key = TYPES.filter(t => equipped[t]).map(t => t + ':' + equipped[t].id).join('|');
    if (el === lastHero && key === lastKey && el.querySelectorAll(':scope > .px24-equipfx').length === Object.keys(equipped).length) return;
    lastHero = el; lastKey = key;
    for (const n of el.querySelectorAll(':scope > .px24-equipfx')) n.remove();
    el.classList.toggle('px24-boss-equipped', !!key);
    for (const type of TYPES) {
      if (!equipped[type]) continue;
      const e = document.createElement('span');
      e.className = 'px24-equipfx ' + type;
      e.setAttribute('aria-hidden','true');
      el.append(e);
    }
  }
  setInterval(() => { if (!document.hidden) { try { refresh(); } catch (err) { console.warn('[px24 equipment fx]', err); } } }, 350);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh();
  window.AMBER_PX_VISUAL_EQUIPMENT = Object.freeze({ refresh, equippedSlots: () => Object.keys(actualEquipped(currentState())) });
})();
