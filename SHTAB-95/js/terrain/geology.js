// Deterministic structural geology for a 40 km terrain tile.
(function(global){
 'use strict';
 const REGIONS=Object.freeze({
  donja_bukovica:{base:45,relief:95,axis:0.15,ridges:1,basin:0.2,hardness:0.3},
  popovac:{base:180,relief:260,axis:0.75,ridges:4,basin:0.15,hardness:0.5},
  lipovac:{base:280,relief:530,axis:0.55,ridges:5,basin:0.1,hardness:0.65},
  mckhetovac:{base:550,relief:1650,axis:0.35,ridges:6,basin:0.05,hardness:0.75}
 });
 function random(seed){let a=seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296}}
 function generate(region,seed){
  const profile=REGIONS[region]||REGIONS.popovac,r=random(seed),ridges=[];
  const theta=profile.axis+(r()-.5)*0.25,dx=Math.cos(theta),dy=Math.sin(theta);
  for(let k=0;k<profile.ridges;k++){
   const offset=(k-(profile.ridges-1)/2)*(.15+r()*.035)+(r()-.5)*.08;
   ridges.push({cx:.5-dy*offset,cy:.5+dx*offset,dx,dy,
    amplitude:(.45+.55*r()),width:.045+.055*r(),phase:r()*6.283,curve:(r()-.5)*.14,
    taper:.72+.22*r()});
  }
  const faults=Array.from({length:2},()=>({x:r(),y:r(),angle:theta+Math.PI/2+(r()-.5)*.6,width:.008+.012*r(),weakness:.2+.3*r()}));
  return {profile,ridges,faults,seed};
 }
 global.SH95Geology=Object.freeze({REGIONS,generate});
})(window);
