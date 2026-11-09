export const MAX_BACKUP_BYTES=4*1024*1024,MAX_RECORDS=20000;
const fields=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===names.slice().sort().join(',');
export function createBackupModel(core,chapters){
 const counts=new Map(chapters.map(c=>[c.id,c.verses_count]));
 const verse=key=>{if(typeof key!=='string'||!/^\d{1,3}:\d{1,3}$/.test(key))return false;const [c,v]=key.split(':').map(Number);return key===c+':'+v&&v>0&&v<=counts.get(c)};
 function valid(row){
  if(!fields(row,['kind','key','value'])||row.value===null||!core.valid(row.kind,row.key,row.value))return false;
  if(['bookmark','note','reflection'].includes(row.kind))return verse(row.key);
  if(row.kind==='read')return verse(row.key.split('|')[1]);
  if(row.kind==='resume')return verse(row.value.key);
  return row.kind==='goal';
 }
 function checked(rows){
  if(!Array.isArray(rows)||rows.length>MAX_RECORDS)throw Error('Invalid backup file.');
  const ids=new Set();for(const row of rows){const id=core.id(row?.kind,row?.key);if(!valid(row)||ids.has(id))throw Error('Invalid backup file.');ids.add(id)}
  return rows;
 }
 function snapshot(data){
  const rows=[];for(const key of core.keys)for(const row of core.flatten(key,data.get(key,null)).values())rows.push(row);
  return checked(rows).sort((a,b)=>core.id(a.kind,a.key).localeCompare(core.id(b.kind,b.key)));
 }
 function encode(rows,now=new Date()){
  const text=JSON.stringify({format:'al-furqan-reading-backup',version:1,scope:'guest',createdAt:now.toISOString(),records:checked(rows)},null,2);
  if(new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw Error('Backup is too large. Maximum size: 4 MB.');
  return text;
 }
 function decode(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw Error('Backup is too large. Maximum size: 4 MB.');
  let file;try{file=JSON.parse(text.replace(/^\uFEFF/,''))}catch{throw Error('Invalid backup file.')}
  if(!fields(file,['format','version','scope','createdAt','records'])||file.format!=='al-furqan-reading-backup'||file.version!==1||file.scope!=='guest'||typeof file.createdAt!=='string'||file.createdAt.length!==24||!Number.isFinite(Date.parse(file.createdAt))||new Date(file.createdAt).toISOString()!==file.createdAt)throw Error('Invalid backup file.');
  checked(file.records);return file;
 }
 function plan(current,incoming){
  checked(current);checked(incoming);const merged=new Map(current.map(r=>[core.id(r.kind,r.key),r]));let added=0,kept=0;
  for(const row of incoming){const id=core.id(row.kind,row.key);if(merged.has(id)){if(!core.equal(merged.get(id).value,row.value))kept++;continue}merged.set(id,row);added++}
  return {records:checked([...merged.values()]),added,kept};
 }
 function apply(data,rows){
  if(data.state().phase!=='guest')throw Error('Sign out to use a guest backup. Account reading uses private sync.');
  // Re-read at confirmation time. Changes made since preview always win.
  const result=plan(snapshot(data),checked(rows));
  const records=new Map(result.records.map(r=>[core.id(r.kind,r.key),{...r,server:{value:r.value,revision:0}}]));
  for(const key of core.keys){
   if(data.state().phase!=='guest')throw Error('Sign out to use a guest backup. Account reading uses private sync.');
   if(!data.set(key,core.materialize(key,records)))throw Error('Could not save all items. Free some space, then choose the backup again. Existing items are kept.');
  }
  if(!data.state().persistent)throw Error('Could not save all items. Free some space, then choose the backup again. Existing items are kept.');
  return result;
 }
 return {snapshot,encode,decode,plan,apply,summary(rows){checked(rows);return Object.fromEntries(['bookmark','note','reflection','read','goal','resume'].map(kind=>[kind,rows.filter(r=>r.kind===kind).length]))}};
}
