// Lake display footprint; raw depths and terrain remain untouched.
(function(global){
'use strict';
const SHORE_TOLERANCE=.4; // cartographic generalization of sub-grid, low silt bars
const EPSILON=.001; // metres; tolerates Float32 rounding at mountain elevations
const DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];
function build(heightMap,filledHeight,size){
 if(!Number.isInteger(size)||size<2||heightMap.length!==size*size||filledHeight.length!==heightMap.length)throw Error('Invalid water grid');
 const count=heightMap.length,mask=new Uint8Array(count),levels=new Float32Array(count),queue=new Int32Array(count);
 let head=0,tail=0;
 // Keep the old 40 cm threshold only as a seed for a substantive lake, not
 // as a per-pixel shoreline cutoff. Shallow shelves belong to the same lake.
 for(let i=0;i<count;i++){
  if(!Number.isFinite(heightMap[i])||!Number.isFinite(filledHeight[i]))throw Error('Non-finite water surface');
  if(filledHeight[i]-heightMap[i]>.4){mask[i]=1;levels[i]=filledHeight[i];queue[tail++]=i}
 }
 while(head<tail){
  const i=queue[head++],x=i%size,y=Math.floor(i/size);
  for(let k=0;k<8;k++){
   const xx=x+DX[k],yy=y+DY[k];if(xx<0||xx>=size||yy<0||yy>=size)continue;
   const j=yy*size+xx;
   if(mask[j]||filledHeight[j]-heightMap[j]<=EPSILON||Math.abs(filledHeight[j]-filledHeight[i])>EPSILON)continue;
   mask[j]=1;levels[j]=filledHeight[j];queue[tail++]=j;
  }
 }
 // Sediment can meet a lake's spill level along one-cell routing paths.
 // Generalize only narrow seams/low bars between water at the SAME level. This
 // is not unrestricted image dilation: raised islands, dams and different
 // water levels must remain separate. Bars <=40 cm high are below the
 // display shoreline tolerance; analysis depths are never changed. Staged passes avoid scan-order bias.
 const pairs=[[1,0],[0,1],[1,1],[1,-1]];
 for(let pass=0;pass<2;pass++){
  const next=mask.slice(),nextLevels=levels.slice();let changed=0;
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
   const i=y*size+x;if(mask[i])continue;
   for(const [dx,dy] of pairs){
    const a=(y-dy)*size+x-dx,b=(y+dy)*size+x+dx;
    if(!mask[a]||!mask[b])continue;
    const level=Math.min(levels[a],levels[b]);
    if(Math.abs(levels[a]-levels[b])<=EPSILON&&
     filledHeight[i]<=level+SHORE_TOLERANCE&&heightMap[i]<=level+SHORE_TOLERANCE){next[i]=1;nextLevels[i]=level;changed++;break}
   }
  }
  mask.set(next);levels.set(nextLevels);if(!changed)break;
 }
 return mask;
}
global.SH95WaterMask=Object.freeze({build,EPSILON,SHORE_TOLERANCE});
})(window);
