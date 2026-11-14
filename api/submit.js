"use strict";

// POST /api/submit: receives a finished project from the BUSW Website Builder ("Submit to BUSW") and emails it to BUSW.
//
// The builder sends { submission, assetData } as JSON with an Idempotency-Key equal to the submission id. This function
//   1. re-validates it and recalculates the price from the builder's own catalogue, trusting nothing the browser claims
//      (api/_lib/submission.mjs, bundled from apps/website-builder by `npm run build` there);
//   2. emails BUSW the readable brief, the data and the images as ONE attached zip, with the client's address as Reply-To;
//   3. answers 201 { reference } only after the email provider has accepted the message.
// Anything else is an honest failure the builder shows as "not sent". It reuses the contact form's Resend settings
// (RESEND_API_KEY, INQUIRY_FROM, INQUIRY_TO); see docs/SUBMISSION.md.

const crypto = require("node:crypto");

// Vercel rejects request bodies above about 4.5 MB before this code runs; the builder checks the size first and offers the
// downloadable brief instead. This is a second, earlier guard.
const MAX_BODY_BYTES = 4_400_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function throttled(ip, now) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) {
    for (const [key, times] of hits) if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
  }
  return false;
}

const LINE_BREAKS = new RegExp("[\r\n\u2028\u2029]+", "g");
const oneLine = (value) => String(value).replace(LINE_BREAKS, " ").trim();

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    return req.body;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("too large"), { code: "too_large" });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** A short, stable reference derived from the submission id, so a retry of the same submission gets the same one. */
const referenceFor = (submissionId) => "BUSW-" + crypto.createHash("sha1").update(String(submissionId)).digest("hex").slice(0, 8).toUpperCase();

function describe(processed, reference) {
  const s = processed.summary;
  const lines = [
    `New website project from the BUSW Website Builder. Reference ${reference}.`,
    "",
    `Business: ${oneLine(s.business)}`,
    `Contact: ${oneLine(s.contact)}`,
    `Email: ${s.email}`,
    `Country: ${s.country} (${s.currency})`,
    `Pages: ${s.pages}, images: ${s.images}`,
    "",
    `Estimated one-time total: ${s.oneTime}`,
    `Estimated monthly total: ${s.monthly}`,
  ];
  if (s.quoteOnly.length > 0) lines.push("", "Quote-only requests (not in the totals):", ...s.quoteOnly.map((q) => `  - ${oneLine(q)}`));
  if (processed.discrepancies.length > 0) {
    lines.push("", "The browser's figures differed from the recalculation. The attached brief uses the recalculated ones:", ...processed.discrepancies.map((d) => `  - ${d}`));
  }
  lines.push(
    "",
    "The attached zip holds brief.html (readable), submission.json, the importable design file and the images.",
    "The totals are estimates. Confirm the scope and price with the client before any work starts. Reply to this email to answer them.",
  );
  return lines.join("\n");
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "method" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INQUIRY_FROM;
  const to = process.env.SUBMISSION_TO || process.env.INQUIRY_TO || "contact@busoftwareworks.com";
  if (!apiKey || !from) return send(res, 503, { error: "not_configured" });

  // Only the site itself may post here.
  const origin = req.headers.origin;
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch (error) {
      host = "";
    }
    if (host !== req.headers.host) return send(res, 403, { error: "origin" });
  }

  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return send(res, 413, { errors: ["This project is too large to send online."] });

  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown").split(",")[0].trim();
  if (throttled(ip, Date.now())) return send(res, 429, { error: "rate_limited" });

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    if (error && error.code === "too_large") return send(res, 413, { errors: ["This project is too large to send online."] });
    return send(res, 422, { errors: ["The request is not valid JSON."] });
  }

  let processed;
  try {
    processed = (await import("./_lib/submission.mjs")).processSubmission(body);
  } catch (error) {
    console.error("submission processing failed");
    return send(res, 500, { error: "processing_failed" });
  }
  if (!processed.ok) return send(res, 422, { errors: processed.errors.slice(0, 10) });

  const reference = referenceFor(processed.submissionId);
  const subject = `Website project: ${oneLine(processed.summary.business)} (${processed.summary.country}) ${reference}`.slice(0, 200);

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // A retry of the same submission must not email BUSW twice.
        "Idempotency-Key": `busw-submission-${processed.submissionId}`.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: describe(processed, reference),
        reply_to: processed.summary.email,
        attachments: [{ filename: processed.filename, content: Buffer.from(processed.zip).toString("base64") }],
      }),
    });
  } catch (error) {
    console.error("submission delivery failed: provider unreachable");
    return send(res, 502, { error: "delivery_failed" });
  }
  if (!response.ok) {
    console.error(`submission delivery failed: provider answered ${response.status}`);
    return send(res, 502, { error: "delivery_failed" });
  }
  return send(res, 201, { reference });
}

module.exports = handler;
module.exports.referenceFor = referenceFor;
module.exports.resetThrottle = () => hits.clear();
