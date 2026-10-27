import { Hono } from "hono";
import { getVerifiedBadge, ownerExists } from "../authz";
import { loadPrincipal, type AppEnv } from "../http";
import type { Services } from "../services";

export function publicRoutes(services: Services): Hono<AppEnv> {
  const { config, db } = services;
  const app = new Hono<AppEnv>();

  app.get("/health", (c) => c.json({ ok: true }));

  // Links to the privacy notice and terms, when they exist. Nothing is invented when they do not.
  app.get("/config", (c) => c.json({ privacyUrl: config.privacyUrl, termsUrl: config.termsUrl, passwordMinLength: 10, passwordMaxLength: 128 }));

  // Lets the admin screen say, before anyone is an owner, how to set one up. It reveals only whether an owner exists.
  app.get("/setup-status", (c) => c.json({ ownerProvisioned: ownerExists(db) }));

  /**
   * What the static marketing site needs to show "signed in as" in its navigation: a display name and the badge.
   * No email, no id, no roles. The only endpoint that answers other origins, and only the trusted ones.
   */
  app.get("/public/session", async (c) => {
    const origin = c.req.header("origin");
    if (origin && [config.appOrigin, ...config.trustedOrigins].includes(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Credentials", "true");
      c.header("Vary", "Origin");
    }
    const p = await loadPrincipal(services, c.req.raw.headers);
    if (!p) return c.json({ signedIn: false });
    return c.json({ signedIn: true, name: p.name, badge: getVerifiedBadge(db, p.userId) });
  });

  return app;
}
