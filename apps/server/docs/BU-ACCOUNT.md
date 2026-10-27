# Balkan Universal Account (BU Account)

BU Account is the shared identity for BUSW and future Balkan Universal applications. Its first integration is the BUSW
website builder, the client dashboard and BUSW administration. This is an initial foundation, not a platform: there is no
chat, rewards, cards, wallet, payment or automatic publishing, and no connection to any other system.

This folder (`apps/server`) is the account server. The web interface (account pages, dashboard, administration) lives in
`apps/website-builder` and is served by this server from one origin.

## What was there before

Nothing. The repository was a static marketing site plus a client-only builder: no server, no authentication, no database, no
email integration, no admin panel, and no stored submissions (the builder offered a downloadable `.zip` brief instead). So this
milestone **adds** a server rather than reusing one. Everything that already existed (builder, pricing, submission contract,
interim brief, language support) is unchanged and still works with no server running.

## Authentication approach and why

**Better Auth** (a TypeScript library, MIT licensed) runs inside our own server (Hono on Node), storing data in our own SQLite
database through Node's built-in `node:sqlite` (no native build step).

Why this and not the alternatives:

| Option | Decision |
| --- | --- |
| Hosted identity (Clerk, Auth0, Supabase Auth) | Not used. It would create an account and recurring cost with a third party, and put every user's identity outside BUSW's control. |
| Separate identity server (Keycloak, Ory) | Not used. A second service to run and secure, which the brief said to avoid for a one-person studio. |
| Auth.js | Not used. Its credentials flow is discouraged and it has no built-in email verification, recovery or two-step verification. |
| Writing our own | Never. No home-made cryptography or OAuth. |
| **Better Auth** | Used. Passwords (scrypt), signed verification links, single-use recovery tokens, sessions, TOTP two-step verification, rate limiting and OAuth/OIDC provider support are provided and maintained; we add only what is specific to BUSW. |

What we wrote ourselves, always on top of the library and never replacing it: explicit **ownership**, **scoped roles**,
**application access**, **suspension**, the **audit trail**, the **founder designation**, and the **staff gate** (two-step
verification and recent sign-in).

Limitations of this choice: it is a young library that changes quickly (we pin the version and have tests for the behaviour we
rely on); SQLite means one server instance with a persistent disk (see "Production requirements"); the OIDC provider for other
applications is a separate package we have **not** installed yet (see the integration guide).

### How identity is kept separate from BUSW

- A user's identity is a row in Better Auth's `user` table with a **stable, opaque id**. Email is an attribute, never the key;
  nothing in our own tables references an email.
- Everything BUSW-specific is in separate tables keyed by that id: `busw_profile` (optional business details), `project`,
  `submission`, `asset`, `quote`, `staff_note`.
- Everything that grants power is in separate tables too: `role_assignment` (scoped), `app_access` (per application),
  `account_state` (shared suspension), `founder_designation` (protected).

## Roles and permissions

Roles are **scoped**. Nothing in one scope grants anything in another.

| Scope | Role | Can |
| --- | --- | --- |
| platform | owner | Grant and revoke administrative roles (needs two-step verification and a recent sign-in). Also holds every account-administration permission. **Holds no BUSW permissions**; those are a separate assignment. |
| bu-account | admin | Search accounts (full details), suspend and reactivate, revoke sessions, restrict or allow application access, start recovery and verification emails, read the audit history. |
| bu-account | support | See limited account details (masked email), find an account by id/name/exact email, resend verification and start recovery. Nothing else. |
| busw | admin | Everything BUSW staff can do, plus assign an owner to an ownerless submission. |
| busw | staff | List and open submissions, set status, add private notes, send quotes. BUSW only. |

An ordinary user has no administrative access. A BU Account administrator cannot read BUSW client content. A BUSW administrator
cannot see accounts. Only a platform owner can change roles, and an administrator acting on a platform owner (suspend, restrict,
sign out) is refused. The last active platform owner can never be removed, demoted or suspended.

Every privileged endpoint checks, on the server, in this order: signed in, not suspended, permission, **two-step verification
enrolled and passed in this session**, and (for privilege changes, suspension and application access) **signed in within the last
15 minutes**.

## What was built

**Accounts:** register (name, email, password), email verification, sign in/out, password recovery, account settings (display name,
preferred language, optional business details), password change (current password required), email change (see below),
session list with per-session sign-out, sign out of other devices or everywhere, two-step verification (authenticator app + backup
codes). No marketing sign-up exists anywhere.

**BUSW integration:** sign in/register/account menu in the builder header and on the marketing site; "Save to my account" in the
Design step; the Review step submits to the account's own server and stores the submission against the signed-in account; a
client dashboard with saved designs (Resume), submissions and their status, and quotes from BUSW; explicit import of the draft on
this device (always a new copy, never replacing); staff reach `/admin`.

**Administration:** `/admin/busw` (submissions, status, private notes, quotes, ownership assignment) and `/admin/accounts` (search,
filters, paging, detail, assistance, session revocation, suspension, application access, roles for owners) and `/admin/audit`.

### Email change

Requires the current password and a recent sign-in. An approval email goes to the **current** address; only after it is approved
does a verification email go to the **new** address; the account's address changes only when that is verified. Until then the
old address keeps working. Whether the new address is already used is never revealed.

### Truthful email

If email cannot be sent (not configured, provider unreachable), requests that need it fail up front with a clear message and
change nothing. Authenticated actions (change email, staff-assisted recovery) report failure. The anonymous flows (register,
forgot password) use deliberately generic wording ("if that address can receive email…") so they cannot reveal which addresses
have accounts; they are never claimed as "sent". Verification and recovery links are never logged or returned in a response.

### Security properties (all covered by tests)

Session cookies: `HttpOnly`, `SameSite=Lax`, `Secure` in production, host-only (no `Domain`), never shared with other sites.
Sessions are checked against the database on every request (no cookie cache), so suspension and revocation are immediate.
Writes require the app's own `Origin`; the marketing site may only read a name and badge. Verification links are signed, expire in
one hour and work once (we record a hash on first use). Recovery tokens are single-use and expire in one hour; resetting ends
other sessions. Password recovery, sign-in and sign-up answer the same whether or not an address is registered. Sign-in, sign-up,
recovery and two-step guessing are rate-limited per client address. Every redirect target is checked against our own origins (this
caught a real open redirect in the verification link). Uploaded images must really be JPEG/PNG/WebP and are served only to their
owner or authorised staff, with `nosniff`, a sandbox CSP and `no-store`. Client text is shown in admin as plain text, never as markup.

## Setup

Requirements: Node 24+.

```bash
cd apps/server
npm install
cp .env.example .env        # development works with no .env at all
npm run dev                 # http://localhost:8787
```

In another terminal run the web app, which proxies `/api` to the server so both share one origin:

```bash
cd apps/website-builder
npm install
npm run dev                 # http://localhost:5174
```

Development uses a local database in `apps/server/data/` and a **development outbox**: emails are written to
`apps/server/data/outbox/` and listed at `http://localhost:8787/dev/outbox`. This is refused in production. Create a demo client
with `npm run seed:dev` (development only; prints a random password once). Demo data and production data never mix: production
refuses `seed:dev`, and uses its own `DATA_DIR`.

### Migrations

Applied automatically at start-up and by `npm run migrate`. Better Auth's tables (`user`, `session`, `account`, `verification`,
`twoFactor`, `rateLimit`) are created by the library; ours are in `src/migrations.ts` (`001-access`, `002-busw`, `003-session-mfa`,
`004-used-links`). Migrations only add; they never touch existing rows. Triggers make `audit_event` append-only, freeze submissions
and make quotes append-only, even against a bug in this server.

### Environment variables

See `.env.example`. Required in production: `NODE_ENV=production`, `APP_ORIGIN` (https), `BETTER_AUTH_SECRET` (32+ random
characters), `EMAIL_TRANSPORT=smtp`, `SMTP_URL`. The server **refuses to start** in production without them, with the development
outbox, over http, or with `REQUIRE_MFA_FOR_STAFF=false`. Never commit `.env`; `.gitignore` already excludes it and `data/`.

### Email

Any SMTP provider works (Resend, Postmark, SES and Mailgun all offer SMTP). Set `SMTP_URL` (for example
`smtps://user:password@smtp.example.com:465`) and `EMAIL_FROM` (a sender your provider has verified, and set up SPF/DKIM/DMARC for
`busoftwareworks.com`). **Not done and needs you:** choosing a provider and verifying the sending domain. Until then production
cannot start, and nothing pretends otherwise. Emails are in English or Turkish, by the account's preferred language.

## Founder / platform owner: exact provisioning

There is no public route that can make anyone an owner, and the first registered user is not one. It is done only on the server,
by the person running it, for an account that already exists and is verified.

1. **Register the founder's account** at your app address (`/account/register`), follow the verification email, sign in once.
2. **On the server**, in `apps/server`, find the account's stable id (prints only; changes nothing):

   ```bash
   npm run find-user -- --email <the founder's email address>
   ```

3. **Make that account the owner.** The command shows the account and asks you to retype its email to confirm:

   ```bash
   npm run bootstrap-owner -- --user-id <the id printed above>
   ```

   (For scripts: add `--confirm-email <address>`.) It refuses an unknown id, an unverified or suspended account, a wrong
   confirmation, and any run once an owner exists. It grants **platform owner** and **BUSW administrator** as two separate
   assignments, records the **founder designation** as a third, separate protected record, and writes audit events attributed to the
   operator (no secrets).
4. **Sign in as that account**, open **Security**, and turn on **two-step verification**. Administration opens only after that.
5. Further owners and staff are granted by an owner in `/admin/accounts` (reason required, recent sign-in required).

Until step 3 is done, `/admin` shows these same instructions and says no owner exists. Nothing is faked.

### The founder badge

"Founder · Admin" is computed on the server from a protected designation that only the operator command writes, **and** an
active platform-owner role on an account in good standing. Revoke the role, or suspend the account, and it disappears; restore the
role and it returns. It is separate from permissions (it grants none), carries no email or other detail, cannot be edited by any
profile request, and a display name of "Founder · Admin" gets nothing. It is shown in the account menu, the marketing site's
account link, and admin account lists.

## Existing records

There were no stored submissions. The existing records are the brief `.zip` packages clients emailed. To bring one in:

```bash
npm run import-legacy -- --zip path/to/busw-brief-example-2026-10-25.zip
```

It is validated and stored **without an owner**, flagged `needs_review`, and is invisible to every client, **even if its contact
email matches an account**. A BUSW administrator filters "needing an owner" in `/admin/busw`, confirms with the client, and assigns
the owner by account id with a reason (recent sign-in required, audited). Local drafts in a browser are imported only when the
person chooses "Save this device's design to my account", validated by the same strict checker as opened files, as a **new** design
(never replacing one). Saving over a cloud design carries its revision, so a newer copy is never overwritten silently.
There are no anonymous server-stored drafts, so no claim mechanism is needed: drafts only reach the server from a signed-in account.

## Future applications (for example a chat app)

BU Account is the identity provider; each application keeps its own roles, permissions and data.

1. **Authenticate a user.** Use the standard OAuth 2.1 / OpenID Connect authorization-code flow with PKCE. Better Auth supports
   being the provider through `@better-auth/oauth-provider` (the same version as `better-auth`). **It is not installed yet**:
   add it when the first second application exists (register that application as a client; scopes `openid profile email`). Until
   then do not share cookies: the session cookie is host-only to this server on purpose, and must stay so.
2. **Get the stable id and permitted profile.** The ID token's `sub` is the stable opaque account id. Request only the claims the
   application needs: display name and preferred language are the shared profile. Email is a claim only if the application is
   allowed to have it. Business details are BUSW's, not shared.
3. **Enforce its own roles and access.** Key the application's own tables by `sub`. Use BU Account only to learn *who* it is; decide
   *what they may do* in the application. Add the application to `APPS` in `src/authz.ts` so account administrators can restrict it
   (`app_access`) separately. Being a BUSW administrator or platform owner grants nothing in another application.
4. **Session expiry, logout, suspension, restriction.** Treat the ID/access token lifetime as the maximum staleness; refresh
   with the refresh token and stop when it is refused. A suspended shared account cannot sign in or refresh. A restriction for
   *your* application is read from `app_access` (expose it as a claim or an endpoint when you add the provider) and must be enforced by
   your application. Provide a logout that ends your own session and, where useful, redirects to BU Account's sign-out.
5. **Store data separately.** Never write into BU Account's tables. Your database holds its own data keyed by `sub`.
6. **Founder / admin badge.** Obtain it from the server-controlled `getVerifiedBadge(db, userId)` in `src/authz.ts`; for another
   application expose it as a signed claim (for example `bu_badge: "Founder · Admin"`) or a server-to-server endpoint authenticated
   with a service credential. Never accept a badge from a client, profile field or display name. It carries no private details.

## Verification

`apps/server`: `npm test` (91 tests: registration, verification and recovery incl. expired/reused links, email change, sessions,
suspension and application restriction, ownership across users for projects/submissions/images, privilege escalation attempts,
staff gate and two-step verification, owner bootstrap, last-owner protection, founder badge, audit confidentiality and
append-only behaviour, safe draft import, truthful email failures, redirect and CSRF protection, configuration guards).
`apps/website-builder`: `npm test` (the existing builder, pricing, submission and language tests plus the new screens).

## Production requirements and remaining limitations

Not done and needs a decision or action from you:

- **Hosting for the server.** SQLite needs one instance with a persistent disk (a small VPS or a container with a volume). It
  cannot run on Vercel's serverless platform. Back up `DATA_DIR` (database and `assets/`) and test a restore. Moving to
  PostgreSQL later is possible (Better Auth supports it) but untested here.
- **Email provider and domain** (above).
- **Privacy notice and terms of service.** None exist. Set `PRIVACY_URL` and `TERMS_URL` once published; the registration page
  links them when set and invents nothing otherwise. A submission contains personal data, so decide retention before going live.
  `/admin` shows these as unconfigured.
- **Origins and cookies.** Serve the app and API from one https origin (`APP_ORIGIN`). The marketing site reads only a name and
  badge from it: set `TRUSTED_ORIGINS` and put the same origin in each page's `<meta name="bu-account-origin">`.
- **Behind a proxy**, set `TRUST_PROXY=true` only if it overwrites `X-Forwarded-For`, otherwise per-address rate limits and
  session addresses are wrong.
- Limitations of the code: rate limiting for our own endpoints is in memory (single instance); the anonymous recovery and
  registration flows cannot report a failure to send for one specific address without revealing that it has an account, so they
  rely on the up-front "mail is unavailable" check; the Better Auth schema check logs a harmless warning on a brand-new database;
  project drafts keep images inline in the design (private to the owner) while submitted images are separate private files;
  there is no impersonation, no administrator-set password, no permanent account deletion and no information-request or
  revision-request workflow (so none is shown); the account server is untested on Firefox and Safari; and no real email provider,
  production database, or deployed environment was exercised.
