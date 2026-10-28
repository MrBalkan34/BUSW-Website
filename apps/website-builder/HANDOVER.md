# Handover: BUSW Website Builder

Written 2026-10-25 at the end of a long session. Read this first, then `README.md` (pricing rules, submission contract).

## Where things stand

Updated 2026-10-28 (final state of the "early preview" release). The sections below this one are from 2026-10-25; where they disagree with this one, this one wins.

- **The builder is live-ready as an early preview at `/builder/`, served by the marketing site** (same Vercel project, same origin). Products and the homepage link to it ("Open the builder"). Because it shares the site's origin it also shares the `busw.lang` language choice, so no `?lang=` hand-over is needed.
- **How it is served:** `npm run build` (in `apps/website-builder`) typechecks and writes the app to `../../builder` with base `/builder/`. **That generated `/builder` directory is committed**, because the host serves plain static files with no build step. `.vercelignore` still excludes `apps/` (source is not deployed). **After any change to the builder source, run `npm run build` and commit `/builder` too, or the live copy is stale.** The built copy contains no submission URL (`VITE_SUBMISSION_URL` is unset).
- **Submission is NOT connected.** The Review step says so explicitly (English and Turkish): downloading the project brief sends nothing to BUSW; the client must email the downloaded `.zip` to contact@busoftwareworks.com as an attachment, and BUSW only learns of the project when that email arrives. There is no reference number and no receipt. Do not soften this wording while there is no server. **Still untested: that the mailbox contact@busoftwareworks.com actually receives mail.**
- **BU Account is postponed until the owner has a server.** The account server and its screens are intact on the `accounts` branch (commits `e58473f`, `ca58fc2`). Do not start account work and do not merge that branch. `apps/server/` on `main` holds only an ignored local `data/` folder (dev database and `dev.secret`) and `node_modules`.
- **Ignore rules:** `.gitignore` ignores `apps/server/data/`, `.env` / `.env.*` (but not `.env.example`), `*.sqlite*`, `*.secret` and `.claude/settings.local.json`. The latter is no longer tracked; the local file remains. Never commit `desktop.ini`.
- **Checks at this state:** `npm run typecheck` clean, `npm test` 336 passing (11 files), `npm run build` OK (JS 616 kB, 189 kB gzipped; Vite warns the chunk is over 500 kB).
- **Verified by hand in Chromium (2026-10-28):** Products and homepage links open `/builder/`; `/builder` and `/builder/` both load; the language chosen on the site carries into the builder (Turkish checked); the Review step shows the new notice in both languages; the brief download produces `busw-brief-<name>-<date>.zip` containing `brief.html`, `submission.json` and `design.busw-site.json`. **Not tested:** Firefox, Safari, a real phone, the mailbox, and links between pages inside the preview (the only template tried has one page).
- **Known small issue:** the brief file name drops non-ASCII letters, so "Örnek Kafe" becomes `busw-brief-rnek-kafe-…zip`. Harmless, but worth transliterating Turkish letters (ö ü ş ç ğ ı) in the slug in `src/submission/brief.ts`.
- The builder is `noindex` (see `apps/website-builder/index.html`) while it is an early preview.
- Hosting: Vercel, deploying from GitHub `MrBalkan34/BUSW-Website`, `main`. At the time of writing, the commits after `58e9bab` (Turkish/English site, the builder, this release) are **not pushed**.

## What the owner (Eymen Balkan) wants

- BUSW is an **independent studio run by one freelance developer**, not a company or corporation. Avoid wording that implies otherwise.
- **Honesty over polish**: never claim something was sent, received, built or working when it was not. The Products page calls the builder an "Early preview" and says it does not publish, take payments or submit online; keep that true until it changes.
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
- There are no accounts, dashboards or staff screens on `main` (the postponed BU Account work is on the `accounts` branch), so nothing there is localized. Any BU Account screens must use `src/i18n` from the start.

## Suggested next steps

1. Push the release when the owner asks (nothing is pushed or deployed yet), then open `/builder/` on the live site and re-check the Products and homepage links.
2. Confirm the mailbox contact@busoftwareworks.com receives mail, since the interim brief depends on it.
3. Owner confirms the **six pricing interpretations** below (change them in `catalogue.ts` / `estimate.ts` and the tests if wrong).
4. Plan and build the submission service (above) once there is a server, then wire `VITE_SUBMISSION_URL`. BU Account stays postponed until then.
5. Test in Firefox and Safari (only Chromium was tested). Check on a real phone.
6. Transliterate Turkish letters in the brief file name (see "Where things stand").

## Pricing interpretations awaiting confirmation

The brief was ambiguous here; current behaviour is deliberate and covered by tests (`tests/pricing.test.ts`):

1. The price table is read as **whole currency units** (USD 399 = 39 900 cents; TRY 19 900 = 1 990 000 kuruş).
2. **Header and footer do not count as sections**; only page sections do.
3. A **custom-layout page keeps its 6 included sections**; sections beyond 6 on it still add the section charge.
4. **Photo gallery** is a quantity add-on, not auto-charged when the design has a Gallery section (a hint is shown).
5. The base package's **standard contact form** is delivered by BUSW; the preview shows contact details only.
6. ~~The static-copy .zip download~~ **Removed on the owner's instruction (2026-10-27).** The Preview step is read-only. Clients can still save a project file (design data) and download the interim brief; neither is a website.

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
