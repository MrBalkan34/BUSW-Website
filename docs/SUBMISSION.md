# "Submit to BUSW" in the Website Builder: how it works and how to maintain it

The BUSW Website Builder (`/builder/`) can send a finished project to BUSW by email. This note explains the pieces, what
the client sees, what BUSW receives, and what must be kept in step when something changes. The contact page's inquiry form
is separate (see `INQUIRY_FORM.md`); both use the same Resend setup.

## The path of one submission

1. The client presses **Submit to BUSW** on the Review step. The builder (`apps/website-builder`) builds a snapshot of the
   project (`src/submission/snapshot.ts`) and posts it as JSON, with an `Idempotency-Key` equal to the submission id, to
   `/api/submit`. The address comes from `apps/website-builder/.env.production` (`VITE_SUBMISSION_URL=/api/submit`).
2. `api/submit.js` (a Vercel function) checks the request, then runs the builder's own verifier on it
   (`api/_lib/submission.mjs`): the project is re-validated and **the price is recalculated from the catalogue**, so
   nothing the browser claims about prices is trusted. Differences are listed in the email.
3. It emails BUSW one message: the totals and the client's details in the text, and the full brief as **one attached zip**
   (`brief.html`, `submission.json`, the importable `design.busw-site.json` and the images). The client's address is the
   `Reply-To`.
4. Only after the email provider accepts the message does it answer `201 { "reference": "BUSW-XXXXXXXX" }`. The builder
   shows "Submitted to BUSW" with that reference **only for such a reply**. Every other outcome is shown as "not sent",
   the work stays saved on the device, and the downloadable brief remains available.

A retry of the same submission does not email twice: the submission id is sent to the provider as an idempotency key, and
the reference is derived from it, so a retry gets the same one.

## What the client sees when it cannot be sent

| Situation | What happens |
|---|---|
| The email provider refuses or is unreachable | `502`: "Your project was not sent… Try again shortly, or download the brief instead." |
| Email delivery is not configured | `503`: the same "not sent" message |
| The project is too large (see below) | "This project is too large to send online, mostly because of its images. Nothing has been sent. Download the project brief and email it instead." |
| The project fails the checks | `422` with the reasons, shown as "BUSW could not accept the submission as it is" |
| Too many attempts from one address | `429`: "try again shortly" |

## Size limit

Vercel rejects request bodies above about **4.5 MB** before any code runs. Images travel inside the request, so the
builder **refuses to attempt anything larger than 4,000,000 bytes** (`MAX_ONLINE_BYTES` in
`src/submission/transport.ts`) and tells the client to use the downloadable brief. Images are already shrunk to 1600 px
when added, so a typical site (a handful of photos) fits. To lift the limit later, send the images separately (for
example to object storage) instead of inline.

## The server bundle must match the builder

The function is deployed **without** `apps/` (see `.vercelignore`), so it cannot import the builder's source. Instead
`apps/website-builder/tools/build-submission-function.mjs` bundles the verifier, the price calculation and the brief into
**`api/_lib/submission.mjs`**, which is committed.

- `npm run build` in `apps/website-builder` rebuilds the builder (`/builder/`) **and** this bundle. Commit both.
- If you change prices, the catalogue, the verifier or the brief and forget to rebuild, the server would quote with the old
  numbers. A test (`tests/submit-endpoint.test.ts`, "was built from the current catalogue") fails when the committed
  bundle's catalogue version or totals differ from the source.
- To rebuild only the bundle: `npm run build:submission-function`.

## Configuration

It needs nothing beyond the contact form's setup. In Vercel (Production):

| Variable | Used for |
|---|---|
| `RESEND_API_KEY` | sending the email (secret) |
| `INQUIRY_FROM` | the sender, on the domain verified in Resend |
| `SUBMISSION_TO` | optional: where projects go. Defaults to `INQUIRY_TO`, then to `contact@busoftwareworks.com` |

If you remove `VITE_SUBMISSION_URL` from `.env.production` and rebuild, the builder goes back to offering only the
downloadable brief.

## Limits and checks (api/submit.js)

- `POST` only, same-origin only, body up to about 4.4 MB.
- Best-effort limit of 8 submissions per address per 10 minutes (in memory, per warm instance).
- Everything is re-validated by the builder's own verifier: schema, client details, country, pages, add-ons, image types and
  sizes, and that every image the design uses is present.
- Failures are logged without the client's details.

## Testing

- `apps/website-builder/tests/submit-endpoint.test.ts` runs the real function and the real bundle with only the email
  provider faked: delivery, the attached zip, recalculated prices, refusals, throttling, the size limit and the builder's
  own handling of each reply.
- To try it in a browser without sending anything, serve the repository with the endpoint mounted and the provider faked
  (the way these changes were checked). Do not test with real customer data; a test through the live site is a real email to
  the BUSW inbox.

## Not decided (business decisions)

- A privacy notice and how long submissions are kept. A submission contains a name, email address and the client's
  design and images; BUSW's inbox is the only place they are kept.
- Whether the client should also receive an automatic confirmation email. The screen shows a reference and says BUSW will
  email them; no email is sent to the client by the system.
- Whether a record of submissions should be kept beyond the inbox.
- Any response-time commitment. The site promises none.
