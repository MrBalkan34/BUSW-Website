import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import { CLIENT_IP_HEADER } from "./auth";
import { csrf, HttpError, requestIds, securityHeaders, type AppEnv } from "./http";
import { accountAdminRoutes } from "./routes/account-admin";
import { accountRoutes } from "./routes/account";
import { buswAdminRoutes } from "./routes/busw-admin";
import { projectRoutes } from "./routes/projects";
import { publicRoutes } from "./routes/public";
import { assetRoutes, submissionRoutes } from "./routes/submissions";
import type { Services } from "./services";

/** The whole HTTP surface. `app.request()` drives it directly in tests, with no network. */
export function createApp(services: Services): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use("*", requestIds(), securityHeaders());
  app.use("/api/*", csrf(services));

  // Better Auth sees the connection's real address (or, behind a trusted proxy, the first forwarded one), under a header
  // clients cannot forge. Without an address its rate limits would never apply.
  app.on(["GET", "POST"], "/api/auth/*", (c) => {
    let ip = "unknown";
    if (services.config.trustProxy) ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || ip;
    else {
      try {
        ip = getConnInfo(c).remote.address ?? ip;
      } catch {
        ip = "local";
      }
    }
    const headers = new Headers(c.req.raw.headers);
    headers.set(CLIENT_IP_HEADER, ip);
    return services.auth.handler(new Request(c.req.raw, { headers }));
  });

  app.route("/api", publicRoutes(services));
  app.route("/api", accountRoutes(services));
  app.route("/api/projects", projectRoutes(services));
  app.route("/api/submissions", submissionRoutes(services));
  app.route("/api/assets", assetRoutes(services));
  app.route("/api/busw/admin", buswAdminRoutes(services));
  app.route("/api/account-admin", accountAdminRoutes(services));

  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ error: error.code, message: error.message, ...error.extra }, error.status);
    // Details go to the server log, never to the browser.
    console.error(`[${c.get("requestId")}] unhandled`, error instanceof Error ? error.message : error);
    return c.json({ error: "server_error", message: "Something went wrong." }, 500);
  });
  return app;
}
