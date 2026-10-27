// Stream-power bedrock incision with repeated drainage recomputation.
// A geomorphic approximation, not a calibrated time-dependent climate model.
(function(global){
'use strict';
function erode(source,size,hydrology,options={}){
 if(source.length!==size*size)throw Error('Invalid terrain grid');
 const iterations=options.iterations??8;
 if(!Number.isInteger(iterations)||iterations<0||iterations>100)throw Error('Invalid erosion iterations');
 const cellSize=options.cellSize??40000/(size-1);
 const hardness=options.rockHardness;
 if(hardness&&hardness.length!==source.length)throw Error('Invalid hardness grid');
 const threshold=options.channelThreshold??Math.max(8,Math.round(180*size*size/(512*512)));
 const strength=options.strength??1.6;
 const maxCut=options.maxCut??3;
 const heights=new Float32Array(source),incision=new Float32Array(source.length);
 let drainage;
 for(let step=0;step<iterations;step++){
  drainage=hydrology.analyze(heights,size,options.runoff);
  const {receiver,accumulation,order}=drainage;
  // Process upstream-to-downstream, keeping the recipient lower than the donor.
  for(let p=order.length-1;p>=0;p--){
   const i=order[p],j=receiver[i];
   if(j<0||accumulation[i]<threshold)continue;
   const x=i%size,y=(i/size)|0,xx=j%size,yy=(j/size)|0;
   const distance=cellSize*(x!==xx&&y!==yy?Math.SQRT2:1);
   const slope=Math.max(0,(heights[i]-heights[j])/distance);
   if(slope<=0)continue;
   const areaFactor=Math.sqrt(accumulation[i]/threshold);
   const resistance=hardness?Math.max(.3,hardness[i]/180):1;
   const cut=Math.min(maxCut,strength*areaFactor*Math.pow(slope,.85)/resistance);
   // Never invert the local channel gradient during a single step.
   const actual=Math.min(cut,Math.max(0,heights[i]-heights[j]-.01)*.5);
   heights[i]-=actual;incision[i]+=actual;
  }
 }
 return {heightMap:heights,incision,hydrology:hydrology.analyze(heights,size,options.runoff)};
}
global.SH95Erosion=Object.freeze({erode});
})(window);
