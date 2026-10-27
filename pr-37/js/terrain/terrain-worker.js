// Dedicated terrain generation worker; independent of DOM and rendering.
'use strict';
self.window=self;
importScripts('terrain-data.js','geology.js','macrorelief.js','hydrology.js','erosion.js');
self.onmessage=function(event){
 const {id,seed,region}=event.data;
 try{
  const now=()=>performance.now(),timings={},size=self.SH95TerrainData.GRID_SIZE;
  let t=now();
  const geology=self.SH95Geology.generate(region,seed);
  const macro=self.SH95Macrorelief.generate(geology,size);
  timings.macroMs=now()-t;t=now();
  const result=self.SH95Erosion.erode(macro.heightMap,size,self.SH95Hydrology,{
   rockHardness:macro.rockHardness,cellSize:self.SH95TerrainData.CELL_SIZE,
   iterations:10,strength:10,maxCut:4
  });
  timings.erosionAndHydrologyMs=now()-t;
  const data={id,heightMap:result.heightMap,incision:result.incision,
   accumulation:result.hydrology.accumulation,receiver:result.hydrology.receiver,
   timings,seed,region};
  self.postMessage(data,[data.heightMap.buffer,data.incision.buffer,data.accumulation.buffer,data.receiver.buffer]);
 }catch(error){self.postMessage({id,error:String(error&&error.message||error)})}
};
