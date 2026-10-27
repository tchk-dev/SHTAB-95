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
  // The regional axis is a geological tendency, not a fixed map-wide bearing.
  const theta=profile.axis+(r()-.5)*1.35;
  const dx=Math.cos(theta),dy=Math.sin(theta);
  const count=region==='donja_bukovica'?(r()<.65?0:1):region==='popovac'?1+Math.floor(r()*3):profile.ridges;
  for(let k=0;k<count;k++){
   const offset=(k-(count-1)/2)*(.12+r()*.08)+(r()-.5)*.24;
   const angle=theta+(r()-.5)*(region==='mckhetovac'?.48:.85);
   const directionX=Math.cos(angle),directionY=Math.sin(angle);
   ridges.push({cx:.5-dy*offset+(r()-.5)*.35,cy:.5+dx*offset+(r()-.5)*.35,
    dx:directionX,dy:directionY,amplitude:(.28+.68*r()),
    width:(region==='donja_bukovica'?.035:.035)+.065*r(),
    phase:r()*6.283,curve:(r()-.5)*.26,taper:.28+.4*r()});
  }
  // Secondary spurs branch off larger structures; lowland regions have fewer.
  const spurs=region==='donja_bukovica'?0:region==='popovac'?1+Math.floor(r()*2):3+Math.floor(r()*4);
  for(let k=0;k<spurs&&ridges.length;k++){
   const parent=ridges[Math.floor(r()*ridges.length)];
   const angle=Math.atan2(parent.dy,parent.dx)+(r()<.5?-1:1)*(.45+r()*.75);
   ridges.push({cx:parent.cx+(r()-.5)*.27,cy:parent.cy+(r()-.5)*.27,
    dx:Math.cos(angle),dy:Math.sin(angle),amplitude:parent.amplitude*(.2+.35*r()),
    width:.018+.035*r(),phase:r()*6.283,curve:(r()-.5)*.18,taper:.12+.22*r()});
  }
  // Faults influence rock resistance only, never carve straight troughs.
  const faults=Array.from({length:2},()=>({x:r(),y:r(),
   angle:theta+Math.PI/2+(r()-.5)*.9,width:.008+.012*r(),weakness:.2+.3*r()}));
  return {profile,ridges,faults,seed};
 }
 global.SH95Geology=Object.freeze({REGIONS,generate});
})(window);
