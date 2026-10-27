# BUSW Website Builder (in development)

A local-first website builder for BUSW's clients. A client picks a country and template, edits the site, previews it on
desktop and mobile, chooses paid add-ons, reviews an itemized estimate, and **submits the finished design to BUSW**. BUSW
reviews the submission and confirms scope and price before any work starts.

This first version does **not** publish websites and does **not** take payments.

> Status: pre-release and **not deployed**. `apps/` is excluded from the marketing site's Vercel deploy by `/.vercelignore`,
> and the Products page still describes the builder as "In development".

## Run it

```bash
cd apps/website-builder
npm install
npm run dev        # http://localhost:5174
npm test           # unit tests (Vitest)
npm run typecheck
npm run build      # typecheck + production build into dist/
```

Needs Node 20.19+ (developed on Node 24).

## The client flow

1. **Country and template.** Choose the business country (decides price list and currency only) and a template.
2. **Design.** Pages, sections, text, images, colours and font. Click text in the preview to edit it.
3. **Preview.** Read-only desktop and mobile views of every page, with working links between pages.
4. **Add-ons and estimate.** Add-ons plus an itemized estimate that is always one click away (the header's *Estimate* button).
5. **Your details.** Business name, contact name, email, notes.
6. **Review and submit.** Everything in one place, with the estimate and the send actions.

Clients can jump between steps at any time. The whole workspace (design, add-ons, details, current step, and whether it was
sent) is saved automatically **on the client's device** in the browser's IndexedDB, and restored on return. The app says so
on the first screen. Clearing site data removes it; *Save project file* in the Design step makes a backup.

## Pricing

All prices live in one file: [`src/pricing/catalogue.ts`](src/pricing/catalogue.ts), as **integer minor units** (cents, kuruş)
under **stable item IDs**, with a `CATALOGUE_VERSION` that is recorded on every submission. Edit prices there and bump the version.
There is no exchange-rate conversion anywhere.

| Region | Applies to | Currency | Formatting locale |
| --- | --- | --- | --- |
| `us` | business country = United States | USD | en-US |
| `tr` | business country = Türkiye | TRY | tr-TR |
| `intl` | every other country | EUR | en-IE |

The region comes **only** from the selected business country: never the browser language or IP address. Changing the country
changes prices only. The design, add-ons and details are untouched.

[`src/pricing/estimate.ts`](src/pricing/estimate.ts) is a pure function of the project. Page and section charges are counted
from the design rather than typed in:

- **Base website**: 1 home page, up to 6 sections.
- **Additional page**: each page after the first. **Custom page layout** replaces that page's additional-page charge (never both).
- **Additional section**: every section beyond 6 on any page.
- **Copywriting**: each page flagged "BUSW writes the text".
- **Additional language**: setup fee per language, plus a fee per translated page per language (all pages by default, following the design).
- Other add-ons are quantities or toggles with explicit units. **Hosting** and **Website care** are one radio choice, so they are mutually exclusive.
- One-time and monthly totals are separate. Quote-only work (store, accounts, payments, database, API, complex animation, custom home-page redesign) is listed and **never priced**; the totals say they exclude it.
- Out-of-scope hourly work is shown as an informational rate only. Hours are never estimated or added.
- Taxes and third-party fees are not calculated; the UI says taxes are itemized in the final quote.

### Interpretations to confirm

The brief left these open; the current behaviour is deliberate and covered by tests:

1. The price table is read as **whole currency units** (USD 399 is stored as 39 900 cents; TRY 19 900 as 1 990 000 kuruş).
2. The header and footer do **not** count as sections; only page sections do.
3. A **custom-layout page keeps its 6 included sections**; sections beyond 6 on it still add the section charge.
4. **Photo gallery** is a quantity add-on, not auto-charged when the design contains a Gallery section (a hint appears instead).
5. The base package's **standard contact form** is delivered by BUSW. The preview shows contact details only.
6. **There is no static-site download.** The Preview step is read-only (with a design check). BUSW builds, checks and deploys the finished site, so a client cannot lift a ready-made copy and publish it elsewhere. (This reverses an earlier choice; the export code in `src/export/` is kept for BUSW's own use and is not reachable from the client interface.)

## Submission

[`src/submission/`](src/submission) builds a self-contained snapshot (`snapshot.ts`): project id, timestamp, client details,
country/region/currency/catalogue version, template, the full design and page content, image references, add-ons with quantities,
unit prices and item totals, separate one-time and monthly totals, quote-only requests and notes.

### Today: interim downloadable brief

**No submission service exists yet**, so the Review step does not claim to send anything. It shows *"Online submission is not
connected yet"*, a disabled *Submit to BUSW*, and a working **"Interim option: download project brief"**. That produces a
`.zip` with a printable `brief.html`, `submission.json`, the importable `design.busw-site.json`, and the images, and tells the
client to email it to contact@busoftwareworks.com. The screen says plainly that it has **not** been sent.

### Going live: remaining setup

The browser side is finished and tested. To turn on real submission:

1. **Build an endpoint** that accepts `POST` JSON `{ submission, assetData }` (see `SubmissionPayload` in `snapshot.ts`) with an
   `Idempotency-Key` header equal to `submission.submissionId`.
2. **Run [`verifySubmission`](src/submission/verify.ts) on the server.** It is pure TypeScript with no DOM or React dependency and
   can be bundled into a Node/serverless function. It re-validates everything, recalculates the price from the server's own
   catalogue (ignoring the browser's totals and currency claims), and returns `trusted` data plus any `discrepancies`.
   Store and quote only `trusted.estimate`.
3. **Reply** `201` with `{ "reference": "<id>" }` **only after storing the submission**. On invalid content reply `422` with
   `{ "errors": ["…"] }`. The browser reports success only for a 2xx that carries a reference; anything else (no reference,
   non-JSON, 5xx, 429, timeout, offline) is shown as *not sent* with a retry, and the same `submissionId` is reused on retry.
4. **Handle large payloads.** Images travel inline as data URLs (up to 60 images, each ≤ 4 MB). Many serverless hosts limit request
   bodies (about 4.5 MB on Vercel), so use a host that allows larger bodies, or change the transport to upload images separately.
5. **CORS and abuse controls**: allow the builder's origin, `Content-Type` and `Idempotency-Key`; add rate limiting or a bot check.
6. **Notify** BUSW (and, if wanted, email the client a confirmation) and **store the files somewhere durable**.
7. **Set `VITE_SUBMISSION_URL`** when building the app (see `.env.example`). With it set, *Submit to BUSW* becomes the primary action.
8. **Privacy**: the submission contains personal details. Publish a privacy notice and decide retention before going live.

## Languages

The builder's interface is available in **English** and **Türkçe**, with a selector in the header. This is separate from two other things that
involve languages: the language a client's *website* is written in (`site.lang`, edited in Site settings) and the paid *Additional languages*
add-on (translations of the client's site, which the client supplies). Changing the interface language never changes the design, the business
country, the price list, the currency, the add-ons or anything the client typed.

- **Where the words live.** `src/i18n/messages/en.ts` is the source of truth and the fallback; `messages/tr.ts` is Turkish. Keys are typed, so
  `t("no.such.key")` does not compile. A key missing from a language falls back to English; a key missing everywhere renders nothing, never
  the raw key. Plural pairs are written `thing_one` / `thing_other` and chosen by a `count` value.
- **Add a language.** Add an entry to `LOCALES` (`src/i18n/locales.ts`), create `messages/<code>.ts` (it may start with only some keys), and register it
  in `catalogues.ts`. The selector, document language, date, number and country-name formatting follow automatically. `npm test` reports gaps.
- **Choosing the language.** A `?lang=tr` link wins (so another BUSW site can hand the choice over), then the saved choice (`localStorage`,
  key `busw.lang`), then the browser language, then English. It sets `<html lang>` and the page title.
- **Formatting.** Dates and plain numbers follow the interface language. **Money never does**: amounts use the price list's own locale (en-US,
  tr-TR or en-IE), so switching language cannot change how a price reads or which currency applies.
- **Stays in English on purpose.** `submission.json` and the data sent to a submission service (stable wording for BUSW and the verifier), the
  price catalogue's English wording in `catalogue.ts`, technical file-validation details, and the starter content of templates and newly added
  items (that is the start of the client's own website, not interface text). The downloadable `brief.html` follows the interface language.
- **How code gets translated text.** Components use `useI18n()`. Pure functions (`validateClient`, `stepIssues`, `exportWarnings`, `selectionSummary`,
  `importImage`, `briefHtml`) take an optional translator and default to English, so the server-side verifier and tests are unaffected.

## How it is built

| Path | Purpose |
| --- | --- |
| `src/model/` | Project types (pages, order), strict validator and migration, history reducer, link sanitiser |
| `src/pricing/` | Catalogue, regions, estimate, money formatting |
| `src/submission/` | Snapshot, server verifier, interim brief, transport |
| `src/wizard/` | The six steps, estimate panel, workspace context |
| `src/editor/` | Design step: canvas, inspector, section list, image import |
| `src/sections/`, `src/site/`, `src/templates/` | Section components, the shared renderer and stylesheet, templates |
| `src/export/` | Static-site generation and design checks. The generator is not offered to clients. |
| `src/storage/` | IndexedDB drafts and project files |
| `src/i18n/` | Interface languages: dictionaries, translator, provider, selector |

Earlier drafts (version 1, single page) are migrated automatically into the home page of a version 2 project.

## Limitations

- Single language per site design; additional languages are ordered, not edited, here. (The interface language is a separate setting; see Languages.)
- Add-ons record requested delivery work. Nothing about them is simulated in the preview.
- Drafts live in one browser on one device.
- Text is plain (no bold, italics or inline links inside paragraphs).
- Images: JPEG, PNG and WebP only.
- Tested in Chromium. Other browsers are untested, in particular `<dialog>` and `contenteditable="plaintext-only"`.
