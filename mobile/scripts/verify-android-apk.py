"""Inspect the real signed APK and compare its packaged reader to this build's source."""
import argparse, hashlib, json, os, re, subprocess, zipfile, sys
from pathlib import Path

def signing_fingerprint(report):
 # Recent SDKs label signers by signature scheme or API range rather than signer number.
 # The apksigner process must also succeed; this only parses its verified report.
 fingerprints=set(re.findall(r'^(?:Signer (?:#\d+|\([^\n]*\))|V2 Signer:) certificate SHA-256 digest: ([0-9a-fA-F]{64})$',report,re.M))
 if len(fingerprints)!=1 or 'Verified using v2 scheme (APK Signature Scheme v2): true' not in report:
  raise ValueError('Expected one verified v2 signer and its public certificate fingerprint')
 return next(iter(fingerprints)).lower()

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('apk',type=Path)
 parser.add_argument('--aapt',required=True)
 parser.add_argument('--apksigner',required=True)
 args=parser.parse_args()
 apk=args.apk.resolve();mobile=Path(__file__).resolve().parents[1]
 badging=subprocess.check_output([args.aapt,'dump','badging',str(apk)],text=True)
 package=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
 assert package and package.groups()==('online.getfurqan.app.trial','2','0.1.1-trial'), 'Wrong package/version'
 assert "sdkVersion:'24'" in badging and "targetSdkVersion:'36'" in badging
 assert "application-label:'Al Furqan Trial'" in badging
 signature=subprocess.check_output([args.apksigner,'verify','--verbose','--print-certs',str(apk)],text=True)
 try:certificate=signing_fingerprint(signature)
 except ValueError:
  print(signature,file=sys.stderr)
  raise
 manifest=json.loads((mobile/'dist/app-source-manifest.json').read_text())
 assert manifest['guestOnly'] is True and manifest['requiresNetwork'] is True
 with zipfile.ZipFile(apk) as archive:
  assert archive.testzip() is None
  names=set(archive.namelist());prefix='assets/public/'
  assert archive.read(prefix+'app-source-manifest.json')==(mobile/'dist/app-source-manifest.json').read_bytes()
  assert len(manifest['preserved'])>=13
  for name,expected in manifest['preserved'].items():
   assert hashlib.sha256(archive.read(prefix+name)).hexdigest()==expected,name
  for name in ['auth-config.js','auth-client.js','login.html','account.html','admin.html']:
   assert prefix+name not in names,name
  assert not any(name.endswith(('.jks','.keystore')) for name in names),'Signing keys must never be packaged'
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
  'preserved':manifest['preserved'],'mushaf_pages':604,'guest_only':True,'requires_network':True,
  'trial':True,'physical_device_tested':False,'updates_original_0_1_0':False,
  'signing':'ephemeral-debug-trial','production_signing_pending':True
 },indent=2))

if __name__=='__main__':
 main()
