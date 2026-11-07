"""Idempotent shared navigation and interior-page heading presentation."""
from pathlib import Path
import re
from html import escape

root=Path('dist')
pages={
 '404':('404','not-found-heading'),
 'about':('About Al Furqan','about-hero'),
 'translations':('Translations','intro'),
 'listen':('Listen & recite','intro'),
 'study':('Tafsir & words','intro'),
 'adhkar':('Adhkar & duas','intro'),
 'search':('Search & study','search-intro'),
 'progress':('My Quran','progress-intro'),
 'contact':('Contact','contact-heading'),
 'prayer-times':('Prayer times','prayer-heading'),
 'topics':('Islamic topics','topic-hub-intro'),
 'hadiths':('Hadith library','hadith-library-hero'),
 'hadith-translations':('Selected hadiths','selected-intro'),
 'hadith':('Hadith library','hadith-reader-heading'),
 'hadith-book':('Hadith library','hadith-book-page-heading'),
 'reader':('Read Quran','surah-card'),
 'account':('My account','account-heading'),
 'admin':('Administration','account-heading'),
 'login':('Your Al Furqan account','auth-story'),
 'auth-callback':('Your Al Furqan account','auth-story'),
 'privacy':('Privacy Policy','legal-hero'),
 'terms':('Terms & Conditions','legal-hero'),
}
links=[('/reader.html','Read Quran'),('/topics.html','Islamic topics'),('/hadiths.html','Hadith library'),('/about.html','About')]
nav='<nav class="af-primary-navigation" aria-label="Main navigation">'+''.join('<a href="'+url+'">'+escape(label)+'</a>' for url,label in links)+'</nav>'
for p in root.rglob('*.html'):
 s=p.read_text();name=p.stem
 # Header DOM is shared, while all auth buttons and drawer IDs remain unchanged.
 if 'class="af-primary-navigation"' not in s:
  s=s.replace('<div class="af-header-actions">',nav+'<div class="af-header-actions">',1)
 if '/page-headers.css?' not in s:s=s.replace('</head>','<link rel="stylesheet" href="/page-headers.css?v=20261030-headers1"></head>')
 if '/mobile.css?' not in s:s=s.replace('</head>','<link rel="stylesheet" href="/mobile.css?v=20261031-mobile1"></head>')
 if '/page-headers.js?' not in s:s=s.replace('</head>','<script defer src="/page-headers.js?v=20261030-headers1"></script></head>')
 if name=='index':p.write_text(s);continue
 nested=p.parent.name
 if nested=='topics':label='Islamic topics';target='topic-article-heading'
 elif nested=='hadith':label='Hadith library';target='hadith-collection-heading'
 else:label,target=pages[name]
 def decorate(m):
  tags=m[1].split()
  if target not in tags:return m[0]
  if 'af-page-heading' not in tags:tags+=['af-page-heading']
  if name in ['reader','hadith','hadith-book'] or nested in ['hadith','topics']:
   if 'af-page-heading-compact' not in tags:tags+=['af-page-heading-compact']
  return 'class="'+' '.join(tags)+'"'
 s=re.sub(r'class="([^"]+)"',decorate,s)
 # Reuse existing dynamic breadcrumbs on source readers and topic articles.
 if re.search(r'class="(?:hadith|topic)-breadcrumb',s):
  s=re.sub(r'class="((?:hadith|topic)-breadcrumb[^"]*)"',lambda m:'class="'+m[1]+(' af-page-breadcrumb' if 'af-page-breadcrumb' not in m[1] else '')+'"',s)
 elif 'data-page-breadcrumb' not in s:
  crumb='<nav class="af-page-breadcrumb af-page-breadcrumb-wide" data-page-breadcrumb aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">'+escape(label)+'</span></nav>'
  s=s.replace('</dialog>','</dialog>'+crumb,1)
 p.write_text(s)

# Keep discovery metadata and the error page current after content regeneration.
import runpy
runpy.run_path('scripts/build-seo.py')
