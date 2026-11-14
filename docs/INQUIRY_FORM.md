# Project inquiry form: how it works, how it is set up, and how to maintain it

The contact page (`contact.html`) has a short project inquiry form. It is **live**: inquiries are emailed to
`contact@busoftwareworks.com`. This note records how it works, how it was set up, and what to do when something changes.

## What the visitor sees

- Fields: name, email, what they need, and a message. All four are required. A hidden extra field catches robots.
- The form is checked in the browser first (`js/inquiry.js`), with messages in English and Turkish.
- It is then sent to `POST /api/inquiry` (`api/inquiry.js`).
- **"Sent" is shown only when the endpoint answers `200 { "ok": true }`**, which happens only after the email provider
  accepted the message. For any other outcome (endpoint failing, network error, refusal) the page says plainly that
  **nothing was sent**, keeps what the visitor typed, and offers the same message as an email
  (`mailto:contact@busoftwareworks.com`, prefilled) and a copy button.
- Without JavaScript the form falls back to the browser's own email link.
- `contact.html?service=website` (also `electron`, `social`, `other`) preselects the service. The website, Electron and
  social request pages link to it this way.
- The email BUSW receives has the subject `Website inquiry: <service> from <name>`, and the visitor's address is set as
  `Reply-To`, so replying to it answers them.

## How it is set up (as of 14 November 2026)

`api/inquiry.js` is a Vercel serverless function (the repository root is a static site; Vercel turns `api/*.js` into
functions with no build step). It sends through [Resend](https://resend.com)'s HTTP API.

- **Resend domain:** `contact.busoftwareworks.com` (a subdomain, as Resend recommends), verified with DKIM and the two
  CNAME records for sending (`rsend.contact`, `send.contact`). "Enable receiving" is **off** and not needed.
- **DNS** for `busoftwareworks.com` is managed at **Squarespace**. The domain's email (MX, SPF) is Google's, and the
  Resend records use different names, so they do not clash with it.
- **Vercel environment variables** (project `busw-website`, Production only):

  | Variable | Value |
  |---|---|
  | `RESEND_API_KEY` | a Resend API key with "Sending access" (stored as a secret) |
  | `INQUIRY_FROM` | `BUSW Website <inquiries@contact.busoftwareworks.com>` |
  | `INQUIRY_TO` | `contact@busoftwareworks.com` |

  Variables only apply to a **new deployment**: after changing one, redeploy.
- **Tested end to end:** two test inquiries sent through the live endpoint on 14 November 2026 both arrived in the
  `contact@busoftwareworks.com` inbox.

### Housekeeping

- **Rotate the API key** if it may have been exposed. (The first key used during setup was pasted into a chat and should
  be replaced.) In Resend create a new "Sending access" key, replace `RESEND_API_KEY` in Vercel yourself, redeploy, then
  delete the old key. Never put the key in the repository or in a chat.
- **If inquiries stop arriving**, look in Resend, under **Emails**, for the message's status (delivered, bounced, error),
  and in Vercel's runtime logs for `inquiry delivery failed: provider answered <status>`. A `403` usually means the sender
  is not allowed to send to that recipient (for example the test sender `onboarding@resend.dev` only delivers to the
  Resend account's own address); a `401` means the key is wrong or deleted.
- **If the DNS records are removed**, the domain stops verifying in Resend and sending fails until they are restored.
- Nothing about the code is tied to Resend except the `fetch` call near the end of `api/inquiry.js`. To use another
  provider, change that call; the rest (validation, honeypot, throttle, honest replies) stays.

## What the endpoint checks

- `POST` only; same-origin only; body no larger than about 20 KB.
- name 1 to 120 characters, a valid email up to 200, a known service, message 10 to 4000 characters. Over-long input
  is refused, never silently cut.
- The hidden honeypot field must be empty.
- A best-effort limit of 5 inquiries per address per 10 minutes (in memory, per warm instance: it slows a flood, it is
  not a guarantee).
- Failures are logged without the visitor's details.
- Until the three variables are set, it answers `503 not_configured` and the page shows the honest "not sent" panel.

## Testing without sending anything

- Automated: `apps/website-builder/tests/inquiry.test.ts` runs the function with a fake email provider and the form with a
  fake `fetch`. Run `npm test` in `apps/website-builder`.
- Locally with the static preview, `/api/inquiry` does not exist, so the form shows the "not sent" fallback. That is the
  correct behaviour, not a bug.
- To run the function itself locally, use `vercel dev` with the variables above in a `.env.local`. Do not test with real
  customer data. A test sent to the live endpoint is a real email to the BUSW inbox.

## Not decided (business decisions)

- Whether and how quickly BUSW commits to reply. The site deliberately promises no response time.
- A privacy notice and how long inquiries are kept. The form collects a name and an email address; the page says only
  that they are sent to BUSW by email so BUSW can reply.
- Whether to keep a record of inquiries beyond the inbox. Nothing is stored anywhere else.
- The builder's "Submit to BUSW" is a separate path that reuses this email setup; see `SUBMISSION.md`.
