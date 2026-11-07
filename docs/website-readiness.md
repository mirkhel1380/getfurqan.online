# Website completion pass — 7 November 2026

## Shipped in this pass

- A separate selected-hadith reader, linked from the existing library. Twelve HadeethEnc identifiers each have 13 published language editions, including distinct `prs` Dari, `ps` Pashto and `fa` Persian. This is a selection, not a claim to translate the existing 36,108-entry collection library into these languages.
- Arabic beside the selected translation on wide screens; stacked reading on narrow screens. Published explanation, benefits, source grade and attribution remain in the site. Publisher metadata/version stays visible and in the underlying JSON. All 15 exported fields are preserved unchanged.
- The new interface strings are included in all 13 language packs. Interface language does not change the selected published edition. No generated religious translations, grading or speech.
- Quran reader rejects incomplete or mismatched references, duplicate/out-of-order verses, invalid word/font pages, missing glyphs/end markers and missing requested IndoPak text. It never repairs or normalizes source characters. Initialization rejects incomplete chapter metadata rather than reading without verse bounds.

## Evidence and maintenance

`python scripts/check-hadeethenc.py` compared all 156 selected entries, including every source field and the complete version notice, to the official publisher XLSX exports. Export SHA256 values and versions are in `docs/hadeethenc-import-checks.json` and each language JSON. Source releases differ across languages; the Arabic supplied with that language's export is preserved rather than silently replaced with another release.

To refresh from the publisher, install/use the existing Python openpyxl dependency, run `python scripts/import-hadeethenc.py --refresh`, then run the source check and normal site checks before publishing both mirrors. Inspect any missing IDs/schema or version changes. The importer fails without publishing a partially verified selection. This is an explicit maintenance command; no background update schedule has been configured. Publisher update links are available in each source details panel.

Browser checks: report4560 displayed exact source text, Arabic, explanation, benefits, grade, attribution and full version notice in all13 editions. All12 Dari selections navigated to the matching identifier/text/explanation. Global English/Dari UI switches retained the chosen Dari source edition. The copy button's fallback was exercised because clipboard access was unavailable in this browser. Source details and previous/next navigation were checked.

Responsive browser frames at320/390/768px showed no page overflow. Narrow controls meet44px height; wider copy control was adjusted to44px too. This is a desktop browser responsive check, not testing on physical Android/iPhone devices. Dark selector colors were inspected. Quran1:2 loaded in allthree source script modes after adding the guards.

The initial reference-export check is retained in `docs/quran-technical-review.json`. A subsequent pass completed the full6236-verse source structure/endpoint comparison, exact Tanzil comparison and all1210 matching font codepoint checks. See `docs/quran-corpus-review.md` and its JSON/font manifests for results, differences and limits. None of this constitutes an independent scholarly, letter-by-letter certification of the whole Quran.

## Items requiring something beyond implementation

1. **German/Dutch tafsir republication permission.** DIDI's human German tafsir and Dutch Al-Yaqeen As-Saadi publications exist, but their primary rights statements do not establish permission to embed/rehost them. German Al-Mukhtasar V6 also exists, but its publisher terms restrict republication. No content was scraped or relabelled from translation to tafsir. Existing German/Dutch Quran translations remain available separately.
2. **Scholarly review.** Complete Quran proofreading and religious content certification require a qualified human review process. Structural checks do not replace it.
3. **Search Console ownership/submission.** Sitemap and discovery metadata are prepared; no Google account/property ownership or submission was available. Plugin discovery found a third-party read-only reporting connector, not a tool establishing ownership/submitting this property. No verification token, indexed status or successful submission is invented.
4. **Physical device/store work.** Android/iPhone testing and app-store builds/submission belong to the following app phase. No store release or mobile device test is claimed here.

Primary publisher references checked:

- https://hadeethenc.com/en/home — republication terms and language catalog.
- https://hadeethenc.com/en/home/about — publisher process.
- https://hadeethenc.com/en/browse/download/prs — versioned official source export (other language keys use the same official route).
- https://www.didi-info.de/tafsirdateien and https://www.didi-info.de/impressum.
- https://www.al-yaqeen.com/artikelen/boeken/tafsier-van-imam-as-sasupcsupdiy/81-soerat-at-takwier/.
- https://mokhtasr.com/fa/books/336?aya=1&sura=1 and https://mokhtasr.com/fa/pages/terms-and-conditions.
- https://quranenc.com/api/v1/tafsirs/list — seven published As-Saadi editions; no German/Dutch entry.
- https://api-docs.quran.foundation/docs/api/field-reference/ and https://github.com/quran/qf-api-docs/blob/main/docs/tutorials/fonts/font-rendering.md.
- https://tanzil.net/download/ — unchanged reference text and source terms.
