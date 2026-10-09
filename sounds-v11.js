/* Mini FL Studio V1.1 – Offline instrument library (Web Audio synthesis). */
'use strict';
(function(){
const OPTIONS={
 drums:[['trapKit','Trap Kit'],['punchKit','Punch Trap Kit · Lực hơn']],
 bass:[['heavy808','808 Heavy'],['soft808','808 Round'],['sub808','808 Deep Sub · Trầm']],
 piano:[['darkPiano','Dark Piano'],['softPiano','Soft Keys'],['studioPiano','Piano thu thật · Studio']],
 lead:[['neonLead','Neon Lead'],['thinLead','Air Lead'],['electricGuitar','Guitar điện Clean · Âm thật'],['electricDrive','Guitar điện Drive · Âm thật']],
 pad:[['ambientDark','Ambient Pad'],['ambientWide','Wide Pad']],
 bell:[['darkBell','Dark Bell'],['crystalBell','Crystal Bell']],
 pluck:[['glassPluck','Glass Pluck'],['woodPluck','Wood Pluck'],['nylonGuitar','Guitar Nylon · Thu thật'],['acousticGuitar','Acoustic Guitar · Thu thật']],
 fx:[['impactFX','Impact Hit'],['vinylFX','Vinyl Crackle']],
 riser:[['noiseRiser','Noise Riser'],['reverseRiser','Reverse Sweep']]
};
const ID2KIND=new Map();for(const [kind,list] of Object.entries(OPTIONS))for(const [id] of list)ID2KIND.set(id,kind);
const DEFAULTS=['trapKit','heavy808','darkPiano','neonLead','ambientDark','darkBell','glassPluck','impactFX','noiseRiser'];
const noiseCache=new WeakMap(),busCache=new WeakMap();
function noise(ctx){
 let b=noiseCache.get(ctx);if(b)return b;
 b=ctx.createBuffer(1,Math.max(1000,Math.floor(ctx.sampleRate*2)),ctx.sampleRate);
 const arr=b.getChannelData(0);let x=1471371;
 for(let i=0;i<arr.length;i++){x=(Math.imul(x,1664525)+1013904223)|0;arr[i]=(x/2147483648)*.8;}
 noiseCache.set(ctx,b);return b;
}
function wetBus(ctx,dest){
 let map=busCache.get(ctx);if(!map){map=new WeakMap();busCache.set(ctx,map);}
 let bus=map.get(dest);if(bus)return bus;
 const input=ctx.createGain(),delay=ctx.createDelay(.65),feedback=ctx.createGain(),filter=ctx.createBiquadFilter(),wet=ctx.createGain();
 delay.delayTime.value=.205;feedback.gain.value=.19;filter.type='lowpass';filter.frequency.value=2600;wet.gain.value=.21;
 input.connect(delay);delay.connect(filter);filter.connect(feedback);feedback.connect(delay);filter.connect(wet);wet.connect(dest);
 map.set(dest,input);return input;
}
function freq(p){return 440*Math.pow(2,(p-69)/12);}
function env(ctx,dest,start,attack,hold,release,level){
 const g=ctx.createGain();g.gain.setValueAtTime(.00001,start);
 g.gain.linearRampToValueAtTime(Math.max(.00001,level),start+Math.max(.003,attack));
 g.gain.setValueAtTime(Math.max(.00001,level),start+Math.max(.003,attack)+Math.max(.008,hold));
 g.gain.exponentialRampToValueAtTime(.00001,start+Math.max(.003,attack)+Math.max(.008,hold)+Math.max(.035,release));
 g.connect(dest);return g;
}
function osc(ctx,shape,hz,when,until,output,volume,detune=0,slide=null){
 const source=ctx.createOscillator(),gain=ctx.createGain();source.type=shape;
 source.frequency.setValueAtTime(hz,when);
 if(slide&&slide>0){source.frequency.setValueAtTime(hz,when+Math.max(.01,(until-when)*.28));source.frequency.exponentialRampToValueAtTime(slide,when+Math.max(.03,(until-when)*.90));}
 source.detune.value=detune;gain.gain.value=volume;source.connect(gain);gain.connect(output);
 source.start(when);source.stop(until);return source;
}
function burst(ctx,dest,start,duration,level,low,high,rising=false){
 const src=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),gain=ctx.createGain();
 src.buffer=noise(ctx);src.loop=duration>1.7;
 bp.type='bandpass';bp.Q.value=.65;bp.frequency.setValueAtTime(Math.max(100,low),start);
 bp.frequency.exponentialRampToValueAtTime(Math.max(150,high),start+Math.max(.06,duration*.94));
 gain.gain.setValueAtTime(rising?.0001:Math.max(.001,level),start);
 if(rising){gain.gain.linearRampToValueAtTime(level,start+duration*.85);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);}
 else gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 src.connect(bp);bp.connect(gain);gain.connect(dest);src.start(start);src.stop(start+duration+.01);
}
function play(ctx,kind,id,n,when,stepDuration,dest){
 if(!Number.isFinite(when)||!dest)return;
 if(!ID2KIND.has(id)||ID2KIND.get(id)!==kind)id=OPTIONS[kind]?.[0]?.[0];
 const pitch=n.pitch,vel=Math.max(.04,Math.min(1,n.velocity)),length=Math.max(.04,n.length*stepDuration),hz=freq(pitch);
 if(kind==='fx'){
  if(id==='vinylFX'){burst(ctx,dest,when,Math.min(1.4,length),vel*.07,800,4400);burst(ctx,dest,when+Math.min(.13,length*.28),Math.min(.12,length*.27),vel*.06,1700,800);}
  else {burst(ctx,dest,when,.65,vel*.20,4500,400);const g=env(ctx,dest,when,.004,.05,.48,vel*.28);osc(ctx,'sine',115,when,when+.60,g,1,0,52);}
  return;
 }
 if(kind==='riser'){
  const duration=Math.max(.25,Math.min(4,length));
  burst(ctx,dest,when,duration,vel*(id==='reverseRiser'?.14:.22),
    id==='reverseRiser'?800:350,id==='reverseRiser'?4200:10000,true);
  const gain=env(ctx,dest,when,Math.max(.10,duration*.60),.04,Math.max(.13,duration*.20),vel*.08);
  const a=osc(ctx,'sawtooth',hz*.5,when,when+duration+.01,gain,1);
  a.frequency.exponentialRampToValueAtTime(hz*2.5,when+duration*.92);
  return;
 }
 const rev=wetBus(ctx,dest),send=ctx.createGain();send.gain.value=kind==='pad'?.42:kind==='bell'?.36:.16;send.connect(rev);
 const post=ctx.createGain();post.connect(dest);post.connect(send);
 if(kind==='bell'){
   const soft=id==='darkBell',v=vel*(soft?.13:.16);
   for(const [ratio,amp,decay] of [[1,1,Math.min(length+.40,1.6)],[2.72,.26,.52],[5.4,.11,.25]]){
    const g=env(ctx,post,when,.002,.018,decay,v*amp);
    osc(ctx,'sine',hz*ratio,when,when+decay+.06,g,1);
   }
   return;
 }
 if(kind==='pluck'){
   if(id==='nylonGuitar'){
     // Nylon-string-inspired pluck: softened harmonics and short finger transient.
     const low=ctx.createBiquadFilter();low.type='lowpass';low.Q.value=.48;
     low.frequency.setValueAtTime(3000,when);
     low.frequency.exponentialRampToValueAtTime(730,when+Math.min(.8,length+.20));
     low.connect(post);
     const decay=Math.min(1.58,Math.max(.42,length*1.12));
     const tone=env(ctx,low,when,.003,.018,decay,vel*.205);
     osc(ctx,'triangle',hz,when,when+decay+.07,tone,.78);
     osc(ctx,'sine',hz,when,when+decay+.07,tone,.55,-1.3);
     osc(ctx,'sine',hz*2,when,when+Math.min(.7,decay+.05),tone,.14);
     burst(ctx,low,when,.035,vel*.023,2100,5200);
     return;
   }
   const wood=id==='woodPluck',filter=ctx.createBiquadFilter();
   filter.type='lowpass';filter.frequency.setValueAtTime(wood?2100:6200,when);
   filter.frequency.exponentialRampToValueAtTime(wood?520:1200,when+Math.min(.6,length));
   filter.connect(post);
   const decay=Math.min(1.18,Math.max(.23,length*.70));
   const g=env(ctx,filter,when,.003,.008,decay,vel*(wood?.12:.15));
   osc(ctx,wood?'triangle':'sawtooth',hz,when,when+decay+.05,g,1);
   osc(ctx,'sine',hz*2,when,when+Math.min(.42,decay+.03),g,wood?.12:.18);
   return;
 }
 if(kind==='pad'){
   const attack=id==='ambientWide'?.42:.27,release=id==='ambientWide'?1.35:1.12;
   const hold=Math.max(.08,length-attack*.55);
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=id==='ambientWide'?1900:1150;filter.Q.value=.34;filter.connect(post);
   const g=env(ctx,filter,when,attack,hold,release,vel*.064);
   osc(ctx,'sawtooth',hz,when,when+attack+hold+release+.07,g,.56,-5);
   osc(ctx,'sawtooth',hz,when,when+attack+hold+release+.07,g,.50,5);
   osc(ctx,'sine',hz*.5,when,when+attack+hold+release+.07,g,.30);
   return;
 }
 if(kind==='bass'){
   const deep=id==='sub808',smooth=id==='soft808'||deep,rel=deep?.29:smooth?.23:.17,amp=vel*(deep?.37:smooth?.31:.36);
   const g=env(ctx,post,when,.004,Math.max(.035,length-.013),rel,amp);
   const end=when+length+rel+.09;
   const slide=Number.isInteger(n.slideTo)?freq(n.slideTo):null;
   osc(ctx,'sine',hz,when,end,g,.88,0,slide);
   osc(ctx,'sawtooth',hz,when,end,g,deep?.055:smooth?.08:.18,0,slide);
   if(!smooth||deep)osc(ctx,'sine',hz*.5,when,end,g,deep?.47:.35,0,slide?slide*.5:null);
   return;
 }
 if(kind==='piano'){
   const muted=id==='darkPiano',decay=Math.min(muted?1.28:1.9,Math.max(.28,length*.75));
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=muted?2100:4600;filter.connect(post);
   const g=env(ctx,filter,when,.003,.015,decay,vel*(muted?.14:.16));
   osc(ctx,'triangle',hz,when,when+decay+.06,g,.72);
   osc(ctx,'sine',hz*2,when,when+Math.min(.35,decay),g,.12);
   osc(ctx,'sine',hz,when,when+decay+.06,g,.33);
   return;
 }
 if(kind==='lead'){
   const airy=id==='thinLead',rel=airy?.42:.19;
   const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=airy?3300:2300;f.connect(post);
   const g=env(ctx,f,when,.01,Math.max(.05,length-.02),rel,vel*(airy?.067:.10));
   osc(ctx,airy?'triangle':'sawtooth',hz,when,when+length+rel+.05,g,.8);
   osc(ctx,'sine',hz,when,when+length+rel+.05,g,.28,4);
 }
}
function setupUI(){
 const tab=document.getElementById('toolsTab');if(!tab)return;
 const panel=document.createElement('section');panel.className='sound-lib';
 panel.innerHTML='<div class="sound-eyebrow">SOUND LIBRARY · V1.3</div><h2>Thư viện âm thanh</h2><p>Guitar điện Clean/Drive, Acoustic, Nylon và Piano có <b>mẫu tiếng thu thật</b>; trống Punch + 808 Sub vẫn tổng hợp. Có thể nghe và xuất WAV offline.</p><div class="sound-controls"><label>NHẠC CỤ<select id="soundTrackSelect"></select></label><label>CHỌN TIẾNG<select id="soundPresetSelect"></select></label></div><div class="sound-action-row"><button id="soundAuditionBtn">▶ Nghe thử</button><button id="soundSaveBtn" class="sound-apply">✓ Áp dụng tiếng</button></div><p id="soundLoadHint" class="sound-help">Nhấn Nghe thử để tải tiếng thực vào bộ phát. Các mẫu đã được đóng gói trong ứng dụng.</p><p class="sound-help">Track SYNTH có Guitar điện. Track PLUCK có Guitar Acoustic/Nylon. Dùng ⋯ → Đổi tiếng ở Bản phối để chọn nhanh.</p><p class="sound-help"><a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noopener noreferrer">Nguồn mẫu âm CC BY 3.0 · ghi công</a></p>';
 const beatImport=tab.querySelector('.beat-import');
 if(beatImport)beatImport.insertAdjacentElement('afterend',panel);
 else tab.querySelector('.section-head').insertAdjacentElement('afterend',panel);
 const sel=document.getElementById('soundTrackSelect'),pres=document.getElementById('soundPresetSelect');
 TRACKS.forEach((tr,i)=>sel.add(new Option(tr.name,String(i))));
 const populate=()=>{const t=+sel.value,kind=TRACKS[t].kind;pres.innerHTML='';for(const [id,label] of OPTIONS[kind]||[])pres.add(new Option(label,id));pres.value=song.sounds?.[String(t)]||DEFAULTS[t];};
 sel.value='5';populate();sel.addEventListener('change',populate);
 document.getElementById('soundAuditionBtn').addEventListener('click',async()=>{
 const t=+sel.value, id=pres.value,button=document.getElementById('soundAuditionBtn');
 if(t===0){toast('Dùng Play để nghe tiếng trống trên track TRỐNG');return;}
 const pitch=t===1?41:t===7?48:t===8?60:t===3?69:t===6?65:60;
 const prev=song.sounds?.[String(t)];
 button.disabled=true;button.textContent='Đang chuẩn bị tiếng…';
 document.getElementById('soundLoadHint').textContent=window.miniSamplesV13?.canUse(id)?'Đang giải mã mẫu tiếng thu thật trên thiết bị…':'Đang nghe tiếng tổng hợp…';
 try{
   song.sounds[String(t)]=id;
   await audition(t,[note(0,pitch,t===8||t===4?16:4,.85)]);
   document.getElementById('soundLoadHint').textContent=window.miniSamplesV13?.canUse(id)?'Đã phát tiếng thu thật · Có thể dùng offline.':'Đã phát tiếng tổng hợp.';
 }catch(e){toast('Không nghe được: '+e.message);}
 finally{song.sounds[String(t)]=prev||DEFAULTS[t];button.disabled=false;button.textContent='▶ Nghe thử';}
 });
 document.getElementById('soundSaveBtn').addEventListener('click',()=>{const t=+sel.value;const id=pres.value;if(!OPTIONS[TRACKS[t].kind].some(item=>item[0]===id))return;stopPlaying();song.sounds[String(t)]=id;autoSave();updateSelected();renderArrangement();toast('Đã chọn '+pres.options[pres.selectedIndex].text+' cho '+TRACKS[t].name);});
 window.miniSoundsV11.refresh=populate;
}
window.miniSoundsV11={OPTIONS,DEFAULTS,ID2KIND,play,refresh:()=>{}};
document.addEventListener('DOMContentLoaded',()=>{try{setupUI();}catch(e){console.error('Sound library',e);}});
})();