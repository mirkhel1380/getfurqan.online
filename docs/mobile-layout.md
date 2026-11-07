# Small-screen layout refinements

Shared stylesheet: `dist/mobile.css?v=20261031-mobile1`, loaded by all 40 pages and retained by the existing page-header/content generation workflow.

Changes:

- Header controls have 44px touch areas. On very narrow screens the account link shows its existing icon while retaining its accessible text; at 340px and below, the separate search shortcut is omitted from the header. Search remains available through the full navigation drawer.
- Form controls use at least 16px text and 44px height. Login/signup tabs and text actions are easier to tap, and the password eye remains inside its input with a 44px target.
- The auth footer now wraps its links rather than pushing the RTL page wider than its viewport. Other mobile footer navigation uses two columns.
- Reader actions use a two-column grid. Arabic-only mode still hides these tools. Each ayah and its translation retain their existing paired/stacked relationship. Arabic words, source labels, font code and edition data are untouched; unusually wide Arabic content can scroll within its own panel.
- The study passage picker stacks on mobile, verse navigation wraps clearly, and its dark form background now matches the rest of the dark page.
- Audio controls fit their containers; the prayer table retains its own scroll region. Drawer bodies can scroll without squeezing their header/footer.

Observed browser QA used real, same-origin page documents in a temporary iframe at selected CSS viewport widths. This verifies responsive layout in desktop Chrome; it does not constitute testing on physical phones or old mobile browsers. The temporary QA page was removed before packaging.

- 17 public pages were checked in Dari/RTL at 320px: home, reader, study, prayer times, Hadith library/collection/reader, login, contact, progress, translations, listen, topics/article, About, Privacy and 404. None had page-level horizontal overflow.
- Six principal pages also passed the 390px Dari check and the 320px German/LTR check. Home, reader and login passed 768px and 1280px German checks.
- Visible mobile buttons and fields checked in the primary forms/reader reached 44px height; source footnote markers and checkboxes are intentionally exempt.
- The settings drawer fit its viewport; dark study form colors were readable. Signup name/email/password fields measured 50px high with 16px text, and the blank password eye toggled its input type without submitting the form.
- Uthmani, IndoPak and Tajweed rendered the same selected reference at mobile width. Uthmani/Tajweed retained the same source Arabic accessibility label; IndoPak kept its supplied Unicode text. Increasing Arabic size to 54px did not widen the document, and the setting was returned to 36px.

Existing language/theme/topic, metadata and SEO checks are run alongside source/markup preservation checks. No authentication, database, published text, account permissions or source loading code is changed by this update.
