/* 55 AMBERLANDS V23.1: collapsible mobile bottom menu.
 * Fullscreen now lives with the other nav functions instead of floating over bag/dungeon.
 */
(()=>{'use strict';
const nav=document.querySelector('.nav');if(!nav)return;
const fs=document.getElementById('fsBtn');
if(fs){nav.appendChild(fs);fs.innerHTML='⛶<span>เต็มจอ</span>';fs.title='ขยาย/ย่อเต็มจอ';}
let btn=document.getElementById('amber24MenuToggle');
if(!btn){btn=document.createElement('button');btn.id='amber24MenuToggle';btn.type='button';document.body.appendChild(btn);}
const mq=window.matchMedia('(max-width:700px)');
let closed=true;
try{closed=localStorage.getItem('amber_v23_1_menu_closed')!=='0'}catch{}
function sizing(){if(!mq.matches)return;document.body.style.setProperty('--amber24-nav-height',Math.ceil(nav.getBoundingClientRect().height)+'px');}
function paint(){document.body.classList.toggle('amber24-menu-closed',mq.matches&&closed);
 btn.textContent=closed?'☰ เมนู':'▾ หุบเมนู';
 btn.setAttribute('aria-expanded',String(!closed));
 btn.setAttribute('aria-label',closed?'เปิดแถบเมนูทั้งหมด':'หุบแถบเมนูทั้งหมด');
 sizing();
}
btn.onclick=()=>{closed=!closed;try{localStorage.setItem('amber_v23_1_menu_closed',closed?'1':'0')}catch{}paint();};
nav.addEventListener('click',e=>{if(!mq.matches||closed)return;
 const button=e.target.closest('button');if(!button)return;
 // Closing after opening a feature ensures buttons do not hide the underlying world map.
 if(button.id==='fsBtn'||button.id==='amber23DungeonNav'||button.id==='amber23PetNav'||button.hasAttribute('onclick')){
  closed=true;try{localStorage.setItem('amber_v23_1_menu_closed','1')}catch{}paint();
 }
});
window.addEventListener('resize',paint);
window.addEventListener('orientationchange',()=>setTimeout(paint,100));
const style=document.createElement('style');style.textContent=`
#fsBtn{position:relative!important;right:auto!important;left:auto!important;top:auto!important;bottom:auto!important;z-index:auto!important;width:auto!important;height:auto!important;min-width:0!important;padding:5px 2px!important;font-size:18px!important;line-height:1.1!important}
#fsBtn span{display:block;font-size:10px;font-weight:800;margin-top:3px}
#amber24MenuToggle{display:none}
@media(max-width:700px){
.nav{max-height:min(38dvh,310px)!important;overflow-y:auto!important;overscroll-behavior:contain;transition:transform .22s ease,opacity .22s ease!important;will-change:transform}
body.amber24-menu-closed .nav{transform:translateY(calc(100% + 25px))!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important}
#amber24MenuToggle{display:block;position:fixed!important;z-index:90!important;left:8px!important;bottom:calc(var(--amber24-nav-height,165px) + 7px + env(safe-area-inset-bottom,0px))!important;min-width:94px!important;min-height:41px!important;padding:7px 11px!important;border:2px solid #efc174!important;border-radius:14px!important;background:linear-gradient(#36577a,#142339)!important;color:#fff1c1!important;font-weight:900!important;box-shadow:0 3px 9px #0008!important;touch-action:manipulation}
body.amber24-menu-closed #amber24MenuToggle{bottom:calc(9px + env(safe-area-inset-bottom,0px))!important}
body.amber24-menu-closed{padding-bottom:calc(54px + env(safe-area-inset-bottom,0px))!important}
body:not(.amber24-menu-closed){padding-bottom:calc(var(--amber24-nav-height,165px) + 4px)!important}
}
`;document.head.appendChild(style);
paint();setTimeout(paint,150);setTimeout(paint,1250);
})();
