/* Topographic map renderer for SHTAB-95. Pure terrain inputs, deterministic seeded features. */
(function(root){
'use strict';
const SIZE=768;
function random(seed){let a=seed|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const profiles={
 velikograd:{forest:.40,wet:.53,alpine:.92,rock:.96,farms:.60},
 donja_bukovica:{forest:.18,wet:.75,alpine:1,rock:1,farms:.86},
 popovac:{forest:.38,wet:.42,alpine:1,rock:.96,farms:.65},
 lipovac:{forest:.80,wet:.57,alpine:.83,rock:.95,farms:.22},
 pribrezje:{forest:.23,wet:.16,alpine:.91,rock:.63,farms:.18},
 mckhetovac:{forest:.58,wet:.46,alpine:.70,rock:.84,farms:.13}
};
const colors={paper:[248,246,225],field:[249,245,218],meadow:[226,236,196],deciduous:[196,222,163],conifer:[163,201,145],scrub:[218,224,183],rock:[232,227,211],alpine:[235,235,204],water:[101,186,211]};
function generate(heights,region,seed,worldSize=32000,n=192){
 const r=random(seed^0x61f8a3),p=profiles[region]||profiles.velikograd,cell=worldSize/(n-1);
 let min=Infinity,max=-Infinity;
 for(const h of heights){min=Math.min(min,h);max=Math.max(max,h)}
 const range=Math.max(1,max-min);
 const at=(x,y)=>{const u=clamp(x/cell,0,n-1.001),v=clamp(y/cell,0,n-1.001),i=u|0,j=v|0,a=u-i,b=v-j,k=j*n+i;return heights[k]*(1-a)*(1-b)+heights[k+1]*a*(1-b)+heights[k+n]*(1-a)*b+heights[k+n+1]*a*b};
 const slope=(x,y)=>Math.hypot(at(x+cell,y)-at(x-cell,y),at(x,y+cell)-at(x,y-cell))/(2*cell);
 const rivers=[],riverCells=new Set(),sources=[];
 for(let j=3;j<n-3;j+=5)for(let i=3;i<n-3;i+=5){
  const x=i*cell,y=j*cell,h=at(x,y),rel=(h-min)/range;
  if(rel>.48&&rel<.93&&r()<.18)sources.push({x,y,h});
 }
 sources.sort((a,b)=>b.h-a.h);
 for(const source of sources.slice(0,24)){
  let x=source.x,y=source.y,points=[[x,y]],visited=new Set();
  for(let k=0;k<360;k++){
   const i=Math.round(x/cell),j=Math.round(y/cell),key=j*n+i;
   if(visited.has(key)||i<2||j<2||i>=n-2||j>=n-2)break;
   visited.add(key);riverCells.add(key);
   let best=null,bestH=at(x,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    const xx=x+dx*cell,yy=y+dy*cell,h=at(xx,yy);
    if(h<bestH-0.01){bestH=h;best=[xx,yy]}
   }
   if(!best)break;
   [x,y]=best;points.push([x,y]);
   if(riverCells.has(Math.round(y/cell)*n+Math.round(x/cell))&&points.length>5)break;
  }
  if(points.length>=13)rivers.push(points);
 }
 const nearRiver=(x,y)=>{
  const i=Math.round(x/cell),j=Math.round(y/cell);
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(riverCells.has((j+dy)*n+i+dx))return true;
  return false;
 };
 const settlements=[],names=['Stari Brod','Dolnje Polje','Brezovac','Novigrad','Kamenica','Lipovik','Ravnica','Podgora','Jasenik','Vrbica','Gornji Lug','Beli Potok','Dubrava','Mali Grad','Zelenik','Selo','Bukovac','Priboj','Studenac','Gradina','Borovac','Zagorje','Javorje','Milovac'];
 for(let k=0;k<2400&&settlements.length<17;k++){
  const x=(.07+r()*.86)*worldSize,y=(.07+r()*.86)*worldSize,sl=slope(x,y),rel=(at(x,y)-min)/range;
  if(sl>.14||rel>.72||rel<.015)continue;
  if(settlements.some(s=>Math.hypot(x-s.x,y-s.y)<1600))continue;
  const river=nearRiver(x,y);
  if(r()>(river?.87:.27))continue;
  settlements.push({x,y,name:names[settlements.length%names.length],size:settlements.length<3?3:settlements.length<8?2:1});
 }
 const roads=[];
 // Build a sparse connected road network; gently favor lower terrain in intermediate points.
 for(let i=1;i<settlements.length;i++){
  const a=settlements[i],others=settlements.slice(0,i).sort((u,v)=>Math.hypot(u.x-a.x,u.y-a.y)-Math.hypot(v.x-a.x,v.y-a.y));
  const b=others[0],path=[];
  const segments=Math.max(8,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/260));
  for(let t=0;t<=segments;t++){
   const q=t/segments,x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q;
   const dx=b.y-a.y,dy=-(b.x-a.x),len=Math.hypot(dx,dy)||1;
   const left=at(x+dx/len*300,y+dy/len*300),right=at(x-dx/len*300,y-dy/len*300);
   const bend=(left<right?1:-1)*Math.min(180,Math.abs(left-right)*1.5)*Math.sin(Math.PI*q);
   path.push([clamp(x+dx/len*bend,0,worldSize),clamp(y+dy/len*bend,0,worldSize)]);
  }
  roads.push(path);
 }
 return {at,slope,min,max,range,cell,worldSize,region,p,rivers,settlements,roads,seed};
}
function render(data){
 const {at,slope,min,range,worldSize,p,rivers,settlements,roads,seed}=data;
 const cv=document.createElement('canvas');cv.width=cv.height=SIZE;
 const ctx=cv.getContext('2d'),im=ctx.createImageData(SIZE,SIZE),r=random(seed^0x5a87b);
 const grid=new Float32Array((SIZE+1)*(SIZE+1)),step=worldSize/SIZE;
 for(let j=0;j<=SIZE;j++)for(let i=0;i<=SIZE;i++)grid[j*(SIZE+1)+i]=at(i*step,(SIZE-j)*step);
 const height=(i,j)=>grid[j*(SIZE+1)+i];
 for(let j=0;j<SIZE;j++)for(let i=0;i<SIZE;i++){
  const h=height(i,j),rel=(h-min)/range;
  const gx=(height(i+1,j)-height(Math.max(0,i-1),j))/(2*step);
  const gy=(height(i,Math.max(0,j-1))-height(i,Math.min(SIZE,j+1)))/(2*step);
  const steep=Math.hypot(gx,gy),noise=(Math.sin(i*.035+seed)*Math.cos(j*.029)+Math.sin(i*.089+j*.052))*0.075;
  const moisture=p.wet+noise+.11*Math.sin(i*.011-j*.018);
  const forest=p.forest+noise+.10*(rel>.25&&rel<.72?1:0);
  let col=colors.field;
  if(rel>p.rock||steep>.75)col=colors.rock;
  else if(rel>p.alpine)col=colors.alpine;
  else if(rel>.47&&forest>.5)col=colors.conifer;
  else if(forest>.47&&moisture>.25)col=colors.deciduous;
  else if(moisture<.22)col=colors.scrub;
  else if(rel>.24||moisture>.5)col=colors.meadow;
  const shade=clamp(1+(gx-gy)*.12+(r()-.5)*.028,.86,1.10),k=(j*SIZE+i)*4;
  for(let c=0;c<3;c++)im.data[k+c]=col[c]*shade;
  im.data[k+3]=255;
 }
 ctx.putImageData(im,0,0);
 // Marching-squares contours; major lines every 100m, minor lines every 20m.
 const low=Math.ceil(min/20)*20,high=Math.floor((min+range)/20)*20;
 ctx.lineJoin='round';ctx.lineCap='round';
 for(let level=low;level<=high;level+=20){
  const major=level%100===0;
  ctx.beginPath();ctx.strokeStyle=major?'rgba(146,87,51,.82)':'rgba(165,105,70,.57)';ctx.lineWidth=major?1.15:.63;
  const crossings=(i,j)=>{
   const a=height(i,j),b=height(i+1,j),c=height(i+1,j+1),d=height(i,j+1),pts=[];
   const edge=(x1,y1,h1,x2,y2,h2)=>{if((h1<level)!==(h2<level)){const t=(level-h1)/(h2-h1);pts.push([x1+(x2-x1)*t,y1+(y2-y1)*t])}};
   edge(i,j,a,i+1,j,b);edge(i+1,j,b,i+1,j+1,c);edge(i+1,j+1,c,i,j+1,d);edge(i,j+1,d,i,j,a);
   return pts;
  };
  for(let j=0;j<SIZE;j+=2)for(let i=0;i<SIZE;i+=2){
   // Sample at 2px intervals for performance, with accurate interpolation.
   const a=height(i,j),b=height(i+2,j),c=height(i+2,j+2),d=height(i,j+2),pts=[];
   const edge=(x1,y1,h1,x2,y2,h2)=>{if((h1<level)!==(h2<level)){const t=(level-h1)/(h2-h1);pts.push([x1+(x2-x1)*t,y1+(y2-y1)*t])}};
   edge(i,j,a,i+2,j,b);edge(i+2,j,b,i+2,j+2,c);edge(i+2,j+2,c,i,j+2,d);edge(i,j+2,d,i,j,a);
   if(pts.length===2){ctx.moveTo(...pts[0]);ctx.lineTo(...pts[1])}
   else if(pts.length===4){ctx.moveTo(...pts[0]);ctx.lineTo(...pts[1]);ctx.moveTo(...pts[2]);ctx.lineTo(...pts[3])}
  }
  ctx.stroke();
  // Index-contour elevation figures at terrain crossings, avoiding a fixed legend.
  if(major){
   ctx.font='9px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
   for(let j=45;j<SIZE-45;j+=145)for(let i=45;i<SIZE-45;i+=160){
    const h=height(i,j),next=height(i+12,j);
    if((h-level)*(next-level)<=0){
     const x=i+12*(level-h)/(next-h||1);
     ctx.fillStyle='#f8f4df';ctx.fillRect(x-13,j-6,26,12);
     ctx.fillStyle='#905c39';ctx.fillText(String(level),x,j);
    }
   }
  }
 }
 const screen=([x,y])=>[x/worldSize*SIZE,(worldSize-y)/worldSize*SIZE];
 const path=(pts)=>{ctx.beginPath();pts.forEach((pt,i)=>{const [x,y]=screen(pt);i?ctx.lineTo(x,y):ctx.moveTo(x,y)})};
 // Water overlays the contours; thin tributaries and stronger main streams.
 rivers.forEach((pts,i)=>{path(pts);ctx.strokeStyle='#f9f8e9';ctx.lineWidth=i<6?3.3:2.3;ctx.stroke();path(pts);ctx.strokeStyle='#4aaacb';ctx.lineWidth=i<6?1.9:1.15;ctx.stroke()});
 roads.forEach(pts=>{path(pts);ctx.strokeStyle='#f9f6e8';ctx.lineWidth=4;ctx.stroke();path(pts);ctx.strokeStyle='#a14e45';ctx.lineWidth=1.5;ctx.stroke();});
 // Deterministic clustered buildings and place labels.
 const rr=random(seed^0x2fd01);
 settlements.forEach(s=>{
  const [x,y]=screen([s.x,s.y]),count=s.size*7;
  for(let k=0;k<count;k++){
   const angle=rr()*Math.PI*2,dist=Math.sqrt(rr())*(s.size*7+4),bx=x+Math.cos(angle)*dist,by=y+Math.sin(angle)*dist;
   ctx.save();ctx.translate(bx,by);ctx.rotate((rr()-.5)*.35);ctx.fillStyle='#f8f5e9';ctx.fillRect(-2,-1.5,4,3);ctx.strokeStyle='#34312d';ctx.lineWidth=.8;ctx.strokeRect(-2,-1.5,4,3);ctx.restore();
  }
  ctx.font=(s.size===3?'bold 13px':'bold 11px')+' Georgia,serif';ctx.textAlign='center';ctx.textBaseline='top';
  const label=s.name,tw=ctx.measureText(label).width;ctx.fillStyle='rgba(248,246,225,.88)';ctx.fillRect(x-tw/2-3,y+s.size*7+7,tw+6,15);
  ctx.fillStyle='#242722';ctx.fillText(label,x,y+s.size*7+9);
 });
 return cv;
}
root.SH95Cartography={generate,render,profiles};
})(window);
