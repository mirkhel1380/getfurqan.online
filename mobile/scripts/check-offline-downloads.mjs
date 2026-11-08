import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createDownloads,LIMIT,packKey,sourceURL,recordingURL,validatePack,fingerprint} from '../src/offline-core.mjs';
import {offlineMessages} from './offline-messages.mjs';
const catalog=JSON.parse(readFileSync(new URL('../src/offline-catalog.json',import.meta.url),'utf8'));
assert.equal(catalog.chapters.length,114);assert.equal(catalog.chapters.reduce((sum,c)=>sum+c.verses_count,0),6236);
function fixture(){
 const disk=new Map(),metadata=new Map(),calls=[];let failAt=0,metadataFail=false,budget=0,active=false,network=true;
 const audio=verse=>{const b=new Uint8Array(512);b.set([73,68,51]);b[20]=verse;return b};
 const rows=(chapter=1,reciter=7)=>Array.from({length:catalog.chapters.find(c=>c.id===chapter).verses_count},(_,i)=>({verse_key:chapter+':'+(i+1),url:catalog.reciters.find(r=>r.id===reciter).base+String(chapter).padStart(3,'0')+String(i+1).padStart(3,'0')+'.mp3'}));
 const store={
  async list(){return structuredClone([...metadata.values()])},async get(key){return structuredClone(metadata.get(key))},async save(p){if(metadataFail)throw Error('Quota exceeded');metadata.set(p.key,structuredClone(p))},async delete(key){metadata.delete(key)},
  async size(path){if(!disk.has(path))throw Error('Missing');return disk.get(path).length},async read(path){if(!disk.has(path))throw Error('Missing');return disk.get(path)},async usedBytes(){return budget+[...disk.values()].reduce((n,b)=>n+b.length,0)},
  async download(url,path){assert(network);calls.push(url);if(failAt===calls.length)throw Error('Network failed');disk.set(path,audio(Number(url.slice(-7,-4))))},async removeFile(path){disk.delete(path)},async removePack(key){for(const p of disk.keys())if(p.startsWith('recitations-v1/'+key+'/'))disk.delete(p)},
  async playable(path,bytes){return {src:'fixture-local:'+path,bytes,release(){}}}
 };
 const exclusive=async fn=>{if(active)throw Error('Another download is already running.');active=true;try{return await fn()}finally{active=false}};
 const options={catalog,store,exclusive,recordings:async(c,r)=>{assert(network);return rows(c,r)}};
 return {disk,metadata,calls,store,options,rows,manager:createDownloads(options),fail(n){failAt=n},quota(value){budget=value},failMetadata(on){metadataFail=on},offline(){network=false}};
}
const sample=new Uint8Array(512);sample.set([73,68,51]);assert.equal(await fingerprint(sample),createHash('sha256').update(sample).digest('hex'));
const full=fixture();await full.manager.download(1,7);assert.equal(full.calls.length,7);assert.equal((await full.manager.list()).packs[0].downloaded,7);assert.equal(full.metadata.get('7-1').files.length,7);
await full.manager.download(1,7);assert.equal(full.calls.length,7,'Reuse verified recordings');full.offline();assert((await full.manager.playable('7-1',7)).src.startsWith('fixture-local:'),'Playback uses no network');
const partial=fixture();partial.fail(4);await assert.rejects(partial.manager.download(1,7));assert.equal(partial.metadata.get('7-1').files.length,3);assert.equal(partial.disk.size,3);partial.fail(0);await partial.manager.download(1,7);assert.equal(partial.calls.length,8,'Resume only missing four recordings');assert.equal(partial.disk.size,7);
const cancelled=fixture();let cancelManager;cancelManager=createDownloads({...cancelled.options,onProgress:p=>{if(p?.done===2)cancelManager.stop()}});assert.equal((await cancelManager.download(1,7)).stopped,true);assert.equal(cancelled.metadata.get('7-1').files.length,2);assert.equal(cancelManager.state().busy,false);
const corrupt=fixture();await corrupt.manager.download(1,7);const bad=corrupt.metadata.get('7-1').files[2];corrupt.disk.get(bad.path)[20]^=1;await assert.rejects(corrupt.manager.playable('7-1',3),/damaged/);await corrupt.manager.download(1,7);assert.equal(corrupt.calls.length,8,'Repair only corrupt verse');assert.equal(corrupt.disk.size,7);const missing=corrupt.metadata.get('7-1').files[0];corrupt.disk.delete(missing.path);assert.equal((await corrupt.manager.list()).packs[0].downloaded,6);await corrupt.manager.download(1,7);assert.equal(corrupt.calls.length,9);
const atomic=fixture();let saves=0;const originalSave=atomic.store.save;atomic.store.save=async p=>{if(++saves===2)throw Error('Storage full');return originalSave(p)};await assert.rejects(atomic.manager.download(1,7));assert.equal(atomic.metadata.get('7-1').files.length,0);assert.equal(atomic.disk.size,0,'Uncommitted file removed');
const invalid=fixture();invalid.store.download=async(url,path)=>invalid.disk.set(path,new Uint8Array(500).fill(60));await assert.rejects(invalid.manager.download(1,7),/damaged/);assert.equal(invalid.disk.size,0);assert.equal(invalid.metadata.get('7-1').files.length,0);
const quota=fixture();quota.quota(LIMIT-10);await assert.rejects(quota.manager.download(1,7),/limit reached/);assert.equal(quota.disk.size,0,'Over-limit file removed');
for(const url of ['http://verses.quran.com/a.mp3','https://evil.example/a.mp3','https://verses.quran.com.evil.example/a.mp3','https://user:pass@verses.quran.com/a.mp3','https://verses.quran.com/a.mp3?secret=1','file:///x.mp3'])assert.throws(()=>sourceURL(url));
assert.throws(()=>recordingURL('Sudais/mp3/001001.mp3',1,1,7,catalog));assert.throws(()=>recordingURL('Alafasy/mp3/002255.mp3',1,1,7,catalog));
const swapped=fixture();const other=createDownloads({...swapped.options,recordings:async()=>swapped.rows().reverse()});await assert.rejects(other.download(1,7));assert.equal(swapped.disk.size,0,'No download on misordered source');assert.throws(()=>packKey(1,999,catalog));
const traversal=structuredClone(partial.metadata.get('7-1'));traversal.files[0].path='../../account';assert.throws(()=>validatePack(traversal,catalog));
const removal=fixture();await removal.manager.download(1,7);await removal.manager.download(1,3);await removal.manager.remove('7-1');assert.equal(removal.metadata.size,1);assert.equal(removal.disk.size,7);assert(removal.metadata.has('3-1'),'Other reciter retained');
const concurrent=fixture();let finish;const wait=new Promise(r=>finish=r);const first=createDownloads({...concurrent.options,recordings:async()=>{await wait;return concurrent.rows()}});const job=first.download(1,7);await assert.rejects(first.download(1,7),/already running/);await assert.rejects(concurrent.manager.download(1,7),/already running/);finish();await job;
for(const [lang,dict]of Object.entries(offlineMessages)){assert.equal(Object.keys(dict).length,27,lang);for(const [key,value]of Object.entries(dict)){assert(value,lang);assert.deepEqual([...key.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),lang)}}
console.log('PASS: all 114 chapters; source reciter/verse mapping; offline-only local playback; interrupted resume; cancellation; corruption/missing-file repair; atomic metadata failure; invalid audio; quota; cross-tab lock; scoped deletion; path/URL rejection; 13 languages.');
