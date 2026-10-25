
/* Self-contained Windows 95-inspired games; no external resources. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function tone(k){window.sh95Sound?.(k)}
function show(id){$('startmenu').hidden=true;$('minesWindow').hidden=id!=='minesWindow';$('solWindow').hidden=id!=='solWindow';tone('open')}
$('smmines').onclick=()=>{show('minesWindow');if(!mineCells.length)newMines()};
$('smsolitaire').onclick=()=>{show('solWindow');if(!tableau.length)newSol()};
document.querySelectorAll('[data-close-game]').forEach(b=>b.onclick=()=>{$(b.dataset.closeGame).hidden=true;tone('close')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('minesWindow').hidden||!$('solWindow').hidden){$('minesWindow').hidden=true;$('solWindow').hidden=true}}});
// Minesweeper: first click safe, flood reveal, flags and victory detection.
let mineCells=[],mineOver=false,firstMove=true;
const adj=i=>{let r=Math.floor(i/9),c=i%9,out=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){let rr=r+dr,cc=c+dc;if((dr||dc)&&rr>=0&&rr<9&&cc>=0&&cc<9)out.push(rr*9+cc)}return out};
function newMines(){mineCells=Array.from({length:81},()=>({mine:false,open:false,flag:false,n:0}));mineOver=false;firstMove=true;$('mineStatus').textContent=I18n.t("Game");renderMines()}
function placeMines(safe){let allowed=Array.from({length:81},(_,i)=>i).filter(i=>i!==safe&&!adj(safe).includes(i));for(let i=allowed.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allowed[i],allowed[j]]=[allowed[j],allowed[i]]}allowed.slice(0,10).forEach(i=>mineCells[i].mine=true);mineCells.forEach((c,i)=>c.n=adj(i).filter(j=>mineCells[j].mine).length)}
function reveal(i){const c=mineCells[i];if(!c||c.open||c.flag||mineOver)return;if(firstMove){placeMines(i);firstMove=false}if(c.mine){c.open=true;mineOver=true;$('mineStatus').textContent=I18n.t("Defeat");tone('error');renderMines();return}const q=[i],seen=new Set();while(q.length){const j=q.shift(),v=mineCells[j];if(seen.has(j)||v.open||v.flag)continue;seen.add(j);v.open=true;if(v.n===0)adj(j).forEach(n=>{if(!mineCells[n].mine)q.push(n)})}if(mineCells.filter(x=>x.open).length===71){mineOver=true;$('mineStatus').textContent=I18n.t("Victory!");tone('success')}else tone('mark');renderMines()}
function flag(i){const c=mineCells[i];if(!c||c.open||mineOver)return;c.flag=!c.flag;tone('mark');renderMines()}
function renderMines(){const grid=$('mineGrid');grid.replaceChildren();mineCells.forEach((c,i)=>{const b=document.createElement('button');b.className='mine-cell'+(c.open?' open':'')+(c.flag?' flag':'')+(c.open&&c.mine?' bomb':'')+(c.open&&c.n?' n'+c.n:'');b.textContent=c.open?(c.mine?'✹':c.n||''):(c.flag?'⚑':mineOver&&c.mine?'✹':'');b.onclick=()=>reveal(i);b.oncontextmenu=e=>{e.preventDefault();flag(i)};grid.append(b)});$('mineCount').textContent='Мины: '+(10-mineCells.filter(c=>c.flag).length)}
$('mineNew').onclick=newMines;
// Klondike draw-one: tableau, stock, waste, foundations and multi-card runs.
const suits=['♠','♥','♣','♦'];let tableau=[],stock=[],waste=[],found=[],sel=null;
const red=c=>c&&(c.s===1||c.s===3),rank=r=>['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][r];
function newSol(){let deck=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)deck.push({s,r,up:false});for(let i=deck.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}tableau=Array.from({length:7},()=>[]);for(let c=0;c<7;c++)for(let n=0;n<=c;n++){const x=deck.pop();x.up=n===c;tableau[c].push(x)}stock=deck;waste=[];found=Array.from({length:4},()=>[]);sel=null;$('solStatus').textContent=I18n.t("New Game");renderSol()}
function cardEl(c,selected=false){const el=document.createElement('div');el.className='sol-card '+(c.up?(red(c)?'red':'black'):'back')+(selected?' selected':'');if(c.up)el.innerHTML=rank(c.r)+'<small>'+suits[c.s]+'</small>';return el}
function pick(src,col,index){sel={src,col,index};tone('mark');renderSol()}
function selectedCards(){if(!sel)return[];return sel.src==='waste'?waste.slice(-1):sel.src==='found'?found[sel.col].slice(-1):tableau[sel.col].slice(sel.index)}
function removeSelected(){let a=sel.src==='waste'?waste:sel.src==='found'?found[sel.col]:tableau[sel.col];const n=sel.src==='tab'?sel.index:a.length-1;const cards=a.splice(n);if(sel.src==='tab'&&a.length&&!a.at(-1).up)a.at(-1).up=true;sel=null;return cards}
function moveTo(dst,col){if(!sel)return;const cards=selectedCards(),first=cards[0];if(!first)return;let target=dst==='tab'?tableau[col]:found[col];if(dst==='tab'&&sel.src==='tab'&&sel.col===col)return;let valid=dst==='tab'?(!target.length?first.r===13:(target.at(-1).r===first.r+1&&red(target.at(-1))!==red(first))):cards.length===1&&first.s===col&&first.r===target.length+1;if(!valid){tone('error');return}target.push(...removeSelected());tone('confirm');if(found.every(a=>a.length===13)){$('solStatus').textContent=I18n.t("Victory!");tone('success')}renderSol()}
function renderSol(){const top=$('solTop'),cols=$('solCols');top.replaceChildren();cols.replaceChildren();const stockSlot=document.createElement('div');stockSlot.className='sol-slot';if(stock.length)stockSlot.append(cardEl({up:false}));else stockSlot.textContent='↻';stockSlot.onclick=()=>{if(stock.length){const c=stock.pop();c.up=true;waste.push(c)}else if(waste.length){stock=waste.reverse().map(c=>({...c,up:false}));waste=[]}sel=null;tone('click');renderSol()};top.append(stockSlot);
const wasteSlot=document.createElement('div');wasteSlot.className='sol-slot';if(waste.length){wasteSlot.append(cardEl(waste.at(-1),sel?.src==='waste'));wasteSlot.onclick=()=>pick('waste',0,waste.length-1)}top.append(wasteSlot);
const spacer=document.createElement('div');top.append(spacer);
for(let f=0;f<4;f++){const slot=document.createElement('div');slot.className='sol-slot';slot.title=suits[f];if(found[f].length)slot.append(cardEl(found[f].at(-1),sel?.src==='found'&&sel.col===f));else slot.textContent=suits[f];slot.onclick=()=>{if(sel)moveTo('found',f);else if(found[f].length)pick('found',f,found[f].length-1)};top.append(slot)}
for(let col=0;col<7;col++){const slot=document.createElement('div');slot.className='sol-col';slot.onclick=()=>moveTo('tab',col);tableau[col].forEach((c,i)=>{const chosen=sel?.src==='tab'&&sel.col===col&&i>=sel.index;const el=cardEl(c,chosen);el.style.top=(i*23)+'px';el.style.zIndex=String(i+1);el.onclick=e=>{e.stopPropagation();if(sel){if(sel.src==='tab'&&sel.col===col){sel=null;renderSol()}else moveTo('tab',col)}else if(c.up)pick('tab',col,i)};slot.append(el)});cols.append(slot)}}
$('solNew').onclick=newSol;
$('solAuto').onclick=()=>{let moved=false;for(let f=0;f<4&&!moved;f++){if(waste.length&&waste.at(-1).s===f&&waste.at(-1).r===found[f].length+1){sel={src:'waste',col:0,index:waste.length-1};moveTo('found',f);moved=true}for(let t=0;t<7&&!moved;t++){const a=tableau[t],c=a.at(-1);if(c?.up&&c.s===f&&c.r===found[f].length+1){sel={src:'tab',col:t,index:a.length-1};moveTo('found',f);moved=true}}}if(!moved){$('solStatus').textContent=I18n.t("No Available Foundation Moves");tone('error')}};
})();
