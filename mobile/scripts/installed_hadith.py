"""Verify exact, pinned hadith resources inside either native installation."""
import hashlib
import json
from pathlib import Path


def verify_installed_hadith(read):
    mobile = Path(__file__).resolve().parents[1]
    expected = (mobile / 'installed-hadith-lock.json').read_bytes()
    assert read('installed-hadith/manifest.json') == expected, 'Installed hadith manifest differs'
    lock = json.loads(expected)
    assert lock['schema'] == 1 and len(lock['files']) == 64
    assert len({row['edition'] for row in lock['files']}) == 64
    assert len({row['collection'] for row in lock['files']}) == 10
    for row in lock['files']:
        assert row['file'] == row['edition'] + '.json' and '/' not in row['file']
        data = read('installed-hadith/' + row['file'])
        assert len(data) == row['bytes'], row['file']
        assert hashlib.sha256(data).hexdigest() == row['sha256'], row['file']
    for name in ['hadith.html', 'hadith-book.html']:
        html = read(name)
        assert html == (mobile / 'dist' / name).read_bytes(), name
        assert html.count(b'<script src="/app-installed-hadith.js"></script>') == 1, name
    for name in ['app-installed-hadith.js', 'hadith-data.mjs', 'hadith.js']:
        assert read(name) == (mobile / 'dist' / name).read_bytes(), name
    return {'collections': 10, 'editions': 64,
            'source_revision': lock['revision'],
            'uncompressed_bytes': sum(row['bytes'] for row in lock['files']),
            'separate_download_required': False}
