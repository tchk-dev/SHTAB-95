// Priority-flood drainage topology. Hydrology does not alter terrain heights.
(function(global){
'use strict';
const DX=[-1,0,1,-1,1,-1,0,1],DY=[-1,-1,-1,0,0,1,1,1];
function analyze(heightMap,size){
 if(!Number.isInteger(size)||size<2||heightMap.length!==size*size)throw Error('Invalid terrain grid');
 const count=size*size,filled=new Float32Array(count),receiver=new Int32Array(count);
 const accumulation=new Float32Array(count),visited=new Uint8Array(count),order=new Int32Array(count);
 receiver.fill(-1);accumulation.fill(1);
 const heap=[];
 function push(index,level){
  let i=heap.length;heap.push([level,index]);
  while(i){const p=(i-1)>>1;if(heap[p][0]<=level)break;heap[i]=heap[p];i=p}heap[i]=[level,index];
 }
 function pop(){
  const top=heap[0],last=heap.pop();
  if(heap.length){
   let i=0;
   while(i*2+1<heap.length){
    let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;
    if(last[0]<=heap[j][0])break;
    heap[i]=heap[j];i=j;
   }
   heap[i]=last;
  }
  return top;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  if(x!==0&&y!==0&&x!==size-1&&y!==size-1)continue;
  const i=y*size+x;
  if(!Number.isFinite(heightMap[i]))throw Error('Non-finite elevation');
  visited[i]=1;filled[i]=heightMap[i];push(i,filled[i]);
 }
 let used=0;
 while(heap.length){
  const [,index]=pop();order[used++]=index;
  const x=index%size,y=Math.floor(index/size);
  for(let k=0;k<8;k++){
   const xx=x+DX[k],yy=y+DY[k];
   if(xx<0||xx>=size||yy<0||yy>=size)continue;
   const j=yy*size+xx;if(visited[j])continue;
   const h=heightMap[j];if(!Number.isFinite(h))throw Error('Non-finite elevation');
   visited[j]=1;receiver[j]=index;filled[j]=Math.max(h,filled[index]);
   push(j,filled[j]);
  }
 }
 // Every upstream cell appears after its receiver in flood order.
 for(let p=used-1;p>=0;p--){
  const i=order[p],to=receiver[i];
  if(to>=0)accumulation[to]+=accumulation[i];
 }
 return {receiver,accumulation,filledHeight:filled,order};
}
global.SH95Hydrology=Object.freeze({analyze});
})(window);
