/* 55 AMBERLANDS — Supabase adapter (game V9 is left untouched).
   Google Auth + own cloud save + private Presence/Broadcast + Claude-style social facade.
   This is a SMALL-GROUP TEST, not an authoritative MMO combat/economy server.
*/
(() => {
  'use strict';
  const PROJECT_URL = 'https://rfijdwnzuhvlkfptyoiy.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_8qRFCUpGPd6rftRaAfWVZg_FiEX1r-z';
  const SAVE_TABLE = 'amber_characters';
  const PROFILE_TABLE = 'amber_profiles';
  const TOPIC = 'amberlands:lobby';
  const STATUS = {signedIn:false, cloudReady:false, realtime:false, message:'กำลังเริ่มระบบออนไลน์'};
  const pause = ms => new Promise(r => setTimeout(r, ms));
  window.AMBER_ONLINE_GAME=true;
  const sb = window.supabase?.createClient?.(PROJECT_URL, PUBLISHABLE_KEY, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  let currentUser=null, room=null, cloudBusy=false, timer=null, changedAuth=false, creating=false;
  let marketVersion=0, marketBusy=false;
  const classIndex={'ดาบ':0,'หมัด':1,'ธนู':2,'จอมเวท':3,'นักผจญภัย':4};
  const femaleCache=new Map();
  const femaleSprite=(job)=>{
    const i=classIndex[job]??4;if(femaleCache.has(i))return femaleCache.get(i);
    const coats=['#a8202e','#a24452','#307a45','#3b57aa','#c3a37a'];
    const coat=coats[i];
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38" shape-rendering="crispEdges"><rect x="8" y="27" width="4" height="7" fill="#322940"/><rect x="15" y="27" width="4" height="7" fill="#322940"/><rect x="5" y="18" width="17" height="11" fill="${coat}"/><rect x="7" y="26" width="13" height="3" fill="#f3cc7e"/><rect x="6" y="4" width="16" height="21" fill="#683d4f"/><rect x="8" y="7" width="12" height="13" fill="#f5c8ac"/><rect x="5" y="9" width="3" height="17" fill="#683d4f"/><rect x="20" y="9" width="3" height="17" fill="#683d4f"/><rect x="7" y="3" width="15" height="6" fill="#683d4f"/><rect x="9" y="1" width="11" height="4" fill="#c37ba6"/><rect x="9" y="13" width="3" height="2" fill="white"/><rect x="15" y="13" width="3" height="2" fill="white"/><rect x="10" y="13" width="1" height="2" fill="#322940"/><rect x="16" y="13" width="1" height="2" fill="#322940"/><rect x="12" y="18" width="3" height="1" fill="#c65a74"/><rect x="2" y="7" width="4" height="4" fill="#f2c14e"/><rect x="20" y="7" width="4" height="4" fill="#f2c14e"/><rect x="5" y="19" width="3" height="4" fill="#f5c8ac"/><rect x="20" y="19" width="3" height="4" fill="#f5c8ac"/></svg>`;
    const url='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
    femaleCache.set(i,url);return url;
  };
  window.AMBER_AVATAR={get(gender,job){
    if(gender==='female')return femaleSprite(job);
    const i=classIndex[job]??4;
    return window.AMBER_ART?.images?.[i] || window.AMBER_ART?.images?.[4] || '';
  }};

  const stateText = () => window.AMBER_ONLINE_STATUS = {...STATUS};
  const ui = {overlay:null, label:null, controls:null};
  function showMessage(s){STATUS.message=s;stateText();if(ui.label)ui.label.textContent=s;}
  function makeOverlay(){
    const div = document.createElement('div');
    div.id='amberOnlineGate';
    div.innerHTML = `<div class="amberGateBox"><div class="amberGateHeading">🌐 55 AMBERLANDS ONLINE</div><p id="amberGateStatus">กำลังตรวจสอบบัญชี Google...</p><div id="amberGateControls"></div><small>ล็อกอินด้วย Google เพื่อใช้ตัวละครเดิมบนเครื่องอื่น</small></div>`;
    const style=document.createElement('style');
    style.textContent=`#amberOnlineGate{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:#050b14;padding:18px;font-family:system-ui,'Noto Sans Thai',sans-serif;color:#fff0d2}#amberOnlineGate .amberGateBox{width:min(430px,100%);padding:20px;background:linear-gradient(145deg,#17273b,#090e18);border:2px solid #c99b51;border-radius:17px;box-shadow:0 0 24px #000b;text-align:center}#amberOnlineGate .amberGateHeading{font-weight:850;color:#ffcf76;font-size:20px}#amberOnlineGate p{line-height:1.6}#amberOnlineGate button{display:block;width:100%;margin-top:10px;padding:12px;background:linear-gradient(#ac7125,#62390d);color:#fff6db;border:1px solid #ffce6c;border-radius:9px;min-height:50px;font-weight:bold}#amberOnlineGate small{display:block;margin-top:18px;color:#aab7cd}`;
    document.head.appendChild(style);
    document.body.appendChild(div);
    ui.overlay=div;ui.label=document.getElementById('amberGateStatus');ui.controls=document.getElementById('amberGateControls');
    showMessage(STATUS.message);
  }
  function controls(options){if(!ui.controls)return;ui.controls.innerHTML='';for(const [text,action] of options){const b=document.createElement('button');b.textContent=text;b.addEventListener('click',action);ui.controls.appendChild(b)}}
  function hideOverlay(){document.documentElement.classList.add('amber-ready');ui.overlay?.remove();ui.overlay=null;ui.label=null;ui.controls=null}
  function showError(err,context='เชื่อมต่อ'){console.error('[AMBER ONLINE]',context,err);showMessage(context+' ไม่สำเร็จ: '+(err?.message||String(err)));controls([['ลองอีกครั้ง',()=>location.reload()]])}
  async function identity(){
    if(!sb)return null;
    const {data:ses,error:e}=await sb.auth.getSession();if(e)throw e;
    if(!ses?.session)return null;
    const {data,error}=await sb.auth.getUser();if(error)throw error;
    return data?.user || null;
  }
  function gameState(){
    // state, starter, save, render, stop are existing top-level game bindings.
    const copy = JSON.parse(JSON.stringify(state));
    copy.auto=false;copy.log=Array.isArray(copy.log)?copy.log.slice(-100):[];
    return copy;
  }
  function nickname(){return String(state.name||currentUser?.user_metadata?.name||'PeleZ').slice(0,32)}
  async function refreshMarketEconomy(){
    if(!currentUser)return;
    const {data,error}=await sb.from(SAVE_TABLE).select('save_data,market_version').eq('user_id',currentUser.id).single();
    if(error)throw error;
    const x=data?.save_data||{};
    // Economy is refreshed from the SQL transaction. Keep locally earned XP, map,
    // HP and combat progress; only market-mutated fields are authoritative here.
    for(const k of ['gold','bag','gear','mats','potHP','potMP','eq'])if(Object.hasOwn(x,k))state[k]=structuredClone(x[k]);
    marketVersion=Number(data.market_version)||0;
    if(typeof render==='function')render();
    if(typeof save==='function')save();
  }
  async function saveCloud(manual=false){
    if(!currentUser||!STATUS.cloudReady||cloudBusy||marketBusy)return false;
    cloudBusy=true;
    try{
      const {data,error}=await sb.rpc('amber_save_guarded',{p_save:gameState(),p_market_version:marketVersion});
      if(error)throw error;
      if(data!==true){
        await refreshMarketEconomy();
        if(manual && typeof notify==='function')notify('🔄 อัปเดตรายการตลาดและจำนวนไอเทมแล้ว');
        return false;
      }
      if(manual && typeof notify==='function')notify('✅ เซฟ Google สำเร็จ');
      return true;
    }catch(e){console.error('[AMBER] cloud save:',e);STATUS.message='เซฟคลาวด์ผิดพลาด: '+e.message;stateText();if(manual && typeof notify==='function')notify('บันทึกไม่สำเร็จ '+e.message);return false}
    finally{cloudBusy=false}
  }
  async function beginMarket(){
    if(!currentUser||!STATUS.cloudReady)throw new Error('กรุณาล็อกอิน Google ก่อน');
    for(let i=0;i<100&&cloudBusy;i++)await pause(80);
    if(cloudBusy||marketBusy)throw new Error('ระบบกำลังบันทึกข้อมูลอยู่ ลองอีกครั้ง');
    const ok=await saveCloud();
    if(!ok)throw new Error('สถานะกระเป๋าเปลี่ยน กรุณาตรวจข้อมูลแล้วทำรายการอีกครั้ง');
    marketBusy=true;
  }
  async function endMarket(){
    try{await refreshMarketEconomy()}finally{marketBusy=false}
  }
  function profileName(){return nickname()}
  async function syncProfile(initial=false){
    if(!currentUser)return;
    if(initial){
      const {data,error}=await sb.from(PROFILE_TABLE).select('user_id,display_name,friends').eq('user_id',currentUser.id).maybeSingle();
      if(error)throw error;
      if(!data){
        const {error:e}=await sb.from(PROFILE_TABLE).insert({user_id:currentUser.id,display_name:profileName(),gender:state.gender||'male',character_created:true,friends:[]});
        if(e)throw e;
      }else if(data.display_name!==profileName()){
        await sb.from(PROFILE_TABLE).update({display_name:profileName(),updated_at:new Date().toISOString()}).eq('user_id',currentUser.id)
      }
    }else await sb.from(PROFILE_TABLE).update({display_name:profileName(),updated_at:new Date().toISOString()}).eq('user_id',currentUser.id)
  }
  function firstCharacter(base){return new Promise((resolve)=>{
    showMessage('สร้างตัวละครครั้งแรก • เลือกเพศและตั้งชื่อ (อาชีพเลือกได้ในเกมเมื่อ Lv.10)');
    ui.controls.innerHTML=`<div class="amberCharacterCreate">
      <label class="amberField">ชื่อตัวละคร <input id="amberNewName" maxlength="16" minlength="2" placeholder="ตั้งชื่อ 2–16 ตัวอักษร" autocomplete="off"/></label>
      <p>เลือกตัวละครเริ่มต้น</p><div class="amberGenderChoices">
      <button type="button" data-g="male" class="amberGender on"><img id="amberBoy" alt="ผู้ชาย"/><span>👦 ผู้ชาย</span></button>
      <button type="button" data-g="female" class="amberGender"><img id="amberGirl" alt="ผู้หญิง"/><span>👧 ผู้หญิง</span></button></div>
      <small>เริ่มต้นเป็นนักผจญภัย • เลือกอาชีพ ดาบ / หมัด / ธนู / เวท เมื่อ Lv.10</small>
      <p id="amberNameError" class="amberFormError" aria-live="polite"></p>
      <button type="button" id="amberCreateChar" class="amberMake">สร้างตัวละครและเข้าเกม</button></div>`;
    const style=document.createElement('style');style.textContent=`#amberOnlineGate .amberGateBox{max-height:95dvh;overflow:auto}#amberOnlineGate .amberField{display:block;text-align:left;font-weight:bold}#amberOnlineGate input{box-sizing:border-box;display:block;width:100%;font:inherit;background:#0b1628;color:#ffe8b7;border:1px solid #cda266;border-radius:6px;padding:12px;margin:6px 0 9px}#amberOnlineGate .amberGenderChoices{display:flex;gap:12px}#amberOnlineGate .amberGender{flex:1;display:flex;align-items:center;flex-direction:column;gap:6px;background:#1a2940;padding:10px 5px}#amberOnlineGate .amberGender.on{outline:3px solid #ffca68;background:#36402d}#amberOnlineGate .amberGender img{height:100px;width:75px;object-fit:contain;image-rendering:pixelated}#amberOnlineGate .amberFormError{min-height:18px;color:#ff8c8c}#amberOnlineGate .amberCharacterCreate p{font-size:13px;margin:10px 0}`;ui.overlay.appendChild(style);
    const imgM=ui.controls.querySelector('#amberBoy'),imgF=ui.controls.querySelector('#amberGirl');
    imgM.src=window.AMBER_AVATAR.get('male','นักผจญภัย');imgF.src=window.AMBER_AVATAR.get('female','นักผจญภัย');
    let gender='male';
    ui.controls.querySelectorAll('[data-g]').forEach(btn=>btn.addEventListener('click',()=>{
      gender=btn.dataset.g;ui.controls.querySelectorAll('[data-g]').forEach(b=>b.classList.toggle('on',b===btn));
    }));
    const submit=ui.controls.querySelector('#amberCreateChar'),errorText=ui.controls.querySelector('#amberNameError'),input=ui.controls.querySelector('#amberNewName');
    input.addEventListener('keydown',e=>{if(e.key==='Enter')submit.click()});
    submit.addEventListener('click',async()=>{
      if(creating)return;
      const name=input.value.trim().replace(/\s+/g,' ');
      if(!/^[\p{L}\p{N}_ ]{2,16}$/u.test(name)){
        errorText.textContent='กรุณาตั้งชื่อ 2–16 ตัวอักษร ใช้อักษรไทย อังกฤษ ตัวเลข หรือ _';return;
      }
      creating=true;submit.disabled=true;errorText.textContent='กำลังสร้างตัวละคร...';
      try{
        const initial=base?{...starter(),...base}:{...starter()};
        initial.name=name;initial.gender=gender;initial.character_created=true;initial.party=1;initial.auto=false;initial.v8=1;
        if(!base){initial.lv=1;initial.job='นักผจญภัย';}
        const {error}=await sb.rpc('amber_create_character',{p_name:name,p_gender:gender,p_save:initial});
        if(error)throw error;
        resolve(initial);
      }catch(e){
        errorText.textContent=(/duplicate|unique/i.test(String(e.message)))?'ชื่อซ้ำกับผู้เล่นอื่น กรุณาเปลี่ยนชื่อ':('สร้างตัวละครไม่สำเร็จ: '+e.message);
        console.error('[AMBER CREATE]',e);
      }finally{creating=false;submit.disabled=false}
    });
  })}
  async function loadCloud(){
    showMessage('กำลังโหลดตัวละครจากบัญชี Google...');
    const [{data,error},{data:profile,error:pe}]=await Promise.all([
      sb.from(SAVE_TABLE).select('save_data,character_name,market_version').eq('user_id',currentUser.id).maybeSingle(),
      sb.from(PROFILE_TABLE).select('display_name,gender,character_created').eq('user_id',currentUser.id).maybeSingle()
    ]);
    if(error)throw error;if(pe)throw pe;
    marketVersion=Number(data?.market_version)||0;
    let remote=data?.save_data&&typeof data.save_data==='object'&&Object.keys(data.save_data).length?data.save_data:null;
    if(remote?.character_created===true || profile?.character_created===true){
      if(!remote)throw new Error('พบโปรไฟล์แต่ไม่มีข้อมูลเซฟ กรุณาติดต่อผู้ดูแล');
      if(typeof stop==='function')stop();
      state={...starter(),...remote,gender:remote.gender||profile?.gender||'male',character_created:true,party:1,auto:false};
    }else{
      // A new Google account always creates a new character; never silently import another device's local save.
      // If a beta cloud save already exists, preserve its progress while recording name/gender one time.
      const created=await firstCharacter(remote);
      if(typeof stop==='function')stop();
      state={...starter(),...created,auto:false,party:1};
    }
    currentHp=mob().hp;save();render();
    localStorage.setItem('amber_cloud_last_user',currentUser.id);
    STATUS.cloudReady=true;STATUS.signedIn=true;stateText();
    await syncProfile(true);
    hideOverlay();
    const onl=document.getElementById('onl');if(onl)onl.textContent='🟡 กำลังเชื่อมผู้เล่น';
    if(timer)clearInterval(timer);
    timer=setInterval(async()=>{await saveCloud();await syncProfile().catch(e=>console.warn('profile',e))},15000);
  }
  async function boot(){
    makeOverlay();
    if(!sb){showMessage('ไม่สามารถโหลด Supabase SDK ได้ กรุณาต่ออินเทอร์เน็ตแล้วรีเฟรช');controls([['ลองอีกครั้ง',()=>location.reload()]]);return}
    try{
      currentUser=await identity();
      if(!currentUser){
        showMessage('เข้าสู่ระบบ Google ก่อนเข้าเกม (เพิ่ม Gmail ใน Google Cloud Test users ก่อน)');
        controls([['🔐 เข้าสู่ระบบด้วย Google',async()=>{
          showMessage('กำลังเปิดหน้า Google...');
          const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
          if(error)showError(error,'Google Login');
        }]]);
        return;
      }
      await loadCloud();
    }catch(e){showError(e,'เริ่มเกมออนไลน์')}
  }
  // Match the small set of Claude API calls already used by the game's V10 social code.
  const userApi={
    async me(){const u=currentUser||await identity();if(!u)throw new Error('ยังไม่ล็อกอิน Google');return {id:u.id,name:profileName()}},
    async search(query){
      if(!currentUser)return [];
      const search=String(query||'').trim().slice(0,32).replace(/[%,()]/g,'');
      let q=sb.from(PROFILE_TABLE).select('user_id,display_name').order('display_name',{ascending:true}).limit(30);
      if(search)q=q.ilike('display_name','%'+search+'%');
      const {data,error}=await q;if(error)throw error;
      return (data||[]).map(r=>({id:r.user_id,name:r.display_name,avatarUrl:'',isMe:r.user_id===currentUser.id}));
    },
    async profiles(ids){
      if(!ids?.length)return {};
      const {data,error}=await sb.from(PROFILE_TABLE).select('user_id,display_name').in('user_id',ids.slice(0,200));
      if(error)throw error;
      return Object.fromEntries((data||[]).map(p=>[p.user_id,{name:p.display_name}]));
    }
  };
  const dbApi={
    doc(path){
      const target=String(path||'').match(/^data\/users\/([a-f0-9-]{36})\/profile$/i)?.[1];
      return {
        async get(){
          if(!target)return {exists:false,data:()=>({})};
          const {data,error}=await sb.from(PROFILE_TABLE).select('friends,display_name').eq('user_id',target).maybeSingle();
          if(error)throw error;return {exists:!!data,data:()=>data||{}};
        },
        async set(obj){
          if(!target||target!==currentUser?.id)throw new Error('ห้ามแก้ข้อมูลเพื่อนของบัญชีอื่น');
          const v=Array.isArray(obj?.friends)?obj.friends.filter(x=>/^[0-9a-f-]{36}$/i.test(x)).slice(0,200):[];
          const {error}=await sb.from(PROFILE_TABLE).update({friends:v,updated_at:new Date().toISOString()}).eq('user_id',target);
          if(error)throw error;
        }
      }
    }
  };
  // V22: stable foreground recovery, server-confirmed Presence, stale-roster repair.
  // V18: Foreground recovery + bounded subscription watchdog.
  // Android may suspend Chrome entirely: reconnection is guaranteed only when
  // JavaScript resumes, not while the screen is off.
  function makeRoom(){
    if(room)return room;
    const callbacks=new Set(), listeners=new Map();
    const JOIN_TIMEOUT_MS=18000;
    const PRESENCE_GAP_MS=15000; // slow presence updates (max five tracks / 30 s)
    let topic=null, subscribed=false, latest=null;
    let lastSeen='', lastTrack=0, lastTrackAttempt=0;
    let reconnectTimer=null, joinWatchdog=null, presenceTimer=null;
    let rebuilding=false, connectingSince=0, hiddenSince=0, lastWakeAction=0;
    let generation=0, failureCount=0, tracking=false;
    let presenceFailures=0, missingSelfSince=0, lastPeerSignature="";
    const visible=()=>!document.hidden && navigator.onLine!==false;
    const connected=()=>subscribed && topic?.state==='joined' && topic?.socket?.isConnected?.()!==false;
    // 'SUBSCRIBED' alone does not mean that the player roster is synced.
    const mineInPresence=()=>{
      if(!connected()||!currentUser)return false;
      try{return Object.values(topic.presenceState()||{}).flat().some(p=>p?.user_id===currentUser.id)}catch(_){return false}
    };
    const showConnection=(requestedOnline,message)=>{
      const isOnline=!!requestedOnline&&connected()&&mineInPresence();
      const changed=STATUS.realtime!==isOnline;
      STATUS.realtime=isOnline;STATUS.message=isOnline?'ออนไลน์':message;stateText();
      const onl=document.getElementById('onl');
      if(onl){
        const friends=(window.AMBER_PUBLIC_PEERS||[]).filter(p=>p.by&&p.by!==currentUser?.id).length;
        onl.textContent=isOnline?'🟢 ออนไลน์ '+(friends+1)+' คน':'🟡 '+(message||'กำลังเชื่อมต่อ');
      }
      // Don't dispatch every 4 seconds; the market addon uses this event to fetch.
      if(changed)window.dispatchEvent(new CustomEvent('amber-v19-realtime',{detail:{connected:isOnline}}));
    };
    const peers=()=>{
      if(!subscribed||!topic)return;
      let all=[];
      try{all=Object.values(topic.presenceState()||{}).flat()}catch(e){console.warn('[AMBER] presence snapshot',e);return}
      const byId=new Map();
      for(const p of all){
        if(!p?.user_id)continue;
        byId.set(p.user_id,{by:p.user_id,isMe:p.user_id===currentUser.id,kind:'viewer',presence:p.presence||{}});
      }
      window.AMBER_PUBLIC_PEERS=[...byId.values()];
      // Fingerprint the actual roster. Repeat callbacks only when anything changes.
      const signature=JSON.stringify([...byId.values()].map(p=>[p.by,p.presence]).sort((a,b)=>a[0].localeCompare(b[0])));
      if(signature!==lastPeerSignature){
        lastPeerSignature=signature;
        callbacks.forEach(cb=>{try{cb({peers:[...byId.values()]})}catch(e){console.error(e)}});
      }
      if(mineInPresence()){
        missingSelfSince=0;
        if(!STATUS.realtime)showConnection(true,'ออนไลน์');
        else showConnection(true,'ออนไลน์'); // refresh the player count
      }
    };
    const clearRetry=()=>{if(reconnectTimer!==null){clearTimeout(reconnectTimer);reconnectTimer=null}};
    const clearJoinWatchdog=()=>{if(joinWatchdog!==null){clearTimeout(joinWatchdog);joinWatchdog=null}};
    const scheduleReconnect=(immediate=false)=>{
      if(rebuilding||reconnectTimer!==null||!currentUser||!visible())return;
      const delay=immediate?450:Math.min(30000,1500*2**Math.min(failureCount++,5));
      reconnectTimer=setTimeout(()=>{
        reconnectTimer=null;
        rebuildChannel().catch(e=>{
          console.warn('[AMBER] reconnect failed',e);
          showConnection(false,'กำลังเชื่อมต่อใหม่');
          scheduleReconnect();
        });
      },delay);
    };
    const forceReconnect=(reason)=>{
      if(!currentUser||!visible())return;
      if(rebuilding)return; // the active rebuild owns opening its successor
      if(reason)console.warn('[AMBER] Realtime recovering:',reason);
      subscribed=false;
      showConnection(false,'กำลังเชื่อมต่อใหม่');
      clearRetry();
      scheduleReconnect(true);
    };
    const trackLatest=async()=>{
      if(!latest||!connected()||tracking)return;
      const now=Date.now(),wait=Math.max(0,PRESENCE_GAP_MS-(now-lastTrackAttempt));
      if(wait>0){
        if(presenceTimer===null){
          presenceTimer=setTimeout(()=>{presenceTimer=null;trackLatest().catch(e=>console.warn('[AMBER] presence',e))},wait);
        }
        return;
      }
      // One in-flight Presence update; coalesce any changes into the newest snapshot.
      const ch=topic, snapshot=latest, key=JSON.stringify(snapshot);
      if(key===lastSeen && now-lastTrack<45000)return;
      tracking=true;lastTrackAttempt=now;
      try{
        const result=await Promise.race([
          ch.track({user_id:currentUser.id,kind:'viewer',presence:snapshot}),
          pause(9500).then(()=>{throw new Error('Presence acknowledgement timeout')})
        ]);
        if(result!=='ok')throw new Error('Presence: '+result);
        if(ch===topic){lastSeen=key;lastTrack=Date.now();presenceFailures=0;peers();}
      }catch(e){
        if(ch===topic){presenceFailures++;if(presenceFailures>=3||!connected()){presenceFailures=0;forceReconnect('Presence failed: '+e.message);}}
        throw e;
      }finally{
        tracking=false;
        if(ch===topic && latest && JSON.stringify(latest)!==key && connected()){
          trackLatest().catch(e=>console.warn('[AMBER] latest presence',e));
        }
      }
    };
    const reconnectOnResume=()=>{
      if(!currentUser||!visible())return;
      const now=Date.now(),slept=hiddenSince?now-hiddenSince:0;
      hiddenSince=0;
      if(now-lastWakeAction<1400)return; // deduplicate focus/pageshow/visibility
      lastWakeAction=now;
      // Do NOT forcibly remove a healthy channel after a long app switch.
      // It causes the exact orange reconnect flicker users reported.
      if(!connected()){
        showConnection(false,'กำลังเชื่อมต่อใหม่');
        if(!rebuilding && (!topic || Date.now()-connectingSince>JOIN_TIMEOUT_MS)){
          clearRetry();scheduleReconnect(true);
        }
      }else{
        peers(); // restore roster from the SDK's local Presence without an HTTP refresh
        // Android can keep a joined socket but lose the local Presence snapshot.
        // Re-track once (rate limited), then the watchdog repairs only if still empty.
        if(!mineInPresence() || (slept>=5000 && now-lastTrack>=PRESENCE_GAP_MS)){
          lastSeen='';lastTrack=0;
          trackLatest().catch(e=>console.warn('[AMBER] resume Presence check',e));
        }else showConnection(true,'ออนไลน์');
      }
    };
    function openChannel(){
      if(!currentUser||!visible())return;
      const id=++generation;
      connectingSince=Date.now();
      subscribed=false;
      showConnection(false,'กำลังเชื่อมต่อใหม่');
      let ch;
      try{
        ch=sb.channel(TOPIC,{config:{private:true,presence:{key:currentUser.id},broadcast:{self:false,ack:true}}});
        topic=ch;
        ch.on('presence',{event:'sync'},()=>{if(id===generation)peers()});
        ch.on('presence',{event:'join'},()=>{if(id===generation)peers()});
        ch.on('presence',{event:'leave'},()=>{if(id===generation)peers()});
        ch.on('broadcast',{event:'game'},({payload})=>{
          if(id!==generation||!subscribed)return;
          if(!payload||typeof payload.by!=='string'||!payload.data||!payload.evt)return;
          if(!['pinv','pans','pchat','wchat','pdrop','pxp','sfx','market','skill23','dg23'].includes(payload.evt))return;
          const ps=ch.presenceState();
          const live=Object.values(ps).flat().some(p=>p.user_id===payload.by);
          if(!live)return;
          const msg={by:payload.by,data:payload.data,isMe:payload.by===currentUser.id};
          (listeners.get(payload.evt)||[]).forEach(cb=>{try{cb(msg)}catch(e){console.error(e)}});
        });
        // Handles the Android case where subscribe neither succeeds nor emits an error.
        clearJoinWatchdog();
        joinWatchdog=setTimeout(()=>{
          if(id!==generation||subscribed||!visible())return;
          clearJoinWatchdog();
          forceReconnect('SUBSCRIBED not received within 18 seconds');
        },JOIN_TIMEOUT_MS);
        ch.subscribe((status,err)=>{
          if(id!==generation)return;
          if(status==='SUBSCRIBED'){
            clearJoinWatchdog();
            subscribed=true;failureCount=0;clearRetry();lastSeen='';lastTrack=0;lastTrackAttempt=0;
            missingSelfSince=Date.now();lastPeerSignature='';
            showConnection(false,'กำลังคืนรายชื่อเพื่อน');
            // Re-publish Presence on every successful join; old server presence
            // does not survive an interrupted WebSocket.
            trackLatest().catch(e=>console.warn('[AMBER] restore presence',e));
            peers();
          }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
            clearJoinWatchdog();subscribed=false;
            showConnection(false,document.hidden?'พักการเชื่อมต่อขณะพับจอ':'กำลังเชื่อมต่อใหม่');
            console.warn('[AMBER] Realtime channel',status,err);
            scheduleReconnect();
          }
        });
      }catch(e){
        clearJoinWatchdog();subscribed=false;
        console.warn('[AMBER] open channel',e);
        scheduleReconnect();
      }
    }
    async function rebuildChannel(){
      if(rebuilding||!currentUser||!visible())return;
      rebuilding=true;clearRetry();clearJoinWatchdog();
      const old=topic;
      ++generation;subscribed=false;topic=null;missingSelfSince=0;lastPeerSignature='';
      try{
        if(old){
          // Never wait forever for the old socket; an Android sleep can stall it.
          await Promise.race([sb.removeChannel(old).catch(()=>{}),pause(2500)]);
        }
      }finally{
        rebuilding=false;
        if(visible())openChannel();
      }
    }
    window.addEventListener('online',()=>{lastWakeAction=0;reconnectOnResume()});
    window.addEventListener('focus',reconnectOnResume);
    window.addEventListener('pageshow',reconnectOnResume);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){hiddenSince=Date.now();return;}
      reconnectOnResume();
    });
    window.addEventListener('offline',()=>{
      clearRetry();clearJoinWatchdog();subscribed=false;
      showConnection(false,'รออินเทอร์เน็ต');
    });
    // Foreground watchdog: recover even if Android drops focus/visibility callbacks.
    // This local timer does not send network messages unless a disconnect is detected.
    setInterval(()=>{
      if(!currentUser||!visible()||rebuilding)return;
      if(connected()){
        peers(); // local only; no extra Supabase message
        if(mineInPresence()){
          missingSelfSince=0;
          if(!STATUS.realtime)showConnection(true,'ออนไลน์');
        }else{
          if(!missingSelfSince)missingSelfSince=Date.now();
          showConnection(false,'กำลังคืนรายชื่อเพื่อน');
          if(Date.now()-lastTrackAttempt>PRESENCE_GAP_MS){
            lastSeen='';lastTrack=0;
            trackLatest().catch(e=>console.warn('[AMBER] missing Presence',e));
          }
          // A socket can stay joined while Presence is permanently stale.
          if(Date.now()-missingSelfSince>26000)forceReconnect('own Presence absent for 26 seconds');
        }
        return;
      }
      if(!topic || Date.now()-connectingSince>JOIN_TIMEOUT_MS+1500){
        if(!reconnectTimer){showConnection(false,'กำลังเชื่อมต่อใหม่');scheduleReconnect();}
      }
    },3500);
    room={
      onPeers(fn){callbacks.add(fn);lastPeerSignature='';setTimeout(peers,0)},
      on(evt,fn){if(!listeners.has(evt))listeners.set(evt,[]);listeners.get(evt).push(fn)},
      async emit(evt,data){
        if(!['pinv','pans','pchat','wchat','pdrop','pxp','sfx','market','skill23','dg23'].includes(evt))throw new Error('ฟีเจอร์นี้ยังต้องใช้เซิร์ฟเวอร์เกม');
        if(!connected())throw new Error('Realtime กำลังเชื่อมต่อใหม่');
        const result=await topic.send({type:'broadcast',event:'game',payload:{by:currentUser.id,evt,data}});
        if(result!=='ok')throw new Error('ส่งข้อมูลไม่สำเร็จ: '+result);
      },
      async presence(data){
        latest={...data,n:String(data.n||'').slice(0,32)};
        await trackLatest();
      }
    };
    window.AMBER_REALTIME_DIAGNOSTICS=()=>({
      connected:STATUS.realtime,
      channelState:topic?.state||'none',
      socketConnected:topic?.socket?.isConnected?.()??false,
      ownPresence:mineInPresence(),
      peerCount:(window.AMBER_PUBLIC_PEERS||[]).filter(p=>!p.isMe).length,
      reconnectAttempts:failureCount,
      lastTrackAgeSeconds:lastTrack?Math.round((Date.now()-lastTrack)/1000):null
    });
    openChannel();
    return room;
  }
  const bootReady = boot();
  window.claude={use:async(type)=>{
    if(!sb)return null;
    await bootReady;
    if(type==='user')return userApi;
    // Wait for google session before exposing Realtime.
    const u=currentUser||await identity();
    if(!u)return null;
    currentUser=u;
    if(type==='room')return makeRoom();
    if(type==='db')return dbApi;
    return null;
  }};
  // Shut off peer-to-peer trading UI; this is NOT a safe money/item transfer server.
  window.addEventListener('load',()=>{
    if(window.AMBO){window.AMBO.trade=()=>{if(typeof notify==='function')notify('แลกเปลี่ยนไอเทมยังไม่เปิด: ต้องใช้เซิร์ฟเวอร์ตรวจสอบ')}};
  });
  window.addEventListener('pagehide',()=>{if(STATUS.cloudReady)saveCloud().catch(()=>{})});
  window.AMBER_CLOUD={saveNow:()=>saveCloud(true),getStatus:()=>({...STATUS}),getClient:()=>sb,getUser:()=>currentUser,getRoom:()=>room,beginMarket,endMarket,refreshMarketEconomy};
  // Boot after game script parsed; V10's existing init can then use window.claude facade.
  // boot() has already started before V10 script evaluates.
})();
