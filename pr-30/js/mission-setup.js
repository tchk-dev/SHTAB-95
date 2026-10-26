/* Mission setup: allocate distinct radio frequencies without DOM dependencies. */
(()=>{
'use strict';
function pickFreqs(random=Math.random){
 const used=[];
 for(let i=0;i<3;i++){
  let f,attempt=0;
  do{f=Math.round((555+random()*1130)/3)*3;attempt++}while(attempt<1000&&used.some(x=>Math.abs(x-f)<75));
  used.push(f);
 }
 return used;
}
window.SH95MissionSetup=Object.freeze({pickFreqs});
})();
