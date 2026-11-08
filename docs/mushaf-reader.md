# Page-based Quran reader

The reader now opens in a framed Mushaf view by default. Its page boundaries follow the 604-page Madani QCF V2 source. Uthmani and Tajweed group the original source word glyphs by their `page_number` and `line_number`; end markers use the supplied `text_qpc_hafs` with UthmanicHafs. Pages 1 and 2 have eight rows; the remaining fixed layouts have fifteen. Chapter titles and basmalah slots are derived over the entire page sequence, including the An-Nisa title on page 76 with its opening text on page 77. No Quran words, marks or numbering are generated, normalized or repaired.

The small `content/mushaf-pages.json` index records references, counts and empty-line decorations from the already downloaded and hashed corpus. It contains no replacement Quran text. Runtime validation rejects incomplete pages, wrong references, missing words, changed line counts or mismatched font-page coordinates. Physical pages select their exact reference ranges from cached chapter chunks of at most 50 verses. The legacy `by_page` route can select a print mapping inconsistent with its own QCF V2 word coordinates (observed on page 589); it is not used for the new Mushaf view. The complete selected page is validated before rendering.

IndoPak retains the complete, unmodified `text_indopak_nastaleeq` and its matching v4.2.1 font. Where the API lacks word-level IndoPak, text wraps inside the same Madani page boundaries, with a visible explanatory note. It is not presented as a facsimile of a separately paginated IndoPak edition. One audited layout anomaly affects the end marker of 84:21 on page 589: its source line number goes backwards. That page uses a flowing layout in lexical source order instead of moving the marker before its verse. The underlying payload is unchanged. A corrected upstream layout needs a new corpus review and index before changing these checks.

Previous/next buttons move between physical pages, with limits at 1 and 604. Page jump, chapter/juz/verse navigation and direct links resolve to complete pages. The chosen verse is highlighted. Clicking a word or using the keyboard-accessible verse picker opens the existing verse card, including translation-language selection, translator notes, saving, reading progress, keeping a place and the tafsir link. The original verse-by-verse and translation views remain available. Page recitation assembles only the current page's verses, in source order, including pages spanning more than one surah.

Reproduce the exhaustive model check with the previously downloaded corpus folder:

```sh
python scripts/build-mushaf-index.py /path/to/quran-corpus-review
node scripts/check-mushaf.mjs /path/to/quran-corpus-review
node scripts/check-quran-integrity.mjs
```

The check covers all 604 pages, 6,236 verses and 83,665 source word/marker objects; 114 titles and 112 basmalah lines; cross-page titles; exact source-object preservation; all three script payloads; and damaged-page rejection. These are structural software checks, not scholarly proofreading. Existing source and review notices are retained.

The same files are included and hash-checked in the mobile web bundle. Publishing this website change does not update the previously downloaded Android APK or create a signed iPhone installer. New native builds and physical-device testing are separate from browser preview testing.

Primary implementation references:

- https://api-docs.quran.foundation/docs/tutorials/fonts/page-layout/
- https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/
