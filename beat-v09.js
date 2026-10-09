/* Mini FL Studio V0.9: paste beats / starter beat / copy 1-16 bars */
'use strict';
(function(){
const N={C:0,D:2,E:4,F:5,G:7,A:9,B:11},P={KICK:36,SNARE:38,HAT:42,HIHAT:42,'HI-HAT':42,OHAT:46,OPENHAT:46,'OPEN-HAT':46};
const BACKUP='minifl.backup.beforeImport.v1';
const kicks=[[1,7,11,15],[1,6,11,14],[1,7,10,15],[1,6,12,15],[1,7,11,15],[1,6,11,14,16],[1,7,10,15],[1,6,12,15,16]];
const sn=[[9],[9],[9],[9,16],[9],[9],[9],[9,16]],hA=[1,3,5,7,9,11,13,15],hB=[1,3,5,7,9,11,13,14,15,16];
const bss=['1:F2(4),7:F2(2),11:C3(2),14:F2(2)','1:Db2(8),11:Db2(2),14:Ab2(2)','1:Ab2(4),7:Ab2(2),10:Eb3(2),14:Ab2(2)','1:Eb2(8),12:Bb2(2),15:E2(1),16:F2(1)','1:F2(4),6:F2(2),11:C3(2),15:F2(2)','1:Db2(8),11:Db2(2),14:Ab2(2)','1:Ab2(4),7:Ab2(2),10:Eb3(2),14:Ab2(2)','1:Eb2(8),12:Bb2(2),15:E2(1),16:F2(1)'];
const pno=['1:F3+Ab3+C4(8),13:C4(2),15:Ab3(1)','1:Db3+F3+Ab3(8),13:Ab3(2),15:F3(1)','1:Ab3+C4+Eb4(8),13:Eb4(2),15:C4(1)','1:Eb3+G3+Bb3(8),13:Bb3(2),15:G3(1)','1:F3+Ab3+C4(8),13:C4(2),15:Ab3(1)','1:Db3+F3+Ab3(8),13:Ab3(2),15:F3(1)','1:Ab3+C4+Eb4(8),13:Eb4(2),15:C4(1)','1:Eb3+G3+Bb3(8),13:G3(2),15:F3(1)'];
function sampleText(){if(typeof window.hood80BeatTextV11!=='function')throw Error('Chưa tải được beat Deluxe. Hãy tải lại trang.');return window.hood80BeatTextV11();}
function midi(raw){
 const m=/^([A-Ga-g])([#b]?)(-?\d)$/.exec(raw);
 if(!m)throw Error('Sai nốt '+raw+'; ví dụ F2, Ab3, C4');
 const p=(+m[3]+1)*12+N[m[1].toUpperCase()]+(m[2]==='#'?1:m[2]==='b'?-1:0);
 if(p<0||p>127)throw Error('Nốt ngoài giới hạn '+raw);
 return p;
}
function parseBeatText(txt){
 const str=String(txt||'').trim();
 if(!str)throw Error('Bạn chưa dán mã beat');
 if(str.length>220000)throw Error('Mã beat quá dài');
 if(/^LAUDAI-MAY-64-V1$/i.test(str)){if(typeof window.castleCloudBeatText!=='function')throw Error('Chưa tải được preset Lâu Đài Trên Mây');return parseBeatText(window.castleCloudBeatText());}
 if(/^HOODTRAP-80-V2$/i.test(str))return parseBeatText(sampleText());
 if(/^HOODTRAP-80-V1$/i.test(str))return parseBeatText(window.hood80BeatText());
 if(str[0]==='{')return validate(JSON.parse(str));
 const out=blank(),lines=str.split(/\r?\n/);out.title='Beat từ ChatGPT';let found=false,bpm=false;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line||line.startsWith('#')||line.startsWith('//')||/^MINIFL\s+BEAT\s+V1$/i.test(line))continue;
  let m=/^(?:TEN|TITLE)\s*:\s*(.+)$/i.exec(line);
  if(m){out.title=m[1].slice(0,80);continue;}
  m=/^BPM\s*:\s*(\d{2,3})$/i.exec(line);
  if(m){out.bpm=+m[1];bpm=true;continue;}
  m=/^SOUND\s+(\d{1,2})\s+([A-Za-z][A-Za-z0-9]*)$/i.exec(line);
  if(m){const t=+m[1],id=m[2];if(!TRACKS[t]||window.miniSoundsV11?.ID2KIND?.get(id)!==TRACKS[t].kind)throw Error('Dòng '+(i+1)+': âm thanh không hợp lệ');out.sounds[String(t)]=id;continue;}
  m=/^(DRUM|TRONG|TRỐNG)\s+(\d{1,2})\s+([A-Z-]+)\s+(.+)$/i.exec(line);
  if(m){
   const b=+m[2],pitch=P[m[3].toUpperCase()];if(b<1||b>80||pitch===undefined)throw Error('Dòng '+(i+1)+': số ô hoặc tên trống sai');
   const steps=m[4].split(/[\s,;]+/).filter(Boolean);
   if(!steps.length)throw Error('Dòng '+(i+1)+': chưa có step');
   const dest=out.clips['0'][String(b-1)]||(out.clips['0'][String(b-1)]=[]);
   for(const x of steps){const st=+x;if(!/^\d+$/.test(x)||st<1||st>16)throw Error('Dòng '+(i+1)+': step phải 1-16');dest.push(note(st-1,pitch,1,pitch===36?.94:pitch===38?.79:.48));}
   found=true;continue;
  }
  m=/^(BASS|PIANO|SYNTH|PAD|BELL|PLUCK|FX|RISER)\s+(\d{1,2})\s+(.+)$/i.exec(line);
  if(m){
   const t={BASS:1,PIANO:2,SYNTH:3,PAD:4,BELL:5,PLUCK:6,FX:7,RISER:8}[m[1].toUpperCase()],b=+m[2];if(b<1||b>80)throw Error('Dòng '+(i+1)+': số ô phải 1-80');
   const parts=m[3].split(/[\s,;]+/).filter(Boolean);
   if(!parts.length)throw Error('Dòng '+(i+1)+': chưa có nốt');
   const dest=out.clips[String(t)][String(b-1)]||(out.clips[String(t)][String(b-1)]=[]);
   for(const x of parts){
    const a=/^(\d{1,2}):([A-Ga-g][#b]?-?\d(?:\+[A-Ga-g][#b]?-?\d)*)\((1|2|4|8|16)\)(?:>([A-Ga-g][#b]?-?\d))?$/.exec(x);
    if(!a)throw Error('Dòng '+(i+1)+': sai nốt '+x+'. Ví dụ 1:F3+Ab3+C4(8)');
    const step=+a[1]-1,len=+a[3];if(step<0||step>15||step+len>16)throw Error('Dòng '+(i+1)+': nốt '+x+' vượt 16 bước');
    for(const key of a[2].split('+')){const item=note(step,midi(key),len,t===1?.85:t===2?.7:.62);if(a[4]){if(t!==1)throw Error('Chỉ BASS được dùng 808 slide');item.slideTo=midi(a[4]);}dest.push(item);}
   }found=true;continue;
  }
  throw Error('Dòng '+(i+1)+' không nhận ra: '+line.slice(0,35));
 }
 if(!found)throw Error('Mã chưa có nốt');
 if(!bpm)out.bpm=142;
 return validate(out);
}
function countNotes(s){return Object.values(s.clips).reduce((a,x)=>a+Object.values(x).reduce((b,n)=>b+n.length,0),0);}
function backup(){try{localStorage.setItem(BACKUP,JSON.stringify(song));return true;}catch(e){return false;}}
function replaceSong(next){
 const current=countNotes(song);
 if(current&&!confirm('Bài hiện tại có '+current+' nốt. Nạp beat sẽ thay bản phối và BPM. Hãy lưu .minifl trước nếu cần.\n\nBạn muốn thay bài?'))return false;
 if(current&&!backup()&&!confirm('Không lưu được bản dự phòng, vẫn thay bài?'))return false;
 stopPlaying();song=validate(next);track=2;bar=0;autoSave();updateMeta();renderArrangement();renderChordPreview();window.miniSoundsV11?.refresh?.();selectTab('arrange');return true;
}
function copyBars(){
 const start=+$('rangeStart').value-1,end=+$('rangeEnd').value-1,to=+$('rangeTarget').value-1;
 const ids=$('rangeTrack').value==='all'?TRACKS.map((_,i)=>i):[+$('rangeTrack').value];
 if(start>end){toast('Ô bắt đầu phải trước ô kết thúc');return;}
 if(to+end-start>79){toast('Đoạn dán vượt quá ô 80');return;}
 const snapshot=ids.map(t=>Array.from({length:end-start+1},(_,k)=>clone(clip(t,start+k))));
 let occupied=0;ids.forEach(t=>{for(let k=0;k<=end-start;k++)occupied+=clip(t,to+k).length;});
 if(occupied&&!confirm('Đoạn đích có '+occupied+' nốt. Ghi đè đoạn này?'))return;
 backup();stopPlaying();
 ids.forEach((t,j)=>snapshot[j].forEach((ns,k)=>{const c=song.clips[String(t)],key=String(to+k);if(ns.length)c[key]=ns;else delete c[key];}));
 changed('Đã sao chép '+(end-start+1)+' ô trên '+ids.length+' track');selectTab('arrange');
}
function setup(){
 const tab=$('toolsTab');if(!tab)return;
 const html=[
 '<div class="beat-caption">BEAT IMPORT · V1.2</div><h2>Dán beat từ ChatGPT</h2>',
 '<p>Chọn beat mẫu dưới đây hoặc dán mã nhạc. Mỗi lần nạp đều hỏi xác nhận và lưu bản dự phòng.</p>',
 '<div class="beat-buttons"><button id="castlePresetBtn" class="primary">♡ Lâu Đài Trên Mây · 2:17</button><button id="hoodDemoBtn">▶ Hood Trap Deluxe · 2:15</button></div>',
 '<div class="beat-buttons" style="margin-top:8px"><button id="showBeatImportBtn">⎘ Dán mã beat</button><button id="copyCastleCode">⧉ Mã Lâu Đài</button></div>',
 '<div id="beatPasteArea" class="beat-hidden"><textarea id="beatText" rows="7" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="MINIFL BEAT V1&#10;TEN: Beat của tôi&#10;BPM: 142&#10;DRUM 1 KICK 1,7,11,15&#10;BASS 1 1:F2(4)&#10;PIANO 1 1:F3+Ab3+C4(8)"></textarea>',
 '<div class="beat-buttons"><button id="readBeatClipboard">📋 Đọc clipboard</button><button id="importBeatBtn" class="primary">✓ Nạp mã beat</button></div>',
 '<p class="beat-note">Nếu Safari không cho đọc clipboard, giữ tay trong ô trên → chọn Dán → Nạp mã beat.</p>',
 '<button id="copyBeatExample" class="beat-link beat-wide">Sao chép toàn bộ mã Hood Trap Deluxe</button><p class="beat-note">Mã Lâu Đài: <b>LAUDAI-MAY-64-V1</b> · Hood Trap: <b>HOODTRAP-80-V2</b></p></div>',
 '<details><summary>⧉ Sao chép nhiều ô</summary><div class="beat-selects"><label>Từ ô<select id="rangeStart"></select></label><label>Đến ô<select id="rangeEnd"></select></label>',
 '<label>Dán từ ô<select id="rangeTarget"></select></label><label>Track<select id="rangeTrack"><option value="all">Cả 9 track</option></select></label></div>',
 '<button id="copyRangeBtn" class="primary beat-wide">⧉ Sao chép đoạn</button></details>',
 '<button id="restoreBeatBtn" class="beat-link beat-wide">↶ Khôi phục bài trước lần nạp</button>'
 ].join('');
 const panel=document.createElement('section');panel.className='beat-import';panel.innerHTML=html;
 tab.querySelector('.section-head').insertAdjacentElement('afterend',panel);
 ['rangeStart','rangeEnd','rangeTarget'].forEach(id=>{for(let i=1;i<=80;i++)$(id).add(new Option('Ô '+String(i).padStart(2,'0'),String(i)));});
 $('rangeStart').value='1';$('rangeEnd').value='8';$('rangeTarget').value='9';
 TRACKS.forEach((x,i)=>$('rangeTrack').add(new Option(x.name,String(i))));
 $('hoodDemoBtn').addEventListener('click',()=>{try{if(replaceSong(parseBeatText(sampleText())))toast('Đã nạp Hood Trap Deluxe · 9 track · 2:15');}catch(e){toast('Lỗi: '+e.message);}});
 $('castlePresetBtn').addEventListener('click',()=>{try{if(replaceSong(parseBeatText('LAUDAI-MAY-64-V1')))toast('Đã nạp Lâu Đài Trên Mây · 112 BPM · 2:17');}catch(e){toast('Lỗi: '+e.message);}});
 $('copyCastleCode').addEventListener('click',async()=>{const code='LAUDAI-MAY-64-V1';try{await navigator.clipboard.writeText(code);toast('Đã sao chép mã Lâu Đài');}catch(e){$('beatPasteArea').classList.remove('beat-hidden');$('beatText').value=code;$('beatText').focus();$('beatText').select();toast('Giữ tay để sao chép mã');}});
 $('showBeatImportBtn').addEventListener('click',()=>{const x=$('beatPasteArea');x.classList.toggle('beat-hidden');if(!x.classList.contains('beat-hidden'))$('beatText').focus();});
 $('importBeatBtn').addEventListener('click',()=>{try{if(replaceSong(parseBeatText($('beatText').value)))toast('Đã nạp beat từ ChatGPT');}catch(e){toast('Mã beat lỗi: '+e.message);$('beatText').setCustomValidity(e.message);$('beatText').reportValidity();setTimeout(()=>$('beatText').setCustomValidity(''),5500);}});
 $('readBeatClipboard').addEventListener('click',async()=>{try{if(!navigator.clipboard?.readText)throw Error('No clipboard');$('beatText').value=await navigator.clipboard.readText();toast('Đã dán clipboard');}catch(e){$('beatText').focus();toast('Giữ tay trong ô nhập và chọn Dán');}});
 $('copyBeatExample').addEventListener('click',async()=>{const txt=sampleText();try{await navigator.clipboard.writeText(txt);toast('Đã sao chép beat mẫu');}catch(e){$('beatText').value=txt;$('beatText').focus();$('beatText').select();toast('Nhấn Sao chép trong ô văn bản');}});
 $('copyRangeBtn').addEventListener('click',copyBars);
 $('restoreBeatBtn').addEventListener('click',()=>{try{const old=localStorage.getItem(BACKUP);if(!old){toast('Chưa có bản dự phòng');return;}const next=validate(JSON.parse(old));if(!confirm('Khôi phục bài trước khi nạp? Bài đang mở sẽ bị thay thế.'))return;stopPlaying();song=next;track=2;bar=0;autoSave();updateMeta();renderArrangement();selectTab('arrange');toast('Đã khôi phục');}catch(e){toast('Lỗi khôi phục: '+e.message);}});
}
window.miniFlV09={sampleText,parseBeatText,countNotes};
document.addEventListener('DOMContentLoaded',()=>{try{setup();}catch(e){console.error('Mini FL V0.9 import',e);}});
})();