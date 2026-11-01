// Prototype: connect strictly downhill ground flow through finite pools.
// Inputs are one-scenario volumes per grid cell in the same units used by the
// reservoir network; this is not yet wired into production terrain generation.
(function(global){
'use strict';
const EPS=.001;
function build(heights,size,ground,catchments,pools,runoff,cellArea=1){
 const count=size*size,{basin,sinks}=catchments,{groups,levels,transfers}=pools,n=sinks.length;
 if(heights.length!==count||ground.receiver.length!==count||runoff.length!==count||!Number.isFinite(cellArea)||cellArea<=0)throw Error('Invalid lake-routing inputs');
 const outlets=new Map(),routingLevel=Float64Array.from(levels),sourceCells=new Map();
 for(const t of transfers){
  const a=groups[basin[t.fromCell]],b=groups[basin[t.toCell]];
  if(a===b)continue;
  const previous=outlets.get(a);
  if(previous&&previous.target!==b)throw Error('Pool has multiple spill targets');
  if(!previous||Math.max(heights[t.fromCell],heights[t.toCell])<previous.saddle){
   outlets.set(a,{from:t.fromCell,to:t.toCell,target:b,saddle:Math.max(heights[t.fromCell],heights[t.toCell])});
  }
 }
 for(const [id,e] of outlets)if(!Number.isFinite(routingLevel[id]))routingLevel[id]=e.saddle;
 const owner=new Int32Array(count);owner.fill(-1);const depth=new Float64Array(count),stored=new Float64Array(n),expected=new Int32Array(n);
 for(let i=0;i<count;i++){
  const group=groups[basin[i]],level=routingLevel[group];
  if(Number.isFinite(level)&&heights[i]<=level+EPS){owner[i]=group;expected[group]++}
  if(Number.isFinite(levels[group])){depth[i]=Math.max(0,levels[group]-heights[i]);stored[group]+=depth[i]*cellArea}
 }
 const receiver=Int32Array.from(ground.receiver),seen=new Uint8Array(count),queue=new Int32Array(count);
 for(let id=0;id<n;id++)if(groups[id]===id&&expected[id]){
  const e=outlets.get(id),start=e?e.from:sinks[id];
  if(owner[start]!==id)throw Error('Pool outlet outside its water surface');
  let head=0,tail=0;queue[tail++]=start;seen[start]=1;receiver[start]=e?e.to:-1;sourceCells.set(start,id);
  while(head<tail){
   const i=queue[head++],x=i%size,y=Math.floor(i/size);
   // Prefer cardinal links, then diagonals only if they do not cross an
   // already assigned link or a ground-flow link outside this pool.
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
    const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=size||yy>=size)continue;
    const j=yy*size+xx;if(seen[j]||owner[j]!==id)continue;
    if(dx&&dy){const a=y*size+xx,b=yy*size+x;
     if((receiver[a]===b&&(owner[a]!==id||seen[a]))||(receiver[b]===a&&(owner[b]!==id||seen[b])))continue;
    }
    seen[j]=1;receiver[j]=i;queue[tail++]=j;
   }
  }
  if(tail!==expected[id])throw Error('Disconnected pool surface: group '+id+' reached '+tail+' of '+expected[id]+' at '+routingLevel[id]);
 }
 // A diagonal spill can cross an existing diagonal when both already join
 // immediately downstream. Shortcut only along that same downstream path;
 // never invent a connection between separate watersheds.
 const surface=i=>owner[i]>=0?Math.max(heights[i],routingLevel[owner[i]]):heights[i];
 for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){
  const a=y*size+x,b=a+1,c=a+size,d=c+1,edge=(i,j)=>receiver[i]===j||receiver[j]===i;
  if(!edge(a,d)||!edge(b,c))continue;let fixed=false;
  for(const [u,v] of [[a,d],[d,a],[b,c],[c,b]])if(receiver[u]===v){
   const w=receiver[v];if(w<0)continue;
   const dx=Math.abs(u%size-w%size),dy=Math.abs(Math.floor(u/size)-Math.floor(w/size));
   if(dx+dy===1&&surface(w)<=surface(u)+EPS){receiver[u]=w;fixed=true;break}
  }
  if(!fixed)throw Error('Crossed water-network edges');
 }
 const indegree=new Int32Array(count),accumulation=new Float64Array(count);
 for(let i=0;i<count;i++){
  if(!Number.isFinite(runoff[i])||runoff[i]<0)throw Error('Invalid runoff');accumulation[i]=runoff[i];
  const j=receiver[i];if(j>=0){
   if(j>=count||Math.abs(i%size-j%size)>1||Math.abs(Math.floor(i/size)-Math.floor(j/size))>1)throw Error('Non-neighbour flow edge');
   const a=owner[i]>=0?Math.max(heights[i],routingLevel[owner[i]]):heights[i];
   const b=owner[j]>=0?Math.max(heights[j],routingLevel[owner[j]]):heights[j];
   if(b>a+EPS)throw Error('Flow ascends water surface');indegree[j]++;
  }
 }
 let head=0,tail=0;for(let i=0;i<count;i++)if(indegree[i]===0)queue[tail++]=i;
 let retained=0,exported=0;
 while(head<tail){
  const i=queue[head++],j=receiver[i],group=sourceCells.get(i);
  if(group!==undefined){
   // A fixed absolute epsilon falsely rejects ~1e-7 rounding differences
   // when accumulated water volumes are in the tens of millions.
   const storageTolerance=Math.max(1e-7,1e-12*Math.max(accumulation[i],stored[group]));
   if(stored[group]-accumulation[i]>storageTolerance)throw Error('Lake storage exceeds incoming water: group='+group+' cell='+i+' incoming='+accumulation[i]+' stored='+stored[group]+' deficit='+(stored[group]-accumulation[i])+' outlet='+j);
   accumulation[i]=Math.max(0,accumulation[i]-stored[group]);retained+=stored[group];
  }
  if(j>=0){accumulation[j]+=accumulation[i];if(--indegree[j]===0)queue[tail++]=j}
  else exported+=accumulation[i];
 }
 if(tail!==count)throw Error('Cycle in connected water network');
 return {receiver,accumulation,depth,retained,exported};
}
global.SH95LakeRouting=Object.freeze({build});
})(window);
