/* Session-wide, evolving fictional weather; simulated, not a forecast. */
(()=>{
'use strict';
const TIMES=[{id:'morning',name:'Morning',icon:'🌅',noise:.16,drag:1.01},{id:'day',name:'Day',icon:'☀',noise:.08,drag:1},{id:'evening',name:'Evening',icon:'🌇',noise:.24,drag:1.015},{id:'night',name:'Night',icon:'🌙',noise:.34,drag:1.025}];
// Weighted conditional weather: keys are time-of-day IDs; zero means impossible.
// Probabilities are relative weights and are normalized for each mission.
const WEATHERS=[
 {id:'clear',name:'Clear',icon:'☀️',noise:0,drag:1,weights:{morning:25,day:35,evening:25,night:35}},
 {id:'cloudy',name:'Cloudy',icon:'☁️',noise:.04,drag:1.015,weights:{morning:22,day:25,evening:27,night:25}},
 {id:'overcast',name:'Overcast',icon:'🌥️',noise:.09,drag:1.03,weights:{morning:15,day:16,evening:20,night:15}},
 {id:'fog',name:'Fog',icon:'🌫️',noise:.06,drag:1.025,weights:{morning:20,day:0,evening:0,night:0}},
 {id:'drizzle',name:'Drizzle',icon:'🌦️',noise:.17,drag:1.04,weights:{morning:8,day:9,evening:10,night:10}},
 {id:'rain',name:'Rain',icon:'🌧️',noise:.28,drag:1.06,weights:{morning:7,day:10,evening:11,night:10}},
 {id:'downpour',name:'Heavy Rain',icon:'🌧️',noise:.45,drag:1.085,weights:{morning:2,day:3,evening:4,night:3}},
 {id:'thunderstorm',name:'Thunderstorm',icon:'⛈️',noise:.58,drag:1.1,weights:{morning:1,day:2,evening:3,night:2}}
];

// Inland Dinaric / Bosnian-inspired climate. Directions indicate where wind comes FROM.
const HOUR=3600000,STEP=30*60000;
const SEASONS={winter:{rose:[14,20,10,18,8,6,10,14],speed:[3,9],fog:2.1,rain:1.2,storm:.45},spring:{rose:[10,10,10,15,10,10,20,15],speed:[2,7],fog:1,rain:1.15,storm:1.1},summer:{rose:[8,8,8,10,12,14,24,16],speed:[1,5],fog:.35,rain:.7,storm:1.7},autumn:{rose:[10,10,10,20,12,12,16,10],speed:[2,8],fog:2.3,rain:1.4,storm:.75}};
const timeAt=ms=>TIMES[(()=>{const h=new Date(ms).getUTCHours();return h<6?3:h<12?0:h<18?1:2})()];
const seasonAt=ms=>{const m=new Date(ms).getUTCMonth();return m===11||m<=1?'winter':m<=4?'spring':m<=7?'summer':'autumn'};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const wrap=deg=>(Math.round(deg)%360+360)%360;
const turn=(from,to,max)=>wrap(from+clamp(((to-from+540)%360)-180,-max,max));
let state=null;
function weighted(options,random){const sum=options.reduce((a,x)=>a+x.weight,0);if(sum<=0)return options[0]?.item;let roll=random()*sum;for(const x of options){roll-=x.weight;if(roll<0)return x.item}return options.find(x=>x.weight>0)?.item||options[0].item}
function climateWeight(w,ms,windSpeed,previous){const season=SEASONS[seasonAt(ms)],h=new Date(ms).getUTCHours();let weight=w.weights[timeAt(ms).id]||0;
 if(w.id==='fog'){const cooling=h>=18||h<10?1:seasonAt(ms)==='winter'?.55:.06;weight=(h>=18||h<10?12:2)*season.fog*cooling*(windSpeed<=2?2.3:windSpeed<=5?1:windSpeed<=8?.25:.015)*(previous&&['rain','drizzle','overcast','fog'].includes(previous.id)?1.6:1);}
 if(w.id==='rain'||w.id==='drizzle'||w.id==='downpour')weight*=season.rain;
 if(w.id==='thunderstorm')weight*=season.storm;
 return weight;
}
function pickWeather(ms,random,windSpeed,previous,exclude){return weighted(WEATHERS.filter(item=>item.id!==exclude).map(item=>({item,weight:climateWeight(item,ms,windSpeed,previous)})),random)}
const neighbors={clear:['clear','cloudy','fog'],cloudy:['clear','cloudy','overcast','fog','drizzle'],overcast:['cloudy','overcast','drizzle','rain','fog'],fog:['fog','clear','cloudy','overcast'],drizzle:['cloudy','overcast','drizzle','rain','fog'],rain:['overcast','drizzle','rain','downpour','thunderstorm','fog'],downpour:['rain','downpour','thunderstorm'],thunderstorm:['rain','downpour','thunderstorm','overcast']};
function chooseNext(current,ms,random,windSpeed){return weighted(WEATHERS.filter(w=>neighbors[current.id].includes(w.id)).map(item=>({item,weight:climateWeight(item,ms,windSpeed,current)*(item.id===current.id?2:1)})),random)}
function chooseRegime(ms,random){const season=seasonAt(ms);return weighted([{item:'continental',weight:60},{item:'calm',weight:season==='autumn'||season==='winter'?22:18},{item:'bora',weight:season==='winter'?15:season==='autumn'?8:5},{item:'jugo',weight:season==='autumn'?14:season==='winter'?12:8}],random)}
function chooseDirection(ms,random,regime){if(regime==='bora')return wrap(45+(random()-.5)*50);if(regime==='jugo')return wrap(135+(random()-.5)*60);const rose=SEASONS[seasonAt(ms)].rose;const sector=weighted(rose.map((weight,i)=>({item:i,weight})),random);return wrap(sector*45+(random()-.5)*45)}
function windTarget(ms,random,regime,weather){const [lo,hi]=SEASONS[seasonAt(ms)].speed;let speed=lo+random()*(hi-lo);if(regime==='calm')speed*=.4;if(regime==='bora')speed+=7+random()*5;if(regime==='jugo')speed+=3+random()*4;if(weather.id==='thunderstorm')speed+=4+random()*4;return clamp(speed,0,24)}
function interval(weather,season,random){const factors={clear:1.3,cloudy:1,overcast:1.25,fog:season==='winter'?1.7:.65,drizzle:1,rain:1,downpour:.45,thunderstorm:.3};return (.75+random()*2.75)*(factors[weather.id]||1)*HOUR}
function conditions(){const time=timeAt(state.at),weather=state.weather;return {time,weather,season:seasonAt(state.at),regime:state.regime,noise:Math.min(1,time.noise+weather.noise),drag:time.drag*weather.drag,ws:Math.round(state.ws),wd:wrap(state.wd)}}
function initialize(ms,random,excludeWeather){const regime=chooseRegime(ms,random),direction=chooseDirection(ms,random,regime);const speed=windTarget(ms,random,regime,{id:'clear'}),weather=pickWeather(ms,random,speed,null,excludeWeather);state={at:ms,weather,regime,ws:speed,wd:direction,nextChange:ms+interval(weather,seasonAt(ms),random)};return conditions()}
function newMission(ms,random=Math.random){if(!Number.isFinite(ms))return null;const old=state;const next=initialize(ms,random,old?.weather.id);return {...next,changed:!old||old.weather.id!==next.weather.id||timeAt(old.at).id!==next.time.id,windChanged:!old||Math.round(old.ws)!==next.ws||wrap(old.wd)!==next.wd};}
function advance(ms,random=Math.random){if(!Number.isFinite(ms))return null;if(!state||ms<state.at)return initialize(ms,random);const previous=state.weather.id,previousWind=Math.round(state.ws),previousDirection=wrap(state.wd),previousTime=timeAt(state.at).id;let loops=0;
 while(state.nextChange<=ms&&loops++<1000){const at=state.nextChange;const regime=chooseRegime(at,random);const targetDirection=chooseDirection(at,random,regime);const targetSpeed=windTarget(at,random,regime,state.weather);state.wd=turn(state.wd,targetDirection,regime===state.regime?25:65);state.ws=clamp(state.ws+clamp(targetSpeed-state.ws,-3,3),0,24);state.regime=regime;state.weather=chooseNext(state.weather,at,random,state.ws);state.nextChange=at+interval(state.weather,seasonAt(at),random);}
 state.at=ms;const current=conditions();return {...current,changed:previous!==current.weather.id||previousTime!==current.time.id,windChanged:previousWind!==current.ws||previousDirection!==current.wd};}
function wind(){if(!state)return {ws:0,wd:0};return {ws:Math.round(state.ws),wd:wrap(state.wd)}}
window.SH95Weather=Object.freeze({advance,newMission,wind,reset:()=>{state=null},timeAt,seasonAt});
})();
