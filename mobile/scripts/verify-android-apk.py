"""Inspect the real signed APK and compare its packaged reader to this build's source."""
import argparse, hashlib, json, os, re, subprocess, zipfile, sys
from pathlib import Path
from android_signing import identity

def signing_fingerprint(report):
 # Recent SDKs label signers by signature scheme or API range rather than signer number.
 # The apksigner process must also succeed; this only parses its verified report.
 fingerprints=set(re.findall(r'^(?:Signer (?:#\d+|\([^\n]*\))|V(?:2|3\.0) Signer:) certificate SHA-256 digest: ([0-9a-fA-F]{64})$',report,re.M))
 counts=set(re.findall(r'^Number of signers: (\d+)$',report,re.M))
 if len(fingerprints)!=1 or (counts and counts!={'1'}) or 'Verified using v2 scheme (APK Signature Scheme v2): true' not in report:
  raise ValueError('Expected one verified v2 signer and its public certificate fingerprint')
 return next(iter(fingerprints)).lower()

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('apk',type=Path)
 parser.add_argument('--aapt',required=True)
 parser.add_argument('--apksigner',required=True)
 parser.add_argument('--variant',choices=['trial','stable'],default='trial')
 args=parser.parse_args()
 apk=args.apk.resolve();mobile=Path(__file__).resolve().parents[1]
 badging=subprocess.check_output([args.aapt,'dump','badging',str(apk)],text=True)
 package=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
 stable=args.variant=='stable'
 owner=identity() if stable else None
 expected_package=owner['package'] if stable else 'online.getfurqan.app.trial'
 version=json.loads((mobile/'package.json').read_text())['version']
 code=re.search(r'versionCode\s+(\d+)',(mobile/'android/app/build.gradle').read_text())[1]
 assert package and package.groups()==(expected_package,code,version+('' if stable else '-trial')), 'Wrong package/version'
 assert "sdkVersion:'24'" in badging and "targetSdkVersion:'36'" in badging
 assert ("application-label:'Al Furqan'" if stable else "application-label:'Al Furqan Trial'") in badging
 signature=subprocess.check_output([args.apksigner,'verify','--verbose','--print-certs',str(apk)],text=True)
 try:certificate=signing_fingerprint(signature)
 except ValueError:
  print(signature,file=sys.stderr)
  raise
 if stable:
  assert certificate==owner['certificate_sha256'],'Wrong stable signing certificate'
  assert not re.search(r'android:debuggable[^\n]*=\(type 0x12\)0xffffffff',subprocess.check_output([args.aapt,'dump','xmltree',str(apk),'AndroidManifest.xml'],text=True)),'Stable app must not be debuggable'
 manifest=json.loads((mobile/'dist/app-source-manifest.json').read_text())
 assert manifest['nativeBackgroundAudio'] is True
 assert manifest['guestReadingBackup'] is True
 assert manifest['guestOnly'] is False and manifest['optionalAccount'] is True and manifest['requiresNetwork'] is True
 with zipfile.ZipFile(apk) as archive:
  assert archive.testzip() is None
  names=set(archive.namelist());prefix='assets/public/'
  assert archive.read(prefix+'app-source-manifest.json')==(mobile/'dist/app-source-manifest.json').read_bytes()
  assert len(manifest['preserved'])>=13
  for name,expected in manifest['preserved'].items():
   assert hashlib.sha256(archive.read(prefix+name)).hexdigest()==expected,name
  for name in ['admin.html','auth-callback.html','login.js']:
   assert prefix+name not in names,name
  for name in ['auth-config.js','auth-client.js','login.html','account.html','app-account.js','vendor/supabase-2.118.0.js','downloads.html','app-downloads-offline.js','native-audio.js','backup.html','app-backup.js']:
   assert archive.read(prefix+name)==(mobile/'dist'/name).read_bytes(),name
  assert any(n.endswith('classes.dex') for n in names)
  dex=b''.join(archive.read(n) for n in names if re.fullmatch(r'classes\d*\.dex',n))
  assert b'FurqanAudioPlugin' in dex and b'RecitationService' in dex
  manifest_dump=subprocess.check_output([args.aapt,'dump','xmltree',str(apk),'AndroidManifest.xml'],text=True)
  assert 'RecitationService' in manifest_dump and 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' in manifest_dump
  assert not any(name.endswith(('.jks','.keystore','.p12')) or 'keystore-base64' in name for name in names),'Signing keys must never be packaged'
  reader=archive.read(prefix+'reader.html').decode()
  assert 'data-view="mushaf"' in reader and 'mushaf-pages' in reader
  index=json.loads(archive.read(prefix+'content/mushaf-pages.json'))
  assert index['layout']=='qcf-v2-604' and len(index['pages'])==604
  assert sum(p['verse_count']for p in index['pages'])==6236
 commit=os.environ.get('GITHUB_SHA','')
 assert re.fullmatch(r'[0-9a-f]{40}',commit),'Exact build source commit is required'
 print(json.dumps({
  'apk':apk.name,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,
  'package':package[1],'version_code':int(package[2]),'version_name':package[3],
  'minimum_android':24,'target_sdk':36,'certificate_sha256':certificate,
  'source_commit':commit,'source_workflow_run':int(os.environ['GITHUB_RUN_ID']),
  'preserved':manifest['preserved'],'mushaf_pages':604,'native_background_audio':True,'guest_only':False,'optional_account':True,'requires_network':True,
  'trial':not stable,'physical_device_tested':False,'updates_original_0_1_0':False,'updates_trial_0_1_1':False,
  'signing':'pinned-owner-key' if stable else 'ephemeral-debug-trial','production_signing_pending':not stable
 },indent=2))

if __name__=='__main__':
 main()
