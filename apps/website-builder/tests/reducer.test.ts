import { describe, expect, it } from "vitest";
import { COALESCE_MS, HISTORY_LIMIT, createState, pruneAssets, reducer, setIn, type Action, type EditorState } from "../src/model/reducer";
import { findPageOfSection } from "../src/model/order";
import { LIMITS, type Project } from "../src/model/types";
import { createSection } from "../src/sections/registry";
import { newPage, sectionsOf, studio } from "./helpers";

const fresh = (): EditorState => createState(studio());
const run = (state: EditorState, ...actions: Action[]) => actions.reduce(reducer, state);
const home = (p: Project) => p.pages[0]!;
const heroId = (p: Project) => home(p).sections[0]!.id;

describe("setIn", () => {
  it("updates nested paths immutably", () => {
    const original = { a: { b: [1, 2, 3] } };
    const next = setIn(original, ["a", "b", 1], 9) as typeof original;
    expect(next.a.b).toEqual([1, 9, 3]);
    expect(original.a.b).toEqual([1, 2, 3]);
  });
});

describe("editing and history", () => {
  it("updates a section prop and can undo and redo it", () => {
    const s0 = fresh();
    const s1 = run(s0, { type: "setProp", target: heroId(s0.present), path: ["heading"], value: "Hello", at: 0 });
    expect((home(s1.present).sections[0]!.props as { heading: string }).heading).toBe("Hello");
    const s2 = run(s1, { type: "undo" });
    expect(s2.present).toBe(s0.present);
    expect(run(s2, { type: "redo" }).present).toBe(s1.present);
  });

  it("coalesces rapid typing into one undo step but splits after a pause", () => {
    const base = fresh();
    const id = heroId(base.present);
    const typed = run(
      base,
      { type: "setProp", target: id, path: ["heading"], value: "H", at: 0 },
      { type: "setProp", target: id, path: ["heading"], value: "He", at: 100 },
      { type: "setProp", target: id, path: ["heading"], value: "Hel", at: 200 },
    );
    expect(typed.past).toHaveLength(1);
    const paused = run(typed, { type: "setProp", target: id, path: ["heading"], value: "Help", at: 200 + COALESCE_MS + 1 });
    expect(paused.past).toHaveLength(2);
  });

  it("does not coalesce edits to different fields", () => {
    const base = fresh();
    const id = heroId(base.present);
    const s = run(base, { type: "setProp", target: id, path: ["heading"], value: "A", at: 0 }, { type: "setProp", target: id, path: ["subheading"], value: "B", at: 10 });
    expect(s.past).toHaveLength(2);
  });

  it("clears redo history after a new edit", () => {
    const base = fresh();
    const id = heroId(base.present);
    const s = run(base, { type: "setProp", target: id, path: ["heading"], value: "A", at: 0 }, { type: "undo" }, { type: "setProp", target: id, path: ["heading"], value: "B", at: 5000 });
    expect(s.future).toHaveLength(0);
  });

  it("caps history length", () => {
    let s = fresh();
    const id = heroId(s.present);
    for (let i = 0; i < HISTORY_LIMIT + 20; i += 1) {
      s = reducer(s, { type: "setProp", target: id, path: ["heading"], value: String(i), at: i * (COALESCE_MS + 1) });
    }
    expect(s.past.length).toBe(HISTORY_LIMIT);
  });

  it("ignores edits to a header that is switched off", () => {
    const s0 = run(fresh(), { type: "setHeader", header: null });
    expect(reducer(s0, { type: "setProp", target: "header", path: ["brand"], value: "x", at: 0 })).toBe(s0);
  });
});

describe("sections", () => {
  it("adds after a given section on a page and selects it", () => {
    const s0 = fresh();
    const added = createSection("contact");
    const s1 = reducer(s0, { type: "addSection", pageId: home(s0.present).id, section: added, afterId: heroId(s0.present) });
    expect(home(s1.present).sections[1]!.id).toBe(added.id);
    expect(s1.selected).toBe(added.id);
  });

  it("moves sections and stops at the ends", () => {
    const s0 = fresh();
    const [first, second] = home(s0.present).sections.map((s) => s.id) as [string, string];
    const down = reducer(s0, { type: "moveSection", id: first, dir: 1 });
    expect(home(down.present).sections.map((s) => s.id).slice(0, 2)).toEqual([second, first]);
    expect(reducer(s0, { type: "moveSection", id: first, dir: -1 })).toBe(s0);
  });

  it("duplicates with a new id and no anchor, so ids stay unique", () => {
    const s0 = fresh();
    const withAnchor = home(s0.present).sections.find((s) => s.anchor !== "")!;
    const s1 = reducer(s0, { type: "duplicateSection", id: withAnchor.id, newId: "copy-1" });
    const copy = home(s1.present).sections.find((s) => s.id === "copy-1")!;
    expect(copy.anchor).toBe("");
    expect(copy.props).toEqual(withAnchor.props);
    expect(copy.props).not.toBe(withAnchor.props);
  });

  it("removes a section, selects its neighbour, and undo restores it", () => {
    const s0 = fresh();
    const doomed = home(s0.present).sections[1]!.id;
    const s1 = reducer(s0, { type: "removeSection", id: doomed });
    expect(sectionsOf(s1.present).some((s) => s.id === doomed)).toBe(false);
    expect(s1.selected).not.toBe(doomed);
    expect(sectionsOf(reducer(s1, { type: "undo" }).present).some((s) => s.id === doomed)).toBe(true);
  });

  it("clears the selection if undo removes the selected section", () => {
    const s0 = fresh();
    const s1 = reducer(s0, { type: "addSection", pageId: home(s0.present).id, section: createSection("gallery"), afterId: null });
    expect(s1.selected).not.toBeNull();
    expect(reducer(s1, { type: "undo" }).selected).toBeNull();
  });

  it("only edits sections that belong to the page they are on", () => {
    const base = fresh();
    const about = newPage("About", "about", 2);
    const s0 = reducer(base, { type: "addPage", page: about });
    const target = about.sections[1]!.id;
    const s1 = reducer(s0, { type: "setProp", target, path: ["heading"], value: "Changed", at: 0 });
    expect(findPageOfSection(s1.present, target)?.id).toBe(about.id);
    expect((s1.present.pages[1]!.sections[1]!.props as { heading: string }).heading).toBe("Changed");
    expect(s1.present.pages[0]).toBe(s0.present.pages[0]);
  });
});

describe("pages", () => {
  it("adds a page, makes it active and links it from the menu", () => {
    const s0 = fresh();
    const about = newPage("About us", "about-us");
    const s1 = reducer(s0, { type: "addPage", page: about });
    expect(s1.present.pages).toHaveLength(2);
    expect(s1.activePageId).toBe(about.id);
    expect(s1.present.header!.links.at(-1)).toEqual({ label: "About us", href: "about-us.html" });
  });

  it("removes a page and its menu link, but never the home page", () => {
    const about = newPage("About", "about");
    const s1 = run(fresh(), { type: "addPage", page: about });
    const s2 = reducer(s1, { type: "removePage", id: about.id });
    expect(s2.present.pages).toHaveLength(1);
    expect(s2.present.header!.links.some((l) => l.href === "about.html")).toBe(false);
    expect(s2.activePageId).toBe(home(s2.present).id);
    expect(reducer(s2, { type: "removePage", id: home(s2.present).id })).toBe(s2);
  });

  it("undoing a page removal restores the page and its link", () => {
    const about = newPage("About", "about");
    const s1 = run(fresh(), { type: "addPage", page: about }, { type: "removePage", id: about.id }, { type: "undo" });
    expect(s1.present.pages).toHaveLength(2);
    expect(s1.present.header!.links.some((l) => l.href === "about.html")).toBe(true);
  });

  it("renames a slug, updates menu links, and rejects duplicates and the reserved home slug", () => {
    const about = newPage("About", "about");
    const team = newPage("Team", "team");
    const s0 = run(fresh(), { type: "addPage", page: about }, { type: "addPage", page: team });
    const renamed = reducer(s0, { type: "setPage", id: about.id, patch: { slug: "who-we-are" }, at: 0 });
    expect(renamed.present.pages[1]!.slug).toBe("who-we-are");
    expect(renamed.present.header!.links.some((l) => l.href === "who-we-are.html")).toBe(true);
    expect(renamed.present.header!.links.some((l) => l.href === "about.html")).toBe(false);
    expect(reducer(s0, { type: "setPage", id: about.id, patch: { slug: "team" }, at: 0 })).toBe(s0);
    expect(reducer(s0, { type: "setPage", id: about.id, patch: { slug: "index" }, at: 0 })).toBe(s0);
  });

  it("keeps the home page slug and never gives it a custom layout", () => {
    const s0 = fresh();
    const id = home(s0.present).id;
    expect(reducer(s0, { type: "setPage", id, patch: { slug: "start", customLayout: true }, at: 0 })).toBe(s0);
  });

  it("reorders additional pages only", () => {
    const a = newPage("A", "a");
    const b = newPage("B", "b");
    const s0 = run(fresh(), { type: "addPage", page: a }, { type: "addPage", page: b });
    const s1 = reducer(s0, { type: "movePage", id: b.id, dir: -1 });
    expect(s1.present.pages.map((p) => p.slug)).toEqual(["index", "b", "a"]);
    expect(reducer(s0, { type: "movePage", id: a.id, dir: -1 })).toBe(s0);
    expect(reducer(s0, { type: "movePage", id: home(s0.present).id, dir: 1 })).toBe(s0);
  });

  it("stops at the page limit", () => {
    let s = fresh();
    for (let i = 0; i < LIMITS.pages + 5; i += 1) s = reducer(s, { type: "addPage", page: newPage(`P${i}`, `p-${i}`) });
    expect(s.present.pages).toHaveLength(LIMITS.pages);
  });

  it("falls back to the home page if the active page disappears through undo", () => {
    const about = newPage("About", "about");
    const s = run(fresh(), { type: "addPage", page: about }, { type: "undo" });
    expect(s.activePageId).toBe(home(s.present).id);
  });
});

describe("order edits", () => {
  it("changing the country keeps the whole design identical", () => {
    const s0 = fresh();
    const s1 = reducer(s0, { type: "setOrder", path: ["country"], value: "TR", at: 0 });
    expect(s1.present.order.country).toBe("TR");
    expect(s1.present.pages).toBe(s0.present.pages);
    expect(s1.present.theme).toBe(s0.present.theme);
    expect(s1.present.assets).toBe(s0.present.assets);
  });

  it("coalesces typing in a client detail into one undo step", () => {
    const s = run(
      fresh(),
      { type: "setOrder", path: ["client", "businessName"], value: "A", at: 0 },
      { type: "setOrder", path: ["client", "businessName"], value: "Ac", at: 100 },
      { type: "setOrder", path: ["client", "businessName"], value: "Acm", at: 200 },
    );
    expect(s.past).toHaveLength(1);
    expect(s.present.order.client.businessName).toBe("Acm");
  });
});

describe("assets", () => {
  const asset = { id: "a1", name: "a.png", mime: "image/png" as const, width: 1, height: 1, dataUrl: "data:image/png;base64,AAAA" };

  it("adding an asset is not an undo step", () => {
    const s1 = reducer(fresh(), { type: "addAsset", asset });
    expect(s1.past).toHaveLength(0);
    expect(s1.present.assets.a1).toBeDefined();
  });

  it("prunes assets that nothing references, including on additional pages", () => {
    const about = newPage("About", "about");
    const s0 = run(fresh(), { type: "addAsset", asset }, { type: "addPage", page: about });
    expect(pruneAssets(s0.present).assets).toEqual({});
    const s1 = reducer(s0, { type: "setProp", target: about.sections[0]!.id, path: ["image"], value: { assetId: "a1", alt: "x", decorative: false }, at: 0 });
    expect(Object.keys(pruneAssets(s1.present).assets)).toEqual(["a1"]);
  });
});

describe("edits that change nothing", () => {
  it("ignores an edit aimed at a section that does not exist, without adding an undo step", () => {
    const s0 = fresh();
    expect(reducer(s0, { type: "setProp", target: "no-such-section", path: ["heading"], value: "x", at: 0 })).toBe(s0);
    expect(reducer(s0, { type: "setAnchor", id: "no-such-section", value: "x", at: 0 }).past).toHaveLength(0);
  });
});
