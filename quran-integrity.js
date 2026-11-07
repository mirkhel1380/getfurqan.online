/* Validate source structure; never repair, normalize or replace Quran text. */
(function(root){
 'use strict';
 const fail=()=>{throw Error('Incomplete or mismatched Quran source')};
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const supplied=s=>typeof s==='string'&&s.trim().length>0&&!/[\uFFFD\u0000]/u.test(s);
 function chapters(rows){
  if(!Array.isArray(rows)||rows.length!==114)fail();
  const ids=new Set();let total=0;
  for(const c of rows){if(!integer(c.id,1,114)||ids.has(c.id)||!integer(c.verses_count,1,286))fail();ids.add(c.id);total+=c.verses_count}
  if(total!==6236)fail();
  return rows;
 }
 function reference(key,rows){
  if(typeof key!=='string'||!/^\d{1,3}:\d{1,3}$/.test(key))fail();
  const [c,v]=key.split(':').map(Number),chapter=rows.find(x=>x.id===c);
  if(!chapter||!integer(v,1,chapter.verses_count)||key!==c+':'+v)fail();
  return [c,v];
 }
 function passage(rows,book,target,script='uthmani'){
  if(!Array.isArray(rows)||!rows.length||!['uthmani','indopak','tajweed'].includes(script))fail();
  const seen=new Set();let previous=0;
  for(const v of rows){
   const [c,n]=reference(v.verse_key,book),order=c*1000+n;
   if(seen.has(v.verse_key)||order<=previous||v.verse_number!==n||!supplied(v.text_uthmani))fail();seen.add(v.verse_key);previous=order;
   if(target?.type==='chapter'&&c!==Number(target.number)||target?.type==='verse'&&v.verse_key!==target.number||target?.type==='juz'&&v.juz_number!==Number(target.number))fail();
   if(!Array.isArray(v.words)||!v.words.length)fail();
   let position=0,ends=0,wordCount=0;
   for(const w of v.words){
    if(!integer(w.position,1,1000)||w.position<=position||!integer(w.page_number,1,604)||!['word','end','pause','sajdah','rub-el-hizb'].includes(w.char_type_name))fail();position=w.position;
    if(w.char_type_name==='end'){ends++;if(script!=='indopak'&&!supplied(w.text_qpc_hafs))fail()}
    else {if(w.char_type_name==='word')wordCount++;if(script!=='indopak'&&!supplied(w.code_v2))fail()}
   }
   if(!wordCount||ends!==1||script==='indopak'&&!supplied(v.text_indopak_nastaleeq))fail();
   if(target?.type==='page'&&!v.words.some(w=>w.page_number===Number(target.number)))fail();
  }
  if(target?.type==='verse'&&rows.length!==1)fail();
  return rows;
 }
 root.AFQuranIntegrity=Object.freeze({chapters,reference,passage});
})(typeof window==='undefined'?globalThis:window);
