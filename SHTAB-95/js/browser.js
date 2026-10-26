/* DoorsNet: local-only hypertext browser. Never navigates to the public internet. */
(()=>{
'use strict';
const sites=new Map();
function register(site){
 if(!site||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/i.test(site.address)||typeof site.title!=='string')return false;
 sites.set(site.address.toLowerCase(),{...site,links:Array.isArray(site.links)?site.links:[]});return true;
}
(window.SHTAB_WEB_SITES||[]).forEach(register);
const tr=(key)=>window.I18n?.t?.(key)||key;
const windowEl=document.createElement('section');
windowEl.id='doorsBrowser';windowEl.className='doors-browser';windowEl.hidden=true;
windowEl.setAttribute('role','dialog');windowEl.setAttribute('aria-label','DoorsNet Browser');
windowEl.innerHTML=`<header class="db-title"><span class="db-window-icon" aria-hidden="true">◧</span><strong>DoorsNet Navigator - Microhard Doors 95</strong><span class="db-window-controls"><button class="cb" id="dbMinimize" type="button" aria-label="Minimize">_</button><button class="cb" id="dbMaximize" type="button" aria-label="Maximize">□</button><button class="cb x" id="dbClose" type="button" aria-label="Close">×</button></span></header>
<div class="db-menubar" aria-label="Browser menu"><button type="button" id="dbFile">File</button><button type="button" id="dbEdit">Edit</button><button type="button" id="dbView">View</button><button type="button" id="dbFavorites" aria-expanded="false">Favorites</button><button type="button" id="dbHelp">Help</button></div>
<nav class="db-toolbar" aria-label="Navigation"><button id="dbBack" type="button" title="Back" aria-label="Back"><span aria-hidden="true">◀</span></button><button id="dbForward" type="button" title="Forward" aria-label="Forward"><span aria-hidden="true">▶</span></button><span class="db-toolbar-divider"></span><button id="dbHome" type="button" title="Home" aria-label="Home"><span aria-hidden="true">⌂</span></button><button id="dbReload" type="button" title="Refresh" aria-label="Refresh"><span aria-hidden="true">↻</span></button><span class="db-toolbar-divider"></span><span class="db-brand" aria-label="Microhard Doors"><span class="db-door-mark" aria-hidden="true"><i></i><i></i></span><span>Microhard<br><b>Doors</b></span></span></nav>
<form id="dbForm" class="db-address"><label for="dbUrl">Address:</label><input id="dbUrl" autocomplete="off" spellcheck="false" aria-label="Website address"><button type="submit">Go</button></form>
<div class="db-popup" id="dbPopup" hidden></div><form id="dbConsole" class="db-console" hidden><label for="dbCommand">DoorsNet&gt;</label><input id="dbCommand" autocomplete="off" spellcheck="false" placeholder="inspect | text New heading | save-image | help"><button type="submit">Run</button><button type="button" id="dbConsoleClose">×</button><div id="dbConsoleOutput" role="status">Type help for commands.</div></form><main id="dbPage" class="db-page" tabindex="0"></main><footer class="db-status" id="dbStatus">Ready</footer>`;
document.body.append(windowEl);
const $=id=>document.getElementById(id),page=$('dbPage'),address=$('dbUrl');
let history=['home.net'],index=0;
const favoriteKey='sh95-doorsnet-favorites';
let favorites=[];try{const saved=JSON.parse(localStorage.getItem(favoriteKey)||'[]');if(Array.isArray(saved))favorites=saved.filter(v=>typeof v==='string'&&sites.has(v));}catch{}
let viewClicks=[];
let selectedElement=null,inspectMode=false;
const current=()=>history[index];
function render(){
 selectedElement=null;inspectMode=false;page.classList.remove('db-inspecting');
 const name=current(),site=sites.get(name);address.value='doors://'+name;
 $('dbBack').disabled=index===0;$('dbForward').disabled=index===history.length-1;
 page.replaceChildren();
 if(!site){
  const h=document.createElement('h1');h.textContent=tr('Page not found');
  const p=document.createElement('p');p.textContent=tr('No page is registered at this address.');
  page.append(h,p);$('dbStatus').textContent='404 · '+name;return;
 }
 const h=document.createElement('div');h.className='db-site-heading';h.textContent=site.title;
 const body=document.createElement('article');body.className='db-content';
 // HTML is bundled by the game developer, not downloaded or supplied by visitors.
 body.innerHTML=site.html||'';
 page.append(h,body);
 const star=document.createElement('button');star.type='button';star.className='db-star';star.setAttribute('aria-label','Toggle favorite');star.textContent=favorites.includes(name)?'★':'☆';star.title=favorites.includes(name)?'Remove from Favorites':'Add to Favorites';star.onclick=()=>{favorites=favorites.includes(name)?favorites.filter(v=>v!==name):[...favorites,name];try{localStorage.setItem(favoriteKey,JSON.stringify(favorites))}catch{}render()};h.append(star);
 if(site.links.length){
  const list=document.createElement('div');list.className='db-links';
  for(const link of site.links){
   const a=document.createElement('a');a.href='doors://'+link;a.className='db-link';
   a.textContent=(sites.get(link)?.title||link)+'  ['+link+']';a.addEventListener('click',e=>{e.preventDefault();navigate(link)});list.append(a);
  }page.append(list);
 }
 page.scrollTop=0;$('dbStatus').textContent=tr('Document loaded')+' · doors://'+name;
}
function normalize(value){return value.trim().toLowerCase().replace(/^(doors:\/\/|https?:\/\/)/,'').replace(/\/$/,'');}
function navigate(raw){const name=normalize(raw);if(!name)return;history=history.slice(0,index+1);history.push(name);index++;render();}

const popup=$('dbPopup'),consolePanel=$('dbConsole');
let popupKind=null;
function showPopup(kind){popupKind=kind;popup.hidden=false;$('dbFavorites').setAttribute('aria-expanded',String(kind==='favorites'))}
function selectElement(el){if(selectedElement)selectedElement.classList.remove('db-selected');selectedElement=el;selectedElement.classList.add('db-selected');$('dbConsoleOutput').textContent='Selected: '+el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).join('.'): '');}
page.addEventListener('click',e=>{if(!inspectMode)return;const el=e.target.closest('.db-content *');if(!el||!page.contains(el))return;e.preventDefault();e.stopPropagation();selectElement(el);inspectMode=false;page.classList.remove('db-inspecting')},true);
function hidePopup(){popupKind=null;popup.hidden=true;$('dbFavorites').setAttribute('aria-expanded','false')}
function toggleFavorites(){
 if(!popup.hidden&&popupKind==='favorites'){hidePopup();return}
 popup.replaceChildren();const heading=document.createElement('strong');heading.textContent='Favorites';popup.append(heading);
 if(!favorites.length){const empty=document.createElement('p');empty.textContent='No favorite sites yet. Click ☆ on a page.';popup.append(empty)}
 for(const name of favorites){const button=document.createElement('button');button.type='button';button.textContent='★ '+(sites.get(name)?.title||name)+' — '+name;button.onclick=()=>{navigate(name);hidePopup()};popup.append(button)}
 showPopup('favorites');
}
$('dbFile').onclick=()=>{hidePopup();if(typeof window.sh95OpenFiles==='function')window.sh95OpenFiles();else $('dbStatus').textContent='File Manager unavailable'};
$('dbEdit').onclick=()=>{hidePopup();consolePanel.hidden=!consolePanel.hidden;if(!consolePanel.hidden)$('dbCommand').focus()};
$('dbConsoleClose').onclick=()=>{consolePanel.hidden=true};
$('dbConsole').addEventListener('submit',e=>{
 e.preventDefault();
 const input=$('dbCommand').value.trim();
 const output=$('dbConsoleOutput');
 const match=input.match(/^(?:open|goto|go)\\s+(.+)$/i);
 if(match){const name=normalize(match[1]);if(sites.has(name)){navigate(name);output.textContent='Opened doors://'+name}else output.textContent='Unknown site: '+name}
 else if(/^help$/i.test(input))output.textContent='inspect (then click element) | select <CSS selector> | text <new text> | save-image [filename] | list | open <site> | help';
 else if(/^list$/i.test(input))output.textContent=[...sites.keys()].join(' · ');
 else if(/^inspect$/i.test(input)){inspectMode=true;page.classList.add('db-inspecting');output.textContent='Click an element on the page to inspect it.'}
 else if(/^select\\s+(.+)$/i.test(input)){
  try{const el=page.querySelector('.db-content').querySelector(input.replace(/^select\\s+/i,''));if(el)selectElement(el);else output.textContent='Element not found.'}
  catch{output.textContent='Invalid CSS selector.'}
 }
 else if(/^text\\s+([\\s\\S]+)$/i.test(input)){
  if(!selectedElement||!selectedElement.isConnected)output.textContent='Select an element first (inspect or select).';
  else {selectedElement.textContent=input.replace(/^text\\s+/i,'');output.textContent='Text changed locally. Reload resets the page.'}
 }
 else if(/^save-image(?:\\s+(.+))?$/i.test(input)){
  if(!selectedElement||!selectedElement.isConnected)output.textContent='Select an image first.';
  else {
   const img=selectedElement.closest('img')||selectedElement.querySelector('img');
   if(!img)output.textContent='Selected element has no image.';
   else {
    const src=img.getAttribute('src')||'';
    const url=new URL(src,document.baseURI);
    if(url.origin!==location.origin||!/^https?:$/.test(url.protocol))output.textContent='Only bundled local images can be saved.';
    else {
     const filename=input.match(/^save-image(?:\\s+(.+))?$/i)[1];
     const a=document.createElement('a');a.href=url.href;a.download=(filename||url.pathname.split('/').pop()||'image.png').replace(/[^a-z0-9._-]/gi,'_');a.click();
     output.textContent='Image download requested: '+a.download;
    }
   }
  }
 }
 else output.textContent='Unknown command. Type help.';
 $('dbCommand').value='';
});
$('dbView').onclick=()=>{
 const now=performance.now();viewClicks=viewClicks.filter(t=>now-t<1800);viewClicks.push(now);
 if(viewClicks.length>=5){viewClicks=[];document.documentElement.classList.toggle('doors-pink-wallpaper');$('dbStatus').textContent='Desktop color changed'}
};
$('dbFavorites').onclick=toggleFavorites;
$('dbHelp').onclick=()=>{if(!popup.hidden&&popupKind==='help'){hidePopup();return}hidePopup();popup.replaceChildren();const title=document.createElement('strong');title.textContent='Contact the developer';const note=document.createElement('p');note.textContent='Contact service is not available yet. Please try again in a future version.';popup.append(title,note);showPopup('help')};

$('dbForm').addEventListener('submit',e=>{e.preventDefault();navigate(address.value)});
$('dbBack').onclick=()=>{if(index>0){index--;render()}};
$('dbForward').onclick=()=>{if(index<history.length-1){index++;render()}};
$('dbHome').onclick=()=>navigate('home.net');$('dbReload').onclick=render;
$('dbClose').onclick=()=>{windowEl.hidden=true;hidePopup()};
$('dbMinimize').onclick=()=>{windowEl.hidden=true};
$('dbMaximize').onclick=()=>{windowEl.classList.toggle('db-maximized')};
const launcher=document.createElement('button');launcher.id='smBrowser';launcher.type='button';launcher.innerHTML='<span class="start-icon" aria-hidden="true">◧</span><span>DoorsNet Browser</span>';
const menu=document.querySelector('#startmenu .start-options');const sep=menu?.querySelector('.start-separator');
if(menu)menu.insertBefore(launcher,sep||menu.firstChild);
const task=document.querySelector('.task');const tab=document.createElement('button');tab.type='button';tab.className='tb';tab.textContent='◧ Browser';tab.id='taskBrowser';
task?.insertBefore(tab,task.querySelector('.clock'));
function open(){windowEl.hidden=false;document.getElementById('startmenu').hidden=true;render();address.focus();}
launcher.onclick=open;tab.onclick=()=>windowEl.hidden?open():windowEl.hidden=true;
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!windowEl.hidden)windowEl.hidden=true});
window.DoorsNet={register,navigate,open};
render();
})();
