
/* Doors 95: IndexedDB-backed local radio recordings. */
(()=>{'use strict';
const $=id=>document.getElementById(id),list=$('filesList'),info=$('filesInfo'),player=$('filesAudio');
let dbPromise=null,playingUrl=null;const fallback=[];
function database(){if(dbPromise)return dbPromise;dbPromise=new Promise(resolve=>{
 if(!window.indexedDB){resolve(null);return}
 try{const r=indexedDB.open('sh95-recordings',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('audio'))r.result.createObjectStore('audio',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);r.onblocked=()=>resolve(null)}catch(e){resolve(null)}
 });return dbPromise}
async function all(){const db=await database();if(!db)return [...fallback];return new Promise(resolve=>{try{const r=db.transaction('audio','readonly').objectStore('audio').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>{info.textContent=I18n.t("ARCHIVE READ ERROR");resolve([])}}catch(e){info.textContent=I18n.t("ARCHIVE READ ERROR");resolve([])}})}
async function save(entry){const db=await database();if(!db){fallback.push(entry);return false}return new Promise(resolve=>{try{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(entry);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch(e){resolve(false)}})}
async function remove(id){const db=await database();if(!db){const i=fallback.findIndex(e=>e.id===id);if(i>=0)fallback.splice(i,1);return true}return new Promise(resolve=>{try{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch(e){resolve(false)}})}
function release(){player.pause();player.removeAttribute('src');player.load();if(playingUrl){URL.revokeObjectURL(playingUrl);playingUrl=null}}
async function refresh(){const entries=(await all()).sort((a,b)=>b.id-a.id);list.replaceChildren();if(!entries.length){list.textContent=I18n.t("Folder is empty. Record a transmission using MG-95.");return}
 for(const e of entries){const row=document.createElement('div');row.className='file-item';const label=document.createElement('span');label.textContent='♫ '+e.name;row.append(label);
 const open=document.createElement('button');open.textContent=I18n.t("▶ Play");open.onclick=()=>{release();playingUrl=URL.createObjectURL(e.blob);player.src=playingUrl;player.play().catch(()=>{});info.textContent=I18n.format('archive.info',{name:e.name,seconds:e.seconds.toFixed(1),frequency:e.frequency,quality:Math.round(e.quality*100)})};row.append(open);
 const load=document.createElement('button');load.textContent=I18n.t("↳ Open in MG-95");load.onclick=async()=>{try{await window.sh95LoadTape?.(e);$('filesWindow').hidden=true;release()}catch(err){info.textContent=I18n.t("Unable to Open: ")+err.message}};row.append(load);
 const del=document.createElement('button');del.textContent=I18n.t("× Delete");del.onclick=async()=>{if(!confirm(I18n.t("Delete recording ")+e.name+'?'))return;release();const ok=await remove(e.id);if(!ok){info.textContent=I18n.t("FILE DELETION ERROR");return}refresh()};row.append(del);list.append(row)}
}
window.sh95Archive={save,all,remove,refresh};window.sh95OpenFiles=()=>{$('filesWindow').hidden=false;refresh()};$('filesClose').onclick=()=>{$('filesWindow').hidden=true;release()};
window.addEventListener('shtab:languagechange',()=>{if(!$('filesWindow').hidden)refresh()});
window.addEventListener('beforeunload',release);
})();
