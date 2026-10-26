/* Doors 95 window manager — shared focus, drag, minimize, maximize and task buttons. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const task=$('taskMap')?.parentElement;
if(!task)return;
const registry=new Map();
let topZ=200,drag=null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function focus(w){
 if(w.hidden)return;
 w.style.zIndex=String(++topZ);
 registry.forEach(a=>{a.window.classList.toggle('doors-active',a.window===w);a.button.classList.toggle('active',a.window===w&&!a.minimized)});
}
function sync(a){
 a.button.hidden=a.window.hidden&&!a.minimized;
 a.button.classList.toggle('doors-minimized',a.minimized);
 a.button.setAttribute('aria-pressed',String(!a.window.hidden&&!a.minimized));
}
function minimize(a){a.minimized=true;a.window.hidden=true;sync(a)}
function restore(a){a.minimized=false;a.window.hidden=false;sync(a);focus(a.window);window.dispatchEvent(new Event('resize'))}
function toggleMax(a){
 const w=a.window;
 if(!a.maximized){a.saved={left:w.style.left,top:w.style.top,width:w.style.width,height:w.style.height,transform:w.style.transform};w.classList.add('doors-maximized');w.style.left='0px';w.style.top='0px';w.style.width='100vw';w.style.height='calc(100vh - 42px)';w.style.transform='none';a.maximized=true}
 else{w.classList.remove('doors-maximized');Object.assign(w.style,a.saved);a.maximized=false}
 focus(w);window.dispatchEvent(new Event('resize'))
}
function register(id,label,existingTab){
 const w=$(id);if(!w)return;
 const title=w.querySelector('.game-title,.bvk-title,.doors-title');
 if(!title)return;
 w.classList.add('doors-managed');
 if(!w.style.left){w.style.left=(80+registry.size*34)+'px';w.style.top=(70+registry.size*28)+'px';w.style.transform='none'}
 let button=existingTab||document.createElement('button');
 if(!existingTab){button.type='button';button.className='tb doors-task';button.textContent=label;task.insertBefore(button,$('clock'))}
 else{button.textContent=label;button.classList.add('doors-task')}
 const a={window:w,button,minimized:false,maximized:false,saved:null};registry.set(id,a);
 const controls=document.createElement('span');controls.className='doors-controls';
 const mini=document.createElement('button');mini.type='button';mini.textContent='_';mini.title='Minimize';mini.setAttribute('aria-label','Minimize '+label);
 const maxi=document.createElement('button');maxi.type='button';maxi.textContent='□';maxi.title='Maximize or restore';maxi.setAttribute('aria-label','Maximize '+label);
 controls.append(mini,maxi);
 const existingClose=title.querySelector('[data-close-game],#bvkClose');
 if(existingClose)title.insertBefore(controls,existingClose);else title.append(controls);
 mini.addEventListener('click',e=>{e.stopPropagation();minimize(a)});
 maxi.addEventListener('click',e=>{e.stopPropagation();toggleMax(a)});
 button.addEventListener('click',()=>{if(a.minimized||w.hidden)restore(a);else if(w.classList.contains('doors-active'))minimize(a);else focus(w)});
 w.addEventListener('pointerdown',()=>focus(w));
 title.addEventListener('dblclick',e=>{if(!e.target.closest('button'))toggleMax(a)});
 title.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button')||a.maximized)return;
  const rect=w.getBoundingClientRect();drag={w,id:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top};
  title.setPointerCapture(e.pointerId);e.preventDefault();focus(w)
 });
 title.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||drag.w!==w)return;
  w.style.left=clamp(e.clientX-drag.dx,0,Math.max(0,innerWidth-80))+'px';
  w.style.top=clamp(e.clientY-drag.dy,0,Math.max(0,innerHeight-70))+'px';
 });
 const stop=e=>{if(drag&&drag.id===e.pointerId&&drag.w===w)drag=null};
 title.addEventListener('pointerup',stop);title.addEventListener('pointercancel',stop);
 new MutationObserver(()=>{if(!w.hidden){a.minimized=false;focus(w)}sync(a)}).observe(w,{attributes:true,attributeFilter:['hidden']});
 sync(a);
 return a
}
// Reuse the original map/radio DOM nodes: no duplicate canvases or radio state.
function sectionWindow(sectionId,id,title){
 const section=$(sectionId);if(!section)return;
 const w=document.createElement('div');w.id=id;w.className='doors-section-window';w.setAttribute('role','region');w.setAttribute('aria-label',title);
 w.innerHTML='<div class="doors-title"><strong></strong></div><div class="doors-window-body"></div>';
 w.querySelector('strong').textContent=title;
 section.parentNode.insertBefore(document.createComment(title+' moved to window manager'),section);
 w.querySelector('.doors-window-body').append(section);
 document.body.append(w);
 return w
}
sectionWindow('mapSection','doorsMapWindow','▤ Tactical Map');
sectionWindow('radioSection','doorsRadioWindow','▥ R-95 Radio');
const map=register('doorsMapWindow','▤ Map',$('taskMap'));
const radio=register('doorsRadioWindow','▥ Radio',$('taskRadio'));
register('minesWindow','▦ Minesweeper');
register('solWindow','♠ Solitaire');
if($('bvkWindow'))register('bvkWindow','▤ BVK-95');
if(map)restore(map);
if(radio)restore(radio);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)drag=null});
window.Doors95Windows={register,open:id=>{const a=registry.get(id);if(a)restore(a)},minimize:id=>{const a=registry.get(id);if(a)minimize(a)}};
})();
