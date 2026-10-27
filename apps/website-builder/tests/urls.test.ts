import { describe, expect, it } from "vitest";
import { isAnchorSlug, mailtoHref, pageLinkFile, safeHref, telHref } from "../src/model/urls";

describe("page links", () => {
  it.each(["about.html", "index.html", "our-team.html", "about.html#team"])("accepts %s", (href) => {
    expect(safeHref(href)).toBe(href);
  });

  it.each(["../about.html", "a/b.html", ".html", "About.html", "about.htm", "about.html#", "about.html#bad anchor", "//about.html", "file:///c.html"])("rejects %j", (href) => {
    expect(safeHref(href)).toBeNull();
  });

  it("extracts the file name from a page link only", () => {
    expect(pageLinkFile("about.html#team")).toBe("about.html");
    expect(pageLinkFile("#team")).toBeNull();
    expect(pageLinkFile("https://example.com/about.html")).toBeNull();
  });
});

describe("safeHref", () => {
  it.each([
    "https://example.com",
    "http://example.com/path?x=1#y",
    "mailto:hello@example.com",
    "tel:+44 20".replace(" ", ""),
    "#contact",
  ])("accepts %s", (href) => {
    expect(safeHref(href)).toBe(href);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "java\tscript:alert(1)",
    " javascript:alert(1)\u0000",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//evil.example.com",
    "/relative/path",
    "example.com",
    "https://localhost",
    "https://",
    "mailto:not-an-email",
    "#bad anchor",
    "https://exa mple.com",
    "",
    "   ",
  ])("rejects %j", (href) => {
    expect(safeHref(href)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(safeHref("  https://example.com  ")).toBe("https://example.com");
  });
});

describe("contact helpers", () => {
  it("builds mailto links only for plausible emails", () => {
    expect(mailtoHref("a@b.co")).toBe("mailto:a@b.co");
    expect(mailtoHref("a@b")).toBeNull();
    expect(mailtoHref('"><script>@x.y')).toBeNull();
  });

  it("builds tel links from common phone formats", () => {
    expect(telHref("+44 20 7946 0958")).toBe("tel:+442079460958");
    expect(telHref("(555) 123-4567")).toBe("tel:(555)123-4567");
    expect(telHref("call me")).toBeNull();
  });

  it("validates anchor slugs", () => {
    expect(isAnchorSlug("")).toBe(true);
    expect(isAnchorSlug("our-work")).toBe(true);
    expect(isAnchorSlug("Our Work")).toBe(false);
    expect(isAnchorSlug("1st")).toBe(false);
  });
});
