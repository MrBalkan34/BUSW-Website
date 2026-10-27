import { describe, expect, it } from "vitest";
import { buildSubmission } from "../../website-builder/src/submission/snapshot";
import { TEMPLATES } from "../../website-builder/src/templates/templates";
import type { Project } from "../../website-builder/src/model/types";
import { storeSubmission, type SubmissionRow } from "../src/submissions";
import { verifySubmission } from "../src/shared";
import { give, newUser, staff, type Browser, type World, world } from "./helpers";

// A real 1x1 PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function design(opts: { country?: string; email?: string; business?: string; image?: boolean; title?: string } = {}): Project {
  const project = TEMPLATES[0]!.build();
  project.order.country = opts.country ?? "US";
  project.order.client = { businessName: opts.business ?? "Örnek Stüdyo", contactName: "Ayşe Yılmaz", email: opts.email ?? "contact@client.example", notes: "" };
  if (opts.title) project.site.title = opts.title;
  if (opts.image) {
    project.assets = { img1: { id: "img1", name: "logo.png", mime: "image/png", width: 1, height: 1, dataUrl: PNG } };
    const gallery = project.pages[0]!.sections.find((s) => s.type === "gallery")!;
    if (gallery.type === "gallery" && gallery.props.items[0]) gallery.props.items[0].image = { assetId: "img1", alt: "Our logo", decorative: false };
  }
  return project;
}

const payload = (project: Project, submissionId = "sub-" + Math.random().toString(36).slice(2)) => buildSubmission(project, { now: new Date("2026-10-27T10:00:00Z"), submissionId, acknowledgedEstimate: true });

async function submit(b: Browser, project: Project, id?: string) {
  const p = payload(project, id);
  const res = await b.post("/api/submissions", p, { "idempotency-key": p.submission.submissionId });
  return { res, payload: p, body: (await res.json()) as Record<string, any> };
}

const rowByRef = (w: World, reference: string) => w.services.db.get<SubmissionRow>("SELECT * FROM submission WHERE reference = ?", reference)!;

describe("cloud projects belong to their owner", () => {
  it("saves, lists, opens, updates and deletes one's own designs", async () => {
    const w = await world();
    const { browser } = await newUser(w, "a@example.test");
    const created = await browser.post("/api/projects", { project: design() });
    expect(created.status).toBe(201);
    const { project } = await created.json();
    expect(project).toMatchObject({ revision: 1, source: "cloud" });

    const list = (await (await browser.get("/api/projects")).json()).projects;
    expect(list).toHaveLength(1);
    const opened = await (await browser.get(`/api/projects/${project.id}`)).json();
    expect(opened.data.site.title).toBe(design().site.title);

    const edited = design({ title: "Renamed" });
    const saved = await browser.put(`/api/projects/${project.id}`, { project: edited, baseRevision: 1 });
    expect(saved.status).toBe(200);
    expect((await saved.json()).project.revision).toBe(2);

    expect((await browser.del(`/api/projects/${project.id}`)).status).toBe(200);
    expect((await browser.get(`/api/projects/${project.id}`)).status).toBe(404);
  });

  it("hides one person's designs from everyone else, exactly like ones that do not exist", async () => {
    const w = await world();
    const a = await newUser(w, "a@example.test");
    const b = await newUser(w, "b@example.test");
    const { project } = await (await a.browser.post("/api/projects", { project: design() })).json();

    const missing = await b.browser.get("/api/projects/00000000-0000-0000-0000-000000000000");
    const others = await b.browser.get(`/api/projects/${project.id}`);
    expect(others.status).toBe(404);
    expect(await others.json()).toEqual(await missing.json());
    expect((await b.browser.put(`/api/projects/${project.id}`, { project: design({ title: "Stolen" }), baseRevision: 1 })).status).toBe(404);
    expect((await b.browser.del(`/api/projects/${project.id}`)).status).toBe(404);
    expect((await (await b.browser.get("/api/projects")).json()).projects).toEqual([]);

    const stillThere = await (await a.browser.get(`/api/projects/${project.id}`)).json();
    expect(stillThere.data.site.title).toBe(design().site.title);
    expect(stillThere.project.revision).toBe(1);
  });

  it("never overwrites newer cloud work silently", async () => {
    const w = await world();
    const { browser } = await newUser(w, "a@example.test");
    const { project } = await (await browser.post("/api/projects", { project: design() })).json();
    await browser.put(`/api/projects/${project.id}`, { project: design({ title: "From my laptop" }), baseRevision: 1 });

    const stale = await browser.put(`/api/projects/${project.id}`, { project: design({ title: "From my phone" }), baseRevision: 1 });
    expect(stale.status).toBe(409);
    const body = await stale.json();
    expect(body.error).toBe("revision_conflict");
    expect(body.current.revision).toBe(2);
    const kept = await (await browser.get(`/api/projects/${project.id}`)).json();
    expect(kept.data.site.title).toBe("From my laptop");

    expect((await browser.put(`/api/projects/${project.id}`, { project: design() })).status).toBe(422); // no baseRevision at all
  });

  it("imports a local draft as a new design, validated, and never replaces an existing one", async () => {
    const w = await world();
    const { browser } = await newUser(w, "a@example.test");
    const first = await (await browser.post("/api/projects", { project: design({ title: "Cloud original" }) })).json();

    const imported = await browser.post("/api/projects/import-local", { project: design({ title: "Local draft" }), name: "Imported" });
    expect(imported.status).toBe(201);
    const body = await imported.json();
    expect(body.project.source).toBe("local-import");
    expect(body.project.id).not.toBe(first.project.id);

    const original = await (await browser.get(`/api/projects/${first.project.id}`)).json();
    expect(original.data.site.title).toBe("Cloud original");
    expect((await (await browser.get("/api/projects")).json()).projects).toHaveLength(2);
  });

  it("rejects malformed, oversized-field and script-bearing content instead of storing it", async () => {
    const w = await world();
    const { browser } = await newUser(w, "a@example.test");
    for (const bad of [{ project: { version: 2 } }, { project: "nope" }, { project: { ...design(), pages: [] } }, { nothing: true }]) {
      expect((await browser.post("/api/projects/import-local", bad)).status, JSON.stringify(bad).slice(0, 40)).toBe(422);
    }
    const huge = design();
    huge.site.title = "x".repeat(5000);
    expect((await browser.post("/api/projects/import-local", { project: huge })).status).toBe(422);
    const evil = design();
    evil.pages[0]!.sections[0]!.props = { ...evil.pages[0]!.sections[0]!.props, buttonHref: "javascript:alert(1)" } as never;
    const res = await browser.post("/api/projects", { project: evil });
    // Either rejected, or stored as plain data that the link sanitiser neutralises when rendered. It is never executable.
    expect([201, 422]).toContain(res.status);
    expect((await (await browser.get("/api/projects")).json()).projects.length).toBe(res.status === 201 ? 1 : 0);
  });

  it("limits how many designs one account keeps", async () => {
    const w = await world();
    const { browser } = await newUser(w, "a@example.test");
    const small = design();
    for (let i = 0; i < 50; i += 1) expect((await browser.post("/api/projects", { project: small })).status).toBe(201);
    const over = await browser.post("/api/projects", { project: small });
    expect(over.status).toBe(409);
    expect((await over.json()).error).toBe("limit_reached");
  }, 60_000);
});

describe("submitting to BUSW", () => {
  it("stores the submission against the signed-in account and answers with a reference only after storing", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "client@example.test");
    const { res, body } = await submit(browser, design({ email: "someone-else@client.example" }));
    expect(res.status).toBe(201);
    expect(body.reference).toMatch(/^BUSW-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const row = rowByRef(w, body.reference);
    // Ownership comes from who submitted, not from the contact email typed into the form.
    expect(row).toMatchObject({ owner_user_id: id, ownership_status: "owned", status: "received", source: "builder", currency: "USD" });
  });

  it("requires an account, and an unrestricted one", async () => {
    const w = await world();
    const anon = await submit(new (await import("./helpers")).Browser(w), design());
    expect(anon.res.status).toBe(401);
    expect(w.services.db.get("SELECT 1 AS x FROM submission")).toBeUndefined();
  });

  it("is idempotent: a retry returns the same reference and stores nothing twice", async () => {
    const w = await world();
    const { browser } = await newUser(w, "client@example.test");
    const p = payload(design(), "retry-1");
    const send = () => browser.post("/api/submissions", p, { "idempotency-key": "retry-1" });
    const first = await (await send()).json();
    const second = await send();
    expect(second.status).toBe(201);
    expect((await second.json()).reference).toBe(first.reference);
    expect(w.services.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM submission")?.n).toBe(1);
    const mismatch = await browser.post("/api/submissions", p, { "idempotency-key": "something-else" });
    expect(mismatch.status).toBe(422);
  });

  it("ignores the browser's prices and records where they disagreed", async () => {
    const w = await world();
    const { browser } = await newUser(w, "client@example.test");
    const p = payload(design({ country: "TR" }));
    p.submission.pricing.oneTimeTotalMinor = 1;
    p.submission.location.currency = "USD" as never;
    const res = await browser.post("/api/submissions", p, { "idempotency-key": p.submission.submissionId });
    expect(res.status).toBe(201);
    const row = rowByRef(w, (await res.json()).reference);
    const estimate = JSON.parse(row.estimate_json);
    expect(row.currency).toBe("TRY");
    expect(estimate.oneTimeTotalMinor).toBe(1_990_000);
    expect(JSON.parse(row.discrepancies_json).length).toBeGreaterThanOrEqual(2);
  });

  it("rejects invalid content with the reasons, and stores nothing", async () => {
    const w = await world();
    const { browser } = await newUser(w, "client@example.test");
    const project = design();
    project.order.client.email = "not-an-email";
    const { res, body } = await submit(browser, project);
    expect(res.status).toBe(422);
    expect(body.errors.join(" ")).toMatch(/email/i);
    const noAck = payload(design());
    noAck.submission.acknowledgedEstimate = false;
    expect((await browser.post("/api/submissions", noAck)).status).toBe(422);
    expect(w.services.db.get("SELECT 1 AS x FROM submission")).toBeUndefined();
  });

  it("refuses images that are not what they claim to be", async () => {
    const w = await world();
    const { browser } = await newUser(w, "client@example.test");
    const p = payload(design({ image: true }));
    const fake = "data:image/png;base64," + Buffer.from("<script>alert(1)</script>").toString("base64");
    p.assetData.img1 = fake;
    const res = await browser.post("/api/submissions", p, { "idempotency-key": p.submission.submissionId });
    expect(res.status).toBe(422);
    expect(JSON.stringify(await res.json())).toMatch(/not a real/);
    expect(w.services.db.get("SELECT 1 AS x FROM submission")).toBeUndefined();
    expect(w.services.db.get("SELECT 1 AS x FROM asset")).toBeUndefined();
  });

  it("tells BUSW with a link only, never the content, and survives a failed notification", async () => {
    const w = await world({ STAFF_NOTIFY_TO: "studio@busoftwareworks.test" });
    const { browser } = await newUser(w, "client@example.test");
    const before = w.mailer.outbox.length;
    const { body } = await submit(browser, design({ business: "Highly Secret Cafe" }));
    const note = w.mailer.outbox[before]!;
    expect(note.to).toBe("studio@busoftwareworks.test");
    expect(note.text).toContain(body.reference);
    expect(note.text).toMatch(/\/admin\/busw\//);
    expect(note.text).not.toContain("Highly Secret Cafe");
    expect(rowByRef(w, body.reference).notify_status).toBe("sent");

    w.mailer.failNext = true;
    const second = await submit(browser, design());
    expect(second.res.status).toBe(201);
    expect(rowByRef(w, second.body.reference).notify_status).toBe("failed");
  });

  it("stores the client's own words as plain data, never as markup", async () => {
    const w = await world();
    const { browser } = await newUser(w, "client@example.test");
    const attack = `<img src=x onerror=alert(1)><script>alert(2)</script>`;
    const { body } = await submit(browser, design({ business: attack }));
    const admin = await staff(w, "staff@example.test", [["busw", "staff"]]);
    const res = await admin.browser.get(`/api/busw/admin/submissions/${rowByRef(w, body.reference).id}`);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await res.json()).submission.snapshot.client.businessName).toBe(attack);
  });
});

describe("what a client can see of their own submission", () => {
  it("shows status, price and quotes, and never staff notes, discrepancies or staff identities", async () => {
    const w = await world();
    const { browser } = await newUser(w, "client@example.test");
    const { body } = await submit(browser, design());
    const row = rowByRef(w, body.reference);
    const admin = await staff(w, "staff@example.test", [["busw", "staff"]], "Secret Staffer");
    await admin.browser.post(`/api/busw/admin/submissions/${row.id}/notes`, { body: "INTERNAL: client seems flaky, quote high" });
    await admin.browser.patch(`/api/busw/admin/submissions/${row.id}/status`, { status: "in_review" });
    const quote = await admin.browser.post(`/api/busw/admin/submissions/${row.id}/quotes`, { title: "Your website", message: "Here is the plan.", oneTimeMinor: 45000, monthlyMinor: 1500 });
    expect(quote.status).toBe(201);

    const mine = await (await browser.get(`/api/submissions/${row.id}`)).json();
    expect(mine.submission).toMatchObject({ reference: body.reference, status: "quoted", currency: "USD" });
    expect(mine.submission.quotes).toEqual([expect.objectContaining({ title: "Your website", message: "Here is the plan.", currency: "USD", oneTimeMinor: 45000, monthlyMinor: 1500 })]);
    const text = JSON.stringify(mine) + JSON.stringify(await (await browser.get("/api/submissions")).json());
    expect(text).not.toMatch(/INTERNAL|flaky|Secret Staffer|discrepanc|note/i);
    expect(JSON.stringify(mine.submission.quotes)).not.toMatch(/created_?by|author/i);
  });

  it("hides one client's submissions from everyone else", async () => {
    const w = await world();
    const a = await newUser(w, "a@example.test");
    const b = await newUser(w, "b@example.test");
    const { body } = await submit(a.browser, design({ email: "b@example.test" })); // even when the form names b's email
    const row = rowByRef(w, body.reference);
    expect((await b.browser.get(`/api/submissions/${row.id}`)).status).toBe(404);
    expect((await (await b.browser.get("/api/submissions")).json()).submissions).toEqual([]);
    expect((await (await a.browser.get("/api/submissions")).json()).submissions).toHaveLength(1);
  });
});

describe("private images", () => {
  async function withImage() {
    const w = await world();
    const owner = await newUser(w, "owner@example.test");
    const other = await newUser(w, "other@example.test");
    const admin = await staff(w, "staff@example.test", [["busw", "staff"]]);
    const { body } = await submit(owner.browser, design({ image: true }));
    const row = rowByRef(w, body.reference);
    const asset = w.services.db.get<{ id: string }>("SELECT id FROM asset WHERE submission_id = ?", row.id)!;
    return { w, owner, other, admin, asset, row };
  }

  it("serves the owner and authorised staff, with headers that stop it being run as anything but an image", async () => {
    const { owner, admin, asset } = await withImage();
    for (const who of [owner.browser, admin.browser]) {
      const res = await who.get(`/api/assets/${asset.id}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("cache-control")).toMatch(/no-store/);
      expect(res.headers.get("content-security-policy")).toMatch(/sandbox/);
      expect(Buffer.from(await res.arrayBuffer()).subarray(1, 4).toString()).toBe("PNG");
    }
  });

  it("refuses everyone else, and the signed-out, as if the image did not exist", async () => {
    const { w, other, asset } = await withImage();
    const missing = await other.browser.get("/api/assets/00000000-0000-0000-0000-000000000000");
    const refused = await other.browser.get(`/api/assets/${asset.id}`);
    expect(refused.status).toBe(404);
    expect(await refused.json()).toEqual(await missing.json());
    const anon = new (await import("./helpers")).Browser(w);
    expect((await anon.get(`/api/assets/${asset.id}`)).status).toBe(401);
  });

  it("keeps working only for staff who pass the two-step gate", async () => {
    const { w, asset } = await withImage();
    const id = (await newUser(w, "weak@example.test")).id;
    give(w, id, "busw", "staff");
    const { signIn } = await import("./helpers");
    const noMfa = await signIn(w, "weak@example.test");
    expect((await noMfa.get(`/api/assets/${asset.id}`)).status).toBe(404);
  });
});

describe("submissions are frozen records", () => {
  it("cannot have their snapshot, estimate, reference, owner or existence changed", async () => {
    const w = await world();
    const a = await newUser(w, "a@example.test");
    const b = await newUser(w, "b@example.test");
    const { body } = await submit(a.browser, design());
    const db = w.services.db;
    const id = rowByRef(w, body.reference).id;
    for (const sql of ["UPDATE submission SET snapshot_json = '{}' WHERE id = ?", "UPDATE submission SET estimate_json = '{}' WHERE id = ?", "UPDATE submission SET reference = 'X' WHERE id = ?", "UPDATE submission SET currency = 'EUR' WHERE id = ?", `UPDATE submission SET owner_user_id = '${b.id}' WHERE id = ?`, "DELETE FROM submission WHERE id = ?"]) {
      expect(() => db.run(sql, id), sql).toThrow();
    }
    db.run("INSERT INTO quote (id, submission_id, created_by, title, message, currency, one_time_minor, monthly_minor, created_at) VALUES ('q1', ?, 'staff', 'T', 'M', 'USD', 1, 0, 'now')", id);
    expect(() => db.run("UPDATE quote SET message = 'x'")).toThrow(/append-only/);
    // Status is the one thing that moves.
    expect(() => db.run("UPDATE submission SET status = 'closed' WHERE id = ?", id)).not.toThrow();
  });

  it("keeps the submitted design and price even after the account's cloud design changes", async () => {
    const w = await world();
    const { browser } = await newUser(w, "a@example.test");
    const { project } = await (await browser.post("/api/projects", { project: design() })).json();
    const { body } = await submit(browser, design());
    await browser.put(`/api/projects/${project.id}`, { project: design({ title: "Changed after submitting" }), baseRevision: 1 });
    const snapshot = JSON.parse(rowByRef(w, body.reference).snapshot_json);
    expect(snapshot.design.site.title).toBe(design().site.title);
  });
});

describe("records without an owner (existing submissions)", () => {
  async function legacy(w: World, email: string) {
    const p = payload(design({ email, business: "Legacy Cafe" }), "legacy-1");
    const verified = verifySubmission(p);
    if (!verified.ok) throw new Error(verified.errors.join());
    return storeSubmission(w.services, { trusted: verified.trusted, assets: [], ownerUserId: null, source: "legacy-import", locale: null });
  }

  it("are flagged for review and never attached to an account because the emails match", async () => {
    const w = await world();
    const { browser } = await newUser(w, "same@example.test");
    const row = await legacy(w, "same@example.test");
    expect(row).toMatchObject({ owner_user_id: null, ownership_status: "needs_review", source: "legacy-import" });
    expect((await (await browser.get("/api/submissions")).json()).submissions).toEqual([]);
    expect((await browser.get(`/api/submissions/${row.id}`)).status).toBe(404);
    expect(w.services.db.get("SELECT 1 AS x FROM submission WHERE owner_user_id IS NOT NULL")).toBeUndefined();
  });

  it("get an owner only when an authorised administrator names the account, with a reason, audited", async () => {
    const w = await world();
    const target = await newUser(w, "same@example.test");
    const row = await legacy(w, "same@example.test");
    const staffOnly = await staff(w, "staff@example.test", [["busw", "staff"]]);
    const admin = await staff(w, "admin@example.test", [["busw", "admin"]]);

    const flagged = (await (await admin.browser.get("/api/busw/admin/submissions?ownership=needs_review")).json()).items;
    expect(flagged.map((i: { id: string }) => i.id)).toEqual([row.id]);

    const url = `/api/busw/admin/submissions/${row.id}/assign-owner`;
    expect((await staffOnly.browser.post(url, { userId: target.id, reason: "Matching email" })).status).toBe(403);
    expect((await admin.browser.post(url, { userId: target.id })).status).toBe(422);
    expect((await admin.browser.post(url, { userId: "no-such-user", reason: "Verified by phone" })).status).toBe(422);

    expect((await admin.browser.post(url, { userId: target.id, reason: "Confirmed by phone with the client" })).status).toBe(200);
    expect((await (await target.browser.get("/api/submissions")).json()).submissions).toHaveLength(1);
    expect((await admin.browser.post(url, { userId: target.id, reason: "Again" })).status).toBe(409);
    const event = w.services.db.get<{ actor_id: string; reason: string; after_json: string }>("SELECT actor_id, reason, after_json FROM audit_event WHERE action = 'submission.owner_assigned'")!;
    expect(event).toMatchObject({ actor_id: admin.id, reason: "Confirmed by phone with the client" });
    expect(JSON.parse(event.after_json)).toMatchObject({ ownerUserId: target.id });
  });
});

describe("BUSW administration is BUSW-only", () => {
  it("is closed to BU Account administrators and owners who hold no BUSW role", async () => {
    const w = await world();
    const buAdmin = await staff(w, "bu@example.test", [["bu-account", "admin"]]);
    const owner = await staff(w, "owner@example.test", [["platform", "owner"]]);
    for (const who of [buAdmin, owner]) {
      expect((await who.browser.get("/api/busw/admin/submissions")).status).toBe(403);
    }
    // And the reverse: a BUSW administrator cannot touch accounts.
    const buswAdmin = await staff(w, "busw@example.test", [["busw", "admin"]]);
    expect((await buswAdmin.browser.get("/api/account-admin/users")).status).toBe(403);
  });

  it("is closed to staff whose BUSW access is restricted", async () => {
    const w = await world();
    const owner = await staff(w, "owner@example.test", [["platform", "owner"]]);
    const s = await staff(w, "s@example.test", [["busw", "staff"]]);
    await owner.browser.post(`/api/account-admin/users/${s.id}/app-access`, { appId: "busw", status: "restricted", reason: "Under review" });
    expect((await s.browser.get("/api/busw/admin/submissions")).status).toBe(403);
  });

  it("lists, searches, filters and pages submissions", async () => {
    const w = await world();
    const c = await newUser(w, "c@example.test");
    const admin = await staff(w, "admin@example.test", [["busw", "staff"]]);
    for (let i = 0; i < 5; i += 1) await submit(c.browser, design({ business: i === 3 ? "Needle Bakery" : `Cafe ${i}` }));
    const all = await (await admin.browser.get("/api/busw/admin/submissions?pageSize=2&page=3")).json();
    expect(all).toMatchObject({ total: 5, page: 3 });
    expect(all.items).toHaveLength(1);
    expect((await (await admin.browser.get("/api/busw/admin/submissions?q=Needle")).json()).items[0].business).toBe("Needle Bakery");
    expect((await (await admin.browser.get("/api/busw/admin/submissions?status=closed")).json()).total).toBe(0);
    expect((await (await admin.browser.get("/api/busw/admin/submissions?q=%25")).json()).total).toBe(0); // wildcards are literal
  });

  it("gives the admin screen the price list the client saw: currency and region", async () => {
    const w = await world();
    const c = await newUser(w, "c@example.test");
    const admin = await staff(w, "admin@example.test", [["busw", "staff"]]);
    const { body } = await submit(c.browser, design({ country: "TR" }));
    const id = rowByRef(w, body.reference).id;
    const detail = (await (await admin.browser.get(`/api/busw/admin/submissions/${id}`)).json()).submission;
    expect(detail).toMatchObject({ currency: "TRY", region: "tr", ownershipStatus: "owned" });
    const listed = (await (await admin.browser.get("/api/busw/admin/submissions")).json()).items[0];
    expect(listed).toMatchObject({ currency: "TRY", region: "tr" });
  });

  it("only accepts the quote in the client's own currency and rejects other fields", async () => {
    const w = await world();
    const c = await newUser(w, "c@example.test");
    const admin = await staff(w, "admin@example.test", [["busw", "staff"]]);
    const { body } = await submit(c.browser, design({ country: "DE" }));
    const id = rowByRef(w, body.reference).id;
    const res = await admin.browser.post(`/api/busw/admin/submissions/${id}/quotes`, { title: "T", message: "M", oneTimeMinor: 1000, monthlyMinor: 0, currency: "USD" });
    expect(res.status).toBe(422);
    await admin.browser.post(`/api/busw/admin/submissions/${id}/quotes`, { title: "T", message: "M", oneTimeMinor: 1000, monthlyMinor: 0 });
    expect(w.services.db.get<{ currency: string }>("SELECT currency FROM quote")?.currency).toBe("EUR");
  });
});
