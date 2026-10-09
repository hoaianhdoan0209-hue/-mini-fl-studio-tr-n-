/* Mini FL Studio V1.3 – sample playback, embedded CC BY 3.0 instrument recordings.
   Source and attribution: SAMPLE-CREDITS.md. No third-party network required. */
'use strict';
(function(){
const ROOT=window.miniRecordedBanksV13||{};
const IDS=Object.freeze({
 electricGuitar:'electricGuitar',electricDrive:'electricGuitar',
 acousticGuitar:'acousticGuitar',nylonGuitar:'nylonGuitar',
 studioPiano:'studioPiano'
});
const decoded=new Map(),loading=new Map(),noises=new WeakMap(),guitarRooms=new WeakMap();
const curve=(()=>{const v=new Float32Array(1024);for(let i=0;i<v.length;i++){const x=(2*i)/(v.length-1)-1;v[i]=Math.tanh(4.2*x)/Math.tanh(4.2);}return v;})();
function fromBase64(str){
 const a=new Uint8Array(Math.floor(str.length*3/4));
 let len=0;
 for(let i=0;i<str.length;i+=32764){
  const b=atob(str.slice(i,Math.min(str.length,i+32764)));
  for(let j=0;j<b.length;j++)a[len++]=b.charCodeAt(j);
 }
 return a.buffer.slice(0,len);
}
function idKind(id){return IDS[id]||null;}
function canUse(id){return !!(IDS[id]&&ROOT[IDS[id]]?.length);}
async function loadOne(ctx,bank){
 if(decoded.has(bank))return decoded.get(bank);
 if(loading.has(bank))return loading.get(bank);
 if(!Array.isArray(ROOT[bank])||!ROOT[bank].length)throw Error('Không thấy mẫu nhạc cụ '+bank);
 const task=(async()=>{
   const notes=new Map();
   const entries=ROOT[bank];
   for(const entry of entries){
     if(!Array.isArray(entry)||entry.length!==2)throw Error('Dữ liệu mẫu '+bank+' bị lỗi');
     const [pitch,encoded]=entry;
     const data=fromBase64(encoded);
     if(data.byteLength<2048)throw Error('Âm thanh không hợp lệ: '+bank);
     const buffer=await ctx.decodeAudioData(data);
     if(buffer.duration<.05)throw Error('Âm thanh quá ngắn');
     notes.set(Number(pitch),buffer);
   }
   decoded.set(bank,notes);
   return notes;
 })();
 loading.set(bank,task);
 try{return await task;}finally{loading.delete(bank);}
}
async function ensure(ctx,ids){
 const keys=[...new Set((ids||[]).map(idKind).filter(Boolean))];
 if(!keys.length)return{loaded:0,failed:[]};
 const failures=[];
 await Promise.all(keys.map(async name=>{try{await loadOne(ctx,name);}catch(e){failures.push(name);console.warn('Sample fallback '+name,e);}}));
 return{loaded:keys.length-failures.length,failed:failures};
}
function ready(ctx,id){const bank=idKind(id);return !!(bank&&decoded.has(bank));}
function nearest(notes,midi){
 let closest=null,dist=Infinity;
 for(const pitch of notes.keys()){const d=Math.abs(pitch-midi);if(d<dist){dist=d;closest=pitch;}}
 return closest;
}
function guitarRoom(ctx,dest){
 let rooms=guitarRooms.get(ctx);
 if(!rooms){rooms=new WeakMap();guitarRooms.set(ctx,rooms);}
 let room=rooms.get(dest);
 if(room)return room;
 const input=ctx.createGain();
 const delay=ctx.createDelay(.85),tone=ctx.createBiquadFilter(),feedback=ctx.createGain(),wet=ctx.createGain();
 delay.delayTime.value=.185;
 tone.type='lowpass';tone.frequency.value=2450;
 feedback.gain.value=.16;
 wet.gain.value=.19;
 input.connect(delay);delay.connect(tone);
 tone.connect(wet);wet.connect(dest);
 tone.connect(feedback);feedback.connect(delay);
 room=input;rooms.set(dest,room);
 return room;
}
function play(ctx,id,n,when,stepDuration,dest){
 if(!canUse(id))return false;
 const data=decoded.get(idKind(id));
 if(!data||!data.size)return false;
 const pitch=nearest(data,n.pitch),buffer=data.get(pitch);
 if(!buffer)return false;
 const src=ctx.createBufferSource();
 src.buffer=buffer;
 const rate=Math.pow(2,(n.pitch-pitch)/12);
 src.playbackRate.setValueAtTime(rate,when);
 if(Number.isInteger(n.slideTo)){
  const target=Math.pow(2,(n.slideTo-pitch)/12);
  src.playbackRate.setValueAtTime(rate,when+Math.max(.01,n.length*stepDuration*.31));
  src.playbackRate.exponentialRampToValueAtTime(Math.max(.15,target),when+Math.max(.04,n.length*stepDuration*.92));
 }
 const isElec=id==='electricGuitar'||id==='electricDrive';
 const isPiano=id==='studioPiano',isGuitar=!isPiano;
 const noteLength=Math.max(.12,n.length*stepDuration);
 // Original hard stop (.18s release) made plucked strings sound like a synthetic zither.
 // Let the recorded guitar's naturally decaying string sustain continue beyond note-off.
 const tail=isPiano?.27:isElec?.74:.62;
 const amp=ctx.createGain(),velocity=Math.min(1,Math.max(.03,n.velocity||.7));
 const power=(isElec?.38:isPiano?.36:.37)*velocity;
 const attack=isElec?.012:.009;
 amp.gain.setValueAtTime(.0001,when);
 amp.gain.linearRampToValueAtTime(power,when+attack);
 amp.gain.exponentialRampToValueAtTime(power*(isElec?.82:.67),when+Math.min(noteLength*.6,.17));
 const releaseStart=when+noteLength;
 const end=releaseStart+tail;
 amp.gain.setValueAtTime(power*(isElec?.82:.67),releaseStart);
 amp.gain.exponentialRampToValueAtTime(.0001,end);
 let output=amp;
 if(id==='electricDrive'){
  const drive=ctx.createWaveShaper();drive.curve=curve;drive.oversample='2x';
  const filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=4300;
  amp.connect(drive);drive.connect(filt);output=filt;
 }else if(isGuitar){
  const filt=ctx.createBiquadFilter();filt.type='lowpass';
  // Remove brittle upper partials without losing the wooden string attack.
  filt.frequency.value=isElec?5500:4550;filt.Q.value=.38;
  amp.connect(filt);output=filt;
 }
 output.connect(dest);
 if(isGuitar)output.connect(guitarRoom(ctx,dest));
 src.connect(amp);
 src.start(when);
 // An MP3 naturally ends at its recorded length; only stop the source after
 // the audible release when the sample has enough duration.
 try{src.stop(end+.09);}catch(_){}
 return true;
}
function makeNoise(ctx){
 let n=noises.get(ctx);if(n)return n;
 const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate),ctx.sampleRate),data=b.getChannelData(0);
 let x=1736238;
 for(let i=0;i<data.length;i++){x=(Math.imul(1664525,x)+1013904223)|0;data[i]=(x/2147483648)*.75;}
 noises.set(ctx,b);return b;
}
function drum(ctx,pitch,when,velocity,dest){
 const v=Math.max(.08,Math.min(1,velocity));
 function pulse(freq,endFreq,len,vol,shape){
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=shape||'sine';
  o.frequency.setValueAtTime(freq,when);
  o.frequency.exponentialRampToValueAtTime(endFreq,when+Math.min(len*.75,.22));
  g.gain.setValueAtTime(Math.max(.0001,v*vol),when+.002);
  g.gain.exponentialRampToValueAtTime(.0001,when+len);
  o.connect(g);g.connect(dest);o.start(when);o.stop(when+len+.012);
 }
 function hiss(len,vol,low=4000){
  const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  n.buffer=makeNoise(ctx);f.type='highpass';f.frequency.value=low;
  g.gain.setValueAtTime(v*vol,when+.003);g.gain.exponentialRampToValueAtTime(.0001,when+len);
  n.connect(f);f.connect(g);g.connect(dest);n.start(when);n.stop(when+len+.008);
 }
 if(pitch===36){
  pulse(172,43,.42,.92,'sine');
  pulse(920,120,.028,.075,'triangle');
 }else if(pitch===38){
  pulse(205,125,.16,.23,'triangle');hiss(.18,.30,1250);
  for(const delta of [.014,.034]){const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=makeNoise(ctx);f.type='highpass';f.frequency.value=2300;g.gain.setValueAtTime(v*.055,when+delta);g.gain.exponentialRampToValueAtTime(.0001,when+delta+.07);src.connect(f);f.connect(g);g.connect(dest);src.start(when+delta);src.stop(when+delta+.075);}
 }else if(pitch===42){hiss(.084,.18,7200);}
 else if(pitch===46){hiss(.32,.15,5600);}
 else hiss(.07,.12,6800);
}
async function prepare(ctx,ids){return ensure(ctx,ids);}
window.miniSamplesV13={IDS,canUse,prepare,play,drum,ready,stats:()=>Object.fromEntries(Object.entries(ROOT).map(([k,n])=>[k,n.length]))};
})();