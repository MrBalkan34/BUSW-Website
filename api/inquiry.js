"use strict";

// POST /api/inquiry: delivers a project inquiry from the contact form to BUSW's inbox by email.
//
// This is a Vercel serverless function (no build step, no dependencies). It sends through Resend's HTTP API and is only
// active once three environment variables are set; see docs/INQUIRY_FORM.md. Until then it answers 503 "not_configured"
// and the contact page tells the visitor, honestly, that nothing was sent and offers a mailto fallback.
//
// Replies: 200 { ok: true } only after the email provider accepted the message. Anything else is { ok: false, error }.

const MAX_BODY_BYTES = 20000;
const LIMITS = { name: 120, email: 200, message: 4000 };
const MIN_MESSAGE = 10;
const SERVICES = {
  website: "Website",
  electron: "Electron desktop app",
  social: "Social media management",
  other: "Something else",
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort throttle per visitor address. It lives in one warm instance only, so it slows a flood without
// pretending to be a guarantee.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
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

/** Checks a request body. Returns { ok: true, value } or { ok: false }. Over-long input is refused, never cut short. */
function validate(body) {
  if (typeof body !== "object" || body === null) return { ok: false };
  const text = (v) => (typeof v === "string" ? v.trim() : null);
  const name = text(body.name);
  const email = text(body.email);
  const service = text(body.service);
  const message = text(body.message);
  if (body.company !== undefined && body.company !== "") return { ok: false }; // honeypot
  if (name === null || name === "" || name.length > LIMITS.name) return { ok: false };
  if (email === null || email.length > LIMITS.email || !EMAIL.test(email)) return { ok: false };
  if (service === null || !Object.prototype.hasOwnProperty.call(SERVICES, service)) return { ok: false };
  if (message === null || message.length < MIN_MESSAGE || message.length > LIMITS.message) return { ok: false };
  const lang = body.lang === "tr" ? "tr" : "en";
  return { ok: true, value: { name, email, service, message, lang } };
}

function buildEmail(value) {
  const subject = `Website inquiry: ${SERVICES[value.service]} from ${oneLine(value.name)}`.slice(0, 200);
  const text = [
    `Name: ${oneLine(value.name)}`,
    `Email: ${value.email}`,
    `Needs: ${SERVICES[value.service]}`,
    `Page language: ${value.lang}`,
    "",
    value.message,
    "",
    "Sent from the contact form on busoftwareworks.com. Reply to this email to answer the visitor.",
  ].join("\n");
  return { subject, text };
}

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

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, error: "method" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INQUIRY_FROM;
  const to = process.env.INQUIRY_TO || "contact@busoftwareworks.com";
  if (!apiKey || !from) return send(res, 503, { ok: false, error: "not_configured" });

  // Only the site itself may post here.
  const origin = req.headers.origin;
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch (error) {
      host = "";
    }
    if (host !== req.headers.host) return send(res, 403, { ok: false, error: "origin" });
  }

  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return send(res, 413, { ok: false, error: "too_large" });

  const ip = String((req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown")).split(",")[0].trim();
  if (throttled(ip, Date.now())) return send(res, 429, { ok: false, error: "rate_limited" });

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, error && error.code === "too_large" ? 413 : 400, { ok: false, error: error && error.code === "too_large" ? "too_large" : "invalid" });
  }

  const checked = validate(body);
  if (!checked.ok) return send(res, 400, { ok: false, error: "invalid" });

  const { subject, text } = buildEmail(checked.value);
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, reply_to: checked.value.email }),
    });
  } catch (error) {
    console.error("inquiry delivery failed: provider unreachable");
    return send(res, 502, { ok: false, error: "delivery_failed" });
  }
  if (!response.ok) {
    console.error(`inquiry delivery failed: provider answered ${response.status}`);
    return send(res, 502, { ok: false, error: "delivery_failed" });
  }
  return send(res, 200, { ok: true });
}

module.exports = handler;
module.exports.validate = validate;
module.exports.buildEmail = buildEmail;
module.exports.resetThrottle = () => hits.clear();
