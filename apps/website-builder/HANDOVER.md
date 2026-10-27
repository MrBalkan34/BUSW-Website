# Handover: BUSW Website Builder

Written 2026-10-25 at the end of a long session. Read this first, then `README.md` (pricing rules, submission contract).

## Where things stand

- The builder is **built, tested and verified in a browser, but NOT committed and NOT deployed.**
- The marketing site (`index/products/about/contact/flight-companion.html`) is **live and unchanged** by this work. Last pushed commit on `main`: `58e9bab` (redesign + Products restructure + contact email `contact@busoftwareworks.com`). Hosting: Vercel, deploying from GitHub `MrBalkan34/BUSW-Website`, `main`.
- Uncommitted work in the repo (all of it this builder work):
  - `apps/` (the whole app), `.gitignore`, `.vercelignore` (contains `apps/` so the builder is **not** deployed with the marketing site)
  - `.claude/launch.json` (adds a `website-builder` entry)
  - `.claude/settings.local.json` is tool noise (permission allowlist). **Do not commit it.** Also never commit `desktop.ini`.
- Checks at hand-off: `npm run typecheck` clean, `npm test` 262 passing, `npm run build` OK (JS 549 kB, 171 kB gzipped).

## What the owner (Eymen Balkan) wants

- BUSW is an **independent studio run by one freelance developer**, not a company or corporation. Avoid wording that implies otherwise.
- **Honesty over polish**: never claim something was sent, received, built or working when it was not. The Products page says the builder is "In development" and that none of its capabilities exist yet; keep that true until it is launched.
- **Only commit, push or deploy when explicitly asked.** The owner has been precise about which files to stage.
- Business model for the builder: clients design a site, pick paid add-ons, see an estimate, and **submit to BUSW**; BUSW reviews and confirms scope and price before work starts. No self-service publishing, no payments in v1.

## The one big open question: where do submissions go?

There is **no backend**. Today "Submit to BUSW" is disabled and the Review step offers an interim downloadable brief (`.zip`) that the client must email to contact@busoftwareworks.com themselves. Nothing reaches the owner automatically.

The owner asked "does it come to my email inbox?" and the answer given was: not yet. My recommendation, not yet agreed:

1. A small service that **stores** each submission (verified design + images + recalculated price) and **emails the owner a notification with a link**, rather than attaching everything (size limits, lost mail). Optionally email the client a receipt.
2. Run `verifySubmission` (`src/submission/verify.ts`, pure TS, no DOM/React) on the server and store only `trusted.estimate`.
3. Reply `201 {"reference": "..."}` only after storing. The browser reports success only for that.
4. Constraints to decide: request body size (images inline up to 60 x 4 MB; Vercel functions cap around 4.5 MB, so either pick a host without that cap or upload images separately), CORS, rate limiting/bot check, durable storage, a privacy notice (personal data), retention.
5. Then set `VITE_SUBMISSION_URL` at build time (`.env.example`). The full contract is in `README.md` under "Going live".

**Before any of that: confirm the mailbox `contact@busoftwareworks.com` actually receives mail.** I never tested it.

## Language support (English / Türkçe), added 2026-10-25, local and not committed

Full detail is in `README.md` under "Languages". What a new maintainer needs:

- The whole builder UI is translated through `src/i18n/`. The marketing site has its own, simpler system (`js/i18n.js`, `js/i18n-strings.js`
  at the repo root; pages carry English text plus `data-i18n` keys). Both use the same storage key, `busw.lang`, but they are different origins,
  so a link from the marketing site to the builder should carry `?lang=tr` to hand the choice over.
- `tests/site-i18n.test.ts` checks that every English string in `js/i18n-strings.js` still matches the HTML. **If you edit text on a marketing
  page, edit it in the HTML and in both tables, or that test fails.**
- Not translated, deliberately: submission payloads, catalogue wording in the data, template starter content (and the "New link", "New item",
  "Page N" placeholders for added items), the exported site's own fixed words ("Skip to content", "Email", "Phone", "Address"; these belong to the
  client's site and its `site.lang`), technical file-validation details, server error lists returned by a submission service.
- Money is formatted by the price list's locale, not the interface language. Do not change that.
- There are no accounts, dashboards or staff screens yet, so nothing there is localized. BU Account screens must use `src/i18n` from the start.

## Balkan Universal Account (added 2026-10-27, local and not committed)

Server in `apps/server` (Better Auth + Hono + SQLite), screens in `src/account/`. Read `apps/server/docs/BU-ACCOUNT.md` first: approach, setup, exact founder provisioning, migrations, the future-application guide and what is still needed (server hosting with a disk, an email provider and verified domain, privacy notice and terms). Things to know:

- The submission contract in "Going live" is now implemented by the server (`POST /api/submissions`, signed-in account required). `VITE_SUBMISSION_URL` still overrides it for an external service.
- The server imports the builder's validators and pricing from `apps/website-builder/src` so the two cannot drift. Keep `model/`, `pricing/` and `submission/verify.ts` free of DOM and React imports.
- All new screens are translated (English and Turkish). `tests/i18n.test.ts` fails if a Turkish string is missing.
- The browser caught a bug the component tests missed (an admin response lacked a field the screen needed): after changing an API response, run the real server and click through it, not only the tests.

## Suggested next steps

1. Owner decides: commit the builder as-is? Suggested files: `apps/website-builder/` (excluding `node_modules`, `dist`), `.gitignore`, `.vercelignore`, `.claude/launch.json`. Not `.claude/settings.local.json`.
2. Owner confirms the **six pricing interpretations** below (change them in `catalogue.ts` / `estimate.ts` and the tests if wrong).
3. Plan and build the submission service (above), then wire the env var.
4. Test in Firefox and Safari (only Chromium was tested). Check on a real phone.
5. Decide how/where the builder itself gets deployed. It is deliberately excluded from the marketing site's Vercel deploy, so it needs its own project or a config change.

## Pricing interpretations awaiting confirmation

The brief was ambiguous here; current behaviour is deliberate and covered by tests (`tests/pricing.test.ts`):

1. The price table is read as **whole currency units** (USD 399 = 39 900 cents; TRY 19 900 = 1 990 000 kuruş).
2. **Header and footer do not count as sections**; only page sections do.
3. A **custom-layout page keeps its 6 included sections**; sections beyond 6 on it still add the section charge.
4. **Photo gallery** is a quantity add-on, not auto-charged when the design has a Gallery section (a hint is shown).
5. The base package's **standard contact form** is delivered by BUSW; the preview shows contact details only.
6. ~~The static-copy .zip download~~ **Removed on the owner's instruction (2026-10-27).** The Preview step is read-only. Clients can still save a project file (design data) and, with no account server, the interim brief; neither is a website.

Also note: money is formatted with the **region's** locale (en-US / tr-TR / en-IE), never the browser's. Dates use the browser locale.

## How the code is organised (details in README)

- `src/model/`: project types v2 (pages + `order`), strict validator with v1 to v2 migration, history reducer, link sanitiser.
- `src/pricing/`: `catalogue.ts` (single source of prices, versioned), `regions.ts` (country to region), `estimate.ts` (pure), `format.ts`.
- `src/submission/`: `snapshot.ts`, `verify.ts` (server-side), `brief.ts` (interim zip), `transport.ts`, `clientDetails.ts`.
- `src/wizard/`: the six steps, `EstimatePanel`, `workspace.tsx` (context), `steps.ts` (what needs attention).
- `src/editor/`: Design step (canvas iframe, inspector, section/page list, image import).
- `tools/mock-submission-service.mjs`: scriptable fake endpoint for testing failure handling (see below).

Design rules worth keeping:
- The reducer must **return the same state object for no-op edits** (unknown targets etc.) so no phantom undo steps appear. `mapSections` preserves page identity for the same reason; tests guard both.
- Changing the country must never touch pages, theme, assets or add-ons (tested).
- The preview iframe height is measured from `body.getBoundingClientRect()`. Do **not** use `documentElement.scrollHeight` (it can never shrink).
- `html { scroll-padding-top: 7.5rem }` keeps focus clear of the sticky header. Keep it if the header height changes.

## How to run and test

```bash
cd apps/website-builder
npm install
npm run dev          # http://localhost:5174 (strict port)
npm test && npm run typecheck && npm run build
```

Test the live submission paths against the mock service (this was done by hand; it is not automated):

```bash
node tools/mock-submission-service.mjs                       # listens on :5199
VITE_SUBMISSION_URL=http://localhost:5199/submit npx vite --port 5176 --strictPort
# switch behaviour: GET http://localhost:5199/__mode?m=ok|500|503|noref|nojson|422|hang
# see what it received: GET http://localhost:5199/__log
```

## Environment gotchas (Windows, this machine)

- The project lives at `C:\Users\PC\Projects\BUSW-Website`, a **fresh clone outside OneDrive**. The old OneDrive folder (`...\BUSW Website`) was emptied on Oct 18 by something unknown and is not a working repo. Do not use it.
- The Claude preview tool (`preview_start`) still looked in the **old OneDrive folder** for `.claude/launch.json`. Start dev servers yourself in the background and `navigate` the browser tab to the localhost URL.
- **Stopping a background task does not kill the node child process.** Servers kept listening on their ports. Kill by port: `netstat -ano | grep :5174`, then `taskkill //PID <pid> //F`. Check ports 5174, 5176, 5199 are free at the start and end.
- The browser pane can be very small. Screenshots are **cropped to the real pane size**, not scaled, so phone-width visuals may be cut off. Use DOM measurements (`scrollWidth`, `getBoundingClientRect`) for layout checks, and re-set the viewport after the pane resizes.
- `window.confirm` blocks scripted runs. Override it first: `window.confirm = () => true`.
- Setting React inputs from scripts needs the native value setter plus a dispatched `input`/`change` event. Two clicks fired in the same tick can lose one increment (stale closure); real users are unaffected.
- Draft data lives in IndexedDB **per origin**, so `localhost:5174` and `localhost:5176` have separate drafts. Clear with `indexedDB.deleteDatabase('busw-website-builder')`.
- Shell quoting: for multi-line edits use a small `.mjs` script file rather than `node -e` with apostrophes.
- Versions: Node 24, TypeScript 7.0.2, Vite 8.3.5, Vitest 5.0.5, React 19.3.1, fflate 0.8.3.

## Known limitations

- Single language per design; extra languages are ordered, not edited.
- Plain text only (no bold/italics/inline links); images JPEG/PNG/WebP only; drafts live on one device.
- Add-ons only record requested work; nothing about them appears in the preview.
- The main JS bundle is over 500 kB (Vite warns). Fine for now; `react-dom/server` is needed on the first screen for template thumbnails.
- `BUSW_WEBSITE_HANDOVER.md` at the repo root is an **older, stale** note from the original site build (it still uses "company" wording). It is not part of this work.
