import type { TranslateFn } from "../i18n/translate";
import type { Path } from "../model/reducer";
import type { Asset, SelectionId } from "../model/types";

export interface EditApi {
  selected: SelectionId;
  select(id: SelectionId): void;
  /** target: a section id, "header", "footer", "site" or "theme". */
  set(target: string, path: Path, value: unknown): void;
  undo(): void;
  redo(): void;
}

export interface RenderCtx {
  mode: "edit" | "export";
  assets: Record<string, Asset>;
  /** URL an <img> should use for an asset (a data: URL while editing, assets/… on export). */
  src(assetId: string): string | null;
  /** File name of the page being rendered, e.g. "about.html". */
  pageFile?: string;
  edit?: EditApi;
  /** Wording for editing-only hints (placeholders). The finished site never uses it. Defaults to English. */
  t?: TranslateFn;
}
