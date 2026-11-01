// Partition a strictly downhill flow graph into sink catchments and retain the
// lowest terrain saddle for each pair. No lake filling is inferred here.
(function(global){
'use strict';
function build(heights,receiver,size){
 const count=size*size;
 if(!Number.isInteger(size)||size<2||heights.length!==count||receiver.length!==count)throw Error('Invalid catchment grid');
 const basin=new Int32Array(count);basin.fill(-1);const sinks=[];
 for(let i=0;i<count;i++){
  if(!Number.isFinite(heights[i]))throw Error('Invalid elevation');
  const j=receiver[i];
  if(!Number.isInteger(j)||j < -1||j>=count)throw Error('Invalid receiver');
  if(j>=0&&(Math.abs(i%size-j%size)>1||Math.abs(Math.floor(i/size)-Math.floor(j/size))>1||heights[j]>=heights[i]))throw Error('Receiver must be a lower neighbouring cell');
 }
 for(let i=0;i<count;i++){
  if(basin[i]>=0)continue;
  let j=i;const path=[];
  while(basin[j]<0&&receiver[j]>=0){path.push(j);j=receiver[j]}
  if(basin[j]<0){basin[j]=sinks.length;sinks.push(j)}
  const id=basin[j];for(const p of path)basin[p]=id;
 }
 const edges=new Map(),offsets=[[1,0],[0,1],[1,1],[-1,1]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x;
  for(const [dx,dy] of offsets){
   const xx=x+dx,yy=y+dy;if(xx<0||xx>=size||yy>=size)continue;
   const j=yy*size+xx,a=basin[i],b=basin[j];if(a===b)continue;
   const low=Math.min(a,b),high=Math.max(a,b),key=low+':'+high,level=Math.max(heights[i],heights[j]);
   const old=edges.get(key);
   if(!old||level<old.level)edges.set(key,{a:low,b:high,level,from:i,to:j});
  }
 }
 return {basin,sinks,edges:Array.from(edges.values())};
}
// Minimum spill elevations to a map-edge sink on the saddle graph. These are
// conditioning levels, not an estimate of actual standing water.
function outletTree(catchments,heights,size){
 const {sinks,edges}=catchments,n=sinks.length,links=Array.from({length:n},()=>[]);
 for(const e of edges){links[e.a].push(e);links[e.b].push(e)}
 const level=new Float64Array(n);level.fill(Infinity);
 const downstream=new Int32Array(n);downstream.fill(-1);
 const visited=new Uint8Array(n),order=[],heap=[];
 function push(id,value){let k=heap.length;heap.push([value,id]);while(k){const p=(k-1)>>1;if(heap[p][0]<=value)break;heap[k]=heap[p];k=p}heap[k]=[value,id]}
 function pop(){const top=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let j=k*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(last[0]<=heap[j][0])break;heap[k]=heap[j];k=j}heap[k]=last}return top}
 for(let id=0;id<n;id++){
  const i=sinks[id],x=i%size,y=Math.floor(i/size);
  if(x===0||y===0||x===size-1||y===size-1){level[id]=heights[i];push(id,level[id])}
 }
 while(heap.length){
  const [v,id]=pop();if(visited[id])continue;visited[id]=1;order.push(id);
  for(const e of links[id]){const j=e.a===id?e.b:e.a,candidate=Math.max(v,e.level);
   if(!visited[j]&&candidate<level[j]){level[j]=candidate;downstream[j]=id;push(j,candidate)}
  }
 }
 if(order.length!==n)throw Error('Catchment has no route to map edge');
 return {level,downstream,order};
}
global.SH95Catchments=Object.freeze({build,outletTree});
})(window);
