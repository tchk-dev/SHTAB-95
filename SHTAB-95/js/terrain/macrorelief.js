// Deterministic geological macrorelief; erosion and drainage are future stages.
(function(global){
'use strict';
const smooth=t=>t*t*(3-2*t);
function hash(x,y,seed){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295}
function noise(x,y,seed){
 const ix=Math.floor(x),iy=Math.floor(y),a=smooth(x-ix),b=smooth(y-iy);
 const p=hash(ix,iy,seed),q=hash(ix+1,iy,seed),r=hash(ix,iy+1,seed),s=hash(ix+1,iy+1,seed);
 return (p*(1-a)+q*a)*(1-b)+(r*(1-a)+s*a)*b;
}
function generate(geology,size){
 const {profile,ridges,faults,seed}=geology;
 const heightMap=new Float32Array(size*size),rockHardness=new Uint8Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/(size-1),v=y/(size-1),index=y*size+x;
  let uplift=0;
  for(const ridge of ridges){
   const rx=u-ridge.cx,ry=v-ridge.cy,along=rx*ridge.dx+ry*ridge.dy;
   const offset=-rx*ridge.dy+ry*ridge.dx-ridge.curve*Math.sin(along*5+ridge.phase);
   const taper=Math.exp(-Math.pow(Math.max(0,Math.abs(along)-ridge.taper)/.2,2));
   uplift=Math.max(uplift,ridge.amplitude*Math.exp(-.5*(offset/ridge.width)**2)*taper);
  }
  let weakness=0;
  for(const fault of faults){
   const d=-(u-fault.x)*Math.sin(fault.angle)+(v-fault.y)*Math.cos(fault.angle);
   weakness=Math.max(weakness,fault.weakness*Math.exp(-.5*(d/fault.width)**2));
  }
  const basin=profile.basin*Math.exp(-((u-.5)**2+(v-.5)**2)/.065);
  const broad=noise(u*2.4,v*2.4,seed+1)-.5;
  const middle=noise(u*9,v*9,seed+2)-.5;
  const detail=(noise(u*22,v*22,seed+3)-.5)*(.035+.08*uplift);
  const shape=Math.max(0,Math.min(1,.15+.72*uplift+.22*broad+.09*middle+detail-.4*basin-.15*weakness));
  heightMap[index]=profile.base+profile.relief*shape;
  rockHardness[index]=Math.max(0,Math.min(255,Math.round(120+profile.hardness*100+noise(u*6,v*6,seed+5)*30-weakness*100)));
 }
 return {heightMap,rockHardness};
}
global.SH95Macrorelief=Object.freeze({generate});
})(window);
