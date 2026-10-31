// Open-surface D8 drainage. Closed depressions remain sinks; this deliberately
// does not model the lake storage or spill required to connect them downstream.
(function(global){
'use strict';
const DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];
function analyze(heightMap,size,runoff=null){
 if(!Number.isInteger(size)||size<2||heightMap.length!==size*size||(runoff&&runoff.length!==heightMap.length))throw Error('Invalid surface-flow grid');
 const count=size*size,receiver=new Int32Array(count),accumulation=new Float64Array(count),order=new Uint32Array(count);
 receiver.fill(-1);
 for(let i=0;i<count;i++){
  if(!Number.isFinite(heightMap[i])||(runoff&&(!Number.isFinite(runoff[i])||runoff[i]<0)))throw Error('Invalid surface-flow input');
  accumulation[i]=runoff?runoff[i]:1;order[i]=i;
 }
 for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
  const i=y*size+x;let best=-1,bestSlope=0;
  for(let k=0;k<8;k++){
   const j=(y+DY[k])*size+x+DX[k];
   const slope=(heightMap[i]-heightMap[j])/(DX[k]&&DY[k]?Math.SQRT2:1);
   if(slope>bestSlope){best=j;bestSlope=slope}
  }
  receiver[i]=best;
 }
 // Strict downhill edges yield a topological order even when heights tie.
 order.sort((a,b)=>heightMap[b]-heightMap[a]||a-b);
 for(const i of order){const j=receiver[i];if(j>=0)accumulation[j]+=accumulation[i]}
 return {receiver,accumulation};
}
global.SH95SurfaceFlow=Object.freeze({analyze});
})(window);
