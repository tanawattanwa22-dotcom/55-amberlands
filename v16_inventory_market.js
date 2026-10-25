/* 55 AMBERLANDS V16 — inventory explanations, test drop tuning, stack sales.
   This adds on to V15. Do not alter combat, classes, UI layout, drops except
   the single test-rate change in index.html (0.05% -> 0.20% combined).
   SQL server marketplace is for a small trusted beta group, not anti-cheat. */
(()=>{
'use strict';
if(typeof state==='undefined'||typeof openModal!=='function')return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=v=>Math.max(0,Math.floor(Number(v)||0)).toLocaleString('th-TH');
const SLOTS={W:'อาวุธ',S:'ชุดเกราะ',G:'ถุงมือ',B:'รองเท้า',R:'แหวน'};
const KN={STR:'พลัง',DEX:'ความแม่นยำ',INT:'พลังเวท',VIT:'ความอึด',AGI:'ความคล่องตัว',LUK:'โชค',ATK:'พลังโจมตี',DEF:'พลังป้องกัน',HP:'HP สูงสุด',MP:'MP สูงสุด',CRIT:'คริติคอล'};
const BAG_HELP={
 'ใบไม้สีเขียว':['วัตถุดิบทั่วไป','ดรอปจากมอนสเตอร์ ใช้สะสมหรือขายได้','ตอนนี้ยังไม่มีสูตรคราฟต์ที่ใช้ใบไม้นี้'],
 'หินเวท':['วัตถุดิบทั่วไป','หินเวทที่ดรอปจากมอนสเตอร์ เก็บสะสมหรือนำไปขายได้','ไม่ใช่หินตีบวกอาวุธหรือชุด'],
 'เขี้ยวอสูร':['วัตถุดิบทั่วไป','ของที่ได้จากมอนสเตอร์ เอาไว้สะสมหรือขาย','ตอนนี้ยังไม่มีระบบคราฟต์ด้วยเขี้ยว'],
 'คริสตัลสีแดง':['วัตถุดิบทั่วไป','คริสตัลดรอปทั่วไป เก็บสะสมหรือขายได้','ไม่ใช่อัญมณีตีบวก'],
 'ชิ้นส่วนเกราะ':['วัตถุดิบทั่วไป','ชิ้นส่วนจากมอนสเตอร์ เก็บสะสมหรือขายได้','ยังไม่ใช่อุปกรณ์ที่สวมใส่ได้'],
 'หีบสมบัติบอส':['รางวัลจากบอส','รางวัลที่ได้จากการชนะบอส เก็บสะสมหรือตั้งขายได้','ยังไม่มีคำสั่งเปิดหีบในระบบนี้']
};
const MAT_HELP={
 gw:['เพชรเพลิงมังกร','หินตีบวกอาวุธ','ใช้ตีบวกอาวุธในเมนูอุปกรณ์ (อาวุธ +0 ถึง +10)','มีโอกาสดรอป 0.10% ต่อการกำจัดในช่วงทดสอบ'],
 ga:['ไข่มุกพิทักษ์','หินตีบวกชุด/เกราะ','ใช้ตีบวกอุปกรณ์ที่ไม่ใช่อาวุธในเมนูอุปกรณ์','มีโอกาสดรอป 0.10% ต่อการกำจัดในช่วงทดสอบ']
};
const TYPES={potion:'ยา',material:'หินตีบวก',bag:'ไอเทม',gear:'อุปกรณ์'};
const own=(kind,key)=>{
 if(kind==='potion'){
   if(!['hp','mp'].includes(key))return null;
   const hp=key==='hp',n=Math.max(0,Math.floor(Number(state[hp?'potHP':'potMP'])||0));
   return {kind,key,n,name:hp?'ยาฟื้น HP':'ยาฟื้น MP',
     kindDesc:'ไอเทมฟื้นฟู',
     desc:hp?`ฟื้น HP ${Math.max(130,Math.round(maxHp()*.55))} หน่วย (สูงสุดไม่เกินหลอดเลือด)`:`ฟื้น MP ${Math.max(70,Math.round(maxMp()*.6))} หน่วย (สูงสุดไม่เกินหลอดมานา)`,
     how:'สามารถกดใช้เองหรือเปิด AUTO Potion ได้ หากตัวละครเสียชีวิตต้องกดเกิดใหม่ก่อน',npc:25};
 }
 if(kind==='material'){
   if(!MAT_HELP[key])return null;
   const a=MAT_HELP[key];return{kind,key,n:Math.max(0,Math.floor(Number(state.mats?.[key])||0)),name:a[0],kindDesc:a[1],desc:a[2],how:a[3],npc:200};
 }
 if(kind==='bag'){
   const it=(state.bag||[]).find(it=>it.id===key);if(!it)return null;
   const a=BAG_HELP[it.name]||['ไอเทมสะสม','ไอเทมในกระเป๋า สามารถเก็บไว้หรือนำไปขายได้','ยังไม่มีปุ่มใช้งานเฉพาะสำหรับไอเทมนี้'];
   return{kind,key,n:Math.max(0,Math.floor(Number(it.qty)||0)),name:it.name,kindDesc:a[0],desc:a[1],how:a[2],npc:25};
 }
 if(kind==='gear'){
   const g=(state.gear||[]).find(g=>g.id===key);if(!g)return null;
   const eq=(state.eq||{})[g.slot]===g.id;
   const bonus=Object.entries(g.base||{}).map(([k,v])=>`${KN[k]||k} +${Math.round(v*(1+.12*(g.enh||0)))}`).concat((g.opts||[]).map(([k,v])=>`${KN[k]||k} +${Math.round(v*(1+.12*(g.enh||0)))}`)).join(' • ');
   const rn=['ธรรมดา','หายาก','เอพิค','ตำนาน'][g.rar||0]||'ธรรมดา';
   const npc=Math.max(1,Math.round((g.lv||1)*12*([1,1.25,1.6,2.1][g.rar||0]||1)*(1+(g.enh||0)*.6)+20));
   return{kind,key,n:1,name:g.name+(g.enh?' +'+g.enh:''),kindDesc:`${SLOTS[g.slot]||'อุปกรณ์'} • ${rn} • ${g.cls||'ทุกอาชีพ'}`,
     desc:`ต้องมีเลเวล ${g.req||1} ขึ้นไปจึงสวมได้${g.cls?' และต้องเป็นอาชีพ '+g.cls:''}`,
     how:bonus||'ไม่มีออปชันเสริม',npc,equipped:eq};
 }
 return null;
};
const api={};
function formQty(max){return `<label class="amber16-field">จำนวน (มี ${fmt(max)})<input id="amber16Qty" type="number" min="1" max="${Math.max(1,max)}" step="1" value="1" inputmode="numeric"></label>`}
function getQty(max){const n=Number($('amber16Qty')?.value);if(!Number.isSafeInteger(n)||n<1||n>max)throw new Error(`จำนวนต้องเป็น 1–${fmt(max)} ชิ้น`);return n}
function saleForm(it){
 const npc=it.npc||25;
 return `<section class="amber16-actions"><h3>💰 ขายหรือประกาศขาย</h3>${formQty(it.n)}
 <p class="hint">ร้าน NPC รับซื้อ ${fmt(npc)} Gold / ชิ้น · เลือกจำนวนแล้วขายได้ทันที</p>
 <button type="button" id="amber16Npc" class="goldbtn">ขายให้ NPC</button>
 <label class="amber16-field">ตั้งขายในตลาด — ราคาต่อชิ้น (Gold)<input id="amber16Price" type="number" min="1" max="10000000" step="1" value="${Math.max(1,npc*3)}" inputmode="numeric"></label>
 <button type="button" id="amber16Post">📣 ตั้งขายให้ผู้เล่นอื่น</button>
 <p class="hint">เมื่อตั้งขาย ของจะถูกพักไว้ในตลาดทันที หากขายไม่ออกสามารถกดยกเลิกเพื่อรับของคืนได้</p></section>`;
}
function show(kind,key){
 const it=own(kind,key);if(!it){notify('ไม่พบไอเทมนี้');return}
 const actions=it.n>0&&!it.equipped?saleForm(it):it.equipped?'<p class="hint">⚠️ ถอดอุปกรณ์ก่อนตั้งขาย</p>':'<p class="hint">ไม่มีไอเทมคงเหลือ</p>';
 openModal('🎒 '+it.name,`<div class="amber16-info"><div class="statrow"><b>ประเภท</b><span>${esc(it.kindDesc)}</span></div><div class="statrow"><b>จำนวนที่มี</b><span>${fmt(it.n)}</span></div><p><b>รายละเอียด:</b> ${esc(it.desc)}</p><p><b>การใช้งาน:</b> ${esc(it.how)}</p>${kind==='potion'&&it.n?`<button id="amber16Drink" class="goldbtn">🧪 ใช้ยา 1 ขวด</button>`:''}${kind==='gear'?`<button id="amber16GoGear">ดูหน้าตีบวก/สวมใส่</button>`:''}</div>${actions}`);
 $('amber16Npc')?.addEventListener('click',()=>api.npcSell(kind,key));
 $('amber16Post')?.addEventListener('click',()=>api.post(kind,key));
 $('amber16Drink')?.addEventListener('click',()=>{window.AMBER_V15?.drink(key);if(($('modalTitle')?.textContent||'').includes('ยาฟื้น'))show(kind,key)});
 $('amber16GoGear')?.addEventListener('click',()=>openGear(key));
}
api.show=show;
api.npcSell=(kind,key)=>{
 try{
  const it=own(kind,key);if(!it||it.equipped)throw new Error('ขายไอเทมนี้ไม่ได้');
  const count=getQty(it.n),price=it.npc*count;
  if(!confirm(`ยืนยันขาย ${it.name} ×${count} ให้ NPC รับ ${fmt(price)} Gold?`))return;
  if(kind==='potion')state[key==='hp'?'potHP':'potMP']-=count;
  else if(kind==='material')state.mats[key]-=count;
  else if(kind==='bag'){const o=state.bag.find(x=>x.id===key);o.qty-=count;if(o.qty<=0)state.bag=state.bag.filter(x=>x!==o)}
  else if(kind==='gear'){state.gear=state.gear.filter(g=>g.id!==key);if(window.AMB?.ap)window.AMB.ap()}
  state.gold+=price;
  log(`💰 ขาย ${it.name} ×${count} ให้ NPC ได้ ${fmt(price)} Gold`,'good');
  render();save();
  const next=own(kind,key);if(next?.n>0)show(kind,key);else openInventory();
 }catch(e){notify(e.message)}
};
const cloud=()=>window.AMBER_CLOUD;
async function tx(name,params){
 const c=cloud(),sb=c?.getClient?.();
 if(!sb||!c?.getStatus?.()?.cloudReady)throw new Error('ต้องเข้าสู่ระบบด้วย Google และเชื่อม Supabase ก่อน');
 await c.beginMarket();
 try{
  const {data,error}=await sb.rpc(name,params);
  if(error)throw error;
  window.AMBER_V19?.onMarketMutation?.(name);
  return data;
 }finally{await c.endMarket()}
}
let busy=false;
api.post=async(kind,key)=>{
 if(busy)return;
 try{
  const it=own(kind,key);if(!it||it.equipped)throw new Error('ถอดอุปกรณ์ก่อนตั้งขาย');
  const q=getQty(it.n),price=Number($('amber16Price')?.value);
  if(!Number.isSafeInteger(price)||price<1||price>10000000)throw new Error('ราคาต้องอยู่ระหว่าง 1–10,000,000 Gold');
  if(!confirm(`ลงขาย ${it.name} ×${q} ในราคา ${fmt(price)} Gold/ชิ้น?`))return;
  busy=true;
  await tx('amber_market_post',{p_kind:kind,p_key:key,p_quantity:q,p_price:price});
  log(`⚖️ ลงขาย ${it.name} ×${q} ราคา ${fmt(price)} Gold/ชิ้น`,'good');
  notify('✅ ตั้งขายสำเร็จ ไอเทมถูกย้ายเข้าตลาดแล้ว');
  await showMarket();
 }catch(e){notify('ตั้งขายไม่สำเร็จ: '+(e.message||e))}finally{busy=false}
};
let listingCache=[];
function listCard(x,self){
 const row=`<div class="statrow amber16-marketrow"><div><b>${esc(x.item_name)}</b><small>ผู้ขาย: ${esc(x.seller_name)} • ${esc(TYPES[x.item_kind]||'ไอเทม')} • คงเหลือ ${fmt(x.quantity)}</small><small>ราคา ${fmt(x.unit_price)} Gold / ชิ้น</small></div>${self?`<button data-mcancel="${x.id}">ยกเลิกประกาศ</button>`:`<button data-mbuy="${x.id}">ซื้อ</button>`}</div>`;
 return row;
}
async function showMarket(){
 openModal('⚖️ ตลาดผู้เล่น',`<p class="hint">ตลาดออนไลน์กลุ่มทดสอบ • เลือกไอเทมจากกระเป๋าเพื่อตั้งขาย • เลือกจำนวนและราคาได้</p><button id="amber16MarketRefresh">🔄 รีเฟรชรายการ</button><div id="amber16MarketRows"><p class="hint">กำลังโหลดรายการขาย...</p></div>`);
 $('amber16MarketRefresh')?.addEventListener('click',refreshMarket);
 await refreshMarket();
 window.AMBER_V19?.marketOpened?.();
}
async function refreshMarket(){
 const el=$('amber16MarketRows');if(!el)return;
 const sb=cloud()?.getClient?.(),me=cloud()?.getUser?.();
 if(!sb||!me){el.textContent='โปรดเข้าสู่ระบบ Google ก่อนใช้งานตลาด';return}
 try{
  const {data,error}=await sb.from('amber_market_listings')
   .select('id,seller_id,seller_name,item_kind,item_key,item_name,quantity,unit_price,created_at')
   .eq('status','active').order('created_at',{ascending:false}).limit(60);
  if(error)throw error;
  listingCache=data||[];
  if(!el.isConnected)return;
  el.innerHTML=listingCache.length?listingCache.map(x=>listCard(x,x.seller_id===me.id)).join(''):'<p class="hint">ยังไม่มีประกาศขาย • เปิดกระเป๋าเพื่อเริ่มตั้งขาย</p>';
  el.querySelectorAll('[data-mcancel]').forEach(b=>b.addEventListener('click',()=>api.cancel(Number(b.dataset.mcancel))));
  el.querySelectorAll('[data-mbuy]').forEach(b=>b.addEventListener('click',()=>api.buyModal(Number(b.dataset.mbuy))));
 }catch(e){if(el.isConnected)el.textContent='โหลดตลาดไม่สำเร็จ: '+(e.message||e)}
}
api.cancel=async id=>{
 if(busy||!confirm('ยกเลิกประกาศนี้และคืนของที่ยังไม่ขายเข้ากระเป๋า?'))return;
 busy=true;
 try{await tx('amber_market_cancel',{p_id:id});notify('✅ ยกเลิกประกาศและคืนไอเทมแล้ว');await showMarket()}
 catch(e){notify('ยกเลิกไม่สำเร็จ: '+(e.message||e))}
 finally{busy=false}
};
api.buyModal=id=>{
 const it=listingCache.find(x=>x.id===id);if(!it){notify('ประกาศหมดอายุแล้ว');return}
 openModal('🛒 ซื้อจากผู้เล่น',`<h3>${esc(it.item_name)}</h3><p>ผู้ขาย: ${esc(it.seller_name)}</p><p>ราคา <b>${fmt(it.unit_price)} Gold/ชิ้น</b> • คงเหลือ ${fmt(it.quantity)} ชิ้น</p><p>Gold ของคุณ: ${fmt(state.gold)}</p>${formQty(it.quantity)}<button id="amber16ConfirmBuy" class="goldbtn">🛒 ยืนยันซื้อ</button><button id="amber16BackMarket">กลับตลาด</button><p class="hint">ระบบจะตรวจเงินและจำนวนของในฐานข้อมูลก่อนทำรายการ</p>`);
 $('amber16ConfirmBuy')?.addEventListener('click',()=>api.buy(id));
 $('amber16BackMarket')?.addEventListener('click',showMarket);
};
api.buy=async id=>{
 if(busy)return;
 try{
  const it=listingCache.find(x=>x.id===id);if(!it)throw new Error('ไม่พบประกาศ');
  const q=getQty(it.quantity),cost=it.unit_price*q;
  if(!confirm(`ซื้อ ${it.item_name} ×${q} รวม ${fmt(cost)} Gold?`))return;
  busy=true;
  await tx('amber_market_buy',{p_id:id,p_qty:q});
  log(`🛒 ซื้อ ${it.item_name} ×${q} ราคา ${fmt(cost)} Gold`,'good');
  notify('✅ ซื้อสำเร็จ ไอเทมเข้ากระเป๋าแล้ว');
  await showMarket();
 }catch(e){notify('ซื้อไม่สำเร็จ: '+(e.message||e))}
 finally{busy=false}
};
api.openMarket=showMarket;
api.refreshMarket=refreshMarket;
api.showMarket=showMarket;
window.AMBER_V16=api;

// Reuse existing menu art, item slots, equipped gear UI and NPC systems.
itemClick=function(i){const it=state.bag?.[i];if(it)show('bag',it.id)};
openMarket=showMarket;
const baseOpenInventory=openInventory;
openInventory=function(){baseOpenInventory();
  $('modalBody')?.insertAdjacentHTML('beforeend','<p class="hint">แตะไอเทมเพื่ออ่านรายละเอียด เลือกจำนวนขายให้ NPC หรือตั้งขายในตลาดผู้เล่น • หินตีบวกให้แตะที่รูปหิน</p>');
};
const gearView=window.openGear;
if(typeof gearView==='function')window.openGear=function(id,msg){
 gearView(id,msg);const it=own('gear',id);if(!it)return;
 const text=`<section class="amber16-info"><p><b>ใช้งาน:</b> ${esc(it.desc)}</p><p><b>ค่าสถานะ:</b> ${esc(it.how)}</p>${it.equipped?'<p class="hint">ถอดอุปกรณ์ก่อนนำไปขายในตลาด</p>':`<button type="button" id="amber16GearMarket">📣 ตั้งขายในตลาด</button>`}</section>`;
 $('modalBody')?.insertAdjacentHTML('beforeend',text);
 $('amber16GearMarket')?.addEventListener('click',()=>show('gear',id));
};

// Click potion and upgrade materials to inspect rather than accidentally using.
document.addEventListener('click',event=>{
  const p=event.target.closest('.amber15-potion-card');
  if(p&&p.closest('#bag,#modalBody')){
    event.preventDefault();event.stopImmediatePropagation();
    show('potion',p.dataset.potion);return;
  }
  const e=event.target.closest('.item');
  if(!e||!e.closest('#bag,#modalBody'))return;
  if(e.matches('button.gc')||e.closest('.gc'))return;
  const text=e.textContent||'';
  for(const k of ['gw','ga'])if(text.includes(MAT_HELP[k][0])){
    event.preventDefault();event.stopImmediatePropagation();show('material',k);return;
  }
},true);

const style=document.createElement('style');style.id='amber16-style';style.textContent=`
.amber16-info{padding:6px 4px;line-height:1.6}.amber16-info p{margin:9px 0}.amber16-info b{color:#f9d58f}
.amber16-actions{border-top:1px solid #715836;margin-top:12px;padding:9px 3px}.amber16-actions h3{padding:8px;margin:0 0 8px;color:#ffe1a0}
.amber16-field{display:block;font-size:13px;color:#d9cfba;margin:9px 0}.amber16-field input{display:block;width:100%;margin-top:5px;padding:11px 9px;min-height:44px;box-sizing:border-box;background:#0a1521;color:#fff0d5;border:1px solid #986c32;border-radius:8px}
.amber16-actions button{margin:5px 3px 5px 0}.amber16-marketrow{display:flex;gap:8px;align-items:center}.amber16-marketrow>div{min-width:0;flex:1}.amber16-marketrow small{display:block;font-size:11px;color:#a8bacd;margin:3px 0}.amber16-marketrow button{flex-shrink:0}
`;document.head.appendChild(style);
})();
