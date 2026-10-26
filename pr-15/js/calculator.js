
/* Offline utilities: safe mathematical parser and Morse key. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const expr=$('calcExpr'),info=$('calcInfo'),plot=$('calcPlot'),hist=$('calcHistory');
const keys=['7','8','9','÷','C','4','5','6','×','⌫','1','2','3','−','^','0','.','(',')','+','sin(','cos(','tan(','sqrt(','π','log(','ln(','abs(','exp(','e','x','Ans','Graph','='];
const grid=$('calcKeys');let ans=0;
for(const key of keys){const b=document.createElement('button');b.type='button';b.textContent=key==='Graph'?I18n.t('Graph'):key;if('÷×−^+='.includes(key)||key==='Graph')b.className='op';if(key==='=')b.className='eq';grid.append(b);b.onclick=()=>{
 if(key==='C')expr.value='';else if(key==='⌫')expr.value=expr.value.slice(0,-1);else if(key==='=')calculate();else if(key==='Graph')drawGraph();else expr.value+=key==='Ans'?String(ans):key;expr.focus();if(key!=='=')drawGraph();
 }}
// Tokenizer + recursive-descent parser. No eval/Function and no global access.
function parse(input,x=0){
 const src=input.replace(/π/g,'pi').replace(/[×]/g,'*').replace(/[÷]/g,'/').replace(/[−]/g,'-');
 const tok=src.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z]+|[+*/^(),-]/gi)||[];
 if(tok.join('').toLowerCase()!==src.replace(/\s+/g,'').toLowerCase())throw Error(I18n.t('Invalid character'));
 let i=0;const peek=()=>tok[i],eat=t=>{if(peek()===t){i++;return true}return false};
 function atom(){if(eat('+'))return atom();if(eat('-'))return -power();if(eat('(')){let a=add();if(!eat(')'))throw Error(I18n.t('Unclosed parenthesis'));return a}
 const t=tok[i++];if(t===undefined)throw Error(I18n.t('Incomplete expression'));if(/^(?:\d|\.)/.test(t))return Number(t);
 const name=t.toLowerCase();if(name==='x')return x;if(name==='pi')return Math.PI;if(name==='e')return Math.E;
 const f={sin:Math.sin,cos:Math.cos,tan:Math.tan,sqrt:Math.sqrt,ln:Math.log,log:Math.log10,abs:Math.abs,exp:Math.exp,asin:Math.asin,acos:Math.acos,atan:Math.atan};
 if(!f[name])throw Error(I18n.t('Unknown function: ')+t);if(!eat('('))throw Error(I18n.t('Expected parenthesis after ')+t);const arg=add();if(!eat(')'))throw Error(I18n.t('Unclosed parenthesis'));return f[name](arg)}
 function power(){let a=atom();if(eat('^'))a=Math.pow(a,unary());return a}
 function unary(){if(eat('+'))return unary();if(eat('-'))return -unary();return power()}
 function mul(){let a=unary();while(peek()==='*'||peek()==='/'){const op=tok[i++],b=unary();a=op==='*'?a*b:a/b}return a}
 function add(){let a=mul();while(peek()==='+'||peek()==='-'){const op=tok[i++],b=mul();a=op==='+'?a+b:a-b}return a}
 const out=add();if(i!==tok.length)throw Error(I18n.t('Unexpected tokens'));return out
}
function calculate(){try{const n=parse(expr.value);if(!Number.isFinite(n))throw Error(I18n.t('Undefined result'));ans=n;info.textContent='= '+Number(n.toPrecision(11));hist.textContent=(expr.value+' = '+info.textContent.slice(2)+'\n'+hist.textContent).slice(0,600)}catch(e){info.textContent=I18n.t('Error: ')+e.message}}
function drawGraph(){const ctx=plot.getContext('2d'),w=plot.width,h=plot.height;ctx.fillStyle='#fafaf2';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ddd';ctx.lineWidth=1;
 for(let i=0;i<=10;i++){let px=i*w/10;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke()}for(let i=0;i<=6;i++){let py=i*h/6;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke()}
 const points=[];try{for(let i=0;i<w;i++){const x=-10+20*i/(w-1),y=parse(expr.value,x);points.push(Number.isFinite(y)?y:NaN)}if(points.every(n=>!Number.isFinite(n)))throw Error(I18n.t('No values'));
 let valid=points.filter(Number.isFinite).sort((a,b)=>a-b),lo=valid[Math.floor(valid.length*.05)],hi=valid[Math.floor(valid.length*.95)];if(!(hi>lo)){lo-=1;hi+=1}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;
 const py=y=>h-(y-lo)/(hi-lo)*h;ctx.strokeStyle='#777';ctx.beginPath();const zeroX=w/2,zeroY=py(0);ctx.moveTo(zeroX,0);ctx.lineTo(zeroX,h);ctx.moveTo(0,zeroY);ctx.lineTo(w,zeroY);ctx.stroke();ctx.strokeStyle='#005a26';ctx.lineWidth=1.5;ctx.beginPath();let connected=false;
 points.forEach((y,i)=>{if(!Number.isFinite(y)||y<lo-(hi-lo)*2||y>hi+(hi-lo)*2){connected=false;return}const yy=py(y);if(!connected)ctx.moveTo(i,yy);else ctx.lineTo(i,yy);connected=true});ctx.stroke();info.textContent=I18n.t('Graph: x −10…10 | y ')+lo.toFixed(2)+'…'+hi.toFixed(2)
 }catch(e){info.textContent=I18n.t('Graph: ')+e.message}}
expr.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calculate()}});expr.addEventListener('change',drawGraph);drawGraph();
})();
