const {WORLD_SIZE:WS,GRID_SIZE:N,CELL_SIZE:CELL}=window.SH95TerrainData;
const G=9.81,K=8e-5,V0=[250,350,450,550,800],R_HIT=15;
let S,HM,ORG,terr,terrainHydrology,CR=[],last=null,v={cx:0,cy:0,m:30};
const $=id=>document.getElementById(id),rnd=(a,b)=>a+Math.random()*(b-a);
const mapC=$('map'),W=mapC.width,H=mapC.height;
const X=wx=>W/2+(wx-v.cx)/v.m,Y=wy=>H/2-(wy-v.cy)/v.m;
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// Four regional geological profiles.
let terrainRegion='donja_bukovica';

function initTerrainRegionCombo(){
 const combo=$('terrainRegionCombo'),trigger=$('terrainRegionTrigger'),menu=$('terrainRegionMenu'),value=$('terrainRegionValue'),input=$('terrainRegion');
 if(!combo||!trigger||!menu||!input)return;
 const options=[...menu.querySelectorAll('[data-region]')];
 const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
 const open=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true')};
 const choose=option=>{input.value=option.dataset.region;value.textContent=option.textContent;options.forEach(item=>item.setAttribute('aria-selected',String(item===option)));close();trigger.focus()};
 trigger.addEventListener('click',()=>menu.hidden?open():close());
 trigger.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();const current=options.findIndex(option=>option.dataset.region===input.value);options[(current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].focus()}
  else if(event.key==='Escape')close();
 });
 menu.addEventListener('click',event=>{const option=event.target.closest('[data-region]');if(option)choose(option)});
 menu.addEventListener('keydown',event=>{
  const current=options.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();close();trigger.focus()}
  else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].focus()}
  else if(event.key==='Home'||event.key==='End'){event.preventDefault();options[event.key==='Home'?0:options.length-1].focus()}
  else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(current>=0)choose(options[current])}
 });
 document.addEventListener('pointerdown',event=>{if(!combo.contains(event.target))close()});
 combo.addEventListener('focusout',event=>{if(!combo.contains(event.relatedTarget))close()});
}
initTerrainRegionCombo();

// Worker generation and terrain diagnostics.
let terrainDiagnostics=null,terrainLayer='height',terrainJob=0,terrainWorker=null,terrainRequest=0,terrainGenerating=false;
function terrainGenerate(seed,region){
 return new Promise((resolve,reject)=>{
  if(typeof Worker==='undefined'){reject(Error('Web Worker unavailable'));return}
  const worker=new Worker('js/terrain/terrain-worker.js');
  terrainWorker=worker;
  const id=++terrainJob;
  worker.onmessage=event=>{
   if(event.data.id!==id)return;
   worker.terminate();if(terrainWorker===worker)terrainWorker=null;
   if(event.data.error)reject(Error(event.data.error));else resolve(event.data);
  };
  worker.onerror=event=>{worker.terminate();if(terrainWorker===worker)terrainWorker=null;reject(Error(event.message||'Worker failed'))};
  worker.postMessage({id,seed,region});
 });
}
function initTerrainDiagnostics(){
 const toolbar=$('map')?.parentElement;
 if(!toolbar||document.getElementById('terrainDiagnosticLayer'))return;
 const label=document.createElement('div');
 label.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:6px;font:11px monospace;margin:6px 4px';
 label.textContent='TERRAIN: ';
 const select=document.createElement('select');select.id='terrainDiagnosticLayer';select.style.width='170px';select.setAttribute('aria-label','Terrain layer');
 for(const [value,name] of [['height','Topographic'],['biome','Biomes'],['rainfall','Annual rainfall'],['temperature','Mean temperature'],['flow','Runoff accumulation'],['direction','Flow direction'],['incision','Erosion depth'],['deposition','Sediment deposition']]){
  const option=document.createElement('option');option.value=value;option.textContent=name;select.appendChild(option);
 }
 select.onchange=()=>{terrainLayer=select.value;if(HM){renderTerrain();draw()}};
 label.appendChild(select);
 const seedLabel=document.createElement('label');seedLabel.textContent=' Seed ';
 const seedInput=document.createElement('input');seedInput.id='terrainSeed';seedInput.type='number';seedInput.min='0';seedInput.max='4294967295';seedInput.step='1';seedInput.placeholder='Random';seedInput.style.width='110px';seedInput.setAttribute('aria-label','Terrain seed');
 seedLabel.appendChild(seedInput);label.appendChild(seedLabel);
 const legend=document.createElement('span');legend.id='terrainLegend';legend.style.cssText='flex-basis:100%;line-height:1.5';label.appendChild(legend);
 const info=document.createElement('span');info.id='terrainInfo';info.style.marginLeft='8px';label.appendChild(info);
 toolbar.parentElement?.insertBefore(label,toolbar);
}
initTerrainDiagnostics();
function ground(x,y){
  let u=(x-ORG.x)/CELL,w=(y-ORG.y)/CELL;u=Math.min(N-1.001,Math.max(0,u));w=Math.min(N-1.001,Math.max(0,w));
  const i=u|0,j=w|0,a=u-i,b=w-j;
  return HM[j*N+i]*(1-a)*(1-b)+HM[j*N+i+1]*a*(1-b)+HM[(j+1)*N+i]*(1-a)*b+HM[(j+1)*N+i+1]*a*b}

function renderTerrain(){
  const rasterStart=performance.now();
  // Elevation and diagnostic rasters.
  terr=document.createElement('canvas');
  terr.width=terr.height=N;
  const ctx=terr.getContext('2d');
  const image=ctx.createImageData(N,N);
  let min=Infinity,max=-Infinity;
  for(const h of HM){min=Math.min(min,h);max=Math.max(max,h)}
  const layer=terrainLayer==='flow'?terrainDiagnostics?.accumulation:terrainLayer==='direction'?terrainDiagnostics?.receiver:['incision','deposition','rainfall','temperature'].includes(terrainLayer)?terrainDiagnostics?.[terrainLayer]:null;
  let layerMin=Infinity,layerMax=-Infinity;
  if(layer)for(const v of layer){layerMin=Math.min(layerMin,v);layerMax=Math.max(layerMax,v)}
  const legends={height:'Height '+Math.round(min)+'–'+Math.round(max)+' m · contours 50 m · blue: rivers / lake basins',biome:'Grassland · woodland · montane forest · alpine meadow · bare rock · wetland',rainfall:'Annual rainfall '+Math.round(layerMin)+'–'+Math.round(layerMax)+' mm/year',temperature:'Mean annual temperature '+layerMin.toFixed(1)+'–'+layerMax.toFixed(1)+' °C',flow:'Log runoff accumulation · equivalent contributing cells at 600 mm/year runoff',direction:'D8 receiver bearing · map-edge outlets',incision:'Bedrock incision 0–'+layerMax.toFixed(2)+' m',deposition:'Deposited sediment 0–'+layerMax.toFixed(2)+' m'};
  if($('terrainLegend'))$('terrainLegend').textContent=legends[terrainLayer];
  const palette=[[199,205,153],[154,181,134],[133,163,135],[188,193,155],[186,179,164],[151,186,172]];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const ix=x,iy=N-1-y,index=iy*N+ix;
    const t=layer?(terrainLayer==='flow'?Math.log1p(layer[index])/Math.log1p(Math.max(1,layerMax)):terrainLayer==='direction'?(layer[index]<0?0:(Math.atan2(Math.floor(layer[index]/N)-iy,layer[index]%N-ix)+Math.PI)/(2*Math.PI)):(layer[index]-layerMin)/Math.max(.001,layerMax-layerMin)):(HM[index]-min)/Math.max(1,max-min);
    const k=(y*N+x)*4;
    let color=layer?[245-205*t,242-165*t,231-100*t]:[222-72*t,225-85*t,188-70*t];
    if(!layer){
     if(terrainLayer==='biome')color=palette[terrainDiagnostics?.biome?.[index]??0].slice();
     const west=HM[iy*N+Math.max(0,ix-1)],east=HM[iy*N+Math.min(N-1,ix+1)];
     const south=HM[Math.max(0,iy-1)*N+ix],north=HM[Math.min(N-1,iy+1)*N+ix];
     const dx=(east-west)/(CELL*(ix===0||ix===N-1?1:2)),dy=(north-south)/(CELL*(iy===0||iy===N-1?1:2));
     // Light from NW; relief shading follows physical slopes in metres.
     const light=Math.max(.52,Math.min(1.18,.88+(-dx+dy)*.65/Math.sqrt(1+dx*dx+dy*dy)));
     color=color.map(c=>c*light);
     // Discrete isolines at real elevations, not periodic illumination bands.
     const interval=50;
     if(terrainLayer==='height'&&((ix>0&&Math.floor(HM[index]/interval)!==Math.floor(west/interval))||(iy>0&&Math.floor(HM[index]/interval)!==Math.floor(south/interval))))color=color.map(c=>c*.81);
     const depth=terrainDiagnostics?.waterDepth?.[index]??0;
     if(depth>.4)color=[142,184,198];
     else if((terrainDiagnostics?.accumulation?.[index]??0)>600)color=[73,131,156];
    }
    image.data[k]=color[0];image.data[k+1]=color[1];image.data[k+2]=color[2];
    image.data[k+3]=255;
  }
  ctx.putImageData(image,0,0);
  console.info('Terrain raster (ms)',Math.round(performance.now()-rasterStart));
}

// Fictional Moravican unit callsigns. Draw three distinct names per assignment.
const CALL_NAMES=["Sokol","Kovač","Vihor","Jastreb","Ris","Vuk","Medved","Orao","Gavran","Zubr","Jelen","Vepar","Sova","Lisica","Kuna","Vran","Breg","Kamen","Dub","Javor","Bor","Jasen","Hrast","Plamen","Iskra","Munja","Oluja","Zora","Sever","Perun"];
const CALL_COLORS=['#0a3fc4','#c2185b','#ff7900'];
function pickCrewNames(){
 const pool=CALL_NAMES.slice();
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 return pool.slice(0,CALL_COLORS.length);
}
// Three intelligence stations per mission; frequency allocations are classified until confirmed.
const pickFreqs=()=>window.SH95MissionSetup.pickFreqs();
// Conservative flat-ground reach for the longest-range charge under current weather.
// Use worst-case headwind; reserve margin for elevated targets and terrain.
function missionRangeLimit(){
 const drag=K*(missionConditions?.drag||1),wind=S?.ws||0,dt=.04;
 let maximum=0;
 for(let deg=28;deg<=46;deg+=2){
  const angle=deg*Math.PI/180;let vx=V0[4]*Math.cos(angle),vz=V0[4]*Math.sin(angle),x=0,z=1;
  for(let i=0;i<7000;i++){
   const rel=vx+wind,speed=Math.hypot(rel,vz);
   vx-=drag*speed*rel*dt;vz-= (G+drag*speed*vz)*dt;
   x+=vx*dt;z+=vz*dt;
   if(z<=0)break;
  }
  maximum=Math.max(maximum,x);
 }
 return Math.max(3000,Math.min(15000,maximum*.85));
}
function isDryTerrain(point){
 const water=terrainDiagnostics?.waterDepth;
 if(!water)return true;
 const x=Math.max(0,Math.min(N-1,Math.round((point.x-ORG.x)/CELL)));
 const y=Math.max(0,Math.min(N-1,Math.round((point.y-ORG.y)/CELL)));
 return water[y*N+x]<=.4;
}
function place(maxDistance){
  const valid=(g,t)=>t.x>=ORG.x+1200&&t.x<=ORG.x+WS-1200&&t.y>=ORG.y+1200&&t.y<=ORG.y+WS-1200&&
    g.x>=ORG.x+1200&&g.x<=ORG.x+WS-1200&&g.y>=ORG.y+1200&&g.y<=ORG.y+WS-1200&&
    isDryTerrain(g)&&isDryTerrain(t)&&Math.hypot(t.x-g.x,t.y-g.y)>=3000&&Math.hypot(t.x-g.x,t.y-g.y)<=maxDistance&&ground(g.x,g.y)>=30&&ground(t.x,t.y)>=30;
  let best=null,bestScore=-Infinity;
  for(let tries=0;tries<2500;tries++){
    const R=rnd(3000,maxDistance),b=rnd(0,2*Math.PI);
    const g={x:Math.round(ORG.x+rnd(2500,WS-2500)),y:Math.round(ORG.y+rnd(2500,WS-2500))};
    const t={x:Math.round(g.x+R*Math.sin(b)),y:Math.round(g.y+R*Math.cos(b))};
    const inside=t.x>=ORG.x+1200&&t.x<=ORG.x+WS-1200&&t.y>=ORG.y+1200&&t.y<=ORG.y+WS-1200;
    const gz=ground(g.x,g.y),tz=ground(t.x,t.y),score=Math.min(gz,tz)+(inside?1000:0);
    if(inside&&isDryTerrain(g)&&isDryTerrain(t)&&score>bestScore){bestScore=score;best={g,t,gz,tz}}
    if(valid(g,t)){g.z=Math.round(gz);t.z=Math.round(tz);return{g,t}}
  }
  // Extremely unusual terrain fallback: choose the best sampled in-bounds pair rather than
  // silently returning an invalid last attempt. Keep the app usable and make elevations explicit.
  if(best){best.g.z=Math.round(best.gz);best.t.z=Math.round(best.tz);return{g:best.g,t:best.t}}
  const g={x:ORG.x+WS/2,y:ORG.y+WS/2},t={x:g.x+3000,y:g.y};g.z=Math.round(ground(g.x,g.y));t.z=Math.round(ground(t.x,t.y));return{g,t}
}
let missionConditions=null,missionOver=false;
function conditionDetails(item,kind){
 const title=kind==='wind'?I18n.t('Wind Type'):I18n.t(kind==='time'?'Time of Day':'Weather');
 const label=I18n.t(item.name);
 if(kind==='wind')return {title,label,metrics:[I18n.t('Wind From')+': '+(S.ws?S.wd+'°':'—'),I18n.t('Wind Speed')+': '+S.ws+I18n.t(' m/s')]};
 return {title,label,metrics:[I18n.format('conditions.interference',{value:Math.round(item.noise*100)}),I18n.format('conditions.drag',{value:item.drag.toFixed(3)})]};
}
function renderMissionConditions(){
 const box=$('missionConditions');if(!box||!missionConditions)return;
 box.replaceChildren();
 const panel=document.createElement('section');panel.className='condition-panel';panel.id='conditionPanel';panel.hidden=true;panel.setAttribute('role','region');
 let active=null;
 const close=()=>{panel.hidden=true;active?.setAttribute('aria-expanded','false');active=null};
 const show=(button,item,kind)=>{
  if(active&&active!==button)active.setAttribute('aria-expanded','false');
  const info=conditionDetails(item,kind);active=button;button.setAttribute('aria-expanded','true');
  panel.replaceChildren();
  const bar=document.createElement('div');bar.className='condition-panel-title';bar.textContent='▣ '+I18n.t('conditions.header');
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='condition-panel-close';dismiss.textContent='×';dismiss.setAttribute('aria-label',I18n.t('conditions.close'));dismiss.onclick=()=>{close();button.focus()};bar.append(dismiss);
  const name=document.createElement('div');name.className='condition-panel-name';name.textContent=item.icon+' '+info.title+' / '+info.label;
  const metrics=document.createElement('div');metrics.className='condition-panel-metrics';
  for(const value of info.metrics){const row=document.createElement('div');row.textContent=value;metrics.append(row)}
  const foot=document.createElement('div');foot.className='condition-panel-foot';foot.textContent=I18n.t('conditions.note');
  panel.append(bar,name,metrics,foot);panel.hidden=false;
 };
 for(const [kind,item] of [['time',missionConditions.time],['weather',missionConditions.weather],['wind',missionConditions.wind]]){
  const button=document.createElement('button');button.type='button';button.className='mission-condition';
  button.textContent=item.icon+' '+I18n.t(item.name)+'  ▾';
  button.setAttribute('aria-controls','conditionPanel');button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-label',I18n.t(kind==='wind'?'Wind Type':kind==='time'?'Time of Day':'Weather')+': '+I18n.t(item.name));
  button.onclick=()=>active===button?close():show(button,item,kind);
  box.append(button);
 }
 box.append(panel);
 box.onkeydown=e=>{if(e.key==='Escape'&&!panel.hidden){close();e.preventDefault()}};
 box.onfocusout=e=>{if(!box.contains(e.relatedTarget))close()};
}
document.addEventListener('pointerdown',e=>{const box=$('missionConditions');if(box&&!box.contains(e.target)){const panel=$('conditionPanel');if(panel&&!panel.hidden){panel.hidden=true;box.querySelectorAll('.mission-condition').forEach(el=>el.setAttribute('aria-expanded','false'))}}});
// Weather is owned by the session-wide weather model, not the tactical map.
let windlessTask=false;
function renderWindReadout(){
 const speed=Number(S?.ws)||0,direction=Number(S?.wd)||0;
 const wind=$('s2');if(wind)wind.textContent=speed?I18n.format('mission.wind',{direction,speed}):I18n.t('Wind: Calm');
 const rose=$('windRose'),calm=$('windRoseCalm'),label=$('windRoseSpeed');
 if(rose)rose.setAttribute('aria-label',I18n.t('Wind From')+': '+(speed?direction+'°':'—')+', '+I18n.t('Wind Speed')+': '+speed+I18n.t(' m/s'));
 // Direction in the weather model is where wind COMES FROM; the sock points downwind.
 const sector=Math.round(((direction+180)%360)/45)%8;
 for(const sock of document.querySelectorAll('#windSockDial .wind-sock'))sock.classList.toggle('active',speed>0&&Number(sock.dataset.sector)===sector);
 if(calm)calm.hidden=!!speed;
 if(label)label.textContent=speed?speed+I18n.t(' m/s'):I18n.t('Calm Wind');
}
function applyWeather(next){
 missionConditions={time:next.time,weather:next.weather,wind:{name:({calm:'Calm Wind',continental:'Continental Wind',bora:'Bora',jugo:'Jugo'})[next.regime]||'Continental Wind',icon:({calm:'🍃',continental:'🌬️',bora:'❄️',jugo:'💨'})[next.regime]||'🌬️'},noise:next.noise,drag:next.drag};
 S={...S,ws:windlessTask?0:next.ws,wd:next.wd};
 Radio.setAtmosphere(next.noise);renderMissionConditions();
 renderWindReadout();
 if(HM&&terr)renderData();
}
function updateTimedConditions(date,newMission=false){
 const next=newMission?window.SH95Weather.newMission(date.getTime()):window.SH95Weather.advance(date.getTime());if(!next)return;
 if(!missionConditions||next.changed||next.windChanged||missionConditions.wind.name!==({calm:'Calm Wind',continental:'Continental Wind',bora:'Bora',jugo:'Jugo'})[next.regime]){const hadConditions=!!missionConditions;applyWeather(next);if(hadConditions&&next.changed)window.SH95Notifications?.notify(I18n.t(next.time.name)+' · '+I18n.t(next.weather.name),'WEATHER');}
 else {S={...S,ws:windlessTask?0:next.ws,wd:next.wd};renderWindReadout();}
}
window.GameClock?.subscribe(updateTimedConditions);
setInterval(()=>updateTimedConditions(window.GameClock?.now()||new Date()),1000);
function showDefeat(c){if(missionOver)return;missionOver=true;const el=$('defeat95');$('defeatText').textContent=I18n.format('mission.defeat',{crew:I18n.t(c.name),ammo:c.ammoMax});el.hidden=false;if(window.sh95Event)window.sh95Event(I18n.format('mission.defeatEvent',{crew:I18n.t(c.name)}))}
$('defeatRetry').onclick=()=>{newTask(false)};
const CREW_RELOAD_MS=9500,CREW_HEAT_PER_SHOT=19,CREW_COOL_PER_SEC=0.85;
const CREW_BASE_TEMP=32,CREW_MAX_TEMP=120,CREW_UNLOCK_TEMP=88;
function advanceCrewThermal(c,now=(window.GameClock?.nowMs()??performance.now())){
  if(!Number.isFinite(c.thermalAt)){c.thermalAt=now;return}
  const dt=Math.max(0,Math.min((now-c.thermalAt)/1000,60));
  c.temperature=Math.max(CREW_BASE_TEMP,c.temperature-CREW_COOL_PER_SEC*dt);
  c.thermalAt=now;
}
function crewState(c,now=(window.GameClock?.nowMs()??performance.now())){
  advanceCrewThermal(c,now);
  if(c.ammo<=0)return [I18n.t("AMMUNITION DEPLETED"),'empty'];
  if(c.temperature>=CREW_UNLOCK_TEMP)return [I18n.t("COOLING"),'hot'];
  if(now<c.reloadUntil)return [I18n.t("RELOADING"),'loading'];
  return [I18n.t("READY"),'ready'];
}
function renderCrewResources(){
  const box=document.getElementById('crewResourceRows');if(!box||!CR?.length)return;
  const now=(window.GameClock?.nowMs()??performance.now());
  box.innerHTML=CR.map(c=>{
    const [state,kind]=crewState(c,now),left=Math.max(0,(c.reloadUntil-now)/1000),progress=100*(1-Math.min(1,left/(CREW_RELOAD_MS/1000)));
    const temp=Math.round(c.temperature),heat=Math.max(0,Math.min(100,(temp-CREW_BASE_TEMP)/(CREW_MAX_TEMP-CREW_BASE_TEMP)*100));
    return `<div class="crew-resource ${kind==='hot'?'hot':kind==='empty'?'empty':''}"><div class="crew-resource-head"><span>${I18n.t('CREW')} ${c.k+1} «${I18n.t(c.name)}»</span><span>${state}</span></div><div class="crew-resource-meta">${I18n.t('AMMO')} ${c.ammo}/${c.ammoMax} · ${I18n.t('TEMP.')} ${temp} °C<br>${I18n.t('RELOADING')} ${left>0?left.toFixed(1)+I18n.t(' s'):I18n.t('READY')}</div><div class="crew-resource-track heat" title="${I18n.t('Barrel Temperature')}"><i style="width:${heat}%"></i></div><div class="crew-resource-track reload" title="${I18n.t('Reload Progress')}"><i style="width:${progress}%"></i></div></div>`;
  }).join('');
}
function renderData(){
  const row=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
  let h=CR.map(c=>`<tr><td colspan="2" style="text-align:left;color:${c.color};border-bottom:1px solid ${c.color}">${I18n.t('Crew')} ${c.k+1} «${I18n.t(c.name)}» ${c.hit?I18n.t('✔ target destroyed'):''}</td></tr>`+
    row(I18n.t("Frequency"),c.identified?c.f+I18n.t(" kHz"):I18n.t("NOT SET"))+row(I18n.t("Gun X / Y"),'X '+Math.round(c.g.x)+' / Y '+Math.round(c.g.y))+row(I18n.t("Gun Elevation"),c.g.z+I18n.t(" m"))+row(I18n.t("Target X / Y"),c.decodedTarget?('X '+c.decodedTarget.x+' / Y '+c.decodedTarget.y+(c.hit?I18n.t(" · DESTROYED"):'')):(c.hit?I18n.t("Confirmed"):I18n.t("HIDDEN — intercept Morse")))).join('');
  h+=`<tr><td colspan="2" style="text-align:left;border-bottom:1px solid #215dc6;color:#215dc6">${I18n.t("Weather Data")}</td></tr>`+row(I18n.t("Wind From"),S.ws?S.wd+'°':'—')+row(I18n.t("Wind Speed"),S.ws+I18n.t(" m/s"));
  $('data').innerHTML=h}
// Expose only coordinates that the decoder actually recovered from audio.
// Reset mission intelligence together with the gun crews.
window.sh95AcceptDecodedCoordinates=(crewNumber,x,y,recordTaskId)=>{
 if(!recordTaskId||recordTaskId!==window.sh95CurrentTaskId)return false;
 const c=CR[crewNumber-1];
 if(!c||!c.identified||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>99999||y>99999)return false;
 c.decodedTarget={x,y};
 renderData();
 if(window.sh95Event)window.sh95Event(I18n.format('mission.intercept',{crew:crewNumber}));
 return true;
};
async function newTask(noWind){
  const seedText=$('terrainSeed')?.value.trim()||'';
  const enteredSeed=Number(seedText);
  if(seedText&&(!Number.isInteger(enteredSeed)||enteredSeed<0||enteredSeed>4294967295)){
   alert('Terrain seed must be an integer from 0 to 4294967295');return;
  }
  const seed=seedText?enteredSeed:(Math.random()*0xFFFFFFFF)>>>0;
  const requestedRegion=$('terrainRegion')?.value||terrainRegion;
  const request=++terrainRequest;
  if(terrainWorker){terrainWorker.terminate();terrainWorker=null}
  cancelProjectiles();
  const newButton=$('newt'),noWindButton=$('nowind');
  newButton.disabled=true;noWindButton.disabled=true;
  terrainGenerating=true;draw();
  let generated;
  try{
   generated=await terrainGenerate(seed,requestedRegion);
  }catch(error){
   if(request===terrainRequest){terrainGenerating=false;draw();newButton.disabled=false;noWindButton.disabled=false;console.error('Terrain generation failed:',error);alert('Terrain generation failed: '+error.message)}
   return;
  }
  if(request!==terrainRequest)return;
  newButton.disabled=false;noWindButton.disabled=false;
  missionOver=false;$('defeat95').hidden=true;windlessTask=!!noWind;
  updateTimedConditions(window.GameClock?.now()||new Date(),true);S={...S,...(noWind?{ws:0}:{})};
  window.sh95CurrentTaskId='task-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  ORG={x:Math.round(rnd(10,50))*1000,y:Math.round(rnd(10,50))*1000};
  terrainRegion=requestedRegion;
  HM=generated.heightMap;terrainDiagnostics=generated;
  console.info('Terrain generation timing (ms)',JSON.stringify(generated.timings));
  window.sh95TerrainSummary={seed,region:terrainRegion,timings:generated.timings,sedimentBudget:generated.sedimentBudget};
  if($('terrainInfo'))$('terrainInfo').textContent='Seed '+seed+' · 40 × 40 km · 512²';
  const fr=pickFreqs(),maxDistance=missionRangeLimit();
  CR=pickCrewNames().map((name,k)=>({k,name,color:CALL_COLORS[k],f:fr[k],identified:false,decodedTarget:null,...place(maxDistance),shots:[],trajs:[],hit:false,ammo:12,ammoMax:12,reloadUntil:0,temperature:32,thermalAt:(window.GameClock?.nowMs()??performance.now())}));
  renderCrewResources();
  window.sh95CrewData=()=>CR;
  Radio.setCrews(CR.map(c=>({f:c.f,label:I18n.format('mission.recon',{number:c.k+1,crew:I18n.t(c.name)}),az:Math.round((Math.atan2(c.t.x-c.g.x,c.t.y-c.g.y)*180/Math.PI+360)%360),x:Math.round(c.t.x),y:Math.round(c.t.y)})));
  last=null;lkKey='';$('res').innerHTML='';updateBearingPanel();annotations.length=0;selectedAnnotation=null;if($('coordX')){$('coordX').value='';$('coordY').value='';$('coordState').textContent=I18n.t("NOT SELECTED")}showTargets.checked=false;
  renderWindReadout();
  $('log').innerHTML='<tr>'+['Shot','Crew','Azimuth','Elevation','Charge','Time, s','Deviation, m'].map(label=>'<th>'+I18n.t(label)+'</th>').join('')+'</tr>';
  renderData();renderTerrain();fitView();terrainGenerating=false;updateLink();draw();if(window.sh95Event)window.sh95Event(I18n.format('mission.created',{crews:CR.length,weather:S.ws?I18n.t('wind ')+S.ws+I18n.t(' m/s'):I18n.t('calm')}));if(window.sh95Brief)window.sh95Brief()}

function simulate(az,el,v0,c){
  return window.SH95Ballistics.simulate(az,el,v0,c,{weather:S,ground,dragMultiplier:missionConditions?.drag||1});
}

function say(t,cls=''){$('res').innerHTML=`<div class="m ${cls}">${t}</div>`}
let lkKey='';
function updateLink(){
  const raw=Radio.link(),k=raw>=0&&CR[raw]?.identified?raw:-1,q=k<0?0:Radio.quality(k),key=k+':'+Math.round(q*100);if(key===lkKey)return;lkKey=key;const el=$('link');
  if(k<0){el.className='link off';el.textContent=I18n.t("Channel not confirmed. Find the signal and transmit a bearing.");return}
  const p=Math.round(q*100),w=p>=80?I18n.t("excellent"):p>=65?I18n.t("good"):p>=45?I18n.t("weak"):I18n.t("very poor"),col=p>=65?'#2e8420':p>=45?'#c78a00':'#b3392b';
  el.className='link on';
  el.innerHTML=`<span style="color:${CR[k].color}">●</span> ${I18n.t('Connected: crew')} ${k+1} «${I18n.t(CR[k].name)}», ${CR[k].f}${I18n.t(' kHz')}<br>${I18n.t('Intelligibility:')} ${p}% (${I18n.t(w)})<div class="qb"><i style="width:${p}%;background:${col}"></i></div>`}
function updateBearingPanel(){
 const count=CR.filter(c=>c.identified).length;
 $('bearingCount').textContent=count+' / 3';
 $('bearingList').innerHTML=CR.map(c=>`<div><span>${I18n.t('CHANNEL')} ${c.k+1} / ${I18n.t(c.name)}</span><b>${c.identified?c.f.toFixed(0)+I18n.t(' kHz')+' · '+I18n.t('CONFIRMED'):'— · '+I18n.t('NOT SET')}</b></div>`).join('');
 if(window.sh95Brief)window.sh95Brief();
}
$('sendBearing').onclick=()=>{
 const k=Radio.link();
 if(k<0){$('bearingStatus').textContent=I18n.t("✕ Signal not identified");if(window.sh95Event)window.sh95Event(I18n.t('mission.bearingRejected'));return}
 const c=CR[k];
 if(c.identified){$('bearingStatus').textContent=I18n.t("✓ Channel already identified");return}
 c.identified=true;
 $('bearingStatus').textContent='✓ '+I18n.t(c.name)+' / '+c.f+I18n.t(" kHz");
 updateBearingPanel();renderData();lkKey='';updateLink();
 if(window.sh95Event)window.sh95Event(I18n.format('mission.bearingConfirmed',{crew:I18n.t(c.name),frequency:c.f}));
};
const clamp=(a,lo,hi)=>Math.min(hi,Math.max(lo,a));
function garble(s){
  const idx=[...s].map((ch,i)=>/\d/.test(ch)?i:-1).filter(i=>i>=0);if(!idx.length)return s;
  const i=idx[Math.floor(Math.random()*idx.length)];let d;do{d=String(Math.floor(Math.random()*10))}while(d===s[i]);
  return s.slice(0,i)+d+s.slice(i+1)}
const gauss=()=>Math.sqrt(-2*Math.log(1-Math.random()))*Math.cos(2*Math.PI*Math.random());
const inFlight=new Map();let flightSerial=0,profileFlight=null,flightAnimation=0;
function cancelProjectiles(){for(const shot of inFlight.values())clearTimeout(shot.timer);inFlight.clear();profileFlight=null;cancelAnimationFrame(flightAnimation);flightAnimation=0;window.GameClock?.lock('projectile in flight',false)}
function animateFlights(){if(!inFlight.size){flightAnimation=0;return}drawProfile();flightAnimation=requestAnimationFrame(animateFlights)}
function beginProjectile(shot){
 inFlight.set(shot.id,shot);profileFlight=shot;
 window.GameClock?.lock('projectile in flight',true);
 if(!flightAnimation)flightAnimation=requestAnimationFrame(animateFlights);
 shot.timer=setTimeout(()=>{if(!inFlight.has(shot.id))return;inFlight.delete(shot.id);shot.arrive(shot===profileFlight);if(!inFlight.size)window.GameClock?.lock('projectile in flight',false);draw()},Math.max(1,shot.duration*1000));
}
function fire(){
  if(missionOver)return;
  const feedback=(received,reason='')=>window.dispatchEvent(new CustomEvent('sh95:order-result',{detail:{received,reason}}));
  const reject=(message)=>{say(message);feedback(false,message)};
  const k=Radio.link();
  if(k<0||!CR[k]?.identified){reject(I18n.t("Channel not confirmed. Find the frequency and transmit a bearing."));return}
  const c=CR[k];
  if(c.hit){reject(I18n.format('mission.alreadyHit',{crew:I18n.t(c.name)}));return}
  const [readiness,readinessKind]=crewState(c);
  if(readinessKind!=='ready'){reject(I18n.format('mission.notReady',{crew:I18n.t(c.name),status:readiness.toLowerCase(),reason:readinessKind==='loading'?I18n.format('mission.remaining',{seconds:Math.ceil((c.reloadUntil-(window.GameClock?.nowMs()??performance.now()))/1000)}):readinessKind==='hot'?I18n.format('mission.temperature',{temp:Math.round(c.temperature)}):I18n.t('mission.noAmmo')}));renderCrewResources();return}
  const mil=$('unit').value=='mil',sa=$('az').value.trim(),se=$('el').value.trim(),ch=+$('ch').value,a=parseFloat(sa),e0=parseFloat(se);
  if(!Number.isFinite(a)||!Number.isFinite(e0)){reject(I18n.t("Enter valid numeric azimuth and elevation values."));return}
  if(!Number.isInteger(ch)||ch<1||ch>V0.length){reject(I18n.t("Select charge 1 through 5."));return}
  const ku=mil?Math.PI/3200:Math.PI/180;
  if(e0*ku<=0||e0*ku>=1.55){reject(I18n.t("Elevation is out of range (0…90°)."));return}
  // --- Distortion caused by poor reception
  const q=Radio.quality(k),er=clamp((0.8-q)/0.5,0,1),pm=er*0.4,unit=mil?17.78:1;
  let ra=a,re=e0,rc=ch;
  if(er>0){
    if(Math.random()<pm)ra=parseFloat(garble(sa))||0;
    if(Math.random()<pm)re=parseFloat(garble(se))||0;
    if(Math.random()<pm*.6)rc=clamp(ch+(Math.random()<.5?-1:1),1,V0.length);
    ra=+(ra+gauss()*er*.15*unit).toFixed(2);re=+(re+gauss()*er*.1*unit).toFixed(2)}
  if(re*ku<=0||re*ku>=1.55){reject(I18n.format('mission.badTransmission',{crew:I18n.t(c.name)}));return}
  const r=simulate(ra*ku,re*ku,V0[rc-1],c);
  if(!r){reject(I18n.t("Projectile did not return to ground."));return}
  const b=Math.atan2(c.t.x-c.g.x,c.t.y-c.g.y),dx=r.x-c.t.x,dy=r.y-c.t.y,al=dx*Math.sin(b)+dy*Math.cos(b),rg=dx*Math.cos(b)-dy*Math.sin(b),d=Math.hypot(dx,dy),hit=d<=R_HIT;

  c.ammo--;c.temperature=Math.min(CREW_MAX_TEMP,c.temperature+CREW_HEAT_PER_SHOT);c.reloadUntil=(window.GameClock?.nowMs()??performance.now())+CREW_RELOAD_MS;
  feedback(true);
  c.trajs.push(r.pts);last=k;
  const all=CR.every(q2=>q2.hit),bad=x=>`<b style="color:#b3392b">${x}</b>`,df=(s,r2)=>Math.abs(s-r2)<.005?r2:bad(r2),lg=(s,r2)=>Math.abs(s-r2)<.005?s:`${s} → ${bad(r2)}`;
  const correctionLong=Math.abs(al)<1?'':(al>0?I18n.t('overshoot '):I18n.t('short '))+Math.abs(al).toFixed(0)+I18n.t(' m');
  const correctionSide=Math.abs(rg)<1?'':', '+(rg>0?I18n.t('right '):I18n.t('left '))+Math.abs(rg).toFixed(0)+I18n.t(' m');
  const shotNumber=c.trajs.length;
  const report=()=>{
    say(I18n.format('mission.fireReport',{crew:I18n.t(c.name),azimuth:df(a,ra),elevation:df(e0,re),charge:df(ch,rc),hit:hit?I18n.t('mission.targetHit'):'',correction:correctionLong+correctionSide,distance:d.toFixed(0),time:r.t.toFixed(1),complete:CR.every(q2=>q2.hit)?I18n.t('mission.allComplete'):''}),hit?'hit':'');
    $('log').insertAdjacentHTML('beforeend',`<tr><td>${k+1}.${shotNumber}</td><td style="color:${c.color}">«${I18n.t(c.name)}»</td><td>${lg(a,ra)}</td><td>${lg(e0,re)}</td><td>${lg(ch,rc)}</td><td>${r.t.toFixed(1)}</td><td>${d.toFixed(0)}</td></tr>`);
    $('s1').textContent=CR.every(q2=>q2.hit)?I18n.t("All targets destroyed!"):I18n.format('mission.deviation',{crew:I18n.t(c.name),distance:d.toFixed(0)});
  };
  const shot={id:++flightSerial,crew:c,trajectory:r.pts,start:performance.now(),duration:r.t,arrive(isLatest){
    c.shots.push({x:r.x,y:r.y});if(hit)c.hit=true;
    if(isLatest){report();if(window.sh95Event)window.sh95Event(I18n.format('mission.shotEvent',{crew:k+1,shot:shotNumber,result:hit?I18n.t('HIT'):I18n.format('mission.burst',{distance:Math.round(d)})}));}
    renderData();renderCrewResources();if(window.sh95Brief)window.sh95Brief();
    if(!hit&&c.ammo===0&&!inFlight.size)showDefeat(c);
  }};
  beginProjectile(shot);
  say(I18n.t('TRAJECTORY')+' · '+r.t.toFixed(1)+' '+I18n.t(' s'));
  renderCrewResources();draw();
}

/* ---- map ---- */
function fitView(){const xs=CR.flatMap(c=>[c.g.x,c.t.x]),ys=CR.flatMap(c=>[c.g.y,c.t.y]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  v.cx=(x0+x1)/2;v.cy=(y0+y1)/2;v.m=Math.max((x1-x0)/(W*.8),(y1-y0)/(H*.8),6)}
function halo(x,s,px,py){x.lineWidth=3;x.strokeStyle='rgba(255,255,255,.85)';x.strokeText(s,px,py);x.fillText(s,px,py)}
function marker(x,wx,wy,sym,col,label){
  const px=X(wx),py=Y(wy);if(px<-45||py<-45||px>W+45||py>H+45)return;
  // Military map symbol: rectangular label with the crew index.
  const id=(String(label).match(/\d+/)||[''])[0]||label.slice(0,2);
  x.save();x.lineWidth=1.5;x.fillStyle='#0a2419';x.strokeStyle='#000000';
  x.fillRect(px-15,py-13,30,26);x.strokeRect(px-15.5,py-13.5,31,27);
  x.strokeStyle=col;x.lineWidth=2.5;x.strokeRect(px-13.5,py-11.5,27,23);
  x.beginPath();x.moveTo(px-9,py+7);x.lineTo(px+9,py+7);x.moveTo(px,py-16);x.lineTo(px,py-12);x.stroke();
  x.fillStyle='#ffffff';x.font='bold 12px Courier New,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(id,px,py-2);
  const short=label.startsWith('T')?I18n.t('TARGET')+' '+id:I18n.t('CREW')+' '+id;
  x.font='bold 10px Courier New,monospace';const tw=x.measureText(short).width+10;
  x.fillStyle='#0b1714';x.fillRect(px-tw/2,py+15,tw,15);x.strokeStyle='#000000';x.strokeRect(px-tw/2+.5,py+15.5,tw-1,14);
  x.fillStyle='#ffffff';x.textBaseline='top';x.fillText(short,px,py+17);x.restore();}

window.sh95RedrawMap=()=>draw();
function draw(){
  const x=mapC.getContext('2d');
  if(terrainGenerating){
    x.clearRect(0,0,W,H);x.fillStyle='#071b15';x.fillRect(0,0,W,H);
    x.fillStyle='#b9c8a9';x.font='bold 16px Courier New';x.textAlign='center';
    x.fillText('GENERATING TERRAIN...',W/2,H/2);
    x.font='12px Courier New';x.fillText('PLEASE WAIT',W/2,H/2+24);x.textAlign='left';return;
  }x.clearRect(0,0,W,H);x.fillStyle='#071b15';x.fillRect(0,0,W,H);
  x.imageSmoothingEnabled=true;x.save();x.filter=window.sh95GreenMap?'grayscale(1) sepia(.8) hue-rotate(70deg) saturate(1.5) brightness(.64) contrast(1.2)':'none';x.drawImage(terr,X(ORG.x),Y(ORG.y+WS),WS/v.m,WS/v.m);x.restore();
  const steps=[100,200,500,1000,2000,5000],st=steps.find(s=>s/v.m>=80)||5000;
  x.lineWidth=1;x.strokeStyle='rgba(95,209,130,.27)';x.font='bold 11px Courier New,monospace';x.textBaseline='alphabetic';
  // Render coordinates in separate opaque labels without white outlines.
  function gridLabel(txt,px,py){const str=String(txt),width=x.measureText(str).width+8;
    x.fillStyle='#06190f';x.fillRect(px,py-11,width,15);x.strokeStyle='#4a865a';x.strokeRect(px+.5,py-10.5,width-1,14);
    x.fillStyle='#e0f6d9';x.fillText(str,px+4,py);x.strokeStyle='rgba(95,209,130,.27)';}
  for(let gx=Math.ceil((v.cx-W/2*v.m)/st)*st;gx<v.cx+W/2*v.m;gx+=st){const px=Math.round(X(gx))+.5;x.beginPath();x.moveTo(px,0);x.lineTo(px,H);x.stroke();if(px>5&&px<W-55)gridLabel(gx,px+3,H-8)}
  for(let gy=Math.ceil((v.cy-H/2*v.m)/st)*st;gy<v.cy+H/2*v.m;gy+=st){const py=Math.round(Y(gy))+.5;x.beginPath();x.moveTo(0,py);x.lineTo(W,py);x.stroke();if(py>32&&py<H-15)gridLabel(gy,5,py-3)}
  CR.forEach(c=>{
    if(showTargets.checked){x.strokeStyle='rgba(180,30,30,.85)';x.lineWidth=1.5;x.beginPath();x.arc(X(c.t.x),Y(c.t.y),Math.max(R_HIT/v.m,3),0,7);x.stroke()}
    const tr=c.trajs[c.trajs.length-1];
    if(tr){x.setLineDash([5,4]);x.strokeStyle=c.color;x.lineWidth=1.5;x.beginPath();tr.forEach((p,i)=>{const px=X(c.g.x+p[0]),py=Y(c.g.y+p[1]);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.setLineDash([])}
    c.shots.forEach((s,i)=>{const px=X(s.x),py=Y(s.y);x.font='bold 20px Tahoma';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#d62000';halo(x,'✹',px,py);x.font='bold 11px Tahoma';x.fillStyle=c.color;x.textBaseline='bottom';halo(x,(c.k+1)+'.'+(i+1),px+14,py-6);x.textAlign='start'})});
  CR.forEach(c=>{marker(x,c.g.x,c.g.y,'◉',c.color,I18n.t(c.name).toUpperCase());(showTargets.checked||c.hit?marker(x,c.t.x,c.t.y,c.hit?'✔':'✖',c.hit?'#2e8420':c.color,'T'+(c.k+1)):null)});
  // Scale and provisional flat-map status.
  x.fillStyle='rgba(248,246,225,.95)';x.fillRect(W-166,H-45,158,38);
  x.strokeStyle='#777465';x.strokeRect(W-166.5,H-45.5,159,39);
  x.fillStyle='#34362f';x.font='bold 11px Courier New';x.textAlign='left';
  x.fillText('40 km × 40 km',W-159,H-29);
  x.font='10px Courier New';x.fillText('GEOLOGY / WATER',W-159,H-15);
  x.fillStyle='#06190f';x.fillRect(4,3,340,18);x.fillStyle='#d7f1d7';x.font='bold 11px Courier New';x.textBaseline='alphabetic';x.fillText(I18n.format('map.grid',{size:st}),9,16);x.strokeStyle='#4fa86e';x.strokeRect(.5,.5,W-1,H-1);
  drawAnnotations(x);drawProfile()}
function drawProfile(){
  const cv=$('prof'),state=$('profileState');
  if(!cv||!state)return;
  const ctx=cv.getContext('2d');if(!ctx)return;
  const w=cv.width,h=cv.height;
  const left=65,right=22,top=30,bottom=36,pw=w-left-right,ph=h-top-bottom;
  ctx.save();
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#06160f';ctx.fillRect(0,0,w,h);
  const frame=()=>{
    ctx.strokeStyle='#204a35';ctx.lineWidth=1;
    for(let i=0;i<=8;i++){const x=left+pw*i/8;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+ph);ctx.stroke()}
    for(let i=0;i<=4;i++){const y=top+ph*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+pw,y);ctx.stroke()}
    ctx.strokeStyle='#79aa8b';ctx.strokeRect(left+.5,top+.5,pw,ph);
  };
  frame();
  if(last==null||!CR[last]){
    state.textContent=I18n.t("AWAITING SHOT");ctx.fillStyle='#9dc8a9';ctx.font='bold 16px Courier New';ctx.textAlign='center';
    ctx.fillText(I18n.t("AWAITING TRAJECTORY DATA"),left+pw/2,top+ph/2);ctx.restore();return;
  }
  const c=profileFlight?.crew||CR[last],tr=profileFlight?.trajectory||c.trajs?.[c.trajs.length-1];
  if(!Array.isArray(tr)||tr.length<2){state.textContent=I18n.t("TRAJECTORY UNAVAILABLE");ctx.restore();return}
  // Align the cross-section with the actual shot, not the target.
  // Otherwise, a shot in the opposite direction would move the entire trajectory
  // left of the plot, where the clipping region would hide it.
  const end=tr[tr.length-1];
  const shotLen=Math.hypot(end[0],end[1]);
  const firstMove=tr.find(p=>Math.hypot(p[0],p[1])>1);
  const heading=shotLen>1?end:firstMove;
  if(!heading){state.textContent=I18n.t("INSUFFICIENT DATA");ctx.restore();return}
  const headingLen=Math.hypot(heading[0],heading[1]);
  const ux=heading[0]/headingLen,uy=heading[1]/headingLen;
  const along=p=>p[0]*ux+p[1]*uy;
  const targetDx=c.t.x-c.g.x,targetDy=c.t.y-c.g.y;
  const targetAlong=targetDx*ux+targetDy*uy;
  const targetSide=Math.abs(targetDx*uy-targetDy*ux);
  const dist=Math.hypot(targetDx,targetDy);
  let furthest=0,zmin=Infinity,zmax=-Infinity;
  for(const p of tr){if(!p||p.length<3||!p.every(Number.isFinite))continue;
    furthest=Math.max(furthest,Math.max(0,along(p)));
    zmin=Math.min(zmin,p[2]);zmax=Math.max(zmax,p[2]);
  }
  if(!Number.isFinite(zmin)||!Number.isFinite(zmax)){state.textContent=I18n.t("INVALID DATA");ctx.restore();return}
  const D=Math.max(100,furthest*1.08),terrain=[];
  for(let i=0;i<=240;i++){
    const d=i*D/240,z=ground(c.g.x+ux*d,c.g.y+uy*d);
    if(!Number.isFinite(z)){state.textContent=I18n.t("TERRAIN ERROR");ctx.restore();return}
    terrain.push(z);zmin=Math.min(zmin,z);zmax=Math.max(zmax,z);
  }
  zmin=Math.min(zmin,c.g.z,c.t.z);zmax=Math.max(zmax,c.g.z,c.t.z);
  const pad=Math.max(20,(zmax-zmin)*.07);zmin=Math.max(0,zmin-pad);zmax+=pad;
  if(zmax-zmin<1)zmax=zmin+1;
  const sx=d=>left+d/D*pw,sy=z=>top+ph-(z-zmin)/(zmax-zmin)*ph;
  ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();
  ctx.beginPath();ctx.moveTo(left,top+ph);
  terrain.forEach((z,i)=>ctx.lineTo(sx(i*D/240),sy(z)));
  ctx.lineTo(left+pw,top+ph);ctx.closePath();ctx.fillStyle='#17402c';ctx.fill();
  ctx.beginPath();terrain.forEach((z,i)=>i?ctx.lineTo(sx(i*D/240),sy(z)):ctx.moveTo(sx(0),sy(z)));
  ctx.strokeStyle='#68d693';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();let hasPoint=false;
  const fraction=profileFlight&&inFlight.has(profileFlight.id)?Math.min(1,(performance.now()-profileFlight.start)/(profileFlight.duration*1000)):1;
  const visible=Math.max(1,Math.floor((tr.length-1)*fraction));
  for(let i=0;i<=visible;i++){
    const p=tr[i];if(!p||p.length<3||!p.every(Number.isFinite))continue;
    const x=sx(along(p)),y=sy(p[2]);if(!hasPoint){ctx.moveTo(x,y);hasPoint=true}else ctx.lineTo(x,y);
  }
  ctx.strokeStyle='#ffd47c';ctx.lineWidth=2.5;ctx.stroke();
  const tx=sx(targetAlong),ty=sy(c.t.z);
  if(targetAlong>=0&&targetAlong<=D){
    ctx.strokeStyle='#ff897f';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(tx-8,ty);ctx.lineTo(tx+8,ty);ctx.moveTo(tx,ty-8);ctx.lineTo(tx,ty+8);ctx.stroke();
  }
  ctx.fillStyle='#b2fbc6';ctx.beginPath();ctx.arc(sx(0),sy(c.g.z),4,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.fillStyle='#a9d9b8';ctx.font='12px Courier New';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const z=zmax-(zmax-zmin)*i/4;ctx.fillText(Math.round(z),left-8,top+ph*i/4+4)}
  ctx.textAlign='center';for(let i=0;i<=8;i++)ctx.fillText(Math.round(D*i/8),left+pw*i/8,top+ph+19);
  ctx.textAlign='left';ctx.font='bold 12px Courier New';ctx.fillStyle='#70d396';ctx.fillText(I18n.t("TERRAIN"),left+9,top+15);
  ctx.fillStyle='#ffda83';ctx.fillText(I18n.t("TRAJECTORY"),left+105,top+15);
  ctx.fillStyle='#ff9286';ctx.fillText(I18n.t("TARGET"),left+240,top+15);
  state.textContent=I18n.format('profile.status',{crew:c.k+1,height:Math.round(zmax-pad),offset:Math.round(targetSide)});
  ctx.restore();
}
/* ---- interaction ---- */
function zoom(f,px=W/2,py=H/2){const wx=v.cx+(px-W/2)*v.m,wy=v.cy-(py-H/2)*v.m;v.m=Math.min(60,Math.max(1.5,v.m*f));v.cx=wx-(px-W/2)*v.m;v.cy=wy+(py-H/2)*v.m;draw()}
const pos=e=>{const r=mapC.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]};
const showTargets=$('showTargets');showTargets.addEventListener('change',draw);
const annotations=[];let mapGesture=null,hover=null,selectedAnnotation=null;
const toWorld=(px,py)=>({x:v.cx+(px-W/2)*v.m,y:v.cy-(py-H/2)*v.m});
function lineMetrics(a,b){const dx=b.x-a.x,dy=b.y-a.y;return{distance:Math.hypot(dx,dy),azimuth:(Math.atan2(dx,dy)*180/Math.PI+360)%360}}
function lineLabel(ctx,a,b){const m=lineMetrics(a,b),text=Math.round(m.distance)+I18n.t(' m · ')+m.azimuth.toFixed(1)+'°';const mx=(X(a.x)+X(b.x))/2,my=(Y(a.y)+Y(b.y))/2;ctx.font='bold 12px Courier New,monospace';const width=ctx.measureText(text).width+12;const x=Math.max(3,Math.min(W-width-3,mx-width/2)),y=Math.max(17,Math.min(H-4,my-9));ctx.fillStyle='#071b15';ctx.fillRect(x,y-14,width,18);ctx.strokeStyle='#eaff00';ctx.lineWidth=1;ctx.strokeRect(x+.5,y-13.5,width-1,17);ctx.fillStyle='#eaff00';ctx.fillText(text,x+6,y-1)}
function drawAnnotations(ctx){
 ctx.save();ctx.lineWidth=2;
 for(const a of annotations){const x=X(a.a.x),y=Y(a.a.y);
  if(a.b){ctx.strokeStyle='#eaff00';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X(a.b.x),Y(a.b.y));ctx.stroke();lineLabel(ctx,a.a,a.b);}
  else{ctx.strokeStyle=a===selectedAnnotation?'#ff6565':'#ffec00';ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();ctx.font='11px monospace';ctx.fillStyle='#101010';ctx.fillText(`${Math.round(a.a.x)},${Math.round(a.a.y)}`,x+9,y-8)}
 }
 if(mapGesture?.kind==='line'&&mapGesture.end){ctx.strokeStyle='#ffff00';ctx.setLineDash([5,3]);ctx.beginPath();ctx.moveTo(X(mapGesture.start.x),Y(mapGesture.start.y));ctx.lineTo(X(mapGesture.end.x),Y(mapGesture.end.y));ctx.stroke();ctx.setLineDash([]);lineLabel(ctx,mapGesture.start,mapGesture.end)}
 if(hover){const [px,py]=hover;ctx.strokeStyle='#ffff00';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px-18,py);ctx.lineTo(px+18,py);ctx.moveTo(px,py-18);ctx.lineTo(px,py+18);ctx.stroke();ctx.setLineDash([])}
 ctx.restore()
}
function nearestAnnotation(px,py,radius=17){
 let closest=null,best=radius;
 for(let i=annotations.length-1;i>=0;i--){
  const a=annotations[i],ax=X(a.a.x),ay=Y(a.a.y);
  let d=Math.hypot(px-ax,py-ay);
  if(a.b){
   const bx=X(a.b.x),by=Y(a.b.y),dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
   const t=den>0?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/den)):0;
   d=Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
  }
  if(d<best){best=d;closest=a}
 }
 return closest
}
function selectPoint(a){selectedAnnotation=a;const pt=a?.a;$('coordState').textContent=a?I18n.t("SELECTED"):I18n.t("NOT SELECTED");$('coordX').value=pt?Math.round(pt.x):'';$('coordY').value=pt?Math.round(pt.y):'';$('coordMessage').textContent=a?I18n.t("Edit X/Y and select Apply. Erase removes the marker."):I18n.t("Left-click a marker to edit its coordinates.");draw()}
function eraseAt(px,py){const a=nearestAnnotation(px,py,22);if(!a)return false;annotations.splice(annotations.indexOf(a),1);if(selectedAnnotation===a)selectPoint(null);draw();return true}
mapC.addEventListener('contextmenu',e=>{e.preventDefault()});
$('coordApply').onclick=()=>{if(!selectedAnnotation)return;const x=Number($('coordX').value),y=Number($('coordY').value);if(!Number.isFinite(x)||!Number.isFinite(y)||$('coordX').value===''||$('coordY').value===''){$('coordMessage').textContent=I18n.t("Error: enter numeric X and Y.");return}selectedAnnotation.a={x,y};$('coordMessage').textContent=I18n.t("Coordinates updated.");draw()};
$('coordDelete').onclick=()=>{if(!selectedAnnotation)return;annotations.splice(annotations.indexOf(selectedAnnotation),1);selectPoint(null)};
mapC.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault()});
let activeMapTool='point';
function chooseMapTool(tool){activeMapTool=tool;for(const [id,name] of [['toolPoint','point'],['toolLine','line']]){const b=$(id);b.classList.toggle('active',tool===name);b.setAttribute('aria-pressed',String(tool===name))}mapC.style.cursor=tool==='line'?'crosshair':'cell'}
$('toolPoint').onclick=()=>chooseMapTool('point');
$('toolLine').onclick=()=>chooseMapTool('line');
mapC.addEventListener('pointerdown',e=>{
 if(![0,1,2].includes(e.button))return;
 e.preventDefault();const [px,py]=pos(e);mapC.setPointerCapture(e.pointerId);
 if(e.button===2){eraseAt(px,py);mapGesture={kind:'erase',id:e.pointerId};}
 else if(e.button===1){mapGesture={kind:'pan',id:e.pointerId,p:[px,py],cx:v.cx,cy:v.cy}}
 else if(activeMapTool==='point'){
  const near=nearestAnnotation(px,py);
  if(near&&!near.b)selectPoint(near);
  else{const a={a:toWorld(px,py)};annotations.push(a);selectPoint(a)}
  mapGesture={kind:'point',id:e.pointerId};
 }else mapGesture={kind:'line',id:e.pointerId,start:toWorld(px,py),end:toWorld(px,py),p:[px,py]};
 draw();
});
mapC.addEventListener('pointermove',e=>{
 const [px,py]=pos(e);hover=[px,py];const w=toWorld(px,py);
 $('s1').textContent=I18n.format('map.cursor',{x:Math.round(w.x),y:Math.round(w.y),height:Math.round(ground(w.x,w.y))});
 $('mapread').textContent=`X ${Math.round(w.x)} · Y ${Math.round(w.y)} | px ${Math.round(px)},${Math.round(py)}`;
 if(mapGesture&&mapGesture.id===e.pointerId){if(mapGesture.kind==='erase')eraseAt(px,py);else if(mapGesture.kind==='pan'){v.cx=mapGesture.cx-(px-mapGesture.p[0])*v.m;v.cy=mapGesture.cy+(py-mapGesture.p[1])*v.m}else if(mapGesture.kind==='line')mapGesture.end=w}
 draw();
});
function finishGesture(e,cancel=false){if(!mapGesture||mapGesture.id!==e.pointerId)return;
 const g=mapGesture;mapGesture=null;
 if(!cancel&&g.kind==='line'){
  const [px,py]=pos(e),end=toWorld(px,py),dist=Math.hypot(px-g.p[0],py-g.p[1]);
  if(dist>=4){annotations.push({a:g.start,b:end});if(annotations.length>250)annotations.shift()}
 }
 draw();
}
mapC.addEventListener('pointerup',e=>finishGesture(e));
mapC.addEventListener('pointercancel',e=>finishGesture(e,true));
mapC.addEventListener('pointerleave',()=>{hover=null;draw()});
$('clearMarks').onclick=()=>{annotations.length=0;selectPoint(null);draw()};
$('undoMark').onclick=()=>{const a=annotations.pop();if(a===selectedAnnotation)selectPoint(null);draw()};
mapC.addEventListener('wheel',e=>{e.preventDefault();const[px,py]=pos(e);zoom(e.deltaY<0?.8:1.25,px,py)},{passive:false});
$('fire').onclick=fire;$('newt').onclick=()=>newTask(false);$('nowind').onclick=()=>newTask(true);
$('zin').onclick=()=>zoom(.7);$('zout').onclick=()=>zoom(1.4);
$('unit').onchange=()=>{$('az').value='';$('el').value=''};

// The desktop clock is maintained by GameClock.
setInterval(updateLink,150);
setInterval(renderCrewResources,250);
window.addEventListener('shtab:languagechange',()=>{if(!CR?.length)return;Radio.setCrewLabels?.(CR.map(c=>I18n.format('mission.recon',{number:c.k+1,crew:I18n.t(c.name)})));lkKey='';renderData();renderCrewResources();updateLink();updateBearingPanel();draw();drawProfile();renderWindReadout();renderMissionConditions()});
newTask(false);
