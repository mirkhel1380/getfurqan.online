/* Exhaustive offline validation against the previously downloaded, hashed source corpus. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const corpus=path.resolve(process.argv[2]||'../quran-corpus-review'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest=read(path.join(corpus,'response-manifest.json')),index=read('dist/content/mushaf-pages.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(hash(fs.readFileSync(path.join(corpus,'response-manifest.json'))),index.review_manifest_sha256);
const book=read(path.join(corpus,'chapters.json')).chapters,verses=[];
for(const c of manifest.chapters)for(const response of c.responses){const bytes=fs.readFileSync(path.join(corpus,response.file));assert.equal(hash(bytes),response.sha256);verses.push(...JSON.parse(bytes).verses)}
assert.equal(verses.length,6236);const before=JSON.stringify(verses),ctx=vm.createContext({URL});
for(const f of ['quran-integrity.js','mushaf-model.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
ctx.AFQuranIntegrity.chapters(book);const pages=new Map(),seen=new Set();let names=0,basmalah=0,words=0;const flowPages=[];
for(const verse of verses){const n=verse.words[0].page_number;if(!pages.has(n))pages.set(n,[]);pages.get(n).push(verse)}
for(let n=1;n<=604;n++){
 const requested=Array.from(ctx.AFMushafModel.requests(book,index,n)).flatMap(({chapter,page,from,to})=>verses.filter(v=>Number(v.verse_key.split(':')[0])===chapter).slice((page-1)*50,page*50).filter(v=>v.verse_number>=from&&v.verse_number<=to));
 assert.deepEqual(requested.map(v=>v.verse_key),pages.get(n).map(v=>v.verse_key),'Bounded chapter requests must cover the complete physical page');
 const rows=requested,model=ctx.AFMushafModel.page(rows,book,index,n);
 assert.equal(model.slots.length,n<=2?8:15);assert(!model.slots.some(s=>s.type==='space'));
 if(model.flow)flowPages.push(n);const source=rows.flatMap(v=>v.words.map(word=>({word,verse:v})));const flattened=model.flow?source:model.slots.flatMap(s=>s.words||[]);
 assert.equal(flattened.length,source.length);
 for(let i=0;i<source.length;i++){assert.equal(flattened[i].word,source[i].word);assert.equal(flattened[i].verse,source[i].verse);words++}
 for(const verse of rows){assert(!seen.has(verse.verse_key));seen.add(verse.verse_key);for(const script of ['uthmani','indopak','tajweed'])ctx.AFQuranIntegrity.passage([verse],book,{type:'page',number:n},script)}
 for(const slot of model.slots){if(slot.type==='heading')names++;if(slot.type==='bismillah'){basmalah++;assert(![1,9].includes(slot.chapter))}}
}
assert.deepEqual(flowPages,[589],'Source end-marker line for 84:21 reverses; preserve lexical order in flowing page layout');assert.equal(seen.size,6236);assert.equal(names,114);assert.equal(basmalah,112);assert.equal(JSON.stringify(verses),before,'Source payload must remain unchanged');
assert(index.pages[75].decorations.some(s=>s.type==='heading'&&s.chapter===4&&s.line===15));assert(index.pages[76].decorations.some(s=>s.type==='bismillah'&&s.chapter===4&&s.line===1));
assert.deepEqual(index.pages[603].decorations.filter(s=>s.type==='heading').map(s=>s.chapter),[112,113,114]);
const p=440,rows=pages.get(p),clone=()=>structuredClone(rows),reject=mutate=>{const v=clone();mutate(v);assert.throws(()=>ctx.AFMushafModel.page(v,book,index,p))};
reject(v=>v.pop());reject(v=>v.reverse());reject(v=>v[1]=v[0]);reject(v=>v[0].words.pop());reject(v=>v[0].words[0].page_number=439);reject(v=>v[0].words[0].line_number=0);reject(v=>v[0].words[0].line_number=15);reject(v=>v[0].words[0].code_v2='');
assert.throws(()=>ctx.AFMushafModel.page(rows,book,index,0));assert.throws(()=>ctx.AFMushafModel.page(rows,book,index,605));
const bad=structuredClone(index);bad.pages[p-1].decorations[0].chapter=999;assert.throws(()=>ctx.AFMushafModel.page(rows,book,bad,p));
console.log(`PASS: 604 complete pages, 6,236 verses, ${words} unchanged word/marker objects, 114 headings, 112 basmalah lines, cross-page headings, three script payloads and damaged-page rejection.`);
