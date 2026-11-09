"""Inspect the distinct release package before giving a protected signer an artifact."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import zipfile
from android_signing import identity

parser=argparse.ArgumentParser()
parser.add_argument('apk',type=Path)
parser.add_argument('--aapt',required=True)
parser.add_argument('--apksigner',required=True)
args=parser.parse_args()
mobile=Path(__file__).resolve().parents[1]
data=identity(configured=False)
version=json.loads((mobile/'package.json').read_text())['version']
code=re.search(r'versionCode\s+(\d+)',(mobile/'android/app/build.gradle').read_text())[1]
badging=subprocess.check_output([args.aapt,'dump','badging',str(args.apk)],text=True)
package=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
assert package and package.groups()==(data['package'],code,version)
assert "application-label:'Al Furqan'" in badging
manifest=subprocess.check_output([args.aapt,'dump','xmltree',str(args.apk),'AndroidManifest.xml'],text=True)
assert not re.search(r'android:debuggable[^\n]*=\(type 0x12\)0xffffffff',manifest),'Release is debuggable'
assert subprocess.run([args.apksigner,'verify',str(args.apk)],capture_output=True).returncode!=0,'Expected an unsigned release'
with zipfile.ZipFile(args.apk) as z:
 assert z.testzip() is None
 assert z.read('assets/public/app-source-manifest.json')==(mobile/'dist/app-source-manifest.json').read_bytes()
print('PASS: unsigned stable package is separate from both trials, release-labelled, non-debuggable and contains the exact source manifest.')
