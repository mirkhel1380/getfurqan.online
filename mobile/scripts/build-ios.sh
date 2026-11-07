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
project='ios/App/App.xcodeproj'
packages="$output/SourcePackages"

xcodebuild -resolvePackageDependencies -project "$project" -scheme App \
  -clonedSourcePackagesDirPath "$packages"
xcodebuild -project "$project" -scheme App -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$output/simulator-build" \
  -clonedSourcePackagesDirPath "$packages" \
  CODE_SIGNING_ALLOWED=NO build > "$output/simulator-build.log" 2>&1 || {
    tail -n 100 "$output/simulator-build.log"; exit 1;
  }
simulator_app="$output/simulator-build/Build/Products/Debug-iphonesimulator/App.app"
python3 scripts/verify-ios-bundle.py "$simulator_app" --platform simulator > "$output/simulator-verification.json"

xcodebuild -project "$project" -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$output/Al-Furqan-unsigned.xcarchive" \
  -derivedDataPath "$output/device-build" \
  -clonedSourcePackagesDirPath "$packages" \
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
echo 'Built simulator app and unsigned iPhone archive. Physical-device installation still needs Apple signing.'
