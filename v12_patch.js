/* 55 AMBERLANDS V12 — incremental equipment appearance, NPC basic stock,
   meaningful stat effects, Lv.100 cap, controlled multi-hit skills.
   Original V11 artwork, maps, game UI, party networking, save model and quests are preserved.
   This file contains only the V12 feature layer. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), A=window.AMB;
if(!A || typeof state==='undefined')return;
const safe=s=>String(s??'').replace(/[&<>"'`]/g,c=>'&#'+c.charCodeAt(0)+';');
const bound=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number(v)||0));
const CLASSES=['ดาบ','หมัด','ธนู','จอมเวท'];
const LEVELS=[1,10,20,30,40,50,60,70,80,90,100];
const SLOTS={W:'อาวุธ',S:'ชุด',G:'ถุงมือ',B:'รองเท้า'};
const WEAPON_NOUN={'ดาบ':'ดาบ','หมัด':'นวม','ธนู':'ธนู','จอมเวท':'คทา'};
const ARMOR_NOUN={'ดาบ':'นักดาบ','หมัด':'นักสู้','ธนู':'นักธนู','จอมเวท':'จอมเวท'};
const MAIN_STAT={'ดาบ':'STR','หมัด':'AGI','ธนู':'DEX','จอมเวท':'INT'};
const STAT_DESC={
 STR:['กำลัง','เพิ่มความแรงโจมตีพื้นฐาน โดยเฉพาะสายดาบ'],
 DEX:['ความแม่นยำ','เพิ่มโอกาสโจมตีโดน และพลังธนู'],
 INT:['พลังเวท','เพิ่มความแรงเวทและ MP สูงสุด'],
 VIT:['ความอึด','เพิ่ม HP สูงสุดและช่วยลดความเสียหายที่ได้รับ'],
 AGI:['ความคล่องตัว','เพิ่มการหลบหลีก ความเร็วตี AUTO และพลังสายหมัด'],
 LUK:['โชคการต่อสู้','เพิ่มโอกาสติดคริติคอล (ไม่เพิ่มอัตราดรอปไอเทม)']
};
let lastSkill='',weaponIcons=new Map();
function weapon(){A.ensure();return A.G(state.eq?.W)||null}
function gearType(w){return w?.cls&&CLASSES.includes(w.cls)?w.cls:(state.job==='นักผจญภัย'?'ดาบ':state.job)}
function combat(){
 const st=state.stats||{},lv=bound(state.lv,1,100);
 const str=Number(st.STR||0),dex=Number(st.DEX||0),int=Number(st.INT||0),vit=Number(st.VIT||0),agi=Number(st.AGI||0),luk=Number(st.LUK||0);
 const cls=state.job;
 const focus=cls==='ดาบ'?str*.42:cls==='หมัด'?agi*.96:cls==='ธนู'?dex*1.03:cls==='จอมเวท'?int*1.08:0;
 return {
  atk:Math.max(1,Math.round(12+lv*2.8+str*1.45+focus)),
  def:Math.max(0,Math.round(lv*.45+vit*.65)),
  accuracy:bound(.81+dex*.0027,.2,.985),
  dodge:bound(.025+agi*.0015+dex*.0003,0,.24),
  crit:bound(.07+luk*.0024,0,.48),
  aspd:Math.round(1000/Math.max(650,Math.round(925-agi*2))*100)/100,
  maxHp:Math.round(maxHp()),maxMp:Math.round(maxMp())
 }
}
const mhBefore=maxHp, mmBefore=maxMp;
maxHp=function(){return Math.max(1,Math.round(mhBefore()+Math.max(0,((state.stats||{}).VIT||0)-10)*8))};
maxMp=function(){return Math.max(1,Math.round(mmBefore()+Math.max(0,((state.stats||{}).INT||0)-5)*3))};
function weaponInfo(){const w=weapon();return w?{name:w.name,cls:gearType(w),lv:bound(w.lv,1,100),enh:bound(w.enh,0,10),rar:bound(w.rar,0,3)}:(state.equip==='ดาบฝึกหัด'?{name:'ดาบฝึกหัด',cls:'ดาบ',lv:1,enh:0,rar:0}:null)}
function presenceInfo(){const w=weaponInfo(),c=combat();return {w:w?.name||'',wt:w?.cls||'',wl:w?.lv||0,we:w?.enh||0,wr:w?.rar||0,atk:c.atk,def:c.def,crt:Math.round(c.crit*100),mhp:c.maxHp,mmp:c.maxMp,acc:Math.round(c.accuracy*100),eva:Math.round(c.dodge*100),spd:Math.round(c.aspd*100)}}
function lightColor(enh,rar){if(enh>=10)return '#f6fcff';if(enh===9)return '#ff62d5';if(enh===8)return '#ffc94d';if(enh===7)return '#54baff';return ['#aebed3','#96d5aa','#d3a1fc','#ffc47e'][bound(rar,0,3)]}
function svgWeapon(cls,rar,enh,lv,name=''){
 const key=[cls,rar,enh,lv,name].join('|');if(weaponIcons.has(key))return weaponIcons.get(key);
 const glow=lightColor(enh,rar),edge='#ecf4ff',metals=['#9eb2cb','#95dcc4','#b58de9','#ffbc62'];
 const metal=metals[bound(rar,0,3)];const ornaments=Math.min(4,Math.floor((bound(lv,1,100)-1)/25));const variant=[...String(name)].reduce((a,c)=>(a+c.charCodeAt(0))%3,0);
 let content='';
 if(cls==='หมัด'){
   content=`<path d="M10 20h26l7 9-6 19H10L5 32z" fill="${metal}" stroke="${edge}" stroke-width="2"/><path d="M10 17v12M18 13v16M27 13v16M35 18v11" stroke="${glow}" stroke-width="4"/><path d="M12 38h21" stroke="#354258" stroke-width="5"/>`;
 }else if(cls==='ธนู'){
   content=`<path d="M12 8Q48 29 12 60Q30 35 12 8Z" fill="${metal}" stroke="${glow}" stroke-width="3"/><path d="M12 8L14 59" stroke="${edge}" stroke-width="2"/><path d="M9 34H44L33 28M44 34L33 40" stroke="${glow}" stroke-width="3" fill="none"/>`;
 }else if(cls==='จอมเวท'){
   content=`<path d="M21 15L29 15L31 60L23 60Z" fill="#996c3e" stroke="#f6d19a" stroke-width="2"/><path d="M26 2L38 15L26 28L14 15Z" fill="${metal}" stroke="${glow}" stroke-width="3"/><path d="M26 7L33 15L26 23L19 15Z" fill="${glow}"/><circle cx="26" cy="15" r="3" fill="white"/>`;
 }else{
   content=`<path d="${variant===0?'M23 3L29 3L34 42L18 42Z':variant===1?'M21 3L29 3L36 42L16 42Z':'M23 3L31 3L29 42L21 42Z'}" fill="${metal}" stroke="${edge}" stroke-width="2"/><path d="M23 4L26 0L29 4L27 39L24 39Z" fill="${glow}"/><path d="M11 41H41V47H11Z" fill="#d9ac59" stroke="${edge}" stroke-width="1"/><path d="M23 46H29V60H23Z" fill="#69452c"/><path d="M21 61H31V65H21Z" fill="#deb65f"/>`;
 }
 for(let i=0;i<ornaments;i++)content+=`<circle cx="${16+i*7}" cy="${cls==='ดาบ'?42:cls==='หมัด'?28:35}" r="1.4" fill="${glow}"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="52" height="68" viewBox="0 0 52 68" shape-rendering="crispEdges">${content}</svg>`;
 const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);weaponIcons.set(key,url);return url;
}
function weaponOverlay(el,w){el.querySelectorAll(':scope > .amber-equipped-weapon').forEach(n=>n.remove());if(!w||!w.name)return;
 const cls=CLASSES.includes(w.cls)?w.cls:'ดาบ',rar=bound(w.rar,0,3),enh=bound(w.enh,0,10),lv=bound(w.lv,1,100);
 const imageEl=document.createElement('img');imageEl.className='amber-equipped-weapon'+(enh>=7?' amber-weapon-glow amber-weapon-plus'+enh:'');
 imageEl.alt=w.name+' +'+enh;imageEl.title=imageEl.alt;imageEl.src=svgWeapon(cls,rar,enh,lv,w.name);
 imageEl.style.setProperty('--amber-aura',lightColor(enh,rar));el.appendChild(imageEl);
}
function profile(name,lv,job,gender,c,w,online){
 const fields=[['พลังโจมตี ATK',c.atk],['ป้องกัน DEF',c.def],['HP สูงสุด',c.maxHp||'—'],['MP สูงสุด',c.maxMp||'—'],['แม่นยำ',c.accuracy!=null?(c.accuracy*100).toFixed(1)+'%':'—'],['หลบหลีก',c.dodge!=null?(c.dodge*100).toFixed(1)+'%':'—'],['คริติคอล',Math.round((c.crit||0)*100)+'%'],['ตีอัตโนมัติ',c.aspd?c.aspd.toFixed(2)+' ครั้ง/วินาที':'—']];
 const label=s=>safe(s);
 openModal('👤 ข้อมูลผู้เล่น',`<div class="amber-profile-preview"><img src="${window.AMBER_AVATAR?.get?.(gender||'male',job)||$('portrait').src}" alt="ตัวละคร"><div><b>${label(name)}</b><small>Lv.${bound(lv,1,100)} · ${label(job)}</small><small>${gender==='female'?'♀ หญิง':'♂ ชาย'} · ${online?'🟢 ออนไลน์':'ตัวละครของคุณ'}</small></div></div>
 <div class="amber-metrics">${fields.map(([k,v])=>`<div><small>${k}</small><b>${label(v)}</b></div>`).join('')}</div>
 <div class="statrow"><span>อาวุธที่สวมใส่</span><b>${w?label(w.name)+(w.enh?' +'+w.enh:''):'ไม่มีอาวุธ'}</b></div>
 ${w?`<div style="text-align:center"><img class="amber-profile-weapon" src="${svgWeapon(w.cls,w.rar,w.enh,w.lv,w.name)}" alt="อาวุธ" style="--amber-aura:${lightColor(w.enh,w.rar)}"></div>`:''}
 <p class="hint">ข้อมูลเพื่อนแสดงจากสถานะออนไลน์ล่าสุด ไม่ใช่ข้อมูลส่วนตัวหรืออีเมล Google</p>`);
}
function sceneDecorate(){
 const all=[...document.querySelectorAll('#sprites .sprite')];if(!all.length)return;
 const people=window.AMBER_SCENE_PLAYERS||[];
 for(let i=0;i<all.length;i++){
  const el=all[i],p=i===0?null:people[i-1],own=weaponInfo();
  const w=i===0?own:(p?.w?{name:p.w,cls:p.wt,rar:p.wr,enh:p.we,lv:p.wl}:null);
  weaponOverlay(el,w);
  el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','ดูข้อมูลตัวละคร '+(p?.n||state.name));
  const click=()=>{
    const c=p?{atk:p.atk||0,def:p.def||0,crit:(p.crt||0)/100,maxHp:p.mhp,maxMp:p.mmp,accuracy:p.acc/100,dodge:p.eva/100,aspd:p.spd/100}:combat();
    profile(p?.n||state.name,p?.lv||state.lv,p?.job||state.job,p?.gender||state.gender,c,w,!!p);
  };
  el.onclick=click;el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();click()}};
 }
}
function partyDecorate(){
 const members=window.AMBER_PARTY_PLAYERS||[];
 const cards=[...document.querySelectorAll('#members .member')];
 cards.forEach((el,i)=>{
  const p=i===0?null:members[i-1];
  if(p) {const w=p.w?{name:p.w,cls:p.wt,rar:p.wr,enh:p.we,lv:p.wl}:null;el.onclick=()=>profile(p.n,p.lv,p.job,p.gender,{atk:p.atk,def:p.def,crit:p.crt/100,maxHp:p.mhp,maxMp:p.mmp,accuracy:p.acc/100,dodge:p.eva/100,aspd:p.spd/100},w,true)}
  else el.onclick=()=>profile(state.name,state.lv,state.job,state.gender||'male',combat(),weaponInfo(),false);
  el.classList.add('amber-profile-click');el.tabIndex=0;el.onkeydown=e=>{if(e.key==='Enter')el.click()};
 });
}
function statStrip(){
 const parent=document.querySelector('.statsline');if(!parent)return;
 let e=$('amberStatStrip');if(!e){e=document.createElement('div');e.id='amberStatStrip';parent.appendChild(e)}
 const c=combat();e.innerHTML=`<span>⚔️ ATK <b>${c.atk}</b></span><span>🛡️ DEF <b>${c.def}</b></span><span>💥 CRIT <b>${(c.crit*100).toFixed(1)}%</b></span><span>🎯 HIT <b>${(c.accuracy*100).toFixed(1)}%</b></span><span>💨 EVA <b>${(c.dodge*100).toFixed(1)}%</b></span><span>⚡ ASPD <b>${c.aspd.toFixed(2)}/s</b></span>`;
 let label=$('amberEquippedLabel');if(!label){label=document.createElement('div');label.id='amberEquippedLabel';parent.appendChild(label)}
 const w=weaponInfo();label.textContent=w?'🗡️ '+w.name+(w.enh?' +'+w.enh:''):'🗡️ '+(state.equip||'อาวุธเริ่มต้น');
 if(state.lv>=100){state.lv=100;state.xp=0;const xp=$('expPercent');if(xp)xp.textContent='MAX LEVEL 100';const xpbar=$('pxp')?.querySelector('.fill');if(xpbar)xpbar.style.width='100%';const lab=$('pxp')?.querySelector('.barlabel');if(lab)lab.textContent='MAX / MAX'}
}
function details(){const c=combat();return `<h3 style="margin:12px 0 7px">📊 ค่าพลังปัจจุบัน (รวมอุปกรณ์)</h3><div id="amberExtended" class="amber-metrics">
  ${[['ATK โจมตี',c.atk],['DEF ป้องกัน',c.def],['HP สูงสุด',c.maxHp],['MP สูงสุด',c.maxMp],['ความแม่นยำ',(c.accuracy*100).toFixed(1)+'%'],['หลบหลีก',(c.dodge*100).toFixed(1)+'%'],['คริติคอล',(c.crit*100).toFixed(1)+'%'],['ตี AUTO',c.aspd.toFixed(2)+' ครั้ง/วินาที'],['คลาส',state.job],['เลเวล',state.lv+'/100']].map(([k,v])=>`<div><small>${safe(k)}</small><b>${safe(v)}</b></div>`).join('')}
 </div><p class="hint">ค่าสเตตัสเปลี่ยนผลการต่อสู้จริง ได้แก่ ดาเมจ ความแม่นยำ HP MP การป้องกัน การหลบหลีก คริติคอล และความเร็ว AUTO · สายอาชีพต่างกันใช้สเตตัสหลักต่างกัน</p>`}
function updateExtended(){const old=$('amberExtended');if(old){const d=document.createElement('div');d.innerHTML=details();old.replaceWith(d.querySelector('#amberExtended'))}}
const originalStatRows=statRows;
statRows=function(){
 const host=$('statrows');if(!host)return;
 host.innerHTML=Object.keys(STAT_DESC).map(k=>`<div class="statrow amber-stat-explain"><div><b>${k} — ${STAT_DESC[k][0]}</b><small>${STAT_DESC[k][1]}</small></div><span>${Math.round(state.stats[k]||0)}</span><button onclick="upStat('${k}')" ${state.points<=0?'disabled':''}>+1</button></div>`).join('');
 if($('pts'))$('pts').textContent=state.points;
};
const originalUpStat=upStat;
upStat=function(k){if(!STAT_DESC[k])return;originalUpStat(k);updateExtended()};
const originalStatModal=statModal;
statModal=function(){originalStatModal();const gearHeader=[...$('modalBody').querySelectorAll('h3')].find(h=>h.textContent.includes('อุปกรณ์ที่สวมใส่'));if(gearHeader)gearHeader.insertAdjacentHTML('beforebegin',details());else $('modalBody').insertAdjacentHTML('beforeend',details())};
const originalRenderTop=renderTop;
renderTop=function(){originalRenderTop();statStrip()};
const originalRenderParty=renderParty;
renderParty=function(){originalRenderParty();partyDecorate()};
const originalRenderScene=renderScene;
renderScene=function(){originalRenderScene();sceneDecorate()};
// Real equipped weapon graphics and public stats are refreshed when the user changes or enhances gear.
const originalEquip=window.equipG;
window.equipG=function(id){originalEquip(id);renderTop();renderParty();renderScene()};
const originalEnhance=window.enhance;
window.enhance=function(id){originalEnhance(id);renderTop();renderScene()};
const originalSelJob=selectJob;
selectJob=function(job){originalSelJob(job);renderTop();renderScene()};
// NPC: no super-rare items, no high enhancement and only one small starter option at higher levels.
function npcPrice(lv,slot){return Math.round(40+lv*lv*(slot==='W'?4.2:slot==='S'?3.5:2.3))}
function npcEntry(cls,slot,lv){
 const bases={W:{ATK:Math.round(8+lv*1.25)},S:{DEF:Math.round(2+lv*.62),HP:Math.round(12+lv*2)},G:{ATK:Math.round(2+lv*.27)},B:{DEF:Math.round(1+lv*.3),AGI:Math.round(lv/45)}};
 const names={W:WEAPON_NOUN[cls],S:'ชุด'+ARMOR_NOUN[cls],G:'ถุงมือ'+ARMOR_NOUN[cls],B:'รองเท้า'+ARMOR_NOUN[cls]};
 const primary=MAIN_STAT[cls];
 return {id:'npc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9),slot,cls,name:`${names[slot]}ฝึกหัด Lv.${lv}`,rar:0,lv,req:lv,base:{...bases[slot]},opts:lv>=50?[[primary,Math.min(3,Math.ceil((lv-40)/25))]]:[],enh:0,npc:true};
}
const shopState={cls:'ดาบ',slot:'W'};
function shopRefresh(){
 const cls=$('amberShopClass')?.value||shopState.cls,slot=$('amberShopSlot')?.value||shopState.slot;
 shopState.cls=cls;shopState.slot=slot;const area=$('amberShopList');if(!area)return;
 area.innerHTML=LEVELS.map(lv=>{
  const item=npcEntry(cls,slot,lv),cost=npcPrice(lv,slot),bonuses=Object.entries(item.base).map(([k,v])=>(A.ON[k]||k)+' +'+v).join(' / ');
  return `<div class="amber-npc-row"><div><b>${safe(item.name)}</b><small>สวมได้ Lv.${lv} · ${safe(bonuses)}${item.opts.length?' · '+item.opts[0][0]+' +'+item.opts[0][1]:''}</small><small>${cost.toLocaleString('th-TH')} Gold · อุปกรณ์ธรรมดา +0</small></div><button onclick="AMBER_V12.buyNpc('${cls}','${slot}',${lv})">ซื้อ</button></div>`;
 }).join('');
}
function buyNpc(cls,slot,lv){
 if(!CLASSES.includes(cls)||!Object.hasOwn(SLOTS,slot)||!LEVELS.includes(lv))return;
 A.ensure();const cost=npcPrice(lv,slot);
 if(state.gear.length>=40){notify('กระเป๋าอุปกรณ์เต็ม (40 ชิ้น)');return}
 if(state.gold<cost){notify('Gold ไม่เพียงพอ · ต้องใช้ '+num(cost));return}
 state.gold-=cost;const g=npcEntry(cls,slot,lv);state.gear.push(g);if($('amberNpcGold'))$('amberNpcGold').textContent=num(state.gold);
 log('🏪 ซื้อ '+g.name+' ราคา '+num(cost)+' Gold','good');render();shopRefresh();
}
openShop=function(){
 const selected=CLASSES.includes(state.job)?state.job:shopState.cls;
 shopState.cls=selected;
 openModal('🏪 ร้านค้า NPC · อุปกรณ์พื้นฐาน Lv.1–100',`<p>Gold ของคุณ: <b id="amberNpcGold">${num(state.gold)}</b> · เลเวลสูงสุดของเกม 100</p>
 <div class="statrow">🧪 ยาฟื้น HP · 50 Gold <button onclick="buy('hp');openShop()">ซื้อ</button></div>
 <div class="statrow">💧 ยาฟื้น MP · 50 Gold <button onclick="buy('mp');openShop()">ซื้อ</button></div>
 <div class="amber-shop-filters"><label>สายอาชีพ<select id="amberShopClass" onchange="AMBER_V12.shopRefresh()">${CLASSES.map(c=>`<option value="${c}" ${c===selected?'selected':''}>${c}</option>`).join('')}</select></label>
 <label>ประเภท<select id="amberShopSlot" onchange="AMBER_V12.shopRefresh()">${Object.entries(SLOTS).map(([slot,n])=>`<option value="${slot}" ${slot===shopState.slot?'selected':''}>${n}</option>`).join('')}</select></label></div>
 <div id="amberShopList"></div>
 <p class="hint">NPC ขายเฉพาะของธรรมดา +0 ออปชัน 0–1 ค่า ไม่มีไอเทมระดับเทพ · ซื้อก่อนเลเวลได้ แต่สวมได้เมื่อถึงเลเวลและอาชีพที่กำหนด · แตะอุปกรณ์ในเมนูอุปกรณ์เพื่อสวมใส่</p>`);
 shopRefresh();
};
// Some skills in EVERY class and path strike 2–3 times; damage is a bounded TOTAL, not multiplied per hit.
SKILLS.forEach(sk=>{const i=Number(sk.id.slice(sk.id.lastIndexOf('_')+1));sk.hits=i===1||i===7?2:i===4?3:1});
const originalRenderSkills=renderSkills;
renderSkills=function(){originalRenderSkills();$('skills')?.querySelectorAll('button').forEach((b,i)=>{
 const sk=SKILLS.filter(x=>state.learned.includes(x.id))[i];if(!sk)return;
 if(sk.hits>1){const hint=document.createElement('small');hint.className='amber-skill-hits';hint.textContent='×'+sk.hits+' ฮิต';b.appendChild(hint)}
 })};
function takeQueuedSkill(available){const id=API.queuedSkill;API.queuedSkill='';return id?(available.find(s=>s.id===id)||null):null}
function multiFx(total,hits){
 hits=bound(hits,2,3);let remaining=Math.max(1,Math.round(total));
 for(let i=0;i<hits;i++){
  const amount=i===hits-1?remaining:Math.max(1,Math.floor(remaining/(hits-i)));
  remaining-=amount;
  setTimeout(()=>{
   if(!$('scene'))return;
   const pop=document.createElement('div');pop.className='damage amber-multi-damage';pop.textContent='-'+num(amount);
   pop.style.right=(8+i*8)+'%';pop.style.bottom=(45+i*5)+'%';$('scene').appendChild(pop);
   setTimeout(()=>pop.remove(),760);
  },i*135);
 }
}
const prevRender=render;
render=function(){if(state.lv>100)state.lv=100;if(state.lv>=100)state.xp=0;prevRender()};
if($('portrait')){$('portrait').style.cursor='pointer';$('portrait').onclick=()=>statModal()}
if($('pname')){$('pname').style.cursor='pointer';$('pname').onclick=()=>statModal()}
const css=document.createElement('style');css.id='amber-v12-style';css.textContent=`
#amberStatStrip{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px}#amberStatStrip span{font-size:10px;white-space:nowrap;background:#1c2e3d;border:1px solid #7d663b;color:#cce5fa;border-radius:5px;padding:2px 4px}#amberStatStrip b{color:#fcd47b}
#amberEquippedLabel{font-size:10px;color:#d7b981;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
#sprites .sprite{position:relative;cursor:pointer}#sprites .sprite>.amber-equipped-weapon{position:absolute!important;width:56%!important;height:82%!important;max-width:44px!important;right:-17%!important;bottom:16%!important;object-fit:contain!important;background:transparent!important;border:0!important;border-radius:0!important;z-index:5;pointer-events:none;transform:rotate(8deg)}
#sprites .sprite>.amber-weapon-glow{filter:drop-shadow(0 0 5px var(--amber-aura)) drop-shadow(0 0 5px var(--amber-aura))!important;animation:amberWeaponPulse .95s ease-in-out infinite alternate}
#sprites .sprite>.amber-weapon-plus9,#sprites .sprite>.amber-weapon-plus10{filter:drop-shadow(0 0 7px var(--amber-aura)) drop-shadow(0 0 9px var(--amber-aura))!important}
@keyframes amberWeaponPulse{from{opacity:.83;transform:rotate(8deg) scale(.95)}to{opacity:1;transform:rotate(12deg) scale(1.12)}}
#members .amber-profile-click{cursor:pointer}#members .amber-profile-click:active{outline:2px solid #eec676}
.amber-profile-preview{display:flex;align-items:center;gap:14px;padding:10px;background:#111d2c;border:1px solid #9c753e;border-radius:9px}.amber-profile-preview img{width:66px;height:80px;object-fit:contain;image-rendering:pixelated}.amber-profile-preview b{display:block;font-size:17px;color:#f8dc9d}.amber-profile-preview small{display:block;margin-top:4px}
.amber-profile-weapon{height:90px;filter:drop-shadow(0 0 7px var(--amber-aura));margin:4px auto}
.amber-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:8px 0}.amber-metrics>div{background:#101e30;border:1px solid #6e5c40;border-radius:7px;padding:8px}.amber-metrics small{display:block;color:#9ebad0}.amber-metrics b{display:block;margin-top:3px;color:#f4d68f;font-size:14px}
.amber-stat-explain{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px}.amber-stat-explain>div{min-width:0}.amber-stat-explain small{display:block;color:#a9b8c8;font-size:11px;margin-top:3px}
.amber-shop-filters{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:9px 0}.amber-shop-filters label{display:block;color:#d6bf96;font-size:12px}.amber-shop-filters select{display:block;width:100%;background:#122333;color:#fff;border:1px solid #b28d58;padding:10px;border-radius:8px}
.amber-npc-row{display:flex;gap:7px;justify-content:space-between;align-items:center;border-bottom:1px solid #3b4c5d;padding:9px 2px}.amber-npc-row>div{min-width:0}.amber-npc-row b,.amber-npc-row small{display:block}.amber-npc-row b{color:#f1ce83}.amber-npc-row small{color:#aac0cb;font-size:11px}.amber-npc-row button{white-space:nowrap;min-width:64px}
#skills .amber-skill-hits{display:block;color:#80d7f3;font-size:10px;margin-top:2px}.amber-multi-damage{color:#86e9ff;text-shadow:1px 2px 4px #002e48;pointer-events:none}
`;document.head.appendChild(css);
const API={queuedSkill:'',combat,weaponInfo,presenceInfo,shopRefresh,buyNpc,statStrip,sceneDecorate,multiFx,takeQueuedSkill,profile,updateExtended};
window.AMBER_V12=API;
render();
})();
