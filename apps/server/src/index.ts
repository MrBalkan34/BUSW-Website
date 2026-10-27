import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { createServices } from "./services";

const config = loadConfig();
const services = await createServices(config);
const app = createApp(services);

// ---- development-only conveniences. They are not registered in production, and loadConfig refuses a production
// configuration that would use them.
if (!config.isProduction && config.email.kind === "dev-outbox") {
  app.get("/dev/outbox", (c) => {
    const items = [...(services.mailer.outbox as readonly { to: string; subject: string; text: string; at: string }[])].reverse();
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const body = items.map((m) => `<article><h2>${esc(m.subject)}</h2><p>To: ${esc(m.to)} · ${esc(m.at)}</p><pre>${esc(m.text)}</pre></article>`).join("") || "<p>No messages yet.</p>";
    return c.html(`<!doctype html><meta charset="utf-8"><title>Development outbox</title><style>body{font:15px system-ui;max-width:48rem;margin:2rem auto;padding:0 1rem}pre{white-space:pre-wrap;background:#f4f4f4;padding:1rem}</style><h1>Development outbox</h1><p><strong>Development only.</strong> Real deployments send real email.</p>${body}`);
  });
}

// ---- the web app (builder, account, dashboard, administration), served from the same origin as the API
const webDist = resolve(process.env.WEB_DIST ?? "../website-builder/dist");
if (existsSync(webDist)) {
  const index = readFileSync(resolve(webDist, "index.html"), "utf8");
  const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
  app.use("/assets/*", serveStatic({ root: webDist }));
  app.get("*", (c) => {
    if (c.req.path.startsWith("/api/")) return c.json({ error: "not_found" }, 404);
    c.header("Content-Security-Policy", csp);
    c.header("Cache-Control", "no-cache");
    return c.html(index);
  });
}

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Balkan Universal Account server on http://localhost:${info.port} (${config.env}), app origin ${config.appOrigin}`);
  if (!config.isProduction) console.log(`Development outbox: http://localhost:${info.port}/dev/outbox`);
});
