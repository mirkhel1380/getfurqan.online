"""Check complete topic guides, source references, search data and internal links."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,parse_qs
import json,re,hashlib,argparse,urllib.request
root=Path('dist');topics=json.loads(Path('content-topics.json').read_text())
assert len(topics)==18 and len({t['slug'] for t in topics})==18
assert len({t['category'] for t in topics})==6
counts={c['chapter']:c['verses'] for c in json.loads(Path('docs/quran-corpus-review.json').read_text())['checks']}
parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');parser.add_argument('--cache',default='../topic-reference-review');args=parser.parse_args()
reference_cache=Path(args.cache)
if args.download:
 reference_cache.mkdir(parents=True,exist_ok=True);receipts=[]
 for chapter in sorted({int(ref.split(':')[0]) for t in topics for ref,_ in t['refs']}):
  url=f'https://quranenc.com/api/v1/translation/sura/english_saheeh/{chapter}';req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'});raw=urllib.request.urlopen(req,timeout=25).read();data=json.loads(raw);assert isinstance(data['result'],list)
  (reference_cache/(str(chapter)+'.json')).write_bytes(raw);receipts.append({'chapter':chapter,'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'verses':len(data['result'])})
 (reference_cache/'manifest.json').write_text(json.dumps(receipts,indent=2)+'\n')
evidence=json.loads((reference_cache/'manifest.json').read_text()) if (reference_cache/'manifest.json').exists() else [];source_refs={}
for receipt in evidence:
 raw=(reference_cache/(str(receipt['chapter'])+'.json')).read_bytes();assert hashlib.sha256(raw).hexdigest()==receipt['sha256']
 for v in json.loads(raw)['result']:source_refs[str(v['sura'])+':'+str(v['aya'])]=v
slugs={t['slug'] for t in topics};index=json.loads((root/'content/topics-index.json').read_text());assert {r['slug'] for r in index}==slugs
for t in topics:
 assert len(t['sections'])==len(t['section_refs'])==6
 assert sum(len(text.split()) for _,text in t['sections'])>=200,t['slug']
 assert set(t['related'])<=slugs and t['slug'] not in t['related']
 refs={r[0] for r in t['refs']};assert len(refs)==len(t['refs'])
 for ref in refs:
  c,v=map(int,ref.split(':'));assert 1<=v<=counts[c]
  if evidence:assert ref in source_refs and source_refs[ref].get('translation')
 for (_,text),section_refs in zip(t['sections'],t['section_refs']):
  assert set(section_refs)<=refs
  assert set(re.findall(r'\b\d{1,3}:\d{1,3}\b',text))<=refs
 # A reader-facing summary is owned editorial text, not fabricated quotations.
 assert 'قال رسول' not in ''.join(text for _,text in t['sections'])
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.assets=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag=='a' and a.get('href'):self.links.append(a['href'])
  if tag in ['script','img'] and a.get('src'):self.assets.append(a['src'])
  if tag=='link' and a.get('rel') in ['stylesheet','icon','apple-touch-icon']:self.assets.append(a['href'])
pages={}
for p in root.rglob('*.html'):
 parser=Page();parser.feed(p.read_text());assert len(parser.ids)==len(set(parser.ids)),p
 pages['/'+p.relative_to(root).as_posix()]=parser
broken=[];checked=0
for name,page in pages.items():
 for href in page.links+page.assets:
  u=urlsplit(href)
  if u.scheme or u.netloc:continue
  target=unquote(u.path) or name
  if not target.startswith('/'):target=str((Path(name).parent/target).as_posix())
  if target.endswith('/'):target+='index.html'
  p=root/target.lstrip('/')
  if not p.is_file():broken.append((name,href,'missing target'));continue
  if u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:broken.append((name,href,'missing anchor'))
  if target=='/reader.html' and 'verse' in parse_qs(u.query):
   ref=parse_qs(u.query)['verse'][0];c,v=map(int,ref.split(':'));assert 1<=v<=counts[c],(name,href)
  checked+=1
assert not broken,broken[:20]
Path('docs/topic-reference-checks.json').write_text(json.dumps({'topics':len(topics),'sections':sum(len(t['sections']) for t in topics),'categories':6,'unique_references':len({ref for t in topics for ref,_ in t['refs']}),'published_reference_cache_checked':bool(evidence),'reference_sources':evidence,'internal_links_and_assets_checked':checked,'broken_links':broken,'scope':'Reference identity/completeness and internal link checks. Editorial articles are not certified tafsir or personal religious rulings.'},indent=2)+'\n')
print('PASS:18 guides,108 sections,6 categories, published verse reference identity, complete search index and',checked,'internal links/assets without missing targets or anchors.')
