"""Check real Xcode output, including unchanged Quran files inside the app."""
import argparse
import hashlib
import json
import plistlib
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
assert info['CFBundleShortVersionString'] == '0.1.0'
expected = 'iPhoneSimulator' if args.platform == 'simulator' else 'iPhoneOS'
assert expected in info['CFBundleSupportedPlatforms'], info['CFBundleSupportedPlatforms']
assert not info.get('NSAppTransportSecurity', {}).get('NSAllowsArbitraryLoads')
executable = bundle / info['CFBundleExecutable']
assert executable.is_file() and executable.stat().st_size > 0
architectures = subprocess.check_output(['xcrun', 'lipo', '-archs', str(executable)], text=True).strip()
if args.platform == 'device':
    assert 'arm64' in architectures.split(), architectures
config = json.loads((bundle / 'capacitor.config.json').read_text())
assert config['appId'] == info['CFBundleIdentifier']
assert not config.get('server', {}).get('url')
assert not config.get('server', {}).get('cleartext')
assert not config.get('server', {}).get('allowNavigation')
public = bundle / 'public'
manifest = json.loads((public / 'app-source-manifest.json').read_text())
assert manifest['guestOnly'] is True
for name, expected_hash in manifest['preserved'].items():
    assert hashlib.sha256((public / name).read_bytes()).hexdigest() == expected_hash, name
for excluded in ['auth-config.js', 'auth-client.js', 'account.html', 'login.html', 'admin.html', '__app-preview.html']:
    assert not (public / excluded).exists(), excluded
assert 'app-native.js' in (public / 'index.html').read_text()
assert (bundle / 'Assets.car').is_file(), 'Compiled icon/splash assets missing'
print(json.dumps({
    'platform': args.platform,
    'bundle_id': info['CFBundleIdentifier'],
    'version': info['CFBundleShortVersionString'],
    'minimum_ios': info.get('MinimumOSVersion'),
    'architectures': architectures,
    'preserved_reading_files': len(manifest['preserved']),
    'guest_only': manifest['guestOnly'],
    'physical_device_tested': False,
    'signed_for_distribution': False,
}, indent=2))
