"""Inspect original QuranEnc responses and the exact font inside Android APK."""
import hashlib
import json
from pathlib import Path

def verify_installed_quranenc(read):
    mobile=Path(__file__).resolve().parents[1]
    raw=(mobile/'installed-quranenc-lock.json').read_bytes()
    assert read('installed-quranenc/manifest.json')==raw
    lock=json.loads(raw)
    assert lock['schema']==1 and lock['source']=='https://quranenc.com'
    for row in lock['files']:
        name=row['file']
        assert '/' not in name and name.endswith('.json')
        data=read('installed-quranenc/'+name)
        assert len(data)==row['bytes'],name
        assert hashlib.sha256(data).hexdigest()==row['sha256'],name
    for name in ['reader.html','study.html','app-installed-quranenc.js']:
        assert read(name)==(mobile/'dist'/name).read_bytes(),name
    for name in ['reader.html','study.html']:
        assert read(name).count(b'<script src="/app-installed-quranenc.js"></script>')==1
    font=read('installed-quranenc/uthmanic-hafs18.woff2')
    assert len(font)==87760 and hashlib.sha256(font).hexdigest()=='8c00e7a7d5f773bcfb1642fdcfba505dbd81975fef39f14718827a32d075020c'
    assert read('installed-quranenc/KFGQPC-FONT-LICENSE.txt')==(mobile/'notices/kfgqpc-hafs18.txt').read_bytes()
    return {'translation_style_editions':len(lock['translations']),
            'saadi_source_archives':len(lock['tafsirs']),
            'blocked_editions':lock['blocked'],
            'uncompressed_bytes':sum(row['bytes'] for row in lock['files']),
            'separate_download_required':False,
            'entire_app_offline':False}
