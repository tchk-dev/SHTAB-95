// Conservative hillslope diffusion and routed sediment, expressed in metres of
// equivalent cell thickness. No geological duration or discharge calibration.
(function(global){
'use strict';
function evolve(eroded,size,hydrology,options={}){
 const cellSize=options.cellSize??40000/(size-1);
 const heights=new Float32Array(eroded.heightMap),count=heights.length;
 if(count!==size*size||eroded.incision.length!==count)throw Error('Invalid sediment grid');
 const hillslope=new Float32Array(count),deposition=new Float32Array(count);
 const delta=new Float64Array(count);
 // Four-neighbour finite-volume diffusion. Equal and opposite face fluxes;
 // coefficient <= 1/4 keeps the explicit update stable on a square grid.
 for(let step=0;step<6;step++){
  delta.fill(0);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=y*size+x;
   for(const j of [x+1<size?i+1:-1,y+1<size?i+size:-1]){
    if(j<0)continue;
    const flux=Math.max(-.8,Math.min(.8,(heights[i]-heights[j])*.04));
    delta[i]-=flux;delta[j]+=flux;
   }
  }
  for(let i=0;i<count;i++){heights[i]+=delta[i];hillslope[i]+=delta[i]}
 }
 const drainage=hydrology.analyze(heights,size),load=new Float64Array(eroded.incision);
 let supplied=0,stored=0,exported=0;
 for(const v of load)supplied+=v;
 for(let p=count-1;p>=0;p--){
  const i=drainage.order[p],j=drainage.receiver[i];
  if(j<0){exported+=load[i];continue}
  const diagonal=i%size!==j%size&&Math.floor(i/size)!==Math.floor(j/size);
  const slope=Math.max(0,(heights[i]-heights[j])/(cellSize*(diagonal?Math.SQRT2:1)));
  // Ponded cells can aggrade to spill level; open channels retain half their
  // downstream drop, preventing deposition from reversing the local gradient.
  const room=Math.max(0,drainage.filledHeight[i]-heights[i],(heights[j]-heights[i])*.5);
  const channelRoom=Math.max(0,(heights[i]-heights[j])*.45);
  const deposit=Math.min(load[i]*Math.max(0,.65-slope*18),room+channelRoom);
  heights[i]+=deposit;deposition[i]=deposit;stored+=deposit;
  load[j]+=load[i]-deposit;
 }
 return {heightMap:heights,hillslope,deposition,hydrology:hydrology.analyze(heights,size),
  budget:{erodedVolume:supplied*cellSize*cellSize,depositedVolume:stored*cellSize*cellSize,exportedVolume:exported*cellSize*cellSize}};
}
global.SH95Sediment=Object.freeze({evolve});
})(window);
