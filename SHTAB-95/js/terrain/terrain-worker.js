// Dedicated terrain generation worker; independent of DOM and rendering.
'use strict';
self.window=self;
importScripts('terrain-data.js','geology.js','macrorelief.js','hydrology.js','erosion.js','sediment.js');
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
  t=now();
  const sediment=self.SH95Sediment.evolve(result,size,self.SH95Hydrology,{cellSize:self.SH95TerrainData.CELL_SIZE});
  timings.sedimentMs=now()-t;
  const data={id,heightMap:sediment.heightMap,incision:result.incision,
   deposition:sediment.deposition,hillslope:sediment.hillslope,sedimentBudget:sediment.budget,
   accumulation:sediment.hydrology.accumulation,receiver:sediment.hydrology.receiver,
   timings,seed,region};
  self.postMessage(data,[data.heightMap.buffer,data.incision.buffer,data.accumulation.buffer,data.receiver.buffer,data.deposition.buffer,data.hillslope.buffer]);
 }catch(error){self.postMessage({id,error:String(error&&error.message||error)})}
};
