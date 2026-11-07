from pathlib import Path
from html import escape as e
import json,re,math
r=Path('dist');home=(r/'index.html').read_text();items=json.loads(Path('content-topics.json').read_text());by={t['slug']:t for t in items};header=re.search(r'<header class="site-header">.*?</dialog>',home,re.S)[0];footer=re.search(r'<footer class="site-footer">.*?</footer>',home,re.S)[0]
navitem='<a href="/topics.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg><span>Islamic topics<small>Faith, worship and everyday life</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>'
def addnav(s):
 if 'href="/topics.html"' not in s:
  s=s.replace('<nav id="site-navigation" aria-label="Main navigation">','<nav id="site-navigation" aria-label="Main navigation">'+navitem)
  s=s.replace('<a href="/about.html">About Al Furqan</a></nav>','<a href="/topics.html">Islamic topics</a><a href="/about.html">About Al Furqan</a></nav>')
 return s
header=addnav(header);footer=footer if 'href="/topics.html"' in footer else footer.replace('<a href="/about.html">About Al Furqan</a></nav>','<a href="/topics.html">Islamic topics</a><a href="/about.html">About Al Furqan</a></nav>')
for p in r.rglob('*.html'):p.write_text(addnav(p.read_text()))
boot='<script defer src="/vendor/supabase-2.118.0.js"></script><script defer src="/auth-config.js"></script><script defer src="/auth-client.js"></script><script defer src="/site-language.js?v=20261107-topics2"></script><script defer src="/navigation.js?v=20261029-site-language1"></script>'
def page(path,title,description,body,script=''):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(f'<!doctype html><html lang="en"><head><script src="/theme.js?v=20261029-theme1"></script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{e(description)}"><title>{e(title)} · Al Furqan</title><link rel="icon" href="/favicon.ico?v=2" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2"><link rel="stylesheet" href="/topics.css?v=20261107-topics2"><link rel="stylesheet" href="/footer.css?v=20261029-footer2"><link rel="stylesheet" href="/branding.css"><link rel="stylesheet" href="/navigation.css?v=20261029-theme1"><link rel="stylesheet" href="/site-language.css?v=20261029-site-language1">{boot}{script}<link rel="stylesheet" href="/theme.css?v=20261029-theme1"></head><body id="top">{header}{body}{footer}</body></html>')
def card(t):
 number=items.index(t)+1
 return f'<a class="topic-card" href="/topics/{t["slug"]}.html" data-topic-card data-topic-slug="{t["slug"]}" data-category="{e(t["category"])}"><div class="topic-card-top"><span class="topic-number">{number:02}</span><span class="topic-arabic" lang="ar" dir="rtl">{t["arabic"]}</span></div><span class="topic-category">{e(t["category"])}</span><h3>{e(t["title"])}</h3><p>{e(t["intro"])}</p><span class="topic-card-action">Explore topic <span aria-hidden="true">↗</span></span></a>'
categories=list(dict.fromkeys(t['category'] for t in items))
filters=''.join(f'<button type="button" data-topic-filter="{x}" aria-pressed="{str(x=="All topics").lower()}">{x}</button>' for x in ['All topics',*categories])
page(r/'topics.html','Islamic topics','Explore 18 referenced guides to faith, worship, family, character and everyday life, with related Quran passages and practical learning prompts.',f'''<main class="topic-shell"><section class="topic-hub-intro"><div><span class="topic-eyebrow">LEARN · REFLECT · LIVE</span><h1>Knowledge for<br><em>everyday life.</em></h1><p>Explore the foundations of faith and the qualities that shape a Muslim’s day. Choose a topic, read its introduction, and follow the references into the Quran.</p></div><div class="topic-intro-seal" aria-hidden="true"><span lang="ar" dir="rtl">عِلْم</span><small>A LITTLE LEARNING,<br>A LASTING DIRECTION.</small></div></section><section aria-labelledby="browse-topics"><div class="topic-browse-heading"><div><span class="topic-eyebrow">ISLAMIC TOPICS</span><h2 id="browse-topics">Where would you like to begin?</h2></div><label class="topic-search">Find a topic<input type="search" id="topic-query" placeholder="Try prayer, kindness, hope…" maxlength="120"></label></div><div class="topic-filters" aria-label="Topic categories">{filters}</div><p class="topic-result-count" id="topic-count" aria-live="polite">8 topics to explore</p><div class="topic-grid">{''.join(card(t) for t in items)}</div><p class="topic-empty" id="topic-empty" hidden>No topics match. Try another word or choose All topics.</p></section><aside class="topic-method"><span class="topic-eyebrow">READ WITH CONTEXT</span><h2>A starting point for learning.</h2><p>These are short editorial introductions based on the references shown in each article. They are separate from Quran translations and published tafsir. Open the passages in the reader to study their context and named translations.</p><a href="/study.html">Continue with published tafsir →</a></aside></main>''','<script defer src="/topics.js?v=20261107-topics2"></script>')
for t in items:
 sections=''
 for i,(title,text) in enumerate(t['sections'],1):
  refs=t.get('section_refs',[[] for _ in t['sections']])[i-1]
  citations='<nav class="topic-section-references" aria-label="Related verses">'+''.join(f'<a href="/reader.html?verse={ref}">Quran {ref}</a>' for ref in refs)+'</nav>' if refs else ''
  sections+=f'<section id="section-{i}"><h2>{e(title)}</h2><p>{e(text)}</p>{citations}</section>'
 toc=''.join(f'<a href="#section-{i}">{e(title)}</a>' for i,(title,_) in enumerate(t['sections'],1))
 refhtml=''.join(f'<li><a href="/reader.html?verse={ref}"><span>Quran {ref}</span><small>{e(label)}</small><span aria-hidden="true">↗</span></a></li>' for ref,label in t['refs'])
 hadith=''
 if t.get('hadith'):
  name,url,summary=t['hadith'];attrs='target="_blank" rel="noopener"' if not url.startswith('/') else '';hadith=f'<li><a href="{url}" {attrs}><span>{name}</span><small>{e(summary)}</small><span aria-hidden="true">↗</span></a></li>'
 related=''.join(card(by[s]) for s in t['related'])
 body=f'''<main class="topic-shell"><nav class="topic-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/topics.html">Islamic topics</a><span aria-hidden="true">/</span><span aria-current="page">{e(t['title'])}</span></nav><div class="topic-article-heading"><span class="topic-eyebrow">{e(t['category']).upper()} · AN INTRODUCTION</span><h1>{e(t['title'])}</h1><p>{e(t['lead'])}</p><div class="topic-article-meta"><span>3 minute read</span><span>Quran references included</span></div></div><div class="topic-article-layout"><aside class="topic-toc"><span class="topic-eyebrow">IN THIS TOPIC</span>{toc}<a href="#topic-sources">References & further reading</a><a class="topic-back" href="/topics.html">← All topics</a></aside><article class="topic-article">{sections}<section class="topic-takeaways"><span class="topic-eyebrow">TO CARRY WITH YOU</span><h2>A few things to remember.</h2><ul>{''.join('<li>'+e(x)+'</li>' for x in t['takeaways'])}</ul><a class="topic-primary" href="{t['tool'][0]}">{e(t['tool'][1])} <span aria-hidden="true">→</span></a></section><section class="topic-sources" id="topic-sources"><span class="topic-eyebrow">REFERENCES & FURTHER READING</span><h2>Return to the sources.</h2><p>Quran references open inside Al Furqan, where you can choose your translation. Hadith references, where listed, open inside Al Furqan with their source details.</p><ul>{refhtml}{hadith}</ul><p class="topic-editorial-note">This is an editorial introduction, not a verse translation, scholarly tafsir or a personal religious ruling.</p></section></article></div><section class="topic-related"><div class="topic-section-heading"><div><span class="topic-eyebrow">KEEP EXPLORING</span><h2>Continue your learning.</h2></div><a href="/topics.html">All topics →</a></div><div class="topic-grid">{related}</div></section></main>'''
 page(r/'topics'/f'{t["slug"]}.html',t['title'],t['intro'],body)
# Keep topic counts, reading estimates and search data tied to the content.
for path in [r/'topics.html',*(r/'topics').glob('*.html')]:
 source=path.read_text()
 source=source.replace('8 topics to explore',f'{len(items)} topics to explore')
 if path.parent.name=='topics':
  t=by[path.stem];words=sum(len(text.split()) for _,text in t['sections'])+len(t['lead'].split())
  source=source.replace('3 minute read',f'{max(3,math.ceil(words/160))} minute read')
 source=source.replace('Try prayer, kindness, hope…','Search by topic, question or keyword')
 path.write_text(source)
search_index=[{'slug':t['slug'],'texts':[t['title'],t['intro'],t['lead'],*[part for section in t['sections'] for part in section],*t['takeaways'],*[label for _,label in t['refs']]]} for t in items]
(r/'content/topics-index.json').write_text(json.dumps(search_index,ensure_ascii=False,separators=(',',':'))+'\n')
# A compact topic introduction on the home page.
home=(r/'index.html').read_text()
section=f'''<section class="home-topics" id="islamic-topics" aria-labelledby="home-topics-title"><div class="shell"><div class="topic-section-heading"><div><span class="topic-eyebrow">ISLAMIC TOPICS</span><h2 id="home-topics-title">Learning that stays with you.</h2><p>Faith, worship and the way we live. Explore a topic, one thoughtful step at a time.</p></div><a class="topic-outline" href="/topics.html">Explore all 8 topics <span aria-hidden="true">→</span></a></div><div class="topic-grid">{''.join(card(by[s]) for s in ['faith','prayer','dhikr','character'])}</div></div></section>'''
if 'id="islamic-topics"' not in home:home=home.replace('    <section class="about"',section+'\n    <section class="about"')
if '/topics.css' not in home:home=home.replace('<link rel="stylesheet" href="/theme.css?v=20261029-theme1"></head>','<link rel="stylesheet" href="/topics.css?v=20261107-topics2"><script type="module" src="/weekly.js"></script><link rel="stylesheet" href="/theme.css?v=20261029-theme1"></head>')
home=re.sub(r'Explore all \d+ topics',f'Explore all {len(items)} topics',home)
(r/'index.html').write_text(home)

# Retain shared page headers after regenerating content.
import runpy
runpy.run_path('scripts/build-page-headers.py')
