from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1];r=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'quran-corpus-review';manifest=json.loads((r/'response-manifest.json').read_text());rows=[]
for c in manifest['chapters']:
 for response in c['responses']:rows.extend(json.loads((r/response['file']).read_text())['verses'])
pages=[];global_slots=[];offsets={}
for n in range(1,605):
 verses=[v for v in rows if v['words'][0]['page_number']==n]
 assert all(all(w['page_number']==n for w in v['words'])for v in verses)
 counts={}
 for v in verses:
  for w in v['words']:counts[w['line_number']]=counts.get(w['line_number'],0)+1
 count=8 if n<=2 else 15;offsets[n]=len(global_slots)
 for line in range(1,count+1):global_slots.append({'page':n,'line':line,'occupied':line in counts})
 pages.append({'number':n,'first':verses[0]['verse_key'],'last':verses[-1]['verse_key'],'verse_count':len(verses),'word_count':sum(len(v['words'])for v in verses),'juzs':sorted({v['juz_number']for v in verses}),'lines':counts,'decorations':[],'line_count':count})
for v in rows:
 if v['verse_number']!=1:continue
 c=int(v['verse_key'].split(':')[0]);w=v['words'][0];start=offsets[w['page_number']]+w['line_number']-1
 types=['heading']if c in (1,9)else['bismillah','heading']
 for distance,kind in enumerate(types,1):
  slot=global_slots[start-distance];assert not slot['occupied'],(c,slot);assert not slot.get('kind');slot['kind']=kind
  pages[slot['page']-1]['decorations'].append({'line':slot['line'],'type':kind,'chapter':c})
assert sum(not x['occupied']for x in global_slots)==226
assert all(x['occupied']or x.get('kind')for x in global_slots)
out={'layout':'qcf-v2-604','source':'https://api.quran.com/api/v4','review_manifest_sha256':hashlib.sha256((r/'response-manifest.json').read_bytes()).hexdigest(),'pages':pages}
(root/'dist/content/mushaf-pages.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('604 complete source page boundaries; 114 headings and 112 basmalah slots, including headings across page breaks.')
