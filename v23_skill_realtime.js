/* 55 AMBERLANDS V23: skill art render locally; broadcast ONLY to same boss map / dungeon instance.
   Broadcast messages are visual-only. Never apply remote damage from them. */
(()=>{'use strict';
const A=window.AMBER_V23_SKILL_ART;if(!A||!window.AMBER_FX)return;
let connected=null,last=0;const seen=new Map();const C=()=>window.AMBER_CLOUD;
function attach(){const R=C()?.getRoom?.();if(!R||R===connected)return;connected=R;
 R.on('skill23',m=>{try{
   if(m.isMe||!m.by||!m.data)return;
   const d=m.data,now=Date.now();
   if(Math.abs(now-Number(d.t||0))>8000||!d.id||!d.skill||!d.scene)return;
   const peer=(window.AMBER_PUBLIC_PEERS||[]).find(p=>p.by===m.by)?.presence;
   if(!peer||!A.isSameScene(peer,d)||A.sceneKey()!==d.scene)return;
   const sk=SKILLS.find(x=>x.id===d.skill);
   if(!sk||sk.job!==peer.job||Number(peer.lv)<Number(sk.level||1))return;
   const key=m.by+':'+d.id;if(seen.has(key))return;seen.set(key,now);
   if(seen.size>240)for(const [k,v] of seen)if(now-v>10000)seen.delete(k);
   const scene=document.getElementById('scene');if(!scene)return;
   const r=scene.getBoundingClientRect();const point={x:Math.max(15,Math.min(r.width-15,(Number(d.px)||.5)*r.width)),y:Math.max(15,Math.min(r.height-15,(Number(d.py)||.45)*r.height))};
   A.play(sk,String(peer.n||'ผู้เล่น').slice(0,22),point,true);
 }catch(e){console.warn('[AMBER V23 FX RX]',e)}});
}
const prev=window.AMBER_FX.onAttack;
window.AMBER_FX.onAttack=function(sk,dmg,m){
 if(!sk||!A.manifest[sk.id])return prev?.(sk,dmg,m);
 // Always show own ability. Only send to other players in the same instance or boss zone.
 A.play(sk,state.name);
 const current=A.sceneKey();if(!current)return;
 const n=Date.now();if(n-last<200)return;last=n;
 attach();const R=C()?.getRoom?.();if(!R)return;
 const scene=document.getElementById('scene'),mob=document.getElementById('mobimg');let px=.5,py=.45;
 if(scene&&mob){const a=scene.getBoundingClientRect(),b=mob.getBoundingClientRect();if(a.width&&a.height){px=(b.left+b.width/2-a.left)/a.width;py=(b.top+b.height/2-a.top)/a.height}}
 R.emit('skill23',{id:n.toString(36)+Math.random().toString(36).slice(2,7),t:n,skill:sk.id,scene:current,px:Math.max(0,Math.min(1,px)),py:Math.max(0,Math.min(1,py))}).catch(()=>{});
};
// Existing BUFF visuals/effects are retained. Only the new animated attack atlases use skill23.
window.addEventListener('amber-v19-realtime',attach);setInterval(attach,4000);setTimeout(attach,750);
})();
