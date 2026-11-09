"""Regression for the old and new Android SDK signer-report formats."""
import importlib.util
from pathlib import Path
p=Path(__file__).with_name('verify-android-apk.py');spec=importlib.util.spec_from_file_location('verify_apk',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
verified='Verified using v2 scheme (APK Signature Scheme v2): true\n'
digest='a'*64
for name in ['Signer #1','Signer (minSdkVersion=28, maxSdkVersion=2147483647)','V2 Signer:','V3.0 Signer:']:
 assert module.signing_fingerprint(verified+name+' certificate SHA-256 digest: '+digest+'\n')==digest
for report in ['',verified,verified.replace(': true',': false')+'Signer #1 certificate SHA-256 digest: '+digest+'\n',verified+'Signer #1 certificate SHA-256 digest: '+digest+'\nSigner #2 certificate SHA-256 digest: '+'b'*64+'\n',verified+'V3.0 Signer: certificate SHA-256 digest: '+digest+'\nV2 Signer: certificate SHA-256 digest: '+'b'*64+'\n',verified+'Number of signers: 2\nV3.0 Signer: certificate SHA-256 digest: '+digest+'\n',verified.replace(': true',': false')+'V3.0 Signer: certificate SHA-256 digest: '+digest+'\n']:
 try:module.signing_fingerprint(report)
 except ValueError:pass
 else:raise AssertionError('Invalid or ambiguous signer report accepted')
fixture=Path(__file__).with_name('fixtures')/'apksigner-v3-owner.txt'
assert module.signing_fingerprint(fixture.read_text())=='338ea13cdf5ddb0c11b902e2e6b16a6a4f7a8d352881948cbcaef6d096938e2e'
print('PASS: legacy/V2/V3.0 SDK labels and exact owner report; missing v2, invalid, multiple-signer and ambiguous certificate reports rejected.')
