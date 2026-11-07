"""Validate source codepoint coverage in the exact website Quran fonts. No text repairs."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from collections import defaultdict,Counter
import hashlib,json,time,unicodedata,html,threading,argparse,requests,fontTools,brotli
from fontTools.ttLib import TTFont
parser=argparse.ArgumentParser();parser.add_argument('--cache',default='../quran-corpus-review');args=parser.parse_args();ROOT=Path(args.cache);OUT=ROOT/'fonts';OUT.mkdir(parents=True,exist_ok=True)
BASE='https://verses.quran.foundation/fonts/quran/hafs/'
LOCAL=threading.local()
def session():
 if not hasattr(LOCAL,'session'):
  LOCAL.session=requests.Session();LOCAL.session.headers.update({'User-Agent':'Mozilla/5.0'})
 return LOCAL.session
JOBS=[]
for family,route in [('uthmani','v2/woff2/p{page}.woff2'),('tajweed','v4/colrv1/woff2/p{page}.woff2')]:
 for page in range(1,605):JOBS.append((family,page,route.format(page=page)))
JOBS.extend([('indopak',None,'nastaleeq/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2'),('markers',None,'uthmanic_hafs/UthmanicHafs1Ver18.woff2')])
def one(job):
 family,page,route=job;url=BASE+route;name=family+(f'-p{page:04}' if page else '')+'.woff2';path=OUT/name
 try:
  if not path.exists():
   for attempt in range(2):
    try:
     response=session().get(url,timeout=25);response.raise_for_status();raw=response.content
     if raw[:4]!=b'wOF2':raise ValueError('Unexpected font header')
     temporary=path.with_suffix('.tmp');temporary.write_bytes(raw);temporary.replace(path);break
    except Exception as e:
     status=getattr(getattr(e,'response',None),'status_code',None);transient=status is None or status in (429,500,502,503,504)
     if attempt==1 or not transient:raise
     time.sleep(1)
  raw=path.read_bytes();font=TTFont(path,checkChecksums=2);cmap=font.getBestCmap();assert cmap,'Missing usable cmap'
  covered={cp for cp,name in cmap.items() if name not in ('.notdef','NULL')}
  item={'family':family,'page':page,'file':name,'url':url,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'cmap_codepoints':len(covered)}
  if family=='tajweed':
   item['colr_version']=font['COLR'].version if 'COLR' in font else None
   item['cpal_palettes']=len(font['CPAL'].palettes) if 'CPAL' in font else 0
  font.close();return item,covered
 except Exception as e:return {'family':family,'page':page,'file':name,'url':url,'error':type(e).__name__+': '+str(e)},None
receipts=[];cmaps={};errors=[]
with ThreadPoolExecutor(max_workers=8) as pool:
 futures={pool.submit(one,job):job for job in JOBS}
 for n,future in enumerate(as_completed(futures),1):
  item,cmap=future.result();receipts.append(item)
  if cmap is None:errors.append(item)
  else:cmaps[(item['family'],item['page'])]=cmap
  if n%100==0 or n==len(JOBS):
   print(f'Font assets {n}/{len(JOBS)}, errors {len(errors)}',flush=True)
   (ROOT/'font-download-progress.json').write_text(json.dumps({'assets_checked':n,'errors':errors,'receipts':receipts},indent=2)+'\n')
receipts.sort(key=lambda i:(i['family'],i['page'] or 0))
(ROOT/'font-download-manifest.json').write_text(json.dumps({'base':BASE,'assets':receipts},indent=2)+'\n')
used=defaultdict(set);examples=defaultdict(dict);counts=Counter();ignored=Counter();keys=set();dupes=[]
def collect(family,page,text,ref):
 for c in text:
  if c==' ':ignored[ord(c)]+=1;continue
  cp=ord(c);used[(family,page)].add(cp);examples[(family,page)].setdefault(cp,ref)
for file in sorted(ROOT.glob('chapter-*-page-*.json')):
 data=json.loads(file.read_text())
 for verse in data['verses']:
  ref=verse['verse_key']
  if ref in keys:dupes.append(ref)
  keys.add(ref);counts['verses']+=1;collect('indopak',None,verse.get('text_indopak_nastaleeq',''),ref)
  for word in verse['words']:
   counts['source_word_items']+=1
   if word['char_type_name']=='end':collect('markers',None,word.get('text_qpc_hafs',''),ref);counts['end_markers']+=1
   else:
    text=html.unescape(word.get('code_v2',''));collect('uthmani',word['page_number'],text,ref);collect('tajweed',word['page_number'],text,ref);counts['glyph_word_items']+=1
missing=[]
for key,chars in sorted(used.items(),key=lambda t:(t[0][0],t[0][1] or 0)):
 cmap=cmaps.get(key,set())
 for cp in sorted(chars-cmap):missing.append({'family':key[0],'page':key[1],'codepoint':f'U+{cp:04X}','unicode_name':unicodedata.name(chr(cp),'unnamed'),'example_verse':examples[key][cp]})
family=[]
for name in ['uthmani','tajweed','indopak','markers']:
 assets=[r for r in receipts if r['family']==name];checks=[k for k in used if k[0]==name]
 family.append({'family':name,'assets':len(assets),'valid_assets':sum('error' not in a for a in assets),'bytes':sum(a.get('bytes',0) for a in assets),'source_character_occurrence_sets':sum(len(used[k]) for k in checks),'checked_source_pages':len(checks),'missing_codepoints':sum(m['family']==name for m in missing)})
report={'tool_versions':{'fontTools':fontTools.__version__,'Brotli':brotli.__version__,'requests':requests.__version__},'checked_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source_documentation':'https://github.com/quran/qf-api-docs/blob/main/docs/tutorials/fonts/font-rendering.md','asset_manifest':'font-download-manifest.json','font_assets_expected':len(JOBS),'downloaded_and_parsed':len(cmaps),'download_errors':errors,'corpus':dict(counts),'unique_verse_keys':len(keys),'duplicate_verse_keys':dupes,'complete_6236_verse_coverage':len(keys)==counts['verses']==6236 and not dupes,'families':family,'missing_codepoints':missing,'tajweed_colrv1_assets':sum(r.get('colr_version')==1 for r in receipts if r['family']=='tajweed'),'tajweed_assets_with_dark_palette':sum(r.get('cpal_palettes',0)>=2 for r in receipts if r['family']=='tajweed'),'limitations':['Cmap coverage confirms a non-.notdef glyph is present for source codepoints; it does not certify glyph artwork, diacritic positioning, Arabic shaping, visual correctness, tajweed rule correctness or full scholarly proofreading.','Only Tajweed font assets from the website colrv1 URL family were audited; Firefox OT-SVG fallback assets were not audited.','Only U+0020 ASCII spaces were excluded from glyph presence checks; no Arabic codepoint was excluded and source text was never altered.','No fonts or source Quran text were modified.']}
# Recheck immutable provenance before publishing a report.
manifest_path=ROOT/'response-manifest.json';manifest=json.loads(manifest_path.read_text())
assert hashlib.sha256((ROOT/'chapters.json').read_bytes()).hexdigest()==manifest['chapter_metadata_sha256']
response_count=0
for chapter in manifest['chapters']:
 for response in chapter['responses']:
  assert hashlib.sha256((ROOT/response['file']).read_bytes()).hexdigest()==response['sha256'];response_count+=1
for receipt in receipts:
 if 'error' not in receipt:assert hashlib.sha256((OUT/receipt['file']).read_bytes()).hexdigest()==receipt['sha256']
report['source_provenance']={'response_manifest_sha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'chapter_metadata_sha256':manifest['chapter_metadata_sha256'],'chapter_responses':response_count,'all_response_sha256_rechecked':True,'all_asset_sha256_rechecked':True,'download_manifest_sha256':hashlib.sha256((ROOT/'font-download-manifest.json').read_bytes()).hexdigest(),'audit_script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
report['ignored_source_characters']=[{'codepoint':f'U+{cp:04X}','unicode_name':unicodedata.name(chr(cp)),'occurrences':n} for cp,n in sorted(ignored.items())]
report['tajweed_colr_table_version_distribution']=dict(Counter(str(r.get('colr_version')) for r in receipts if r['family']=='tajweed'))
report['tajweed_palette_count_distribution']=dict(Counter(str(r.get('cpal_palettes')) for r in receipts if r['family']=='tajweed'))
report['colr_path_note']='The official URL family is named colrv1; actual COLR table versions and CPAL palette counts are recorded separately. URL naming is not a table-version claim.'
assert not errors and not missing and report['complete_6236_verse_coverage'], 'Font or source coverage review failed'
(ROOT/'font-coverage-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['downloaded_and_parsed','complete_6236_verse_coverage','corpus','families','tajweed_colrv1_assets','tajweed_assets_with_dark_palette']},indent=2),flush=True);print('Missing glyph codepoints',len(missing),'download errors',len(errors),flush=True)
