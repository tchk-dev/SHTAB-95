/* BVK-95: offline field calculation workspace. No automatic firing solutions. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const launch=$('smbvk'),panel=document.querySelector('.field-tools');
if(!launch||!panel)return;
const root=document.createElement('section');
root.id='bvkWindow';root.className='bvk-window';root.hidden=true;
root.setAttribute('role','dialog');root.setAttribute('aria-label','BVK-95 Ballistic Computing Complex');
root.innerHTML=`
 <header class="bvk-title"><strong>▤ BVK-95 · BALLISTIC COMPUTING COMPLEX</strong><button id="bvkClose" type="button" aria-label="Close BVK-95">×</button></header>
 <nav class="bvk-tabs" aria-label="BVK-95 tools"><button data-bvk-tab="calculator" class="selected">Calculator</button><button data-bvk-tab="reference">Reference</button><button data-bvk-tab="worksheet">Worksheet</button><button data-bvk-tab="notes">Notepad</button><button data-bvk-tab="guide">Help</button></nav>
 <div class="bvk-body">
  <section data-bvk-page="calculator" id="bvkCalculator"></section>
  <section data-bvk-page="reference" hidden><h3>AMMUNITION REFERENCE · 1995</h3><table class="bvk-table"><thead><tr><th>Charge</th><th>Projectile</th><th>Muzzle velocity</th></tr></thead><tbody><tr><td>1</td><td>OF-41 Sokol</td><td>250 m/s</td></tr><tr><td>2</td><td>OF-42 Krechet</td><td>350 m/s</td></tr><tr><td>3</td><td>OF-43M Granit</td><td>450 m/s</td></tr><tr><td>4</td><td>OF-44 Buran</td><td>550 m/s</td></tr><tr><td>5</td><td>OF-45 Grom</td><td>800 m/s</td></tr></tbody></table><p>Reference velocities are taken from the game's ammunition list. They are not firing solutions. Actual impact also depends on the simulation's conditions.</p></section>
  <section data-bvk-page="worksheet" hidden><h3>FIELD WORKSHEET · USER DATA</h3><p>Enter your measurements and intermediate results. Differences are calculated automatically. No targeting values are supplied by the program.</p><div class="bvk-scroll"><table class="bvk-table" id="bvkSheet"><thead><tr><th>#</th><th>Label</th><th>Value A</th><th>Value B</th><th>Difference (B − A)</th></tr></thead><tbody></tbody></table></div><button type="button" id="bvkClearSheet">Clear worksheet</button><p class="bvk-muted">Stored locally in this browser.</p></section>
  <section data-bvk-page="notes" hidden><h3>FIELD NOTES</h3><textarea id="bvkNotes" spellcheck="false" placeholder="Coordinates, intermediate results, observations…"></textarea><p class="bvk-muted">Autosaved in this browser.</p></section>
  <section data-bvk-page="guide" hidden><h3>WORKSTATION GUIDE</h3><ol><li>Read mission data and inspect the tactical map.</li><li>Consult the ammunition reference for available charges.</li><li>Use the calculator for arithmetic and trigonometry. Trigonometric functions use radians; convert degrees with π/180.</li><li>Record measurements and intermediate results in the worksheet or notepad.</li><li>Choose and transmit your own settings from the Fire Mission panel.</li><li>Use the crew's report to review your work. BVK-95 deliberately does not calculate a complete firing solution.</li></ol><p>The worksheet is a scratchpad, not a ballistic lookup table. A detailed model-consistent firing table is planned separately.</p></section>
 </div>
 <footer class="bvk-status">BVK-95 · OFFLINE · MANUAL CALCULATION</footer>`;
document.body.append(root);
const calcTarget=$('bvkCalculator');
const morse=panel.querySelector('.manual-morse');
if(morse){const holder=document.createElement('div');holder.className='panel';holder.innerHTML='<h3>Manual Morse Analyzer</h3><div class="b"></div>';holder.querySelector('.b').append(morse);panel.before(holder)}
calcTarget.append(panel);
panel.querySelector('h3').textContent='Scientific Graphing Calculator';
const show=()=>{root.hidden=false;$('startmenu').hidden=true;root.style.zIndex='1201';};
const close=()=>{root.hidden=true;launch.focus()};
launch.addEventListener('click',show);
$('bvkClose').addEventListener('click',close);
root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
root.querySelectorAll('[data-bvk-tab]').forEach(b=>b.addEventListener('click',()=>{
 root.querySelectorAll('[data-bvk-tab]').forEach(t=>t.classList.toggle('selected',t===b));
 root.querySelectorAll('[data-bvk-page]').forEach(p=>p.hidden=p.dataset.bvkPage!==b.dataset.bvkTab);
}));
const key='SHTAB95_BVK_WORKSHEET_V1',noteKey='SHTAB95_BVK_NOTES_V1';
const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
const body=$('bvkSheet').querySelector('tbody');
let values=read(key,Array.from({length:10},()=>['','','']));
if(!Array.isArray(values)||values.length!==10)values=Array.from({length:10},()=>['','','']);
const save=()=>{try{localStorage.setItem(key,JSON.stringify(values))}catch{}};
function render(){
 body.replaceChildren();
 values.forEach((row,i)=>{
  const tr=document.createElement('tr'),num=document.createElement('td');num.textContent=String(i+1);tr.append(num);
  for(let j=0;j<3;j++){
   const td=document.createElement('td'),input=document.createElement('input');
   input.type=j===0?'text':'number';input.step='any';input.value=row[j]??'';
   input.setAttribute('aria-label','Row '+(i+1)+' '+['label','value A','value B'][j]);
   input.addEventListener('input',()=>{values[i][j]=input.value;save();update()});
   td.append(input);tr.append(td)
  }
  const delta=document.createElement('td');delta.className='bvk-delta';tr.append(delta);body.append(tr);
 });
 update();
}
function update(){body.querySelectorAll('tr').forEach((tr,i)=>{
 const a=values[i][1],b=values[i][2],cell=tr.querySelector('.bvk-delta');
 cell.textContent=a!==''&&b!==''&&Number.isFinite(Number(a))&&Number.isFinite(Number(b))?String(Number((Number(b)-Number(a)).toPrecision(10))):'—';
})}
$('bvkClearSheet').addEventListener('click',()=>{if(!confirm('Clear all worksheet entries?'))return;values=Array.from({length:10},()=>['','','']);save();render()});
const notes=$('bvkNotes');notes.value=read(noteKey,'');notes.addEventListener('input',()=>{try{localStorage.setItem(noteKey,JSON.stringify(notes.value))}catch{}});
render();
})();
