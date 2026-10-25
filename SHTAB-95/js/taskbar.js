
/* Doors 95: вкладки панели задач перемещают к разделам, не скрывая их. */
(()=>{
  'use strict';
  const map=document.getElementById('mapSection');
  const radio=document.getElementById('radioSection');
  const mapBtn=document.getElementById('taskMap');
  const radioBtn=document.getElementById('taskRadio');
  if(!map||!radio||!mapBtn||!radioBtn)return;
  const setActive=(section)=>{
    for(const [button,active] of [[mapBtn,section==='map'],[radioBtn,section==='radio']]){
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    }
  };
  const go=(section,element)=>{
    setActive(section);
    element.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  };
  mapBtn.addEventListener('click',()=>go('map',map));
  radioBtn.addEventListener('click',()=>go('radio',radio));
  let scheduled=false;
  window.addEventListener('scroll',()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      const mapDistance=Math.abs(map.getBoundingClientRect().top-24);
      const radioDistance=Math.abs(radio.getBoundingClientRect().top-24);
      setActive(mapDistance<=radioDistance?'map':'radio');
    });
  },{passive:true});
})();
