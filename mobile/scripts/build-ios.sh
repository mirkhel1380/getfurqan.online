#!/bin/bash
set -euo pipefail

mobile_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$mobile_root"
if [ "$(uname -s)" != Darwin ]; then
  echo 'An iOS build requires macOS with Xcode 26 or newer.' >&2
  exit 1
fi
xcodebuild -version
xcode_major="$(xcodebuild -version | awk '/^Xcode / {split($2,parts,"."); print parts[1]}')"
if [ "$xcode_major" -lt 26 ]; then
  echo 'Xcode 26 or newer is required.' >&2
  exit 1
fi
output="$mobile_root/artifacts/ios"
mkdir -p "$output"
swiftc ios/App/App/RecitationFiles.swift scripts/ios-audio-tests/main.swift -o "$output/check-audio-files"
"$output/check-audio-files"
project='ios/App/App.xcodeproj'
packages="$output/SourcePackages"

# Retry only dependency resolution; actual compiler errors still fail immediately.
resolved=false
for attempt in 1 2 3; do
  if xcodebuild -resolvePackageDependencies -project "$project" -scheme App \
    -clonedSourcePackagesDirPath "$packages" > "$output/resolve-packages-$attempt.log" 2>&1; then
    resolved=true
    break
  fi
  tail -n 50 "$output/resolve-packages-$attempt.log"
  if [ "$attempt" -lt 3 ]; then sleep "$((attempt * 3))"; fi
done
if [ "$resolved" != true ]; then
  echo 'Unable to resolve pinned iOS dependencies after three attempts.' >&2
  exit 1
fi
xcodebuild -project "$project" -scheme App -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$output/simulator-build" \
  -clonedSourcePackagesDirPath "$packages" -disableAutomaticPackageResolution \
  CODE_SIGNING_ALLOWED=NO ONLY_ACTIVE_ARCH=NO 'ARCHS=arm64 x86_64' build > "$output/simulator-build.log" 2>&1 || {
    tail -n 100 "$output/simulator-build.log"; exit 1;
  }
simulator_app="$output/simulator-build/Build/Products/Debug-iphonesimulator/App.app"
python3 scripts/verify-ios-bundle.py "$simulator_app" --platform simulator > "$output/simulator-verification.json"

xcodebuild -project "$project" -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$output/Al-Furqan-unsigned.xcarchive" \
  -derivedDataPath "$output/device-build" \
  -clonedSourcePackagesDirPath "$packages" -disableAutomaticPackageResolution \
  CODE_SIGNING_ALLOWED=NO archive > "$output/device-build.log" 2>&1 || {
    tail -n 100 "$output/device-build.log"; exit 1;
  }
device_app="$output/Al-Furqan-unsigned.xcarchive/Products/Applications/App.app"
python3 scripts/verify-ios-bundle.py "$device_app" --platform device > "$output/device-verification.json"

ditto -c -k --sequesterRsrc --keepParent "$simulator_app" "$output/Al-Furqan-iOS-simulator.zip"
ditto -c -k --sequesterRsrc --keepParent "$output/Al-Furqan-unsigned.xcarchive" "$output/Al-Furqan-iOS-unsigned-archive.zip"
cp IOS-INSTALL.md "$output/READ-ME-FIRST.md"
cd "$output"
shasum -a 256 Al-Furqan-iOS-simulator.zip Al-Furqan-iOS-unsigned-archive.zip > SHA256SUMS.txt
python3 - <<'PY'
import hashlib,json,os
from pathlib import Path
files=['Al-Furqan-iOS-simulator.zip','Al-Furqan-iOS-unsigned-archive.zip']
meta={'version':'0.1.4','build':5,'minimum_ios':'16.4','source_commit':os.environ['GITHUB_SHA'],'source_workflow_run':int(os.environ['GITHUB_RUN_ID']),'signed_for_distribution':False,'installable_ipa':False,'physical_device_tested':False,'files':{p:{'bytes':Path(p).stat().st_size,'sha256':hashlib.sha256(Path(p).read_bytes()).hexdigest()}for p in files}}
Path('ios-build.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2))
PY
echo 'Built simulator app and unsigned iPhone archive. Physical-device installation still needs Apple signing.'
