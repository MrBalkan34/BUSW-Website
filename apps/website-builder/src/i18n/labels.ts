import type { QuoteId, SectionType, FontId, PaletteId } from "../model/types";
import type { ItemId } from "../pricing/catalogue";
import type { RegionId } from "../pricing/regions";
import type { TranslateFn } from "./translate";

/**
 * Visible names for things that have stable ids in the data (price list items, regions, palettes and so on).
 * The data keeps its English wording for submissions to BUSW; the interface shows these translated names.
 */
export const itemLabel = (t: TranslateFn, id: ItemId): string => t(`catalogue.${id}.label`);
export const itemUnit = (t: TranslateFn, id: ItemId): string => t(`catalogue.${id}.unit`);
export const itemScope = (t: TranslateFn, id: ItemId): string => t(`catalogue.${id}.scope`);
export const quoteLabel = (t: TranslateFn, id: QuoteId): string => t(`quote.${id}.label`);
export const quoteHint = (t: TranslateFn, id: QuoteId): string => t(`quote.${id}.hint`);
export const regionLabel = (t: TranslateFn, id: RegionId): string => t(`region.${id}.label`);
export const paletteLabel = (t: TranslateFn, id: PaletteId): string => t(`palette.${id}`);
export const fontLabel = (t: TranslateFn, id: FontId): string => t(`font.${id}`);
export const sectionLabel = (t: TranslateFn, type: SectionType): string => t(`section.${type}.label`);
export const sectionDescription = (t: TranslateFn, type: SectionType): string => t(`section.${type}.description`);

export type TemplateId = "studio" | "local-business" | "personal";
export const templateName = (t: TranslateFn, id: TemplateId): string => t(`template.${id}.name`);
export const templateDescription = (t: TranslateFn, id: TemplateId): string => t(`template.${id}.description`);

const BUILT_IN: readonly string[] = ["studio", "local-business", "personal"];

/** The name of whatever the project started from: a built-in template, a blank page, or a custom design. */
export function startingPointLabel(t: TranslateFn, id: string | null): string {
  if (id === null) return t("template.notChosen");
  if (BUILT_IN.includes(id)) return templateName(t, id as TemplateId);
  return t(id === "blank" ? "template.blank" : "template.custom");
}

/** The work an estimate never includes, in display order (`estimate.exclusion.<name>` in the translation files). */
export const EXCLUSION_KEYS = ["domain", "email", "plugins", "stock", "translation", "thirdParty"] as const;
