#!/bin/bash
set -euo pipefail
folder="$RUNNER_TEMP/al-furqan-android-publication"
mkdir -p "$folder"
gh run download "$GITHUB_RUN_ID" --name Al-Furqan-Android-trial --dir "$folder"
cd "$folder"
apk_name='Al-Furqan-Android-0.1.1.apk'
tag='android-v0.1.1'
python3 - <<'PY'
import hashlib,json,os
from pathlib import Path
m=json.loads(Path('apk-verification.json').read_text())
assert m['apk']=='Al-Furqan-Android-0.1.1.apk'
assert m['package']=='online.getfurqan.app.trial' and m['version_name']=='0.1.1-trial'
assert m['source_commit']==os.environ['GITHUB_SHA']
assert m['source_workflow_run']==int(os.environ['GITHUB_RUN_ID'])
assert hashlib.sha256(Path(m['apk']).read_bytes()).hexdigest()==m['sha256']
assert m['mushaf_pages']==604 and m['production_signing_pending']
PY
sha256sum --check SHA256SUMS.txt
if gh release view "$tag" >/dev/null 2>&1; then
  # Never overwrite an existing download with a different signing identity.
  mkdir existing
  gh release download "$tag" --pattern apk-verification.json --pattern "$apk_name" --dir existing
  python3 - <<'PY'
import hashlib,json
from pathlib import Path
current=json.loads(Path('apk-verification.json').read_text())
old=json.loads(Path('existing/apk-verification.json').read_text())
assert old['source_commit']==current['source_commit'],'Release already exists for another source; bump the Android version'
assert old['preserved']==current['preserved']
assert hashlib.sha256(Path('existing',old['apk']).read_bytes()).hexdigest()==old['sha256']
print('Existing verified release retained unchanged.')
PY
  cp existing/apk-verification.json public-verification.json
else
  cat > READ-ME-FIRST.md <<'NOTES'
Al Furqan Android 0.1.1 — trial with the new page-based Quran reader.

Installable debug trial for Android 7 or newer. Its package is online.getfurqan.app.trial and its launcher name is Al Furqan Trial, so it installs alongside the original 0.1.0 app. It does not overwrite or import the original app's saved reading data; keep the original app if you need those saved items.

This is a test build with a debug signing certificate, not a production release or a promise of in-place updates between separate trial builds. A protected, stable production signing key remains to be configured. No private signing key is included in the download.

Guest reading only. Quran text, fonts, translations, tafsir and recitation need internet. Includes the 604-page Madani reader and its original verse tools. Technical source checks do not replace scholarly proofreading. Physical-device testing remains pending.

apk-verification.json records the exact source commit, package/version, public certificate fingerprint, APK checksum and hashes of the preserved reading files.
NOTES
  gh release create "$tag" "$apk_name" SHA256SUMS.txt apk-verification.json READ-ME-FIRST.md \
    --target "$GITHUB_SHA" --prerelease --title 'Al Furqan Android 0.1.1 — Trial' --notes-file READ-ME-FIRST.md
  cp apk-verification.json public-verification.json
fi
public_url="https://github.com/$GH_REPO/releases/download/$tag/$apk_name"
curl --fail --silent --show-error --location --retry 3 --connect-timeout 30 --max-time 180 \
  --proto '=https' --proto-redir '=https' --output public.apk "$public_url"
python3 - <<'PY'
import hashlib,json
from pathlib import Path
m=json.loads(Path('public-verification.json').read_text())
assert hashlib.sha256(Path('public.apk').read_bytes()).hexdigest()==m['sha256']
print('Anonymous public APK download verified:',m['sha256'])
PY
printf '%s\n' "$public_url"
