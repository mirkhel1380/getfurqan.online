"""Check discoverability, exclusions, metadata consistency and unchanged reading content."""
from pathlib import Path
from html.parser import HTMLParser
import json, re, subprocess, hashlib
import xml.etree.ElementTree as ET
from PIL import Image

root=Path('dist');base='https://getfurqan.online'
private={'account.html','admin.html','auth-callback.html','login.html','progress.html','search.html','hadith.html','hadith-book.html','404.html'}
dynamic={'reader.html','study.html','hadith.html','hadith-book.html'}
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls=[x.text for x in ET.parse(root/'sitemap.xml').findall('s:url/s:loc',ns)]
expected={base+('/' if p.name=='index.html' else '/'+p.relative_to(root).as_posix()) for p in root.rglob('*.html') if p.relative_to(root).as_posix() not in private}
assert len(urls)==len(set(urls))==32
assert set(urls)==expected
assert all('?' not in url and '#' not in url for url in urls)
assert (root/'robots.txt').read_text()=='User-agent: *\nAllow: /\n\nSitemap: '+base+'/sitemap.xml\n'
assert Image.open(root/'og-image.png').size==(1200,630)

class Head(HTMLParser):
 def __init__(self):super().__init__();self.meta=[];self.canon=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta':self.meta.append(a)
  if tag=='link' and a.get('rel')=='canonical':self.canon.append(a.get('href'))

for p in root.rglob('*.html'):
 name=p.relative_to(root).as_posix();s=p.read_text();head=Head();head.feed(s.split('</head>')[0])
 find=lambda key:[m['content'] for m in head.meta if m.get('name',m.get('property'))==key]
 for key in ['description','robots','og:title','og:description','og:url','og:image','twitter:card','twitter:image']:
  assert len(find(key))==1 and find(key)[0],(name,key)
 assert ('noindex' in find('robots')[0])==(name in private),name
 assert find('og:image')==[base+'/og-image.png']
 assert len(head.canon)==(0 if name in dynamic else 1),name
 if name not in private:
  data=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)[1]);assert data['@context']=='https://schema.org'
  types={x['@type'] for x in data['@graph']};assert {'WebSite','WebPage','Organization'}<=types
  assert not any(x in s for x in ['aggregateRating','reviewCount','ratingValue'])
 if name not in {'404.html','hadiths.html','hadith-translations.html'}:
  before=subprocess.check_output(['git','show','HEAD:dist/'+name],text=True)
  main=lambda value:re.search(r'<main\b.*?</main>',value,re.S)[0]
  prior,current=main(before),main(s)
  if name in {'reader.html','translations.html'}:
   # Only owned source-review status changed; keep the remaining controls,
   # references and content exact against the previously published page.
   old_reader='Development preview: independent comparison and review by a qualified Quran proofreader remain pending. Bookmarks and preferences are stored on this browser, without an account.'
   old_translations='The display and language choices have been tested. Full independent comparison and review by a qualified Quran proofreader remain pending. Arabic text and fonts are provided by Quran.Foundation.'
   updated='Technical checks cover all 6,236 verses. Differences between published editions are recorded for qualified review. Source text is unchanged; full scholarly proofreading is still pending.'
   prior=prior.replace('<p>'+old_reader+'</p>','<p>'+updated+'</p><p>Guest reading stays in this browser. Private account sync is optional.</p>').replace(old_translations,updated)
  assert prior==current,(name,'page/source content changed')
assert not subprocess.check_output(['git','diff','--','dist/content','dist/editions.js','dist/adhkar-data.js'])
state=lambda:{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
before=state();subprocess.run(['python','scripts/build-seo.py'],check=True,stdout=subprocess.DEVNULL);assert before==state(),'SEO builder must be idempotent'
print('PASS: 32 public URLs, 41 consistent page metadata sets, private/search exclusions, social image, JSON-LD, source preservation and idempotent generation.')
