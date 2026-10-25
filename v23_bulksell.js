/* V23 safe client-side NPC bulk sale; existing inventory and single-item sale preserved. */
(()=>{'use strict';const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let selected=new Set();
const gearPrice=g=>Math.round((Number(g.lv)||1)*12*([1,1.25,1.6,2.1][Math.max(0,Math.min(3,g.rar||0))]||1)*(1+(Number(g.enh)||0)*.6)+20);
function entries(){const out=[];state.bag.forEach((g,i)=>{if(['hp','mp'].includes(g.id))return;out.push({key:'b'+i,kind:'bag',index:i,name:g.name,qty:Math.max(0,Number(g.qty)||0),price:25})});
(state.gear||[]).forEach((g,i)=>{if(state.eq?.[g.slot]===g.id||g?.mythic||g?.boss===true||g?.bossDrop===true||String(g?.id||'').startsWith('dg_'))return;out.push({key:'g'+g.id,kind:'gear',index:i,id:g.id,name:g.name+(g.enh?' +'+g.enh:''),qty:1,price:gearPrice(g)})});return out}
function show(){selected=new Set();renderBulk()}
function renderBulk(){const rows=entries();openModal('💰 เลือกขายของหลายชนิด',`<p class="hint">เลือกหลายชนิดเพื่อขายให้ NPC ในครั้งเดียว · ป้องกันขายไอเทมที่สวมใส่และอาวุธออปเทพ · ไอเทมคอยล์ขายไม่ได้</p><div class="amber23-bulk"><div class="amber23-bulkTools"><button id="v23SelectAll">เลือกทั้งหมด</button><button id="v23Unselect">ล้างการเลือก</button></div>${rows.map(e=>`<label class="amber23-bulkRow"><input type="checkbox" data-bulk-key="${esc(e.key)}" ${selected.has(e.key)?'checked':''}><span><b>${esc(e.name)}</b><small>${e.kind==='bag'?'×'+e.qty+' · ขายทั้งกอง':'อุปกรณ์ ×1'} · ${e.price} Gold/ชิ้น</small></span><strong>${(e.price*e.qty).toLocaleString()} G</strong></label>`).join('')||'<p>ไม่มีรายการขายได้</p>'}</div><button id="v23SellConfirm" class="goldbtn">💰 ขายของที่เลือก</button>`);
$('v23SelectAll').onclick=()=>{selected=new Set(rows.map(r=>r.key));renderBulk()};$('v23Unselect').onclick=()=>{selected.clear();renderBulk()};
$('modalBody').querySelectorAll('[data-bulk-key]').forEach(c=>c.onchange=()=>{c.checked?selected.add(c.dataset.bulkKey):selected.delete(c.dataset.bulkKey)});
$('v23SellConfirm').onclick=()=>sale();}
function sale(){const chosen=entries().filter(r=>selected.has(r.key));if(!chosen.length){notify('ยังไม่ได้เลือกของที่จะขาย');return}
const sum=chosen.reduce((acc,x)=>acc+x.qty*x.price,0);
if(!confirm(`ยืนยันขาย ${chosen.length} ชนิด รับ ${sum.toLocaleString('th-TH')} Gold ?`))return;
// Rebuild by stable ids/index; no implicit shop items and no equipped gear.
const bagIndices=new Set(chosen.filter(r=>r.kind==='bag').map(r=>r.index));
const gearIds=new Set(chosen.filter(r=>r.kind==='gear').map(r=>r.id));
state.bag=state.bag.filter((g,i)=>!bagIndices.has(i));
state.gear=state.gear.filter(g=>!gearIds.has(g.id));state.gold=Math.max(0,(Number(state.gold)||0)+sum);
log('💰 ขายหลายรายการ '+chosen.length+' ชนิด ได้ '+sum.toLocaleString('th-TH')+' Gold','good');save();render();renderBag();closeModal();notify('✅ ขายสำเร็จ '+chosen.length+' ชนิด');}
const previous=openInventory;openInventory=function(){previous();const container=$('modalBody');if(!container)return;
const b=document.createElement('button');b.textContent='💰 เลือกขายหลายชนิด';b.className='goldbtn';b.style.cssText='width:100%;margin-top:8px;min-height:44px';b.onclick=show;container.appendChild(b)};
const st=document.createElement('style');st.textContent=`.amber23-bulk{max-height:50vh;overflow:auto}.amber23-bulkTools{display:flex;gap:8px;margin:8px 0}.amber23-bulkRow{display:flex;align-items:center;gap:10px;border:1px solid #645b4d;border-radius:8px;padding:8px;margin:5px 0;background:#14212c;min-height:51px}.amber23-bulkRow input{accent-color:#dfaf5b;width:19px;height:19px}.amber23-bulkRow span{display:flex;flex:1;min-width:0;flex-direction:column}.amber23-bulkRow small{color:#afc6d7}.amber23-bulkRow strong{white-space:nowrap;color:#ffcf85}`;document.head.appendChild(st);
})();
