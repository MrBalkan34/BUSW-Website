# Changelog

All notable changes to the BUSW website are recorded here.

## [Unreleased]

### Added
- **Customer journey rework.** The homepage now says what BUSW builds ("Websites and desktop apps, built for your business."), with "Request a website" and "View our work" as its calls to action, and runs in this order: hero, work, services, how a project works, founders, in development, inquiry. The work section shows BUSW's own products with real screenshots, labeled as internal products with their status (no client work is listed); unfinished projects sit below the core services. The internal "Provisional name" notes were removed from Products and the homepage. The header's Contact link is now the navigation's call to action.
- **Services** explains, for each service, who it is for and what it delivers, in plain language, using only scope that exists in the price lists and the order wizard.
- **Project inquiry form** on the Contact page (name, email, what you need, message), reachable from the homepage, Services and the website, Electron and social request pages. Delivery is by email through `api/inquiry.js` and is **not yet configured**: until it is, the form says plainly that nothing was sent and offers the same message as a prefilled email. See `docs/INQUIRY_FORM.md`.
- **Request a website** page: three equal ways to start (inquiry, builder, email), how the builder's estimate works (base website, optional extras, final quote) and a common-questions section built from the price list. Its builder instructions match what the builder does today (it sends nothing; the brief is downloaded and emailed).
- The homepage and About now both name Eymen Balkan and Murat Çağan Ulupınar as co-founders and developers.
- More motion and polish (also switched off for reduced motion): a thin red progress line under the header fills as you scroll (in browsers with scroll-driven animations); a faint dotted grid sits behind the homepage and page headings' glow; a soft light follows the mouse across cards; primary buttons get a light sweep; lists inside cards step in one by one; photos come into focus as they appear; the text fades back in when the language is switched; footer links and the logo respond to hover.
- Motion and visual polish across the site (all of it switched off for visitors who prefer reduced motion): the header turns translucent with a soft blur and gains a shadow as the page scrolls; the nav underline slides in; the red rule under each page heading draws itself and the heading and text rise into place; the homepage hero has a faint red glow; cards lift slightly under a mouse pointer and blocks below the fold fade up as they scroll into view; buttons lift and press, the primary button glows, arrow links nudge forward; status dots pulse gently; pages cross-fade when you move between them in browsers that support it; the footer has a thin red line along its top.
- Products has a new section, "Idea - In active development", with the Istanbul Atatürk Airport 2018 (LTBA) scenery for Microsoft Flight Simulator: what it is, that the project is set up but the airport is not built yet, and that there is no download or release date. English and Turkish.
- Three 2018 photos of the real Istanbul Atatürk Airport (not the scenery) on that card, resized to about 100-150 KB each (`assets/ltba/`). They come from Wikimedia Commons under CC BY 2.0 (Jorge Franganillo) and CC BY-SA 2.0 / 4.0 (János Korom Dr., CeeGee); each carries a visible credit line with author, title, date and licence links, in English and Turkish.
- BUSW's Instagram profile is linked from the footer of every page (next to GitHub).
- The Contact page now links to BUSW's Instagram profile (https://www.instagram.com/balkanuniversalsoftwareworks/, opens in a new tab) next to the email address, and its introduction mentions it.
- The About page now names both co-founders, Eymen Balkan and Murat Çağan Ulupınar (a "Founders" section, "Co-founder and developer"), and no longer says BUSW is run by a single developer; the About and homepage descriptions were updated to match. English and Turkish.
- The **BUSW Electron App Builder** is also shown on the homepage under "Current work" (early preview, with the "In development" watermark, an "Open the wizard" button and a link to its Products card).
- The **BUSW Electron App Builder order wizard** is available as an early preview at `/electron-builder/`, served by this site (built copy committed in `electron-builder/`; source in `apps/electron-builder`). It is only the order wizard: choose screens, features, platforms, signing, updates and care, see an itemized draft estimate, and download a project brief to email to BUSW. It builds and publishes nothing, sends nothing to BUSW, and its prices are a draft that may change. Products ("Open the wizard"), the Electron app build request page (a wizard box plus an email box) and the Services tab link to it. The Electron App Builder card keeps its "In development" watermark, because the builder itself does not exist yet. English and Turkish, sharing the site's language choice.
- A **Services** tab (`services.html`, in the header and footer of every page) with three request boxes: `website-request.html` (a box that opens the website builder, plus an email option), `electron-request.html` (a "coming soon" message with the "In development" watermark; requests are not open) and `social-request.html` (what to include, then an email button). Requests are made by email; the site has no forms or backend. English and Turkish.
- The BUSW Website Builder is available as an early preview at `/builder/`, served by this site (built copy committed in `builder/`; source in `apps/website-builder`). Products and the homepage link to it with an "Open the builder" button and describe what it does today: no publishing and no payments, online submission not connected (clients download a project brief and email it to BUSW). It shares the site's language choice.
- Turkish (Türkçe) alongside English, with an English / Türkçe selector in the header of every page. The choice is remembered across pages and visits, sets the page language and updates the title and descriptions. A `?lang=tr` link opens a page in Turkish. Page addresses are unchanged. (The first visit follows the browser language.)
- `flight-companion.html`: details page for BUSW Flight Companion (key capabilities, screenshots, release and downloads, pre-alpha limitations).
- BUSW Website Builder listed on Products (now marked "Early preview") with a "Discuss your website" link to the contact page.

### Changed
- Products page restructured: upcoming product first, then a separate "Development projects" section containing BUSW Flight Companion ("Development project · Public pre-alpha") with an "Explore the project" action.
- Homepage and About now describe Flight Companion as a development project.
- Refreshed visual system across all pages: header, navigation, buttons, cards and footer; tighter spacing; full-width product screenshots; lighter red tint for red text so it passes WCAG AA contrast.
- Contact email changed from `busw.contact@gmail.com` to `contact@busoftwareworks.com` on all pages.
- Removed the scroll-reveal animation; the mobile menu now closes with Escape.

- Link previews now use the current BUSW logo: a 1200 x 630 image (`assets/busw-social-preview-v2.png`) referenced by absolute `og:image` / `twitter:image` URLs with type, size and alt text, and the Twitter/X card is now `summary_large_image`. Before this, no page declared a preview image. The browser favicon and the touch icon (`assets/busw-icon-v2-32.png`, `assets/busw-icon-v2-180.png`) now use the "B|" from the current logo instead of the old red "B" on black, and `assets/favicon.svg` is removed. External services may keep showing the previous preview until they refresh their cache.

### Fixed
- Horizontal overflow at narrow widths: grid minimums are now `min(100%, …)` and the footer links wrap.
- Removed copy explaining internal brand organization from Products and About.

## [1.0.0] — 2026-08-03

Initial public release.

### Added
- Four-page static site: Home, Products, About, Contact — plain HTML/CSS/JS, no framework, no build step.
- Dark-first BUSW brand identity: black background, white type, red (`#D7263D`) accent, applied consistently across all pages via a single CSS design-token system.
- Products page featuring BUSW Flight Companion (Pre-Alpha), with its own orange identity scoped strictly to its own section, screenshots, feature list, download links (installer + portable), and GitHub release link.
- Accessible responsive navigation with a mobile menu toggle (`aria-expanded`, label swaps between "Menu"/"Close").
- Reduced-motion-aware scroll-reveal on the homepage, honoring `prefers-reduced-motion`.
- Skip-to-content link, semantic landmarks, visible focus states, descriptive alt text on all screenshots.
- Favicon (`assets/favicon.svg`) and Open Graph / Twitter Card metadata on all four pages.
- Direct `mailto:` contact link to `busw.contact@gmail.com`.

### Fixed (release review)
- Added the previously-missing favicon (was 404ing).
- Added missing Open Graph/Twitter metadata for link-preview correctness.
- Corrected a WCAG AA contrast failure on the active/hover navigation state (red text on black measured 3.99:1 against a 4.5:1 requirement); the red underline indicator was kept and the text color switched to white.
- External GitHub links (profile, release, downloads) now open in a new tab with `rel="noopener noreferrer"`.
- Removed inline styles in favor of stylesheet rules; added explicit image dimensions to prevent layout shift.
