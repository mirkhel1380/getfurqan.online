import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {installedQuranEncFetch} from '../src/installed-quranenc.mjs';

const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(mobile,'dist');
const present=await fs.access(path.join(out,'installed-quranenc/manifest.json')).then(()=>true).catch(()=>false);
if(!present){console.log('QuranEnc checks: shared/iOS bundle is unchanged; Android additions are not enabled.');process.exit(0);}
const lock=JSON.parse(await fs.readFile(path.join(mobile,'installed-quranenc-lock.json')));
assert.deepEqual(JSON.parse(await fs.readFile(path.join(out,'installed-quranenc/manifest.json'))),lock);
const catalog=JSON.parse(await fs.readFile(path.join(mobile,'src/offline-catalog.json'))),counts=new Map(catalog.chapters.map(c=>[c.id,c.verses_count]));
const origin='https://localhost';let external=0,local=0;
const localOnly=async input=>{
 const url=new URL(input);
 if(url.origin!==origin||!/^\/installed-quranenc\/[a-z][a-z0-9_-]+\.json$/.test(url.pathname)){external++;throw Error('Network disabled');}
 local++;return new Response(await fs.readFile(path.join(out,url.pathname)));
};
const transport=installedQuranEncFetch({fetch:localOnly,origin,lock,studyChapters:catalog.chapters});
assert.deepEqual((await(await transport('https://api.quran.com/api/v4/chapters?language=en')).json()).chapters,catalog.chapters);
await import('../dist/quran-integrity.js');
assert.equal(globalThis.AFQuranIntegrity.chapters(catalog.chapters).length,114);
const totals=new Map(),tafsirs=new Set();
for(const entry of lock.files){
 const bytes=await fs.readFile(path.join(out,'installed-quranenc',entry.file));
 assert.equal(bytes.length,entry.bytes,entry.file);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.file);
 const original=JSON.parse(bytes);
 if(entry.kind==='metadata'){
  const actual=await(await transport(entry.url)).json();
  if(entry.file==='translations.json'&&lock.translations.includes('dari_badkhashani')){
   for(const row of original.translations)assert.deepEqual(actual.translations.find(x=>x.key===row.key),row);
   assert.equal(actual.translations.find(x=>x.key==='dari_badkhashani').version,'1.0.0');
  }else assert.deepEqual(actual,original);
  continue;
 }
 assert.match(entry.version,/^\d+(?:\.\d+)+$/);
 if(entry.kind==='translation'){
  assert.equal(original.result.length,counts.get(entry.chapter),entry.file);
  for(const [index,row]of original.result.entries()){
   assert.equal(Number(row.sura),entry.chapter);assert.equal(Number(row.aya),index+1);
   assert.ok(row.translation.trim());assert.ok(row.footnotes===null||typeof row.footnotes==='string');
  }
  totals.set(entry.edition,(totals.get(entry.edition)||0)+original.result.length);
  assert.deepEqual(await(await transport(entry.url)).json(),original);
  for(const row of [original.result[0],original.result.at(-1)]){
   const url='https://quranenc.com/api/v1/translation/aya/'+entry.edition+'/'+entry.chapter+'/'+row.aya;
   assert.deepEqual((await(await transport(url)).json()).result,row);
  }
 }else{
  tafsirs.add(entry.edition);const covered=new Set(),ids=new Set();
  for(const row of original.result){
   assert.ok(!ids.has(row.id));ids.add(row.id);assert.ok(row.text===null||typeof row.text==='string');
   assert.ok(Number(row.from_aya)>=1&&Number(row.to_aya)<=counts.get(Number(row.sura)));
   if(row.text?.trim())for(let verse=Number(row.from_aya);verse<=Number(row.to_aya);verse++)covered.add(row.sura+':'+verse);
  }
  assert.equal(covered.size,6236,entry.edition);
  assert.equal(original.result.filter(row=>!row.text?.trim()).length,entry.emptySourceBlocks);
  const blank=original.result.find(row=>!row.text?.trim());
  const probes=[[1,1],[2,255],[9,1],[114,6]];
  if(blank)probes.push([Number(blank.sura),Number(blank.from_aya)]);
  for(const [chapter,verse]of probes){
   const expected=original.result.filter(row=>Number(row.sura)===chapter&&Number(row.from_aya)<=verse&&Number(row.to_aya)>=verse);
   assert.ok(expected.length);
   const url='https://quranenc.com/api/v1/tafsir/aya/'+entry.edition+'/'+chapter+'/'+verse;
   assert.deepEqual((await(await transport(url)).json()).result,expected,'Source entries, including blanks, must be retained');
  }
 }
}
assert.deepEqual([...totals.keys()].sort(),[...lock.translations].sort());
for(const count of totals.values())assert.equal(count,6236,'Partial translations must never be shipped as complete');
assert.deepEqual([...tafsirs].sort(),[...lock.tafsirs].sort());
assert.equal(external,0);
const font=await fs.readFile(path.join(out,'installed-quranenc/uthmanic-hafs18.woff2'));
assert.equal(font.length,87760);assert.equal(createHash('sha256').update(font).digest('hex'),'8c00e7a7d5f773bcfb1642fdcfba505dbd81975fef39f14718827a32d075020c');
assert.deepEqual(await fs.readFile(path.join(out,'installed-quranenc/KFGQPC-FONT-LICENSE.txt')),await fs.readFile(path.join(mobile,'notices/kfgqpc-hafs18.txt')));
for(const kind of ['missing','corrupt']){
 let requests=0;
 const broken=installedQuranEncFetch({origin,lock,fetch:async url=>{requests++;assert.ok(String(url).startsWith(origin+'/installed-quranenc/'));return kind==='missing'?new Response('',{status:404}):new Response('damaged');}});
 assert.equal((await broken(lock.files.find(row=>row.kind==='translation').url)).status,503);assert.equal(requests,1);
}
const delegated=[];
const pass=installedQuranEncFetch({origin,lock,fetch:async(...args)=>{delegated.push(args);return new Response('unchanged');}});
for(const [url,init]of [
 ['https://api.quran.com/api/v4/chapters?language=en',{}],
 ['https://api.quran.com/api/v4/verses/by_key/1:1',{}],
 ['https://quranenc.com/api/v1/translation/sura/unreviewed_edition/1',{}],
 ['https://quranenc.com/api/v1/translation/sura/english_saheeh/1?without_footnotes_symbols=1',{}],
 ['https://quranenc.com/api/v1/translation/sura/english_saheeh/1',{method:'POST'}]
]){assert.equal(await(await pass(url,init)).text(),'unchanged');assert.deepEqual(delegated.at(-1),[url,init]);}
const controller=new AbortController();controller.abort();
await assert.rejects(transport(lock.files.find(row=>row.kind==='translation').url,{signal:controller.signal}),{name:'AbortError'});
console.log('PASS: '+lock.translations.length+' translation-style editions; '+lock.tafsirs.length+' whole Saadi source archives with publisher blanks retained; original prose, footnotes and exact v18 font; '+local+' local reads, zero external requests.');
