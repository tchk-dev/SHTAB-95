
/* MG-95: PCM recording of the processed radio output, encoded as WAV. */
(()=>{'use strict';
const $=id=>document.getElementById(id),toggle=$('recToggle'),play=$('recPlay'),pause=$('recPause'),deleteBtn=$('recDelete'),audio=$('recAudio'),seek=$('recSeek'),speed=$('recSpeed'),state=$('recState'),panel=$('recorderPanel');
let recording=false,blocks=[],samples=0,sampleRate=44100,clipUrl=null,qualitySum=0,qualitySamples=0,recordStart=0,clock=null,limit=null,recordedPCM=null,recordedQuality=0,currentEntryId=null,pendingSave=null,recordTaskId=null;
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const say=t=>state.textContent=t;
const readQuality=()=>{const r=window.Radio;if(!r?.isOn())return 0;const k=r.link();return k>=0?r.quality(k):0};
function sample(){qualitySum+=readQuality();qualitySamples++;$('recDuration').textContent=fmt((performance.now()-recordStart)/1000)}
function resetPlayback(){recordTaskId=null;currentEntryId=null;deleteBtn.disabled=true;recordedPCM=null;$('recDecode').disabled=true;$('decodeStatus').textContent=I18n.t("NO RECORDING");$('decodeOutput').textContent=I18n.t("AWAITING AUDIO RECORDING");audio.pause();audio.removeAttribute('src');audio.load();play.disabled=pause.disabled=seek.disabled=true;seek.value=0;if(clipUrl){URL.revokeObjectURL(clipUrl);clipUrl=null}}
function wavEncode(chunks,count,rate){
 const buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
 const ascii=(pos,str)=>{for(let i=0;i<str.length;i++)view.setUint8(pos+i,str.charCodeAt(i))};
 ascii(0,'RIFF');view.setUint32(4,36+count*2,true);ascii(8,'WAVE');ascii(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
 ascii(36,'data');view.setUint32(40,count*2,true);
 let offset=44;for(const block of chunks){for(let i=0;i<block.length;i++){
  const v=Math.max(-1,Math.min(1,block[i]));view.setInt16(offset,v<0?v*32768:v*32767,true);offset+=2;
 }}return new Blob([buffer],{type:'audio/wav'});
}
function stop(){
 if(!recording)return;
 recording=false;window.GameClock?.lock('radio recording',false);window.sh95TapePCM=null;clearInterval(clock);clearTimeout(limit);clock=limit=null;
 panel.classList.remove('recording');toggle.textContent=I18n.t("● Record");
 const mean=qualitySamples?qualitySum/qualitySamples:0;recordedQuality=mean;
 $('recQuality').textContent=I18n.t("AVG. INTELLIGIBILITY: ")+Math.round(mean*100)+'%';
 if(!samples){say(I18n.t("NO AUDIO DATA"));return}
 try{recordedPCM=new Float32Array(samples);let pos=0;for(const b of blocks){recordedPCM.set(b,pos);pos+=b.length}const blob=wavEncode(blocks,samples,sampleRate);blocks=[];clipUrl=URL.createObjectURL(blob);$('recDecode').disabled=false;$('decodeStatus').textContent=I18n.t("READY FOR ANALYSIS");$('decodeOutput').textContent=I18n.t("PRESS DECODE RECORDING");
  audio.src=clipUrl;audio.playbackRate=Number(speed.value);play.disabled=pause.disabled=seek.disabled=false;
  say(I18n.t("RECORDING READY · SAVING…"));$('recDuration').textContent=fmt(samples/sampleRate);
  const id=Date.now(),frequency=Number((window.Radio?.frequency?.()||0).toFixed(1));currentEntryId=id;deleteBtn.disabled=false;
  const entry={taskId:recordTaskId,id,name:`REC_${new Date(id).toISOString().replace(/[-:]/g,'').slice(0,15)}.WAV`,blob,seconds:samples/sampleRate,quality:mean,frequency};
  pendingSave=window.sh95Archive?.save(entry);
  if(!pendingSave){say(I18n.t("IN-MEMORY RECORDING · ARCHIVE UNAVAILABLE"))}
  else pendingSave.then(ok=>{if(currentEntryId===id)say(ok?I18n.t("RECORDING SAVED · ")+fmt(samples/sampleRate):I18n.t("IN-MEMORY RECORDING · STORAGE UNAVAILABLE"))}).catch(err=>{if(currentEntryId===id)say(I18n.t("SAVE ERROR: ")+err.message)});
 }catch(e){blocks=[];say(I18n.t("SAVE ERROR: ")+e.message)}
}
function start(){
 const radio=window.Radio;
 if(!radio?.isOn()){say(I18n.t("TURN ON THE RADIO RECEIVER"));return}
 if(!window.sh95TapeSampleRate){say(I18n.t("AUDIO SYSTEM NOT READY"));return}
 resetPlayback();recordTaskId=window.sh95CurrentTaskId||null;blocks=[];samples=0;qualitySum=0;qualitySamples=0;
 sampleRate=window.sh95TapeSampleRate;recordStart=performance.now();
 $('recFreq').textContent=I18n.t("FREQUENCY: ")+Math.round(radio.frequency())+I18n.t(" kHz");
 $('recQuality').textContent=I18n.t("INTELLIGIBILITY: MEASURING");$('recDuration').textContent='00:00';
 recording=true;window.GameClock?.lock('radio recording',true);
 window.sh95TapePCM=(pcm,rate)=>{
  if(!recording)return;
  if(rate!==sampleRate){stop();say(I18n.t("SAMPLE RATE CHANGED"));return}
  const max=Math.floor(sampleRate*90),remaining=max-samples;
  if(remaining<=0){stop();return}
  const block=new Float32Array(Math.min(pcm.length,remaining));block.set(pcm.subarray(0,block.length));
  blocks.push(block);samples+=block.length;
  if(samples>=max)stop();
 };
 panel.classList.add('recording');toggle.textContent=I18n.t("■ Stop");say(I18n.t("● RECORDING"));
 sample();clock=setInterval(sample,250);limit=setTimeout(stop,91000);
}
// Narrow-band 690 Hz Morse detector: Goertzel power, adaptive threshold, timed symbols.
const REVERSE_MORSE={};
for(const [letter,pattern] of Object.entries({A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'}))REVERSE_MORSE[pattern]=letter;
function goertzelPower(pcm,begin,end,rate,hz){
 const omega=2*Math.PI*hz/rate,coeff=2*Math.cos(omega);let q1=0,q2=0;
 for(let i=begin;i<end;i++){const q=pcm[i]+coeff*q1-q2;q2=q1;q1=q}
 return Math.max(0,q1*q1+q2*q2-coeff*q1*q2)/Math.max(1,end-begin)**2;
}
function decodeAudio(pcm,rate,quality,seed){
 // Stable per-recording noise: re-decoding cannot reroll uncertain symbols.
 let rngState=(Number(seed)||0)>>>0;
 const seededRandom=()=>{rngState=(rngState+0x6D2B79F5)|0;let t=Math.imul(rngState^(rngState>>>15),1|rngState);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296};
 // The generator uses 90ms Morse units and a 690 Hz carrier; each frame spans 10ms.
 const hop=Math.max(1,Math.round(rate*.01)),energies=[];
 for(let a=0;a+hop<=pcm.length;a+=hop){
  const carrier=goertzelPower(pcm,a,a+hop,rate,690);
  const off=goertzelPower(pcm,a,a+hop,rate,1100);
  energies.push(Math.max(0,carrier-off*.6));
 }
 if(energies.length<20)return {text:'',message:I18n.t("RECORDING TOO SHORT")};
 const sorted=[...energies].sort((a,b)=>a-b),at=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];
 const floor=at(.18),peak=at(.93),contrast=peak/(floor+1e-12);
 if(peak<1e-8||contrast<2.0)return {text:'',message:I18n.t("COULD NOT ISOLATE MORSE SIGNAL")};
 const threshold=Math.max(floor*2.1,peak*.21),raw=energies.map(v=>v>threshold?1:0);
 // Close short gaps caused by noise, then reject spurious short pulses.
 function runs(arr){const out=[];let start=0;for(let i=1;i<=arr.length;i++)if(i===arr.length||arr[i]!==arr[start]){out.push({on:arr[start],start,len:i-start});start=i}return out}
 for(const r of runs(raw))if(!r.on&&r.len<=2&&r.start>0&&r.start+r.len<raw.length&&raw[r.start-1]&&raw[r.start+r.len])raw.fill(1,r.start,r.start+r.len);
 for(const r of runs(raw))if(r.on&&r.len<=2)raw.fill(0,r.start,r.start+r.len);
 const segments=runs(raw),marks=segments.filter(r=>r.on&&r.len>=3);
 if(marks.length<3)return {text:'',message:I18n.t("INSUFFICIENT RECOGNIZED PULSES")};
 // Fixed timing comes from the R-95 transmission protocol, not from hidden target data.
 const unit=9;let letters=[],symbol='',hasUnknown=false;
 const flush=()=>{if(symbol){const letter=REVERSE_MORSE[symbol]||'?';letters.push(letter);if(letter==='?')hasUnknown=true;symbol=''}};
 for(let i=0;i<segments.length;i++){
  const r=segments[i];if(r.on){if(r.len<3)continue;symbol+=r.len<unit*2?'.':'-';}
  else if(r.len>=unit*5){flush();if(letters.length&&letters[letters.length-1]!==' ')letters.push(' ')}
  else if(r.len>=unit*2){flush()}
 }
 flush();let transcript=letters.join('').trim().replace(/ +/g,' ');
 if(!transcript)return {text:'',message:I18n.t("TELEGRAM NOT RECOGNIZED")};
 // Reception quality affects confidence, with visible uncertainty rather than invented precision.
 const penalty=Math.pow(Math.max(0,1-quality),2)*.22;
 let errors=0;
 transcript=[...transcript].map(ch=>{if(ch===' '||ch==='?')return ch;if(seededRandom()<penalty){errors++;return '?'}return ch}).join('');
 return {text:transcript,errors,hasUnknown,contrast,message:transcript.includes('?')?I18n.t("SOME CHARACTERS NOT RECOGNIZED"):I18n.t("TELEGRAM RECOGNIZED")};
}
$('recDecode').onclick=()=>{
 if(!recordedPCM||recording){$('decodeStatus').textContent=I18n.t("NO RECORDING READY");return}
 const btn=$('recDecode');btn.disabled=true;$('decodeStatus').textContent=I18n.t("ANALYZING SIGNAL…");
 // Defer CPU work to allow the UI to show the analysis state.
 setTimeout(()=>{
  try{
   const r=decodeAudio(recordedPCM,sampleRate,recordedQuality,currentEntryId);
   $('decodeOutput').textContent=(r.text||'—')+'\n\n'+r.message+'\n'+I18n.t('AVG. INTELLIGIBILITY: ')+Math.round(recordedQuality*100)+'%'+(r.errors?'\n'+I18n.t('UNCERTAIN CHARACTERS: ')+r.errors:'');
   $('decodeStatus').textContent=r.text?I18n.t("ANALYSIS COMPLETE"):I18n.t("SIGNAL NOT RECOGNIZED");
   // Populate mission data only when all required fields are recognized.
   // Never substitute real hidden coordinates when decoding fails.
   const matches=[...(r.text||'').matchAll(/(?:^|\s)DE\s+([123])\s+AZ\s+\d{3}\s+X\s+(\d{5})\s+Y\s+(\d{5})(?=\s|$)/g)];
   if(matches.length){
    const m=matches[0],ok=window.sh95AcceptDecodedCoordinates?.(Number(m[1]),Number(m[2]),Number(m[3]),recordTaskId);
    if(ok){$('decodeStatus').textContent=I18n.t("COORDINATES TRANSMITTED");$('decodeOutput').textContent+='\n\n'+I18n.t('✓ COORDINATES ADDED TO MISSION DATA')}
    else $('decodeOutput').textContent+='\n\n'+I18n.t('⚠ WRONG MISSION OR UNCONFIRMED CREW — COORDINATES NOT ADDED');
   }else if(r.text){$('decodeOutput').textContent+='\n\n'+I18n.t('⚠ INSUFFICIENT DATA TO TRANSFER COORDINATES');}

  }catch(e){$('decodeStatus').textContent=I18n.t("DECODING ERROR");$('decodeOutput').textContent=String(e.message||e)}
  btn.disabled=false;
 },30);
};

window.sh95LoadTape=async(entry)=>{
 if(recording)stop();resetPlayback();
 const buf=await entry.blob.arrayBuffer();
 const ac=new (window.AudioContext||window.webkitAudioContext)();let decoded;
 try{decoded=await ac.decodeAudioData(buf.slice(0))}finally{await ac.close()}
 sampleRate=decoded.sampleRate;recordedPCM=new Float32Array(decoded.length);
 for(let c=0;c<decoded.numberOfChannels;c++){const data=decoded.getChannelData(c);for(let i=0;i<data.length;i++)recordedPCM[i]+=data[i]/decoded.numberOfChannels}
 recordedQuality=entry.quality;currentEntryId=entry.id;recordTaskId=entry.taskId||null;deleteBtn.disabled=false;clipUrl=URL.createObjectURL(entry.blob);audio.src=clipUrl;audio.playbackRate=Number(speed.value);
 play.disabled=pause.disabled=seek.disabled=$('recDecode').disabled=false;
 $('recQuality').textContent=I18n.t("AVG. INTELLIGIBILITY: ")+Math.round(entry.quality*100)+'%';
 $('recFreq').textContent=I18n.t("FREQUENCY: ")+entry.frequency+I18n.t(" kHz");$('recDuration').textContent=fmt(entry.seconds);
 $('decodeStatus').textContent=I18n.t("READY FOR ANALYSIS");$('decodeOutput').textContent=I18n.t("ARCHIVED RECORDING · PRESS DECODE RECORDING");say(I18n.t("OPENED: ")+entry.name);
};
deleteBtn.onclick=async()=>{
 if(recording){say(I18n.t("STOP RECORDING FIRST"));return}
 if(!recordedPCM&&!audio.src){say(I18n.t("NO RECORDING TO DELETE"));return}
 if(!confirm(I18n.t("Delete current recording from MG-95 and Doors 95 archive?")))return;
 const id=currentEntryId;
 deleteBtn.disabled=true;
 // Wait for saving to finish so a deleted recording cannot reappear.
 try{if(pendingSave)await pendingSave;if(id!=null&&await window.sh95Archive?.remove(id)===false)throw new Error(I18n.t("Unable to delete archive recording"))}
 catch(err){say(I18n.t("DELETE ERROR: ")+err.message);deleteBtn.disabled=false;return}
 pendingSave=null;resetPlayback();$('recDuration').textContent='00:00';
 $('recQuality').textContent=I18n.t("INTELLIGIBILITY: —");$('recFreq').textContent=I18n.t("FREQUENCY: —");
 say(I18n.t("RECORDING DELETED"));window.sh95Archive?.refresh();
};
toggle.onclick=()=>recording?stop():start();
play.onclick=async()=>{if(!audio.src)return;audio.playbackRate=Number(speed.value);try{await audio.play();say(I18n.t("▶ PLAYBACK"))}catch(e){say(I18n.t("PLAYBACK ERROR"))}};
pause.onclick=()=>{audio.pause();say(I18n.t("Ⅱ PAUSED"))};
speed.onchange=()=>{audio.playbackRate=Number(speed.value)};
audio.ontimeupdate=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){seek.value=Math.round(audio.currentTime/audio.duration*1000);if(!recording)$('recDuration').textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration)}};
audio.onended=()=>say(I18n.t("PLAYBACK COMPLETE"));
seek.oninput=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(seek.value)/1000*audio.duration};
window.addEventListener('shtab:languagechange',()=>{
 toggle.textContent=I18n.t(recording?'■ Stop':'● Record');
 // Keep measured values, but rebuild their localized labels.
 const frequency=$('recFreq'),freqMatch=frequency.textContent.match(/(\d+(?:\.\d+)?)/);
 if(freqMatch)frequency.textContent=I18n.t('FREQUENCY: ')+freqMatch[1]+I18n.t(' kHz');
 const quality=$('recQuality'),qualityMatch=quality.textContent.match(/(\d+(?:\.\d+)?)\s*%/);
 if(qualityMatch)quality.textContent=I18n.t('AVG. INTELLIGIBILITY: ')+qualityMatch[1]+'%';
});
window.addEventListener('beforeunload',()=>{window.sh95TapePCM=null;if(clipUrl)URL.revokeObjectURL(clipUrl)});
})();
