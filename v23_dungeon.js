/* 55 AMBERLANDS V23.4 — Dungeon in the actual Realtime world scene.
 * Database remains authoritative for HP, readiness, drops and cooldowns.
 * This UI never awards loot or applies remote damage itself.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D={dragon:{name:'🔥 ปราสาทมังกรเพลิง',short:'ปราสาทมังกรเพลิง',boss:['อัศวินเปลวไฟ','อสูรพิทักษ์มังกร','จ้าวมังกรเพลิง'],map:'dragon',color:'#ff9c4a'},ice:{name:'❄️ วิหารราชาน้ำแข็ง',short:'วิหารราชาน้ำแข็ง',boss:['ผู้พิทักษ์น้ำแข็ง','มังกรผลึกเหมันต์','ราชินีแห่งเหมันต์'],map:'snow',color:'#8ee1ff'}};
const cloud=()=>window.AMBER_CLOUD;
const uid=()=>cloud()?.getUser?.()?.id||'';
const client=()=>cloud()?.getClient?.();
const online=()=>!!(uid()&&client()&&cloud()?.getStatus?.()?.cloudReady);
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('th-TH');
const cdLeft=()=>Math.max(0,Math.ceil((cooldownUntil-Date.now())/1000));
const duration=t=>`${Math.floor(t/3600)} ชม. ${String(Math.floor(t%3600/60)).padStart(2,'0')} น. ${String(t%60).padStart(2,'0')} วินาที`;
const cdText=()=>{const t=cdLeft();return t?duration(t):'ดันเจียนนี้พร้อมเข้ารอบใหม่'};
const remainingFor=k=>Math.max(0,Math.ceil(((dungeonCooldowns[k]||0)-Date.now())/1000));
function refreshDungeonOptions(){
 const buttons=$('modalBody')?.querySelectorAll('[data-dg-create]')||[];
 buttons.forEach(b=>{const key=b.dataset.dgCreate;const t=remainingFor(key);b.disabled=t>0;const sub=b.querySelector('small');if(sub)sub.textContent=t?'⏳ คูลดาวน์ '+duration(t):'✅ พร้อมเข้า · Lv.50+ · บอส 3 ตัว';});
}
async function loadDungeonCooldowns(){
 if(!online())return;
 try{const result=await rpc('cooldowns_state');for(const key of Object.keys(D)){const v=result?.[key]||{};dungeonCooldowns[key]=v.next_at?Date.parse(v.next_at)||0:Date.now()+Math.max(0,Number(v.seconds)||0)*1000;}refreshDungeonOptions();}
 catch(e){console.warn('[DG23.4 cooldown status]',e);}
}
const announce=(s)=>{if(typeof notify==='function')notify(s);else console.log('[DG23]',s)};
let id='',room=null,view=false,busy=false,attackBusy=false,auto=false,attackTimer=null,selected='',lastAttack=0,lastSync=0,syncBusy=false,attachedRoom=null;
let inviteList=[],inviteShown='',rewardsCache=null,showPicker=false,restoreUser='',lastBoss=0;
let bossBusy=false,healBusy=false,reviveBusy=false,cooldownUntil=0,combatSqlWarned=false;
let dungeonCooldowns={dragon:0,ice:0};
const roomKey=()=>`amber_dg23_room_${uid()}`;
const myMember=()=>room?.members?.find(p=>p.user_id===uid());
const inside=()=>!!(id&&room&&room.status==='active');
const inView=()=>!!(view&&id&&room);
const eligible=()=>online()&&state?.lv>=50;
const lobbyMembers=()=>Array.isArray(room?.members)?room.members:[];
const stopAuto=()=>{auto=false;if(attackTimer)clearInterval(attackTimer);attackTimer=null;refreshControls();};
function error(e){let s=String(e?.message||e||'ผิดพลาด');
 if(/Dungeon cooldown|Level or cooldown restriction|A party member is on cooldown/i.test(s))s='ดันเจียนที่เลือกยังติดคูลดาวน์ 4 ชั่วโมง (อีกดันเจียนเข้าได้ถ้าไม่ติดคูลดาวน์)';
 if(/Attack on cooldown|last_attack/i.test(s))return; // tick racing is harmless
 console.warn('[AMBER DUNGEON V23.1]',e);announce('⚠️ ดันเจียน: '+s);
}
async function rpc(name,args={}){if(!online())throw new Error('กรุณาล็อกอิน Google และเชื่อมต่อออนไลน์');const {data,error:err}=await client().rpc('amber_dungeon_'+name,args);if(err)throw err;return data}
function signal(kind){const r=cloud()?.getRoom?.();if(r)r.emit('dg23',{room:id,kind,t:Date.now()}).catch(()=>{});
 window.dispatchEvent(new Event('amber-v19-location'));
}
function stageName(){const k=D[room?.dungeon]||D.dragon;return k.boss[Math.max(0,Math.min(2,(Number(room?.boss_index)||1)-1))]}
function bgForDungeon(){const k=D[room?.dungeon]||D.dragon;try{const i=MAPS.findIndex(m=>m[0]===k.map);return V5_SCENES[Math.max(0,i)%V5_SCENES.length]||''}catch{return ''}}
function bossImage(){try{const n=room?.dungeon==='ice'?3:0;return V5_BOSSES[((Number(room?.boss_index)||1)+n)%V5_BOSSES.length]||''}catch{return ''}}
function who(id){return (window.AMBER_PUBLIC_PEERS||[]).find(p=>p.by===id)?.presence||null}
function heroImg(user){const p=who(user.user_id)||{},g=user.user_id===uid()?(state.gender||'male'):(p.gender||'male');const j=user.user_id===uid()?state.job:(p.job||'นักผจญภัย');return window.AMBER_AVATAR?.get?.(g,j)||$('portrait')?.src||''}
function drawScene(){const scene=$('scene');if(!scene)return;
 if(!inView()){scene.classList.remove('amber24-dungeon-scene');return}
 const k=D[room.dungeon]||D.dragon, members=lobbyMembers(),live=members.filter(p=>p.accepted).sort((a,b)=>a.user_id===uid()?-1:b.user_id===uid()?1:0);
 scene.classList.add('amber24-dungeon-scene');scene.dataset.dungeon=room.dungeon;
 const bg=bgForDungeon();if(bg)scene.style.backgroundImage=`linear-gradient(180deg,#030e1a44,#041321aa),url("${bg}")`;
 scene.style.backgroundSize='cover';scene.style.backgroundPosition='center';
 const waiting=room.status==='waiting',finished=room.status==='finished';
 $('scenetitle').innerHTML=`<b>${esc(k.name)}</b><br><small>${waiting?'👥 จุดรวมพล รอสมาชิกกดพร้อม':finished?'🏆 เคลียร์ดันเจียนสำเร็จ':'⚔️ ห้องออนไลน์ · บอส '+Math.max(1,Number(room.boss_index)||1)+'/3'} · ${live.length}/6 คน</small>`;
 const sp=$('sprites');if(sp){window.AMBER_SCENE_PLAYERS=live.filter(p=>p.user_id!==uid()).map(p=>({...who(p.user_id),id:p.user_id,n:p.name||who(p.user_id)?.n||'ผู้เล่น',job:who(p.user_id)?.job||'นักผจญภัย'}));
 sp.innerHTML=live.map((p,i)=>`<div class="sprite amber24-dg-hero ${p.user_id===uid()?'amber24-dg-self':''}" style="--order:${i}"><img src="${esc(heroImg(p))}" alt="${esc(p.name)}"><small>${p.user_id===room.owner_id?'👑 ':''}${esc(p.name||'ผู้เล่น')}</small>${waiting?`<span class="amber24-ready ${p.ready?'yes':'no'}">${p.ready?'✓ พร้อม':'รอพร้อม'}</span>`:''}</div>`).join('');
 // Dungeon redraws #sprites independently: restore exactly the existing map overlays.
 // V12/Item Shop/Pet all assume local player is sprite #0 (sorted above).
 window.AMBER_V12?.sceneDecorate?.();
 window.AMBER_ITEM_SHOP?.decorateScene?.();
 window.AMBER_PET?.decorateScene?.();
 }
 const bm=$('mobScene');if(bm){bm.style.display=(waiting||finished)?'none':'';bm.classList.toggle('bossPulse',!waiting&&!finished);}
 if(!waiting){$('mobimg').src=bossImage();$('mobname').textContent=finished?'🏆 ผ่านครบ 3 บอส':stageName();}
 const hp=Number(room.boss_hp)||0,mx=Math.max(1,Number(room.boss_max)||1);
 $('mobdetails').textContent=waiting?'👥 รอสมาชิกกดยืนยัน แล้วให้หัวหน้าปาร์ตี้กดเริ่ม':finished?'🎁 ผ่านครบ 3 บอส · เปิดหีบรางวัลด้านล่าง':`${stageName()} · บอส ${room.boss_index}/3`;
 $('mhp').textContent=waiting?`${live.length}/6 คน พร้อม ${live.filter(p=>p.ready).length}/${live.length}`:finished?'0 HP':`${fmt(hp)} / ${fmt(mx)} HP`;
 $('mobbar').style.width=(waiting||finished)?'0%':`${Math.max(0,Math.min(100,100*hp/mx))}%`;
}
function viewReset(){const scene=$('scene');scene?.classList.remove('amber24-dungeon-scene');if($('mobScene'))$('mobScene').style.display='';}
const originalRenderScene=renderScene;
renderScene=function(){originalRenderScene();if(inView())drawScene();else viewReset()};
function controlPanel(){let p=$('amber24DGPanel');if(p)return p;
 p=document.createElement('section');p.id='amber24DGPanel';p.className='amber24-dg-panel';p.hidden=true;
 const area=document.querySelector('.middle .panel');const foot=area?.querySelector('.scenefoot');if(foot)foot.after(p);else area?.appendChild(p);
 p.addEventListener('click',event=>{const b=event.target.closest('[data-dg-act]');if(b)handle(b.dataset.dgAct,b.dataset.peer||'');});
 p.addEventListener('change',event=>{if(event.target.id==='amber24DgAutoSkill'){state.autoSkill=!!event.target.checked;if($('autoSkill'))$('autoSkill').checked=state.autoSkill;save();refreshControls();}if(event.target.id==='amber24SkillSelect'){selected=event.target.value;}});
 return p;
}
function invitationPanel(){let p=$('amber24Invites');if(p)return p;
 p=document.createElement('section');p.id='amber24Invites';p.className='amber24-invites';p.hidden=true;
 document.querySelector('.middle')?.prepend(p);
 p.addEventListener('click',async event=>{const b=event.target.closest('[data-dg-invite]');if(!b)return;await respond(b.dataset.dgInvite==='yes',b.dataset.room)});
 return p;
}
function renderInvites(){const p=invitationPanel();if(!p)return;if(inView()||!inviteList.length){p.hidden=true;return}
 const i=inviteList[0];p.hidden=false;
 p.innerHTML=`<b>📨 คำเชิญเข้าดันเจียน</b><p>👑 ${esc(i.leader)} ชวนเข้าร่วม ${esc(D[i.dungeon]?.short||i.dungeon)}</p><div class="amber24-row"><button class="goldbtn" data-dg-invite="yes" data-room="${esc(i.room_id)}">✅ ตอบรับ</button><button data-dg-invite="no" data-room="${esc(i.room_id)}">❌ ปฏิเสธ</button></div>`;
}
function homePanel(){const p=controlPanel();if(!p)return;
 if(!inView()){p.hidden=true;document.querySelector('.middle .scenefoot')?.classList.remove('amber24-hide-world-foot');renderInvites();return}
 p.hidden=false;document.querySelector('.middle .scenefoot')?.classList.add('amber24-hide-world-foot');renderInvites();
}
function skills(){return SKILLS.filter(s=>!s.buff&&state.learned?.includes(s.id)&&state.mp>=s.mp)}
function slotSkills(){const pool=skills();const slots=Array.isArray(state.autoSkillSlots)?state.autoSkillSlots.filter(Boolean):[];return slots.length?pool.filter(s=>slots.includes(s.id)):[]}
function picker(){const list=skills();return '<option value="">⚔️ โจมตีธรรมดา</option>'+list.map(s=>`<option value="${esc(s.id)}" ${selected===s.id?'selected':''}>${esc(s.name)} · MP ${s.mp}</option>`).join('')}
function refreshControls(){const p=$('amber24DGPanel');if(!p||!inView())return;
 const k=D[room.dungeon]||D.dragon,waiting=room.status==='waiting',active=room.status==='active',done=room.status==='finished',me=myMember(),leader=room.owner_id===uid(),ms=lobbyMembers(),accepted=ms.filter(m=>m.accepted),ready=accepted.filter(m=>m.ready);
 const header=`<div class="amber24-dg-head"><b>${esc(k.name)} · ห้อง ${esc(id.slice(0,8))}</b><span>${waiting?'👥 รวมตัว':active?'⚔️ ต่อสู้จริงบนแมพ':'🏆 สำเร็จแล้ว'} · ${accepted.length}/6 คน</span></div>`;
 let inner='';
 if(waiting){inner=`<p class="amber24-hint">สมาชิกยืนอยู่บนฉาก Realtime ด้านบน · ทุกคนต้องกดพร้อมก่อนหัวหน้าเริ่ม</p><div class="amber24-members">${ms.map(m=>`<span>${m.user_id===room.owner_id?'👑 ':''}${esc(m.name||'ผู้เล่น')} ${!m.accepted?'⌛ รอตอบรับ':m.ready?'✅ พร้อม':'🟡 ยังไม่พร้อม'}</span>`).join('')}</div><div class="amber24-row"><button class="goldbtn" data-dg-act="ready">${me?.ready?'↩ ยกเลิกพร้อม':'✅ กดพร้อม'}</button>${leader?'<button data-dg-act="invite">📨 เชิญเพื่อนร่วมปาร์ตี้</button>':''}</div>${leader?`<button class="goldbtn amber24-full" data-dg-act="start" ${!accepted.length||ready.length!==accepted.length||ms.some(m=>!m.accepted)?'disabled':''}>🚀 เริ่มดันเจียน (${ready.length}/${accepted.length} พร้อม)</button>`:''}${showPicker?invitePicker():''}`;}
 else if(active){inner=`<div class="amber24-dg-health">🩸 HP คุณ: <b>${fmt(me?.dg_hp??state.hp)} / ${fmt(me?.dg_max_hp??maxHp())}</b> ${Number(me?.dg_hp)<=0?'<b>💀 เสียชีวิตในดันเจียน</b>':''}</div><div class="amber24-hp"><div style="width:${Math.max(0,Math.min(100,100*(Number(room.boss_hp)||0)/Math.max(1,Number(room.boss_max)||1)))}%;background:${k.color}"></div></div><div class="amber24-hp-label">🐉 ${esc(stageName())} · ${fmt(room.boss_hp)} / ${fmt(room.boss_max)} HP · บอส ${room.boss_index}/3</div>
 <div class="amber24-row"><button class="goldbtn" data-dg-act="auto" ${Number(me?.dg_hp)<=0?'disabled':''}>${auto?'⏹ หยุด AUTO':'⚔️ เริ่ม AUTO'}</button><button data-dg-act="attack" ${attackBusy?'disabled':''}>⚔️ โจมตี 1 ครั้ง</button></div>
 <div class="amber24-row"><button data-dg-act="potion" ${Number(me?.dg_hp)<=0||Number(state.potHP)<=0?'disabled':''}>🧪 ใช้ยา HP (${fmt(state.potHP)})</button>${Number(me?.dg_hp)<=0?'<button class="goldbtn" data-dg-act="revive">💖 ฟื้นคืนชีพ (รอ 12 วินาที)</button>':''}</div>
 <div class="amber24-row amber24-skill-row"><label><input id="amber24DgAutoSkill" type="checkbox" ${state.autoSkill?'checked':''}> ✨ AUTO Skill</label><button data-dg-act="slots">🎯 จัดช่องสกิล AUTO</button></div>
 <label class="amber24-select">สกิลกดเอง<select id="amber24SkillSelect">${picker()}</select></label>
 <small class="amber24-hint">AUTO ดันเจียนใช้ช่องสกิลชุดเดียวกับแมพปกติ · สกิลที่เรียนแล้วและ MP เพียงพอเท่านั้น · บอส HP และของรางวัลคำนวณโดย Supabase</small>`;}
 else if(done){inner='<b>🏆 ดันเจียนเคลียร์ครบ 3 บอสแล้ว!</b><p class="amber24-hint">⏳ คูลดาวน์ 4 ชั่วโมงเฉพาะ'+esc(k.short)+' · อีกดันเจียนแยกเวลา</p><div class="amber24-cooldown" id="amber24CoolDown">⏳ '+cdText()+'</div><button class="goldbtn amber24-full" data-dg-act="rewards">🎁 เปิดหีบรางวัล</button>'+(rewardsCache?rewardHTML(rewardsCache):'')+'<button class="amber24-exit" data-dg-act="new">🏰 รับรางวัลแล้ว เลือกดันเจียนถัดไป</button>';}

 p.innerHTML=header+inner+`<button class="amber24-exit" data-dg-act="world">↩ ดูแมพปกติ (ห้องดันเจียนยังอยู่)</button>`;
}
function invitePicker(){const ownerPid=localStorage.getItem('amber_party_'+uid())||'';
 const ps=(window.AMBER_PUBLIC_PEERS||[]).filter(p=>!p.isMe&&p.by&&p.presence?.pid&&ownerPid&&p.presence.pid===ownerPid&&!lobbyMembers().some(m=>m.user_id===p.by));
 return `<div class="amber24-invite-picker"><b>👥 สมาชิกปาร์ตี้ออนไลน์</b>${ps.length?ps.map(p=>`<button data-dg-act="addpeer" data-peer="${esc(p.by)}">📨 เชิญ ${esc(p.presence.n||'ผู้เล่น')}</button>`).join(''):'<p>ไม่พบเพื่อนในปาร์ตี้ออนไลน์ · ชวนเพื่อนเข้าปาร์ตี้หลักก่อน</p>'}</div>`;
}
function applyRoom(next,showHit=true){
 if(!next||typeof next!=='object')return;
 const before=room?.members?.find(m=>m.user_id===uid());
 room=next;
 if(room.status==='finished'&&room.cooldown!=null){
   cooldownUntil=room.cooldown_next_at?(Date.parse(room.cooldown_next_at)||0):Date.now()+Math.max(0,Number(room.cooldown)||0)*1000;
   dungeonCooldowns[room.dungeon]=cooldownUntil;
 }
 const me=myMember();
 if(me&&me.dg_hp!=null&&room.status==='active'){
   const old=Number(state.hp)||0, hp=Math.max(0,Number(me.dg_hp)||0);
   if(showHit&&before?.dg_hit_at&&me.dg_hit_at&&before.dg_hit_at!==me.dg_hit_at){
     const dmg=Math.max(0,Number(me.dg_last_damage)||0);
     if(dmg){window.AMBER_FX?.onHurt?.(dmg,{name:stageName()});announce('🐉 '+stageName()+' โจมตีคุณ -'+fmt(dmg)+' HP');}
   }
   if(old!==hp){state.hp=hp;renderTop();save();if(!hp){stopAuto();announce('💀 บอสโจมตีจน HP หมด · กดฟื้นคืนชีพเมื่อครบ 12 วินาที');}}
 }
}
async function sync(force=false){if(!id||!online()||syncBusy)return;if(!force&&Date.now()-lastSync<3200)return;syncBusy=true;
 try{const next=await rpc('snapshot',{p_room:id});if(!next?.id)throw new Error('ไม่พบห้องดันเจียน');const prevStatus=room?.status,prevBoss=room?.boss_index;
 applyRoom(next,true);lastSync=Date.now();if(room.status!=='active')stopAuto();
 if(prevStatus&&prevStatus!==room.status){if(room.status==='active')announce('⚔️ ดันเจียนเริ่มแล้ว! เปิด AUTO ได้ในแมพ');if(room.status==='finished'){announce('🏆 ชนะบอสทั้งหมดแล้ว!');stopAuto();}}
 if(prevBoss&&prevBoss!==room.boss_index)announce(`🐉 บอสตัวที่ ${room.boss_index}/3 ปรากฏแล้ว!`);
 if(view){drawScene();refreshControls();homePanel();}
 }catch(e){error(e);stopAuto();if(/Room not found|forbidden|not found/i.test(String(e.message||e))){id='';room=null;view=false;localStorage.removeItem(roomKey());homePanel();renderScene();}}
 finally{syncBusy=false}}
function showWorld(){view=true;closeModal();stop(); // stop farming before entering live dungeon
 homePanel();renderScene();refreshControls();signal('join');
 document.querySelector('.middle')?.scrollIntoView({behavior:'smooth',block:'start'});
}
async function create(k){if(busy)return;if(!eligible()){announce('ต้อง Google Login และ Lv.50+ ก่อนเข้าดันเจียน');return}
 busy=true;try{id=String(await rpc('create',{p_dungeon:k}));room=null;localStorage.setItem(roomKey(),id);await sync(true);if(!room)throw new Error('สร้างห้องแล้วแต่โหลดไม่สำเร็จ');showWorld();}catch(e){error(e);if(!room){id='';localStorage.removeItem(roomKey())}}finally{busy=false}}
function open(){if(!eligible()){announce('เข้าดันเจียนได้หลัง Lv.50 และต้องล็อกอิน Google');return}
 if(id&&room){showWorld();sync(true);return}
 openModal('🏰 เลือกดันเจียน',`<p>เลือกดันเจียนแล้วจะเข้าเล่นในหน้าแมพ Realtime เดิมทันที ไม่เปิดจอต่อสู้ลอย</p><div class="amber24-pick">${Object.entries(D).map(([key,d])=>`<button data-dg-create="${key}"><b>${d.name}</b><small>Lv.50+ · 3 บอส · หัวหน้าเชิญเพื่อนและรอกดพร้อมบนแมพ</small></button>`).join('')}</div><button id="amber24CheckInvites">📨 ตรวจคำเชิญ</button>`);
 $('modalBody')?.querySelectorAll('[data-dg-create]').forEach(b=>b.addEventListener('click',()=>create(b.dataset.dgCreate)));
 $('amber24CheckInvites')?.addEventListener('click',()=>checkInvites(true));
 loadDungeonCooldowns();
}
async function checkInvites(show=false){if(!online()||id&&room?.status==='active')return;
 try{const list=await rpc('invites');inviteList=Array.isArray(list)?list:[];renderInvites();if(inviteList.length&&inviteList[0].room_id!==inviteShown){inviteShown=inviteList[0].room_id;announce('📨 มีคำเชิญลงดันเจียน · กดตอบรับตรงหน้าแมพ');}else if(show&&!inviteList.length)announce('ไม่มีคำเชิญใหม่');}catch(e){if(show)error(e)}}
async function respond(yes,roomId){if(busy)return;busy=true;try{await rpc('answer',{p_room:roomId,p_accept:yes});inviteList=inviteList.filter(x=>x.room_id!==roomId);
 if(yes){id=roomId;room=null;localStorage.setItem(roomKey(),id);await sync(true);if(room)showWorld();}
 else{renderInvites();announce('ปฏิเสธคำเชิญแล้ว');}signal(yes?'join':'decline');
 }catch(e){error(e)}finally{busy=false}}
async function doAction(name,args={}){if(busy)return;busy=true;try{const out=await rpc(name,args);await sync(true);signal(name);return out}catch(e){error(e);return null}finally{busy=false}}
async function handle(a,peer){if(a==='world'){stopAuto();view=false;homePanel();renderScene();announce('กลับแมพหลักชั่วคราว · ห้องดันเจียนยังอยู่');return}
 if(!id||!room)return;
 if(a==='ready')await doAction('ready',{p_room:id,p_ready:!myMember()?.ready});
 if(a==='invite'){showPicker=!showPicker;refreshControls();}
 if(a==='addpeer'){if(!peer||room.owner_id!==uid())return;await doAction('invite',{p_room:id,p_friend:peer});showPicker=false;refreshControls();}
 if(a==='start'){if(room.owner_id!==uid())return;stop();const ok=await doAction('start',{p_room:id});if(ok)announce('⚔️ ทุกคนพร้อมแล้ว เริ่มสู้บอสบนแมพ!');}
 if(a==='auto')toggleAuto();
 if(a==='attack')await attack(false);
 if(a==='slots')window.AMBER_V19?.openSkillSetup?.();
 if(a==='potion')await useDungeonPotion(false);
 if(a==='revive')await reviveDungeon();
 if(a==='new')await newDungeon();
 if(a==='rewards')await rewards();
 if(a==='claim'){await claim(peer)}
}
function toggleAuto(){if(!inside()){announce('รอให้หัวหน้าเริ่มดันเจียนก่อน');return}if(Number(myMember()?.dg_hp??state.hp)<=0){announce('💀 ต้องฟื้นคืนชีพในดันเจียนก่อน');return}
 if(auto){stopAuto();announce('⏹ หยุด AUTO ดันเจียน');return}
 stop();auto=true;announce('⚔️ เริ่ม AUTO ดันเจียน');refreshControls();
 attackTimer=setInterval(()=>{if(!auto||!inside()||document.hidden||!online())return;if(Number(myMember()?.dg_hp??state.hp)<=0){stopAuto();return}attack(true)},1320);
 attack(true);
}
let seq=0,enhancedRpc=true,enhancedWarned=false;
function chooseAttackSkill(isAuto){let sk=null;const av=skills();
 if(isAuto&&state.autoSkill){const available=slotSkills();if(available.length&&((seq++%3)!==0))sk=window.AMBER_V19?.pickSkill?.(available)||available[0];}
 else if(!isAuto&&selected)sk=av.find(s=>s.id===selected)||null;
 return sk;
}
async function attack(isAuto){if(!inside()||attackBusy||Date.now()-lastAttack<1180)return;if(Number(myMember()?.dg_hp??state.hp)<=0){stopAuto();announce('💀 ฟื้นคืนชีพก่อนจึงจะโจมตีได้');return;}
 attackBusy=true;lastAttack=Date.now();const sk=chooseAttackSkill(isAuto);
 // Never deduct MP or play a skill until a successful server attack.
 try{
  let out;
  if(enhancedRpc){
    try{out=await rpc('attack_v24',{p_room:id,p_skill:sk?.id||null})}
    catch(e){if(/PGRST202|Could not find the function|schema cache|404|not found/i.test(String(e.message||e))){
       enhancedRpc=false;
       if(!enhancedWarned){enhancedWarned=true;announce('ℹ️ ยังไม่ติดตั้ง SQL เสริม: AUTO Skill แสดงเอฟเฟกต์ได้ แต่ดาเมจสกิลดันเจียนยังเป็นค่าเดิม')}
     }else throw e}
  }
  if(!enhancedRpc)out=await rpc('attack',{p_room:id});
  if(!out||!out.room)return;
  const oldBoss=room?.boss_index;applyRoom(out.room,true);lastSync=Date.now();
  if(sk&&state.mp>=sk.mp){state.mp=Math.max(0,state.mp-sk.mp);window.AMBER_FX?.onAttack?.(sk,out.damage,{name:stageName()});renderTop();save();}
  popDamage(out.damage); // show numeric damage for skills AND basic hits
  if(view){drawScene();refreshControls();}
  if(oldBoss&&room.boss_index!==oldBoss)announce('🐉 บอสตัวต่อไปปรากฏแล้ว!');
  if(room.status==='finished'){stopAuto();announce('🏆 จบดันเจียน! กดเปิดหีบรางวัล');signal('finish');}
 }catch(e){if(/cooldown|last_attack/i.test(String(e?.message||'')))return;error(e);if(/not active|not ready/i.test(String(e?.message||''))){stopAuto();sync(true)}}
 finally{attackBusy=false;}
}
function popDamage(n){const sc=$('scene');if(!sc||!inView())return;const d=document.createElement('span');d.className='amber24-damage';d.textContent='-'+fmt(n);sc.appendChild(d);setTimeout(()=>d.remove(),900)}
function rewardHTML(rewards){const slots={S:'🥋 เสื้อบอส',G:'🥊 ถุงมือบอส',B:'👢 รองเท้าบอส',R:'💍 แหวนบอส'};
return `<div class="amber24-rewards">${rewards.map(r=>{const a=r.reward||{},extras=Array.isArray(a.gear_drops)?a.gear_drops:[];
const gear=[...(a.weapon?[`⚔️ อาวุธบอส ${esc(a.weapon_class||'')} ${a.best?'🌈 ออปเทพ 0.10%':'🌈'}`]:[]),...extras.map(g=>`${slots[g.slot]||'🎁 อุปกรณ์บอส'} ${g.best?'🌈 ออปเทพ 0.10%':'🌈'}`)];
const mats=[a.stones?`💎 ${a.stone_kind==='gw'?'เพชรเพลิงมังกร':'ไข่มุกพิทักษ์'} ×${fmt(a.stones)}`:'',a.ore_kind&&a.ore_amount?`🔮 ${a.ore_kind==='ore_fire'?'แร่อัคคี':a.ore_kind==='ore_ice'?'แร่เหมันต์':a.ore_kind} ×${fmt(a.ore_amount)}`:'',a.ore_prism?`🌈 แร่รุ้งดารา ×${fmt(a.ore_prism)}`:''].filter(Boolean);
return `<div class="${gear.length?'amber24-loot-rainbow':''}"><b>${gear.length?'🌈 รางวัลอุปกรณ์บอส':'🎲 รอบนี้ไม่มีอุปกรณ์บอส'}</b>${gear.map(n=>`<small>✦ ${n}</small>`).join('')}${mats.map(n=>`<small>${n}</small>`).join('')||'<small>ไม่มีแร่ตีบวกในรอบนี้</small>'}${r.claimed_at?'<span>✅ รับแล้ว</span>':`<button class="goldbtn" data-dg-act="claim" data-peer="${esc(r.id)}">📦 รับรางวัลเข้ากระเป๋า</button>`}</div>`}).join('')}</div>`}
async function bossTick(){
 if(!inside()||!inView()||bossBusy||attackBusy||syncBusy||healBusy||reviveBusy||!online()||document.hidden)return;
 bossBusy=true;
 try{
   const next=await rpc('boss_tick',{p_room:id});
   if(next?.id){const prevStatus=room?.status;applyRoom(next,true);lastSync=Date.now();
     if(prevStatus!==room.status&&room.status==='finished')stopAuto();
     drawScene();refreshControls();
     const me=myMember();if(me?.dg_hp>0&&state.autopot&&state.potHP>0&&
       Number(me.dg_hp)/Math.max(1,Number(me.dg_max_hp))<=Number(state.hpthreshold||50)/100)
       useDungeonPotion(true);
   }
 }catch(e){if(!combatSqlWarned){combatSqlWarned=true;announce('⚠️ ระบบบอสโจมตีกลับต้องติดตั้ง V23.3 SQL PATCH ใน Supabase ก่อน');}console.warn('[DG23 boss tick]',e);}
 finally{bossBusy=false;}
}
async function useDungeonPotion(isAuto){
 if(!inside()||healBusy||Number(myMember()?.dg_hp)<=0||!state.potHP)return false;
 healBusy=true;
 try{const out=await rpc('potion',{p_room:id});
  if(Number.isFinite(Number(out.pot_hp_left))){state.potHP=Number(out.pot_hp_left);}
  if(out.room)applyRoom(out.room,false);
  renderTop();renderBag();save();refreshControls();if(!isAuto)announce('🧪 ฟื้น HP ในดันเจียนแล้ว');return true;
 }catch(e){if(!isAuto)error(e);return false;}finally{healBusy=false;}
}
async function reviveDungeon(){
 if(!inside()||reviveBusy)return;
 reviveBusy=true;try{const next=await rpc('revive',{p_room:id});
  if(next?.id){applyRoom(next,false);drawScene();refreshControls();announce('💖 ฟื้นคืนชีพแล้ว · HP กลับมา 50%');}
 }catch(e){error(e)}finally{reviveBusy=false;}
}
async function newDungeon(){
 if(room?.status!=='finished')return;
 // Cooldown is per-dungeon: allow switching to the other dungeon immediately.
 // The server checks the selected dungeon timer before creating a new room.
 try{const rs=await rpc('rewards',{p_room:id});
   if((rs||[]).some(r=>!r.claimed_at)){rewardsCache=rs;refreshControls();announce('🎁 กรุณารับรางวัลจากหีบก่อนเริ่มรอบใหม่');return;}
 }catch(e){error(e);return;}
 stopAuto();view=false;id='';room=null;rewardsCache=null;cooldownUntil=0;
 localStorage.removeItem(roomKey());homePanel();renderScene();open();
}
// Keep the normal bag and potion UI, but only the server may heal combat HP inside dungeon.
const normalUsePotion=usePotion;
usePotion=function(type,isAuto=false){
 if(type==='hp'&&inside()){
  if(Number(myMember()?.dg_hp)<=0){if(!isAuto)announce('💀 ต้องฟื้นคืนชีพก่อนใช้ยา');return false;}
  useDungeonPotion(!!isAuto);return true;
 }
 return normalUsePotion(type,isAuto);
};
async function rewards(){if(!id)return;try{const result=await rpc('rewards',{p_room:id});rewardsCache=Array.isArray(result)?result:[];refreshControls();}catch(e){error(e)}}
async function claim(rewardId){if(!rewardId||busy)return;busy=true;try{const result=await rpc('claim',{p_reward:rewardId});if(result?.save_data){const sd=result.save_data;if(Array.isArray(sd.gear))state.gear=sd.gear;if(sd.mats&&typeof sd.mats==='object')state.mats=sd.mats;render();renderBag();}announce('✅ รับรางวัลเข้ากระเป๋าแล้ว');await rewards();}catch(e){error(e)}finally{busy=false}}
function presenceInfo(){return {dungeon:id&&room&&room.status!=='finished'?id:'',dgReady:!!myMember()?.ready}}
function attach(){const r=cloud()?.getRoom?.();if(!r||r===attachedRoom)return;attachedRoom=r;
 r.on('dg23',m=>{if(!m.isMe&&id&&m.data?.room===id)sync(true)});
}
async function restore(){if(!online())return;const me=uid();if(!me||restoreUser===me)return;restoreUser=me;
 const saved=localStorage.getItem(roomKey());if(saved&&/^[a-f0-9-]{36}$/i.test(saved)){
 id=saved;try{applyRoom(await rpc('snapshot',{p_room:id}),false);lastSync=Date.now();view=room.status==='active'||room.status==='waiting';if(view){homePanel();renderScene();refreshControls();}}catch{room=null;id='';localStorage.removeItem(roomKey())}
 }
 checkInvites(false);
}
const nav=document.querySelector('.nav');if(nav){let b=$('amber23DungeonNav');if(!b){b=document.createElement('button');b.id='amber23DungeonNav';nav.appendChild(b);}b.innerHTML='🏰<span>ดันเจียน</span>';b.addEventListener('click',open);}
controlPanel();invitationPanel();
const st=document.createElement('style');st.textContent=`
.amber24-dg-panel{padding:10px 12px 15px;background:linear-gradient(135deg,#102535,#10192d);border-top:2px solid #b3864d;color:#ffe7b3}
.amber24-dg-panel[hidden],.amber24-invites[hidden]{display:none!important}
.amber24-dg-head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px;align-items:center;border-bottom:1px solid #7a6550;padding:6px 0 10px}
.amber24-dg-head>span{font-size:11px;color:#bde3e8}.amber24-row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.amber24-row button{flex:1;min-width:120px;min-height:48px}
.amber24-full{width:100%;min-height:50px}.amber24-hint{font-size:12px;color:#b5c8d6;line-height:1.5;margin:10px 0}
.amber24-dg-panel button{border-radius:9px}.amber24-members{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:9px 0}.amber24-members>span{font-size:11px;padding:7px;background:#203047;border:1px solid #3f5570;border-radius:7px}
.amber24-select{display:flex;flex-direction:column;gap:6px;font-size:12px;margin:7px 0}.amber24-select select{background:#142334;color:#fff1d2;border:1px solid #8d714b;padding:9px;border-radius:7px;width:100%}
.amber24-skill-row{align-items:center;justify-content:space-between}.amber24-skill-row label{font-size:13px;font-weight:800}.amber24-skill-row input{width:19px;height:19px;vertical-align:middle}
.amber24-dg-health{background:#2e2232;border:1px solid #7f5264;border-radius:8px;padding:7px;margin-top:9px;font-size:12px}.amber24-cooldown{padding:8px;margin:8px 0;background:#1f3043;border:1px solid #b59255;border-radius:8px;color:#ffe4aa;font-weight:800}.amber24-hp{height:16px;border:1px solid #b9874c;border-radius:8px;background:#2c121e;overflow:hidden;margin-top:11px}.amber24-hp>div{height:100%;transition:width .25s}.amber24-hp-label{margin:7px 0;font-size:12px}
.amber24-exit{margin-top:14px;font-size:11px;min-height:40px;width:100%;background:#1a2838!important;border-color:#4a6075!important}
.amber24-invite-picker{padding:9px;margin:10px 0;background:#1a3149;border:1px solid #bd9957;border-radius:8px;display:grid;gap:5px}.amber24-invite-picker button{min-height:42px}
.amber24-invites{padding:12px;margin:6px 0;background:#223753;border:2px solid #eeb85d;border-radius:11px}.amber24-invites>p{margin:8px 0}
.amber24-pick{display:grid;gap:10px;margin:12px 0}.amber24-pick button{display:grid;gap:5px;min-height:77px}.amber24-pick small{font-size:11px}
.scene.amber24-dungeon-scene{height:clamp(285px,58vw,430px)!important;background-position:center!important;isolation:isolate}
.scene.amber24-dungeon-scene:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#04111a44,#182e4b22);pointer-events:none;z-index:1}
.amber24-dungeon-scene .partySprites{left:3%!important;right:3%!important;width:94%!important;bottom:9%!important;display:flex!important;justify-content:space-around!important;align-items:end!important;z-index:5!important}
.amber24-dungeon-scene .sprite{max-width:17%!important;min-width:0!important;flex:1;position:relative!important;transform:translateY(calc(var(--order) * -2px));}
.amber24-dungeon-scene .sprite img{height:min(20vw,77px)!important;max-width:100%!important;border:0!important;background:transparent!important;object-fit:contain!important;filter:drop-shadow(0 6px 5px #000)}
.amber24-dungeon-scene .sprite small{background:#08151fe8;border:1px solid #a88751;border-radius:6px;font-size:9px;padding:2px;overflow:hidden;text-overflow:ellipsis;max-width:100%;white-space:nowrap}
.amber24-ready{display:inline-block;font-size:10px;padding:2px 5px;border-radius:6px;background:#623824;border:1px solid #a56750}.amber24-ready.yes{background:#135339;border-color:#83d79d;color:#bbffd0}
.amber24-dungeon-scene .mobScene{right:6%!important;bottom:40%!important;z-index:4!important}.amber24-dungeon-scene .mobScene img{width:min(27vw,130px)!important;height:min(27vw,130px)!important}
.amber24-dungeon-scene .scenetitle{max-width:86%;font-size:12px;line-height:1.45}.amber24-hide-world-foot{display:none!important}
.amber24-damage{position:absolute;right:14%;top:29%;font-size:25px;font-weight:1000;color:#ffe67a;text-shadow:2px 2px 1px #6b1213,0 0 10px #111;z-index:30;pointer-events:none;animation:pop .85s ease-out forwards}
.amber24-rewards{display:grid;gap:7px;margin-top:10px}.amber24-rewards>div{display:grid;gap:4px;border:1px solid #59627a;background:#1b3044;padding:9px;border-radius:8px}.amber24-rewards small{color:#c1d6e1}
`;document.head.appendChild(st);
window.AMBER_DUNGEON={open,roomId:()=>inside()&&view?id:'',presenceInfo,checkInvites,room:()=>room,isInside:inside,isViewing:inView,startAuto:toggleAuto};
setInterval(()=>{attach();restore();if(id&&online()&&!document.hidden){if(inside()&&inView())bossTick();else sync();}},3200);
setInterval(()=>{const c=$('amber24CoolDown');if(c){c.textContent='⏳ '+cdText();}refreshDungeonOptions();},1000);
setInterval(()=>{if(online()&&!document.hidden&&!inView())checkInvites(false)},9000);
window.addEventListener('amber-v19-realtime',()=>{attach();restore();sync(true)});
window.addEventListener('focus',()=>{restore();if(id)sync(true)});
window.addEventListener('pageshow',()=>{restore();if(id)sync(true)});
setTimeout(()=>{attach();restore()},1000);
})();
