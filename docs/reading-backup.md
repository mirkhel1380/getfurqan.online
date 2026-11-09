# Guest reading backup · native source 0.1.5 / build 6

A guest can export a portable copy of personal reading records before changing devices or removing an internal trial. The page is linked from Preferences and Reading progress. It is bundled into the native app, not added to the public website. The public Android download stays at verified 0.1.1; iPhone website installation remains the existing PWA guide.

## Included and excluded

Only AFReadingCore's four approved storage domains are read through AFData in guest scope: bookmarks, study notes, reflections, and daily reading progress (date/verse, goal and resume position). Export does not enumerate localStorage. Authentication sessions, email/profile details, account record caches, sync revisions/tombstones and downloaded recitations are absent. Quran/source text is not exported, regenerated or edited.

The JSON is plain text and contains personal notes, so the page asks the user to store it privately outside the app. The native system share sheet is opened only after an explicit button press; the user chooses the receiver/save destination. Closing that sheet is never claimed to prove a durable external copy exists. A new cache copy is retained for receiver access and cleaned up on the next export. Android FileProvider exposes only `cache/reading-backups/`, not the previous broad external/cache roots. Recitation/session directories are not shareable.

## Validation and restore

Format `al-furqan-reading-backup`, version 1, guest scope, canonical ISO timestamp, and an array of unique `(kind,key,value)` records. Unknown envelope/record fields, malformed JSON, unsupported version/scope, duplicate records, deletion values, invalid calendar dates, noncanonical/out-of-chapter verse references, oversized notes and more than 20,000 records are rejected. File size is limited to 4 MiB before reading and again after UTF-8 encoding. Bounds come from the audited chapter catalog, not a loose maximum-verse regex. Text is rendered through textContent; notes are never inserted as HTML.

Selecting a file only previews date/counts. Restore is a separate explicit action. It re-reads current guest data at confirmation time and merges missing records; existing notes, goals, resume and reading entries win. Restoring the same file is idempotent. Switching to an account clears the selection and disables both actions; account reading continues to use opt-in private sync. This feature never imports a file into an account or performs a backend mutation.

Local browser storage spans four keys, so this is **not a multi-key atomic transaction**. On quota failure, some new records may have been written before the failure; existing records remain, the UI reports incomplete saving, and choosing the same file again safely adds what is still missing. It never reports success when AFData indicates nonpersistent storage. There is no automatic backup schedule or claim that cached files survive removing the app.

A backup cannot recover data from an earlier installed app that has no export option. Keep that older app until its local reading data is safe. No uninstall recommendation or in-place upgrade promise is made; stable Android signing remains separate pending work.

## Verification

- Required pure-model tests exercise round-trip including Unicode and HTML-like note text, explicit exclusion of an auth sentinel, schema/date/real-verse/duplicate/size rejection, preview with no writes, additive/idempotent merge, newer-edit preservation, account/loading-scope refusal, persistent/quota failure reporting, navigation and all 13 UI languages.
- All 13 reviewed Quran/reading source files are copied byte-for-byte and hash-checked by the build. Native package verifiers check the exact backup page/bundle alongside the existing reader/account/audio files.
- Browser QA verifies the actual JSON download/file chooser/preview/confirm/reload flows. It does not establish the Android/iOS share-sheet behavior on a physical device.
- Capacitor Share 8.0.3 is pinned and registered by `cap sync` for both native targets. Existing Filesystem privacy declarations remain. No external-storage, microphone, contacts or broad filesystem permission is added.
- Owner-signed iPhone and real Android Files/share-sheet and migration tests remain pending. Current public downloads are unchanged.

Primary references: [Capacitor Share v8](https://capacitorjs.com/docs/apis/share), [Filesystem v8](https://capacitorjs.com/docs/apis/filesystem), [Android FileProvider setup](https://developer.android.com/training/secure-file-sharing/setup-sharing).
