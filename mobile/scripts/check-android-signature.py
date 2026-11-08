"""Regression for the old and new Android SDK signer-report formats."""
import importlib.util
from pathlib import Path
p=Path(__file__).with_name('verify-android-apk.py');spec=importlib.util.spec_from_file_location('verify_apk',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
verified='Verified using v2 scheme (APK Signature Scheme v2): true\n'
digest='a'*64
for name in ['Signer #1','Signer (minSdkVersion=28, maxSdkVersion=2147483647)']:
 assert module.signing_fingerprint(verified+name+' certificate SHA-256 digest: '+digest+'\n')==digest
for report in ['',verified,verified.replace(': true',': false')+'Signer #1 certificate SHA-256 digest: '+digest+'\n',verified+'Signer #1 certificate SHA-256 digest: '+digest+'\nSigner #2 certificate SHA-256 digest: '+'b'*64+'\n']:
 try:module.signing_fingerprint(report)
 except ValueError:pass
 else:raise AssertionError('Invalid or ambiguous signer report accepted')
print('PASS: legacy/new SDK certificate labels; missing, invalid and ambiguous signature reports rejected.')
