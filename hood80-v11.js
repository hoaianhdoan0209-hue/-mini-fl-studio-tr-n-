/* HOODTRAP-80-V2: expanded original arrangement with original new melodic parts */
'use strict';
(function(){
 const chords=['F3+Ab3+C4','Db3+F3+Ab3','Ab3+C4+Eb4','Eb3+G3+Bb3'];
 const bellA=['C5','Ab4','Eb5','Bb4'],bellB=['Ab4','F4','C5','G4'];
 const pluckRoot=['F4','Db4','Ab4','Eb4'],pluck5=['C5','Ab4','Eb5','Bb4'];
 const fxStops=new Set([1,9,25,33,49,65]);
 const risers=new Set([8,32,48,64,80]);
 function make(){
  if(typeof window.hood80BeatText!=='function')throw Error('Chưa tải nhạc gốc');
  const orig=window.hood80BeatText().split('\n');
  const out=['MINIFL BEAT V1','TEN: Dem Len Den Deluxe - Hood Trap 2m15','BPM: 142',
    '# Layer mix: Bell / Pluck / Ambient Pad / FX / Riser',
    'SOUND 1 heavy808','SOUND 2 darkPiano','SOUND 3 neonLead','SOUND 4 ambientDark',
    'SOUND 5 darkBell','SOUND 6 glassPluck','SOUND 7 impactFX','SOUND 8 noiseRiser'];
  for(const x of orig){
   if(/^(?:MINIFL BEAT V1|TEN:|BPM:)/.test(x))continue;
   out.push(x);
   const m=/^PIANO (\d+) /.exec(x);if(!m)continue;
   const bar=Number(m[1]),section=bar<=8?'intro':bar<=24?'verse':bar<=32?'build':bar<=48?'hook':bar<=64?'verse2':'final',idx=(bar-1)%4,beat=(bar-1)%8;
   // The pad is a sustained, low-volume harmonic bed, with periodic breathing room for rap.
   if(section==='intro'){
     if(bar===1||bar===3||bar===5||bar===7)out.push('PAD '+bar+' 1:'+chords[idx]+'(16)');
   }else if(section==='build'){
     out.push('PAD '+bar+' 1:'+chords[idx]+'(16)');
   }else if(section==='hook'||section==='final'){
     if(bar%2===1)out.push('PAD '+bar+' 1:'+chords[idx]+'(16)');
   }else if(beat===0||beat===4){
     out.push('PAD '+bar+' 1:'+chords[idx]+'(16)');
   }
   if(section==='intro'){
     if(bar===1||bar===3||bar===6||bar===8)out.push('BELL '+bar+' 1:'+bellA[idx]+'(4),9:'+bellB[idx]+'(4)');
   }else if(section==='hook'||section==='final'){
     if(bar%2===1)out.push('BELL '+bar+' 1:'+bellA[idx]+'(2),7:'+bellB[idx]+'(2),11:'+bellA[idx]+'(2),15:'+bellB[idx]+'(2)');
     else if(beat===7)out.push('BELL '+bar+' 13:'+bellA[idx]+'(2),15:'+bellB[idx]+'(2)');
   }else if(section==='build'){
     out.push('BELL '+bar+' 1:'+bellA[idx]+'(4),9:'+bellB[idx]+'(4)');
   }else if(beat===0||beat===4){
     out.push('BELL '+bar+' 13:'+bellB[idx]+'(2)');
   }
   if(section==='hook'||section==='final'){
     if(beat!==0)out.push('PLUCK '+bar+' 3:'+pluckRoot[idx]+'(2),7:'+pluck5[idx]+'(2),11:'+pluckRoot[idx]+'(2),15:'+pluck5[idx]+'(2)');
   }else if(section==='verse'||section==='verse2'){
     if(bar%2===0)out.push('PLUCK '+bar+' 5:'+pluckRoot[idx]+'(2),13:'+pluck5[idx]+'(2)');
   }else if(section==='build'){
     out.push('PLUCK '+bar+' 5:'+pluckRoot[idx]+'(2),9:'+pluck5[idx]+'(2),13:'+pluckRoot[idx]+'(2)');
   }
   if(fxStops.has(bar))out.push('FX '+bar+' 1:C3(4)');
   if(risers.has(bar))out.push('RISER '+bar+' 1:F3(16)');
   if((section==='hook'||section==='final')&&beat===7)out.push('FX '+bar+' 13:F3(2)');
  }
  return out.join('\n');
 }
 window.hood80BeatTextV11=make;
})();