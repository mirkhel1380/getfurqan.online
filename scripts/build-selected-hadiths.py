"""Build the separate, versioned HadeethEnc selections reader and library entry."""
from pathlib import Path
import re
r=Path('dist');base=(r/'hadiths.html').read_text()
header=re.search(r'<header class="site-header">.*?</dialog>',base,re.S)[0]
footer=re.search(r'<footer class="site-footer">.*?</footer>',base,re.S)[0]
head=base.split('<body')[0]
head=re.sub(r'<!-- af-seo:start -->.*?<!-- af-seo:end -->','',head,flags=re.S)
head=re.sub(r'<script type="module" src="/hadith.js[^>]*></script>','',head)
head=re.sub(r'<title>.*?</title>','<title>Selected hadiths · Al Furqan</title>',head)
head=head.replace('</head>','<meta name="description" content="Read selected HadeethEnc reports with published translations and explanations in 13 languages, including distinct Dari and Pashto editions."><link rel="stylesheet" href="/hadeethenc.css?v=20261107-selected1"><script type="module" src="/hadeethenc.js?v=20261107-selected1"></script></head>')
main='''<main class="hadith-shell"><section class="selected-intro"><span class="hadith-eyebrow">HadeethEnc.com</span><h1>Selected hadiths</h1><p>Read published hadith translations and explanations in 13 languages.</p><p class="hadith-search-note">These selections have their own HadeethEnc identifiers; numbering differs from the collection library.</p><a href="/hadiths.html">Hadith library</a></section>
<p id="selected-status" class="hadith-status" role="status">Loading the published report…</p><button id="selected-retry" class="hadith-secondary" type="button" hidden>Try again</button>
<div class="selected-layout"><aside class="selected-sidebar"><h2>Browse selected hadiths</h2><nav class="selected-list" id="selected-list" data-i18n-ignore aria-label="HadeethEnc"></nav></aside><div class="selected-main"><div class="selected-tools"><label>Text edition<select id="selected-language" data-i18n-ignore></select></label><button class="hadith-secondary" id="selected-copy" type="button">Copy reference</button></div><p class="hadith-status" role="status" id="selected-copy-status" hidden></p>
<article id="selected-content" hidden><div class="selected-source-credit"><span id="selected-id" data-i18n-ignore></span><span data-i18n-ignore>HadeethEnc.com · <span id="selected-version"></span></span></div><h2 class="selected-heading" id="selected-title" data-i18n-ignore></h2>
<div class="hadith-text-card"><div class="selected-pair"><section class="selected-arabic-panel"><h3 class="hadith-text-label">ARABIC TEXT</h3><p id="selected-arabic" class="selected-source-prose" lang="ar" dir="rtl" data-i18n-ignore></p><p id="selected-arabic-grade" class="selected-reference" lang="ar" dir="rtl" data-i18n-ignore></p><p id="selected-arabic-reference" class="selected-reference" lang="ar" dir="rtl" data-i18n-ignore></p></section>
<section class="selected-translation-panel"><h3 class="hadith-text-label">PUBLISHED TRANSLATION</h3><p id="selected-text" class="selected-source-prose" data-i18n-ignore></p><p id="selected-grade" class="selected-reference" data-i18n-ignore></p><p id="selected-reference" class="selected-reference" data-i18n-ignore></p></section></div>
<section class="selected-explanation"><h3>Explanation</h3><div id="selected-explanation" class="selected-source-prose" data-i18n-ignore></div></section><section class="selected-explanation" id="selected-benefits-block"><h3>Publisher notes</h3><div id="selected-benefits" class="selected-source-prose" data-i18n-ignore></div></section>
<details class="selected-explanation"><summary>ARABIC TEXT</summary><div id="selected-arabic-explanation" class="selected-source-prose" lang="ar" dir="rtl" data-i18n-ignore></div><div id="selected-arabic-benefits" class="selected-source-prose" lang="ar" dir="rtl" data-i18n-ignore></div></details></div>
<details class="hadith-source-details"><summary>Source version information</summary><pre id="selected-notice" class="selected-notice" data-i18n-ignore></pre><div class="selected-source-links"><a id="selected-source-link" target="_blank" rel="noopener">HadeethEnc.com ↗</a><a id="selected-update-link" target="_blank" rel="noopener">Source updates ↗</a><a href="/hadeethenc-terms.txt">Edition and source information</a></div></details>
<nav class="hadith-reader-pagination" aria-label="HadeethEnc"><a class="hadith-secondary" id="selected-previous">← Previous hadith</a><a class="hadith-secondary" id="selected-next">Next hadith →</a></nav></article></div></div></main>'''
(r/'hadith-translations.html').write_text(head+'<body id="top">'+header+main+footer+'</body></html>')
promo='''<!-- af-selected-hadiths:start --><section class="selected-library-promo"><span class="hadith-eyebrow">HadeethEnc.com</span><h2>Selected hadiths</h2><p>Read published hadith translations and explanations in 13 languages.</p><a class="hadith-primary" href="/hadith-translations.html">Browse selected hadiths</a></section><!-- af-selected-hadiths:end -->'''
base=re.sub(r'<!-- af-selected-hadiths:start -->.*?<!-- af-selected-hadiths:end -->','',base,flags=re.S)
base=base.replace('<form class="hadith-jump"',promo+'<form class="hadith-jump"',1)
if '/hadeethenc.css?' not in base:base=base.replace('</head>','<link rel="stylesheet" href="/hadeethenc.css?v=20261107-selected1"></head>')
(r/'hadiths.html').write_text(base)
print('Built separate selected-hadith reader and library entry.')
