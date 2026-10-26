/* Pure trajectory simulation extracted from artillery-map.js. No DOM or mission state. */
(()=>{
'use strict';
const G=9.81,K=8e-5;
function simulate(az,el,v0,c,{weather,ground,dragMultiplier=1}){
  const wx=-weather.ws*Math.sin(weather.wd*Math.PI/180),wy=-S.ws*Math.cos(S.wd*Math.PI/180),gx=c.g.x,gy=c.g.y;
  let p=[0,0,ground(gx,gy)+1],vv=[v0*Math.cos(el)*Math.sin(az),v0*Math.cos(el)*Math.cos(az),v0*Math.sin(el)];
  const dt=.01,pts=[p.slice()];let t=0,n=0;
  const acc=w=>{const rx=w[0]-wx,ry=w[1]-wy,s=Math.hypot(rx,ry,w[2]),drag=K*dragMultiplier;return[-drag*s*rx,-drag*s*ry,-G-drag*s*w[2]]};
  while(t<400){
    const a1=acc(vv),vm=vv.map((q,i)=>q+a1[i]*dt/2),a2=acc(vm),np=p.map((q,i)=>q+vm[i]*dt),nv=vv.map((q,i)=>q+a2[i]*dt);t+=dt;n++;
    const g0=ground(gx+p[0],gy+p[1]),g1=ground(gx+np[0],gy+np[1]);
    if(np[2]<=g1&&n>5){const f=Math.min(1,Math.max(0,(p[2]-g0)/((p[2]-g0)-(np[2]-g1)||1))),ip=p.map((q,i)=>q+(np[i]-q)*f);pts.push(ip);return{x:gx+ip[0],y:gy+ip[1],t:t-dt+dt*f,pts}}
    p=np;vv=nv;if(n%20==0)pts.push(p.slice())}
  return null}

window.SH95Ballistics=Object.freeze({simulate});
})();
