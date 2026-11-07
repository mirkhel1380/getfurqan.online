# Expanded learning topics — 7 November 2026

The topic library now has 18 standalone guides in six categories and108 article sections. The original eight guides keep their original introductory text, paragraphs, references and routes, with three additional sections each. Ten new guides cover fasting/Ramadan, purification, Hajj, knowledge, parents/family, neighbours/community, honesty/trust, gratitude, the Prophetic example and time/responsibility.

Every guide has six sections, a table of contents, related verse links, takeaways and links to related topics. Per-section citations open the existing Quran reader inside Al Furqan. The home page links to all 18 topics. The reading-time label is derived from article length rather than a fixed estimate.

These are owned, referenced introductory editorial articles. They remain separate from the unchanged Arabic Quran, named translations, published tafsir and Hadith source texts. Practical reflection suggestions are not presented as new religious prescriptions. This expansion does not assert scholarly certification or provide personal rulings.

Topic paragraphs, headings, introductions, categories, reference labels and controls use the existing13-language interface catalogs. Scripture reference numbers, Arabic card labels, original routes and edition choices stay unchanged. Published religious source text has not been translated or rewritten by this work.

`content-topics.json` is the content source. `scripts/build-topics.py` generates all 18 articles, the hub, search index, shared headers and SEO metadata. The search index contains the same owned article strings and is translated through the current interface catalog at search time. Search covers article text as well as card titles and introductions, combines with category filters, refreshes after language changes and retains card search if its index cannot load.

Primary reference checks used the official QuranEnc `english_saheeh` chapter endpoints and the source passages displayed by Quran.com. Exact API response URLs/hashes and reference coverage are retained in `topic-reference-checks.json`. No external translation paragraphs were copied into these articles. Verse links in the product lead to Al Furqan's named published editions and tafsir tools. Source matching and link checks do not constitute a scholarly review of every editorial statement.

Validation commands:

- `python scripts/check-topics.py` checks guide completeness, verse bounds, section/source links, related topics, search-index coverage and all local page/asset links. When the external reference cache is present it rechecks its hashes and published verse identities; `--download` refreshes that cache from the official publisher.
- `node scripts/check-topic-languages.mjs` checks complete article localization in13 languages, preserved numeric references, English restoration and preservation of the original eight guides.
- `node scripts/check-topic-search.mjs` checks article-text search, category combinations, empty states, counters, language changes and safe fallback for an unavailable/invalid index.
- Existing site-language, SEO, metadata, theme and source-data preservation checks remain in place. Public metadata now covers51 pages and42sitemap URLs.

Before moving to apps, the general website work is available for app development. The external items already recorded in `website-readiness.md` remain separate: qualified religious proofreading, republication permission for German/Dutch tafsir, Google Search Console property ownership and physical device/store testing. No claim of production email delivery, Google indexing, physical device validation or store acceptance is added by a topic/link audit.

Browser review passed for category filtering, an empty search, English article-text search and Dari article-text search. Expanded fasting guides displayed all six translated sections in Dari, Pashto and German, with unchanged verse links. Table-of-contents navigation positioned the selected section below the header. Responsive frames at 320/390/768px in Dari showed no horizontal page overflow; the fasting/family guides also fit 320px. Light and dark themes were checked. These were desktop browser responsive checks, not physical phone tests. See `app-handoff.md` for the concrete app phase, including account deletion and returning from confirmation/reset links.
