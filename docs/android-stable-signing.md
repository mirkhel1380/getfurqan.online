# Stable Android signing preparation · 9 November 2026

The manual `Al Furqan Android stable signing` workflow prepares an owner-controlled, repeatable APK signing path. **A production key has not been generated or configured by this change.** The committed `mobile/android-signing.json` intentionally has a null certificate pin; the manual workflow refuses to build/sign until the owner's public certificate has been reviewed and pinned. The existing public 0.1.1 APK, download button and QR code remain unchanged.

## Application and migration identity

The stable release variant uses `online.getfurqan.app.stable`, labelled **Al Furqan**, version 0.1.5/code 6. It installs alongside both `online.getfurqan.app` (original 0.1.0) and `.trial` (0.1.1 and internal trials). Their ephemeral CI private keys were not retained, so neither installed package is promised an in-place update or data import. Do not uninstall an older app to make room for a new key. The guest backup feature only works in versions that already contain it; older apps without export cannot be automatically read by the new package. Account reading uses the existing opt-in private sync.

Once the first stable key is configured, subsequent stable APKs must keep the same package, pinned signing certificate and owner keystore, with increasing Android version codes. Physical update/data-preservation tests remain required. This is APK sideload preparation, not Play Console/App Store registration or store approval.

## Owner setup

Use the owner's own Windows/Mac computer, with Python 3 and a JDK or Android Studio. The supplied `mobile/scripts/owner-android-key.py` discovers keytool from PATH, JAVA_HOME/JDK_HOME, or standard Android Studio locations. It refuses to run inside GitHub Actions.

From the source repository directory:

```powershell
py mobile/scripts/owner-android-key.py
```

On macOS/Linux use `python3` instead of `py`. An optional `--keytool` argument points to a nonstandard JDK installation. The script prompts invisibly for a password of at least 16 characters (twice), generates an RSA-3072/SHA256withRSA JKS valid for 10,000 days, and saves it to the owner's private `AlFurqanSigning` folder under their home directory. It refuses a destination inside the repository and refuses to replace any existing signing files. It never saves the password. Keep that password in a password manager and keep an encrypted independent backup of the original JKS. POSIX permissions are restricted; Windows protection depends on the private user folder's ACLs.

The folder contains:

| File | Treatment |
| --- | --- |
| `Al-Furqan-owner.jks` | Private original signing key; back up securely. Never send to ChatGPT, commit, or publish. |
| `keystore-base64.txt` | The same private key encoded for GitHub Secrets; equally sensitive. Paste only into the named environment secret. |
| `public-certificate.json` | Public package/alias/certificate fingerprint; this is the only file to share for pinning in `mobile/android-signing.json`. |

In the owner's GitHub repository, open **Settings → Environments → New environment**, named **android-release**. Set a required reviewer to the owner and restrict deployment branches to **main** (branch, no tags). Since the owner initiates and approves their own build, leave Prevent self-review off. Configure the protection rules before adding secrets or dispatching this workflow. Repository-wide secrets are not needed.

Add exactly two **environment** secrets:

| Name | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Entire contents of `keystore-base64.txt`. |
| `ANDROID_KEYSTORE_PASSWORD` | The password chosen on the owner's computer. The helper uses the same password for the JKS and `alfurqan` key entry. |

Share only `public-certificate.json` or its SHA-256 fingerprint so it can be pinned in source. Never put a private key/password in this chat or in an issue/workflow log. The available GitHub connector does not expose environment/secret writes, so this owner step cannot be performed by the connector.

## Build and signing isolation

The workflow is manual-only and main-branch-only, with a read-only repository token and commit-pinned actions. The build job installs dependencies, checks the reader, compiles/tests an unsigned non-debuggable release and checks ZIP alignment **without any signing secret**. A separate job downloads that same workflow run's artifact, waits for the `android-release` environment's owner-configured approval, and exposes both secrets only to one signing step. It does not run npm, Gradle or downloads while the signing secrets are in scope.

The signer imports the existing JKS into a private temporary directory, exports the certificate with keytool and checks the committed SHA-256 pin **before signing**. Passwords are passed through environment variables, not arguments, command traces or files. Subprocess errors do not echo raw signing output. apksigner produces v2/v3 signatures without modifying the input, verifies them, and the private temporary directory is removed on success or failure. Existing signed output files are not overwritten. No generated key or fallback/debug signing is used in the stable job.

The independent signed-APK verifier checks the compiled package/version/label/non-debuggable flag, valid signature and exact pinned certificate, source commit, native code, all thirteen preserved Quran/reading files, the 604-page source index and native account/audio/backup UI. Only APK/checksum/public verification JSON is retained as the final artifact. This workflow does not publish releases or change website downloads automatically.

## Verification and outstanding steps

Local checks exercise unconfigured/changed identity refusal, malformed/oversized secrets, real keytool certificate/password behavior, preservation of existing owner files and workflow secret isolation. Android CI additionally builds the actual unsigned stable variant, checks alignment/non-debuggable identity, and re-signs an actual compiled trial APK twice using one explicitly disposable fixture key. Both signatures are verified; wrong-pin rejection, output-overwrite refusal and temporary-key cleanup are checked. That disposable fixture is never uploaded or installed and does not become the owner signing identity.

Remaining owner work: generate/back up the persistent key, create/protect the environment, add the two secrets and share the public certificate for source pinning. After that, dispatch/approve the stable signing workflow, inspect its actual certificate/artifact and test installation/updating on a real phone before changing public downloads. Until then this stage is **prepared, not production signing complete**.

Primary references: [Android app signing](https://developer.android.com/studio/publish/app-signing), [apksigner](https://developer.android.com/tools/apksigner), [GitHub environment protections/secrets](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## Verified preparation build

Android workflow 42552140475 succeeded from public source `07f862d9b3e357db784f3a5e41b887a15a2f5ac1`. It compiled/tests both debug and release variants, checked the distinct unsigned stable identity/alignment, then signed a real compiled APK twice with one disposable fixture key and verified both v2 signatures, mismatch rejection and cleanup. iOS regression workflow 42552140453 also succeeded; the iOS source/version was not changed. See `android-stable-signing-verification.json`. No owner-signed release, protected environment setup, physical-device update or public download change is claimed.
