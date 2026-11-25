# Hadith included in Android and iOS installations

This is one part of the requested installed-offline app, not a claim that the entire app works offline. Public Android downloads still refer to the existing owner-signed 0.1.5 preview. The new source is built and checked in the Android trial and unsigned iOS workflows before any public release is changed.

## Exact current content

The mobile build includes all 64 editions selected by the existing ten-collection catalogue. These are editions, not 64 distinct languages or 286,835 distinct reports. They contain 286,835 source rows across languages and collections, with 308,168,666 uncompressed bytes of original JSON. Repeated reports, blank source entries, fractional identifiers, references and published grading fields are preserved. Missing text is not invented. No claim is made that a collection contains only sahih reports.

Source: [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api), pinned revision `df57907be35291c91ad6a6691180e22ca9920784`, the same revision already used by the website. Its [Unlicense](https://github.com/fawazahmed0/hadith-api/blob/df57907be35291c91ad6a6691180e22ca9920784/LICENSE) permits distribution. The publisher links and attributions in the existing interface are retained. The separate HadeethEnc topic selections retain their own source identity and numbering.

`mobile/installed-hadith-lock.json` pins every edition's filename, byte count, row count and SHA-256. Build-time collection fetches only these immutable files, checks hashes and the catalogue, and adds their original bytes to `mobile/dist/installed-hadith/`. A failed or changed source stops the build. The generated data/cache stay out of Git; a fresh CI build downloads them before packaging, not during app use.

## Native operation

A small transport hook runs before the existing hadith module, on the report and book pages only. It maps the two existing pinned source URL forms to installed JSON. Single-report, section and whole-edition fallbacks keep the original record objects. All other fetches retain their existing behavior. The reader, styles, languages, source adapters and Quran files are unchanged. There is no service-worker dependency, first-launch preload or separate user download.

Each first edition access verifies installed bytes before parsing them; at most two edition promises are retained. A missing or corrupt file produces an error and never silently repairs the installation using an external download. The full installation already contains every selected edition, so switching editions does not need internet access.

## Verification and limits

`npm run build` and `npm run check` verify the fixed 180-file compatibility checkpoint, all 64 real packaged editions with external requests disabled, first/last reports, section selection, fractional numbering, source blanks, the unchanged report/book adapter, checksum failures, aborts and unrelated-request isolation. Both Capacitor platform copies are checked against the exact locked bytes. The Android APK and iOS compiled-bundle validators also check all 64 resources, both page hooks and the unchanged reader modules inside the actual native output, and add coverage to their verification reports.

These checks establish data and transport behavior; they do not replace physical Android/iPhone testing. iOS archive output remains unsigned until the owner configures Apple distribution. Quran text/scripts/fonts, Quran translations/tafsir, three reciters without separate download, and prayer calendars are still outside this completed portion. Quran Foundation's current bundle restrictions remain unresolved; no alternative edition or recording has been substituted.
