import {Capacitor,registerPlugin} from '@capacitor/core';
import {createAudioClient} from './audio-client.mjs';
const native=Capacitor.isNativePlatform(),plugin=registerPlugin('FurqanAudio');
const client=createAudioClient(plugin),tr=s=>window.AFI18n?.translate(s)||s;
window.AFNativeAudio={native,...client};
let eventHandle,poll,disposed=false;
function start(){
 if(!native)return;
 const bar=document.createElement('aside');bar.className='native-audio-bar';bar.hidden=true;bar.setAttribute('aria-label','Recitation controls');
 const link=document.createElement('a');link.href='/downloads.html';const label=document.createElement('span'),ref=document.createElement('bdi');ref.dir='ltr';ref.setAttribute('data-i18n-ignore','');link.append(label,ref);
 const toggle=document.createElement('button');toggle.type='button';const stop=document.createElement('button');stop.type='button';stop.textContent=tr('Stop recitation');const status=document.createElement('span');status.className='native-audio-error';status.setAttribute('role','status');
 bar.append(link,toggle,stop,status);document.body.append(bar);
 const report=e=>{status.textContent=tr('Audio player unavailable. Please try again.');};
 client.subscribe(s=>{bar.hidden=!s.count||location.pathname==='/downloads.html';document.body.classList.toggle('has-native-audio',!bar.hidden);label.textContent=s.title;ref.textContent=s.ref;toggle.textContent=tr(s.playing?'Pause':'Play');stop.textContent=tr('Stop recitation');toggle.disabled=s.pending||s.loading;status.textContent=s.error?tr('Downloaded audio could not be checked. Try downloading this surah again.'):'';if(s.playing)document.querySelectorAll('audio,video').forEach(media=>media.pause())});
 toggle.onclick=()=>{const s=client.state();(s.playing?client.pause():client.play()).catch(report)};stop.onclick=()=>client.stop().catch(report);
 plugin.addListener('state',value=>{try{client.accept(value)}catch{}}).then(handle=>{if(disposed)handle.remove();else eventHandle=handle}).catch(report);
 const refresh=()=>{if(!document.hidden)client.refresh().catch(()=>{})};refresh();poll=setInterval(refresh,1000);document.addEventListener('visibilitychange',refresh);document.addEventListener('af:languagechange',()=>client.accept(client.state()));
 // Only one audio source plays at a time, including the unchanged online readers.
 document.addEventListener('play',e=>{if(e.target.matches?.('audio,video'))client.stop().catch(()=>{})},true);
 addEventListener('pagehide',()=>{disposed=true;clearInterval(poll);eventHandle?.remove();},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
