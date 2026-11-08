# Native background recitation · 0.1.4 / build 5

Downloaded complete surahs can now be handed to a native player rather than a WebView audio element. The native queue advances through verified verse recordings without JavaScript timers. This stage covers downloaded recitation only; the existing online readers and their published text/translation/tafsir adapters remain unchanged. Browsers retain their on-screen HTML audio player and explicitly identify native controls as an app feature.

Android uses pinned AndroidX Media3 1.11.1, ExoPlayer and a MediaSessionService. The service supplies system media controls/notification metadata and foreground media playback, handles audio focus and headphone removal, and stops when the app is dismissed from Recents. Its session rejects untrusted external controllers; trusted system clients can control transport but cannot replace the queue or add arbitrary media. Foreground-service/media-playback and wake-lock manifest permissions support the requested audio feature; no microphone or external-storage permission is requested. The app binds a controller without starting audio. Actual playback starts only after a user action.

iOS uses AVQueuePlayer, AVAudioSession playback/spoken-audio mode, MPRemoteCommandCenter and MPNowPlayingInfoCenter. The active SceneDelegate creates the custom Capacitor bridge that registers the local plugin; a storyboard class alone would not cover this project's scene setup. The audio background mode is enabled in the app target. Headphone disconnection and interruption beginnings pause audio; resuming is an explicit user action. Force-quitting or OS termination ends playback. Native playback does not claim to survive those actions.

Both implementations accept complete local queues only. The counts for all 114 chapters are checked against the audited 6,236-verse catalog. Native code checks the reciter/chapter key, contiguous verse references, file names, canonical app-private root, individual and total byte limits, file existence/size and SHA-256 before changing the queue. Remote media URLs, path traversal, symlink escapes, mismatched references and damaged files are rejected. File checks run off the UI thread. Stop/pause invalidates in-flight loads so a late checksum result cannot restart playback. Source files stay in LibraryNoCloud/app-private storage; no new media source or synthesized audio is introduced.

The Downloads page switches to native play/pause/stop and verse navigation in an installed app. It can reattach to an already-playing queue after navigation or foregrounding. Other pages show a small current-recitation bar above navigation. Starting an online HTML audio player stops the native player; starting native playback pauses HTML audio. Deletion or repair of the active downloaded pack first stops its native player. Other downloaded packs and guest/account data remain separate. No new Supabase schema, auth or production user changes are needed.

The native bridge is loaded once per page, listener handles/timers are released on navigation, and playback itself is not stopped by page teardown. Status responses exclude file paths and source hashes. The JavaScript client rejects malformed status and ignores an older load result after stop. Download storage remains usable if the native status query fails. Added labels/explanations cover all 13 app languages.

Validation:
- Required mobile build checks include all previous account/download/metadata tests, plus native-client state/controls, cancelled-load UI, malformed status rejection, both native reference catalogs, active-scene registration and bridge script order.
- Android CI runs JVM tests for the actual local-queue validator before compiling the APK. Tests cover valid complete queues, altered files, traversal, wrong references, unsupported reciters, invalid roots and incomplete chapters.
- iOS CI compiles/runs the actual Foundation/CryptoKit queue validator with isolated temporary files before building Simulator and unsigned iPhone artifacts. It checks complete queues, bounds, canonical roots, digest changes and metadata counts. These fixtures are structural test bytes, not Quran audio recordings.
- Packaged-bundle verification checks native plugin/service presence, the exact bridge and Downloads scripts, Android foreground playback declaration, iOS audio background mode and all 13 preserved Quran/reading file hashes.

Device validation is still required: physical screen-lock and multi-verse continuation, Control Center/notification/headset controls, phone-call/focus interruptions, unplugging Bluetooth/wired headphones, app navigation/termination, route changes, low battery and vendor battery management. Browser UI fixtures can verify controls and state synchronization but cannot establish native background execution. Successful compiler and archive checks are not reported as completed physical-device tests.

This is an internal trial build. Protected stable Android signing and owner iOS signing remain pending; iOS signing was explicitly deferred. The public Android 0.1.1 download, prior iOS package and website QR codes remain unchanged.

References reviewed on 8 November 2026:
- https://developer.android.com/media/media3/session/background-playback
- https://developer.android.com/jetpack/androidx/releases/media3
- https://capacitorjs.com/docs/ios/custom-code
- https://developer.apple.com/documentation/avfoundation/avqueueplayer
- https://developer.apple.com/documentation/avfaudio/handling-audio-interruptions
- https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter
