"""Check real Xcode output, including unchanged Quran files inside the app."""
import argparse
import hashlib
import json
import plistlib
import os
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('bundle', type=Path)
parser.add_argument('--platform', choices=['simulator', 'device'], required=True)
args = parser.parse_args()
bundle = args.bundle.resolve()
with (bundle / 'Info.plist').open('rb') as handle:
    info = plistlib.load(handle)
assert info['CFBundleIdentifier'] == 'online.getfurqan.app'
assert info['CFBundleDisplayName'] == 'Al Furqan'
assert info['CFBundleShortVersionString'] == '0.1.4'
assert info['CFBundleVersion'] == '5'
assert info['MinimumOSVersion'] == '16.4'
expected = 'iPhoneSimulator' if args.platform == 'simulator' else 'iPhoneOS'
assert expected in info['CFBundleSupportedPlatforms'], info['CFBundleSupportedPlatforms']
assert not info.get('NSAppTransportSecurity', {}).get('NSAllowsArbitraryLoads')
executable = bundle / info['CFBundleExecutable']
assert executable.is_file() and executable.stat().st_size > 0
# Xcode Debug can put our native implementation in App.debug.dylib and leave a launcher stub.
# Inspect only this app's own code images; a dependency or resource string cannot satisfy this.
code_images=[executable]
debug_image=bundle/(info['CFBundleExecutable']+'.debug.dylib')
if debug_image.is_file():
    assert debug_image.stat().st_size>0
    code_images.append(debug_image)
assert any(b'FurqanAudioPlugin' in image.read_bytes() for image in code_images), 'Native plugin missing from app code images'
code_hashes={image.name:hashlib.sha256(image.read_bytes()).hexdigest() for image in code_images}
architectures = subprocess.check_output(['xcrun', 'lipo', '-archs', str(executable)], text=True).strip()
if args.platform == 'device':
    assert architectures.split() == ['arm64'], architectures
else:
    assert {'arm64','x86_64'} <= set(architectures.split()), architectures
for image in code_images:
    image_archs=subprocess.check_output(['xcrun','lipo','-archs',str(image)],text=True).split()
    assert set(image_archs)==set(architectures.split()),image.name
config = json.loads((bundle / 'capacitor.config.json').read_text())
assert config['appId'] == info['CFBundleIdentifier']
assert not config.get('server', {}).get('url')
assert not config.get('server', {}).get('cleartext')
assert not config.get('server', {}).get('allowNavigation')
public = bundle / 'public'
manifest = json.loads((public / 'app-source-manifest.json').read_text())
mobile = Path(__file__).resolve().parents[1]
assert (public / 'app-source-manifest.json').read_bytes() == (mobile / 'dist/app-source-manifest.json').read_bytes()
assert len(manifest['preserved']) == 13
assert manifest['nativeBackgroundAudio'] is True
assert info['UIBackgroundModes']==['audio']
assert manifest['requiresNetwork'] is True
assert manifest['guestOnly'] is False and manifest['optionalAccount'] is True
for name, expected_hash in manifest['preserved'].items():
    assert hashlib.sha256((public / name).read_bytes()).hexdigest() == expected_hash, name
for excluded in ['auth-callback.html','login.js','admin.html','__app-preview.html']:
    assert not (public / excluded).exists(), excluded
for name in ['auth-config.js','auth-client.js','account.html','login.html','app-account.js','vendor/supabase-2.118.0.js','downloads.html','app-downloads-offline.js','native-audio.js']:
    assert (public/name).read_bytes()==(mobile/'dist'/name).read_bytes(),name
privacy=plistlib.loads((bundle/'PrivacyInfo.xcprivacy').read_bytes())
assert any(x['NSPrivacyAccessedAPIType']=='NSPrivacyAccessedAPICategoryFileTimestamp' and 'C617.1' in x['NSPrivacyAccessedAPITypeReasons'] for x in privacy['NSPrivacyAccessedAPITypes'])
assert 'app-native.js' in (public / 'index.html').read_text()
assert (bundle / 'Assets.car').is_file(), 'Compiled icon/splash assets missing'
index=json.loads((public/'content/mushaf-pages.json').read_text())
assert index['layout']=='qcf-v2-604' and len(index['pages'])==604
assert sum(p['verse_count'] for p in index['pages'])==6236
assert 'data-view="mushaf"' in (public/'reader.html').read_text()
commit=os.environ.get('GITHUB_SHA','')
assert re.fullmatch('[0-9a-f]{40}',commit)
assert not (bundle/'embedded.mobileprovision').exists(), 'Unsigned build must not contain an owner profile'
print(json.dumps({
    'platform': args.platform,
    'bundle_id': info['CFBundleIdentifier'],
    'version': info['CFBundleShortVersionString'],
    'build': info['CFBundleVersion'],
    'source_commit': commit,
    'source_workflow_run': int(os.environ['GITHUB_RUN_ID']),
    'executable_sha256': hashlib.sha256(executable.read_bytes()).hexdigest(),
    'preserved': manifest['preserved'],
    'mushaf_pages': 604,
    'minimum_ios': info.get('MinimumOSVersion'),
    'architectures': architectures,
    'preserved_reading_files': len(manifest['preserved']),
    'native_code_files':code_hashes,
    'native_background_audio':True,
    'guest_only': manifest['guestOnly'],
    'physical_device_tested': False,
    'signed_for_distribution': False,
}, indent=2))
