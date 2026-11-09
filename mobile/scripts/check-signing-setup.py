"""Exercise identity gates, private-file handling and real certificate reuse with disposable fixtures."""
import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import zipfile
from android_signing import certificate, decode_keystore, identity, private_environment, sign_apk

parser=argparse.ArgumentParser()
parser.add_argument('--apk',type=Path)
parser.add_argument('--apksigner')
args=parser.parse_args()
mobile=Path(__file__).resolve().parents[1]
config=identity(configured=False)
assert config['package'] not in ['online.getfurqan.app','online.getfurqan.app.trial']
if config['certificate_sha256'] is None:
 try:identity()
 except ValueError:pass
 else:raise AssertionError('Unconfigured production signing accepted')
for value in [None,'','!invalid!',base64.b64encode(b'x'*999).decode(),base64.b64encode(b'x'*32001).decode(),'a'*48001]:
 try:decode_keystore(value)
 except ValueError:pass
 else:raise AssertionError('Invalid signing secret accepted')
try:private_environment('')
except ValueError:pass
else:raise AssertionError('Missing password accepted')
# The signing job must never run npm/Gradle/dependency installation with secrets in scope.
workflow=(mobile.parent/'.github/workflows/android-stable.yml').read_text()
assert '  workflow_dispatch:' in workflow and not re.search(r'^  (?:push|pull_request|pull_request_target):',workflow,re.M)
build,sign=workflow.split('  sign:\n',1)
assert 'secrets.' not in build
assert 'environment: android-release' in sign
assert 'github.ref == \'refs/heads/main\'' in build
secret_part=sign.split('      - name: Sign only with the pinned owner key',1)[1].split('      - name: Verify signed output',1)[0]
assert sign.count('secrets.')==2 and secret_part.count('secrets.')==2
assert not re.search(r'npm |gradlew|curl |wget ',sign)
assert 'contents: read' in workflow and 'contents: write' not in workflow
for action in re.findall(r'uses: ([^\n]+)',workflow):assert re.search(r'@[0-9a-f]{40}(?: |$)',action),action
with tempfile.TemporaryDirectory(prefix='af-disposable-signing-test-') as directory:
 root=Path(directory)
 for bad in [{**config,'package':'online.getfurqan.app.trial'},{**config,'key_alias':'debug'},{**config,'certificate_sha256':'0'*64},{**config,'extra':True}]:
  p=root/'bad.json';p.write_text(json.dumps(bad))
  try:identity(p)
  except ValueError:pass
  else:raise AssertionError('Invalid identity accepted')
 password=secrets.token_urlsafe(24)
 key=root/'fixture.jks'
 subprocess.run(['keytool','-genkeypair','-keystore',str(key),'-storetype','JKS','-alias','alfurqan',
  '-keyalg','RSA','-keysize','2048','-validity','2','-dname','CN=Disposable CI fixture',
  '-storepass:env','AF_SIGNING_STORE_PASSWORD','-keypass:env','AF_SIGNING_STORE_PASSWORD','-noprompt'],
  env=private_environment(password),capture_output=True,check=True,timeout=60)
 digest=hashlib.sha256(certificate(key,password)).hexdigest()
 assert digest==hashlib.sha256(certificate(key,password)).hexdigest()
 try:certificate(key,'wrong-password')
 except ValueError as e:assert password not in str(e) and 'wrong-password' not in str(e)
 else:raise AssertionError('Wrong password accepted')
 encoded=base64.b64encode(key.read_bytes()).decode()
 assert decode_keystore(encoded)==key.read_bytes()
 unsigned=root/'unsigned.apk';unsigned.write_bytes(b'fixture input')
 before=set(root.iterdir())
 try:sign_apk(unsigned,root/'must-not-exist.apk','f'*64,encoded,password,'not-used',temp_root=root)
 except ValueError as e:assert 'does not match' in str(e)
 else:raise AssertionError('Wrong certificate accepted')
 assert set(root.iterdir())==before,'Temporary key not cleaned after rejection'
 # The owner setup can never replace an existing private file.
 spec=importlib.util.spec_from_file_location('owner_key',mobile/'scripts/owner-android-key.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
 target=root/'private.txt';owner.private_file(target,b'original')
 try:owner.private_file(target,b'replacement')
 except FileExistsError:pass
 else:raise AssertionError('Owner key overwritten')
 assert target.read_bytes()==b'original'
 if args.apk:
  assert args.apksigner and args.apk.is_file()
  # Repacking removes the trial signature block; retain actual compiled Android content.
  with zipfile.ZipFile(args.apk) as src,zipfile.ZipFile(unsigned,'w') as dst:
   for item in src.infolist():
    if re.fullmatch(r'META-INF/(?:[^/]+\.(?:RSA|DSA|EC|SF)|MANIFEST\.MF)',item.filename,re.I):continue
    dst.writestr(item,src.read(item.filename))
  reports=[]
  for n in [1,2]:
   output=root/f'signed-{n}.apk';assert sign_apk(unsigned,output,digest,encoded,password,args.apksigner,temp_root=root)==digest
   report=subprocess.check_output([args.apksigner,'verify','--verbose','--print-certs',str(output)],text=True)
   assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in report
   assert digest in report
   # Exercise the production report parser too, not only SDK verification.
   v_spec=importlib.util.spec_from_file_location('verify_apk_fixture',mobile/'scripts/verify-android-apk.py');v_module=importlib.util.module_from_spec(v_spec);v_spec.loader.exec_module(v_module)
   assert v_module.signing_fingerprint(report)==digest
   reports.append(output)
  assert not list(root.glob('af-signing-*')),'Temporary key survived successful signing'
  try:sign_apk(unsigned,reports[0],digest,encoded,password,args.apksigner,temp_root=root)
  except ValueError:pass
  else:raise AssertionError('Existing signed output overwritten')
  print('PASS: actual APK signed twice by the same disposable key; v2 signatures verified; wrong-key, output-overwrite and private-file cleanup checks passed.')
print('PASS: stable identity/pin gates, strict secret decoding, real keytool certificate/password checks, owner-file preservation and isolated manual protected signing workflow.')
