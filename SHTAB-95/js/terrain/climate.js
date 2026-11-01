// Annual climatology, independent of the tactical weather/ballistics model.
(function(global){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const BIOMES=Object.freeze(['Grassland','Woodland','Montane forest','Alpine meadow','Bare rock','Wetland']);
function analyze(heights,size,seed,options={}){
 const cellSize=options.cellSize??40000/(size-1),count=size*size;
 const temperature=new Float32Array(count),rainfall=new Float32Array(count),runoff=new Float32Array(count);
 const biome=new Uint8Array(count),slope=new Float32Array(count);
 const westward=((seed>>>0)&1)===1,baseRain=700+((seed>>>8)%401);
 for(let y=0;y<size;y++){
  let moisture=baseRain,previous=heights[y*size+(westward?size-1:0)];
  for(let k=0;k<size;k++){
   const x=westward?size-1-k:k,i=y*size+x,h=heights[i];
   const rise=h-previous;
   // Moist air is replenished gradually; uplift increases precipitation and
   // removes moisture downwind, while descending air warms and dries.
   const lift=clamp(rise/cellSize,-.5,.5);
   const rain=clamp(moisture*(1+2.2*lift),250,2400);
   moisture=clamp(moisture+(baseRain-moisture)*.008-Math.max(0,rise)*.12,250,1400);
   const dx=(heights[y*size+Math.min(size-1,x+1)]-heights[y*size+Math.max(0,x-1)])/(cellSize*(x===0||x===size-1?1:2));
   const dy=(heights[Math.min(size-1,y+1)*size+x]-heights[Math.max(0,y-1)*size+x])/(cellSize*(y===0||y===size-1?1:2));
   slope[i]=Math.hypot(dx,dy);
   temperature[i]=13.5-.006*h-1.2*(y/(size-1)-.5);
   rainfall[i]=rain;
   runoff[i]=clamp((rain-280-Math.max(0,temperature[i])*12)/600,.08,2.8);
   biome[i]=slope[i]>.55||temperature[i]<0?4:temperature[i]<4?3:temperature[i]<8?2:rain>780?1:0;
   previous=h;
  }
 }
 return {temperature,rainfall,runoff,biome,slope};
}
function wetlands(climate,heights,drainage){
 for(let i=0;i<heights.length;i++)if(climate.slope[i]<.025&&
  (drainage.filledHeight[i]-heights[i]>.4||drainage.accumulation[i]>700)&&climate.temperature[i]>4)climate.biome[i]=5;
 return climate;
}
global.SH95Climate=Object.freeze({BIOMES,analyze,wetlands});
})(window);
