(function(){
const SR_MIN=530,SR_MAX=1710;
const S={tune:1100,bw:8,rf:1,atm:.4,vol:.6,agc:true,sq:false,on:false,sig:0};
const ST=[
 {f:702,n:"Radio Moravica — music",P:.9},
 {f:891,n:"Amateur — Morse",P:.7},
 {f:1017,n:"Radio Vragrad — speech",P:.85},
 {f:1233,n:"Numbers station",P:.6},
 {f:1359,n:"Teletype — RTTY",P:.75},
 {f:610,n:'',P:.85},{f:970,n:'',P:.85},{f:1460,n:'',P:.85}];
const CIVIL_NAMES=["Radio Moravica — music","Amateur — Morse","Radio Vragrad — speech","Numbers station","Teletype — RTTY"];
function randomCivilFrequencies(){
 const used=ST.slice(5).map(s=>s.f);
 ST.slice(0,5).forEach((s,i)=>{let f,tries=0;do{f=Math.round((SR_MIN+24+rnd()*(SR_MAX-SR_MIN-48))/3)*3;tries++}while(tries<500&&used.some(v=>Math.abs(v-f)<32));
 s.f=f;s.n=CIVIL_NAMES[i];used.push(f)});
 window.dispatchEvent(new CustomEvent('shtab:civil-frequencies-updated'));
 const status=document.getElementById('rfstatus');if(status)status.textContent=I18n.t("FREQUENCIES REALLOCATED");
}
const fq=document.getElementById('fq');
let ctx,proc,lp1,lp2,hp,vg,comp,analyser,tt=0,SR=44100;
const PI2=Math.PI*2,rnd=Math.random;
// --- station signal generators
function melody(){const N=[220,261.6,329.6,440,329.6,261.6,196,246.9,293.7,392,293.7,246.9];let p=0,q=0;
 return t=>{const n=Math.floor(t/.2),lt=t-n*.2;p+=PI2*N[n%12]/SR;q+=PI2*N[(n>>2)%3*4%12]/2/SR;
 const e=Math.min(1,lt*200)*Math.exp(-lt*9);return (Math.sin(p)+.4*Math.sin(2*p)+.15*Math.sin(3*p))*.5*e+.18*Math.sin(q)}}
function morse(){const T={C:'-.-.',Q:'--.-',D:'-..',E:'.',U:'..-',A:'.-','3':'...--',B:'-...',K:'-.-'};
 const u=[];'CQ CQ CQ DE UA3ABC K'.split('').forEach(c=>{if(c==' '){u.push(0,0,0,0);return}
 T[c].split('').forEach(s=>{u.push(1);if(s=='-')u.push(1,1);u.push(0)});u.push(0,0)});u.push(0,0,0,0,0,0,0,0,0,0);
 let e=0,p=0;return t=>{const k=u[Math.floor(t/.075)%u.length];e+=(k-e)*.01;p+=PI2*700/SR;return Math.sin(p)*e*.6}}
function speech(f0=105){
 // Pseudo-speech: changing phonemes, voiced/unvoiced consonants, pitch drift, pauses and band-limited formants.
 const vowels=[[730,1150,2500],[310,2200,2950],[420,920,2550],[520,1850,2600],[680,1550,2700],[350,1550,2300]];
 let next=0,begin=0,dur=.15,kind=0,v=[730,1150,2500],pitch=f0,phase=0,prev=0,low=0;
 const reson=vowels.map(()=>null);let yy=[0,0,0],zz=[0,0,0],co=[0,0,0],rr=[.95,.97,.975];
 return t=>{
  if(t>=next){begin=t;const q=rnd();kind=q<.12?0:q<.30?2:1;
   dur=kind===0?.13+rnd()*.35:kind===2?.035+rnd()*.065:.075+rnd()*.19;
   next=t+dur;v=vowels[Math.floor(rnd()*vowels.length)];pitch=f0*(.87+rnd()*.3);
   co=v.map((f,i)=>2*rr[i]*Math.cos(PI2*f/SR));}
  const u=Math.min(1,(t-begin)/dur),attack=Math.min(1,u*25),release=Math.min(1,(1-u)*16),env=Math.max(0,attack*release);
  const jitter=1+.018*Math.sin(t*22)+.008*Math.sin(t*39);
  phase+=pitch*jitter/SR;if(phase>=1)phase-=1;
  const buzz=(2*phase-1)+.24*Math.sin(PI2*phase*2),breath=(rnd()*2-1);
  const source=(kind===0?0:kind===2?breath*.85:buzz+.13*breath)*env;
  let out=0;
  for(let i=0;i<3;i++){const z=(1-rr[i])*source+co[i]*yy[i]-rr[i]*rr[i]*zz[i];zz[i]=yy[i];yy[i]=z;out+=z*[1,.7,.35][i]}
  low+=(out-low)*.14;prev+=(low-prev)*.03;
  return Math.tanh((low-prev)*4.2)*.8;
 }
}
function numbers(){let p1=0,p2=0;const A=[697,770,852,941],B=[1209,1336,1477];
 return t=>{const k=Math.floor(t/.32),lt=t-k*.32,kk=k%18;if(kk>=15)return 0;
  const d=(Math.imul(k+3,2654435761)>>>12)%10;p1+=PI2*A[d%4]/SR;p2+=PI2*B[d%3]/SR;
  const e=lt<.24?Math.min(1,lt*150,(.24-lt)*150):0;return (Math.sin(p1)+Math.sin(p2))*.3*e}}
function rtty(){let p=0;return t=>{const b=(Math.imul(Math.floor(t*50)+7,2654435761)>>>15)&1;
 p+=PI2*(b?1170:1000)/SR;return Math.sin(p)*.5}}
// A repeated coded transmission: station number, bearing from its gun, and target X/Y.
// 1 unit = 90 ms; word spaces and long pauses make copying the message practical.
const MORSE_CODE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'};
function codedTransmission(message){
 const bits=[];const add=(on,count)=>{for(let i=0;i<count;i++)bits.push(on)};
 for(const word of message.toUpperCase().split(' ')){
  for(let j=0;j<word.length;j++){
   const code=MORSE_CODE[word[j]];if(!code)continue;
   for(let i=0;i<code.length;i++){add(1,code[i]==='-'?3:1);if(i<code.length-1)add(0,1)}
   if(j<word.length-1)add(0,3)
  }
  add(0,7)
 }
 add(0,20);let phase=0,env=0;const unit=.09;
 return t=>{const on=bits[Math.floor(t/unit)%bits.length]||0;env+=(on-env)*.018;phase+=PI2*690/SR;if(phase>PI2)phase-=PI2;return Math.sin(phase)*env*.68}
}
const GEN=[melody,morse,speech,numbers,rtty,()=>codedTransmission('DE 1 AZ 000 X 00000 Y 00000'),()=>codedTransmission('DE 2 AZ 000 X 00000 Y 00000'),()=>codedTransmission('DE 3 AZ 000 X 00000 Y 00000')];
ST.forEach((s,i)=>{s.g=null;s.a=0;s.tg=0;s.pw=0;s.wp=0;s.wf=0;s.wg=0;s.mk=GEN[i]});
// --- audio
function setFilter(){document.getElementById("bandread").textContent=S.bw.toFixed(1)+I18n.t(" kHz");if(!ctx)return;const c=Math.max(400,S.bw*500);
 [lp1,lp2].forEach(f=>f.frequency.setTargetAtTime(c,ctx.currentTime,.03));
 vg.gain.setTargetAtTime(S.on?S.vol*S.vol*2.2:0,ctx.currentTime,.03)}
function startAudio(){ctx=new (window.AudioContext||window.webkitAudioContext)();SR=ctx.sampleRate;
 ST.forEach(s=>s.g=s.mk());
 proc=ctx.createScriptProcessor(2048,0,1);
 lp1=ctx.createBiquadFilter();lp2=ctx.createBiquadFilter();hp=ctx.createBiquadFilter();
 lp1.type=lp2.type='lowpass';lp1.Q.value=.7;lp2.Q.value=.7;hp.type='highpass';hp.frequency.value=130;
 vg=ctx.createGain();comp=ctx.createDynamicsCompressor();analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.78;analyser.minDecibels=-95;analyser.maxDecibels=-15;
 proc.connect(lp1);lp1.connect(lp2);lp2.connect(hp);hp.connect(vg);vg.connect(comp);comp.connect(analyser);analyser.connect(ctx.destination);
 // PCM tap: no MediaRecorder, MediaStream or recording permissions required.
 const tapeTap=ctx.createScriptProcessor(4096,1,1),tapeSilent=ctx.createGain();tapeSilent.gain.value=0;
 comp.connect(tapeTap);tapeTap.connect(tapeSilent);tapeSilent.connect(ctx.destination);
 tapeTap.onaudioprocess=e=>{const cb=window.sh95TapePCM;if(cb)cb(e.inputBuffer.getChannelData(0),ctx.sampleRate)};
 window.sh95TapeSampleRate=ctx.sampleRate;
 let rum=0,cb=0,storm=0,stg=0,L=0,g=1,gate=1;
 proc.onaudioprocess=e=>{const o=e.outputBuffer.getChannelData(0),H=S.bw/2;
  if(rnd()<.03)stg=Math.pow(rnd(),2);storm+=(stg-storm)*.1;
  ST.forEach((s,i)=>{const df=S.tune-s.f,ad=Math.abs(df);
   const fade=Math.max(.15,.72+.28*Math.sin(tt*.37+i*2)*Math.cos(tt*.11+i)+.08*Math.sin(tt*2.3+i*5));
   s.pw=s.P*S.rf*fade;s.tg=s.pw*Math.exp(-Math.pow(df/(H*1.2+.8),2));
   const x=Math.min(1,Math.max(0,(ad-.05)/.55));
   s.wg=s.pw*.35*x*x*(3-2*x)*Math.exp(-Math.pow(df/(H*2.5+1.5),2));s.wf=Math.min(ad,6)*1000});
  const pc=.00002+.0006*S.atm*(.3+storm),nl=.3+S.atm;
  for(let i=0;i<o.length;i++){tt+=1/SR;let sum=0,mx=0;
   for(const s of ST){s.a+=(s.tg-s.a)*.003;if(s.a>.002||s.wg>.002)s.m=s.g(tt);
    if(s.a>.002)sum+=s.m*s.a;if(s.a>mx)mx=s.a;
    if(s.wg>.002){s.wp+=PI2*s.wf/SR;sum+=Math.sin(s.wp)*s.wg}}
   rum+=((rnd()*2-1)-rum)*.02;
   if(rnd()<pc)cb=.5+rnd()*.7;cb*=.9985;
   const nz=(rnd()*2-1)*.12+rum*.3*nl+cb*(rnd()*2-1);
   L+=(mx-L)*(mx>L?.01:.0004);
   const gt=S.agc?Math.min(3,.5/(.15+L)):1.2;g+=(gt-g)*(gt<g?.01:.0003);
   const gtg=S.sq&&L<.1?0:1;gate+=(gtg-gate)*.002;
   o[i]=Math.tanh((sum+nz)*g*gate)}
  S.sig=L}
}
async function power(){try{if(!ctx)startAudio();S.on=!S.on;if(S.on)await ctx.resume();setFilter();bp.setAttribute('aria-pressed',S.on);bp.textContent=S.on?I18n.t("Power Off"):I18n.t("Power On");document.getElementById('powerled').classList.toggle('lit',S.on);document.getElementById('rxstate').textContent=S.on?'RX':'OFF';if(!S.on)setTimeout(()=>{if(!S.on&&ctx)ctx.suspend().catch(()=>{})},300)}catch(err){S.on=false;bp.setAttribute('aria-pressed','false');bp.textContent=I18n.t("Power On");console.error(I18n.t("Could not start audio:"),err);document.getElementById('powerled').classList.remove('lit');document.getElementById('rxstate').textContent='ERR';const el=document.getElementById('link');el.className='link off';el.textContent=I18n.t("Audio is unavailable or blocked in this browser. Try a modern browser.")}}
// --- knobs
function Knob(id,o){const el=document.getElementById(id),m=el.querySelector('.k'),out=el.parentNode.querySelector('.val');
 let v=o.val,ang=0;const pd=o.inf?o.pd:(o.max-o.min)/270;
 function draw(){const a=o.inf?ang:-135+270*(v-o.min)/(o.max-o.min);m.style.transform='rotate('+a+'deg)';out.textContent=o.fmt(v);
  el.setAttribute('aria-valuenow',v)}
 function step(d,fine){const delta=d*pd*(fine?.1:1);let nv;if(o.inf){const span=o.max-o.min;nv=((v-o.min+delta)%span+span)%span+o.min;ang+=delta/pd}else nv=Math.min(o.max,Math.max(o.min,v+delta));v=nv;o.on(v);draw()}
 let last=null;
 el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);const r=el.getBoundingClientRect();last=Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)});
 el.addEventListener('pointermove',e=>{if(last==null)return;const r=el.getBoundingClientRect();
  const a=Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2);let d=(a-last)*180/Math.PI;
  if(d>180)d-=360;if(d<-180)d+=360;last=a;step(d,e.shiftKey)});
 const up=()=>last=null;el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
 el.addEventListener('wheel',e=>{e.preventDefault();step(-Math.sign(e.deltaY)*(o.inf?5:10),e.shiftKey)},{passive:false});
 el.addEventListener('keydown',e=>{const k={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1}[e.key];if(k){e.preventDefault();step(k*(o.inf?3:6),e.shiftKey)}});
 o.on(v);draw()}
Knob('kt',{min:SR_MIN,max:SR_MAX,val:S.tune,inf:true,pd:.4,fmt:v=>v.toFixed(1)+I18n.t(" kHz"),on:v=>{S.tune=v;fq.innerHTML=v.toFixed(1)+'<small>'+I18n.t(' kHz')+'</small>'}});
Knob('kb',{min:1.5,max:14,val:S.bw,fmt:v=>v.toFixed(1)+I18n.t(" kHz"),on:v=>{S.bw=v;setFilter()}});
Knob('kr',{min:.2,max:1.6,val:S.rf,fmt:v=>Math.round(v*100)+'%',on:v=>S.rf=v});

Knob('kv',{min:0,max:1,val:S.vol,fmt:v=>Math.round(v*100)+'%',on:v=>{S.vol=v;setFilter()}});
const bp=document.getElementById('bp');bp.onclick=power;
function tog(id,k){const b=document.getElementById(id);b.onclick=()=>{S[k]=!S[k];b.setAttribute('aria-pressed',S[k])}}
tog('bg','agc');tog('bs','sq');
const hint=document.getElementById('hint');
const renderHint=()=>{hint.innerHTML=ST.slice(0,5).map((s,i)=>`<div data-i="${i}"><span>${I18n.t(s.n)}</span><b>${s.f}${I18n.t(' kHz')}</b></div>`).join('')};renderHint();
 window.addEventListener('shtab:languagechange',()=>{renderHint();setFilter();bp.textContent=I18n.t(S.on?'Power Off':'Power On')});
let showH=false;document.getElementById('bh').onclick=function(){showH=!showH;hint.hidden=!showH;this.setAttribute('aria-pressed',showH)};
hint.onclick=e=>{const d=e.target.closest('[data-i]');if(d)document.getElementById('kt').focus()};
// --- scale and spectrum
const rfwater=document.getElementById('rfwater'),rfc=rfwater.getContext('2d');let rfTick=0;
const mb=document.getElementById('mb'),sv=document.getElementById('sv');
const spec=document.getElementById('spectrum'),sc=spec.getContext('2d'),water=document.getElementById('waterfall'),wc=water.getContext('2d');
const fftBins=new Uint8Array(1024);let fftFrame=0;
function drawFFT(){
 const w=spec.width,h=spec.height,ww=water.width,wh=water.height;
 sc.fillStyle='#06150c';sc.fillRect(0,0,w,h);
 sc.strokeStyle='#1b4930';sc.lineWidth=1;
 for(let k=0;k<=8;k++){let xx=k*w/8;sc.beginPath();sc.moveTo(xx,0);sc.lineTo(xx,h);sc.stroke()}
 for(let k=0;k<=4;k++){let yy=k*h/4;sc.beginPath();sc.moveTo(0,yy);sc.lineTo(w,yy);sc.stroke()}
 const active=!!(S.on&&ctx&&ctx.state==='running'&&analyser);
 if(active)analyser.getByteFrequencyData(fftBins);else fftBins.fill(0);
 const maxHz=12000,nyquist=SR/2,binHz=nyquist/fftBins.length;
 sc.beginPath();sc.lineWidth=1.6;sc.strokeStyle='#6aff8d';
 for(let x=0;x<w;x+=2){let hz=x/w*maxHz,idx=Math.min(fftBins.length-1,Math.floor(hz/binHz));let val=fftBins[idx]/255;let y=h-5-val*(h-13);if(x===0)sc.moveTo(x,y);else sc.lineTo(x,y)}sc.stroke();
 sc.fillStyle='#c1f7c7';sc.font='11px monospace';sc.fillText('AF LEVEL / dBFS',10,14);
 if(++fftFrame%3===0){wc.drawImage(water,-2,0);for(let y=0;y<wh;y++){
   let hz=(y/wh)*maxHz,idx=Math.min(fftBins.length-1,Math.floor(hz/binHz)),v=active?fftBins[idx]/255:0;
   const r=Math.floor(Math.max(0,(v-.38)*410)),g=Math.floor(v*240),b=Math.floor(20+v*130);
   wc.fillStyle=`rgb(${r},${g},${b})`;wc.fillRect(ww-2,y,2,1);
 }}
 document.getElementById('fftstatus').textContent=active?'LIVE FFT · 2048':I18n.t("AWAITING SIGNAL");
 document.getElementById('noiselevel').textContent=Math.round(S.atm*100)+'%';
}
function drawRFWaterfall(){
 const w=rfwater.width,h=rfwater.height;
 rfc.drawImage(rfwater,0,1,w,h-1);
 const row=rfc.createImageData(w,1),a=row.data;
 for(let x=0;x<w;x++){
  const f=SR_MIN+(x/w)*(SR_MAX-SR_MIN);let strength=.035+rnd()*(.06+S.atm*.10);
  if(S.on){for(const st of ST){const df=Math.abs(f-st.f);const fade=.73+.27*Math.sin(performance.now()*.0006+st.f);
   strength+=st.P*fade*Math.exp(-Math.pow(df/3.6,2))*.82;
   strength+=st.P*.16*Math.exp(-Math.pow(df/10,2));}}
  const v=Math.max(0,Math.min(1,strength)),j=x*4;
  a[j]=Math.min(255,Math.max(0,(v-.32)*590));a[j+1]=Math.min(255,v*235);a[j+2]=Math.min(255,20+v*145);a[j+3]=255;
 }
 rfc.putImageData(row,0,0);
 const xx=(S.tune-SR_MIN)/(SR_MAX-SR_MIN)*w;
 rfc.fillStyle='#ff7c56';rfc.fillRect(Math.round(xx),0,2,1);
 document.getElementById('rfstatus').textContent=S.on?I18n.t("RF / SYNTHETIC SPECTRUM"):I18n.t("RF / RECEIVER OFF");
}
function draw(){
 const sg=S.on?S.sig:0;
 mb.style.width=Math.min(100,sg*85)+'%';
 sv.textContent=sg>.03?'S'+Math.min(9,Math.round(1+sg*8)):'—';
 fq.style.opacity=S.on?1:.35;
 drawFFT();
 if(++rfTick%3===0)drawRFWaterfall();
 requestAnimationFrame(draw);
}
draw();

window.Radio={civilStations(){return ST.slice(0,5).map((s,i)=>({frequency:s.f,name:s.n,type:['Music broadcast','Amateur Morse','Voice broadcast','Numbers transmission','Radio teletype'][i]}))},setCrewLabels(labels){labels.forEach((name,index)=>{if(ST[index+5])ST[index+5].n=name})},setAtmosphere(level){S.atm=Math.max(0,Math.min(1,Number(level)||0))},getStream(){return window.sh95RadioStream||null}, isOn(){return S.on}, frequency(){return S.tune}, link(){if(!S.on)return -1;for(let i=5;i<8;i++)if(Math.abs(S.tune-ST[i].f)<=2)return i-5;return -1},
 quality(k){if(!S.on||!Number.isInteger(k)||k<0||k>2)return 0;const s=ST[5+k],df=Math.abs(S.tune-s.f),selectivity=Math.exp(-Math.pow(df/(S.bw*.65+1),2)),noise=.035+.018*S.bw+.12*S.atm,snr=(s.pw*selectivity)/noise,band=Math.min(1,S.bw/3);return Math.max(0,Math.min(1,band*snr/(snr+.65)))},
 setCrews(a){a.forEach((c,k)=>{const st=ST[5+k];st.f=c.f;st.n=c.label;
  st.mk=()=>codedTransmission(`DE ${k+1} AZ ${String(c.az).padStart(3,'0')} X ${String(c.x).padStart(5,'0')} Y ${String(c.y).padStart(5,'0')}`);
  if(ctx)st.g=st.mk();});randomCivilFrequencies();renderHint()}};
})();