import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { buildExport, escapeHtml, exportWarnings } from "../src/export/exportSite";
import { parseProject } from "../src/model/validate";
import { blankProject, placeholderProject, TEMPLATES } from "../src/templates/templates";
import type { Project } from "../src/model/types";
import { newPage, sectionsOf, studio, withPages } from "./helpers";

// 1x1 transparent PNG
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const asset = { id: "img1", name: "p.png", mime: "image/png" as const, width: 1, height: 1, dataUrl: PNG };

function withImage(project: Project, alt = "A described image", decorative = false): Project {
  const hero = sectionsOf(project).find((s) => s.type === "hero")!;
  const pages = project.pages.map((p) => ({
    ...p,
    sections: p.sections.map((s) => (s.id === hero.id && s.type === "hero" ? { ...s, props: { ...s.props, image: { assetId: "img1", alt, decorative } } } : s)),
  }));
  return { ...project, pages, assets: { img1: asset } };
}

const html = (project: Project, file = "index.html") => strFromU8(buildExport(project).files[file]!);

describe.each([...TEMPLATES.map((t) => [t.name, t.build()] as const), ["Blank", blankProject()] as const, ["Placeholder", placeholderProject()] as const])("%s", (_name, project) => {
  it("round-trips through the strict validator", () => {
    const parsed = parseProject(JSON.parse(JSON.stringify(project)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.project).toEqual(project);
  });

  it("exports a document with one h1, landmarks and a skip link", () => {
    const out = html(project);
    expect((out.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(out).toContain('<main id="main">');
    expect(out).toContain('href="#main"');
    expect(out).toContain('<link rel="stylesheet" href="styles.css">');
    expect(out).not.toMatch(/data-bw-|contenteditable|<script/i);
  });

  it("starts without broken links or address warnings", () => {
    expect(exportWarnings(project).filter((w) => /does not exist|valid address|email/.test(w))).toEqual([]);
  });

  it("only links to anchors that exist", () => {
    const out = html(project);
    const ids = new Set([...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of out.matchAll(/href="#([^"]+)"/g)) expect(ids.has(m[1]!)).toBe(true);
  });

  it("starts as a single page with no country chosen", () => {
    expect(project.pages).toHaveLength(1);
    expect(project.order.country).toBeNull();
  });
});

describe("multi-page export", () => {
  const site = (): Project => {
    const base = withPages(studio(), newPage("About us", "about-us", 2), newPage("Contact", "contact-page", 1));
    return { ...base, header: { ...base.header!, links: [...base.header!.links, { label: "About us", href: "about-us.html" }] } };
  };

  it("writes one html file per page plus shared styles", () => {
    const files = Object.keys(buildExport(site()).files).sort();
    expect(files).toEqual(["about-us.html", "contact-page.html", "index.html", "styles.css"]);
  });

  it("titles pages with the site name and gives each exactly one h1", () => {
    const project = site();
    expect(html(project)).toContain("<title>Your Studio</title>");
    expect(html(project, "about-us.html")).toContain("<title>About us — Your Studio</title>");
    for (const file of ["index.html", "about-us.html", "contact-page.html"]) {
      expect((html(project, file).match(/<h1[\s>]/g) ?? []).length).toBe(1);
    }
  });

  it("uses a page's own description, falling back to the site description", () => {
    const project = site();
    project.pages[1] = { ...project.pages[1]!, description: "All about us." };
    expect(html(project, "about-us.html")).toContain('content="All about us."');
    expect(html(project, "contact-page.html")).toContain(`content="${project.site.description}"`);
  });

  it("marks the current page in the menu and sends anchor links home from other pages", () => {
    const project = site();
    const about = html(project, "about-us.html");
    expect(about).toContain('href="about-us.html" aria-current="page"');
    expect(about).toContain('href="index.html#work"');
    expect(html(project)).toContain('href="#work"');
  });

  it("warns about menu links that point at pages or anchors that do not exist", () => {
    const project: Project = { ...site(), header: { brand: "x", links: [{ label: "Gone", href: "gone.html" }, { label: "Nowhere", href: "#nowhere" }, { label: "Real", href: "about-us.html" }] } };
    const warnings = exportWarnings(project).join(" | ");
    expect(warnings).toMatch(/"Gone".*gone\.html.*does not exist/);
    expect(warnings).toMatch(/"Nowhere".*#nowhere.*does not exist/);
    expect(warnings).not.toMatch(/"Real"/);
  });

  it("collects images from every page and drops unreferenced assets", () => {
    const project = withImage(site());
    const result = buildExport({ ...project, assets: { ...project.assets, orphan: { ...asset, id: "orphan" } } });
    expect(Object.keys(result.files).filter((f) => f.startsWith("assets/"))).toEqual(["assets/image-1.png"]);
  });
});

describe("export with images", () => {
  const base = studio();

  it("writes images to assets/ with dimensions and alt text, and ships a valid zip", () => {
    const result = buildExport(withImage(base));
    const out = strFromU8(result.files["index.html"]!);
    expect(out).toContain('src="assets/image-1.png"');
    expect(out).toContain('alt="A described image"');
    expect(out).toContain('width="1"');
    const unzipped = unzipSync(result.zip);
    expect(Object.keys(unzipped).sort()).toEqual(["assets/image-1.png", "index.html", "styles.css"]);
    expect(unzipped["assets/image-1.png"]![0]).toBe(0x89);
  });

  it("exports decorative images with empty alt", () => {
    expect(html(withImage(base, "", true))).toContain('alt=""');
  });

  it("omits empty image slots instead of exporting placeholders", () => {
    const out = html(base);
    expect(out).not.toContain("<img");
    expect(out).not.toContain("placeholder");
  });

  it("warns about empty slots and missing descriptions", () => {
    expect(exportWarnings(base).join(" ")).toMatch(/empty image/);
    expect(exportWarnings(withImage(base, "")).join(" ")).toMatch(/no description/);
    expect(exportWarnings(withImage(base)).join(" ")).not.toMatch(/no description/);
  });
});

describe("export safety", () => {
  it("escapes user text everywhere", () => {
    const base = studio();
    const evil = '<script>alert(1)</script>"&';
    const hero = sectionsOf(base).find((s) => s.type === "hero")!;
    const project: Project = {
      ...base,
      site: { ...base.site, title: evil, description: evil },
      header: { brand: evil, links: [] },
      pages: base.pages.map((p) => ({
        ...p,
        title: evil,
        description: evil,
        sections: p.sections.map((s) => (s.id === hero.id && s.type === "hero" ? { ...s, props: { ...s.props, heading: evil } } : s)),
      })),
    };
    const out = html(project);
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script&gt;");
    expect(escapeHtml(evil)).toBe("&lt;script&gt;alert(1)&lt;/script&gt;&quot;&amp;");
  });

  it("never emits javascript: links from buttons, menu links or email", () => {
    const base = studio();
    const project: Project = {
      ...base,
      header: { brand: "x", links: [{ label: "Bad", href: "javascript:alert(1)" }, { label: "Good", href: "#about" }] },
      pages: base.pages.map((p) => ({ ...p, sections: p.sections.map((s) => (s.type === "hero" ? { ...s, props: { ...s.props, buttonLabel: "Go", buttonHref: "java\nscript:alert(1)" } } : s)) })),
    };
    const out = html(project);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toContain('href="#about"');
    expect(exportWarnings(project).join(" ")).toMatch(/no valid address/);
  });
});

describe("parseProject on untrusted input", () => {
  const good = studio();
  const reject = (mutate: (p: any) => void) => {
    const copy = JSON.parse(JSON.stringify(good));
    mutate(copy);
    return parseProject(copy);
  };

  it.each([null, 42, "text", [], {}])("rejects %j", (input) => {
    expect(parseProject(input).ok).toBe(false);
  });

  it("rejects unknown versions, section types and palettes", () => {
    expect(reject((p) => (p.version = 3)).ok).toBe(false);
    expect(reject((p) => (p.pages[0].sections[0].type = "script")).ok).toBe(false);
    expect(reject((p) => (p.theme.palette = "neon")).ok).toBe(false);
  });

  it("rejects oversized text, bad anchors and duplicate ids", () => {
    expect(reject((p) => (p.site.title = "x".repeat(500))).ok).toBe(false);
    expect(reject((p) => (p.pages[0].sections[0].anchor = "Bad Anchor")).ok).toBe(false);
    expect(reject((p) => (p.pages[0].sections[1].id = p.pages[0].sections[0].id)).ok).toBe(false);
  });

  it("rejects bad page structure", () => {
    expect(reject((p) => (p.pages = [])).ok).toBe(false);
    expect(reject((p) => (p.pages[0].slug = "start")).ok).toBe(false);
    expect(reject((p) => (p.pages[0].customLayout = true)).ok).toBe(false);
    const withDupes = (mutate: (p: any) => void) => reject((p) => {
      p.pages.push({ ...JSON.parse(JSON.stringify(p.pages[0])), id: "pg-x", slug: "about", sections: [] });
      mutate(p);
    });
    expect(withDupes(() => undefined).ok).toBe(true);
    expect(withDupes((p) => (p.pages[1].slug = "index")).ok).toBe(false);
    expect(withDupes((p) => (p.pages[1].id = p.pages[0].id)).ok).toBe(false);
    expect(withDupes((p) => (p.pages[1].slug = "Bad Slug")).ok).toBe(false);
    expect(withDupes((p) => p.pages[1].sections.push(p.pages[0].sections[0])).ok).toBe(false);
  });

  it("rejects non-image or non-base64 asset data", () => {
    const a = (dataUrl: string) => ({ id: "a", name: "a", mime: "image/png", width: 1, height: 1, dataUrl });
    expect(reject((p) => (p.assets = { a: a("data:text/html;base64,PHNjcmlwdD4=") })).ok).toBe(false);
    expect(reject((p) => (p.assets = { a: a("https://evil.example/x.png") })).ok).toBe(false);
    expect(reject((p) => (p.assets = { a: a("data:image/png;base64,AAAA") })).ok).toBe(true);
  });

  it("validates the order: country, add-ons, quote requests and client details", () => {
    expect(reject((p) => (p.order.country = "US")).ok).toBe(true);
    expect(reject((p) => (p.order.country = "XX")).ok).toBe(false);
    expect(reject((p) => (p.order.country = "us")).ok).toBe(false);
    expect(reject((p) => (p.order.addons.hosting = "premium")).ok).toBe(false);
    expect(reject((p) => (p.order.addons.hosting = "care")).ok).toBe(true);
    expect(reject((p) => (p.order.addons.photoGalleries = -1)).ok).toBe(false);
    expect(reject((p) => (p.order.addons.extraRevisions = 1.5)).ok).toBe(false);
    expect(reject((p) => (p.order.addons.quoteRequests = ["online-store"])).ok).toBe(true);
    expect(reject((p) => (p.order.addons.quoteRequests = ["free-money"])).ok).toBe(false);
    expect(reject((p) => (p.order.client.notes = "x".repeat(4000))).ok).toBe(false);
    expect(reject((p) => delete p.order).ok).toBe(false);
  });
});

describe("migration of earlier drafts", () => {
  const v1 = () => {
    const current = studio();
    const { pages, order, id, templateId, ...rest } = current;
    void order;
    void id;
    void templateId;
    return JSON.parse(JSON.stringify({ ...rest, version: 1, sections: pages[0]!.sections }));
  };

  it("turns a single-page version 1 project into the home page of a version 2 project", () => {
    const parsed = parseProject(v1());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.project.version).toBe(2);
    expect(parsed.project.pages).toHaveLength(1);
    expect(parsed.project.pages[0]!.slug).toBe("index");
    expect(parsed.project.pages[0]!.sections.length).toBe(4);
    expect(parsed.project.order.country).toBeNull();
    expect(parsed.project.id.length).toBeGreaterThan(8);
    expect(parsed.project.templateId).toBe("custom");
  });

  it("still rejects a damaged version 1 project", () => {
    const broken = v1();
    broken.sections[0].type = "script";
    expect(parseProject(broken).ok).toBe(false);
  });
});
