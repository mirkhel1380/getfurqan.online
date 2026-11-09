import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {createBackupModel,MAX_BACKUP_BYTES} from './backup-core.mjs';
import catalog from './offline-catalog.json';

const model=createBackupModel(window.AFReadingCore,catalog.chapters),data=window.AFData;
const $=id=>document.getElementById(id),tr=s=>window.AFI18n?.translate(s)||s;
let preview=null,busy=false;
const errors=new Set(['Invalid backup file.','Backup is too large. Maximum size: 4 MB.','Sign out to use a guest backup. Account reading uses private sync.','Could not save all items. Free some space, then choose the backup again. Existing items are kept.','Could not open file sharing. Please try again.']);
const labels={bookmark:'Bookmarks',note:'Study notes',reflection:'Reflections',read:'Read verses by date',goal:'Daily goal',resume:'Reading place'};
function message(text,error=false){$('backup-status').textContent=tr(text);$('backup-status').classList.toggle('is-error',error)}
function clear(){preview=null;$('backup-preview').hidden=true;$('backup-summary').replaceChildren();$('backup-file').value=''}
function render(){
 const guest=data.state().phase==='guest';$('backup-account').hidden=guest;
 for(const id of ['backup-export','backup-file','backup-restore','backup-cancel'])$(id).disabled=busy||!guest;
 if(!guest)clear();
 else if(preview){try{const plan=model.plan(model.snapshot(data),preview.records);$('backup-plan').textContent=tr('New items')+': '+plan.added+' · '+tr('Existing values kept')+': '+plan.kept;}catch{clear();message('Could not complete the backup action. Please try again.',true)}}
}
async function run(fn){if(busy)return;busy=true;render();try{await fn()}catch(e){if(/^Share cancel(?:ed|led)$/i.test(e.message))message('No changes made.');else message(errors.has(e.message)?e.message:'Could not complete the backup action. Please try again.',true)}finally{busy=false;render()}}
function requireGuest(){if(data.state().phase!=='guest')throw Error('Sign out to use a guest backup. Account reading uses private sync.')}
$('backup-export').onclick=()=>run(async()=>{
 requireGuest();const text=model.encode(model.snapshot(data)),filename='Al-Furqan-reading-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 if(Capacitor.isNativePlatform()){
  if(!(await Share.canShare()).value)throw Error('Could not open file sharing. Please try again.');
  // Only this dedicated cache directory is shared. Never expose session storage or recitations.
  // Delete old temporary copies on the next export; a receiver may still need the latest file.
  try{const old=await Filesystem.readdir({path:'reading-backups',directory:Directory.Cache});for(const file of old.files)if(/^Al-Furqan-reading-[\dTZ-]+\.json$/.test(file.name))await Filesystem.deleteFile({path:'reading-backups/'+file.name,directory:Directory.Cache})}catch{}
  const result=await Filesystem.writeFile({path:'reading-backups/'+filename,directory:Directory.Cache,data:text,encoding:Encoding.UTF8,recursive:true});
  await Share.share({title:'Al Furqan',dialogTitle:tr('Save backup file'),files:[result.uri]});
  message('File sharing closed. Confirm the backup is saved outside this app before removing it.');
 }else{
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  message('Backup download requested. Check your downloads before removing the app.');
 }
});
$('backup-file').onchange=()=>run(async()=>{
 const file=$('backup-file').files[0];clear();if(!file)return;requireGuest();
 if(file.size>MAX_BACKUP_BYTES)throw Error('Backup is too large. Maximum size: 4 MB.');
 const selected=model.decode(await file.text());requireGuest();const plan=model.plan(model.snapshot(data),selected.records);preview=selected;
 const summary=model.summary(selected.records);for(const [kind,n]of Object.entries(summary)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=tr(labels[kind]);dd.textContent=n;dd.dir='ltr';$('backup-summary').append(dt,dd)}
 $('backup-date').textContent=new Date(selected.createdAt).toLocaleString(document.documentElement.lang||'en');
 $('backup-plan').textContent=tr('New items')+': '+plan.added+' · '+tr('Existing values kept')+': '+plan.kept;
 $('backup-preview').hidden=false;message('Review the file, then restore missing items.');
});
$('backup-restore').onclick=()=>run(async()=>{requireGuest();if(!preview)return;model.apply(data,preview.records);clear();message('Backup restored. Existing items were kept.');});
$('backup-cancel').onclick=()=>{clear();message('No changes made.');};
window.addEventListener('af:datachange',()=>{render()});
data.ready.then(()=>{render();message(data.state().phase==='guest'?'Ready to save or restore your guest reading.':'Sign out to use a guest backup. Account reading uses private sync.')}).catch(()=>message('Could not load saved reading. Please try again.',true));
