/* 55 AMBERLANDS V23.2 — Boss rainbow gear + dungeon ores.
 * All boss drops are granted by Supabase; this module is UI & enhancement integration only.
 */
(()=>{'use strict';
const ORES={
 ore_fire:{name:'แร่อัคคี',icon:'🔥',desc:'ตีบวกอาวุธ: เพิ่มโอกาสสำเร็จ 5%',bonus:5,slot:'W'},
 ore_ice:{name:'แร่เหมันต์',icon:'❄️',desc:'ตีบวกชุด/ถุงมือ/รองเท้า/แหวน: เพิ่มโอกาสสำเร็จ 5%',bonus:5,slot:'armor'},
 ore_prism:{name:'แร่รุ้งดารา',icon:'🌈',desc:'ใช้กับอุปกรณ์ทุกประเภท: เพิ่มโอกาสสำเร็จ 10%',bonus:10,slot:'any'}
};
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isBoss=g=>!!(g&&(g.boss===true||g.bossDrop===true||/^dg_/.test(String(g.id||''))));
function oreMats(){if(!state.mats||typeof state.mats!=='object')state.mats={gw:0,ga:0};return state.mats}
const count=k=>Math.max(0,Math.floor(Number(oreMats()[k])||0));
const availableFor=(g,k)=>{const o=ORES[k];return !!(o&&g&&(o.slot==='any'||o.slot==='W'&&g.slot==='W'||o.slot==='armor'&&g.slot!=='W'))};
let selectedOre='';
function fragment(){return Object.entries(ORES).filter(([id])=>count(id)>0).map(([id,o])=>`<div class="amber232-ore item" title="${esc(o.desc)}"><span class="amber232-ore-emoji">${window.PXI?PXI(id,o.icon):o.icon}</span><small>${esc(o.name)}</small><em>×${count(id)}</em></div>`).join('')}
function stampBag(){const b=$('bag');if(!b)return;const old=$('amber232OresInBag');if(old)old.remove();const h=fragment();if(!h)return;const wrap=document.createElement('div');wrap.id='amber232OresInBag';wrap.className='amber232-ores-inbag';wrap.innerHTML=h;b.prepend(wrap)}
const oldBag=renderBag;
renderBag=function(){oldBag();stampBag()};
const oldInventory=openInventory;
openInventory=function(){oldInventory();const root=$('modalBody');if(!root)return;const old=$('amber232OreInventory');if(old)old.remove();const section=document.createElement('section');section.id='amber232OreInventory';section.innerHTML=`<h3 style="margin:12px 0 7px">💎 แร่ตีบวกจากดันเจียน</h3><div class="inventory amber232-inventory-ores">${fragment()||'<p class="hint">ยังไม่มีแร่ดันเจียน · ปราบบอสเพื่อรับแร่</p>'}</div><p class="hint">แตะอุปกรณ์แล้วเลือกแร่ที่ต้องการก่อนกดตีบวก · แร่เสริมใช้ครั้งละ 1 เม็ด</p>`;root.appendChild(section)};
function decorateGear(){document.querySelectorAll('.gc').forEach(el=>{const id=el.getAttribute('onclick')?.match(/openGear\('([^']+)'\)/)?.[1];if(!id)return;const g=(state.gear||[]).find(x=>String(x.id)===id);if(isBoss(g))el.classList.add('amber-boss-rainbow');});}
function oreSelector(g){const root=$('modalBody');if(!root||!g||g.enh>=10)return;
 const enhanceButton=[...root.querySelectorAll('button')].find(b=>/enhance\('/.test(b.getAttribute('onclick')||''));if(!enhanceButton)return;
 const div=document.createElement('div');div.className='amber232-enhancer';div.id='amber232Enhancer';
 const current=(availableFor(g,selectedOre)&&count(selectedOre)>0)?selectedOre:'';
 if(current!==selectedOre)selectedOre='';
 const shown=($('modalBody')?.textContent||'').match(/สำเร็จ\s*(\d+)%/);
 const base=shown?Number(shown[1]):Number([100,100,100,90,80,65,50,40,30,20][g.enh]||0), cap=95;
 div.innerHTML=`<label for="amber232OreChoice">💠 แร่เสริมการตีบวก <small>(เลือกได้ 1 ชนิด)</small></label><select id="amber232OreChoice"><option value="">ไม่ใช้แร่เสริม · โอกาสปกติ ${base}%</option>${Object.entries(ORES).filter(([id])=>availableFor(g,id)).map(([id,o])=>`<option value="${id}" ${current===id?'selected':''} ${count(id)<1?'disabled':''}>${o.icon} ${esc(o.name)} (${count(id)} เม็ด) · +${o.bonus}%</option>`).join('')}</select><div class="amber232-ore-preview" id="amber232OrePreview"></div>`;
 enhanceButton.before(div);
 const selector=$('amber232OreChoice');const preview=$('amber232OrePreview');
 function update(){selectedOre=selector.value;const ore=ORES[selectedOre];const chance=ore?Math.min(cap,base+ore.bonus):base;preview.textContent=`อัตราสำเร็จของการตีบวกขั้นนี้ ${chance}%${ore?' · ใช้ '+ore.name+' ×1 เมื่อกดตีบวก':''}`;}
 selector.addEventListener('change',update);update();
}
const oldOpenGear=window.openGear;
window.openGear=function(id,msg){oldOpenGear(id,msg);const g=(state.gear||[]).find(x=>String(x.id)===String(id));oreSelector(g);if(isBoss(g)){$('modalBody')?.classList.add('amber232-boss-modal')}};
/* The original enhancement logic remains authoritative for gold, base stone costs,
 * level drops on failure and effects. Add a bounded ore bonus only at the success roll. */
function adjustEnhanceChance(base,g){const o=ORES[selectedOre];if(!o||!availableFor(g,selectedOre)||Number(base)>=100){return base}
 if(count(selectedOre)<1){selectedOre='';return base}
 oreMats()[selectedOre]=count(selectedOre)-1;
 if(typeof log==='function')log(`💎 ใช้ ${o.name} ×1 เพิ่มโอกาสสำเร็จ +${o.bonus}%`,'good');
 return Math.min(95,Number(base)+o.bonus)
}
window.AMBER_BOSS_ORES={adjustEnhanceChance,types:ORES,isBoss,refresh:stampBag};
// Wrapper redraws can replace cards; ensure any boss gear still gets rainbow styling.
const oldRenderBag=renderBag;renderBag=function(){oldRenderBag();decorateGear()};
const oldOpenEquip=openEquip;openEquip=function(){oldOpenEquip();decorateGear()};
const st=document.createElement('style');st.id='amber232BossCSS';st.textContent=`
@keyframes amber232Rainbow {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes amber232Glimmer {0%,100%{filter:brightness(1)}50%{filter:brightness(1.17)}}
.gc.amber-boss-rainbow,.item.amber-boss-rainbow{position:relative!important;isolation:isolate!important;border:3px solid transparent!important;border-radius:10px!important;background:linear-gradient(160deg,#172337,#08121c) padding-box,linear-gradient(110deg,#ff416e,#ffc74c,#b5ff62,#51e1ff,#b57bff,#ff416e) border-box!important;box-shadow:0 0 9px #ab60ff77,inset 0 0 12px #6ddfff28!important;overflow:hidden;background-size:100% 100%,350% 350%!important;animation:amber232Rainbow 7s linear infinite!important}
.gc.amber-boss-rainbow:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(135deg,#fc4ed71b 4%,#fff18317 24%,#82fbda18 57%,#946dff25 90%);}
.gc.amber-boss-rainbow small{color:#f8edff!important;text-shadow:0 1px 3px #000}
.amber-boss-rainbow-icon{display:inline-flex!important;align-items:center;justify-content:center;position:relative;border:4px solid transparent!important;background:linear-gradient(#111d30,#0a101c) padding-box,linear-gradient(90deg,#f65fba,#f9df59,#74f7b4,#5bbdff,#ce86ff,#f65fba) border-box!important;background-size:100% 100%,300% 300%!important;border-radius:14px!important;padding:10px!important;box-shadow:0 0 18px #c979ffbb,inset 0 0 20px #6dcbff22!important;animation:amber232Rainbow 6s linear infinite!important}
.amber232-boss-modal .statrow{border-color:#8873ad!important}
.amber232-ores-inbag{display:contents}
.amber232-ore.item{display:flex;align-items:center;flex-direction:column;justify-content:center;text-align:center;gap:3px;border:1px solid #8772b5;background:linear-gradient(145deg,#283248,#161929);min-height:82px;padding:5px}
.amber232-ore-emoji{font-size:27px;filter:drop-shadow(0 0 7px #e1a6ff)}
.amber232-ore small{font-size:10px;color:#f1dbff}.amber232-ore em{font-style:normal;color:#fff19d;font-weight:800}
.amber232-enhancer{border:1px solid #a082cb;padding:11px;margin:10px 0;border-radius:10px;background:linear-gradient(130deg,#1d2740,#262033)}
.amber232-enhancer label{font-weight:800;display:block;margin-bottom:8px;color:#f7dcff}
.amber232-enhancer select{width:100%;min-height:44px;color:#fff3da;background:#152338;border:1px solid #e8b562;padding:7px;border-radius:8px}
.amber232-ore-preview{margin-top:6px;font-size:12px;color:#c2eaff}
.amber24-loot-rainbow{position:relative;margin:8px 0;padding:13px;border:3px solid transparent;border-radius:11px;background:linear-gradient(#102334,#091827) padding-box,linear-gradient(130deg,#fc5eaf,#ffd559,#82ff8f,#58c7ff,#c787ff,#fc5eaf) border-box!important;background-size:100% 100%,320% 320%!important;animation:amber232Rainbow 7s linear infinite;display:grid;gap:5px;box-shadow:0 0 13px #855ce555}
.amber24-loot-rainbow small{color:#ffecc3}.amber24-loot-rainbow b{color:#fff}
@media(prefers-reduced-motion:reduce){.gc.amber-boss-rainbow,.amber-boss-rainbow-icon,.amber24-loot-rainbow{animation:none!important}}
`;document.head.appendChild(st);
})();
