# Changelog

All notable changes to the BUSW website are recorded here.

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
