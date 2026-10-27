# Release checklist: Balkan Universal Account, builder and Turkish/English site

Prepared 2026-10-27. Scope chosen: **everything** (marketing site, builder, account server, administration).
Nothing has been pushed, deployed or paid for.

## 1. State of the code

| Area | State |
| --- | --- |
| Marketing site, Turkish/English | Done, tested (46 tests for the pages and the language script). Unchanged URLs. |
| Builder, Turkish/English, accounts UI | Done. 366 tests, typecheck clean, production build served and checked in a browser under its CSP. |
| Account server | Done. 91 tests; real flows exercised in a browser (register, verify by link, sign in, save, submit, quote, two-step, audit). |
| Dependency audit | 0 known vulnerabilities (server and builder, runtime dependencies). |
| Deployment templates | Written (`deploy/`), **untested** (no Docker available). |
| Backups | `npm run backup` verified on a throwaway database. Restore is a file copy; **not yet rehearsed on a real server**. |

## 2. Decisions and actions only you can take (release blockers)

- [ ] **Where the server runs.** One small VPS or container host with a persistent disk. Not Vercel (SQLite needs a disk). Decide provider and region.
- [ ] **Hostname.** For example `account.<domain>`; DNS pointing at it. This becomes `APP_ORIGIN` and the address in each page's `bu-account-origin`.
- [ ] **Email provider and domain.** Any SMTP service. Verify the sending domain (SPF, DKIM, DMARC) for `busoftwareworks.com`. Without it the server will not start in production.
- [ ] **Does `contact@busoftwareworks.com` actually receive mail?** Never tested. Clients are told to write to it, and the submission notification can go there (`STAFF_NOTIFY_TO`).
- [ ] **Privacy notice and terms of service.** None exist. Registration collects names and emails and submissions hold personal data. Write them (or have them written), publish at real addresses, set `PRIVACY_URL` and `TERMS_URL`. Decide how long submissions are kept.
- [ ] **Licence/ownership wording** for designs and delivered sites. Now that the download is removed, this is what lets you act if someone passes your work off as their own.
- [ ] **Products page copy.** `products.html` says the builder is "in development" and that "none of its capabilities is available yet". That becomes false at launch. Update it (and the Turkish text in `js/i18n-strings.js`) in the same release. Say the word and I will prepare the wording.
- [ ] **Pricing interpretations** (six, in `apps/website-builder/HANDOVER.md`) still need your confirmation. Clients see these prices.

## 3. Release sequence

1. Review the three local commits (see section 6).
2. Provision the server and `.env` (`deploy/README.md`). Never commit `.env`.
3. First start. Confirm `/api/health`, then register the founder's account with a real email and verify by the real link.
4. Provision the owner (`find-user`, `bootstrap-owner`), turn on two-step verification, save backup codes.
5. Check `/admin`: the setup checklist should show email configured and reachable, and the privacy/terms links set.
6. Send a real test submission from a second account; confirm the notification, the quote, and that the client dashboard shows only status and quotes.
7. Take a backup and **restore it on a spare machine**.
8. Set `bu-account-origin` on the five marketing pages and push the site (Vercel deploys the root; `apps/` and `deploy/` are excluded by `.vercelignore`).
9. Deploy the builder: it is served by the account server, not by Vercel.

## 4. Test matrix: what has and has not been exercised

Exercised: all automated tests; Chromium in the app pane at desktop and 375px width, in English and Turkish; production build under its CSP;
the full account/submission/admin journey on a local server with the development outbox.

**Not exercised**: Firefox, Safari, a real phone; a real SMTP provider and real deliverability; Docker; PostgreSQL (not supported yet); load;
the first-visit auto language on non-Turkish/English browsers beyond the tests; screen-reader testing with real assistive technology (labels,
roles, focus and keyboard operation were built and unit-tested, not heard).

## 5. After release

- Back up `DATA_DIR` on a schedule; check a restore monthly.
- `npm audit` for both packages regularly; Better Auth moves quickly, so update deliberately and rerun both test suites.
- Keep `BETTER_AUTH_SECRET` in a password manager. Do not rotate it casually: it breaks two-step verification for everyone.
- Watch the server log for repeated rate-limit and "Invalid password" entries.
- Review `/admin/audit` periodically.

## 6. Local commits prepared (not pushed)

1. Turkish/English marketing site and the optional account link.
2. The website builder, with Turkish/English and the account screens.
3. The account server, its documentation and deployment templates.

`.claude/settings.local.json` (a local permission list) is deliberately left out of every commit.

## 7. Known limitations (carried from `BU-ACCOUNT.md`)

Single server instance; anonymous registration/recovery cannot report a send failure for one specific address; project drafts keep images
inline while submitted images are separate private files; no impersonation, admin-set passwords, account deletion or information/revision
requests; the Better Auth schema check logs one harmless warning on a brand-new database; the server reads the built web app's
`index.html` at start-up, so restart it after rebuilding the web app.
