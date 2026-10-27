import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { parseProject } from "../src/model/validate";
import type { Project } from "../src/model/types";
import { calculateEstimate } from "../src/pricing/estimate";
import { briefHtml, buildBriefPackage } from "../src/submission/brief";
import { validateClient } from "../src/submission/clientDetails";
import { SUBMISSION_SCHEMA, buildSubmission, dataUrlBytes, submissionFingerprint, type SubmissionPayload } from "../src/submission/snapshot";
import { submitToBusw } from "../src/submission/transport";
import { verifySubmission } from "../src/submission/verify";
import { newPage, studio, withCountry, withHomeSections, withPages } from "./helpers";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const NOW = new Date("2026-10-26T09:30:00.000Z");

function readyProject(country = "US"): Project {
  const base = withPages(withHomeSections(studio(), 8), newPage("About", "about", 2), newPage("Custom", "custom", 1, { customLayout: true }));
  const pages = base.pages.map((p, i) => (i === 0 ? { ...p, sections: p.sections.map((s, j) => (j === 0 && s.type === "textImage" ? { ...s, props: { ...s.props, image: { assetId: "img1", alt: "Team", decorative: false } } } : s)) } : p));
  return {
    ...withCountry({ ...base, pages }, country),
    assets: { img1: { id: "img1", name: "team.png", mime: "image/png", width: 1, height: 1, dataUrl: PNG } },
    order: {
      country,
      client: { businessName: "Acme Ltd", contactName: "Ada Lovelace", email: "ada@example.com", notes: "Launch in spring." },
      addons: { ...studio().order.addons, booking: true, extraRevisions: 1, hosting: "care", quoteRequests: ["online-store"], languages: [{ id: "l1", name: "German", allPages: true, pageCount: 0 }] },
    },
  };
}

const payloadFor = (project = readyProject()): SubmissionPayload => buildSubmission(project, { now: NOW, submissionId: "sub-1", acknowledgedEstimate: true });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe("buildSubmission", () => {
  it("captures identity, client, region, template, design, add-ons and pricing", () => {
    const { submission: s } = payloadFor();
    expect(s.schema).toBe(SUBMISSION_SCHEMA);
    expect(s.submissionId).toBe("sub-1");
    expect(s.projectId.length).toBeGreaterThanOrEqual(8);
    expect(s.submittedAt).toBe("2026-10-26T09:30:00.000Z");
    expect(s.client.businessName).toBe("Acme Ltd");
    expect(s.location).toMatchObject({ country: "US", countryName: "United States", region: "us", currency: "USD" });
    expect(s.location.catalogueVersion).toMatch(/^\d{4}-\d{2}\.\d+$/);
    expect(s.template).toEqual({ id: "studio", name: "Studio" });
    expect(s.design.pages).toHaveLength(3);
    expect(s.design.theme).toEqual({ palette: "ink", font: "system" });
    expect(s.addons.booking).toBe(true);
    expect(s.addons.quoteRequests).toEqual(["online-store"]);
    expect(s.acknowledgedEstimate).toBe(true);
  });

  it("records unit prices, item totals and separate one-time and monthly totals", () => {
    const { pricing } = payloadFor().submission;
    const estimate = calculateEstimate(readyProject());
    expect(pricing.oneTimeTotalMinor).toBe(estimate.oneTimeTotalMinor);
    expect(pricing.monthlyTotalMinor).toBe(4900);
    for (const line of pricing.lines) expect(line.totalMinor).toBe(line.unitPriceMinor * line.quantity);
    expect(pricing.lines.find((l) => l.id === "additional-section")).toMatchObject({ quantity: 2, unitPriceMinor: 2500, totalMinor: 5000, billing: "one-time" });
    expect(pricing.lines.find((l) => l.id === "website-care-month")?.billing).toBe("monthly");
  });

  it("records quote-only requests without pricing them, plus the standing notices", () => {
    const { pricing } = payloadFor().submission;
    expect(pricing.quoteOnly).toEqual([{ id: "online-store", label: "Online store" }]);
    expect(pricing.lines.some((l) => l.id === ("online-store" as string))).toBe(false);
    expect(pricing.notices.estimate).toMatch(/Estimated price/);
    expect(pricing.notices.tax).toMatch(/taxes/i);
    expect(pricing.notices.exclusions).toContain("Domain registration");
  });

  it("references images by id and carries their data separately", () => {
    const payload = payloadFor();
    expect(payload.submission.assets).toEqual([{ id: "img1", name: "team.png", mime: "image/png", width: 1, height: 1, bytes: dataUrlBytes(PNG), file: "assets/img1.png" }]);
    expect(payload.assetData.img1).toBe(PNG);
    expect(JSON.stringify(payload.submission)).not.toContain("base64");
  });

  it("refuses to build without a country, since no catalogue applies", () => {
    expect(() => buildSubmission(withCountry(readyProject(), null), { now: NOW, submissionId: "x", acknowledgedEstimate: true })).toThrow(/country/i);
  });

  it("fingerprints content but not the id or time, and notices real changes", () => {
    const a = submissionFingerprint(payloadFor());
    const again = submissionFingerprint(buildSubmission(readyProject(), { now: new Date(), submissionId: "other", acknowledgedEstimate: true }));
    expect(again).not.toBe(a);
    const same = readyProject();
    expect(submissionFingerprint(buildSubmission(same, { now: NOW, submissionId: "a", acknowledgedEstimate: true }))).toBe(
      submissionFingerprint(buildSubmission(same, { now: new Date(0), submissionId: "b", acknowledgedEstimate: true })),
    );
    const edited = { ...same, order: { ...same.order, addons: { ...same.order.addons, analytics: true } } };
    expect(submissionFingerprint(buildSubmission(edited, { now: NOW, submissionId: "a", acknowledgedEstimate: true }))).not.toBe(
      submissionFingerprint(buildSubmission(same, { now: NOW, submissionId: "a", acknowledgedEstimate: true })),
    );
  });
});

describe("verifySubmission (server-side recalculation)", () => {
  it("accepts an honest submission and returns server-calculated prices", () => {
    const result = verifySubmission(clone(payloadFor()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trusted.estimate.oneTimeTotalMinor).toBe(calculateEstimate(readyProject()).oneTimeTotalMinor);
    expect(result.trusted.estimate.region?.currency).toBe("USD");
    expect(result.trusted.discrepancies).toEqual([]);
    expect(result.trusted.project.pages).toHaveLength(3);
  });

  it("does not trust browser totals: tampering is reported and the recalculated price wins", () => {
    const tampered = clone(payloadFor());
    tampered.submission.pricing.oneTimeTotalMinor = 100;
    tampered.submission.pricing.monthlyTotalMinor = 0;
    tampered.submission.pricing.lines = [];
    const result = verifySubmission(tampered);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trusted.estimate.oneTimeTotalMinor).toBe(calculateEstimate(readyProject()).oneTimeTotalMinor);
    expect(result.trusted.estimate.oneTimeTotalMinor).toBeGreaterThan(100);
    expect(result.trusted.discrepancies.join(" ")).toMatch(/One-time total.*100/);
    expect(result.trusted.discrepancies.join(" ")).toMatch(/Monthly total/);
  });

  it("decides currency from the country, ignoring a claimed region or currency", () => {
    const tampered = clone(payloadFor(readyProject("TR")));
    tampered.submission.location.currency = "USD" as never;
    tampered.submission.location.region = "us" as never;
    const result = verifySubmission(tampered);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trusted.estimate.region?.currency).toBe("TRY");
    expect(result.trusted.estimate.oneTimeTotalMinor).toBe(calculateEstimate(readyProject("TR")).oneTimeTotalMinor);
    expect(result.trusted.discrepancies.join(" ")).toMatch(/Currency/);
  });

  it("flags a catalogue version the server does not recognise as current", () => {
    const old = clone(payloadFor());
    old.submission.location.catalogueVersion = "2020-01.1";
    const result = verifySubmission(old);
    expect(result.ok && result.trusted.discrepancies.join(" ")).toMatch(/Catalogue version/);
  });

  it("recalculates pages and sections from the submitted design, not from the claimed lines", () => {
    const tampered = clone(payloadFor());
    tampered.submission.design.pages = tampered.submission.design.pages.slice(0, 1);
    const result = verifySubmission(tampered);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trusted.estimate.lines.some((l) => l.id === "additional-page")).toBe(false);
    expect(result.trusted.discrepancies.join(" ")).toMatch(/One-time total/);
  });

  it.each([
    ["no submission", (p: any) => delete p.submission],
    ["wrong schema", (p: any) => (p.submission.schema = "other/9")],
    ["no acknowledgement", (p: any) => (p.submission.acknowledgedEstimate = false)],
    ["bad date", (p: any) => (p.submission.submittedAt = "yesterday")],
    ["no business name", (p: any) => (p.submission.client.businessName = "  ")],
    ["bad email", (p: any) => (p.submission.client.email = "not-an-email")],
    ["no country", (p: any) => (p.submission.location.country = null)],
    ["unknown country", (p: any) => (p.submission.location.country = "ZZ")],
    ["lowercase country", (p: any) => (p.submission.location.country = "us")],
    ["unknown section type", (p: any) => (p.submission.design.pages[0].sections[0].type = "iframe")],
    ["negative quantity", (p: any) => (p.submission.addons.extraRevisions = -2)],
    ["unknown add-on choice", (p: any) => (p.submission.addons.hosting = "free")],
    ["unknown quote request", (p: any) => (p.submission.addons.quoteRequests = ["free-site"])],
    ["image used but not listed", (p: any) => (p.submission.assets = [])],
    ["image data missing", (p: any) => (p.assetData = {})],
    ["image data is not an image", (p: any) => (p.assetData.img1 = "data:text/html;base64,PHNjcmlwdD4=")],
    ["oversized image", (p: any) => (p.assetData.img1 = `data:image/png;base64,${"A".repeat(6_000_000)}`)],
    ["first page not home", (p: any) => (p.submission.design.pages[0].slug = "start")],
  ])("rejects a submission with %s", (_name, mutate) => {
    const payload = clone(payloadFor());
    mutate(payload);
    const result = verifySubmission(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it("does not let a crafted design override the project id, version or order", () => {
    const payload = clone(payloadFor()) as any;
    payload.submission.design.id = "evil";
    payload.submission.design.version = 1;
    payload.submission.design.order = { country: "TR", addons: {}, client: {} };
    payload.submission.design.assets = { x: { id: "x" } };
    const result = verifySubmission(payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trusted.project.id).toBe(payload.submission.projectId);
    expect(result.trusted.project.order.country).toBe("US");
    expect(result.trusted.project.assets).toEqual({});
  });

  it("returns every client-detail problem together", () => {
    const payload = clone(payloadFor());
    payload.submission.client = { businessName: "", contactName: "", email: "x", notes: "" };
    const result = verifySubmission(payload);
    expect(!result.ok && result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("validateClient", () => {
  const ok = { businessName: "Acme", contactName: "Ada", email: "ada@example.com", notes: "" };

  it("accepts complete details and allows empty notes", () => {
    expect(validateClient(ok)).toEqual({});
  });

  it("explains each problem separately", () => {
    const errors = validateClient({ businessName: " ", contactName: "", email: "nope", notes: "x".repeat(4000) });
    expect(Object.keys(errors).sort()).toEqual(["businessName", "contactName", "email", "notes"]);
    expect(errors.email).toMatch(/valid email/i);
  });

  it("distinguishes a missing email from a malformed one", () => {
    expect(validateClient({ ...ok, email: "" }).email).toMatch(/Enter an email/);
    expect(validateClient({ ...ok, email: "a@b" }).email).toMatch(/valid email/);
  });
});

describe("submitToBusw", () => {
  const URL_ = "https://example.test/api/submit";
  const reply = (status: number, body: unknown, ok = status >= 200 && status < 300) =>
    vi.fn(async () => ({ ok, status, json: async () => body }) as unknown as Response);

  it("reports success only for a 2xx reply that carries a reference", async () => {
    const fetchImpl = reply(201, { reference: "BUSW-1042" });
    const result = await submitToBusw(payloadFor(), { url: URL_, fetchImpl });
    expect(result).toEqual({ ok: true, reference: "BUSW-1042" });
  });

  it("sends JSON with the submission id as an idempotency key", async () => {
    const fetchImpl = reply(200, { reference: "r" });
    const payload = payloadFor();
    await submitToBusw(payload, { url: URL_, fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL_);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("sub-1");
    expect(JSON.parse(init.body as string).submission.projectId).toBe(payload.submission.projectId);
  });

  it.each([
    ["an empty success body", reply(200, {})],
    ["a blank reference", reply(200, { reference: "   " })],
    ["a non-string reference", reply(200, { reference: 42 })],
    ["a reply that is not JSON", vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } }) as unknown as Response)],
  ])("does NOT count %s as submitted", async (_name, fetchImpl) => {
    const result = await submitToBusw(payloadFor(), { url: URL_, fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("unconfirmed");
      expect(result.retryable).toBe(true);
    }
  });

  it.each([500, 502, 503, 429, 408])("treats HTTP %i as a temporary failure that can be retried", async (status) => {
    const result = await submitToBusw(payloadFor(), { url: URL_, fetchImpl: reply(status, {}) });
    expect(result).toMatchObject({ ok: false, kind: "unavailable", retryable: true, status });
  });

  it("surfaces the server's validation errors when it rejects the content", async () => {
    const result = await submitToBusw(payloadFor(), { url: URL_, fetchImpl: reply(422, { errors: ["Enter a valid email address.", 7, "Second"] }) });
    expect(result).toMatchObject({ ok: false, kind: "rejected", retryable: false, errors: ["Enter a valid email address.", "Second"] });
  });

  it("reports a network error without claiming anything was sent", async () => {
    const result = await submitToBusw(payloadFor(), { url: URL_, fetchImpl: vi.fn(async () => { throw new TypeError("Failed to fetch"); }) });
    expect(result).toMatchObject({ ok: false, kind: "network", retryable: true });
    if (!result.ok) expect(result.message).toMatch(/Nothing has been sent/);
  });

  it("times out instead of waiting forever", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const result = await submitToBusw(payloadFor(), { url: URL_, fetchImpl, timeoutMs: 20 });
    expect(result).toMatchObject({ ok: false, kind: "network" });
    if (!result.ok) expect(result.message).toMatch(/did not respond in time/);
  });

  it("does not call the network at all when no endpoint is configured", async () => {
    const fetchImpl = reply(200, { reference: "x" });
    const result = await submitToBusw(payloadFor(), { url: undefined, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "not-configured", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("interim brief", () => {
  it("is labelled as not yet submitted", () => {
    expect(briefHtml(payloadFor())).toMatch(/Interim brief\. Not yet submitted\./);
  });

  it("escapes everything the client typed", () => {
    const project = readyProject();
    const evil = { ...project, order: { ...project.order, client: { ...project.order.client, businessName: "<img src=x onerror=alert(1)>", notes: "<script>alert(2)</script>\nline two" } } };
    const html = briefHtml(payloadFor(evil));
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("line two");
  });

  it("shows quote-only requests as excluded from the totals, with currency codes", () => {
    const html = briefHtml(payloadFor());
    expect(html).toMatch(/Online store/);
    expect(html).toMatch(/not included in the totals/);
    expect(html).toMatch(/USD/);
    expect(html).toMatch(/Estimated price/);
    expect(html).toMatch(/taxes/i);
  });

  it("packages the brief, machine-readable submission, importable design and images", () => {
    const project = readyProject();
    const pkg = buildBriefPackage(project, payloadFor(project));
    expect(pkg.filename).toBe("busw-brief-acme-ltd-2026-10-26.zip");
    const files = unzipSync(pkg.zip);
    expect(Object.keys(files).sort()).toEqual(["assets/img1.png", "brief.html", "design.busw-site.json", "submission.json"]);
    expect(JSON.parse(strFromU8(files["submission.json"]!)).schema).toBe(SUBMISSION_SCHEMA);
    expect(files["assets/img1.png"]![0]).toBe(0x89);
    const design = parseProject(JSON.parse(strFromU8(files["design.busw-site.json"]!)));
    expect(design.ok).toBe(true);
    if (design.ok) expect(design.project.order.client.businessName).toBe("Acme Ltd");
  });
});
