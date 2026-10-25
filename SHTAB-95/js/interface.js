
(function(){
 const $=id=>document.getElementById(id),events=[];
 function event(msg){const time=new Date().toLocaleTimeString(I18n.language==='ru'?'ru-RU':'en-GB',{hour12:false});events.unshift('['+time+'] '+msg);events.length=Math.min(events.length,9);$('syslog').textContent=events.join('\n')}
 window.sh95Event=event;
 window.sh95Brief=()=>{const crews=window.sh95CrewData?.();if(!crews)return;$('crewbrief').textContent=crews.map(c=>`${c.k+1}. ${c.name.toUpperCase()} | ${c.identified?c.f+' кГц':'КАНАЛ НЕ ОПОЗНАН'} | ${c.hit?'ЦЕЛЬ ПОРАЖЕНА':'ОЖИДАНИЕ'} | ${c.shots.length} выстр. | ${c.ammo}/${c.ammoMax} БК | ${Math.round(c.temperature)}°C`).join('\n')};
 function dialog(t){$('dialogtext').textContent=t;$('dialog95').hidden=false}
 function close(){$('dialog95').hidden=true}
 $('dialogclose').onclick=close;$('dialogok').onclick=close;$('dialog95').addEventListener('click',e=>{if(e.target===$('dialog95'))close()});
 const helpText=()=>I18n.t('manual.operator');
 $('mhelp').onclick=()=>dialog(helpText());
 $('mfile').onclick=()=>window.sh95OpenFiles?.();
 $('mview').onclick=()=>{window.sh95GreenMap=!window.sh95GreenMap;window.sh95RedrawMap?.();$('mview').setAttribute('aria-pressed',String(!!window.sh95GreenMap));$('mview').title=window.sh95GreenMap?'Зелёный фильтр включён':'Зелёный фильтр выключен';event('Карта: зелёный фильтр '+(window.sh95GreenMap?'включён':'выключен'))};
 $('mtools').onclick=()=>dialog(I18n.t('contact.developer'));
 $('start95').onclick=()=>{$('startmenu').hidden=!$('startmenu').hidden};
 $('smnew').onclick=()=>{$('startmenu').hidden=true;$('newt').click()};
 $('smhelp').onclick=()=>{$('startmenu').hidden=true;$('mhelp').click()};
 $('smclose').onclick=()=>{$('startmenu').hidden=true};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();$('startmenu').hidden=true}if(e.key==='F1'){e.preventDefault();$('mhelp').click()}if(e.key==='F2'){e.preventDefault();$('newt').click()}});
 // Small offline Win95-inspired UI sounds. No copyrighted samples or external assets.
 let uiCtx=null,uiOutput=null,lastSfx=Object.create(null),sfxMuted=false;
 function initUiAudio(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return false;
  if(!uiCtx){
   uiCtx=new Audio();
   const limiter=uiCtx.createDynamicsCompressor();
   limiter.threshold.value=-12;limiter.knee.value=5;limiter.ratio.value=12;
   limiter.attack.value=.002;limiter.release.value=.12;
   const boost=uiCtx.createGain();boost.gain.value=2.6;
   boost.connect(limiter);limiter.connect(uiCtx.destination);uiOutput=boost;
  }
  if(uiCtx.state==='suspended')uiCtx.resume().catch(()=>{});
  return true;
 }
 const sfxVolume=$('sfxVolume'),sfxToggle=$('sfxToggle'),sfxPercent=$('sfxPercent');
 const patterns={
  click:[[0,650,.025,'sine',.24]],
  open:[[0,520,.045,'sine',.30],[.045,780,.075,'sine',.22]],
  close:[[0,700,.045,'sine',.24],[.045,470,.06,'sine',.17]],
  confirm:[[0,660,.055,'sine',.30],[.068,880,.095,'sine',.25]],
  success:[[0,550,.055,'sine',.26],[.075,740,.065,'sine',.25],[.15,990,.12,'sine',.22]],
  error:[[0,280,.075,'triangle',.25],[.095,225,.10,'triangle',.20]],
  mark:[[0,940,.023,'triangle',.16]],
  erase:[[0,350,.035,'triangle',.17]],
  draw:[[0,620,.04,'triangle',.13]],
  pan:[[0,390,.025,'sine',.12]],
  dial:[[0,1000,.015,'triangle',.10]],
  key:[[0,790,.028,'sine',.14]],
  radio:[[0,430,.04,'triangle',.22],[.055,630,.06,'sine',.18]],
  send:[[0,440,.06,'triangle',.32],[.07,570,.075,'sine',.30]],
  reset:[[0,640,.055,'sine',.18],[.065,490,.06,'sine',.16]],
  orderOk:[[0,620,.08,'sine',.30],[.12,840,.15,'sine',.27]],
  orderFail:[[0,420,.18,'sawtooth',.34],[.23,270,.28,'sawtooth',.32],[.55,190,.2,'triangle',.25]]
 };
 function uiSound(kind='click'){
  if(sfxMuted||Number(sfxVolume.value)===0)return;
  const now=performance.now(),minInterval=kind==='dial'?85:kind==='mark'?65:kind==='erase'?70:kind==='pan'?180:kind==='key'?55:35;
  if(now-(lastSfx[kind]||0)<minInterval)return;
  lastSfx[kind]=now;
  try{
   if(!initUiAudio())return;
   const base=uiCtx.currentTime+.004,vol=Number(sfxVolume.value)/100;
   for(const [offset,hz,dur,wave,amp] of (patterns[kind]||patterns.click)){
    const o=uiCtx.createOscillator(),g=uiCtx.createGain(),start=base+offset;
    o.type=wave;o.frequency.setValueAtTime(hz,start);
    g.gain.setValueAtTime(.00001,start);
    g.gain.linearRampToValueAtTime(Math.max(.00002,vol*amp*1.55),start+.005);
    g.gain.exponentialRampToValueAtTime(.00001,start+dur);
    o.connect(g);g.connect(uiOutput);o.start(start);o.stop(start+dur+.005);
   }
  }catch(err){console.debug('UI audio:',err)}
 }
 function orderBuzz(){
  if(sfxMuted||Number(sfxVolume.value)===0)return;
  try{
   if(!initUiAudio())return;
   const t=uiCtx.currentTime+.06,volume=Number(sfxVolume.value)/100;
   const master=uiCtx.createGain(),filter=uiCtx.createBiquadFilter();
   filter.type='lowpass';filter.frequency.value=1450;master.gain.setValueAtTime(.0001,t);
   master.gain.linearRampToValueAtTime(volume*.65,t+.09);
   master.gain.setValueAtTime(volume*.65,t+1.15);
   master.gain.exponentialRampToValueAtTime(.0001,t+1.65);
   filter.connect(master);master.connect(uiOutput);
   [117,121,236].forEach((hz,i)=>{const o=uiCtx.createOscillator();o.type=i===2?'sawtooth':'square';o.frequency.value=hz;const g=uiCtx.createGain();g.gain.value=i===2?.11:.23;o.connect(g);g.connect(filter);o.start(t);o.stop(t+1.7)});
   const pulse=uiCtx.createOscillator(),pg=uiCtx.createGain();pulse.frequency.value=11;pg.gain.value=volume*.025;
   pulse.connect(pg);pg.connect(master.gain);pulse.start(t);pulse.stop(t+1.65);
  }catch(err){console.debug('Order buzz:',err)}
 }
 function orderRejected(){
  // Two descending tones and a short rough carrier burst: order not received.
  uiSound('orderFail');
 }
 window.addEventListener('sh95:order-result',e=>{
  if(e.detail?.received){uiSound('orderOk');orderBuzz()}
  else orderRejected();
 });
 window.sh95OrderBuzz=orderBuzz;
 window.sh95Sound=uiSound;
 sfxVolume.addEventListener('input',()=>{sfxPercent.textContent=sfxVolume.value+'%';if(Number(sfxVolume.value)>0&&sfxMuted){sfxMuted=false;sfxToggle.setAttribute('aria-pressed','true');sfxToggle.textContent='♫ ЗВУК'}});
 sfxToggle.addEventListener('click',()=>{sfxMuted=!sfxMuted;sfxToggle.setAttribute('aria-pressed',String(!sfxMuted));sfxToggle.textContent=sfxMuted?'♪ ВЫКЛ':'♫ ЗВУК';if(!sfxMuted)uiSound('open')});
 const actionSound={sendBearing:'radio',newt:'reset',nowind:'reset',fit:'pan',zin:'dial',zout:'dial',coordApply:'confirm',coordDelete:'erase',clearMarks:'erase',undoMark:'erase',toolPoint:'mark',toolLine:'draw',mhelp:'open',mfile:'open',mtools:'open',start95:'open',smhelp:'open',dialogclose:'close',dialogok:'close',morseClear:'erase',morseBack:'erase',morseLetter:'confirm',morseSpace:'key',bp:'radio'};
 document.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el||el===sfxToggle)return;
  uiSound(actionSound[el.id]||'click');
 },true);
 document.addEventListener('change',e=>{if(e.target.matches('select,input:not([type=range])'))uiSound('click')});
 document.addEventListener('pointerdown',e=>{
  if(e.target.closest('#map')){
   uiSound(e.button===2?'erase':e.button===1?'pan':$('toolLine')?.classList.contains('active')?'draw':'mark');
  }else if(e.target.closest('#morseTap'))uiSound('key');
  else if(e.target.closest('.knob'))uiSound('dial');
 },true);
 document.addEventListener('pointerup',e=>{if(e.target.closest('.knob'))uiSound('dial')},true);
 document.addEventListener('wheel',e=>{if(e.target.closest('.knob'))uiSound('dial')},{passive:true,capture:true});
 document.addEventListener('keydown',e=>{if(e.repeat)return;if(e.target.closest('.knob')&&e.key.startsWith('Arrow'))uiSound('dial')},true);
 // Result sounds, without interfering with the existing event handlers.
 const statusNode=$('bearingStatus');
 if(statusNode){new MutationObserver(()=>{const t=statusNode.textContent.toLowerCase();if(/подтвержд|принят|верн|установлен/.test(t))uiSound('success');else if(/ошиб|неверн|отклон|нет сигнала/.test(t))uiSound('error')}).observe(statusNode,{childList:true,subtree:true,characterData:true})}
 const prev=document.getElementById('bp').onclick;document.getElementById('bp').addEventListener('click',()=>setTimeout(()=>{event('Радиоприёмник: '+(document.getElementById('bp').getAttribute('aria-pressed')==='true'?'включён':'выключен'));$('sysmode').textContent=document.getElementById('bp').getAttribute('aria-pressed')==='true'?'ПРИЁМ АКТИВЕН':'ОЖИДАНИЕ'},80));
 event('Система загружена / Windows 95 UI');window.sh95Brief();
})();
