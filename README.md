# Al Furqan

Buildless Quran website. Static output is in `dist/`; GitHub Pages serves the
same files at repository root. The Sites manifest preserves the existing Site.
The configured custom domain is `getfurqan.online`; direct browser availability
could not be verified from this environment.

Features include Uthmani/IndoPak/Tajweed Quran reading, translations in 13 languages,
recitation, published tafsir, adhkar, search, local study notes and progress.
The home page adds a weekly ayah, an eight-topic Islamic learning section and
a Hadith library covering all ten collections in the chosen published source
(36,108 entries with Arabic and/or English text; full numbering has gaps).
See `docs/hadith-library.md` for coverage and delivery limits.
See `docs/topics-and-weekly.md` for sources and reproduction steps.

Optional verified accounts and private user administration use a separate
Supabase project. Public email registration is enabled with Resend SMTP; new users must confirm their email before signing in.
The owner email has been explicitly approved and reserved; invitation acceptance
and email verification activate its administrator membership. See `docs/accounts-setup.md`.
Guest bookmarks, notes and reading progress remain browser-local. Verified users
can opt into private account synchronization, explicit browser import and conflict review.

Published Quran and translation text is never generated or manually rewritten.
Qualified full-corpus Quran proofreading remains pending; this is not a
certified Mushaf. External providers and fonts require network access.

The auth SDK is pinned and locally vendored with its license. To reproduce:
`npm ci`, then `npm run vendor:auth`.

Complete technical Quran/source/font review: see `docs/quran-corpus-review.md`.
