import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { I18nProvider } from "../src/i18n/I18nProvider";
import { LOCALE_STORAGE_KEY } from "../src/i18n/storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

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

const buttonByText = (text: string): HTMLButtonElement => {
  const found = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text);
  if (!found) throw new Error(`No button "${text}"`);
  return found;
};

async function click(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.click();
  });
}

async function setValue(el: HTMLInputElement | HTMLSelectElement, value: string): Promise<void> {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

describe("switching the interface language in the builder", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    window.scrollTo = vi.fn();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-US"]);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts in English with a visible English / Türkçe selector", async () => {
    await mount();
    expect(document.documentElement.lang).toBe("en");
    expect($("h1").textContent).toBe("Start your website");
    const group = $("[role=group][aria-label='Interface language']");
    const buttons = [...group.querySelectorAll("button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["English", "Türkçe"]);
    expect(buttons.map((b) => b.getAttribute("lang"))).toEqual(["en", "tr"]);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
  });

  it("changes the wording and the document language, and remembers the choice", async () => {
    await mount();
    await click(buttonByText("Türkçe"));
    expect(document.documentElement.lang).toBe("tr");
    expect(document.title).toBe("BUSW Website Builder (erken önizleme)");
    expect($("h1").textContent).toBe("Web sitenizi başlatın");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("tr");
    expect(buttonByText("Türkçe").getAttribute("aria-pressed")).toBe("true");
  });

  it("opens in Turkish for a returning visitor and for a ?lang=tr link", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "tr");
    await mount();
    expect($("h1").textContent).toBe("Web sitenizi başlatın");
    expect(document.documentElement.lang).toBe("tr");
  });

  it("keeps country, pricing region, currency and typed details when the language changes", async () => {
    await mount();

    await setValue($<HTMLSelectElement>("select[aria-describedby]"), "TR");
    const estimateBefore = $(".estimate-button strong").textContent;
    expect(estimateBefore).toContain("TRY");

    await click([...host.querySelectorAll<HTMLButtonElement>(".stepper button")][4] as HTMLButtonElement);
    await setValue($<HTMLInputElement>("input[autocomplete=organization]"), "Örnek Kafe");
    await setValue($<HTMLInputElement>("input[autocomplete=email]"), "ayse@");

    await click(buttonByText("Türkçe"));

    // Same step, same typed values, same currency.
    expect($("h1").textContent).toBe("Bilgileriniz");
    expect($<HTMLInputElement>("input[autocomplete=organization]").value).toBe("Örnek Kafe");
    expect($<HTMLInputElement>("input[autocomplete=email]").value).toBe("ayse@");
    expect($(".estimate-button strong").textContent).toBe(estimateBefore);

    // Going back to the country step shows the same country, now named in Turkish.
    await click([...host.querySelectorAll<HTMLButtonElement>(".stepper button")][0] as HTMLButtonElement);
    const select = $<HTMLSelectElement>("select[aria-describedby]");
    expect(select.value).toBe("TR");
    expect(select.selectedOptions[0]?.textContent).toBe("Türkiye");
    expect($(".region-note").textContent).toContain("TRY");

    // And switching back changes nothing but the words.
    await click(buttonByText("English"));
    expect(select.value).toBe("TR");
    expect($(".estimate-button strong").textContent).toBe(estimateBefore);
    expect(document.documentElement.lang).toBe("en");
  });

  it("labels the selector and the stepper in the chosen language for assistive technology", async () => {
    await mount();
    await click(buttonByText("Türkçe"));
    expect($("[role=group][aria-label='Arayüz dili']")).toBeTruthy();
    expect($("nav.stepper").getAttribute("aria-label")).toBe("Adımlar");
    expect($(".skip-link").textContent).toBe("İçeriğe geç");
  });

  it("is operable from the keyboard: buttons are focusable and expose their state", async () => {
    await mount();
    const turkish = buttonByText("Türkçe");
    expect(turkish.tabIndex).toBe(0);
    turkish.focus();
    expect(document.activeElement).toBe(turkish);
    await click(turkish);
    expect(turkish.getAttribute("aria-pressed")).toBe("true");
    expect(buttonByText("English").getAttribute("aria-pressed")).toBe("false");
  });
});
