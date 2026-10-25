/* 55 AMBERLANDS V15 - targeted fixes only.
   - Potions purchased with Gold live in state.potHP/potMP (single source of truth).
   - Show those counts in both bags, use from either location, never double-spend.
   - Normal (non-skill) attacks now display impact VFX and send visual-only events to
     visible teammates targeting the same mob. This NEVER changes remote monster HP.
   - All other V14 mechanics and UI remain unchanged.
 */
(() => {
  'use strict';
  if (typeof state === 'undefined' || !window.AMBER_FX || !window.V8ico) return;
  const $ = id => document.getElementById(id);
  const icon = window.V8ico;
  const numP = k => Math.max(0, Math.floor(Number(state[k]) || 0));
  const isPotion = item => item && (item.id === 'hp' || item.id === 'mp');

  // Earlier game versions stored duplicate *display* potion items in state.bag.
  // These were not updated by buy/usePotion, unlike the real stock counters.
  // Remove the stale display records; don't add their quantities to the actual
  // counters (that would grant free, duplicated potions after loading old saves).
  function migrateLegacyIcons() {
    if (!Array.isArray(state.bag)) state.bag = [];
    const n = state.bag.length;
    state.bag = state.bag.filter(it => !isPotion(it));
    if (state.bag.length !== n && typeof save === 'function') save();
  }
  migrateLegacyIcons();

  function potionCard(type, modal=false) {
    const hp = type === 'hp';
    const count = numP(hp ? 'potHP' : 'potMP');
    const title = hp ? 'ยาฟื้น HP' : 'ยาฟื้น MP';
    return `<button class="item amber15-potion-card" data-potion="${type}" type="button"
      ${count ? '' : 'disabled'} onclick="AMBER_V15.drink('${type}')"
      title="${title}: ${count} ขวด">
      ${icon(type, modal ? 'l' : '')}<small>${title}</small><em>×${count}</em></button>`;
  }
  function potionsHtml(modal=false) {
    return potionCard('hp', modal) + potionCard('mp', modal);
  }
  function stripLegacyUi(host) {
    if (!host) return;
    // Some older menus still hold buttons for the legacy bag entries.
    // Remove ONLY those specific potion buttons, not equipment or materials.
    state.bag.forEach((it,i) => { if(isPotion(it))host.querySelectorAll(`[onclick="itemClick(${i})"]`).forEach(n => n.remove()); });
  }

  const baseRenderBag = renderBag;
  renderBag = function() {
    migrateLegacyIcons();
    baseRenderBag();
    const host = $('bag');
    if (!host) return;
    host.insertAdjacentHTML('afterbegin', potionsHtml(false));
    const visibleItems = state.bag.filter(it => !isPotion(it)).length + Number(numP('potHP')>0) + Number(numP('potMP')>0);
    // Keep original equipment storage capacity untouched (40 separate gear slots).
    const counter = $('bagcount');
    if (counter) counter.textContent = `${visibleItems}/50`;
  };

  const baseInventory = openInventory;
  openInventory = function() {
    migrateLegacyIcons();
    baseInventory();
    const body = $('modalBody');
    if (!body) return;
    body.insertAdjacentHTML('afterbegin',
      `<section class="amber15-potions">
        <div class="amber15-potions-heading">🧪 ยาฟื้นฟู (จำนวนเดียวกับหน้า AUTO)</div>
        <div class="inventory amber15-potions-grid">${potionsHtml(true)}</div>
        <small class="hint">กดขวดยาเพื่อใช้ · หาก HP เหลือ 0 ต้องกดเกิดใหม่ก่อน</small>
      </section>`);
  };

  function drink(type) {
    if (type !== 'hp' && type !== 'mp') return;
    const k = type === 'hp' ? 'hp' : 'mp';
    const before = Number(state[k] || 0);
    const ok = usePotion(type, false); // authoritative decrement, HP/MP restoration
    if (!ok && state.hp > 0 && before >= (type === 'hp' ? maxHp() : maxMp())) {
      notify((type === 'hp' ? 'HP' : 'MP') + ' เต็มแล้ว ไม่ต้องใช้ยา');
    }
    renderTop();
    renderBag();
    const wrap = $('modalWrap');
    if (wrap?.classList.contains('show') && $('modalTitle')?.textContent.includes('กระเป๋า')) {
      const body = $('modalBody');
      const scroll = body?.parentElement?.scrollTop ?? 0;
      openInventory();
      if(body?.parentElement)body.parentElement.scrollTop=scroll;
    }
  }

  const api = { drink };
  window.AMBER_V15 = api;

  // Combat impact: existing tick() calls window.AMBER_FX.onBasicHit when a
  // normal hit lands. No extra damage is applied, just visual presentation.
  const stage = $('scene');
  let fxHost=null, userId=null, room=null;
  let lastSent=0;
  const now = () => Date.now();
  const ownMap=()=>String(state.map||'');
  const ownMob=()=>String(state.mob||'');
  const ownParty=()=>userId ? (localStorage.getItem('amber_party_'+userId)||'') : '';
  function host(){
    if (!stage) return null;
    if (!fxHost?.isConnected){
      fxHost=$('amber15FxLayer');
      if(!fxHost){fxHost=document.createElement('div');fxHost.id='amber15FxLayer';stage.appendChild(fxHost);}
    }
    return fxHost;
  }
  function where(el) {
    if (!el || !stage) return null;
    const a=stage.getBoundingClientRect(), r=el.getBoundingClientRect();
    return {x:r.left-a.left+r.width*.5,y:r.top-a.top+r.height*.50};
  }
  function impact(player,damage,remote=false,crit=false,uid=null) {
    const to=where($('mobimg'));
    if (!to) return;
    const root=host();if(!root)return;
    const node=document.createElement('div');
    node.className='amber15-impact'+(crit?' amber15-critical':'');
    node.style.left=to.x+'px';node.style.top=to.y+'px';
    const title = document.createElement('span'); title.className='amber15-impact-title';
    title.textContent=(crit?'💥 ':'⚔️ ')+String(player||'ผู้เล่น').slice(0,22)+(crit?' CRITICAL':' โจมตี');
    node.appendChild(title);
    const slash=document.createElement('div');slash.className='amber15-slash';node.appendChild(slash);
    for(let i=0;i<7;i++){
      const star=document.createElement('i');star.className='amber15-spark';
      star.style.setProperty('--angle',(i*360/7)+'deg');
      node.appendChild(star);
    }
    if(remote && damage>0){
      const hit=document.createElement('strong');hit.className='amber15-impact-damage';
      hit.textContent='-'+Math.min(9999999,Math.max(0,Number(damage)||0)).toLocaleString('th-TH');
      node.appendChild(hit);
    }
    root.appendChild(node);
    setTimeout(()=>node.remove(),850);
    const mob=$('mobimg');
    if(mob){
      mob.classList.remove('amber15-monster-hit');void mob.offsetWidth;
      mob.classList.add('amber15-monster-hit');
      clearTimeout(mob.__amber15HitTimer);
      mob.__amber15HitTimer=setTimeout(()=>mob.classList.remove('amber15-monster-hit'),360);
    }
  }
  function onBasicHit(damage,mob,{crit=false}={}){
    impact(state.name,damage,false,crit,userId);
    // Remote message is purely cosmetic. Do not share / subtract monster HP.
    if(!room || !userId || !window.AMBER_ONLINE_STATUS?.realtime || now()-lastSent<2500)return;
    lastSent=now();
    const packet={v:1,kind:'basic',map:ownMap(),pid:ownParty(),
      t:now(),id:Math.random().toString(36).slice(2,12),
      mob:String(mob?.id||ownMob()).slice(0,45),
      dmg:Math.min(9999999,Math.max(0,Math.round(Number(damage)||0))),crit:!!crit};
    room.emit('sfx',packet).catch(()=>{});
  }
  function receive(m){
    const d=m?.data;
    if(!d||m.isMe||d.kind!=='basic'||d.v!==1||!m.by ||
       d.map!==ownMap()||d.mob!==ownMob()||Math.abs(now()-Number(d.t||0))>7000)return;
    // Only teammates whose characters are actually drawn in this scene.
    const p=(window.AMBER_SCENE_PLAYERS||[]).find(p=>p.id===m.by);
    if(!p||p.map!==ownMap())return;
    impact(p.n,Math.max(0,Number(d.dmg)||0),true,!!d.crit,m.by);
  }
  async function connect(){
    if(!window.claude?.use)return;
    try{
      const u=await window.claude.use('user'); const person=await u?.me();
      if(!person?.id)return;
      userId=person.id;
      room=await window.claude.use('room');
      room?.on('sfx',receive);
    }catch(e){console.warn('[AMBER V15 impact FX]',e)}
  }
  window.AMBER_FX.onBasicHit=onBasicHit;
  const style=document.createElement('style');style.id='amber15-style';style.textContent=`
  #amber15FxLayer{position:absolute;inset:0;z-index:22;pointer-events:none;overflow:hidden}
  .amber15-impact{position:absolute;transform:translate(-50%,-50%);width:0;height:0;z-index:25;pointer-events:none}
  .amber15-impact:before{content:'';position:absolute;left:-37px;top:-37px;width:74px;height:74px;border-radius:50%;border:3px solid #ffe9a3;box-shadow:0 0 15px #ffd37b,inset 0 0 9px #ffcc64;animation:amber15-ring .48s ease-out forwards}
  .amber15-impact-title{position:absolute;bottom:41px;left:50%;transform:translateX(-50%);display:block;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;background:#0c1b2ae9;border:1px solid #f4d086;border-radius:7px;padding:4px 6px;color:#ffe5b6;font:bold 11px system-ui,sans-serif;text-shadow:1px 1px #000;animation:amber15-title .8s ease-out forwards;z-index:2}
  .amber15-slash{position:absolute;width:69px;height:8px;left:-34px;top:-4px;border-radius:90%;transform:rotate(-42deg);background:linear-gradient(90deg,transparent,#fff6cf,#ffc257,transparent);box-shadow:0 0 12px #ffd76a;animation:amber15-slash .34s ease-out forwards}
  .amber15-spark{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:45%;background:#fff6c6;box-shadow:0 0 9px #ffe76c;animation:amber15-spark .55s ease-out forwards;transform:rotate(var(--angle)) translateX(0)}
  .amber15-impact-damage{position:absolute;top:24px;left:-36px;min-width:72px;color:#ffc26d;text-shadow:0 2px 5px #000;font-size:17px;text-align:center;animation:amber15-title .8s ease-out forwards}
  #mobimg.amber15-monster-hit{animation:amber15-shake .33s ease-out!important;filter:brightness(1.85) sepia(.5) saturate(2) drop-shadow(0 0 9px #ff6c52)!important}
  .amber15-critical:before{border-color:#ffb356;box-shadow:0 0 20px #ff8937,inset 0 0 9px #ff5c37}
  @keyframes amber15-ring{from{opacity:1;transform:scale(.25)}to{opacity:0;transform:scale(1.6)}}
  @keyframes amber15-slash{from{opacity:0;transform:rotate(-70deg) scale(.2)}30%{opacity:1}to{opacity:0;transform:rotate(12deg) scale(1.5)}}
  @keyframes amber15-spark{0%{opacity:1;transform:rotate(var(--angle)) translateX(1px)}100%{opacity:0;transform:rotate(var(--angle)) translateX(49px)}}
  @keyframes amber15-title{from{opacity:0;translate:0 9px}25%{opacity:1}80%{opacity:1}to{opacity:0;translate:0 -15px}}
  @keyframes amber15-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)}}
  .amber15-potions{margin-bottom:10px;padding:7px;border:1px solid #6f6146;background:#0d1927;border-radius:8px}
  .amber15-potions-heading{font-weight:700;color:#f3d18b;padding:5px 2px 9px}
  .amber15-potions-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:0 3px}
  .amber15-potion-card{position:relative;min-height:74px;cursor:pointer}
  .amber15-potion-card:disabled{opacity:.44;cursor:default}
  .amber15-potion-card>.ic{max-width:44px;height:38px;object-fit:contain;background:transparent}
  .amber15-potion-card em{color:#f4da91}
  @media(max-width:390px){.amber15-potions-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(prefers-reduced-motion:reduce){.amber15-impact*,#mobimg.amber15-monster-hit{animation-duration:.12s!important}}
  `;document.head.appendChild(style);
  renderBag();
  connect();
})();
