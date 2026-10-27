// Cartographic geometry derived from the drainage graph; never changes it.
(function(global){
'use strict';
function build(receiver,accumulation,size,threshold=600){
 const count=size*size;
 if(!Number.isInteger(size)||size<2||receiver.length!==count||accumulation.length!==count)throw Error('Invalid river grid');
 const incoming=new Int32Array(count),next=new Int32Array(count),degree=new Uint8Array(count),active=new Uint8Array(count);
 incoming.fill(-1);next.fill(-1);
 for(let i=0;i<count;i++)if(accumulation[i]>threshold){
  active[i]=1;const j=receiver[i];
  if(j>=0&&j<count){degree[j]++;next[i]=incoming[j];incoming[j]=i}
 }
 const point=i=>[i%size,size-1-Math.floor(i/size)];
 const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const segments=[];
 const width=q=>Math.min(3, .8+Math.log2(Math.max(1,q/threshold))*.3);
 for(let i=0;i<count;i++)if(active[i]){
  const to=receiver[i],p=point(i),hasOut=to>=0&&to<count;
  const end=hasOut?midpoint(p,point(to)):p;
  const from=degree[i]===1?incoming[i]:-1;
  if(from>=0){
   const start=midpoint(point(from),p);
   segments.push({cell:i,from,to,start,control:p,end,width:width(accumulation[i])});
  }else{
   // At confluences each incoming half joins exactly at the grid node.
   if(degree[i]>1)for(let j=incoming[i];j>=0;j=next[j]){
    const start=midpoint(point(j),p);
    segments.push({cell:i,from:j,to:i,start,control:p,end:p,width:width(accumulation[j])});
   }
   if(hasOut)segments.push({cell:i,from:i,to,start:p,control:p,end,width:width(accumulation[i])});
  }
 }
 // Rivers reaching a below-threshold endpoint still end at its centre.
 for(let i=0;i<count;i++)if(active[i]){
  const j=receiver[i];if(j>=0&&j<count&&!active[j]){
   const p=point(i),q=point(j);segments.push({cell:j,from:i,to:j,start:midpoint(p,q),control:q,end:q,width:width(accumulation[i])});
  }
 }
 return segments;
}
global.SH95RiverGeometry=Object.freeze({build});
})(window);
