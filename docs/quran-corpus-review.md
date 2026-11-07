# Complete technical source review — 7 November 2026

All114 chapters and6236 source verse references were retrieved from the same Quran.Foundation endpoints used by the website. The190 chapter/page responses are hashed in the external source manifest; per-response hashes and complete check results are retained in `quran-corpus-review.json`.

The review passed:

- Exact Arabic Uthmani text equality between the chapter reader and whole-corpus endpoint for all6236 verses.
- Exact IndoPak Nastaleeq text equality between those endpoints for all6236 verses, using the actual `text_indopak_nastaleeq` field, not a fallback script.
- Complete chapter counts, bounded and unique references, verse order,77429 source word records,6236 end markers and604 font pages.
- V2 glyph-code sequence equality between word and whole-corpus endpoints. These endpoints place ASCII layout spaces differently around some pause glyphs. Raw spacing differences are retained separately; only U+0020 is excluded in that glyph-code comparison. Arabic text, diacritics and source glyph order are never normalized or changed.
- All1210 required font files parsed:604 Uthmani V2 page fonts,604 Tajweed page fonts, the exact IndoPak v4.2.1 font and the UthmanicHafs end-marker font. No source codepoint lacked a non-`.notdef` cmap glyph. Each actual word uses its own source page's font; end markers use the Unicode marker font. All604 Tajweed files include dark palette1.

The official Tajweed asset route contains `colrv1`, but the actual downloaded fonts expose COLR table version0 with six CPAL palettes. The manifest records this precisely; the URL name is not a claim about table version.

## Independent comparison and limits

The same-format published Tanzil Uthmani1.1 export was compared **exactly**, without text normalization.5925 verses matched exactly;311 references differed. All differing references, the exact download options, SHA256 and complete original Tanzil copyright/version notice are retained in the JSON report. Introductory basmalah presentation and orthographic signs can differ between editions. These are recorded differences, not311 declared errors. No source was automatically corrected or replaced.

This review establishes source structure, endpoint consistency and glyph presence. It does **not** certify every letter's religious correctness, glyph artwork, shaping, diacritic placement, tajweed rules or a printed Mushaf comparison. Qualified full scholarly proofreading remains pending. Firefox OT-SVG fallback files and physical devices were not part of this font audit.

## Reproduction

From the repository root:

1. `python scripts/review-quran-corpus.py --download` retrieves complete chapter/word responses and whole-corpus Uthmani, IndoPak, V2 glyph and numbered Tanzil exports into the sibling `quran-corpus-review` cache. It preserves raw bytes and records every chapter response SHA256. Omit `--download` to reuse an existing cache.
2. `node scripts/check-quran-corpus.mjs` validates the complete raw source corpus, runs the website's real guard over all three script modes and regenerates the review report.
3. With Python fontTools, Brotli and requests available, `python scripts/check-quran-fonts.py` downloads/reuses the matching font cache, checks cmap coverage and rechecks every source/font hash. It writes the font reports in the external cache. The copies retained here are `font-coverage-review.json` and `font-download-manifest.json`.
4. `node scripts/check-quran-integrity.mjs` checks rejection of damaged, duplicated, misordered or out-of-range input, missing requested script fields and incomplete/reordered/non-HTTPS recording lists. It also checks that valid source text is not mutated.

Current source responses and font bytes are external caches, not deployment assets. Readers continue using the original official text/font sources. Hashes describe the reviewed snapshot; they are not a promise that a publisher will never update its source.

## Website behavior updated

- Reader, study, search and recitation tools load the common source guard.
- Search waits for a complete114-chapter reference map before accepting references or a full6236-verse Arabic index; invalid references cannot enter its result cache.
- Study validates the selected Arabic reference before displaying it. Published tafsir editions and source prose remain unchanged.
- Both audio tools reject missing, duplicate, foreign-chapter or reordered verse recordings, and invalid recording URLs, before playing the queue.
- Source review notes in the reader and translations page now accurately describe completed technical checks and pending scholarly review in all13 interface languages.

The native Site audience, authentication, database, edition identifiers and published Quran/translation/tafsir text were not changed by this pass.

Browser validation also passed: Mushaf page604 (112:1–114:6,15 verses) rendered in Uthmani, IndoPak and Tajweed;114:6 displayed its Arabic and the updated Dari source-review note. Study114:6 loaded the matching Arabic. Search2:255 returned the requested Arabic, while1:999 was rejected with no result cards. The listening tool loaded the seven Al-Fatihah recordings in order and selected1:7 correctly. These are desktop browser checks, not physical device or full visual proofreading tests.
