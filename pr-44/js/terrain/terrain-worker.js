// Dedicated terrain generation worker; independent of DOM and rendering.
'use strict';
self.window=self;
importScripts('terrain-data.js','geology.js','macrorelief.js','hydrology.js','erosion.js','sediment.js','climate.js','water-mask.js');
self.onmessage=function(event){
 const {id,seed,region}=event.data;
 try{
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid terrain seed');
  if(!Object.prototype.hasOwnProperty.call(self.SH95Geology.REGIONS,region))throw Error('Unknown terrain region');
  const now=()=>performance.now(),timings={},size=self.SH95TerrainData.GRID_SIZE;
  let t=now();
  const geology=self.SH95Geology.generate(region,seed);
  const macro=self.SH95Macrorelief.generate(geology,size);
  timings.macroMs=now()-t;t=now();
  const forcing=self.SH95Climate.analyze(macro.heightMap,size,seed);
  const result=self.SH95Erosion.erode(macro.heightMap,size,self.SH95Hydrology,{
   rockHardness:macro.rockHardness,cellSize:self.SH95TerrainData.CELL_SIZE,
   iterations:10,strength:10,maxCut:4,runoff:forcing.runoff
  });
  timings.erosionAndHydrologyMs=now()-t;
  t=now();
  const sediment=self.SH95Sediment.evolve(result,size,self.SH95Hydrology,{cellSize:self.SH95TerrainData.CELL_SIZE,runoff:forcing.runoff});
  timings.sedimentMs=now()-t;
  t=now();
  const climate=self.SH95Climate.wetlands(self.SH95Climate.analyze(sediment.heightMap,size,seed),sediment.heightMap,sediment.hydrology);
  timings.climateMs=now()-t;
  const waterDepth=Float32Array.from(sediment.heightMap,(h,i)=>Math.max(0,sediment.hydrology.filledHeight[i]-h));
  t=now();
  const waterMask=self.SH95WaterMask.build(sediment.heightMap,sediment.hydrology.filledHeight,size);
  timings.waterMaskMs=now()-t;
  let runoffInput=0,runoffOutlets=0;
  for(let i=0;i<forcing.runoff.length;i++){
   runoffInput+=forcing.runoff[i];
   if(sediment.hydrology.receiver[i]<0)runoffOutlets+=sediment.hydrology.accumulation[i];
  }
  const data={id,waterMask,generationVersion:'terrain-v2',waterBudget:{input:runoffInput,outlets:runoffOutlets},waterDepth,biome:climate.biome,temperature:climate.temperature,rainfall:climate.rainfall,heightMap:sediment.heightMap,incision:result.incision,
   deposition:sediment.deposition,hillslope:sediment.hillslope,sedimentBudget:sediment.budget,
   accumulation:sediment.hydrology.accumulation,receiver:sediment.hydrology.receiver,
   timings,seed,region};
  self.postMessage(data,[data.heightMap.buffer,data.incision.buffer,data.accumulation.buffer,data.receiver.buffer,data.deposition.buffer,data.hillslope.buffer,data.biome.buffer,data.temperature.buffer,data.rainfall.buffer,data.waterDepth.buffer,data.waterMask.buffer]);
 }catch(error){self.postMessage({id,error:String(error&&error.message||error)})}
};
