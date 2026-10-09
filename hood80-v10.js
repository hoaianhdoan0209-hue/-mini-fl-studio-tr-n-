/* Mini FL Studio V1.0 — Original 80-bar, vocal-ready Hood Trap arrangement. */
'use strict';
(function(){
const CHORDS=['F3+Ab3+C4','Db3+F3+Ab3','Ab3+C4+Eb4','Eb3+G3+Bb3'];
const BASS=['F2','Db2','Ab2','Eb2'], FIFTH=['C3','Ab2','Eb3','Bb2'], MELODY=['C4','Ab3','Eb4','Bb3'];
const TAIL=['Ab3','F3','C4','G3'];
const SECTION_NAMES=['Intro','Verse A','Build','Hook A','Verse B','Hook cuối'];
const SECTIONS=[{name:'INTRO',from:0,to:7},{name:'VERSE 1',from:8,to:23},{name:'PRE-HOOK',from:24,to:31},{name:'HOOK 1',from:32,to:47},{name:'VERSE 2',from:48,to:63},{name:'HOOK CUỐI',from:64,to:79}];
const choose=b=>b<8?'intro':b<24?'verse':b<32?'build':b<48?'hook':b<64?'verse2':'final';
function makeBeatText(){
 const result=['MINIFL BEAT V1','TEN: Dem Len Den - Hood Trap Full 2m15','BPM: 142',
 '# Hood Trap ngau, vocal ready - F minor - 80 o'];
 for(let b=0;b<80;b++){
  const i=b%4,number=b+1,sec=choose(b),q=b%8;
  const label=SECTIONS.find(s=>s.from===b);if(label)result.push('# '+label.name+' | o '+number+'-'+(label.to+1));
  let kick=[],snare=[],hat=[],open=[];
  if(sec==='intro'){
    kick=b<4?[]:(q%2===0?[1,11]:[1,7]);
    snare=b<4?[]:[9];
    hat=b<4?[]:[1,5,9,13];
    if(b===7){hat=[1,3,5,7,9,11,13,14,15,16];snare=[9,16];}
  } else if(sec==='build'){
    kick=q<4?[1,11]:[1,7,11];
    snare=[9];hat=q<4?[1,3,5,7,9,11,13,15]:[1,3,5,7,9,11,13,14,15,16];
    if(q===7){kick=[1,7];snare=[9,15,16];hat=[1,3,5,7,9,11,12,13,14,15,16];}
  } else {
    const variants=[[1,7,11,15],[1,6,11,14],[1,7,10,15],[1,6,12,15]];
    kick=variants[i].slice();
    if((sec==='hook'||sec==='final') && (q===2||q===6))kick.push(13);
    if(sec==='verse2'&&q%4===1)kick=[1,8,11,16];
    if(sec==='final'&&q%4===3)kick.push(16);
    snare=[9];
    if(q===3||q===7){snare.push(16);kick.push(16);}
    hat=q===3||q===7?[1,3,5,7,9,11,13,14,15,16]:[1,3,5,7,9,11,13,15];
    if(sec==='hook'||sec==='final'){
      if(q===1||q===5)hat.push(6,8);
      if(q===2||q===6)hat.push(12,14,16);
      if(q%2===1)open=[7];
    }else if(q===5)open=[15];
    if(sec==='verse2'&&q===0)hat=[1,5,9,13];
  }
  function drum(key,notes){if(notes.length)result.push('DRUM '+number+' '+key+' '+[...new Set(notes)].sort((a,z)=>a-z).join(','));}
  drum('KICK',kick);drum('SNARE',snare);drum('HAT',hat);drum('OPENHAT',open);
  if(sec!=='intro'||b>=4){
    let pattern='';
    if(sec==='intro')pattern='1:'+BASS[i]+'(8)';
    else if(sec==='build')pattern='1:'+BASS[i]+'(8),11:'+BASS[i]+'(2)';
    else if(sec==='verse2'&&q<4)pattern='1:'+BASS[i]+'(8),11:'+FIFTH[i]+'(2),15:'+BASS[i]+'(2)';
    else if(sec==='hook'||sec==='final')pattern='1:'+BASS[i]+'(4),6:'+BASS[i]+'(2),10:'+FIFTH[i]+'(2),13:'+BASS[i]+'(2)';
    else pattern='1:'+BASS[i]+'(4),6:'+BASS[i]+'(2),8:'+BASS[i]+'(2),11:'+FIFTH[i]+'(2),14:'+BASS[i]+'(2)';
    if(i===3&&(sec==='hook'||sec==='final'||q===7)){
      pattern += ',15:E2(2)>F2';
    }
    result.push('BASS '+number+' '+pattern);
  }
  let piano='1:'+CHORDS[i]+'(8)';
  if(sec==='intro'){
    if(b%2===0)piano+=',13:'+MELODY[i]+'(2)';
  }else if(sec==='verse'||sec==='verse2'){
    if(q%2===0)piano+=',13:'+MELODY[i]+'(2)';
    else if(q===3||q===7)piano+=',15:'+TAIL[i]+'(2)';
  }else if(sec==='build'){
    piano+=q<4?',13:'+MELODY[i]+'(2)':',11:'+MELODY[i]+'(2),14:'+TAIL[i]+'(2)';
  }else {
    piano+=',11:'+MELODY[i]+'(2),14:'+TAIL[i]+'(2)';
    if(q===7)piano+=',16:F4(1)';
  }
  result.push('PIANO '+number+' '+piano);
  // Additional melodic layers and transitions; keep verses sparse for vocals.
  if(sec==='intro'&&b>=2&&b%2===0)result.push('PAD '+number+' 1:'+CHORDS[i]+'(16)');
  if(sec==='verse'||sec==='verse2'){
    if(q===0||q===4)result.push('PAD '+number+' 1:'+CHORDS[i]+'(16)');
    if(q%4===2)result.push('BELL '+number+' 3:'+MELODY[i]+'(2),11:'+TAIL[i]+'(2)');
    if(q===7)result.push('PLUCK '+number+' 9:'+MELODY[i]+'(2),13:'+TAIL[i]+'(2)');
  }
  if(sec==='build'){
    result.push('PAD '+number+' 1:'+CHORDS[i]+'(16)');
    result.push('PLUCK '+number+' 1:'+MELODY[i]+'(2),5:'+TAIL[i]+'(2),9:'+MELODY[i]+'(2),13:'+TAIL[i]+'(2)');
    if(q>=4)result.push('RISER '+number+' 1:C4(16)');
    if(q===7)result.push('FX '+number+' 15:C4(2)');
  }
  if(sec==='hook'||sec==='final'){
    result.push('PAD '+number+' 1:'+CHORDS[i]+'(16)');
    result.push('BELL '+number+' 1:'+MELODY[i]+'(2),7:'+TAIL[i]+'(2),13:'+MELODY[i]+'(2)');
    if(q%2===0)result.push('PLUCK '+number+' 3:'+TAIL[i]+'(2),11:'+MELODY[i]+'(2)');
    if(q===0||q===4)result.push('FX '+number+' 1:C4(2)');
    if(q===7)result.push('RISER '+number+' 9:C4(8)');
  }
 }
 return result.join('\n');
}
window.hood80BeatText=makeBeatText;
window.hood80Sections=SECTIONS;
})();
