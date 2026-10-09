/* Mini FL Studio – original romantic melodic trap, 64 bars; not a reconstruction of a commercial track. */
'use strict';
(function(){
 const harmony=[
  {bass:'C#2',fifth:'G#2',chord:'C#4+E4+G#4+B4',pad:'C#3+G#3+B3',gtr:['C#4','E4','G#4','B4'],lead:['G#4','B4','C#5','E5'],bell:['E5','G#5']},
  {bass:'A2',fifth:'E3',chord:'A3+C#4+E4+G#4',pad:'A3+E4+G#4',gtr:['A3','C#4','E4','G#4'],lead:['E5','C#5','B4','G#4'],bell:['C#5','E5']},
  {bass:'E2',fifth:'B2',chord:'E4+G#4+B4+F#5',pad:'E3+B3+F#4',gtr:['E4','G#4','B4','F#5'],lead:['F#5','E5','B4','G#4'],bell:['B4','F#5']},
  {bass:'B2',fifth:'F#2',chord:'B3+C#4+E4+F#4',pad:'B3+F#4+C#5',gtr:['B3','C#4','F#4','B4'],lead:['F#4','B4','C#5','G#4'],bell:['C#5','F#5']}
 ];
 const sections=[
  ['INTRO',1,8],['VERSE 1',9,24],['BUILD',25,32],
  ['HOOK 1',33,48],['VERSE 2',49,56],['HOOK CUỐI',57,64]
 ];
 function toText(){
  const out=[
   'MINIFL BEAT V1','TEN: Lau Dai Tren May - Romantic Melodic Trap','BPM: 112',
   '# SANG TAC RIENG - 64 o - 2 phut 17 giay',
   'SOUND 1 soft808','SOUND 2 softPiano','SOUND 3 thinLead','SOUND 4 ambientWide',
   'SOUND 5 crystalBell','SOUND 6 nylonGuitar','SOUND 7 vinylFX','SOUND 8 reverseRiser'
  ];
  function put(t,b,n){if(n&&n.length)out.push(t+' '+b+' '+n);}
  function drum(type,b,ss){
   if(ss?.length)put('DRUM',b,type+' '+[...new Set(ss)].sort((x,y)=>x-y).join(','));
  }
  for(let b=1;b<=64;b++){
   const i=(b-1)%4,h=harmony[i],phrase=(b-1)%8,section=b<=8?'intro':b<=24?'verse':b<=32?'build':b<=48?'hook':b<=56?'verse2':'last';
   const header=sections.find(x=>x[1]===b);if(header)out.push('# '+header[0]+' '+header[1]+'-'+header[2]);
   const g=h.gtr;
   // Acoustic-style independent arpeggio: varying inversions and rhythmic answers.
   let guitar;
   if(section==='intro'){
    guitar='1:'+g[0]+'(4),5:'+g[1]+'(2),8:'+g[2]+'(2),11:'+g[3]+'(4),15:'+g[1]+'(2)';
   }else if(section==='verse'||section==='verse2'){
    guitar='1:'+g[0]+'(4),6:'+g[2]+'(2),9:'+g[1]+'(4),14:'+g[3]+'(2)';
    if(phrase===3||phrase===7)guitar='1:'+g[0]+'(4),5:'+g[1]+'(2),8:'+g[2]+'(2),13:'+g[3]+'(4)';
   }else if(section==='build'){
    guitar='1:'+g[0]+'(2),4:'+g[2]+'(2),7:'+g[1]+'(2),10:'+g[3]+'(2),13:'+g[2]+'(4)';
   }else{
    guitar='1:'+g[0]+'(2),4:'+g[1]+'(2),7:'+g[2]+'(2),10:'+g[3]+'(2),13:'+g[1]+'(2),15:'+g[2]+'(2)';
    if(phrase===4)guitar='1:'+g[0]+'(8),9:'+g[2]+'(4),13:'+g[3]+'(4)';
   }
   put('PLUCK',b,guitar);
   // Harmonic body intentionally avoids copying the referenced song's sample or tune.
   if(section==='intro'){
    if(b>=3)put('PIANO',b,'1:'+h.chord+'(8)');
    if(b>=5)put('PAD',b,'1:'+h.pad+'(16)');
   }else if(section==='verse'||section==='verse2'){
    put('PIANO',b,(phrase%2===0?'1:'+h.chord+'(8)':'9:'+h.chord+'(8)'));
    if(phrase===0||phrase===4)put('PAD',b,'1:'+h.pad+'(16)');
   }else if(section==='build'){
    put('PIANO',b,'1:'+h.chord+'(8),9:'+h.chord+'(8)');
    put('PAD',b,'1:'+h.pad+'(16)');
   }else{
    put('PIANO',b,'1:'+h.chord+'(8),9:'+h.chord+'(8)');
    put('PAD',b,'1:'+h.pad+'(16)');
   }
   // Hook: independently composed melodic motif and answer, absent from verses.
   if(section==='hook'||section==='last'){
    const l=h.lead;
    if(phrase!==4)put('SYNTH',b,'1:'+l[0]+'(4),6:'+l[1]+'(2),9:'+l[2]+'(4),14:'+l[3]+'(2)');
    if(phrase%2===0)put('BELL',b,'3:'+h.bell[0]+'(2),11:'+h.bell[1]+'(2)');
   }else if(section==='intro'&&b>=7){
    put('BELL',b,'9:'+h.bell[0]+'(4)');
   }else if(section==='build'&&b>=29){
    put('BELL',b,'1:'+h.bell[0]+'(4),9:'+h.bell[1]+'(4)');
   }else if((section==='verse'||section==='verse2')&&phrase===6){
    put('BELL',b,'13:'+h.bell[0]+'(4)');
   }
   // Sub bass: spacious in verses, syncopated in hooks, with short glide at turnarounds.
   if(section!=='intro'||b>=7){
    let seq='';
    if(section==='intro')seq='1:'+h.bass+'(8)';
    else if(section==='verse'||section==='verse2'){
      seq='1:'+h.bass+'(8),11:'+h.fifth+'(2)';
      if(phrase===3||phrase===7)seq+=',15:'+h.bass+'(2)';
    }else if(section==='build'){
      seq='1:'+h.bass+'(8),11:'+h.fifth+'(4)';
    }else{
      seq='1:'+h.bass+'(4),6:'+h.bass+'(2),9:'+h.fifth+'(4),14:'+h.bass+'(2)';
      if(phrase===3||phrase===7)seq+=',16:'+h.bass+'(1)>'+h.fifth;
    }
    put('BASS',b,seq);
   }
   // 2-step halftime trap; hats open up at the hook, while intro starts gently.
   let kicks=[],snares=[],hats=[],openH=[];
   if(section==='intro'){
    if(b>=5){hats=[1,5,9,13];if(b>=7)kicks=[1,11];if(b>=7)snares=[9];}
   }else if(section==='build'){
    kicks=phrase<4?[1,11]:[1,7,11];snares=[9];hats=phrase<4?[1,3,5,7,9,11,13,15]:[1,3,5,7,9,11,13,14,15,16];
    if(b===32){snares.push(16);kicks=[1];}
   }else if(section==='verse'||section==='verse2'){
    kicks=phrase%4===0?[1,11,15]:phrase%4===1?[1,7,11]:[1,11];snares=[9];
    hats=phrase===3||phrase===7?[1,3,5,7,9,11,13,14,15,16]:[1,3,5,7,9,11,13,15];
    if(phrase===7)snares.push(16);
    if(section==='verse2'&&phrase===0){kicks=[1];hats=[1,5,9,13];}
   }else{
    kicks=phrase%4===0?[1,7,11,15]:phrase%4===1?[1,6,11,14]:phrase%4===2?[1,7,10,15]:[1,6,12,15];
    snares=[9];hats=[1,3,5,7,9,11,13,15];
    if(phrase%2===1)openH=[15];
    if(phrase===3||phrase===7){snares.push(16);hats.push(14,16);}
    if(phrase===4){kicks=[1,11];hats=[1,5,9,13];}
    if(b===64){kicks=[1];snares=[];hats=[];openH=[];}
   }
   drum('KICK',b,kicks);drum('SNARE',b,snares);drum('HAT',b,hats);drum('OPENHAT',b,openH);
   if([1,9,33,49,57].includes(b))put('FX',b,'1:C4(4)');
   if([32,56].includes(b))put('RISER',b,'1:C4(16)');
  }
  return out.join('\n');
 }
 window.castleCloudBeatText=toText;
 window.castleCloudMeta={title:'Lâu Đài Trên Mây',bpm:112,bars:64,sections};
})();
