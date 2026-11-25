# Android installed study data — preparation

The owner has deferred iOS. Android's installed-offline goal is still incomplete; this source must not be promoted as an entirely offline app or used to replace the public download merely because its source archives are bundled.

The Android-specific build adds original QuranEnc responses for the existing selected translation and Mukhtasar keys, plus the seven selected Saadi source archives. The manifest records each file's URL, edition version, bytes and SHA-256. A translation is accepted only when all 114 chapters contain all 6,236 ordered, nonempty verse translations. Text, Arabic fields, punctuation, notes and null values remain as published. Whole Saadi archives are checked for bounded ranges, unique source identifiers and all verse references. Their blank source entries are retained, not filled or silently removed. Some existing study responses contain a blank entry alongside published text; the existing study UI can reject such responses. A complete source archive does not certify that each verse has a complete standalone explanation.

Source republication terms: https://quranenc.com/en/home/about . Attribution, publisher metadata, original notes and edition versions are retained. The publisher dashboard versions the API-only Dari edition even when the public list omits it. Existing reviewed Mukhtasar selection versions remain unchanged. Updates require a new reviewed manifest; changed bytes fail the build.

The transport hook runs before the unchanged reader/study adapters on Android only. It supplies installed QuranEnc resources and reuses the chapter names/counts already installed with the old app to initialize the study selector. It does not supply replacement Quran text or word meanings. The common 180-file checkpoint normalizes only the exact new hook in the two reviewed HTML files. All original Quran adapters and all other existing bytes still have to match.

The exact UthmanicHafs font used by study/topic quotations is included without modification from an independent immutable source:
https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/e35e7b590ba68ff451f32aba92a8f078fd11966f/hafs/font/hafs.18.woff2 .
It is 87,760 bytes with SHA-256 8c00e7a7d5f773bcfb1642fdcfba505dbd81975fef39f14718827a32d075020c, byte-identical to the existing audited v18 font. Its embedded KFGQPC EULA grants free use/copy/distribution subject to its terms; the complete notice accompanies it. It is not described as MIT or OFL. Android intercepts only the exact existing font URL and delegates every other WebView request normally. This does not clear the QCF V2, Tajweed or IndoPak fonts or corpus.

## Verification

Use npm run build:android, npm run check, then npx cap sync android. The shared/default build stays unchanged for deferred iOS. Required network-disabled checks cover every installed source response, original strings and notes, range selection, source blanks, known font hash, corruption/missing resources, aborts and unrelated request isolation. The APK validator checks every locked source file and the font inside the actual compiled APK, plus native client registration and all original reading hashes. Physical-device testing remains separate.

The publisher collection workflow is a recovery path when the interactive executor is unavailable. It retains the exact manifest/audit and a hash-keyed build cache. It prints only public source identifiers/hashes to preserve the manifest for review, not scripture, credentials or account data.

## Remaining blockers

- Exact current Quran scripts, QCF/Tajweed/IndoPak font sets, word data and layout: no verified independent build-time bundling grant has been established. QF's present terms do not provide a general bundled-content exception; QUL's corresponding per-resource licence pages explicitly lack copyright information.
- Italian Piccardo 153, English abridged Ibn Kathir 169 and Bengali Zakaria tafsir 166: exact identity and applicable independent republication rights remain unresolved. German/Dutch tafsir are already unavailable placeholders, not offline editions.
- All-three reciter audio: MP3Quran permits copying and provides the same three Hafs murattal reciters. Bounded catalogue/timing checks succeeded; complete timing audit and installed playback integration are not completed. Original recordings total about 5.41 GB; the smallest existing publisher-tier combination is 2,456,525,351 bytes before app/data. GitHub release assets must be below 2 GiB, so this exceeds the current download host's single-file limit. No undocumented 32 kbps tier or local re-encoding has been assumed. Publisher-generated clip samples redirected to missing files, so they are not a valid foundation yet.
- Prayer calendars retain their existing network source and limited cache. Account creation and sync inherently require connectivity.

No source substitution is approved unless it is the same reciter or same published translation/tafsir edition. The current public APK, QR destination, signing identity, Site audience and iOS release remain unchanged by this preparation.
