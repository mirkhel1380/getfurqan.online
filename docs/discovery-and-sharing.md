# Discovery and link sharing

Canonical public origin: `https://getfurqan.online`. Existing Site audience and account authorization are unchanged.

- `sitemap.xml` lists 32 public canonical landing, article and collection pages. It excludes account/admin/auth, personal progress, search results, dynamic Hadith reader/book tools and the 404 page. No invented modification dates or hundreds of empty parameter pages are emitted.
- `robots.txt` advertises the sitemap and permits fetching resources. Non-indexable pages have their own robots meta tags; they are not blocked from crawling in robots.txt, so crawlers can read `noindex`.
- All 41 HTML pages have descriptions, robots rules and Open Graph/Twitter card fields. Public pages also have basic WebSite, Organization, WebPage and breadcrumb JSON-LD. No ratings, certification, charitable status or search-ranking claims are invented.
- The original outlined wordmark is used in the 1200×630 PNG share card. `python scripts/build-share-image.py` regenerates it with Inkscape and Pillow. It must be included as a binary deploy asset in both mirrors.
- Four URL-driven readers set their canonical link in JavaScript rather than contradicting an initial static canonical. Navigation updates it explicitly. Quran passage identity and study edition are retained; tracking, private queries, view preferences and search terms are omitted. Hadith reader/book routes remain `noindex,follow` while client-rendered. Their server-delivered link preview is generic; unique server-rendered ayah/Hadith preview cards are not provided.
- `404.html` uses the shared navigation, footer, theme and 13-language UI. Its search form submits to the existing search page. Root-relative assets/links work when the host serves it for a nested missing URL. `.nojekyll` preserves static publishing in GitHub Pages.
- `build-page-headers.py` runs the idempotent SEO builder after content regeneration, so the existing topic, legal, prayer and Hadith generators retain metadata.

Validation: `python scripts/check-seo.py`, `node scripts/check-metadata.mjs`, language/theme/topic checks, JS syntax and diff checks. The custom page and its search form were checked in the managed browser; that preview server displays its own `Cannot GET` for an unknown URL rather than applying the production host's 404 convention. Production routing is checked separately when accessible. Native Sites remains owner-private, and its sign-in gate is intentional. Public search discovery concerns the existing GitHub Pages custom domain. Search Console submission and actual Google indexing are not claimed by this change.

Primary documentation used:

- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/robots/intro
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
