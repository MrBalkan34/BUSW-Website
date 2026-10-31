import { describe, expect, it } from "vitest";
import { emptyDraft, INCLUDED_SCREENS, isReady, normalizeOrder, parseDraft, stepIssues, validateClient, type Draft } from "../src/model/draft";
import { emptyOrder } from "../src/pricing/estimate";
import { buildBriefPackage, buildSubmission, briefHtml, fileSlug } from "../src/submission/brief";
import { calculateEstimate } from "../src/pricing/estimate";
import { createTranslator, english } from "../src/i18n/translate";
import { unzipSync, strFromU8 } from "fflate";

const complete = (patch: Partial<Draft> = {}): Draft => ({
  order: { ...emptyOrder("DE"), extraScreens: 2, localDatabase: true },
  app: { name: "Cafe Orders", purpose: "Take orders at the counter." },
  client: { businessName: "Örnek Kafe", contactName: "Ayşe Yılmaz", email: "ayse@example.com", notes: "" },
  ...patch,
});

describe("normalizeOrder", () => {
  it("never allows more bespoke designs than screens", () => {
    const order = { ...emptyOrder("US"), extraScreens: 1, customScreenDesigns: 9 };
    expect(normalizeOrder(order).customScreenDesigns).toBe(INCLUDED_SCREENS + 1);
  });

  it("trims the designs again when screens are removed", () => {
    const order = normalizeOrder({ ...emptyOrder("US"), extraScreens: 2, customScreenDesigns: 5 });
    expect(normalizeOrder({ ...order, extraScreens: 0 }).customScreenDesigns).toBe(INCLUDED_SCREENS);
  });

  it("leaves a consistent order alone", () => {
    const order = { ...emptyOrder("US"), extraScreens: 2, customScreenDesigns: 3 };
    expect(normalizeOrder(order)).toBe(order);
  });
});

describe("parseDraft", () => {
  it("round-trips a draft", () => {
    const draft = complete();
    expect(parseDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });

  it("rejects things that are not a draft", () => {
    for (const value of [null, undefined, "x", 3]) expect(parseDraft(value)).toBeNull();
  });

  it("falls back to empty values instead of trusting bad data", () => {
    const parsed = parseDraft({ order: { country: "XX", extraScreens: -4, restApis: "many", platforms: { macos: "yes" }, quoteRequests: ["store-submission", "nonsense"] }, app: { name: 7 }, client: {} });
    expect(parsed?.order.country).toBeNull();
    expect(parsed?.order.extraScreens).toBe(0);
    expect(parsed?.order.restApis).toBe(0);
    expect(parsed?.order.platforms.macos).toBe(false);
    expect(parsed?.order.quoteRequests).toEqual(["store-submission"]);
    expect(parsed?.app.name).toBe("");
  });

  it("clamps oversized quantities and text", () => {
    const parsed = parseDraft({ order: { extraScreens: 5000, customScreenDesigns: 5000 }, app: { name: "x".repeat(500) } });
    expect(parsed?.order.extraScreens).toBe(99);
    expect(parsed?.order.customScreenDesigns).toBe(99);
    expect(parsed?.app.name).toHaveLength(120);
  });
});

describe("validation and step issues", () => {
  it("needs a country, an app name and client details before the brief can be made", () => {
    const issues = stepIssues(emptyDraft());
    expect(Object.keys(issues).sort()).toEqual(["details", "start"]);
    expect(isReady(issues)).toBe(false);
  });

  it("reports the app name once a country is chosen", () => {
    const draft = { ...emptyDraft(), order: emptyOrder("US") };
    expect(stepIssues(draft).start).toBe("Give your app a name.");
  });

  it("is ready for a complete draft", () => {
    expect(isReady(stepIssues(complete()))).toBe(true);
  });

  it("checks the email address", () => {
    expect(validateClient({ businessName: "A", contactName: "B", email: "nope", notes: "" }).email).toBeDefined();
    expect(validateClient({ businessName: "A", contactName: "B", email: "a@b.co", notes: "" })).toEqual({});
  });

  it("words issues in the chosen language", () => {
    expect(stepIssues(emptyDraft(), createTranslator("tr").t).start).toBe("İşletme ülkenizi seçin.");
  });
});

describe("project brief", () => {
  const now = new Date("2026-11-02T10:00:00Z");

  it("says plainly that nothing has been sent", () => {
    const draft = complete();
    const html = briefHtml(draft, calculateEstimate(draft.order), now.toISOString(), english);
    expect(html).toContain("Interim brief. Not yet submitted.");
    expect(html).toContain("downloading it sends nothing");
    expect(html).toContain("contact@busoftwareworks.com");
  });

  it("escapes what the client typed", () => {
    const draft = complete({ client: { businessName: "<script>alert(1)</script>", contactName: "A", email: "a@b.co", notes: "x & y" } });
    const html = briefHtml(draft, calculateEstimate(draft.order), now.toISOString(), english);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("x &amp; y");
  });

  it("packs a readable brief and a machine-readable request", () => {
    const pkg = buildBriefPackage(complete(), now, english);
    expect(pkg).not.toBeNull();
    const files = unzipSync(pkg!.zip);
    expect(Object.keys(files).sort()).toEqual(["brief.html", "request.json"]);
    const request = JSON.parse(strFromU8(files["request.json"]!));
    expect(request).toMatchObject({ product: "busw-electron-app-builder", catalogueStatus: "draft", delivery: "downloaded-brief-not-sent", catalogueVersion: "electron-2026-11.0-draft" });
    expect(request.location).toEqual({ country: "DE", region: "intl", currency: "EUR" });
    expect(request.pricing.oneTimeTotalMinor).toBe(104900 + 2 * 14000 + 28000);
    expect(request.pricing.oneTimeHours).toBe(30 + 8 + 8);
  });

  it("makes no brief until a country is chosen", () => {
    expect(buildBriefPackage({ ...complete(), order: emptyOrder(null) }, now, english)).toBeNull();
    expect(buildSubmission({ ...complete(), order: emptyOrder("ZZ") }, now, "en")).toBeNull();
  });

  it("is written in the client's language", () => {
    const draft = complete();
    const html = briefHtml(draft, calculateEstimate(draft.order), now.toISOString(), createTranslator("tr"));
    expect(html).toContain('lang="tr"');
    expect(html).toContain("Geçici özet. Henüz gönderilmedi.");
  });

  it("keeps Turkish letters out of the filename without losing the words", () => {
    expect(fileSlug("Örnek Ağ Çözümleri İş")).toBe("ornek-ag-cozumleri-is");
    expect(fileSlug("ışık ğüş")).toBe("isik-gus");
    expect(buildBriefPackage(complete(), now, english)!.filename).toBe("busw-electron-brief-ornek-kafe-2026-11-02.zip");
  });
});
