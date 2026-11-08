# Android trial release procedure

The 8 November 2026 build failure was a 10-second timeout downloading Gradle. The wrapper now downloads the smaller official 8.14.3 binary distribution with a 120-second timeout and the publisher's pinned SHA-256 checksum. Only bootstrap has a bounded retry; compilation failures are not hidden by repeated builds. The wrapper JAR also matches the publisher's reference checksum.

The real compiled APK is inspected with the Android SDK's aapt and apksigner. Verification checks its package/version/launcher label, minimum and target SDKs, verified v2 signature and unambiguous public certificate fingerprint. It tests ZIP integrity, confirms that authentication pages/signing keys are absent, and compares all 13 reading files and the 604-page index to the exact mobile bundle built in that run. Recent apksigner versions may identify signers by their scheme (`V2 Signer:`) or API range rather than a signer number; the observed SDK report and older formats are parsed without relaxing signature validation.

Publishing runs only after these checks. The public prerelease contains the APK, its SHA256SUMS.txt, apk-verification.json and installation notes. The publisher checks the downloaded artifact's source SHA/run ID, does not overwrite an existing release with another source or certificate, and downloads the public APK without authentication to verify the same checksum. The website's download link, version, size and QR code change only after a successful publication.

## Existing installed data and signing

The old 0.1.0 APK was signed by an ephemeral CI debug key which was not retained. It cannot receive an in-place update signed with another key. The 0.1.1 debug trial uses `online.getfurqan.app.trial` and the launcher label **Al Furqan Trial**, so it installs alongside the original app and preserves that app's local data. Saved items are not automatically copied into the new app. Removing the original app is not necessary.

This remains an experimental debug release. A protected, stable production signing key is still needed for consistent future updates. Private keys are never committed to the public repository or exposed in public workflow artifacts. Actual phone testing, production signing and store distribution are separate from successful compilation and package inspection.

## Source references

- https://docs.gradle.org/current/userguide/gradle_wrapper.html
- https://gradle.org/release-checksums/ — Gradle 8.14.3 checksums.
- https://developer.android.com/studio/publish/app-signing
- https://developer.android.com/tools/apksigner
- https://android.googlesource.com/platform/tools/apksig/+/master/src/apksigner/java/com/android/apksigner/ApkSignerTool.java

## Verified 0.1.1 result

Build and public publication succeeded in GitHub Actions run 42474194265 from source commit `7f7edbd16b7d61109f85a9d369c4dfcaa978d82d`. The compiled APK is 6727319 bytes with SHA-256 `da9ad8869c25cfd52066213e997842456322ba78299ba0d5b7a03808715742ac`. The anonymous public download matched this checksum. All thirteen packaged reading files matched the build source, including the new Mushaf reader and page index. The exact SDK inspection report is retained in `android-0.1.1-verification.json`. Physical-device testing remains pending.
