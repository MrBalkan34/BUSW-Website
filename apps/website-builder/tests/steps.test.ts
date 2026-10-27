import { describe, expect, it } from "vitest";
import { isReady, stepIssues, STEPS, stepIndex } from "../src/wizard/steps";
import { selectionSummary } from "../src/submission/brief";
import { defaultAddons } from "../src/model/order";
import { placeholderProject } from "../src/templates/templates";
import { studio, withCountry } from "./helpers";

const complete = () => {
  const p = withCountry(studio(), "US");
  return { ...p, order: { ...p.order, client: { businessName: "Acme", contactName: "Ada", email: "ada@example.com", notes: "" } } };
};

describe("step readiness", () => {
  it("lists the six steps in order", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["start", "design", "preview", "addons", "details", "review"]);
    expect(stepIndex("addons")).toBe(3);
  });

  it("is ready only when country, template and client details are all in place", () => {
    expect(isReady(stepIssues(complete()))).toBe(true);
  });

  it("asks for both the country and the template on step 1", () => {
    expect(stepIssues(placeholderProject()).start).toBe("Choose a business country and a template.");
    expect(stepIssues(withCountry(placeholderProject(), "DE")).start).toBe("Choose a template.");
    expect(stepIssues(withCountry(studio(), null)).start).toBe("Choose a business country.");
  });

  it("flags unreadable client details on the details step, counting problems", () => {
    expect(stepIssues(studio()).details).toBe("3 details need fixing.");
    const p = complete();
    const oneBad = { ...p, order: { ...p.order, client: { ...p.order.client, email: "nope" } } };
    expect(stepIssues(oneBad).details).toMatch(/valid email/i);
  });

  it("flags additional languages that have no name", () => {
    const p = complete();
    const unnamed = { ...p, order: { ...p.order, addons: { ...p.order.addons, languages: [{ id: "l1", name: " ", allPages: true, pageCount: 1 }] } } };
    expect(stepIssues(unnamed).addons).toMatch(/name each additional language|Give each/i);
    expect(isReady(stepIssues(unnamed))).toBe(false);
  });
});

describe("selectionSummary", () => {
  it("says nothing when nothing is selected", () => {
    expect(selectionSummary(defaultAddons())).toEqual([]);
  });

  it("describes selections with their quantities and units", () => {
    const summary = selectionSummary({
      ...defaultAddons(),
      booking: true,
      photoGalleries: 2,
      extraRevisions: 3,
      hosting: "care",
      languages: [{ id: "l", name: "German", allPages: false, pageCount: 2 }],
    });
    expect(summary).toEqual([
      "Booking integration",
      "Photo gallery × 2",
      "Additional revision rounds × 3",
      "Additional language: German (2 pages)",
      "Website care including hosting (monthly)",
    ]);
  });
});
