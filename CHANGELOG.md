# Changelog

All notable changes to the BUSW website are recorded here.

## [Unreleased]

### Added
- Balkan Universal Account (BU Account): registration with email verification, sign in, password recovery, two-step verification, account settings and session management; a client dashboard (saved designs, submissions, quotes); BUSW and account administration with an audit history; and an optional account link in the site navigation that appears only once an account server address is configured. Runs from the new `apps/server` (see `apps/server/docs/BU-ACCOUNT.md`). The marketing pages and the builder keep working with no server.
- Turkish (Türkçe) alongside English, with an English / Türkçe selector in the header of every page. The choice is remembered across pages and visits, sets the page language and updates the title and descriptions. A `?lang=tr` link opens a page in Turkish. Page addresses are unchanged. (The first visit follows the browser language.)
- `flight-companion.html`: details page for BUSW Flight Companion (key capabilities, screenshots, release and downloads, pre-alpha limitations).
- BUSW Website Builder listed on Products as an upcoming product, marked "In development", with a "Discuss your website" link to the contact page.

### Changed
- Products page restructured: upcoming product first, then a separate "Development projects" section containing BUSW Flight Companion ("Development project · Public pre-alpha") with an "Explore the project" action.
- Homepage and About now describe Flight Companion as a development project.
- Refreshed visual system across all pages: header, navigation, buttons, cards and footer; tighter spacing; full-width product screenshots; lighter red tint for red text so it passes WCAG AA contrast.
- Contact email changed from `busw.contact@gmail.com` to `contact@busoftwareworks.com` on all pages.
- Removed the scroll-reveal animation; the mobile menu now closes with Escape.

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
