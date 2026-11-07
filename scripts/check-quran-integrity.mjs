import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('dist/quran-integrity.js','utf8'),c);const q=c.AFQuranIntegrity;
const book=[{id:1,verses_count:7},{id:2,verses_count:286}];
const verse={verse_key:'1:1',verse_number:1,juz_number:1,text_uthmani:'بِسْمِ',text_indopak_nastaleeq:'بِسْمِ',words:[{position:1,page_number:1,char_type_name:'word',code_v2:'ﱁ'},{position:2,page_number:1,char_type_name:'end',text_qpc_hafs:'١'}]};
const clone=()=>JSON.parse(JSON.stringify(verse)),target={type:'verse',number:'1:1'};
for(const script of ['uthmani','indopak','tajweed']){const v=clone(),before=JSON.stringify(v);q.passage([v],book,target,script);assert.equal(JSON.stringify(v),before,'Source must remain byte-for-byte unchanged')}
for(const mutate of [v=>v.verse_key='1:8',v=>v.verse_number=2,v=>v.text_uthmani='�',v=>v.words[0].page_number=605,v=>v.words[0].code_v2='',v=>v.words[1].text_qpc_hafs='',v=>v.words.reverse(),v=>v.words.pop(),v=>v.words[0].char_type_name='unknown']){const v=clone();mutate(v);assert.throws(()=>q.passage([v],book,target))}
assert.throws(()=>q.passage([verse,verse],book));assert.throws(()=>q.passage([verse],book,{type:'chapter',number:2}));assert.throws(()=>q.passage([verse],book,{type:'juz',number:2}));assert.throws(()=>q.passage([verse],book,{type:'page',number:604}));
const noIndopak=clone();delete noIndopak.text_indopak_nastaleeq;assert.throws(()=>q.passage([noIndopak],book,target,'indopak'));q.passage([noIndopak],book,target,'uthmani');
const points=clone();points.text_uthmani+='  ۞';assert.equal(q.passage([points],book,target)[0].text_uthmani,points.text_uthmani,'Do not normalize sacred text');
assert.throws(()=>q.chapters([]));assert.throws(()=>q.reference('01:1',book));
console.log('PASS: source reference, chapter/juz/page bounds, ordering, duplication, glyph/marker presence, font-page range, script-specific fields, damaged data rejection and unchanged source text. This is structural validation, not scholarly proofreading.');
