"""Verify the downloaded CI archive, its nested iOS builds and source files."""
import argparse,hashlib,io,json,plistlib,zipfile
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('artifact',type=Path);p.add_argument('--sha256',required=True);p.add_argument('--source',required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
raw=args.artifact.read_bytes();assert hashlib.sha256(raw).hexdigest()==args.sha256,'Artifact transfer hash mismatch'
allowed={'Al-Furqan-iOS-simulator.zip','Al-Furqan-iOS-unsigned-archive.zip','simulator-verification.json','device-verification.json','ios-build.json','SHA256SUMS.txt','READ-ME-FIRST.md'}
with zipfile.ZipFile(io.BytesIO(raw))as archive:
 assert archive.testzip()is None
 assert set(archive.namelist())==allowed,'Unexpected artifact entries'
 files={name:archive.read(name)for name in allowed}
metadata=json.loads(files['ios-build.json']);assert metadata['source_commit']==args.source
assert metadata['version']=='0.1.1'and metadata['build']==2 and metadata['minimum_ios']=='16.4'
assert metadata['signed_for_distribution']is False and metadata['installable_ipa']is False
for platform,name,prefix in [('simulator','Al-Furqan-iOS-simulator.zip','App.app/'),('device','Al-Furqan-iOS-unsigned-archive.zip','Al-Furqan-unsigned.xcarchive/Products/Applications/App.app/')]:
 record=metadata['files'][name];assert len(files[name])==record['bytes'];assert hashlib.sha256(files[name]).hexdigest()==record['sha256']
 report=json.loads(files[platform+'-verification.json'])
 assert report['source_commit']==args.source and report['source_workflow_run']==metadata['source_workflow_run']
 assert report['version']=='0.1.1'and report['build']=='2'and report['minimum_ios']=='16.4'
 assert report['signed_for_distribution']is False and report['mushaf_pages']==604
 assert set(report['architectures'].split())==({'arm64','x86_64'}if platform=='simulator'else{'arm64'})
 with zipfile.ZipFile(io.BytesIO(files[name]))as inner:
  assert inner.testzip()is None
  assert not any(n.endswith(('.p12','.p8','.mobileprovision'))for n in inner.namelist())
  info=plistlib.loads(inner.read(prefix+'Info.plist'))
  assert info['CFBundleIdentifier']=='online.getfurqan.app'and info['CFBundleShortVersionString']=='0.1.1'and info['CFBundleVersion']=='2'
  assert info['MinimumOSVersion']=='16.4'
  assert hashlib.sha256(inner.read(prefix+info['CFBundleExecutable'])).hexdigest()==report['executable_sha256']
  manifest=json.loads(inner.read(prefix+'public/app-source-manifest.json'))
  assert manifest['preserved']==report['preserved']and len(report['preserved'])==13
  for filename,digest in report['preserved'].items():assert hashlib.sha256(inner.read(prefix+'public/'+filename)).hexdigest()==digest,filename
  index=json.loads(inner.read(prefix+'public/content/mushaf-pages.json'))
  assert len(index['pages'])==604 and sum(page['verse_count']for page in index['pages'])==6236
args.output.mkdir(parents=True,exist_ok=True)
for name,data in files.items():(args.output/name).write_bytes(data)
print('PASS: downloaded archive checksum; real simulator/device version, OS and executable; both architecture sets; 13 unchanged reading files; all 604 pages.')
print(json.dumps(metadata,indent=2))
