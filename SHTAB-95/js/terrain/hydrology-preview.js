// Opt-in, non-production hydrology comparison over a downsampled terrain.
// Never mutates input terrain or changes mission routing/placement/ballistics.
(function(global){
'use strict';
function analyze(heightMap,sourceSize,{gridSize=32,runoffMetres=.1,worldMetres=40000}={}){
 if(!Number.isInteger(sourceSize)||sourceSize<2||!heightMap||heightMap.length!==sourceSize*sourceSize||
    !Number.isInteger(gridSize)||gridSize<8||gridSize>sourceSize||
    !Number.isFinite(runoffMetres)||runoffMetres<0||
    !Number.isFinite(worldMetres)||worldMetres<=0)throw Error('Invalid preview parameters');
 const count=gridSize*gridSize,heights=new Float64Array(count),volumes=new Float64Array(count);
 const cellSize=worldMetres/(gridSize-1),cellArea=cellSize*cellSize;
 for(let y=0;y<gridSize;y++)for(let x=0;x<gridSize;x++){
  const sx=Math.round(x*(sourceSize-1)/(gridSize-1)),sy=Math.round(y*(sourceSize-1)/(gridSize-1));
  const i=y*gridSize+x,h=heightMap[sy*sourceSize+sx];
  if(!Number.isFinite(h))throw Error('Non-finite preview elevation');
  heights[i]=h;volumes[i]=runoffMetres*cellArea;
 }
 const result=global.SH95HydrologyScenario.analyze(heights,gridSize,volumes,cellArea);
 let wetCells=0,uphill=0;for(let i=0;i<count;i++){
  if(result.waterDepth[i]>.001)wetCells++;
  const next=result.receiver[i];
  if(next>=0&&heights[next]+result.waterDepth[next]>heights[i]+result.waterDepth[i]+.001)uphill++;
 }
 if(uphill)throw Error('Preview drainage ascends water surface');
 return {gridSize,runoffMetres,wetFraction:wetCells/count,uphill,
  input:result.input,retained:result.retained,exported:result.exported,
  basinCount:result.basinCount,spillCount:result.spillCount};
}
global.SH95HydrologyPreview=Object.freeze({analyze});
})(window);
