// Static single-catchment storage for an explicitly supplied water volume.
// Does not model coupled lakes, rainfall timing, evaporation or infiltration.
(function(global){
'use strict';
function fill(heights,cells,spillLevel,volume,cellArea=1){
 if(!Number.isFinite(spillLevel)||!Number.isFinite(volume)||volume<0||!Number.isFinite(cellArea)||cellArea<=0)throw Error('Invalid reservoir parameters');
 const levels=[],seen=new Set();
 for(const i of cells){
  if(!Number.isInteger(i)||i<0||i>=heights.length||!Number.isFinite(heights[i]))throw Error('Invalid reservoir cell');
  if(seen.has(i))throw Error('Duplicate reservoir cell');seen.add(i);
  if(heights[i]<spillLevel)levels.push(heights[i]);
 }
 levels.sort((a,b)=>a-b);
 if(!levels.length||volume===0)return {level:null,stored:0,overflow:volume};
 let capacity=0;for(const h of levels)capacity+=(spillLevel-h)*cellArea;
 if(volume>=capacity)return {level:spillLevel,stored:capacity,overflow:volume-capacity};
 let remaining=volume,current=levels[0],wet=1;
 for(let i=1;i<=levels.length;i++){
  const next=i<levels.length?levels[i]:spillLevel,needed=(next-current)*wet*cellArea;
  if(remaining<needed)return {level:current+remaining/(wet*cellArea),stored:volume,overflow:0};
  remaining-=needed;current=next;wet++;
 }
 return {level:spillLevel,stored:capacity,overflow:Math.max(0,volume-capacity)};
}
global.SH95Reservoir=Object.freeze({fill});
})(window);
