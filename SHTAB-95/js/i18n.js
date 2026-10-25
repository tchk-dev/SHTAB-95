(function(){'use strict';
const ru=window.SHTAB_LOCALES.ru;
const reverse=Object.fromEntries(Object.entries(ru).map(([en,ru])=>[ru,en]));
const storageKey='shtab95.language';
let language;try{language=localStorage.getItem(storageKey)==='ru'?'ru':'en'}catch(_){language='en'}
const originalText=new WeakMap(),originalAttr=new WeakMap();
function translateString(s){if(!s||!s.trim())return s;const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],core=s.trim();const target=language==='ru'?ru:reverse;return lead+(target[core]||core)+trail}
function walk(root){if(!root)return;
 if(root.nodeType===3){const prev=originalText.get(root);const current=root.nodeValue;const source=prev===undefined?current:(current===prev.en||current===prev.ru?prev.source:current);const en=reverse[source.trim()]||source.trim(),ruText=ru[en]||source.trim();const whitespaceBefore=source.match(/^\s*/)[0],whitespaceAfter=source.match(/\s*$/)[0];const next=whitespaceBefore+(language==='ru'?ruText:en)+whitespaceAfter;originalText.set(root,{source,en:whitespaceBefore+en+whitespaceAfter,ru:whitespaceBefore+ruText+whitespaceAfter});if(root.nodeValue!==next)root.nodeValue=next;return}
 if(root.nodeType!==1)return;
 if(['SCRIPT','STYLE','TEXTAREA','CANVAS'].includes(root.tagName))return;
 for(const attr of ['title','aria-label','placeholder'])if(root.hasAttribute(attr)){const old=root.getAttribute(attr),base=originalAttr.get(root)?.[attr]||old;const en=reverse[base]||base;const value=language==='ru'?(ru[en]||base):en;if(old!==value)root.setAttribute(attr,value);originalAttr.set(root,{...(originalAttr.get(root)||{}),[attr]:base})}
 for(const child of root.childNodes)walk(child)
}
let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;observer.disconnect();walk(document.body);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']})})});
function setLanguage(next){language=next==='ru'?'ru':'en';document.documentElement.lang=language;try{localStorage.setItem(storageKey,language)}catch(_){};observer.disconnect();walk(document.body);const button=document.getElementById('languageToggle');if(button){button.textContent=language==='ru'?'RU · Русский':'EN · English';button.title=language==='ru'?'Switch to English':'Переключить на русский'}observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']})}
window.I18n={get language(){return language},setLanguage,t(key){const en=reverse[key]||key;return window.SHTAB_LOCALES[language]?.[en]||en},dictionary:ru};
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('languageToggle').addEventListener('click',()=>setLanguage(language==='en'?'ru':'en'));setLanguage(language)});
})();
