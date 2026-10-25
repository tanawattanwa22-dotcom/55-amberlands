/* 55 AMBERLANDS V14 — lightweight combat presentation + party buffs + 120 skill descriptions.
 * V13 UI, encounter/loot probabilities, Google Auth, persistent save remain unchanged.
 * Remote attack/hit messages are visual-only; monster HP is NOT shared/authoritative.
 */
(() => {
'use strict';
if (!window.AMBER_V12 || typeof SKILLS==='undefined') return;
const $ = id => document.getElementById(id);
const clean = s => String(s??'').replace(/[&<>"'`]/g,c=>'&#'+c.charCodeAt(0)+';');
const bound = (n,min,max) => Math.max(min,Math.min(max,Number(n)||0));
const TIME = () => Date.now();
const XP = window.AMBER_V12;
const BUFFS = {
 'พลังปราณดาบ':{kind:'atk',value:8,duration:18000},
 'คมดาบวายุ':{kind:'haste',value:8,duration:16000},
 'กระบวนท่าเงา':{kind:'evasion',value:4,duration:16000},
 'ม่านดาบมนตรา':{kind:'def',value:8,duration:18000},
 'ปราณนักสู้':{kind:'atk',value:6,duration:18000},
 'หลบหลีก':{kind:'evasion',value:5,duration:16000},
 'เกราะปราณ':{kind:'def',value:9,duration:18000},
 'สายลมหนุน':{kind:'haste',value:7,duration:18000},
 'เงานักล่า':{kind:'evasion',value:4,duration:18000},
 'พรนักล่า':{kind:'atk',value:7,duration:18000},
 'เวทฉับไว':{kind:'haste',value:8,duration:17000},
 'เร่งร่ายเวท':{kind:'haste',value:9,duration:17000},
 'เกราะมานา':{kind:'def',value:8,duration:18000},
 'วงแหวนอาคม':{kind:'def',value:6,duration:18000},
 'ฟื้นฟูมานา':{kind:'mana',value:8,duration:13000}
};
const EFFECTS={
 atk:'เพิ่มพลังโจมตี',def:'เพิ่มพลังป้องกัน',haste:'เพิ่มความเร็วโจมตี',evasion:'เพิ่มโอกาสหลบหลีก',mana:'ฟื้นฟู MP'
};
// The original skill generator labeled every i=2/5 skill as a buff, even attacks.
// Classify only skills with a real non-damage effect as buffs.
for(const sk of SKILLS){
 sk.buff=!!BUFFS[sk.name];
 sk.buffData=BUFFS[sk.name]||null;
}
const active=new Map(), lastCast=new Map(), seen=new Set(), peerById=new Map();
let me=null,channel=null,lastHurtSent=0,lastAttackSent=0,currentDelay=0,fxLayer=null;
const ownParty=()=>me?.id?localStorage.getItem('amber_party_'+me.id)||'':'';
const nowMap=()=>String(state.map||'');
function getBuff(k){const b=active.get(k);return b&&b.exp>TIME()?b:null}
function summary(b){return EFFECTS[b.kind]+' +'+b.value+(b.kind==='evasion'?' จุดเปอร์เซ็นต์':'%')}
function detailed(sk){
 const requirements=`เลือกอาชีพ Lv.10 แล้ว · ต้อง Lv.${Math.max(10,sk.level)} · ${sk.path==='POWER'?'STR':sk.path} ${sk.stat} · ใช้ MP ${sk.mp} · ใช้แต้มสกิล 1`;
 const b=BUFFS[sk.name];
 if(b) return {requirements, type:'บัฟช่วยเหลือทีม',effect:`${summary(b)} ${b.kind==='mana'?'ทันที':'นาน '+Math.round(b.duration/1000)+' วินาที'} ให้คุณและสมาชิกปาร์ตี้ที่อยู่แผนที่เดียวกันและยังมีชีวิต บัฟชนิดเดียวกันจะไม่บวกซ้อนกัน · คูลดาวน์ 7.5 วินาที`,style:'ตัวละครได้รับแสงประกายสีทอง/ฟ้า'};
 const hits=Number(sk.hits)||1;
 const scale=hits>1?Math.round((1.06+.08*hits)*100):140;
 const element=sk.job==='จอมเวท'?'เวทแสง/ธาตุ':sk.job==='ธนู'?'กระสุนธนู':sk.job==='หมัด'?'พลังหมัด':'คมดาบ';
 const meaning=sk.name.includes('ทะลวง')||sk.name.includes('เจาะ')?'โจมตีเจาะเข้าเป้าหมาย':sk.name.includes('พายุ')||sk.name.includes('ฝน')?'คอมโบโจมตีต่อเนื่อง':sk.name.includes('ไฟ')||sk.name.includes('เพลิง')?'แสดงเอฟเฟกต์เปลวไฟ':sk.name.includes('สายฟ้า')||sk.name.includes('อัสนี')?'แสดงเอฟเฟกต์สายฟ้า':sk.name.includes('น้ำแข็ง')?'แสดงเอฟเฟกต์น้ำแข็ง':sk.name.includes('หมัด')?'โจมตีด้วยพลังหมัด':sk.name.includes('ศร')||sk.name.includes('ยิง')?'ยิงโจมตีเป้าหมาย':'โจมตีเป้าหมาย';
 return {requirements,type:'สกิลโจมตี',effect:`${meaning} ด้วย${element} · ดาเมจรวมประมาณ ${scale}% ของการโจมตีปกติ ก่อนหัก DEF และคิด CRIT${hits>1?' · แบ่งออกเป็น '+hits+' ฮิต (ไม่คูณดาเมจซ้ำ)':''}`,style:'แสดงชื่อผู้ใช้และสกิลเหนือมอนสเตอร์ให้ผู้เล่นแมพเดียวกันเห็น · เป็นภาพเอฟเฟกต์ ไม่เพิ่มความเสียหายธาตุพิเศษ'};
}
const information=sk=>{
 const data=detailed(sk);
 return `${data.type} · ${data.effect} | ${data.requirements}`;
};
window.showSkillPath=function(path){
 if(!['POWER','DEX','INT'].includes(path)||!$('skilltree'))return;
 const key=path==='POWER'?'STR':path;
 const arr=SKILLS.filter(s=>s.job===state.job&&s.path===path);
 $('skilltree').innerHTML=`<h3>${path} · ต้องอัป ${key}</h3>`+arr.map(sk=>{
  const learned=state.learned.includes(sk.id);
  const levelReq=Math.max(10,sk.level),ok=state.lv>=levelReq&&state.stats[key]>=sk.stat&&state.skillPoints>0;
  const d=detailed(sk);
  return `<div class="skillrow amber14-skill-row"><img src="${image(sk.icon)}" alt=""><div><b>${clean(sk.name)} ${sk.buff?'✨ บัฟทีม':''}</b><small class="amber14-skill-req">ต้อง Lv.${levelReq} · ${key} ${sk.stat} · MP ${sk.mp} · 1 แต้ม</small><small class="amber14-skill-desc">${clean(d.effect)}</small><small class="amber14-skill-type">${clean(d.type)} · ${sk.buff?'ใช้กับทีม':'โจมตี '+(Number(sk.hits)||1)+' ฮิต'}</small></div><button ${!ok||learned?'disabled':''} onclick="learnSkill('${sk.id}','${path}')">${learned?'เรียนแล้ว':'เรียน'}</button></div>`;
 }).join('');
};
const oldRenderSkills=renderSkills;
renderSkills=function(){oldRenderSkills();const learned=SKILLS.filter(s=>state.learned.includes(s.id)).slice(0,8);$('skills')?.querySelectorAll('button').forEach((button,i)=>{const sk=learned[i];if(!sk)return;button.title=information(sk);button.setAttribute('aria-label',sk.name+' '+information(sk));if(sk.buff){const tag=document.createElement('small');tag.textContent='✨ ทีม';tag.className='amber14-buff-tag';button.appendChild(tag)}})};
// Add short stat buffs to V12's combat calculation (not to inventory/equipment stats).
const baseCombat=XP.combat;
XP.combat=function(){const c=baseCombat();
 let b=getBuff('atk');if(b)c.atk=Math.round(c.atk*(1+b.value/100));
 b=getBuff('def');if(b)c.def=Math.round(c.def*(1+b.value/100));
 b=getBuff('evasion');if(b)c.dodge=Math.min(.32,c.dodge+b.value/100);
 b=getBuff('haste');if(b)c.aspd=Math.round(c.aspd*(1+b.value/100)*100)/100;
 return c;
};
function delay(){return Math.max(650,Math.round(925-state.stats.AGI*2)/(1+(getBuff('haste')?.value||0)/100))}
function reschedule(){if(!state.auto||typeof timer==='undefined')return;const ms=Math.round(delay());if(currentDelay===ms&&timer)return;clearInterval(timer);timer=setInterval(tick,ms);currentDelay=ms}
const oldStart=start;
start=function(){const was=!!state.auto;oldStart();if(!was&&state.auto){currentDelay=0;reschedule()}};
const oldStop=stop;
stop=function(){oldStop();currentDelay=0};
function layer(){if(!$('scene'))return null;if(fxLayer?.isConnected)return fxLayer;fxLayer=$('amberV14FX');if(!fxLayer){fxLayer=document.createElement('div');fxLayer.id='amberV14FX';$('scene').appendChild(fxLayer)}return fxLayer}
function coord(el){if(!el)return null;const pr=$('scene').getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left-pr.left+r.width/2,y:r.top-pr.top+r.height/2}}
function target(){return coord($('mobimg'))||{x:180,y:140}}
function casterIndex(uid){if(!uid||uid===me?.id)return 0;const list=window.AMBER_SCENE_PLAYERS||[];const i=list.findIndex(p=>p.id===uid);return i>=0?i+1:-1}
function spark(el,color,count=6){for(let i=0;i<count;i++){
 const p=document.createElement('span');p.className='amber14-particle';p.style.cssText=`--dx:${Math.round((Math.random()-.5)*100)}px;--dy:${Math.round((Math.random()-.5)*90)}px;--delay:${i*35}ms;background:${color}`;el.appendChild(p);
}}
function pulse(at,cls,label,color,damage=0,origin=null){const host=layer();if(!host)return;const container=document.createElement('div');container.className='amber14-effect '+cls;container.style.left=at.x+'px';container.style.top=at.y+'px';container.style.setProperty('--tone',color);
 const ring=document.createElement('div');ring.className='amber14-ring';container.appendChild(ring);
 if(cls.includes('mage')){const glyph=document.createElement('div');glyph.className='amber14-rune';glyph.textContent='✦';container.appendChild(glyph)}
 spark(container,color,cls.includes('mage')?10:7);
 if(label){const text=document.createElement('div');text.className='amber14-fx-label';text.textContent=label;container.appendChild(text)}
 if(damage){const dmg=document.createElement('div');dmg.className='amber14-fx-dmg';dmg.textContent='-'+Math.round(damage).toLocaleString('en-US');container.appendChild(dmg)}
 host.appendChild(container);setTimeout(()=>container.remove(),1300);
 if(origin){const projectile=document.createElement('div');projectile.className='amber14-projectile '+cls;projectile.style.left=origin.x+'px';projectile.style.top=origin.y+'px';projectile.style.setProperty('--dx',(at.x-origin.x)+'px');projectile.style.setProperty('--dy',(at.y-origin.y)+'px');projectile.style.setProperty('--tone',color);host.appendChild(projectile);setTimeout(()=>projectile.remove(),780)}
}
function look(sk){const n=sk?.name||'',job=sk?.job||'ดาบ';if(n.includes('น้ำแข็ง'))return {cls:'fx-mage',tone:'#87dfff'};if(n.includes('สายฟ้า')||n.includes('อัสนี'))return {cls:'fx-mage',tone:'#b4a1ff'};if(n.includes('เพลิง')||n.includes('ไฟ'))return {cls:'fx-mage',tone:'#ff9c42'};
 return job==='หมัด'?{cls:'fx-fist',tone:'#ffd15e'}:job==='ธนู'?{cls:'fx-bow',tone:'#8de5ae'}:job==='จอมเวท'?{cls:'fx-mage',tone:'#b5a6ff'}:{cls:'fx-sword',tone:'#82cfff'};
}
function attackEffect(name,sk,dmg,uid,remote){
 if(!sk)return;
 const to=target(),from=coord($('sprites')?.children[casterIndex(uid)])||{x:65,y:to.y+70},v=look(sk);
 const mobImg=$('mobimg');if(mobImg){mobImg.classList.add('amber14-mob-hit');setTimeout(()=>mobImg.classList.remove('amber14-mob-hit'),460)}
 pulse(to,v.cls,`${name} · ${sk.name}`,v.tone,remote?bound(dmg,0,999999):0,from);
 // Additional visible impacts for 2/3-hit combos; only ONE Realtime message is sent.
 const hits=Math.max(1,Math.min(3,Number(sk.hits)||1));
 for(let k=1;k<hits;k++)setTimeout(()=>pulse({x:to.x+((k%2)?12:-12),y:to.y-6},v.cls,'',v.tone,0,null),k*155);
}
function hurtEffect(dmg,uid,name){const scene=$('scene');if(!scene)return;const to=coord($('sprites')?.children[casterIndex(uid)])||{x:55,y:200};pulse(to,'fx-hurt',name?'🩸 '+name+' โดนโจมตี':'🩸 โดนโจมตี','#ff6e79',bound(dmg,0,999999));const node=$('sprites')?.children[casterIndex(uid)];if(node){node.classList.remove('amber14-hurt');void node.offsetWidth;node.classList.add('amber14-hurt');setTimeout(()=>{const current=$('sprites')?.children[casterIndex(uid)];if(current){current.classList.add('amber14-hurt');setTimeout(()=>current.classList.remove('amber14-hurt'),500)}},65);setTimeout(()=>node.classList.remove('amber14-hurt'),600)}}
function broadcast(data){if(!channel)return;channel.emit('sfx',data).catch(e=>console.warn('[AMBER V14 FX]',e))}
function packet(kind,data){return {v:1,kind,map:nowMap(),pid:ownParty(),t:TIME(),id:Math.random().toString(36).slice(2,12),...data}}
function onAttack(sk,dmg,m){attackEffect(state.name,sk,dmg,me?.id,false);if(!me||TIME()-lastAttackSent<500)return;lastAttackSent=TIME();broadcast(packet('skill',{skill:sk.id,dmg:bound(dmg,0,999999),mob:String(m?.id||'').slice(0,45)}))}
function onHurt(dmg,m){hurtEffect(dmg,me?.id,'');if(!me||TIME()-lastHurtSent<1350)return;lastHurtSent=TIME();broadcast(packet('hurt',{dmg:bound(dmg,0,999999),mob:String(m?.id||'').slice(0,45)}))}
function addBuff(b,source){const prev=getBuff(b.kind);if(prev&&prev.value>b.value)return false;
 const until=TIME()+b.duration;
 active.set(b.kind,{...b,exp:until,from:source});
 if(b.kind==='mana'&&state.hp>0){state.mp=Math.min(maxMp(),state.mp+Math.max(1,Math.round(maxMp()*b.value/100)));renderTop();save()}
 reschedule();drawAuras();renderTop();return true;
}
function castBuff(sk,automatic=false){const b=BUFFS[sk?.name];if(!b||!state.learned.includes(sk.id)||state.job!==sk.job||state.hp<=0)return false;
 if(state.mp<sk.mp){if(!automatic)notify('MP ไม่เพียงพอ');return false}
 const last=lastCast.get(sk.id)||0;
 if(TIME()-last<7500){if(!automatic)notify('สกิลบัฟติดคูลดาวน์');return false}
 const existing=getBuff(b.kind);
 if(automatic&&existing&&existing.exp-TIME()>3000)return false;
 state.mp-=sk.mp;lastCast.set(sk.id,TIME());addBuff(b,state.name);
 log('✨ '+state.name+' ใช้ '+sk.name+' — '+summary(b)+' ให้ทีมในแผนที่เดียวกัน','party');renderTop();save();
 auraBurst(state.name,sk.name,me?.id);
 broadcast(packet('buff',{skill:sk.id}));
 return true;
}
function auraBurst(who,name,uid){const to=coord($('sprites')?.children[casterIndex(uid)])||{x:60,y:180};pulse(to,'fx-buff',`${who} ✨ ${name}`,'#ffe9a1')}
function decorateSprite(el,labels){el.querySelectorAll('.amber14-aura').forEach(n=>n.remove());if(!labels.length)return;
 const aura=document.createElement('span');aura.className='amber14-aura';aura.title=labels.map(x=>`${x.name}: ${x.desc}`).join(' | ');
 const title=document.createElement('span');title.className='amber14-aura-icon';title.textContent='✦';aura.appendChild(title);el.appendChild(aura);
}
function drawAuras(){const sprites=$('sprites')?.children;if(!sprites?.length)return;
 const party=window.AMBER_SCENE_PLAYERS||[];
 for(let i=0;i<sprites.length;i++){
  const player=i?party[i-1]:null;
  const b=i?Array.isArray(player?.bfx)?player.bfx:[]:[...active.values()].filter(x=>x.exp>TIME()).map(x=>({kind:x.kind,exp:x.exp,value:x.value}));
  const selected=b.filter(x=>x&&Number(x.exp)>TIME()).map(x=>({name:EFFECTS[x.kind]||'บัฟ',desc:'+'+bound(x.value,0,30)+'%'}));
  decorateSprite(sprites[i],selected);
 }
}
const renderSceneBefore=renderScene;
renderScene=function(){renderSceneBefore();drawAuras()};
function presenceInfo(){return {bfx:[...active.values()].filter(x=>x.exp>TIME()).slice(0,5).map(x=>({kind:x.kind,value:x.value,exp:x.exp}))}}
function receive(packetUser){const d=packetUser?.data,by=packetUser?.by;
 if(!d||packetUser.isMe||!by||d.v!==1||typeof d.id!=='string'||d.id.length>36||seen.has(by+d.id))return;
 if(Math.abs(TIME()-Number(d.t||0))>9500 || String(d.map)!==nowMap())return;
 const peer=peerById.get(by),p=peer?.presence;if(!p||p.map!==nowMap())return;
 seen.add(by+d.id);if(seen.size>400)seen.clear();
 const name=String(p.n||'ผู้เล่น').slice(0,22);
 if(d.kind==='hurt'){
  // Show damage on visible teammates; do not subtract HP on this client.
  if(ownParty()&&String(p.pid||'')===ownParty())hurtEffect(bound(d.dmg,0,999999),by,name);
  return;
 }
 const sk=SKILLS.find(x=>x.id===d.skill);if(!sk||sk.job!==p.job||Number(p.lv)<Math.max(10,sk.level))return;
 if(d.kind==='skill'&&!sk.buff){attackEffect(name,sk,d.dmg,by,true);return}
 if(d.kind!=='buff'||!sk.buff)return;
 // Team buffs require SAME party, SAME map and living receiver.
 const pid=ownParty();if(!pid||p.pid!==pid||state.hp<=0)return;
 const b=BUFFS[sk.name];if(!b)return;
 const key=by+':'+sk.id;const last=lastCast.get(key)||0;if(TIME()-last<7000)return;lastCast.set(key,TIME());
 addBuff(b,name);auraBurst(name,sk.name,by);
 log('✨ [ปาร์ตี้] '+name+' ใช้ '+sk.name+' — '+summary(b),'party');
}
async function initNetwork(){if(!window.claude?.use)return;
 try{
  const u=await window.claude.use('user');if(!u)return;
  me=await u.me();channel=await window.claude.use('room');if(!channel)return;
  channel.onPeers(ch=>{peerById.clear();for(const p of ch?.peers||[])if(p.by&&p.presence)peerById.set(p.by,p);drawAuras()});
  channel.on('sfx',receive);
 }catch(e){console.warn('[AMBER V14] Realtime unavailable:',e)}
}
// Update active buff indicators and actual haste attack interval when a buff expires.
setInterval(()=>{
 let changed=false;for(const [key,b] of active)if(b.exp<=TIME()){active.delete(key);changed=true}
 if(changed){reschedule();drawAuras();renderTop()}
},1000);
const styles=document.createElement('style');styles.id='amber14-styles';styles.textContent=`
.amber14-skill-row{align-items:flex-start}.amber14-skill-row>div{min-width:0}.amber14-skill-req{color:#ffda9a!important;font-size:11px!important}.amber14-skill-desc{color:#9dddde!important;font-size:11px!important;line-height:1.5;margin-top:5px}.amber14-skill-type{color:#b8a7ef!important;font-size:10px!important;margin-top:3px}
#skills .amber14-buff-tag{font-size:9px;display:block;color:#ffe197}
#amberV14FX{position:absolute;inset:0;z-index:20;overflow:hidden;pointer-events:none}.amber14-effect{position:absolute;pointer-events:none;transform:translate(-50%,-50%);isolation:isolate;--tone:#98ceff}.amber14-ring{width:84px;height:66px;border:5px solid var(--tone);border-radius:50%;box-shadow:0 0 15px var(--tone),inset 0 0 13px var(--tone);background:radial-gradient(circle,#ffffff30,transparent 65%);animation:amber14-ring .68s ease-out forwards}.fx-sword .amber14-ring{width:110px;height:50px;transform:rotate(-45deg);border-width:6px 3px;animation:amber14-sword .7s ease-out forwards}.fx-fist .amber14-ring{width:70px;height:70px;border-width:10px;animation:amber14-ring .6s ease-out forwards}.fx-bow .amber14-ring{width:32px;height:70px;border-width:4px;transform:rotate(70deg)}.fx-mage .amber14-ring{width:112px;height:104px;border-style:dotted;animation:amber14-magic .8s linear forwards}.fx-hurt .amber14-ring{width:68px;height:58px;border-color:#ff6e79;animation:amber14-ring .6s ease-out forwards}.fx-buff .amber14-ring{width:80px;height:100px;border-style:dashed;animation:amber14-magic .85s ease-out forwards}
.amber14-rune{position:absolute;left:42px;top:28px;font-size:26px;color:white;text-shadow:0 0 10px var(--tone);animation:amber14-ring .7s ease-out forwards}
.amber14-fx-label{position:absolute;left:50%;top:-37px;transform:translateX(-50%);min-width:115px;max-width:190px;background:#101a2edb;border:1px solid var(--tone);box-shadow:0 0 7px #000;color:#ffe8b2;text-shadow:1px 2px 3px #000;border-radius:6px;text-align:center;white-space:normal;padding:4px 6px;font-size:11px;font-weight:700;animation:amber14-fly .92s ease-out forwards}.amber14-fx-dmg{position:absolute;left:50%;top:23px;color:#ffe181;font-size:18px;font-weight:900;text-shadow:0 0 6px #000;animation:amber14-fly .82s ease-out forwards}
.amber14-particle{width:6px;height:6px;position:absolute;left:40px;top:20px;box-shadow:0 0 12px var(--tone);border-radius:2px;animation:amber14-spark .78s var(--delay) ease-out forwards}.amber14-projectile{position:absolute;z-index:3;width:23px;height:7px;border-radius:16px;background:linear-gradient(90deg,transparent,var(--tone),white);box-shadow:0 0 13px var(--tone);animation:amber14-projectile .44s ease-in forwards}.amber14-projectile.fx-fist{height:15px;border-radius:50%}.amber14-projectile.fx-mage{width:24px;height:24px;border-radius:50%;background:radial-gradient(circle,white,var(--tone) 40%,transparent 85%)}
#sprites .sprite>.amber14-aura{position:absolute;pointer-events:none;z-index:9;inset:-5px -3px 12px;border-radius:45%;border:2px dotted #ffe38a;box-shadow:0 0 8px #fff9a0,inset 0 0 10px #eab54f;animation:amber14-aura 1.25s ease-in-out infinite alternate}#sprites .sprite>.amber14-aura:after{content:'✦ ✧ ✦';display:block;position:absolute;top:20%;left:-20%;right:-20%;text-align:center;color:#fff7d9;font-size:15px;animation:amber14-twinkle .6s linear infinite alternate}#sprites .sprite>.amber14-aura .amber14-aura-icon{position:absolute;top:-19px;left:50%;transform:translateX(-50%);color:#ffdf74;text-shadow:0 0 9px #fcf7cd}#sprites .sprite.amber14-hurt img:first-child{animation:amber14-hurt .5s ease-in-out 1!important}#mobimg.amber14-mob-hit{animation:amber14-monster .4s ease-in-out 1}
@keyframes amber14-ring{0%{transform:scale(.1);opacity:1}85%{opacity:.9}100%{transform:scale(1.6);opacity:0}}
@keyframes amber14-sword{0%{opacity:1;transform:rotate(-130deg) scale(.3)}80%{opacity:1}100%{opacity:0;transform:rotate(25deg) scale(1.45)}}
@keyframes amber14-magic{0%{opacity:.9;transform:rotate(0deg) scale(.25)}85%{opacity:.95}100%{opacity:0;transform:rotate(220deg) scale(1.4)}}
@keyframes amber14-spark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
@keyframes amber14-projectile{0%{opacity:1;transform:translate(0,0) scale(.5)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.15)}}
@keyframes amber14-fly{0%{opacity:0;translate:0 18px}22%{opacity:1}90%{opacity:1}100%{opacity:0;translate:0 -26px}}
@keyframes amber14-aura{0%{opacity:.55;filter:hue-rotate(0)}100%{opacity:1;filter:hue-rotate(22deg)}}
@keyframes amber14-twinkle{from{opacity:.3;transform:translateY(5px)}to{opacity:1;transform:translateY(-5px)}}
@keyframes amber14-monster{0%,100%{filter:none;transform:translateX(0)}40%{filter:brightness(1.8) saturate(1.9);transform:translateX(5px)}70%{transform:translateX(-5px)}}
@keyframes amber14-hurt{0%,100%{filter:none}30%,65%{filter:brightness(2) sepia(.4) saturate(5) hue-rotate(-30deg);transform:translateX(4px)}50%{transform:translateX(-5px)}}
@media(prefers-reduced-motion:reduce){.amber14-particle,.amber14-ring,.amber14-rune,.amber14-aura,.amber14-projectile{animation-duration:.1s!important}}
`;document.head.appendChild(styles);
window.AMBER_FX={onAttack,onHurt,castBuff,autoCastBuff:sk=>castBuff(sk,true),presenceInfo,detail:detailed,getActive:()=>[...active.values()].filter(b=>b.exp>TIME()),receiveForTest:receive};
renderSkills();renderScene();
initNetwork();
})();
