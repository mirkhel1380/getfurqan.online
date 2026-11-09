"""Run ON THE OWNER'S COMPUTER. Creates a persistent owner key outside the repo."""
import argparse
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from android_signing import certificate, private_environment

def keytool_path(explicit=None):
    candidates = [explicit, shutil.which('keytool')]
    for name in ['JAVA_HOME', 'JDK_HOME']:
        if os.environ.get(name):
            candidates.append(str(Path(os.environ[name]) / 'bin' / ('keytool.exe' if os.name == 'nt' else 'keytool')))
    if os.name == 'nt':
        candidates.append(str(Path(os.environ.get('ProgramFiles', r'C:\Program Files')) / 'Android/Android Studio/jbr/bin/keytool.exe'))
    else:
        candidates.append('/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool')
    return next((str(Path(p).resolve()) for p in candidates if p and Path(p).is_file()), None)

def private_file(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path.home() / 'AlFurqanSigning')
    parser.add_argument('--keytool', help='Optional path to Android Studio/JDK keytool')
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        raise ValueError('Production keys must be created and backed up by the owner, never in CI.')
    tool = keytool_path(args.keytool)
    if not tool:
        raise ValueError('Java keytool was not found. Install a JDK or use Android Studio and retry.')
    directory = args.directory.expanduser().resolve()
    repo = Path(__file__).resolve().parents[2]
    if directory == repo or repo in directory.parents:
        raise ValueError('Choose a private folder outside the source repository.')
    names = ['Al-Furqan-owner.jks', 'keystore-base64.txt', 'public-certificate.json']
    if any((directory / n).exists() for n in names):
        raise ValueError('Owner signing files already exist. Keep them; this tool never replaces them.')
    password = getpass.getpass('Choose a signing password (at least 16 characters): ')
    if len(password) < 16 or password != getpass.getpass('Repeat signing password: '):
        raise ValueError('Passwords must match and contain at least 16 characters.')
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Generate inside the owner's private directory, then preserve the exact bytes without overwriting.
    with tempfile.TemporaryDirectory(prefix='new-key-', dir=directory) as temporary:
        staging = Path(temporary) / 'new.jks'
        try:
            subprocess.run([tool, '-genkeypair', '-keystore', str(staging), '-storetype', 'JKS',
                '-alias', 'alfurqan', '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA',
                '-validity', '10000', '-dname', 'CN=Al Furqan', '-storepass:env', 'AF_SIGNING_STORE_PASSWORD',
                '-keypass:env', 'AF_SIGNING_STORE_PASSWORD', '-noprompt'],
                env=private_environment(password), capture_output=True, check=True, timeout=60)
        except (subprocess.SubprocessError, OSError):
            raise ValueError('Key generation failed. No existing owner key was changed.') from None
        digest = hashlib.sha256(certificate(staging, password, tool)).hexdigest()
        raw = staging.read_bytes()
        private_file(directory / names[0], raw)
        private_file(directory / names[1], base64.b64encode(raw))
        public = {'schema': 1, 'package': 'online.getfurqan.app.stable', 'key_alias': 'alfurqan', 'certificate_sha256': digest}
        private_file(directory / names[2], (json.dumps(public, indent=2) + '\n').encode())
    print('Owner signing key created in: ' + str(directory))
    print('Keep an encrypted backup of the JKS and keep its password in your password manager.')
    print('Put keystore-base64.txt into GitHub environment secret ANDROID_KEYSTORE_BASE64.')
    print('Put your password into environment secret ANDROID_KEYSTORE_PASSWORD.')
    print('Only public-certificate.json may be shared with ChatGPT. Do not send the JKS, base64 file or password.')
    print('Public certificate SHA-256: ' + digest)

if __name__ == '__main__':
    try:
        main()
    except (ValueError, FileExistsError) as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
