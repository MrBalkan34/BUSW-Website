import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { I18nProvider } from "../src/i18n/I18nProvider";
import { LOCALE_STORAGE_KEY } from "../src/i18n/locales";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

async function mount(): Promise<void> {
  await act(async () => {
    root.render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    );
  });
  await act(async () => {});
}

const $ = <T extends Element>(selector: string): T => {
  const el = host.querySelector<T>(selector);
  if (!el) throw new Error(`Not found: ${selector}`);
  return el;
};

const button = (text: string): HTMLButtonElement => {
  const found = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().startsWith(text));
  if (!found) throw new Error(`No button "${text}"`);
  return found;
};

/** A step in the header's step list, found by its visible name. */
const step = (label: string): HTMLButtonElement => {
  const found = [...host.querySelectorAll<HTMLButtonElement>(".stepper ol button")].find((b) => b.querySelector(".step-label")?.textContent === label);
  if (!found) throw new Error(`No step "${label}"`);
  return found;
};

const checkbox = (label: string): HTMLInputElement => {
  const found = [...host.querySelectorAll<HTMLLabelElement>("label.check")].find((l) => l.textContent?.trim().startsWith(label));
  if (!found) throw new Error(`No checkbox "${label}"`);
  return found.querySelector("input")!;
};

async function click(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.click();
  });
}

async function setValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): Promise<void> {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

const next = () => click($(".step-footer .btn-primary"));
const estimateText = () => $(".addons-aside .estimate, .review-aside .estimate").textContent ?? "";

describe("the Electron App Builder wizard", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/?lang=en");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    window.localStorage.clear();
  });

  it("starts on step 1 with the in-development notice and no price until a country is chosen", async () => {
    await mount();
    expect($("h1").textContent).toBe("Start your desktop app");
    expect($(".banner-dev").textContent).toContain("still in development");
    expect($(".banner-dev").textContent).toContain("nothing is sent to BUSW");
    expect($(".estimate-button").textContent).toContain("Choose a country");
  });

  it("prices the base app for the chosen country and updates as options change", async () => {
    await mount();
    await setValue($("select[id]:not(#step-menu)"), "TR");
    expect($(".estimate-button").textContent).toContain("59.900");
    await setValue($("select[id]:not(#step-menu)"), "US");
    expect($(".estimate-button").textContent).toContain("$1,199 USD");

    await next();
    await click(button("More screens"));
    await click(button("More screens"));
    expect(estimateText()).toContain("$1,519 USD");
  });

  it("limits bespoke designs to the number of screens and trims them when screens go", async () => {
    await mount();
    await setValue($("select[id]:not(#step-menu)"), "US");
    await next();
    for (let i = 0; i < 5; i += 1) await click(button("More designs"));
    expect(button("More designs").disabled).toBe(true);
    const designs = () => ($("input[type=number][aria-describedby]") as HTMLInputElement, [...host.querySelectorAll<HTMLInputElement>("input[type=number]")][1]!.value);
    expect(designs()).toBe("3");
    await click(button("More screens"));
    await click(button("More designs"));
    expect(designs()).toBe("4");
    await click(button("Fewer screens"));
    expect(designs()).toBe("3");
  });

  it("offers macOS signing only with the macOS build, and warns about macOS auto-update without signing", async () => {
    await mount();
    await setValue($("select[id]:not(#step-menu)"), "US");
    await next();
    await next();
    expect($("h1").textContent).toBe("Platforms and release");
    expect(checkbox("macOS signing").disabled).toBe(true);
    await click(checkbox("macOS build"));
    expect(checkbox("macOS signing").disabled).toBe(false);
    await click(checkbox("Auto-update"));
    expect(host.textContent).toContain("Auto-update on macOS requires macOS signing");
    await click(checkbox("macOS signing"));
    expect(host.textContent).not.toContain("Auto-update on macOS requires macOS signing");
  });

  it("keeps the whole draft when the language changes, and shows the new language", async () => {
    await mount();
    await setValue($("select[id]:not(#step-menu)"), "DE");
    await setValue($("input[type=text]"), "Kafe Siparis");
    await click(button("Türkçe"));
    expect($("h1").textContent).toBe("Masaüstü uygulamanıza başlayın");
    expect(($("input[type=text]") as HTMLInputElement).value).toBe("Kafe Siparis");
    expect(($("select[id]:not(#step-menu)") as HTMLSelectElement).value).toBe("DE");
    expect(document.documentElement.lang).toBe("tr");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("tr");
    // Prices follow the country's own format, never the interface language.
    expect($(".estimate-button").textContent).toContain("€1,049 EUR");
  });

  it("will not create the brief until the details are complete and the estimate is acknowledged", async () => {
    await mount();
    await click(step("Review"));
    expect($("h1").textContent).toBe("Review your request");
    expect(button("Download project brief").disabled).toBe(true);
    expect(host.textContent).toContain("Nothing is sent to BUSW from this page");

    await setValue($("select[id]:not(#step-menu)"), "US");
    await click(step("Country and app"));
    await setValue($("input[type=text]"), "Cafe Orders");
    await click(step("Your details"));
    const fields = [...host.querySelectorAll<HTMLInputElement>("input")];
    await setValue(fields.find((f) => f.autocomplete === "organization")!, "Cafe Ltd");
    await setValue(fields.find((f) => f.autocomplete === "name")!, "Sam");
    await setValue(fields.find((f) => f.type === "email")!, "sam@example.com");
    await click(step("Review"));
    expect(button("Download project brief").disabled).toBe(true);
    await click(checkbox("I understand this is an estimate"));
    expect(button("Download project brief").disabled).toBe(false);
  });

  it("restores a saved draft on the next visit", async () => {
    await mount();
    await setValue($("select[id]:not(#step-menu)"), "GB");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    act(() => root.unmount());
    root = createRoot(host);
    await mount();
    expect(($("select[id]:not(#step-menu)") as HTMLSelectElement).value).toBe("GB");
    expect(host.textContent).toContain("Welcome back");
  });

  it("leaves an unreadable draft alone and says so", async () => {
    window.localStorage.setItem("busw.electron-builder.draft", "{not json");
    await mount();
    expect(host.textContent).toContain("could not be opened");
    expect(window.localStorage.getItem("busw.electron-builder.draft")).toBe("{not json");
  });
});
