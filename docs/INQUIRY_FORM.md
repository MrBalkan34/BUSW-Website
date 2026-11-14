# Project inquiry form: how it works and how to switch it on

The contact page (`contact.html`) has a short project inquiry form. This note says what is built, what is **not yet
configured**, and what to do to make delivery work.

## What the visitor sees

- Fields: name, email, what they need, and a message. All four are required. A hidden extra field catches robots.
- The form is checked in the browser first (`js/inquiry.js`), with messages in English and Turkish.
- It is then sent to `POST /api/inquiry` (`api/inquiry.js`).
- **"Sent" is shown only when the endpoint answers `200 { "ok": true }`.** For any other outcome (endpoint not set up,
  network error, refusal) the page says plainly that **nothing was sent**, keeps what the visitor typed, and offers the
  same message as an email (`mailto:contact@busoftwareworks.com`, prefilled) and a copy button.
- Without JavaScript the form falls back to the browser's own email link.
- `contact.html?service=website` (also `electron`, `social`, `other`) preselects the service. The website, Electron and
  social request pages link to it this way.

## Current state: delivery is NOT configured

The site has no backend of its own, so nothing is configured yet. Until the variables below are set, `/api/inquiry`
answers `503 not_configured`, and every visitor gets the honest "not sent, email it instead" panel. The email fallback
works today. Nothing is lost and nothing is faked.

## To switch delivery on

`api/inquiry.js` is a Vercel serverless function (the repository root is a static site; Vercel turns `api/*.js` into
functions with no build step). It sends the email through [Resend](https://resend.com)'s HTTP API.

1. Create a Resend account and **verify the sending domain** (`busoftwareworks.com`) by adding the DNS records Resend
   shows. This needs access to the domain's DNS.
2. Create a Resend API key.
3. In the Vercel project (`busw-website`) add these environment variables for Production (and Preview if wanted):

   | Variable | Value |
   |---|---|
   | `RESEND_API_KEY` | the Resend API key |
   | `INQUIRY_FROM` | a sender on the verified domain, for example `BUSW Website <inquiries@busoftwareworks.com>` |
   | `INQUIRY_TO` | where inquiries go. Optional; defaults to `contact@busoftwareworks.com` |

4. Redeploy. Then send one real test inquiry from the live contact page and confirm it arrives. The visitor's address is
   set as `Reply-To`, so replying to the notification answers them.

Nothing about the code is tied to Resend except the `fetch` call near the end of `api/inquiry.js`. To use another provider,
change that call; the rest (validation, honeypot, throttle, honest replies) stays.

### Before relying on it

- **Confirm `contact@busoftwareworks.com` really receives mail.** It has never been tested. It is also the default
  destination and the address of the email fallback.
- **Privacy.** The form collects a name and an email address. The site has no privacy notice or retention policy. The
  page says only that the details are sent to BUSW by email so BUSW can reply. Decide whether a privacy notice is needed.
- The inquiry is delivered by email only. Nothing is stored anywhere else.

## What the endpoint checks

- `POST` only; same-origin only; body no larger than about 20 KB.
- name 1 to 120 characters, a valid email up to 200, a known service, message 10 to 4000 characters. Over-long input
  is refused, never silently cut.
- The hidden honeypot field must be empty.
- A best-effort limit of 5 inquiries per address per 10 minutes (in memory, per warm instance: it slows a flood, it is
  not a guarantee).
- Failures are logged without the visitor's details.

## Testing without sending anything

- Automated: `apps/website-builder/tests/inquiry.test.ts` runs the function with a fake email provider and the form with a
  fake `fetch`. Run `npm test` in `apps/website-builder`.
- Locally with the static preview, `/api/inquiry` does not exist, so the form shows the "not sent" fallback. That is the
  correct behaviour, not a bug.
- To run the function itself locally, use `vercel dev` with the variables above in a `.env.local` and a Resend sandbox
  address. Do not test with real customer data.

## Not decided (business decisions)

- Whether and how quickly BUSW commits to reply. The site deliberately promises no response time.
- A privacy notice and how long inquiries are kept.
- Whether to keep a record of inquiries beyond the inbox.
