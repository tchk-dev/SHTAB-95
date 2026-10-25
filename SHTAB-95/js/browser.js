/* DoorsNet: local-only hypertext browser. Never navigates to the public internet. */
(()=>{
'use strict';
const sites=new Map();
function register(site){
 if(!site||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/i.test(site.address)||typeof site.title!=='string')return false;
 sites.set(site.address.toLowerCase(),{...site,links:Array.isArray(site.links)?site.links:[]});return true;
}
(window.SHTAB_WEB_SITES||[]).forEach(register);
const tr=(en,ru)=>window.I18n?.language==='ru'?ru:en;
const windowEl=document.createElement('section');
windowEl.id='doorsBrowser';windowEl.className='doors-browser';windowEl.hidden=true;
windowEl.setAttribute('role','dialog');windowEl.setAttribute('aria-label','DoorsNet Browser');
windowEl.innerHTML=`<header class="db-title"><strong>🌐 DoorsNet Navigator 95</strong><button id="dbClose" type="button" aria-label="Close">×</button></header>
<nav class="db-toolbar"><button id="dbBack" type="button">◀ Back</button><button id="dbForward" type="button">Forward ▶</button><button id="dbHome" type="button">⌂ Home</button><button id="dbReload" type="button">↻ Reload</button></nav>
<form id="dbForm" class="db-address"><label for="dbUrl">Address:</label><input id="dbUrl" autocomplete="off" spellcheck="false" aria-label="Website address"><button type="submit">Go</button></form>
<main id="dbPage" class="db-page" tabindex="0"></main><footer class="db-status" id="dbStatus">Ready</footer>`;
document.body.append(windowEl);
const $=id=>document.getElementById(id),page=$('dbPage'),address=$('dbUrl');
let history=['home.net'],index=0;
const current=()=>history[index];
function render(){
 const name=current(),site=sites.get(name);address.value='doors://'+name;
 $('dbBack').disabled=index===0;$('dbForward').disabled=index===history.length-1;
 page.replaceChildren();
 if(!site){
  const h=document.createElement('h1');h.textContent=tr('Page not found','Страница не найдена');
  const p=document.createElement('p');p.textContent=tr('No page is registered at this address.','По этому адресу нет зарегистрированной страницы.');
  page.append(h,p);$('dbStatus').textContent='404 · '+name;return;
 }
 const h=document.createElement('div');h.className='db-site-heading';h.textContent=site.title;
 const body=document.createElement('article');body.className='db-content';
 // HTML is bundled by the game developer, not downloaded or supplied by visitors.
 body.innerHTML=site.html||'';
 page.append(h,body);
 if(site.links.length){
  const list=document.createElement('div');list.className='db-links';
  for(const link of site.links){
   const a=document.createElement('button');a.type='button';a.className='db-link';
   a.textContent=(sites.get(link)?.title||link)+'  ['+link+']';a.addEventListener('click',()=>navigate(link));list.append(a);
  }page.append(list);
 }
 page.scrollTop=0;$('dbStatus').textContent=tr('Document loaded','Документ загружен')+' · doors://'+name;
}
function normalize(value){return value.trim().toLowerCase().replace(/^(doors:\/\/|https?:\/\/)/,'').replace(/\/$/,'');}
function navigate(raw){const name=normalize(raw);if(!name)return;history=history.slice(0,index+1);history.push(name);index++;render();}
$('dbForm').addEventListener('submit',e=>{e.preventDefault();navigate(address.value)});
$('dbBack').onclick=()=>{if(index>0){index--;render()}};
$('dbForward').onclick=()=>{if(index<history.length-1){index++;render()}};
$('dbHome').onclick=()=>navigate('home.net');$('dbReload').onclick=render;
$('dbClose').onclick=()=>{windowEl.hidden=true};
const launcher=document.createElement('button');launcher.id='smBrowser';launcher.type='button';launcher.textContent='🌐 DoorsNet Browser';
const menu=document.querySelector('#startmenu .start-options');const sep=menu?.querySelector('.start-separator');
if(menu)menu.insertBefore(launcher,sep||menu.firstChild);
const task=document.querySelector('.task');const tab=document.createElement('button');tab.type='button';tab.className='tb';tab.textContent='🌐 Browser';tab.id='taskBrowser';
task?.insertBefore(tab,task.querySelector('.clock'));
function open(){windowEl.hidden=false;document.getElementById('startmenu').hidden=true;render();address.focus();}
launcher.onclick=open;tab.onclick=()=>windowEl.hidden?open():windowEl.hidden=true;
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!windowEl.hidden)windowEl.hidden=true});
window.DoorsNet={register,navigate,open};
render();
})();
