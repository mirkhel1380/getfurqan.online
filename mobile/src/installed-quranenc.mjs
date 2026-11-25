import {sha256} from '@noble/hashes/sha2.js';
const hash=bytes=>[...sha256(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
// Android-only source transport. Never synthesize or repair publisher prose.
export function installedQuranEncFetch({fetch:original,origin,lock,studyChapters}){
 if(lock.schema!==1||lock.source!=='https://quranenc.com')throw Error('Invalid QuranEnc install manifest');
 const entries=new Map(lock.files.map(row=>[row.file,row]));
 if(entries.size!==lock.files.length)throw Error('Duplicate QuranEnc resource');
 const translations=new Set(lock.translations),tafsirs=new Set(lock.tafsirs),cache=new Map();
 function route(url){
  if(studyChapters&&url.href==='https://api.quran.com/api/v4/chapters?language=en')return {kind:'chapters'};
  if(url.origin!=='https://quranenc.com'||url.hash)return null;
  const match=url.pathname.match(/^\/api\/v1\/(translation|tafsir)\/(sura|aya)\/([a-z]+_[a-z]+)\/(\d{1,3})(?:\/(\d{1,3}))?$/);
  if(match&&!url.search){
   const [,kind,unit,key,c,v]=match,chapter=Number(c),verse=v?Number(v):null;
   if(chapter<1||chapter>114||(unit==='aya'&&(!verse||verse>286))||(unit==='sura'&&v))return null;
   if(!(kind==='translation'?translations:tafsirs).has(key)||(kind==='tafsir'&&unit!=='aya'))return null;
   return {file:kind==='translation'?key+'-'+chapter+'.json':key+'.json',kind,chapter,verse};
  }
  if(/^\/api\/v1\/translations\/list\/?$/.test(url.pathname)&&[...url.searchParams].every(([key,value])=>key==='localization'&&value==='en'))return {file:'translations.json',kind:'metadata'};
  if(/^\/api\/v1\/tafsirs\/list\/?$/.test(url.pathname)&&!url.search)return {file:'tafsirs.json',kind:'metadata'};
  return null;
 }
 async function load(file){
  if(!cache.has(file)){
   const task=(async()=>{
    const row=entries.get(file);if(!row)throw Error('Resource not installed');
    const response=await original(new URL('/installed-quranenc/'+file,origin).href,{credentials:'omit',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Installed resource unavailable');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw Error('Damaged installed QuranEnc resource');
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(row.kind!=='metadata'&&(!Array.isArray(data.result)||data.result.length!==row.records))throw Error('Incomplete installed QuranEnc resource');
    return data;
   })();cache.set(file,task);task.catch(()=>{if(cache.get(file)===task)cache.delete(file);});
   while(cache.size>3)cache.delete(cache.keys().next().value);
  }
  return cache.get(file);
 }
 return async(input,init={})=>{
  const request=typeof Request!=='undefined'&&input instanceof Request?input:null;
  const url=new URL(request?request.url:String(input),origin);
  const selected=(init.method||request?.method||'GET').toUpperCase()==='GET'?route(url):null;
  if(!selected)return original(input,init);
  const signal=init.signal||request?.signal;signal?.throwIfAborted();
  try{
   if(selected.kind==='chapters')return new Response(JSON.stringify({chapters:studyChapters}),{headers:{'Content-Type':'application/json'}});
   const data=await load(selected.file);signal?.throwIfAborted();
   let result=data;
   if(selected.file==='translations.json'&&translations.has('dari_badkhashani')&&!data.translations.some(row=>row.key==='dari_badkhashani')){
    const entry=lock.files.find(row=>row.edition==='dari_badkhashani');
    result={...data,translations:[...data.translations,{key:'dari_badkhashani',version:entry.version,version_source:'https://quranenc.com/dashboard/'}]};
   }
   if(selected.kind==='tafsir')result={...data,result:data.result.filter(row=>Number(row.sura)===selected.chapter&&Number(row.from_aya)<=selected.verse&&Number(row.to_aya)>=selected.verse)};
   if(selected.kind==='translation'&&selected.verse){
    const row=data.result.find(row=>Number(row.sura)===selected.chapter&&Number(row.aya)===selected.verse);
    if(!row)throw Error('Verse not installed');result={...data,result:row};
   }
   return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json; charset=utf-8'}});
  }catch{signal?.throwIfAborted();return new Response(JSON.stringify({error:'Installed QuranEnc resource unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});}
 };
}
