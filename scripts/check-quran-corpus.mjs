/* Whole-source technical checks. Does not rewrite or certify religious text. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import vm from 'node:vm';import assert from 'node:assert/strict';
const dir=process.argv[2]||'../quran-corpus-review',read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),hash=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('dist/quran-integrity.js','utf8'),context);const q=context.AFQuranIntegrity;
const book=q.chapters(read('chapters.json').chapters),manifest=read('response-manifest.json');assert.equal(hash('chapters.json'),manifest.chapter_metadata_sha256);
const bulk=read('uthmani.txt').verses,indopak=read('indopak.txt').verses,glyphs=read('glyphs.json').verses;
q.textRows(bulk,book,null,{complete:true});q.textRows(indopak,book,null,{field:'text_indopak_nastaleeq',complete:true});q.textRows(glyphs,book,null,{field:'code_v2',complete:true});
const u=new Map(bulk.map(v=>[v.verse_key,v])),i=new Map(indopak.map(v=>[v.verse_key,v])),g=new Map(glyphs.map(v=>[v.verse_key,v]));
let wordCount=0,markerCount=0,total=0;const pages=new Set(),checks=[],glyphSpacingDifferences=[];const types={};
for(const item of manifest.chapters){
 const rows=[];
 for(const response of item.responses){assert.equal(hash(response.file),response.sha256);rows.push(...read(response.file).verses)}
 const target={type:'chapter',number:item.chapter};q.textRows(rows,book,target,{complete:true});
 for(const script of ['uthmani','indopak','tajweed'])q.passage(rows,book,target,script);
 for(const v of rows){
  assert.equal(v.text_uthmani,u.get(v.verse_key)?.text_uthmani,'Uthmani endpoint mismatch at'+v.verse_key);
  assert.equal(v.text_indopak_nastaleeq,i.get(v.verse_key)?.text_indopak_nastaleeq,'IndoPak endpoint mismatch at'+v.verse_key);
  const wordGlyphs=v.words.map(w=>w.code_v2).join(' '),bulkGlyphs=g.get(v.verse_key)?.code_v2;
  if(wordGlyphs!==bulkGlyphs)glyphSpacingDifferences.push(v.verse_key);
  // These are font glyph codes, not Arabic source text. The two endpoints
  // group pause glyphs differently; compare codepoint order separately from
  // ASCII layout spaces and retain every raw spacing difference in the report.
  assert.equal(wordGlyphs.replace(/ /g,''),bulkGlyphs?.replace(/ /g,''),'Glyph sequence mismatch at'+v.verse_key);
  for(const w of v.words){types[w.char_type_name]=(types[w.char_type_name]||0)+1;pages.add(w.page_number);if(w.char_type_name==='word')wordCount++;if(w.char_type_name==='end')markerCount++}
 }
 total+=rows.length;checks.push({chapter:item.chapter,verses:rows.length,all_three_script_structures:true,uthmani_equal_to_bulk:true,indopak_equal_to_bulk:true,glyph_codepoint_sequence_equal_ignoring_ascii_layout_spaces:true,response_sha256:item.responses.map(r=>r.sha256)});
}
assert.equal(total,6236);assert.equal(checks.length,114);assert.equal(pages.size,604);assert.equal(markerCount,6236);
const tanzilFile='tanzil-comparable.txt',source=fs.readFileSync(path.join(dir,tanzilFile),'utf8'),tanzil=new Map();
for(const line of source.split(/\r?\n/)){if(/^\d+\|\d+\|/.test(line)){const cut=line.indexOf('|',line.indexOf('|')+1),key=line.slice(0,cut).replace('|',':');assert(!tanzil.has(key));tanzil.set(key,line.slice(cut+1))}}
assert.equal(tanzil.size,6236);const differences=bulk.filter(v=>v.text_uthmani!==tanzil.get(v.verse_key)).map(v=>v.verse_key);
const notice=source.slice(source.indexOf('#')).trimEnd();assert(notice.includes('Tanzil Quran Text')&&notice.includes('Version 1.1'));
const report={checked_at:new Date().toISOString(),scope:'Complete current-source structural and endpoint review; exact independent Arabic comparison. Not scholarly proofreading or Mushaf certification.',api:manifest.api,chapters:114,verses:total,words:wordCount,end_markers:markerCount,font_pages:pages.size,word_types:types,sources:{chapters:{sha256:hash('chapters.json')},uthmani:{url:manifest.api+'/quran/verses/uthmani',sha256:hash('uthmani.txt')},indopak:{url:manifest.api+'/quran/verses/indopak_nastaleeq',sha256:hash('indopak.txt')},glyphs:{url:manifest.api+'/quran/verses/code_v2',sha256:hash('glyphs.json')}},glyph_comparison:{codepoint_sequence_equal:true,comparison_ignores_ascii_layout_space_only:true,raw_spacing_differing_references:glyphSpacingDifferences,source_text_was_changed:false},independent_comparison:{source:'Tanzil Project',url:'https://tanzil.net/download/',download_url:'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&marks=true&sajdah=true&alef=true&tatweel=true&agree=true',sha256:hash(tanzilFile),version:'1.1',original_notice:notice,exact_equal:6236-differences.length,differing_references:differences,text_was_normalized:false,text_was_changed:false,interpretation:'Exact Unicode differences are recorded as differences, not labelled errors. Downloaded editions can differ in introductory basmalah presentation, orthographic signs and other source details. Qualified review is required to assess differences.'},checks};
fs.writeFileSync('docs/quran-corpus-review.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${total} verses across114 chapters; exact chapter↔bulk Uthmani/IndoPak equality and glyph-code sequence equality (ASCII layout spaces compared separately); ${wordCount} word records, ${markerCount} verse markers and604 font pages. Tanzil exact matches:${6236-differences.length}; differing references:${differences.length}, preserved for review. No Arabic text normalized or rewritten.`);
