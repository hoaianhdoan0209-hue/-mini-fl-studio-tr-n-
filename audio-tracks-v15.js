/* Mini FL Studio V1.5: audio recording, imports, editable timeline audio clips.
   Blob storage: IndexedDB; self-contained project export: embedded audio data URLs. */
'use strict';
(function(){
const MAX_BYTES=24*1024*1024, MAX_PROJECT_BYTES=31*1024*1024, MAX_CLIPS=16;
const supported=/\.(mp3|m4a|wav|ogg|opus|webm|aac|flac)$/i;
let api=null, dbPromise=null,recording=null, stream=null, parts=[],recordBar=0;
const memory=new Map(), decoded=new Map(), pending=new Map();
const $=id=>document.getElementById(id);
function uid(){return 'a'+(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Date.now().toString(36)+Math.random().toString(36).slice(2));}
function song(){return api.getSong();}
function clips(){let s=song();if(!Array.isArray(s.audioClips))s.audioClips=[];return s.audioClips;}
function toast(message){api.toast(message);}
function db(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise(resolve=>{
  if(!window.indexedDB){resolve(null);return;}
  const req=indexedDB.open('mini-fl-studio-audio-v1',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('audio'))req.result.createObjectStore('audio');};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>resolve(null);
  req.onblocked=()=>resolve(null);
 });
 return dbPromise;
}
async function storeBlob(id,blob){
 memory.set(id,blob);
 const database=await db();if(!database)return false;
 return new Promise(resolve=>{
  try{const t=database.transaction('audio','readwrite'),r=t.objectStore('audio').put(blob,id);
   r.onsuccess=()=>resolve(true);r.onerror=()=>resolve(false);}
  catch(e){resolve(false);}
 });
}
async function loadBlob(id){
 if(memory.has(id))return memory.get(id);
 const database=await db();if(!database)return null;
 return new Promise(resolve=>{
  try{const req=database.transaction('audio','readonly').objectStore('audio').get(id);
   req.onsuccess=()=>{if(req.result)memory.set(id,req.result);resolve(req.result||null);};
   req.onerror=()=>resolve(null);
  }catch(e){resolve(null);}
 });
}
async function deleteBlob(id){
 memory.delete(id);decoded.delete(id);
 const database=await db();if(!database)return;
 try{database.transaction('audio','readwrite').objectStore('audio').delete(id);}catch(_){}
}
async function dataURL(blob){
 return new Promise((resolve,reject)=>{
  const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Không đọc được âm thanh'));
  r.readAsDataURL(blob);
 });
}
function blobFromDataURL(str){
 const match=/^data:([^;,]*)(;base64)?,(.*)$/s.exec(str);
 if(!match||!match[2]||match[3].length>MAX_PROJECT_BYTES*1.45)throw Error('Dữ liệu âm thanh sai định dạng');
 const raw=atob(match[3]),arr=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
 return new Blob([arr],{type:match[1]||'application/octet-stream'});
}
async function decodedAudio(ctx,clip){
 if(decoded.has(clip.id))return decoded.get(clip.id);
 if(pending.has(clip.id))return pending.get(clip.id);
 const task=(async()=>{
  const blob=await loadBlob(clip.id);
  if(!blob)throw Error('Thiếu âm thanh "'+clip.name+'". Hãy nhập lại file hoặc mở dự án có kèm audio.');
  const data=await blob.arrayBuffer(),buffer=await ctx.decodeAudioData(data);
  if(!buffer.duration||!Number.isFinite(buffer.duration))throw Error('File âm thanh không hỗ trợ');
  decoded.set(clip.id,buffer);
  return buffer;
 })();
 pending.set(clip.id,task);
 try{return await task;}finally{pending.delete(clip.id);}
}
async function prepare(ctx){
 if(!clips().length)return true;
 const failures=[];
 await Promise.all(clips().map(async clip=>{try{await decodedAudio(ctx,clip);}catch(e){failures.push(e.message);}}));
 if(failures.length){toast(failures[0]);return false;}
 return true;
}
function scheduleOne(ctx,clip,when,dest,offset=0,limit=Infinity){
 const buffer=decoded.get(clip.id);if(!buffer)return false;
 const trim=Math.min(Math.max(0,Number(clip.trim)||0),Math.max(0,buffer.duration-.01));
 const available=buffer.duration-trim-offset;
 if(available<=.015||limit<=.015)return false;
 const source=ctx.createBufferSource(),gain=ctx.createGain();
 source.buffer=buffer;gain.gain.value=Math.max(0,Math.min(1.5,Number(clip.gain)||0));
 source.connect(gain);gain.connect(dest);
 source.start(when,trim+offset,Math.min(available,limit));
 return true;
}
function onStep(ctx,idx,time,dest){
 for(const c of clips()){
  if(c.bar*16+c.step===idx)scheduleOne(ctx,c,time,dest);
 }
}
function renderChunk(ctx,first,amount,step,dest){
 const t0=first*16*step,t1=(first+amount)*16*step;
 for(const c of clips()){
  const buffer=decoded.get(c.id);if(!buffer)continue;
  const begin=(c.bar*16+c.step)*step,trim=Math.max(0,c.trim||0),end=begin+buffer.duration-trim;
  if(end<=t0||begin>=t1)continue;
  const position=Math.max(t0,begin);
  scheduleOne(ctx,c,Math.max(0,position-t0),dest,Math.max(0,t0-begin),Math.max(0,t1-position));
 }
}
function lastBar(step){
 let max=1;
 for(const c of clips()){
  const dur=decoded.get(c.id)?.duration||c.duration||0;
  max=Math.max(max,Math.ceil((c.bar*16+c.step)/16+Math.max(0,dur-(c.trim||0))/(16*step)));
 }
 return Math.min(80,max);
}
async function exportProject(raw){
 const copy=JSON.parse(JSON.stringify(raw));if(!clips().length)return copy;
 copy.audioAssets={};let size=0;
 for(const c of clips()){
  const blob=await loadBlob(c.id);
  if(!blob)throw Error('Không tìm thấy dữ liệu âm thanh '+c.name);
  size+=blob.size;
  if(size>MAX_PROJECT_BYTES)throw Error('Tổng audio vượt 31 MB. Hãy dùng file nhỏ hơn trước khi xuất dự án.');
  copy.audioAssets[c.id]=await dataURL(blob);
 }
 return copy;
}
async function restoreProject(raw){
 if(!Array.isArray(raw.audioClips))return;
 const blobs=raw.audioAssets&&typeof raw.audioAssets==='object'?raw.audioAssets:{};
 for(const c of raw.audioClips){
  const encoded=blobs[c.id];
  if(typeof encoded!=='string')continue;
  const blob=blobFromDataURL(encoded);
  if(blob.size>MAX_BYTES)throw Error('Mỗi file audio tối đa 24 MB');
  await storeBlob(c.id,blob);
  decoded.delete(c.id);
 }
}
function durationToBars(sec){return Math.max(1,Math.ceil(sec/(api.step()*16)));}
function drawWave(el,buffer){
 const cvs=el.querySelector('canvas');if(!cvs)return;
 const ctx=cvs.getContext('2d');if(!ctx)return;
 const w=cvs.width,h=cvs.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#192739';ctx.fillRect(0,0,w,h);
 const arr=buffer.getChannelData(0),stride=Math.max(1,Math.floor(arr.length/w));
 ctx.fillStyle='#65c5c6';
 for(let x=0;x<w;x++){let peak=0;const begin=x*stride;for(let j=begin;j<Math.min(arr.length,begin+stride);j+=Math.max(1,Math.floor(stride/12)))peak=Math.max(peak,Math.abs(arr[j]));const hh=Math.max(1,peak*(h*.47));ctx.fillRect(x,h/2-hh,2,hh*2);}
}
function esc(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function render(){
 const list=$('audioClipList');if(!list)return;
 list.innerHTML='';
 const arr=clips();
 if(!arr.length){list.innerHTML='<div class="audio-empty">Chưa có giọng hát / sample. Nhập WAV, MP3, M4A hoặc bấm Thu micro.</div>';return;}
 for(const c of arr){
  const item=document.createElement('div');item.className='audio-clip';item.dataset.id=c.id;
  const bars=durationToBars(Math.max(.01,(decoded.get(c.id)?.duration||c.duration||1)-(c.trim||0)));
  item.innerHTML='<div class="audio-clip-title"><b>🎙 '+esc(c.name)+'</b><small>~'+bars+' ô · '+(c.duration||0).toFixed(1)+'s</small></div>'+
   '<canvas width="320" height="46" aria-label="Dạng sóng âm thanh"></canvas>'+
   '<div class="audio-clip-inputs"><label>Bắt đầu ở ô<input aria-label="Ô bắt đầu" data-edit="bar" type="number" min="1" max="80" value="'+(c.bar+1)+'"></label>'+
   '<label>Bước<input data-edit="step" type="number" min="1" max="16" value="'+(c.step+1)+'"></label>'+
   '<label>Cắt đầu (giây)<input data-edit="trim" type="number" min="0" step=".1" value="'+(c.trim||0)+'"></label>'+
   '<label>Âm lượng %<input data-edit="gain" type="number" min="0" max="150" value="'+Math.round((c.gain??.85)*100)+'"></label></div>'+
   '<div class="audio-clip-actions"><button data-action="play" type="button">▶ Nghe</button><button data-action="delete" type="button">✕ Xóa</button></div>';
  list.appendChild(item);
  const buf=decoded.get(c.id);if(buf)drawWave(item,buf);
  else {api.ensureAudio().then(ctx=>decodedAudio(ctx,c).then(buffer=>{if(item.isConnected)drawWave(item,buffer);}).catch(()=>{})).catch(()=>{});}
  item.querySelectorAll('[data-edit]').forEach(input=>input.addEventListener('change',()=>{
   const name=input.dataset.edit;let v=Number(input.value);if(!Number.isFinite(v))return;
   if(name==='bar')c.bar=Math.max(0,Math.min(79,Math.round(v)-1));
   if(name==='step')c.step=Math.max(0,Math.min(15,Math.round(v)-1));
   if(name==='trim')c.trim=Math.max(0,Math.min(Math.max(0,c.duration-.1),v));
   if(name==='gain')c.gain=Math.max(0,Math.min(1.5,v/100));
   api.save();api.stop();render();
  }));
  item.querySelector('[data-action="play"]').addEventListener('click',async()=>{
   try{const ctx=await api.ensureAudio();await decodedAudio(ctx,c);scheduleOne(ctx,c,ctx.currentTime+.05,ctx.destination);}
   catch(e){toast(e.message);}
  });
  item.querySelector('[data-action="delete"]').addEventListener('click',async()=>{
   if(!confirm('Xóa audio "'+c.name+'" khỏi bài này?'))return;
   const at=clips().findIndex(x=>x.id===c.id);
   if(at>=0)clips().splice(at,1);
   api.stop();api.save();render();toast('Đã xóa audio khỏi bài');
   // Keep original audio file in IndexedDB for other projects and backups.
  });
 }
}
async function addBlob(blob,name,atBar){
 if(blob.size>MAX_BYTES)throw Error('File tối đa 24 MB');
 if(!blob.size)throw Error('File âm thanh trống');
 if(clips().length>=MAX_CLIPS)throw Error('Một bài hỗ trợ tối đa 16 đoạn audio');
 const ctx=await api.ensureAudio();
 const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());
 if(!Number.isFinite(buffer.duration)||buffer.duration<=0)throw Error('Không giải mã được audio này');
 const id=uid();
 await storeBlob(id,blob);decoded.set(id,buffer);
 clips().push({id,name:String(name||'Voice').slice(0,80),bar:Math.max(0,Math.min(79,atBar)),step:0,gain:.85,trim:0,duration:buffer.duration});
 api.save();render();toast('Đã thêm audio: '+name);
 return id;
}
async function importFile(file){
 if(!file)return;
 if(!file.type.startsWith('audio/')&&!supported.test(file.name))throw Error('Chọn file WAV, MP3, M4A, OGG hoặc WebM');
 return addBlob(file,file.name,api.currentBar());
}
function setStatus(str){const status=$('audioRecordStatus');if(status)status.textContent=str;}
async function toggleRecord(){
 if(recording){recording.stop();setStatus('Đang lưu ghi âm…');return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Thiết bị chưa hỗ trợ thu micro; thử Chrome hoặc ứng dụng APK.');
 if(!window.isSecureContext)throw Error('Thu âm yêu cầu HTTPS hoặc ứng dụng Android.');
 stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
 const formats=['audio/webm;codecs=opus','audio/mp4','audio/webm',''];
 const mime=formats.find(f=>!f||MediaRecorder.isTypeSupported(f))||'';
 recordBar=api.currentBar();parts=[];
 recording=new MediaRecorder(stream,mime?{mimeType:mime}:{});
 const rec=recording;
 rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
 rec.onstop=async()=>{
  recording=null;stream.getTracks().forEach(t=>t.stop());stream=null;
  $('audioRecordBtn').textContent='● Thu micro';$('audioRecordBtn').classList.remove('recording');
  try{const blob=new Blob(parts,{type:rec.mimeType||'audio/webm'});parts=[];
   await addBlob(blob,'Ghi âm '+new Date().toLocaleTimeString('vi-VN')+(blob.type.includes('mp4')?'.m4a':'.webm'),recordBar);
   setStatus('Đã lưu ghi âm vào ô '+(recordBar+1));
  }catch(e){setStatus('Lỗi thu: '+e.message);toast(e.message);}
 };
 rec.onerror=()=>{setStatus('Lỗi micro');if(rec.state==='recording')rec.stop();};
 rec.start(250);
 $('audioRecordBtn').textContent='■ Dừng thu';$('audioRecordBtn').classList.add('recording');
 setStatus('ĐANG THU · Từ ô '+(recordBar+1)+' · cho phép quyền Micro trên điện thoại');
}
function init(adapter){
 api=adapter;
 const tab=$('arrangeTab'),arrange=$('arrangement');
 if(!tab||!arrange)return;
 const panel=document.createElement('section');
 panel.className='audio-panel';
 panel.innerHTML='<details id="audioPanel" open><summary>🎙 AUDIO / VOICE <span>Nhập mẫu âm · Thu micro</span></summary>'+
 '<div class="audio-buttons"><button id="audioImportBtn">＋ Nhập âm thanh</button><button id="audioRecordBtn">● Thu micro</button></div>'+
 '<input id="audioImportInput" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" hidden>'+
 '<p id="audioRecordStatus" class="audio-help">Chọn ô bắt đầu trong Bản phối rồi nhập file hoặc thu giọng. Kéo/chỉnh vị trí bằng ô bắt đầu · bước. Giọng sẽ phát cùng beat và được xuất vào WAV.</p>'+
 '<div id="audioClipList"></div>'+
 '</details>';
 arrange.insertAdjacentElement('afterend',panel);
 $('audioImportBtn').addEventListener('click',()=>$('audioImportInput').click());
 $('audioImportInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{await importFile(file);}catch(err){toast(err.message);}
 });
 $('audioRecordBtn').addEventListener('click',()=>toggleRecord().catch(e=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}toast(e.message);setStatus(e.message);}));
 render();
}
function projectChanged(){decoded.clear();render();}
window.miniAudioV15={init,prepare,onStep,renderChunk,lastBar,exportProject,restoreProject,projectChanged,render,loadBlob};
})();