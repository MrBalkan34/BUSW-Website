import type { ItemId, QuoteId } from "../pricing/catalogue";
import type { RegionId } from "../pricing/shared";
import type { TranslateFn } from "./translate";

/**
 * Visible names for things that have stable ids in the data. The data keeps its English wording for the brief
 * BUSW receives; the interface shows these translated names.
 */
export const itemLabel = (t: TranslateFn, id: ItemId): string => t(`catalogue.${id}.label`);
export const itemUnit = (t: TranslateFn, id: ItemId): string => t(`catalogue.${id}.unit`);
export const itemScope = (t: TranslateFn, id: ItemId): string => t(`catalogue.${id}.scope`);
export const quoteLabel = (t: TranslateFn, id: QuoteId): string => t(`quote.${id}.label`);
/** The costs an estimate never includes, in display order (`estimate.exclusion.<name>` in the translation files). */
export const EXCLUSION_KEYS = ["apple", "windows", "stores", "hosting", "reporting", "api", "assets"] as const;
export const regionLabel =(t: TranslateFn, id: RegionId): string => t(`region.${id}.label`);
