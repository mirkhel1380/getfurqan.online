"""Stable identity validation and signing. Never generate a production key in CI."""
import base64
import binascii
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

IDENTITY_PATH = Path(__file__).resolve().parents[1] / 'android-signing.json'

def identity(path=IDENTITY_PATH, configured=True):
    data = json.loads(Path(path).read_text())
    if set(data) != {'schema', 'package', 'key_alias', 'certificate_sha256'} or data['schema'] != 1:
        raise ValueError('Invalid signing identity configuration.')
    if data['package'] != 'online.getfurqan.app.stable' or data['key_alias'] != 'alfurqan':
        raise ValueError('Stable application identity changed.')
    digest = data['certificate_sha256']
    if digest is None and not configured:
        return data
    if not isinstance(digest, str) or not re.fullmatch('[0-9a-f]{64}', digest) or len(set(digest)) == 1:
        raise ValueError('Owner signing certificate is not pinned. Complete the owner-key setup first.')
    return data

def decode_keystore(value):
    if not isinstance(value, str) or not value.strip() or len(value) > 48000:
        raise ValueError('Missing or oversized signing keystore secret.')
    try:
        raw = base64.b64decode(value.strip(), validate=True)
    except (ValueError, binascii.Error):
        raise ValueError('Invalid signing keystore secret.') from None
    if not 1000 <= len(raw) <= 32000:
        raise ValueError('Invalid signing keystore size.')
    return raw

def private_environment(password):
    if not isinstance(password, str) or not password or len(password) > 1024 or '\x00' in password:
        raise ValueError('Missing or invalid signing password.')
    env = os.environ.copy()
    for name in ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD']:
        env.pop(name, None)
    env['AF_SIGNING_STORE_PASSWORD'] = password
    return env

def certificate(keystore, password, keytool='keytool'):
    try:
        result = subprocess.run([str(keytool), '-exportcert', '-keystore', str(keystore),
            '-storepass:env', 'AF_SIGNING_STORE_PASSWORD', '-alias', 'alfurqan'],
            env=private_environment(password), capture_output=True, check=True, timeout=30)
    except (subprocess.SubprocessError, OSError):
        raise ValueError('Could not open the signing key. Check its alias and password.') from None
    if not 200 <= len(result.stdout) <= 16000:
        raise ValueError('Invalid signing certificate.')
    return result.stdout

def sign_apk(unsigned, output, pinned, encoded_key, password, apksigner, keytool='keytool', temp_root=None):
    unsigned, output = Path(unsigned).resolve(), Path(output).resolve()
    if not unsigned.is_file() or output.exists() or unsigned == output:
        raise ValueError('Signing needs an existing input and a new output path.')
    if not re.fullmatch('[0-9a-f]{64}', pinned):
        raise ValueError('Invalid expected certificate.')
    raw = decode_keystore(encoded_key)
    output.parent.mkdir(parents=True, exist_ok=True)
    # The key exists only inside this private temporary directory during signing.
    with tempfile.TemporaryDirectory(prefix='af-signing-', dir=temp_root) as folder:
        folder = Path(folder)
        os.chmod(folder, 0o700)
        key = folder / 'owner.jks'
        with key.open('xb') as f:
            os.chmod(key, 0o600)
            f.write(raw)
        actual = hashlib.sha256(certificate(key, password, keytool)).hexdigest()
        if actual != pinned:
            raise ValueError('Signing certificate does not match the pinned owner identity.')
        staged = folder / 'signed.apk'
        try:
            subprocess.run([str(apksigner), 'sign', '--ks', str(key), '--ks-key-alias', 'alfurqan',
                '--ks-pass', 'env:AF_SIGNING_STORE_PASSWORD', '--key-pass', 'env:AF_SIGNING_STORE_PASSWORD',
                '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
                '--v4-signing-enabled', 'false', '--out', str(staged), str(unsigned)],
                env=private_environment(password), capture_output=True, check=True, timeout=120)
            subprocess.run([str(apksigner), 'verify', '--verbose', str(staged)],
                capture_output=True, check=True, timeout=30)
        except (subprocess.SubprocessError, OSError):
            raise ValueError('APK signing or signature verification failed; no release was produced.') from None
        # Never overwrite a previous output, even if a second signer races this process.
        try:
            with output.open('xb') as f, staged.open('rb') as source:
                shutil.copyfileobj(source, f)
        except FileExistsError:
            raise ValueError('The signed output already exists.') from None
    return actual
