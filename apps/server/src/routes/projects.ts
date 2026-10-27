import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { nowIso } from "../db";
import { fail, requireApp, requireUser, type AppEnv, type Ctx } from "../http";
import type { Services } from "../services";
import { parseProject, type Project } from "../shared";

export const MAX_PROJECT_BYTES = 70_000_000;
export const MAX_PROJECTS_PER_USER = 50;

interface ProjectRow {
  id: string;
  owner_user_id: string;
  name: string;
  template_id: string | null;
  data_json: string;
  size_bytes: number;
  revision: number;
  source: "cloud" | "local-import";
  created_at: string;
  updated_at: string;
}

const summary = (r: ProjectRow) => ({ id: r.id, name: r.name, templateId: r.template_id, revision: r.revision, sizeBytes: r.size_bytes, source: r.source, createdAt: r.created_at, updatedAt: r.updated_at });

/** The only design a client can reach is their own. Another person's id answers exactly like one that does not exist. */
export function projectRoutes(services: Services): Hono<AppEnv> {
  const { db } = services;
  const app = new Hono<AppEnv>();
  app.use("*", requireUser(services), requireApp(services, "busw"));
  app.use("*", bodyLimit({ maxSize: MAX_PROJECT_BYTES + 1_000_000, onError: (c) => c.json({ error: "too_large", message: "That project is too large." }, 413) }));

  const mine = (c: Ctx, id: string): ProjectRow => db.get<ProjectRow>("SELECT * FROM project WHERE id = ? AND owner_user_id = ?", id, c.get("principal").userId) ?? fail(404, "not_found", "That design does not exist.");

  /** Validates with the same strict checker the builder uses for opened files, then re-serialises so only known fields survive. */
  async function readProject(c: Ctx): Promise<{ project: Project; json: string; name: string; record: Record<string, unknown> }> {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return fail(400, "invalid_json", "The request body must be JSON.");
    }
    const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    const parsed = parseProject(record.project);
    if (!parsed.ok) return fail(422, "invalid_project", parsed.error);
    const json = JSON.stringify(parsed.project);
    if (Buffer.byteLength(json) > MAX_PROJECT_BYTES) return fail(413, "too_large", "That project is too large.");
    const given = typeof record.name === "string" ? record.name.trim().slice(0, 120) : "";
    return { project: parsed.project, json, record, name: given || parsed.project.site.title.trim().slice(0, 120) || "Untitled design" };
  }

  const create = (source: ProjectRow["source"]) => async (c: Ctx) => {
    const p = c.get("principal");
    const count = db.get<{ n: number }>("SELECT COUNT(*) AS n FROM project WHERE owner_user_id = ?", p.userId)?.n ?? 0;
    if (count >= MAX_PROJECTS_PER_USER) return fail(409, "limit_reached", `You can keep ${MAX_PROJECTS_PER_USER} saved designs. Delete one to save another.`);
    const { project, json, name } = await readProject(c);
    const id = randomUUID();
    const now = nowIso();
    // Always a new design. Importing or saving never replaces an existing cloud design.
    db.run("INSERT INTO project (id, owner_user_id, name, template_id, data_json, size_bytes, revision, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)", id, p.userId, name, project.templateId, json, Buffer.byteLength(json), source, now, now);
    return c.json({ project: summary(mine(c, id)) }, 201);
  };

  app.get("/", (c) => c.json({ projects: db.all<ProjectRow>("SELECT * FROM project WHERE owner_user_id = ? ORDER BY updated_at DESC", c.get("principal").userId).map(summary) }));
  app.post("/", create("cloud"));
  app.post("/import-local", create("local-import"));

  app.get("/:id", (c) => {
    const row = mine(c, c.req.param("id"));
    return c.json({ project: summary(row), data: JSON.parse(row.data_json) as Project });
  });

  app.put("/:id", async (c) => {
    const row = mine(c, c.req.param("id"));
    const { project, json, name, record } = await readProject(c);
    const body = record as { baseRevision?: unknown };
    if (typeof body.baseRevision !== "number") return fail(422, "invalid_input", "baseRevision is required, so a newer copy is never overwritten silently.");
    const result = db.run(
      "UPDATE project SET name = ?, template_id = ?, data_json = ?, size_bytes = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner_user_id = ? AND revision = ?",
      name,
      project.templateId,
      json,
      Buffer.byteLength(json),
      nowIso(),
      row.id,
      row.owner_user_id,
      body.baseRevision,
    );
    if (result.changes === 0) {
      const current = mine(c, row.id);
      return c.json({ error: "revision_conflict", message: "This design changed somewhere else. Nothing was overwritten.", current: summary(current) }, 409);
    }
    return c.json({ project: summary(mine(c, row.id)) });
  });

  app.delete("/:id", (c) => {
    const row = mine(c, c.req.param("id"));
    db.run("DELETE FROM project WHERE id = ? AND owner_user_id = ?", row.id, row.owner_user_id);
    return c.json({ ok: true });
  });

  return app;
}
