# Search Visibility and SEO Audit Report

This report summarizes the SEO and crawlability audit and implementation completed for the **EmberChamber** web platform.

---

## 1. What Was Changed & Why It Matters

### A. Canonical Metadata Corrections
- **The Issue:** The root layout previously configured a global canonical URL set to `/`. This caused every subpage to tell search crawlers that the homepage was the canonical target, collapsing search rank signals for unique subpages (like `/download` or `/privacy`).
- **The Fix:** Removed the global alternates block from `apps/web/src/app/layout.tsx`. Created a reusable `createMetadata` helper in `apps/web/src/lib/metadata.ts` that automatically sets page-specific, absolute canonical URLs based on the custom path (e.g. `/download` canonicalizes to `/download`, `/start` to `/start`).

### B. Sitemap Coverage Expansion
- **The Issue:** The sitemap included `/login` and `/register` (which are low-value authentication gateways) but lacked navigation-critical routes (like `/start` and `/support`) and new pages.
- **The Fix:** Configured `apps/web/src/app/sitemap.ts` to index all 17 public routes, including the new `/changelog`, `/security`, `/docs`, and all `/docs/*` subpages. Removed `/login` and `/register` from the sitemap.

### C. Homepage Title & Copy Tuning
- **The Issue:** The default browser title was simply "EmberChamber", lacking descriptive keywords.
- **The Fix:** Changed the default title to `EmberChamber — Invite-Only Encrypted Messaging`. Refined the H1 from "Private messaging for your trusted circle." to "Invite-only encrypted messaging for trusted circles." Adjusted the lead paragraph to include key search queries ("private messaging app", "encrypted direct messages", "small group chats", "local-first history", "device-local search", "relay boundaries") without keyword stuffing or making misleading cryptographic claims.

### D. Structured Data (JSON-LD) Integration
- **The Fix:** Created a safe `<JsonLd>` schema injection component. Injected `Organization` structured data on the homepage, and `SoftwareApplication` structured data on the download page detailing application categories, operating systems, download targets, and source code repository links.

### E. Authenticated Page indexing Protection
- **The Fix:** Added `noIndex: true` using our metadata helper to `/login` and `/register` pages, generating `robots: { index: false, follow: false }` tags to shield low-value authentication pages from index pollution.

---

## 2. Content & Pages Added

We created 10 new, crawlable content routes:
1. **/changelog** - Dynamically fetches and displays recent releases from the GitHub repository API (falling back to a static list if rate-limited) and addresses beta version alignments.
2. **/security** - Provides a contact email (`support@emberchamber.com`) and outlines testing ground rules and responsible vulnerability disclosure paths.
3. **/docs** - An index hub summarizing our key trust and platform design principles.
4. **/docs/no-phone-number-private-messaging** - Explains our email bootstrap and invite-only flow, contrasting it with number scanning.
5. **/docs/local-first-messaging** - Covers local SQLite history, search index localization, and recovery compromises.
6. **/docs/relay-boundary** - Details edge relay coordination vs. ciphertext payload encryption limits.
7. **/docs/encrypted-group-chat** - Details epoch keys, membership updates, and legacy boundaries.
8. **/docs/android-private-messenger-beta** - Setup APK instructions and status update for Android.
9. **/docs/windows-encrypted-messenger** - Tauri Windows shell features and desktop boundaries.
10. **/docs/ubuntu-encrypted-messenger** - .deb and AppImage instructions for Linux/Ubuntu operators.

We also added a root repository security policy file:
- **SECURITY.md** - Pointing security researchers to the `/security` site page.

---

## 3. Files Modified or Created

- `apps/web/src/lib/metadata.ts` (NEW metadata helper)
- `apps/web/src/lib/site.ts` (MODIFIED footer navigation, added docsNav menu)
- `apps/web/src/components/json-ld.tsx` (NEW structured data renderer)
- `apps/web/src/components/docs-page.tsx` (NEW interactive docs template wrapper)
- `apps/web/src/app/layout.tsx` (MODIFIED canonical layout config, set default title)
- `apps/web/src/app/page.tsx` (MODIFIED H1 copy, added metadata, added JSON-LD Organization)
- `apps/web/src/app/download/page.tsx` (MODIFIED H1 copy, added metadata, added JSON-LD SoftwareApplication)
- `apps/web/src/app/privacy/page.tsx` (MODIFIED page metadata)
- `apps/web/src/app/beta-terms/page.tsx` (MODIFIED page metadata)
- `apps/web/src/app/trust-and-safety/page.tsx` (MODIFIED page metadata)
- `apps/web/src/app/support/page.tsx` (MODIFIED page metadata)
- `apps/web/src/app/login/page.tsx` (MODIFIED page metadata, set noindex)
- `apps/web/src/app/register/page.tsx` (MODIFIED page metadata, set noindex)
- `apps/web/src/app/sitemap.ts` (MODIFIED sitemap route definitions)
- `apps/web/src/app/changelog/page.tsx` (NEW release notes log)
- `apps/web/src/app/security/page.tsx` (NEW responsible disclosure guidelines)
- `apps/web/src/app/docs/page.tsx` (NEW docs hub)
- `apps/web/src/app/docs/*` (NEW 7 docs articles)
- `SECURITY.md` (NEW root security file)
- `docs/seo/brand-collisions.md` (NEW audit notes)

---

## 4. Manual Next Steps

The following actions cannot be completed in code and should be performed by the domain owner:

### Submit the Sitemap
1. **Google Search Console:** Log into Search Console, select `emberchamber.com`, navigate to **Sitemaps**, and submit `https://emberchamber.com/sitemap.xml`.
2. **Bing Webmaster Tools:** Log into Bing Webmaster, navigate to **Sitemaps**, and submit `https://emberchamber.com/sitemap.xml`.

### Request Indexing
- Request manual URL indexing for key landing zones to accelerate crawler discovery:
  - Homepage (`https://emberchamber.com/`)
  - Download (`https://emberchamber.com/download`)
  - Trust & Safety (`https://emberchamber.com/trust-and-safety`)
  - Security (`https://emberchamber.com/security`)

### Validate Structured Data
- Open the [Google Rich Results Test](https://search.google.com/test/rich-results) and input `https://emberchamber.com/` and `https://emberchamber.com/download` to verify that the injected JSON-LD schema is parsed without warnings.

### Check Index Status
- Monitor active indices in search fields by executing:
  `site:emberchamber.com`
- Confirm that `/login`, `/register`, and active app pages are not present in the results.
