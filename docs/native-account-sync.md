# Native account and optional reading sync · source 0.1.2 / build 3

Native Android and iOS bundles now include email/password sign-in, profile editing, local sign-out, and the website’s reviewed private reading-sync controls. A My account card opens the account page; guests are redirected to sign in. Quran reading remains available without an account. The 13 audited reading/source adapters are copied byte-for-byte, including the 604-page Mushaf layout. No scripture text, translation or tafsir was generated or edited for this change.

The app reuses the pinned vendored Supabase JS 2.118.0 SDK, public project configuration, server-verified `af_me`, profile RPC and existing reading-sync RPCs in Al Furqan project `xtkdiziasltmgwqqnkfn`. No schema, email template, redirect allowlist, SMTP, admin membership or production user changes are needed. App authorization never uses editable user metadata. Account verification errors leave reading account storage blocked. Native URL session detection is explicitly disabled; no access token, refresh token or verifier is passed in a link. Session persistence uses the app’s existing sandboxed web storage, not claimed hardware-backed encryption.

Signup, confirmation resend and password reset open canonical `https://getfurqan.online/login.html?mode=...` links through the pinned `@capacitor/app-launcher@8.0.1` native plugin. These flows run in the system browser, keeping the current PKCE verifier and email callback together. The user must open the email in that same browser, then return to the app and sign in. We do not advertise an automatic native email-link callback without verified app links/signing identities. Native admin pages and web callback routes are omitted. External pages cannot replace the trusted local app origin. App foreground/background events start/stop token refresh.

Reading sync is optional. Existing guest notes, saved verses and reading place are not silently imported. Guest and per-account caches stay separate; explicit import preserves existing account values and deletion markers. Controls include enable/pause/retry, pending changes and conflicts, explicit import and conflict review. Sign-out is local to this app session and retains account-specific pending changes for a later sign-in to the same account. The app offers an email request for account deletion; automatic self-service deletion and store approval are not claimed.

All new explanatory copy is included in the 13 app language catalogs, without changing website catalogs. The new native catalog revision avoids old cached dictionaries. Browser QA checked the 390 px preview (375 px content viewport), Dari RTL, light/dark theme, password visibility, account navigation and guest access. Live account creation, real confirmation emails and real user sign-in were not used as tests. Actual system-browser handoff, keyboard behavior, background refresh and account switching still need Android/iPhone physical-device QA.

Validation:
- `npm --prefix mobile run build` and `npm --prefix mobile run check`: 48 pages and their local routes/assets; one auth client before each reading adapter; no missing admin/callback routes; preserved source hashes and all 13 languages.
- `check-native-account.mjs`: actual app account handler with isolated fixtures, verified-account gate, invalid/unconfirmed/offline/timeout errors, thrown transport errors, duplicate-submit guard, password cleanup, profile RPC and local logout.
- Existing `check-auth-form.mjs`: actual timed/abortable auth transport and web email/resend behavior.
- Existing `check-reading-client.mjs` and `check-reading-sync-local.mjs`: client and PostgreSQL integration in isolated PGlite, explicit import, separate users/admins, live-session verification, offline retry, pause, logout separation, conflicts, CAS and deletion markers. No production test users or emails were created.
- Native bundle verification checks that auth screens, SDK and handlers match the built source as well as preserving all 13 Quran/reading files.

Supabase changelog and current docs were reviewed on 8 November 2026. The Flutter v3 and CLI v3 changes do not apply to this pinned web SDK integration. No modern TLS exception was added for the announced 10 November cipher retirement.

Release boundary: 0.1.2/build 3 is an internal account-enabled CI build. The immutable public Android 0.1.1 APK, its QR code, and previously delivered iOS 0.1.1 archive remain unchanged. Android CI now builds artifacts without automatically publishing ephemeral-signing-key releases. Stable Android signing remains pending; iOS owner signing was explicitly deferred. A successful compiler/bundle check does not establish physical-device correctness or an in-place upgrade path.

References:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/changelog.md
- https://github.com/ionic-team/capacitor-plugins/tree/main/app-launcher

## Compiled build evidence

Both CI runs succeeded for GitHub source `ea0784f2186bc9e6173faacc62141eb4c864277d`: Android run 42495369222 and iOS run 42495369238. Downloaded artifact SHA-256 digests matched GitHub metadata. Local inspection then verified the APK and both nested iOS bundles, exact app source manifests, all 13 preserved reading files, and matching account pages/SDK/handlers. Android artifact digest: `3818ec520b5a4c03819e01f4bd07e5c18ba75bb9a4a4223f2039666a675d6872`; iOS artifact digest: `bbc998984c555469ffc8532a9cdd4b72ce022883ab5ffda4b051638632a67099`. Reports are retained alongside this document as `android-0.1.2-verification.json`, `ios-0.1.2-build.json`, and the two iOS verification reports. These are internal CI builds; the 0.1.1 public downloads were not replaced.
