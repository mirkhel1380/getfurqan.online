# Al Furqan mobile · 0.1.1

Shared Android and iPhone foundation using Capacitor 8.6.0. The local app bundle contains a dedicated home screen, bottom navigation, 13 interface languages, theme controls and the existing Quran reading tools. It does not load the deployed website as its app shell.

## Build

From this directory, with Node 22 or newer:

```sh
npm ci
npm run build
npm run check
npx cap sync
```

Android requires Java 21 and Android SDK 36. Open `android/` in Android Studio, or run `bash ./gradlew assembleDebug` inside that directory. The GitHub workflow **Al Furqan Android trial** builds a debug APK and checksum, retained for 14 days. This is a trial build, not a store release. Local Android signing material and generated output must stay untracked.

iOS 0.1.1/build 2 source is in `ios/App/App.xcodeproj`, with Swift Package Manager dependencies. The app requires iOS 16.4 or newer, aligned with the shared JavaScript build target. Open it through `npm run ios` on macOS with Xcode 26 or newer. Device/archive signing requires the owner's actual Apple account and team. No signing identities, team IDs, provisioning profiles, or store registrations are invented here.

The development application ID is `online.getfurqan.app`; the display name is **Al Furqan**. Confirm availability in the owner's store accounts before the first release. The website remains at `getfurqan.online`.

## Source preservation

`prepare-web.mjs` uses the parent `dist/` in the native Site source repository, or the parent root in the public GitHub mirror. Only known web files/directories are copied; repository files and dependencies are excluded. The bundle records SHA-256 hashes for thirteen unchanged reading adapters, editions, page-layout metadata and styles. Bundled HTML changes only app navigation, account controls, local shell assets and viewport handling; published Quran text, edition selections, font mappings and integrity guards are reused. These checks do not replace scholarly proofreading or testing actual glyph appearance on phones.

The source website files are not changed by the mobile build. App icon and splash artwork derive from the existing outlined Al Furqan wordmark and retain its font-license attribution in the source SVG.

## Current boundaries

- Guest reading only. Bookmarks, reading place, history and study notes stay in the app's local web storage. They are separate from website/browser data. App removal or clearing its storage can remove them. Android cloud backup is disabled.
- Quran text, font files, recitation, translations and tafsir still require their existing network sources. The shell and owned topic data are bundled. This is not a full offline Quran package.
- Native account sign-in, confirmation/reset deep links, account deletion, private sync, notifications, background audio and native location permissions are subsequent stages. Web account scripts and private/admin/contact-form routes are excluded from the bundle. Contact opens the published support email.
- Android back closes a dialog, returns through history, returns home, then exits from home. External source links open outside the trusted local app origin.
- Insets use both Capacitor's Android safe-area variables and iOS safe-area values. Physical devices must still verify notches, keyboard, navigation gestures, color fonts, audio and right-to-left layout.

## Release checklist

1. Install and test the Android trial on a real phone; inspect all three Quran scripts, translation/tafsir source identity, audio, saving and offline errors.
2. Compile and test the iPhone build on macOS and a physical iPhone.
3. Implement native authentication only with verified application links using the owner's real Android signing fingerprint and Apple team. Include in-app account deletion and the required public deletion-request path before enabling native account creation.
4. Review source redistribution/attribution, full privacy disclosures, religious proofreading, accessibility, store screenshots, production signing and store forms before submission.

Official references: [Capacitor environment](https://capacitorjs.com/docs/getting-started/environment-setup), [configuration](https://capacitorjs.com/docs/config), [Android](https://capacitorjs.com/docs/android), [iOS](https://capacitorjs.com/docs/ios).

## Android 0.1.1 trial

The new trial includes the framed 604-page reader. Debug builds use package `online.getfurqan.app.trial`, version code 2 and version name `0.1.1-trial`, with launcher label **Al Furqan Trial**. The original 0.1.0 trial used `online.getfurqan.app`. Its ephemeral CI debug signing key was not retained, so a newly signed APK cannot update that package in place. The new package installs alongside it and leaves its local saved data intact; it does not import those saved items. Do not remove the old app to install this trial.

Gradle remains pinned to 8.14.3; the smaller binary-only distribution has its official SHA-256 checksum pinned and a 120-second download timeout. CI retries only distribution bootstrap, then compiles once. The real APK is checked with Android's `aapt` and `apksigner`, its complete ZIP is tested, and all thirteen preserved reading files plus the 604-page index are compared to this build's source.

After those checks, CI creates an immutable public prerelease with the APK, checksum, source commit, public signing-certificate fingerprint and inspection report. It verifies the public download anonymously before site download links are changed. Existing release assets are never silently replaced. The old 0.1.0 public release is retained.

This is still a debug trial. Its signing key is ephemeral and protected production signing/consistent future update identity is pending. Private signing keys are never uploaded as artifacts or committed to this public repository. Physical-device testing is separate from successful compilation and package inspection.

Android publication now requires an explicit version change in its Gradle configuration or the manual publish option. iOS-only builds do not replace the existing Android release.
