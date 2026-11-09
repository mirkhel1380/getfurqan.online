# Al Furqan for iOS · 0.1.5

This package contains a compiled Simulator app and an **unsigned** iPhone archive. It is not an installable, signed IPA and has not been uploaded to TestFlight or the App Store. A successful build does not establish physical-device correctness or scholarly proofreading of Quran text.

## On a Mac: simulator

Use Xcode 26 or newer. Unzip `Al-Furqan-iOS-simulator.zip` to get `App.app`. In Xcode, open **Xcode → Open Developer Tool → Simulator**, start an iPhone simulator, then drag the extracted `App.app` into Simulator. The simulator must support one of the architectures listed in `simulator-verification.json`; otherwise build from source on your Mac.

## On your own iPhone: build and sign from source

1. Download the repository from `https://github.com/mirkhel1380/getfurqan.online` on your Mac.
2. Install Node 22 or newer and Xcode 26 or newer. In Terminal, enter the repository's `mobile` directory and run:

   ```sh
   npm ci
   npm run build
   npm run check
   npx cap sync ios
   npx cap open ios
   ```

3. In Xcode, add your own Apple Account under **Xcode → Settings → Accounts**. Keep the password and verification codes in Apple's own interface.
4. Select the **App** target, then **Signing & Capabilities**. Enable automatic signing and select your real team. The development bundle identifier is `online.getfurqan.app`; confirm it is available to your team before distribution. If Xcode reports that another team owns it, choose an available identifier under your own domain and update both native targets and `capacitor.config.json` consistently.
5. Connect and trust your iPhone, select it as the run destination, and press Run. Complete any required Developer Mode or device-trust steps on the phone itself. The app supports iOS 16.4 or newer; this Capacitor version does not support iOS 9.

A free Apple Account can use a Personal Team for limited personal-device testing; its provisioning expires and must be renewed. TestFlight and App Store distribution require the applicable Apple Developer Program membership, real signing configuration and App Store Connect setup. This project does not create an Apple account, enroll in a paid program, accept agreements, or register a store listing for you.

The minimum iOS version is aligned with the Safari 16.4 JavaScript build target and the modern web APIs used by the shared reader. Compilation and bundle inspection do not replace testing Quran fonts and controls on an actual iPhone.

## Unsigned archive

`Al-Furqan-iOS-unsigned-archive.zip` contains the Release archive compiled for iPhone arm64. It is useful for build review and subsequent signing work. It cannot be installed by tapping a download link, sending it through WhatsApp, or renaming it to `.ipa`. Use the source/Xcode steps above for personal testing; configure real distribution signing before producing a TestFlight or App Store build.

## Test on the phone

- Open Al-Fatihah and several other surahs in Uthmani, IndoPak and Tajweed. Check font loading, Arabic glyph appearance, verse markers and RTL layout with a qualified reviewer.
- Verify the named translation and tafsir editions, and test foreground recitation after a user tap. The latest source supports native background playback for downloaded surahs; physical-device interruption/lock-screen tests remain pending.
- Save a verse and reading place, reopen the app, and confirm persistence. Guest data is separate from your website account.
- Check language changes, light/dark/system appearance, notches, keyboard, rotation and smaller screens.
- Disconnect the internet and verify clear failure states. Quran text, fonts, translations, tafsir are still network-dependent; downloaded recitations can play locally, but this is not a full offline Quran package.

Official guidance: [Capacitor iOS requirements](https://capacitorjs.com/docs/ios), [Apple personal teams and distribution](https://developer.apple.com/help/account/basics/about-your-developer-account).

Optional native sign-in uses verified accounts. Signup, email confirmation and password reset open the system browser; return to the app and sign in after confirming. Private reading sync is opt-in. This source does not replace the previously delivered 0.1.1 package.

Version 0.1.3/build 4 adds on-demand offline recitation downloads. The downloaded surah can play locally without signing in. Keep the download page open and return to resume interrupted downloads. Text/fonts/translation/tafsir remain network-dependent. Downloads use app-private storage excluded from cloud backup, with a 200 MB library limit. Removing the app deletes them.

Version 0.1.4/build 5 adds native playback of verified downloaded surahs while the screen is locked or another app is open. Test interruption/headphone removal, lock-screen controls and transitions on a physical iPhone; unsigned compilation alone does not verify those behaviors. Force-quitting the app ends playback.

Version 0.1.5/build 6 adds a guest-reading backup page in Preferences and Reading progress. Save the JSON outside the app through the iOS share sheet (for example, Save to Files). Restore through the file chooser after reviewing the counts. Existing notes/goals/resume positions are preserved. This does not extract data from older apps that have no export feature and does not make unsigned builds installable. Test actual Files/share-sheet interactions on an owner-signed iPhone before relying on migration.
