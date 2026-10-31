# BUSW Electron App Builder (in development)

Status: **a public early preview of the order wizard, on a draft price list.** It is served by the site at
`/electron-builder/` and linked from Products, Services and the Electron app build request page. It is not connected to
BUSW and builds nothing. The builder itself does not exist yet, so the site still marks the product "In development"
(the watermark on its Products card) and the wizard says so in its first banner. The prices are a draft: keep them
labelled as such until the catalogue is frozen.

Published like the Website Builder: `npm run build` writes the finished app to the repo root `electron-builder/`, which
is committed, so the host serves plain static files. **After any change under `apps/electron-builder`, rebuild and
commit `electron-builder/`.** The source stays out of deployment (`apps/` is in `.vercelignore`).

## What it does today

A six-step wizard in the same look and behaviour as the Website Builder (it loads that app's interface stylesheet):

1. **Country and app**: business country (decides price list and currency), app name and purpose, what every app includes.
2. **Screens and features**: extra screens, bespoke screen designs (never more than the screens), native integrations,
   local database, REST APIs, extra languages, user guides.
3. **Platforms and release**: macOS, Linux and Windows-on-Arm builds, Windows / macOS signing, auto-update, CI pipeline,
   error reporting, and the costs the client pays directly. Inconsistent choices are flagged, not hidden.
4. **Support and scope**: revision rounds, monthly app care, the eight quote-only kinds.
5. **Your details**: business, contact, email, notes.
6. **Review**: summary, itemized estimate, acknowledgement, and **Download project brief** (a zip with `brief.html` and
   `request.json`).

The estimate is shown in a side panel and in the header, and updates as options change. English and Turkish, sharing the
site's saved language (`busw.lang`, `?lang=`). Prices never follow the interface language, only the chosen country.

Nothing is sent. The review step says so in both languages: downloading a brief sends nothing to BUSW; the client must
email the file to contact@busoftwareworks.com. The draft is saved in this browser only (`localStorage`).

```bash
npm install
npm run dev        # http://localhost:5176
npm run typecheck
npm test
npm run build      # to ../../electron-builder (committed, served at /electron-builder/)
```

## Layout

- `src/pricing/catalogue.ts`: draft catalogue `electron-2026-11.0-draft`. Every add-on is `hours × HOURLY_RATE` per
  region; only the base app is rounded ($1,199 / ₺59.900 / €1,049).
- `src/pricing/estimate.ts`: `calculateEstimate(order)`: totals, planning hours, quote-only requests, `issues`.
- `src/pricing/shared.ts`: regions, countries and money formatting re-exported from the Website Builder.
- `src/model/draft.ts`: what the client enters, defensive loading of a saved draft, steps and step issues.
- `src/wizard/`: the steps and the estimate panel. `src/ui/`: form controls and a small stylesheet.
- `src/i18n/`: translator, language switcher, `messages/en.ts` (typed) and `messages/tr.ts`.
- `src/submission/brief.ts`: the downloadable brief. Turkish letters are folded in the filename (`Örnek` gives `ornek`).
- `tests/`: catalogue figures transcribed independently of the code, both worked examples, draft handling, translation
  completeness, the brief, and the wizard itself.

## Decisions made while encoding (please confirm)

- "App care, each extra platform" counts Windows, macOS and Linux once each. **Windows on Arm is not counted**, because
  it is a second build of the same platform. The catalogue does not say; it matches worked example B ($200).
- macOS signing is only charged when the macOS build is ordered; otherwise it is left out and reported as an issue.
- Auto-update on a macOS build without macOS signing is priced but reported as an issue.
- A bespoke screen design can be ordered only for a screen that exists (3 included plus extra screens).
- Per-line planning hours are kept in the brief's `request.json` for BUSW. They are not shown to clients.
- The app name is required; the purpose is optional.

## Still open (from the catalogue's own risk list)

- The hour figures are planning numbers, not measured. Check them against time logs after the first two or three
  projects and bump the version. 30 hours for the base app is tight for a one-person studio.
- `platform-macos` needs a Mac or a hosted macOS CI runner. Without one, keep it out of the wizard.
- Windows signing in Türkiye: Azure Artifact Signing eligibility is not confirmed.
- A cheaper entry product (wrapping an existing website as a desktop app) is not priced.
- End-of-support wording for clients without a care plan belongs in the contract.
- The wizard only records a request. There is no working builder behind it, no online submission and no payment.

## Roadmap

1. v0.2: review the hours and the open decisions above, then freeze `electron-2026-11.0`.
2. v0.3 (done as a draft): the catalogue in TypeScript with tests.
3. v0.4 (done as a draft): the order wizard and brief, local only.
4. v0.5 (done): published as an early preview at `/electron-builder/`, linked from Products, Services and the Electron
   request page.
5. Next: freeze the catalogue, then connect online submission once there is a server, and build the builder itself.
