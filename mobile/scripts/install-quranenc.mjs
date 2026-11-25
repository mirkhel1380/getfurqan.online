import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function installQuranEnc(out){
 const lock=JSON.parse(await fs.readFile(path.join(mobile,'installed-quranenc-lock.json'),'utf8'));
 if(lock.schema!==1||lock.source!=='https://quranenc.com'||!Array.isArray(lock.files)||!Array.isArray(lock.translations)||!Array.isArray(lock.tafsirs))throw Error('Invalid QuranEnc install lock');
 const selected=new Set([...lock.translations,...lock.tafsirs]);
 if(selected.size!==lock.translations.length+lock.tafsirs.length||[...selected].some(key=>!/^[a-z]+_[a-z]+$/.test(key)))throw Error('Invalid installed QuranEnc edition');
 const cache=path.join(mobile,'.cache/installed-quranenc'),target=path.join(out,'installed-quranenc');
 await fs.mkdir(cache,{recursive:true});await fs.mkdir(target,{recursive:true});
 let next=0;
 await Promise.all(Array.from({length:6},async()=>{
  while(next<lock.files.length){
   const row=lock.files[next++];
   if(!/^[a-z][a-z0-9_-]+\.json$/.test(row.file)||!/^[a-f0-9]{64}$/.test(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>50*1024*1024)throw Error('Invalid QuranEnc file lock');
   let allowed=null;
   if(row.kind==='metadata')allowed=row.file==='translations.json'?'https://quranenc.com/api/v1/translations/list?localization=en':row.file==='tafsirs.json'?'https://quranenc.com/api/v1/tafsirs/list':null;
   if(row.kind==='translation'&&lock.translations.includes(row.edition)&&Number.isInteger(row.chapter)&&row.chapter>=1&&row.chapter<=114&&row.file===row.edition+'-'+row.chapter+'.json')allowed='https://quranenc.com/api/v1/translation/sura/'+row.edition+'/'+row.chapter;
   if(row.kind==='tafsir'&&lock.tafsirs.includes(row.edition)&&row.file===row.edition+'.json')allowed='https://quranenc.com/api/v1/tafsir/range/'+row.edition+'/1/1/114/6';
   if(!allowed||row.url!==allowed)throw Error('Unreviewed QuranEnc source');
   const cached=path.join(cache,row.file);
   const info=await fs.lstat(cached).catch(()=>null);
   if(info&&!info.isFile())throw Error('Invalid cached QuranEnc file');
   let bytes=info?await fs.readFile(cached):null;
   if(!bytes||bytes.length!==row.bytes||sha(bytes)!==row.sha256){
    for(let attempt=0;attempt<3;attempt++){
     const response=await fetch(row.url,{signal:AbortSignal.timeout(60000),credentials:'omit',redirect:'error'});
     if(response.status===429&&attempt<2){await new Promise(resolve=>setTimeout(resolve,Math.min(45000,Math.max(1000,Number(response.headers.get('retry-after')||5)*1000))));continue;}
     if(!response.ok)throw Error('QuranEnc build source unavailable: '+row.file);
     const reader=response.body.getReader(),chunks=[];let length=0;
     try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>row.bytes)throw Error('Oversized QuranEnc response');chunks.push(value);}}catch(error){await reader.cancel();throw error;}
     bytes=Buffer.concat(chunks);break;
    }
    if(!bytes||bytes.length!==row.bytes||sha(bytes)!==row.sha256)throw Error('QuranEnc source changed; review publisher release: '+row.file);
    await fs.writeFile(cached,bytes);
   }
   const body=JSON.parse(bytes.toString('utf8'));
   if(row.kind!=='metadata'&&(!Array.isArray(body.result)||body.result.length!==row.records))throw Error('Incomplete source: '+row.file);
   await fs.writeFile(path.join(target,row.file),bytes);
  }
 }));
 await fs.copyFile(path.join(mobile,'installed-quranenc-lock.json'),path.join(target,'manifest.json'));
 const font={url:'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/e35e7b590ba68ff451f32aba92a8f078fd11966f/hafs/font/hafs.18.woff2',bytes:87760,sha256:'8c00e7a7d5f773bcfb1642fdcfba505dbd81975fef39f14718827a32d075020c'};
 const cachedFont=path.join(cache,'uthmanic-hafs18.woff2');
 const fontInfo=await fs.lstat(cachedFont).catch(()=>null);
 if(fontInfo&&!fontInfo.isFile())throw Error('Invalid cached font');
 let fontBytes=fontInfo?await fs.readFile(cachedFont):null;
 if(!fontBytes||fontBytes.length!==font.bytes||sha(fontBytes)!==font.sha256){
  const response=await fetch(font.url,{signal:AbortSignal.timeout(30000),credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error('Independent v18 font unavailable');
  fontBytes=Buffer.from(await response.arrayBuffer());
  if(fontBytes.length!==font.bytes||sha(fontBytes)!==font.sha256)throw Error('Independent v18 font differs from existing font');
  await fs.writeFile(cachedFont,fontBytes);
 }
 await fs.writeFile(path.join(target,'uthmanic-hafs18.woff2'),fontBytes);
 await fs.copyFile(path.join(mobile,'notices/kfgqpc-hafs18.txt'),path.join(target,'KFGQPC-FONT-LICENSE.txt'));
 await fs.writeFile(path.join(target,'font-source.json'),JSON.stringify({...font,license:'KFGQPC embedded EULA; unmodified font version0.18'},null,2));
 console.log('Installed original QuranEnc responses: '+lock.translations.length+' translation-style editions and '+lock.tafsirs.length+' Saadi source archives; published gaps retained. Exact independent v18 font included.');
 return lock;
}
