import catalog from './offline-catalog.json';
import {createDownloads,packKey} from './offline-core.mjs';
import {nativeStore} from './offline-storage.mjs';
const $=id=>document.getElementById(id),tr=s=>window.AFI18n?.translate(s)||s;
let manager,packs=[],active=null,currentVerse=1,playGeneration=0,source=null,lastMessage='',progress=null,loading=false;
function message(text,error=false){lastMessage=text;$('download-status').textContent=tr(text);$('download-status').classList.toggle('is-error',error)}
function playerMessage(text){$('download-player-status').textContent=tr(text)}
function controls(){const busy=manager?.state().busy||false;$('download-start').disabled=!manager||busy||loading;$('download-chapter').disabled=$('download-reciter').disabled=busy;$('download-stop').hidden=!busy;$('download-stop').disabled=manager?.state().stopped||false;for(const b of $('download-list').querySelectorAll('button'))b.disabled=busy;}
function onProgress(value){progress=value;const meter=$('download-meter');meter.hidden=!value;if(value){meter.max=value.total;meter.value=value.done;if(!manager?.state().stopped)message(`Downloaded ${value.done} of ${value.total} verses.`)}controls()}
async function recordings(chapter,reciter){
 let next=1,files=[],seen=new Set();
 while(next){if(!Number.isInteger(next)||seen.has(next)||next>20)throw Error('Recording source unavailable. Connect to the internet and retry.');seen.add(next);
  const r=await fetch(`${catalog.source}/recitations/${reciter}/by_chapter/${chapter}?per_page=50&page=${next}`,{signal:AbortSignal.timeout(20000),credentials:'omit'});if(!r.ok)throw Error('Recording source unavailable. Connect to the internet and retry.');const d=await r.json();if(!Array.isArray(d.audio_files))throw Error('Recording source unavailable. Connect to the internet and retry.');files.push(...d.audio_files);next=d.pagination?.next_page;
 }
 window.AFQuranIntegrity.audioRows(files,catalog.chapters,chapter);return files;
}
function stopPlayer(){playGeneration++;$('download-audio').pause();$('download-audio').removeAttribute('src');$('download-audio').load();source?.release();source=null}
async function selectVerse(verse,start=true){
 stopPlayer();const id=playGeneration;if(!active)return;currentVerse=verse;$('download-verse').value=String(verse);$('download-prev').disabled=verse===1;$('download-next').disabled=verse===active.total;playerMessage('Please wait…');
 try{const next=await manager.playable(active.key,verse);if(id!==playGeneration){next.release();return}source=next;$('download-audio').src=next.src;playerMessage('Audio begins only when you press play.');if(start)try{await $('download-audio').play();playerMessage('')}catch{playerMessage('Press play in the audio controls to begin or retry.')}}catch{if(id===playGeneration)playerMessage('Saved audio is missing or damaged. Download this surah again to repair it.')}
}
async function playPack(pack){active=pack;const chapter=catalog.chapters.find(c=>c.id===pack.chapter),reciter=catalog.reciters.find(r=>r.id===pack.reciter);$('download-playing').textContent=chapter.id+'. '+chapter.name_simple;$('download-playing-reciter').textContent=reciter.name;$('download-verse').replaceChildren(...Array.from({length:pack.total},(_,i)=>new Option(pack.chapter+':'+(i+1),i+1)));$('download-player').hidden=false;await selectVerse(1);$('download-player').scrollIntoView({behavior:'smooth',block:'nearest'})}
function render(){
 $('download-list').replaceChildren();
 if(!packs.length){const empty=document.createElement('p');empty.className='download-empty';empty.textContent=tr('No recitations downloaded yet.');$('download-list').append(empty)}
 for(const pack of packs){
  const chapter=catalog.chapters.find(c=>c.id===pack.chapter),reciter=catalog.reciters.find(r=>r.id===pack.reciter),row=document.createElement('article');row.className='download-saved';
  const h=document.createElement('h3');h.textContent=chapter.id+'. '+chapter.name_simple;h.setAttribute('data-i18n-ignore','');
  const by=document.createElement('p');by.textContent=reciter.name;by.setAttribute('data-i18n-ignore','');
  const status=document.createElement('p');status.className='download-saved-status';status.textContent=pack.downloaded===pack.total?tr('Ready offline'):tr(`Downloaded ${pack.downloaded} of ${pack.total} verses.`);
  const actions=document.createElement('div');actions.className='download-actions';
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=tr(label);b.onclick=fn;actions.append(b);return b};
  if(pack.downloaded===pack.total)button('Play downloaded surah',()=>playPack(pack));
  button(pack.downloaded===pack.total?'Download surah':'Resume download',()=>download(pack.chapter,pack.reciter));
  button('Delete download',async()=>{if(manager.state().busy)return;if(active?.key===pack.key){stopPlayer();active=null;$('download-player').hidden=true}try{await manager.remove(pack.key);message('Download removed.');await refresh()}catch{message('Offline downloads could not be opened. Free device storage and retry.',true)}finally{controls()}});
  row.append(h,by,status,actions);$('download-list').append(row);
 }
 controls();
}
async function refresh(){const result=await manager.list();packs=result.packs;$('download-storage').textContent=(result.bytes/1024/1024).toFixed(1)+' / 200 MB';render()}
async function download(chapter,reciter){
 if(loading||manager.state().busy)return;
 if(active?.key===packKey(chapter,reciter,catalog)){stopPlayer();active=null;$('download-player').hidden=true}
 try{const result=await manager.download(chapter,reciter);message(result.stopped?'Download stopped. Finished verses were kept.':'Download complete. Ready to listen offline.')}
 catch(e){message(['Download limit reached. Delete a download to make space.','Another download is already running.','Offline downloads could not be opened. Free device storage and retry.','Recording source unavailable. Connect to the internet and retry.'].includes(e.message)?e.message:'Download failed. Finished verses were kept; try again to resume.',true)}
 finally{try{await refresh()}catch{message('Offline downloads could not be opened. Free device storage and retry.',true)}controls()}
}
async function init(){
 loading=true;controls();$('download-retry').hidden=true;message('Checking downloads…');
 try{const store=await nativeStore();manager=createDownloads({catalog,store,recordings,exclusive:store.exclusive,onProgress});await refresh();message('Download a surah to listen without internet.')}
 catch{manager=null;message('Offline downloads could not be opened. Free device storage and retry.',true);$('download-retry').hidden=false}
 finally{loading=false;controls()}
}
$('download-chapter').replaceChildren(...catalog.chapters.map(c=>new Option(c.id+'. '+c.name_simple,c.id)));
$('download-reciter').replaceChildren(...catalog.reciters.map(r=>new Option(r.name,r.id)));
$('download-form').onsubmit=e=>{e.preventDefault();if(manager)download(Number($('download-chapter').value),Number($('download-reciter').value))};
$('download-stop').onclick=()=>{manager?.stop();message('Stop requested. The current verse will finish downloading.');controls()};
$('download-retry').onclick=init;
$('download-verse').onchange=()=>selectVerse(Number($('download-verse').value));
$('download-prev').onclick=()=>selectVerse(Math.max(1,currentVerse-1));$('download-next').onclick=()=>selectVerse(Math.min(active.total,currentVerse+1));
$('download-audio').onended=()=>{if(active&&currentVerse<active.total)selectVerse(currentVerse+1);else playerMessage('Passage complete. Press play to listen to the last verse again.')};
$('download-audio').onerror=()=>{if(source)playerMessage('Saved audio is missing or damaged. Download this surah again to repair it.')};
addEventListener('pagehide',()=>{manager?.stop();stopPlayer()});
document.addEventListener('af:languagechange',()=>{render();$('download-status').textContent=tr(lastMessage)});
init();
