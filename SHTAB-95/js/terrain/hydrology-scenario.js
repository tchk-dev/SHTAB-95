// Experimental hydrology pipeline: finite runoff volumes, closed-basin storage
// and connected drainage. Kept separate from production terrain generation.
(function(global){
'use strict';
function analyze(heightMap,size,runoffVolumes,cellArea=1){
 if(!Number.isInteger(size)||size<2||!heightMap||!runoffVolumes||
    heightMap.length!==size*size||runoffVolumes.length!==size*size||
    !Number.isFinite(cellArea)||cellArea<=0)throw Error('Invalid hydrology scenario inputs');
 const runoff=new Float64Array(runoffVolumes.length);
 let input=0;
 for(let i=0;i<runoff.length;i++){
  const v=runoffVolumes[i];
  if(!Number.isFinite(v)||v<0)throw Error('Invalid hydrology scenario runoff volume');
  runoff[i]=v;input+=v;
 }
 const ground=global.SH95SurfaceFlow.analyze(heightMap,size,runoff);
 const catchments=global.SH95Catchments.build(heightMap,ground.receiver,size);
 const volumes=new Float64Array(catchments.sinks.length);
 for(let i=0;i<runoff.length;i++)volumes[catchments.basin[i]]+=runoff[i];
 const pools=global.SH95ReservoirNetwork.solve(heightMap,size,catchments,volumes,cellArea);
 const routed=global.SH95LakeRouting.build(heightMap,size,ground,catchments,pools,runoff,cellArea);
 const tolerance=1e-7*Math.max(1,input);
 if(Math.abs(input-routed.retained-routed.exported)>tolerance||
    Math.abs(routed.retained-pools.stored)>tolerance||
    Math.abs(routed.exported-pools.exported)>tolerance)
  throw Error('Hydrology scenario water budget mismatch');
 return {receiver:routed.receiver,accumulation:routed.accumulation,waterDepth:routed.depth,
  retained:routed.retained,exported:routed.exported,input,basinCount:catchments.sinks.length,
  spillCount:pools.transfers.length};
}
global.SH95HydrologyScenario=Object.freeze({analyze});
})(window);
