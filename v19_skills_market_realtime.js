/* 55 AMBERLANDS V19 -- small-group addon.
   1) player-selected AUTO skill slots (stored in character save)
   2) market Broadcast hints + database polling fallback
   3) automatic sale payout using existing RPC, sale alert badge
   Never trust client Broadcast for Gold or items. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.max(0,Math.trunc(Number(n)||0)).toLocaleString('th-TH');
const SLOT_COUNT=6;
let receipts=[],roomAttached=null,lastReceiptsAt=0,receiptsBusy=false,marketReadBusy=false,marketChangeTimeout=null,claimBusy=false;
let lastNoticeCount=0;
const cloud=()=>window.AMBER_CLOUD;
const ready=()=>!!cloud()?.getStatus?.()?.cloudReady;
const visible=()=>!document.hidden&&navigator.onLine!==false;
function learned(){return Array.isArray(state?.learned)?SKILLS.filter(s=>state.learned.includes(s.id)):[]}
function ensureSlots(){
 if(!state||!Array.isArray(state.autoSkillSlots)){
   state.autoSkillSlots=learned().slice(0,SLOT_COUNT).map(x=>x.id);
 }
 state.autoSkillSlots=state.autoSkillSlots.slice(0,SLOT_COUNT).map(id=>id&&learned().some(x=>x.id===id)?id:null);
 while(state.autoSkillSlots.length<SLOT_COUNT)state.autoSkillSlots.push(null);
}
function commit(){ensureSlots();save();}
function titleFor(id){const sk=SKILLS.find(s=>s.id===id);return sk?.name||'ว่าง'}
function renderSlots(){
 const host=$('amber19SkillSlots');if(!host)return;
 ensureSlots();
 host.innerHTML=state.autoSkillSlots.map((id,i)=>{
  const sk=SKILLS.find(x=>x.id===id),name=sk?.name||'— ว่าง —';
  return `<div class="amber19-slot"><span class="amber19-sloticon">${sk?`<img src="${esc(image(sk.icon))}" alt="">`:'➕'}</span><span class="amber19-slotlabel"><b>ช่อง ${i+1} · ${esc(name)}</b><small>${sk?`MP ${sk.mp} · ${sk.buff?'บัฟ':'โจมตี'}`:'ช่องว่างจะไม่ถูกใช้ AUTO'}</small></span><button data-v19-pick="${i}">เลือก</button>${sk?`<button class="redbtn" data-v19-clear="${i}">ถอด</button>`:''}</div>`;
 }).join('');
 host.querySelectorAll('[data-v19-pick]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.v19Pick))));
 host.querySelectorAll('[data-v19-clear]').forEach(b=>b.addEventListener('click',()=>{setSlot(Number(b.dataset.v19Clear),null);renderSlots()}));
}
function showSkills(){
 ensureSlots();
 openModal('🎯 จัดช่องสกิล AUTO',`<p class="hint">เลือกเฉพาะสกิลที่ต้องการให้ AUTO ใช้ · ช่องที่ว่างจะไม่สุ่มสกิลอื่น · สกิลที่เรียนแล้วเท่านั้น</p><div id="amber19SkillSlots"></div><p class="hint">การกดสกิลด้วยมือยังทำงานเหมือนเดิม และเกมจะบันทึกชุด AUTO ไว้กับตัวละคร Google</p>`);
 renderSlots();
}
function setSlot(i,id){
 ensureSlots();if(!Number.isInteger(i)||i<0||i>=SLOT_COUNT)return;
 if(id && !learned().some(sk=>sk.id===id)){notify('ต้องเรียนสกิลนี้ก่อน');return}
 if(id){state.autoSkillSlots=state.autoSkillSlots.map((v,j)=>j!==i&&v===id?null:v)}
 state.autoSkillSlots[i]=id||null;
 commit();
 notify(id?'✅ เลือก '+titleFor(id)+' สำหรับ AUTO แล้ว':'ถอดสกิลออกจากช่องแล้ว');
}
function choose(i){
 ensureSlots();const options=learned().filter(sk=>!state.autoSkillSlots.includes(sk.id)||state.autoSkillSlots[i]===sk.id);
 openModal('✨ เลือกสกิลช่อง '+(i+1),`<p>เลือกสกิลที่เรียนแล้วเพื่อตั้ง AUTO ช่อง ${i+1}</p><div class="amber19-picker">${options.map(sk=>`<button data-v19-skill="${esc(sk.id)}"><img src="${esc(image(sk.icon))}" alt=""><span>${esc(sk.name)}<small>MP ${sk.mp} · ${sk.buff?'บัฟ':'โจมตี'}</small></span></button>`).join('')||'<p class="hint">ยังไม่มีสกิลที่เรียน หรือทุกสกิลถูกเลือกแล้ว</p>'}</div><button id="amber19BackSkills">← กลับไปช่อง AUTO</button>`);
 document.querySelectorAll('[data-v19-skill]').forEach(b=>b.addEventListener('click',()=>{setSlot(i,b.dataset.v19Skill);showSkills()}));
 $('amber19BackSkills')?.addEventListener('click',showSkills);
}
function pickSkill(available){
 ensureSlots();if(!Array.isArray(available)||!available.length)return null;
 const ids=state.autoSkillSlots.filter(Boolean);
 const choices=available.filter(sk=>ids.includes(sk.id));
 return choices.length?choices[Math.floor(Math.random()*choices.length)]:null;
}
// Add ONE local control. Does not replace original AUTO checkbox or fight UI.
function attachSkillButton(){
 if($('amber19AutoButton'))return;
 const base=$('autoSkill')?.closest('label') || $('autoSkill');
 if(!base)return;
 const btn=document.createElement('button');btn.type='button';btn.id='amber19AutoButton';btn.textContent='🎯 จัดสกิล AUTO';
 btn.addEventListener('click',showSkills);base.insertAdjacentElement('afterend',btn);
}

function getAlerts(){
 if(!state)return [];
 const since=Date.parse(state.marketNoticeReadAt||'')||0;
 return receipts.filter(r=>Date.parse(r.created_at)>since);
}
function badge(){
 const market=[...document.querySelectorAll('nav.nav button,.nav button')].find(b=>b.getAttribute('onclick')?.includes('openMarket()'));
 if(!market)return;
 market.classList.add('amber19-nav-market');
 let el=market.querySelector('.amber19-badge');
 if(!el){el=document.createElement('span');el.className='amber19-badge';market.appendChild(el)}
 const count=getAlerts().length;
 el.textContent=count>99?'99+':String(count);
 el.style.display=count?'inline-flex':'none';
 market.title=count?'ขายของได้แล้ว '+count+' รายการ · Gold เข้ากระเป๋าอัตโนมัติ':'';
}
function receiptsSummary(){
 const el=$('amber19Earnings');if(!el)return;
 const all=receipts.slice(0,12),unread=getAlerts();
 el.innerHTML=`<b>🔴 ประวัติขายสำเร็จ ${all.length} รายการ</b><small>💰 Gold จากตลาดเข้ากระเป๋าอัตโนมัติ ไม่ต้องกดรับ</small><div class="amber19-sales">${all.map(r=>`<small>✅ ${esc(r.item_name)} ×${fmt(r.quantity)} · +${fmt(r.gold_amount)} Gold ${!r.claimed_at?'<b>(กำลังโอน Gold)</b>':''}</small>`).join('')||'<small>ยังไม่มีรายการขายสำเร็จ</small>'}</div>${unread.length?`<button type="button" id="amber19ClearNotice">อ่านแล้ว · ปิดแจ้งเตือน ${unread.length} รายการ</button>`:''}`;
 $('amber19ClearNotice')?.addEventListener('click',markRead);
}
function markRead(){
 state.marketNoticeReadAt=new Date().toISOString();save();badge();receiptsSummary();
}
async function autoCredit(){
 if(claimBusy||!ready()||!receipts.some(r=>r.claimed_at==null))return;
 claimBusy=true;
 const c=cloud();
 try{
  // V19 SQL RPC already exists on this project. No new SQL or tables needed.
  await c.beginMarket();
  try{
   const {data,error}=await c.getClient().rpc('amber_market_claim');
   if(error)throw error;
   const n=Math.max(0,Number(data)||0);
   if(n>0){notify('💰 ตลาดขายสำเร็จ! Gold เข้าอัตโนมัติ +'+fmt(n));log('💰 เงินจากตลาดเข้าอัตโนมัติ +'+fmt(n)+' Gold','good')}
  }finally{await c.endMarket()}
  lastReceiptsAt=0;
 }catch(e){console.warn('[AMBER] automatic market payout retry later',e)}
 finally{claimBusy=false}
}
async function fetchReceipts(force=false){
 if(!ready()||!visible()||receiptsBusy)return;
 if(!force&&Date.now()-lastReceiptsAt<14000)return;
 const sb=cloud()?.getClient?.(),me=cloud()?.getUser?.();if(!sb||!me)return;
 receiptsBusy=true;
 try{
  const {data,error}=await sb.from('amber_market_sales')
    .select('id,item_name,quantity,gold_amount,created_at,claimed_at')
    .eq('seller_id',me.id).order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(!state.marketNoticeReadAt){
    // For existing users don't flood the badge with sales predating this release.
    state.marketNoticeReadAt=new Date().toISOString();save();
  }
  const oldIds=new Set(receipts.map(x=>String(x.id)));
  receipts=data||[];
  const newest=receipts.filter(x=>!oldIds.has(String(x.id))&&Date.parse(x.created_at)>Date.parse(state.marketNoticeReadAt));
  if(newest.length&&lastReceiptsAt){
    const total=newest.reduce((n,x)=>n+Number(x.gold_amount||0),0);
    notify('🔴 ขายสำเร็จ '+newest.length+' รายการ! +'+fmt(total)+' Gold');
  }
  if($('amber19Earnings')?.isConnected&&getAlerts().length)markRead();
  badge();receiptsSummary();lastReceiptsAt=Date.now();
  if(receipts.some(x=>x.claimed_at==null))await autoCredit();
 }catch(e){console.warn('[AMBER] sale alert',e);lastReceiptsAt=Date.now()-11000}
 finally{receiptsBusy=false}
}
function marketOpened(){
 const modal=$('modalBody');if(!modal||!($('modalTitle')?.textContent||'').includes('ตลาดผู้เล่น'))return;
 let wrap=$('amber19Earnings');
 if(!wrap){wrap=document.createElement('div');wrap.id='amber19Earnings';wrap.className='amber19-earnings';modal.prepend(wrap)}
 receiptsSummary();fetchReceipts(true);
 // Opening the market counts as reading all previously received sale alerts.
 if(getAlerts().length)markRead();
}
function refreshListings(){
 if(!visible()||!ready())return;
 const modal=$('amber16MarketRows');if(!modal||!modal.isConnected||marketReadBusy)return;
 marketReadBusy=true;
 Promise.resolve(window.AMBER_V16?.refreshMarket?.()).catch(e=>console.warn('[AMBER] market refresh',e)).finally(()=>marketReadBusy=false);
}
function refreshAfterEvent(){
 if(marketChangeTimeout!==null)clearTimeout(marketChangeTimeout);
 marketChangeTimeout=setTimeout(()=>{marketChangeTimeout=null;refreshListings();fetchReceipts(true)},300);
}
function onMarketMutation(op){
 refreshAfterEvent();
 const r=cloud()?.getRoom?.();
 if(r&&visible())r.emit('market',{type:String(op||'update').slice(0,40),at:Date.now()}).catch(()=>{});
}
function attachRoom(){
 const r=cloud()?.getRoom?.();if(!r||r===roomAttached)return;
 roomAttached=r;r.on('market',refreshAfterEvent);refreshAfterEvent();
}
function onResume(){
 if(!visible())return;
 setTimeout(()=>{attachRoom();refreshAfterEvent()},650);
}
function openLocations(){
 const names=window.AMBER_PUBLIC_PEERS||[];
 const mapLabels=typeof MAPS!=='undefined'?Object.fromEntries(MAPS.map(m=>[m[0],m[1]])):{};
 openModal('📍 ผู้เล่นออนไลน์ · แมพ / โซน',`<p class="hint">แสดงตำแหน่งล่าสุดที่ผู้เล่นส่งผ่าน Realtime</p><div id="amber19LiveLocations"></div>`);
 const paint=()=>{
  const el=$('amber19LiveLocations');if(!el)return;
  const peers=window.AMBER_PUBLIC_PEERS||[];
  el.innerHTML=peers.filter(p=>!p.isMe).map(p=>{
   const x=p.presence||{};
   return `<div class="statrow"><b>🟢 ${esc(x.n||'ผู้เล่น')}</b><span>Lv.${Math.max(1,Number(x.lv)||1)} · ${esc(mapLabels[x.map]||x.map||'ไม่ทราบแมพ')}<br><small>📍 ${esc(x.zone||'ไม่ทราบโซน')}</small></span></div>`;
  }).join('')||'<p>ตอนนี้ยังไม่พบเพื่อนออนไลน์ในห้อง Realtime</p>';
 };
 paint();
}
window.addEventListener('focus',onResume);
window.addEventListener('pageshow',onResume);
window.addEventListener('online',onResume);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)onResume()});
window.addEventListener('amber-v19-realtime',e=>{if(e.detail?.connected)onResume()});
$('spot')?.addEventListener('change',()=>window.dispatchEvent(new Event('amber-v19-location')));
setInterval(()=>{
 if(!visible()||!ready())return;
 attachRoom();fetchReceipts();refreshListings();
 // Player map/zone data comes from local Presence cache. No extra DB reads.
 if($('amber19LiveLocations')&&($('modalTitle')?.textContent||'').includes('ผู้เล่นออนไลน์')){
   const names=window.AMBER_PUBLIC_PEERS||[];
   const mapLabels=typeof MAPS!=='undefined'?Object.fromEntries(MAPS.map(m=>[m[0],m[1]])):{};
   $('amber19LiveLocations').innerHTML=names.filter(x=>!x.isMe).map(p=>`<div class="statrow"><b>🟢 ${esc(p.presence?.n||'ผู้เล่น')}</b><span>${esc(mapLabels[p.presence?.map]||p.presence?.map||'ไม่ทราบแมพ')}<br><small>📍 ${esc(p.presence?.zone||'ไม่ทราบโซน')}</small></span></div>`).join('')||'<p>ยังไม่พบเพื่อนออนไลน์</p>';
 }
},16000);
const style=document.createElement('style');style.textContent=`
#amber19AutoButton{padding:7px 9px;white-space:nowrap;background:#294463;border:1px solid #caa35d;color:#fff2c9;border-radius:7px;font-size:12px}
.amber19-slot{display:flex;align-items:center;gap:6px;border:1px solid #36485c;border-radius:7px;padding:7px 5px;margin:5px 0;background:#132034}.amber19-sloticon{width:40px;height:40px;flex:none;display:grid;place-items:center;font-size:24px}.amber19-sloticon img{height:38px;width:38px;object-fit:contain}.amber19-slotlabel{flex:1;min-width:0}.amber19-slotlabel b{font-size:12px;display:block}.amber19-slotlabel small{display:block;color:#9babbd}.amber19-slot button{flex:none;padding:7px 8px;font-size:11px}
.amber19-picker{max-height:54dvh;overflow:auto}.amber19-picker button{display:flex;align-items:center;gap:10px;width:100%;margin:6px 0;text-align:left;background:#14253c;color:#fff;border:1px solid #4f617c;border-radius:7px;padding:6px}.amber19-picker img{width:38px;height:38px;object-fit:contain}.amber19-picker small{display:block;color:#93a8bd}
.amber19-nav-market{position:relative}.amber19-badge{position:absolute;right:-4px;top:-7px;min-width:17px;height:17px;border-radius:12px;background:#e22d35;color:white;font-weight:900;line-height:17px;font-size:10px;justify-content:center;box-shadow:0 0 0 2px #111b29}
.amber19-earnings{border:1px solid #e27b68;padding:9px;border-radius:8px;background:#2c1821;margin-bottom:10px}.amber19-earnings b{display:block;color:#ff9e98}.amber19-earnings small{display:block;color:#e4bfb7;margin:4px 0}.amber19-earnings button{width:100%;margin-top:8px}
`;document.head.appendChild(style);
window.AMBER_V19={pickSkill,openSkillSetup:showSkills,marketOpened,onMarketMutation,fetchReceipts,openLocations};
attachSkillButton();badge();
// Add live location link beside existing Friends navigation without redesign.
const friendsNav=[...document.querySelectorAll('nav.nav button,.nav button')].find(b=>b.getAttribute('onclick')?.includes("openSocial('friends')"));
if(friendsNav&&!$('amber19LocationsButton')){
 const btn=document.createElement('button');btn.id='amber19LocationsButton';btn.textContent='📍 ออนไลน์';btn.onclick=openLocations;friendsNav.after(btn);
}
setTimeout(onResume,1000);
})();
