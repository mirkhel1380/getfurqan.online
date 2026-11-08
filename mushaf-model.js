/* Source layout only: never split, normalize, renumber or repair Quran text. */
(function(root){
 'use strict';
 const fail=()=>{throw Error('Mushaf page source is incomplete or mismatched')};
 function page(rows,book,index,number){
  const expected=index?.layout==='qcf-v2-604'&&index.pages?.[number-1];
  if(!expected||expected.number!==number||!Array.isArray(rows)||rows.length!==expected.verse_count)fail();
  root.AFQuranIntegrity.passage(rows,book,{type:'page',number});
  if(rows[0].verse_key!==expected.first||rows.at(-1).verse_key!==expected.last)fail();
  const lines=new Map();let count=0,previous=0,flow=false;
  for(const verse of rows)for(const word of verse.words){
   if(word.page_number!==number||!Number.isInteger(word.line_number)||word.line_number<1||word.line_number>expected.line_count)fail();
   if(word.line_number<previous)flow=true;previous=word.line_number;
   if(!lines.has(word.line_number))lines.set(word.line_number,[]);
   lines.get(word.line_number).push({word,verse});count++;
  }
  if(count!==expected.word_count||lines.size!==Object.keys(expected.lines).length)fail();
  for(const [n,words]of lines)if(words.length!==expected.lines[n])fail();
  const slots=Array.from({length:expected.line_count},(_,i)=>({number:i+1,type:lines.has(i+1)?'text':'space',words:lines.get(i+1)||[]}));
  for(const h of expected.decorations){
   if(!book.some(c=>c.id===h.chapter)||slots[h.line-1]?.type!=='space')fail();
   if(!['heading','bismillah'].includes(h.type))fail();
   slots[h.line-1]={number:h.line,type:h.type,chapter:h.chapter};
  }
  if(slots.some(s=>s.type==='space'))fail();
  return {number,slots,flow,verses:rows,opening:number<=2,expected};
 }
 function requests(book,index,number){
  const expected=index?.layout==='qcf-v2-604'&&index.pages?.[number-1];if(!expected||expected.number!==number)fail();
  const [firstChapter,firstVerse]=root.AFQuranIntegrity.reference(expected.first,book),[lastChapter,lastVerse]=root.AFQuranIntegrity.reference(expected.last,book),result=[];
  for(let c=firstChapter;c<=lastChapter;c++){
   const from=c===firstChapter?firstVerse:1,to=c===lastChapter?lastVerse:book.find(x=>x.id===c).verses_count;
   for(let chunk=Math.floor((from-1)/50)+1;chunk<=Math.floor((to-1)/50)+1;chunk++)result.push({chapter:c,page:chunk,from,to});
  }
  return result;
 }
 root.AFMushafModel=Object.freeze({page,requests});
})(typeof window==='undefined'?globalThis:window);
