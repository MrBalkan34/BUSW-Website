// Test double for BUSW's (not yet existing) submission service. Behaviour is chosen with POST /__mode?m=<mode>.
import { createServer } from "node:http";
let mode = "ok";
const log = [];
createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, idempotency-key");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  if (url.pathname === "/__mode") { mode = url.searchParams.get("m"); res.writeHead(200).end("mode=" + mode); return; }
  if (url.pathname === "/__log") { res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(log)); return; }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
    log.push({ mode, idempotencyKey: req.headers["idempotency-key"], contentType: req.headers["content-type"], projectId: body.submission?.projectId, submissionId: body.submission?.submissionId, ack: body.submission?.acknowledgedEstimate, oneTime: body.submission?.pricing?.oneTimeTotalMinor });
    const json = (status, data) => res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(data));
    if (mode === "ok") return json(201, { reference: "BUSW-TEST-0001" });
    if (mode === "500") return json(500, { error: "boom" });
    if (mode === "503") return json(503, {});
    if (mode === "noref") return json(200, { stored: true });
    if (mode === "nojson") return res.writeHead(200, { "Content-Type": "text/html" }).end("<html>proxy page</html>");
    if (mode === "422") return json(422, { errors: ["Enter a valid email address.", "Business name is required."] });
    if (mode === "hang") return; // never answers
    json(200, {});
  });
}).listen(5199, () => console.log("mock submission service on 5199"));
