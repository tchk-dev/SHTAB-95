
/* Manual Morse transcription: separate from the recording decoder. */
(()=>{'use strict';
const table={'.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E','..-.':'F','--.':'G','....':'H','..':'I','.---':'J','-.-':'K','.-..':'L','--':'M','-.':'N','---':'O','.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T','..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y','--..':'Z','-----':'0','.----':'1','..---':'2','...--':'3','....-':'4','.....':'5','-....':'6','--...':'7','---..':'8','----.':'9'};
const input=document.getElementById('manualMorseInput'),out=document.getElementById('manualMorseOutput');
document.getElementById('manualMorseDecode').onclick=()=>{const raw=input.value.trim();if(!raw){out.textContent='НЕТ СИГНАЛА';return}out.textContent=raw.split(/\s*\/\s*|\s{3,}/).map(word=>word.trim().split(/\s+/).map(code=>table[code]||'□').join('')).join(' ')};
document.getElementById('manualMorseClear').onclick=()=>{input.value='';out.textContent='ОЖИДАНИЕ ВВОДА';input.focus()};
})();
