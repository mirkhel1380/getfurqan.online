"""CI entry point: import the owner's existing secret, verify its pin, then sign."""
import argparse
import os
from pathlib import Path
import sys
from android_signing import identity, sign_apk

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('unsigned', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--apksigner', required=True)
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        if (os.environ.get('GITHUB_EVENT_NAME') != 'workflow_dispatch'
                or os.environ.get('GITHUB_REF') != 'refs/heads/main'
                or os.environ.get('GITHUB_REPOSITORY') != 'mirkhel1380/getfurqan.online'):
            raise ValueError('Stable signing is allowed only for a manual main-branch owner build.')
    data = identity()
    sign_apk(args.unsigned, args.output, data['certificate_sha256'],
        os.environ.get('ANDROID_KEYSTORE_BASE64'), os.environ.get('ANDROID_KEYSTORE_PASSWORD'),
        args.apksigner, temp_root=os.environ.get('RUNNER_TEMP'))
    print('Signed with the pinned owner certificate. Private temporary signing material removed.')

if __name__ == '__main__':
    try:
        main()
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
