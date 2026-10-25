/* 55 AMBERLANDS V20 — free beta Item Shop / Costume (NO SQL MIGRATION).
   Values are persisted in the existing amber_characters.save_data JSON via the
   game's existing saveCloud. Not secure enough for payment or public IAP.
   Never trust these client-side values for monetized transactions. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('th-TH');
const BASE_STATS={STR:15,DEX:12,INT:5,VIT:10,AGI:8,LUK:5};
const WINGS={sun:{name:'ปีกสุริยันสวรรค์',x:2,min:1,max:50,asset:'wing_amber.svg'},moon:{name:'ปีกจันทรารัตติกาล',x:3,min:50,max:100,asset:'wing_violet.svg'}};
const GOODS=[
 {sku:'sun_1',type:'wing',wing:'sun',days:1,price:250},
 {sku:'sun_3',type:'wing',wing:'sun',days:3,price:600},
 {sku:'sun_7',type:'wing',wing:'sun',days:7,price:1200},
 {sku:'moon_1',type:'wing',wing:'moon',days:1,price:600},
 {sku:'moon_3',type:'wing',wing:'moon',days:3,price:1600},
 {sku:'moon_7',type:'wing',wing:'moon',days:7,price:3500},
 {sku:'reset_skill',type:'skill',price:500,name:'น้ำยารีเซ็ตสกิล'},
 {sku:'reset_stat',type:'stat',price:500,name:'น้ำยารีเซ็ตสเตตัส'}
];
const findSku=sku=>GOODS.find(x=>x.sku===sku);
const cloud=()=>window.AMBER_CLOUD;
let startedFor='',saving=false,saveAgain=false;
function ready(){return !!cloud()?.getStatus?.()?.cloudReady&&!!cloud()?.getUser?.()}
function inv(){return state.shop20?.owned||[]}
function setup(){
 if(!ready()||typeof state!=='object'||!state)return false;
 const key=cloud().getUser().id;
 if(startedFor!==key)startedFor=key;
 if(!state.shop20||typeof state.shop20!=='object')state.shop20={};
 const s=state.shop20;
 if(!Array.isArray(s.owned))s.owned=[];
 if(!Object.hasOwn(s,'equipped'))s.equipped=null;
 if(s.grant2026!==true){
   // All existing and newly created Google characters receive EXACTLY 99,999
   // free beta Coin once. The wallet persists with their original cloud save.
   state.gems=99999;
   s.grant2026=true;
   save();persist();
   notify('🎁 รับฟรี 99,999 คอยล์แล้ว! เปิด Item Shop ได้เลย');
 }
 updateWallet();
 return true;
}
function persist(){
 save();
 if(saving){saveAgain=true;return}
 if(!ready())return;
 saving=true;
 Promise.resolve(cloud()?.saveNow?.()).catch(e=>console.warn('[AMBER SHOP] save',e)).finally(()=>{
   saving=false;
   if(saveAgain){saveAgain=false;persist()}
 });
}
function updateWallet(){const el=$('gem');if(el)el.textContent=fmt(state.gems);const chip=$('amber20WingChip');if(chip){const w=activeWing();chip.textContent=w?'🪽 EXP ×'+w.x+' · '+remaining(w.entry.expiresAt):'🪽 ไม่มีโบนัส EXP'}}
function levelOK(w){return Number(state.lv)>=w.min&&Number(state.lv)<=w.max}
function activeWing(){
 const selected=state.shop20?.equipped;
 const entry=inv().find(x=>x.id===selected);
 if(!entry||!entry.expiresAt||Date.parse(entry.expiresAt)<=Date.now())return null;
 const good=findSku(entry.sku),w=good&&WINGS[good.wing];
 if(!w||!levelOK(w))return null;
 return {...w,entry};
}
function expMultiplier(){return activeWing()?.x||1}
function expApply(base){
 const val=Number(base)||0;
 if(val<=0)return base;
 return Math.round(val*expMultiplier());
}
function remaining(d){
 let sec=Math.max(0,Math.ceil((Date.parse(d)-Date.now())/1000));
 if(sec<60)return sec+' วินาที';
 const days=Math.floor(sec/86400);sec%=86400;
 const hours=Math.floor(sec/3600);sec%=3600;
 const mins=Math.floor(sec/60);
 return (days?days+' วัน ':'')+(hours?hours+' ชม. ':'')+(!days?mins+' นาที':'');
}
function textFor(g){
 if(g.type==='wing'){const w=WINGS[g.wing];return `${w.name} · EXP ×${w.x} · Lv.${w.min}–${w.max} · ${g.days} วัน`}
 return g.type==='skill'?'รีเซ็ตสกิลที่เรียนและคืนแต้มสกิล':'รีเซ็ตค่าสเตตัสเป็นค่าเริ่มต้นและคืนแต้มที่ลง';
}
function drawGoods(){
 const host=$('amber20ShopProducts');if(!host)return;
 host.innerHTML=GOODS.map(g=>{
  const w=g.type==='wing'?WINGS[g.wing]:null;
  return `<article class="amber20-product">${w?`<img src="./assets/${w.asset}" alt="${esc(w.name)}">`:`<div class="amber20-bottle">${window.PXI?PXI(g.sku,g.type==='skill'?'🧪':'⚗️'):(g.type==='skill'?'🧪':'⚗️')}</div>`}<strong>${esc(w?.name||g.name)}</strong><small>${esc(textFor(g))}</small><button data-am20-buy="${g.sku}">💠 ${fmt(g.price)} คอยล์ · ซื้อ</button></article>`;
 }).join('');
 host.querySelectorAll('[data-am20-buy]').forEach(b=>b.addEventListener('click',()=>purchase(b.dataset.am20Buy)));
}
function drawItems(){
 const host=$('amber20Purchased');if(!host)return;
 const items=inv().filter(p=>{
  const g=findSku(p.sku);return g&&(g.type!=='wing'||Date.parse(p.expiresAt)>Date.now());
 });
 host.innerHTML=items.length?items.map(p=>{
   const good=findSku(p.sku),wing=good.type==='wing'&&WINGS[good.wing];
   const owned=wing;
   const usable=!!wing&&!levelOK(wing);
   return `<div class="amber20-inventory"><span class="amber20-thumb">${wing?`<img src="./assets/${wing.asset}" alt="">`:(window.PXI?PXI(good.sku,'🧪'):'🧪')}</span><span><b>${esc(wing?.name||good.name)}</b><small>${owned?'เหลือ '+remaining(p.expiresAt)+' · Lv.'+wing.min+'–'+wing.max:'ใช้ครั้งเดียว'}</small></span><button data-am20-${owned?'equip':'use'}="${esc(p.id)}" ${usable?'disabled':''}>${owned?(usable?'เลเวลไม่ถึง':'สวมใส่'):'ใช้'}</button></div>`
 }).join(''):'<p class="hint">ยังไม่มีไอเทมที่ซื้อ</p>';
 host.querySelectorAll('[data-am20-equip]').forEach(b=>b.addEventListener('click',()=>equip(b.dataset.am20Equip)));
 host.querySelectorAll('[data-am20-use]').forEach(b=>b.addEventListener('click',()=>usePotion(b.dataset.am20Use)));
}
function shopHTML(){
 return `<section class="amber20-wallet"><b>💠 ${fmt(state.gems)} คอยล์</b><small>🎁 ทุกบัญชีได้รับ 99,999 คอยล์ทดลองครั้งเดียว • ยังไม่มีระบบเติมเงิน</small></section>
 <h3>🪽 ปีกคอสตูมเพิ่ม EXP</h3><div class="amber20-grid" id="amber20ShopProducts"></div>
 <h3>📦 คลังไอเทม Item Shop</h3><div id="amber20Purchased"></div>
 <button id="amber20ManageWings">🧑 ดูช่องคอสตูม</button> <button id="amber21GoBag">🎒 เปิดกระเป๋าและสวมปีก</button>
 <p class="hint">เวลาใช้งานปีกเริ่มนับเมื่อซื้อ ไม่หยุดเมื่อออฟไลน์ ปีก ×2 ใช้ Lv.1–50 และปีก ×3 ใช้ Lv.50–100 ตัวคูณส่งผลต่อ EXP ของผู้สวมใส่เท่านั้น</p>`;
}
function openShop(){
 if(!setup()){notify('ต้องล็อกอิน Google ก่อนเปิด Item Shop');return}
 openModal('💠 Item Shop · ร้านคอยล์',shopHTML());
 drawGoods();drawItems();$('amber20ManageWings')?.addEventListener('click',showCostumes);$('amber21GoBag')?.addEventListener('click',openInventory);
}
function purchase(sku){
 if(!setup())return;
 const g=findSku(sku);if(!g)return;
 if(!Number.isSafeInteger(Number(state.gems))||state.gems<g.price){notify('คอยล์ไม่พอ');return}
 if(inv().length>=120){notify('คลัง Item Shop เต็ม (120 รายการ)');return}
 if(!confirm(`ใช้ ${fmt(g.price)} คอยล์ซื้อ ${textFor(g)} ?`))return;
 // Free beta prototype. For real-money purchases replace with server-side RPC.
 state.gems-=g.price;
 const now=Date.now(),id='it_'+now.toString(36)+'_'+Math.random().toString(36).slice(2,10);
 inv().push({id,sku,at:new Date(now).toISOString(),expiresAt:g.type==='wing'?new Date(now+g.days*86400000).toISOString():null});
 persist();renderTop();renderBag();notify('✅ ซื้อ '+(WINGS[g.wing]?.name||g.name)+' สำเร็จ · เข้ากระเป๋าแล้ว');
 openShop();
}
function equip(id){
 if(!setup())return;
 const p=inv().find(p=>p.id===id);
 if(!p){notify('ไม่พบคอสตูม');return}
 const g=findSku(p.sku),w=g&&WINGS[g.wing];
 if(!w||!p.expiresAt||Date.parse(p.expiresAt)<=Date.now()){notify('ปีกหมดอายุ');return}
 if(!levelOK(w)){notify(`ต้องมี Lv.${w.min}–${w.max} จึงใส่ปีกนี้ได้`);return}
 state.shop20.equipped=id;persist();renderScene();renderBag();updateWallet();
 window.dispatchEvent(new Event('amber-v19-location'));
 notify('🪽 สวม '+w.name+' · EXP ×'+w.x);
 if($('amber20Wardrobe'))showCostumes();else if($('amber20ShopProducts'))openShop();
}
function unequip(){if(!setup())return;state.shop20.equipped=null;persist();renderScene();renderBag();updateWallet();window.dispatchEvent(new Event('amber-v19-location'));notify('ถอดปีกคอสตูมแล้ว');showCostumes()}
function usePotion(id){
 if(!setup())return;
 const p=inv().find(p=>p.id===id),g=p&&findSku(p.sku);
 if(!g||g.type==='wing')return;
 if(!confirm(`ใช้ ${g.name} 1 ขวด เพื่อคืนแต้มที่เคยเพิ่ม?`))return;
 if(g.type==='skill'){
   const learned=Array.isArray(state.learned)?state.learned:[];
   state.skillPoints=Math.max(0,Number(state.skillPoints)||0)+learned.length;
   state.learned=[];
   state.autoSkillSlots=Array(6).fill(null);
   if(window.AMBER_V12)window.AMBER_V12.queuedSkill='';
 }else if(g.type==='stat'){
   const spent=Object.entries(BASE_STATS).reduce((sum,[k,v])=>sum+Math.max(0,(Number(state.stats?.[k])||v)-v),0);
   state.stats={...BASE_STATS};state.points=Math.max(0,Number(state.points)||0)+spent;
   state.hp=Math.min(state.hp,maxHp());state.mp=Math.min(state.mp,maxMp());
 }
 state.shop20.owned=inv().filter(x=>x.id!==id);
 persist();render();renderBag();notify('✅ ใช้ '+g.name+' สำเร็จ');openShop();
}
function statusHTML(){
 const w=activeWing(),selection=state.shop20?.equipped?inv().find(p=>p.id===state.shop20.equipped):null;
 return `<h3 class="amber20-statusheading">🧥 คอสตูมตัวละคร</h3>
  <div class="amber20-slotgrid">
   <div class="amber20-empty">🎩<b>หมวกคอสตูม</b><small>ว่าง · สำหรับอนาคต</small></div>
   <div class="amber20-empty">👕<b>เสื้อคอสตูม</b><small>ว่าง · สำหรับอนาคต</small></div>
   <button id="amber20CostumeSlot" class="amber20-wingSlot"><img src="${w?'./assets/'+w.asset:''}" ${w?'':'hidden'} alt="ปีก"><b>ปีกคอสตูม</b><small>${w?`EXP ×${w.x} · เหลือ ${remaining(w.entry.expiresAt)}`:(selection?'ปีกหมดอายุ / เลเวลไม่ตรง':'ยังไม่ได้สวมใส่')}</small><span>เปลี่ยน / ถอด</span></button>
  </div><div id="amber20WingChip">${w?'🪽 EXP ×'+w.x+' · '+remaining(w.entry.expiresAt):'🪽 ไม่มีโบนัส EXP'}</div>`;
}
function showCostumes(){
 if(!setup())return;
 const wings=inv().map(p=>({p,g:findSku(p.sku)})).filter(({p,g})=>g?.type==='wing'&&Date.parse(p.expiresAt)>Date.now());
 openModal('🧥 คอสตูมตัวละคร',`${statusHTML()}<h3>🪽 คลังปีกคอสตูม</h3><div id="amber20Wardrobe">${wings.map(({p,g})=>{
  const w=WINGS[g.wing];const block=!levelOK(w);
  return `<div class="amber20-inventory"><span class="amber20-thumb"><img src="./assets/${w.asset}"></span><span><b>${esc(w.name)}</b><small>EXP ×${w.x} · เหลือ ${remaining(p.expiresAt)} · Lv.${w.min}–${w.max}</small></span><button data-am20-equip="${esc(p.id)}" ${block?'disabled':''}>${block?'เลเวลไม่ตรง':state.shop20.equipped===p.id?'ใส่อยู่':'สวม'}</button></div>`
 }).join('')||'<p>ไม่มีปีกคอสตูมในคลัง</p>'}</div><button id="amber20Unequip">❎ ถอดปีก</button> <button id="amber20OpenShop">💠 เปิด Item Shop</button>`);
 $('amber20Unequip')?.addEventListener('click',unequip);
 $('amber20OpenShop')?.addEventListener('click',openShop);
 document.querySelectorAll('[data-am20-equip]').forEach(b=>b.addEventListener('click',()=>equip(b.dataset.am20Equip)));
 $('amber20CostumeSlot')?.addEventListener('click',showCostumes);
}
function presenceInfo(){
 const w=activeWing();return {wing:w?(w.x===2?'sun':'moon'):''};
}
function decorateScene(){
 const sprites=$('sprites');if(!sprites)return;
 const nodes=sprites.querySelectorAll('.sprite');
 const peers=window.AMBER_SCENE_PLAYERS||[];
 nodes.forEach((el,i)=>{
   const img=el.querySelector(':scope > img:not(.amber20-characterWing):not(.amber-equipped-weapon)');if(!img)return;
   const type=i===0?presenceInfo().wing:(peers[i-1]?.wing||'');
   const w=WINGS[type]||null;
   let wing=el.querySelector('.amber20-characterWing');
   if(!w){wing?.remove();return}
   if(!wing){wing=document.createElement('img');wing.className='amber20-characterWing';wing.alt='ปีกคอสตูม'}
   // Keep the BODY as first img: V14 damage FX animates img:first-child.
   // If the wing is first, amber14-hurt overrides its translateX(-50%) and
   // sends it to the right on every monster attack.
   if(wing.previousElementSibling!==img)img.insertAdjacentElement('afterend',wing);
   const src='./assets/'+w.asset;if(!wing.src.endsWith('/'+w.asset))wing.src=src;
   img.classList.add('amber20-characterBody');
 });
}
// V21 -- mirror Shop-owned items into the EXISTING visual bag, not state.bag.
// Using a single source of truth avoids duplicate inventory, expired-item exploits
// and trading paid costume objects through the normal Gold market.
function bagEntries(){
 return inv().filter(p=>!!findSku(p?.sku)).map(p=>({p,g:findSku(p.sku)}));
}
function bagCard({p,g},inModal=false){
 const w=g.type==='wing'?WINGS[g.wing]:null;
 const expired=!!w&&!(Date.parse(p.expiresAt)>Date.now());
 const equipped=state.shop20?.equipped===p.id;
 const title=w?w.name:g.name;
 const img=w?`<img src="./assets/${w.asset}" alt="${esc(title)}">`:`<span class="amber21-bagPotion">${g.type==='skill'?'🧪':'⚗️'}</span>`;
 const status=expired?'หมดอายุ':equipped?'สวมอยู่':(w?'EXP ×'+w.x:'กดเพื่อใช้');
 const qty=inModal?`<small>${esc(title)}</small><small class="amber21-bagStatus">${status}</small>`:`<small>${esc(title)}</small><em>${equipped?'✓':'×1'}</em>`;
 return `<button type="button" class="item amber21-shopBagItem${equipped?' amber21-bagEquipped':''}${expired?' amber21-bagExpired':''}" data-am21-shop-bag="${esc(p.id)}" title="${esc(title)} · ${status}">${img}${qty}</button>`;
}
function decorateBag(){
 const host=$('bag');if(!host)return;
 host.querySelectorAll('.amber21-shopBagItem').forEach(n=>n.remove());
 const items=bagEntries();if(!items.length)return;
 const cards=items.map(item=>bagCard(item)).join('');
 // Insert before the empty equipment placeholders rather than after them.
 const firstBlank=host.querySelector('div.item');
 if(firstBlank)firstBlank.insertAdjacentHTML('beforebegin',cards);
 else host.insertAdjacentHTML('beforeend',cards);
 const counter=$('bagcount');
 if(counter)counter.textContent=(counter.textContent||'0/50')+' · 💠 '+items.length;
}
function decorateBagModal(){
 const host=$('modalBody');
 if(!host||!($('modalTitle')?.textContent||'').includes('กระเป๋าไอเทม'))return;
 const items=bagEntries();
 const cards=items.map(item=>bagCard(item,true)).join('');
 host.insertAdjacentHTML('beforeend',`<section id="amber21BagCosmetics" class="amber21-bagSection"><h3>🪽 คอสตูมและของ Item Shop (${items.length})</h3><p class="hint">ซื้อแล้วอยู่ในกระเป๋านี้ กดรูปปีกเพื่อสวมใส่ / ถอด • อายุปีกนับจากวันที่ซื้อ</p><div class="inventory">${cards||'<small class="hint">ยังไม่มีไอเทมจากร้านคอยล์</small>'}</div><button type="button" id="amber21OpenItemShop">💠 เปิด Item Shop</button></section>`);
 $('amber21OpenItemShop')?.addEventListener('click',openShop);
}
function showBagDetails(id){
 if(!setup())return;
 const p=inv().find(x=>x.id===id);if(!p){notify('ไม่พบไอเทมในกระเป๋า');renderBag();return}
 const g=findSku(p.sku);if(!g)return;
 const w=g.type==='wing'?WINGS[g.wing]:null;
 const expired=!!w&&!(Date.parse(p.expiresAt)>Date.now());
 const permitted=!!w&&levelOK(w);
 const on=state.shop20?.equipped===id;
 const name=w?w.name:g.name;
 const art=w?`<img class="amber21-detailWing" src="./assets/${w.asset}" alt="${esc(name)}">`:`<span class="amber21-detailPotion">${window.PXI?PXI(g.sku,'🧪'):'🧪'}</span>`;
 const info=w?`EXP ×${w.x} เฉพาะผู้สวมใส่ • Lv.${w.min}–${w.max}<br>เวลาคงเหลือ: ${expired?'หมดอายุ':remaining(p.expiresAt)}`:textFor(g);
 openModal('🎒 '+name,`<div class="amber21-bagDetail">${art}<p>${info}</p>${w?`<p>${expired?'⛔ ปีกหมดอายุ':on?'✅ กำลังสวมปีกนี้อยู่':permitted?'✅ สามารถสวมใส่ได้':'⛔ เลเวลไม่ตรงเงื่อนไข'}</p><button type="button" id="amber21BagEquip" ${expired||!permitted?'disabled':''}>${on?'❎ ถอดปีก':'🪽 สวมใส่ปีก'}</button>`:`<button type="button" id="amber21BagUse">🧪 ใช้ไอเทม</button>`}<button type="button" id="amber21BagBack">← กลับกระเป๋า</button></div>`);
 $('amber21BagEquip')?.addEventListener('click',()=>{
  if(on){unequip();}else{equip(id)}
  openInventory();
 });
 $('amber21BagUse')?.addEventListener('click',()=>{usePotion(id);openInventory()});
 $('amber21BagBack')?.addEventListener('click',openInventory);
}
// Capture click on our cards only, ahead of V16 generic inventory click handlers.
document.addEventListener('click',ev=>{
 const target=ev.target.closest?.('[data-am21-shop-bag]');
 if(!target)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 showBagDetails(target.dataset.am21ShopBag);
},true);
const oldRenderBag=renderBag;
renderBag=function(){oldRenderBag();decorateBag()};
const oldOpenInventory=openInventory;
openInventory=function(){oldOpenInventory();decorateBagModal()};

// Patch only the final rendering hooks; never modify combat frame timings.
const _renderScene=renderScene;
renderScene=function(){_renderScene();decorateScene()};
const _statModal=statModal;
statModal=function(){_statModal();$('modalBody')?.insertAdjacentHTML('beforeend',statusHTML());$('amber20CostumeSlot')?.addEventListener('click',showCostumes)};
// Allow menu without replacing or moving the original navigation.
const marketBtn=[...document.querySelectorAll('nav.nav button,.nav button')].find(b=>b.getAttribute('onclick')?.includes('openMarket()'));
if(marketBtn){const shop=document.createElement('button');shop.id='amber20ShopNav';shop.type='button';shop.textContent='💠 Item Shop';shop.addEventListener('click',openShop);marketBtn.after(shop)}
const style=document.createElement('style');style.textContent=`
#amber20ShopNav{white-space:nowrap;background:#2b1d47;color:#ffe6ff;border:1px solid #af7ad8}
.amber20-wallet{padding:12px;border:1px solid #9973cf;border-radius:10px;background:linear-gradient(130deg,#322046,#171c35)}.amber20-wallet b{display:block;color:#f9dcff;font-size:19px}.amber20-wallet small{display:block;color:#ddc9ef;font-size:11px}
.amber20-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.amber20-product{display:flex;align-items:center;flex-direction:column;gap:5px;min-width:0;padding:9px;border-radius:10px;background:#132237;border:1px solid #465b7b;text-align:center}.amber20-product>img{height:82px;width:100%;object-fit:contain;filter:drop-shadow(0 0 7px #be96ff88)}.amber20-product small{font-size:11px;color:#b1c3d5;min-height:36px}.amber20-product strong{font-size:12px;color:#ffdeae}.amber20-product button{width:100%;font-size:11px;white-space:normal;padding:7px}.amber20-bottle{font-size:44px;height:82px;display:grid;place-items:center}
.amber20-inventory{display:flex;align-items:center;gap:8px;border:1px solid #3b557a;padding:7px;margin:6px 0;border-radius:8px;background:#111f34}.amber20-inventory>span:nth-child(2){flex:1;min-width:0}.amber20-inventory small{display:block;font-size:11px;color:#a2b5cc}.amber20-inventory b{font-size:12px}.amber20-thumb{width:62px;height:48px;flex:none;display:grid;place-items:center;font-size:30px}.amber20-thumb img{width:64px;height:51px;object-fit:contain}.amber20-inventory button{padding:6px;font-size:11px}
.amber20-slotgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.amber20-slotgrid>*{min-width:0;min-height:116px;border:1px solid #6b6e95;border-radius:8px;background:#17263c;color:#f1eaff;display:flex;align-items:center;flex-direction:column;justify-content:center;padding:5px;text-align:center;font-size:22px}.amber20-slotgrid b{font-size:11px}.amber20-slotgrid small{display:block;font-size:10px;color:#b4c6db}.amber20-slotgrid .amber20-wingSlot img{width:100%;height:57px;object-fit:contain;filter:drop-shadow(0 0 6px #b9a8ff9a)}.amber20-wingSlot span{font-size:10px;color:#ffe69d}.amber20-statusheading{margin-top:14px}
#amber20WingChip{margin:9px 0;padding:8px;text-align:center;border:1px solid #84678f;border-radius:7px;color:#ffe1a5}
#sprites .sprite{position:relative;isolation:isolate;overflow:visible!important}#sprites .sprite>img.amber20-characterWing{position:absolute!important;z-index:0!important;width:110px!important;height:86px!important;max-width:none!important;top:-12px!important;left:50%!important;transform:translateX(-50%);object-fit:contain!important;border:0!important;filter:drop-shadow(0 0 8px #ffb74b)!important;animation:amber20-flutter 2s ease-in-out infinite alternate;pointer-events:none}#sprites .sprite>img.amber20-characterBody{position:relative!important;z-index:1!important}#sprites .sprite>small{position:relative;z-index:2}
/* Monster-hit FX belongs on the portrait, never on a wing image. */
#sprites .sprite>img.amber20-characterWing,#sprites .sprite.amber14-hurt>img.amber20-characterWing{animation:none!important;transform:translateX(-50%)!important;translate:none!important;scale:1!important;}
#sprites .sprite.amber14-hurt>img.amber20-characterBody:first-child{animation:amber14-hurt .5s ease-in-out 1!important}
.amber21-shopBagItem{overflow:hidden;min-width:0;padding:4px 2px!important;min-height:75px!important;border-color:#9970c8!important;background:radial-gradient(#3a2753,#131c33)!important}
.amber21-shopBagItem>img{width:100%!important;height:41px!important;max-width:68px;object-fit:contain!important;filter:drop-shadow(0 0 4px #b3a8ff88)}
.amber21-shopBagItem small{display:block;font-size:9px;line-height:1.2;overflow-wrap:anywhere}
.amber21-bagEquipped{border-color:#e2bb62!important;box-shadow:inset 0 0 0 1px #e2bb62}
.amber21-bagExpired{opacity:.55}.amber21-bagPotion{display:block;font-size:29px}
.amber21-bagSection{border-top:1px solid #8576a1;margin-top:12px;padding:12px 3px}.amber21-bagSection h3{font-size:14px;color:#e9cfff}
.amber21-bagSection .inventory{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:5px 0}
.amber21-bagSection .item{width:100%;min-width:0}.amber21-bagStatus{color:#e0c47c!important}
.amber21-bagDetail{text-align:center}.amber21-bagDetail>button{margin:5px;padding:10px}.amber21-detailWing{max-width:230px;width:100%;height:144px;object-fit:contain;filter:drop-shadow(0 0 10px #b7a3e8)}
.amber21-detailPotion{font-size:64px}
@keyframes amber20-flutter{from{opacity:.84;scale:.98}to{opacity:1;scale:1.035}}
`;document.head.appendChild(style);
window.AMBER_ITEM_SHOP={open:openShop,showCostumes,expApply,expMultiplier,presenceInfo,decorateScene,setup};
window.addEventListener('focus',()=>{if(!document.hidden){setup();decorateScene()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){setup();decorateScene()}});
window.addEventListener('amber-v19-realtime',()=>{if(ready()){setup();decorateScene()}});
let firstReady=false;
setInterval(()=>{
 if(!ready())return;
 if(!firstReady){firstReady=setup();if(firstReady){decorateScene();renderTop();renderBag()}}
 const w=activeWing();
 if(state.shop20?.equipped&&!w&&state.shop20.owned.some(p=>p.id===state.shop20.equipped&&p.expiresAt&&Date.parse(p.expiresAt)<=Date.now())){
  state.shop20.equipped=null;persist();renderScene();renderBag();window.dispatchEvent(new Event('amber-v19-location'));
 }
 if($('amber20WingChip'))updateWallet();
},4000);
setTimeout(()=>{if(setup()){firstReady=true;renderTop();decorateScene();renderBag()}},1400);
})();
