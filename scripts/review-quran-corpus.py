"""Retrieve current primary-source responses for a reproducible technical review.

Raw source files remain in an external cache. This never changes published text.
Use --download to refresh; validate with check-quran-corpus.mjs afterwards.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import argparse, hashlib, json, urllib.request

p=argparse.ArgumentParser();p.add_argument('--cache',default='../quran-corpus-review');p.add_argument('--download',action='store_true');args=p.parse_args()
out=Path(args.cache);out.mkdir(parents=True,exist_ok=True)
api='https://api.quran.com/api/v4'
def fetch(name,url,as_json=True):
 path=out/name
 if args.download or not path.exists():
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  raw=urllib.request.urlopen(req,timeout=35).read()
  if as_json:json.loads(raw)
  elif not raw.startswith(b'1|1|'):raise ValueError('Unexpected numbered Quran export')
  path.write_bytes(raw)
 return json.loads(path.read_bytes()) if as_json else path.read_text()
for name,url,is_json in [
 ('uthmani.txt',api+'/quran/verses/uthmani',True),
 ('indopak.txt',api+'/quran/verses/indopak_nastaleeq',True),
 ('glyphs.json',api+'/quran/verses/code_v2',True),
 ('tanzil-comparable.txt','https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&marks=true&sajdah=true&alef=true&tatweel=true&agree=true',False),
]:fetch(name,url,is_json)
chapters=fetch('chapters.json',api+'/chapters?language=en')['chapters']
assert len(chapters)==114 and len({c['id'] for c in chapters})==114 and sum(c['verses_count'] for c in chapters)==6236
def chapter(c):
 page=1;seen=set();rows=[];receipts=[]
 while page:
  assert page not in seen and isinstance(page,int) and 1<=page<=20;seen.add(page)
  name=f"chapter-{c['id']}-page-{page}.json"
  url=api+f"/verses/by_chapter/{c['id']}?words=true&word_fields=code_v2,text_qpc_hafs,text_indopak_nastaleeq&fields=text_uthmani,text_indopak_nastaleeq&per_page=50&page={page}"
  data=fetch(name,url);pagination=data['pagination'];assert pagination['current_page']==page and pagination['total_records']==c['verses_count']
  part=data['verses'];assert part and all(int(v['verse_key'].split(':')[0])==c['id'] for v in part)
  rows.extend(part);receipts.append({'file':name,'url':url,'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest()});page=pagination['next_page']
 assert [v['verse_key'] for v in rows]==[f"{c['id']}:{v}" for v in range(1,c['verses_count']+1)]
 return {'chapter':c['id'],'verses':len(rows),'responses':receipts}
checks=[]
with ThreadPoolExecutor(max_workers=4) as pool:
 futures={pool.submit(chapter,c):c['id'] for c in chapters}
 for future in as_completed(futures):
  checks.append(future.result())
  if len(checks)%10==0 or len(checks)==114:print('Downloaded/checked',len(checks),'of114 chapters',flush=True)
checks.sort(key=lambda x:x['chapter'])
(out/'response-manifest.json').write_text(json.dumps({'api':api,'chapter_metadata_sha256':hashlib.sha256((out/'chapters.json').read_bytes()).hexdigest(),'chapters':checks},indent=2)+'\n')
print('All6236 references retrieved, complete and ordered. Run the JS source/glyph validator next.')
