const WS=24000,N=192,CELL=WS/(N-1),G=9.81,K=8e-5,V0=[250,350,450,550],R_HIT=15;
let S,HM,ORG,terr,CR=[],last=null,v={cx:0,cy:0,m:30};
const $=id=>document.getElementById(id),rnd=(a,b)=>a+Math.random()*(b-a);
const mapC=$('map'),W=mapC.width,H=mapC.height;
const X=wx=>W/2+(wx-v.cx)/v.m,Y=wy=>H/2-(wy-v.cy)/v.m;
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function genTerrain(seed){
  const r=mulberry(seed),hm=new Float32Array(N*N),oct=[];let tot=0;
  for(let o=0;o<5;o++){const f=3*2**o,amp=.55**o,L=new Float32Array((f+1)*(f+1));tot+=amp;for(let i=0;i<L.length;i++)L[i]=r();oct.push({f,amp,L})}
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    let n=0;
    for(const{f,amp,L}of oct){const u=i/(N-1)*f,w=j/(N-1)*f,i0=Math.min(u|0,f-1),j0=Math.min(w|0,f-1),s=f+1;let a=u-i0,b=w-j0;a=a*a*(3-2*a);b=b*b*(3-2*b);
      n+=amp*(L[j0*s+i0]*(1-a)*(1-b)+L[j0*s+i0+1]*a*(1-b)+L[(j0+1)*s+i0]*(1-a)*b+L[(j0+1)*s+i0+1]*a*b)}
    hm[j*N+i]=Math.pow(Math.min(1,Math.max(0,(n/tot-.30)*2.4)),1.25)*520;
  }
  return hm}
function ground(x,y){
  let u=(x-ORG.x)/CELL,w=(y-ORG.y)/CELL;u=Math.min(N-1.001,Math.max(0,u));w=Math.min(N-1.001,Math.max(0,w));
  const i=u|0,j=w|0,a=u-i,b=w-j;
  return HM[j*N+i]*(1-a)*(1-b)+HM[j*N+i+1]*a*(1-b)+HM[(j+1)*N+i]*(1-a)*b+HM[(j+1)*N+i+1]*a*b}

// Гипсометрическая палитра: зелёные низины, охристые склоны, бурые высоты.
const RAMP=[[0,[105,160,95]],[.22,[155,187,111]],[.45,[210,190,119]],[.7,[174,135,101]],[1,[235,227,204]]];
function colorAt(h){
  if(h<4)return[78,132,200];
  const t=Math.min(1,h/480);for(let k=1;k<RAMP.length;k++)if(t<=RAMP[k][0]){const[a,ca]=RAMP[k-1],[b,cb]=RAMP[k],f=(t-a)/(b-a);return ca.map((c,i)=>c+(cb[i]-c)*f)}
  return RAMP[4][1]}
function renderTerrain(){
  const P=768,cv=document.createElement('canvas');cv.width=cv.height=P;const c=cv.getContext('2d'),im=c.createImageData(P,P),hh=new Float32Array(P*P),px=WS/P;
  // Cache the bilinear interpolation coordinates once per column/row instead of recomputing
  // divisions, clamps and indices for every rendered pixel.
  const ax=new Array(P),ay=new Array(P);
  for(let i=0;i<P;i++){let u=(i+.5)*px/CELL;u=clamp(u,0,N-1.001);const ix=u|0;ax[i]=[ix,u-ix]}
  for(let j=0;j<P;j++){let u=(WS-(j+.5)*px)/CELL;u=clamp(u,0,N-1.001);const iy=u|0;ay[j]=[iy,u-iy]}
  for(let j=0;j<P;j++){const [iy,b]=ay[j],row=iy*N,next=(iy+1)*N;for(let i=0;i<P;i++){const [ix,a]=ax[i];hh[j*P+i]=HM[row+ix]*(1-a)*(1-b)+HM[row+ix+1]*a*(1-b)+HM[next+ix]*(1-a)*b+HM[next+ix+1]*a*b}}
  for(let j=1;j<P-1;j++)for(let i=1;i<P-1;i++){
    const k=j*P+i,h=hh[k];let col=colorAt(h),sh=1;
    if(h>=4){const gx=(hh[k+1]-hh[k-1])/(2*px),gy=(hh[k-P]-hh[k+P])/(2*px);sh=Math.min(1.35,Math.max(.55,1+1.8*(gx-gy)));
      const b=Math.floor(h/40);if(b!==Math.floor(hh[k+1]/40)||b!==Math.floor(hh[k+P]/40))sh*=.8}
    const o=k*4;im.data[o]=col[0]*sh;im.data[o+1]=col[1]*sh;im.data[o+2]=col[2]*sh;im.data[o+3]=255}
  c.putImageData(im,0,0);terr=cv}


const CALL=[['Гром','#0a3fc4'],['Молот','#c2185b'],['Ураган','#ff7900']];
// Three intelligence stations per mission; frequency allocations are classified until confirmed.
function pickFreqs(){
 const used=[];
 for(let i=0;i<3;i++){
  let f,attempt=0;
  do{f=Math.round((555+Math.random()*1130)/3)*3;attempt++}while(attempt<1000&&used.some(x=>Math.abs(x-f)<75));
  used.push(f);
 }
 return used;
}
function place(){
  const valid=(g,t)=>t.x>=ORG.x+1200&&t.x<=ORG.x+WS-1200&&t.y>=ORG.y+1200&&t.y<=ORG.y+WS-1200&&
    g.x>=ORG.x+1200&&g.x<=ORG.x+WS-1200&&g.y>=ORG.y+1200&&g.y<=ORG.y+WS-1200&&
    Math.hypot(t.x-g.x,t.y-g.y)>=3000&&Math.hypot(t.x-g.x,t.y-g.y)<=12000&&ground(g.x,g.y)>=30&&ground(t.x,t.y)>=30;
  let best=null,bestScore=-Infinity;
  for(let tries=0;tries<2500;tries++){
    const R=rnd(3000,12000),b=rnd(0,2*Math.PI);
    const g={x:Math.round(ORG.x+rnd(2500,WS-2500)),y:Math.round(ORG.y+rnd(2500,WS-2500))};
    const t={x:Math.round(g.x+R*Math.sin(b)),y:Math.round(g.y+R*Math.cos(b))};
    const inside=t.x>=ORG.x+1200&&t.x<=ORG.x+WS-1200&&t.y>=ORG.y+1200&&t.y<=ORG.y+WS-1200;
    const gz=ground(g.x,g.y),tz=ground(t.x,t.y),score=Math.min(gz,tz)+(inside?1000:0);
    if(score>bestScore){bestScore=score;best={g,t,gz,tz}}
    if(valid(g,t)){g.z=Math.round(gz);t.z=Math.round(tz);return{g,t}}
  }
  // Extremely unusual terrain fallback: choose the best sampled in-bounds pair rather than
  // silently returning an invalid last attempt. Keep the app usable and make elevations explicit.
  if(best){best.g.z=Math.round(best.gz);best.t.z=Math.round(best.tz);return{g:best.g,t:best.t}}
  const g={x:ORG.x+WS/2,y:ORG.y+WS/2},t={x:g.x+3000,y:g.y};g.z=Math.round(ground(g.x,g.y));t.z=Math.round(ground(t.x,t.y));return{g,t}
}
// Температура — условная игровая модель, а не реальные теплотехнические данные.
const CREW_RELOAD_MS=9500,CREW_HEAT_PER_SHOT=19,CREW_COOL_PER_SEC=0.85;
const CREW_BASE_TEMP=32,CREW_MAX_TEMP=120,CREW_UNLOCK_TEMP=88;
function advanceCrewThermal(c,now=performance.now()){
  if(!Number.isFinite(c.thermalAt)){c.thermalAt=now;return}
  const dt=Math.max(0,Math.min((now-c.thermalAt)/1000,60));
  c.temperature=Math.max(CREW_BASE_TEMP,c.temperature-CREW_COOL_PER_SEC*dt);
  c.thermalAt=now;
}
function crewState(c,now=performance.now()){
  advanceCrewThermal(c,now);
  if(c.ammo<=0)return ['БОЕКОМПЛЕКТ ИСЧЕРПАН','empty'];
  if(c.temperature>=CREW_UNLOCK_TEMP)return ['ОХЛАЖДЕНИЕ','hot'];
  if(now<c.reloadUntil)return ['ПЕРЕЗАРЯДКА','loading'];
  return ['ГОТОВ','ready'];
}
function renderCrewResources(){
  const box=document.getElementById('crewResourceRows');if(!box||!CR?.length)return;
  const now=performance.now();
  box.innerHTML=CR.map(c=>{
    const [state,kind]=crewState(c,now),left=Math.max(0,(c.reloadUntil-now)/1000),progress=100*(1-Math.min(1,left/(CREW_RELOAD_MS/1000)));
    const temp=Math.round(c.temperature),heat=Math.max(0,Math.min(100,(temp-CREW_BASE_TEMP)/(CREW_MAX_TEMP-CREW_BASE_TEMP)*100));
    return `<div class="crew-resource ${kind==='hot'?'hot':kind==='empty'?'empty':''}"><div class="crew-resource-head"><span>РАСЧЁТ ${c.k+1} «${c.name}»</span><span>${state}</span></div><div class="crew-resource-meta">БОЕЗАПАС ${c.ammo}/${c.ammoMax} · ТЕМП. ${temp} °C<br>ПЕРЕЗАРЯДКА ${left>0?left.toFixed(1)+' с':'ГОТОВО'}</div><div class="crew-resource-track heat" title="Температура ствола"><i style="width:${heat}%"></i></div><div class="crew-resource-track reload" title="Готовность перезарядки"><i style="width:${progress}%"></i></div></div>`;
  }).join('');
}
function renderData(){
  const row=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
  let h=CR.map(c=>`<tr><td colspan="2" style="text-align:left;color:${c.color};border-bottom:1px solid ${c.color}">Расчёт ${c.k+1} «${c.name}» ${c.hit?'✔ цель поражена':''}</td></tr>`+
    row('Частота',c.identified?c.f+' кГц':'НЕ УСТАНОВЛЕНА')+row('Орудие X / Y','X '+Math.round(c.g.x)+' / Y '+Math.round(c.g.y))+row('Высота орудия',c.g.z+' м')+row('Цель',c.decodedTarget?('X '+c.decodedTarget.x+' / Y '+c.decodedTarget.y+(c.hit?' · ПОРАЖЕНА':'')):(c.hit?'Подтверждена':'СКРЫТА — перехватите Морзе'))).join('');
  h+=`<tr><td colspan="2" style="text-align:left;border-bottom:1px solid #215dc6;color:#215dc6">Метео</td></tr>`+row('Ветер, откуда',S.ws?S.wd+'°':'—')+row('Скорость ветра',S.ws+' м/с');
  $('data').innerHTML=h}
// Публикуем только координаты, которые декодер действительно прочитал из аудио.
// При новом задании сведения сбрасываются вместе с массивом расчётов.
window.sh95AcceptDecodedCoordinates=(crewNumber,x,y,recordTaskId)=>{
 if(!recordTaskId||recordTaskId!==window.sh95CurrentTaskId)return false;
 const c=CR[crewNumber-1];
 if(!c||!c.identified||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>99999||y>99999)return false;
 c.decodedTarget={x,y};
 renderData();
 if(window.sh95Event)window.sh95Event('Радиоперехват: координаты цели расчёта '+crewNumber+' занесены в исходные данные');
 return true;
};
function newTask(noWind){
  window.sh95CurrentTaskId='task-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  ORG={x:Math.round(rnd(10,50))*1000,y:Math.round(rnd(10,50))*1000};
  HM=genTerrain((Math.random()*1e9)|0);
  const fr=pickFreqs();
  CR=CALL.map((c,k)=>({k,name:c[0],color:c[1],f:fr[k],identified:false,decodedTarget:null,...place(),shots:[],trajs:[],hit:false,ammo:12,ammoMax:12,reloadUntil:0,temperature:32,thermalAt:performance.now()}));
  renderCrewResources();
  window.sh95CrewData=()=>CR;
  S={ws:noWind?0:Math.round(rnd(2,12)),wd:Math.round(rnd(0,359))};
  Radio.setCrews(CR.map(c=>({f:c.f,label:`Разведка ${c.k+1} «${c.name}»`,az:Math.round((Math.atan2(c.t.x-c.g.x,c.t.y-c.g.y)*180/Math.PI+360)%360),x:Math.round(c.t.x),y:Math.round(c.t.y)})));
  last=null;lkKey='';$('res').innerHTML='';updateBearingPanel();annotations.length=0;selectedAnnotation=null;if($('coordX')){$('coordX').value='';$('coordY').value='';$('coordState').textContent='НЕ ВЫБРАНА'}showTargets.checked=false;
  $('s2').textContent=S.ws?`Ветер: ${S.wd}°, ${S.ws} м/с`:'Ветер: штиль';
  $('log').innerHTML='<tr><th>Выстрел</th><th>Расчёт</th><th>Азимут</th><th>Возвышение</th><th>Заряд</th><th>Время, с</th><th>Откл., м</th></tr>';
  renderData();renderTerrain();fitView();updateLink();draw();if(window.sh95Event)window.sh95Event('Создано новое задание: '+CR.length+' расчёта, '+(S.ws?'ветер '+S.ws+' м/с':'штиль'));if(window.sh95Brief)window.sh95Brief()}

function simulate(az,el,v0,c){
  const wx=-S.ws*Math.sin(S.wd*Math.PI/180),wy=-S.ws*Math.cos(S.wd*Math.PI/180),gx=c.g.x,gy=c.g.y;
  let p=[0,0,ground(gx,gy)+1],vv=[v0*Math.cos(el)*Math.sin(az),v0*Math.cos(el)*Math.cos(az),v0*Math.sin(el)];
  const dt=.01,pts=[p.slice()];let t=0,n=0;
  const acc=w=>{const rx=w[0]-wx,ry=w[1]-wy,s=Math.hypot(rx,ry,w[2]);return[-K*s*rx,-K*s*ry,-G-K*s*w[2]]};
  while(t<400){
    const a1=acc(vv),vm=vv.map((q,i)=>q+a1[i]*dt/2),a2=acc(vm),np=p.map((q,i)=>q+vm[i]*dt),nv=vv.map((q,i)=>q+a2[i]*dt);t+=dt;n++;
    const g0=ground(gx+p[0],gy+p[1]),g1=ground(gx+np[0],gy+np[1]);
    if(np[2]<=g1&&n>5){const f=Math.min(1,Math.max(0,(p[2]-g0)/((p[2]-g0)-(np[2]-g1)||1))),ip=p.map((q,i)=>q+(np[i]-q)*f);pts.push(ip);return{x:gx+ip[0],y:gy+ip[1],t:t-dt+dt*f,pts}}
    p=np;vv=nv;if(n%20==0)pts.push(p.slice())}
  return null}

function say(t,cls=''){$('res').innerHTML=`<div class="m ${cls}">${t}</div>`}
let lkKey='';
function updateLink(){
  const raw=Radio.link(),k=raw>=0&&CR[raw]?.identified?raw:-1,q=k<0?0:Radio.quality(k),key=k+':'+Math.round(q*100);if(key===lkKey)return;lkKey=key;const el=$('link');
  if(k<0){el.className='link off';el.textContent='Канал не подтверждён. Найдите сигнал и передайте пеленг.';return}
  const p=Math.round(q*100),w=p>=80?'отличная':p>=65?'хорошая':p>=45?'слабая':'очень плохая',col=p>=65?'#2e8420':p>=45?'#c78a00':'#b3392b';
  el.className='link on';
  el.innerHTML=`<span style="color:${CR[k].color}">●</span> На связи: расчёт ${k+1} «${CR[k].name}», ${CR[k].f} кГц<br>Разборчивость: ${p}% (${w})<div class="qb"><i style="width:${p}%;background:${col}"></i></div>`}
function updateBearingPanel(){
 const count=CR.filter(c=>c.identified).length;
 $('bearingCount').textContent=count+' / 3';
 $('bearingList').innerHTML=CR.map(c=>`<div><span>КАНАЛ ${c.k+1} / ${c.name}</span><b>${c.identified?c.f.toFixed(0)+' кГц · ПОДТВЕРЖДЁН':'— · НЕ УСТАНОВЛЕН'}</b></div>`).join('');
 if(window.sh95Brief)window.sh95Brief();
}
$('sendBearing').onclick=()=>{
 const k=Radio.link();
 if(k<0){$('bearingStatus').textContent='✕ Сигнал не опознан';if(window.sh95Event)window.sh95Event('Пеленг отклонён: частота не соответствует каналу');return}
 const c=CR[k];
 if(c.identified){$('bearingStatus').textContent='✓ Канал уже известен';return}
 c.identified=true;
 $('bearingStatus').textContent='✓ '+c.name+' / '+c.f+' кГц';
 updateBearingPanel();renderData();lkKey='';updateLink();
 if(window.sh95Event)window.sh95Event('Пеленг подтверждён: '+c.name+', '+c.f+' кГц');
};
const clamp=(a,lo,hi)=>Math.min(hi,Math.max(lo,a));
function garble(s){
  const idx=[...s].map((ch,i)=>/\d/.test(ch)?i:-1).filter(i=>i>=0);if(!idx.length)return s;
  const i=idx[Math.floor(Math.random()*idx.length)];let d;do{d=String(Math.floor(Math.random()*10))}while(d===s[i]);
  return s.slice(0,i)+d+s.slice(i+1)}
const gauss=()=>Math.sqrt(-2*Math.log(1-Math.random()))*Math.cos(2*Math.PI*Math.random());
function fire(){
  const feedback=(received,reason='')=>window.dispatchEvent(new CustomEvent('sh95:order-result',{detail:{received,reason}}));
  const reject=(message)=>{say(message);feedback(false,message)};
  const k=Radio.link();
  if(k<0||!CR[k]?.identified){reject('Канал не подтверждён. Найдите частоту и передайте пеленг.');return}
  const c=CR[k];
  if(c.hit){reject(`Расчёт «${c.name}»: наша цель уже поражена. Ждём новых указаний.`);return}
  const [readiness,readinessKind]=crewState(c);
  if(readinessKind!=='ready'){reject(`«${c.name}»: ${readiness.toLowerCase()}. ${readinessKind==='loading'?'Осталось '+Math.ceil((c.reloadUntil-performance.now())/1000)+' с.':readinessKind==='hot'?'Температура '+Math.round(c.temperature)+' °C.':'Боеприпасов нет.'}`);renderCrewResources();return}
  const mil=$('unit').value=='mil',sa=$('az').value.trim(),se=$('el').value.trim(),ch=+$('ch').value,a=parseFloat(sa),e0=parseFloat(se);
  if(!Number.isFinite(a)||!Number.isFinite(e0)){reject('Введите корректные числовые значения азимута и угла возвышения.');return}
  if(!Number.isInteger(ch)||ch<1||ch>4){reject('Выберите заряд от 1 до 4.');return}
  const ku=mil?Math.PI/3200:Math.PI/180;
  if(e0*ku<=0||e0*ku>=1.55){reject('Угол возвышения вне пределов (0…90°).');return}
  // --- искажения при плохой связи
  const q=Radio.quality(k),er=clamp((0.8-q)/0.5,0,1),pm=er*0.4,unit=mil?17.78:1;
  let ra=a,re=e0,rc=ch;
  if(er>0){
    if(Math.random()<pm)ra=parseFloat(garble(sa))||0;
    if(Math.random()<pm)re=parseFloat(garble(se))||0;
    if(Math.random()<pm*.6)rc=clamp(ch+(Math.random()<.5?-1:1),1,4);
    ra=+(ra+gauss()*er*.15*unit).toFixed(2);re=+(re+gauss()*er*.1*unit).toFixed(2)}
  if(re*ku<=0||re*ku>=1.55){reject(`«${c.name}»: из-за помех данные не разобрали (угол вне пределов). Повторите передачу.`);return}
  const r=simulate(ra*ku,re*ku,V0[rc-1],c);
  if(!r){reject('Снаряд не вернулся на землю.');return}
  const b=Math.atan2(c.t.x-c.g.x,c.t.y-c.g.y),dx=r.x-c.t.x,dy=r.y-c.t.y,al=dx*Math.sin(b)+dy*Math.cos(b),rg=dx*Math.cos(b)-dy*Math.sin(b),d=Math.hypot(dx,dy),hit=d<=R_HIT;
  if(window.sh95Event)window.sh95Event('Расчёт '+(k+1)+' / выстрел '+(c.shots.length+1)+' / '+(hit?'ПОРАЖЕНИЕ':'разрыв '+Math.round(d)+' м'));
  c.ammo--;c.temperature=Math.min(CREW_MAX_TEMP,c.temperature+CREW_HEAT_PER_SHOT);c.reloadUntil=performance.now()+CREW_RELOAD_MS;
  feedback(true);
  c.shots.push({x:r.x,y:r.y});c.trajs.push(r.pts);last=k;if(hit)c.hit=true;
  const all=CR.every(q2=>q2.hit),bad=x=>`<b style="color:#b3392b">${x}</b>`,df=(s,r2)=>Math.abs(s-r2)<.005?r2:bad(r2),lg=(s,r2)=>Math.abs(s-r2)<.005?s:`${s} → ${bad(r2)}`;
  say(`«${c.name}»: повторяю: азимут ${df(a,ra)}, возвышение ${df(e0,re)}, заряд ${df(ch,rc)}. Выстрел! ${hit?'ЦЕЛЬ ПОРАЖЕНА! ':''}Разрыв: ${Math.abs(al)<1?'':(al>0?'перелёт ':'недолёт ')+Math.abs(al).toFixed(0)+' м'}${Math.abs(rg)<1?'':', '+(rg>0?'правее ':'левее ')+Math.abs(rg).toFixed(0)+' м'}. Отклонение ${d.toFixed(0)} м, полёт ${r.t.toFixed(1)} с.${all?' <br>ВСЕ ЦЕЛИ ПОРАЖЕНЫ — задача выполнена!':''}`,hit?'hit':'');
  $('log').insertAdjacentHTML('beforeend',`<tr><td>${k+1}.${c.shots.length}</td><td style="color:${c.color}">«${c.name}»</td><td>${lg(a,ra)}</td><td>${lg(e0,re)}</td><td>${lg(ch,rc)}</td><td>${r.t.toFixed(1)}</td><td>${d.toFixed(0)}</td></tr>`);
  $('s1').textContent=all?'Все цели поражены!':`«${c.name}»: отклонение ${d.toFixed(0)} м`;
  renderData();renderCrewResources();draw();if(window.sh95Brief)window.sh95Brief()}

/* ---- карта ---- */
function fitView(){const xs=CR.flatMap(c=>[c.g.x,c.t.x]),ys=CR.flatMap(c=>[c.g.y,c.t.y]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  v.cx=(x0+x1)/2;v.cy=(y0+y1)/2;v.m=Math.max((x1-x0)/(W*.8),(y1-y0)/(H*.8),6)}
function halo(x,s,px,py){x.lineWidth=3;x.strokeStyle='rgba(255,255,255,.85)';x.strokeText(s,px,py);x.fillText(s,px,py)}
function marker(x,wx,wy,sym,col,label){
  const px=X(wx),py=Y(wy);if(px<-45||py<-45||px>W+45||py>H+45)return;
  // Штабной условный знак: прямоугольная табличка с индексом расчёта.
  const id=(String(label).match(/\d+/)||[''])[0]||label.slice(0,2);
  x.save();x.lineWidth=1.5;x.fillStyle='#0a2419';x.strokeStyle='#000000';
  x.fillRect(px-15,py-13,30,26);x.strokeRect(px-15.5,py-13.5,31,27);
  x.strokeStyle=col;x.lineWidth=2.5;x.strokeRect(px-13.5,py-11.5,27,23);
  x.beginPath();x.moveTo(px-9,py+7);x.lineTo(px+9,py+7);x.moveTo(px,py-16);x.lineTo(px,py-12);x.stroke();
  x.fillStyle='#ffffff';x.font='bold 12px Courier New,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(id,px,py-2);
  const short=label.startsWith('Ц')?label:'РСЧ '+id;
  x.font='bold 10px Courier New,monospace';const tw=x.measureText(short).width+10;
  x.fillStyle='#0b1714';x.fillRect(px-tw/2,py+15,tw,15);x.strokeStyle='#000000';x.strokeRect(px-tw/2+.5,py+15.5,tw-1,14);
  x.fillStyle='#ffffff';x.textBaseline='top';x.fillText(short,px,py+17);x.restore();}

window.sh95RedrawMap=()=>draw();
function draw(){
  const x=mapC.getContext('2d');x.clearRect(0,0,W,H);x.fillStyle='#071b15';x.fillRect(0,0,W,H);
  x.imageSmoothingEnabled=true;x.save();x.filter=window.sh95GreenMap?'grayscale(1) sepia(.8) hue-rotate(70deg) saturate(1.5) brightness(.64) contrast(1.2)':'none';x.drawImage(terr,X(ORG.x),Y(ORG.y+WS),WS/v.m,WS/v.m);x.restore();
  const steps=[100,200,500,1000,2000,5000],st=steps.find(s=>s/v.m>=80)||5000;
  x.lineWidth=1;x.strokeStyle='rgba(95,209,130,.27)';x.font='bold 11px Courier New,monospace';x.textBaseline='alphabetic';
  // Координаты выводятся в отдельных непрозрачных табличках, без белого ореола.
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
  CR.forEach(c=>{marker(x,c.g.x,c.g.y,'◉',c.color,c.name.toUpperCase());(showTargets.checked||c.hit?marker(x,c.t.x,c.t.y,c.hit?'✔':'✖',c.hit?'#2e8420':c.color,'Ц'+(c.k+1)):null)});
  if(S.ws){const a=(S.wd+180)*Math.PI/180,ox=W-60,oy=60,dx=Math.sin(a)*24,dy=-Math.cos(a)*24;x.fillStyle='rgba(255,255,225,.9)';x.fillRect(ox-45,oy-40,90,86);x.strokeStyle='#000';x.lineWidth=1;x.strokeRect(ox-45,oy-40,90,86);
    x.lineWidth=3;x.beginPath();x.moveTo(ox-dx,oy-dy);x.lineTo(ox+dx,oy+dy);x.stroke();x.beginPath();x.arc(ox+dx,oy+dy,4,0,7);x.fillStyle='#000';x.fill();x.font='11px Tahoma';x.textAlign='center';x.fillText('ветер '+S.ws+' м/с',ox,oy+38);x.fillText('N ↑',ox,oy-30);x.textAlign='start'}
  // Высотная легенда с цветами исходного рельефа.
  const lx=W-155,ly=H-47,lw=138,lh=9;
  x.fillStyle='rgba(5,17,14,.90)';x.fillRect(lx-8,ly-18,lw+16,51);
  x.fillStyle='#eef4e5';x.font='bold 10px Courier New';x.textAlign='left';
  x.fillText('ВЫСОТА, М',lx,ly-5);
  for(let i=0;i<lw;i++){
    const rgb=colorAt(520*i/(lw-1));x.fillStyle=`rgb(${rgb.map(Math.round).join(',')})`;
    x.fillRect(lx+i,ly,1,lh);
  }
  x.strokeStyle='#d5d9c7';x.strokeRect(lx-.5,ly-.5,lw+1,lh+1);
  x.fillStyle='#eef4e5';x.font='10px Courier New';
  x.fillText('0',lx,ly+21);x.textAlign='right';x.fillText('520+',lx+lw,ly+21);x.textAlign='left';
  x.fillStyle='#06190f';x.fillRect(4,3,340,18);x.fillStyle='#d7f1d7';x.font='bold 11px Courier New';x.textBaseline='alphabetic';x.fillText('АРМ-95 / ТОПОПЛАНШЕТ · СЕТКА '+st+' М',9,16);x.strokeStyle='#4fa86e';x.strokeRect(.5,.5,W-1,H-1);
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
    state.textContent='ОЖИДАНИЕ ВЫСТРЕЛА';ctx.fillStyle='#9dc8a9';ctx.font='bold 16px Courier New';ctx.textAlign='center';
    ctx.fillText('ОЖИДАНИЕ ДАННЫХ ТРАЕКТОРИИ',left+pw/2,top+ph/2);ctx.restore();return;
  }
  const c=CR[last],tr=c.trajs?.[c.trajs.length-1];
  if(!Array.isArray(tr)||tr.length<2){state.textContent='ТРАЕКТОРИЯ НЕДОСТУПНА';ctx.restore();return}
  // Разрез направлен по фактическому выстрелу, а не по цели.
  // Иначе при стрельбе в другую сторону вся траектория оказывалась
  // левее графика и полностью скрывалась областью clip().
  const end=tr[tr.length-1];
  const shotLen=Math.hypot(end[0],end[1]);
  const firstMove=tr.find(p=>Math.hypot(p[0],p[1])>1);
  const heading=shotLen>1?end:firstMove;
  if(!heading){state.textContent='НЕДОСТАТОЧНО ДАННЫХ';ctx.restore();return}
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
  if(!Number.isFinite(zmin)||!Number.isFinite(zmax)){state.textContent='НЕКОРРЕКТНЫЕ ДАННЫЕ';ctx.restore();return}
  const D=Math.max(100,furthest*1.08),terrain=[];
  for(let i=0;i<=240;i++){
    const d=i*D/240,z=ground(c.g.x+ux*d,c.g.y+uy*d);
    if(!Number.isFinite(z)){state.textContent='ОШИБКА РЕЛЬЕФА';ctx.restore();return}
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
  for(const p of tr){if(!p||p.length<3||!p.every(Number.isFinite))continue;
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
  ctx.textAlign='left';ctx.font='bold 12px Courier New';ctx.fillStyle='#70d396';ctx.fillText('РЕЛЬЕФ',left+9,top+15);
  ctx.fillStyle='#ffda83';ctx.fillText('ТРАЕКТОРИЯ',left+105,top+15);
  ctx.fillStyle='#ff9286';ctx.fillText('ЦЕЛЬ',left+240,top+15);
  state.textContent=`РАСЧЁТ ${c.k+1} · Hmax ${Math.round(zmax-pad)} м · БОК. СМЕЩ. ЦЕЛИ ${Math.round(targetSide)} м`;
  ctx.restore();
}
/* ---- взаимодействие ---- */
function zoom(f,px=W/2,py=H/2){const wx=v.cx+(px-W/2)*v.m,wy=v.cy-(py-H/2)*v.m;v.m=Math.min(60,Math.max(1.5,v.m*f));v.cx=wx-(px-W/2)*v.m;v.cy=wy+(py-H/2)*v.m;draw()}
const pos=e=>{const r=mapC.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]};
const showTargets=$('showTargets');showTargets.addEventListener('change',draw);
const annotations=[];let mapGesture=null,hover=null,selectedAnnotation=null;
const toWorld=(px,py)=>({x:v.cx+(px-W/2)*v.m,y:v.cy-(py-H/2)*v.m});
function drawAnnotations(ctx){
 ctx.save();ctx.lineWidth=2;
 for(const a of annotations){const x=X(a.a.x),y=Y(a.a.y);
  if(a.b){ctx.strokeStyle='#eaff00';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X(a.b.x),Y(a.b.y));ctx.stroke();}
  else{ctx.strokeStyle=a===selectedAnnotation?'#ff6565':'#ffec00';ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();ctx.font='11px monospace';ctx.fillStyle='#101010';ctx.fillText(`${Math.round(a.a.x)},${Math.round(a.a.y)}`,x+9,y-8)}
 }
 if(mapGesture?.kind==='line'&&mapGesture.end){ctx.strokeStyle='#ffff00';ctx.setLineDash([5,3]);ctx.beginPath();ctx.moveTo(X(mapGesture.start.x),Y(mapGesture.start.y));ctx.lineTo(X(mapGesture.end.x),Y(mapGesture.end.y));ctx.stroke();ctx.setLineDash([])}
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
function selectPoint(a){selectedAnnotation=a;const pt=a?.a;$('coordState').textContent=a?'ВЫБРАНА':'НЕ ВЫБРАНА';$('coordX').value=pt?Math.round(pt.x):'';$('coordY').value=pt?Math.round(pt.y):'';$('coordMessage').textContent=a?'Измените X/Y и нажмите «Применить». «Стереть» удалит метку.':'Выберите метку ЛКМ для изменения координат.';draw()}
function eraseAt(px,py){const a=nearestAnnotation(px,py,22);if(!a)return false;annotations.splice(annotations.indexOf(a),1);if(selectedAnnotation===a)selectPoint(null);draw();return true}
mapC.addEventListener('contextmenu',e=>{e.preventDefault()});
$('coordApply').onclick=()=>{if(!selectedAnnotation)return;const x=Number($('coordX').value),y=Number($('coordY').value);if(!Number.isFinite(x)||!Number.isFinite(y)||$('coordX').value===''||$('coordY').value===''){$('coordMessage').textContent='Ошибка: введите числовые X и Y.';return}selectedAnnotation.a={x,y};$('coordMessage').textContent='Координаты обновлены.';draw()};
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
 $('s1').textContent=`X: ${Math.round(w.x)} Y: ${Math.round(w.y)} Высота: ${Math.round(ground(w.x,w.y))} м`;
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
$('fit').onclick=()=>{fitView();draw()};$('zin').onclick=()=>zoom(.7);$('zout').onclick=()=>zoom(1.4);
$('unit').onchange=()=>{$('az').value='';$('el').value=''};

const tick=()=>$('clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});tick();setInterval(tick,30000);
setInterval(updateLink,150);
setInterval(renderCrewResources,250);
newTask(false);
