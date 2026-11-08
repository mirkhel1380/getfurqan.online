"""Cross-check published APK provenance, the homepage link, and the decoded QR target."""
import argparse,hashlib,json,re
from html.parser import HTMLParser
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('--android-qr-png',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];data=json.loads((root/'docs/app-downloads.json').read_text());apk=data['android']
assert re.fullmatch(r'\d+\.\d+\.\d+',apk['version'])
expected=f"https://github.com/mirkhel1380/getfurqan.online/releases/download/android-v{apk['version']}/Al-Furqan-Android-{apk['version']}.apk"
assert apk['url']==expected and apk['trial'] is True
assert re.fullmatch('[0-9a-f]{64}',apk['sha256']) and re.fullmatch('[0-9a-f]{40}',apk['sourceCommit'])
assert apk['bytes']>1_000_000 and apk['sourceWorkflowRun']>0
assert apk['package']=='online.getfurqan.app.trial' and apk['installsAlongsideOriginal'] is True
class Links(HTMLParser):
 def __init__(self):super().__init__();self.downloads=[];self.qrs=[];self.notes=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='a' and 'app-download-button' in a.get('class','').split():self.downloads.append(a.get('href'))
  if tag=='img' and 'app-download-qr' in a.get('class','').split():self.qrs.append(a.get('src'))
  if 'data-app-trial-note'in a:self.notes+=1;assert 'data-i18n-ignore'in a
html=(root/'dist/index.html').read_text();links=Links();links.feed(html)
assert links.downloads==[expected] and links.notes==1
assert any(s.startswith('/download-android-qr.svg?')for s in links.qrs)
assert f"v{apk['version']} · {apk['bytes']/1_000_000:.1f} MB · Android 7+" in html
assert data['iphone']['nativeIpaDownload'] is False and 'id="install-iphone"'in html
report=json.loads((root/'docs/android-0.1.1-verification.json').read_text())
assert report['sha256']==apk['sha256'] and report['source_commit']==apk['sourceCommit']
assert report['bytes']==apk['bytes'] and report['mushaf_pages']==604
if args.android_qr_png:
 import zxingcpp
 from PIL import Image
 result=zxingcpp.read_barcode(Image.open(args.android_qr_png))
 assert result and result.text==expected,'QR code must decode to the verified APK URL'
 print('Decoded Android QR matches the verified release URL.')
print('PASS: APK release/source/checksum, version/size, homepage button, migration note and retained iPhone web-app route.')
