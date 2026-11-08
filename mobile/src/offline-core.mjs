import {sha256} from '@noble/hashes/sha2.js';
// Audio bytes remain source recordings. This module never creates scripture or speech.
export const jobToken=()=>{const b=crypto.getRandomValues(new Uint8Array(16));const h=[...b].map(n=>n.toString(16).padStart(2,'0')).join('');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-')};
export const LIMIT=200*1024*1024,FILE_LIMIT=10*1024*1024;
export function packKey(chapter,reciter,catalog){
 if(!Number.isInteger(chapter)||!catalog.chapters.some(c=>c.id===chapter)||!catalog.reciters.some(r=>r.id===reciter))throw Error('Recording source unavailable. Connect to the internet and retry.');
 return `${reciter}-${chapter}`;
}
export function sourceURL(value){
 const u=new URL(value,'https://verses.quran.com/');
 if(u.protocol!=='https:'||!['verses.quran.com','mirrors.quranicaudio.com'].includes(u.hostname)||u.port||u.username||u.password||u.search||u.hash||!/^\/[A-Za-z0-9_./-]+\.mp3$/.test(u.pathname)||u.pathname.includes('..'))throw Error('Recording source unavailable. Connect to the internet and retry.');
 return u.href;
}
export function recordingURL(value,chapter,verse,reciter,catalog){
 const url=sourceURL(value),meta=catalog.reciters.find(r=>r.id===reciter);
 if(!meta||url!==meta.base+String(chapter).padStart(3,'0')+String(verse).padStart(3,'0')+'.mp3')throw Error('Recording source unavailable. Connect to the internet and retry.');return url;
}
export async function fingerprint(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<100||bytes.length>FILE_LIMIT||!(bytes[0]===73&&bytes[1]===68&&bytes[2]===51||bytes[0]===255&&(bytes[1]&224)===224))throw Error('Saved audio is missing or damaged. Download this surah again to repair it.');
 return [...sha256(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function validatePack(p,catalog){
 if(!p||p.version!==1||p.key!==packKey(p.chapter,p.reciter,catalog)||!Array.isArray(p.files))throw Error('Offline downloads could not be opened. Free device storage and retry.');
 const count=catalog.chapters.find(c=>c.id===p.chapter).verses_count,seen=new Set();
 if(p.files.length>count)throw Error('Offline downloads could not be opened. Free device storage and retry.');
 for(const f of p.files){
  if(!Number.isInteger(f.verse)||f.verse<1||f.verse>count||seen.has(f.verse)||f.ref!==`${p.chapter}:${f.verse}`||!Number.isInteger(f.bytes)||f.bytes<100||f.bytes>FILE_LIMIT||!/^[a-f0-9]{64}$/.test(f.sha256)||!new RegExp(`^recitations-v1/${p.key}/[a-f0-9-]{36}-${f.verse}\\.mp3$`).test(f.path))throw Error('Offline downloads could not be opened. Free device storage and retry.');
  recordingURL(f.url,p.chapter,f.verse,p.reciter,catalog);seen.add(f.verse);
 }
 return p;
}
export function createDownloads({catalog,store,recordings,exclusive,onProgress=()=>{}}){
 let busy=false,stopped=false;
 const state=()=>({busy,stopped});
 async function mutate(fn){if(busy)throw Error('Another download is already running.');busy=true;stopped=false;try{return await exclusive(fn)}finally{busy=false;onProgress(null)}}
 async function list(){
  const packs=(await store.list()).map(p=>validatePack(p,catalog));
  const entries=[];
  for(const p of packs){let count=0;for(const f of p.files){try{if(await store.size(f.path)===f.bytes)count++}catch{}}
   entries.push({...p,downloaded:count,total:catalog.chapters.find(c=>c.id===p.chapter).verses_count});
  }
  return {packs:entries,bytes:await store.usedBytes()};
 }
 async function verify(f){const bytes=await store.read(f.path);if(bytes.length!==f.bytes||await fingerprint(bytes)!==f.sha256)throw Error('Saved audio is missing or damaged. Download this surah again to repair it.');return bytes}
 async function download(chapter,reciter){return mutate(async()=>{
  const key=packKey(chapter,reciter,catalog),count=catalog.chapters.find(c=>c.id===chapter).verses_count;
  let pack=await store.get(key)||{version:1,key,chapter,reciter,files:[]};validatePack(pack,catalog);
  onProgress({done:pack.files.length,total:count});
  const rows=await recordings(chapter,reciter);if(!Array.isArray(rows)||rows.length!==count)throw Error('Recording source unavailable. Connect to the internet and retry.');
  const urls=rows.map((r,i)=>{if(r.verse_key!==`${chapter}:${i+1}`)throw Error('Recording source unavailable. Connect to the internet and retry.');return recordingURL(r.url,chapter,i+1,reciter,catalog)});
  await store.save(pack);const run=jobToken();
  for(let verse=1;verse<=count;verse++){
   if(stopped)return {stopped:true,pack};
   const old=pack.files.find(f=>f.verse===verse),url=urls[verse-1];
   if(old&&old.url===url){try{await verify(old);onProgress({done:verse,total:count});continue}catch{}}
   if(await store.usedBytes()>=LIMIT)throw Error('Download limit reached. Delete a download to make space.');
   const path=`recitations-v1/${key}/${run}-${verse}.mp3`;let committed=false;
   try{
    await store.download(url,path);
    const size=await store.size(path);if(size<100||size>FILE_LIMIT)throw Error('Saved audio is missing or damaged. Download this surah again to repair it.');
    if(await store.usedBytes()>LIMIT)throw Error('Download limit reached. Delete a download to make space.');
    const hash=await fingerprint(await store.read(path));
    const item={verse,ref:`${chapter}:${verse}`,url,path,bytes:size,sha256:hash};
    const next={...pack,files:[...pack.files.filter(f=>f.verse!==verse),item].sort((a,b)=>a.verse-b.verse)};
    await store.save(next);pack=next;committed=true;
    if(old)await store.removeFile(old.path).catch(()=>{});
   }finally{if(!committed)await store.removeFile(path).catch(()=>{})}
   onProgress({done:verse,total:count});
  }
  return {stopped:false,pack};
 })}
 async function remove(key){return mutate(async()=>{const pack=await store.get(key);validatePack(pack,catalog);await store.removePack(pack.key);await store.delete(pack.key)})}
 async function playable(key,verse){const pack=validatePack(await store.get(key),catalog),f=pack.files.find(f=>f.verse===verse);if(!f)throw Error('Saved audio is missing or damaged. Download this surah again to repair it.');const bytes=await verify(f);return store.playable(f.path,bytes)}
 async function queueData(key){const p=validatePack(await store.get(key),catalog);const count=catalog.chapters.find(c=>c.id===p.chapter).verses_count;if(p.files.length!==count||p.files.some((f,i)=>f.verse!==i+1))throw Error('Saved audio is missing or damaged. Download this surah again to repair it.');return {key:p.key,tracks:p.files.map(({path,ref,bytes,sha256})=>({path,ref,bytes,sha256}))}}
 return {state,list,download,remove,playable,queueData,stop(){stopped=true}};
}
