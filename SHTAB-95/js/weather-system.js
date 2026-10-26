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

const HOUR=3600000,STEP=30*60000;
const timeAt=ms=>TIMES[(()=>{const h=new Date(ms).getUTCHours();return h<6?3:h<12?0:h<18?1:2})()];
let state=null;
function weighted(options,random){const sum=options.reduce((a,x)=>a+x.weight,0);let roll=random()*sum;for(const x of options){roll-=x.weight;if(roll<0)return x.item}return options.find(x=>x.weight>0)?.item||options[0].item}
function pickWeather(time,random){return weighted(WEATHERS.map(item=>({item,weight:item.weights[time.id]||0})),random)}
const neighbors={clear:['clear','cloudy','fog'],cloudy:['clear','cloudy','overcast','fog','drizzle'],overcast:['cloudy','overcast','drizzle','rain'],fog:['fog','clear','cloudy','overcast'],drizzle:['cloudy','overcast','drizzle','rain'],rain:['overcast','drizzle','rain','downpour','thunderstorm'],downpour:['rain','downpour','thunderstorm'],thunderstorm:['rain','downpour','thunderstorm','overcast']};
function chooseNext(current,time,random){const allowed=neighbors[current.id];return weighted(WEATHERS.filter(w=>allowed.includes(w.id)).map(item=>({item,weight:(item.weights[time.id]||0)*(item.id===current.id?2:1)})),random)}
function conditions(){const time=timeAt(state.at),weather=state.weather;return {time,weather,noise:Math.min(1,time.noise+weather.noise),drag:time.drag*weather.drag,ws:state.ws,wd:state.wd}}
function initialize(ms,random){const time=timeAt(ms);state={at:ms,weather:pickWeather(time,random),ws:Math.round(2+random()*10),wd:Math.round(random()*359),nextChange:ms+(1.5+random()*3.5)*HOUR};return conditions()}
function advance(ms,random=Math.random){if(!Number.isFinite(ms))return null;if(!state||ms<state.at)return initialize(ms,random);const previous=state.weather.id;const previousTime=timeAt(state.at).id;let loops=0;while(state.nextChange<=ms&&loops++<1000){const at=state.nextChange;state.weather=chooseNext(state.weather,timeAt(at),random);state.ws=Math.max(0,Math.min(18,Math.round(state.ws+(random()-.5)*5)));state.wd=(Math.round(state.wd+(random()-.5)*40)+360)%360;state.nextChange=at+(1.5+random()*3.5)*HOUR;}state.at=ms;const current=conditions();return {...current,changed:previous!==current.weather.id||previousTime!==current.time.id,windChanged:false}}
function wind(){if(!state)return {ws:0,wd:0};return {ws:state.ws,wd:state.wd}}
window.SH95Weather=Object.freeze({advance,wind,reset:()=>{state=null},timeAt});
})();
