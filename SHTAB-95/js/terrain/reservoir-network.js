// Experimental static fill/spill network on disjoint sink catchments.
// All input volumes arrive before equilibrium; no evaporation, groundwater,
// runoff timing or channel transport is represented. Not used by the game.
(function(global){
'use strict';
function solve(heights,size,catchments,inputVolumes,cellArea=1){
 const {basin,sinks,edges}=catchments,n=sinks.length,count=size*size;
 if(heights.length!==count||basin.length!==count||inputVolumes.length!==n||!Number.isFinite(cellArea)||cellArea<=0)throw Error('Invalid reservoir network');
 const parent=new Int32Array(n),cells=Array.from({length:n},()=>[]),volume=new Float64Array(n),drain=new Uint8Array(n);
 for(let i=0;i<n;i++){
  if(!Number.isFinite(inputVolumes[i])||inputVolumes[i]<0)throw Error('Invalid reservoir input');
  parent[i]=i;volume[i]=inputVolumes[i];const p=sinks[i],x=p%size,y=Math.floor(p/size);
  if(x===0||y===0||x===size-1||y===size-1)drain[i]=1;
 }
 for(let i=0;i<count;i++){const id=basin[i];if(id<0||id>=n)throw Error('Invalid basin label');cells[id].push(i)}
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
 const events=[];let exported=0;for(let i=0;i<n;i++)if(drain[i]){exported+=volume[i];volume[i]=0}
 const queue=[],pending=new Uint8Array(n);
 function enqueue(i){i=root(i);if(!drain[i]&&!pending[i]){pending[i]=1;queue.push(i)}}
 for(let i=0;i<n;i++)enqueue(i);
 for(let head=0;head<queue.length;head++){
  const requested=queue[head];pending[requested]=0;const i=root(requested);
  if(i!==requested||drain[i])continue;
  let best=null,target=-1;
  for(const e of edges){const a=root(e.a),b=root(e.b);if(a===b)continue;
   if(a!==i&&b!==i)continue;const j=a===i?b:a;
   if(!best||e.level<best.level||(e.level===best.level&&j<target)){best=e;target=j}
  }
  if(!best)throw Error('Catchment has no spill path');
  const result=global.SH95Reservoir.fill(heights,cells[i],best.level,volume[i],cellArea);
  if(result.overflow<=0)continue;
  const fromCell=root(basin[best.from])===i?best.from:best.to;
  const toCell=fromCell===best.from?best.to:best.from;
  events.push({fromCell,toCell,amount:result.overflow});
  volume[i]=result.stored;
  if(drain[target]){exported+=result.overflow;continue}
  const other=global.SH95Reservoir.fill(heights,cells[target],best.level,volume[target],cellArea);
  // Once both sides have reached the connecting saddle, they form one pool.
  const capacity=other.stored+other.overflow;
  const targetAtSaddle=other.overflow>0||(other.level!==null&&other.level>=best.level)||capacity===0&&cells[target].every(p=>heights[p]>=best.level);
  // A neighbour with a lower escape cannot rise to this saddle: process its
  // lower spill before allowing a pool merge, even if it has unprocessed input.
  let targetSpill=Infinity;
  for(const edge of edges){const a=root(edge.a),b=root(edge.b);if(a!==b&&(a===target||b===target))targetSpill=Math.min(targetSpill,edge.level)}
  const connected=targetAtSaddle&&targetSpill>=best.level;
  if(connected){
   parent[target]=i;for(const p of cells[target])cells[i].push(p);cells[target]=[];
   volume[i]+=volume[target]+result.overflow;volume[target]=0;enqueue(i);
  }else{volume[target]+=result.overflow;enqueue(target)}
 }
 const levels=new Float64Array(n);levels.fill(NaN);let stored=0;
 for(let i=0;i<n;i++)if(root(i)===i&&!drain[i]){
  let next=Infinity;for(const e of edges){const a=root(e.a),b=root(e.b);if(a!==b&&(a===i||b===i))next=Math.min(next,e.level)}
  if(!Number.isFinite(next))throw Error('Catchment has no final spill');
  const result=global.SH95Reservoir.fill(heights,cells[i],next,volume[i],cellArea);
  if(result.overflow>1e-6)throw Error('Unrouted overflow');
  levels[i]=result.level===null?NaN:result.level;stored+=result.stored;
 }
 const groups=new Int32Array(n);for(let i=0;i<n;i++)groups[i]=root(i);
 // Transfers later submerged by merging are internal to the final lake.
 const transfers=events.filter(e=>groups[basin[e.fromCell]]!==groups[basin[e.toCell]]);
 return {groups,levels,stored,exported,transfers};
}
global.SH95ReservoirNetwork=Object.freeze({solve});
})(window);
