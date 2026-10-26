/* One shared 1:1 simulation clock with safe, instantaneous time skips. */
(()=>{
'use strict';
const KEY='sh95-game-clock-v1',DAY=86400000;
let initial=Date.UTC(1995,4,15,14,0,0);
try{const stored=Number(localStorage.getItem(KEY));if(Number.isFinite(stored)&&stored>0)initial=stored}catch{}
let anchorGame=initial,anchorReal=performance.now();
const locks=new Map(),listeners=new Set();
function nowMs(){return anchorGame+(performance.now()-anchorReal)}
function now(){return new Date(nowMs())}
function emit(){const d=now();for(const fn of listeners)fn(d);window.dispatchEvent(new CustomEvent('shtab:clockchange',{detail:{date:d}}))}
function lock(name,active){if(active)locks.set(name,Infinity);else locks.delete(name);emit()}
function lockFor(name,seconds){if(!(seconds>0))return;locks.set(name,Math.max(locks.get(name)||0,performance.now()+seconds*1000));emit()}
function reasons(){const t=performance.now();for(const [key,until] of locks)if(until!==Infinity&&until<=t)locks.delete(key);return [...locks.keys()]}
function skip(minutes){if(!Number.isFinite(minutes)||minutes<=0||minutes>360)return false;if(reasons().length)return false;anchorGame=nowMs()+minutes*60000;anchorReal=performance.now();try{localStorage.setItem(KEY,String(Math.floor(anchorGame)))}catch{}emit();window.SH95Notifications?.notify('Clock advanced by '+minutes+' minutes.','SYSTEM CLOCK');return true}
window.GameClock={now,nowMs,skip,canSkip:()=>reasons().length===0,blockers:reasons,lock,lockFor,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}};
const panel=document.createElement('section');panel.className='sh95-clock-panel';panel.hidden=true;
panel.innerHTML='<div class="sh95-clock-head"><strong>▣ SYSTEM CLOCK</strong><button type="button" id="sh95ClockClose" aria-label="Close">×</button></div><div class="sh95-clock-body"><div id="sh95ClockDate"></div><label for="sh95SkipAmount">Skip ahead:</label><div class="sh95-skip-picker" id="sh95SkipPicker" role="radiogroup" aria-label="Skip duration"><label><input type="radio" name="sh95SkipAmount" value="5" checked><span>05 MIN</span></label><label><input type="radio" name="sh95SkipAmount" value="15"><span>15 MIN</span></label><label><input type="radio" name="sh95SkipAmount" value="30"><span>30 MIN</span></label><label><input type="radio" name="sh95SkipAmount" value="60"><span>01 HOUR</span></label><label><input type="radio" name="sh95SkipAmount" value="360"><span>06 HOURS</span></label></div><button id="sh95Skip" type="button">Skip time »</button><p id="sh95ClockStatus"></p></div>';
document.body.append(panel);
const clock=document.getElementById('clock'),button=document.getElementById('sh95Skip'),status=document.getElementById('sh95ClockStatus');
function render(){const d=now(),lang=window.I18n?.language==='ru'?'ru-RU':'en-GB';if(clock){clock.textContent=d.toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'});clock.title='Game time: '+d.toLocaleString(lang)+' · Click to skip time';clock.style.cursor='pointer'}document.getElementById('sh95ClockDate').textContent=d.toLocaleString(lang);const blockers=reasons();button.disabled=blockers.length>0;status.textContent=blockers.length?'Skip unavailable: '+blockers.join(', '):'Time runs at real speed (1:1).'}
clock?.addEventListener('click',()=>{panel.hidden=!panel.hidden;render()});
document.getElementById('sh95ClockClose').onclick=()=>panel.hidden=true;
button.onclick=()=>{if(!skip(Number(document.querySelector('input[name="sh95SkipAmount"]:checked')?.value||5)))render()};
listeners.add(render);render();setInterval(render,1000);
window.addEventListener('beforeunload',()=>{try{localStorage.setItem(KEY,String(Math.floor(nowMs())))}catch{}});
})();