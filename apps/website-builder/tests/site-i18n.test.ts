import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const PAGES = ["index", "products", "about", "contact", "flight-companion"] as const;

/** The public marketing site lives at the repository root, three folders above this file. */
const ROOT = import.meta.url.slice(0, import.meta.url.indexOf("apps/website-builder/"));
const read = (file: string): string => readFileSync(new URL(file, ROOT), "utf8");
const stringsSource = read("js/i18n-strings.js");
const scriptSource = read("js/i18n.js");
const mainSource = read("js/main.js");

type Table = Record<string, string>;
const tables = (): { en: Table; tr: Table } => {
  const sandbox: { BUSW_STRINGS?: { en: Table; tr: Table } } = {};
  new Function("window", stringsSource)(sandbox);
  return sandbox.BUSW_STRINGS!;
};
const { en, tr } = tables();

const normal = (text: string | null | undefined): string => (text ?? "").replace(/\s+/g, " ").trim();
const placeholdersOf = (html: string): string[] => [...html.matchAll(/href="([^"]+)"/g)].map((m: RegExpMatchArray) => m[1] as string).sort();

const dom = (page: string, options: { url?: string; languages?: string[]; stored?: string; main?: boolean } = {}) => {
  const window = new JSDOM(read(`${page}.html`), { url: options.url ?? `https://www.busoftwareworks.com/${page}.html`, runScripts: "outside-only", pretendToBeVisual: true }).window;
  Object.defineProperty(window.navigator, "languages", { value: options.languages ?? ["en-US"], configurable: true });
  Object.defineProperty(window.navigator, "language", { value: (options.languages ?? ["en-US"])[0], configurable: true });
  if (options.stored) window.localStorage.setItem("busw.lang", options.stored);
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never;
  window.eval(stringsSource);
  window.eval(scriptSource);
  if (options.main !== false) window.eval(mainSource);
  return window;
};

describe("site translation tables", () => {
  it("have the same keys in English and Turkish", () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });

  it("never leave a translation empty", () => {
    for (const [key, value] of Object.entries(tr)) expect(value.trim(), key).not.toBe("");
  });

  it("keep the same links in the Turkish text as in the English", () => {
    for (const key of Object.keys(en)) if (en[key]!.includes("<a ")) expect(placeholdersOf(tr[key]!), key).toEqual(placeholdersOf(en[key]!));
  });

  it("write Turkish with its own letters", () => {
    const text = Object.values(tr).join(" ");
    for (const ch of ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"]) expect(text, ch).toContain(ch);
  });
});

describe.each(PAGES)("%s.html", (page) => {
  const doc = new JSDOM(read(`${page}.html`)).window.document;
  const marked = [...doc.querySelectorAll<HTMLElement>("[data-i18n], [data-i18n-html], [data-i18n-attr]")];

  it("is English by default, identified by data-page", () => {
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    expect(doc.documentElement.getAttribute("data-page")).toBe(page);
  });

  it("has an English wording in the table that matches what the page says", () => {
    for (const el of marked) {
      const key = el.getAttribute("data-i18n");
      if (key) {
        expect(en[key], `missing en key ${key}`).toBeDefined();
        expect(normal(el.textContent), key).toBe(normal(en[key]));
      }
      const html = el.getAttribute("data-i18n-html");
      if (html) {
        expect(en[html], `missing en key ${html}`).toBeDefined();
        expect(normal(el.innerHTML), html).toBe(normal(en[html]));
      }
      const attrs = el.getAttribute("data-i18n-attr");
      if (attrs) {
        for (const pair of attrs.split(";")) {
          const [attribute, attrKey] = pair.split(":") as [string, string];
          expect(en[attrKey], `missing en key ${attrKey}`).toBeDefined();
          expect(normal(el.getAttribute(attribute)), attrKey).toBe(normal(en[attrKey]));
        }
      }
    }
  });

  it("has a Turkish wording for everything it marks", () => {
    for (const el of marked) {
      const keys = [el.getAttribute("data-i18n"), el.getAttribute("data-i18n-html"), ...(el.getAttribute("data-i18n-attr") ?? "").split(";").map((p: string) => p.split(":")[1])].filter(Boolean) as string[];
      for (const key of keys) expect(tr[key], key).toBeDefined();
    }
  });

  it("keeps its title and descriptions in step with the table", () => {
    expect(doc.title).toBe(en[`meta.${page}.title`]);
    const description = en[`meta.${page}.description`];
    expect(doc.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(description);
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe(description);
    expect(doc.querySelector('meta[name="twitter:description"]')?.getAttribute("content")).toBe(description);
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(en[`meta.${page}.title`]);
  });

  it("offers the language selector and loads the scripts in order", () => {
    expect(doc.querySelector("[data-lang-switch]")).toBeTruthy();
    const scripts = [...doc.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"));
    expect(scripts).toEqual(["js/i18n-strings.js", "js/i18n.js", "js/main.js"]);
  });
});

describe("every key in the table is used by a page", () => {
  it("has no orphans", () => {
    const used = new Set<string>(["nav.menu", "nav.close"]);
    for (const page of PAGES) {
      const doc = new JSDOM(read(`${page}.html`)).window.document;
      doc.querySelectorAll<HTMLElement>("[data-i18n], [data-i18n-html], [data-i18n-attr]").forEach((el: HTMLElement) => {
        for (const name of ["data-i18n", "data-i18n-html"]) if (el.getAttribute(name)) used.add(el.getAttribute(name)!);
        for (const pair of (el.getAttribute("data-i18n-attr") ?? "").split(";")) if (pair) used.add(pair.split(":")[1]!);
      });
      used.add(`meta.${page}.title`);
      used.add(`meta.${page}.description`);
    }
    used.add("common.langGroup");
    expect(Object.keys(en).filter((key) => !used.has(key))).toEqual([]);
  });
});

describe("language behaviour in the browser", () => {
  it("shows English and a selector with both languages by default", () => {
    const window = dom("index");
    const buttons = [...window.document.querySelectorAll<HTMLButtonElement>("[data-lang-switch] button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["English", "Türkçe"]);
    expect(buttons.map((b) => b.getAttribute("lang"))).toEqual(["en", "tr"]);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    expect(window.document.documentElement.lang).toBe("en");
    expect(window.document.querySelector("h2#work-heading")?.textContent).toBe("Current work");
  });

  it("switches the text, the document language, the title and the metadata, and remembers it", () => {
    const window = dom("index");
    (window.document.querySelector('[data-lang="tr"]') as HTMLButtonElement).click();
    const document = window.document;
    expect(document.documentElement.lang).toBe("tr");
    expect(document.querySelector("h2#work-heading")?.textContent).toBe("Güncel çalışmalar");
    expect(document.querySelector('a[href="products.html"]')?.textContent).toBe("Ürünler");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(tr["meta.index.description"]);
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe(tr["meta.index.description"]);
    expect(document.querySelector("nav[aria-label]")?.getAttribute("aria-label")).toBe("Ana gezinme");
    expect(document.querySelector("[data-lang-switch]")?.getAttribute("aria-label")).toBe("Dil");
    expect(document.querySelector('[data-lang="tr"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem("busw.lang")).toBe("tr");
    // The business's own details and names are not translated.
    expect(document.querySelector("h1")?.textContent).toBe("Balkan Universal Software Works (BUSW)");
    expect(document.querySelector('a[href^="mailto:"]')?.textContent).toBe("contact@busoftwareworks.com");
  });

  it("translates links that sit inside a sentence without losing them", () => {
    const window = dom("about", { stored: "tr" });
    const link = window.document.querySelector('a[href="flight-companion.html"]');
    expect(link?.textContent).toBe("BUSW Flight Companion");
    expect(window.document.querySelector('a[href="products.html"]')?.textContent).toBe("Ürünler");
  });

  it("translates image descriptions", () => {
    const window = dom("flight-companion", { stored: "tr" });
    expect(window.document.querySelector("figure img")?.getAttribute("alt")).toBe(tr["fc.alt1"]);
  });

  it("opens in the saved language on the next visit and on every page", () => {
    for (const page of PAGES) {
      const window = dom(page, { stored: "tr" });
      expect(window.document.documentElement.lang, page).toBe("tr");
      expect(window.document.title, page).toBe(tr[`meta.${page}.title`]);
    }
  });

  it("follows a ?lang= link and remembers it, ignoring unsupported values", () => {
    const linked = dom("contact", { url: "https://www.busoftwareworks.com/contact.html?lang=tr" });
    expect(linked.document.documentElement.lang).toBe("tr");
    expect(linked.localStorage.getItem("busw.lang")).toBe("tr");
    const bad = dom("contact", { url: "https://www.busoftwareworks.com/contact.html?lang=xx" });
    expect(bad.document.documentElement.lang).toBe("en");
  });

  it("uses the browser language on a first visit", () => {
    expect(dom("index", { languages: ["tr-TR", "en"] }).document.documentElement.lang).toBe("tr");
    expect(dom("index", { languages: ["de-DE"] }).document.documentElement.lang).toBe("en");
  });

  it("lets the visitor go back to English", () => {
    const window = dom("index", { stored: "tr" });
    (window.document.querySelector('[data-lang="en"]') as HTMLButtonElement).click();
    expect(window.document.documentElement.lang).toBe("en");
    expect(window.document.querySelector("h2#work-heading")?.textContent).toBe("Current work");
    expect(window.document.title).toBe(en["meta.index.title"]);
    expect(window.localStorage.getItem("busw.lang")).toBe("en");
  });

  it("keeps the page when a translation is missing instead of showing a key", () => {
    const window = dom("index", { stored: "tr", main: false });
    window.eval(`delete window.BUSW_STRINGS.tr["home.currentWork"]; window.BUSW_I18N.setLanguage("tr");`);
    expect(window.document.querySelector("h2#work-heading")?.textContent).toBe("Current work");
    expect(window.document.body.textContent).not.toMatch(/home\.currentWork|nav\.home/);
  });

  it("re-words the menu button in the chosen language, open or closed", () => {
    const window = dom("index", { stored: "tr" });
    const toggle = window.document.querySelector<HTMLButtonElement>(".nav-toggle")!;
    expect(toggle.textContent).toBe("Menü");
    toggle.click();
    expect(toggle.textContent).toBe("Kapat");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    (window.document.querySelector('[data-lang="en"]') as HTMLButtonElement).click();
    expect(toggle.textContent).toBe("Close");
    expect(window.document.querySelector(".nav-list")?.classList.contains("is-open")).toBe(true);
  });

  it("still works when storage is blocked", () => {
    const window = dom("index", { main: false });
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); }, configurable: true });
    expect(() => window.eval(`window.BUSW_I18N.setLanguage("tr")`)).not.toThrow();
    expect(window.document.documentElement.lang).toBe("tr");
  });
});
