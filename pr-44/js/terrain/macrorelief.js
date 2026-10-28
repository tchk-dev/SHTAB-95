// Deterministic geological macrorelief with smoothly warped structural coordinates.
(function(global){
'use strict';
const smooth=t=>t*t*t*(t*(t*6-15)+10);
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
  // Domain warping breaks map-wide lattice alignment without pixel-scale noise.
  const wu=u+.055*(noise(u*3.1+7,v*3.1,seed+81)-.5);
  const wv=v+.055*(noise(u*3.1,v*3.1+9,seed+82)-.5);
  let uplift=0;
  for(const ridge of ridges){
   const rx=wu-ridge.cx,ry=wv-ridge.cy,along=rx*ridge.dx+ry*ridge.dy;
   const offset=-rx*ridge.dy+ry*ridge.dx-ridge.curve*Math.sin(along*5+ridge.phase);
   const taper=Math.exp(-Math.pow(Math.max(0,Math.abs(along)-ridge.taper)/.16,2));
   const segmentation=.6+.4*noise(along*13+ridge.phase,seed*.0001,seed+71);
   const width=ridge.width*(.7+.6*noise(along*9,ridge.phase,seed+72));
   uplift=Math.max(uplift,ridge.amplitude*segmentation*Math.exp(-.5*(offset/width)**2)*taper);
  }
  let weakness=0;
  for(const fault of faults){
   const d=-(wu-fault.x)*Math.sin(fault.angle)+(wv-fault.y)*Math.cos(fault.angle);
   weakness=Math.max(weakness,fault.weakness*Math.exp(-.5*(d/fault.width)**2));
  }
  const basin=profile.basin*Math.exp(-((u-.5)**2+(v-.5)**2)/.065);
  const broad=noise(wu*2.4,wv*2.4,seed+1)-.5;
  const middle=noise(wu*9,wv*9,seed+2)-.5;
  // Rotate each octave: no common Cartesian lattice across scales. Higher
  // uplifts expose rougher rock; lowlands remain smooth depositional terrain.
  let fractal=0,frequency=15,amplitude=1,px=wu,py=wv;
  for(let octave=0;octave<4;octave++){
   fractal+=(noise(px*frequency+11,py*frequency+7,seed+30+octave)-.5)*amplitude;
   const rotated=px*.8-py*.6;py=px*.6+py*.8;px=rotated;
   frequency*=2.03;amplitude*=.48;
  }
  const detail=fractal*(.035+.19*uplift);
  const drainage=geology.drainage||{dx:Math.cos(profile.axis),dy:Math.sin(profile.axis)};
  const tilt=.4*((u-.5)*drainage.dx+(v-.5)*drainage.dy);
  // Do not clamp at the regional base: a clipped floor makes artificial flats.
  const shape=.15+.72*uplift+.22*broad+.09*middle+detail-.4*basin+tilt;
  heightMap[index]=profile.base+profile.relief*shape;
  rockHardness[index]=Math.max(0,Math.min(255,Math.round(120+profile.hardness*100+noise(u*6,v*6,seed+5)*30-weakness*100)));
 }
 return {heightMap,rockHardness};
}
global.SH95Macrorelief=Object.freeze({generate});
})(window);
