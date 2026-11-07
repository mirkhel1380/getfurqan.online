# Next phase: Android and iPhone

The website source now provides the main reading, recitation, study, topic, Hadith, prayer-time, account, contact and privacy interfaces to build on. The topic pass checked51 pages and4222 local links/assets with no missing targets or anchors. Existing source-corpus/font checks and previous authentication/sync work are recorded separately. This means app development can begin; it is not a claim that store submission or physical device testing is complete.

Keep these app-specific tasks within the app phase:

1. Implement and test returning to the app after email confirmation/reset and opening Quran/topic links. Use actual app identifiers and signing information when configuring verified links; do not invent store identifiers or Apple team IDs.
2. Provide a clear account/data deletion path from inside the app and a usable public deletion-request web route. Apple requires apps offering account creation to let users initiate account deletion within the app. Google Play also requires an in-app path and an outside-app web resource. Account deactivation alone is not the same as deletion. This is an app release requirement, not a claim that the existing website's account page already implements it.
3. Test login, optional private sync, recitation, fonts, theme, language and prayer-location handling on actual Android/iPhone devices. Decide and accurately disclose any offline/network behavior; do not promise offline Quran/fonts/audio without implementing and validating it.
4. Prepare signed builds, truthful store privacy/data-safety disclosures, screenshots and review access as required by the chosen stores. Store submission/approval has not been performed.

Primary store documentation checked 7 November 2026:

- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://support.google.com/googleplay/android-developer/answer/13327111?hl=en

Religious proofreading and permission for presently unavailable German/Dutch tafsir remain recorded in `website-readiness.md`. No unavailable edition is represented as working, and technical checks are not presented as religious certification.
