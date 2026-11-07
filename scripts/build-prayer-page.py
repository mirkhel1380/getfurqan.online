from pathlib import Path
import re,html,json
r=Path('dist');home=(r/'index.html').read_text();header=re.search(r'<header class="site-header">.*?</dialog>',home,re.S)[0];footer=re.search(r'<footer class="site-footer">.*?</footer>',home,re.S)[0]
# Public-domain IANA names provide a useful no-JavaScript baseline; live names use Intl.DisplayNames.
rows=json.loads(Path('content-countries.json').read_text())['countries']
options=''.join('<option value="'+code+'"'+(' selected' if code=='AF' else '')+'>'+html.escape(name)+'</option>' for code,name in rows)
body=Path('scripts/templates/prayer-page.fragment').read_text().replace('__COUNTRIES__',options)
head='''<!doctype html><html lang="en"><head><script src="/theme.js?v=20261029-theme1"></script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="description" content="Prayer times by country and city. See daily times and a complete annual calendar with calculation methods, local time zones and CSV download."><title>Prayer times · Al Furqan</title><link rel="icon" href="/favicon.ico?v=2" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2"><link rel="stylesheet" href="/prayer-times.css?v=20261029-prayer1"><link rel="stylesheet" href="/branding.css"><link rel="stylesheet" href="/navigation.css?v=20261029-theme1"><link rel="stylesheet" href="/footer.css?v=20261029-footer2"><link rel="stylesheet" href="/site-language.css?v=20261029-site-language1"><link rel="stylesheet" href="/theme.css?v=20261029-theme1"><script defer src="/vendor/supabase-2.118.0.js"></script><script defer src="/auth-config.js?v=20261029-auth3"></script><script defer src="/auth-client.js?v=20261029-auth2"></script><script defer src="/site-language.js?v=20261107-corpus1"></script><script defer src="/navigation.js?v=20261029-site-language1"></script><script type="module" src="/prayer-times.js?v=20261029-prayer1"></script></head><body id="top">'''
(r/'prayer-times.html').write_text(head+header+body+footer+'</body></html>')

# Retain shared page headers after regenerating content.
import runpy
runpy.run_path('scripts/build-page-headers.py')
