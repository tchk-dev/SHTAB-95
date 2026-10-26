/* Doors 95 notifications: five-second desktop toasts and a local archive. */
(()=>{
'use strict';
const KEY='sh95-notifications-v1',MAX=100;
let entries=[];
try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved))entries=saved.filter(x=>x&&typeof x.text==='string'&&Number.isFinite(x.id)).slice(0,MAX)}catch{}
const tray=document.createElement('div');tray.id='sh95NotificationTray';tray.className='sh95-notification-tray';tray.setAttribute('aria-live','polite');document.body.append(tray);
function store(){try{localStorage.setItem(KEY,JSON.stringify(entries))}catch{}}
function notify(message,source='SHTAB-95'){
 const text=String(message||'').trim();if(!text)return;
 const item={id:Date.now()+Math.random(),time:new Date().toISOString(),source:String(source),text};
 entries.unshift(item);entries.length=Math.min(entries.length,MAX);store();
 window.dispatchEvent(new Event('shtab:notifications-changed'));
 const toast=document.createElement('section');toast.className='sh95-toast';toast.setAttribute('role','status');
 const header=document.createElement('div');header.className='sh95-toast-title';
 const title=document.createElement('strong');title.textContent='▣ '+item.source;
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Dismiss notification');header.append(title,close);
 const content=document.createElement('p');content.textContent=text;
 const link=document.createElement('button');link.type='button';link.className='sh95-toast-link';link.textContent='View archive: doors://messages.net';
 link.onclick=()=>{window.DoorsNet?.open();window.DoorsNet?.navigate('messages.net');dismiss()};
 toast.append(header,content,link);tray.prepend(toast);
 let timer;function dismiss(){clearTimeout(timer);toast.remove()}
 close.onclick=dismiss;timer=setTimeout(dismiss,5000);
 return item;
}
window.SH95Notifications={notify,list:()=>entries.map(x=>({...x})),clear(){entries=[];store();window.dispatchEvent(new Event('shtab:notifications-changed'))}};
})();