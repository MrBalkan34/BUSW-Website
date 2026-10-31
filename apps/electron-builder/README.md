# BUSW Electron App Builder (in development)

Status: **pricing core only.** There is no interface, no working builder and no release date. The public site lists
the product as "In development" and must keep saying so; none of this is deployed (`apps/` is in `.vercelignore`)
and no price from here may appear on the site until the product exists.

## What is here

- `src/pricing/catalogue.ts`: the draft price catalogue `electron-2026-11.0-draft`, from the pricing catalogue document
  of 2026-10-31. Every add-on is `hours × HOURLY_RATE` per region; only the base app is rounded ($1,199 / ₺59.900 /
  €1,049). Same item shape as the Website Builder's catalogue, plus `hours`.
- `src/pricing/estimate.ts`: `calculateEstimate(order)` turns what a client configures into an itemized estimate
  (one-time total, monthly total, planning hours, quote-only requests, and `issues` for combinations that cannot be
  delivered as chosen, such as macOS auto-update without macOS signing).
- `src/pricing/shared.ts`: regions, countries and money formatting, re-exported from the Website Builder so both
  products use the same rules (US in USD, Türkiye in TRY, every other country in EUR).
- `tests/pricing.test.ts`: the approved figures transcribed independently of the code, the two worked examples, and
  the dependencies between items.

```bash
npm install
npm run typecheck
npm test
```

## Decisions made while encoding (please confirm)

- "App care, each extra platform" counts Windows, macOS and Linux once each. **Windows on Arm is not counted**, because
  it is a second build of the same platform. The catalogue does not say; it matches worked example B (3 platforms,
  one base plan plus two extras = $200).
- macOS signing is only charged when the macOS build is ordered; otherwise it is left out and reported as an issue.
- Auto-update on a macOS build without macOS signing is priced but reported as an issue (the catalogue says macOS
  requires signing).
- Per-line planning hours are kept in the estimate for BUSW's own use. They are not shown to clients.

## Still open (from the catalogue's own risk list)

- The hour figures are planning numbers, not measured. Check them against time logs after the first two or three
  projects and bump the version. 30 hours for the base app is tight for a one-person studio.
- `platform-macos` needs a Mac or a hosted macOS CI runner. Without one, keep it out of the estimator.
- Windows signing in Türkiye: Azure Artifact Signing eligibility is not confirmed.
- A cheaper entry product (wrapping an existing website as a desktop app) is not priced.
- End-of-support wording for clients without a care plan belongs in the contract.

## Roadmap

1. v0.2: review the hours and the open decisions above, then freeze `electron-2026-11.0`.
2. v0.3 (this): the catalogue in TypeScript with tests for the estimate totals. Done as a draft.
3. v1.0: connect it to the builder's estimator once there is a working preview.
